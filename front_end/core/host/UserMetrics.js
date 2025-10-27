"use strict";
import { InspectorFrontendHostInstance } from "./InspectorFrontendHost.js";
import { EnumeratedHistogram } from "./InspectorFrontendHostAPI.js";
export class UserMetrics {
  #panelChangedSinceLaunch;
  #firedLaunchHistogram;
  #launchPanelName;
  constructor() {
    this.#panelChangedSinceLaunch = false;
    this.#firedLaunchHistogram = false;
    this.#launchPanelName = "";
  }
  panelShown(panelName, isLaunching) {
    const code = PanelCodes[panelName] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.PanelShown, code, 69 /* MAX_VALUE */);
    InspectorFrontendHostInstance.recordUserMetricsAction("DevTools_PanelShown_" + panelName);
    if (!isLaunching) {
      this.#panelChangedSinceLaunch = true;
    }
  }
  settingsPanelShown(settingsViewId) {
    this.panelShown("settings-" + settingsViewId);
  }
  sourcesPanelFileDebugged(mediaType) {
    const code = mediaType && MediaTypes[mediaType] || 0 /* Unknown */;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.SourcesPanelFileDebugged,
      code,
      38 /* MAX_VALUE */
    );
  }
  sourcesPanelFileOpened(mediaType) {
    const code = mediaType && MediaTypes[mediaType] || 0 /* Unknown */;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.SourcesPanelFileOpened,
      code,
      38 /* MAX_VALUE */
    );
  }
  networkPanelResponsePreviewOpened(mediaType) {
    const code = mediaType && MediaTypes[mediaType] || 0 /* Unknown */;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.NetworkPanelResponsePreviewOpened,
      code,
      38 /* MAX_VALUE */
    );
  }
  actionTaken(action) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.ActionTaken, action, 195 /* MAX_VALUE */);
  }
  panelLoaded(panelName, histogramName) {
    if (this.#firedLaunchHistogram || panelName !== this.#launchPanelName) {
      return;
    }
    this.#firedLaunchHistogram = true;
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        performance.mark(histogramName);
        if (this.#panelChangedSinceLaunch) {
          return;
        }
        InspectorFrontendHostInstance.recordPerformanceHistogram(histogramName, performance.now());
      }, 0);
    });
  }
  setLaunchPanel(panelName) {
    this.#launchPanelName = panelName;
  }
  performanceTraceLoad(measure) {
    InspectorFrontendHostInstance.recordPerformanceHistogram("DevTools.TraceLoad", measure.duration);
  }
  keybindSetSettingChanged(keybindSet) {
    const value = KeybindSetSettings[keybindSet] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.KeybindSetSettingChanged,
      value,
      2 /* MAX_VALUE */
    );
  }
  keyboardShortcutFired(actionId) {
    const action = KeyboardShortcutAction[actionId] || 0 /* OtherShortcut */;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.KeyboardShortcutFired,
      action,
      120 /* MAX_VALUE */
    );
  }
  issuesPanelOpenedFrom(issueOpener) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.IssuesPanelOpenedFrom,
      issueOpener,
      6 /* MAX_VALUE */
    );
  }
  issuesPanelIssueExpanded(issueExpandedCategory) {
    if (issueExpandedCategory === void 0) {
      return;
    }
    const issueExpanded = IssueExpanded[issueExpandedCategory];
    if (issueExpanded === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.IssuesPanelIssueExpanded,
      issueExpanded,
      9 /* MAX_VALUE */
    );
  }
  issuesPanelResourceOpened(issueCategory, type) {
    const key = issueCategory + type;
    const value = IssueResourceOpened[key];
    if (value === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.IssuesPanelResourceOpened,
      value,
      13 /* MAX_VALUE */
    );
  }
  issueCreated(code) {
    const issueCreated = IssueCreated[code];
    if (issueCreated === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.IssueCreated,
      issueCreated,
      114 /* MAX_VALUE */
    );
  }
  experimentEnabledAtLaunch(experimentId) {
    const experiment = DevtoolsExperiments[experimentId];
    if (experiment === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.ExperimentEnabledAtLaunch,
      experiment,
      110 /* MAX_VALUE */
    );
  }
  navigationSettingAtFirstTimelineLoad(state) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.TimelineNavigationSettingState,
      state,
      4 /* MAX_VALUE */
    );
  }
  experimentDisabledAtLaunch(experimentId) {
    const experiment = DevtoolsExperiments[experimentId];
    if (experiment === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.ExperimentDisabledAtLaunch,
      experiment,
      110 /* MAX_VALUE */
    );
  }
  experimentChanged(experimentId, isEnabled) {
    const experiment = DevtoolsExperiments[experimentId];
    if (experiment === void 0) {
      return;
    }
    const actionName = isEnabled ? EnumeratedHistogram.ExperimentEnabled : EnumeratedHistogram.ExperimentDisabled;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(actionName, experiment, 110 /* MAX_VALUE */);
  }
  developerResourceLoaded(developerResourceLoaded) {
    if (developerResourceLoaded >= 8 /* MAX_VALUE */) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.DeveloperResourceLoaded,
      developerResourceLoaded,
      8 /* MAX_VALUE */
    );
  }
  developerResourceScheme(developerResourceScheme) {
    if (developerResourceScheme >= 9 /* MAX_VALUE */) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.DeveloperResourceScheme,
      developerResourceScheme,
      9 /* MAX_VALUE */
    );
  }
  language(language) {
    const languageCode = Language[language];
    if (languageCode === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.Language,
      languageCode,
      83 /* MAX_VALUE */
    );
  }
  syncSetting(devtoolsSyncSettingEnabled) {
    InspectorFrontendHostInstance.getSyncInformation((syncInfo) => {
      let settingValue = 1 /* CHROME_SYNC_DISABLED */;
      if (syncInfo.isSyncActive && !syncInfo.arePreferencesSynced) {
        settingValue = 2 /* CHROME_SYNC_SETTINGS_DISABLED */;
      } else if (syncInfo.isSyncActive && syncInfo.arePreferencesSynced) {
        settingValue = devtoolsSyncSettingEnabled ? 4 /* DEVTOOLS_SYNC_SETTING_ENABLED */ : 3 /* DEVTOOLS_SYNC_SETTING_DISABLED */;
      }
      InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.SyncSetting,
        settingValue,
        5 /* MAX_VALUE */
      );
    });
  }
  recordingAssertion(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.RecordingAssertion,
      value,
      4 /* MAX_VALUE */
    );
  }
  recordingToggled(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.RecordingToggled,
      value,
      3 /* MAX_VALUE */
    );
  }
  recordingReplayFinished(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.RecordingReplayFinished,
      value,
      5 /* MAX_VALUE */
    );
  }
  recordingReplaySpeed(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.RecordingReplaySpeed,
      value,
      5 /* MAX_VALUE */
    );
  }
  recordingReplayStarted(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.RecordingReplayStarted,
      value,
      4 /* MAX_VALUE */
    );
  }
  recordingEdited(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.RecordingEdited,
      value,
      11 /* MAX_VALUE */
    );
  }
  recordingExported(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.RecordingExported,
      value,
      6 /* MAX_VALUE */
    );
  }
  recordingCodeToggled(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.RecordingCodeToggled,
      value,
      3 /* MAX_VALUE */
    );
  }
  recordingCopiedToClipboard(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.RecordingCopiedToClipboard,
      value,
      9 /* MAX_VALUE */
    );
  }
  lighthouseModeRun(type) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.LighthouseModeRun,
      type,
      4 /* MAX_VALUE */
    );
  }
  lighthouseCategoryUsed(type) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.LighthouseCategoryUsed,
      type,
      6 /* MAX_VALUE */
    );
  }
  swatchActivated(swatch) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.SwatchActivated,
      swatch,
      13 /* MAX_VALUE */
    );
  }
  animationPlaybackRateChanged(playbackRate) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.AnimationPlaybackRateChanged,
      playbackRate,
      4 /* MAX_VALUE */
    );
  }
  workspacesPopulated(wallClockTimeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogram(
      "DevTools.Workspaces.PopulateWallClocktime",
      wallClockTimeInMilliseconds
    );
  }
  visualLoggingProcessingDone(timeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogram(
      "DevTools.VisualLogging.ProcessingTime",
      timeInMilliseconds
    );
  }
  freestylerQueryLength(numberOfCharacters) {
    InspectorFrontendHostInstance.recordCountHistogram(
      "DevTools.Freestyler.QueryLength",
      numberOfCharacters,
      0,
      1e5,
      100
    );
  }
  freestylerEvalResponseSize(bytes) {
    InspectorFrontendHostInstance.recordCountHistogram("DevTools.Freestyler.EvalResponseSize", bytes, 0, 1e5, 100);
  }
  performanceAINetworkSummaryResponseSize(bytes) {
    InspectorFrontendHostInstance.recordCountHistogram(
      "DevTools.PerformanceAI.NetworkSummaryResponseSize",
      bytes,
      0,
      1e5,
      100
    );
  }
  performanceAINetworkRequestDetailResponseSize(bytes) {
    InspectorFrontendHostInstance.recordCountHistogram(
      "DevTools.PerformanceAI.NetworkRequestDetailResponseSize",
      bytes,
      0,
      1e5,
      100
    );
  }
  performanceAIMainThreadActivityResponseSize(bytes) {
    InspectorFrontendHostInstance.recordCountHistogram(
      "DevTools.PerformanceAI.MainThreadActivityResponseSize",
      bytes,
      0,
      1e5,
      100
    );
  }
  builtInAiAvailability(availability) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      EnumeratedHistogram.BuiltInAiAvailability,
      availability,
      10 /* MAX_VALUE */
    );
  }
  consoleInsightTeaserGenerated(timeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogram(
      "DevTools.Insights.TeaserGenerationTime",
      timeInMilliseconds
    );
  }
}
export var Action = /* @__PURE__ */ ((Action2) => {
  Action2[Action2["WindowDocked"] = 1] = "WindowDocked";
  Action2[Action2["WindowUndocked"] = 2] = "WindowUndocked";
  Action2[Action2["ScriptsBreakpointSet"] = 3] = "ScriptsBreakpointSet";
  Action2[Action2["TimelineStarted"] = 4] = "TimelineStarted";
  Action2[Action2["ProfilesCPUProfileTaken"] = 5] = "ProfilesCPUProfileTaken";
  Action2[Action2["ProfilesHeapProfileTaken"] = 6] = "ProfilesHeapProfileTaken";
  Action2[Action2["ConsoleEvaluated"] = 8] = "ConsoleEvaluated";
  Action2[Action2["FileSavedInWorkspace"] = 9] = "FileSavedInWorkspace";
  Action2[Action2["DeviceModeEnabled"] = 10] = "DeviceModeEnabled";
  Action2[Action2["AnimationsPlaybackRateChanged"] = 11] = "AnimationsPlaybackRateChanged";
  Action2[Action2["RevisionApplied"] = 12] = "RevisionApplied";
  Action2[Action2["FileSystemDirectoryContentReceived"] = 13] = "FileSystemDirectoryContentReceived";
  Action2[Action2["StyleRuleEdited"] = 14] = "StyleRuleEdited";
  Action2[Action2["CommandEvaluatedInConsolePanel"] = 15] = "CommandEvaluatedInConsolePanel";
  Action2[Action2["DOMPropertiesExpanded"] = 16] = "DOMPropertiesExpanded";
  Action2[Action2["ResizedViewInResponsiveMode"] = 17] = "ResizedViewInResponsiveMode";
  Action2[Action2["TimelinePageReloadStarted"] = 18] = "TimelinePageReloadStarted";
  Action2[Action2["ConnectToNodeJSFromFrontend"] = 19] = "ConnectToNodeJSFromFrontend";
  Action2[Action2["ConnectToNodeJSDirectly"] = 20] = "ConnectToNodeJSDirectly";
  Action2[Action2["CpuThrottlingEnabled"] = 21] = "CpuThrottlingEnabled";
  Action2[Action2["CpuProfileNodeFocused"] = 22] = "CpuProfileNodeFocused";
  Action2[Action2["CpuProfileNodeExcluded"] = 23] = "CpuProfileNodeExcluded";
  Action2[Action2["SelectFileFromFilePicker"] = 24] = "SelectFileFromFilePicker";
  Action2[Action2["SelectCommandFromCommandMenu"] = 25] = "SelectCommandFromCommandMenu";
  Action2[Action2["ChangeInspectedNodeInElementsPanel"] = 26] = "ChangeInspectedNodeInElementsPanel";
  Action2[Action2["StyleRuleCopied"] = 27] = "StyleRuleCopied";
  Action2[Action2["CoverageStarted"] = 28] = "CoverageStarted";
  Action2[Action2["LighthouseStarted"] = 29] = "LighthouseStarted";
  Action2[Action2["LighthouseFinished"] = 30] = "LighthouseFinished";
  Action2[Action2["ShowedThirdPartyBadges"] = 31] = "ShowedThirdPartyBadges";
  Action2[Action2["LighthouseViewTrace"] = 32] = "LighthouseViewTrace";
  Action2[Action2["FilmStripStartedRecording"] = 33] = "FilmStripStartedRecording";
  Action2[Action2["CoverageReportFiltered"] = 34] = "CoverageReportFiltered";
  Action2[Action2["CoverageStartedPerBlock"] = 35] = "CoverageStartedPerBlock";
  Action2[Action2["SettingsOpenedFromGear-deprecated"] = 36] = "SettingsOpenedFromGear-deprecated";
  Action2[Action2["SettingsOpenedFromMenu-deprecated"] = 37] = "SettingsOpenedFromMenu-deprecated";
  Action2[Action2["SettingsOpenedFromCommandMenu-deprecated"] = 38] = "SettingsOpenedFromCommandMenu-deprecated";
  Action2[Action2["TabMovedToDrawer"] = 39] = "TabMovedToDrawer";
  Action2[Action2["TabMovedToMainPanel"] = 40] = "TabMovedToMainPanel";
  Action2[Action2["CaptureCssOverviewClicked"] = 41] = "CaptureCssOverviewClicked";
  Action2[Action2["VirtualAuthenticatorEnvironmentEnabled"] = 42] = "VirtualAuthenticatorEnvironmentEnabled";
  Action2[Action2["SourceOrderViewActivated"] = 43] = "SourceOrderViewActivated";
  Action2[Action2["UserShortcutAdded"] = 44] = "UserShortcutAdded";
  Action2[Action2["ShortcutRemoved"] = 45] = "ShortcutRemoved";
  Action2[Action2["ShortcutModified"] = 46] = "ShortcutModified";
  Action2[Action2["CustomPropertyLinkClicked"] = 47] = "CustomPropertyLinkClicked";
  Action2[Action2["CustomPropertyEdited"] = 48] = "CustomPropertyEdited";
  Action2[Action2["ServiceWorkerNetworkRequestClicked"] = 49] = "ServiceWorkerNetworkRequestClicked";
  Action2[Action2["ServiceWorkerNetworkRequestClosedQuickly"] = 50] = "ServiceWorkerNetworkRequestClosedQuickly";
  Action2[Action2["NetworkPanelServiceWorkerRespondWith"] = 51] = "NetworkPanelServiceWorkerRespondWith";
  Action2[Action2["NetworkPanelCopyValue"] = 52] = "NetworkPanelCopyValue";
  Action2[Action2["ConsoleSidebarOpened"] = 53] = "ConsoleSidebarOpened";
  Action2[Action2["PerfPanelTraceImported"] = 54] = "PerfPanelTraceImported";
  Action2[Action2["PerfPanelTraceExported"] = 55] = "PerfPanelTraceExported";
  Action2[Action2["StackFrameRestarted"] = 56] = "StackFrameRestarted";
  Action2[Action2["CaptureTestProtocolClicked"] = 57] = "CaptureTestProtocolClicked";
  Action2[Action2["BreakpointRemovedFromRemoveButton"] = 58] = "BreakpointRemovedFromRemoveButton";
  Action2[Action2["BreakpointGroupExpandedStateChanged"] = 59] = "BreakpointGroupExpandedStateChanged";
  Action2[Action2["HeaderOverrideFileCreated"] = 60] = "HeaderOverrideFileCreated";
  Action2[Action2["HeaderOverrideEnableEditingClicked"] = 61] = "HeaderOverrideEnableEditingClicked";
  Action2[Action2["HeaderOverrideHeaderAdded"] = 62] = "HeaderOverrideHeaderAdded";
  Action2[Action2["HeaderOverrideHeaderEdited"] = 63] = "HeaderOverrideHeaderEdited";
  Action2[Action2["HeaderOverrideHeaderRemoved"] = 64] = "HeaderOverrideHeaderRemoved";
  Action2[Action2["HeaderOverrideHeadersFileEdited"] = 65] = "HeaderOverrideHeadersFileEdited";
  Action2[Action2["PersistenceNetworkOverridesEnabled"] = 66] = "PersistenceNetworkOverridesEnabled";
  Action2[Action2["PersistenceNetworkOverridesDisabled"] = 67] = "PersistenceNetworkOverridesDisabled";
  Action2[Action2["BreakpointRemovedFromContextMenu"] = 68] = "BreakpointRemovedFromContextMenu";
  Action2[Action2["BreakpointsInFileRemovedFromRemoveButton"] = 69] = "BreakpointsInFileRemovedFromRemoveButton";
  Action2[Action2["BreakpointsInFileRemovedFromContextMenu"] = 70] = "BreakpointsInFileRemovedFromContextMenu";
  Action2[Action2["BreakpointsInFileCheckboxToggled"] = 71] = "BreakpointsInFileCheckboxToggled";
  Action2[Action2["BreakpointsInFileEnabledDisabledFromContextMenu"] = 72] = "BreakpointsInFileEnabledDisabledFromContextMenu";
  Action2[Action2["BreakpointConditionEditedFromSidebar"] = 73] = "BreakpointConditionEditedFromSidebar";
  Action2[Action2["WorkspaceTabAddFolder"] = 74] = "WorkspaceTabAddFolder";
  Action2[Action2["WorkspaceTabRemoveFolder"] = 75] = "WorkspaceTabRemoveFolder";
  Action2[Action2["OverrideTabAddFolder"] = 76] = "OverrideTabAddFolder";
  Action2[Action2["OverrideTabRemoveFolder"] = 77] = "OverrideTabRemoveFolder";
  Action2[Action2["WorkspaceSourceSelected"] = 78] = "WorkspaceSourceSelected";
  Action2[Action2["OverridesSourceSelected"] = 79] = "OverridesSourceSelected";
  Action2[Action2["StyleSheetInitiatorLinkClicked"] = 80] = "StyleSheetInitiatorLinkClicked";
  Action2[Action2["BreakpointRemovedFromGutterContextMenu"] = 81] = "BreakpointRemovedFromGutterContextMenu";
  Action2[Action2["BreakpointRemovedFromGutterToggle"] = 82] = "BreakpointRemovedFromGutterToggle";
  Action2[Action2["StylePropertyInsideKeyframeEdited"] = 83] = "StylePropertyInsideKeyframeEdited";
  Action2[Action2["OverrideContentFromSourcesContextMenu"] = 84] = "OverrideContentFromSourcesContextMenu";
  Action2[Action2["OverrideContentFromNetworkContextMenu"] = 85] = "OverrideContentFromNetworkContextMenu";
  Action2[Action2["OverrideScript"] = 86] = "OverrideScript";
  Action2[Action2["OverrideStyleSheet"] = 87] = "OverrideStyleSheet";
  Action2[Action2["OverrideDocument"] = 88] = "OverrideDocument";
  Action2[Action2["OverrideFetchXHR"] = 89] = "OverrideFetchXHR";
  Action2[Action2["OverrideImage"] = 90] = "OverrideImage";
  Action2[Action2["OverrideFont"] = 91] = "OverrideFont";
  Action2[Action2["OverrideContentContextMenuSetup"] = 92] = "OverrideContentContextMenuSetup";
  Action2[Action2["OverrideContentContextMenuAbandonSetup"] = 93] = "OverrideContentContextMenuAbandonSetup";
  Action2[Action2["OverrideContentContextMenuActivateDisabled"] = 94] = "OverrideContentContextMenuActivateDisabled";
  Action2[Action2["OverrideContentContextMenuOpenExistingFile"] = 95] = "OverrideContentContextMenuOpenExistingFile";
  Action2[Action2["OverrideContentContextMenuSaveNewFile"] = 96] = "OverrideContentContextMenuSaveNewFile";
  Action2[Action2["ShowAllOverridesFromSourcesContextMenu"] = 97] = "ShowAllOverridesFromSourcesContextMenu";
  Action2[Action2["ShowAllOverridesFromNetworkContextMenu"] = 98] = "ShowAllOverridesFromNetworkContextMenu";
  Action2[Action2["AnimationGroupsCleared"] = 99] = "AnimationGroupsCleared";
  Action2[Action2["AnimationsPaused"] = 100] = "AnimationsPaused";
  Action2[Action2["AnimationsResumed"] = 101] = "AnimationsResumed";
  Action2[Action2["AnimatedNodeDescriptionClicked"] = 102] = "AnimatedNodeDescriptionClicked";
  Action2[Action2["AnimationGroupScrubbed"] = 103] = "AnimationGroupScrubbed";
  Action2[Action2["AnimationGroupReplayed"] = 104] = "AnimationGroupReplayed";
  Action2[Action2["OverrideTabDeleteFolderContextMenu"] = 105] = "OverrideTabDeleteFolderContextMenu";
  Action2[Action2["WorkspaceDropFolder"] = 107] = "WorkspaceDropFolder";
  Action2[Action2["WorkspaceSelectFolder"] = 108] = "WorkspaceSelectFolder";
  Action2[Action2["OverrideContentContextMenuSourceMappedWarning"] = 109] = "OverrideContentContextMenuSourceMappedWarning";
  Action2[Action2["OverrideContentContextMenuRedirectToDeployed"] = 110] = "OverrideContentContextMenuRedirectToDeployed";
  Action2[Action2["NewStyleRuleAdded"] = 111] = "NewStyleRuleAdded";
  Action2[Action2["TraceExpanded"] = 112] = "TraceExpanded";
  Action2[Action2["InsightConsoleMessageShown"] = 113] = "InsightConsoleMessageShown";
  Action2[Action2["InsightRequestedViaContextMenu"] = 114] = "InsightRequestedViaContextMenu";
  Action2[Action2["InsightRequestedViaHoverButton"] = 115] = "InsightRequestedViaHoverButton";
  Action2[Action2["InsightRatedPositive"] = 117] = "InsightRatedPositive";
  Action2[Action2["InsightRatedNegative"] = 118] = "InsightRatedNegative";
  Action2[Action2["InsightClosed"] = 119] = "InsightClosed";
  Action2[Action2["InsightErrored"] = 120] = "InsightErrored";
  Action2[Action2["InsightHoverButtonShown"] = 121] = "InsightHoverButtonShown";
  Action2[Action2["SelfXssWarningConsoleMessageShown"] = 122] = "SelfXssWarningConsoleMessageShown";
  Action2[Action2["SelfXssWarningDialogShown"] = 123] = "SelfXssWarningDialogShown";
  Action2[Action2["SelfXssAllowPastingInConsole"] = 124] = "SelfXssAllowPastingInConsole";
  Action2[Action2["SelfXssAllowPastingInDialog"] = 125] = "SelfXssAllowPastingInDialog";
  Action2[Action2["ToggleEmulateFocusedPageFromStylesPaneOn"] = 126] = "ToggleEmulateFocusedPageFromStylesPaneOn";
  Action2[Action2["ToggleEmulateFocusedPageFromStylesPaneOff"] = 127] = "ToggleEmulateFocusedPageFromStylesPaneOff";
  Action2[Action2["ToggleEmulateFocusedPageFromRenderingTab"] = 128] = "ToggleEmulateFocusedPageFromRenderingTab";
  Action2[Action2["ToggleEmulateFocusedPageFromCommandMenu"] = 129] = "ToggleEmulateFocusedPageFromCommandMenu";
  Action2[Action2["InsightGenerated"] = 130] = "InsightGenerated";
  Action2[Action2["InsightErroredApi"] = 131] = "InsightErroredApi";
  Action2[Action2["InsightErroredMarkdown"] = 132] = "InsightErroredMarkdown";
  Action2[Action2["ToggleShowWebVitals"] = 133] = "ToggleShowWebVitals";
  Action2[Action2["InsightErroredPermissionDenied"] = 134] = "InsightErroredPermissionDenied";
  Action2[Action2["InsightErroredCannotSend"] = 135] = "InsightErroredCannotSend";
  Action2[Action2["InsightErroredRequestFailed"] = 136] = "InsightErroredRequestFailed";
  Action2[Action2["InsightErroredCannotParseChunk"] = 137] = "InsightErroredCannotParseChunk";
  Action2[Action2["InsightErroredUnknownChunk"] = 138] = "InsightErroredUnknownChunk";
  Action2[Action2["InsightErroredOther"] = 139] = "InsightErroredOther";
  Action2[Action2["AutofillReceived"] = 140] = "AutofillReceived";
  Action2[Action2["AutofillReceivedAndTabAutoOpened"] = 141] = "AutofillReceivedAndTabAutoOpened";
  Action2[Action2["AnimationGroupSelected"] = 142] = "AnimationGroupSelected";
  Action2[Action2["ScrollDrivenAnimationGroupSelected"] = 143] = "ScrollDrivenAnimationGroupSelected";
  Action2[Action2["ScrollDrivenAnimationGroupScrubbed"] = 144] = "ScrollDrivenAnimationGroupScrubbed";
  Action2[Action2["AiAssistanceOpenedFromElementsPanel"] = 145] = "AiAssistanceOpenedFromElementsPanel";
  Action2[Action2["AiAssistanceOpenedFromStylesTab"] = 146] = "AiAssistanceOpenedFromStylesTab";
  Action2[Action2["ConsoleFilterByContext"] = 147] = "ConsoleFilterByContext";
  Action2[Action2["ConsoleFilterBySource"] = 148] = "ConsoleFilterBySource";
  Action2[Action2["ConsoleFilterByUrl"] = 149] = "ConsoleFilterByUrl";
  Action2[Action2["InsightConsentReminderShown"] = 150] = "InsightConsentReminderShown";
  Action2[Action2["InsightConsentReminderCanceled"] = 151] = "InsightConsentReminderCanceled";
  Action2[Action2["InsightConsentReminderConfirmed"] = 152] = "InsightConsentReminderConfirmed";
  Action2[Action2["InsightsOnboardingShown"] = 153] = "InsightsOnboardingShown";
  Action2[Action2["InsightsOnboardingCanceledOnPage1"] = 154] = "InsightsOnboardingCanceledOnPage1";
  Action2[Action2["InsightsOnboardingCanceledOnPage2"] = 155] = "InsightsOnboardingCanceledOnPage2";
  Action2[Action2["InsightsOnboardingConfirmed"] = 156] = "InsightsOnboardingConfirmed";
  Action2[Action2["InsightsOnboardingNextPage"] = 157] = "InsightsOnboardingNextPage";
  Action2[Action2["InsightsOnboardingPrevPage"] = 158] = "InsightsOnboardingPrevPage";
  Action2[Action2["InsightsOnboardingFeatureDisabled"] = 159] = "InsightsOnboardingFeatureDisabled";
  Action2[Action2["InsightsOptInTeaserShown"] = 160] = "InsightsOptInTeaserShown";
  Action2[Action2["InsightsOptInTeaserSettingsLinkClicked"] = 161] = "InsightsOptInTeaserSettingsLinkClicked";
  Action2[Action2["InsightsOptInTeaserConfirmedInSettings"] = 162] = "InsightsOptInTeaserConfirmedInSettings";
  Action2[Action2["InsightsReminderTeaserShown"] = 163] = "InsightsReminderTeaserShown";
  Action2[Action2["InsightsReminderTeaserConfirmed"] = 164] = "InsightsReminderTeaserConfirmed";
  Action2[Action2["InsightsReminderTeaserCanceled"] = 165] = "InsightsReminderTeaserCanceled";
  Action2[Action2["InsightsReminderTeaserSettingsLinkClicked"] = 166] = "InsightsReminderTeaserSettingsLinkClicked";
  Action2[Action2["InsightsReminderTeaserAbortedInSettings"] = 167] = "InsightsReminderTeaserAbortedInSettings";
  Action2[Action2["GeneratingInsightWithoutDisclaimer"] = 168] = "GeneratingInsightWithoutDisclaimer";
  Action2[Action2["AiAssistanceOpenedFromElementsPanelFloatingButton"] = 169] = "AiAssistanceOpenedFromElementsPanelFloatingButton";
  Action2[Action2["AiAssistanceOpenedFromNetworkPanel"] = 170] = "AiAssistanceOpenedFromNetworkPanel";
  Action2[Action2["AiAssistanceOpenedFromSourcesPanel"] = 171] = "AiAssistanceOpenedFromSourcesPanel";
  Action2[Action2["AiAssistanceOpenedFromSourcesPanelFloatingButton"] = 172] = "AiAssistanceOpenedFromSourcesPanelFloatingButton";
  Action2[Action2["AiAssistanceOpenedFromPerformancePanelCallTree"] = 173] = "AiAssistanceOpenedFromPerformancePanelCallTree";
  Action2[Action2["AiAssistanceOpenedFromNetworkPanelFloatingButton"] = 174] = "AiAssistanceOpenedFromNetworkPanelFloatingButton";
  Action2[Action2["AiAssistancePanelOpened"] = 175] = "AiAssistancePanelOpened";
  Action2[Action2["AiAssistanceQuerySubmitted"] = 176] = "AiAssistanceQuerySubmitted";
  Action2[Action2["AiAssistanceAnswerReceived"] = 177] = "AiAssistanceAnswerReceived";
  Action2[Action2["AiAssistanceDynamicSuggestionClicked"] = 178] = "AiAssistanceDynamicSuggestionClicked";
  Action2[Action2["AiAssistanceSideEffectConfirmed"] = 179] = "AiAssistanceSideEffectConfirmed";
  Action2[Action2["AiAssistanceSideEffectRejected"] = 180] = "AiAssistanceSideEffectRejected";
  Action2[Action2["AiAssistanceError"] = 181] = "AiAssistanceError";
  Action2[Action2["AiCodeCompletionResponseServedFromCache"] = 184] = "AiCodeCompletionResponseServedFromCache";
  Action2[Action2["AiCodeCompletionRequestTriggered"] = 185] = "AiCodeCompletionRequestTriggered";
  Action2[Action2["AiCodeCompletionSuggestionDisplayed"] = 186] = "AiCodeCompletionSuggestionDisplayed";
  Action2[Action2["AiCodeCompletionSuggestionAccepted"] = 187] = "AiCodeCompletionSuggestionAccepted";
  Action2[Action2["AiCodeCompletionError"] = 188] = "AiCodeCompletionError";
  Action2[Action2["AttributeLinkClicked"] = 189] = "AttributeLinkClicked";
  Action2[Action2["InsightRequestedViaTeaser"] = 190] = "InsightRequestedViaTeaser";
  Action2[Action2["InsightTeaserGenerationStarted"] = 191] = "InsightTeaserGenerationStarted";
  Action2[Action2["InsightTeaserGenerationCompleted"] = 192] = "InsightTeaserGenerationCompleted";
  Action2[Action2["InsightTeaserGenerationAborted"] = 193] = "InsightTeaserGenerationAborted";
  Action2[Action2["InsightTeaserGenerationErrored"] = 194] = "InsightTeaserGenerationErrored";
  Action2[Action2["MAX_VALUE"] = 195] = "MAX_VALUE";
  return Action2;
})(Action || {});
export var PanelCodes = /* @__PURE__ */ ((PanelCodes2) => {
  PanelCodes2[PanelCodes2["elements"] = 1] = "elements";
  PanelCodes2[PanelCodes2["resources"] = 2] = "resources";
  PanelCodes2[PanelCodes2["network"] = 3] = "network";
  PanelCodes2[PanelCodes2["sources"] = 4] = "sources";
  PanelCodes2[PanelCodes2["timeline"] = 5] = "timeline";
  PanelCodes2[PanelCodes2["heap-profiler"] = 6] = "heap-profiler";
  PanelCodes2[PanelCodes2["console"] = 8] = "console";
  PanelCodes2[PanelCodes2["layers"] = 9] = "layers";
  PanelCodes2[PanelCodes2["console-view"] = 10] = "console-view";
  PanelCodes2[PanelCodes2["animations"] = 11] = "animations";
  PanelCodes2[PanelCodes2["network.config"] = 12] = "network.config";
  PanelCodes2[PanelCodes2["rendering"] = 13] = "rendering";
  PanelCodes2[PanelCodes2["sensors"] = 14] = "sensors";
  PanelCodes2[PanelCodes2["sources.search"] = 15] = "sources.search";
  PanelCodes2[PanelCodes2["security"] = 16] = "security";
  PanelCodes2[PanelCodes2["js-profiler"] = 17] = "js-profiler";
  PanelCodes2[PanelCodes2["lighthouse"] = 18] = "lighthouse";
  PanelCodes2[PanelCodes2["coverage"] = 19] = "coverage";
  PanelCodes2[PanelCodes2["protocol-monitor"] = 20] = "protocol-monitor";
  PanelCodes2[PanelCodes2["remote-devices"] = 21] = "remote-devices";
  PanelCodes2[PanelCodes2["web-audio"] = 22] = "web-audio";
  PanelCodes2[PanelCodes2["changes.changes"] = 23] = "changes.changes";
  PanelCodes2[PanelCodes2["performance.monitor"] = 24] = "performance.monitor";
  PanelCodes2[PanelCodes2["release-note"] = 25] = "release-note";
  PanelCodes2[PanelCodes2["live-heap-profile"] = 26] = "live-heap-profile";
  PanelCodes2[PanelCodes2["sources.quick"] = 27] = "sources.quick";
  PanelCodes2[PanelCodes2["network.blocked-urls"] = 28] = "network.blocked-urls";
  PanelCodes2[PanelCodes2["settings-preferences"] = 29] = "settings-preferences";
  PanelCodes2[PanelCodes2["settings-workspace"] = 30] = "settings-workspace";
  PanelCodes2[PanelCodes2["settings-experiments"] = 31] = "settings-experiments";
  PanelCodes2[PanelCodes2["settings-blackbox"] = 32] = "settings-blackbox";
  PanelCodes2[PanelCodes2["settings-devices"] = 33] = "settings-devices";
  PanelCodes2[PanelCodes2["settings-throttling-conditions"] = 34] = "settings-throttling-conditions";
  PanelCodes2[PanelCodes2["settings-emulation-locations"] = 35] = "settings-emulation-locations";
  PanelCodes2[PanelCodes2["settings-shortcuts"] = 36] = "settings-shortcuts";
  PanelCodes2[PanelCodes2["issues-pane"] = 37] = "issues-pane";
  PanelCodes2[PanelCodes2["settings-keybinds"] = 38] = "settings-keybinds";
  PanelCodes2[PanelCodes2["cssoverview"] = 39] = "cssoverview";
  PanelCodes2[PanelCodes2["chrome-recorder"] = 40] = "chrome-recorder";
  PanelCodes2[PanelCodes2["trust-tokens"] = 41] = "trust-tokens";
  PanelCodes2[PanelCodes2["reporting-api"] = 42] = "reporting-api";
  PanelCodes2[PanelCodes2["interest-groups"] = 43] = "interest-groups";
  PanelCodes2[PanelCodes2["back-forward-cache"] = 44] = "back-forward-cache";
  PanelCodes2[PanelCodes2["service-worker-cache"] = 45] = "service-worker-cache";
  PanelCodes2[PanelCodes2["background-service-background-fetch"] = 46] = "background-service-background-fetch";
  PanelCodes2[PanelCodes2["background-service-background-sync"] = 47] = "background-service-background-sync";
  PanelCodes2[PanelCodes2["background-service-push-messaging"] = 48] = "background-service-push-messaging";
  PanelCodes2[PanelCodes2["background-service-notifications"] = 49] = "background-service-notifications";
  PanelCodes2[PanelCodes2["background-service-payment-handler"] = 50] = "background-service-payment-handler";
  PanelCodes2[PanelCodes2["background-service-periodic-background-sync"] = 51] = "background-service-periodic-background-sync";
  PanelCodes2[PanelCodes2["service-workers"] = 52] = "service-workers";
  PanelCodes2[PanelCodes2["app-manifest"] = 53] = "app-manifest";
  PanelCodes2[PanelCodes2["storage"] = 54] = "storage";
  PanelCodes2[PanelCodes2["cookies"] = 55] = "cookies";
  PanelCodes2[PanelCodes2["frame-details"] = 56] = "frame-details";
  PanelCodes2[PanelCodes2["frame-resource"] = 57] = "frame-resource";
  PanelCodes2[PanelCodes2["frame-window"] = 58] = "frame-window";
  PanelCodes2[PanelCodes2["frame-worker"] = 59] = "frame-worker";
  PanelCodes2[PanelCodes2["dom-storage"] = 60] = "dom-storage";
  PanelCodes2[PanelCodes2["indexed-db"] = 61] = "indexed-db";
  PanelCodes2[PanelCodes2["web-sql"] = 62] = "web-sql";
  PanelCodes2[PanelCodes2["performance-insights"] = 63] = "performance-insights";
  PanelCodes2[PanelCodes2["preloading"] = 64] = "preloading";
  PanelCodes2[PanelCodes2["bounce-tracking-mitigations"] = 65] = "bounce-tracking-mitigations";
  PanelCodes2[PanelCodes2["developer-resources"] = 66] = "developer-resources";
  PanelCodes2[PanelCodes2["autofill-view"] = 67] = "autofill-view";
  PanelCodes2[PanelCodes2["freestyler"] = 68] = "freestyler";
  PanelCodes2[PanelCodes2["MAX_VALUE"] = 69] = "MAX_VALUE";
  return PanelCodes2;
})(PanelCodes || {});
export var MediaTypes = /* @__PURE__ */ ((MediaTypes2) => {
  MediaTypes2[MediaTypes2["Unknown"] = 0] = "Unknown";
  MediaTypes2[MediaTypes2["text/css"] = 2] = "text/css";
  MediaTypes2[MediaTypes2["text/html"] = 3] = "text/html";
  MediaTypes2[MediaTypes2["application/xml"] = 4] = "application/xml";
  MediaTypes2[MediaTypes2["application/wasm"] = 5] = "application/wasm";
  MediaTypes2[MediaTypes2["application/manifest+json"] = 6] = "application/manifest+json";
  MediaTypes2[MediaTypes2["application/x-aspx"] = 7] = "application/x-aspx";
  MediaTypes2[MediaTypes2["application/jsp"] = 8] = "application/jsp";
  MediaTypes2[MediaTypes2["text/x-c++src"] = 9] = "text/x-c++src";
  MediaTypes2[MediaTypes2["text/x-coffeescript"] = 10] = "text/x-coffeescript";
  MediaTypes2[MediaTypes2["application/vnd.dart"] = 11] = "application/vnd.dart";
  MediaTypes2[MediaTypes2["text/typescript"] = 12] = "text/typescript";
  MediaTypes2[MediaTypes2["text/typescript-jsx"] = 13] = "text/typescript-jsx";
  MediaTypes2[MediaTypes2["application/json"] = 14] = "application/json";
  MediaTypes2[MediaTypes2["text/x-csharp"] = 15] = "text/x-csharp";
  MediaTypes2[MediaTypes2["text/x-java"] = 16] = "text/x-java";
  MediaTypes2[MediaTypes2["text/x-less"] = 17] = "text/x-less";
  MediaTypes2[MediaTypes2["application/x-httpd-php"] = 18] = "application/x-httpd-php";
  MediaTypes2[MediaTypes2["text/x-python"] = 19] = "text/x-python";
  MediaTypes2[MediaTypes2["text/x-sh"] = 20] = "text/x-sh";
  MediaTypes2[MediaTypes2["text/x-gss"] = 21] = "text/x-gss";
  MediaTypes2[MediaTypes2["text/x-sass"] = 22] = "text/x-sass";
  MediaTypes2[MediaTypes2["text/x-scss"] = 23] = "text/x-scss";
  MediaTypes2[MediaTypes2["text/markdown"] = 24] = "text/markdown";
  MediaTypes2[MediaTypes2["text/x-clojure"] = 25] = "text/x-clojure";
  MediaTypes2[MediaTypes2["text/jsx"] = 26] = "text/jsx";
  MediaTypes2[MediaTypes2["text/x-go"] = 27] = "text/x-go";
  MediaTypes2[MediaTypes2["text/x-kotlin"] = 28] = "text/x-kotlin";
  MediaTypes2[MediaTypes2["text/x-scala"] = 29] = "text/x-scala";
  MediaTypes2[MediaTypes2["text/x.svelte"] = 30] = "text/x.svelte";
  MediaTypes2[MediaTypes2["text/javascript+plain"] = 31] = "text/javascript+plain";
  MediaTypes2[MediaTypes2["text/javascript+minified"] = 32] = "text/javascript+minified";
  MediaTypes2[MediaTypes2["text/javascript+sourcemapped"] = 33] = "text/javascript+sourcemapped";
  MediaTypes2[MediaTypes2["text/x.angular"] = 34] = "text/x.angular";
  MediaTypes2[MediaTypes2["text/x.vue"] = 35] = "text/x.vue";
  MediaTypes2[MediaTypes2["text/javascript+snippet"] = 36] = "text/javascript+snippet";
  MediaTypes2[MediaTypes2["text/javascript+eval"] = 37] = "text/javascript+eval";
  MediaTypes2[MediaTypes2["MAX_VALUE"] = 38] = "MAX_VALUE";
  return MediaTypes2;
})(MediaTypes || {});
export var KeybindSetSettings = /* @__PURE__ */ ((KeybindSetSettings2) => {
  KeybindSetSettings2[KeybindSetSettings2["devToolsDefault"] = 0] = "devToolsDefault";
  KeybindSetSettings2[KeybindSetSettings2["vsCode"] = 1] = "vsCode";
  KeybindSetSettings2[KeybindSetSettings2["MAX_VALUE"] = 2] = "MAX_VALUE";
  return KeybindSetSettings2;
})(KeybindSetSettings || {});
export var KeyboardShortcutAction = /* @__PURE__ */ ((KeyboardShortcutAction2) => {
  KeyboardShortcutAction2[KeyboardShortcutAction2["OtherShortcut"] = 0] = "OtherShortcut";
  KeyboardShortcutAction2[KeyboardShortcutAction2["quick-open.show-command-menu"] = 1] = "quick-open.show-command-menu";
  KeyboardShortcutAction2[KeyboardShortcutAction2["console.clear"] = 2] = "console.clear";
  KeyboardShortcutAction2[KeyboardShortcutAction2["console.toggle"] = 3] = "console.toggle";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.step"] = 4] = "debugger.step";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.step-into"] = 5] = "debugger.step-into";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.step-out"] = 6] = "debugger.step-out";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.step-over"] = 7] = "debugger.step-over";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.toggle-breakpoint"] = 8] = "debugger.toggle-breakpoint";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.toggle-breakpoint-enabled"] = 9] = "debugger.toggle-breakpoint-enabled";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.toggle-pause"] = 10] = "debugger.toggle-pause";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.edit-as-html"] = 11] = "elements.edit-as-html";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.hide-element"] = 12] = "elements.hide-element";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.redo"] = 13] = "elements.redo";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.toggle-element-search"] = 14] = "elements.toggle-element-search";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.undo"] = 15] = "elements.undo";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.search-in-panel.find"] = 16] = "main.search-in-panel.find";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.toggle-drawer"] = 17] = "main.toggle-drawer";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network.hide-request-details"] = 18] = "network.hide-request-details";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network.search"] = 19] = "network.search";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network.toggle-recording"] = 20] = "network.toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["quick-open.show"] = 21] = "quick-open.show";
  KeyboardShortcutAction2[KeyboardShortcutAction2["settings.show"] = 22] = "settings.show";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.search"] = 23] = "sources.search";
  KeyboardShortcutAction2[KeyboardShortcutAction2["background-service.toggle-recording"] = 24] = "background-service.toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["components.collect-garbage"] = 25] = "components.collect-garbage";
  KeyboardShortcutAction2[KeyboardShortcutAction2["console.clear.history"] = 26] = "console.clear.history";
  KeyboardShortcutAction2[KeyboardShortcutAction2["console.create-pin"] = 27] = "console.create-pin";
  KeyboardShortcutAction2[KeyboardShortcutAction2["coverage.start-with-reload"] = 28] = "coverage.start-with-reload";
  KeyboardShortcutAction2[KeyboardShortcutAction2["coverage.toggle-recording"] = 29] = "coverage.toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.breakpoint-input-window"] = 30] = "debugger.breakpoint-input-window";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.evaluate-selection"] = 31] = "debugger.evaluate-selection";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.next-call-frame"] = 32] = "debugger.next-call-frame";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.previous-call-frame"] = 33] = "debugger.previous-call-frame";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.run-snippet"] = 34] = "debugger.run-snippet";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.toggle-breakpoints-active"] = 35] = "debugger.toggle-breakpoints-active";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.capture-area-screenshot"] = 36] = "elements.capture-area-screenshot";
  KeyboardShortcutAction2[KeyboardShortcutAction2["emulation.capture-full-height-screenshot"] = 37] = "emulation.capture-full-height-screenshot";
  KeyboardShortcutAction2[KeyboardShortcutAction2["emulation.capture-node-screenshot"] = 38] = "emulation.capture-node-screenshot";
  KeyboardShortcutAction2[KeyboardShortcutAction2["emulation.capture-screenshot"] = 39] = "emulation.capture-screenshot";
  KeyboardShortcutAction2[KeyboardShortcutAction2["emulation.show-sensors"] = 40] = "emulation.show-sensors";
  KeyboardShortcutAction2[KeyboardShortcutAction2["emulation.toggle-device-mode"] = 41] = "emulation.toggle-device-mode";
  KeyboardShortcutAction2[KeyboardShortcutAction2["help.release-notes"] = 42] = "help.release-notes";
  KeyboardShortcutAction2[KeyboardShortcutAction2["help.report-issue"] = 43] = "help.report-issue";
  KeyboardShortcutAction2[KeyboardShortcutAction2["input.start-replaying"] = 44] = "input.start-replaying";
  KeyboardShortcutAction2[KeyboardShortcutAction2["input.toggle-pause"] = 45] = "input.toggle-pause";
  KeyboardShortcutAction2[KeyboardShortcutAction2["input.toggle-recording"] = 46] = "input.toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["inspector-main.focus-debuggee"] = 47] = "inspector-main.focus-debuggee";
  KeyboardShortcutAction2[KeyboardShortcutAction2["inspector-main.hard-reload"] = 48] = "inspector-main.hard-reload";
  KeyboardShortcutAction2[KeyboardShortcutAction2["inspector-main.reload"] = 49] = "inspector-main.reload";
  KeyboardShortcutAction2[KeyboardShortcutAction2["live-heap-profile.start-with-reload"] = 50] = "live-heap-profile.start-with-reload";
  KeyboardShortcutAction2[KeyboardShortcutAction2["live-heap-profile.toggle-recording"] = 51] = "live-heap-profile.toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.debug-reload"] = 52] = "main.debug-reload";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.next-tab"] = 53] = "main.next-tab";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.previous-tab"] = 54] = "main.previous-tab";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.search-in-panel.cancel"] = 55] = "main.search-in-panel.cancel";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.search-in-panel.find-next"] = 56] = "main.search-in-panel.find-next";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.search-in-panel.find-previous"] = 57] = "main.search-in-panel.find-previous";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.toggle-dock"] = 58] = "main.toggle-dock";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.zoom-in"] = 59] = "main.zoom-in";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.zoom-out"] = 60] = "main.zoom-out";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.zoom-reset"] = 61] = "main.zoom-reset";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network-conditions.network-low-end-mobile"] = 62] = "network-conditions.network-low-end-mobile";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network-conditions.network-mid-tier-mobile"] = 63] = "network-conditions.network-mid-tier-mobile";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network-conditions.network-offline"] = 64] = "network-conditions.network-offline";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network-conditions.network-online"] = 65] = "network-conditions.network-online";
  KeyboardShortcutAction2[KeyboardShortcutAction2["profiler.heap-toggle-recording"] = 66] = "profiler.heap-toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["profiler.js-toggle-recording"] = 67] = "profiler.js-toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["resources.clear"] = 68] = "resources.clear";
  KeyboardShortcutAction2[KeyboardShortcutAction2["settings.documentation"] = 69] = "settings.documentation";
  KeyboardShortcutAction2[KeyboardShortcutAction2["settings.shortcuts"] = 70] = "settings.shortcuts";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.add-folder-to-workspace"] = 71] = "sources.add-folder-to-workspace";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.add-to-watch"] = 72] = "sources.add-to-watch";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.close-all"] = 73] = "sources.close-all";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.close-editor-tab"] = 74] = "sources.close-editor-tab";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.create-snippet"] = 75] = "sources.create-snippet";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.go-to-line"] = 76] = "sources.go-to-line";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.go-to-member"] = 77] = "sources.go-to-member";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.jump-to-next-location"] = 78] = "sources.jump-to-next-location";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.jump-to-previous-location"] = 79] = "sources.jump-to-previous-location";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.rename"] = 80] = "sources.rename";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.save"] = 81] = "sources.save";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.save-all"] = 82] = "sources.save-all";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.switch-file"] = 83] = "sources.switch-file";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.jump-to-next-frame"] = 84] = "timeline.jump-to-next-frame";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.jump-to-previous-frame"] = 85] = "timeline.jump-to-previous-frame";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.load-from-file"] = 86] = "timeline.load-from-file";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.next-recording"] = 87] = "timeline.next-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.previous-recording"] = 88] = "timeline.previous-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.record-reload"] = 89] = "timeline.record-reload";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.save-to-file"] = 90] = "timeline.save-to-file";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.show-history"] = 91] = "timeline.show-history";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.toggle-recording"] = 92] = "timeline.toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.increment-css"] = 93] = "sources.increment-css";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.increment-css-by-ten"] = 94] = "sources.increment-css-by-ten";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.decrement-css"] = 95] = "sources.decrement-css";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.decrement-css-by-ten"] = 96] = "sources.decrement-css-by-ten";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.reset-view"] = 97] = "layers.reset-view";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.pan-mode"] = 98] = "layers.pan-mode";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.rotate-mode"] = 99] = "layers.rotate-mode";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.zoom-in"] = 100] = "layers.zoom-in";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.zoom-out"] = 101] = "layers.zoom-out";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.up"] = 102] = "layers.up";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.down"] = 103] = "layers.down";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.left"] = 104] = "layers.left";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.right"] = 105] = "layers.right";
  KeyboardShortcutAction2[KeyboardShortcutAction2["help.report-translation-issue"] = 106] = "help.report-translation-issue";
  KeyboardShortcutAction2[KeyboardShortcutAction2["rendering.toggle-prefers-color-scheme"] = 107] = "rendering.toggle-prefers-color-scheme";
  KeyboardShortcutAction2[KeyboardShortcutAction2["chrome-recorder.start-recording"] = 108] = "chrome-recorder.start-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["chrome-recorder.replay-recording"] = 109] = "chrome-recorder.replay-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["chrome-recorder.toggle-code-view"] = 110] = "chrome-recorder.toggle-code-view";
  KeyboardShortcutAction2[KeyboardShortcutAction2["chrome-recorder.copy-recording-or-step"] = 111] = "chrome-recorder.copy-recording-or-step";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.new-style-rule"] = 114] = "elements.new-style-rule";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.refresh-event-listeners"] = 115] = "elements.refresh-event-listeners";
  KeyboardShortcutAction2[KeyboardShortcutAction2["coverage.clear"] = 116] = "coverage.clear";
  KeyboardShortcutAction2[KeyboardShortcutAction2["coverage.export"] = 117] = "coverage.export";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.dim-third-parties"] = 118] = "timeline.dim-third-parties";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.toggle-drawer-orientation"] = 119] = "main.toggle-drawer-orientation";
  KeyboardShortcutAction2[KeyboardShortcutAction2["MAX_VALUE"] = 120] = "MAX_VALUE";
  return KeyboardShortcutAction2;
})(KeyboardShortcutAction || {});
export var IssueOpener = /* @__PURE__ */ ((IssueOpener2) => {
  IssueOpener2[IssueOpener2["CONSOLE_INFO_BAR"] = 0] = "CONSOLE_INFO_BAR";
  IssueOpener2[IssueOpener2["LEARN_MORE_LINK_COEP"] = 1] = "LEARN_MORE_LINK_COEP";
  IssueOpener2[IssueOpener2["STATUS_BAR_ISSUES_COUNTER"] = 2] = "STATUS_BAR_ISSUES_COUNTER";
  IssueOpener2[IssueOpener2["HAMBURGER_MENU"] = 3] = "HAMBURGER_MENU";
  IssueOpener2[IssueOpener2["ADORNER"] = 4] = "ADORNER";
  IssueOpener2[IssueOpener2["COMMAND_MENU"] = 5] = "COMMAND_MENU";
  IssueOpener2[IssueOpener2["MAX_VALUE"] = 6] = "MAX_VALUE";
  return IssueOpener2;
})(IssueOpener || {});
export var DevtoolsExperiments = /* @__PURE__ */ ((DevtoolsExperiments2) => {
  DevtoolsExperiments2[DevtoolsExperiments2["capture-node-creation-stacks"] = 1] = "capture-node-creation-stacks";
  DevtoolsExperiments2[DevtoolsExperiments2["live-heap-profile"] = 11] = "live-heap-profile";
  DevtoolsExperiments2[DevtoolsExperiments2["protocol-monitor"] = 13] = "protocol-monitor";
  DevtoolsExperiments2[DevtoolsExperiments2["sampling-heap-profiler-timeline"] = 17] = "sampling-heap-profiler-timeline";
  DevtoolsExperiments2[DevtoolsExperiments2["show-option-tp-expose-internals-in-heap-snapshot"] = 18] = "show-option-tp-expose-internals-in-heap-snapshot";
  DevtoolsExperiments2[DevtoolsExperiments2["timeline-invalidation-tracking"] = 26] = "timeline-invalidation-tracking";
  DevtoolsExperiments2[DevtoolsExperiments2["timeline-show-all-events"] = 27] = "timeline-show-all-events";
  DevtoolsExperiments2[DevtoolsExperiments2["timeline-v8-runtime-call-stats"] = 28] = "timeline-v8-runtime-call-stats";
  DevtoolsExperiments2[DevtoolsExperiments2["apca"] = 39] = "apca";
  DevtoolsExperiments2[DevtoolsExperiments2["font-editor"] = 41] = "font-editor";
  DevtoolsExperiments2[DevtoolsExperiments2["full-accessibility-tree"] = 42] = "full-accessibility-tree";
  DevtoolsExperiments2[DevtoolsExperiments2["contrast-issues"] = 44] = "contrast-issues";
  DevtoolsExperiments2[DevtoolsExperiments2["experimental-cookie-features"] = 45] = "experimental-cookie-features";
  DevtoolsExperiments2[DevtoolsExperiments2["instrumentation-breakpoints"] = 61] = "instrumentation-breakpoints";
  DevtoolsExperiments2[DevtoolsExperiments2["authored-deployed-grouping"] = 63] = "authored-deployed-grouping";
  DevtoolsExperiments2[DevtoolsExperiments2["just-my-code"] = 65] = "just-my-code";
  DevtoolsExperiments2[DevtoolsExperiments2["use-source-map-scopes"] = 76] = "use-source-map-scopes";
  DevtoolsExperiments2[DevtoolsExperiments2["timeline-show-postmessage-events"] = 86] = "timeline-show-postmessage-events";
  DevtoolsExperiments2[DevtoolsExperiments2["timeline-debug-mode"] = 93] = "timeline-debug-mode";
  DevtoolsExperiments2[DevtoolsExperiments2["MAX_VALUE"] = 110] = "MAX_VALUE";
  return DevtoolsExperiments2;
})(DevtoolsExperiments || {});
export var IssueExpanded = /* @__PURE__ */ ((IssueExpanded2) => {
  IssueExpanded2[IssueExpanded2["CrossOriginEmbedderPolicy"] = 0] = "CrossOriginEmbedderPolicy";
  IssueExpanded2[IssueExpanded2["MixedContent"] = 1] = "MixedContent";
  IssueExpanded2[IssueExpanded2["SameSiteCookie"] = 2] = "SameSiteCookie";
  IssueExpanded2[IssueExpanded2["HeavyAd"] = 3] = "HeavyAd";
  IssueExpanded2[IssueExpanded2["ContentSecurityPolicy"] = 4] = "ContentSecurityPolicy";
  IssueExpanded2[IssueExpanded2["Other"] = 5] = "Other";
  IssueExpanded2[IssueExpanded2["Generic"] = 6] = "Generic";
  IssueExpanded2[IssueExpanded2["ThirdPartyPhaseoutCookie"] = 7] = "ThirdPartyPhaseoutCookie";
  IssueExpanded2[IssueExpanded2["GenericCookie"] = 8] = "GenericCookie";
  IssueExpanded2[IssueExpanded2["MAX_VALUE"] = 9] = "MAX_VALUE";
  return IssueExpanded2;
})(IssueExpanded || {});
export var IssueResourceOpened = /* @__PURE__ */ ((IssueResourceOpened2) => {
  IssueResourceOpened2[IssueResourceOpened2["CrossOriginEmbedderPolicyRequest"] = 0] = "CrossOriginEmbedderPolicyRequest";
  IssueResourceOpened2[IssueResourceOpened2["CrossOriginEmbedderPolicyElement"] = 1] = "CrossOriginEmbedderPolicyElement";
  IssueResourceOpened2[IssueResourceOpened2["MixedContentRequest"] = 2] = "MixedContentRequest";
  IssueResourceOpened2[IssueResourceOpened2["SameSiteCookieCookie"] = 3] = "SameSiteCookieCookie";
  IssueResourceOpened2[IssueResourceOpened2["SameSiteCookieRequest"] = 4] = "SameSiteCookieRequest";
  IssueResourceOpened2[IssueResourceOpened2["HeavyAdElement"] = 5] = "HeavyAdElement";
  IssueResourceOpened2[IssueResourceOpened2["ContentSecurityPolicyDirective"] = 6] = "ContentSecurityPolicyDirective";
  IssueResourceOpened2[IssueResourceOpened2["ContentSecurityPolicyElement"] = 7] = "ContentSecurityPolicyElement";
  IssueResourceOpened2[IssueResourceOpened2["MAX_VALUE"] = 13] = "MAX_VALUE";
  return IssueResourceOpened2;
})(IssueResourceOpened || {});
export var IssueCreated = /* @__PURE__ */ ((IssueCreated2) => {
  IssueCreated2[IssueCreated2["MixedContentIssue"] = 0] = "MixedContentIssue";
  IssueCreated2[IssueCreated2["ContentSecurityPolicyIssue::kInlineViolation"] = 1] = "ContentSecurityPolicyIssue::kInlineViolation";
  IssueCreated2[IssueCreated2["ContentSecurityPolicyIssue::kEvalViolation"] = 2] = "ContentSecurityPolicyIssue::kEvalViolation";
  IssueCreated2[IssueCreated2["ContentSecurityPolicyIssue::kURLViolation"] = 3] = "ContentSecurityPolicyIssue::kURLViolation";
  IssueCreated2[IssueCreated2["ContentSecurityPolicyIssue::kTrustedTypesSinkViolation"] = 4] = "ContentSecurityPolicyIssue::kTrustedTypesSinkViolation";
  IssueCreated2[IssueCreated2["ContentSecurityPolicyIssue::kTrustedTypesPolicyViolation"] = 5] = "ContentSecurityPolicyIssue::kTrustedTypesPolicyViolation";
  IssueCreated2[IssueCreated2["HeavyAdIssue::NetworkTotalLimit"] = 6] = "HeavyAdIssue::NetworkTotalLimit";
  IssueCreated2[IssueCreated2["HeavyAdIssue::CpuTotalLimit"] = 7] = "HeavyAdIssue::CpuTotalLimit";
  IssueCreated2[IssueCreated2["HeavyAdIssue::CpuPeakLimit"] = 8] = "HeavyAdIssue::CpuPeakLimit";
  IssueCreated2[IssueCreated2["CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader"] = 9] = "CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader";
  IssueCreated2[IssueCreated2["CrossOriginEmbedderPolicyIssue::CoopSandboxedIFrameCannotNavigateToCoopPage"] = 10] = "CrossOriginEmbedderPolicyIssue::CoopSandboxedIFrameCannotNavigateToCoopPage";
  IssueCreated2[IssueCreated2["CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin"] = 11] = "CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin";
  IssueCreated2[IssueCreated2["CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = 12] = "CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep";
  IssueCreated2[IssueCreated2["CrossOriginEmbedderPolicyIssue::CorpNotSameSite"] = 13] = "CrossOriginEmbedderPolicyIssue::CorpNotSameSite";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie"] = 14] = "CookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeSameSiteNoneInsecure::SetCookie"] = 15] = "CookieIssue::ExcludeSameSiteNoneInsecure::SetCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteNoneInsecure::ReadCookie"] = 16] = "CookieIssue::WarnSameSiteNoneInsecure::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteNoneInsecure::SetCookie"] = 17] = "CookieIssue::WarnSameSiteNoneInsecure::SetCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Secure"] = 18] = "CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Secure";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Insecure"] = 19] = "CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Insecure";
  IssueCreated2[IssueCreated2["CookieIssue::WarnCrossDowngrade::ReadCookie::Secure"] = 20] = "CookieIssue::WarnCrossDowngrade::ReadCookie::Secure";
  IssueCreated2[IssueCreated2["CookieIssue::WarnCrossDowngrade::ReadCookie::Insecure"] = 21] = "CookieIssue::WarnCrossDowngrade::ReadCookie::Insecure";
  IssueCreated2[IssueCreated2["CookieIssue::WarnCrossDowngrade::SetCookie::Secure"] = 22] = "CookieIssue::WarnCrossDowngrade::SetCookie::Secure";
  IssueCreated2[IssueCreated2["CookieIssue::WarnCrossDowngrade::SetCookie::Insecure"] = 23] = "CookieIssue::WarnCrossDowngrade::SetCookie::Insecure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeNavigationContextDowngrade::Secure"] = 24] = "CookieIssue::ExcludeNavigationContextDowngrade::Secure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeNavigationContextDowngrade::Insecure"] = 25] = "CookieIssue::ExcludeNavigationContextDowngrade::Insecure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeContextDowngrade::ReadCookie::Secure"] = 26] = "CookieIssue::ExcludeContextDowngrade::ReadCookie::Secure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeContextDowngrade::ReadCookie::Insecure"] = 27] = "CookieIssue::ExcludeContextDowngrade::ReadCookie::Insecure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeContextDowngrade::SetCookie::Secure"] = 28] = "CookieIssue::ExcludeContextDowngrade::SetCookie::Secure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeContextDowngrade::SetCookie::Insecure"] = 29] = "CookieIssue::ExcludeContextDowngrade::SetCookie::Insecure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie"] = 30] = "CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie"] = 31] = "CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie"] = 32] = "CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie"] = 33] = "CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie"] = 34] = "CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie"] = 35] = "CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie";
  IssueCreated2[IssueCreated2["SharedArrayBufferIssue::TransferIssue"] = 36] = "SharedArrayBufferIssue::TransferIssue";
  IssueCreated2[IssueCreated2["SharedArrayBufferIssue::CreationIssue"] = 37] = "SharedArrayBufferIssue::CreationIssue";
  IssueCreated2[IssueCreated2["LowTextContrastIssue"] = 41] = "LowTextContrastIssue";
  IssueCreated2[IssueCreated2["CorsIssue::InsecurePrivateNetwork"] = 42] = "CorsIssue::InsecurePrivateNetwork";
  IssueCreated2[IssueCreated2["CorsIssue::InvalidHeaders"] = 44] = "CorsIssue::InvalidHeaders";
  IssueCreated2[IssueCreated2["CorsIssue::WildcardOriginWithCredentials"] = 45] = "CorsIssue::WildcardOriginWithCredentials";
  IssueCreated2[IssueCreated2["CorsIssue::PreflightResponseInvalid"] = 46] = "CorsIssue::PreflightResponseInvalid";
  IssueCreated2[IssueCreated2["CorsIssue::OriginMismatch"] = 47] = "CorsIssue::OriginMismatch";
  IssueCreated2[IssueCreated2["CorsIssue::AllowCredentialsRequired"] = 48] = "CorsIssue::AllowCredentialsRequired";
  IssueCreated2[IssueCreated2["CorsIssue::MethodDisallowedByPreflightResponse"] = 49] = "CorsIssue::MethodDisallowedByPreflightResponse";
  IssueCreated2[IssueCreated2["CorsIssue::HeaderDisallowedByPreflightResponse"] = 50] = "CorsIssue::HeaderDisallowedByPreflightResponse";
  IssueCreated2[IssueCreated2["CorsIssue::RedirectContainsCredentials"] = 51] = "CorsIssue::RedirectContainsCredentials";
  IssueCreated2[IssueCreated2["CorsIssue::DisallowedByMode"] = 52] = "CorsIssue::DisallowedByMode";
  IssueCreated2[IssueCreated2["CorsIssue::CorsDisabledScheme"] = 53] = "CorsIssue::CorsDisabledScheme";
  IssueCreated2[IssueCreated2["CorsIssue::PreflightMissingAllowExternal"] = 54] = "CorsIssue::PreflightMissingAllowExternal";
  IssueCreated2[IssueCreated2["CorsIssue::PreflightInvalidAllowExternal"] = 55] = "CorsIssue::PreflightInvalidAllowExternal";
  IssueCreated2[IssueCreated2["CorsIssue::NoCorsRedirectModeNotFollow"] = 57] = "CorsIssue::NoCorsRedirectModeNotFollow";
  IssueCreated2[IssueCreated2["QuirksModeIssue::QuirksMode"] = 58] = "QuirksModeIssue::QuirksMode";
  IssueCreated2[IssueCreated2["QuirksModeIssue::LimitedQuirksMode"] = 59] = "QuirksModeIssue::LimitedQuirksMode";
  IssueCreated2[IssueCreated2["DeprecationIssue"] = 60] = "DeprecationIssue";
  IssueCreated2[IssueCreated2["ClientHintIssue::MetaTagAllowListInvalidOrigin"] = 61] = "ClientHintIssue::MetaTagAllowListInvalidOrigin";
  IssueCreated2[IssueCreated2["ClientHintIssue::MetaTagModifiedHTML"] = 62] = "ClientHintIssue::MetaTagModifiedHTML";
  IssueCreated2[IssueCreated2["CorsIssue::PreflightAllowPrivateNetworkError"] = 63] = "CorsIssue::PreflightAllowPrivateNetworkError";
  IssueCreated2[IssueCreated2["GenericIssue::CrossOriginPortalPostMessageError"] = 64] = "GenericIssue::CrossOriginPortalPostMessageError";
  IssueCreated2[IssueCreated2["GenericIssue::FormLabelForNameError"] = 65] = "GenericIssue::FormLabelForNameError";
  IssueCreated2[IssueCreated2["GenericIssue::FormDuplicateIdForInputError"] = 66] = "GenericIssue::FormDuplicateIdForInputError";
  IssueCreated2[IssueCreated2["GenericIssue::FormInputWithNoLabelError"] = 67] = "GenericIssue::FormInputWithNoLabelError";
  IssueCreated2[IssueCreated2["GenericIssue::FormAutocompleteAttributeEmptyError"] = 68] = "GenericIssue::FormAutocompleteAttributeEmptyError";
  IssueCreated2[IssueCreated2["GenericIssue::FormEmptyIdAndNameAttributesForInputError"] = 69] = "GenericIssue::FormEmptyIdAndNameAttributesForInputError";
  IssueCreated2[IssueCreated2["GenericIssue::FormAriaLabelledByToNonExistingId"] = 70] = "GenericIssue::FormAriaLabelledByToNonExistingId";
  IssueCreated2[IssueCreated2["GenericIssue::FormInputAssignedAutocompleteValueToIdOrNameAttributeError"] = 71] = "GenericIssue::FormInputAssignedAutocompleteValueToIdOrNameAttributeError";
  IssueCreated2[IssueCreated2["GenericIssue::FormLabelHasNeitherForNorNestedInput"] = 72] = "GenericIssue::FormLabelHasNeitherForNorNestedInput";
  IssueCreated2[IssueCreated2["GenericIssue::FormLabelForMatchesNonExistingIdError"] = 73] = "GenericIssue::FormLabelForMatchesNonExistingIdError";
  IssueCreated2[IssueCreated2["GenericIssue::FormHasPasswordFieldWithoutUsernameFieldError"] = 74] = "GenericIssue::FormHasPasswordFieldWithoutUsernameFieldError";
  IssueCreated2[IssueCreated2["GenericIssue::FormInputHasWrongButWellIntendedAutocompleteValueError"] = 75] = "GenericIssue::FormInputHasWrongButWellIntendedAutocompleteValueError";
  IssueCreated2[IssueCreated2["StylesheetLoadingIssue::LateImportRule"] = 76] = "StylesheetLoadingIssue::LateImportRule";
  IssueCreated2[IssueCreated2["StylesheetLoadingIssue::RequestFailed"] = 77] = "StylesheetLoadingIssue::RequestFailed";
  IssueCreated2[IssueCreated2["CorsIssue::PreflightMissingPrivateNetworkAccessId"] = 78] = "CorsIssue::PreflightMissingPrivateNetworkAccessId";
  IssueCreated2[IssueCreated2["CorsIssue::PreflightMissingPrivateNetworkAccessName"] = 79] = "CorsIssue::PreflightMissingPrivateNetworkAccessName";
  IssueCreated2[IssueCreated2["CorsIssue::PrivateNetworkAccessPermissionUnavailable"] = 80] = "CorsIssue::PrivateNetworkAccessPermissionUnavailable";
  IssueCreated2[IssueCreated2["CorsIssue::PrivateNetworkAccessPermissionDenied"] = 81] = "CorsIssue::PrivateNetworkAccessPermissionDenied";
  IssueCreated2[IssueCreated2["CookieIssue::WarnThirdPartyPhaseout::ReadCookie"] = 82] = "CookieIssue::WarnThirdPartyPhaseout::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnThirdPartyPhaseout::SetCookie"] = 83] = "CookieIssue::WarnThirdPartyPhaseout::SetCookie";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeThirdPartyPhaseout::ReadCookie"] = 84] = "CookieIssue::ExcludeThirdPartyPhaseout::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeThirdPartyPhaseout::SetCookie"] = 85] = "CookieIssue::ExcludeThirdPartyPhaseout::SetCookie";
  IssueCreated2[IssueCreated2["ElementAccessibilityIssue::DisallowedSelectChild"] = 86] = "ElementAccessibilityIssue::DisallowedSelectChild";
  IssueCreated2[IssueCreated2["ElementAccessibilityIssue::DisallowedOptGroupChild"] = 87] = "ElementAccessibilityIssue::DisallowedOptGroupChild";
  IssueCreated2[IssueCreated2["ElementAccessibilityIssue::NonPhrasingContentOptionChild"] = 88] = "ElementAccessibilityIssue::NonPhrasingContentOptionChild";
  IssueCreated2[IssueCreated2["ElementAccessibilityIssue::InteractiveContentOptionChild"] = 89] = "ElementAccessibilityIssue::InteractiveContentOptionChild";
  IssueCreated2[IssueCreated2["ElementAccessibilityIssue::InteractiveContentLegendChild"] = 90] = "ElementAccessibilityIssue::InteractiveContentLegendChild";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::MissingSignatureHeader"] = 91] = "SRIMessageSignatureIssue::MissingSignatureHeader";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::MissingSignatureInputHeader"] = 92] = "SRIMessageSignatureIssue::MissingSignatureInputHeader";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::InvalidSignatureHeader"] = 93] = "SRIMessageSignatureIssue::InvalidSignatureHeader";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::InvalidSignatureInputHeader"] = 94] = "SRIMessageSignatureIssue::InvalidSignatureInputHeader";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureHeaderValueIsNotByteSequence"] = 95] = "SRIMessageSignatureIssue::SignatureHeaderValueIsNotByteSequence";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureHeaderValueIsParameterized"] = 96] = "SRIMessageSignatureIssue::SignatureHeaderValueIsParameterized";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureHeaderValueIsIncorrectLength"] = 97] = "SRIMessageSignatureIssue::SignatureHeaderValueIsIncorrectLength";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderMissingLabel"] = 98] = "SRIMessageSignatureIssue::SignatureInputHeaderMissingLabel";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderValueNotInnerList"] = 99] = "SRIMessageSignatureIssue::SignatureInputHeaderValueNotInnerList";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderValueMissingComponents"] = 100] = "SRIMessageSignatureIssue::SignatureInputHeaderValueMissingComponents";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentType"] = 101] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentType";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentName"] = 102] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentName";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderInvalidHeaderComponentParameter"] = 103] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidHeaderComponentParameter";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderInvalidDerivedComponentParameter"] = 104] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidDerivedComponentParameter";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderKeyIdLength"] = 105] = "SRIMessageSignatureIssue::SignatureInputHeaderKeyIdLength";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderInvalidParameter"] = 106] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidParameter";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderMissingRequiredParameters"] = 107] = "SRIMessageSignatureIssue::SignatureInputHeaderMissingRequiredParameters";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::ValidationFailedSignatureExpired"] = 108] = "SRIMessageSignatureIssue::ValidationFailedSignatureExpired";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::ValidationFailedInvalidLength"] = 109] = "SRIMessageSignatureIssue::ValidationFailedInvalidLength";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::ValidationFailedSignatureMismatch"] = 110] = "SRIMessageSignatureIssue::ValidationFailedSignatureMismatch";
  IssueCreated2[IssueCreated2["CorsIssue::LocalNetworkAccessPermissionDenied"] = 111] = "CorsIssue::LocalNetworkAccessPermissionDenied";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::ValidationFailedIntegrityMismatch"] = 112] = "SRIMessageSignatureIssue::ValidationFailedIntegrityMismatch";
  IssueCreated2[IssueCreated2["ElementAccessibilityIssue::InteractiveContentSummaryDescendant"] = 113] = "ElementAccessibilityIssue::InteractiveContentSummaryDescendant";
  IssueCreated2[IssueCreated2["MAX_VALUE"] = 114] = "MAX_VALUE";
  return IssueCreated2;
})(IssueCreated || {});
export var DeveloperResourceLoaded = /* @__PURE__ */ ((DeveloperResourceLoaded2) => {
  DeveloperResourceLoaded2[DeveloperResourceLoaded2["LOAD_THROUGH_PAGE_VIA_TARGET"] = 0] = "LOAD_THROUGH_PAGE_VIA_TARGET";
  DeveloperResourceLoaded2[DeveloperResourceLoaded2["LOAD_THROUGH_PAGE_VIA_FRAME"] = 1] = "LOAD_THROUGH_PAGE_VIA_FRAME";
  DeveloperResourceLoaded2[DeveloperResourceLoaded2["LOAD_THROUGH_PAGE_FAILURE"] = 2] = "LOAD_THROUGH_PAGE_FAILURE";
  DeveloperResourceLoaded2[DeveloperResourceLoaded2["LOAD_THROUGH_PAGE_FALLBACK"] = 3] = "LOAD_THROUGH_PAGE_FALLBACK";
  DeveloperResourceLoaded2[DeveloperResourceLoaded2["FALLBACK_AFTER_FAILURE"] = 4] = "FALLBACK_AFTER_FAILURE";
  DeveloperResourceLoaded2[DeveloperResourceLoaded2["FALLBACK_PER_OVERRIDE"] = 5] = "FALLBACK_PER_OVERRIDE";
  DeveloperResourceLoaded2[DeveloperResourceLoaded2["FALLBACK_PER_PROTOCOL"] = 6] = "FALLBACK_PER_PROTOCOL";
  DeveloperResourceLoaded2[DeveloperResourceLoaded2["FALLBACK_FAILURE"] = 7] = "FALLBACK_FAILURE";
  DeveloperResourceLoaded2[DeveloperResourceLoaded2["MAX_VALUE"] = 8] = "MAX_VALUE";
  return DeveloperResourceLoaded2;
})(DeveloperResourceLoaded || {});
export var DeveloperResourceScheme = /* @__PURE__ */ ((DeveloperResourceScheme2) => {
  DeveloperResourceScheme2[DeveloperResourceScheme2["OTHER"] = 0] = "OTHER";
  DeveloperResourceScheme2[DeveloperResourceScheme2["UKNOWN"] = 1] = "UKNOWN";
  DeveloperResourceScheme2[DeveloperResourceScheme2["HTTP"] = 2] = "HTTP";
  DeveloperResourceScheme2[DeveloperResourceScheme2["HTTPS"] = 3] = "HTTPS";
  DeveloperResourceScheme2[DeveloperResourceScheme2["HTTP_LOCALHOST"] = 4] = "HTTP_LOCALHOST";
  DeveloperResourceScheme2[DeveloperResourceScheme2["HTTPS_LOCALHOST"] = 5] = "HTTPS_LOCALHOST";
  DeveloperResourceScheme2[DeveloperResourceScheme2["DATA"] = 6] = "DATA";
  DeveloperResourceScheme2[DeveloperResourceScheme2["FILE"] = 7] = "FILE";
  DeveloperResourceScheme2[DeveloperResourceScheme2["BLOB"] = 8] = "BLOB";
  DeveloperResourceScheme2[DeveloperResourceScheme2["MAX_VALUE"] = 9] = "MAX_VALUE";
  return DeveloperResourceScheme2;
})(DeveloperResourceScheme || {});
export var Language = /* @__PURE__ */ ((Language2) => {
  Language2[Language2["af"] = 1] = "af";
  Language2[Language2["am"] = 2] = "am";
  Language2[Language2["ar"] = 3] = "ar";
  Language2[Language2["as"] = 4] = "as";
  Language2[Language2["az"] = 5] = "az";
  Language2[Language2["be"] = 6] = "be";
  Language2[Language2["bg"] = 7] = "bg";
  Language2[Language2["bn"] = 8] = "bn";
  Language2[Language2["bs"] = 9] = "bs";
  Language2[Language2["ca"] = 10] = "ca";
  Language2[Language2["cs"] = 11] = "cs";
  Language2[Language2["cy"] = 12] = "cy";
  Language2[Language2["da"] = 13] = "da";
  Language2[Language2["de"] = 14] = "de";
  Language2[Language2["el"] = 15] = "el";
  Language2[Language2["en-GB"] = 16] = "en-GB";
  Language2[Language2["en-US"] = 17] = "en-US";
  Language2[Language2["es-419"] = 18] = "es-419";
  Language2[Language2["es"] = 19] = "es";
  Language2[Language2["et"] = 20] = "et";
  Language2[Language2["eu"] = 21] = "eu";
  Language2[Language2["fa"] = 22] = "fa";
  Language2[Language2["fi"] = 23] = "fi";
  Language2[Language2["fil"] = 24] = "fil";
  Language2[Language2["fr-CA"] = 25] = "fr-CA";
  Language2[Language2["fr"] = 26] = "fr";
  Language2[Language2["gl"] = 27] = "gl";
  Language2[Language2["gu"] = 28] = "gu";
  Language2[Language2["he"] = 29] = "he";
  Language2[Language2["hi"] = 30] = "hi";
  Language2[Language2["hr"] = 31] = "hr";
  Language2[Language2["hu"] = 32] = "hu";
  Language2[Language2["hy"] = 33] = "hy";
  Language2[Language2["id"] = 34] = "id";
  Language2[Language2["is"] = 35] = "is";
  Language2[Language2["it"] = 36] = "it";
  Language2[Language2["ja"] = 37] = "ja";
  Language2[Language2["ka"] = 38] = "ka";
  Language2[Language2["kk"] = 39] = "kk";
  Language2[Language2["km"] = 40] = "km";
  Language2[Language2["kn"] = 41] = "kn";
  Language2[Language2["ko"] = 42] = "ko";
  Language2[Language2["ky"] = 43] = "ky";
  Language2[Language2["lo"] = 44] = "lo";
  Language2[Language2["lt"] = 45] = "lt";
  Language2[Language2["lv"] = 46] = "lv";
  Language2[Language2["mk"] = 47] = "mk";
  Language2[Language2["ml"] = 48] = "ml";
  Language2[Language2["mn"] = 49] = "mn";
  Language2[Language2["mr"] = 50] = "mr";
  Language2[Language2["ms"] = 51] = "ms";
  Language2[Language2["my"] = 52] = "my";
  Language2[Language2["ne"] = 53] = "ne";
  Language2[Language2["nl"] = 54] = "nl";
  Language2[Language2["no"] = 55] = "no";
  Language2[Language2["or"] = 56] = "or";
  Language2[Language2["pa"] = 57] = "pa";
  Language2[Language2["pl"] = 58] = "pl";
  Language2[Language2["pt-PT"] = 59] = "pt-PT";
  Language2[Language2["pt"] = 60] = "pt";
  Language2[Language2["ro"] = 61] = "ro";
  Language2[Language2["ru"] = 62] = "ru";
  Language2[Language2["si"] = 63] = "si";
  Language2[Language2["sk"] = 64] = "sk";
  Language2[Language2["sl"] = 65] = "sl";
  Language2[Language2["sq"] = 66] = "sq";
  Language2[Language2["sr-Latn"] = 67] = "sr-Latn";
  Language2[Language2["sr"] = 68] = "sr";
  Language2[Language2["sv"] = 69] = "sv";
  Language2[Language2["sw"] = 70] = "sw";
  Language2[Language2["ta"] = 71] = "ta";
  Language2[Language2["te"] = 72] = "te";
  Language2[Language2["th"] = 73] = "th";
  Language2[Language2["tr"] = 74] = "tr";
  Language2[Language2["uk"] = 75] = "uk";
  Language2[Language2["ur"] = 76] = "ur";
  Language2[Language2["uz"] = 77] = "uz";
  Language2[Language2["vi"] = 78] = "vi";
  Language2[Language2["zh"] = 79] = "zh";
  Language2[Language2["zh-HK"] = 80] = "zh-HK";
  Language2[Language2["zh-TW"] = 81] = "zh-TW";
  Language2[Language2["zu"] = 82] = "zu";
  Language2[Language2["MAX_VALUE"] = 83] = "MAX_VALUE";
  return Language2;
})(Language || {});
export var SyncSetting = /* @__PURE__ */ ((SyncSetting2) => {
  SyncSetting2[SyncSetting2["CHROME_SYNC_DISABLED"] = 1] = "CHROME_SYNC_DISABLED";
  SyncSetting2[SyncSetting2["CHROME_SYNC_SETTINGS_DISABLED"] = 2] = "CHROME_SYNC_SETTINGS_DISABLED";
  SyncSetting2[SyncSetting2["DEVTOOLS_SYNC_SETTING_DISABLED"] = 3] = "DEVTOOLS_SYNC_SETTING_DISABLED";
  SyncSetting2[SyncSetting2["DEVTOOLS_SYNC_SETTING_ENABLED"] = 4] = "DEVTOOLS_SYNC_SETTING_ENABLED";
  SyncSetting2[SyncSetting2["MAX_VALUE"] = 5] = "MAX_VALUE";
  return SyncSetting2;
})(SyncSetting || {});
export var RecordingToggled = /* @__PURE__ */ ((RecordingToggled2) => {
  RecordingToggled2[RecordingToggled2["RECORDING_STARTED"] = 1] = "RECORDING_STARTED";
  RecordingToggled2[RecordingToggled2["RECORDING_FINISHED"] = 2] = "RECORDING_FINISHED";
  RecordingToggled2[RecordingToggled2["MAX_VALUE"] = 3] = "MAX_VALUE";
  return RecordingToggled2;
})(RecordingToggled || {});
export var RecordingAssertion = /* @__PURE__ */ ((RecordingAssertion2) => {
  RecordingAssertion2[RecordingAssertion2["ASSERTION_ADDED"] = 1] = "ASSERTION_ADDED";
  RecordingAssertion2[RecordingAssertion2["PROPERTY_ASSERTION_EDITED"] = 2] = "PROPERTY_ASSERTION_EDITED";
  RecordingAssertion2[RecordingAssertion2["ATTRIBUTE_ASSERTION_EDITED"] = 3] = "ATTRIBUTE_ASSERTION_EDITED";
  RecordingAssertion2[RecordingAssertion2["MAX_VALUE"] = 4] = "MAX_VALUE";
  return RecordingAssertion2;
})(RecordingAssertion || {});
export var RecordingReplayFinished = /* @__PURE__ */ ((RecordingReplayFinished2) => {
  RecordingReplayFinished2[RecordingReplayFinished2["SUCCESS"] = 1] = "SUCCESS";
  RecordingReplayFinished2[RecordingReplayFinished2["TIMEOUT_ERROR_SELECTORS"] = 2] = "TIMEOUT_ERROR_SELECTORS";
  RecordingReplayFinished2[RecordingReplayFinished2["TIMEOUT_ERROR_TARGET"] = 3] = "TIMEOUT_ERROR_TARGET";
  RecordingReplayFinished2[RecordingReplayFinished2["OTHER_ERROR"] = 4] = "OTHER_ERROR";
  RecordingReplayFinished2[RecordingReplayFinished2["MAX_VALUE"] = 5] = "MAX_VALUE";
  return RecordingReplayFinished2;
})(RecordingReplayFinished || {});
export var RecordingReplaySpeed = /* @__PURE__ */ ((RecordingReplaySpeed2) => {
  RecordingReplaySpeed2[RecordingReplaySpeed2["NORMAL"] = 1] = "NORMAL";
  RecordingReplaySpeed2[RecordingReplaySpeed2["SLOW"] = 2] = "SLOW";
  RecordingReplaySpeed2[RecordingReplaySpeed2["VERY_SLOW"] = 3] = "VERY_SLOW";
  RecordingReplaySpeed2[RecordingReplaySpeed2["EXTREMELY_SLOW"] = 4] = "EXTREMELY_SLOW";
  RecordingReplaySpeed2[RecordingReplaySpeed2["MAX_VALUE"] = 5] = "MAX_VALUE";
  return RecordingReplaySpeed2;
})(RecordingReplaySpeed || {});
export var RecordingReplayStarted = /* @__PURE__ */ ((RecordingReplayStarted2) => {
  RecordingReplayStarted2[RecordingReplayStarted2["REPLAY_ONLY"] = 1] = "REPLAY_ONLY";
  RecordingReplayStarted2[RecordingReplayStarted2["REPLAY_WITH_PERFORMANCE_TRACING"] = 2] = "REPLAY_WITH_PERFORMANCE_TRACING";
  RecordingReplayStarted2[RecordingReplayStarted2["REPLAY_VIA_EXTENSION"] = 3] = "REPLAY_VIA_EXTENSION";
  RecordingReplayStarted2[RecordingReplayStarted2["MAX_VALUE"] = 4] = "MAX_VALUE";
  return RecordingReplayStarted2;
})(RecordingReplayStarted || {});
export var RecordingEdited = /* @__PURE__ */ ((RecordingEdited2) => {
  RecordingEdited2[RecordingEdited2["SELECTOR_PICKER_USED"] = 1] = "SELECTOR_PICKER_USED";
  RecordingEdited2[RecordingEdited2["STEP_ADDED"] = 2] = "STEP_ADDED";
  RecordingEdited2[RecordingEdited2["STEP_REMOVED"] = 3] = "STEP_REMOVED";
  RecordingEdited2[RecordingEdited2["SELECTOR_ADDED"] = 4] = "SELECTOR_ADDED";
  RecordingEdited2[RecordingEdited2["SELECTOR_REMOVED"] = 5] = "SELECTOR_REMOVED";
  RecordingEdited2[RecordingEdited2["SELECTOR_PART_ADDED"] = 6] = "SELECTOR_PART_ADDED";
  RecordingEdited2[RecordingEdited2["SELECTOR_PART_EDITED"] = 7] = "SELECTOR_PART_EDITED";
  RecordingEdited2[RecordingEdited2["SELECTOR_PART_REMOVED"] = 8] = "SELECTOR_PART_REMOVED";
  RecordingEdited2[RecordingEdited2["TYPE_CHANGED"] = 9] = "TYPE_CHANGED";
  RecordingEdited2[RecordingEdited2["OTHER_EDITING"] = 10] = "OTHER_EDITING";
  RecordingEdited2[RecordingEdited2["MAX_VALUE"] = 11] = "MAX_VALUE";
  return RecordingEdited2;
})(RecordingEdited || {});
export var RecordingExported = /* @__PURE__ */ ((RecordingExported2) => {
  RecordingExported2[RecordingExported2["TO_PUPPETEER"] = 1] = "TO_PUPPETEER";
  RecordingExported2[RecordingExported2["TO_JSON"] = 2] = "TO_JSON";
  RecordingExported2[RecordingExported2["TO_PUPPETEER_REPLAY"] = 3] = "TO_PUPPETEER_REPLAY";
  RecordingExported2[RecordingExported2["TO_EXTENSION"] = 4] = "TO_EXTENSION";
  RecordingExported2[RecordingExported2["TO_LIGHTHOUSE"] = 5] = "TO_LIGHTHOUSE";
  RecordingExported2[RecordingExported2["MAX_VALUE"] = 6] = "MAX_VALUE";
  return RecordingExported2;
})(RecordingExported || {});
export var RecordingCodeToggled = /* @__PURE__ */ ((RecordingCodeToggled2) => {
  RecordingCodeToggled2[RecordingCodeToggled2["CODE_SHOWN"] = 1] = "CODE_SHOWN";
  RecordingCodeToggled2[RecordingCodeToggled2["CODE_HIDDEN"] = 2] = "CODE_HIDDEN";
  RecordingCodeToggled2[RecordingCodeToggled2["MAX_VALUE"] = 3] = "MAX_VALUE";
  return RecordingCodeToggled2;
})(RecordingCodeToggled || {});
export var RecordingCopiedToClipboard = /* @__PURE__ */ ((RecordingCopiedToClipboard2) => {
  RecordingCopiedToClipboard2[RecordingCopiedToClipboard2["COPIED_RECORDING_WITH_PUPPETEER"] = 1] = "COPIED_RECORDING_WITH_PUPPETEER";
  RecordingCopiedToClipboard2[RecordingCopiedToClipboard2["COPIED_RECORDING_WITH_JSON"] = 2] = "COPIED_RECORDING_WITH_JSON";
  RecordingCopiedToClipboard2[RecordingCopiedToClipboard2["COPIED_RECORDING_WITH_REPLAY"] = 3] = "COPIED_RECORDING_WITH_REPLAY";
  RecordingCopiedToClipboard2[RecordingCopiedToClipboard2["COPIED_RECORDING_WITH_EXTENSION"] = 4] = "COPIED_RECORDING_WITH_EXTENSION";
  RecordingCopiedToClipboard2[RecordingCopiedToClipboard2["COPIED_STEP_WITH_PUPPETEER"] = 5] = "COPIED_STEP_WITH_PUPPETEER";
  RecordingCopiedToClipboard2[RecordingCopiedToClipboard2["COPIED_STEP_WITH_JSON"] = 6] = "COPIED_STEP_WITH_JSON";
  RecordingCopiedToClipboard2[RecordingCopiedToClipboard2["COPIED_STEP_WITH_REPLAY"] = 7] = "COPIED_STEP_WITH_REPLAY";
  RecordingCopiedToClipboard2[RecordingCopiedToClipboard2["COPIED_STEP_WITH_EXTENSION"] = 8] = "COPIED_STEP_WITH_EXTENSION";
  RecordingCopiedToClipboard2[RecordingCopiedToClipboard2["MAX_VALUE"] = 9] = "MAX_VALUE";
  return RecordingCopiedToClipboard2;
})(RecordingCopiedToClipboard || {});
export var ManifestSectionCodes = /* @__PURE__ */ ((ManifestSectionCodes2) => {
  ManifestSectionCodes2[ManifestSectionCodes2["OtherSection"] = 0] = "OtherSection";
  ManifestSectionCodes2[ManifestSectionCodes2["Identity"] = 1] = "Identity";
  ManifestSectionCodes2[ManifestSectionCodes2["Presentation"] = 2] = "Presentation";
  ManifestSectionCodes2[ManifestSectionCodes2["Protocol Handlers"] = 3] = "Protocol Handlers";
  ManifestSectionCodes2[ManifestSectionCodes2["Icons"] = 4] = "Icons";
  ManifestSectionCodes2[ManifestSectionCodes2["Window Controls Overlay"] = 5] = "Window Controls Overlay";
  ManifestSectionCodes2[ManifestSectionCodes2["MAX_VALUE"] = 6] = "MAX_VALUE";
  return ManifestSectionCodes2;
})(ManifestSectionCodes || {});
export var LighthouseModeRun = /* @__PURE__ */ ((LighthouseModeRun2) => {
  LighthouseModeRun2[LighthouseModeRun2["NAVIGATION"] = 0] = "NAVIGATION";
  LighthouseModeRun2[LighthouseModeRun2["TIMESPAN"] = 1] = "TIMESPAN";
  LighthouseModeRun2[LighthouseModeRun2["SNAPSHOT"] = 2] = "SNAPSHOT";
  LighthouseModeRun2[LighthouseModeRun2["LEGACY_NAVIGATION"] = 3] = "LEGACY_NAVIGATION";
  LighthouseModeRun2[LighthouseModeRun2["MAX_VALUE"] = 4] = "MAX_VALUE";
  return LighthouseModeRun2;
})(LighthouseModeRun || {});
export var LighthouseCategoryUsed = /* @__PURE__ */ ((LighthouseCategoryUsed2) => {
  LighthouseCategoryUsed2[LighthouseCategoryUsed2["PERFORMANCE"] = 0] = "PERFORMANCE";
  LighthouseCategoryUsed2[LighthouseCategoryUsed2["ACCESSIBILITY"] = 1] = "ACCESSIBILITY";
  LighthouseCategoryUsed2[LighthouseCategoryUsed2["BEST_PRACTICES"] = 2] = "BEST_PRACTICES";
  LighthouseCategoryUsed2[LighthouseCategoryUsed2["SEO"] = 3] = "SEO";
  LighthouseCategoryUsed2[LighthouseCategoryUsed2["PWA"] = 4] = "PWA";
  LighthouseCategoryUsed2[LighthouseCategoryUsed2["PUB_ADS"] = 5] = "PUB_ADS";
  LighthouseCategoryUsed2[LighthouseCategoryUsed2["MAX_VALUE"] = 6] = "MAX_VALUE";
  return LighthouseCategoryUsed2;
})(LighthouseCategoryUsed || {});
export var SwatchType = /* @__PURE__ */ ((SwatchType2) => {
  SwatchType2[SwatchType2["VAR_LINK"] = 0] = "VAR_LINK";
  SwatchType2[SwatchType2["ANIMATION_NAME_LINK"] = 1] = "ANIMATION_NAME_LINK";
  SwatchType2[SwatchType2["COLOR"] = 2] = "COLOR";
  SwatchType2[SwatchType2["ANIMATION_TIMING"] = 3] = "ANIMATION_TIMING";
  SwatchType2[SwatchType2["SHADOW"] = 4] = "SHADOW";
  SwatchType2[SwatchType2["GRID"] = 5] = "GRID";
  SwatchType2[SwatchType2["FLEX"] = 6] = "FLEX";
  SwatchType2[SwatchType2["ANGLE"] = 7] = "ANGLE";
  SwatchType2[SwatchType2["LENGTH"] = 8] = "LENGTH";
  SwatchType2[SwatchType2["POSITION_TRY_LINK"] = 10] = "POSITION_TRY_LINK";
  SwatchType2[SwatchType2["ATTR_LINK"] = 11] = "ATTR_LINK";
  SwatchType2[SwatchType2["MASONRY"] = 12] = "MASONRY";
  SwatchType2[SwatchType2["MAX_VALUE"] = 13] = "MAX_VALUE";
  return SwatchType2;
})(SwatchType || {});
export var BadgeType = /* @__PURE__ */ ((BadgeType2) => {
  BadgeType2[BadgeType2["GRID"] = 0] = "GRID";
  BadgeType2[BadgeType2["SUBGRID"] = 1] = "SUBGRID";
  BadgeType2[BadgeType2["FLEX"] = 2] = "FLEX";
  BadgeType2[BadgeType2["AD"] = 3] = "AD";
  BadgeType2[BadgeType2["SCROLL_SNAP"] = 4] = "SCROLL_SNAP";
  BadgeType2[BadgeType2["CONTAINER"] = 5] = "CONTAINER";
  BadgeType2[BadgeType2["SLOT"] = 6] = "SLOT";
  BadgeType2[BadgeType2["TOP_LAYER"] = 7] = "TOP_LAYER";
  BadgeType2[BadgeType2["REVEAL"] = 8] = "REVEAL";
  BadgeType2[BadgeType2["MAX_VALUE"] = 9] = "MAX_VALUE";
  return BadgeType2;
})(BadgeType || {});
export var AnimationsPlaybackRate = /* @__PURE__ */ ((AnimationsPlaybackRate2) => {
  AnimationsPlaybackRate2[AnimationsPlaybackRate2["PERCENT_100"] = 0] = "PERCENT_100";
  AnimationsPlaybackRate2[AnimationsPlaybackRate2["PERCENT_25"] = 1] = "PERCENT_25";
  AnimationsPlaybackRate2[AnimationsPlaybackRate2["PERCENT_10"] = 2] = "PERCENT_10";
  AnimationsPlaybackRate2[AnimationsPlaybackRate2["OTHER"] = 3] = "OTHER";
  AnimationsPlaybackRate2[AnimationsPlaybackRate2["MAX_VALUE"] = 4] = "MAX_VALUE";
  return AnimationsPlaybackRate2;
})(AnimationsPlaybackRate || {});
export var TimelineNavigationSetting = /* @__PURE__ */ ((TimelineNavigationSetting2) => {
  TimelineNavigationSetting2[TimelineNavigationSetting2["CLASSIC_AT_SESSION_FIRST_TRACE"] = 0] = "CLASSIC_AT_SESSION_FIRST_TRACE";
  TimelineNavigationSetting2[TimelineNavigationSetting2["MODERN_AT_SESSION_FIRST_TRACE"] = 1] = "MODERN_AT_SESSION_FIRST_TRACE";
  TimelineNavigationSetting2[TimelineNavigationSetting2["SWITCHED_TO_CLASSIC"] = 2] = "SWITCHED_TO_CLASSIC";
  TimelineNavigationSetting2[TimelineNavigationSetting2["SWITCHED_TO_MODERN"] = 3] = "SWITCHED_TO_MODERN";
  TimelineNavigationSetting2[TimelineNavigationSetting2["MAX_VALUE"] = 4] = "MAX_VALUE";
  return TimelineNavigationSetting2;
})(TimelineNavigationSetting || {});
export var BuiltInAiAvailability = /* @__PURE__ */ ((BuiltInAiAvailability2) => {
  BuiltInAiAvailability2[BuiltInAiAvailability2["UNAVAILABLE_HAS_GPU"] = 0] = "UNAVAILABLE_HAS_GPU";
  BuiltInAiAvailability2[BuiltInAiAvailability2["DOWNLOADABLE_HAS_GPU"] = 1] = "DOWNLOADABLE_HAS_GPU";
  BuiltInAiAvailability2[BuiltInAiAvailability2["DOWNLOADING_HAS_GPU"] = 2] = "DOWNLOADING_HAS_GPU";
  BuiltInAiAvailability2[BuiltInAiAvailability2["AVAILABLE_HAS_GPU"] = 3] = "AVAILABLE_HAS_GPU";
  BuiltInAiAvailability2[BuiltInAiAvailability2["DISABLED_HAS_GPU"] = 4] = "DISABLED_HAS_GPU";
  BuiltInAiAvailability2[BuiltInAiAvailability2["UNAVAILABLE_NO_GPU"] = 5] = "UNAVAILABLE_NO_GPU";
  BuiltInAiAvailability2[BuiltInAiAvailability2["DOWNLOADABLE_NO_GPU"] = 6] = "DOWNLOADABLE_NO_GPU";
  BuiltInAiAvailability2[BuiltInAiAvailability2["DOWNLOADING_NO_GPU"] = 7] = "DOWNLOADING_NO_GPU";
  BuiltInAiAvailability2[BuiltInAiAvailability2["AVAILABLE_NO_GPU"] = 8] = "AVAILABLE_NO_GPU";
  BuiltInAiAvailability2[BuiltInAiAvailability2["DISABLED_NO_GPU"] = 9] = "DISABLED_NO_GPU";
  BuiltInAiAvailability2[BuiltInAiAvailability2["MAX_VALUE"] = 10] = "MAX_VALUE";
  return BuiltInAiAvailability2;
})(BuiltInAiAvailability || {});
//# sourceMappingURL=UserMetrics.js.map
