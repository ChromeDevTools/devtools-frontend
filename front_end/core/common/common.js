var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/core/common/App.js
var App_exports = {};

// gen/front_end/core/common/AppProvider.js
var AppProvider_exports = {};
__export(AppProvider_exports, {
  getRegisteredAppProviders: () => getRegisteredAppProviders,
  registerAppProvider: () => registerAppProvider
});
import * as Root from "./../root/root.js";
var registeredAppProvider = [];
function registerAppProvider(registration) {
  registeredAppProvider.push(registration);
}
function getRegisteredAppProviders() {
  return registeredAppProvider.filter((provider) => Root.Runtime.Runtime.isDescriptorEnabled({ experiment: void 0, condition: provider.condition })).sort((firstProvider, secondProvider) => {
    const order1 = firstProvider.order || 0;
    const order2 = secondProvider.order || 0;
    return order1 - order2;
  });
}

// gen/front_end/core/common/Base64.js
var Base64_exports = {};
__export(Base64_exports, {
  BASE64_CHARS: () => BASE64_CHARS,
  BASE64_CODES: () => BASE64_CODES,
  decode: () => decode,
  encode: () => encode
});
var BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var BASE64_CODES = new Uint8Array(123);
for (let index = 0; index < BASE64_CHARS.length; ++index) {
  BASE64_CODES[BASE64_CHARS.charCodeAt(index)] = index;
}
function decode(input) {
  let bytesLength = input.length * 3 / 4 >>> 0;
  if (input.charCodeAt(input.length - 2) === 61) {
    bytesLength -= 2;
  } else if (input.charCodeAt(input.length - 1) === 61) {
    bytesLength -= 1;
  }
  const bytes = new Uint8Array(bytesLength);
  for (let index = 0, offset = 0; index < input.length; index += 4) {
    const a = BASE64_CODES[input.charCodeAt(index + 0)];
    const b = BASE64_CODES[input.charCodeAt(index + 1)];
    const c = BASE64_CODES[input.charCodeAt(index + 2)];
    const d = BASE64_CODES[input.charCodeAt(index + 3)];
    bytes[offset++] = a << 2 | b >> 4;
    bytes[offset++] = (b & 15) << 4 | c >> 2;
    bytes[offset++] = (c & 3) << 6 | d & 63;
  }
  return bytes;
}
function encode(input) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("failed to convert to base64"));
    reader.onload = () => {
      const blobAsUrl = reader.result;
      const [, base64] = blobAsUrl.split(",", 2);
      resolve(base64);
    };
    reader.readAsDataURL(new Blob([input]));
  });
}

