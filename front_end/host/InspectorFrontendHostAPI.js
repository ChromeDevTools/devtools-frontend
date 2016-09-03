// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


/** @interface */
function InspectorFrontendHostAPI()
{
}
window.InspectorFrontendHostAPI = InspectorFrontendHostAPI;
/** @typedef
{{
    type: string,
    id: (number|undefined),
    label: (string|undefined),
    enabled: (boolean|undefined),
    checked: (boolean|undefined),
    subItems: (!Array.<!InspectorFrontendHostAPI.ContextMenuDescriptor>|undefined)
}} */
InspectorFrontendHostAPI.ContextMenuDescriptor;

/** @typedef
{{
    statusCode: number,
    headers: (!Object.<string, string>|undefined)
}} */
InspectorFrontendHostAPI.LoadNetworkResourceResult;

/** @enum {symbol} */
InspectorFrontendHostAPI.Events = {
    AddExtensions: Symbol("addExtensions"),
    AppendedToURL: Symbol("appendedToURL"),
    CanceledSaveURL: Symbol("canceledSaveURL"),
    ContextMenuCleared: Symbol("contextMenuCleared"),
    ContextMenuItemSelected: Symbol("contextMenuItemSelected"),
    DeviceCountUpdated: Symbol("deviceCountUpdated"),
    DevicesDiscoveryConfigChanged: Symbol("devicesDiscoveryConfigChanged"),
    DevicesPortForwardingStatusChanged: Symbol("devicesPortForwardingStatusChanged"),
    DevicesUpdated: Symbol("devicesUpdated"),
    DispatchMessage: Symbol("dispatchMessage"),
    DispatchMessageChunk: Symbol("dispatchMessageChunk"),
    EnterInspectElementMode: Symbol("enterInspectElementMode"),
    EvaluateForTestInFrontend: Symbol("evaluateForTestInFrontend"),
    FileSystemsLoaded: Symbol("fileSystemsLoaded"),
    FileSystemRemoved: Symbol("fileSystemRemoved"),
    FileSystemAdded: Symbol("fileSystemAdded"),
    FileSystemFilesChanged: Symbol("fileSystemFilesChanged"),
    IndexingTotalWorkCalculated: Symbol("indexingTotalWorkCalculated"),
    IndexingWorked: Symbol("indexingWorked"),
    IndexingDone: Symbol("indexingDone"),
    KeyEventUnhandled: Symbol("keyEventUnhandled"),
    ReloadInspectedPage: Symbol("reloadInspectedPage"),
    RevealSourceLine: Symbol("revealSourceLine"),
    SavedURL: Symbol("savedURL"),
    SearchCompleted: Symbol("searchCompleted"),
    SetInspectedTabId: Symbol("setInspectedTabId"),
    SetUseSoftMenu: Symbol("setUseSoftMenu"),
    ShowPanel: Symbol("showPanel")
}

InspectorFrontendHostAPI.EventDescriptors = [
    [InspectorFrontendHostAPI.Events.AddExtensions, "addExtensions", ["extensions"]],
    [InspectorFrontendHostAPI.Events.AppendedToURL, "appendedToURL", ["url"]],
    [InspectorFrontendHostAPI.Events.CanceledSaveURL, "canceledSaveURL", ["url"]],
    [InspectorFrontendHostAPI.Events.ContextMenuCleared, "contextMenuCleared", []],
    [InspectorFrontendHostAPI.Events.ContextMenuItemSelected, "contextMenuItemSelected", ["id"]],
    [InspectorFrontendHostAPI.Events.DeviceCountUpdated, "deviceCountUpdated", ["count"]],
    [InspectorFrontendHostAPI.Events.DevicesDiscoveryConfigChanged, "devicesDiscoveryConfigChanged", ["discoverUsbDevices", "portForwardingEnabled", "portForwardingConfig"]],
    [InspectorFrontendHostAPI.Events.DevicesPortForwardingStatusChanged, "devicesPortForwardingStatusChanged", ["status"]],
    [InspectorFrontendHostAPI.Events.DevicesUpdated, "devicesUpdated", ["devices"]],
    [InspectorFrontendHostAPI.Events.DispatchMessage, "dispatchMessage", ["messageObject"]],
    [InspectorFrontendHostAPI.Events.DispatchMessageChunk, "dispatchMessageChunk", ["messageChunk", "messageSize"]],
    [InspectorFrontendHostAPI.Events.EnterInspectElementMode, "enterInspectElementMode", []],
    [InspectorFrontendHostAPI.Events.EvaluateForTestInFrontend, "evaluateForTestInFrontend", ["callId", "script"]],
    [InspectorFrontendHostAPI.Events.FileSystemsLoaded, "fileSystemsLoaded", ["fileSystems"]],
    [InspectorFrontendHostAPI.Events.FileSystemRemoved, "fileSystemRemoved", ["fileSystemPath"]],
    [InspectorFrontendHostAPI.Events.FileSystemAdded, "fileSystemAdded", ["errorMessage", "fileSystem"]],
    [InspectorFrontendHostAPI.Events.FileSystemFilesChanged, "fileSystemFilesChanged", ["paths"]],
    [InspectorFrontendHostAPI.Events.IndexingTotalWorkCalculated, "indexingTotalWorkCalculated", ["requestId", "fileSystemPath", "totalWork"]],
    [InspectorFrontendHostAPI.Events.IndexingWorked, "indexingWorked", ["requestId", "fileSystemPath", "worked"]],
    [InspectorFrontendHostAPI.Events.IndexingDone, "indexingDone", ["requestId", "fileSystemPath"]],
    [InspectorFrontendHostAPI.Events.KeyEventUnhandled, "keyEventUnhandled", ["event"]],
    [InspectorFrontendHostAPI.Events.ReloadInspectedPage, "reloadInspectedPage", ["hard"]],
    [InspectorFrontendHostAPI.Events.RevealSourceLine, "revealSourceLine", ["url", "lineNumber", "columnNumber"]],
    [InspectorFrontendHostAPI.Events.SavedURL, "savedURL", ["url"]],
    [InspectorFrontendHostAPI.Events.SearchCompleted, "searchCompleted", ["requestId", "fileSystemPath", "files"]],
    [InspectorFrontendHostAPI.Events.SetInspectedTabId, "setInspectedTabId", ["tabId"]],
    [InspectorFrontendHostAPI.Events.SetUseSoftMenu, "setUseSoftMenu", ["useSoftMenu"]],
    [InspectorFrontendHostAPI.Events.ShowPanel, "showPanel", ["panelName"]]
];

