var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/ui/settings/ConsoleSettings.ts
var ConsoleSettings_exports = {};
__export(ConsoleSettings_exports, {
  consoleAutocompleteOnEnterSettingDescriptor: () => consoleAutocompleteOnEnterSettingDescriptor,
  consoleEagerEvalSettingDescriptor: () => consoleEagerEvalSettingDescriptor,
  consoleGroupSimilarSettingDescriptor: () => consoleGroupSimilarSettingDescriptor,
  consoleHistoryAutocompleteSettingDescriptor: () => consoleHistoryAutocompleteSettingDescriptor,
  consoleInsightTeasersEnabledSettingDescriptor: () => consoleInsightTeasersEnabledSettingDescriptor,
  consoleShowsCorsErrorsSettingDescriptor: () => consoleShowsCorsErrorsSettingDescriptor,
  consoleTimestampsEnabledSettingDescriptor: () => consoleTimestampsEnabledSettingDescriptor,
  consoleTraceExpandSettingDescriptor: () => consoleTraceExpandSettingDescriptor,
  networkMessagesSettingDescriptor: () => networkMessagesSettingDescriptor,
  selectedContextFilterEnabledSettingDescriptor: () => selectedContextFilterEnabledSettingDescriptor
});
import * as Common from "../../core/common/common.js";
var networkMessagesSettingDescriptor = {
  name: "network-messages",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED
};
var selectedContextFilterEnabledSettingDescriptor = {
  name: "selected-context-filter-enabled",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED
};
var consoleTimestampsEnabledSettingDescriptor = {
  name: "console-timestamps-enabled",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED
};
var consoleHistoryAutocompleteSettingDescriptor = {
  name: "console-history-autocomplete",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true
};
var consoleAutocompleteOnEnterSettingDescriptor = {
  name: "console-autocomplete-on-enter",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED
};
var consoleGroupSimilarSettingDescriptor = {
  name: "console-group-similar",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED
};
var consoleShowsCorsErrorsSettingDescriptor = {
  name: "console-shows-cors-errors",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true
};
var consoleEagerEvalSettingDescriptor = {
  name: "console-eager-eval",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED
};
var consoleTraceExpandSettingDescriptor = {
  name: "console-trace-expand",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED
};
var consoleInsightTeasersEnabledSettingDescriptor = {
  name: "console-insight-teasers-enabled",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED
};

// ../../front_end/ui/settings/ElementsSettings.ts
var ElementsSettings_exports = {};
__export(ElementsSettings_exports, {
  adornerSettingsSettingDescriptor: () => adornerSettingsSettingDescriptor,
  collapseNonContributingCSSRulesSettingDescriptor: () => collapseNonContributingCSSRulesSettingDescriptor,
  cssAnimationsOnlyWhenAnimationsTabOpenSettingDescriptor: () => cssAnimationsOnlyWhenAnimationsTabOpenSettingDescriptor,
  domWordWrapSettingDescriptor: () => domWordWrapSettingDescriptor,
  highlightNodeOnHoverInOverlaySettingDescriptor: () => highlightNodeOnHoverInOverlaySettingDescriptor,
  showCSSPropertyDocumentationOnHoverSettingDescriptor: () => showCSSPropertyDocumentationOnHoverSettingDescriptor,
  showDetailedInspectTooltipSettingDescriptor: () => showDetailedInspectTooltipSettingDescriptor,
  showEventListenersForAncestorsSettingDescriptor: () => showEventListenersForAncestorsSettingDescriptor,
  showFrameworkListenersSettingDescriptor: () => showFrameworkListenersSettingDescriptor,
  showHTMLCommentsSettingDescriptor: () => showHTMLCommentsSettingDescriptor,
  showInactiveCSSRulesSettingDescriptor: () => showInactiveCSSRulesSettingDescriptor,
  showUAShadowDOMSettingDescriptor: () => showUAShadowDOMSettingDescriptor
});
import * as Common2 from "../../core/common/common.js";
var showUAShadowDOMSettingDescriptor = {
  name: "show-ua-shadow-dom",
  type: Common2.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common2.Settings.SettingStorageType.SYNCED
};
var domWordWrapSettingDescriptor = {
  name: "dom-word-wrap",
  type: Common2.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common2.Settings.SettingStorageType.SYNCED
};
var showHTMLCommentsSettingDescriptor = {
  name: "show-html-comments",
  type: Common2.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common2.Settings.SettingStorageType.SYNCED
};
var highlightNodeOnHoverInOverlaySettingDescriptor = {
  name: "highlight-node-on-hover-in-overlay",
  type: Common2.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common2.Settings.SettingStorageType.SYNCED
};
var showDetailedInspectTooltipSettingDescriptor = {
  name: "show-detailed-inspect-tooltip",
  type: Common2.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common2.Settings.SettingStorageType.SYNCED
};
var cssAnimationsOnlyWhenAnimationsTabOpenSettingDescriptor = {
  name: "css-animations-only-when-animations-tab-open",
  type: Common2.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common2.Settings.SettingStorageType.SYNCED
};
var collapseNonContributingCSSRulesSettingDescriptor = {
  name: "collapse-non-contributing-css-rules",
  type: Common2.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common2.Settings.SettingStorageType.SYNCED
};
var showInactiveCSSRulesSettingDescriptor = {
  name: "show-inactive-css-rules",
  type: Common2.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common2.Settings.SettingStorageType.SYNCED
};
var showEventListenersForAncestorsSettingDescriptor = {
  name: "show-event-listeners-for-ancestors",
  type: Common2.Settings.SettingType.BOOLEAN,
  defaultValue: true
};
var adornerSettingsSettingDescriptor = {
  name: "adorner-settings",
  type: Common2.Settings.SettingType.ARRAY,
  defaultValue: [],
  storageType: Common2.Settings.SettingStorageType.SYNCED
};
var showCSSPropertyDocumentationOnHoverSettingDescriptor = {
  name: "show-css-property-documentation-on-hover",
  type: Common2.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common2.Settings.SettingStorageType.SYNCED
};
var showFrameworkListenersSettingDescriptor = {
  name: "show-frameowkr-listeners",
  type: Common2.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common2.Settings.SettingStorageType.GLOBAL
};

