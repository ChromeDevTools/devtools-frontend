// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../root/root.js';  // eslint-disable-line no-unused-vars

/** @enum {symbol} */
export const Events = {
  AppendedToURL: Symbol('appendedToURL'),
  CanceledSaveURL: Symbol('canceledSaveURL'),
  ContextMenuCleared: Symbol('contextMenuCleared'),
  ContextMenuItemSelected: Symbol('contextMenuItemSelected'),
  DeviceCountUpdated: Symbol('deviceCountUpdated'),
  DevicesDiscoveryConfigChanged: Symbol('devicesDiscoveryConfigChanged'),
  DevicesPortForwardingStatusChanged: Symbol('devicesPortForwardingStatusChanged'),
  DevicesUpdated: Symbol('devicesUpdated'),
  DispatchMessage: Symbol('dispatchMessage'),
  DispatchMessageChunk: Symbol('dispatchMessageChunk'),
  EnterInspectElementMode: Symbol('enterInspectElementMode'),
  EyeDropperPickedColor: Symbol('eyeDropperPickedColor'),
  FileSystemsLoaded: Symbol('fileSystemsLoaded'),
  FileSystemRemoved: Symbol('fileSystemRemoved'),
  FileSystemAdded: Symbol('fileSystemAdded'),
  FileSystemFilesChangedAddedRemoved: Symbol('FileSystemFilesChangedAddedRemoved'),
  IndexingTotalWorkCalculated: Symbol('indexingTotalWorkCalculated'),
  IndexingWorked: Symbol('indexingWorked'),
  IndexingDone: Symbol('indexingDone'),
  KeyEventUnhandled: Symbol('keyEventUnhandled'),
  ReattachMainTarget: Symbol('reattachMainTarget'),
  ReloadInspectedPage: Symbol('reloadInspectedPage'),
  RevealSourceLine: Symbol('revealSourceLine'),
  SavedURL: Symbol('savedURL'),
  SearchCompleted: Symbol('searchCompleted'),
  SetInspectedTabId: Symbol('setInspectedTabId'),
  SetUseSoftMenu: Symbol('setUseSoftMenu'),
  ShowPanel: Symbol('showPanel')
};

export const EventDescriptors = [
  [Events.AppendedToURL, 'appendedToURL', ['url']],
  [Events.CanceledSaveURL, 'canceledSaveURL', ['url']],
  [Events.ContextMenuCleared, 'contextMenuCleared', []],
  [Events.ContextMenuItemSelected, 'contextMenuItemSelected', ['id']],
  [Events.DeviceCountUpdated, 'deviceCountUpdated', ['count']],
  [Events.DevicesDiscoveryConfigChanged, 'devicesDiscoveryConfigChanged', ['config']],
  [Events.DevicesPortForwardingStatusChanged, 'devicesPortForwardingStatusChanged', ['status']],
  [Events.DevicesUpdated, 'devicesUpdated', ['devices']],
  [Events.DispatchMessage, 'dispatchMessage', ['messageObject']],
  [Events.DispatchMessageChunk, 'dispatchMessageChunk', ['messageChunk', 'messageSize']],
  [Events.EnterInspectElementMode, 'enterInspectElementMode', []],
  [Events.EyeDropperPickedColor, 'eyeDropperPickedColor', ['color']],
  [Events.FileSystemsLoaded, 'fileSystemsLoaded', ['fileSystems']],
  [Events.FileSystemRemoved, 'fileSystemRemoved', ['fileSystemPath']],
  [Events.FileSystemAdded, 'fileSystemAdded', ['errorMessage', 'fileSystem']],
  [Events.FileSystemFilesChangedAddedRemoved, 'fileSystemFilesChangedAddedRemoved', ['changed', 'added', 'removed']],
  [Events.IndexingTotalWorkCalculated, 'indexingTotalWorkCalculated', ['requestId', 'fileSystemPath', 'totalWork']],
  [Events.IndexingWorked, 'indexingWorked', ['requestId', 'fileSystemPath', 'worked']],
  [Events.IndexingDone, 'indexingDone', ['requestId', 'fileSystemPath']],
  [Events.KeyEventUnhandled, 'keyEventUnhandled', ['event']],
  [Events.ReattachMainTarget, 'reattachMainTarget', []],
  [Events.ReloadInspectedPage, 'reloadInspectedPage', ['hard']],
  [Events.RevealSourceLine, 'revealSourceLine', ['url', 'lineNumber', 'columnNumber']],
  [Events.SavedURL, 'savedURL', ['url', 'fileSystemPath']],
  [Events.SearchCompleted, 'searchCompleted', ['requestId', 'fileSystemPath', 'files']],
  [Events.SetInspectedTabId, 'setInspectedTabId', ['tabId']],
  [Events.SetUseSoftMenu, 'setUseSoftMenu', ['useSoftMenu']],
  [Events.ShowPanel, 'showPanel', ['panelName']]
];

/** @interface */
export class InspectorFrontendHostAPI {
  /**
   * @param {string=} type
   */
  addFileSystem(type) {
  }

  loadCompleted() {
  }

  /**
   * @param {number} requestId
   * @param {string} fileSystemPath
   * @param {string} excludedFolders
   */
  indexPath(requestId, fileSystemPath, excludedFolders) {
  }

  /**
   * Requests inspected page to be placed atop of the inspector frontend with specified bounds.
   * @param {{x: number, y: number, width: number, height: number}} bounds
   */
  setInspectedPageBounds(bounds) {
  }

