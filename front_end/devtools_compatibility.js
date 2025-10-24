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

  // InspectorFrontendHostImpl --------------------------------------------------

  /**
   * Enum for recordPerformanceHistogram
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
    RecordingAssertion: 'DevTools.RecordingAssertion',
    RecordingCodeToggled: 'DevTools.RecordingCodeToggled',
    RecordingCopiedToClipboard: 'DevTools.RecordingCopiedToClipboard',
    RecordingEdited: 'DevTools.RecordingEdited',
    RecordingExported: 'DevTools.RecordingExported',
    RecordingReplayFinished: 'DevTools.RecordingReplayFinished',
    RecordingReplaySpeed: 'DevTools.RecordingReplaySpeed',
    RecordingReplayStarted: 'DevTools.RecordingReplayStarted',
    RecordingToggled: 'DevTools.RecordingToggled',
    SourcesPanelFileDebugged: 'DevTools.SourcesPanelFileDebugged',
    SourcesPanelFileOpened: 'DevTools.SourcesPanelFileOpened',
    NetworkPanelResponsePreviewOpened: 'DevTools.NetworkPanelResponsePreviewOpened',
    TimelineNavigationSettingState: 'DevTools.TimelineNavigationSettingState',
    SyncSetting: 'DevTools.SyncSetting',
    SwatchActivated: 'DevTools.SwatchActivated',
    AnimationPlaybackRateChanged: 'DevTools.AnimationPlaybackRateChanged',
    BuiltInAiAvailability: 'DevTools.BuiltInAiAvailability'
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
        optIn: false
      };
      const devToolsFreestylerDogfood = {
        enabled: (newConfig.devToolsFreestyler?.enabled && newConfig.aidaAvailability?.enabled) ?? false,
        aidaModelId: newConfig.devToolsFreestyler?.modelId ?? '',
        aidaTemperature: newConfig.devToolsFreestyler?.temperature ?? 0,
        blockedByAge: newConfig.aidaAvailability?.blockedByAge ?? true,
        blockedByEnterprisePolicy: newConfig.aidaAvailability?.blockedByEnterprisePolicy ?? true,
        blockedByGeo: newConfig.aidaAvailability?.blockedByGeo ?? true
      };
      return {
        devToolsConsoleInsights,
        devToolsFreestylerDogfood,
        devToolsVeLogging: newConfig.devToolsVeLogging,
        isOffTheRecord: newConfig.isOffTheRecord
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
      DevToolsAPI.sendMessageToEmbedder(
          'setDevicesDiscoveryConfig',
          [
            config.discoverUsbDevices, config.portForwardingEnabled, JSON.stringify(config.portForwardingConfig),
            config.networkDiscoveryEnabled, JSON.stringify(config.networkDiscoveryConfig)
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
    [0xaf, 'VolumeUp']
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
        }
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