// ../../front_end/ui/settings/EmulationSettings.ts
var EmulationSettings_exports = {};
__export(EmulationSettings_exports, {
  showMediaQueryInspectorSettingDescriptor: () => showMediaQueryInspectorSettingDescriptor,
  showRulersSettingDescriptor: () => showRulersSettingDescriptor
});
import * as Common3 from "../../core/common/common.js";
var showMediaQueryInspectorSettingDescriptor = {
  name: "show-media-query-inspector",
  type: Common3.Settings.SettingType.BOOLEAN,
  defaultValue: false
};
var showRulersSettingDescriptor = {
  name: "emulation.show-rulers",
  type: Common3.Settings.SettingType.BOOLEAN,
  defaultValue: false
};

// ../../front_end/ui/settings/InspectorMainSettings.ts
var InspectorMainSettings_exports = {};
__export(InspectorMainSettings_exports, {
  adBlockingEnabledSettingDescriptor: () => adBlockingEnabledSettingDescriptor,
  autoAttachToCreatedPagesSettingDescriptor: () => autoAttachToCreatedPagesSettingDescriptor
});
import * as Common4 from "../../core/common/common.js";
var adBlockingEnabledSettingDescriptor = {
  name: "network.ad-blocking-enabled",
  type: Common4.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common4.Settings.SettingStorageType.SESSION
};
var autoAttachToCreatedPagesSettingDescriptor = {
  name: "auto-attach-to-created-pages",
  type: Common4.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common4.Settings.SettingStorageType.SYNCED
};

// ../../front_end/ui/settings/LayerViewerSettings.ts
var LayerViewerSettings_exports = {};
__export(LayerViewerSettings_exports, {
  chromeWindowSettingDescriptor: () => chromeWindowSettingDescriptor,
  showPaintsSettingDescriptor: () => showPaintsSettingDescriptor,
  showSlowScrollRectsSettingDescriptor: () => showSlowScrollRectsSettingDescriptor
});
import * as Common5 from "../../core/common/common.js";
var showPaintsSettingDescriptor = {
  name: "frame-viewer-show-paints",
  type: Common5.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common5.Settings.SettingStorageType.GLOBAL
};
var showSlowScrollRectsSettingDescriptor = {
  name: "frame-viewer-show-slow-scroll-rects",
  type: Common5.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common5.Settings.SettingStorageType.GLOBAL
};
var chromeWindowSettingDescriptor = {
  name: "frame-viewer-chrome-window",
  type: Common5.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common5.Settings.SettingStorageType.SYNCED
};

