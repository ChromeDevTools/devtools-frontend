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

import * as Common from '../common/common.js';

/**
 * @unrestricted
 */
import {InspectorFrontendHostInstance} from './InspectorFrontendHost.js';
import {EnumeratedHistogram} from './InspectorFrontendHostAPI.js';

export class UserMetrics {
  constructor() {
    this._panelChangedSinceLaunch = false;
    this._firedLaunchHistogram = false;
    this._launchPanelName = '';
  }

  /**
   * @param {string} panelName
   */
  panelShown(panelName) {
    const code = PanelCodes[panelName] || 0;
    const size = Object.keys(PanelCodes).length + 1;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.PanelShown, code, size);
    Common.EventTarget.fireEvent(EnumeratedHistogram.PanelShown, {value: code});
    // Store that the user has changed the panel so we know launch histograms should not be fired.
    this._panelChangedSinceLaunch = true;
  }

  /**
   * Fired when a panel is closed (regardless if it exists in the main panel or the drawer)
   * @param {string} panelName
   */
  panelClosed(panelName) {
    const code = PanelCodes[panelName] || 0;
    const size = Object.keys(PanelCodes).length + 1;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.PanelClosed, code, size);
    Common.EventTarget.fireEvent(EnumeratedHistogram.PanelClosed, {value: code});
    // Store that the user has changed the panel so we know launch histograms should not be fired.
    this._panelChangedSinceLaunch = true;
  }

  /**
   * @param {string} settingsViewId
   */
  settingsPanelShown(settingsViewId) {
    this.panelShown('settings-' + settingsViewId);
  }

  /**
   * @param {!Action} action
   */
  actionTaken(action) {
    const size = Object.keys(Action).length + 1;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.ActionTaken, action, size);
    Common.EventTarget.fireEvent(EnumeratedHistogram.ActionTaken, {value: action});
  }

  /**
   * @param {string} panelName
   * @param {string} histogramName
   * @suppressGlobalPropertiesCheck
   */
  panelLoaded(panelName, histogramName) {
    if (this._firedLaunchHistogram || panelName !== this._launchPanelName) {
      return;
    }

    this._firedLaunchHistogram = true;
    // Use rAF and setTimeout to ensure the marker is fired after layout and rendering.
    // This will give the most accurate representation of the tool being ready for a user.
    requestAnimationFrame(() => {
      setTimeout(() => {
        // Mark the load time so that we can pinpoint it more easily in a trace.
        performance.mark(histogramName);
        // If the user has switched panel before we finished loading, ignore the histogram,
        // since the launch timings will have been affected and are no longer valid.
        if (this._panelChangedSinceLaunch) {
          return;
        }
        // This fires the event for the appropriate launch histogram.
        // The duration is measured as the time elapsed since the time origin of the document.
        InspectorFrontendHostInstance.recordPerformanceHistogram(histogramName, performance.now());
        Common.EventTarget.fireEvent('DevTools.PanelLoaded', {value: {panelName, histogramName}});
      }, 0);
    });
  }

  /**
   * @param {?string} panelName
   */
  setLaunchPanel(panelName) {
    // Store the panel name that we should use for the launch histogram.
    // Other calls to panelLoaded will be ignored if the name does not match the one set here.
    this._launchPanelName = /** @type {string} */ (panelName);
  }

  /**
   * @param {string} keybindSet
   */
  keybindSetSettingChanged(keybindSet) {
    const size = Object.keys(KeybindSetSettings).length + 1;
    const value = KeybindSetSettings[keybindSet] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.KeybindSetSettingChanged, value, size);
    Common.EventTarget.fireEvent(EnumeratedHistogram.KeybindSetSettingChanged, {value});
  }

  /**
   * @param {string} actionId
   */
  keyboardShortcutFired(actionId) {
    const size = Object.keys(KeyboardShortcutAction).length + 1;
    const action = KeyboardShortcutAction[actionId] || KeyboardShortcutAction.OtherShortcut;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.KeyboardShortcutFired, action, size);
    Common.EventTarget.fireEvent(EnumeratedHistogram.KeyboardShortcutFired, {value: action});
  }

  /**
   * @param {!IssueOpener} issueOpener
   */
  issuesPanelOpenedFrom(issueOpener) {
    const size = Object.keys(IssueOpener).length + 1;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.IssuesPanelOpenedFrom, issueOpener, size);
    Common.EventTarget.fireEvent(EnumeratedHistogram.IssuesPanelOpenedFrom, {value: issueOpener});
  }

  /**
   * @param {!DualScreenDeviceEmulated} emulationAction
   */
  dualScreenDeviceEmulated(emulationAction) {
    const size = Object.keys(DualScreenDeviceEmulated).length + 1;
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
        EnumeratedHistogram.DualScreenDeviceEmulated, emulationAction, size);
    Common.EventTarget.fireEvent(EnumeratedHistogram.DualScreenDeviceEmulated, {value: emulationAction});
  }

  /**
   * @param {string} gridSettingId
   */
  cssGridSettings(gridSettingId) {
    const size = Object.keys(CSSGridSettings).length + 1;
    const gridSetting = CSSGridSettings[gridSettingId];
    if (gridSetting === undefined) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.CSSGridSettings, gridSetting, size);
    Common.EventTarget.fireEvent(EnumeratedHistogram.CSSGridSettings, {value: gridSetting});
  }
}

