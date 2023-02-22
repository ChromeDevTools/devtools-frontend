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

  panelShown(panelName: string): void {
    const code = PanelCodes[panelName as keyof typeof PanelCodes] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.PanelShown, code, PanelCodes.MaxValue);
    // Store that the user has changed the panel so we know launch histograms should not be fired.
    this.#panelChangedSinceLaunch = true;
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

  sidebarPaneShown(sidebarPaneName: string): void {
    const code = SidebarPaneCodes[sidebarPaneName as keyof typeof SidebarPaneCodes] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.SidebarPaneShown, code, SidebarPaneCodes.MaxValue);
  }

  settingsPanelShown(settingsViewId: string): void {
    this.panelShown('settings-' + settingsViewId);
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

  linearMemoryInspectorRevealedFrom(linearMemoryInspectorRevealedFrom: LinearMemoryInspectorRevealedFrom): void {
    if (linearMemoryInspectorRevealedFrom >= LinearMemoryInspectorRevealedFrom.MaxValue) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.LinearMemoryInspectorRevealedFrom, linearMemoryInspectorRevealedFrom,
        LinearMemoryInspectorRevealedFrom.MaxValue);
  }

  linearMemoryInspectorTarget(linearMemoryInspectorTarget: LinearMemoryInspectorTarget): void {
    if (linearMemoryInspectorTarget >= LinearMemoryInspectorTarget.MaxValue) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.LinearMemoryInspectorTarget, linearMemoryInspectorTarget,
        LinearMemoryInspectorTarget.MaxValue);
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
// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
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
  MaxValue = 60,
}

