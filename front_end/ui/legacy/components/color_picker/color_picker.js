var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/legacy/components/color_picker/ColorFormatSpec.js
var ColorFormatSpec_exports = {};
__export(ColorFormatSpec_exports, {
  colorFormatSpec: () => colorFormatSpec
});
import * as Common from "./../../../../core/common/common.js";
import * as Platform from "./../../../../core/platform/platform.js";
var roundAndStringify = (arr) => arr.map((el) => Platform.StringUtilities.stringifyWithPrecision(el, 2));
var functionParamsText = (values) => {
  return `${values[0]} ${values[1]} ${values[2]} / ${values[3]}`;
};
var colorFormatSpec = {
  [
    "rgb"
    /* Common.Color.Format.RGB */
  ]: {
    label: "RGBA",
    toValues: function(color) {
      return roundAndStringify(color.as(
        "rgba"
        /* Common.Color.Format.RGBA */
      ).canonicalRGBA());
    },
    fromValues: function(values) {
      return Common.Color.parse(`rgb(${functionParamsText(values)})`);
    }
  },
  [
    "hsl"
    /* Common.Color.Format.HSL */
  ]: {
    label: "HSLA",
    toValues: function(color) {
      const canonicalHslParams = roundAndStringify(color.as(
        "hsla"
        /* Common.Color.Format.HSLA */
      ).canonicalHSLA());
      canonicalHslParams[1] = canonicalHslParams[1] + "%";
      canonicalHslParams[2] = canonicalHslParams[2] + "%";
      return canonicalHslParams;
    },
    fromValues: function(values) {
      return Common.Color.parse(`hsl(${functionParamsText(values)})`);
    }
  },
  [
    "hwb"
    /* Common.Color.Format.HWB */
  ]: {
    label: "HWBA",
    toValues: function(color) {
      const canonicalHwbParams = roundAndStringify(color.as(
        "hwba"
        /* Common.Color.Format.HWBA */
      ).canonicalHWBA());
      canonicalHwbParams[1] = canonicalHwbParams[1] + "%";
      canonicalHwbParams[2] = canonicalHwbParams[2] + "%";
      return canonicalHwbParams;
    },
    fromValues: function(values) {
      return Common.Color.parse(`hwb(${functionParamsText(values)})`);
    }
  },
  [
    "lch"
    /* Common.Color.Format.LCH */
  ]: {
    label: "lchA",
    toValues: function(color) {
      const lchColor = color.as(
        "lch"
        /* Common.Color.Format.LCH */
      );
      return roundAndStringify([lchColor.l, lchColor.c, lchColor.h, lchColor.alpha ?? 1]);
    },
    fromValues: function(values) {
      return Common.Color.parse(`lch(${functionParamsText(values)})`);
    }
  },
  [
    "oklch"
    /* Common.Color.Format.OKLCH */
  ]: {
    label: "lchA",
    toValues: function(color) {
      const lchColor = color.as(
        "oklch"
        /* Common.Color.Format.OKLCH */
      );
      return roundAndStringify([lchColor.l, lchColor.c, lchColor.h, lchColor.alpha ?? 1]);
    },
    fromValues: function(values) {
      return Common.Color.parse(`oklch(${functionParamsText(values)})`);
    }
  },
  [
    "lab"
    /* Common.Color.Format.LAB */
  ]: {
    label: "labA",
    toValues: function(color) {
      const labColor = color.as(
        "lab"
        /* Common.Color.Format.LAB */
      );
      return roundAndStringify([labColor.l, labColor.a, labColor.b, labColor.alpha ?? 1]);
    },
    fromValues: function(values) {
      return Common.Color.parse(`lab(${functionParamsText(values)})`);
    }
  },
  [
    "oklab"
    /* Common.Color.Format.OKLAB */
  ]: {
    label: "labA",
    toValues: function(color) {
      const labColor = color.as(
        "oklab"
        /* Common.Color.Format.OKLAB */
      );
      return roundAndStringify([labColor.l, labColor.a, labColor.b, labColor.alpha ?? 1]);
    },
    fromValues: function(values) {
      return Common.Color.parse(`oklab(${functionParamsText(values)})`);
    }
  },
  [
    "srgb"
    /* Common.Color.Format.SRGB */
  ]: {
    label: "RGBA",
    toValues: function(color) {
      const srgbColor = color.as(
        "srgb"
        /* Common.Color.Format.SRGB */
      );
      return roundAndStringify([srgbColor.p0, srgbColor.p1, srgbColor.p2, srgbColor.alpha ?? 1]);
    },
    fromValues: function(values) {
      return Common.Color.parse(`color(${"srgb"} ${functionParamsText(values)})`);
    }
  },
  [
    "srgb-linear"
    /* Common.Color.Format.SRGB_LINEAR */
  ]: {
    label: "RGBA",
    toValues: function(color) {
      const srgbLinearColor = color.as(
        "srgb-linear"
        /* Common.Color.Format.SRGB_LINEAR */
      );
      return roundAndStringify([srgbLinearColor.p0, srgbLinearColor.p1, srgbLinearColor.p2, srgbLinearColor.alpha ?? 1]);
    },
    fromValues: function(values) {
      return Common.Color.parse(`color(${"srgb-linear"} ${functionParamsText(values)})`);
    }
  },
  [
    "display-p3"
    /* Common.Color.Format.DISPLAY_P3 */
  ]: {
    label: "RGBA",
    toValues(color) {
      const displayP3Color = color.as(
        "display-p3"
        /* Common.Color.Format.DISPLAY_P3 */
      );
      return roundAndStringify([displayP3Color.p0, displayP3Color.p1, displayP3Color.p2, 1]);
    },
    fromValues(values) {
      return Common.Color.parse(`color(${"display-p3"} ${functionParamsText(values)})`);
    }
  },
  [
    "a98-rgb"
    /* Common.Color.Format.A98_RGB */
  ]: {
    label: "RGBA",
    toValues: function(color) {
      const a98Color = color.as(
        "a98-rgb"
        /* Common.Color.Format.A98_RGB */
      );
      return roundAndStringify([a98Color.p0, a98Color.p1, a98Color.p2, a98Color.alpha ?? 1]);
    },
    fromValues: function(values) {
      return Common.Color.parse(`color(${"a98-rgb"} ${functionParamsText(values)})`);
    }
  },
  [
    "prophoto-rgb"
    /* Common.Color.Format.PROPHOTO_RGB */
  ]: {
    label: "RGBA",
    toValues: function(color) {
      const proPhotoRGBColor = color.as(
        "prophoto-rgb"
        /* Common.Color.Format.PROPHOTO_RGB */
      );
      return roundAndStringify([proPhotoRGBColor.p0, proPhotoRGBColor.p1, proPhotoRGBColor.p2, proPhotoRGBColor.alpha ?? 1]);
    },
    fromValues: function(values) {
      return Common.Color.parse(`color(${"prophoto-rgb"} ${functionParamsText(values)})`);
    }
  },
  [
    "rec2020"
    /* Common.Color.Format.REC_2020 */
  ]: {
    label: "RGBA",
    toValues: function(color) {
      const rec2020Color = color.as(
        "rec2020"
        /* Common.Color.Format.REC_2020 */
      );
      return roundAndStringify([rec2020Color.p0, rec2020Color.p1, rec2020Color.p2, rec2020Color.alpha ?? 1]);
    },
    fromValues: function(values) {
      return Common.Color.parse(`color(${"rec2020"} ${functionParamsText(values)})`);
    }
  },
  [
    "xyz"
    /* Common.Color.Format.XYZ */
  ]: {
    label: "xyzA",
    toValues: function(color) {
      const xyzColor = color.as(
        "xyz"
        /* Common.Color.Format.XYZ */
      );
      return roundAndStringify([xyzColor.p0, xyzColor.p1, xyzColor.p2, xyzColor.alpha ?? 1]);
    },
    fromValues: function(values) {
      return Common.Color.parse(`color(${"xyz"} ${functionParamsText(values)})`);
    }
  },
  [
    "xyz-d50"
    /* Common.Color.Format.XYZ_D50 */
  ]: {
    label: "xyzA",
    toValues: function(color) {
      const xyzColor = color.as(
        "xyz-d50"
        /* Common.Color.Format.XYZ_D50 */
      );
      return roundAndStringify([xyzColor.p0, xyzColor.p1, xyzColor.p2, xyzColor.alpha ?? 1]);
    },
    fromValues: function(values) {
      return Common.Color.parse(`color(${"xyz-d50"} ${functionParamsText(values)})`);
    }
  },
  [
    "xyz-d65"
    /* Common.Color.Format.XYZ_D65 */
  ]: {
    label: "xyzA",
    toValues: function(color) {
      const xyzColor = color.as(
        "xyz-d65"
        /* Common.Color.Format.XYZ_D65 */
      );
      return roundAndStringify([xyzColor.p0, xyzColor.p1, xyzColor.p2, xyzColor.alpha ?? 1]);
    },
    fromValues: function(values) {
      return Common.Color.parse(`color(${"xyz-d65"} ${functionParamsText(values)})`);
    }
  }
};

