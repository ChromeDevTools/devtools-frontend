// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// We want to keep this a IIFE as we want to keep the global scope clean
// We inject this script via a Classic script
// https://crsrc.org/c/third_party/blink/renderer/controller/dev_tools_frontend_impl.cc;l=107
(window => {
  /**
   * A function that tries to check the remotely connected instance
   * major version. You should check against this to provide
   * forward and backwards compatibility.
   *
   * @returns {number|null}
   */

  function getRemoteMajorVersion() {
    try {
      const remoteVersion = new URLSearchParams(window.location.search).get('remoteVersion');
      if (!remoteVersion) {
        return null;
      }
      return parseInt(remoteVersion.split('.')[0], 10);
    } catch {
      return null;
    }
  }
  // eslint-disable-next-line no-unused-vars
  const majorVersion = getRemoteMajorVersion();

  // DevToolsAPI ----------------------------------------------------------------
  /**
   * @typedef {{runtimeAllowedHosts: string[], runtimeBlockedHosts: string[]}} ExtensionHostsPolicy
   * @typedef {{startPage: string, name: string, exposeExperimentalAPIs: boolean, hostsPolicy?: ExtensionHostsPolicy}} ExtensionDescriptor
   */
  class DevToolsAPIImpl {
    /**
     * @type {string[]}
     */
    _originsForbiddenForExtensions = [];

    /**
     * @type {ExtensionDescriptor[]}
     */
    _pendingExtensionDescriptors = [];
    /**
     * @type {number}
     */
    _lastCallId = 0;
    /**
     * @type {Record<number, (arg1: object) => void>}
     */
    _callbacks = {};

    /**
     * @type {((param:ExtensionDescriptor)=> void) | null}
     */
    _addExtensionCallback = null;

    /**
     * @type {Promise<string>}
     */
    _initialTargetIdPromise;
    /**
     * @type {(param:string) => void}
     */
    _setInitialTargetId;

    constructor() {
      this._initialTargetIdPromise = new Promise(resolve => {
        this._setInitialTargetId = resolve;
      });
    }

    /**
     * @param id
     * @param arg
     */
    embedderMessageAck(id, arg) {
      const callback = this._callbacks[id];
      delete this._callbacks[id];
      if (callback) {
        callback(arg);
      }
    }

    /**
     * @param method
     * @param args
     * @param callback
     */
    sendMessageToEmbedder(method, args, callback) {
      const callId = ++this._lastCallId;
      if (callback) {
        this._callbacks[callId] = callback;
      }
      const message = {id: callId, method};
      if (args.length) {
        message.params = args;
      }
      DevToolsHost.sendMessageToEmbedder(JSON.stringify(message));
    }

    /**
     * @typedef {import('./core/host/InspectorFrontendHostAPI.js').Events} Events
     * @typedef {import('./core/host/InspectorFrontendHost.js').InspectorFrontendAPIImplMethods} Methods
     * @param {`${Events|Methods}`} method
     * @param args
     */
    _dispatchOnInspectorFrontendAPI(method, args) {
      const inspectorFrontendAPI = window.InspectorFrontendAPI;
      if (!inspectorFrontendAPI) {
        // This is the case for device_mode_emulation_frame entrypoint. It's created via `window.open` from
        // the DevTools window, so it shares a context with DevTools but has a separate DevToolsUIBinding and `window` object.
        // We can safely ignore the events since they also arrive on the DevTools `window` object.
        return;
      }
      inspectorFrontendAPI[method].apply(inspectorFrontendAPI, args);
    }

    // API methods below this line --------------------------------------------

    /**
     * @param {ExtensionDescriptor[]} extensions
     */
    addExtensions(extensions) {
      // The addExtensions command is sent as the onload event happens for
      // DevTools front-end. We should buffer this command until the frontend
      // is ready for it.
      if (this._addExtensionCallback) {
        extensions.forEach(this._addExtensionCallback);
      } else {
        this._pendingExtensionDescriptors.push(...extensions);
      }
    }

    /**
     * @param {string[]} forbiddenOrigins
     */
    setOriginsForbiddenForExtensions(forbiddenOrigins) {
      this._originsForbiddenForExtensions = forbiddenOrigins;
    }

    /**
     * @returns {string[]}
     */
    getOriginsForbiddenForExtensions() {
      return this._originsForbiddenForExtensions;
    }

    /**
     * @param {string} url
     */
    appendedToURL(url) {
      this._dispatchOnInspectorFrontendAPI('appendedToURL', [url]);
    }

    /**
     * @param {string} url
     */
    canceledSaveURL(url) {
      this._dispatchOnInspectorFrontendAPI('canceledSaveURL', [url]);
    }

    contextMenuCleared() {
      this._dispatchOnInspectorFrontendAPI('contextMenuCleared', []);
    }

    /**
     * @param id
     */
    contextMenuItemSelected(id) {
      this._dispatchOnInspectorFrontendAPI('contextMenuItemSelected', [id]);
    }

    /**
     * @param {number} count
     */
    deviceCountUpdated(count) {
      this._dispatchOnInspectorFrontendAPI('deviceCountUpdated', [count]);
    }

    /**
     * @param config
     */
    devicesDiscoveryConfigChanged(config) {
      this._dispatchOnInspectorFrontendAPI('devicesDiscoveryConfigChanged', [config]);
    }

    /**
     * @param status
     */
    devicesPortForwardingStatusChanged(status) {
      this._dispatchOnInspectorFrontendAPI('devicesPortForwardingStatusChanged', [status]);
    }

    /**
     * @param devices
     */
    devicesUpdated(devices) {
      this._dispatchOnInspectorFrontendAPI('devicesUpdated', [devices]);
    }

    /**
     * @param message
     */
    dispatchMessage(message) {
      this._dispatchOnInspectorFrontendAPI('dispatchMessage', [message]);
    }

    /**
     * @param messageChunk
     * @param messageSize
     */
    dispatchMessageChunk(messageChunk, messageSize) {
      this._dispatchOnInspectorFrontendAPI('dispatchMessageChunk', [messageChunk, messageSize]);
    }

    enterInspectElementMode() {
      this._dispatchOnInspectorFrontendAPI('enterInspectElementMode', []);
    }

    /**
     * @param color
     */
    eyeDropperPickedColor(color) {
      this._dispatchOnInspectorFrontendAPI('eyeDropperPickedColor', [color]);
    }

    /**
     * @param fileSystems
     */
    fileSystemsLoaded(fileSystems) {
      this._dispatchOnInspectorFrontendAPI('fileSystemsLoaded', [fileSystems]);
    }

    /**
     * @param fileSystemPath
     */
    fileSystemRemoved(fileSystemPath) {
      this._dispatchOnInspectorFrontendAPI('fileSystemRemoved', [fileSystemPath]);
    }

    /**
     * @param error
     * @param fileSystem
     */
    fileSystemAdded(error, fileSystem) {
      this._dispatchOnInspectorFrontendAPI('fileSystemAdded', [error, fileSystem]);
    }

    /**
     * @param changedPaths
     * @param addedPaths
     * @param removedPaths
     */
    fileSystemFilesChangedAddedRemoved(changedPaths, addedPaths, removedPaths) {
      this._dispatchOnInspectorFrontendAPI(
          'fileSystemFilesChangedAddedRemoved', [changedPaths, addedPaths, removedPaths]);
    }

    /**
     * @param requestId
     * @param fileSystemPath
     * @param totalWork
     */
    indexingTotalWorkCalculated(requestId, fileSystemPath, totalWork) {
      this._dispatchOnInspectorFrontendAPI('indexingTotalWorkCalculated', [requestId, fileSystemPath, totalWork]);
    }

    /**
     * @param requestId
     * @param fileSystemPath
     * @param worked
     */
    indexingWorked(requestId, fileSystemPath, worked) {
      this._dispatchOnInspectorFrontendAPI('indexingWorked', [requestId, fileSystemPath, worked]);
    }

    /**
     * @param requestId
     * @param fileSystemPath
     */
    indexingDone(requestId, fileSystemPath) {
      this._dispatchOnInspectorFrontendAPI('indexingDone', [requestId, fileSystemPath]);
    }

    /**
     * @param event
     */
    keyEventUnhandled(event) {
      event.keyIdentifier = keyCodeToKeyIdentifier(event.keyCode);
      this._dispatchOnInspectorFrontendAPI('keyEventUnhandled', [event]);
    }

    /**
     * @param {(param: object) => unknown} callback
     */
    setAddExtensionCallback(callback) {
      this._addExtensionCallback = callback;
      if (this._pendingExtensionDescriptors.length) {
        this._pendingExtensionDescriptors.forEach(this._addExtensionCallback);
        this._pendingExtensionDescriptors = [];
      }
    }

    /**
     * @param {boolean} hard
     */
    reloadInspectedPage(hard) {
      this._dispatchOnInspectorFrontendAPI('reloadInspectedPage', [hard]);
    }

    /**
     * @param url
     * @param lineNumber
     * @param columnNumber
     */
    revealSourceLine(url, lineNumber, columnNumber) {
      this._dispatchOnInspectorFrontendAPI('revealSourceLine', [url, lineNumber, columnNumber]);
    }

    /**
     * @param url
     * @param fileSystemPath
     */
    savedURL(url, fileSystemPath) {
      this._dispatchOnInspectorFrontendAPI('savedURL', [url, fileSystemPath]);
    }

    /**
     * @param requestId
     * @param fileSystemPath
     * @param files
     */
    searchCompleted(requestId, fileSystemPath, files) {
      this._dispatchOnInspectorFrontendAPI('searchCompleted', [requestId, fileSystemPath, files]);
    }

    colorThemeChanged() {
      this._dispatchOnInspectorFrontendAPI('colorThemeChanged', []);
    }

    /**
     * @param {string} tabId
     */
    setInspectedTabId(tabId) {
      this._inspectedTabIdValue = tabId;

      this._dispatchOnInspectorFrontendAPI('setInspectedTabId', [tabId]);
    }

    /**
     * @param {string} targetId
     */
    setInitialTargetId(targetId) {
      this._setInitialTargetId(targetId);
    }

    /**
     * @returns
     */
    getInspectedTabId() {
      return this._inspectedTabIdValue;
    }

    /**
     * @param {boolean} useSoftMenu
     */
    setUseSoftMenu(useSoftMenu) {
      this._dispatchOnInspectorFrontendAPI('setUseSoftMenu', [useSoftMenu]);
    }

    /**
     * @param {string} panelName
     */
    showPanel(panelName) {
      this._dispatchOnInspectorFrontendAPI('showPanel', [panelName]);
    }

    /**
     * @param {number} id
     * @param {string} chunk
     * @param {boolean} encoded
     */
    streamWrite(id, chunk, encoded) {
      this._dispatchOnInspectorFrontendAPI('streamWrite', [id, encoded ? this._decodeBase64(chunk) : chunk]);
    }

    /**
     * @param {string} chunk
     * @returns {string}
     */
    _decodeBase64(chunk) {
      const request = new XMLHttpRequest();
      request.open('GET', 'data:text/plain;base64,' + chunk, false);
      request.send(null);
      if (request.status === 200) {
        return request.responseText;
      }
      console.error('Error while decoding chunk in streamWrite');
      return '';
    }
  }

  const DevToolsAPI = new DevToolsAPIImpl();
  window.DevToolsAPI = DevToolsAPI;

  // LINT.IfChange(DevToolsMetrics)
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
  window.DevToolsMetrics = {
    Action: {
      WindowDocked: 1,
      WindowUndocked: 2,
      ScriptsBreakpointSet: 3,
      TimelineStarted: 4,
      ProfilesCPUProfileTaken: 5,
      ProfilesHeapProfileTaken: 6,
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
      'SettingsOpenedFromGear-deprecated': 36,
      'SettingsOpenedFromMenu-deprecated': 37,
      'SettingsOpenedFromCommandMenu-deprecated': 38,
      TabMovedToDrawer: 39,
      TabMovedToMainPanel: 40,
      CaptureCssOverviewClicked: 41,
      VirtualAuthenticatorEnvironmentEnabled: 42,
      SourceOrderViewActivated: 43,
      UserShortcutAdded: 44,
      ShortcutRemoved: 45,
      ShortcutModified: 46,
      CustomPropertyLinkClicked: 47,
      CustomPropertyEdited: 48,
      ServiceWorkerNetworkRequestClicked: 49,
      ServiceWorkerNetworkRequestClosedQuickly: 50,
      NetworkPanelServiceWorkerRespondWith: 51,
      NetworkPanelCopyValue: 52,
      ConsoleSidebarOpened: 53,
      PerfPanelTraceImported: 54,
      PerfPanelTraceExported: 55,
      StackFrameRestarted: 56,
      CaptureTestProtocolClicked: 57,
      BreakpointRemovedFromRemoveButton: 58,
      BreakpointGroupExpandedStateChanged: 59,
      HeaderOverrideFileCreated: 60,
      HeaderOverrideEnableEditingClicked: 61,
      HeaderOverrideHeaderAdded: 62,
      HeaderOverrideHeaderEdited: 63,
      HeaderOverrideHeaderRemoved: 64,
      HeaderOverrideHeadersFileEdited: 65,
      PersistenceNetworkOverridesEnabled: 66,
      PersistenceNetworkOverridesDisabled: 67,
      BreakpointRemovedFromContextMenu: 68,
      BreakpointsInFileRemovedFromRemoveButton: 69,
      BreakpointsInFileRemovedFromContextMenu: 70,
      BreakpointsInFileCheckboxToggled: 71,
      BreakpointsInFileEnabledDisabledFromContextMenu: 72,
      BreakpointConditionEditedFromSidebar: 73,
      WorkspaceTabAddFolder: 74,
      WorkspaceTabRemoveFolder: 75,
      OverrideTabAddFolder: 76,
      OverrideTabRemoveFolder: 77,
      WorkspaceSourceSelected: 78,
      OverridesSourceSelected: 79,
      StyleSheetInitiatorLinkClicked: 80,
      BreakpointRemovedFromGutterContextMenu: 81,
      BreakpointRemovedFromGutterToggle: 82,
      StylePropertyInsideKeyframeEdited: 83,
      OverrideContentFromSourcesContextMenu: 84,
      OverrideContentFromNetworkContextMenu: 85,
      OverrideScript: 86,
      OverrideStyleSheet: 87,
      OverrideDocument: 88,
      OverrideFetchXHR: 89,
      OverrideImage: 90,
      OverrideFont: 91,
      OverrideContentContextMenuSetup: 92,
      OverrideContentContextMenuAbandonSetup: 93,
      OverrideContentContextMenuActivateDisabled: 94,
      OverrideContentContextMenuOpenExistingFile: 95,
      OverrideContentContextMenuSaveNewFile: 96,
      ShowAllOverridesFromSourcesContextMenu: 97,
      ShowAllOverridesFromNetworkContextMenu: 98,
      AnimationGroupsCleared: 99,
      AnimationsPaused: 100,
      AnimationsResumed: 101,
      AnimatedNodeDescriptionClicked: 102,
      AnimationGroupScrubbed: 103,
      AnimationGroupReplayed: 104,
      OverrideTabDeleteFolderContextMenu: 105,
      WorkspaceDropFolder: 107,
      WorkspaceSelectFolder: 108,
      OverrideContentContextMenuSourceMappedWarning: 109,
      OverrideContentContextMenuRedirectToDeployed: 110,
      NewStyleRuleAdded: 111,
      TraceExpanded: 112,
      InsightConsoleMessageShown: 113,
      InsightRequestedViaContextMenu: 114,
      InsightRequestedViaHoverButton: 115,
      InsightRatedPositive: 117,
      InsightRatedNegative: 118,
      InsightClosed: 119,
      InsightErrored: 120,
      InsightHoverButtonShown: 121,
      SelfXssWarningConsoleMessageShown: 122,
      SelfXssWarningDialogShown: 123,
      SelfXssAllowPastingInConsole: 124,
      SelfXssAllowPastingInDialog: 125,
      ToggleEmulateFocusedPageFromStylesPaneOn: 126,
      ToggleEmulateFocusedPageFromStylesPaneOff: 127,
      ToggleEmulateFocusedPageFromRenderingTab: 128,
      ToggleEmulateFocusedPageFromCommandMenu: 129,
      InsightGenerated: 130,
      InsightErroredApi: 131,
      InsightErroredMarkdown: 132,
      ToggleShowWebVitals: 133,
      InsightErroredPermissionDenied: 134,
      InsightErroredCannotSend: 135,
      InsightErroredRequestFailed: 136,
      InsightErroredCannotParseChunk: 137,
      InsightErroredUnknownChunk: 138,
      InsightErroredOther: 139,
      AutofillReceived: 140,
      AutofillReceivedAndTabAutoOpened: 141,
      AnimationGroupSelected: 142,
      ScrollDrivenAnimationGroupSelected: 143,
      ScrollDrivenAnimationGroupScrubbed: 144,
      AiAssistanceOpenedFromElementsPanel: 145,
      AiAssistanceOpenedFromStylesTab: 146,
      ConsoleFilterByContext: 147,
      ConsoleFilterBySource: 148,
      ConsoleFilterByUrl: 149,
      InsightConsentReminderShown: 150,
      InsightConsentReminderCanceled: 151,
      InsightConsentReminderConfirmed: 152,
      InsightsOnboardingShown: 153,
      InsightsOnboardingCanceledOnPage1: 154,
      InsightsOnboardingCanceledOnPage2: 155,
      InsightsOnboardingConfirmed: 156,
      InsightsOnboardingNextPage: 157,
      InsightsOnboardingPrevPage: 158,
      InsightsOnboardingFeatureDisabled: 159,
      InsightsOptInTeaserShown: 160,
      InsightsOptInTeaserSettingsLinkClicked: 161,
      InsightsOptInTeaserConfirmedInSettings: 162,
      InsightsReminderTeaserShown: 163,
      InsightsReminderTeaserConfirmed: 164,
      InsightsReminderTeaserCanceled: 165,
      InsightsReminderTeaserSettingsLinkClicked: 166,
      InsightsReminderTeaserAbortedInSettings: 167,
      GeneratingInsightWithoutDisclaimer: 168,
      AiAssistanceOpenedFromElementsPanelFloatingButton: 169,
      AiAssistanceOpenedFromNetworkPanel: 170,
      AiAssistanceOpenedFromSourcesPanel: 171,
      AiAssistanceOpenedFromSourcesPanelFloatingButton: 172,
      AiAssistanceOpenedFromPerformancePanelCallTree: 173,
      AiAssistanceOpenedFromNetworkPanelFloatingButton: 174,
      AiAssistancePanelOpened: 175,
      AiAssistanceQuerySubmitted: 176,
      AiAssistanceAnswerReceived: 177,
      AiAssistanceDynamicSuggestionClicked: 178,
      AiAssistanceSideEffectConfirmed: 179,
      AiAssistanceSideEffectRejected: 180,
      AiAssistanceError: 181,
      AiCodeCompletionResponseServedFromCache: 184,
      AiCodeCompletionRequestTriggered: 185,
      AiCodeCompletionSuggestionDisplayed: 186,
      AiCodeCompletionSuggestionAccepted: 187,
      AiCodeCompletionError: 188,
      AttributeLinkClicked: 189,
      InsightRequestedViaTeaser: 190,
      InsightTeaserGenerationStarted: 191,
      InsightTeaserGenerationCompleted: 192,
      InsightTeaserGenerationAborted: 193,
      InsightTeaserGenerationErrored: 194,
      AiCodeGenerationSuggestionDisplayed: 195,
      AiCodeGenerationSuggestionAccepted: 196,
      InsightTeaserModelDownloadStarted: 197,
      InsightTeaserModelDownloadCompleted: 198,
      AiCodeGenerationError: 199,
      AiCodeGenerationRequestTriggered: 200,
      AiCodeCompletionRequestTriggeredFromConsole: 201,
      AiCodeCompletionRequestTriggeredFromSources: 202,
      AiCodeCompletionRequestTriggeredFromStyles: 203,
      AiCodeGenerationRequestTriggeredFromConsole: 204,
      AiCodeGenerationRequestTriggeredFromSources: 205,
      AiCodeCompletionFreCompletedFromConsole: 206,
      AiCodeCompletionFreCompletedFromSources: 207,
      AiAssistanceOpenedFromApplicationPanelFloatingButton: 208,
      AiAssistanceOpenedFromApplicationPanel: 209,
      MAX_VALUE: 210,
    },
    PanelCodes: {
      elements: 1,
      resources: 2,
      network: 3,
      sources: 4,
      timeline: 5,
      'heap-profiler': 6,
      console: 8,
      layers: 9,
      'console-view': 10,
      animations: 11,
      'network.config': 12,
      rendering: 13,
      sensors: 14,
      'sources.search': 15,
      security: 16,
      'js-profiler': 17,
      lighthouse: 18,
      coverage: 19,
      'protocol-monitor': 20,
      'remote-devices': 21,
      'web-audio': 22,
      'changes.changes': 23,
      'performance.monitor': 24,
      'release-note': 25,
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
      cssoverview: 39,
      'chrome-recorder': 40,
      'trust-tokens': 41,
      'reporting-api': 42,
      'interest-groups': 43,
      'back-forward-cache': 44,
      'service-worker-cache': 45,
      'background-service-background-fetch': 46,
      'background-service-background-sync': 47,
      'background-service-push-messaging': 48,
      'background-service-notifications': 49,
      'background-service-payment-handler': 50,
      'background-service-periodic-background-sync': 51,
      'service-workers': 52,
      'app-manifest': 53,
      storage: 54,
      cookies: 55,
      'frame-details': 56,
      'frame-resource': 57,
      'frame-window': 58,
      'frame-worker': 59,
      'dom-storage': 60,
      'indexed-db': 61,
      'web-sql': 62,
      'performance-insights': 63,
      preloading: 64,
      'bounce-tracking-mitigations': 65,
      'developer-resources': 66,
      'autofill-view': 67,
      freestyler: 68,
      ads: 69,
      MAX_VALUE: 70,
    },
    MediaTypes: {
      Unknown: 0,
      'text/css': 2,
      'text/html': 3,
      'application/xml': 4,
      'application/wasm': 5,
      'application/manifest+json': 6,
      'application/x-aspx': 7,
      'application/jsp': 8,
      'text/x-c++src': 9,
      'text/x-coffeescript': 10,
      'application/vnd.dart': 11,
      'text/typescript': 12,
      'text/typescript-jsx': 13,
      'application/json': 14,
      'text/x-csharp': 15,
      'text/x-java': 16,
      'text/x-less': 17,
      'application/x-httpd-php': 18,
      'text/x-python': 19,
      'text/x-sh': 20,
      'text/x-gss': 21,
      'text/x-sass': 22,
      'text/x-scss': 23,
      'text/markdown': 24,
      'text/x-clojure': 25,
      'text/jsx': 26,
      'text/x-go': 27,
      'text/x-kotlin': 28,
      'text/x-scala': 29,
      'text/x.svelte': 30,
      'text/javascript+plain': 31,
      'text/javascript+minified': 32,
      'text/javascript+sourcemapped': 33,
      'text/x.angular': 34,
      'text/x.vue': 35,
      'text/javascript+snippet': 36,
      'text/javascript+eval': 37,
      MAX_VALUE: 38,
    },
    KeybindSetSettings: {
      devToolsDefault: 0,
      vsCode: 1,
      MAX_VALUE: 2,
    },
    KeyboardShortcutAction: {
      OtherShortcut: 0,
      'quick-open.show-command-menu': 1,
      'console.clear': 2,
      'console.toggle': 3,
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
      'quick-open.show': 21,
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
      'inspector-main.focus-debuggee': 47,
      'inspector-main.hard-reload': 48,
      'inspector-main.reload': 49,
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
      'rendering.toggle-prefers-color-scheme': 107,
      'chrome-recorder.start-recording': 108,
      'chrome-recorder.replay-recording': 109,
      'chrome-recorder.toggle-code-view': 110,
      'chrome-recorder.copy-recording-or-step': 111,
      'elements.new-style-rule': 114,
      'elements.refresh-event-listeners': 115,
      'coverage.clear': 116,
      'coverage.export': 117,
      'timeline.dim-third-parties': 118,
      'main.toggle-drawer-orientation': 119,
      MAX_VALUE: 120,
    },
    IssueOpener: {
      CONSOLE_INFO_BAR: 0,
      LEARN_MORE_LINK_COEP: 1,
      STATUS_BAR_ISSUES_COUNTER: 2,
      HAMBURGER_MENU: 3,
      ADORNER: 4,
      COMMAND_MENU: 5,
      MORE_TOOLS_MENU: 6,
      MAX_VALUE: 7,
    },
    DevtoolsExperiments: {
      'protocol-monitor': 13,
      'instrumentation-breakpoints': 61,
      'durable-messages': 110,
      'jpeg-xl': 111,
      'plus-button': 112,
      MAX_VALUE: 113,
    },
    IssueExpanded: {
      CrossOriginEmbedderPolicy: 0,
      MixedContent: 1,
      SameSiteCookie: 2,
      HeavyAd: 3,
      ContentSecurityPolicy: 4,
      Other: 5,
      Generic: 6,
      ThirdPartyPhaseoutCookie: 7,
      GenericCookie: 8,
      MAX_VALUE: 9,
    },
    IssueResourceOpened: {
      CrossOriginEmbedderPolicyRequest: 0,
      CrossOriginEmbedderPolicyElement: 1,
      MixedContentRequest: 2,
      SameSiteCookieCookie: 3,
      SameSiteCookieRequest: 4,
      HeavyAdElement: 5,
      ContentSecurityPolicyDirective: 6,
      ContentSecurityPolicyElement: 7,
      MAX_VALUE: 13,
    },
    IssueCreated: {
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
      'CookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie': 14,
      'CookieIssue::ExcludeSameSiteNoneInsecure::SetCookie': 15,
      'CookieIssue::WarnSameSiteNoneInsecure::ReadCookie': 16,
      'CookieIssue::WarnSameSiteNoneInsecure::SetCookie': 17,
      'CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Secure': 18,
      'CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Insecure': 19,
      'CookieIssue::WarnCrossDowngrade::ReadCookie::Secure': 20,
      'CookieIssue::WarnCrossDowngrade::ReadCookie::Insecure': 21,
      'CookieIssue::WarnCrossDowngrade::SetCookie::Secure': 22,
      'CookieIssue::WarnCrossDowngrade::SetCookie::Insecure': 23,
      'CookieIssue::ExcludeNavigationContextDowngrade::Secure': 24,
      'CookieIssue::ExcludeNavigationContextDowngrade::Insecure': 25,
      'CookieIssue::ExcludeContextDowngrade::ReadCookie::Secure': 26,
      'CookieIssue::ExcludeContextDowngrade::ReadCookie::Insecure': 27,
      'CookieIssue::ExcludeContextDowngrade::SetCookie::Secure': 28,
      'CookieIssue::ExcludeContextDowngrade::SetCookie::Insecure': 29,
      'CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie': 30,
      'CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie': 31,
      'CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie': 32,
      'CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie': 33,
      'CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie': 34,
      'CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie': 35,
      'SharedArrayBufferIssue::TransferIssue': 36,
      'SharedArrayBufferIssue::CreationIssue': 37,
      'CorsIssue::InsecureLocalNetwork': 42,
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
      'CorsIssue::NoCorsRedirectModeNotFollow': 57,
      'QuirksModeIssue::QuirksMode': 58,
      'QuirksModeIssue::LimitedQuirksMode': 59,
      DeprecationIssue: 60,
      'ClientHintIssue::MetaTagAllowListInvalidOrigin': 61,
      'ClientHintIssue::MetaTagModifiedHTML': 62,
      'GenericIssue::CrossOriginPortalPostMessageError': 64,
      'GenericIssue::FormLabelForNameError': 65,
      'GenericIssue::FormDuplicateIdForInputError': 66,
      'GenericIssue::FormInputWithNoLabelError': 67,
      'GenericIssue::FormAutocompleteAttributeEmptyError': 68,
      'GenericIssue::FormEmptyIdAndNameAttributesForInputError': 69,
      'GenericIssue::FormAriaLabelledByToNonExistingIdError': 70,
      'GenericIssue::FormInputAssignedAutocompleteValueToIdOrNameAttributeError': 71,
      'GenericIssue::FormLabelHasNeitherForNorNestedInputError': 72,
      'GenericIssue::FormLabelForMatchesNonExistingIdError': 73,
      'GenericIssue::FormHasPasswordFieldWithoutUsernameFieldError': 74,
      'GenericIssue::FormInputHasWrongButWellIntendedAutocompleteValueError': 75,
      'StylesheetLoadingIssue::LateImportRule': 76,
      'StylesheetLoadingIssue::RequestFailed': 77,
      'CookieIssue::WarnThirdPartyPhaseout::ReadCookie': 82,
      'CookieIssue::WarnThirdPartyPhaseout::SetCookie': 83,
      'CookieIssue::ExcludeThirdPartyPhaseout::ReadCookie': 84,
      'CookieIssue::ExcludeThirdPartyPhaseout::SetCookie': 85,
      'ElementAccessibilityIssue::DisallowedSelectChild': 86,
      'ElementAccessibilityIssue::DisallowedOptGroupChild': 87,
      'ElementAccessibilityIssue::NonPhrasingContentOptionChild': 88,
      'ElementAccessibilityIssue::InteractiveContentOptionChild': 89,
      'ElementAccessibilityIssue::InteractiveContentLegendChild': 90,
      'SRIMessageSignatureIssue::MissingSignatureHeader': 91,
      'SRIMessageSignatureIssue::MissingSignatureInputHeader': 92,
      'SRIMessageSignatureIssue::InvalidSignatureHeader': 93,
      'SRIMessageSignatureIssue::InvalidSignatureInputHeader': 94,
      'SRIMessageSignatureIssue::SignatureHeaderValueIsNotByteSequence': 95,
      'SRIMessageSignatureIssue::SignatureHeaderValueIsParameterized': 96,
      'SRIMessageSignatureIssue::SignatureHeaderValueIsIncorrectLength': 97,
      'SRIMessageSignatureIssue::SignatureInputHeaderMissingLabel': 98,
      'SRIMessageSignatureIssue::SignatureInputHeaderValueNotInnerList': 99,
      'SRIMessageSignatureIssue::SignatureInputHeaderValueMissingComponents': 100,
      'SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentType': 101,
      'SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentName': 102,
      'SRIMessageSignatureIssue::SignatureInputHeaderInvalidHeaderComponentParameter': 103,
      'SRIMessageSignatureIssue::SignatureInputHeaderInvalidDerivedComponentParameter': 104,
      'SRIMessageSignatureIssue::SignatureInputHeaderKeyIdLength': 105,
      'SRIMessageSignatureIssue::SignatureInputHeaderInvalidParameter': 106,
      'SRIMessageSignatureIssue::SignatureInputHeaderMissingRequiredParameters': 107,
      'SRIMessageSignatureIssue::ValidationFailedSignatureExpired': 108,
      'SRIMessageSignatureIssue::ValidationFailedInvalidLength': 109,
      'SRIMessageSignatureIssue::ValidationFailedSignatureMismatch': 110,
      'CorsIssue::LocalNetworkAccessPermissionDenied': 111,
      'SRIMessageSignatureIssue::ValidationFailedIntegrityMismatch': 112,
      'ElementAccessibilityIssue::InteractiveContentSummaryDescendant': 113,
      'CorsIssue::InvalidLocalNetworkAccess': 114,
      MAX_VALUE: 115,
    },
    DeveloperResourceLoaded: {
      LOAD_THROUGH_PAGE_VIA_TARGET: 0,
      LOAD_THROUGH_PAGE_FAILURE: 2,
      LOAD_THROUGH_PAGE_FALLBACK: 3,
      FALLBACK_AFTER_FAILURE: 4,
      FALLBACK_PER_OVERRIDE: 5,
      FALLBACK_PER_PROTOCOL: 6,
      FALLBACK_FAILURE: 7,
      MAX_VALUE: 8,
    },
    DeveloperResourceScheme: {
      OTHER: 0,
      UKNOWN: 1,
      HTTP: 2,
      HTTPS: 3,
      HTTP_LOCALHOST: 4,
      HTTPS_LOCALHOST: 5,
      DATA: 6,
      FILE: 7,
      BLOB: 8,
      MAX_VALUE: 9,
    },
    Language: {
      af: 1,
      am: 2,
      ar: 3,
      as: 4,
      az: 5,
      be: 6,
      bg: 7,
      bn: 8,
      bs: 9,
      ca: 10,
      cs: 11,
      cy: 12,
      da: 13,
      de: 14,
      el: 15,
      'en-GB': 16,
      'en-US': 17,
      'es-419': 18,
      es: 19,
      et: 20,
      eu: 21,
      fa: 22,
      fi: 23,
      fil: 24,
      'fr-CA': 25,
      fr: 26,
      gl: 27,
      gu: 28,
      he: 29,
      hi: 30,
      hr: 31,
      hu: 32,
      hy: 33,
      id: 34,
      is: 35,
      it: 36,
      ja: 37,
      ka: 38,
      kk: 39,
      km: 40,
      kn: 41,
      ko: 42,
      ky: 43,
      lo: 44,
      lt: 45,
      lv: 46,
      mk: 47,
      ml: 48,
      mn: 49,
      mr: 50,
      ms: 51,
      my: 52,
      ne: 53,
      nl: 54,
      no: 55,
      or: 56,
      pa: 57,
      pl: 58,
      'pt-PT': 59,
      pt: 60,
      ro: 61,
      ru: 62,
      si: 63,
      sk: 64,
      sl: 65,
      sq: 66,
      'sr-Latn': 67,
      sr: 68,
      sv: 69,
      sw: 70,
      ta: 71,
      te: 72,
      th: 73,
      tr: 74,
      uk: 75,
      ur: 76,
      uz: 77,
      vi: 78,
      zh: 79,
      'zh-HK': 80,
      'zh-TW': 81,
      zu: 82,
      MAX_VALUE: 83,
    },
    SyncSetting: {
      CHROME_SYNC_DISABLED: 1,
      CHROME_SYNC_SETTINGS_DISABLED: 2,
      DEVTOOLS_SYNC_SETTING_DISABLED: 3,
      DEVTOOLS_SYNC_SETTING_ENABLED: 4,
      MAX_VALUE: 5,
    },
    RecordingToggled: {
      RECORDING_STARTED: 1,
      RECORDING_FINISHED: 2,
      MAX_VALUE: 3,
    },
    RecordingAssertion: {
      ASSERTION_ADDED: 1,
      PROPERTY_ASSERTION_EDITED: 2,
      ATTRIBUTE_ASSERTION_EDITED: 3,
      MAX_VALUE: 4,
    },
    RecordingReplayFinished: {
      SUCCESS: 1,
      TIMEOUT_ERROR_SELECTORS: 2,
      TIMEOUT_ERROR_TARGET: 3,
      OTHER_ERROR: 4,
      MAX_VALUE: 5,
    },
    RecordingReplaySpeed: {
      NORMAL: 1,
      SLOW: 2,
      VERY_SLOW: 3,
      EXTREMELY_SLOW: 4,
      MAX_VALUE: 5,
    },
    RecordingReplayStarted: {
      REPLAY_ONLY: 1,
      REPLAY_WITH_PERFORMANCE_TRACING: 2,
      REPLAY_VIA_EXTENSION: 3,
      MAX_VALUE: 4,
    },
    RecordingEdited: {
      SELECTOR_PICKER_USED: 1,
      STEP_ADDED: 2,
      STEP_REMOVED: 3,
      SELECTOR_ADDED: 4,
      SELECTOR_REMOVED: 5,
      SELECTOR_PART_ADDED: 6,
      SELECTOR_PART_EDITED: 7,
      SELECTOR_PART_REMOVED: 8,
      TYPE_CHANGED: 9,
      OTHER_EDITING: 10,
      MAX_VALUE: 11,
    },
    RecordingExported: {
      TO_PUPPETEER: 1,
      TO_JSON: 2,
      TO_PUPPETEER_REPLAY: 3,
      TO_EXTENSION: 4,
      TO_LIGHTHOUSE: 5,
      MAX_VALUE: 6,
    },
    RecordingCodeToggled: {
      CODE_SHOWN: 1,
      CODE_HIDDEN: 2,
      MAX_VALUE: 3,
    },
    RecordingCopiedToClipboard: {
      COPIED_RECORDING_WITH_PUPPETEER: 1,
      COPIED_RECORDING_WITH_JSON: 2,
      COPIED_RECORDING_WITH_REPLAY: 3,
      COPIED_RECORDING_WITH_EXTENSION: 4,
      COPIED_STEP_WITH_PUPPETEER: 5,
      COPIED_STEP_WITH_JSON: 6,
      COPIED_STEP_WITH_REPLAY: 7,
      COPIED_STEP_WITH_EXTENSION: 8,
      MAX_VALUE: 9,
    },
    ManifestSectionCodes: {
      OtherSection: 0,
      Identity: 1,
      Presentation: 2,
      'Protocol Handlers': 3,
      Icons: 4,
      'Window Controls Overlay': 5,
      MAX_VALUE: 6,
    },
    LighthouseModeRun: {
      NAVIGATION: 0,
      TIMESPAN: 1,
      SNAPSHOT: 2,
      LEGACY_NAVIGATION: 3,
      MAX_VALUE: 4,
    },
    LighthouseCategoryUsed: {
      PERFORMANCE: 0,
      ACCESSIBILITY: 1,
      BEST_PRACTICES: 2,
      SEO: 3,
      PWA: 4,
      PUB_ADS: 5,
      AGENTIC_BROWSING: 6,
      MAX_VALUE: 7,
    },
    SwatchType: {
      VAR_LINK: 0,
      ANIMATION_NAME_LINK: 1,
      COLOR: 2,
      ANIMATION_TIMING: 3,
      SHADOW: 4,
      GRID: 5,
      FLEX: 6,
      ANGLE: 7,
      LENGTH: 8,
      POSITION_TRY_LINK: 10,
      ATTR_LINK: 11,
      GRID_LANES: 12,
      MAX_VALUE: 13,
    },
    BadgeType: {
      GRID: 0,
      SUBGRID: 1,
      FLEX: 2,
      AD: 3,
      SCROLL_SNAP: 4,
      CONTAINER: 5,
      SLOT: 6,
      TOP_LAYER: 7,
      REVEAL: 8,
      MAX_VALUE: 9,
    },
    AnimationsPlaybackRate: {
      PERCENT_100: 0,
      PERCENT_25: 1,
      PERCENT_10: 2,
      OTHER: 3,
      MAX_VALUE: 4,
    },
    TimelineNavigationSetting: {
      CLASSIC_AT_SESSION_FIRST_TRACE: 0,
      MODERN_AT_SESSION_FIRST_TRACE: 1,
      SWITCHED_TO_CLASSIC: 2,
      SWITCHED_TO_MODERN: 3,
      MAX_VALUE: 4,
    },
    BuiltInAiAvailability: {
      UNAVAILABLE_HAS_GPU: 0,
      DOWNLOADABLE_HAS_GPU: 1,
      DOWNLOADING_HAS_GPU: 2,
      AVAILABLE_HAS_GPU: 3,
      DISABLED_HAS_GPU: 4,
      UNAVAILABLE_NO_GPU: 5,
      DOWNLOADABLE_NO_GPU: 6,
      DOWNLOADING_NO_GPU: 7,
      AVAILABLE_NO_GPU: 8,
      DISABLED_NO_GPU: 9,
      MAX_VALUE: 10,
    },
    ResendRequestType: {
      XHR: 0,
      FETCH: 1,
      SCRIPT: 2,
      STYLESHEET: 3,
      IMAGE: 4,
      MEDIA: 5,
      FONT: 6,
      WASM: 7,
      MANIFEST: 8,
      TEXT_TRACK: 9,
      SOURCE_MAP_SCRIPT: 10,
      SOURCE_MAP_STYLE_SHEET: 11,
      DOCUMENT: 12,
      PREFETCH: 13,
      PING: 14,
      OTHER: 15,
      MAX_VALUE: 16,
    },
  };
  // LINT.ThenChange(/front_end/core/host/UserMetricsEnums.ts)

  // InspectorFrontendHostImpl --------------------------------------------------

  /**
   * Enum for recordEnumeratedHistogram
   * Warning: There is another definition of this enum in the DevTools code
   * base, keep them in sync:
   * front_end/core/host/InspectorFrontendHostAPI.ts
   * @readonly
   * @enum {string}
   */
  const EnumeratedHistogram = {
    // LINT.IfChange(EnumeratedHistogram)
    ActionTaken: 'DevTools.ActionTaken',
    DeveloperResourceLoaded: 'DevTools.DeveloperResourceLoaded',
    DeveloperResourceScheme: 'DevTools.DeveloperResourceScheme',
    ExperimentDisabled: 'DevTools.ExperimentDisabled',
    ExperimentDisabledAtLaunch: 'DevTools.ExperimentDisabledAtLaunch',
    ExperimentEnabled: 'DevTools.ExperimentEnabled',
    ExperimentEnabledAtLaunch: 'DevTools.ExperimentEnabledAtLaunch',
    IssueCreated: 'DevTools.IssueCreated',
    IssuesPanelIssueExpanded: 'DevTools.IssuesPanelIssueExpanded',
    IssuesPanelOpenedFrom: 'DevTools.IssuesPanelOpenedFrom',
    IssuesPanelResourceOpened: 'DevTools.IssuesPanelResourceOpened',
    KeybindSetSettingChanged: 'DevTools.KeybindSetSettingChanged',
    KeyboardShortcutFired: 'DevTools.KeyboardShortcutFired',
    Language: 'DevTools.Language',
    LighthouseModeRun: 'DevTools.LighthouseModeRun',
    LighthouseCategoryUsed: 'DevTools.LighthouseCategoryUsed',
    PanelShown: 'DevTools.PanelShown',
    RecordingReplayFinished: 'DevTools.RecordingReplayFinished',
    RecordingReplayStarted: 'DevTools.RecordingReplayStarted',
    RecordingToggled: 'DevTools.RecordingToggled',
    SourcesPanelFileDebugged: 'DevTools.SourcesPanelFileDebugged',
    SourcesPanelFileOpened: 'DevTools.SourcesPanelFileOpened',
    NetworkPanelResponsePreviewOpened: 'DevTools.NetworkPanelResponsePreviewOpened',
    TimelineNavigationSettingState: 'DevTools.TimelineNavigationSettingState',
    SyncSetting: 'DevTools.SyncSetting',
    SwatchActivated: 'DevTools.SwatchActivated',
    BuiltInAiAvailability: 'DevTools.BuiltInAiAvailability',
    ResendRequest: 'DevTools.ResendRequest',
    // LINT.ThenChange(/front_end/core/host/InspectorFrontendHostAPI.ts:EnumeratedHistogram)
  };

  /**
   * @typedef {import('./core/host/InspectorFrontendHostAPI.js').InspectorFrontendHostAPI} InspectorFrontendHostAPI
   * @implements {InspectorFrontendHostAPI}
   */
  class InspectorFrontendHostImpl {
    /**
     * Update inside `front_end/core/host/InspectorFrontendHost.ts:627`
     * @type {any}
     */
    events;

    /**
     * @returns
     */
    getSelectionBackgroundColor() {
      return '#6e86ff';
    }

    /**
     * @returns
     */
    getSelectionForegroundColor() {
      return '#ffffff';
    }

    /**
     * @returns
     */
    getInactiveSelectionBackgroundColor() {
      return '#c9c8c8';
    }

    /**
     * @returns
     */
    getInactiveSelectionForegroundColor() {
      return '#323232';
    }

    /**
     * @returns
     */
    platform() {
      return DevToolsHost.platform();
    }

    loadCompleted() {
      DevToolsAPI.sendMessageToEmbedder('loadCompleted', [], null);
    }

    bringToFront() {
      DevToolsAPI.sendMessageToEmbedder('bringToFront', [], null);
    }

    closeWindow() {
      DevToolsAPI.sendMessageToEmbedder('closeWindow', [], null);
    }

    /**
     * @param isDocked
     * @param callback
     */
    setIsDocked(isDocked, callback) {
      DevToolsAPI.sendMessageToEmbedder('setIsDocked', [isDocked], callback);
    }

    /**
     * @param trigger
     * @param {(param: object) => unknown} callback
     */
    showSurvey(trigger, callback) {
      DevToolsAPI.sendMessageToEmbedder('showSurvey', [trigger], callback);
    }

    /**
     * @param trigger
     * @param {(param: object) => unknown} callback
     */
    canShowSurvey(trigger, callback) {
      DevToolsAPI.sendMessageToEmbedder('canShowSurvey', [trigger], callback);
    }

    /**
     * Requests inspected page to be placed atop of the inspector frontend with specified bounds.
     * @param bounds
     */
    setInspectedPageBounds(bounds) {
      DevToolsAPI.sendMessageToEmbedder('setInspectedPageBounds', [bounds], null);
    }

    inspectElementCompleted() {
      DevToolsAPI.sendMessageToEmbedder('inspectElementCompleted', [], null);
    }

    /**
     * @param url
     * @param headers
     * @param streamId
     * @param {(param: object) => unknown} callback
     */
    loadNetworkResource(url, headers, streamId, callback) {
      DevToolsAPI.sendMessageToEmbedder('loadNetworkResource', [url, headers, streamId], callback);
    }

    /**
     * @param name
     * @param options
     */
    registerPreference(name, options) {
      DevToolsAPI.sendMessageToEmbedder('registerPreference', [name, options], null);
    }

    /**
     * @param {(param: object) => unknown} callback
     */
    getPreferences(callback) {
      DevToolsAPI.sendMessageToEmbedder('getPreferences', [], callback);
    }

    /**
     * @param name
     * @param {(param: object) => unknown} callback
     */
    getPreference(name, callback) {
      DevToolsAPI.sendMessageToEmbedder('getPreference', [name], callback);
    }

    /**
     * @param name
     * @param value
     */
    setPreference(name, value) {
      DevToolsAPI.sendMessageToEmbedder('setPreference', [name, value], null);
    }

    /**
     * @param name
     */
    removePreference(name) {
      DevToolsAPI.sendMessageToEmbedder('removePreference', [name], null);
    }

    clearPreferences() {
      DevToolsAPI.sendMessageToEmbedder('clearPreferences', [], null);
    }

    /**
     * @param callback
     */
    getSyncInformation(callback) {
      DevToolsAPI.sendMessageToEmbedder('getSyncInformation', [], callback);
    }

    /**
     * @param callback
     */
    getHostConfig(callback) {
      DevToolsAPI.sendMessageToEmbedder('getHostConfig', [], hostConfig => {
        const majorVersion = getRemoteMajorVersion();
        if (majorVersion && majorVersion < 129 && hostConfig?.aidaAvailability) {
          return callback(this.hostConfigNewToOld(hostConfig));
        }
        return callback(hostConfig);
      });
    }

    /**
     * @param newConfig
     */
    hostConfigNewToOld(newConfig) {
      const devToolsConsoleInsights = {
        enabled: (newConfig.devToolsConsoleInsights?.enabled && newConfig.aidaAvailability?.enabled) ?? false,
        aidaModelId: newConfig.devToolsConsoleInsights?.modelId ?? '',
        aidaTemperature: newConfig.devToolsConsoleInsights?.temperature ?? 0,
        blockedByAge: newConfig.aidaAvailability?.blockedByAge ?? true,
        blockedByEnterprisePolicy: newConfig.aidaAvailability?.blockedByEnterprisePolicy ?? true,
        blockedByFeatureFlag:
            (newConfig.devToolsConsoleInsights?.enabled && newConfig.aidaAvailability?.enabled) ?? false,
        blockedByGeo: newConfig.aidaAvailability?.blockedByGeo ?? true,
        blockedByRollout: false,
        disallowLogging: newConfig.aidaAvailability?.disallowLogging ?? true,
        optIn: false,
      };
      const devToolsFreestylerDogfood = {
        enabled: (newConfig.devToolsFreestyler?.enabled && newConfig.aidaAvailability?.enabled) ?? false,
        aidaModelId: newConfig.devToolsFreestyler?.modelId ?? '',
        aidaTemperature: newConfig.devToolsFreestyler?.temperature ?? 0,
        blockedByAge: newConfig.aidaAvailability?.blockedByAge ?? true,
        blockedByEnterprisePolicy: newConfig.aidaAvailability?.blockedByEnterprisePolicy ?? true,
        blockedByGeo: newConfig.aidaAvailability?.blockedByGeo ?? true,
      };
      return {
        devToolsConsoleInsights,
        devToolsFreestylerDogfood,
        devToolsVeLogging: newConfig.devToolsVeLogging,
        isOffTheRecord: newConfig.isOffTheRecord,
      };
    }

    /**
     * @param origin
     * @param script
     */
    setInjectedScriptForOrigin(origin, script) {
      DevToolsAPI.sendMessageToEmbedder('registerExtensionsAPI', [origin, script], null);
    }

    /**
     * @param url
     */
    inspectedURLChanged(url) {
      DevToolsAPI.sendMessageToEmbedder('inspectedURLChanged', [url], null);
    }

    /**
     * @param text
     */
    copyText(text) {
      DevToolsHost.copyText(text);
    }

    /**
     * @param url
     */
    openInNewTab(url) {
      DevToolsAPI.sendMessageToEmbedder('openInNewTab', [url], null);
    }

    /**
     * @param query
     */
    openSearchResultsInNewTab(query) {
      DevToolsAPI.sendMessageToEmbedder('openSearchResultsInNewTab', [query], null);
    }

    /**
     * @param fileSystemPath
     */
    showItemInFolder(fileSystemPath) {
      DevToolsAPI.sendMessageToEmbedder('showItemInFolder', [fileSystemPath], null);
    }

    /**
     * @param url
     * @param content
     * @param forceSaveAs
     * @param isBase64
     */
    save(url, content, forceSaveAs, isBase64) {
      DevToolsAPI.sendMessageToEmbedder('save', [url, content, forceSaveAs, isBase64], null);
    }

    /**
     * @param url
     * @param content
     */
    append(url, content) {
      DevToolsAPI.sendMessageToEmbedder('append', [url, content], null);
    }

    /**
     * @param {string} _url
     */
    close(_url) {
      // This is required when InspectorFrontendHostStub is used
    }

    /**
     * @param message
     */
    sendMessageToBackend(message) {
      DevToolsAPI.sendMessageToEmbedder('dispatchProtocolMessage', [message], null);
    }

    /**
     * @param histogramName
     * @param sample
     * @param min
     * @param exclusiveMax
     * @param bucketSize
     */
    recordCountHistogram(histogramName, sample, min, exclusiveMax, bucketSize) {
      DevToolsAPI.sendMessageToEmbedder(
          'recordCountHistogram', [histogramName, sample, min, exclusiveMax, bucketSize], null);
    }

    /**
     * @param actionName
     * @param actionCode
     * @param bucketSize
     */
    recordEnumeratedHistogram(actionName, actionCode, bucketSize) {
      if (!Object.values(EnumeratedHistogram).includes(actionName)) {
        return;
      }
      DevToolsAPI.sendMessageToEmbedder('recordEnumeratedHistogram', [actionName, actionCode, bucketSize], null);
    }

    /**
     * @param histogramName
     * @param duration
     */
    recordPerformanceHistogram(histogramName, duration) {
      DevToolsAPI.sendMessageToEmbedder('recordPerformanceHistogram', [histogramName, duration], null);
    }

    /**
     * @param histogramName
     * @param duration
     */
    recordPerformanceHistogramMedium(histogramName, duration) {
      DevToolsAPI.sendMessageToEmbedder('recordPerformanceHistogramMedium', [histogramName, duration], null);
    }

    /**
     * @param featureName
     */
    recordNewBadgeUsage(featureName) {
      DevToolsAPI.sendMessageToEmbedder('recordNewBadgeUsage', [featureName], null);
    }

    /**
     * @param umaName
     */
    recordUserMetricsAction(umaName) {
      DevToolsAPI.sendMessageToEmbedder('recordUserMetricsAction', [umaName], null);
    }

    connectAutomaticFileSystem(fileSystemPath, fileSystemUUID, addIfMissing, callback) {
      DevToolsAPI.sendMessageToEmbedder(
          'connectAutomaticFileSystem', [fileSystemPath, fileSystemUUID, addIfMissing], callback);
    }

    disconnectAutomaticFileSystem(fileSystemPath) {
      DevToolsAPI.sendMessageToEmbedder('disconnectAutomaticFileSystem', [fileSystemPath], null);
    }

    requestFileSystems() {
      DevToolsAPI.sendMessageToEmbedder('requestFileSystems', [], null);
    }

    /**
     * @param type
     */
    addFileSystem(type) {
      DevToolsAPI.sendMessageToEmbedder('addFileSystem', [type || ''], null);
    }

    /**
     * @param fileSystemPath
     */
    removeFileSystem(fileSystemPath) {
      DevToolsAPI.sendMessageToEmbedder('removeFileSystem', [fileSystemPath], null);
    }

    /**
     * @param fileSystemId
     * @param registeredName
     * @returns
     */
    isolatedFileSystem(fileSystemId, registeredName) {
      return DevToolsHost.isolatedFileSystem(fileSystemId, registeredName);
    }

    /**
     * @param fileSystem
     */
    upgradeDraggedFileSystemPermissions(fileSystem) {
      DevToolsHost.upgradeDraggedFileSystemPermissions(fileSystem);
    }

    /**
     * @param requestId
     * @param fileSystemPath
     * @param excludedFolders
     */
    indexPath(requestId, fileSystemPath, excludedFolders) {
      // |excludedFolders| added in M67. For backward compatibility,
      // pass empty array.
      excludedFolders = excludedFolders || '[]';
      DevToolsAPI.sendMessageToEmbedder('indexPath', [requestId, fileSystemPath, excludedFolders], null);
    }

    /**
     * @param requestId
     */
    stopIndexing(requestId) {
      DevToolsAPI.sendMessageToEmbedder('stopIndexing', [requestId], null);
    }

    /**
     * @param requestId
     * @param fileSystemPath
     * @param query
     */
    searchInPath(requestId, fileSystemPath, query) {
      DevToolsAPI.sendMessageToEmbedder('searchInPath', [requestId, fileSystemPath, query], null);
    }

    /**
     * @returns
     */
    zoomFactor() {
      return DevToolsHost.zoomFactor();
    }

    zoomIn() {
      DevToolsAPI.sendMessageToEmbedder('zoomIn', [], null);
    }

    zoomOut() {
      DevToolsAPI.sendMessageToEmbedder('zoomOut', [], null);
    }

    resetZoom() {
      DevToolsAPI.sendMessageToEmbedder('resetZoom', [], null);
    }

    /**
     * @param shortcuts
     */
    setWhitelistedShortcuts(shortcuts) {
      DevToolsAPI.sendMessageToEmbedder('setWhitelistedShortcuts', [shortcuts], null);
    }

    /**
     * @param active
     */
    setEyeDropperActive(active) {
      DevToolsAPI.sendMessageToEmbedder('setEyeDropperActive', [active], null);
    }

    /**
     * @param certChain
     */
    showCertificateViewer(certChain) {
      DevToolsAPI.sendMessageToEmbedder('showCertificateViewer', [JSON.stringify(certChain)], null);
    }

    /**
     * Only needed to run Lighthouse on old devtools.
     * @param callback
     */
    reattach(callback) {
      DevToolsAPI.sendMessageToEmbedder('reattach', [], callback);
    }

    readyForTest() {
      DevToolsAPI.sendMessageToEmbedder('readyForTest', [], null);
    }

    connectionReady() {
      DevToolsAPI.sendMessageToEmbedder('connectionReady', [], null);
    }

    /**
     * @param value
     */
    setOpenNewWindowForPopups(value) {
      DevToolsAPI.sendMessageToEmbedder('setOpenNewWindowForPopups', [value], null);
    }

    /**
     * @param config
     */
    setDevicesDiscoveryConfig(config) {
      DevToolsAPI.sendMessageToEmbedder('setDevicesDiscoveryConfig',
                                        [
                                          config.discoverUsbDevices,
                                          config.portForwardingEnabled,
                                          JSON.stringify(config.portForwardingConfig),
                                          config.networkDiscoveryEnabled,
                                          JSON.stringify(config.networkDiscoveryConfig),
                                        ],
                                        null);
    }

    /**
     * @param enabled
     */
    setDevicesUpdatesEnabled(enabled) {
      DevToolsAPI.sendMessageToEmbedder('setDevicesUpdatesEnabled', [enabled], null);
    }

    /**
     * @param browserId
     * @param url
     */
    openRemotePage(browserId, url) {
      DevToolsAPI.sendMessageToEmbedder('openRemotePage', [browserId, url], null);
    }

    openNodeFrontend() {
      DevToolsAPI.sendMessageToEmbedder('openNodeFrontend', [], null);
    }

    /**
     * @param x
     * @param y
     * @param items
     * @param document
     */
    showContextMenuAtPoint(x, y, items, document) {
      DevToolsHost.showContextMenuAtPoint(x, y, items, document);
    }

    /**
     * @returns
     */
    isHostedMode() {
      return DevToolsHost.isHostedMode();
    }

    /**
     * @param callback
     */
    setAddExtensionCallback(callback) {
      DevToolsAPI.setAddExtensionCallback(callback);
    }

    /**
     * @param impressionEvent
     */
    recordImpression(impressionEvent) {
      DevToolsAPI.sendMessageToEmbedder('recordImpression', [impressionEvent], null);
    }

    /**
     * @param resizeEvent
     */
    recordResize(resizeEvent) {
      DevToolsAPI.sendMessageToEmbedder('recordResize', [resizeEvent], null);
    }

    /**
     * @param clickEvent
     */
    recordClick(clickEvent) {
      DevToolsAPI.sendMessageToEmbedder('recordClick', [clickEvent], null);
    }

    /**
     * @param hoverEvent
     */
    recordHover(hoverEvent) {
      DevToolsAPI.sendMessageToEmbedder('recordHover', [hoverEvent], null);
    }

    /**
     * @param dragEvent
     */
    recordDrag(dragEvent) {
      DevToolsAPI.sendMessageToEmbedder('recordDrag', [dragEvent], null);
    }

    /**
     * @param changeEvent
     */
    recordChange(changeEvent) {
      DevToolsAPI.sendMessageToEmbedder('recordChange', [changeEvent], null);
    }

    /**
     * @param keyDownEvent
     */
    recordKeyDown(keyDownEvent) {
      DevToolsAPI.sendMessageToEmbedder('recordKeyDown', [keyDownEvent], null);
    }

    /**
     * @param settingAccessEvent
     */
    recordSettingAccess(settingAccessEvent) {
      DevToolsAPI.sendMessageToEmbedder('recordSettingAccess', [settingAccessEvent], null);
    }

    /**
     * @param functionCallEvent
     */
    recordFunctionCall(functionCallEvent) {
      DevToolsAPI.sendMessageToEmbedder('recordFunctionCall', [functionCallEvent], null);
    }

    /**
     * @param featureName
     */
    setChromeFlag(featureName, value) {
      DevToolsAPI.sendMessageToEmbedder('setChromeFlag', [featureName, value], null);
    }

    requestRestart() {
      DevToolsAPI.sendMessageToEmbedder('requestRestart', [], null);
    }

    // Backward-compatible methods below this line --------------------------------------------
    /**
     * Support for legacy front-ends (<M65).
     * @returns
     */
    isUnderTest() {
      return false;
    }

    // Backward-compatible methods end before line --------------------------------------------

    /**
     * @returns
     */
    initialTargetId() {
      return DevToolsAPI._initialTargetIdPromise;
    }

    /**
     * @param request
     * @param streamId
     * @param cb
     */
    doAidaConversation(request, streamId, cb) {
      DevToolsAPI.sendMessageToEmbedder('doAidaConversation', [request, streamId], cb);
    }

    /**
     * @param request
     * @param cb
     */
    aidaCodeComplete(request, cb) {
      DevToolsAPI.sendMessageToEmbedder('aidaCodeComplete', [request], cb);
    }

    /**
     * @param request
     * @param cb
     */
    registerAidaClientEvent(request, cb) {
      DevToolsAPI.sendMessageToEmbedder('registerAidaClientEvent', [request], cb);
    }

    /**
     * @param request
     * @param cb
     */
    dispatchHttpRequest(request, cb) {
      DevToolsAPI.sendMessageToEmbedder('dispatchHttpRequest', [request], cb);
    }
  }

  window.InspectorFrontendHost = new InspectorFrontendHostImpl();

  // DevToolsApp ---------------------------------------------------------------

  const staticKeyIdentifiers = new Map([
    [0x12, 'Alt'],
    [0x11, 'Control'],
    [0x10, 'Shift'],
    [0x14, 'CapsLock'],
    [0x5b, 'Win'],
    [0x5c, 'Win'],
    [0x0c, 'Clear'],
    [0x28, 'Down'],
    [0x23, 'End'],
    [0x0a, 'Enter'],
    [0x0d, 'Enter'],
    [0x2b, 'Execute'],
    [0x70, 'F1'],
    [0x71, 'F2'],
    [0x72, 'F3'],
    [0x73, 'F4'],
    [0x74, 'F5'],
    [0x75, 'F6'],
    [0x76, 'F7'],
    [0x77, 'F8'],
    [0x78, 'F9'],
    [0x79, 'F10'],
    [0x7a, 'F11'],
    [0x7b, 'F12'],
    [0x7c, 'F13'],
    [0x7d, 'F14'],
    [0x7e, 'F15'],
    [0x7f, 'F16'],
    [0x80, 'F17'],
    [0x81, 'F18'],
    [0x82, 'F19'],
    [0x83, 'F20'],
    [0x84, 'F21'],
    [0x85, 'F22'],
    [0x86, 'F23'],
    [0x87, 'F24'],
    [0x2f, 'Help'],
    [0x24, 'Home'],
    [0x2d, 'Insert'],
    [0x25, 'Left'],
    [0x22, 'PageDown'],
    [0x21, 'PageUp'],
    [0x13, 'Pause'],
    [0x2c, 'PrintScreen'],
    [0x27, 'Right'],
    [0x91, 'Scroll'],
    [0x29, 'Select'],
    [0x26, 'Up'],
    [0x2e, 'U+007F'],  // Standard says that DEL becomes U+007F.
    [0xb0, 'MediaNextTrack'],
    [0xb1, 'MediaPreviousTrack'],
    [0xb2, 'MediaStop'],
    [0xb3, 'MediaPlayPause'],
    [0xad, 'VolumeMute'],
    [0xae, 'VolumeDown'],
    [0xaf, 'VolumeUp'],
  ]);

  /**
   * @param {number} keyCode
   * @returns
   */
  function keyCodeToKeyIdentifier(keyCode) {
    let result = staticKeyIdentifiers.get(keyCode);
    if (result !== undefined) {
      return result;
    }
    result = 'U+';
    const hexString = keyCode.toString(16).toUpperCase();
    for (let i = hexString.length; i < 4; ++i) {
      result += '0';
    }
    result += hexString;
    return result;
  }

  function installBackwardsCompatibility() {
    const majorVersion = getRemoteMajorVersion();
    if (!majorVersion) {
      return;
    }

    /** @type {!Array<string>} */
    const styleRules = [];
    // Shadow DOM V0 polyfill
    if (majorVersion <= 73 && !Element.prototype.createShadowRoot) {
      Element.prototype.createShadowRoot = function() {
        try {
          return this.attachShadow({mode: 'open'});
        } catch {
          // some elements we use to add shadow roots can no
          // longer have shadow roots.
          const fakeShadowHost = document.createElement('span');
          this.appendChild(fakeShadowHost);
          fakeShadowHost.className = 'fake-shadow-host';
          return fakeShadowHost.createShadowRoot();
        }
      };

      const origAdd = DOMTokenList.prototype.add;
      DOMTokenList.prototype.add = function(...tokens) {
        if (tokens[0].startsWith('insertion-point') || tokens[0].startsWith('tabbed-pane-header')) {
          this._myElement.slot = '.' + tokens[0];
        }
        return origAdd.apply(this, tokens);
      };

      const origCreateElement = Document.prototype.createElement;
      Document.prototype.createElement = function(tagName, ...rest) {
        if (tagName === 'content') {
          tagName = 'slot';
        }
        const element = origCreateElement.call(this, tagName, ...rest);
        element.classList._myElement = element;
        return element;
      };

      Object.defineProperty(HTMLSlotElement.prototype, 'select', {
        set(selector) {
          this.name = selector;
        },
      });
    }

    // Custom Elements V0 polyfill
    if (majorVersion <= 73 && !Document.prototype.hasOwnProperty('registerElement')) {
      const fakeRegistry = new Map();
      Document.prototype.registerElement = function(typeExtension, options) {
        const {prototype, extends: localName} = options;
        const document = this;
        const callback = function() {
          const element = document.createElement(localName || typeExtension);
          const skip = new Set(['constructor', '__proto__']);
          for (const key of Object.keys(Object.getOwnPropertyDescriptors(prototype.__proto__ || {}))) {
            if (skip.has(key)) {
              continue;
            }
            element[key] = prototype[key];
          }
          element.setAttribute('is', typeExtension);
          if (element['createdCallback']) {
            element['createdCallback']();
          }
          return element;
        };
        fakeRegistry.set(typeExtension, callback);
        return callback;
      };

      const origCreateElement = Document.prototype.createElement;
      Document.prototype.createElement = function(tagName, fakeCustomElementType) {
        const fakeConstructor = fakeRegistry.get(fakeCustomElementType);
        if (fakeConstructor) {
          return fakeConstructor();
        }
        return origCreateElement.call(this, tagName, fakeCustomElementType);
      };

      // DevTools front-ends mistakenly assume that
      //   classList.toggle('a', undefined) works as
      //   classList.toggle('a', false) rather than as
      //   classList.toggle('a');
      const originalDOMTokenListToggle = DOMTokenList.prototype.toggle;
      DOMTokenList.prototype.toggle = function(token, force) {
        if (arguments.length === 1) {
          force = !this.contains(token);
        }
        return originalDOMTokenListToggle.call(this, token, Boolean(force));
      };
    }

    if (majorVersion <= 66) {
      /** @type {(!function(number, number):Element|undefined)} */
      ShadowRoot.prototype.__originalShadowRootElementFromPoint;

      if (!ShadowRoot.prototype.__originalShadowRootElementFromPoint) {
        ShadowRoot.prototype.__originalShadowRootElementFromPoint = ShadowRoot.prototype.elementFromPoint;
        /**
         *  @param x
         *  @param y
         *  @returns
         */
        ShadowRoot.prototype.elementFromPoint = function(x, y) {
          const originalResult = ShadowRoot.prototype.__originalShadowRootElementFromPoint.apply(this, arguments);
          if (this.host && originalResult === this.host) {
            return null;
          }
          return originalResult;
        };
      }
    }

    if (majorVersion <= 71) {
      styleRules.push(
          '.coverage-toolbar-container, .animation-timeline-toolbar-container, .computed-properties { flex-basis: auto; }');
    }

    installExtraStyleRules(styleRules);
  }

  /**
   * @param styleRules
   */
  function installExtraStyleRules(styleRules) {
    if (!styleRules.length) {
      return;
    }
    const styleText = styleRules.join('\n');
    document.head.appendChild(createStyleElement(styleText));

    const origCreateShadowRoot = HTMLElement.prototype.createShadowRoot;
    HTMLElement.prototype.createShadowRoot = function(...args) {
      const shadowRoot = origCreateShadowRoot.call(this, ...args);
      shadowRoot.appendChild(createStyleElement(styleText));
      return shadowRoot;
    };
  }

  /**
   * @param styleText
   * @returns
   */
  function createStyleElement(styleText) {
    const style = document.createElement('style');
    style.textContent = styleText;
    return style;
  }

  installBackwardsCompatibility();
})(window);
