// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { InspectorFrontendHostInstance } from './InspectorFrontendHost.js';
export class UserMetrics {
    #panelChangedSinceLaunch;
    #firedLaunchHistogram;
    #launchPanelName;
    constructor() {
        this.#panelChangedSinceLaunch = false;
        this.#firedLaunchHistogram = false;
        this.#launchPanelName = '';
    }
    panelShown(panelName, isLaunching) {
        const code = PanelCodes[panelName] || 0;
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.PanelShown" /* EnumeratedHistogram.PanelShown */, code, PanelCodes.MAX_VALUE);
        InspectorFrontendHostInstance.recordUserMetricsAction('DevTools_PanelShown_' + panelName);
        // Store that the user has changed the panel so we know launch histograms should not be fired.
        if (!isLaunching) {
            this.#panelChangedSinceLaunch = true;
        }
    }
    settingsPanelShown(settingsViewId) {
        this.panelShown('settings-' + settingsViewId);
    }
    sourcesPanelFileDebugged(mediaType) {
        const code = (mediaType && MediaTypes[mediaType]) || MediaTypes.Unknown;
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.SourcesPanelFileDebugged" /* EnumeratedHistogram.SourcesPanelFileDebugged */, code, MediaTypes.MAX_VALUE);
    }
    sourcesPanelFileOpened(mediaType) {
        const code = (mediaType && MediaTypes[mediaType]) || MediaTypes.Unknown;
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.SourcesPanelFileOpened" /* EnumeratedHistogram.SourcesPanelFileOpened */, code, MediaTypes.MAX_VALUE);
    }
    networkPanelResponsePreviewOpened(mediaType) {
        const code = (mediaType && MediaTypes[mediaType]) || MediaTypes.Unknown;
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.NetworkPanelResponsePreviewOpened" /* EnumeratedHistogram.NetworkPanelResponsePreviewOpened */, code, MediaTypes.MAX_VALUE);
    }
    actionTaken(action) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.ActionTaken" /* EnumeratedHistogram.ActionTaken */, action, Action.MAX_VALUE);
    }
    panelLoaded(panelName, histogramName) {
        if (this.#firedLaunchHistogram || panelName !== this.#launchPanelName) {
            return;
        }
        this.#firedLaunchHistogram = true;
        // Use rAF and window.setTimeout to ensure the marker is fired after layout and rendering.
        // This will give the most accurate representation of the tool being ready for a user.
        requestAnimationFrame(() => {
            window.setTimeout(() => {
                // Mark the load time so that we can pinpoint it more easily in a trace.
                performance.mark(histogramName);
                // If the user has switched panel before we finished loading, ignore the histogram,
                // since the launch timings will have been affected and are no longer valid.
                if (this.#panelChangedSinceLaunch) {
                    return;
                }
                // This fires the event for the appropriate launch histogram.
                // The duration is measured as the time elapsed since the time origin of the document.
                InspectorFrontendHostInstance.recordPerformanceHistogram(histogramName, performance.now());
            }, 0);
        });
    }
    setLaunchPanel(panelName) {
        this.#launchPanelName = panelName;
    }
    performanceTraceLoad(measure) {
        InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.TraceLoad', measure.duration);
    }
    keybindSetSettingChanged(keybindSet) {
        const value = KeybindSetSettings[keybindSet] || 0;
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.KeybindSetSettingChanged" /* EnumeratedHistogram.KeybindSetSettingChanged */, value, KeybindSetSettings.MAX_VALUE);
    }
    keyboardShortcutFired(actionId) {
        const action = KeyboardShortcutAction[actionId] || KeyboardShortcutAction.OtherShortcut;
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.KeyboardShortcutFired" /* EnumeratedHistogram.KeyboardShortcutFired */, action, KeyboardShortcutAction.MAX_VALUE);
    }
    issuesPanelOpenedFrom(issueOpener) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.IssuesPanelOpenedFrom" /* EnumeratedHistogram.IssuesPanelOpenedFrom */, issueOpener, 6 /* IssueOpener.MAX_VALUE */);
    }
    issuesPanelIssueExpanded(issueExpandedCategory) {
        if (issueExpandedCategory === undefined) {
            return;
        }
        const issueExpanded = IssueExpanded[issueExpandedCategory];
        if (issueExpanded === undefined) {
            return;
        }
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.IssuesPanelIssueExpanded" /* EnumeratedHistogram.IssuesPanelIssueExpanded */, issueExpanded, IssueExpanded.MAX_VALUE);
    }
    issuesPanelResourceOpened(issueCategory, type) {
        const key = issueCategory + type;
        const value = IssueResourceOpened[key];
        if (value === undefined) {
            return;
        }
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.IssuesPanelResourceOpened" /* EnumeratedHistogram.IssuesPanelResourceOpened */, value, IssueResourceOpened.MAX_VALUE);
    }
    issueCreated(code) {
        const issueCreated = IssueCreated[code];
        if (issueCreated === undefined) {
            return;
        }
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.IssueCreated" /* EnumeratedHistogram.IssueCreated */, issueCreated, IssueCreated.MAX_VALUE);
    }
    experimentEnabledAtLaunch(experimentId) {
        const experiment = DevtoolsExperiments[experimentId];
        if (experiment === undefined) {
            return;
        }
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.ExperimentEnabledAtLaunch" /* EnumeratedHistogram.ExperimentEnabledAtLaunch */, experiment, DevtoolsExperiments.MAX_VALUE);
    }
    navigationSettingAtFirstTimelineLoad(state) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.TimelineNavigationSettingState" /* EnumeratedHistogram.TimelineNavigationSettingState */, state, 4 /* TimelineNavigationSetting.MAX_VALUE */);
    }
    experimentDisabledAtLaunch(experimentId) {
        const experiment = DevtoolsExperiments[experimentId];
        if (experiment === undefined) {
            return;
        }
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.ExperimentDisabledAtLaunch" /* EnumeratedHistogram.ExperimentDisabledAtLaunch */, experiment, DevtoolsExperiments.MAX_VALUE);
    }
    experimentChanged(experimentId, isEnabled) {
        const experiment = DevtoolsExperiments[experimentId];
        if (experiment === undefined) {
            return;
        }
        const actionName = isEnabled ? "DevTools.ExperimentEnabled" /* EnumeratedHistogram.ExperimentEnabled */ : "DevTools.ExperimentDisabled" /* EnumeratedHistogram.ExperimentDisabled */;
        InspectorFrontendHostInstance.recordEnumeratedHistogram(actionName, experiment, DevtoolsExperiments.MAX_VALUE);
    }
    developerResourceLoaded(developerResourceLoaded) {
        if (developerResourceLoaded >= 8 /* DeveloperResourceLoaded.MAX_VALUE */) {
            return;
        }
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.DeveloperResourceLoaded" /* EnumeratedHistogram.DeveloperResourceLoaded */, developerResourceLoaded, 8 /* DeveloperResourceLoaded.MAX_VALUE */);
    }
    developerResourceScheme(developerResourceScheme) {
        if (developerResourceScheme >= 9 /* DeveloperResourceScheme.MAX_VALUE */) {
            return;
        }
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.DeveloperResourceScheme" /* EnumeratedHistogram.DeveloperResourceScheme */, developerResourceScheme, 9 /* DeveloperResourceScheme.MAX_VALUE */);
    }
    language(language) {
        const languageCode = Language[language];
        if (languageCode === undefined) {
            return;
        }
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.Language" /* EnumeratedHistogram.Language */, languageCode, Language.MAX_VALUE);
    }
    syncSetting(devtoolsSyncSettingEnabled) {
        InspectorFrontendHostInstance.getSyncInformation(syncInfo => {
            let settingValue = 1 /* SyncSetting.CHROME_SYNC_DISABLED */;
            if (syncInfo.isSyncActive && !syncInfo.arePreferencesSynced) {
                settingValue = 2 /* SyncSetting.CHROME_SYNC_SETTINGS_DISABLED */;
            }
            else if (syncInfo.isSyncActive && syncInfo.arePreferencesSynced) {
                settingValue = devtoolsSyncSettingEnabled ? 4 /* SyncSetting.DEVTOOLS_SYNC_SETTING_ENABLED */ :
                    3 /* SyncSetting.DEVTOOLS_SYNC_SETTING_DISABLED */;
            }
            InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.SyncSetting" /* EnumeratedHistogram.SyncSetting */, settingValue, 5 /* SyncSetting.MAX_VALUE */);
        });
    }
    recordingAssertion(value) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingAssertion" /* EnumeratedHistogram.RecordingAssertion */, value, 4 /* RecordingAssertion.MAX_VALUE */);
    }
    recordingToggled(value) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingToggled" /* EnumeratedHistogram.RecordingToggled */, value, 3 /* RecordingToggled.MAX_VALUE */);
    }
    recordingReplayFinished(value) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingReplayFinished" /* EnumeratedHistogram.RecordingReplayFinished */, value, 5 /* RecordingReplayFinished.MAX_VALUE */);
    }
    recordingReplaySpeed(value) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingReplaySpeed" /* EnumeratedHistogram.RecordingReplaySpeed */, value, 5 /* RecordingReplaySpeed.MAX_VALUE */);
    }
    recordingReplayStarted(value) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingReplayStarted" /* EnumeratedHistogram.RecordingReplayStarted */, value, 4 /* RecordingReplayStarted.MAX_VALUE */);
    }
    recordingEdited(value) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingEdited" /* EnumeratedHistogram.RecordingEdited */, value, 11 /* RecordingEdited.MAX_VALUE */);
    }
    recordingExported(value) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingExported" /* EnumeratedHistogram.RecordingExported */, value, 6 /* RecordingExported.MAX_VALUE */);
    }
    recordingCodeToggled(value) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingCodeToggled" /* EnumeratedHistogram.RecordingCodeToggled */, value, 3 /* RecordingCodeToggled.MAX_VALUE */);
    }
    recordingCopiedToClipboard(value) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingCopiedToClipboard" /* EnumeratedHistogram.RecordingCopiedToClipboard */, value, 9 /* RecordingCopiedToClipboard.MAX_VALUE */);
    }
    lighthouseModeRun(type) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.LighthouseModeRun" /* EnumeratedHistogram.LighthouseModeRun */, type, 4 /* LighthouseModeRun.MAX_VALUE */);
    }
    lighthouseCategoryUsed(type) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.LighthouseCategoryUsed" /* EnumeratedHistogram.LighthouseCategoryUsed */, type, 6 /* LighthouseCategoryUsed.MAX_VALUE */);
    }
    swatchActivated(swatch) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.SwatchActivated" /* EnumeratedHistogram.SwatchActivated */, swatch, 13 /* SwatchType.MAX_VALUE */);
    }
    workspacesPopulated(wallClockTimeInMilliseconds) {
        InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.Workspaces.PopulateWallClocktime', wallClockTimeInMilliseconds);
    }
    visualLoggingProcessingDone(timeInMilliseconds) {
        InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.VisualLogging.ProcessingTime', timeInMilliseconds);
    }
    freestylerQueryLength(numberOfCharacters) {
        InspectorFrontendHostInstance.recordCountHistogram('DevTools.Freestyler.QueryLength', numberOfCharacters, 0, 100_000, 100);
    }
    freestylerEvalResponseSize(bytes) {
        InspectorFrontendHostInstance.recordCountHistogram('DevTools.Freestyler.EvalResponseSize', bytes, 0, 100_000, 100);
    }
    performanceAINetworkSummaryResponseSize(bytes) {
        InspectorFrontendHostInstance.recordCountHistogram('DevTools.PerformanceAI.NetworkSummaryResponseSize', bytes, 0, 100_000, 100);
    }
    performanceAINetworkRequestDetailResponseSize(bytes) {
        InspectorFrontendHostInstance.recordCountHistogram('DevTools.PerformanceAI.NetworkRequestDetailResponseSize', bytes, 0, 100_000, 100);
    }
    performanceAIMainThreadActivityResponseSize(bytes) {
        InspectorFrontendHostInstance.recordCountHistogram('DevTools.PerformanceAI.MainThreadActivityResponseSize', bytes, 0, 100_000, 100);
    }
    builtInAiAvailability(availability) {
        InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.BuiltInAiAvailability" /* EnumeratedHistogram.BuiltInAiAvailability */, availability, 10 /* BuiltInAiAvailability.MAX_VALUE */);
    }
    consoleInsightTeaserGenerated(timeInMilliseconds) {
        InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.Insights.TeaserGenerationTime', timeInMilliseconds);
    }
    consoleInsightTeaserFirstChunkGenerated(timeInMilliseconds) {
        InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.Insights.TeaserFirstChunkGenerationTime', timeInMilliseconds);
    }
}
/**
 * The numeric enum values are not necessarily continuous! It is possible that
 * values have been removed, which results in gaps in the sequence of values.
 * When adding a new value:
 * 1. Add an entry to the bottom of the enum before 'MAX_VALUE'.
 * 2. Set the value of the new entry to the current value of 'MAX_VALUE'.
 * 2. Increment the value of 'MAX_VALUE' by 1.
 * When removing a value which is no longer needed:
 * 1. Delete the line with the unneeded value
 * 2. Do not update any 'MAX_VALUE' or any other value.
 */
