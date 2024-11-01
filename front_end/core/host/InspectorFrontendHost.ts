/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
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

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
/* eslint-disable @typescript-eslint/no-unused-vars */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import {
  type AidaClientResult,
  type CanShowSurveyResult,
  type ChangeEvent,
  type ClickEvent,
  type ContextMenuDescriptor,
  type DoAidaConversationResult,
  type DragEvent,
  type EnumeratedHistogram,
  EventDescriptors,
  Events,
  type EventTypes,
  type ExtensionDescriptor,
  type HoverEvent,
  type ImpressionEvent,
  type InspectorFrontendHostAPI,
  type KeyDownEvent,
  type LoadNetworkResourceResult,
  type ResizeEvent,
  type ShowSurveyResult,
  type SyncInformation,
} from './InspectorFrontendHostAPI.js';
import {streamWrite as resourceLoaderStreamWrite} from './ResourceLoader.js';

interface DecompressionStream extends GenericTransformStream {
  readonly format: string;
}
declare const DecompressionStream: {
  prototype: DecompressionStream,
  new (format: string): DecompressionStream,
};

const UIStrings = {
  /**
   *@description Document title in Inspector Frontend Host of the DevTools window
   *@example {example.com} PH1
   */
  devtoolsS: 'DevTools - {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('core/host/InspectorFrontendHost.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const MAX_RECORDED_HISTOGRAMS_SIZE = 100;
const OVERRIDES_FILE_SYSTEM_PATH = '/overrides' as Platform.DevToolsPath.RawPathString;

/**
 * The InspectorFrontendHostStub is a stub interface used the frontend is loaded like a webpage. Examples:
 *   - devtools://devtools/bundled/devtools_app.html
 *   - https://chrome-devtools-frontend.appspot.com/serve_rev/@030cc140435b0152645522b9864b75cac6c0a854/worker_app.html
 *   - http://localhost:9222/devtools/inspector.html?ws=localhost:9222/devtools/page/xTARGET_IDx
 *
 * When the frontend runs within the native embedder, then the InspectorFrontendHostAPI methods are provided
 * by devtools_compatibility.js. Those leverage `DevToolsAPI.sendMessageToEmbedder()` which match up with
 * the embedder API defined here: https://source.chromium.org/search?q=f:devtools%20f:dispatcher%20f:cc%20symbol:CreateForDevToolsFrontend&sq=&ss=chromium%2Fchromium%2Fsrc
 * The native implementations live in devtools_ui_bindings.cc: https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/devtools/devtools_ui_bindings.cc
 */
export class InspectorFrontendHostStub implements InspectorFrontendHostAPI {
  readonly #urlsBeingSaved: Map<Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString, string[]>;
  events!: Common.EventTarget.EventTarget<EventTypes>;
  #fileSystem: FileSystem|null = null;

  recordedCountHistograms:
      {histogramName: string, sample: number, min: number, exclusiveMax: number, bucketSize: number}[] = [];
  recordedEnumeratedHistograms: {actionName: EnumeratedHistogram, actionCode: number}[] = [];
  recordedPerformanceHistograms: {histogramName: string, duration: number}[] = [];

  constructor() {
    this.#urlsBeingSaved = new Map();

    // Guard against errors should this file ever be imported at the top level
    // within a worker - in which case this constructor is run. If there's no
    // document, we can early exit.
    if (typeof document === 'undefined') {
      return;
    }

    function stopEventPropagation(this: InspectorFrontendHostAPI, event: KeyboardEvent): void {
      // Let browser handle Ctrl+/Ctrl- shortcuts in hosted mode.
      const zoomModifier = this.platform() === 'mac' ? event.metaKey : event.ctrlKey;
      if (zoomModifier && (event.key === '+' || event.key === '-')) {
        event.stopPropagation();
      }
    }

    document.addEventListener('keydown', event => {
      stopEventPropagation.call(this, (event as KeyboardEvent));
    }, true);
  }

  platform(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows NT')) {
      return 'windows';
    }
    if (userAgent.includes('Mac OS X')) {
      return 'mac';
    }
    return 'linux';
  }

  loadCompleted(): void {
  }

  bringToFront(): void {
  }

  closeWindow(): void {
  }

  setIsDocked(isDocked: boolean, callback: () => void): void {
    window.setTimeout(callback, 0);
  }

  showSurvey(trigger: string, callback: (arg0: ShowSurveyResult) => void): void {
    window.setTimeout(() => callback({surveyShown: false}), 0);
  }

  canShowSurvey(trigger: string, callback: (arg0: CanShowSurveyResult) => void): void {
    window.setTimeout(() => callback({canShowSurvey: false}), 0);
  }

  /**
   * Requests inspected page to be placed atop of the inspector frontend with specified bounds.
   */
  setInspectedPageBounds(bounds: {
    x: number,
    y: number,
    width: number,
    height: number,
  }): void {
  }

  inspectElementCompleted(): void {
  }

  setInjectedScriptForOrigin(origin: string, script: string): void {
  }

  inspectedURLChanged(url: Platform.DevToolsPath.UrlString): void {
    document.title = i18nString(UIStrings.devtoolsS, {PH1: url.replace(/^https?:\/\//, '')});
  }

  copyText(text: string|null|undefined): void {
    if (text === undefined || text === null) {
      return;
    }
    void navigator.clipboard.writeText(text);
  }

  openInNewTab(url: Platform.DevToolsPath.UrlString): void {
    window.open(url, '_blank');
  }

  openSearchResultsInNewTab(query: string): void {
    Common.Console.Console.instance().error(
        'Search is not enabled in hosted mode. Please inspect using chrome://inspect');
  }

  showItemInFolder(fileSystemPath: Platform.DevToolsPath.RawPathString): void {
    Common.Console.Console.instance().error(
        'Show item in folder is not enabled in hosted mode. Please inspect using chrome://inspect');
  }

  save(
      url: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString, content: string, forceSaveAs: boolean,
      isBase64: boolean): void {
    let buffer = this.#urlsBeingSaved.get(url);
    if (!buffer) {
      buffer = [];
      this.#urlsBeingSaved.set(url, buffer);
    }
    buffer.push(content);
    this.events.dispatchEventToListeners(Events.SavedURL, {url, fileSystemPath: url});
  }

  append(url: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString, content: string): void {
    const buffer = this.#urlsBeingSaved.get(url);
    if (buffer) {
      buffer.push(content);
      this.events.dispatchEventToListeners(Events.AppendedToURL, url);
    }
  }

  close(url: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString): void {
    const buffer = this.#urlsBeingSaved.get(url) || [];
    this.#urlsBeingSaved.delete(url);
    let fileName = '';

    if (url) {
      try {
        const trimmed = Platform.StringUtilities.trimURL(url);
        fileName = Platform.StringUtilities.removeURLFragment(trimmed);
      } catch (error) {
        // If url is not a valid URL, it is probably a filename.
        fileName = url;
      }
    }

    const link = document.createElement('a');
    link.download = fileName;
    const blob = new Blob([buffer.join('')], {type: 'text/plain'});
    const blobUrl = URL.createObjectURL(blob);
    link.href = blobUrl;
    link.click();
    URL.revokeObjectURL(blobUrl);
  }

  sendMessageToBackend(message: string): void {
  }

  recordCountHistogram(histogramName: string, sample: number, min: number, exclusiveMax: number, bucketSize: number):
      void {
    if (this.recordedCountHistograms.length >= MAX_RECORDED_HISTOGRAMS_SIZE) {
      this.recordedCountHistograms.shift();
    }
    this.recordedCountHistograms.push({histogramName, sample, min, exclusiveMax, bucketSize});
  }

  recordEnumeratedHistogram(actionName: EnumeratedHistogram, actionCode: number, bucketSize: number): void {
    if (this.recordedEnumeratedHistograms.length >= MAX_RECORDED_HISTOGRAMS_SIZE) {
      this.recordedEnumeratedHistograms.shift();
    }
    this.recordedEnumeratedHistograms.push({actionName, actionCode});
  }

  recordPerformanceHistogram(histogramName: string, duration: number): void {
    if (this.recordedPerformanceHistograms.length >= MAX_RECORDED_HISTOGRAMS_SIZE) {
      this.recordedPerformanceHistograms.shift();
    }
    this.recordedPerformanceHistograms.push({histogramName, duration});
  }

  recordUserMetricsAction(umaName: string): void {
  }

  requestFileSystems(): void {
    this.events.dispatchEventToListeners(Events.FileSystemsLoaded, []);
  }

  addFileSystem(type?: string): void {
    const onFileSystem = (fs: FileSystem): void => {
      this.#fileSystem = fs;
      const fileSystem = {
        fileSystemName: 'sandboxedRequestedFileSystem',
        fileSystemPath: OVERRIDES_FILE_SYSTEM_PATH,
        rootURL: 'filesystem:devtools://devtools/isolated/',
        type: 'overrides',
      };
      this.events.dispatchEventToListeners(Events.FileSystemAdded, {fileSystem});
    };
    window.webkitRequestFileSystem(window.TEMPORARY, 1024 * 1024, onFileSystem);
  }

  removeFileSystem(fileSystemPath: Platform.DevToolsPath.RawPathString): void {
    const removalCallback = (entries: Entry[]): void => {
      entries.forEach(entry => {
        if (entry.isDirectory) {
          (entry as DirectoryEntry).removeRecursively(() => {});
        } else if (entry.isFile) {
          entry.remove(() => {});
        }
      });
    };

    if (this.#fileSystem) {
      this.#fileSystem.root.createReader().readEntries(removalCallback);
    }

    this.#fileSystem = null;
    this.events.dispatchEventToListeners(Events.FileSystemRemoved, OVERRIDES_FILE_SYSTEM_PATH);
  }

  isolatedFileSystem(fileSystemId: string, registeredName: string): FileSystem|null {
    return this.#fileSystem;
  }

  loadNetworkResource(
      url: string, headers: string, streamId: number, callback: (arg0: LoadNetworkResourceResult) => void): void {
    // Read the first 3 bytes looking for the gzip signature in the file header
    function isGzip(ab: ArrayBuffer): boolean {
      const buf = new Uint8Array(ab);
      if (!buf || buf.length < 3) {
        return false;
      }

      // https://www.rfc-editor.org/rfc/rfc1952#page-6
      return buf[0] === 0x1F && buf[1] === 0x8B && buf[2] === 0x08;
    }
    fetch(url)
        .then(async result => {
          const resultArrayBuf = await result.arrayBuffer();
          let decoded: ReadableStream|ArrayBuffer = resultArrayBuf;
          if (isGzip(resultArrayBuf)) {
            const ds = new DecompressionStream('gzip');
            const writer = ds.writable.getWriter();
            void writer.write(resultArrayBuf);
            void writer.close();
            decoded = ds.readable;
          }
          const text = await new Response(decoded).text();
          return text;
        })
        .then(function(text) {
          resourceLoaderStreamWrite(streamId, text);
          callback({
            statusCode: 200,
            headers: undefined,
            messageOverride: undefined,
            netError: undefined,
            netErrorName: undefined,
            urlValid: undefined,
          });
        })
        .catch(function() {
          callback({
            statusCode: 404,
            headers: undefined,
            messageOverride: undefined,
            netError: undefined,
            netErrorName: undefined,
            urlValid: undefined,
          });
        });
  }

  registerPreference(name: string, options: {synced?: boolean}): void {
  }

  getPreferences(callback: (arg0: {
                   [x: string]: string,
                 }) => void): void {
    const prefs: {
      [x: string]: string,
    } = {};
    for (const name in window.localStorage) {
      prefs[name] = window.localStorage[name];
    }
    callback(prefs);
  }

  getPreference(name: string, callback: (arg0: string) => void): void {
    callback(window.localStorage[name]);
  }

  setPreference(name: string, value: string): void {
    window.localStorage[name] = value;
  }

  removePreference(name: string): void {
    delete window.localStorage[name];
  }

  clearPreferences(): void {
    window.localStorage.clear();
  }

  getSyncInformation(callback: (arg0: SyncInformation) => void): void {
    if ('getSyncInformationForTesting' in globalThis) {
      // @ts-ignore for testing
      return callback(globalThis.getSyncInformationForTesting());
    }
    callback({
      isSyncActive: false,
      arePreferencesSynced: false,
    });
  }

  getHostConfig(callback: (arg0: Root.Runtime.HostConfig) => void): void {
    const result: Root.Runtime.HostConfig = {
      aidaAvailability: {
        enabled: true,
        blockedByAge: false,
        blockedByEnterprisePolicy: false,
        blockedByGeo: false,
        disallowLogging: true,
      },
      devToolsConsoleInsights: {
        modelId: '',
        temperature: -1,
        enabled: false,
      },
      devToolsFreestyler: {
        modelId: '',
        temperature: -1,
        enabled: false,
      },
      devToolsVeLogging: {
        enabled: true,
        testing: false,
      },
      devToolsPrivacyUI: {
        enabled: false,
      },
      devToolsEnableOriginBoundCookies: {
        portBindingEnabled: false,
        schemeBindingEnabled: false,
      },
      isOffTheRecord: false,
    };
    if ('hostConfigForTesting' in globalThis) {
      const {hostConfigForTesting} = (globalThis as unknown as {hostConfigForTesting: Root.Runtime.HostConfig});
      for (const key of Object.keys(hostConfigForTesting)) {
        const mergeEntry = <K extends keyof Root.Runtime.HostConfig>(key: K): void => {
          if (typeof result[key] === 'object' && typeof hostConfigForTesting[key] === 'object') {
            // If the config is an object, merge the settings, but preferring
            // the hostConfigForTesting values over the result values.
            result[key] = {...result[key], ...hostConfigForTesting[key]};
          } else {
            // Override with the testing config if the value is present + not null/undefined.
            result[key] = hostConfigForTesting[key] ?? result[key];
          }
        };
        mergeEntry(key as keyof Root.Runtime.HostConfig);
      }
    }
    callback(result);
  }

  upgradeDraggedFileSystemPermissions(fileSystem: FileSystem): void {
  }

  indexPath(requestId: number, fileSystemPath: Platform.DevToolsPath.RawPathString, excludedFolders: string): void {
  }

  stopIndexing(requestId: number): void {
  }

  searchInPath(requestId: number, fileSystemPath: Platform.DevToolsPath.RawPathString, query: string): void {
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

  setWhitelistedShortcuts(shortcuts: string): void {
  }

  setEyeDropperActive(active: boolean): void {
  }

  showCertificateViewer(certChain: string[]): void {
  }

  reattach(callback: () => void): void {
  }

  readyForTest(): void {
  }

  connectionReady(): void {
  }

  setOpenNewWindowForPopups(value: boolean): void {
  }

  setDevicesDiscoveryConfig(config: Adb.Config): void {
  }

  setDevicesUpdatesEnabled(enabled: boolean): void {
  }

  performActionOnRemotePage(pageId: string, action: string): void {
  }

  openRemotePage(browserId: string, url: string): void {
  }

  openNodeFrontend(): void {
  }

  showContextMenuAtPoint(x: number, y: number, items: ContextMenuDescriptor[], document: Document): void {
    throw 'Soft context menu should be used';
  }

  isHostedMode(): boolean {
    return true;
  }

  setAddExtensionCallback(callback: (arg0: ExtensionDescriptor) => void): void {
    // Extensions are not supported in hosted mode.
  }

  async initialTargetId(): Promise<string|null> {
    return null;
  }

  doAidaConversation(request: string, streamId: number, callback: (result: DoAidaConversationResult) => void): void {
    callback({
      error: 'Not implemented',
    });
  }

  registerAidaClientEvent(request: string, callback: (result: AidaClientResult) => void): void {
    callback({
      error: 'Not implemented',
    });
  }

  recordImpression(event: ImpressionEvent): void {
  }
  recordResize(event: ResizeEvent): void {
  }
  recordClick(event: ClickEvent): void {
  }
  recordHover(event: HoverEvent): void {
  }
  recordDrag(event: DragEvent): void {
  }
  recordChange(event: ChangeEvent): void {
  }
  recordKeyDown(event: KeyDownEvent): void {
  }
}

// @ts-ignore Global injected by devtools-compatibility.js
// eslint-disable-next-line @typescript-eslint/naming-convention
export let InspectorFrontendHostInstance: InspectorFrontendHostStub = globalThis.InspectorFrontendHost;

class InspectorFrontendAPIImpl {
  constructor() {
    for (const descriptor of EventDescriptors) {
      // @ts-ignore Dispatcher magic
      this[descriptor[1]] = this.dispatch.bind(this, descriptor[0], descriptor[2], descriptor[3]);
    }
  }

  private dispatch(name: symbol, signature: string[], runOnceLoaded: boolean, ...params: string[]): void {
    // Single argument methods get dispatched with the param.
    if (signature.length < 2) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        InspectorFrontendHostInstance.events.dispatchEventToListeners<any>(name, params[0]);
      } catch (error) {
        console.error(error + ' ' + error.stack);
      }
      return;
    }
    const data: {
      [x: string]: string,
    } = {};
    for (let i = 0; i < signature.length; ++i) {
      data[signature[i]] = params[i];
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      InspectorFrontendHostInstance.events.dispatchEventToListeners<any>(name, data);
    } catch (error) {
      console.error(error + ' ' + error.stack);
    }
  }

  streamWrite(id: number, chunk: string): void {
    resourceLoaderStreamWrite(id, chunk);
  }
}

(function(): void {

function initializeInspectorFrontendHost(): void {
  let proto;
  if (!InspectorFrontendHostInstance) {
    // Instantiate stub for web-hosted mode if necessary.
    // @ts-ignore Global injected by devtools-compatibility.js
    globalThis.InspectorFrontendHost = InspectorFrontendHostInstance = new InspectorFrontendHostStub();
  } else {
    // Otherwise add stubs for missing methods that are declared in the interface.
    proto = InspectorFrontendHostStub.prototype;
    for (const name of Object.getOwnPropertyNames(proto)) {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // @ts-expect-error
      const stub = proto[name];
      // @ts-ignore Global injected by devtools-compatibility.js
      if (typeof stub !== 'function' || InspectorFrontendHostInstance[name]) {
        continue;
      }

      console.error(`Incompatible embedder: method Host.InspectorFrontendHost.${name} is missing. Using stub instead.`);
      // @ts-ignore Global injected by devtools-compatibility.js
      InspectorFrontendHostInstance[name] = stub;
    }
  }

  // Attach the events object.
  InspectorFrontendHostInstance.events = new Common.ObjectWrapper.ObjectWrapper();
}

// FIXME: This file is included into both apps, since the devtools_app needs the InspectorFrontendHostAPI only,
// so the host instance should not be initialized there.
initializeInspectorFrontendHost();
// @ts-ignore Global injected by devtools-compatibility.js
globalThis.InspectorFrontendAPI = new InspectorFrontendAPIImpl();
})();

export function isUnderTest(prefs?: {
  [x: string]: string,
}): boolean {
  // Integration tests rely on test queryParam.
  if (Root.Runtime.Runtime.queryParam('test')) {
    return true;
  }
  // Browser tests rely on prefs.
  if (prefs) {
    return prefs['isUnderTest'] === 'true';
  }
  return Common.Settings.Settings.hasInstance() &&
      Common.Settings.Settings.instance().createSetting('isUnderTest', false).get();
}
