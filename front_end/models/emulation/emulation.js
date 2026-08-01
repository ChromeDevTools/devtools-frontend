var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/emulation/DeviceModeModel.js
var DeviceModeModel_exports = {};
__export(DeviceModeModel_exports, {
  DeviceModeModel: () => DeviceModeModel,
  Insets: () => Insets,
  MaxDeviceNameLength: () => MaxDeviceNameLength,
  MaxDeviceScaleFactor: () => MaxDeviceScaleFactor,
  MaxDeviceSize: () => MaxDeviceSize,
  MinDeviceScaleFactor: () => MinDeviceScaleFactor,
  MinDeviceSize: () => MinDeviceSize,
  Rect: () => Rect,
  Type: () => Type2,
  defaultMobileScaleFactor: () => defaultMobileScaleFactor
});
import * as Common2 from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as Root2 from "./../../core/root/root.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as TextUtils from "./../../core/text_utils/text_utils.js";
import * as Geometry from "./../geometry/geometry.js";
import * as Workspace from "./../workspace/workspace.js";

// gen/front_end/models/emulation/EmulatedDevices.js
var EmulatedDevices_exports = {};
__export(EmulatedDevices_exports, {
  CATEGORY_ORDER: () => CATEGORY_ORDER,
  EmulatedDevice: () => EmulatedDevice,
  EmulatedDevicesList: () => EmulatedDevicesList,
  Horizontal: () => Horizontal,
  HorizontalSpanned: () => HorizontalSpanned,
  Type: () => Type,
  Vertical: () => Vertical,
  VerticalSpanned: () => VerticalSpanned,
  computeRelativeImageURL: () => computeRelativeImageURL,
  deviceCategory: () => deviceCategory,
  getCategoryTitle: () => getCategoryTitle
});
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
var UIStrings = {
  /**
   * @description Title of the Laptop with touch device.
   */
  laptopWithTouch: "Laptop with touch",
  /**
   * @description Title of the Laptop with HiDPI screen device.
   */
  laptopWithHiDPIScreen: "Laptop with HiDPI screen",
  /**
   * @description Title of the Laptop with MDPI screen device.
   */
  laptopWithMDPIScreen: "Laptop with MDPI screen",
  /**
   * @description Label for mobile category in emulation devices.
   */
  mobileGroup: "Mobile",
  /**
   * @description Label for foldables category in emulation devices.
   */
  foldablesGroup: "Foldables",
  /**
   * @description Label for tablets and desktops category in emulation devices.
   */
  tabletsAndDesktopsGroup: "Tablets & Desktops",
  /**
   * @description Label for smart displays category in emulation devices.
   */
  smartDisplaysGroup: "Smart Displays"
};
var str_ = i18n.i18n.registerUIStrings("models/emulation/EmulatedDevices.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function computeRelativeImageURL(cssURLValue) {
  return cssURLValue.replace(/@url\(([^\)]*?)\)/g, (_match, url) => {
    return new URL(`../../emulated_devices/${url}`, import.meta.url).toString();
  });
}
var EmulatedDevice = class _EmulatedDevice {
  title;
  type;
  order;
  vertical;
  horizontal;
  deviceScaleFactor;
  capabilities;
  userAgent;
  userAgentMetadata;
  modes;
  isDualScreen;
  isFoldableScreen;
  verticalSpanned;
  horizontalSpanned;
  #show;
  #showByDefault;
  constructor() {
    this.title = "";
    this.type = Type.Unknown;
    this.vertical = { width: 0, height: 0, outlineInsets: null, outlineImage: null, hinge: null };
    this.horizontal = { width: 0, height: 0, outlineInsets: null, outlineImage: null, hinge: null };
    this.deviceScaleFactor = 1;
    this.capabilities = [
      "touch",
      "mobile"
      /* Capability.MOBILE */
    ];
    this.userAgent = "";
    this.userAgentMetadata = null;
    this.modes = [];
    this.isDualScreen = false;
    this.isFoldableScreen = false;
    this.verticalSpanned = { width: 0, height: 0, outlineInsets: null, outlineImage: null, hinge: null };
    this.horizontalSpanned = { width: 0, height: 0, outlineInsets: null, outlineImage: null, hinge: null };
    this.#show = Show.Default;
    this.#showByDefault = true;
  }
  static fromJSONV1(json) {
    try {
      let parseValue = function(object, key, type2, defaultValue) {
        if (typeof object !== "object" || object === null || !object.hasOwnProperty(key)) {
          if (typeof defaultValue !== "undefined") {
            return defaultValue;
          }
          throw new Error("Emulated device is missing required property '" + key + "'");
        }
        const value = object[key];
        if (typeof value !== type2 || value === null) {
          throw new Error("Emulated device property '" + key + "' has wrong type '" + typeof value + "'");
        }
        return value;
      }, parseIntValue = function(object, key) {
        const value = parseValue(object, key, "number");
        if (value !== Math.abs(value)) {
          throw new Error("Emulated device value '" + key + "' must be integer");
        }
        return value;
      }, parseInsets = function(json2) {
        return new Insets(parseIntValue(json2, "left"), parseIntValue(json2, "top"), parseIntValue(json2, "right"), parseIntValue(json2, "bottom"));
      }, parseCutoutShape = function(json2) {
        const shape = parseValue(json2, "shape", "string");
        if (shape !== "pill" && shape !== "notch" && shape !== "circle" && shape !== "rectangle") {
          throw new Error("Emulated device mode has unsupported cutout shape: " + shape);
        }
        return shape;
      }, parseRGBA = function(json2) {
        const result2 = {};
        result2.r = parseIntValue(json2, "r");
        if (result2.r < 0 || result2.r > 255) {
          throw new Error("color has wrong r value: " + result2.r);
        }
        result2.g = parseIntValue(json2, "g");
        if (result2.g < 0 || result2.g > 255) {
          throw new Error("color has wrong g value: " + result2.g);
        }
        result2.b = parseIntValue(json2, "b");
        if (result2.b < 0 || result2.b > 255) {
          throw new Error("color has wrong b value: " + result2.b);
        }
        result2.a = parseValue(json2, "a", "number");
        if (result2.a < 0 || result2.a > 1) {
          throw new Error("color has wrong a value: " + result2.a);
        }
        return result2;
      }, parseHinge = function(json2) {
        const result2 = {};
        result2.width = parseIntValue(json2, "width");
        if (result2.width < 0 || result2.width > MaxDeviceSize) {
          throw new Error("Emulated device has wrong hinge width: " + result2.width);
        }
        result2.height = parseIntValue(json2, "height");
        if (result2.height < 0 || result2.height > MaxDeviceSize) {
          throw new Error("Emulated device has wrong hinge height: " + result2.height);
        }
        result2.x = parseIntValue(json2, "x");
        if (result2.x < 0 || result2.x > MaxDeviceSize) {
          throw new Error("Emulated device has wrong x offset: " + result2.height);
        }
        result2.y = parseIntValue(json2, "y");
        if (result2.x < 0 || result2.x > MaxDeviceSize) {
          throw new Error("Emulated device has wrong y offset: " + result2.height);
        }
        if (json2["contentColor"]) {
          result2.contentColor = parseRGBA(json2["contentColor"]);
        }
        if (json2["outlineColor"]) {
          result2.outlineColor = parseRGBA(json2["outlineColor"]);
        }
        return result2;
      }, parseOrientation = function(json2) {
        const result2 = {};
        result2.width = parseIntValue(json2, "width");
        if (result2.width < 0 || result2.width > MaxDeviceSize || result2.width < MinDeviceSize) {
          throw new Error("Emulated device has wrong width: " + result2.width);
        }
        result2.height = parseIntValue(json2, "height");
        if (result2.height < 0 || result2.height > MaxDeviceSize || result2.height < MinDeviceSize) {
          throw new Error("Emulated device has wrong height: " + result2.height);
        }
        const outlineInsets = parseValue(json2["outline"], "insets", "object", null);
        if (outlineInsets) {
          result2.outlineInsets = parseInsets(outlineInsets);
          if (result2.outlineInsets.left < 0 || result2.outlineInsets.top < 0) {
            throw new Error("Emulated device has wrong outline insets");
          }
          result2.outlineImage = parseValue(json2["outline"], "image", "string");
        }
        if (json2["hinge"]) {
          result2.hinge = parseHinge(parseValue(json2, "hinge", "object", void 0));
        }
        return result2;
      };
      const result = new _EmulatedDevice();
      result.title = parseValue(json, "title", "string");
      const type = parseValue(json, "type", "string");
      if (!Object.values(Type).includes(type)) {
        throw new Error("Emulated device has wrong type: " + type);
      }
      result.type = type;
      result.order = parseValue(json, "order", "number", 0);
      const rawUserAgent = parseValue(json, "user-agent", "string");
      result.userAgent = SDK.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(rawUserAgent);
      const userAgentMetadata = parseValue(json, "user-agent-metadata", "object", null);
      result.userAgentMetadata = result.userAgent ? userAgentMetadata : null;
      const capabilities = parseValue(json, "capabilities", "object", []);
      if (!Array.isArray(capabilities)) {
        throw new Error("Emulated device capabilities must be an array");
      }
      result.capabilities = [];
      for (let i = 0; i < capabilities.length; ++i) {
        if (typeof capabilities[i] !== "string") {
          throw new Error("Emulated device capability must be a string");
        }
        result.capabilities.push(capabilities[i]);
      }
      result.deviceScaleFactor = parseValue(json["screen"], "device-pixel-ratio", "number");
      if (result.deviceScaleFactor < 0 || result.deviceScaleFactor > 100) {
        throw new Error("Emulated device has wrong deviceScaleFactor: " + result.deviceScaleFactor);
      }
      result.vertical = parseOrientation(parseValue(json["screen"], "vertical", "object"));
      result.horizontal = parseOrientation(parseValue(json["screen"], "horizontal", "object"));
      result.isDualScreen = parseValue(json, "dual-screen", "boolean", false);
      result.isFoldableScreen = parseValue(json, "foldable-screen", "boolean", false);
      if (result.isDualScreen || result.isFoldableScreen) {
        result.verticalSpanned = parseOrientation(parseValue(json["screen"], "vertical-spanned", "object", null));
        result.horizontalSpanned = parseOrientation(parseValue(json["screen"], "horizontal-spanned", "object", null));
      }
      if ((result.isDualScreen || result.isFoldableScreen) && (!result.verticalSpanned || !result.horizontalSpanned)) {
        throw new Error("Emulated device '" + result.title + "'has dual screen without spanned orientations");
      }
      const modes = parseValue(json, "modes", "object", [
        { title: "default", orientation: "vertical" },
        { title: "default", orientation: "horizontal" }
      ]);
      if (!Array.isArray(modes)) {
        throw new Error("Emulated device modes must be an array");
      }
      result.modes = [];
      for (let i = 0; i < modes.length; ++i) {
        const mode = {};
        mode.title = parseValue(modes[i], "title", "string");
        mode.orientation = parseValue(modes[i], "orientation", "string");
        if (mode.orientation !== Vertical && mode.orientation !== Horizontal && mode.orientation !== VerticalSpanned && mode.orientation !== HorizontalSpanned) {
          throw new Error("Emulated device mode has wrong orientation '" + mode.orientation + "'");
        }
        const orientation = result.orientationByName(mode.orientation);
        mode.insets = parseInsets(parseValue(modes[i], "insets", "object", { left: 0, top: 0, right: 0, bottom: 0 }));
        if (mode.insets.top < 0 || mode.insets.left < 0 || mode.insets.right < 0 || mode.insets.bottom < 0 || mode.insets.top + mode.insets.bottom > orientation.height || mode.insets.left + mode.insets.right > orientation.width) {
          throw new Error("Emulated device mode '" + mode.title + "'has wrong mode insets");
        }
        mode.image = parseValue(modes[i], "image", "string", null);
        const safeAreaInsets = parseValue(modes[i], "safe-area-insets", "object", null);
        if (safeAreaInsets) {
          mode.safeAreaInsets = parseInsets(safeAreaInsets);
        }
        const cutout = parseValue(modes[i], "cutout", "object", null);
        if (cutout) {
          const shape = parseCutoutShape(cutout);
          const baseCutout = {
            x: parseIntValue(cutout, "x"),
            y: parseIntValue(cutout, "y"),
            width: parseIntValue(cutout, "width"),
            height: parseIntValue(cutout, "height")
          };
          if (shape === "pill") {
            mode.cutout = { shape, ...baseCutout, borderRadius: parseIntValue(cutout, "border-radius") };
          } else if (shape === "notch") {
            mode.cutout = {
              shape,
              ...baseCutout,
              upperRadius: parseIntValue(cutout, "upper-radius"),
              lowerRadius: parseIntValue(cutout, "lower-radius")
            };
          } else if (shape === "circle") {
            mode.cutout = {
              shape,
              ...baseCutout,
              cx: parseIntValue(cutout, "cx"),
              cy: parseIntValue(cutout, "cy"),
              radius: parseIntValue(cutout, "radius")
            };
          } else {
            mode.cutout = { shape, ...baseCutout };
          }
        }
        result.modes.push(mode);
      }
      result.#showByDefault = parseValue(json, "show-by-default", "boolean", void 0);
      const show = parseValue(json, "show", "string", Show.Default);
      if (!Object.values(Show).includes(show)) {
        throw new Error("Emulated device has wrong show mode: " + show);
      }
      result.#show = show;
      return result;
    } catch {
      return null;
    }
  }
  static deviceComparator(device1, device2) {
    const order1 = device1.order || 0;
    const order2 = device2.order || 0;
    if (order1 > order2) {
      return 1;
    }
    if (order2 > order1) {
      return -1;
    }
    return device1.title < device2.title ? -1 : device1.title > device2.title ? 1 : 0;
  }
  modesForOrientation(orientation) {
    const result = [];
    for (let index = 0; index < this.modes.length; index++) {
      if (this.modes[index].orientation === orientation) {
        result.push(this.modes[index]);
      }
    }
    return result;
  }
  getSpanPartner(mode) {
    switch (mode.orientation) {
      case Vertical:
        return this.modesForOrientation(VerticalSpanned)[0];
      case Horizontal:
        return this.modesForOrientation(HorizontalSpanned)[0];
      case VerticalSpanned:
        return this.modesForOrientation(Vertical)[0];
      default:
        return this.modesForOrientation(Horizontal)[0];
    }
  }
  getRotationPartner(mode) {
    switch (mode.orientation) {
      case HorizontalSpanned:
        return this.modesForOrientation(VerticalSpanned)[0];
      case VerticalSpanned:
        return this.modesForOrientation(HorizontalSpanned)[0];
      case Horizontal:
        return this.modesForOrientation(Vertical)[0];
      default:
        return this.modesForOrientation(Horizontal)[0];
    }
  }
  toJSON() {
    const json = {};
    json["title"] = this.title;
    json["type"] = this.type;
    json["user-agent"] = this.userAgent;
    json["capabilities"] = this.capabilities;
    json["screen"] = {
      "device-pixel-ratio": this.deviceScaleFactor,
      vertical: this.orientationToJSON(this.vertical),
      horizontal: this.orientationToJSON(this.horizontal),
      "vertical-spanned": void 0,
      "horizontal-spanned": void 0
    };
    if (this.isDualScreen || this.isFoldableScreen) {
      json["screen"]["vertical-spanned"] = this.orientationToJSON(this.verticalSpanned);
      json["screen"]["horizontal-spanned"] = this.orientationToJSON(this.horizontalSpanned);
    }
    json["modes"] = [];
    for (let i = 0; i < this.modes.length; ++i) {
      const mode = {
        title: this.modes[i].title,
        orientation: this.modes[i].orientation,
        insets: {
          left: this.modes[i].insets.left,
          top: this.modes[i].insets.top,
          right: this.modes[i].insets.right,
          bottom: this.modes[i].insets.bottom
        },
        image: this.modes[i].image || void 0
      };
      const safeAreaInsets = this.modes[i].safeAreaInsets;
      if (safeAreaInsets) {
        mode["safe-area-insets"] = {
          left: safeAreaInsets.left,
          top: safeAreaInsets.top,
          right: safeAreaInsets.right,
          bottom: safeAreaInsets.bottom
        };
      }
      const cutout = this.modes[i].cutout;
      if (cutout) {
        mode.cutout = {
          shape: cutout.shape,
          x: cutout.x,
          y: cutout.y,
          width: cutout.width,
          height: cutout.height
        };
        if (cutout.shape === "pill") {
          mode.cutout["border-radius"] = cutout.borderRadius;
        } else if (cutout.shape === "notch") {
          mode.cutout["upper-radius"] = cutout.upperRadius;
          mode.cutout["lower-radius"] = cutout.lowerRadius;
        } else if (cutout.shape === "circle") {
          mode.cutout.cx = cutout.cx;
          mode.cutout.cy = cutout.cy;
          mode.cutout.radius = cutout.radius;
        }
      }
      json["modes"].push(mode);
    }
    json["show-by-default"] = this.#showByDefault;
    json["dual-screen"] = this.isDualScreen;
    json["foldable-screen"] = this.isFoldableScreen;
    json["show"] = this.#show;
    if (this.userAgent && this.userAgentMetadata) {
      json["user-agent-metadata"] = this.userAgentMetadata;
    }
    return json;
  }
  orientationToJSON(orientation) {
    const json = {};
    json["width"] = orientation.width;
    json["height"] = orientation.height;
    if (orientation.outlineInsets) {
      json.outline = {
        insets: {
          left: orientation.outlineInsets.left,
          top: orientation.outlineInsets.top,
          right: orientation.outlineInsets.right,
          bottom: orientation.outlineInsets.bottom
        },
        image: orientation.outlineImage
      };
    }
    if (orientation.hinge) {
      json.hinge = {
        width: orientation.hinge.width,
        height: orientation.hinge.height,
        x: orientation.hinge.x,
        y: orientation.hinge.y
      };
      if (orientation.hinge.contentColor) {
        json.hinge.contentColor = {
          r: orientation.hinge.contentColor.r,
          g: orientation.hinge.contentColor.g,
          b: orientation.hinge.contentColor.b,
          a: orientation.hinge.contentColor.a
        };
      }
      if (orientation.hinge.outlineColor) {
        json.hinge.outlineColor = {
          r: orientation.hinge.outlineColor.r,
          g: orientation.hinge.outlineColor.g,
          b: orientation.hinge.outlineColor.b,
          a: orientation.hinge.outlineColor.a
        };
      }
    }
    return json;
  }
  modeImage(mode) {
    if (!mode.image) {
      return "";
    }
    return computeRelativeImageURL(mode.image);
  }
  outlineImage(mode) {
    const orientation = this.orientationByName(mode.orientation);
    if (!orientation.outlineImage) {
      return "";
    }
    return computeRelativeImageURL(orientation.outlineImage);
  }
  orientationByName(name) {
    switch (name) {
      case VerticalSpanned:
        return this.verticalSpanned;
      case HorizontalSpanned:
        return this.horizontalSpanned;
      case Vertical:
        return this.vertical;
      default:
        return this.horizontal;
    }
  }
  show() {
    if (this.#show === Show.Default) {
      return this.#showByDefault;
    }
    return this.#show === Show.Always;
  }
  setShow(show) {
    this.#show = show ? Show.Always : Show.Never;
  }
  copyShowFrom(other) {
    this.#show = other.#show;
  }
  touch() {
    return this.capabilities.indexOf(
      "touch"
      /* Capability.TOUCH */
    ) !== -1;
  }
  mobile() {
    return this.capabilities.indexOf(
      "mobile"
      /* Capability.MOBILE */
    ) !== -1;
  }
};
var Horizontal = "horizontal";
var Vertical = "vertical";
var HorizontalSpanned = "horizontal-spanned";
var VerticalSpanned = "vertical-spanned";
var Type;
(function(Type3) {
  Type3["Phone"] = "phone";
  Type3["Tablet"] = "tablet";
  Type3["Notebook"] = "notebook";
  Type3["Desktop"] = "desktop";
  Type3["Foldable"] = "foldable";
  Type3["SmartDisplay"] = "smart-display";
  Type3["Unknown"] = "unknown";
})(Type || (Type = {}));
function deviceCategory(device) {
  if (device.type === Type.Foldable || device.isFoldableScreen || device.isDualScreen) {
    return "foldable";
  }
  if (device.type === Type.SmartDisplay) {
    return "smart_display";
  }
  if (device.type === Type.Tablet || device.type === Type.Notebook || device.type === Type.Desktop) {
    return "tablet_desktop";
  }
  return "mobile";
}
var CATEGORY_ORDER = [
  "mobile",
  "foldable",
  "tablet_desktop",
  "smart_display"
];
function getCategoryTitle(category) {
  switch (category) {
    case "mobile":
      return i18nString(UIStrings.mobileGroup);
    case "foldable":
      return i18nString(UIStrings.foldablesGroup);
    case "tablet_desktop":
      return i18nString(UIStrings.tabletsAndDesktopsGroup);
    case "smart_display":
      return i18nString(UIStrings.smartDisplaysGroup);
  }
}
var Show;
(function(Show2) {
  Show2["Always"] = "Always";
  Show2["Default"] = "Default";
  Show2["Never"] = "Never";
})(Show || (Show = {}));
var EmulatedDevicesList = class _EmulatedDevicesList extends Common.ObjectWrapper.ObjectWrapper {
  #standardSetting;
  #standard;
  #customSetting;
  #custom;
  constructor(settings) {
    super();
    this.#standardSetting = settings.createSetting("standard-emulated-device-list", []);
    this.#standard = /* @__PURE__ */ new Set();
    this.listFromJSONV1(this.#standardSetting.get(), this.#standard);
    this.updateStandardDevices();
    this.#customSetting = settings.createSetting("custom-emulated-device-list", []);
    this.#custom = /* @__PURE__ */ new Set();
    if (!this.listFromJSONV1(this.#customSetting.get(), this.#custom)) {
      this.saveCustomDevices();
    }
  }
  static instance() {
    if (!Root.DevToolsContext.globalInstance().has(_EmulatedDevicesList)) {
      Root.DevToolsContext.globalInstance().set(
        _EmulatedDevicesList,
        // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
        new _EmulatedDevicesList(Common.Settings.Settings.instance())
      );
    }
    return Root.DevToolsContext.globalInstance().get(_EmulatedDevicesList);
  }
  updateStandardDevices() {
    const devices = /* @__PURE__ */ new Set();
    for (const emulatedDevice of emulatedDevices) {
      const device = EmulatedDevice.fromJSONV1(emulatedDevice);
      if (device) {
        devices.add(device);
      }
    }
    this.copyShowValues(this.#standard, devices);
    this.#standard = devices;
    this.saveStandardDevices();
  }
  listFromJSONV1(jsonArray, result) {
    if (!Array.isArray(jsonArray)) {
      return false;
    }
    let success = true;
    for (let i = 0; i < jsonArray.length; ++i) {
      const device = EmulatedDevice.fromJSONV1(jsonArray[i]);
      if (device) {
        result.add(device);
        if (!device.modes.length) {
          device.modes.push({ title: "", orientation: Horizontal, insets: new Insets(0, 0, 0, 0), image: null });
          device.modes.push({ title: "", orientation: Vertical, insets: new Insets(0, 0, 0, 0), image: null });
        }
      } else {
        success = false;
      }
    }
    return success;
  }
  static rawEmulatedDevicesForTest() {
    return emulatedDevices;
  }
  standard() {
    return [...this.#standard];
  }
  custom() {
    return [...this.#custom];
  }
  revealCustomSetting() {
    void Common.Revealer.reveal(this.#customSetting);
  }
  addCustomDevice(device) {
    this.#custom.add(device);
    this.saveCustomDevices();
  }
  removeCustomDevice(device) {
    this.#custom.delete(device);
    this.saveCustomDevices();
  }
  saveCustomDevices() {
    const json = [];
    this.#custom.forEach((device) => json.push(device.toJSON()));
    this.#customSetting.set(json);
    this.dispatchEventToListeners(
      "CustomDevicesUpdated"
      /* Events.CUSTOM_DEVICES_UPDATED */
    );
  }
  saveStandardDevices() {
    const json = [];
    this.#standard.forEach((device) => json.push(device.toJSON()));
    this.#standardSetting.set(json);
    this.dispatchEventToListeners(
      "StandardDevicesUpdated"
      /* Events.STANDARD_DEVICES_UPDATED */
    );
  }
  copyShowValues(from, to) {
    const fromDeviceById = /* @__PURE__ */ new Map();
    for (const device of from) {
      fromDeviceById.set(device.title, device);
    }
    for (const toDevice of to) {
      const fromDevice = fromDeviceById.get(toDevice.title);
      if (fromDevice) {
        toDevice.copyShowFrom(fromDevice);
      }
    }
  }
};
var emulatedDevices = [
  // This is used by a python script to keep this list up-to-date with
  // chromedriver native code.
  // See //chrome/test/chromedriver/embed_mobile_devices_in_cpp.py in Chromium.
  // DEVICE-LIST-BEGIN
  {
    "order": 10,
    "show-by-default": true,
    "title": "iPhone SE",
    "screen": {
      "horizontal": {
        "width": 667,
        "height": 375
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 375,
        "height": 667
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone"
  },
  {
    "order": 12,
    "show-by-default": false,
    "title": "iPhone XR",
    "screen": {
      "horizontal": {
        "width": 896,
        "height": 414
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 414,
        "height": 896
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 44, "right": 0, "bottom": 34 },
        "cutout": { "shape": "notch", "x": 92, "y": 0, "width": 231, "height": 33, "upper-radius": 6, "lower-radius": 25 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 44, "top": 0, "right": 44, "bottom": 21 }
      }
    ]
  },
  {
    "order": 14,
    "show-by-default": false,
    "title": "iPhone 12 Pro",
    "screen": {
      "horizontal": {
        "width": 844,
        "height": 390
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 390,
        "height": 844
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 47, "right": 0, "bottom": 34 },
        "cutout": { "shape": "notch", "x": 90, "y": 0, "width": 210, "height": 32, "upper-radius": 6, "lower-radius": 23 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 47, "top": 0, "right": 47, "bottom": 21 }
      }
    ]
  },
  {
    "order": 15,
    "show-by-default": false,
    "title": "iPhone 14",
    "screen": {
      "horizontal": {
        "width": 844,
        "height": 390
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 390,
        "height": 844
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 47, "right": 0, "bottom": 34 },
        "cutout": { "shape": "notch", "x": 114, "y": 0, "width": 162, "height": 34, "upper-radius": 5, "lower-radius": 22 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 47, "top": 0, "right": 47, "bottom": 21 }
      }
    ]
  },
  {
    "order": 16,
    "show-by-default": false,
    "title": "iPhone 14 Plus",
    "screen": {
      "horizontal": {
        "width": 926,
        "height": 428
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 428,
        "height": 926
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 47, "right": 0, "bottom": 34 },
        "cutout": { "shape": "notch", "x": 133, "y": 0, "width": 161, "height": 34, "upper-radius": 5, "lower-radius": 22 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 47, "top": 0, "right": 47, "bottom": 21 }
      }
    ]
  },
  {
    "order": 17,
    "show-by-default": false,
    "title": "iPhone 14 Pro",
    "screen": {
      "horizontal": {
        "width": 852,
        "height": 393
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 393,
        "height": 852
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 134, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 18,
    "show-by-default": false,
    "title": "iPhone 14 Pro Max",
    "screen": {
      "horizontal": {
        "width": 932,
        "height": 430
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 430,
        "height": 932
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 153, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 19,
    "show-by-default": false,
    "title": "iPhone 15",
    "screen": {
      "horizontal": {
        "width": 852,
        "height": 393
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 393,
        "height": 852
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 134, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 20,
    "show-by-default": false,
    "title": "iPhone 15 Plus",
    "screen": {
      "horizontal": {
        "width": 932,
        "height": 430
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 430,
        "height": 932
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 153, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 21,
    "show-by-default": false,
    "title": "iPhone 15 Pro",
    "screen": {
      "horizontal": {
        "width": 852,
        "height": 393
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 393,
        "height": 852
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 134, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 22,
    "show-by-default": false,
    "title": "iPhone 15 Pro Max",
    "screen": {
      "horizontal": {
        "width": 932,
        "height": 430
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 430,
        "height": 932
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 153, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 23,
    "show-by-default": false,
    "title": "iPhone 16e",
    "screen": {
      "horizontal": {
        "width": 844,
        "height": 390
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 390,
        "height": 844
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 47, "right": 0, "bottom": 34 },
        "cutout": { "shape": "notch", "x": 114, "y": 0, "width": 162, "height": 34, "upper-radius": 5, "lower-radius": 22 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 47, "top": 0, "right": 47, "bottom": 21 }
      }
    ]
  },
  {
    "order": 24,
    "show-by-default": true,
    "title": "iPhone 16",
    "screen": {
      "horizontal": {
        "width": 852,
        "height": 393
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 393,
        "height": 852
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 134, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 25,
    "show-by-default": false,
    "title": "iPhone 16 Plus",
    "screen": {
      "horizontal": {
        "width": 932,
        "height": 430
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 430,
        "height": 932
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 59, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 153, "y": 11, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 59, "top": 0, "right": 59, "bottom": 21 }
      }
    ]
  },
  {
    "order": 26,
    "show-by-default": false,
    "title": "iPhone 16 Pro",
    "screen": {
      "horizontal": {
        "width": 874,
        "height": 402
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 402,
        "height": 874
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 62, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 139, "y": 14, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 62, "top": 0, "right": 62, "bottom": 21 }
      }
    ]
  },
  {
    "order": 27,
    "show-by-default": true,
    "title": "iPhone 16 Pro Max",
    "screen": {
      "horizontal": {
        "width": 956,
        "height": 440
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 440,
        "height": 956
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPhone", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 62, "right": 0, "bottom": 34 },
        "cutout": { "shape": "pill", "x": 158, "y": 14, "width": 125, "height": 37, "border-radius": 19 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 62, "top": 0, "right": 62, "bottom": 21 }
      }
    ]
  },
  {
    "order": 30,
    "show-by-default": false,
    "title": "Pixel 7",
    "screen": {
      "horizontal": {
        "width": 915,
        "height": 412
      },
      "device-pixel-ratio": 2.625,
      "vertical": {
        "width": 412,
        "height": 915
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "13", "architecture": "", "model": "Pixel 7", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 52, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 183, "y": 0, "width": 55, "height": 52, "cx": 206, "cy": 26, "radius": 13 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 0, "right": 52, "bottom": 0 }
      }
    ]
  },
  {
    "order": 31,
    "show-by-default": false,
    "title": "Pixel 8",
    "screen": {
      "horizontal": {
        "width": 915,
        "height": 412
      },
      "device-pixel-ratio": 2.625,
      "vertical": {
        "width": 412,
        "height": 915
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "Pixel 8", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 50, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 182, "y": 0, "width": 46, "height": 50, "cx": 206, "cy": 25, "radius": 14 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 0, "right": 50, "bottom": 0 }
      }
    ]
  },
  {
    "order": 32,
    "show-by-default": false,
    "title": "Pixel 8 Pro",
    "screen": {
      "horizontal": {
        "width": 997,
        "height": 448
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 448,
        "height": 997
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "Pixel 8 Pro", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 50, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 205, "y": 0, "width": 37, "height": 50, "cx": 224, "cy": 25, "radius": 14 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 0, "right": 50, "bottom": 0 }
      }
    ]
  },
  {
    "order": 33,
    "show-by-default": false,
    "title": "Pixel 8a",
    "screen": {
      "horizontal": {
        "width": 915,
        "height": 412
      },
      "device-pixel-ratio": 2.625,
      "vertical": {
        "width": 412,
        "height": 915
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "Pixel 8a", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 46, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 185, "y": 0, "width": 42, "height": 46, "cx": 206, "cy": 26, "radius": 13 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 0, "right": 46, "bottom": 0 }
      }
    ]
  },
  {
    "order": 34,
    "show-by-default": true,
    "title": "Pixel 9",
    "screen": {
      "horizontal": {
        "width": 924,
        "height": 412
      },
      "device-pixel-ratio": 2.625,
      "vertical": {
        "width": 412,
        "height": 924
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "Pixel 9", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 58, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 188, "y": 0, "width": 37, "height": 58, "cx": 206, "cy": 29, "radius": 14 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 0, "right": 58, "bottom": 0 }
      }
    ]
  },
  {
    "order": 35,
    "show-by-default": true,
    "title": "Pixel 9 Pro",
    "screen": {
      "horizontal": {
        "width": 952,
        "height": 427
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 427,
        "height": 952
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "Pixel 9 Pro", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 68, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 195, "y": 0, "width": 36, "height": 68, "cx": 213, "cy": 34, "radius": 16 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 0, "right": 68, "bottom": 0 }
      }
    ]
  },
  {
    "order": 36,
    "show-by-default": false,
    "title": "Pixel 9 Pro XL",
    "screen": {
      "horizontal": {
        "width": 997,
        "height": 448
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "width": 448,
        "height": 997
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "Pixel 9 Pro XL", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 66, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 205, "y": 0, "width": 38, "height": 66, "cx": 224, "cy": 33, "radius": 16 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 0, "right": 66, "bottom": 0 }
      }
    ]
  },
  {
    "order": 37,
    "show-by-default": true,
    "title": "Pixel 10",
    "screen": {
      "horizontal": {
        "width": 924,
        "height": 412
      },
      "device-pixel-ratio": 2.625,
      "vertical": {
        "width": 412,
        "height": 924
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "16", "architecture": "", "model": "Pixel 10", "mobile": true },
    "type": "phone",
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 58, "right": 0, "bottom": 0 },
        "cutout": { "shape": "circle", "x": 188, "y": 0, "width": 37, "height": 58, "cx": 206, "cy": 29, "radius": 14 }
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 },
        "safe-area-insets": { "left": 0, "top": 0, "right": 58, "bottom": 0 }
      }
    ]
  },
  {
    "order": 38,
    "show-by-default": false,
    "title": "Samsung Galaxy S8+",
    "screen": {
      "horizontal": {
        "width": 740,
        "height": 360
      },
      "device-pixel-ratio": 4,
      "vertical": {
        "width": 360,
        "height": 740
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "8.0.0", "architecture": "", "model": "SM-G955U", "mobile": true },
    "type": "phone"
  },
  {
    "order": 39,
    "show-by-default": false,
    "title": "Samsung Galaxy S20 Ultra",
    "screen": {
      "horizontal": {
        "width": 915,
        "height": 412
      },
      "device-pixel-ratio": 3.5,
      "vertical": {
        "width": 412,
        "height": 915
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "13", "architecture": "", "model": "SM-G981B", "mobile": true },
    "type": "phone"
  },
  {
    "order": 43,
    "show-by-default": false,
    "title": "Surface Pro 7",
    "screen": {
      "horizontal": {
        "width": 1368,
        "height": 912
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 912,
        "height": 1368
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
    "type": "tablet"
  },
  {
    "order": 40,
    "show-by-default": true,
    "title": "iPad Mini",
    "screen": {
      "horizontal": {
        "width": 1024,
        "height": 768
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 768,
        "height": 1024
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPad", "mobile": true },
    "type": "tablet"
  },
  {
    "order": 42,
    "show-by-default": true,
    "title": 'iPad Pro 13"',
    "screen": {
      "horizontal": {
        "width": 1376,
        "height": 1032
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 1032,
        "height": 1376
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
    "user-agent-metadata": { "platform": "iOS", "platformVersion": "18.5", "architecture": "", "model": "iPad", "mobile": true },
    "type": "tablet"
  },
  {
    "order": 43,
    "show-by-default": true,
    "title": "Surface Pro 10",
    "screen": {
      "horizontal": {
        "width": 1440,
        "height": 960
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 960,
        "height": 1440
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
    "type": "tablet"
  },
  {
    "order": 44,
    "show-by-default": false,
    "dual-screen": true,
    "title": "Surface Duo",
    "screen": {
      "horizontal": { "width": 720, "height": 540 },
      "device-pixel-ratio": 2.5,
      "vertical": { "width": 540, "height": 720 },
      "vertical-spanned": {
        "width": 1114,
        "height": 720,
        "hinge": { "width": 34, "height": 720, "x": 540, "y": 0, "contentColor": { "r": 38, "g": 38, "b": 38, "a": 1 } }
      },
      "horizontal-spanned": {
        "width": 720,
        "height": 1114,
        "hinge": { "width": 720, "height": 34, "x": 0, "y": 540, "contentColor": { "r": 38, "g": 38, "b": 38, "a": 1 } }
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 11.0; Surface Duo) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "11.0", "architecture": "", "model": "Surface Duo", "mobile": true },
    "type": "phone",
    "modes": [
      { "title": "default", "orientation": "vertical", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      { "title": "default", "orientation": "horizontal", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      { "title": "spanned", "orientation": "vertical-spanned", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      {
        "title": "spanned",
        "orientation": "horizontal-spanned",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 }
      }
    ]
  },
  {
    "order": 38,
    "show-by-default": true,
    "title": "Samsung Galaxy A55",
    "screen": {
      "horizontal": { "width": 800, "height": 360 },
      "device-pixel-ratio": 2.25,
      "vertical": { "width": 360, "height": 800 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "SM-A556B", "mobile": true },
    "type": "phone"
  },
  {
    "order": 45,
    "show-by-default": true,
    "foldable-screen": true,
    "title": "Pixel 9 Pro Fold",
    "screen": {
      "horizontal": { "width": 922, "height": 412 },
      "device-pixel-ratio": 2.625,
      "vertical": { "width": 412, "height": 922 },
      "vertical-spanned": {
        "width": 836,
        "height": 842,
        "hinge": {
          "width": 0,
          "height": 842,
          "x": 418,
          "y": 0,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      },
      "horizontal-spanned": {
        "width": 842,
        "height": 836,
        "hinge": {
          "width": 842,
          "height": 0,
          "x": 0,
          "y": 418,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro Fold) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": {
      "platform": "Android",
      "platformVersion": "14",
      "architecture": "",
      "model": "Pixel 9 Pro Fold",
      "mobile": true
    },
    "type": "phone",
    "modes": [
      { "title": "default", "orientation": "vertical", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      { "title": "default", "orientation": "horizontal", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      { "title": "spanned", "orientation": "vertical-spanned", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      {
        "title": "spanned",
        "orientation": "horizontal-spanned",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 }
      }
    ]
  },
  {
    "order": 46,
    "show-by-default": true,
    "foldable-screen": true,
    "title": "Galaxy Z Fold 6",
    "screen": {
      "horizontal": { "width": 968, "height": 412 },
      "device-pixel-ratio": 2.625,
      "vertical": { "width": 412, "height": 968 },
      "vertical-spanned": {
        "width": 744,
        "height": 860,
        "hinge": {
          "width": 0,
          "height": 860,
          "x": 372,
          "y": 0,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      },
      "horizontal-spanned": {
        "width": 860,
        "height": 744,
        "hinge": {
          "width": 860,
          "height": 0,
          "x": 0,
          "y": 372,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 14; SM-F956U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "14", "architecture": "", "model": "SM-F956U", "mobile": true },
    "type": "phone",
    "modes": [
      { "title": "default", "orientation": "vertical", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      { "title": "default", "orientation": "horizontal", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      { "title": "spanned", "orientation": "vertical-spanned", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      {
        "title": "spanned",
        "orientation": "horizontal-spanned",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 }
      }
    ]
  },
  {
    "order": 46,
    "show-by-default": false,
    "foldable-screen": true,
    "title": "Galaxy Z Fold 5",
    "screen": {
      "horizontal": { "width": 882, "height": 344 },
      "device-pixel-ratio": 2.625,
      "vertical": { "width": 344, "height": 882 },
      "vertical-spanned": {
        "width": 690,
        "height": 829,
        "hinge": {
          "width": 0,
          "height": 829,
          "x": 345,
          "y": 0,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      },
      "horizontal-spanned": {
        "width": 829,
        "height": 690,
        "hinge": {
          "width": 829,
          "height": 0,
          "x": 0,
          "y": 345,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "10.0", "architecture": "", "model": "SM-F946U", "mobile": true },
    "type": "phone",
    "modes": [
      { "title": "default", "orientation": "vertical", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      { "title": "default", "orientation": "horizontal", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      { "title": "spanned", "orientation": "vertical-spanned", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      {
        "title": "spanned",
        "orientation": "horizontal-spanned",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 }
      }
    ]
  },
  {
    "order": 47,
    "show-by-default": false,
    "foldable-screen": true,
    "title": "Asus Zenbook Fold",
    "screen": {
      "horizontal": { "width": 1280, "height": 853 },
      "device-pixel-ratio": 1.5,
      "vertical": { "width": 853, "height": 1280 },
      "vertical-spanned": {
        "width": 1706,
        "height": 1280,
        "hinge": {
          "width": 107,
          "height": 1280,
          "x": 800,
          "y": 0,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      },
      "horizontal-spanned": {
        "width": 1280,
        "height": 1706,
        "hinge": {
          "width": 1706,
          "height": 107,
          "x": 0,
          "y": 800,
          "contentColor": { "r": 38, "g": 38, "b": 38, "a": 0.2 },
          "outlineColor": { "r": 38, "g": 38, "b": 38, "a": 0.7 }
        }
      }
    },
    "capabilities": ["touch"],
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
    "user-agent-metadata": { "platform": "Windows", "platformVersion": "11.0", "architecture": "", "model": "UX9702AA", "mobile": false },
    "type": "tablet",
    "modes": [
      { "title": "default", "orientation": "vertical", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      { "title": "default", "orientation": "horizontal", "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 } },
      {
        "title": "spanned",
        "orientation": "vertical-spanned",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 }
      },
      {
        "title": "spanned",
        "orientation": "horizontal-spanned",
        "insets": { "left": 0, "top": 0, "right": 0, "bottom": 0 }
      }
    ]
  },
  {
    "order": 48,
    "show-by-default": false,
    "title": "Samsung Galaxy A51/71",
    "screen": {
      "horizontal": {
        "width": 914,
        "height": 412
      },
      "device-pixel-ratio": 2.625,
      "vertical": {
        "width": 412,
        "height": 914
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "8.0.0", "architecture": "", "model": "SM-G955U", "mobile": true },
    "type": "phone"
  },
  {
    "order": 52,
    "show-by-default": true,
    "title": "Nest Hub Max",
    "screen": {
      "horizontal": {
        "outline": {
          "image": "@url(optimized/google-nest-hub-max-horizontal.avif)",
          "insets": { "left": 92, "top": 96, "right": 91, "bottom": 248 }
        },
        "width": 1280,
        "height": 800
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 1280,
        "height": 800
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 CrKey/1.54.250320",
    "type": "smart-display",
    "modes": [{ "title": "default", "orientation": "horizontal" }]
  },
  {
    "show-by-default": false,
    "title": "Galaxy Tab S4",
    "screen": {
      "horizontal": { "width": 1138, "height": 712 },
      "device-pixel-ratio": 2.25,
      "vertical": { "width": 712, "height": 1138 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 8.1.0; SM-T837A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "8.1.0", "architecture": "", "model": "SM-T837A", "mobile": false },
    "type": "phone"
  },
  {
    "order": 1,
    "show-by-default": false,
    "title": "JioPhone 2",
    "screen": {
      "horizontal": { "width": 320, "height": 240 },
      "device-pixel-ratio": 1,
      "vertical": { "width": 240, "height": 320 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Mobile; LYF/F300B/LYF-F300B-001-01-15-130718-i;Android; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5",
    "user-agent-metadata": {
      "platform": "Android",
      "platformVersion": "",
      "architecture": "",
      "model": "LYF/F300B/LYF-F300B-001-01-15-130718-i",
      "mobile": true
    },
    "type": "phone"
  },
  {
    "show-by-default": false,
    /* DEVICE-LIST-IF-JS */
    "title": i18nLazyString(UIStrings.laptopWithTouch),
    /* DEVICE-LIST-ELSE
    'title': 'Laptop with touch',
    DEVICE-LIST-END-IF */
    "screen": {
      "horizontal": { "width": 1280, "height": 950 },
      "device-pixel-ratio": 1,
      "vertical": { "width": 950, "height": 1280 }
    },
    "capabilities": ["touch"],
    "user-agent": "",
    "type": "notebook",
    "modes": [{ "title": "default", "orientation": "horizontal" }]
  },
  {
    "show-by-default": false,
    /* DEVICE-LIST-IF-JS */
    "title": i18nLazyString(UIStrings.laptopWithHiDPIScreen),
    /* DEVICE-LIST-ELSE
    'title': 'Laptop with HiDPI screen',
    DEVICE-LIST-END-IF */
    "screen": {
      "horizontal": { "width": 1440, "height": 900 },
      "device-pixel-ratio": 2,
      "vertical": { "width": 900, "height": 1440 }
    },
    "capabilities": [],
    "user-agent": "",
    "type": "notebook",
    "modes": [{ "title": "default", "orientation": "horizontal" }]
  },
  {
    "show-by-default": false,
    /* DEVICE-LIST-IF-JS */
    "title": i18nLazyString(UIStrings.laptopWithMDPIScreen),
    /* DEVICE-LIST-ELSE
    'title': 'Laptop with MDPI screen',
    DEVICE-LIST-END-IF */
    "screen": {
      "horizontal": { "width": 1280, "height": 800 },
      "device-pixel-ratio": 1,
      "vertical": { "width": 800, "height": 1280 }
    },
    "capabilities": [],
    "user-agent": "",
    "type": "notebook",
    "modes": [{ "title": "default", "orientation": "horizontal" }]
  },
  {
    "show-by-default": false,
    "title": "Moto G4",
    "screen": {
      "horizontal": {
        "outline": {
          "image": "@url(optimized/MotoG4-landscape.avif)",
          "insets": { "left": 91, "top": 30, "right": 74, "bottom": 30 }
        },
        "width": 640,
        "height": 360
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "outline": {
          "image": "@url(optimized/MotoG4-portrait.avif)",
          "insets": { "left": 30, "top": 91, "right": 30, "bottom": 74 }
        },
        "width": 360,
        "height": 640
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "6.0.1", "architecture": "", "model": "Moto G (4)", "mobile": true },
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Moto G Power",
    "screen": {
      "device-pixel-ratio": 1.75,
      "horizontal": {
        "width": 823,
        "height": 412
      },
      "vertical": {
        "width": 412,
        "height": 823
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": {
      "platform": "Android",
      "platformVersion": "11",
      "architecture": "",
      "model": "moto g power (2022)",
      "mobile": true
    },
    "type": "phone"
  },
  {
    "order": 200,
    "show-by-default": false,
    "title": "Facebook on Android",
    "screen": {
      "horizontal": {
        "width": 892,
        "height": 412
      },
      "device-pixel-ratio": 3.5,
      "vertical": {
        "width": 412,
        "height": 892
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 12; Pixel 6 Build/SQ3A.220705.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/%s Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/407.0.0.0.65;]",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "12", "architecture": "", "model": "Pixel 6", "mobile": true },
    "type": "phone"
  }
  // DEVICE-LIST-END
];

// gen/front_end/models/emulation/DeviceModeModel.js
var UIStrings2 = {
  /**
   * @description Error message shown on the Devices settings tab when the user enters an empty
   * width for a custom device.
   */
  widthCannotBeEmpty: "Width can\u2019t be empty.",
  /**
   * @description Error message shown on the Devices settings tab when the user enters an invalid
   * width for a custom device.
   */
  widthMustBeANumber: "Width must be a number.",
  /**
   * @description Error message shown on the Devices settings tab when the user has entered a width
   * for a custom device that is too large.
   * @example {9999} PH1
   */
  widthMustBeLessThanOrEqualToS: "Width must be less than or equal to {PH1}.",
  /**
   * @description Error message shown on the Devices settings tab when the user has entered a width
   * for a custom device that is too small.
   * @example {50} PH1
   */
  widthMustBeGreaterThanOrEqualToS: "Width must be greater than or equal to {PH1}.",
  /**
   * @description Error message shown on the Devices settings tab when the user enters an empty
   * height for a custom device.
   */
  heightCannotBeEmpty: "Height can\u2019t be empty.",
  /**
   * @description Error message shown on the Devices settings tab when the user enters an invalid
   * height for a custom device.
   */
  heightMustBeANumber: "Height must be a number.",
  /**
   * @description Error message shown on the Devices settings tab when the user has entered a height
   * for a custom device that is too large.
   * @example {9999} PH1
   */
  heightMustBeLessThanOrEqualToS: "Height must be less than or equal to {PH1}.",
  /**
   * @description Error message shown on the Devices settings tab when the user has entered a height
   * for a custom device that is too small.
   * @example {50} PH1
   */
  heightMustBeGreaterThanOrEqualTo: "Height must be greater than or equal to {PH1}.",
  /**
   * @description Error message shown on the Devices settings tab when the user enters an invalid
   * device pixel ratio for a custom device.
   */
  devicePixelRatioMustBeANumberOr: "Device pixel ratio must be a number or blank.",
  /**
   * @description Error message shown on the Devices settings tab when the user enters a device
   * pixel ratio for a custom device that is too large.
   * @example {10} PH1
   */
  devicePixelRatioMustBeLessThanOr: "Device pixel ratio must be less than or equal to {PH1}.",
  /**
   * @description Error message shown on the Devices settings tab when the user enters a device
   * pixel ratio for a custom device that is too small.
   * @example {0} PH1
   */
  devicePixelRatioMustBeGreater: "Device pixel ratio must be greater than or equal to {PH1}."
};
var str_2 = i18n3.i18n.registerUIStrings("models/emulation/DeviceModeModel.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var CUTOUT_SHAPE_TO_PROTOCOL = {
  [
    "pill"
    /* CutoutShape.PILL */
  ]: "pill",
  [
    "notch"
    /* CutoutShape.NOTCH */
  ]: "notch",
  [
    "circle"
    /* CutoutShape.CIRCLE */
  ]: "circle",
  [
    "rectangle"
    /* CutoutShape.RECTANGLE */
  ]: "rectangle"
};
var DeviceModeModel = class _DeviceModeModel extends Common2.ObjectWrapper.ObjectWrapper {
  #screenRect;
  #visiblePageRect;
  #availableSize;
  #preferredSize;
  #initialized;
  #appliedDeviceSize;
  #appliedDeviceScaleFactor;
  #appliedUserAgentType;
  #scaleSetting;
  #scale;
  #widthSetting;
  #heightSetting;
  #uaSetting;
  #deviceScaleFactorSetting;
  #deviceOutlineSetting;
  #toolbarControlsEnabledSetting;
  #type;
  #device;
  #mode;
  #fitScale;
  #touchEnabled;
  #touchMobile;
  #emulationModel;
  #onModelAvailable;
  #outlineRect;
  #screenOrientationLocked;
  #targetManager;
  #settings;
  #multitargetNetworkManager;
  constructor(targetManager, settings, multitargetNetworkManager) {
    super();
    this.#targetManager = targetManager;
    this.#settings = settings;
    this.#multitargetNetworkManager = multitargetNetworkManager;
    this.#screenRect = new Rect(0, 0, 1, 1);
    this.#visiblePageRect = new Rect(0, 0, 1, 1);
    this.#availableSize = new Geometry.Size(1, 1);
    this.#preferredSize = new Geometry.Size(1, 1);
    this.#initialized = false;
    this.#appliedDeviceSize = new Geometry.Size(1, 1);
    this.#appliedDeviceScaleFactor = globalThis.devicePixelRatio;
    this.#appliedUserAgentType = "Desktop";
    this.#scaleSetting = this.#settings.createSetting("emulation.device-scale", 1);
    if (!this.#scaleSetting.get()) {
      this.#scaleSetting.set(1);
    }
    this.#scaleSetting.addChangeListener(this.scaleSettingChanged, this);
    this.#scale = 1;
    this.#widthSetting = this.#settings.createSetting("emulation.device-width", 400);
    if (this.#widthSetting.get() < MinDeviceSize) {
      this.#widthSetting.set(MinDeviceSize);
    }
    if (this.#widthSetting.get() > MaxDeviceSize) {
      this.#widthSetting.set(MaxDeviceSize);
    }
    this.#widthSetting.addChangeListener(this.widthSettingChanged, this);
    this.#heightSetting = this.#settings.createSetting("emulation.device-height", 0);
    if (this.#heightSetting.get() && this.#heightSetting.get() < MinDeviceSize) {
      this.#heightSetting.set(MinDeviceSize);
    }
    if (this.#heightSetting.get() > MaxDeviceSize) {
      this.#heightSetting.set(MaxDeviceSize);
    }
    this.#heightSetting.addChangeListener(this.heightSettingChanged, this);
    this.#uaSetting = this.#settings.createSetting(
      "emulation.device-ua",
      "Mobile"
      /* UA.MOBILE */
    );
    this.#uaSetting.addChangeListener(this.uaSettingChanged, this);
    this.#deviceScaleFactorSetting = this.#settings.createSetting("emulation.device-scale-factor", 0);
    this.#deviceScaleFactorSetting.addChangeListener(this.deviceScaleFactorSettingChanged, this);
    this.#deviceOutlineSetting = this.#settings.moduleSetting("emulation.show-device-outline");
    this.#deviceOutlineSetting.addChangeListener(this.deviceOutlineSettingChanged, this);
    this.#toolbarControlsEnabledSetting = this.#settings.createSetting(
      "emulation.toolbar-controls-enabled",
      true,
      "Session"
      /* Common.Settings.SettingStorageType.SESSION */
    );
    this.#type = Type2.None;
    this.#device = null;
    this.#mode = null;
    this.#fitScale = 1;
    this.#touchEnabled = false;
    this.#touchMobile = false;
    this.#emulationModel = null;
    this.#onModelAvailable = null;
    this.#screenOrientationLocked = false;
    this.#targetManager.observeModels(SDK2.EmulationModel.EmulationModel, this);
  }
  static instance(opts) {
    if (!Root2.DevToolsContext.globalInstance().has(_DeviceModeModel) || opts?.forceNew) {
      Root2.DevToolsContext.globalInstance().set(_DeviceModeModel, new _DeviceModeModel(
        // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
        SDK2.TargetManager.TargetManager.instance(),
        // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
        Common2.Settings.Settings.instance(),
        // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
        SDK2.NetworkManager.MultitargetNetworkManager.instance()
      ));
    }
    return Root2.DevToolsContext.globalInstance().get(_DeviceModeModel);
  }
  /**
   * This wraps `instance()` in a try/catch because in some DevTools entry points
   * (such as worker_app.ts) the Emulation panel is not included and as such
   * the below code fails; it tries to instantiate the model which requires
   * reading the value of a setting which has not been registered.
   * See crbug.com/361515458 for an example bug that this resolves.
   */
  static tryInstance(opts) {
    try {
      return this.instance(opts);
    } catch {
      return null;
    }
  }
  static removeInstance() {
    if (Root2.DevToolsContext.globalInstance().has(_DeviceModeModel)) {
      Root2.DevToolsContext.globalInstance().get(_DeviceModeModel).dispose();
    }
    Root2.DevToolsContext.globalInstance().delete(_DeviceModeModel);
  }
  dispose() {
    this.#targetManager.unobserveModels(SDK2.EmulationModel.EmulationModel, this);
  }
  static widthValidator(value) {
    let valid = false;
    let errorMessage;
    if (!value) {
      errorMessage = i18nString2(UIStrings2.widthCannotBeEmpty);
    } else if (!/^[\d]+$/.test(value)) {
      errorMessage = i18nString2(UIStrings2.widthMustBeANumber);
    } else if (Number(value) > MaxDeviceSize) {
      errorMessage = i18nString2(UIStrings2.widthMustBeLessThanOrEqualToS, { PH1: MaxDeviceSize });
    } else if (Number(value) < MinDeviceSize) {
      errorMessage = i18nString2(UIStrings2.widthMustBeGreaterThanOrEqualToS, { PH1: MinDeviceSize });
    } else {
      valid = true;
    }
    return { valid, errorMessage };
  }
  static heightValidator(value) {
    let valid = false;
    let errorMessage;
    if (!value) {
      errorMessage = i18nString2(UIStrings2.heightCannotBeEmpty);
    } else if (!/^[\d]+$/.test(value)) {
      errorMessage = i18nString2(UIStrings2.heightMustBeANumber);
    } else if (Number(value) > MaxDeviceSize) {
      errorMessage = i18nString2(UIStrings2.heightMustBeLessThanOrEqualToS, { PH1: MaxDeviceSize });
    } else if (Number(value) < MinDeviceSize) {
      errorMessage = i18nString2(UIStrings2.heightMustBeGreaterThanOrEqualTo, { PH1: MinDeviceSize });
    } else {
      valid = true;
    }
    return { valid, errorMessage };
  }
  static scaleValidator(value) {
    let valid = false;
    let errorMessage;
    const parsedValue = Number(value.trim());
    if (!value) {
      valid = true;
    } else if (Number.isNaN(parsedValue)) {
      errorMessage = i18nString2(UIStrings2.devicePixelRatioMustBeANumberOr);
    } else if (Number(value) > MaxDeviceScaleFactor) {
      errorMessage = i18nString2(UIStrings2.devicePixelRatioMustBeLessThanOr, { PH1: MaxDeviceScaleFactor });
    } else if (Number(value) < MinDeviceScaleFactor) {
      errorMessage = i18nString2(UIStrings2.devicePixelRatioMustBeGreater, { PH1: MinDeviceScaleFactor });
    } else {
      valid = true;
    }
    return { valid, errorMessage };
  }
  get scaleSettingInternal() {
    return this.#scaleSetting;
  }
  setAvailableSize(availableSize, preferredSize) {
    this.#availableSize = availableSize;
    this.#preferredSize = preferredSize;
    this.#initialized = true;
    this.calculateAndEmulate(false);
  }
  emulate(type, device, mode, scale) {
    const resetPageScaleFactor = this.#type !== type || this.#device !== device || this.#mode !== mode;
    this.#type = type;
    if (type === Type2.Device && device && mode) {
      console.assert(Boolean(device) && Boolean(mode), "Must pass device and mode for device emulation");
      this.#mode = mode;
      this.#device = device;
      if (this.#initialized) {
        const orientation = device.orientationByName(mode.orientation);
        this.#scaleSetting.set(scale || this.calculateFitScale(orientation.width, orientation.height, this.currentOutline(), this.currentInsets()));
      }
    } else {
      this.#device = null;
      this.#mode = null;
    }
    if (type !== Type2.None) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.DeviceModeEnabled);
    }
    this.calculateAndEmulate(resetPageScaleFactor);
  }
  setWidth(width) {
    const max = Math.min(MaxDeviceSize, this.preferredScaledWidth());
    width = Math.max(Math.min(width, max), 1);
    this.#widthSetting.set(width);
  }
  setWidthAndScaleToFit(width) {
    width = Math.max(Math.min(width, MaxDeviceSize), 1);
    this.#scaleSetting.set(this.calculateFitScale(width, this.#heightSetting.get()));
    this.#widthSetting.set(width);
  }
  setHeight(height) {
    const max = Math.min(MaxDeviceSize, this.preferredScaledHeight());
    height = Math.max(Math.min(height, max), 0);
    if (height === this.preferredScaledHeight()) {
      height = 0;
    }
    this.#heightSetting.set(height);
  }
  setHeightAndScaleToFit(height) {
    height = Math.max(Math.min(height, MaxDeviceSize), 0);
    this.#scaleSetting.set(this.calculateFitScale(this.#widthSetting.get(), height));
    this.#heightSetting.set(height);
  }
  setScale(scale) {
    this.#scaleSetting.set(scale);
  }
  device() {
    return this.#device;
  }
  mode() {
    return this.#mode;
  }
  type() {
    return this.#type;
  }
  screenImage() {
    return this.#device && this.#mode ? this.#device.modeImage(this.#mode) : "";
  }
  outlineImage() {
    return this.#device && this.#mode && this.#deviceOutlineSetting.get() ? this.#device.outlineImage(this.#mode) : "";
  }
  canShowDeviceFrame() {
    return Boolean(this.#device && this.#mode && this.#device.outlineImage(this.#mode));
  }
  outlineRect() {
    return this.#outlineRect || null;
  }
  screenRect() {
    return this.#screenRect;
  }
  visiblePageRect() {
    return this.#visiblePageRect;
  }
  scale() {
    return this.#scale;
  }
  fitScale() {
    return this.#fitScale;
  }
  appliedDeviceSize() {
    return this.#appliedDeviceSize;
  }
  appliedDeviceScaleFactor() {
    return this.#appliedDeviceScaleFactor;
  }
  appliedUserAgentType() {
    return this.#appliedUserAgentType;
  }
  isFullHeight() {
    return !this.#heightSetting.get();
  }
  isMobile() {
    switch (this.#type) {
      case Type2.Device:
        return this.#device ? this.#device.mobile() : false;
      case Type2.None:
        return false;
      case Type2.Responsive:
        return this.#uaSetting.get() === "Mobile" || this.#uaSetting.get() === "Mobile (no touch)";
    }
    return false;
  }
  enabledSetting() {
    return this.#settings.createSetting("emulation.show-device-mode", false);
  }
  isDeviceModeOn() {
    return this.enabledSetting().get();
  }
  toggleDeviceMode() {
    this.enabledSetting().set(!this.enabledSetting().get());
  }
  scaleSetting() {
    return this.#scaleSetting;
  }
  uaSetting() {
    return this.#uaSetting;
  }
  deviceScaleFactorSetting() {
    return this.#deviceScaleFactorSetting;
  }
  deviceOutlineSetting() {
    return this.#deviceOutlineSetting;
  }
  toolbarControlsEnabledSetting() {
    return this.#toolbarControlsEnabledSetting;
  }
  reset() {
    this.#deviceScaleFactorSetting.set(0);
    this.#scaleSetting.set(1);
    this.setWidth(400);
    this.setHeight(0);
    this.#uaSetting.set(
      "Mobile"
      /* UA.MOBILE */
    );
  }
  modelAdded(emulationModel) {
    if (emulationModel.target() === this.#targetManager.primaryPageTarget() && emulationModel.supportsDeviceEmulation()) {
      this.#emulationModel = emulationModel;
      if (this.#onModelAvailable) {
        const callback = this.#onModelAvailable;
        this.#onModelAvailable = null;
        callback();
      }
      emulationModel.addEventListener("ScreenOrientationLockChanged", this.onScreenOrientationLockChanged, this);
      const resourceTreeModel = emulationModel.target().model(SDK2.ResourceTreeModel.ResourceTreeModel);
      if (resourceTreeModel) {
        resourceTreeModel.addEventListener(SDK2.ResourceTreeModel.Events.FrameResized, this.onFrameChange, this);
        resourceTreeModel.addEventListener(SDK2.ResourceTreeModel.Events.FrameNavigated, this.onFrameChange, this);
      }
    } else {
      void emulationModel.emulateTouch(this.#touchEnabled, this.#touchMobile);
    }
  }
  modelRemoved(emulationModel) {
    if (this.#emulationModel === emulationModel) {
      emulationModel.removeEventListener("ScreenOrientationLockChanged", this.onScreenOrientationLockChanged, this);
      this.#emulationModel = null;
      this.#screenOrientationLocked = false;
      this.dispatchEventToListeners(
        "Updated"
        /* Events.UPDATED */
      );
    }
  }
  inspectedURL() {
    return this.#emulationModel ? this.#emulationModel.target().inspectedURL() : null;
  }
  onFrameChange() {
    const overlayModel = this.#emulationModel ? this.#emulationModel.overlayModel() : null;
    if (!overlayModel) {
      return;
    }
    this.showDeviceOverlaysIfApplicable(overlayModel);
  }
  onScreenOrientationLockChanged(event) {
    this.#screenOrientationLocked = event.data.locked;
    if (event.data.locked && event.data.orientation) {
      this.applyOrientationLock(event.data.orientation);
    }
    this.dispatchEventToListeners(
      "Updated"
      /* Events.UPDATED */
    );
  }
  applyOrientationLock(orientation) {
    const wantsLandscape = orientation.type === "landscapePrimary" || orientation.type === "landscapeSecondary";
    if (this.#type === Type2.Device && this.#device && this.#mode) {
      const isCurrentlyLandscape = this.#mode.orientation === Horizontal || this.#mode.orientation === HorizontalSpanned;
      if (wantsLandscape !== isCurrentlyLandscape) {
        const rotationPartner = this.#device.getRotationPartner(this.#mode);
        if (rotationPartner) {
          this.emulate(this.#type, this.#device, rotationPartner);
        }
      }
    } else if (this.#type === Type2.Responsive) {
      const appliedSize = this.appliedDeviceSize();
      const isCurrentlyLandscape = appliedSize.width > appliedSize.height;
      if (wantsLandscape !== isCurrentlyLandscape) {
        this.setSizeAndScaleToFit(appliedSize.height, appliedSize.width);
      }
    }
  }
  isScreenOrientationLocked() {
    return this.#screenOrientationLocked;
  }
  scaleSettingChanged() {
    this.calculateAndEmulate(false);
  }
  widthSettingChanged() {
    this.calculateAndEmulate(false);
  }
  heightSettingChanged() {
    this.calculateAndEmulate(false);
  }
  uaSettingChanged() {
    this.calculateAndEmulate(true);
  }
  deviceScaleFactorSettingChanged() {
    this.calculateAndEmulate(false);
  }
  deviceOutlineSettingChanged() {
    this.calculateAndEmulate(false);
  }
  preferredScaledWidth() {
    return Math.floor(this.#preferredSize.width / (this.#scaleSetting.get() || 1));
  }
  preferredScaledHeight() {
    return Math.floor(this.#preferredSize.height / (this.#scaleSetting.get() || 1));
  }
  currentOutline() {
    let outline = new Insets(0, 0, 0, 0);
    if (this.#type !== Type2.Device || !this.#device || !this.#mode) {
      return outline;
    }
    const orientation = this.#device.orientationByName(this.#mode.orientation);
    if (this.#deviceOutlineSetting.get()) {
      outline = orientation.outlineInsets || outline;
    }
    return outline;
  }
  currentInsets() {
    if (this.#type !== Type2.Device || !this.#mode) {
      return new Insets(0, 0, 0, 0);
    }
    return this.#mode.insets;
  }
  currentSafeAreaInsets() {
    if (this.#type !== Type2.Device || !this.#mode) {
      return null;
    }
    return this.#mode.safeAreaInsets ?? null;
  }
  applySafeAreaInsets(insets) {
    if (!this.#emulationModel) {
      return;
    }
    if (insets) {
      void this.#emulationModel.setSafeAreaInsets({ top: insets.top, left: insets.left, bottom: insets.bottom, right: insets.right });
    } else {
      void this.#emulationModel.setSafeAreaInsets({});
    }
  }
  getScreenOrientationType() {
    if (!this.#mode) {
      throw new Error("Mode required to get orientation type.");
    }
    switch (this.#mode.orientation) {
      case VerticalSpanned:
      case Vertical:
        return "portraitPrimary";
      case HorizontalSpanned:
      case Horizontal:
      default:
        return "landscapePrimary";
    }
  }
  calculateAndEmulate(resetPageScaleFactor) {
    if (!this.#emulationModel) {
      this.#onModelAvailable = this.calculateAndEmulate.bind(this, resetPageScaleFactor);
    }
    const mobile = this.isMobile();
    const overlayModel = this.#emulationModel ? this.#emulationModel.overlayModel() : null;
    if (overlayModel) {
      this.showDeviceOverlaysIfApplicable(overlayModel);
    }
    if (this.#type === Type2.Device && this.#device && this.#mode) {
      const orientation = this.#device.orientationByName(this.#mode.orientation);
      const outline = this.currentOutline();
      const insets = this.currentInsets();
      this.#fitScale = this.calculateFitScale(orientation.width, orientation.height, outline, insets);
      if (mobile) {
        this.#appliedUserAgentType = this.#device.touch() ? "Mobile" : "Mobile (no touch)";
      } else {
        this.#appliedUserAgentType = this.#device.touch() ? "Desktop (touch)" : "Desktop";
      }
      this.applyDeviceMetrics(new Geometry.Size(orientation.width, orientation.height), insets, outline, this.#scaleSetting.get(), this.#device.deviceScaleFactor, mobile, this.getScreenOrientationType(), resetPageScaleFactor);
      this.applyUserAgent(this.#device.userAgent, this.#device.userAgentMetadata);
      this.applyTouch(this.#device.touch(), mobile);
    } else if (this.#type === Type2.None) {
      this.#fitScale = this.calculateFitScale(this.#availableSize.width, this.#availableSize.height);
      this.#appliedUserAgentType = "Desktop";
      this.applyDeviceMetrics(this.#availableSize, new Insets(0, 0, 0, 0), new Insets(0, 0, 0, 0), 1, 0, mobile, null, resetPageScaleFactor);
      this.applyUserAgent("", null);
      this.applyTouch(false, false);
    } else if (this.#type === Type2.Responsive) {
      let screenWidth = this.#widthSetting.get();
      if (!screenWidth || screenWidth > this.preferredScaledWidth()) {
        screenWidth = this.preferredScaledWidth();
      }
      let screenHeight = this.#heightSetting.get();
      if (!screenHeight || screenHeight > this.preferredScaledHeight()) {
        screenHeight = this.preferredScaledHeight();
      }
      const defaultDeviceScaleFactor = mobile ? defaultMobileScaleFactor : 0;
      this.#fitScale = this.calculateFitScale(this.#widthSetting.get(), this.#heightSetting.get());
      this.#appliedUserAgentType = this.#uaSetting.get();
      this.applyDeviceMetrics(new Geometry.Size(screenWidth, screenHeight), new Insets(0, 0, 0, 0), new Insets(0, 0, 0, 0), this.#scaleSetting.get(), this.#deviceScaleFactorSetting.get() || defaultDeviceScaleFactor, mobile, screenHeight >= screenWidth ? "portraitPrimary" : "landscapePrimary", resetPageScaleFactor);
      this.applyUserAgent(mobile ? _DeviceModeModel.defaultMobileUserAgent() : "", mobile ? _DeviceModeModel.defaultMobileUserAgentMetadata() : null);
      this.applyTouch(
        this.#uaSetting.get() === "Desktop (touch)" || this.#uaSetting.get() === "Mobile",
        this.#uaSetting.get() === "Mobile"
        /* UA.MOBILE */
      );
    }
    if (overlayModel) {
      overlayModel.setShowViewportSizeOnResize(this.#type === Type2.None);
    }
    this.applySafeAreaInsets(this.currentSafeAreaInsets());
    this.dispatchEventToListeners(
      "Updated"
      /* Events.UPDATED */
    );
  }
  calculateFitScale(screenWidth, screenHeight, outline, insets) {
    const outlineWidth = outline ? outline.left + outline.right : 0;
    const outlineHeight = outline ? outline.top + outline.bottom : 0;
    const insetsWidth = insets ? insets.left + insets.right : 0;
    const insetsHeight = insets ? insets.top + insets.bottom : 0;
    let scale = Math.min(screenWidth ? this.#preferredSize.width / (screenWidth + outlineWidth) : 1, screenHeight ? this.#preferredSize.height / (screenHeight + outlineHeight) : 1);
    scale = Math.min(Math.floor(scale * 100), 100);
    let sharpScale = scale;
    while (sharpScale > scale * 0.7) {
      let sharp = true;
      if (screenWidth) {
        sharp = sharp && Number.isInteger((screenWidth - insetsWidth) * sharpScale / 100);
      }
      if (screenHeight) {
        sharp = sharp && Number.isInteger((screenHeight - insetsHeight) * sharpScale / 100);
      }
      if (sharp) {
        return sharpScale / 100;
      }
      sharpScale -= 1;
    }
    return scale / 100;
  }
  setSizeAndScaleToFit(width, height) {
    this.#scaleSetting.set(this.calculateFitScale(width, height));
    this.setWidth(width);
    this.setHeight(height);
  }
  applyUserAgent(userAgent, userAgentMetadata) {
    this.#multitargetNetworkManager.setUserAgentOverride(userAgent, userAgent ? userAgentMetadata : null);
  }
  applyDeviceMetrics(screenSize, insets, outline, scale, deviceScaleFactor, mobile, screenOrientation, resetPageScaleFactor) {
    screenSize.width = Math.max(1, Math.floor(screenSize.width));
    screenSize.height = Math.max(1, Math.floor(screenSize.height));
    let pageWidth = screenSize.width - insets.left - insets.right;
    let pageHeight = screenSize.height - insets.top - insets.bottom;
    const positionX = insets.left;
    const positionY = insets.top;
    const screenOrientationAngle = screenOrientation === "landscapePrimary" ? 90 : 0;
    this.#appliedDeviceSize = screenSize;
    this.#appliedDeviceScaleFactor = deviceScaleFactor || window.devicePixelRatio;
    this.#screenRect = new Rect(Math.max(0, (this.#availableSize.width - screenSize.width * scale) / 2), outline.top * scale, screenSize.width * scale, screenSize.height * scale);
    this.#outlineRect = new Rect(this.#screenRect.left - outline.left * scale, 0, (outline.left + screenSize.width + outline.right) * scale, (outline.top + screenSize.height + outline.bottom) * scale);
    this.#visiblePageRect = new Rect(positionX * scale, positionY * scale, Math.min(pageWidth * scale, this.#availableSize.width - this.#screenRect.left - positionX * scale), Math.min(pageHeight * scale, this.#availableSize.height - this.#screenRect.top - positionY * scale));
    this.#scale = scale;
    const displayFeature = this.getDisplayFeature();
    if (!displayFeature) {
      if (scale === 1 && this.#availableSize.width >= screenSize.width && this.#availableSize.height >= screenSize.height) {
        pageWidth = 0;
        pageHeight = 0;
      }
      if (this.#visiblePageRect.width === pageWidth * scale && this.#visiblePageRect.height === pageHeight * scale && Number.isInteger(pageWidth * scale) && Number.isInteger(pageHeight * scale)) {
        pageWidth = 0;
        pageHeight = 0;
      }
    }
    if (!this.#emulationModel) {
      return;
    }
    if (resetPageScaleFactor) {
      void this.#emulationModel.resetPageScaleFactor();
    }
    if (pageWidth || pageHeight || mobile || deviceScaleFactor || scale !== 1 || screenOrientation || displayFeature) {
      const metrics = {
        width: pageWidth,
        height: pageHeight,
        deviceScaleFactor,
        mobile,
        scale,
        screenWidth: screenSize.width,
        screenHeight: screenSize.height,
        positionX,
        positionY,
        dontSetVisibleSize: true
      };
      if (displayFeature) {
        metrics.displayFeature = displayFeature;
        metrics.devicePosture = {
          type: "folded"
          /* Protocol.Emulation.DevicePostureType.Folded */
        };
      } else {
        metrics.devicePosture = {
          type: "continuous"
          /* Protocol.Emulation.DevicePostureType.Continuous */
        };
      }
      if (screenOrientation) {
        metrics.screenOrientation = { type: screenOrientation, angle: screenOrientationAngle };
      }
      void this.#emulationModel.emulateDevice(metrics);
    } else {
      void this.#emulationModel.emulateDevice(null);
    }
  }
  exitHingeMode() {
    const overlayModel = this.#emulationModel ? this.#emulationModel.overlayModel() : null;
    if (overlayModel) {
      overlayModel.showHingeForDualScreen(null);
    }
  }
  async #captureScreenshot(fullSize, clip) {
    const screenCaptureModel = this.#emulationModel ? this.#emulationModel.target().model(SDK2.ScreenCaptureModel.ScreenCaptureModel) : null;
    if (!screenCaptureModel) {
      return null;
    }
    let screenshotMode;
    if (clip) {
      screenshotMode = "fromClip";
    } else if (fullSize) {
      screenshotMode = "fullpage";
    } else {
      screenshotMode = "fromViewport";
    }
    const overlayModel = this.#emulationModel ? this.#emulationModel.overlayModel() : null;
    if (overlayModel) {
      overlayModel.setShowViewportSizeOnResize(false);
    }
    if (this.#emulationModel && this.#device && this.#mode) {
      const orientation = this.#device.orientationByName(this.#mode.orientation);
      const deviceMetrics = {
        width: orientation.width,
        height: orientation.height,
        deviceScaleFactor: this.#device.deviceScaleFactor,
        mobile: this.isMobile()
      };
      const dispFeature = this.getDisplayFeature();
      if (dispFeature) {
        deviceMetrics.displayFeature = dispFeature;
      }
      await this.#emulationModel.emulateDevice(deviceMetrics);
    }
    try {
      const screenshot = await screenCaptureModel.captureScreenshot("png", 100, screenshotMode, clip);
      return screenshot;
    } finally {
      await this.#emulationModel?.emulateDevice(null);
      overlayModel?.setShowViewportSizeOnResize(this.#type === Type2.None);
      this.calculateAndEmulate(false);
    }
  }
  async captureScreenshot() {
    const screenshot = await this.#captureScreenshot(false);
    if (screenshot === null) {
      return;
    }
    const pageImage = new Image();
    pageImage.src = "data:image/png;base64," + screenshot;
    pageImage.onload = async () => {
      const scale = pageImage.naturalWidth / this.screenRect().width;
      const outlineRectFromModel = this.outlineRect();
      if (!outlineRectFromModel) {
        throw new Error("Unable to take screenshot: no outlineRect available.");
      }
      const outlineRect = outlineRectFromModel.scale(scale);
      const screenRect = this.screenRect().scale(scale);
      const visiblePageRect = this.visiblePageRect().scale(scale);
      const contentLeft = screenRect.left + visiblePageRect.left - outlineRect.left;
      const contentTop = screenRect.top + visiblePageRect.top - outlineRect.top;
      const canvas = new OffscreenCanvas(
        Math.floor(outlineRect.width),
        // Cap the height to not hit the GPU limit.
        // https://crbug.com/1260828
        Math.min(1 << 14, Math.floor(outlineRect.height))
      );
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        throw new Error("Could not get 2d context from canvas.");
      }
      ctx.imageSmoothingEnabled = false;
      if (this.outlineImage()) {
        await this.paintImage(ctx, this.outlineImage(), outlineRect.relativeTo(outlineRect));
      }
      if (this.screenImage()) {
        await this.paintImage(ctx, this.screenImage(), screenRect.relativeTo(outlineRect));
      }
      ctx.drawImage(pageImage, Math.floor(contentLeft), Math.floor(contentTop));
      void this.saveScreenshot(canvas);
    };
  }
  async captureFullSizeScreenshot() {
    const screenshot = await this.#captureScreenshot(true);
    if (screenshot === null) {
      return;
    }
    return this.saveScreenshotBase64(screenshot);
  }
  async captureAreaScreenshot(clip) {
    const screenshot = await this.#captureScreenshot(false, clip);
    if (screenshot === null) {
      return;
    }
    return this.saveScreenshotBase64(screenshot);
  }
  saveScreenshotBase64(screenshot) {
    const pageImage = new Image();
    pageImage.src = "data:image/png;base64," + screenshot;
    pageImage.onload = () => {
      const canvas = new OffscreenCanvas(
        pageImage.naturalWidth,
        // Cap the height to not hit the GPU limit.
        // https://crbug.com/1260828
        Math.min(1 << 14, Math.floor(pageImage.naturalHeight))
      );
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        throw new Error("Could not get 2d context for base64 screenshot.");
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pageImage, 0, 0);
      void this.saveScreenshot(canvas);
    };
  }
  paintImage(ctx, src, rect) {
    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = "Anonymous";
      image.srcset = src;
      image.onerror = () => resolve();
      image.onload = () => {
        ctx.drawImage(image, rect.left, rect.top, rect.width, rect.height);
        resolve();
      };
    });
  }
  async saveScreenshot(canvas) {
    const url = this.inspectedURL();
    let fileName = "";
    if (url) {
      const withoutFragment = Platform.StringUtilities.removeURLFragment(url);
      fileName = Platform.StringUtilities.trimURL(withoutFragment);
    }
    const device = this.device();
    if (device && this.type() === Type2.Device) {
      fileName += `(${device.title})`;
    }
    fileName += ".png";
    const blob = await canvas.convertToBlob({ type: "image/png" });
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const contentData = new TextUtils.ContentData.ContentData(
      base64,
      /* isBase64=*/
      true,
      "image/png"
    );
    await Workspace.FileManager.FileManager.instance().save(
      fileName,
      contentData,
      /* forceSaveAs=*/
      true
    );
    Workspace.FileManager.FileManager.instance().close(fileName);
  }
  applyTouch(touchEnabled, mobile) {
    this.#touchEnabled = touchEnabled;
    this.#touchMobile = mobile;
    for (const emulationModel of this.#targetManager.models(SDK2.EmulationModel.EmulationModel)) {
      void emulationModel.emulateTouch(touchEnabled, mobile);
    }
  }
  showDeviceOverlaysIfApplicable(overlayModel) {
    const orientation = this.#device && this.#mode ? this.#device.orientationByName(this.#mode.orientation) : null;
    if (orientation?.hinge) {
      overlayModel.showHingeForDualScreen(orientation.hinge);
    } else {
      overlayModel.showHingeForDualScreen(null);
    }
    overlayModel.showDisplayCutout(this.currentDisplayCutout());
  }
  currentDisplayCutout() {
    const device = this.#device;
    const mode = this.#mode;
    if (!device || !mode || !device.modes.includes(mode)) {
      return null;
    }
    const cutout = mode.cutout;
    if (cutout) {
      return this.toDisplayCutout(cutout);
    }
    if (mode.orientation !== Horizontal) {
      return null;
    }
    const rotationPartner = device.getRotationPartner(mode);
    const rotatedCutout = rotationPartner?.cutout;
    if (rotationPartner?.orientation !== Vertical || !rotatedCutout) {
      return null;
    }
    const orientation = device.orientationByName(mode.orientation);
    if (rotatedCutout.shape === "circle") {
      return this.toDisplayCutout({
        ...rotatedCutout,
        x: orientation.width - rotatedCutout.y - rotatedCutout.height,
        y: rotatedCutout.x,
        width: rotatedCutout.height,
        height: rotatedCutout.width,
        cx: orientation.width - rotatedCutout.cy,
        cy: rotatedCutout.cx
      });
    }
    return this.toDisplayCutout({
      ...rotatedCutout,
      x: orientation.width - rotatedCutout.y - rotatedCutout.height,
      y: rotatedCutout.x,
      width: rotatedCutout.height,
      height: rotatedCutout.width
    });
  }
  toDisplayCutout(cutout) {
    const { shape, ...rest } = cutout;
    return {
      ...rest,
      shape: CUTOUT_SHAPE_TO_PROTOCOL[shape],
      contentColor: { r: 0, g: 0, b: 0, a: 1 }
    };
  }
  getDisplayFeatureOrientation() {
    if (!this.#mode) {
      throw new Error("Mode required to get display feature orientation.");
    }
    switch (this.#mode.orientation) {
      case VerticalSpanned:
      case Vertical:
        return "vertical";
      case HorizontalSpanned:
      case Horizontal:
      default:
        return "horizontal";
    }
  }
  getDisplayFeature() {
    if (!this.#device || !this.#mode || this.#mode.orientation !== VerticalSpanned && this.#mode.orientation !== HorizontalSpanned) {
      return null;
    }
    const orientation = this.#device.orientationByName(this.#mode.orientation);
    if (!orientation?.hinge) {
      return null;
    }
    const hinge = orientation.hinge;
    return {
      orientation: this.getDisplayFeatureOrientation(),
      offset: this.#mode.orientation === VerticalSpanned ? hinge.x : hinge.y,
      maskLength: this.#mode.orientation === VerticalSpanned ? hinge.width : hinge.height
    };
  }
  /**
   * Heuristic to keep the default mobile User Agent fresh and aligned with the adoption bell curve.
   * Android: We target N-1 versions (where N is the latest) to represent the plurality of global users.
   * iOS: We follow the calendar year (starting from the 2025 shift to year-based versioning).
   * Data sources:
   * - StatCounter Global Stats: https://gs.statcounter.com/os-version-market-share/android
   * - Android adoption typically lags by ~12-18 months for plurality.
   * - iOS adoption typically reaches majority within ~3-6 months.
   */
  static getDynamicMobileUA() {
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const isLateInYear = now.getMonth() >= 9;
    const androidVersion = isLateInYear ? year - 2010 : year - 2011;
    const pixelModel = isLateInYear ? year - 2016 : year - 2017;
    const ua = `Mozilla/5.0 (Linux; Android ${androidVersion}; Pixel ${pixelModel}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36`;
    const metadata = {
      platform: "Android",
      platformVersion: androidVersion.toString(),
      architecture: "",
      model: `Pixel ${pixelModel}`,
      mobile: true
    };
    return { userAgent: ua, metadata };
  }
  static defaultMobileUserAgent() {
    return SDK2.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(_DeviceModeModel.getDynamicMobileUA().userAgent);
  }
  static defaultMobileUserAgentMetadata() {
    return _DeviceModeModel.getDynamicMobileUA().metadata;
  }
};
var Insets = class {
  left;
  top;
  right;
  bottom;
  constructor(left, top, right, bottom) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }
  isEqual(insets) {
    return insets !== null && this.left === insets.left && this.top === insets.top && this.right === insets.right && this.bottom === insets.bottom;
  }
};
var Rect = class _Rect {
  left;
  top;
  width;
  height;
  constructor(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
  }
  isEqual(rect) {
    return rect !== null && this.left === rect.left && this.top === rect.top && this.width === rect.width && this.height === rect.height;
  }
  scale(scale) {
    return new _Rect(this.left * scale, this.top * scale, this.width * scale, this.height * scale);
  }
  relativeTo(origin) {
    return new _Rect(this.left - origin.left, this.top - origin.top, this.width, this.height);
  }
  rebaseTo(origin) {
    return new _Rect(this.left + origin.left, this.top + origin.top, this.width, this.height);
  }
};
var Type2;
(function(Type3) {
  Type3["None"] = "None";
  Type3["Responsive"] = "Responsive";
  Type3["Device"] = "Device";
})(Type2 || (Type2 = {}));
var MinDeviceSize = 50;
var MaxDeviceSize = 9999;
var MinDeviceScaleFactor = 0;
var MaxDeviceScaleFactor = 10;
var MaxDeviceNameLength = 50;
var defaultMobileScaleFactor = 2;
export {
  DeviceModeModel_exports as DeviceModeModel,
  EmulatedDevices_exports as EmulatedDevices
};
//# sourceMappingURL=emulation.js.map