// ../../front_end/ui/settings/MainSettings.ts
var MainSettings_exports = {};
__export(MainSettings_exports, {
  activeKeybindSetSettingDescriptor: () => activeKeybindSetSettingDescriptor,
  chromeThemeColorsSettingDescriptor: () => chromeThemeColorsSettingDescriptor,
  currentDockStateSettingDescriptor: () => currentDockStateSettingDescriptor,
  languageSettingDescriptor: () => languageSettingDescriptor,
  searchAsYouTypeSettingDescriptor: () => searchAsYouTypeSettingDescriptor,
  shortcutPanelSwitchSettingDescriptor: () => shortcutPanelSwitchSettingDescriptor,
  sidebarPositionSettingDescriptor: () => sidebarPositionSettingDescriptor,
  syncPreferencesSettingDescriptor: () => syncPreferencesSettingDescriptor,
  uiThemeSettingDescriptor: () => uiThemeSettingDescriptor,
  userShortcutsSettingDescriptor: () => userShortcutsSettingDescriptor
});
import * as Common6 from "../../core/common/common.js";
var uiThemeSettingDescriptor = {
  name: "ui-theme",
  type: Common6.Settings.SettingType.ENUM,
  defaultValue: "systemPreferred",
  storageType: Common6.Settings.SettingStorageType.SYNCED
};
var chromeThemeColorsSettingDescriptor = {
  name: "chrome-theme-colors",
  type: Common6.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common6.Settings.SettingStorageType.SYNCED
};
var sidebarPositionSettingDescriptor = {
  name: "sidebar-position",
  type: Common6.Settings.SettingType.ENUM,
  defaultValue: "auto",
  storageType: Common6.Settings.SettingStorageType.SYNCED
};
var languageSettingDescriptor = {
  name: "language",
  type: Common6.Settings.SettingType.ENUM,
  defaultValue: "en-US",
  storageType: Common6.Settings.SettingStorageType.SYNCED
};
var shortcutPanelSwitchSettingDescriptor = {
  name: "shortcut-panel-switch",
  type: Common6.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common6.Settings.SettingStorageType.SYNCED
};
var currentDockStateSettingDescriptor = {
  name: "currentDockState",
  type: Common6.Settings.SettingType.ENUM,
  defaultValue: "right"
};
var activeKeybindSetSettingDescriptor = {
  name: "active-keybind-set",
  type: Common6.Settings.SettingType.ENUM,
  defaultValue: "devToolsDefault",
  storageType: Common6.Settings.SettingStorageType.SYNCED
};
var syncPreferencesSettingDescriptor = {
  name: "sync-preferences",
  type: Common6.Settings.SettingType.BOOLEAN,
  defaultValue: false
};
var userShortcutsSettingDescriptor = {
  name: "user-shortcuts",
  type: Common6.Settings.SettingType.ARRAY,
  defaultValue: [],
  storageType: Common6.Settings.SettingStorageType.SYNCED
};
var searchAsYouTypeSettingDescriptor = {
  name: "search-as-you-type",
  type: Common6.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common6.Settings.SettingStorageType.LOCAL
};

// ../../front_end/ui/settings/NetworkSettings.ts
var NetworkSettings_exports = {};
__export(NetworkSettings_exports, {
  colorCodeResourceTypesSettingDescriptor: () => colorCodeResourceTypesSettingDescriptor,
  groupByFrameSettingDescriptor: () => groupByFrameSettingDescriptor,
  showOptionsToGenerateHarWithSensitiveDataSettingDescriptor: () => showOptionsToGenerateHarWithSensitiveDataSettingDescriptor
});
import * as Common7 from "../../core/common/common.js";
var showOptionsToGenerateHarWithSensitiveDataSettingDescriptor = {
  name: "network.show-options-to-generate-har-with-sensitive-data",
  type: Common7.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common7.Settings.SettingStorageType.SYNCED
};
var colorCodeResourceTypesSettingDescriptor = {
  name: "network-color-code-resource-types",
  type: Common7.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common7.Settings.SettingStorageType.SYNCED
};
var groupByFrameSettingDescriptor = {
  name: "network.group-by-frame",
  type: Common7.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common7.Settings.SettingStorageType.SYNCED
};

