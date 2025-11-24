// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../front_end/core/common/common.js';
import type * as Host from '../front_end/core/host/host.js';

export class McpHostBindings implements Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI {
  declare events: Common.EventTarget.EventTarget<Host.InspectorFrontendHostAPI.EventTypes>;

  connectAutomaticFileSystem(): void {
  }

  disconnectAutomaticFileSystem(): void {
  }

  addFileSystem(): void {
  }

  loadCompleted(): void {
  }

  indexPath(): void {
  }

  setInspectedPageBounds(): void {
  }

  showCertificateViewer(): void {
  }

  setWhitelistedShortcuts(): void {
  }

  setEyeDropperActive(): void {
  }

  inspectElementCompleted(): void {
  }

  openInNewTab(): void {
  }

  openSearchResultsInNewTab(): void {
  }

  showItemInFolder(): void {
  }

  removeFileSystem(): void {
  }

  requestFileSystems(): void {
  }

  save(): void {
  }

  append(): void {
  }

  close(): void {
  }

  searchInPath(): void {
  }

  stopIndexing(): void {
  }

  bringToFront(): void {
  }

  closeWindow(): void {
  }

  copyText(): void {
  }

  inspectedURLChanged(): void {
  }

  isolatedFileSystem(): FileSystem|null {
    return null;
  }

  loadNetworkResource(): void {
  }

  registerPreference(): void {
  }

  getPreferences(): void {
  }

  getPreference(): void {
  }

  setPreference(): void {
  }

  removePreference(): void {
  }

  clearPreferences(): void {
  }

  getSyncInformation(): void {
  }

  getHostConfig(): void {
  }

  upgradeDraggedFileSystemPermissions(): void {
  }

  platform(): string {
    switch (process.platform) {
      case 'darwin':
        return 'mac';
      case 'win32':
        return 'windows';
      default:
        return 'linux';
    }
  }

  recordCountHistogram(): void {
  }

  recordEnumeratedHistogram(): void {
  }

  recordPerformanceHistogram(): void {
  }

  recordUserMetricsAction(): void {
  }

  recordNewBadgeUsage(): void {
  }

  sendMessageToBackend(): void {
  }

  setDevicesDiscoveryConfig(): void {
  }

  setDevicesUpdatesEnabled(): void {
  }

  openRemotePage(): void {
  }

  openNodeFrontend(): void {
  }

  setInjectedScriptForOrigin(): void {
  }

  setIsDocked(): void {
  }

  showSurvey(): void {
  }

  canShowSurvey(): void {
  }

  zoomFactor(): number {
    return 1;
  }

  zoomIn(): void {
  }

  zoomOut(): void {
  }

  resetZoom(): void {
  }

  showContextMenuAtPoint(): void {
  }

  reattach(): void {
  }

  readyForTest(): void {
  }

  connectionReady(): void {
  }

  setOpenNewWindowForPopups(): void {
  }

  isHostedMode(): boolean {
    return true;
  }

  setAddExtensionCallback(): void {
  }

  initialTargetId(): Promise<string|null> {
    return Promise.resolve(null);
  }

  doAidaConversation(
      _request: string, _streamId: number,
      cb: (result: Host.InspectorFrontendHostAPI.DoAidaConversationResult) => void): void {
    cb({
      error: 'Not implemented',
    });
  }

  registerAidaClientEvent(_request: string, cb: (result: Host.InspectorFrontendHostAPI.AidaClientResult) => void):
      void {
    cb({
      error: 'Not implemented',
    });
  }

  aidaCodeComplete(_request: string, cb: (result: Host.InspectorFrontendHostAPI.AidaCodeCompleteResult) => void): void {
    cb({
      error: 'Not implemented',
    });
  }

  dispatchHttpRequest(
      _request: Host.InspectorFrontendHostAPI.DispatchHttpRequestRequest,
      cb: (result: Host.InspectorFrontendHostAPI.DispatchHttpRequestResult) => void): void {
    cb({
      error: 'Not implemented',
    });
  }

  recordImpression(): void {
  }

  recordResize(): void {
  }

  recordClick(): void {
  }

  recordHover(): void {
  }

  recordDrag(): void {
  }

  recordChange(): void {
  }

  recordKeyDown(): void {
  }

  recordSettingAccess(): void {
  }

  recordFunctionCall(): void {
  }
}
