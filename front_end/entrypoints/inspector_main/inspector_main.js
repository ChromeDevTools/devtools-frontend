var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/entrypoints/inspector_main/RenderingOptions.js
var RenderingOptions_exports = {};
__export(RenderingOptions_exports, {
  ReloadActionDelegate: () => ReloadActionDelegate,
  RenderingOptionsView: () => RenderingOptionsView
});
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as SettingsUI from "./../../ui/legacy/components/settings_ui/settings_ui.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/entrypoints/inspector_main/renderingOptions.css.js
var renderingOptions_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  padding: 12px;
}

devtools-checkbox {
  margin: 0 0 10px;
  flex: none;
}

.panel-section-separator {
  height: 1px;
  margin-bottom: 10px;
  background: var(--sys-color-divider);
  flex: none;
}

.panel-section-separator:last-child {
  background: transparent;
}

.chrome-select-label {
  margin-bottom: 16px;
}

/*# sourceURL=${import.meta.resolve("./renderingOptions.css")} */`;

// gen/front_end/entrypoints/inspector_main/RenderingOptions.js
var UIStrings = {
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting highlights areas
   * of the webpage that need to be repainted (re-drawn by the browser).
   */
  paintFlashing: "Paint flashing",
  /**
   * @description Explanation text for the 'Paint flashing' setting in the Rendering tool.
   */
  highlightsAreasOfThePageGreen: "Highlights areas of the page (green) that need to be repainted. May not be suitable for people prone to photosensitive epilepsy.",
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting highlights areas
   * (regions) of the page that were shifted (where a 'layout shift' occurred). A layout shift is
   * where elements on the webpage move around and cause other nearby elements to move as well.
   */
  layoutShiftRegions: "Layout shift regions",
  /**
   * @description Explanation text for the 'Layout Shift Regions' setting in the Rendering tool.
   */
  highlightsAreasOfThePageBlueThat: "Highlights areas of the page (blue) that were shifted. May not be suitable for people prone to photosensitive epilepsy.",
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting shows the
   * borders of layers on the page. Layer is a noun.
   */
  layerBorders: "Layer borders",
  /**
   * @description Explanation text for the 'Layer borders' setting in the Rendering tool.
   */
  showsLayerBordersOrangeoliveAnd: "Shows layer borders (orange/olive) and tiles (cyan).",
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting shows the
   * rendering statistics for frames e.g. frames per second. Frame is a noun.
   */
  frameRenderingStats: "Frame Rendering Stats",
  /**
   * @description Explanation text for the 'Frame Rendering Stats' setting in the Rendering tool.
   * Plots is a verb. GPU = Graphics Processing Unit.
   */
  plotsFrameThroughputDropped: "Plots frame throughput, dropped frames distribution, and GPU memory.",
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting highlights
   * elements that can slow down scrolling on the page.
   */
  scrollingPerformanceIssues: "Scrolling performance issues",
  /**
   * @description Explanation text for the 'Scrolling performance issues' setting in the Rendering tool.
   */
  highlightsElementsTealThatCan: "Highlights elements (teal) that can slow down scrolling, including touch & wheel event handlers and other main-thread scrolling situations.",
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting highlights the
   * rendering frames for ads that are found on the page.
   */
  highlightAdFrames: "Highlight ad frames",
  /**
   * @description Explanation text for the 'Highlight ad frames' setting in the Rendering tool.
   */
  highlightsFramesRedDetectedToBe: "Highlights frames (red) detected to be ads.",
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting prevents the
   * webpage from loading 'local' fonts. Local fonts are fonts that are installed on the user's
   * computer, and not loaded over the network.
   */
  disableLocalFonts: "Disable local fonts",
  /**
   * @description Explanation text for the 'Disable local fonts' setting in the Rendering tool.
   */
  disablesLocalSourcesInFontface: "Disables `local()` sources in `@font-face` rules. Requires a page reload to apply.",
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting
   * emulates/pretends that the webpage is focused i.e. that the user interacted with it most
   * recently.
   */
  emulateAFocusedPage: "Emulate a focused page",
  /**
   * @description Explanation text for the 'Emulate a focused page' setting in the Rendering tool.
   */
  emulatesAFocusedPage: "Keep page focused. Commonly used for debugging disappearing elements.",
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting enables auto dark mode emulation.
   */
  emulateAutoDarkMode: "Enable automatic dark mode",
  /**
   * @description Explanation text for the 'Emulate automatic dark mode' setting in the Rendering tool.
   */
  emulatesAutoDarkMode: "Enables automatic dark mode and sets `prefers-color-scheme` to `dark`.",
  /**
   * @description Explanation text for the 'Emulate CSS media type' setting in the Rendering tool.
   * This setting overrides the CSS media type on the page:
   * https://developer.mozilla.org/en-US/docs/Web/CSS/@media#media_types
   */
  forcesMediaTypeForTestingPrint: "Forces media type for testing print and screen styles",
  /**
   * @description Explanation text for the 'Forces CSS prefers-color-scheme media' setting in the Rendering tool.
   */
  forcesCssPreferscolorschemeMedia: "Forces CSS `prefers-color-scheme` media feature",
  /**
   * @description Explanation text for the 'Forces CSS prefers-reduced-motion media' setting in the Rendering tool.
   */
  forcesCssPrefersreducedmotion: "Forces CSS `prefers-reduced-motion` media feature",
  /**
   * @description Explanation text for the 'Forces CSS prefers-contrast media' setting in the Rendering tool.
   */
  forcesCssPreferscontrastMedia: "Forces CSS `prefers-contrast` media feature",
  /**
   * @description Explanation text for the 'Forces CSS prefers-reduced-data media' setting in the Rendering tool.
   */
  forcesCssPrefersreduceddataMedia: "Forces CSS `prefers-reduced-data` media feature",
  /**
   * @description Explanation text for the 'Forces CSS prefers-reduced-transparency media' setting in the Rendering tool.
   */
  forcesCssPrefersreducedtransparencyMedia: "Forces CSS `prefers-reduced-transparency` media feature",
  /**
   * @description Explanation text for the 'Forces CSS color-gamut media' setting in the Rendering tool.
   */
  forcesCssColorgamutMediaFeature: "Forces CSS `color-gamut` media feature",
  /**
   * @description Explanation text for the 'Emulate vision deficiencies' setting in the Rendering tool.
   */
  forcesVisionDeficiencyEmulation: "Forces vision deficiency emulation",
  /**
   * @description Explanation text for the 'Emulate OS text scale' setting in the Rendering tool.
   */
  forcesOsTextScaleEmulation: "Forces OS text scale emulation",
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting disables the
   * page from loading images with the AVIF format.
   */
  disableAvifImageFormat: "Disable `AVIF` image format",
  /**
   * @description Explanation text for both the 'Disable AVIF image format' and 'Disable WebP image
   * format' settings in the Rendering tool.
   */
  requiresAPageReloadToApplyAnd: "Requires a page reload to apply and disables caching for image requests.",
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting disables the
   * page from loading images with the WebP format.
   */
  disableWebpImageFormat: "Disable `WebP` image format",
  /**
   * @description Explanation text for the 'Forces CSS forced-colors' setting in the Rendering tool.
   */
  forcesCssForcedColors: "Forces CSS forced-colors media feature"
};
var str_ = i18n.i18n.registerUIStrings("entrypoints/inspector_main/RenderingOptions.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var supportsPrefersReducedData = () => {
  const query = "not all and (prefers-reduced-data), (prefers-reduced-data)";
  return window.matchMedia(query).matches;
};
var supportsPrefersReducedTransparency = () => {
  const query = "not all and (prefers-reduced-transparency), (prefers-reduced-transparency)";
  return window.matchMedia(query).matches;
};
var supportsPrefersContrast = () => {
  const query = "not all and (prefers-contrast), (prefers-contrast)";
  return window.matchMedia(query).matches;
};
var RenderingOptionsView = class extends UI.Widget.VBox {
  constructor() {
    super({ useShadowDom: true });
    this.registerRequiredCSS(renderingOptions_css_default);
    this.element.setAttribute("jslog", `${VisualLogging.panel("rendering").track({ resize: true })}`);
    this.#appendCheckbox(i18nString(UIStrings.paintFlashing), i18nString(UIStrings.highlightsAreasOfThePageGreen), Common.Settings.Settings.instance().moduleSetting("show-paint-rects"));
    this.#appendCheckbox(i18nString(UIStrings.layoutShiftRegions), i18nString(UIStrings.highlightsAreasOfThePageBlueThat), Common.Settings.Settings.instance().moduleSetting("show-layout-shift-regions"));
    this.#appendCheckbox(i18nString(UIStrings.layerBorders), i18nString(UIStrings.showsLayerBordersOrangeoliveAnd), Common.Settings.Settings.instance().moduleSetting("show-debug-borders"));
    this.#appendCheckbox(i18nString(UIStrings.frameRenderingStats), i18nString(UIStrings.plotsFrameThroughputDropped), Common.Settings.Settings.instance().moduleSetting("show-fps-counter"));
    this.#appendCheckbox(i18nString(UIStrings.scrollingPerformanceIssues), i18nString(UIStrings.highlightsElementsTealThatCan), Common.Settings.Settings.instance().moduleSetting("show-scroll-bottleneck-rects"));
    this.#appendCheckbox(i18nString(UIStrings.highlightAdFrames), i18nString(UIStrings.highlightsFramesRedDetectedToBe), Common.Settings.Settings.instance().moduleSetting("show-ad-highlights"));
    this.#appendCheckbox(i18nString(UIStrings.disableLocalFonts), i18nString(UIStrings.disablesLocalSourcesInFontface), Common.Settings.Settings.instance().moduleSetting("local-fonts-disabled"));
    this.#appendCheckbox(i18nString(UIStrings.emulateAFocusedPage), i18nString(UIStrings.emulatesAFocusedPage), Common.Settings.Settings.instance().moduleSetting("emulate-page-focus"), { toggle: Host.UserMetrics.Action.ToggleEmulateFocusedPageFromRenderingTab });
    this.#appendCheckbox(i18nString(UIStrings.emulateAutoDarkMode), i18nString(UIStrings.emulatesAutoDarkMode), Common.Settings.Settings.instance().moduleSetting("emulate-auto-dark-mode"));
    this.contentElement.createChild("div").classList.add("panel-section-separator");
    this.#appendSelect(i18nString(UIStrings.forcesCssPreferscolorschemeMedia), Common.Settings.Settings.instance().moduleSetting("emulated-css-media-feature-prefers-color-scheme"));
    this.#appendSelect(i18nString(UIStrings.forcesMediaTypeForTestingPrint), Common.Settings.Settings.instance().moduleSetting("emulated-css-media"));
    this.#appendSelect(i18nString(UIStrings.forcesCssForcedColors), Common.Settings.Settings.instance().moduleSetting("emulated-css-media-feature-forced-colors"));
    if (supportsPrefersContrast()) {
      this.#appendSelect(i18nString(UIStrings.forcesCssPreferscontrastMedia), Common.Settings.Settings.instance().moduleSetting("emulated-css-media-feature-prefers-contrast"));
    }
    this.#appendSelect(i18nString(UIStrings.forcesCssPrefersreducedmotion), Common.Settings.Settings.instance().moduleSetting("emulated-css-media-feature-prefers-reduced-motion"));
    if (supportsPrefersReducedData()) {
      this.#appendSelect(i18nString(UIStrings.forcesCssPrefersreduceddataMedia), Common.Settings.Settings.instance().moduleSetting("emulated-css-media-feature-prefers-reduced-data"));
    }
    if (supportsPrefersReducedTransparency()) {
      this.#appendSelect(i18nString(UIStrings.forcesCssPrefersreducedtransparencyMedia), Common.Settings.Settings.instance().moduleSetting("emulated-css-media-feature-prefers-reduced-transparency"));
    }
    this.#appendSelect(i18nString(UIStrings.forcesCssColorgamutMediaFeature), Common.Settings.Settings.instance().moduleSetting("emulated-css-media-feature-color-gamut"));
    this.contentElement.createChild("div").classList.add("panel-section-separator");
    this.#appendSelect(i18nString(UIStrings.forcesVisionDeficiencyEmulation), Common.Settings.Settings.instance().moduleSetting("emulated-vision-deficiency"));
    this.contentElement.createChild("div").classList.add("panel-section-separator");
    this.#appendSelect(i18nString(UIStrings.forcesOsTextScaleEmulation), Common.Settings.Settings.instance().moduleSetting("emulated-os-text-scale"));
    this.contentElement.createChild("div").classList.add("panel-section-separator");
    this.#appendCheckbox(i18nString(UIStrings.disableAvifImageFormat), i18nString(UIStrings.requiresAPageReloadToApplyAnd), Common.Settings.Settings.instance().moduleSetting("avif-format-disabled"));
    this.#appendCheckbox(i18nString(UIStrings.disableWebpImageFormat), i18nString(UIStrings.requiresAPageReloadToApplyAnd), Common.Settings.Settings.instance().moduleSetting("webp-format-disabled"));
    this.contentElement.createChild("div").classList.add("panel-section-separator");
  }
  #appendCheckbox(label, subtitle, setting, metric) {
    const checkbox = UI.UIUtils.CheckboxLabel.create(label, false, subtitle, setting.name);
    UI.UIUtils.bindCheckbox(checkbox, setting, metric);
    this.contentElement.appendChild(checkbox);
    return checkbox;
  }
  #appendSelect(label, setting) {
    const control = SettingsUI.SettingsUI.createControlForSetting(setting, label);
    if (control) {
      this.contentElement.appendChild(control);
    }
  }
};
var ReloadActionDelegate = class {
  handleAction(_context, actionId) {
    const emulatedCSSMediaFeaturePrefersColorSchemeSetting = Common.Settings.Settings.instance().moduleSetting("emulated-css-media-feature-prefers-color-scheme");
    switch (actionId) {
      case "rendering.toggle-prefers-color-scheme": {
        const options = ["", "light", "dark"];
        const current = options.findIndex((x) => x === emulatedCSSMediaFeaturePrefersColorSchemeSetting.get() || "");
        emulatedCSSMediaFeaturePrefersColorSchemeSetting.set(options[(current + 1) % 3]);
        return true;
      }
    }
    return false;
  }
};

// gen/front_end/entrypoints/inspector_main/InspectorMain.js
var InspectorMain_exports = {};
__export(InspectorMain_exports, {
  BackendSettingsSync: () => BackendSettingsSync,
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  FocusDebuggeeActionDelegate: () => FocusDebuggeeActionDelegate,
  InspectorMainImpl: () => InspectorMainImpl,
  NodeIndicator: () => NodeIndicator,
  NodeIndicatorProvider: () => NodeIndicatorProvider,
  ReloadActionDelegate: () => ReloadActionDelegate2,
  SourcesPanelIndicator: () => SourcesPanelIndicator
});
import * as Common2 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as MobileThrottling from "./../../panels/mobile_throttling/mobile_throttling.js";
import * as Security from "./../../panels/security/security.js";
import * as Components from "./../../ui/legacy/components/utils/utils.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import * as Lit from "./../../ui/lit/lit.js";

// gen/front_end/entrypoints/inspector_main/nodeIcon.css.js
var nodeIcon_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.node-icon {
  width: 28px;
  height: 26px;
  /* stylelint-disable-next-line custom-property-pattern */
  background-image: var(--image-file-nodeIcon);
  background-size: 17px 17px;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 80%;
  cursor: auto;
}

.node-icon:hover {
  opacity: 100%;
}

.node-icon.inactive {
  filter: grayscale(100%);
}

/*# sourceURL=${import.meta.resolve("./nodeIcon.css")} */`;