// ../../front_end/ui/settings/SettingUIRegistration.ts
var SettingUIRegistration_exports = {};
__export(SettingUIRegistration_exports, {
  SettingUI: () => SettingUI,
  getRegisteredSettings: () => getRegisteredSettings,
  maybeResolve: () => maybeResolve,
  register: () => register,
  resetSettings: () => resetSettings,
  resolve: () => resolve
});
import * as Common8 from "../../core/common/common.js";
var registeredSettings = /* @__PURE__ */ new Map();
function register(settingDescriptor, settingUIDescriptor) {
  const settingName = settingDescriptor.name;
  if (registeredSettings.has(settingName)) {
    throw new Error(`Duplicate setting name '${settingName}'`);
  }
  Common8.SettingRegistration.registerCategoryOrder(settingUIDescriptor.category, settingUIDescriptor.order);
  registeredSettings.set(settingName, { descriptor: settingDescriptor, uiDescriptor: settingUIDescriptor });
}
function getRegisteredSettings() {
  const combined = /* @__PURE__ */ new Map();
  for (const legacy of Common8.SettingRegistration.getRegisteredSettings()) {
    combined.set(legacy.settingName, {
      descriptor: {
        name: legacy.settingName,
        type: legacy.settingType,
        defaultValue: legacy.defaultValue,
        storageType: legacy.storageType
      },
      uiDescriptor: {
        category: legacy.category,
        order: legacy.order,
        title: legacy.title,
        tags: legacy.tags,
        options: legacy.options,
        reloadRequired: legacy.reloadRequired,
        learnMore: legacy.learnMore
      }
    });
  }
  for (const [name, registeredUI] of registeredSettings) {
    combined.set(name, registeredUI);
  }
  return Array.from(combined.values());
}
var SettingUI = class {
  #raw;
  constructor(raw) {
    this.#raw = raw;
  }
  get title() {
    return this.#raw.title?.() ?? "";
  }
  get category() {
    return this.#raw.category ?? null;
  }
  get order() {
    return this.#raw.order ?? null;
  }
  get tags() {
    return this.#raw.tags ? this.#raw.tags.map((tag) => tag()).join("\0") : "";
  }
  get options() {
    return this.#raw.options?.map((opt) => ({
      value: opt.value,
      title: opt.title(),
      text: typeof opt.text === "function" ? opt.text() : opt.text,
      raw: opt.raw
    })) ?? [];
  }
  get reloadRequired() {
    return Boolean(this.#raw.reloadRequired);
  }
  get learnMore() {
    return this.#raw.learnMore ?? null;
  }
};
function maybeResolve(settingDescriptor) {
  const settingUI = registeredSettings.get(settingDescriptor.name) ?? getRegisteredSettings().find((registered) => registered.descriptor.name === settingDescriptor.name);
  return settingUI ? new SettingUI(settingUI.uiDescriptor) : null;
}
function resolve(settingDescriptor) {
  const ui = maybeResolve(settingDescriptor);
  if (!ui) {
    throw new Error(`No UI descriptor registered for setting '${settingDescriptor.name}'`);
  }
  return ui;
}
function resetSettings() {
  for (const { uiDescriptor } of registeredSettings.values()) {
    Common8.SettingRegistration.removeCategoryOrder(uiDescriptor.category, uiDescriptor.order);
  }
  registeredSettings.clear();
}

