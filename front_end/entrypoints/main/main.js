var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/entrypoints/main/ExecutionContextSelector.js
var ExecutionContextSelector_exports = {};
__export(ExecutionContextSelector_exports, {
  ExecutionContextSelector: () => ExecutionContextSelector
});
import * as SDK from "./../../core/sdk/sdk.js";
var ExecutionContextSelector = class {
  #targetManager;
  #context;
  #lastSelectedContextId;
  #ignoreContextChanged;
  constructor(targetManager, context) {
    context.addFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.#executionContextChanged, this);
    context.addFlavorChangeListener(SDK.Target.Target, this.#targetChanged, this);
    targetManager.addModelListener(SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextCreated, this.#onExecutionContextCreated, this);
    targetManager.addModelListener(SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextDestroyed, this.#onExecutionContextDestroyed, this);
    targetManager.addModelListener(SDK.RuntimeModel.RuntimeModel, SDK.RuntimeModel.Events.ExecutionContextOrderChanged, this.#onExecutionContextOrderChanged, this);
    this.#targetManager = targetManager;
    this.#context = context;
    targetManager.observeModels(SDK.RuntimeModel.RuntimeModel, this);
  }
  modelAdded(runtimeModel) {
    queueMicrotask(deferred.bind(this));
    function deferred() {
      if (!this.#context.flavor(SDK.Target.Target)) {
        this.#context.setFlavor(SDK.Target.Target, runtimeModel.target());
      }
    }
  }
  modelRemoved(runtimeModel) {
    const currentExecutionContext = this.#context.flavor(SDK.RuntimeModel.ExecutionContext);
    if (currentExecutionContext?.runtimeModel === runtimeModel) {
      this.#currentExecutionContextGone();
    }
    const models = this.#targetManager.models(SDK.RuntimeModel.RuntimeModel);
    if (this.#context.flavor(SDK.Target.Target) === runtimeModel.target() && models.length) {
      this.#context.setFlavor(SDK.Target.Target, models[0].target());
    }
  }
  #executionContextChanged({ data: newContext }) {
    if (newContext) {
      this.#context.setFlavor(SDK.Target.Target, newContext.target());
      if (!this.#ignoreContextChanged) {
        this.#lastSelectedContextId = this.#contextPersistentId(newContext);
      }
    }
  }
  #contextPersistentId(executionContext) {
    return executionContext.isDefault ? executionContext.target().name() + ":" + executionContext.frameId : "";
  }
  #targetChanged({ data: newTarget }) {
    const currentContext = this.#context.flavor(SDK.RuntimeModel.ExecutionContext);
    if (!newTarget || currentContext && currentContext.target() === newTarget) {
      return;
    }
    const runtimeModel = newTarget.model(SDK.RuntimeModel.RuntimeModel);
    const executionContexts = runtimeModel ? runtimeModel.executionContexts() : [];
    if (!executionContexts.length) {
      return;
    }
    let newContext = null;
    for (let i = 0; i < executionContexts.length && !newContext; ++i) {
      if (this.#shouldSwitchToContext(executionContexts[i])) {
        newContext = executionContexts[i];
      }
    }
    for (let i = 0; i < executionContexts.length && !newContext; ++i) {
      if (this.#isDefaultContext(executionContexts[i])) {
        newContext = executionContexts[i];
      }
    }
    this.#ignoreContextChanged = true;
    this.#context.setFlavor(SDK.RuntimeModel.ExecutionContext, newContext || executionContexts[0]);
    this.#ignoreContextChanged = false;
  }
  #shouldSwitchToContext(executionContext) {
    if (executionContext.target().targetInfo()?.subtype) {
      return false;
    }
    if (this.#lastSelectedContextId && this.#lastSelectedContextId === this.#contextPersistentId(executionContext)) {
      return true;
    }
    return !this.#lastSelectedContextId && this.#isDefaultContext(executionContext);
  }
  #isDefaultContext(executionContext) {
    if (!executionContext.isDefault || !executionContext.frameId) {
      return false;
    }
    if (executionContext.target().parentTarget()?.type() === SDK.Target.Type.FRAME) {
      return false;
    }
    const resourceTreeModel = executionContext.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    const frame = resourceTreeModel?.frameForId(executionContext.frameId);
    return Boolean(frame?.isOutermostFrame());
  }
  #onExecutionContextCreated(event) {
    if (this.#lastSelectedContextId === void 0) {
      this.#switchContextIfNecessary(event.data);
      return;
    }
    switch (event.data.target().type()) {
      case SDK.Target.Type.AUCTION_WORKLET:
      case SDK.Target.Type.SHARED_STORAGE_WORKLET:
      case SDK.Target.Type.SHARED_WORKER:
      case SDK.Target.Type.ServiceWorker:
      case SDK.Target.Type.WORKLET:
      case SDK.Target.Type.Worker:
        return;
      case SDK.Target.Type.BROWSER:
      case SDK.Target.Type.FRAME:
      case SDK.Target.Type.NODE:
      case SDK.Target.Type.TAB:
        this.#switchContextIfNecessary(event.data);
        break;
    }
  }
  #onExecutionContextDestroyed(event) {
    const executionContext = event.data;
    if (this.#context.flavor(SDK.RuntimeModel.ExecutionContext) === executionContext) {
      this.#currentExecutionContextGone();
    }
  }
  #onExecutionContextOrderChanged(event) {
    const runtimeModel = event.data;
    const executionContexts = runtimeModel.executionContexts();
    for (let i = 0; i < executionContexts.length; i++) {
      if (this.#switchContextIfNecessary(executionContexts[i])) {
        break;
      }
    }
  }
  #switchContextIfNecessary(executionContext) {
    if (!this.#context.flavor(SDK.RuntimeModel.ExecutionContext) || this.#shouldSwitchToContext(executionContext)) {
      this.#ignoreContextChanged = true;
      this.#context.setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);
      this.#ignoreContextChanged = false;
      return true;
    }
    return false;
  }
  #currentExecutionContextGone() {
    const runtimeModels = this.#targetManager.models(SDK.RuntimeModel.RuntimeModel);
    let newContext = null;
    for (let i = 0; i < runtimeModels.length && !newContext; ++i) {
      const executionContexts = runtimeModels[i].executionContexts();
      for (const executionContext of executionContexts) {
        if (this.#isDefaultContext(executionContext)) {
          newContext = executionContext;
          break;
        }
      }
    }
    if (!newContext) {
      for (let i = 0; i < runtimeModels.length && !newContext; ++i) {
        const executionContexts = runtimeModels[i].executionContexts();
        if (executionContexts.length) {
          newContext = executionContexts[0];
          break;
        }
      }
    }
    this.#ignoreContextChanged = true;
    this.#context.setFlavor(SDK.RuntimeModel.ExecutionContext, newContext);
    this.#ignoreContextChanged = false;
  }
};