// gen/front_end/entrypoints/inspector_main/InspectorMain.js
var { html } = Lit;
var UIStrings2 = {
  /**
   * @description Text that refers to the main target. The main target is the primary webpage that
   * DevTools is connected to. This text is used in various places in the UI as a label/name to inform
   * the user which target/webpage they are currently connected to, as DevTools may connect to multiple
   * targets at the same time in some scenarios.
   */
  main: "Main",
  /**
   * @description Text that refers to the tab target. The tab target is the Chrome tab that
   * DevTools is connected to. This text is used in various places in the UI as a label/name to inform
   * the user which target they are currently connected to, as DevTools may connect to multiple
   * targets at the same time in some scenarios.
   * @meaning Tab target that's different than the "Tab" of Chrome. (See b/343009012)
   */
  tab: "Tab",
  /**
   * @description A warning shown to the user when JavaScript is disabled on the webpage that
   * DevTools is connected to.
   */
  javascriptIsDisabled: "JavaScript is disabled",
  /**
   * @description A message that prompts the user to open devtools for a specific environment (Node.js)
   */
  openDedicatedTools: "Open dedicated DevTools for `Node.js`"
};
var str_2 = i18n3.i18n.registerUIStrings("entrypoints/inspector_main/InspectorMain.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var inspectorMainImplInstance;
var InspectorMainImpl = class _InspectorMainImpl {
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!inspectorMainImplInstance || forceNew) {
      inspectorMainImplInstance = new _InspectorMainImpl();
    }
    return inspectorMainImplInstance;
  }
  async run() {
    let firstCall = true;
    await SDK.Connections.initMainConnection(async () => {
      const type = Root.Runtime.Runtime.queryParam("v8only") ? SDK.Target.Type.NODE : Root.Runtime.Runtime.queryParam("targetType") === "tab" || Root.Runtime.Runtime.isTraceApp() ? SDK.Target.Type.TAB : SDK.Target.Type.FRAME;
      const waitForDebuggerInPage = type === SDK.Target.Type.FRAME && Root.Runtime.Runtime.queryParam("panel") === "sources";
      const name = type === SDK.Target.Type.FRAME ? i18nString2(UIStrings2.main) : i18nString2(UIStrings2.tab);
      const target = SDK.TargetManager.TargetManager.instance().createTarget("main", name, type, null, void 0, waitForDebuggerInPage);
      const waitForPrimaryPageTarget = () => {
        return new Promise((resolve) => {
          const targetManager = SDK.TargetManager.TargetManager.instance();
          targetManager.observeTargets({
            targetAdded: (target2) => {
              if (target2 === targetManager.primaryPageTarget()) {
                target2.setName(i18nString2(UIStrings2.main));
                resolve(target2);
              }
            },
            targetRemoved: (_) => {
            }
          });
        });
      };
      await waitForPrimaryPageTarget();
      if (!firstCall) {
        return;
      }
      firstCall = false;
      if (waitForDebuggerInPage) {
        const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
        if (debuggerModel) {
          if (!debuggerModel.isReadyToPause()) {
            await debuggerModel.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause);
          }
          debuggerModel.pause();
        }
      }
      if (type !== SDK.Target.Type.TAB) {
        void target.runtimeAgent().invoke_runIfWaitingForDebugger();
      }
    }, Components.TargetDetachedDialog.TargetDetachedDialog.connectionLost);
    new SourcesPanelIndicator();
    new BackendSettingsSync();
    new MobileThrottling.NetworkPanelIndicator.NetworkPanelIndicator();
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host2.InspectorFrontendHostAPI.Events.ReloadInspectedPage, ({ data: hard }) => {
      SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(hard);
    });
    if (!Root.Runtime.hostConfig.devToolsPrivacyUI?.enabled || Root.Runtime.hostConfig.thirdPartyCookieControls?.managedBlockThirdPartyCookies === true) {
      return;
    }
    const browserCookieControls = Root.Runtime.hostConfig.thirdPartyCookieControls;
    const cookieControlOverrideSetting = Common2.Settings.Settings.instance().createSetting("cookie-control-override-enabled", void 0);
    const gracePeriodMitigationDisabledSetting = Common2.Settings.Settings.instance().createSetting("grace-period-mitigation-disabled", void 0);
    const heuristicMitigationDisabledSetting = Common2.Settings.Settings.instance().createSetting("heuristic-mitigation-disabled", void 0);
    if (cookieControlOverrideSetting.get() !== void 0) {
      if (browserCookieControls?.thirdPartyCookieRestrictionEnabled !== cookieControlOverrideSetting.get()) {
        Security.CookieControlsView.showInfobar();
        return;
      }
      if (cookieControlOverrideSetting.get()) {
        if (browserCookieControls?.thirdPartyCookieMetadataEnabled === gracePeriodMitigationDisabledSetting.get()) {
          Security.CookieControlsView.showInfobar();
          return;
        }
        if (browserCookieControls?.thirdPartyCookieHeuristicsEnabled === heuristicMitigationDisabledSetting.get()) {
          Security.CookieControlsView.showInfobar();
          return;
        }
      }
    }
  }
};
Common2.Runnable.registerEarlyInitializationRunnable(InspectorMainImpl.instance);
var ReloadActionDelegate2 = class {
  handleAction(_context, actionId) {
    switch (actionId) {
      case "inspector-main.reload":
        SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(false);
        return true;
      case "inspector-main.hard-reload":
        SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(true);
        return true;
    }
    return false;
  }
};
var FocusDebuggeeActionDelegate = class {
  handleAction(_context, _actionId) {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return false;
    }
    void mainTarget.pageAgent().invoke_bringToFront();
    return true;
  }
};
var isNodeProcessRunning = (targetInfos) => {
  return Boolean(targetInfos.find((target) => target.type === "node" && !target.attached));
};
var DEFAULT_VIEW = (input, output, target) => {
  const { nodeProcessRunning } = input;
  Lit.render(html`
    <style>${nodeIcon_css_default}</style>
    <div
        class="node-icon ${!nodeProcessRunning ? "inactive" : ""}"
        title=${i18nString2(UIStrings2.openDedicatedTools)}
        @click=${() => Host2.InspectorFrontendHost.InspectorFrontendHostInstance.openNodeFrontend()}>
    </div>
    `, target);
};
var NodeIndicator = class extends UI2.Widget.Widget {
  #view;
  #targetInfos = [];
  #wasShown = false;
  constructor(element, view = DEFAULT_VIEW) {
    super(element, { useShadowDom: true });
    this.#view = view;
    SDK.TargetManager.TargetManager.instance().addEventListener("AvailableTargetsChanged", (event) => {
      this.#targetInfos = event.data;
      this.requestUpdate();
    });
  }
  performUpdate() {
    if (Host2.InspectorFrontendHost.isUnderTest()) {
      return;
    }
    const nodeProcessRunning = isNodeProcessRunning(this.#targetInfos);
    if (!this.#wasShown && !nodeProcessRunning) {
      return;
    }
    this.#wasShown = true;
    const input = {
      nodeProcessRunning
    };
    this.#view(input, {}, this.contentElement);
  }
};
var nodeIndicatorProviderInstance;
var NodeIndicatorProvider = class _NodeIndicatorProvider {
  #toolbarItem;
  #widgetElement;
  constructor() {
    this.#widgetElement = document.createElement("devtools-widget");
    this.#widgetElement.widgetConfig = UI2.Widget.widgetConfig(NodeIndicator);
    this.#toolbarItem = new UI2.Toolbar.ToolbarItem(this.#widgetElement);
    this.#toolbarItem.setVisible(false);
  }
  item() {
    return this.#toolbarItem;
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!nodeIndicatorProviderInstance || forceNew) {
      nodeIndicatorProviderInstance = new _NodeIndicatorProvider();
    }
    return nodeIndicatorProviderInstance;
  }
};
var SourcesPanelIndicator = class {
  constructor() {
    Common2.Settings.Settings.instance().moduleSetting("java-script-disabled").addChangeListener(javaScriptDisabledChanged);
    javaScriptDisabledChanged();
    function javaScriptDisabledChanged() {
      const warnings = [];
      if (Common2.Settings.Settings.instance().moduleSetting("java-script-disabled").get()) {
        warnings.push(i18nString2(UIStrings2.javascriptIsDisabled));
      }
      UI2.InspectorView.InspectorView.instance().setPanelWarnings("sources", warnings);
    }
  }
};
var BackendSettingsSync = class {
  #autoAttachSetting;
  #adBlockEnabledSetting;
  #emulatePageFocusSetting;
  constructor() {
    this.#autoAttachSetting = Common2.Settings.Settings.instance().moduleSetting("auto-attach-to-created-pages");
    this.#autoAttachSetting.addChangeListener(this.#updateAutoAttach, this);
    this.#updateAutoAttach();
    this.#adBlockEnabledSetting = Common2.Settings.Settings.instance().moduleSetting("network.ad-blocking-enabled");
    this.#adBlockEnabledSetting.addChangeListener(this.#update, this);
    this.#emulatePageFocusSetting = Common2.Settings.Settings.instance().moduleSetting("emulate-page-focus");
    this.#emulatePageFocusSetting.addChangeListener(this.#update, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ChildTargetManager.ChildTargetManager, "TargetInfoChanged", this.#targetInfoChanged, this);
    SDK.TargetManager.TargetManager.instance().observeTargets(this);
  }
  #updateTarget(target) {
    if (target.type() !== SDK.Target.Type.FRAME || target.parentTarget()?.type() === SDK.Target.Type.FRAME) {
      return;
    }
    void target.pageAgent().invoke_setAdBlockingEnabled({ enabled: this.#adBlockEnabledSetting.get() });
    void target.emulationAgent().invoke_setFocusEmulationEnabled({ enabled: this.#emulatePageFocusSetting.get() });
  }
  #updateAutoAttach() {
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.setOpenNewWindowForPopups(this.#autoAttachSetting.get());
  }
  #update() {
    for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
      this.#updateTarget(target);
    }
  }
  #targetInfoChanged(event) {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const target = targetManager.targetById(event.data.targetId);
    if (!target || target.outermostTarget() !== target) {
      return;
    }
    this.#updateTarget(target);
  }
  targetAdded(target) {
    this.#updateTarget(target);
  }
  targetRemoved(_target) {
  }
};
SDK.ChildTargetManager.ChildTargetManager.install();

