var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/timeline/extensions/ExtensionUI.js
var ExtensionUI_exports = {};
__export(ExtensionUI_exports, {
  extensionEntryColor: () => extensionEntryColor
});
import * as ThemeSupport from "./../../../ui/legacy/theme_support/theme_support.js";
function extensionEntryColor(event) {
  const color = event.devtoolsObj.color;
  let themeColor = "--ref-palette-blue70";
  switch (color) {
    case "primary":
      themeColor = "--ref-palette-blue70";
      break;
    case "primary-light":
      themeColor = "--ref-palette-blue80";
      break;
    case "primary-dark":
      themeColor = "--ref-palette-blue60";
      break;
    case "secondary":
      themeColor = "--ref-palette-purple80";
      break;
    case "secondary-light":
      themeColor = "--ref-palette-purple90";
      break;
    case "secondary-dark":
      themeColor = "--ref-palette-purple70";
      break;
    case "tertiary":
      themeColor = "--ref-palette-green70";
      break;
    case "tertiary-light":
      themeColor = "--ref-palette-green80";
      break;
    case "tertiary-dark":
      themeColor = "--ref-palette-green60";
      break;
    case "warning":
      themeColor = "--ref-palette-yellow70";
      break;
    case "error":
      themeColor = "--ref-palette-error60";
      break;
  }
  return ThemeSupport.ThemeSupport.instance().getComputedValue(themeColor);
}
export {
  ExtensionUI_exports as ExtensionUI
};
//# sourceMappingURL=extensions.js.map