// gen/front_end/entrypoints/main/GlobalAiButton.js
var GlobalAiButton_exports = {};
__export(GlobalAiButton_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  GlobalAiButton: () => GlobalAiButton,
  GlobalAiButtonState: () => GlobalAiButtonState,
  GlobalAiButtonToolbarProvider: () => GlobalAiButtonToolbarProvider
});
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as Lit from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/entrypoints/main/globalAiButton.css.js
var globalAiButton_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  .global-ai-button-container {
    margin-left: var(--sys-size-3);
    margin-right: var(--sys-size-2);
  }

  .global-ai-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: var(--sys-size-9);
    height: var(--sys-size-9);
    border-radius: var(--sys-shape-corner-full);
    background-image: var(--app-gradient-google-ai);
    font: var(--sys-typescale-body4-medium);
    color: var(--ref-palette-neutral100);
    transition: width 1s, padding 1s;
    margin-left: auto;
    overflow: hidden;
    position: relative;
    border: 0;

    &:focus-visible {
      outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
    }

    &:hover::after,
    &:active::after {
      content: "";
      height: 100%;
      width: 100%;
      border-radius: inherit;
      position: absolute;
      top: 0;
      left: 0;
    }

    &:hover::after {
      background-color: var(--sys-color-state-hover-on-prominent);
    }

    &:active::after {
      background-color: var(--sys-color-state-ripple-primary);
    }

    devtools-icon {
      width: var(--sys-size-7);
      height: var(--sys-size-7);
      color: var(--ref-palette-neutral100);
    }

    .button-text {
      opacity: 0%;
      transition: opacity 1s;
    }
  }

  .global-ai-button.expanded {
    width: auto;
    padding: 0 var(--sys-size-6) 0 var(--sys-size-5);

    .button-text {
      opacity: 100%;
    }
  }
}

