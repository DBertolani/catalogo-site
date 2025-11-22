// --- CONFIGURAÇÃO: Agora só dependemos do Binding do KV ---
// Nota: O Cloudflare Pages injeta o binding KV no objeto global 'CATALOGO_KV'
// (Configurado em Settings -> Functions -> KV Namespace Bindings)

const MAX_DESC_STORAGE = 100; // Mantém descrições curtas para a função hydrateProduct

// --- CORE: CARREGAMENTO COMPACTO E ESTÁVEL (AGORA VIA KV) ---

/**
 * Lê os dados compactados do KV e retorna o array de produtos.
 * @param {object} env O objeto de ambiente injetado pelo Cloudflare.
 * @returns {Array<Array<any>>} O array completo de produtos.
 */
export async function getCompactData(env) {
    // 1. Tenta acessar o KV Namespace
    if (typeof env.CATALOGO_KV === 'undefined') {
        console.error("ERRO CRÍTICO: Binding CATALOGO_KV ausente no Pages Project.");
        return [];
    }

    // 2. A chave 'produtos_compactados' contém o array JSON completo
    const compactJSON = await env.CATALOGO_KV.get('produtos_compactados');
    
    if (!compactJSON) {
        console.error("Dados do KV não encontrados. O Worker Agendado rodou e salvou?");
        return [];
    }
    
    // 3. O parse é rápido
    try {
        return JSON.parse(compactJSON);
    } catch (e) {
        console.error("Erro ao fazer parse do JSON do KV:", e);
        return [];
    }
}


// --- HELPERS (Mantidos do seu código original) ---

// Transforma o array compacto de volta em objeto
function hydrateProduct(arr) {
    const store = arr[5] || "Parceiro";
    return {
        id: arr[0],
        nome: arr[1],
        preco: arr[2],
        imagem: arr[3],
        linkAfiliado: arr[4],
        lojaParceira: store,
        categoria: arr[6],
        marca: arr[7],
        descricao: arr[8],
        facebookLink: arr[9],
        textoBotao: `Compre na Loja: ${store}`
    };
}

function isValidFilter(str) {
    if (!str) return false;
    const s = str.trim();
    if (s.length < 2 || s.length > 50) return false;
    if (s.includes("http") || s.includes(",,") || s.split(" ").length > 8) return false;
    return true;
}

// --- LÓGICA DE ALEATORIEDADE E AMOSTRAGEM POR LOJA (Mantida) ---

function getBalancedRandomMix(compactList, limit) {
    const storesMap = {};
    const SAMPLE_PER_STORE = 15; 

    for (let i = 0; i < compactList.length; i++) {
        const p = compactList[i];
        const store = p[5] || "Outros";

        if (!storesMap[store]) storesMap[store] = [];

        if (storesMap[store].length < SAMPLE_PER_STORE) {
            storesMap[store].push(p);
        } else {
            if (Math.random() < 0.3) {
                const rand = Math.floor(Math.random() * SAMPLE_PER_STORE);
                storesMap[store][rand] = p;
            }
        }
    }

    const result = [];
    const storeNames = Object.keys(storesMap).sort(() => Math.random() - 0.5); 
    
    let added = true;
    while(result.length < limit && added) {
        added = false;
        for(const name of storeNames) {
            if(result.length >= limit) break;
            if (storesMap[name] && storesMap[name].length > 0) {
                result.push(storesMap[name].pop());
                added = true;
            }
        }
    }
    
    return result; 
}


// --- EXPORTS (API) - ATUALIZADOS PARA USAR O KV E ACEITAR 'env' ---

// CRÍTICO: Seus exports agora devem aceitar 'env' como primeiro argumento
// (Assumindo que seu roteador Pages Functions o passa)

export async function fetchProductsPage(env, { offset = 0, limit = 50, q = "", store = "", cat = "", brand = "" }) {
    try {
        const allCompact = await getCompactData(env); // <-- USA KV

        const qStr = (q || "").toLowerCase();
        const sStr = (store || "").toLowerCase();
        const cStr = (cat || "").toLowerCase();
        const bStr = (brand || "").toLowerCase();

        let filtered = allCompact;

        // Filtragem Rápida
        if (qStr || sStr || cStr || bStr) {
            filtered = allCompact.filter(row => {
                // ... (Sua lógica de filtragem existente)
                if (sStr && (row[5] || "").toLowerCase() !== sStr) return false;
                if (cStr && (row[6] || "").toLowerCase() !== cStr) return false;
                if (bStr && (row[7] || "").toLowerCase() !== bStr) return false;
                if (qStr) {
                    const text = (row[1] + " " + row[7] + " " + row[5]).toLowerCase();
                    if (!text.includes(qStr)) return false;
                }
                return true;
            });
        }

        let selection = [];
        
        // Modo Aleatório (Home)
        if (offset == 0 && !q && !store && !cat && !brand) {
            const randomCompact = getBalancedRandomMix(filtered, limit);
            selection = randomCompact.map(hydrateProduct);
        } 
        // Modo Paginação / Busca
        else {
            const sliced = filtered.slice(offset, offset + limit);
            selection = sliced.map(hydrateProduct);
        }

        return {
            totalCount: filtered.length,
            products: selection,
            headers: []
        };

    } catch (e) {
        console.error("Erro em fetchProductsPage:", e);
        return new Response(JSON.stringify({ totalCount: 0, products: [], error: "Erro interno no servidor." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function fetchProductById(env, targetId) {
    try {
        const allCompact = await getCompactData(env); // <-- USA KV
        const idKey = String(targetId).trim();
        const found = allCompact.find(row => String(row[0]).trim() === idKey);
        return found ? hydrateProduct(found) : null;
    } catch (e) { return null; }
}

export async function fetchFilterOptions(env) {
    try {
        const allCompact = await getCompactData(env); // <-- USA KV
        const stores = new Set();
        const categories = new Set();
        const brands = new Set();
        
        for(const row of allCompact) {
            const s = row[5];
            const c = row[6];
            const b = row[7];

            if (isValidFilter(s)) stores.add(s.trim());
            // A categoria é um campo que pode ter múltiplas, sua lógica precisa de um pequeno ajuste aqui
            const categoryList = String(c || '').split(',').map(catItem => catItem.trim()).filter(Boolean);
            for(const catItem of categoryList) {
                if (isValidFilter(catItem)) categories.add(catItem);
            }
            
            if (isValidFilter(b)) brands.add(b.trim());
        }

        return {
            stores: Array.from(stores).sort(),
            categories: Array.from(categories).sort(),
            brands: Array.from(brands).sort(),
        };
    } catch (e) {
        console.error("Erro em fetchFilterOptions:", e);
        return { stores: [], categories: [], brands: [], error: "Erro ao gerar filtros." };
    }
}