// gen/front_end/ui/legacy/components/color_picker/ContrastDetails.js
var ContrastDetails_exports = {};
__export(ContrastDetails_exports, {
  ContrastDetails: () => ContrastDetails,
  Swatch: () => Swatch
});
import "./../../legacy.js";
import * as Common2 from "./../../../../core/common/common.js";
import * as Host from "./../../../../core/host/host.js";
import * as i18n from "./../../../../core/i18n/i18n.js";
import * as Platform2 from "./../../../../core/platform/platform.js";
import * as Root from "./../../../../core/root/root.js";
import * as IconButton from "./../../../components/icon_button/icon_button.js";
import * as UIHelpers from "./../../../helpers/helpers.js";
import * as UI from "./../../legacy.js";
var UIStrings = {
  /**
   * @description Label for when no contrast information is available in the color picker
   */
  noContrastInformationAvailable: "No contrast information available",
  /**
   * @description Text of a DOM element in Contrast Details of the Color Picker
   */
  contrastRatio: "Contrast ratio",
  /**
   * @description Text to show more content
   */
  showMore: "Show more",
  /**
   * @description Choose bg color text content in Contrast Details of the Color Picker
   */
  pickBackgroundColor: "Pick background color",
  /**
   * @description Tooltip text that appears when hovering over largeicon eyedropper button in Contrast Details of the Color Picker
   */
  toggleBackgroundColorPicker: "Toggle background color picker",
  /**
   * @description Text of a button in Contrast Details of the Color Picker
   * @example {rgba(0 0 0 / 100%) } PH1
   */
  useSuggestedColorStoFixLow: "Use suggested color {PH1}to fix low contrast",
  /**
   * @description Label for the APCA contrast in Color Picker
   */
  apca: "APCA",
  /**
   * @description Label aa text content in Contrast Details of the Color Picker
   */
  aa: "AA",
  /**
   * @description Text that starts with a colon and includes a placeholder
   * @example {3.0} PH1
   */
  placeholderWithColon: ": {PH1}",
  /**
   * @description Label aaa text content in Contrast Details of the Color Picker
   */
  aaa: "AAA",
  /**
   * @description Text to show less content
   */
  showLess: "Show less"
};
var str_ = i18n.i18n.registerUIStrings("ui/legacy/components/color_picker/ContrastDetails.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var ContrastDetails = class _ContrastDetails extends Common2.ObjectWrapper.ObjectWrapper {
  contrastInfo;
  #element;
  toggleMainColorPicker;
  expandedChangedCallback;
  colorSelectedCallback;
  #expanded;
  passesAA;
  contrastUnknown;
  #visible;
  noContrastInfoAvailable;
  contrastValueBubble;
  contrastValue;
  contrastValueBubbleIcons;
  expandButton;
  expandedDetails;
  contrastThresholds;
  contrastAA;
  contrastPassFailAA;
  contrastAAA;
  contrastPassFailAAA;
  contrastAPCA;
  contrastPassFailAPCA;
  chooseBgColor;
  bgColorPickerButton;
  bgColorPickedBound;
  bgColorSwatch;
  constructor(contrastInfo, contentElement, toggleMainColorPickerCallback, expandedChangedCallback, colorSelectedCallback) {
    super();
    this.contrastInfo = contrastInfo;
    this.#element = contentElement.createChild("div", "spectrum-contrast-details collapsed");
    this.toggleMainColorPicker = toggleMainColorPickerCallback;
    this.expandedChangedCallback = expandedChangedCallback;
    this.colorSelectedCallback = colorSelectedCallback;
    this.#expanded = false;
    this.passesAA = true;
    this.contrastUnknown = false;
    this.#visible = false;
    this.noContrastInfoAvailable = contentElement.createChild("div", "no-contrast-info-available");
    this.noContrastInfoAvailable.textContent = i18nString(UIStrings.noContrastInformationAvailable);
    this.noContrastInfoAvailable.classList.add("hidden");
    const contrastValueRow = this.#element.createChild("div");
    contrastValueRow.addEventListener("click", this.topRowClicked.bind(this));
    const contrastValueRowContents = contrastValueRow.createChild("div", "container");
    UI.UIUtils.createTextChild(contrastValueRowContents, i18nString(UIStrings.contrastRatio));
    this.contrastValueBubble = contrastValueRowContents.createChild("span", "contrast-details-value");
    this.contrastValue = this.contrastValueBubble.createChild("span");
    this.contrastValueBubbleIcons = [];
    this.contrastValueBubbleIcons.push(this.contrastValueBubble.appendChild(IconButton.Icon.create("checkmark")));
    this.contrastValueBubbleIcons.push(this.contrastValueBubble.appendChild(IconButton.Icon.create("check-double")));
    this.contrastValueBubbleIcons.push(this.contrastValueBubble.appendChild(IconButton.Icon.create("clear")));
    this.contrastValueBubbleIcons.forEach((button) => button.addEventListener("click", (event) => {
      _ContrastDetails.showHelp();
      event.consume(false);
    }));
    const expandToolbar = contrastValueRowContents.createChild("devtools-toolbar", "expand");
    this.expandButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.showMore), "chevron-down");
    this.expandButton.addEventListener("Click", this.expandButtonClicked.bind(this));
    UI.ARIAUtils.setExpanded(this.expandButton.element, false);
    expandToolbar.appendToolbarItem(this.expandButton);
    this.expandedDetails = this.#element.createChild("div", "expanded-details");
    UI.ARIAUtils.setControls(this.expandButton.element, this.expandedDetails);
    this.contrastThresholds = this.expandedDetails.createChild("div", "contrast-thresholds");
    this.contrastAA = this.contrastThresholds.createChild("div", "contrast-threshold");
    this.contrastPassFailAA = this.contrastAA.createChild("div", "contrast-pass-fail");
    this.contrastAAA = this.contrastThresholds.createChild("div", "contrast-threshold");
    this.contrastPassFailAAA = this.contrastAAA.createChild("div", "contrast-pass-fail");
    this.contrastAPCA = this.contrastThresholds.createChild("div", "contrast-threshold");
    this.contrastPassFailAPCA = this.contrastAPCA.createChild("div", "contrast-pass-fail");
    this.chooseBgColor = this.expandedDetails.createChild("div", "contrast-choose-bg-color");
    this.chooseBgColor.textContent = i18nString(UIStrings.pickBackgroundColor);
    const bgColorContainer = this.expandedDetails.createChild("div", "background-color");
    const pickerToolbar = bgColorContainer.createChild("devtools-toolbar", "spectrum-eye-dropper");
    this.bgColorPickerButton = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.toggleBackgroundColorPicker), "color-picker", "color-picker-filled");
    this.bgColorPickerButton.addEventListener("Click", this.#toggleBackgroundColorPicker.bind(this, void 0, true));
    pickerToolbar.appendToolbarItem(this.bgColorPickerButton);
    this.bgColorPickedBound = this.bgColorPicked.bind(this);
    this.bgColorSwatch = new Swatch(bgColorContainer);
    this.contrastInfo.addEventListener("ContrastInfoUpdated", this.update.bind(this));
  }
  showNoContrastInfoAvailableMessage() {
    this.noContrastInfoAvailable.classList.remove("hidden");
  }
  hideNoContrastInfoAvailableMessage() {
    this.noContrastInfoAvailable.classList.add("hidden");
  }
  computeSuggestedColor(threshold) {
    const fgColor = this.contrastInfo.color();
    const bgColor = this.contrastInfo.bgColor();
    if (!fgColor || !bgColor) {
      return;
    }
    if (threshold === "APCA") {
      const requiredContrast2 = this.contrastInfo.contrastRatioAPCAThreshold();
      if (requiredContrast2 === null) {
        return;
      }
      return Common2.Color.findFgColorForContrastAPCA(fgColor, bgColor, requiredContrast2 + 1);
    }
    const requiredContrast = this.contrastInfo.contrastRatioThreshold(threshold);
    if (!requiredContrast) {
      return;
    }
    return Common2.Color.findFgColorForContrast(fgColor, bgColor, requiredContrast + 0.1);
  }
  onSuggestColor(threshold) {
    const color = this.computeSuggestedColor(threshold);
    if (color) {
      this.colorSelectedCallback(color);
    }
  }
  createFixColorButton(parent, suggestedColor) {
    const button = parent.createChild("button", "contrast-fix-button");
    const formattedColor = suggestedColor.asString(this.contrastInfo.colorFormat());
    const suggestedColorString = formattedColor ? formattedColor + " " : "";
    const label = i18nString(UIStrings.useSuggestedColorStoFixLow, { PH1: suggestedColorString });
    UI.ARIAUtils.setLabel(button, label);
    UI.Tooltip.Tooltip.install(button, label);
    button.tabIndex = 0;
    button.style.backgroundColor = suggestedColorString;
    return button;
  }
  update() {
    if (this.contrastInfo.isNull()) {
      this.showNoContrastInfoAvailableMessage();
      this.setVisible(false);
      return;
    }
    this.setVisible(true);
    this.hideNoContrastInfoAvailableMessage();
    const isAPCAEnabled = Root.Runtime.experiments.isEnabled("apca");
    const fgColor = this.contrastInfo.color();
    const bgColor = this.contrastInfo.bgColor();
    if (isAPCAEnabled) {
      const apcaContrastRatio = this.contrastInfo.contrastRatioAPCA();
      if (apcaContrastRatio === null || !bgColor || !fgColor) {
        this.contrastUnknown = true;
        this.contrastValue.textContent = "";
        this.contrastValueBubble.classList.add("contrast-unknown");
        this.chooseBgColor.classList.remove("hidden");
        this.contrastThresholds.classList.add("hidden");
        this.showNoContrastInfoAvailableMessage();
        return;
      }
      this.contrastUnknown = false;
      this.chooseBgColor.classList.add("hidden");
      this.contrastThresholds.classList.remove("hidden");
      this.contrastValueBubble.classList.remove("contrast-unknown");
      this.contrastValue.textContent = `${Platform2.NumberUtilities.floor(apcaContrastRatio, 2)}%`;
      const apcaThreshold = this.contrastInfo.contrastRatioAPCAThreshold();
      const passesAPCA = apcaContrastRatio && apcaThreshold ? Math.abs(apcaContrastRatio) >= apcaThreshold : false;
      this.contrastPassFailAPCA.removeChildren();
      const labelAPCA = this.contrastPassFailAPCA.createChild("span", "contrast-link-label");
      labelAPCA.textContent = i18nString(UIStrings.apca);
      if (apcaThreshold !== null) {
        this.contrastPassFailAPCA.createChild("span").textContent = `: ${apcaThreshold.toFixed(2)}%`;
      }
      if (passesAPCA) {
        const iconCheckmark = createIconCheckmark();
        this.contrastPassFailAPCA.appendChild(iconCheckmark);
      } else {
        const iconNo = createIconNo();
        this.contrastPassFailAPCA.appendChild(iconNo);
        const suggestedColor = this.computeSuggestedColor("APCA");
        if (suggestedColor) {
          const fixAPCA = this.createFixColorButton(this.contrastPassFailAPCA, suggestedColor);
          fixAPCA.addEventListener("click", () => this.onSuggestColor("APCA"));
        }
      }
      labelAPCA.addEventListener("click", (_event) => _ContrastDetails.showHelp());
      this.#element.classList.toggle("contrast-fail", !passesAPCA);
      this.contrastValueBubble.classList.toggle("contrast-aa", passesAPCA);
      this.bgColorSwatch.setColors(fgColor, bgColor);
      return;
    }
    const contrastRatio = this.contrastInfo.contrastRatio();
    if (!contrastRatio || !bgColor || !fgColor) {
      this.contrastUnknown = true;
      this.contrastValue.textContent = "";
      this.contrastValueBubble.classList.add("contrast-unknown");
      this.chooseBgColor.classList.remove("hidden");
      this.contrastThresholds.classList.add("hidden");
      this.showNoContrastInfoAvailableMessage();
      return;
    }
    this.contrastUnknown = false;
    this.chooseBgColor.classList.add("hidden");
    this.contrastThresholds.classList.remove("hidden");
    this.contrastValueBubble.classList.remove("contrast-unknown");
    this.contrastValue.textContent = String(Platform2.NumberUtilities.floor(contrastRatio, 2));
    this.bgColorSwatch.setColors(fgColor, bgColor);
    const aa = this.contrastInfo.contrastRatioThreshold("aa") || 0;
    this.passesAA = (this.contrastInfo.contrastRatio() || 0) >= aa;
    this.contrastPassFailAA.removeChildren();
    const labelAA = this.contrastPassFailAA.createChild("span", "contrast-link-label");
    labelAA.textContent = i18nString(UIStrings.aa);
    this.contrastPassFailAA.createChild("span").textContent = i18nString(UIStrings.placeholderWithColon, { PH1: aa.toFixed(1) });
    if (this.passesAA) {
      const iconCheckmark = createIconCheckmark();
      this.contrastPassFailAA.appendChild(iconCheckmark);
    } else {
      const iconNo = createIconNo();
      this.contrastPassFailAA.appendChild(iconNo);
      const suggestedColor = this.computeSuggestedColor("aa");
      if (suggestedColor) {
        const fixAA = this.createFixColorButton(this.contrastPassFailAA, suggestedColor);
        fixAA.addEventListener("click", () => this.onSuggestColor("aa"));
      }
    }
    const aaa = this.contrastInfo.contrastRatioThreshold("aaa") || 0;
    const passesAAA = (this.contrastInfo.contrastRatio() || 0) >= aaa;
    this.contrastPassFailAAA.removeChildren();
    const labelAAA = this.contrastPassFailAAA.createChild("span", "contrast-link-label");
    labelAAA.textContent = i18nString(UIStrings.aaa);
    this.contrastPassFailAAA.createChild("span").textContent = i18nString(UIStrings.placeholderWithColon, { PH1: aaa.toFixed(1) });
    if (passesAAA) {
      const iconCheckmark = createIconCheckmark();
      this.contrastPassFailAAA.appendChild(iconCheckmark);
    } else {
      const iconNo = createIconNo();
      this.contrastPassFailAAA.appendChild(iconNo);
      const suggestedColor = this.computeSuggestedColor("aaa");
      if (suggestedColor) {
        const fixAAA = this.createFixColorButton(this.contrastPassFailAAA, suggestedColor);
        fixAAA.addEventListener("click", () => this.onSuggestColor("aaa"));
      }
    }
    [labelAA, labelAAA].forEach((e) => e.addEventListener("click", () => _ContrastDetails.showHelp()));
    this.#element.classList.toggle("contrast-fail", !this.passesAA);
    this.contrastValueBubble.classList.toggle("contrast-aa", this.passesAA && !passesAAA);
    this.contrastValueBubble.classList.toggle("contrast-aaa", passesAAA);
  }
  static showHelp() {
    UIHelpers.openInNewTab("https://web.dev/color-and-contrast-accessibility/");
  }
  setVisible(visible) {
    this.#visible = visible;
    this.#element.classList.toggle("hidden", !visible);
  }
  visible() {
    return this.#visible;
  }
  element() {
    return this.#element;
  }
  expandButtonClicked() {
    const selection = this.contrastValueBubble.getComponentSelection();
    if (selection) {
      selection.empty();
    }
    this.toggleExpanded();
  }
  topRowClicked(event) {
    const selection = this.contrastValueBubble.getComponentSelection();
    if (selection) {
      selection.empty();
    }
    this.toggleExpanded();
    event.consume(true);
  }
  toggleExpanded() {
    this.#expanded = !this.#expanded;
    UI.ARIAUtils.setExpanded(this.expandButton.element, this.#expanded);
    this.#element.classList.toggle("collapsed", !this.#expanded);
    if (this.#expanded) {
      this.toggleMainColorPicker(false);
      this.expandButton.setGlyph("chevron-up");
      this.expandButton.setTitle(i18nString(UIStrings.showLess));
      if (this.contrastUnknown) {
        this.#toggleBackgroundColorPicker(true);
      }
    } else {
      this.#toggleBackgroundColorPicker(false);
      this.expandButton.setGlyph("chevron-down");
      this.expandButton.setTitle(i18nString(UIStrings.showMore));
    }
    this.expandedChangedCallback();
  }
  collapse() {
    this.#element.classList.remove("expanded");
    this.#toggleBackgroundColorPicker(false);
    this.toggleMainColorPicker(false);
  }
  expanded() {
    return this.#expanded;
  }
  backgroundColorPickerEnabled() {
    return this.bgColorPickerButton.isToggled();
  }
  toggleBackgroundColorPicker(enabled) {
    this.#toggleBackgroundColorPicker(enabled, false);
  }
  #toggleBackgroundColorPicker(enabled, shouldTriggerEvent = true) {
    if (enabled === void 0) {
      enabled = this.bgColorPickerButton.isToggled();
    }
    if (shouldTriggerEvent) {
      this.dispatchEventToListeners("BackgroundColorPickerWillBeToggled", enabled);
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setEyeDropperActive(enabled);
    if (enabled) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this.bgColorPickedBound);
    } else {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(Host.InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this.bgColorPickedBound);
    }
  }
  bgColorPicked({ data: rgbColor }) {
    const rgba = [rgbColor.r, rgbColor.g, rgbColor.b, (rgbColor.a / 2.55 | 0) / 100];
    const color = Common2.Color.Legacy.fromRGBA(rgba);
    this.contrastInfo.setBgColor(color);
    this.#toggleBackgroundColorPicker(false);
    this.bgColorPickerButton.toggled(false);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
  }
};
var Swatch = class {
  swatchElement;
  swatchInnerElement;
  textPreview;
  constructor(parentElement) {
    this.swatchElement = parentElement.createChild("span", "swatch contrast swatch-inner-white");
    this.swatchInnerElement = this.swatchElement.createChild("span", "swatch-inner");
    this.textPreview = this.swatchElement.createChild("div", "text-preview");
    this.textPreview.textContent = "Aa";
  }
  setColors(fgColor, bgColor) {
    this.textPreview.style.color = fgColor.asString(
      "rgba"
      /* Common.Color.Format.RGBA */
    );
    this.swatchInnerElement.style.backgroundColor = bgColor.asString(
      "rgba"
      /* Common.Color.Format.RGBA */
    );
    this.swatchElement.classList.toggle("swatch-inner-white", bgColor.as(
      "hsl"
      /* Common.Color.Format.HSL */
    ).l > 0.9);
  }
};
function createIconCheckmark() {
  const icon = new IconButton.Icon.Icon();
  icon.name = "checkmark";
  icon.style.color = "var(--icon-checkmark-green)";
  icon.style.width = "var(--sys-size-9)";
  icon.style.height = "var(--sys-size-7)";
  return icon;
}
function createIconNo() {
  const icon = new IconButton.Icon.Icon();
  icon.name = "clear";
  icon.style.color = "var(--icon-error)";
  icon.classList.add("small");
  return icon;
}

// gen/front_end/ui/legacy/components/color_picker/ContrastInfo.js
var ContrastInfo_exports = {};
__export(ContrastInfo_exports, {
  ContrastInfo: () => ContrastInfo
});
import * as Common3 from "./../../../../core/common/common.js";
var ContrastInfo = class extends Common3.ObjectWrapper.ObjectWrapper {
  #isNull;
  #contrastRatio;
  #contrastRatioAPCA;
  contrastRatioThresholds;
  #contrastRatioAPCAThreshold;
  fgColor;
  #bgColor;
  #colorFormat;
  constructor(contrastInfo) {
    super();
    this.#isNull = true;
    this.#contrastRatio = null;
    this.#contrastRatioAPCA = null;
    this.contrastRatioThresholds = null;
    this.#contrastRatioAPCAThreshold = 0;
    this.fgColor = null;
    this.#bgColor = null;
    if (!contrastInfo) {
      return;
    }
    if (!contrastInfo.computedFontSize || !contrastInfo.computedFontWeight) {
      return;
    }
    this.#isNull = false;
    this.contrastRatioThresholds = Common3.ColorUtils.getContrastThreshold(contrastInfo.computedFontSize, contrastInfo.computedFontWeight);
    this.#contrastRatioAPCAThreshold = Common3.ColorUtils.getAPCAThreshold(contrastInfo.computedFontSize, contrastInfo.computedFontWeight);
    if (!contrastInfo.backgroundColors || contrastInfo.backgroundColors.length !== 1) {
      return;
    }
    const bgColorText = contrastInfo.backgroundColors[0];
    const bgColor = Common3.Color.parse(bgColorText)?.asLegacyColor();
    if (bgColor) {
      this.#setBgColor(bgColor);
    }
  }
  isNull() {
    return this.#isNull;
  }
  setColor(fgColor, colorFormat) {
    this.fgColor = fgColor;
    this.#colorFormat = colorFormat;
    this.updateContrastRatio();
    this.dispatchEventToListeners(
      "ContrastInfoUpdated"
      /* Events.CONTRAST_INFO_UPDATED */
    );
  }
  colorFormat() {
    return this.#colorFormat;
  }
  color() {
    return this.fgColor;
  }
  contrastRatio() {
    return this.#contrastRatio;
  }
  contrastRatioAPCA() {
    return this.#contrastRatioAPCA;
  }
  contrastRatioAPCAThreshold() {
    return this.#contrastRatioAPCAThreshold;
  }
  setBgColor(bgColor) {
    this.#setBgColor(bgColor);
    this.dispatchEventToListeners(
      "ContrastInfoUpdated"
      /* Events.CONTRAST_INFO_UPDATED */
    );
  }
  #setBgColor(bgColor) {
    this.#bgColor = bgColor;
    if (!this.fgColor) {
      return;
    }
    const fgRGBA = this.fgColor.rgba();
    if (bgColor.hasAlpha()) {
      const blendedRGBA = Common3.ColorUtils.blendColors(bgColor.rgba(), fgRGBA);
      this.#bgColor = new Common3.Color.Legacy(
        blendedRGBA,
        "rgba"
        /* Common.Color.Format.RGBA */
      );
    }
    this.#contrastRatio = Common3.ColorUtils.contrastRatio(fgRGBA, this.#bgColor.rgba());
    this.#contrastRatioAPCA = Common3.ColorUtils.contrastRatioAPCA(this.fgColor.rgba(), this.#bgColor.rgba());
  }
  bgColor() {
    return this.#bgColor;
  }
  updateContrastRatio() {
    if (!this.#bgColor || !this.fgColor) {
      return;
    }
    this.#contrastRatio = Common3.ColorUtils.contrastRatio(this.fgColor.rgba(), this.#bgColor.rgba());
    this.#contrastRatioAPCA = Common3.ColorUtils.contrastRatioAPCA(this.fgColor.rgba(), this.#bgColor.rgba());
  }
  contrastRatioThreshold(level) {
    if (!this.contrastRatioThresholds) {
      return null;
    }
    return this.contrastRatioThresholds[level];
  }
};