/*# sourceURL=${import.meta.resolve("././globalAiButton.css")} */`;

// gen/front_end/entrypoints/main/GlobalAiButton.js
var { render, html, Directives: { classMap } } = Lit;
var UIStrings = {
  /**
   * @description Button's string in promotion state.
   */
  aiAssistance: "AI assistance"
};
var str_ = i18n.i18n.registerUIStrings("entrypoints/main/GlobalAiButton.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var DELAY_BEFORE_PROMOTION_COLLAPSE_IN_MS = 5e3;
var PROMOTION_END_DATE = /* @__PURE__ */ new Date("2026-09-30");
function getClickCountSetting() {
  return Common.Settings.Settings.instance().createSetting(
    "global-ai-button-click-count",
    0,
    "Synced"
    /* Common.Settings.SettingStorageType.SYNCED */
  );
}
function incrementClickCountSetting() {
  const setting = getClickCountSetting();
  setting.set(setting.get() + 1);
}
var GlobalAiButtonState;
(function(GlobalAiButtonState2) {
  GlobalAiButtonState2["PROMOTION"] = "promotion";
  GlobalAiButtonState2["DEFAULT"] = "default";
})(GlobalAiButtonState || (GlobalAiButtonState = {}));
var DEFAULT_VIEW = (input, output, target) => {
  const inPromotionState = input.state === GlobalAiButtonState.PROMOTION;
  const classes = classMap({
    "global-ai-button": true,
    expanded: inPromotionState
  });
  render(html`
    <style>${globalAiButton_css_default}</style>
    <div class="global-ai-button-container">
      <button class=${classes} @click=${input.onClick} jslog=${VisualLogging.action().track({ click: true }).context("global-ai-button")}>
        <devtools-icon name="smart-assistant"></devtools-icon>
        <span class="button-text">${` ${i18nString(UIStrings.aiAssistance)}`}</span>
      </button>
    </div>
  `, target);
};
var GlobalAiButton = class extends UI.Widget.Widget {
  #view;
  #buttonState = GlobalAiButtonState.DEFAULT;
  #mouseOnMainToolbar = false;
  #returnToDefaultStateTimeout;
  constructor(element, view) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW;
    this.requestUpdate();
    if (this.#shouldTriggerPromotion()) {
      this.#triggerPromotion();
    }
  }
  willHide() {
    super.willHide();
    this.#removeHoverEventListeners();
    if (this.#returnToDefaultStateTimeout) {
      window.clearTimeout(this.#returnToDefaultStateTimeout);
    }
  }
  #handleMainToolbarMouseEnter = () => {
    this.#mouseOnMainToolbar = true;
  };
  #handleMainToolbarMouseLeave = () => {
    this.#mouseOnMainToolbar = false;
  };
  #addHoverEventListeners() {
    UI.InspectorView.InspectorView.instance().tabbedPane.headerElement().addEventListener("mouseenter", this.#handleMainToolbarMouseEnter);
    UI.InspectorView.InspectorView.instance().tabbedPane.headerElement().addEventListener("mouseleave", this.#handleMainToolbarMouseLeave);
  }
  #removeHoverEventListeners() {
    UI.InspectorView.InspectorView.instance().tabbedPane.headerElement().removeEventListener("mouseenter", this.#handleMainToolbarMouseEnter);
    UI.InspectorView.InspectorView.instance().tabbedPane.headerElement().removeEventListener("mouseleave", this.#handleMainToolbarMouseLeave);
  }
  // We only want to enable promotion when:
  // * The flag is enabled,
  // * The current date is before the promotion end date,
  // * The click count on this button is less than 2.
  #shouldTriggerPromotion() {
    const isFlagEnabled = Boolean(Root.Runtime.hostConfig.devToolsGlobalAiButton?.promotionEnabled);
    const isBeforeEndDate = /* @__PURE__ */ new Date() < PROMOTION_END_DATE;
    return isFlagEnabled && isBeforeEndDate && getClickCountSetting().get() < 2;
  }
  #triggerPromotion() {
    this.#buttonState = GlobalAiButtonState.PROMOTION;
    this.requestUpdate();
    this.#addHoverEventListeners();
    this.#scheduleReturnToDefaultState();
  }
  #scheduleReturnToDefaultState() {
    if (this.#returnToDefaultStateTimeout) {
      window.clearTimeout(this.#returnToDefaultStateTimeout);
    }
    this.#returnToDefaultStateTimeout = window.setTimeout(() => {
      if (this.#mouseOnMainToolbar) {
        this.#scheduleReturnToDefaultState();
        return;
      }
      this.#buttonState = GlobalAiButtonState.DEFAULT;
      this.requestUpdate();
      this.#removeHoverEventListeners();
    }, DELAY_BEFORE_PROMOTION_COLLAPSE_IN_MS);
  }
  #onClick() {
    UI.ViewManager.ViewManager.instance().showViewInLocation("freestyler", "drawer-view");
    incrementClickCountSetting();
    const hasExplicitUserPreference = UI.InspectorView.InspectorView.instance().isUserExplicitlyUpdatedDrawerOrientation();
    const isVerticalDrawerFeatureEnabled = Boolean(Root.Runtime.hostConfig.devToolsFlexibleLayout?.verticalDrawerEnabled);
    if (isVerticalDrawerFeatureEnabled && !hasExplicitUserPreference) {
      UI.InspectorView.InspectorView.instance().showDrawer({
        focus: true,
        hasTargetDrawer: false
      });
      UI.InspectorView.InspectorView.instance().toggleDrawerOrientation({ force: UI.InspectorView.DrawerOrientation.VERTICAL });
    }
  }
  performUpdate() {
    this.#view({
      state: this.#buttonState,
      onClick: this.#onClick.bind(this)
    }, void 0, this.contentElement);
  }
};
var globalAiButtonToolbarProviderInstance;
var GlobalAiButtonToolbarProvider = class _GlobalAiButtonToolbarProvider {
  #toolbarItem;
  #widgetElement;
  constructor() {
    this.#widgetElement = document.createElement("devtools-widget");
    this.#widgetElement.widgetConfig = UI.Widget.widgetConfig(GlobalAiButton);
    this.#toolbarItem = new UI.Toolbar.ToolbarItemWithCompactLayout(this.#widgetElement);
    this.#toolbarItem.setVisible(false);
  }
  item() {
    return this.#toolbarItem;
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!globalAiButtonToolbarProviderInstance || forceNew) {
      globalAiButtonToolbarProviderInstance = new _GlobalAiButtonToolbarProvider();
    }
    return globalAiButtonToolbarProviderInstance;
  }
};

// gen/front_end/entrypoints/main/MainImpl.js
var MainImpl_exports = {};
__export(MainImpl_exports, {
  MainImpl: () => MainImpl,
  MainMenuItem: () => MainMenuItem,
  PauseListener: () => PauseListener,
  ReloadActionDelegate: () => ReloadActionDelegate,
  SearchActionDelegate: () => SearchActionDelegate,
  SettingsButtonProvider: () => SettingsButtonProvider,
  ZoomActionDelegate: () => ZoomActionDelegate,
  handleExternalRequest: () => handleExternalRequest,
  handleExternalRequestGenerator: () => handleExternalRequestGenerator,
  sendOverProtocol: () => sendOverProtocol
});
import * as Common2 from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Platform2 from "./../../core/platform/platform.js";
import * as ProtocolClient from "./../../core/protocol_client/protocol_client.js";
import * as Root2 from "./../../core/root/root.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Foundation from "./../../foundation/foundation.js";
import * as AiAssistanceModel from "./../../models/ai_assistance/ai_assistance.js";
import * as AutofillManager from "./../../models/autofill_manager/autofill_manager.js";
import * as Badges from "./../../models/badges/badges.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as Breakpoints from "./../../models/breakpoints/breakpoints.js";
import * as CrUXManager from "./../../models/crux-manager/crux-manager.js";
import * as IssuesManager from "./../../models/issues_manager/issues_manager.js";
import * as LiveMetrics from "./../../models/live-metrics/live-metrics.js";
import * as Logs from "./../../models/logs/logs.js";
import * as Persistence from "./../../models/persistence/persistence.js";
import * as ProjectSettings from "./../../models/project_settings/project_settings.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as PanelCommon from "./../../panels/common/common.js";
import * as Snippets from "./../../panels/snippets/snippets.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as Snackbar from "./../../ui/components/snackbars/snackbars.js";
import * as Components from "./../../ui/legacy/components/utils/utils.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import * as ThemeSupport from "./../../ui/legacy/theme_support/theme_support.js";
import { html as html2, render as render2 } from "./../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";
var _a;
var UIStrings2 = {
  /**
   * @description Title of item in main
   */
  customizeAndControlDevtools: "Customize and control DevTools",
  /**
   * @description Title element text content in Main
   */
  dockSide: "Dock side",
  /**
   * @description Title element title in Main
   * @example {Ctrl+Shift+D} PH1
   */
  placementOfDevtoolsRelativeToThe: "Placement of DevTools relative to the page. ({PH1} to restore last position)",
  /**
   * @description Text to undock the DevTools
   */
  undockIntoSeparateWindow: "Undock into separate window",
  /**
   * @description Text to dock the DevTools to the bottom of the browser tab
   */
  dockToBottom: "Dock to bottom",
  /**
   * @description Text to dock the DevTools to the right of the browser tab
   */
  dockToRight: "Dock to right",
  /**
   * @description Text to dock the DevTools to the left of the browser tab
   */
  dockToLeft: "Dock to left",
  /**
   * @description Text in Main
   */
  focusDebuggee: "Focus page",
  /**
   * @description Text in Main
   */
  hideConsoleDrawer: "Hide console drawer",
  /**
   * @description Text in Main
   */
  showConsoleDrawer: "Show console drawer",
  /**
   * @description A context menu item in the Main
   */
  moreTools: "More tools",
  /**
   * @description Text for the viewing the help options
   */
  help: "Help",
  /**
   * @description Text describing how to navigate the dock side menu
   */
  dockSideNavigation: "Use left and right arrow keys to navigate the options",
  /**
   * @description Notification shown to the user whenever DevTools receives an external request.
   */
  externalRequestReceived: "`DevTools` received an external request",
  /**
   * @description Notification shown to the user whenever DevTools has finished downloading a local AI model.
   */
  aiModelDownloaded: "AI model downloaded"
};
var str_2 = i18n3.i18n.registerUIStrings("entrypoints/main/MainImpl.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var loadedPanelCommonModule;
var WINDOW_LOCAL_STORAGE = {
  register(_setting) {
  },
  async get(setting) {
    return window.localStorage.getItem(setting);
  },
  set(setting, value) {
    window.localStorage.setItem(setting, value);
  },
  remove(setting) {
    window.localStorage.removeItem(setting);
  },
  clear: () => window.localStorage.clear()
};
var MainImpl = class {
  #readyForTestPromise = Promise.withResolvers();
  #veStartPromise;
  #universe;
  constructor() {
    _a.instanceForTest = this;
    void this.#loaded();
  }
  static time(label) {
    if (Host.InspectorFrontendHost.isUnderTest()) {
      return;
    }
    console.time(label);
  }
  static timeEnd(label) {
    if (Host.InspectorFrontendHost.isUnderTest()) {
      return;
    }
    console.timeEnd(label);
  }
  async #loaded() {
    console.timeStamp("Main._loaded");
    Root2.Runtime.Runtime.setPlatform(Host.Platform.platform());
    const [config, prefs] = await Promise.all([
      new Promise((resolve) => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.getHostConfig(resolve);
      }),
      new Promise((resolve) => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getPreferences(resolve))
    ]);
    console.timeStamp("Main._gotPreferences");
    this.#initializeGlobalsForLayoutTests();
    Object.assign(Root2.Runtime.hostConfig, config);
    const creationOptions = {
      settingsCreationOptions: {
        ...this.createSettingsStorage(prefs),
        settingRegistrations: Common2.SettingRegistration.getRegisteredSettings(),
        logSettingAccess: VisualLogging2.logSettingAccess,
        runSettingsMigration: !Host.InspectorFrontendHost.isUnderTest()
      }
    };
    this.#universe = new Foundation.Universe.Universe(creationOptions);
    Root2.DevToolsContext.setGlobalInstance(this.#universe.context);
    await this.requestAndRegisterLocaleData();
    Host.userMetrics.syncSetting(Common2.Settings.Settings.instance().moduleSetting("sync-preferences").get());
    const veLogging = config.devToolsVeLogging;
    const veLogsTestMode = Common2.Settings.Settings.instance().createSetting("veLogsTestMode", false).get();
    if (veLogging?.enabled) {
      if (veLogging?.testing || veLogsTestMode) {
        VisualLogging2.setVeDebugLoggingEnabled(
          true,
          "Test"
          /* VisualLogging.DebugLoggingFormat.TEST */
        );
        const options = {
          processingThrottler: new Common2.Throttler.Throttler(0),
          keyboardLogThrottler: new Common2.Throttler.Throttler(10),
          hoverLogThrottler: new Common2.Throttler.Throttler(50),
          dragLogThrottler: new Common2.Throttler.Throttler(50),
          clickLogThrottler: new Common2.Throttler.Throttler(10),
          resizeLogThrottler: new Common2.Throttler.Throttler(10)
        };
        this.#veStartPromise = VisualLogging2.startLogging(options);
      } else {
        this.#veStartPromise = VisualLogging2.startLogging();
      }
    }
    void this.#createAppUI();
  }
  #initializeGlobalsForLayoutTests() {
    self.Extensions ||= {};
    self.Host ||= {};
    self.Host.userMetrics ||= Host.userMetrics;
    self.Host.UserMetrics ||= Host.UserMetrics;
    self.ProtocolClient ||= {};
    self.ProtocolClient.test ||= ProtocolClient.InspectorBackend.test;
  }
  async requestAndRegisterLocaleData() {
    const settingLanguage = Common2.Settings.Settings.instance().moduleSetting("language").get();
    const devToolsLocale = i18n3.DevToolsLocale.DevToolsLocale.instance({
      create: true,
      data: {
        navigatorLanguage: navigator.language,
        settingLanguage,
        lookupClosestDevToolsLocale: i18n3.i18n.lookupClosestSupportedDevToolsLocale
      }
    });
    Host.userMetrics.language(devToolsLocale.locale);
    if (devToolsLocale.locale !== "en-US") {
      await i18n3.i18n.fetchAndRegisterLocaleData("en-US");
    }
    try {
      await i18n3.i18n.fetchAndRegisterLocaleData(devToolsLocale.locale);
    } catch (error) {
      console.warn(`Unable to fetch & register locale data for '${devToolsLocale.locale}', falling back to 'en-US'. Cause: `, error);
      devToolsLocale.forceFallbackLocale();
    }
  }
  createSettingsStorage(prefs) {
    this.#initializeExperiments();
    let storagePrefix = "";
    if (Host.Platform.isCustomDevtoolsFrontend()) {
      storagePrefix = "__custom__";
    } else if (!Root2.Runtime.Runtime.queryParam("can_dock") && Boolean(Root2.Runtime.Runtime.queryParam("debugFrontend")) && !Host.InspectorFrontendHost.isUnderTest()) {
      storagePrefix = "__bundled__";
    }
    let localStorage;
    if (!Host.InspectorFrontendHost.isUnderTest() && window.localStorage) {
      localStorage = new Common2.Settings.SettingsStorage(window.localStorage, WINDOW_LOCAL_STORAGE, storagePrefix);
    } else {
      localStorage = new Common2.Settings.SettingsStorage({}, void 0, storagePrefix);
    }
    const hostUnsyncedStorage = {
      register: (name) => Host.InspectorFrontendHost.InspectorFrontendHostInstance.registerPreference(name, { synced: false }),
      set: Host.InspectorFrontendHost.InspectorFrontendHostInstance.setPreference,
      get: (name) => {
        return new Promise((resolve) => {
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.getPreference(name, resolve);
        });
      },
      remove: Host.InspectorFrontendHost.InspectorFrontendHostInstance.removePreference,
      clear: Host.InspectorFrontendHost.InspectorFrontendHostInstance.clearPreferences
    };
    const hostSyncedStorage = {
      ...hostUnsyncedStorage,
      register: (name) => Host.InspectorFrontendHost.InspectorFrontendHostInstance.registerPreference(name, { synced: true })
    };
    const syncedStorage = new Common2.Settings.SettingsStorage(prefs, hostSyncedStorage, storagePrefix);
    const globalStorage = new Common2.Settings.SettingsStorage(prefs, hostUnsyncedStorage, storagePrefix);
    return { syncedStorage, globalStorage, localStorage };
  }
  #initializeExperiments() {
    Root2.Runtime.experiments.register("capture-node-creation-stacks", "Capture node creation stacks");
    Root2.Runtime.experiments.register("live-heap-profile", "Live heap profile", true);
    Root2.Runtime.experiments.register("protocol-monitor", "Protocol Monitor", void 0, "https://developer.chrome.com/blog/new-in-devtools-92/#protocol-monitor");
    Root2.Runtime.experiments.register("sampling-heap-profiler-timeline", "Sampling heap profiler timeline", true);
    Root2.Runtime.experiments.register("show-option-tp-expose-internals-in-heap-snapshot", "Show option to expose internals in heap snapshots");
    Root2.Runtime.experiments.register("timeline-invalidation-tracking", "Performance panel: invalidation tracking", true);
    Root2.Runtime.experiments.register("timeline-show-all-events", "Performance panel: show all events", true);
    Root2.Runtime.experiments.register("timeline-v8-runtime-call-stats", "Performance panel: V8 runtime call stats", true);
    Root2.Runtime.experiments.register("timeline-debug-mode", "Performance panel: Enable debug mode (trace event details, etc)", true);
    Root2.Runtime.experiments.register("instrumentation-breakpoints", "Enable instrumentation breakpoints", true);
    Root2.Runtime.experiments.register("use-source-map-scopes", "Use scope information from source maps", true);
    Root2.Runtime.experiments.register("apca", "Enable new Advanced Perceptual Contrast Algorithm (APCA) replacing previous contrast ratio and AA/AAA guidelines", void 0, "https://developer.chrome.com/blog/new-in-devtools-89/#apca");
    Root2.Runtime.experiments.register("full-accessibility-tree", "Enable full accessibility tree view in the Elements panel", void 0, "https://developer.chrome.com/blog/new-in-devtools-90/#accessibility-tree", "https://g.co/devtools/a11y-tree-feedback");
    Root2.Runtime.experiments.register("font-editor", "Enable new font editor within the Styles tab", void 0, "https://developer.chrome.com/blog/new-in-devtools-89/#font");
    Root2.Runtime.experiments.register("contrast-issues", "Enable automatic contrast issue reporting via the Issues panel", void 0, "https://developer.chrome.com/blog/new-in-devtools-90/#low-contrast");
    Root2.Runtime.experiments.register("experimental-cookie-features", "Enable experimental cookie features");
    Root2.Runtime.experiments.register("authored-deployed-grouping", "Group sources into authored and deployed trees", void 0, "https://goo.gle/authored-deployed", "https://goo.gle/authored-deployed-feedback");
    Root2.Runtime.experiments.register("just-my-code", "Hide ignore-listed code in Sources tree view");
    Root2.Runtime.experiments.register("timeline-show-postmessage-events", "Performance panel: show postMessage dispatch and handling flows");
    Root2.Runtime.experiments.enableExperimentsByDefault([
      "full-accessibility-tree",
      ...Root2.Runtime.Runtime.queryParam("isChromeForTesting") ? ["protocol-monitor"] : []
    ]);
    Root2.Runtime.experiments.cleanUpStaleExperiments();
    const enabledExperiments = Root2.Runtime.Runtime.queryParam("enabledExperiments");
    if (enabledExperiments) {
      Root2.Runtime.experiments.setServerEnabledExperiments(enabledExperiments.split(";"));
    }
    Root2.Runtime.experiments.enableExperimentsTransiently([]);
    if (Host.InspectorFrontendHost.isUnderTest()) {
      const testParam = Root2.Runtime.Runtime.queryParam("test");
      if (testParam?.includes("live-line-level-heap-profile.js")) {
        Root2.Runtime.experiments.enableForTest("live-heap-profile");
      }
    }
    for (const experiment of Root2.Runtime.experiments.allConfigurableExperiments()) {
      if (experiment.isEnabled()) {
        Host.userMetrics.experimentEnabledAtLaunch(experiment.name);
      } else {
        Host.userMetrics.experimentDisabledAtLaunch(experiment.name);
      }
    }
  }
  async #createAppUI() {
    _a.time("Main._createAppUI");
    const isolatedFileSystemManager = Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance();
    isolatedFileSystemManager.addEventListener(Persistence.IsolatedFileSystemManager.Events.FileSystemError, (event) => Snackbar.Snackbar.Snackbar.show({ message: event.data }));
    const defaultThemeSetting = "systemPreferred";
    const themeSetting = Common2.Settings.Settings.instance().createSetting("ui-theme", defaultThemeSetting);
    UI2.UIUtils.initializeUIUtils(document);
    if (!ThemeSupport.ThemeSupport.hasInstance()) {
      ThemeSupport.ThemeSupport.instance({ forceNew: true, setting: themeSetting });
    }
    UI2.UIUtils.addPlatformClass(document.documentElement);
    UI2.UIUtils.installComponentRootStyles(document.body);
    this.#addMainEventListeners(document);
    const canDock = Boolean(Root2.Runtime.Runtime.queryParam("can_dock"));
    UI2.ZoomManager.ZoomManager.instance({ forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance });
    UI2.ContextMenu.ContextMenu.initialize();
    UI2.ContextMenu.ContextMenu.installHandler(document);
    UI2.ViewManager.ViewManager.instance({ forceNew: true, universe: this.#universe });
    Logs.NetworkLog.NetworkLog.instance();
    SDK2.FrameManager.FrameManager.instance();
    Logs.LogManager.LogManager.instance();
    IssuesManager.IssuesManager.IssuesManager.instance({
      forceNew: true,
      ensureFirst: true,
      showThirdPartyIssuesSetting: IssuesManager.Issue.getShowThirdPartyIssuesSetting(),
      hideIssueSetting: IssuesManager.IssuesManager.getHideIssueByCodeSetting()
    });
    IssuesManager.ContrastCheckTrigger.ContrastCheckTrigger.instance();
    UI2.DockController.DockController.instance({ forceNew: true, canDock });
    SDK2.DOMDebuggerModel.DOMDebuggerManager.instance({ forceNew: true });
    const targetManager = SDK2.TargetManager.TargetManager.instance();
    targetManager.addEventListener("SuspendStateChanged", this.#onSuspendStateChanged.bind(this));
    Workspace.FileManager.FileManager.instance({ forceNew: true });
    Bindings.NetworkProject.NetworkProjectManager.instance();
    new Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager();
    targetManager.setScopeTarget(targetManager.primaryPageTarget());
    UI2.Context.Context.instance().addFlavorChangeListener(SDK2.Target.Target, ({ data }) => {
      const outermostTarget = data?.outermostTarget();
      targetManager.setScopeTarget(outermostTarget);
    });
    Breakpoints.BreakpointManager.BreakpointManager.instance({
      forceNew: true,
      workspace: Workspace.Workspace.WorkspaceImpl.instance(),
      targetManager,
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
    });
    self.Extensions.extensionServer = PanelCommon.ExtensionServer.ExtensionServer.instance({ forceNew: true });
    new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(isolatedFileSystemManager, Workspace.Workspace.WorkspaceImpl.instance());
    isolatedFileSystemManager.addPlatformFileSystem("snippet://", new Snippets.ScriptSnippetFileSystem.SnippetFileSystem());
    const persistenceImpl = Persistence.Persistence.PersistenceImpl.instance({
      forceNew: true,
      workspace: Workspace.Workspace.WorkspaceImpl.instance(),
      breakpointManager: Breakpoints.BreakpointManager.BreakpointManager.instance()
    });
    const linkDecorator = new PanelCommon.PersistenceUtils.LinkDecorator(persistenceImpl);
    Components.Linkifier.Linkifier.setLinkDecorator(linkDecorator);
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({ forceNew: true, workspace: Workspace.Workspace.WorkspaceImpl.instance() });
    new ExecutionContextSelector(targetManager, UI2.Context.Context.instance());
    const projectSettingsModel = ProjectSettings.ProjectSettingsModel.ProjectSettingsModel.instance({
      forceNew: true,
      hostConfig: Root2.Runtime.hostConfig,
      pageResourceLoader: SDK2.PageResourceLoader.PageResourceLoader.instance(),
      targetManager
    });
    const automaticFileSystemManager = Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance({
      forceNew: true,
      inspectorFrontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
      projectSettingsModel
    });
    Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding.instance({
      forceNew: true,
      automaticFileSystemManager,
      isolatedFileSystemManager,
      workspace: Workspace.Workspace.WorkspaceImpl.instance()
    });
    AutofillManager.AutofillManager.AutofillManager.instance();
    LiveMetrics.LiveMetrics.instance();
    CrUXManager.CrUXManager.instance();
    const builtInAi = AiAssistanceModel.BuiltInAi.BuiltInAi.instance();
    builtInAi.addEventListener("downloadedAndSessionCreated", () => Snackbar.Snackbar.Snackbar.show({ message: i18nString2(UIStrings2.aiModelDownloaded) }));
    new PauseListener();
    const actionRegistryInstance = UI2.ActionRegistry.ActionRegistry.instance({ forceNew: true });
    UI2.ShortcutRegistry.ShortcutRegistry.instance({ forceNew: true, actionRegistry: actionRegistryInstance });
    this.#registerMessageSinkListener();
    if (Host.GdpClient.isGdpProfilesAvailable()) {
      void Host.GdpClient.GdpClient.instance().getProfile().then((getProfileResponse) => {
        if (!getProfileResponse) {
          return;
        }
        const { profile, isEligible } = getProfileResponse;
        const hasProfile = Boolean(profile);
        const contextString = hasProfile ? "has-profile" : isEligible ? "no-profile-and-eligible" : "no-profile-and-not-eligible";
        void VisualLogging2.logFunctionCall("gdp-client-initialize", contextString);
      });
      void Badges.UserBadges.instance().initialize();
      Badges.UserBadges.instance().addEventListener("BadgeTriggered", async (ev) => {
        loadedPanelCommonModule ??= await import("./../../panels/common/common.js");
        const badgeNotification = new loadedPanelCommonModule.BadgeNotification();
        void badgeNotification.present(ev.data);
      });
    }
    const conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance();
    conversationHandler.addEventListener("ExternalRequestReceived", () => Snackbar.Snackbar.Snackbar.show({ message: i18nString2(UIStrings2.externalRequestReceived) }));
    conversationHandler.addEventListener("ExternalConversationStarted", (event) => void VisualLogging2.logFunctionCall(`start-conversation-${event.data}`, "external"));
    _a.timeEnd("Main._createAppUI");
    const appProvider = Common2.AppProvider.getRegisteredAppProviders()[0];
    if (!appProvider) {
      throw new Error("Unable to boot DevTools, as the appprovider is missing");
    }
    await this.#showAppUI(await appProvider.loadAppProvider());
  }
  async #showAppUI(appProvider) {
    _a.time("Main._showAppUI");
    const app = appProvider.createApp();
    UI2.DockController.DockController.instance().initialize();
    ThemeSupport.ThemeSupport.instance().fetchColorsAndApplyHostTheme();
    app.presentUI(document);
    if (UI2.ActionRegistry.ActionRegistry.instance().hasAction("elements.toggle-element-search")) {
      const toggleSearchNodeAction = UI2.ActionRegistry.ActionRegistry.instance().getAction("elements.toggle-element-search");
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.EnterInspectElementMode, () => {
        void toggleSearchNodeAction.execute();
      }, this);
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.RevealSourceLine, this.#revealSourceLine, this);
    const inspectorView = UI2.InspectorView.InspectorView.instance();
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener("LocalOverridesRequested", (event) => {
      inspectorView.displaySelectOverrideFolderInfobar(event.data);
    });
    await inspectorView.createToolbars();
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.loadCompleted();
    UI2.ARIAUtils.LiveAnnouncer.initializeAnnouncerElements();
    UI2.DockController.DockController.instance().announceDockLocation();
    window.setTimeout(this.#initializeTarget.bind(this), 0);
    _a.timeEnd("Main._showAppUI");
  }
  async #initializeTarget() {
    _a.time("Main._initializeTarget");
    for (const runnableInstanceFunction of Common2.Runnable.earlyInitializationRunnables()) {
      await runnableInstanceFunction().run();
    }
    await this.#veStartPromise;
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.readyForTest();
    this.#readyForTestPromise.resolve();
    window.setTimeout(this.#lateInitialization.bind(this), 100);
    await this.#maybeInstallVeInspectionBinding();
    _a.timeEnd("Main._initializeTarget");
  }
  async #maybeInstallVeInspectionBinding() {
    const primaryPageTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    const url = primaryPageTarget?.targetInfo()?.url;
    const origin = url ? Common2.ParsedURL.ParsedURL.extractOrigin(url) : void 0;
    const binding = "__devtools_ve_inspection_binding__";
    if (primaryPageTarget && await VisualLogging2.isUnderInspection(origin)) {
      const runtimeModel = primaryPageTarget.model(SDK2.RuntimeModel.RuntimeModel);
      await runtimeModel?.addBinding({ name: binding });
      runtimeModel?.addEventListener(SDK2.RuntimeModel.Events.BindingCalled, (event) => {
        if (event.data.name === binding) {
          if (event.data.payload === "true" || event.data.payload === "false") {
            VisualLogging2.setVeDebuggingEnabled(event.data.payload === "true", (query) => {
              VisualLogging2.setVeDebuggingEnabled(false);
              void runtimeModel?.defaultExecutionContext()?.evaluate(
                {
                  expression: `window.inspect(${JSON.stringify(query)})`,
                  includeCommandLineAPI: false,
                  silent: true,
                  returnByValue: false,
                  generatePreview: false
                },
                /* userGesture */
                false,
                /* awaitPromise */
                false
              );
            });
          } else {
            VisualLogging2.setHighlightedVe(event.data.payload === "null" ? null : event.data.payload);
          }
        }
      });
    }
  }
  async #lateInitialization() {
    _a.time("Main._lateInitialization");
    PanelCommon.ExtensionServer.ExtensionServer.instance().initializeExtensions();
    const promises = Common2.Runnable.lateInitializationRunnables().map(async (lateInitializationLoader) => {
      const runnable = await lateInitializationLoader();
      return await runnable.run();
    });
    if (Root2.Runtime.experiments.isEnabled("live-heap-profile")) {
      const PerfUI = await import("./../../ui/legacy/components/perf_ui/perf_ui.js");
      const setting = "memory-live-heap-profile";
      if (Common2.Settings.Settings.instance().moduleSetting(setting).get()) {
        promises.push(PerfUI.LiveHeapProfile.LiveHeapProfile.instance().run());
      } else {
        const changeListener = async (event) => {
          if (!event.data) {
            return;
          }
          Common2.Settings.Settings.instance().moduleSetting(setting).removeChangeListener(changeListener);
          void PerfUI.LiveHeapProfile.LiveHeapProfile.instance().run();
        };
        Common2.Settings.Settings.instance().moduleSetting(setting).addChangeListener(changeListener);
      }
    }
    _a.timeEnd("Main._lateInitialization");
  }
  readyForTest() {
    return this.#readyForTestPromise.promise;
  }
  #registerMessageSinkListener() {
    Common2.Console.Console.instance().addEventListener("messageAdded", messageAdded);
    function messageAdded({ data: message }) {
      if (message.show) {
        Common2.Console.Console.instance().show();
      }
    }
  }
  #revealSourceLine(event) {
    const { url, lineNumber, columnNumber } = event.data;
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url);
    if (uiSourceCode) {
      void Common2.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
      return;
    }
    function listener(event2) {
      const uiSourceCode2 = event2.data;
      if (uiSourceCode2.url() === url) {
        void Common2.Revealer.reveal(uiSourceCode2.uiLocation(lineNumber, columnNumber));
        Workspace.Workspace.WorkspaceImpl.instance().removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
      }
    }
    Workspace.Workspace.WorkspaceImpl.instance().addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
  }
  #postDocumentKeyDown(event) {
    if (!event.handled) {
      UI2.ShortcutRegistry.ShortcutRegistry.instance().handleShortcut(event);
    }
  }
  #redispatchClipboardEvent(event) {
    const eventCopy = new CustomEvent("clipboard-" + event.type, { bubbles: true });
    eventCopy["original"] = event;
    const document2 = event.target && event.target.ownerDocument;
    const target = document2 ? UI2.DOMUtilities.deepActiveElement(document2) : null;
    if (target) {
      target.dispatchEvent(eventCopy);
    }
    if (eventCopy.handled) {
      event.preventDefault();
    }
  }
  #contextMenuEventFired(event) {
    if (event.handled || event.target.classList.contains("popup-glasspane")) {
      event.preventDefault();
    }
  }
  #addMainEventListeners(document2) {
    document2.addEventListener("keydown", this.#postDocumentKeyDown.bind(this), false);
    document2.addEventListener("beforecopy", this.#redispatchClipboardEvent.bind(this), true);
    document2.addEventListener("copy", this.#redispatchClipboardEvent.bind(this), false);
    document2.addEventListener("cut", this.#redispatchClipboardEvent.bind(this), false);
    document2.addEventListener("paste", this.#redispatchClipboardEvent.bind(this), false);
    document2.addEventListener("contextmenu", this.#contextMenuEventFired.bind(this), true);
  }
  #onSuspendStateChanged() {
    const suspended = SDK2.TargetManager.TargetManager.instance().allTargetsSuspended();
    UI2.InspectorView.InspectorView.instance().onSuspendStateChanged(suspended);
  }
  static instanceForTest = null;
};
_a = MainImpl;
globalThis.Main = globalThis.Main || {};
globalThis.Main.Main = MainImpl;
var ZoomActionDelegate = class {
  handleAction(_context, actionId) {
    if (Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()) {
      return false;
    }
    switch (actionId) {
      case "main.zoom-in":
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.zoomIn();
        return true;
      case "main.zoom-out":
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.zoomOut();
        return true;
      case "main.zoom-reset":
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.resetZoom();
        return true;
    }
    return false;
  }
};
var SearchActionDelegate = class {
  handleAction(_context, actionId) {
    let searchableView = UI2.SearchableView.SearchableView.fromElement(UI2.DOMUtilities.deepActiveElement(document));
    if (!searchableView) {
      const currentPanel = UI2.InspectorView.InspectorView.instance().currentPanelDeprecated();
      if (currentPanel?.searchableView) {
        searchableView = currentPanel.searchableView();
      }
      if (!searchableView) {
        return false;
      }
    }
    switch (actionId) {
      case "main.search-in-panel.find":
        return searchableView.handleFindShortcut();
      case "main.search-in-panel.cancel":
        return searchableView.handleCancelSearchShortcut();
      case "main.search-in-panel.find-next":
        return searchableView.handleFindNextShortcut();
      case "main.search-in-panel.find-previous":
        return searchableView.handleFindPreviousShortcut();
    }
    return false;
  }
};
var mainMenuItemInstance;
var MainMenuItem = class _MainMenuItem {
  #item;
  constructor() {
    this.#item = new UI2.Toolbar.ToolbarMenuButton(
      this.#handleContextMenu.bind(this),
      /* isIconDropdown */
      true,
      /* useSoftMenu */
      true,
      "main-menu",
      "dots-vertical"
    );
    this.#item.element.classList.add("main-menu");
    this.#item.setTitle(i18nString2(UIStrings2.customizeAndControlDevtools));
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!mainMenuItemInstance || forceNew) {
      mainMenuItemInstance = new _MainMenuItem();
    }
    return mainMenuItemInstance;
  }
  item() {
    return this.#item;
  }
  #handleContextMenu(contextMenu) {
    const dockController = UI2.DockController.DockController.instance();
    if (dockController.canDock()) {
      const dockItemElement = document.createElement("div");
      dockItemElement.classList.add("flex-auto", "flex-centered", "location-menu");
      dockItemElement.setAttribute("jslog", `${VisualLogging2.item("dock-side").track({ keydown: "ArrowDown|ArrowLeft|ArrowRight" })}`);
      dockItemElement.tabIndex = -1;
      UI2.ARIAUtils.setLabel(dockItemElement, UIStrings2.dockSide + UIStrings2.dockSideNavigation);
      const [toggleDockSideShortcut] = UI2.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction("main.toggle-dock");
      render2(html2`
        <span class="dockside-title"
              title=${i18nString2(UIStrings2.placementOfDevtoolsRelativeToThe, { PH1: toggleDockSideShortcut.title() })}>
          ${i18nString2(UIStrings2.dockSide)}
        </span>
        <devtools-toolbar @mousedown=${(event) => event.consume()}>
          <devtools-button class="toolbar-button"
                           jslog=${VisualLogging2.toggle().track({ click: true }).context("current-dock-state-undock")}
                           title=${i18nString2(UIStrings2.undockIntoSeparateWindow)}
                           aria-label=${i18nString2(UIStrings2.undockIntoSeparateWindow)}
                           .iconName=${"dock-window"}
                           .toggled=${dockController.dockSide() === "undocked"}
                           .toggledIconName=${"dock-window"}
                           .toggleType=${"primary-toggle"}
                           .variant=${"icon_toggle"}
                           @click=${setDockSide.bind(
        null,
        "undocked"
        /* UI.DockController.DockState.UNDOCKED */
      )}></devtools-button>
          <devtools-button class="toolbar-button"
                           jslog=${VisualLogging2.toggle().track({ click: true }).context("current-dock-state-left")}
                           title=${i18nString2(UIStrings2.dockToLeft)}
                           aria-label=${i18nString2(UIStrings2.dockToLeft)}
                           .iconName=${"dock-left"}
                           .toggled=${dockController.dockSide() === "left"}
                           .toggledIconName=${"dock-left"}
                           .toggleType=${"primary-toggle"}
                           .variant=${"icon_toggle"}
                           @click=${setDockSide.bind(
        null,
        "left"
        /* UI.DockController.DockState.LEFT */
      )}></devtools-button>
          <devtools-button class="toolbar-button"
                           jslog=${VisualLogging2.toggle().track({ click: true }).context("current-dock-state-bottom")}
                           title=${i18nString2(UIStrings2.dockToBottom)}
                           aria-label=${i18nString2(UIStrings2.dockToBottom)}
                           .iconName=${"dock-bottom"}
                           .toggled=${dockController.dockSide() === "bottom"}
                           .toggledIconName=${"dock-bottom"}
                           .toggleType=${"primary-toggle"}
                           .variant=${"icon_toggle"}
                           @click=${setDockSide.bind(
        null,
        "bottom"
        /* UI.DockController.DockState.BOTTOM */
      )}></devtools-button>
          <devtools-button class="toolbar-button"
                           jslog=${VisualLogging2.toggle().track({ click: true }).context("current-dock-state-right")}
                           title=${i18nString2(UIStrings2.dockToRight)}
                           aria-label=${i18nString2(UIStrings2.dockToRight)}
                           .iconName=${"dock-right"}
                           .toggled=${dockController.dockSide() === "right"}
                           .toggledIconName=${"dock-right"}
                           .toggleType=${"primary-toggle"}
                           .variant=${"icon_toggle"}
                           @click=${setDockSide.bind(
        null,
        "right"
        /* UI.DockController.DockState.RIGHT */
      )}></devtools-button>
        </devtools-toolbar>
      `, dockItemElement, { host: this });
      dockItemElement.addEventListener("keydown", (event) => {
        let dir = 0;
        if (event.key === "ArrowLeft") {
          dir = -1;
        } else if (event.key === "ArrowRight") {
          dir = 1;
        } else if (event.key === "ArrowDown") {
          const contextMenuElement = dockItemElement.closest(".soft-context-menu");
          contextMenuElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
          return;
        } else {
          return;
        }
        const buttons = Array.from(dockItemElement.querySelectorAll("devtools-button"));
        let index = buttons.findIndex((button2) => button2.hasFocus());
        index = Platform2.NumberUtilities.clamp(index + dir, 0, buttons.length - 1);
        buttons[index].focus();
        event.consume(true);
      });
      contextMenu.headerSection().appendCustomItem(dockItemElement, "dock-side");
    }
    const button = this.#item.element;
    function setDockSide(side) {
      void dockController.once(
        "AfterDockSideChanged"
        /* UI.DockController.Events.AFTER_DOCK_SIDE_CHANGED */
      ).then(() => button.focus());
      dockController.setDockSide(side);
      contextMenu.discard();
    }
    contextMenu.defaultSection().appendAction(
      "freestyler.main-menu",
      void 0,
      /* optional */
      true
    );
    if (dockController.dockSide() === "undocked") {
      const mainTarget = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
      if (mainTarget && mainTarget.type() === SDK2.Target.Type.FRAME) {
        contextMenu.defaultSection().appendAction("inspector-main.focus-debuggee", i18nString2(UIStrings2.focusDebuggee));
      }
    }
    contextMenu.defaultSection().appendAction("main.toggle-drawer", UI2.InspectorView.InspectorView.instance().drawerVisible() ? i18nString2(UIStrings2.hideConsoleDrawer) : i18nString2(UIStrings2.showConsoleDrawer));
    contextMenu.appendItemsAtLocation("mainMenu");
    const moreTools = contextMenu.defaultSection().appendSubMenuItem(i18nString2(UIStrings2.moreTools), false, "more-tools");
    const viewExtensions = UI2.ViewManager.ViewManager.instance().getRegisteredViewExtensions();
    viewExtensions.sort((extension1, extension2) => {
      const title1 = extension1.title();
      const title2 = extension2.title();
      return title1.localeCompare(title2);
    });
    for (const viewExtension of viewExtensions) {
      const location = viewExtension.location();
      const persistence = viewExtension.persistence();
      const title = viewExtension.title();
      const id = viewExtension.viewId();
      const promotionId = viewExtension.featurePromotionId();
      if (id === "issues-pane") {
        moreTools.defaultSection().appendItem(title, () => {
          Host.userMetrics.issuesPanelOpenedFrom(
            3
            /* Host.UserMetrics.IssueOpener.HAMBURGER_MENU */
          );
          void UI2.ViewManager.ViewManager.instance().showView(
            "issues-pane",
            /* userGesture */
            true
          );
        }, { jslogContext: id });
        continue;
      }
      if (persistence !== "closeable") {
        continue;
      }
      if (location !== "drawer-view" && location !== "panel") {
        continue;
      }
      let additionalElement = void 0;
      if (promotionId) {
        additionalElement = UI2.UIUtils.maybeCreateNewBadge(promotionId);
      }
      moreTools.defaultSection().appendItem(title, () => {
        void UI2.ViewManager.ViewManager.instance().showView(id, true, false);
      }, { additionalElement, isPreviewFeature: viewExtension.isPreviewFeature(), jslogContext: id });
    }
    const helpSubMenu = contextMenu.footerSection().appendSubMenuItem(i18nString2(UIStrings2.help), false, "help");
    helpSubMenu.appendItemsAtLocation("mainMenuHelp");
  }
};
var settingsButtonProviderInstance;
var SettingsButtonProvider = class _SettingsButtonProvider {
  #settingsButton;
  constructor() {
    this.#settingsButton = UI2.Toolbar.Toolbar.createActionButton("settings.show");
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!settingsButtonProviderInstance || forceNew) {
      settingsButtonProviderInstance = new _SettingsButtonProvider();
    }
    return settingsButtonProviderInstance;
  }
  item() {
    return this.#settingsButton;
  }
};
var PauseListener = class {
  constructor() {
    SDK2.TargetManager.TargetManager.instance().addModelListener(SDK2.DebuggerModel.DebuggerModel, SDK2.DebuggerModel.Events.DebuggerPaused, this.#debuggerPaused, this);
  }
  #debuggerPaused(event) {
    SDK2.TargetManager.TargetManager.instance().removeModelListener(SDK2.DebuggerModel.DebuggerModel, SDK2.DebuggerModel.Events.DebuggerPaused, this.#debuggerPaused, this);
    const debuggerModel = event.data;
    const debuggerPausedDetails = debuggerModel.debuggerPausedDetails();
    UI2.Context.Context.instance().setFlavor(SDK2.Target.Target, debuggerModel.target());
    void Common2.Revealer.reveal(debuggerPausedDetails);
  }
};
function sendOverProtocol(method, params) {
  return new Promise((resolve, reject) => {
    const sendRawMessage = ProtocolClient.InspectorBackend.test.sendRawMessage;
    if (!sendRawMessage) {
      return reject("Unable to send message to test client");
    }
    sendRawMessage(method, params, (err, ...results) => {
      if (err) {
        return reject(err);
      }
      return resolve(results);
    });
  });
}
var ReloadActionDelegate = class {
  handleAction(_context, actionId) {
    switch (actionId) {
      case "main.debug-reload":
        Components.Reload.reload();
        return true;
    }
    return false;
  }
};
async function handleExternalRequest(input) {
  const generator = await handleExternalRequestGenerator(input);
  let result;
  do {
    result = await generator.next();
  } while (!result.done);
  const response = result.value;
  if (response.type === "error") {
    throw new Error(response.message);
  }
  if (response.type === "answer") {
    return {
      response: response.message,
      devToolsLogs: response.devToolsLogs
    };
  }
  throw new Error("Received no response of type answer or type error");
}
globalThis.handleExternalRequest = handleExternalRequest;
async function handleExternalRequestGenerator(input) {
  switch (input.kind) {
    case "PERFORMANCE_RELOAD_GATHER_INSIGHTS": {
      const TimelinePanel = await import("./../../panels/timeline/timeline.js");
      return TimelinePanel.TimelinePanel.TimelinePanel.handleExternalRecordRequest();
    }
    case "PERFORMANCE_ANALYZE": {
      const TimelinePanel = await import("./../../panels/timeline/timeline.js");
      return await TimelinePanel.TimelinePanel.TimelinePanel.handleExternalAnalyzeRequest(input.args.prompt);
    }
    case "NETWORK_DEBUGGER": {
      const AiAssistanceModel2 = await import("./../../models/ai_assistance/ai_assistance.js");
      const conversationHandler = AiAssistanceModel2.ConversationHandler.ConversationHandler.instance();
      return await conversationHandler.handleExternalRequest({
        conversationType: "drjones-network-request",
        prompt: input.args.prompt,
        requestUrl: input.args.requestUrl
      });
    }
    case "LIVE_STYLE_DEBUGGER": {
      const AiAssistanceModel2 = await import("./../../models/ai_assistance/ai_assistance.js");
      const conversationHandler = AiAssistanceModel2.ConversationHandler.ConversationHandler.instance();
      return await conversationHandler.handleExternalRequest({
        conversationType: "freestyler",
        prompt: input.args.prompt,
        selector: input.args.selector
      });
    }
  }
  return async function* () {
    return {
      type: "error",
      // @ts-expect-error
      message: `Debugging with an agent of type '${input.kind}' is not implemented yet.`
    };
  }();
}
globalThis.handleExternalRequestGenerator = handleExternalRequestGenerator;

// gen/front_end/entrypoints/main/SimpleApp.js
var SimpleApp_exports = {};
__export(SimpleApp_exports, {
  SimpleApp: () => SimpleApp,
  SimpleAppProvider: () => SimpleAppProvider
});
import * as UI3 from "./../../ui/legacy/legacy.js";
var SimpleApp = class {
  presentUI(document2) {
    const rootView = new UI3.RootView.RootView();
    UI3.InspectorView.InspectorView.instance().show(rootView.element);
    rootView.attachToDocument(document2);
    rootView.focus();
  }
};
var simpleAppProviderInstance;
var SimpleAppProvider = class _SimpleAppProvider {
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!simpleAppProviderInstance || forceNew) {
      simpleAppProviderInstance = new _SimpleAppProvider();
    }
    return simpleAppProviderInstance;
  }
  createApp() {
    return new SimpleApp();
  }
};
export {
  ExecutionContextSelector_exports as ExecutionContextSelector,
  GlobalAiButton_exports as GlobalAiButton,
  MainImpl_exports as MainImpl,
  SimpleApp_exports as SimpleApp
};
//# sourceMappingURL=main.js.map
