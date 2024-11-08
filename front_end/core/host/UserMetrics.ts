/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import {InspectorFrontendHostInstance} from './InspectorFrontendHost.js';
import {EnumeratedHistogram} from './InspectorFrontendHostAPI.js';

export class UserMetrics {
  #panelChangedSinceLaunch: boolean;
  #firedLaunchHistogram: boolean;
  #launchPanelName: string;
  constructor() {
    this.#panelChangedSinceLaunch = false;
    this.#firedLaunchHistogram = false;
    this.#launchPanelName = '';
  }

  panelShown(panelName: string, isLaunching?: boolean): void {
    const code = PanelCodes[panelName as keyof typeof PanelCodes] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.PanelShown, code, PanelCodes.MAX_VALUE);
    InspectorFrontendHostInstance.recordUserMetricsAction('DevTools_PanelShown_' + panelName);
    // Store that the user has changed the panel so we know launch histograms should not be fired.
    if (!isLaunching) {
      this.#panelChangedSinceLaunch = true;
    }
  }

  panelShownInLocation(panelName: string, location: 'main'|'drawer'): void {
    const panelWithLocationName = `${panelName}-${location}`;
    const panelWithLocation = PanelWithLocation[panelWithLocationName as keyof typeof PanelWithLocation] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.PanelShownInLocation,
        panelWithLocation,
        PanelWithLocation.MAX_VALUE,
    );
  }

  settingsPanelShown(settingsViewId: string): void {
    this.panelShown('settings-' + settingsViewId);
  }

  sourcesPanelFileDebugged(mediaType?: string): void {
    const code = (mediaType && MediaTypes[mediaType as keyof typeof MediaTypes]) || MediaTypes.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.SourcesPanelFileDebugged, code, MediaTypes.MAX_VALUE);
  }

  sourcesPanelFileOpened(mediaType?: string): void {
    const code = (mediaType && MediaTypes[mediaType as keyof typeof MediaTypes]) || MediaTypes.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.SourcesPanelFileOpened, code, MediaTypes.MAX_VALUE);
  }

  networkPanelResponsePreviewOpened(mediaType: string): void {
    const code = (mediaType && MediaTypes[mediaType as keyof typeof MediaTypes]) || MediaTypes.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.NetworkPanelResponsePreviewOpened, code, MediaTypes.MAX_VALUE);
  }

  actionTaken(action: Action): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.ActionTaken, action, Action.MAX_VALUE);
  }

  panelLoaded(panelName: string, histogramName: string): void {
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

  setLaunchPanel(panelName: string|null): void {
    this.#launchPanelName = (panelName as string);
  }

  performanceTraceLoad(measure: PerformanceMeasure): void {
    InspectorFrontendHostInstance.recordPerformanceHistogram('DevTools.TraceLoad', measure.duration);
  }

  keybindSetSettingChanged(keybindSet: string): void {
    const value = KeybindSetSettings[keybindSet as keyof typeof KeybindSetSettings] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.KeybindSetSettingChanged, value, KeybindSetSettings.MAX_VALUE);
  }

  keyboardShortcutFired(actionId: string): void {
    const action =
        KeyboardShortcutAction[actionId as keyof typeof KeyboardShortcutAction] || KeyboardShortcutAction.OtherShortcut;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.KeyboardShortcutFired, action, KeyboardShortcutAction.MAX_VALUE);
  }

  issuesPanelOpenedFrom(issueOpener: IssueOpener): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.IssuesPanelOpenedFrom, issueOpener, IssueOpener.MAX_VALUE);
  }

  issuesPanelIssueExpanded(issueExpandedCategory: string|undefined): void {
    if (issueExpandedCategory === undefined) {
      return;
    }

    const issueExpanded = IssueExpanded[issueExpandedCategory as keyof typeof IssueExpanded];

    if (issueExpanded === undefined) {
      return;
    }

    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.IssuesPanelIssueExpanded, issueExpanded, IssueExpanded.MAX_VALUE);
  }

  issuesPanelResourceOpened(issueCategory: string, type: string): void {
    const key = issueCategory + type;
    const value = IssueResourceOpened[key as keyof typeof IssueResourceOpened];

    if (value === undefined) {
      return;
    }

    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.IssuesPanelResourceOpened, value, IssueResourceOpened.MAX_VALUE);
  }

  issueCreated(code: string): void {
    const issueCreated = IssueCreated[code as keyof typeof IssueCreated];
    if (issueCreated === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.IssueCreated, issueCreated, IssueCreated.MAX_VALUE);
  }

  experimentEnabledAtLaunch(experimentId: string): void {
    const experiment = DevtoolsExperiments[experimentId as keyof typeof DevtoolsExperiments];
    if (experiment === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ExperimentEnabledAtLaunch, experiment, DevtoolsExperiments.MAX_VALUE);
  }

  experimentDisabledAtLaunch(experimentId: string): void {
    const experiment = DevtoolsExperiments[experimentId as keyof typeof DevtoolsExperiments];
    if (experiment === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ExperimentDisabledAtLaunch, experiment, DevtoolsExperiments.MAX_VALUE);
  }

  experimentChanged(experimentId: string, isEnabled: boolean): void {
    const experiment = DevtoolsExperiments[experimentId as keyof typeof DevtoolsExperiments];
    if (experiment === undefined) {
      return;
    }
    const actionName = isEnabled ? EnumeratedHistogram.ExperimentEnabled : EnumeratedHistogram.ExperimentDisabled;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(actionName, experiment, DevtoolsExperiments.MAX_VALUE);
  }

  developerResourceLoaded(developerResourceLoaded: DeveloperResourceLoaded): void {
    if (developerResourceLoaded >= DeveloperResourceLoaded.MAX_VALUE) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.DeveloperResourceLoaded, developerResourceLoaded, DeveloperResourceLoaded.MAX_VALUE);
  }

  developerResourceScheme(developerResourceScheme: DeveloperResourceScheme): void {
    if (developerResourceScheme >= DeveloperResourceScheme.MAX_VALUE) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.DeveloperResourceScheme, developerResourceScheme, DeveloperResourceScheme.MAX_VALUE);
  }

  language(language: Intl.UnicodeBCP47LocaleIdentifier): void {
    const languageCode = Language[language as keyof typeof Language];
    if (languageCode === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.Language, languageCode, Language.MAX_VALUE);
  }

  syncSetting(devtoolsSyncSettingEnabled: boolean): void {
    InspectorFrontendHostInstance.getSyncInformation(syncInfo => {
      let settingValue = SyncSetting.CHROME_SYNC_DISABLED;
      if (syncInfo.isSyncActive && !syncInfo.arePreferencesSynced) {
        settingValue = SyncSetting.CHROME_SYNC_SETTINGS_DISABLED;
      } else if (syncInfo.isSyncActive && syncInfo.arePreferencesSynced) {
        settingValue = devtoolsSyncSettingEnabled ? SyncSetting.DEVTOOLS_SYNC_SETTING_ENABLED :
                                                    SyncSetting.DEVTOOLS_SYNC_SETTING_DISABLED;
      }

      InspectorFrontendHostInstance.recordEnumeratedHistogram(
          EnumeratedHistogram.SyncSetting, settingValue, SyncSetting.MAX_VALUE);
    });
  }

  recordingAssertion(value: RecordingAssertion): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingAssertion, value, RecordingAssertion.MAX_VALUE);
  }

  recordingToggled(value: RecordingToggled): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingToggled, value, RecordingToggled.MAX_VALUE);
  }

  recordingReplayFinished(value: RecordingReplayFinished): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingReplayFinished, value, RecordingReplayFinished.MAX_VALUE);
  }

  recordingReplaySpeed(value: RecordingReplaySpeed): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingReplaySpeed, value, RecordingReplaySpeed.MAX_VALUE);
  }

  recordingReplayStarted(value: RecordingReplayStarted): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingReplayStarted, value, RecordingReplayStarted.MAX_VALUE);
  }

  recordingEdited(value: RecordingEdited): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingEdited, value, RecordingEdited.MAX_VALUE);
  }

  recordingExported(value: RecordingExported): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingExported, value, RecordingExported.MAX_VALUE);
  }

  recordingCodeToggled(value: RecordingCodeToggled): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingCodeToggled, value, RecordingCodeToggled.MAX_VALUE);
  }

  recordingCopiedToClipboard(value: RecordingCopiedToClipboard): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingCopiedToClipboard, value, RecordingCopiedToClipboard.MAX_VALUE);
  }

  styleTextCopied(value: StyleTextCopied): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.StyleTextCopied, value, StyleTextCopied.MAX_VALUE);
  }

  manifestSectionSelected(sectionTitle: string): void {
    const code =
        ManifestSectionCodes[sectionTitle as keyof typeof ManifestSectionCodes] || ManifestSectionCodes.OtherSection;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ManifestSectionSelected, code, ManifestSectionCodes.MAX_VALUE);
  }

  cssHintShown(type: CSSHintType): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.CSSHintShown, type, CSSHintType.MAX_VALUE);
  }

  lighthouseModeRun(type: LighthouseModeRun): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.LighthouseModeRun, type, LighthouseModeRun.MAX_VALUE);
  }

  lighthouseCategoryUsed(type: LighthouseCategoryUsed): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.LighthouseCategoryUsed, type, LighthouseCategoryUsed.MAX_VALUE);
  }

  cssPropertyDocumentation(type: CSSPropertyDocumentation): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.CSSPropertyDocumentation, type, CSSPropertyDocumentation.MAX_VALUE);
  }

  swatchActivated(swatch: SwatchType): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.SwatchActivated, swatch, SwatchType.MAX_VALUE);
  }

  animationPlaybackRateChanged(playbackRate: AnimationsPlaybackRate): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.AnimationPlaybackRateChanged, playbackRate, AnimationsPlaybackRate.MAX_VALUE);
  }

  animationPointDragged(dragType: AnimationPointDragType): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.AnimationPointDragged, dragType, AnimationPointDragType.MAX_VALUE);
  }

  workspacesPopulated(wallClockTimeInMilliseconds: number): void {
    InspectorFrontendHostInstance.recordPerformanceHistogram(
        'DevTools.Workspaces.PopulateWallClocktime', wallClockTimeInMilliseconds);
  }

  visualLoggingProcessingDone(timeInMilliseconds: number): void {
    InspectorFrontendHostInstance.recordPerformanceHistogram(
        'DevTools.VisualLogging.ProcessingTime', timeInMilliseconds);
  }

  legacyResourceTypeFilterNumberOfSelectedChanged(itemCount: number): void {
    const boundItemCount = Math.max(Math.min(itemCount, ResourceType.MAX_VALUE - 1), 1);
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.LegacyResourceTypeFilterNumberOfSelectedChanged, boundItemCount, ResourceType.MAX_VALUE);
  }

  legacyResourceTypeFilterItemSelected(resourceTypeName: string): void {
    const resourceType = ResourceType[resourceTypeName as keyof typeof ResourceType];
    if (resourceType === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.LegacyResourceTypeFilterItemSelected, resourceType, ResourceType.MAX_VALUE);
  }

  resourceTypeFilterNumberOfSelectedChanged(itemCount: number): void {
    const boundItemCount = Math.max(Math.min(itemCount, ResourceType.MAX_VALUE - 1), 1);
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ResourceTypeFilterNumberOfSelectedChanged, boundItemCount, ResourceType.MAX_VALUE);
  }

  resourceTypeFilterItemSelected(resourceTypeName: string): void {
    const resourceType = ResourceType[resourceTypeName as keyof typeof ResourceType];
    if (resourceType === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ResourceTypeFilterItemSelected, resourceType, ResourceType.MAX_VALUE);
  }

  freestylerQueryLength(numberOfCharacters: number): void {
    InspectorFrontendHostInstance.recordCountHistogram(
        'DevTools.Freestyler.QueryLength', numberOfCharacters, 0, 100_000, 100);
  }

  freestylerEvalResponseSize(bytes: number): void {
    InspectorFrontendHostInstance.recordCountHistogram('DevTools.Freestyler.EvalResponseSize', bytes, 0, 100_000, 100);
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

// Codes below are used to collect UMA histograms in the Chromium port.
// Do not change the values below, additional actions are needed on the Chromium side
// in order to add more codes.
export enum Action {
  /* eslint-disable @typescript-eslint/naming-convention */
  WindowDocked = 1,
  WindowUndocked = 2,
  ScriptsBreakpointSet = 3,
  TimelineStarted = 4,
  ProfilesCPUProfileTaken = 5,
  ProfilesHeapProfileTaken = 6,
  ConsoleEvaluated = 8,
  FileSavedInWorkspace = 9,
  DeviceModeEnabled = 10,
  AnimationsPlaybackRateChanged = 11,
  RevisionApplied = 12,
  FileSystemDirectoryContentReceived = 13,
  StyleRuleEdited = 14,
  CommandEvaluatedInConsolePanel = 15,
  DOMPropertiesExpanded = 16,
  ResizedViewInResponsiveMode = 17,
  TimelinePageReloadStarted = 18,
  ConnectToNodeJSFromFrontend = 19,
  ConnectToNodeJSDirectly = 20,
  CpuThrottlingEnabled = 21,
  CpuProfileNodeFocused = 22,
  CpuProfileNodeExcluded = 23,
  SelectFileFromFilePicker = 24,
  SelectCommandFromCommandMenu = 25,
  ChangeInspectedNodeInElementsPanel = 26,
  StyleRuleCopied = 27,
  CoverageStarted = 28,
  LighthouseStarted = 29,
  LighthouseFinished = 30,
  ShowedThirdPartyBadges = 31,
  LighthouseViewTrace = 32,
  FilmStripStartedRecording = 33,
  CoverageReportFiltered = 34,
  CoverageStartedPerBlock = 35,
  'SettingsOpenedFromGear-deprecated' = 36,
  'SettingsOpenedFromMenu-deprecated' = 37,
  'SettingsOpenedFromCommandMenu-deprecated' = 38,
  TabMovedToDrawer = 39,
  TabMovedToMainPanel = 40,
  CaptureCssOverviewClicked = 41,
  VirtualAuthenticatorEnvironmentEnabled = 42,
  SourceOrderViewActivated = 43,
  UserShortcutAdded = 44,
  ShortcutRemoved = 45,
  ShortcutModified = 46,
  CustomPropertyLinkClicked = 47,
  CustomPropertyEdited = 48,
  ServiceWorkerNetworkRequestClicked = 49,
  ServiceWorkerNetworkRequestClosedQuickly = 50,
  NetworkPanelServiceWorkerRespondWith = 51,
  NetworkPanelCopyValue = 52,
  ConsoleSidebarOpened = 53,
  PerfPanelTraceImported = 54,
  PerfPanelTraceExported = 55,
  StackFrameRestarted = 56,
  CaptureTestProtocolClicked = 57,
  BreakpointRemovedFromRemoveButton = 58,
  BreakpointGroupExpandedStateChanged = 59,
  HeaderOverrideFileCreated = 60,
  HeaderOverrideEnableEditingClicked = 61,
  HeaderOverrideHeaderAdded = 62,
  HeaderOverrideHeaderEdited = 63,
  HeaderOverrideHeaderRemoved = 64,
  HeaderOverrideHeadersFileEdited = 65,
  PersistenceNetworkOverridesEnabled = 66,
  PersistenceNetworkOverridesDisabled = 67,
  BreakpointRemovedFromContextMenu = 68,
  BreakpointsInFileRemovedFromRemoveButton = 69,
  BreakpointsInFileRemovedFromContextMenu = 70,
  BreakpointsInFileCheckboxToggled = 71,
  BreakpointsInFileEnabledDisabledFromContextMenu = 72,
  BreakpointConditionEditedFromSidebar = 73,
  WorkspaceTabAddFolder = 74,
  WorkspaceTabRemoveFolder = 75,
  OverrideTabAddFolder = 76,
  OverrideTabRemoveFolder = 77,
  WorkspaceSourceSelected = 78,
  OverridesSourceSelected = 79,
  StyleSheetInitiatorLinkClicked = 80,
  BreakpointRemovedFromGutterContextMenu = 81,
  BreakpointRemovedFromGutterToggle = 82,
  StylePropertyInsideKeyframeEdited = 83,
  OverrideContentFromSourcesContextMenu = 84,
  OverrideContentFromNetworkContextMenu = 85,
  OverrideScript = 86,
  OverrideStyleSheet = 87,
  OverrideDocument = 88,
  OverrideFetchXHR = 89,
  OverrideImage = 90,
  OverrideFont = 91,
  OverrideContentContextMenuSetup = 92,
  OverrideContentContextMenuAbandonSetup = 93,
  OverrideContentContextMenuActivateDisabled = 94,
  OverrideContentContextMenuOpenExistingFile = 95,
  OverrideContentContextMenuSaveNewFile = 96,
  ShowAllOverridesFromSourcesContextMenu = 97,
  ShowAllOverridesFromNetworkContextMenu = 98,
  AnimationGroupsCleared = 99,
  AnimationsPaused = 100,
  AnimationsResumed = 101,
  AnimatedNodeDescriptionClicked = 102,
  AnimationGroupScrubbed = 103,
  AnimationGroupReplayed = 104,
  OverrideTabDeleteFolderContextMenu = 105,
  WorkspaceDropFolder = 107,
  WorkspaceSelectFolder = 108,
  OverrideContentContextMenuSourceMappedWarning = 109,
  OverrideContentContextMenuRedirectToDeployed = 110,
  NewStyleRuleAdded = 111,
  TraceExpanded = 112,
  InsightConsoleMessageShown = 113,
  InsightRequestedViaContextMenu = 114,
  InsightRequestedViaHoverButton = 115,
  InsightRatedPositive = 117,
  InsightRatedNegative = 118,
  InsightClosed = 119,
  InsightErrored = 120,
  InsightHoverButtonShown = 121,
  SelfXssWarningConsoleMessageShown = 122,
  SelfXssWarningDialogShown = 123,
  SelfXssAllowPastingInConsole = 124,
  SelfXssAllowPastingInDialog = 125,
  ToggleEmulateFocusedPageFromStylesPaneOn = 126,
  ToggleEmulateFocusedPageFromStylesPaneOff = 127,
  ToggleEmulateFocusedPageFromRenderingTab = 128,
  ToggleEmulateFocusedPageFromCommandMenu = 129,
  InsightGenerated = 130,
  InsightErroredApi = 131,
  InsightErroredMarkdown = 132,
  ToggleShowWebVitals = 133,
  InsightErroredPermissionDenied = 134,
  InsightErroredCannotSend = 135,
  InsightErroredRequestFailed = 136,
  InsightErroredCannotParseChunk = 137,
  InsightErroredUnknownChunk = 138,
  InsightErroredOther = 139,
  AutofillReceived = 140,
  AutofillReceivedAndTabAutoOpened = 141,
  AnimationGroupSelected = 142,
  ScrollDrivenAnimationGroupSelected = 143,
  ScrollDrivenAnimationGroupScrubbed = 144,
  FreestylerOpenedFromElementsPanel = 145,
  FreestylerOpenedFromStylesTab = 146,
  ConsoleFilterByContext = 147,
  ConsoleFilterBySource = 148,
  ConsoleFilterByUrl = 149,
  InsightConsentReminderShown = 150,
  InsightConsentReminderCanceled = 151,
  InsightConsentReminderConfirmed = 152,
  InsightsOnboardingShown = 153,
  InsightsOnboardingCanceledOnPage1 = 154,
  InsightsOnboardingCanceledOnPage2 = 155,
  InsightsOnboardingConfirmed = 156,
  InsightsOnboardingNextPage = 157,
  InsightsOnboardingPrevPage = 158,
  InsightsOnboardingFeatureDisabled = 159,
  InsightsOptInTeaserShown = 160,
  InsightsOptInTeaserSettingsLinkClicked = 161,
  InsightsOptInTeaserConfirmedInSettings = 162,
  InsightsReminderTeaserShown = 163,
  InsightsReminderTeaserConfirmed = 164,
  InsightsReminderTeaserCanceled = 165,
  InsightsReminderTeaserSettingsLinkClicked = 166,
  InsightsReminderTeaserAbortedInSettings = 167,
  GeneratingInsightWithoutDisclaimer = 168,
  FreestylerOpenedFromElementsPanelFloatingButton = 169,
  DrJonesOpenedFromNetworkPanel = 170,
  DrJonesOpenedFromSourcesPanel = 171,
  DrJonesOpenedFromSourcesPanelFloatingButton = 172,
  DrJonesOpenedFromPerformancePanel = 173,
  DrJonesOpenedFromNetworkPanelFloatingButton = 174,
  AiAssistancePanelOpened = 175,
  AiAssistanceQuerySubmitted = 176,
  AiAssistanceAnswerReceived = 177,
  AiAssistanceDynamicSuggestionClicked = 178,
  AiAssistanceSideEffectConfirmed = 179,
  AiAssistanceSideEffectRejected = 180,
  AiAssistanceError = 181,
  MAX_VALUE = 182,
  /* eslint-enable @typescript-eslint/naming-convention */
}

export enum PanelCodes {
  /* eslint-disable @typescript-eslint/naming-convention */
  elements = 1,
  resources = 2,
  network = 3,
  sources = 4,
  timeline = 5,
  'heap-profiler' = 6,
  console = 8,
  layers = 9,
  'console-view' = 10,
  'animations' = 11,
  'network.config' = 12,
  'rendering' = 13,
  'sensors' = 14,
  'sources.search' = 15,
  security = 16,
  'js-profiler' = 17,
  lighthouse = 18,
  'coverage' = 19,
  'protocol-monitor' = 20,
  'remote-devices' = 21,
  'web-audio' = 22,
  'changes.changes' = 23,
  'performance.monitor' = 24,
  'release-note' = 25,
  'live-heap-profile' = 26,
  'sources.quick' = 27,
  'network.blocked-urls' = 28,
  'settings-preferences' = 29,
  'settings-workspace' = 30,
  'settings-experiments' = 31,
  'settings-blackbox' = 32,
  'settings-devices' = 33,
  'settings-throttling-conditions' = 34,
  'settings-emulation-locations' = 35,
  'settings-shortcuts' = 36,
  'issues-pane' = 37,
  'settings-keybinds' = 38,
  'cssoverview' = 39,
  'chrome-recorder' = 40,
  'trust-tokens' = 41,
  'reporting-api' = 42,
  'interest-groups' = 43,
  'back-forward-cache' = 44,
  'service-worker-cache' = 45,
  'background-service-background-fetch' = 46,
  'background-service-background-sync' = 47,
  'background-service-push-messaging' = 48,
  'background-service-notifications' = 49,
  'background-service-payment-handler' = 50,
  'background-service-periodic-background-sync' = 51,
  'service-workers' = 52,
  'app-manifest' = 53,
  'storage' = 54,
  'cookies' = 55,
  'frame-details' = 56,
  'frame-resource' = 57,
  'frame-window' = 58,
  'frame-worker' = 59,
  'dom-storage' = 60,
  'indexed-db' = 61,
  'web-sql' = 62,
  'performance-insights' = 63,
  'preloading' = 64,
  'bounce-tracking-mitigations' = 65,
  'developer-resources' = 66,
  'autofill-view' = 67,
  /* eslint-enable @typescript-eslint/naming-convention */
  MAX_VALUE = 68,
}

export enum PanelWithLocation {
  /* eslint-disable @typescript-eslint/naming-convention */
  'elements-main' = 1,
  'elements-drawer' = 2,
  'resources-main' = 3,
  'resources-drawer' = 4,
  'network-main' = 5,
  'network-drawer' = 6,
  'sources-main' = 7,
  'sources-drawer' = 8,
  'timeline-main' = 9,
  'timeline-drawer' = 10,
  'heap_profiler-main' = 11,
  'heap_profiler-drawer' = 12,
  'console-main' = 13,
  'console-drawer' = 14,
  'layers-main' = 15,
  'layers-drawer' = 16,
  'console-view-main' = 17,
  'console-view-drawer' = 18,
  'animations-main' = 19,
  'animations-drawer' = 20,
  'network.config-main' = 21,
  'network.config-drawer' = 22,
  'rendering-main' = 23,
  'rendering-drawer' = 24,
  'sensors-main' = 25,
  'sensors-drawer' = 26,
  'sources.search-main' = 27,
  'sources.search-drawer' = 28,
  'security-main' = 29,
  'security-drawer' = 30,
  'lighthouse-main' = 33,
  'lighthouse-drawer' = 34,
  'coverage-main' = 35,
  'coverage-drawer' = 36,
  'protocol-monitor-main' = 37,
  'protocol-monitor-drawer' = 38,
  'remote-devices-main' = 39,
  'remote-devices-drawer' = 40,
  'web-audio-main' = 41,
  'web-audio-drawer' = 42,
  'changes.changes-main' = 43,
  'changes.changes-drawer' = 44,
  'performance.monitor-main' = 45,
  'performance.monitor-drawer' = 46,
  'release-note-main' = 47,
  'release-note-drawer' = 48,
  'live_heap_profile-main' = 49,
  'live_heap_profile-drawer' = 50,
  'sources.quick-main' = 51,
  'sources.quick-drawer' = 52,
  'network.blocked-urls-main' = 53,
  'network.blocked-urls-drawer' = 54,
  'settings-preferences-main' = 55,
  'settings-preferences-drawer' = 56,
  'settings-workspace-main' = 57,
  'settings-workspace-drawer' = 58,
  'settings-experiments-main' = 59,
  'settings-experiments-drawer' = 60,
  'settings-blackbox-main' = 61,
  'settings-blackbox-drawer' = 62,
  'settings-devices-main' = 63,
  'settings-devices-drawer' = 64,
  'settings-throttling-conditions-main' = 65,
  'settings-throttling-conditions-drawer' = 66,
  'settings-emulation-locations-main' = 67,
  'settings-emulation-locations-drawer' = 68,
  'settings-shortcuts-main' = 69,
  'settings-shortcuts-drawer' = 70,
  'issues-pane-main' = 71,
  'issues-pane-drawer' = 72,
  'settings-keybinds-main' = 73,
  'settings-keybinds-drawer' = 74,
  'cssoverview-main' = 75,
  'cssoverview-drawer' = 76,
  'chrome_recorder-main' = 77,
  'chrome_recorder-drawer' = 78,
  'trust_tokens-main' = 79,
  'trust_tokens-drawer' = 80,
  'reporting_api-main' = 81,
  'reporting_api-drawer' = 82,
  'interest_groups-main' = 83,
  'interest_groups-drawer' = 84,
  'back_forward_cache-main' = 85,
  'back_forward_cache-drawer' = 86,
  'service_worker_cache-main' = 87,
  'service_worker_cache-drawer' = 88,
  'background_service_backgroundFetch-main' = 89,
  'background_service_backgroundFetch-drawer' = 90,
  'background_service_backgroundSync-main' = 91,
  'background_service_backgroundSync-drawer' = 92,
  'background_service_pushMessaging-main' = 93,
  'background_service_pushMessaging-drawer' = 94,
  'background_service_notifications-main' = 95,
  'background_service_notifications-drawer' = 96,
  'background_service_paymentHandler-main' = 97,
  'background_service_paymentHandler-drawer' = 98,
  'background_service_periodicBackgroundSync-main' = 99,
  'background_service_periodicBackgroundSync-drawer' = 100,
  'service_workers-main' = 101,
  'service_workers-drawer' = 102,
  'app_manifest-main' = 103,
  'app_manifest-drawer' = 104,
  'storage-main' = 105,
  'storage-drawer' = 106,
  'cookies-main' = 107,
  'cookies-drawer' = 108,
  'frame_details-main' = 109,
  'frame_details-drawer' = 110,
  'frame_resource-main' = 111,
  'frame_resource-drawer' = 112,
  'frame_window-main' = 113,
  'frame_window-drawer' = 114,
  'frame_worker-main' = 115,
  'frame_worker-drawer' = 116,
  'dom_storage-main' = 117,
  'dom_storage-drawer' = 118,
  'indexed_db-main' = 119,
  'indexed_db-drawer' = 120,
  'web_sql-main' = 121,
  'web_sql-drawer' = 122,
  'performance_insights-main' = 123,
  'performance_insights-drawer' = 124,
  'preloading-main' = 125,
  'preloading-drawer' = 126,
  'bounce_tracking_mitigations-main' = 127,
  'bounce_tracking_mitigations-drawer' = 128,
  'developer-resources-main' = 129,
  'developer-resources-drawer' = 130,
  'autofill-view-main' = 131,
  'autofill-view-drawer' = 132,
  /* eslint-enable @typescript-eslint/naming-convention */
  MAX_VALUE = 133,
}

export enum ElementsSidebarTabCodes {
  /* eslint-disable @typescript-eslint/naming-convention */
  'OtherSidebarPane' = 0,
  'styles' = 1,
  'computed' = 2,
  'elements.layout' = 3,
  'elements.event-listeners' = 4,
  'elements.dom-breakpoints' = 5,
  'elements.dom-properties' = 6,
  'accessibility.view' = 7,
  /* eslint-enable @typescript-eslint/naming-convention */
  MAX_VALUE = 8,
}

export enum MediaTypes {
  /* eslint-disable @typescript-eslint/naming-convention */
  Unknown = 0,
  'text/css' = 2,
  'text/html' = 3,
  'application/xml' = 4,
  'application/wasm' = 5,
  'application/manifest+json' = 6,
  'application/x-aspx' = 7,
  'application/jsp' = 8,
  'text/x-c++src' = 9,
  'text/x-coffeescript' = 10,
  'application/vnd.dart' = 11,
  'text/typescript' = 12,
  'text/typescript-jsx' = 13,
  'application/json' = 14,
  'text/x-csharp' = 15,
  'text/x-java' = 16,
  'text/x-less' = 17,
  'application/x-httpd-php' = 18,
  'text/x-python' = 19,
  'text/x-sh' = 20,
  'text/x-gss' = 21,
  'text/x-sass' = 22,
  'text/x-scss' = 23,
  'text/markdown' = 24,
  'text/x-clojure' = 25,
  'text/jsx' = 26,
  'text/x-go' = 27,
  'text/x-kotlin' = 28,
  'text/x-scala' = 29,
  'text/x.svelte' = 30,
  'text/javascript+plain' = 31,
  'text/javascript+minified' = 32,
  'text/javascript+sourcemapped' = 33,
  'text/x.angular' = 34,
  'text/x.vue' = 35,
  'text/javascript+snippet' = 36,
  'text/javascript+eval' = 37,  // Scripts resulting from console inputs or page "eval"s with no sourceUrl comment.
  /* eslint-enable @typescript-eslint/naming-convention */
  MAX_VALUE = 38,
}

export enum KeybindSetSettings {
  /* eslint-disable @typescript-eslint/naming-convention */
  'devToolsDefault' = 0,
  'vsCode' = 1,
  /* eslint-enable @typescript-eslint/naming-convention */
  MAX_VALUE = 2,
}

export enum KeyboardShortcutAction {
  /* eslint-disable @typescript-eslint/naming-convention */
  OtherShortcut = 0,
  'quick-open.show-command-menu' = 1,
  'console.clear' = 2,
  'console.toggle' = 3,
  'debugger.step' = 4,
  'debugger.step-into' = 5,
  'debugger.step-out' = 6,
  'debugger.step-over' = 7,
  'debugger.toggle-breakpoint' = 8,
  'debugger.toggle-breakpoint-enabled' = 9,
  'debugger.toggle-pause' = 10,
  'elements.edit-as-html' = 11,
  'elements.hide-element' = 12,
  'elements.redo' = 13,
  'elements.toggle-element-search' = 14,
  'elements.undo' = 15,
  'main.search-in-panel.find' = 16,
  'main.toggle-drawer' = 17,
  'network.hide-request-details' = 18,
  'network.search' = 19,
  'network.toggle-recording' = 20,
  'quick-open.show' = 21,
  'settings.show' = 22,
  'sources.search' = 23,
  'background-service.toggle-recording' = 24,
  'components.collect-garbage' = 25,
  'console.clear.history' = 26,
  'console.create-pin' = 27,
  'coverage.start-with-reload' = 28,
  'coverage.toggle-recording' = 29,
  'debugger.breakpoint-input-window' = 30,
  'debugger.evaluate-selection' = 31,
  'debugger.next-call-frame' = 32,
  'debugger.previous-call-frame' = 33,
  'debugger.run-snippet' = 34,
  'debugger.toggle-breakpoints-active' = 35,
  'elements.capture-area-screenshot' = 36,
  'emulation.capture-full-height-screenshot' = 37,
  'emulation.capture-node-screenshot' = 38,
  'emulation.capture-screenshot' = 39,
  'emulation.show-sensors' = 40,
  'emulation.toggle-device-mode' = 41,
  'help.release-notes' = 42,
  'help.report-issue' = 43,
  'input.start-replaying' = 44,
  'input.toggle-pause' = 45,
  'input.toggle-recording' = 46,
  'inspector-main.focus-debuggee' = 47,
  'inspector-main.hard-reload' = 48,
  'inspector-main.reload' = 49,
  'live-heap-profile.start-with-reload' = 50,
  'live-heap-profile.toggle-recording' = 51,
  'main.debug-reload' = 52,
  'main.next-tab' = 53,
  'main.previous-tab' = 54,
  'main.search-in-panel.cancel' = 55,
  'main.search-in-panel.find-next' = 56,
  'main.search-in-panel.find-previous' = 57,
  'main.toggle-dock' = 58,
  'main.zoom-in' = 59,
  'main.zoom-out' = 60,
  'main.zoom-reset' = 61,
  'network-conditions.network-low-end-mobile' = 62,
  'network-conditions.network-mid-tier-mobile' = 63,
  'network-conditions.network-offline' = 64,
  'network-conditions.network-online' = 65,
  'profiler.heap-toggle-recording' = 66,
  'profiler.js-toggle-recording' = 67,
  'resources.clear' = 68,
  'settings.documentation' = 69,
  'settings.shortcuts' = 70,
  'sources.add-folder-to-workspace' = 71,
  'sources.add-to-watch' = 72,
  'sources.close-all' = 73,
  'sources.close-editor-tab' = 74,
  'sources.create-snippet' = 75,
  'sources.go-to-line' = 76,
  'sources.go-to-member' = 77,
  'sources.jump-to-next-location' = 78,
  'sources.jump-to-previous-location' = 79,
  'sources.rename' = 80,
  'sources.save' = 81,
  'sources.save-all' = 82,
  'sources.switch-file' = 83,
  'timeline.jump-to-next-frame' = 84,
  'timeline.jump-to-previous-frame' = 85,
  'timeline.load-from-file' = 86,
  'timeline.next-recording' = 87,
  'timeline.previous-recording' = 88,
  'timeline.record-reload' = 89,
  'timeline.save-to-file' = 90,
  'timeline.show-history' = 91,
  'timeline.toggle-recording' = 92,
  'sources.increment-css' = 93,
  'sources.increment-css-by-ten' = 94,
  'sources.decrement-css' = 95,
  'sources.decrement-css-by-ten' = 96,
  'layers.reset-view' = 97,
  'layers.pan-mode' = 98,
  'layers.rotate-mode' = 99,
  'layers.zoom-in' = 100,
  'layers.zoom-out' = 101,
  'layers.up' = 102,
  'layers.down' = 103,
  'layers.left' = 104,
  'layers.right' = 105,
  'help.report-translation-issue' = 106,
  'rendering.toggle-prefers-color-scheme' = 107,
  'chrome-recorder.start-recording' = 108,
  'chrome-recorder.replay-recording' = 109,
  'chrome-recorder.toggle-code-view' = 110,
  'chrome-recorder.copy-recording-or-step' = 111,
  'changes.revert' = 112,
  'changes.copy' = 113,
  'elements.new-style-rule' = 114,
  'elements.refresh-event-listeners' = 115,
  'coverage.clear' = 116,
  'coverage.export' = 117,
  /* eslint-enable @typescript-eslint/naming-convention */
  MAX_VALUE = 118,
}

export const enum IssueOpener {
  CONSOLE_INFO_BAR = 0,
  LEARN_MORE_LINK_COEP = 1,
  STATUS_BAR_ISSUES_COUNTER = 2,
  HAMBURGER_MENU = 3,
  ADORNER = 4,
  COMMAND_MENU = 5,
  MAX_VALUE = 6,
}

/**
 * This list should contain the currently active Devtools Experiments,
 * gaps are expected.
 */
export enum DevtoolsExperiments {
  /* eslint-disable @typescript-eslint/naming-convention */
  'capture-node-creation-stacks' = 1,
  'live-heap-profile' = 11,
  'protocol-monitor' = 13,
  'sampling-heap-profiler-timeline' = 17,
  'show-option-tp-expose-internals-in-heap-snapshot' = 18,
  'timeline-invalidation-tracking' = 26,
  'timeline-show-all-events' = 27,
  'timeline-v8-runtime-call-stats' = 28,
  'apca' = 39,
  'font-editor' = 41,
  'full-accessibility-tree' = 42,
  'contrast-issues' = 44,
  'experimental-cookie-features' = 45,
  'styles-pane-css-changes' = 55,
  'instrumentation-breakpoints' = 61,
  'authored-deployed-grouping' = 63,
  'just-my-code' = 65,
  'highlight-errors-elements-panel' = 73,
  'use-source-map-scopes' = 76,
  'network-panel-filter-bar-redesign' = 79,
  'autofill-view' = 82,
  'css-type-component-length-deprecate' = 85,
  'timeline-show-postmessage-events' = 86,
  'timeline-enhanced-traces' = 90,
  'timeline-compiled-sources' = 91,
  'timeline-debug-mode' = 93,
  'perf-panel-annotations' = 94,
  'timeline-rpp-sidebar' = 95,
  'timeline-observations' = 96,
  'timeline-server-timings' = 98,
  'floating-entry-points-for-ai-assistance' = 101,
  'timeline-experimental-insights' = 102,
  'timeline-dim-unrelated-events' = 103,
  'timeline-alternative-navigation' = 104,
  /* eslint-enable @typescript-eslint/naming-convention */

  // Increment this when new experiments are added.
  MAX_VALUE = 105,
}

export const enum CSSPropertyDocumentation {
  SHOWN = 0,
  TOGGLED_ON = 1,
  TOGGLED_OFF = 2,
  MAX_VALUE = 3,
}

// Update DevToolsIssuesPanelIssueExpanded from tools/metrics/histograms/enums.xml if new enum is added.
export enum IssueExpanded {
  /* eslint-disable @typescript-eslint/naming-convention */
  CrossOriginEmbedderPolicy = 0,
  MixedContent = 1,
  SameSiteCookie = 2,
  HeavyAd = 3,
  ContentSecurityPolicy = 4,
  Other = 5,
  Generic = 6,
  ThirdPartyPhaseoutCookie = 7,
  GenericCookie = 8,
  /* eslint-enable @typescript-eslint/naming-convention */
  MAX_VALUE = 9,
}

export enum IssueResourceOpened {
  /* eslint-disable @typescript-eslint/naming-convention */
  CrossOriginEmbedderPolicyRequest = 0,
  CrossOriginEmbedderPolicyElement = 1,
  MixedContentRequest = 2,
  SameSiteCookieCookie = 3,
  SameSiteCookieRequest = 4,
  HeavyAdElement = 5,
  ContentSecurityPolicyDirective = 6,
  ContentSecurityPolicyElement = 7,
  /* eslint-enable @typescript-eslint/naming-convention */
  MAX_VALUE = 13,
}

/**
 * This list should contain the currently active issue types,
 * gaps are expected.
 */
export enum IssueCreated {
  /* eslint-disable @typescript-eslint/naming-convention */
  MixedContentIssue = 0,
  'ContentSecurityPolicyIssue::kInlineViolation' = 1,
  'ContentSecurityPolicyIssue::kEvalViolation' = 2,
  'ContentSecurityPolicyIssue::kURLViolation' = 3,
  'ContentSecurityPolicyIssue::kTrustedTypesSinkViolation' = 4,
  'ContentSecurityPolicyIssue::kTrustedTypesPolicyViolation' = 5,
  'HeavyAdIssue::NetworkTotalLimit' = 6,
  'HeavyAdIssue::CpuTotalLimit' = 7,
  'HeavyAdIssue::CpuPeakLimit' = 8,
  'CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader' = 9,
  'CrossOriginEmbedderPolicyIssue::CoopSandboxedIFrameCannotNavigateToCoopPage' = 10,
  'CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin' = 11,
  'CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep' = 12,
  'CrossOriginEmbedderPolicyIssue::CorpNotSameSite' = 13,
  'CookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie' = 14,
  'CookieIssue::ExcludeSameSiteNoneInsecure::SetCookie' = 15,
  'CookieIssue::WarnSameSiteNoneInsecure::ReadCookie' = 16,
  'CookieIssue::WarnSameSiteNoneInsecure::SetCookie' = 17,
  'CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Secure' = 18,
  'CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Insecure' = 19,
  'CookieIssue::WarnCrossDowngrade::ReadCookie::Secure' = 20,
  'CookieIssue::WarnCrossDowngrade::ReadCookie::Insecure' = 21,
  'CookieIssue::WarnCrossDowngrade::SetCookie::Secure' = 22,
  'CookieIssue::WarnCrossDowngrade::SetCookie::Insecure' = 23,
  'CookieIssue::ExcludeNavigationContextDowngrade::Secure' = 24,
  'CookieIssue::ExcludeNavigationContextDowngrade::Insecure' = 25,
  'CookieIssue::ExcludeContextDowngrade::ReadCookie::Secure' = 26,
  'CookieIssue::ExcludeContextDowngrade::ReadCookie::Insecure' = 27,
  'CookieIssue::ExcludeContextDowngrade::SetCookie::Secure' = 28,
  'CookieIssue::ExcludeContextDowngrade::SetCookie::Insecure' = 29,
  'CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie' = 30,
  'CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie' = 31,
  'CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie' = 32,
  'CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie' = 33,
  'CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie' = 34,
  'CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie' = 35,
  'SharedArrayBufferIssue::TransferIssue' = 36,
  'SharedArrayBufferIssue::CreationIssue' = 37,
  LowTextContrastIssue = 41,
  'CorsIssue::InsecurePrivateNetwork' = 42,
  'CorsIssue::InvalidHeaders' = 44,
  'CorsIssue::WildcardOriginWithCredentials' = 45,
  'CorsIssue::PreflightResponseInvalid' = 46,
  'CorsIssue::OriginMismatch' = 47,
  'CorsIssue::AllowCredentialsRequired' = 48,
  'CorsIssue::MethodDisallowedByPreflightResponse' = 49,
  'CorsIssue::HeaderDisallowedByPreflightResponse' = 50,
  'CorsIssue::RedirectContainsCredentials' = 51,
  'CorsIssue::DisallowedByMode' = 52,
  'CorsIssue::CorsDisabledScheme' = 53,
  'CorsIssue::PreflightMissingAllowExternal' = 54,
  'CorsIssue::PreflightInvalidAllowExternal' = 55,
  'CorsIssue::NoCorsRedirectModeNotFollow' = 57,
  'QuirksModeIssue::QuirksMode' = 58,
  'QuirksModeIssue::LimitedQuirksMode' = 59,
  DeprecationIssue = 60,
  'ClientHintIssue::MetaTagAllowListInvalidOrigin' = 61,
  'ClientHintIssue::MetaTagModifiedHTML' = 62,
  'CorsIssue::PreflightAllowPrivateNetworkError' = 63,
  'GenericIssue::CrossOriginPortalPostMessageError' = 64,
  'GenericIssue::FormLabelForNameError' = 65,
  'GenericIssue::FormDuplicateIdForInputError' = 66,
  'GenericIssue::FormInputWithNoLabelError' = 67,
  'GenericIssue::FormAutocompleteAttributeEmptyError' = 68,
  'GenericIssue::FormEmptyIdAndNameAttributesForInputError' = 69,
  'GenericIssue::FormAriaLabelledByToNonExistingId' = 70,
  'GenericIssue::FormInputAssignedAutocompleteValueToIdOrNameAttributeError' = 71,
  'GenericIssue::FormLabelHasNeitherForNorNestedInput' = 72,
  'GenericIssue::FormLabelForMatchesNonExistingIdError' = 73,
  'GenericIssue::FormHasPasswordFieldWithoutUsernameFieldError' = 74,
  'GenericIssue::FormInputHasWrongButWellIntendedAutocompleteValueError' = 75,
  'StylesheetLoadingIssue::LateImportRule' = 76,
  'StylesheetLoadingIssue::RequestFailed' = 77,
  'CorsIssue::PreflightMissingPrivateNetworkAccessId' = 78,
  'CorsIssue::PreflightMissingPrivateNetworkAccessName' = 79,
  'CorsIssue::PrivateNetworkAccessPermissionUnavailable' = 80,
  'CorsIssue::PrivateNetworkAccessPermissionDenied' = 81,
  'CookieIssue::WarnThirdPartyPhaseout::ReadCookie' = 82,
  'CookieIssue::WarnThirdPartyPhaseout::SetCookie' = 83,
  'CookieIssue::ExcludeThirdPartyPhaseout::ReadCookie' = 84,
  'CookieIssue::ExcludeThirdPartyPhaseout::SetCookie' = 85,
  /* eslint-enable @typescript-eslint/naming-convention */
  MAX_VALUE = 86,
}

export const enum DeveloperResourceLoaded {
  LOAD_THROUGH_PAGE_VIA_TARGET = 0,
  LOAD_THROUGH_PAGE_VIA_FRAME = 1,
  LOAD_THROUGH_PAGE_FAILURE = 2,
  LOAD_THROUGH_PAGE_FALLBACK = 3,
  FALLBACK_AFTER_FAILURE = 4,
  FALLBACK_PER_OVERRIDE = 5,
  FALLBACK_PER_PROTOCOL = 6,
  FALLBACK_FAILURE = 7,
  MAX_VALUE = 8,
}

export const enum DeveloperResourceScheme {
  OTHER = 0,
  UKNOWN = 1,
  HTTP = 2,
  HTTPS = 3,
  HTTP_LOCALHOST = 4,
  HTTPS_LOCALHOST = 5,
  DATA = 6,
  FILE = 7,
  BLOB = 8,
  MAX_VALUE = 9,
}

export enum ResourceType {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  all = 0,
  Document = 1,
  JavaScript = 2,
  'Fetch and XHR' = 3,
  CSS = 4,
  Font = 5,
  Image = 6,
  Media = 7,
  Manifest = 8,
  WebSocket = 9,
  WebAssembly = 10,
  Other = 11,
  /* eslint-enable @typescript-eslint/naming-convention */
  MAX_VALUE = 12,
}

export enum Language {
  /* eslint-disable @typescript-eslint/naming-convention */
  'af' = 1,
  'am' = 2,
  'ar' = 3,
  'as' = 4,
  'az' = 5,
  'be' = 6,
  'bg' = 7,
  'bn' = 8,
  'bs' = 9,
  'ca' = 10,
  'cs' = 11,
  'cy' = 12,
  'da' = 13,
  'de' = 14,
  'el' = 15,
  'en-GB' = 16,
  'en-US' = 17,
  'es-419' = 18,
  'es' = 19,
  'et' = 20,
  'eu' = 21,
  'fa' = 22,
  'fi' = 23,
  'fil' = 24,
  'fr-CA' = 25,
  'fr' = 26,
  'gl' = 27,
  'gu' = 28,
  'he' = 29,
  'hi' = 30,
  'hr' = 31,
  'hu' = 32,
  'hy' = 33,
  'id' = 34,
  'is' = 35,
  'it' = 36,
  'ja' = 37,
  'ka' = 38,
  'kk' = 39,
  'km' = 40,
  'kn' = 41,
  'ko' = 42,
  'ky' = 43,
  'lo' = 44,
  'lt' = 45,
  'lv' = 46,
  'mk' = 47,
  'ml' = 48,
  'mn' = 49,
  'mr' = 50,
  'ms' = 51,
  'my' = 52,
  'ne' = 53,
  'nl' = 54,
  'no' = 55,
  'or' = 56,
  'pa' = 57,
  'pl' = 58,
  'pt-PT' = 59,
  'pt' = 60,
  'ro' = 61,
  'ru' = 62,
  'si' = 63,
  'sk' = 64,
  'sl' = 65,
  'sq' = 66,
  'sr-Latn' = 67,
  'sr' = 68,
  'sv' = 69,
  'sw' = 70,
  'ta' = 71,
  'te' = 72,
  'th' = 73,
  'tr' = 74,
  'uk' = 75,
  'ur' = 76,
  'uz' = 77,
  'vi' = 78,
  'zh' = 79,
  'zh-HK' = 80,
  'zh-TW' = 81,
  'zu' = 82,
  /* eslint-enable @typescript-eslint/naming-convention */
  MAX_VALUE = 83,
}

export const enum SyncSetting {
  CHROME_SYNC_DISABLED = 1,
  CHROME_SYNC_SETTINGS_DISABLED = 2,
  DEVTOOLS_SYNC_SETTING_DISABLED = 3,
  DEVTOOLS_SYNC_SETTING_ENABLED = 4,
  MAX_VALUE = 5,
}

export const enum RecordingToggled {
  RECORDING_STARTED = 1,
  RECORDING_FINISHED = 2,
  MAX_VALUE = 3,
}

export const enum RecordingAssertion {
  ASSERTION_ADDED = 1,
  PROPERTY_ASSERTION_EDITED = 2,
  ATTRIBUTE_ASSERTION_EDITED = 3,
  MAX_VALUE = 4,
}

export const enum RecordingReplayFinished {
  SUCCESS = 1,
  TIMEOUT_ERROR_SELECTORS = 2,
  TIMEOUT_ERROR_TARGET = 3,
  OTHER_ERROR = 4,
  MAX_VALUE = 5,
}

export const enum RecordingReplaySpeed {
  NORMAL = 1,
  SLOW = 2,
  VERY_SLOW = 3,
  EXTREMELY_SLOW = 4,
  MAX_VALUE = 5,
}

export const enum RecordingReplayStarted {
  REPLAY_ONLY = 1,
  REPLAY_WITH_PERFORMANCE_TRACING = 2,
  REPLAY_VIA_EXTENSION = 3,
  MAX_VALUE = 4,
}

export const enum RecordingEdited {
  SELECTOR_PICKER_USED = 1,
  STEP_ADDED = 2,
  STEP_REMOVED = 3,
  SELECTOR_ADDED = 4,
  SELECTOR_REMOVED = 5,
  SELECTOR_PART_ADDED = 6,
  SELECTOR_PART_EDITED = 7,
  SELECTOR_PART_REMOVED = 8,
  TYPE_CHANGED = 9,
  OTHER_EDITING = 10,
  MAX_VALUE = 11,
}

export const enum RecordingExported {
  TO_PUPPETEER = 1,
  TO_JSON = 2,
  TO_PUPPETEER_REPLAY = 3,
  TO_EXTENSION = 4,
  TO_LIGHTHOUSE = 5,
  MAX_VALUE = 6,
}

export const enum RecordingCodeToggled {
  CODE_SHOWN = 1,
  CODE_HIDDEN = 2,
  MAX_VALUE = 3,
}

export const enum RecordingCopiedToClipboard {
  COPIED_RECORDING_WITH_PUPPETEER = 1,
  COPIED_RECORDING_WITH_JSON = 2,
  COPIED_RECORDING_WITH_REPLAY = 3,
  COPIED_RECORDING_WITH_EXTENSION = 4,
  COPIED_STEP_WITH_PUPPETEER = 5,
  COPIED_STEP_WITH_JSON = 6,
  COPIED_STEP_WITH_REPLAY = 7,
  COPIED_STEP_WITH_EXTENSION = 8,
  MAX_VALUE = 9,
}

export const enum StyleTextCopied {
  DECLARATION_VIA_CHANGED_LINE = 1,
  ALL_CHANGES_VIA_STYLES_TAB = 2,
  DECLARATION_VIA_CONTEXT_MENU = 3,
  PROPERTY_VIA_CONTEXT_MENU = 4,
  VALUE_VIA_CONTEXT_MENU = 5,
  DECLARATION_AS_JS_VIA_CONTEXT_MENU = 6,
  RULE_VIA_CONTEXT_MENU = 7,
  ALL_DECLARATIONS_VIA_CONTEXT_MENU = 8,
  ALL_DECLARATINS_AS_JS_VIA_CONTEXT_MENU = 9,
  SELECTOR_VIA_CONTEXT_MENU = 10,
  MAX_VALUE = 11,
}

export enum ManifestSectionCodes {
  /* eslint-disable @typescript-eslint/naming-convention -- Indexed access. */
  OtherSection = 0,
  'Identity' = 1,
  'Presentation' = 2,
  'Protocol Handlers' = 3,
  'Icons' = 4,
  'Window Controls Overlay' = 5,
  /* eslint-enable @typescript-eslint/naming-convention */
  MAX_VALUE = 6,
}

// The names here match the CSSRuleValidator names in CSSRuleValidator.ts.
export const enum CSSHintType {
  OTHER = 0,
  ALIGN_CONTENT = 1,
  FLEX_ITEM = 2,
  FLEX_CONTAINER = 3,
  GRID_CONTAINER = 4,
  GRID_ITEM = 5,
  FLEX_GRID = 6,
  MULTICOL_FLEX_GRID = 7,
  PADDING = 8,
  POSITION = 9,
  Z_INDEX = 10,
  SIZING = 11,
  FLEX_OR_GRID_ITEM = 12,
  FONT_VARIATION_SETTINGS = 13,
  MAX_VALUE = 14,
}

export const enum LighthouseModeRun {
  NAVIGATION = 0,
  TIMESPAN = 1,
  SNAPSHOT = 2,
  LEGACY_NAVIGATION = 3,
  MAX_VALUE = 4,
}

export const enum LighthouseCategoryUsed {
  PERFORMANCE = 0,
  ACCESSIBILITY = 1,
  BEST_PRACTICES = 2,
  SEO = 3,
  PWA = 4,
  PUB_ADS = 5,
  MAX_VALUE = 6,
}

export const enum SwatchType {
  VAR_LINK = 0,
  ANIMATION_NAME_LINK = 1,
  COLOR = 2,
  ANIMATION_TIMING = 3,
  SHADOW = 4,
  GRID = 5,
  FLEX = 6,
  ANGLE = 7,
  LENGTH = 8,
  POSITION_TRY_LINK = 10,
  MAX_VALUE = 11,
}

export const enum BadgeType {
  GRID = 0,
  SUBGRID = 1,
  FLEX = 2,
  AD = 3,
  SCROLL_SNAP = 4,
  CONTAINER = 5,
  SLOT = 6,
  TOP_LAYER = 7,
  REVEAL = 8,
  MAX_VALUE = 9,
}

export const enum AnimationsPlaybackRate {
  PERCENT_100 = 0,
  PERCENT_25 = 1,
  PERCENT_10 = 2,
  OTHER = 3,
  MAX_VALUE = 4,
}

export const enum AnimationPointDragType {
  // Animation is dragged as a whole in the Animations panel.
  ANIMATION_DRAG = 0,
  // A keyframe point inside animation timeline is dragged.
  KEYFRAME_MOVE = 1,
  // Start point of the animation inside animation timeline is dragged.
  START_ENDPOINT_MOVE = 2,
  // Finish point of the animation inside animation timeline is dragged.
  FINISH_ENDPOINT_MOVE = 3,
  OTHER = 4,
  MAX_VALUE = 5,
}