// gen/front_end/ui/legacy/components/color_picker/ContrastOverlay.js
var ContrastOverlay_exports = {};
__export(ContrastOverlay_exports, {
  ContrastOverlay: () => ContrastOverlay,
  ContrastRatioLineBuilder: () => ContrastRatioLineBuilder
});
import * as Common4 from "./../../../../core/common/common.js";
import * as Root2 from "./../../../../core/root/root.js";
import * as UI2 from "./../../legacy.js";
var ContrastOverlay = class {
  contrastInfo;
  visible;
  contrastRatioSVG;
  contrastRatioLines;
  width;
  height;
  contrastRatioLineBuilder;
  contrastRatioLinesThrottler;
  drawContrastRatioLinesBound;
  constructor(contrastInfo, colorElement) {
    this.contrastInfo = contrastInfo;
    this.visible = false;
    this.contrastRatioSVG = UI2.UIUtils.createSVGChild(colorElement, "svg", "spectrum-contrast-container fill");
    this.contrastRatioLines = /* @__PURE__ */ new Map();
    if (Root2.Runtime.experiments.isEnabled("apca")) {
      this.contrastRatioLines.set("APCA", UI2.UIUtils.createSVGChild(this.contrastRatioSVG, "path", "spectrum-contrast-line"));
    } else {
      this.contrastRatioLines.set("aa", UI2.UIUtils.createSVGChild(this.contrastRatioSVG, "path", "spectrum-contrast-line"));
      this.contrastRatioLines.set("aaa", UI2.UIUtils.createSVGChild(this.contrastRatioSVG, "path", "spectrum-contrast-line"));
    }
    this.width = 0;
    this.height = 0;
    this.contrastRatioLineBuilder = new ContrastRatioLineBuilder(this.contrastInfo);
    this.contrastRatioLinesThrottler = new Common4.Throttler.Throttler(0);
    this.drawContrastRatioLinesBound = this.drawContrastRatioLines.bind(this);
    this.contrastInfo.addEventListener("ContrastInfoUpdated", this.update.bind(this));
  }
  update() {
    if (!this.visible || this.contrastInfo.isNull()) {
      return;
    }
    if (Root2.Runtime.experiments.isEnabled("apca") && this.contrastInfo.contrastRatioAPCA() === null) {
      return;
    }
    if (!this.contrastInfo.contrastRatio()) {
      return;
    }
    void this.contrastRatioLinesThrottler.schedule(this.drawContrastRatioLinesBound);
  }
  setDimensions(width, height) {
    this.width = width;
    this.height = height;
    this.update();
  }
  setVisible(visible) {
    this.visible = visible;
    this.contrastRatioSVG.classList.toggle("hidden", !visible);
    this.update();
  }
  async drawContrastRatioLines() {
    for (const [level, element] of this.contrastRatioLines) {
      const path = this.contrastRatioLineBuilder.drawContrastRatioLine(this.width, this.height, level);
      if (path) {
        element.setAttribute("d", path);
      } else {
        element.removeAttribute("d");
      }
    }
  }
};
var ContrastRatioLineBuilder = class {
  contrastInfo;
  constructor(contrastInfo) {
    this.contrastInfo = contrastInfo;
  }
  drawContrastRatioLine(width, height, level) {
    const isAPCA = Root2.Runtime.experiments.isEnabled("apca");
    const requiredContrast = isAPCA ? this.contrastInfo.contrastRatioAPCAThreshold() : this.contrastInfo.contrastRatioThreshold(level);
    if (!width || !height || requiredContrast === null) {
      return null;
    }
    const dS = 0.02;
    const H = 0;
    const S = 1;
    const V = 2;
    const A = 3;
    const color = this.contrastInfo.color();
    const bgColor = this.contrastInfo.bgColor();
    if (!color || !bgColor) {
      return null;
    }
    const fgRGBA = color.rgba();
    const fgHSVA = color.as(
      "hsl"
      /* Common.Color.Format.HSL */
    ).hsva();
    const bgRGBA = bgColor.rgba();
    const bgLuminance = Common4.ColorUtils.luminance(bgRGBA);
    let blendedRGBA = Common4.ColorUtils.blendColors(fgRGBA, bgRGBA);
    const fgLuminance = Common4.ColorUtils.luminance(blendedRGBA);
    const fgIsLighter = fgLuminance > bgLuminance;
    const desiredLuminance = isAPCA ? Common4.ColorUtils.desiredLuminanceAPCA(bgLuminance, requiredContrast, fgIsLighter) : Common4.Color.desiredLuminance(bgLuminance, requiredContrast, fgIsLighter);
    if (isAPCA && Math.abs(Math.round(Common4.ColorUtils.contrastRatioByLuminanceAPCA(desiredLuminance, bgLuminance))) < requiredContrast) {
      return null;
    }
    let lastV = fgHSVA[V];
    let currentSlope = 0;
    const candidateHSVA = [fgHSVA[H], 0, 0, fgHSVA[A]];
    let pathBuilder = [];
    const candidateRGBA = Common4.Color.hsva2rgba(candidateHSVA);
    blendedRGBA = Common4.ColorUtils.blendColors(candidateRGBA, bgRGBA);
    let candidateLuminance = (candidateHSVA2) => {
      return Common4.ColorUtils.luminance(Common4.ColorUtils.blendColors(Common4.Color.Legacy.fromHSVA(candidateHSVA2).rgba(), bgRGBA));
    };
    if (Root2.Runtime.experiments.isEnabled("apca")) {
      candidateLuminance = (candidateHSVA2) => {
        return Common4.ColorUtils.luminanceAPCA(Common4.ColorUtils.blendColors(Common4.Color.Legacy.fromHSVA(candidateHSVA2).rgba(), bgRGBA));
      };
    }
    let s;
    for (s = 0; s < 1 + dS; s += dS) {
      s = Math.min(1, s);
      candidateHSVA[S] = s;
      candidateHSVA[V] = lastV + currentSlope * dS;
      const v = Common4.Color.approachColorValue(candidateHSVA, V, desiredLuminance, candidateLuminance);
      if (v === null) {
        break;
      }
      currentSlope = s === 0 ? 0 : (v - lastV) / dS;
      lastV = v;
      pathBuilder.push(pathBuilder.length ? "L" : "M");
      pathBuilder.push((s * width).toFixed(2));
      pathBuilder.push(((1 - v) * height).toFixed(2));
    }
    if (s < 1 + dS) {
      s -= dS;
      candidateHSVA[V] = 1;
      s = Common4.Color.approachColorValue(candidateHSVA, S, desiredLuminance, candidateLuminance);
      if (s !== null) {
        pathBuilder = pathBuilder.concat(["L", (s * width).toFixed(2), "-0.1"]);
      }
    }
    if (pathBuilder.length === 0) {
      return null;
    }
    return pathBuilder.join(" ");
  }
};

