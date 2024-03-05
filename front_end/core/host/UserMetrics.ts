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

  breakpointWithConditionAdded(breakpointWithConditionAdded: BreakpointWithConditionAdded): void {
    if (breakpointWithConditionAdded >= BreakpointWithConditionAdded.MaxValue) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.BreakpointWithConditionAdded, breakpointWithConditionAdded,
        BreakpointWithConditionAdded.MaxValue);
  }

  breakpointEditDialogRevealedFrom(breakpointEditDialogRevealedFrom: BreakpointEditDialogRevealedFrom): void {
    if (breakpointEditDialogRevealedFrom >= BreakpointEditDialogRevealedFrom.MaxValue) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.BreakpointEditDialogRevealedFrom, breakpointEditDialogRevealedFrom,
        BreakpointEditDialogRevealedFrom.MaxValue);
  }

  panelShown(panelName: string, isLaunching?: boolean): void {
    const code = PanelCodes[panelName as keyof typeof PanelCodes] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.PanelShown, code, PanelCodes.MaxValue);
    InspectorFrontendHostInstance.recordUserMetricsAction('DevTools_PanelShown_' + panelName);
    // Store that the user has changed the panel so we know launch histograms should not be fired.
    if (!isLaunching) {
      this.#panelChangedSinceLaunch = true;
    }
  }

  /**
   * Fired when a panel is closed (regardless if it exists in the main panel or the drawer)
   */
  panelClosed(panelName: string): void {
    const code = PanelCodes[panelName as keyof typeof PanelCodes] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.PanelClosed, code, PanelCodes.MaxValue);
    // Store that the user has changed the panel so we know launch histograms should not be fired.
    this.#panelChangedSinceLaunch = true;
  }

  panelShownInLocation(panelName: string, location: 'main'|'drawer'): void {
    const panelWithLocationName = `${panelName}-${location}`;
    const panelWithLocation = PanelWithLocation[panelWithLocationName as keyof typeof PanelWithLocation] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.PanelShownInLocation,
        panelWithLocation,
        PanelWithLocation.MaxValue,
    );
  }

  elementsSidebarTabShown(sidebarPaneName: string): void {
    const code = ElementsSidebarTabCodes[sidebarPaneName as keyof typeof ElementsSidebarTabCodes] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ElementsSidebarTabShown, code, ElementsSidebarTabCodes.MaxValue);
  }

  sourcesSidebarTabShown(sidebarPaneName: string): void {
    const code = SourcesSidebarTabCodes[sidebarPaneName as keyof typeof SourcesSidebarTabCodes] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.SourcesSidebarTabShown, code, SourcesSidebarTabCodes.MaxValue);
  }

  settingsPanelShown(settingsViewId: string): void {
    this.panelShown('settings-' + settingsViewId);
  }

  sourcesPanelFileDebugged(mediaType?: string): void {
    const code = (mediaType && MediaTypes[mediaType as keyof typeof MediaTypes]) || MediaTypes.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.SourcesPanelFileDebugged, code, MediaTypes.MaxValue);
  }

  sourcesPanelFileOpened(mediaType?: string): void {
    const code = (mediaType && MediaTypes[mediaType as keyof typeof MediaTypes]) || MediaTypes.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.SourcesPanelFileOpened, code, MediaTypes.MaxValue);
  }

  networkPanelResponsePreviewOpened(mediaType: string): void {
    const code = (mediaType && MediaTypes[mediaType as keyof typeof MediaTypes]) || MediaTypes.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.NetworkPanelResponsePreviewOpened, code, MediaTypes.MaxValue);
  }

  actionTaken(action: Action): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.ActionTaken, action, Action.MaxValue);
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
        EnumeratedHistogram.KeybindSetSettingChanged, value, KeybindSetSettings.MaxValue);
  }

  keyboardShortcutFired(actionId: string): void {
    const action =
        KeyboardShortcutAction[actionId as keyof typeof KeyboardShortcutAction] || KeyboardShortcutAction.OtherShortcut;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.KeyboardShortcutFired, action, KeyboardShortcutAction.MaxValue);
  }

  issuesPanelOpenedFrom(issueOpener: IssueOpener): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.IssuesPanelOpenedFrom, issueOpener, IssueOpener.MaxValue);
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
        EnumeratedHistogram.IssuesPanelIssueExpanded, issueExpanded, IssueExpanded.MaxValue);
  }

  issuesPanelResourceOpened(issueCategory: string, type: string): void {
    const key = issueCategory + type;
    const value = IssueResourceOpened[key as keyof typeof IssueResourceOpened];

    if (value === undefined) {
      return;
    }

    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.IssuesPanelResourceOpened, value, IssueResourceOpened.MaxValue);
  }

  issueCreated(code: string): void {
    const issueCreated = IssueCreated[code as keyof typeof IssueCreated];
    if (issueCreated === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.IssueCreated, issueCreated, IssueCreated.MaxValue);
  }

  experimentEnabledAtLaunch(experimentId: string): void {
    const experiment = DevtoolsExperiments[experimentId as keyof typeof DevtoolsExperiments];
    if (experiment === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ExperimentEnabledAtLaunch, experiment, DevtoolsExperiments.MaxValue);
  }

  experimentDisabledAtLaunch(experimentId: string): void {
    const experiment = DevtoolsExperiments[experimentId as keyof typeof DevtoolsExperiments];
    if (experiment === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ExperimentDisabledAtLaunch, experiment, DevtoolsExperiments.MaxValue);
  }

  experimentChanged(experimentId: string, isEnabled: boolean): void {
    const experiment = DevtoolsExperiments[experimentId as keyof typeof DevtoolsExperiments];
    if (experiment === undefined) {
      return;
    }
    const actionName = isEnabled ? EnumeratedHistogram.ExperimentEnabled : EnumeratedHistogram.ExperimentDisabled;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(actionName, experiment, DevtoolsExperiments.MaxValue);
  }

  developerResourceLoaded(developerResourceLoaded: DeveloperResourceLoaded): void {
    if (developerResourceLoaded >= DeveloperResourceLoaded.MaxValue) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.DeveloperResourceLoaded, developerResourceLoaded, DeveloperResourceLoaded.MaxValue);
  }

  developerResourceScheme(developerResourceScheme: DeveloperResourceScheme): void {
    if (developerResourceScheme >= DeveloperResourceScheme.MaxValue) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.DeveloperResourceScheme, developerResourceScheme, DeveloperResourceScheme.MaxValue);
  }

  inlineScriptParsed(inlineScriptType: VMInlineScriptType): void {
    if (inlineScriptType >= VMInlineScriptType.MaxValue) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.InlineScriptParsed, inlineScriptType, VMInlineScriptType.MaxValue);
  }

  vmInlineScriptContentShown(inlineScriptType: VMInlineScriptType): void {
    if (inlineScriptType >= VMInlineScriptType.MaxValue) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.VMInlineScriptTypeShown, inlineScriptType, VMInlineScriptType.MaxValue);
  }

  language(language: Intl.UnicodeBCP47LocaleIdentifier): void {
    const languageCode = Language[language as keyof typeof Language];
    if (languageCode === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.Language, languageCode, Language.MaxValue);
  }

  syncSetting(devtoolsSyncSettingEnabled: boolean): void {
    InspectorFrontendHostInstance.getSyncInformation(syncInfo => {
      let settingValue = SyncSetting.ChromeSyncDisabled;
      if (syncInfo.isSyncActive && !syncInfo.arePreferencesSynced) {
        settingValue = SyncSetting.ChromeSyncSettingsDisabled;
      } else if (syncInfo.isSyncActive && syncInfo.arePreferencesSynced) {
        settingValue = devtoolsSyncSettingEnabled ? SyncSetting.DevToolsSyncSettingEnabled :
                                                    SyncSetting.DevToolsSyncSettingDisabled;
      }

      InspectorFrontendHostInstance.recordEnumeratedHistogram(
          EnumeratedHistogram.SyncSetting, settingValue, SyncSetting.MaxValue);
    });
  }

  recordingAssertion(value: RecordingAssertion): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingAssertion, value, RecordingAssertion.MaxValue);
  }

  recordingToggled(value: RecordingToggled): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingToggled, value, RecordingToggled.MaxValue);
  }

  recordingReplayFinished(value: RecordingReplayFinished): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingReplayFinished, value, RecordingReplayFinished.MaxValue);
  }

  recordingReplaySpeed(value: RecordingReplaySpeed): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingReplaySpeed, value, RecordingReplaySpeed.MaxValue);
  }

  recordingReplayStarted(value: RecordingReplayStarted): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingReplayStarted, value, RecordingReplayStarted.MaxValue);
  }

  recordingEdited(value: RecordingEdited): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingEdited, value, RecordingEdited.MaxValue);
  }

  recordingExported(value: RecordingExported): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingExported, value, RecordingExported.MaxValue);
  }

  recordingCodeToggled(value: RecordingCodeToggled): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingCodeToggled, value, RecordingCodeToggled.MaxValue);
  }

  recordingCopiedToClipboard(value: RecordingCopiedToClipboard): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.RecordingCopiedToClipboard, value, RecordingCopiedToClipboard.MaxValue);
  }

  styleTextCopied(value: StyleTextCopied): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.StyleTextCopied, value, StyleTextCopied.MaxValue);
  }

  manifestSectionSelected(sectionTitle: string): void {
    const code =
        ManifestSectionCodes[sectionTitle as keyof typeof ManifestSectionCodes] || ManifestSectionCodes.OtherSection;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ManifestSectionSelected, code, ManifestSectionCodes.MaxValue);
  }

  cssHintShown(type: CSSHintType): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.CSSHintShown, type, CSSHintType.MaxValue);
  }

  lighthouseModeRun(type: LighthouseModeRun): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.LighthouseModeRun, type, LighthouseModeRun.MaxValue);
  }

  lighthouseCategoryUsed(type: LighthouseCategoryUsed): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.LighthouseCategoryUsed, type, LighthouseCategoryUsed.MaxValue);
  }

  colorConvertedFrom(type: ColorConvertedFrom): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ColorConvertedFrom, type, ColorConvertedFrom.MaxValue);
  }

  colorPickerOpenedFrom(type: ColorPickerOpenedFrom): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ColorPickerOpenedFrom, type, ColorPickerOpenedFrom.MaxValue);
  }

  cssPropertyDocumentation(type: CSSPropertyDocumentation): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.CSSPropertyDocumentation, type, CSSPropertyDocumentation.MaxValue);
  }

  swatchActivated(swatch: SwatchType): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.SwatchActivated, swatch, SwatchType.MaxValue);
  }

  badgeActivated(badge: BadgeType): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.BadgeActivated, badge, BadgeType.MaxValue);
  }

  breakpointsRestoredFromStorage(count: number): void {
    const countBucket = this.#breakpointCountToBucket(count);
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.BreakpointsRestoredFromStorageCount, countBucket,
        BreakpointsRestoredFromStorageCount.MaxValue);
  }

  animationPlaybackRateChanged(playbackRate: AnimationsPlaybackRate): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.AnimationPlaybackRateChanged, playbackRate, AnimationsPlaybackRate.MaxValue);
  }

  animationPointDragged(dragType: AnimationPointDragType): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.AnimationPointDragged, dragType, AnimationPointDragType.MaxValue);
  }

  #breakpointCountToBucket(count: number): BreakpointsRestoredFromStorageCount {
    if (count < 100) {
      return BreakpointsRestoredFromStorageCount.LessThan100;
    }
    if (count < 300) {
      return BreakpointsRestoredFromStorageCount.LessThan300;
    }
    if (count < 1000) {
      return BreakpointsRestoredFromStorageCount.LessThan1000;
    }
    if (count < 3000) {
      return BreakpointsRestoredFromStorageCount.LessThan3000;
    }
    if (count < 10000) {
      return BreakpointsRestoredFromStorageCount.LessThan10000;
    }
    if (count < 30000) {
      return BreakpointsRestoredFromStorageCount.LessThan30000;
    }
    if (count < 100000) {
      return BreakpointsRestoredFromStorageCount.LessThan100000;
    }
    if (count < 300000) {
      return BreakpointsRestoredFromStorageCount.LessThan300000;
    }
    if (count < 1000000) {
      return BreakpointsRestoredFromStorageCount.LessThan1000000;
    }
    return BreakpointsRestoredFromStorageCount.Above1000000;
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
    const boundItemCount = Math.max(Math.min(itemCount, ResourceType.MaxValue - 1), 1);
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.LegacyResourceTypeFilterNumberOfSelectedChanged, boundItemCount, ResourceType.MaxValue);
  }

  legacyResourceTypeFilterItemSelected(resourceTypeName: string): void {
    const resourceType = ResourceType[resourceTypeName as keyof typeof ResourceType];
    if (resourceType === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.LegacyResourceTypeFilterItemSelected, resourceType, ResourceType.MaxValue);
  }

  resourceTypeFilterNumberOfSelectedChanged(itemCount: number): void {
    const boundItemCount = Math.max(Math.min(itemCount, ResourceType.MaxValue - 1), 1);
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ResourceTypeFilterNumberOfSelectedChanged, boundItemCount, ResourceType.MaxValue);
  }

  resourceTypeFilterItemSelected(resourceTypeName: string): void {
    const resourceType = ResourceType[resourceTypeName as keyof typeof ResourceType];
    if (resourceType === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ResourceTypeFilterItemSelected, resourceType, ResourceType.MaxValue);
  }

  networkPanelMoreFiltersNumberOfSelectedChanged(itemCount: number): void {
    const boundItemCount = Math.max(Math.min(itemCount, NetworkPanelMoreFilters.MaxValue), 0);
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.NetworkPanelMoreFiltersNumberOfSelectedChanged, boundItemCount,
        NetworkPanelMoreFilters.MaxValue);
  }

  networkPanelMoreFiltersItemSelected(filterName: string): void {
    const filter = NetworkPanelMoreFilters[filterName as keyof typeof NetworkPanelMoreFilters];
    if (filter === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.NetworkPanelMoreFiltersItemSelected, filter, NetworkPanelMoreFilters.MaxValue);
  }
}

