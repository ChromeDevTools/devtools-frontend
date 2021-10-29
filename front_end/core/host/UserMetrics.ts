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
  private panelChangedSinceLaunch: boolean;
  private firedLaunchHistogram: boolean;
  private launchPanelName: string;
  constructor() {
    this.panelChangedSinceLaunch = false;
    this.firedLaunchHistogram = false;
    this.launchPanelName = '';
  }

  panelShown(panelName: string): void {
    const code = PanelCodes[panelName] || 0;
    const size = Object.keys(PanelCodes).length + 1;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.PanelShown, code, size);
    // Store that the user has changed the panel so we know launch histograms should not be fired.
    this.panelChangedSinceLaunch = true;
  }

  /**
   * Fired when a panel is closed (regardless if it exists in the main panel or the drawer)
   */
  panelClosed(panelName: string): void {
    const code = PanelCodes[panelName] || 0;
    const size = Object.keys(PanelCodes).length + 1;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.PanelClosed, code, size);
    // Store that the user has changed the panel so we know launch histograms should not be fired.
    this.panelChangedSinceLaunch = true;
  }

  sidebarPaneShown(sidebarPaneName: string): void {
    const code = SidebarPaneCodes[sidebarPaneName] || 0;
    const size = Object.keys(SidebarPaneCodes).length + 1;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.SidebarPaneShown, code, size);
  }

  settingsPanelShown(settingsViewId: string): void {
    this.panelShown('settings-' + settingsViewId);
  }

  actionTaken(action: Action): void {
    const size = Object.keys(Action).length + 1;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.ActionTaken, action, size);
  }

  panelLoaded(panelName: string, histogramName: string): void {
    if (this.firedLaunchHistogram || panelName !== this.launchPanelName) {
      return;
    }

    this.firedLaunchHistogram = true;
    // Use rAF and setTimeout to ensure the marker is fired after layout and rendering.
    // This will give the most accurate representation of the tool being ready for a user.
    requestAnimationFrame(() => {
      setTimeout(() => {
        // Mark the load time so that we can pinpoint it more easily in a trace.
        performance.mark(histogramName);
        // If the user has switched panel before we finished loading, ignore the histogram,
        // since the launch timings will have been affected and are no longer valid.
        if (this.panelChangedSinceLaunch) {
          return;
        }
        // This fires the event for the appropriate launch histogram.
        // The duration is measured as the time elapsed since the time origin of the document.
        InspectorFrontendHostInstance.recordPerformanceHistogram(histogramName, performance.now());
      }, 0);
    });
  }

  setLaunchPanel(panelName: string|null): void {
    this.launchPanelName = (panelName as string);
  }

  keybindSetSettingChanged(keybindSet: string): void {
    const size = Object.keys(KeybindSetSettings).length + 1;
    const value = KeybindSetSettings[keybindSet] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.KeybindSetSettingChanged, value, size);
  }

  keyboardShortcutFired(actionId: string): void {
    const size = Object.keys(KeyboardShortcutAction).length + 1;
    const action = KeyboardShortcutAction[actionId] || KeyboardShortcutAction.OtherShortcut;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.KeyboardShortcutFired, action, size);
  }

  issuesPanelOpenedFrom(issueOpener: IssueOpener): void {
    const size = Object.keys(IssueOpener).length + 1;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.IssuesPanelOpenedFrom, issueOpener, size);
  }

  issuesPanelIssueExpanded(issueExpandedCategory: string|undefined): void {
    if (issueExpandedCategory === undefined) {
      return;
    }

    const size = Object.keys(IssueExpanded).length + 1;
    const issueExpanded = IssueExpanded[issueExpandedCategory];

    if (issueExpanded === undefined) {
      return;
    }

    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.IssuesPanelIssueExpanded, issueExpanded, size);
  }

  issuesPanelResourceOpened(issueCategory: string, type: string): void {
    const size = Object.keys(IssueResourceOpened).length + 1;
    const key = issueCategory + type;
    const value = IssueResourceOpened[key];

    if (value === undefined) {
      return;
    }

    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.IssuesPanelResourceOpened, value, size);
  }

  issueCreated(code: string): void {
    const size = Object.keys(IssueCreated).length + 1;
    const issueCreated = IssueCreated[code];
    if (issueCreated === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.IssueCreated, issueCreated, size);
  }

  dualScreenDeviceEmulated(emulationAction: DualScreenDeviceEmulated): void {
    const size = Object.keys(DualScreenDeviceEmulated).length + 1;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.DualScreenDeviceEmulated, emulationAction, size);
  }

  cssEditorOpened(editorName: string): void {
    const size = Object.keys(CssEditorOpened).length + 1;
    const key = editorName;
    const value = CssEditorOpened[key];

    if (value === undefined) {
      return;
    }

    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.CssEditorOpened, value, size);
  }

  experimentEnabledAtLaunch(experimentId: string): void {
    const size = DevtoolsExperiments['__lastValidEnumPosition'] + 1;
    const experiment = DevtoolsExperiments[experimentId];
    if (experiment === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ExperimentEnabledAtLaunch, experiment, size);
  }

  experimentChanged(experimentId: string, isEnabled: boolean): void {
    const size = DevtoolsExperiments['__lastValidEnumPosition'] + 1;
    const experiment = DevtoolsExperiments[experimentId];
    if (experiment === undefined) {
      return;
    }
    const actionName = isEnabled ? EnumeratedHistogram.ExperimentEnabled : EnumeratedHistogram.ExperimentDisabled;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(actionName, experiment, size);
  }

  developerResourceLoaded(developerResourceLoaded: DeveloperResourceLoaded): void {
    const size = Object.keys(DeveloperResourceLoaded).length + 1;
    if (developerResourceLoaded >= size) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.DeveloperResourceLoaded, developerResourceLoaded, size);
  }

  developerResourceScheme(developerResourceScheme: DeveloperResourceScheme): void {
    const size = Object.keys(DeveloperResourceScheme).length + 1;
    if (developerResourceScheme >= size) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.DeveloperResourceScheme, developerResourceScheme, size);
  }

  linearMemoryInspectorRevealedFrom(linearMemoryInspectorRevealedFrom: LinearMemoryInspectorRevealedFrom): void {
    const size = Object.keys(LinearMemoryInspectorRevealedFrom).length + 1;
    if (linearMemoryInspectorRevealedFrom >= size) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.LinearMemoryInspectorRevealedFrom, linearMemoryInspectorRevealedFrom, size);
  }

  linearMemoryInspectorTarget(linearMemoryInspectorTarget: LinearMemoryInspectorTarget): void {
    const size = Object.keys(LinearMemoryInspectorTarget).length + 1;
    if (linearMemoryInspectorTarget >= size) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.LinearMemoryInspectorTarget, linearMemoryInspectorTarget, size);
  }

  language(language: Intl.UnicodeBCP47LocaleIdentifier): void {
    const size = Object.keys(Language).length + 1;
    const languageCode = Language[language];
    if (languageCode === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.Language, languageCode, size);
  }

  showCorsErrorsSettingChanged(show: boolean): void {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.ConsoleShowsCorsErrors, Number(show), 2);
  }
}

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
  // Keep key around because length of object is important. See Host.UserMetrics.actionTaken.
  'LegacyAuditsStarted-deprecated' = 7,
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
}

