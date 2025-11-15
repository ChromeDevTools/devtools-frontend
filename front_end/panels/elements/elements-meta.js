// gen/front_end/panels/elements/elements-meta.prebundle.js
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Command for showing the 'Elements' panel. Elements refers to HTML elements.
   */
  showElements: "Show Elements",
  /**
   * @description Title of the Elements Panel. Elements refers to HTML elements.
   */
  elements: "Elements",
  /**
   * @description Command for showing the 'Event Listeners' tool. Refers to DOM Event listeners.
   */
  showEventListeners: "Show Event Listeners",
  /**
   * @description Title of the 'Event Listeners' tool in the sidebar of the elements panel. Refers to
   * DOM Event listeners.
   */
  eventListeners: "Event Listeners",
  /**
   * @description Command for showing the 'Properties' tool. Refers to HTML properties.
   */
  showProperties: "Show Properties",
  /**
   * @description Title of the 'Properties' tool in the sidebar of the elements tool. Refers to HTML
   * properties.
   */
  properties: "Properties",
  /**
   * @description Command for showing the 'Stack Trace' tool. Stack trace refers to the location in
   * the code where the program was at a point in time.
   */
  showStackTrace: "Show Stack Trace",
  /**
   * @description Text for the execution stack trace tool, which shows the stack trace from when this
   * HTML element was created. Stack trace refers to the location in the code where the program was
   * at a point in time.
   */
  stackTrace: "Stack Trace",
  /**
   * @description Command for showing the 'Layout' tool
   */
  showLayout: "Show Layout",
  /**
   * @description The title of the 'Layout' tool in the sidebar of the elements panel.
   */
  layout: "Layout",
  /**
   * @description Command to hide a HTML element in the Elements tree.
   */
  hideElement: "Hide element",
  /**
   * @description A context menu item (command) in the Elements panel that allows the user to edit the
   * currently selected node as raw HTML text.
   */
  editAsHtml: "Edit as HTML",
  /**
   * @description A context menu item (command) in the Elements panel that creates an exact copy of
   * this HTML element.
   */
  duplicateElement: "Duplicate element",
  /**
   * @description A command in the Elements panel to undo the last action the user took.
   */
  undo: "Undo",
  /**
   * @description A command in the Elements panel to redo the last action the user took (undo an
   * undo).
   */
  redo: "Redo",
  /**
   * @description A command in the Elements panel to capture a screenshot of the selected area.
   */
  captureAreaScreenshot: "Capture area screenshot",
  /**
   * @description Title/tooltip of an action in the elements panel to toggle element search on/off.
   */
  selectAnElementInThePageTo: "Select an element in the page to inspect it",
  /**
   * @description Title/tooltip of an action in the elements panel to add a new style rule.
   */
  newStyleRule: "New Style Rule",
  /**
   * @description Title/tooltip of an action in the elements panel to refresh the event listeners.
   */
  refreshEventListeners: "Refresh event listeners",
  /**
   * @description Title of a setting under the Elements category in Settings. If
   *              this option is on, the Elements panel will automatically wrap
   *              long lines in the DOM tree and try to avoid showing a horizontal
   *              scrollbar if possible.
   */
  wordWrap: "Word wrap",
  /**
   * @description Title of an action in the Elements panel that toggles the 'Word
   *              wrap' setting.
   */
  toggleWordWrap: "Toggle word wrap",
  /**
   * @description Title of a setting under the Elements category. Whether to show/hide code comments in HTML.
   */
  showHtmlComments: "Show `HTML` comments",
  /**
   * @description Title of a setting under the Elements category. Whether to show/hide code comments in HTML.
   */
  hideHtmlComments: "Hide `HTML` comments",
  /**
   * @description Title of a setting under the Elements category in Settings. Whether the position of
   * the DOM node on the actual website should be highlighted/revealed to the user when they hover
   * over the corresponding node in the DOM tree in DevTools.
   */
  revealDomNodeOnHover: "Reveal `DOM` node on hover",
  /**
   * @description Title of a setting under the Elements category in Settings. Turns on a mode where
   * the inspect tooltip (an information pane that hovers next to selected DOM elements) has extra
   * detail.
   */
  showDetailedInspectTooltip: "Show detailed inspect tooltip",
  /**
   * @description Title of a setting under the Elements category in Settings. Turns on a mode where
   * hovering over CSS properties in the Styles pane will display a popover with documentation.
   */
  showCSSDocumentationTooltip: "Show CSS documentation tooltip",
  /**
   * @description A context menu item (command) in the Elements panel that copy the styles of
   * the HTML element.
   */
  copyStyles: "Copy styles",
  /**
   * @description A context menu item (command) in the Elements panel that toggles the view between
   * the element and a11y trees.
   */
  toggleA11yTree: "Toggle accessibility tree",
  /**
   * @description Title of a setting under the Elements category. Whether to show/hide hide
   * the shadow DOM nodes of HTML elements that are built into the browser (e.g. the <input> element).
   */
  showUserAgentShadowDOM: "Show user agent shadow `DOM`",
  /**
   * @description Command for showing the 'Computed' tool. Displays computed CSS styles in Elements sidebar.
   */
  showComputedStyles: "Show Computed Styles",
  /**
   * @description Command for showing the 'Styles' tool. Displays CSS styles in Elements sidebar.
   */
  showStyles: "Show Styles",
  /**
   * @description Command for toggling the eye dropper when the color picker is open
   */
  toggleEyeDropper: "Toggle eye dropper"
};
var str_ = i18n.i18n.registerUIStrings("panels/elements/elements-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedElementsModule;
async function loadElementsModule() {
  if (!loadedElementsModule) {
    loadedElementsModule = await import("./elements.js");
  }
  return loadedElementsModule;
}
function maybeRetrieveContextTypes(getClassCallBack) {
  if (loadedElementsModule === void 0) {
    return [];
  }
  return getClassCallBack(loadedElementsModule);
}
UI.ViewManager.registerViewExtension({
  location: "panel",
  id: "elements",
  commandPrompt: i18nLazyString(UIStrings.showElements),
  title: i18nLazyString(UIStrings.elements),
  order: 10,
  persistence: "permanent",
  hasToolbar: false,
  async loadView() {
    const Elements = await loadElementsModule();
    return Elements.ElementsPanel.ElementsPanel.instance();
  }
});
UI.ActionRegistration.registerActionExtension({
  actionId: "elements.show-styles",
  category: "ELEMENTS",
  title: i18nLazyString(UIStrings.showStyles),
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.ElementsActionDelegate();
  }
});
UI.ActionRegistration.registerActionExtension({
  actionId: "elements.show-computed",
  category: "ELEMENTS",
  title: i18nLazyString(UIStrings.showComputedStyles),
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.ElementsActionDelegate();
  }
});
UI.ViewManager.registerViewExtension({
  location: "elements-sidebar",
  id: "elements.event-listeners",
  commandPrompt: i18nLazyString(UIStrings.showEventListeners),
  title: i18nLazyString(UIStrings.eventListeners),
  order: 5,
  persistence: "permanent",
  async loadView() {
    const Elements = await loadElementsModule();
    return Elements.EventListenersWidget.EventListenersWidget.instance();
  }
});
UI.ViewManager.registerViewExtension({
  location: "elements-sidebar",
  id: "elements.dom-properties",
  commandPrompt: i18nLazyString(UIStrings.showProperties),
  title: i18nLazyString(UIStrings.properties),
  order: 7,
  persistence: "permanent",
  async loadView() {
    const Elements = await loadElementsModule();
    return new Elements.PropertiesWidget.PropertiesWidget();
  }
});
UI.ViewManager.registerViewExtension({
  experiment: "capture-node-creation-stacks",
  location: "elements-sidebar",
  id: "elements.dom-creation",
  commandPrompt: i18nLazyString(UIStrings.showStackTrace),
  title: i18nLazyString(UIStrings.stackTrace),
  order: 10,
  persistence: "permanent",
  async loadView() {
    const Elements = await loadElementsModule();
    return new Elements.NodeStackTraceWidget.NodeStackTraceWidget();
  }
});
UI.ViewManager.registerViewExtension({
  location: "elements-sidebar",
  id: "elements.layout",
  commandPrompt: i18nLazyString(UIStrings.showLayout),
  title: i18nLazyString(UIStrings.layout),
  order: 4,
  persistence: "permanent",
  async loadView() {
    const Elements = await loadElementsModule();
    return Elements.LayoutPane.LayoutPane.instance();
  }
});
UI.ActionRegistration.registerActionExtension({
  actionId: "elements.hide-element",
  category: "ELEMENTS",
  title: i18nLazyString(UIStrings.hideElement),
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.ElementsActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Elements) => [Elements.ElementsPanel.ElementsPanel]);
  },
  bindings: [
    {
      shortcut: "H"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "elements.toggle-eye-dropper",
  category: "ELEMENTS",
  title: i18nLazyString(UIStrings.toggleEyeDropper),
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.ElementsActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Elements) => [Elements.ColorSwatchPopoverIcon.ColorSwatchPopoverIcon]);
  },
  bindings: [
    {
      shortcut: "c"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "elements.edit-as-html",
  category: "ELEMENTS",
  title: i18nLazyString(UIStrings.editAsHtml),
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.ElementsActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Elements) => [Elements.ElementsPanel.ElementsPanel]);
  },
  bindings: [
    {
      shortcut: "F2"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "elements.duplicate-element",
  category: "ELEMENTS",
  title: i18nLazyString(UIStrings.duplicateElement),
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.ElementsActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Elements) => [Elements.ElementsPanel.ElementsPanel]);
  },
  bindings: [
    {
      shortcut: "Shift+Alt+Down"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "elements.copy-styles",
  category: "ELEMENTS",
  title: i18nLazyString(UIStrings.copyStyles),
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.ElementsActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Elements) => [Elements.ElementsPanel.ElementsPanel]);
  },
  bindings: [
    {
      shortcut: "Ctrl+Alt+C",
      platform: "windows,linux"
    },
    {
      shortcut: "Meta+Alt+C",
      platform: "mac"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "elements.toggle-a11y-tree",
  category: "ELEMENTS",
  title: i18nLazyString(UIStrings.toggleA11yTree),
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.ElementsActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Elements) => [Elements.ElementsPanel.ElementsPanel]);
  },
  bindings: [
    {
      shortcut: "A"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "elements.undo",
  category: "ELEMENTS",
  title: i18nLazyString(UIStrings.undo),
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.ElementsActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Elements) => [Elements.ElementsPanel.ElementsPanel]);
  },
  bindings: [
    {
      shortcut: "Ctrl+Z",
      platform: "windows,linux"
    },
    {
      shortcut: "Meta+Z",
      platform: "mac"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "elements.redo",
  category: "ELEMENTS",
  title: i18nLazyString(UIStrings.redo),
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.ElementsActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Elements) => [Elements.ElementsPanel.ElementsPanel]);
  },
  bindings: [
    {
      shortcut: "Ctrl+Y",
      platform: "windows,linux"
    },
    {
      shortcut: "Meta+Shift+Z",
      platform: "mac"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "elements.capture-area-screenshot",
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.InspectElementModeController.ToggleSearchActionDelegate();
  },
  condition: Root.Runtime.conditions.canDock,
  title: i18nLazyString(UIStrings.captureAreaScreenshot),
  category: "SCREENSHOT"
});
UI.ActionRegistration.registerActionExtension({
  category: "ELEMENTS",
  actionId: "elements.toggle-element-search",
  toggleable: true,
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.InspectElementModeController.ToggleSearchActionDelegate();
  },
  title: i18nLazyString(UIStrings.selectAnElementInThePageTo),
  iconClass: "select-element",
  bindings: [
    {
      shortcut: "Ctrl+Shift+C",
      platform: "windows,linux"
    },
    {
      shortcut: "Meta+Shift+C",
      platform: "mac"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  category: "ELEMENTS",
  actionId: "elements.new-style-rule",
  title: i18nLazyString(UIStrings.newStyleRule),
  iconClass: "plus",
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.StylesSidebarPane.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Elements) => [Elements.StylesSidebarPane.StylesSidebarPane]);
  }
});
UI.ActionRegistration.registerActionExtension({
  category: "ELEMENTS",
  actionId: "elements.refresh-event-listeners",
  title: i18nLazyString(UIStrings.refreshEventListeners),
  iconClass: "refresh",
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.EventListenersWidget.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Elements) => [Elements.EventListenersWidget.EventListenersWidget]);
  }
});
Common.Settings.registerSettingExtension({
  category: "ELEMENTS",
  storageType: "Synced",
  order: 1,
  title: i18nLazyString(UIStrings.showUserAgentShadowDOM),
  settingName: "show-ua-shadow-dom",
  settingType: "boolean",
  defaultValue: false
});
Common.Settings.registerSettingExtension({
  category: "ELEMENTS",
  storageType: "Synced",
  order: 2,
  title: i18nLazyString(UIStrings.wordWrap),
  settingName: "dom-word-wrap",
  settingType: "boolean",
  defaultValue: true
});
UI.ActionRegistration.registerActionExtension({
  category: "ELEMENTS",
  actionId: "elements.toggle-word-wrap",
  async loadActionDelegate() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.ElementsActionDelegate();
  },
  title: i18nLazyString(UIStrings.toggleWordWrap),
  contextTypes() {
    return maybeRetrieveContextTypes((Elements) => [Elements.ElementsPanel.ElementsPanel]);
  },
  bindings: [
    {
      shortcut: "Alt+Z",
      keybindSets: [
        "vsCode"
        /* UI.ActionRegistration.KeybindSet.VS_CODE */
      ]
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "ELEMENTS",
  storageType: "Synced",
  order: 3,
  title: i18nLazyString(UIStrings.showHtmlComments),
  settingName: "show-html-comments",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.showHtmlComments)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.hideHtmlComments)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "ELEMENTS",
  storageType: "Synced",
  order: 4,
  title: i18nLazyString(UIStrings.revealDomNodeOnHover),
  settingName: "highlight-node-on-hover-in-overlay",
  settingType: "boolean",
  defaultValue: true
});
Common.Settings.registerSettingExtension({
  category: "ELEMENTS",
  storageType: "Synced",
  order: 5,
  title: i18nLazyString(UIStrings.showDetailedInspectTooltip),
  settingName: "show-detailed-inspect-tooltip",
  settingType: "boolean",
  defaultValue: true
});
Common.Settings.registerSettingExtension({
  settingName: "show-event-listeners-for-ancestors",
  settingType: "boolean",
  defaultValue: true
});
Common.Settings.registerSettingExtension({
  category: "ADORNER",
  storageType: "Synced",
  settingName: "adorner-settings",
  settingType: "array",
  defaultValue: []
});
Common.Settings.registerSettingExtension({
  category: "ELEMENTS",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.showCSSDocumentationTooltip),
  settingName: "show-css-property-documentation-on-hover",
  settingType: "boolean",
  defaultValue: true
});
UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      SDK.RemoteObject.RemoteObject,
      SDK.DOMModel.DOMNode,
      SDK.DOMModel.DeferredDOMNode
    ];
  },
  async loadProvider() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.ContextMenuProvider();
  },
  experiment: void 0
});
UI.ViewManager.registerLocationResolver({
  name: "elements-sidebar",
  category: "ELEMENTS",
  async loadResolver() {
    const Elements = await loadElementsModule();
    return Elements.ElementsPanel.ElementsPanel.instance();
  }
});
Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      SDK.DOMModel.DOMNode,
      SDK.DOMModel.DeferredDOMNode,
      SDK.RemoteObject.RemoteObject
    ];
  },
  destination: Common.Revealer.RevealerDestination.ELEMENTS_PANEL,
  async loadRevealer() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.DOMNodeRevealer();
  }
});
Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      SDK.CSSProperty.CSSProperty
    ];
  },
  destination: Common.Revealer.RevealerDestination.STYLES_SIDEBAR,
  async loadRevealer() {
    const Elements = await loadElementsModule();
    return new Elements.ElementsPanel.CSSPropertyRevealer();
  }
});
UI.Toolbar.registerToolbarItem({
  async loadItem() {
    const Elements = await loadElementsModule();
    return Elements.LayersWidget.ButtonProvider.instance();
  },
  order: 1,
  location: "styles-sidebarpane-toolbar"
});
UI.Toolbar.registerToolbarItem({
  async loadItem() {
    const Elements = await loadElementsModule();
    return Elements.ElementStatePaneWidget.ButtonProvider.instance();
  },
  order: 2,
  location: "styles-sidebarpane-toolbar"
});
UI.Toolbar.registerToolbarItem({
  async loadItem() {
    const Elements = await loadElementsModule();
    return Elements.ClassesPaneWidget.ButtonProvider.instance();
  },
  order: 3,
  location: "styles-sidebarpane-toolbar"
});
UI.Toolbar.registerToolbarItem({
  async loadItem() {
    const Elements = await loadElementsModule();
    return Elements.StylesSidebarPane.ButtonProvider.instance();
  },
  order: 100,
  location: "styles-sidebarpane-toolbar"
});
UI.Toolbar.registerToolbarItem({
  actionId: "elements.toggle-element-search",
  location: "main-toolbar-left",
  order: 0
});
UI.UIUtils.registerRenderer({
  contextTypes() {
    return [SDK.DOMModel.DOMNode, SDK.DOMModel.DeferredDOMNode];
  },
  async loadRenderer() {
    const Elements = await loadElementsModule();
    return Elements.ElementsTreeOutlineRenderer.Renderer.instance();
  }
});
//# sourceMappingURL=elements-meta.js.map