/* eslint-disable @typescript-eslint/naming-convention */
// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum PanelCodes {
  elements = 1,
  resources = 2,
  network = 3,
  sources = 4,
  timeline = 5,
  heap_profiler = 6,
  console = 8,
  layers = 9,
  'console-view' = 10,
  'animations' = 11,
  'network.config' = 12,
  'rendering' = 13,
  'sensors' = 14,
  'sources.search' = 15,
  security = 16,
  js_profiler = 17,
  lighthouse = 18,
  'coverage' = 19,
  'protocol-monitor' = 20,
  'remote-devices' = 21,
  'web-audio' = 22,
  'changes.changes' = 23,
  'performance.monitor' = 24,
  'release-note' = 25,
  'live_heap_profile' = 26,
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
  'chrome_recorder' = 40,
  'trust_tokens' = 41,
  'reporting_api' = 42,
  'interest_groups' = 43,
  'back_forward_cache' = 44,
  'service_worker_cache' = 45,
  'background_service_backgroundFetch' = 46,
  'background_service_backgroundSync' = 47,
  'background_service_pushMessaging' = 48,
  'background_service_notifications' = 49,
  'background_service_paymentHandler' = 50,
  'background_service_periodicBackgroundSync' = 51,
  'service_workers' = 52,
  'app_manifest' = 53,
  'storage' = 54,
  'cookies' = 55,
  'frame_details' = 56,
  'frame_resource' = 57,
  'frame_window' = 58,
  'frame_worker' = 59,
  'dom_storage' = 60,
  'indexed_db' = 61,
  'web_sql' = 62,
  'performance_insights' = 63,
  'preloading' = 64,
  MaxValue = 65,
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum SidebarPaneCodes {
  'OtherSidebarPane' = 0,
  'Styles' = 1,
  'Computed' = 2,
  'elements.layout' = 3,
  'elements.eventListeners' = 4,
  'elements.domBreakpoints' = 5,
  'elements.domProperties' = 6,
  'accessibility.view' = 7,
  MaxValue = 8,
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum MediaTypes {
  Unknown = 0,
  'text/javascript' = 1,
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
  MaxValue = 31,
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum KeybindSetSettings {
  'devToolsDefault' = 0,
  'vsCode' = 1,
  MaxValue = 2,
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum KeyboardShortcutAction {
  OtherShortcut = 0,
  'commandMenu.show' = 1,
  'console.clear' = 2,
  'console.show' = 3,
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
  'quickOpen.show' = 21,
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
  'inspector_main.focus-debuggee' = 47,
  'inspector_main.hard-reload' = 48,
  'inspector_main.reload' = 49,
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
  'chrome_recorder.start-recording' = 108,
  'chrome_recorder.replay-recording' = 109,
  'chrome_recorder.toggle-code-view' = 110,
  'chrome_recorder.copy-recording-or-step' = 111,
  MaxValue = 112,
}
/* eslint-enable @typescript-eslint/naming-convention */

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum IssueOpener {
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
// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum DevtoolsExperiments {
  'applyCustomStylesheet' = 0,
  'captureNodeCreationStacks' = 1,
  'sourcesPrettyPrint' = 2,
  'inputEventsOnTimelineOverview' = 10,
  'liveHeapProfile' = 11,
  'protocolMonitor' = 13,
  'developerResourcesView' = 15,
  'recordCoverageWithPerformanceTracing' = 16,
  'samplingHeapProfilerTimeline' = 17,
  'showOptionToExposeInternalsInHeapSnapshot' = 18,
  'sourceOrderViewer' = 20,
  'webauthnPane' = 22,
  'timelineEventInitiators' = 24,
  'timelineInvalidationTracking' = 26,
  'timelineShowAllEvents' = 27,
  'timelineV8RuntimeCallStats' = 28,
  'timelineReplayEvent' = 30,
  'wasmDWARFDebugging' = 31,
  'dualScreenSupport' = 32,
  'keyboardShortcutEditor' = 35,
  'APCA' = 39,
  'cspViolationsView' = 40,
  'fontEditor' = 41,
  'fullAccessibilityTree' = 42,
  'ignoreListJSFramesOnTimeline' = 43,
  'contrastIssues' = 44,
  'experimentalCookieFeatures' = 45,
  'groupAndHideIssuesByKind' = 51,
  'cssTypeComponentLength' = 52,
  'preciseChanges' = 53,
  'bfcacheDisplayTree' = 54,
  'stylesPaneCSSChanges' = 55,
  'headerOverrides' = 56,
  'evaluateExpressionsWithSourceMaps' = 58,
  'eyedropperColorPicker' = 60,
  'instrumentationBreakpoints' = 61,
  'cssAuthoringHints' = 62,
  'authoredDeployedGrouping' = 63,
  'importantDOMProperties' = 64,
  'justMyCode' = 65,
  'breakpointView' = 66,
  'timelineAsConsoleProfileResultPanel' = 67,
  'preloadingStatusPanel' = 68,
  'disableColorFormatSetting' = 69,
  'timelineDoNotSkipSystemNodesOfCpuProfile' = 70,
  // Increment this when new experiments are added.
  'MaxValue' = 71,
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
  MaxValue = 5,
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

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum IssueExpanded {
  CrossOriginEmbedderPolicy = 0,
  MixedContent = 1,
  Cookie = 2,
  HeavyAd = 3,
  ContentSecurityPolicy = 4,
  Other = 5,
  MaxValue = 6,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum IssueResourceOpened {
  CrossOriginEmbedderPolicyRequest = 0,
  CrossOriginEmbedderPolicyElement = 1,
  MixedContentRequest = 2,
  SameSiteCookieCookie = 3,
  SameSiteCookieRequest = 4,
  HeavyAdElement = 5,
  ContentSecurityPolicyDirective = 6,
  ContentSecurityPolicyElement = 7,
  CrossOriginEmbedderPolicyLearnMore = 8,
  MixedContentLearnMore = 9,
  SameSiteCookieLearnMore = 10,
  HeavyAdLearnMore = 11,
  ContentSecurityPolicyLearnMore = 12,
  MaxValue = 13,
}

/**
 * This list should contain the currently active issue types,
 * gaps are expected.
 */
// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
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
  'TrustedWebActivityIssue::kHttpError' = 38,
  'TrustedWebActivityIssue::kUnavailableOffline' = 39,
  'TrustedWebActivityIssue::kDigitalAssetLinks' = 40,
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
  MaxValue = 64,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum DeveloperResourceLoaded {
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

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum DeveloperResourceScheme {
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

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum LinearMemoryInspectorRevealedFrom {
  ContextMenu = 0,
  MemoryIcon = 1,
  MaxValue = 2,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum LinearMemoryInspectorTarget {
  DWARFInspectableAddress = 0,
  ArrayBuffer = 1,
  DataView = 2,
  TypedArray = 3,
  WebAssemblyMemory = 4,
  MaxValue = 5,
}

/* eslint-disable @typescript-eslint/naming-convention */
// TODO(crbug.com/1167717) = Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
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

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum SyncSetting {
  ChromeSyncDisabled = 1,
  ChromeSyncSettingsDisabled = 2,
  DevToolsSyncSettingDisabled = 3,
  DevToolsSyncSettingEnabled = 4,
  MaxValue = 5,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum RecordingToggled {
  RecordingStarted = 1,
  RecordingFinished = 2,
  MaxValue = 3,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum RecordingReplayFinished {
  Success = 1,
  TimeoutErrorSelectors = 2,
  TimeoutErrorTarget = 3,
  OtherError = 4,
  MaxValue = 5,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum RecordingReplaySpeed {
  Normal = 1,
  Slow = 2,
  VerySlow = 3,
  ExtremelySlow = 4,
  MaxValue = 5,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum RecordingReplayStarted {
  ReplayOnly = 1,
  ReplayWithPerformanceTracing = 2,
  ReplayViaExtension = 3,
  MaxValue = 4,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum RecordingEdited {
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

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum RecordingExported {
  ToPuppeteer = 1,
  ToJSON = 2,
  ToPuppeteerReplay = 3,
  ToExtension = 4,
  ToLighthouse = 5,
  MaxValue = 6,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum RecordingCodeToggled {
  CodeShown = 1,
  CodeHidden = 2,
  MaxValue = 3,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum RecordingCopiedToClipboard {
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

/* eslint-disable @typescript-eslint/naming-convention */
// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum ConsoleShowsCorsErrors {
  'false' = 0,
  'true' = 1,
  MaxValue = 2,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum StyleTextCopied {
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

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum ManifestSectionCodes {
  OtherSection = 0,
  'Identity' = 1,
  'Presentation' = 2,
  'Protocol Handlers' = 3,
  'Icons' = 4,
  MaxValue = 5,
}

// The names here match the CSSRuleValidator names in CSSRuleValidator.ts.
// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum CSSHintType {
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
  MaxValue = 13,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum LighthouseModeRun {
  Navigation = 0,
  Timespan = 1,
  Snapshot = 2,
  LegacyNavigation = 3,
  MaxValue = 4,
}

/* eslint-enable @typescript-eslint/naming-convention */