// gen/front_end/core/common/CharacterIdMap.js
var CharacterIdMap_exports = {};
__export(CharacterIdMap_exports, {
  CharacterIdMap: () => CharacterIdMap
});
var CharacterIdMap = class {
  #elementToCharacter = /* @__PURE__ */ new Map();
  #characterToElement = /* @__PURE__ */ new Map();
  #charCode = 33;
  toChar(object) {
    let character = this.#elementToCharacter.get(object);
    if (!character) {
      if (this.#charCode >= 65535) {
        throw new Error("CharacterIdMap ran out of capacity!");
      }
      character = String.fromCharCode(this.#charCode++);
      this.#elementToCharacter.set(object, character);
      this.#characterToElement.set(character, object);
    }
    return character;
  }
  fromChar(character) {
    const object = this.#characterToElement.get(character);
    if (object === void 0) {
      return null;
    }
    return object;
  }
};

// gen/front_end/core/common/Color.js
var Color_exports = {};
__export(Color_exports, {
  ColorFunction: () => ColorFunction,
  ColorMixRegex: () => ColorMixRegex,
  Generator: () => Generator,
  HSL: () => HSL,
  HWB: () => HWB,
  IsolationModeHighlight: () => IsolationModeHighlight,
  LCH: () => LCH,
  Lab: () => Lab,
  Legacy: () => Legacy,
  Nickname: () => Nickname,
  Nicknames: () => Nicknames,
  Oklab: () => Oklab,
  Oklch: () => Oklch,
  PageHighlight: () => PageHighlight,
  Regex: () => Regex,
  ShortHex: () => ShortHex,
  SourceOrderHighlight: () => SourceOrderHighlight,
  approachColorValue: () => approachColorValue,
  desiredLuminance: () => desiredLuminance,
  findFgColorForContrast: () => findFgColorForContrast,
  findFgColorForContrastAPCA: () => findFgColorForContrastAPCA,
  getFormat: () => getFormat,
  hsl2rgb: () => hsl2rgb,
  hsva2rgba: () => hsva2rgba,
  parse: () => parse,
  parseHueNumeric: () => parseHueNumeric,
  rgb2hsv: () => rgb2hsv
});
import * as Platform from "./../platform/platform.js";

// gen/front_end/core/common/ColorConverter.js
var ColorConverter_exports = {};
__export(ColorConverter_exports, {
  ColorConverter: () => ColorConverter
});
var D50_X = 0.9642;
var D50_Y = 1;
var D50_Z = 0.8251;
var Vector3 = class {
  values = [0, 0, 0];
  constructor(values) {
    if (values) {
      this.values = values;
    }
  }
};
var Matrix3x3 = class {
  values = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  constructor(values) {
    if (values) {
      this.values = values;
    }
  }
  multiply(other) {
    const dst = new Vector3();
    for (let row = 0; row < 3; ++row) {
      dst.values[row] = this.values[row][0] * other.values[0] + this.values[row][1] * other.values[1] + this.values[row][2] * other.values[2];
    }
    return dst;
  }
};
var TransferFunction = class {
  g;
  a;
  b;
  c;
  d;
  e;
  f;
  constructor(g, a, b = 0, c = 0, d = 0, e = 0, f = 0) {
    this.g = g;
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
  }
  eval(val) {
    const sign = val < 0 ? -1 : 1;
    const abs = val * sign;
    if (abs < this.d) {
      return sign * (this.c * abs + this.f);
    }
    return sign * (Math.pow(this.a * abs + this.b, this.g) + this.e);
  }
};
var NAMED_TRANSFER_FN = {
  sRGB: new TransferFunction(2.4, 1 / 1.055, 0.055 / 1.055, 1 / 12.92, 0.04045, 0, 0),
  sRGB_INVERSE: new TransferFunction(0.416667, 1.13728, -0, 12.92, 31308e-7, -0.0549698, -0),
  proPhotoRGB: new TransferFunction(1.8, 1),
  proPhotoRGB_INVERSE: new TransferFunction(0.555556, 1, -0, 0, 0, 0, 0),
  k2Dot2: new TransferFunction(2.2, 1),
  k2Dot2_INVERSE: new TransferFunction(0.454545, 1),
  rec2020: new TransferFunction(2.22222, 0.909672, 0.0903276, 0.222222, 0.0812429, 0, 0),
  rec2020_INVERSE: new TransferFunction(0.45, 1.23439, -0, 4.5, 0.018054, -0.0993195, -0)
};
var NAMED_GAMUTS = {
  sRGB: new Matrix3x3([
    [0.436065674, 0.385147095, 0.143066406],
    [0.222488403, 0.716873169, 0.06060791],
    [0.013916016, 0.097076416, 0.714096069]
  ]),
  sRGB_INVERSE: new Matrix3x3([
    [3.134112151374599, -1.6173924597114966, -0.4906334036481285],
    [-0.9787872938826594, 1.9162795854799963, 0.0334547139520088],
    [0.07198304248352326, -0.2289858493321844, 1.4053851325241447]
  ]),
  displayP3: new Matrix3x3([
    [0.515102, 0.291965, 0.157153],
    [0.241182, 0.692236, 0.0665819],
    [-104941e-8, 0.0418818, 0.784378]
  ]),
  displayP3_INVERSE: new Matrix3x3([
    [2.404045155982687, -0.9898986932663839, -0.3976317191366333],
    [-0.8422283799266768, 1.7988505115115485, 0.016048170293157416],
    [0.04818705979712955, -0.09737385156228891, 1.2735066448052303]
  ]),
  adobeRGB: new Matrix3x3([
    [0.60974, 0.20528, 0.14919],
    [0.31111, 0.62567, 0.06322],
    [0.01947, 0.06087, 0.74457]
  ]),
  adobeRGB_INVERSE: new Matrix3x3([
    [1.9625385510109137, -0.6106892546501431, -0.3413827467482388],
    [-0.9787580455521, 1.9161624707082339, 0.03341676594241408],
    [0.028696263137883395, -0.1406807819331586, 1.349252109991369]
  ]),
  rec2020: new Matrix3x3([
    [0.673459, 0.165661, 0.1251],
    [0.279033, 0.675338, 0.0456288],
    [-193139e-8, 0.0299794, 0.797162]
  ]),
  rec2020_INVERSE: new Matrix3x3([
    [1.647275201661012, -0.3936024771460771, -0.23598028884792507],
    [-0.6826176165196962, 1.647617775014935, 0.01281626807852422],
    [0.029662725298529837, -0.06291668721366285, 1.2533964313435522]
  ]),
  xyz: new Matrix3x3([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ])
};
function degToRad(deg) {
  return deg * (Math.PI / 180);
}
function radToDeg(rad) {
  return rad * (180 / Math.PI);
}
function applyTransferFns(fn, r, g, b) {
  return [fn.eval(r), fn.eval(g), fn.eval(b)];
}
var OKLAB_TO_LMS_MATRIX = new Matrix3x3([
  [0.9999999984505198, 0.39633779217376786, 0.2158037580607588],
  [1.0000000088817609, -0.10556134232365635, -0.06385417477170591],
  [1.0000000546724108, -0.08948418209496575, -1.2914855378640917]
]);
var LMS_TO_OKLAB_MATRIX = new Matrix3x3([
  [0.2104542553, 0.7936177849999999, -0.0040720468],
  [1.9779984951000003, -2.4285922049999997, 0.4505937099000001],
  [0.025904037099999982, 0.7827717662, -0.8086757660000001]
]);
var XYZ_TO_LMS_MATRIX = new Matrix3x3([
  [0.8190224432164319, 0.3619062562801221, -0.12887378261216414],
  [0.0329836671980271, 0.9292868468965546, 0.03614466816999844],
  [0.048177199566046255, 0.26423952494422764, 0.6335478258136937]
]);
var LMS_TO_XYZ_MATRIX = new Matrix3x3([
  [1.226879873374156, -0.5578149965554814, 0.2813910501772159],
  [-0.040575762624313734, 1.1122868293970596, -0.07171106666151703],
  [-0.07637294974672144, -0.4214933239627915, 1.586924024427242]
]);
var PRO_PHOTO_TO_XYZD50_MATRIX = new Matrix3x3([
  [0.7976700747153241, 0.13519395152800417, 0.03135596341127167],
  [0.28803902352472205, 0.7118744007923554, 8661179538844252e-20],
  [2739876695467402e-22, -14405226518969991e-22, 0.825211112593861]
]);
var XYZD50_TO_PRO_PHOTO_MATRIX = new Matrix3x3([
  [1.3459533710138858, -0.25561367037652133, -0.051116041522131374],
  [-0.544600415668951, 1.5081687311475767, 0.020535163968720935],
  [-13975622054109725e-22, 2717590904589903e-21, 1.2118111696814942]
]);
var XYZD65_TO_XYZD50_MATRIX = new Matrix3x3([
  [1.0478573189120088, 0.022907374491829943, -0.050162247377152525],
  [0.029570500050499514, 0.9904755577034089, -0.017061518194840468],
  [-0.00924047197558879, 0.015052921526981566, 0.7519708530777581]
]);
var XYZD50_TO_XYZD65_MATRIX = new Matrix3x3([
  [0.9555366447632887, -0.02306009252137888, 0.06321844147263304],
  [-0.028315378228764922, 1.009951351591575, 0.021026001591792402],
  [0.012308773293784308, -0.02050053471777469, 1.3301947294775631]
]);
var ColorConverter = class _ColorConverter {
  static labToXyzd50(l, a, b) {
    let y = (l + 16) / 116;
    let x = y + a / 500;
    let z = y - b / 200;
    function labInverseTransferFunction(t) {
      const delta = 24 / 116;
      if (t <= delta) {
        return 108 / 841 * (t - 16 / 116);
      }
      return t * t * t;
    }
    x = labInverseTransferFunction(x) * D50_X;
    y = labInverseTransferFunction(y) * D50_Y;
    z = labInverseTransferFunction(z) * D50_Z;
    return [x, y, z];
  }
  static xyzd50ToLab(x, y, z) {
    function labTransferFunction(t) {
      const deltaLimit = 24 / 116 * (24 / 116) * (24 / 116);
      if (t <= deltaLimit) {
        return 841 / 108 * t + 16 / 116;
      }
      return Math.pow(t, 1 / 3);
    }
    x = labTransferFunction(x / D50_X);
    y = labTransferFunction(y / D50_Y);
    z = labTransferFunction(z / D50_Z);
    const l = 116 * y - 16;
    const a = 500 * (x - y);
    const b = 200 * (y - z);
    return [l, a, b];
  }
  static oklabToXyzd65(l, a, b) {
    const labInput = new Vector3([l, a, b]);
    const lmsIntermediate = OKLAB_TO_LMS_MATRIX.multiply(labInput);
    lmsIntermediate.values[0] = lmsIntermediate.values[0] * lmsIntermediate.values[0] * lmsIntermediate.values[0];
    lmsIntermediate.values[1] = lmsIntermediate.values[1] * lmsIntermediate.values[1] * lmsIntermediate.values[1];
    lmsIntermediate.values[2] = lmsIntermediate.values[2] * lmsIntermediate.values[2] * lmsIntermediate.values[2];
    const xyzOutput = LMS_TO_XYZ_MATRIX.multiply(lmsIntermediate);
    return xyzOutput.values;
  }
  static xyzd65ToOklab(x, y, z) {
    const xyzInput = new Vector3([x, y, z]);
    const lmsIntermediate = XYZ_TO_LMS_MATRIX.multiply(xyzInput);
    lmsIntermediate.values[0] = Math.pow(lmsIntermediate.values[0], 1 / 3);
    lmsIntermediate.values[1] = Math.pow(lmsIntermediate.values[1], 1 / 3);
    lmsIntermediate.values[2] = Math.pow(lmsIntermediate.values[2], 1 / 3);
    const labOutput = LMS_TO_OKLAB_MATRIX.multiply(lmsIntermediate);
    return [labOutput.values[0], labOutput.values[1], labOutput.values[2]];
  }
  static lchToLab(l, c, h) {
    if (h === void 0) {
      return [l, 0, 0];
    }
    return [l, c * Math.cos(degToRad(h)), c * Math.sin(degToRad(h))];
  }
  static labToLch(l, a, b) {
    return [l, Math.sqrt(a * a + b * b), radToDeg(Math.atan2(b, a))];
  }
  static displayP3ToXyzd50(r, g, b) {
    const [mappedR, mappedG, mappedB] = applyTransferFns(NAMED_TRANSFER_FN.sRGB, r, g, b);
    const rgbInput = new Vector3([mappedR, mappedG, mappedB]);
    const xyzOutput = NAMED_GAMUTS.displayP3.multiply(rgbInput);
    return xyzOutput.values;
  }
  static xyzd50ToDisplayP3(x, y, z) {
    const xyzInput = new Vector3([x, y, z]);
    const rgbOutput = NAMED_GAMUTS.displayP3_INVERSE.multiply(xyzInput);
    return applyTransferFns(NAMED_TRANSFER_FN.sRGB_INVERSE, rgbOutput.values[0], rgbOutput.values[1], rgbOutput.values[2]);
  }
  static proPhotoToXyzd50(r, g, b) {
    const [mappedR, mappedG, mappedB] = applyTransferFns(NAMED_TRANSFER_FN.proPhotoRGB, r, g, b);
    const rgbInput = new Vector3([mappedR, mappedG, mappedB]);
    const xyzOutput = PRO_PHOTO_TO_XYZD50_MATRIX.multiply(rgbInput);
    return xyzOutput.values;
  }
  static xyzd50ToProPhoto(x, y, z) {
    const xyzInput = new Vector3([x, y, z]);
    const rgbOutput = XYZD50_TO_PRO_PHOTO_MATRIX.multiply(xyzInput);
    return applyTransferFns(NAMED_TRANSFER_FN.proPhotoRGB_INVERSE, rgbOutput.values[0], rgbOutput.values[1], rgbOutput.values[2]);
  }
  static adobeRGBToXyzd50(r, g, b) {
    const [mappedR, mappedG, mappedB] = applyTransferFns(NAMED_TRANSFER_FN.k2Dot2, r, g, b);
    const rgbInput = new Vector3([mappedR, mappedG, mappedB]);
    const xyzOutput = NAMED_GAMUTS.adobeRGB.multiply(rgbInput);
    return xyzOutput.values;
  }
  static xyzd50ToAdobeRGB(x, y, z) {
    const xyzInput = new Vector3([x, y, z]);
    const rgbOutput = NAMED_GAMUTS.adobeRGB_INVERSE.multiply(xyzInput);
    return applyTransferFns(NAMED_TRANSFER_FN.k2Dot2_INVERSE, rgbOutput.values[0], rgbOutput.values[1], rgbOutput.values[2]);
  }
  static rec2020ToXyzd50(r, g, b) {
    const [mappedR, mappedG, mappedB] = applyTransferFns(NAMED_TRANSFER_FN.rec2020, r, g, b);
    const rgbInput = new Vector3([mappedR, mappedG, mappedB]);
    const xyzOutput = NAMED_GAMUTS.rec2020.multiply(rgbInput);
    return xyzOutput.values;
  }
  static xyzd50ToRec2020(x, y, z) {
    const xyzInput = new Vector3([x, y, z]);
    const rgbOutput = NAMED_GAMUTS.rec2020_INVERSE.multiply(xyzInput);
    return applyTransferFns(NAMED_TRANSFER_FN.rec2020_INVERSE, rgbOutput.values[0], rgbOutput.values[1], rgbOutput.values[2]);
  }
  static xyzd50ToD65(x, y, z) {
    const xyzInput = new Vector3([x, y, z]);
    const xyzOutput = XYZD50_TO_XYZD65_MATRIX.multiply(xyzInput);
    return xyzOutput.values;
  }
  static xyzd65ToD50(x, y, z) {
    const xyzInput = new Vector3([x, y, z]);
    const xyzOutput = XYZD65_TO_XYZD50_MATRIX.multiply(xyzInput);
    return xyzOutput.values;
  }
  static xyzd50TosRGBLinear(x, y, z) {
    const xyzInput = new Vector3([x, y, z]);
    const rgbResult = NAMED_GAMUTS.sRGB_INVERSE.multiply(xyzInput);
    return rgbResult.values;
  }
  static srgbLinearToXyzd50(r, g, b) {
    const rgbInput = new Vector3([r, g, b]);
    const xyzOutput = NAMED_GAMUTS.sRGB.multiply(rgbInput);
    return xyzOutput.values;
  }
  static srgbToXyzd50(r, g, b) {
    const [mappedR, mappedG, mappedB] = applyTransferFns(NAMED_TRANSFER_FN.sRGB, r, g, b);
    const rgbInput = new Vector3([mappedR, mappedG, mappedB]);
    const xyzOutput = NAMED_GAMUTS.sRGB.multiply(rgbInput);
    return xyzOutput.values;
  }
  static xyzd50ToSrgb(x, y, z) {
    const xyzInput = new Vector3([x, y, z]);
    const rgbOutput = NAMED_GAMUTS.sRGB_INVERSE.multiply(xyzInput);
    return applyTransferFns(NAMED_TRANSFER_FN.sRGB_INVERSE, rgbOutput.values[0], rgbOutput.values[1], rgbOutput.values[2]);
  }
  static oklchToXyzd50(lInput, c, h) {
    const [l, a, b] = _ColorConverter.lchToLab(lInput, c, h);
    const [x65, y65, z65] = _ColorConverter.oklabToXyzd65(l, a, b);
    return _ColorConverter.xyzd65ToD50(x65, y65, z65);
  }
  static xyzd50ToOklch(x, y, z) {
    const [x65, y65, z65] = _ColorConverter.xyzd50ToD65(x, y, z);
    const [l, a, b] = _ColorConverter.xyzd65ToOklab(x65, y65, z65);
    return _ColorConverter.labToLch(l, a, b);
  }
};

// gen/front_end/core/common/ColorUtils.js
var ColorUtils_exports = {};
__export(ColorUtils_exports, {
  blendColors: () => blendColors,
  contrastRatio: () => contrastRatio,
  contrastRatioAPCA: () => contrastRatioAPCA,
  contrastRatioByLuminanceAPCA: () => contrastRatioByLuminanceAPCA,
  desiredLuminanceAPCA: () => desiredLuminanceAPCA,
  getAPCAThreshold: () => getAPCAThreshold,
  getContrastThreshold: () => getContrastThreshold,
  isLargeFont: () => isLargeFont,
  luminance: () => luminance,
  luminanceAPCA: () => luminanceAPCA,
  rgbToHsl: () => rgbToHsl,
  rgbToHwb: () => rgbToHwb,
  rgbaToHsla: () => rgbaToHsla,
  rgbaToHwba: () => rgbaToHwba
});
function blendColors(fgRGBA, bgRGBA) {
  const alpha = fgRGBA[3];
  return [
    (1 - alpha) * bgRGBA[0] + alpha * fgRGBA[0],
    (1 - alpha) * bgRGBA[1] + alpha * fgRGBA[1],
    (1 - alpha) * bgRGBA[2] + alpha * fgRGBA[2],
    alpha + bgRGBA[3] * (1 - alpha)
  ];
}
function rgbToHue([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  let h;
  if (min === max) {
    h = 0;
  } else if (r === max) {
    h = (1 / 6 * (g - b) / diff + 1) % 1;
  } else if (g === max) {
    h = 1 / 6 * (b - r) / diff + 1 / 3;
  } else {
    h = 1 / 6 * (r - g) / diff + 2 / 3;
  }
  return h;
}
function rgbToHsl(rgb) {
  const [h, s, l] = rgbaToHsla([...rgb, void 0]);
  return [h, s, l];
}
function rgbaToHsla([r, g, b, a]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const sum = max + min;
  const h = rgbToHue([r, g, b]);
  const l = 0.5 * sum;
  let s;
  if (l === 0) {
    s = 0;
  } else if (l === 1) {
    s = 0;
  } else if (l <= 0.5) {
    s = diff / sum;
  } else {
    s = diff / (2 - sum);
  }
  return [h, s, l, a];
}
function rgbToHwb(rgb) {
  const [h, w, b] = rgbaToHwba([...rgb, void 0]);
  return [h, w, b];
}
function rgbaToHwba([r, g, b, a]) {
  const h = rgbToHue([r, g, b]);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return [h, min, 1 - max, a];
}
function luminance([rSRGB, gSRGB, bSRGB]) {
  const r = rSRGB <= 0.04045 ? rSRGB / 12.92 : Math.pow((rSRGB + 0.055) / 1.055, 2.4);
  const g = gSRGB <= 0.04045 ? gSRGB / 12.92 : Math.pow((gSRGB + 0.055) / 1.055, 2.4);
  const b = bSRGB <= 0.04045 ? bSRGB / 12.92 : Math.pow((bSRGB + 0.055) / 1.055, 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(fgRGBA, bgRGBA) {
  const blendedFg = blendColors(fgRGBA, bgRGBA);
  const fgLuminance = luminance(blendedFg);
  const bgLuminance = luminance(bgRGBA);
  const contrastRatio2 = (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);
  return contrastRatio2;
}
var mainTRC = 2.4;
var normBgExp = 0.56;
var normFgExp = 0.57;
var revBgExp = 0.65;
var revFgExp = 0.62;
var blkThrs = 0.022;
var blkClmp = 1.414;
var scaleBoW = 1.14;
var scaleWoB = 1.14;
var loConOffset = 0.027;
var loClip = 0.1;
var deltaLuminanceMin = 5e-4;
function luminanceAPCA([rSRGB, gSRGB, bSRGB]) {
  const r = Math.pow(rSRGB, mainTRC);
  const g = Math.pow(gSRGB, mainTRC);
  const b = Math.pow(bSRGB, mainTRC);
  return 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
}
function contrastRatioAPCA(fgRGBA, bgRGBA) {
  const blendedFg = blendColors(fgRGBA, bgRGBA);
  return contrastRatioByLuminanceAPCA(luminanceAPCA(blendedFg), luminanceAPCA(bgRGBA));
}
function clampLuminance(value) {
  return value > blkThrs ? value : value + Math.pow(blkThrs - value, blkClmp);
}
function contrastRatioByLuminanceAPCA(fgLuminance, bgLuminance) {
  fgLuminance = clampLuminance(fgLuminance);
  bgLuminance = clampLuminance(bgLuminance);
  if (Math.abs(fgLuminance - bgLuminance) < deltaLuminanceMin) {
    return 0;
  }
  let result = 0;
  if (bgLuminance > fgLuminance) {
    result = (Math.pow(bgLuminance, normBgExp) - Math.pow(fgLuminance, normFgExp)) * scaleBoW;
    result = result < loClip ? 0 : result - loConOffset;
  } else {
    result = (Math.pow(bgLuminance, revBgExp) - Math.pow(fgLuminance, revFgExp)) * scaleWoB;
    result = result > -loClip ? 0 : result + loConOffset;
  }
  return result * 100;
}
function desiredLuminanceAPCA(luminance2, contrast, lighter) {
  luminance2 = clampLuminance(luminance2);
  contrast /= 100;
  function computeLuminance() {
    if (!lighter) {
      return Math.pow(Math.abs(Math.pow(luminance2, normBgExp) - (contrast + loConOffset) / scaleBoW), 1 / normFgExp);
    }
    return Math.pow(Math.abs(Math.pow(luminance2, revBgExp) - (-contrast - loConOffset) / scaleWoB), 1 / revFgExp);
  }
  let desiredLuminance2 = computeLuminance();
  if (desiredLuminance2 < 0 || desiredLuminance2 > 1) {
    lighter = !lighter;
    desiredLuminance2 = computeLuminance();
  }
  return desiredLuminance2;
}
var contrastAPCALookupTable = [
  // See https://github.com/Myndex/SAPC-APCA
  // font size in px | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 weights
  [12, -1, -1, -1, -1, 100, 90, 80, -1, -1],
  [14, -1, -1, -1, 100, 90, 80, 60, 60, -1],
  [16, -1, -1, 100, 90, 80, 60, 55, 50, 50],
  [18, -1, -1, 90, 80, 60, 55, 50, 40, 40],
  [24, -1, 100, 80, 60, 55, 50, 40, 38, 35],
  [30, -1, 90, 70, 55, 50, 40, 38, 35, 40],
  [36, -1, 80, 60, 50, 40, 38, 35, 30, 25],
  [48, 100, 70, 55, 40, 38, 35, 30, 25, 20],
  [60, 90, 60, 50, 38, 35, 30, 25, 20, 20],
  [72, 80, 55, 40, 35, 30, 25, 20, 20, 20],
  [96, 70, 50, 35, 30, 25, 20, 20, 20, 20],
  [120, 60, 40, 30, 25, 20, 20, 20, 20, 20]
];
contrastAPCALookupTable.reverse();
function getAPCAThreshold(fontSize, fontWeight) {
  const size = parseFloat(fontSize.replace("px", ""));
  const weight = parseFloat(fontWeight);
  for (const [rowSize, ...rowWeights] of contrastAPCALookupTable) {
    if (size >= rowSize) {
      for (const [idx, keywordWeight] of [900, 800, 700, 600, 500, 400, 300, 200, 100].entries()) {
        if (weight >= keywordWeight) {
          const threshold = rowWeights[rowWeights.length - 1 - idx];
          return threshold === -1 ? null : threshold;
        }
      }
    }
  }
  return null;
}
function isLargeFont(fontSize, fontWeight) {
  const boldWeights = ["bold", "bolder"];
  const fontSizePx = parseFloat(fontSize.replace("px", ""));
  const isBold = isNaN(Number(fontWeight)) ? boldWeights.includes(fontWeight) : Number(fontWeight) >= 600;
  const fontSizePt = fontSizePx * 72 / 96;
  if (isBold) {
    return fontSizePt >= 14;
  }
  return fontSizePt >= 18;
}
var contrastThresholds = {
  largeFont: { aa: 3, aaa: 4.5 },
  normalFont: { aa: 4.5, aaa: 7 }
};
function getContrastThreshold(fontSize, fontWeight) {
  if (isLargeFont(fontSize, fontWeight)) {
    return contrastThresholds.largeFont;
  }
  return contrastThresholds.normalFont;
}

// gen/front_end/core/common/Color.js
function normalizeHue(hue) {
  return (hue % 360 + 360) % 360;
}
function parseAngle(angleText) {
  const angle = angleText.replace(/(deg|g?rad|turn)$/, "");
  if (isNaN(angle) || angleText.match(/\s+(deg|g?rad|turn)/)) {
    return null;
  }
  const number = parseFloat(angle);
  if (angleText.includes("turn")) {
    return number * 360;
  }
  if (angleText.includes("grad")) {
    return number * 9 / 10;
  }
  if (angleText.includes("rad")) {
    return number * 180 / Math.PI;
  }
  return number;
}
function getFormat(formatText) {
  switch (formatText) {
    case "hex":
      return "hex";
    case "hexa":
      return "hexa";
    case "rgb":
      return "rgb";
    case "rgba":
      return "rgba";
    case "hsl":
      return "hsl";
    case "hsla":
      return "hsla";
    case "hwb":
      return "hwb";
    case "hwba":
      return "hwba";
    case "lch":
      return "lch";
    case "oklch":
      return "oklch";
    case "lab":
      return "lab";
    case "oklab":
      return "oklab";
  }
  return getColorSpace(formatText);
}
function getColorSpace(colorSpaceText) {
  switch (colorSpaceText) {
    case "srgb":
      return "srgb";
    case "srgb-linear":
      return "srgb-linear";
    case "display-p3":
      return "display-p3";
    case "a98-rgb":
      return "a98-rgb";
    case "prophoto-rgb":
      return "prophoto-rgb";
    case "rec2020":
      return "rec2020";
    case "xyz":
      return "xyz";
    case "xyz-d50":
      return "xyz-d50";
    case "xyz-d65":
      return "xyz-d65";
  }
  return null;
}
function mapPercentToRange(percent, range) {
  const sign = Math.sign(percent);
  const absPercent = Math.abs(percent);
  const [outMin, outMax] = range;
  return sign * (absPercent * (outMax - outMin) / 100 + outMin);
}
function parse(text) {
  if (!text.match(/\s/)) {
    const match2 = text.toLowerCase().match(/^(?:#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(\w+))$/i);
    if (match2) {
      if (match2[1]) {
        return Legacy.fromHex(match2[1], text);
      }
      if (match2[2]) {
        return Nickname.fromName(match2[2], text);
      }
      return null;
    }
  }
  const match = text.toLowerCase().match(/^\s*(?:(rgba?)|(hsla?)|(hwba?)|(lch)|(oklch)|(lab)|(oklab)|(color))\((.*)\)\s*$/);
  if (match) {
    const isRgbaMatch = Boolean(match[1]);
    const isHslaMatch = Boolean(match[2]);
    const isHwbaMatch = Boolean(match[3]);
    const isLchMatch = Boolean(match[4]);
    const isOklchMatch = Boolean(match[5]);
    const isLabMatch = Boolean(match[6]);
    const isOklabMatch = Boolean(match[7]);
    const isColorMatch = Boolean(match[8]);
    const valuesText = match[9];
    if (isColorMatch) {
      return ColorFunction.fromSpec(text, valuesText);
    }
    const isOldSyntax = isRgbaMatch || isHslaMatch || isHwbaMatch;
    const allowCommas = isRgbaMatch || isHslaMatch;
    const convertNoneToZero = !isOldSyntax;
    const values = splitColorFunctionParameters(valuesText, { allowCommas, convertNoneToZero });
    if (!values) {
      return null;
    }
    const spec = [values[0], values[1], values[2], values[3]];
    if (isRgbaMatch) {
      return Legacy.fromRGBAFunction(values[0], values[1], values[2], values[3], text);
    }
    if (isHslaMatch) {
      return HSL.fromSpec(spec, text);
    }
    if (isHwbaMatch) {
      return HWB.fromSpec(spec, text);
    }
    if (isLchMatch) {
      return LCH.fromSpec(spec, text);
    }
    if (isOklchMatch) {
      return Oklch.fromSpec(spec, text);
    }
    if (isLabMatch) {
      return Lab.fromSpec(spec, text);
    }
    if (isOklabMatch) {
      return Oklab.fromSpec(spec, text);
    }
  }
  return null;
}
function splitColorFunctionParameters(content, { allowCommas, convertNoneToZero }) {
  const components = content.trim();
  let values = [];
  if (allowCommas) {
    values = components.split(/\s*,\s*/);
  }
  if (!allowCommas || values.length === 1) {
    values = components.split(/\s+/);
    if (values[3] === "/") {
      values.splice(3, 1);
      if (values.length !== 4) {
        return null;
      }
    } else if (values.length > 2 && values[2].indexOf("/") !== -1 || values.length > 3 && values[3].indexOf("/") !== -1) {
      const alpha = values.slice(2, 4).join("");
      values = values.slice(0, 2).concat(alpha.split(/\//)).concat(values.slice(4));
    } else if (values.length >= 4) {
      return null;
    }
  }
  if (values.length !== 3 && values.length !== 4 || values.indexOf("") > -1) {
    return null;
  }
  if (convertNoneToZero) {
    return values.map((value) => value === "none" ? "0" : value);
  }
  return values;
}
function clamp(value, { min, max }) {
  if (value === null) {
    return value;
  }
  if (min !== void 0) {
    value = Math.max(value, min);
  }
  if (max !== void 0) {
    value = Math.min(value, max);
  }
  return value;
}
function parsePercentage(value, range) {
  if (!value.endsWith("%")) {
    return null;
  }
  const percentage = parseFloat(value.substr(0, value.length - 1));
  return isNaN(percentage) ? null : mapPercentToRange(percentage, range);
}
function parseNumber(value) {
  const number = parseFloat(value);
  return isNaN(number) ? null : number;
}
function parseAlpha(value) {
  if (value === void 0) {
    return null;
  }
  return clamp(parsePercentage(value, [0, 1]) ?? parseNumber(value), { min: 0, max: 1 });
}
function parsePercentOrNumber(value, range = [0, 1]) {
  if (isNaN(value.replace("%", ""))) {
    return null;
  }
  const parsed = parseFloat(value);
  if (value.indexOf("%") !== -1) {
    if (value.indexOf("%") !== value.length - 1) {
      return null;
    }
    return mapPercentToRange(parsed, range);
  }
  return parsed;
}
function parseRgbNumeric(value) {
  const parsed = parsePercentOrNumber(value);
  if (parsed === null) {
    return null;
  }
  if (value.indexOf("%") !== -1) {
    return parsed;
  }
  return parsed / 255;
}
function parseHueNumeric(value) {
  const angle = value.replace(/(deg|g?rad|turn)$/, "");
  if (isNaN(angle) || value.match(/\s+(deg|g?rad|turn)/)) {
    return null;
  }
  const number = parseFloat(angle);
  if (value.indexOf("turn") !== -1) {
    return number % 1;
  }
  if (value.indexOf("grad") !== -1) {
    return number / 400 % 1;
  }
  if (value.indexOf("rad") !== -1) {
    return number / (2 * Math.PI) % 1;
  }
  return number / 360 % 1;
}
function parseSatLightNumeric(value) {
  if (value.indexOf("%") !== value.length - 1 || isNaN(value.replace("%", ""))) {
    return null;
  }
  const parsed = parseFloat(value);
  return parsed / 100;
}
function parseAlphaNumeric(value) {
  return parsePercentOrNumber(value);
}
function hsva2hsla(hsva) {
  const h = hsva[0];
  let s = hsva[1];
  const v = hsva[2];
  const t = (2 - s) * v;
  if (v === 0 || s === 0) {
    s = 0;
  } else {
    s *= v / (t < 1 ? t : 2 - t);
  }
  return [h, s, t / 2, hsva[3]];
}
function hsl2rgb(hsl) {
  const h = hsl[0];
  let s = hsl[1];
  const l = hsl[2];
  function hue2rgb(p2, q2, h2) {
    if (h2 < 0) {
      h2 += 1;
    } else if (h2 > 1) {
      h2 -= 1;
    }
    if (h2 * 6 < 1) {
      return p2 + (q2 - p2) * h2 * 6;
    }
    if (h2 * 2 < 1) {
      return q2;
    }
    if (h2 * 3 < 2) {
      return p2 + (q2 - p2) * (2 / 3 - h2) * 6;
    }
    return p2;
  }
  if (s < 0) {
    s = 0;
  }
  let q;
  if (l <= 0.5) {
    q = l * (1 + s);
  } else {
    q = l + s - l * s;
  }
  const p = 2 * l - q;
  const tr = h + 1 / 3;
  const tg = h;
  const tb = h - 1 / 3;
  return [hue2rgb(p, q, tr), hue2rgb(p, q, tg), hue2rgb(p, q, tb), hsl[3]];
}
function hwb2rgb(hwb) {
  const h = hwb[0];
  const w = hwb[1];
  const b = hwb[2];
  const whiteRatio = w / (w + b);
  let result = [whiteRatio, whiteRatio, whiteRatio, hwb[3]];
  if (w + b < 1) {
    result = hsl2rgb([h, 1, 0.5, hwb[3]]);
    for (let i = 0; i < 3; ++i) {
      result[i] += w - (w + b) * result[i];
    }
  }
  return result;
}
function hsva2rgba(hsva) {
  return hsl2rgb(hsva2hsla(hsva));
}
function rgb2hsv(rgba) {
  const hsla = rgbToHsl(rgba);
  const h = hsla[0];
  let s = hsla[1];
  const l = hsla[2];
  s *= l < 0.5 ? l : 1 - l;
  return [h, s !== 0 ? 2 * s / (l + s) : 0, l + s];
}
function desiredLuminance(luminance2, contrast, lighter) {
  function computeLuminance() {
    if (lighter) {
      return (luminance2 + 0.05) * contrast - 0.05;
    }
    return (luminance2 + 0.05) / contrast - 0.05;
  }
  let desiredLuminance2 = computeLuminance();
  if (desiredLuminance2 < 0 || desiredLuminance2 > 1) {
    lighter = !lighter;
    desiredLuminance2 = computeLuminance();
  }
  return desiredLuminance2;
}
function approachColorValue(candidateHSVA, index, desiredLuminance2, candidateLuminance) {
  const epsilon = 2e-4;
  let x = candidateHSVA[index];
  let multiplier = 1;
  let dLuminance = candidateLuminance(candidateHSVA) - desiredLuminance2;
  let previousSign = Math.sign(dLuminance);
  for (let guard = 100; guard; guard--) {
    if (Math.abs(dLuminance) < epsilon) {
      candidateHSVA[index] = x;
      return x;
    }
    const sign = Math.sign(dLuminance);
    if (sign !== previousSign) {
      multiplier /= 2;
      previousSign = sign;
    } else if (x < 0 || x > 1) {
      return null;
    }
    x += multiplier * (index === 2 ? -dLuminance : dLuminance);
    candidateHSVA[index] = x;
    dLuminance = candidateLuminance(candidateHSVA) - desiredLuminance2;
  }
  return null;
}
function findFgColorForContrast(fgColor, bgColor, requiredContrast) {
  const candidateHSVA = fgColor.as(
    "hsl"
    /* Format.HSL */
  ).hsva();
  const bgRGBA = bgColor.rgba();
  const candidateLuminance = (candidateHSVA2) => {
    return luminance(blendColors(Legacy.fromHSVA(candidateHSVA2).rgba(), bgRGBA));
  };
  const bgLuminance = luminance(bgColor.rgba());
  const fgLuminance = candidateLuminance(candidateHSVA);
  const fgIsLighter = fgLuminance > bgLuminance;
  const desired = desiredLuminance(bgLuminance, requiredContrast, fgIsLighter);
  const saturationComponentIndex = 1;
  const valueComponentIndex = 2;
  if (approachColorValue(candidateHSVA, valueComponentIndex, desired, candidateLuminance)) {
    return Legacy.fromHSVA(candidateHSVA);
  }
  candidateHSVA[valueComponentIndex] = 1;
  if (approachColorValue(candidateHSVA, saturationComponentIndex, desired, candidateLuminance)) {
    return Legacy.fromHSVA(candidateHSVA);
  }
  return null;
}
function findFgColorForContrastAPCA(fgColor, bgColor, requiredContrast) {
  const candidateHSVA = fgColor.as(
    "hsl"
    /* Format.HSL */
  ).hsva();
  const candidateLuminance = (candidateHSVA2) => {
    return luminanceAPCA(Legacy.fromHSVA(candidateHSVA2).rgba());
  };
  const bgLuminance = luminanceAPCA(bgColor.rgba());
  const fgLuminance = candidateLuminance(candidateHSVA);
  const fgIsLighter = fgLuminance >= bgLuminance;
  const desiredLuminance2 = desiredLuminanceAPCA(bgLuminance, requiredContrast, fgIsLighter);
  const saturationComponentIndex = 1;
  const valueComponentIndex = 2;
  if (approachColorValue(candidateHSVA, valueComponentIndex, desiredLuminance2, candidateLuminance)) {
    const candidate = Legacy.fromHSVA(candidateHSVA);
    if (Math.abs(contrastRatioAPCA(bgColor.rgba(), candidate.rgba())) >= requiredContrast) {
      return candidate;
    }
  }
  candidateHSVA[valueComponentIndex] = 1;
  if (approachColorValue(candidateHSVA, saturationComponentIndex, desiredLuminance2, candidateLuminance)) {
    const candidate = Legacy.fromHSVA(candidateHSVA);
    if (Math.abs(contrastRatioAPCA(bgColor.rgba(), candidate.rgba())) >= requiredContrast) {
      return candidate;
    }
  }
  return null;
}
var EPSILON = 0.01;
var WIDE_RANGE_EPSILON = 1;
function equals(a, b, accuracy = EPSILON) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (const i in a) {
      if (!equals(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }
  if (a === null || b === null) {
    return a === b;
  }
  return Math.abs(a - b) < accuracy;
}
function lessOrEquals(a, b, accuracy = EPSILON) {
  return a - b <= accuracy;
}
var Lab = class _Lab {
  l;
  a;
  b;
  alpha;
  #authoredText;
  #rawParams;
  channels = [
    "l",
    "a",
    "b",
    "alpha"
    /* ColorChannel.ALPHA */
  ];
  static #conversions = {
    [
      "hex"
      /* Format.HEX */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "hex"
      /* Format.HEX */
    ),
    [
      "hexa"
      /* Format.HEXA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "hexa"
      /* Format.HEXA */
    ),
    [
      "rgb"
      /* Format.RGB */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "rgb"
      /* Format.RGB */
    ),
    [
      "rgba"
      /* Format.RGBA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "rgba"
      /* Format.RGBA */
    ),
    [
      "hsl"
      /* Format.HSL */
    ]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hsla"
      /* Format.HSLA */
    ]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hwb"
      /* Format.HWB */
    ]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hwba"
      /* Format.HWBA */
    ]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "lch"
      /* Format.LCH */
    ]: (self) => new LCH(...ColorConverter.labToLch(self.l, self.a, self.b), self.alpha),
    [
      "oklch"
      /* Format.OKLCH */
    ]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [
      "lab"
      /* Format.LAB */
    ]: (self) => self,
    [
      "oklab"
      /* Format.OKLAB */
    ]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    [
      "srgb"
      /* Format.SRGB */
    ]: (self) => new ColorFunction("srgb", ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [
      "srgb-linear"
      /* Format.SRGB_LINEAR */
    ]: (self) => new ColorFunction("srgb-linear", ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [
      "display-p3"
      /* Format.DISPLAY_P3 */
    ]: (self) => new ColorFunction("display-p3", ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [
      "a98-rgb"
      /* Format.A98_RGB */
    ]: (self) => new ColorFunction("a98-rgb", ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [
      "prophoto-rgb"
      /* Format.PROPHOTO_RGB */
    ]: (self) => new ColorFunction("prophoto-rgb", ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [
      "rec2020"
      /* Format.REC_2020 */
    ]: (self) => new ColorFunction("rec2020", ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [
      "xyz"
      /* Format.XYZ */
    ]: (self) => new ColorFunction("xyz", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [
      "xyz-d50"
      /* Format.XYZ_D50 */
    ]: (self) => new ColorFunction("xyz-d50", ...self.#toXyzd50(), self.alpha),
    [
      "xyz-d65"
      /* Format.XYZ_D65 */
    ]: (self) => new ColorFunction("xyz-d65", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #toXyzd50() {
    return ColorConverter.labToXyzd50(this.l, this.a, this.b);
  }
  #getRGBArray(withAlpha = true) {
    const params = ColorConverter.xyzd50ToSrgb(...this.#toXyzd50());
    if (withAlpha) {
      return [...params, this.alpha ?? void 0];
    }
    return params;
  }
  constructor(l, a, b, alpha, authoredText) {
    this.#rawParams = [l, a, b];
    this.l = clamp(l, { min: 0, max: 100 });
    if (equals(this.l, 0, WIDE_RANGE_EPSILON) || equals(this.l, 100, WIDE_RANGE_EPSILON)) {
      a = b = 0;
    }
    this.a = a;
    this.b = b;
    this.alpha = clamp(alpha, { min: 0, max: 1 });
    this.#authoredText = authoredText;
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    return _Lab.#conversions[format](this);
  }
  asLegacyColor() {
    return this.as(
      "rgba"
      /* Format.RGBA */
    );
  }
  equal(color) {
    const lab = color.as(
      "lab"
      /* Format.LAB */
    );
    return equals(lab.l, this.l, WIDE_RANGE_EPSILON) && equals(lab.a, this.a) && equals(lab.b, this.b) && equals(lab.alpha, this.alpha);
  }
  format() {
    return "lab";
  }
  setAlpha(alpha) {
    return new _Lab(this.l, this.a, this.b, alpha, void 0);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.l, this.a, this.b);
  }
  #stringify(l, a, b) {
    const alpha = this.alpha === null || equals(this.alpha, 1) ? "" : ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `lab(${Platform.StringUtilities.stringifyWithPrecision(l, 0)} ${Platform.StringUtilities.stringifyWithPrecision(a)} ${Platform.StringUtilities.stringifyWithPrecision(b)}${alpha})`;
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    return false;
  }
  static fromSpec(spec, text) {
    const L = parsePercentage(spec[0], [0, 100]) ?? parseNumber(spec[0]);
    if (L === null) {
      return null;
    }
    const a = parsePercentage(spec[1], [0, 125]) ?? parseNumber(spec[1]);
    if (a === null) {
      return null;
    }
    const b = parsePercentage(spec[2], [0, 125]) ?? parseNumber(spec[2]);
    if (b === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);
    return new _Lab(L, a, b, alpha, text);
  }
};
var LCH = class _LCH {
  #rawParams;
  l;
  c;
  h;
  alpha;
  #authoredText;
  channels = [
    "l",
    "c",
    "h",
    "alpha"
    /* ColorChannel.ALPHA */
  ];
  static #conversions = {
    [
      "hex"
      /* Format.HEX */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "hex"
      /* Format.HEX */
    ),
    [
      "hexa"
      /* Format.HEXA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "hexa"
      /* Format.HEXA */
    ),
    [
      "rgb"
      /* Format.RGB */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "rgb"
      /* Format.RGB */
    ),
    [
      "rgba"
      /* Format.RGBA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "rgba"
      /* Format.RGBA */
    ),
    [
      "hsl"
      /* Format.HSL */
    ]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hsla"
      /* Format.HSLA */
    ]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hwb"
      /* Format.HWB */
    ]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hwba"
      /* Format.HWBA */
    ]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "lch"
      /* Format.LCH */
    ]: (self) => self,
    [
      "oklch"
      /* Format.OKLCH */
    ]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [
      "lab"
      /* Format.LAB */
    ]: (self) => new Lab(...ColorConverter.lchToLab(self.l, self.c, self.h), self.alpha),
    [
      "oklab"
      /* Format.OKLAB */
    ]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    [
      "srgb"
      /* Format.SRGB */
    ]: (self) => new ColorFunction("srgb", ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [
      "srgb-linear"
      /* Format.SRGB_LINEAR */
    ]: (self) => new ColorFunction("srgb-linear", ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [
      "display-p3"
      /* Format.DISPLAY_P3 */
    ]: (self) => new ColorFunction("display-p3", ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [
      "a98-rgb"
      /* Format.A98_RGB */
    ]: (self) => new ColorFunction("a98-rgb", ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [
      "prophoto-rgb"
      /* Format.PROPHOTO_RGB */
    ]: (self) => new ColorFunction("prophoto-rgb", ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [
      "rec2020"
      /* Format.REC_2020 */
    ]: (self) => new ColorFunction("rec2020", ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [
      "xyz"
      /* Format.XYZ */
    ]: (self) => new ColorFunction("xyz", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [
      "xyz-d50"
      /* Format.XYZ_D50 */
    ]: (self) => new ColorFunction("xyz-d50", ...self.#toXyzd50(), self.alpha),
    [
      "xyz-d65"
      /* Format.XYZ_D65 */
    ]: (self) => new ColorFunction("xyz-d65", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #toXyzd50() {
    return ColorConverter.labToXyzd50(...ColorConverter.lchToLab(this.l, this.c, this.h));
  }
  #getRGBArray(withAlpha = true) {
    const params = ColorConverter.xyzd50ToSrgb(...this.#toXyzd50());
    if (withAlpha) {
      return [...params, this.alpha ?? void 0];
    }
    return params;
  }
  constructor(l, c, h, alpha, authoredText) {
    this.#rawParams = [l, c, h];
    this.l = clamp(l, { min: 0, max: 100 });
    c = equals(this.l, 0, WIDE_RANGE_EPSILON) || equals(this.l, 100, WIDE_RANGE_EPSILON) ? 0 : c;
    this.c = clamp(c, { min: 0 });
    h = equals(c, 0) ? 0 : h;
    this.h = normalizeHue(h);
    this.alpha = clamp(alpha, { min: 0, max: 1 });
    this.#authoredText = authoredText;
  }
  asLegacyColor() {
    return this.as(
      "rgba"
      /* Format.RGBA */
    );
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    return _LCH.#conversions[format](this);
  }
  equal(color) {
    const lch = color.as(
      "lch"
      /* Format.LCH */
    );
    return equals(lch.l, this.l, WIDE_RANGE_EPSILON) && equals(lch.c, this.c) && equals(lch.h, this.h) && equals(lch.alpha, this.alpha);
  }
  format() {
    return "lch";
  }
  setAlpha(alpha) {
    return new _LCH(this.l, this.c, this.h, alpha);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.l, this.c, this.h);
  }
  #stringify(l, c, h) {
    const alpha = this.alpha === null || equals(this.alpha, 1) ? "" : ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `lch(${Platform.StringUtilities.stringifyWithPrecision(l, 0)} ${Platform.StringUtilities.stringifyWithPrecision(c)} ${Platform.StringUtilities.stringifyWithPrecision(h)}${alpha})`;
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    return false;
  }
  // See "powerless" component definitions in
  // https://www.w3.org/TR/css-color-4/#specifying-lab-lch
  isHuePowerless() {
    return equals(this.c, 0);
  }
  static fromSpec(spec, text) {
    const L = parsePercentage(spec[0], [0, 100]) ?? parseNumber(spec[0]);
    if (L === null) {
      return null;
    }
    const c = parsePercentage(spec[1], [0, 150]) ?? parseNumber(spec[1]);
    if (c === null) {
      return null;
    }
    const h = parseAngle(spec[2]);
    if (h === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);
    return new _LCH(L, c, h, alpha, text);
  }
};
var Oklab = class _Oklab {
  #rawParams;
  l;
  a;
  b;
  alpha;
  #authoredText;
  channels = [
    "l",
    "a",
    "b",
    "alpha"
    /* ColorChannel.ALPHA */
  ];
  static #conversions = {
    [
      "hex"
      /* Format.HEX */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "hex"
      /* Format.HEX */
    ),
    [
      "hexa"
      /* Format.HEXA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "hexa"
      /* Format.HEXA */
    ),
    [
      "rgb"
      /* Format.RGB */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "rgb"
      /* Format.RGB */
    ),
    [
      "rgba"
      /* Format.RGBA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "rgba"
      /* Format.RGBA */
    ),
    [
      "hsl"
      /* Format.HSL */
    ]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hsla"
      /* Format.HSLA */
    ]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hwb"
      /* Format.HWB */
    ]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hwba"
      /* Format.HWBA */
    ]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "lch"
      /* Format.LCH */
    ]: (self) => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    [
      "oklch"
      /* Format.OKLCH */
    ]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [
      "lab"
      /* Format.LAB */
    ]: (self) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    [
      "oklab"
      /* Format.OKLAB */
    ]: (self) => self,
    [
      "srgb"
      /* Format.SRGB */
    ]: (self) => new ColorFunction("srgb", ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [
      "srgb-linear"
      /* Format.SRGB_LINEAR */
    ]: (self) => new ColorFunction("srgb-linear", ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [
      "display-p3"
      /* Format.DISPLAY_P3 */
    ]: (self) => new ColorFunction("display-p3", ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [
      "a98-rgb"
      /* Format.A98_RGB */
    ]: (self) => new ColorFunction("a98-rgb", ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [
      "prophoto-rgb"
      /* Format.PROPHOTO_RGB */
    ]: (self) => new ColorFunction("prophoto-rgb", ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [
      "rec2020"
      /* Format.REC_2020 */
    ]: (self) => new ColorFunction("rec2020", ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [
      "xyz"
      /* Format.XYZ */
    ]: (self) => new ColorFunction("xyz", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [
      "xyz-d50"
      /* Format.XYZ_D50 */
    ]: (self) => new ColorFunction("xyz-d50", ...self.#toXyzd50(), self.alpha),
    [
      "xyz-d65"
      /* Format.XYZ_D65 */
    ]: (self) => new ColorFunction("xyz-d65", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #toXyzd50() {
    return ColorConverter.xyzd65ToD50(...ColorConverter.oklabToXyzd65(this.l, this.a, this.b));
  }
  #getRGBArray(withAlpha = true) {
    const params = ColorConverter.xyzd50ToSrgb(...this.#toXyzd50());
    if (withAlpha) {
      return [...params, this.alpha ?? void 0];
    }
    return params;
  }
  constructor(l, a, b, alpha, authoredText) {
    this.#rawParams = [l, a, b];
    this.l = clamp(l, { min: 0, max: 1 });
    if (equals(this.l, 0) || equals(this.l, 1)) {
      a = b = 0;
    }
    this.a = a;
    this.b = b;
    this.alpha = clamp(alpha, { min: 0, max: 1 });
    this.#authoredText = authoredText;
  }
  asLegacyColor() {
    return this.as(
      "rgba"
      /* Format.RGBA */
    );
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    return _Oklab.#conversions[format](this);
  }
  equal(color) {
    const oklab = color.as(
      "oklab"
      /* Format.OKLAB */
    );
    return equals(oklab.l, this.l) && equals(oklab.a, this.a) && equals(oklab.b, this.b) && equals(oklab.alpha, this.alpha);
  }
  format() {
    return "oklab";
  }
  setAlpha(alpha) {
    return new _Oklab(this.l, this.a, this.b, alpha);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.l, this.a, this.b);
  }
  #stringify(l, a, b) {
    const alpha = this.alpha === null || equals(this.alpha, 1) ? "" : ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `oklab(${Platform.StringUtilities.stringifyWithPrecision(l)} ${Platform.StringUtilities.stringifyWithPrecision(a)} ${Platform.StringUtilities.stringifyWithPrecision(b)}${alpha})`;
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    return false;
  }
  static fromSpec(spec, text) {
    const L = parsePercentage(spec[0], [0, 1]) ?? parseNumber(spec[0]);
    if (L === null) {
      return null;
    }
    const a = parsePercentage(spec[1], [0, 0.4]) ?? parseNumber(spec[1]);
    if (a === null) {
      return null;
    }
    const b = parsePercentage(spec[2], [0, 0.4]) ?? parseNumber(spec[2]);
    if (b === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);
    return new _Oklab(L, a, b, alpha, text);
  }
};
var Oklch = class _Oklch {
  #rawParams;
  l;
  c;
  h;
  alpha;
  #authoredText;
  channels = [
    "l",
    "c",
    "h",
    "alpha"
    /* ColorChannel.ALPHA */
  ];
  static #conversions = {
    [
      "hex"
      /* Format.HEX */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "hex"
      /* Format.HEX */
    ),
    [
      "hexa"
      /* Format.HEXA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "hexa"
      /* Format.HEXA */
    ),
    [
      "rgb"
      /* Format.RGB */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "rgb"
      /* Format.RGB */
    ),
    [
      "rgba"
      /* Format.RGBA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "rgba"
      /* Format.RGBA */
    ),
    [
      "hsl"
      /* Format.HSL */
    ]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hsla"
      /* Format.HSLA */
    ]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hwb"
      /* Format.HWB */
    ]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hwba"
      /* Format.HWBA */
    ]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "lch"
      /* Format.LCH */
    ]: (self) => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    [
      "oklch"
      /* Format.OKLCH */
    ]: (self) => self,
    [
      "lab"
      /* Format.LAB */
    ]: (self) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    [
      "oklab"
      /* Format.OKLAB */
    ]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    [
      "srgb"
      /* Format.SRGB */
    ]: (self) => new ColorFunction("srgb", ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [
      "srgb-linear"
      /* Format.SRGB_LINEAR */
    ]: (self) => new ColorFunction("srgb-linear", ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [
      "display-p3"
      /* Format.DISPLAY_P3 */
    ]: (self) => new ColorFunction("display-p3", ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [
      "a98-rgb"
      /* Format.A98_RGB */
    ]: (self) => new ColorFunction("a98-rgb", ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [
      "prophoto-rgb"
      /* Format.PROPHOTO_RGB */
    ]: (self) => new ColorFunction("prophoto-rgb", ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [
      "rec2020"
      /* Format.REC_2020 */
    ]: (self) => new ColorFunction("rec2020", ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [
      "xyz"
      /* Format.XYZ */
    ]: (self) => new ColorFunction("xyz", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [
      "xyz-d50"
      /* Format.XYZ_D50 */
    ]: (self) => new ColorFunction("xyz-d50", ...self.#toXyzd50(), self.alpha),
    [
      "xyz-d65"
      /* Format.XYZ_D65 */
    ]: (self) => new ColorFunction("xyz-d65", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #toXyzd50() {
    return ColorConverter.oklchToXyzd50(this.l, this.c, this.h);
  }
  #getRGBArray(withAlpha = true) {
    const params = ColorConverter.xyzd50ToSrgb(...this.#toXyzd50());
    if (withAlpha) {
      return [...params, this.alpha ?? void 0];
    }
    return params;
  }
  constructor(l, c, h, alpha, authoredText) {
    this.#rawParams = [l, c, h];
    this.l = clamp(l, { min: 0, max: 1 });
    c = equals(this.l, 0) || equals(this.l, 1) ? 0 : c;
    this.c = clamp(c, { min: 0 });
    h = equals(c, 0) ? 0 : h;
    this.h = normalizeHue(h);
    this.alpha = clamp(alpha, { min: 0, max: 1 });
    this.#authoredText = authoredText;
  }
  asLegacyColor() {
    return this.as(
      "rgba"
      /* Format.RGBA */
    );
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    return _Oklch.#conversions[format](this);
  }
  equal(color) {
    const oklch = color.as(
      "oklch"
      /* Format.OKLCH */
    );
    return equals(oklch.l, this.l) && equals(oklch.c, this.c) && equals(oklch.h, this.h) && equals(oklch.alpha, this.alpha);
  }
  format() {
    return "oklch";
  }
  setAlpha(alpha) {
    return new _Oklch(this.l, this.c, this.h, alpha);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.l, this.c, this.h);
  }
  #stringify(l, c, h) {
    const alpha = this.alpha === null || equals(this.alpha, 1) ? "" : ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `oklch(${Platform.StringUtilities.stringifyWithPrecision(l)} ${Platform.StringUtilities.stringifyWithPrecision(c)} ${Platform.StringUtilities.stringifyWithPrecision(h)}${alpha})`;
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    return false;
  }
  static fromSpec(spec, text) {
    const L = parsePercentage(spec[0], [0, 1]) ?? parseNumber(spec[0]);
    if (L === null) {
      return null;
    }
    const c = parsePercentage(spec[1], [0, 0.4]) ?? parseNumber(spec[1]);
    if (c === null) {
      return null;
    }
    const h = parseAngle(spec[2]);
    if (h === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);
    return new _Oklch(L, c, h, alpha, text);
  }
};
var ColorFunction = class _ColorFunction {
  #rawParams;
  p0;
  p1;
  p2;
  alpha;
  colorSpace;
  #authoredText;
  get channels() {
    return this.isXYZ() ? [
      "x",
      "y",
      "z",
      "alpha"
      /* ColorChannel.ALPHA */
    ] : [
      "r",
      "g",
      "b",
      "alpha"
      /* ColorChannel.ALPHA */
    ];
  }
  static #conversions = {
    [
      "hex"
      /* Format.HEX */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "hex"
      /* Format.HEX */
    ),
    [
      "hexa"
      /* Format.HEXA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "hexa"
      /* Format.HEXA */
    ),
    [
      "rgb"
      /* Format.RGB */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "rgb"
      /* Format.RGB */
    ),
    [
      "rgba"
      /* Format.RGBA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "rgba"
      /* Format.RGBA */
    ),
    [
      "hsl"
      /* Format.HSL */
    ]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hsla"
      /* Format.HSLA */
    ]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hwb"
      /* Format.HWB */
    ]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hwba"
      /* Format.HWBA */
    ]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "lch"
      /* Format.LCH */
    ]: (self) => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    [
      "oklch"
      /* Format.OKLCH */
    ]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [
      "lab"
      /* Format.LAB */
    ]: (self) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    [
      "oklab"
      /* Format.OKLAB */
    ]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    [
      "srgb"
      /* Format.SRGB */
    ]: (self) => new _ColorFunction("srgb", ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [
      "srgb-linear"
      /* Format.SRGB_LINEAR */
    ]: (self) => new _ColorFunction("srgb-linear", ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [
      "display-p3"
      /* Format.DISPLAY_P3 */
    ]: (self) => new _ColorFunction("display-p3", ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [
      "a98-rgb"
      /* Format.A98_RGB */
    ]: (self) => new _ColorFunction("a98-rgb", ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [
      "prophoto-rgb"
      /* Format.PROPHOTO_RGB */
    ]: (self) => new _ColorFunction("prophoto-rgb", ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [
      "rec2020"
      /* Format.REC_2020 */
    ]: (self) => new _ColorFunction("rec2020", ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [
      "xyz"
      /* Format.XYZ */
    ]: (self) => new _ColorFunction("xyz", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [
      "xyz-d50"
      /* Format.XYZ_D50 */
    ]: (self) => new _ColorFunction("xyz-d50", ...self.#toXyzd50(), self.alpha),
    [
      "xyz-d65"
      /* Format.XYZ_D65 */
    ]: (self) => new _ColorFunction("xyz-d65", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #toXyzd50() {
    const [p0, p1, p2] = this.#rawParams;
    switch (this.colorSpace) {
      case "srgb":
        return ColorConverter.srgbToXyzd50(p0, p1, p2);
      case "srgb-linear":
        return ColorConverter.srgbLinearToXyzd50(p0, p1, p2);
      case "display-p3":
        return ColorConverter.displayP3ToXyzd50(p0, p1, p2);
      case "a98-rgb":
        return ColorConverter.adobeRGBToXyzd50(p0, p1, p2);
      case "prophoto-rgb":
        return ColorConverter.proPhotoToXyzd50(p0, p1, p2);
      case "rec2020":
        return ColorConverter.rec2020ToXyzd50(p0, p1, p2);
      case "xyz-d50":
        return [p0, p1, p2];
      case "xyz":
      case "xyz-d65":
        return ColorConverter.xyzd65ToD50(p0, p1, p2);
    }
    throw new Error("Invalid color space");
  }
  #getRGBArray(withAlpha = true) {
    const [p0, p1, p2] = this.#rawParams;
    const params = this.colorSpace === "srgb" ? [p0, p1, p2] : [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50())];
    if (withAlpha) {
      return [...params, this.alpha ?? void 0];
    }
    return params;
  }
  constructor(colorSpace, p0, p1, p2, alpha, authoredText) {
    this.#rawParams = [p0, p1, p2];
    this.colorSpace = colorSpace;
    this.#authoredText = authoredText;
    if (this.colorSpace !== "xyz-d50" && this.colorSpace !== "xyz-d65" && this.colorSpace !== "xyz") {
      p0 = clamp(p0, { min: 0, max: 1 });
      p1 = clamp(p1, { min: 0, max: 1 });
      p2 = clamp(p2, { min: 0, max: 1 });
    }
    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
    this.alpha = clamp(alpha, { min: 0, max: 1 });
  }
  asLegacyColor() {
    return this.as(
      "rgba"
      /* Format.RGBA */
    );
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    if (this.colorSpace === format) {
      return this;
    }
    return _ColorFunction.#conversions[format](this);
  }
  equal(color) {
    const space = color.as(this.colorSpace);
    return equals(this.p0, space.p0) && equals(this.p1, space.p1) && equals(this.p2, space.p2) && equals(this.alpha, space.alpha);
  }
  format() {
    return this.colorSpace;
  }
  setAlpha(alpha) {
    return new _ColorFunction(this.colorSpace, this.p0, this.p1, this.p2, alpha);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.p0, this.p1, this.p2);
  }
  #stringify(p0, p1, p2) {
    const alpha = this.alpha === null || equals(this.alpha, 1) ? "" : ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `color(${this.colorSpace} ${Platform.StringUtilities.stringifyWithPrecision(p0)} ${Platform.StringUtilities.stringifyWithPrecision(p1)} ${Platform.StringUtilities.stringifyWithPrecision(p2)}${alpha})`;
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    if (this.colorSpace !== "xyz-d50" && this.colorSpace !== "xyz-d65" && this.colorSpace !== "xyz") {
      return !equals(this.#rawParams, [this.p0, this.p1, this.p2]);
    }
    return false;
  }
  isXYZ() {
    switch (this.colorSpace) {
      case "xyz":
      case "xyz-d50":
      case "xyz-d65":
        return true;
    }
    return false;
  }
  /**
   * Parses given `color()` function definition and returns the `Color` object.
   * We want to special case its parsing here because it's a bit different
   * than other color functions: rgb, lch etc. accepts 3 arguments with
   * optional alpha. This accepts 4 arguments with optional alpha.
   *
   * Instead of making `splitColorFunctionParameters` work for this case too
   * I've decided to implement it specifically.
   * @param authoredText Original definition of the color with `color`
   * @param parametersText Inside of the `color()` function. ex, `display-p3 0.1 0.2 0.3 / 0%`
   * @returns `Color` object
   */
  static fromSpec(authoredText, parametersWithAlphaText) {
    const [parametersText, alphaText] = parametersWithAlphaText.split("/", 2);
    const parameters = parametersText.trim().split(/\s+/);
    const [colorSpaceText, ...remainingParams] = parameters;
    const colorSpace = getColorSpace(colorSpaceText);
    if (!colorSpace) {
      return null;
    }
    if (remainingParams.length === 0 && alphaText === void 0) {
      return new _ColorFunction(colorSpace, 0, 0, 0, null, authoredText);
    }
    if (remainingParams.length === 0 && alphaText !== void 0 && alphaText.trim().split(/\s+/).length > 1) {
      return null;
    }
    if (remainingParams.length > 3) {
      return null;
    }
    const nonesReplacedParams = remainingParams.map((param) => param === "none" ? "0" : param);
    const values = nonesReplacedParams.map((param) => parsePercentOrNumber(param, [0, 1]));
    const containsNull = values.includes(null);
    if (containsNull) {
      return null;
    }
    const alphaValue = alphaText ? parsePercentOrNumber(alphaText, [0, 1]) ?? 1 : 1;
    const rgbOrXyza = [
      values[0] ?? 0,
      values[1] ?? 0,
      values[2] ?? 0,
      alphaValue
    ];
    return new _ColorFunction(colorSpace, ...rgbOrXyza, authoredText);
  }
};
var HSL = class _HSL {
  h;
  s;
  l;
  alpha;
  #rawParams;
  #authoredText;
  channels = [
    "h",
    "s",
    "l",
    "alpha"
    /* ColorChannel.ALPHA */
  ];
  static #conversions = {
    [
      "hex"
      /* Format.HEX */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "hex"
      /* Format.HEX */
    ),
    [
      "hexa"
      /* Format.HEXA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "hexa"
      /* Format.HEXA */
    ),
    [
      "rgb"
      /* Format.RGB */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "rgb"
      /* Format.RGB */
    ),
    [
      "rgba"
      /* Format.RGBA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "rgba"
      /* Format.RGBA */
    ),
    [
      "hsl"
      /* Format.HSL */
    ]: (self) => self,
    [
      "hsla"
      /* Format.HSLA */
    ]: (self) => self,
    [
      "hwb"
      /* Format.HWB */
    ]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hwba"
      /* Format.HWBA */
    ]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "lch"
      /* Format.LCH */
    ]: (self) => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    [
      "oklch"
      /* Format.OKLCH */
    ]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [
      "lab"
      /* Format.LAB */
    ]: (self) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    [
      "oklab"
      /* Format.OKLAB */
    ]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    [
      "srgb"
      /* Format.SRGB */
    ]: (self) => new ColorFunction("srgb", ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [
      "srgb-linear"
      /* Format.SRGB_LINEAR */
    ]: (self) => new ColorFunction("srgb-linear", ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [
      "display-p3"
      /* Format.DISPLAY_P3 */
    ]: (self) => new ColorFunction("display-p3", ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [
      "a98-rgb"
      /* Format.A98_RGB */
    ]: (self) => new ColorFunction("a98-rgb", ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [
      "prophoto-rgb"
      /* Format.PROPHOTO_RGB */
    ]: (self) => new ColorFunction("prophoto-rgb", ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [
      "rec2020"
      /* Format.REC_2020 */
    ]: (self) => new ColorFunction("rec2020", ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [
      "xyz"
      /* Format.XYZ */
    ]: (self) => new ColorFunction("xyz", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [
      "xyz-d50"
      /* Format.XYZ_D50 */
    ]: (self) => new ColorFunction("xyz-d50", ...self.#toXyzd50(), self.alpha),
    [
      "xyz-d65"
      /* Format.XYZ_D65 */
    ]: (self) => new ColorFunction("xyz-d65", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #getRGBArray(withAlpha = true) {
    const rgb = hsl2rgb([this.h, this.s, this.l, 0]);
    if (withAlpha) {
      return [rgb[0], rgb[1], rgb[2], this.alpha ?? void 0];
    }
    return [rgb[0], rgb[1], rgb[2]];
  }
  #toXyzd50() {
    const rgb = this.#getRGBArray(false);
    return ColorConverter.srgbToXyzd50(rgb[0], rgb[1], rgb[2]);
  }
  constructor(h, s, l, alpha, authoredText) {
    this.#rawParams = [h, s, l];
    this.l = clamp(l, { min: 0, max: 1 });
    s = equals(this.l, 0) || equals(this.l, 1) ? 0 : s;
    this.s = clamp(s, { min: 0, max: 1 });
    h = equals(this.s, 0) ? 0 : h;
    this.h = normalizeHue(h * 360) / 360;
    this.alpha = clamp(alpha ?? null, { min: 0, max: 1 });
    this.#authoredText = authoredText;
  }
  equal(color) {
    const hsl = color.as(
      "hsl"
      /* Format.HSL */
    );
    return equals(this.h, hsl.h) && equals(this.s, hsl.s) && equals(this.l, hsl.l) && equals(this.alpha, hsl.alpha);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.h, this.s, this.l);
  }
  #stringify(h, s, l) {
    const start = Platform.StringUtilities.sprintf("hsl(%sdeg %s% %s%", Platform.StringUtilities.stringifyWithPrecision(h * 360), Platform.StringUtilities.stringifyWithPrecision(s * 100), Platform.StringUtilities.stringifyWithPrecision(l * 100));
    if (this.alpha !== null && this.alpha !== 1) {
      return start + Platform.StringUtilities.sprintf(" / %s%)", Platform.StringUtilities.stringifyWithPrecision(this.alpha * 100));
    }
    return start + ")";
  }
  setAlpha(alpha) {
    return new _HSL(this.h, this.s, this.l, alpha);
  }
  format() {
    return this.alpha === null || this.alpha === 1 ? "hsl" : "hsla";
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    if (format === this.format()) {
      return this;
    }
    return _HSL.#conversions[format](this);
  }
  asLegacyColor() {
    return this.as(
      "rgba"
      /* Format.RGBA */
    );
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    return !lessOrEquals(this.#rawParams[1], 1) || !lessOrEquals(0, this.#rawParams[1]);
  }
  static fromSpec(spec, text) {
    const h = parseHueNumeric(spec[0]);
    if (h === null) {
      return null;
    }
    const s = parseSatLightNumeric(spec[1]);
    if (s === null) {
      return null;
    }
    const l = parseSatLightNumeric(spec[2]);
    if (l === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);
    return new _HSL(h, s, l, alpha, text);
  }
  hsva() {
    const s = this.s * (this.l < 0.5 ? this.l : 1 - this.l);
    return [this.h, s !== 0 ? 2 * s / (this.l + s) : 0, this.l + s, this.alpha ?? 1];
  }
  canonicalHSLA() {
    return [Math.round(this.h * 360), Math.round(this.s * 100), Math.round(this.l * 100), this.alpha ?? 1];
  }
};
var HWB = class _HWB {
  h;
  w;
  b;
  alpha;
  #rawParams;
  #authoredText;
  channels = [
    "h",
    "w",
    "b",
    "alpha"
    /* ColorChannel.ALPHA */
  ];
  static #conversions = {
    [
      "hex"
      /* Format.HEX */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "hex"
      /* Format.HEX */
    ),
    [
      "hexa"
      /* Format.HEXA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "hexa"
      /* Format.HEXA */
    ),
    [
      "rgb"
      /* Format.RGB */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        false
      ),
      "rgb"
      /* Format.RGB */
    ),
    [
      "rgba"
      /* Format.RGBA */
    ]: (self) => new Legacy(
      self.#getRGBArray(
        /* withAlpha= */
        true
      ),
      "rgba"
      /* Format.RGBA */
    ),
    [
      "hsl"
      /* Format.HSL */
    ]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hsla"
      /* Format.HSLA */
    ]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    [
      "hwb"
      /* Format.HWB */
    ]: (self) => self,
    [
      "hwba"
      /* Format.HWBA */
    ]: (self) => self,
    [
      "lch"
      /* Format.LCH */
    ]: (self) => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    [
      "oklch"
      /* Format.OKLCH */
    ]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [
      "lab"
      /* Format.LAB */
    ]: (self) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    [
      "oklab"
      /* Format.OKLAB */
    ]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    [
      "srgb"
      /* Format.SRGB */
    ]: (self) => new ColorFunction("srgb", ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [
      "srgb-linear"
      /* Format.SRGB_LINEAR */
    ]: (self) => new ColorFunction("srgb-linear", ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [
      "display-p3"
      /* Format.DISPLAY_P3 */
    ]: (self) => new ColorFunction("display-p3", ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [
      "a98-rgb"
      /* Format.A98_RGB */
    ]: (self) => new ColorFunction("a98-rgb", ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [
      "prophoto-rgb"
      /* Format.PROPHOTO_RGB */
    ]: (self) => new ColorFunction("prophoto-rgb", ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [
      "rec2020"
      /* Format.REC_2020 */
    ]: (self) => new ColorFunction("rec2020", ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [
      "xyz"
      /* Format.XYZ */
    ]: (self) => new ColorFunction("xyz", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [
      "xyz-d50"
      /* Format.XYZ_D50 */
    ]: (self) => new ColorFunction("xyz-d50", ...self.#toXyzd50(), self.alpha),
    [
      "xyz-d65"
      /* Format.XYZ_D65 */
    ]: (self) => new ColorFunction("xyz-d65", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #getRGBArray(withAlpha = true) {
    const rgb = hwb2rgb([this.h, this.w, this.b, 0]);
    if (withAlpha) {
      return [rgb[0], rgb[1], rgb[2], this.alpha ?? void 0];
    }
    return [rgb[0], rgb[1], rgb[2]];
  }
  #toXyzd50() {
    const rgb = this.#getRGBArray(false);
    return ColorConverter.srgbToXyzd50(rgb[0], rgb[1], rgb[2]);
  }
  constructor(h, w, b, alpha, authoredText) {
    this.#rawParams = [h, w, b];
    this.w = clamp(w, { min: 0, max: 1 });
    this.b = clamp(b, { min: 0, max: 1 });
    h = lessOrEquals(1, this.w + this.b) ? 0 : h;
    this.h = normalizeHue(h * 360) / 360;
    this.alpha = clamp(alpha, { min: 0, max: 1 });
    if (lessOrEquals(1, this.w + this.b)) {
      const ratio = this.w / this.b;
      this.b = 1 / (1 + ratio);
      this.w = 1 - this.b;
    }
    this.#authoredText = authoredText;
  }
  equal(color) {
    const hwb = color.as(
      "hwb"
      /* Format.HWB */
    );
    return equals(this.h, hwb.h) && equals(this.w, hwb.w) && equals(this.b, hwb.b) && equals(this.alpha, hwb.alpha);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.h, this.w, this.b);
  }
  #stringify(h, w, b) {
    const start = Platform.StringUtilities.sprintf("hwb(%sdeg %s% %s%", Platform.StringUtilities.stringifyWithPrecision(h * 360), Platform.StringUtilities.stringifyWithPrecision(w * 100), Platform.StringUtilities.stringifyWithPrecision(b * 100));
    if (this.alpha !== null && this.alpha !== 1) {
      return start + Platform.StringUtilities.sprintf(" / %s%)", Platform.StringUtilities.stringifyWithPrecision(this.alpha * 100));
    }
    return start + ")";
  }
  setAlpha(alpha) {
    return new _HWB(this.h, this.w, this.b, alpha, this.#authoredText);
  }
  format() {
    return this.alpha !== null && !equals(this.alpha, 1) ? "hwba" : "hwb";
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    if (format === this.format()) {
      return this;
    }
    return _HWB.#conversions[format](this);
  }
  asLegacyColor() {
    return this.as(
      "rgba"
      /* Format.RGBA */
    );
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  canonicalHWBA() {
    return [
      Math.round(this.h * 360),
      Math.round(this.w * 100),
      Math.round(this.b * 100),
      this.alpha ?? 1
    ];
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    return !lessOrEquals(this.#rawParams[1], 1) || !lessOrEquals(0, this.#rawParams[1]) || !lessOrEquals(this.#rawParams[2], 1) || !lessOrEquals(0, this.#rawParams[2]);
  }
  static fromSpec(spec, text) {
    const h = parseHueNumeric(spec[0]);
    if (h === null) {
      return null;
    }
    const w = parseSatLightNumeric(spec[1]);
    if (w === null) {
      return null;
    }
    const b = parseSatLightNumeric(spec[2]);
    if (b === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);
    return new _HWB(h, w, b, alpha, text);
  }
};
function toRgbValue(value) {
  return Math.round(value * 255);
}
var ShortFormatColorBase = class {
  color;
  channels = [
    "r",
    "g",
    "b",
    "alpha"
    /* ColorChannel.ALPHA */
  ];
  constructor(color) {
    this.color = color;
  }
  get alpha() {
    return this.color.alpha;
  }
  rgba() {
    return this.color.rgba();
  }
  equal(color) {
    return this.color.equal(color);
  }
  setAlpha(alpha) {
    return this.color.setAlpha(alpha);
  }
  format() {
    return (this.alpha ?? 1) !== 1 ? "hexa" : "hex";
  }
  as(format) {
    return this.color.as(format);
  }
  is(format) {
    return this.color.is(format);
  }
  asLegacyColor() {
    return this.color.asLegacyColor();
  }
  getAuthoredText() {
    return this.color.getAuthoredText();
  }
  getRawParameters() {
    return this.color.getRawParameters();
  }
  isGamutClipped() {
    return this.color.isGamutClipped();
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    const [r, g, b] = this.color.rgba();
    return this.stringify(r, g, b);
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    const [r, g, b] = this.getRawParameters();
    return this.stringify(r, g, b);
  }
};
var ShortHex = class _ShortHex extends ShortFormatColorBase {
  setAlpha(alpha) {
    return new _ShortHex(this.color.setAlpha(alpha));
  }
  asString(format) {
    return format && format !== this.format() ? super.as(format).asString() : super.asString();
  }
  stringify(r, g, b) {
    function toShortHexValue(value) {
      return (Math.round(value * 255) / 17).toString(16);
    }
    if (this.color.hasAlpha()) {
      return Platform.StringUtilities.sprintf("#%s%s%s%s", toShortHexValue(r), toShortHexValue(g), toShortHexValue(b), toShortHexValue(this.alpha ?? 1)).toLowerCase();
    }
    return Platform.StringUtilities.sprintf("#%s%s%s", toShortHexValue(r), toShortHexValue(g), toShortHexValue(b)).toLowerCase();
  }
};
var Nickname = class _Nickname extends ShortFormatColorBase {
  nickname;
  constructor(nickname, color) {
    super(color);
    this.nickname = nickname;
  }
  static fromName(name, text) {
    const nickname = name.toLowerCase();
    const rgba = Nicknames.get(nickname);
    if (rgba !== void 0) {
      return new _Nickname(nickname, Legacy.fromRGBA(rgba, text));
    }
    return null;
  }
  stringify() {
    return this.nickname;
  }
  getAsRawString(format) {
    return this.color.getAsRawString(format);
  }
};
var Legacy = class _Legacy {
  #rawParams;
  #rgba;
  #authoredText;
  #format;
  channels = [
    "r",
    "g",
    "b",
    "alpha"
    /* ColorChannel.ALPHA */
  ];
  static #conversions = {
    [
      "hex"
      /* Format.HEX */
    ]: (self) => new _Legacy(
      self.#rgba,
      "hex"
      /* Format.HEX */
    ),
    [
      "hexa"
      /* Format.HEXA */
    ]: (self) => new _Legacy(
      self.#rgba,
      "hexa"
      /* Format.HEXA */
    ),
    [
      "rgb"
      /* Format.RGB */
    ]: (self) => new _Legacy(
      self.#rgba,
      "rgb"
      /* Format.RGB */
    ),
    [
      "rgba"
      /* Format.RGBA */
    ]: (self) => new _Legacy(
      self.#rgba,
      "rgba"
      /* Format.RGBA */
    ),
    [
      "hsl"
      /* Format.HSL */
    ]: (self) => new HSL(...rgbToHsl([self.#rgba[0], self.#rgba[1], self.#rgba[2]]), self.alpha),
    [
      "hsla"
      /* Format.HSLA */
    ]: (self) => new HSL(...rgbToHsl([self.#rgba[0], self.#rgba[1], self.#rgba[2]]), self.alpha),
    [
      "hwb"
      /* Format.HWB */
    ]: (self) => new HWB(...rgbToHwb([self.#rgba[0], self.#rgba[1], self.#rgba[2]]), self.alpha),
    [
      "hwba"
      /* Format.HWBA */
    ]: (self) => new HWB(...rgbToHwb([self.#rgba[0], self.#rgba[1], self.#rgba[2]]), self.alpha),
    [
      "lch"
      /* Format.LCH */
    ]: (self) => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    [
      "oklch"
      /* Format.OKLCH */
    ]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [
      "lab"
      /* Format.LAB */
    ]: (self) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    [
      "oklab"
      /* Format.OKLAB */
    ]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    [
      "srgb"
      /* Format.SRGB */
    ]: (self) => new ColorFunction("srgb", ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [
      "srgb-linear"
      /* Format.SRGB_LINEAR */
    ]: (self) => new ColorFunction("srgb-linear", ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [
      "display-p3"
      /* Format.DISPLAY_P3 */
    ]: (self) => new ColorFunction("display-p3", ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [
      "a98-rgb"
      /* Format.A98_RGB */
    ]: (self) => new ColorFunction("a98-rgb", ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [
      "prophoto-rgb"
      /* Format.PROPHOTO_RGB */
    ]: (self) => new ColorFunction("prophoto-rgb", ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [
      "rec2020"
      /* Format.REC_2020 */
    ]: (self) => new ColorFunction("rec2020", ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [
      "xyz"
      /* Format.XYZ */
    ]: (self) => new ColorFunction("xyz", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [
      "xyz-d50"
      /* Format.XYZ_D50 */
    ]: (self) => new ColorFunction("xyz-d50", ...self.#toXyzd50(), self.alpha),
    [
      "xyz-d65"
      /* Format.XYZ_D65 */
    ]: (self) => new ColorFunction("xyz-d65", ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #toXyzd50() {
    const [r, g, b] = this.#rgba;
    return ColorConverter.srgbToXyzd50(r, g, b);
  }
  get alpha() {
    switch (this.format()) {
      case "hexa":
      case "rgba":
        return this.#rgba[3];
      default:
        return null;
    }
  }
  asLegacyColor() {
    return this;
  }
  nickname() {
    const nickname = RGBAToNickname.get(String(this.canonicalRGBA()));
    return nickname ? new Nickname(nickname, this) : null;
  }
  shortHex() {
    for (let i = 0; i < 4; ++i) {
      const c = Math.round(this.#rgba[i] * 255);
      if (c % 17) {
        return null;
      }
    }
    return new ShortHex(this);
  }
  constructor(rgba, format, authoredText) {
    this.#authoredText = authoredText || null;
    this.#format = format;
    this.#rawParams = [rgba[0], rgba[1], rgba[2]];
    this.#rgba = [
      clamp(rgba[0], { min: 0, max: 1 }),
      clamp(rgba[1], { min: 0, max: 1 }),
      clamp(rgba[2], { min: 0, max: 1 }),
      clamp(rgba[3] ?? 1, { min: 0, max: 1 })
    ];
  }
  static fromHex(hex, text) {
    hex = hex.toLowerCase();
    const hasAlpha = hex.length === 4 || hex.length === 8;
    const format = hasAlpha ? "hexa" : "hex";
    const isShort = hex.length <= 4;
    if (isShort) {
      hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2) + hex.charAt(3) + hex.charAt(3);
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    let a = 1;
    if (hex.length === 8) {
      a = parseInt(hex.substring(6, 8), 16) / 255;
    }
    const color = new _Legacy([r / 255, g / 255, b / 255, a], format, text);
    return isShort ? new ShortHex(color) : color;
  }
  static fromRGBAFunction(r, g, b, alpha, text) {
    const rgba = [
      parseRgbNumeric(r),
      parseRgbNumeric(g),
      parseRgbNumeric(b),
      alpha ? parseAlphaNumeric(alpha) : 1
    ];
    if (!Platform.ArrayUtilities.arrayDoesNotContainNullOrUndefined(rgba)) {
      return null;
    }
    return new _Legacy(rgba, alpha ? "rgba" : "rgb", text);
  }
  static fromRGBA(rgba, authoredText) {
    return new _Legacy([rgba[0] / 255, rgba[1] / 255, rgba[2] / 255, rgba[3]], "rgba", authoredText);
  }
  static fromHSVA(hsva) {
    const rgba = hsva2rgba(hsva);
    return new _Legacy(
      rgba,
      "rgba"
      /* Format.RGBA */
    );
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    if (format === this.format()) {
      return this;
    }
    return _Legacy.#conversions[format](this);
  }
  format() {
    return this.#format;
  }
  hasAlpha() {
    return this.#rgba[3] !== 1;
  }
  detectHEXFormat() {
    const hasAlpha = this.hasAlpha();
    return hasAlpha ? "hexa" : "hex";
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(format, this.#rgba[0], this.#rgba[1], this.#rgba[2]);
  }
  #stringify(format, r, g, b) {
    if (!format) {
      format = this.#format;
    }
    function toHexValue(value) {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }
    switch (format) {
      case "rgb":
      case "rgba": {
        const start = Platform.StringUtilities.sprintf("rgb(%d %d %d", toRgbValue(r), toRgbValue(g), toRgbValue(b));
        if (this.hasAlpha()) {
          return start + Platform.StringUtilities.sprintf(" / %d%)", Math.round(this.#rgba[3] * 100));
        }
        return start + ")";
      }
      case "hex":
      case "hexa": {
        if (this.hasAlpha()) {
          return Platform.StringUtilities.sprintf("#%s%s%s%s", toHexValue(r), toHexValue(g), toHexValue(b), toHexValue(this.#rgba[3])).toLowerCase();
        }
        return Platform.StringUtilities.sprintf("#%s%s%s", toHexValue(r), toHexValue(g), toHexValue(b)).toLowerCase();
      }
    }
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(format, ...this.#rawParams);
  }
  isGamutClipped() {
    return !equals(this.#rawParams.map(toRgbValue), [this.#rgba[0], this.#rgba[1], this.#rgba[2]].map(toRgbValue), WIDE_RANGE_EPSILON);
  }
  rgba() {
    return [...this.#rgba];
  }
  canonicalRGBA() {
    const rgba = new Array(4);
    for (let i = 0; i < 3; ++i) {
      rgba[i] = Math.round(this.#rgba[i] * 255);
    }
    rgba[3] = this.#rgba[3];
    return rgba;
  }
  toProtocolRGBA() {
    const rgba = this.canonicalRGBA();
    const result = { r: rgba[0], g: rgba[1], b: rgba[2], a: void 0 };
    if (rgba[3] !== 1) {
      result.a = rgba[3];
    }
    return result;
  }
  invert() {
    const rgba = [0, 0, 0, 0];
    rgba[0] = 1 - this.#rgba[0];
    rgba[1] = 1 - this.#rgba[1];
    rgba[2] = 1 - this.#rgba[2];
    rgba[3] = this.#rgba[3];
    return new _Legacy(
      rgba,
      "rgba"
      /* Format.RGBA */
    );
  }
  /**
   * Returns a new color using the NTSC formula for making a RGB color grayscale.
   * Note: We override with an alpha of 50% to enhance the dimming effect.
   */
  grayscale() {
    const [r, g, b] = this.#rgba;
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    return new _Legacy(
      [gray, gray, gray, 0.5],
      "rgba"
      /* Format.RGBA */
    );
  }
  setAlpha(alpha) {
    const rgba = [...this.#rgba];
    rgba[3] = alpha;
    return new _Legacy(
      rgba,
      "rgba"
      /* Format.RGBA */
    );
  }
  blendWith(fgColor) {
    const rgba = blendColors(fgColor.#rgba, this.#rgba);
    return new _Legacy(
      rgba,
      "rgba"
      /* Format.RGBA */
    );
  }
  blendWithAlpha(alpha) {
    const rgba = [...this.#rgba];
    rgba[3] *= alpha;
    return new _Legacy(
      rgba,
      "rgba"
      /* Format.RGBA */
    );
  }
  setFormat(format) {
    this.#format = format;
  }
  equal(other) {
    const legacy = other.as(this.#format);
    return equals(toRgbValue(this.#rgba[0]), toRgbValue(legacy.#rgba[0]), WIDE_RANGE_EPSILON) && equals(toRgbValue(this.#rgba[1]), toRgbValue(legacy.#rgba[1]), WIDE_RANGE_EPSILON) && equals(toRgbValue(this.#rgba[2]), toRgbValue(legacy.#rgba[2]), WIDE_RANGE_EPSILON) && equals(this.#rgba[3], legacy.#rgba[3]);
  }
};
var Regex = /((?:rgba?|hsla?|hwba?|lab|lch|oklab|oklch|color)\([^)]+\)|#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3,4}|\b[a-zA-Z]+\b(?!-))/g;
var ColorMixRegex = /color-mix\(.*,\s*(?<firstColor>.+)\s*,\s*(?<secondColor>.+)\s*\)/g;
var COLOR_TO_RGBA_ENTRIES = [
  ["aliceblue", [240, 248, 255]],
  ["antiquewhite", [250, 235, 215]],
  ["aqua", [0, 255, 255]],
  ["aquamarine", [127, 255, 212]],
  ["azure", [240, 255, 255]],
  ["beige", [245, 245, 220]],
  ["bisque", [255, 228, 196]],
  ["black", [0, 0, 0]],
  ["blanchedalmond", [255, 235, 205]],
  ["blue", [0, 0, 255]],
  ["blueviolet", [138, 43, 226]],
  ["brown", [165, 42, 42]],
  ["burlywood", [222, 184, 135]],
  ["cadetblue", [95, 158, 160]],
  ["chartreuse", [127, 255, 0]],
  ["chocolate", [210, 105, 30]],
  ["coral", [255, 127, 80]],
  ["cornflowerblue", [100, 149, 237]],
  ["cornsilk", [255, 248, 220]],
  ["crimson", [237, 20, 61]],
  ["cyan", [0, 255, 255]],
  ["darkblue", [0, 0, 139]],
  ["darkcyan", [0, 139, 139]],
  ["darkgoldenrod", [184, 134, 11]],
  ["darkgray", [169, 169, 169]],
  ["darkgrey", [169, 169, 169]],
  ["darkgreen", [0, 100, 0]],
  ["darkkhaki", [189, 183, 107]],
  ["darkmagenta", [139, 0, 139]],
  ["darkolivegreen", [85, 107, 47]],
  ["darkorange", [255, 140, 0]],
  ["darkorchid", [153, 50, 204]],
  ["darkred", [139, 0, 0]],
  ["darksalmon", [233, 150, 122]],
  ["darkseagreen", [143, 188, 143]],
  ["darkslateblue", [72, 61, 139]],
  ["darkslategray", [47, 79, 79]],
  ["darkslategrey", [47, 79, 79]],
  ["darkturquoise", [0, 206, 209]],
  ["darkviolet", [148, 0, 211]],
  ["deeppink", [255, 20, 147]],
  ["deepskyblue", [0, 191, 255]],
  ["dimgray", [105, 105, 105]],
  ["dimgrey", [105, 105, 105]],
  ["dodgerblue", [30, 144, 255]],
  ["firebrick", [178, 34, 34]],
  ["floralwhite", [255, 250, 240]],
  ["forestgreen", [34, 139, 34]],
  ["fuchsia", [255, 0, 255]],
  ["gainsboro", [220, 220, 220]],
  ["ghostwhite", [248, 248, 255]],
  ["gold", [255, 215, 0]],
  ["goldenrod", [218, 165, 32]],
  ["gray", [128, 128, 128]],
  ["grey", [128, 128, 128]],
  ["green", [0, 128, 0]],
  ["greenyellow", [173, 255, 47]],
  ["honeydew", [240, 255, 240]],
  ["hotpink", [255, 105, 180]],
  ["indianred", [205, 92, 92]],
  ["indigo", [75, 0, 130]],
  ["ivory", [255, 255, 240]],
  ["khaki", [240, 230, 140]],
  ["lavender", [230, 230, 250]],
  ["lavenderblush", [255, 240, 245]],
  ["lawngreen", [124, 252, 0]],
  ["lemonchiffon", [255, 250, 205]],
  ["lightblue", [173, 216, 230]],
  ["lightcoral", [240, 128, 128]],
  ["lightcyan", [224, 255, 255]],
  ["lightgoldenrodyellow", [250, 250, 210]],
  ["lightgreen", [144, 238, 144]],
  ["lightgray", [211, 211, 211]],
  ["lightgrey", [211, 211, 211]],
  ["lightpink", [255, 182, 193]],
  ["lightsalmon", [255, 160, 122]],
  ["lightseagreen", [32, 178, 170]],
  ["lightskyblue", [135, 206, 250]],
  ["lightslategray", [119, 136, 153]],
  ["lightslategrey", [119, 136, 153]],
  ["lightsteelblue", [176, 196, 222]],
  ["lightyellow", [255, 255, 224]],
  ["lime", [0, 255, 0]],
  ["limegreen", [50, 205, 50]],
  ["linen", [250, 240, 230]],
  ["magenta", [255, 0, 255]],
  ["maroon", [128, 0, 0]],
  ["mediumaquamarine", [102, 205, 170]],
  ["mediumblue", [0, 0, 205]],
  ["mediumorchid", [186, 85, 211]],
  ["mediumpurple", [147, 112, 219]],
  ["mediumseagreen", [60, 179, 113]],
  ["mediumslateblue", [123, 104, 238]],
  ["mediumspringgreen", [0, 250, 154]],
  ["mediumturquoise", [72, 209, 204]],
  ["mediumvioletred", [199, 21, 133]],
  ["midnightblue", [25, 25, 112]],
  ["mintcream", [245, 255, 250]],
  ["mistyrose", [255, 228, 225]],
  ["moccasin", [255, 228, 181]],
  ["navajowhite", [255, 222, 173]],
  ["navy", [0, 0, 128]],
  ["oldlace", [253, 245, 230]],
  ["olive", [128, 128, 0]],
  ["olivedrab", [107, 142, 35]],
  ["orange", [255, 165, 0]],
  ["orangered", [255, 69, 0]],
  ["orchid", [218, 112, 214]],
  ["palegoldenrod", [238, 232, 170]],
  ["palegreen", [152, 251, 152]],
  ["paleturquoise", [175, 238, 238]],
  ["palevioletred", [219, 112, 147]],
  ["papayawhip", [255, 239, 213]],
  ["peachpuff", [255, 218, 185]],
  ["peru", [205, 133, 63]],
  ["pink", [255, 192, 203]],
  ["plum", [221, 160, 221]],
  ["powderblue", [176, 224, 230]],
  ["purple", [128, 0, 128]],
  ["rebeccapurple", [102, 51, 153]],
  ["red", [255, 0, 0]],
  ["rosybrown", [188, 143, 143]],
  ["royalblue", [65, 105, 225]],
  ["saddlebrown", [139, 69, 19]],
  ["salmon", [250, 128, 114]],
  ["sandybrown", [244, 164, 96]],
  ["seagreen", [46, 139, 87]],
  ["seashell", [255, 245, 238]],
  ["sienna", [160, 82, 45]],
  ["silver", [192, 192, 192]],
  ["skyblue", [135, 206, 235]],
  ["slateblue", [106, 90, 205]],
  ["slategray", [112, 128, 144]],
  ["slategrey", [112, 128, 144]],
  ["snow", [255, 250, 250]],
  ["springgreen", [0, 255, 127]],
  ["steelblue", [70, 130, 180]],
  ["tan", [210, 180, 140]],
  ["teal", [0, 128, 128]],
  ["thistle", [216, 191, 216]],
  ["tomato", [255, 99, 71]],
  ["turquoise", [64, 224, 208]],
  ["violet", [238, 130, 238]],
  ["wheat", [245, 222, 179]],
  ["white", [255, 255, 255]],
  ["whitesmoke", [245, 245, 245]],
  ["yellow", [255, 255, 0]],
  ["yellowgreen", [154, 205, 50]],
  ["transparent", [0, 0, 0, 0]]
];
console.assert(COLOR_TO_RGBA_ENTRIES.every(([nickname]) => nickname.toLowerCase() === nickname), "All color nicknames must be lowercase.");
var Nicknames = new Map(COLOR_TO_RGBA_ENTRIES);
var RGBAToNickname = new Map(
  // Default opacity to 1 if the color only specified 3 channels
  COLOR_TO_RGBA_ENTRIES.map(([nickname, [r, g, b, a = 1]]) => {
    return [String([r, g, b, a]), nickname];
  })
);
var LAYOUT_LINES_HIGHLIGHT_COLOR = [127, 32, 210];
var PageHighlight = {
  Content: Legacy.fromRGBA([111, 168, 220, 0.66]),
  ContentLight: Legacy.fromRGBA([111, 168, 220, 0.5]),
  ContentOutline: Legacy.fromRGBA([9, 83, 148]),
  Padding: Legacy.fromRGBA([147, 196, 125, 0.55]),
  PaddingLight: Legacy.fromRGBA([147, 196, 125, 0.4]),
  Border: Legacy.fromRGBA([255, 229, 153, 0.66]),
  BorderLight: Legacy.fromRGBA([255, 229, 153, 0.5]),
  Margin: Legacy.fromRGBA([246, 178, 107, 0.66]),
  MarginLight: Legacy.fromRGBA([246, 178, 107, 0.5]),
  EventTarget: Legacy.fromRGBA([255, 196, 196, 0.66]),
  Shape: Legacy.fromRGBA([96, 82, 177, 0.8]),
  ShapeMargin: Legacy.fromRGBA([96, 82, 127, 0.6]),
  CssGrid: Legacy.fromRGBA([75, 0, 130, 1]),
  LayoutLine: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 1]),
  GridBorder: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 1]),
  GapBackground: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 0.3]),
  GapHatch: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 0.8]),
  GridAreaBorder: Legacy.fromRGBA([26, 115, 232, 1])
};
var SourceOrderHighlight = {
  ParentOutline: Legacy.fromRGBA([224, 90, 183, 1]),
  ChildOutline: Legacy.fromRGBA([0, 120, 212, 1])
};
var IsolationModeHighlight = {
  Resizer: Legacy.fromRGBA([222, 225, 230, 1]),
  // --color-background-elevation-2
  ResizerHandle: Legacy.fromRGBA([166, 166, 166, 1]),
  Mask: Legacy.fromRGBA([248, 249, 249, 1])
};
var Generator = class {
  #hueSpace;
  #satSpace;
  #lightnessSpace;
  #alphaSpace;
  #colors = /* @__PURE__ */ new Map();
  constructor(hueSpace, satSpace, lightnessSpace, alphaSpace) {
    this.#hueSpace = hueSpace || { min: 0, max: 360, count: void 0 };
    this.#satSpace = satSpace || 67;
    this.#lightnessSpace = lightnessSpace || 80;
    this.#alphaSpace = alphaSpace || 1;
  }
  setColorForID(id, color) {
    this.#colors.set(id, color);
  }
  colorForID(id) {
    let color = this.#colors.get(id);
    if (!color) {
      color = this.generateColorForID(id);
      this.#colors.set(id, color);
    }
    return color;
  }
  generateColorForID(id) {
    const hash = Platform.StringUtilities.hashCode(id);
    const h = this.indexToValueInSpace(hash, this.#hueSpace);
    const s = this.indexToValueInSpace(hash >> 8, this.#satSpace);
    const l = this.indexToValueInSpace(hash >> 16, this.#lightnessSpace);
    const a = this.indexToValueInSpace(hash >> 24, this.#alphaSpace);
    const start = `hsl(${h}deg ${s}% ${l}%`;
    if (a !== 1) {
      return `${start} / ${Math.floor(a * 100)}%)`;
    }
    return `${start})`;
  }
  indexToValueInSpace(index, space) {
    if (typeof space === "number") {
      return space;
    }
    const count = space.count || space.max - space.min;
    index %= count;
    return space.min + Math.floor(index / (count - 1) * (space.max - space.min));
  }
};

// gen/front_end/core/common/Console.js
var Console_exports = {};
__export(Console_exports, {
  Console: () => Console,
  FrontendMessageSource: () => FrontendMessageSource,
  Message: () => Message
});

// gen/front_end/core/common/Object.js
var Object_exports = {};
__export(Object_exports, {
  ObjectWrapper: () => ObjectWrapper,
  eventMixin: () => eventMixin
});
var ObjectWrapper = class {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners;
  addEventListener(eventType, listener, thisObject) {
    if (!this.listeners) {
      this.listeners = /* @__PURE__ */ new Map();
    }
    let listenersForEventType = this.listeners.get(eventType);
    if (!listenersForEventType) {
      listenersForEventType = /* @__PURE__ */ new Set();
      this.listeners.set(eventType, listenersForEventType);
    }
    listenersForEventType.add({ thisObject, listener });
    return { eventTarget: this, eventType, thisObject, listener };
  }
  once(eventType) {
    return new Promise((resolve) => {
      const descriptor = this.addEventListener(eventType, (event) => {
        this.removeEventListener(eventType, descriptor.listener);
        resolve(event.data);
      });
    });
  }
  removeEventListener(eventType, listener, thisObject) {
    const listeners = this.listeners?.get(eventType);
    if (!listeners) {
      return;
    }
    for (const listenerTuple of listeners) {
      if (listenerTuple.listener === listener && listenerTuple.thisObject === thisObject) {
        listenerTuple.disposed = true;
        listeners.delete(listenerTuple);
      }
    }
    if (!listeners.size) {
      this.listeners?.delete(eventType);
    }
  }
  hasEventListeners(eventType) {
    return Boolean(this.listeners?.has(eventType));
  }
  dispatchEventToListeners(eventType, ...[eventData]) {
    const listeners = this.listeners?.get(eventType);
    if (!listeners) {
      return;
    }
    const event = { data: eventData, source: this };
    for (const listener of [...listeners]) {
      if (!listener.disposed) {
        listener.listener.call(listener.thisObject, event);
      }
    }
  }
};
function eventMixin(base) {
  console.assert(base !== HTMLElement);
  return class EventHandling extends base {
    #events = new ObjectWrapper();
    addEventListener(eventType, listener, thisObject) {
      return this.#events.addEventListener(eventType, listener, thisObject);
    }
    once(eventType) {
      return this.#events.once(eventType);
    }
    removeEventListener(eventType, listener, thisObject) {
      this.#events.removeEventListener(eventType, listener, thisObject);
    }
    hasEventListeners(eventType) {
      return this.#events.hasEventListeners(eventType);
    }
    dispatchEventToListeners(eventType, ...eventData) {
      this.#events.dispatchEventToListeners(eventType, ...eventData);
    }
  };
}

// gen/front_end/core/common/Revealer.js
var Revealer_exports = {};
__export(Revealer_exports, {
  RevealerDestination: () => RevealerDestination,
  RevealerRegistry: () => RevealerRegistry,
  registerRevealer: () => registerRevealer,
  reveal: () => reveal,
  revealDestination: () => revealDestination
});
import * as i18n from "./../i18n/i18n.js";
var UIStrings = {
  /**
   * @description The UI destination when right clicking an item that can be revealed
   */
  elementsPanel: "Elements panel",
  /**
   * @description The UI destination when right clicking an item that can be revealed
   */
  stylesSidebar: "styles sidebar",
  /**
   * @description The UI destination when right clicking an item that can be revealed
   */
  changesDrawer: "Changes drawer",
  /**
   * @description The UI destination when right clicking an item that can be revealed
   */
  issuesView: "Issues view",
  /**
   * @description The UI destination when right clicking an item that can be revealed
   */
  networkPanel: "Network panel",
  /**
   * @description The UI destination when right clicking an item that can be revealed
   */
  requestConditionsDrawer: "Request conditions drawer",
  /**
   * @description The UI destination when right clicking an item that can be revealed
   */
  applicationPanel: "Application panel",
  /**
   * @description The UI destination when right clicking an item that can be revealed
   */
  securityPanel: "Security panel",
  /**
   * @description The UI destination when right clicking an item that can be revealed
   */
  sourcesPanel: "Sources panel",
  /**
   * @description The UI destination when right clicking an item that can be revealed
   */
  timelinePanel: "Performance panel",
  /**
   * @description The UI destination when right clicking an item that can be revealed
   */
  memoryInspectorPanel: "Memory inspector panel",
  /**
   * @description The UI destination when revealing loaded resources through the Developer Resources Panel
   */
  developerResourcesPanel: "Developer Resources panel",
  /**
   * @description The UI destination when revealing loaded resources through the Animations panel
   */
  animationsPanel: "Animations panel"
};
var str_ = i18n.i18n.registerUIStrings("core/common/Revealer.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var revealerRegistry;
var RevealerRegistry = class _RevealerRegistry {
  registeredRevealers = [];
  /**
   * Yields the singleton instance, creating it on-demand when necessary.
   *
   * @returns the singleton instance.
   */
  static instance() {
    if (revealerRegistry === void 0) {
      revealerRegistry = new _RevealerRegistry();
    }
    return revealerRegistry;
  }
  /**
   * Clears the singleton instance (if any).
   */
  static removeInstance() {
    revealerRegistry = void 0;
  }
  /**
   * Register a new `Revealer` as described by the `registration`.
   *
   * @param registration the description.
   */
  register(registration) {
    this.registeredRevealers.push(registration);
  }
  /**
   * Reveals the `revealable`.
   *
   * @param revealable the object to reveal.
   * @param omitFocus whether to omit focusing on the presentation of `revealable` afterwards.
   */
  async reveal(revealable, omitFocus) {
    const revealers = await Promise.all(this.getApplicableRegisteredRevealers(revealable).map((registration) => registration.loadRevealer()));
    if (revealers.length < 1) {
      throw new Error(`No revealers found for ${revealable}`);
    }
    if (revealers.length > 1) {
      throw new Error(`Conflicting reveals found for ${revealable}`);
    }
    return await revealers[0].reveal(revealable, omitFocus);
  }
  getApplicableRegisteredRevealers(revealable) {
    return this.registeredRevealers.filter((registration) => {
      for (const contextType of registration.contextTypes()) {
        if (revealable instanceof contextType) {
          return true;
        }
      }
      return false;
    });
  }
};
function revealDestination(revealable) {
  const revealers = RevealerRegistry.instance().getApplicableRegisteredRevealers(revealable);
  for (const { destination } of revealers) {
    if (destination) {
      return destination();
    }
  }
  return null;
}
function registerRevealer(registration) {
  RevealerRegistry.instance().register(registration);
}
async function reveal(revealable, omitFocus = false) {
  await RevealerRegistry.instance().reveal(revealable, omitFocus);
}
var RevealerDestination = {
  DEVELOPER_RESOURCES_PANEL: i18nLazyString(UIStrings.developerResourcesPanel),
  ELEMENTS_PANEL: i18nLazyString(UIStrings.elementsPanel),
  STYLES_SIDEBAR: i18nLazyString(UIStrings.stylesSidebar),
  CHANGES_DRAWER: i18nLazyString(UIStrings.changesDrawer),
  ISSUES_VIEW: i18nLazyString(UIStrings.issuesView),
  NETWORK_PANEL: i18nLazyString(UIStrings.networkPanel),
  REQUEST_CONDITIONS_DRAWER: i18nLazyString(UIStrings.requestConditionsDrawer),
  TIMELINE_PANEL: i18nLazyString(UIStrings.timelinePanel),
  APPLICATION_PANEL: i18nLazyString(UIStrings.applicationPanel),
  SOURCES_PANEL: i18nLazyString(UIStrings.sourcesPanel),
  SECURITY_PANEL: i18nLazyString(UIStrings.securityPanel),
  MEMORY_INSPECTOR_PANEL: i18nLazyString(UIStrings.memoryInspectorPanel),
  ANIMATIONS_PANEL: i18nLazyString(UIStrings.animationsPanel)
};

// gen/front_end/core/common/Console.js
var consoleInstance;
var Console = class _Console extends ObjectWrapper {
  #messages = [];
  static instance(opts) {
    if (!consoleInstance || opts?.forceNew) {
      consoleInstance = new _Console();
    }
    return consoleInstance;
  }
  static removeInstance() {
    consoleInstance = void 0;
  }
  /**
   * Add a message to the Console panel.
   *
   * @param text the message text.
   * @param level the message level.
   * @param show whether to show the Console panel (if it's not already shown).
   * @param source the message source.
   */
  addMessage(text, level = "info", show = false, source) {
    const message = new Message(text, level, Date.now(), show, source);
    this.#messages.push(message);
    this.dispatchEventToListeners("messageAdded", message);
  }
  log(text) {
    this.addMessage(
      text,
      "info"
      /* MessageLevel.INFO */
    );
  }
  warn(text, source) {
    this.addMessage(text, "warning", void 0, source);
  }
  /**
   * Adds an error message to the Console panel.
   *
   * @param text the message text.
   * @param show whether to show the Console panel (if it's not already shown).
   */
  error(text, show = true) {
    this.addMessage(text, "error", show);
  }
  messages() {
    return this.#messages;
  }
  show() {
    void this.showPromise();
  }
  showPromise() {
    return reveal(this);
  }
};
var FrontendMessageSource;
(function(FrontendMessageSource2) {
  FrontendMessageSource2["CSS"] = "css";
  FrontendMessageSource2["ConsoleAPI"] = "console-api";
  FrontendMessageSource2["ISSUE_PANEL"] = "issue-panel";
  FrontendMessageSource2["SELF_XSS"] = "self-xss";
})(FrontendMessageSource || (FrontendMessageSource = {}));
var Message = class {
  text;
  level;
  timestamp;
  show;
  source;
  constructor(text, level, timestamp, show, source) {
    this.text = text;
    this.level = level;
    this.timestamp = typeof timestamp === "number" ? timestamp : Date.now();
    this.show = show;
    if (source) {
      this.source = source;
    }
  }
};

// gen/front_end/core/common/Debouncer.js
var Debouncer_exports = {};
__export(Debouncer_exports, {
  debounce: () => debounce
});
var debounce = function(func, delay) {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
  return debounced;
};

// gen/front_end/core/common/EventTarget.js
var EventTarget_exports = {};
__export(EventTarget_exports, {
  fireEvent: () => fireEvent,
  removeEventListeners: () => removeEventListeners
});
function removeEventListeners(eventList) {
  for (const eventInfo of eventList) {
    eventInfo.eventTarget.removeEventListener(eventInfo.eventType, eventInfo.listener, eventInfo.thisObject);
  }
  eventList.splice(0);
}
function fireEvent(name, detail = {}, target = window) {
  const evt = new CustomEvent(name, { bubbles: true, cancelable: true, detail });
  target.dispatchEvent(evt);
}

// gen/front_end/core/common/Gzip.js
var Gzip_exports = {};
__export(Gzip_exports, {
  arrayBufferToString: () => arrayBufferToString,
  compress: () => compress,
  compressStream: () => compressStream,
  decompress: () => decompress,
  decompressStream: () => decompressStream,
  fileToString: () => fileToString,
  isGzip: () => isGzip
});
function isGzip(ab) {
  const buf = new Uint8Array(ab);
  if (!buf || buf.length < 3) {
    return false;
  }
  return buf[0] === 31 && buf[1] === 139 && buf[2] === 8;
}
async function arrayBufferToString(ab) {
  if (isGzip(ab)) {
    return await decompress(ab);
  }
  const str = new TextDecoder("utf-8").decode(ab);
  return str;
}
async function fileToString(file) {
  let stream = file.stream();
  if (file.type.endsWith("gzip")) {
    stream = decompressStream(stream);
  }
  const arrayBuffer = await new Response(stream).arrayBuffer();
  const str = new TextDecoder("utf-8").decode(arrayBuffer);
  return str;
}
async function decompress(gzippedBuffer) {
  const buffer = await gzipCodec(gzippedBuffer, new DecompressionStream("gzip"));
  const str = new TextDecoder("utf-8").decode(buffer);
  return str;
}
async function compress(str) {
  const encoded = new TextEncoder().encode(str);
  const buffer = await gzipCodec(encoded, new CompressionStream("gzip"));
  return buffer;
}
async function gzipCodec(buffer, codecStream) {
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer);
      controller.close();
    }
  });
  const codecReadable = readable.pipeThrough(codecStream);
  return await new Response(codecReadable).arrayBuffer();
}
function decompressStream(stream) {
  const ds = new DecompressionStream("gzip");
  return stream.pipeThrough(ds);
}
function compressStream(stream) {
  const cs = new CompressionStream("gzip");
  return stream.pipeThrough(cs);
}

// gen/front_end/core/common/JavaScriptMetaData.js
var JavaScriptMetaData_exports = {};

// gen/front_end/core/common/Lazy.js
var Lazy_exports = {};
__export(Lazy_exports, {
  lazy: () => lazy
});
var UNINITIALIZED = Symbol("uninitialized");
var ERROR_STATE = Symbol("error");
function lazy(producer) {
  let value = UNINITIALIZED;
  let error = new Error("Initial");
  return () => {
    if (value === ERROR_STATE) {
      throw error;
    } else if (value !== UNINITIALIZED) {
      return value;
    }
    try {
      value = producer();
      return value;
    } catch (err) {
      error = err instanceof Error ? err : new Error(err);
      value = ERROR_STATE;
      throw error;
    }
  };
}

// gen/front_end/core/common/Linkifier.js
var Linkifier_exports = {};
__export(Linkifier_exports, {
  Linkifier: () => Linkifier,
  getApplicableRegisteredlinkifiers: () => getApplicableRegisteredlinkifiers,
  registerLinkifier: () => registerLinkifier
});
var Linkifier = class {
  static async linkify(object, options) {
    if (!object) {
      throw new Error("Can't linkify " + object);
    }
    const linkifierRegistration = getApplicableRegisteredlinkifiers(object)[0];
    if (!linkifierRegistration) {
      throw new Error("No linkifiers registered for object " + object);
    }
    const linkifier = await linkifierRegistration.loadLinkifier();
    return linkifier.linkify(object, options);
  }
};
var registeredLinkifiers = [];
function registerLinkifier(registration) {
  registeredLinkifiers.push(registration);
}
function getApplicableRegisteredlinkifiers(object) {
  return registeredLinkifiers.filter(isLinkifierApplicableToContextTypes);
  function isLinkifierApplicableToContextTypes(linkifierRegistration) {
    if (!linkifierRegistration.contextTypes) {
      return true;
    }
    for (const contextType of linkifierRegistration.contextTypes()) {
      if (object instanceof contextType) {
        return true;
      }
    }
    return false;
  }
}

// gen/front_end/core/common/MapWithDefault.js
var MapWithDefault_exports = {};
__export(MapWithDefault_exports, {
  MapWithDefault: () => MapWithDefault
});
var MapWithDefault = class extends Map {
  getOrInsert(key, defaultValue) {
    if (!this.has(key)) {
      this.set(key, defaultValue);
    }
    return this.get(key);
  }
  getOrInsertComputed(key, callbackFunction) {
    if (!this.has(key)) {
      this.set(key, callbackFunction(key));
    }
    return this.get(key);
  }
};

// gen/front_end/core/common/Mutex.js
var Mutex_exports = {};
__export(Mutex_exports, {
  Mutex: () => Mutex
});
var Mutex = class {
  #locked = false;
  #acquirers = [];
  // This is FIFO.
  acquire() {
    const state = { resolved: false };
    if (this.#locked) {
      return new Promise((resolve) => {
        this.#acquirers.push(() => resolve(this.#release.bind(this, state)));
      });
    }
    this.#locked = true;
    return Promise.resolve(this.#release.bind(this, state));
  }
  #release(state) {
    if (state.resolved) {
      throw new Error("Cannot release more than once.");
    }
    state.resolved = true;
    const resolve = this.#acquirers.shift();
    if (!resolve) {
      this.#locked = false;
      return;
    }
    resolve();
  }
  async run(action) {
    const release = await this.acquire();
    try {
      const result = await action();
      return result;
    } finally {
      release();
    }
  }
};

// gen/front_end/core/common/ParsedURL.js
var ParsedURL_exports = {};
__export(ParsedURL_exports, {
  ParsedURL: () => ParsedURL,
  normalizePath: () => normalizePath,
  schemeIs: () => schemeIs
});
import * as Platform2 from "./../platform/platform.js";
function normalizePath(path) {
  if (path.indexOf("..") === -1 && path.indexOf(".") === -1) {
    return path;
  }
  const segments = (path[0] === "/" ? path.substring(1) : path).split("/");
  const normalizedSegments = [];
  for (const segment of segments) {
    if (segment === ".") {
      continue;
    } else if (segment === "..") {
      normalizedSegments.pop();
    } else {
      normalizedSegments.push(segment);
    }
  }
  let normalizedPath = normalizedSegments.join("/");
  if (path[0] === "/" && normalizedPath) {
    normalizedPath = "/" + normalizedPath;
  }
  if (normalizedPath[normalizedPath.length - 1] !== "/" && (path[path.length - 1] === "/" || segments[segments.length - 1] === "." || segments[segments.length - 1] === "..")) {
    normalizedPath = normalizedPath + "/";
  }
  return normalizedPath;
}
function schemeIs(url, scheme) {
  try {
    return new URL(url).protocol === scheme;
  } catch {
    return false;
  }
}
var ParsedURL = class _ParsedURL {
  isValid = false;
  url;
  scheme = "";
  user = "";
  host = "";
  port = "";
  path = "";
  queryParams = "";
  fragment = "";
  folderPathComponents = "";
  lastPathComponent = "";
  blobInnerScheme;
  #displayName;
  #dataURLDisplayName;
  constructor(url) {
    this.url = url;
    const isBlobUrl = this.url.startsWith("blob:");
    const urlToMatch = isBlobUrl ? url.substring(5) : url;
    const match = urlToMatch.match(_ParsedURL.urlRegex());
    if (match) {
      this.isValid = true;
      if (isBlobUrl) {
        this.blobInnerScheme = match[2].toLowerCase();
        this.scheme = "blob";
      } else {
        this.scheme = match[2].toLowerCase();
      }
      this.user = match[3] ?? "";
      this.host = match[4] ?? "";
      this.port = match[5] ?? "";
      this.path = match[6] ?? "/";
      this.queryParams = match[7] ?? "";
      this.fragment = match[8] ?? "";
    } else {
      if (this.url.startsWith("data:")) {
        this.scheme = "data";
        return;
      }
      if (this.url.startsWith("blob:")) {
        this.scheme = "blob";
        return;
      }
      if (this.url === "about:blank") {
        this.scheme = "about";
        return;
      }
      this.path = this.url;
    }
    const lastSlashExceptTrailingIndex = this.path.lastIndexOf("/", this.path.length - 2);
    if (lastSlashExceptTrailingIndex !== -1) {
      this.lastPathComponent = this.path.substring(lastSlashExceptTrailingIndex + 1);
    } else {
      this.lastPathComponent = this.path;
    }
    const lastSlashIndex = this.path.lastIndexOf("/");
    if (lastSlashIndex !== -1) {
      this.folderPathComponents = this.path.substring(0, lastSlashIndex);
    }
  }
  static fromString(string) {
    const parsedURL = new _ParsedURL(string.toString());
    if (parsedURL.isValid) {
      return parsedURL;
    }
    return null;
  }
  static preEncodeSpecialCharactersInPath(path) {
    for (const specialChar of ["%", ";", "#", "?", " "]) {
      path = path.replaceAll(specialChar, encodeURIComponent(specialChar));
    }
    return path;
  }
  static rawPathToEncodedPathString(path) {
    const partiallyEncoded = _ParsedURL.preEncodeSpecialCharactersInPath(path);
    if (path.startsWith("/")) {
      return new URL(partiallyEncoded, "file:///").pathname;
    }
    return new URL("/" + partiallyEncoded, "file:///").pathname.substr(1);
  }
  /**
   * @param name Must not be encoded
   */
  static encodedFromParentPathAndName(parentPath, name) {
    return _ParsedURL.concatenate(parentPath, "/", _ParsedURL.preEncodeSpecialCharactersInPath(name));
  }
  /**
   * @param name Must not be encoded
   */
  static urlFromParentUrlAndName(parentUrl, name) {
    return _ParsedURL.concatenate(parentUrl, "/", _ParsedURL.preEncodeSpecialCharactersInPath(name));
  }
  static encodedPathToRawPathString(encPath) {
    return decodeURIComponent(encPath);
  }
  static rawPathToUrlString(fileSystemPath) {
    let preEncodedPath = _ParsedURL.preEncodeSpecialCharactersInPath(fileSystemPath.replace(/\\/g, "/"));
    preEncodedPath = preEncodedPath.replace(/\\/g, "/");
    if (!preEncodedPath.startsWith("file://")) {
      if (preEncodedPath.startsWith("/")) {
        preEncodedPath = "file://" + preEncodedPath;
      } else {
        preEncodedPath = "file:///" + preEncodedPath;
      }
    }
    return new URL(preEncodedPath).toString();
  }
  static relativePathToUrlString(relativePath, baseURL) {
    const preEncodedPath = _ParsedURL.preEncodeSpecialCharactersInPath(relativePath.replace(/\\/g, "/"));
    return new URL(preEncodedPath, baseURL).toString();
  }
  static urlToRawPathString(fileURL, isWindows) {
    console.assert(fileURL.startsWith("file://"), "This must be a file URL.");
    const decodedFileURL = decodeURIComponent(fileURL);
    if (isWindows) {
      return decodedFileURL.substr("file:///".length).replace(/\//g, "\\");
    }
    return decodedFileURL.substr("file://".length);
  }
  static sliceUrlToEncodedPathString(url, start) {
    return url.substring(start);
  }
  static substr(devToolsPath, from, length) {
    return devToolsPath.substr(from, length);
  }
  static substring(devToolsPath, start, end) {
    return devToolsPath.substring(start, end);
  }
  static prepend(prefix, devToolsPath) {
    return prefix + devToolsPath;
  }
  static concatenate(devToolsPath, ...appendage) {
    return devToolsPath.concat(...appendage);
  }
  static trim(devToolsPath) {
    return devToolsPath.trim();
  }
  static slice(devToolsPath, start, end) {
    return devToolsPath.slice(start, end);
  }
  static join(devToolsPaths, separator) {
    return devToolsPaths.join(separator);
  }
  static split(devToolsPath, separator, limit) {
    return devToolsPath.split(separator, limit);
  }
  static toLowerCase(devToolsPath) {
    return devToolsPath.toLowerCase();
  }
  static isValidUrlString(str) {
    return new _ParsedURL(str).isValid;
  }
  static urlWithoutHash(url) {
    const hashIndex = url.indexOf("#");
    if (hashIndex !== -1) {
      return url.substr(0, hashIndex);
    }
    return url;
  }
  static urlRegex() {
    if (_ParsedURL.urlRegexInstance) {
      return _ParsedURL.urlRegexInstance;
    }
    const schemeRegex = /([A-Za-z][A-Za-z0-9+.-]*):\/\//;
    const userRegex = /(?:([A-Za-z0-9\-._~%!$&'()*+,;=:]*)@)?/;
    const hostRegex = /((?:\[::\d?\])|(?:[^\s\/:]*))/;
    const portRegex = /(?::([\d]+))?/;
    const pathRegex = /(\/[^#?]*)?/;
    const queryRegex = /(?:\?([^#]*))?/;
    const fragmentRegex = /(?:#(.*))?/;
    _ParsedURL.urlRegexInstance = new RegExp("^(" + schemeRegex.source + userRegex.source + hostRegex.source + portRegex.source + ")" + pathRegex.source + queryRegex.source + fragmentRegex.source + "$");
    return _ParsedURL.urlRegexInstance;
  }
  static extractPath(url) {
    const parsedURL = this.fromString(url);
    return parsedURL ? parsedURL.path : "";
  }
  static extractOrigin(url) {
    const parsedURL = this.fromString(url);
    return parsedURL ? parsedURL.securityOrigin() : Platform2.DevToolsPath.EmptyUrlString;
  }
  static extractExtension(url) {
    url = _ParsedURL.urlWithoutHash(url);
    const indexOfQuestionMark = url.indexOf("?");
    if (indexOfQuestionMark !== -1) {
      url = url.substr(0, indexOfQuestionMark);
    }
    const lastIndexOfSlash = url.lastIndexOf("/");
    if (lastIndexOfSlash !== -1) {
      url = url.substr(lastIndexOfSlash + 1);
    }
    const lastIndexOfDot = url.lastIndexOf(".");
    if (lastIndexOfDot !== -1) {
      url = url.substr(lastIndexOfDot + 1);
      const lastIndexOfPercent = url.indexOf("%");
      if (lastIndexOfPercent !== -1) {
        return url.substr(0, lastIndexOfPercent);
      }
      return url;
    }
    return "";
  }
  static extractName(url) {
    let index = url.lastIndexOf("/");
    const pathAndQuery = index !== -1 ? url.substr(index + 1) : url;
    index = pathAndQuery.indexOf("?");
    return index < 0 ? pathAndQuery : pathAndQuery.substr(0, index);
  }
  static completeURL(baseURL, href) {
    if (href.startsWith("data:") || href.startsWith("blob:") || href.startsWith("javascript:") || href.startsWith("mailto:")) {
      return href;
    }
    const trimmedHref = href.trim();
    const parsedHref = this.fromString(trimmedHref);
    if (parsedHref?.scheme) {
      const securityOrigin2 = parsedHref.securityOrigin();
      const pathText2 = normalizePath(parsedHref.path);
      const queryText2 = parsedHref.queryParams && `?${parsedHref.queryParams}`;
      const fragmentText = parsedHref.fragment && `#${parsedHref.fragment}`;
      return securityOrigin2 + pathText2 + queryText2 + fragmentText;
    }
    const parsedURL = this.fromString(baseURL);
    if (!parsedURL) {
      return null;
    }
    if (parsedURL.isDataURL()) {
      return href;
    }
    if (href.length > 1 && href.charAt(0) === "/" && href.charAt(1) === "/") {
      return parsedURL.scheme + ":" + href;
    }
    const securityOrigin = parsedURL.securityOrigin();
    const pathText = parsedURL.path;
    const queryText = parsedURL.queryParams ? "?" + parsedURL.queryParams : "";
    if (!href.length) {
      return securityOrigin + pathText + queryText;
    }
    if (href.charAt(0) === "#") {
      return securityOrigin + pathText + queryText + href;
    }
    if (href.charAt(0) === "?") {
      return securityOrigin + pathText + href;
    }
    const hrefMatches = href.match(/^[^#?]*/);
    if (!hrefMatches || !href.length) {
      throw new Error("Invalid href");
    }
    let hrefPath = hrefMatches[0];
    const hrefSuffix = href.substring(hrefPath.length);
    if (hrefPath.charAt(0) !== "/") {
      hrefPath = parsedURL.folderPathComponents + "/" + hrefPath;
    }
    return securityOrigin + normalizePath(hrefPath) + hrefSuffix;
  }
  static splitLineAndColumn(string) {
    const beforePathMatch = string.match(_ParsedURL.urlRegex());
    let beforePath = "";
    let pathAndAfter = string;
    if (beforePathMatch) {
      beforePath = beforePathMatch[1];
      pathAndAfter = string.substring(beforePathMatch[1].length);
    }
    const lineColumnRegEx = /(?::(\d+))?(?::(\d+))?$/;
    const lineColumnMatch = lineColumnRegEx.exec(pathAndAfter);
    let lineNumber;
    let columnNumber;
    console.assert(Boolean(lineColumnMatch));
    if (!lineColumnMatch) {
      return { url: string, lineNumber: 0, columnNumber: 0 };
    }
    if (typeof lineColumnMatch[1] === "string") {
      lineNumber = parseInt(lineColumnMatch[1], 10);
      lineNumber = isNaN(lineNumber) ? void 0 : lineNumber - 1;
    }
    if (typeof lineColumnMatch[2] === "string") {
      columnNumber = parseInt(lineColumnMatch[2], 10);
      columnNumber = isNaN(columnNumber) ? void 0 : columnNumber - 1;
    }
    let url = beforePath + pathAndAfter.substring(0, pathAndAfter.length - lineColumnMatch[0].length);
    if (lineColumnMatch[1] === void 0 && lineColumnMatch[2] === void 0) {
      const wasmCodeOffsetRegex = /wasm-function\[\d+\]:0x([a-z0-9]+)$/g;
      const wasmCodeOffsetMatch = wasmCodeOffsetRegex.exec(pathAndAfter);
      if (wasmCodeOffsetMatch && typeof wasmCodeOffsetMatch[1] === "string") {
        url = _ParsedURL.removeWasmFunctionInfoFromURL(url);
        columnNumber = parseInt(wasmCodeOffsetMatch[1], 16);
        columnNumber = isNaN(columnNumber) ? void 0 : columnNumber;
      }
    }
    return { url, lineNumber, columnNumber };
  }
  static removeWasmFunctionInfoFromURL(url) {
    const wasmFunctionRegEx = /:wasm-function\[\d+\]/;
    const wasmFunctionIndex = url.search(wasmFunctionRegEx);
    if (wasmFunctionIndex === -1) {
      return url;
    }
    return _ParsedURL.substring(url, 0, wasmFunctionIndex);
  }
  static beginsWithWindowsDriveLetter(url) {
    return /^[A-Za-z]:/.test(url);
  }
  static beginsWithScheme(url) {
    return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(url);
  }
  static isRelativeURL(url) {
    return !this.beginsWithScheme(url) || this.beginsWithWindowsDriveLetter(url);
  }
  get displayName() {
    if (this.#displayName) {
      return this.#displayName;
    }
    if (this.isDataURL()) {
      return this.dataURLDisplayName();
    }
    if (this.isBlobURL()) {
      return this.url;
    }
    if (this.isAboutBlank()) {
      return this.url;
    }
    this.#displayName = this.lastPathComponent;
    if (!this.#displayName) {
      this.#displayName = (this.host || "") + "/";
    }
    if (this.#displayName === "/") {
      this.#displayName = this.url;
    }
    return this.#displayName;
  }
  dataURLDisplayName() {
    if (this.#dataURLDisplayName) {
      return this.#dataURLDisplayName;
    }
    if (!this.isDataURL()) {
      return "";
    }
    this.#dataURLDisplayName = Platform2.StringUtilities.trimEndWithMaxLength(this.url, 20);
    return this.#dataURLDisplayName;
  }
  isAboutBlank() {
    return this.url === "about:blank";
  }
  isDataURL() {
    return this.scheme === "data";
  }
  extractDataUrlMimeType() {
    const regexp = /^data:((?<type>\w+)\/(?<subtype>\w+))?(;base64)?,/;
    const match = this.url.match(regexp);
    return {
      type: match?.groups?.type,
      subtype: match?.groups?.subtype
    };
  }
  isBlobURL() {
    return this.url.startsWith("blob:");
  }
  lastPathComponentWithFragment() {
    return this.lastPathComponent + (this.fragment ? "#" + this.fragment : "");
  }
  domain() {
    if (this.isDataURL()) {
      return "data:";
    }
    return this.host + (this.port ? ":" + this.port : "");
  }
  securityOrigin() {
    if (this.isDataURL()) {
      return "data:";
    }
    const scheme = this.isBlobURL() ? this.blobInnerScheme : this.scheme;
    return scheme + "://" + this.domain();
  }
  urlWithoutScheme() {
    if (this.scheme && this.url.startsWith(this.scheme + "://")) {
      return this.url.substring(this.scheme.length + 3);
    }
    return this.url;
  }
  static urlRegexInstance = null;
};

// gen/front_end/core/common/Progress.js
var Progress_exports = {};
__export(Progress_exports, {
  CompositeProgress: () => CompositeProgress,
  Progress: () => Progress,
  ProgressProxy: () => ProgressProxy,
  SubProgress: () => SubProgress
});
var Progress = class {
  totalWork = 0;
  worked = 0;
  title = void 0;
  canceled = false;
  done = false;
};
var CompositeProgress = class {
  parent;
  #children;
  #childrenDone;
  constructor(parent) {
    this.parent = parent;
    this.#children = [];
    this.#childrenDone = 0;
    this.parent.totalWork = 1;
    this.parent.worked = 0;
  }
  childDone() {
    if (++this.#childrenDone !== this.#children.length) {
      return;
    }
    this.parent.done = true;
  }
  createSubProgress(weight) {
    const child = new SubProgress(this, weight);
    this.#children.push(child);
    return child;
  }
  update() {
    let totalWeights = 0;
    let done = 0;
    for (let i = 0; i < this.#children.length; ++i) {
      const child = this.#children[i];
      if (child.totalWork) {
        done += child.weight * child.worked / child.totalWork;
      }
      totalWeights += child.weight;
    }
    this.parent.worked = done / totalWeights;
  }
};
var SubProgress = class {
  #composite;
  #weight;
  #worked;
  #totalWork;
  constructor(composite, weight) {
    this.#composite = composite;
    this.#weight = weight || 1;
    this.#worked = 0;
    this.#totalWork = 0;
  }
  get canceled() {
    return this.#composite.parent.canceled;
  }
  set title(title) {
    this.#composite.parent.title = title;
  }
  set done(done) {
    if (!done) {
      return;
    }
    this.worked = this.#totalWork;
    this.#composite.childDone();
  }
  set totalWork(totalWork) {
    this.#totalWork = totalWork;
    this.#composite.update();
  }
  set worked(worked) {
    this.#worked = worked;
    this.#composite.update();
  }
  get weight() {
    return this.#weight;
  }
  get worked() {
    return this.#worked;
  }
  get totalWork() {
    return this.#totalWork;
  }
};
var ProgressProxy = class {
  #delegate;
  #doneCallback;
  #updateCallback;
  constructor(delegate, doneCallback, updateCallback) {
    this.#delegate = delegate;
    this.#doneCallback = doneCallback;
    this.#updateCallback = updateCallback;
  }
  get canceled() {
    return this.#delegate ? this.#delegate.canceled : false;
  }
  set title(title) {
    if (this.#delegate) {
      this.#delegate.title = title;
    }
    if (this.#updateCallback) {
      this.#updateCallback();
    }
  }
  get title() {
    return this.#delegate?.title ?? "";
  }
  set done(done) {
    if (this.#delegate) {
      this.#delegate.done = done;
    }
    if (done && this.#doneCallback) {
      this.#doneCallback();
    }
  }
  get done() {
    return this.#delegate ? this.#delegate.done : false;
  }
  set totalWork(totalWork) {
    if (this.#delegate) {
      this.#delegate.totalWork = totalWork;
    }
    if (this.#updateCallback) {
      this.#updateCallback();
    }
  }
  get totalWork() {
    return this.#delegate ? this.#delegate.totalWork : 0;
  }
  set worked(worked) {
    if (this.#delegate) {
      this.#delegate.worked = worked;
    }
    if (this.#updateCallback) {
      this.#updateCallback?.();
    }
  }
  get worked() {
    return this.#delegate ? this.#delegate.worked : 0;
  }
};

// gen/front_end/core/common/QueryParamHandler.js
var QueryParamHandler_exports = {};

// gen/front_end/core/common/ResolverBase.js
var ResolverBase_exports = {};
__export(ResolverBase_exports, {
  ResolverBase: () => ResolverBase
});
var ResolverBase = class {
  #unresolvedIds = /* @__PURE__ */ new Map();
  /**
   * Returns a promise that resolves once the `id` can be resolved to an object.
   */
  async waitFor(id) {
    const obj = this.getForId(id);
    if (!obj) {
      return await this.getOrCreatePromise(id);
    }
    return obj;
  }
  /**
   * Resolve the `id`. Returns the object immediately if it can be resolved,
   * and otherwise waits for the object to appear and calls `callback` once
   * it is resolved.
   */
  tryGet(id, callback) {
    const obj = this.getForId(id);
    if (!obj) {
      const swallowTheError = () => {
      };
      void this.getOrCreatePromise(id).catch(swallowTheError).then((obj2) => {
        if (obj2) {
          callback(obj2);
        }
      });
      return null;
    }
    return obj;
  }
  /**
   * Aborts all waiting and rejects all unresolved promises.
   */
  clear() {
    this.stopListening();
    for (const [id, { reject }] of this.#unresolvedIds.entries()) {
      reject(new Error(`Object with ${id} never resolved.`));
    }
    this.#unresolvedIds.clear();
  }
  getOrCreatePromise(id) {
    const promiseInfo = this.#unresolvedIds.get(id);
    if (promiseInfo) {
      return promiseInfo.promise;
    }
    const { resolve, reject, promise } = Promise.withResolvers();
    this.#unresolvedIds.set(id, { promise, resolve, reject });
    this.startListening();
    return promise;
  }
  onResolve(id, t) {
    const promiseInfo = this.#unresolvedIds.get(id);
    this.#unresolvedIds.delete(id);
    if (this.#unresolvedIds.size === 0) {
      this.stopListening();
    }
    promiseInfo?.resolve(t);
  }
};

// gen/front_end/core/common/ResourceType.js
var ResourceType_exports = {};
__export(ResourceType_exports, {
  ResourceCategory: () => ResourceCategory,
  ResourceType: () => ResourceType,
  mimeTypeByExtension: () => mimeTypeByExtension,
  resourceCategories: () => resourceCategories,
  resourceTypeByExtension: () => resourceTypeByExtension,
  resourceTypes: () => resourceTypes
});
import * as i18n3 from "./../i18n/i18n.js";
var UIStrings2 = {
  /**
   * @description Text that appears in a tooltip the fetch and xhr resource types filter.
   */
  fetchAndXHR: "`Fetch` and `XHR`",
  /**
   * @description Text that appears in a tooltip for the JavaScript types filter.
   */
  javascript: "JavaScript",
  /**
   * @description Text that appears on a button for the JavaScript resource type filter.
   */
  js: "JS",
  /**
   * @description Text that appears on a button for the css resource type filter.
   */
  css: "CSS",
  /**
   * @description Text that appears on a button for the image resource type filter.
   */
  img: "Img",
  /**
   * @description Text that appears on a button for the media resource type filter.
   */
  media: "Media",
  /**
   * @description Text that appears on a button for the font resource type filter.
   */
  font: "Font",
  /**
   * @description Text that appears on a button for the document resource type filter.
   */
  doc: "Doc",
  /**
   * @description Text that appears on a button for the websocket, webtransport, directsocket resource type filter.
   */
  socketShort: "Socket",
  /**
   * @description Text that appears in a tooltip for the WebAssembly types filter.
   */
  webassembly: "WebAssembly",
  /**
   * @description Text that appears on a button for the WebAssembly resource type filter.
   */
  wasm: "Wasm",
  /**
   * @description Text that appears on a button for the manifest resource type filter.
   */
  manifest: "Manifest",
  /**
   * @description Text for other types of items
   */
  other: "Other",
  /**
   * @description Name of a network resource type
   */
  document: "Document",
  /**
   * @description Name of a network resource type
   */
  stylesheet: "Stylesheet",
  /**
   * @description Text in Image View of the Sources panel
   */
  image: "Image",
  /**
   * @description Label for a group of JavaScript files
   */
  script: "Script",
  /**
   * @description Name of a network resource type
   */
  texttrack: "TextTrack",
  /**
   * @description Name of a network resource type
   */
  fetch: "Fetch",
  /**
   * @description Name of a network resource type
   */
  eventsource: "EventSource",
  /**
   * @description Name of a network resource type
   */
  websocket: "WebSocket",
  /**
   * @description Name of a network resource type
   */
  webtransport: "WebTransport",
  /**
   * @description Name of a network resource type
   */
  directsocket: "DirectSocket",
  /**
   * @description Name of a network resource type
   */
  signedexchange: "SignedExchange",
  /**
   * @description Name of a network resource type
   */
  ping: "Ping",
  /**
   * @description Name of a network resource type
   */
  cspviolationreport: "CSPViolationReport",
  /**
   * @description Name of a network initiator type
   */
  preflight: "Preflight",
  /**
   * @description Name of a network initiator type for FedCM requests
   */
  fedcm: "FedCM"
};
var str_2 = i18n3.i18n.registerUIStrings("core/common/ResourceType.ts", UIStrings2);
var i18nLazyString2 = i18n3.i18n.getLazilyComputedLocalizedString.bind(void 0, str_2);
var ResourceType = class {
  #name;
  #title;
  #category;
  #isTextType;
  constructor(name, title, category, isTextType) {
    this.#name = name;
    this.#title = title;
    this.#category = category;
    this.#isTextType = isTextType;
  }
  static fromMimeType(mimeType) {
    if (!mimeType) {
      return resourceTypes.Other;
    }
    if (mimeType.startsWith("text/html")) {
      return resourceTypes.Document;
    }
    if (mimeType.startsWith("text/css")) {
      return resourceTypes.Stylesheet;
    }
    if (mimeType.startsWith("image/")) {
      return resourceTypes.Image;
    }
    if (mimeType.startsWith("text/")) {
      return resourceTypes.Script;
    }
    if (mimeType.includes("font")) {
      return resourceTypes.Font;
    }
    if (mimeType.includes("script")) {
      return resourceTypes.Script;
    }
    if (mimeType.includes("octet")) {
      return resourceTypes.Other;
    }
    if (mimeType.includes("application")) {
      return resourceTypes.Script;
    }
    return resourceTypes.Other;
  }
  static fromMimeTypeOverride(mimeType) {
    if (mimeType === "application/manifest+json") {
      return resourceTypes.Manifest;
    }
    if (mimeType === "application/wasm") {
      return resourceTypes.Wasm;
    }
    return null;
  }
  static fromURL(url) {
    return resourceTypeByExtension.get(ParsedURL.extractExtension(url)) || null;
  }
  static fromName(name) {
    for (const resourceType of Object.values(resourceTypes)) {
      if (resourceType.name() === name) {
        return resourceType;
      }
    }
    return null;
  }
  static mimeFromURL(url) {
    if (url.startsWith("snippet://") || url.startsWith("debugger://")) {
      return "text/javascript";
    }
    const name = ParsedURL.extractName(url);
    if (mimeTypeByName.has(name)) {
      return mimeTypeByName.get(name);
    }
    let ext = ParsedURL.extractExtension(url).toLowerCase();
    if (ext === "html" && name.endsWith(".component.html")) {
      ext = "component.html";
    }
    return mimeTypeByExtension.get(ext);
  }
  static mimeFromExtension(ext) {
    return mimeTypeByExtension.get(ext);
  }
  static simplifyContentType(contentType) {
    const regex = new RegExp("^application(.*json$|/json+.*)");
    return regex.test(contentType) ? "application/json" : contentType;
  }
  /**
   * Adds suffixes iff the mimeType is 'text/javascript' to denote whether the JS is minified or from
   * a source map.
   */
  static mediaTypeForMetrics(mimeType, isFromSourceMap, isMinified, isSnippet, isDebugger) {
    if (mimeType !== "text/javascript") {
      return mimeType;
    }
    if (isFromSourceMap) {
      return "text/javascript+sourcemapped";
    }
    if (isMinified) {
      return "text/javascript+minified";
    }
    if (isSnippet) {
      return "text/javascript+snippet";
    }
    if (isDebugger) {
      return "text/javascript+eval";
    }
    return "text/javascript+plain";
  }
  name() {
    return this.#name;
  }
  title() {
    return this.#title();
  }
  category() {
    return this.#category;
  }
  isTextType() {
    return this.#isTextType;
  }
  isScript() {
    return this.#name === "script" || this.#name === "sm-script";
  }
  hasScripts() {
    return this.isScript() || this.isDocument();
  }
  isStyleSheet() {
    return this.#name === "stylesheet" || this.#name === "sm-stylesheet";
  }
  hasStyleSheets() {
    return this.isStyleSheet() || this.isDocument();
  }
  isDocument() {
    return this.#name === "document";
  }
  isDocumentOrScriptOrStyleSheet() {
    return this.isDocument() || this.isScript() || this.isStyleSheet();
  }
  isFont() {
    return this.#name === "font";
  }
  isImage() {
    return this.#name === "image";
  }
  isFromSourceMap() {
    return this.#name.startsWith("sm-");
  }
  toString() {
    return this.#name;
  }
  canonicalMimeType() {
    if (this.isDocument()) {
      return "text/html";
    }
    if (this.isScript()) {
      return "text/javascript";
    }
    if (this.isStyleSheet()) {
      return "text/css";
    }
    return "";
  }
};
var ResourceCategory = class {
  name;
  title;
  shortTitle;
  constructor(name, title, shortTitle) {
    this.name = name;
    this.title = title;
    this.shortTitle = shortTitle;
  }
};
var resourceCategories = {
  XHR: new ResourceCategory("Fetch and XHR", i18nLazyString2(UIStrings2.fetchAndXHR), i18n3.i18n.lockedLazyString("Fetch/XHR")),
  Document: new ResourceCategory(UIStrings2.document, i18nLazyString2(UIStrings2.document), i18nLazyString2(UIStrings2.doc)),
  Stylesheet: new ResourceCategory(UIStrings2.css, i18nLazyString2(UIStrings2.css), i18nLazyString2(UIStrings2.css)),
  Script: new ResourceCategory(UIStrings2.javascript, i18nLazyString2(UIStrings2.javascript), i18nLazyString2(UIStrings2.js)),
  Font: new ResourceCategory(UIStrings2.font, i18nLazyString2(UIStrings2.font), i18nLazyString2(UIStrings2.font)),
  Image: new ResourceCategory(UIStrings2.image, i18nLazyString2(UIStrings2.image), i18nLazyString2(UIStrings2.img)),
  Media: new ResourceCategory(UIStrings2.media, i18nLazyString2(UIStrings2.media), i18nLazyString2(UIStrings2.media)),
  Manifest: new ResourceCategory(UIStrings2.manifest, i18nLazyString2(UIStrings2.manifest), i18nLazyString2(UIStrings2.manifest)),
  Socket: new ResourceCategory("Socket", i18n3.i18n.lockedLazyString("WebSocket | WebTransport | DirectSocket"), i18nLazyString2(UIStrings2.socketShort)),
  Wasm: new ResourceCategory(UIStrings2.webassembly, i18nLazyString2(UIStrings2.webassembly), i18nLazyString2(UIStrings2.wasm)),
  Other: new ResourceCategory(UIStrings2.other, i18nLazyString2(UIStrings2.other), i18nLazyString2(UIStrings2.other))
};
var resourceTypes = {
  Document: new ResourceType("document", i18nLazyString2(UIStrings2.document), resourceCategories.Document, true),
  Stylesheet: new ResourceType("stylesheet", i18nLazyString2(UIStrings2.stylesheet), resourceCategories.Stylesheet, true),
  Image: new ResourceType("image", i18nLazyString2(UIStrings2.image), resourceCategories.Image, false),
  Media: new ResourceType("media", i18nLazyString2(UIStrings2.media), resourceCategories.Media, false),
  Font: new ResourceType("font", i18nLazyString2(UIStrings2.font), resourceCategories.Font, false),
  Script: new ResourceType("script", i18nLazyString2(UIStrings2.script), resourceCategories.Script, true),
  TextTrack: new ResourceType("texttrack", i18nLazyString2(UIStrings2.texttrack), resourceCategories.Other, true),
  XHR: new ResourceType("xhr", i18n3.i18n.lockedLazyString("XHR"), resourceCategories.XHR, true),
  Fetch: new ResourceType("fetch", i18nLazyString2(UIStrings2.fetch), resourceCategories.XHR, true),
  Prefetch: new ResourceType("prefetch", i18n3.i18n.lockedLazyString("Prefetch"), resourceCategories.Document, true),
  EventSource: new ResourceType("eventsource", i18nLazyString2(UIStrings2.eventsource), resourceCategories.XHR, true),
  WebSocket: new ResourceType("websocket", i18nLazyString2(UIStrings2.websocket), resourceCategories.Socket, false),
  WebTransport: new ResourceType("webtransport", i18nLazyString2(UIStrings2.webtransport), resourceCategories.Socket, false),
  DirectSocket: new ResourceType("directsocket", i18nLazyString2(UIStrings2.directsocket), resourceCategories.Socket, false),
  Wasm: new ResourceType("wasm", i18nLazyString2(UIStrings2.wasm), resourceCategories.Wasm, false),
  Manifest: new ResourceType("manifest", i18nLazyString2(UIStrings2.manifest), resourceCategories.Manifest, true),
  SignedExchange: new ResourceType("signed-exchange", i18nLazyString2(UIStrings2.signedexchange), resourceCategories.Other, false),
  Ping: new ResourceType("ping", i18nLazyString2(UIStrings2.ping), resourceCategories.Other, false),
  CSPViolationReport: new ResourceType("csp-violation-report", i18nLazyString2(UIStrings2.cspviolationreport), resourceCategories.Other, false),
  Other: new ResourceType("other", i18nLazyString2(UIStrings2.other), resourceCategories.Other, false),
  Preflight: new ResourceType("preflight", i18nLazyString2(UIStrings2.preflight), resourceCategories.Other, true),
  SourceMapScript: new ResourceType("sm-script", i18nLazyString2(UIStrings2.script), resourceCategories.Script, true),
  SourceMapStyleSheet: new ResourceType("sm-stylesheet", i18nLazyString2(UIStrings2.stylesheet), resourceCategories.Stylesheet, true),
  FedCM: new ResourceType("fedcm", i18nLazyString2(UIStrings2.fedcm), resourceCategories.Other, false)
};
var mimeTypeByName = /* @__PURE__ */ new Map([
  // CoffeeScript
  ["Cakefile", "text/x-coffeescript"]
]);
var resourceTypeByExtension = /* @__PURE__ */ new Map([
  ["js", resourceTypes.Script],
  ["mjs", resourceTypes.Script],
  ["css", resourceTypes.Stylesheet],
  ["xsl", resourceTypes.Stylesheet],
  ["avif", resourceTypes.Image],
  ["bmp", resourceTypes.Image],
  ["gif", resourceTypes.Image],
  ["ico", resourceTypes.Image],
  ["jpeg", resourceTypes.Image],
  ["jpg", resourceTypes.Image],
  ["jxl", resourceTypes.Image],
  ["png", resourceTypes.Image],
  ["svg", resourceTypes.Image],
  ["tif", resourceTypes.Image],
  ["tiff", resourceTypes.Image],
  ["vue", resourceTypes.Document],
  ["webmanifest", resourceTypes.Manifest],
  ["webp", resourceTypes.Media],
  ["otf", resourceTypes.Font],
  ["ttc", resourceTypes.Font],
  ["ttf", resourceTypes.Font],
  ["woff", resourceTypes.Font],
  ["woff2", resourceTypes.Font],
  ["wasm", resourceTypes.Wasm]
]);
var mimeTypeByExtension = /* @__PURE__ */ new Map([
  // Web extensions
  ["js", "text/javascript"],
  ["mjs", "text/javascript"],
  ["css", "text/css"],
  ["html", "text/html"],
  ["htm", "text/html"],
  ["xml", "application/xml"],
  ["xsl", "application/xml"],
  ["wasm", "application/wasm"],
  ["webmanifest", "application/manifest+json"],
  // HTML Embedded Scripts, ASP], JSP
  ["asp", "application/x-aspx"],
  ["aspx", "application/x-aspx"],
  ["jsp", "application/x-jsp"],
  // C/C++
  ["c", "text/x-c++src"],
  ["cc", "text/x-c++src"],
  ["cpp", "text/x-c++src"],
  ["h", "text/x-c++src"],
  ["m", "text/x-c++src"],
  ["mm", "text/x-c++src"],
  // CoffeeScript
  ["coffee", "text/x-coffeescript"],
  // Dart
  ["dart", "application/vnd.dart"],
  // TypeScript
  ["ts", "text/typescript"],
  ["tsx", "text/typescript-jsx"],
  // JSON
  ["json", "application/json"],
  ["gyp", "application/json"],
  ["gypi", "application/json"],
  ["map", "application/json"],
  // C#
  ["cs", "text/x-csharp"],
  // Go
  ["go", "text/x-go"],
  // Java
  ["java", "text/x-java"],
  // Kotlin
  ["kt", "text/x-kotlin"],
  // Scala
  ["scala", "text/x-scala"],
  // Less
  ["less", "text/x-less"],
  // PHP
  ["php", "application/x-httpd-php"],
  ["phtml", "application/x-httpd-php"],
  // Python
  ["py", "text/x-python"],
  // Shell
  ["sh", "text/x-sh"],
  // Google Stylesheets (GSS)
  ["gss", "text/x-gss"],
  // SASS (.sass & .scss)
  ["sass", "text/x-sass"],
  ["scss", "text/x-scss"],
  // Video Text Tracks.
  ["vtt", "text/vtt"],
  // LiveScript
  ["ls", "text/x-livescript"],
  // Markdown
  ["md", "text/markdown"],
  // ClojureScript
  ["cljs", "text/x-clojure"],
  ["cljc", "text/x-clojure"],
  ["cljx", "text/x-clojure"],
  // Stylus
  ["styl", "text/x-styl"],
  // JSX
  ["jsx", "text/jsx"],
  // Image
  ["avif", "image/avif"],
  ["bmp", "image/bmp"],
  ["gif", "image/gif"],
  ["ico", "image/ico"],
  ["jpeg", "image/jpeg"],
  ["jpg", "image/jpeg"],
  ["jxl", "image/jxl"],
  ["png", "image/png"],
  ["svg", "image/svg+xml"],
  ["tif", "image/tif"],
  ["tiff", "image/tiff"],
  ["webp", "image/webp"],
  // Font
  ["otf", "font/otf"],
  ["ttc", "font/collection"],
  ["ttf", "font/ttf"],
  ["woff", "font/woff"],
  ["woff2", "font/woff2"],
  // Angular
  ["component.html", "text/x.angular"],
  // Svelte
  ["svelte", "text/x.svelte"],
  // Vue
  ["vue", "text/x.vue"]
]);

// gen/front_end/core/common/ReturnToPanel.js
var ReturnToPanel_exports = {};
__export(ReturnToPanel_exports, {
  ReturnToPanelFlavor: () => ReturnToPanelFlavor
});
var ReturnToPanelFlavor = class {
  viewId;
  constructor(viewId) {
    this.viewId = viewId;
  }
};

// gen/front_end/core/common/Runnable.js
var Runnable_exports = {};
__export(Runnable_exports, {
  earlyInitializationRunnables: () => earlyInitializationRunnables,
  lateInitializationRunnables: () => lateInitializationRunnables,
  maybeRemoveLateInitializationRunnable: () => maybeRemoveLateInitializationRunnable,
  registerEarlyInitializationRunnable: () => registerEarlyInitializationRunnable,
  registerLateInitializationRunnable: () => registerLateInitializationRunnable
});
var registeredLateInitializationRunnables = /* @__PURE__ */ new Map();
function registerLateInitializationRunnable(setting) {
  const { id, loadRunnable } = setting;
  if (registeredLateInitializationRunnables.has(id)) {
    throw new Error(`Duplicate late Initializable runnable id '${id}'`);
  }
  registeredLateInitializationRunnables.set(id, loadRunnable);
}
function maybeRemoveLateInitializationRunnable(runnableId) {
  return registeredLateInitializationRunnables.delete(runnableId);
}
function lateInitializationRunnables() {
  return [...registeredLateInitializationRunnables.values()];
}
var registeredEarlyInitializationRunnables = [];
function registerEarlyInitializationRunnable(runnable) {
  registeredEarlyInitializationRunnables.push(runnable);
}
function earlyInitializationRunnables() {
  return registeredEarlyInitializationRunnables;
}

// gen/front_end/core/common/SegmentedRange.js
var SegmentedRange_exports = {};
__export(SegmentedRange_exports, {
  Segment: () => Segment,
  SegmentedRange: () => SegmentedRange
});
import * as Platform3 from "./../platform/platform.js";
var Segment = class {
  begin;
  end;
  data;
  constructor(begin, end, data) {
    if (begin > end) {
      throw new Error("Invalid segment");
    }
    this.begin = begin;
    this.end = end;
    this.data = data;
  }
  intersects(that) {
    return this.begin < that.end && that.begin < this.end;
  }
};
var SegmentedRange = class {
  #segments = [];
  #mergeCallback;
  constructor(mergeCallback) {
    this.#mergeCallback = mergeCallback;
  }
  append(newSegment) {
    let startIndex = Platform3.ArrayUtilities.lowerBound(this.#segments, newSegment, (a, b) => a.begin - b.begin);
    let endIndex = startIndex;
    let merged = null;
    if (startIndex > 0) {
      const precedingSegment = this.#segments[startIndex - 1];
      merged = this.tryMerge(precedingSegment, newSegment);
      if (merged) {
        --startIndex;
        newSegment = merged;
      } else if (this.#segments[startIndex - 1].end >= newSegment.begin) {
        if (newSegment.end < precedingSegment.end) {
          this.#segments.splice(startIndex, 0, new Segment(newSegment.end, precedingSegment.end, precedingSegment.data));
        }
        precedingSegment.end = newSegment.begin;
      }
    }
    while (endIndex < this.#segments.length && this.#segments[endIndex].end <= newSegment.end) {
      ++endIndex;
    }
    if (endIndex < this.#segments.length) {
      merged = this.tryMerge(newSegment, this.#segments[endIndex]);
      if (merged) {
        endIndex++;
        newSegment = merged;
      } else if (newSegment.intersects(this.#segments[endIndex])) {
        this.#segments[endIndex].begin = newSegment.end;
      }
    }
    this.#segments.splice(startIndex, endIndex - startIndex, newSegment);
  }
  segments() {
    return this.#segments;
  }
  tryMerge(first, second) {
    const merged = this.#mergeCallback && this.#mergeCallback(first, second);
    if (!merged) {
      return null;
    }
    merged.begin = first.begin;
    merged.end = Math.max(first.end, second.end);
    return merged;
  }
};

// gen/front_end/core/common/SettingRegistration.js
var SettingRegistration_exports = {};
__export(SettingRegistration_exports, {
  getLocalizedSettingsCategory: () => getLocalizedSettingsCategory,
  getRegisteredSettings: () => getRegisteredSettings,
  maybeRemoveSettingExtension: () => maybeRemoveSettingExtension,
  registerSettingExtension: () => registerSettingExtension,
  registerSettingsForTest: () => registerSettingsForTest,
  resetSettings: () => resetSettings
});
import * as i18n5 from "./../i18n/i18n.js";
import * as Root2 from "./../root/root.js";
var UIStrings3 = {
  /**
   * @description Title of the Elements Panel
   */
  elements: "Elements",
  /**
   * @description Text for DevTools AI
   */
  ai: "AI",
  /**
   * @description Text for DevTools appearance
   */
  appearance: "Appearance",
  /**
   * @description Name of the Sources panel
   */
  sources: "Sources",
  /**
   * @description Title of the Network tool
   */
  network: "Network",
  /**
   * @description Text for the performance of something
   */
  performance: "Performance",
  /**
   * @description Title of the Console tool
   */
  console: "Console",
  /**
   * @description A title of the 'Persistence' setting category
   */
  persistence: "Persistence",
  /**
   * @description Text that refers to the debugger
   */
  debugger: "Debugger",
  /**
   * @description Text describing global shortcuts and settings that are available throughout the DevTools
   */
  global: "Global",
  /**
   * @description Title of the Rendering tool
   */
  rendering: "Rendering",
  /**
   * @description Title of a section on CSS Grid tooling
   */
  grid: "Grid",
  /**
   * @description Text for the mobile platform, as opposed to desktop
   */
  mobile: "Mobile",
  /**
   * @description Text for the memory of the page
   */
  memory: "Memory",
  /**
   * @description Text for the extension of the page
   */
  extension: "Extension",
  /**
   * @description Text for the adorner of the page
   */
  adorner: "Adorner",
  /**
   * @description Header for the "Account" section in the settings UI. The "Account"
   * section allows users see their signed in account and configure which DevTools data is synced via Chrome Sync.
   */
  account: "Account",
  /**
   * @description Text for the privacy section of the page.
   */
  privacy: "Privacy"
};
var str_3 = i18n5.i18n.registerUIStrings("core/common/SettingRegistration.ts", UIStrings3);
var i18nString = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var registeredSettings = [];
var settingNameSet = /* @__PURE__ */ new Set();
function registerSettingExtension(registration) {
  const settingName = registration.settingName;
  if (settingNameSet.has(settingName)) {
    throw new Error(`Duplicate setting name '${settingName}'`);
  }
  settingNameSet.add(settingName);
  registeredSettings.push(registration);
}
function getRegisteredSettings() {
  return registeredSettings.filter((setting) => Root2.Runtime.Runtime.isDescriptorEnabled(setting));
}
function registerSettingsForTest(settings, forceReset = false) {
  if (registeredSettings.length === 0 || forceReset) {
    registeredSettings = settings;
    settingNameSet.clear();
    for (const setting of settings) {
      const settingName = setting.settingName;
      if (settingNameSet.has(settingName)) {
        throw new Error(`Duplicate setting name '${settingName}'`);
      }
      settingNameSet.add(settingName);
    }
  }
}
function resetSettings() {
  registeredSettings = [];
  settingNameSet.clear();
}
function maybeRemoveSettingExtension(settingName) {
  const settingIndex = registeredSettings.findIndex((setting) => setting.settingName === settingName);
  if (settingIndex < 0 || !settingNameSet.delete(settingName)) {
    return false;
  }
  registeredSettings.splice(settingIndex, 1);
  return true;
}
function getLocalizedSettingsCategory(category) {
  switch (category) {
    case "ELEMENTS":
      return i18nString(UIStrings3.elements);
    case "AI":
      return i18nString(UIStrings3.ai);
    case "APPEARANCE":
      return i18nString(UIStrings3.appearance);
    case "SOURCES":
      return i18nString(UIStrings3.sources);
    case "NETWORK":
      return i18nString(UIStrings3.network);
    case "PERFORMANCE":
      return i18nString(UIStrings3.performance);
    case "CONSOLE":
      return i18nString(UIStrings3.console);
    case "PERSISTENCE":
      return i18nString(UIStrings3.persistence);
    case "DEBUGGER":
      return i18nString(UIStrings3.debugger);
    case "GLOBAL":
      return i18nString(UIStrings3.global);
    case "RENDERING":
      return i18nString(UIStrings3.rendering);
    case "GRID":
      return i18nString(UIStrings3.grid);
    case "MOBILE":
      return i18nString(UIStrings3.mobile);
    case "EMULATION":
      return i18nString(UIStrings3.console);
    case "MEMORY":
      return i18nString(UIStrings3.memory);
    case "EXTENSIONS":
      return i18nString(UIStrings3.extension);
    case "ADORNER":
      return i18nString(UIStrings3.adorner);
    case "":
      return i18n5.i18n.lockedString("");
    case "ACCOUNT":
      return i18nString(UIStrings3.account);
    case "PRIVACY":
      return i18nString(UIStrings3.privacy);
  }
}

// gen/front_end/core/common/Settings.js
var Settings_exports = {};
__export(Settings_exports, {
  Deprecation: () => Deprecation,
  NOOP_STORAGE: () => NOOP_STORAGE,
  RegExpSetting: () => RegExpSetting,
  Setting: () => Setting,
  Settings: () => Settings,
  SettingsStorage: () => SettingsStorage,
  VersionController: () => VersionController,
  getLocalizedSettingsCategory: () => getLocalizedSettingsCategory,
  maybeRemoveSettingExtension: () => maybeRemoveSettingExtension,
  moduleSetting: () => moduleSetting,
  registerSettingExtension: () => registerSettingExtension,
  registerSettingsForTest: () => registerSettingsForTest,
  resetSettings: () => resetSettings,
  settingForTest: () => settingForTest
});
import * as Platform4 from "./../platform/platform.js";
import * as Root3 from "./../root/root.js";
var settingsInstance;
var Settings = class _Settings {
  syncedStorage;
  globalStorage;
  localStorage;
  #sessionStorage = new SettingsStorage({});
  settingNameSet = /* @__PURE__ */ new Set();
  orderValuesBySettingCategory = /* @__PURE__ */ new Map();
  #eventSupport = new ObjectWrapper();
  #registry = /* @__PURE__ */ new Map();
  moduleSettings = /* @__PURE__ */ new Map();
  #logSettingAccess;
  constructor(syncedStorage, globalStorage, localStorage, logSettingAccess, runSettingsMigration) {
    this.syncedStorage = syncedStorage;
    this.globalStorage = globalStorage;
    this.localStorage = localStorage;
    this.#logSettingAccess = logSettingAccess;
    for (const registration of this.getRegisteredSettings()) {
      const { settingName, defaultValue, storageType } = registration;
      const isRegex = registration.settingType === "regex";
      const evaluatedDefaultValue = typeof defaultValue === "function" ? defaultValue(Root3.Runtime.hostConfig) : defaultValue;
      const setting = isRegex && typeof evaluatedDefaultValue === "string" ? this.createRegExpSetting(settingName, evaluatedDefaultValue, void 0, storageType) : this.createSetting(settingName, evaluatedDefaultValue, storageType);
      setting.setTitleFunction(registration.title);
      if (registration.userActionCondition) {
        setting.setRequiresUserAction(Boolean(Root3.Runtime.Runtime.queryParam(registration.userActionCondition)));
      }
      setting.setRegistration(registration);
      this.registerModuleSetting(setting);
    }
    if (runSettingsMigration) {
      new VersionController(this).updateVersion();
    }
  }
  getRegisteredSettings() {
    return getRegisteredSettings();
  }
  static hasInstance() {
    return typeof settingsInstance !== "undefined";
  }
  static instance(opts = { forceNew: null, syncedStorage: null, globalStorage: null, localStorage: null }) {
    const { forceNew, syncedStorage, globalStorage, localStorage, logSettingAccess, runSettingsMigration } = opts;
    if (!settingsInstance || forceNew) {
      if (!syncedStorage || !globalStorage || !localStorage) {
        throw new Error(`Unable to create settings: global and local storage must be provided: ${new Error().stack}`);
      }
      settingsInstance = new _Settings(syncedStorage, globalStorage, localStorage, logSettingAccess, runSettingsMigration);
    }
    return settingsInstance;
  }
  static removeInstance() {
    settingsInstance = void 0;
  }
  registerModuleSetting(setting) {
    const settingName = setting.name;
    const category = setting.category();
    const order = setting.order();
    if (this.settingNameSet.has(settingName)) {
      throw new Error(`Duplicate Setting name '${settingName}'`);
    }
    if (category && order) {
      const orderValues = this.orderValuesBySettingCategory.get(category) || /* @__PURE__ */ new Set();
      if (orderValues.has(order)) {
        throw new Error(`Duplicate order value '${order}' for settings category '${category}'`);
      }
      orderValues.add(order);
      this.orderValuesBySettingCategory.set(category, orderValues);
    }
    this.settingNameSet.add(settingName);
    this.moduleSettings.set(setting.name, setting);
  }
  static normalizeSettingName(name) {
    if ([
      VersionController.GLOBAL_VERSION_SETTING_NAME,
      VersionController.SYNCED_VERSION_SETTING_NAME,
      VersionController.LOCAL_VERSION_SETTING_NAME,
      "currentDockState",
      "isUnderTest"
    ].includes(name)) {
      return name;
    }
    return Platform4.StringUtilities.toKebabCase(name);
  }
  /**
   * Prefer a module setting if this setting is one that you might not want to
   * surface to the user to control themselves. Examples of these are settings
   * to store UI state such as how a user choses to position a split widget or
   * which panel they last opened.
   * If you are creating a setting that you expect the user to control, and
   * sync, prefer {@link Settings.createSetting}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  moduleSetting(settingName) {
    const setting = this.moduleSettings.get(settingName);
    if (!setting) {
      throw new Error("No setting registered: " + settingName);
    }
    return setting;
  }
  settingForTest(settingName) {
    const setting = this.#registry.get(settingName);
    if (!setting) {
      throw new Error("No setting registered: " + settingName);
    }
    return setting;
  }
  /**
   * Get setting via key, and create a new setting if the requested setting does not exist.
   * @param key kebab-case string ID
   * @param defaultValue
   * @param storageType If not specified, SettingStorageType.GLOBAL is used.
   */
  createSetting(key, defaultValue, storageType) {
    const storage = this.storageFromType(storageType);
    let setting = this.#registry.get(key);
    if (!setting) {
      setting = new Setting(key, defaultValue, this.#eventSupport, storage, this.#logSettingAccess);
      this.#registry.set(key, setting);
    }
    return setting;
  }
  createLocalSetting(key, defaultValue) {
    return this.createSetting(
      key,
      defaultValue,
      "Local"
      /* SettingStorageType.LOCAL */
    );
  }
  createRegExpSetting(key, defaultValue, regexFlags, storageType) {
    if (!this.#registry.get(key)) {
      this.#registry.set(key, new RegExpSetting(key, defaultValue, this.#eventSupport, this.storageFromType(storageType), regexFlags, this.#logSettingAccess));
    }
    return this.#registry.get(key);
  }
  clearAll() {
    this.globalStorage.removeAll();
    this.syncedStorage.removeAll();
    this.localStorage.removeAll();
    new VersionController(this).resetToCurrent();
  }
  storageFromType(storageType) {
    switch (storageType) {
      case "Local":
        return this.localStorage;
      case "Session":
        return this.#sessionStorage;
      case "Global":
        return this.globalStorage;
      case "Synced":
        return this.syncedStorage;
    }
    return this.globalStorage;
  }
  getRegistry() {
    return this.#registry;
  }
};
var NOOP_STORAGE = {
  register: () => {
  },
  set: () => {
  },
  get: () => Promise.resolve(""),
  remove: () => {
  },
  clear: () => {
  }
};
var SettingsStorage = class {
  object;
  backingStore;
  storagePrefix;
  constructor(object, backingStore = NOOP_STORAGE, storagePrefix = "") {
    this.object = object;
    this.backingStore = backingStore;
    this.storagePrefix = storagePrefix;
  }
  register(name) {
    name = this.storagePrefix + name;
    this.backingStore.register(name);
  }
  set(name, value) {
    name = this.storagePrefix + name;
    this.object[name] = value;
    this.backingStore.set(name, value);
  }
  has(name) {
    name = this.storagePrefix + name;
    return name in this.object;
  }
  get(name) {
    name = this.storagePrefix + name;
    return this.object[name];
  }
  async forceGet(originalName) {
    const name = this.storagePrefix + originalName;
    const value = await this.backingStore.get(name);
    if (value && value !== this.object[name]) {
      this.set(originalName, value);
    } else if (!value) {
      this.remove(originalName);
    }
    return value;
  }
  remove(name) {
    name = this.storagePrefix + name;
    delete this.object[name];
    this.backingStore.remove(name);
  }
  removeAll() {
    this.object = {};
    this.backingStore.clear();
  }
  keys() {
    return Object.keys(this.object);
  }
  dumpSizes() {
    Console.instance().log("Ten largest settings: ");
    const sizes = { __proto__: null };
    for (const key in this.object) {
      sizes[key] = this.object[key].length;
    }
    const keys = Object.keys(sizes);
    function comparator(key1, key2) {
      return sizes[key2] - sizes[key1];
    }
    keys.sort(comparator);
    for (let i = 0; i < 10 && i < keys.length; ++i) {
      Console.instance().log("Setting: '" + keys[i] + "', size: " + sizes[keys[i]]);
    }
  }
};
var Deprecation = class {
  disabled;
  warning;
  experiment;
  constructor({ deprecationNotice }) {
    if (!deprecationNotice) {
      throw new Error("Cannot create deprecation info for a non-deprecated setting");
    }
    this.disabled = deprecationNotice.disabled;
    this.warning = deprecationNotice.warning();
    this.experiment = deprecationNotice.experiment ? Root3.Runtime.experiments.allConfigurableExperiments().find((e) => e.name === deprecationNotice.experiment) : void 0;
  }
};
var Setting = class {
  name;
  defaultValue;
  eventSupport;
  storage;
  #titleFunction;
  #title;
  #registration = null;
  #requiresUserAction;
  #value;
  // TODO(crbug.com/1172300) Type cannot be inferred without changes to consumers. See above.
  #serializer = JSON;
  #hadUserAction;
  #disabled;
  #deprecation = null;
  #loggedInitialAccess = false;
  #logSettingAccess;
  constructor(name, defaultValue, eventSupport, storage, logSettingAccess) {
    this.name = name;
    this.defaultValue = defaultValue;
    this.eventSupport = eventSupport;
    this.storage = storage;
    storage.register(this.name);
    this.#logSettingAccess = logSettingAccess;
  }
  setSerializer(serializer) {
    this.#serializer = serializer;
  }
  addChangeListener(listener, thisObject) {
    return this.eventSupport.addEventListener(this.name, listener, thisObject);
  }
  removeChangeListener(listener, thisObject) {
    this.eventSupport.removeEventListener(this.name, listener, thisObject);
  }
  title() {
    if (this.#title) {
      return this.#title;
    }
    if (this.#titleFunction) {
      return this.#titleFunction();
    }
    return "";
  }
  setTitleFunction(titleFunction) {
    if (titleFunction) {
      this.#titleFunction = titleFunction;
    }
  }
  setTitle(title) {
    this.#title = title;
  }
  setRequiresUserAction(requiresUserAction) {
    this.#requiresUserAction = requiresUserAction;
  }
  disabled() {
    if (this.#registration?.disabledCondition) {
      const { disabled } = this.#registration.disabledCondition(Root3.Runtime.hostConfig);
      if (disabled) {
        return true;
      }
    }
    return this.#disabled || false;
  }
  disabledReasons() {
    if (this.#registration?.disabledCondition) {
      const result = this.#registration.disabledCondition(Root3.Runtime.hostConfig);
      if (result.disabled) {
        return result.reasons;
      }
    }
    return [];
  }
  setDisabled(disabled) {
    this.#disabled = disabled;
    this.eventSupport.dispatchEventToListeners(this.name);
  }
  #maybeLogAccess(value) {
    try {
      const valueToLog = typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : this.#serializer?.stringify(value);
      if (valueToLog !== void 0 && this.#logSettingAccess) {
        void this.#logSettingAccess(this.name, valueToLog);
      }
    } catch {
    }
  }
  #maybeLogInitialAccess(value) {
    if (!this.#loggedInitialAccess) {
      this.#maybeLogAccess(value);
      this.#loggedInitialAccess = true;
    }
  }
  get() {
    if (this.#requiresUserAction && !this.#hadUserAction) {
      this.#maybeLogInitialAccess(this.defaultValue);
      return this.defaultValue;
    }
    if (typeof this.#value !== "undefined") {
      this.#maybeLogInitialAccess(this.#value);
      return this.#value;
    }
    this.#value = this.defaultValue;
    if (this.storage.has(this.name)) {
      try {
        this.#value = this.#serializer.parse(this.storage.get(this.name));
      } catch {
        this.storage.remove(this.name);
      }
    }
    this.#maybeLogInitialAccess(this.#value);
    return this.#value;
  }
  // Prefer this getter for settings which are "disableable". The plain getter returns `this.#value`,
  // even if the setting is disabled, which means the callsite has to explicitly call the `disabled()`
  // getter and add its own logic for the disabled state.
  getIfNotDisabled() {
    if (this.disabled()) {
      return;
    }
    return this.get();
  }
  async forceGet() {
    const name = this.name;
    const oldValue = this.storage.get(name);
    const value = await this.storage.forceGet(name);
    this.#value = this.defaultValue;
    if (value) {
      try {
        this.#value = this.#serializer.parse(value);
      } catch {
        this.storage.remove(this.name);
      }
    }
    if (oldValue !== value) {
      this.eventSupport.dispatchEventToListeners(this.name, this.#value);
    }
    this.#maybeLogInitialAccess(this.#value);
    return this.#value;
  }
  set(value) {
    this.#maybeLogAccess(value);
    this.#hadUserAction = true;
    this.#value = value;
    try {
      const settingString = this.#serializer.stringify(value);
      try {
        this.storage.set(this.name, settingString);
      } catch (e) {
        this.printSettingsSavingError(e.message, settingString);
      }
    } catch (e) {
      Console.instance().error("Cannot stringify setting with name: " + this.name + ", error: " + e.message);
    }
    this.eventSupport.dispatchEventToListeners(this.name, value);
  }
  setRegistration(registration) {
    this.#registration = registration;
    const { deprecationNotice } = registration;
    if (deprecationNotice?.disabled) {
      const experiment = deprecationNotice.experiment ? Root3.Runtime.experiments.allConfigurableExperiments().find((e) => e.name === deprecationNotice.experiment) : void 0;
      if (!experiment || experiment.isEnabled()) {
        this.set(this.defaultValue);
        this.setDisabled(true);
      }
    }
  }
  type() {
    if (this.#registration) {
      return this.#registration.settingType;
    }
    return null;
  }
  options() {
    if (this.#registration && this.#registration.options) {
      return this.#registration.options.map((opt) => {
        const { value, title, text, raw } = opt;
        return {
          value,
          title: title(),
          text: typeof text === "function" ? text() : text,
          raw
        };
      });
    }
    return [];
  }
  reloadRequired() {
    if (this.#registration) {
      return this.#registration.reloadRequired || null;
    }
    return null;
  }
  category() {
    if (this.#registration) {
      return this.#registration.category || null;
    }
    return null;
  }
  tags() {
    if (this.#registration && this.#registration.tags) {
      return this.#registration.tags.map((tag) => tag()).join("\0");
    }
    return null;
  }
  order() {
    if (this.#registration) {
      return this.#registration.order || null;
    }
    return null;
  }
  /**
   * See {@link LearnMore} for more info
   */
  learnMore() {
    return this.#registration?.learnMore ?? null;
  }
  get deprecation() {
    if (!this.#registration || !this.#registration.deprecationNotice) {
      return null;
    }
    if (!this.#deprecation) {
      this.#deprecation = new Deprecation(this.#registration);
    }
    return this.#deprecation;
  }
  printSettingsSavingError(message, value) {
    const errorMessage = "Error saving setting with name: " + this.name + ", value length: " + value.length + ". Error: " + message;
    console.error(errorMessage);
    Console.instance().error(errorMessage);
    this.storage.dumpSizes();
  }
};
var RegExpSetting = class extends Setting {
  #regexFlags;
  #regex;
  constructor(name, defaultValue, eventSupport, storage, regexFlags, logSettingAccess) {
    super(name, defaultValue ? [{ pattern: defaultValue }] : [], eventSupport, storage, logSettingAccess);
    this.#regexFlags = regexFlags;
  }
  get() {
    const result = [];
    const items = this.getAsArray();
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (item.pattern && !item.disabled) {
        result.push(item.pattern);
      }
    }
    return result.join("|");
  }
  getAsArray() {
    return super.get();
  }
  set(value) {
    this.setAsArray([{ pattern: value, disabled: false }]);
  }
  setAsArray(value) {
    this.#regex = void 0;
    super.set(value);
  }
  asRegExp() {
    if (typeof this.#regex !== "undefined") {
      return this.#regex;
    }
    this.#regex = null;
    try {
      const pattern = this.get();
      if (pattern) {
        this.#regex = new RegExp(pattern, this.#regexFlags || "");
      }
    } catch {
    }
    return this.#regex;
  }
};
var VersionController = class _VersionController {
  static GLOBAL_VERSION_SETTING_NAME = "inspectorVersion";
  static SYNCED_VERSION_SETTING_NAME = "syncedInspectorVersion";
  static LOCAL_VERSION_SETTING_NAME = "localInspectorVersion";
  static CURRENT_VERSION = 40;
  #settings;
  #globalVersionSetting;
  #syncedVersionSetting;
  #localVersionSetting;
  constructor(settings) {
    this.#settings = settings;
    this.#globalVersionSetting = this.#settings.createSetting(
      _VersionController.GLOBAL_VERSION_SETTING_NAME,
      _VersionController.CURRENT_VERSION,
      "Global"
      /* SettingStorageType.GLOBAL */
    );
    this.#syncedVersionSetting = this.#settings.createSetting(
      _VersionController.SYNCED_VERSION_SETTING_NAME,
      _VersionController.CURRENT_VERSION,
      "Synced"
      /* SettingStorageType.SYNCED */
    );
    this.#localVersionSetting = this.#settings.createSetting(
      _VersionController.LOCAL_VERSION_SETTING_NAME,
      _VersionController.CURRENT_VERSION,
      "Local"
      /* SettingStorageType.LOCAL */
    );
  }
  /**
   * Force re-sets all version number settings to the current version without
   * running any migrations.
   */
  resetToCurrent() {
    this.#globalVersionSetting.set(_VersionController.CURRENT_VERSION);
    this.#syncedVersionSetting.set(_VersionController.CURRENT_VERSION);
    this.#localVersionSetting.set(_VersionController.CURRENT_VERSION);
  }
  #removeSetting(setting) {
    const name = setting.name;
    this.#settings.getRegistry().delete(name);
    this.#settings.moduleSettings.delete(name);
    setting.storage.remove(name);
  }
  /**
   * Runs the appropriate migrations and updates the version settings accordingly.
   *
   * To determine what migrations to run we take the minimum of all version number settings.
   *
   * IMPORTANT: All migrations must be idempotent since they might be applied multiple times.
   */
  updateVersion() {
    const currentVersion = _VersionController.CURRENT_VERSION;
    const minimumVersion = Math.min(this.#globalVersionSetting.get(), this.#syncedVersionSetting.get(), this.#localVersionSetting.get());
    const methodsToRun = this.methodsToRunToUpdateVersion(minimumVersion, currentVersion);
    console.assert(
      // @ts-expect-error
      this[`updateVersionFrom${currentVersion}To${currentVersion + 1}`] === void 0,
      "Unexpected migration method found. Increment CURRENT_VERSION or remove the method."
    );
    for (const method of methodsToRun) {
      this[method].call(this);
    }
    this.resetToCurrent();
  }
  methodsToRunToUpdateVersion(oldVersion, currentVersion) {
    const result = [];
    for (let i = oldVersion; i < currentVersion; ++i) {
      result.push("updateVersionFrom" + i + "To" + (i + 1));
    }
    return result;
  }
  updateVersionFrom0To1() {
    this.clearBreakpointsWhenTooMany(this.#settings.createLocalSetting("breakpoints", []), 5e5);
  }
  updateVersionFrom1To2() {
    this.#settings.createSetting("previouslyViewedFiles", []).set([]);
  }
  updateVersionFrom2To3() {
    this.#settings.createSetting("fileSystemMapping", {}).set({});
    this.#removeSetting(this.#settings.createSetting("fileMappingEntries", []));
  }
  updateVersionFrom3To4() {
    const advancedMode = this.#settings.createSetting("showHeaSnapshotObjectsHiddenProperties", false);
    this.#settings.moduleSetting("showAdvancedHeapSnapshotProperties").set(advancedMode.get());
    this.#removeSetting(advancedMode);
  }
  updateVersionFrom4To5() {
    const settingNames = {
      FileSystemViewSidebarWidth: "fileSystemViewSplitViewState",
      elementsSidebarWidth: "elementsPanelSplitViewState",
      StylesPaneSplitRatio: "stylesPaneSplitViewState",
      heapSnapshotRetainersViewSize: "heapSnapshotSplitViewState",
      "InspectorView.splitView": "InspectorView.splitViewState",
      "InspectorView.screencastSplitView": "InspectorView.screencastSplitViewState",
      "Inspector.drawerSplitView": "Inspector.drawerSplitViewState",
      layerDetailsSplitView: "layerDetailsSplitViewState",
      networkSidebarWidth: "networkPanelSplitViewState",
      sourcesSidebarWidth: "sourcesPanelSplitViewState",
      scriptsPanelNavigatorSidebarWidth: "sourcesPanelNavigatorSplitViewState",
      sourcesPanelSplitSidebarRatio: "sourcesPanelDebuggerSidebarSplitViewState",
      "timeline-details": "timelinePanelDetailsSplitViewState",
      "timeline-split": "timelinePanelRecorsSplitViewState",
      "timeline-view": "timelinePanelTimelineStackSplitViewState",
      auditsSidebarWidth: "auditsPanelSplitViewState",
      layersSidebarWidth: "layersPanelSplitViewState",
      profilesSidebarWidth: "profilesPanelSplitViewState",
      resourcesSidebarWidth: "resourcesPanelSplitViewState"
    };
    const empty = {};
    for (const oldName in settingNames) {
      const newName = settingNames[oldName];
      const oldNameH = oldName + "H";
      let newValue = null;
      const oldSetting = this.#settings.createSetting(oldName, empty);
      if (oldSetting.get() !== empty) {
        newValue = newValue || {};
        newValue.vertical = {};
        newValue.vertical.size = oldSetting.get();
        this.#removeSetting(oldSetting);
      }
      const oldSettingH = this.#settings.createSetting(oldNameH, empty);
      if (oldSettingH.get() !== empty) {
        newValue = newValue || {};
        newValue.horizontal = {};
        newValue.horizontal.size = oldSettingH.get();
        this.#removeSetting(oldSettingH);
      }
      if (newValue) {
        this.#settings.createSetting(newName, {}).set(newValue);
      }
    }
  }
  updateVersionFrom5To6() {
    const settingNames = {
      debuggerSidebarHidden: "sourcesPanelSplitViewState",
      navigatorHidden: "sourcesPanelNavigatorSplitViewState",
      "WebInspector.Drawer.showOnLoad": "Inspector.drawerSplitViewState"
    };
    for (const oldName in settingNames) {
      const oldSetting = this.#settings.createSetting(oldName, null);
      if (oldSetting.get() === null) {
        this.#removeSetting(oldSetting);
        continue;
      }
      const newName = settingNames[oldName];
      const invert = oldName === "WebInspector.Drawer.showOnLoad";
      const hidden = oldSetting.get() !== invert;
      this.#removeSetting(oldSetting);
      const showMode = hidden ? "OnlyMain" : "Both";
      const newSetting = this.#settings.createSetting(newName, {});
      const newValue = newSetting.get() || {};
      newValue.vertical = newValue.vertical || {};
      newValue.vertical.showMode = showMode;
      newValue.horizontal = newValue.horizontal || {};
      newValue.horizontal.showMode = showMode;
      newSetting.set(newValue);
    }
  }
  updateVersionFrom6To7() {
    const settingNames = {
      sourcesPanelNavigatorSplitViewState: "sourcesPanelNavigatorSplitViewState",
      elementsPanelSplitViewState: "elementsPanelSplitViewState",
      stylesPaneSplitViewState: "stylesPaneSplitViewState",
      sourcesPanelDebuggerSidebarSplitViewState: "sourcesPanelDebuggerSidebarSplitViewState"
    };
    const empty = {};
    for (const name in settingNames) {
      const setting = this.#settings.createSetting(name, empty);
      const value = setting.get();
      if (value === empty) {
        continue;
      }
      if (value.vertical?.size && value.vertical.size < 1) {
        value.vertical.size = 0;
      }
      if (value.horizontal?.size && value.horizontal.size < 1) {
        value.horizontal.size = 0;
      }
      setting.set(value);
    }
  }
  updateVersionFrom7To8() {
  }
  updateVersionFrom8To9() {
    const settingNames = ["skipStackFramesPattern", "workspaceFolderExcludePattern"];
    for (let i = 0; i < settingNames.length; ++i) {
      const setting = this.#settings.createSetting(settingNames[i], "");
      let value = setting.get();
      if (!value) {
        return;
      }
      if (typeof value === "string") {
        value = [value];
      }
      for (let j = 0; j < value.length; ++j) {
        if (typeof value[j] === "string") {
          value[j] = { pattern: value[j] };
        }
      }
      setting.set(value);
    }
  }
  updateVersionFrom9To10() {
    if (!window.localStorage) {
      return;
    }
    for (const key in window.localStorage) {
      if (key.startsWith("revision-history")) {
        window.localStorage.removeItem(key);
      }
    }
  }
  updateVersionFrom10To11() {
    const oldSettingName = "customDevicePresets";
    const newSettingName = "customEmulatedDeviceList";
    const oldSetting = this.#settings.createSetting(oldSettingName, void 0);
    const list = oldSetting.get();
    if (!Array.isArray(list)) {
      return;
    }
    const newList = [];
    for (let i = 0; i < list.length; ++i) {
      const value = list[i];
      const device = {};
      device["title"] = value["title"];
      device["type"] = "unknown";
      device["user-agent"] = value["userAgent"];
      device["capabilities"] = [];
      if (value["touch"]) {
        device["capabilities"].push("touch");
      }
      if (value["mobile"]) {
        device["capabilities"].push("mobile");
      }
      device["screen"] = {};
      device["screen"]["vertical"] = { width: value["width"], height: value["height"] };
      device["screen"]["horizontal"] = { width: value["height"], height: value["width"] };
      device["screen"]["device-pixel-ratio"] = value["deviceScaleFactor"];
      device["modes"] = [];
      device["show-by-default"] = true;
      device["show"] = "Default";
      newList.push(device);
    }
    if (newList.length) {
      this.#settings.createSetting(newSettingName, []).set(newList);
    }
    this.#removeSetting(oldSetting);
  }
  updateVersionFrom11To12() {
    this.migrateSettingsFromLocalStorage();
  }
  updateVersionFrom12To13() {
    this.migrateSettingsFromLocalStorage();
    this.#removeSetting(this.#settings.createSetting("timelineOverviewMode", ""));
  }
  updateVersionFrom13To14() {
    const defaultValue = { throughput: -1, latency: 0 };
    this.#settings.createSetting("networkConditions", defaultValue).set(defaultValue);
  }
  updateVersionFrom14To15() {
    const setting = this.#settings.createLocalSetting("workspaceExcludedFolders", {});
    const oldValue = setting.get();
    const newValue = {};
    for (const fileSystemPath in oldValue) {
      newValue[fileSystemPath] = [];
      for (const entry of oldValue[fileSystemPath]) {
        newValue[fileSystemPath].push(entry.path);
      }
    }
    setting.set(newValue);
  }
  updateVersionFrom15To16() {
    const setting = this.#settings.createSetting("InspectorView.panelOrder", {});
    const tabOrders = setting.get();
    for (const key of Object.keys(tabOrders)) {
      tabOrders[key] = (tabOrders[key] + 1) * 10;
    }
    setting.set(tabOrders);
  }
  updateVersionFrom16To17() {
    const setting = this.#settings.createSetting("networkConditionsCustomProfiles", []);
    const oldValue = setting.get();
    const newValue = [];
    if (Array.isArray(oldValue)) {
      for (const preset of oldValue) {
        if (typeof preset.title === "string" && typeof preset.value === "object" && typeof preset.value.throughput === "number" && typeof preset.value.latency === "number") {
          newValue.push({
            title: preset.title,
            value: { download: preset.value.throughput, upload: preset.value.throughput, latency: preset.value.latency }
          });
        }
      }
    }
    setting.set(newValue);
  }
  updateVersionFrom17To18() {
    const setting = this.#settings.createLocalSetting("workspaceExcludedFolders", {});
    const oldValue = setting.get();
    const newValue = {};
    for (const oldKey in oldValue) {
      let newKey = oldKey.replace(/\\/g, "/");
      if (!newKey.startsWith("file://")) {
        if (newKey.startsWith("/")) {
          newKey = "file://" + newKey;
        } else {
          newKey = "file:///" + newKey;
        }
      }
      newValue[newKey] = oldValue[oldKey];
    }
    setting.set(newValue);
  }
  updateVersionFrom18To19() {
    const defaultColumns = { status: true, type: true, initiator: true, size: true, time: true };
    const visibleColumnSettings = this.#settings.createSetting("networkLogColumnsVisibility", defaultColumns);
    const visibleColumns = visibleColumnSettings.get();
    visibleColumns.name = true;
    visibleColumns.timeline = true;
    const configs = {};
    for (const columnId in visibleColumns) {
      if (!visibleColumns.hasOwnProperty(columnId)) {
        continue;
      }
      configs[columnId.toLowerCase()] = { visible: visibleColumns[columnId] };
    }
    const newSetting = this.#settings.createSetting("networkLogColumns", {});
    newSetting.set(configs);
    this.#removeSetting(visibleColumnSettings);
  }
  updateVersionFrom19To20() {
    const oldSetting = this.#settings.createSetting("InspectorView.panelOrder", {});
    const newSetting = this.#settings.createSetting("panel-tabOrder", {});
    newSetting.set(oldSetting.get());
    this.#removeSetting(oldSetting);
  }
  updateVersionFrom20To21() {
    const networkColumns = this.#settings.createSetting("networkLogColumns", {});
    const columns = networkColumns.get();
    delete columns["timeline"];
    delete columns["waterfall"];
    networkColumns.set(columns);
  }
  updateVersionFrom21To22() {
    const breakpointsSetting = this.#settings.createLocalSetting("breakpoints", []);
    const breakpoints = breakpointsSetting.get();
    for (const breakpoint of breakpoints) {
      breakpoint["url"] = breakpoint["sourceFileId"];
      delete breakpoint["sourceFileId"];
    }
    breakpointsSetting.set(breakpoints);
  }
  updateVersionFrom22To23() {
  }
  updateVersionFrom23To24() {
    const oldSetting = this.#settings.createSetting("searchInContentScripts", false);
    const newSetting = this.#settings.createSetting("searchInAnonymousAndContentScripts", false);
    newSetting.set(oldSetting.get());
    this.#removeSetting(oldSetting);
  }
  updateVersionFrom24To25() {
    const defaultColumns = { status: true, type: true, initiator: true, size: true, time: true };
    const networkLogColumnsSetting = this.#settings.createSetting("networkLogColumns", defaultColumns);
    const columns = networkLogColumnsSetting.get();
    delete columns.product;
    networkLogColumnsSetting.set(columns);
  }
  updateVersionFrom25To26() {
    const oldSetting = this.#settings.createSetting("messageURLFilters", {});
    const urls = Object.keys(oldSetting.get());
    const textFilter = urls.map((url) => `-url:${url}`).join(" ");
    if (textFilter) {
      const textFilterSetting = this.#settings.createSetting("console.textFilter", "");
      const suffix = textFilterSetting.get() ? ` ${textFilterSetting.get()}` : "";
      textFilterSetting.set(`${textFilter}${suffix}`);
    }
    this.#removeSetting(oldSetting);
  }
  updateVersionFrom26To27() {
    const settings = this.#settings;
    function renameKeyInObjectSetting(settingName, from, to) {
      const setting = settings.createSetting(settingName, {});
      const value = setting.get();
      if (from in value) {
        value[to] = value[from];
        delete value[from];
        setting.set(value);
      }
    }
    function renameInStringSetting(settingName, from, to) {
      const setting = settings.createSetting(settingName, "");
      const value = setting.get();
      if (value === from) {
        setting.set(to);
      }
    }
    renameKeyInObjectSetting("panel-tabOrder", "audits2", "audits");
    renameKeyInObjectSetting("panel-closeableTabs", "audits2", "audits");
    renameInStringSetting("panel-selectedTab", "audits2", "audits");
  }
  updateVersionFrom27To28() {
    const setting = this.#settings.createSetting("uiTheme", "systemPreferred");
    if (setting.get() === "default") {
      setting.set("systemPreferred");
    }
  }
  updateVersionFrom28To29() {
    const settings = this.#settings;
    function renameKeyInObjectSetting(settingName, from, to) {
      const setting = settings.createSetting(settingName, {});
      const value = setting.get();
      if (from in value) {
        value[to] = value[from];
        delete value[from];
        setting.set(value);
      }
    }
    function renameInStringSetting(settingName, from, to) {
      const setting = settings.createSetting(settingName, "");
      const value = setting.get();
      if (value === from) {
        setting.set(to);
      }
    }
    renameKeyInObjectSetting("panel-tabOrder", "audits", "lighthouse");
    renameKeyInObjectSetting("panel-closeableTabs", "audits", "lighthouse");
    renameInStringSetting("panel-selectedTab", "audits", "lighthouse");
  }
  updateVersionFrom29To30() {
    const closeableTabSetting = this.#settings.createSetting("closeableTabs", {});
    const panelCloseableTabSetting = this.#settings.createSetting("panel-closeableTabs", {});
    const drawerCloseableTabSetting = this.#settings.createSetting("drawer-view-closeableTabs", {});
    const openTabsInPanel = panelCloseableTabSetting.get();
    const openTabsInDrawer = panelCloseableTabSetting.get();
    const newValue = Object.assign(openTabsInDrawer, openTabsInPanel);
    closeableTabSetting.set(newValue);
    this.#removeSetting(panelCloseableTabSetting);
    this.#removeSetting(drawerCloseableTabSetting);
  }
  updateVersionFrom30To31() {
    const recordingsSetting = this.#settings.createSetting("recorder_recordings", []);
    this.#removeSetting(recordingsSetting);
  }
  updateVersionFrom31To32() {
    const breakpointsSetting = this.#settings.createLocalSetting("breakpoints", []);
    const breakpoints = breakpointsSetting.get();
    for (const breakpoint of breakpoints) {
      breakpoint["resourceTypeName"] = "script";
    }
    breakpointsSetting.set(breakpoints);
  }
  updateVersionFrom32To33() {
    const previouslyViewedFilesSetting = this.#settings.createLocalSetting("previouslyViewedFiles", []);
    let previouslyViewedFiles = previouslyViewedFilesSetting.get();
    previouslyViewedFiles = previouslyViewedFiles.filter((previouslyViewedFile) => "url" in previouslyViewedFile);
    for (const previouslyViewedFile of previouslyViewedFiles) {
      previouslyViewedFile["resourceTypeName"] = "script";
    }
    previouslyViewedFilesSetting.set(previouslyViewedFiles);
  }
  updateVersionFrom33To34() {
    const logpointPrefix = "/** DEVTOOLS_LOGPOINT */ console.log(";
    const logpointSuffix = ")";
    const breakpointsSetting = this.#settings.createLocalSetting("breakpoints", []);
    const breakpoints = breakpointsSetting.get();
    for (const breakpoint of breakpoints) {
      const isLogpoint = breakpoint.condition.startsWith(logpointPrefix) && breakpoint.condition.endsWith(logpointSuffix);
      breakpoint["isLogpoint"] = isLogpoint;
    }
    breakpointsSetting.set(breakpoints);
  }
  updateVersionFrom34To35() {
    const logpointPrefix = "/** DEVTOOLS_LOGPOINT */ console.log(";
    const logpointSuffix = ")";
    const breakpointsSetting = this.#settings.createLocalSetting("breakpoints", []);
    const breakpoints = breakpointsSetting.get();
    for (const breakpoint of breakpoints) {
      const { condition, isLogpoint } = breakpoint;
      if (isLogpoint) {
        breakpoint.condition = condition.slice(logpointPrefix.length, condition.length - logpointSuffix.length);
      }
    }
    breakpointsSetting.set(breakpoints);
  }
  updateVersionFrom35To36() {
    this.#settings.createSetting("showThirdPartyIssues", true).set(true);
  }
  updateVersionFrom36To37() {
    const updateStorage = (storage) => {
      for (const key of storage.keys()) {
        const normalizedKey = Settings.normalizeSettingName(key);
        if (normalizedKey !== key) {
          const value = storage.get(key);
          this.#removeSetting({ name: key, storage });
          storage.set(normalizedKey, value);
        }
      }
    };
    updateStorage(this.#settings.globalStorage);
    updateStorage(this.#settings.syncedStorage);
    updateStorage(this.#settings.localStorage);
    for (const key of this.#settings.globalStorage.keys()) {
      if (key.startsWith("data-grid-") && key.endsWith("-column-weights") || key.endsWith("-tab-order") || key === "views-location-override" || key === "closeable-tabs") {
        const setting = this.#settings.createSetting(key, {});
        setting.set(Platform4.StringUtilities.toKebabCaseKeys(setting.get()));
      }
      if (key.endsWith("-selected-tab")) {
        const setting = this.#settings.createSetting(key, "");
        setting.set(Platform4.StringUtilities.toKebabCase(setting.get()));
      }
    }
  }
  updateVersionFrom37To38() {
    const getConsoleInsightsEnabledSetting = () => {
      try {
        return this.#settings.moduleSetting("console-insights-enabled");
      } catch {
        return;
      }
    };
    const consoleInsightsEnabled = getConsoleInsightsEnabledSetting();
    const onboardingFinished = this.#settings.createLocalSetting("console-insights-onboarding-finished", false);
    if (consoleInsightsEnabled && consoleInsightsEnabled.get() === true && onboardingFinished.get() === false) {
      consoleInsightsEnabled.set(false);
    }
    if (consoleInsightsEnabled && consoleInsightsEnabled.get() === false) {
      onboardingFinished.set(false);
    }
  }
  updateVersionFrom38To39() {
    const PREFERRED_NETWORK_COND = "preferred-network-condition";
    const setting = this.#settings.globalStorage.get(PREFERRED_NETWORK_COND);
    if (!setting) {
      return;
    }
    try {
      const networkSetting = JSON.parse(setting);
      if (networkSetting.title === "Slow 3G") {
        networkSetting.title = "3G";
        networkSetting.i18nTitleKey = "3G";
        this.#settings.globalStorage.set(PREFERRED_NETWORK_COND, JSON.stringify(networkSetting));
      } else if (networkSetting.title === "Fast 3G") {
        networkSetting.title = "Slow 4G";
        networkSetting.i18nTitleKey = "Slow 4G";
        this.#settings.globalStorage.set(PREFERRED_NETWORK_COND, JSON.stringify(networkSetting));
      }
    } catch {
      this.#settings.globalStorage.remove(PREFERRED_NETWORK_COND);
    }
  }
  /**
   * There are two related migrations here for handling network throttling persistence:
   * 1. Go through all user custom throttling conditions and add a `key` property.
   * 2. If the user has a 'preferred-network-condition' setting, take the value
   *    of that and set the right key for the new 'active-network-condition-key'
   *    setting. Then, remove the now-obsolete 'preferred-network-condition'
   *    setting.
   */
  updateVersionFrom39To40() {
    const hasCustomNetworkConditionsSetting = () => {
      try {
        this.#settings.moduleSetting("custom-network-conditions");
        return true;
      } catch {
        return false;
      }
    };
    if (hasCustomNetworkConditionsSetting()) {
      const conditionsSetting = this.#settings.moduleSetting("custom-network-conditions");
      const customConditions = conditionsSetting.get();
      if (customConditions?.length > 0) {
        customConditions.forEach((condition, i) => {
          if (condition.key) {
            return;
          }
          condition.key = `USER_CUSTOM_SETTING_${i + 1}`;
        });
        conditionsSetting.set(customConditions);
      }
    }
    const PREFERRED_NETWORK_COND_SETTING = "preferred-network-condition";
    const setting = this.#settings.globalStorage.get(PREFERRED_NETWORK_COND_SETTING);
    if (!setting) {
      return;
    }
    const UI_STRING_TO_NEW_KEY = {
      "Fast 4G": "SPEED_FAST_4G",
      "Slow 4G": "SPEED_SLOW_4G",
      "3G": "SPEED_3G",
      "No throttling": "NO_THROTTLING",
      Offline: "OFFLINE"
    };
    try {
      const networkSetting = JSON.parse(setting);
      if (networkSetting.i18nTitleKey && UI_STRING_TO_NEW_KEY.hasOwnProperty(networkSetting.i18nTitleKey)) {
        const key = UI_STRING_TO_NEW_KEY[networkSetting.i18nTitleKey];
        const newSetting = this.#settings.createSetting("active-network-condition-key", "NO_THROTTLING");
        newSetting.set(key);
      }
    } finally {
      this.#settings.globalStorage.remove(PREFERRED_NETWORK_COND_SETTING);
    }
  }
  /*
   * Any new migration should be added before this comment.
   *
   * IMPORTANT: Migrations must be idempotent, since they may be applied
   * multiple times! E.g. when renaming a setting one has to check that the
   * a setting with the new name does not yet exist.
   * ----------------------------------------------------------------------- */
  migrateSettingsFromLocalStorage() {
    const localSettings = /* @__PURE__ */ new Set([
      "advancedSearchConfig",
      "breakpoints",
      "consoleHistory",
      "domBreakpoints",
      "eventListenerBreakpoints",
      "fileSystemMapping",
      "lastSelectedSourcesSidebarPaneTab",
      "previouslyViewedFiles",
      "savedURLs",
      "watchExpressions",
      "workspaceExcludedFolders",
      "xhrBreakpoints"
    ]);
    if (!window.localStorage) {
      return;
    }
    for (const key in window.localStorage) {
      if (localSettings.has(key)) {
        continue;
      }
      const value = window.localStorage[key];
      window.localStorage.removeItem(key);
      this.#settings.globalStorage.set(key, value);
    }
  }
  clearBreakpointsWhenTooMany(breakpointsSetting, maxBreakpointsCount) {
    if (breakpointsSetting.get().length > maxBreakpointsCount) {
      breakpointsSetting.set([]);
    }
  }
};
function moduleSetting(settingName) {
  return Settings.instance().moduleSetting(settingName);
}
function settingForTest(settingName) {
  return Settings.instance().settingForTest(settingName);
}

// gen/front_end/core/common/SimpleHistoryManager.js
var SimpleHistoryManager_exports = {};
__export(SimpleHistoryManager_exports, {
  SimpleHistoryManager: () => SimpleHistoryManager
});
var SimpleHistoryManager = class {
  #entries;
  #activeEntryIndex;
  #coalescingReadonly;
  #historyDepth;
  constructor(historyDepth) {
    this.#entries = [];
    this.#activeEntryIndex = -1;
    this.#coalescingReadonly = 0;
    this.#historyDepth = historyDepth;
  }
  readOnlyLock() {
    ++this.#coalescingReadonly;
  }
  releaseReadOnlyLock() {
    --this.#coalescingReadonly;
  }
  getPreviousValidIndex() {
    if (this.empty()) {
      return -1;
    }
    let revealIndex = this.#activeEntryIndex - 1;
    while (revealIndex >= 0 && !this.#entries[revealIndex].valid()) {
      --revealIndex;
    }
    if (revealIndex < 0) {
      return -1;
    }
    return revealIndex;
  }
  getNextValidIndex() {
    let revealIndex = this.#activeEntryIndex + 1;
    while (revealIndex < this.#entries.length && !this.#entries[revealIndex].valid()) {
      ++revealIndex;
    }
    if (revealIndex >= this.#entries.length) {
      return -1;
    }
    return revealIndex;
  }
  readOnly() {
    return Boolean(this.#coalescingReadonly);
  }
  empty() {
    return !this.#entries.length;
  }
  active() {
    return this.empty() ? null : this.#entries[this.#activeEntryIndex];
  }
  push(entry) {
    if (this.readOnly()) {
      return;
    }
    if (!this.empty()) {
      this.#entries.splice(this.#activeEntryIndex + 1);
    }
    this.#entries.push(entry);
    if (this.#entries.length > this.#historyDepth) {
      this.#entries.shift();
    }
    this.#activeEntryIndex = this.#entries.length - 1;
  }
  canRollback() {
    return this.getPreviousValidIndex() >= 0;
  }
  canRollover() {
    return this.getNextValidIndex() >= 0;
  }
  rollback() {
    const revealIndex = this.getPreviousValidIndex();
    if (revealIndex === -1) {
      return false;
    }
    this.readOnlyLock();
    this.#activeEntryIndex = revealIndex;
    this.#entries[revealIndex].reveal();
    this.releaseReadOnlyLock();
    return true;
  }
  rollover() {
    const revealIndex = this.getNextValidIndex();
    if (revealIndex === -1) {
      return false;
    }
    this.readOnlyLock();
    this.#activeEntryIndex = revealIndex;
    this.#entries[revealIndex].reveal();
    this.releaseReadOnlyLock();
    return true;
  }
};

// gen/front_end/core/common/StringOutputStream.js
var StringOutputStream_exports = {};
__export(StringOutputStream_exports, {
  StringOutputStream: () => StringOutputStream
});
var StringOutputStream = class {
  #data = "";
  async write(chunk) {
    this.#data += chunk;
  }
  async close() {
  }
  data() {
    return this.#data;
  }
};

// gen/front_end/core/common/TextDictionary.js
var TextDictionary_exports = {};
__export(TextDictionary_exports, {
  TextDictionary: () => TextDictionary
});

// gen/front_end/core/common/Trie.js
var Trie_exports = {};
__export(Trie_exports, {
  Trie: () => Trie
});
var Trie = class _Trie {
  #size;
  #root;
  #edges;
  #isWord;
  #wordsInSubtree;
  #freeNodes;
  #traitImpl;
  constructor(traitImpl) {
    this.#root = 0;
    this.#traitImpl = traitImpl;
    this.clear();
  }
  static newStringTrie() {
    return new _Trie({
      empty: () => "",
      append: (base, appendage) => base + appendage,
      slice: (base, start, end) => base.slice(start, end)
    });
  }
  static newArrayTrie() {
    return new _Trie({
      empty: () => [],
      append: (base, appendage) => base.concat([appendage]),
      slice: (base, start, end) => base.slice(start, end)
    });
  }
  add(word) {
    let node = this.#root;
    ++this.#wordsInSubtree[this.#root];
    for (let i = 0; i < word.length; ++i) {
      const edge = word[i];
      let next = this.#edges[node].get(edge);
      if (!next) {
        if (this.#freeNodes.length) {
          next = this.#freeNodes.pop();
        } else {
          next = this.#size++;
          this.#isWord.push(false);
          this.#wordsInSubtree.push(0);
          this.#edges.push(/* @__PURE__ */ new Map());
        }
        this.#edges[node].set(edge, next);
      }
      ++this.#wordsInSubtree[next];
      node = next;
    }
    this.#isWord[node] = true;
  }
  remove(word) {
    if (!this.has(word)) {
      return false;
    }
    let node = this.#root;
    --this.#wordsInSubtree[this.#root];
    for (let i = 0; i < word.length; ++i) {
      const edge = word[i];
      const next = this.#edges[node].get(edge);
      if (!--this.#wordsInSubtree[next]) {
        this.#edges[node].delete(edge);
        this.#freeNodes.push(next);
      }
      node = next;
    }
    this.#isWord[node] = false;
    return true;
  }
  has(word) {
    let node = this.#root;
    for (let i = 0; i < word.length; ++i) {
      node = this.#edges[node].get(word[i]);
      if (!node) {
        return false;
      }
    }
    return this.#isWord[node];
  }
  words(prefix) {
    prefix = prefix ?? this.#traitImpl.empty();
    let node = this.#root;
    for (let i = 0; i < prefix.length; ++i) {
      node = this.#edges[node].get(prefix[i]);
      if (!node) {
        return [];
      }
    }
    const results = [];
    this.dfs(node, prefix, results);
    return results;
  }
  dfs(node, prefix, results) {
    if (this.#isWord[node]) {
      results.push(prefix);
    }
    const edges = this.#edges[node];
    for (const [edge, node2] of edges) {
      const newPrefix = this.#traitImpl.append(prefix, edge);
      this.dfs(node2, newPrefix, results);
    }
  }
  longestPrefix(word, fullWordOnly) {
    let node = this.#root;
    let wordIndex = 0;
    for (let i = 0; i < word.length; ++i) {
      node = this.#edges[node].get(word[i]);
      if (!node) {
        break;
      }
      if (!fullWordOnly || this.#isWord[node]) {
        wordIndex = i + 1;
      }
    }
    return this.#traitImpl.slice(word, 0, wordIndex);
  }
  clear() {
    this.#size = 1;
    this.#root = 0;
    this.#edges = [/* @__PURE__ */ new Map()];
    this.#isWord = [false];
    this.#wordsInSubtree = [0];
    this.#freeNodes = [];
  }
};

// gen/front_end/core/common/TextDictionary.js
var TextDictionary = class {
  words = /* @__PURE__ */ new Map();
  index = Trie.newStringTrie();
  addWord(word) {
    let count = this.words.get(word) || 0;
    ++count;
    this.words.set(word, count);
    this.index.add(word);
  }
  removeWord(word) {
    let count = this.words.get(word) || 0;
    if (!count) {
      return;
    }
    if (count === 1) {
      this.words.delete(word);
      this.index.remove(word);
      return;
    }
    --count;
    this.words.set(word, count);
  }
  wordsWithPrefix(prefix) {
    return this.index.words(prefix);
  }
  hasWord(word) {
    return this.words.has(word);
  }
  wordCount(word) {
    return this.words.get(word) || 0;
  }
  reset() {
    this.words.clear();
    this.index.clear();
  }
};

// gen/front_end/core/common/Throttler.js
var Throttler_exports = {};
__export(Throttler_exports, {
  Throttler: () => Throttler
});
var Throttler = class {
  #timeout;
  #isRunningProcess;
  #asSoonAsPossible;
  #process;
  #lastCompleteTime;
  #scheduler = Promise.withResolvers();
  #processTimeout;
  constructor(timeout) {
    this.#timeout = timeout;
    this.#isRunningProcess = false;
    this.#asSoonAsPossible = false;
    this.#process = null;
    this.#lastCompleteTime = 0;
  }
  #processCompleted() {
    this.#lastCompleteTime = this.#getTime();
    this.#isRunningProcess = false;
    if (this.#process) {
      this.#schedule(false);
    }
  }
  get process() {
    return this.#process;
  }
  get processCompleted() {
    return this.#process ? this.#scheduler.promise : null;
  }
  #onTimeout() {
    this.#processTimeout = void 0;
    this.#asSoonAsPossible = false;
    this.#isRunningProcess = true;
    void Promise.resolve().then(this.#process).catch(console.error.bind(console)).then(this.#processCompleted.bind(this)).then(this.#scheduler.resolve);
    this.#scheduler = Promise.withResolvers();
    this.#process = null;
  }
  async schedule(process, scheduling = "Default") {
    this.#process = process;
    const hasScheduledTasks = Boolean(this.#processTimeout) || this.#isRunningProcess;
    const okToFire = this.#getTime() - this.#lastCompleteTime > this.#timeout;
    const asSoonAsPossible = scheduling === "AsSoonAsPossible" || scheduling === "Default" && !hasScheduledTasks && okToFire;
    const forceTimerUpdate = asSoonAsPossible && !this.#asSoonAsPossible;
    this.#asSoonAsPossible = this.#asSoonAsPossible || asSoonAsPossible;
    this.#schedule(forceTimerUpdate);
    await this.#scheduler.promise;
  }
  #schedule(forceTimerUpdate) {
    if (this.#isRunningProcess) {
      return;
    }
    if (this.#processTimeout && !forceTimerUpdate) {
      return;
    }
    clearTimeout(this.#processTimeout);
    const timeout = this.#asSoonAsPossible ? 0 : this.#timeout;
    this.#processTimeout = setTimeout(this.#onTimeout.bind(this), timeout);
  }
  #getTime() {
    return performance.now();
  }
};

// gen/front_end/core/common/Worker.js
var Worker_exports = {};
__export(Worker_exports, {
  WorkerWrapper: () => WorkerWrapper
});
var WorkerWrapper = class _WorkerWrapper {
  #workerPromise;
  #disposed;
  #rejectWorkerPromise;
  constructor(workerLocation) {
    this.#workerPromise = new Promise((fulfill, reject) => {
      this.#rejectWorkerPromise = reject;
      const worker = new Worker(workerLocation, { type: "module" });
      worker.onerror = (event) => {
        console.error(`Failed to load worker for ${workerLocation.href}:`, event);
      };
      worker.onmessage = (event) => {
        console.assert(event.data === "workerReady");
        worker.onmessage = null;
        fulfill(worker);
      };
    });
  }
  static fromURL(url) {
    return new _WorkerWrapper(url);
  }
  postMessage(message, transfer) {
    void this.#workerPromise.then((worker) => {
      if (!this.#disposed) {
        worker.postMessage(message, transfer ?? []);
      }
    });
  }
  dispose() {
    this.#disposed = true;
    void this.#workerPromise.then((worker) => worker.terminate());
  }
  terminate(immediately = false) {
    if (immediately) {
      this.#rejectWorkerPromise?.(new Error("Worker terminated"));
    }
    this.dispose();
  }
  set onmessage(listener) {
    void this.#workerPromise.then((worker) => {
      worker.onmessage = listener;
    });
  }
  set onerror(listener) {
    void this.#workerPromise.then((worker) => {
      worker.onerror = listener;
    });
  }
};

// gen/front_end/core/common/common.prebundle.js
import { UIString } from "./../platform/platform.js";
export {
  App_exports as App,
  AppProvider_exports as AppProvider,
  Base64_exports as Base64,
  CharacterIdMap_exports as CharacterIdMap,
  Color_exports as Color,
  ColorConverter_exports as ColorConverter,
  ColorUtils_exports as ColorUtils,
  Console_exports as Console,
  Debouncer_exports as Debouncer,
  EventTarget_exports as EventTarget,
  Gzip_exports as Gzip,
  JavaScriptMetaData_exports as JavaScriptMetaData,
  Lazy_exports as Lazy,
  Linkifier_exports as Linkifier,
  MapWithDefault_exports as MapWithDefault,
  Mutex_exports as Mutex,
  Object_exports as ObjectWrapper,
  ParsedURL_exports as ParsedURL,
  Progress_exports as Progress,
  QueryParamHandler_exports as QueryParamHandler,
  ResolverBase_exports as ResolverBase,
  ResourceType_exports as ResourceType,
  ReturnToPanel_exports as ReturnToPanel,
  Revealer_exports as Revealer,
  Runnable_exports as Runnable,
  SegmentedRange_exports as SegmentedRange,
  SettingRegistration_exports as SettingRegistration,
  Settings_exports as Settings,
  SimpleHistoryManager_exports as SimpleHistoryManager,
  StringOutputStream_exports as StringOutputStream,
  TextDictionary_exports as TextDictionary,
  Throttler_exports as Throttler,
  Trie_exports as Trie,
  UIString,
  Worker_exports as Worker
};
//# sourceMappingURL=common.js.map
