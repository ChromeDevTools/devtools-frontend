// gen/front_end/panels/profiler/profiler-meta.prebundle.js
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as UI from "./../../ui/legacy/legacy.js";
var loadedProfilerModule;
var UIStrings = {
  /**
   * @description Title for the profiler tab
   */
  memory: "Memory",
  /**
   * @description Title of the 'Live Heap Profile' tool in the bottom drawer
   */
  liveHeapProfile: "Live Heap Profile",
  /**
   * @description Title of an action under the Performance category that can be invoked through the Command Menu
   */
  startRecordingHeapAllocations: "Start recording heap allocations",
  /**
   * @description Title of an action under the Performance category that can be invoked through the Command Menu
   */
  stopRecordingHeapAllocations: "Stop recording heap allocations",
  /**
   * @description Title of an action in the live heap profile tool to start with reload
   */
  startRecordingHeapAllocationsAndReload: "Start recording heap allocations and reload the page",
  /**
   * @description Text in the Shortcuts page to explain a keyboard shortcut (start/stop recording performance)
   */
  startStopRecording: "Start/stop recording",
  /**
   * @description Command for showing the profiler tab
   */
  showMemory: "Show Memory",
  /**
   * @description Command for showing the 'Live Heap Profile' tool in the bottom drawer
   */
  showLiveHeapProfile: "Show Live Heap Profile",
  /**
   * @description Tooltip text that appears when hovering over the largeicon clear button in the Profiles Panel of a profiler tool
   */
  clearAllProfiles: "Clear all profiles",
  /**
   * @description Tooltip text that appears when hovering over the largeicon download button
   */
  saveProfile: "Save profile\u2026",
  /**
   * @description Tooltip text that appears when hovering over the largeicon load button
   */
  loadProfile: "Load profile\u2026",
  /**
   * @description Command for deleting a profile in the Profiler panel
   */
  deleteProfile: "Delete profile"
};
var str_ = i18n.i18n.registerUIStrings("panels/profiler/profiler-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
async function loadProfilerModule() {
  if (!loadedProfilerModule) {
    loadedProfilerModule = await import("./profiler.js");
  }
  return loadedProfilerModule;
}
function maybeRetrieveContextTypes(getClassCallBack) {
  if (loadedProfilerModule === void 0) {
    return [];
  }
  return getClassCallBack(loadedProfilerModule);
}
UI.ViewManager.registerViewExtension({
  location: "panel",
  id: "heap-profiler",
  commandPrompt: i18nLazyString(UIStrings.showMemory),
  title: i18nLazyString(UIStrings.memory),
  order: 60,
  async loadView() {
    const Profiler = await loadProfilerModule();
    return Profiler.HeapProfilerPanel.HeapProfilerPanel.instance();
  }
});
UI.ViewManager.registerViewExtension({
  location: "drawer-view",
  id: "live-heap-profile",
  commandPrompt: i18nLazyString(UIStrings.showLiveHeapProfile),
  title: i18nLazyString(UIStrings.liveHeapProfile),
  persistence: "closeable",
  order: 100,
  async loadView() {
    const Profiler = await loadProfilerModule();
    return Profiler.LiveHeapProfileView.LiveHeapProfileView.instance();
  },
  experiment: "live-heap-profile"
});
UI.ActionRegistration.registerActionExtension({
  actionId: "live-heap-profile.toggle-recording",
  iconClass: "record-start",
  toggleable: true,
  toggledIconClass: "record-stop",
  toggleWithRedColor: true,
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return new Profiler.LiveHeapProfileView.ActionDelegate();
  },
  category: "MEMORY",
  experiment: "live-heap-profile",
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.startRecordingHeapAllocations)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.stopRecordingHeapAllocations)
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "live-heap-profile.start-with-reload",
  iconClass: "refresh",
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return new Profiler.LiveHeapProfileView.ActionDelegate();
  },
  category: "MEMORY",
  experiment: "live-heap-profile",
  title: i18nLazyString(UIStrings.startRecordingHeapAllocationsAndReload)
});
UI.ActionRegistration.registerActionExtension({
  actionId: "profiler.heap-toggle-recording",
  category: "MEMORY",
  iconClass: "record-start",
  title: i18nLazyString(UIStrings.startStopRecording),
  toggleable: true,
  toggledIconClass: "record-stop",
  toggleWithRedColor: true,
  contextTypes() {
    return maybeRetrieveContextTypes((Profiler) => [Profiler.HeapProfilerPanel.HeapProfilerPanel]);
  },
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return Profiler.HeapProfilerPanel.HeapProfilerPanel.instance();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+E"
    },
    {
      platform: "mac",
      shortcut: "Meta+E"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "profiler.clear-all",
  category: "MEMORY",
  iconClass: "clear",
  contextTypes() {
    return maybeRetrieveContextTypes((Profiler) => [Profiler.ProfilesPanel.ProfilesPanel]);
  },
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return new Profiler.ProfilesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.clearAllProfiles)
});
UI.ActionRegistration.registerActionExtension({
  actionId: "profiler.load-from-file",
  category: "MEMORY",
  iconClass: "import",
  contextTypes() {
    return maybeRetrieveContextTypes((Profiler) => [Profiler.ProfilesPanel.ProfilesPanel]);
  },
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return new Profiler.ProfilesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.loadProfile),
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+O"
    },
    {
      platform: "mac",
      shortcut: "Meta+O"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "profiler.save-to-file",
  category: "MEMORY",
  iconClass: "download",
  contextTypes() {
    return maybeRetrieveContextTypes((Profiler) => [Profiler.ProfileHeader.ProfileHeader]);
  },
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return new Profiler.ProfilesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.saveProfile),
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+S"
    },
    {
      platform: "mac",
      shortcut: "Meta+S"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "profiler.delete-profile",
  category: "MEMORY",
  iconClass: "download",
  contextTypes() {
    return maybeRetrieveContextTypes((Profiler) => [Profiler.ProfileHeader.ProfileHeader]);
  },
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return new Profiler.ProfilesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.deleteProfile)
});
UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      SDK.RemoteObject.RemoteObject
    ];
  },
  async loadProvider() {
    const Profiler = await loadProfilerModule();
    return Profiler.HeapProfilerPanel.HeapProfilerPanel.instance();
  },
  experiment: void 0
});
UI.ContextMenu.registerItem({
  location: "profilerMenu/default",
  actionId: "profiler.save-to-file",
  order: 10
});
UI.ContextMenu.registerItem({
  location: "profilerMenu/default",
  actionId: "profiler.delete-profile",
  order: 11
});
//# sourceMappingURL=profiler-meta.js.map