// Codes below are used to collect UMA histograms in the Chromium port.
// Do not change the values below, additional actions are needed on the Chromium side
// in order to add more codes.

/** @enum {number} */
export const Action = {
  WindowDocked: 1,
  WindowUndocked: 2,
  ScriptsBreakpointSet: 3,
  TimelineStarted: 4,
  ProfilesCPUProfileTaken: 5,
  ProfilesHeapProfileTaken: 6,
  // Keep key around because length of object is important. See Host.UserMetrics.actionTaken.
  'LegacyAuditsStarted-deprecated': 7,
  ConsoleEvaluated: 8,
  FileSavedInWorkspace: 9,
  DeviceModeEnabled: 10,
  AnimationsPlaybackRateChanged: 11,
  RevisionApplied: 12,
  FileSystemDirectoryContentReceived: 13,
  StyleRuleEdited: 14,
  CommandEvaluatedInConsolePanel: 15,
  DOMPropertiesExpanded: 16,
  ResizedViewInResponsiveMode: 17,
  TimelinePageReloadStarted: 18,
  ConnectToNodeJSFromFrontend: 19,
  ConnectToNodeJSDirectly: 20,
  CpuThrottlingEnabled: 21,
  CpuProfileNodeFocused: 22,
  CpuProfileNodeExcluded: 23,
  SelectFileFromFilePicker: 24,
  SelectCommandFromCommandMenu: 25,
  ChangeInspectedNodeInElementsPanel: 26,
  StyleRuleCopied: 27,
  CoverageStarted: 28,
  LighthouseStarted: 29,
  LighthouseFinished: 30,
  ShowedThirdPartyBadges: 31,
  LighthouseViewTrace: 32,
  FilmStripStartedRecording: 33,
  CoverageReportFiltered: 34,
  CoverageStartedPerBlock: 35,
  SettingsOpenedFromGear: 36,
  SettingsOpenedFromMenu: 37,
  SettingsOpenedFromCommandMenu: 38,
  TabMovedToDrawer: 39,
  TabMovedToMainPanel: 40,
  CaptureCssOverviewClicked: 41
};

/** @type {!Object<string, number>} */
export const PanelCodes = {
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
  'cssoverview': 39
};

/** @type {!Object<string, number>} */
export const KeybindSetSettings = {
  'devToolsDefault': 0,
  'vsCode': 1,
};

/** @type {!Object<string, number>} */
export const KeyboardShortcutAction = {
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
};

/** @enum {number} */
export const IssueOpener = {
  ConsoleInfoBar: 0,
  LearnMoreLinkCOEP: 1,
  StatusBarIssuesCounter: 2,
  HamburgerMenu: 3,
  Adorner: 4
};

/** @enum {number} */
export const DualScreenDeviceEmulated = {
  DualScreenDeviceSelected: 0,  // a dual screen or fold device is selected
  SpanButtonClicked: 1,         // span button is clicked when emulating a dual screen/fold device
  PlatformSupportUsed: 2        // user starts to use platform dual screen support feature.
};

/** @type {!Object<string, number>} */
export const CSSGridSettings = {
  'showGridBorder.none': 0,
  'showGridBorder.dashed': 1,
  'showGridBorder.solid': 2,
  'showGridLines.none': 3,
  'showGridLines.dashed': 4,
  'showGridLines.solid': 5,
  'showGridLines.extended-dashed': 6,
  'showGridLines.extended-solid': 7,
  'showGridLineNumbers.none': 8,
  'showGridLineNumbers.positive': 9,
  'showGridLineNumbers.negative': 10,
  'showGridLineNumbers.both': 11,
  'showGridGaps.none': 12,
  'showGridGaps.row-gaps': 13,
  'showGridGaps.column-gaps': 14,
  'showGridGaps.both': 15,
  'showGridAreas.false': 16,
  'showGridAreas.true': 17,
  'showGridLineNumbers.names': 18,
  'showGridTrackSizes.false': 19,
  'showGridTrackSizes.true': 20,
};