/**
 * Codes below are used to collect UMA histograms in the Chromium port.
 * Do not change the values below, additional actions are needed on the Chromium side
 * in order to add more codes.
 **/
export var Action;
(function (Action) {
    /* eslint-disable @typescript-eslint/naming-convention */
    Action[Action["WindowDocked"] = 1] = "WindowDocked";
    Action[Action["WindowUndocked"] = 2] = "WindowUndocked";
    Action[Action["ScriptsBreakpointSet"] = 3] = "ScriptsBreakpointSet";
    Action[Action["TimelineStarted"] = 4] = "TimelineStarted";
    Action[Action["ProfilesCPUProfileTaken"] = 5] = "ProfilesCPUProfileTaken";
    Action[Action["ProfilesHeapProfileTaken"] = 6] = "ProfilesHeapProfileTaken";
    Action[Action["ConsoleEvaluated"] = 8] = "ConsoleEvaluated";
    Action[Action["FileSavedInWorkspace"] = 9] = "FileSavedInWorkspace";
    Action[Action["DeviceModeEnabled"] = 10] = "DeviceModeEnabled";
    Action[Action["AnimationsPlaybackRateChanged"] = 11] = "AnimationsPlaybackRateChanged";
    Action[Action["RevisionApplied"] = 12] = "RevisionApplied";
    Action[Action["FileSystemDirectoryContentReceived"] = 13] = "FileSystemDirectoryContentReceived";
    Action[Action["StyleRuleEdited"] = 14] = "StyleRuleEdited";
    Action[Action["CommandEvaluatedInConsolePanel"] = 15] = "CommandEvaluatedInConsolePanel";
    Action[Action["DOMPropertiesExpanded"] = 16] = "DOMPropertiesExpanded";
    Action[Action["ResizedViewInResponsiveMode"] = 17] = "ResizedViewInResponsiveMode";
    Action[Action["TimelinePageReloadStarted"] = 18] = "TimelinePageReloadStarted";
    Action[Action["ConnectToNodeJSFromFrontend"] = 19] = "ConnectToNodeJSFromFrontend";
    Action[Action["ConnectToNodeJSDirectly"] = 20] = "ConnectToNodeJSDirectly";
    Action[Action["CpuThrottlingEnabled"] = 21] = "CpuThrottlingEnabled";
    Action[Action["CpuProfileNodeFocused"] = 22] = "CpuProfileNodeFocused";
    Action[Action["CpuProfileNodeExcluded"] = 23] = "CpuProfileNodeExcluded";
    Action[Action["SelectFileFromFilePicker"] = 24] = "SelectFileFromFilePicker";
    Action[Action["SelectCommandFromCommandMenu"] = 25] = "SelectCommandFromCommandMenu";
    Action[Action["ChangeInspectedNodeInElementsPanel"] = 26] = "ChangeInspectedNodeInElementsPanel";
    Action[Action["StyleRuleCopied"] = 27] = "StyleRuleCopied";
    Action[Action["CoverageStarted"] = 28] = "CoverageStarted";
    Action[Action["LighthouseStarted"] = 29] = "LighthouseStarted";
    Action[Action["LighthouseFinished"] = 30] = "LighthouseFinished";
    Action[Action["ShowedThirdPartyBadges"] = 31] = "ShowedThirdPartyBadges";
    Action[Action["LighthouseViewTrace"] = 32] = "LighthouseViewTrace";
    Action[Action["FilmStripStartedRecording"] = 33] = "FilmStripStartedRecording";
    Action[Action["CoverageReportFiltered"] = 34] = "CoverageReportFiltered";
    Action[Action["CoverageStartedPerBlock"] = 35] = "CoverageStartedPerBlock";
    Action[Action["SettingsOpenedFromGear-deprecated"] = 36] = "SettingsOpenedFromGear-deprecated";
    Action[Action["SettingsOpenedFromMenu-deprecated"] = 37] = "SettingsOpenedFromMenu-deprecated";
    Action[Action["SettingsOpenedFromCommandMenu-deprecated"] = 38] = "SettingsOpenedFromCommandMenu-deprecated";
    Action[Action["TabMovedToDrawer"] = 39] = "TabMovedToDrawer";
    Action[Action["TabMovedToMainPanel"] = 40] = "TabMovedToMainPanel";
    Action[Action["CaptureCssOverviewClicked"] = 41] = "CaptureCssOverviewClicked";
    Action[Action["VirtualAuthenticatorEnvironmentEnabled"] = 42] = "VirtualAuthenticatorEnvironmentEnabled";
    Action[Action["SourceOrderViewActivated"] = 43] = "SourceOrderViewActivated";
    Action[Action["UserShortcutAdded"] = 44] = "UserShortcutAdded";
    Action[Action["ShortcutRemoved"] = 45] = "ShortcutRemoved";
    Action[Action["ShortcutModified"] = 46] = "ShortcutModified";
    Action[Action["CustomPropertyLinkClicked"] = 47] = "CustomPropertyLinkClicked";
    Action[Action["CustomPropertyEdited"] = 48] = "CustomPropertyEdited";
    Action[Action["ServiceWorkerNetworkRequestClicked"] = 49] = "ServiceWorkerNetworkRequestClicked";
    Action[Action["ServiceWorkerNetworkRequestClosedQuickly"] = 50] = "ServiceWorkerNetworkRequestClosedQuickly";
    Action[Action["NetworkPanelServiceWorkerRespondWith"] = 51] = "NetworkPanelServiceWorkerRespondWith";
    Action[Action["NetworkPanelCopyValue"] = 52] = "NetworkPanelCopyValue";
    Action[Action["ConsoleSidebarOpened"] = 53] = "ConsoleSidebarOpened";
    Action[Action["PerfPanelTraceImported"] = 54] = "PerfPanelTraceImported";
    Action[Action["PerfPanelTraceExported"] = 55] = "PerfPanelTraceExported";
    Action[Action["StackFrameRestarted"] = 56] = "StackFrameRestarted";
    Action[Action["CaptureTestProtocolClicked"] = 57] = "CaptureTestProtocolClicked";
    Action[Action["BreakpointRemovedFromRemoveButton"] = 58] = "BreakpointRemovedFromRemoveButton";
    Action[Action["BreakpointGroupExpandedStateChanged"] = 59] = "BreakpointGroupExpandedStateChanged";
    Action[Action["HeaderOverrideFileCreated"] = 60] = "HeaderOverrideFileCreated";
    Action[Action["HeaderOverrideEnableEditingClicked"] = 61] = "HeaderOverrideEnableEditingClicked";
    Action[Action["HeaderOverrideHeaderAdded"] = 62] = "HeaderOverrideHeaderAdded";
    Action[Action["HeaderOverrideHeaderEdited"] = 63] = "HeaderOverrideHeaderEdited";
    Action[Action["HeaderOverrideHeaderRemoved"] = 64] = "HeaderOverrideHeaderRemoved";
    Action[Action["HeaderOverrideHeadersFileEdited"] = 65] = "HeaderOverrideHeadersFileEdited";
    Action[Action["PersistenceNetworkOverridesEnabled"] = 66] = "PersistenceNetworkOverridesEnabled";
    Action[Action["PersistenceNetworkOverridesDisabled"] = 67] = "PersistenceNetworkOverridesDisabled";
    Action[Action["BreakpointRemovedFromContextMenu"] = 68] = "BreakpointRemovedFromContextMenu";
    Action[Action["BreakpointsInFileRemovedFromRemoveButton"] = 69] = "BreakpointsInFileRemovedFromRemoveButton";
    Action[Action["BreakpointsInFileRemovedFromContextMenu"] = 70] = "BreakpointsInFileRemovedFromContextMenu";
    Action[Action["BreakpointsInFileCheckboxToggled"] = 71] = "BreakpointsInFileCheckboxToggled";
    Action[Action["BreakpointsInFileEnabledDisabledFromContextMenu"] = 72] = "BreakpointsInFileEnabledDisabledFromContextMenu";
    Action[Action["BreakpointConditionEditedFromSidebar"] = 73] = "BreakpointConditionEditedFromSidebar";
    Action[Action["WorkspaceTabAddFolder"] = 74] = "WorkspaceTabAddFolder";
    Action[Action["WorkspaceTabRemoveFolder"] = 75] = "WorkspaceTabRemoveFolder";
    Action[Action["OverrideTabAddFolder"] = 76] = "OverrideTabAddFolder";
    Action[Action["OverrideTabRemoveFolder"] = 77] = "OverrideTabRemoveFolder";
    Action[Action["WorkspaceSourceSelected"] = 78] = "WorkspaceSourceSelected";
    Action[Action["OverridesSourceSelected"] = 79] = "OverridesSourceSelected";
    Action[Action["StyleSheetInitiatorLinkClicked"] = 80] = "StyleSheetInitiatorLinkClicked";
    Action[Action["BreakpointRemovedFromGutterContextMenu"] = 81] = "BreakpointRemovedFromGutterContextMenu";
    Action[Action["BreakpointRemovedFromGutterToggle"] = 82] = "BreakpointRemovedFromGutterToggle";
    Action[Action["StylePropertyInsideKeyframeEdited"] = 83] = "StylePropertyInsideKeyframeEdited";
    Action[Action["OverrideContentFromSourcesContextMenu"] = 84] = "OverrideContentFromSourcesContextMenu";
    Action[Action["OverrideContentFromNetworkContextMenu"] = 85] = "OverrideContentFromNetworkContextMenu";
    Action[Action["OverrideScript"] = 86] = "OverrideScript";
    Action[Action["OverrideStyleSheet"] = 87] = "OverrideStyleSheet";
    Action[Action["OverrideDocument"] = 88] = "OverrideDocument";
    Action[Action["OverrideFetchXHR"] = 89] = "OverrideFetchXHR";
    Action[Action["OverrideImage"] = 90] = "OverrideImage";
    Action[Action["OverrideFont"] = 91] = "OverrideFont";
    Action[Action["OverrideContentContextMenuSetup"] = 92] = "OverrideContentContextMenuSetup";
    Action[Action["OverrideContentContextMenuAbandonSetup"] = 93] = "OverrideContentContextMenuAbandonSetup";
    Action[Action["OverrideContentContextMenuActivateDisabled"] = 94] = "OverrideContentContextMenuActivateDisabled";
    Action[Action["OverrideContentContextMenuOpenExistingFile"] = 95] = "OverrideContentContextMenuOpenExistingFile";
    Action[Action["OverrideContentContextMenuSaveNewFile"] = 96] = "OverrideContentContextMenuSaveNewFile";
    Action[Action["ShowAllOverridesFromSourcesContextMenu"] = 97] = "ShowAllOverridesFromSourcesContextMenu";
    Action[Action["ShowAllOverridesFromNetworkContextMenu"] = 98] = "ShowAllOverridesFromNetworkContextMenu";
    Action[Action["AnimationGroupsCleared"] = 99] = "AnimationGroupsCleared";
    Action[Action["AnimationsPaused"] = 100] = "AnimationsPaused";
    Action[Action["AnimationsResumed"] = 101] = "AnimationsResumed";
    Action[Action["AnimatedNodeDescriptionClicked"] = 102] = "AnimatedNodeDescriptionClicked";
    Action[Action["AnimationGroupScrubbed"] = 103] = "AnimationGroupScrubbed";
    Action[Action["AnimationGroupReplayed"] = 104] = "AnimationGroupReplayed";
    Action[Action["OverrideTabDeleteFolderContextMenu"] = 105] = "OverrideTabDeleteFolderContextMenu";
    Action[Action["WorkspaceDropFolder"] = 107] = "WorkspaceDropFolder";
    Action[Action["WorkspaceSelectFolder"] = 108] = "WorkspaceSelectFolder";
    Action[Action["OverrideContentContextMenuSourceMappedWarning"] = 109] = "OverrideContentContextMenuSourceMappedWarning";
    Action[Action["OverrideContentContextMenuRedirectToDeployed"] = 110] = "OverrideContentContextMenuRedirectToDeployed";
    Action[Action["NewStyleRuleAdded"] = 111] = "NewStyleRuleAdded";
    Action[Action["TraceExpanded"] = 112] = "TraceExpanded";
    Action[Action["InsightConsoleMessageShown"] = 113] = "InsightConsoleMessageShown";
    Action[Action["InsightRequestedViaContextMenu"] = 114] = "InsightRequestedViaContextMenu";
    Action[Action["InsightRequestedViaHoverButton"] = 115] = "InsightRequestedViaHoverButton";
    Action[Action["InsightRatedPositive"] = 117] = "InsightRatedPositive";
    Action[Action["InsightRatedNegative"] = 118] = "InsightRatedNegative";
    Action[Action["InsightClosed"] = 119] = "InsightClosed";
    Action[Action["InsightErrored"] = 120] = "InsightErrored";
    Action[Action["InsightHoverButtonShown"] = 121] = "InsightHoverButtonShown";
    Action[Action["SelfXssWarningConsoleMessageShown"] = 122] = "SelfXssWarningConsoleMessageShown";
    Action[Action["SelfXssWarningDialogShown"] = 123] = "SelfXssWarningDialogShown";
    Action[Action["SelfXssAllowPastingInConsole"] = 124] = "SelfXssAllowPastingInConsole";
    Action[Action["SelfXssAllowPastingInDialog"] = 125] = "SelfXssAllowPastingInDialog";
    Action[Action["ToggleEmulateFocusedPageFromStylesPaneOn"] = 126] = "ToggleEmulateFocusedPageFromStylesPaneOn";
    Action[Action["ToggleEmulateFocusedPageFromStylesPaneOff"] = 127] = "ToggleEmulateFocusedPageFromStylesPaneOff";
    Action[Action["ToggleEmulateFocusedPageFromRenderingTab"] = 128] = "ToggleEmulateFocusedPageFromRenderingTab";
    Action[Action["ToggleEmulateFocusedPageFromCommandMenu"] = 129] = "ToggleEmulateFocusedPageFromCommandMenu";
    Action[Action["InsightGenerated"] = 130] = "InsightGenerated";
    Action[Action["InsightErroredApi"] = 131] = "InsightErroredApi";
    Action[Action["InsightErroredMarkdown"] = 132] = "InsightErroredMarkdown";
    Action[Action["ToggleShowWebVitals"] = 133] = "ToggleShowWebVitals";
    Action[Action["InsightErroredPermissionDenied"] = 134] = "InsightErroredPermissionDenied";
    Action[Action["InsightErroredCannotSend"] = 135] = "InsightErroredCannotSend";
    Action[Action["InsightErroredRequestFailed"] = 136] = "InsightErroredRequestFailed";
    Action[Action["InsightErroredCannotParseChunk"] = 137] = "InsightErroredCannotParseChunk";
    Action[Action["InsightErroredUnknownChunk"] = 138] = "InsightErroredUnknownChunk";
    Action[Action["InsightErroredOther"] = 139] = "InsightErroredOther";
    Action[Action["AutofillReceived"] = 140] = "AutofillReceived";
    Action[Action["AutofillReceivedAndTabAutoOpened"] = 141] = "AutofillReceivedAndTabAutoOpened";
    Action[Action["AnimationGroupSelected"] = 142] = "AnimationGroupSelected";
    Action[Action["ScrollDrivenAnimationGroupSelected"] = 143] = "ScrollDrivenAnimationGroupSelected";
    Action[Action["ScrollDrivenAnimationGroupScrubbed"] = 144] = "ScrollDrivenAnimationGroupScrubbed";
    Action[Action["AiAssistanceOpenedFromElementsPanel"] = 145] = "AiAssistanceOpenedFromElementsPanel";
    Action[Action["AiAssistanceOpenedFromStylesTab"] = 146] = "AiAssistanceOpenedFromStylesTab";
    Action[Action["ConsoleFilterByContext"] = 147] = "ConsoleFilterByContext";
    Action[Action["ConsoleFilterBySource"] = 148] = "ConsoleFilterBySource";
    Action[Action["ConsoleFilterByUrl"] = 149] = "ConsoleFilterByUrl";
    Action[Action["InsightConsentReminderShown"] = 150] = "InsightConsentReminderShown";
    Action[Action["InsightConsentReminderCanceled"] = 151] = "InsightConsentReminderCanceled";
    Action[Action["InsightConsentReminderConfirmed"] = 152] = "InsightConsentReminderConfirmed";
    Action[Action["InsightsOnboardingShown"] = 153] = "InsightsOnboardingShown";
    Action[Action["InsightsOnboardingCanceledOnPage1"] = 154] = "InsightsOnboardingCanceledOnPage1";
    Action[Action["InsightsOnboardingCanceledOnPage2"] = 155] = "InsightsOnboardingCanceledOnPage2";
    Action[Action["InsightsOnboardingConfirmed"] = 156] = "InsightsOnboardingConfirmed";
    Action[Action["InsightsOnboardingNextPage"] = 157] = "InsightsOnboardingNextPage";
    Action[Action["InsightsOnboardingPrevPage"] = 158] = "InsightsOnboardingPrevPage";
    Action[Action["InsightsOnboardingFeatureDisabled"] = 159] = "InsightsOnboardingFeatureDisabled";
    Action[Action["InsightsOptInTeaserShown"] = 160] = "InsightsOptInTeaserShown";
    Action[Action["InsightsOptInTeaserSettingsLinkClicked"] = 161] = "InsightsOptInTeaserSettingsLinkClicked";
    Action[Action["InsightsOptInTeaserConfirmedInSettings"] = 162] = "InsightsOptInTeaserConfirmedInSettings";
    Action[Action["InsightsReminderTeaserShown"] = 163] = "InsightsReminderTeaserShown";
    Action[Action["InsightsReminderTeaserConfirmed"] = 164] = "InsightsReminderTeaserConfirmed";
    Action[Action["InsightsReminderTeaserCanceled"] = 165] = "InsightsReminderTeaserCanceled";
    Action[Action["InsightsReminderTeaserSettingsLinkClicked"] = 166] = "InsightsReminderTeaserSettingsLinkClicked";
    Action[Action["InsightsReminderTeaserAbortedInSettings"] = 167] = "InsightsReminderTeaserAbortedInSettings";
    Action[Action["GeneratingInsightWithoutDisclaimer"] = 168] = "GeneratingInsightWithoutDisclaimer";
    Action[Action["AiAssistanceOpenedFromElementsPanelFloatingButton"] = 169] = "AiAssistanceOpenedFromElementsPanelFloatingButton";
    Action[Action["AiAssistanceOpenedFromNetworkPanel"] = 170] = "AiAssistanceOpenedFromNetworkPanel";
    Action[Action["AiAssistanceOpenedFromSourcesPanel"] = 171] = "AiAssistanceOpenedFromSourcesPanel";
    Action[Action["AiAssistanceOpenedFromSourcesPanelFloatingButton"] = 172] = "AiAssistanceOpenedFromSourcesPanelFloatingButton";
    Action[Action["AiAssistanceOpenedFromPerformancePanelCallTree"] = 173] = "AiAssistanceOpenedFromPerformancePanelCallTree";
    Action[Action["AiAssistanceOpenedFromNetworkPanelFloatingButton"] = 174] = "AiAssistanceOpenedFromNetworkPanelFloatingButton";
    Action[Action["AiAssistancePanelOpened"] = 175] = "AiAssistancePanelOpened";
    Action[Action["AiAssistanceQuerySubmitted"] = 176] = "AiAssistanceQuerySubmitted";
    Action[Action["AiAssistanceAnswerReceived"] = 177] = "AiAssistanceAnswerReceived";
    Action[Action["AiAssistanceDynamicSuggestionClicked"] = 178] = "AiAssistanceDynamicSuggestionClicked";
    Action[Action["AiAssistanceSideEffectConfirmed"] = 179] = "AiAssistanceSideEffectConfirmed";
    Action[Action["AiAssistanceSideEffectRejected"] = 180] = "AiAssistanceSideEffectRejected";
    Action[Action["AiAssistanceError"] = 181] = "AiAssistanceError";
    Action[Action["AiCodeCompletionResponseServedFromCache"] = 184] = "AiCodeCompletionResponseServedFromCache";
    Action[Action["AiCodeCompletionRequestTriggered"] = 185] = "AiCodeCompletionRequestTriggered";
    Action[Action["AiCodeCompletionSuggestionDisplayed"] = 186] = "AiCodeCompletionSuggestionDisplayed";
    Action[Action["AiCodeCompletionSuggestionAccepted"] = 187] = "AiCodeCompletionSuggestionAccepted";
    Action[Action["AiCodeCompletionError"] = 188] = "AiCodeCompletionError";
    Action[Action["AttributeLinkClicked"] = 189] = "AttributeLinkClicked";
    Action[Action["InsightRequestedViaTeaser"] = 190] = "InsightRequestedViaTeaser";
    Action[Action["InsightTeaserGenerationStarted"] = 191] = "InsightTeaserGenerationStarted";
    Action[Action["InsightTeaserGenerationCompleted"] = 192] = "InsightTeaserGenerationCompleted";
    Action[Action["InsightTeaserGenerationAborted"] = 193] = "InsightTeaserGenerationAborted";
    Action[Action["InsightTeaserGenerationErrored"] = 194] = "InsightTeaserGenerationErrored";
    Action[Action["AiCodeGenerationSuggestionDisplayed"] = 195] = "AiCodeGenerationSuggestionDisplayed";
    Action[Action["AiCodeGenerationSuggestionAccepted"] = 196] = "AiCodeGenerationSuggestionAccepted";
    Action[Action["InsightTeaserModelDownloadStarted"] = 197] = "InsightTeaserModelDownloadStarted";
    Action[Action["InsightTeaserModelDownloadCompleted"] = 198] = "InsightTeaserModelDownloadCompleted";
    Action[Action["MAX_VALUE"] = 199] = "MAX_VALUE";
    /* eslint-enable @typescript-eslint/naming-convention */
})(Action || (Action = {}));
export var PanelCodes;
(function (PanelCodes) {
    /* eslint-disable @typescript-eslint/naming-convention */
    PanelCodes[PanelCodes["elements"] = 1] = "elements";
    PanelCodes[PanelCodes["resources"] = 2] = "resources";
    PanelCodes[PanelCodes["network"] = 3] = "network";
    PanelCodes[PanelCodes["sources"] = 4] = "sources";
    PanelCodes[PanelCodes["timeline"] = 5] = "timeline";
    PanelCodes[PanelCodes["heap-profiler"] = 6] = "heap-profiler";
    PanelCodes[PanelCodes["console"] = 8] = "console";
    PanelCodes[PanelCodes["layers"] = 9] = "layers";
    PanelCodes[PanelCodes["console-view"] = 10] = "console-view";
    PanelCodes[PanelCodes["animations"] = 11] = "animations";
    PanelCodes[PanelCodes["network.config"] = 12] = "network.config";
    PanelCodes[PanelCodes["rendering"] = 13] = "rendering";
    PanelCodes[PanelCodes["sensors"] = 14] = "sensors";
    PanelCodes[PanelCodes["sources.search"] = 15] = "sources.search";
    PanelCodes[PanelCodes["security"] = 16] = "security";
    PanelCodes[PanelCodes["js-profiler"] = 17] = "js-profiler";
    PanelCodes[PanelCodes["lighthouse"] = 18] = "lighthouse";
    PanelCodes[PanelCodes["coverage"] = 19] = "coverage";
    PanelCodes[PanelCodes["protocol-monitor"] = 20] = "protocol-monitor";
    PanelCodes[PanelCodes["remote-devices"] = 21] = "remote-devices";
    PanelCodes[PanelCodes["web-audio"] = 22] = "web-audio";
    PanelCodes[PanelCodes["changes.changes"] = 23] = "changes.changes";
    PanelCodes[PanelCodes["performance.monitor"] = 24] = "performance.monitor";
    PanelCodes[PanelCodes["release-note"] = 25] = "release-note";
    PanelCodes[PanelCodes["live-heap-profile"] = 26] = "live-heap-profile";
    PanelCodes[PanelCodes["sources.quick"] = 27] = "sources.quick";
    PanelCodes[PanelCodes["network.blocked-urls"] = 28] = "network.blocked-urls";
    PanelCodes[PanelCodes["settings-preferences"] = 29] = "settings-preferences";
    PanelCodes[PanelCodes["settings-workspace"] = 30] = "settings-workspace";
    PanelCodes[PanelCodes["settings-experiments"] = 31] = "settings-experiments";
    PanelCodes[PanelCodes["settings-blackbox"] = 32] = "settings-blackbox";
    PanelCodes[PanelCodes["settings-devices"] = 33] = "settings-devices";
    PanelCodes[PanelCodes["settings-throttling-conditions"] = 34] = "settings-throttling-conditions";
    PanelCodes[PanelCodes["settings-emulation-locations"] = 35] = "settings-emulation-locations";
    PanelCodes[PanelCodes["settings-shortcuts"] = 36] = "settings-shortcuts";
    PanelCodes[PanelCodes["issues-pane"] = 37] = "issues-pane";
    PanelCodes[PanelCodes["settings-keybinds"] = 38] = "settings-keybinds";
    PanelCodes[PanelCodes["cssoverview"] = 39] = "cssoverview";
    PanelCodes[PanelCodes["chrome-recorder"] = 40] = "chrome-recorder";
    PanelCodes[PanelCodes["trust-tokens"] = 41] = "trust-tokens";
    PanelCodes[PanelCodes["reporting-api"] = 42] = "reporting-api";
    PanelCodes[PanelCodes["interest-groups"] = 43] = "interest-groups";
    PanelCodes[PanelCodes["back-forward-cache"] = 44] = "back-forward-cache";
    PanelCodes[PanelCodes["service-worker-cache"] = 45] = "service-worker-cache";
    PanelCodes[PanelCodes["background-service-background-fetch"] = 46] = "background-service-background-fetch";
    PanelCodes[PanelCodes["background-service-background-sync"] = 47] = "background-service-background-sync";
    PanelCodes[PanelCodes["background-service-push-messaging"] = 48] = "background-service-push-messaging";
    PanelCodes[PanelCodes["background-service-notifications"] = 49] = "background-service-notifications";
    PanelCodes[PanelCodes["background-service-payment-handler"] = 50] = "background-service-payment-handler";
    PanelCodes[PanelCodes["background-service-periodic-background-sync"] = 51] = "background-service-periodic-background-sync";
    PanelCodes[PanelCodes["service-workers"] = 52] = "service-workers";
    PanelCodes[PanelCodes["app-manifest"] = 53] = "app-manifest";
    PanelCodes[PanelCodes["storage"] = 54] = "storage";
    PanelCodes[PanelCodes["cookies"] = 55] = "cookies";
    PanelCodes[PanelCodes["frame-details"] = 56] = "frame-details";
    PanelCodes[PanelCodes["frame-resource"] = 57] = "frame-resource";
    PanelCodes[PanelCodes["frame-window"] = 58] = "frame-window";
    PanelCodes[PanelCodes["frame-worker"] = 59] = "frame-worker";
    PanelCodes[PanelCodes["dom-storage"] = 60] = "dom-storage";
    PanelCodes[PanelCodes["indexed-db"] = 61] = "indexed-db";
    PanelCodes[PanelCodes["web-sql"] = 62] = "web-sql";
    PanelCodes[PanelCodes["performance-insights"] = 63] = "performance-insights";
    PanelCodes[PanelCodes["preloading"] = 64] = "preloading";
    PanelCodes[PanelCodes["bounce-tracking-mitigations"] = 65] = "bounce-tracking-mitigations";
    PanelCodes[PanelCodes["developer-resources"] = 66] = "developer-resources";
    PanelCodes[PanelCodes["autofill-view"] = 67] = "autofill-view";
    PanelCodes[PanelCodes["freestyler"] = 68] = "freestyler";
    /* eslint-enable @typescript-eslint/naming-convention */
    PanelCodes[PanelCodes["MAX_VALUE"] = 69] = "MAX_VALUE";
})(PanelCodes || (PanelCodes = {}));
export var MediaTypes;
(function (MediaTypes) {
    /* eslint-disable @typescript-eslint/naming-convention */
    MediaTypes[MediaTypes["Unknown"] = 0] = "Unknown";
    MediaTypes[MediaTypes["text/css"] = 2] = "text/css";
    MediaTypes[MediaTypes["text/html"] = 3] = "text/html";
    MediaTypes[MediaTypes["application/xml"] = 4] = "application/xml";
    MediaTypes[MediaTypes["application/wasm"] = 5] = "application/wasm";
    MediaTypes[MediaTypes["application/manifest+json"] = 6] = "application/manifest+json";
    MediaTypes[MediaTypes["application/x-aspx"] = 7] = "application/x-aspx";
    MediaTypes[MediaTypes["application/jsp"] = 8] = "application/jsp";
    MediaTypes[MediaTypes["text/x-c++src"] = 9] = "text/x-c++src";
    MediaTypes[MediaTypes["text/x-coffeescript"] = 10] = "text/x-coffeescript";
    MediaTypes[MediaTypes["application/vnd.dart"] = 11] = "application/vnd.dart";
    MediaTypes[MediaTypes["text/typescript"] = 12] = "text/typescript";
    MediaTypes[MediaTypes["text/typescript-jsx"] = 13] = "text/typescript-jsx";
    MediaTypes[MediaTypes["application/json"] = 14] = "application/json";
    MediaTypes[MediaTypes["text/x-csharp"] = 15] = "text/x-csharp";
    MediaTypes[MediaTypes["text/x-java"] = 16] = "text/x-java";
    MediaTypes[MediaTypes["text/x-less"] = 17] = "text/x-less";
    MediaTypes[MediaTypes["application/x-httpd-php"] = 18] = "application/x-httpd-php";
    MediaTypes[MediaTypes["text/x-python"] = 19] = "text/x-python";
    MediaTypes[MediaTypes["text/x-sh"] = 20] = "text/x-sh";
    MediaTypes[MediaTypes["text/x-gss"] = 21] = "text/x-gss";
    MediaTypes[MediaTypes["text/x-sass"] = 22] = "text/x-sass";
    MediaTypes[MediaTypes["text/x-scss"] = 23] = "text/x-scss";
    MediaTypes[MediaTypes["text/markdown"] = 24] = "text/markdown";
    MediaTypes[MediaTypes["text/x-clojure"] = 25] = "text/x-clojure";
    MediaTypes[MediaTypes["text/jsx"] = 26] = "text/jsx";
    MediaTypes[MediaTypes["text/x-go"] = 27] = "text/x-go";
    MediaTypes[MediaTypes["text/x-kotlin"] = 28] = "text/x-kotlin";
    MediaTypes[MediaTypes["text/x-scala"] = 29] = "text/x-scala";
    MediaTypes[MediaTypes["text/x.svelte"] = 30] = "text/x.svelte";
    MediaTypes[MediaTypes["text/javascript+plain"] = 31] = "text/javascript+plain";
    MediaTypes[MediaTypes["text/javascript+minified"] = 32] = "text/javascript+minified";
    MediaTypes[MediaTypes["text/javascript+sourcemapped"] = 33] = "text/javascript+sourcemapped";
    MediaTypes[MediaTypes["text/x.angular"] = 34] = "text/x.angular";
    MediaTypes[MediaTypes["text/x.vue"] = 35] = "text/x.vue";
    MediaTypes[MediaTypes["text/javascript+snippet"] = 36] = "text/javascript+snippet";
    MediaTypes[MediaTypes["text/javascript+eval"] = 37] = "text/javascript+eval";
    /* eslint-enable @typescript-eslint/naming-convention */
    MediaTypes[MediaTypes["MAX_VALUE"] = 38] = "MAX_VALUE";
})(MediaTypes || (MediaTypes = {}));
export var KeybindSetSettings;
(function (KeybindSetSettings) {
    /* eslint-disable @typescript-eslint/naming-convention */
    KeybindSetSettings[KeybindSetSettings["devToolsDefault"] = 0] = "devToolsDefault";
    KeybindSetSettings[KeybindSetSettings["vsCode"] = 1] = "vsCode";
    /* eslint-enable @typescript-eslint/naming-convention */
    KeybindSetSettings[KeybindSetSettings["MAX_VALUE"] = 2] = "MAX_VALUE";
})(KeybindSetSettings || (KeybindSetSettings = {}));
export var KeyboardShortcutAction;
(function (KeyboardShortcutAction) {
    /* eslint-disable @typescript-eslint/naming-convention */
    KeyboardShortcutAction[KeyboardShortcutAction["OtherShortcut"] = 0] = "OtherShortcut";
    KeyboardShortcutAction[KeyboardShortcutAction["quick-open.show-command-menu"] = 1] = "quick-open.show-command-menu";
    KeyboardShortcutAction[KeyboardShortcutAction["console.clear"] = 2] = "console.clear";
    KeyboardShortcutAction[KeyboardShortcutAction["console.toggle"] = 3] = "console.toggle";
    KeyboardShortcutAction[KeyboardShortcutAction["debugger.step"] = 4] = "debugger.step";
    KeyboardShortcutAction[KeyboardShortcutAction["debugger.step-into"] = 5] = "debugger.step-into";
    KeyboardShortcutAction[KeyboardShortcutAction["debugger.step-out"] = 6] = "debugger.step-out";
    KeyboardShortcutAction[KeyboardShortcutAction["debugger.step-over"] = 7] = "debugger.step-over";
    KeyboardShortcutAction[KeyboardShortcutAction["debugger.toggle-breakpoint"] = 8] = "debugger.toggle-breakpoint";
    KeyboardShortcutAction[KeyboardShortcutAction["debugger.toggle-breakpoint-enabled"] = 9] = "debugger.toggle-breakpoint-enabled";
    KeyboardShortcutAction[KeyboardShortcutAction["debugger.toggle-pause"] = 10] = "debugger.toggle-pause";
    KeyboardShortcutAction[KeyboardShortcutAction["elements.edit-as-html"] = 11] = "elements.edit-as-html";
    KeyboardShortcutAction[KeyboardShortcutAction["elements.hide-element"] = 12] = "elements.hide-element";
    KeyboardShortcutAction[KeyboardShortcutAction["elements.redo"] = 13] = "elements.redo";
    KeyboardShortcutAction[KeyboardShortcutAction["elements.toggle-element-search"] = 14] = "elements.toggle-element-search";
    KeyboardShortcutAction[KeyboardShortcutAction["elements.undo"] = 15] = "elements.undo";
    KeyboardShortcutAction[KeyboardShortcutAction["main.search-in-panel.find"] = 16] = "main.search-in-panel.find";
    KeyboardShortcutAction[KeyboardShortcutAction["main.toggle-drawer"] = 17] = "main.toggle-drawer";
    KeyboardShortcutAction[KeyboardShortcutAction["network.hide-request-details"] = 18] = "network.hide-request-details";
    KeyboardShortcutAction[KeyboardShortcutAction["network.search"] = 19] = "network.search";
    KeyboardShortcutAction[KeyboardShortcutAction["network.toggle-recording"] = 20] = "network.toggle-recording";
    KeyboardShortcutAction[KeyboardShortcutAction["quick-open.show"] = 21] = "quick-open.show";
    KeyboardShortcutAction[KeyboardShortcutAction["settings.show"] = 22] = "settings.show";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.search"] = 23] = "sources.search";
    KeyboardShortcutAction[KeyboardShortcutAction["background-service.toggle-recording"] = 24] = "background-service.toggle-recording";
    KeyboardShortcutAction[KeyboardShortcutAction["components.collect-garbage"] = 25] = "components.collect-garbage";
    KeyboardShortcutAction[KeyboardShortcutAction["console.clear.history"] = 26] = "console.clear.history";
    KeyboardShortcutAction[KeyboardShortcutAction["console.create-pin"] = 27] = "console.create-pin";
    KeyboardShortcutAction[KeyboardShortcutAction["coverage.start-with-reload"] = 28] = "coverage.start-with-reload";
    KeyboardShortcutAction[KeyboardShortcutAction["coverage.toggle-recording"] = 29] = "coverage.toggle-recording";
    KeyboardShortcutAction[KeyboardShortcutAction["debugger.breakpoint-input-window"] = 30] = "debugger.breakpoint-input-window";
    KeyboardShortcutAction[KeyboardShortcutAction["debugger.evaluate-selection"] = 31] = "debugger.evaluate-selection";
    KeyboardShortcutAction[KeyboardShortcutAction["debugger.next-call-frame"] = 32] = "debugger.next-call-frame";
    KeyboardShortcutAction[KeyboardShortcutAction["debugger.previous-call-frame"] = 33] = "debugger.previous-call-frame";
    KeyboardShortcutAction[KeyboardShortcutAction["debugger.run-snippet"] = 34] = "debugger.run-snippet";
    KeyboardShortcutAction[KeyboardShortcutAction["debugger.toggle-breakpoints-active"] = 35] = "debugger.toggle-breakpoints-active";
    KeyboardShortcutAction[KeyboardShortcutAction["elements.capture-area-screenshot"] = 36] = "elements.capture-area-screenshot";
    KeyboardShortcutAction[KeyboardShortcutAction["emulation.capture-full-height-screenshot"] = 37] = "emulation.capture-full-height-screenshot";
    KeyboardShortcutAction[KeyboardShortcutAction["emulation.capture-node-screenshot"] = 38] = "emulation.capture-node-screenshot";
    KeyboardShortcutAction[KeyboardShortcutAction["emulation.capture-screenshot"] = 39] = "emulation.capture-screenshot";
    KeyboardShortcutAction[KeyboardShortcutAction["emulation.show-sensors"] = 40] = "emulation.show-sensors";
    KeyboardShortcutAction[KeyboardShortcutAction["emulation.toggle-device-mode"] = 41] = "emulation.toggle-device-mode";
    KeyboardShortcutAction[KeyboardShortcutAction["help.release-notes"] = 42] = "help.release-notes";
    KeyboardShortcutAction[KeyboardShortcutAction["help.report-issue"] = 43] = "help.report-issue";
    KeyboardShortcutAction[KeyboardShortcutAction["input.start-replaying"] = 44] = "input.start-replaying";
    KeyboardShortcutAction[KeyboardShortcutAction["input.toggle-pause"] = 45] = "input.toggle-pause";
    KeyboardShortcutAction[KeyboardShortcutAction["input.toggle-recording"] = 46] = "input.toggle-recording";
    KeyboardShortcutAction[KeyboardShortcutAction["inspector-main.focus-debuggee"] = 47] = "inspector-main.focus-debuggee";
    KeyboardShortcutAction[KeyboardShortcutAction["inspector-main.hard-reload"] = 48] = "inspector-main.hard-reload";
    KeyboardShortcutAction[KeyboardShortcutAction["inspector-main.reload"] = 49] = "inspector-main.reload";
    KeyboardShortcutAction[KeyboardShortcutAction["live-heap-profile.start-with-reload"] = 50] = "live-heap-profile.start-with-reload";
    KeyboardShortcutAction[KeyboardShortcutAction["live-heap-profile.toggle-recording"] = 51] = "live-heap-profile.toggle-recording";
    KeyboardShortcutAction[KeyboardShortcutAction["main.debug-reload"] = 52] = "main.debug-reload";
    KeyboardShortcutAction[KeyboardShortcutAction["main.next-tab"] = 53] = "main.next-tab";
    KeyboardShortcutAction[KeyboardShortcutAction["main.previous-tab"] = 54] = "main.previous-tab";
    KeyboardShortcutAction[KeyboardShortcutAction["main.search-in-panel.cancel"] = 55] = "main.search-in-panel.cancel";
    KeyboardShortcutAction[KeyboardShortcutAction["main.search-in-panel.find-next"] = 56] = "main.search-in-panel.find-next";
    KeyboardShortcutAction[KeyboardShortcutAction["main.search-in-panel.find-previous"] = 57] = "main.search-in-panel.find-previous";
    KeyboardShortcutAction[KeyboardShortcutAction["main.toggle-dock"] = 58] = "main.toggle-dock";
    KeyboardShortcutAction[KeyboardShortcutAction["main.zoom-in"] = 59] = "main.zoom-in";
    KeyboardShortcutAction[KeyboardShortcutAction["main.zoom-out"] = 60] = "main.zoom-out";
    KeyboardShortcutAction[KeyboardShortcutAction["main.zoom-reset"] = 61] = "main.zoom-reset";
    KeyboardShortcutAction[KeyboardShortcutAction["network-conditions.network-low-end-mobile"] = 62] = "network-conditions.network-low-end-mobile";
    KeyboardShortcutAction[KeyboardShortcutAction["network-conditions.network-mid-tier-mobile"] = 63] = "network-conditions.network-mid-tier-mobile";
    KeyboardShortcutAction[KeyboardShortcutAction["network-conditions.network-offline"] = 64] = "network-conditions.network-offline";
    KeyboardShortcutAction[KeyboardShortcutAction["network-conditions.network-online"] = 65] = "network-conditions.network-online";
    KeyboardShortcutAction[KeyboardShortcutAction["profiler.heap-toggle-recording"] = 66] = "profiler.heap-toggle-recording";
    KeyboardShortcutAction[KeyboardShortcutAction["profiler.js-toggle-recording"] = 67] = "profiler.js-toggle-recording";
    KeyboardShortcutAction[KeyboardShortcutAction["resources.clear"] = 68] = "resources.clear";
    KeyboardShortcutAction[KeyboardShortcutAction["settings.documentation"] = 69] = "settings.documentation";
    KeyboardShortcutAction[KeyboardShortcutAction["settings.shortcuts"] = 70] = "settings.shortcuts";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.add-folder-to-workspace"] = 71] = "sources.add-folder-to-workspace";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.add-to-watch"] = 72] = "sources.add-to-watch";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.close-all"] = 73] = "sources.close-all";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.close-editor-tab"] = 74] = "sources.close-editor-tab";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.create-snippet"] = 75] = "sources.create-snippet";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.go-to-line"] = 76] = "sources.go-to-line";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.go-to-member"] = 77] = "sources.go-to-member";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.jump-to-next-location"] = 78] = "sources.jump-to-next-location";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.jump-to-previous-location"] = 79] = "sources.jump-to-previous-location";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.rename"] = 80] = "sources.rename";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.save"] = 81] = "sources.save";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.save-all"] = 82] = "sources.save-all";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.switch-file"] = 83] = "sources.switch-file";
    KeyboardShortcutAction[KeyboardShortcutAction["timeline.jump-to-next-frame"] = 84] = "timeline.jump-to-next-frame";
    KeyboardShortcutAction[KeyboardShortcutAction["timeline.jump-to-previous-frame"] = 85] = "timeline.jump-to-previous-frame";
    KeyboardShortcutAction[KeyboardShortcutAction["timeline.load-from-file"] = 86] = "timeline.load-from-file";
    KeyboardShortcutAction[KeyboardShortcutAction["timeline.next-recording"] = 87] = "timeline.next-recording";
    KeyboardShortcutAction[KeyboardShortcutAction["timeline.previous-recording"] = 88] = "timeline.previous-recording";
    KeyboardShortcutAction[KeyboardShortcutAction["timeline.record-reload"] = 89] = "timeline.record-reload";
    KeyboardShortcutAction[KeyboardShortcutAction["timeline.save-to-file"] = 90] = "timeline.save-to-file";
    KeyboardShortcutAction[KeyboardShortcutAction["timeline.show-history"] = 91] = "timeline.show-history";
    KeyboardShortcutAction[KeyboardShortcutAction["timeline.toggle-recording"] = 92] = "timeline.toggle-recording";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.increment-css"] = 93] = "sources.increment-css";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.increment-css-by-ten"] = 94] = "sources.increment-css-by-ten";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.decrement-css"] = 95] = "sources.decrement-css";
    KeyboardShortcutAction[KeyboardShortcutAction["sources.decrement-css-by-ten"] = 96] = "sources.decrement-css-by-ten";
    KeyboardShortcutAction[KeyboardShortcutAction["layers.reset-view"] = 97] = "layers.reset-view";
    KeyboardShortcutAction[KeyboardShortcutAction["layers.pan-mode"] = 98] = "layers.pan-mode";
    KeyboardShortcutAction[KeyboardShortcutAction["layers.rotate-mode"] = 99] = "layers.rotate-mode";
    KeyboardShortcutAction[KeyboardShortcutAction["layers.zoom-in"] = 100] = "layers.zoom-in";
    KeyboardShortcutAction[KeyboardShortcutAction["layers.zoom-out"] = 101] = "layers.zoom-out";
    KeyboardShortcutAction[KeyboardShortcutAction["layers.up"] = 102] = "layers.up";
    KeyboardShortcutAction[KeyboardShortcutAction["layers.down"] = 103] = "layers.down";
    KeyboardShortcutAction[KeyboardShortcutAction["layers.left"] = 104] = "layers.left";
    KeyboardShortcutAction[KeyboardShortcutAction["layers.right"] = 105] = "layers.right";
    KeyboardShortcutAction[KeyboardShortcutAction["help.report-translation-issue"] = 106] = "help.report-translation-issue";
    KeyboardShortcutAction[KeyboardShortcutAction["rendering.toggle-prefers-color-scheme"] = 107] = "rendering.toggle-prefers-color-scheme";
    KeyboardShortcutAction[KeyboardShortcutAction["chrome-recorder.start-recording"] = 108] = "chrome-recorder.start-recording";
    KeyboardShortcutAction[KeyboardShortcutAction["chrome-recorder.replay-recording"] = 109] = "chrome-recorder.replay-recording";
    KeyboardShortcutAction[KeyboardShortcutAction["chrome-recorder.toggle-code-view"] = 110] = "chrome-recorder.toggle-code-view";
    KeyboardShortcutAction[KeyboardShortcutAction["chrome-recorder.copy-recording-or-step"] = 111] = "chrome-recorder.copy-recording-or-step";
    KeyboardShortcutAction[KeyboardShortcutAction["elements.new-style-rule"] = 114] = "elements.new-style-rule";
    KeyboardShortcutAction[KeyboardShortcutAction["elements.refresh-event-listeners"] = 115] = "elements.refresh-event-listeners";
    KeyboardShortcutAction[KeyboardShortcutAction["coverage.clear"] = 116] = "coverage.clear";
    KeyboardShortcutAction[KeyboardShortcutAction["coverage.export"] = 117] = "coverage.export";
    KeyboardShortcutAction[KeyboardShortcutAction["timeline.dim-third-parties"] = 118] = "timeline.dim-third-parties";
    KeyboardShortcutAction[KeyboardShortcutAction["main.toggle-drawer-orientation"] = 119] = "main.toggle-drawer-orientation";
    /* eslint-enable @typescript-eslint/naming-convention */
    KeyboardShortcutAction[KeyboardShortcutAction["MAX_VALUE"] = 120] = "MAX_VALUE";
})(KeyboardShortcutAction || (KeyboardShortcutAction = {}));
/**
 * This list should contain the currently active Devtools Experiments,
 * gaps are expected.
 */
