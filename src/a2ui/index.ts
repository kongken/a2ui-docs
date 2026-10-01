import { TRAVEL_CATALOG_ID, TRAVEL_CATALOG_V1_ID } from "./catalog"
import { BASIC_RENDERERS } from "./react/basic-components"
import { registerCatalogRenderers } from "./react/registry"
import { TRAVEL_RENDERERS } from "./react/travel-components"
import { BASIC_CATALOG_ID, BASIC_CATALOG_V1_ID } from "./types"

registerCatalogRenderers(BASIC_CATALOG_ID, BASIC_RENDERERS)
registerCatalogRenderers(
  "https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json",
  BASIC_RENDERERS
)
registerCatalogRenderers(TRAVEL_CATALOG_ID, { ...BASIC_RENDERERS, ...TRAVEL_RENDERERS })
registerCatalogRenderers(BASIC_CATALOG_V1_ID, BASIC_RENDERERS)
// v1.0 的 travel catalog 只包含领域组件，与 basic 混用
registerCatalogRenderers(TRAVEL_CATALOG_V1_ID, TRAVEL_RENDERERS)

export * from "./types"
export * from "./catalog"
export * from "./processor"
export * from "./pointer"
export * from "./evaluate"
export * from "./use-a2ui"
export * from "./convert"
export { A2UISurface } from "./react/surface"
export { ICONS } from "./react/basic-components"