export const ContrastThresholds: {
  [x: string]: number,
} = {
  aa: 0,
  aaa: 1,
};

export const PanelCodes: {
  [x: string]: number,
} = {
  elements: 1,
  resources: 2,
  network: 3,
  sources: 4,
  timeline: 5,
  heap_profiler: 6,
  // Keep key around because length of object is important. See Host.UserMetrics.panelShown.
  'legacy-audits-deprecated': 7,
  console: 8,
  layers: 9,
  'console-view': 10,
  'animations': 11,
  'network.config': 12,
  'rendering': 13,
  'sensors': 14,
  'sources.search': 15,
  security: 16,
  js_profiler: 17,
  lighthouse: 18,
  'coverage': 19,
  'protocol-monitor': 20,
  'remote-devices': 21,
  'web-audio': 22,
  'changes.changes': 23,
  'performance.monitor': 24,
  'release-note': 25,
  'live_heap_profile': 26,
  'sources.quick': 27,
  'network.blocked-urls': 28,
  'settings-preferences': 29,
  'settings-workspace': 30,
  'settings-experiments': 31,
  'settings-blackbox': 32,
  'settings-devices': 33,
  'settings-throttling-conditions': 34,
  'settings-emulation-locations': 35,
  'settings-shortcuts': 36,
  'issues-pane': 37,
  'settings-keybinds': 38,
  'cssoverview': 39,
};