InspectorFrontendHostAPI.prototype = {
    /**
     * @param {string=} fileSystemPath
     */
    addFileSystem: function(fileSystemPath) { },

    /**
     * @param {string} url
     * @param {string} content
     */
    append: function(url, content) { },

    loadCompleted: function() { },

    /**
     * @param {number} requestId
     * @param {string} fileSystemPath
     */
    indexPath: function(requestId, fileSystemPath) { },

    /**
     * @return {string}
     */
    getSelectionBackgroundColor: function() { },

    /**
     * @return {string}
     */
    getSelectionForegroundColor: function() { },

    /**
     * Requests inspected page to be placed atop of the inspector frontend with specified bounds.
     * @param {{x: number, y: number, width: number, height: number}} bounds
     */
    setInspectedPageBounds: function(bounds) { },

    /**
     * @param {!Array<string>} certChain
     */
    showCertificateViewer: function(certChain) { },

    /**
     * @param {string} shortcuts
     */
    setWhitelistedShortcuts: function(shortcuts) { },

    inspectElementCompleted: function() { },

    /**
     * @param {string} url
     */
    openInNewTab: function(url) { },

    /**
     * @param {string} fileSystemPath
     */
    removeFileSystem: function(fileSystemPath) { },

    requestFileSystems: function() { },

    /**
     * @param {string} url
     * @param {string} content
     * @param {boolean} forceSaveAs
     */
    save: function(url, content, forceSaveAs) { },

    /**
     * @param {number} requestId
     * @param {string} fileSystemPath
     * @param {string} query
     */
    searchInPath: function(requestId, fileSystemPath, query) { },

    /**
     * @param {number} requestId
     */
    stopIndexing: function(requestId) { },

    bringToFront: function() { },

    closeWindow: function() { },

    copyText: function(text) { },

    /**
     * @param {string} url
     */
    inspectedURLChanged: function(url) { },

    /**
     * @param {string} fileSystemId
     * @param {string} registeredName
     * @return {?DOMFileSystem}
     */
    isolatedFileSystem: function(fileSystemId, registeredName) { },

    /**
     * @param {string} url
     * @param {string} headers
     * @param {number} streamId
     * @param {function(!InspectorFrontendHostAPI.LoadNetworkResourceResult)} callback
     */
    loadNetworkResource: function(url, headers, streamId, callback) { },

    /**
     * @param {function(!Object<string, string>)} callback
     */
    getPreferences: function(callback) { },

    /**
     * @param {string} name
     * @param {string} value
     */
    setPreference: function(name, value) { },

    /**
     * @param {string} name
     */
    removePreference: function(name) { },

    clearPreferences: function() { },

    /**
     * @param {!FileSystem} fileSystem
     */
    upgradeDraggedFileSystemPermissions: function(fileSystem) { },

    /**
     * @return {string}
     */
    platform: function() { },

    /**
     * @param {string} actionName
     * @param {number} actionCode
     * @param {number} bucketSize
     */
    recordEnumeratedHistogram: function(actionName, actionCode, bucketSize) { },

    /**
     * @param {string} message
     */
    sendMessageToBackend: function(message) { },

    /**
     * @param {boolean} discoverUsbDevices
     * @param {boolean} portForwardingEnabled
     * @param {!Adb.PortForwardingConfig} portForwardingConfig
     */
    setDevicesDiscoveryConfig: function(discoverUsbDevices, portForwardingEnabled, portForwardingConfig) { },

    /**
     * @param {boolean} enabled
     */
    setDevicesUpdatesEnabled: function(enabled) { },

    /**
     * @param {string} pageId
     * @param {string} action
     */
    performActionOnRemotePage: function(pageId, action) { },

    /**
     * @param {string} browserId
     * @param {string} url
     */
    openRemotePage: function(browserId, url) { },

    /**
     * @param {string} origin
     * @param {string} script
     */
    setInjectedScriptForOrigin: function(origin, script) { },

    /**
     * @param {boolean} isDocked
     * @param {function()} callback
     */
    setIsDocked: function(isDocked, callback) { },

    /**
     * @return {number}
     */
    zoomFactor: function() { },

    zoomIn: function() { },

    zoomOut: function() { },

    resetZoom: function() { },

    /**
     * @param {number} x
     * @param {number} y
     * @param {!Array.<!InspectorFrontendHostAPI.ContextMenuDescriptor>} items
     * @param {!Document} document
     */
    showContextMenuAtPoint: function(x, y, items, document) { },

    /**
     * @return {boolean}
     */
    isUnderTest: function() { },

    readyForTest: function() { },

    /**
     * @return {boolean}
     */
    isHostedMode: function() { }
}
