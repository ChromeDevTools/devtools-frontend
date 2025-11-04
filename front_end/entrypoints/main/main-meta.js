// gen/front_end/entrypoints/main/main-meta.prebundle.js
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as Components from "./../../ui/legacy/components/utils/utils.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Text in Main
   */
  focusDebuggee: "Focus page",
  /**
   * @description Text in the Shortcuts page in settings to explain a keyboard shortcut
   */
  toggleDrawer: "Toggle drawer",
  /**
   * @description Title of an action that navigates to the next panel
   */
  nextPanel: "Next panel",
  /**
   * @description Title of an action that navigates to the previous panel
   */
  previousPanel: "Previous panel",
  /**
   * @description Title of an action that reloads the DevTools
   */
  reloadDevtools: "Reload DevTools",
  /**
   * @description Title of an action in the main tool to toggle dock
   */
  restoreLastDockPosition: "Restore last dock position",
  /**
   * @description Text in the Shortcuts page to explain a keyboard shortcut (zoom in)
   */
  zoomIn: "Zoom in",
  /**
   * @description Text in the Shortcuts page to explain a keyboard shortcut (zoom out)
   */
  zoomOut: "Zoom out",
  /**
   * @description Title of an action that reset the zoom level to its default
   */
  resetZoomLevel: "Reset zoom level",
  /**
   * @description Title of an action to search in panel
   */
  searchInPanel: "Search in panel",
  /**
   * @description Title of an action that cancels the current search
   */
  cancelSearch: "Cancel search",
  /**
   * @description Title of an action that finds the next search result
   */
  findNextResult: "Find next result",
  /**
   * @description Title of an action to find the previous search result
   */
  findPreviousResult: "Find previous result",
  /**
   * @description Title of a setting under the Appearance category in Settings
   */
  theme: "Theme:",
  /**
   * @description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  switchToBrowserPreferredTheme: "Switch to browser's preferred theme",
  /**
   * @description A drop-down menu option to switch to the same (light or dark) theme as the browser
   */
  autoTheme: "Auto",
  /**
   * @description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  switchToLightTheme: "Switch to light theme",
  /**
   * @description A drop-down menu option to switch to light theme
   */
  lightCapital: "Light",
  /**
   * @description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  switchToDarkTheme: "Switch to dark theme",
  /**
   * @description A drop-down menu option to switch to dark theme
   */
  darkCapital: "Dark",
  /**
   * @description A tag of theme preference settings that can be searched in the command menu
   */
  darkLower: "dark",
  /**
   * @description A tag of theme preference settings that can be searched in the command menu
   */
  lightLower: "light",
  /**
   * @description Title of a setting under the Appearance category in Settings
   */
  panelLayout: "Panel layout:",
  /**
   * @description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  useHorizontalPanelLayout: "Use horizontal panel layout",
  /**
   * @description A drop-down menu option to use horizontal panel layout
   */
  horizontal: "horizontal",
  /**
   * @description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  useVerticalPanelLayout: "Use vertical panel layout",
  /**
   * @description A drop-down menu option to use vertical panel layout
   */
  vertical: "vertical",
  /**
   * @description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  useAutomaticPanelLayout: "Use automatic panel layout",
  /**
   * @description Text short for automatic
   */
  auto: "auto",
  /**
   * @description Title of a setting under the Appearance category in Settings
   */
  enableCtrlShortcutToSwitchPanels: "Enable Ctrl + 1-9 shortcut to switch panels",
  /**
   * @description (Mac only) Title of a setting under the Appearance category in Settings
   */
  enableShortcutToSwitchPanels: "Enable \u2318 + 1-9 shortcut to switch panels",
  /**
   * @description A drop-down menu option to dock to right
   */
  right: "Right",
  /**
   * @description Text to dock the DevTools to the right of the browser tab
   */
  dockToRight: "Dock to right",
  /**
   * @description A drop-down menu option to dock to bottom
   */
  bottom: "Bottom",
  /**
   * @description Text to dock the DevTools to the bottom of the browser tab
   */
  dockToBottom: "Dock to bottom",
  /**
   * @description A drop-down menu option to dock to left
   */
  left: "Left",
  /**
   * @description Text to dock the DevTools to the left of the browser tab
   */
  dockToLeft: "Dock to left",
  /**
   * @description A drop-down menu option to undock into separate window
   */
  undocked: "Undocked",
  /**
   * @description Text to undock the DevTools
   */
  undockIntoSeparateWindow: "Undock into separate window",
  /**
   * @description Name of the default set of DevTools keyboard shortcuts
   */
  devtoolsDefault: "DevTools (Default)",
  /**
   * @description Title of the language setting that allows users to switch the locale
   * in which DevTools is presented.
   */
  language: "Language:",
  /**
   * @description Users can choose this option when picking the language in which
   * DevTools is presented. Choosing this option means that the DevTools language matches
   * Chrome's UI language.
   */
  browserLanguage: "Browser UI language",
  /**
   * @description Label for a checkbox in the settings UI. Allows developers to opt-in/opt-out
   * of saving settings to their Google account.
   */
  saveSettings: "Save `DevTools` settings to your `Google` account",
  /**
   * @description Label for a checkbox in the settings UI. Allows developers to opt-in/opt-out
   * of receiving Google Developer Program (GDP) badges based on their activity in Chrome DevTools.
   */
  earnBadges: "Earn badges",
  /**
   * @description A command available in the command menu to perform searches, for example in the
   * elements panel, as user types, rather than only when they press Enter.
   */
  searchAsYouTypeSetting: "Search as you type",
  /**
   * @description A command available in the command menu to perform searches, for example in the
   * elements panel, as user types, rather than only when they press Enter.
   */
  searchAsYouTypeCommand: "Enable search as you type",
  /**
   * @description A command available in the command menu to perform searches, for example in the
   * elements panel, only when the user presses Enter.
   */
  searchOnEnterCommand: "Disable search as you type (press Enter to search)",
  /**
   * @description Label of a checkbox under the Appearance category in Settings. Allows developers
   * to opt-in / opt-out of syncing DevTools' color theme with Chrome's color theme.
   */
  matchChromeColorScheme: "Match Chrome color scheme",
  /**
   * @description Tooltip for the learn more link of the Match Chrome color scheme Setting.
   */
  matchChromeColorSchemeDocumentation: "Match DevTools colors to your customized Chrome theme (when enabled)",
  /**
   * @description Command to turn the browser color scheme matching on through the command menu.
   */
  matchChromeColorSchemeCommand: "Match Chrome color scheme",
  /**
   * @description Command to turn the browser color scheme matching off through the command menu.
   */
  dontMatchChromeColorSchemeCommand: "Don't match Chrome color scheme",
  /**
   * @description Command to toggle the drawer orientation.
   */
  toggleDrawerOrientation: "Toggle drawer orientation"
};
var str_ = i18n.i18n.registerUIStrings("entrypoints/main/main-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedMainModule;
var loadedInspectorMainModule;
async function loadMainModule() {
  if (!loadedMainModule) {
    loadedMainModule = await import("./main.js");
  }
  return loadedMainModule;
}
async function loadInspectorMainModule() {
  if (!loadedInspectorMainModule) {
    loadedInspectorMainModule = await import("./../inspector_main/inspector_main.js");
  }
  return loadedInspectorMainModule;
}
UI.ActionRegistration.registerActionExtension({
  category: "DRAWER",
  actionId: "inspector-main.focus-debuggee",
  async loadActionDelegate() {
    const InspectorMain = await loadInspectorMainModule();
    return new InspectorMain.InspectorMain.FocusDebuggeeActionDelegate();
  },
  order: 100,
  title: i18nLazyString(UIStrings.focusDebuggee)
});
UI.ActionRegistration.registerActionExtension({
  category: "DRAWER",
  actionId: "main.toggle-drawer",
  async loadActionDelegate() {
    return new UI.InspectorView.ActionDelegate();
  },
  order: 101,
  title: i18nLazyString(UIStrings.toggleDrawer),
  bindings: [
    {
      shortcut: "Esc"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  category: "DRAWER",
  actionId: "main.toggle-drawer-orientation",
  async loadActionDelegate() {
    return new UI.InspectorView.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.toggleDrawerOrientation),
  bindings: [
    {
      shortcut: "Shift+Esc"
    }
  ],
  condition: (config) => Boolean(config?.devToolsFlexibleLayout?.verticalDrawerEnabled)
});
UI.ActionRegistration.registerActionExtension({
  actionId: "main.next-tab",
  category: "GLOBAL",
  title: i18nLazyString(UIStrings.nextPanel),
  async loadActionDelegate() {
    return new UI.InspectorView.ActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+]"
    },
    {
      platform: "mac",
      shortcut: "Meta+]"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "main.previous-tab",
  category: "GLOBAL",
  title: i18nLazyString(UIStrings.previousPanel),
  async loadActionDelegate() {
    return new UI.InspectorView.ActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+["
    },
    {
      platform: "mac",
      shortcut: "Meta+["
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "main.debug-reload",
  category: "GLOBAL",
  title: i18nLazyString(UIStrings.reloadDevtools),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.ReloadActionDelegate();
  },
  bindings: [
    {
      shortcut: "Alt+R"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  category: "GLOBAL",
  title: i18nLazyString(UIStrings.restoreLastDockPosition),
  actionId: "main.toggle-dock",
  async loadActionDelegate() {
    return new UI.DockController.ToggleDockActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+D"
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+D"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "main.zoom-in",
  category: "GLOBAL",
  title: i18nLazyString(UIStrings.zoomIn),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.ZoomActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Plus",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+Plus"
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+NumpadPlus"
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+NumpadPlus"
    },
    {
      platform: "mac",
      shortcut: "Meta+Plus",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+Plus"
    },
    {
      platform: "mac",
      shortcut: "Meta+NumpadPlus"
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+NumpadPlus"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "main.zoom-out",
  category: "GLOBAL",
  title: i18nLazyString(UIStrings.zoomOut),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.ZoomActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Minus",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+Minus"
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+NumpadMinus"
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+NumpadMinus"
    },
    {
      platform: "mac",
      shortcut: "Meta+Minus",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+Minus"
    },
    {
      platform: "mac",
      shortcut: "Meta+NumpadMinus"
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+NumpadMinus"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "main.zoom-reset",
  category: "GLOBAL",
  title: i18nLazyString(UIStrings.resetZoomLevel),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.ZoomActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+0"
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Numpad0"
    },
    {
      platform: "mac",
      shortcut: "Meta+Numpad0"
    },
    {
      platform: "mac",
      shortcut: "Meta+0"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "main.search-in-panel.find",
  category: "GLOBAL",
  title: i18nLazyString(UIStrings.searchInPanel),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.SearchActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+F",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+F",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "F3"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "main.search-in-panel.cancel",
  category: "GLOBAL",
  title: i18nLazyString(UIStrings.cancelSearch),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.SearchActionDelegate();
  },
  order: 10,
  bindings: [
    {
      shortcut: "Esc"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "main.search-in-panel.find-next",
  category: "GLOBAL",
  title: i18nLazyString(UIStrings.findNextResult),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.SearchActionDelegate();
  },
  bindings: [
    {
      platform: "mac",
      shortcut: "Meta+G",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+G"
    },
    {
      platform: "windows,linux",
      shortcut: "F3",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "main.search-in-panel.find-previous",
  category: "GLOBAL",
  title: i18nLazyString(UIStrings.findPreviousResult),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.SearchActionDelegate();
  },
  bindings: [
    {
      platform: "mac",
      shortcut: "Meta+Shift+G",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+G"
    },
    {
      platform: "windows,linux",
      shortcut: "Shift+F3",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "APPEARANCE",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.theme),
  settingName: "ui-theme",
  settingType: "enum",
  defaultValue: "systemPreferred",
  reloadRequired: false,
  options: [
    {
      title: i18nLazyString(UIStrings.switchToBrowserPreferredTheme),
      text: i18nLazyString(UIStrings.autoTheme),
      value: "systemPreferred"
    },
    {
      title: i18nLazyString(UIStrings.switchToLightTheme),
      text: i18nLazyString(UIStrings.lightCapital),
      value: "default"
    },
    {
      title: i18nLazyString(UIStrings.switchToDarkTheme),
      text: i18nLazyString(UIStrings.darkCapital),
      value: "dark"
    }
  ],
  tags: [
    i18nLazyString(UIStrings.darkLower),
    i18nLazyString(UIStrings.lightLower)
  ]
});
Common.Settings.registerSettingExtension({
  category: "APPEARANCE",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.matchChromeColorScheme),
  settingName: "chrome-theme-colors",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.matchChromeColorSchemeCommand)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.dontMatchChromeColorSchemeCommand)
    }
  ],
  reloadRequired: true,
  learnMore: {
    url: "https://goo.gle/devtools-customize-theme",
    tooltip: i18nLazyString(UIStrings.matchChromeColorSchemeDocumentation)
  }
});
Common.Settings.registerSettingExtension({
  category: "APPEARANCE",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.panelLayout),
  settingName: "sidebar-position",
  settingType: "enum",
  defaultValue: "auto",
  options: [
    {
      title: i18nLazyString(UIStrings.useHorizontalPanelLayout),
      text: i18nLazyString(UIStrings.horizontal),
      value: "bottom"
    },
    {
      title: i18nLazyString(UIStrings.useVerticalPanelLayout),
      text: i18nLazyString(UIStrings.vertical),
      value: "right"
    },
    {
      title: i18nLazyString(UIStrings.useAutomaticPanelLayout),
      text: i18nLazyString(UIStrings.auto),
      value: "auto"
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "APPEARANCE",
  storageType: "Synced",
  settingName: "language",
  settingType: "enum",
  title: i18nLazyString(UIStrings.language),
  defaultValue: "en-US",
  options: [
    {
      value: "browserLanguage",
      title: i18nLazyString(UIStrings.browserLanguage),
      text: i18nLazyString(UIStrings.browserLanguage)
    },
    ...i18n.i18n.getAllSupportedDevToolsLocales().sort().map((locale) => createOptionForLocale(locale))
  ],
  reloadRequired: true
});
Common.Settings.registerSettingExtension({
  category: "APPEARANCE",
  storageType: "Synced",
  title: Host.Platform.platform() === "mac" ? i18nLazyString(UIStrings.enableShortcutToSwitchPanels) : i18nLazyString(UIStrings.enableCtrlShortcutToSwitchPanels),
  settingName: "shortcut-panel-switch",
  settingType: "boolean",
  defaultValue: false
});
Common.Settings.registerSettingExtension({
  category: "GLOBAL",
  settingName: "currentDockState",
  settingType: "enum",
  defaultValue: "right",
  options: [
    {
      value: "right",
      text: i18nLazyString(UIStrings.right),
      title: i18nLazyString(UIStrings.dockToRight)
    },
    {
      value: "bottom",
      text: i18nLazyString(UIStrings.bottom),
      title: i18nLazyString(UIStrings.dockToBottom)
    },
    {
      value: "left",
      text: i18nLazyString(UIStrings.left),
      title: i18nLazyString(UIStrings.dockToLeft)
    },
    {
      value: "undocked",
      text: i18nLazyString(UIStrings.undocked),
      title: i18nLazyString(UIStrings.undockIntoSeparateWindow)
    }
  ]
});
Common.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "active-keybind-set",
  settingType: "enum",
  defaultValue: "devToolsDefault",
  options: [
    {
      value: "devToolsDefault",
      title: i18nLazyString(UIStrings.devtoolsDefault),
      text: i18nLazyString(UIStrings.devtoolsDefault)
    },
    {
      value: "vsCode",
      title: i18n.i18n.lockedLazyString("Visual Studio Code"),
      text: i18n.i18n.lockedLazyString("Visual Studio Code")
    }
  ]
});
function createLazyLocalizedLocaleSettingText(localeString) {
  return () => i18n.i18n.getLocalizedLanguageRegion(localeString, i18n.DevToolsLocale.DevToolsLocale.instance());
}
function createOptionForLocale(localeString) {
  return {
    value: localeString,
    title: createLazyLocalizedLocaleSettingText(localeString),
    text: createLazyLocalizedLocaleSettingText(localeString)
  };
}
Common.Settings.registerSettingExtension({
  category: "ACCOUNT",
  // This name must be kept in sync with DevToolsSettings::kSyncDevToolsPreferencesFrontendName.
  settingName: "sync-preferences",
  settingType: "boolean",
  title: i18nLazyString(UIStrings.saveSettings),
  defaultValue: false,
  reloadRequired: true
});
Common.Settings.registerSettingExtension({
  category: "ACCOUNT",
  settingName: "receive-gdp-badges",
  settingType: "boolean",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.earnBadges),
  defaultValue: false,
  reloadRequired: true
});
Common.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "user-shortcuts",
  settingType: "array",
  defaultValue: []
});
Common.Settings.registerSettingExtension({
  category: "GLOBAL",
  storageType: "Local",
  title: i18nLazyString(UIStrings.searchAsYouTypeSetting),
  settingName: "search-as-you-type",
  settingType: "boolean",
  order: 3,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.searchAsYouTypeCommand)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.searchOnEnterCommand)
    }
  ]
});
UI.ViewManager.registerLocationResolver({
  name: "drawer-view",
  category: "DRAWER",
  async loadResolver() {
    return UI.InspectorView.InspectorView.instance();
  }
});
UI.ViewManager.registerLocationResolver({
  name: "drawer-sidebar",
  category: "DRAWER_SIDEBAR",
  async loadResolver() {
    return UI.InspectorView.InspectorView.instance();
  }
});
UI.ViewManager.registerLocationResolver({
  name: "panel",
  category: "PANEL",
  async loadResolver() {
    return UI.InspectorView.InspectorView.instance();
  }
});
UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      Workspace.UISourceCode.UISourceCode,
      SDK.Resource.Resource,
      SDK.NetworkRequest.NetworkRequest
    ];
  },
  async loadProvider() {
    return new Components.Linkifier.ContentProviderContextMenuProvider();
  },
  experiment: void 0
});
UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      Node
    ];
  },
  async loadProvider() {
    return new UI.XLink.ContextMenuProvider();
  },
  experiment: void 0
});
UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      Node
    ];
  },
  async loadProvider() {
    return new Components.Linkifier.LinkContextMenuProvider();
  },
  experiment: void 0
});
UI.Toolbar.registerToolbarItem({
  separator: true,
  location: "main-toolbar-left",
  order: 100
});
UI.Toolbar.registerToolbarItem({
  separator: true,
  order: 96,
  location: "main-toolbar-right"
});
UI.Toolbar.registerToolbarItem({
  condition(config) {
    const isFlagEnabled = config?.devToolsGlobalAiButton?.enabled;
    const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
    const isLocaleRestricted = !devtoolsLocale.locale.startsWith("en-");
    const isGeoRestricted = config?.aidaAvailability?.blockedByGeo === true;
    const isPolicyRestricted = config?.aidaAvailability?.blockedByEnterprisePolicy === true;
    const isAgeRestricted = Boolean(config?.aidaAvailability?.blockedByAge);
    return Boolean(isFlagEnabled && !isLocaleRestricted && !isGeoRestricted && !isPolicyRestricted && !isAgeRestricted);
  },
  async loadItem() {
    const Main = await loadMainModule();
    return Main.GlobalAiButton.GlobalAiButtonToolbarProvider.instance();
  },
  order: 98,
  location: "main-toolbar-right"
});
UI.Toolbar.registerToolbarItem({
  async loadItem() {
    const Main = await loadMainModule();
    return Main.MainImpl.SettingsButtonProvider.instance();
  },
  order: 99,
  location: "main-toolbar-right"
});
UI.Toolbar.registerToolbarItem({
  condition: () => !Root.Runtime.Runtime.isTraceApp(),
  async loadItem() {
    const Main = await loadMainModule();
    return Main.MainImpl.MainMenuItem.instance();
  },
  order: 100,
  location: "main-toolbar-right"
});
UI.Toolbar.registerToolbarItem({
  async loadItem() {
    return UI.DockController.CloseButtonProvider.instance();
  },
  order: 101,
  location: "main-toolbar-right"
});
Common.AppProvider.registerAppProvider({
  async loadAppProvider() {
    const Main = await loadMainModule();
    return Main.SimpleApp.SimpleAppProvider.instance();
  },
  order: 10
});
//# sourceMappingURL=main-meta.js.map