export const SidebarPaneCodes: {
  [x: string]: number,
} = {
  'OtherSidebarPane': 0,
  'Styles': 1,
  'Computed': 2,
  'elements.layout': 3,
  'elements.eventListeners': 4,
  'elements.domBreakpoints': 5,
  'elements.domProperties': 6,
  'accessibility.view': 7,
};

export const KeybindSetSettings: {
  [x: string]: number,
} = {
  'devToolsDefault': 0,
  'vsCode': 1,
};

export const KeyboardShortcutAction: {
  [x: string]: number,
} = {
  OtherShortcut: 0,
  'commandMenu.show': 1,
  'console.clear': 2,
  'console.show': 3,
  'debugger.step': 4,
  'debugger.step-into': 5,
  'debugger.step-out': 6,
  'debugger.step-over': 7,
  'debugger.toggle-breakpoint': 8,
  'debugger.toggle-breakpoint-enabled': 9,
  'debugger.toggle-pause': 10,
  'elements.edit-as-html': 11,
  'elements.hide-element': 12,
  'elements.redo': 13,
  'elements.toggle-element-search': 14,
  'elements.undo': 15,
  'main.search-in-panel.find': 16,
  'main.toggle-drawer': 17,
  'network.hide-request-details': 18,
  'network.search': 19,
  'network.toggle-recording': 20,
  'quickOpen.show': 21,
  'settings.show': 22,
  'sources.search': 23,
  'background-service.toggle-recording': 24,
  'components.collect-garbage': 25,
  'console.clear.history': 26,
  'console.create-pin': 27,
  'coverage.start-with-reload': 28,
  'coverage.toggle-recording': 29,
  'debugger.breakpoint-input-window': 30,
  'debugger.evaluate-selection': 31,
  'debugger.next-call-frame': 32,
  'debugger.previous-call-frame': 33,
  'debugger.run-snippet': 34,
  'debugger.toggle-breakpoints-active': 35,
  'elements.capture-area-screenshot': 36,
  'emulation.capture-full-height-screenshot': 37,
  'emulation.capture-node-screenshot': 38,
  'emulation.capture-screenshot': 39,
  'emulation.show-sensors': 40,
  'emulation.toggle-device-mode': 41,
  'help.release-notes': 42,
  'help.report-issue': 43,
  'input.start-replaying': 44,
  'input.toggle-pause': 45,
  'input.toggle-recording': 46,
  'inspector_main.focus-debuggee': 47,
  'inspector_main.hard-reload': 48,
  'inspector_main.reload': 49,
  'live-heap-profile.start-with-reload': 50,
  'live-heap-profile.toggle-recording': 51,
  'main.debug-reload': 52,
  'main.next-tab': 53,
  'main.previous-tab': 54,
  'main.search-in-panel.cancel': 55,
  'main.search-in-panel.find-next': 56,
  'main.search-in-panel.find-previous': 57,
  'main.toggle-dock': 58,
  'main.zoom-in': 59,
  'main.zoom-out': 60,
  'main.zoom-reset': 61,
  'network-conditions.network-low-end-mobile': 62,
  'network-conditions.network-mid-tier-mobile': 63,
  'network-conditions.network-offline': 64,
  'network-conditions.network-online': 65,
  'profiler.heap-toggle-recording': 66,
  'profiler.js-toggle-recording': 67,
  'resources.clear': 68,
  'settings.documentation': 69,
  'settings.shortcuts': 70,
  'sources.add-folder-to-workspace': 71,
  'sources.add-to-watch': 72,
  'sources.close-all': 73,
  'sources.close-editor-tab': 74,
  'sources.create-snippet': 75,
  'sources.go-to-line': 76,
  'sources.go-to-member': 77,
  'sources.jump-to-next-location': 78,
  'sources.jump-to-previous-location': 79,
  'sources.rename': 80,
  'sources.save': 81,
  'sources.save-all': 82,
  'sources.switch-file': 83,
  'timeline.jump-to-next-frame': 84,
  'timeline.jump-to-previous-frame': 85,
  'timeline.load-from-file': 86,
  'timeline.next-recording': 87,
  'timeline.previous-recording': 88,
  'timeline.record-reload': 89,
  'timeline.save-to-file': 90,
  'timeline.show-history': 91,
  'timeline.toggle-recording': 92,
  'sources.increment-css': 93,
  'sources.increment-css-by-ten': 94,
  'sources.decrement-css': 95,
  'sources.decrement-css-by-ten': 96,
  'layers.reset-view': 97,
  'layers.pan-mode': 98,
  'layers.rotate-mode': 99,
  'layers.zoom-in': 100,
  'layers.zoom-out': 101,
  'layers.up': 102,
  'layers.down': 103,
  'layers.left': 104,
  'layers.right': 105,
  'help.report-translation-issue': 106,
};

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum IssueOpener {
  ConsoleInfoBar = 0,
  LearnMoreLinkCOEP = 1,
  StatusBarIssuesCounter = 2,
  HamburgerMenu = 3,
  Adorner = 4,
  CommandMenu = 5,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum DualScreenDeviceEmulated {
  DualScreenDeviceSelected = 0,
  SpanButtonClicked = 1,
  PlatformSupportUsed = 2,  // user starts to use platform dual screen support feature.
}

export const CssEditorOpened: {
  [x: string]: number,
} = {
  'colorPicker': 0,
  'shadowEditor': 1,
  'bezierEditor': 2,
  'fontEditor': 3,
};

/**
 * This list should contain the currently active Devtools Experiments.
 * Therefore, it is possible that the id's will no longer be continuous
 * as experiemnts are removed.
 * When adding a new experiemnt:
 * 1. Add an entry to the bottom of the list before '__lastValidEnumPosition'
 * 2. Set the value of the new entry and '__lastValidEnumPosition' to
 *    __lastValidEnumPosition + 1
 * When removing an experiment, simply delete the line from the enum.
 */
export const DevtoolsExperiments: {
  [x: string]: number,
} = {
  'applyCustomStylesheet': 0,
  'captureNodeCreationStacks': 1,
  'sourcesPrettyPrint': 2,
  'backgroundServices': 3,
  'backgroundServicesNotifications': 4,
  'backgroundServicesPaymentHandler': 5,
  'backgroundServicesPushMessaging': 6,
  'blackboxJSFramesOnTimeline': 7,
  'inputEventsOnTimelineOverview': 10,
  'liveHeapProfile': 11,
  'protocolMonitor': 13,
  'developerResourcesView': 15,
  'recordCoverageWithPerformanceTracing': 16,
  'samplingHeapProfilerTimeline': 17,
  'showOptionToNotTreatGlobalObjectsAsRoots': 18,
  'sourceOrderViewer': 20,
  'webauthnPane': 22,
  'timelineEventInitiators': 24,
  'timelineInvalidationTracking': 26,
  'timelineShowAllEvents': 27,
  'timelineV8RuntimeCallStats': 28,
  'timelineWebGL': 29,
  'timelineReplayEvent': 30,
  'wasmDWARFDebugging': 31,
  'dualScreenSupport': 32,
  'keyboardShortcutEditor': 35,
  'APCA': 39,
  'cspViolationsView': 40,
  'fontEditor': 41,
  'fullAccessibilityTree': 42,
  'ignoreListJSFramesOnTimeline': 43,
  'contrastIssues': 44,
  'experimentalCookieFeatures': 45,
  'localizedDevTools': 46,
  'bfcacheDebugging': 47,
  'hideIssuesFeature': 48,
  'reportingApiDebugging': 49,
  'syncSettings': 50,
  'groupAndHideIssuesByKind': 51,
  'cssTypeComponentLength': 52,
  '__lastValidEnumPosition': 52,
};

export const IssueExpanded: {
  [x: string]: number,
} = {
  CrossOriginEmbedderPolicy: 0,
  MixedContent: 1,
  SameSiteCookie: 2,
  HeavyAd: 3,
  ContentSecurityPolicy: 4,
  Other: 5,
};

export const IssueResourceOpened: {
  [x: string]: number,
} = {
  CrossOriginEmbedderPolicyRequest: 0,
  CrossOriginEmbedderPolicyElement: 1,
  MixedContentRequest: 2,
  SameSiteCookieCookie: 3,
  SameSiteCookieRequest: 4,
  HeavyAdElement: 5,
  ContentSecurityPolicyDirective: 6,
  ContentSecurityPolicyElement: 7,
  CrossOriginEmbedderPolicyLearnMore: 8,
  MixedContentLearnMore: 9,
  SameSiteCookieLearnMore: 10,
  HeavyAdLearnMore: 11,
  ContentSecurityPolicyLearnMore: 12,
};

export const IssueCreated: {
  [x: string]: number,
} = {
  MixedContentIssue: 0,
  'ContentSecurityPolicyIssue::kInlineViolation': 1,
  'ContentSecurityPolicyIssue::kEvalViolation': 2,
  'ContentSecurityPolicyIssue::kURLViolation': 3,
  'ContentSecurityPolicyIssue::kTrustedTypesSinkViolation': 4,
  'ContentSecurityPolicyIssue::kTrustedTypesPolicyViolation': 5,
  'HeavyAdIssue::NetworkTotalLimit': 6,
  'HeavyAdIssue::CpuTotalLimit': 7,
  'HeavyAdIssue::CpuPeakLimit': 8,
  'CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader': 9,
  'CrossOriginEmbedderPolicyIssue::CoopSandboxedIFrameCannotNavigateToCoopPage': 10,
  'CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin': 11,
  'CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep': 12,
  'CrossOriginEmbedderPolicyIssue::CorpNotSameSite': 13,
  'SameSiteCookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie': 14,
  'SameSiteCookieIssue::ExcludeSameSiteNoneInsecure::SetCookie': 15,
  'SameSiteCookieIssue::WarnSameSiteNoneInsecure::ReadCookie': 16,
  'SameSiteCookieIssue::WarnSameSiteNoneInsecure::SetCookie': 17,
  'SameSiteCookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Secure': 18,
  'SameSiteCookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Insecure': 19,
  'SameSiteCookieIssue::WarnCrossDowngrade::ReadCookie::Secure': 20,
  'SameSiteCookieIssue::WarnCrossDowngrade::ReadCookie::Insecure': 21,
  'SameSiteCookieIssue::WarnCrossDowngrade::SetCookie::Secure': 22,
  'SameSiteCookieIssue::WarnCrossDowngrade::SetCookie::Insecure': 23,
  'SameSiteCookieIssue::ExcludeNavigationContextDowngrade::Secure': 24,
  'SameSiteCookieIssue::ExcludeNavigationContextDowngrade::Insecure': 25,
  'SameSiteCookieIssue::ExcludeContextDowngrade::ReadCookie::Secure': 26,
  'SameSiteCookieIssue::ExcludeContextDowngrade::ReadCookie::Insecure': 27,
  'SameSiteCookieIssue::ExcludeContextDowngrade::SetCookie::Secure': 28,
  'SameSiteCookieIssue::ExcludeContextDowngrade::SetCookie::Insecure': 29,
  'SameSiteCookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie': 30,
  'SameSiteCookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie': 31,
  'SameSiteCookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie': 32,
  'SameSiteCookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie': 33,
  'SameSiteCookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie': 34,
  'SameSiteCookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie': 35,
  'SharedArrayBufferIssue::TransferIssue': 36,
  'SharedArrayBufferIssue::CreationIssue': 37,
  'TrustedWebActivityIssue::kHttpError': 38,
  'TrustedWebActivityIssue::kUnavailableOffline': 39,
  'TrustedWebActivityIssue::kDigitalAssetLinks': 40,
  LowTextContrastIssue: 41,
  'CorsIssue::InsecurePrivateNetwork': 42,
  'CorsIssue::InsecurePrivateNetworkPreflight': 43,
  'CorsIssue::InvalidHeaders': 44,
  'CorsIssue::WildcardOriginWithCredentials': 45,
  'CorsIssue::PreflightResponseInvalid': 46,
  'CorsIssue::OriginMismatch': 47,
  'CorsIssue::AllowCredentialsRequired': 48,
  'CorsIssue::MethodDisallowedByPreflightResponse': 49,
  'CorsIssue::HeaderDisallowedByPreflightResponse': 50,
  'CorsIssue::RedirectContainsCredentials': 51,
  'CorsIssue::DisallowedByMode': 52,
  'CorsIssue::CorsDisabledScheme': 53,
  'CorsIssue::PreflightMissingAllowExternal': 54,
  'CorsIssue::PreflightInvalidAllowExternal': 55,
  'CorsIssue::InvalidResponse': 56,
  'CorsIssue::NoCorsRedirectModeNotFollow': 57,
  'QuirksModeIssue::QuirksMode': 58,
  'QuirksModeIssue::LimitedQuirksMode': 59,
};

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
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum LinearMemoryInspectorRevealedFrom {
  ContextMenu = 0,
  MemoryIcon = 1,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum LinearMemoryInspectorTarget {
  DWARFInspectableAddress = 0,
  ArrayBuffer = 1,
  DataView = 2,
  TypedArray = 3,
  WebAssemblyMemory = 4,
}

export const Language: Record<string, number> = {
  'af': 1,
  'am': 2,
  'ar': 3,
  'as': 4,
  'az': 5,
  'be': 6,
  'bg': 7,
  'bn': 8,
  'bs': 9,
  'ca': 10,
  'cs': 11,
  'cy': 12,
  'da': 13,
  'de': 14,
  'el': 15,
  'en-GB': 16,
  'en-US': 17,
  'es-419': 18,
  'es': 19,
  'et': 20,
  'eu': 21,
  'fa': 22,
  'fi': 23,
  'fil': 24,
  'fr-CA': 25,
  'fr': 26,
  'gl': 27,
  'gu': 28,
  'he': 29,
  'hi': 30,
  'hr': 31,
  'hu': 32,
  'hy': 33,
  'id': 34,
  'is': 35,
  'it': 36,
  'ja': 37,
  'ka': 38,
  'kk': 39,
  'km': 40,
  'kn': 41,
  'ko': 42,
  'ky': 43,
  'lo': 44,
  'lt': 45,
  'lv': 46,
  'mk': 47,
  'ml': 48,
  'mn': 49,
  'mr': 50,
  'ms': 51,
  'my': 52,
  'ne': 53,
  'nl': 54,
  'no': 55,
  'or': 56,
  'pa': 57,
  'pl': 58,
  'pt-PT': 59,
  'pt': 60,
  'ro': 61,
  'ru': 62,
  'si': 63,
  'sk': 64,
  'sl': 65,
  'sq': 66,
  'sr-Latn': 67,
  'sr': 68,
  'sv': 69,
  'sw': 70,
  'ta': 71,
  'te': 72,
  'th': 73,
  'tr': 74,
  'uk': 75,
  'ur': 76,
  'uz': 77,
  'vi': 78,
  'zh': 79,
  'zh-HK': 80,
  'zh-TW': 81,
  'zu': 82,
};