// gen/front_end/ui/legacy/components/color_picker/FormatPickerContextMenu.js
var FormatPickerContextMenu_exports = {};
__export(FormatPickerContextMenu_exports, {
  FormatPickerContextMenu: () => FormatPickerContextMenu
});
import * as Common5 from "./../../../../core/common/common.js";
import * as i18n3 from "./../../../../core/i18n/i18n.js";
import * as UI3 from "./../../legacy.js";
var UIStrings2 = {
  /**
   * @description Menu warning that some color will be clipped after conversion to match the target gamut
   */
  colorShiftWarning: "\u26A0\uFE0F Conversion to a narrow gamut will cause color shifts"
};
var str_2 = i18n3.i18n.registerUIStrings("ui/legacy/components/color_picker/FormatPickerContextMenu.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var FormatPickerContextMenu = class {
  #color;
  constructor(color) {
    this.#color = color;
  }
  async show(e, onSelect) {
    const { resolve, promise: showPromise } = Promise.withResolvers();
    const legacyFormats = [
      "hex",
      "hexa",
      "rgb",
      "rgba",
      "hsl",
      "hwb"
    ];
    const modernFormats = [
      "lch",
      "oklch",
      "lab",
      "oklab",
      "srgb",
      "srgb-linear",
      "display-p3",
      "a98-rgb",
      "prophoto-rgb",
      "rec2020",
      "xyz",
      "xyz-d50",
      "xyz-d65"
    ];
    const menu = new UI3.ContextMenu.ContextMenu(e, { onSoftMenuClosed: () => resolve() });
    const disclamerSection = menu.section("disclaimer");
    const legacySection = menu.section("legacy");
    const wideSection = menu.section("wide");
    const colorFunctionSection = menu.section("color-function").appendSubMenuItem("color()", false, "color").section();
    disclamerSection.appendItem(i18nString2(UIStrings2.colorShiftWarning), () => {
    }, { disabled: true });
    if (!(this.#color instanceof Common5.Color.Nickname)) {
      const nickname = this.#color.asLegacyColor().nickname();
      if (nickname) {
        this.addColorToSection(nickname, legacySection, onSelect);
      }
    }
    if (!(this.#color instanceof Common5.Color.ShortHex)) {
      const shortHex = this.#color.as(
        (this.#color.alpha ?? 1) === 1 ? "hex" : "hexa"
        /* Common.Color.Format.HEXA */
      ).shortHex();
      if (shortHex) {
        this.addColorToSection(shortHex, legacySection, onSelect);
      }
    }
    for (const format of [...legacyFormats, ...modernFormats]) {
      if (format === this.#color.format()) {
        continue;
      }
      const newColor = this.#color.as(format);
      const section2 = legacyFormats.includes(format) ? legacySection : newColor instanceof Common5.Color.ColorFunction ? colorFunctionSection : wideSection;
      this.addColorToSection(newColor, section2, onSelect);
    }
    await menu.show();
    await showPromise;
  }
  addColorToSection(newColor, section2, onSelect) {
    if (newColor instanceof Common5.Color.Legacy) {
      const originalHasAlpha = (this.#color.alpha ?? 1) !== 1;
      const isAlphaFormat = newColor.alpha !== null;
      if (isAlphaFormat !== originalHasAlpha) {
        return;
      }
    }
    const label = newColor.isGamutClipped() ? newColor.asString() + " \u26A0\uFE0F" : newColor.asString();
    if (!label) {
      return;
    }
    const handler = () => onSelect(newColor);
    section2.appendItem(label, handler, { jslogContext: newColor.isGamutClipped() ? "color" : "clipped-color" });
  }
};

// gen/front_end/ui/legacy/components/color_picker/Spectrum.js
var Spectrum_exports = {};
__export(Spectrum_exports, {
  ChangeSource: () => ChangeSource,
  MaterialPalette: () => MaterialPalette,
  PaletteGenerator: () => PaletteGenerator,
  Spectrum: () => Spectrum,
  Swatch: () => Swatch2
});
import "./../../legacy.js";
import * as Common6 from "./../../../../core/common/common.js";
import * as Host2 from "./../../../../core/host/host.js";
import * as i18n5 from "./../../../../core/i18n/i18n.js";
import * as Platform3 from "./../../../../core/platform/platform.js";
import * as SDK from "./../../../../core/sdk/sdk.js";
import * as TextUtils from "./../../../../models/text_utils/text_utils.js";
import * as IconButton2 from "./../../../components/icon_button/icon_button.js";
import * as SrgbOverlay from "./../../../components/srgb_overlay/srgb_overlay.js";
import * as VisualLogging from "./../../../visual_logging/visual_logging.js";
import * as UI4 from "./../../legacy.js";

// gen/front_end/ui/legacy/components/color_picker/spectrum.css.js
var spectrum_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/* https://github.com/bgrins/spectrum */

:host {
  width: 232px;
  height: 319px;
  user-select: none;
  overflow: hidden;
}

/* stylelint-disable-next-line selector-pseudo-class-no-unknown */
:selection {
  background-color: var(--sys-color-tonal-container);
  color: var(--sys-color-on-tonal-container);
}

.spectrum-color {
  position: relative;
  width: 232px;
  height: 127px;
  border-radius: 2px 2px 0 0;
  overflow: hidden;
  flex: none;
  touch-action: none;
}

.spectrum-dragger,
.spectrum-slider {
  user-select: none;
}

.spectrum-dragger {
  border-radius: 12px;
  height: 12px;
  width: 12px;
  border: 1px solid var(--sys-color-surface);
  cursor: move;
  z-index: 1;
  position: absolute;
  top: 0;
  left: 0;
  background: var(--sys-color-inverse-surface);
  box-shadow: var(--drop-shadow);
}

.spectrum-slider {
  position: absolute;
  top: -1px;
  cursor: ew-resize;
  width: 13px;
  height: 13px;
  border-radius: 13px;
  background-color: var(--sys-color-neutral-container);
  box-shadow: var(--drop-shadow);
}

.spectrum-color:focus .spectrum-dragger {
  border: 1px solid var(--sys-color-state-focus-ring);
}

.spectrum-tools {
  position: relative;
  height: 110px;
  width: 100%;
  flex: none;
}

.spectrum-hue {
  top: 16px;
  /* stylelint-disable-next-line plugin/use_theme_colors, declaration-property-value-no-unknown */
  background: linear-gradient(to left in hsl longer hue, #f00 0 100%);
}

.spectrum-hue.display-p3 {
  /* stylelint-disable-next-line declaration-property-value-no-unknown */
  background: linear-gradient(
    to left in hsl longer hue,
    color(display-p3 1 0 0) 0 100%
  );
}

.spectrum-alpha {
  top: 35px;
  background-image: var(--image-file-checker);
  background-size: 12px 11px;
}

.spectrum-alpha-background {
  height: 100%;
  border-radius: 2px;
}

.spectrum-hue,
.spectrum-alpha {
  position: absolute;
  left: 86px;
  width: 130px;
  height: 11px;
  border-radius: 2px;
  touch-action: none;
}

.spectrum-hue:focus-visible .spectrum-slider,
.spectrum-alpha:focus-visible .spectrum-slider {
  border: 1px solid var(--sys-color-state-focus-ring);
  width: 14px;
  height: 14px;
  border-radius: 14px;
}

.spectrum-sat,
.-theme-preserve {
  /* stylelint-disable-next-line plugin/use_theme_colors */
  background-image: linear-gradient(to right, #fff, rgb(204 154 129 / 0%));
}

.spectrum-val,
.-theme-preserve {
  /* stylelint-disable-next-line plugin/use_theme_colors */
  background-image: linear-gradient(to top, #000, rgb(204 154 129 / 0%));
}

.spectrum-contrast-details {
  position: relative;
  background-color: var(--sys-color-cdt-base-container);
  width: 100%;
  height: 83px;
  top: 0;
  font-size: 13px;
  color: var(--sys-color-on-surface);
  border-top: 1px solid var(--sys-color-divider);
  line-height: initial;
  overflow: hidden;
  flex: none;
}

.spectrum-contrast-details.collapsed {
  height: 36px;
  flex: none;
}

.spectrum-contrast-details devtools-toolbar.expand {
  position: absolute;
  right: 6px;
  top: 6px;
  margin: 0;
}

.spectrum-contrast-details.visible {
  display: initial;
}

.spectrum-contrast-details div.container {
  margin: 10px;
}

.spectrum-contrast-details .expanded-details {
  display: flex;
  margin: 12px 12px 0 4px;
}

.spectrum-contrast-details.collapsed .expanded-details {
  display: none;
}

.contrast-pass-fail {
  margin-left: 0.5em;
  display: flex;
  align-items: center;
}

.contrast-choose-bg-color {
  margin: 8px 0 0 5px;
  font-style: italic;
}

.spectrum-contrast-details .contrast-choose-bg-color,
.spectrum-contrast-details .contrast-thresholds {
  width: 150px;
}

.contrast-threshold:first-child {
  margin-bottom: 5px;
}

.contrast-fix-button {
  cursor: pointer;
  font-size: 13px;
  padding: 0;
  margin: 0 0 0 10px;
  background: 0;
  width: 12px;
  height: 12px;
  border: 1px solid var(--sys-color-neutral-outline);
  display: inline-block;
  position: relative;
}

.contrast-fix-button::after {
  content: ' ';
  width: 13px;
  height: 13px;
  background-image: var(--image-file-refresh);
  background-size: contain;
  position: absolute;
  left: 5.5px;
  top: 3.5px;
  background-color: var(--sys-color-cdt-base-container);
  border-radius: 50%;
}

.contrast-fix-button:hover,
.contrast-fix-button:focus {
  border: 1px solid var(--sys-color-state-focus-ring);
  transform: scale(1.2);
}

.contrast-link-label {
  cursor: pointer;
}

.contrast-link-label:hover {
  text-decoration: underline;
}

.spectrum-contrast-details .background-color {
  position: absolute;
  flex: none;
  right: 12px;
}

.spectrum-eye-dropper {
  width: 32px;
  height: 24px;
  position: relative;
  left: 8px;
  top: 17px;
  cursor: pointer;
}

.spectrum-contrast-details .spectrum-eye-dropper {
  top: 2px;
  right: 34px;
  position: absolute;
  left: auto;
}

.contrast-details-value {
  color: var(--sys-color-on-surface);
  margin: 1px 5px;
  user-select: text;
}

.contrast-pass-fail devtools-icon {
  margin-left: 5px;
}

.contrast-details-value devtools-icon {
  display: none;
  margin-left: 5px;
  color: var(--sys-color-on-surface);
}

.spectrum-contrast-details .toolbar-state-on devtools-icon {
  color: var(--sys-color-token-subtle);
}

devtools-icon.clear {
  transform: scale(0.7);
  color: var(--icon-error);
}

devtools-icon.checkmark,
devtools-icon.check-double {
  color: var(--icon-checkmark-green);
}

.spectrum-contrast-details .contrast-details-value.contrast-unknown {
  background-color: var(--sys-color-cdt-base-container);
  color: var(--sys-color-on-surface);
  width: 3em;
  text-align: center;
}

.contrast-details-value .clear,
.contrast-details-value .checkmark,
.contrast-details-value .check-double {
  cursor: pointer;
  vertical-align: -5px;
}

.spectrum-contrast-details.contrast-fail .contrast-details-value .clear,
.contrast-details-value.contrast-aa .checkmark,
.contrast-details-value.contrast-aaa .check-double {
  display: inline-block;
}

.swatch {
  width: 32px;
  height: 32px;
  margin: 0;
  position: absolute;
  top: 15px;
  left: 44px;
  background-image: var(--image-file-checker);
  border-radius: 16px;
}

.swatch-inner,
.swatch-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  display: inline-block;
  border-radius: 16px;
}

.swatch-inner-white {
  border: 1px solid var(--sys-color-neutral-outline);
}

.swatch-overlay {
  cursor: pointer;
  opacity: 0%;
  padding: 4px;
}

.swatch-overlay:hover,
.swatch-overlay:focus-visible {
  background-color: var(--color-background-inverted-opacity-30);
  opacity: 100%;
}

.swatch-overlay:active {
  background-color: var(--color-background-inverted-opacity-50);
}

devtools-icon.copy-color-icon {
  color: var(--sys-color-cdt-base-container);
  margin-top: 2px;
  margin-left: 2px;
}

.spectrum-text {
  position: absolute;
  top: 60px;
  left: 16px;
}

.spectrum-text-value {
  display: inline-block;
  width: 40px;
  overflow: hidden;
  text-align: center;
  margin-right: 6px;
  line-height: 20px;
  padding: 0;
  color: var(--sys-color-on-surface);
  border: 1px solid var(--sys-color-neutral-outline);
  white-space: nowrap;
}

.spectrum-text-label {
  letter-spacing: 39.5px;
  margin-top: 8px;
  display: block;
  color: var(--sys-color-state-disabled);
  margin-left: 16px;
  width: 174px;
}

.spectrum-text-hex > .spectrum-text-value {
  width: 178px;
}

.spectrum-text-hex > .spectrum-text-label {
  letter-spacing: normal;
  margin-left: 0;
  text-align: center;
}

.spectrum-switcher {
  border-radius: 2px;
  height: 20px;
  width: 20px;
  padding: 2px;
  border: none;
  background: none;
  margin: 0;
}

.spectrum-display-switcher {
  top: 72px;
  position: absolute;
  right: 10px;
}

.spectrum-switcher:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.spectrum-switcher:focus-visible {
  background-color: var(--sys-color-state-focus-highlight);
}

.spectrum-palette-container {
  border-top: 1px solid var(--sys-color-divider);
  position: relative;
  width: 100%;
  padding: 6px 24px 6px 6px;
  display: flex;
  flex-wrap: wrap;
}

.spectrum-palette {
  display: flex;
  flex-wrap: wrap;
  width: 198px;
}

.spectrum-palette-color {
  width: 12px;
  height: 12px;
  flex: 0 0 12px;
  border-radius: 2px;
  margin: 6px;
  cursor: pointer;
  position: relative;
  border: 1px solid var(--sys-color-divider);
  background-position: -1px !important; /* stylelint-disable-line declaration-no-important */
  z-index: 14;
}

.spectrum-palette-color-shadow {
  position: absolute;
  opacity: 0%;
  margin: 0;
  top: -5px;
  left: 3px;
  border: 0;
  border-radius: 1px;
  width: 11px;
  height: 11px;
}

.spectrum-palette-color:hover:not(.spectrum-shades-shown)
  > .spectrum-palette-color-shadow,
.spectrum-palette-color:focus:not(.spectrum-shades-shown)
  > .spectrum-palette-color-shadow {
  opacity: 20%;
}

.spectrum-palette-color:hover:not(.spectrum-shades-shown)
  > .spectrum-palette-color-shadow:first-child,
.spectrum-palette-color:focus:not(.spectrum-shades-shown)
  > .spectrum-palette-color-shadow:first-child {
  opacity: 60%;
  top: -3px;
  left: 1px;
}

.palette-color-shades {
  position: absolute;
  background-color: var(--sys-color-cdt-base-container);
  height: 228px;
  width: 28px;
  box-shadow: var(--drop-shadow);
  z-index: 14;
  border-radius: 2px;
  transform-origin: 0 228px;
  margin-top: 16px;
  margin-left: -8px;
}

.spectrum-palette > .spectrum-palette-color.spectrum-shades-shown {
  z-index: 15;
}

.palette-color-shades > .spectrum-palette-color {
  margin: 8px 0 0;
  margin-left: 8px;
  width: 12px;
}

.spectrum-palette > .spectrum-palette-color {
  transition: transform 100ms cubic-bezier(0, 0, 0.2, 1);
  will-change: transform;
  z-index: 13;
}

.palette-preview > .spectrum-palette-color {
  margin-top: 1px;
}

.spectrum-palette > .spectrum-palette-color.empty-color {
  border-color: transparent;
}

.spectrum-palette-color:not(.has-material-shades):focus {
  border: 1px solid var(--sys-color-state-focus-ring);
  transform: scale(1.4);
}

.palette-color-shades > .spectrum-palette-color:not(.empty-color):hover,
.spectrum-palette
  > .spectrum-palette-color:not(.empty-color, .has-material-shades):hover {
  transform: scale(1.15);
}

.add-color-toolbar {
  margin-left: -3px;
  margin-top: -1px;
}

.spectrum-palette-switcher {
  right: 10px;
  top: 0;
  margin-top: 9px;
  position: absolute;
}

.palette-panel {
  width: 100%;
  position: absolute;
  top: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--sys-color-cdt-base-container);
  z-index: 14;
  transition: transform 200ms cubic-bezier(0, 0, 0.2, 1), visibility 0s 200ms;
  border-top: 1px solid var(--sys-color-divider);
  visibility: hidden;
}

.palette-panel-showing > .palette-panel {
  transform: translateY(-100%);
  transition-delay: 0s;
  visibility: visible;
}

.palette-panel > devtools-toolbar {
  position: absolute;
  right: 6px;
  top: 6px;
}

.palette-panel > div {
  flex: 0 0 38px;
  border-bottom: 1px solid var(--sys-color-divider);
  padding: 12px;
  line-height: 14px;
  color: var(--sys-color-on-surface);
}

.palette-panel > div.palette-title {
  font-size: 14px;
  line-height: 16px;
  color: var(--sys-color-on-surface);
  flex-basis: 40px;
}

div.palette-preview {
  display: flex;
  cursor: pointer;
}

.palette-preview-title {
  flex: 0 0 84px;
}

.palette-preview:focus-visible,
.palette-preview:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.spectrum-overlay {
  z-index: 13;
  visibility: hidden;
  /* stylelint-disable-next-line plugin/use_theme_colors */
  background-color: hsl(0deg 0% 0% / 50%);
  /* See: crbug.com/1152736 for color variable migration. */
  opacity: 0%;
  transition: opacity 100ms cubic-bezier(0, 0, 0.2, 1), visibility 0s 100ms;
}

.palette-panel-showing > .spectrum-overlay {
  transition-delay: 0s;
  visibility: visible;
  opacity: 100%;
}

.spectrum-contrast-container {
  width: 100%;
  height: 100%;
}

.spectrum-contrast-line,
:host-context(.theme-with-dark-background) .spectrum-contrast-line {
  fill: none;
  stroke: #fff; /* stylelint-disable-line plugin/use_theme_colors */
  opacity: 70%;
  stroke-width: 1.5px;
}

.delete-color-toolbar {
  position: absolute;
  right: 0;
  top: 0;
  background-color: var(--sys-color-cdt-base-container);
  visibility: hidden;
  z-index: 3;
  width: 36px;
  display: flex;
  align-items: center;
  padding-left: 4px;
  bottom: 2px;
  border-bottom-right-radius: 2px;
}

@keyframes showDeleteToolbar {
  from {
    opacity: 0%;
  }

  to {
    opacity: 100%;
  }
}

.delete-color-toolbar.dragging {
  visibility: visible;
  animation: showDeleteToolbar 100ms 150ms cubic-bezier(0, 0, 0.2, 1) backwards;
}

.delete-color-toolbar-active {
  background-color: var(--sys-color-state-hover-on-subtle);
  color: var(--sys-color-cdt-base-container);
}

.swatch.contrast {
  width: 30px;
  height: 30px;
  position: absolute;
  top: 0;
  right: 0;
  left: auto;
  background-image: var(--image-file-checker);
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swatch.contrast .swatch-overlay {
  padding: 0;
}

.background-color .text-preview {
  color: var(--sys-color-inverse-surface);
  font-size: 16px;
  position: relative;
  padding-bottom: 2px;
}

.swatch.contrast devtools-icon {
  margin: -2px;
}

.no-contrast-info-available {
  border-top: 1px solid var(--sys-color-divider);
  position: relative;
  width: 100%;
  padding: 10px;
  justify-content: center;
  display: flex;
  flex-wrap: wrap;
}

@media (forced-colors: active) {
  :host {
    border: 1px solid canvastext !important; /* stylelint-disable-line declaration-no-important */
  }

  .spectrum-color {
    forced-color-adjust: none;
  }

  .spectrum-switcher:hover,
  .spectrum-switcher:focus-visible {
    forced-color-adjust: none;
    background-color: Highlight !important; /* stylelint-disable-line declaration-no-important */
  }

  :host-context(.theme-with-dark-background) .spectrum-switcher {
    filter: unset;
  }

  .spectrum-switcher:hover svg,
  .spectrum-switcher:focus-visible svg {
    fill: HighlightText;
  }

  .swatch {
    forced-color-adjust: none;
  }

  .swatch-inner,
  .swatch-overlay,
  .swatch-inner-white {
    border: 1px solid ButtonText;
  }

  .swatch-overlay:hover,
  .swatch-overlay:focus-visible {
    background-color: canvas !important; /* stylelint-disable-line declaration-no-important */
  }

  .spectrum-slider {
    forced-color-adjust: none;
    background-color: ButtonText !important; /* stylelint-disable-line declaration-no-important */
    box-shadow: 0 1px 4px 0 ButtonFace !important; /* stylelint-disable-line declaration-no-important */
  }
}

/*# sourceURL=${import.meta.resolve("./spectrum.css")} */`;

// gen/front_end/ui/legacy/components/color_picker/Spectrum.js
var UIStrings3 = {
  /**
   * @description Tooltip text that appears when hovering over largeicon eyedropper button in Spectrum of the Color Picker
   * @example {c} PH1
   */
  toggleColorPicker: "Eye dropper [{PH1}]",
  /**
   * @description Aria label for hue slider in Color Picker
   */
  changeHue: "Change hue",
  /**
   * @description Aria label for alpha slider in Color Picker. Alpha refers to the alpha channel of a
   * color, and this tool allows the user to change the alpha value.
   */
  changeAlpha: "Change alpha",
  /**
   * @description Aria label for HEX color format input
   */
  hex: "HEX",
  /**
   * @description Aria label for color format switcher button in Color Picker
   */
  changeColorFormat: "Change color format",
  /**
   * @description Screen reader reads this text when palette switcher button receives focus
   */
  previewPalettes: "Preview palettes",
  /**
   * @description Tooltip text that appears when hovering over the largeicon add button in the Spectrum of the Color Picker
   */
  addToPalette: "Add to palette",
  /**
   * @description Title text content in Spectrum of the Color Picker
   */
  colorPalettes: "Color Palettes",
  /**
   * @description Label for close button in Color Picker
   */
  returnToColorPicker: "Return to color picker",
  /**
   * @description Aria label which declares hex value of a swatch in the Color Picker
   * @example {#969696} PH1
   */
  colorS: "Color {PH1}",
  /**
   * @description Color element title in Spectrum of the Color Picker
   * @example {#9c1724} PH1
   */
  longclickOrLongpressSpaceToShow: "Long-click or long-press space to show alternate shades of {PH1}",
  /**
   * @description A context menu item in the Color Picker to organize the user-defined color palette (removes the user-defined color to which this action is performed)"
   */
  removeColor: "Remove color",
  /**
   * @description A context menu item in the Color Picker to organize the user-defined color palette (removes all user-defined colors to the right of the color to which this action is performed)"
   */
  removeAllToTheRight: "Remove all to the right",
  /**
   * @description A context menu item in the Color Picker to organize the user-defined color palette (removes all user-defined colors)"
   */
  clearPalette: "Clear palette",
  /**
   * @description Aria label for RGBA and HSLA color format inputs in Color Picker
   * @example {R} PH1
   * @example {RGBA} PH2
   */
  sInS: "{PH1} in {PH2}",
  /**
   * @description Swatch copy icon title in Spectrum of the Color Picker
   */
  copyColorToClipboard: "Copy color to clipboard",
  /**
   * @description Aria text for the swatch position. Swatch is the color picker spectrum tool.
   */
  pressArrowKeysMessage: "Press arrow keys with or without modifiers to move swatch position. Arrow key with Shift key moves position largely, with Ctrl key it is less and with Alt key it is even less"
};
var str_3 = i18n5.i18n.registerUIStrings("ui/legacy/components/color_picker/Spectrum.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var colorElementToMutable = /* @__PURE__ */ new WeakMap();
var colorElementToColor = /* @__PURE__ */ new WeakMap();
var srgbGamutFormats = [
  "srgb",
  "rgb",
  "hex",
  "hsl",
  "hwb"
];
var IS_NATIVE_EYE_DROPPER_AVAILABLE = "EyeDropper" in window;
function doesFormatSupportDisplayP3(format) {
  return !srgbGamutFormats.includes(format);
}
function convertColorFormat(colorFormat) {
  if (colorFormat === "rgba") {
    return "rgb";
  }
  if (colorFormat === "hsla") {
    return "hsl";
  }
  if (colorFormat === "hwba") {
    return "hwb";
  }
  if (colorFormat === "hexa") {
    return "hex";
  }
  return colorFormat;
}
function getHsvFromColor(gamut, color) {
  switch (gamut) {
    case "display-p3": {
      const displayP3color = color.as(
        "display-p3"
        /* Common.Color.Format.DISPLAY_P3 */
      );
      return [
        ...Common6.Color.rgb2hsv([displayP3color.p0, displayP3color.p1, displayP3color.p2]),
        displayP3color.alpha || 1
      ];
    }
    case "srgb": {
      return color.as(
        "hsl"
        /* Common.Color.Format.HSL */
      ).hsva();
    }
  }
}
function getColorFromHsva(gamut, hsva) {
  const color = Common6.Color.Legacy.fromHSVA(hsva);
  switch (gamut) {
    case "display-p3": {
      const rgba = Common6.Color.hsva2rgba(hsva);
      return new Common6.Color.ColorFunction("display-p3", rgba[0], rgba[1], rgba[2], rgba[3], void 0);
    }
    case "srgb": {
      return color;
    }
  }
}
var Spectrum = class extends Common6.ObjectWrapper.eventMixin(UI4.Widget.VBox) {
  #color;
  gamut = "srgb";
  colorElement;
  colorDragElement;
  dragX;
  dragY;
  colorPickerButton;
  swatch;
  hueElement;
  hueSlider;
  alphaElement;
  alphaElementBackground;
  alphaSlider;
  displayContainer;
  textValues;
  textLabels;
  hexContainer;
  hexValue;
  contrastInfo;
  srgbOverlay;
  contrastOverlay;
  contrastDetails;
  contrastDetailsBackgroundColorPickerToggledBound;
  palettes;
  palettePanel;
  palettePanelShowing;
  paletteSectionContainer;
  paletteContainer;
  shadesContainer;
  deleteIconToolbar;
  deleteButton;
  addColorToolbar;
  colorPickedBound;
  hsv;
  hueAlphaWidth;
  dragWidth;
  dragHeight;
  colorDragElementHeight;
  slideHelperWidth;
  numPaletteRowsShown;
  selectedColorPalette;
  customPaletteSetting;
  colorOffset;
  closeButton;
  paletteContainerMutable;
  shadesCloseHandler;
  dragElement;
  dragHotSpotX;
  dragHotSpotY;
  #colorName;
  colorFormat = "rgb";
  eyeDropperAbortController = null;
  isFormatPickerShown = false;
  // Used to represent how the current color
  // should be stringified externally (emitted event etc.).
  // For example, this is used when a color variable
  // selected form the palettes. That time, we don't
  // want to return the value of the variable but the
  // actual variable string.
  #colorString;
  constructor(contrastInfo) {
    super({ useShadowDom: true });
    this.registerRequiredCSS(spectrum_css_default);
    this.contentElement.tabIndex = 0;
    this.contentElement.setAttribute("jslog", `${VisualLogging.dialog("colorPicker").parent("mapped").track({ keydown: "Enter|Escape" })}`);
    this.colorElement = this.contentElement.createChild("div", "spectrum-color");
    this.colorElement.tabIndex = 0;
    this.colorElement.setAttribute("jslog", `${VisualLogging.canvas("color").track({
      click: true,
      drag: true,
      keydown: "ArrowLeft|ArrowRight|ArrowDown|ArrowUp"
    })}`);
    this.setDefaultFocusedElement(this.colorElement);
    this.colorElement.addEventListener("keydown", this.onSliderKeydown.bind(this, positionColor.bind(this)));
    const swatchAriaText = i18nString3(UIStrings3.pressArrowKeysMessage);
    UI4.ARIAUtils.setLabel(this.colorElement, swatchAriaText);
    UI4.ARIAUtils.markAsApplication(this.colorElement);
    this.colorDragElement = this.colorElement.createChild("div", "spectrum-sat fill").createChild("div", "spectrum-val fill").createChild("div", "spectrum-dragger");
    this.dragX = 0;
    this.dragY = 0;
    const toolsContainer = this.contentElement.createChild("div", "spectrum-tools");
    const toolbar = toolsContainer.createChild("devtools-toolbar", "spectrum-eye-dropper");
    const toggleEyeDropperShortcut = UI4.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction("elements.toggle-eye-dropper");
    const definedShortcutKey = toggleEyeDropperShortcut[0]?.descriptors.flatMap((descriptor) => descriptor.name.split("\u200A+\u200A"))[0];
    this.colorPickerButton = new UI4.Toolbar.ToolbarToggle(i18nString3(UIStrings3.toggleColorPicker, { PH1: definedShortcutKey || "" }), "color-picker", "color-picker-filled", "color-eye-dropper");
    this.colorPickerButton.setToggled(true);
    this.colorPickerButton.addEventListener("Click", this.toggleColorPicker.bind(this, void 0));
    toolbar.appendToolbarItem(this.colorPickerButton);
    this.colorPickerButton.element.setAttribute("jslog", `${VisualLogging.colorEyeDropper().track({ click: true })}`);
    this.swatch = new Swatch2(toolsContainer);
    this.hueElement = toolsContainer.createChild("div", "spectrum-hue");
    this.hueElement.setAttribute("jslog", `${VisualLogging.slider("hue").track({
      click: true,
      drag: true,
      keydown: "ArrowLeft|ArrowRight|ArrowDown|ArrowUp"
    })}`);
    this.hueElement.tabIndex = 0;
    this.hueElement.addEventListener("keydown", this.onSliderKeydown.bind(this, positionHue.bind(this)));
    UI4.ARIAUtils.setLabel(this.hueElement, i18nString3(UIStrings3.changeHue));
    UI4.ARIAUtils.markAsSlider(this.hueElement, 0, 360);
    this.hueSlider = this.hueElement.createChild("div", "spectrum-slider");
    this.alphaElement = toolsContainer.createChild("div", "spectrum-alpha");
    this.alphaElement.setAttribute("jslog", `${VisualLogging.slider("alpha").track({
      click: true,
      drag: true,
      keydown: "ArrowLeft|ArrowRight|ArrowDown|ArrowUp"
    })}`);
    this.alphaElement.tabIndex = 0;
    this.alphaElement.addEventListener("keydown", this.onSliderKeydown.bind(this, positionAlpha.bind(this)));
    UI4.ARIAUtils.setLabel(this.alphaElement, i18nString3(UIStrings3.changeAlpha));
    UI4.ARIAUtils.markAsSlider(this.alphaElement, 0, 1);
    this.alphaElementBackground = this.alphaElement.createChild("div", "spectrum-alpha-background");
    this.alphaSlider = this.alphaElement.createChild("div", "spectrum-slider");
    this.displayContainer = toolsContainer.createChild("div", "spectrum-text source-code");
    UI4.ARIAUtils.markAsPoliteLiveRegion(this.displayContainer, true);
    this.textValues = [];
    for (let i = 0; i < 4; ++i) {
      const inputValue = UI4.UIUtils.createInput("spectrum-text-value");
      inputValue.setAttribute("jslog", `${VisualLogging.value().track({ change: true, keydown: "ArrowUp|ArrowDown" }).context(i)}`);
      this.displayContainer.appendChild(inputValue);
      inputValue.maxLength = 4;
      this.textValues.push(inputValue);
      inputValue.addEventListener("keydown", this.inputChanged.bind(this), false);
      inputValue.addEventListener("input", this.inputChanged.bind(this), false);
      inputValue.addEventListener("wheel", this.inputChanged.bind(this), false);
      inputValue.addEventListener("paste", this.pasted.bind(this), false);
    }
    this.textLabels = this.displayContainer.createChild("div", "spectrum-text-label");
    this.hexContainer = toolsContainer.createChild("div", "spectrum-text spectrum-text-hex source-code");
    UI4.ARIAUtils.markAsPoliteLiveRegion(this.hexContainer, true);
    this.hexValue = UI4.UIUtils.createInput("spectrum-text-value");
    this.hexValue.setAttribute("jslog", `${VisualLogging.value("hex").track({ keydown: "ArrowUp|ArrowDown", change: true })}`);
    this.hexContainer.appendChild(this.hexValue);
    this.hexValue.maxLength = 9;
    this.hexValue.addEventListener("keydown", this.inputChanged.bind(this), false);
    this.hexValue.addEventListener("input", this.inputChanged.bind(this), false);
    this.hexValue.addEventListener("wheel", this.inputChanged.bind(this), false);
    this.hexValue.addEventListener("paste", this.pasted.bind(this), false);
    const label = this.hexContainer.createChild("div", "spectrum-text-label");
    label.textContent = i18nString3(UIStrings3.hex);
    UI4.ARIAUtils.setLabel(this.hexValue, label.textContent);
    const displaySwitcher = toolsContainer.createChild("button", "spectrum-display-switcher spectrum-switcher");
    displaySwitcher.setAttribute("jslog", `${VisualLogging.dropDown("color-format").track({ click: true })}`);
    appendSwitcherIcon(displaySwitcher);
    UI4.UIUtils.setTitle(displaySwitcher, i18nString3(UIStrings3.changeColorFormat));
    displaySwitcher.tabIndex = 0;
    displaySwitcher.addEventListener("click", (ev) => {
      void this.showFormatPicker(ev);
    });
    UI4.UIUtils.installDragHandle(this.hueElement, this.dragStart.bind(this, positionHue.bind(this)), positionHue.bind(this), null, "ew-resize", "crosshair");
    UI4.UIUtils.installDragHandle(this.alphaElement, this.dragStart.bind(this, positionAlpha.bind(this)), positionAlpha.bind(this), null, "ew-resize", "crosshair");
    UI4.UIUtils.installDragHandle(this.colorElement, this.dragStart.bind(this, positionColor.bind(this)), positionColor.bind(this), null, "move", "crosshair");
    if (contrastInfo) {
      this.contrastInfo = contrastInfo;
      this.contrastOverlay = new ContrastOverlay(this.contrastInfo, this.colorElement);
      this.contrastDetails = new ContrastDetails(this.contrastInfo, this.contentElement, this.toggleColorPicker.bind(this), this.contrastPanelExpandedChanged.bind(this), this.colorSelected.bind(this));
      this.contrastDetailsBackgroundColorPickerToggledBound = this.contrastDetailsBackgroundColorPickerToggled.bind(this);
    }
    this.element.classList.add("flex-none");
    this.palettes = /* @__PURE__ */ new Map();
    this.palettePanel = this.contentElement.createChild("div", "palette-panel");
    this.palettePanel.setAttribute("jslog", `${VisualLogging.section("palette-panel")}`);
    this.palettePanelShowing = false;
    this.paletteSectionContainer = this.contentElement.createChild("div", "spectrum-palette-container");
    this.paletteContainer = this.paletteSectionContainer.createChild("div", "spectrum-palette");
    this.paletteContainer.addEventListener("contextmenu", this.showPaletteColorContextMenu.bind(this, -1));
    this.shadesContainer = this.contentElement.createChild("div", "palette-color-shades hidden");
    this.shadesContainer.setAttribute("jslog", `${VisualLogging.paletteColorShades()}`);
    UI4.UIUtils.installDragHandle(this.paletteContainer, this.paletteDragStart.bind(this), this.paletteDrag.bind(this), this.paletteDragEnd.bind(this), "default");
    const paletteSwitcher = this.paletteSectionContainer.createChild("div", "spectrum-palette-switcher spectrum-switcher");
    paletteSwitcher.setAttribute("jslog", `${VisualLogging.dropDown("palette-switcher").track({ click: true })}`);
    appendSwitcherIcon(paletteSwitcher);
    UI4.UIUtils.setTitle(paletteSwitcher, i18nString3(UIStrings3.previewPalettes));
    UI4.ARIAUtils.markAsButton(paletteSwitcher);
    paletteSwitcher.tabIndex = 0;
    self.onInvokeElement(paletteSwitcher, (event) => {
      this.togglePalettePanel(true);
      event.consume(true);
    });
    this.deleteIconToolbar = document.createElement("devtools-toolbar");
    this.deleteIconToolbar.classList.add("delete-color-toolbar");
    this.deleteButton = new UI4.Toolbar.ToolbarButton("", "bin");
    this.deleteIconToolbar.appendToolbarItem(this.deleteButton);
    const overlay = this.contentElement.createChild("div", "spectrum-overlay fill");
    overlay.addEventListener("click", this.togglePalettePanel.bind(this, false));
    this.addColorToolbar = document.createElement("devtools-toolbar");
    this.addColorToolbar.classList.add("add-color-toolbar");
    const addColorButton = new UI4.Toolbar.ToolbarButton(i18nString3(UIStrings3.addToPalette), "plus", void 0, "add-color");
    addColorButton.addEventListener("Click", this.onAddColorMousedown.bind(this));
    addColorButton.element.addEventListener("keydown", this.onAddColorKeydown.bind(this));
    this.addColorToolbar.appendToolbarItem(addColorButton);
    this.colorPickedBound = this.colorPicked.bind(this);
    this.numPaletteRowsShown = -1;
    this.contentElement.addEventListener("focusout", (ev) => {
      if (this.isFormatPickerShown) {
        ev.stopImmediatePropagation();
      }
    });
    this.srgbOverlay = new SrgbOverlay.SrgbOverlay.SrgbOverlay();
    this.loadPalettes();
    new PaletteGenerator((palette) => {
      if (palette.colors.length) {
        this.addPalette(palette);
      } else if (this.selectedColorPalette.get() === palette.title) {
        this.paletteSelected(MaterialPalette);
      }
    });
    function getUpdatedSliderPosition(element, event) {
      const keyboardEvent = event;
      const elementPosition = element.getBoundingClientRect();
      switch (keyboardEvent.key) {
        case "ArrowLeft":
        case "ArrowDown":
          return elementPosition.left - 1;
        case "ArrowRight":
        case "ArrowUp":
          return elementPosition.right + 1;
        default:
          return event.x;
      }
    }
    function positionHue(event) {
      const hsva = this.hsv.slice();
      const sliderPosition = getUpdatedSliderPosition(this.hueSlider, event);
      const hueAlphaLeft = this.hueElement.getBoundingClientRect().left;
      const positionFraction = (sliderPosition - hueAlphaLeft) / this.hueAlphaWidth;
      const newHue = 1 - positionFraction;
      hsva[0] = Platform3.NumberUtilities.clamp(newHue, 0, 1);
      this.#setColor(hsva, "", void 0, void 0, ChangeSource.Other);
      const color = getColorFromHsva(this.gamut, hsva);
      const colorValues = color.as(
        "hsl"
        /* Common.Color.Format.HSL */
      ).canonicalHSLA();
      UI4.ARIAUtils.setValueNow(this.hueElement, colorValues[0]);
    }
    function positionAlpha(event) {
      const hsva = this.hsv.slice();
      const sliderPosition = getUpdatedSliderPosition(this.alphaSlider, event);
      const hueAlphaLeft = this.hueElement.getBoundingClientRect().left;
      const positionFraction = (sliderPosition - hueAlphaLeft) / this.hueAlphaWidth;
      const newAlpha = Math.round(positionFraction * 100) / 100;
      hsva[3] = Platform3.NumberUtilities.clamp(newAlpha, 0, 1);
      this.#setColor(hsva, "", void 0, void 0, ChangeSource.Other);
      const color = getColorFromHsva(this.gamut, hsva);
      const colorValues = color.as(
        "hsl"
        /* Common.Color.Format.HSL */
      ).canonicalHSLA();
      UI4.ARIAUtils.setValueText(this.alphaElement, colorValues[3]);
    }
    function positionColor(event) {
      const hsva = this.hsv.slice();
      const colorPosition = getUpdatedColorPosition(this.colorDragElement, event);
      this.colorOffset = this.colorElement.getBoundingClientRect();
      hsva[1] = Platform3.NumberUtilities.clamp((colorPosition.x - this.colorOffset.left) / this.dragWidth, 0, 1);
      hsva[2] = Platform3.NumberUtilities.clamp(1 - (colorPosition.y - this.colorOffset.top) / this.dragHeight, 0, 1);
      this.#setColor(hsva, "", void 0, void 0, ChangeSource.Other);
    }
    function getUpdatedColorPosition(dragElement, event) {
      const elementPosition = dragElement.getBoundingClientRect();
      const verticalX = elementPosition.x + elementPosition.width / 2;
      const horizontalY = elementPosition.y + elementPosition.width / 2;
      const defaultUnit = elementPosition.width / 4;
      const unit = getUnitToMove(defaultUnit, event);
      const keyboardEvent = event;
      switch (keyboardEvent.key) {
        case "ArrowLeft":
          return { x: elementPosition.left - unit, y: horizontalY };
        case "ArrowRight":
          return { x: elementPosition.right + unit, y: horizontalY };
        case "ArrowDown":
          return { x: verticalX, y: elementPosition.bottom + unit };
        case "ArrowUp":
          return { x: verticalX, y: elementPosition.top - unit };
        default:
          return {
            x: event.x,
            y: event.y
          };
      }
    }
    function getUnitToMove(unit, event) {
      const keyboardEvent = event;
      if (keyboardEvent.altKey) {
        unit = 1;
      } else if (keyboardEvent.ctrlKey) {
        unit = 10;
      } else if (keyboardEvent.shiftKey) {
        unit = 20;
      }
      return unit;
    }
    function appendSwitcherIcon(parentElement) {
      const switcherIcon = new IconButton2.Icon.Icon();
      switcherIcon.name = "fold-more";
      switcherIcon.classList.add("medium");
      parentElement.appendChild(switcherIcon);
    }
  }
  dragStart(callback, event) {
    this.colorOffset = this.colorElement.getBoundingClientRect();
    callback(event);
    return true;
  }
  contrastDetailsBackgroundColorPickerToggled(event) {
    if (event.data) {
      void this.toggleColorPicker(false);
    }
  }
  contrastPanelExpandedChanged() {
    if (!this.contrastOverlay || !this.contrastDetails) {
      return;
    }
    this.contrastOverlay.setVisible(this.contrastDetails.expanded());
    this.resizeForSelectedPalette(true);
    if (this.contrastDetails.expanded()) {
      this.hideSrgbOverlay();
    } else {
      this.showSrgbOverlay();
    }
  }
  updatePalettePanel() {
    this.palettePanel.removeChildren();
    const title = this.palettePanel.createChild("div", "palette-title");
    title.textContent = i18nString3(UIStrings3.colorPalettes);
    const toolbar = this.palettePanel.createChild("devtools-toolbar");
    this.closeButton = new UI4.Toolbar.ToolbarButton(i18nString3(UIStrings3.returnToColorPicker), "cross");
    this.closeButton.addEventListener("Click", this.togglePalettePanel.bind(this, false));
    this.closeButton.element.addEventListener("keydown", this.onCloseBtnKeydown.bind(this));
    this.closeButton.element.setAttribute("jslog", `${VisualLogging.close().track({ click: true })}`);
    toolbar.appendToolbarItem(this.closeButton);
    for (const palette of this.palettes.values()) {
      this.palettePanel.appendChild(this.createPreviewPaletteElement(palette));
    }
    this.contentElement.scrollIntoView({ block: "end" });
  }
  togglePalettePanel(show) {
    if (this.palettePanelShowing === show) {
      return;
    }
    if (show) {
      this.updatePalettePanel();
    }
    this.palettePanelShowing = show;
    this.contentElement.classList.toggle("palette-panel-showing", show);
    this.#focus();
  }
  onCloseBtnKeydown(event) {
    if (Platform3.KeyboardUtilities.isEscKey(event) || Platform3.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      this.togglePalettePanel(false);
      event.consume(true);
    }
  }
  onSliderKeydown(sliderNewPosition, event) {
    const keyboardEvent = event;
    switch (keyboardEvent.key) {
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowDown":
      case "ArrowUp":
        sliderNewPosition(event);
        event.consume(true);
    }
  }
  /**
   * (Suppress warning about preventScroll)
   */
  #focus() {
    if (!this.isShowing()) {
      return;
    }
    if (this.palettePanelShowing && this.closeButton) {
      this.closeButton.element.focus({ preventScroll: true });
    } else {
      this.contentElement.focus();
    }
  }
  createPaletteColor(colorText, colorName, animationDelay) {
    const element = document.createElement("div");
    element.classList.add("spectrum-palette-color");
    element.setAttribute("jslog", `${VisualLogging.item().track({
      click: true,
      drag: true,
      keydown: "ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Escape|Tab"
    })}`);
    element.style.background = Platform3.StringUtilities.sprintf("linear-gradient(%s, %s), var(--image-file-checker)", colorText, colorText);
    if (animationDelay) {
      element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100, delay: animationDelay, fill: "backwards" });
    }
    UI4.Tooltip.Tooltip.install(element, colorName || colorText);
    return element;
  }
  showPalette(palette, animate, _event) {
    this.resizeForSelectedPalette();
    this.paletteContainer.removeChildren();
    for (let i = 0; i < palette.colors.length; i++) {
      const animationDelay = animate ? i * 100 / palette.colors.length : 0;
      const colorElement = this.createPaletteColor(palette.colors[i], palette.colorNames[i], animationDelay);
      UI4.ARIAUtils.markAsButton(colorElement);
      UI4.ARIAUtils.setLabel(colorElement, i18nString3(UIStrings3.colorS, { PH1: palette.colors[i] }));
      colorElement.tabIndex = -1;
      colorElement.addEventListener("mousedown", this.onPaletteColorKeydown.bind(this, palette, i));
      colorElement.addEventListener("keydown", this.onPaletteColorKeydown.bind(this, palette, i));
      if (palette.mutable) {
        colorElementToMutable.set(colorElement, true);
        colorElementToColor.set(colorElement, palette.colors[i]);
        colorElement.addEventListener("contextmenu", this.showPaletteColorContextMenu.bind(this, i));
      } else if (palette === MaterialPalette) {
        colorElement.classList.add("has-material-shades");
        let shadow = colorElement.createChild("div", "spectrum-palette-color spectrum-palette-color-shadow");
        shadow.style.background = palette.colors[i];
        shadow = colorElement.createChild("div", "spectrum-palette-color spectrum-palette-color-shadow");
        shadow.style.background = palette.colors[i];
        const tooltipText = i18nString3(UIStrings3.longclickOrLongpressSpaceToShow, { PH1: palette.colors[i] });
        UI4.Tooltip.Tooltip.install(colorElement, tooltipText);
        UI4.ARIAUtils.setLabel(colorElement, tooltipText);
        new UI4.UIUtils.LongClickController(colorElement, this.showLightnessShades.bind(this, colorElement, palette.colors[i]));
      }
      this.paletteContainer.appendChild(colorElement);
    }
    if (this.paletteContainer.childNodes.length > 0) {
      this.paletteContainer.childNodes[0].tabIndex = 0;
    }
    this.paletteContainerMutable = palette.mutable;
    if (palette.mutable) {
      this.paletteContainer.appendChild(this.addColorToolbar);
      this.paletteContainer.appendChild(this.deleteIconToolbar);
    } else {
      this.addColorToolbar.remove();
      this.deleteIconToolbar.remove();
    }
    this.togglePalettePanel(false);
    this.#focus();
  }
  showLightnessShades(colorElement, colorText, _event) {
    function closeLightnessShades(element) {
      this.shadesContainer.classList.add("hidden");
      element.classList.remove("spectrum-shades-shown");
      if (this.shadesCloseHandler) {
        this.shadesContainer.ownerDocument.removeEventListener("mousedown", this.shadesCloseHandler, true);
      }
      delete this.shadesCloseHandler;
    }
    if (this.shadesCloseHandler) {
      this.shadesCloseHandler();
    }
    this.shadesContainer.classList.remove("hidden");
    this.shadesContainer.removeChildren();
    this.shadesContainer.animate([{ transform: "scaleY(0)", opacity: "0" }, { transform: "scaleY(1)", opacity: "1" }], { duration: 200, easing: "cubic-bezier(0.4, 0, 0.2, 1)" });
    let shadesTop = this.paletteContainer.offsetTop + colorElement.offsetTop + (colorElement.parentElement ? colorElement.parentElement.offsetTop : 0);
    if (this.contrastDetails) {
      shadesTop += this.contrastDetails.element().offsetHeight;
    }
    this.shadesContainer.style.top = shadesTop + "px";
    this.shadesContainer.style.left = colorElement.offsetLeft + "px";
    colorElement.classList.add("spectrum-shades-shown");
    const shades = MaterialPaletteShades.get(colorText);
    if (shades !== void 0) {
      for (let i = shades.length - 1; i >= 0; i--) {
        const shadeElement = this.createPaletteColor(shades[i], void 0, i * 200 / shades.length + 100);
        UI4.ARIAUtils.markAsButton(shadeElement);
        UI4.ARIAUtils.setLabel(shadeElement, i18nString3(UIStrings3.colorS, { PH1: shades[i] }));
        shadeElement.tabIndex = -1;
        shadeElement.addEventListener("mousedown", this.onShadeColorKeydown.bind(this, shades[i], colorElement));
        shadeElement.addEventListener("keydown", this.onShadeColorKeydown.bind(this, shades[i], colorElement));
        this.shadesContainer.appendChild(shadeElement);
      }
    }
    if (this.shadesContainer.childNodes.length > 0) {
      this.shadesContainer.childNodes[this.shadesContainer.childNodes.length - 1].focus();
    }
    this.shadesCloseHandler = closeLightnessShades.bind(this, colorElement);
    this.shadesContainer.ownerDocument.addEventListener("mousedown", this.shadesCloseHandler, true);
  }
  slotIndexForEvent(event) {
    const mouseEvent = event;
    const localX = mouseEvent.pageX - this.paletteContainer.getBoundingClientRect().left;
    const localY = mouseEvent.pageY - this.paletteContainer.getBoundingClientRect().top;
    const col = Math.min(localX / COLOR_CHIP_SIZE | 0, ITEMS_PER_PALETTE_ROW - 1);
    const row = localY / COLOR_CHIP_SIZE | 0;
    return Math.min(row * ITEMS_PER_PALETTE_ROW + col, this.customPaletteSetting.get().colors.length - 1);
  }
  isDraggingToBin(event) {
    const mouseEvent = event;
    return mouseEvent.pageX > this.deleteIconToolbar.getBoundingClientRect().left;
  }
  paletteDragStart(event) {
    const element = UI4.UIUtils.deepElementFromEvent(event);
    if (!element || !colorElementToMutable.get(element)) {
      return false;
    }
    const index = this.slotIndexForEvent(event);
    this.dragElement = element;
    const mouseEvent = event;
    this.dragHotSpotX = mouseEvent.pageX - index % ITEMS_PER_PALETTE_ROW * COLOR_CHIP_SIZE;
    this.dragHotSpotY = mouseEvent.pageY - (index / ITEMS_PER_PALETTE_ROW | 0) * COLOR_CHIP_SIZE;
    return true;
  }
  paletteDrag(event) {
    const mouseEvent = event;
    if (mouseEvent.pageX < this.paletteContainer.getBoundingClientRect().left || mouseEvent.pageY < this.paletteContainer.getBoundingClientRect().top) {
      return;
    }
    if (!this.dragElement || this.dragHotSpotX === void 0 || this.dragHotSpotY === void 0) {
      return;
    }
    const newIndex = this.slotIndexForEvent(event);
    const offsetX = mouseEvent.pageX - newIndex % ITEMS_PER_PALETTE_ROW * COLOR_CHIP_SIZE;
    const offsetY = mouseEvent.pageY - (newIndex / ITEMS_PER_PALETTE_ROW | 0) * COLOR_CHIP_SIZE;
    const isDeleting = this.isDraggingToBin(event);
    this.deleteIconToolbar.classList.add("dragging");
    this.deleteIconToolbar.classList.toggle("delete-color-toolbar-active", isDeleting);
    const dragElementTransform = "translateX(" + (offsetX - this.dragHotSpotX) + "px) translateY(" + (offsetY - this.dragHotSpotY) + "px)";
    this.dragElement.style.transform = isDeleting ? dragElementTransform + " scale(0.8)" : dragElementTransform;
    const children = [...this.paletteContainer.children];
    const index = children.indexOf(this.dragElement);
    const swatchOffsets = /* @__PURE__ */ new Map();
    for (const swatch of children) {
      swatchOffsets.set(swatch, swatch.getBoundingClientRect());
    }
    if (index !== newIndex) {
      this.paletteContainer.insertBefore(this.dragElement, children[newIndex > index ? newIndex + 1 : newIndex]);
    }
    for (const swatch of children) {
      if (swatch === this.dragElement) {
        continue;
      }
      const before = swatchOffsets.get(swatch);
      const after = swatch.getBoundingClientRect();
      if (before && (before.left !== after.left || before.top !== after.top)) {
        swatch.animate([
          {
            transform: "translateX(" + (before.left - after.left) + "px) translateY(" + (before.top - after.top) + "px)"
          },
          { transform: "none" }
        ], { duration: 100, easing: "cubic-bezier(0, 0, 0.2, 1)" });
      }
    }
  }
  paletteDragEnd(e) {
    if (!this.dragElement) {
      return;
    }
    if (this.isDraggingToBin(e)) {
      this.dragElement.remove();
    }
    this.dragElement.style.removeProperty("transform");
    const children = this.paletteContainer.children;
    const colors = [];
    for (let i = 0; i < children.length; ++i) {
      const color = colorElementToColor.get(children[i]);
      if (color) {
        colors.push(color);
      }
    }
    const palette = this.customPaletteSetting.get();
    palette.colors = colors;
    this.customPaletteSetting.set(palette);
    this.showPalette(palette, false);
    this.deleteIconToolbar.classList.remove("dragging");
    this.deleteIconToolbar.classList.remove("delete-color-toolbar-active");
  }
  loadPalettes() {
    this.palettes.set(MaterialPalette.title, MaterialPalette);
    const defaultCustomPalette = { title: "Custom", colors: [], colorNames: [], mutable: true, matchUserFormat: void 0 };
    this.customPaletteSetting = Common6.Settings.Settings.instance().createSetting("custom-color-palette", defaultCustomPalette);
    const customPalette = this.customPaletteSetting.get();
    customPalette.colorNames = customPalette.colorNames || [];
    this.palettes.set(customPalette.title, customPalette);
    this.selectedColorPalette = Common6.Settings.Settings.instance().createSetting("selected-color-palette", GeneratedPaletteTitle);
    const palette = this.palettes.get(this.selectedColorPalette.get());
    if (palette) {
      this.showPalette(palette, true);
    }
  }
  addPalette(palette) {
    this.palettes.set(palette.title, palette);
    if (this.selectedColorPalette.get() === palette.title) {
      this.showPalette(palette, true);
    }
  }
  createPreviewPaletteElement(palette) {
    const colorsPerPreviewRow = 5;
    const previewElement = document.createElement("div");
    previewElement.classList.add("palette-preview");
    UI4.ARIAUtils.markAsButton(previewElement);
    previewElement.tabIndex = 0;
    const titleElement = previewElement.createChild("div", "palette-preview-title");
    titleElement.textContent = palette.title;
    let i;
    for (i = 0; i < colorsPerPreviewRow && i < palette.colors.length; i++) {
      previewElement.appendChild(this.createPaletteColor(palette.colors[i], palette.colorNames[i]));
    }
    for (; i < colorsPerPreviewRow; i++) {
      previewElement.createChild("div", "spectrum-palette-color empty-color");
    }
    self.onInvokeElement(previewElement, (event) => {
      this.paletteSelected(palette);
      event.consume(true);
    });
    return previewElement;
  }
  paletteSelected(palette) {
    this.selectedColorPalette.set(palette.title);
    this.showPalette(palette, true);
  }
  resizeForSelectedPalette(force) {
    const palette = this.palettes.get(this.selectedColorPalette.get());
    if (!palette) {
      return;
    }
    let numColors = palette.colors.length;
    if (palette === this.customPaletteSetting.get()) {
      numColors++;
    }
    const rowsNeeded = Math.max(1, Math.ceil(numColors / ITEMS_PER_PALETTE_ROW));
    if (this.numPaletteRowsShown === rowsNeeded && !force) {
      return;
    }
    this.numPaletteRowsShown = rowsNeeded;
    const paletteColorHeight = 12;
    const paletteMargin = 12;
    let paletteTop = 236;
    if (this.contrastDetails) {
      if (this.contrastDetails.expanded()) {
        paletteTop += 78;
      } else {
        paletteTop += 36;
      }
    }
    this.element.style.height = paletteTop + paletteMargin + (paletteColorHeight + paletteMargin) * rowsNeeded + "px";
    this.dispatchEventToListeners(
      "SizeChanged"
      /* Events.SIZE_CHANGED */
    );
  }
  onPaletteColorKeydown(palette, colorIndex, event) {
    if (event instanceof MouseEvent || Platform3.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      const colorText = palette.colors[colorIndex];
      const colorName = palette.colorNames[colorIndex];
      const color = Common6.Color.parse(colorText);
      if (color) {
        this.#setColor(color, colorText, colorName, palette.matchUserFormat ? this.colorFormat : color.format(), ChangeSource.Other);
      }
      return;
    }
    let nextColorIndex;
    switch (event.key) {
      case "ArrowLeft":
        nextColorIndex = colorIndex - 1;
        break;
      case "ArrowRight":
        nextColorIndex = colorIndex + 1;
        break;
      case "ArrowUp":
        nextColorIndex = colorIndex - ITEMS_PER_PALETTE_ROW;
        break;
      case "ArrowDown":
        nextColorIndex = colorIndex + ITEMS_PER_PALETTE_ROW;
        break;
    }
    if (nextColorIndex !== void 0 && nextColorIndex > -1 && nextColorIndex < this.paletteContainer.childNodes.length) {
      this.paletteContainer.childNodes[nextColorIndex].focus();
    }
  }
  onShadeColorKeydown(shade, colorElement, event) {
    if (event instanceof MouseEvent || Platform3.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      const color = Common6.Color.parse(shade);
      if (color) {
        this.#setColor(color, shade, shade, color.format(), ChangeSource.Other);
      }
      return;
    }
    const target = event.target;
    if (Platform3.KeyboardUtilities.isEscKey(event) || event.key === "Tab") {
      colorElement.focus();
      if (this.shadesCloseHandler) {
        this.shadesCloseHandler();
      }
      event.consume(true);
    } else if (event.key === "ArrowUp" && target.previousElementSibling) {
      target.previousElementSibling.focus();
      event.consume(true);
    } else if (event.key === "ArrowDown" && target.nextElementSibling) {
      target.nextElementSibling.focus();
      event.consume(true);
    }
  }
  onAddColorMousedown() {
    this.addColorToCustomPalette();
  }
  onAddColorKeydown(event) {
    if (Platform3.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      this.addColorToCustomPalette();
      event.consume(true);
    }
  }
  addColorToCustomPalette() {
    const palette = this.customPaletteSetting.get();
    palette.colors.push(this.colorString());
    this.customPaletteSetting.set(palette);
    this.showPalette(palette, false);
    const colorElements = this.paletteContainer.querySelectorAll(".spectrum-palette-color");
    colorElements[colorElements.length - 1].focus();
  }
  showPaletteColorContextMenu(colorIndex, event) {
    if (!this.paletteContainerMutable) {
      return;
    }
    const contextMenu = new UI4.ContextMenu.ContextMenu(event);
    if (colorIndex !== -1) {
      contextMenu.defaultSection().appendItem(i18nString3(UIStrings3.removeColor), this.deletePaletteColors.bind(this, colorIndex, false), { jslogContext: "remove-color" });
      contextMenu.defaultSection().appendItem(i18nString3(UIStrings3.removeAllToTheRight), this.deletePaletteColors.bind(this, colorIndex, true), { jslogContext: "remove-all-to-the-right" });
    }
    contextMenu.defaultSection().appendItem(i18nString3(UIStrings3.clearPalette), this.deletePaletteColors.bind(this, -1, true), { jslogContext: "clear-palette" });
    void contextMenu.show();
  }
  deletePaletteColors(colorIndex, toRight) {
    const palette = this.customPaletteSetting.get();
    if (toRight) {
      palette.colors.splice(colorIndex + 1, palette.colors.length - colorIndex - 1);
    } else {
      palette.colors.splice(colorIndex, 1);
    }
    this.customPaletteSetting.set(palette);
    this.showPalette(palette, false);
  }
  setColor(color) {
    this.#setColor(color, "", void 0, color.format(), ChangeSource.Model);
    const colorValues = color.as(
      "hsl"
      /* Common.Color.Format.HSL */
    ).canonicalHSLA();
    UI4.ARIAUtils.setValueNow(this.hueElement, colorValues[0]);
    UI4.ARIAUtils.setValueText(this.alphaElement, colorValues[3]);
  }
  colorSelected(color) {
    this.#setColor(color, "", void 0, void 0, ChangeSource.Other);
  }
  get color() {
    if (this.#color) {
      return this.#color;
    }
    return getColorFromHsva(this.gamut, this.hsv);
  }
  #setColor(colorOrHsv, colorString, colorName, colorFormat, changeSource) {
    if (colorString !== void 0) {
      this.#colorString = colorString;
    }
    if (colorFormat !== void 0) {
      this.colorFormat = convertColorFormat(colorFormat);
      this.gamut = doesFormatSupportDisplayP3(this.colorFormat) ? "display-p3" : "srgb";
    }
    if (Array.isArray(colorOrHsv)) {
      this.#color = void 0;
      this.hsv = colorOrHsv;
    } else if (colorOrHsv !== void 0) {
      this.#color = colorOrHsv;
      const oldHue = this.hsv ? this.hsv[0] : null;
      this.hsv = getHsvFromColor(this.gamut, colorOrHsv);
      if (oldHue !== null && colorOrHsv.as(
        "lch"
        /* Common.Color.Format.LCH */
      ).isHuePowerless()) {
        this.hsv[0] = oldHue;
      }
    }
    this.#colorName = colorName;
    if (this.contrastInfo) {
      this.contrastInfo.setColor(Common6.Color.Legacy.fromHSVA(this.hsv), this.colorFormat);
    }
    this.updateHelperLocations();
    this.updateUI();
    if (changeSource !== ChangeSource.Input) {
      this.updateInput();
    }
    if (changeSource !== ChangeSource.Model) {
      this.dispatchEventToListeners("ColorChanged", this.colorString());
    }
  }
  colorName() {
    return this.#colorName;
  }
  colorString() {
    if (this.#colorString) {
      return this.#colorString;
    }
    const color = this.color;
    let colorString = this.colorFormat && this.colorFormat !== color.format() ? color.asString(this.colorFormat) : color.getAuthoredText() ?? color.asString();
    if (colorString) {
      return colorString;
    }
    if (this.colorFormat === "hex") {
      colorString = color.asString(
        "hexa"
        /* Common.Color.Format.HEXA */
      );
    } else if (this.colorFormat === "hsl") {
      colorString = color.asString(
        "hsla"
        /* Common.Color.Format.HSLA */
      );
    } else if (this.colorFormat === "hwb") {
      colorString = color.asString(
        "hwba"
        /* Common.Color.Format.HWBA */
      );
    } else {
      colorString = color.asString(
        "rgba"
        /* Common.Color.Format.RGBA */
      );
    }
    console.assert(Boolean(colorString));
    return colorString || "";
  }
  updateHelperLocations() {
    const h = this.hsv[0];
    const s = this.hsv[1];
    const v = this.hsv[2];
    const alpha = this.hsv[3];
    this.dragX = s * this.dragWidth;
    this.dragY = this.dragHeight - v * this.dragHeight;
    const dragX = Math.max(-this.colorDragElementHeight, Math.min(this.dragWidth - this.colorDragElementHeight, this.dragX - this.colorDragElementHeight));
    const dragY = Math.max(-this.colorDragElementHeight, Math.min(this.dragHeight - this.colorDragElementHeight, this.dragY - this.colorDragElementHeight));
    this.colorDragElement.positionAt(dragX, dragY);
    const hueSlideX = (1 - h) * this.hueAlphaWidth - this.slideHelperWidth;
    this.hueSlider.style.left = hueSlideX + "px";
    const alphaSlideX = alpha * this.hueAlphaWidth - this.slideHelperWidth;
    this.alphaSlider.style.left = alphaSlideX + "px";
  }
  updateInput() {
    if (this.colorFormat === "hex") {
      this.hexContainer.hidden = false;
      this.displayContainer.hidden = true;
      this.hexValue.value = this.color.asString(
        (this.color.alpha ?? 1) !== 1 ? "hexa" : "hex"
        /* Common.Color.Format.HEX */
      );
    } else {
      this.hexContainer.hidden = true;
      this.displayContainer.hidden = false;
      const spec = colorFormatSpec[this.colorFormat];
      const colorValues = spec.toValues(this.color);
      this.textLabels.textContent = spec.label;
      for (let i = 0; i < this.textValues.length; ++i) {
        UI4.ARIAUtils.setLabel(
          this.textValues[i],
          /** R in RGBA */
          i18nString3(UIStrings3.sInS, {
            PH1: this.textLabels.textContent.charAt(i),
            PH2: this.textLabels.textContent
          })
        );
        this.textValues[i].value = String(colorValues[i]);
      }
    }
  }
  hideSrgbOverlay() {
    if (this.colorElement.contains(this.srgbOverlay)) {
      this.colorElement.removeChild(this.srgbOverlay);
    }
  }
  showSrgbOverlay() {
    if (this.contrastDetails?.expanded() || this.gamut !== "display-p3") {
      return;
    }
    void this.srgbOverlay.render({
      hue: this.hsv[0],
      width: this.dragWidth,
      height: this.dragHeight
    });
    if (!this.colorElement.contains(this.srgbOverlay)) {
      this.colorElement.appendChild(this.srgbOverlay);
    }
  }
  updateSrgbOverlay() {
    if (this.gamut === "display-p3") {
      this.showSrgbOverlay();
    } else {
      this.hideSrgbOverlay();
    }
  }
  updateUI() {
    this.colorElement.style.backgroundColor = getColorFromHsva(this.gamut, [this.hsv[0], 1, 1, 1]).asString();
    if (this.contrastOverlay) {
      this.contrastOverlay.setDimensions(this.dragWidth, this.dragHeight);
    }
    this.updateSrgbOverlay();
    this.swatch.setColor(this.color, this.colorString());
    this.colorDragElement.style.backgroundColor = this.color.asString(
      "lch"
      /* Common.Color.Format.LCH */
    );
    const noAlpha = Common6.Color.Legacy.fromHSVA(this.hsv.slice(0, 3).concat(1));
    this.alphaElementBackground.style.backgroundImage = Platform3.StringUtilities.sprintf("linear-gradient(to right, rgba(0,0,0,0), %s)", noAlpha.asString(
      "lch"
      /* Common.Color.Format.LCH */
    ));
    this.hueElement.classList.toggle("display-p3", doesFormatSupportDisplayP3(this.colorFormat));
  }
  async showFormatPicker(event) {
    const contextMenu = new FormatPickerContextMenu(this.color);
    this.isFormatPickerShown = true;
    await contextMenu.show(event, (newColor) => {
      this.#setColor(newColor, void 0, void 0, newColor.format(), ChangeSource.Other);
    });
    this.isFormatPickerShown = false;
  }
  /**
   * If the pasted input is parsable as a color, applies it converting to the current user format
   */
  pasted(event) {
    if (!event.clipboardData) {
      return;
    }
    const text = event.clipboardData.getData("text");
    const color = Common6.Color.parse(text);
    if (!color) {
      return;
    }
    this.#setColor(color, text, void 0, void 0, ChangeSource.Other);
    event.preventDefault();
  }
  #getValueSteppingForInput(element) {
    const channel = this.color.channels[this.textValues.indexOf(element)];
    switch (channel) {
      case "r":
      case "g":
      case "b":
        return this.color instanceof Common6.Color.ColorFunction ? { step: 0.01, range: { min: 0, max: 1 } } : { step: 1, range: { min: 0, max: 255 } };
      case "alpha":
      case "x":
      case "y":
      case "z":
        return { step: 0.01, range: { min: 0, max: 1 } };
      default:
        return void 0;
    }
  }
  inputChanged(event) {
    const inputElement = event.currentTarget;
    const newValue = UI4.UIUtils.createReplacementString(inputElement.value, event, void 0, this.#getValueSteppingForInput(inputElement));
    if (newValue) {
      inputElement.value = newValue;
      inputElement.selectionStart = 0;
      inputElement.selectionEnd = newValue.length;
      event.consume(true);
    }
    let color = null;
    let colorFormat;
    if (this.colorFormat === "hex") {
      color = Common6.Color.parse(this.hexValue.value);
    } else {
      const spec = colorFormatSpec[this.colorFormat];
      const colorTextValues = this.textValues.map((element) => element.value);
      if (colorTextValues.length !== 4) {
        return;
      }
      color = spec.fromValues(colorTextValues);
    }
    if (!color) {
      return;
    }
    this.#setColor(color, void 0, void 0, colorFormat, ChangeSource.Input);
  }
  wasShown() {
    super.wasShown();
    this.hueAlphaWidth = this.hueElement.offsetWidth;
    this.slideHelperWidth = this.hueSlider.offsetWidth / 2;
    this.dragWidth = this.colorElement.offsetWidth;
    this.dragHeight = this.colorElement.offsetHeight;
    this.colorDragElementHeight = this.colorDragElement.offsetHeight / 2;
    this.#setColor(void 0, void 0, void 0, void 0, ChangeSource.Model);
    if (!IS_NATIVE_EYE_DROPPER_AVAILABLE) {
      void this.toggleColorPicker(true);
    } else {
      this.colorPickerButton.setToggled(false);
    }
    if (this.contrastDetails && this.contrastDetailsBackgroundColorPickerToggledBound) {
      this.contrastDetails.addEventListener("BackgroundColorPickerWillBeToggled", this.contrastDetailsBackgroundColorPickerToggledBound);
    }
  }
  willHide() {
    super.willHide();
    void this.toggleColorPicker(false);
    if (this.contrastDetails && this.contrastDetailsBackgroundColorPickerToggledBound) {
      this.contrastDetails.removeEventListener("BackgroundColorPickerWillBeToggled", this.contrastDetailsBackgroundColorPickerToggledBound);
    }
  }
  async toggleColorPicker(enabled) {
    if (enabled === void 0) {
      enabled = this.colorPickerButton.isToggled();
    }
    if (this.contrastDetails?.backgroundColorPickerEnabled()) {
      this.contrastDetails.toggleBackgroundColorPicker(false);
    }
    if (!IS_NATIVE_EYE_DROPPER_AVAILABLE) {
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.setEyeDropperActive(enabled);
      if (enabled) {
        Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host2.InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this.colorPickedBound);
      } else {
        Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(Host2.InspectorFrontendHostAPI.Events.EyeDropperPickedColor, this.colorPickedBound);
      }
    } else if (IS_NATIVE_EYE_DROPPER_AVAILABLE && enabled) {
      const eyeDropper = new window.EyeDropper();
      this.eyeDropperAbortController = new AbortController();
      try {
        const hexColor = await eyeDropper.open({ signal: this.eyeDropperAbortController.signal });
        const color = Common6.Color.parse(hexColor.sRGBHex);
        this.#setColor(color ?? void 0, "", void 0, void 0, ChangeSource.Other);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(error);
        }
      }
      this.colorPickerButton.setToggled(false);
    } else if (IS_NATIVE_EYE_DROPPER_AVAILABLE && !enabled) {
      this.eyeDropperAbortController?.abort();
      this.eyeDropperAbortController = null;
    }
  }
  colorPicked({ data: rgbColor }) {
    const rgba = [rgbColor.r, rgbColor.g, rgbColor.b, (rgbColor.a / 2.55 | 0) / 100];
    const color = Common6.Color.Legacy.fromRGBA(rgba);
    this.#setColor(color, "", void 0, void 0, ChangeSource.Other);
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
  }
};
var ChangeSource = {
  Input: "Input",
  Model: "Model",
  Other: "Other"
};
var COLOR_CHIP_SIZE = 24;
var ITEMS_PER_PALETTE_ROW = 8;
var GeneratedPaletteTitle = "Page colors";
var PaletteGenerator = class {
  callback;
  frequencyMap = /* @__PURE__ */ new Map();
  constructor(callback) {
    this.callback = callback;
    const stylesheetPromises = [];
    for (const cssModel of SDK.TargetManager.TargetManager.instance().models(SDK.CSSModel.CSSModel)) {
      for (const stylesheet of cssModel.allStyleSheets()) {
        stylesheetPromises.push(this.processStylesheet(stylesheet));
      }
    }
    void Promise.all(stylesheetPromises).catch((error) => {
      console.error(error);
    }).then(this.finish.bind(this));
  }
  frequencyComparator(a, b) {
    return this.frequencyMap.get(b) - this.frequencyMap.get(a);
  }
  finish() {
    function hueComparator(a, b) {
      const hsva = paletteColors.get(a).as(
        "hsl"
        /* Common.Color.Format.HSL */
      ).hsva();
      const hsvb = paletteColors.get(b).as(
        "hsl"
        /* Common.Color.Format.HSL */
      ).hsva();
      if (hsvb[1] < 0.12 && hsva[1] < 0.12) {
        return hsvb[2] * hsvb[3] - hsva[2] * hsva[3];
      }
      if (hsvb[1] < 0.12) {
        return -1;
      }
      if (hsva[1] < 0.12) {
        return 1;
      }
      if (hsvb[0] === hsva[0]) {
        return hsvb[1] * hsvb[3] - hsva[1] * hsva[3];
      }
      return (hsvb[0] + 0.94) % 1 - (hsva[0] + 0.94) % 1;
    }
    let colors = [...this.frequencyMap.keys()];
    colors = colors.sort(this.frequencyComparator.bind(this));
    const paletteColors = /* @__PURE__ */ new Map();
    const colorsPerRow = 24;
    while (paletteColors.size < colorsPerRow && colors.length) {
      const colorText = colors.shift();
      const color = Common6.Color.parse(colorText);
      if (!color) {
        continue;
      }
      paletteColors.set(colorText, color);
    }
    this.callback({
      title: GeneratedPaletteTitle,
      colors: [...paletteColors.keys()].sort(hueComparator),
      colorNames: [],
      mutable: false,
      matchUserFormat: void 0
    });
  }
  async processStylesheet(stylesheet) {
    const contentDataOrError = await stylesheet.requestContentData();
    const text = TextUtils.ContentData.ContentData.textOr(contentDataOrError, "").toLowerCase();
    const regexResult = text.matchAll(/((?:rgb|hsl|hwb)a?\([^)]+\)|#[0-9a-f]{6}|#[0-9a-f]{3})/g);
    for (const { 0: c, index } of regexResult) {
      if (text.indexOf(";", index) < 0 || text.indexOf(":", index) > -1 && text.indexOf(":", index) < text.indexOf(";", index)) {
        continue;
      }
      const frequency = 1 + (this.frequencyMap.get(c) ?? 0);
      this.frequencyMap.set(c, frequency);
    }
  }
};
var MaterialPaletteShades = /* @__PURE__ */ new Map([
  [
    "#F44336",
    ["#FFEBEE", "#FFCDD2", "#EF9A9A", "#E57373", "#EF5350", "#F44336", "#E53935", "#D32F2F", "#C62828", "#B71C1C"]
  ],
  [
    "#E91E63",
    ["#FCE4EC", "#F8BBD0", "#F48FB1", "#F06292", "#EC407A", "#E91E63", "#D81B60", "#C2185B", "#AD1457", "#880E4F"]
  ],
  [
    "#9C27B0",
    ["#F3E5F5", "#E1BEE7", "#CE93D8", "#BA68C8", "#AB47BC", "#9C27B0", "#8E24AA", "#7B1FA2", "#6A1B9A", "#4A148C"]
  ],
  [
    "#673AB7",
    ["#EDE7F6", "#D1C4E9", "#B39DDB", "#9575CD", "#7E57C2", "#673AB7", "#5E35B1", "#512DA8", "#4527A0", "#311B92"]
  ],
  [
    "#3F51B5",
    ["#E8EAF6", "#C5CAE9", "#9FA8DA", "#7986CB", "#5C6BC0", "#3F51B5", "#3949AB", "#303F9F", "#283593", "#1A237E"]
  ],
  [
    "#2196F3",
    ["#E3F2FD", "#BBDEFB", "#90CAF9", "#64B5F6", "#42A5F5", "#2196F3", "#1E88E5", "#1976D2", "#1565C0", "#0D47A1"]
  ],
  [
    "#03A9F4",
    ["#E1F5FE", "#B3E5FC", "#81D4FA", "#4FC3F7", "#29B6F6", "#03A9F4", "#039BE5", "#0288D1", "#0277BD", "#01579B"]
  ],
  [
    "#00BCD4",
    ["#E0F7FA", "#B2EBF2", "#80DEEA", "#4DD0E1", "#26C6DA", "#00BCD4", "#00ACC1", "#0097A7", "#00838F", "#006064"]
  ],
  [
    "#009688",
    ["#E0F2F1", "#B2DFDB", "#80CBC4", "#4DB6AC", "#26A69A", "#009688", "#00897B", "#00796B", "#00695C", "#004D40"]
  ],
  [
    "#4CAF50",
    ["#E8F5E9", "#C8E6C9", "#A5D6A7", "#81C784", "#66BB6A", "#4CAF50", "#43A047", "#388E3C", "#2E7D32", "#1B5E20"]
  ],
  [
    "#8BC34A",
    ["#F1F8E9", "#DCEDC8", "#C5E1A5", "#AED581", "#9CCC65", "#8BC34A", "#7CB342", "#689F38", "#558B2F", "#33691E"]
  ],
  [
    "#CDDC39",
    ["#F9FBE7", "#F0F4C3", "#E6EE9C", "#DCE775", "#D4E157", "#CDDC39", "#C0CA33", "#AFB42B", "#9E9D24", "#827717"]
  ],
  [
    "#FFEB3B",
    ["#FFFDE7", "#FFF9C4", "#FFF59D", "#FFF176", "#FFEE58", "#FFEB3B", "#FDD835", "#FBC02D", "#F9A825", "#F57F17"]
  ],
  [
    "#FFC107",
    ["#FFF8E1", "#FFECB3", "#FFE082", "#FFD54F", "#FFCA28", "#FFC107", "#FFB300", "#FFA000", "#FF8F00", "#FF6F00"]
  ],
  [
    "#FF9800",
    ["#FFF3E0", "#FFE0B2", "#FFCC80", "#FFB74D", "#FFA726", "#FF9800", "#FB8C00", "#F57C00", "#EF6C00", "#E65100"]
  ],
  [
    "#FF5722",
    ["#FBE9E7", "#FFCCBC", "#FFAB91", "#FF8A65", "#FF7043", "#FF5722", "#F4511E", "#E64A19", "#D84315", "#BF360C"]
  ],
  [
    "#795548",
    ["#EFEBE9", "#D7CCC8", "#BCAAA4", "#A1887F", "#8D6E63", "#795548", "#6D4C41", "#5D4037", "#4E342E", "#3E2723"]
  ],
  [
    "#9E9E9E",
    ["#FAFAFA", "#F5F5F5", "#EEEEEE", "#E0E0E0", "#BDBDBD", "#9E9E9E", "#757575", "#616161", "#424242", "#212121"]
  ],
  [
    "#607D8B",
    ["#ECEFF1", "#CFD8DC", "#B0BEC5", "#90A4AE", "#78909C", "#607D8B", "#546E7A", "#455A64", "#37474F", "#263238"]
  ]
]);
var MaterialPalette = {
  title: "Material",
  mutable: false,
  matchUserFormat: true,
  colors: [...MaterialPaletteShades.keys()],
  colorNames: []
};
var Swatch2 = class {
  colorString;
  swatchInnerElement;
  swatchOverlayElement;
  swatchCopyIcon;
  constructor(parentElement) {
    const swatchElement = parentElement.createChild("span", "swatch");
    swatchElement.setAttribute("jslog", `${VisualLogging.action("copy-color").track({ click: true })}`);
    this.swatchInnerElement = swatchElement.createChild("span", "swatch-inner");
    this.swatchOverlayElement = swatchElement.createChild("span", "swatch-overlay");
    UI4.ARIAUtils.markAsButton(this.swatchOverlayElement);
    UI4.ARIAUtils.setPressed(this.swatchOverlayElement, false);
    this.swatchOverlayElement.tabIndex = 0;
    self.onInvokeElement(this.swatchOverlayElement, this.onCopyText.bind(this));
    this.swatchOverlayElement.addEventListener("mouseout", this.onCopyIconMouseout.bind(this));
    this.swatchOverlayElement.addEventListener("blur", this.onCopyIconMouseout.bind(this));
    this.swatchCopyIcon = IconButton2.Icon.create("copy", "copy-color-icon");
    UI4.Tooltip.Tooltip.install(this.swatchCopyIcon, i18nString3(UIStrings3.copyColorToClipboard));
    this.swatchOverlayElement.appendChild(this.swatchCopyIcon);
    UI4.ARIAUtils.setLabel(this.swatchOverlayElement, this.swatchCopyIcon.title);
  }
  setColor(color, colorString) {
    const lchColor = color.as(
      "lch"
      /* Common.Color.Format.LCH */
    );
    this.swatchInnerElement.style.backgroundColor = lchColor.asString();
    this.swatchInnerElement.classList.toggle("swatch-inner-white", lchColor.l > 90);
    this.colorString = colorString || null;
    if (colorString) {
      this.swatchOverlayElement.hidden = false;
    } else {
      this.swatchOverlayElement.hidden = true;
    }
  }
  onCopyText(event) {
    this.swatchCopyIcon.name = "checkmark";
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.colorString);
    UI4.ARIAUtils.setPressed(this.swatchOverlayElement, true);
    event.consume();
  }
  onCopyIconMouseout() {
    this.swatchCopyIcon.name = "copy";
    UI4.ARIAUtils.setPressed(this.swatchOverlayElement, false);
  }
};
export {
  ColorFormatSpec_exports as ColorFormatSpec,
  ContrastDetails_exports as ContrastDetails,
  ContrastInfo_exports as ContrastInfo,
  ContrastOverlay_exports as ContrastOverlay,
  FormatPickerContextMenu_exports as FormatPickerContextMenu,
  Spectrum_exports as Spectrum
};
//# sourceMappingURL=color_picker.js.map