export var DevtoolsExperiments;
(function (DevtoolsExperiments) {
    /* eslint-disable @typescript-eslint/naming-convention */
    DevtoolsExperiments[DevtoolsExperiments["capture-node-creation-stacks"] = 1] = "capture-node-creation-stacks";
    DevtoolsExperiments[DevtoolsExperiments["live-heap-profile"] = 11] = "live-heap-profile";
    DevtoolsExperiments[DevtoolsExperiments["protocol-monitor"] = 13] = "protocol-monitor";
    DevtoolsExperiments[DevtoolsExperiments["sampling-heap-profiler-timeline"] = 17] = "sampling-heap-profiler-timeline";
    DevtoolsExperiments[DevtoolsExperiments["show-option-tp-expose-internals-in-heap-snapshot"] = 18] = "show-option-tp-expose-internals-in-heap-snapshot";
    DevtoolsExperiments[DevtoolsExperiments["timeline-invalidation-tracking"] = 26] = "timeline-invalidation-tracking";
    DevtoolsExperiments[DevtoolsExperiments["timeline-show-all-events"] = 27] = "timeline-show-all-events";
    DevtoolsExperiments[DevtoolsExperiments["timeline-v8-runtime-call-stats"] = 28] = "timeline-v8-runtime-call-stats";
    DevtoolsExperiments[DevtoolsExperiments["apca"] = 39] = "apca";
    DevtoolsExperiments[DevtoolsExperiments["font-editor"] = 41] = "font-editor";
    DevtoolsExperiments[DevtoolsExperiments["full-accessibility-tree"] = 42] = "full-accessibility-tree";
    DevtoolsExperiments[DevtoolsExperiments["contrast-issues"] = 44] = "contrast-issues";
    DevtoolsExperiments[DevtoolsExperiments["experimental-cookie-features"] = 45] = "experimental-cookie-features";
    DevtoolsExperiments[DevtoolsExperiments["instrumentation-breakpoints"] = 61] = "instrumentation-breakpoints";
    DevtoolsExperiments[DevtoolsExperiments["authored-deployed-grouping"] = 63] = "authored-deployed-grouping";
    DevtoolsExperiments[DevtoolsExperiments["just-my-code"] = 65] = "just-my-code";
    DevtoolsExperiments[DevtoolsExperiments["use-source-map-scopes"] = 76] = "use-source-map-scopes";
    DevtoolsExperiments[DevtoolsExperiments["timeline-show-postmessage-events"] = 86] = "timeline-show-postmessage-events";
    DevtoolsExperiments[DevtoolsExperiments["timeline-debug-mode"] = 93] = "timeline-debug-mode";
    /* eslint-enable @typescript-eslint/naming-convention */
    // Increment this when new experiments are added.
    DevtoolsExperiments[DevtoolsExperiments["MAX_VALUE"] = 110] = "MAX_VALUE";
})(DevtoolsExperiments || (DevtoolsExperiments = {}));
/** Update DevToolsIssuesPanelIssueExpanded from tools/metrics/histograms/enums.xml if new enum is added. **/
export var IssueExpanded;
(function (IssueExpanded) {
    /* eslint-disable @typescript-eslint/naming-convention */
    IssueExpanded[IssueExpanded["CrossOriginEmbedderPolicy"] = 0] = "CrossOriginEmbedderPolicy";
    IssueExpanded[IssueExpanded["MixedContent"] = 1] = "MixedContent";
    IssueExpanded[IssueExpanded["SameSiteCookie"] = 2] = "SameSiteCookie";
    IssueExpanded[IssueExpanded["HeavyAd"] = 3] = "HeavyAd";
    IssueExpanded[IssueExpanded["ContentSecurityPolicy"] = 4] = "ContentSecurityPolicy";
    IssueExpanded[IssueExpanded["Other"] = 5] = "Other";
    IssueExpanded[IssueExpanded["Generic"] = 6] = "Generic";
    IssueExpanded[IssueExpanded["ThirdPartyPhaseoutCookie"] = 7] = "ThirdPartyPhaseoutCookie";
    IssueExpanded[IssueExpanded["GenericCookie"] = 8] = "GenericCookie";
    /* eslint-enable @typescript-eslint/naming-convention */
    IssueExpanded[IssueExpanded["MAX_VALUE"] = 9] = "MAX_VALUE";
})(IssueExpanded || (IssueExpanded = {}));
export var IssueResourceOpened;
(function (IssueResourceOpened) {
    /* eslint-disable @typescript-eslint/naming-convention */
    IssueResourceOpened[IssueResourceOpened["CrossOriginEmbedderPolicyRequest"] = 0] = "CrossOriginEmbedderPolicyRequest";
    IssueResourceOpened[IssueResourceOpened["CrossOriginEmbedderPolicyElement"] = 1] = "CrossOriginEmbedderPolicyElement";
    IssueResourceOpened[IssueResourceOpened["MixedContentRequest"] = 2] = "MixedContentRequest";
    IssueResourceOpened[IssueResourceOpened["SameSiteCookieCookie"] = 3] = "SameSiteCookieCookie";
    IssueResourceOpened[IssueResourceOpened["SameSiteCookieRequest"] = 4] = "SameSiteCookieRequest";
    IssueResourceOpened[IssueResourceOpened["HeavyAdElement"] = 5] = "HeavyAdElement";
    IssueResourceOpened[IssueResourceOpened["ContentSecurityPolicyDirective"] = 6] = "ContentSecurityPolicyDirective";
    IssueResourceOpened[IssueResourceOpened["ContentSecurityPolicyElement"] = 7] = "ContentSecurityPolicyElement";
    /* eslint-enable @typescript-eslint/naming-convention */
    IssueResourceOpened[IssueResourceOpened["MAX_VALUE"] = 13] = "MAX_VALUE";
})(IssueResourceOpened || (IssueResourceOpened = {}));
/**
 * This list should contain the currently active issue types,
 * gaps are expected.
 */