/**
 * The numeric enum values are not necessarily continuous! It is possible that
 * values have been removed, which results in gaps in the sequence of values.
 * When adding a new value:
 * 1. Add an entry to the bottom of the enum before 'MaxValue'.
 * 2. Set the value of the new entry to the current value of 'MaxValue'.
 * 2. Increment the value of 'MaxValue' by 1.
 * When removing a value which is no longer needed:
 * 1. Delete the line with the unneeded value
 * 2. Do not update any 'MaxValue' or any other value.
 */

// Codes below are used to collect UMA histograms in the Chromium port.
// Do not change the values below, additional actions are needed on the Chromium side
// in order to add more codes.
export enum Action {
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
  MaxValue = 140,
}

/* eslint-disable @typescript-eslint/naming-convention */
export enum PanelCodes {
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
  MaxValue = 68,
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
export enum PanelWithLocation {
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
  'js_profiler-main' = 31,
  'js_profiler-drawer' = 32,
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
  MaxValue = 133,
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
export enum ElementsSidebarTabCodes {
  'OtherSidebarPane' = 0,
  'styles' = 1,
  'computed' = 2,
  'elements.layout' = 3,
  'elements.event-listeners' = 4,
  'elements.dom-breakpoints' = 5,
  'elements.dom-properties' = 6,
  'accessibility.view' = 7,
  MaxValue = 8,
}

/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
export enum SourcesSidebarTabCodes {
  'OtherSidebarPane' = 0,
  'navigator-network' = 1,
  'navigator-files' = 2,
  'navigator-overrides' = 3,
  'navigator-content-scripts' = 4,
  'navigator-snippets' = 5,
  MaxValue = 6,
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
export enum MediaTypes {
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
  MaxValue = 36,
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
export enum KeybindSetSettings {
  'devToolsDefault' = 0,
  'vsCode' = 1,
  MaxValue = 2,
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
export enum KeyboardShortcutAction {
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
  MaxValue = 118,
}
/* eslint-enable @typescript-eslint/naming-convention */

export const enum IssueOpener {
  ConsoleInfoBar = 0,
  LearnMoreLinkCOEP = 1,
  StatusBarIssuesCounter = 2,
  HamburgerMenu = 3,
  Adorner = 4,
  CommandMenu = 5,
  MaxValue = 6,
}

/**
 * This list should contain the currently active Devtools Experiments,
 * gaps are expected.
 */
/* eslint-disable @typescript-eslint/naming-convention */
export enum DevtoolsExperiments {
  'apply-custom-stylesheet' = 0,
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
  'ignore-list-js-frames-on-timeline' = 43,
  'contrast-issues' = 44,
  'experimental-cookie-features' = 45,
  'styles-pane-css-changes' = 55,
  'evaluate-expressions-with-source-maps' = 58,
  'instrumentation-breakpoints' = 61,
  'authored-deployed-grouping' = 63,
  'important-dom-properties' = 64,
  'just-my-code' = 65,
  'timeline-as-console-profile-result-panel' = 67,
  'preloading-status-panel' = 68,
  'outermost-target-selector' = 71,
  'js-profiler-temporarily-enable' = 72,
  'highlight-errors-elements-panel' = 73,
  'set-all-breakpoints-eagerly' = 74,
  'self-xss-warning' = 75,
  'use-source-map-scopes' = 76,
  'storage-buckets-tree' = 77,
  'network-panel-filter-bar-redesign' = 79,
  'track-context-menu' = 81,
  'autofill-view' = 82,
  'sources-frame-indentation-markers-temporarily-disable' = 83,
  'heap-snapshot-treat-backing-store-as-containing-object' = 84,
  'css-type-component-length-deprecate' = 85,

