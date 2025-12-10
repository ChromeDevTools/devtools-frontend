// gen/front_end/panels/settings/emulation/emulation-meta.js
import * as i18n from "./../../core/i18n/i18n.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Title of the Devices tab/tool. Devices refers to e.g. phones/tablets.
   */
  devices: "Devices",
  /**
   * @description Command that opens the device emulation view.
   */
  showDevices: "Show Devices"
};
var str_ = i18n.i18n.registerUIStrings("panels/settings/emulation/emulation-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedEmulationModule;
async function loadEmulationModule() {
  if (!loadedEmulationModule) {
    loadedEmulationModule = await import("./emulation/emulation.js");
  }
  return loadedEmulationModule;
}
UI.ViewManager.registerViewExtension({
  location: "settings-view",
  commandPrompt: i18nLazyString(UIStrings.showDevices),
  title: i18nLazyString(UIStrings.devices),
  order: 30,
  async loadView() {
    const Emulation = await loadEmulationModule();
    return new Emulation.DevicesSettingsTab.DevicesSettingsTab();
  },
  id: "devices",
  settings: [
    "standard-emulated-device-list",
    "custom-emulated-device-list"
  ],
  iconName: "devices"
});

// gen/front_end/panels/settings/settings-meta.prebundle.js
import * as Common from "./../../core/common/common.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
var UIStrings2 = {
  /**
   * @description Text for keyboard shortcuts
   */
  shortcuts: "Shortcuts",
  /**
   * @description Text in Settings Screen of the Settings
   */
  preferences: "Preferences",
  /**
   * @description Text in Settings Screen of the Settings
   */
  experiments: "Experiments",
  /**
   * @description Text in Settings Screen of the Settings
   */
  greenDevProtoTypes: "GreenDev",
  /**
   * @description Command for showing the GreenDev tab in the Settings Screen
   */
  showGreenDev: "Show GreenDev",
  /**
   * @description Title of Ignore list settings
   */
  ignoreList: "Ignore list",
  /**
   * @description Command for showing the keyboard shortcuts in Settings
   */
  showShortcuts: "Show Shortcuts",
  /**
   * @description Command for showing the preference tab in the Settings Screen
   */
  showPreferences: "Show Preferences",
  /**
   * @description Command for showing the experiments tab in the Settings Screen
   */
  showExperiments: "Show Experiments",
  /**
   * @description Command for showing the Ignore list settings
   */
  showIgnoreList: "Show Ignore list",
  /**
   * @description Name of the Settings view
   */
  settings: "Settings",
  /**
   * @description Text for the documentation of something
   */
  documentation: "Documentation",
  /**
   * @description Text for AI innovation settings
   */
  aiInnovations: "AI innovations",
  /**
   * @description Command for showing the AI innovation settings
   */
  showAiInnovations: "Show AI innovations",
  /**
   * @description Text of a DOM element in Workspace Settings Tab of the Workspace settings in Settings
   */
  workspace: "Workspace",
  /**
   * @description Command for showing the Workspace tool in Settings
   */
  showWorkspace: "Show Workspace settings"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/settings/settings-meta.ts", UIStrings2);
var i18nLazyString2 = i18n3.i18n.getLazilyComputedLocalizedString.bind(void 0, str_2);
var loadedSettingsModule;
async function loadSettingsModule() {
  if (!loadedSettingsModule) {
    loadedSettingsModule = await import("./settings.js");
  }
  return loadedSettingsModule;
}
UI2.ViewManager.registerViewExtension({
  location: "settings-view",
  id: "preferences",
  title: i18nLazyString2(UIStrings2.preferences),
  commandPrompt: i18nLazyString2(UIStrings2.showPreferences),
  order: 0,
  async loadView() {
    const Settings2 = await loadSettingsModule();
    return new Settings2.SettingsScreen.GenericSettingsTab();
  },
  iconName: "gear"
});
UI2.ViewManager.registerViewExtension({
  location: "settings-view",
  id: "workspace",
  title: i18nLazyString2(UIStrings2.workspace),
  commandPrompt: i18nLazyString2(UIStrings2.showWorkspace),
  order: 1,
  async loadView() {
    const Settings2 = await loadSettingsModule();
    return new Settings2.WorkspaceSettingsTab.WorkspaceSettingsTab();
  },
  iconName: "folder"
});
UI2.ViewManager.registerViewExtension({
  location: "settings-view",
  id: "chrome-ai",
  title: i18nLazyString2(UIStrings2.aiInnovations),
  commandPrompt: i18nLazyString2(UIStrings2.showAiInnovations),
  order: 2,
  async loadView() {
    const Settings2 = await loadSettingsModule();
    return new Settings2.AISettingsTab.AISettingsTab();
  },
  iconName: "button-magic",
  settings: ["console-insights-enabled"],
  condition: (config) => {
    return (config?.aidaAvailability?.enabled && (config?.devToolsConsoleInsights?.enabled || config?.devToolsFreestyler?.enabled)) ?? false;
  }
});
UI2.ViewManager.registerViewExtension({
  location: "settings-view",
  id: "experiments",
  title: i18nLazyString2(UIStrings2.experiments),
  commandPrompt: i18nLazyString2(UIStrings2.showExperiments),
  order: 3,
  experiment: "*",
  async loadView() {
    const Settings2 = await loadSettingsModule();
    return new Settings2.SettingsScreen.ExperimentsSettingsTab();
  },
  iconName: "experiment"
});
UI2.ViewManager.registerViewExtension({
  location: "settings-view",
  id: "blackbox",
  title: i18nLazyString2(UIStrings2.ignoreList),
  commandPrompt: i18nLazyString2(UIStrings2.showIgnoreList),
  order: 4,
  async loadView() {
    const Settings2 = await loadSettingsModule();
    return new Settings2.FrameworkIgnoreListSettingsTab.FrameworkIgnoreListSettingsTab();
  },
  iconName: "clear-list"
});
UI2.ViewManager.registerViewExtension({
  location: "settings-view",
  id: "greendev-prototypes",
  title: i18nLazyString2(UIStrings2.greenDevProtoTypes),
  commandPrompt: i18nLazyString2(UIStrings2.showGreenDev),
  order: 101,
  async loadView() {
    const Settings2 = await loadSettingsModule();
    return new Settings2.SettingsScreen.GreenDevSettingsTab();
  },
  iconName: "experiment",
  condition: (config) => {
    return Boolean(config?.devToolsGreenDevUi?.enabled);
  }
});
UI2.ViewManager.registerViewExtension({
  location: "settings-view",
  id: "keybinds",
  title: i18nLazyString2(UIStrings2.shortcuts),
  commandPrompt: i18nLazyString2(UIStrings2.showShortcuts),
  order: 100,
  async loadView() {
    const Settings2 = await loadSettingsModule();
    return new Settings2.KeybindsSettingsTab.KeybindsSettingsTab();
  },
  iconName: "keyboard"
});
UI2.ActionRegistration.registerActionExtension({
  category: "SETTINGS",
  actionId: "settings.show",
  title: i18nLazyString2(UIStrings2.settings),
  async loadActionDelegate() {
    const Settings2 = await loadSettingsModule();
    return new Settings2.SettingsScreen.ActionDelegate();
  },
  iconClass: "gear",
  bindings: [
    {
      shortcut: "F1",
      keybindSets: [
        "devToolsDefault"
      ]
    },
    {
      shortcut: "Shift+?"
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+,",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+,",
      keybindSets: [
        "vsCode"
      ]
    }
  ]
});
UI2.ActionRegistration.registerActionExtension({
  category: "SETTINGS",
  actionId: "settings.documentation",
  title: i18nLazyString2(UIStrings2.documentation),
  async loadActionDelegate() {
    const Settings2 = await loadSettingsModule();
    return new Settings2.SettingsScreen.ActionDelegate();
  }
});
UI2.ActionRegistration.registerActionExtension({
  category: "SETTINGS",
  actionId: "settings.shortcuts",
  title: i18nLazyString2(UIStrings2.showShortcuts),
  async loadActionDelegate() {
    const Settings2 = await loadSettingsModule();
    return new Settings2.SettingsScreen.ActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+K Ctrl+S",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+K Meta+S",
      keybindSets: [
        "vsCode"
      ]
    }
  ]
});
UI2.ViewManager.registerLocationResolver({
  name: "settings-view",
  category: "SETTINGS",
  async loadResolver() {
    const Settings2 = await loadSettingsModule();
    return Settings2.SettingsScreen.SettingsScreen.instance();
  }
});
Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      Common.Settings.Setting,
      Root.Runtime.Experiment
    ];
  },
  destination: void 0,
  async loadRevealer() {
    const Settings2 = await loadSettingsModule();
    return new Settings2.SettingsScreen.Revealer();
  }
});
UI2.ContextMenu.registerItem({
  location: "mainMenu/footer",
  actionId: "settings.shortcuts",
  order: void 0
});
UI2.ContextMenu.registerItem({
  location: "mainMenuHelp/default",
  actionId: "settings.documentation",
  order: void 0
});
//# sourceMappingURL=settings-meta.js.map
