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
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Geometry from "./../geometry/geometry.js";

// gen/front_end/models/emulation/EmulatedDevices.js
var EmulatedDevices_exports = {};
__export(EmulatedDevices_exports, {
  EmulatedDevice: () => EmulatedDevice,
  EmulatedDevicesList: () => EmulatedDevicesList,
  Horizontal: () => Horizontal,
  HorizontalSpanned: () => HorizontalSpanned,
  Vertical: () => Vertical,
  VerticalSpanned: () => VerticalSpanned,
  computeRelativeImageURL: () => computeRelativeImageURL
});
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as SDK from "./../../core/sdk/sdk.js";
var UIStrings = {
  /**
   * @description Title of the Laptop with touch device
   */
  laptopWithTouch: "Laptop with touch",
  /**
   * @description Title of the Laptop with HiDPI screen device
   */
  laptopWithHiDPIScreen: "Laptop with HiDPI screen",
  /**
   * @description Title of the Laptop with MDPI screen device
   */
  laptopWithMDPIScreen: "Laptop with MDPI screen"
};
var str_ = i18n.i18n.registerUIStrings("models/emulation/EmulatedDevices.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
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
      result.userAgentMetadata = parseValue(json, "user-agent-metadata", "object", null);
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
      json["modes"].push(mode);
    }
    json["show-by-default"] = this.#showByDefault;
    json["dual-screen"] = this.isDualScreen;
    json["foldable-screen"] = this.isFoldableScreen;
    json["show"] = this.#show;
    if (this.userAgentMetadata) {
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
        y: orientation.hinge.y,
        contentColor: void 0,
        outlineColor: void 0
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
  Type3["Unknown"] = "unknown";
})(Type || (Type = {}));
var Show;
(function(Show2) {
  Show2["Always"] = "Always";
  Show2["Default"] = "Default";
  Show2["Never"] = "Never";
})(Show || (Show = {}));
var emulatedDevicesListInstance;
var EmulatedDevicesList = class _EmulatedDevicesList extends Common.ObjectWrapper.ObjectWrapper {
  #standardSetting;
  #standard;
  #customSetting;
  #custom;
  constructor() {
    super();
    this.#standardSetting = Common.Settings.Settings.instance().createSetting("standard-emulated-device-list", []);
    this.#standard = /* @__PURE__ */ new Set();
    this.listFromJSONV1(this.#standardSetting.get(), this.#standard);
    this.updateStandardDevices();
    this.#customSetting = Common.Settings.Settings.instance().createSetting("custom-emulated-device-list", []);
    this.#custom = /* @__PURE__ */ new Set();
    if (!this.listFromJSONV1(this.#customSetting.get(), this.#custom)) {
      this.saveCustomDevices();
    }
  }
  static instance() {
    if (!emulatedDevicesListInstance) {
      emulatedDevicesListInstance = new _EmulatedDevicesList();
    }
    return emulatedDevicesListInstance;
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
    "type": "phone"
  },
  {
    "order": 12,
    "show-by-default": true,
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
    "type": "phone"
  },
  {
    "order": 14,
    "show-by-default": true,
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
    "type": "phone"
  },
  {
    "order": 15,
    "show-by-default": true,
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
    "type": "phone"
  },
  {
    "order": 16,
    "show-by-default": false,
    "title": "Pixel 3 XL",
    "screen": {
      "horizontal": {
        "width": 786,
        "height": 393
      },
      "device-pixel-ratio": 2.75,
      "vertical": {
        "width": 393,
        "height": 786
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 11; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "11", "architecture": "", "model": "Pixel 3", "mobile": true },
    "type": "phone"
  },
  {
    "order": 18,
    "show-by-default": true,
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
    "user-agent-metadata": { "platform": "Android", "platformVersion": "13", "architecture": "", "model": "Pixel 5", "mobile": true },
    "type": "phone"
  },
  {
    "order": 20,
    "show-by-default": true,
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
    "order": 24,
    "show-by-default": true,
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
    "order": 26,
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
    "type": "tablet"
  },
  {
    "order": 28,
    "show-by-default": true,
    "title": "iPad Air",
    "screen": {
      "horizontal": {
        "width": 1180,
        "height": 820
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 820,
        "height": 1180
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
    "type": "tablet"
  },
  {
    "order": 29,
    "show-by-default": true,
    "title": "iPad Pro",
    "screen": {
      "horizontal": {
        "width": 1366,
        "height": 1024
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 1024,
        "height": 1366
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
    "type": "tablet"
  },
  {
    "order": 30,
    "show-by-default": true,
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
    "order": 32,
    "show-by-default": true,
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
    "order": 34,
    "show-by-default": true,
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
    "order": 35,
    "show-by-default": true,
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
    "order": 36,
    "show-by-default": true,
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
    "type": "tablet",
    "modes": [{ "title": "default", "orientation": "horizontal" }]
  },
  {
    "order": 50,
    "show-by-default": true,
    "title": "Nest Hub",
    "screen": {
      "horizontal": {
        "outline": {
          "image": "@url(optimized/google-nest-hub-horizontal.avif)",
          "insets": { "left": 82, "top": 74, "right": 83, "bottom": 222 }
        },
        "width": 1024,
        "height": 600
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "width": 1024,
        "height": 600
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 CrKey/1.54.248666",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "", "architecture": "", "model": "", "mobile": false },
    "type": "tablet",
    "modes": [{ "title": "default", "orientation": "horizontal" }]
  },
  {
    "order": 129,
    "show-by-default": false,
    "title": "iPhone 4",
    "screen": {
      "horizontal": { "width": 480, "height": 320 },
      "device-pixel-ratio": 2,
      "vertical": { "width": 320, "height": 480 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53",
    "type": "phone"
  },
  {
    "order": 130,
    "show-by-default": false,
    "title": "iPhone 5/SE",
    "screen": {
      "horizontal": {
        "outline": {
          "image": "@url(optimized/iPhone5-landscape.avif)",
          "insets": { "left": 115, "top": 25, "right": 115, "bottom": 28 }
        },
        "width": 568,
        "height": 320
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "outline": {
          "image": "@url(optimized/iPhone5-portrait.avif)",
          "insets": { "left": 29, "top": 105, "right": 25, "bottom": 111 }
        },
        "width": 320,
        "height": 568
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1",
    "type": "phone"
  },
  {
    "order": 131,
    "show-by-default": false,
    "title": "iPhone 6/7/8",
    "screen": {
      "horizontal": {
        "outline": {
          "image": "@url(optimized/iPhone6-landscape.avif)",
          "insets": { "left": 106, "top": 28, "right": 106, "bottom": 28 }
        },
        "width": 667,
        "height": 375
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "outline": {
          "image": "@url(optimized/iPhone6-portrait.avif)",
          "insets": { "left": 28, "top": 105, "right": 28, "bottom": 105 }
        },
        "width": 375,
        "height": 667
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
    "type": "phone"
  },
  {
    "order": 132,
    "show-by-default": false,
    "title": "iPhone 6/7/8 Plus",
    "screen": {
      "horizontal": {
        "outline": {
          "image": "@url(optimized/iPhone6Plus-landscape.avif)",
          "insets": { "left": 109, "top": 29, "right": 109, "bottom": 27 }
        },
        "width": 736,
        "height": 414
      },
      "device-pixel-ratio": 3,
      "vertical": {
        "outline": {
          "image": "@url(optimized/iPhone6Plus-portrait.avif)",
          "insets": { "left": 26, "top": 107, "right": 30, "bottom": 111 }
        },
        "width": 414,
        "height": 736
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
    "type": "phone"
  },
  {
    "order": 133,
    "show-by-default": false,
    "title": "iPhone X",
    "screen": {
      "horizontal": { "width": 812, "height": 375 },
      "device-pixel-ratio": 3,
      "vertical": { "width": 375, "height": 812 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "BlackBerry Z30",
    "screen": {
      "horizontal": { "width": 640, "height": 360 },
      "device-pixel-ratio": 2,
      "vertical": { "width": 360, "height": 640 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+",
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Nexus 4",
    "screen": {
      "horizontal": { "width": 640, "height": 384 },
      "device-pixel-ratio": 2,
      "vertical": { "width": 384, "height": 640 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "4.4.2", "architecture": "", "model": "Nexus 4", "mobile": true },
    "type": "phone"
  },
  {
    "title": "Nexus 5",
    "type": "phone",
    "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "6.0", "architecture": "", "model": "Nexus 5", "mobile": true },
    "capabilities": ["touch", "mobile"],
    "show-by-default": false,
    "screen": {
      "device-pixel-ratio": 3,
      "vertical": { "width": 360, "height": 640 },
      "horizontal": { "width": 640, "height": 360 }
    },
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 25, "right": 0, "bottom": 48 },
        "image": "@url(optimized/google-nexus-5-vertical-default-1x.avif) 1x, @url(optimized/google-nexus-5-vertical-default-2x.avif) 2x"
      },
      {
        "title": "navigation bar",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 80, "right": 0, "bottom": 48 },
        "image": "@url(optimized/google-nexus-5-vertical-navigation-1x.avif) 1x, @url(optimized/google-nexus-5-vertical-navigation-2x.avif) 2x"
      },
      {
        "title": "keyboard",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 80, "right": 0, "bottom": 312 },
        "image": "@url(optimized/google-nexus-5-vertical-keyboard-1x.avif) 1x, @url(optimized/google-nexus-5-vertical-keyboard-2x.avif) 2x"
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 25, "right": 42, "bottom": 0 },
        "image": "@url(optimized/google-nexus-5-horizontal-default-1x.avif) 1x, @url(optimized/google-nexus-5-horizontal-default-2x.avif) 2x"
      },
      {
        "title": "navigation bar",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 80, "right": 42, "bottom": 0 },
        "image": "@url(optimized/google-nexus-5-horizontal-navigation-1x.avif) 1x, @url(optimized/google-nexus-5-horizontal-navigation-2x.avif) 2x"
      },
      {
        "title": "keyboard",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 80, "right": 42, "bottom": 202 },
        "image": "@url(optimized/google-nexus-5-horizontal-keyboard-1x.avif) 1x, @url(optimized/google-nexus-5-horizontal-keyboard-2x.avif) 2x"
      }
    ]
  },
  {
    "title": "Nexus 5X",
    "type": "phone",
    "user-agent": "Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "8.0.0", "architecture": "", "model": "Nexus 5X", "mobile": true },
    "capabilities": ["touch", "mobile"],
    "show-by-default": false,
    "screen": {
      "device-pixel-ratio": 2.625,
      "vertical": {
        "outline": {
          "image": "@url(optimized/Nexus5X-portrait.avif)",
          "insets": { "left": 18, "top": 88, "right": 22, "bottom": 98 }
        },
        "width": 412,
        "height": 732
      },
      "horizontal": {
        "outline": {
          "image": "@url(optimized/Nexus5X-landscape.avif)",
          "insets": { "left": 88, "top": 21, "right": 98, "bottom": 19 }
        },
        "width": 732,
        "height": 412
      }
    },
    "modes": [
      {
        "title": "default",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 24, "right": 0, "bottom": 48 },
        "image": "@url(optimized/google-nexus-5x-vertical-default-1x.avif) 1x, @url(optimized/google-nexus-5x-vertical-default-2x.avif) 2x"
      },
      {
        "title": "navigation bar",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 80, "right": 0, "bottom": 48 },
        "image": "@url(optimized/google-nexus-5x-vertical-navigation-1x.avif) 1x, @url(optimized/google-nexus-5x-vertical-navigation-2x.avif) 2x"
      },
      {
        "title": "keyboard",
        "orientation": "vertical",
        "insets": { "left": 0, "top": 80, "right": 0, "bottom": 342 },
        "image": "@url(optimized/google-nexus-5x-vertical-keyboard-1x.avif) 1x, @url(optimized/google-nexus-5x-vertical-keyboard-2x.avif) 2x"
      },
      {
        "title": "default",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 24, "right": 48, "bottom": 0 },
        "image": "@url(optimized/google-nexus-5x-horizontal-default-1x.avif) 1x, @url(optimized/google-nexus-5x-horizontal-default-2x.avif) 2x"
      },
      {
        "title": "navigation bar",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 80, "right": 48, "bottom": 0 },
        "image": "@url(optimized/google-nexus-5x-horizontal-navigation-1x.avif) 1x, @url(optimized/google-nexus-5x-horizontal-navigation-2x.avif) 2x"
      },
      {
        "title": "keyboard",
        "orientation": "horizontal",
        "insets": { "left": 0, "top": 80, "right": 48, "bottom": 222 },
        "image": "@url(optimized/google-nexus-5x-horizontal-keyboard-1x.avif) 1x, @url(optimized/google-nexus-5x-horizontal-keyboard-2x.avif) 2x"
      }
    ]
  },
  {
    "show-by-default": false,
    "title": "Nexus 6",
    "screen": {
      "horizontal": { "width": 732, "height": 412 },
      "device-pixel-ratio": 3.5,
      "vertical": { "width": 412, "height": 732 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6 Build/N6F26U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "7.1.1", "architecture": "", "model": "Nexus 6", "mobile": true },
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Nexus 6P",
    "screen": {
      "horizontal": {
        "outline": {
          "image": "@url(optimized/Nexus6P-landscape.avif)",
          "insets": { "left": 94, "top": 17, "right": 88, "bottom": 17 }
        },
        "width": 732,
        "height": 412
      },
      "device-pixel-ratio": 3.5,
      "vertical": {
        "outline": {
          "image": "@url(optimized/Nexus6P-portrait.avif)",
          "insets": { "left": 16, "top": 94, "right": 16, "bottom": 88 }
        },
        "width": 412,
        "height": 732
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 8.0.0; Nexus 6P Build/OPP3.170518.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "8.0.0", "architecture": "", "model": "Nexus 6P", "mobile": true },
    "type": "phone"
  },
  {
    "order": 120,
    "show-by-default": false,
    "title": "Pixel 2",
    "screen": {
      "horizontal": { "width": 731, "height": 411 },
      "device-pixel-ratio": 2.625,
      "vertical": { "width": 411, "height": 731 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "8.0", "architecture": "", "model": "Pixel 2", "mobile": true },
    "type": "phone"
  },
  {
    "order": 121,
    "show-by-default": false,
    "title": "Pixel 2 XL",
    "screen": {
      "horizontal": { "width": 823, "height": 411 },
      "device-pixel-ratio": 3.5,
      "vertical": { "width": 411, "height": 823 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "8.0.0", "architecture": "", "model": "Pixel 2 XL", "mobile": true },
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Pixel 3",
    "screen": {
      "horizontal": { "width": 786, "height": 393 },
      "device-pixel-ratio": 2.75,
      "vertical": { "width": 393, "height": 786 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PQ1A.181105.017.A1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "9", "architecture": "", "model": "Pixel 3", "mobile": true },
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Pixel 4",
    "screen": {
      "horizontal": { "width": 745, "height": 353 },
      "device-pixel-ratio": 3,
      "vertical": { "width": 353, "height": 745 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "10", "architecture": "", "model": "Pixel 4", "mobile": true },
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "LG Optimus L70",
    "screen": {
      "horizontal": { "width": 640, "height": 384 },
      "device-pixel-ratio": 1.25,
      "vertical": { "width": 384, "height": 640 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; U; Android 4.4.2; en-us; LGMS323 Build/KOT49I.MS32310c) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "4.4.2", "architecture": "", "model": "LGMS323", "mobile": true },
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Nokia N9",
    "screen": {
      "horizontal": { "width": 854, "height": 480 },
      "device-pixel-ratio": 1,
      "vertical": { "width": 480, "height": 854 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13",
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Nokia Lumia 520",
    "screen": {
      "horizontal": { "width": 533, "height": 320 },
      "device-pixel-ratio": 1.5,
      "vertical": { "width": 320, "height": 533 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 520)",
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Microsoft Lumia 550",
    "screen": {
      "horizontal": { "width": 640, "height": 360 },
      "device-pixel-ratio": 2,
      "vertical": { "width": 640, "height": 360 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 550) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36 Edge/14.14263",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "4.2.1", "architecture": "", "model": "Lumia 550", "mobile": true },
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Microsoft Lumia 950",
    "screen": {
      "horizontal": { "width": 640, "height": 360 },
      "device-pixel-ratio": 4,
      "vertical": { "width": 360, "height": 640 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36 Edge/14.14263",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "4.2.1", "architecture": "", "model": "Lumia 950", "mobile": true },
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Galaxy S III",
    "screen": {
      "horizontal": { "width": 640, "height": 360 },
      "device-pixel-ratio": 2,
      "vertical": { "width": 360, "height": 640 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; U; Android 4.0; en-us; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "4.0", "architecture": "", "model": "GT-I9300", "mobile": true },
    "type": "phone"
  },
  {
    "order": 110,
    "show-by-default": false,
    "title": "Galaxy S5",
    "screen": {
      "horizontal": { "width": 640, "height": 360 },
      "device-pixel-ratio": 3,
      "vertical": { "width": 360, "height": 640 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "5.0", "architecture": "", "model": "SM-G900P", "mobile": true },
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Galaxy S8",
    "screen": {
      "horizontal": { "width": 740, "height": 360 },
      "device-pixel-ratio": 3,
      "vertical": { "width": 360, "height": 740 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 7.0; SM-G950U Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "7.0", "architecture": "", "model": "SM-G950U", "mobile": true },
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Galaxy S9+",
    "screen": {
      "horizontal": { "width": 658, "height": 320 },
      "device-pixel-ratio": 4.5,
      "vertical": { "width": 320, "height": 658 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 8.0.0; SM-G965U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "8.0.0", "architecture": "", "model": "SM-G965U", "mobile": true },
    "type": "phone"
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
    "title": "Kindle Fire HDX",
    "screen": {
      "horizontal": { "width": 1280, "height": 800 },
      "device-pixel-ratio": 2,
      "vertical": { "width": 800, "height": 1280 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; U; en-us; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true",
    "type": "tablet"
  },
  {
    "order": 140,
    "show-by-default": false,
    "title": "iPad",
    "screen": {
      "horizontal": {
        "outline": {
          "image": "@url(optimized/iPad-landscape.avif)",
          "insets": { "left": 112, "top": 56, "right": 116, "bottom": 52 }
        },
        "width": 1024,
        "height": 768
      },
      "device-pixel-ratio": 2,
      "vertical": {
        "outline": {
          "image": "@url(optimized/iPad-portrait.avif)",
          "insets": { "left": 52, "top": 114, "right": 55, "bottom": 114 }
        },
        "width": 768,
        "height": 1024
      }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1",
    "type": "tablet"
  },
  {
    "order": 141,
    "show-by-default": false,
    "title": "iPad Pro",
    "screen": {
      "horizontal": { "width": 1366, "height": 1024 },
      "device-pixel-ratio": 2,
      "vertical": { "width": 1024, "height": 1366 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1",
    "type": "tablet"
  },
  {
    "show-by-default": false,
    "title": "Blackberry PlayBook",
    "screen": {
      "horizontal": { "width": 1024, "height": 600 },
      "device-pixel-ratio": 1,
      "vertical": { "width": 600, "height": 1024 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/7.2.1.0 Safari/536.2+",
    "type": "tablet"
  },
  {
    "show-by-default": false,
    "title": "Nexus 10",
    "screen": {
      "horizontal": { "width": 1280, "height": 800 },
      "device-pixel-ratio": 2,
      "vertical": { "width": 800, "height": 1280 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 10 Build/MOB31T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "6.0.1", "architecture": "", "model": "Nexus 10", "mobile": false },
    "type": "tablet"
  },
  {
    "show-by-default": false,
    "title": "Nexus 7",
    "screen": {
      "horizontal": { "width": 960, "height": 600 },
      "device-pixel-ratio": 2,
      "vertical": { "width": 600, "height": 960 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "6.0.1", "architecture": "", "model": "Nexus 7", "mobile": false },
    "type": "tablet"
  },
  {
    "show-by-default": false,
    "title": "Galaxy Note 3",
    "screen": {
      "horizontal": { "width": 640, "height": 360 },
      "device-pixel-ratio": 3,
      "vertical": { "width": 360, "height": 640 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-N900T Build/JSS15J) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "4.3", "architecture": "", "model": "SM-N900T", "mobile": true },
    "type": "phone"
  },
  {
    "show-by-default": false,
    "title": "Galaxy Note II",
    "screen": {
      "horizontal": { "width": 640, "height": 360 },
      "device-pixel-ratio": 2,
      "vertical": { "width": 360, "height": 640 }
    },
    "capabilities": ["touch", "mobile"],
    "user-agent": "Mozilla/5.0 (Linux; U; Android 4.1; en-us; GT-N7100 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
    "user-agent-metadata": { "platform": "Android", "platformVersion": "4.1", "architecture": "", "model": "GT-N7100", "mobile": true },
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
   * @description Error message shown in the Devices settings pane when the user enters an empty
   * width for a custom device.
   */
  widthCannotBeEmpty: "Width cannot be empty.",
  /**
   * @description Error message shown in the Devices settings pane when the user enters an invalid
   * width for a custom device.
   */
  widthMustBeANumber: "Width must be a number.",
  /**
   * @description Error message shown in the Devices settings pane when the user has entered a width
   * for a custom device that is too large.
   * @example {9999} PH1
   */
  widthMustBeLessThanOrEqualToS: "Width must be less than or equal to {PH1}.",
  /**
   * @description Error message shown in the Devices settings pane when the user has entered a width
   * for a custom device that is too small.
   * @example {50} PH1
   */
  widthMustBeGreaterThanOrEqualToS: "Width must be greater than or equal to {PH1}.",
  /**
   * @description Error message shown in the Devices settings pane when the user enters an empty
   * height for a custom device.
   */
  heightCannotBeEmpty: "Height cannot be empty.",
  /**
   * @description Error message shown in the Devices settings pane when the user enters an invalid
   * height for a custom device.
   */
  heightMustBeANumber: "Height must be a number.",
  /**
   * @description Error message shown in the Devices settings pane when the user has entered a height
   * for a custom device that is too large.
   * @example {9999} PH1
   */
  heightMustBeLessThanOrEqualToS: "Height must be less than or equal to {PH1}.",
  /**
   * @description Error message shown in the Devices settings pane when the user has entered a height
   * for a custom device that is too small.
   * @example {50} PH1
   */
  heightMustBeGreaterThanOrEqualTo: "Height must be greater than or equal to {PH1}.",
  /**
   * @description Error message shown in the Devices settings pane when the user enters an invalid
   * device pixel ratio for a custom device.
   */
  devicePixelRatioMustBeANumberOr: "Device pixel ratio must be a number or blank.",
  /**
   * @description Error message shown in the Devices settings pane when the user enters a device
   * pixel ratio for a custom device that is too large.
   * @example {10} PH1
   */
  devicePixelRatioMustBeLessThanOr: "Device pixel ratio must be less than or equal to {PH1}.",
  /**
   * @description Error message shown in the Devices settings pane when the user enters a device
   * pixel ratio for a custom device that is too small.
   * @example {0} PH1
   */
  devicePixelRatioMustBeGreater: "Device pixel ratio must be greater than or equal to {PH1}."
};
var str_2 = i18n3.i18n.registerUIStrings("models/emulation/DeviceModeModel.ts", UIStrings2);
var i18nString = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var deviceModeModelInstance;
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
  constructor() {
    super();
    this.#screenRect = new Rect(0, 0, 1, 1);
    this.#visiblePageRect = new Rect(0, 0, 1, 1);
    this.#availableSize = new Geometry.Size(1, 1);
    this.#preferredSize = new Geometry.Size(1, 1);
    this.#initialized = false;
    this.#appliedDeviceSize = new Geometry.Size(1, 1);
    this.#appliedDeviceScaleFactor = window.devicePixelRatio;
    this.#appliedUserAgentType = "Desktop";
    this.#scaleSetting = Common2.Settings.Settings.instance().createSetting("emulation.device-scale", 1);
    if (!this.#scaleSetting.get()) {
      this.#scaleSetting.set(1);
    }
    this.#scaleSetting.addChangeListener(this.scaleSettingChanged, this);
    this.#scale = 1;
    this.#widthSetting = Common2.Settings.Settings.instance().createSetting("emulation.device-width", 400);
    if (this.#widthSetting.get() < MinDeviceSize) {
      this.#widthSetting.set(MinDeviceSize);
    }
    if (this.#widthSetting.get() > MaxDeviceSize) {
      this.#widthSetting.set(MaxDeviceSize);
    }
    this.#widthSetting.addChangeListener(this.widthSettingChanged, this);
    this.#heightSetting = Common2.Settings.Settings.instance().createSetting("emulation.device-height", 0);
    if (this.#heightSetting.get() && this.#heightSetting.get() < MinDeviceSize) {
      this.#heightSetting.set(MinDeviceSize);
    }
    if (this.#heightSetting.get() > MaxDeviceSize) {
      this.#heightSetting.set(MaxDeviceSize);
    }
    this.#heightSetting.addChangeListener(this.heightSettingChanged, this);
    this.#uaSetting = Common2.Settings.Settings.instance().createSetting(
      "emulation.device-ua",
      "Mobile"
      /* UA.MOBILE */
    );
    this.#uaSetting.addChangeListener(this.uaSettingChanged, this);
    this.#deviceScaleFactorSetting = Common2.Settings.Settings.instance().createSetting("emulation.device-scale-factor", 0);
    this.#deviceScaleFactorSetting.addChangeListener(this.deviceScaleFactorSettingChanged, this);
    this.#deviceOutlineSetting = Common2.Settings.Settings.instance().moduleSetting("emulation.show-device-outline");
    this.#deviceOutlineSetting.addChangeListener(this.deviceOutlineSettingChanged, this);
    this.#toolbarControlsEnabledSetting = Common2.Settings.Settings.instance().createSetting(
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
    SDK2.TargetManager.TargetManager.instance().observeModels(SDK2.EmulationModel.EmulationModel, this);
  }
  static instance(opts) {
    if (!deviceModeModelInstance || opts?.forceNew) {
      deviceModeModelInstance = new _DeviceModeModel();
    }
    return deviceModeModelInstance;
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
  static widthValidator(value) {
    let valid = false;
    let errorMessage;
    if (!value) {
      errorMessage = i18nString(UIStrings2.widthCannotBeEmpty);
    } else if (!/^[\d]+$/.test(value)) {
      errorMessage = i18nString(UIStrings2.widthMustBeANumber);
    } else if (Number(value) > MaxDeviceSize) {
      errorMessage = i18nString(UIStrings2.widthMustBeLessThanOrEqualToS, { PH1: MaxDeviceSize });
    } else if (Number(value) < MinDeviceSize) {
      errorMessage = i18nString(UIStrings2.widthMustBeGreaterThanOrEqualToS, { PH1: MinDeviceSize });
    } else {
      valid = true;
    }
    return { valid, errorMessage };
  }
  static heightValidator(value) {
    let valid = false;
    let errorMessage;
    if (!value) {
      errorMessage = i18nString(UIStrings2.heightCannotBeEmpty);
    } else if (!/^[\d]+$/.test(value)) {
      errorMessage = i18nString(UIStrings2.heightMustBeANumber);
    } else if (Number(value) > MaxDeviceSize) {
      errorMessage = i18nString(UIStrings2.heightMustBeLessThanOrEqualToS, { PH1: MaxDeviceSize });
    } else if (Number(value) < MinDeviceSize) {
      errorMessage = i18nString(UIStrings2.heightMustBeGreaterThanOrEqualTo, { PH1: MinDeviceSize });
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
      errorMessage = i18nString(UIStrings2.devicePixelRatioMustBeANumberOr);
    } else if (Number(value) > MaxDeviceScaleFactor) {
      errorMessage = i18nString(UIStrings2.devicePixelRatioMustBeLessThanOr, { PH1: MaxDeviceScaleFactor });
    } else if (Number(value) < MinDeviceScaleFactor) {
      errorMessage = i18nString(UIStrings2.devicePixelRatioMustBeGreater, { PH1: MinDeviceScaleFactor });
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
    return Common2.Settings.Settings.instance().createSetting("emulation.show-device-mode", false);
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
    if (emulationModel.target() === SDK2.TargetManager.TargetManager.instance().primaryPageTarget() && emulationModel.supportsDeviceEmulation()) {
      this.#emulationModel = emulationModel;
      if (this.#onModelAvailable) {
        const callback = this.#onModelAvailable;
        this.#onModelAvailable = null;
        callback();
      }
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
      this.#emulationModel = null;
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
    this.showHingeIfApplicable(overlayModel);
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
      this.showHingeIfApplicable(overlayModel);
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
      this.applyUserAgent(mobile ? defaultMobileUserAgent : "", mobile ? defaultMobileUserAgentMetadata : null);
      this.applyTouch(
        this.#uaSetting.get() === "Desktop (touch)" || this.#uaSetting.get() === "Mobile",
        this.#uaSetting.get() === "Mobile"
        /* UA.MOBILE */
      );
    }
    if (overlayModel) {
      overlayModel.setShowViewportSizeOnResize(this.#type === Type2.None);
    }
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
    SDK2.NetworkManager.MultitargetNetworkManager.instance().setUserAgentOverride(userAgent, userAgentMetadata);
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
        dontSetVisibleSize: true,
        displayFeature: void 0,
        devicePosture: void 0,
        screenOrientation: void 0
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
  async captureScreenshot(fullSize, clip) {
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
    const screenshot = await screenCaptureModel.captureScreenshot("png", 100, screenshotMode, clip);
    const deviceMetrics = {
      width: 0,
      height: 0,
      deviceScaleFactor: 0,
      mobile: false
    };
    if (fullSize && this.#emulationModel) {
      if (this.#device && this.#mode) {
        const orientation = this.#device.orientationByName(this.#mode.orientation);
        deviceMetrics.width = orientation.width;
        deviceMetrics.height = orientation.height;
        const dispFeature = this.getDisplayFeature();
        if (dispFeature) {
          deviceMetrics.displayFeature = dispFeature;
        }
      } else {
        deviceMetrics.width = 0;
        deviceMetrics.height = 0;
      }
      await this.#emulationModel.emulateDevice(deviceMetrics);
    }
    this.calculateAndEmulate(false);
    return screenshot;
  }
  applyTouch(touchEnabled, mobile) {
    this.#touchEnabled = touchEnabled;
    this.#touchMobile = mobile;
    for (const emulationModel of SDK2.TargetManager.TargetManager.instance().models(SDK2.EmulationModel.EmulationModel)) {
      void emulationModel.emulateTouch(touchEnabled, mobile);
    }
  }
  showHingeIfApplicable(overlayModel) {
    const orientation = this.#device && this.#mode ? this.#device.orientationByName(this.#mode.orientation) : null;
    if (orientation?.hinge) {
      overlayModel.showHingeForDualScreen(orientation.hinge);
      return;
    }
    overlayModel.showHingeForDualScreen(null);
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
var mobileUserAgent = "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36";
var defaultMobileUserAgent = SDK2.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(mobileUserAgent);
var defaultMobileUserAgentMetadata = {
  platform: "Android",
  platformVersion: "6.0",
  architecture: "",
  model: "Nexus 5",
  mobile: true
};
var defaultMobileScaleFactor = 2;
export {
  DeviceModeModel_exports as DeviceModeModel,
  EmulatedDevices_exports as EmulatedDevices
};
//# sourceMappingURL=emulation.js.map
