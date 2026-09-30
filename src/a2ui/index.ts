import { TRAVEL_CATALOG_ID } from "./catalog"
import { BASIC_RENDERERS } from "./react/basic-components"
import { registerCatalogRenderers } from "./react/registry"
import { TRAVEL_RENDERERS } from "./react/travel-components"
import { BASIC_CATALOG_ID } from "./types"

registerCatalogRenderers(BASIC_CATALOG_ID, BASIC_RENDERERS)
registerCatalogRenderers(
  "https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json",
  BASIC_RENDERERS
)
registerCatalogRenderers(TRAVEL_CATALOG_ID, { ...BASIC_RENDERERS, ...TRAVEL_RENDERERS })

export * from "./types"
export * from "./catalog"
export * from "./processor"
export * from "./pointer"
export * from "./evaluate"
export * from "./use-a2ui"
export { A2UISurface } from "./react/surface"
export { ICONS } from "./react/basic-components"
