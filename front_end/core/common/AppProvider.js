"use strict";
import * as Root from "../root/root.js";
const registeredAppProvider = [];
export function registerAppProvider(registration) {
  registeredAppProvider.push(registration);
}
export function getRegisteredAppProviders() {
  return registeredAppProvider.filter(
    (provider) => Root.Runtime.Runtime.isDescriptorEnabled({ experiment: void 0, condition: provider.condition })
  ).sort((firstProvider, secondProvider) => {
    const order1 = firstProvider.order || 0;
    const order2 = secondProvider.order || 0;
    return order1 - order2;
  });
}
//# sourceMappingURL=AppProvider.js.map
