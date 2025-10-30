// gen/front_end/ui/legacy/theme_support/ThemeSupport.js
import * as Common from "./../../../core/common/common.js";
import * as Host from "./../../../core/host/host.js";
import * as Root from "./../../../core/root/root.js";
var themeSupportInstance;
var themeValueByTargetByName = /* @__PURE__ */ new Map();
var ThemeSupport = class _ThemeSupport extends EventTarget {
  setting;
  #themeName = "default";
  computedStyleOfHTML = Common.Lazy.lazy(() => window.getComputedStyle(document.documentElement));
  #documentsToTheme = /* @__PURE__ */ new Set([document]);
  #darkThemeMediaQuery;
  #highContrastMediaQuery;
  #onThemeChangeListener = () => this.#applyTheme();
  #onHostThemeChangeListener = () => this.fetchColorsAndApplyHostTheme();
  constructor(setting) {
    super();
    this.setting = setting;
    this.#darkThemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.#highContrastMediaQuery = window.matchMedia("(forced-colors: active)");
    this.#darkThemeMediaQuery.addEventListener("change", this.#onThemeChangeListener);
    this.#highContrastMediaQuery.addEventListener("change", this.#onThemeChangeListener);
    setting.addChangeListener(this.#onThemeChangeListener);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.ColorThemeChanged, this.#onHostThemeChangeListener);
  }
  #dispose() {
    this.#darkThemeMediaQuery.removeEventListener("change", this.#onThemeChangeListener);
    this.#highContrastMediaQuery.removeEventListener("change", this.#onThemeChangeListener);
    this.setting.removeChangeListener(this.#onThemeChangeListener);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(Host.InspectorFrontendHostAPI.Events.ColorThemeChanged, this.#onHostThemeChangeListener);
  }
  static hasInstance() {
    return typeof themeSupportInstance !== "undefined";
  }
  static instance(opts = { forceNew: null, setting: null }) {
    const { forceNew, setting } = opts;
    if (!themeSupportInstance || forceNew) {
      if (!setting) {
        throw new Error(`Unable to create theme support: setting must be provided: ${new Error().stack}`);
      }
      if (themeSupportInstance) {
        themeSupportInstance.#dispose();
      }
      themeSupportInstance = new _ThemeSupport(setting);
    }
    return themeSupportInstance;
  }
  /**
   * Adds additional `Document` instances that should be themed besides the default
   * `window.document` in which this ThemeSupport instance was created.
   */
  addDocumentToTheme(document2) {
    this.#documentsToTheme.add(document2);
    this.#fetchColorsAndApplyHostTheme(document2);
  }
  getComputedValue(propertyName, target = null) {
    let themeValueByName = themeValueByTargetByName.get(target);
    if (!themeValueByName) {
      themeValueByName = /* @__PURE__ */ new Map();
      themeValueByTargetByName.set(target, themeValueByName);
    }
    let themeValue = themeValueByName.get(propertyName);
    if (!themeValue) {
      const styleDeclaration = target ? window.getComputedStyle(target) : this.computedStyleOfHTML();
      if (typeof styleDeclaration === "symbol") {
        throw new Error(`Computed value for property (${propertyName}) could not be found on documentElement.`);
      }
      themeValue = styleDeclaration.getPropertyValue(propertyName).trim();
      if (themeValue) {
        themeValueByName.set(propertyName, themeValue);
      }
    }
    return themeValue;
  }
  themeName() {
    return this.#themeName;
  }
  #applyTheme() {
    for (const document2 of this.#documentsToTheme) {
      this.#applyThemeToDocument(document2);
    }
  }
  #applyThemeToDocument(document2) {
    const isForcedColorsMode = window.matchMedia("(forced-colors: active)").matches;
    const systemPreferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default";
    const useSystemPreferred = this.setting.get() === "systemPreferred" || isForcedColorsMode;
    this.#themeName = useSystemPreferred ? systemPreferredTheme : this.setting.get();
    document2.documentElement.classList.toggle("theme-with-dark-background", this.#themeName === "dark");
    const useChromeTheme = Common.Settings.moduleSetting("chrome-theme-colors").get();
    const isIncognito = Root.Runtime.hostConfig.isOffTheRecord === true;
    if (isIncognito) {
      document2.documentElement.classList.toggle("baseline-grayscale", true);
    } else if (useChromeTheme) {
      const selectedTheme = getComputedStyle(document2.body).getPropertyValue("--user-color-source");
      document2.documentElement.classList.toggle("baseline-default", selectedTheme === "baseline-default");
      document2.documentElement.classList.toggle("baseline-grayscale", selectedTheme === "baseline-grayscale");
    } else {
      document2.documentElement.classList.toggle("baseline-grayscale", true);
    }
    themeValueByTargetByName.clear();
    this.dispatchEvent(new ThemeChangeEvent());
  }
  static clearThemeCache() {
    themeValueByTargetByName.clear();
  }
  fetchColorsAndApplyHostTheme() {
    for (const document2 of this.#documentsToTheme) {
      this.#fetchColorsAndApplyHostTheme(document2);
    }
  }
  #fetchColorsAndApplyHostTheme(document2) {
    const useChromeTheme = Common.Settings.moduleSetting("chrome-theme-colors").get();
    if (Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode() || !useChromeTheme) {
      this.#applyThemeToDocument(document2);
      return;
    }
    const oldColorsCssLink = document2.querySelector("link[href*='//theme/colors.css']");
    const newColorsCssLink = document2.createElement("link");
    newColorsCssLink.setAttribute("href", `devtools://theme/colors.css?sets=ui,chrome&version=${(/* @__PURE__ */ new Date()).getTime().toString()}`);
    newColorsCssLink.setAttribute("rel", "stylesheet");
    newColorsCssLink.setAttribute("type", "text/css");
    newColorsCssLink.onload = () => {
      if (oldColorsCssLink) {
        oldColorsCssLink.remove();
      }
      this.#applyThemeToDocument(document2);
    };
    document2.body.appendChild(newColorsCssLink);
  }
};
var ThemeChangeEvent = class _ThemeChangeEvent extends Event {
  static eventName = "themechange";
  constructor() {
    super(_ThemeChangeEvent.eventName, { bubbles: true, composed: true });
  }
};
export {
  ThemeChangeEvent,
  ThemeSupport
};
//# sourceMappingURL=theme_support.js.map
