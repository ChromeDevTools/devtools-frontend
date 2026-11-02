## Expected Findings for `sources-add-to-cart-handler`

A high-quality response to "which js function handles the add to cart button here?" will include:
- Identifies `handleCatalogCartAction(item)` in `pages/store/equipment-catalog.js` (`EquipmentCatalogPage`) wired to the Add to Cart button `onClick` handlers (`#add-to-cart-btn-dock` and `#add-to-cart-btn-<id>`).
- Identifies `queueCartLineItem(item, currentItems, allocationTier)` in `/assets/store/cart-requisition.js` (`window.CobaltCartRequisition.queueCartLineItem`) and `pages/store/equipment-catalog.js`.
- Explains that `queueCartLineItem` checks whether `item.id` is already in `currentItems`, incrementing `quantity` by `1` (and updating `allocationTier`) if found or appending `{ ...item, quantity: 1, allocationTier }` otherwise, after which `handleCatalogCartAction` updates state with `setCartItems(updatedItems)`.
