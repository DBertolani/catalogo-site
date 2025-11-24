// --- CONFIGURAÇÃO: Agora só dependemos do Binding do KV ---
const MAX_DESC_STORAGE = 100; 

// --- CORE: CARREGAMENTO VIA KV ---
export async function getCompactData(env) {
    if (typeof env.CATALOGO_KV === 'undefined') {
        console.error("ERRO CRÍTICO: Binding CATALOGO_KV ausente.");
        return [];
    }

    const chunkCountStr = await env.CATALOGO_KV.get('produtos_chunk_count');
    const chunkCount = parseInt(chunkCountStr) || 1; 
    let allCompactData = [];

    for (let i = 0; i < chunkCount; i++) {
        const chunkKey = `produtos_compactados_chunk_${i}`;
        const compactJSON = await env.CATALOGO_KV.get(chunkKey);
        if (compactJSON) {
            try {
                const chunkData = JSON.parse(compactJSON);
                allCompactData = allCompactData.concat(chunkData);
            } catch (e) {}
        }
    }
    return allCompactData;
}

// --- HELPERS ---
function hydrateProduct(arr) {
    const store = arr[5] || "Parceiro";
    // Tenta limpar o preço para garantir que seja um número ou string formatável
    let rawPrice = arr[2];
    
    return {
        id: arr[0],
        nome: arr[1],
        preco: rawPrice, // Envia cru, o front formata
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
        const qStr = (q || "").toLowerCase().trim();
        const sStr = (store || "").toLowerCase().trim();
        const cStr = (cat || "").toLowerCase().trim();
        const bStr = (brand || "").toLowerCase().trim();

        let filtered = allCompact;

        if (qStr || sStr || cStr || bStr) {
            filtered = allCompact.filter(row => {
                if (sStr && (row[5] || "").toLowerCase().trim() !== sStr) return false;
                if (cStr && (row[6] || "").toLowerCase().trim() !== cStr) return false;
                if (bStr && (row[7] || "").toLowerCase().trim() !== bStr) return false;
                
                if (qStr) {
                    const idVal = String(row[0] || "").toLowerCase().trim();
                    if (idVal.includes(qStr)) return true;
                    if ((row[1] || "").toLowerCase().includes(qStr)) return true;
                    if ((row[7] || "").toLowerCase().includes(qStr)) return true;
                    if ((row[5] || "").toLowerCase().includes(qStr)) return true;
                    return false;
                }
                return true;
            });
        }

        let selection = [];
        if (offset == 0 && !q && !store && !cat && !brand) {
            const randomCompact = getBalancedRandomMix(filtered, limit);
            selection = randomCompact.map(hydrateProduct);
        } else {
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
        return { totalCount: 0, products: [], error: "Erro interno." };
    }
}

export async function fetchProductById(env, targetId) {
    try {
        const allCompact = await getCompactData(env);
        const idKey = String(targetId).trim();
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
        return { stores: [], categories: [], brands: [], error: "Erro ao gerar filtros." };
    }
}
