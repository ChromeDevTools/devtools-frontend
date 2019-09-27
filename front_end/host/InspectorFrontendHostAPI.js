// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Host.InspectorFrontendHostAPI = {};

/** @enum {symbol} */
Host.InspectorFrontendHostAPI.Events = {
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
  ReloadInspectedPage: Symbol('reloadInspectedPage'),
  RevealSourceLine: Symbol('revealSourceLine'),
  SavedURL: Symbol('savedURL'),
  SearchCompleted: Symbol('searchCompleted'),
  SetInspectedTabId: Symbol('setInspectedTabId'),
  SetUseSoftMenu: Symbol('setUseSoftMenu'),
  ShowPanel: Symbol('showPanel')
};