  // Increment this when new experiments are added.
  'MaxValue' = 86,
}
/* eslint-enable @typescript-eslint/naming-convention */

export const enum BreakpointWithConditionAdded {
  Logpoint = 0,
  ConditionalBreakpoint = 1,
  MaxValue = 2,
}

export const enum BreakpointEditDialogRevealedFrom {
  BreakpointSidebarContextMenu = 0,
  BreakpointSidebarEditButton = 1,
  BreakpointMarkerContextMenu = 2,
  LineGutterContextMenu = 3,
  KeyboardShortcut = 4,
  Linkifier = 5,
  MouseClick = 6,
  MaxValue = 7,
}

export const enum ColorConvertedFrom {
  ColorSwatch = 0,
  ColorPicker = 1,
  MaxValue = 2,
}

export const enum ColorPickerOpenedFrom {
  SourcesPanel = 0,
  StylesPane = 1,
  MaxValue = 2,
}

export const enum CSSPropertyDocumentation {
  Shown = 0,
  ToggledOn = 1,
  ToggledOff = 2,
  MaxValue = 3,
}

export const enum BreakpointsRestoredFromStorageCount {
  LessThan100 = 0,
  LessThan300 = 1,
  LessThan1000 = 2,
  LessThan3000 = 3,
  LessThan10000 = 4,
  LessThan30000 = 5,
  LessThan100000 = 6,
  LessThan300000 = 7,
  LessThan1000000 = 8,
  Above1000000 = 9,
  MaxValue = 10,
}

// Update DevToolsIssuesPanelIssueExpanded from tools/metrics/histograms/enums.xml if new enum is added.
export enum IssueExpanded {
  CrossOriginEmbedderPolicy = 0,
  MixedContent = 1,
  SameSiteCookie = 2,
  HeavyAd = 3,
  ContentSecurityPolicy = 4,
  Other = 5,
  Generic = 6,
  ThirdPartyPhaseoutCookie = 7,
  GenericCookie = 8,
  MaxValue = 9,
}

export enum IssueResourceOpened {
  CrossOriginEmbedderPolicyRequest = 0,
  CrossOriginEmbedderPolicyElement = 1,
  MixedContentRequest = 2,
  SameSiteCookieCookie = 3,
  SameSiteCookieRequest = 4,
  HeavyAdElement = 5,
  ContentSecurityPolicyDirective = 6,
  ContentSecurityPolicyElement = 7,
  MaxValue = 13,
}

/**
 * This list should contain the currently active issue types,
 * gaps are expected.
 */
export enum IssueCreated {
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
  MaxValue = 86,
}

export const enum DeveloperResourceLoaded {
  LoadThroughPageViaTarget = 0,
  LoadThroughPageViaFrame = 1,
  LoadThroughPageFailure = 2,
  LoadThroughPageFallback = 3,
  FallbackAfterFailure = 4,
  FallbackPerOverride = 5,
  FallbackPerProtocol = 6,
  FallbackFailure = 7,
  MaxValue = 8,
}

export const enum DeveloperResourceScheme {
  SchemeOther = 0,
  SchemeUnknown = 1,
  SchemeHttp = 2,
  SchemeHttps = 3,
  SchemeHttpLocalhost = 4,
  SchemeHttpsLocalhost = 5,
  SchemeData = 6,
  SchemeFile = 7,
  SchemeBlob = 8,
  MaxValue = 9,
}

export enum ResourceType {
  /* eslint-disable @typescript-eslint/naming-convention */
  all = 0,
  /* eslint-enable @typescript-eslint/naming-convention */
  Documents = 1,
  Scripts = 2,
  'Fetch and XHR' = 3,
  Stylesheets = 4,
  Fonts = 5,
  Images = 6,
  Media = 7,
  Manifest = 8,
  WebSockets = 9,
  WebAssembly = 10,
  Other = 11,
  MaxValue = 12,
}

/* eslint-disable @typescript-eslint/naming-convention */
export enum NetworkPanelMoreFilters {
  'Hide data URLs' = 0,
  'Hide extension URLs' = 1,
  'Blocked response cookies' = 2,
  'Blocked requests' = 3,
  '3rd-party requests' = 4,
  MaxValue = 5,
}
/* eslint-enable @typescript-eslint/naming-convention */

export const enum VMInlineScriptType {
  MODULE_SCRIPT = 0,
  CLASSIC_SCRIPT = 1,
  MaxValue = 2,
}

/* eslint-disable @typescript-eslint/naming-convention */
export enum Language {
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
  MaxValue = 83,
}
/* eslint-enable @typescript-eslint/naming-convention */

export const enum SyncSetting {
  ChromeSyncDisabled = 1,
  ChromeSyncSettingsDisabled = 2,
  DevToolsSyncSettingDisabled = 3,
  DevToolsSyncSettingEnabled = 4,
  MaxValue = 5,
}

export const enum RecordingToggled {
  RecordingStarted = 1,
  RecordingFinished = 2,
  MaxValue = 3,
}

export const enum RecordingAssertion {
  AssertionAdded = 1,
  PropertyAssertionEdited = 2,
  AttributeAssertionEdited = 3,
  MaxValue = 4,
}

export const enum RecordingReplayFinished {
  Success = 1,
  TimeoutErrorSelectors = 2,
  TimeoutErrorTarget = 3,
  OtherError = 4,
  MaxValue = 5,
}

export const enum RecordingReplaySpeed {
  Normal = 1,
  Slow = 2,
  VerySlow = 3,
  ExtremelySlow = 4,
  MaxValue = 5,
}

export const enum RecordingReplayStarted {
  ReplayOnly = 1,
  ReplayWithPerformanceTracing = 2,
  ReplayViaExtension = 3,
  MaxValue = 4,
}

export const enum RecordingEdited {
  SelectorPickerUsed = 1,
  StepAdded = 2,
  StepRemoved = 3,
  SelectorAdded = 4,
  SelectorRemoved = 5,
  SelectorPartAdded = 6,
  SelectorPartEdited = 7,
  SelectorPartRemoved = 8,
  TypeChanged = 9,
  OtherEditing = 10,
  MaxValue = 11,
}

export const enum RecordingExported {
  ToPuppeteer = 1,
  ToJSON = 2,
  ToPuppeteerReplay = 3,
  ToExtension = 4,
  ToLighthouse = 5,
  MaxValue = 6,
}

export const enum RecordingCodeToggled {
  CodeShown = 1,
  CodeHidden = 2,
  MaxValue = 3,
}

export const enum RecordingCopiedToClipboard {
  CopiedRecordingWithPuppeteer = 1,
  CopiedRecordingWithJSON = 2,
  CopiedRecordingWithReplay = 3,
  CopiedRecordingWithExtension = 4,
  CopiedStepWithPuppeteer = 5,
  CopiedStepWithJSON = 6,
  CopiedStepWithReplay = 7,
  CopiedStepWithExtension = 8,
  MaxValue = 9,
}

export const enum StyleTextCopied {
  DeclarationViaChangedLine = 1,
  AllChangesViaStylesPane = 2,
  DeclarationViaContextMenu = 3,
  PropertyViaContextMenu = 4,
  ValueViaContextMenu = 5,
  DeclarationAsJSViaContextMenu = 6,
  RuleViaContextMenu = 7,
  AllDeclarationsViaContextMenu = 8,
  AllDeclarationsAsJSViaContextMenu = 9,
  SelectorViaContextMenu = 10,
  MaxValue = 11,
}

export enum ManifestSectionCodes {
  OtherSection = 0,
  'Identity' = 1,
  'Presentation' = 2,
  'Protocol Handlers' = 3,
  'Icons' = 4,
  'Window Controls Overlay' = 5,
  MaxValue = 6,
}

/* eslint-enable @typescript-eslint/naming-convention */

// The names here match the CSSRuleValidator names in CSSRuleValidator.ts.
export const enum CSSHintType {
  Other = 0,
  AlignContent = 1,
  FlexItem = 2,
  FlexContainer = 3,
  GridContainer = 4,
  GridItem = 5,
  FlexGrid = 6,
  MulticolFlexGrid = 7,
  Padding = 8,
  Position = 9,
  ZIndex = 10,
  Sizing = 11,
  FlexOrGridItem = 12,
  FontVariationSettings = 13,
  MaxValue = 14,
}

export const enum LighthouseModeRun {
  Navigation = 0,
  Timespan = 1,
  Snapshot = 2,
  LegacyNavigation = 3,
  MaxValue = 4,
}

export const enum LighthouseCategoryUsed {
  Performance = 0,
  Accessibility = 1,
  BestPractices = 2,
  SEO = 3,
  PWA = 4,
  PubAds = 5,
  MaxValue = 6,
}

export const enum SwatchType {
  VarLink = 0,
  AnimationNameLink = 1,
  Color = 2,
  AnimationTiming = 3,
  Shadow = 4,
  Grid = 5,
  Flex = 6,
  Angle = 7,
  Length = 8,
  PositionFallbackLink = 9,
  MaxValue = 10,
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
  MaxValue = 9,
}

export const enum AnimationsPlaybackRate {
  Percent100 = 0,
  Percent25 = 1,
  Percent10 = 2,
  Other = 3,
  MaxValue = 4,
}

export const enum AnimationPointDragType {
  // Animation is dragged as a whole in the Animations panel.
  AnimationDrag = 0,
  // A keyframe point inside animation timeline is dragged.
  KeyframeMove = 1,
  // Start point of the animation inside animation timeline is dragged.
  StartEndpointMove = 2,
  // Finish point of the animation inside animation timeline is dragged.
  FinishEndpointMove = 3,
  Other = 4,
  MaxValue = 5,
}
