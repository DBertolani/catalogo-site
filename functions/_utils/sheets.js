// --- CONFIGURAÇÃO: Agora só dependemos do Binding do KV ---
// Nota: O Cloudflare Pages injeta o binding KV no objeto global 'CATALOGO_KV'

const MAX_DESC_STORAGE = 100; 

// --- CORE: CARREGAMENTO COMPACTO E ESTÁVEL (VIA KV) ---

export async function getCompactData(env) {
    // 1. Tenta acessar o KV Namespace
    if (typeof env.CATALOGO_KV === 'undefined') {
        console.error("ERRO CRÍTICO: Binding CATALOGO_KV ausente no Pages Project.");
        return [];
    }

    // 2. LÊ O NÚMERO DE CHUNKS
    const chunkCountStr = await env.CATALOGO_KV.get('produtos_chunk_count');
    const chunkCount = parseInt(chunkCountStr) || 1; 
    
    let allCompactData = [];

    // 3. Itera sobre todos os chunks e combina
    for (let i = 0; i < chunkCount; i++) {
        const chunkKey = `produtos_compactados_chunk_${i}`;
        const compactJSON = await env.CATALOGO_KV.get(chunkKey);
        
        if (compactJSON) {
            try {
                const chunkData = JSON.parse(compactJSON);
                allCompactData = allCompactData.concat(chunkData);
            } catch (e) {
                console.error(`Erro ao fazer parse do JSON do Chunk ${i}:`, e);
            }
        }
    }
    
    if (allCompactData.length === 0) {
        console.warn("Dados do KV não encontrados ou vazios após tentar ler todos os chunks.");
    }

    return allCompactData;
}

// --- HELPERS ---

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

// --- LÓGICA DE ALEATORIEDADE ---

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


// --- EXPORTS (API) ---

export async function fetchProductsPage(env, { offset = 0, limit = 50, q = "", store = "", cat = "", brand = "" }) {
    try {
        const allCompact = await getCompactData(env);

        // Prepara os termos de busca (limpa espaços e minúsculas)
        const qStr = (q || "").toLowerCase().trim();
        const sStr = (store || "").toLowerCase().trim();
        const cStr = (cat || "").toLowerCase().trim();
        const bStr = (brand || "").toLowerCase().trim();

        let filtered = allCompact;

        // SE houver algum filtro, aplicamos a lógica
        if (qStr || sStr || cStr || bStr) {
            filtered = allCompact.filter(row => {
                
                // 1. Filtros Rápidos (Loja, Categoria, Marca)
                // CORREÇÃO DO FILTRO: Adicionado .trim() no row[...] para evitar erro de espaço vazio
                if (sStr && (row[5] || "").toLowerCase().trim() !== sStr) return false;
                if (cStr && (row[6] || "").toLowerCase().trim() !== cStr) return false;
                if (bStr && (row[7] || "").toLowerCase().trim() !== bStr) return false;
                
                // 2. Filtro de Busca (Otimizado para Performance)
                if (qStr) {
                    // A. Verifica ID primeiro (Otimização)
                    const idVal = String(row[0] || "").toLowerCase().trim();
                    if (idVal.includes(qStr)) return true;

                    // B. Se não for ID, verifica Nome
                    if ((row[1] || "").toLowerCase().includes(qStr)) return true;

                    // C. Verifica Marca
                    if ((row[7] || "").toLowerCase().includes(qStr)) return true;

                    // D. Verifica Loja
                    if ((row[5] || "").toLowerCase().includes(qStr)) return true;

                    // Se não encontrou em nenhum lugar, descarta.
                    return false;
                }
                
                return true;
            });
        }

        let selection = [];
        
        // Modo Aleatório (Home) - Só se não tiver nenhum filtro
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
        // Retorna vazio em vez de erro para não quebrar o site
        return { totalCount: 0, products: [], error: "Erro interno no servidor." };
    }
}

export async function fetchProductById(env, targetId) {
    try {
        const allCompact = await getCompactData(env);
        const idKey = String(targetId).trim();
        // Busca exata pelo ID (coluna 0)
        const found = allCompact.find(row => String(row[0]).trim() === idKey);
        return found ? hydrateProduct(found) : null;
    } catch (e) { return null; }
}

export async function fetchFilterOptions(env) {
    try {
        const allCompact = await getCompactData(env);
        const stores = new Set();
        const categories = new Set();
        const brands = new Set();
        
        for(const row of allCompact) {
            const s = row[5];
            const c = row[6];
            const b = row[7];

            if (isValidFilter(s)) stores.add(s.trim());
            
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
