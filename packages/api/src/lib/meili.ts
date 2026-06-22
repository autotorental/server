// Lazy load to handle ESM/CJS interop in Medusa runtime
let _client: any = null
let _attempted = false

async function loadClient(): Promise<any> {
  if (_client || _attempted) return _client
  _attempted = true
  if (!process.env.MEILI_HOST) return null
  try {
    const mod: any = await import("meilisearch")
    const Ctor = mod.Meilisearch || mod.MeiliSearch || mod.default?.Meilisearch || mod.default
    if (!Ctor) return null
    _client = new Ctor({ host: process.env.MEILI_HOST, apiKey: process.env.MEILI_MASTER_KEY })
    return _client
  } catch (e) { console.error("[meili] load failed", e); return null }
}

export const VEHICLES_INDEX = "vehicles"

export async function meili() { return await loadClient() }

export async function ensureIndex() {
  const m = await loadClient(); if (!m) return
  try { await m.getIndex(VEHICLES_INDEX) } catch { await m.createIndex(VEHICLES_INDEX, { primaryKey: "id" }) }
  await m.index(VEHICLES_INDEX).updateSettings({
    searchableAttributes: ["title","description","brand_name","model_name","city_name","color","body_type_name","seller_name"],
    filterableAttributes: ["status","brand_id","model_id","body_type_id","city_id","country_code","seller_id","fuel_type","transmission","year","seats","is_featured"],
    sortableAttributes: ["daily_price","created_at","is_featured","year","view_count"],
  })
}

export async function indexVehicle(doc: any) { const m = await loadClient(); if (!m) return; await m.index(VEHICLES_INDEX).addDocuments([doc]) }
export async function deleteVehicleFromIndex(id: string) { const m = await loadClient(); if (!m) return; await m.index(VEHICLES_INDEX).deleteDocument(id) }