// ../../front_end/ui/settings/TimelineSettings.ts
var TimelineSettings_exports = {};
__export(TimelineSettings_exports, {
  annotationsHiddenSettingDescriptor: () => annotationsHiddenSettingDescriptor,
  flamechartSelectedNavigationSettingDescriptor: () => flamechartSelectedNavigationSettingDescriptor,
  timelineCaptureLayersAndPicturesSettingDescriptor: () => timelineCaptureLayersAndPicturesSettingDescriptor,
  timelineCaptureSelectorStatsSettingDescriptor: () => timelineCaptureSelectorStatsSettingDescriptor,
  timelineCountersGraphDocumentsSettingDescriptor: () => timelineCountersGraphDocumentsSettingDescriptor,
  timelineCountersGraphGpuMemoryUsedKbSettingDescriptor: () => timelineCountersGraphGpuMemoryUsedKbSettingDescriptor,
  timelineCountersGraphJsEventListenersSettingDescriptor: () => timelineCountersGraphJsEventListenersSettingDescriptor,
  timelineCountersGraphJsHeapSizeUsedSettingDescriptor: () => timelineCountersGraphJsHeapSizeUsedSettingDescriptor,
  timelineCountersGraphNodesSettingDescriptor: () => timelineCountersGraphNodesSettingDescriptor,
  timelineDebugModeSettingDescriptor: () => timelineDebugModeSettingDescriptor,
  timelineDimThirdPartiesSettingDescriptor: () => timelineDimThirdPartiesSettingDescriptor,
  timelineDisableJsSamplingSettingDescriptor: () => timelineDisableJsSamplingSettingDescriptor,
  timelineInvalidationTrackingSettingDescriptor: () => timelineInvalidationTrackingSettingDescriptor,
  timelineScreenshotCaptureModeSettingDescriptor: () => timelineScreenshotCaptureModeSettingDescriptor,
  timelineShowAllEventsSettingDescriptor: () => timelineShowAllEventsSettingDescriptor,
  timelineShowExtensionDataSettingDescriptor: () => timelineShowExtensionDataSettingDescriptor,
  timelineShowMemorySettingDescriptor: () => timelineShowMemorySettingDescriptor,
  timelineShowScreenshotsSettingDescriptor: () => timelineShowScreenshotsSettingDescriptor
});
import * as Common9 from "../../core/common/common.js";
var timelineShowAllEventsSettingDescriptor = {
  name: "timeline-show-all-events",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common9.Settings.SettingStorageType.SYNCED
};
var timelineDebugModeSettingDescriptor = {
  name: "timeline-debug-mode",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common9.Settings.SettingStorageType.SYNCED
};
var annotationsHiddenSettingDescriptor = {
  name: "annotations-hidden",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common9.Settings.SettingStorageType.SYNCED
};
var timelineInvalidationTrackingSettingDescriptor = {
  name: "timeline-invalidation-tracking",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common9.Settings.SettingStorageType.SYNCED
};
var timelineDisableJsSamplingSettingDescriptor = {
  name: "timeline-disable-js-sampling",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common9.Settings.SettingStorageType.SESSION
};
var timelineCaptureLayersAndPicturesSettingDescriptor = {
  name: "timeline-capture-layers-and-pictures",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common9.Settings.SettingStorageType.SESSION
};
var timelineCaptureSelectorStatsSettingDescriptor = {
  name: "timeline-capture-selector-stats",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common9.Settings.SettingStorageType.SESSION
};
var timelineScreenshotCaptureModeSettingDescriptor = {
  name: "timeline-screenshot-capture-mode",
  type: Common9.Settings.SettingType.ENUM,
  defaultValue: "auto",
  storageType: Common9.Settings.SettingStorageType.SESSION
};
var timelineShowScreenshotsSettingDescriptor = {
  name: "timeline-show-screenshots",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common9.Settings.SettingStorageType.GLOBAL
};
var timelineShowMemorySettingDescriptor = {
  name: "timeline-show-memory",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common9.Settings.SettingStorageType.SESSION
};
var timelineDimThirdPartiesSettingDescriptor = {
  name: "timeline-dim-third-parties",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common9.Settings.SettingStorageType.SESSION
};
var timelineShowExtensionDataSettingDescriptor = {
  name: "timeline-show-extension-data",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common9.Settings.SettingStorageType.GLOBAL
};
var timelineCountersGraphJsHeapSizeUsedSettingDescriptor = {
  name: "timeline-counters-graph-js-heap-size-used",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common9.Settings.SettingStorageType.GLOBAL
};
var timelineCountersGraphDocumentsSettingDescriptor = {
  name: "timeline-counters-graph-documents",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common9.Settings.SettingStorageType.GLOBAL
};
var timelineCountersGraphNodesSettingDescriptor = {
  name: "timeline-counters-graph-nodes",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common9.Settings.SettingStorageType.GLOBAL
};
var timelineCountersGraphJsEventListenersSettingDescriptor = {
  name: "timeline-counters-graph-js-event-listeners",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common9.Settings.SettingStorageType.GLOBAL
};
var timelineCountersGraphGpuMemoryUsedKbSettingDescriptor = {
  name: "timeline-counters-graph-gpu-memory-used-kb",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common9.Settings.SettingStorageType.GLOBAL
};
var flamechartSelectedNavigationSettingDescriptor = {
  name: "flamechart-selected-navigation",
  type: Common9.Settings.SettingType.ENUM,
  defaultValue: "classic",
  storageType: Common9.Settings.SettingStorageType.SYNCED
};

// ../../front_end/ui/settings/WhatsNewSettings.ts
var WhatsNewSettings_exports = {};
__export(WhatsNewSettings_exports, {
  showReleaseNoteSettingDescriptor: () => showReleaseNoteSettingDescriptor
});
import * as Common10 from "../../core/common/common.js";
var showReleaseNoteSettingDescriptor = {
  name: "help.show-release-note",
  type: Common10.Settings.SettingType.BOOLEAN,
  defaultValue: true
};
export {
  ConsoleSettings_exports as ConsoleSettings,
  ElementsSettings_exports as ElementsSettings,
  EmulationSettings_exports as EmulationSettings,
  InspectorMainSettings_exports as InspectorMainSettings,
  LayerViewerSettings_exports as LayerViewerSettings,
  MainSettings_exports as MainSettings,
  NetworkSettings_exports as NetworkSettings,
  SettingUIRegistration_exports as SettingUIRegistration,
  TimelineSettings_exports as TimelineSettings,
  WhatsNewSettings_exports as WhatsNewSettings
};
//# sourceMappingURL=settings.js.map