// gen/front_end/entrypoints/inspector_main/OutermostTargetSelector.js
var OutermostTargetSelector_exports = {};
__export(OutermostTargetSelector_exports, {
  OutermostTargetSelector: () => OutermostTargetSelector
});
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as UI3 from "./../../ui/legacy/legacy.js";

// gen/front_end/entrypoints/inspector_main/outermostTargetSelector.css.js
var outermostTargetSelector_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  padding: 2px 1px 2px 2px;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  height: 36px;
  justify-content: center;
  overflow-y: auto;
}

.title {
  overflow: hidden;
  padding-left: 8px;
  text-overflow: ellipsis;
  flex-grow: 0;
}

.subtitle {
  color: var(--sys-color-token-subtle);
  margin-right: 3px;
  overflow: hidden;
  padding-left: 8px;
  text-overflow: ellipsis;
  flex-grow: 0;
}

:host(.highlighted) .subtitle {
  color: inherit;
}

/*# sourceURL=${import.meta.resolve("./outermostTargetSelector.css")} */`;

// gen/front_end/entrypoints/inspector_main/OutermostTargetSelector.js
var UIStrings3 = {
  /**
   * @description Title of toolbar item in outermost target selector in the main toolbar
   */
  targetNotSelected: "Page: Not selected",
  /**
   * @description Title of toolbar item in outermost target selector in the main toolbar
   * @example {top} PH1
   */
  targetS: "Page: {PH1}"
};
var str_3 = i18n5.i18n.registerUIStrings("entrypoints/inspector_main/OutermostTargetSelector.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var outermostTargetSelectorInstance;
var OutermostTargetSelector = class _OutermostTargetSelector {
  listItems = new UI3.ListModel.ListModel();
  #dropDown;
  #toolbarItem;
  constructor() {
    this.#dropDown = new UI3.SoftDropDown.SoftDropDown(this.listItems, this);
    this.#dropDown.setRowHeight(36);
    this.#toolbarItem = new UI3.Toolbar.ToolbarItem(this.#dropDown.element);
    this.#toolbarItem.setTitle(i18nString3(UIStrings3.targetNotSelected));
    this.listItems.addEventListener("ItemsReplaced", () => this.#toolbarItem.setEnabled(Boolean(this.listItems.length)));
    this.#toolbarItem.element.classList.add("toolbar-has-dropdown");
    const targetManager = SDK2.TargetManager.TargetManager.instance();
    targetManager.addModelListener(SDK2.ChildTargetManager.ChildTargetManager, "TargetInfoChanged", this.#onTargetInfoChanged, this);
    targetManager.addEventListener("NameChanged", this.#onInspectedURLChanged, this);
    targetManager.observeTargets(this);
    UI3.Context.Context.instance().addFlavorChangeListener(SDK2.Target.Target, this.#targetChanged, this);
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!outermostTargetSelectorInstance || forceNew) {
      outermostTargetSelectorInstance = new _OutermostTargetSelector();
    }
    return outermostTargetSelectorInstance;
  }
  item() {
    return this.#toolbarItem;
  }
  highlightedItemChanged(_from, _to, fromElement, toElement) {
    if (fromElement) {
      fromElement.classList.remove("highlighted");
    }
    if (toElement) {
      toElement.classList.add("highlighted");
    }
  }
  titleFor(target) {
    return target.name();
  }
  targetAdded(target) {
    if (target.outermostTarget() !== target) {
      return;
    }
    this.listItems.insertWithComparator(target, this.#targetComparator());
    this.#toolbarItem.setVisible(this.listItems.length > 1);
    const primaryTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    if (target === primaryTarget || target === UI3.Context.Context.instance().flavor(SDK2.Target.Target)) {
      this.#dropDown.selectItem(target);
    }
  }
  targetRemoved(target) {
    const index = this.listItems.indexOf(target);
    if (index === -1) {
      return;
    }
    this.listItems.remove(index);
    this.#toolbarItem.setVisible(this.listItems.length > 1);
  }
  #targetComparator() {
    return (a, b) => {
      const aTargetInfo = a.targetInfo();
      const bTargetInfo = b.targetInfo();
      if (!aTargetInfo || !bTargetInfo) {
        return 0;
      }
      if (!aTargetInfo.subtype?.length && bTargetInfo.subtype?.length) {
        return -1;
      }
      if (aTargetInfo.subtype?.length && !bTargetInfo.subtype?.length) {
        return 1;
      }
      return aTargetInfo.url.localeCompare(bTargetInfo.url);
    };
  }
  #onTargetInfoChanged(event) {
    const targetManager = SDK2.TargetManager.TargetManager.instance();
    const target = targetManager.targetById(event.data.targetId);
    if (!target || target.outermostTarget() !== target) {
      return;
    }
    this.targetRemoved(target);
    this.targetAdded(target);
  }
  #onInspectedURLChanged(event) {
    const target = event.data;
    if (!target || target.outermostTarget() !== target) {
      return;
    }
    this.targetRemoved(target);
    this.targetAdded(target);
  }
  #targetChanged({ data: target }) {
    this.#dropDown.selectItem(target?.outermostTarget() || null);
  }
  createElementForItem(item) {
    const element = document.createElement("div");
    element.classList.add("target");
    const shadowRoot = UI3.UIUtils.createShadowRootWithCoreStyles(element, { cssFile: outermostTargetSelector_css_default });
    const title = shadowRoot.createChild("div", "title");
    UI3.UIUtils.createTextChild(title, Platform.StringUtilities.trimEndWithMaxLength(this.titleFor(item), 100));
    const subTitle = shadowRoot.createChild("div", "subtitle");
    UI3.UIUtils.createTextChild(subTitle, this.#subtitleFor(item));
    return element;
  }
  #subtitleFor(target) {
    const targetInfo = target.targetInfo();
    if (target === SDK2.TargetManager.TargetManager.instance().primaryPageTarget() && targetInfo) {
      return Bindings.ResourceUtils.displayNameForURL(targetInfo.url);
    }
    return target.targetInfo()?.subtype || "";
  }
  isItemSelectable(_item) {
    return true;
  }
  itemSelected(item) {
    const title = item ? i18nString3(UIStrings3.targetS, { PH1: this.titleFor(item) }) : i18nString3(UIStrings3.targetNotSelected);
    this.#toolbarItem.setTitle(title);
    if (item && item !== UI3.Context.Context.instance().flavor(SDK2.Target.Target)?.outermostTarget()) {
      UI3.Context.Context.instance().setFlavor(SDK2.Target.Target, item);
    }
  }
};
export {
  InspectorMain_exports as InspectorMain,
  OutermostTargetSelector_exports as OutermostTargetSelector,
  RenderingOptions_exports as RenderingOptions
};
//# sourceMappingURL=inspector_main.js.map
