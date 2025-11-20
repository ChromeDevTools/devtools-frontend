var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/legacy/ActionRegistration.js
var ActionRegistration_exports = {};
__export(ActionRegistration_exports, {
  Action: () => Action,
  getLocalizedActionCategory: () => getLocalizedActionCategory,
  getRegisteredActionExtensions: () => getRegisteredActionExtensions,
  maybeRemoveActionExtension: () => maybeRemoveActionExtension,
  registerActionExtension: () => registerActionExtension,
  reset: () => reset
});
import * as Common2 from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as Root from "./../../core/root/root.js";

// gen/front_end/ui/legacy/Context.js
var Context_exports = {};
__export(Context_exports, {
  Context: () => Context,
  registerListener: () => registerListener
});
import * as Common from "./../../core/common/common.js";
var contextInstance;
var Context = class _Context {
  #flavors = /* @__PURE__ */ new Map();
  #eventDispatchers = /* @__PURE__ */ new Map();
  constructor() {
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!contextInstance || forceNew) {
      contextInstance = new _Context();
    }
    return contextInstance;
  }
  static removeInstance() {
    contextInstance = void 0;
  }
  setFlavor(flavorType, flavorValue) {
    const value = this.#flavors.get(flavorType) || null;
    if (value === flavorValue) {
      return;
    }
    if (flavorValue) {
      this.#flavors.set(flavorType, flavorValue);
    } else {
      this.#flavors.delete(flavorType);
    }
    this.#dispatchFlavorChange(flavorType, flavorValue);
  }
  #dispatchFlavorChange(flavorType, flavorValue) {
    for (const extension of getRegisteredListeners()) {
      if (extension.contextTypes().includes(flavorType)) {
        void extension.loadListener().then((instance) => instance.flavorChanged(flavorValue));
      }
    }
    const dispatcher = this.#eventDispatchers.get(flavorType);
    if (!dispatcher) {
      return;
    }
    dispatcher.dispatchEventToListeners("FlavorChanged", flavorValue);
  }
  addFlavorChangeListener(flavorType, listener, thisObject) {
    let dispatcher = this.#eventDispatchers.get(flavorType);
    if (!dispatcher) {
      dispatcher = new Common.ObjectWrapper.ObjectWrapper();
      this.#eventDispatchers.set(flavorType, dispatcher);
    }
    dispatcher.addEventListener("FlavorChanged", listener, thisObject);
  }
  removeFlavorChangeListener(flavorType, listener, thisObject) {
    const dispatcher = this.#eventDispatchers.get(flavorType);
    if (!dispatcher) {
      return;
    }
    dispatcher.removeEventListener("FlavorChanged", listener, thisObject);
    if (!dispatcher.hasEventListeners(
      "FlavorChanged"
      /* Events.FLAVOR_CHANGED */
    )) {
      this.#eventDispatchers.delete(flavorType);
    }
  }
  flavor(flavorType) {
    return this.#flavors.get(flavorType) || null;
  }
  flavors() {
    return new Set(this.#flavors.keys());
  }
};
var registeredListeners = [];
function registerListener(registration) {
  registeredListeners.push(registration);
}
function getRegisteredListeners() {
  return registeredListeners;
}

// gen/front_end/ui/legacy/ActionRegistration.js
var UIStrings = {
  /**
   * @description Title of the keybind category 'Elements' in Settings' Shortcuts pannel.
   */
  elements: "Elements",
  /**
   * @description Title of the keybind category 'Screenshot' in Settings' Shortcuts pannel.
   */
  screenshot: "Screenshot",
  /**
   * @description Title of the keybind category 'Network' in Settings' Shortcuts pannel.
   */
  network: "Network",
  /**
   * @description Title of the keybind category 'Memory' in Settings' Shortcuts pannel.
   */
  memory: "Memory",
  /**
   * @description Title of the keybind category 'JavaScript Profiler' in Settings' Shortcuts pannel.
   */
  javascript_profiler: "JavaScript Profiler",
  /**
   * @description Title of the keybind category 'Console' in Settings' Shortcuts pannel.
   */
  console: "Console",
  /**
   * @description Title of the keybind category 'Performance' in Settings' Shortcuts pannel.
   */
  performance: "Performance",
  /**
   * @description Title of the keybind category 'Mobile' in Settings' Shortcuts pannel.
   */
  mobile: "Mobile",
  /**
   * @description Title of the keybind category 'Help' in Settings' Shortcuts pannel.
   */
  help: "Help",
  /**
   * @description Title of the keybind category 'Layers' in Settings' Shortcuts pannel.
   */
  layers: "Layers",
  /**
   * @description Title of the keybind category 'Navigation' in Settings' Shortcuts pannel.
   */
  navigation: "Navigation",
  /**
   * @description Title of the keybind category 'Drawer' in Settings' Shortcuts pannel.
   */
  drawer: "Drawer",
  /**
   * @description Title of the keybind category 'Global' in Settings' Shortcuts pannel.
   */
  global: "Global",
  /**
   * @description Title of the keybind category 'Resources' in Settings' Shortcuts pannel.
   */
  resources: "Resources",
  /**
   * @description Title of the keybind category 'Background Services' in Settings' Shortcuts pannel.
   */
  background_services: "Background Services",
  /**
   * @description Title of the keybind category 'Settings' in Settings' Shortcuts pannel.
   */
  settings: "Settings",
  /**
   * @description Title of the keybind category 'Debugger' in Settings' Shortcuts pannel.
   */
  debugger: "Debugger",
  /**
   * @description Title of the keybind category 'Sources' in Settings' Shortcuts pannel.
   */
  sources: "Sources",
  /**
   * @description Title of the keybind category 'Rendering' in Settings' Shortcuts pannel.
   */
  rendering: "Rendering",
  /**
   * @description Title of the keybind category 'Recorder' in Settings' Shortcuts pannel.
   */
  recorder: "Recorder",
  /**
   * @description Title of the keybind category 'Changes' in Settings' Shortcuts pannel.
   */
  changes: "Changes"
};
var str_ = i18n.i18n.registerUIStrings("ui/legacy/ActionRegistration.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var Action = class extends Common2.ObjectWrapper.ObjectWrapper {
  #enabled = true;
  #toggled = false;
  actionRegistration;
  constructor(actionRegistration) {
    super();
    this.actionRegistration = actionRegistration;
  }
  id() {
    return this.actionRegistration.actionId;
  }
  async execute(opts) {
    if (!this.actionRegistration.loadActionDelegate) {
      return false;
    }
    const delegate = await this.actionRegistration.loadActionDelegate();
    const actionId = this.id();
    return delegate.handleAction(Context.instance(), actionId, opts);
  }
  icon() {
    return this.actionRegistration.iconClass;
  }
  toggledIcon() {
    return this.actionRegistration.toggledIconClass;
  }
  toggleWithRedColor() {
    return Boolean(this.actionRegistration.toggleWithRedColor);
  }
  setEnabled(enabled) {
    if (this.#enabled === enabled) {
      return;
    }
    this.#enabled = enabled;
    this.dispatchEventToListeners("Enabled", enabled);
  }
  enabled() {
    return this.#enabled;
  }
  category() {
    return this.actionRegistration.category;
  }
  tags() {
    if (this.actionRegistration.tags) {
      return this.actionRegistration.tags.map((tag) => tag()).join("\0");
    }
  }
  toggleable() {
    return Boolean(this.actionRegistration.toggleable);
  }
  title() {
    let title = this.actionRegistration.title ? this.actionRegistration.title() : i18n.i18n.lockedString("");
    const options = this.actionRegistration.options;
    if (options) {
      for (const pair of options) {
        if (pair.value !== this.#toggled) {
          title = pair.title();
        }
      }
    }
    return title;
  }
  toggled() {
    return this.#toggled;
  }
  setToggled(toggled) {
    console.assert(this.toggleable(), "Shouldn't be toggling an untoggleable action", this.id());
    if (this.#toggled === toggled) {
      return;
    }
    this.#toggled = toggled;
    this.dispatchEventToListeners("Toggled", toggled);
  }
  options() {
    return this.actionRegistration.options;
  }
  contextTypes() {
    if (this.actionRegistration.contextTypes) {
      return this.actionRegistration.contextTypes();
    }
    return void 0;
  }
  canInstantiate() {
    return Boolean(this.actionRegistration.loadActionDelegate);
  }
  bindings() {
    return this.actionRegistration.bindings;
  }
  configurableBindings() {
    return this.actionRegistration.configurableBindings ?? true;
  }
  experiment() {
    return this.actionRegistration.experiment;
  }
  featurePromotionId() {
    return this.actionRegistration.featurePromotionId;
  }
  setting() {
    return this.actionRegistration.setting;
  }
  condition() {
    return this.actionRegistration.condition;
  }
  order() {
    return this.actionRegistration.order;
  }
};
var registeredActions = /* @__PURE__ */ new Map();
function registerActionExtension(registration) {
  const actionId = registration.actionId;
  if (registeredActions.has(actionId)) {
    throw new Error(`Duplicate action ID '${actionId}'`);
  }
  if (!Platform.StringUtilities.isExtendedKebabCase(actionId)) {
    throw new Error(`Invalid action ID '${actionId}'`);
  }
  registeredActions.set(actionId, new Action(registration));
}
function reset() {
  registeredActions.clear();
}
function getRegisteredActionExtensions() {
  return Array.from(registeredActions.values()).filter((action6) => {
    const settingName = action6.setting();
    try {
      if (settingName && !Common2.Settings.moduleSetting(settingName).get()) {
        return false;
      }
    } catch (err) {
      if (err.message.startsWith("No setting registered")) {
        return false;
      }
    }
    return Root.Runtime.Runtime.isDescriptorEnabled({
      experiment: action6.experiment(),
      condition: action6.condition()
    });
  }).sort((firstAction, secondAction) => {
    const order1 = firstAction.order() || 0;
    const order2 = secondAction.order() || 0;
    return order1 - order2;
  });
}
function maybeRemoveActionExtension(actionId) {
  return registeredActions.delete(actionId);
}
function getLocalizedActionCategory(category) {
  switch (category) {
    case "ELEMENTS":
      return i18nString(UIStrings.elements);
    case "SCREENSHOT":
      return i18nString(UIStrings.screenshot);
    case "NETWORK":
      return i18nString(UIStrings.network);
    case "MEMORY":
      return i18nString(UIStrings.memory);
    case "JAVASCRIPT_PROFILER":
      return i18nString(UIStrings.javascript_profiler);
    case "CONSOLE":
      return i18nString(UIStrings.console);
    case "PERFORMANCE":
      return i18nString(UIStrings.performance);
    case "MOBILE":
      return i18nString(UIStrings.mobile);
    case "HELP":
      return i18nString(UIStrings.help);
    case "LAYERS":
      return i18nString(UIStrings.layers);
    case "NAVIGATION":
      return i18nString(UIStrings.navigation);
    case "DRAWER":
      return i18nString(UIStrings.drawer);
    case "GLOBAL":
      return i18nString(UIStrings.global);
    case "RESOURCES":
      return i18nString(UIStrings.resources);
    case "BACKGROUND_SERVICES":
      return i18nString(UIStrings.background_services);
    case "SETTINGS":
      return i18nString(UIStrings.settings);
    case "DEBUGGER":
      return i18nString(UIStrings.debugger);
    case "SOURCES":
      return i18nString(UIStrings.sources);
    case "RENDERING":
      return i18nString(UIStrings.rendering);
    case "RECORDER":
      return i18nString(UIStrings.recorder);
    case "CHANGES":
      return i18nString(UIStrings.changes);
    case "":
      return i18n.i18n.lockedString("");
  }
  return i18n.i18n.lockedString(category);
}

// gen/front_end/ui/legacy/ActionRegistry.js
var ActionRegistry_exports = {};
__export(ActionRegistry_exports, {
  ActionRegistry: () => ActionRegistry
});
var actionRegistryInstance;
var ActionRegistry = class _ActionRegistry {
  actionsById;
  constructor() {
    this.actionsById = /* @__PURE__ */ new Map();
    this.registerActions();
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!actionRegistryInstance || forceNew) {
      actionRegistryInstance = new _ActionRegistry();
    }
    return actionRegistryInstance;
  }
  static removeInstance() {
    actionRegistryInstance = void 0;
  }
  static reset() {
    _ActionRegistry.removeInstance();
    reset();
  }
  registerActions() {
    for (const action6 of getRegisteredActionExtensions()) {
      this.actionsById.set(action6.id(), action6);
      if (!action6.canInstantiate()) {
        action6.setEnabled(false);
      }
    }
  }
  availableActions() {
    return this.applicableActions([...this.actionsById.keys()], Context.instance());
  }
  actions() {
    return [...this.actionsById.values()];
  }
  applicableActions(actionIds, context) {
    const applicableActions = [];
    for (const actionId of actionIds) {
      const action6 = this.actionsById.get(actionId);
      if (action6?.enabled()) {
        if (isActionApplicableToContextTypes(action6, context.flavors())) {
          applicableActions.push(action6);
        }
      }
    }
    return applicableActions;
    function isActionApplicableToContextTypes(action6, currentContextTypes) {
      const contextTypes = action6.contextTypes();
      if (!contextTypes) {
        return true;
      }
      for (let i = 0; i < contextTypes.length; ++i) {
        const contextType = contextTypes[i];
        const isMatching = Boolean(contextType) && currentContextTypes.has(contextType);
        if (isMatching) {
          return true;
        }
      }
      return false;
    }
  }
  hasAction(actionId) {
    return this.actionsById.has(actionId);
  }
  getAction(actionId) {
    const action6 = this.actionsById.get(actionId);
    if (action6) {
      return action6;
    }
    throw new Error(`Cannot find registered action with ID '${actionId}'`);
  }
};

// gen/front_end/ui/legacy/ARIAUtils.js
var ARIAUtils_exports = {};
__export(ARIAUtils_exports, {
  LiveAnnouncer: () => LiveAnnouncer,
  bindLabelToControl: () => bindLabelToControl,
  clearAutocomplete: () => clearAutocomplete,
  clearSelected: () => clearSelected,
  ensureId: () => ensureId,
  hasRole: () => hasRole,
  markAsAlert: () => markAsAlert,
  markAsApplication: () => markAsApplication,
  markAsButton: () => markAsButton,
  markAsCheckbox: () => markAsCheckbox,
  markAsCombobox: () => markAsCombobox,
  markAsComplementary: () => markAsComplementary,
  markAsGroup: () => markAsGroup,
  markAsHeading: () => markAsHeading,
  markAsLink: () => markAsLink,
  markAsList: () => markAsList,
  markAsListBox: () => markAsListBox,
  markAsListitem: () => markAsListitem,
  markAsMain: () => markAsMain,
  markAsMenu: () => markAsMenu,
  markAsMenuButton: () => markAsMenuButton,
  markAsMenuItem: () => markAsMenuItem,
  markAsMenuItemCheckBox: () => markAsMenuItemCheckBox,
  markAsMenuItemSubMenu: () => markAsMenuItemSubMenu,
  markAsModalDialog: () => markAsModalDialog,
  markAsMultiSelectable: () => markAsMultiSelectable,
  markAsNavigation: () => markAsNavigation,
  markAsOption: () => markAsOption,
  markAsPoliteLiveRegion: () => markAsPoliteLiveRegion,
  markAsPresentation: () => markAsPresentation,
  markAsProgressBar: () => markAsProgressBar,
  markAsRadioGroup: () => markAsRadioGroup,
  markAsSlider: () => markAsSlider,
  markAsStatus: () => markAsStatus,
  markAsTab: () => markAsTab,
  markAsTablist: () => markAsTablist,
  markAsTabpanel: () => markAsTabpanel,
  markAsTextBox: () => markAsTextBox,
  markAsTree: () => markAsTree,
  markAsTreeitem: () => markAsTreeitem,
  nextId: () => nextId,
  removeRole: () => removeRole,
  setActiveDescendant: () => setActiveDescendant,
  setAriaValueMinMax: () => setAriaValueMinMax,
  setAriaValueNow: () => setAriaValueNow,
  setAriaValueText: () => setAriaValueText,
  setAutocomplete: () => setAutocomplete,
  setCheckboxAsIndeterminate: () => setCheckboxAsIndeterminate,
  setChecked: () => setChecked,
  setControls: () => setControls,
  setDescription: () => setDescription,
  setDisabled: () => setDisabled,
  setExpanded: () => setExpanded,
  setHasPopup: () => setHasPopup,
  setHidden: () => setHidden,
  setInvalid: () => setInvalid,
  setLabel: () => setLabel,
  setLevel: () => setLevel,
  setPlaceholder: () => setPlaceholder,
  setPositionInSet: () => setPositionInSet,
  setPressed: () => setPressed,
  setProgressBarValue: () => setProgressBarValue,
  setSelected: () => setSelected,
  setSetSize: () => setSetSize,
  setValueNow: () => setValueNow,
  setValueText: () => setValueText,
  unsetExpandable: () => unsetExpandable
});
import * as Platform16 from "./../../core/platform/platform.js";

// gen/front_end/ui/legacy/Dialog.js
var Dialog_exports = {};
__export(Dialog_exports, {
  Dialog: () => Dialog
});
import * as Common15 from "./../../core/common/common.js";
import * as VisualLogging15 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/dialog.css.js
var dialog_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.widget {
  border-radius: var(--sys-shape-corner-small);
  box-shadow: var(--sys-elevation-level3);
  background: var(--sys-color-cdt-base-container);
  justify-content: flex-start;
  align-items: stretch;
  display: flex;
  min-width: min(100vw, var(--sys-size-30));
}

.dialog-close-button {
  position: absolute;
  right: 9px;
  top: 9px;
  z-index: 1;
}

/*# sourceURL=${import.meta.resolve("./dialog.css")} */`;

// gen/front_end/ui/legacy/GlassPane.js
var GlassPane_exports = {};
__export(GlassPane_exports, {
  GlassPane: () => GlassPane,
  GlassPanePanes: () => GlassPanePanes
});

// gen/front_end/ui/legacy/glassPane.css.js
var glassPane_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  position: absolute !important; /* stylelint-disable-line declaration-no-important */
  inset: 0;
  overflow: hidden;
  contain: strict;
  background-color: transparent;
}

:host-context(.dimmed-pane) {
  background-color: var(--sys-color-state-scrim);
}

:host-context(.no-pointer-events) {
  pointer-events: none;
}

.widget {
  display: flex;
  background-color: transparent;
  pointer-events: auto;
  flex: none;
}

.no-pointer-events {
  pointer-events: none;
}

/*# sourceURL=${import.meta.resolve("./glassPane.css")} */`;

// gen/front_end/ui/legacy/UIUtils.js
var UIUtils_exports = {};
__export(UIUtils_exports, {
  CheckboxLabel: () => CheckboxLabel,
  ConfirmDialog: () => ConfirmDialog,
  DevToolsCloseButton: () => DevToolsCloseButton,
  DevToolsIconLabel: () => DevToolsIconLabel,
  DevToolsSmallBubble: () => DevToolsSmallBubble,
  ElementFocusRestorer: () => ElementFocusRestorer,
  HTMLElementWithLightDOMTemplate: () => HTMLElementWithLightDOMTemplate,
  InterceptBindingDirective: () => InterceptBindingDirective,
  LongClickController: () => LongClickController,
  MaxLengthForDisplayedURLs: () => MaxLengthForDisplayedURLs,
  MessageDialog: () => MessageDialog,
  PromotionManager: () => PromotionManager,
  Renderer: () => Renderer,
  StyleValueDelimiters: () => StyleValueDelimiters,
  addPlatformClass: () => addPlatformClass,
  animateFunction: () => animateFunction,
  anotherProfilerActiveLabel: () => anotherProfilerActiveLabel,
  applyDomChanges: () => applyDomChanges,
  asyncStackTraceLabel: () => asyncStackTraceLabel,
  beautifyFunctionName: () => beautifyFunctionName,
  bindCheckbox: () => bindCheckbox,
  bindCheckboxImpl: () => bindCheckboxImpl,
  bindInput: () => bindInput,
  bindToAction: () => bindToAction,
  bindToSetting: () => bindToSetting,
  cloneCustomElement: () => cloneCustomElement,
  copyFileNameLabel: () => copyFileNameLabel,
  copyLinkAddressLabel: () => copyLinkAddressLabel,
  copyTextToClipboard: () => copyTextToClipboard,
  createFileSelectorElement: () => createFileSelectorElement,
  createHistoryInput: () => createHistoryInput,
  createIconLabel: () => createIconLabel,
  createInput: () => createInput,
  createLabel: () => createLabel,
  createOption: () => createOption,
  createRadioButton: () => createRadioButton,
  createReplacementString: () => createReplacementString,
  createSVGChild: () => createSVGChild,
  createSelect: () => createSelect,
  createShadowRootWithCoreStyles: () => createShadowRootWithCoreStyles,
  createSlider: () => createSlider,
  createTextButton: () => createTextButton,
  createTextChild: () => createTextChild,
  createTextChildren: () => createTextChildren,
  deepElementFromEvent: () => deepElementFromEvent,
  deepElementFromPoint: () => deepElementFromPoint,
  elementDragStart: () => elementDragStart,
  enclosingNodeOrSelfWithNodeName: () => enclosingNodeOrSelfWithNodeName,
  enclosingNodeOrSelfWithNodeNameInArray: () => enclosingNodeOrSelfWithNodeNameInArray,
  endBatchUpdate: () => endBatchUpdate,
  formatTimestamp: () => formatTimestamp,
  getApplicableRegisteredRenderers: () => getApplicableRegisteredRenderers,
  getDevToolsBoundingElement: () => getDevToolsBoundingElement,
  getValueModificationDirection: () => getValueModificationDirection,
  handleElementValueModifications: () => handleElementValueModifications,
  highlightRangesWithStyleClass: () => highlightRangesWithStyleClass,
  highlightSearchResult: () => highlightSearchResult,
  highlightSearchResults: () => highlightSearchResults,
  highlightedCurrentSearchResultClassName: () => highlightedCurrentSearchResultClassName,
  highlightedSearchResultClassName: () => highlightedSearchResultClassName,
  initializeUIUtils: () => initializeUIUtils,
  installComponentRootStyles: () => installComponentRootStyles,
  installDragHandle: () => installDragHandle,
  isBeingEdited: () => isBeingEdited,
  isEditing: () => isEditing,
  isElementValueModification: () => isElementValueModification,
  isScrolledToBottom: () => isScrolledToBottom,
  loadImage: () => loadImage,
  markBeingEdited: () => markBeingEdited,
  maybeCreateNewBadge: () => maybeCreateNewBadge,
  measurePreferredSize: () => measurePreferredSize,
  measureTextWidth: () => measureTextWidth,
  measuredScrollbarWidth: () => measuredScrollbarWidth,
  modifiedFloatNumber: () => modifiedFloatNumber,
  openLinkExternallyLabel: () => openLinkExternallyLabel,
  registerRenderer: () => registerRenderer,
  resetMeasuredScrollbarWidthForTest: () => resetMeasuredScrollbarWidthForTest,
  revertDomChanges: () => revertDomChanges,
  runCSSAnimationOnce: () => runCSSAnimationOnce,
  setTitle: () => setTitle,
  startBatchUpdate: () => startBatchUpdate,
  trimText: () => trimText,
  trimTextEnd: () => trimTextEnd,
  trimTextMiddle: () => trimTextMiddle
});

// gen/front_end/ui/legacy/Toolbar.js
var Toolbar_exports = {};
__export(Toolbar_exports, {
  Toolbar: () => Toolbar,
  ToolbarButton: () => ToolbarButton,
  ToolbarCheckbox: () => ToolbarCheckbox,
  ToolbarComboBox: () => ToolbarComboBox,
  ToolbarFilter: () => ToolbarFilter,
  ToolbarInput: () => ToolbarInput,
  ToolbarInputElement: () => ToolbarInputElement,
  ToolbarItem: () => ToolbarItem,
  ToolbarItemWithCompactLayout: () => ToolbarItemWithCompactLayout,
  ToolbarMenuButton: () => ToolbarMenuButton,
  ToolbarSeparator: () => ToolbarSeparator,
  ToolbarSettingCheckbox: () => ToolbarSettingCheckbox,
  ToolbarSettingComboBox: () => ToolbarSettingComboBox,
  ToolbarSettingToggle: () => ToolbarSettingToggle,
  ToolbarText: () => ToolbarText,
  ToolbarToggle: () => ToolbarToggle,
  registerToolbarItem: () => registerToolbarItem
});
import * as Common13 from "./../../core/common/common.js";
import * as i18n19 from "./../../core/i18n/i18n.js";
import * as Platform13 from "./../../core/platform/platform.js";
import * as Root6 from "./../../core/root/root.js";
import * as Buttons5 from "./../components/buttons/buttons.js";
import * as VisualLogging13 from "./../visual_logging/visual_logging.js";
import * as IconButton6 from "./../components/icon_button/icon_button.js";

// gen/front_end/ui/legacy/ContextMenu.js
var ContextMenu_exports = {};
__export(ContextMenu_exports, {
  ContextMenu: () => ContextMenu,
  Item: () => Item,
  MenuButton: () => MenuButton,
  Section: () => Section,
  SubMenu: () => SubMenu,
  maybeRemoveItem: () => maybeRemoveItem,
  registerItem: () => registerItem,
  registerProvider: () => registerProvider
});
import * as Host6 from "./../../core/host/host.js";
import * as Root5 from "./../../core/root/root.js";
import * as Buttons4 from "./../components/buttons/buttons.js";
import { html, render } from "./../lit/lit.js";
import * as VisualLogging9 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/ShortcutRegistry.js
var ShortcutRegistry_exports = {};
__export(ShortcutRegistry_exports, {
  DefaultShortcutSetting: () => DefaultShortcutSetting,
  ForwardedActions: () => ForwardedActions,
  ForwardedShortcut: () => ForwardedShortcut,
  KeyTimeout: () => KeyTimeout,
  ShortcutRegistry: () => ShortcutRegistry,
  ShortcutTreeNode: () => ShortcutTreeNode
});
import * as Common3 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as Platform4 from "./../../core/platform/platform.js";
import * as VisualLogging from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/KeyboardShortcut.js
var KeyboardShortcut_exports = {};
__export(KeyboardShortcut_exports, {
  KeyBindings: () => KeyBindings,
  KeyboardShortcut: () => KeyboardShortcut,
  Keys: () => Keys,
  Modifiers: () => Modifiers
});
import * as Host from "./../../core/host/host.js";
var KeyboardShortcut = class _KeyboardShortcut {
  descriptors;
  action;
  type;
  keybindSets;
  constructor(descriptors, action6, type, keybindSets) {
    this.descriptors = descriptors;
    this.action = action6;
    this.type = type;
    this.keybindSets = keybindSets || /* @__PURE__ */ new Set();
  }
  title() {
    return this.descriptors.map((descriptor) => descriptor.name).join(" ");
  }
  isDefault() {
    return this.type === "DefaultShortcut" || this.type === "DisabledDefault" || this.type === "KeybindSetShortcut" && this.keybindSets.has(DefaultShortcutSetting);
  }
  changeType(type) {
    return new _KeyboardShortcut(this.descriptors, this.action, type);
  }
  changeKeys(descriptors) {
    this.descriptors = descriptors;
    return this;
  }
  descriptorsMatch(descriptors) {
    if (descriptors.length !== this.descriptors.length) {
      return false;
    }
    return descriptors.every((descriptor, index) => descriptor.key === this.descriptors[index].key);
  }
  hasKeybindSet(keybindSet) {
    return !this.keybindSets || this.keybindSets.has(keybindSet);
  }
  equals(shortcut) {
    return this.descriptorsMatch(shortcut.descriptors) && this.type === shortcut.type && this.action === shortcut.action;
  }
  static createShortcutFromSettingObject(settingObject) {
    return new _KeyboardShortcut(settingObject.descriptors, settingObject.action, settingObject.type);
  }
  /**
   * Creates a number encoding keyCode in the lower 8 bits and modifiers mask in the higher 8 bits.
   * It is useful for matching pressed keys.
   */
  static makeKey(keyCode, modifiers) {
    if (typeof keyCode === "string") {
      keyCode = keyCode.charCodeAt(0) - (/^[a-z]/.test(keyCode) ? 32 : 0);
    }
    modifiers = modifiers || Modifiers.None.value;
    return _KeyboardShortcut.makeKeyFromCodeAndModifiers(keyCode, modifiers);
  }
  static makeKeyFromEvent(keyboardEvent) {
    let modifiers = Modifiers.None.value;
    if (keyboardEvent.shiftKey) {
      modifiers |= Modifiers.Shift.value;
    }
    if (keyboardEvent.ctrlKey) {
      modifiers |= Modifiers.Ctrl.value;
    }
    if (keyboardEvent.altKey) {
      modifiers |= Modifiers.Alt.value;
    }
    if (keyboardEvent.metaKey) {
      modifiers |= Modifiers.Meta.value;
    }
    const keyCode = keyboardEvent.keyCode || keyboardEvent["__keyCode"];
    return _KeyboardShortcut.makeKeyFromCodeAndModifiers(keyCode, modifiers);
  }
  // This checks if a "control equivalent" key is pressed. For non-mac platforms this means checking
  // if control is pressed but not meta. On mac, we instead check if meta is pressed but not control.
  static eventHasCtrlEquivalentKey(event) {
    return Host.Platform.isMac() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  }
  static eventHasEitherCtrlOrMeta(event) {
    return event.metaKey || event.ctrlKey;
  }
  static hasNoModifiers(event) {
    const keyboardEvent = event;
    return !keyboardEvent.ctrlKey && !keyboardEvent.shiftKey && !keyboardEvent.altKey && !keyboardEvent.metaKey;
  }
  static hasAtLeastOneModifier(event) {
    return _KeyboardShortcut.hasNoModifiers(event) === false;
  }
  static makeDescriptor(key, modifiers) {
    return {
      key: _KeyboardShortcut.makeKey(typeof key === "string" ? key : key.code, modifiers),
      name: _KeyboardShortcut.shortcutToString(key, modifiers)
    };
  }
  static makeDescriptorFromBindingShortcut(shortcut) {
    const [keyString, ...modifierStrings] = shortcut.split(/\+(?!$)/).reverse();
    let modifiers = 0;
    for (const modifierString of modifierStrings) {
      const modifier = Modifiers[modifierString].value;
      console.assert(typeof modifier !== "undefined", `Only one key other than modifier is allowed in shortcut <${shortcut}>`);
      modifiers |= modifier;
    }
    console.assert(keyString.length > 0, `Modifiers-only shortcuts are not allowed (encountered <${shortcut}>)`);
    const key = Keys[keyString] || KeyBindings[keyString];
    if (key && "shiftKey" in key && key.shiftKey) {
      modifiers |= Modifiers.Shift.value;
    }
    return _KeyboardShortcut.makeDescriptor(key ? key : keyString, modifiers);
  }
  static shortcutToString(key, modifiers) {
    if (typeof key !== "string" && _KeyboardShortcut.isModifier(key.code)) {
      return _KeyboardShortcut.modifiersToString(modifiers);
    }
    return _KeyboardShortcut.modifiersToString(modifiers) + _KeyboardShortcut.keyName(key);
  }
  static keyName(key) {
    if (typeof key === "string") {
      return key.toUpperCase();
    }
    if (typeof key.name === "string") {
      return key.name;
    }
    return key.name[Host.Platform.platform()] || key.name.other || "";
  }
  static makeKeyFromCodeAndModifiers(keyCode, modifiers) {
    return keyCode & 255 | (modifiers || 0) << 8;
  }
  static keyCodeAndModifiersFromKey(key) {
    return { keyCode: key & 255, modifiers: key >> 8 };
  }
  static isModifier(key) {
    const { keyCode } = _KeyboardShortcut.keyCodeAndModifiersFromKey(key);
    return keyCode === Keys.Shift.code || keyCode === Keys.Ctrl.code || keyCode === Keys.Alt.code || keyCode === Keys.Meta.code;
  }
  static modifiersToString(modifiers) {
    const isMac = Host.Platform.isMac();
    const m = Modifiers;
    const modifierNames = /* @__PURE__ */ new Map([
      [m.Ctrl, isMac ? "Ctrl\u2004" : "Ctrl\u200A+\u200A"],
      [m.Alt, isMac ? "\u2325\u2004" : "Alt\u200A+\u200A"],
      [m.Shift, isMac ? "\u21E7\u2004" : "Shift\u200A+\u200A"],
      [m.Meta, isMac ? "\u2318\u2004" : "Win\u200A+\u200A"]
    ]);
    return [m.Meta, m.Ctrl, m.Alt, m.Shift].map(mapModifiers).join("");
    function mapModifiers(m2) {
      return (modifiers || 0) & m2.value ? (
        /** @type {string} */
        modifierNames.get(m2)
      ) : "";
    }
  }
  static keyCodeToKey(keyCode) {
    return Object.values(Keys).find((key) => key.code === keyCode);
  }
  static modifierValueToModifier(modifierValue) {
    return Object.values(Modifiers).find((modifier) => modifier.value === modifierValue);
  }
};
var Modifiers = {
  None: { value: 0, name: "None" },
  Shift: { value: 1, name: "Shift" },
  Ctrl: { value: 2, name: "Ctrl" },
  Alt: { value: 4, name: "Alt" },
  Meta: { value: 8, name: "Meta" },
  CtrlOrMeta: {
    value: Host.Platform.isMac() ? 8 : 2,
    name: Host.Platform.isMac() ? "Meta" : "Ctrl"
  },
  ShiftOrOption: {
    value: Host.Platform.isMac() ? 4 : 1,
    name: Host.Platform.isMac() ? "Alt" : "Shift"
  }
};
var leftKey = {
  code: 37,
  name: "\u2190"
};
var upKey = {
  code: 38,
  name: "\u2191"
};
var rightKey = {
  code: 39,
  name: "\u2192"
};
var downKey = {
  code: 40,
  name: "\u2193"
};
var ctrlKey = {
  code: 17,
  name: "Ctrl"
};
var escKey = {
  code: 27,
  name: "Esc"
};
var spaceKey = {
  code: 32,
  name: "Space"
};
var plusKey = {
  code: 187,
  name: "+"
};
var backquoteKey = {
  code: 192,
  name: "`"
};
var quoteKey = {
  code: 222,
  name: "'"
};
var metaKey = {
  code: 91,
  name: "Meta"
};
var Keys = {
  Backspace: { code: 8, name: "\u21A4" },
  Tab: { code: 9, name: { mac: "\u21E5", other: "Tab" } },
  Enter: { code: 13, name: { mac: "\u21A9", other: "Enter" } },
  Shift: { code: 16, name: { mac: "\u21E7", other: "Shift" } },
  Ctrl: ctrlKey,
  Control: ctrlKey,
  Alt: { code: 18, name: "Alt" },
  Esc: escKey,
  Escape: escKey,
  Space: spaceKey,
  " ": spaceKey,
  PageUp: { code: 33, name: { mac: "\u21DE", other: "PageUp" } },
  // also NUM_NORTH_EAST
  PageDown: { code: 34, name: { mac: "\u21DF", other: "PageDown" } },
  // also NUM_SOUTH_EAST
  End: { code: 35, name: { mac: "\u2197", other: "End" } },
  // also NUM_SOUTH_WEST
  Home: { code: 36, name: { mac: "\u2196", other: "Home" } },
  // also NUM_NORTH_WEST
  Left: leftKey,
  // also NUM_WEST
  Up: upKey,
  // also NUM_NORTH
  Right: rightKey,
  // also NUM_EAST
  Down: downKey,
  // also NUM_SOUTH
  ArrowLeft: leftKey,
  ArrowUp: upKey,
  ArrowRight: rightKey,
  ArrowDown: downKey,
  Delete: { code: 46, name: "Del" },
  Zero: { code: 48, name: "0" },
  C: { code: 67, name: "C" },
  H: { code: 72, name: "H" },
  N: { code: 78, name: "N" },
  O: { code: 79, name: "O" },
  P: { code: 80, name: "P" },
  R: { code: 82, name: "R" },
  S: { code: 83, name: "S" },
  U: { code: 85, name: "U" },
  V: { code: 86, name: "V" },
  X: { code: 88, name: "X" },
  Meta: metaKey,
  F1: { code: 112, name: "F1" },
  F2: { code: 113, name: "F2" },
  F3: { code: 114, name: "F3" },
  F4: { code: 115, name: "F4" },
  F5: { code: 116, name: "F5" },
  F6: { code: 117, name: "F6" },
  F7: { code: 118, name: "F7" },
  F8: { code: 119, name: "F8" },
  F9: { code: 120, name: "F9" },
  F10: { code: 121, name: "F10" },
  F11: { code: 122, name: "F11" },
  F12: { code: 123, name: "F12" },
  Semicolon: { code: 186, name: ";" },
  NumpadPlus: { code: 107, name: "Numpad +" },
  NumpadMinus: { code: 109, name: "Numpad -" },
  Numpad0: { code: 96, name: "Numpad 0" },
  Plus: plusKey,
  Equal: plusKey,
  Comma: { code: 188, name: "," },
  Minus: { code: 189, name: "-" },
  Period: { code: 190, name: "." },
  Slash: { code: 191, name: "/" },
  QuestionMark: { code: 191, name: "?" },
  Apostrophe: backquoteKey,
  Tilde: { code: 192, name: "Tilde" },
  Backquote: backquoteKey,
  IntlBackslash: backquoteKey,
  LeftSquareBracket: { code: 219, name: "[" },
  RightSquareBracket: { code: 221, name: "]" },
  Backslash: { code: 220, name: "\\" },
  SingleQuote: quoteKey,
  Quote: quoteKey,
  // "default" command/ctrl key for platform, Command on Mac, Ctrl on other platforms
  CtrlOrMeta: Host.Platform.isMac() ? metaKey : ctrlKey
};
var KeyBindings = {};
(function() {
  for (const key in Keys) {
    const descriptor = Keys[key];
    if (typeof descriptor === "object" && descriptor["code"]) {
      const name = typeof descriptor["name"] === "string" ? descriptor["name"] : key;
      KeyBindings[name] = descriptor;
    }
  }
})();

// gen/front_end/ui/legacy/ShortcutRegistry.js
var shortcutRegistryInstance;
var ShortcutRegistry = class _ShortcutRegistry {
  actionRegistry;
  actionToShortcut;
  keyMap;
  activePrefixKey;
  activePrefixTimeout;
  consumePrefix;
  devToolsDefaultShortcutActions;
  disabledDefaultShortcutsForAction;
  keybindSetSetting;
  userShortcutsSetting;
  constructor(actionRegistry) {
    this.actionRegistry = actionRegistry;
    this.actionToShortcut = new Platform4.MapUtilities.Multimap();
    this.keyMap = new ShortcutTreeNode(0, 0);
    this.activePrefixKey = null;
    this.activePrefixTimeout = null;
    this.consumePrefix = null;
    this.devToolsDefaultShortcutActions = /* @__PURE__ */ new Set();
    this.disabledDefaultShortcutsForAction = new Platform4.MapUtilities.Multimap();
    this.keybindSetSetting = Common3.Settings.Settings.instance().moduleSetting("active-keybind-set");
    this.keybindSetSetting.addChangeListener((event) => {
      Host2.userMetrics.keybindSetSettingChanged(event.data);
      this.registerBindings();
    });
    this.userShortcutsSetting = Common3.Settings.Settings.instance().moduleSetting("user-shortcuts");
    this.userShortcutsSetting.addChangeListener(this.registerBindings, this);
    this.registerBindings();
  }
  static instance(opts = { forceNew: null, actionRegistry: null }) {
    const { forceNew, actionRegistry } = opts;
    if (!shortcutRegistryInstance || forceNew) {
      if (!actionRegistry) {
        throw new Error("Missing actionRegistry for shortcutRegistry");
      }
      shortcutRegistryInstance = new _ShortcutRegistry(actionRegistry);
    }
    return shortcutRegistryInstance;
  }
  static removeInstance() {
    shortcutRegistryInstance = void 0;
  }
  applicableActions(key, handlers = {}) {
    let actions = [];
    const keyMap = this.activePrefixKey || this.keyMap;
    const keyNode = keyMap.getNode(key);
    if (keyNode) {
      actions = keyNode.actions();
    }
    const applicableActions = this.actionRegistry.applicableActions(actions, Context.instance());
    if (keyNode) {
      for (const actionId of Object.keys(handlers)) {
        if (keyNode.actions().indexOf(actionId) >= 0) {
          if (this.actionRegistry.hasAction(actionId)) {
            const action6 = this.actionRegistry.getAction(actionId);
            applicableActions.push(action6);
          }
        }
      }
    }
    return applicableActions;
  }
  shortcutsForAction(action6) {
    return [...this.actionToShortcut.get(action6)];
  }
  actionsForDescriptors(descriptors) {
    let keyMapNode = this.keyMap;
    for (const { key } of descriptors) {
      if (!keyMapNode) {
        return [];
      }
      keyMapNode = keyMapNode.getNode(key);
    }
    return keyMapNode ? keyMapNode.actions() : [];
  }
  globalShortcutKeys() {
    const keys = [];
    for (const node of this.keyMap.chords().values()) {
      const actions = node.actions();
      const applicableActions = this.actionRegistry.applicableActions(actions, Context.instance());
      if (applicableActions.length || node.hasChords()) {
        keys.push(node.key());
      }
    }
    return keys;
  }
  keysForAction(actionId) {
    const keys = [...this.actionToShortcut.get(actionId)].flatMap((shortcut) => shortcut.descriptors.map((descriptor) => descriptor.key));
    return keys;
  }
  shortcutTitleForAction(actionId) {
    for (const shortcut of this.actionToShortcut.get(actionId)) {
      return shortcut.title();
    }
    return void 0;
  }
  keyAndModifiersForAction(actionId) {
    for (const keys of this.keysForAction(actionId)) {
      const { keyCode, modifiers } = KeyboardShortcut.keyCodeAndModifiersFromKey(keys);
      const key = KeyboardShortcut.keyCodeToKey(keyCode);
      if (key) {
        return { key, modifier: KeyboardShortcut.modifierValueToModifier(modifiers) || Modifiers.None };
      }
    }
    return void 0;
  }
  // DevTools and Chrome modifier values do not match, see latter here: crsrc.org/c/ui/events/event_constants.h;l=24
  devToolsToChromeModifier(devToolsModifier) {
    return devToolsModifier.value * 2;
  }
  handleShortcut(event, handlers) {
    void this.handleKey(KeyboardShortcut.makeKeyFromEvent(event), event.key, event, handlers);
  }
  actionHasDefaultShortcut(actionId) {
    return this.devToolsDefaultShortcutActions.has(actionId);
  }
  getShortcutListener(handlers) {
    const shortcuts = Object.keys(handlers).flatMap((action6) => [...this.actionToShortcut.get(action6)]);
    const allowlistKeyMap = new ShortcutTreeNode(0, 0);
    shortcuts.forEach((shortcut) => {
      allowlistKeyMap.addKeyMapping(shortcut.descriptors.map((descriptor) => descriptor.key), shortcut.action);
    });
    return (event) => {
      const key = KeyboardShortcut.makeKeyFromEvent(event);
      const keyMap = this.activePrefixKey ? allowlistKeyMap.getNode(this.activePrefixKey.key()) : allowlistKeyMap;
      if (!keyMap) {
        return;
      }
      if (keyMap.getNode(key)) {
        this.handleShortcut(event, handlers);
      }
    };
  }
  addShortcutListener(element, handlers) {
    const listener = this.getShortcutListener(handlers);
    element.addEventListener("keydown", listener);
    return listener;
  }
  async handleKey(key, domKey, event, handlers) {
    const keyModifiers = key >> 8;
    const hasHandlersOrPrefixKey = Boolean(handlers) || Boolean(this.activePrefixKey);
    const keyMapNode = this.keyMap.getNode(key);
    const actions = this.applicableActions(key, handlers);
    const maybeHasActions = actions.length > 0 || keyMapNode?.hasChords();
    if (!hasHandlersOrPrefixKey && isPossiblyInputKey() || !maybeHasActions || KeyboardShortcut.isModifier(KeyboardShortcut.keyCodeAndModifiersFromKey(key).keyCode)) {
      return;
    }
    if (event) {
      event.consume(true);
    }
    const DIALOG_ALLOWED_ACTION_IDS = ["main.zoom-in", "main.zoom-out", "main.zoom-reset"];
    if (!hasHandlersOrPrefixKey && Dialog.hasInstance() && (actions.length !== 1 || !DIALOG_ALLOWED_ACTION_IDS.includes(actions[0].id()))) {
      return;
    }
    if (this.activePrefixTimeout) {
      clearTimeout(this.activePrefixTimeout);
      const handled = await maybeExecuteActionForKey.call(this, event);
      this.activePrefixKey = null;
      this.activePrefixTimeout = null;
      if (handled) {
        return;
      }
      if (this.consumePrefix) {
        await this.consumePrefix();
      }
    }
    if (keyMapNode?.hasChords()) {
      this.activePrefixKey = keyMapNode;
      this.consumePrefix = async () => {
        this.activePrefixKey = null;
        this.activePrefixTimeout = null;
        await maybeExecuteActionForKey.call(this, event);
      };
      this.activePrefixTimeout = window.setTimeout(this.consumePrefix, KeyTimeout);
    } else {
      await maybeExecuteActionForKey.call(this, event);
    }
    function isPossiblyInputKey() {
      if (!event || !isEditing() || /^F\d+|Control|Shift|Alt|Meta|Escape|Win|U\+001B$/.test(domKey)) {
        return false;
      }
      if (!keyModifiers) {
        return true;
      }
      const modifiers = Modifiers;
      if (Host2.Platform.isMac()) {
        if (KeyboardShortcut.makeKey("z", modifiers.Meta.value) === key) {
          return true;
        }
        if (KeyboardShortcut.makeKey("z", modifiers.Meta.value | modifiers.Shift.value) === key) {
          return true;
        }
      } else {
        if (KeyboardShortcut.makeKey("z", modifiers.Ctrl.value) === key) {
          return true;
        }
        if (KeyboardShortcut.makeKey("y", modifiers.Ctrl.value) === key) {
          return true;
        }
        if (!Host2.Platform.isWin() && KeyboardShortcut.makeKey("z", modifiers.Ctrl.value | modifiers.Shift.value) === key) {
          return true;
        }
      }
      if ((keyModifiers & (modifiers.Ctrl.value | modifiers.Alt.value)) === (modifiers.Ctrl.value | modifiers.Alt.value)) {
        return Host2.Platform.isWin();
      }
      return !hasModifier(modifiers.Ctrl.value) && !hasModifier(modifiers.Alt.value) && !hasModifier(modifiers.Meta.value);
    }
    function hasModifier(mod) {
      return Boolean(keyModifiers & mod);
    }
    async function maybeExecuteActionForKey(event2) {
      const actions2 = this.applicableActions(key, handlers);
      if (!actions2.length) {
        return false;
      }
      for (const action6 of actions2) {
        let handled;
        if (event2) {
          void VisualLogging.logKeyDown(null, event2, action6.id());
        }
        if (handlers?.[action6.id()]) {
          handled = await handlers[action6.id()]();
        }
        if (!handlers) {
          handled = await action6.execute();
        }
        if (handled) {
          Host2.userMetrics.keyboardShortcutFired(action6.id());
          return true;
        }
      }
      return false;
    }
  }
  registerUserShortcut(shortcut) {
    for (const otherShortcut of this.disabledDefaultShortcutsForAction.get(shortcut.action)) {
      if (otherShortcut.descriptorsMatch(shortcut.descriptors) && otherShortcut.hasKeybindSet(this.keybindSetSetting.get())) {
        this.removeShortcut(otherShortcut);
        return;
      }
    }
    for (const otherShortcut of this.actionToShortcut.get(shortcut.action)) {
      if (otherShortcut.descriptorsMatch(shortcut.descriptors)) {
        return;
      }
    }
    this.addShortcutToSetting(shortcut);
  }
  removeShortcut(shortcut) {
    if (shortcut.type === "DefaultShortcut" || shortcut.type === "KeybindSetShortcut") {
      this.addShortcutToSetting(shortcut.changeType(
        "DisabledDefault"
        /* Type.DISABLED_DEFAULT */
      ));
    } else {
      this.removeShortcutFromSetting(shortcut);
    }
  }
  disabledDefaultsForAction(actionId) {
    return this.disabledDefaultShortcutsForAction.get(actionId);
  }
  addShortcutToSetting(shortcut) {
    const userShortcuts = this.userShortcutsSetting.get();
    userShortcuts.push(shortcut);
    this.userShortcutsSetting.set(userShortcuts);
  }
  removeShortcutFromSetting(shortcut) {
    const userShortcuts = this.userShortcutsSetting.get();
    const index = userShortcuts.findIndex(shortcut.equals, shortcut);
    if (index !== -1) {
      userShortcuts.splice(index, 1);
      this.userShortcutsSetting.set(userShortcuts);
    }
  }
  registerShortcut(shortcut) {
    this.actionToShortcut.set(shortcut.action, shortcut);
    this.keyMap.addKeyMapping(shortcut.descriptors.map((descriptor) => descriptor.key), shortcut.action);
  }
  registerBindings() {
    this.actionToShortcut.clear();
    this.keyMap.clear();
    const keybindSet = this.keybindSetSetting.get();
    this.disabledDefaultShortcutsForAction.clear();
    this.devToolsDefaultShortcutActions.clear();
    const forwardedKeys = [];
    const userShortcuts = this.userShortcutsSetting.get();
    for (const userShortcut of userShortcuts) {
      const shortcut = KeyboardShortcut.createShortcutFromSettingObject(userShortcut);
      if (shortcut.type === "DisabledDefault") {
        this.disabledDefaultShortcutsForAction.set(shortcut.action, shortcut);
      } else {
        if (ForwardedActions.has(shortcut.action)) {
          forwardedKeys.push(...shortcut.descriptors.map((descriptor) => KeyboardShortcut.keyCodeAndModifiersFromKey(descriptor.key)));
        }
        this.registerShortcut(shortcut);
      }
    }
    for (const actionExtension of getRegisteredActionExtensions()) {
      const actionId = actionExtension.id();
      const bindings = actionExtension.bindings();
      for (let i = 0; bindings && i < bindings.length; ++i) {
        const keybindSets = bindings[i].keybindSets;
        if (!platformMatches(bindings[i].platform) || !keybindSetsMatch(keybindSets)) {
          continue;
        }
        const keys = bindings[i].shortcut.split(/\s+/);
        const shortcutDescriptors = keys.map(KeyboardShortcut.makeDescriptorFromBindingShortcut);
        if (shortcutDescriptors.length > 0) {
          if (this.isDisabledDefault(shortcutDescriptors, actionId)) {
            this.devToolsDefaultShortcutActions.add(actionId);
            continue;
          }
          if (ForwardedActions.has(actionId)) {
            forwardedKeys.push(...shortcutDescriptors.map((shortcut) => KeyboardShortcut.keyCodeAndModifiersFromKey(shortcut.key)));
          }
          if (!keybindSets) {
            this.devToolsDefaultShortcutActions.add(actionId);
            this.registerShortcut(new KeyboardShortcut(
              shortcutDescriptors,
              actionId,
              "DefaultShortcut"
              /* Type.DEFAULT_SHORTCUT */
            ));
          } else {
            if (keybindSets.includes(
              "devToolsDefault"
              /* KeybindSet.DEVTOOLS_DEFAULT */
            )) {
              this.devToolsDefaultShortcutActions.add(actionId);
            }
            this.registerShortcut(new KeyboardShortcut(shortcutDescriptors, actionId, "KeybindSetShortcut", new Set(keybindSets)));
          }
        }
      }
    }
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.setWhitelistedShortcuts(JSON.stringify(forwardedKeys));
    function platformMatches(platformsString) {
      if (!platformsString) {
        return true;
      }
      const platforms = platformsString.split(",");
      let isMatch = false;
      const currentPlatform = Host2.Platform.platform();
      for (let i = 0; !isMatch && i < platforms.length; ++i) {
        isMatch = platforms[i] === currentPlatform;
      }
      return isMatch;
    }
    function keybindSetsMatch(keybindSets) {
      if (!keybindSets) {
        return true;
      }
      return keybindSets.includes(keybindSet);
    }
  }
  isDisabledDefault(shortcutDescriptors, action6) {
    const disabledDefaults = this.disabledDefaultShortcutsForAction.get(action6);
    for (const disabledDefault of disabledDefaults) {
      if (disabledDefault.descriptorsMatch(shortcutDescriptors)) {
        return true;
      }
    }
    return false;
  }
};
var ShortcutTreeNode = class _ShortcutTreeNode {
  #key;
  #actions;
  #chords;
  depth;
  constructor(key, depth = 0) {
    this.#key = key;
    this.#actions = [];
    this.#chords = /* @__PURE__ */ new Map();
    this.depth = depth;
  }
  addAction(action6) {
    this.#actions.push(action6);
  }
  key() {
    return this.#key;
  }
  chords() {
    return this.#chords;
  }
  hasChords() {
    return this.#chords.size > 0;
  }
  addKeyMapping(keys, action6) {
    if (keys.length < this.depth) {
      return;
    }
    if (keys.length === this.depth) {
      this.addAction(action6);
    } else {
      const key = keys[this.depth];
      if (!this.#chords.has(key)) {
        this.#chords.set(key, new _ShortcutTreeNode(key, this.depth + 1));
      }
      this.#chords.get(key).addKeyMapping(keys, action6);
    }
  }
  getNode(key) {
    return this.#chords.get(key) || null;
  }
  actions() {
    return this.#actions;
  }
  clear() {
    this.#actions = [];
    this.#chords = /* @__PURE__ */ new Map();
  }
};
var ForwardedShortcut = class _ForwardedShortcut {
  static instance = new _ForwardedShortcut();
};
var ForwardedActions = /* @__PURE__ */ new Set([
  "main.toggle-dock",
  "debugger.toggle-breakpoints-active",
  "debugger.toggle-pause",
  "quick-open.show-command-menu",
  "console.toggle"
]);
var KeyTimeout = 1e3;
var DefaultShortcutSetting = "devToolsDefault";

// gen/front_end/ui/legacy/SoftContextMenu.js
var SoftContextMenu_exports = {};
__export(SoftContextMenu_exports, {
  SoftContextMenu: () => SoftContextMenu
});
import * as i18n15 from "./../../core/i18n/i18n.js";
import * as IconButton5 from "./../components/icon_button/icon_button.js";
import * as VisualLogging8 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/InspectorView.js
var InspectorView_exports = {};
__export(InspectorView_exports, {
  ActionDelegate: () => ActionDelegate,
  DockMode: () => DockMode,
  DrawerOrientation: () => DrawerOrientation,
  InspectorView: () => InspectorView,
  InspectorViewTabDelegate: () => InspectorViewTabDelegate
});
import * as Common10 from "./../../core/common/common.js";
import * as Host5 from "./../../core/host/host.js";
import * as i18n13 from "./../../core/i18n/i18n.js";
import * as Root4 from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Buttons3 from "./../components/buttons/buttons.js";
import * as IconButton4 from "./../components/icon_button/icon_button.js";
import * as VisualLogging7 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/DockController.js
var DockController_exports = {};
__export(DockController_exports, {
  CloseButtonProvider: () => CloseButtonProvider,
  DockController: () => DockController,
  ToggleDockActionDelegate: () => ToggleDockActionDelegate
});
import * as Common4 from "./../../core/common/common.js";
import * as Host3 from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as VisualLogging2 from "./../visual_logging/visual_logging.js";
var UIStrings2 = {
  /**
   * @description Text to close something
   */
  close: "Close",
  /**
   * @description Text announced when the DevTools are undocked
   */
  devtoolsUndocked: "DevTools is undocked",
  /**
   * @description Text announced when the DevTools are docked to the left, right, or bottom of the browser tab
   * @example {bottom} PH1
   */
  devToolsDockedTo: "DevTools is docked to {PH1}"
};
var str_2 = i18n3.i18n.registerUIStrings("ui/legacy/DockController.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var dockControllerInstance;
var DockController = class _DockController extends Common4.ObjectWrapper.ObjectWrapper {
  #canDock;
  closeButton;
  currentDockStateSetting;
  lastDockStateSetting;
  #dockSide = void 0;
  constructor(canDock) {
    super();
    this.#canDock = canDock;
    this.closeButton = new ToolbarButton(i18nString2(UIStrings2.close), "cross");
    this.closeButton.element.setAttribute("jslog", `${VisualLogging2.close().track({ click: true })}`);
    this.closeButton.element.classList.add("close-devtools");
    this.closeButton.addEventListener("Click", Host3.InspectorFrontendHost.InspectorFrontendHostInstance.closeWindow.bind(Host3.InspectorFrontendHost.InspectorFrontendHostInstance));
    this.currentDockStateSetting = Common4.Settings.Settings.instance().moduleSetting("currentDockState");
    this.lastDockStateSetting = Common4.Settings.Settings.instance().createSetting(
      "last-dock-state",
      "bottom"
      /* DockState.BOTTOM */
    );
    if (!canDock) {
      this.#dockSide = "undocked";
      this.closeButton.setVisible(false);
      return;
    }
    this.currentDockStateSetting.addChangeListener(this.dockSideChanged, this);
    if (states.indexOf(this.currentDockStateSetting.get()) === -1) {
      this.currentDockStateSetting.set(
        "right"
        /* DockState.RIGHT */
      );
    }
    if (states.indexOf(this.lastDockStateSetting.get()) === -1) {
      this.currentDockStateSetting.set(
        "bottom"
        /* DockState.BOTTOM */
      );
    }
  }
  static instance(opts = { forceNew: null, canDock: false }) {
    const { forceNew, canDock } = opts;
    if (!dockControllerInstance || forceNew) {
      dockControllerInstance = new _DockController(canDock);
    }
    return dockControllerInstance;
  }
  initialize() {
    if (!this.#canDock) {
      return;
    }
    this.dockSideChanged();
  }
  dockSideChanged() {
    this.setDockSide(this.currentDockStateSetting.get());
  }
  dockSide() {
    return this.#dockSide;
  }
  /**
   * Whether the DevTools can be docked, used to determine if we show docking UI.
   * Set via `Root.Runtime.Runtime.queryParam('can_dock')`. See https://cs.chromium.org/can_dock+f:window
   *
   * Shouldn't be used as a heuristic for target connection state.
   */
  canDock() {
    return this.#canDock;
  }
  isVertical() {
    return this.#dockSide === "right" || this.#dockSide === "left";
  }
  setDockSide(dockSide) {
    if (states.indexOf(dockSide) === -1) {
      dockSide = states[0];
    }
    if (this.#dockSide === dockSide) {
      return;
    }
    if (this.#dockSide !== void 0) {
      document.body.classList.remove(this.#dockSide);
    }
    document.body.classList.add(dockSide);
    if (this.#dockSide) {
      this.lastDockStateSetting.set(this.#dockSide);
    }
    const eventData = { from: this.#dockSide, to: dockSide };
    this.dispatchEventToListeners("BeforeDockSideChanged", eventData);
    console.timeStamp("DockController.setIsDocked");
    this.#dockSide = dockSide;
    this.currentDockStateSetting.set(dockSide);
    Host3.InspectorFrontendHost.InspectorFrontendHostInstance.setIsDocked(dockSide !== "undocked", this.setIsDockedResponse.bind(this, eventData));
    this.closeButton.setVisible(
      this.#dockSide !== "undocked"
      /* DockState.UNDOCKED */
    );
    this.dispatchEventToListeners("DockSideChanged", eventData);
  }
  setIsDockedResponse(eventData) {
    this.dispatchEventToListeners("AfterDockSideChanged", eventData);
    this.announceDockLocation();
  }
  toggleDockSide() {
    if (this.lastDockStateSetting.get() === this.currentDockStateSetting.get()) {
      const index = states.indexOf(this.currentDockStateSetting.get()) || 0;
      this.lastDockStateSetting.set(states[(index + 1) % states.length]);
    }
    this.setDockSide(this.lastDockStateSetting.get());
  }
  announceDockLocation() {
    if (this.#dockSide === "undocked") {
      LiveAnnouncer.alert(i18nString2(UIStrings2.devtoolsUndocked));
    } else {
      LiveAnnouncer.alert(i18nString2(UIStrings2.devToolsDockedTo, { PH1: this.#dockSide || "" }));
    }
  }
};
var states = [
  "right",
  "bottom",
  "left",
  "undocked"
  /* DockState.UNDOCKED */
];
var ToggleDockActionDelegate = class {
  handleAction(_context, _actionId) {
    DockController.instance().toggleDockSide();
    return true;
  }
};
var closeButtonProviderInstance;
var CloseButtonProvider = class _CloseButtonProvider {
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!closeButtonProviderInstance || forceNew) {
      closeButtonProviderInstance = new _CloseButtonProvider();
    }
    return closeButtonProviderInstance;
  }
  item() {
    return DockController.instance().closeButton;
  }
};

// gen/front_end/ui/legacy/Infobar.js
var Infobar_exports = {};
__export(Infobar_exports, {
  Infobar: () => Infobar
});
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as Buttons from "./../components/buttons/buttons.js";
import * as VisualLogging3 from "./../visual_logging/visual_logging.js";
import * as IconButton from "./../components/icon_button/icon_button.js";

// gen/front_end/ui/legacy/infobar.css.js
var infobar_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@media (prefers-reduced-motion: no-preference) {
  :host {
    transition: all var(--sys-motion-duration-long2);
    transition-timing-function: var(--sys-motion-curve-spatial);
  }
}

@starting-style {
  :host {
    height: 0;
    opacity: 0%;
  }
}

.infobar {
  --summary-header-height: var(--sys-size-11);

  color: var(--sys-color-on-surface);
  background-color: var(--sys-color-cdt-base-container);
  display: flex;
  flex: auto;
  flex-direction: row;
  position: relative;
  padding: var(--sys-size-5) var(--sys-size-8);
  min-width: fit-content;
  min-height: calc(var(--summary-header-height) + var(--sys-size-5) * 2);

  .icon-container {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    height: var(--summary-header-height);
  }

  dt-close-button {
    margin-left: var(--sys-size-3);
  }
}

.infobar:focus {
  outline: 2px solid var(--sys-color-state-focus-ring);
  outline-offset: -2px;
}

.infobar-warning {
  background-color: var(--sys-color-surface-yellow);
  color: var(--sys-color-on-surface-yellow);
}

.infobar-error {
  --override-infobar-error-background: var(--sys-color-surface-error);
  --override-infobar-error-text: var(--sys-color-on-surface-error);

  background-color: var(--override-infobar-error-background);
  color: var(--override-infobar-error-text);
}

.infobar-main-row {
  display: inline-flex;
  flex-direction: row;
  margin-right: auto;
}

.infobar-info-container {
  display: flex;
  row-gap: var(--sys-size-4);
  align-items: center;
  flex-grow: 1;
  flex-wrap: wrap;
}

.infobar-info-text {
  font: var(--sys-typescale-body3-regular);
  margin-right: var(--sys-size-8);
}

.infobar-details-row {
  display: flex;
  flex-direction: column;
  line-height: 18px;

  + .infobar-details-row {
    padding-top: var(--sys-size-3);
  }
}

.infobar-selectable {
  user-select: text;
}

.infobar-button {
  color: var(--sys-color-token-subtle);
}

.info-icon {
  color: var(--sys-color-primary);
}

.warning-icon {
  color: var(--icon-warning);
}

.error-icon {
  color: var(--icon-error);
}

.issue-icon {
  color: var(--sys-color-primary);
}

.info-icon,
.warning-icon,
.error-icon,
.issue-icon {
  margin-right: var(--sys-size-8);
  width: var(--sys-size-8);
  height: var(--sys-size-8);
  flex-shrink: 0;
}

.infobar-info-actions {
  display: flex;
  gap: var(--sys-size-5);
}

.devtools-link.text-button:hover,
.devtools-link.text-button:focus,
.devtools-link.text-button:active {
  background-color: transparent;
  box-shadow: none;
}

details {
  margin-right: auto;

  summary {
    display: flex;
    min-height: var(--summary-header-height);

    &:focus-visible {
      outline: var(--sys-color-state-focus-ring) auto var(--sys-size-1);
      outline-offset: var(--sys-size-3);
    }

    &::marker {
      content: '';
    }
  }

  devtools-icon[name="arrow-drop-down"] {
    align-self: center;
    transform: rotate(270deg);
  }

  &[open] {
    devtools-icon[name="arrow-drop-down"] {
      transform: rotate(0deg);
    }

    &::details-content {
      padding: var(--sys-size-4) 0 0 var(--sys-size-9);
    }

  }
}

/*# sourceURL=${import.meta.resolve("./infobar.css")} */`;

// gen/front_end/ui/legacy/Infobar.js
var UIStrings3 = {
  /**
   * @description Text on a button to close the infobar and never show the infobar in the future
   */
  dontShowAgain: "Don't show again",
  /**
   * @description Text to close something
   */
  close: "Close"
};
var str_3 = i18n5.i18n.registerUIStrings("ui/legacy/Infobar.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var Infobar = class _Infobar {
  element;
  shadowRoot;
  contentElement;
  detailsRows;
  infoContainer;
  infoMessage;
  infoText;
  actionContainer;
  disableSetting;
  closeButton;
  closeCallback;
  parentView;
  mainRow;
  constructor(type, text, actions, disableSetting, jslogContext) {
    this.element = document.createElement("div");
    if (jslogContext) {
      this.element.setAttribute("jslog", `${VisualLogging3.dialog(jslogContext).track({ resize: true, keydown: "Enter|Escape" })}`);
    }
    this.element.classList.add("flex-none");
    this.shadowRoot = createShadowRootWithCoreStyles(this.element, { cssFile: infobar_css_default });
    this.contentElement = this.shadowRoot.createChild("div", "infobar infobar-" + type);
    const icon = IconButton.Icon.create(TYPE_TO_ICON[type], type + "-icon");
    this.contentElement.createChild("div", "icon-container").appendChild(icon);
    this.mainRow = this.contentElement.createChild("div", "infobar-main-row");
    this.infoContainer = this.mainRow.createChild("div", "infobar-info-container");
    this.infoMessage = this.infoContainer.createChild("div", "infobar-info-message");
    this.infoText = this.infoMessage.createChild("div", "infobar-info-text");
    this.infoText.textContent = text;
    markAsAlert(this.infoText);
    this.actionContainer = this.infoContainer.createChild("div", "infobar-info-actions");
    let defaultActionButtonVariant = "outlined";
    this.disableSetting = disableSetting || null;
    if (disableSetting) {
      const disableButton = createTextButton(i18nString3(UIStrings3.dontShowAgain), this.onDisable.bind(this), { className: "infobar-button", jslogContext: "dont-show-again" });
      this.actionContainer.appendChild(disableButton);
      defaultActionButtonVariant = "tonal";
    }
    if (actions) {
      this.contentElement.setAttribute("role", "group");
      for (const action6 of actions) {
        const actionCallback = this.actionCallbackFactory(action6);
        const buttonVariant = action6.buttonVariant ?? defaultActionButtonVariant;
        const button = createTextButton(action6.text, actionCallback, {
          className: "infobar-button",
          jslogContext: action6.jslogContext,
          variant: buttonVariant
        });
        this.actionContainer.appendChild(button);
      }
    }
    this.closeButton = this.contentElement.createChild("dt-close-button", "icon-container");
    this.closeButton.setTabbable(true);
    this.closeButton.setSize(
      "SMALL"
      /* Buttons.Button.Size.SMALL */
    );
    setDescription(this.closeButton, i18nString3(UIStrings3.close));
    self.onInvokeElement(this.closeButton, this.dispose.bind(this));
    if (type !== "issue") {
      this.contentElement.tabIndex = 0;
    }
    setLabel(this.contentElement, text);
    this.contentElement.addEventListener("keydown", (event) => {
      if (event.keyCode === Keys.Esc.code) {
        this.dispose();
        event.consume();
        return;
      }
    });
    this.closeCallback = null;
  }
  static create(type, text, actions, disableSetting, jslogContext) {
    if (disableSetting?.get()) {
      return null;
    }
    return new _Infobar(type, text, actions, disableSetting, jslogContext);
  }
  dispose() {
    this.element.remove();
    this.onResize();
    if (this.closeCallback) {
      this.closeCallback.call(null);
    }
  }
  setText(text) {
    this.infoText.textContent = text;
    this.onResize();
  }
  setCloseCallback(callback) {
    this.closeCallback = callback;
  }
  setParentView(parentView) {
    this.parentView = parentView;
  }
  actionCallbackFactory(action6) {
    if (!action6.delegate) {
      return action6.dismiss ? this.dispose.bind(this) : () => {
      };
    }
    if (!action6.dismiss) {
      return action6.delegate;
    }
    return (() => {
      if (action6.delegate) {
        action6.delegate();
      }
      this.dispose();
    }).bind(this);
  }
  onResize() {
    if (this.parentView) {
      this.parentView.doResize();
    }
  }
  onDisable() {
    if (this.disableSetting) {
      this.disableSetting.set(true);
    }
    this.dispose();
  }
  createDetailsRowMessage(message) {
    if (!this.detailsRows) {
      const details = document.createElement("details");
      const summary = details.createChild("summary");
      const triangleIcon = IconButton.Icon.create("arrow-drop-down");
      summary.createChild("div", "icon-container").appendChild(triangleIcon);
      this.contentElement.insertBefore(details, this.mainRow);
      summary.appendChild(this.mainRow);
      this.detailsRows = details.createChild("div", "infobar-details-rows");
    }
    const infobarDetailsRow = this.detailsRows.createChild("div", "infobar-details-row");
    const detailsRowMessage = infobarDetailsRow.createChild("span", "infobar-row-message");
    if (typeof message === "string") {
      detailsRowMessage.textContent = message;
    } else {
      detailsRowMessage.appendChild(message);
    }
    return detailsRowMessage;
  }
};
var TYPE_TO_ICON = {
  [
    "warning"
    /* Type.WARNING */
  ]: "warning",
  [
    "info"
    /* Type.INFO */
  ]: "info",
  [
    "issue"
    /* Type.ISSUE */
  ]: "issue-text-filled",
  [
    "error"
    /* Type.ERROR */
  ]: "cross-circle"
};

// gen/front_end/ui/legacy/SplitWidget.js
var SplitWidget_exports = {};
__export(SplitWidget_exports, {
  SplitWidget: () => SplitWidget,
  SplitWidgetElement: () => SplitWidgetElement
});
import * as Common7 from "./../../core/common/common.js";
import * as Platform6 from "./../../core/platform/platform.js";
import * as Geometry2 from "./../../models/geometry/geometry.js";
import * as VisualLogging4 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/ResizerWidget.js
var ResizerWidget_exports = {};
__export(ResizerWidget_exports, {
  ResizerWidget: () => ResizerWidget,
  SimpleResizerWidget: () => SimpleResizerWidget
});
import * as Common5 from "./../../core/common/common.js";
var ResizerWidget = class extends Common5.ObjectWrapper.ObjectWrapper {
  #isEnabled = true;
  #elements = /* @__PURE__ */ new Set();
  #installDragOnMouseDownBound;
  #cursor = "nwse-resize";
  #startX;
  #startY;
  constructor() {
    super();
    this.#installDragOnMouseDownBound = this.#installDragOnMouseDown.bind(this);
  }
  isEnabled() {
    return this.#isEnabled;
  }
  setEnabled(enabled) {
    this.#isEnabled = enabled;
    this.updateElementCursors();
  }
  elements() {
    return [...this.#elements];
  }
  addElement(element) {
    if (!this.#elements.has(element)) {
      this.#elements.add(element);
      element.addEventListener("pointerdown", this.#installDragOnMouseDownBound, false);
      this.#updateElementCursor(element);
    }
  }
  removeElement(element) {
    if (this.#elements.has(element)) {
      this.#elements.delete(element);
      element.removeEventListener("pointerdown", this.#installDragOnMouseDownBound, false);
      element.style.removeProperty("cursor");
    }
  }
  updateElementCursors() {
    this.#elements.forEach(this.#updateElementCursor.bind(this));
  }
  #updateElementCursor(element) {
    if (this.#isEnabled) {
      element.style.setProperty("cursor", this.cursor());
      element.style.setProperty("touch-action", "none");
    } else {
      element.style.removeProperty("cursor");
      element.style.removeProperty("touch-action");
    }
  }
  cursor() {
    return this.#cursor;
  }
  setCursor(cursor) {
    this.#cursor = cursor;
    this.updateElementCursors();
  }
  #installDragOnMouseDown(event) {
    const element = event.target;
    if (!this.#elements.has(element)) {
      return false;
    }
    elementDragStart(element, this.#dragStart.bind(this), (event2) => {
      this.#drag(event2);
    }, this.#dragEnd.bind(this), this.cursor(), event);
    return void 0;
  }
  #dragStart(event) {
    if (!this.#isEnabled) {
      return false;
    }
    this.#startX = event.pageX;
    this.#startY = event.pageY;
    this.sendDragStart(this.#startX, this.#startY);
    return true;
  }
  sendDragStart(x, y) {
    this.dispatchEventToListeners("ResizeStart", { startX: x, currentX: x, startY: y, currentY: y });
  }
  #drag(event) {
    if (!this.#isEnabled) {
      this.#dragEnd(event);
      return true;
    }
    this.sendDragMove(this.#startX, event.pageX, this.#startY, event.pageY, event.shiftKey);
    event.preventDefault();
    return false;
  }
  sendDragMove(startX, currentX, startY, currentY, shiftKey) {
    this.dispatchEventToListeners("ResizeUpdateXY", { startX, currentX, startY, currentY, shiftKey });
  }
  #dragEnd(_event) {
    this.dispatchEventToListeners(
      "ResizeEnd"
      /* Events.RESIZE_END */
    );
    this.#startX = void 0;
    this.#startY = void 0;
  }
};
var SimpleResizerWidget = class extends ResizerWidget {
  #isVertical = true;
  isVertical() {
    return this.#isVertical;
  }
  /**
   * Vertical widget resizes height (along y-axis).
   */
  setVertical(vertical) {
    this.#isVertical = vertical;
    this.updateElementCursors();
  }
  cursor() {
    return this.#isVertical ? "ns-resize" : "ew-resize";
  }
  sendDragStart(x, y) {
    const position = this.#isVertical ? y : x;
    this.dispatchEventToListeners("ResizeStart", { startPosition: position, currentPosition: position });
  }
  sendDragMove(startX, currentX, startY, currentY, shiftKey) {
    if (this.#isVertical) {
      this.dispatchEventToListeners("ResizeUpdatePosition", { startPosition: startY, currentPosition: currentY, shiftKey });
    } else {
      this.dispatchEventToListeners("ResizeUpdatePosition", { startPosition: startX, currentPosition: currentX, shiftKey });
    }
  }
};

// gen/front_end/ui/legacy/splitWidget.css.js
var splitWidget_css_default = `/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

.shadow-split-widget {
  display: flex;
  overflow: hidden;
}

.shadow-split-widget-contents {
  display: flex;
  position: relative;
  flex-direction: column;
  contain: layout size style;
}

.shadow-split-widget-sidebar {
  flex: none;
}

.shadow-split-widget-main,
.shadow-split-widget-sidebar.maximized {
  flex: auto;
}

.shadow-split-widget.hbox > .shadow-split-widget-resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  z-index: 4000;
}

.shadow-split-widget.vbox > .shadow-split-widget-resizer {
  position: absolute;
  left: 0;
  right: 0;
  height: 6px;
  z-index: 4000;
}

.shadow-split-widget.vbox > .shadow-split-widget-sidebar.no-default-splitter {
  border: 0 !important; /* stylelint-disable-line declaration-no-important */
}

.shadow-split-widget.vbox > .shadow-split-widget-sidebar:not(.maximized) {
  border: 0;
  border-top: 1px solid var(--sys-color-divider);
}

.shadow-split-widget.hbox > .shadow-split-widget-sidebar:not(.maximized) {
  border: 0;
  border-left: 1px solid var(--sys-color-divider);
}

.shadow-split-widget.vbox > .shadow-split-widget-sidebar:first-child:not(.maximized) {
  border: 0;
  border-bottom: 1px solid var(--sys-color-divider);
}

.shadow-split-widget.hbox > .shadow-split-widget-sidebar:first-child:not(.maximized) {
  border: 0;
  border-right: 1px solid var(--sys-color-divider);
}

:host-context(.disable-resizer-for-elements-hack) .shadow-split-widget-resizer {
  pointer-events: none;
}

:host {
  display: flex;
}

/*# sourceURL=${import.meta.resolve("./splitWidget.css")} */`;

// gen/front_end/ui/legacy/Widget.js
var Widget_exports = {};
__export(Widget_exports, {
  HBox: () => HBox,
  VBox: () => VBox,
  VBoxWithResizeCallback: () => VBoxWithResizeCallback,
  Widget: () => Widget,
  WidgetConfig: () => WidgetConfig,
  WidgetElement: () => WidgetElement,
  WidgetFocusRestorer: () => WidgetFocusRestorer,
  widgetConfig: () => widgetConfig,
  widgetRef: () => widgetRef
});
import "./../../core/dom_extension/dom_extension.js";
import * as Platform5 from "./../../core/platform/platform.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as Lit from "./../lit/lit.js";

// gen/front_end/ui/legacy/DOMUtilities.js
var DOMUtilities_exports = {};
__export(DOMUtilities_exports, {
  appendStyle: () => appendStyle,
  deepActiveElement: () => deepActiveElement,
  getEnclosingShadowRootForNode: () => getEnclosingShadowRootForNode,
  rangeOfWord: () => rangeOfWord
});
function deepActiveElement(doc) {
  let activeElement = doc.activeElement;
  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement;
  }
  return activeElement;
}
function getEnclosingShadowRootForNode(node) {
  let parentNode = node.parentNodeOrShadowHost();
  while (parentNode) {
    if (parentNode instanceof ShadowRoot) {
      return parentNode;
    }
    parentNode = parentNode.parentNodeOrShadowHost();
  }
  return null;
}
function rangeOfWord(rootNode, offset, stopCharacters, stayWithinNode, direction) {
  let startNode;
  let startOffset = 0;
  let endNode;
  let endOffset = 0;
  if (!stayWithinNode) {
    stayWithinNode = rootNode;
  }
  if (!direction || direction === "backward" || direction === "both") {
    let node = rootNode;
    while (node) {
      if (node === stayWithinNode) {
        if (!startNode) {
          startNode = stayWithinNode;
        }
        break;
      }
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue !== null) {
        const start = node === rootNode ? offset - 1 : node.nodeValue.length - 1;
        for (let i = start; i >= 0; --i) {
          if (stopCharacters.indexOf(node.nodeValue[i]) !== -1) {
            startNode = node;
            startOffset = i + 1;
            break;
          }
        }
      }
      if (startNode) {
        break;
      }
      node = node.traversePreviousNode(stayWithinNode);
    }
    if (!startNode) {
      startNode = stayWithinNode;
      startOffset = 0;
    }
  } else {
    startNode = rootNode;
    startOffset = offset;
  }
  if (!direction || direction === "forward" || direction === "both") {
    let node = rootNode;
    while (node) {
      if (node === stayWithinNode) {
        if (!endNode) {
          endNode = stayWithinNode;
        }
        break;
      }
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue !== null) {
        const start = node === rootNode ? offset : 0;
        for (let i = start; i < node.nodeValue.length; ++i) {
          if (stopCharacters.indexOf(node.nodeValue[i]) !== -1) {
            endNode = node;
            endOffset = i;
            break;
          }
        }
      }
      if (endNode) {
        break;
      }
      node = node.traverseNextNode(stayWithinNode);
    }
    if (!endNode) {
      endNode = stayWithinNode;
      endOffset = stayWithinNode.nodeType === Node.TEXT_NODE ? stayWithinNode.nodeValue?.length || 0 : stayWithinNode.childNodes.length;
    }
  } else {
    endNode = rootNode;
    endOffset = offset;
  }
  if (!rootNode.ownerDocument) {
    throw new Error("No `ownerDocument` found for rootNode");
  }
  const result = rootNode.ownerDocument.createRange();
  result.setStart(startNode, startOffset);
  result.setEnd(endNode, endOffset);
  return result;
}
function appendStyle(node, ...styles) {
  for (const cssText of styles) {
    const style = (node.ownerDocument ?? document).createElement("style");
    style.textContent = cssText;
    node.appendChild(style);
  }
}

// gen/front_end/ui/legacy/Widget.js
var originalAppendChild = Element.prototype.appendChild;
var originalInsertBefore = Element.prototype.insertBefore;
var originalRemoveChild = Element.prototype.removeChild;
var originalRemoveChildren = Element.prototype.removeChildren;
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
var WidgetConfig = class {
  widgetClass;
  widgetParams;
  constructor(widgetClass, widgetParams) {
    this.widgetClass = widgetClass;
    this.widgetParams = widgetParams;
  }
};
function widgetConfig(widgetClass, widgetParams) {
  return new WidgetConfig(widgetClass, widgetParams);
}
var currentUpdateQueue = null;
var currentlyProcessed = /* @__PURE__ */ new Set();
var nextUpdateQueue = /* @__PURE__ */ new Map();
var pendingAnimationFrame = null;
function enqueueIntoNextUpdateQueue(widget) {
  const scheduledUpdate = nextUpdateQueue.get(widget) ?? Promise.withResolvers();
  nextUpdateQueue.delete(widget);
  nextUpdateQueue.set(widget, scheduledUpdate);
  if (pendingAnimationFrame === null) {
    pendingAnimationFrame = requestAnimationFrame(runNextUpdate);
  }
  return scheduledUpdate.promise;
}
function enqueueWidgetUpdate(widget) {
  if (currentUpdateQueue) {
    if (currentlyProcessed.has(widget)) {
      return enqueueIntoNextUpdateQueue(widget);
    }
    const scheduledUpdate = currentUpdateQueue.get(widget) ?? Promise.withResolvers();
    currentUpdateQueue.delete(widget);
    currentUpdateQueue.set(widget, scheduledUpdate);
    return scheduledUpdate.promise;
  }
  return enqueueIntoNextUpdateQueue(widget);
}
function cancelUpdate(widget) {
  if (currentUpdateQueue) {
    const scheduledUpdate2 = currentUpdateQueue.get(widget);
    if (scheduledUpdate2) {
      scheduledUpdate2.resolve();
      currentUpdateQueue.delete(widget);
    }
  }
  const scheduledUpdate = nextUpdateQueue.get(widget);
  if (scheduledUpdate) {
    scheduledUpdate.resolve();
    nextUpdateQueue.delete(widget);
  }
}
function runNextUpdate() {
  pendingAnimationFrame = null;
  if (!currentUpdateQueue) {
    currentUpdateQueue = nextUpdateQueue;
    nextUpdateQueue = /* @__PURE__ */ new Map();
  }
  for (const [widget, { resolve }] of currentUpdateQueue) {
    currentlyProcessed.add(widget);
    void (async () => {
      await widget.performUpdate();
      resolve();
    })();
  }
  currentUpdateQueue.clear();
  queueMicrotask(() => {
    if (currentUpdateQueue && currentUpdateQueue.size > 0) {
      runNextUpdate();
    } else {
      currentUpdateQueue = null;
      currentlyProcessed.clear();
    }
  });
}
var WidgetElement = class extends HTMLElement {
  #widgetClass;
  #widgetParams;
  createWidget() {
    const widget = this.#instantiateWidget();
    if (this.#widgetParams) {
      Object.assign(widget, this.#widgetParams);
    }
    widget.requestUpdate();
    return widget;
  }
  #instantiateWidget() {
    if (!this.#widgetClass) {
      throw new Error("No widgetClass defined");
    }
    if (Widget.isPrototypeOf(this.#widgetClass)) {
      const ctor = this.#widgetClass;
      return new ctor(this);
    }
    const factory = this.#widgetClass;
    return factory(this);
  }
  set widgetConfig(config) {
    const widget = Widget.get(this);
    if (widget) {
      let needsUpdate = false;
      for (const key in config.widgetParams) {
        if (config.widgetParams.hasOwnProperty(key) && config.widgetParams[key] !== this.#widgetParams?.[key]) {
          needsUpdate = true;
        }
      }
      if (needsUpdate) {
        Object.assign(widget, config.widgetParams);
        widget.requestUpdate();
      }
    }
    this.#widgetClass = config.widgetClass;
    this.#widgetParams = config.widgetParams;
  }
  getWidget() {
    return Widget.get(this);
  }
  connectedCallback() {
    const widget = Widget.getOrCreateWidget(this);
    if (!widget.element.parentElement) {
      widget.markAsRoot();
    }
    widget.show(
      this.parentElement,
      void 0,
      /* suppressOrphanWidgetError= */
      true
    );
  }
  disconnectedCallback() {
    const widget = Widget.get(this);
    if (widget) {
      widget.setHideOnDetach();
      widget.detach();
    }
  }
  appendChild(child) {
    if (child instanceof HTMLElement && child.tagName !== "STYLE") {
      Widget.getOrCreateWidget(child).show(this);
      return child;
    }
    return super.appendChild(child);
  }
  insertBefore(child, referenceChild) {
    if (child instanceof HTMLElement && child.tagName !== "STYLE") {
      Widget.getOrCreateWidget(child).show(this, referenceChild, true);
      return child;
    }
    return super.insertBefore(child, referenceChild);
  }
  removeChild(child) {
    const childWidget = Widget.get(child);
    if (childWidget) {
      childWidget.detach();
      return child;
    }
    return super.removeChild(child);
  }
  removeChildren() {
    for (const child of this.children) {
      const childWidget = Widget.get(child);
      if (childWidget) {
        childWidget.detach();
      }
    }
    super.removeChildren();
  }
  cloneNode(deep) {
    const clone = cloneCustomElement(this, deep);
    if (!this.#widgetClass) {
      throw new Error("No widgetClass defined");
    }
    clone.widgetConfig = {
      widgetClass: this.#widgetClass,
      widgetParams: this.#widgetParams
    };
    return clone;
  }
};
customElements.define("devtools-widget", WidgetElement);
function widgetRef(type, callback) {
  return Lit.Directives.ref((e) => {
    if (!(e instanceof HTMLElement)) {
      return;
    }
    const widget = Widget.getOrCreateWidget(e);
    if (!(widget instanceof type)) {
      throw new Error(`Expected an element with a widget of type ${type.name} but got ${e?.constructor?.name}`);
    }
    callback(widget);
  });
}
var widgetCounterMap = /* @__PURE__ */ new WeakMap();
var widgetMap = /* @__PURE__ */ new WeakMap();
function incrementWidgetCounter(parentElement, childElement) {
  const count = (widgetCounterMap.get(childElement) || 0) + (widgetMap.get(childElement) ? 1 : 0);
  for (let el = parentElement; el; el = el.parentElementOrShadowHost()) {
    widgetCounterMap.set(el, (widgetCounterMap.get(el) || 0) + count);
  }
}
function decrementWidgetCounter(parentElement, childElement) {
  const count = (widgetCounterMap.get(childElement) || 0) + (widgetMap.get(childElement) ? 1 : 0);
  for (let el = parentElement; el; el = el.parentElementOrShadowHost()) {
    const elCounter = widgetCounterMap.get(el);
    if (elCounter) {
      widgetCounterMap.set(el, elCounter - count);
    }
  }
}
var UPDATE_COMPLETE = Promise.resolve();
var Widget = class _Widget {
  element;
  contentElement;
  #shadowRoot;
  #visible = false;
  #isRoot = false;
  #isShowing = false;
  #children = [];
  #hideOnDetach = false;
  #notificationDepth = 0;
  #invalidationsSuspended = 0;
  #parentWidget = null;
  #cachedConstraints;
  #constraints;
  #invalidationsRequested;
  #externallyManaged;
  #updateComplete = UPDATE_COMPLETE;
  constructor(elementOrOptions, options) {
    if (elementOrOptions instanceof HTMLElement) {
      this.element = elementOrOptions;
    } else {
      this.element = document.createElement("div");
      if (elementOrOptions !== void 0) {
        options = elementOrOptions;
      }
    }
    this.#shadowRoot = this.element.shadowRoot;
    if (options?.useShadowDom && !this.#shadowRoot) {
      this.element.classList.add("vbox");
      this.element.classList.add("flex-auto");
      this.#shadowRoot = createShadowRootWithCoreStyles(this.element, {
        delegatesFocus: options?.delegatesFocus
      });
      this.contentElement = document.createElement("div");
      this.#shadowRoot.appendChild(this.contentElement);
    } else {
      this.contentElement = this.element;
    }
    if (options?.classes) {
      this.element.classList.add(...options.classes);
    }
    if (options?.jslog) {
      this.contentElement.setAttribute("jslog", options.jslog);
    }
    this.contentElement.classList.add("widget");
    widgetMap.set(this.element, this);
  }
  /**
   * Returns the {@link Widget} whose element is the given `node`, or `undefined`
   * if the `node` is not an element for a widget.
   *
   * @param node a DOM node.
   * @returns the {@link Widget} that is attached to the `node` or `undefined`.
   */
  static get(node) {
    return widgetMap.get(node);
  }
  static getOrCreateWidget(element) {
    const widget = _Widget.get(element);
    if (widget) {
      return widget;
    }
    if (element instanceof WidgetElement) {
      return element.createWidget();
    }
    return new _Widget(element);
  }
  markAsRoot() {
    assert(!this.element.parentElement, "Attempt to mark as root attached node");
    this.#isRoot = true;
  }
  parentWidget() {
    return this.#parentWidget;
  }
  children() {
    return this.#children;
  }
  childWasDetached(_widget) {
  }
  isShowing() {
    return this.#isShowing;
  }
  shouldHideOnDetach() {
    if (!this.element.parentElement) {
      return false;
    }
    if (this.#hideOnDetach) {
      return true;
    }
    for (const child of this.#children) {
      if (child.shouldHideOnDetach()) {
        return true;
      }
    }
    return false;
  }
  setHideOnDetach() {
    this.#hideOnDetach = true;
  }
  inNotification() {
    return Boolean(this.#notificationDepth) || Boolean(this.#parentWidget?.inNotification());
  }
  parentIsShowing() {
    if (this.#isRoot) {
      return true;
    }
    return this.#parentWidget?.isShowing() ?? false;
  }
  callOnVisibleChildren(method) {
    const copy = this.#children.slice();
    for (let i = 0; i < copy.length; ++i) {
      if (copy[i].#parentWidget === this && copy[i].#visible) {
        method.call(copy[i]);
      }
    }
  }
  processWillShow() {
    this.callOnVisibleChildren(this.processWillShow);
    this.#isShowing = true;
  }
  processWasShown() {
    if (this.inNotification()) {
      return;
    }
    this.restoreScrollPositions();
    this.notify(this.wasShown);
    this.callOnVisibleChildren(this.processWasShown);
  }
  processWillHide() {
    if (this.inNotification()) {
      return;
    }
    this.storeScrollPositions();
    this.callOnVisibleChildren(this.processWillHide);
    this.notify(this.willHide);
    this.#isShowing = false;
  }
  processWasHidden() {
    this.callOnVisibleChildren(this.processWasHidden);
    this.notify(this.wasHidden);
  }
  processOnResize() {
    if (this.inNotification()) {
      return;
    }
    if (!this.isShowing()) {
      return;
    }
    this.notify(this.onResize);
    this.callOnVisibleChildren(this.processOnResize);
  }
  notify(notification) {
    ++this.#notificationDepth;
    try {
      notification.call(this);
    } finally {
      --this.#notificationDepth;
    }
  }
  wasShown() {
  }
  willHide() {
  }
  wasHidden() {
  }
  onResize() {
  }
  onLayout() {
  }
  onDetach() {
  }
  async ownerViewDisposed() {
  }
  show(parentElement, insertBefore, suppressOrphanWidgetError = false) {
    assert(parentElement, "Attempt to attach widget with no parent element");
    if (!this.#isRoot) {
      let currentParent = parentElement;
      let currentWidget = void 0;
      while (!currentWidget) {
        if (!currentParent) {
          if (suppressOrphanWidgetError) {
            this.#isRoot = true;
            this.show(parentElement, insertBefore);
            return;
          }
          throw new Error("Attempt to attach widget to orphan node");
        }
        currentWidget = widgetMap.get(currentParent);
        currentParent = currentParent.parentElementOrShadowHost();
      }
      this.attach(currentWidget);
    }
    this.#showWidget(parentElement, insertBefore);
  }
  attach(parentWidget) {
    if (parentWidget === this.#parentWidget) {
      return;
    }
    if (this.#parentWidget) {
      this.detach();
    }
    this.#parentWidget = parentWidget;
    this.#parentWidget.#children.push(this);
    this.#isRoot = false;
  }
  showWidget() {
    if (this.#visible) {
      return;
    }
    if (!this.element.parentElement) {
      throw new Error("Attempt to show widget that is not hidden using hideWidget().");
    }
    this.#showWidget(this.element.parentElement, this.element.nextSibling);
  }
  #showWidget(parentElement, insertBefore) {
    let currentParent = parentElement;
    while (currentParent && !widgetMap.get(currentParent)) {
      currentParent = currentParent.parentElementOrShadowHost();
    }
    if (this.#isRoot) {
      assert(!currentParent, "Attempt to show root widget under another widget");
    } else {
      assert(currentParent && widgetMap.get(currentParent) === this.#parentWidget, "Attempt to show under node belonging to alien widget");
    }
    const wasVisible = this.#visible;
    if (wasVisible && this.element.parentElement === parentElement) {
      return;
    }
    this.#visible = true;
    if (!wasVisible && this.parentIsShowing()) {
      this.processWillShow();
    }
    this.element.classList.remove("hidden");
    if (this.element.parentElement !== parentElement) {
      if (!this.#externallyManaged) {
        incrementWidgetCounter(parentElement, this.element);
      }
      if (insertBefore) {
        originalInsertBefore.call(parentElement, this.element, insertBefore);
      } else {
        originalAppendChild.call(parentElement, this.element);
      }
    }
    const focusedElementsCount = this.#parentWidget?.getDefaultFocusedElements?.()?.length ?? 0;
    if (this.element.hasAttribute("autofocus") && focusedElementsCount > 1) {
      this.element.removeAttribute("autofocus");
    }
    if (!wasVisible && this.parentIsShowing()) {
      this.processWasShown();
    }
    if (this.#parentWidget && this.hasNonZeroConstraints()) {
      this.#parentWidget.invalidateConstraints();
    } else {
      this.processOnResize();
    }
  }
  hideWidget() {
    if (!this.#visible) {
      return;
    }
    this.#hideWidget(false);
  }
  #hideWidget(removeFromDOM) {
    this.#visible = false;
    const { parentElement } = this.element;
    if (this.parentIsShowing()) {
      this.processWillHide();
    }
    if (removeFromDOM) {
      if (parentElement) {
        decrementWidgetCounter(parentElement, this.element);
        originalRemoveChild.call(parentElement, this.element);
      }
      this.onDetach();
    } else {
      this.element.classList.add("hidden");
    }
    if (this.parentIsShowing()) {
      this.processWasHidden();
    }
    if (this.#parentWidget && this.hasNonZeroConstraints()) {
      this.#parentWidget.invalidateConstraints();
    }
  }
  detach(overrideHideOnDetach) {
    if (!this.#parentWidget && !this.#isRoot) {
      return;
    }
    cancelUpdate(this);
    const removeFromDOM = overrideHideOnDetach || !this.shouldHideOnDetach();
    if (this.#visible) {
      this.#hideWidget(removeFromDOM);
    } else if (removeFromDOM) {
      const { parentElement } = this.element;
      if (parentElement) {
        decrementWidgetCounter(parentElement, this.element);
        originalRemoveChild.call(parentElement, this.element);
      }
    }
    if (this.#parentWidget) {
      const childIndex = this.#parentWidget.#children.indexOf(this);
      assert(childIndex >= 0, "Attempt to remove non-child widget");
      this.#parentWidget.#children.splice(childIndex, 1);
      this.#parentWidget.childWasDetached(this);
      this.#parentWidget = null;
    } else {
      assert(this.#isRoot, "Removing non-root widget from DOM");
    }
  }
  detachChildWidgets() {
    const children = this.#children.slice();
    for (let i = 0; i < children.length; ++i) {
      children[i].detach();
    }
  }
  elementsToRestoreScrollPositionsFor() {
    return [this.element];
  }
  storeScrollPositions() {
    const elements = this.elementsToRestoreScrollPositionsFor();
    for (const container of elements) {
      storedScrollPositions.set(container, { scrollLeft: container.scrollLeft, scrollTop: container.scrollTop });
    }
  }
  restoreScrollPositions() {
    const elements = this.elementsToRestoreScrollPositionsFor();
    for (const container of elements) {
      const storedPositions = storedScrollPositions.get(container);
      if (storedPositions) {
        container.scrollLeft = storedPositions.scrollLeft;
        container.scrollTop = storedPositions.scrollTop;
      }
    }
  }
  doResize() {
    if (!this.isShowing()) {
      return;
    }
    if (!this.inNotification()) {
      this.callOnVisibleChildren(this.processOnResize);
    }
  }
  doLayout() {
    if (!this.isShowing()) {
      return;
    }
    this.notify(this.onLayout);
    this.doResize();
  }
  registerRequiredCSS(...cssFiles) {
    for (const cssFile of cssFiles) {
      appendStyle(this.#shadowRoot ?? this.element, cssFile);
    }
  }
  // Unused, but useful for debugging.
  printWidgetHierarchy() {
    const lines = [];
    this.collectWidgetHierarchy("", lines);
    console.log(lines.join("\n"));
  }
  collectWidgetHierarchy(prefix, lines) {
    lines.push(prefix + "[" + this.element.className + "]" + (this.#children.length ? " {" : ""));
    for (let i = 0; i < this.#children.length; ++i) {
      this.#children[i].collectWidgetHierarchy(prefix + "    ", lines);
    }
    if (this.#children.length) {
      lines.push(prefix + "}");
    }
  }
  setDefaultFocusedElement(element) {
    const defaultFocusedElement = this.getDefaultFocusedElement();
    if (defaultFocusedElement) {
      defaultFocusedElement.removeAttribute("autofocus");
    }
    if (element) {
      element.setAttribute("autofocus", "");
    }
  }
  setDefaultFocusedChild(child) {
    assert(child.#parentWidget === this, "Attempt to set non-child widget as default focused.");
    const defaultFocusedElement = this.getDefaultFocusedElement();
    if (defaultFocusedElement) {
      defaultFocusedElement.removeAttribute("autofocus");
    }
    child.element.setAttribute("autofocus", "");
  }
  getDefaultFocusedElements() {
    const autofocusElements = [...this.contentElement.querySelectorAll("[autofocus]")];
    if (this.contentElement !== this.element) {
      if (this.contentElement.hasAttribute("autofocus")) {
        autofocusElements.push(this.contentElement);
      }
      if (autofocusElements.length === 0) {
        autofocusElements.push(...this.element.querySelectorAll("[autofocus]"));
      }
    }
    return autofocusElements.filter((autofocusElement) => {
      let widgetElement = autofocusElement;
      while (widgetElement) {
        const widget = _Widget.get(widgetElement);
        if (widget) {
          if (widgetElement === autofocusElement && widget.#parentWidget === this && widget.#visible) {
            return true;
          }
          return widget === this;
        }
        widgetElement = widgetElement.parentElementOrShadowHost();
      }
      return false;
    });
  }
  getDefaultFocusedElement() {
    const elements = this.getDefaultFocusedElements();
    if (elements.length > 1) {
      console.error("Multiple autofocus elements found", this.constructor.name, ...elements.map((e) => Platform5.StringUtilities.trimMiddle(e.outerHTML, 250)));
    }
    return elements[0] || null;
  }
  focus() {
    if (!this.isShowing()) {
      return;
    }
    const autofocusElement = this.getDefaultFocusedElement();
    if (autofocusElement) {
      const widget = _Widget.get(autofocusElement);
      if (widget && widget !== this) {
        widget.focus();
      } else {
        autofocusElement.focus();
      }
      return;
    }
    for (const child of this.#children) {
      if (child.#visible) {
        child.focus();
        return;
      }
    }
    if (this.element === this.contentElement && this.element.hasAttribute("autofocus")) {
      this.element.focus();
    }
  }
  hasFocus() {
    return this.element.hasFocus();
  }
  calculateConstraints() {
    return new Geometry.Constraints();
  }
  constraints() {
    if (typeof this.#constraints !== "undefined") {
      return this.#constraints;
    }
    if (typeof this.#cachedConstraints === "undefined") {
      this.#cachedConstraints = this.calculateConstraints();
    }
    return this.#cachedConstraints;
  }
  setMinimumAndPreferredSizes(width, height, preferredWidth, preferredHeight) {
    this.#constraints = new Geometry.Constraints(new Geometry.Size(width, height), new Geometry.Size(preferredWidth, preferredHeight));
    this.invalidateConstraints();
  }
  setMinimumSize(width, height) {
    this.minimumSize = new Geometry.Size(width, height);
  }
  set minimumSize(size) {
    this.#constraints = new Geometry.Constraints(size);
    this.invalidateConstraints();
  }
  hasNonZeroConstraints() {
    const constraints = this.constraints();
    return Boolean(constraints.minimum.width || constraints.minimum.height || constraints.preferred.width || constraints.preferred.height);
  }
  suspendInvalidations() {
    ++this.#invalidationsSuspended;
  }
  resumeInvalidations() {
    --this.#invalidationsSuspended;
    if (!this.#invalidationsSuspended && this.#invalidationsRequested) {
      this.invalidateConstraints();
    }
  }
  invalidateConstraints() {
    if (this.#invalidationsSuspended) {
      this.#invalidationsRequested = true;
      return;
    }
    this.#invalidationsRequested = false;
    const cached = this.#cachedConstraints;
    this.#cachedConstraints = void 0;
    const actual = this.constraints();
    if (!actual.isEqual(cached || null) && this.#parentWidget) {
      this.#parentWidget.invalidateConstraints();
    } else {
      this.doLayout();
    }
  }
  // Excludes the widget from being tracked by its parents/ancestors via
  // widgetCounter because the widget is being handled by external code.
  // Widgets marked as being externally managed are responsible for
  // finishing out their own lifecycle (i.e. calling detach() before being
  // removed from the DOM). This is e.g. used for CodeMirror.
  //
  // Also note that this must be called before the widget is shown so that
  // so that its ancestor's widgetCounter is not incremented.
  markAsExternallyManaged() {
    assert(!this.#parentWidget, "Attempt to mark widget as externally managed after insertion to the DOM");
    this.#externallyManaged = true;
  }
  /**
   * Override this method in derived classes to perform the actual view update.
   *
   * This is not meant to be called directly, but invoked (indirectly) through
   * the `requestAnimationFrame` and executed with the animation frame. Instead,
   * use the `requestUpdate()` method to schedule an asynchronous update.
   *
   * @returns can either return nothing or a promise; in that latter case, the
   *          update logic will await the resolution of the returned promise
   *          before proceeding.
   */
  performUpdate() {
  }
  /**
   * Schedules an asynchronous update for this widget.
   *
   * The update will be deduplicated and executed with the next animation
   * frame.
   */
  requestUpdate() {
    this.#updateComplete = enqueueWidgetUpdate(this);
  }
  /**
   * The `updateComplete` promise resolves when the widget has finished updating.
   *
   * Use `updateComplete` to wait for an update:
   * ```js
   * await widget.updateComplete;
   * // do stuff
   * ```
   *
   * This method is primarily useful for unit tests, to wait for widgets to build
   * their DOM. For example:
   * ```js
   * // Set up the test widget, and wait for the initial update cycle to complete.
   * const widget = new SomeWidget(someData);
   * widget.requestUpdate();
   * await widget.updateComplete;
   *
   * // Assert state of the widget.
   * assert.isTrue(widget.someDataLoaded);
   * ```
   *
   * @returns a promise that resolves to a `boolean` when the widget has finished
   *          updating, the value is `true` if there are no more pending updates,
   *          and `false` if the update cycle triggered another update.
   */
  get updateComplete() {
    return this.#updateComplete;
  }
};
var storedScrollPositions = /* @__PURE__ */ new WeakMap();
var VBox = class extends Widget {
  constructor() {
    super(...arguments);
    this.contentElement.classList.add("vbox");
  }
  calculateConstraints() {
    let constraints = new Geometry.Constraints();
    function updateForChild() {
      const child = this.constraints();
      constraints = constraints.widthToMax(child);
      constraints = constraints.addHeight(child);
    }
    this.callOnVisibleChildren(updateForChild);
    return constraints;
  }
};
var HBox = class extends Widget {
  constructor() {
    super(...arguments);
    this.contentElement.classList.add("hbox");
  }
  calculateConstraints() {
    let constraints = new Geometry.Constraints();
    function updateForChild() {
      const child = this.constraints();
      constraints = constraints.addWidth(child);
      constraints = constraints.heightToMax(child);
    }
    this.callOnVisibleChildren(updateForChild);
    return constraints;
  }
};
var VBoxWithResizeCallback = class extends VBox {
  resizeCallback;
  constructor(resizeCallback) {
    super();
    this.resizeCallback = resizeCallback;
  }
  onResize() {
    this.resizeCallback();
  }
};
var WidgetFocusRestorer = class {
  widget;
  previous;
  constructor(widget) {
    this.widget = widget;
    this.previous = deepActiveElement(widget.element.ownerDocument);
    widget.focus();
  }
  restore() {
    if (!this.widget) {
      return;
    }
    if (this.widget.hasFocus() && this.previous) {
      this.previous.focus();
    }
    this.previous = null;
    this.widget = null;
  }
};
function domOperationError(funcName) {
  return new Error(`Attempt to modify widget with native DOM method \`${funcName}\``);
}
Element.prototype.appendChild = function(node) {
  if (widgetMap.get(node) && node.parentElement !== this) {
    throw domOperationError("appendChild");
  }
  return originalAppendChild.call(this, node);
};
Element.prototype.insertBefore = function(node, child) {
  if (widgetMap.get(node) && node.parentElement !== this) {
    throw domOperationError("insertBefore");
  }
  return originalInsertBefore.call(this, node, child);
};
Element.prototype.removeChild = function(child) {
  if (widgetCounterMap.get(child) || widgetMap.get(child)) {
    throw domOperationError("removeChild");
  }
  return originalRemoveChild.call(this, child);
};
Element.prototype.removeChildren = function() {
  if (widgetCounterMap.get(this)) {
    throw domOperationError("removeChildren");
  }
  return originalRemoveChildren.call(this);
};

// gen/front_end/ui/legacy/ZoomManager.js
var ZoomManager_exports = {};
__export(ZoomManager_exports, {
  ZoomManager: () => ZoomManager
});
import * as Common6 from "./../../core/common/common.js";
var zoomManagerInstance;
var ZoomManager = class _ZoomManager extends Common6.ObjectWrapper.ObjectWrapper {
  frontendHost;
  #zoomFactor;
  constructor(window2, frontendHost) {
    super();
    this.frontendHost = frontendHost;
    this.#zoomFactor = this.frontendHost.zoomFactor();
    window2.addEventListener("resize", this.onWindowResize.bind(this), true);
  }
  static instance(opts = { forceNew: null, win: null, frontendHost: null }) {
    const { forceNew, win, frontendHost } = opts;
    if (!zoomManagerInstance || forceNew) {
      if (!win || !frontendHost) {
        throw new Error(`Unable to create zoom manager: window and frontendHost must be provided: ${new Error().stack}`);
      }
      zoomManagerInstance = new _ZoomManager(win, frontendHost);
    }
    return zoomManagerInstance;
  }
  static removeInstance() {
    zoomManagerInstance = void 0;
  }
  zoomFactor() {
    return this.#zoomFactor;
  }
  cssToDIP(value) {
    return value * this.#zoomFactor;
  }
  dipToCSS(valueDIP) {
    return valueDIP / this.#zoomFactor;
  }
  onWindowResize() {
    const oldZoomFactor = this.#zoomFactor;
    this.#zoomFactor = this.frontendHost.zoomFactor();
    if (oldZoomFactor !== this.#zoomFactor) {
      this.dispatchEventToListeners("ZoomChanged", { from: oldZoomFactor, to: this.#zoomFactor });
    }
  }
};

// gen/front_end/ui/legacy/SplitWidget.js
var SplitWidget = class extends Common7.ObjectWrapper.eventMixin(Widget) {
  #sidebarElement;
  #mainElement;
  #resizerElement;
  #resizerElementSize = null;
  #resizerWidget;
  #defaultSidebarWidth;
  #defaultSidebarHeight;
  #constraintsInDip;
  #resizeStartSizeDIP = 0;
  // TODO: Used in WebTests
  setting;
  #totalSizeCSS = 0;
  #totalSizeOtherDimensionCSS = 0;
  #mainWidget = null;
  #sidebarWidget = null;
  #animationFrameHandle = 0;
  #animationCallback = null;
  #showSidebarButtonTitle = Common7.UIString.LocalizedEmptyString;
  #hideSidebarButtonTitle = Common7.UIString.LocalizedEmptyString;
  #shownSidebarString = Common7.UIString.LocalizedEmptyString;
  #hiddenSidebarString = Common7.UIString.LocalizedEmptyString;
  #showHideSidebarButton = null;
  #isVertical = false;
  #sidebarMinimized = false;
  #detaching = false;
  #sidebarSizeDIP = -1;
  #savedSidebarSizeDIP;
  #secondIsSidebar = false;
  #shouldSaveShowMode = false;
  #savedVerticalMainSize = null;
  #savedHorizontalMainSize = null;
  #showMode = "Both";
  #savedShowMode;
  #autoAdjustOrientation = false;
  constructor(isVertical, secondIsSidebar, settingName, defaultSidebarWidth, defaultSidebarHeight, constraintsInDip, element) {
    super(element, { useShadowDom: true });
    this.element.classList.add("split-widget");
    this.registerRequiredCSS(splitWidget_css_default);
    this.contentElement.classList.add("shadow-split-widget");
    this.#sidebarElement = this.contentElement.createChild("div", "shadow-split-widget-contents shadow-split-widget-sidebar vbox");
    this.#mainElement = this.contentElement.createChild("div", "shadow-split-widget-contents shadow-split-widget-main vbox");
    const mainSlot = this.#mainElement.createChild("slot");
    mainSlot.name = "main";
    mainSlot.addEventListener("slotchange", (_) => {
      const assignedNode = mainSlot.assignedNodes()[0];
      const widget = assignedNode instanceof HTMLElement ? Widget.getOrCreateWidget(assignedNode) : null;
      if (widget && widget !== this.#mainWidget) {
        this.setMainWidget(widget);
      }
    });
    const sidebarSlot = this.#sidebarElement.createChild("slot");
    sidebarSlot.name = "sidebar";
    sidebarSlot.addEventListener("slotchange", (_) => {
      const assignedNode = sidebarSlot.assignedNodes()[0];
      const widget = assignedNode instanceof HTMLElement ? Widget.getOrCreateWidget(assignedNode) : null;
      if (widget && widget !== this.#sidebarWidget) {
        this.setSidebarWidget(widget);
      }
    });
    this.#resizerElement = this.contentElement.createChild("div", "shadow-split-widget-resizer");
    this.#resizerWidget = new SimpleResizerWidget();
    this.#resizerWidget.setEnabled(true);
    this.#resizerWidget.addEventListener("ResizeStart", this.#onResizeStart, this);
    this.#resizerWidget.addEventListener("ResizeUpdatePosition", this.#onResizeUpdate, this);
    this.#resizerWidget.addEventListener("ResizeEnd", this.#onResizeEnd, this);
    this.#defaultSidebarWidth = defaultSidebarWidth || 200;
    this.#defaultSidebarHeight = defaultSidebarHeight || this.#defaultSidebarWidth;
    this.#constraintsInDip = Boolean(constraintsInDip);
    this.setting = settingName ? Common7.Settings.Settings.instance().createSetting(settingName, {}) : null;
    this.#savedSidebarSizeDIP = this.#sidebarSizeDIP;
    this.setSecondIsSidebar(secondIsSidebar);
    this.#setVertical(isVertical);
    this.#savedShowMode = this.#showMode;
    this.installResizer(this.#resizerElement);
  }
  isVertical() {
    return this.#isVertical;
  }
  setVertical(isVertical) {
    if (this.#isVertical === isVertical) {
      return;
    }
    this.#setVertical(isVertical);
    if (this.isShowing()) {
      this.#updateLayout();
    }
  }
  setAutoAdjustOrientation(autoAdjustOrientation) {
    this.#autoAdjustOrientation = autoAdjustOrientation;
    this.#maybeAutoAdjustOrientation();
  }
  #setVertical(isVertical) {
    this.contentElement.classList.toggle("vbox", !isVertical);
    this.contentElement.classList.toggle("hbox", isVertical);
    this.#isVertical = isVertical;
    this.#resizerElementSize = null;
    this.#sidebarSizeDIP = -1;
    this.#restoreSidebarSizeFromSettings();
    if (this.#shouldSaveShowMode) {
      this.#restoreAndApplyShowModeFromSettings();
    }
    this.#updateShowHideSidebarButton();
    this.#resizerWidget.setVertical(!isVertical);
    this.invalidateConstraints();
  }
  #updateLayout(animate) {
    this.#totalSizeCSS = 0;
    this.#totalSizeOtherDimensionCSS = 0;
    this.#mainElement.style.removeProperty("width");
    this.#mainElement.style.removeProperty("height");
    this.#sidebarElement.style.removeProperty("width");
    this.#sidebarElement.style.removeProperty("height");
    this.#setSidebarSizeDIP(this.#preferredSidebarSizeDIP(), Boolean(animate));
  }
  setMainWidget(widget) {
    if (this.#mainWidget === widget) {
      return;
    }
    this.suspendInvalidations();
    if (this.#mainWidget) {
      this.#mainWidget.detach();
    }
    this.#mainWidget = widget;
    if (widget) {
      widget.element.slot = "main";
      if (this.#showMode === "OnlyMain" || this.#showMode === "Both") {
        widget.show(this.element);
      }
    }
    this.resumeInvalidations();
  }
  setSidebarWidget(widget) {
    if (this.#sidebarWidget === widget) {
      return;
    }
    this.suspendInvalidations();
    if (this.#sidebarWidget) {
      this.#sidebarWidget.detach();
    }
    this.#sidebarWidget = widget;
    if (widget) {
      widget.element.slot = "sidebar";
      if (this.#showMode === "OnlySidebar" || this.#showMode === "Both") {
        widget.show(this.element);
      }
    }
    this.resumeInvalidations();
  }
  mainWidget() {
    return this.#mainWidget;
  }
  sidebarWidget() {
    return this.#sidebarWidget;
  }
  sidebarElement() {
    return this.#sidebarElement;
  }
  childWasDetached(widget) {
    if (this.#detaching) {
      return;
    }
    if (this.#mainWidget === widget) {
      this.#mainWidget = null;
    }
    if (this.#sidebarWidget === widget) {
      this.#sidebarWidget = null;
    }
    this.invalidateConstraints();
  }
  isSidebarSecond() {
    return this.#secondIsSidebar;
  }
  enableShowModeSaving() {
    this.#shouldSaveShowMode = true;
    this.#restoreAndApplyShowModeFromSettings();
  }
  showMode() {
    return this.#showMode;
  }
  sidebarIsShowing() {
    return this.#showMode !== "OnlyMain";
  }
  setSecondIsSidebar(secondIsSidebar) {
    if (secondIsSidebar === this.#secondIsSidebar) {
      return;
    }
    this.#secondIsSidebar = secondIsSidebar;
    if (!this.#mainWidget?.shouldHideOnDetach()) {
      if (secondIsSidebar) {
        this.contentElement.insertBefore(this.#mainElement, this.#sidebarElement);
      } else {
        this.contentElement.insertBefore(this.#mainElement, this.#resizerElement);
      }
    } else if (!this.#sidebarWidget?.shouldHideOnDetach()) {
      if (secondIsSidebar) {
        this.contentElement.insertBefore(this.#sidebarElement, this.#resizerElement);
      } else {
        this.contentElement.insertBefore(this.#sidebarElement, this.#mainElement);
      }
    } else {
      console.error("Could not swap split widget side. Both children widgets contain iframes.");
      this.#secondIsSidebar = !secondIsSidebar;
    }
  }
  resizerElement() {
    return this.#resizerElement;
  }
  hideMain(animate) {
    this.#showOnly(this.#sidebarWidget, this.#mainWidget, this.#sidebarElement, this.#mainElement, animate);
    this.#updateShowMode(
      "OnlySidebar"
      /* ShowMode.ONLY_SIDEBAR */
    );
  }
  hideSidebar(animate) {
    this.#showOnly(this.#mainWidget, this.#sidebarWidget, this.#mainElement, this.#sidebarElement, animate);
    this.#updateShowMode(
      "OnlyMain"
      /* ShowMode.ONLY_MAIN */
    );
  }
  setSidebarMinimized(minimized) {
    this.#sidebarMinimized = minimized;
    this.invalidateConstraints();
  }
  isSidebarMinimized() {
    return this.#sidebarMinimized;
  }
  #showOnly(sideToShow, sideToHide, shadowToShow, shadowToHide, animate) {
    this.#cancelAnimation();
    function callback() {
      if (sideToShow) {
        if (sideToShow === this.#mainWidget) {
          this.#mainWidget.show(this.element, this.#sidebarWidget ? this.#sidebarWidget.element : null);
        } else if (this.#sidebarWidget) {
          this.#sidebarWidget.show(this.element);
        }
      }
      if (sideToHide) {
        this.#detaching = true;
        sideToHide.detach();
        this.#detaching = false;
      }
      this.#resizerElement.classList.add("hidden");
      shadowToShow.classList.remove("hidden");
      shadowToShow.classList.add("maximized");
      shadowToHide.classList.add("hidden");
      shadowToHide.classList.remove("maximized");
      this.#removeAllLayoutProperties();
      this.doResize();
      this.showFinishedForTest();
    }
    if (animate) {
      this.#animate(true, callback.bind(this));
    } else {
      callback.call(this);
    }
    this.#sidebarSizeDIP = -1;
    this.setResizable(false);
  }
  showFinishedForTest() {
  }
  #removeAllLayoutProperties() {
    this.#sidebarElement.style.removeProperty("flexBasis");
    this.#mainElement.style.removeProperty("width");
    this.#mainElement.style.removeProperty("height");
    this.#sidebarElement.style.removeProperty("width");
    this.#sidebarElement.style.removeProperty("height");
    this.#resizerElement.style.removeProperty("left");
    this.#resizerElement.style.removeProperty("right");
    this.#resizerElement.style.removeProperty("top");
    this.#resizerElement.style.removeProperty("bottom");
    this.#resizerElement.style.removeProperty("margin-left");
    this.#resizerElement.style.removeProperty("margin-right");
    this.#resizerElement.style.removeProperty("margin-top");
    this.#resizerElement.style.removeProperty("margin-bottom");
  }
  showBoth(animate) {
    if (this.#showMode === "Both") {
      animate = false;
    }
    this.#cancelAnimation();
    this.#mainElement.classList.remove("maximized", "hidden");
    this.#sidebarElement.classList.remove("maximized", "hidden");
    this.#resizerElement.classList.remove("hidden");
    this.setResizable(true);
    this.suspendInvalidations();
    if (this.#sidebarWidget) {
      this.#sidebarWidget.show(this.element);
    }
    if (this.#mainWidget) {
      this.#mainWidget.show(this.element, this.#sidebarWidget ? this.#sidebarWidget.element : null);
    }
    this.resumeInvalidations();
    this.setSecondIsSidebar(this.#secondIsSidebar);
    this.#sidebarSizeDIP = -1;
    this.#updateShowMode(
      "Both"
      /* ShowMode.BOTH */
    );
    this.#updateLayout(animate);
  }
  setResizable(resizable) {
    this.#resizerWidget.setEnabled(resizable);
  }
  // Currently unused
  forceSetSidebarWidth(width) {
    this.#defaultSidebarWidth = width;
    this.#savedSidebarSizeDIP = width;
    this.#updateLayout();
  }
  isResizable() {
    return this.#resizerWidget.isEnabled();
  }
  setSidebarSize(size) {
    const sizeDIP = ZoomManager.instance().cssToDIP(size);
    this.#savedSidebarSizeDIP = sizeDIP;
    this.#saveSetting();
    this.#setSidebarSizeDIP(sizeDIP, false, true);
  }
  sidebarSize() {
    const sizeDIP = Math.max(0, this.#sidebarSizeDIP);
    return ZoomManager.instance().dipToCSS(sizeDIP);
  }
  totalSize() {
    const sizeDIP = Math.max(0, this.#totalSizeDIP());
    return ZoomManager.instance().dipToCSS(sizeDIP);
  }
  /**
   * Returns total size in DIP.
   */
  #totalSizeDIP() {
    if (!this.#totalSizeCSS) {
      this.#totalSizeCSS = this.#isVertical ? this.contentElement.offsetWidth : this.contentElement.offsetHeight;
      this.#totalSizeOtherDimensionCSS = this.#isVertical ? this.contentElement.offsetHeight : this.contentElement.offsetWidth;
    }
    return ZoomManager.instance().cssToDIP(this.#totalSizeCSS);
  }
  #updateShowMode(showMode) {
    this.#showMode = showMode;
    this.#saveShowModeToSettings();
    this.#updateShowHideSidebarButton();
    this.dispatchEventToListeners("ShowModeChanged", showMode);
    this.invalidateConstraints();
  }
  #setSidebarSizeDIP(sizeDIP, animate, userAction) {
    if (this.#showMode !== "Both" || !this.isShowing()) {
      return;
    }
    sizeDIP = this.#applyConstraints(sizeDIP, userAction);
    if (this.#sidebarSizeDIP === sizeDIP) {
      return;
    }
    if (!this.#resizerElementSize) {
      this.#resizerElementSize = this.#isVertical ? this.#resizerElement.offsetWidth : this.#resizerElement.offsetHeight;
    }
    this.#removeAllLayoutProperties();
    const roundSizeCSS = Math.round(ZoomManager.instance().dipToCSS(sizeDIP));
    const sidebarSizeValue = roundSizeCSS + "px";
    const mainSizeValue = this.#totalSizeCSS - roundSizeCSS + "px";
    this.#sidebarElement.style.flexBasis = sidebarSizeValue;
    if (this.#isVertical) {
      this.#sidebarElement.style.width = sidebarSizeValue;
      this.#mainElement.style.width = mainSizeValue;
      this.#sidebarElement.style.height = this.#totalSizeOtherDimensionCSS + "px";
      this.#mainElement.style.height = this.#totalSizeOtherDimensionCSS + "px";
    } else {
      this.#sidebarElement.style.height = sidebarSizeValue;
      this.#mainElement.style.height = mainSizeValue;
      this.#sidebarElement.style.width = this.#totalSizeOtherDimensionCSS + "px";
      this.#mainElement.style.width = this.#totalSizeOtherDimensionCSS + "px";
    }
    if (this.#isVertical) {
      if (this.#secondIsSidebar) {
        this.#resizerElement.style.right = sidebarSizeValue;
        this.#resizerElement.style.marginRight = -this.#resizerElementSize / 2 + "px";
      } else {
        this.#resizerElement.style.left = sidebarSizeValue;
        this.#resizerElement.style.marginLeft = -this.#resizerElementSize / 2 + "px";
      }
    } else if (this.#secondIsSidebar) {
      this.#resizerElement.style.bottom = sidebarSizeValue;
      this.#resizerElement.style.marginBottom = -this.#resizerElementSize / 2 + "px";
    } else {
      this.#resizerElement.style.top = sidebarSizeValue;
      this.#resizerElement.style.marginTop = -this.#resizerElementSize / 2 + "px";
    }
    this.#sidebarSizeDIP = sizeDIP;
    if (animate) {
      this.#animate(false);
    } else {
      this.doResize();
      this.dispatchEventToListeners("SidebarSizeChanged", this.sidebarSize());
    }
  }
  #animate(reverse, callback) {
    const animationTime = 50;
    this.#animationCallback = callback || null;
    let animatedMarginPropertyName;
    if (this.#isVertical) {
      animatedMarginPropertyName = this.#secondIsSidebar ? "margin-right" : "margin-left";
    } else {
      animatedMarginPropertyName = this.#secondIsSidebar ? "margin-bottom" : "margin-top";
    }
    const marginFrom = reverse ? "0" : "-" + ZoomManager.instance().dipToCSS(this.#sidebarSizeDIP) + "px";
    const marginTo = reverse ? "-" + ZoomManager.instance().dipToCSS(this.#sidebarSizeDIP) + "px" : "0";
    this.contentElement.style.setProperty(animatedMarginPropertyName, marginFrom);
    this.contentElement.style.setProperty("overflow", "hidden");
    if (!reverse) {
      suppressUnused(this.#mainElement.offsetWidth);
      suppressUnused(this.#sidebarElement.offsetWidth);
    }
    if (!reverse && this.#sidebarWidget) {
      this.#sidebarWidget.doResize();
    }
    this.contentElement.style.setProperty("transition", animatedMarginPropertyName + " " + animationTime + "ms linear");
    const boundAnimationFrame = animationFrame.bind(this);
    let startTime = null;
    function animationFrame() {
      this.#animationFrameHandle = 0;
      if (!startTime) {
        this.contentElement.style.setProperty(animatedMarginPropertyName, marginTo);
        startTime = window.performance.now();
      } else if (window.performance.now() < startTime + animationTime) {
        if (this.#mainWidget) {
          this.#mainWidget.doResize();
        }
      } else {
        this.#cancelAnimation();
        if (this.#mainWidget) {
          this.#mainWidget.doResize();
        }
        this.dispatchEventToListeners("SidebarSizeChanged", this.sidebarSize());
        return;
      }
      this.#animationFrameHandle = this.contentElement.window().requestAnimationFrame(boundAnimationFrame);
    }
    this.#animationFrameHandle = this.contentElement.window().requestAnimationFrame(boundAnimationFrame);
  }
  #cancelAnimation() {
    this.contentElement.style.removeProperty("margin-top");
    this.contentElement.style.removeProperty("margin-right");
    this.contentElement.style.removeProperty("margin-bottom");
    this.contentElement.style.removeProperty("margin-left");
    this.contentElement.style.removeProperty("transition");
    this.contentElement.style.removeProperty("overflow");
    if (this.#animationFrameHandle) {
      this.contentElement.window().cancelAnimationFrame(this.#animationFrameHandle);
      this.#animationFrameHandle = 0;
    }
    if (this.#animationCallback) {
      this.#animationCallback();
      this.#animationCallback = null;
    }
  }
  #applyConstraints(sidebarSize, userAction) {
    const totalSize = this.#totalSizeDIP();
    const zoomFactor = this.#constraintsInDip ? 1 : ZoomManager.instance().zoomFactor();
    let constraints = this.#sidebarWidget ? this.#sidebarWidget.constraints() : new Geometry2.Constraints();
    let minSidebarSize = this.isVertical() ? constraints.minimum.width : constraints.minimum.height;
    if (!minSidebarSize) {
      minSidebarSize = MinPadding;
    }
    minSidebarSize *= zoomFactor;
    if (this.#sidebarMinimized) {
      sidebarSize = minSidebarSize;
    }
    let preferredSidebarSize = this.isVertical() ? constraints.preferred.width : constraints.preferred.height;
    if (!preferredSidebarSize) {
      preferredSidebarSize = MinPadding;
    }
    preferredSidebarSize *= zoomFactor;
    if (sidebarSize < preferredSidebarSize) {
      preferredSidebarSize = Math.max(sidebarSize, minSidebarSize);
    }
    preferredSidebarSize += zoomFactor;
    constraints = this.#mainWidget ? this.#mainWidget.constraints() : new Geometry2.Constraints();
    let minMainSize = this.isVertical() ? constraints.minimum.width : constraints.minimum.height;
    if (!minMainSize) {
      minMainSize = MinPadding;
    }
    minMainSize *= zoomFactor;
    let preferredMainSize = this.isVertical() ? constraints.preferred.width : constraints.preferred.height;
    if (!preferredMainSize) {
      preferredMainSize = MinPadding;
    }
    preferredMainSize *= zoomFactor;
    const savedMainSize = this.isVertical() ? this.#savedVerticalMainSize : this.#savedHorizontalMainSize;
    if (savedMainSize !== null) {
      preferredMainSize = Math.min(preferredMainSize, savedMainSize * zoomFactor);
    }
    if (userAction) {
      preferredMainSize = minMainSize;
    }
    const totalPreferred = preferredMainSize + preferredSidebarSize;
    if (totalPreferred <= totalSize) {
      return Platform6.NumberUtilities.clamp(sidebarSize, preferredSidebarSize, totalSize - preferredMainSize);
    }
    if (minMainSize + minSidebarSize <= totalSize) {
      const delta = totalPreferred - totalSize;
      const sidebarDelta = delta * preferredSidebarSize / totalPreferred;
      sidebarSize = preferredSidebarSize - sidebarDelta;
      return Platform6.NumberUtilities.clamp(sidebarSize, minSidebarSize, totalSize - minMainSize);
    }
    return Math.max(0, totalSize - minMainSize);
  }
  wasShown() {
    super.wasShown();
    this.#forceUpdateLayout();
    ZoomManager.instance().addEventListener("ZoomChanged", this.onZoomChanged, this);
  }
  willHide() {
    super.willHide();
    ZoomManager.instance().removeEventListener("ZoomChanged", this.onZoomChanged, this);
  }
  onResize() {
    this.#maybeAutoAdjustOrientation();
    this.#updateLayout();
  }
  onLayout() {
    this.#updateLayout();
  }
  calculateConstraints() {
    if (this.#showMode === "OnlyMain") {
      return this.#mainWidget ? this.#mainWidget.constraints() : new Geometry2.Constraints();
    }
    if (this.#showMode === "OnlySidebar") {
      return this.#sidebarWidget ? this.#sidebarWidget.constraints() : new Geometry2.Constraints();
    }
    let mainConstraints = this.#mainWidget ? this.#mainWidget.constraints() : new Geometry2.Constraints();
    let sidebarConstraints = this.#sidebarWidget ? this.#sidebarWidget.constraints() : new Geometry2.Constraints();
    const min = MinPadding;
    if (this.#isVertical) {
      mainConstraints = mainConstraints.widthToMax(min).addWidth(1);
      sidebarConstraints = sidebarConstraints.widthToMax(min);
      return mainConstraints.addWidth(sidebarConstraints).heightToMax(sidebarConstraints);
    }
    mainConstraints = mainConstraints.heightToMax(min).addHeight(1);
    sidebarConstraints = sidebarConstraints.heightToMax(min);
    return mainConstraints.widthToMax(sidebarConstraints).addHeight(sidebarConstraints);
  }
  #maybeAutoAdjustOrientation() {
    if (this.#autoAdjustOrientation) {
      const width = this.isVertical() ? this.#totalSizeCSS : this.#totalSizeOtherDimensionCSS;
      const height = this.isVertical() ? this.#totalSizeOtherDimensionCSS : this.#totalSizeCSS;
      if (width <= 600 && height >= 600) {
        this.setVertical(false);
      } else {
        this.setVertical(true);
      }
    }
  }
  #onResizeStart() {
    this.#resizeStartSizeDIP = this.#sidebarSizeDIP;
  }
  #onResizeUpdate(event) {
    const offset = event.data.currentPosition - event.data.startPosition;
    const offsetDIP = ZoomManager.instance().cssToDIP(offset);
    const newSizeDIP = this.#secondIsSidebar ? this.#resizeStartSizeDIP - offsetDIP : this.#resizeStartSizeDIP + offsetDIP;
    const constrainedSizeDIP = this.#applyConstraints(newSizeDIP, true);
    this.#savedSidebarSizeDIP = constrainedSizeDIP;
    this.#saveSetting();
    this.#setSidebarSizeDIP(constrainedSizeDIP, false, true);
    if (this.isVertical()) {
      this.#savedVerticalMainSize = this.#totalSizeDIP() - this.#sidebarSizeDIP;
    } else {
      this.#savedHorizontalMainSize = this.#totalSizeDIP() - this.#sidebarSizeDIP;
    }
  }
  #onResizeEnd() {
    this.#resizeStartSizeDIP = 0;
  }
  hideDefaultResizer(noSplitter) {
    this.#resizerElement.classList.toggle("hidden", Boolean(noSplitter));
    this.uninstallResizer(this.#resizerElement);
    this.#sidebarElement.classList.toggle("no-default-splitter", Boolean(noSplitter));
  }
  installResizer(resizerElement) {
    this.#resizerWidget.addElement(resizerElement);
  }
  uninstallResizer(resizerElement) {
    this.#resizerWidget.removeElement(resizerElement);
  }
  toggleResizer(resizer, on) {
    if (on) {
      this.installResizer(resizer);
    } else {
      this.uninstallResizer(resizer);
    }
  }
  #settingForOrientation() {
    const state = this.setting ? this.setting.get() : {};
    const orientationState = this.#isVertical ? state.vertical : state.horizontal;
    return orientationState ?? null;
  }
  #preferredSidebarSizeDIP() {
    let size = this.#savedSidebarSizeDIP;
    if (!size) {
      size = this.#isVertical ? this.#defaultSidebarWidth : this.#defaultSidebarHeight;
      if (0 < size && size < 1) {
        size *= this.#totalSizeDIP();
      }
    }
    return size;
  }
  #restoreSidebarSizeFromSettings() {
    const settingForOrientation = this.#settingForOrientation();
    this.#savedSidebarSizeDIP = settingForOrientation ? settingForOrientation.size : 0;
  }
  #restoreAndApplyShowModeFromSettings() {
    const orientationState = this.#settingForOrientation();
    this.#savedShowMode = orientationState?.showMode ? orientationState.showMode : this.#showMode;
    this.#showMode = this.#savedShowMode;
    switch (this.#savedShowMode) {
      case "Both":
        this.showBoth();
        break;
      case "OnlyMain":
        this.hideSidebar();
        break;
      case "OnlySidebar":
        this.hideMain();
        break;
    }
  }
  #saveShowModeToSettings() {
    this.#savedShowMode = this.#showMode;
    this.#saveSetting();
  }
  #saveSetting() {
    if (!this.setting) {
      return;
    }
    const state = this.setting.get();
    const orientationState = (this.#isVertical ? state.vertical : state.horizontal) || {};
    orientationState.size = this.#savedSidebarSizeDIP;
    if (this.#shouldSaveShowMode) {
      orientationState.showMode = this.#savedShowMode;
    }
    if (this.#isVertical) {
      state.vertical = orientationState;
    } else {
      state.horizontal = orientationState;
    }
    this.setting.set(state);
  }
  #forceUpdateLayout() {
    this.#sidebarSizeDIP = -1;
    this.#updateLayout();
  }
  onZoomChanged() {
    this.#forceUpdateLayout();
  }
  createShowHideSidebarButton(showTitle, hideTitle, shownString, hiddenString, jslogContext) {
    this.#showSidebarButtonTitle = showTitle;
    this.#hideSidebarButtonTitle = hideTitle;
    this.#shownSidebarString = shownString;
    this.#hiddenSidebarString = hiddenString;
    this.#showHideSidebarButton = new ToolbarButton("", "right-panel-open");
    this.#showHideSidebarButton.addEventListener("Click", buttonClicked, this);
    if (jslogContext) {
      this.#showHideSidebarButton.element.setAttribute("jslog", `${VisualLogging4.toggleSubpane().track({ click: true }).context(jslogContext)}`);
    }
    this.#updateShowHideSidebarButton();
    function buttonClicked() {
      this.toggleSidebar();
    }
    return this.#showHideSidebarButton;
  }
  /**
   * @returns true if this call makes the sidebar visible, and false otherwise.
   */
  toggleSidebar() {
    if (this.#showMode !== "Both") {
      this.showBoth(true);
      LiveAnnouncer.alert(this.#shownSidebarString);
      return true;
    }
    this.hideSidebar(true);
    LiveAnnouncer.alert(this.#hiddenSidebarString);
    return false;
  }
  #updateShowHideSidebarButton() {
    if (!this.#showHideSidebarButton) {
      return;
    }
    const sidebarHidden = this.#showMode === "OnlyMain";
    let glyph = "";
    if (sidebarHidden) {
      glyph = this.isVertical() ? this.isSidebarSecond() ? "right-panel-open" : "left-panel-open" : this.isSidebarSecond() ? "bottom-panel-open" : "top-panel-open";
    } else {
      glyph = this.isVertical() ? this.isSidebarSecond() ? "right-panel-close" : "left-panel-close" : this.isSidebarSecond() ? "bottom-panel-close" : "top-panel-close";
    }
    this.#showHideSidebarButton.setGlyph(glyph);
    this.#showHideSidebarButton.setTitle(sidebarHidden ? this.#showSidebarButtonTitle : this.#hideSidebarButtonTitle);
  }
};
var SplitWidgetElement = class extends WidgetElement {
  static observedAttributes = ["direction", "sidebar-position", "sidebar-initial-size", "sidebar-visibility"];
  createWidget() {
    const vertical = this.getAttribute("direction") === "column";
    const autoAdjustOrientation = this.getAttribute("direction") === "auto";
    const secondIsSidebar = this.getAttribute("sidebar-position") === "second";
    const settingName = this.getAttribute("name") ?? void 0;
    const sidebarSize = parseInt(this.getAttribute("sidebar-initial-size") || "", 10);
    const defaultSidebarWidth = !isNaN(sidebarSize) ? sidebarSize : void 0;
    const defaultSidebarHeight = !isNaN(sidebarSize) ? sidebarSize : void 0;
    const widget = new SplitWidget(
      vertical,
      secondIsSidebar,
      settingName,
      defaultSidebarWidth,
      defaultSidebarHeight,
      /* constraintsInDip=*/
      false,
      this
    );
    if (this.getAttribute("sidebar-initial-size") === "minimized") {
      widget.setSidebarMinimized(true);
    }
    if (autoAdjustOrientation) {
      widget.setAutoAdjustOrientation(true);
    }
    const sidebarHidden = this.getAttribute("sidebar-visibility") === "hidden";
    if (sidebarHidden) {
      widget.hideSidebar();
    }
    widget.addEventListener("ShowModeChanged", () => {
      this.dispatchEvent(new CustomEvent("change", { detail: widget.showMode() }));
    });
    return widget;
  }
  attributeChangedCallback(name, _oldValue, newValue) {
    const widget = Widget.get(this);
    if (!widget) {
      return;
    }
    if (name === "direction") {
      widget.setVertical(newValue === "column");
      widget.setAutoAdjustOrientation(newValue === "auto");
    } else if (name === "sidebar-position") {
      widget.setSecondIsSidebar(newValue === "second");
    } else if (name === "sidebar-visibility") {
      if (newValue === "hidden") {
        widget.hideSidebar();
      } else {
        widget.showBoth();
      }
    }
  }
};
customElements.define("devtools-split-view", SplitWidgetElement);
var MinPadding = 20;
var suppressUnused = function(_value) {
};

// gen/front_end/ui/legacy/TabbedPane.js
var TabbedPane_exports = {};
__export(TabbedPane_exports, {
  Events: () => Events,
  TabbedPane: () => TabbedPane,
  TabbedPaneTab: () => TabbedPaneTab
});
import * as Common8 from "./../../core/common/common.js";
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as Platform7 from "./../../core/platform/platform.js";
import * as Geometry3 from "./../../models/geometry/geometry.js";
import * as Buttons2 from "./../components/buttons/buttons.js";
import * as VisualLogging5 from "./../visual_logging/visual_logging.js";
import * as IconButton2 from "./../components/icon_button/icon_button.js";

// gen/front_end/ui/legacy/tabbedPane.css.js
var tabbedPane_css_default = `/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

.tabbed-pane {
  flex: auto;
  overflow: hidden;
}

.tabbed-pane-content {
  position: relative;
  overflow: auto;
  flex: auto;
  display: flex;
  flex-direction: column;
}

.tabbed-pane-content.has-no-tabs {
  background-color: var(--sys-color-cdt-base-container);
}

.tabbed-pane-placeholder {
  text-align: center;
  align-content: center;

  .sources-placeholder {
    display: inline-block;
  }
}

.tabbed-pane-placeholder-row {
  max-width: var(--sys-size-32);
  min-width: var(--sys-size-28);
  margin: 0 var(--sys-size-8);

  &.workspace {
    line-height: 18px;
    display: inline-flex;
    align-items: center;
    border: var(--sys-size-2) dashed var(--sys-color-divider);
    padding: var(--sys-size-8);
    border-radius: var(--sys-shape-corner-medium);
    margin: var(--sys-size-8) var(--sys-size-8) var(--sys-size-11);

    > .icon-container {
      flex-shrink: 0;
      width: var(--sys-size-13);
      height: var(--sys-size-13);
      background: var(--sys-color-tonal-container);
      align-content: center;
      border-radius: var(--sys-shape-corner-full);
      margin-right: var(--sys-size-8);

      > devtools-icon {
        color: var(--sys-color-on-tonal-container);
      }
    }
  }

  &.shortcuts-list {
    padding: 0 var(--sys-size-6);

    .shortcut-line {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: var(--sys-size-10);
      padding: var(--sys-size-4) 0;

      &:not(:last-child) {
        border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
      }

      .shortcuts {
        display: flex;
        flex-direction: row;
        gap: var(--sys-size-4);
        align-items: center;
      }

      .keybinds-key {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        height: var(--sys-size-11);
        min-width: var(--sys-size-11);
        font: var(--sys-typescale-body5-medium);
        white-space: nowrap;
        border-radius: var(--sys-shape-corner-small);
        background: var(--sys-color-tonal-container);
        padding: 0 var(--sys-size-4);
      }

      & button {
        margin-inline: 0;
      }
    }
  }

  & button {
    cursor: pointer;
    color: var(--text-link);
    background: transparent;
    border: none;
    padding: 0;
    text-decoration: underline;
    margin-inline: var(--sys-size-3);
    text-align: left;

    &:focus-visible {
      outline: 2px solid var(--sys-color-state-focus-ring);
      outline-offset: 2px;
      border-radius: 2px;
    }
  }
}

.tabbed-pane-header {
  display: flex;
  flex: 0 0 27px;
  border-bottom: 1px solid var(--sys-color-divider);
  overflow: visible;
  width: 100%;
  background-color: var(--app-color-toolbar-background);

  & > * {
    cursor: initial;
  }
}

.tabbed-pane-header-contents {
  flex: auto;
  pointer-events: none;
  margin-left: 0;
  position: relative;
  cursor: default;
}

.tabbed-pane-header-contents > * {
  pointer-events: initial;
}

.tabbed-pane-header-tab-icon {
  min-width: 14px;
  display: flex;
  align-items: center;
  margin-right: var(--sys-size-2);
}

.tabbed-pane-header-tab-suffix-element {
  height: var(--sys-size-8);
  width: var(--sys-size-8);
  padding-left: var(--sys-size-2);
  align-content: center;

  &:has(.badge) {
    width: 17px;
    margin-left: var(--sys-size-2);
  }

  &:has(.status-dot) {
    width: 9px;
  }
}

.badge {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  height: var(--sys-size-7);
  min-width: var(--sys-size-7);
  width: fit-content;
  padding: 0 var(--sys-size-3);
  line-height: var(--sys-size-7);
  border-radius: var(--sys-shape-corner-full);
  margin-left: var(--sys-size-2);
  background-color: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  font-size: var(--sys-typescale-body5-size);
  font-weight: var(--ref-typeface-weight-bold);

  &.primary {
    background: var(--sys-color-cdt-base-container);
    color: var(--sys-color-primary);
    border: var(--sys-size-1) solid var(--sys-color-primary);
    font-weight: normal;
  }
}

.status-dot {
  height: var(--sys-size-4);
  width: var(--sys-size-4);
  border-radius: var(--sys-shape-corner-full);
  background-color: var(--sys-color-purple-bright);
  margin-left: var(--sys-size-1);
  justify-self: center;
  position: relative;
  top: 0.75px;
}

.tabbed-pane-header-tab {
  font: var(--sys-typescale-body4-medium);
  color: var(--sys-color-on-surface-subtle);
  height: var(--sys-size-12);
  float: left;
  padding: 0 10px;
  white-space: nowrap;
  cursor: default;
  display: flex;
  align-items: center;
}

.tabbed-pane-header-tab.closeable {
  padding-right: var(--sys-size-3);
}

.tabbed-pane-header-tab devtools-icon.dot::before {
  outline-color: var(--icon-gap-toolbar);
}

.tabbed-pane-header-tab:hover devtools-icon.dot::before {
  outline-color: var(--icon-gap-toolbar-hover);
}

.tabbed-pane-header-tab:not(.vertical-tab-layout):hover,
.tabbed-pane-shadow .tabbed-pane-header-tab:focus-visible {
  color: var(--sys-color-on-surface);
  background-color: var(--sys-color-state-hover-on-subtle);
}

.tabbed-pane-header-tab-title {
  text-overflow: ellipsis;
  overflow: hidden;
}

.tabbed-pane-header-tab.measuring {
  visibility: hidden;
}

.tabbed-pane-header-tab.selected {
  border-bottom: none;
  color: var(--sys-color-primary);
}

.tabbed-pane-header-tab.selected.dragging {
  --override-dragging-box-shadow-color: rgb(0 0 0 / 37%);

  position: relative;
  box-shadow: 0 1px 4px 0 var(--override-dragging-box-shadow-color);
  background-color: var(--app-color-toolbar-background);
}

.theme-with-dark-background .tabbed-pane-header-tab.dragging,
:host-context(.theme-with-dark-background) .tabbed-pane-header-tab.dragging {
  --override-dragging-box-shadow-color: rgb(230 230 230 / 37%);
}

.tabbed-pane-header-tab .tabbed-pane-close-button {
  visibility: hidden;
}

.tabbed-pane-header-tab:hover .tabbed-pane-close-button,
.tabbed-pane-header-tab.selected .tabbed-pane-close-button {
  visibility: visible;
}

.tabbed-pane-header-tabs-drop-down-container {
  float: left;
  opacity: 80%;
  display: flex;
  align-items: center;
  height: 100%;
}

.tabbed-pane-header-tabs-drop-down-container > .chevron-icon:hover,
.tabbed-pane-header-tabs-drop-down-container > .chevron-icon:focus-visible {
  color: var(--icon-default-hover);
}

.tabbed-pane-header-tabs-drop-down-container:hover,
.tabbed-pane-header-tabs-drop-down-container:focus-visible {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.tabbed-pane-header-tabs-drop-down-container.measuring {
  visibility: hidden;
}

.tabbed-pane-header-tabs-drop-down-container:active {
  opacity: 80%;
}
/* Web page style */

.tabbed-pane-shadow.vertical-tab-layout {
  flex-direction: row !important; /* stylelint-disable-line declaration-no-important */
}

.tabbed-pane-shadow.vertical-tab-layout .tabbed-pane-header {
  background-color: transparent;
  border: none transparent !important; /* stylelint-disable-line declaration-no-important */
  width: auto;
  flex: 0 0 auto;
  flex-direction: column;
  padding-top: 5px;
  overflow: hidden;
}

.tabbed-pane-shadow.vertical-tab-layout .tabbed-pane-content {
  padding-top: var(--sys-size-10);
  overflow-x: hidden;
}

.tabbed-pane-shadow.vertical-tab-layout .tabbed-pane-header-contents {
  margin: 0;
  flex: none;
}

.tabbed-pane-shadow.vertical-tab-layout .tabbed-pane-header-tabs {
  display: flex;
  flex-direction: column;
  width: var(--sys-size-24);
  margin-right: var(--sys-size-5);
}

.tabbed-pane-shadow.vertical-tab-layout .tabbed-pane-header-tab {
  height: var(--size-12, 28px);
  padding: 0 var(--size-8, 16px) 0 var(--size-7, 14px);
  border-radius: 0 100px 100px 0;
  color: var(--sys-color-on-surface);
  position: relative;

  & > .tabbed-pane-header-tab-icon devtools-icon {
    margin: 0;
    margin-right: var(--sys-size-6);
  }

  &.selected {
    color: var(--app-color-navigation-drawer-label-selected);
    background-color: var(--app-color-navigation-drawer-background-selected);

    & > .tabbed-pane-header-tab-icon devtools-icon {
      color: var(--app-color-navigation-drawer-label-selected);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-state-focus-ring);
  }

  &:active::before {
    background-color: var(--sys-color-state-ripple-neutral-on-subtle);
    content: "";
    height: 100%;
    width: 100%;
    border-radius: inherit;
    position: absolute;
    top: 0;
    left: 0;
  }
}

.tabbed-pane-tab-slider {
  height: 3px;
  position: absolute;
  bottom: -1px;
  background-color: var(--sys-color-primary);
  border-radius: var(--sys-shape-corner-full) var(--sys-shape-corner-full) 0 0;
  left: 0;
  transform-origin: 0 100%;
  transition: transform 150ms cubic-bezier(0, 0, 0.2, 1);
  visibility: hidden;
}

@media (-webkit-min-device-pixel-ratio: 1.1) {
  .tabbed-pane-tab-slider {
    border-top: none;
  }
}

.tabbed-pane-tab-slider.enabled {
  visibility: visible;
}

.tabbed-pane-header-tab.disabled {
  opacity: 50%;
  pointer-events: none;
}

.tabbed-pane-left-toolbar {
  margin-right: -4px;
  flex: none;
}

.tabbed-pane-right-toolbar {
  margin-left: -4px;
  flex: none;
}

.preview-icon {
  --override-tabbed-pane-preview-icon-color: var(--icon-default);

  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: var(--sys-size-2);
  flex-shrink: 0;

  devtools-icon {
    color: var(--override-tabbed-pane-preview-icon-color);
  }
}

@media (forced-colors: active) {
  .tabbed-pane-tab-slider {
    forced-color-adjust: none;
    background-color: Highlight;
  }

  .tabbed-pane-header {
    forced-color-adjust: none;
    border-bottom: 1px solid transparent;
    background-color: ButtonFace;
  }

  .tabbed-pane-header-contents .tabbed-pane-header-tabs .tabbed-pane-header-tab {
    background: ButtonFace;
    color: ButtonText;
  }

  .tabbed-pane-header-tabs .tabbed-pane-header-tab:hover,
  .tabbed-pane-header-tabs .tabbed-pane-shadow .tabbed-pane-header-tab:focus-visible {
    background-color: Highlight;
    color: HighlightText;
  }

  .tabbed-pane-header-tab .tabbed-pane-header-tab-title {
    color: inherit;
  }

  .tabbed-pane-header-contents .tabbed-pane-header-tabs .tabbed-pane-header-tab.selected,
  .tabbed-pane-header-contents .tabbed-pane-header-tabs .tabbed-pane-header-tab.selected:focus-visible {
    background-color: Highlight;
    color: HighlightText;
  }

  .tabbed-pane-header-tab:hover .tabbed-pane-close-button,
  .tabbed-pane-shadow .tabbed-pane-header-tab:focus-visible .tabbed-pane-close-button {
    color: HighlightText;
  }

  .tabbed-pane-header-tabs-drop-down-container {
    opacity: 100%;
  }

  .tabbed-pane-header-tabs-drop-down-container:hover,
  .tabbed-pane-header-tabs-drop-down-container:focus-visible {
    background-color: Highlight;
  }

  .tabbed-pane-header-tabs-drop-down-container > .chevron-icon {
    color: ButtonText;
  }

  .tabbed-pane-header-tabs-drop-down-container:hover > .chevron-icon,
  .tabbed-pane-header-tabs-drop-down-container:focus-visible > .chevron-icon {
    color: HighlightText;
  }

  .tabbed-pane-header-tabs .tabbed-pane-header-tab .preview-icon {
    --override-tabbed-pane-preview-icon-color: ButtonText;
  }

  .tabbed-pane-header-tab.selected .preview-icon,
  .tabbed-pane-header-tab:hover .preview-icon {
    --override-tabbed-pane-preview-icon-color: HighlightText;
  }

  .close-button {
    --tabbed-pane-close-icon-color: ButtonText;

    forced-color-adjust: none;
  }

  .close-button:hover,
  .close-button:active {
    --tabbed-pane-close-icon-color: HighlightText;

    background-color: Highlight;
  }

  .selected .close-button {
    --tabbed-pane-close-icon-color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./tabbedPane.css")} */`;

// gen/front_end/ui/legacy/Tooltip.js
var Tooltip_exports = {};
__export(Tooltip_exports, {
  Tooltip: () => Tooltip
});
var Tooltip = class {
  static install(element, tooltipContent) {
    element.title = tooltipContent || "";
  }
  static installWithActionBinding(element, tooltipContent, actionId) {
    let description = tooltipContent;
    const shortcuts = ShortcutRegistry.instance().shortcutsForAction(actionId);
    for (const shortcut of shortcuts) {
      description += ` - ${shortcut.title()}`;
    }
    element.title = description;
  }
};

// gen/front_end/ui/legacy/TabbedPane.js
var UIStrings4 = {
  /**
   * @description The aria label for the button to open more tabs at the right tabbed pane in Elements tools
   */
  moreTabs: "More tabs",
  /**
   * @description Text in Tabbed Pane
   * @example {tab} PH1
   */
  closeS: "Close {PH1}",
  /**
   * @description Text to close something
   */
  close: "Close",
  /**
   * @description Text on a menu option to close other drawers when right click on a drawer title
   */
  closeOthers: "Close others",
  /**
   * @description Text on a menu option to close the drawer to the right when right click on a drawer title
   */
  closeTabsToTheRight: "Close tabs to the right",
  /**
   * @description Text on a menu option to close all the drawers except Console when right click on a drawer title
   */
  closeAll: "Close all",
  /**
   * @description Indicates that a tab contains a preview feature (i.e., a beta / experimental feature).
   */
  previewFeature: "Preview feature",
  /**
   * @description Text to move a tab forwar.
   */
  moveTabRight: "Move right",
  /**
   * @description Text to move a tab backward.
   */
  moveTabLeft: "Move left"
};
var str_4 = i18n7.i18n.registerUIStrings("ui/legacy/TabbedPane.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var TabbedPane = class extends Common8.ObjectWrapper.eventMixin(VBox) {
  #headerElement;
  headerContentsElement;
  tabSlider;
  tabsElement;
  #contentElement;
  tabs;
  tabsHistory;
  tabsById;
  currentTabLocked;
  autoSelectFirstItemOnShow;
  triggerDropDownTimeout;
  dropDownButton;
  currentDevicePixelRatio;
  shrinkableTabs;
  verticalTabLayout;
  closeableTabs;
  delegate;
  currentTab;
  sliderEnabled;
  placeholderElement;
  focusedPlaceholderElement;
  placeholderContainerElement;
  lastSelectedOverflowTab;
  measuredDropDownButtonWidth;
  #leftToolbar;
  #rightToolbar;
  allowTabReorder;
  automaticReorder;
  constructor(element) {
    super(element, { useShadowDom: true });
    this.registerRequiredCSS(tabbedPane_css_default);
    this.element.classList.add("tabbed-pane");
    this.contentElement.classList.add("tabbed-pane-shadow");
    this.contentElement.tabIndex = -1;
    this.setDefaultFocusedElement(this.contentElement);
    this.#headerElement = this.contentElement.createChild("div", "tabbed-pane-header");
    this.headerContentsElement = this.#headerElement.createChild("div", "tabbed-pane-header-contents");
    this.tabSlider = document.createElement("div");
    this.tabSlider.classList.add("tabbed-pane-tab-slider");
    this.tabsElement = this.headerContentsElement.createChild("div", "tabbed-pane-header-tabs");
    this.tabsElement.setAttribute("role", "tablist");
    this.tabsElement.addEventListener("keydown", this.keyDown.bind(this), false);
    this.#contentElement = this.contentElement.createChild("div", "tabbed-pane-content");
    this.#contentElement.createChild("slot");
    this.tabs = [];
    this.tabsHistory = [];
    this.tabsById = /* @__PURE__ */ new Map();
    this.currentTabLocked = false;
    this.autoSelectFirstItemOnShow = true;
    this.triggerDropDownTimeout = null;
    this.dropDownButton = this.createDropDownButton();
    this.currentDevicePixelRatio = window.devicePixelRatio;
    ZoomManager.instance().addEventListener("ZoomChanged", this.zoomChanged, this);
    this.makeTabSlider();
  }
  setAccessibleName(name) {
    setLabel(this.tabsElement, name);
  }
  setCurrentTabLocked(locked) {
    this.currentTabLocked = locked;
    this.#headerElement.classList.toggle("locked", this.currentTabLocked);
  }
  setAutoSelectFirstItemOnShow(autoSelect) {
    this.autoSelectFirstItemOnShow = autoSelect;
  }
  get visibleView() {
    return this.currentTab ? this.currentTab.view : null;
  }
  tabIds() {
    return this.tabs.map((tab) => tab.id);
  }
  tabIndex(tabId) {
    return this.tabs.findIndex((tab) => tab.id === tabId);
  }
  tabViews() {
    return this.tabs.map((tab) => tab.view);
  }
  tabView(tabId) {
    const tab = this.tabsById.get(tabId);
    return tab ? tab.view : null;
  }
  get selectedTabId() {
    return this.currentTab ? this.currentTab.id : null;
  }
  setShrinkableTabs(shrinkableTabs) {
    this.shrinkableTabs = shrinkableTabs;
  }
  makeVerticalTabLayout() {
    this.verticalTabLayout = true;
    this.setTabSlider(false);
    this.contentElement.classList.add("vertical-tab-layout");
    this.invalidateConstraints();
  }
  setCloseableTabs(closeableTabs) {
    this.closeableTabs = closeableTabs;
  }
  focus() {
    if (this.visibleView) {
      this.visibleView.focus();
    } else {
      this.contentElement.focus();
    }
  }
  focusSelectedTabHeader() {
    const selectedTab = this.currentTab;
    if (selectedTab) {
      selectedTab.tabElement.focus();
    }
  }
  headerElement() {
    return this.#headerElement;
  }
  tabbedPaneContentElement() {
    return this.#contentElement;
  }
  setTabDelegate(delegate) {
    const tabs = this.tabs.slice();
    for (let i = 0; i < tabs.length; ++i) {
      tabs[i].setDelegate(delegate);
    }
    this.delegate = delegate;
  }
  appendTab(id2, tabTitle, view, tabTooltip, userGesture, isCloseable, isPreviewFeature, index, jslogContext) {
    const closeable = typeof isCloseable === "boolean" ? isCloseable : Boolean(this.closeableTabs);
    const tab = new TabbedPaneTab(this, id2, tabTitle, closeable, Boolean(isPreviewFeature), view, tabTooltip, jslogContext);
    tab.setDelegate(this.delegate);
    console.assert(!this.tabsById.has(id2), `Tabbed pane already contains a tab with id '${id2}'`);
    this.tabsById.set(id2, tab);
    tab.tabElement.tabIndex = -1;
    tab.tabElement.setAttribute("jslog", `${VisualLogging5.panelTabHeader().track({ click: true, drag: true }).context(tab.jslogContext)}`);
    if (index !== void 0) {
      this.tabs.splice(index, 0, tab);
    } else {
      this.tabs.push(tab);
    }
    this.tabsHistory.push(tab);
    if (this.tabsHistory[0] === tab && this.isShowing()) {
      this.selectTab(tab.id, userGesture);
    }
    this.requestUpdate();
  }
  closeTab(id2, userGesture) {
    this.closeTabs([id2], userGesture);
  }
  closeTabs(ids, userGesture) {
    if (ids.length === 0) {
      return;
    }
    const focused = this.hasFocus();
    for (let i = 0; i < ids.length; ++i) {
      this.#closeTab(ids[i], userGesture);
    }
    this.requestUpdate();
    if (this.tabsHistory.length) {
      this.selectTab(this.tabsHistory[0].id, false);
    }
    if (focused) {
      this.focus();
    }
  }
  #closeTab(id2, userGesture) {
    const tab = this.tabsById.get(id2);
    if (!tab) {
      return;
    }
    if (userGesture && !tab.closeable) {
      return;
    }
    if (this.currentTab && this.currentTab.id === id2) {
      this.hideCurrentTab();
    }
    this.tabsById.delete(id2);
    this.tabsHistory.splice(this.tabsHistory.indexOf(tab), 1);
    this.tabs.splice(this.tabs.indexOf(tab), 1);
    if (tab.shown) {
      this.hideTabElement(tab);
    }
    const eventData = { prevTabId: void 0, tabId: id2, view: tab.view, isUserGesture: userGesture };
    this.dispatchEventToListeners(Events.TabClosed, eventData);
    return true;
  }
  hasTab(tabId) {
    return this.tabsById.has(tabId);
  }
  otherTabs(id2) {
    const result = [];
    for (let i = 0; i < this.tabs.length; ++i) {
      if (this.tabs[i].id !== id2) {
        result.push(this.tabs[i].id);
      }
    }
    return result;
  }
  tabsToTheRight(id2) {
    let index = -1;
    for (let i = 0; i < this.tabs.length; ++i) {
      if (this.tabs[i].id === id2) {
        index = i;
        break;
      }
    }
    if (index === -1) {
      return [];
    }
    return this.tabs.slice(index + 1).map(function(tab) {
      return tab.id;
    });
  }
  viewHasFocus() {
    if (this.visibleView?.hasFocus()) {
      return true;
    }
    const root = this.contentElement.getComponentRoot();
    return root instanceof Document && this.contentElement === root.activeElement;
  }
  selectTab(id2, userGesture, forceFocus) {
    if (this.currentTabLocked) {
      return false;
    }
    const focused = this.viewHasFocus();
    const tab = this.tabsById.get(id2);
    if (!tab) {
      return false;
    }
    this.lastSelectedOverflowTab = tab;
    const eventData = {
      prevTabId: this.currentTab ? this.currentTab.id : void 0,
      tabId: id2,
      view: tab.view,
      isUserGesture: userGesture
    };
    this.dispatchEventToListeners(Events.TabInvoked, eventData);
    if (this.currentTab && this.currentTab.id === id2) {
      return true;
    }
    this.suspendInvalidations();
    this.hideCurrentTab();
    this.showTab(tab);
    this.resumeInvalidations();
    this.currentTab = tab;
    this.tabsHistory.splice(this.tabsHistory.indexOf(tab), 1);
    this.tabsHistory.splice(0, 0, tab);
    this.requestUpdate();
    if (focused || forceFocus) {
      this.focus();
    }
    this.dispatchEventToListeners(Events.TabSelected, eventData);
    return true;
  }
  selectNextTab() {
    const index = this.tabs.indexOf(this.currentTab);
    const nextIndex = Platform7.NumberUtilities.mod(index + 1, this.tabs.length);
    this.selectTab(this.tabs[nextIndex].id, true);
  }
  selectPrevTab() {
    const index = this.tabs.indexOf(this.currentTab);
    const nextIndex = Platform7.NumberUtilities.mod(index - 1, this.tabs.length);
    this.selectTab(this.tabs[nextIndex].id, true);
  }
  getTabIndex(id2) {
    const index = this.tabs.indexOf(this.tabsById.get(id2));
    return index;
  }
  moveTabBackward(id2, index) {
    this.insertBefore(this.tabsById.get(id2), index - 1);
    this.updateTabSlider();
  }
  moveTabForward(id2, index) {
    this.insertBefore(this.tabsById.get(id2), index + 2);
    this.updateTabSlider();
  }
  lastOpenedTabIds(tabsCount) {
    function tabToTabId(tab) {
      return tab.id;
    }
    return this.tabsHistory.slice(0, tabsCount).map(tabToTabId);
  }
  setTabIcon(id2, icon) {
    const tab = this.tabsById.get(id2);
    if (!tab) {
      return;
    }
    tab.setIcon(icon);
    this.requestUpdate();
  }
  setTrailingTabIcon(id2, icon) {
    const tab = this.tabsById.get(id2);
    if (!tab) {
      return;
    }
    tab.setSuffixElement(icon);
  }
  setSuffixElement(id2, suffixElement) {
    const tab = this.tabsById.get(id2);
    if (!tab) {
      return;
    }
    tab.setSuffixElement(suffixElement);
    this.requestUpdate();
  }
  setBadge(id2, content) {
    const badge2 = document.createElement("span");
    badge2.textContent = content;
    badge2.classList.add("badge");
    this.setSuffixElement(id2, content ? badge2 : null);
  }
  setTabEnabled(id2, enabled) {
    const tab = this.tabsById.get(id2);
    if (tab) {
      tab.tabElement.classList.toggle("disabled", !enabled);
    }
  }
  tabIsDisabled(id2) {
    return !this.tabIsEnabled(id2);
  }
  tabIsEnabled(id2) {
    const tab = this.tabsById.get(id2);
    const disabled = tab?.tabElement.classList.contains("disabled") ?? false;
    return !disabled;
  }
  zoomChanged() {
    this.clearMeasuredWidths();
    if (this.isShowing()) {
      this.requestUpdate();
    }
  }
  clearMeasuredWidths() {
    for (let i = 0; i < this.tabs.length; ++i) {
      delete this.tabs[i].measuredWidth;
    }
  }
  changeTabTitle(id2, tabTitle, tabTooltip) {
    const tab = this.tabsById.get(id2);
    if (tab && tabTooltip !== void 0) {
      tab.tooltip = tabTooltip;
    }
    if (tab && tab.title !== tabTitle) {
      tab.title = tabTitle;
      setLabel(tab.tabElement, tabTitle);
      this.requestUpdate();
    }
  }
  changeTabView(id2, view) {
    const tab = this.tabsById.get(id2);
    if (!tab || tab.view === view) {
      return;
    }
    this.suspendInvalidations();
    const isSelected = this.currentTab && this.currentTab.id === id2;
    const shouldFocus = tab.view.hasFocus();
    if (isSelected) {
      this.hideTab(tab);
    }
    tab.view = view;
    if (isSelected) {
      this.showTab(tab);
    }
    if (shouldFocus) {
      tab.view.focus();
    }
    this.resumeInvalidations();
  }
  onResize() {
    if (this.currentDevicePixelRatio !== window.devicePixelRatio) {
      this.clearMeasuredWidths();
      this.currentDevicePixelRatio = window.devicePixelRatio;
    }
    this.requestUpdate();
  }
  headerResized() {
    this.requestUpdate();
  }
  wasShown() {
    super.wasShown();
    const effectiveTab = this.currentTab || this.tabsHistory[0];
    if (effectiveTab && this.autoSelectFirstItemOnShow) {
      this.selectTab(effectiveTab.id);
    }
    this.requestUpdate();
    this.dispatchEventToListeners(Events.PaneVisibilityChanged, { isVisible: true });
  }
  wasHidden() {
    this.dispatchEventToListeners(Events.PaneVisibilityChanged, { isVisible: false });
  }
  makeTabSlider() {
    if (this.verticalTabLayout) {
      return;
    }
    this.setTabSlider(true);
  }
  setTabSlider(enable) {
    this.sliderEnabled = enable;
    this.tabSlider.classList.toggle("enabled", enable);
  }
  calculateConstraints() {
    let constraints = super.calculateConstraints();
    const minContentConstraints = new Geometry3.Constraints(new Geometry3.Size(0, 0), new Geometry3.Size(50, 50));
    constraints = constraints.widthToMax(minContentConstraints).heightToMax(minContentConstraints);
    if (this.verticalTabLayout) {
      constraints = constraints.addWidth(new Geometry3.Constraints(new Geometry3.Size(120, 0)));
    } else {
      constraints = constraints.addHeight(new Geometry3.Constraints(new Geometry3.Size(0, 30)));
    }
    return constraints;
  }
  setPlaceholderElement(element, focusedElement) {
    this.placeholderElement = element;
    if (focusedElement) {
      this.focusedPlaceholderElement = focusedElement;
    }
    if (this.placeholderContainerElement) {
      this.placeholderContainerElement.removeChildren();
      this.placeholderContainerElement.appendChild(element);
    }
  }
  async waitForTabElementUpdate() {
    this.performUpdate();
  }
  performUpdate() {
    if (!this.isShowing()) {
      return;
    }
    if (!this.tabs.length) {
      this.#contentElement.classList.add("has-no-tabs");
      if (this.placeholderElement && !this.placeholderContainerElement) {
        this.placeholderContainerElement = this.#contentElement.createChild("div", "tabbed-pane-placeholder fill");
        this.placeholderContainerElement.appendChild(this.placeholderElement);
        if (this.focusedPlaceholderElement) {
          this.setDefaultFocusedElement(this.focusedPlaceholderElement);
        }
      }
    } else {
      this.#contentElement.classList.remove("has-no-tabs");
      if (this.placeholderContainerElement) {
        this.placeholderContainerElement.remove();
        this.setDefaultFocusedElement(this.contentElement);
        delete this.placeholderContainerElement;
      }
    }
    this.measureDropDownButton();
    this.adjustToolbarWidth();
    this.updateWidths();
    this.updateTabsDropDown();
    this.updateTabSlider();
  }
  adjustToolbarWidth() {
    if (!this.#rightToolbar || !this.measuredDropDownButtonWidth) {
      return;
    }
    const leftToolbarWidth = this.#leftToolbar?.getBoundingClientRect().width ?? 0;
    const rightToolbarWidth = this.#rightToolbar.getBoundingClientRect().width;
    const totalWidth = this.#headerElement.getBoundingClientRect().width;
    if (!this.#rightToolbar.hasCompactLayout() && totalWidth - rightToolbarWidth - leftToolbarWidth < this.measuredDropDownButtonWidth + 10) {
      this.#rightToolbar.setCompactLayout(true);
    } else if (this.#rightToolbar.hasCompactLayout() && // Estimate the right toolbar size in non-compact mode as 2 times its compact size.
    totalWidth - 2 * rightToolbarWidth - leftToolbarWidth > this.measuredDropDownButtonWidth + 10) {
      this.#rightToolbar.setCompactLayout(false);
    }
  }
  showTabElement(index, tab) {
    if (index >= this.tabsElement.children.length) {
      this.tabsElement.appendChild(tab.tabElement);
    } else {
      this.tabsElement.insertBefore(tab.tabElement, this.tabsElement.children[index]);
    }
    tab.shown = true;
  }
  hideTabElement(tab) {
    this.tabsElement.removeChild(tab.tabElement);
    tab.shown = false;
  }
  createDropDownButton() {
    const dropDownContainer = document.createElement("div");
    dropDownContainer.classList.add("tabbed-pane-header-tabs-drop-down-container");
    dropDownContainer.setAttribute("jslog", `${VisualLogging5.dropDown("more-tabs").track({ click: true })}`);
    const chevronIcon = IconButton2.Icon.create("chevron-double-right", "chevron-icon");
    const moreTabsString = i18nString4(UIStrings4.moreTabs);
    dropDownContainer.title = moreTabsString;
    markAsMenuButton(dropDownContainer);
    setLabel(dropDownContainer, moreTabsString);
    setExpanded(dropDownContainer, false);
    dropDownContainer.tabIndex = 0;
    dropDownContainer.appendChild(chevronIcon);
    dropDownContainer.addEventListener("click", this.dropDownClicked.bind(this));
    dropDownContainer.addEventListener("keydown", this.dropDownKeydown.bind(this));
    dropDownContainer.addEventListener("mousedown", (event) => {
      if (event.button !== 0 || this.triggerDropDownTimeout) {
        return;
      }
      this.triggerDropDownTimeout = window.setTimeout(this.dropDownClicked.bind(this, event), 200);
    });
    return dropDownContainer;
  }
  dropDownClicked(event) {
    if (event.button !== 0) {
      return;
    }
    if (this.triggerDropDownTimeout) {
      clearTimeout(this.triggerDropDownTimeout);
      this.triggerDropDownTimeout = null;
    }
    const rect = this.dropDownButton.getBoundingClientRect();
    const menu5 = new ContextMenu(event, {
      x: rect.left,
      y: rect.bottom,
      onSoftMenuClosed: () => {
        setExpanded(this.dropDownButton, false);
      }
    });
    for (const tab of this.tabs) {
      if (tab.shown) {
        continue;
      }
      if (this.numberOfTabsShown() === 0 && this.tabsHistory[0] === tab) {
        menu5.defaultSection().appendCheckboxItem(tab.title, this.dropDownMenuItemSelected.bind(this, tab), { checked: true, jslogContext: tab.jslogContext });
      } else {
        menu5.defaultSection().appendItem(tab.title, this.dropDownMenuItemSelected.bind(this, tab), { jslogContext: tab.jslogContext });
      }
    }
    void menu5.show().then(() => setExpanded(this.dropDownButton, menu5.isHostedMenuOpen()));
  }
  dropDownKeydown(event) {
    if (Platform7.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      this.dropDownButton.click();
      event.consume(true);
    }
  }
  dropDownMenuItemSelected(tab) {
    this.selectTab(tab.id, true, true);
  }
  totalWidth() {
    return this.headerContentsElement.getBoundingClientRect().width;
  }
  numberOfTabsShown() {
    let numTabsShown = 0;
    for (const tab of this.tabs) {
      if (tab.shown) {
        numTabsShown++;
      }
    }
    return numTabsShown;
  }
  updateTabsDropDown() {
    const tabsToShowIndexes = this.tabsToShowIndexes(this.tabs, this.tabsHistory, this.totalWidth(), this.measuredDropDownButtonWidth || 0);
    if (this.lastSelectedOverflowTab && this.numberOfTabsShown() !== tabsToShowIndexes.length) {
      delete this.lastSelectedOverflowTab;
      this.updateTabsDropDown();
      return;
    }
    for (let i = 0; i < this.tabs.length; ++i) {
      if (this.tabs[i].shown && tabsToShowIndexes.indexOf(i) === -1) {
        this.hideTabElement(this.tabs[i]);
      }
    }
    for (let i = 0; i < tabsToShowIndexes.length; ++i) {
      const tab = this.tabs[tabsToShowIndexes[i]];
      if (!tab.shown) {
        this.showTabElement(i, tab);
      }
    }
    this.maybeShowDropDown(tabsToShowIndexes.length !== this.tabs.length);
  }
  maybeShowDropDown(hasMoreTabs) {
    if (hasMoreTabs && !this.dropDownButton.parentElement) {
      this.headerContentsElement.appendChild(this.dropDownButton);
    } else if (!hasMoreTabs && this.dropDownButton.parentElement) {
      this.headerContentsElement.removeChild(this.dropDownButton);
    }
  }
  measureDropDownButton() {
    if (this.measuredDropDownButtonWidth) {
      return;
    }
    this.dropDownButton.classList.add("measuring");
    this.headerContentsElement.appendChild(this.dropDownButton);
    this.measuredDropDownButtonWidth = this.dropDownButton.getBoundingClientRect().width;
    this.headerContentsElement.removeChild(this.dropDownButton);
    this.dropDownButton.classList.remove("measuring");
  }
  updateWidths() {
    const measuredWidths = this.measureWidths();
    const maxWidth = this.shrinkableTabs ? this.calculateMaxWidth(measuredWidths.slice(), this.totalWidth()) : Number.MAX_VALUE;
    let i = 0;
    for (const tab of this.tabs) {
      tab.setWidth(this.verticalTabLayout ? -1 : Math.min(maxWidth, measuredWidths[i++]));
    }
  }
  measureWidths() {
    this.tabsElement.style.setProperty("width", "2000px");
    const measuringTabElements = /* @__PURE__ */ new Map();
    for (const tab of this.tabs) {
      if (typeof tab.measuredWidth === "number") {
        continue;
      }
      const measuringTabElement = tab.createTabElement(
        /* measure */
        true
      );
      measuringTabElements.set(measuringTabElement, tab);
      this.tabsElement.appendChild(measuringTabElement);
    }
    for (const [measuringTabElement, tab] of measuringTabElements) {
      const width = measuringTabElement.getBoundingClientRect().width;
      tab.measuredWidth = Math.ceil(width);
    }
    for (const measuringTabElement of measuringTabElements.keys()) {
      measuringTabElement.remove();
    }
    const measuredWidths = [];
    for (const tab of this.tabs) {
      measuredWidths.push(tab.measuredWidth || 0);
    }
    this.tabsElement.style.removeProperty("width");
    return measuredWidths;
  }
  calculateMaxWidth(measuredWidths, totalWidth) {
    if (!measuredWidths.length) {
      return 0;
    }
    measuredWidths.sort(function(x, y) {
      return x - y;
    });
    let totalMeasuredWidth = 0;
    for (let i = 0; i < measuredWidths.length; ++i) {
      totalMeasuredWidth += measuredWidths[i];
    }
    if (totalWidth >= totalMeasuredWidth) {
      return measuredWidths[measuredWidths.length - 1];
    }
    let totalExtraWidth = 0;
    for (let i = measuredWidths.length - 1; i > 0; --i) {
      const extraWidth = measuredWidths[i] - measuredWidths[i - 1];
      totalExtraWidth += (measuredWidths.length - i) * extraWidth;
      if (totalWidth + totalExtraWidth >= totalMeasuredWidth) {
        return measuredWidths[i - 1] + (totalWidth + totalExtraWidth - totalMeasuredWidth) / (measuredWidths.length - i);
      }
    }
    return totalWidth / measuredWidths.length;
  }
  tabsToShowIndexes(tabsOrdered, tabsHistory, totalWidth, measuredDropDownButtonWidth) {
    const tabsToShowIndexes = [];
    let totalTabsWidth = 0;
    const tabCount = tabsOrdered.length;
    const tabsToLookAt = tabsOrdered.slice(0);
    if (this.currentTab !== void 0) {
      tabsToLookAt.unshift(tabsToLookAt.splice(tabsToLookAt.indexOf(this.currentTab), 1)[0]);
    }
    if (this.lastSelectedOverflowTab !== void 0) {
      tabsToLookAt.unshift(tabsToLookAt.splice(tabsToLookAt.indexOf(this.lastSelectedOverflowTab), 1)[0]);
    }
    for (let i = 0; i < tabCount; ++i) {
      const tab = this.automaticReorder ? tabsHistory[i] : tabsToLookAt[i];
      totalTabsWidth += tab.width();
      let minimalRequiredWidth = totalTabsWidth;
      if (i !== tabCount - 1) {
        minimalRequiredWidth += measuredDropDownButtonWidth;
      }
      if (!this.verticalTabLayout && minimalRequiredWidth > totalWidth) {
        break;
      }
      tabsToShowIndexes.push(tabsOrdered.indexOf(tab));
    }
    tabsToShowIndexes.sort(function(x, y) {
      return x - y;
    });
    return tabsToShowIndexes;
  }
  hideCurrentTab() {
    if (!this.currentTab) {
      return;
    }
    this.hideTab(this.currentTab);
    delete this.currentTab;
  }
  showTab(tab) {
    tab.tabElement.tabIndex = 0;
    tab.tabElement.classList.add("selected");
    setSelected(tab.tabElement, true);
    tab.view.show(this.element);
    this.updateTabSlider();
  }
  updateTabSlider() {
    if (!this.sliderEnabled) {
      return;
    }
    if (!this.currentTab) {
      this.tabSlider.style.width = "0";
      return;
    }
    let left = 0;
    for (let i = 0; i < this.tabs.length && this.currentTab !== this.tabs[i]; i++) {
      if (this.tabs[i].shown) {
        left += this.tabs[i].measuredWidth || 0;
      }
    }
    const sliderWidth = this.currentTab.shown ? this.currentTab.measuredWidth : this.dropDownButton.offsetWidth;
    const scaleFactor = window.devicePixelRatio >= 1.5 ? " scaleY(0.75)" : "";
    this.tabSlider.style.transform = "translateX(" + left + "px)" + scaleFactor;
    this.tabSlider.style.width = sliderWidth + "px";
    if (this.tabSlider.parentElement !== this.headerContentsElement) {
      this.headerContentsElement.appendChild(this.tabSlider);
    }
  }
  hideTab(tab) {
    tab.tabElement.removeAttribute("tabIndex");
    tab.tabElement.classList.remove("selected");
    tab.tabElement.tabIndex = -1;
    tab.tabElement.setAttribute("aria-selected", "false");
    tab.view.detach();
  }
  elementsToRestoreScrollPositionsFor() {
    return [this.#contentElement];
  }
  insertBefore(tab, index) {
    this.tabsElement.insertBefore(tab.tabElement, this.tabsElement.childNodes[index]);
    const oldIndex = this.tabs.indexOf(tab);
    this.tabs.splice(oldIndex, 1);
    if (oldIndex < index) {
      --index;
    }
    this.tabs.splice(index, 0, tab);
    const eventData = { prevTabId: void 0, tabId: tab.id, view: tab.view, isUserGesture: void 0 };
    this.dispatchEventToListeners(Events.TabOrderChanged, eventData);
  }
  leftToolbar() {
    if (!this.#leftToolbar) {
      this.#leftToolbar = document.createElement("devtools-toolbar");
      this.#leftToolbar.classList.add("tabbed-pane-left-toolbar");
      this.#headerElement.insertBefore(this.#leftToolbar, this.#headerElement.firstChild);
    }
    return this.#leftToolbar;
  }
  rightToolbar() {
    if (!this.#rightToolbar) {
      this.#rightToolbar = document.createElement("devtools-toolbar");
      this.#rightToolbar.classList.add("tabbed-pane-right-toolbar");
      this.#headerElement.appendChild(this.#rightToolbar);
    }
    return this.#rightToolbar;
  }
  setAllowTabReorder(allow, automatic) {
    this.allowTabReorder = allow;
    this.automaticReorder = automatic;
  }
  keyDown(event) {
    if (!this.currentTab) {
      return;
    }
    let nextTabElement = null;
    switch (event.key) {
      case "ArrowUp":
      case "ArrowLeft":
        nextTabElement = this.currentTab.tabElement.previousElementSibling;
        if (!nextTabElement && !this.dropDownButton.parentElement) {
          nextTabElement = this.currentTab.tabElement.parentElement ? this.currentTab.tabElement.parentElement.lastElementChild : null;
        }
        break;
      case "ArrowDown":
      case "ArrowRight":
        nextTabElement = this.currentTab.tabElement.nextElementSibling;
        if (!nextTabElement && !this.dropDownButton.parentElement) {
          nextTabElement = this.currentTab.tabElement.parentElement ? this.currentTab.tabElement.parentElement.firstElementChild : null;
        }
        break;
      case "Enter":
      case " ":
        this.currentTab.view.focus();
        return;
      default:
        return;
    }
    if (!nextTabElement) {
      this.dropDownButton.click();
      return;
    }
    const tab = this.tabs.find((tab2) => tab2.tabElement === nextTabElement);
    if (tab) {
      this.selectTab(tab.id, true);
    }
    nextTabElement.focus();
  }
};
var Events;
(function(Events3) {
  Events3["TabInvoked"] = "TabInvoked";
  Events3["TabSelected"] = "TabSelected";
  Events3["TabClosed"] = "TabClosed";
  Events3["TabOrderChanged"] = "TabOrderChanged";
  Events3["PaneVisibilityChanged"] = "PaneVisibilityChanged";
})(Events || (Events = {}));
var TabbedPaneTab = class {
  closeable;
  previewFeature = false;
  tabbedPane;
  #id;
  #title;
  #tooltip;
  #view;
  shown;
  measuredWidth;
  #tabElement;
  icon = null;
  suffixElement = null;
  #width;
  delegate;
  titleElement;
  dragStartX;
  #jslogContext;
  constructor(tabbedPane, id2, title, closeable, previewFeature, view, tooltip, jslogContext) {
    this.closeable = closeable;
    this.previewFeature = previewFeature;
    this.tabbedPane = tabbedPane;
    this.#id = id2;
    this.#title = title;
    this.#tooltip = tooltip;
    this.#view = view;
    this.shown = false;
    this.#jslogContext = jslogContext;
  }
  get id() {
    return this.#id;
  }
  get title() {
    return this.#title;
  }
  set title(title) {
    if (title === this.#title) {
      return;
    }
    this.#title = title;
    if (this.titleElement) {
      this.titleElement.textContent = title;
      const closeIconContainer = this.#tabElement?.querySelector(".close-button");
      closeIconContainer?.setAttribute("title", i18nString4(UIStrings4.closeS, { PH1: title }));
      closeIconContainer?.setAttribute("aria-label", i18nString4(UIStrings4.closeS, { PH1: title }));
    }
    delete this.measuredWidth;
  }
  get jslogContext() {
    return this.#jslogContext ?? (this.#id === "console-view" ? "console" : this.#id);
  }
  isCloseable() {
    return this.closeable;
  }
  setIcon(icon) {
    this.icon = icon;
    if (this.#tabElement && this.titleElement) {
      this.createIconElement(this.#tabElement, this.titleElement, false);
    }
    delete this.measuredWidth;
  }
  setSuffixElement(suffixElement) {
    this.suffixElement = suffixElement;
    if (this.#tabElement && this.titleElement) {
      this.createSuffixElement(this.#tabElement, this.titleElement, false);
    }
    delete this.measuredWidth;
  }
  toggleClass(className, force) {
    const element = this.tabElement;
    const hasClass = element.classList.contains(className);
    if (hasClass === force) {
      return false;
    }
    element.classList.toggle(className, force);
    delete this.measuredWidth;
    return true;
  }
  get view() {
    return this.#view;
  }
  set view(view) {
    this.#view = view;
  }
  get tooltip() {
    return this.#tooltip;
  }
  set tooltip(tooltip) {
    this.#tooltip = tooltip;
    if (this.titleElement) {
      Tooltip.install(this.titleElement, tooltip || "");
    }
  }
  get tabElement() {
    if (!this.#tabElement) {
      this.#tabElement = this.createTabElement(false);
    }
    return this.#tabElement;
  }
  width() {
    return this.#width || 0;
  }
  setWidth(width) {
    this.tabElement.style.width = width === -1 ? "" : width + "px";
    this.#width = width;
  }
  setDelegate(delegate) {
    this.delegate = delegate;
  }
  createIconElement(tabElement, titleElement, measuring) {
    const iconElement = tabIcons.get(tabElement);
    if (iconElement) {
      iconElement.remove();
      tabIcons.delete(tabElement);
    }
    if (!this.icon) {
      return;
    }
    const iconContainer = document.createElement("span");
    iconContainer.classList.add("tabbed-pane-header-tab-icon");
    const iconNode = measuring ? this.createMeasureClone(this.icon) : this.icon;
    iconContainer.appendChild(iconNode);
    titleElement.insertAdjacentElement("beforebegin", iconContainer);
    tabIcons.set(tabElement, iconContainer);
  }
  createSuffixElement(tabElement, titleElement, measuring) {
    const tabSuffixElement = tabSuffixElements.get(tabElement);
    if (tabSuffixElement) {
      tabSuffixElement.remove();
      tabSuffixElements.delete(tabElement);
    }
    if (!this.suffixElement) {
      return;
    }
    const suffixElementContainer = document.createElement("span");
    suffixElementContainer.classList.add("tabbed-pane-header-tab-suffix-element");
    const suffixElement = measuring ? this.suffixElement.cloneNode() : this.suffixElement;
    suffixElementContainer.appendChild(suffixElement);
    titleElement.insertAdjacentElement("afterend", suffixElementContainer);
    tabSuffixElements.set(tabElement, suffixElementContainer);
  }
  createMeasureClone(original) {
    const fakeClone = document.createElement("div");
    fakeClone.style.width = original.style.width;
    fakeClone.style.height = original.style.height;
    return fakeClone;
  }
  createTabElement(measuring) {
    const tabElement = document.createElement("div");
    tabElement.classList.add("tabbed-pane-header-tab");
    tabElement.id = "tab-" + this.#id;
    markAsTab(tabElement);
    setSelected(tabElement, false);
    setLabel(tabElement, this.title);
    const titleElement = tabElement.createChild("span", "tabbed-pane-header-tab-title");
    titleElement.textContent = this.title;
    Tooltip.install(titleElement, this.tooltip || "");
    this.createIconElement(tabElement, titleElement, measuring);
    this.createSuffixElement(tabElement, titleElement, measuring);
    if (!measuring) {
      this.titleElement = titleElement;
    }
    if (this.previewFeature) {
      const previewIcon = this.createPreviewIcon();
      tabElement.appendChild(previewIcon);
      tabElement.classList.add("preview");
    }
    if (this.closeable) {
      const closeIcon = this.createCloseIconButton();
      tabElement.appendChild(closeIcon);
      tabElement.classList.add("closeable");
    }
    if (measuring) {
      tabElement.classList.add("measuring");
    } else {
      tabElement.addEventListener("click", this.tabClicked.bind(this), false);
      tabElement.addEventListener("keydown", this.tabKeyDown.bind(this), false);
      tabElement.addEventListener("auxclick", this.tabClicked.bind(this), false);
      tabElement.addEventListener("mousedown", this.tabMouseDown.bind(this), false);
      tabElement.addEventListener("mouseup", this.tabMouseUp.bind(this), false);
      tabElement.addEventListener("contextmenu", this.tabContextMenu.bind(this), false);
      if (this.tabbedPane.allowTabReorder) {
        installDragHandle(tabElement, this.startTabDragging.bind(this), this.tabDragging.bind(this), this.endTabDragging.bind(this), null, null, 200);
      }
    }
    return tabElement;
  }
  createCloseIconButton() {
    const closeButton = new Buttons2.Button.Button();
    closeButton.data = {
      variant: "icon",
      size: "MICRO",
      iconName: "cross",
      title: i18nString4(UIStrings4.closeS, { PH1: this.title })
    };
    closeButton.classList.add("close-button", "tabbed-pane-close-button");
    closeButton.setAttribute("jslog", `${VisualLogging5.close().track({ click: true })}`);
    closeButton.setAttribute("aria-label", i18nString4(UIStrings4.closeS, { PH1: this.title }));
    return closeButton;
  }
  createPreviewIcon() {
    const iconContainer = document.createElement("div");
    iconContainer.classList.add("preview-icon");
    const previewIcon = new IconButton2.Icon.Icon();
    previewIcon.name = "experiment";
    previewIcon.classList.add("small");
    iconContainer.appendChild(previewIcon);
    iconContainer.setAttribute("title", i18nString4(UIStrings4.previewFeature));
    iconContainer.setAttribute("aria-label", i18nString4(UIStrings4.previewFeature));
    return iconContainer;
  }
  isCloseIconClicked(element) {
    return element?.classList.contains("tabbed-pane-close-button") || element?.parentElement?.classList.contains("tabbed-pane-close-button") || false;
  }
  tabKeyDown(ev) {
    const event = ev;
    switch (event.key) {
      case "Enter":
      case " ":
        if (this.isCloseIconClicked(event.target)) {
          this.closeTabs([this.id]);
          ev.consume(true);
          return;
        }
    }
  }
  tabClicked(event) {
    const middleButton = event.button === 1;
    const shouldClose = this.closeable && (middleButton || this.isCloseIconClicked(event.target));
    if (!shouldClose) {
      this.tabbedPane.focus();
      return;
    }
    this.closeTabs([this.id]);
    event.consume(true);
  }
  tabMouseDown(event) {
    if (this.isCloseIconClicked(event.target) || event.button !== 0) {
      return;
    }
    this.tabbedPane.selectTab(this.id, true);
  }
  tabMouseUp(event) {
    if (event.button === 1) {
      event.consume(true);
    }
  }
  closeTabs(ids) {
    if (this.delegate) {
      this.delegate.closeTabs(this.tabbedPane, ids);
      return;
    }
    this.tabbedPane.closeTabs(ids, true);
  }
  tabContextMenu(event) {
    function close5() {
      this.closeTabs([this.id]);
    }
    function closeOthers() {
      this.closeTabs(this.tabbedPane.otherTabs(this.id));
    }
    function closeAll() {
      this.closeTabs(this.tabbedPane.tabIds());
    }
    function closeToTheRight() {
      this.closeTabs(this.tabbedPane.tabsToTheRight(this.id));
    }
    function moveTabForward(tabIndex2) {
      this.tabbedPane.moveTabForward(this.id, tabIndex2);
    }
    function moveTabBackward(tabIndex2) {
      this.tabbedPane.moveTabBackward(this.id, tabIndex2);
    }
    const contextMenu = new ContextMenu(event);
    if (this.closeable) {
      contextMenu.defaultSection().appendItem(i18nString4(UIStrings4.close), close5.bind(this), { jslogContext: "close" });
      contextMenu.defaultSection().appendItem(i18nString4(UIStrings4.closeOthers), closeOthers.bind(this), { jslogContext: "close-others" });
      contextMenu.defaultSection().appendItem(i18nString4(UIStrings4.closeTabsToTheRight), closeToTheRight.bind(this), { jslogContext: "close-tabs-to-the-right" });
      contextMenu.defaultSection().appendItem(i18nString4(UIStrings4.closeAll), closeAll.bind(this), { jslogContext: "close-all" });
    }
    if (this.delegate) {
      this.delegate.onContextMenu(this.id, contextMenu);
    }
    const tabIndex = this.tabbedPane.getTabIndex(this.id);
    if (tabIndex > 0) {
      contextMenu.defaultSection().appendItem(i18nString4(UIStrings4.moveTabLeft), moveTabBackward.bind(this, tabIndex), { jslogContext: "move-tab-backward" });
    }
    if (tabIndex < this.tabbedPane.tabsElement.childNodes.length - 1) {
      contextMenu.defaultSection().appendItem(i18nString4(UIStrings4.moveTabRight), moveTabForward.bind(this, tabIndex), { jslogContext: "move-tab-forward" });
    }
    void contextMenu.show();
  }
  startTabDragging(event) {
    if (this.isCloseIconClicked(event.target)) {
      return false;
    }
    this.dragStartX = event.pageX;
    if (this.#tabElement) {
      this.#tabElement.classList.add("dragging");
    }
    this.tabbedPane.tabSlider.remove();
    return true;
  }
  tabDragging(event) {
    const tabElements = this.tabbedPane.tabsElement.childNodes;
    for (let i = 0; i < tabElements.length; ++i) {
      let tabElement2 = tabElements[i];
      if (!this.#tabElement || tabElement2 === this.#tabElement) {
        continue;
      }
      const intersects = tabElement2.offsetLeft + tabElement2.clientWidth > this.#tabElement.offsetLeft && this.#tabElement.offsetLeft + this.#tabElement.clientWidth > tabElement2.offsetLeft;
      if (!intersects) {
        continue;
      }
      const dragStartX2 = this.dragStartX;
      if (Math.abs(event.pageX - dragStartX2) < tabElement2.clientWidth / 2 + 5) {
        break;
      }
      if (event.pageX - dragStartX2 > 0) {
        tabElement2 = tabElement2.nextSibling;
        ++i;
      }
      const oldOffsetLeft = this.#tabElement.offsetLeft;
      this.tabbedPane.insertBefore(this, i);
      this.dragStartX = dragStartX2 + this.#tabElement.offsetLeft - oldOffsetLeft;
      break;
    }
    const dragStartX = this.dragStartX;
    const tabElement = this.#tabElement;
    if (!tabElement.previousSibling && event.pageX - dragStartX < 0) {
      tabElement.style.setProperty("left", "0px");
      return;
    }
    if (!tabElement.nextSibling && event.pageX - dragStartX > 0) {
      tabElement.style.setProperty("left", "0px");
      return;
    }
    tabElement.style.setProperty("left", event.pageX - dragStartX + "px");
  }
  endTabDragging(_event) {
    const tabElement = this.#tabElement;
    tabElement.classList.remove("dragging");
    tabElement.style.removeProperty("left");
    delete this.dragStartX;
    this.tabbedPane.updateTabSlider();
  }
};
var tabIcons = /* @__PURE__ */ new WeakMap();
var tabSuffixElements = /* @__PURE__ */ new WeakMap();

// gen/front_end/ui/legacy/ViewManager.js
var ViewManager_exports = {};
__export(ViewManager_exports, {
  ContainerWidget: () => ContainerWidget,
  PreRegisteredView: () => PreRegisteredView,
  ViewManager: () => ViewManager,
  defaultOptionsForTabs: () => defaultOptionsForTabs,
  getLocalizedViewLocationCategory: () => getLocalizedViewLocationCategory,
  getRegisteredLocationResolvers: () => getRegisteredLocationResolvers,
  getRegisteredViewExtensions: () => getRegisteredViewExtensions,
  maybeRemoveViewExtension: () => maybeRemoveViewExtension,
  registerLocationResolver: () => registerLocationResolver,
  registerViewExtension: () => registerViewExtension,
  resetViewRegistration: () => resetViewRegistration
});
import * as Common9 from "./../../core/common/common.js";
import * as Host4 from "./../../core/host/host.js";
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as Platform8 from "./../../core/platform/platform.js";
import * as Root3 from "./../../core/root/root.js";
import * as IconButton3 from "./../components/icon_button/icon_button.js";
import * as VisualLogging6 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/viewContainers.css.js
var viewContainers_css_default = `/* Copyright 2025 The Chromium Authors
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file. */

/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

.expandable-view-title {
  display: flex;
  align-items: center;
  background-color: var(--sys-color-surface2);
  height: 22px;
  padding: 0 5px;
  white-space: nowrap;
  overflow: hidden;
  position: relative;
  border-bottom: 1px solid transparent;
}

.expandable-view-title.expanded,
.expandable-view-title:last-child {
  border-bottom: 1px solid var(--sys-color-divider);
}

.expandable-view-title devtools-toolbar {
  margin-top: -3px;
}

.expandable-view-title > devtools-toolbar {
  position: absolute;
  right: 0;
  top: 0;
}

.expandable-view-title:not(.expanded) devtools-toolbar {
  display: none;
}

.title-expand-icon {
  margin-right: 2px;
  margin-bottom: -2px;
}

.expandable-view-title:focus-visible {
  background-color: var(--sys-color-state-focus-highlight);

  :host-context(.accessibility-sidebar-view) & {
    background-color: var(--sys-color-tonal-container);
  }
}

@media (forced-colors: active) {
  .expandable-view-title:focus-visible {
    forced-color-adjust: none;
    color: HighlightText;
    background-color: Highlight;
    box-shadow: 0 0 0 2px Highlight inset;
  }

  .expandable-view-title:focus-visible .title-expand-icon {
    color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./viewContainers.css")} */`;

// gen/front_end/ui/legacy/ViewRegistration.js
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as Root2 from "./../../core/root/root.js";
var UIStrings5 = {
  /**
   * @description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Elements' panel.
   */
  elements: "Elements",
  /**
   * @description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Drawer' panel.
   */
  drawer: "Drawer",
  /**
   * @description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Drawer sidebar' panel.
   */
  drawer_sidebar: "Drawer sidebar",
  /**
   * @description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Panel'.
   */
  panel: "Panel",
  /**
   * @description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Network' panel.
   */
  network: "Network",
  /**
   * @description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Settings' panel.
   */
  settings: "Settings",
  /**
   * @description Badge label for an entry in the Quick Open menu. Selecting the entry opens the 'Sources' panel.
   */
  sources: "Sources"
};
var str_5 = i18n9.i18n.registerUIStrings("ui/legacy/ViewRegistration.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var registeredViewExtensions = [];
var viewIdSet = /* @__PURE__ */ new Set();
function registerViewExtension(registration) {
  const viewId = registration.id;
  if (viewIdSet.has(viewId)) {
    throw new Error(`Duplicate view id '${viewId}'`);
  }
  viewIdSet.add(viewId);
  registeredViewExtensions.push(new PreRegisteredView(registration));
}
function getRegisteredViewExtensions() {
  return registeredViewExtensions.filter((view) => Root2.Runtime.Runtime.isDescriptorEnabled({ experiment: view.experiment(), condition: view.condition() }));
}
function maybeRemoveViewExtension(viewId) {
  const viewIndex = registeredViewExtensions.findIndex((view) => view.viewId() === viewId);
  if (viewIndex < 0 || !viewIdSet.delete(viewId)) {
    return false;
  }
  registeredViewExtensions.splice(viewIndex, 1);
  return true;
}
var registeredLocationResolvers = [];
var viewLocationNameSet = /* @__PURE__ */ new Set();
function registerLocationResolver(registration) {
  const locationName = registration.name;
  if (viewLocationNameSet.has(locationName)) {
    throw new Error(`Duplicate view location name registration '${locationName}'`);
  }
  viewLocationNameSet.add(locationName);
  registeredLocationResolvers.push(registration);
}
function getRegisteredLocationResolvers() {
  return registeredLocationResolvers;
}
function resetViewRegistration() {
  registeredViewExtensions.length = 0;
  registeredLocationResolvers.length = 0;
  viewLocationNameSet.clear();
  viewIdSet.clear();
}
function getLocalizedViewLocationCategory(category) {
  switch (category) {
    case "ELEMENTS":
      return i18nString5(UIStrings5.elements);
    case "DRAWER":
      return i18nString5(UIStrings5.drawer);
    case "DRAWER_SIDEBAR":
      return i18nString5(UIStrings5.drawer_sidebar);
    case "PANEL":
      return i18nString5(UIStrings5.panel);
    case "NETWORK":
      return i18nString5(UIStrings5.network);
    case "SETTINGS":
      return i18nString5(UIStrings5.settings);
    case "SOURCES":
      return i18nString5(UIStrings5.sources);
    case "":
      return i18n9.i18n.lockedString("");
  }
}

// gen/front_end/ui/legacy/ViewManager.js
var UIStrings6 = {
  /**
   * @description Aria label for the tab panel view container
   * @example {Sensors} PH1
   */
  sPanel: "{PH1} panel"
};
var str_6 = i18n11.i18n.registerUIStrings("ui/legacy/ViewManager.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var defaultOptionsForTabs = {
  security: true,
  freestyler: true
};
var PreRegisteredView = class {
  viewRegistration;
  widgetPromise;
  constructor(viewRegistration) {
    this.viewRegistration = viewRegistration;
    this.widgetPromise = null;
  }
  title() {
    return this.viewRegistration.title();
  }
  commandPrompt() {
    return this.viewRegistration.commandPrompt();
  }
  isCloseable() {
    return this.viewRegistration.persistence === "closeable";
  }
  isPreviewFeature() {
    return Boolean(this.viewRegistration.isPreviewFeature);
  }
  featurePromotionId() {
    return this.viewRegistration.featurePromotionId;
  }
  iconName() {
    return this.viewRegistration.iconName;
  }
  isTransient() {
    return this.viewRegistration.persistence === "transient";
  }
  viewId() {
    return this.viewRegistration.id;
  }
  location() {
    return this.viewRegistration.location;
  }
  order() {
    return this.viewRegistration.order;
  }
  settings() {
    return this.viewRegistration.settings;
  }
  tags() {
    if (this.viewRegistration.tags) {
      return this.viewRegistration.tags.map((tag) => tag()).join("\0");
    }
    return void 0;
  }
  persistence() {
    return this.viewRegistration.persistence;
  }
  async toolbarItems() {
    if (!this.viewRegistration.hasToolbar) {
      return [];
    }
    const provider = await this.widget();
    return provider.toolbarItems();
  }
  widget() {
    if (this.widgetPromise === null) {
      this.widgetPromise = this.viewRegistration.loadView();
    }
    return this.widgetPromise;
  }
  async disposeView() {
    if (this.widgetPromise === null) {
      return;
    }
    const widget = await this.widgetPromise;
    await widget.ownerViewDisposed();
  }
  experiment() {
    return this.viewRegistration.experiment;
  }
  condition() {
    return this.viewRegistration.condition;
  }
};
var viewManagerInstance;
var ViewManager = class _ViewManager extends Common9.ObjectWrapper.ObjectWrapper {
  views = /* @__PURE__ */ new Map();
  locationNameByViewId = /* @__PURE__ */ new Map();
  locationOverrideSetting;
  constructor() {
    super();
    this.locationOverrideSetting = Common9.Settings.Settings.instance().createSetting("views-location-override", {});
    const preferredExtensionLocations = this.locationOverrideSetting.get();
    const viewsByLocation = /* @__PURE__ */ new Map();
    for (const view of getRegisteredViewExtensions()) {
      const location = view.location() || "none";
      const views = viewsByLocation.get(location) || [];
      views.push(view);
      viewsByLocation.set(location, views);
    }
    let sortedViewExtensions = [];
    for (const views of viewsByLocation.values()) {
      views.sort((firstView, secondView) => {
        const firstViewOrder = firstView.order();
        const secondViewOrder = secondView.order();
        if (firstViewOrder !== void 0 && secondViewOrder !== void 0) {
          return firstViewOrder - secondViewOrder;
        }
        return 0;
      });
      sortedViewExtensions = sortedViewExtensions.concat(views);
    }
    for (const view of sortedViewExtensions) {
      const viewId = view.viewId();
      const location = view.location();
      if (this.views.has(viewId)) {
        throw new Error(`Duplicate view id '${viewId}'`);
      }
      if (!Platform8.StringUtilities.isExtendedKebabCase(viewId)) {
        throw new Error(`Invalid view ID '${viewId}'`);
      }
      this.views.set(viewId, view);
      const locationName = preferredExtensionLocations[viewId] || location;
      this.locationNameByViewId.set(viewId, locationName);
    }
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!viewManagerInstance || forceNew) {
      viewManagerInstance = new _ViewManager();
    }
    return viewManagerInstance;
  }
  static removeInstance() {
    viewManagerInstance = void 0;
  }
  static createToolbar(toolbarItems) {
    if (!toolbarItems.length) {
      return null;
    }
    const toolbar4 = document.createElement("devtools-toolbar");
    for (const item8 of toolbarItems) {
      toolbar4.appendToolbarItem(item8);
    }
    return toolbar4;
  }
  locationNameForViewId(viewId) {
    const locationName = this.locationNameByViewId.get(viewId);
    if (!locationName) {
      throw new Error(`No location name for view with id ${viewId}`);
    }
    return locationName;
  }
  /**
   * Moves a view to a new location
   */
  moveView(viewId, locationName, options) {
    const defaultOptions = { shouldSelectTab: true, overrideSaving: false };
    const { shouldSelectTab, overrideSaving } = options || defaultOptions;
    if (!viewId || !locationName) {
      return;
    }
    const view = this.view(viewId);
    if (!view) {
      return;
    }
    if (!overrideSaving) {
      this.locationNameByViewId.set(viewId, locationName);
      const locations = this.locationOverrideSetting.get();
      locations[viewId] = locationName;
      this.locationOverrideSetting.set(locations);
    }
    void this.resolveLocation(locationName).then((location) => {
      if (!location) {
        throw new Error("Move view: Could not resolve location for view: " + viewId);
      }
      location.reveal();
      return location.showView(
        view,
        void 0,
        /* userGesture*/
        true,
        /* omitFocus*/
        false,
        shouldSelectTab
      );
    });
  }
  revealView(view) {
    const location = locationForView.get(view);
    if (!location) {
      return Promise.resolve();
    }
    location.reveal();
    return location.showView(view);
  }
  /**
   * Show view in location
   */
  showViewInLocation(viewId, locationName, shouldSelectTab = true) {
    this.moveView(viewId, locationName, {
      shouldSelectTab,
      overrideSaving: true
    });
  }
  view(viewId) {
    const view = this.views.get(viewId);
    if (!view) {
      throw new Error(`No view with id ${viewId} found!`);
    }
    return view;
  }
  materializedWidget(viewId) {
    const view = this.view(viewId);
    if (!view) {
      return null;
    }
    return widgetForView.get(view) || null;
  }
  hasView(viewId) {
    return this.views.has(viewId);
  }
  async showView(viewId, userGesture, omitFocus) {
    const view = this.views.get(viewId);
    if (!view) {
      console.error("Could not find view for id: '" + viewId + "' " + new Error().stack);
      return;
    }
    const location = locationForView.get(view) ?? await this.resolveLocation(this.locationNameByViewId.get(viewId));
    if (!location) {
      throw new Error("Could not resolve location for view: " + viewId);
    }
    location.reveal();
    await location.showView(view, void 0, userGesture, omitFocus);
  }
  isViewVisible(viewId) {
    const view = this.views.get(viewId);
    if (!view) {
      return false;
    }
    const location = locationForView.get(view);
    if (!location) {
      return false;
    }
    return location.isViewVisible(view);
  }
  async resolveLocation(location) {
    if (!location) {
      return null;
    }
    const registeredResolvers = getRegisteredLocationResolvers().filter((resolver) => resolver.name === location);
    if (registeredResolvers.length > 1) {
      throw new Error("Duplicate resolver for location: " + location);
    }
    if (registeredResolvers.length) {
      const resolver = await registeredResolvers[0].loadResolver();
      return resolver.resolveLocation(location);
    }
    throw new Error("Unresolved location: " + location);
  }
  createTabbedLocation(revealCallback, location, restoreSelection, allowReorder, defaultTab) {
    return new TabbedLocation(this, revealCallback, location, restoreSelection, allowReorder, defaultTab);
  }
  createStackLocation(revealCallback, location, jslogContext) {
    return new StackLocation(this, revealCallback, location, jslogContext);
  }
  hasViewsForLocation(location) {
    return Boolean(this.viewsForLocation(location).length);
  }
  viewsForLocation(location) {
    const result = [];
    for (const [id2, view] of this.views.entries()) {
      if (this.locationNameByViewId.get(id2) === location) {
        result.push(view);
      }
    }
    return result;
  }
};
var widgetForView = /* @__PURE__ */ new WeakMap();
var ContainerWidget = class extends VBox {
  view;
  materializePromise;
  constructor(view) {
    super();
    this.element.classList.add("flex-auto", "view-container", "overflow-auto");
    this.view = view;
    this.element.tabIndex = -1;
    markAsTabpanel(this.element);
    setLabel(this.element, i18nString6(UIStrings6.sPanel, { PH1: view.title() }));
    this.setDefaultFocusedElement(this.element);
  }
  materialize() {
    if (this.materializePromise) {
      return this.materializePromise;
    }
    const promises = [];
    promises.push(this.view.toolbarItems().then((toolbarItems) => {
      const toolbarElement = ViewManager.createToolbar(toolbarItems);
      if (toolbarElement) {
        this.element.insertBefore(toolbarElement, this.element.firstChild);
      }
    }));
    promises.push(this.view.widget().then((widget) => {
      const shouldFocus = this.element.hasFocus();
      this.setDefaultFocusedElement(null);
      widgetForView.set(this.view, widget);
      widget.show(this.element);
      if (shouldFocus) {
        widget.focus();
      }
    }));
    this.materializePromise = Promise.all(promises).then(() => {
    });
    return this.materializePromise;
  }
  wasShown() {
    super.wasShown();
    void this.materialize().then(() => {
      const widget = widgetForView.get(this.view);
      if (widget) {
        widget.show(this.element);
        this.wasShownForTest();
      }
    });
  }
  wasShownForTest() {
  }
};
var ExpandableContainerWidget = class extends VBox {
  titleElement;
  titleExpandIcon;
  view;
  widget;
  materializePromise;
  constructor(view) {
    super({ useShadowDom: true });
    this.element.classList.add("flex-none");
    this.registerRequiredCSS(viewContainers_css_default);
    this.titleElement = document.createElement("div");
    this.titleElement.classList.add("expandable-view-title");
    this.titleElement.setAttribute("jslog", `${VisualLogging6.sectionHeader().context(view.viewId()).track({
      click: true,
      keydown: "Enter|Space|ArrowLeft|ArrowRight"
    })}`);
    markAsTreeitem(this.titleElement);
    this.titleExpandIcon = IconButton3.Icon.create("triangle-right", "title-expand-icon");
    this.titleElement.appendChild(this.titleExpandIcon);
    const titleText = view.title();
    createTextChild(this.titleElement, titleText);
    setLabel(this.titleElement, titleText);
    setExpanded(this.titleElement, false);
    this.titleElement.tabIndex = 0;
    self.onInvokeElement(this.titleElement, this.toggleExpanded.bind(this));
    this.titleElement.addEventListener("keydown", this.onTitleKeyDown.bind(this), false);
    this.contentElement.insertBefore(this.titleElement, this.contentElement.firstChild);
    setControls(this.titleElement, this.contentElement.createChild("slot"));
    this.view = view;
    expandableContainerForView.set(view, this);
  }
  wasShown() {
    super.wasShown();
    if (this.widget && this.materializePromise) {
      void this.materializePromise.then(() => {
        if (this.titleElement.classList.contains("expanded") && this.widget) {
          this.widget.show(this.element);
        }
      });
    }
  }
  materialize() {
    if (this.materializePromise) {
      return this.materializePromise;
    }
    const promises = [];
    promises.push(this.view.toolbarItems().then((toolbarItems) => {
      const toolbarElement = ViewManager.createToolbar(toolbarItems);
      if (toolbarElement) {
        this.titleElement.appendChild(toolbarElement);
      }
    }));
    promises.push(this.view.widget().then((widget) => {
      this.widget = widget;
      widgetForView.set(this.view, widget);
      widget.show(this.element);
    }));
    this.materializePromise = Promise.all(promises).then(() => {
    });
    return this.materializePromise;
  }
  expand() {
    if (this.titleElement.classList.contains("expanded")) {
      return this.materialize();
    }
    this.titleElement.classList.add("expanded");
    setExpanded(this.titleElement, true);
    this.titleExpandIcon.name = "triangle-down";
    return this.materialize().then(() => {
      if (this.widget) {
        this.widget.show(this.element);
      }
    });
  }
  collapse() {
    if (!this.titleElement.classList.contains("expanded")) {
      return;
    }
    this.titleElement.classList.remove("expanded");
    setExpanded(this.titleElement, false);
    this.titleExpandIcon.name = "triangle-right";
    void this.materialize().then(() => {
      if (this.widget) {
        this.widget.detach();
      }
    });
  }
  toggleExpanded(event) {
    if (event.type === "keydown" && event.target !== this.titleElement) {
      return;
    }
    if (this.titleElement.classList.contains("expanded")) {
      this.collapse();
    } else {
      void this.expand();
    }
  }
  onTitleKeyDown(event) {
    if (event.target !== this.titleElement) {
      return;
    }
    const keyEvent = event;
    if (keyEvent.key === "ArrowLeft") {
      this.collapse();
    } else if (keyEvent.key === "ArrowRight") {
      if (!this.titleElement.classList.contains("expanded")) {
        void this.expand();
      } else if (this.widget) {
        this.widget.focus();
      }
    }
  }
};
var expandableContainerForView = /* @__PURE__ */ new WeakMap();
var Location = class {
  manager;
  revealCallback;
  #widget;
  constructor(manager, widget, revealCallback) {
    this.manager = manager;
    this.revealCallback = revealCallback;
    this.#widget = widget;
  }
  widget() {
    return this.#widget;
  }
  reveal() {
    if (this.revealCallback) {
      this.revealCallback();
    }
  }
  showView(_view, _insertBefore, _userGesture, _omitFocus, _shouldSelectTab) {
    throw new Error("not implemented");
  }
  removeView(_view) {
    throw new Error("not implemented");
  }
  isViewVisible(_view) {
    throw new Error("not implemented");
  }
};
var locationForView = /* @__PURE__ */ new WeakMap();
var TabbedLocation = class _TabbedLocation extends Location {
  #tabbedPane;
  location;
  allowReorder;
  closeableTabSetting;
  tabOrderSetting;
  lastSelectedTabSetting;
  defaultTab;
  views = /* @__PURE__ */ new Map();
  constructor(manager, revealCallback, location, restoreSelection, allowReorder, defaultTab) {
    const tabbedPane = new TabbedPane();
    if (allowReorder) {
      tabbedPane.setAllowTabReorder(true);
    }
    super(manager, tabbedPane, revealCallback);
    this.location = location;
    this.#tabbedPane = tabbedPane;
    this.allowReorder = allowReorder;
    this.#tabbedPane.addEventListener(Events.TabSelected, this.tabSelected, this);
    this.#tabbedPane.addEventListener(Events.TabClosed, this.tabClosed, this);
    this.#tabbedPane.addEventListener(Events.PaneVisibilityChanged, this.tabbedPaneVisibilityChanged, this);
    this.closeableTabSetting = Common9.Settings.Settings.instance().createSetting("closeable-tabs", {});
    this.setOrUpdateCloseableTabsSetting();
    this.tabOrderSetting = Common9.Settings.Settings.instance().createSetting(location + "-tab-order", {});
    this.#tabbedPane.addEventListener(Events.TabOrderChanged, this.persistTabOrder, this);
    if (restoreSelection) {
      this.lastSelectedTabSetting = Common9.Settings.Settings.instance().createSetting(location + "-selected-tab", "");
    }
    this.defaultTab = defaultTab;
    if (location) {
      this.appendApplicableItems(location);
    }
  }
  setOrUpdateCloseableTabsSetting() {
    const newClosable = {
      ...defaultOptionsForTabs,
      ...this.closeableTabSetting.get()
    };
    this.closeableTabSetting.set(newClosable);
  }
  widget() {
    return this.#tabbedPane;
  }
  tabbedPane() {
    return this.#tabbedPane;
  }
  enableMoreTabsButton() {
    const moreTabsButton = new ToolbarMenuButton(
      this.appendTabsToMenu.bind(this),
      /* isIconDropdown */
      true,
      void 0,
      "more-tabs",
      "dots-vertical"
    );
    this.#tabbedPane.leftToolbar().appendToolbarItem(moreTabsButton);
    return moreTabsButton;
  }
  appendApplicableItems(locationName) {
    const views = this.manager.viewsForLocation(locationName);
    if (this.allowReorder) {
      let i = 0;
      const persistedOrders = this.tabOrderSetting.get();
      const orders = /* @__PURE__ */ new Map();
      for (const view of views) {
        orders.set(view.viewId(), persistedOrders[view.viewId()] || ++i * _TabbedLocation.orderStep);
      }
      views.sort((a, b) => orders.get(a.viewId()) - orders.get(b.viewId()));
    }
    for (const view of views) {
      const id2 = view.viewId();
      this.views.set(id2, view);
      locationForView.set(view, this);
      if (view.isTransient()) {
        continue;
      }
      if (!view.isCloseable()) {
        this.appendTab(view);
      } else if (this.closeableTabSetting.get()[id2]) {
        this.appendTab(view);
      }
    }
    if (this.defaultTab) {
      if (this.#tabbedPane.hasTab(this.defaultTab)) {
        this.#tabbedPane.selectTab(this.defaultTab);
      } else {
        const view = Array.from(this.views.values()).find((view2) => view2.viewId() === this.defaultTab);
        if (view) {
          void this.showView(view);
        }
      }
    } else if (this.lastSelectedTabSetting && this.#tabbedPane.hasTab(this.lastSelectedTabSetting.get())) {
      this.#tabbedPane.selectTab(this.lastSelectedTabSetting.get());
    }
  }
  appendTabsToMenu(contextMenu) {
    const views = Array.from(this.views.values());
    views.sort((viewa, viewb) => viewa.title().localeCompare(viewb.title()));
    const freestylerView = views.find((view) => view.viewId() === "freestyler");
    if (freestylerView) {
      const featureName = Root3.Runtime.hostConfig.devToolsFreestyler?.featureName;
      const promotionId = freestylerView instanceof PreRegisteredView ? freestylerView.featurePromotionId() : void 0;
      const handler = () => {
        void this.showView(freestylerView, void 0, true);
        if (promotionId) {
          PromotionManager.instance().recordFeatureInteraction(promotionId);
        }
      };
      contextMenu.defaultSection().appendItem(freestylerView.title(), handler, {
        isPreviewFeature: freestylerView.isPreviewFeature(),
        jslogContext: freestylerView.viewId(),
        // Request to show a new badge in the native context menu only if:
        // 1. The promotion manager agrees that we may show it, or 2. the promotion manager doesn't track this badge.
        // Note that this is only a request to show the new badge, the back-end will decide whether
        // or not it will show it depending on the user education service.
        featureName: !promotionId || PromotionManager.instance().maybeShowPromotion(promotionId) ? featureName : void 0
      });
    }
    for (const view of views) {
      const title = view.title();
      if (view.viewId() === "issues-pane") {
        contextMenu.defaultSection().appendItem(title, () => {
          Host4.userMetrics.issuesPanelOpenedFrom(
            3
            /* Host.UserMetrics.IssueOpener.HAMBURGER_MENU */
          );
          void this.showView(view, void 0, true);
        }, { jslogContext: "issues-pane" });
        continue;
      }
      if (view.viewId() === "freestyler") {
        continue;
      }
      const isPreviewFeature = view.isPreviewFeature();
      contextMenu.defaultSection().appendItem(title, this.showView.bind(this, view, void 0, true), { isPreviewFeature, jslogContext: view.viewId() });
    }
  }
  appendTab(view, index) {
    this.#tabbedPane.appendTab(view.viewId(), view.title(), new ContainerWidget(view), void 0, false, view.isCloseable() || view.isTransient(), view.isPreviewFeature(), index);
    const iconName = view.iconName();
    if (iconName) {
      const icon = IconButton3.Icon.create(iconName);
      this.#tabbedPane.setTabIcon(view.viewId(), icon);
    }
  }
  appendView(view, insertBefore) {
    if (this.#tabbedPane.hasTab(view.viewId())) {
      return;
    }
    const oldLocation = locationForView.get(view);
    if (oldLocation && oldLocation !== this) {
      oldLocation.removeView(view);
    }
    locationForView.set(view, this);
    this.manager.views.set(view.viewId(), view);
    this.views.set(view.viewId(), view);
    let index = void 0;
    const tabIds = this.#tabbedPane.tabIds();
    if (this.allowReorder) {
      const orderSetting = this.tabOrderSetting.get();
      const order = orderSetting[view.viewId()];
      for (let i = 0; order && i < tabIds.length; ++i) {
        if (orderSetting[tabIds[i]] && orderSetting[tabIds[i]] > order) {
          index = i;
          break;
        }
      }
    } else if (insertBefore) {
      for (let i = 0; i < tabIds.length; ++i) {
        if (tabIds[i] === insertBefore.viewId()) {
          index = i;
          break;
        }
      }
    }
    this.appendTab(view, index);
    if (view.isCloseable()) {
      const tabs = this.closeableTabSetting.get();
      const tabId = view.viewId();
      if (!tabs[tabId]) {
        tabs[tabId] = true;
        this.closeableTabSetting.set(tabs);
      }
    }
    this.persistTabOrder();
  }
  async showView(view, insertBefore, userGesture, omitFocus, shouldSelectTab = true) {
    this.appendView(view, insertBefore);
    if (shouldSelectTab) {
      this.#tabbedPane.selectTab(view.viewId(), userGesture);
    }
    if (!omitFocus) {
      this.#tabbedPane.focus();
    }
    const widget = this.#tabbedPane.tabView(view.viewId());
    await widget.materialize();
  }
  removeView(view) {
    if (!this.#tabbedPane.hasTab(view.viewId())) {
      return;
    }
    locationForView.delete(view);
    this.manager.views.delete(view.viewId());
    this.#tabbedPane.closeTab(view.viewId());
    this.views.delete(view.viewId());
  }
  isViewVisible(view) {
    return this.#tabbedPane.isShowing() && this.#tabbedPane?.selectedTabId === view.viewId();
  }
  tabbedPaneVisibilityChanged(event) {
    if (!this.#tabbedPane.selectedTabId) {
      return;
    }
    this.manager.dispatchEventToListeners("ViewVisibilityChanged", {
      location: this.location,
      revealedViewId: event.data.isVisible ? this.#tabbedPane.selectedTabId : void 0,
      hiddenViewId: event.data.isVisible ? void 0 : this.#tabbedPane.selectedTabId
    });
  }
  tabSelected(event) {
    const { tabId, prevTabId, isUserGesture } = event.data;
    if (this.lastSelectedTabSetting && isUserGesture) {
      this.lastSelectedTabSetting.set(tabId);
    }
    this.manager.dispatchEventToListeners("ViewVisibilityChanged", {
      location: this.location,
      revealedViewId: tabId,
      hiddenViewId: prevTabId
    });
  }
  tabClosed(event) {
    const { tabId } = event.data;
    const tabs = this.closeableTabSetting.get();
    if (tabs[tabId]) {
      tabs[tabId] = false;
      this.closeableTabSetting.set(tabs);
    }
    const view = this.views.get(tabId);
    if (view) {
      void view.disposeView();
    }
  }
  persistTabOrder() {
    const tabIds = this.#tabbedPane.tabIds();
    const tabOrders = {};
    for (let i = 0; i < tabIds.length; i++) {
      tabOrders[tabIds[i]] = (i + 1) * _TabbedLocation.orderStep;
    }
    const oldTabOrder = this.tabOrderSetting.get();
    const oldTabArray = Object.keys(oldTabOrder);
    oldTabArray.sort((a, b) => oldTabOrder[a] - oldTabOrder[b]);
    let lastOrder = 0;
    for (const key of oldTabArray) {
      if (key in tabOrders) {
        lastOrder = tabOrders[key];
        continue;
      }
      tabOrders[key] = ++lastOrder;
    }
    this.tabOrderSetting.set(tabOrders);
  }
  static orderStep = 10;
  // Keep in sync with descriptors.
};
var StackLocation = class extends Location {
  vbox;
  expandableContainers;
  constructor(manager, revealCallback, location, jslogContext) {
    const vbox = new VBox();
    vbox.element.setAttribute("jslog", `${VisualLogging6.pane(jslogContext || "sidebar").track({ resize: true })}`);
    super(manager, vbox, revealCallback);
    this.vbox = vbox;
    markAsTree(vbox.element);
    this.expandableContainers = /* @__PURE__ */ new Map();
    if (location) {
      this.appendApplicableItems(location);
    }
  }
  appendView(view, insertBefore) {
    const oldLocation = locationForView.get(view);
    if (oldLocation && oldLocation !== this) {
      oldLocation.removeView(view);
    }
    let container = this.expandableContainers.get(view.viewId());
    if (!container) {
      locationForView.set(view, this);
      this.manager.views.set(view.viewId(), view);
      container = new ExpandableContainerWidget(view);
      let beforeElement = null;
      if (insertBefore) {
        const beforeContainer = expandableContainerForView.get(insertBefore);
        beforeElement = beforeContainer ? beforeContainer.element : null;
      }
      container.show(this.vbox.contentElement, beforeElement);
      this.expandableContainers.set(view.viewId(), container);
    }
  }
  async showView(view, insertBefore) {
    this.appendView(view, insertBefore);
    const container = this.expandableContainers.get(view.viewId());
    if (container) {
      await container.expand();
    }
  }
  removeView(view) {
    const container = this.expandableContainers.get(view.viewId());
    if (!container) {
      return;
    }
    container.detach();
    this.expandableContainers.delete(view.viewId());
    locationForView.delete(view);
    this.manager.views.delete(view.viewId());
  }
  isViewVisible(_view) {
    throw new Error("not implemented");
  }
  appendApplicableItems(locationName) {
    for (const view of this.manager.viewsForLocation(locationName)) {
      this.appendView(view);
    }
  }
};

// gen/front_end/ui/legacy/InspectorView.js
var UIStrings7 = {
  /**
   * @description Title of more tabs button in inspector view
   */
  moreTools: "More Tools",
  /**
   * @description Text that appears when hovor over the close button on the drawer view
   */
  closeDrawer: "Close drawer",
  /**
   * @description The ARIA label for the main tab bar that contains the DevTools panels
   */
  panels: "Panels",
  /**
   * @description Title of an action that reloads the tab currently being debugged by DevTools
   */
  reloadDebuggedTab: "Reload page",
  /**
   * @description Title of an action that reloads the DevTools
   */
  reloadDevtools: "Reload DevTools",
  /**
   * @description Text for context menu action to move a tab to the main tab bar
   */
  moveToMainTabBar: "Move to main tab bar",
  /**
   * @description Text for context menu action to move a tab to the drawer
   */
  moveToDrawer: "Move to drawer",
  /**
   * @description Text shown in a prompt to the user when DevTools is started and the
   * currently selected DevTools locale does not match Chrome's locale.
   * The placeholder is the current Chrome language.
   * @example {German} PH1
   */
  devToolsLanguageMissmatch: "DevTools is now available in {PH1}",
  /**
   * @description An option the user can select when we notice that DevTools
   * is configured with a different locale than Chrome. This option means DevTools will
   * always try and display the DevTools UI in the same language as Chrome.
   */
  setToBrowserLanguage: "Always match Chrome's language",
  /**
   * @description An option the user can select when DevTools notices that DevTools
   * is configured with a different locale than Chrome. This option means DevTools UI
   * will be switched to the language specified in the placeholder.
   * @example {German} PH1
   */
  setToSpecificLanguage: "Switch DevTools to {PH1}",
  /**
   * @description The aria label for main toolbar
   */
  mainToolbar: "Main toolbar",
  /**
   * @description The aria label for the drawer.
   */
  drawer: "Tool drawer",
  /**
   * @description The aria label for the drawer shown.
   */
  drawerShown: "Drawer shown",
  /**
   * @description The aria label for the drawer hidden.
   */
  drawerHidden: "Drawer hidden",
  /**
   * @description Request for the user to select a local file system folder for DevTools
   * to store local overrides in.
   */
  selectOverrideFolder: "Select a folder to store override files in",
  /**
   * @description Label for a button which opens a file picker.
   */
  selectFolder: "Select folder",
  /**
   * @description Text that appears when hover the toggle orientation button
   */
  toggleDrawerOrientation: "Toggle drawer orientation"
};
var str_7 = i18n13.i18n.registerUIStrings("ui/legacy/InspectorView.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var inspectorViewInstance = null;
var MIN_MAIN_PANEL_WIDTH = 240;
var MIN_VERTICAL_DRAWER_WIDTH = 200;
var MIN_INSPECTOR_WIDTH_HORIZONTAL_DRAWER = 250;
var MIN_INSPECTOR_WIDTH_VERTICAL_DRAWER = 450;
var MIN_INSPECTOR_HEIGHT = 72;
var DrawerOrientation;
(function(DrawerOrientation2) {
  DrawerOrientation2["VERTICAL"] = "vertical";
  DrawerOrientation2["HORIZONTAL"] = "horizontal";
  DrawerOrientation2["UNSET"] = "unset";
})(DrawerOrientation || (DrawerOrientation = {}));
var DockMode;
(function(DockMode2) {
  DockMode2["BOTTOM"] = "bottom";
  DockMode2["SIDE"] = "side";
  DockMode2["UNDOCKED"] = "undocked";
})(DockMode || (DockMode = {}));
var InspectorView = class _InspectorView extends VBox {
  drawerOrientationByDockSetting;
  drawerSplitWidget;
  tabDelegate;
  drawerTabbedLocation;
  drawerTabbedPane;
  infoBarDiv;
  tabbedLocation;
  tabbedPane;
  keyDownBound;
  currentPanelLocked;
  focusRestorer;
  ownerSplitWidget;
  reloadRequiredInfobar;
  #selectOverrideFolderInfobar;
  #resizeObserver;
  #toggleOrientationButton;
  constructor() {
    super();
    GlassPane.setContainer(this.element);
    this.setMinimumSize(MIN_INSPECTOR_WIDTH_HORIZONTAL_DRAWER, MIN_INSPECTOR_HEIGHT);
    this.drawerOrientationByDockSetting = Common10.Settings.Settings.instance().createSetting("inspector.drawer-orientation-by-dock-mode", {
      [DockMode.BOTTOM]: DrawerOrientation.UNSET,
      [DockMode.SIDE]: DrawerOrientation.UNSET,
      [DockMode.UNDOCKED]: DrawerOrientation.UNSET
    });
    const initialOrientation = this.#getOrientationForDockMode();
    const isVertical = initialOrientation === DrawerOrientation.VERTICAL;
    this.drawerSplitWidget = new SplitWidget(isVertical, true, "inspector.drawer-split-view-state", 200, 200);
    this.drawerSplitWidget.hideSidebar();
    this.drawerSplitWidget.enableShowModeSaving();
    this.drawerSplitWidget.show(this.element);
    this.tabDelegate = new InspectorViewTabDelegate();
    this.drawerTabbedLocation = ViewManager.instance().createTabbedLocation(this.showDrawer.bind(this, {
      focus: false,
      hasTargetDrawer: true
    }), "drawer-view", true, true);
    const moreTabsButton = this.drawerTabbedLocation.enableMoreTabsButton();
    moreTabsButton.setTitle(i18nString7(UIStrings7.moreTools));
    this.drawerTabbedPane = this.drawerTabbedLocation.tabbedPane();
    this.setDrawerRelatedMinimumSizes();
    this.drawerTabbedPane.element.classList.add("drawer-tabbed-pane");
    this.drawerTabbedPane.element.setAttribute("jslog", `${VisualLogging7.drawer()}`);
    const closeDrawerButton = new ToolbarButton(i18nString7(UIStrings7.closeDrawer), "cross");
    closeDrawerButton.element.setAttribute("jslog", `${VisualLogging7.close().track({ click: true })}`);
    closeDrawerButton.addEventListener("Click", this.closeDrawer, this);
    this.#toggleOrientationButton = new ToolbarButton(i18nString7(UIStrings7.toggleDrawerOrientation), this.drawerSplitWidget.isVertical() ? "dock-bottom" : "dock-right");
    this.#toggleOrientationButton.element.setAttribute("jslog", `${VisualLogging7.toggle("toggle-drawer-orientation").track({ click: true })}`);
    this.#toggleOrientationButton.addEventListener("Click", () => this.toggleDrawerOrientation(), this);
    this.drawerTabbedPane.addEventListener(Events.TabSelected, (event) => this.tabSelected(event.data.tabId), this);
    const selectedDrawerTab = this.drawerTabbedPane.selectedTabId;
    if (this.drawerSplitWidget.showMode() !== "OnlyMain" && selectedDrawerTab) {
      Host5.userMetrics.panelShown(selectedDrawerTab, true);
    }
    this.drawerTabbedPane.setTabDelegate(this.tabDelegate);
    const drawerElement = this.drawerTabbedPane.element;
    markAsComplementary(drawerElement);
    setLabel(drawerElement, i18nString7(UIStrings7.drawer));
    this.drawerSplitWidget.installResizer(this.drawerTabbedPane.headerElement());
    this.drawerSplitWidget.setSidebarWidget(this.drawerTabbedPane);
    if (Root4.Runtime.hostConfig.devToolsFlexibleLayout?.verticalDrawerEnabled) {
      this.drawerTabbedPane.rightToolbar().appendToolbarItem(this.#toggleOrientationButton);
    }
    this.drawerTabbedPane.rightToolbar().appendToolbarItem(closeDrawerButton);
    this.drawerTabbedPane.headerElement().setAttribute("jslog", `${VisualLogging7.toolbar("drawer").track({
      drag: true,
      keydown: "ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space"
    })}`);
    this.tabbedLocation = ViewManager.instance().createTabbedLocation(Host5.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront.bind(Host5.InspectorFrontendHost.InspectorFrontendHostInstance), "panel", true, true, Root4.Runtime.Runtime.queryParam("panel"));
    this.tabbedPane = this.tabbedLocation.tabbedPane();
    this.tabbedPane.setMinimumSize(MIN_MAIN_PANEL_WIDTH, 0);
    this.tabbedPane.element.classList.add("main-tabbed-pane");
    const allocatedSpace = Root4.Runtime.conditions.canDock() ? "69px" : "41px";
    this.tabbedPane.leftToolbar().style.minWidth = allocatedSpace;
    this.tabbedPane.addEventListener(Events.TabSelected, (event) => this.tabSelected(event.data.tabId), this);
    const selectedTab = this.tabbedPane.selectedTabId;
    if (selectedTab) {
      Host5.userMetrics.panelShown(selectedTab, true);
    }
    this.tabbedPane.setAccessibleName(i18nString7(UIStrings7.panels));
    this.tabbedPane.setTabDelegate(this.tabDelegate);
    const mainHeaderElement = this.tabbedPane.headerElement();
    markAsNavigation(mainHeaderElement);
    setLabel(mainHeaderElement, i18nString7(UIStrings7.mainToolbar));
    mainHeaderElement.setAttribute("jslog", `${VisualLogging7.toolbar("main").track({
      drag: true,
      keydown: "ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space"
    })}`);
    Host5.userMetrics.setLaunchPanel(this.tabbedPane.selectedTabId);
    if (Host5.InspectorFrontendHost.isUnderTest()) {
      this.tabbedPane.setAutoSelectFirstItemOnShow(false);
    }
    this.drawerSplitWidget.setMainWidget(this.tabbedPane);
    this.drawerSplitWidget.setDefaultFocusedChild(this.tabbedPane);
    this.keyDownBound = this.keyDown.bind(this);
    Host5.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host5.InspectorFrontendHostAPI.Events.ShowPanel, showPanel.bind(this));
    function showPanel({ data: panelName }) {
      void this.showPanel(panelName);
    }
    if (shouldShowLocaleInfobar()) {
      const infobar = createLocaleInfobar();
      infobar.setParentView(this);
      this.attachInfobar(infobar);
    }
    this.#resizeObserver = new ResizeObserver(this.#observedResize.bind(this));
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!inspectorViewInstance || forceNew) {
      inspectorViewInstance = new _InspectorView();
    }
    return inspectorViewInstance;
  }
  static maybeGetInspectorViewInstance() {
    return inspectorViewInstance;
  }
  static removeInstance() {
    inspectorViewInstance = null;
  }
  applyDrawerOrientationForDockSideForTest() {
  }
  #applyDrawerOrientationForDockSide() {
    if (!this.drawerVisible()) {
      this.applyDrawerOrientationForDockSideForTest();
      return;
    }
    const newOrientation = this.#getOrientationForDockMode();
    this.#applyDrawerOrientation(newOrientation);
    this.applyDrawerOrientationForDockSideForTest();
  }
  #getDockMode() {
    const dockSide = DockController.instance().dockSide();
    if (dockSide === "bottom") {
      return DockMode.BOTTOM;
    }
    if (dockSide === "undocked") {
      return DockMode.UNDOCKED;
    }
    return DockMode.SIDE;
  }
  #getOrientationForDockMode() {
    const dockMode = this.#getDockMode();
    const orientationSetting = this.drawerOrientationByDockSetting.get();
    let orientation = orientationSetting[dockMode];
    if (orientation === DrawerOrientation.UNSET) {
      orientation = dockMode === DockMode.BOTTOM ? DrawerOrientation.VERTICAL : DrawerOrientation.HORIZONTAL;
    }
    return orientation;
  }
  #applyDrawerOrientation(orientation) {
    const shouldBeVertical = orientation === DrawerOrientation.VERTICAL;
    const isVertical = this.drawerSplitWidget.isVertical();
    if (shouldBeVertical === isVertical) {
      return;
    }
    this.#toggleOrientationButton.setGlyph(shouldBeVertical ? "dock-bottom" : "dock-right");
    this.drawerSplitWidget.setVertical(shouldBeVertical);
    this.setDrawerRelatedMinimumSizes();
  }
  #observedResize() {
    const rect = this.element.getBoundingClientRect();
    this.element.style.setProperty("--devtools-window-left", `${rect.left}px`);
    this.element.style.setProperty("--devtools-window-right", `${window.innerWidth - rect.right}px`);
    this.element.style.setProperty("--devtools-window-width", `${rect.width}px`);
    this.element.style.setProperty("--devtools-window-top", `${rect.top}px`);
    this.element.style.setProperty("--devtools-window-bottom", `${window.innerHeight - rect.bottom}px`);
    this.element.style.setProperty("--devtools-window-height", `${rect.height}px`);
  }
  wasShown() {
    super.wasShown();
    this.#resizeObserver.observe(this.element);
    this.#observedResize();
    this.element.ownerDocument.addEventListener("keydown", this.keyDownBound, false);
    DockController.instance().addEventListener("DockSideChanged", this.#applyDrawerOrientationForDockSide, this);
    this.#applyDrawerOrientationForDockSide();
  }
  willHide() {
    super.willHide();
    this.#resizeObserver.unobserve(this.element);
    this.element.ownerDocument.removeEventListener("keydown", this.keyDownBound, false);
    DockController.instance().removeEventListener("DockSideChanged", this.#applyDrawerOrientationForDockSide, this);
  }
  resolveLocation(locationName) {
    if (locationName === "drawer-view") {
      return this.drawerTabbedLocation;
    }
    if (locationName === "panel") {
      return this.tabbedLocation;
    }
    return null;
  }
  async createToolbars() {
    await this.tabbedPane.leftToolbar().appendItemsAtLocation("main-toolbar-left");
    await this.tabbedPane.rightToolbar().appendItemsAtLocation("main-toolbar-right");
  }
  addPanel(view) {
    this.tabbedLocation.appendView(view);
  }
  hasPanel(panelName) {
    return this.tabbedPane.hasTab(panelName);
  }
  async panel(panelName) {
    const view = ViewManager.instance().view(panelName);
    if (!view) {
      throw new Error(`Expected view for panel '${panelName}'`);
    }
    return await view.widget();
  }
  onSuspendStateChanged(allTargetsSuspended) {
    this.currentPanelLocked = allTargetsSuspended;
    this.tabbedPane.setCurrentTabLocked(this.currentPanelLocked);
    this.tabbedPane.leftToolbar().setEnabled(!this.currentPanelLocked);
    this.tabbedPane.rightToolbar().setEnabled(!this.currentPanelLocked);
  }
  canSelectPanel(panelName) {
    return !this.currentPanelLocked || this.tabbedPane.selectedTabId === panelName;
  }
  async showPanel(panelName) {
    await ViewManager.instance().showView(panelName);
  }
  setPanelWarnings(tabId, warnings) {
    const tabbedPane = this.getTabbedPaneForTabId(tabId);
    if (tabbedPane) {
      let icon = null;
      if (warnings.length !== 0) {
        const warning = warnings.length === 1 ? warnings[0] : "\xB7 " + warnings.join("\n\xB7 ");
        icon = IconButton4.Icon.create("warning-filled", "small");
        icon.classList.add("warning");
        Tooltip.install(icon, warning);
      }
      tabbedPane.setTrailingTabIcon(tabId, icon);
    }
  }
  getTabbedPaneForTabId(tabId) {
    if (this.tabbedPane.hasTab(tabId)) {
      return this.tabbedPane;
    }
    if (this.drawerTabbedPane.hasTab(tabId)) {
      return this.drawerTabbedPane;
    }
    return null;
  }
  currentPanelDeprecated() {
    return ViewManager.instance().materializedWidget(this.tabbedPane.selectedTabId || "");
  }
  showDrawer({ focus, hasTargetDrawer }) {
    if (this.drawerTabbedPane.isShowing()) {
      return;
    }
    this.drawerTabbedPane.setAutoSelectFirstItemOnShow(!hasTargetDrawer);
    this.drawerSplitWidget.showBoth();
    if (focus) {
      this.focusRestorer = new WidgetFocusRestorer(this.drawerTabbedPane);
    } else {
      this.focusRestorer = null;
    }
    this.#applyDrawerOrientationForDockSide();
    LiveAnnouncer.alert(i18nString7(UIStrings7.drawerShown));
  }
  drawerVisible() {
    return this.drawerTabbedPane.isShowing();
  }
  closeDrawer() {
    if (!this.drawerTabbedPane.isShowing()) {
      return;
    }
    if (this.focusRestorer) {
      this.focusRestorer.restore();
    }
    this.drawerSplitWidget.hideSidebar(true);
    LiveAnnouncer.alert(i18nString7(UIStrings7.drawerHidden));
  }
  toggleDrawerOrientation({ force } = {}) {
    if (!this.drawerTabbedPane.isShowing()) {
      return;
    }
    const dockMode = this.#getDockMode();
    const currentSettings = this.drawerOrientationByDockSetting.get();
    let newOrientation;
    if (force) {
      newOrientation = force;
    } else {
      const currentOrientation = this.#getOrientationForDockMode();
      newOrientation = currentOrientation === DrawerOrientation.VERTICAL ? DrawerOrientation.HORIZONTAL : DrawerOrientation.VERTICAL;
    }
    currentSettings[dockMode] = newOrientation;
    this.drawerOrientationByDockSetting.set(currentSettings);
    this.#applyDrawerOrientation(newOrientation);
  }
  isUserExplicitlyUpdatedDrawerOrientation() {
    const orientationSetting = this.drawerOrientationByDockSetting.get();
    const dockMode = this.#getDockMode();
    return orientationSetting[dockMode] !== DrawerOrientation.UNSET;
  }
  setDrawerRelatedMinimumSizes() {
    const drawerIsVertical = this.drawerSplitWidget.isVertical();
    if (drawerIsVertical) {
      this.drawerTabbedPane.setMinimumSize(MIN_VERTICAL_DRAWER_WIDTH, 27);
      this.setMinimumSize(MIN_INSPECTOR_WIDTH_VERTICAL_DRAWER, MIN_INSPECTOR_HEIGHT);
    } else {
      this.drawerTabbedPane.setMinimumSize(0, 27);
      this.setMinimumSize(MIN_INSPECTOR_WIDTH_HORIZONTAL_DRAWER, MIN_INSPECTOR_HEIGHT);
    }
  }
  setDrawerMinimized(minimized) {
    this.drawerSplitWidget.setSidebarMinimized(minimized);
    this.drawerSplitWidget.setResizable(!minimized);
  }
  drawerSize() {
    return this.drawerSplitWidget.sidebarSize();
  }
  setDrawerSize(size) {
    this.drawerSplitWidget.setSidebarSize(size);
  }
  totalSize() {
    return this.drawerSplitWidget.totalSize();
  }
  isDrawerMinimized() {
    return this.drawerSplitWidget.isSidebarMinimized();
  }
  isDrawerOrientationVertical() {
    return this.drawerSplitWidget.isVertical();
  }
  keyDown(event) {
    if (!KeyboardShortcut.eventHasCtrlEquivalentKey(event) || event.altKey || event.shiftKey) {
      return;
    }
    const panelShortcutEnabled = Common10.Settings.moduleSetting("shortcut-panel-switch").get();
    if (panelShortcutEnabled) {
      let panelIndex = -1;
      if (event.keyCode > 48 && event.keyCode < 58) {
        panelIndex = event.keyCode - 49;
      } else if (event.keyCode > 96 && event.keyCode < 106 && event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
        panelIndex = event.keyCode - 97;
      }
      if (panelIndex !== -1) {
        const panelName = this.tabbedPane.tabIds()[panelIndex];
        if (panelName) {
          if (!Dialog.hasInstance() && !this.currentPanelLocked) {
            void this.showPanel(panelName);
            void VisualLogging7.logKeyDown(null, event, `panel-by-index-${panelName}`);
          }
          event.consume(true);
        }
      }
    }
  }
  onResize() {
    GlassPane.containerMoved(this.element);
  }
  topResizerElement() {
    return this.tabbedPane.headerElement();
  }
  toolbarItemResized() {
    this.tabbedPane.headerResized();
  }
  tabSelected(tabId) {
    Host5.userMetrics.panelShown(tabId);
  }
  setOwnerSplit(splitWidget) {
    this.ownerSplitWidget = splitWidget;
  }
  ownerSplit() {
    return this.ownerSplitWidget || null;
  }
  minimize() {
    if (this.ownerSplitWidget) {
      this.ownerSplitWidget.setSidebarMinimized(true);
    }
  }
  restore() {
    if (this.ownerSplitWidget) {
      this.ownerSplitWidget.setSidebarMinimized(false);
    }
  }
  displayDebuggedTabReloadRequiredWarning(message) {
    if (!this.reloadRequiredInfobar) {
      const infobar = new Infobar("info", message, [
        {
          text: i18nString7(UIStrings7.reloadDebuggedTab),
          delegate: () => {
            reloadDebuggedTab();
            this.removeDebuggedTabReloadRequiredWarning();
          },
          dismiss: false,
          buttonVariant: "primary",
          jslogContext: "main.debug-reload"
        }
      ], void 0, "reload-required");
      infobar.setParentView(this);
      this.attachInfobar(infobar);
      this.reloadRequiredInfobar = infobar;
      infobar.setCloseCallback(() => {
        delete this.reloadRequiredInfobar;
      });
      SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.removeDebuggedTabReloadRequiredWarning, this);
    }
  }
  removeDebuggedTabReloadRequiredWarning() {
    if (this.reloadRequiredInfobar) {
      this.reloadRequiredInfobar.dispose();
      SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.removeDebuggedTabReloadRequiredWarning, this);
    }
  }
  displayReloadRequiredWarning(message) {
    if (!this.reloadRequiredInfobar) {
      const infobar = new Infobar("info", message, [
        {
          text: i18nString7(UIStrings7.reloadDevtools),
          delegate: () => reloadDevTools(),
          dismiss: false,
          buttonVariant: "primary",
          jslogContext: "main.debug-reload"
        }
      ], void 0, "reload-required");
      infobar.setParentView(this);
      this.attachInfobar(infobar);
      this.reloadRequiredInfobar = infobar;
      infobar.setCloseCallback(() => {
        delete this.reloadRequiredInfobar;
      });
    }
  }
  displaySelectOverrideFolderInfobar(callback) {
    if (!this.#selectOverrideFolderInfobar) {
      const infobar = new Infobar("info", i18nString7(UIStrings7.selectOverrideFolder), [
        {
          text: i18nString7(UIStrings7.selectFolder),
          delegate: () => callback(),
          dismiss: true,
          buttonVariant: "tonal",
          jslogContext: "select-folder"
        }
      ], void 0, "select-override-folder");
      infobar.setParentView(this);
      this.attachInfobar(infobar);
      this.#selectOverrideFolderInfobar = infobar;
      infobar.setCloseCallback(() => {
        this.#selectOverrideFolderInfobar = void 0;
      });
    }
  }
  createInfoBarDiv() {
    if (!this.infoBarDiv) {
      this.infoBarDiv = document.createElement("div");
      this.infoBarDiv.classList.add("flex-none");
      this.contentElement.insertBefore(this.infoBarDiv, this.contentElement.firstChild);
    }
  }
  attachInfobar(infobar) {
    this.createInfoBarDiv();
    this.infoBarDiv?.appendChild(infobar.element);
  }
};
function getDisableLocaleInfoBarSetting() {
  return Common10.Settings.Settings.instance().createSetting("disable-locale-info-bar", false);
}
function shouldShowLocaleInfobar() {
  if (getDisableLocaleInfoBarSetting().get()) {
    return false;
  }
  const languageSettingValue = Common10.Settings.Settings.instance().moduleSetting("language").get();
  if (languageSettingValue !== "en-US") {
    return false;
  }
  return !i18n13.DevToolsLocale.localeLanguagesMatch(navigator.language, languageSettingValue) && i18n13.DevToolsLocale.DevToolsLocale.instance().languageIsSupportedByDevTools(navigator.language);
}
function createLocaleInfobar() {
  const devtoolsLocale = i18n13.DevToolsLocale.DevToolsLocale.instance();
  const closestSupportedLocale = devtoolsLocale.lookupClosestDevToolsLocale(navigator.language);
  const locale = new Intl.Locale(closestSupportedLocale);
  const closestSupportedLanguageInCurrentLocale = new Intl.DisplayNames([devtoolsLocale.locale], { type: "language" }).of(locale.language || "en") || "English";
  const languageSetting = Common10.Settings.Settings.instance().moduleSetting("language");
  return new Infobar("info", i18nString7(UIStrings7.devToolsLanguageMissmatch, { PH1: closestSupportedLanguageInCurrentLocale }), [
    {
      text: i18nString7(UIStrings7.setToBrowserLanguage),
      delegate: () => {
        languageSetting.set("browserLanguage");
        getDisableLocaleInfoBarSetting().set(true);
        reloadDevTools();
      },
      dismiss: true,
      jslogContext: "set-to-browser-language"
    },
    {
      text: i18nString7(UIStrings7.setToSpecificLanguage, { PH1: closestSupportedLanguageInCurrentLocale }),
      delegate: () => {
        languageSetting.set(closestSupportedLocale);
        getDisableLocaleInfoBarSetting().set(true);
        reloadDevTools();
      },
      dismiss: true,
      jslogContext: "set-to-specific-language"
    }
  ], getDisableLocaleInfoBarSetting(), "language-mismatch");
}
function reloadDevTools() {
  if (DockController.instance().canDock() && DockController.instance().dockSide() === "undocked") {
    Host5.InspectorFrontendHost.InspectorFrontendHostInstance.setIsDocked(true, function() {
    });
  }
  Host5.InspectorFrontendHost.InspectorFrontendHostInstance.reattach(() => window.location.reload());
}
function reloadDebuggedTab() {
  void ActionRegistry.instance().getAction("inspector-main.reload").execute();
}
var ActionDelegate = class {
  handleAction(_context, actionId) {
    switch (actionId) {
      case "main.toggle-drawer":
        if (InspectorView.instance().drawerVisible()) {
          InspectorView.instance().closeDrawer();
        } else {
          InspectorView.instance().showDrawer({
            focus: true,
            hasTargetDrawer: false
          });
        }
        return true;
      case "main.toggle-drawer-orientation":
        InspectorView.instance().toggleDrawerOrientation();
        return true;
      case "main.next-tab":
        InspectorView.instance().tabbedPane.selectNextTab();
        InspectorView.instance().tabbedPane.focus();
        return true;
      case "main.previous-tab":
        InspectorView.instance().tabbedPane.selectPrevTab();
        InspectorView.instance().tabbedPane.focus();
        return true;
    }
    return false;
  }
};
var InspectorViewTabDelegate = class {
  closeTabs(tabbedPane, ids) {
    tabbedPane.closeTabs(ids, true);
  }
  moveToDrawer(tabId) {
    Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.TabMovedToDrawer);
    ViewManager.instance().moveView(tabId, "drawer-view");
  }
  moveToMainTabBar(tabId) {
    Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.TabMovedToMainPanel);
    ViewManager.instance().moveView(tabId, "panel");
  }
  onContextMenu(tabId, contextMenu) {
    if (tabId === "console" || tabId === "console-view") {
      return;
    }
    const locationName = ViewManager.instance().locationNameForViewId(tabId);
    if (locationName === "drawer-view") {
      contextMenu.defaultSection().appendItem(i18nString7(UIStrings7.moveToMainTabBar), this.moveToMainTabBar.bind(this, tabId), { jslogContext: "move-to-top" });
    } else {
      contextMenu.defaultSection().appendItem(i18nString7(UIStrings7.moveToDrawer), this.moveToDrawer.bind(this, tabId), { jslogContext: "move-to-bottom" });
    }
  }
};

// gen/front_end/ui/legacy/softContextMenu.css.js
var softContextMenu_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.soft-context-menu {
  overflow-y: auto;
  min-width: 160px !important; /* stylelint-disable-line declaration-no-important */
  /* NOTE: Keep padding in sync with padding adjustment in SoftContextMenu.ts */
  padding: var(--sys-size-5) 0;
  border: 1px solid var(--sys-color-neutral-outline);
  border-radius: var(--sys-shape-corner-small);
  background-color: var(--app-color-menu-background);
  box-shadow: var(--sys-elevation-level3);
}

:host-context(.theme-with-dark-background) .soft-context-menu {
  border: none;
}

.dockside-title {
  padding-right: var(--sys-size-14);
}

.dockside-title + devtools-toolbar {
  margin-right: -8px;
}

.soft-context-menu-item {
  display: flex;
  width: 100%;
  font-size: 12px;
  height: var(--sys-size-11);
  padding: 0 var(--sys-size-8);
  white-space: nowrap;
  align-items: center;

  &.soft-context-menu-item-mouse-over {
    background-color: var(--sys-color-state-hover-on-subtle);
  }

  & .new-badge {
    margin-left: var(--sys-size-4);
  }

  & devtools-icon {
    width: var(--sys-size-8);
    height: var(--sys-size-8);
    pointer-events: none;

    &.checkmark {
      margin-right: var(--sys-size-3);
      opacity: 0%;

      .soft-context-menu-item[checked] & {
        opacity: 100%;
      }
    }

    &[name="experiment"] {
      width: var(--sys-size-11);
      height: var(--sys-size-11);
      padding: 0 var(--sys-size-3);
    }
  }
}

.soft-context-menu-disabled {
  color: var(--sys-color-state-disabled);
  pointer-events: none;
}

.soft-context-menu-separator {
  padding: var(--sys-size-4) 0;

  & > .separator-line {
    height: var(--sys-size-1);
    border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
    pointer-events: none;
  }
}

.soft-context-menu-item-submenu-arrow {
  pointer-events: none;
  text-align: right;
  align-self: center;
  margin-left: auto;

  & > devtools-icon {
    width: var(--sys-size-8);
    height: var(--sys-size-8);
    color: var(--sys-color-on-surface-subtle);
  }
}

.soft-context-menu-custom-item {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  flex: auto;
}

.soft-context-menu-shortcut {
  color: var(--sys-color-on-surface-subtle);
  pointer-events: none;
  flex: 1 1 auto;
  text-align: right;
  padding-left: var(--sys-size-6);

  .soft-context-menu-disabled &,
  .soft-context-menu-item-mouse-over & {
    color: inherit;
  }
}

@media (forced-colors: active) {
  .soft-context-menu-item {
    color: canvastext;
  }

  .soft-context-menu-item.soft-context-menu-item-mouse-over,
  .theme-with-dark-background .soft-context-menu-item.soft-context-menu-item-mouse-over,
  :host-context(.theme-with-dark-background) .soft-context-menu-item.soft-context-menu-item-mouse-over {
    background-color: Highlight;
    color: HighlightText;
    forced-color-adjust: none;
  }

  .soft-context-menu .soft-context-menu-item devtools-icon,
  .soft-context-menu .soft-context-menu-item .soft-context-menu-shortcut {
    color: ButtonText;
  }

  .soft-context-menu .soft-context-menu-item.soft-context-menu-item-mouse-over devtools-icon,
  .soft-context-menu .soft-context-menu-item.soft-context-menu-item-mouse-over .soft-context-menu-shortcut {
    color: HighlightText;
  }

  .soft-context-menu:focus-visible {
    forced-color-adjust: none;
    background: canvas;
    border-color: Highlight;
  }

  .soft-context-menu-separator > .separator-line {
    border-bottom-color: ButtonText;
  }
}

/*# sourceURL=${import.meta.resolve("./softContextMenu.css")} */`;

// gen/front_end/ui/legacy/SoftContextMenu.js
var UIStrings8 = {
  /**
   * @description Text exposed to screen readers on checked items.
   */
  checked: "checked",
  /**
   * @description Accessible text exposed to screen readers when the screen reader encounters an unchecked checkbox.
   */
  unchecked: "unchecked",
  /**
   * @description Accessibility label for checkable SoftContextMenuItems with shortcuts
   * @example {Open File} PH1
   * @example {Ctrl + P} PH2
   * @example {checked} PH3
   */
  sSS: "{PH1}, {PH2}, {PH3}",
  /**
   * @description Generic text with two placeholders separated by a comma
   * @example {1 613 680} PH1
   * @example {44 %} PH2
   */
  sS: "{PH1}, {PH2}",
  /**
   * @description Accessible text exposed to screen readers appended to menu items that have a new badge.
   */
  newFeature: "This is a new feature"
};
var str_8 = i18n15.i18n.registerUIStrings("ui/legacy/SoftContextMenu.ts", UIStrings8);
var i18nString8 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
var SoftContextMenu = class _SoftContextMenu {
  items;
  itemSelectedCallback;
  parentMenu;
  highlightedMenuItemElement;
  detailsForElementMap;
  document;
  glassPane;
  contextMenuElement;
  focusRestorer;
  hideOnUserMouseDownUnlessInMenu;
  activeSubMenuElement;
  subMenu;
  onMenuClosed;
  focusOnTheFirstItem = true;
  keepOpen;
  loggableParent;
  constructor(items, itemSelectedCallback, keepOpen, parentMenu, onMenuClosed, loggableParent) {
    this.items = items;
    this.itemSelectedCallback = itemSelectedCallback;
    this.parentMenu = parentMenu;
    this.highlightedMenuItemElement = null;
    this.detailsForElementMap = /* @__PURE__ */ new WeakMap();
    this.onMenuClosed = onMenuClosed;
    this.keepOpen = keepOpen;
    this.loggableParent = loggableParent || null;
  }
  getItems() {
    return this.items;
  }
  show(document2, anchorBox) {
    if (!this.items.length) {
      return;
    }
    this.document = document2;
    this.glassPane = new GlassPane();
    this.glassPane.setPointerEventsBehavior(
      this.parentMenu ? "PierceGlassPane" : "BlockedByGlassPane"
      /* PointerEventsBehavior.BLOCKED_BY_GLASS_PANE */
    );
    this.glassPane.registerRequiredCSS(softContextMenu_css_default);
    this.glassPane.setContentAnchorBox(anchorBox);
    this.glassPane.setSizeBehavior(
      "MeasureContent"
      /* SizeBehavior.MEASURE_CONTENT */
    );
    this.glassPane.setMarginBehavior(
      "NoMargin"
      /* MarginBehavior.NO_MARGIN */
    );
    this.glassPane.setAnchorBehavior(
      this.parentMenu ? "PreferRight" : "PreferBottom"
      /* AnchorBehavior.PREFER_BOTTOM */
    );
    this.contextMenuElement = this.glassPane.contentElement.createChild("div", "soft-context-menu");
    this.contextMenuElement.setAttribute("jslog", `${VisualLogging8.menu().track({ resize: true }).parent("mapped").track({
      keydown: "ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Enter|Space|Escape"
    })}`);
    if (this.loggableParent) {
      VisualLogging8.setMappedParent(this.contextMenuElement, this.loggableParent);
    }
    this.contextMenuElement.tabIndex = -1;
    markAsMenu(this.contextMenuElement);
    this.contextMenuElement.addEventListener("mouseup", (e) => e.consume(), false);
    this.contextMenuElement.addEventListener("keydown", this.menuKeyDown.bind(this), false);
    const menuContainsCheckbox = this.items.find((item8) => item8.type === "checkbox") ? true : false;
    for (let i = 0; i < this.items.length; ++i) {
      this.contextMenuElement.appendChild(this.createMenuItem(this.items[i], menuContainsCheckbox));
    }
    this.glassPane.show(document2);
    this.focusRestorer = new ElementFocusRestorer(this.contextMenuElement);
    if (!this.parentMenu) {
      this.hideOnUserMouseDownUnlessInMenu = (event) => {
        let subMenu = this.subMenu;
        while (subMenu) {
          if (subMenu.contextMenuElement === event.composedPath()[0]) {
            return;
          }
          subMenu = subMenu.subMenu;
        }
        this.discard();
        event.consume(true);
      };
      this.document.body.addEventListener("mousedown", this.hideOnUserMouseDownUnlessInMenu, false);
      const devToolsElem = InspectorView.maybeGetInspectorViewInstance()?.element;
      if (devToolsElem) {
        let firedOnce = false;
        const observer = new ResizeObserver(() => {
          if (firedOnce) {
            observer.disconnect();
            this.discard();
            return;
          }
          firedOnce = true;
        });
        observer.observe(devToolsElem);
      }
      if (this.contextMenuElement.children && this.focusOnTheFirstItem) {
        const focusElement = this.contextMenuElement.children[0];
        this.highlightMenuItem(
          focusElement,
          /* scheduleSubMenu */
          false
        );
      }
    }
  }
  setContextMenuElementLabel(label) {
    if (this.contextMenuElement) {
      setLabel(this.contextMenuElement, label);
    }
  }
  discard() {
    if (this.subMenu) {
      this.subMenu.discard();
    }
    if (this.focusRestorer) {
      this.focusRestorer.restore();
    }
    if (this.glassPane) {
      this.glassPane.hide();
      delete this.glassPane;
      if (this.hideOnUserMouseDownUnlessInMenu) {
        if (this.document) {
          this.document.body.removeEventListener("mousedown", this.hideOnUserMouseDownUnlessInMenu, false);
        }
        delete this.hideOnUserMouseDownUnlessInMenu;
      }
    }
    if (this.parentMenu) {
      delete this.parentMenu.subMenu;
      if (this.parentMenu.activeSubMenuElement) {
        setExpanded(this.parentMenu.activeSubMenuElement, false);
        delete this.parentMenu.activeSubMenuElement;
      }
    }
    this.onMenuClosed?.();
  }
  createMenuItem(item8, menuContainsCheckbox) {
    if (item8.type === "separator") {
      return this.createSeparator();
    }
    if (item8.type === "subMenu") {
      return this.createSubMenu(item8, menuContainsCheckbox);
    }
    const menuItemElement = document.createElement("div");
    menuItemElement.classList.add("soft-context-menu-item");
    menuItemElement.tabIndex = -1;
    markAsMenuItem(menuItemElement);
    if (item8.checked) {
      menuItemElement.setAttribute("checked", "");
    }
    if (item8.id !== void 0) {
      menuItemElement.setAttribute("data-action-id", item8.id.toString());
    }
    if (menuContainsCheckbox) {
      const checkMarkElement = IconButton5.Icon.create("checkmark", "checkmark");
      menuItemElement.appendChild(checkMarkElement);
    }
    if (item8.tooltip) {
      Tooltip.install(menuItemElement, item8.tooltip);
    }
    const detailsForElement = {
      actionId: void 0,
      isSeparator: void 0,
      customElement: void 0,
      subItems: void 0,
      subMenuTimer: void 0
    };
    if (item8.jslogContext && item8.label) {
      if (item8.type === "checkbox") {
        menuItemElement.setAttribute("jslog", `${VisualLogging8.toggle().track({ click: true }).context(item8.jslogContext)}`);
      } else {
        menuItemElement.setAttribute("jslog", `${VisualLogging8.action().track({ click: true }).context(item8.jslogContext)}`);
      }
    }
    if (item8.element && !item8.label) {
      const wrapper = menuItemElement.createChild("div", "soft-context-menu-custom-item");
      wrapper.appendChild(item8.element);
      if (item8.element?.classList.contains("location-menu")) {
        const label = item8.element.ariaLabel || "";
        item8.element.ariaLabel = "";
        setLabel(menuItemElement, label);
      }
      detailsForElement.customElement = item8.element;
      this.detailsForElementMap.set(menuItemElement, detailsForElement);
      return menuItemElement;
    }
    if (!item8.enabled) {
      menuItemElement.classList.add("soft-context-menu-disabled");
    }
    createTextChild(menuItemElement, item8.label || "");
    if (item8.element) {
      menuItemElement.appendChild(item8.element);
    }
    menuItemElement.createChild("span", "soft-context-menu-shortcut").textContent = item8.shortcut || "";
    menuItemElement.addEventListener("mousedown", this.menuItemMouseDown.bind(this), false);
    menuItemElement.addEventListener("mouseup", this.menuItemMouseUp.bind(this), false);
    menuItemElement.addEventListener("mouseover", this.menuItemMouseOver.bind(this), false);
    menuItemElement.addEventListener("mouseleave", this.menuItemMouseLeave.bind(this), false);
    detailsForElement.actionId = item8.id;
    let accessibleName = item8.label || "";
    if (item8.type === "checkbox") {
      const checkedState = item8.checked ? i18nString8(UIStrings8.checked) : i18nString8(UIStrings8.unchecked);
      if (item8.shortcut) {
        accessibleName = i18nString8(UIStrings8.sSS, { PH1: String(item8.label), PH2: item8.shortcut, PH3: checkedState });
      } else {
        accessibleName = i18nString8(UIStrings8.sS, { PH1: String(item8.label), PH2: checkedState });
      }
    } else if (item8.shortcut) {
      accessibleName = i18nString8(UIStrings8.sS, { PH1: String(item8.label), PH2: item8.shortcut });
    }
    if (item8.element?.className === "new-badge") {
      accessibleName = i18nString8(UIStrings8.sS, { PH1: String(item8.label), PH2: i18nString8(UIStrings8.newFeature) });
    }
    setLabel(menuItemElement, accessibleName);
    if (item8.isExperimentalFeature) {
      const experimentIcon = IconButton5.Icon.create("experiment");
      menuItemElement.appendChild(experimentIcon);
    }
    this.detailsForElementMap.set(menuItemElement, detailsForElement);
    return menuItemElement;
  }
  createSubMenu(item8, menuContainsCheckbox) {
    const menuItemElement = document.createElement("div");
    menuItemElement.classList.add("soft-context-menu-item");
    menuItemElement.tabIndex = -1;
    markAsMenuItemSubMenu(menuItemElement);
    this.detailsForElementMap.set(menuItemElement, {
      subItems: item8.subItems,
      actionId: void 0,
      isSeparator: void 0,
      customElement: void 0,
      subMenuTimer: void 0
    });
    if (menuContainsCheckbox) {
      const checkMarkElement = IconButton5.Icon.create("checkmark", "checkmark soft-context-menu-item-checkmark");
      menuItemElement.appendChild(checkMarkElement);
    }
    createTextChild(menuItemElement, item8.label || "");
    setExpanded(menuItemElement, false);
    const subMenuArrowElement = IconButton5.Icon.create("keyboard-arrow-right", "soft-context-menu-item-submenu-arrow");
    menuItemElement.appendChild(subMenuArrowElement);
    menuItemElement.addEventListener("mousedown", this.menuItemMouseDown.bind(this), false);
    menuItemElement.addEventListener("mouseup", this.menuItemMouseUp.bind(this), false);
    menuItemElement.addEventListener("mouseover", this.menuItemMouseOver.bind(this), false);
    menuItemElement.addEventListener("mouseleave", this.menuItemMouseLeave.bind(this), false);
    if (item8.jslogContext) {
      menuItemElement.setAttribute("jslog", `${VisualLogging8.item().context(item8.jslogContext)}`);
    }
    return menuItemElement;
  }
  createSeparator() {
    const separatorElement = document.createElement("div");
    separatorElement.classList.add("soft-context-menu-separator");
    this.detailsForElementMap.set(separatorElement, {
      subItems: void 0,
      actionId: void 0,
      isSeparator: true,
      customElement: void 0,
      subMenuTimer: void 0
    });
    separatorElement.createChild("div", "separator-line");
    return separatorElement;
  }
  menuItemMouseDown(event) {
    event.consume(true);
  }
  menuItemMouseUp(event) {
    this.triggerAction(event.target, event);
    void VisualLogging8.logClick(event.target, event);
    event.consume();
  }
  root() {
    let root = this;
    while (root.parentMenu) {
      root = root.parentMenu;
    }
    return root;
  }
  setChecked(item8, checked) {
    item8.checked = checked;
    const element = this.contextMenuElement?.querySelector(`[data-action-id="${item8.id}"]`);
    if (!element) {
      return;
    }
    if (checked) {
      element.setAttribute("checked", "");
    } else {
      element.removeAttribute("checked");
    }
    const checkedState = item8.checked ? i18nString8(UIStrings8.checked) : i18nString8(UIStrings8.unchecked);
    const accessibleName = item8.shortcut ? i18nString8(UIStrings8.sSS, { PH1: String(item8.label), PH2: item8.shortcut, PH3: checkedState }) : i18nString8(UIStrings8.sS, { PH1: String(item8.label), PH2: checkedState });
    setLabel(element, accessibleName);
  }
  triggerAction(menuItemElement, event) {
    const detailsForElement = this.detailsForElementMap.get(menuItemElement);
    if (!detailsForElement || detailsForElement.subItems) {
      this.showSubMenu(menuItemElement);
      event.consume();
      return;
    }
    if (this.keepOpen) {
      event.consume(true);
      const item8 = this.items.find((item9) => item9.id === detailsForElement.actionId);
      if (item8?.id !== void 0) {
        this.setChecked(item8, !item8.checked);
        this.itemSelectedCallback(item8.id);
      }
      return;
    }
    this.root().discard();
    event.consume(true);
    if (typeof detailsForElement.actionId !== "undefined") {
      this.itemSelectedCallback(detailsForElement.actionId);
      delete detailsForElement.actionId;
    }
    return;
  }
  showSubMenu(menuItemElement) {
    const detailsForElement = this.detailsForElementMap.get(menuItemElement);
    if (!detailsForElement) {
      return;
    }
    if (detailsForElement.subMenuTimer) {
      window.clearTimeout(detailsForElement.subMenuTimer);
      delete detailsForElement.subMenuTimer;
    }
    if (this.subMenu || !this.document) {
      return;
    }
    this.activeSubMenuElement = menuItemElement;
    setExpanded(menuItemElement, true);
    if (!detailsForElement.subItems) {
      return;
    }
    this.subMenu = new _SoftContextMenu(detailsForElement.subItems, this.itemSelectedCallback, false, this);
    const anchorBox = menuItemElement.boxInWindow();
    anchorBox.y -= 9;
    anchorBox.x += 3;
    anchorBox.width -= 6;
    anchorBox.height += 18;
    this.subMenu.show(this.document, anchorBox);
  }
  menuItemMouseOver(event) {
    this.highlightMenuItem(event.target, true);
  }
  menuItemMouseLeave(event) {
    if (!this.subMenu || !event.relatedTarget) {
      this.highlightMenuItem(null, true);
      return;
    }
    const relatedTarget = event.relatedTarget;
    if (relatedTarget === this.contextMenuElement) {
      this.highlightMenuItem(null, true);
    }
  }
  highlightMenuItem(menuItemElement, scheduleSubMenu) {
    if (this.highlightedMenuItemElement === menuItemElement) {
      return;
    }
    if (this.subMenu) {
      this.subMenu.discard();
    }
    if (this.highlightedMenuItemElement) {
      const detailsForElement = this.detailsForElementMap.get(this.highlightedMenuItemElement);
      this.highlightedMenuItemElement.classList.remove("force-white-icons");
      this.highlightedMenuItemElement.classList.remove("soft-context-menu-item-mouse-over");
      if (detailsForElement?.subItems && detailsForElement.subMenuTimer) {
        window.clearTimeout(detailsForElement.subMenuTimer);
        delete detailsForElement.subMenuTimer;
      }
    }
    this.highlightedMenuItemElement = menuItemElement;
    if (this.highlightedMenuItemElement) {
      this.highlightedMenuItemElement.classList.add("force-white-icons");
      this.highlightedMenuItemElement.classList.add("soft-context-menu-item-mouse-over");
      const detailsForElement = this.detailsForElementMap.get(this.highlightedMenuItemElement);
      if (detailsForElement?.customElement && !detailsForElement.customElement.classList.contains("location-menu")) {
        detailsForElement.customElement.focus();
      } else {
        this.highlightedMenuItemElement.focus();
      }
      if (scheduleSubMenu && detailsForElement?.subItems && !detailsForElement.subMenuTimer) {
        detailsForElement.subMenuTimer = window.setTimeout(this.showSubMenu.bind(this, this.highlightedMenuItemElement), 150);
      }
    }
    if (this.contextMenuElement) {
      setActiveDescendant(this.contextMenuElement, menuItemElement);
    }
  }
  highlightPrevious() {
    let menuItemElement = this.highlightedMenuItemElement ? this.highlightedMenuItemElement.previousSibling : this.contextMenuElement ? this.contextMenuElement.lastChild : null;
    let menuItemDetails = menuItemElement ? this.detailsForElementMap.get(menuItemElement) : void 0;
    while (menuItemElement && menuItemDetails && (menuItemDetails.isSeparator || menuItemElement.classList.contains("soft-context-menu-disabled"))) {
      menuItemElement = menuItemElement.previousSibling;
      menuItemDetails = menuItemElement ? this.detailsForElementMap.get(menuItemElement) : void 0;
    }
    if (menuItemElement) {
      this.highlightMenuItem(menuItemElement, false);
    }
  }
  highlightNext() {
    let menuItemElement = this.highlightedMenuItemElement ? this.highlightedMenuItemElement.nextSibling : this.contextMenuElement ? this.contextMenuElement.firstChild : null;
    let menuItemDetails = menuItemElement ? this.detailsForElementMap.get(menuItemElement) : void 0;
    while (menuItemElement && (menuItemDetails?.isSeparator || menuItemElement.classList.contains("soft-context-menu-disabled"))) {
      menuItemElement = menuItemElement.nextSibling;
      menuItemDetails = menuItemElement ? this.detailsForElementMap.get(menuItemElement) : void 0;
    }
    if (menuItemElement) {
      this.highlightMenuItem(menuItemElement, false);
    }
  }
  menuKeyDown(keyboardEvent) {
    function onEnterOrSpace() {
      if (!this.highlightedMenuItemElement) {
        return;
      }
      const detailsForElement = this.detailsForElementMap.get(this.highlightedMenuItemElement);
      if (!detailsForElement || detailsForElement.customElement) {
        return;
      }
      VisualLogging8.logClick(this.highlightedMenuItemElement, keyboardEvent);
      this.triggerAction(this.highlightedMenuItemElement, keyboardEvent);
      if (detailsForElement.subItems && this.subMenu) {
        this.subMenu.highlightNext();
      }
      keyboardEvent.consume(true);
    }
    switch (keyboardEvent.key) {
      case "ArrowUp":
        this.highlightPrevious();
        keyboardEvent.consume(true);
        break;
      case "ArrowDown":
        this.highlightNext();
        keyboardEvent.consume(true);
        break;
      case "ArrowLeft":
        if (this.parentMenu) {
          this.highlightMenuItem(null, false);
          this.discard();
        }
        keyboardEvent.consume(true);
        break;
      case "ArrowRight": {
        if (!this.highlightedMenuItemElement) {
          break;
        }
        const detailsForElement = this.detailsForElementMap.get(this.highlightedMenuItemElement);
        if (detailsForElement?.subItems) {
          this.showSubMenu(this.highlightedMenuItemElement);
          if (this.subMenu) {
            this.subMenu.highlightNext();
          }
        }
        if (detailsForElement?.customElement?.classList.contains("location-menu")) {
          detailsForElement.customElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
          this.highlightMenuItem(null, true);
        }
        keyboardEvent.consume(true);
        break;
      }
      case "Escape":
        this.discard();
        keyboardEvent.consume(true);
        break;
      /**
       * Important: we don't consume the event by default for `Enter` or `Space`
       * key events, as if there's a custom sub menu we pass the event onto
       * that.
       */
      case "Enter":
        if (!(keyboardEvent.key === "Enter")) {
          return;
        }
        onEnterOrSpace.call(this);
        break;
      case " ":
        onEnterOrSpace.call(this);
        break;
      default:
        keyboardEvent.consume(true);
    }
  }
  markAsMenuItemCheckBox() {
    if (!this.contextMenuElement) {
      return;
    }
    for (const child of this.contextMenuElement.children) {
      if (child.className !== "soft-context-menu-separator") {
        markAsMenuItemCheckBox(child);
      }
    }
  }
  setFocusOnTheFirstItem(focusOnTheFirstItem) {
    this.focusOnTheFirstItem = focusOnTheFirstItem;
  }
};

// gen/front_end/ui/legacy/ContextMenu.js
var Item = class {
  typeInternal;
  label;
  accelerator;
  featureName;
  previewFeature;
  disabled;
  checked;
  isDevToolsPerformanceMenuItem;
  contextMenu;
  idInternal;
  customElement;
  shortcut;
  #tooltip;
  jslogContext;
  constructor(contextMenu, type, label, isPreviewFeature, disabled, checked, accelerator, tooltip, jslogContext, featureName) {
    this.typeInternal = type;
    this.label = label;
    this.previewFeature = Boolean(isPreviewFeature);
    this.accelerator = accelerator;
    this.disabled = disabled;
    this.checked = checked;
    this.isDevToolsPerformanceMenuItem = false;
    this.contextMenu = contextMenu;
    this.idInternal = void 0;
    this.#tooltip = tooltip;
    if (type === "item" || type === "checkbox") {
      this.idInternal = contextMenu ? contextMenu.nextId() : 0;
    }
    this.jslogContext = jslogContext;
    this.featureName = featureName;
  }
  /**
   * Returns the unique ID of this item.
   * @throws If the item ID was not set (e.g. for a separator).
   */
  id() {
    if (this.idInternal === void 0) {
      throw new Error("Tried to access a ContextMenu Item ID but none was set.");
    }
    return this.idInternal;
  }
  /**
   * Returns the type of this item (e.g. 'item', 'checkbox').
   */
  type() {
    return this.typeInternal;
  }
  /**
   * Returns whether this item is marked as a preview feature (experimental).
   */
  isPreviewFeature() {
    return this.previewFeature;
  }
  /**
   * Returns whether this item is enabled.
   */
  isEnabled() {
    return !this.disabled;
  }
  /**
   * Sets the enabled state of this item.
   * @param enabled True to enable the item, false to disable it.
   */
  setEnabled(enabled) {
    this.disabled = !enabled;
  }
  /**
   * Builds a descriptor object for this item.
   * This descriptor is used to create the actual menu item in either
   * a soft-rendered menu or a native menu.
   * @returns The descriptor for the item.
   * @throws If the item type is invalid.
   */
  buildDescriptor() {
    switch (this.typeInternal) {
      case "item": {
        const result = {
          type: "item",
          id: this.idInternal,
          label: this.label,
          isExperimentalFeature: this.previewFeature,
          enabled: !this.disabled,
          checked: void 0,
          subItems: void 0,
          tooltip: this.#tooltip,
          jslogContext: this.jslogContext,
          featureName: this.featureName
        };
        if (this.customElement) {
          result.element = this.customElement;
        }
        if (this.shortcut) {
          result.shortcut = this.shortcut;
        }
        if (this.accelerator) {
          result.accelerator = this.accelerator;
          if (this.isDevToolsPerformanceMenuItem) {
            result.isDevToolsPerformanceMenuItem = true;
          }
        }
        return result;
      }
      case "separator": {
        return {
          type: "separator",
          id: void 0,
          label: void 0,
          enabled: void 0,
          checked: void 0,
          subItems: void 0
        };
      }
      case "checkbox": {
        const result = {
          type: "checkbox",
          id: this.idInternal,
          label: this.label,
          checked: Boolean(this.checked),
          isExperimentalFeature: this.previewFeature,
          enabled: !this.disabled,
          subItems: void 0,
          tooltip: this.#tooltip,
          jslogContext: this.jslogContext
        };
        if (this.customElement) {
          result.element = this.customElement;
        }
        return result;
      }
    }
    throw new Error("Invalid item type:" + this.typeInternal);
  }
  /**
   * Sets a keyboard accelerator for this item.
   * @param key The key code for the accelerator.
   * @param modifiers An array of modifiers (e.g. Ctrl, Shift).
   */
  setAccelerator(key, modifiers) {
    const modifierSum = modifiers.reduce((result, modifier) => result + ShortcutRegistry.instance().devToolsToChromeModifier(modifier), 0);
    this.accelerator = { keyCode: key.code, modifiers: modifierSum };
  }
  /**
   * This influences whether accelerators will be shown for native menus on Mac.
   * Use this ONLY for performance menus and ONLY where accelerators are critical
   * for a smooth user journey and heavily context dependent.
   * @param isDevToolsPerformanceMenuItem True if this is a DevTools performance menu item.
   */
  setIsDevToolsPerformanceMenuItem(isDevToolsPerformanceMenuItem) {
    this.isDevToolsPerformanceMenuItem = isDevToolsPerformanceMenuItem;
  }
  /**
   * Sets a display string for the shortcut associated with this item.
   * This is typically used when the shortcut is managed by `ActionRegistry`.
   * @param shortcut The shortcut string to display.
   */
  setShortcut(shortcut) {
    this.shortcut = shortcut;
  }
};
var Section = class {
  contextMenu;
  items;
  constructor(contextMenu) {
    this.contextMenu = contextMenu;
    this.items = [];
  }
  /**
   * Appends a standard clickable item to this section.
   * @param label The text to display for the item.
   * @param handler The function to execute when the item is clicked.
   * @param options Optional settings for the item.
   * @returns The newly created `Item`.
   */
  appendItem(label, handler, options) {
    const item8 = new Item(this.contextMenu, "item", label, options?.isPreviewFeature, options?.disabled, void 0, options?.accelerator, options?.tooltip, options?.jslogContext, options?.featureName);
    if (options?.additionalElement) {
      item8.customElement = options?.additionalElement;
    }
    this.items.push(item8);
    if (this.contextMenu) {
      this.contextMenu.setHandler(item8.id(), handler);
    }
    return item8;
  }
  /**
   * Appends an item that contains a custom HTML element (for non-native menus only).
   * @param element The custom `Element` to display in the menu item.
   * @param jslogContext An optional string identifying the element for visual logging.
   * @returns The newly created `Item`.
   */
  appendCustomItem(element, jslogContext) {
    const item8 = new Item(this.contextMenu, "item", void 0, void 0, void 0, void 0, void 0, void 0, jslogContext);
    item8.customElement = element;
    this.items.push(item8);
    return item8;
  }
  /**
   * Appends a visual separator to this section.
   * @returns The newly created separator `Item`.
   */
  appendSeparator() {
    const item8 = new Item(this.contextMenu, "separator");
    this.items.push(item8);
    return item8;
  }
  /**
   * Appends an item that triggers a registered `Action`.
   * The item's label, handler, enabled state, and shortcut are derived from the action.
   * @param actionId The ID of the action to append.
   * @param label Optional label to override the action's title.
   * @param optional If true and the action is not registered, this method does nothing.
   */
  appendAction(actionId, label, optional, jslogContext, feature) {
    if (optional && !ActionRegistry.instance().hasAction(actionId)) {
      return;
    }
    const action6 = ActionRegistry.instance().getAction(actionId);
    if (!label) {
      label = action6.title();
    }
    const promotionId = action6.featurePromotionId();
    let additionalElement = void 0;
    if (promotionId) {
      additionalElement = maybeCreateNewBadge(promotionId);
    }
    const result = this.appendItem(label, action6.execute.bind(action6), { disabled: !action6.enabled(), jslogContext: jslogContext ?? actionId, featureName: feature, additionalElement });
    const shortcut = ShortcutRegistry.instance().shortcutTitleForAction(actionId);
    const keyAndModifier = ShortcutRegistry.instance().keyAndModifiersForAction(actionId);
    if (keyAndModifier) {
      result.setAccelerator(keyAndModifier.key, [keyAndModifier.modifier]);
    }
    if (shortcut) {
      result.setShortcut(shortcut);
    }
  }
  /**
   * Appends an item that, when clicked, opens a sub-menu.
   * @param label The text to display for the sub-menu item.
   * @param disabled Whether the sub-menu item should be disabled.
   * @param jslogContext An optional string identifying the element for visual logging.
   * @returns The newly created `SubMenu` instance.
   */
  appendSubMenuItem(label, disabled, jslogContext, featureName) {
    const item8 = new SubMenu(this.contextMenu, label, disabled, jslogContext, featureName);
    item8.init();
    this.items.push(item8);
    return item8;
  }
  /**
   * Appends a checkbox item to this section.
   * @param label The text to display for the checkbox item.
   * @param handler The function to execute when the checkbox state changes.
   * @param options Optional settings for the checkbox item.
   * @returns The newly created checkbox `Item`.
   */
  appendCheckboxItem(label, handler, options) {
    const item8 = new Item(this.contextMenu, "checkbox", label, options?.experimental, options?.disabled, options?.checked, void 0, options?.tooltip, options?.jslogContext, options?.featureName);
    this.items.push(item8);
    if (this.contextMenu) {
      this.contextMenu.setHandler(item8.id(), handler);
    }
    if (options?.additionalElement) {
      item8.customElement = options.additionalElement;
    }
    return item8;
  }
};
var SubMenu = class extends Item {
  sections;
  sectionList;
  constructor(contextMenu, label, disabled, jslogContext, featureName) {
    super(contextMenu, "subMenu", label, void 0, disabled, void 0, void 0, void 0, jslogContext, featureName);
    this.sections = /* @__PURE__ */ new Map();
    this.sectionList = [];
  }
  /**
   * Initializes the standard sections for this sub-menu based on `ContextMenu.groupWeights`.
   */
  init() {
    ContextMenu.groupWeights.forEach((name) => this.section(name));
  }
  /**
   * Retrieves an existing section by its name or creates a new one if it doesn't exist.
   *
   * If a section with the given `name` (or 'default' if `name` is unspecified) is not found,
   * a new `Section` instance is created, stored internally for future lookups by that name,
   * and added to the ordered list of sections for this submenu.
   *
   * @param name The optional name of the section. Defaults to 'default' if not provided.
   * @returns The `Section` object, either pre-existing or newly created.
   */
  section(name) {
    if (!name) {
      name = "default";
    }
    let section4 = name ? this.sections.get(name) : null;
    if (!section4) {
      section4 = new Section(this.contextMenu);
      if (name) {
        this.sections.set(name, section4);
        this.sectionList.push(section4);
      } else {
        this.sectionList.splice(ContextMenu.groupWeights.indexOf("default"), 0, section4);
      }
    }
    return section4;
  }
  /**
   * Retrieves or creates the 'header' section.
   * @returns The 'header' `Section` object.
   */
  headerSection() {
    return this.section("header");
  }
  /**
   * Retrieves or creates the 'new' section.
   * @returns The 'new' `Section` object.
   */
  newSection() {
    return this.section("new");
  }
  /**
   * Retrieves or creates the 'reveal' section.
   * @returns The 'reveal' `Section` object.
   */
  revealSection() {
    return this.section("reveal");
  }
  /**
   * Retrieves or creates the 'clipboard' section.
   * @returns The 'clipboard' `Section` object.
   */
  clipboardSection() {
    return this.section("clipboard");
  }
  /**
   * Retrieves or creates the 'edit' section.
   * @returns The 'edit' `Section` object.
   */
  editSection() {
    return this.section("edit");
  }
  /**
   * Retrieves or creates the 'debug' section.
   * @returns The 'debug' `Section` object.
   */
  debugSection() {
    return this.section("debug");
  }
  /**
   * Retrieves or creates the 'view' section.
   * @returns The 'view' `Section` object.
   */
  viewSection() {
    return this.section("view");
  }
  /**
   * Retrieves or creates the 'default' section.
   * This is often used for general-purpose menu items.
   * @returns The 'default' `Section` object.
   */
  defaultSection() {
    return this.section("default");
  }
  /**
   * Retrieves or creates the 'override' section.
   * @returns The 'override' `Section` object.
   */
  overrideSection() {
    return this.section("override");
  }
  /**
   * Retrieves or creates the 'save' section.
   * @returns The 'save' `Section` object.
   */
  saveSection() {
    return this.section("save");
  }
  /**
   * Retrieves or creates the 'annotation' section.
   * @returns The 'annotation' `Section` object.
   */
  annotationSection() {
    return this.section("annotation");
  }
  /**
   * Retrieves or creates the 'footer' section.
   * @returns The 'footer' `Section` object.
   */
  footerSection() {
    return this.section("footer");
  }
  buildDescriptor() {
    const result = {
      type: "subMenu",
      label: this.label,
      accelerator: this.accelerator,
      isDevToolsPerformanceMenuItem: this.accelerator ? this.isDevToolsPerformanceMenuItem : void 0,
      isExperimentalFeature: this.previewFeature,
      enabled: !this.disabled,
      subItems: [],
      id: void 0,
      checked: void 0,
      jslogContext: this.jslogContext,
      featureName: this.featureName
    };
    const nonEmptySections = this.sectionList.filter((section4) => Boolean(section4.items.length));
    for (const section4 of nonEmptySections) {
      for (const item8 of section4.items) {
        if (!result.subItems) {
          result.subItems = [];
        }
        result.subItems.push(item8.buildDescriptor());
      }
      if (section4 !== nonEmptySections[nonEmptySections.length - 1]) {
        if (!result.subItems) {
          result.subItems = [];
        }
        result.subItems.push({
          type: "separator",
          id: void 0,
          subItems: void 0,
          checked: void 0,
          enabled: void 0,
          label: void 0
        });
      }
    }
    return result;
  }
  /**
   * Appends registered context menu items that are configured to appear under a specific `location` path.
   * Items are sorted by their `order` property.
   * Experimental items are only added if their corresponding experiment is enabled.
   * @param location The base location path (e.g. 'mainMenu'). Items with locations like 'mainMenu/default' will be appended.
   */
  appendItemsAtLocation(location) {
    const items = getRegisteredItems();
    items.sort((firstItem, secondItem) => {
      const order1 = firstItem.order || 0;
      const order2 = secondItem.order || 0;
      return order1 - order2;
    });
    for (const item8 of items) {
      if (item8.experiment && !Root5.Runtime.experiments.isEnabled(item8.experiment)) {
        continue;
      }
      const itemLocation = item8.location;
      const actionId = item8.actionId;
      if (!itemLocation?.startsWith(location + "/")) {
        continue;
      }
      const section4 = itemLocation.substr(location.length + 1);
      if (!section4 || section4.includes("/")) {
        continue;
      }
      if (actionId) {
        this.section(section4).appendAction(actionId);
      }
    }
  }
};
var MENU_ITEM_HEIGHT_FOR_LOGGING = 20;
var MENU_ITEM_WIDTH_FOR_LOGGING = 200;
var ContextMenu = class _ContextMenu extends SubMenu {
  contextMenu;
  pendingTargets;
  event;
  useSoftMenu;
  keepOpen;
  x;
  y;
  onSoftMenuClosed;
  handlers;
  idInternal;
  softMenu;
  contextMenuLabel;
  openHostedMenu;
  eventTarget;
  loggableParent = null;
  /**
   * Creates an instance of `ContextMenu`.
   * @param event The mouse event that triggered the menu.
   * @param options Optional configuration for the context menu.
   */
  constructor(event, options = {}) {
    super(null);
    const mouseEvent = event;
    this.contextMenu = this;
    super.init();
    this.pendingTargets = [];
    this.event = mouseEvent;
    this.eventTarget = this.event.target;
    this.useSoftMenu = Boolean(options.useSoftMenu);
    this.keepOpen = Boolean(options.keepOpen);
    this.x = options.x === void 0 ? mouseEvent.x : options.x;
    this.y = options.y === void 0 ? mouseEvent.y : options.y;
    this.onSoftMenuClosed = options.onSoftMenuClosed;
    this.handlers = /* @__PURE__ */ new Map();
    this.idInternal = 0;
    this.openHostedMenu = null;
    let target = deepElementFromEvent(event) || event.target;
    if (target) {
      this.appendApplicableItems(target);
      while (target instanceof Element && !target.hasAttribute("jslog")) {
        target = target.parentElementOrShadowHost() ?? null;
      }
      if (target instanceof Element) {
        this.loggableParent = target;
      }
    }
  }
  /**
   * Initializes global settings for context menus, such as listening for
   * commands from the host to toggle soft menu usage.
   */
  static initialize() {
    Host6.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host6.InspectorFrontendHostAPI.Events.SetUseSoftMenu, setUseSoftMenu);
    function setUseSoftMenu(event) {
      _ContextMenu.useSoftMenu = event.data;
    }
  }
  /**
   * Installs a global context menu handler on the provided document's body.
   * This handler will create and show a `ContextMenu` when a contextmenu event is detected.
   * @param doc The `Document` to install the handler on.
   */
  static installHandler(doc) {
    doc.body.addEventListener("contextmenu", handler, false);
    function handler(event) {
      const contextMenu = new _ContextMenu(event);
      void contextMenu.show();
    }
  }
  /**
   * Generates the next unique ID for a menu item within this `ContextMenu`.
   * @returns A unique number for the item ID.
   */
  nextId() {
    return this.idInternal++;
  }
  /**
   * Checks if a native (hosted) context menu is currently open.
   * @returns `true` if a native menu is open, `false` otherwise.
   */
  isHostedMenuOpen() {
    return Boolean(this.openHostedMenu);
  }
  /**
   * Retrieves the item descriptors if a soft menu is currently active.
   * @returns An array of `SoftContextMenuDescriptor`s or an empty array if no soft menu is active.
   */
  getItems() {
    return this.softMenu?.getItems() || [];
  }
  /**
   * Sets the checked state of an item in an active soft menu.
   * @param item The descriptor of the item to update.
   * @param checked `true` to check the item, `false` to uncheck it.
   */
  setChecked(item8, checked) {
    this.softMenu?.setChecked(item8, checked);
  }
  /**
   * Shows the context menu. This involves loading items from registered providers
   * and then displaying either a soft or native menu.
   */
  async show() {
    _ContextMenu.pendingMenu = this;
    this.event.consume(true);
    const loadedProviders = await Promise.all(this.pendingTargets.map(async (target) => {
      const providers = await loadApplicableRegisteredProviders(target);
      return { target, providers };
    }));
    if (_ContextMenu.pendingMenu !== this) {
      return;
    }
    _ContextMenu.pendingMenu = null;
    for (const { target, providers } of loadedProviders) {
      for (const provider of providers) {
        provider.appendApplicableItems(this.event, this, target);
      }
    }
    this.pendingTargets = [];
    this.#show();
  }
  /**
   * Discards (closes) the soft context menu if it's currently shown.
   */
  discard() {
    if (this.softMenu) {
      this.softMenu.discard();
    }
  }
  registerLoggablesWithin(descriptors, parent) {
    for (const descriptor of descriptors) {
      if (descriptor.jslogContext) {
        if (descriptor.type === "checkbox") {
          VisualLogging9.registerLoggable(descriptor, `${VisualLogging9.toggle().track({ click: true }).context(descriptor.jslogContext)}`, parent || descriptors, new DOMRect(0, 0, MENU_ITEM_WIDTH_FOR_LOGGING, MENU_ITEM_HEIGHT_FOR_LOGGING));
        } else if (descriptor.type === "item") {
          VisualLogging9.registerLoggable(descriptor, `${VisualLogging9.action().track({ click: true }).context(descriptor.jslogContext)}`, parent || descriptors, new DOMRect(0, 0, MENU_ITEM_WIDTH_FOR_LOGGING, MENU_ITEM_HEIGHT_FOR_LOGGING));
        } else if (descriptor.type === "subMenu") {
          VisualLogging9.registerLoggable(descriptor, `${VisualLogging9.item().context(descriptor.jslogContext)}`, parent || descriptors, new DOMRect(0, 0, MENU_ITEM_WIDTH_FOR_LOGGING, MENU_ITEM_HEIGHT_FOR_LOGGING));
        }
        if (descriptor.subItems) {
          this.registerLoggablesWithin(descriptor.subItems, descriptor);
        }
      }
    }
  }
  #show() {
    if (!this.eventTarget) {
      return;
    }
    const menuObject = this.buildMenuDescriptors();
    const ownerDocument = this.eventTarget.ownerDocument;
    if (this.useSoftMenu || _ContextMenu.useSoftMenu || Host6.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()) {
      this.softMenu = new SoftContextMenu(menuObject, this.itemSelected.bind(this), this.keepOpen, void 0, this.onSoftMenuClosed, this.loggableParent);
      const isMouseEvent = this.event.pointerType === "mouse" && this.event.button >= 0;
      this.softMenu.setFocusOnTheFirstItem(!isMouseEvent);
      this.softMenu.show(ownerDocument, new AnchorBox(this.x, this.y, 0, 0));
      if (this.contextMenuLabel) {
        this.softMenu.setContextMenuElementLabel(this.contextMenuLabel);
      }
    } else {
      let listenToEvents = function() {
        Host6.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host6.InspectorFrontendHostAPI.Events.ContextMenuCleared, this.menuCleared, this);
        Host6.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host6.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, this.onItemSelected, this);
      };
      Host6.InspectorFrontendHost.InspectorFrontendHostInstance.showContextMenuAtPoint(this.x, this.y, menuObject, ownerDocument);
      VisualLogging9.registerLoggable(menuObject, `${VisualLogging9.menu()}`, this.loggableParent, new DOMRect(0, 0, MENU_ITEM_WIDTH_FOR_LOGGING, MENU_ITEM_HEIGHT_FOR_LOGGING * menuObject.length));
      this.registerLoggablesWithin(menuObject);
      this.openHostedMenu = menuObject;
      queueMicrotask(listenToEvents.bind(this));
    }
  }
  /**
   * Sets the x-coordinate for the menu's position.
   * @param x The new x-coordinate.
   */
  setX(x) {
    this.x = x;
  }
  /**
   * Sets the y-coordinate for the menu's position.
   * @param y The new y-coordinate.
   */
  setY(y) {
    this.y = y;
  }
  /**
   * Associates a handler function with a menu item ID.
   * @param id The ID of the menu item.
   * @param handler The function to execute when the item is selected.
   */
  setHandler(id2, handler) {
    if (handler) {
      this.handlers.set(id2, handler);
    }
  }
  /**
   * Invokes the handler associated with the given menu item ID.
   * @param id The ID of the selected menu item.
   */
  invokeHandler(id2) {
    const handler = this.handlers.get(id2);
    if (handler) {
      handler.call(this);
    }
  }
  buildMenuDescriptors() {
    return super.buildDescriptor().subItems;
  }
  onItemSelected(event) {
    this.itemSelected(event.data);
  }
  itemSelected(id2) {
    this.invokeHandler(id2);
    const featuresUsed = [];
    if (this.openHostedMenu) {
      const itemWithId = (items, id3) => {
        for (const item9 of items) {
          if (item9.id === id3) {
            if (item9.featureName) {
              featuresUsed.push(item9.featureName);
            }
            return item9;
          }
          const subitem = item9.subItems && itemWithId(item9.subItems, id3);
          if (subitem) {
            if (item9.featureName) {
              featuresUsed.push(item9.featureName);
            }
            return subitem;
          }
        }
        return null;
      };
      const item8 = itemWithId(this.openHostedMenu, id2);
      if (item8?.jslogContext) {
        void VisualLogging9.logClick(item8, new MouseEvent("click"));
      }
      if (item8 && featuresUsed.length > 0) {
        featuresUsed.map((feature) => Host6.InspectorFrontendHost.InspectorFrontendHostInstance.recordNewBadgeUsage(feature));
      }
    }
    this.menuCleared();
  }
  menuCleared() {
    Host6.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(Host6.InspectorFrontendHostAPI.Events.ContextMenuCleared, this.menuCleared, this);
    Host6.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(Host6.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, this.onItemSelected, this);
    if (this.openHostedMenu) {
      void VisualLogging9.logResize(this.openHostedMenu, new DOMRect(0, 0, 0, 0));
    }
    this.openHostedMenu = null;
    if (!this.keepOpen) {
      this.onSoftMenuClosed?.();
    }
  }
  /**
   * Appends the `target` to the list of pending targets for which context menu providers
   * will be loaded when showing the context menu.
   *
   * @param target an object for which we can have registered menu item providers.
   */
  appendApplicableItems(target) {
    if (this.pendingTargets.includes(target)) {
      return;
    }
    this.pendingTargets.push(target);
  }
  /**
   * Marks the soft context menu (if one exists) to visually indicate that its items behave like checkboxes.
   */
  markAsMenuItemCheckBox() {
    if (this.softMenu) {
      this.softMenu.markAsMenuItemCheckBox();
    }
  }
  static pendingMenu = null;
  static useSoftMenu = false;
  static groupWeights = [
    "header",
    "new",
    "reveal",
    "edit",
    "clipboard",
    "debug",
    "view",
    "default",
    "override",
    "save",
    "annotation",
    "footer"
  ];
};
var MenuButton = class extends HTMLElement {
  static observedAttributes = ["icon-name", "disabled"];
  #shadow = this.attachShadow({ mode: "open" });
  #triggerTimeoutId;
  #populateMenuCall;
  /**
   * Sets the callback function used to populate the context menu when the button is clicked.
   * @param populateCall A function that takes a `ContextMenu` instance and adds items to it.
   */
  set populateMenuCall(populateCall) {
    this.#populateMenuCall = populateCall;
  }
  /**
   * Reflects the `soft-menu` attribute. If true, uses the `SoftContextMenu` implementation.
   * @default false
   */
  get softMenu() {
    return Boolean(this.getAttribute("soft-menu"));
  }
  set softMenu(softMenu) {
    this.toggleAttribute("soft-menu", softMenu);
  }
  /**
   * Reflects the `keep-open` attribute. If true, the menu stays open after an item click.
   * @default false
   */
  get keepOpen() {
    return Boolean(this.getAttribute("keep-open"));
  }
  set keepOpen(keepOpen) {
    this.toggleAttribute("keep-open", keepOpen);
  }
  /**
   * Reflects the `icon-name` attribute. Sets the icon to display on the button.
   */
  set iconName(iconName) {
    this.setAttribute("icon-name", iconName);
  }
  get iconName() {
    return this.getAttribute("icon-name");
  }
  /**
   * Reflects the `jslogContext` attribute. Sets the visual logging context for the button.
   */
  set jslogContext(jslogContext) {
    this.setAttribute("jslog", VisualLogging9.dropDown(jslogContext).track({ click: true }).toString());
  }
  get jslogContext() {
    return this.getAttribute("jslogContext");
  }
  /**
   * Reflects the `disabled` attribute. If true, the button cannot be clicked.
   * @default false
   */
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(disabled) {
    this.toggleAttribute("disabled", disabled);
  }
  /**
   * Creates and shows the `ContextMenu`. It calls the `populateMenuCall`
   * callback to fill the menu with items before displaying it relative to the button.
   * Manages the `aria-expanded` state.
   * @param event The event that triggered the menu
   */
  #openMenu(event) {
    this.#triggerTimeoutId = void 0;
    if (!this.#populateMenuCall) {
      return;
    }
    const button = this.#shadow.querySelector("devtools-button");
    const contextMenu = new ContextMenu(event, {
      useSoftMenu: this.softMenu,
      keepOpen: this.keepOpen,
      x: this.getBoundingClientRect().right,
      y: this.getBoundingClientRect().top + this.offsetHeight,
      // Without adding a delay, pointer events will be un-ignored too early, and a single click causes
      // the context menu to be closed and immediately re-opened on Windows (https://crbug.com/339560549).
      onSoftMenuClosed: () => setTimeout(() => button?.removeAttribute("aria-expanded"), 50)
    });
    this.#populateMenuCall(contextMenu);
    button?.setAttribute("aria-expanded", "true");
    void contextMenu.show();
  }
  /**
   * Handles the click event on the button. It clears any pending trigger timeout
   * and immediately calls the `openMenu` method to show the context menu.
   * @param event The click event.
   */
  #triggerContextMenu(event) {
    const triggerTimeout = 50;
    if (!this.#triggerTimeoutId) {
      this.#triggerTimeoutId = window.setTimeout(this.#openMenu.bind(this, event), triggerTimeout);
    }
  }
  attributeChangedCallback(_, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.#render();
    }
  }
  connectedCallback() {
    this.#render();
  }
  #render() {
    if (!this.iconName) {
      throw new Error("<devtools-menu-button> expects an icon.");
    }
    render(html`
        <devtools-button .disabled=${this.disabled}
                         .iconName=${this.iconName}
                         .variant=${"icon"}
                         .title=${this.title}
                         aria-haspopup='menu'
                         @click=${this.#triggerContextMenu}>
        </devtools-button>`, this.#shadow, { host: this });
  }
};
customElements.define("devtools-menu-button", MenuButton);
var registeredProviders = [];
function registerProvider(registration) {
  registeredProviders.push(registration);
}
async function loadApplicableRegisteredProviders(target) {
  const providers = [];
  for (const providerRegistration of registeredProviders) {
    if (!Root5.Runtime.Runtime.isDescriptorEnabled({ experiment: providerRegistration.experiment, condition: void 0 })) {
      continue;
    }
    if (providerRegistration.contextTypes) {
      for (const contextType of providerRegistration.contextTypes()) {
        if (target instanceof contextType) {
          providers.push(await providerRegistration.loadProvider());
        }
      }
    }
  }
  return providers;
}
var registeredItemsProviders = [];
function registerItem(registration) {
  registeredItemsProviders.push(registration);
}
function maybeRemoveItem(registration) {
  const itemIndex = registeredItemsProviders.findIndex((item8) => item8.actionId === registration.actionId && item8.location === registration.location);
  if (itemIndex < 0) {
    return false;
  }
  registeredItemsProviders.splice(itemIndex, 1);
  return true;
}
function getRegisteredItems() {
  return registeredItemsProviders;
}

// gen/front_end/ui/legacy/TextPrompt.js
var TextPrompt_exports = {};
__export(TextPrompt_exports, {
  TextPrompt: () => TextPrompt,
  TextPromptElement: () => TextPromptElement
});
import * as Common12 from "./../../core/common/common.js";
import * as Platform12 from "./../../core/platform/platform.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as VisualLogging12 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/SuggestBox.js
var SuggestBox_exports = {};
__export(SuggestBox_exports, {
  SuggestBox: () => SuggestBox
});
import * as i18n17 from "./../../core/i18n/i18n.js";
import * as Platform11 from "./../../core/platform/platform.js";
import * as Geometry4 from "./../../models/geometry/geometry.js";
import * as VisualLogging11 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/ListControl.js
var ListControl_exports = {};
__export(ListControl_exports, {
  ListControl: () => ListControl,
  ListMode: () => ListMode
});
import * as Platform9 from "./../../core/platform/platform.js";
import * as VisualLogging10 from "./../visual_logging/visual_logging.js";
var ListMode;
(function(ListMode2) {
  ListMode2["NonViewport"] = "UI.ListMode.NonViewport";
  ListMode2["EqualHeightItems"] = "UI.ListMode.EqualHeightItems";
  ListMode2["VariousHeightItems"] = "UI.ListMode.VariousHeightItems";
})(ListMode || (ListMode = {}));
var ListControl = class {
  element;
  topElement;
  bottomElement;
  firstIndex;
  lastIndex;
  renderedHeight;
  topHeight;
  bottomHeight;
  model;
  itemToElement;
  #selectedIndex;
  #selectedItem;
  delegate;
  mode;
  fixedHeight;
  variableOffsets;
  constructor(model, delegate, mode) {
    this.element = document.createElement("div");
    this.element.style.overflowY = "auto";
    this.topElement = this.element.createChild("div");
    this.bottomElement = this.element.createChild("div");
    this.firstIndex = 0;
    this.lastIndex = 0;
    this.renderedHeight = 0;
    this.topHeight = 0;
    this.bottomHeight = 0;
    this.model = model;
    this.model.addEventListener("ItemsReplaced", this.replacedItemsInRange, this);
    this.itemToElement = /* @__PURE__ */ new Map();
    this.#selectedIndex = -1;
    this.#selectedItem = null;
    this.element.tabIndex = -1;
    this.element.addEventListener("click", this.onClick.bind(this), false);
    this.element.addEventListener("keydown", this.onKeyDown.bind(this), false);
    markAsListBox(this.element);
    this.delegate = delegate;
    this.mode = mode || ListMode.EqualHeightItems;
    this.fixedHeight = 0;
    this.variableOffsets = new Int32Array(0);
    this.clearContents();
    if (this.mode !== ListMode.NonViewport) {
      this.element.addEventListener("scroll", () => {
        this.updateViewport(this.element.scrollTop, this.element.offsetHeight);
      }, false);
    }
  }
  setModel(model) {
    this.itemToElement.clear();
    const length = this.model.length;
    this.model.removeEventListener("ItemsReplaced", this.replacedItemsInRange, this);
    this.model = model;
    this.model.addEventListener("ItemsReplaced", this.replacedItemsInRange, this);
    this.invalidateRange(0, length);
  }
  replacedItemsInRange(event) {
    const data = event.data;
    const from = data.index;
    const to = from + data.removed.length;
    const keepSelectedIndex = data.keepSelectedIndex;
    const oldSelectedItem = this.#selectedItem;
    const oldSelectedElement = oldSelectedItem !== null ? this.itemToElement.get(oldSelectedItem) || null : null;
    for (let i = 0; i < data.removed.length; i++) {
      this.itemToElement.delete(data.removed[i]);
    }
    this.invalidate(from, to, data.inserted);
    if (this.#selectedIndex >= to) {
      this.#selectedIndex += data.inserted - (to - from);
      this.#selectedItem = this.model.at(this.#selectedIndex);
    } else if (this.#selectedIndex >= from) {
      const selectableIndex = keepSelectedIndex ? from : from + data.inserted;
      let index = this.findFirstSelectable(selectableIndex, 1, false);
      if (index === -1) {
        const alternativeSelectableIndex = keepSelectedIndex ? from : from - 1;
        index = this.findFirstSelectable(alternativeSelectableIndex, -1, false);
      }
      this.select(index, oldSelectedItem, oldSelectedElement);
    }
  }
  refreshItem(item8) {
    const index = this.model.indexOf(item8);
    if (index === -1) {
      console.error("Item to refresh is not present");
      return;
    }
    this.refreshItemByIndex(index);
  }
  refreshItemByIndex(index) {
    const item8 = this.model.at(index);
    this.itemToElement.delete(item8);
    this.invalidateRange(index, index + 1);
    if (this.#selectedIndex !== -1) {
      this.select(this.#selectedIndex, null, null);
    }
  }
  refreshAllItems() {
    this.itemToElement.clear();
    this.invalidateRange(0, this.model.length);
    if (this.#selectedIndex !== -1) {
      this.select(this.#selectedIndex, null, null);
    }
  }
  invalidateRange(from, to) {
    this.invalidate(from, to, to - from);
  }
  viewportResized() {
    if (this.mode === ListMode.NonViewport) {
      return;
    }
    const scrollTop = this.element.scrollTop;
    const viewportHeight = this.element.offsetHeight;
    this.clearViewport();
    this.updateViewport(Platform9.NumberUtilities.clamp(scrollTop, 0, this.totalHeight() - viewportHeight), viewportHeight);
  }
  invalidateItemHeight() {
    if (this.mode !== ListMode.EqualHeightItems) {
      console.error("Only supported in equal height items mode");
      return;
    }
    this.fixedHeight = 0;
    if (this.model.length) {
      this.itemToElement.clear();
      this.invalidate(0, this.model.length, this.model.length);
    }
  }
  itemForNode(node) {
    while (node && node.parentNodeOrShadowHost() !== this.element) {
      node = node.parentNodeOrShadowHost();
    }
    if (!node) {
      return null;
    }
    const element = node;
    const index = this.model.findIndex((item8) => this.itemToElement.get(item8) === element);
    return index !== -1 ? this.model.at(index) : null;
  }
  scrollItemIntoView(item8, center) {
    const index = this.model.indexOf(item8);
    if (index === -1) {
      console.error("Attempt to scroll onto missing item");
      return;
    }
    this.scrollIntoView(index, center);
  }
  selectedItem() {
    return this.#selectedItem;
  }
  selectedIndex() {
    return this.#selectedIndex;
  }
  selectItem(item8, center, dontScroll) {
    let index = -1;
    if (item8 !== null) {
      index = this.model.indexOf(item8);
      if (index === -1) {
        console.error("Attempt to select missing item");
        return;
      }
      if (!this.delegate.isItemSelectable(item8)) {
        console.error("Attempt to select non-selectable item");
        return;
      }
    }
    if (index !== -1 && !dontScroll) {
      this.scrollIntoView(index, center);
    }
    if (this.#selectedIndex !== index) {
      this.select(index);
    }
  }
  selectPreviousItem(canWrap, center) {
    if (this.#selectedIndex === -1 && !canWrap) {
      return false;
    }
    let index = this.#selectedIndex === -1 ? this.model.length - 1 : this.#selectedIndex - 1;
    index = this.findFirstSelectable(index, -1, Boolean(canWrap));
    if (index !== -1) {
      this.scrollIntoView(index, center);
      this.select(index);
      return true;
    }
    return false;
  }
  selectNextItem(canWrap, center) {
    if (this.#selectedIndex === -1 && !canWrap) {
      return false;
    }
    let index = this.#selectedIndex === -1 ? 0 : this.#selectedIndex + 1;
    index = this.findFirstSelectable(index, 1, Boolean(canWrap));
    if (index !== -1) {
      this.scrollIntoView(index, center);
      this.select(index);
      return true;
    }
    return false;
  }
  selectItemPreviousPage(center) {
    if (this.mode === ListMode.NonViewport) {
      return false;
    }
    let index = this.#selectedIndex === -1 ? this.model.length - 1 : this.#selectedIndex;
    index = this.findPageSelectable(index, -1);
    if (index !== -1) {
      this.scrollIntoView(index, center);
      this.select(index);
      return true;
    }
    return false;
  }
  selectItemNextPage(center) {
    if (this.mode === ListMode.NonViewport) {
      return false;
    }
    let index = this.#selectedIndex === -1 ? 0 : this.#selectedIndex;
    index = this.findPageSelectable(index, 1);
    if (index !== -1) {
      this.scrollIntoView(index, center);
      this.select(index);
      return true;
    }
    return false;
  }
  scrollIntoView(index, center) {
    if (this.mode === ListMode.NonViewport) {
      this.elementAtIndex(index).scrollIntoViewIfNeeded(Boolean(center));
      return;
    }
    const top = this.offsetAtIndex(index);
    const bottom = this.offsetAtIndex(index + 1);
    const viewportHeight = this.element.offsetHeight;
    if (center) {
      const scrollTo = (top + bottom) / 2 - viewportHeight / 2;
      this.updateViewport(Platform9.NumberUtilities.clamp(scrollTo, 0, this.totalHeight() - viewportHeight), viewportHeight);
      return;
    }
    const scrollTop = this.element.scrollTop;
    if (top < scrollTop) {
      this.updateViewport(top, viewportHeight);
    } else if (bottom > scrollTop + viewportHeight) {
      this.updateViewport(bottom - viewportHeight, viewportHeight);
    }
  }
  onClick(event) {
    const item8 = this.itemForNode(event.target);
    if (item8 !== null && this.delegate.isItemSelectable(item8)) {
      this.selectItem(item8);
    }
  }
  onKeyDown(event) {
    let selected = false;
    switch (event.key) {
      case "ArrowUp":
        selected = this.selectPreviousItem(true, false);
        break;
      case "ArrowDown":
        selected = this.selectNextItem(true, false);
        break;
      case "PageUp":
        selected = this.selectItemPreviousPage(false);
        break;
      case "PageDown":
        selected = this.selectItemNextPage(false);
        break;
    }
    if (selected) {
      event.consume(true);
    }
  }
  totalHeight() {
    return this.offsetAtIndex(this.model.length);
  }
  indexAtOffset(offset) {
    if (this.mode === ListMode.NonViewport) {
      throw new Error("There should be no offset conversions in non-viewport mode");
    }
    if (!this.model.length || offset < 0) {
      return 0;
    }
    if (this.mode === ListMode.VariousHeightItems) {
      return Math.min(this.model.length - 1, Platform9.ArrayUtilities.lowerBound(this.variableOffsets, offset, Platform9.ArrayUtilities.DEFAULT_COMPARATOR, 0, this.model.length));
    }
    if (!this.fixedHeight) {
      this.measureHeight();
    }
    return Math.min(this.model.length - 1, Math.floor(offset / this.fixedHeight));
  }
  elementAtIndex(index) {
    const item8 = this.model.at(index);
    let element = this.itemToElement.get(item8);
    if (!element) {
      element = this.delegate.createElementForItem(item8);
      if (!element.hasAttribute("jslog")) {
        element.setAttribute("jslog", `${VisualLogging10.item().track({ click: true, keydown: "ArrowUp|ArrowDown|PageUp|PageDown" })}`);
      }
      this.itemToElement.set(item8, element);
      this.updateElementARIA(element, index);
    }
    return element;
  }
  refreshARIA() {
    for (let index = this.firstIndex; index <= this.lastIndex; index++) {
      const item8 = this.model.at(index);
      const element = this.itemToElement.get(item8);
      if (element) {
        this.updateElementARIA(element, index);
      }
    }
  }
  updateElementARIA(element, index) {
    if (!hasRole(element)) {
      markAsOption(element);
    }
    setSetSize(element, this.model.length);
    setPositionInSet(element, index + 1);
  }
  offsetAtIndex(index) {
    if (this.mode === ListMode.NonViewport) {
      throw new Error("There should be no offset conversions in non-viewport mode");
    }
    if (!this.model.length) {
      return 0;
    }
    if (this.mode === ListMode.VariousHeightItems) {
      return this.variableOffsets[index];
    }
    if (!this.fixedHeight) {
      this.measureHeight();
    }
    return index * this.fixedHeight;
  }
  measureHeight() {
    this.fixedHeight = this.delegate.heightForItem(this.model.at(0));
    if (!this.fixedHeight) {
      this.fixedHeight = measurePreferredSize(this.elementAtIndex(0), this.element).height;
    }
  }
  select(index, oldItem, oldElement) {
    if (oldItem === void 0) {
      oldItem = this.#selectedItem;
    }
    if (oldElement === void 0) {
      oldElement = this.itemToElement.get(oldItem) || null;
    }
    this.#selectedIndex = index;
    this.#selectedItem = index === -1 ? null : this.model.at(index);
    const newItem = this.#selectedItem;
    const newElement = this.#selectedIndex !== -1 ? this.elementAtIndex(index) : null;
    this.delegate.selectedItemChanged(oldItem, newItem, oldElement, newElement);
    if (!this.delegate.updateSelectedItemARIA(oldElement, newElement)) {
      if (oldElement) {
        setSelected(oldElement, false);
      }
      if (newElement) {
        setSelected(newElement, true);
      }
      setActiveDescendant(this.element, newElement);
    }
  }
  findFirstSelectable(index, direction, canWrap) {
    const length = this.model.length;
    if (!length) {
      return -1;
    }
    for (let step = 0; step <= length; step++) {
      if (index < 0 || index >= length) {
        if (!canWrap) {
          return -1;
        }
        index = (index + length) % length;
      }
      if (this.delegate.isItemSelectable(this.model.at(index))) {
        return index;
      }
      index += direction;
    }
    return -1;
  }
  findPageSelectable(index, direction) {
    let lastSelectable = -1;
    const startOffset = this.offsetAtIndex(index);
    const viewportHeight = this.element.offsetHeight - 1;
    while (index >= 0 && index < this.model.length) {
      if (this.delegate.isItemSelectable(this.model.at(index))) {
        if (Math.abs(this.offsetAtIndex(index) - startOffset) >= viewportHeight) {
          return index;
        }
        lastSelectable = index;
      }
      index += direction;
    }
    return lastSelectable;
  }
  reallocateVariableOffsets(length, copyTo) {
    if (this.variableOffsets.length < length) {
      const variableOffsets = new Int32Array(Math.max(length, this.variableOffsets.length * 2));
      variableOffsets.set(this.variableOffsets.slice(0, copyTo), 0);
      this.variableOffsets = variableOffsets;
    } else if (this.variableOffsets.length >= 2 * length) {
      const variableOffsets = new Int32Array(length);
      variableOffsets.set(this.variableOffsets.slice(0, copyTo), 0);
      this.variableOffsets = variableOffsets;
    }
  }
  invalidate(from, to, inserted) {
    if (this.mode === ListMode.NonViewport) {
      this.invalidateNonViewportMode(from, to - from, inserted);
      return;
    }
    if (this.mode === ListMode.VariousHeightItems) {
      this.reallocateVariableOffsets(this.model.length + 1, from + 1);
      for (let i = from + 1; i <= this.model.length; i++) {
        this.variableOffsets[i] = this.variableOffsets[i - 1] + this.delegate.heightForItem(this.model.at(i - 1));
      }
    }
    const viewportHeight = this.element.offsetHeight;
    const totalHeight = this.totalHeight();
    const scrollTop = this.element.scrollTop;
    if (this.renderedHeight < viewportHeight || totalHeight < viewportHeight) {
      this.clearViewport();
      this.updateViewport(Platform9.NumberUtilities.clamp(scrollTop, 0, totalHeight - viewportHeight), viewportHeight);
      return;
    }
    const heightDelta = totalHeight - this.renderedHeight;
    if (to <= this.firstIndex) {
      const topHeight = this.topHeight + heightDelta;
      this.topElement.style.height = topHeight + "px";
      this.element.scrollTop = scrollTop + heightDelta;
      this.topHeight = topHeight;
      this.renderedHeight = totalHeight;
      const indexDelta = inserted - (to - from);
      this.firstIndex += indexDelta;
      this.lastIndex += indexDelta;
      return;
    }
    if (from >= this.lastIndex) {
      const bottomHeight = this.bottomHeight + heightDelta;
      this.bottomElement.style.height = bottomHeight + "px";
      this.bottomHeight = bottomHeight;
      this.renderedHeight = totalHeight;
      return;
    }
    this.clearViewport();
    this.updateViewport(Platform9.NumberUtilities.clamp(scrollTop, 0, totalHeight - viewportHeight), viewportHeight);
    this.refreshARIA();
  }
  invalidateNonViewportMode(start, remove, add) {
    let startElement = this.topElement;
    for (let index = 0; index < start; index++) {
      startElement = startElement.nextElementSibling;
    }
    while (remove--) {
      startElement.nextElementSibling.remove();
    }
    while (add--) {
      this.element.insertBefore(this.elementAtIndex(start + add), startElement.nextElementSibling);
    }
  }
  clearViewport() {
    if (this.mode === ListMode.NonViewport) {
      console.error("There should be no viewport updates in non-viewport mode");
      return;
    }
    this.firstIndex = 0;
    this.lastIndex = 0;
    this.renderedHeight = 0;
    this.topHeight = 0;
    this.bottomHeight = 0;
    this.clearContents();
  }
  clearContents() {
    this.topElement.style.height = "0";
    this.bottomElement.style.height = "0";
    this.element.removeChildren();
    this.element.appendChild(this.topElement);
    this.element.appendChild(this.bottomElement);
  }
  updateViewport(scrollTop, viewportHeight) {
    if (this.mode === ListMode.NonViewport) {
      console.error("There should be no viewport updates in non-viewport mode");
      return;
    }
    const totalHeight = this.totalHeight();
    if (!totalHeight) {
      this.firstIndex = 0;
      this.lastIndex = 0;
      this.topHeight = 0;
      this.bottomHeight = 0;
      this.renderedHeight = 0;
      this.topElement.style.height = "0";
      this.bottomElement.style.height = "0";
      return;
    }
    const firstIndex = this.indexAtOffset(scrollTop - viewportHeight);
    const lastIndex = this.indexAtOffset(scrollTop + 2 * viewportHeight) + 1;
    while (this.firstIndex < Math.min(firstIndex, this.lastIndex)) {
      this.elementAtIndex(this.firstIndex).remove();
      this.firstIndex++;
    }
    while (this.lastIndex > Math.max(lastIndex, this.firstIndex)) {
      this.elementAtIndex(this.lastIndex - 1).remove();
      this.lastIndex--;
    }
    this.firstIndex = Math.min(this.firstIndex, lastIndex);
    this.lastIndex = Math.max(this.lastIndex, firstIndex);
    for (let index = this.firstIndex - 1; index >= firstIndex; index--) {
      const element = this.elementAtIndex(index);
      this.element.insertBefore(element, this.topElement.nextSibling);
    }
    for (let index = this.lastIndex; index < lastIndex; index++) {
      const element = this.elementAtIndex(index);
      this.element.insertBefore(element, this.bottomElement);
    }
    this.firstIndex = firstIndex;
    this.lastIndex = lastIndex;
    this.topHeight = this.offsetAtIndex(firstIndex);
    this.topElement.style.height = this.topHeight + "px";
    this.bottomHeight = totalHeight - this.offsetAtIndex(lastIndex);
    this.bottomElement.style.height = this.bottomHeight + "px";
    this.renderedHeight = totalHeight;
    this.element.scrollTop = scrollTop;
  }
};

// gen/front_end/ui/legacy/ListModel.js
var ListModel_exports = {};
__export(ListModel_exports, {
  ListModel: () => ListModel
});
import * as Common11 from "./../../core/common/common.js";
import * as Platform10 from "./../../core/platform/platform.js";
var ListModel = class extends Common11.ObjectWrapper.ObjectWrapper {
  items;
  constructor(items) {
    super();
    this.items = items || [];
  }
  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }
  get length() {
    return this.items.length;
  }
  at(index) {
    return this.items[index];
  }
  every(callback) {
    return this.items.every(callback);
  }
  filter(callback) {
    return this.items.filter(callback);
  }
  find(callback) {
    return this.items.find(callback);
  }
  findIndex(callback) {
    return this.items.findIndex(callback);
  }
  indexOf(value, fromIndex) {
    return this.items.indexOf(value, fromIndex);
  }
  insert(index, value) {
    this.items.splice(index, 0, value);
    this.replaced(index, [], 1);
  }
  insertWithComparator(value, comparator) {
    this.insert(Platform10.ArrayUtilities.lowerBound(this.items, value, comparator), value);
  }
  join(separator) {
    return this.items.join(separator);
  }
  remove(index) {
    const result = this.items[index];
    this.items.splice(index, 1);
    this.replaced(index, [result], 0);
    return result;
  }
  replace(index, value, keepSelectedIndex) {
    const oldValue = this.items[index];
    this.items[index] = value;
    this.replaced(index, [oldValue], 1, keepSelectedIndex);
    return oldValue;
  }
  replaceRange(from, to, items) {
    let removed;
    if (items.length < 1e4) {
      removed = this.items.splice(from, to - from, ...items);
    } else {
      removed = this.items.slice(from, to);
      const before = this.items.slice(0, from);
      const after = this.items.slice(to);
      this.items = [...before, ...items, ...after];
    }
    this.replaced(from, removed, items.length);
    return removed;
  }
  replaceAll(items) {
    const oldItems = this.items.slice();
    this.items = items;
    this.replaced(0, oldItems, items.length);
    return oldItems;
  }
  slice(from, to) {
    return this.items.slice(from, to);
  }
  some(callback) {
    return this.items.some(callback);
  }
  replaced(index, removed, inserted, keepSelectedIndex) {
    this.dispatchEventToListeners("ItemsReplaced", { index, removed, inserted, keepSelectedIndex });
  }
};

// gen/front_end/ui/legacy/suggestBox.css.js
var suggestBox_css_default = `/*
 * Copyright 2011 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: flex;
  flex: auto;
}

.suggest-box {
  flex: auto;
  background-color: var(--sys-color-cdt-base-container);
  pointer-events: auto;
  margin-left: -3px;
  box-shadow: var(--drop-shadow);
  overflow-x: hidden;
}

.suggest-box-content-item {
  padding: 1px 0 1px 1px;
  margin: 0;
  border: 1px solid transparent;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.suggest-box-content-item.secondary {
  background-color: var(--sys-color-neutral-container);
  justify-content: normal;
}

.suggestion-title {
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-title span {
  white-space: pre;
}

.suggestion-subtitle {
  flex: auto;
  text-align: right;
  color: var(--sys-color-token-subtle);
  margin-right: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggest-box-content-item devtools-icon {
  color: var(--sys-color-on-surface-subtle);
  margin-right: 1px;
}

.suggest-box-content-item .query {
  font-weight: bold;
}

.suggest-box-content-item .spacer {
  display: inline-block;
  width: 20px;
}

.suggest-box-content-item.selected {
  background-color: var(--sys-color-tonal-container);
}

.suggest-box-content-item.selected .suggestion-subtitle,
.suggest-box-content-item.selected > span {
  color: var(--sys-color-on-tonal-container);
}

.suggest-box-content-item:hover:not(.selected) {
  background-color: var(--sys-color-state-hover-on-subtle);
}

@media (forced-colors: active) {
  .suggest-box-content-item.selected {
    forced-color-adjust: none;
    background-color: Highlight;
  }

  .suggest-box-content-item.selected > span {
    color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./suggestBox.css")} */`;

// gen/front_end/ui/legacy/SuggestBox.js
var UIStrings9 = {
  /**
   * @description Aria alert to read the suggestion for the suggestion box when typing in text editor
   * @example {name} PH1
   * @example {2} PH2
   * @example {5} PH3
   */
  sSuggestionSOfS: "{PH1}, suggestion {PH2} of {PH3}",
  /**
   * @description Aria alert to confirm the suggestion when it is selected from the suggestion box
   * @example {name} PH1
   */
  sSuggestionSSelected: "{PH1}, suggestion selected"
};
var str_9 = i18n17.i18n.registerUIStrings("ui/legacy/SuggestBox.ts", UIStrings9);
var i18nString9 = i18n17.i18n.getLocalizedString.bind(void 0, str_9);
var SuggestBox = class {
  suggestBoxDelegate;
  maxItemsHeight;
  rowHeight;
  userEnteredText;
  onlyCompletion;
  items;
  list;
  element;
  glassPane;
  constructor(suggestBoxDelegate, maxItemsHeight) {
    this.suggestBoxDelegate = suggestBoxDelegate;
    this.maxItemsHeight = maxItemsHeight;
    this.rowHeight = 17;
    this.userEnteredText = "";
    this.onlyCompletion = null;
    this.items = new ListModel();
    this.list = new ListControl(this.items, this, ListMode.EqualHeightItems);
    this.element = this.list.element;
    this.element.classList.add("suggest-box");
    this.element.addEventListener("mousedown", (event) => event.preventDefault(), true);
    this.element.addEventListener("click", this.onClick.bind(this), false);
    this.element.setAttribute("jslog", `${VisualLogging11.menu().parent("mapped").track({ resize: true, keydown: "ArrowUp|ArrowDown|PageUp|PageDown" })}`);
    this.glassPane = new GlassPane();
    this.glassPane.setAnchorBehavior(
      "PreferBottom"
      /* AnchorBehavior.PREFER_BOTTOM */
    );
    this.glassPane.setOutsideClickCallback(this.hide.bind(this));
    const shadowRoot = createShadowRootWithCoreStyles(this.glassPane.contentElement, { cssFile: suggestBox_css_default });
    shadowRoot.appendChild(this.element);
  }
  visible() {
    return this.glassPane.isShowing();
  }
  setPosition(anchorBox) {
    this.glassPane.setContentAnchorBox(anchorBox);
  }
  setAnchorBehavior(behavior) {
    this.glassPane.setAnchorBehavior(behavior);
  }
  updateMaxSize(items) {
    const maxWidth = this.maxWidth(items);
    const length = this.maxItemsHeight ? Math.min(this.maxItemsHeight, items.length) : items.length;
    const maxHeight = length * this.rowHeight;
    this.glassPane.setMaxContentSize(new Geometry4.Size(maxWidth, maxHeight));
  }
  maxWidth(items) {
    const kMaxWidth = 300;
    if (!items.length) {
      return kMaxWidth;
    }
    let maxItem;
    let maxLength = -Infinity;
    for (let i = 0; i < items.length; i++) {
      const length = (items[i].title || items[i].text).length + (items[i].subtitle || "").length;
      if (length > maxLength) {
        maxLength = length;
        maxItem = items[i];
      }
    }
    const element = this.createElementForItem(maxItem);
    const preferredWidth = measurePreferredSize(element, this.element).width + measuredScrollbarWidth(this.element.ownerDocument);
    return Math.min(kMaxWidth, preferredWidth);
  }
  show() {
    if (this.visible()) {
      return;
    }
    VisualLogging11.setMappedParent(this.element, this.suggestBoxDelegate.ownerElement());
    this.glassPane.show(document);
    const suggestion = { text: "1", subtitle: "12" };
    this.rowHeight = measurePreferredSize(this.createElementForItem(suggestion), this.element).height;
    setControls(this.suggestBoxDelegate.ownerElement(), this.element);
    setExpanded(this.suggestBoxDelegate.ownerElement(), true);
  }
  hide() {
    if (!this.visible()) {
      return;
    }
    this.glassPane.hide();
    setControls(this.suggestBoxDelegate.ownerElement(), null);
    setExpanded(this.suggestBoxDelegate.ownerElement(), false);
  }
  applySuggestion(isIntermediateSuggestion) {
    if (this.onlyCompletion) {
      isIntermediateSuggestion ? LiveAnnouncer.alert(i18nString9(UIStrings9.sSuggestionSOfS, { PH1: this.onlyCompletion.text, PH2: this.list.selectedIndex() + 1, PH3: this.items.length })) : LiveAnnouncer.alert(i18nString9(UIStrings9.sSuggestionSSelected, { PH1: this.onlyCompletion.text }));
      this.suggestBoxDelegate.applySuggestion(this.onlyCompletion, isIntermediateSuggestion);
      return true;
    }
    const suggestion = this.list.selectedItem();
    if (suggestion?.text) {
      isIntermediateSuggestion ? LiveAnnouncer.alert(i18nString9(UIStrings9.sSuggestionSOfS, {
        PH1: suggestion.title || suggestion.text,
        PH2: this.list.selectedIndex() + 1,
        PH3: this.items.length
      })) : LiveAnnouncer.alert(i18nString9(UIStrings9.sSuggestionSSelected, { PH1: suggestion.title || suggestion.text }));
    }
    this.suggestBoxDelegate.applySuggestion(suggestion, isIntermediateSuggestion);
    return this.visible() && Boolean(suggestion);
  }
  acceptSuggestion() {
    const result = this.applySuggestion();
    this.hide();
    if (!result) {
      return false;
    }
    this.suggestBoxDelegate.acceptSuggestion();
    return true;
  }
  createElementForItem(item8) {
    const query = this.userEnteredText;
    const element = document.createElement("div");
    element.classList.add("suggest-box-content-item");
    element.classList.add("source-code");
    if (item8.isSecondary) {
      element.classList.add("secondary");
    }
    element.tabIndex = -1;
    const maxTextLength = 50 + query.length;
    const displayText = Platform11.StringUtilities.trimEndWithMaxLength((item8.title || item8.text).trim(), maxTextLength).replace(/\n/g, "\u21B5");
    const titleElement = element.createChild("span", "suggestion-title");
    const index = displayText.toLowerCase().indexOf(query.toLowerCase());
    if (index > 0) {
      titleElement.createChild("span").textContent = displayText.substring(0, index);
    }
    if (index > -1) {
      titleElement.createChild("span", "query").textContent = displayText.substring(index, index + query.length);
    }
    titleElement.createChild("span").textContent = displayText.substring(index > -1 ? index + query.length : 0);
    titleElement.createChild("span", "spacer");
    if (item8.subtitleRenderer) {
      const subtitleElement = item8.subtitleRenderer.call(null);
      subtitleElement.classList.add("suggestion-subtitle");
      element.appendChild(subtitleElement);
    } else if (item8.subtitle) {
      const subtitleElement = element.createChild("span", "suggestion-subtitle");
      subtitleElement.textContent = Platform11.StringUtilities.trimEndWithMaxLength(item8.subtitle, maxTextLength - displayText.length);
    }
    if (item8.iconElement) {
      element.appendChild(item8.iconElement);
    }
    return element;
  }
  heightForItem(_item) {
    return this.rowHeight;
  }
  isItemSelectable(_item) {
    return true;
  }
  selectedItemChanged(_from, _to, fromElement, toElement) {
    if (fromElement) {
      fromElement.classList.remove("selected", "force-white-icons");
    }
    if (toElement) {
      toElement.classList.add("selected");
      toElement.classList.add("force-white-icons");
    }
    this.applySuggestion(true);
  }
  updateSelectedItemARIA(_fromElement, _toElement) {
    return false;
  }
  onClick(event) {
    const item8 = this.list.itemForNode(event.target);
    if (!item8) {
      return;
    }
    this.list.selectItem(item8);
    this.acceptSuggestion();
    event.consume(true);
  }
  canShowBox(completions, highestPriorityItem, canShowForSingleItem, userEnteredText) {
    if (!completions?.length) {
      return false;
    }
    if (completions.length > 1) {
      return true;
    }
    if (!highestPriorityItem || highestPriorityItem.isSecondary || !highestPriorityItem.text.startsWith(userEnteredText)) {
      return true;
    }
    return canShowForSingleItem && highestPriorityItem.text !== userEnteredText;
  }
  updateSuggestions(anchorBox, completions, selectHighestPriority, canShowForSingleItem, userEnteredText) {
    this.onlyCompletion = null;
    const highestPriorityItem = selectHighestPriority ? completions.reduce((a, b) => (a.priority || 0) >= (b.priority || 0) ? a : b) : null;
    if (this.canShowBox(completions, highestPriorityItem, canShowForSingleItem, userEnteredText)) {
      this.userEnteredText = userEnteredText;
      this.show();
      this.updateMaxSize(completions);
      this.glassPane.setContentAnchorBox(anchorBox);
      this.list.invalidateItemHeight();
      this.items.replaceAll(completions);
      if (highestPriorityItem && !highestPriorityItem.isSecondary) {
        this.list.selectItem(highestPriorityItem, true);
      } else {
        this.list.selectItem(null);
      }
    } else {
      if (completions.length === 1) {
        this.onlyCompletion = completions[0];
        this.applySuggestion(true);
      }
      this.hide();
    }
  }
  keyPressed(event) {
    switch (event.key) {
      case "Enter":
        return this.enterKeyPressed();
      case "ArrowUp":
        return this.list.selectPreviousItem(true, false);
      case "ArrowDown":
        return this.list.selectNextItem(true, false);
      case "PageUp":
        return this.list.selectItemPreviousPage(false);
      case "PageDown":
        return this.list.selectItemNextPage(false);
    }
    return false;
  }
  enterKeyPressed() {
    const hasSelectedItem = Boolean(this.list.selectedItem()) || Boolean(this.onlyCompletion);
    this.acceptSuggestion();
    return hasSelectedItem;
  }
};

// gen/front_end/ui/legacy/textPrompt.css.js
var textPrompt_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.text-prompt-root {
  display: flex;
  align-items: center;
}

.text-prompt-editing {
  box-shadow: var(--drop-shadow);
  background-color: var(--sys-color-cdt-base-container);
  text-overflow: clip !important; /* stylelint-disable-line declaration-no-important */
  margin: 0 -2px -1px;
  padding: 0 2px 1px;
  opacity: 100% !important; /* stylelint-disable-line declaration-no-important */
}

.text-prompt {
  cursor: text;
  overflow-x: visible;
}

.text-prompt::-webkit-scrollbar {
  display: none;
}

.text-prompt-editing > .text-prompt {
  color: var(--sys-color-on-surface) !important; /* stylelint-disable-line declaration-no-important */
  text-decoration: none !important; /* stylelint-disable-line declaration-no-important */
  white-space: pre;
}

.text-prompt > .auto-complete-text {
  color: var(--sys-color-token-subtle) !important; /* stylelint-disable-line declaration-no-important */
}

.text-prompt[data-placeholder] {
  &:empty::before {
    content: attr(data-placeholder);
    color: var(--sys-color-on-surface-subtle);
  }

  &.disabled:empty::before {
    color: var(--sys-color-state-disabled);
  }
}

.text-prompt:not([data-placeholder]):empty::after {
  content: "\\00A0";
  width: 0;
  display: block;
}

.text-prompt.disabled {
  color: var(--sys-color-state-disabled);
  cursor: default;
}

.text-prompt-editing br {
  display: none;
}

.text-prompt-root:not(:focus-within) ::selection {
  background: transparent;
  color: currentcolor;
}

@media (forced-colors: active) {
  .text-prompt[data-placeholder]:empty::before {
    color: GrayText !important; /* stylelint-disable-line declaration-no-important */
  }

  .text-prompt.disabled {
    opacity: 100%;
  }
}

/*# sourceURL=${import.meta.resolve("./textPrompt.css")} */`;

// gen/front_end/ui/legacy/TextPrompt.js
var TextPromptElement = class _TextPromptElement extends HTMLElement {
  static observedAttributes = ["editing", "completions", "placeholder"];
  #shadow = this.attachShadow({ mode: "open" });
  #entrypoint = this.#shadow.createChild("span");
  #slot = this.#entrypoint.createChild("slot");
  #textPrompt = new TextPrompt();
  #completionTimeout = null;
  #completionObserver = new MutationObserver(this.#onMutate.bind(this));
  constructor() {
    super();
    this.#textPrompt.initialize(this.#willAutoComplete.bind(this));
  }
  #onMutate(changes) {
    const listId = this.getAttribute("completions");
    if (!listId) {
      return;
    }
    const checkIfNodeIsInCompletionList = (node) => {
      if (node instanceof HTMLDataListElement) {
        return node.id === listId;
      }
      if (node instanceof HTMLOptionElement) {
        return Boolean(node.parentElement && checkIfNodeIsInCompletionList(node.parentElement));
      }
      return false;
    };
    const affectsCompletionList = (change) => change.addedNodes.values().some(checkIfNodeIsInCompletionList) || change.removedNodes.values().some(checkIfNodeIsInCompletionList) || checkIfNodeIsInCompletionList(change.target);
    if (changes.some(affectsCompletionList)) {
      this.#updateCompletions();
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    switch (name) {
      case "editing":
        if (this.isConnected) {
          if (newValue !== null && newValue !== "false" && oldValue === null) {
            this.#startEditing();
          } else {
            this.#stopEditing();
          }
        }
        break;
      case "completions":
        if (this.getAttribute("completions")) {
          this.#completionObserver.observe(this, { childList: true, subtree: true });
          this.#updateCompletions();
        } else {
          this.#textPrompt.clearAutocomplete();
          this.#completionObserver.disconnect();
        }
        break;
    }
  }
  #updateCompletions() {
    if (this.isConnected) {
      void this.#textPrompt.complete(
        /* force=*/
        true
      );
    }
  }
  async #willAutoComplete(expression, filter, force) {
    this.dispatchEvent(new _TextPromptElement.BeforeAutoCompleteEvent({ expression, filter, force }));
    const listId = this.getAttribute("completions");
    if (!listId) {
      return [];
    }
    const datalist = this.getComponentRoot()?.querySelectorAll(`datalist#${listId} > option`);
    if (!datalist?.length) {
      return [];
    }
    return datalist.values().filter((option) => option.textContent.startsWith(filter.toLowerCase())).map((option) => ({ text: option.textContent })).toArray();
  }
  #startEditing() {
    const truncatedTextPlaceholder = this.getAttribute("placeholder");
    const placeholder = this.#entrypoint.createChild("span");
    if (truncatedTextPlaceholder === null) {
      placeholder.textContent = this.#slot.deepInnerText();
    } else {
      placeholder.setTextContentTruncatedIfNeeded(this.#slot.deepInnerText(), truncatedTextPlaceholder);
    }
    this.#slot.remove();
    const proxy = this.#textPrompt.attachAndStartEditing(placeholder, (e) => this.#done(
      e,
      /* commit=*/
      true
    ));
    proxy.addEventListener("keydown", this.#editingValueKeyDown.bind(this));
    placeholder.getComponentSelection()?.selectAllChildren(placeholder);
  }
  #stopEditing() {
    this.#entrypoint.removeChildren();
    this.#entrypoint.appendChild(this.#slot);
    this.#textPrompt.detach();
  }
  connectedCallback() {
    if (this.hasAttribute("editing")) {
      this.attributeChangedCallback("editing", null, "");
    }
  }
  #done(e, commit) {
    const target = e.target;
    const text = target.textContent || "";
    if (commit) {
      this.dispatchEvent(new _TextPromptElement.CommitEvent(text));
    } else {
      this.dispatchEvent(new _TextPromptElement.CancelEvent());
    }
    e.consume();
  }
  #editingValueKeyDown(event) {
    if (event.handled || !(event instanceof KeyboardEvent)) {
      return;
    }
    if (event.key === "Enter") {
      this.#done(
        event,
        /* commit=*/
        true
      );
    } else if (Platform12.KeyboardUtilities.isEscKey(event)) {
      this.#done(
        event,
        /* commit=*/
        false
      );
    }
  }
  set completionTimeout(timeout) {
    this.#completionTimeout = timeout;
    this.#textPrompt.setAutocompletionTimeout(timeout);
  }
  cloneNode() {
    const clone = cloneCustomElement(this);
    if (this.#completionTimeout !== null) {
      clone.completionTimeout = this.#completionTimeout;
    }
    return clone;
  }
};
(function(TextPromptElement2) {
  class CommitEvent extends CustomEvent {
    constructor(detail) {
      super("commit", { detail });
    }
  }
  TextPromptElement2.CommitEvent = CommitEvent;
  class CancelEvent extends CustomEvent {
    constructor() {
      super("cancel");
    }
  }
  TextPromptElement2.CancelEvent = CancelEvent;
  class BeforeAutoCompleteEvent extends CustomEvent {
    constructor(detail) {
      super("beforeautocomplete", { detail });
    }
  }
  TextPromptElement2.BeforeAutoCompleteEvent = BeforeAutoCompleteEvent;
})(TextPromptElement || (TextPromptElement = {}));
customElements.define("devtools-prompt", TextPromptElement);
var TextPrompt = class extends Common12.ObjectWrapper.ObjectWrapper {
  proxyElement;
  proxyElementDisplay;
  autocompletionTimeout;
  #title;
  queryRange;
  previousText;
  currentSuggestion;
  completionRequestId;
  ghostTextElement;
  leftParenthesesIndices;
  loadCompletions;
  completionStopCharacters;
  usesSuggestionBuilder;
  #element;
  boundOnKeyDown;
  boundOnInput;
  boundOnMouseWheel;
  boundClearAutocomplete;
  boundOnBlur;
  contentElement;
  suggestBox;
  isEditing;
  focusRestorer;
  blurListener;
  oldTabIndex;
  completeTimeout;
  #disableDefaultSuggestionForEmptyInput;
  jslogContext = void 0;
  constructor() {
    super();
    this.proxyElementDisplay = "inline-block";
    this.autocompletionTimeout = DefaultAutocompletionTimeout;
    this.#title = "";
    this.queryRange = null;
    this.previousText = "";
    this.currentSuggestion = null;
    this.completionRequestId = 0;
    this.ghostTextElement = document.createElement("span");
    this.ghostTextElement.classList.add("auto-complete-text");
    this.ghostTextElement.setAttribute("contenteditable", "false");
    this.leftParenthesesIndices = [];
    setHidden(this.ghostTextElement, true);
  }
  initialize(completions, stopCharacters, usesSuggestionBuilder) {
    this.loadCompletions = completions;
    this.completionStopCharacters = stopCharacters || " =:[({;,!+-*/&|^<>.";
    this.usesSuggestionBuilder = usesSuggestionBuilder || false;
  }
  setAutocompletionTimeout(timeout) {
    this.autocompletionTimeout = timeout;
  }
  renderAsBlock() {
    this.proxyElementDisplay = "block";
  }
  /**
   * Clients should never attach any event listeners to the |element|. Instead,
   * they should use the result of this method to attach listeners for bubbling events.
   */
  attach(element) {
    return this.#attach(element);
  }
  /**
   * Clients should never attach any event listeners to the |element|. Instead,
   * they should use the result of this method to attach listeners for bubbling events
   * or the |blurListener| parameter to register a "blur" event listener on the |element|
   * (since the "blur" event does not bubble.)
   */
  attachAndStartEditing(element, blurListener) {
    const proxyElement = this.#attach(element);
    this.startEditing(blurListener);
    return proxyElement;
  }
  #attach(element) {
    if (this.proxyElement) {
      throw new Error("Cannot attach an attached TextPrompt");
    }
    this.#element = element;
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnInput = this.onInput.bind(this);
    this.boundOnMouseWheel = this.onMouseWheel.bind(this);
    this.boundClearAutocomplete = this.clearAutocomplete.bind(this);
    this.boundOnBlur = this.onBlur.bind(this);
    this.proxyElement = element.ownerDocument.createElement("span");
    appendStyle(this.proxyElement, textPrompt_css_default);
    this.contentElement = this.proxyElement.createChild("div", "text-prompt-root");
    this.proxyElement.style.display = this.proxyElementDisplay;
    if (element.parentElement) {
      element.parentElement.insertBefore(this.proxyElement, element);
    }
    this.contentElement.appendChild(element);
    let jslog = VisualLogging12.textField().track({
      keydown: "ArrowLeft|ArrowUp|PageUp|Home|PageDown|ArrowRight|ArrowDown|End|Space|Tab|Enter|Escape",
      change: true
    });
    if (this.jslogContext) {
      jslog = jslog.context(this.jslogContext);
    }
    if (!this.#element.hasAttribute("jslog")) {
      this.#element.setAttribute("jslog", `${jslog}`);
    }
    this.#element.classList.add("text-prompt");
    markAsTextBox(this.#element);
    setAutocomplete(
      this.#element,
      "both"
      /* ARIAUtils.AutocompleteInteractionModel.BOTH */
    );
    setHasPopup(
      this.#element,
      "listbox"
      /* ARIAUtils.PopupRole.LIST_BOX */
    );
    this.#element.setAttribute("contenteditable", "plaintext-only");
    this.element().addEventListener("keydown", this.boundOnKeyDown, false);
    this.#element.addEventListener("input", this.boundOnInput, false);
    this.#element.addEventListener("wheel", this.boundOnMouseWheel, false);
    this.#element.addEventListener("selectstart", this.boundClearAutocomplete, false);
    this.#element.addEventListener("blur", this.boundOnBlur, false);
    this.suggestBox = new SuggestBox(this, 20);
    if (this.#title) {
      Tooltip.install(this.proxyElement, this.#title);
    }
    return this.proxyElement;
  }
  element() {
    if (!this.#element) {
      throw new Error("Expected an already attached element!");
    }
    return this.#element;
  }
  detach() {
    this.removeFromElement();
    if (this.focusRestorer) {
      this.focusRestorer.restore();
    }
    if (this.proxyElement?.parentElement) {
      this.proxyElement.parentElement.insertBefore(this.element(), this.proxyElement);
      this.proxyElement.remove();
    }
    delete this.proxyElement;
    this.element().classList.remove("text-prompt");
    this.element().removeAttribute("contenteditable");
    this.element().removeAttribute("role");
    clearAutocomplete(this.element());
    setHasPopup(
      this.element(),
      "false"
      /* ARIAUtils.PopupRole.FALSE */
    );
  }
  textWithCurrentSuggestion() {
    const text = this.text();
    if (!this.queryRange || !this.currentSuggestion) {
      return text;
    }
    const suggestion = this.currentSuggestion.text;
    return text.substring(0, this.queryRange.startColumn) + suggestion + text.substring(this.queryRange.endColumn);
  }
  text() {
    let text = this.element().textContent || "";
    if (this.ghostTextElement.parentNode) {
      const addition = this.ghostTextElement.textContent || "";
      text = text.substring(0, text.length - addition.length);
    }
    return text;
  }
  setText(text) {
    this.clearAutocomplete();
    this.element().textContent = text;
    this.previousText = this.text();
    if (this.element().hasFocus()) {
      this.moveCaretToEndOfPrompt();
      this.element().scrollIntoView();
    }
  }
  setSelectedRange(startIndex, endIndex) {
    if (startIndex < 0) {
      throw new RangeError("Selected range start must be a nonnegative integer");
    }
    const textContent = this.element().textContent;
    const textContentLength = textContent ? textContent.length : 0;
    if (endIndex > textContentLength) {
      endIndex = textContentLength;
    }
    if (endIndex < startIndex) {
      endIndex = startIndex;
    }
    const textNode = this.element().childNodes[0];
    const range = new Range();
    range.setStart(textNode, startIndex);
    range.setEnd(textNode, endIndex);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  focus() {
    this.element().focus();
  }
  title() {
    return this.#title;
  }
  setTitle(title) {
    this.#title = title;
    if (this.proxyElement) {
      Tooltip.install(this.proxyElement, title);
    }
  }
  setPlaceholder(placeholder, ariaPlaceholder) {
    if (placeholder) {
      this.element().setAttribute("data-placeholder", placeholder);
      setPlaceholder(this.element(), ariaPlaceholder || placeholder);
    } else {
      this.element().removeAttribute("data-placeholder");
      setPlaceholder(this.element(), null);
    }
  }
  setEnabled(enabled) {
    if (enabled) {
      this.element().setAttribute("contenteditable", "plaintext-only");
    } else {
      this.element().removeAttribute("contenteditable");
    }
    this.element().classList.toggle("disabled", !enabled);
  }
  removeFromElement() {
    this.clearAutocomplete();
    this.element().removeEventListener("keydown", this.boundOnKeyDown, false);
    this.element().removeEventListener("input", this.boundOnInput, false);
    this.element().removeEventListener("selectstart", this.boundClearAutocomplete, false);
    this.element().removeEventListener("blur", this.boundOnBlur, false);
    if (this.isEditing) {
      this.stopEditing();
    }
    if (this.suggestBox) {
      this.suggestBox.hide();
    }
  }
  startEditing(blurListener) {
    this.isEditing = true;
    if (this.contentElement) {
      this.contentElement.classList.add("text-prompt-editing");
    }
    this.focusRestorer = new ElementFocusRestorer(this.element());
    if (blurListener) {
      this.blurListener = blurListener;
      this.element().addEventListener("blur", this.blurListener, false);
    }
    this.oldTabIndex = this.element().tabIndex;
    if (this.element().tabIndex < 0) {
      this.element().tabIndex = 0;
    }
    if (!this.text()) {
      this.autoCompleteSoon();
    }
  }
  stopEditing() {
    this.element().tabIndex = this.oldTabIndex;
    if (this.blurListener) {
      this.element().removeEventListener("blur", this.blurListener, false);
    }
    if (this.contentElement) {
      this.contentElement.classList.remove("text-prompt-editing");
    }
    delete this.isEditing;
  }
  onMouseWheel(_event) {
  }
  onKeyDown(event) {
    let handled = false;
    if (this.isSuggestBoxVisible() && this.suggestBox?.keyPressed(event)) {
      void VisualLogging12.logKeyDown(this.suggestBox.element, event);
      event.consume(true);
      return;
    }
    switch (event.key) {
      case "Tab":
        handled = this.tabKeyPressed(event);
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
      case "Home":
        this.clearAutocomplete();
        break;
      case "PageDown":
      case "ArrowRight":
      case "ArrowDown":
      case "End":
        if (this.isCaretAtEndOfPrompt()) {
          handled = this.acceptAutoComplete();
        } else {
          this.clearAutocomplete();
        }
        break;
      case "Escape":
        if (this.isSuggestBoxVisible() || this.currentSuggestion) {
          this.clearAutocomplete();
          handled = true;
        }
        break;
      case " ":
        if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
          this.autoCompleteSoon(true);
          handled = true;
        }
        break;
    }
    if (event.key === "Enter") {
      event.preventDefault();
    }
    if (handled) {
      event.consume(true);
    }
  }
  acceptSuggestionOnStopCharacters(key) {
    if (!this.currentSuggestion || !this.queryRange || key.length !== 1 || !this.completionStopCharacters?.includes(key)) {
      return false;
    }
    const query = this.text().substring(this.queryRange.startColumn, this.queryRange.endColumn);
    if (query && this.currentSuggestion.text.startsWith(query + key)) {
      this.queryRange.endColumn += 1;
      return this.acceptAutoComplete();
    }
    return false;
  }
  onInput(ev) {
    const event = ev;
    let text = this.text();
    const currentEntry = event.data;
    if (event.inputType === "insertFromPaste" && text.includes("\n")) {
      text = Platform12.StringUtilities.stripLineBreaks(text);
      this.setText(text);
    }
    const caretPosition = this.getCaretPosition();
    if (currentEntry === ")" && caretPosition >= 0 && this.leftParenthesesIndices.length > 0) {
      const nextCharAtCaret = text[caretPosition];
      if (nextCharAtCaret === ")" && this.tryMatchingLeftParenthesis(caretPosition)) {
        text = text.substring(0, caretPosition) + text.substring(caretPosition + 1);
        this.setText(text);
        return;
      }
    }
    if (currentEntry && !this.acceptSuggestionOnStopCharacters(currentEntry)) {
      const hasCommonPrefix = text.startsWith(this.previousText) || this.previousText.startsWith(text);
      if (this.queryRange && hasCommonPrefix) {
        this.queryRange.endColumn += text.length - this.previousText.length;
      }
    }
    this.refreshGhostText();
    this.previousText = text;
    this.dispatchEventToListeners(
      "TextChanged"
      /* Events.TEXT_CHANGED */
    );
    this.autoCompleteSoon();
  }
  acceptAutoComplete() {
    let result = false;
    if (this.isSuggestBoxVisible() && this.suggestBox) {
      result = this.suggestBox.acceptSuggestion();
    }
    if (!result) {
      result = this.#acceptSuggestion();
    }
    if (this.usesSuggestionBuilder && result) {
      this.autoCompleteSoon();
    }
    return result;
  }
  clearAutocomplete() {
    const beforeText = this.textWithCurrentSuggestion();
    if (this.isSuggestBoxVisible() && this.suggestBox) {
      this.suggestBox.hide();
    }
    this.clearAutocompleteTimeout();
    this.queryRange = null;
    this.refreshGhostText();
    if (beforeText !== this.textWithCurrentSuggestion()) {
      this.dispatchEventToListeners(
        "TextChanged"
        /* Events.TEXT_CHANGED */
      );
    }
    this.currentSuggestion = null;
  }
  onBlur() {
    this.clearAutocomplete();
  }
  refreshGhostText() {
    if (this.currentSuggestion?.hideGhostText) {
      this.ghostTextElement.remove();
      return;
    }
    if (this.queryRange && this.currentSuggestion && this.isCaretAtEndOfPrompt() && this.currentSuggestion.text.startsWith(this.text().substring(this.queryRange.startColumn))) {
      this.ghostTextElement.textContent = this.currentSuggestion.text.substring(this.queryRange.endColumn - this.queryRange.startColumn);
      this.element().appendChild(this.ghostTextElement);
    } else {
      this.ghostTextElement.remove();
    }
  }
  clearAutocompleteTimeout() {
    if (this.completeTimeout) {
      clearTimeout(this.completeTimeout);
      delete this.completeTimeout;
    }
    this.completionRequestId++;
  }
  autoCompleteSoon(force) {
    const immediately = this.isSuggestBoxVisible() || force;
    if (!this.completeTimeout) {
      this.completeTimeout = window.setTimeout(this.complete.bind(this, force), immediately ? 0 : this.autocompletionTimeout);
    }
  }
  async complete(force) {
    this.clearAutocompleteTimeout();
    if (!this.element().isConnected) {
      return;
    }
    const selection = this.element().getComponentSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const selectionRange = selection.getRangeAt(0);
    let shouldExit;
    if (!force && !this.isCaretAtEndOfPrompt() && !this.isSuggestBoxVisible()) {
      shouldExit = true;
    } else if (!selection.isCollapsed) {
      shouldExit = true;
    }
    if (shouldExit) {
      this.clearAutocomplete();
      return;
    }
    const wordQueryRange = rangeOfWord(selectionRange.startContainer, selectionRange.startOffset, this.completionStopCharacters, this.element(), "backward");
    const expressionRange = wordQueryRange.cloneRange();
    expressionRange.collapse(true);
    expressionRange.setStartBefore(this.element());
    const completionRequestId = ++this.completionRequestId;
    const completions = await this.loadCompletions.call(null, expressionRange.toString(), wordQueryRange.toString(), Boolean(force));
    this.completionsReady(completionRequestId, selection, wordQueryRange, Boolean(force), completions);
  }
  disableDefaultSuggestionForEmptyInput() {
    this.#disableDefaultSuggestionForEmptyInput = true;
  }
  boxForAnchorAtStart(selection, textRange) {
    const rangeCopy = selection.getRangeAt(0).cloneRange();
    const anchorElement = document.createElement("span");
    anchorElement.textContent = "\u200B";
    textRange.insertNode(anchorElement);
    const box = anchorElement.boxInWindow(window);
    anchorElement.remove();
    selection.removeAllRanges();
    selection.addRange(rangeCopy);
    return box;
  }
  additionalCompletions(_query) {
    return [];
  }
  completionsReady(completionRequestId, selection, originalWordQueryRange, force, completions) {
    if (this.completionRequestId !== completionRequestId) {
      return;
    }
    const query = originalWordQueryRange.toString();
    const store = /* @__PURE__ */ new Set();
    completions = completions.filter((item8) => !store.has(item8.text) && Boolean(store.add(item8.text)));
    if (query || force) {
      if (query) {
        completions = completions.concat(this.additionalCompletions(query));
      } else {
        completions = this.additionalCompletions(query).concat(completions);
      }
    }
    if (!completions.length) {
      this.clearAutocomplete();
      return;
    }
    const selectionRange = selection.getRangeAt(0);
    const fullWordRange = document.createRange();
    fullWordRange.setStart(originalWordQueryRange.startContainer, originalWordQueryRange.startOffset);
    fullWordRange.setEnd(selectionRange.endContainer, selectionRange.endOffset);
    if (query + selectionRange.toString() !== fullWordRange.toString()) {
      return;
    }
    const beforeRange = document.createRange();
    beforeRange.setStart(this.element(), 0);
    beforeRange.setEnd(fullWordRange.startContainer, fullWordRange.startOffset);
    this.queryRange = new TextUtils.TextRange.TextRange(0, beforeRange.toString().length, 0, beforeRange.toString().length + fullWordRange.toString().length);
    const shouldSelect = !this.#disableDefaultSuggestionForEmptyInput || Boolean(this.text());
    if (this.suggestBox) {
      this.suggestBox.updateSuggestions(this.boxForAnchorAtStart(selection, fullWordRange), completions, shouldSelect, !this.isCaretAtEndOfPrompt(), this.text());
    }
  }
  applySuggestion(suggestion, isIntermediateSuggestion) {
    this.currentSuggestion = suggestion;
    this.refreshGhostText();
    if (isIntermediateSuggestion) {
      this.dispatchEventToListeners(
        "TextChanged"
        /* Events.TEXT_CHANGED */
      );
    }
  }
  acceptSuggestion() {
    this.#acceptSuggestion();
  }
  #acceptSuggestion() {
    if (!this.queryRange) {
      return false;
    }
    const suggestionLength = this.currentSuggestion ? this.currentSuggestion.text.length : 0;
    const selectionRange = this.currentSuggestion ? this.currentSuggestion.selectionRange : null;
    const endColumn = selectionRange ? selectionRange.endColumn : suggestionLength;
    const startColumn = selectionRange ? selectionRange.startColumn : suggestionLength;
    this.element().textContent = this.textWithCurrentSuggestion();
    this.setDOMSelection(this.queryRange.startColumn + startColumn, this.queryRange.startColumn + endColumn);
    this.updateLeftParenthesesIndices();
    this.clearAutocomplete();
    this.dispatchEventToListeners(
      "TextChanged"
      /* Events.TEXT_CHANGED */
    );
    return true;
  }
  ownerElement() {
    return this.element();
  }
  setDOMSelection(startColumn, endColumn) {
    this.element().normalize();
    const node = this.element().childNodes[0];
    if (!node || node === this.ghostTextElement) {
      return;
    }
    const range = document.createRange();
    range.setStart(node, startColumn);
    range.setEnd(node, endColumn);
    const selection = this.element().getComponentSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  isSuggestBoxVisible() {
    return this.suggestBox?.visible() ?? false;
  }
  isCaretAtEndOfPrompt() {
    const selection = this.element().getComponentSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return false;
    }
    const selectionRange = selection.getRangeAt(0);
    let node = selectionRange.startContainer;
    if (!node.isSelfOrDescendant(this.element())) {
      return false;
    }
    if (this.ghostTextElement.isAncestor(node)) {
      return true;
    }
    if (node.nodeType === Node.TEXT_NODE && selectionRange.startOffset < (node.nodeValue || "").length) {
      return false;
    }
    let foundNextText = false;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue?.length) {
        if (foundNextText && !this.ghostTextElement.isAncestor(node)) {
          return false;
        }
        foundNextText = true;
      }
      node = node.traverseNextNode(this.#element);
    }
    return true;
  }
  moveCaretToEndOfPrompt() {
    const selection = this.element().getComponentSelection();
    const selectionRange = document.createRange();
    let container = this.element();
    while (container.lastChild) {
      container = container.lastChild;
    }
    let offset = 0;
    if (container.nodeType === Node.TEXT_NODE) {
      const textNode = container;
      offset = (textNode.textContent || "").length;
    }
    selectionRange.setStart(container, offset);
    selectionRange.setEnd(container, offset);
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(selectionRange);
    }
  }
  /**
   * -1 if no caret can be found in text prompt
   */
  getCaretPosition() {
    if (!this.element().hasFocus()) {
      return -1;
    }
    const selection = this.element().getComponentSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return -1;
    }
    const selectionRange = selection.getRangeAt(0);
    if (selectionRange.startOffset !== selectionRange.endOffset) {
      return -1;
    }
    return selectionRange.startOffset;
  }
  tabKeyPressed(_event) {
    return this.acceptAutoComplete();
  }
  /**
   * Try matching the most recent open parenthesis with the given right
   * parenthesis, and closes the matched left parenthesis if found.
   * Return the result of the matching.
   */
  tryMatchingLeftParenthesis(rightParenthesisIndex) {
    const leftParenthesesIndices = this.leftParenthesesIndices;
    if (leftParenthesesIndices.length === 0 || rightParenthesisIndex < 0) {
      return false;
    }
    for (let i = leftParenthesesIndices.length - 1; i >= 0; --i) {
      if (leftParenthesesIndices[i] < rightParenthesisIndex) {
        leftParenthesesIndices.splice(i, 1);
        return true;
      }
    }
    return false;
  }
  updateLeftParenthesesIndices() {
    const text = this.text();
    const leftParenthesesIndices = this.leftParenthesesIndices = [];
    for (let i = 0; i < text.length; ++i) {
      if (text[i] === "(") {
        leftParenthesesIndices.push(i);
      }
    }
  }
  suggestBoxForTest() {
    return this.suggestBox;
  }
};
var DefaultAutocompletionTimeout = 250;

// gen/front_end/ui/legacy/toolbar.css.js
var toolbar_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  padding: 0 2px;
  position: relative;
  white-space: nowrap;
  overflow: hidden;
  display: flex;
  flex: none;
  align-items: center;
  z-index: 0;

  --toolbar-height: 26px;
}

:host([floating]) {
  flex-direction: column;
  inset: 0;
  background-color: var(--sys-color-cdt-base-container);
  border: 1px solid var(--sys-color-divider);
  margin-top: -1px;
  width: 28px;
}

:host([hidden]) {
  display: none;
}

:host([wrappable]) {
  flex-wrap: wrap;
  overflow: visible;
}

slot {
  height: var(--toolbar-height);
}

devtools-toolbar-input {
  display: flex;
}

/*# sourceURL=${import.meta.resolve("./toolbar.css")} */`;

// gen/front_end/ui/legacy/Toolbar.js
var UIStrings10 = {
  /**
   * @description Announced screen reader message for ToolbarSettingToggle when the setting is toggled on.
   */
  pressed: "pressed",
  /**
   * @description Announced screen reader message for ToolbarSettingToggle when the setting is toggled off.
   */
  notPressed: "not pressed",
  /**
   * @description Tooltip shown when the user hovers over the clear icon to empty the text input.
   */
  clearInput: "Clear",
  /**
   * @description Placeholder for filter bars that shows before the user types in a filter keyword.
   */
  filter: "Filter"
};
var str_10 = i18n19.i18n.registerUIStrings("ui/legacy/Toolbar.ts", UIStrings10);
var i18nString10 = i18n19.i18n.getLocalizedString.bind(void 0, str_10);
var Toolbar = class _Toolbar extends HTMLElement {
  #shadowRoot = this.attachShadow({ mode: "open" });
  items = [];
  enabled = true;
  compactLayout = false;
  constructor() {
    super();
    this.#shadowRoot.createChild("style").textContent = toolbar_css_default;
    this.#shadowRoot.createChild("slot");
  }
  onItemsChange(mutationList) {
    for (const mutation of mutationList) {
      for (const element of mutation.removedNodes) {
        if (!(element instanceof HTMLElement)) {
          continue;
        }
        for (const item8 of this.items) {
          if (item8.element === element) {
            this.items.splice(this.items.indexOf(item8), 1);
            break;
          }
        }
      }
      for (const element of mutation.addedNodes) {
        if (!(element instanceof HTMLElement)) {
          continue;
        }
        if (this.items.some((item9) => item9.element === element)) {
          continue;
        }
        let item8;
        if (element instanceof Buttons5.Button.Button) {
          item8 = new ToolbarButton("", void 0, void 0, void 0, element);
        } else if (element instanceof ToolbarInputElement) {
          item8 = element.item;
        } else if (element instanceof HTMLSelectElement) {
          item8 = new ToolbarComboBox(null, element.title, void 0, void 0, element);
        } else {
          item8 = new ToolbarItem(element);
        }
        if (item8) {
          this.appendToolbarItem(item8);
        }
      }
    }
  }
  connectedCallback() {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "toolbar");
    }
  }
  /**
   * Returns whether this toolbar is floating.
   *
   * @returns `true` if the `"floating"` attribute is present on this toolbar,
   *         otherwise `false`.
   */
  get floating() {
    return this.hasAttribute("floating");
  }
  /**
   * Changes the value of the `"floating"` attribute on this toolbar.
   *
   * @param floating `true` to make the toolbar floating.
   */
  set floating(floating) {
    this.toggleAttribute("floating", floating);
  }
  /**
   * Returns whether this toolbar is wrappable.
   *
   * @returns `true` if the `"wrappable"` attribute is present on this toolbar,
   *         otherwise `false`.
   */
  get wrappable() {
    return this.hasAttribute("wrappable");
  }
  /**
   * Changes the value of the `"wrappable"` attribute on this toolbar.
   *
   * @param wrappable `true` to make the toolbar items wrap to a new row and
   *                  have the toolbar height adjust.
   */
  set wrappable(wrappable) {
    this.toggleAttribute("wrappable", wrappable);
  }
  hasCompactLayout() {
    return this.compactLayout;
  }
  setCompactLayout(enable) {
    if (this.compactLayout === enable) {
      return;
    }
    this.compactLayout = enable;
    for (const item8 of this.items) {
      item8.setCompactLayout(enable);
    }
  }
  static createLongPressActionButton(action6, toggledOptions, untoggledOptions) {
    const button = _Toolbar.createActionButton(action6);
    const mainButtonClone = _Toolbar.createActionButton(action6);
    let longClickController = null;
    let longClickButtons = null;
    action6.addEventListener("Toggled", updateOptions);
    updateOptions();
    return button;
    function updateOptions() {
      const buttons = action6.toggled() ? toggledOptions || null : untoggledOptions || null;
      if (buttons?.length) {
        if (!longClickController) {
          longClickController = new LongClickController(button.element, showOptions);
          button.setLongClickable(true);
          longClickButtons = buttons;
        }
      } else if (longClickController) {
        longClickController.dispose();
        longClickController = null;
        button.setLongClickable(false);
        longClickButtons = null;
      }
    }
    function showOptions() {
      let buttons = longClickButtons ? longClickButtons.slice() : [];
      buttons.push(mainButtonClone);
      const document2 = button.element.ownerDocument;
      document2.documentElement.addEventListener("mouseup", mouseUp, false);
      const optionsGlassPane = new GlassPane();
      optionsGlassPane.setPointerEventsBehavior(
        "BlockedByGlassPane"
        /* PointerEventsBehavior.BLOCKED_BY_GLASS_PANE */
      );
      optionsGlassPane.show(document2);
      const optionsBar = optionsGlassPane.contentElement.createChild("devtools-toolbar");
      optionsBar.floating = true;
      const buttonHeight = 26;
      const hostButtonPosition = button.element.boxInWindow().relativeToElement(GlassPane.container(document2));
      const topNotBottom = hostButtonPosition.y + buttonHeight * buttons.length < document2.documentElement.offsetHeight;
      if (topNotBottom) {
        buttons = buttons.reverse();
      }
      optionsBar.style.height = buttonHeight * buttons.length + "px";
      if (topNotBottom) {
        optionsBar.style.top = hostButtonPosition.y - 5 + "px";
      } else {
        optionsBar.style.top = hostButtonPosition.y - buttonHeight * (buttons.length - 1) - 6 + "px";
      }
      optionsBar.style.left = hostButtonPosition.x - 5 + "px";
      for (let i = 0; i < buttons.length; ++i) {
        buttons[i].element.addEventListener("mousemove", mouseOver, false);
        buttons[i].element.addEventListener("mouseout", mouseOut, false);
        optionsBar.appendToolbarItem(buttons[i]);
      }
      const hostButtonIndex = topNotBottom ? 0 : buttons.length - 1;
      buttons[hostButtonIndex].element.classList.add("emulate-active");
      function mouseOver(e) {
        if (e.which !== 1) {
          return;
        }
        if (e.target instanceof HTMLElement) {
          const buttonElement = e.target.enclosingNodeOrSelfWithClass("toolbar-button");
          buttonElement.classList.add("emulate-active");
        }
      }
      function mouseOut(e) {
        if (e.which !== 1) {
          return;
        }
        if (e.target instanceof HTMLElement) {
          const buttonElement = e.target.enclosingNodeOrSelfWithClass("toolbar-button");
          buttonElement.classList.remove("emulate-active");
        }
      }
      function mouseUp(e) {
        if (e.which !== 1) {
          return;
        }
        optionsGlassPane.hide();
        document2.documentElement.removeEventListener("mouseup", mouseUp, false);
        for (let i = 0; i < buttons.length; ++i) {
          if (buttons[i].element.classList.contains("emulate-active")) {
            buttons[i].element.classList.remove("emulate-active");
            buttons[i].clicked(e);
            break;
          }
        }
      }
    }
  }
  static createActionButton(actionOrActionId, options = {}) {
    const action6 = typeof actionOrActionId === "string" ? ActionRegistry.instance().getAction(actionOrActionId) : actionOrActionId;
    const button = action6.toggleable() ? makeToggle() : makeButton();
    if (options.label) {
      button.setText(options.label() || action6.title());
    }
    const handler = () => {
      void action6.execute();
    };
    button.addEventListener("Click", handler, action6);
    action6.addEventListener("Enabled", enabledChanged);
    button.setEnabled(action6.enabled());
    return button;
    function makeButton() {
      const button2 = new ToolbarButton(action6.title(), action6.icon(), void 0, action6.id());
      if (action6.title()) {
        Tooltip.installWithActionBinding(button2.element, action6.title(), action6.id());
      }
      return button2;
    }
    function makeToggle() {
      const toggleButton = new ToolbarToggle(action6.title(), action6.icon(), action6.toggledIcon(), action6.id());
      if (action6.toggleWithRedColor()) {
        toggleButton.enableToggleWithRedColor();
      }
      action6.addEventListener("Toggled", toggled);
      toggled();
      return toggleButton;
      function toggled() {
        toggleButton.setToggled(action6.toggled());
        if (action6.title()) {
          toggleButton.setTitle(action6.title());
          Tooltip.installWithActionBinding(toggleButton.element, action6.title(), action6.id());
        }
      }
    }
    function enabledChanged(event) {
      button.setEnabled(event.data);
    }
  }
  empty() {
    return !this.items.length;
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    for (const item8 of this.items) {
      item8.applyEnabledState(this.enabled && item8.enabled);
    }
  }
  appendToolbarItem(item8) {
    this.items.push(item8);
    item8.toolbar = this;
    item8.setCompactLayout(this.hasCompactLayout());
    if (!this.enabled) {
      item8.applyEnabledState(false);
    }
    if (item8.element.parentElement !== this) {
      this.appendChild(item8.element);
    }
    this.hideSeparatorDupes();
  }
  hasItem(item8) {
    return this.items.includes(item8);
  }
  prependToolbarItem(item8) {
    this.items.unshift(item8);
    item8.toolbar = this;
    item8.setCompactLayout(this.hasCompactLayout());
    if (!this.enabled) {
      item8.applyEnabledState(false);
    }
    this.prepend(item8.element);
    this.hideSeparatorDupes();
  }
  appendSeparator() {
    this.appendToolbarItem(new ToolbarSeparator());
  }
  appendSpacer() {
    this.appendToolbarItem(new ToolbarSeparator(true));
  }
  appendText(text) {
    this.appendToolbarItem(new ToolbarText(text));
  }
  removeToolbarItem(itemToRemove) {
    const updatedItems = [];
    for (const item8 of this.items) {
      if (item8 === itemToRemove) {
        item8.element.remove();
      } else {
        updatedItems.push(item8);
      }
    }
    this.items = updatedItems;
  }
  removeToolbarItems() {
    for (const item8 of this.items) {
      item8.toolbar = null;
    }
    this.items = [];
    this.removeChildren();
  }
  hideSeparatorDupes() {
    if (!this.items.length) {
      return;
    }
    let previousIsSeparator = false;
    let lastSeparator;
    let nonSeparatorVisible = false;
    for (let i = 0; i < this.items.length; ++i) {
      if (this.items[i] instanceof ToolbarSeparator) {
        this.items[i].setVisible(!previousIsSeparator);
        previousIsSeparator = true;
        lastSeparator = this.items[i];
        continue;
      }
      if (this.items[i].visible()) {
        previousIsSeparator = false;
        lastSeparator = null;
        nonSeparatorVisible = true;
      }
    }
    if (lastSeparator && lastSeparator !== this.items[this.items.length - 1]) {
      lastSeparator.setVisible(false);
    }
    this.classList.toggle("hidden", lastSeparator !== null && lastSeparator !== void 0 && lastSeparator.visible() && !nonSeparatorVisible);
  }
  async appendItemsAtLocation(location) {
    const extensions = getRegisteredToolbarItems();
    extensions.sort((extension1, extension2) => {
      const order1 = extension1.order || 0;
      const order2 = extension2.order || 0;
      return order1 - order2;
    });
    const filtered = extensions.filter((e) => e.location === location);
    const items = await Promise.all(filtered.map((extension) => {
      const { separator, actionId, label, loadItem } = extension;
      if (separator) {
        return new ToolbarSeparator();
      }
      if (actionId) {
        return _Toolbar.createActionButton(actionId, { label });
      }
      if (!loadItem) {
        throw new Error("Could not load a toolbar item registration with no loadItem function");
      }
      return loadItem().then((p) => p.item());
    }));
    for (const item8 of items) {
      if (item8) {
        this.appendToolbarItem(item8);
      }
    }
  }
};
customElements.define("devtools-toolbar", Toolbar);
var ToolbarItem = class extends Common13.ObjectWrapper.ObjectWrapper {
  element;
  #visible;
  enabled;
  toolbar;
  title;
  constructor(element) {
    super();
    this.element = element;
    this.#visible = true;
    this.enabled = true;
    this.toolbar = null;
  }
  setTitle(title, actionId = void 0) {
    if (this.title === title) {
      return;
    }
    this.title = title;
    setLabel(this.element, title);
    if (actionId === void 0) {
      Tooltip.install(this.element, title);
    } else {
      Tooltip.installWithActionBinding(this.element, title, actionId);
    }
  }
  setEnabled(value) {
    if (this.enabled === value) {
      return;
    }
    this.enabled = value;
    this.applyEnabledState(this.enabled && (!this.toolbar || this.toolbar.enabled));
  }
  applyEnabledState(enabled) {
    this.element.disabled = !enabled;
  }
  visible() {
    return this.#visible;
  }
  setVisible(x) {
    if (this.#visible === x) {
      return;
    }
    this.element.classList.toggle("hidden", !x);
    this.#visible = x;
    if (this.toolbar && !(this instanceof ToolbarSeparator)) {
      this.toolbar.hideSeparatorDupes();
    }
  }
  setCompactLayout(_enable) {
  }
  setMaxWidth(width) {
    this.element.style.maxWidth = width + "px";
  }
  setMinWidth(width) {
    this.element.style.minWidth = width + "px";
  }
};
var ToolbarItemWithCompactLayout = class extends ToolbarItem {
  setCompactLayout(enable) {
    this.dispatchEventToListeners("CompactLayoutUpdated", enable);
  }
};
var ToolbarText = class extends ToolbarItem {
  constructor(text = "") {
    const element = document.createElement("div");
    element.classList.add("toolbar-text");
    super(element);
    this.setText(text);
  }
  text() {
    return this.element.textContent ?? "";
  }
  setText(text) {
    this.element.textContent = text;
  }
};
var ToolbarButton = class extends ToolbarItem {
  button;
  text;
  adorner;
  constructor(title, glyph, text, jslogContext, button) {
    if (!button) {
      button = new Buttons5.Button.Button();
      if (glyph && !text) {
        button.data = { variant: "icon", iconName: glyph };
      } else {
        button.variant = "text";
        button.reducedFocusRing = true;
        if (glyph) {
          button.iconName = glyph;
        }
      }
    }
    super(button);
    this.button = button;
    button.classList.add("toolbar-button");
    this.element.addEventListener("click", this.clicked.bind(this), false);
    button.textContent = text || "";
    this.setTitle(title);
    if (jslogContext) {
      button.jslogContext = jslogContext;
    }
  }
  focus() {
    this.element.focus();
  }
  checked(checked) {
    this.button.checked = checked;
  }
  toggleOnClick(toggleOnClick) {
    this.button.toggleOnClick = toggleOnClick;
  }
  isToggled() {
    return this.button.toggled;
  }
  toggled(toggled) {
    this.button.toggled = toggled;
  }
  setToggleType(type) {
    this.button.toggleType = type;
  }
  setLongClickable(longClickable) {
    this.button.longClickable = longClickable;
  }
  setSize(size) {
    this.button.size = size;
  }
  setReducedFocusRing() {
    this.button.reducedFocusRing = true;
  }
  setText(text) {
    if (this.text === text) {
      return;
    }
    this.button.textContent = text;
    this.button.variant = "text";
    this.button.reducedFocusRing = true;
    this.text = text;
  }
  setAdorner(adorner) {
    if (this.adorner) {
      this.adorner.replaceWith(adorner);
    } else {
      this.element.prepend(adorner);
    }
    this.adorner = adorner;
  }
  setGlyph(iconName) {
    this.button.iconName = iconName;
  }
  setToggledIcon(toggledIconName) {
    this.button.variant = "icon_toggle";
    this.button.toggledIconName = toggledIconName;
  }
  setBackgroundImage(iconURL) {
    this.element.style.backgroundImage = "url(" + iconURL + ")";
  }
  setSecondary() {
    this.element.classList.add("toolbar-button-secondary");
  }
  setDarkText() {
    this.element.classList.add("dark-text");
  }
  clicked(event) {
    if (!this.enabled) {
      return;
    }
    this.dispatchEventToListeners("Click", event);
    event.consume();
  }
};
var ToolbarInput = class extends ToolbarItem {
  prompt;
  proxyElement;
  constructor(placeholder, accessiblePlaceholder, growFactor, shrinkFactor, tooltip, completions, dynamicCompletions, jslogContext, element) {
    if (!element) {
      element = document.createElement("div");
    }
    element.classList.add("toolbar-input");
    super(element);
    const internalPromptElement = this.element.createChild("div", "toolbar-input-prompt");
    setLabel(internalPromptElement, accessiblePlaceholder || placeholder);
    internalPromptElement.addEventListener("focus", () => this.element.classList.add("focused"));
    internalPromptElement.addEventListener("blur", () => this.element.classList.remove("focused"));
    this.prompt = new TextPrompt();
    this.prompt.jslogContext = jslogContext;
    this.proxyElement = this.prompt.attach(internalPromptElement);
    this.proxyElement.classList.add("toolbar-prompt-proxy");
    this.proxyElement.addEventListener("keydown", (event) => this.onKeydownCallback(event));
    this.prompt.initialize(completions || (() => Promise.resolve([])), " ", dynamicCompletions);
    if (tooltip) {
      this.prompt.setTitle(tooltip);
    }
    this.prompt.setPlaceholder(placeholder, accessiblePlaceholder);
    this.prompt.addEventListener("TextChanged", this.onChangeCallback.bind(this));
    if (growFactor) {
      this.element.style.flexGrow = String(growFactor);
    }
    if (shrinkFactor) {
      this.element.style.flexShrink = String(shrinkFactor);
    }
    const clearButtonText = i18nString10(UIStrings10.clearInput);
    const clearButton = new Buttons5.Button.Button();
    clearButton.data = {
      variant: "icon",
      iconName: "cross-circle-filled",
      size: "SMALL",
      title: clearButtonText
    };
    clearButton.className = "toolbar-input-clear-button";
    clearButton.setAttribute("jslog", `${VisualLogging13.action("clear").track({ click: true }).parent("mapped")}`);
    VisualLogging13.setMappedParent(clearButton, internalPromptElement);
    clearButton.variant = "icon";
    clearButton.size = "SMALL";
    clearButton.iconName = "cross-circle-filled";
    clearButton.title = clearButtonText;
    clearButton.ariaLabel = clearButtonText;
    clearButton.tabIndex = -1;
    clearButton.addEventListener("click", () => {
      this.setValue("", true);
      this.prompt.focus();
    });
    this.element.appendChild(clearButton);
    this.updateEmptyStyles();
  }
  applyEnabledState(enabled) {
    if (enabled) {
      this.element.classList.remove("disabled");
    } else {
      this.element.classList.add("disabled");
    }
    this.prompt.setEnabled(enabled);
  }
  setValue(value, notify) {
    this.prompt.setText(value);
    if (notify) {
      this.onChangeCallback();
    }
    this.updateEmptyStyles();
  }
  value() {
    return this.prompt.textWithCurrentSuggestion();
  }
  valueWithoutSuggestion() {
    return this.prompt.text();
  }
  clearAutocomplete() {
    this.prompt.clearAutocomplete();
  }
  focus() {
    this.prompt.focus();
  }
  onKeydownCallback(event) {
    if (event.key === "Enter" && this.prompt.text()) {
      this.dispatchEventToListeners("EnterPressed", this.prompt.text());
    }
    if (!Platform13.KeyboardUtilities.isEscKey(event) || !this.prompt.text()) {
      return;
    }
    this.setValue("", true);
    event.consume(true);
  }
  onChangeCallback() {
    this.updateEmptyStyles();
    this.dispatchEventToListeners("TextChanged", this.prompt.text());
  }
  updateEmptyStyles() {
    this.element.classList.toggle("toolbar-input-empty", !this.prompt.text());
  }
};
var ToolbarFilter = class extends ToolbarInput {
  constructor(filterBy, growFactor, shrinkFactor, tooltip, completions, dynamicCompletions, jslogContext, element) {
    const filterPlaceholder = filterBy ? filterBy : i18nString10(UIStrings10.filter);
    super(filterPlaceholder, filterPlaceholder, growFactor, shrinkFactor, tooltip, completions, dynamicCompletions, jslogContext || "filter", element);
    const filterIcon = IconButton6.Icon.create("filter");
    this.element.prepend(filterIcon);
    this.element.classList.add("toolbar-filter");
  }
};
var ToolbarInputElement = class extends HTMLElement {
  static observedAttributes = ["value", "disabled"];
  item;
  datalist = null;
  value = void 0;
  #disabled = false;
  connectedCallback() {
    if (this.item) {
      return;
    }
    const list = this.getAttribute("list");
    if (list) {
      this.datalist = this.getRootNode().querySelector(`datalist[id="${list}"]`);
    }
    const placeholder = this.getAttribute("placeholder") || "";
    const accessiblePlaceholder = this.getAttribute("aria-placeholder") ?? void 0;
    const tooltip = this.getAttribute("title") ?? void 0;
    const jslogContext = this.id ?? void 0;
    const isFilter = this.getAttribute("type") === "filter";
    if (isFilter) {
      this.item = new ToolbarFilter(
        placeholder,
        /* growFactor=*/
        void 0,
        /* shrinkFactor=*/
        void 0,
        tooltip,
        this.datalist ? this.#onAutocomplete.bind(this) : void 0,
        /* dynamicCompletions=*/
        void 0,
        jslogContext || "filter",
        this
      );
    } else {
      this.item = new ToolbarInput(
        placeholder,
        accessiblePlaceholder,
        /* growFactor=*/
        void 0,
        /* shrinkFactor=*/
        void 0,
        tooltip,
        this.datalist ? this.#onAutocomplete.bind(this) : void 0,
        /* dynamicCompletions=*/
        void 0,
        jslogContext,
        this
      );
    }
    if (this.value) {
      this.item.setValue(this.value);
    }
    if (this.#disabled) {
      this.item.setEnabled(false);
    }
    this.item.addEventListener("TextChanged", (event) => {
      this.dispatchEvent(new CustomEvent("change", { detail: event.data }));
    });
    this.item.addEventListener("EnterPressed", (event) => {
      this.dispatchEvent(new CustomEvent("submit", { detail: event.data }));
    });
  }
  focus() {
    this.item?.focus();
  }
  async #onAutocomplete(expression, prefix, force) {
    if (!prefix && !force && expression || !this.datalist) {
      return [];
    }
    const options = this.datalist.options;
    return [...options].map(({ value }) => value).filter((value) => value.startsWith(prefix)).map((text) => ({ text }));
  }
  attributeChangedCallback(name, _oldValue, newValue) {
    if (name === "value") {
      if (this.item && this.item.value() !== newValue) {
        this.item.setValue(newValue, true);
      } else {
        this.value = newValue;
      }
    } else if (name === "disabled") {
      this.#disabled = typeof newValue === "string";
      if (this.item) {
        this.item.setEnabled(!this.#disabled);
      }
    }
  }
  set disabled(disabled) {
    if (disabled) {
      this.setAttribute("disabled", "");
    } else {
      this.removeAttribute("disabled");
    }
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
};
customElements.define("devtools-toolbar-input", ToolbarInputElement);
var ToolbarToggle = class extends ToolbarButton {
  toggledGlyph;
  constructor(title, glyph, toggledGlyph, jslogContext, toggleOnClick) {
    super(title, glyph, "");
    this.toggledGlyph = toggledGlyph ? toggledGlyph : glyph;
    this.setToggledIcon(this.toggledGlyph || "");
    this.setToggleType(
      "primary-toggle"
      /* Buttons.Button.ToggleType.PRIMARY */
    );
    this.toggled(false);
    if (jslogContext) {
      this.element.setAttribute("jslog", `${VisualLogging13.toggle().track({ click: true }).context(jslogContext)}`);
    }
    if (toggleOnClick !== void 0) {
      this.setToggleOnClick(toggleOnClick);
    }
  }
  setToggleOnClick(toggleOnClick) {
    this.toggleOnClick(toggleOnClick);
  }
  setToggled(toggled) {
    this.toggled(toggled);
  }
  setChecked(checked) {
    this.checked(checked);
  }
  enableToggleWithRedColor() {
    this.setToggleType(
      "red-toggle"
      /* Buttons.Button.ToggleType.RED */
    );
  }
};
var ToolbarMenuButton = class extends ToolbarItem {
  textElement;
  text;
  iconName;
  adorner;
  contextMenuHandler;
  useSoftMenu;
  keepOpen;
  isIconDropdown;
  triggerTimeoutId;
  #triggerDelay = 200;
  constructor(contextMenuHandler, isIconDropdown, useSoftMenu, jslogContext, iconName, keepOpen) {
    let element;
    if (iconName) {
      element = new Buttons5.Button.Button();
      element.data = { variant: "icon", iconName };
    } else {
      element = document.createElement("button");
    }
    element.classList.add("toolbar-button");
    super(element);
    this.element.addEventListener("click", this.clicked.bind(this), false);
    this.iconName = iconName;
    this.setTitle("");
    this.title = "";
    if (!isIconDropdown) {
      this.element.classList.add("toolbar-has-dropdown");
      const dropdownArrowIcon = IconButton6.Icon.create("triangle-down", "toolbar-dropdown-arrow");
      this.element.appendChild(dropdownArrowIcon);
    }
    if (jslogContext) {
      this.element.setAttribute("jslog", `${VisualLogging13.dropDown().track({ click: true }).context(jslogContext)}`);
    }
    this.element.addEventListener("mousedown", this.mouseDown.bind(this), false);
    this.contextMenuHandler = contextMenuHandler;
    this.useSoftMenu = Boolean(useSoftMenu);
    this.keepOpen = Boolean(keepOpen);
    this.isIconDropdown = Boolean(isIconDropdown);
    markAsMenuButton(this.element);
  }
  setText(text) {
    if (this.text === text || this.iconName) {
      return;
    }
    if (!this.textElement) {
      this.textElement = document.createElement("div");
      this.textElement.classList.add("toolbar-text", "hidden");
      const dropDownArrow = this.element.querySelector(".toolbar-dropdown-arrow");
      this.element.insertBefore(this.textElement, dropDownArrow);
    }
    this.textElement.textContent = text;
    this.textElement.classList.toggle("hidden", !text);
    this.text = text;
  }
  setAdorner(adorner) {
    if (this.iconName) {
      return;
    }
    if (!this.adorner) {
      this.adorner = adorner;
    } else {
      adorner.replaceWith(adorner);
      if (this.element.firstChild) {
        this.element.removeChild(this.element.firstChild);
      }
    }
    this.element.prepend(adorner);
  }
  setDarkText() {
    this.element.classList.add("dark-text");
  }
  turnShrinkable() {
    this.element.classList.add("toolbar-has-dropdown-shrinkable");
  }
  setTriggerDelay(x) {
    this.#triggerDelay = x;
  }
  mouseDown(event) {
    if (!this.enabled) {
      return;
    }
    if (event.buttons !== 1) {
      return;
    }
    if (!this.triggerTimeoutId) {
      this.triggerTimeoutId = window.setTimeout(this.trigger.bind(this, event), this.#triggerDelay);
    }
  }
  trigger(event) {
    delete this.triggerTimeoutId;
    const horizontalPosition = this.isIconDropdown ? this.element.getBoundingClientRect().right : this.element.getBoundingClientRect().left;
    const contextMenu = new ContextMenu(event, {
      useSoftMenu: this.useSoftMenu,
      keepOpen: this.keepOpen,
      x: horizontalPosition,
      y: this.element.getBoundingClientRect().top + this.element.offsetHeight,
      // Without adding a delay, pointer events will be un-ignored too early, and a single click causes
      // the context menu to be closed and immediately re-opened on Windows (https://crbug.com/339560549).
      onSoftMenuClosed: () => setTimeout(() => this.element.removeAttribute("aria-expanded"), 50)
    });
    this.contextMenuHandler(contextMenu);
    this.element.setAttribute("aria-expanded", "true");
    void contextMenu.show();
  }
  clicked(event) {
    if (this.triggerTimeoutId) {
      clearTimeout(this.triggerTimeoutId);
    }
    this.trigger(event);
  }
};
var ToolbarSettingToggle = class extends ToolbarToggle {
  defaultTitle;
  setting;
  willAnnounceState;
  constructor(setting, glyph, title, toggledGlyph, jslogContext) {
    super(title, glyph, toggledGlyph, jslogContext);
    this.defaultTitle = title;
    this.setting = setting;
    this.settingChanged();
    this.setting.addChangeListener(this.settingChanged, this);
    this.willAnnounceState = false;
  }
  settingChanged() {
    const toggled = this.setting.get();
    this.setToggled(toggled);
    const toggleAnnouncement = toggled ? i18nString10(UIStrings10.pressed) : i18nString10(UIStrings10.notPressed);
    if (this.willAnnounceState) {
      LiveAnnouncer.alert(toggleAnnouncement);
    }
    this.willAnnounceState = false;
    this.setTitle(this.defaultTitle);
  }
  clicked(event) {
    this.willAnnounceState = true;
    this.setting.set(this.isToggled());
    super.clicked(event);
  }
};
var ToolbarSeparator = class extends ToolbarItem {
  constructor(spacer) {
    const element = document.createElement("div");
    element.classList.add(spacer ? "toolbar-spacer" : "toolbar-divider");
    super(element);
  }
};
var ToolbarComboBox = class extends ToolbarItem {
  constructor(changeHandler, title, className, jslogContext, element) {
    if (!element) {
      element = document.createElement("select");
    }
    super(element);
    if (changeHandler) {
      this.element.addEventListener("change", changeHandler, false);
    }
    setLabel(this.element, title);
    super.setTitle(title);
    if (className) {
      this.element.classList.add(className);
    }
    if (jslogContext) {
      this.element.setAttribute("jslog", `${VisualLogging13.dropDown().track({ change: true }).context(jslogContext)}`);
    }
  }
  size() {
    return this.element.childElementCount;
  }
  options() {
    return Array.prototype.slice.call(this.element.children, 0);
  }
  addOption(option) {
    this.element.appendChild(option);
  }
  createOption(label, value, jslogContext) {
    const option = this.element.createChild("option");
    option.text = label;
    if (typeof value !== "undefined") {
      option.value = value;
    }
    if (!jslogContext) {
      jslogContext = value ? Platform13.StringUtilities.toKebabCase(value) : void 0;
    }
    option.setAttribute("jslog", `${VisualLogging13.item(jslogContext).track({ click: true })}`);
    return option;
  }
  applyEnabledState(enabled) {
    super.applyEnabledState(enabled);
    this.element.disabled = !enabled;
  }
  removeOption(option) {
    this.element.removeChild(option);
  }
  removeOptions() {
    this.element.removeChildren();
  }
  selectedOption() {
    if (this.element.selectedIndex >= 0) {
      return this.element[this.element.selectedIndex];
    }
    return null;
  }
  select(option) {
    this.element.selectedIndex = Array.prototype.indexOf.call(this.element, option);
  }
  setSelectedIndex(index) {
    this.element.selectedIndex = index;
  }
  selectedIndex() {
    return this.element.selectedIndex;
  }
};
var ToolbarSettingComboBox = class extends ToolbarComboBox {
  #options;
  setting;
  muteSettingListener;
  constructor(options, setting, accessibleName) {
    super(null, accessibleName, void 0, setting.name);
    this.#options = options;
    this.setting = setting;
    this.element.addEventListener("change", this.onSelectValueChange.bind(this), false);
    this.setOptions(options);
    setting.addChangeListener(this.onDevToolsSettingChanged, this);
  }
  setOptions(options) {
    this.#options = options;
    this.element.removeChildren();
    for (let i = 0; i < options.length; ++i) {
      const dataOption = options[i];
      const option = this.createOption(dataOption.label, dataOption.value);
      this.element.appendChild(option);
      if (this.setting.get() === dataOption.value) {
        this.setSelectedIndex(i);
      }
    }
  }
  value() {
    return this.#options[this.selectedIndex()].value;
  }
  select(option) {
    const index = Array.prototype.indexOf.call(this.element, option);
    this.setSelectedIndex(index);
  }
  setSelectedIndex(index) {
    super.setSelectedIndex(index);
    const option = this.#options.at(index);
    if (option) {
      this.setTitle(option.label);
    }
  }
  /**
   * Note: wondering why there are two event listeners and what the difference is?
   * It is because this combo box <select> is backed by a Devtools setting and
   * at any time there could be multiple instances of these elements that are
   * backed by the same setting. So they have to listen to two things:
   * 1. When the setting is changed via a different method.
   * 2. When the value of the select is changed, triggering a change to the setting.
   */
  /**
   * Runs when the DevTools setting is changed
   */
  onDevToolsSettingChanged() {
    if (this.muteSettingListener) {
      return;
    }
    const value = this.setting.get();
    for (let i = 0; i < this.#options.length; ++i) {
      if (value === this.#options[i].value) {
        this.setSelectedIndex(i);
        break;
      }
    }
  }
  /**
   * Run when the user interacts with the <select> element.
   */
  onSelectValueChange(_event) {
    const option = this.#options[this.selectedIndex()];
    this.muteSettingListener = true;
    this.setting.set(option.value);
    this.muteSettingListener = false;
    this.setTitle(option.label);
  }
};
var ToolbarCheckbox = class extends ToolbarItem {
  #checkboxLabel;
  constructor(text, tooltip, listener, jslogContext) {
    const checkboxLabel = CheckboxLabel.create(text, void 0, void 0, jslogContext);
    super(checkboxLabel);
    if (tooltip) {
      Tooltip.install(this.element, tooltip);
    }
    if (listener) {
      this.element.addEventListener("click", listener, false);
    }
    this.#checkboxLabel = checkboxLabel;
  }
  checked() {
    return this.element.checked;
  }
  setChecked(value) {
    this.element.checked = value;
  }
  applyEnabledState(enabled) {
    super.applyEnabledState(enabled);
    this.element.disabled = !enabled;
  }
  setIndeterminate(indeterminate) {
    this.element.indeterminate = indeterminate;
  }
  /**
   * Sets the user visible text shown alongside the checkbox.
   * If you want to update the title/aria-label, use setTitle.
   */
  setLabelText(content) {
    this.#checkboxLabel.setLabelText(content);
  }
};
var ToolbarSettingCheckbox = class extends ToolbarCheckbox {
  constructor(setting, tooltip, alternateTitle) {
    super(alternateTitle || setting.title(), tooltip, void 0, setting.name);
    bindCheckbox(this.element, setting);
  }
};
var registeredToolbarItems = [];
function registerToolbarItem(registration) {
  registeredToolbarItems.push(registration);
}
function getRegisteredToolbarItems() {
  return registeredToolbarItems.filter((item8) => Root6.Runtime.Runtime.isDescriptorEnabled({ experiment: item8.experiment, condition: item8.condition }));
}

// gen/front_end/ui/legacy/UIUtils.js
import * as Common14 from "./../../core/common/common.js";
import * as Host7 from "./../../core/host/host.js";
import * as i18n21 from "./../../core/i18n/i18n.js";
import * as Platform15 from "./../../core/platform/platform.js";
import * as Geometry5 from "./../../models/geometry/geometry.js";
import * as TextUtils2 from "./../../models/text_utils/text_utils.js";
import * as Buttons6 from "./../components/buttons/buttons.js";
import * as IconButton7 from "./../components/icon_button/icon_button.js";
import * as Lit2 from "./../lit/lit.js";
import * as VisualLogging14 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/checkboxTextLabel.css.js
var checkboxTextLabel_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  padding: 0;
  margin: 0;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center !important; /* stylelint-disable-line declaration-no-important */
  overflow: hidden;
  white-space: nowrap;
}

input {
  height: 12px;
  width: 12px;
  flex-shrink: 0;
  accent-color: var(--sys-color-primary-bright);
  color: var(--sys-color-on-primary);
}

:host(:not(.small)) input:not(.small) {
  margin: 6px;
}

:host(.inside-datagrid) input {
  height: 10px;
  width: 10px;
}

.devtools-checkbox-text {
  overflow: hidden;
  text-overflow: ellipsis;

  input:disabled ~ & {
    opacity: 38%;
  }
}

.devtools-checkbox-subtitle {
  color: var(--sys-color-token-subtle);
  white-space: break-spaces;
}

@media (forced-colors: active) {
  input.devtools-checkbox-theme-preserve {
    forced-color-adjust: none;
  }

  input.devtools-checkbox-theme-preserve:active {
    background: HighlightText;
  }

  input.devtools-checkbox-theme-preserve:checked,
  input.devtools-checkbox-theme-preserve:active:checked {
    background: Highlight;
    border-color: Highlight;
  }

  input.devtools-checkbox-theme-preserve:hover:enabled {
    border-color: Highlight;
  }

  input.devtools-checkbox-theme-preserve:active::before,
  input.devtools-checkbox-theme-preserve:active::after {
    background-color: Highlight;
  }

  input.devtools-checkbox-theme-preserve:checked::before,
  input.devtools-checkbox-theme-preserve:checked::after,
  input.devtools-checkbox-theme-preserve:active:checked::before,
  input.devtools-checkbox-theme-preserve:active:checked::after {
    background-color: HighlightText;
  }

  input.devtools-checkbox-theme-preserve:hover:checked::before,
  input.devtools-checkbox-theme-preserve:hover:checked::after {
    background-color: Highlight !important; /* stylelint-disable-line declaration-no-important */
  }

  input.devtools-checkbox-theme-preserve:hover:checked {
    background: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./checkboxTextLabel.css")} */`;

// gen/front_end/ui/legacy/confirmDialog.css.js
var confirmDialog_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.widget {
  box-sizing: border-box;
  max-width: 400px;
  overflow: hidden;
}

.header {
  display: flex;
  margin: var(--sys-size-5) var(--sys-size-5) var(--sys-size-5) var(--sys-size-8);
  padding-top: var(--sys-size-3);
  font: var(--sys-typescale-body2-medium);
}

.message {
  font: var(--sys-typescale-body4-regular);
  white-space: pre;
  margin: 0 var(--sys-size-8);
}

/* Center-align text and added margin to the button class */
.button {
  text-align: center;
  margin: var(--sys-size-6) var(--sys-size-8) var(--sys-size-8) var(--sys-size-8);
  display: flex;
  flex-direction: row-reverse;
  gap: var(--sys-size-5);
}

/* Ensure the button has a minimum width */
.button button {
  min-width: 100px; /* Increased minimum width for better appearance */
}

.reason {
  color: var(--sys-color-error);
  margin-top: 10px; /* Added top margin for better spacing */
}

/* Added white-space property to handle text overflow */
.message span {
  white-space: normal;
  overflow-wrap: break-word; /* Allow long words to break and wrap to the next line */
  max-width: 100%;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
}

/*# sourceURL=${import.meta.resolve("./confirmDialog.css")} */`;

// gen/front_end/ui/legacy/inspectorCommon.css.js
var inspectorCommon_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

* {
  box-sizing: border-box;
  /* This is required for correct sizing of flex items because we rely
     * on an old version of the flexbox spec. */

  min-width: 0;
  min-height: 0;
}

:root {
  height: 100%;
  overflow: hidden;
  interpolate-size: allow-keywords;
}

body {
  height: 100%;
  width: 100%;
  position: relative;
  overflow: hidden;
  margin: 0;
  cursor: default;
  font-family: var(--default-font-family);
  font-size: 12px;
  tab-size: 4;
  user-select: none;
  color: var(--sys-color-on-surface);
  background: var(--sys-color-cdt-base-container);
}

:focus {
  outline-style: none;
}

/* Prevent UA stylesheet from overriding font-family for HTML elements. */
code, kbd, samp, pre {
  font-family: var(--monospace-font-family);
}

.monospace {
  font-family: var(--monospace-font-family);
  font-size: var(
    --monospace-font-size
  ) !important; /* stylelint-disable-line declaration-no-important */
}

.source-code {
  font-family: var(--source-code-font-family);
  font-size: var(
    --source-code-font-size
  ) !important; /* stylelint-disable-line declaration-no-important */

  white-space: pre-wrap;
}

.source-code.breakpoint {
  white-space: nowrap;
}

.source-code .devtools-link.text-button {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

img {
  -webkit-user-drag: none;
}

iframe,
a img {
  border: none;
}

.fill {
  position: absolute;
  inset: 0;
}

iframe.fill {
  width: 100%;
  height: 100%;
}

.widget {
  position: relative;
  flex: auto;
  contain: style;
}

.hbox {
  display: flex;
  flex-direction: row !important; /* stylelint-disable-line declaration-no-important */
  position: relative;
}

.vbox {
  display: flex;
  flex-direction: column !important; /* stylelint-disable-line declaration-no-important */
  position: relative;
}

.view-container > devtools-toolbar {
  border-bottom: 1px solid var(--sys-color-divider);
}

.flex-auto {
  flex: auto;
}

.flex-none {
  flex: none;
}

.flex-centered {
  display: flex;
  align-items: center;
  justify-content: center;
}

.overflow-auto {
  overflow: auto;
  background-color: var(--sys-color-cdt-base-container);
}

iframe.widget {
  position: absolute;
  width: 100%;
  height: 100%;
  inset: 0;
}

[hidden],
.hidden { /* TODO(crbug.com/458299714): remove the class */
  display: none !important; /* stylelint-disable-line declaration-no-important */
}

.highlighted-search-result,:host::highlight(highlighted-search-result) {
  border-radius: 1px;
  background-color: var(--sys-color-yellow-container);
  outline: 1px solid var(--sys-color-yellow-container);
}

.link {
  cursor: pointer;
  text-decoration: underline;
  color: var(--text-link);
  outline-offset: 2px;
}

button,
input,
select {
  /* Form elements do not automatically inherit font style from ancestors. */
  font-family: inherit;
  font-size: inherit;
}

select option,
select optgroup,
input {
  background-color: var(--sys-color-cdt-base-container);
}

input {
  color: inherit;

  &[type='checkbox'] {
    position: relative;
    outline: none;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover::after,
    &:active::before {
      content: '';
      height: 24px;
      width: 24px;
      border-radius: var(--sys-shape-corner-full);
      position: absolute;
    }

    &:not(.-theme-preserve) {
      accent-color: var(--sys-color-primary-bright);
      color: var(--sys-color-on-primary);
    }

    &:not(:disabled):hover::after {
      background-color: var(--sys-color-state-hover-on-subtle);
    }

    &:not(:disabled):active::before {
      background-color: var(--sys-color-state-ripple-neutral-on-subtle);
    }

    &:not(:disabled):focus-visible::before {
      content: '';
      height: 15px;
      width: 15px;
      border-radius: 5px;
      position: absolute;
      border: 2px solid var(--sys-color-state-focus-ring);
    }

    &.small:hover::after,
    &.small:active::before {
      height: 12px;
      width: 12px;
      border-radius: 2px;
    }
  }
}

input::placeholder {
  --override-input-placeholder-color: rgb(0 0 0 / 54%);

  color: var(--override-input-placeholder-color);
}

.theme-with-dark-background input::placeholder,
:host-context(.theme-with-dark-background) input::placeholder {
  --override-input-placeholder-color: rgb(230 230 230 / 54%);
}

.harmony-input:not([type]),
.harmony-input[type='number'],
.harmony-input[type='text'] {
  padding: 3px 6px;
  height: 24px;
  border: 1px solid var(--sys-color-neutral-outline);
  border-radius: 4px;

  &.error-input,
  &:invalid {
    border-color: var(--sys-color-error);
  }

  &:not(.error-input, :invalid):focus {
    border-color: var(--sys-color-state-focus-ring);
  }

  &:not(.error-input, :invalid):hover:not(:focus) {
    background: var(--sys-color-state-hover-on-subtle);
  }
}

/* Radio inputs */
input[type='radio'] {
  height: 17px;
  width: 17px;
  min-width: 17px;
  border-radius: 8px;
  vertical-align: sub;
  margin: 0 5px 5px 0;
  accent-color: var(--sys-color-primary-bright);
  color: var(--sys-color-on-primary);

  &:focus-visible {
    outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
  }
}

@media (forced-colors: active) {
  input[type='radio'] {
    --gradient-start: ButtonFace;
    --gradient-end: ButtonFace;

    &:checked {
      --gradient-start: Highlight;
      --gradient-end: Highlight;
    }
  }
}

/* Range inputs */
input[type='range'] {
  appearance: none;
  margin: 0;
  padding: 0;
  height: 10px;
  width: 88px;
  outline: none;
  background: none;
}

input[type='range']::-webkit-slider-thumb,
.-theme-preserve {
  appearance: none;
  margin: 0;
  padding: 0;
  border: 0;
  width: 12px;
  height: 12px;
  margin-top: -5px;
  border-radius: 50%;
  background-color: var(--sys-color-primary);
}

input[type='range']::-webkit-slider-runnable-track {
  appearance: none;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 2px;
  background-color: var(--sys-color-surface-variant);
}

input[type='range']:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 2px var(--sys-color-inverse-primary);
}

input[type='range']:disabled::-webkit-slider-thumb {
  background-color: var(--sys-color-state-disabled);
}

@media (forced-colors: active) {
  input[type='range'] {
    forced-color-adjust: none;
  }
}

.highlighted-search-result.current-search-result,:host::highlight(current-search-result) {
  /* Note: this value is used in light & dark mode */
  --override-current-search-result-background-color: rgb(255 127 0 / 80%);

  outline: 1px solid var(--sys-color-yellow-container);
  border-radius: 1px;
  padding: 1px;
  margin: -1px;
  background-color: var(--override-current-search-result-background-color);
}

.dimmed {
  opacity: 60%;
}

.editing {
  box-shadow: var(--drop-shadow);
  background-color: var(--sys-color-cdt-base-container);
  text-overflow: clip !important; /* stylelint-disable-line declaration-no-important */
  padding-left: 2px;
  margin-left: -2px;
  padding-right: 2px;
  margin-right: -2px;
  margin-bottom: -1px;
  padding-bottom: 1px;
  opacity: 100% !important; /* stylelint-disable-line declaration-no-important */
}

.editing,
.editing * {
  color: var(
    --sys-color-on-surface
  ) !important; /* stylelint-disable-line declaration-no-important */

  text-decoration: none !important; /* stylelint-disable-line declaration-no-important */
}

/* Combo boxes */

select {
  appearance: none;
  user-select: none;
  height: var(--sys-size-11);
  border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
  border-radius: var(--sys-shape-corner-extra-small);
  color: var(--sys-color-on-surface);
  font: inherit;
  margin: 0;
  outline: none;
  padding: 0 var(--sys-size-9) 0 var(--sys-size-5);
  background-image: var(--combobox-dropdown-arrow);
  background-color: transparent;
  background-position: right center;
  background-repeat: no-repeat;

  &:disabled {
    opacity: 100%;
    border-color: transparent;
    color: var(--sys-color-state-disabled);
    background-color: var(--sys-color-state-disabled-container);
    pointer-events: none;
  }

  &:enabled {
    &:hover {
      background-color: var(--sys-color-state-hover-on-subtle);
    }

    &:active {
      background-color: var(--sys-color-state-ripple-neutral-on-subtle);
    }

    &:hover:active {
      background: var(--combobox-dropdown-arrow),
        linear-gradient(
          var(--sys-color-state-hover-on-subtle),
          var(--sys-color-state-hover-on-subtle)
        ),
        linear-gradient(
          var(--sys-color-state-ripple-neutral-on-subtle),
          var(--sys-color-state-ripple-neutral-on-subtle)
        );
      background-position: right center;
      background-repeat: no-repeat;
    }

    &:focus {
      outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
      outline-offset: -1px;
    }
  }
}

@media (forced-colors: active) and (prefers-color-scheme: light) {
  :root,
  .theme-with-dark-background,
  :host-context(.theme-with-dark-background) {
    --combobox-dropdown-arrow: var(--image-file-arrow-drop-down-light);
  }
}

@media (forced-colors: active) and (prefers-color-scheme: dark) {
  :root,
  .theme-with-dark-background,
  :host-context(.theme-with-dark-background) {
    --combobox-dropdown-arrow: var(--image-file-arrow-drop-down-dark);
  }
}

.chrome-select-label {
  margin: 0 var(--sys-size-10);
  flex: none;

  p p {
    margin-top: 0;
    color: var(--sys-color-token-subtle);
  }

  .reload-warning {
    margin-left: var(--sys-size-5);
  }
}

/* This class is used outside of the settings screen in the "Renderer" and
   "Sensors" panel. As such we need to override their style globally */
.settings-select {
  margin: 0;
}

select optgroup,
select option {
  background-color: var(--sys-color-cdt-base-container);
  color: var(--sys-color-on-surface);
}

.gray-info-message {
  text-align: center;
  font-style: italic;
  padding: 6px;
  color: var(--sys-color-token-subtle);
  white-space: nowrap;
}

/* General empty state styles */
.empty-state {
  margin: var(--sys-size-5);
  display: flex;
  flex-grow: 1;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  text-align: center;
  min-height: fit-content;
  min-width: fit-content;

  > * {
    max-width: var(--sys-size-29);
  }

  .empty-state-header {
    font: var(--sys-typescale-headline5);
    margin-bottom: var(--sys-size-3);
  }

  .empty-state-description {
    font: var(--sys-typescale-body4-regular);
    color: var(--sys-color-on-surface-subtle);

    > x-link {
      white-space: nowrap;
      margin-left: var(--sys-size-3);
    }
  }

  > devtools-button {
    margin-top: var(--sys-size-7);
  }
}

dt-icon-label {
  flex: none;
}

.dot::before {
  content: var(--image-file-empty);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  outline: 1px solid var(--icon-gap-default);
  left: 9px;
  position: absolute;
  top: 9px;
  z-index: 1;
}

.green::before {
  background-color: var(--sys-color-green-bright);
}

.purple::before {
  background-color: var(--sys-color-purple-bright);
}

.new-badge {
  width: fit-content;
  height: var(--sys-size-8);
  line-height: var(--sys-size-8);
  border-radius: var(--sys-shape-corner-extra-small);
  padding: 0 var(--sys-size-3);
  background-color: var(--sys-color-tonal-container);
  color: var(--sys-color-on-tonal-container);
  font-weight: var(--ref-typeface-weight-bold);
  font-size: 9px;
  text-align: center;
}

:host-context(.platform-mac) .new-badge {
  background-color: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}

.expandable-inline-button {
  background-color: var(--sys-color-cdt-base-container);
  color: var(--sys-color-on-surface);
  cursor: pointer;
  border-radius: 3px;
}

.undisplayable-text,
.expandable-inline-button {
  border: none;
  padding: 1px 3px;
  margin: 0 2px;
  font-size: 11px;
  font-family: sans-serif;
  white-space: nowrap;
  display: inline-block;
}

.undisplayable-text::after,
.expandable-inline-button::after {
  content: attr(data-text);
}

.undisplayable-text {
  color: var(--sys-color-state-disabled);
  font-style: italic;
}

.expandable-inline-button:hover,
.expandable-inline-button:focus-visible {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.expandable-inline-button:focus-visible {
  background-color: var(--sys-color-state-focus-highlight);
}

::selection {
  background-color: var(--sys-color-state-text-highlight);
  color: var(--sys-color-state-on-text-highlight);
}

button.link {
  border: none;
  background: none;
  padding: 3px;
}

button.link:focus-visible {
  outline: 2px solid var(--sys-color-state-focus-ring);
  outline-offset: 2px;
  border-radius: var(--sys-shape-corner-full);
}

.data-grid-data-grid-node button.link:focus-visible {
  border-radius: var(--sys-shape-corner-extra-small);
  padding: 0;
  margin-top: 3px;
}

@media (forced-colors: active) {
  .dimmed,
  select:disabled {
    opacity: 100%;
  }

  .harmony-input:not([type]),
  .harmony-input[type='number'],
  .harmony-input[type='text'] {
    border: 1px solid ButtonText;
  }

  .harmony-input:not([type]):focus,
  .harmony-input[type='number']:focus,
  .harmony-input[type='text']:focus {
    border: 1px solid Highlight;
  }
}
/* search input with customized styling */
input.custom-search-input::-webkit-search-cancel-button {
  appearance: none;
  width: 16px;
  height: 15px;
  margin-right: 0;
  opacity: 70%;
  mask-image: var(--image-file-cross-circle-filled);
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: 99%;
  background-color: var(--icon-default);
}

input.custom-search-input::-webkit-search-cancel-button:hover {
  opacity: 99%;
}
/* loading spinner */
.spinner::before {
  display: block;
  width: var(--dimension, 24px);
  height: var(--dimension, 24px);
  border: var(--override-spinner-size, 3px) solid
    var(--override-spinner-color, var(--sys-color-token-subtle));
  border-radius: 12px;
  clip-path: rect(0, var(--clip-size, 15px), var(--clip-size, 15px), 0);
  content: '';
  position: absolute;
  animation: spinner-animation 1s linear infinite;
  box-sizing: border-box;
}

@keyframes spinner-animation {
  from {
    transform: rotate(0);
  }

  to {
    transform: rotate(360deg);
  }
}
/** Adorner */
.adorner-container {
  display: inline-flex;
  vertical-align: middle;
}

.adorner-container.hidden {
  display: none;
}

.adorner-container devtools-adorner {
  margin-left: 3px;
}

:host-context(.theme-with-dark-background) devtools-adorner {
  --override-adorner-border-color: var(--sys-color-tonal-outline);
  --override-adorner-active-background-color: var(
    --sys-color-state-riple-neutral-on-subtle
  );
}

/* General panel styles */
.panel {
  display: flex;
  overflow: hidden;
  position: absolute;
  inset: 0;
  z-index: 0;
  background-color: var(--sys-color-cdt-base-container);
}

.panel-sidebar {
  overflow-x: hidden;
  background-color: var(--sys-color-cdt-base-container);
}

iframe.extension {
  flex: auto;
  width: 100%;
  height: 100%;
}

iframe.panel.extension {
  display: block;
  height: 100%;
}

@media (forced-colors: active) {
  :root {
    --legacy-accent-color: Highlight;
    --legacy-focus-ring-inactive-shadow-color: ButtonText;
  }
}

/* Toolbar styles */
devtools-toolbar {
  & > * {
    position: relative;
    display: flex;
    background-color: transparent;
    flex: none;
    align-items: center;
    justify-content: center;
    height: var(--toolbar-height);
    border: none;
    white-space: pre;
    overflow: hidden;
    max-width: 100%;
    color: var(--icon-default);

    /* Some toolbars have a different cursor on hover (for example, resizeable
     * ones which can be clicked + dragged to move). But we want to make sure
     * by default each toolbar item shows the default cursor, because you
     * cannot click + drag on the item to resize the toolbar container, you
     * have to click + drag only on empty space. See crbug.com/371838044 for
     * an example. */
    cursor: default;

    & .devtools-link {
      color: var(--icon-default);
    }
  }

  .status-buttons {
    padding: 0 var(--sys-size-2);
    gap: var(--sys-size-2);
  }

  & > :not(select) {
    padding: 0;
  }

  & > devtools-issue-counter {
    margin-top: -4px;
    padding: 0 1px;
  }

  devtools-adorner.fix-perf-icon {
    --override-adorner-text-color: transparent;
    --override-adorner-border-color: transparent;
    --override-adorner-background-color: transparent;
  }

  devtools-issue-counter.main-toolbar {
    margin-left: 1px;
    margin-right: 1px;
  }

  .toolbar-dropdown-arrow {
    pointer-events: none;
    flex: none;
    top: var(--sys-size-1);
  }

  .toolbar-button.dark-text .toolbar-dropdown-arrow {
    color: var(--sys-color-on-surface);
  }

  /* Toolbar item */

  .toolbar-button {
    white-space: nowrap;
    overflow: hidden;
    min-width: 28px;
    background: transparent;
    border-radius: 0;

    &[aria-haspopup='true'][aria-expanded='true'] {
      pointer-events: none;
    }
  }

  .toolbar-item-search {
    min-width: 5.2em;
    max-width: 300px;
    flex: 1 1 auto;
    justify-content: start;
    overflow: revert;
  }

  .toolbar-text {
    margin: 0 5px;
    flex: none;
    color: var(--ui-text);
  }

  .toolbar-text:empty {
    margin: 0;
  }

  .toolbar-has-dropdown {
    justify-content: space-between;
    height: var(--sys-size-9);
    padding: 0 var(--sys-size-2) 0 var(--sys-size-4);
    margin: 0 var(--sys-size-2);
    gap: var(--sys-size-2);
    border-radius: var(--sys-shape-corner-extra-small);

    &:hover::after,
    &:active::before {
      content: '';
      height: 100%;
      width: 100%;
      border-radius: inherit;
      position: absolute;
      top: 0;
      left: 0;
    }

    &:hover::after {
      background-color: var(--sys-color-state-hover-on-subtle);
    }

    &:active::before {
      background-color: var(--sys-color-state-ripple-neutral-on-subtle);
    }

    &:focus-visible {
      outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
    }

    &[disabled] {
      pointer-events: none;
      background-color: var(--sys-color-state-disabled-container);
      color: var(--sys-color-state-disabled);
    }
  }

  .toolbar-has-dropdown-shrinkable {
    flex-shrink: 1;
  }

  .toolbar-has-dropdown .toolbar-text {
    margin: 0;
    text-overflow: ellipsis;
    flex: auto;
    overflow: hidden;
    text-align: right;
  }

  .toolbar-button:not(.toolbar-has-dropdown):focus-visible::before {
    position: absolute;
    inset: 2px;
    background-color: var(--sys-color-state-focus-highlight);
    border-radius: 2px;
    content: '';
    /* This ::before rule serves as a background for an element.
    Setting z-index to make sure it's always below the content. */
    z-index: -1;
  }

  .toolbar-glyph {
    flex: none;
  }
  /* Button */

  .toolbar-button:disabled {
    opacity: 50%;
  }

  .toolbar-button.copied-to-clipboard::after {
    content: attr(data-content);
    position: fixed;
    margin-top: calc(2 * var(--toolbar-height));
    padding: 3px 5px;
    color: var(--sys-color-token-subtle);
    background: var(--sys-color-cdt-base-container);
    animation: 2s fade-out;
    font-weight: normal;
    border: 1px solid var(--sys-color-divider);
    border-radius: 3px;
  }

  .toolbar-button.toolbar-state-on .toolbar-glyph {
    color: var(--icon-toggled);
  }

  .toolbar-state-on.toolbar-toggle-with-dot .toolbar-text::after {
    content: '';
    position: absolute;
    bottom: 2px;
    background-color: var(--sys-color-primary-bright);
    width: 4.5px;
    height: 4.5px;
    border: 2px solid
      var(--override-toolbar-background-color, --sys-color-cdt-base-container);
    border-radius: 50%;
    right: 0;
  }

  .toolbar-button.toolbar-state-on.toolbar-toggle-with-red-color .toolbar-glyph,
  .toolbar-button.toolbar-state-off.toolbar-default-with-red-color
    .toolbar-glyph {
    color: var(
      --icon-error
    ) !important; /* stylelint-disable-line declaration-no-important */
  }

  .toolbar-button:not(
      .toolbar-has-glyph,
      .toolbar-has-dropdown,
      .largeicon-menu,
      .toolbar-button-secondary
    ) {
    font-weight: bold;
  }

  .toolbar-button.dark-text .toolbar-text {
    color: var(
      --sys-color-on-surface
    ) !important; /* stylelint-disable-line declaration-no-important */
  }

  .toolbar-button.toolbar-state-on .toolbar-text {
    color: var(--sys-color-primary);
  }

  .toolbar-button.toolbar-state-on:enabled:active .toolbar-text {
    color: var(--sys-color-primary-bright);
  }

  .toolbar-button:enabled:hover:not(:active) .toolbar-glyph {
    color: var(--sys-color-on-surface);
  }

  .toolbar-button:enabled:hover:not(:active) .toolbar-text {
    color: var(--sys-color-on-surface);
  }

  .toolbar-button.toolbar-state-on:enabled:hover:not(:active) .toolbar-glyph {
    color: var(--sys-color-primary);
  }

  .toolbar-button.toolbar-state-on:enabled:hover:not(:active) .toolbar-text {
    color: var(--sys-color-primary);
  }

  /* Checkbox */

  & > devtools-checkbox {
    padding: 0 5px 0 0;
    white-space: unset;
  }

  /* Select */

  & > select {
    height: var(--sys-size-9);
    min-width: var(--sys-size-14);
  }

  /* Input */

  .toolbar-input {
    box-shadow: inset 0 0 0 2px transparent;
    box-sizing: border-box;
    width: 120px;
    height: var(--sys-size-9);
    padding: 0 var(--sys-size-2) 0 var(--sys-size-5);
    margin: 1px 3px;
    border-radius: 100px;
    min-width: 35px;
    position: relative;

    &.focused {
      box-shadow: inset 0 0 0 2px var(--sys-color-state-focus-ring);
    }

    &:not(:has(devtools-button:hover), .disabled):hover {
      background-color: var(--sys-color-state-hover-on-subtle);
    }

    &::before {
      content: '';
      box-sizing: inherit;
      height: 100%;
      width: 100%;
      position: absolute;
      left: 0;
      background: var(--sys-color-cdt-base);
      z-index: -1;
    }

    & > devtools-icon {
      color: var(--sys-color-on-surface-subtle);
      width: var(--sys-size-8);
      height: var(--sys-size-8);
      margin-right: var(--sys-size-3);
    }

    &.disabled > devtools-icon {
      color: var(--sys-color-state-disabled);
    }
  }

  .toolbar-filter .toolbar-input-clear-button {
    margin-right: var(--sys-size-4);
  }

  .toolbar-input-empty .toolbar-input-clear-button {
    display: none;
  }

  .toolbar-prompt-proxy {
    flex: 1;
  }

  .toolbar-input-prompt {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    cursor: text;
    color: var(--sys-color-on-surface);
  }
  /* Separator */

  .toolbar-divider {
    background-color: var(--sys-color-divider);
    width: 1px;
    margin: 5px 4px;
    height: 16px;
  }

  .toolbar-spacer {
    flex: auto;
  }

  .toolbar-button.emulate-active {
    background-color: var(--sys-color-surface-variant);
  }

  &:not([floating]) > :last-child:not(:first-child, select) {
    flex-shrink: 1;
    justify-content: left;
  }

  &:not([floating]) > .toolbar-button:last-child:not(:first-child, select) {
    justify-content: left;
    margin-right: 2px;
  }

  & > .highlight::before {
    content: '';
    position: absolute;
    inset: 2px;
    border-radius: 2px;
    background: var(--sys-color-neutral-container);
    z-index: -1;
  }

  & > .highlight:focus-visible {
    background: var(--sys-color-tonal-container);

    & > .title {
      color: var(--sys-color-on-tonal-container);
    }
  }

  devtools-icon.leading-issue-icon {
    margin: 0 7px;
  }

  @media (forced-colors: active) {
    .toolbar-button:disabled {
      opacity: 100%;
      color: Graytext;
    }

    devtools-toolbar > *,
    .toolbar-text {
      color: ButtonText;
    }

    .toolbar-button:disabled .toolbar-text {
      color: Graytext;
    }

    devtools-toolbar > select:disabled {
      opacity: 100%;
      color: Graytext;
    }

    .toolbar-button.toolbar-state-on .toolbar-glyph {
      forced-color-adjust: none;
      color: Highlight;
    }

    .toolbar-button.toolbar-state-on .toolbar-text {
      forced-color-adjust: none;
      color: Highlight;
    }

    .toolbar-button:enabled:hover:not(:active) .toolbar-text,
    .toolbar-button:enabled:focus:not(:active) .toolbar-text {
      color: HighlightText;
    }

    .toolbar-button:disabled devtools-icon {
      color: GrayText;
    }

    .toolbar-button:disabled .toolbar-glyph {
      color: GrayText;
    }

    .toolbar-button:enabled.hover:not(:active) .toolbar-glyph {
      forced-color-adjust: none;
      color: Highlight;
    }

    .toolbar-button:enabled:hover .toolbar-glyph,
    .toolbar-button:enabled:focus .toolbar-glyph,
    .toolbar-button:enabled:hover:not(:active) .toolbar-glyph,
    .toolbar-button:enabled:hover devtools-icon,
    .toolbar-button:enabled:focus devtools-icon {
      color: HighlightText;
    }

    .toolbar-input {
      forced-color-adjust: none;
      background: canvas;
      box-shadow: var(--legacy-focus-ring-inactive-shadow);
    }

    .toolbar-input.focused,
    .toolbar-input:not(.toolbar-input-empty) {
      forced-color-adjust: none;
      background: canvas;
      box-shadow: var(--legacy-focus-ring-active-shadow);
    }

    .toolbar-input:hover {
      box-shadow: var(--legacy-focus-ring-active-shadow);
    }

    devtools-toolbar .devtools-link {
      color: linktext;
    }

    .toolbar-has-dropdown {
      forced-color-adjust: none;
      background: ButtonFace;
      color: ButtonText;
    }
  }
}

@keyframes fade-out {
  from {
    opacity: 100%;
  }

  to {
    opacity: 0%;
  }
}

/* Syntax highlighting */
.webkit-css-property {
  /* See: crbug.com/1152736 for color variable migration. */
  /* stylelint-disable-next-line plugin/use_theme_colors */
  color: var(
    --webkit-css-property-color,
    var(--sys-color-token-property-special)
  );
}

.webkit-html-comment {
  color: var(--sys-color-token-comment);
  word-break: break-all;
}

.webkit-html-tag {
  color: var(--sys-color-token-tag);
}

.webkit-html-tag-name,
.webkit-html-close-tag-name {
  /* Keep this in sync with view-source.css (.webkit-html-tag) */
  color: var(--sys-color-token-tag);
}

.webkit-html-pseudo-element {
  /* This one is non-standard. */
  color: var(--sys-color-token-pseudo-element);
}

.webkit-html-js-node,
.webkit-html-css-node {
  color: var(--text-primary);
  white-space: pre-wrap;
}

.webkit-html-text-node {
  color: var(--text-primary);
  unicode-bidi: -webkit-isolate;
}

.webkit-html-entity-value {
  /* This one is non-standard. */
  /* See: crbug.com/1152736 for color variable migration. */
  /* stylelint-disable-next-line plugin/use_theme_colors */
  background-color: rgb(0 0 0 / 15%);
  unicode-bidi: -webkit-isolate;
}

.webkit-html-doctype {
  /* Keep this in sync with view-source.css (.webkit-html-doctype) */
  color: var(--text-secondary);
  /* See: crbug.com/1152736 for color variable migration. */
}

.webkit-html-attribute-name {
  /* Keep this in sync with view-source.css (.webkit-html-attribute-name) */
  color: var(--sys-color-token-attribute);
  unicode-bidi: -webkit-isolate;
}

.webkit-html-attribute-value {
  /* Keep this in sync with view-source.css (.webkit-html-attribute-value) */
  color: var(--sys-color-token-attribute-value);
  unicode-bidi: -webkit-isolate;
  word-break: break-all;
}

.devtools-link {
  color: var(--text-link);
  text-decoration: underline;
  outline-offset: 2px;

  .elements-disclosure & {
    color: var(--text-link);
  }

  devtools-icon {
    vertical-align: baseline;
    color: var(--sys-color-primary);
  }

  :focus .selected & devtools-icon {
    color: var(--sys-color-tonal-container);
  }

  &:focus-visible {
    outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
    outline-offset: 0;
    border-radius: var(--sys-shape-corner-extra-small);
  }

  &.invalid-link {
    color: var(--text-disabled);
    text-decoration: none;
  }

  &:not(.devtools-link-prevent-click, .invalid-link) {
    cursor: pointer;
  }

  @media (forced-colors: active) {
    &:not(.devtools-link-prevent-click) {
      forced-color-adjust: none;
      color: linktext;
    }

    &:focus-visible {
      background: Highlight;
      color: HighlightText;
    }
  }
}

/*# sourceURL=${import.meta.resolve("./inspectorCommon.css")} */`;

// gen/front_end/ui/legacy/smallBubble.css.js
var smallBubble_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

div {
  display: inline-flex;
  height: 14px;
  align-items: center;
  vertical-align: middle;
  white-space: nowrap;
  padding: 1px 4px;
  text-align: left;
  font-size: 11px;
  line-height: normal;
  font-weight: bold;
  text-shadow: none;
  /*
   * We need an "inverted" color here - because the text is on a darker background the regular foreground text colors don't work. It's been logged to the dark mode tracking spreadsheet
   */
  color: var(--sys-color-inverse-on-surface);
  border-radius: 7px;
}

div.verbose {
  background-color: var(--sys-color-token-attribute-value);
}

:host-context(.theme-with-dark-background) div.verbose {
  /* --sys-color-token-attribute-value isn't blue in dark mode, but the text that gets logged is,
  so we use a different syntax in dark mode that matches the text. Once the text
  colors have been updated we can remove this. */
  background-color: var(--sys-color-token-tag);
}

div.info {
  background-color: var(--sys-color-token-meta);
}

div.warning {
  background-color: var(--sys-color-token-attribute);
}

:host-context(.theme-with-dark-background) div.warning {
  /* Pick a color that's closer to the color shown on the background of the
  entire message */
  background-color: var(--sys-color-token-attribute-value);
}

div.error {
  background-color: var(--sys-color-error-bright);
}

/*# sourceURL=${import.meta.resolve("./smallBubble.css")} */`;

// gen/front_end/ui/legacy/UIUtils.js
var { Directives: Directives2, render: render2 } = Lit2;
var UIStrings11 = {
  /**
   * @description label to open link externally
   */
  openInNewTab: "Open in new tab",
  /**
   * @description label to copy link address
   */
  copyLinkAddress: "Copy link address",
  /**
   * @description label to copy file name
   */
  copyFileName: "Copy file name",
  /**
   * @description label for the profiler control button
   */
  anotherProfilerIsAlreadyActive: "Another profiler is already active",
  /**
   * @description Text in UIUtils
   */
  promiseResolvedAsync: "Promise resolved (async)",
  /**
   * @description Text in UIUtils
   */
  promiseRejectedAsync: "Promise rejected (async)",
  /**
   * @description Text for the title of asynchronous function calls group in Call Stack
   */
  asyncCall: "Async Call",
  /**
   * @description Text for the name of anonymous functions
   */
  anonymous: "(anonymous)",
  /**
   * @description Text to close something
   */
  close: "Close",
  /**
   * @description Text on a button for message dialog
   */
  ok: "OK",
  /**
   * @description Text to cancel something
   */
  cancel: "Cancel",
  /**
   * @description Text for the new badge appearing next to some menu items
   */
  new: "NEW"
};
var str_11 = i18n21.i18n.registerUIStrings("ui/legacy/UIUtils.ts", UIStrings11);
var i18nString11 = i18n21.i18n.getLocalizedString.bind(void 0, str_11);
var highlightedSearchResultClassName = "highlighted-search-result";
var highlightedCurrentSearchResultClassName = "current-search-result";
function installDragHandle(element, elementDragStart2, elementDrag, elementDragEnd, cursor, hoverCursor, startDelay, mouseDownPreventDefault = true) {
  function onMouseDown(event) {
    const dragHandler = new DragHandler();
    const dragStart = () => dragHandler.elementDragStart(element, elementDragStart2, elementDrag, elementDragEnd, cursor, event, mouseDownPreventDefault);
    if (startDelay) {
      startTimer = window.setTimeout(dragStart, startDelay);
    } else {
      dragStart();
    }
  }
  function onMouseUp() {
    if (startTimer) {
      window.clearTimeout(startTimer);
    }
    startTimer = null;
  }
  let startTimer;
  element.addEventListener("pointerdown", onMouseDown, false);
  if (startDelay) {
    element.addEventListener("pointerup", onMouseUp, false);
  }
  if (hoverCursor !== null) {
    element.style.cursor = hoverCursor || cursor || "";
  }
}
function elementDragStart(targetElement, elementDragStart2, elementDrag, elementDragEnd, cursor, event) {
  const dragHandler = new DragHandler();
  dragHandler.elementDragStart(targetElement, elementDragStart2, elementDrag, elementDragEnd, cursor, event);
}
var DragHandler = class _DragHandler {
  glassPaneInUse;
  elementDraggingEventListener;
  elementEndDraggingEventListener;
  dragEventsTargetDocument;
  dragEventsTargetDocumentTop;
  restoreCursorAfterDrag;
  constructor() {
    this.elementDragMove = this.elementDragMove.bind(this);
    this.elementDragEnd = this.elementDragEnd.bind(this);
    this.mouseOutWhileDragging = this.mouseOutWhileDragging.bind(this);
  }
  createGlassPane() {
    this.glassPaneInUse = true;
    if (!_DragHandler.glassPaneUsageCount++) {
      _DragHandler.glassPane = new GlassPane();
      _DragHandler.glassPane.setPointerEventsBehavior(
        "BlockedByGlassPane"
        /* PointerEventsBehavior.BLOCKED_BY_GLASS_PANE */
      );
      if (_DragHandler.documentForMouseOut) {
        _DragHandler.glassPane.show(_DragHandler.documentForMouseOut);
      }
    }
  }
  disposeGlassPane() {
    if (!this.glassPaneInUse) {
      return;
    }
    this.glassPaneInUse = false;
    if (--_DragHandler.glassPaneUsageCount) {
      return;
    }
    if (_DragHandler.glassPane) {
      _DragHandler.glassPane.hide();
      _DragHandler.glassPane = null;
    }
    _DragHandler.documentForMouseOut = null;
    _DragHandler.rootForMouseOut = null;
  }
  elementDragStart(targetElement, elementDragStart2, elementDrag, elementDragEnd, cursor, ev, preventDefault = true) {
    const event = ev;
    if (event.button || Host7.Platform.isMac() && event.ctrlKey) {
      return;
    }
    if (this.elementDraggingEventListener) {
      return;
    }
    if (elementDragStart2 && !elementDragStart2(event)) {
      return;
    }
    const targetDocument = event.target instanceof Node && event.target.ownerDocument;
    this.elementDraggingEventListener = elementDrag;
    this.elementEndDraggingEventListener = elementDragEnd;
    console.assert((_DragHandler.documentForMouseOut || targetDocument) === targetDocument, "Dragging on multiple documents.");
    _DragHandler.documentForMouseOut = targetDocument;
    _DragHandler.rootForMouseOut = event.target instanceof Node && event.target.getRootNode() || null;
    this.dragEventsTargetDocument = targetDocument;
    try {
      if (targetDocument.defaultView && targetDocument.defaultView.top) {
        this.dragEventsTargetDocumentTop = targetDocument.defaultView.top.document;
      }
    } catch {
      this.dragEventsTargetDocumentTop = this.dragEventsTargetDocument;
    }
    targetDocument.addEventListener("pointermove", this.elementDragMove, true);
    targetDocument.addEventListener("pointerup", this.elementDragEnd, true);
    _DragHandler.rootForMouseOut?.addEventListener("pointerout", this.mouseOutWhileDragging, { capture: true });
    if (this.dragEventsTargetDocumentTop && targetDocument !== this.dragEventsTargetDocumentTop) {
      this.dragEventsTargetDocumentTop.addEventListener("pointerup", this.elementDragEnd, true);
    }
    const targetHtmlElement = targetElement;
    if (typeof cursor === "string") {
      this.restoreCursorAfterDrag = restoreCursor.bind(this, targetHtmlElement.style.cursor);
      targetHtmlElement.style.cursor = cursor;
      targetDocument.body.style.cursor = cursor;
    }
    function restoreCursor(oldCursor) {
      targetDocument.body.style.removeProperty("cursor");
      targetHtmlElement.style.cursor = oldCursor;
      this.restoreCursorAfterDrag = void 0;
    }
    if (preventDefault) {
      event.preventDefault();
    }
  }
  mouseOutWhileDragging() {
    this.unregisterMouseOutWhileDragging();
    this.createGlassPane();
  }
  unregisterMouseOutWhileDragging() {
    if (!_DragHandler.rootForMouseOut) {
      return;
    }
    _DragHandler.rootForMouseOut.removeEventListener("pointerout", this.mouseOutWhileDragging, { capture: true });
  }
  unregisterDragEvents() {
    if (!this.dragEventsTargetDocument) {
      return;
    }
    this.dragEventsTargetDocument.removeEventListener("pointermove", this.elementDragMove, true);
    this.dragEventsTargetDocument.removeEventListener("pointerup", this.elementDragEnd, true);
    if (this.dragEventsTargetDocumentTop && this.dragEventsTargetDocument !== this.dragEventsTargetDocumentTop) {
      this.dragEventsTargetDocumentTop.removeEventListener("pointerup", this.elementDragEnd, true);
    }
    delete this.dragEventsTargetDocument;
    delete this.dragEventsTargetDocumentTop;
  }
  elementDragMove(event) {
    if (event.buttons !== 1) {
      this.elementDragEnd(event);
      return;
    }
    if (this.elementDraggingEventListener?.(event)) {
      this.cancelDragEvents(event);
    }
  }
  cancelDragEvents(_event) {
    this.unregisterDragEvents();
    this.unregisterMouseOutWhileDragging();
    if (this.restoreCursorAfterDrag) {
      this.restoreCursorAfterDrag();
    }
    this.disposeGlassPane();
    delete this.elementDraggingEventListener;
    delete this.elementEndDraggingEventListener;
  }
  elementDragEnd(event) {
    const elementDragEnd = this.elementEndDraggingEventListener;
    this.cancelDragEvents(event);
    event.preventDefault();
    if (elementDragEnd) {
      elementDragEnd(event);
    }
  }
  static glassPaneUsageCount = 0;
  static glassPane = null;
  static documentForMouseOut = null;
  static rootForMouseOut = null;
};
function isBeingEdited(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  const element = node;
  if (element.classList.contains("text-prompt") || element.nodeName === "INPUT" || element.nodeName === "TEXTAREA") {
    return true;
  }
  if (!elementsBeingEdited.size) {
    return false;
  }
  let currentElement = element;
  while (currentElement) {
    if (elementsBeingEdited.has(element)) {
      return true;
    }
    currentElement = currentElement.parentElementOrShadowHost();
  }
  return false;
}
function isEditing() {
  if (elementsBeingEdited.size) {
    return true;
  }
  const focused = deepActiveElement(document);
  if (!focused) {
    return false;
  }
  return focused.classList.contains("text-prompt") || focused.nodeName === "INPUT" || focused.nodeName === "TEXTAREA" || (focused.contentEditable === "true" || focused.contentEditable === "plaintext-only");
}
function markBeingEdited(element, value) {
  if (value) {
    if (elementsBeingEdited.has(element)) {
      return false;
    }
    element.classList.add("being-edited");
    elementsBeingEdited.add(element);
  } else {
    if (!elementsBeingEdited.has(element)) {
      return false;
    }
    element.classList.remove("being-edited");
    elementsBeingEdited.delete(element);
  }
  return true;
}
var elementsBeingEdited = /* @__PURE__ */ new Set();
var numberRegex = /^(-?(?:\d+(?:\.\d+)?|\.\d+))$/;
var StyleValueDelimiters = ` \xA0	
"':;,/()`;
function getValueModificationDirection(event) {
  let direction = null;
  if (event instanceof WheelEvent) {
    if (event.deltaY < 0 || event.deltaX < 0) {
      direction = "Up";
    } else if (event.deltaY > 0 || event.deltaX > 0) {
      direction = "Down";
    }
  } else if (event instanceof MouseEvent) {
    if (event.movementX < 0) {
      direction = "Down";
    } else if (event.movementX > 0) {
      direction = "Up";
    }
  } else if (event instanceof KeyboardEvent) {
    if (event.key === "ArrowUp" || event.key === "PageUp") {
      direction = "Up";
    } else if (event.key === "ArrowDown" || event.key === "PageDown") {
      direction = "Down";
    }
  }
  return direction;
}
function modifiedHexValue(hexString, event) {
  const direction = getValueModificationDirection(event);
  if (!direction) {
    return null;
  }
  const mouseEvent = event;
  const number = parseInt(hexString, 16);
  if (isNaN(number) || !isFinite(number)) {
    return null;
  }
  const hexStrLen = hexString.length;
  const channelLen = hexStrLen / 3;
  if (channelLen !== 1 && channelLen !== 2) {
    return null;
  }
  let delta = 0;
  if (KeyboardShortcut.eventHasCtrlEquivalentKey(mouseEvent)) {
    delta += Math.pow(16, channelLen * 2);
  }
  if (mouseEvent.shiftKey) {
    delta += Math.pow(16, channelLen);
  }
  if (mouseEvent.altKey) {
    delta += 1;
  }
  if (delta === 0) {
    delta = 1;
  }
  if (direction === "Down") {
    delta *= -1;
  }
  const maxValue = Math.pow(16, hexStrLen) - 1;
  const result = Platform15.NumberUtilities.clamp(number + delta, 0, maxValue);
  let resultString = result.toString(16).toUpperCase();
  for (let i = 0, lengthDelta = hexStrLen - resultString.length; i < lengthDelta; ++i) {
    resultString = "0" + resultString;
  }
  return resultString;
}
function modifiedFloatNumber(number, event, modifierMultiplier, range) {
  const direction = getValueModificationDirection(event);
  if (!direction) {
    return null;
  }
  const mouseEvent = event;
  let delta = mouseEvent.type === "mousemove" ? Math.abs(mouseEvent.movementX) : 1;
  if (KeyboardShortcut.eventHasCtrlEquivalentKey(mouseEvent)) {
    delta *= 100;
  } else if (mouseEvent.shiftKey) {
    delta *= 10;
  } else if (mouseEvent.altKey) {
    delta *= 0.1;
  }
  if (direction === "Down") {
    delta *= -1;
  }
  if (modifierMultiplier) {
    delta *= modifierMultiplier;
  }
  let result = Number((number + delta).toFixed(6));
  if (range?.min !== void 0) {
    result = Math.max(result, range.min);
  }
  if (range?.max !== void 0) {
    result = Math.min(result, range.max);
  }
  if (!String(result).match(numberRegex)) {
    return null;
  }
  return result;
}
function createReplacementString(wordString, event, customNumberHandler, stepping) {
  let prefix;
  let suffix;
  let number;
  let replacementString = null;
  let matches = /(.*#)([\da-fA-F]+)(.*)/.exec(wordString);
  if (matches?.length) {
    prefix = matches[1];
    suffix = matches[3];
    number = modifiedHexValue(matches[2], event);
    if (number !== null) {
      replacementString = prefix + number + suffix;
    }
  } else {
    matches = /(.*?)(-?(?:\d+(?:\.\d+)?|\.\d+))(.*)/.exec(wordString);
    if (matches?.length) {
      prefix = matches[1];
      suffix = matches[3];
      number = modifiedFloatNumber(parseFloat(matches[2]), event, stepping?.step, stepping?.range);
      if (number !== null) {
        replacementString = customNumberHandler ? customNumberHandler(prefix, number, suffix) : prefix + number + suffix;
      }
    }
  }
  return replacementString;
}
function isElementValueModification(event) {
  if (event instanceof MouseEvent) {
    const { type } = event;
    return type === "mousemove" || type === "wheel";
  }
  if (event instanceof KeyboardEvent) {
    const { key } = event;
    return key === "ArrowUp" || key === "ArrowDown" || key === "PageUp" || key === "PageDown";
  }
  return false;
}
function handleElementValueModifications(event, element, finishHandler, suggestionHandler, customNumberHandler) {
  if (!isElementValueModification(event)) {
    return false;
  }
  void VisualLogging14.logKeyDown(event.currentTarget, event, "element-value-modification");
  const selection = element.getComponentSelection();
  if (!selection?.rangeCount) {
    return false;
  }
  const selectionRange = selection.getRangeAt(0);
  if (!selectionRange.commonAncestorContainer.isSelfOrDescendant(element)) {
    return false;
  }
  const originalValue = element.textContent;
  const wordRange = rangeOfWord(selectionRange.startContainer, selectionRange.startOffset, StyleValueDelimiters, element);
  const wordString = wordRange.toString();
  if (suggestionHandler?.(wordString)) {
    return false;
  }
  const replacementString = createReplacementString(wordString, event, customNumberHandler);
  if (replacementString) {
    const replacementTextNode = document.createTextNode(replacementString);
    wordRange.deleteContents();
    wordRange.insertNode(replacementTextNode);
    const finalSelectionRange = document.createRange();
    finalSelectionRange.setStart(replacementTextNode, 0);
    finalSelectionRange.setEnd(replacementTextNode, replacementString.length);
    selection.removeAllRanges();
    selection.addRange(finalSelectionRange);
    event.handled = true;
    event.preventDefault();
    if (finishHandler) {
      finishHandler(originalValue || "", replacementString);
    }
    return true;
  }
  return false;
}
function openLinkExternallyLabel() {
  return i18nString11(UIStrings11.openInNewTab);
}
function copyLinkAddressLabel() {
  return i18nString11(UIStrings11.copyLinkAddress);
}
function copyFileNameLabel() {
  return i18nString11(UIStrings11.copyFileName);
}
function anotherProfilerActiveLabel() {
  return i18nString11(UIStrings11.anotherProfilerIsAlreadyActive);
}
function asyncStackTraceLabel(description, previousCallFrames) {
  if (description) {
    if (description === "Promise.resolve") {
      return i18nString11(UIStrings11.promiseResolvedAsync);
    }
    if (description === "Promise.reject") {
      return i18nString11(UIStrings11.promiseRejectedAsync);
    }
    if (description === "await" && previousCallFrames.length !== 0) {
      const lastPreviousFrame = previousCallFrames[previousCallFrames.length - 1];
      const lastPreviousFrameName = beautifyFunctionName(lastPreviousFrame.functionName);
      description = `await in ${lastPreviousFrameName}`;
    }
    return description;
  }
  return i18nString11(UIStrings11.asyncCall);
}
function addPlatformClass(element) {
  element.classList.add("platform-" + Host7.Platform.platform());
}
function installComponentRootStyles(element) {
  appendStyle(element, inspectorCommon_css_default);
  appendStyle(element, Buttons6.textButtonStyles);
  if (!Host7.Platform.isMac() && measuredScrollbarWidth(element.ownerDocument) === 0) {
    element.classList.add("overlay-scrollbar-enabled");
  }
}
function windowFocused(document2, event) {
  if (event.target instanceof Window && event.target.document.nodeType === Node.DOCUMENT_NODE) {
    document2.body.classList.remove("inactive");
  }
}
function windowBlurred(document2, event) {
  if (event.target instanceof Window && event.target.document.nodeType === Node.DOCUMENT_NODE) {
    document2.body.classList.add("inactive");
  }
}
var ElementFocusRestorer = class {
  element;
  previous;
  constructor(element) {
    this.element = element;
    this.previous = deepActiveElement(element.ownerDocument);
    element.focus();
  }
  restore() {
    if (!this.element) {
      return;
    }
    if (this.element.hasFocus() && this.previous) {
      this.previous.focus();
    }
    this.previous = null;
    this.element = null;
  }
};
function highlightSearchResult(element, offset, length, domChanges) {
  const result = highlightSearchResults(element, [new TextUtils2.TextRange.SourceRange(offset, length)], domChanges);
  return result.length ? result[0] : null;
}
function highlightSearchResults(element, resultRanges, changes) {
  return highlightRangesWithStyleClass(element, resultRanges, highlightedSearchResultClassName, changes);
}
function runCSSAnimationOnce(element, className) {
  function animationEndCallback() {
    element.classList.remove(className);
    element.removeEventListener("webkitAnimationEnd", animationEndCallback, false);
    element.removeEventListener("animationcancel", animationEndCallback, false);
  }
  if (element.classList.contains(className)) {
    element.classList.remove(className);
  }
  element.addEventListener("webkitAnimationEnd", animationEndCallback, false);
  element.addEventListener("animationcancel", animationEndCallback, false);
  element.classList.add(className);
}
function highlightRangesWithStyleClass(element, resultRanges, styleClass, changes) {
  changes = changes || [];
  const highlightNodes = [];
  const textNodes = element.childTextNodes();
  const lineText = textNodes.map(function(node) {
    return node.textContent;
  }).join("");
  const ownerDocument = element.ownerDocument;
  if (textNodes.length === 0) {
    return highlightNodes;
  }
  const nodeRanges = [];
  let rangeEndOffset = 0;
  for (const textNode of textNodes) {
    const range = new TextUtils2.TextRange.SourceRange(rangeEndOffset, textNode.textContent ? textNode.textContent.length : 0);
    rangeEndOffset = range.offset + range.length;
    nodeRanges.push(range);
  }
  let startIndex = 0;
  for (let i = 0; i < resultRanges.length; ++i) {
    const startOffset = resultRanges[i].offset;
    const endOffset = startOffset + resultRanges[i].length;
    while (startIndex < textNodes.length && nodeRanges[startIndex].offset + nodeRanges[startIndex].length <= startOffset) {
      startIndex++;
    }
    let endIndex = startIndex;
    while (endIndex < textNodes.length && nodeRanges[endIndex].offset + nodeRanges[endIndex].length < endOffset) {
      endIndex++;
    }
    if (endIndex === textNodes.length) {
      break;
    }
    const highlightNode = ownerDocument.createElement("span");
    highlightNode.className = styleClass;
    highlightNode.textContent = lineText.substring(startOffset, endOffset);
    const lastTextNode = textNodes[endIndex];
    const lastText = lastTextNode.textContent || "";
    lastTextNode.textContent = lastText.substring(endOffset - nodeRanges[endIndex].offset);
    changes.push({
      node: lastTextNode,
      type: "changed",
      oldText: lastText,
      newText: lastTextNode.textContent,
      nextSibling: void 0,
      parent: void 0
    });
    if (startIndex === endIndex && lastTextNode.parentElement) {
      lastTextNode.parentElement.insertBefore(highlightNode, lastTextNode);
      changes.push({
        node: highlightNode,
        type: "added",
        nextSibling: lastTextNode,
        parent: lastTextNode.parentElement,
        oldText: void 0,
        newText: void 0
      });
      highlightNodes.push(highlightNode);
      const prefixNode = ownerDocument.createTextNode(lastText.substring(0, startOffset - nodeRanges[startIndex].offset));
      lastTextNode.parentElement.insertBefore(prefixNode, highlightNode);
      changes.push({
        node: prefixNode,
        type: "added",
        nextSibling: highlightNode,
        parent: lastTextNode.parentElement,
        oldText: void 0,
        newText: void 0
      });
    } else {
      const firstTextNode = textNodes[startIndex];
      const firstText = firstTextNode.textContent || "";
      const anchorElement = firstTextNode.nextSibling;
      if (firstTextNode.parentElement) {
        firstTextNode.parentElement.insertBefore(highlightNode, anchorElement);
        changes.push({
          node: highlightNode,
          type: "added",
          nextSibling: anchorElement || void 0,
          parent: firstTextNode.parentElement,
          oldText: void 0,
          newText: void 0
        });
        highlightNodes.push(highlightNode);
      }
      firstTextNode.textContent = firstText.substring(0, startOffset - nodeRanges[startIndex].offset);
      changes.push({
        node: firstTextNode,
        type: "changed",
        oldText: firstText,
        newText: firstTextNode.textContent,
        nextSibling: void 0,
        parent: void 0
      });
      for (let j = startIndex + 1; j < endIndex; j++) {
        const textNode = textNodes[j];
        const text = textNode.textContent;
        textNode.textContent = "";
        changes.push({
          node: textNode,
          type: "changed",
          oldText: text || void 0,
          newText: textNode.textContent,
          nextSibling: void 0,
          parent: void 0
        });
      }
    }
    startIndex = endIndex;
    nodeRanges[startIndex].offset = endOffset;
    nodeRanges[startIndex].length = lastTextNode.textContent.length;
  }
  return highlightNodes;
}
function applyDomChanges(domChanges) {
  for (let i = 0, size = domChanges.length; i < size; ++i) {
    const entry = domChanges[i];
    switch (entry.type) {
      case "added":
        entry.parent?.insertBefore(entry.node, entry.nextSibling ?? null);
        break;
      case "changed":
        entry.node.textContent = entry.newText ?? null;
        break;
    }
  }
}
function revertDomChanges(domChanges) {
  for (let i = domChanges.length - 1; i >= 0; --i) {
    const entry = domChanges[i];
    switch (entry.type) {
      case "added":
        entry.node.remove();
        break;
      case "changed":
        entry.node.textContent = entry.oldText ?? null;
        break;
    }
  }
}
function measurePreferredSize(element, containerElement) {
  const oldParent = element.parentElement;
  const oldNextSibling = element.nextSibling;
  containerElement = containerElement || element.ownerDocument.body;
  containerElement.appendChild(element);
  element.positionAt(0, 0);
  const result = element.getBoundingClientRect();
  element.positionAt(void 0, void 0);
  if (oldParent) {
    oldParent.insertBefore(element, oldNextSibling);
  } else {
    element.remove();
  }
  return new Geometry5.Size(result.width, result.height);
}
var InvokeOnceHandlers = class {
  handlers;
  autoInvoke;
  constructor(autoInvoke) {
    this.handlers = null;
    this.autoInvoke = autoInvoke;
  }
  add(object, method) {
    if (!this.handlers) {
      this.handlers = /* @__PURE__ */ new Map();
      if (this.autoInvoke) {
        this.scheduleInvoke();
      }
    }
    let methods = this.handlers.get(object);
    if (!methods) {
      methods = /* @__PURE__ */ new Set();
      this.handlers.set(object, methods);
    }
    methods.add(method);
  }
  scheduleInvoke() {
    if (this.handlers) {
      requestAnimationFrame(this.invoke.bind(this));
    }
  }
  invoke() {
    const handlers = this.handlers;
    this.handlers = null;
    if (handlers) {
      for (const [object, methods] of handlers) {
        for (const method of methods) {
          method.call(object);
        }
      }
    }
  }
};
var coalescingLevel = 0;
var postUpdateHandlers = null;
function startBatchUpdate() {
  if (!coalescingLevel++) {
    postUpdateHandlers = new InvokeOnceHandlers(false);
  }
}
function endBatchUpdate() {
  if (--coalescingLevel) {
    return;
  }
  if (postUpdateHandlers) {
    postUpdateHandlers.scheduleInvoke();
    postUpdateHandlers = null;
  }
}
function animateFunction(window2, func, params, duration, animationComplete) {
  const start = window2.performance.now();
  let raf = window2.requestAnimationFrame(animationStep);
  function animationStep(timestamp) {
    const progress = Platform15.NumberUtilities.clamp((timestamp - start) / duration, 0, 1);
    func(...params.map((p) => p.from + (p.to - p.from) * progress));
    if (progress < 1) {
      raf = window2.requestAnimationFrame(animationStep);
    } else if (animationComplete) {
      animationComplete();
    }
  }
  return () => window2.cancelAnimationFrame(raf);
}
var LongClickController = class _LongClickController {
  element;
  callback;
  editKey;
  longClickData;
  longClickInterval;
  constructor(element, callback, isEditKeyFunc = (event) => Platform15.KeyboardUtilities.isEnterOrSpaceKey(event)) {
    this.element = element;
    this.callback = callback;
    this.editKey = isEditKeyFunc;
    this.enable();
  }
  reset() {
    if (this.longClickInterval) {
      clearInterval(this.longClickInterval);
      delete this.longClickInterval;
    }
  }
  enable() {
    if (this.longClickData) {
      return;
    }
    const boundKeyDown = keyDown.bind(this);
    const boundKeyUp = keyUp.bind(this);
    const boundMouseDown = mouseDown.bind(this);
    const boundMouseUp = mouseUp.bind(this);
    const boundReset = this.reset.bind(this);
    this.element.addEventListener("keydown", boundKeyDown, false);
    this.element.addEventListener("keyup", boundKeyUp, false);
    this.element.addEventListener("pointerdown", boundMouseDown, false);
    this.element.addEventListener("pointerout", boundReset, false);
    this.element.addEventListener("pointerup", boundMouseUp, false);
    this.element.addEventListener("click", boundReset, true);
    this.longClickData = { mouseUp: boundMouseUp, mouseDown: boundMouseDown, reset: boundReset };
    function keyDown(e) {
      if (this.editKey(e)) {
        const callback = this.callback;
        this.longClickInterval = window.setTimeout(callback.bind(null, e), _LongClickController.TIME_MS);
      }
    }
    function keyUp(e) {
      if (this.editKey(e)) {
        this.reset();
      }
    }
    function mouseDown(e) {
      if (e.which !== 1) {
        return;
      }
      const callback = this.callback;
      this.longClickInterval = window.setTimeout(callback.bind(null, e), _LongClickController.TIME_MS);
    }
    function mouseUp(e) {
      if (e.which !== 1) {
        return;
      }
      this.reset();
    }
  }
  dispose() {
    if (!this.longClickData) {
      return;
    }
    this.element.removeEventListener("pointerdown", this.longClickData.mouseDown, false);
    this.element.removeEventListener("pointerout", this.longClickData.reset, false);
    this.element.removeEventListener("pointerup", this.longClickData.mouseUp, false);
    this.element.addEventListener("click", this.longClickData.reset, true);
    delete this.longClickData;
  }
  static TIME_MS = 200;
};
function initializeUIUtils(document2) {
  document2.body.classList.toggle("inactive", !document2.hasFocus());
  if (document2.defaultView) {
    document2.defaultView.addEventListener("focus", windowFocused.bind(void 0, document2), false);
    document2.defaultView.addEventListener("blur", windowBlurred.bind(void 0, document2), false);
  }
  document2.addEventListener("focus", focusChanged.bind(void 0), true);
  const body = document2.body;
  GlassPane.setContainer(body);
}
function beautifyFunctionName(name) {
  return name || i18nString11(UIStrings11.anonymous);
}
var createTextChild = (element, text) => {
  const textNode = element.ownerDocument.createTextNode(text);
  element.appendChild(textNode);
  return textNode;
};
var createTextChildren = (element, ...childrenText) => {
  for (const child of childrenText) {
    createTextChild(element, child);
  }
};
function createTextButton(text, clickHandler, opts) {
  const button = new Buttons6.Button.Button();
  if (opts?.className) {
    button.className = opts.className;
  }
  button.textContent = text;
  button.iconName = opts?.icon;
  button.variant = opts?.variant ? opts.variant : "outlined";
  if (clickHandler) {
    button.addEventListener("click", clickHandler);
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === "Space") {
        event.stopImmediatePropagation();
      }
    });
  }
  if (opts?.jslogContext) {
    button.setAttribute("jslog", `${VisualLogging14.action().track({ click: true }).context(opts.jslogContext)}`);
  }
  if (opts?.title) {
    button.setAttribute("title", opts.title);
  }
  button.type = "button";
  return button;
}
function createInput(className, type, jslogContext) {
  const element = document.createElement("input");
  if (className) {
    element.className = className;
  }
  element.spellcheck = false;
  element.classList.add("harmony-input");
  if (type) {
    element.type = type;
  }
  if (jslogContext) {
    element.setAttribute("jslog", `${VisualLogging14.textField().track({ keydown: "Enter", change: true }).context(jslogContext)}`);
  }
  return element;
}
function createHistoryInput(type = "search", className) {
  const history = [""];
  let historyPosition = 0;
  const historyInput = document.createElement("input");
  historyInput.type = type;
  if (className) {
    historyInput.className = className;
  }
  historyInput.addEventListener("input", onInput, false);
  historyInput.addEventListener("keydown", onKeydown, false);
  return historyInput;
  function onInput(_event) {
    if (history.length === historyPosition + 1) {
      history[historyPosition] = historyInput.value;
    }
  }
  function onKeydown(event) {
    if (event.keyCode === Keys.Up.code) {
      historyPosition = Math.max(historyPosition - 1, 0);
      historyInput.value = history[historyPosition];
      historyInput.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      event.consume(true);
    } else if (event.keyCode === Keys.Down.code) {
      historyPosition = Math.min(historyPosition + 1, history.length - 1);
      historyInput.value = history[historyPosition];
      historyInput.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      event.consume(true);
    } else if (event.keyCode === Keys.Enter.code) {
      if (history.length > 1 && history[history.length - 2] === historyInput.value) {
        return;
      }
      history[history.length - 1] = historyInput.value;
      historyPosition = history.length - 1;
      history.push("");
    }
  }
}
function createSelect(name, options) {
  const select = document.createElement("select");
  setLabel(select, name);
  for (const option of options) {
    if (option instanceof Map) {
      for (const [key, value] of option) {
        const optGroup = select.createChild("optgroup");
        optGroup.label = key;
        for (const child of value) {
          if (typeof child === "string") {
            optGroup.appendChild(createOption(child, child, Platform15.StringUtilities.toKebabCase(child)));
          }
        }
      }
    } else if (typeof option === "string") {
      select.add(createOption(option, option, Platform15.StringUtilities.toKebabCase(option)));
    }
  }
  return select;
}
function createOption(title, value, jslogContext) {
  const result = new Option(title, value || title);
  if (jslogContext) {
    result.setAttribute("jslog", `${VisualLogging14.item(jslogContext).track({ click: true })}`);
  }
  return result;
}
function createLabel(title, className, associatedControl) {
  const element = document.createElement("label");
  if (className) {
    element.className = className;
  }
  element.textContent = title;
  if (associatedControl) {
    bindLabelToControl(element, associatedControl);
  }
  return element;
}
function createIconLabel(options) {
  const element = document.createElement("dt-icon-label");
  if (options.title) {
    element.createChild("span").textContent = options.title;
  }
  element.data = {
    iconName: options.iconName,
    color: options.color ?? "var(--icon-default)",
    width: options.width ?? "14px",
    height: options.height ?? "14px"
  };
  return element;
}
function createRadioButton(name, title, jslogContext) {
  const label = document.createElement("label");
  const radio = label.createChild("input");
  radio.type = "radio";
  radio.name = name;
  radio.setAttribute("jslog", `${VisualLogging14.toggle().track({ change: true }).context(jslogContext)}`);
  createTextChild(label, title);
  return { label, radio };
}
function createSlider(min, max, tabIndex) {
  const element = document.createElement("input");
  element.type = "range";
  element.min = String(min);
  element.max = String(max);
  element.tabIndex = tabIndex;
  return element;
}
function setTitle(element, title) {
  setLabel(element, title);
  Tooltip.install(element, title);
}
var CheckboxLabel = class _CheckboxLabel extends HTMLElement {
  static observedAttributes = ["checked", "disabled", "indeterminate", "name", "title", "aria-label"];
  #shadowRoot;
  #checkboxElement;
  #textElement;
  constructor() {
    super();
    _CheckboxLabel.lastId = _CheckboxLabel.lastId + 1;
    const id2 = "ui-checkbox-label" + _CheckboxLabel.lastId;
    this.#shadowRoot = createShadowRootWithCoreStyles(this, { cssFile: checkboxTextLabel_css_default, delegatesFocus: true });
    this.#checkboxElement = this.#shadowRoot.createChild("input");
    this.#checkboxElement.type = "checkbox";
    this.#checkboxElement.setAttribute("id", id2);
    this.#checkboxElement.addEventListener("change", () => this.dispatchEvent(new Event("change")));
    this.#textElement = this.#shadowRoot.createChild("label", "devtools-checkbox-text");
    this.#textElement.setAttribute("for", id2);
    this.#textElement.addEventListener("click", (e) => e.stopPropagation());
    this.#textElement.createChild("slot");
  }
  static create(title, checked, subtitle, jslogContext, small) {
    const element = document.createElement("devtools-checkbox");
    element.#checkboxElement.checked = Boolean(checked);
    if (jslogContext) {
      element.#checkboxElement.setAttribute("jslog", `${VisualLogging14.toggle().track({ change: true }).context(jslogContext)}`);
    }
    if (title !== void 0) {
      element.#textElement.textContent = title;
      element.#checkboxElement.title = title;
      if (subtitle !== void 0) {
        element.#textElement.createChild("div", "devtools-checkbox-subtitle").textContent = subtitle;
      }
    }
    element.#checkboxElement.classList.toggle("small", small);
    return element;
  }
  attributeChangedCallback(name, _oldValue, newValue) {
    if (name === "checked") {
      this.#checkboxElement.checked = newValue !== null;
    } else if (name === "disabled") {
      this.#checkboxElement.disabled = newValue !== null;
    } else if (name === "indeterminate") {
      this.#checkboxElement.indeterminate = newValue !== null;
    } else if (name === "name") {
      this.#checkboxElement.name = newValue ?? "";
    } else if (name === "title") {
      this.#checkboxElement.title = newValue ?? "";
      this.#textElement.title = newValue ?? "";
    } else if (name === "aria-label") {
      this.#checkboxElement.ariaLabel = newValue;
    }
  }
  getLabelText() {
    return this.#textElement.textContent;
  }
  setLabelText(content) {
    this.#textElement.textContent = content;
  }
  get ariaLabel() {
    return this.#checkboxElement.ariaLabel;
  }
  set ariaLabel(ariaLabel) {
    this.setAttribute("aria-label", ariaLabel);
  }
  get checked() {
    return this.#checkboxElement.checked;
  }
  set checked(checked) {
    this.toggleAttribute("checked", checked);
  }
  set disabled(disabled) {
    this.toggleAttribute("disabled", disabled);
  }
  get disabled() {
    return this.#checkboxElement.disabled;
  }
  set indeterminate(indeterminate) {
    this.toggleAttribute("indeterminate", indeterminate);
  }
  get indeterminate() {
    return this.#checkboxElement.indeterminate;
  }
  set title(title) {
    this.setAttribute("title", title);
  }
  get title() {
    return this.#checkboxElement.title;
  }
  set name(name) {
    this.setAttribute("name", name);
  }
  get name() {
    return this.#checkboxElement.name;
  }
  click() {
    this.#checkboxElement.click();
  }
  /** Only to be used when the checkbox label is 'generated' (a regex, a className, etc). Most checkboxes should be create()'d with UIStrings */
  static createWithStringLiteral(title, checked, jslogContext, small) {
    const stringLiteral = title;
    return _CheckboxLabel.create(stringLiteral, checked, void 0, jslogContext, small);
  }
  static lastId = 0;
};
customElements.define("devtools-checkbox", CheckboxLabel);
var DevToolsIconLabel = class extends HTMLElement {
  #icon;
  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this);
    this.#icon = new IconButton7.Icon.Icon();
    this.#icon.style.setProperty("margin-right", "4px");
    this.#icon.style.setProperty("vertical-align", "baseline");
    root.appendChild(this.#icon);
    root.createChild("slot");
  }
  set data(data) {
    this.#icon.data = data;
    if (data.height === "14px") {
      this.#icon.style.setProperty("margin-bottom", "-2px");
    } else if (data.height === "20px") {
      this.#icon.style.setProperty("margin-bottom", "2px");
    }
  }
};
customElements.define("dt-icon-label", DevToolsIconLabel);
var DevToolsSmallBubble = class extends HTMLElement {
  textElement;
  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this, { cssFile: smallBubble_css_default });
    this.textElement = root.createChild("div");
    this.textElement.className = "info";
    this.textElement.createChild("slot");
  }
  set type(type) {
    this.textElement.className = type;
  }
};
customElements.define("dt-small-bubble", DevToolsSmallBubble);
var DevToolsCloseButton = class extends HTMLElement {
  #button;
  constructor() {
    super();
    const root = createShadowRootWithCoreStyles(this);
    this.#button = new Buttons6.Button.Button();
    this.#button.data = { variant: "icon", iconName: "cross" };
    this.#button.classList.add("close-button");
    this.#button.setAttribute("jslog", `${VisualLogging14.close().track({ click: true })}`);
    Tooltip.install(this.#button, i18nString11(UIStrings11.close));
    setLabel(this.#button, i18nString11(UIStrings11.close));
    root.appendChild(this.#button);
  }
  setAccessibleName(name) {
    setLabel(this.#button, name);
  }
  setSize(size) {
    this.#button.size = size;
  }
  setTabbable(tabbable) {
    if (tabbable) {
      this.#button.tabIndex = 0;
    } else {
      this.#button.tabIndex = -1;
    }
  }
  focus() {
    this.#button.focus();
  }
};
customElements.define("dt-close-button", DevToolsCloseButton);
function bindInput(input, apply, validate, numeric, modifierMultiplier) {
  input.addEventListener("change", onChange, false);
  input.addEventListener("input", onInput, false);
  input.addEventListener("keydown", onKeyDown, false);
  input.addEventListener("focus", input.select.bind(input), false);
  function onInput() {
    input.classList.toggle("error-input", !validate(input.value));
  }
  function onChange() {
    const valid = validate(input.value);
    input.classList.toggle("error-input", !valid);
    if (valid) {
      apply(input.value);
    }
  }
  function onKeyDown(event) {
    if (event.key === "Enter") {
      const valid2 = validate(input.value);
      if (valid2) {
        apply(input.value);
      }
      event.preventDefault();
      return;
    }
    if (!numeric) {
      return;
    }
    const value = modifiedFloatNumber(parseFloat(input.value), event, modifierMultiplier);
    if (value === null) {
      return;
    }
    const stringValue = String(value);
    const valid = validate(stringValue);
    if (valid) {
      setValue(stringValue);
    }
    event.preventDefault();
  }
  function setValue(value) {
    if (value === input.value) {
      return;
    }
    const valid = validate(value);
    input.classList.toggle("error-input", !valid);
    input.value = value;
  }
  return setValue;
}
function trimText(context, text, maxWidth, trimFunction) {
  const maxLength = 200;
  if (maxWidth <= 10) {
    return "";
  }
  if (text.length > maxLength) {
    text = trimFunction(text, maxLength);
  }
  const textWidth = measureTextWidth(context, text);
  if (textWidth <= maxWidth) {
    return text;
  }
  let l = 0;
  let r = text.length;
  let lv = 0;
  let rv = textWidth;
  while (l < r && lv !== rv && lv !== maxWidth) {
    const m = Math.ceil(l + (r - l) * (maxWidth - lv) / (rv - lv));
    const mv = measureTextWidth(context, trimFunction(text, m));
    if (mv <= maxWidth) {
      l = m;
      lv = mv;
    } else {
      r = m - 1;
      rv = mv;
    }
  }
  text = trimFunction(text, l);
  return text !== "\u2026" ? text : "";
}
function trimTextMiddle(context, text, maxWidth) {
  return trimText(context, text, maxWidth, (text2, width) => Platform15.StringUtilities.trimMiddle(text2, width));
}
function trimTextEnd(context, text, maxWidth) {
  return trimText(context, text, maxWidth, (text2, width) => Platform15.StringUtilities.trimEndWithMaxLength(text2, width));
}
function measureTextWidth(context, text) {
  const maxCacheableLength = 200;
  if (text.length > maxCacheableLength) {
    return context.measureText(text).width;
  }
  if (!measureTextWidthCache) {
    measureTextWidthCache = /* @__PURE__ */ new Map();
  }
  const font = context.font;
  let textWidths = measureTextWidthCache.get(font);
  if (!textWidths) {
    textWidths = /* @__PURE__ */ new Map();
    measureTextWidthCache.set(font, textWidths);
  }
  let width = textWidths.get(text);
  if (!width) {
    width = context.measureText(text).width;
    textWidths.set(text, width);
  }
  return width;
}
var measureTextWidthCache = null;
function loadImage(url) {
  return new Promise((fulfill) => {
    const image = new Image();
    image.addEventListener("load", () => fulfill(image));
    image.addEventListener("error", () => fulfill(null));
    image.src = url;
  });
}
function createFileSelectorElement(callback, accept) {
  const fileSelectorElement = document.createElement("input");
  fileSelectorElement.type = "file";
  if (accept) {
    fileSelectorElement.setAttribute("accept", accept);
  }
  fileSelectorElement.style.display = "none";
  fileSelectorElement.tabIndex = -1;
  fileSelectorElement.addEventListener("change", () => {
    if (fileSelectorElement.files?.length) {
      callback(fileSelectorElement.files[0]);
    }
  });
  fileSelectorElement.addEventListener("click", () => {
    fileSelectorElement.value = "";
  });
  return fileSelectorElement;
}
var MaxLengthForDisplayedURLs = 150;
var MessageDialog = class {
  static async show(header, message, where, jslogContext) {
    const dialog3 = new Dialog(jslogContext);
    dialog3.setSizeBehavior(
      "MeasureContent"
      /* SizeBehavior.MEASURE_CONTENT */
    );
    dialog3.setDimmed(true);
    const shadowRoot = createShadowRootWithCoreStyles(dialog3.contentElement, { cssFile: confirmDialog_css_default });
    const content = shadowRoot.createChild("div", "widget");
    await new Promise((resolve) => {
      const okButton = createTextButton(i18nString11(UIStrings11.ok), resolve, {
        jslogContext: "confirm",
        variant: "primary"
        /* Buttons.Button.Variant.PRIMARY */
      });
      content.createChild("span", "header").textContent = header;
      content.createChild("div", "message").createChild("span").textContent = message;
      content.createChild("div", "button").appendChild(okButton);
      dialog3.setOutsideClickCallback((event) => {
        event.consume();
        resolve(void 0);
      });
      dialog3.show(where);
      okButton.focus();
    });
    dialog3.hide();
  }
};
var ConfirmDialog = class {
  static async show(message, header, where, options) {
    const dialog3 = new Dialog(options?.jslogContext);
    dialog3.setSizeBehavior(
      "MeasureContent"
      /* SizeBehavior.MEASURE_CONTENT */
    );
    dialog3.setDimmed(true);
    setLabel(dialog3.contentElement, message);
    const shadowRoot = createShadowRootWithCoreStyles(dialog3.contentElement, { cssFile: confirmDialog_css_default });
    const content = shadowRoot.createChild("div", "widget");
    if (header) {
      content.createChild("span", "header").textContent = header;
    }
    content.createChild("div", "message").createChild("span").textContent = message;
    const buttonsBar = content.createChild("div", "button");
    const result = await new Promise((resolve) => {
      const okButton = createTextButton(
        /* text= */
        options?.okButtonLabel || i18nString11(UIStrings11.ok),
        /* clickHandler= */
        () => resolve(true),
        {
          jslogContext: "confirm",
          variant: "primary"
          /* Buttons.Button.Variant.PRIMARY */
        }
      );
      buttonsBar.appendChild(okButton);
      buttonsBar.appendChild(createTextButton(options?.cancelButtonLabel || i18nString11(UIStrings11.cancel), () => resolve(false), { jslogContext: "cancel" }));
      dialog3.setOutsideClickCallback((event) => {
        event.consume();
        resolve(false);
      });
      dialog3.show(where);
      okButton.focus();
    });
    dialog3.hide();
    return result;
  }
};
var Renderer = class {
  static async render(object, options) {
    if (!object) {
      throw new Error("Can't render " + object);
    }
    const extension = getApplicableRegisteredRenderers(object)[0];
    if (!extension) {
      return null;
    }
    const renderer = await extension.loadRenderer();
    return await renderer.render(object, options);
  }
};
function formatTimestamp(timestamp, full) {
  const date = new Date(timestamp);
  const yymmdd = date.getFullYear() + "-" + leadZero(date.getMonth() + 1, 2) + "-" + leadZero(date.getDate(), 2);
  const hhmmssfff = leadZero(date.getHours(), 2) + ":" + leadZero(date.getMinutes(), 2) + ":" + leadZero(date.getSeconds(), 2) + "." + leadZero(date.getMilliseconds(), 3);
  return full ? yymmdd + " " + hhmmssfff : hhmmssfff;
  function leadZero(value, length) {
    const valueString = String(value);
    return valueString.padStart(length, "0");
  }
}
var isScrolledToBottom = (element) => {
  return Math.abs(element.scrollTop + element.clientHeight - element.scrollHeight) <= 2;
};
function createSVGChild(element, childType, className) {
  const child = element.ownerDocument.createElementNS("http://www.w3.org/2000/svg", childType);
  if (className) {
    child.setAttribute("class", className);
  }
  element.appendChild(child);
  return child;
}
var enclosingNodeOrSelfWithNodeNameInArray = (initialNode, nameArray) => {
  let node = initialNode;
  for (; node && node !== initialNode.ownerDocument; node = node.parentNodeOrShadowHost()) {
    for (let i = 0; i < nameArray.length; ++i) {
      if (node.nodeName.toLowerCase() === nameArray[i].toLowerCase()) {
        return node;
      }
    }
  }
  return null;
};
var enclosingNodeOrSelfWithNodeName = function(node, nodeName) {
  return enclosingNodeOrSelfWithNodeNameInArray(node, [nodeName]);
};
var deepElementFromPoint = (document2, x, y) => {
  let container = document2;
  let node = null;
  while (container) {
    const innerNode = container.elementFromPoint(x, y);
    if (!innerNode || node === innerNode) {
      break;
    }
    node = innerNode;
    container = node.shadowRoot;
  }
  return node;
};
var deepElementFromEvent = (ev) => {
  const event = ev;
  if (!event.which && !event.pageX && !event.pageY && !event.clientX && !event.clientY && !event.movementX && !event.movementY) {
    return null;
  }
  const root = event.target && event.target.getComponentRoot();
  return root ? deepElementFromPoint(root, event.pageX, event.pageY) : null;
};
var registeredRenderers = [];
function registerRenderer(registration) {
  registeredRenderers.push(registration);
}
function getApplicableRegisteredRenderers(object) {
  return registeredRenderers.filter(isRendererApplicableToContextTypes);
  function isRendererApplicableToContextTypes(rendererRegistration) {
    if (!rendererRegistration.contextTypes) {
      return true;
    }
    for (const contextType of rendererRegistration.contextTypes()) {
      if (object instanceof contextType) {
        return true;
      }
    }
    return false;
  }
}
function updateWidgetfocusWidgetForNode(node) {
  while (node) {
    if (Widget.get(node)) {
      break;
    }
    node = node.parentNodeOrShadowHost();
  }
  if (!node) {
    return;
  }
  let widget = Widget.get(node);
  while (widget?.parentWidget()) {
    const parentWidget = widget.parentWidget();
    if (!parentWidget) {
      break;
    }
    parentWidget.setDefaultFocusedChild(widget);
    widget = parentWidget;
  }
}
function focusChanged(event) {
  const target = event.target;
  const document2 = target ? target.ownerDocument : null;
  const element = document2 ? deepActiveElement(document2) : null;
  updateWidgetfocusWidgetForNode(element);
}
function createShadowRootWithCoreStyles(element, options = {
  delegatesFocus: void 0,
  cssFile: void 0
}) {
  const { cssFile, delegatesFocus } = options;
  const shadowRoot = element.attachShadow({ mode: "open", delegatesFocus });
  appendStyle(shadowRoot, inspectorCommon_css_default, Buttons6.textButtonStyles);
  if (Array.isArray(cssFile)) {
    appendStyle(shadowRoot, ...cssFile);
  } else if (cssFile) {
    appendStyle(shadowRoot, cssFile);
  }
  shadowRoot.addEventListener("focus", focusChanged, true);
  return shadowRoot;
}
var cachedMeasuredScrollbarWidth;
function resetMeasuredScrollbarWidthForTest() {
  cachedMeasuredScrollbarWidth = void 0;
}
function measuredScrollbarWidth(document2) {
  if (typeof cachedMeasuredScrollbarWidth === "number") {
    return cachedMeasuredScrollbarWidth;
  }
  if (!document2) {
    return 16;
  }
  const scrollDiv = document2.createElement("div");
  const innerDiv = document2.createElement("div");
  scrollDiv.setAttribute("style", "display: block; width: 100px; height: 100px; overflow: scroll;");
  innerDiv.setAttribute("style", "height: 200px");
  scrollDiv.appendChild(innerDiv);
  document2.body.appendChild(scrollDiv);
  cachedMeasuredScrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
  document2.body.removeChild(scrollDiv);
  return cachedMeasuredScrollbarWidth;
}
var MAX_DISPLAY_COUNT = 10;
var MAX_DURATION = 60 * 24 * 60 * 60 * 1e3;
var MAX_INTERACTION_COUNT = 2;
var PromotionManager = class _PromotionManager {
  static #instance;
  static instance() {
    if (!_PromotionManager.#instance) {
      _PromotionManager.#instance = new _PromotionManager();
    }
    return _PromotionManager.#instance;
  }
  getPromotionDisplayState(id2) {
    const displayStateString = localStorage.getItem(id2);
    return displayStateString ? JSON.parse(displayStateString) : null;
  }
  setPromotionDisplayState(id2, promotionDisplayState) {
    localStorage.setItem(id2, JSON.stringify(promotionDisplayState));
  }
  registerPromotion(id2) {
    this.setPromotionDisplayState(id2, {
      displayCount: 0,
      firstRegistered: Date.now(),
      featureInteractionCount: 0
    });
  }
  recordPromotionShown(id2) {
    const displayState = this.getPromotionDisplayState(id2);
    if (!displayState) {
      throw new Error(`Cannot record promotion shown for unregistered promotion ${id2}`);
    }
    this.setPromotionDisplayState(id2, {
      ...displayState,
      displayCount: displayState.displayCount + 1
    });
  }
  canShowPromotion(id2) {
    const displayState = this.getPromotionDisplayState(id2);
    if (!displayState) {
      this.registerPromotion(id2);
      return true;
    }
    return displayState.displayCount < MAX_DISPLAY_COUNT && Date.now() - displayState.firstRegistered < MAX_DURATION && displayState.featureInteractionCount < MAX_INTERACTION_COUNT;
  }
  recordFeatureInteraction(id2) {
    const displayState = this.getPromotionDisplayState(id2);
    if (!displayState) {
      throw new Error(`Cannot record feature interaction for unregistered promotion ${id2}`);
    }
    this.setPromotionDisplayState(id2, {
      ...displayState,
      featureInteractionCount: displayState.featureInteractionCount + 1
    });
  }
  maybeShowPromotion(id2) {
    if (this.canShowPromotion(id2)) {
      this.recordPromotionShown(id2);
      return true;
    }
    return false;
  }
};
function maybeCreateNewBadge(promotionId) {
  const promotionManager = PromotionManager.instance();
  if (promotionManager.maybeShowPromotion(promotionId)) {
    const badge2 = document.createElement("div");
    badge2.className = "new-badge";
    badge2.textContent = i18nString11(UIStrings11.new);
    badge2.setAttribute("jslog", `${VisualLogging14.badge("new-badge")}`);
    return badge2;
  }
  return void 0;
}
function bindToAction(actionName) {
  const action6 = ActionRegistry.instance().getAction(actionName);
  let setEnabled;
  let toggled;
  function actionEnabledChanged(event) {
    setEnabled(event.data);
  }
  return Directives2.ref((e) => {
    if (!e || !(e instanceof Buttons6.Button.Button)) {
      action6.removeEventListener("Enabled", actionEnabledChanged);
      action6.removeEventListener("Toggled", toggled);
      return;
    }
    setEnabled = (enabled) => {
      e.disabled = !enabled;
    };
    action6.addEventListener("Enabled", actionEnabledChanged);
    const toggleable = action6.toggleable();
    const title = action6.title();
    const iconName = action6.icon() ?? "";
    const jslogContext = action6.id();
    const toggledIconName = action6.toggledIcon() ?? iconName;
    const toggleType = action6.toggleWithRedColor() ? "red-toggle" : "primary-toggle";
    if (e.childNodes.length) {
      e.jslogContext = jslogContext;
    } else if (toggleable) {
      toggled = () => {
        e.toggled = action6.toggled();
        if (action6.title()) {
          e.title = action6.title();
          Tooltip.installWithActionBinding(e, action6.title(), action6.id());
        }
      };
      action6.addEventListener("Toggled", toggled);
      e.data = {
        jslogContext,
        title,
        variant: "icon_toggle",
        iconName,
        toggledIconName,
        toggleType,
        toggled: action6.toggled()
      };
      toggled();
    } else if (iconName) {
      e.data = {
        iconName,
        jslogContext,
        title,
        variant: "icon"
        /* Buttons.Button.Variant.ICON */
      };
    } else {
      e.data = {
        jslogContext,
        title,
        variant: "text"
        /* Buttons.Button.Variant.TEXT */
      };
    }
    setEnabled(action6.enabled());
    e.onclick = () => action6.execute();
  });
}
var InterceptBindingDirective = class _InterceptBindingDirective extends Lit2.Directive.Directive {
  static #interceptedBindings = /* @__PURE__ */ new WeakMap();
  update(part, [listener]) {
    if (part.type !== Lit2.Directive.PartType.EVENT) {
      return listener;
    }
    let eventListeners = _InterceptBindingDirective.#interceptedBindings.get(part.element);
    if (!eventListeners) {
      eventListeners = /* @__PURE__ */ new Map();
      _InterceptBindingDirective.#interceptedBindings.set(part.element, eventListeners);
    }
    eventListeners.set(part.name, listener);
    return this.render(listener);
  }
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-function-type */
  render(_listener) {
    return void 0;
  }
  static attachEventListeners(templateElement, renderedElement) {
    const eventListeners = _InterceptBindingDirective.#interceptedBindings.get(templateElement);
    if (!eventListeners) {
      return;
    }
    for (const [name, listener] of eventListeners) {
      renderedElement.addEventListener(name, listener);
    }
  }
};
var cloneCustomElement = (element, deep) => {
  const clone = document.createElement(element.localName);
  for (const attribute of element.attributes) {
    clone.setAttribute(attribute.name, attribute.value);
  }
  if (deep) {
    for (const child of element.childNodes) {
      clone.appendChild(child.cloneNode(deep));
    }
  }
  return clone;
};
var HTMLElementWithLightDOMTemplate = class _HTMLElementWithLightDOMTemplate extends HTMLElement {
  #mutationObserver = new MutationObserver(this.#onChange.bind(this));
  #contentTemplate = null;
  constructor() {
    super();
    this.#mutationObserver.observe(this, { childList: true, attributes: true, subtree: true, characterData: true });
  }
  static cloneNode(node) {
    const clone = node.cloneNode(false);
    for (const child of node.childNodes) {
      clone.appendChild(_HTMLElementWithLightDOMTemplate.cloneNode(child));
    }
    if (node instanceof Element && clone instanceof Element) {
      InterceptBindingDirective.attachEventListeners(node, clone);
    }
    return clone;
  }
  static patchLitTemplate(template) {
    const wrapper = Lit2.Directive.directive(InterceptBindingDirective);
    if (template === Lit2.nothing) {
      return;
    }
    template.values = template.values.map(patchValue);
    function isLitTemplate(value) {
      return Boolean(typeof value === "object" && value && "_$litType$" in value && "strings" in value && "values" in value && value["_$litType$"] === 1);
    }
    function patchValue(value) {
      if (typeof value === "function") {
        try {
          return wrapper(value);
        } catch {
          return value;
        }
      }
      if (isLitTemplate(value)) {
        _HTMLElementWithLightDOMTemplate.patchLitTemplate(value);
        return value;
      }
      if (Array.isArray(value)) {
        return value.map(patchValue);
      }
      return value;
    }
  }
  get templateRoot() {
    return this.#contentTemplate?.content ?? this;
  }
  set template(template) {
    if (!this.#contentTemplate) {
      this.removeChildren();
      this.#contentTemplate = this.createChild("template");
      this.#mutationObserver.disconnect();
      this.#mutationObserver.observe(this.#contentTemplate.content, { childList: true, attributes: true, subtree: true, characterData: true });
    }
    _HTMLElementWithLightDOMTemplate.patchLitTemplate(template);
    render2(template, this.#contentTemplate.content);
  }
  #onChange(mutationList) {
    this.onChange(mutationList);
    for (const mutation of mutationList) {
      this.removeNodes(mutation.removedNodes);
      this.addNodes(mutation.addedNodes, mutation.nextSibling);
      this.updateNode(mutation.target, mutation.attributeName);
    }
  }
  onChange(_mutationList) {
  }
  updateNode(_node, _attributeName) {
  }
  addNodes(_nodes, _nextSibling) {
  }
  removeNodes(_nodes) {
  }
  static findCorrespondingElement(sourceElement, sourceRootElement, targetRootElement) {
    let currentElement = sourceElement;
    const childIndexesOnPathToRoot = [];
    while (currentElement?.parentElement && currentElement !== sourceRootElement) {
      childIndexesOnPathToRoot.push([...currentElement.parentElement.children].indexOf(currentElement));
      currentElement = currentElement.parentElement;
    }
    if (!currentElement) {
      return null;
    }
    let targetElement = targetRootElement;
    for (const index of childIndexesOnPathToRoot.reverse()) {
      targetElement = targetElement.children[index];
    }
    return targetElement;
  }
};
function copyTextToClipboard(text, alert) {
  Host7.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(text);
  if (alert) {
    LiveAnnouncer.alert(alert);
  }
}
function getDevToolsBoundingElement() {
  return InspectorView.maybeGetInspectorViewInstance()?.element || document.body;
}
var bindCheckbox = function(input, setting, metric) {
  const setValue = bindCheckboxImpl(input, setting.set.bind(setting), metric);
  setting.addChangeListener((event) => setValue(event.data));
  setValue(setting.get());
};
var bindCheckboxImpl = function(input, apply, metric) {
  input.addEventListener("change", onInputChanged, false);
  function onInputChanged() {
    apply(input.checked);
    if (input.checked && metric?.enable) {
      Host7.userMetrics.actionTaken(metric.enable);
    }
    if (!input.checked && metric?.disable) {
      Host7.userMetrics.actionTaken(metric.disable);
    }
    if (metric?.toggle) {
      Host7.userMetrics.actionTaken(metric.toggle);
    }
  }
  return function setValue(value) {
    if (value !== input.checked) {
      input.checked = value;
    }
  };
};
var bindToSetting = (settingOrName, stringValidator) => {
  const setting = typeof settingOrName === "string" ? Common14.Settings.Settings.instance().moduleSetting(settingOrName) : settingOrName;
  let setValue;
  function settingChanged() {
    setValue(setting.get());
  }
  if (setting.type() === "boolean" || typeof setting.defaultValue === "boolean") {
    return Directives2.ref((e) => {
      if (e === void 0) {
        setting.removeChangeListener(settingChanged);
        return;
      }
      setting.addChangeListener(settingChanged);
      setValue = bindCheckboxImpl(e, setting.set.bind(setting));
      setValue(setting.get());
    });
  }
  if (setting.type() === "regex" || setting instanceof Common14.Settings.RegExpSetting) {
    return Directives2.ref((e) => {
      if (e === void 0) {
        setting.removeChangeListener(settingChanged);
        return;
      }
      setting.addChangeListener(settingChanged);
      setValue = bindInput(
        e,
        setting.set.bind(setting),
        (value) => {
          try {
            new RegExp(value);
            return true;
          } catch {
            return false;
          }
        },
        /* numeric */
        false
      );
      setValue(setting.get());
    });
  }
  if (typeof setting.defaultValue === "string") {
    return Directives2.ref((e) => {
      if (e === void 0) {
        setting.removeChangeListener(settingChanged);
        return;
      }
      setting.addChangeListener(settingChanged);
      setValue = bindInput(
        e,
        setting.set.bind(setting),
        stringValidator ?? (() => true),
        /* numeric */
        false
      );
      setValue(setting.get());
    });
  }
  throw new Error(`Cannot infer type for setting  '${setting.name}'`);
};

// gen/front_end/ui/legacy/GlassPane.js
var GlassPane = class _GlassPane {
  #widget;
  element;
  contentElement;
  onMouseDownBound;
  onClickOutsideCallback = null;
  #onHideCallback = null;
  maxSize = null;
  positionX = null;
  positionY = null;
  anchorBox = null;
  anchorBehavior = "PreferTop";
  sizeBehavior = "SetExactSize";
  marginBehavior = "DefaultMargin";
  #ignoreLeftMargin = false;
  constructor(jslog) {
    this.#widget = new Widget({ jslog, useShadowDom: true });
    this.#widget.markAsRoot();
    this.#widget.onDetach = this.#onDetach.bind(this);
    this.element = this.#widget.element;
    this.contentElement = this.#widget.contentElement;
    this.registerRequiredCSS(glassPane_css_default);
    this.setPointerEventsBehavior(
      "PierceGlassPane"
      /* PointerEventsBehavior.PIERCE_GLASS_PANE */
    );
    this.onMouseDownBound = this.onMouseDown.bind(this);
  }
  setJsLog(jslog) {
    this.contentElement.setAttribute("jslog", jslog);
  }
  isShowing() {
    return this.#widget.isShowing();
  }
  registerRequiredCSS(...cssFiles) {
    this.#widget.registerRequiredCSS(...cssFiles);
  }
  setDefaultFocusedElement(element) {
    this.#widget.setDefaultFocusedElement(element);
  }
  setDimmed(dimmed) {
    this.element.classList.toggle("dimmed-pane", dimmed);
  }
  setPointerEventsBehavior(pointerEventsBehavior) {
    this.element.classList.toggle(
      "no-pointer-events",
      pointerEventsBehavior !== "BlockedByGlassPane"
      /* PointerEventsBehavior.BLOCKED_BY_GLASS_PANE */
    );
    this.contentElement.classList.toggle(
      "no-pointer-events",
      pointerEventsBehavior === "PierceContents"
      /* PointerEventsBehavior.PIERCE_CONTENTS */
    );
  }
  setOutsideClickCallback(callback) {
    this.onClickOutsideCallback = callback;
  }
  setOnHideCallback(cb) {
    this.#onHideCallback = cb;
  }
  setMaxContentSize(size) {
    this.maxSize = size;
    this.positionContent();
  }
  setSizeBehavior(sizeBehavior) {
    this.sizeBehavior = sizeBehavior;
    this.positionContent();
  }
  setContentPosition(x, y) {
    this.positionX = x;
    this.positionY = y;
    this.positionContent();
  }
  setContentAnchorBox(anchorBox) {
    this.anchorBox = anchorBox;
    this.positionContent();
  }
  setAnchorBehavior(behavior) {
    this.anchorBehavior = behavior;
  }
  setMarginBehavior(behavior) {
    this.marginBehavior = behavior;
  }
  setIgnoreLeftMargin(ignore) {
    this.#ignoreLeftMargin = ignore;
  }
  show(document2) {
    if (this.isShowing()) {
      return;
    }
    this.element.style.zIndex = `${3e3 + 1e3 * panes.size}`;
    this.element.setAttribute("data-devtools-glass-pane", "");
    document2.body.addEventListener("mousedown", this.onMouseDownBound, true);
    document2.body.addEventListener("pointerdown", this.onMouseDownBound, true);
    this.#widget.show(document2.body);
    panes.add(this);
    this.positionContent();
  }
  hide() {
    if (!this.isShowing()) {
      return;
    }
    this.#widget.detach();
    if (this.#onHideCallback) {
      this.#onHideCallback();
    }
  }
  #onDetach() {
    panes.delete(this);
    this.element.ownerDocument.body.removeEventListener("mousedown", this.onMouseDownBound, true);
    this.element.ownerDocument.body.removeEventListener("pointerdown", this.onMouseDownBound, true);
  }
  onMouseDown(event) {
    if (!this.onClickOutsideCallback) {
      return;
    }
    const node = deepElementFromEvent(event);
    if (!node || this.contentElement.isSelfOrAncestor(node)) {
      return;
    }
    this.onClickOutsideCallback.call(null, event);
  }
  positionContent() {
    if (!this.isShowing()) {
      return;
    }
    const gutterSize = this.marginBehavior === "NoMargin" ? 0 : 3;
    const scrollbarSize = measuredScrollbarWidth(this.element.ownerDocument);
    const offsetSize = 10;
    const container = containers.get(this.element.ownerDocument);
    if (this.sizeBehavior === "MeasureContent") {
      this.contentElement.positionAt(0, 0);
      this.contentElement.style.width = "";
      this.contentElement.style.maxWidth = "";
      this.contentElement.style.height = "";
      this.contentElement.style.maxHeight = "";
    }
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    let width = containerWidth - gutterSize * 2;
    let height = containerHeight - gutterSize * 2;
    let positionX = gutterSize;
    let positionY = gutterSize;
    if (this.maxSize) {
      width = Math.min(width, this.maxSize.width);
      height = Math.min(height, this.maxSize.height);
    }
    if (this.sizeBehavior === "MeasureContent") {
      const measuredRect = this.contentElement.getBoundingClientRect();
      const widthOverflow = height < measuredRect.height ? scrollbarSize : 0;
      const heightOverflow = width < measuredRect.width ? scrollbarSize : 0;
      width = Math.min(width, measuredRect.width + widthOverflow);
      height = Math.min(height, measuredRect.height + heightOverflow);
    }
    if (this.anchorBox) {
      const anchorBox = this.anchorBox.relativeToElement(container);
      let behavior = this.anchorBehavior;
      if (behavior === "PreferTop" || behavior === "PreferBottom") {
        const top = anchorBox.y - 2 * gutterSize;
        const bottom = containerHeight - anchorBox.y - anchorBox.height - 2 * gutterSize;
        if (behavior === "PreferTop" && top < height && bottom > top) {
          behavior = "PreferBottom";
        }
        if (behavior === "PreferBottom" && bottom < height && top > bottom) {
          behavior = "PreferTop";
        }
        let enoughHeight = true;
        if (behavior === "PreferTop") {
          positionY = Math.max(gutterSize, anchorBox.y - height - gutterSize);
          const spaceTop = anchorBox.y - positionY - gutterSize;
          if (this.sizeBehavior === "MeasureContent") {
            if (height > spaceTop) {
              enoughHeight = false;
            }
          } else {
            height = Math.min(height, spaceTop);
          }
        } else {
          positionY = anchorBox.y + anchorBox.height + gutterSize;
          const spaceBottom = containerHeight - positionY - gutterSize;
          if (this.sizeBehavior === "MeasureContent") {
            if (height > spaceBottom) {
              positionY = containerHeight - gutterSize - height;
              enoughHeight = false;
            }
          } else {
            height = Math.min(height, spaceBottom);
          }
        }
        const naturalPositionX = Math.min(anchorBox.x, containerWidth - width - gutterSize);
        positionX = Math.max(gutterSize, naturalPositionX);
        if (this.#ignoreLeftMargin && gutterSize > naturalPositionX) {
          positionX = 0;
        }
        if (!enoughHeight) {
          positionX = Math.min(positionX + offsetSize, containerWidth - width - gutterSize);
        } else if (positionX - offsetSize >= gutterSize) {
          positionX -= offsetSize;
        }
        width = Math.min(width, containerWidth - positionX - gutterSize);
      } else {
        const left = anchorBox.x - 2 * gutterSize;
        const right = containerWidth - anchorBox.x - anchorBox.width - 2 * gutterSize;
        if (behavior === "PreferLeft" && left < width && right > left) {
          behavior = "PreferRight";
        }
        if (behavior === "PreferRight" && right < width && left > right) {
          behavior = "PreferLeft";
        }
        let enoughWidth = true;
        if (behavior === "PreferLeft") {
          positionX = Math.max(gutterSize, anchorBox.x - width - gutterSize);
          const spaceLeft = anchorBox.x - positionX - gutterSize;
          if (this.sizeBehavior === "MeasureContent") {
            if (width > spaceLeft) {
              enoughWidth = false;
            }
          } else {
            width = Math.min(width, spaceLeft);
          }
        } else {
          positionX = anchorBox.x + anchorBox.width + gutterSize;
          const spaceRight = containerWidth - positionX - gutterSize;
          if (this.sizeBehavior === "MeasureContent") {
            if (width > spaceRight) {
              positionX = containerWidth - gutterSize - width;
              enoughWidth = false;
            }
          } else {
            width = Math.min(width, spaceRight);
          }
        }
        positionY = Math.max(gutterSize, Math.min(anchorBox.y, containerHeight - height - gutterSize));
        if (!enoughWidth) {
          positionY = Math.min(positionY + offsetSize, containerHeight - height - gutterSize);
        } else if (positionY - offsetSize >= gutterSize) {
          positionY -= offsetSize;
        }
        height = Math.min(height, containerHeight - positionY - gutterSize);
      }
    } else {
      positionX = this.positionX !== null ? this.positionX : (containerWidth - width) / 2;
      positionY = this.positionY !== null ? this.positionY : (containerHeight - height) / 2;
      width = Math.min(width, containerWidth - positionX - gutterSize);
      height = Math.min(height, containerHeight - positionY - gutterSize);
    }
    this.contentElement.style.width = width + "px";
    if (this.sizeBehavior === "SetExactWidthMaxHeight") {
      this.contentElement.style.maxHeight = height + "px";
    } else {
      this.contentElement.style.height = height + "px";
    }
    this.contentElement.positionAt(positionX, positionY, container);
    this.#widget.doResize();
  }
  widget() {
    return this.#widget;
  }
  static setContainer(element) {
    containers.set(element.ownerDocument, element);
    _GlassPane.containerMoved(element);
  }
  static container(document2) {
    return containers.get(document2);
  }
  static containerMoved(element) {
    for (const pane4 of panes) {
      if (pane4.isShowing() && pane4.element.ownerDocument === element.ownerDocument) {
        pane4.positionContent();
      }
    }
  }
};
var containers = /* @__PURE__ */ new Map();
var panes = /* @__PURE__ */ new Set();
var GlassPanePanes = panes;

// gen/front_end/ui/legacy/Dialog.js
var Dialog = class _Dialog extends Common15.ObjectWrapper.eventMixin(GlassPane) {
  tabIndexBehavior = "DisableAllTabIndex";
  tabIndexMap = /* @__PURE__ */ new Map();
  focusRestorer = null;
  closeOnEscape = true;
  targetDocument = null;
  targetDocumentKeyDownHandler;
  escapeKeyCallback = null;
  constructor(jslogContext) {
    super();
    this.registerRequiredCSS(dialog_css_default);
    this.contentElement.tabIndex = 0;
    this.contentElement.addEventListener("focus", () => this.widget().focus(), false);
    if (jslogContext) {
      this.contentElement.setAttribute("jslog", `${VisualLogging15.dialog(jslogContext).track({ resize: true, keydown: "Escape" })}`);
    }
    this.setPointerEventsBehavior(
      "BlockedByGlassPane"
      /* PointerEventsBehavior.BLOCKED_BY_GLASS_PANE */
    );
    this.setOutsideClickCallback((event) => {
      if (_Dialog.getInstance() !== this) {
        return;
      }
      this.hide();
      event.consume(true);
    });
    markAsModalDialog(this.contentElement);
    this.targetDocumentKeyDownHandler = this.onKeyDown.bind(this);
  }
  static hasInstance() {
    return _Dialog.dialogs.length > 0;
  }
  /**
   * If there is only one dialog, returns that.
   * If there are stacked dialogs, returns the topmost one.
   */
  static getInstance() {
    return _Dialog.dialogs[_Dialog.dialogs.length - 1] || null;
  }
  /**
   * `stack` parameter is needed for being able to open a dialog on top
   * of an existing dialog. The main reason is, Settings Tab is
   * implemented as a Dialog. So, if we want to open a dialog on the
   * Settings Tab, we need to stack it on top of that dialog.
   *
   * @param where Container element of the dialog.
   * @param stack Whether to open this dialog on top of an existing dialog.
   */
  show(where, stack) {
    const document2 = where instanceof Document ? where : (where || InspectorView.instance().element).ownerDocument;
    this.targetDocument = document2;
    this.targetDocument.addEventListener("keydown", this.targetDocumentKeyDownHandler, true);
    if (!stack && _Dialog.dialogs.length) {
      _Dialog.dialogs.forEach((dialog3) => dialog3.hide());
    }
    _Dialog.dialogs.push(this);
    this.disableTabIndexOnElements(document2);
    super.show(document2);
    this.focusRestorer = new WidgetFocusRestorer(this.widget());
  }
  hide() {
    if (this.focusRestorer) {
      this.focusRestorer.restore();
    }
    super.hide();
    if (this.targetDocument) {
      this.targetDocument.removeEventListener("keydown", this.targetDocumentKeyDownHandler, true);
    }
    this.restoreTabIndexOnElements();
    this.dispatchEventToListeners(
      "hidden"
      /* Events.HIDDEN */
    );
    const index = _Dialog.dialogs.indexOf(this);
    if (index !== -1) {
      _Dialog.dialogs.splice(index, 1);
    }
  }
  setAriaLabel(label) {
    setLabel(this.contentElement, label);
  }
  setCloseOnEscape(close5) {
    this.closeOnEscape = close5;
  }
  setEscapeKeyCallback(callback) {
    this.escapeKeyCallback = callback;
  }
  addCloseButton() {
    const closeButton = this.contentElement.createChild("dt-close-button", "dialog-close-button");
    closeButton.addEventListener("click", this.hide.bind(this), false);
  }
  setOutsideTabIndexBehavior(tabIndexBehavior) {
    this.tabIndexBehavior = tabIndexBehavior;
  }
  disableTabIndexOnElements(document2) {
    if (this.tabIndexBehavior === "PreserveTabIndex") {
      return;
    }
    let exclusionSet = null;
    if (this.tabIndexBehavior === "PreserveMainViewTabIndex") {
      exclusionSet = this.getMainWidgetTabIndexElements(InspectorView.instance().ownerSplit());
    }
    this.tabIndexMap.clear();
    let node = document2;
    for (; node; node = node.traverseNextNode(document2)) {
      if (node instanceof HTMLElement) {
        const element = node;
        const tabIndex = element.tabIndex;
        if (!exclusionSet?.has(element)) {
          if (tabIndex >= 0) {
            this.tabIndexMap.set(element, tabIndex);
            element.tabIndex = -1;
          } else if (element.hasAttribute("contenteditable")) {
            this.tabIndexMap.set(element, element.hasAttribute("tabindex") ? tabIndex : 0);
            element.tabIndex = -1;
          }
        }
      }
    }
  }
  getMainWidgetTabIndexElements(splitWidget) {
    const elementSet = /* @__PURE__ */ new Set();
    if (!splitWidget) {
      return elementSet;
    }
    const mainWidget = splitWidget.mainWidget();
    if (!mainWidget?.element) {
      return elementSet;
    }
    let node = mainWidget.element;
    for (; node; node = node.traverseNextNode(mainWidget.element)) {
      if (!(node instanceof HTMLElement)) {
        continue;
      }
      const element = node;
      const tabIndex = element.tabIndex;
      if (tabIndex < 0) {
        continue;
      }
      elementSet.add(element);
    }
    return elementSet;
  }
  restoreTabIndexOnElements() {
    for (const element of this.tabIndexMap.keys()) {
      element.tabIndex = this.tabIndexMap.get(element);
    }
    this.tabIndexMap.clear();
  }
  onKeyDown(event) {
    const keyboardEvent = event;
    if (_Dialog.getInstance() !== this) {
      return;
    }
    if (keyboardEvent.keyCode === Keys.Esc.code && KeyboardShortcut.hasNoModifiers(event)) {
      if (this.escapeKeyCallback) {
        this.escapeKeyCallback(event);
      }
      if (event.handled) {
        return;
      }
      if (this.closeOnEscape) {
        event.consume(true);
        this.hide();
      }
    }
  }
  static dialogs = [];
};

// gen/front_end/ui/legacy/ARIAUtils.js
var id = 0;
function nextId(prefix) {
  return (prefix || "") + ++id;
}
function bindLabelToControl(label, control) {
  const controlId = nextId("labelledControl");
  control.id = controlId;
  label.setAttribute("for", controlId);
}
function markAsAlert(element) {
  element.setAttribute("role", "alert");
  element.setAttribute("aria-live", "polite");
}
function markAsApplication(element) {
  element.setAttribute("role", "application");
}
function markAsButton(element) {
  element.setAttribute("role", "button");
}
function markAsCheckbox(element) {
  element.setAttribute("role", "checkbox");
}
function markAsCombobox(element) {
  element.setAttribute("role", "combobox");
}
function markAsModalDialog(element) {
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "true");
}
function markAsGroup(element) {
  element.setAttribute("role", "group");
}
function markAsLink(element) {
  element.setAttribute("role", "link");
}
function markAsMenuButton(element) {
  markAsButton(element);
  element.setAttribute("aria-haspopup", "true");
}
function markAsProgressBar(element, min = 0, max = 100) {
  element.setAttribute("role", "progressbar");
  element.setAttribute("aria-valuemin", min.toString());
  element.setAttribute("aria-valuemax", max.toString());
}
function markAsTab(element) {
  element.setAttribute("role", "tab");
}
function markAsTablist(element) {
  element.setAttribute("role", "tablist");
}
function markAsTabpanel(element) {
  element.setAttribute("role", "tabpanel");
}
function markAsTree(element) {
  element.setAttribute("role", "tree");
}
function markAsTreeitem(element) {
  element.setAttribute("role", "treeitem");
}
function markAsTextBox(element) {
  element.setAttribute("role", "textbox");
}
function markAsMenu(element) {
  element.setAttribute("role", "menu");
}
function markAsMenuItem(element) {
  element.setAttribute("role", "menuitem");
}
function markAsMenuItemCheckBox(element) {
  element.setAttribute("role", "menuitemcheckbox");
}
function markAsMenuItemSubMenu(element) {
  markAsMenuItem(element);
  element.setAttribute("aria-haspopup", "true");
}
function markAsList(element) {
  element.setAttribute("role", "list");
}
function markAsListitem(element) {
  element.setAttribute("role", "listitem");
}
function markAsMain(element) {
  element.setAttribute("role", "main");
}
function markAsComplementary(element) {
  element.setAttribute("role", "complementary");
}
function markAsNavigation(element) {
  element.setAttribute("role", "navigation");
}
function markAsListBox(element) {
  element.setAttribute("role", "listbox");
}
function markAsMultiSelectable(element) {
  element.setAttribute("aria-multiselectable", "true");
}
function markAsOption(element) {
  element.setAttribute("role", "option");
}
function markAsRadioGroup(element) {
  element.setAttribute("role", "radiogroup");
}
function markAsSlider(element, min = 0, max = 100) {
  element.setAttribute("role", "slider");
  element.setAttribute("aria-valuemin", String(min));
  element.setAttribute("aria-valuemax", String(max));
}
function markAsHeading(element, level) {
  element.setAttribute("role", "heading");
  element.setAttribute("aria-level", level.toString());
}
function markAsPoliteLiveRegion(element, isAtomic) {
  element.setAttribute("aria-live", "polite");
  if (isAtomic) {
    element.setAttribute("aria-atomic", "true");
  }
}
function hasRole(element) {
  return element.hasAttribute("role");
}
function removeRole(element) {
  element.removeAttribute("role");
}
function setPlaceholder(element, placeholder) {
  if (placeholder) {
    element.setAttribute("aria-placeholder", placeholder);
  } else {
    element.removeAttribute("aria-placeholder");
  }
}
function markAsPresentation(element) {
  element.setAttribute("role", "presentation");
}
function markAsStatus(element) {
  element.setAttribute("role", "status");
}
function ensureId(element) {
  if (!element.id) {
    element.id = nextId("ariaElement");
  }
}
function setAriaValueText(element, valueText) {
  element.setAttribute("aria-valuetext", valueText);
}
function setAriaValueNow(element, value) {
  element.setAttribute("aria-valuenow", value);
}
function setAriaValueMinMax(element, min, max) {
  element.setAttribute("aria-valuemin", min);
  element.setAttribute("aria-valuemax", max);
}
function setControls(element, controlledElement) {
  if (!controlledElement) {
    element.removeAttribute("aria-controls");
    return;
  }
  ensureId(controlledElement);
  element.setAttribute("aria-controls", controlledElement.id);
}
function setChecked(element, value) {
  element.setAttribute("aria-checked", Boolean(value).toString());
}
function setCheckboxAsIndeterminate(element) {
  element.setAttribute("aria-checked", "mixed");
}
function setDisabled(element, value) {
  element.setAttribute("aria-disabled", Boolean(value).toString());
}
function setExpanded(element, value) {
  element.setAttribute("aria-expanded", Boolean(value).toString());
}
function unsetExpandable(element) {
  element.removeAttribute("aria-expanded");
}
function setHidden(element, value) {
  element.setAttribute("aria-hidden", value.toString());
}
function setLevel(element, level) {
  element.setAttribute("aria-level", level.toString());
}
function setAutocomplete(element, interactionModel = "none") {
  element.setAttribute("aria-autocomplete", interactionModel);
}
function clearAutocomplete(element) {
  element.removeAttribute("aria-autocomplete");
}
function setHasPopup(element, value = "false") {
  if (value !== "false") {
    element.setAttribute("aria-haspopup", value);
  } else {
    element.removeAttribute("aria-haspopup");
  }
}
function setSelected(element, value) {
  element.setAttribute("aria-selected", Boolean(value).toString());
}
function clearSelected(element) {
  element.removeAttribute("aria-selected");
}
function setInvalid(element, value) {
  if (value) {
    element.setAttribute("aria-invalid", value.toString());
  } else {
    element.removeAttribute("aria-invalid");
  }
}
function setPressed(element, value) {
  element.setAttribute("aria-pressed", Boolean(value).toString());
}
function setValueNow(element, value) {
  element.setAttribute("aria-valuenow", value.toString());
}
function setValueText(element, value) {
  element.setAttribute("aria-valuetext", value.toString());
}
function setProgressBarValue(element, valueNow, valueText) {
  element.setAttribute("aria-valuenow", valueNow.toString());
  if (valueText) {
    element.setAttribute("aria-valuetext", valueText);
  }
}
function setLabel(element, name) {
  element.setAttribute("aria-label", name);
}
function setDescription(element, description) {
  element.setAttribute("aria-description", description);
}
function setActiveDescendant(element, activedescendant) {
  if (!activedescendant) {
    element.removeAttribute("aria-activedescendant");
    return;
  }
  if (activedescendant.isConnected && element.isConnected) {
    console.assert(getEnclosingShadowRootForNode(activedescendant) === getEnclosingShadowRootForNode(element), "elements are not in the same shadow dom");
  }
  ensureId(activedescendant);
  element.setAttribute("aria-activedescendant", activedescendant.id);
}
function setSetSize(element, size) {
  element.setAttribute("aria-setsize", size.toString());
}
function setPositionInSet(element, position) {
  element.setAttribute("aria-posinset", position.toString());
}
var LiveAnnouncer = class _LiveAnnouncer {
  static #announcerElementsByRole = {
    [
      "alert"
      /* AnnouncerRole.ALERT */
    ]: /* @__PURE__ */ new WeakMap(),
    [
      "status"
      /* AnnouncerRole.STATUS */
    ]: /* @__PURE__ */ new WeakMap()
  };
  static #hideFromLayout(element) {
    element.style.position = "absolute";
    element.style.left = "-999em";
    element.style.width = "100em";
    element.style.overflow = "hidden";
  }
  static #createAnnouncerElement(container, role) {
    const element = container.createChild("div");
    _LiveAnnouncer.#hideFromLayout(element);
    element.setAttribute("role", role);
    element.setAttribute("aria-atomic", "true");
    return element;
  }
  static #removeAnnouncerElement(container, role) {
    const element = _LiveAnnouncer.#announcerElementsByRole[role].get(container);
    if (element) {
      element.remove();
      _LiveAnnouncer.#announcerElementsByRole[role].delete(container);
    }
  }
  /**
   * Announces the provided message using a dedicated ARIA alert element (`role="alert"`).
   * Ensures messages are announced even if identical to the previous message by appending
   * a non-breaking space ('\u00A0') when necessary. This works around screen reader
   * optimizations that might otherwise silence repeated identical alerts. The element's
   * `aria-atomic="true"` attribute ensures the entire message is announced upon change.
   *
   * The alert element is associated with the currently active dialog's content element
   * if a dialog is showing, otherwise defaults to an element associated with the document body.
   * Messages longer than 10000 characters will be trimmed.
   *
   * @param message The message to be announced.
   */
  static #announce(message, role) {
    const dialog3 = Dialog.getInstance();
    const element = _LiveAnnouncer.getOrCreateAnnouncerElement(dialog3?.isShowing() ? dialog3.contentElement : void 0, role);
    const announcedMessage = element.textContent === message ? `${message}\xA0` : message;
    element.textContent = Platform16.StringUtilities.trimEndWithMaxLength(announcedMessage, 1e4);
  }
  static getOrCreateAnnouncerElement(container = document.body, role, opts) {
    const existingAnnouncerElement = _LiveAnnouncer.#announcerElementsByRole[role].get(container);
    if (existingAnnouncerElement && existingAnnouncerElement.isConnected && !opts?.force) {
      return existingAnnouncerElement;
    }
    const newAnnouncerElement = _LiveAnnouncer.#createAnnouncerElement(container, role);
    _LiveAnnouncer.#announcerElementsByRole[role].set(container, newAnnouncerElement);
    return newAnnouncerElement;
  }
  static initializeAnnouncerElements(container = document.body) {
    _LiveAnnouncer.getOrCreateAnnouncerElement(
      container,
      "alert"
      /* AnnouncerRole.ALERT */
    );
    _LiveAnnouncer.getOrCreateAnnouncerElement(
      container,
      "status"
      /* AnnouncerRole.STATUS */
    );
  }
  static removeAnnouncerElements(container = document.body) {
    _LiveAnnouncer.#removeAnnouncerElement(
      container,
      "alert"
      /* AnnouncerRole.ALERT */
    );
    _LiveAnnouncer.#removeAnnouncerElement(
      container,
      "status"
      /* AnnouncerRole.STATUS */
    );
  }
  static alert(message) {
    _LiveAnnouncer.#announce(
      message,
      "alert"
      /* AnnouncerRole.ALERT */
    );
  }
  static status(message) {
    _LiveAnnouncer.#announce(
      message,
      "status"
      /* AnnouncerRole.STATUS */
    );
  }
};

// gen/front_end/ui/legacy/ContextFlavorListener.js
var ContextFlavorListener_exports = {};

// gen/front_end/ui/legacy/DropTarget.js
var DropTarget_exports = {};
__export(DropTarget_exports, {
  DropTarget: () => DropTarget,
  Type: () => Type
});

// gen/front_end/ui/legacy/dropTarget.css.js
var dropTarget_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  position: absolute;
  inset: 0;
  display: flex;
  background-color: var(--color-background-opacity-80);
  z-index: 1000;
}

.drop-target-message {
  flex: auto;
  font-size: 30px;
  color: var(--sys-color-token-subtle);
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20px;
  border: 4px dashed var(--sys-color-neutral-outline);
  pointer-events: none;
}

/*# sourceURL=${import.meta.resolve("./dropTarget.css")} */`;

// gen/front_end/ui/legacy/DropTarget.js
var DropTarget = class {
  element;
  transferTypes;
  messageText;
  handleDrop;
  enabled;
  dragMaskElement;
  constructor(element, transferTypes, messageText, handleDrop) {
    element.addEventListener("dragenter", this.onDragEnter.bind(this), true);
    element.addEventListener("dragover", this.onDragOver.bind(this), true);
    this.element = element;
    this.transferTypes = transferTypes;
    this.messageText = messageText;
    this.handleDrop = handleDrop;
    this.enabled = true;
    this.dragMaskElement = null;
  }
  setEnabled(enabled) {
    this.enabled = enabled;
  }
  onDragEnter(event) {
    if (this.enabled && this.hasMatchingType(event)) {
      event.consume(true);
    }
  }
  hasMatchingType(event) {
    if (!event.dataTransfer) {
      return false;
    }
    for (const transferType of this.transferTypes) {
      const found = Array.from(event.dataTransfer.items).find((item8) => {
        return transferType.kind === item8.kind && Boolean(transferType.type.exec(item8.type));
      });
      if (found) {
        return true;
      }
    }
    return false;
  }
  onDragOver(event) {
    if (!this.enabled || !this.hasMatchingType(event)) {
      return;
    }
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    event.consume(true);
    if (this.dragMaskElement) {
      return;
    }
    this.dragMaskElement = this.element.createChild("div", "");
    const shadowRoot = createShadowRootWithCoreStyles(this.dragMaskElement, { cssFile: dropTarget_css_default });
    shadowRoot.createChild("div", "drop-target-message").textContent = this.messageText;
    this.dragMaskElement.addEventListener("drop", this.onDrop.bind(this), true);
    this.dragMaskElement.addEventListener("dragleave", this.onDragLeave.bind(this), true);
  }
  onDrop(event) {
    event.consume(true);
    this.removeMask();
    if (this.enabled && event.dataTransfer) {
      this.handleDrop(event.dataTransfer);
    }
  }
  onDragLeave(event) {
    event.consume(true);
    this.removeMask();
  }
  removeMask() {
    if (this.dragMaskElement) {
      this.dragMaskElement.remove();
      this.dragMaskElement = null;
    }
  }
};
var Type = {
  URI: { kind: "string", type: /text\/uri-list/ },
  Folder: { kind: "file", type: /$^/ },
  File: { kind: "file", type: /.*/ },
  WebFile: { kind: "file", type: /[\w]+/ },
  ImageFile: { kind: "file", type: /image\/.*/ }
};

// gen/front_end/ui/legacy/EmptyWidget.js
var EmptyWidget_exports = {};
__export(EmptyWidget_exports, {
  EmptyWidget: () => EmptyWidget
});
import * as i18n23 from "./../../core/i18n/i18n.js";
import { Directives as Directives3, html as html3, render as render3 } from "./../lit/lit.js";
import * as VisualLogging17 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/emptyWidget.css.js
var emptyWidget_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.empty-view-scroller {
  overflow: auto;
}

/*# sourceURL=${import.meta.resolve("./emptyWidget.css")} */`;

// gen/front_end/ui/legacy/XLink.js
var XLink_exports = {};
__export(XLink_exports, {
  ContextMenuProvider: () => ContextMenuProvider,
  XLink: () => XLink
});
import * as Host8 from "./../../core/host/host.js";
import * as Platform17 from "./../../core/platform/platform.js";
import * as UIHelpers from "./../helpers/helpers.js";
import * as VisualLogging16 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/Fragment.js
var Fragment_exports = {};
__export(Fragment_exports, {
  Fragment: () => Fragment,
  attributeMarker: () => attributeMarker,
  html: () => html2,
  textMarker: () => textMarker
});
function getNodeData(node) {
  return node.data;
}
function setNodeData(node, value) {
  node.data = value;
}
var Fragment = class _Fragment {
  #element;
  elementsById = /* @__PURE__ */ new Map();
  constructor(element) {
    this.#element = element;
  }
  element() {
    return this.#element;
  }
  $(elementId) {
    return this.elementsById.get(elementId);
  }
  static build(strings, ...values) {
    return _Fragment.render(_Fragment.template(strings), values);
  }
  static cached(strings, ...values) {
    let template = templateCache.get(strings);
    if (!template) {
      template = _Fragment.template(strings);
      templateCache.set(strings, template);
    }
    return _Fragment.render(template, values);
  }
  static template(strings) {
    let html7 = "";
    let insideText = true;
    for (let i = 0; i < strings.length - 1; i++) {
      html7 += strings[i];
      const close5 = strings[i].lastIndexOf(">");
      const open = strings[i].indexOf("<", close5 + 1);
      if (close5 !== -1 && open === -1) {
        insideText = true;
      } else if (open !== -1) {
        insideText = false;
      }
      html7 += insideText ? textMarker : attributeMarker(i);
    }
    html7 += strings[strings.length - 1];
    const template = document.createElement("template");
    template.innerHTML = html7;
    const walker = template.ownerDocument.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
    let valueIndex = 0;
    const emptyTextNodes = [];
    const binds = [];
    const nodesToMark = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.ELEMENT_NODE && node.hasAttributes()) {
        if (node.hasAttribute("$")) {
          nodesToMark.push(node);
          binds.push({ replaceNodeIndex: void 0, attr: void 0, elementId: node.getAttribute("$") || "" });
          node.removeAttribute("$");
        }
        const attributesToRemove = [];
        for (let i = 0; i < node.attributes.length; i++) {
          const name = node.attributes[i].name;
          if (!attributeMarkerRegex.test(name) && !attributeMarkerRegex.test(node.attributes[i].value)) {
            continue;
          }
          attributesToRemove.push(name);
          nodesToMark.push(node);
          const attr = {
            index: valueIndex,
            names: name.split(attributeMarkerRegex),
            values: node.attributes[i].value.split(attributeMarkerRegex)
          };
          valueIndex += attr.names.length - 1;
          valueIndex += attr.values.length - 1;
          const bind = {
            elementId: void 0,
            replaceNodeIndex: void 0,
            attr
          };
          binds.push(bind);
        }
        for (let i = 0; i < attributesToRemove.length; i++) {
          node.removeAttribute(attributesToRemove[i]);
        }
      }
      if (node.nodeType === Node.TEXT_NODE && getNodeData(node).indexOf(textMarker) !== -1) {
        const texts = getNodeData(node).split(textMarkerRegex);
        setNodeData(node, texts[texts.length - 1]);
        const parentNode = node.parentNode;
        for (let i = 0; i < texts.length - 1; i++) {
          if (texts[i]) {
            parentNode.insertBefore(document.createTextNode(texts[i]), node);
          }
          const nodeToReplace = document.createElement("span");
          nodesToMark.push(nodeToReplace);
          binds.push({ attr: void 0, elementId: void 0, replaceNodeIndex: valueIndex++ });
          parentNode.insertBefore(nodeToReplace, node);
        }
      }
      if (node.nodeType === Node.TEXT_NODE && (!node.previousSibling || node.previousSibling.nodeType === Node.ELEMENT_NODE) && (!node.nextSibling || node.nextSibling.nodeType === Node.ELEMENT_NODE) && /^\s*$/.test(getNodeData(node))) {
        emptyTextNodes.push(node);
      }
    }
    for (let i = 0; i < nodesToMark.length; i++) {
      nodesToMark[i].classList.add(generateClassName(i));
    }
    for (const emptyTextNode of emptyTextNodes) {
      emptyTextNode.remove();
    }
    return { template, binds };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static render(template, values) {
    const content = template.template.ownerDocument.importNode(template.template.content, true);
    const resultElement = content.firstChild === content.lastChild ? content.firstChild : content;
    const result = new _Fragment(resultElement);
    const boundElements = [];
    for (let i = 0; i < template.binds.length; i++) {
      const className = generateClassName(i);
      const element = content.querySelector("." + className);
      element.classList.remove(className);
      boundElements.push(element);
    }
    for (let bindIndex = 0; bindIndex < template.binds.length; bindIndex++) {
      const bind = template.binds[bindIndex];
      const element = boundElements[bindIndex];
      if (bind.elementId !== void 0) {
        result.elementsById.set(bind.elementId, element);
      } else if (bind.replaceNodeIndex !== void 0) {
        const value = values[bind.replaceNodeIndex];
        element.parentNode.replaceChild(this.nodeForValue(value), element);
      } else if (bind.attr !== void 0) {
        if (bind.attr.names.length === 2 && bind.attr.values.length === 1 && typeof values[bind.attr.index] === "function") {
          values[bind.attr.index].call(null, element);
        } else {
          let name = bind.attr.names[0];
          for (let i = 1; i < bind.attr.names.length; i++) {
            name += values[bind.attr.index + i - 1];
            name += bind.attr.names[i];
          }
          if (name) {
            let value = bind.attr.values[0];
            for (let i = 1; i < bind.attr.values.length; i++) {
              value += values[bind.attr.index + bind.attr.names.length - 1 + i - 1];
              value += bind.attr.values[i];
            }
            element.setAttribute(name, value);
          }
        }
      } else {
        throw new Error("Unexpected bind");
      }
    }
    return result;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static nodeForValue(value) {
    if (value instanceof Node) {
      return value;
    }
    if (value instanceof _Fragment) {
      return value.#element;
    }
    if (Array.isArray(value)) {
      const node = document.createDocumentFragment();
      for (const v of value) {
        node.appendChild(this.nodeForValue(v));
      }
      return node;
    }
    return document.createTextNode(String(value));
  }
};
var textMarker = "{{template-text}}";
var textMarkerRegex = /{{template-text}}/;
var attributeMarker = (index) => "template-attribute" + index;
var attributeMarkerRegex = /template-attribute\d+/;
var generateClassName = (index) => "template-class-" + index;
var templateCache = /* @__PURE__ */ new Map();
var html2 = (strings, ...vararg) => {
  return Fragment.cached(strings, ...vararg).element();
};

// gen/front_end/ui/legacy/XElement.js
var XElement_exports = {};
__export(XElement_exports, {
  XElement: () => XElement
});
var XElement = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "flex",
      "padding",
      "padding-top",
      "padding-bottom",
      "padding-left",
      "padding-right",
      "margin",
      "margin-top",
      "margin-bottom",
      "margin-left",
      "margin-right",
      "overflow",
      "overflow-x",
      "overflow-y",
      "font-size",
      "color",
      "background",
      "background-color",
      "border",
      "border-top",
      "border-bottom",
      "border-left",
      "border-right",
      "max-width",
      "max-height"
    ];
  }
  attributeChangedCallback(attr, _oldValue, newValue) {
    if (attr === "flex") {
      if (newValue === null) {
        this.style.removeProperty("flex");
      } else if (newValue === "initial" || newValue === "auto" || newValue === "none" || newValue.indexOf(" ") !== -1) {
        this.style.setProperty("flex", newValue);
      } else {
        this.style.setProperty("flex", "0 0 " + newValue);
      }
      return;
    }
    if (newValue === null) {
      this.style.removeProperty(attr);
      if (attr.startsWith("padding-") || attr.startsWith("margin-") || attr.startsWith("border-") || attr.startsWith("background-") || attr.startsWith("overflow-")) {
        const shorthand = attr.substring(0, attr.indexOf("-"));
        const shorthandValue = this.getAttribute(shorthand);
        if (shorthandValue !== null) {
          this.style.setProperty(shorthand, shorthandValue);
        }
      }
    } else {
      this.style.setProperty(attr, newValue);
    }
  }
};

// gen/front_end/ui/legacy/XLink.js
var XLink = class extends XElement {
  #href;
  clickable;
  onClick;
  onKeyDown;
  static create(url, linkText, className, preventClick, jsLogContext, tabindex = "0") {
    if (!linkText) {
      linkText = url;
    }
    className = className || "";
    const element = html2`
  <x-link href='${url}' tabindex='${tabindex}' class='${className} devtools-link' ${preventClick ? "no-click" : ""}
  jslog=${VisualLogging16.link().track({ click: true, keydown: "Enter|Space" }).context(jsLogContext)}>${Platform17.StringUtilities.trimMiddle(linkText, MaxLengthForDisplayedURLs)}</x-link>`;
    return element;
  }
  constructor() {
    super();
    this.style.setProperty("display", "inline");
    markAsLink(this);
    this.setAttribute("tabindex", "0");
    this.setAttribute("target", "_blank");
    this.setAttribute("rel", "noopener");
    this.#href = null;
    this.clickable = true;
    this.onClick = (event) => {
      event.consume(true);
      if (this.#href) {
        UIHelpers.openInNewTab(this.#href);
      }
    };
    this.onKeyDown = (event) => {
      if (Platform17.KeyboardUtilities.isEnterOrSpaceKey(event)) {
        event.consume(true);
        if (this.#href) {
          UIHelpers.openInNewTab(this.#href);
        }
      }
    };
  }
  static get observedAttributes() {
    return XElement.observedAttributes.concat(["href", "no-click", "title", "tabindex"]);
  }
  get href() {
    return this.#href;
  }
  attributeChangedCallback(attr, oldValue, newValue) {
    if (attr === "no-click") {
      this.clickable = !newValue;
      this.updateClick();
      return;
    }
    if (attr === "href") {
      if (!newValue) {
        newValue = "";
      }
      let href = null;
      try {
        const url = new URL(newValue);
        if (url.protocol !== "javascript:") {
          href = Platform17.DevToolsPath.urlString`${url}`;
        }
      } catch {
      }
      this.#href = href;
      if (!this.hasAttribute("title")) {
        Tooltip.install(this, newValue);
      }
      this.updateClick();
      return;
    }
    if (attr === "tabindex") {
      if (oldValue !== newValue) {
        this.setAttribute("tabindex", newValue || "0");
      }
      return;
    }
    super.attributeChangedCallback(attr, oldValue, newValue);
  }
  updateClick() {
    if (this.#href !== null && this.clickable) {
      this.addEventListener("click", this.onClick, false);
      this.addEventListener("keydown", this.onKeyDown, false);
      this.style.setProperty("cursor", "pointer");
    } else {
      this.removeEventListener("click", this.onClick, false);
      this.removeEventListener("keydown", this.onKeyDown, false);
      this.style.removeProperty("cursor");
    }
  }
};
var ContextMenuProvider = class {
  appendApplicableItems(_event, contextMenu, target) {
    let targetNode = target;
    while (targetNode && !(targetNode instanceof XLink)) {
      targetNode = targetNode.parentNodeOrShadowHost();
    }
    if (!targetNode?.href) {
      return;
    }
    const node = targetNode;
    contextMenu.revealSection().appendItem(openLinkExternallyLabel(), () => {
      if (node.href) {
        UIHelpers.openInNewTab(node.href);
      }
    }, { jslogContext: "open-in-new-tab" });
    contextMenu.revealSection().appendItem(copyLinkAddressLabel(), () => {
      if (node.href) {
        Host8.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(node.href);
      }
    }, { jslogContext: "copy-link-address" });
  }
};
customElements.define("x-link", XLink);

// gen/front_end/ui/legacy/EmptyWidget.js
var UIStrings12 = {
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  learnMore: "Learn more"
};
var str_12 = i18n23.i18n.registerUIStrings("ui/legacy/EmptyWidget.ts", UIStrings12);
var i18nString12 = i18n23.i18n.getLocalizedString.bind(void 0, str_12);
var { ref } = Directives3;
var DEFAULT_VIEW = (input, output, target) => {
  render3(html3`
    <style>${inspectorCommon_css_default}</style>
    <style>${emptyWidget_css_default}</style>
    <div class="empty-state" jslog=${VisualLogging17.section("empty-view")}
         ${ref((e) => {
    output.contentElement = e;
  })}>
      <div class="empty-state-header">${input.header}</div>
      <div class="empty-state-description">
        <span>${input.text}</span>
        ${input.link ? XLink.create(input.link, i18nString12(UIStrings12.learnMore), void 0, void 0, "learn-more") : ""}
      </div>
      ${input.extraElements}
    </div>`, target);
};
var EmptyWidget = class extends VBox {
  #header;
  #text;
  #link;
  #view;
  #firstUpdate = true;
  #extraElements = [];
  constructor(headerOrElement, text = "", element, view = DEFAULT_VIEW) {
    const header = typeof headerOrElement === "string" ? headerOrElement : "";
    if (!element && headerOrElement instanceof HTMLElement) {
      element = headerOrElement;
    }
    super(element, { classes: ["empty-view-scroller"] });
    this.#header = header;
    this.#text = text;
    this.#link = void 0;
    this.#view = view;
    this.performUpdate();
  }
  set link(link3) {
    this.#link = link3;
    this.performUpdate();
  }
  set text(text) {
    this.#text = text;
    this.performUpdate();
  }
  set header(header) {
    this.#header = header;
    this.performUpdate();
  }
  performUpdate() {
    if (this.#firstUpdate) {
      this.#extraElements = [...this.element.children];
      this.#firstUpdate = false;
    }
    const output = { contentElement: void 0 };
    this.#view({ header: this.#header, text: this.#text, link: this.#link, extraElements: this.#extraElements }, output, this.element);
    if (output.contentElement) {
      this.contentElement = output.contentElement;
    }
  }
};

// gen/front_end/ui/legacy/FilterBar.js
var FilterBar_exports = {};
__export(FilterBar_exports, {
  CheckboxFilterUI: () => CheckboxFilterUI,
  FilterBar: () => FilterBar,
  NamedBitSetFilterUI: () => NamedBitSetFilterUI,
  NamedBitSetFilterUIElement: () => NamedBitSetFilterUIElement,
  TextFilterUI: () => TextFilterUI
});
import * as Common16 from "./../../core/common/common.js";
import * as Host9 from "./../../core/host/host.js";
import * as i18n25 from "./../../core/i18n/i18n.js";
import * as Platform19 from "./../../core/platform/platform.js";
import * as VisualLogging18 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/filter.css.js
var filter_css_default = `/*
 * Copyright 2013 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.filter-bar,
.filter-bar.hbox {
  background-color: var(--sys-color-cdt-base-container);
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  border-bottom: 1px solid var(--sys-color-divider);
  color: var(--sys-color-on-surface-subtle);
}

.text-filter {
  flex-grow: 1;
  min-width: var(--sys-size-25);
  max-width: var(--sys-size-36);
}

.filter-bitset-filter {
  padding: 2px;
  display: inline-flex;
  overflow: hidden;
  min-height: var(--sys-size-11);
  height: auto;
  flex-wrap: wrap;
  row-gap: var(--sys-size-2);
  position: relative;
  margin: 0;
}

.filter-bitset-filter span {
  color: var(--sys-color-on-surface);
  outline: 1px solid var(--sys-color-neutral-outline);
  outline-offset: -1px;
  box-sizing: border-box;
  display: inline-block;
  flex: none;
  margin: auto 2px;
  padding: 3px 6px;
  background: transparent;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  font-weight: 500;
  font-size: 11px;
}

.filter-bitset-filter span:focus-visible {
  outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
}

.filter-bitset-filter span:hover {
  background: var(--sys-color-state-hover-on-subtle);
}

.filter-bitset-filter span:hover:not(:focus-visible) {
  outline: none;
}

.filter-bitset-filter span.selected,
.filter-bitset-filter span:active {
  color: var(--sys-color-on-tonal-container);
  background-color: var(--sys-color-tonal-container);
}

.filter-bitset-filter span.selected:not(:focus-visible),
.filter-bitset-filter span:active:not(:focus-visible) {
  outline: none;
}

.filter-bitset-filter-divider {
  background-color: var(--sys-color-divider);
  height: 16px;
  width: 1px;
  margin: auto 2px;
  display: inline-block;
}

.filter-checkbox-filter {
  padding-left: 1px;
  padding-right: 7px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  display: inline-flex;
  vertical-align: middle;
  height: 24px;
  position: relative;
}

.filter-checkbox-filter > devtools-checkbox {
  display: flex;
  margin: auto 0;
}

.toolbar-has-dropdown-shrinkable {
  flex-shrink: 1;
}

.filter-divider {
  background-color: var(--sys-color-divider);
  width: 1px;
  margin: 5px 4px;
  height: 16px;
}

.toolbar-button {
  white-space: nowrap;
  overflow: hidden;
  min-width: 28px;
  background: transparent;
  border-radius: 0;
}

.toolbar-button .active-filters-count {
  margin-right: 5px;

  --override-adorner-background-color: var(--sys-color-tonal-container);
  --override-adorner-border-color: var(--sys-color-tonal-container);
  --override-adorner-text-color: var(--sys-color-primary);
  --override-adorner-font-size: 10px;

  font-weight: 700;
}

.toolbar-text {
  margin: 0 4px 0 0;
  text-overflow: ellipsis;
  flex: auto;
  overflow: hidden;
  text-align: right;
}

.dropdown-filterbar {
  justify-content: space-between;
  align-items: center;
  height: var(--sys-size-9);
  margin: 0 var(--sys-size-3) 0 var(--sys-size-5);
  border: none;
  border-radius: var(--sys-shape-corner-extra-small);
  display: flex;
  background-color: transparent;
  color: var(--sys-color-on-surface-subtle);

  .toolbar-dropdown-arrow {
    top: var(--sys-size-1);
  }

  &:hover {
    background-color: var(--sys-color-state-hover-on-subtle);
  }

  &:active {
    background-color: var(--sys-color-state-ripple-neutral-on-subtle);
  }

  &:hover:active {
    background:
      linear-gradient(var(--sys-color-state-hover-on-subtle), var(--sys-color-state-hover-on-subtle)),
      linear-gradient(var(--sys-color-state-ripple-neutral-on-subtle), var(--sys-color-state-ripple-neutral-on-subtle));
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-state-focus-ring);
  }
}

@media (forced-colors: active) {
  .filter-bitset-filter span:hover,
  .filter-bitset-filter span.selected,
  .filter-bitset-filter span:active {
    forced-color-adjust: none;
    background: Highlight;
    color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./filter.css")} */`;

// gen/front_end/ui/legacy/FilterBar.js
var UIStrings13 = {
  /**
   * @description Text to filter result items
   */
  filter: "Filter",
  /**
   * @description Text that appears when hover over the filter bar in the Network tool
   */
  egSmalldUrlacomb: "e.g. `/small[d]+/ url:a.com/b`",
  /**
   * @description Text that appears when hover over the All button in the Network tool
   * @example {Ctrl + } PH1
   */
  sclickToSelectMultipleTypes: "{PH1}Click to select multiple types",
  /**
   * @description Text for everything
   */
  allStrings: "All"
};
var str_13 = i18n25.i18n.registerUIStrings("ui/legacy/FilterBar.ts", UIStrings13);
var i18nString13 = i18n25.i18n.getLocalizedString.bind(void 0, str_13);
var FilterBar = class extends Common16.ObjectWrapper.eventMixin(HBox) {
  enabled;
  stateSetting;
  #filterButton;
  filters;
  alwaysShowFilters;
  showingWidget;
  constructor(name, visibleByDefault) {
    super();
    this.registerRequiredCSS(filter_css_default);
    this.enabled = true;
    this.element.classList.add("filter-bar");
    this.element.setAttribute("jslog", `${VisualLogging18.toolbar("filter-bar")}`);
    this.stateSetting = Common16.Settings.Settings.instance().createSetting("filter-bar-" + name + "-toggled", Boolean(visibleByDefault));
    this.#filterButton = new ToolbarSettingToggle(this.stateSetting, "filter", i18nString13(UIStrings13.filter), "filter-filled", "filter");
    this.#filterButton.element.style.setProperty("--dot-toggle-top", "13px");
    this.#filterButton.element.style.setProperty("--dot-toggle-left", "14px");
    this.filters = [];
    this.updateFilterBar();
    this.stateSetting.addChangeListener(this.updateFilterBar.bind(this));
  }
  filterButton() {
    return this.#filterButton;
  }
  addDivider() {
    const element = document.createElement("div");
    element.classList.add("filter-divider");
    this.element.appendChild(element);
  }
  addFilter(filter) {
    this.filters.push(filter);
    this.element.appendChild(filter.element());
    filter.addEventListener("FilterChanged", this.filterChanged, this);
    this.updateFilterButton();
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    this.#filterButton.setEnabled(enabled);
    this.updateFilterBar();
  }
  filterChanged() {
    this.updateFilterButton();
    this.dispatchEventToListeners(
      "Changed"
      /* FilterBarEvents.CHANGED */
    );
  }
  wasShown() {
    super.wasShown();
    this.updateFilterBar();
  }
  updateFilterBar() {
    if (!this.parentWidget() || this.showingWidget) {
      return;
    }
    if (this.visible()) {
      this.showingWidget = true;
      this.showWidget();
      this.showingWidget = false;
    } else {
      this.hideWidget();
    }
  }
  focus() {
    for (let i = 0; i < this.filters.length; ++i) {
      if (this.filters[i] instanceof TextFilterUI) {
        const textFilterUI = this.filters[i];
        textFilterUI.focus();
        break;
      }
    }
  }
  hasActiveFilter() {
    for (const filter of this.filters) {
      if (filter.isActive()) {
        return true;
      }
    }
    return false;
  }
  updateFilterButton() {
    const isActive = this.hasActiveFilter();
    this.#filterButton.setChecked(isActive);
  }
  clear() {
    this.element.removeChildren();
    this.filters = [];
    this.updateFilterButton();
  }
  setting() {
    return this.stateSetting;
  }
  visible() {
    return this.alwaysShowFilters || this.stateSetting.get() && this.enabled;
  }
};
var TextFilterUI = class extends Common16.ObjectWrapper.ObjectWrapper {
  filterElement;
  #filter;
  suggestionProvider;
  constructor() {
    super();
    this.filterElement = document.createElement("div");
    this.filterElement.classList.add("text-filter");
    const filterToolbar = this.filterElement.createChild("devtools-toolbar");
    filterToolbar.style.borderBottom = "none";
    this.#filter = new ToolbarFilter(void 0, 1, 1, i18nString13(UIStrings13.egSmalldUrlacomb), this.completions.bind(this));
    filterToolbar.appendToolbarItem(this.#filter);
    this.#filter.addEventListener("TextChanged", () => this.valueChanged());
    this.suggestionProvider = null;
  }
  completions(expression, prefix, force) {
    if (this.suggestionProvider) {
      return this.suggestionProvider(expression, prefix, force);
    }
    return Promise.resolve([]);
  }
  isActive() {
    return Boolean(this.#filter.valueWithoutSuggestion());
  }
  element() {
    return this.filterElement;
  }
  value() {
    return this.#filter.valueWithoutSuggestion();
  }
  setValue(value) {
    this.#filter.setValue(value);
    this.valueChanged();
  }
  focus() {
    this.#filter.focus();
  }
  setSuggestionProvider(suggestionProvider) {
    this.#filter.clearAutocomplete();
    this.suggestionProvider = suggestionProvider;
  }
  valueChanged() {
    this.dispatchEventToListeners(
      "FilterChanged"
      /* FilterUIEvents.FILTER_CHANGED */
    );
  }
  clear() {
    this.setValue("");
  }
};
var NamedBitSetFilterUIElement = class extends HTMLElement {
  #options = { items: [] };
  #shadow = this.attachShadow({ mode: "open" });
  #namedBitSetFilterUI;
  set options(options) {
    if (this.#options.items.toString() === options.items.toString() && this.#options.setting === options.setting) {
      return;
    }
    this.#options = options;
    this.#shadow.innerHTML = "";
    this.#namedBitSetFilterUI = void 0;
  }
  getOrCreateNamedBitSetFilterUI() {
    if (this.#namedBitSetFilterUI) {
      return this.#namedBitSetFilterUI;
    }
    const namedBitSetFilterUI = new NamedBitSetFilterUI(this.#options.items, this.#options.setting);
    namedBitSetFilterUI.element().classList.add("named-bitset-filter");
    const styleElement = this.#shadow.createChild("style");
    styleElement.textContent = filter_css_default;
    const disclosureElement = this.#shadow.createChild("div", "named-bit-set-filter-disclosure");
    disclosureElement.appendChild(namedBitSetFilterUI.element());
    namedBitSetFilterUI.addEventListener("FilterChanged", this.#filterChanged.bind(this));
    this.#namedBitSetFilterUI = namedBitSetFilterUI;
    return this.#namedBitSetFilterUI;
  }
  #filterChanged() {
    const domEvent = new CustomEvent("filterChanged");
    this.dispatchEvent(domEvent);
  }
};
customElements.define("devtools-named-bit-set-filter", NamedBitSetFilterUIElement);
var NamedBitSetFilterUI = class _NamedBitSetFilterUI extends Common16.ObjectWrapper.ObjectWrapper {
  filtersElement;
  typeFilterElementTypeNames = /* @__PURE__ */ new WeakMap();
  allowedTypes = /* @__PURE__ */ new Set();
  typeFilterElements = [];
  setting;
  constructor(items, setting) {
    super();
    this.filtersElement = document.createElement("div");
    this.filtersElement.classList.add("filter-bitset-filter");
    this.filtersElement.setAttribute("jslog", `${VisualLogging18.section("filter-bitset")}`);
    markAsListBox(this.filtersElement);
    markAsMultiSelectable(this.filtersElement);
    Tooltip.install(this.filtersElement, i18nString13(UIStrings13.sclickToSelectMultipleTypes, {
      PH1: KeyboardShortcut.shortcutToString("", Modifiers.CtrlOrMeta.value)
    }));
    this.addBit(_NamedBitSetFilterUI.ALL_TYPES, i18nString13(UIStrings13.allStrings), _NamedBitSetFilterUI.ALL_TYPES);
    this.typeFilterElements[0].tabIndex = 0;
    this.filtersElement.createChild("div", "filter-bitset-filter-divider");
    for (let i = 0; i < items.length; ++i) {
      this.addBit(items[i].name, items[i].label(), items[i].jslogContext, items[i].title);
    }
    if (setting) {
      this.setting = setting;
      setting.addChangeListener(this.settingChanged.bind(this));
      this.settingChanged();
    } else {
      this.toggleTypeFilter(
        _NamedBitSetFilterUI.ALL_TYPES,
        false
        /* allowMultiSelect */
      );
    }
  }
  reset() {
    this.toggleTypeFilter(
      _NamedBitSetFilterUI.ALL_TYPES,
      false
      /* allowMultiSelect */
    );
  }
  isActive() {
    return !this.allowedTypes.has(_NamedBitSetFilterUI.ALL_TYPES);
  }
  element() {
    return this.filtersElement;
  }
  accept(typeName) {
    return this.allowedTypes.has(_NamedBitSetFilterUI.ALL_TYPES) || this.allowedTypes.has(typeName);
  }
  settingChanged() {
    const allowedTypesFromSetting = this.setting.get();
    this.allowedTypes = /* @__PURE__ */ new Set();
    for (const element of this.typeFilterElements) {
      const typeName = this.typeFilterElementTypeNames.get(element);
      if (typeName && allowedTypesFromSetting[typeName]) {
        this.allowedTypes.add(typeName);
      }
    }
    this.update();
  }
  update() {
    if (this.allowedTypes.size === 0 || this.allowedTypes.has(_NamedBitSetFilterUI.ALL_TYPES)) {
      this.allowedTypes = /* @__PURE__ */ new Set();
      this.allowedTypes.add(_NamedBitSetFilterUI.ALL_TYPES);
    }
    for (const element of this.typeFilterElements) {
      const typeName = this.typeFilterElementTypeNames.get(element);
      const active = this.allowedTypes.has(typeName || "");
      element.classList.toggle("selected", active);
      setSelected(element, active);
    }
    this.dispatchEventToListeners(
      "FilterChanged"
      /* FilterUIEvents.FILTER_CHANGED */
    );
  }
  addBit(name, label, jslogContext, title) {
    const typeFilterElement = this.filtersElement.createChild("span", name);
    typeFilterElement.tabIndex = -1;
    this.typeFilterElementTypeNames.set(typeFilterElement, name);
    createTextChild(typeFilterElement, label);
    markAsOption(typeFilterElement);
    if (title) {
      typeFilterElement.title = title;
    }
    typeFilterElement.addEventListener("click", this.onTypeFilterClicked.bind(this), false);
    typeFilterElement.addEventListener("keydown", this.onTypeFilterKeydown.bind(this), false);
    typeFilterElement.setAttribute("jslog", `${VisualLogging18.item(jslogContext).track({ click: true })}`);
    this.typeFilterElements.push(typeFilterElement);
  }
  onTypeFilterClicked(event) {
    const e = event;
    let toggle6;
    if (Host9.Platform.isMac()) {
      toggle6 = e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
    } else {
      toggle6 = e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
    }
    if (e.target) {
      const element = e.target;
      const typeName = this.typeFilterElementTypeNames.get(element);
      this.toggleTypeFilter(typeName, toggle6);
    }
  }
  onTypeFilterKeydown(event) {
    const element = event.target;
    if (!element) {
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "Tab" && event.shiftKey) {
      if (this.keyFocusNextBit(
        element,
        true
        /* selectPrevious */
      )) {
        event.consume(true);
      }
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "Tab" && !event.shiftKey) {
      if (this.keyFocusNextBit(
        element,
        false
        /* selectPrevious */
      )) {
        event.consume(true);
      }
    } else if (Platform19.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      this.onTypeFilterClicked(event);
    }
  }
  keyFocusNextBit(target, selectPrevious) {
    let index = this.typeFilterElements.indexOf(target);
    if (index === -1) {
      index = this.typeFilterElements.findIndex((el) => el.classList.contains("selected"));
      if (index === -1) {
        index = selectPrevious ? this.typeFilterElements.length : -1;
      }
    }
    const nextIndex = selectPrevious ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= this.typeFilterElements.length) {
      return false;
    }
    const nextElement = this.typeFilterElements[nextIndex];
    nextElement.tabIndex = 0;
    target.tabIndex = -1;
    nextElement.focus();
    return true;
  }
  toggleTypeFilter(typeName, allowMultiSelect) {
    if (allowMultiSelect && typeName !== _NamedBitSetFilterUI.ALL_TYPES) {
      this.allowedTypes.delete(_NamedBitSetFilterUI.ALL_TYPES);
    } else {
      this.allowedTypes = /* @__PURE__ */ new Set();
    }
    if (this.allowedTypes.has(typeName)) {
      this.allowedTypes.delete(typeName);
    } else {
      this.allowedTypes.add(typeName);
    }
    if (this.allowedTypes.size === 0) {
      this.allowedTypes.add(_NamedBitSetFilterUI.ALL_TYPES);
    }
    if (this.setting) {
      const updatedSetting = {};
      for (const type of this.allowedTypes) {
        updatedSetting[type] = true;
      }
      this.setting.set(updatedSetting);
    } else {
      this.update();
    }
  }
  static ALL_TYPES = "all";
};
var CheckboxFilterUI = class extends Common16.ObjectWrapper.ObjectWrapper {
  filterElement;
  activeWhenChecked;
  checkbox;
  constructor(title, activeWhenChecked, setting, jslogContext) {
    super();
    this.filterElement = document.createElement("div");
    this.filterElement.classList.add("filter-checkbox-filter");
    this.activeWhenChecked = Boolean(activeWhenChecked);
    this.checkbox = CheckboxLabel.create(title, void 0, void 0, jslogContext);
    this.filterElement.appendChild(this.checkbox);
    if (setting) {
      bindCheckbox(this.checkbox, setting);
    } else {
      this.checkbox.checked = true;
    }
    this.checkbox.addEventListener("change", this.fireUpdated.bind(this), false);
  }
  isActive() {
    return this.activeWhenChecked === this.checkbox.checked;
  }
  checked() {
    return this.checkbox.checked;
  }
  setChecked(checked) {
    this.checkbox.checked = checked;
  }
  element() {
    return this.filterElement;
  }
  labelElement() {
    return this.checkbox;
  }
  fireUpdated() {
    this.dispatchEventToListeners(
      "FilterChanged"
      /* FilterUIEvents.FILTER_CHANGED */
    );
  }
};

// gen/front_end/ui/legacy/FilterSuggestionBuilder.js
var FilterSuggestionBuilder_exports = {};
__export(FilterSuggestionBuilder_exports, {
  FilterSuggestionBuilder: () => FilterSuggestionBuilder
});
import * as Platform20 from "./../../core/platform/platform.js";
var FilterSuggestionBuilder = class {
  keys;
  valueSorter;
  valuesMap = /* @__PURE__ */ new Map();
  constructor(keys, valueSorter) {
    this.keys = keys;
    this.valueSorter = valueSorter || ((_, result) => result.sort());
  }
  completions(_expression, prefix, force) {
    if (!prefix && !force) {
      return Promise.resolve([]);
    }
    const negative = prefix.startsWith("-");
    if (negative) {
      prefix = prefix.substring(1);
    }
    const modifier = negative ? "-" : "";
    const valueDelimiterIndex = prefix.indexOf(":");
    const suggestions = [];
    if (valueDelimiterIndex === -1) {
      const matcher = new RegExp("^" + Platform20.StringUtilities.escapeForRegExp(prefix), "i");
      for (const key of this.keys) {
        if (matcher.test(key)) {
          suggestions.push({ text: modifier + key + ":" });
        }
      }
    } else {
      const key = prefix.substring(0, valueDelimiterIndex).toLowerCase();
      const value = prefix.substring(valueDelimiterIndex + 1);
      const matcher = new RegExp("^" + Platform20.StringUtilities.escapeForRegExp(value), "i");
      const values = Array.from(this.valuesMap.get(key) || /* @__PURE__ */ new Set());
      this.valueSorter(key, values);
      for (const item8 of values) {
        if (matcher.test(item8) && item8 !== value) {
          suggestions.push({ text: modifier + key + ":" + item8 });
        }
      }
    }
    return Promise.resolve(suggestions);
  }
  addItem(key, value) {
    if (!value) {
      return;
    }
    let set = this.valuesMap.get(key);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this.valuesMap.set(key, set);
    }
    set.add(value);
  }
  clear() {
    this.valuesMap.clear();
  }
};

// gen/front_end/ui/legacy/ForwardedInputEventHandler.js
var ForwardedInputEventHandler_exports = {};
__export(ForwardedInputEventHandler_exports, {
  ForwardedInputEventHandler: () => ForwardedInputEventHandler
});
import * as Host10 from "./../../core/host/host.js";
var ForwardedInputEventHandler = class {
  constructor() {
    Host10.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host10.InspectorFrontendHostAPI.Events.KeyEventUnhandled, this.onKeyEventUnhandled, this);
  }
  async onKeyEventUnhandled(event) {
    const { type, key, keyCode, modifiers } = event.data;
    if (type !== "keydown") {
      return;
    }
    const context = Context.instance();
    const shortcutRegistry = ShortcutRegistry.instance();
    context.setFlavor(ForwardedShortcut, ForwardedShortcut.instance);
    await shortcutRegistry.handleKey(KeyboardShortcut.makeKey(keyCode, modifiers), key);
    context.setFlavor(ForwardedShortcut, null);
  }
};
new ForwardedInputEventHandler();

// gen/front_end/ui/legacy/InplaceEditor.js
var InplaceEditor_exports = {};
__export(InplaceEditor_exports, {
  Config: () => Config,
  InplaceEditor: () => InplaceEditor
});
import * as Platform21 from "./../../core/platform/platform.js";
var inplaceEditorInstance = null;
var InplaceEditor = class _InplaceEditor {
  focusRestorer;
  static startEditing(element, config) {
    if (!inplaceEditorInstance) {
      inplaceEditorInstance = new _InplaceEditor();
    }
    return inplaceEditorInstance.startEditing(element, config);
  }
  editorContent(editingContext) {
    const element = editingContext.element;
    if (element.tagName === "INPUT" && element.type === "text") {
      return element.value;
    }
    return element.textContent || "";
  }
  setUpEditor(editingContext) {
    const element = editingContext.element;
    element.classList.add("editing");
    element.setAttribute("contenteditable", "plaintext-only");
    const oldRole = element.getAttribute("role");
    markAsTextBox(element);
    editingContext.oldRole = oldRole;
    const oldTabIndex = element.getAttribute("tabIndex");
    if (typeof oldTabIndex !== "number" || oldTabIndex < 0) {
      element.tabIndex = 0;
    }
    this.focusRestorer = new ElementFocusRestorer(element);
    editingContext.oldTabIndex = oldTabIndex;
  }
  closeEditor(editingContext) {
    const element = editingContext.element;
    element.classList.remove("editing");
    element.removeAttribute("contenteditable");
    if (typeof editingContext.oldRole !== "string") {
      element.removeAttribute("role");
    } else {
      element.setAttribute("role", editingContext.oldRole);
    }
    if (typeof editingContext.oldTabIndex !== "number") {
      element.removeAttribute("tabIndex");
    } else {
      element.setAttribute("tabIndex", editingContext.oldTabIndex);
    }
    element.scrollTop = 0;
    element.scrollLeft = 0;
  }
  cancelEditing(editingContext) {
    const element = editingContext.element;
    if (element.tagName === "INPUT" && element.type === "text") {
      element.value = editingContext.oldText || "";
    } else {
      element.textContent = editingContext.oldText;
    }
  }
  startEditing(element, config) {
    if (!markBeingEdited(element, true)) {
      return null;
    }
    const editingContext = { element, config, oldRole: null, oldTabIndex: null, oldText: null };
    const committedCallback = config.commitHandler;
    const cancelledCallback = config.cancelHandler;
    const pasteCallback = config.pasteHandler;
    const context = config.context;
    let moveDirection = "";
    const self2 = this;
    this.setUpEditor(editingContext);
    editingContext.oldText = this.editorContent(editingContext);
    function blurEventListener(e) {
      if (!config.blurHandler(element, e)) {
        return;
      }
      editingCommitted.call(element);
    }
    function cleanUpAfterEditing() {
      markBeingEdited(element, false);
      element.removeEventListener("blur", blurEventListener, false);
      element.removeEventListener("keydown", keyDownEventListener, true);
      if (pasteCallback) {
        element.removeEventListener("paste", pasteEventListener, true);
      }
      if (self2.focusRestorer) {
        self2.focusRestorer.restore();
      }
      self2.closeEditor(editingContext);
    }
    function editingCancelled() {
      self2.cancelEditing(editingContext);
      cleanUpAfterEditing();
      cancelledCallback(this, context);
    }
    function editingCommitted() {
      cleanUpAfterEditing();
      committedCallback(this, self2.editorContent(editingContext), editingContext.oldText, context, moveDirection);
      element.dispatchEvent(new Event("change"));
    }
    function defaultFinishHandler(event) {
      if (event.key === "Enter") {
        return "commit";
      }
      if (event.keyCode === Keys.Esc.code || event.key === Platform21.KeyboardUtilities.ESCAPE_KEY) {
        return "cancel";
      }
      if (event.key === "Tab") {
        return "move-" + (event.shiftKey ? "backward" : "forward");
      }
      return "";
    }
    function handleEditingResult(result, event) {
      if (result === "commit") {
        editingCommitted.call(element);
        event.consume(true);
      } else if (result === "cancel") {
        editingCancelled.call(element);
        event.consume(true);
      } else if (result?.startsWith("move-")) {
        moveDirection = result.substring(5);
        if (event.key === "Tab") {
          event.consume(true);
        }
        blurEventListener();
      }
    }
    function pasteEventListener(event) {
      if (!pasteCallback) {
        return;
      }
      const result = pasteCallback(event);
      handleEditingResult(result, event);
    }
    function keyDownEventListener(event) {
      let result = defaultFinishHandler(event);
      if (!result && config.postKeydownFinishHandler) {
        const postKeydownResult = config.postKeydownFinishHandler(event);
        if (postKeydownResult) {
          result = postKeydownResult;
        }
      }
      handleEditingResult(result, event);
    }
    element.addEventListener("blur", blurEventListener, false);
    element.addEventListener("keydown", keyDownEventListener, true);
    if (pasteCallback !== void 0) {
      element.addEventListener("paste", pasteEventListener, true);
    }
    const handle = { cancel: editingCancelled.bind(element), commit: editingCommitted.bind(element) };
    return handle;
  }
};
var Config = class {
  commitHandler;
  cancelHandler;
  context;
  blurHandler;
  pasteHandler;
  postKeydownFinishHandler;
  constructor(commitHandler, cancelHandler, context, blurHandler = () => true) {
    this.commitHandler = commitHandler;
    this.cancelHandler = cancelHandler;
    this.context = context;
    this.blurHandler = blurHandler;
  }
  setPostKeydownFinishHandler(postKeydownFinishHandler) {
    this.postKeydownFinishHandler = postKeydownFinishHandler;
  }
};

// gen/front_end/ui/legacy/ListWidget.js
var ListWidget_exports = {};
__export(ListWidget_exports, {
  Editor: () => Editor,
  ListWidget: () => ListWidget
});
import * as i18n27 from "./../../core/i18n/i18n.js";
import * as Platform22 from "./../../core/platform/platform.js";
import * as Buttons7 from "./../components/buttons/buttons.js";
import { html as html4, render as render4 } from "./../lit/lit.js";
import * as VisualLogging19 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/listWidget.css.js
var listWidget_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.list {
  flex: auto 0 1;
  overflow-y: auto;
  flex-direction: column;

  --override-background-list-item-color: hsl(0deg 0% 96%);

  &:has(div) {
    border: var(--sys-size-1) solid var(--sys-color-divider);
  }
}

.theme-with-dark-background .list,
:host-context(.theme-with-dark-background) .list {
  --override-background-list-item-color: hsl(0deg 0% 16%);
}

.list-separator {
  background: var(--sys-color-divider);
  height: 1px;
}

.list-item {
  flex: none;
  min-height: 30px;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.list-item:focus-within:not(:active) {
  background: var(--sys-color-state-hover-on-subtle);
}

.list-widget-input-validation-error {
  color: var(--sys-color-error);
  margin: 0 5px;
}

.controls-container {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: stretch;
  pointer-events: none;
}

.controls-gradient {
  flex: 0 1 50px;

  .list-item:hover & {
    background-image: linear-gradient(90deg, transparent, var(--sys-color-cdt-base-container));
  }

  .list-item:focus-within:not(:active) & {
    background-image: linear-gradient(90deg, transparent, var(--override-background-list-item-color));
  }
}

.controls-buttons {
  flex: none;
  display: flex;
  flex-direction: row;
  align-items: center;
  pointer-events: auto;
  visibility: hidden;
  background-color: var(--sys-color-cdt-base-container);

  .list-item:hover & {
    visibility: visible;
  }

  .list-item:focus-within:not(:active) & {
    background-color: var(--override-background-list-item-color);
    visibility: visible;
  }
}

.editor-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: none;
  background: var(--sys-color-surface3);
  overflow: hidden;
}

.editor-content {
  flex: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.editor-buttons {
  flex: none;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  gap: var(--sys-size-6);
}

.editor-buttons > button {
  flex: none;
  margin-right: 10px;
}

.editor-content input {
  margin-right: 10px;
}

.editor-content input.error-input {
  background-color: var(--sys-color-cdt-base-container);
}

.text-prompt-container {
  padding: 3px 6px;
  height: 24px;
  border: none;
  box-shadow: var(--legacy-focus-ring-inactive-shadow);
  border-radius: 2px;
  width: 100%;
  background-color: var(--sys-color-cdt-base-container);

  &:focus {
    border: 1px solid var(--sys-color-state-focus-ring);
  }

  & .text-prompt {
    width: 100%;
  }
}

@media (forced-colors: active) {
  .list-item:focus-within .controls-buttons,
  .list-item:hover .controls-buttons {
    background-color: canvas;
  }

  .list-item:focus-within,
  .list-item:hover {
    forced-color-adjust: none;
    background: Highlight;
  }

  .list-item:focus-within *,
  .list-item:hover * {
    color: HighlightText;
  }

  .list-item:focus-within .controls-gradient,
  .list-item:hover .controls-gradient {
    background-image: unset;
  }
}

/*# sourceURL=${import.meta.resolve("./listWidget.css")} */`;

// gen/front_end/ui/legacy/ListWidget.js
var UIStrings14 = {
  /**
   * @description Text on a button to start editing text
   */
  editString: "Edit",
  /**
   * @description Label for an item to remove something
   */
  removeString: "Remove",
  /**
   * @description Text to save something
   */
  saveString: "Save",
  /**
   * @description Text to add something
   */
  addString: "Add",
  /**
   * @description Text to cancel something
   */
  cancelString: "Cancel",
  /**
   * @description Text for screen reader to announce that an item has been saved.
   */
  changesSaved: "Changes to item have been saved",
  /**
   * @description Text for screen reader to announce that an item has been removed.
   */
  removedItem: "Item has been removed"
};
var str_14 = i18n27.i18n.registerUIStrings("ui/legacy/ListWidget.ts", UIStrings14);
var i18nString14 = i18n27.i18n.getLocalizedString.bind(void 0, str_14);
var ListWidget = class extends VBox {
  delegate;
  list;
  lastSeparator;
  focusRestorer;
  items;
  editable;
  elements;
  editor;
  editItem;
  editElement;
  emptyPlaceholder;
  isTable;
  constructor(delegate, delegatesFocus = true, isTable = false) {
    super({ useShadowDom: true, delegatesFocus });
    this.registerRequiredCSS(listWidget_css_default);
    this.delegate = delegate;
    this.list = this.contentElement.createChild("div", "list");
    this.lastSeparator = false;
    this.focusRestorer = null;
    this.items = [];
    this.editable = [];
    this.elements = [];
    this.editor = null;
    this.editItem = null;
    this.editElement = null;
    this.emptyPlaceholder = null;
    this.isTable = isTable;
    if (isTable) {
      this.list.role = "table";
    }
    this.updatePlaceholder();
  }
  clear() {
    this.items = [];
    this.editable = [];
    this.elements = [];
    this.lastSeparator = false;
    this.list.removeChildren();
    this.updatePlaceholder();
    this.stopEditing();
  }
  appendItem(item8, editable) {
    if (this.lastSeparator && this.items.length) {
      const element2 = document.createElement("div");
      element2.classList.add("list-separator");
      if (this.isTable) {
        element2.role = "rowgroup";
      }
      this.list.appendChild(element2);
    }
    this.lastSeparator = false;
    this.items.push(item8);
    this.editable.push(editable);
    const element = this.list.createChild("div", "list-item");
    if (this.isTable) {
      element.role = "rowgroup";
    }
    const content = this.delegate.renderItem(item8, editable, this.items.length - 1);
    if (!content.hasAttribute("jslog")) {
      element.setAttribute("jslog", `${VisualLogging19.item()}`);
    }
    element.appendChild(content);
    if (editable) {
      element.classList.add("editable");
      element.tabIndex = 0;
      element.appendChild(this.createControls(item8, element));
    }
    this.elements.push(element);
    this.updatePlaceholder();
  }
  appendSeparator() {
    this.lastSeparator = true;
  }
  removeItem(index) {
    if (this.editItem === this.items[index]) {
      this.stopEditing();
    }
    const element = this.elements[index];
    const previous = element.previousElementSibling;
    const previousIsSeparator = previous?.classList.contains("list-separator");
    const next = element.nextElementSibling;
    const nextIsSeparator = next?.classList.contains("list-separator");
    if (previousIsSeparator && (nextIsSeparator || !next)) {
      previous?.remove();
    }
    if (nextIsSeparator && !previous) {
      next?.remove();
    }
    element.remove();
    this.elements.splice(index, 1);
    this.items.splice(index, 1);
    this.editable.splice(index, 1);
    this.updatePlaceholder();
  }
  addNewItem(index, item8) {
    this.startEditing(item8, null, this.elements[index] || null);
  }
  setEmptyPlaceholder(element) {
    this.emptyPlaceholder = element;
    this.updatePlaceholder();
  }
  createControls(item8, element) {
    const controls = document.createElement("div");
    controls.classList.add("controls-container");
    controls.classList.add("fill");
    render4(html4`
      <div class="controls-gradient"></div>
      <div class="controls-buttons">
        <devtools-toolbar>
          <devtools-button class=toolbar-button
                           .iconName=${"edit"}
                           .jslogContext=${"edit-item"}
                           .title=${i18nString14(UIStrings14.editString)}
                           .variant=${"icon"}
                           @click=${onEditClicked}></devtools-button>
          <devtools-button class=toolbar-button
                           .iconName=${"bin"}
                           .jslogContext=${"remove-item"}
                           .title=${i18nString14(UIStrings14.removeString)}
                           .variant=${"icon"}
                           @click=${onRemoveClicked}></devtools-button>
        </devtools-toolbar>
      </div>`, controls, { host: this });
    return controls;
    function onEditClicked() {
      const index = this.elements.indexOf(element);
      const insertionPoint = this.elements[index + 1] || null;
      this.startEditing(item8, element, insertionPoint);
    }
    function onRemoveClicked() {
      const index = this.elements.indexOf(element);
      this.element.focus();
      this.delegate.removeItemRequested(this.items[index], index);
      LiveAnnouncer.alert(i18nString14(UIStrings14.removedItem));
      if (this.elements.length >= 1) {
        this.elements[Math.min(index, this.elements.length - 1)].focus();
      }
    }
  }
  wasShown() {
    super.wasShown();
    this.stopEditing();
  }
  updatePlaceholder() {
    if (!this.emptyPlaceholder) {
      return;
    }
    if (!this.elements.length && !this.editor) {
      this.list.appendChild(this.emptyPlaceholder);
    } else {
      this.emptyPlaceholder.remove();
    }
  }
  startEditing(item8, element, insertionPoint) {
    if (element && this.editElement === element) {
      return;
    }
    this.stopEditing();
    this.focusRestorer = new ElementFocusRestorer(this.element);
    this.list.classList.add("list-editing");
    this.element.classList.add("list-editing");
    this.editItem = item8;
    this.editElement = element;
    if (element) {
      element.classList.add("hidden");
    }
    const index = element ? this.elements.indexOf(element) : -1;
    this.editor = this.delegate.beginEdit(item8);
    this.updatePlaceholder();
    this.list.insertBefore(this.editor.element, insertionPoint);
    this.editor.beginEdit(item8, index, element ? i18nString14(UIStrings14.saveString) : i18nString14(UIStrings14.addString), this.commitEditing.bind(this), this.stopEditing.bind(this));
  }
  commitEditing() {
    const editItem = this.editItem;
    const isNew = !this.editElement;
    const editor = this.editor;
    const focusElementIndex = this.editElement ? this.elements.indexOf(this.editElement) : this.elements.length - 1;
    this.stopEditing();
    if (editItem !== null) {
      this.delegate.commitEdit(editItem, editor, isNew);
      LiveAnnouncer.alert(i18nString14(UIStrings14.changesSaved));
      if (this.elements[focusElementIndex]) {
        this.elements[focusElementIndex].focus();
      }
    }
  }
  stopEditing() {
    this.list.classList.remove("list-editing");
    this.element.classList.remove("list-editing");
    if (this.focusRestorer) {
      this.focusRestorer.restore();
    }
    if (this.editElement) {
      this.editElement.classList.remove("hidden");
    }
    if (this.editor?.element.parentElement) {
      this.editor.element.remove();
    }
    this.editor = null;
    this.editItem = null;
    this.editElement = null;
    this.updatePlaceholder();
  }
};
var Editor = class {
  element;
  #contentElement;
  commitButton;
  cancelButton;
  errorMessageContainer;
  controls = [];
  controlByName = /* @__PURE__ */ new Map();
  validators = [];
  commit = null;
  cancel = null;
  item = null;
  index = -1;
  constructor() {
    this.element = document.createElement("div");
    this.element.classList.add("editor-container");
    this.element.setAttribute("jslog", `${VisualLogging19.pane("editor").track({ resize: true })}`);
    this.element.addEventListener("keydown", onKeyDown.bind(null, Platform22.KeyboardUtilities.isEscKey, this.cancelClicked.bind(this)), false);
    this.#contentElement = this.element.createChild("div", "editor-content");
    this.#contentElement.addEventListener("keydown", onKeyDown.bind(null, (event) => {
      if (event.key !== "Enter") {
        return false;
      }
      if (event.target instanceof HTMLSelectElement) {
        return false;
      }
      return true;
    }, this.commitClicked.bind(this)), false);
    const buttonsRow = this.element.createChild("div", "editor-buttons");
    this.cancelButton = createTextButton(i18nString14(UIStrings14.cancelString), this.cancelClicked.bind(this), {
      jslogContext: "cancel",
      variant: "outlined"
    });
    this.cancelButton.setAttribute("jslog", `${VisualLogging19.action("cancel").track({ click: true })}`);
    buttonsRow.appendChild(this.cancelButton);
    this.commitButton = createTextButton("", this.commitClicked.bind(this), {
      jslogContext: "commit",
      variant: "primary"
    });
    buttonsRow.appendChild(this.commitButton);
    this.errorMessageContainer = this.element.createChild("div", "list-widget-input-validation-error");
    markAsAlert(this.errorMessageContainer);
    function onKeyDown(predicate, callback, event) {
      if (predicate(event)) {
        event.consume(true);
        callback();
      }
    }
  }
  contentElement() {
    return this.#contentElement;
  }
  createInput(name, type, title, validator) {
    const input = createInput("", type);
    input.placeholder = title;
    input.addEventListener("input", this.validateControls.bind(this, false), false);
    input.setAttribute("jslog", `${VisualLogging19.textField().track({ change: true, keydown: "Enter" }).context(name)}`);
    setLabel(input, title);
    this.controlByName.set(name, input);
    this.controls.push(input);
    this.validators.push(validator);
    return input;
  }
  createSelect(name, options, validator, title) {
    const select = document.createElement("select");
    select.setAttribute("jslog", `${VisualLogging19.dropDown().track({ change: true }).context(name)}`);
    for (let index = 0; index < options.length; ++index) {
      const option = select.createChild("option");
      option.value = options[index];
      option.textContent = options[index];
      option.setAttribute("jslog", `${VisualLogging19.item(Platform22.StringUtilities.toKebabCase(options[index])).track({ click: true })}`);
    }
    if (title) {
      Tooltip.install(select, title);
      setLabel(select, title);
    }
    select.addEventListener("input", this.validateControls.bind(this, false), false);
    select.addEventListener("blur", this.validateControls.bind(this, false), false);
    this.controlByName.set(name, select);
    this.controls.push(select);
    this.validators.push(validator);
    return select;
  }
  createCustomControl(name, ctor, validator) {
    const control = new ctor();
    this.controlByName.set(name, control);
    this.controls.push(control);
    this.validators.push(validator);
    return control;
  }
  control(name) {
    const control = this.controlByName.get(name);
    if (!control) {
      throw new Error(`Control with name ${name} does not exist, please verify.`);
    }
    return control;
  }
  validateControls(forceValid) {
    let allValid = true;
    this.errorMessageContainer.textContent = "";
    for (let index = 0; index < this.controls.length; ++index) {
      const input = this.controls[index];
      const { valid, errorMessage } = this.validators[index].call(null, this.item, this.index, input);
      input.classList.toggle("error-input", !valid && !forceValid);
      if (valid || forceValid) {
        setInvalid(input, false);
      } else {
        setInvalid(input, true);
      }
      if (!forceValid && errorMessage) {
        if (this.errorMessageContainer.textContent) {
          const br = document.createElement("br");
          this.errorMessageContainer.append(br);
        }
        this.errorMessageContainer.append(errorMessage);
      }
      allValid = allValid && valid;
    }
    this.commitButton.disabled = !allValid;
  }
  requestValidation() {
    this.validateControls(false);
  }
  beginEdit(item8, index, commitButtonTitle, commit, cancel) {
    this.commit = commit;
    this.cancel = cancel;
    this.item = item8;
    this.index = index;
    this.commitButton.textContent = commitButtonTitle;
    this.element.scrollIntoViewIfNeeded(false);
    if (this.controls.length) {
      this.controls[0].focus();
    }
    this.validateControls(true);
  }
  commitClicked() {
    if (this.commitButton.disabled) {
      return;
    }
    const commit = this.commit;
    this.commit = null;
    this.cancel = null;
    this.item = null;
    this.index = -1;
    if (commit) {
      commit();
    }
  }
  cancelClicked() {
    const cancel = this.cancel;
    this.commit = null;
    this.cancel = null;
    this.item = null;
    this.index = -1;
    if (cancel) {
      cancel();
    }
  }
};

// gen/front_end/ui/legacy/Panel.js
var Panel_exports = {};
__export(Panel_exports, {
  Panel: () => Panel,
  PanelWithSidebar: () => PanelWithSidebar
});
import * as VisualLogging20 from "./../visual_logging/visual_logging.js";
var Panel = class extends VBox {
  panelName;
  constructor(name, useShadowDom) {
    super({ useShadowDom });
    this.element.setAttribute("jslog", `${VisualLogging20.panel().context(name).track({ resize: true })}`);
    this.element.classList.add("panel");
    this.element.setAttribute("aria-label", name);
    this.element.classList.add(name);
    this.panelName = name;
    self.UI = self.UI || {};
    self.UI.panels = self.UI.panels || {};
    UI.panels[name] = this;
  }
  get name() {
    return this.panelName;
  }
  searchableView() {
    return null;
  }
  elementsToRestoreScrollPositionsFor() {
    return [];
  }
};
var PanelWithSidebar = class extends Panel {
  panelSplitWidget;
  mainWidget;
  sidebarWidget;
  constructor(name, defaultWidth) {
    super(name);
    this.panelSplitWidget = new SplitWidget(true, false, this.panelName + "-panel-split-view-state", defaultWidth || 200);
    this.panelSplitWidget.show(this.element);
    this.mainWidget = new VBox();
    this.panelSplitWidget.setMainWidget(this.mainWidget);
    this.sidebarWidget = new VBox();
    this.sidebarWidget.setMinimumSize(100, 25);
    this.panelSplitWidget.setSidebarWidget(this.sidebarWidget);
    this.sidebarWidget.element.classList.add("panel-sidebar");
    this.sidebarWidget.element.setAttribute("jslog", `${VisualLogging20.pane("sidebar").track({ resize: true })}`);
  }
  panelSidebarElement() {
    return this.sidebarWidget.element;
  }
  mainElement() {
    return this.mainWidget.element;
  }
  splitWidget() {
    return this.panelSplitWidget;
  }
};

// gen/front_end/ui/legacy/PopoverHelper.js
var PopoverHelper_exports = {};
__export(PopoverHelper_exports, {
  PopoverHelper: () => PopoverHelper
});
import * as VisualLogging21 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/popover.css.js
var popover_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (.widget > *) {
  .widget {
    display: flex;
    font: var(--sys-typescale-body4-regular);
    box-shadow: var(--sys-elevation-level2);
    color: var(--sys-color-on-surface);
    background-color: var(--sys-color-base-container-elevated);
    border-radius: var(--sys-shape-corner-small);
    padding: var(--sys-size-4);
    user-select: text;
    overflow: auto;
  }
}

.squiggles-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.squiggles-content-item {
  display: flex;
  align-items: center;
  gap: 5px;

  & devtools-icon {
    cursor: pointer;
  }
}

/*# sourceURL=${import.meta.resolve("./popover.css")} */`;

// gen/front_end/ui/legacy/PopoverHelper.js
var PopoverHelper = class _PopoverHelper {
  static createPopover = (jslogContext) => {
    const popover2 = new GlassPane(`${VisualLogging21.popover(jslogContext).parent("mapped")}`);
    popover2.registerRequiredCSS(popover_css_default);
    popover2.setSizeBehavior(
      "MeasureContent"
      /* SizeBehavior.MEASURE_CONTENT */
    );
    popover2.setMarginBehavior(
      "DefaultMargin"
      /* MarginBehavior.DEFAULT_MARGIN */
    );
    return popover2;
  };
  disableOnClick;
  getRequest;
  scheduledRequest;
  hidePopoverCallback;
  container;
  showTimeout;
  hideTimeout;
  hidePopoverTimer;
  showPopoverTimer;
  boundMouseDown;
  boundMouseMove;
  boundMouseOut;
  boundKeyUp;
  jslogContext;
  constructor(container, getRequest, jslogContext) {
    this.disableOnClick = false;
    this.getRequest = getRequest;
    this.jslogContext = jslogContext;
    this.scheduledRequest = null;
    this.hidePopoverCallback = null;
    this.container = container;
    this.showTimeout = 0;
    this.hideTimeout = 0;
    this.hidePopoverTimer = null;
    this.showPopoverTimer = null;
    this.boundMouseDown = this.mouseDown.bind(this);
    this.boundMouseMove = this.mouseMove.bind(this);
    this.boundMouseOut = this.mouseOut.bind(this);
    this.boundKeyUp = this.keyUp.bind(this);
    this.container.addEventListener("mousedown", this.boundMouseDown, false);
    this.container.addEventListener("mousemove", this.boundMouseMove, false);
    this.container.addEventListener("mouseout", this.boundMouseOut, false);
    this.container.addEventListener("keyup", this.boundKeyUp, false);
    this.setTimeout(1e3);
  }
  setTimeout(showTimeout, hideTimeout) {
    this.showTimeout = showTimeout;
    this.hideTimeout = typeof hideTimeout === "number" ? hideTimeout : showTimeout / 2;
  }
  setDisableOnClick(disableOnClick) {
    this.disableOnClick = disableOnClick;
  }
  eventInScheduledContent(event) {
    return this.scheduledRequest ? this.scheduledRequest.box.contains(event.clientX, event.clientY) : false;
  }
  mouseDown(event) {
    if (this.disableOnClick) {
      this.hidePopover();
      return;
    }
    if (this.eventInScheduledContent(event)) {
      return;
    }
    this.startHidePopoverTimer(0);
    this.stopShowPopoverTimer();
    this.startShowPopoverTimer(event, 0);
  }
  keyUp(event) {
    if (event.altKey && event.key === "ArrowDown") {
      if (this.isPopoverVisible()) {
        this.hidePopover();
      } else {
        this.stopShowPopoverTimer();
        this.startHidePopoverTimer(0);
        this.startShowPopoverTimer(event, 0);
      }
      event.stopPropagation();
    } else if (event.key === "Escape" && this.isPopoverVisible()) {
      this.hidePopover();
      event.stopPropagation();
    }
  }
  mouseMove(event) {
    if (this.eventInScheduledContent(event)) {
      this.stopShowPopoverTimer();
      this.startShowPopoverTimer(event, this.isPopoverVisible() ? this.showTimeout * 0.6 : this.showTimeout);
      return;
    }
    this.startHidePopoverTimer(this.hideTimeout);
    this.stopShowPopoverTimer();
    if (event.buttons && this.disableOnClick) {
      return;
    }
    this.startShowPopoverTimer(event, this.isPopoverVisible() ? this.showTimeout * 0.6 : this.showTimeout);
  }
  popoverMouseMove(_event) {
    this.stopHidePopoverTimer();
  }
  popoverMouseOut(popover2, event) {
    if (!popover2.isShowing()) {
      return;
    }
    const node = event.relatedTarget;
    if (node && !node.isSelfOrDescendant(popover2.contentElement)) {
      this.startHidePopoverTimer(this.hideTimeout);
    }
  }
  mouseOut(event) {
    if (!this.isPopoverVisible()) {
      return;
    }
    if (!this.eventInScheduledContent(event)) {
      this.startHidePopoverTimer(this.hideTimeout);
    }
  }
  startHidePopoverTimer(timeout) {
    if (!this.hidePopoverCallback || this.hidePopoverTimer) {
      return;
    }
    this.hidePopoverTimer = window.setTimeout(() => {
      this.#hidePopover();
      this.hidePopoverTimer = null;
    }, timeout);
  }
  startShowPopoverTimer(event, timeout) {
    this.scheduledRequest = this.getRequest.call(null, event);
    if (!this.scheduledRequest) {
      return;
    }
    this.showPopoverTimer = window.setTimeout(() => {
      this.showPopoverTimer = null;
      this.stopHidePopoverTimer();
      this.#hidePopover();
      const document2 = event.target.ownerDocument;
      this.showPopover(document2);
    }, timeout);
  }
  stopShowPopoverTimer() {
    if (!this.showPopoverTimer) {
      return;
    }
    clearTimeout(this.showPopoverTimer);
    this.showPopoverTimer = null;
  }
  isPopoverVisible() {
    return Boolean(this.hidePopoverCallback);
  }
  hidePopover() {
    this.stopShowPopoverTimer();
    this.#hidePopover();
  }
  #hidePopover() {
    if (!this.hidePopoverCallback) {
      return;
    }
    this.hidePopoverCallback.call(null);
    this.hidePopoverCallback = null;
  }
  showPopover(document2) {
    const popover2 = _PopoverHelper.createPopover(this.jslogContext);
    const request = this.scheduledRequest;
    if (!request) {
      return;
    }
    void request.show.call(null, popover2).then((success) => {
      if (!success) {
        return;
      }
      if (this.scheduledRequest !== request) {
        if (request.hide) {
          request.hide.call(null);
        }
        return;
      }
      if (popoverHelperInstance) {
        popoverHelperInstance.hidePopover();
      }
      popoverHelperInstance = this;
      VisualLogging21.setMappedParent(popover2.contentElement, this.container);
      popover2.contentElement.style.scrollbarGutter = "stable";
      popover2.contentElement.addEventListener("mousemove", this.popoverMouseMove.bind(this), true);
      popover2.contentElement.addEventListener("mouseout", this.popoverMouseOut.bind(this, popover2), true);
      popover2.setContentAnchorBox(request.box);
      popover2.show(document2);
      this.hidePopoverCallback = () => {
        if (request.hide) {
          request.hide.call(null);
        }
        popover2.hide();
        popoverHelperInstance = null;
      };
    });
  }
  stopHidePopoverTimer() {
    if (!this.hidePopoverTimer) {
      return;
    }
    clearTimeout(this.hidePopoverTimer);
    this.hidePopoverTimer = null;
    this.stopShowPopoverTimer();
  }
  dispose() {
    this.container.removeEventListener("mousedown", this.boundMouseDown, false);
    this.container.removeEventListener("mousemove", this.boundMouseMove, false);
    this.container.removeEventListener("mouseout", this.boundMouseOut, false);
  }
};
var popoverHelperInstance = null;

// gen/front_end/ui/legacy/ProgressIndicator.js
var ProgressIndicator_exports = {};
__export(ProgressIndicator_exports, {
  ProgressIndicator: () => ProgressIndicator
});

// gen/front_end/ui/legacy/progressIndicator.css.js
var progressIndicator_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.progress-indicator-shadow-stop-button {
  background-color: var(--sys-color-error-bright);
  border: 0;
  width: 10px;
  height: 12px;
  border-radius: 2px;
}

.progress-indicator-shadow-container {
  display: flex;
  flex: 1 0 auto;
  align-items: center;
}

.progress-indicator-shadow-container .title {
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 150px;
  margin-right: 2px;
  color: var(--sys-color-token-subtle);
}

.progress-indicator-shadow-container progress {
  flex: auto;
  margin: 0 2px;
  width: 100px;
}

/*# sourceURL=${import.meta.resolve("./progressIndicator.css")} */`;

// gen/front_end/ui/legacy/ProgressIndicator.js
var ProgressIndicator = class extends HTMLElement {
  #shadowRoot;
  #contentElement;
  #labelElement;
  #progressElement;
  #stopButton;
  #isCanceled = false;
  #worked = 0;
  #isDone = false;
  constructor() {
    super();
    this.#shadowRoot = createShadowRootWithCoreStyles(this, { cssFile: progressIndicator_css_default });
    this.#contentElement = this.#shadowRoot.createChild("div", "progress-indicator-shadow-container");
    this.#labelElement = this.#contentElement.createChild("div", "title");
    this.#progressElement = this.#contentElement.createChild("progress");
    this.#progressElement.value = 0;
  }
  connectedCallback() {
    this.classList.add("progress-indicator");
    if (!this.hasAttribute("no-stop-button")) {
      this.#stopButton = this.#contentElement.createChild("button", "progress-indicator-shadow-stop-button");
      this.#stopButton.addEventListener("click", () => {
        this.canceled = true;
      });
    }
  }
  set done(done) {
    if (this.#isDone === done) {
      return;
    }
    this.#isDone = done;
    if (done) {
      this.remove();
    }
  }
  get done() {
    return this.#isDone;
  }
  set canceled(value) {
    this.#isCanceled = value;
  }
  get canceled() {
    return this.#isCanceled;
  }
  set title(title) {
    this.#labelElement.textContent = title;
  }
  get title() {
    return this.#labelElement.textContent ?? "";
  }
  set totalWork(totalWork) {
    this.#progressElement.max = totalWork;
  }
  get totalWork() {
    return this.#progressElement.max;
  }
  set worked(worked) {
    this.#worked = worked;
    this.#progressElement.value = worked;
  }
  get worked() {
    return this.#worked;
  }
};
customElements.define("devtools-progress", ProgressIndicator);

// gen/front_end/ui/legacy/RemoteDebuggingTerminatedScreen.js
var RemoteDebuggingTerminatedScreen_exports = {};
__export(RemoteDebuggingTerminatedScreen_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW2,
  RemoteDebuggingTerminatedScreen: () => RemoteDebuggingTerminatedScreen
});
import * as i18n29 from "./../../core/i18n/i18n.js";
import * as Buttons8 from "./../components/buttons/buttons.js";
import { html as html5, render as render5 } from "./../lit/lit.js";

// gen/front_end/ui/legacy/remoteDebuggingTerminatedScreen.css.js
var remoteDebuggingTerminatedScreen_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *) {
  .header {
    padding-top: var(--sys-size-3);
    margin: var(--sys-size-5) var(--sys-size-5) var(--sys-size-5) var(--sys-size-8);
    font: var(--sys-typescale-body2-medium);
  }

  .close-button {
    margin: var(--sys-size-3);
  }

  .content {
    margin: 0 var(--sys-size-8);
  }

  .button-container {
    margin: var(--sys-size-6) var(--sys-size-8) var(--sys-size-8) var(--sys-size-8);
  }

  .reason {
    color: var(--sys-color-error);
  }
}

/*# sourceURL=${import.meta.resolve("./remoteDebuggingTerminatedScreen.css")} */`;

// gen/front_end/ui/legacy/RemoteDebuggingTerminatedScreen.js
var UIStrings15 = {
  /**
   * @description Text in a dialog box in DevTools stating that remote debugging has been terminated.
   * "Remote debugging" here means that DevTools on a PC is inspecting a website running on an actual mobile device
   * (see https://developer.chrome.com/docs/devtools/remote-debugging/).
   */
  debuggingConnectionWasClosed: "Debugging connection was closed",
  /**
   * @description Text in a dialog box in DevTools stating the reason for remote debugging being terminated.
   * @example {target_closed} PH1
   */
  connectionClosedReason: "Reason: {PH1}.",
  /**
   * @description Text in a dialog box showing how to reconnect to DevTools when remote debugging has been terminated.
   * "Remote debugging" here means that DevTools on a PC is inspecting a website running on an actual mobile device
   * (see https://developer.chrome.com/docs/devtools/remote-debugging/).
   * "Reconnect when ready", refers to the state of the mobile device. The developer first has to put the mobile
   * device back in a state where it can be inspected, before DevTools can reconnect to it.
   */
  reconnectWhenReadyByReopening: "Reconnect when ready by reopening DevTools.",
  /**
   * @description Text on a button to reconnect Devtools when remote debugging terminated.
   * "Remote debugging" here means that DevTools on a PC is inspecting a website running on an actual mobile device
   * (see https://developer.chrome.com/docs/devtools/remote-debugging/).
   */
  reconnectDevtools: "Reconnect `DevTools`"
};
var str_15 = i18n29.i18n.registerUIStrings("ui/legacy/RemoteDebuggingTerminatedScreen.ts", UIStrings15);
var i18nString15 = i18n29.i18n.getLocalizedString.bind(void 0, str_15);
var DEFAULT_VIEW2 = (input, _output, target) => {
  render5(html5`
    <style>${remoteDebuggingTerminatedScreen_css_default}</style>
    <div class="header">${i18nString15(UIStrings15.debuggingConnectionWasClosed)}</div>
    <div class="content">
      <div class="reason">${i18nString15(UIStrings15.connectionClosedReason, { PH1: input.reason })}</div>
      <div class="message">${i18nString15(UIStrings15.reconnectWhenReadyByReopening)}</div>
    </div>
    <div class="button-container">
      <div class="button">
        <devtools-button @click=${input.onReconnect} .jslogContext=${"reconnect"}
            .variant=${"outlined"}>${i18nString15(UIStrings15.reconnectDevtools)}</devtools-button>
      </div>
    </div>`, target);
};
var RemoteDebuggingTerminatedScreen = class _RemoteDebuggingTerminatedScreen extends VBox {
  constructor(reason, view = DEFAULT_VIEW2) {
    super({ useShadowDom: true });
    const input = {
      reason,
      onReconnect: () => {
        window.location.reload();
      }
    };
    view(input, {}, this.contentElement);
  }
  static show(reason) {
    const dialog3 = new Dialog("remote-debnugging-terminated");
    dialog3.setSizeBehavior(
      "MeasureContent"
      /* SizeBehavior.MEASURE_CONTENT */
    );
    dialog3.addCloseButton();
    dialog3.setDimmed(true);
    new _RemoteDebuggingTerminatedScreen(reason).show(dialog3.contentElement);
    dialog3.show();
  }
};

// gen/front_end/ui/legacy/ReportView.js
var ReportView_exports = {};
__export(ReportView_exports, {
  ReportView: () => ReportView,
  Section: () => Section2
});
import * as VisualLogging22 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/reportView.css.js
var reportView_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  background-color: var(--sys-color-cdt-base-container);
}

.report-content-box {
  background-color: var(--sys-color-cdt-base-container);
  overflow: auto;
}

.report-content-box.no-scroll {
  overflow: visible;
}

.report-header {
  border-bottom: 1px solid var(--sys-color-divider);
  padding: var(--sys-size-7) var(--sys-size-9);
}

.report-header devtools-toolbar {
  margin-bottom: -8px;
  margin-top: 5px;
  margin-left: -8px;
}

.report-title {
  font: var(--sys-typescale-headline4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}

.report-url,
.report-subtitle {
  font: var(--sys-typescale-body4-regular);
}

.report-section {
  display: flex;
  padding: var(--sys-size-7) var(--sys-size-9) 11px var(--sys-size-9);
  border-bottom: 1px solid var(--sys-color-divider);
  flex-direction: column;
}

.report-section-header {
  padding-bottom: var(--sys-size-5);
  display: flex;
  flex-direction: row;
  align-items: center;

  devtools-button {
    flex: 0 0 auto;
  }

  &:has(.report-section-title:empty) {
    padding: 0;
  }
}

.report-section-title {
  font: var(--sys-typescale-headline5);
  flex: 1 1 auto;
  text-overflow: ellipsis;
  overflow: hidden;
  line-height: 16px;
  color: var(--sys-color-on-surface);
  min-width: var(--sys-size-21);
  white-space: nowrap;
}

.report-field {
  display: flex;
  padding: var(--sys-size-3) 0;
}

.report-row {
  font: var(--sys-typescale-body4-regular);
  margin: var(--sys-size-3) 0;

  > devtools-checkbox:first-child {
    margin-left: calc(var(--sys-size-4) * -1);
  }

  > devtools-icon:first-child {
    /* We have inline icons that would otherwise be mis-aligned */
    margin-inline-start: 0;
  }
}

.report-field-name {
  font: var(--sys-typescale-body5-medium);
  color: var(--sys-color-on-surface-subtle);
  flex: 0 0 128px;
  text-align: left;
  white-space: pre-wrap;
}

.report-field-value {
  font: var(--sys-typescale-body4-regular);
  flex: auto;
  padding: 0 var(--sys-size-6);
  white-space: pre;
  user-select: text;
}

.report-field-value-is-flexed {
  display: flex;
  white-space: pre-wrap;
}

.report-field-value-subtitle {
  color: var(--sys-color-state-disabled);
  line-height: 14px;
}

.report-row-selectable {
  user-select: text;
}

.image-wrapper,
.image-wrapper img {
  max-width: 200px;
  max-height: 200px;
  display: block;
  object-fit: contain;
}

.image-wrapper {
  height: fit-content;
  margin-right: 8px;
}

.show-mask img {
  /* The safe zone is a centrally positioned circle, with radius 2/5
  * (40%) of the minimum of the icon's width and height.
  * https://w3c.github.io/manifest/#icon-masks */
  clip-path: circle(40% at 50% 50%);
}

.show-mask .image-wrapper {
  background: var(--image-file-checker);
}

@media (forced-colors: active) {
  .report-field-value .inline-icon {
    color: ButtonText;
  }

  .report-field-value .multiline-value {
    color: ButtonText;
  }
}

/*# sourceURL=${import.meta.resolve("./reportView.css")} */`;

// gen/front_end/ui/legacy/ReportView.js
var ReportView = class extends VBox {
  contentBox;
  headerElement;
  titleElement;
  sectionList;
  subtitleElement;
  urlElement;
  constructor(title) {
    super({ useShadowDom: true });
    this.registerRequiredCSS(reportView_css_default);
    this.contentBox = this.contentElement.createChild("div", "report-content-box");
    this.headerElement = this.contentBox.createChild("div", "report-header vbox");
    this.titleElement = this.headerElement.createChild("div", "report-title");
    if (title) {
      this.titleElement.textContent = title;
    } else {
      this.headerElement.classList.add("hidden");
    }
    markAsHeading(this.titleElement, 1);
    this.sectionList = this.contentBox.createChild("div", "vbox");
  }
  getHeaderElement() {
    return this.headerElement;
  }
  setTitle(title) {
    if (this.titleElement.textContent === title) {
      return;
    }
    this.titleElement.textContent = title;
    this.headerElement.classList.toggle("hidden", Boolean(title));
  }
  setSubtitle(subtitle) {
    if (this.subtitleElement && this.subtitleElement.textContent === subtitle) {
      return;
    }
    if (!this.subtitleElement) {
      this.subtitleElement = this.headerElement.createChild("div", "report-subtitle");
    }
    this.subtitleElement.textContent = subtitle;
  }
  setURL(link3) {
    if (!this.urlElement) {
      this.urlElement = this.headerElement.createChild("div", "report-url link");
    }
    this.urlElement.removeChildren();
    if (link3) {
      this.urlElement.appendChild(link3);
    }
    this.urlElement.setAttribute("jslog", `${VisualLogging22.link("source-location").track({ click: true })}`);
  }
  createToolbar() {
    return this.headerElement.createChild("devtools-toolbar");
  }
  appendSection(title, className, jslogContext) {
    const section4 = new Section2(title, className, jslogContext);
    section4.show(this.sectionList);
    return section4;
  }
  sortSections(comparator) {
    const sections = this.children().slice();
    const sorted = sections.every((_, i, a) => !i || comparator(a[i - 1], a[i]) <= 0);
    if (sorted) {
      return;
    }
    this.detachChildWidgets();
    sections.sort(comparator);
    for (const section4 of sections) {
      section4.show(this.sectionList);
    }
  }
  setHeaderVisible(visible) {
    this.headerElement.classList.toggle("hidden", !visible);
  }
  setBodyScrollable(scrollable) {
    this.contentBox.classList.toggle("no-scroll", !scrollable);
  }
};
var Section2 = class extends VBox {
  jslogContext;
  headerElement;
  headerButtons = [];
  titleElement;
  fieldList;
  fieldMap = /* @__PURE__ */ new Map();
  constructor(title, className, jslogContext) {
    super();
    this.jslogContext = jslogContext;
    this.element.classList.add("report-section");
    if (className) {
      this.element.classList.add(className);
    }
    if (jslogContext) {
      this.element.setAttribute("jslog", `${VisualLogging22.section(jslogContext)}`);
    }
    this.jslogContext = jslogContext;
    this.headerElement = this.element.createChild("div", "report-section-header");
    this.titleElement = this.headerElement.createChild("div", "report-section-title");
    this.setTitle(title);
    markAsHeading(this.titleElement, 2);
    this.fieldList = this.element.createChild("div", "vbox");
  }
  title() {
    return this.titleElement.textContent || "";
  }
  getTitleElement() {
    return this.titleElement;
  }
  getFieldElement() {
    return this.fieldList;
  }
  appendFieldWithCustomView(customElement) {
    this.fieldList.append(customElement);
  }
  setTitle(title, tooltip) {
    if (this.titleElement.textContent !== title) {
      this.titleElement.textContent = title;
    }
    Tooltip.install(this.titleElement, tooltip || "");
    this.titleElement.classList.toggle("hidden", !this.titleElement.textContent);
  }
  /**
   * Declares the overall container to be a group and assigns a title.
   */
  setUiGroupTitle(groupTitle) {
    markAsGroup(this.element);
    setLabel(this.element, groupTitle);
  }
  appendButtonToHeader(button) {
    this.headerButtons.push(button);
    this.headerElement.appendChild(button);
  }
  setHeaderButtonsState(disabled) {
    this.headerButtons.map((button) => {
      button.disabled = disabled;
    });
  }
  appendField(title, textValue) {
    let row = this.fieldMap.get(title);
    if (!row) {
      row = this.fieldList.createChild("div", "report-field");
      row.createChild("div", "report-field-name").textContent = title;
      this.fieldMap.set(title, row);
      row.createChild("div", "report-field-value");
    }
    if (textValue && row.lastElementChild) {
      row.lastElementChild.textContent = textValue;
    }
    return row.lastElementChild;
  }
  appendFlexedField(title, textValue) {
    const field = this.appendField(title, textValue);
    field.classList.add("report-field-value-is-flexed");
    return field;
  }
  removeField(title) {
    const row = this.fieldMap.get(title);
    if (row) {
      row.remove();
    }
    this.fieldMap.delete(title);
  }
  setFieldVisible(title, visible) {
    const row = this.fieldMap.get(title);
    if (row) {
      row.classList.toggle("hidden", !visible);
    }
  }
  fieldValue(title) {
    const row = this.fieldMap.get(title);
    return row ? row.lastElementChild : null;
  }
  appendRow() {
    return this.fieldList.createChild("div", "report-row");
  }
  appendSelectableRow() {
    return this.fieldList.createChild("div", "report-row report-row-selectable");
  }
  clearContent() {
    this.fieldList.removeChildren();
    this.fieldMap.clear();
  }
  markFieldListAsGroup() {
    markAsGroup(this.fieldList);
    setLabel(this.fieldList, this.title());
  }
  setIconMasked(masked) {
    this.element.classList.toggle("show-mask", masked);
  }
};

// gen/front_end/ui/legacy/RootView.js
var RootView_exports = {};
__export(RootView_exports, {
  RootView: () => RootView
});

// gen/front_end/ui/legacy/rootView.css.js
var rootView_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.root-view {
  background-color: var(--sys-color-cdt-base-container);
  overflow: hidden;
  position: absolute !important; /* stylelint-disable-line declaration-no-important */
  inset: 0;
}

/*# sourceURL=${import.meta.resolve("./rootView.css")} */`;

// gen/front_end/ui/legacy/RootView.js
var RootView = class extends VBox {
  window;
  constructor() {
    super();
    this.markAsRoot();
    this.element.classList.add("root-view");
    this.registerRequiredCSS(rootView_css_default);
    this.element.setAttribute("spellcheck", "false");
  }
  attachToDocument(document2) {
    if (document2.defaultView) {
      document2.defaultView.addEventListener("resize", this.doResize.bind(this), false);
    }
    this.window = document2.defaultView;
    this.doResize();
    this.show(document2.body);
  }
  doResize() {
    if (this.window) {
      const size = this.constraints().minimum;
      const zoom = ZoomManager.instance().zoomFactor();
      const right = Math.min(0, this.window.innerWidth - size.width / zoom);
      this.element.style.marginRight = right + "px";
      const bottom = Math.min(0, this.window.innerHeight - size.height / zoom);
      this.element.style.marginBottom = bottom + "px";
    }
    super.doResize();
  }
};

// gen/front_end/ui/legacy/SearchableView.js
var SearchableView_exports = {};
__export(SearchableView_exports, {
  SearchConfig: () => SearchConfig,
  SearchableView: () => SearchableView
});
import * as Common17 from "./../../core/common/common.js";
import * as i18n31 from "./../../core/i18n/i18n.js";
import * as Platform23 from "./../../core/platform/platform.js";
import * as VisualLogging23 from "./../visual_logging/visual_logging.js";
import * as Buttons9 from "./../components/buttons/buttons.js";
import * as IconButton8 from "./../components/icon_button/icon_button.js";

// gen/front_end/ui/legacy/searchableView.css.js
var searchableView_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.search-bar {
  flex: 0 0 33px;
  border-top: 1px solid var(--sys-color-divider);

  devtools-icon[name="search"] {
    width: var(--sys-size-8);
    height: var(--sys-size-8);
    color: var(--sys-color-on-surface-subtle);
    margin-right: var(--sys-size-3);
  }

  &.replaceable {
    & devtools-icon[name="search"] {
      display: none;
    }
  }

  &:not(.replaceable) .replace-element {
    display: none;
  }

  .search-replace {
    appearance: none;
    color: var(--sys-color-on-surface);
    background-color: transparent;
    border: 0;
    z-index: 1;
    flex: 1;

    &::placeholder {
      color: var(--sys-color-on-surface-subtle);
    }

    &:placeholder-shown + .clear-button {
      display: none;
    }

    &::-webkit-search-cancel-button {
      display: none;
    }
  }

  .search-input-background {
    grid-row: 1/2;
  }

  .icon-and-input {
    margin-left: var(--sys-size-5);
    grid-row: 1/2;
    grid-column: 1/2;
    display: inline-flex;

    &:hover ~ .search-input-background {
      background-color: var(--sys-color-state-hover-on-subtle);
    }

    &:has(.search-replace:placeholder-shown) ~ .search-config-buttons > .clear-button {
      display: none;
    }
  }

  .toolbar-search {
    display: flex;
    margin: var(--sys-size-2);
  }

  .second-row-buttons {
    height: var(--sys-size-12);
    display: inline-flex;

    & > devtools-button {
      margin-right: var(--sys-size-3);
    }
  }

  .input-line {
    grid-column: 1/3;
    display: inline-flex;
    padding: 0 var(--sys-size-2) 0 var(--sys-size-5);
    border-radius: 100px;
    height: var(--sys-size-10);
    position: relative;

    &:not(:has(devtools-button:hover)):hover {
      background-color: var(--sys-color-state-hover-on-subtle);
    }

    &::before {
      content: "";
      box-sizing: inherit;
      height: 100%;
      width: 100%;
      position: absolute;
      left: 0;
      background: var(--sys-color-cdt-base);
      z-index: -10;
      border-radius: 100px;
      padding: var(--sys-size-2);
    }

    & > devtools-button {
      width: var(--sys-size-11);
      justify-content: center;
      margin-right: var(--sys-size-4);
    }
  }

  .search-inputs {
    display: grid;
    grid-template-columns: 1fr min-content;
    grid-auto-rows: var(--sys-size-12);
    flex-grow: 1;
    align-items: center;
    min-width: 150px;
  }

  .first-row-buttons {
    display: flex;
    justify-content: space-between;
  }

  devtools-toolbar {
    padding: 0;
    height: var(--sys-size-12);
    display: flex;
    align-items: center;
  }

  .search-config-buttons {
    margin: 0 var(--sys-size-3) 0 auto;
    z-index: 1;
    display: inline-flex;
    grid-row: 1/2;
    grid-column: 2/3;

    & > devtools-button:last-child {
      margin-right: var(--sys-size-4);
    }
  }

  .toolbar-search-buttons {
    margin-left: var(--sys-size-3);
  }

  .replace-element:has(input:focus) {
    box-shadow: inset 0 0 0 2px var(--sys-color-state-focus-ring);
  }

  .search-inputs:has(input[type="search"]:focus) .search-input-background {
    box-shadow: inset 0 0 0 2px var(--sys-color-state-focus-ring);
  }
}

:host-context(#sources-panel-sources-view) .search-bar {
  flex-basis: auto;
}

/*# sourceURL=${import.meta.resolve("./searchableView.css")} */`;

// gen/front_end/ui/legacy/SearchableView.js
var UIStrings16 = {
  /**
   * @description Text on a button to replace one instance with input text for the ctrl+F search bar
   */
  replace: "Replace",
  /**
   * @description Tooltip text on a toggle to enable replacing one instance with input text for the ctrl+F search bar
   */
  enableFindAndReplace: "Find and replace",
  /**
   * @description Tooltip text on a toggle to disable replacing one instance with input text for the ctrl+F search bar
   */
  disableFindAndReplace: "Disable find and replace",
  /**
   * @description Text to find an item
   */
  findString: "Find",
  /**
   * @description Tooltip text on a button to search previous instance for the ctrl+F search bar
   */
  searchPrevious: "Show previous result",
  /**
   * @description Tooltip text on a button to search next instance for the ctrl+F search bar
   */
  searchNext: "Show next result",
  /**
   * @description Tooltip text on a toggle to enable/disable search by matching the exact case.
   */
  matchCase: "Match case",
  /**
   * @description Tooltip text on a toggle to enable/disable search by matching the exact word.
   */
  matchWholeWord: "Match whole word",
  /**
   * @description Tooltip text on a toggle to enable/disable searching with regular expression.
   */
  useRegularExpression: "Use regular expression",
  /**
   * @description Tooltip text on a button to close the search bar
   */
  closeSearchBar: "Close search bar",
  /**
   * @description Text on a button to replace all instances with input text for the ctrl+F search bar
   */
  replaceAll: "Replace all",
  /**
   * @description Text to indicate the current match index and the total number of matches for the ctrl+F search bar
   * @example {2} PH1
   * @example {3} PH2
   */
  dOfD: "{PH1} of {PH2}",
  /**
   * @description Tooltip text to indicate the current match index and the total number of matches for the ctrl+F search bar
   * @example {2} PH1
   * @example {3} PH2
   */
  accessibledOfD: "Shows result {PH1} of {PH2}",
  /**
   * @description Text to indicate search result for the ctrl+F search bar
   */
  matchString: "1 match",
  /**
   * @description Text to indicate search result for the ctrl+F search bar
   * @example {2} PH1
   */
  dMatches: "{PH1} matches",
  /**
   * @description Text on a button to search previous instance for the ctrl+F search bar
   */
  clearInput: "Clear"
};
var str_16 = i18n31.i18n.registerUIStrings("ui/legacy/SearchableView.ts", UIStrings16);
var i18nString16 = i18n31.i18n.getLocalizedString.bind(void 0, str_16);
function createClearButton(jslogContext) {
  const button = new Buttons9.Button.Button();
  button.data = {
    variant: "icon",
    size: "SMALL",
    jslogContext,
    title: i18nString16(UIStrings16.clearInput),
    iconName: "cross-circle-filled"
  };
  button.ariaLabel = i18nString16(UIStrings16.clearInput);
  button.classList.add("clear-button");
  button.tabIndex = -1;
  return button;
}
var SearchableView = class extends VBox {
  searchProvider;
  replaceProvider;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setting;
  replaceable;
  footerElementContainer;
  footerElement;
  replaceToggleButton;
  searchInputElement;
  matchesElement;
  searchNavigationPrevElement;
  searchNavigationNextElement;
  replaceInputElement;
  caseSensitiveButton;
  wholeWordButton;
  regexButton;
  replaceButtonElement;
  replaceAllButtonElement;
  minimalSearchQuerySize;
  searchIsVisible;
  currentQuery;
  valueChangedTimeoutId;
  constructor(searchable, replaceable, settingName, element) {
    super(element, { useShadowDom: true });
    this.registerRequiredCSS(searchableView_css_default);
    searchableViewsByElement.set(this.element, this);
    this.searchProvider = searchable;
    this.replaceProvider = replaceable;
    this.setting = settingName ? Common17.Settings.Settings.instance().createSetting(settingName, {}) : null;
    this.replaceable = false;
    this.contentElement.createChild("slot");
    this.footerElementContainer = this.contentElement.createChild("div", "search-bar hidden");
    this.footerElementContainer.style.order = "100";
    this.footerElement = this.footerElementContainer.createChild("div", "toolbar-search");
    this.footerElement.setAttribute("jslog", `${VisualLogging23.toolbar("search").track({ resize: true })}`);
    const replaceToggleToolbar = this.footerElement.createChild("devtools-toolbar", "replace-toggle-toolbar");
    this.replaceToggleButton = new ToolbarToggle(i18nString16(UIStrings16.enableFindAndReplace), "replace", void 0, "replace");
    setLabel(this.replaceToggleButton.element, i18nString16(UIStrings16.enableFindAndReplace));
    this.replaceToggleButton.addEventListener("Click", this.toggleReplace, this);
    replaceToggleToolbar.appendToolbarItem(this.replaceToggleButton);
    const searchInputElements = this.footerElement.createChild("div", "search-inputs");
    const iconAndInput = searchInputElements.createChild("div", "icon-and-input");
    const searchIcon = IconButton8.Icon.create("search");
    iconAndInput.appendChild(searchIcon);
    this.searchInputElement = createHistoryInput("search", "search-replace search");
    this.searchInputElement.id = "search-input-field";
    this.searchInputElement.autocomplete = "off";
    this.searchInputElement.placeholder = i18nString16(UIStrings16.findString);
    this.searchInputElement.setAttribute("jslog", `${VisualLogging23.textField("search").track({ change: true, keydown: "ArrowUp|ArrowDown|Enter|Escape" })}`);
    this.searchInputElement.addEventListener("keydown", this.onSearchKeyDown.bind(this), true);
    this.searchInputElement.addEventListener("input", this.onInput.bind(this), false);
    iconAndInput.appendChild(this.searchInputElement);
    const replaceInputElements = searchInputElements.createChild("div", "replace-element input-line");
    this.replaceInputElement = replaceInputElements.createChild("input", "search-replace");
    this.replaceInputElement.addEventListener("keydown", this.onReplaceKeyDown.bind(this), true);
    this.replaceInputElement.placeholder = i18nString16(UIStrings16.replace);
    this.replaceInputElement.setAttribute("jslog", `${VisualLogging23.textField("replace").track({ change: true, keydown: "Enter" })}`);
    const replaceInputClearButton = createClearButton("clear-replace-input");
    replaceInputClearButton.addEventListener("click", () => {
      this.replaceInputElement.value = "";
      this.replaceInputElement.focus();
    });
    replaceInputElements.appendChild(replaceInputClearButton);
    const searchConfigButtons = searchInputElements.createChild("div", "search-config-buttons");
    const clearButton = createClearButton("clear-search-input");
    clearButton.addEventListener("click", () => {
      this.searchInputElement.value = "";
      this.clearSearch();
      this.searchInputElement.focus();
    });
    searchConfigButtons.appendChild(clearButton);
    const saveSettingAndPerformSearch = () => {
      this.saveSetting();
      this.performSearch(false, true);
    };
    if (this.searchProvider.supportsCaseSensitiveSearch()) {
      const iconName = "match-case";
      this.caseSensitiveButton = new Buttons9.Button.Button();
      this.caseSensitiveButton.data = {
        variant: "icon_toggle",
        size: "SMALL",
        iconName,
        toggledIconName: iconName,
        toggled: false,
        toggleType: "primary-toggle",
        title: i18nString16(UIStrings16.matchCase),
        jslogContext: iconName
      };
      setLabel(this.caseSensitiveButton, i18nString16(UIStrings16.matchCase));
      this.caseSensitiveButton.addEventListener("click", saveSettingAndPerformSearch);
      searchConfigButtons.appendChild(this.caseSensitiveButton);
    }
    if (this.searchProvider.supportsWholeWordSearch()) {
      const iconName = "match-whole-word";
      this.wholeWordButton = new Buttons9.Button.Button();
      this.wholeWordButton.data = {
        variant: "icon_toggle",
        size: "SMALL",
        iconName,
        toggledIconName: iconName,
        toggled: false,
        toggleType: "primary-toggle",
        title: i18nString16(UIStrings16.matchWholeWord),
        jslogContext: iconName
      };
      setLabel(this.wholeWordButton, i18nString16(UIStrings16.matchWholeWord));
      this.wholeWordButton.addEventListener("click", saveSettingAndPerformSearch);
      searchConfigButtons.appendChild(this.wholeWordButton);
    }
    if (this.searchProvider.supportsRegexSearch()) {
      const iconName = "regular-expression";
      this.regexButton = new Buttons9.Button.Button();
      this.regexButton.data = {
        variant: "icon_toggle",
        size: "SMALL",
        iconName,
        toggledIconName: iconName,
        toggleType: "primary-toggle",
        toggled: false,
        jslogContext: iconName,
        title: i18nString16(UIStrings16.useRegularExpression)
      };
      setLabel(this.regexButton, i18nString16(UIStrings16.useRegularExpression));
      this.regexButton.addEventListener("click", saveSettingAndPerformSearch);
      searchConfigButtons.appendChild(this.regexButton);
    }
    searchInputElements.createChild("div", "input-line search-input-background");
    const buttonsContainer = this.footerElement.createChild("div", "toolbar-search-buttons");
    const firstRowButtons = buttonsContainer.createChild("div", "first-row-buttons");
    const toolbar4 = firstRowButtons.createChild("devtools-toolbar", "toolbar-search-options");
    this.searchNavigationPrevElement = new ToolbarButton(i18nString16(UIStrings16.searchPrevious), "chevron-up", void 0, "select-previous");
    this.searchNavigationPrevElement.addEventListener("Click", () => this.onPrevButtonSearch());
    toolbar4.appendToolbarItem(this.searchNavigationPrevElement);
    setLabel(this.searchNavigationPrevElement.element, i18nString16(UIStrings16.searchPrevious));
    this.searchNavigationNextElement = new ToolbarButton(i18nString16(UIStrings16.searchNext), "chevron-down", void 0, "select-next");
    this.searchNavigationNextElement.addEventListener("Click", () => this.onNextButtonSearch());
    setLabel(this.searchNavigationNextElement.element, i18nString16(UIStrings16.searchNext));
    toolbar4.appendToolbarItem(this.searchNavigationNextElement);
    const matchesText = new ToolbarText();
    this.matchesElement = matchesText.element;
    this.matchesElement.style.fontVariantNumeric = "tabular-nums";
    this.matchesElement.style.color = "var(--sys-color-on-surface-subtle)";
    this.matchesElement.style.padding = "0 var(--sys-size-3)";
    this.matchesElement.classList.add("search-results-matches");
    toolbar4.appendToolbarItem(matchesText);
    const cancelButtonElement = new Buttons9.Button.Button();
    cancelButtonElement.data = {
      variant: "toolbar",
      size: "REGULAR",
      iconName: "cross",
      title: i18nString16(UIStrings16.closeSearchBar),
      jslogContext: "close-search"
    };
    cancelButtonElement.classList.add("close-search-button");
    cancelButtonElement.addEventListener("click", () => this.closeSearch());
    firstRowButtons.appendChild(cancelButtonElement);
    const secondRowButtons = buttonsContainer.createChild("div", "second-row-buttons replace-element");
    this.replaceButtonElement = createTextButton(i18nString16(UIStrings16.replace), this.replace.bind(this), {
      className: "search-action-button",
      jslogContext: "replace"
    });
    this.replaceButtonElement.disabled = true;
    secondRowButtons.appendChild(this.replaceButtonElement);
    this.replaceAllButtonElement = createTextButton(i18nString16(UIStrings16.replaceAll), this.replaceAll.bind(this), {
      className: "search-action-button",
      jslogContext: "replace-all"
    });
    secondRowButtons.appendChild(this.replaceAllButtonElement);
    this.replaceAllButtonElement.disabled = true;
    this.minimalSearchQuerySize = 3;
    this.loadSetting();
  }
  static fromElement(element) {
    let view = null;
    while (element && !view) {
      view = searchableViewsByElement.get(element) || null;
      element = element.parentElementOrShadowHost();
    }
    return view;
  }
  toggleReplace() {
    const replaceEnabled = this.replaceToggleButton.isToggled();
    const label = replaceEnabled ? i18nString16(UIStrings16.disableFindAndReplace) : i18nString16(UIStrings16.enableFindAndReplace);
    setLabel(this.replaceToggleButton.element, label);
    this.replaceToggleButton.element.title = label;
    this.updateSecondRowVisibility();
  }
  saveSetting() {
    if (!this.setting) {
      return;
    }
    const settingValue = this.setting.get() || {};
    if (this.caseSensitiveButton) {
      settingValue.caseSensitive = this.caseSensitiveButton.toggled;
    }
    if (this.wholeWordButton) {
      settingValue.wholeWord = this.wholeWordButton.toggled;
    }
    if (this.regexButton) {
      settingValue.isRegex = this.regexButton.toggled;
    }
    this.setting.set(settingValue);
  }
  loadSetting() {
    const settingValue = this.setting ? this.setting.get() || {} : {};
    if (this.caseSensitiveButton) {
      this.caseSensitiveButton.toggled = Boolean(settingValue.caseSensitive);
    }
    if (this.wholeWordButton) {
      this.wholeWordButton.toggled = Boolean(settingValue.wholeWord);
    }
    if (this.regexButton) {
      this.regexButton.toggled = Boolean(settingValue.isRegex);
    }
  }
  setMinimalSearchQuerySize(minimalSearchQuerySize) {
    this.minimalSearchQuerySize = minimalSearchQuerySize;
  }
  setPlaceholder(placeholder, ariaLabel) {
    this.searchInputElement.placeholder = placeholder;
    if (ariaLabel) {
      setLabel(this.searchInputElement, ariaLabel);
    }
  }
  setReplaceable(replaceable) {
    this.replaceable = replaceable;
  }
  updateSearchMatchesCount(matches) {
    if (this.searchProvider.currentSearchMatches === matches) {
      return;
    }
    this.searchProvider.currentSearchMatches = matches;
    this.updateSearchMatchesCountAndCurrentMatchIndex(this.searchProvider.currentQuery ? matches : 0, -1);
  }
  updateCurrentMatchIndex(currentMatchIndex) {
    if (!this.searchProvider.currentSearchMatches) {
      return;
    }
    this.updateSearchMatchesCountAndCurrentMatchIndex(this.searchProvider.currentSearchMatches, currentMatchIndex);
  }
  closeSearch() {
    this.cancelSearch();
    if (this.footerElementContainer.hasFocus()) {
      this.focus();
    }
    this.searchProvider.onSearchClosed?.();
  }
  toggleSearchBar(toggled) {
    this.footerElementContainer.classList.toggle("hidden", !toggled);
    this.doResize();
  }
  cancelSearch() {
    if (!this.searchIsVisible) {
      return;
    }
    this.resetSearch();
    delete this.searchIsVisible;
    this.toggleSearchBar(false);
  }
  resetSearch() {
    this.clearSearch();
    this.updateReplaceVisibility();
    this.matchesElement.textContent = "";
  }
  refreshSearch() {
    if (!this.searchIsVisible) {
      return;
    }
    this.resetSearch();
    this.performSearch(false, false);
  }
  handleFindNextShortcut() {
    if (!this.searchIsVisible) {
      return false;
    }
    this.searchProvider.jumpToNextSearchResult();
    return true;
  }
  handleFindPreviousShortcut() {
    if (!this.searchIsVisible) {
      return false;
    }
    this.searchProvider.jumpToPreviousSearchResult();
    return true;
  }
  handleFindShortcut() {
    this.showSearchField();
    return true;
  }
  handleCancelSearchShortcut() {
    if (!this.searchIsVisible) {
      return false;
    }
    this.closeSearch();
    return true;
  }
  updateSearchNavigationButtonState(enabled) {
    this.replaceButtonElement.disabled = !enabled;
    this.replaceAllButtonElement.disabled = !enabled;
    this.searchNavigationPrevElement.setEnabled(enabled);
    this.searchNavigationNextElement.setEnabled(enabled);
  }
  updateSearchMatchesCountAndCurrentMatchIndex(matches, currentMatchIndex) {
    if (!this.currentQuery) {
      this.matchesElement.textContent = "";
    } else if (matches === 0 || currentMatchIndex >= 0) {
      this.matchesElement.textContent = i18nString16(UIStrings16.dOfD, { PH1: currentMatchIndex + 1, PH2: matches });
      setLabel(this.matchesElement, i18nString16(UIStrings16.accessibledOfD, { PH1: currentMatchIndex + 1, PH2: matches }));
    } else if (matches === 1) {
      this.matchesElement.textContent = i18nString16(UIStrings16.matchString);
    } else {
      this.matchesElement.textContent = i18nString16(UIStrings16.dMatches, { PH1: matches });
    }
    this.updateSearchNavigationButtonState(matches > 0);
  }
  showSearchField() {
    if (this.searchIsVisible) {
      this.cancelSearch();
    }
    let queryCandidate;
    if (!this.searchInputElement.hasFocus()) {
      const selection = InspectorView.instance().element.window().getSelection();
      if (selection?.rangeCount) {
        queryCandidate = selection.toString().replace(/\r?\n.*/, "");
      }
    }
    this.toggleSearchBar(true);
    this.updateReplaceVisibility();
    if (queryCandidate) {
      this.searchInputElement.value = queryCandidate;
    }
    this.performSearch(false, false);
    this.searchInputElement.focus();
    this.searchInputElement.select();
    this.searchIsVisible = true;
  }
  updateReplaceVisibility() {
    this.replaceToggleButton.setVisible(this.replaceable);
    if (!this.replaceable) {
      this.replaceToggleButton.setToggled(false);
      this.updateSecondRowVisibility();
    }
  }
  onSearchKeyDown(event) {
    if (Platform23.KeyboardUtilities.isEscKey(event)) {
      this.closeSearch();
      event.consume(true);
      return;
    }
    if (!(event.key === "Enter")) {
      return;
    }
    if (!this.currentQuery) {
      this.performSearch(true, true, event.shiftKey);
    } else {
      this.jumpToNextSearchResult(event.shiftKey);
    }
  }
  onReplaceKeyDown(event) {
    if (event.key === "Enter") {
      this.replace();
    }
  }
  jumpToNextSearchResult(isBackwardSearch) {
    if (!this.currentQuery) {
      return;
    }
    if (isBackwardSearch) {
      this.searchProvider.jumpToPreviousSearchResult();
    } else {
      this.searchProvider.jumpToNextSearchResult();
    }
  }
  onNextButtonSearch() {
    this.jumpToNextSearchResult();
  }
  onPrevButtonSearch() {
    this.jumpToNextSearchResult(true);
  }
  clearSearch() {
    this.currentQuery = void 0;
    if (Boolean(this.searchProvider.currentQuery)) {
      this.searchProvider.currentQuery = void 0;
      this.searchProvider.onSearchCanceled();
    }
    this.updateSearchMatchesCountAndCurrentMatchIndex(0, -1);
  }
  performSearch(forceSearch, shouldJump, jumpBackwards) {
    const query = this.searchInputElement.value;
    if (!query || !forceSearch && query.length < this.minimalSearchQuerySize && !this.currentQuery) {
      this.clearSearch();
      return;
    }
    this.currentQuery = query;
    this.searchProvider.currentQuery = query;
    const searchConfig = this.currentSearchConfig();
    this.searchProvider.performSearch(searchConfig, shouldJump, jumpBackwards);
  }
  currentSearchConfig() {
    const query = this.searchInputElement.value;
    const caseSensitive = this.caseSensitiveButton ? this.caseSensitiveButton.toggled : false;
    const wholeWord = this.wholeWordButton ? this.wholeWordButton.toggled : false;
    const isRegex = this.regexButton ? this.regexButton.toggled : false;
    return new SearchConfig(query, caseSensitive, wholeWord, isRegex);
  }
  updateSecondRowVisibility() {
    const secondRowVisible = this.replaceToggleButton.isToggled();
    this.footerElementContainer.classList.toggle("replaceable", secondRowVisible);
    if (secondRowVisible) {
      this.replaceInputElement.focus();
    } else {
      this.searchInputElement.focus();
    }
    this.doResize();
  }
  replace() {
    if (!this.replaceProvider) {
      throw new Error("No 'replaceable' provided to SearchableView!");
    }
    const searchConfig = this.currentSearchConfig();
    this.replaceProvider.replaceSelectionWith(searchConfig, this.replaceInputElement.value);
    this.currentQuery = void 0;
    this.performSearch(true, true);
  }
  replaceAll() {
    if (!this.replaceProvider) {
      throw new Error("No 'replaceable' provided to SearchableView!");
    }
    const searchConfig = this.currentSearchConfig();
    this.replaceProvider.replaceAllWith(searchConfig, this.replaceInputElement.value);
  }
  onInput() {
    if (!Common17.Settings.Settings.instance().moduleSetting("search-as-you-type").get()) {
      this.clearSearch();
      return;
    }
    clearTimeout(this.valueChangedTimeoutId);
    const timeout = this.searchInputElement.value.length < 3 ? 200 : 0;
    this.valueChangedTimeoutId = window.setTimeout(this.onValueChanged.bind(this), timeout);
  }
  onValueChanged() {
    if (!this.searchIsVisible) {
      return;
    }
    this.valueChangedTimeoutId = void 0;
    this.performSearch(false, true);
  }
};
var searchableViewsByElement = /* @__PURE__ */ new WeakMap();
var SearchConfig = class {
  query;
  caseSensitive;
  wholeWord;
  isRegex;
  constructor(query, caseSensitive, wholeWord, isRegex) {
    this.query = query;
    this.caseSensitive = caseSensitive;
    this.wholeWord = wholeWord;
    this.isRegex = isRegex;
  }
  toSearchRegex(global) {
    let modifiers = this.caseSensitive ? "" : "i";
    if (global) {
      modifiers += "g";
    }
    const isRegexFormatted = this.query.startsWith("/") && this.query.endsWith("/");
    const query = this.isRegex && !isRegexFormatted ? "/" + this.query + "/" : this.query;
    let regex;
    let fromQuery = false;
    try {
      if (/^\/.+\/$/.test(query) && this.isRegex) {
        regex = new RegExp(query.substring(1, query.length - 1), modifiers);
        fromQuery = true;
      }
    } catch {
    }
    if (!regex) {
      regex = Platform23.StringUtilities.createPlainTextSearchRegex(query, modifiers);
    }
    if (this.wholeWord) {
      let { source } = regex;
      if (!source.startsWith("^") && !source.startsWith("\\b")) {
        source = "\\b" + source;
      }
      if (!source.endsWith("$") && !source.endsWith("\\b")) {
        source = source + "\\b";
      }
      regex = new RegExp(source, regex.flags);
    }
    return {
      regex,
      fromQuery
    };
  }
};

// gen/front_end/ui/legacy/SoftDropDown.js
var SoftDropDown_exports = {};
__export(SoftDropDown_exports, {
  SoftDropDown: () => SoftDropDown
});
import * as i18n33 from "./../../core/i18n/i18n.js";
import * as Geometry6 from "./../../models/geometry/geometry.js";
import * as IconButton9 from "./../components/icon_button/icon_button.js";
import * as VisualLogging24 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/softDropDown.css.js
var softDropDown_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.item.disabled {
  opacity: 50%;
}

.item-list {
  background-color: var(--sys-color-cdt-base-container);
  box-shadow: var(--drop-shadow);
  overflow: hidden auto;
  width: 100%;
}

.item.highlighted {
  background-color: var(--sys-color-state-hover-on-subtle);
}

@media (forced-colors: active) {
  .item.disabled {
    opacity: 100%;
  }

  .item-list {
    border: 1px solid ButtonText;
    background-color: ButtonFace;
  }

  .item.highlighted {
    forced-color-adjust: none;
    color: HighlightText;
    background-color: Highlight;
  }
}

/*# sourceURL=${import.meta.resolve("./softDropDown.css")} */`;

// gen/front_end/ui/legacy/softDropDownButton.css.js
var softDropDownButton_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

button.soft-dropdown {
  height: var(--sys-size-9);
  text-align: left;
  position: relative;
  border: none;
  background: none;
  max-width: 120px;

  &[disabled] {
    background: var(--sys-color-state-disabled-container);
    color: var(--sys-color-state-disabled);

    devtools-icon {
      color: var(--sys-color-state-disabled);
    }
  }

  devtools-icon {
    top: var(--sys-size-1);
  }
}

button.soft-dropdown > .title {
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
}

button.soft-dropdown:hover:not(:active) > .title {
  color: var(--sys-color-on-surface);
}

@media (forced-colors: active) {
  button.soft-dropdown {
    border: 1px solid ButtonText;
    background: ButtonFace;
    color: ButtonText;
  }

  button.soft-dropdown[disabled] {
    opacity: 100%;
  }
}

/*# sourceURL=${import.meta.resolve("./softDropDownButton.css")} */`;

// gen/front_end/ui/legacy/SoftDropDown.js
var UIStrings17 = {
  /**
   * @description Placeholder text in Soft Drop Down
   */
  noItemSelected: "(no item selected)"
};
var str_17 = i18n33.i18n.registerUIStrings("ui/legacy/SoftDropDown.ts", UIStrings17);
var i18nString17 = i18n33.i18n.getLocalizedString.bind(void 0, str_17);
var SoftDropDown = class {
  delegate;
  selectedItem;
  model;
  placeholderText;
  element;
  titleElement;
  glassPane;
  list;
  rowHeight;
  width;
  constructor(model, delegate, jslogContext) {
    this.delegate = delegate;
    this.selectedItem = null;
    this.model = model;
    this.placeholderText = i18nString17(UIStrings17.noItemSelected);
    this.element = document.createElement("button");
    if (jslogContext) {
      this.element.setAttribute("jslog", `${VisualLogging24.dropDown().track({ click: true, keydown: "ArrowUp|ArrowDown|Enter" }).context(jslogContext)}`);
    }
    this.element.classList.add("soft-dropdown");
    appendStyle(this.element, softDropDownButton_css_default);
    this.titleElement = this.element.createChild("span", "title");
    const dropdownArrowIcon = IconButton9.Icon.create("triangle-down");
    this.element.appendChild(dropdownArrowIcon);
    setExpanded(this.element, false);
    this.glassPane = new GlassPane();
    this.glassPane.setMarginBehavior(
      "NoMargin"
      /* MarginBehavior.NO_MARGIN */
    );
    this.glassPane.setAnchorBehavior(
      "PreferBottom"
      /* AnchorBehavior.PREFER_BOTTOM */
    );
    this.glassPane.setOutsideClickCallback(this.hide.bind(this));
    this.glassPane.setPointerEventsBehavior(
      "BlockedByGlassPane"
      /* PointerEventsBehavior.BLOCKED_BY_GLASS_PANE */
    );
    this.list = new ListControl(model, this, ListMode.EqualHeightItems);
    this.list.element.classList.add("item-list");
    this.rowHeight = 36;
    this.width = 315;
    createShadowRootWithCoreStyles(this.glassPane.contentElement, {
      cssFile: softDropDown_css_default
    }).appendChild(this.list.element);
    markAsMenu(this.list.element);
    VisualLogging24.setMappedParent(this.list.element, this.element);
    this.list.element.setAttribute("jslog", `${VisualLogging24.menu().parent("mapped").track({ resize: true, keydown: "ArrowUp|ArrowDown|PageUp|PageDown" })}`);
    this.element.addEventListener("mousedown", (event) => {
      if (this.glassPane.isShowing()) {
        this.hide(event);
      } else if (!this.element.disabled) {
        this.show(event);
      }
    }, false);
    this.element.addEventListener("keydown", this.onKeyDownButton.bind(this), false);
    this.list.element.addEventListener("keydown", this.onKeyDownList.bind(this), false);
    this.list.element.addEventListener("focusout", this.hide.bind(this), false);
    this.list.element.addEventListener("mousedown", (event) => event.consume(true), false);
    this.list.element.addEventListener("mouseup", (event) => {
      if (event.target === this.list.element) {
        return;
      }
      this.selectHighlightedItem();
      if (event.target instanceof Element && event.target?.parentElement) {
        void VisualLogging24.logClick(event.target.parentElement, event);
      }
      this.hide(event);
    }, false);
    model.addEventListener("ItemsReplaced", this.itemsReplaced, this);
  }
  show(event) {
    if (this.glassPane.isShowing()) {
      return;
    }
    this.glassPane.setContentAnchorBox(this.element.boxInWindow());
    this.glassPane.show(this.element.ownerDocument);
    this.list.element.focus();
    setExpanded(this.element, true);
    this.updateGlasspaneSize();
    if (this.selectedItem) {
      this.list.selectItem(this.selectedItem);
    }
    event.consume(true);
  }
  updateGlasspaneSize() {
    const maxHeight = this.rowHeight * Math.min(this.model.length, 9);
    this.glassPane.setMaxContentSize(new Geometry6.Size(this.width, maxHeight));
    this.list.viewportResized();
  }
  hide(event) {
    this.glassPane.hide();
    this.list.selectItem(null);
    setExpanded(this.element, false);
    this.element.focus();
    event.consume(true);
  }
  onKeyDownButton(event) {
    let handled = false;
    switch (event.key) {
      case "ArrowUp":
        this.show(event);
        this.list.selectItemNextPage();
        handled = true;
        break;
      case "ArrowDown":
        this.show(event);
        this.list.selectItemPreviousPage();
        handled = true;
        break;
      case "Enter":
      case " ":
        this.show(event);
        handled = true;
        break;
      default:
        break;
    }
    if (handled) {
      event.consume(true);
    }
  }
  onKeyDownList(event) {
    let handled = false;
    switch (event.key) {
      case "ArrowLeft":
        handled = this.list.selectPreviousItem(false, false);
        break;
      case "ArrowRight":
        handled = this.list.selectNextItem(false, false);
        break;
      case "Home":
        for (let i = 0; i < this.model.length; i++) {
          if (this.isItemSelectable(this.model.at(i))) {
            this.list.selectItem(this.model.at(i));
            handled = true;
            break;
          }
        }
        break;
      case "End":
        for (let i = this.model.length - 1; i >= 0; i--) {
          if (this.isItemSelectable(this.model.at(i))) {
            this.list.selectItem(this.model.at(i));
            handled = true;
            break;
          }
        }
        break;
      case "Escape":
        this.hide(event);
        handled = true;
        break;
      case "Tab":
      case "Enter":
      case " ":
        this.selectHighlightedItem();
        this.hide(event);
        handled = true;
        break;
      default:
        if (event.key.length === 1) {
          const selectedIndex = this.list.selectedIndex();
          const letter = event.key.toUpperCase();
          for (let i = 0; i < this.model.length; i++) {
            const item8 = this.model.at((selectedIndex + i + 1) % this.model.length);
            if (this.delegate.titleFor(item8).toUpperCase().startsWith(letter)) {
              this.list.selectItem(item8);
              break;
            }
          }
          handled = true;
        }
        break;
    }
    if (handled) {
      event.consume(true);
    }
  }
  setWidth(width) {
    this.width = width;
    this.updateGlasspaneSize();
  }
  setRowHeight(rowHeight) {
    this.rowHeight = rowHeight;
  }
  setPlaceholderText(text) {
    this.placeholderText = text;
    if (!this.selectedItem) {
      this.titleElement.textContent = this.placeholderText;
    }
  }
  itemsReplaced(event) {
    const { removed } = event.data;
    if (this.selectedItem && removed.indexOf(this.selectedItem) !== -1) {
      this.selectedItem = null;
      this.selectHighlightedItem();
    }
    this.updateGlasspaneSize();
  }
  getSelectedItem() {
    return this.selectedItem;
  }
  selectItem(item8) {
    this.selectedItem = item8;
    if (this.selectedItem) {
      this.titleElement.textContent = this.delegate.titleFor(this.selectedItem);
    } else {
      this.titleElement.textContent = this.placeholderText;
    }
    this.delegate.itemSelected(this.selectedItem);
  }
  createElementForItem(item8) {
    const element = document.createElement("div");
    element.classList.add("item");
    element.addEventListener("mousemove", (e) => {
      if ((e.movementX || e.movementY) && this.delegate.isItemSelectable(item8)) {
        this.list.selectItem(
          item8,
          false,
          /* Don't scroll */
          true
        );
      }
    });
    element.classList.toggle("disabled", !this.delegate.isItemSelectable(item8));
    element.classList.toggle("highlighted", this.list.selectedItem() === item8);
    markAsMenuItem(element);
    element.appendChild(this.delegate.createElementForItem(item8));
    return element;
  }
  heightForItem(_item) {
    return this.rowHeight;
  }
  isItemSelectable(item8) {
    return this.delegate.isItemSelectable(item8);
  }
  selectedItemChanged(from, to, fromElement, toElement) {
    if (fromElement) {
      fromElement.classList.remove("highlighted");
    }
    if (toElement) {
      toElement.classList.add("highlighted");
    }
    setActiveDescendant(this.list.element, toElement);
    this.delegate.highlightedItemChanged(from, to, fromElement?.firstElementChild ?? null, toElement?.firstElementChild ?? null);
  }
  updateSelectedItemARIA(_fromElement, _toElement) {
    return false;
  }
  selectHighlightedItem() {
    this.selectItem(this.list.selectedItem());
  }
  refreshItem(item8) {
    this.list.refreshItem(item8);
  }
};

// gen/front_end/ui/legacy/TargetCrashedScreen.js
var TargetCrashedScreen_exports = {};
__export(TargetCrashedScreen_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  TargetCrashedScreen: () => TargetCrashedScreen
});
import * as i18n35 from "./../../core/i18n/i18n.js";
import { html as html6, render as render6 } from "./../lit/lit.js";

// gen/front_end/ui/legacy/targetCrashedScreen.css.js
var targetCrashedScreen_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *) {
  :scope {
    padding: 25px;
  }

  .message {
    font-size: larger;
    white-space: pre;
    margin: 5px;
  }
}

/*# sourceURL=${import.meta.resolve("./targetCrashedScreen.css")} */`;

// gen/front_end/ui/legacy/TargetCrashedScreen.js
var UIStrings18 = {
  /**
   * @description Text in dialog box when the target page crashed
   */
  devtoolsWasDisconnectedFromThe: "DevTools was disconnected from the page.",
  /**
   * @description Text content of content element
   */
  oncePageIsReloadedDevtoolsWill: "Once page is reloaded, DevTools will automatically reconnect."
};
var str_18 = i18n35.i18n.registerUIStrings("ui/legacy/TargetCrashedScreen.ts", UIStrings18);
var i18nString18 = i18n35.i18n.getLocalizedString.bind(void 0, str_18);
var DEFAULT_VIEW3 = (input, _output, target) => {
  render6(html6`
    <style>${targetCrashedScreen_css_default}</style>
    <div class="message">${i18nString18(UIStrings18.devtoolsWasDisconnectedFromThe)}</div>
    <div class="message">${i18nString18(UIStrings18.oncePageIsReloadedDevtoolsWill)}</div>`, target);
};
var TargetCrashedScreen = class extends VBox {
  hideCallback;
  constructor(hideCallback, view = DEFAULT_VIEW3) {
    super({ useShadowDom: true });
    view({}, {}, this.contentElement);
    this.hideCallback = hideCallback;
  }
  willHide() {
    super.willHide();
    this.hideCallback.call(null);
  }
};

// gen/front_end/ui/legacy/Treeoutline.js
var Treeoutline_exports = {};
__export(Treeoutline_exports, {
  Events: () => Events2,
  TreeElement: () => TreeElement,
  TreeOutline: () => TreeOutline,
  TreeOutlineInShadow: () => TreeOutlineInShadow,
  TreeSearch: () => TreeSearch,
  TreeViewElement: () => TreeViewElement,
  treeElementBylistItemNode: () => treeElementBylistItemNode
});
import * as Common18 from "./../../core/common/common.js";
import * as Platform24 from "./../../core/platform/platform.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Highlighting from "./../components/highlighting/highlighting.js";
import * as Lit3 from "./../lit/lit.js";
import * as VisualLogging25 from "./../visual_logging/visual_logging.js";

// gen/front_end/ui/legacy/treeoutline.css.js
var treeoutline_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  flex: 1 1 auto;
  padding: 2px 0 0;
}

.tree-outline-disclosure:not(.tree-outline-disclosure-hide-overflow) {
  min-width: 100%;
  display: inline-block;
}

.tree-outline {
  padding: 0 0 4px 4px;
  margin: 0;
  z-index: 0;
  position: relative;
}

.tree-outline:focus-visible {
  box-shadow: 0 0 0 2px var(--sys-color-state-focus-ring) inset;
}

.tree-outline li .selection {
  display: none;
  z-index: -1;
  margin-left: -10000px;
}

.tree-outline:not(.hide-selection-when-blurred) li.selected {
  color: var(--sys-color-on-surface-subtle);
}

.tree-outline:not(.hide-selection-when-blurred) li.selected .selection {
  display: block;
  background-color: var(--sys-color-neutral-container);
}

.tree-outline:not(.hide-selection-when-blurred) li.elements-drag-over .selection {
  display: block;
  margin-top: -2px;
  border-top: 2px solid;
  border-top-color: var(--sys-color-tonal-container);
}

.tree-outline li:hover:not(:has(devtools-checkbox)) .selection {
  display: block;
  background-color: var(--sys-color-state-hover-on-subtle);
}

.tree-outline:not(.hide-selection-when-blurred) li.hovered:not(.selected) .selection {
  display: block;
  left: 3px;
  right: 3px;
  background-color: var(--sys-color-state-hover-on-subtle);
  border-radius: 5px;
}

.tree-outline:not(.hide-selection-when-blurred) li.in-clipboard .highlight {
  outline: 1px dotted var(--sys-color-neutral-outline);
}

ol.tree-outline:not(.hide-selection-when-blurred) li.selected:focus .selection {
  background-color: var(--sys-color-tonal-container);
}

ol.tree-outline,
.tree-outline ol {
  list-style-type: none;
}

.tree-outline ol {
  padding-left: 12px;
}

.tree-outline li {
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;
  display: flex;
  align-items: center;
  min-height: 16px;
}

ol.tree-outline:not(.hide-selection-when-blurred) li.selected:focus {
  color: var(--sys-color-on-tonal-container);

  & ::selection {
    background-color: var(--sys-color-state-focus-select);
    color: currentcolor;
  }

  & *:not(devtools-icon) {
    color: inherit;
  }
}

.tree-outline li .icons-container {
  align-self: center;
  display: flex;
  align-items: center;
}

.tree-outline li .leading-icons {
  margin-right: 4px;
}

.tree-outline li .trailing-icons {
  margin-left: 4px;
}

.tree-outline li::before {
  user-select: none;
  mask-image: var(--image-file-arrow-collapse);
  background-color: var(--icon-default);
  content: "\\A0\\A0";
  text-shadow: none;
  margin-top: calc(-1 * var(--sys-size-2));
  height: var(--sys-size-8);
  width: var(--sys-size-8);
}

.tree-outline li:not(.parent)::before {
  background-color: transparent;
}

.tree-outline li.parent.expanded::before {
  mask-image: var(--image-file-arrow-drop-down);
}

.tree-outline ol.children {
  display: none;
}

.tree-outline ol.children.expanded {
  display: block;
}

.tree-outline.tree-outline-dense li {
  margin-top: 1px;
  min-height: 12px;
}

.tree-outline.tree-outline-dense li.parent {
  margin-top: 0;
}

.tree-outline.tree-outline-dense li.parent::before {
  top: 0;
}

.tree-outline.tree-outline-dense ol {
  padding-left: 10px;
}

.tree-outline.hide-selection-when-blurred .selected:focus-visible {
  background: var(--sys-color-state-focus-highlight);
  border-radius: 2px;
}

.tree-outline-disclosure:not(.tree-outline-disclosure-hide-overflow) .tree-outline.hide-selection-when-blurred .selected:focus-visible {
  width: fit-content;
  padding-right: 3px;
}

/* Navigation tree variant */
.tree-outline.tree-variant-navigation {
  padding: var(--sys-size-3) 0 var(--sys-size-3) var(--sys-size-3);
}

.tree-outline.tree-variant-navigation li,
.tree-outline.hide-selection-when-blurred.tree-variant-navigation li {
  height: var(--sys-size-10);
  margin-right: var(--sys-size-3);
  padding-right: var(--sys-size-3);
  padding-left: 6px;

  &::before {
    flex-shrink: 0;
    overflow: hidden;
    margin-right: 3px;
    margin-left: -3px;
  }

  & .selection {
    border-radius: 0 var(--sys-shape-corner-full) var(--sys-shape-corner-full) 0;
  }

  &.selected:focus {
    &.parent::before {
      background-color: var(--app-color-navigation-drawer-label-selected);
    }

    .selection {
      display: block;
      background-color: var(--app-color-navigation-drawer-background-selected);
    }
  }

  & .leading-icons {
    margin-right: var(--sys-size-4);
    overflow: hidden;
  }

  & .tree-element-title {
    height: inherit;
    flex-shrink: 100;
    overflow: hidden;
    text-overflow: ellipsis;
    align-content: center;
  }
}

.theme-with-dark-background,
:host-context(.theme-with-dark-background) {
  & .tree-variant-navigation li.selected:focus,
  .tree-variant-navigation li.selected:focus devtools-icon {
    color: var(--app-color-navigation-drawer-label-selected);

    --override-file-source-icon-color: var(--app-color-navigation-drawer-label-selected);
  }
}

ol.tree-outline.tree-variant-navigation:not(.hide-selection-when-blurred) li.selected:focus .selection {
  background-color: var(--app-color-navigation-drawer-background-selected);
}

@media (forced-colors: active) {
  .tree-outline-disclosure li.parent::before,
  .tree-outline:not(.hide-selection-when-blurred) li.parent:not(.selected)::before {
    forced-color-adjust: none;
    background-color: ButtonText;
  }

  .tree-outline li devtools-icon {
    forced-color-adjust: none;
    color: ButtonText;
  }

  .tree-outline-disclosure li.parent:hover:not(.selected)::before,
  .tree-outline:not(.hide-selection-when-blurred) li.parent:hover:not(.selected)::before {
    background-color: ButtonText;
  }

  .tree-outline:not(.hide-selection-when-blurred) li.selected .selection {
    forced-color-adjust: none;
    background-color: ButtonText;
  }

  ol.tree-outline:not(.hide-selection-when-blurred) li.selected:focus .selection,
  .tree-outline.hide-selection-when-blurred .selected:focus-visible {
    forced-color-adjust: none;
    background-color: Highlight;
  }

  ol.tree-outline.tree-variant-navigation li.selected {
    &.selected,
    &.selected:focus {
      & .selection {
        forced-color-adjust: none;
        background-color: ButtonText;
      }
    }
  }

  ol.tree-outline:not(.hide-selection-when-blurred) li.parent.selected::before,
  ol.tree-outline:not(.hide-selection-when-blurred) li.parent.selected:focus::before,
  .tree-outline.hide-selection-when-blurred .selected:focus-visible::before {
    background-color: HighlightText;
  }

  .tree-outline li:not(.parent)::before,
  .tree-outline li:not(.parent):hover::before,
  .tree-outline.hide-selection-when-blurred .selected:focus-visible:not(.parent)::before {
    forced-color-adjust: none;
    background-color: transparent;
  }

  .tree-outline:not(.hide-selection-when-blurred) devtools-icon,
  .tree-outline.hide-selection-when-blurred devtools-icon {
    color: ButtonText;
  }

  .tree-outline li.selected devtools-icon,
  .tree-outline li.selected:focus devtools-icon {
    color: HighlightText !important; /* stylelint-disable-line declaration-no-important */
  }

  ol.tree-outline:not(.hide-selection-when-blurred) li.selected,
  .tree-outline:not(.hide-selection-when-blurred) li.selected .tree-element-title,
  .tree-outline:not(.hide-selection-when-blurred) li.selected:focus,
  .tree-outline:not(.hide-selection-when-blurred) li:focus-visible .tree-element-title,
  .tree-outline:not(.hide-selection-when-blurred) li.selected:focus .tree-element-title,
  .tree-outline:not(.hide-selection-when-blurred) li.selected span,
  .tree-outline.hide-selection-when-blurred .selected:focus-visible span {
    forced-color-adjust: none;
    color: HighlightText;
  }

  .tree-outline:not(.hide-selection-when-blurred) li.selected:focus-visible devtools-adorner,
  .tree-outline.hide-selection-when-blurred li.selected:focus-visible devtools-adorner {
    --override-adorner-background-color: Highlight;
    --override-adorner-border-color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./treeoutline.css")} */`;

// gen/front_end/ui/legacy/Treeoutline.js
var nodeToParentTreeElementMap = /* @__PURE__ */ new WeakMap();
var { render: render7 } = Lit3;
var Events2;
(function(Events3) {
  Events3["ElementAttached"] = "ElementAttached";
  Events3["ElementsDetached"] = "ElementsDetached";
  Events3["ElementExpanded"] = "ElementExpanded";
  Events3["ElementCollapsed"] = "ElementCollapsed";
  Events3["ElementSelected"] = "ElementSelected";
})(Events2 || (Events2 = {}));
var TreeOutline = class extends Common18.ObjectWrapper.ObjectWrapper {
  rootElementInternal;
  renderSelection;
  selectedTreeElement;
  expandTreeElementsWhenArrowing;
  comparator;
  contentElement;
  preventTabOrder;
  showSelectionOnKeyboardFocus;
  focusable;
  element;
  useLightSelectionColor;
  treeElementToScrollIntoView;
  centerUponScrollIntoView;
  constructor() {
    super();
    this.rootElementInternal = this.createRootElement();
    this.renderSelection = false;
    this.selectedTreeElement = null;
    this.expandTreeElementsWhenArrowing = false;
    this.comparator = null;
    this.contentElement = this.rootElementInternal.childrenListNode;
    this.contentElement.addEventListener("keydown", this.treeKeyDown.bind(this), false);
    this.preventTabOrder = false;
    this.showSelectionOnKeyboardFocus = false;
    this.focusable = true;
    this.setFocusable(true);
    this.element = this.contentElement;
    this.element.setAttribute("jslog", `${VisualLogging25.tree()}`);
    markAsTree(this.element);
    this.useLightSelectionColor = false;
    this.treeElementToScrollIntoView = null;
    this.centerUponScrollIntoView = false;
  }
  setShowSelectionOnKeyboardFocus(show, preventTabOrder) {
    this.contentElement.classList.toggle("hide-selection-when-blurred", show);
    this.preventTabOrder = Boolean(preventTabOrder);
    if (this.focusable) {
      this.contentElement.tabIndex = Boolean(preventTabOrder) ? -1 : 0;
    }
    this.showSelectionOnKeyboardFocus = show;
  }
  createRootElement() {
    const rootElement = new TreeElement();
    rootElement.treeOutline = this;
    rootElement.root = true;
    rootElement.selectable = false;
    rootElement.expanded = true;
    rootElement.childrenListNode.classList.remove("children");
    return rootElement;
  }
  rootElement() {
    return this.rootElementInternal;
  }
  firstChild() {
    return this.rootElementInternal.firstChild();
  }
  lastDescendent() {
    let last = this.rootElementInternal.lastChild();
    while (last && last.expanded && last.childCount()) {
      last = last.lastChild();
    }
    return last;
  }
  appendChild(child, comparator) {
    this.rootElementInternal.appendChild(child, comparator);
  }
  insertChild(child, index) {
    this.rootElementInternal.insertChild(child, index);
  }
  removeChild(child) {
    this.rootElementInternal.removeChild(child);
  }
  removeChildren() {
    this.rootElementInternal.removeChildren();
  }
  treeElementFromPoint(x, y) {
    const node = deepElementFromPoint(this.contentElement.ownerDocument, x, y);
    if (!node) {
      return null;
    }
    const listNode = enclosingNodeOrSelfWithNodeNameInArray(node, ["ol", "li"]);
    if (listNode) {
      return nodeToParentTreeElementMap.get(listNode) || treeElementBylistItemNode.get(listNode) || null;
    }
    return null;
  }
  treeElementFromEvent(event) {
    return event ? this.treeElementFromPoint(event.pageX, event.pageY) : null;
  }
  setComparator(comparator) {
    this.comparator = comparator;
  }
  setFocusable(focusable) {
    this.focusable = focusable;
    this.updateFocusable();
  }
  updateFocusable() {
    if (this.focusable) {
      this.contentElement.tabIndex = this.preventTabOrder || Boolean(this.selectedTreeElement) ? -1 : 0;
      if (this.selectedTreeElement) {
        this.selectedTreeElement.setFocusable(true);
      }
    } else {
      this.contentElement.removeAttribute("tabIndex");
      if (this.selectedTreeElement) {
        this.selectedTreeElement.setFocusable(false);
      }
    }
  }
  focus() {
    if (this.selectedTreeElement) {
      this.selectedTreeElement.listItemElement.focus();
    } else {
      this.contentElement.focus();
    }
  }
  setUseLightSelectionColor(flag) {
    this.useLightSelectionColor = flag;
  }
  getUseLightSelectionColor() {
    return this.useLightSelectionColor;
  }
  bindTreeElement(element) {
    if (element.treeOutline) {
      console.error("Binding element for the second time: " + new Error().stack);
    }
    element.treeOutline = this;
    element.onbind();
  }
  unbindTreeElement(element) {
    if (!element.treeOutline) {
      console.error("Unbinding element that was not bound: " + new Error().stack);
    }
    element.deselect();
    element.onunbind();
    element.treeOutline = null;
  }
  selectPrevious() {
    let nextSelectedElement = this.selectedTreeElement?.traversePreviousTreeElement(true) ?? null;
    while (nextSelectedElement && !nextSelectedElement.selectable) {
      nextSelectedElement = nextSelectedElement.traversePreviousTreeElement(!this.expandTreeElementsWhenArrowing);
    }
    if (!nextSelectedElement) {
      return false;
    }
    nextSelectedElement.select(false, true);
    return true;
  }
  selectNext() {
    let nextSelectedElement = this.selectedTreeElement?.traverseNextTreeElement(true) ?? null;
    while (nextSelectedElement && !nextSelectedElement.selectable) {
      nextSelectedElement = nextSelectedElement.traverseNextTreeElement(!this.expandTreeElementsWhenArrowing);
    }
    if (!nextSelectedElement) {
      return false;
    }
    nextSelectedElement.select(false, true);
    return true;
  }
  forceSelect(omitFocus = false, selectedByUser = true) {
    if (this.selectedTreeElement) {
      this.selectedTreeElement.deselect();
    }
    this.selectFirst(omitFocus, selectedByUser);
  }
  selectFirst(omitFocus = false, selectedByUser = true) {
    let first = this.firstChild();
    while (first && !first.selectable) {
      first = first.traverseNextTreeElement(true);
    }
    if (!first) {
      return false;
    }
    first.select(omitFocus, selectedByUser);
    return true;
  }
  selectLast() {
    let last = this.lastDescendent();
    while (last && !last.selectable) {
      last = last.traversePreviousTreeElement(true);
    }
    if (!last) {
      return false;
    }
    last.select(false, true);
    return true;
  }
  treeKeyDown(event) {
    if (event.shiftKey || event.metaKey || event.ctrlKey || isEditing()) {
      return;
    }
    let handled = false;
    if (!this.selectedTreeElement) {
      if (event.key === "ArrowUp" && !event.altKey) {
        handled = this.selectLast();
      } else if (event.key === "ArrowDown" && !event.altKey) {
        handled = this.selectFirst();
      }
    } else if (event.key === "ArrowUp" && !event.altKey) {
      handled = this.selectPrevious();
    } else if (event.key === "ArrowDown" && !event.altKey) {
      handled = this.selectNext();
    } else if (event.key === "ArrowLeft") {
      handled = this.selectedTreeElement.collapseOrAscend(event.altKey);
    } else if (event.key === "ArrowRight") {
      if (!this.selectedTreeElement.revealed()) {
        this.selectedTreeElement.reveal();
        handled = true;
      } else {
        handled = this.selectedTreeElement.descendOrExpand(event.altKey);
      }
    } else if (event.keyCode === 8 || event.keyCode === 46) {
      handled = this.selectedTreeElement.ondelete();
    } else if (event.key === "Enter") {
      handled = this.selectedTreeElement.onenter();
    } else if (event.keyCode === Keys.Space.code) {
      handled = this.selectedTreeElement.onspace();
    } else if (event.key === "Home") {
      handled = this.selectFirst();
    } else if (event.key === "End") {
      handled = this.selectLast();
    }
    if (handled) {
      event.consume(true);
    }
  }
  deferredScrollIntoView(treeElement, center) {
    const deferredScrollIntoView = () => {
      if (!this.treeElementToScrollIntoView) {
        return;
      }
      const itemRect = this.treeElementToScrollIntoView.listItemElement.getBoundingClientRect();
      const treeRect = this.contentElement.getBoundingClientRect();
      let scrollParentElement = this.element;
      while (getComputedStyle(scrollParentElement).overflow === "visible" && scrollParentElement.parentElementOrShadowHost()) {
        const parent = scrollParentElement.parentElementOrShadowHost();
        Platform24.assertNotNullOrUndefined(parent);
        scrollParentElement = parent;
      }
      const viewRect = scrollParentElement.getBoundingClientRect();
      const currentScrollX = viewRect.left - treeRect.left;
      const currentScrollY = viewRect.top - treeRect.top + this.contentElement.offsetTop;
      let deltaLeft = itemRect.left - treeRect.left;
      if (deltaLeft > currentScrollX && deltaLeft < currentScrollX + viewRect.width) {
        deltaLeft = currentScrollX;
      } else if (this.centerUponScrollIntoView) {
        deltaLeft = deltaLeft - viewRect.width / 2;
      }
      let deltaTop = itemRect.top - treeRect.top;
      if (deltaTop > currentScrollY && deltaTop < currentScrollY + viewRect.height) {
        deltaTop = currentScrollY;
      } else if (this.centerUponScrollIntoView) {
        deltaTop = deltaTop - viewRect.height / 2;
      }
      scrollParentElement.scrollTo(deltaLeft, deltaTop);
      this.treeElementToScrollIntoView = null;
    };
    if (!this.treeElementToScrollIntoView) {
      this.element.window().requestAnimationFrame(deferredScrollIntoView);
    }
    this.treeElementToScrollIntoView = treeElement;
    this.centerUponScrollIntoView = center;
  }
  onStartedEditingTitle(_treeElement) {
  }
};
var TreeOutlineInShadow = class extends TreeOutline {
  element;
  shadowRoot;
  disclosureElement;
  renderSelection;
  constructor(variant = "Other", element) {
    super();
    this.contentElement.classList.add("tree-outline");
    this.element = element ?? document.createElement("div");
    this.shadowRoot = createShadowRootWithCoreStyles(this.element, { cssFile: treeoutline_css_default });
    this.disclosureElement = this.shadowRoot.createChild("div", "tree-outline-disclosure");
    this.disclosureElement.appendChild(this.contentElement);
    this.renderSelection = true;
    if (variant === "NavigationTree") {
      this.contentElement.classList.add("tree-variant-navigation");
    }
  }
  setVariant(variant) {
    this.contentElement.classList.toggle(
      "tree-variant-navigation",
      variant === "NavigationTree"
      /* TreeVariant.NAVIGATION_TREE */
    );
  }
  registerRequiredCSS(...cssFiles) {
    for (const cssFile of cssFiles) {
      appendStyle(this.shadowRoot, cssFile);
    }
  }
  setHideOverflow(hideOverflow) {
    this.disclosureElement.classList.toggle("tree-outline-disclosure-hide-overflow", hideOverflow);
  }
  setDense(dense) {
    this.contentElement.classList.toggle("tree-outline-dense", dense);
  }
  onStartedEditingTitle(treeElement) {
    const selection = this.shadowRoot.getSelection();
    if (selection) {
      selection.selectAllChildren(treeElement.titleElement);
    }
  }
};
var treeElementBylistItemNode = /* @__PURE__ */ new WeakMap();
var TreeElement = class {
  treeOutline;
  parent;
  previousSibling;
  nextSibling;
  boundOnFocus;
  boundOnBlur;
  listItemNode;
  titleElement;
  titleInternal;
  childrenInternal;
  childrenListNode;
  expandLoggable = {};
  hiddenInternal;
  selectableInternal;
  expanded;
  selected;
  expandable;
  #expandRecursively = true;
  collapsible;
  toggleOnClick;
  button;
  root;
  tooltipInternal;
  leadingIconsElement;
  trailingIconsElement;
  selectionElementInternal;
  disableSelectFocus;
  constructor(title, expandable, jslogContext) {
    this.treeOutline = null;
    this.parent = null;
    this.previousSibling = null;
    this.nextSibling = null;
    this.boundOnFocus = this.onFocus.bind(this);
    this.boundOnBlur = this.onBlur.bind(this);
    this.listItemNode = document.createElement("li");
    this.titleElement = this.listItemNode.createChild("span", "tree-element-title");
    treeElementBylistItemNode.set(this.listItemNode, this);
    this.titleInternal = "";
    if (title) {
      this.title = title;
    }
    this.listItemNode.addEventListener("mousedown", this.handleMouseDown.bind(this), false);
    this.listItemNode.addEventListener("click", this.treeElementToggled.bind(this), false);
    this.listItemNode.addEventListener("dblclick", this.handleDoubleClick.bind(this), false);
    this.listItemNode.setAttribute("jslog", `${VisualLogging25.treeItem().parent("parentTreeItem").context(jslogContext).track({
      click: true,
      keydown: "ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Space|Home|End"
    })}`);
    markAsTreeitem(this.listItemNode);
    this.childrenInternal = null;
    this.childrenListNode = document.createElement("ol");
    nodeToParentTreeElementMap.set(this.childrenListNode, this);
    this.childrenListNode.classList.add("children");
    markAsGroup(this.childrenListNode);
    this.hiddenInternal = false;
    this.selectableInternal = true;
    this.expanded = false;
    this.selected = false;
    this.setExpandable(expandable || false);
    this.collapsible = true;
    this.toggleOnClick = false;
    this.button = null;
    this.root = false;
    this.tooltipInternal = "";
    this.leadingIconsElement = null;
    this.trailingIconsElement = null;
    this.selectionElementInternal = null;
    this.disableSelectFocus = false;
  }
  static getTreeElementBylistItemNode(node) {
    return treeElementBylistItemNode.get(node);
  }
  hasAncestor(ancestor) {
    if (!ancestor) {
      return false;
    }
    let currentNode = this.parent;
    while (currentNode) {
      if (ancestor === currentNode) {
        return true;
      }
      currentNode = currentNode.parent;
    }
    return false;
  }
  hasAncestorOrSelf(ancestor) {
    return this === ancestor || this.hasAncestor(ancestor);
  }
  isHidden() {
    if (this.hidden) {
      return true;
    }
    let currentNode = this.parent;
    while (currentNode) {
      if (currentNode.hidden) {
        return true;
      }
      currentNode = currentNode.parent;
    }
    return false;
  }
  children() {
    return this.childrenInternal || [];
  }
  childCount() {
    return this.childrenInternal ? this.childrenInternal.length : 0;
  }
  firstChild() {
    return this.childrenInternal ? this.childrenInternal[0] : null;
  }
  lastChild() {
    return this.childrenInternal ? this.childrenInternal[this.childrenInternal.length - 1] : null;
  }
  childAt(index) {
    return this.childrenInternal ? this.childrenInternal[index] : null;
  }
  indexOfChild(child) {
    return this.childrenInternal ? this.childrenInternal.indexOf(child) : -1;
  }
  appendChild(child, comparator) {
    if (!this.childrenInternal) {
      this.childrenInternal = [];
    }
    let insertionIndex;
    if (comparator) {
      insertionIndex = Platform24.ArrayUtilities.lowerBound(this.childrenInternal, child, comparator);
    } else if (this.treeOutline?.comparator) {
      insertionIndex = Platform24.ArrayUtilities.lowerBound(this.childrenInternal, child, this.treeOutline.comparator);
    } else {
      insertionIndex = this.childrenInternal.length;
    }
    this.insertChild(child, insertionIndex);
  }
  insertChild(child, index) {
    if (!this.childrenInternal) {
      this.childrenInternal = [];
    }
    if (!child) {
      throw new Error("child can't be undefined or null");
    }
    console.assert(!child.parent, "Attempting to insert a child that is already in the tree, reparenting is not supported.");
    const previousChild = index > 0 ? this.childrenInternal[index - 1] : null;
    if (previousChild) {
      previousChild.nextSibling = child;
      child.previousSibling = previousChild;
    } else {
      child.previousSibling = null;
    }
    const nextChild = this.childrenInternal[index];
    if (nextChild) {
      nextChild.previousSibling = child;
      child.nextSibling = nextChild;
    } else {
      child.nextSibling = null;
    }
    this.childrenInternal.splice(index, 0, child);
    this.setExpandable(true);
    child.parent = this;
    if (this.treeOutline) {
      this.treeOutline.bindTreeElement(child);
    }
    for (let current = child.firstChild(); this.treeOutline && current; current = current.traverseNextTreeElement(false, child, true)) {
      this.treeOutline.bindTreeElement(current);
    }
    child.onattach();
    child.ensureSelection();
    if (this.treeOutline) {
      this.treeOutline.dispatchEventToListeners(Events2.ElementAttached, child);
    }
    const nextSibling = child.nextSibling ? child.nextSibling.listItemNode : null;
    this.childrenListNode.insertBefore(child.listItemNode, nextSibling);
    this.childrenListNode.insertBefore(child.childrenListNode, nextSibling);
    if (child.selected) {
      child.select();
    }
    if (child.expanded) {
      child.expand();
    }
  }
  removeChildAtIndex(childIndex) {
    if (!this.childrenInternal || childIndex < 0 || childIndex >= this.childrenInternal.length) {
      throw new Error("childIndex out of range");
    }
    const child = this.childrenInternal[childIndex];
    this.childrenInternal.splice(childIndex, 1);
    const parent = child.parent;
    if (this.treeOutline?.selectedTreeElement?.hasAncestorOrSelf(child)) {
      if (child.nextSibling) {
        child.nextSibling.select(true);
      } else if (child.previousSibling) {
        child.previousSibling.select(true);
      } else if (parent) {
        parent.select(true);
      }
    }
    if (child.previousSibling) {
      child.previousSibling.nextSibling = child.nextSibling;
    }
    if (child.nextSibling) {
      child.nextSibling.previousSibling = child.previousSibling;
    }
    child.parent = null;
    if (this.treeOutline) {
      this.treeOutline.unbindTreeElement(child);
    }
    for (let current = child.firstChild(); this.treeOutline && current; current = current.traverseNextTreeElement(false, child, true)) {
      this.treeOutline.unbindTreeElement(current);
    }
    child.detach();
    if (this.treeOutline) {
      this.treeOutline.dispatchEventToListeners(Events2.ElementsDetached);
    }
  }
  removeChild(child) {
    if (!child) {
      throw new Error("child can't be undefined or null");
    }
    if (child.parent !== this) {
      return;
    }
    const childIndex = this.childrenInternal ? this.childrenInternal.indexOf(child) : -1;
    if (childIndex === -1) {
      throw new Error("child not found in this node's children");
    }
    this.removeChildAtIndex(childIndex);
  }
  removeChildren() {
    if (!this.root && this.treeOutline?.selectedTreeElement?.hasAncestorOrSelf(this)) {
      this.select(true);
    }
    if (this.childrenInternal) {
      for (const child of this.childrenInternal) {
        child.previousSibling = null;
        child.nextSibling = null;
        child.parent = null;
        if (this.treeOutline) {
          this.treeOutline.unbindTreeElement(child);
        }
        for (let current = child.firstChild(); this.treeOutline && current; current = current.traverseNextTreeElement(false, child, true)) {
          this.treeOutline.unbindTreeElement(current);
        }
        child.detach();
      }
    }
    this.childrenInternal = [];
    if (this.treeOutline) {
      this.treeOutline.dispatchEventToListeners(Events2.ElementsDetached);
    }
  }
  get selectable() {
    if (this.isHidden()) {
      return false;
    }
    return this.selectableInternal;
  }
  set selectable(x) {
    this.selectableInternal = x;
  }
  get listItemElement() {
    return this.listItemNode;
  }
  get childrenListElement() {
    return this.childrenListNode;
  }
  get title() {
    return this.titleInternal;
  }
  set title(x) {
    if (this.titleInternal === x) {
      return;
    }
    this.titleInternal = x;
    if (typeof x === "string") {
      this.titleElement.textContent = x;
      this.tooltip = x;
    } else {
      this.titleElement = x;
      this.tooltip = "";
    }
    this.listItemNode.removeChildren();
    if (this.leadingIconsElement) {
      this.listItemNode.appendChild(this.leadingIconsElement);
    }
    this.listItemNode.appendChild(this.titleElement);
    if (this.trailingIconsElement) {
      this.listItemNode.appendChild(this.trailingIconsElement);
    }
    this.ensureSelection();
  }
  titleAsText() {
    if (!this.titleInternal) {
      return "";
    }
    if (typeof this.titleInternal === "string") {
      return this.titleInternal;
    }
    return this.titleInternal.textContent || "";
  }
  startEditingTitle(editingConfig) {
    InplaceEditor.startEditing(this.titleElement, editingConfig);
    if (this.treeOutline) {
      this.treeOutline.onStartedEditingTitle(this);
    }
  }
  setLeadingIcons(icons) {
    if (!this.leadingIconsElement && !icons.length) {
      return;
    }
    if (!this.leadingIconsElement) {
      this.leadingIconsElement = document.createElement("div");
      this.leadingIconsElement.classList.add("leading-icons");
      this.leadingIconsElement.classList.add("icons-container");
      this.listItemNode.insertBefore(this.leadingIconsElement, this.titleElement);
      this.ensureSelection();
    }
    render7(icons, this.leadingIconsElement);
  }
  get tooltip() {
    return this.tooltipInternal;
  }
  set tooltip(x) {
    if (this.tooltipInternal === x) {
      return;
    }
    this.tooltipInternal = x;
    Tooltip.install(this.listItemNode, x);
  }
  isExpandable() {
    return this.expandable;
  }
  setExpandable(expandable) {
    if (this.expandable === expandable) {
      return;
    }
    this.expandable = expandable;
    this.listItemNode.classList.toggle("parent", expandable);
    if (!expandable) {
      this.collapse();
      unsetExpandable(this.listItemNode);
    } else {
      VisualLogging25.registerLoggable(this.expandLoggable, `${VisualLogging25.expand()}`, this.listItemNode, new DOMRect(0, 0, 16, 16));
      setExpanded(this.listItemNode, false);
    }
  }
  isExpandRecursively() {
    return this.#expandRecursively;
  }
  setExpandRecursively(expandRecursively) {
    this.#expandRecursively = expandRecursively;
  }
  isCollapsible() {
    return this.collapsible;
  }
  setCollapsible(collapsible) {
    if (this.collapsible === collapsible) {
      return;
    }
    this.collapsible = collapsible;
    this.listItemNode.classList.toggle("always-parent", !collapsible);
    if (!collapsible) {
      this.expand();
    }
  }
  get hidden() {
    return this.hiddenInternal;
  }
  set hidden(x) {
    if (this.hiddenInternal === x) {
      return;
    }
    this.hiddenInternal = x;
    this.listItemNode.classList.toggle("hidden", x);
    this.childrenListNode.classList.toggle("hidden", x);
    if (x && this.treeOutline?.selectedTreeElement?.hasAncestorOrSelf(this)) {
      const hadFocus = this.treeOutline.selectedTreeElement.listItemElement.hasFocus();
      this.treeOutline.forceSelect(
        !hadFocus,
        /* selectedByUser */
        false
      );
    }
  }
  invalidateChildren() {
    if (this.childrenInternal) {
      this.removeChildren();
      this.childrenInternal = null;
    }
  }
  ensureSelection() {
    if (!this.treeOutline?.renderSelection) {
      return;
    }
    if (!this.selectionElementInternal) {
      this.selectionElementInternal = document.createElement("div");
      this.selectionElementInternal.classList.add("selection");
      this.selectionElementInternal.classList.add("fill");
    }
    this.listItemNode.insertBefore(this.selectionElementInternal, this.listItemElement.firstChild);
  }
  treeElementToggled(event) {
    const element = event.currentTarget;
    if (!element || treeElementBylistItemNode.get(element) !== this || element.hasSelection()) {
      return;
    }
    console.assert(Boolean(this.treeOutline));
    const showSelectionOnKeyboardFocus = this.treeOutline ? this.treeOutline.showSelectionOnKeyboardFocus : false;
    const toggleOnClick = this.toggleOnClick && (showSelectionOnKeyboardFocus || !this.selectable);
    const isInTriangle = this.isEventWithinDisclosureTriangle(event);
    if (!toggleOnClick && !isInTriangle) {
      return;
    }
    if (this.expanded) {
      if (event.altKey) {
        this.collapseRecursively();
      } else {
        this.collapse();
      }
    } else if (event.altKey) {
      void this.expandRecursively();
    } else {
      this.expand();
    }
    void VisualLogging25.logClick(this.expandLoggable, event);
    event.consume();
  }
  handleMouseDown(event) {
    const element = event.currentTarget;
    if (!element) {
      return;
    }
    if (!this.selectable) {
      return;
    }
    if (treeElementBylistItemNode.get(element) !== this) {
      return;
    }
    if (this.isEventWithinDisclosureTriangle(event)) {
      return;
    }
    this.selectOnMouseDown(event);
  }
  handleDoubleClick(event) {
    const element = event.currentTarget;
    if (!element || treeElementBylistItemNode.get(element) !== this) {
      return;
    }
    const handled = this.ondblclick(event);
    if (handled) {
      return;
    }
    if (this.expandable && !this.expanded) {
      this.expand();
    }
  }
  detach() {
    this.listItemNode.remove();
    this.childrenListNode.remove();
  }
  collapse() {
    if (!this.expanded || !this.collapsible) {
      return;
    }
    this.listItemNode.classList.remove("expanded");
    this.childrenListNode.classList.remove("expanded");
    setExpanded(this.listItemNode, false);
    this.expanded = false;
    this.oncollapse();
    if (this.treeOutline) {
      this.treeOutline.dispatchEventToListeners(Events2.ElementCollapsed, this);
    }
    const selectedTreeElement = this.treeOutline?.selectedTreeElement;
    if (selectedTreeElement?.hasAncestor(this)) {
      this.select(
        /* omitFocus */
        true,
        /* selectedByUser */
        true
      );
    }
  }
  collapseRecursively() {
    let item8 = this;
    while (item8) {
      if (item8.expanded) {
        item8.collapse();
      }
      item8 = item8.traverseNextTreeElement(false, this, true);
    }
  }
  collapseChildren() {
    if (!this.childrenInternal) {
      return;
    }
    for (const child of this.childrenInternal) {
      child.collapseRecursively();
    }
  }
  expand() {
    if (!this.expandable || this.expanded && this.childrenInternal) {
      return;
    }
    this.expanded = true;
    void this.populateIfNeeded();
    this.listItemNode.classList.add("expanded");
    this.childrenListNode.classList.add("expanded");
    setExpanded(this.listItemNode, true);
    if (this.treeOutline) {
      this.onexpand();
      this.treeOutline.dispatchEventToListeners(Events2.ElementExpanded, this);
    }
  }
  async expandRecursively(maxDepth) {
    let item8 = this;
    const info = { depthChange: 0 };
    let depth = 0;
    if (maxDepth === void 0 || isNaN(maxDepth)) {
      maxDepth = 3;
    }
    do {
      if (item8.isExpandRecursively()) {
        await item8.populateIfNeeded();
        if (depth < maxDepth) {
          item8.expand();
        }
      }
      item8 = item8.traverseNextTreeElement(!item8.isExpandRecursively(), this, true, info);
      depth += info.depthChange;
    } while (item8 !== null);
  }
  collapseOrAscend(altKey) {
    if (this.expanded && this.collapsible) {
      if (altKey) {
        this.collapseRecursively();
      } else {
        this.collapse();
      }
      return true;
    }
    if (!this.parent || this.parent.root) {
      return false;
    }
    if (!this.parent.selectable) {
      this.parent.collapse();
      return true;
    }
    let nextSelectedElement = this.parent;
    while (nextSelectedElement && !nextSelectedElement.selectable) {
      nextSelectedElement = nextSelectedElement.parent;
    }
    if (!nextSelectedElement) {
      return false;
    }
    nextSelectedElement.select(false, true);
    return true;
  }
  descendOrExpand(altKey) {
    if (!this.expandable) {
      return false;
    }
    if (!this.expanded) {
      if (altKey) {
        void this.expandRecursively();
      } else {
        this.expand();
      }
      return true;
    }
    let nextSelectedElement = this.firstChild();
    while (nextSelectedElement && !nextSelectedElement.selectable) {
      nextSelectedElement = nextSelectedElement.nextSibling;
    }
    if (!nextSelectedElement) {
      return false;
    }
    nextSelectedElement.select(false, true);
    return true;
  }
  reveal(center) {
    let currentAncestor = this.parent;
    while (currentAncestor && !currentAncestor.root) {
      if (!currentAncestor.expanded) {
        currentAncestor.expand();
      }
      currentAncestor = currentAncestor.parent;
    }
    if (this.treeOutline) {
      this.treeOutline.deferredScrollIntoView(this, Boolean(center));
    }
  }
  revealed() {
    let currentAncestor = this.parent;
    while (currentAncestor && !currentAncestor.root) {
      if (!currentAncestor.expanded) {
        return false;
      }
      currentAncestor = currentAncestor.parent;
    }
    return true;
  }
  selectOnMouseDown(event) {
    if (this.select(false, true)) {
      event.consume(true);
    }
    if (this.listItemNode.draggable && this.selectionElementInternal && this.treeOutline) {
      const marginLeft = this.treeOutline.element.getBoundingClientRect().left - this.listItemNode.getBoundingClientRect().left - this.treeOutline.element.scrollLeft;
      this.selectionElementInternal.style.setProperty("margin-left", marginLeft + "px");
    }
  }
  select(omitFocus, selectedByUser) {
    omitFocus = omitFocus || this.disableSelectFocus;
    if (!this.treeOutline || !this.selectable || this.selected) {
      if (!omitFocus) {
        this.listItemElement.focus();
      }
      return false;
    }
    const lastSelected = this.treeOutline.selectedTreeElement;
    this.treeOutline.selectedTreeElement = null;
    if (this.treeOutline.rootElementInternal === this) {
      if (lastSelected) {
        lastSelected.deselect();
      }
      if (!omitFocus) {
        this.listItemElement.focus();
      }
      return false;
    }
    this.selected = true;
    this.treeOutline.selectedTreeElement = this;
    this.treeOutline.updateFocusable();
    if (!omitFocus || this.treeOutline.contentElement.hasFocus()) {
      this.listItemElement.focus();
    }
    this.listItemNode.classList.add("selected");
    setSelected(this.listItemNode, true);
    this.treeOutline.dispatchEventToListeners(Events2.ElementSelected, this);
    if (lastSelected) {
      lastSelected.deselect();
    }
    return this.onselect(selectedByUser);
  }
  setFocusable(focusable) {
    if (focusable) {
      this.listItemNode.setAttribute("tabIndex", this.treeOutline?.preventTabOrder ? "-1" : "0");
      this.listItemNode.addEventListener("focus", this.boundOnFocus, false);
      this.listItemNode.addEventListener("blur", this.boundOnBlur, false);
    } else {
      this.listItemNode.removeAttribute("tabIndex");
      this.listItemNode.removeEventListener("focus", this.boundOnFocus, false);
      this.listItemNode.removeEventListener("blur", this.boundOnBlur, false);
    }
  }
  onFocus() {
    if (!this.treeOutline || this.treeOutline.getUseLightSelectionColor()) {
      return;
    }
    if (!this.treeOutline.contentElement.classList.contains("hide-selection-when-blurred")) {
      this.listItemNode.classList.add("force-white-icons");
    }
  }
  onBlur() {
    if (!this.treeOutline || this.treeOutline.getUseLightSelectionColor()) {
      return;
    }
    if (!this.treeOutline.contentElement.classList.contains("hide-selection-when-blurred")) {
      this.listItemNode.classList.remove("force-white-icons");
    }
  }
  revealAndSelect(omitFocus) {
    this.reveal(true);
    this.select(omitFocus);
  }
  deselect() {
    const hadFocus = this.listItemNode.hasFocus();
    this.selected = false;
    this.listItemNode.classList.remove("selected");
    clearSelected(this.listItemNode);
    this.setFocusable(false);
    if (this.treeOutline && this.treeOutline.selectedTreeElement === this) {
      this.treeOutline.selectedTreeElement = null;
      this.treeOutline.updateFocusable();
      if (hadFocus) {
        this.treeOutline.focus();
      }
    }
  }
  async populateIfNeeded() {
    if (this.treeOutline && this.expandable && !this.childrenInternal) {
      this.childrenInternal = [];
      await this.onpopulate();
    }
  }
  async onpopulate() {
  }
  onenter() {
    if (this.expandable && !this.expanded) {
      this.expand();
      return true;
    }
    if (this.collapsible && this.expanded) {
      this.collapse();
      return true;
    }
    return false;
  }
  ondelete() {
    return false;
  }
  onspace() {
    return false;
  }
  onbind() {
  }
  onunbind() {
  }
  onattach() {
  }
  onexpand() {
  }
  oncollapse() {
  }
  ondblclick(_e) {
    return false;
  }
  onselect(_selectedByUser) {
    return false;
  }
  traverseNextTreeElement(skipUnrevealed, stayWithin, dontPopulate, info) {
    if (!dontPopulate) {
      void this.populateIfNeeded();
    }
    if (info) {
      info.depthChange = 0;
    }
    let element = skipUnrevealed ? this.revealed() ? this.firstChild() : null : this.firstChild();
    if (element && (!skipUnrevealed || skipUnrevealed && this.expanded)) {
      if (info) {
        info.depthChange = 1;
      }
      return element;
    }
    if (this === stayWithin) {
      return null;
    }
    element = skipUnrevealed ? this.revealed() ? this.nextSibling : null : this.nextSibling;
    if (element) {
      return element;
    }
    element = this;
    while (element && !element.root && !(skipUnrevealed ? element.revealed() ? element.nextSibling : null : element.nextSibling) && element.parent !== stayWithin) {
      if (info) {
        info.depthChange -= 1;
      }
      element = element.parent;
    }
    if (!element || element.root) {
      return null;
    }
    return skipUnrevealed ? element.revealed() ? element.nextSibling : null : element.nextSibling;
  }
  traversePreviousTreeElement(skipUnrevealed, dontPopulate) {
    let element = skipUnrevealed ? this.revealed() ? this.previousSibling : null : this.previousSibling;
    if (!dontPopulate && element) {
      void element.populateIfNeeded();
    }
    while (element && (skipUnrevealed ? element.revealed() && element.expanded ? element.lastChild() : null : element.lastChild())) {
      if (!dontPopulate) {
        void element.populateIfNeeded();
      }
      element = skipUnrevealed ? element.revealed() && element.expanded ? element.lastChild() : null : element.lastChild();
    }
    if (element) {
      return element;
    }
    if (!this.parent || this.parent.root) {
      return null;
    }
    return this.parent;
  }
  isEventWithinDisclosureTriangle(event) {
    const arrowToggleWidth = 10;
    const paddingLeftValue = window.getComputedStyle(this.listItemNode).paddingLeft;
    console.assert(paddingLeftValue.endsWith("px"));
    const computedLeftPadding = parseFloat(paddingLeftValue);
    const left = this.listItemNode.getBoundingClientRect().left + computedLeftPadding;
    return event.pageX >= left && event.pageX <= left + arrowToggleWidth && this.expandable;
  }
  setDisableSelectFocus(toggle6) {
    this.disableSelectFocus = toggle6;
  }
};
function hasBooleanAttribute(element, name) {
  return element.hasAttribute(name) && element.getAttribute(name) !== "false";
}
var TreeSearch = class {
  #matches = [];
  #currentMatchIndex = 0;
  #nodeMatchMap;
  reset() {
    this.#matches = [];
    this.#nodeMatchMap = void 0;
    this.#currentMatchIndex = 0;
  }
  currentMatch() {
    return this.#matches.at(this.#currentMatchIndex);
  }
  #getNodeMatchMap() {
    if (!this.#nodeMatchMap) {
      this.#nodeMatchMap = /* @__PURE__ */ new WeakMap();
      for (const match of this.#matches) {
        let entry = this.#nodeMatchMap.get(match.node);
        if (!entry) {
          entry = [];
          this.#nodeMatchMap.set(match.node, entry);
        }
        entry.push(match);
      }
    }
    return this.#nodeMatchMap;
  }
  getResults(node) {
    return this.#getNodeMatchMap().get(node) ?? [];
  }
  static highlight(ranges, selectedRange) {
    return Lit3.Directives.ref((element) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }
      const configListItem = element.closest('li[role="treeitem"]');
      const titleElement = configListItem ? TreeViewTreeElement.get(configListItem)?.titleElement : void 0;
      if (configListItem && titleElement) {
        const targetElement = HTMLElementWithLightDOMTemplate.findCorrespondingElement(element, configListItem, titleElement);
        if (targetElement) {
          Highlighting.HighlightManager.HighlightManager.instance().set(targetElement, ranges, selectedRange);
        }
      }
    });
  }
  updateSearchableView(view) {
    view.updateSearchMatchesCount(this.#matches.length);
    view.updateCurrentMatchIndex(this.#currentMatchIndex);
  }
  next() {
    this.#currentMatchIndex = Platform24.NumberUtilities.mod(this.#currentMatchIndex + 1, this.#matches.length);
    return this.currentMatch();
  }
  prev() {
    this.#currentMatchIndex = Platform24.NumberUtilities.mod(this.#currentMatchIndex - 1, this.#matches.length);
    return this.currentMatch();
  }
  // This is a generator to sidestep stack overflow risks
  *#innerSearch(node, currentMatch, jumpBackwards, match) {
    const updateCurrentMatchIndex = (isPostOrder) => {
      if (currentMatch?.node === node && currentMatch.isPostOrderMatch === isPostOrder) {
        if (currentMatch.matchIndexInNode >= preOrderMatches.length) {
          this.#currentMatchIndex = jumpBackwards ? this.#matches.length - 1 : this.#matches.length;
        } else {
          this.#currentMatchIndex = this.#matches.length - preOrderMatches.length + currentMatch.matchIndexInNode;
        }
      }
    };
    const preOrderMatches = match(
      node,
      /* isPostOrder=*/
      false
    );
    this.#matches.push(...preOrderMatches);
    updateCurrentMatchIndex(
      /* isPostOrder=*/
      false
    );
    yield* preOrderMatches.values();
    for (const child of node.children()) {
      yield* this.#innerSearch(child, currentMatch, jumpBackwards, match);
    }
    const postOrderMatches = match(
      node,
      /* isPostOrder=*/
      true
    );
    this.#matches.push(...postOrderMatches);
    updateCurrentMatchIndex(
      /* isPostOrder=*/
      true
    );
    yield* postOrderMatches.values();
  }
  search(node, jumpBackwards, match) {
    const currentMatch = this.currentMatch();
    this.reset();
    for (const _ of this.#innerSearch(node, currentMatch, jumpBackwards, match)) {
    }
    this.#currentMatchIndex = Platform24.NumberUtilities.mod(this.#currentMatchIndex, this.#matches.length);
    return this.#matches.length;
  }
};
var TreeViewTreeElement = class _TreeViewTreeElement extends TreeElement {
  #clonedAttributes = /* @__PURE__ */ new Set();
  #clonedClasses = /* @__PURE__ */ new Set();
  static #elementToTreeElement = /* @__PURE__ */ new WeakMap();
  configElement;
  constructor(treeOutline, configElement) {
    super(void 0, void 0, configElement.getAttribute("jslog-context") ?? void 0);
    this.configElement = configElement;
    _TreeViewTreeElement.#elementToTreeElement.set(configElement, this);
    this.refresh();
  }
  refresh() {
    this.titleElement.textContent = "";
    this.#clonedAttributes.forEach((attr) => this.listItemElement.attributes.removeNamedItem(attr));
    this.#clonedClasses.forEach((className) => this.listItemElement.classList.remove(className));
    this.#clonedAttributes.clear();
    this.#clonedClasses.clear();
    for (let i = 0; i < this.configElement.attributes.length; ++i) {
      const attribute = this.configElement.attributes.item(i);
      if (attribute && attribute.name !== "role" && SDK2.DOMModel.ARIA_ATTRIBUTES.has(attribute.name)) {
        this.listItemElement.setAttribute(attribute.name, attribute.value);
        this.#clonedAttributes.add(attribute.name);
      }
    }
    for (const className of this.configElement.classList) {
      this.listItemElement.classList.add(className);
      this.#clonedClasses.add(className);
    }
    InterceptBindingDirective.attachEventListeners(this.configElement, this.listItemElement);
    for (const child of this.configElement.childNodes) {
      if (child instanceof HTMLUListElement && child.role === "group") {
        continue;
      }
      this.titleElement.appendChild(HTMLElementWithLightDOMTemplate.cloneNode(child));
    }
    Highlighting.HighlightManager.HighlightManager.instance().apply(this.titleElement);
  }
  static get(configElement) {
    return configElement && _TreeViewTreeElement.#elementToTreeElement.get(configElement);
  }
  remove() {
    const parent = this.parent;
    if (parent) {
      parent.removeChild(this);
      parent.setExpandable(parent.children().length > 0);
    }
    _TreeViewTreeElement.#elementToTreeElement.delete(this.configElement);
  }
};
function getTreeNodes(nodeList) {
  return nodeList.values().flatMap((node) => {
    if (node instanceof HTMLLIElement && node.role === "treeitem") {
      return [node, ...node.querySelectorAll('ul[role="group"] li[role="treeitem"]')];
    }
    if (node instanceof HTMLElement) {
      return node.querySelectorAll('li[role="treeitem"]');
    }
    return [];
  }).toArray();
}
function getStyleElements(nodes) {
  return [...nodes].flatMap((node) => {
    if (node instanceof HTMLStyleElement) {
      return [node];
    }
    if (node instanceof HTMLElement) {
      return [...node.querySelectorAll("style")];
    }
    return [];
  });
}
var TreeViewElement = class _TreeViewElement extends HTMLElementWithLightDOMTemplate {
  static observedAttributes = ["navigation-variant", "hide-overflow"];
  #treeOutline = new TreeOutlineInShadow(void 0, this);
  constructor() {
    super();
    this.#treeOutline.addEventListener(Events2.ElementSelected, (event) => {
      if (event.data instanceof TreeViewTreeElement) {
        this.dispatchEvent(new _TreeViewElement.SelectEvent(event.data.configElement));
      }
    });
    this.#treeOutline.addEventListener(Events2.ElementExpanded, (event) => {
      if (event.data instanceof TreeViewTreeElement) {
        event.data.listItemElement.dispatchEvent(new _TreeViewElement.ExpandEvent({ expanded: true }));
      }
    });
    this.#treeOutline.addEventListener(Events2.ElementCollapsed, (event) => {
      if (event.data instanceof TreeViewTreeElement) {
        event.data.listItemElement.dispatchEvent(new _TreeViewElement.ExpandEvent({ expanded: false }));
      }
    });
    this.addNodes(getTreeNodes([this]));
  }
  getInternalTreeOutlineForTest() {
    return this.#treeOutline;
  }
  #getParentTreeElement(element) {
    const subtreeRoot = element.parentElement;
    if (!(subtreeRoot instanceof HTMLUListElement)) {
      return null;
    }
    if (subtreeRoot.role === "tree") {
      return { treeElement: this.#treeOutline.rootElement(), expanded: false };
    }
    if (subtreeRoot.role !== "group" || !subtreeRoot.parentElement) {
      return null;
    }
    const expanded = !hasBooleanAttribute(subtreeRoot, "hidden");
    const treeElement = TreeViewTreeElement.get(subtreeRoot.parentElement);
    return treeElement ? { expanded, treeElement } : null;
  }
  updateNode(node, attributeName) {
    while (node?.parentNode && !(node instanceof HTMLElement)) {
      node = node.parentNode;
    }
    const treeNode = node instanceof HTMLElement ? node.closest('li[role="treeitem"]') : null;
    if (!treeNode) {
      return;
    }
    const treeElement = TreeViewTreeElement.get(treeNode);
    if (!treeElement) {
      return;
    }
    treeElement.refresh();
    if (node === treeNode && attributeName === "selected" && hasBooleanAttribute(treeNode, "selected")) {
      treeElement.revealAndSelect(true);
    }
    if (attributeName === "hidden" && node instanceof HTMLUListElement && node.role === "group") {
      if (hasBooleanAttribute(node, "hidden")) {
        treeElement.collapse();
      } else {
        treeElement.expand();
      }
    }
  }
  addNodes(nodes, nextSibling) {
    for (const node of getTreeNodes(nodes)) {
      if (TreeViewTreeElement.get(node)) {
        continue;
      }
      const parent = this.#getParentTreeElement(node);
      if (!parent) {
        continue;
      }
      while (nextSibling && nextSibling.nodeType !== Node.ELEMENT_NODE) {
        nextSibling = nextSibling.nextSibling;
      }
      const nextElement = nextSibling ? TreeViewTreeElement.get(nextSibling) : null;
      const index = nextElement ? parent.treeElement.indexOfChild(nextElement) : parent.treeElement.children().length;
      const treeElement = new TreeViewTreeElement(this.#treeOutline, node);
      const expandable = Boolean(node.querySelector('ul[role="group"]'));
      treeElement.setExpandable(expandable);
      parent.treeElement.insertChild(treeElement, index);
      if (hasBooleanAttribute(node, "selected")) {
        treeElement.revealAndSelect(true);
      }
      if (parent.expanded) {
        parent.treeElement.expand();
      }
    }
    for (const element of getStyleElements(nodes)) {
      this.#treeOutline.shadowRoot.appendChild(element.cloneNode(true));
    }
  }
  removeNodes(nodes) {
    for (const node of getTreeNodes(nodes)) {
      TreeViewTreeElement.get(node)?.remove();
    }
  }
  set hideOverflow(hide) {
    this.toggleAttribute("hide-overflow", hide);
  }
  get hideOverflow() {
    return hasBooleanAttribute(this, "hide-overflow");
  }
  set navgiationVariant(navigationVariant) {
    this.toggleAttribute("navigation-variant", navigationVariant);
  }
  get navigationVariant() {
    return hasBooleanAttribute(this, "navigation-variant");
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    switch (name) {
      case "navigation-variant":
        this.#treeOutline.setVariant(
          newValue !== "false" ? "NavigationTree" : "Other"
          /* TreeVariant.OTHER */
        );
        break;
      case "hide-overflow":
        this.#treeOutline.setHideOverflow(newValue !== "false");
    }
  }
};
(function(TreeViewElement2) {
  class SelectEvent extends CustomEvent {
    constructor(detail) {
      super("select", { detail });
    }
  }
  TreeViewElement2.SelectEvent = SelectEvent;
  class ExpandEvent extends CustomEvent {
    constructor(detail) {
      super("expand", { detail });
    }
  }
  TreeViewElement2.ExpandEvent = ExpandEvent;
})(TreeViewElement || (TreeViewElement = {}));
customElements.define("devtools-tree", TreeViewElement);
function loggingParentProvider(e) {
  const treeElement = TreeElement.getTreeElementBylistItemNode(e);
  const parentElement = treeElement?.parent?.listItemElement;
  return parentElement?.isConnected && parentElement || treeElement?.treeOutline?.contentElement;
}
VisualLogging25.registerParentProvider("parentTreeItem", loggingParentProvider);

// gen/front_end/ui/legacy/View.js
var View_exports = {};
__export(View_exports, {
  SimpleView: () => SimpleView
});
import * as Platform25 from "./../../core/platform/platform.js";
var SimpleView = class extends VBox {
  #title;
  #viewId;
  /**
   * Constructs a new `SimpleView` with the given `options`.
   *
   * @param options the settings for the resulting view.
   * @throws TypeError - if `options.viewId` is not in extended kebab case.
   */
  constructor(options) {
    super(options);
    this.#title = options.title;
    this.#viewId = options.viewId;
    if (!Platform25.StringUtilities.isExtendedKebabCase(this.#viewId)) {
      throw new TypeError(`Invalid view ID '${this.#viewId}'`);
    }
  }
  viewId() {
    return this.#viewId;
  }
  title() {
    return this.#title;
  }
  isCloseable() {
    return false;
  }
  isTransient() {
    return false;
  }
  toolbarItems() {
    return Promise.resolve([]);
  }
  widget() {
    return Promise.resolve(this);
  }
  revealView() {
    return ViewManager.instance().revealView(this);
  }
  disposeView() {
  }
  isPreviewFeature() {
    return false;
  }
  iconName() {
    return void 0;
  }
};
export {
  ARIAUtils_exports as ARIAUtils,
  ActionRegistration_exports as ActionRegistration,
  ActionRegistry_exports as ActionRegistry,
  Context_exports as Context,
  ContextFlavorListener_exports as ContextFlavorListener,
  ContextMenu_exports as ContextMenu,
  DOMUtilities_exports as DOMUtilities,
  Dialog_exports as Dialog,
  DockController_exports as DockController,
  DropTarget_exports as DropTarget,
  EmptyWidget_exports as EmptyWidget,
  FilterBar_exports as FilterBar,
  FilterSuggestionBuilder_exports as FilterSuggestionBuilder,
  ForwardedInputEventHandler_exports as ForwardedInputEventHandler,
  Fragment_exports as Fragment,
  GlassPane_exports as GlassPane,
  Infobar_exports as Infobar,
  InplaceEditor_exports as InplaceEditor,
  InspectorView_exports as InspectorView,
  KeyboardShortcut_exports as KeyboardShortcut,
  ListControl_exports as ListControl,
  ListModel_exports as ListModel,
  ListWidget_exports as ListWidget,
  Panel_exports as Panel,
  PopoverHelper_exports as PopoverHelper,
  ProgressIndicator_exports as ProgressIndicator,
  RemoteDebuggingTerminatedScreen_exports as RemoteDebuggingTerminatedScreen,
  ReportView_exports as ReportView,
  ResizerWidget_exports as ResizerWidget,
  RootView_exports as RootView,
  SearchableView_exports as SearchableView,
  ShortcutRegistry_exports as ShortcutRegistry,
  SoftContextMenu_exports as SoftContextMenu,
  SoftDropDown_exports as SoftDropDown,
  SplitWidget_exports as SplitWidget,
  SuggestBox_exports as SuggestBox,
  TabbedPane_exports as TabbedPane,
  TargetCrashedScreen_exports as TargetCrashedScreen,
  TextPrompt_exports as TextPrompt,
  Toolbar_exports as Toolbar,
  Tooltip_exports as Tooltip,
  Treeoutline_exports as TreeOutline,
  UIUtils_exports as UIUtils,
  View_exports as View,
  ViewManager_exports as ViewManager,
  Widget_exports as Widget,
  XElement_exports as XElement,
  XLink_exports as XLink,
  ZoomManager_exports as ZoomManager,
  inspectorCommon_css_default as inspectorCommonStyles
};
//# sourceMappingURL=legacy.js.map