  /**
   * @param {!Array<string>} certChain
   */
  showCertificateViewer(certChain) {
  }

  /**
   * @param {string} shortcuts
   */
  setWhitelistedShortcuts(shortcuts) {
  }

  /**
   * @param {boolean} active
   */
  setEyeDropperActive(active) {
  }

  inspectElementCompleted() {
  }

  /**
   * @param {string} url
   */
  openInNewTab(url) {
  }

  /**
   * @param {string} fileSystemPath
   */
  showItemInFolder(fileSystemPath) {
  }

  /**
   * @param {string} fileSystemPath
   */
  removeFileSystem(fileSystemPath) {
  }

  requestFileSystems() {
  }

  /**
   * @param {string} url
   * @param {string} content
   * @param {boolean} forceSaveAs
   */
  save(url, content, forceSaveAs) {
  }

  /**
   * @param {string} url
   * @param {string} content
   */
  append(url, content) {
  }

  /**
   * @param {string} url
   */
  close(url) {
  }

  /**
   * @param {number} requestId
   * @param {string} fileSystemPath
   * @param {string} query
   */
  searchInPath(requestId, fileSystemPath, query) {
  }

  /**
   * @param {number} requestId
   */
  stopIndexing(requestId) {
  }

  bringToFront() {
  }

  closeWindow() {
  }

  /**
   * @param {?(string|undefined)} text
   */
  copyText(text) {
  }

  /**
   * @param {string} url
   */
  inspectedURLChanged(url) {
  }

  /**
   * @param {string} fileSystemId
   * @param {string} registeredName
   * @return {?FileSystem}
   */
  isolatedFileSystem(fileSystemId, registeredName) {
    throw new Error('not implemented');
  }

  /**
   * @param {string} url
   * @param {string} headers
   * @param {number} streamId
   * @param {function(!LoadNetworkResourceResult):void} callback
   */
  loadNetworkResource(url, headers, streamId, callback) {
  }

  /**
   * @param {function(!Object<string, string>):void} callback
   */
  getPreferences(callback) {
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  setPreference(name, value) {
  }

  /**
   * @param {string} name
   */
  removePreference(name) {
  }

  clearPreferences() {
  }

  /**
   * @param {!FileSystem} fileSystem
   */
  upgradeDraggedFileSystemPermissions(fileSystem) {
  }

  /**
   * @return {string}
   */
  platform() {
    throw new Error('Not implemented');
  }

  /**
   * @param {string} actionName
   * @param {number} actionCode
   * @param {number} bucketSize
   */
  recordEnumeratedHistogram(actionName, actionCode, bucketSize) {
  }

  /**
   * @param {string} histogramName
   * @param {number} duration
   */
  recordPerformanceHistogram(histogramName, duration) {
  }

  /**
   * @param {string} umaName
   */
  recordUserMetricsAction(umaName) {
  }

  /**
   * @param {string} message
   */
  sendMessageToBackend(message) {
  }

  /**
   * @param {!Adb.Config} config
   */
  setDevicesDiscoveryConfig(config) {
  }

  /**
   * @param {boolean} enabled
   */
  setDevicesUpdatesEnabled(enabled) {
  }

  /**
   * @param {string} pageId
   * @param {string} action
   */
  performActionOnRemotePage(pageId, action) {
  }

  /**
   * @param {string} browserId
   * @param {string} url
   */
  openRemotePage(browserId, url) {
  }

  openNodeFrontend() {
  }

  /**
   * @param {string} origin
   * @param {string} script
   */
  setInjectedScriptForOrigin(origin, script) {
  }

  /**
   * @param {boolean} isDocked
   * @param {function():void} callback
   */
  setIsDocked(isDocked, callback) {
  }

  /**
   * @return {number}
   */
  zoomFactor() {
    throw new Error('Not implemented');
  }

  zoomIn() {
  }

  zoomOut() {
  }

  resetZoom() {
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {!Array.<!ContextMenuDescriptor>} items
   * @param {!Document} document
   */
  showContextMenuAtPoint(x, y, items, document) {
  }

  /**
   * @param {function():void} callback
   */
  reattach(callback) {
  }

  readyForTest() {
  }

  connectionReady() {
  }

  /**
   * @param {boolean} value
   */
  setOpenNewWindowForPopups(value) {
  }

  /**
   * @return {boolean}
   */
  isHostedMode() {
    throw new Error('Not implemented');
  }

  /**
   * @param {function(!Root.Runtime.RuntimeExtensionDescriptor):void} callback
   */
  setAddExtensionCallback(callback) {
  }
}

/** @typedef
{{
    type: string,
    id: (number|undefined),
    label: (string|undefined),
    enabled: (boolean|undefined),
    checked: (boolean|undefined),
    subItems: (!Array.<!ContextMenuDescriptor>|undefined)
}} */
// @ts-ignore typedef
export let ContextMenuDescriptor;

/** @typedef
{{
    statusCode: number,
    headers: (!Object.<string, string>|undefined),
    netError: (number|undefined),
    netErrorName: (string|undefined),
    urlValid: (boolean|undefined),
    messageOverride: (string|undefined)
}} */
// @ts-ignore typedef
export let LoadNetworkResourceResult;

/** @typedef
{{
  startPage: string,
  name: string,
  exposeExperimentalAPIs: boolean
}} */
// @ts-ignore typedef
export let ExtensionDescriptor;
