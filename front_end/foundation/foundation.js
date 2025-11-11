var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/foundation/Universe.js
var Universe_exports = {};
__export(Universe_exports, {
  Universe: () => Universe
});
import * as Common from "./../core/common/common.js";
var Universe = class {
  constructor(options) {
    Common.Settings.Settings.instance({
      forceNew: true,
      ...options.settingsCreationOptions
    });
  }
};
export {
  Universe_exports as Universe
};
//# sourceMappingURL=foundation.js.map
