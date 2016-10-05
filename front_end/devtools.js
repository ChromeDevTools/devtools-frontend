// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable indent */
(function(window) {

  // DevToolsAPI ----------------------------------------------------------------

  /**
   * @constructor
   */
  function DevToolsAPIImpl() {
    /**
     * @type {number}
     */
    this._lastCallId = 0;

    /**
     * @type {!Object.<number, function(?Object)>}
     */
    this._callbacks = {};
  }

  DevToolsAPIImpl.prototype = {
    /**
     * @param {number} id
     * @param {?Object} arg
     */
    embedderMessageAck: function(id, arg) {
      var callback = this._callbacks[id];
      delete this._callbacks[id];
      if (callback)
        callback(arg);
    },

    /**
     * @param {string} method
     * @param {!Array.<*>} args
     * @param {?function(?Object)} callback
     */
    sendMessageToEmbedder: function(method, args, callback) {
      var callId = ++this._lastCallId;
      if (callback)
        this._callbacks[callId] = callback;
      var message = {'id': callId, 'method': method};
      if (args.length)
        message.params = args;
      DevToolsHost.sendMessageToEmbedder(JSON.stringify(message));
    },

    /**
     * @param {string} method
     * @param {!Array.<*>} args
     */
    _dispatchOnInspectorFrontendAPI: function(method, args) {
      var api = window['InspectorFrontendAPI'];
      api[method].apply(api, args);
    },

    // API methods below this line --------------------------------------------

    /**
     * @param {!Array.<!ExtensionDescriptor>} extensions
     */
    addExtensions: function(extensions) {
      // Support for legacy front-ends (<M41).
      if (window['WebInspector'].addExtensions)
        window['WebInspector'].addExtensions(extensions);
      else
        this._dispatchOnInspectorFrontendAPI('addExtensions', [extensions]);
    },

    /**
     * @param {string} url
     */
    appendedToURL: function(url) { this._dispatchOnInspectorFrontendAPI('appendedToURL', [url]); },

    /**
     * @param {string} url
     */
    canceledSaveURL: function(url) {
      this._dispatchOnInspectorFrontendAPI('canceledSaveURL', [url]);
    },

    contextMenuCleared: function() {
      this._dispatchOnInspectorFrontendAPI('contextMenuCleared', []);
    },

    /**
     * @param {string} id
     */
    contextMenuItemSelected: function(id) {
      this._dispatchOnInspectorFrontendAPI('contextMenuItemSelected', [id]);
    },

    /**
     * @param {number} count
     */
    deviceCountUpdated: function(count) {
      this._dispatchOnInspectorFrontendAPI('deviceCountUpdated', [count]);
    },

    /**
     * @param {boolean} discoverUsbDevices
     * @param {boolean} portForwardingEnabled
     * @param {!Adb.PortForwardingConfig} portForwardingConfig
     */
    devicesDiscoveryConfigChanged: function(
        discoverUsbDevices, portForwardingEnabled, portForwardingConfig) {
      this._dispatchOnInspectorFrontendAPI(
          'devicesDiscoveryConfigChanged',
          [discoverUsbDevices, portForwardingEnabled, portForwardingConfig]);
    },

    /**
     * @param {!Adb.PortForwardingStatus} status
     */
    devicesPortForwardingStatusChanged: function(status) {
      this._dispatchOnInspectorFrontendAPI('devicesPortForwardingStatusChanged', [status]);
    },

    /**
     * @param {!Array.<!Adb.Device>} devices
     */
    devicesUpdated: function(devices) {
      this._dispatchOnInspectorFrontendAPI('devicesUpdated', [devices]);
    },

    /**
     * @param {string} message
     */
    dispatchMessage: function(message) {
      this._dispatchOnInspectorFrontendAPI('dispatchMessage', [message]);
    },

    /**
     * @param {string} messageChunk
     * @param {number} messageSize
     */
    dispatchMessageChunk: function(messageChunk, messageSize) {
      this._dispatchOnInspectorFrontendAPI('dispatchMessageChunk', [messageChunk, messageSize]);
    },

    enterInspectElementMode: function() {
      this._dispatchOnInspectorFrontendAPI('enterInspectElementMode', []);
    },

    /**
     * @param {number} callId
     * @param {string} script
     */
    evaluateForTestInFrontend: function(callId, script) {
      this._dispatchOnInspectorFrontendAPI('evaluateForTestInFrontend', [callId, script]);
    },

    /**
     * @param {!Array.<!{fileSystemName: string, rootURL: string, fileSystemPath: string}>}
     * fileSystems
     */
    fileSystemsLoaded: function(fileSystems) {
      this._dispatchOnInspectorFrontendAPI('fileSystemsLoaded', [fileSystems]);
    },

    /**
     * @param {string} fileSystemPath
     */
    fileSystemRemoved: function(fileSystemPath) {
      this._dispatchOnInspectorFrontendAPI('fileSystemRemoved', [fileSystemPath]);
    },

    /**
     * @param {!{fileSystemName: string, rootURL: string, fileSystemPath: string}} fileSystem
     */
    fileSystemAdded: function(fileSystem) {
      this._dispatchOnInspectorFrontendAPI('fileSystemAdded', ['', fileSystem]);
    },

    /**
     * @param {!Array<string>} changedPaths
     */
    fileSystemFilesChanged: function(changedPaths) {
      this._dispatchOnInspectorFrontendAPI('fileSystemFilesChanged', [changedPaths]);
    },

    /**
     * @param {number} requestId
     * @param {string} fileSystemPath
     * @param {number} totalWork
     */
    indexingTotalWorkCalculated: function(requestId, fileSystemPath, totalWork) {
      this._dispatchOnInspectorFrontendAPI(
          'indexingTotalWorkCalculated', [requestId, fileSystemPath, totalWork]);
    },

    /**
     * @param {number} requestId
     * @param {string} fileSystemPath
     * @param {number} worked
     */
    indexingWorked: function(requestId, fileSystemPath, worked) {
      this._dispatchOnInspectorFrontendAPI('indexingWorked', [requestId, fileSystemPath, worked]);
    },

    /**
     * @param {number} requestId
     * @param {string} fileSystemPath
     */
    indexingDone: function(requestId, fileSystemPath) {
      this._dispatchOnInspectorFrontendAPI('indexingDone', [requestId, fileSystemPath]);
    },

    /**
     * @param {{type: string, key: string, code: string, keyCode: number, modifiers: number}} event
     */
    keyEventUnhandled: function(event) {
      event.keyIdentifier = keyCodeToKeyIdentifier(event.keyCode);
      this._dispatchOnInspectorFrontendAPI('keyEventUnhandled', [event]);
    },

    /**
     * @param {boolean} hard
     */
    reloadInspectedPage: function(hard) {
      this._dispatchOnInspectorFrontendAPI('reloadInspectedPage', [hard]);
    },

    /**
     * @param {string} url
     * @param {number} lineNumber
     * @param {number} columnNumber
     */
    revealSourceLine: function(url, lineNumber, columnNumber) {
      this._dispatchOnInspectorFrontendAPI('revealSourceLine', [url, lineNumber, columnNumber]);
    },

    /**
     * @param {string} url
     */
    savedURL: function(url) { this._dispatchOnInspectorFrontendAPI('savedURL', [url]); },

    /**
     * @param {number} requestId
     * @param {string} fileSystemPath
     * @param {!Array.<string>} files
     */
    searchCompleted: function(requestId, fileSystemPath, files) {
      this._dispatchOnInspectorFrontendAPI('searchCompleted', [requestId, fileSystemPath, files]);
    },

    /**
     * @param {string} tabId
     */
    setInspectedTabId: function(tabId) {
      // Support for legacy front-ends (<M41).
      if (window['WebInspector'].setInspectedTabId)
        window['WebInspector'].setInspectedTabId(tabId);
      else
        this._dispatchOnInspectorFrontendAPI('setInspectedTabId', [tabId]);
    },

    /**
     * @param {boolean} useSoftMenu
     */
    setUseSoftMenu: function(useSoftMenu) {
      this._dispatchOnInspectorFrontendAPI('setUseSoftMenu', [useSoftMenu]);
    },

    /**
     * @param {string} panelName
     */
    showPanel: function(panelName) {
      this._dispatchOnInspectorFrontendAPI('showPanel', [panelName]);
    },

    /**
     * @param {number} id
     * @param {string} chunk
     * @param {boolean} encoded
     */
    streamWrite: function(id, chunk, encoded) {
      this._dispatchOnInspectorFrontendAPI(
          'streamWrite', [id, encoded ? this._decodeBase64(chunk) : chunk]);
    },

    /**
     * @param {string} chunk
     * @return {string}
     */
    _decodeBase64: function(chunk) {
      var request = new XMLHttpRequest();
      request.open('GET', 'data:text/plain;base64,' + chunk, false);
      request.send(null);
      if (request.status === 200) {
        return request.responseText;
      } else {
        console.error('Error while decoding chunk in streamWrite');
        return '';
      }
    }
  };

  var DevToolsAPI = new DevToolsAPIImpl();
  window.DevToolsAPI = DevToolsAPI;

  // InspectorFrontendHostImpl --------------------------------------------------

  /**
   * @constructor
   * @implements {InspectorFrontendHostAPI}
   */
  function InspectorFrontendHostImpl() {}

  InspectorFrontendHostImpl.prototype = {
    /**
     * @override
     * @return {string}
     */
    getSelectionBackgroundColor: function() { return DevToolsHost.getSelectionBackgroundColor(); },

    /**
     * @override
     * @return {string}
     */
    getSelectionForegroundColor: function() { return DevToolsHost.getSelectionForegroundColor(); },

    /**
     * @override
     * @return {string}
     */
    platform: function() { return DevToolsHost.platform(); },

    /**
     * @override
     */
    loadCompleted: function() { DevToolsAPI.sendMessageToEmbedder('loadCompleted', [], null); },

    /**
     * @override
     */
    bringToFront: function() { DevToolsAPI.sendMessageToEmbedder('bringToFront', [], null); },

    /**
     * @override
     */
    closeWindow: function() { DevToolsAPI.sendMessageToEmbedder('closeWindow', [], null); },

    /**
     * @override
     * @param {boolean} isDocked
     * @param {function()} callback
     */
    setIsDocked: function(isDocked, callback) {
      DevToolsAPI.sendMessageToEmbedder('setIsDocked', [isDocked], callback);
    },

    /**
     * Requests inspected page to be placed atop of the inspector frontend with specified bounds.
     * @override
     * @param {{x: number, y: number, width: number, height: number}} bounds
     */
    setInspectedPageBounds: function(bounds) {
      DevToolsAPI.sendMessageToEmbedder('setInspectedPageBounds', [bounds], null);
    },

    /**
     * @override
     */
    inspectElementCompleted: function() {
      DevToolsAPI.sendMessageToEmbedder('inspectElementCompleted', [], null);
    },

    /**
     * @override
     * @param {string} url
     * @param {string} headers
     * @param {number} streamId
     * @param {function(!InspectorFrontendHostAPI.LoadNetworkResourceResult)} callback
     */
    loadNetworkResource: function(url, headers, streamId, callback) {
      DevToolsAPI.sendMessageToEmbedder(
          'loadNetworkResource', [url, headers, streamId],
          /** @type {function(?Object)} */ (callback));
    },

    /**
     * @override
     * @param {function(!Object<string, string>)} callback
     */
    getPreferences: function(callback) {
      DevToolsAPI.sendMessageToEmbedder(
          'getPreferences', [], /** @type {function(?Object)} */ (callback));
    },

    /**
     * @override
     * @param {string} name
     * @param {string} value
     */
    setPreference: function(name, value) {
      DevToolsAPI.sendMessageToEmbedder('setPreference', [name, value], null);
    },

    /**
     * @override
     * @param {string} name
     */
    removePreference: function(name) {
      DevToolsAPI.sendMessageToEmbedder('removePreference', [name], null);
    },

    /**
     * @override
     */
    clearPreferences: function() {
      DevToolsAPI.sendMessageToEmbedder('clearPreferences', [], null);
    },

    /**
     * @override
     * @param {string} origin
     * @param {string} script
     */
    setInjectedScriptForOrigin: function(origin, script) {
      DevToolsHost.setInjectedScriptForOrigin(origin, script);
    },

    /**
     * @override
     * @param {string} url
     */
    inspectedURLChanged: function(url) {
      DevToolsAPI.sendMessageToEmbedder('inspectedURLChanged', [url], null);
    },

    /**
     * @override
     * @param {string} text
     */
    copyText: function(text) { DevToolsHost.copyText(text); },

    /**
     * @override
     * @param {string} url
     */
    openInNewTab: function(url) { DevToolsAPI.sendMessageToEmbedder('openInNewTab', [url], null); },

    /**
     * @override
     * @param {string} url
     * @param {string} content
     * @param {boolean} forceSaveAs
     */
    save: function(url, content, forceSaveAs) {
      DevToolsAPI.sendMessageToEmbedder('save', [url, content, forceSaveAs], null);
    },

    /**
     * @override
     * @param {string} url
     * @param {string} content
     */
    append: function(url, content) {
      DevToolsAPI.sendMessageToEmbedder('append', [url, content], null);
    },

    /**
     * @override
     * @param {string} message
     */
    sendMessageToBackend: function(message) {
      DevToolsAPI.sendMessageToEmbedder('dispatchProtocolMessage', [message], null);
    },

    /**
     * @override
     * @param {string} actionName
     * @param {number} actionCode
     * @param {number} bucketSize
     */
    recordEnumeratedHistogram: function(actionName, actionCode, bucketSize) {
      // Support for M49 frontend.
      if (actionName === 'DevTools.DrawerShown')
        return;
      DevToolsAPI.sendMessageToEmbedder(
          'recordEnumeratedHistogram', [actionName, actionCode, bucketSize], null);
    },

    /**
     * @override
     */
    requestFileSystems: function() {
      DevToolsAPI.sendMessageToEmbedder('requestFileSystems', [], null);
    },

    /**
     * @override
     * @param {string=} fileSystemPath
     */
    addFileSystem: function(fileSystemPath) {
      DevToolsAPI.sendMessageToEmbedder('addFileSystem', [fileSystemPath || ''], null);
    },

    /**
     * @override
     * @param {string} fileSystemPath
     */
    removeFileSystem: function(fileSystemPath) {
      DevToolsAPI.sendMessageToEmbedder('removeFileSystem', [fileSystemPath], null);
    },

    /**
     * @override
     * @param {string} fileSystemId
     * @param {string} registeredName
     * @return {?DOMFileSystem}
     */
    isolatedFileSystem: function(fileSystemId, registeredName) {
      return DevToolsHost.isolatedFileSystem(fileSystemId, registeredName);
    },

    /**
     * @override
     * @param {!FileSystem} fileSystem
     */
    upgradeDraggedFileSystemPermissions: function(fileSystem) {
      DevToolsHost.upgradeDraggedFileSystemPermissions(fileSystem);
    },

    /**
     * @override
     * @param {number} requestId
     * @param {string} fileSystemPath
     */
    indexPath: function(requestId, fileSystemPath) {
      DevToolsAPI.sendMessageToEmbedder('indexPath', [requestId, fileSystemPath], null);
    },

    /**
     * @override
     * @param {number} requestId
     */
    stopIndexing: function(requestId) {
      DevToolsAPI.sendMessageToEmbedder('stopIndexing', [requestId], null);
    },

    /**
     * @override
     * @param {number} requestId
     * @param {string} fileSystemPath
     * @param {string} query
     */
    searchInPath: function(requestId, fileSystemPath, query) {
      DevToolsAPI.sendMessageToEmbedder('searchInPath', [requestId, fileSystemPath, query], null);
    },

    /**
     * @override
     * @return {number}
     */
    zoomFactor: function() { return DevToolsHost.zoomFactor(); },

    /**
     * @override
     */
    zoomIn: function() { DevToolsAPI.sendMessageToEmbedder('zoomIn', [], null); },

    /**
     * @override
     */
    zoomOut: function() { DevToolsAPI.sendMessageToEmbedder('zoomOut', [], null); },

    /**
     * @override
     */
    resetZoom: function() { DevToolsAPI.sendMessageToEmbedder('resetZoom', [], null); },

    /**
     * @override
     * @param {string} shortcuts
     */
    setWhitelistedShortcuts: function(shortcuts) {
      DevToolsAPI.sendMessageToEmbedder('setWhitelistedShortcuts', [shortcuts], null);
    },

    /**
     * @param {!Array<string>} certChain
     */
    showCertificateViewer: function(certChain) {
      DevToolsAPI.sendMessageToEmbedder('showCertificateViewer', [JSON.stringify(certChain)], null);
    },

    /**
     * @override
     * @return {boolean}
     */
    isUnderTest: function() { return DevToolsHost.isUnderTest(); },

    /**
     * @override
     */
    readyForTest: function() { DevToolsAPI.sendMessageToEmbedder('readyForTest', [], null); },

    /**
     * @override
     * @param {boolean} discoverUsbDevices
     * @param {boolean} portForwardingEnabled
     * @param {!Adb.PortForwardingConfig} portForwardingConfig
     */
    setDevicesDiscoveryConfig: function(
        discoverUsbDevices, portForwardingEnabled, portForwardingConfig) {
      DevToolsAPI.sendMessageToEmbedder(
          'setDevicesDiscoveryConfig',
          [discoverUsbDevices, portForwardingEnabled, JSON.stringify(portForwardingConfig)], null);
    },

    /**
     * @override
     * @param {boolean} enabled
     */
    setDevicesUpdatesEnabled: function(enabled) {
      DevToolsAPI.sendMessageToEmbedder('setDevicesUpdatesEnabled', [enabled], null);
    },

    /**
     * @override
     * @param {string} pageId
     * @param {string} action
     */
    performActionOnRemotePage: function(pageId, action) {
      DevToolsAPI.sendMessageToEmbedder('performActionOnRemotePage', [pageId, action], null);
    },

    /**
     * @override
     * @param {string} browserId
     * @param {string} url
     */
    openRemotePage: function(browserId, url) {
      DevToolsAPI.sendMessageToEmbedder('openRemotePage', [browserId, url], null);
    },

    /**
     * @override
     * @param {number} x
     * @param {number} y
     * @param {!Array.<!InspectorFrontendHostAPI.ContextMenuDescriptor>} items
     * @param {!Document} document
     */
    showContextMenuAtPoint: function(x, y, items, document) {
      DevToolsHost.showContextMenuAtPoint(x, y, items, document);
    },

    /**
     * @override
     * @return {boolean}
     */
    isHostedMode: function() { return DevToolsHost.isHostedMode(); },

    // Backward-compatible methods below this line --------------------------------------------

    /**
     * Support for legacy front-ends (<M50).
     * @param {string} message
     */
    sendFrontendAPINotification: function(message) {},

    /**
     * Support for legacy front-ends (<M41).
     * @return {string}
     */
    port: function() { return 'unknown'; },

    /**
     * Support for legacy front-ends (<M38).
     * @param {number} zoomFactor
     */
    setZoomFactor: function(zoomFactor) {},

    /**
     * Support for legacy front-ends (<M34).
     */
    sendMessageToEmbedder: function() {},

    /**
     * Support for legacy front-ends (<M34).
     * @param {string} dockSide
     */
    requestSetDockSide: function(dockSide) {
      DevToolsAPI.sendMessageToEmbedder('setIsDocked', [dockSide !== 'undocked'], null);
    },

    /**
     * Support for legacy front-ends (<M34).
     * @return {boolean}
     */
    supportsFileSystems: function() { return true; },

    /**
     * Support for legacy front-ends (<M28).
     * @return {boolean}
     */
    canInspectWorkers: function() { return true; },

    /**
     * Support for legacy front-ends (<M28).
     * @return {boolean}
     */
    canSaveAs: function() { return true; },

    /**
     * Support for legacy front-ends (<M28).
     * @return {boolean}
     */
    canSave: function() { return true; },

    /**
     * Support for legacy front-ends (<M28).
     */
    loaded: function() {},

    /**
     * Support for legacy front-ends (<M28).
     * @return {string}
     */
    hiddenPanels: function() { return ''; },

    /**
     * Support for legacy front-ends (<M28).
     * @return {string}
     */
    localizedStringsURL: function() { return ''; },

    /**
     * Support for legacy front-ends (<M28).
     * @param {string} url
     */
    close: function(url) {},

    /**
     * Support for legacy front-ends (<M44).
     * @param {number} actionCode
     */
    recordActionTaken: function(actionCode) {
      this.recordEnumeratedHistogram('DevTools.ActionTaken', actionCode, 100);
    },

    /**
     * Support for legacy front-ends (<M44).
     * @param {number} panelCode
     */
    recordPanelShown: function(panelCode) {
      this.recordEnumeratedHistogram('DevTools.PanelShown', panelCode, 20);
    }
  };

  window.InspectorFrontendHost = new InspectorFrontendHostImpl();

  // DevToolsApp ---------------------------------------------------------------

  function installObjectObserve() {
    var properties = [
      'advancedSearchConfig',
      'auditsPanelSplitViewState',
      'auditsSidebarWidth',
      'blockedURLs',
      'breakpoints',
      'cacheDisabled',
      'colorFormat',
      'consoleHistory',
      'consoleTimestampsEnabled',
      'cpuProfilerView',
      'cssSourceMapsEnabled',
      'currentDockState',
      'customColorPalette',
      'customDevicePresets',
      'customEmulatedDeviceList',
      'customFormatters',
      'customUserAgent',
      'databaseTableViewVisibleColumns',
      'dataGrid-cookiesTable',
      'dataGrid-DOMStorageItemsView',
      'debuggerSidebarHidden',
      'disableDataSaverInfobar',
      'disablePausedStateOverlay',
      'domBreakpoints',
      'domWordWrap',
      'elementsPanelSplitViewState',
      'elementsSidebarWidth',
      'emulation.deviceHeight',
      'emulation.deviceModeValue',
      'emulation.deviceOrientationOverride',
      'emulation.deviceScale',
      'emulation.deviceScaleFactor',
      'emulation.deviceUA',
      'emulation.deviceWidth',
      'emulation.geolocationOverride',
      'emulation.showDeviceMode',
      'emulation.showRulers',
      'enableAsyncStackTraces',
      'eventListenerBreakpoints',
      'fileMappingEntries',
      'fileSystemMapping',
      'FileSystemViewSidebarWidth',
      'fileSystemViewSplitViewState',
      'filterBar-consoleView',
      'filterBar-networkPanel',
      'filterBar-promisePane',
      'filterBar-timelinePanel',
      'frameViewerHideChromeWindow',
      'heapSnapshotRetainersViewSize',
      'heapSnapshotSplitViewState',
      'hideCollectedPromises',
      'hideNetworkMessages',
      'highlightNodeOnHoverInOverlay',
      'highResolutionCpuProfiling',
      'inlineVariableValues',
      'Inspector.drawerSplitView',
      'Inspector.drawerSplitViewState',
      'InspectorView.panelOrder',
      'InspectorView.screencastSplitView',
      'InspectorView.screencastSplitViewState',
      'InspectorView.splitView',
      'InspectorView.splitViewState',
      'javaScriptDisabled',
      'jsSourceMapsEnabled',
      'lastActivePanel',
      'lastDockState',
      'lastSelectedSourcesSidebarPaneTab',
      'lastSnippetEvaluationIndex',
      'layerDetailsSplitView',
      'layerDetailsSplitViewState',
      'layersPanelSplitViewState',
      'layersShowInternalLayers',
      'layersSidebarWidth',
      'messageLevelFilters',
      'messageURLFilters',
      'monitoringXHREnabled',
      'navigatorGroupByFolder',
      'navigatorHidden',
      'networkColorCodeResourceTypes',
      'networkConditions',
      'networkConditionsCustomProfiles',
      'networkHideDataURL',
      'networkLogColumnsVisibility',
      'networkLogLargeRows',
      'networkLogShowOverview',
      'networkPanelSplitViewState',
      'networkRecordFilmStripSetting',
      'networkResourceTypeFilters',
      'networkShowPrimaryLoadWaterfall',
      'networkSidebarWidth',
      'openLinkHandler',
      'pauseOnCaughtException',
      'pauseOnExceptionEnabled',
      'preserveConsoleLog',
      'prettyPrintInfobarDisabled',
      'previouslyViewedFiles',
      'profilesPanelSplitViewState',
      'profilesSidebarWidth',
      'promiseStatusFilters',
      'recordAllocationStacks',
      'requestHeaderFilterSetting',
      'request-info-formData-category-expanded',
      'request-info-general-category-expanded',
      'request-info-queryString-category-expanded',
      'request-info-requestHeaders-category-expanded',
      'request-info-requestPayload-category-expanded',
      'request-info-responseHeaders-category-expanded',
      'resources',
      'resourcesLastSelectedItem',
      'resourcesPanelSplitViewState',
      'resourcesSidebarWidth',
      'resourceViewTab',
      'savedURLs',
      'screencastEnabled',
      'scriptsPanelNavigatorSidebarWidth',
      'searchInContentScripts',
      'selectedAuditCategories',
      'selectedColorPalette',
      'selectedProfileType',
      'shortcutPanelSwitch',
      'showAdvancedHeapSnapshotProperties',
      'showEventListenersForAncestors',
      'showFrameowkrListeners',
      'showHeaSnapshotObjectsHiddenProperties',
      'showInheritedComputedStyleProperties',
      'showMediaQueryInspector',
      'showNativeFunctionsInJSProfile',
      'showUAShadowDOM',
      'showWhitespacesInEditor',
      'sidebarPosition',
      'skipContentScripts',
      'skipStackFramesPattern',
      'sourceMapInfobarDisabled',
      'sourcesPanelDebuggerSidebarSplitViewState',
      'sourcesPanelNavigatorSplitViewState',
      'sourcesPanelSplitSidebarRatio',
      'sourcesPanelSplitViewState',
      'sourcesSidebarWidth',
      'standardEmulatedDeviceList',
      'StylesPaneSplitRatio',
      'stylesPaneSplitViewState',
      'textEditorAutocompletion',
      'textEditorAutoDetectIndent',
      'textEditorBracketMatching',
      'textEditorIndent',
      'timelineCaptureFilmStrip',
      'timelineCaptureLayersAndPictures',
      'timelineCaptureMemory',
      'timelineCaptureNetwork',
      'timeline-details',
      'timelineEnableJSSampling',
      'timelineOverviewMode',
      'timelinePanelDetailsSplitViewState',
      'timelinePanelRecorsSplitViewState',
      'timelinePanelTimelineStackSplitViewState',
      'timelinePerspective',
      'timeline-split',
      'timelineTreeGroupBy',
      'timeline-view',
      'timelineViewMode',
      'uiTheme',
      'watchExpressions',
      'WebInspector.Drawer.lastSelectedView',
      'WebInspector.Drawer.showOnLoad',
      'workspaceExcludedFolders',
      'workspaceFolderExcludePattern',
      'workspaceInfobarDisabled',
      'workspaceMappingInfobarDisabled',
      'xhrBreakpoints'
    ];

    /**
     * @this {!{_storage: Object, _name: string}}
     */
    function settingRemove() { this._storage[this._name] = undefined; }

    function objectObserve(object, observer) {
      if (window['WebInspector']) {
        var settingPrototype = window['WebInspector']['Setting']['prototype'];
        if (typeof settingPrototype['remove'] === 'function')
          settingPrototype['remove'] = settingRemove;
      }

      var changedProperties = new Set();
      var scheduled = false;

      function scheduleObserver() {
        if (!scheduled) {
          scheduled = true;
          setImmediate(callObserver);
        }
      }

      function callObserver() {
        scheduled = false;
        var changes = [];
        changedProperties.forEach(function(name) { changes.push({name: name}); });
        changedProperties.clear();
        observer.call(null, changes);
      }

      var storage = new Map();

      function defineProperty(property) {
        if (property in object) {
          storage.set(property, object[property]);
          delete object[property];
        }

        Object.defineProperty(object, property, {
          get: function() { return storage.get(property); },

          set: function(value) {
            storage.set(property, value);
            changedProperties.add(property);
            scheduleObserver();
          }
        });
      }

      for (var i = 0; i < properties.length; ++i)
        defineProperty(properties[i]);
    }

    window.Object.observe = objectObserve;
  }

  /**
   * @suppressGlobalPropertiesCheck
   */
  function sanitizeRemoteFrontendUrl() {
    var remoteBaseRegexp =
        /^https:\/\/chrome-devtools-frontend\.appspot\.com\/serve_file\/@[0-9a-zA-Z]+\/?$/;
    var remoteFrontendUrlRegexp =
        /^https:\/\/chrome-devtools-frontend\.appspot\.com\/serve_rev\/@?[0-9a-zA-Z]+\/(devtools|inspector)\.html$/;
    var queryParams = location.search;
    if (!queryParams)
      return;
    var params = queryParams.substring(1).split('&');
    for (var i = 0; i < params.length; ++i) {
      var pair = params[i].split('=');
      var name = pair.shift();
      var value = pair.join('=');
      if (name === 'remoteFrontendUrl' && !remoteFrontendUrlRegexp.test(value))
        location.search = '';
      if (name === 'remoteBase' && !remoteBaseRegexp.test(value))
        location.search = '';
      if (name === 'settings')
        location.search = '';
    }
  }

  var staticKeyIdentifiers = new Map([
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

  function keyCodeToKeyIdentifier(keyCode) {
    var result = staticKeyIdentifiers.get(keyCode);
    if (result !== undefined)
      return result;
    result = 'U+';
    var hexString = keyCode.toString(16).toUpperCase();
    for (var i = hexString.length; i < 4; ++i)
      result += '0';
    result += hexString;
    return result;
  }

  /**
   * @suppressGlobalPropertiesCheck
   * @suppress {checkTypes}
   */
  function installBackwardsCompatibility() {
    sanitizeRemoteFrontendUrl();

    if (window.location.search.indexOf('remoteFrontend') === -1)
      return;

    // Support for legacy (<M53) frontends.
    if (!window.KeyboardEvent.prototype.hasOwnProperty('keyIdentifier')) {
      Object.defineProperty(
          window.KeyboardEvent.prototype, 'keyIdentifier',
          {get: function() { return keyCodeToKeyIdentifier(this.keyCode); }});
    }

    // Support for legacy (<M50) frontends.
    installObjectObserve();

    /**
     * @this {CSSStyleDeclaration}
     */
    function getValue(property) {
      // Note that |property| comes from another context, so we can't use === here.
      // eslint-disable-next-line eqeqeq
      if (property == 'padding-left') {
        return {
          /**
           * @suppressReceiverCheck
           * @this {Object}
           */
          getFloatValue: function() { return this.__paddingLeft; },
          __paddingLeft: parseFloat(this.paddingLeft)
        };
      }
      throw new Error('getPropertyCSSValue is undefined');
    }

    // Support for legacy (<M41) frontends.
    window.CSSStyleDeclaration.prototype.getPropertyCSSValue = getValue;

    function CSSPrimitiveValue() {}
    CSSPrimitiveValue.CSS_PX = 5;
    window.CSSPrimitiveValue = CSSPrimitiveValue;

    // Support for legacy (<M44) frontends.
    var styleElement = window.document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.textContent = 'html /deep/ * { min-width: 0; min-height: 0; }';

    // Support for quirky border-image behavior (<M51), see:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=559258
    styleElement.textContent +=
        '\nhtml /deep/ .cm-breakpoint .CodeMirror-linenumber { border-style: solid !important; }';
    styleElement.textContent +=
        '\nhtml /deep/ .cm-breakpoint.cm-breakpoint-conditional .CodeMirror-linenumber { border-style: solid !important; }';
    window.document.head.appendChild(styleElement);

    // Support for legacy (<M49) frontends.
    Event.prototype.deepPath = undefined;

    // Support for legacy (<53) frontends.
    window.FileError = {
      NOT_FOUND_ERR: DOMException.NOT_FOUND_ERR,
      ABORT_ERR: DOMException.ABORT_ERR,
      INVALID_MODIFICATION_ERR: DOMException.INVALID_MODIFICATION_ERR,
      NOT_READABLE_ERR: 0  // No matching DOMException, so code will be 0.
    };
  }

  function windowLoaded() {
    window.removeEventListener('DOMContentLoaded', windowLoaded, false);
    installBackwardsCompatibility();
  }

  sanitizeRemoteFrontendUrl();
  if (window.document.head &&
      (window.document.readyState === 'complete' || window.document.readyState === 'interactive'))
    installBackwardsCompatibility();
  else
    window.addEventListener('DOMContentLoaded', windowLoaded, false);

})(window);

if (!DOMTokenList.prototype.__originalDOMTokenListToggle) {
  DOMTokenList.prototype.__originalDOMTokenListToggle = DOMTokenList.prototype.toggle;
  DOMTokenList.prototype.toggle = function(token, force) {
    if (arguments.length === 1)
      force = !this.contains(token);
    return this.__originalDOMTokenListToggle(token, !!force);
  };
}