export var IssueCreated;
(function (IssueCreated) {
    /* eslint-disable @typescript-eslint/naming-convention */
    IssueCreated[IssueCreated["MixedContentIssue"] = 0] = "MixedContentIssue";
    IssueCreated[IssueCreated["ContentSecurityPolicyIssue::kInlineViolation"] = 1] = "ContentSecurityPolicyIssue::kInlineViolation";
    IssueCreated[IssueCreated["ContentSecurityPolicyIssue::kEvalViolation"] = 2] = "ContentSecurityPolicyIssue::kEvalViolation";
    IssueCreated[IssueCreated["ContentSecurityPolicyIssue::kURLViolation"] = 3] = "ContentSecurityPolicyIssue::kURLViolation";
    IssueCreated[IssueCreated["ContentSecurityPolicyIssue::kTrustedTypesSinkViolation"] = 4] = "ContentSecurityPolicyIssue::kTrustedTypesSinkViolation";
    IssueCreated[IssueCreated["ContentSecurityPolicyIssue::kTrustedTypesPolicyViolation"] = 5] = "ContentSecurityPolicyIssue::kTrustedTypesPolicyViolation";
    IssueCreated[IssueCreated["HeavyAdIssue::NetworkTotalLimit"] = 6] = "HeavyAdIssue::NetworkTotalLimit";
    IssueCreated[IssueCreated["HeavyAdIssue::CpuTotalLimit"] = 7] = "HeavyAdIssue::CpuTotalLimit";
    IssueCreated[IssueCreated["HeavyAdIssue::CpuPeakLimit"] = 8] = "HeavyAdIssue::CpuPeakLimit";
    IssueCreated[IssueCreated["CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader"] = 9] = "CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader";
    IssueCreated[IssueCreated["CrossOriginEmbedderPolicyIssue::CoopSandboxedIFrameCannotNavigateToCoopPage"] = 10] = "CrossOriginEmbedderPolicyIssue::CoopSandboxedIFrameCannotNavigateToCoopPage";
    IssueCreated[IssueCreated["CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin"] = 11] = "CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin";
    IssueCreated[IssueCreated["CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = 12] = "CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep";
    IssueCreated[IssueCreated["CrossOriginEmbedderPolicyIssue::CorpNotSameSite"] = 13] = "CrossOriginEmbedderPolicyIssue::CorpNotSameSite";
    IssueCreated[IssueCreated["CookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie"] = 14] = "CookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie";
    IssueCreated[IssueCreated["CookieIssue::ExcludeSameSiteNoneInsecure::SetCookie"] = 15] = "CookieIssue::ExcludeSameSiteNoneInsecure::SetCookie";
    IssueCreated[IssueCreated["CookieIssue::WarnSameSiteNoneInsecure::ReadCookie"] = 16] = "CookieIssue::WarnSameSiteNoneInsecure::ReadCookie";
    IssueCreated[IssueCreated["CookieIssue::WarnSameSiteNoneInsecure::SetCookie"] = 17] = "CookieIssue::WarnSameSiteNoneInsecure::SetCookie";
    IssueCreated[IssueCreated["CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Secure"] = 18] = "CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Secure";
    IssueCreated[IssueCreated["CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Insecure"] = 19] = "CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Insecure";
    IssueCreated[IssueCreated["CookieIssue::WarnCrossDowngrade::ReadCookie::Secure"] = 20] = "CookieIssue::WarnCrossDowngrade::ReadCookie::Secure";
    IssueCreated[IssueCreated["CookieIssue::WarnCrossDowngrade::ReadCookie::Insecure"] = 21] = "CookieIssue::WarnCrossDowngrade::ReadCookie::Insecure";
    IssueCreated[IssueCreated["CookieIssue::WarnCrossDowngrade::SetCookie::Secure"] = 22] = "CookieIssue::WarnCrossDowngrade::SetCookie::Secure";
    IssueCreated[IssueCreated["CookieIssue::WarnCrossDowngrade::SetCookie::Insecure"] = 23] = "CookieIssue::WarnCrossDowngrade::SetCookie::Insecure";
    IssueCreated[IssueCreated["CookieIssue::ExcludeNavigationContextDowngrade::Secure"] = 24] = "CookieIssue::ExcludeNavigationContextDowngrade::Secure";
    IssueCreated[IssueCreated["CookieIssue::ExcludeNavigationContextDowngrade::Insecure"] = 25] = "CookieIssue::ExcludeNavigationContextDowngrade::Insecure";
    IssueCreated[IssueCreated["CookieIssue::ExcludeContextDowngrade::ReadCookie::Secure"] = 26] = "CookieIssue::ExcludeContextDowngrade::ReadCookie::Secure";
    IssueCreated[IssueCreated["CookieIssue::ExcludeContextDowngrade::ReadCookie::Insecure"] = 27] = "CookieIssue::ExcludeContextDowngrade::ReadCookie::Insecure";
    IssueCreated[IssueCreated["CookieIssue::ExcludeContextDowngrade::SetCookie::Secure"] = 28] = "CookieIssue::ExcludeContextDowngrade::SetCookie::Secure";
    IssueCreated[IssueCreated["CookieIssue::ExcludeContextDowngrade::SetCookie::Insecure"] = 29] = "CookieIssue::ExcludeContextDowngrade::SetCookie::Insecure";
    IssueCreated[IssueCreated["CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie"] = 30] = "CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie";
    IssueCreated[IssueCreated["CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie"] = 31] = "CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie";
    IssueCreated[IssueCreated["CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie"] = 32] = "CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie";
    IssueCreated[IssueCreated["CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie"] = 33] = "CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie";
    IssueCreated[IssueCreated["CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie"] = 34] = "CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie";
    IssueCreated[IssueCreated["CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie"] = 35] = "CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie";
    IssueCreated[IssueCreated["SharedArrayBufferIssue::TransferIssue"] = 36] = "SharedArrayBufferIssue::TransferIssue";
    IssueCreated[IssueCreated["SharedArrayBufferIssue::CreationIssue"] = 37] = "SharedArrayBufferIssue::CreationIssue";
    IssueCreated[IssueCreated["LowTextContrastIssue"] = 41] = "LowTextContrastIssue";
    IssueCreated[IssueCreated["CorsIssue::InsecurePrivateNetwork"] = 42] = "CorsIssue::InsecurePrivateNetwork";
    IssueCreated[IssueCreated["CorsIssue::InvalidHeaders"] = 44] = "CorsIssue::InvalidHeaders";
    IssueCreated[IssueCreated["CorsIssue::WildcardOriginWithCredentials"] = 45] = "CorsIssue::WildcardOriginWithCredentials";
    IssueCreated[IssueCreated["CorsIssue::PreflightResponseInvalid"] = 46] = "CorsIssue::PreflightResponseInvalid";
    IssueCreated[IssueCreated["CorsIssue::OriginMismatch"] = 47] = "CorsIssue::OriginMismatch";
    IssueCreated[IssueCreated["CorsIssue::AllowCredentialsRequired"] = 48] = "CorsIssue::AllowCredentialsRequired";
    IssueCreated[IssueCreated["CorsIssue::MethodDisallowedByPreflightResponse"] = 49] = "CorsIssue::MethodDisallowedByPreflightResponse";
    IssueCreated[IssueCreated["CorsIssue::HeaderDisallowedByPreflightResponse"] = 50] = "CorsIssue::HeaderDisallowedByPreflightResponse";
    IssueCreated[IssueCreated["CorsIssue::RedirectContainsCredentials"] = 51] = "CorsIssue::RedirectContainsCredentials";
    IssueCreated[IssueCreated["CorsIssue::DisallowedByMode"] = 52] = "CorsIssue::DisallowedByMode";
    IssueCreated[IssueCreated["CorsIssue::CorsDisabledScheme"] = 53] = "CorsIssue::CorsDisabledScheme";
    IssueCreated[IssueCreated["CorsIssue::PreflightMissingAllowExternal"] = 54] = "CorsIssue::PreflightMissingAllowExternal";
    IssueCreated[IssueCreated["CorsIssue::PreflightInvalidAllowExternal"] = 55] = "CorsIssue::PreflightInvalidAllowExternal";
    IssueCreated[IssueCreated["CorsIssue::NoCorsRedirectModeNotFollow"] = 57] = "CorsIssue::NoCorsRedirectModeNotFollow";
    IssueCreated[IssueCreated["QuirksModeIssue::QuirksMode"] = 58] = "QuirksModeIssue::QuirksMode";
    IssueCreated[IssueCreated["QuirksModeIssue::LimitedQuirksMode"] = 59] = "QuirksModeIssue::LimitedQuirksMode";
    IssueCreated[IssueCreated["DeprecationIssue"] = 60] = "DeprecationIssue";
    IssueCreated[IssueCreated["ClientHintIssue::MetaTagAllowListInvalidOrigin"] = 61] = "ClientHintIssue::MetaTagAllowListInvalidOrigin";
    IssueCreated[IssueCreated["ClientHintIssue::MetaTagModifiedHTML"] = 62] = "ClientHintIssue::MetaTagModifiedHTML";
    IssueCreated[IssueCreated["CorsIssue::PreflightAllowPrivateNetworkError"] = 63] = "CorsIssue::PreflightAllowPrivateNetworkError";
    IssueCreated[IssueCreated["GenericIssue::CrossOriginPortalPostMessageError"] = 64] = "GenericIssue::CrossOriginPortalPostMessageError";
    IssueCreated[IssueCreated["GenericIssue::FormLabelForNameError"] = 65] = "GenericIssue::FormLabelForNameError";
    IssueCreated[IssueCreated["GenericIssue::FormDuplicateIdForInputError"] = 66] = "GenericIssue::FormDuplicateIdForInputError";
    IssueCreated[IssueCreated["GenericIssue::FormInputWithNoLabelError"] = 67] = "GenericIssue::FormInputWithNoLabelError";
    IssueCreated[IssueCreated["GenericIssue::FormAutocompleteAttributeEmptyError"] = 68] = "GenericIssue::FormAutocompleteAttributeEmptyError";
    IssueCreated[IssueCreated["GenericIssue::FormEmptyIdAndNameAttributesForInputError"] = 69] = "GenericIssue::FormEmptyIdAndNameAttributesForInputError";
    IssueCreated[IssueCreated["GenericIssue::FormAriaLabelledByToNonExistingIdError"] = 70] = "GenericIssue::FormAriaLabelledByToNonExistingIdError";
    IssueCreated[IssueCreated["GenericIssue::FormInputAssignedAutocompleteValueToIdOrNameAttributeError"] = 71] = "GenericIssue::FormInputAssignedAutocompleteValueToIdOrNameAttributeError";
    IssueCreated[IssueCreated["GenericIssue::FormLabelHasNeitherForNorNestedInputError"] = 72] = "GenericIssue::FormLabelHasNeitherForNorNestedInputError";
    IssueCreated[IssueCreated["GenericIssue::FormLabelForMatchesNonExistingIdError"] = 73] = "GenericIssue::FormLabelForMatchesNonExistingIdError";
    IssueCreated[IssueCreated["GenericIssue::FormHasPasswordFieldWithoutUsernameFieldError"] = 74] = "GenericIssue::FormHasPasswordFieldWithoutUsernameFieldError";
    IssueCreated[IssueCreated["GenericIssue::FormInputHasWrongButWellIntendedAutocompleteValueError"] = 75] = "GenericIssue::FormInputHasWrongButWellIntendedAutocompleteValueError";
    IssueCreated[IssueCreated["StylesheetLoadingIssue::LateImportRule"] = 76] = "StylesheetLoadingIssue::LateImportRule";
    IssueCreated[IssueCreated["StylesheetLoadingIssue::RequestFailed"] = 77] = "StylesheetLoadingIssue::RequestFailed";
    IssueCreated[IssueCreated["CorsIssue::PreflightMissingPrivateNetworkAccessId"] = 78] = "CorsIssue::PreflightMissingPrivateNetworkAccessId";
    IssueCreated[IssueCreated["CorsIssue::PreflightMissingPrivateNetworkAccessName"] = 79] = "CorsIssue::PreflightMissingPrivateNetworkAccessName";
    IssueCreated[IssueCreated["CorsIssue::PrivateNetworkAccessPermissionUnavailable"] = 80] = "CorsIssue::PrivateNetworkAccessPermissionUnavailable";
    IssueCreated[IssueCreated["CorsIssue::PrivateNetworkAccessPermissionDenied"] = 81] = "CorsIssue::PrivateNetworkAccessPermissionDenied";
    IssueCreated[IssueCreated["CookieIssue::WarnThirdPartyPhaseout::ReadCookie"] = 82] = "CookieIssue::WarnThirdPartyPhaseout::ReadCookie";
    IssueCreated[IssueCreated["CookieIssue::WarnThirdPartyPhaseout::SetCookie"] = 83] = "CookieIssue::WarnThirdPartyPhaseout::SetCookie";
    IssueCreated[IssueCreated["CookieIssue::ExcludeThirdPartyPhaseout::ReadCookie"] = 84] = "CookieIssue::ExcludeThirdPartyPhaseout::ReadCookie";
    IssueCreated[IssueCreated["CookieIssue::ExcludeThirdPartyPhaseout::SetCookie"] = 85] = "CookieIssue::ExcludeThirdPartyPhaseout::SetCookie";
    IssueCreated[IssueCreated["ElementAccessibilityIssue::DisallowedSelectChild"] = 86] = "ElementAccessibilityIssue::DisallowedSelectChild";
    IssueCreated[IssueCreated["ElementAccessibilityIssue::DisallowedOptGroupChild"] = 87] = "ElementAccessibilityIssue::DisallowedOptGroupChild";
    IssueCreated[IssueCreated["ElementAccessibilityIssue::NonPhrasingContentOptionChild"] = 88] = "ElementAccessibilityIssue::NonPhrasingContentOptionChild";
    IssueCreated[IssueCreated["ElementAccessibilityIssue::InteractiveContentOptionChild"] = 89] = "ElementAccessibilityIssue::InteractiveContentOptionChild";
    IssueCreated[IssueCreated["ElementAccessibilityIssue::InteractiveContentLegendChild"] = 90] = "ElementAccessibilityIssue::InteractiveContentLegendChild";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::MissingSignatureHeader"] = 91] = "SRIMessageSignatureIssue::MissingSignatureHeader";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::MissingSignatureInputHeader"] = 92] = "SRIMessageSignatureIssue::MissingSignatureInputHeader";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::InvalidSignatureHeader"] = 93] = "SRIMessageSignatureIssue::InvalidSignatureHeader";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::InvalidSignatureInputHeader"] = 94] = "SRIMessageSignatureIssue::InvalidSignatureInputHeader";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::SignatureHeaderValueIsNotByteSequence"] = 95] = "SRIMessageSignatureIssue::SignatureHeaderValueIsNotByteSequence";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::SignatureHeaderValueIsParameterized"] = 96] = "SRIMessageSignatureIssue::SignatureHeaderValueIsParameterized";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::SignatureHeaderValueIsIncorrectLength"] = 97] = "SRIMessageSignatureIssue::SignatureHeaderValueIsIncorrectLength";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::SignatureInputHeaderMissingLabel"] = 98] = "SRIMessageSignatureIssue::SignatureInputHeaderMissingLabel";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::SignatureInputHeaderValueNotInnerList"] = 99] = "SRIMessageSignatureIssue::SignatureInputHeaderValueNotInnerList";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::SignatureInputHeaderValueMissingComponents"] = 100] = "SRIMessageSignatureIssue::SignatureInputHeaderValueMissingComponents";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentType"] = 101] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentType";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentName"] = 102] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentName";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::SignatureInputHeaderInvalidHeaderComponentParameter"] = 103] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidHeaderComponentParameter";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::SignatureInputHeaderInvalidDerivedComponentParameter"] = 104] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidDerivedComponentParameter";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::SignatureInputHeaderKeyIdLength"] = 105] = "SRIMessageSignatureIssue::SignatureInputHeaderKeyIdLength";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::SignatureInputHeaderInvalidParameter"] = 106] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidParameter";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::SignatureInputHeaderMissingRequiredParameters"] = 107] = "SRIMessageSignatureIssue::SignatureInputHeaderMissingRequiredParameters";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::ValidationFailedSignatureExpired"] = 108] = "SRIMessageSignatureIssue::ValidationFailedSignatureExpired";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::ValidationFailedInvalidLength"] = 109] = "SRIMessageSignatureIssue::ValidationFailedInvalidLength";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::ValidationFailedSignatureMismatch"] = 110] = "SRIMessageSignatureIssue::ValidationFailedSignatureMismatch";
    IssueCreated[IssueCreated["CorsIssue::LocalNetworkAccessPermissionDenied"] = 111] = "CorsIssue::LocalNetworkAccessPermissionDenied";
    IssueCreated[IssueCreated["SRIMessageSignatureIssue::ValidationFailedIntegrityMismatch"] = 112] = "SRIMessageSignatureIssue::ValidationFailedIntegrityMismatch";
    IssueCreated[IssueCreated["ElementAccessibilityIssue::InteractiveContentSummaryDescendant"] = 113] = "ElementAccessibilityIssue::InteractiveContentSummaryDescendant";
    /* eslint-enable @typescript-eslint/naming-convention */
    IssueCreated[IssueCreated["MAX_VALUE"] = 114] = "MAX_VALUE";
})(IssueCreated || (IssueCreated = {}));
export var Language;
(function (Language) {
    /* eslint-disable @typescript-eslint/naming-convention */
    Language[Language["af"] = 1] = "af";
    Language[Language["am"] = 2] = "am";
    Language[Language["ar"] = 3] = "ar";
    Language[Language["as"] = 4] = "as";
    Language[Language["az"] = 5] = "az";
    Language[Language["be"] = 6] = "be";
    Language[Language["bg"] = 7] = "bg";
    Language[Language["bn"] = 8] = "bn";
    Language[Language["bs"] = 9] = "bs";
    Language[Language["ca"] = 10] = "ca";
    Language[Language["cs"] = 11] = "cs";
    Language[Language["cy"] = 12] = "cy";
    Language[Language["da"] = 13] = "da";
    Language[Language["de"] = 14] = "de";
    Language[Language["el"] = 15] = "el";
    Language[Language["en-GB"] = 16] = "en-GB";
    Language[Language["en-US"] = 17] = "en-US";
    Language[Language["es-419"] = 18] = "es-419";
    Language[Language["es"] = 19] = "es";
    Language[Language["et"] = 20] = "et";
    Language[Language["eu"] = 21] = "eu";
    Language[Language["fa"] = 22] = "fa";
    Language[Language["fi"] = 23] = "fi";
    Language[Language["fil"] = 24] = "fil";
    Language[Language["fr-CA"] = 25] = "fr-CA";
    Language[Language["fr"] = 26] = "fr";
    Language[Language["gl"] = 27] = "gl";
    Language[Language["gu"] = 28] = "gu";
    Language[Language["he"] = 29] = "he";
    Language[Language["hi"] = 30] = "hi";
    Language[Language["hr"] = 31] = "hr";
    Language[Language["hu"] = 32] = "hu";
    Language[Language["hy"] = 33] = "hy";
    Language[Language["id"] = 34] = "id";
    Language[Language["is"] = 35] = "is";
    Language[Language["it"] = 36] = "it";
    Language[Language["ja"] = 37] = "ja";
    Language[Language["ka"] = 38] = "ka";
    Language[Language["kk"] = 39] = "kk";
    Language[Language["km"] = 40] = "km";
    Language[Language["kn"] = 41] = "kn";
    Language[Language["ko"] = 42] = "ko";
    Language[Language["ky"] = 43] = "ky";
    Language[Language["lo"] = 44] = "lo";
    Language[Language["lt"] = 45] = "lt";
    Language[Language["lv"] = 46] = "lv";
    Language[Language["mk"] = 47] = "mk";
    Language[Language["ml"] = 48] = "ml";
    Language[Language["mn"] = 49] = "mn";
    Language[Language["mr"] = 50] = "mr";
    Language[Language["ms"] = 51] = "ms";
    Language[Language["my"] = 52] = "my";
    Language[Language["ne"] = 53] = "ne";
    Language[Language["nl"] = 54] = "nl";
    Language[Language["no"] = 55] = "no";
    Language[Language["or"] = 56] = "or";
    Language[Language["pa"] = 57] = "pa";
    Language[Language["pl"] = 58] = "pl";
    Language[Language["pt-PT"] = 59] = "pt-PT";
    Language[Language["pt"] = 60] = "pt";
    Language[Language["ro"] = 61] = "ro";
    Language[Language["ru"] = 62] = "ru";
    Language[Language["si"] = 63] = "si";
    Language[Language["sk"] = 64] = "sk";
    Language[Language["sl"] = 65] = "sl";
    Language[Language["sq"] = 66] = "sq";
    Language[Language["sr-Latn"] = 67] = "sr-Latn";
    Language[Language["sr"] = 68] = "sr";
    Language[Language["sv"] = 69] = "sv";
    Language[Language["sw"] = 70] = "sw";
    Language[Language["ta"] = 71] = "ta";
    Language[Language["te"] = 72] = "te";
    Language[Language["th"] = 73] = "th";
    Language[Language["tr"] = 74] = "tr";
    Language[Language["uk"] = 75] = "uk";
    Language[Language["ur"] = 76] = "ur";
    Language[Language["uz"] = 77] = "uz";
    Language[Language["vi"] = 78] = "vi";
    Language[Language["zh"] = 79] = "zh";
    Language[Language["zh-HK"] = 80] = "zh-HK";
    Language[Language["zh-TW"] = 81] = "zh-TW";
    Language[Language["zu"] = 82] = "zu";
    /* eslint-enable @typescript-eslint/naming-convention */
    Language[Language["MAX_VALUE"] = 83] = "MAX_VALUE";
})(Language || (Language = {}));
export var ManifestSectionCodes;
(function (ManifestSectionCodes) {
    /* eslint-disable @typescript-eslint/naming-convention -- Indexed access. */
    ManifestSectionCodes[ManifestSectionCodes["OtherSection"] = 0] = "OtherSection";
    ManifestSectionCodes[ManifestSectionCodes["Identity"] = 1] = "Identity";
    ManifestSectionCodes[ManifestSectionCodes["Presentation"] = 2] = "Presentation";
    ManifestSectionCodes[ManifestSectionCodes["Protocol Handlers"] = 3] = "Protocol Handlers";
    ManifestSectionCodes[ManifestSectionCodes["Icons"] = 4] = "Icons";
    ManifestSectionCodes[ManifestSectionCodes["Window Controls Overlay"] = 5] = "Window Controls Overlay";
    /* eslint-enable @typescript-eslint/naming-convention */
    ManifestSectionCodes[ManifestSectionCodes["MAX_VALUE"] = 6] = "MAX_VALUE";
})(ManifestSectionCodes || (ManifestSectionCodes = {}));
//# sourceMappingURL=UserMetrics.js.map