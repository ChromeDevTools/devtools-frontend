// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import type * as Root from '../root/root.js';

import {
  type AidaClientResult,
  type AidaCodeCompleteResult,
  type CanShowSurveyResult,
  type ChangeEvent,
  type ClickEvent,
  type ContextMenuDescriptor,
  type DispatchHttpRequestRequest,
  type DispatchHttpRequestResult,
  type DoAidaConversationResult,
  type DragEvent,
  type EnumeratedHistogram,
  Events,
  type EventTypes,
  type ExtensionDescriptor,
  type FunctionCallEvent,
  type HoverEvent,
  type ImpressionEvent,
  type InspectorFrontendHostAPI,
  type KeyDownEvent,
  type LoadNetworkResourceResult,
  type ResizeEvent,
  type SettingAccessEvent,
  type ShowSurveyResult,
  type SyncInformation,
} from './InspectorFrontendHostAPI.js';
import {streamWrite as resourceLoaderStreamWrite} from './ResourceLoader.js';

const UIStrings = {
  /**
   * @description Document title in Inspector Frontend Host of the DevTools window
   * @example {example.com} PH1
   */
  devtoolsS: 'DevTools - {PH1}',
} as const;
const str_ = i18n.i18n.registerUIStrings('core/host/InspectorFrontendHostStub.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const MAX_RECORDED_HISTOGRAMS_SIZE = 100;
const OVERRIDES_FILE_SYSTEM_PATH = '/overrides' as Platform.DevToolsPath.RawPathString;

/**
 * The `InspectorFrontendHostStub` is a stub interface used the frontend is loaded like a webpage. Examples:
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
  readonly #urlsBeingSaved = new Map<
      Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString, {isBase64: boolean, buffer: string[]}>();
  #fileSystem: FileSystem|null = null;
  /**
   * Injected bellow in both stub and normal runs via:
   * ```ts
   * InspectorFrontendHostInstance.events = new Common.ObjectWrapper.ObjectWrapper();
   * ```
   */
  declare events: Common.EventTarget.EventTarget<EventTypes>;

  recordedCountHistograms:
      Array<{histogramName: string, sample: number, min: number, exclusiveMax: number, bucketSize: number}> = [];
  recordedEnumeratedHistograms: Array<{actionName: EnumeratedHistogram, actionCode: number}> = [];
  recordedPerformanceHistograms: Array<{histogramName: string, duration: number}> = [];

  constructor() {
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
      stopEventPropagation.call(this, (event));
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

  setIsDocked(_isDocked: boolean, callback: () => void): void {
    window.setTimeout(callback, 0);
  }

  showSurvey(_trigger: string, callback: (arg0: ShowSurveyResult) => void): void {
    window.setTimeout(() => callback({surveyShown: false}), 0);
  }

  canShowSurvey(_trigger: string, callback: (arg0: CanShowSurveyResult) => void): void {
    window.setTimeout(() => callback({canShowSurvey: false}), 0);
  }

  /**
   * Requests inspected page to be placed atop of the inspector frontend with specified bounds.
   */
  setInspectedPageBounds(_bounds: {
    x: number,
    y: number,
    width: number,
    height: number,
  }): void {
  }

  inspectElementCompleted(): void {
  }

  setInjectedScriptForOrigin(_origin: string, _script: string): void {
  }

  inspectedURLChanged(url: Platform.DevToolsPath.UrlString): void {
    if (!('document' in globalThis)) {
      return;
    }
    document.title = i18nString(UIStrings.devtoolsS, {PH1: url.replace(/^https?:\/\//, '')});
  }

  copyText(text: string|null|undefined): void {
    if (text === undefined || text === null) {
      return;
    }
    void navigator.clipboard.writeText(text);
  }

  openInNewTab(url: Platform.DevToolsPath.UrlString): void {
    if (Common.ParsedURL.schemeIs(url, 'javascript:')) {
      return;
    }
    window.open(url, '_blank');
  }

  openSearchResultsInNewTab(_query: string): void {
    Common.Console.Console.instance().error(
        'Search is not enabled in hosted mode. Please inspect using chrome://inspect');
  }

  showItemInFolder(_fileSystemPath: Platform.DevToolsPath.RawPathString): void {
    Common.Console.Console.instance().error(
        'Show item in folder is not enabled in hosted mode. Please inspect using chrome://inspect');
  }

  // Reminder: the methods in this class belong to InspectorFrontendHostStub and are typically not executed.
  // InspectorFrontendHostStub is ONLY used in the uncommon case of devtools not being embedded. For example: trace.cafe or http://localhost:9222/devtools/inspector.html?ws=localhost:9222/devtools/page/xTARGET_IDx
  save(
      url: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString, content: string, _forceSaveAs: boolean,
      isBase64: boolean): void {
    let buffer = this.#urlsBeingSaved.get(url)?.buffer;
    if (!buffer) {
      buffer = [];
      this.#urlsBeingSaved.set(url, {isBase64, buffer});
    }
    buffer.push(content);
    this.events.dispatchEventToListeners(Events.SavedURL, {url, fileSystemPath: url});
  }

  append(url: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString, content: string): void {
    const buffer = this.#urlsBeingSaved.get(url)?.buffer;
    if (buffer) {
      buffer.push(content);
      this.events.dispatchEventToListeners(Events.AppendedToURL, url);
    }
  }

  close(url: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString): void {
    const {isBase64, buffer} = this.#urlsBeingSaved.get(url) || {isBase64: false, buffer: []};
    this.#urlsBeingSaved.delete(url);
    let fileName = '';

    if (url) {
      try {
        const trimmed = Platform.StringUtilities.trimURL(url);
        fileName = Platform.StringUtilities.removeURLFragment(trimmed);
      } catch {
        // If url is not a valid URL, it is probably a filename.
        fileName = url;
      }
    }

    /* eslint-disable-next-line @devtools/no-imperative-dom-api */
    const link = document.createElement('a');
    link.download = fileName;
    let blob;
    if (isBase64) {
      const bytes = Common.Base64.decode(buffer.join(''));
      blob = new Blob([bytes], {type: 'application/gzip'});
    } else {
      blob = new Blob(buffer, {type: 'text/plain'});
    }
    const blobUrl = URL.createObjectURL(blob);
    link.href = blobUrl;
    link.click();
    URL.revokeObjectURL(blobUrl);
  }

  sendMessageToBackend(_message: string): void {
  }

  recordCountHistogram(histogramName: string, sample: number, min: number, exclusiveMax: number, bucketSize: number):
      void {
    if (this.recordedCountHistograms.length >= MAX_RECORDED_HISTOGRAMS_SIZE) {
      this.recordedCountHistograms.shift();
    }
    this.recordedCountHistograms.push({histogramName, sample, min, exclusiveMax, bucketSize});
  }

  recordEnumeratedHistogram(actionName: EnumeratedHistogram, actionCode: number, _bucketSize: number): void {
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

  recordUserMetricsAction(_umaName: string): void {
  }

  recordNewBadgeUsage(_featureName: string): void {
  }

  connectAutomaticFileSystem(
      _fileSystemPath: Platform.DevToolsPath.RawPathString,
      _fileSystemUUID: string,
      _addIfMissing: boolean,
      callback: (result: {success: boolean}) => void,
      ): void {
    queueMicrotask(() => callback({success: false}));
  }

  disconnectAutomaticFileSystem(_fileSystemPath: Platform.DevToolsPath.RawPathString): void {
  }

  requestFileSystems(): void {
    this.events.dispatchEventToListeners(Events.FileSystemsLoaded, []);
  }

  addFileSystem(_type?: string): void {
    const onFileSystem = (fs: FileSystem): void => {
      this.#fileSystem = fs;
      const fileSystem = {
        fileSystemName: 'sandboxedRequestedFileSystem',
        fileSystemPath: OVERRIDES_FILE_SYSTEM_PATH,
        rootURL: 'filesystem:devtools://devtools/isolated/',
        type: 'overrides' as const,
      };
      this.events.dispatchEventToListeners(Events.FileSystemAdded, {fileSystem});
    };
    window.webkitRequestFileSystem(window.TEMPORARY, 1024 * 1024, onFileSystem);
  }

  removeFileSystem(_fileSystemPath: Platform.DevToolsPath.RawPathString): void {
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

  isolatedFileSystem(_fileSystemId: string, _registeredName: string): FileSystem|null {
    return this.#fileSystem;
  }

  loadNetworkResource(
      url: string, _headers: string, streamId: number, callback: (arg0: LoadNetworkResourceResult) => void): void {
    fetch(url)
        .then(async result => {
          const respBuffer = await result.arrayBuffer();
          const text = await Common.Gzip.arrayBufferToString(respBuffer);
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

  registerPreference(_name: string, _options: {synced?: boolean}): void {
  }

  getPreferences(callback: (arg0: Record<string, string>) => void): void {
    const prefs: Record<string, string> = {};
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
      // @ts-expect-error for testing
      return callback(globalThis.getSyncInformationForTesting());
    }
    callback({
      isSyncActive: false,
      arePreferencesSynced: false,
    });
  }

  getHostConfig(callback: (hostConfig: Root.Runtime.HostConfig) => void): void {
    // This HostConfig config is used in the hosted mode (see the
    // comment on top of this class). Only add non-default config params
    // here that you want to also apply in the hosted mode. For tests
    // use the hostConfigForTesting override.
    const hostConfigForHostedMode: Root.Runtime.HostConfig = {
      devToolsVeLogging: {
        enabled: true,
      },
      thirdPartyCookieControls: {
        thirdPartyCookieMetadataEnabled: true,
        thirdPartyCookieHeuristicsEnabled: true,
        managedBlockThirdPartyCookies: 'Unset',
      },
      devToolsFlexibleLayout: {
        verticalDrawerEnabled: true,
      },
    };
    if ('hostConfigForTesting' in globalThis) {
      const {hostConfigForTesting} = (globalThis as unknown as {hostConfigForTesting: Root.Runtime.HostConfig});
      for (const key of Object.keys(hostConfigForTesting)) {
        const mergeEntry = <K extends keyof Root.Runtime.HostConfig>(key: K): void => {
          if (typeof hostConfigForHostedMode[key] === 'object' && typeof hostConfigForTesting[key] === 'object') {
            // If the config is an object, merge the settings, but preferring
            // the hostConfigForTesting values over the result values.
            hostConfigForHostedMode[key] = {...hostConfigForHostedMode[key], ...hostConfigForTesting[key]};
          } else {
            // Override with the testing config if the value is present + not null/undefined.
            hostConfigForHostedMode[key] = hostConfigForTesting[key] ?? hostConfigForHostedMode[key];
          }
        };
        mergeEntry(key as keyof Root.Runtime.HostConfig);
      }
    }
    callback(hostConfigForHostedMode);
  }

  upgradeDraggedFileSystemPermissions(_fileSystem: FileSystem): void {
  }

  indexPath(_requestId: number, _fileSystemPath: Platform.DevToolsPath.RawPathString, _excludedFolders: string): void {
  }

  stopIndexing(_requestId: number): void {
  }

  searchInPath(_requestId: number, _fileSystemPath: Platform.DevToolsPath.RawPathString, _query: string): void {
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

  setWhitelistedShortcuts(_shortcuts: string): void {
  }

  setEyeDropperActive(_active: boolean): void {
  }

  showCertificateViewer(_certChain: string[]): void {
  }

  reattach(_callback: () => void): void {
  }

  readyForTest(): void {
  }

  connectionReady(): void {
  }

  setOpenNewWindowForPopups(_value: boolean): void {
  }

  setDevicesDiscoveryConfig(_config: Adb.Config): void {
  }

  setDevicesUpdatesEnabled(_enabled: boolean): void {
  }

  openRemotePage(_browserId: string, _url: string): void {
  }

  openNodeFrontend(): void {
  }

  showContextMenuAtPoint(_x: number, _y: number, _items: ContextMenuDescriptor[], _document: Document): void {
    throw new Error('Soft context menu should be used');
  }

  /**
   * Think of **Hosted mode** as "non-embedded" mode; you can see a devtools frontend URL as the tab's URL. It's an atypical way that DevTools is run.
   * Whereas in **Non-hosted** (aka "embedded"), DevTools is embedded and fully dockable. It's the common way DevTools is run.
   *
   * **Hosted mode** == we're using the `InspectorFrontendHostStub`. impl. (@see `InspectorFrontendHostStub` class comment)
   * Whereas with **non-hosted** mode, native `DevToolsEmbedderMessageDispatcher` is used for CDP and more.  `globalThis.DevToolsAPI` is present.
   *
   * Relationships to other signals:
   * - _Connection_: Hosted-ness does not indicate whether the frontend is _connected to a valid CDP target_.
   * - _Dockability_: Being _"dockable"_ (aka `canDock`) is typically aligned but technically orthogonal.
   * - _URL scheme_: If the main frame's URL scheme is `devtools://`, it's non-hosted.
   *
   *  | Example case                                | Mode           | Example devtools                                                              |
   *  | :------------------------------------------ | :------------- | :---------------------------------------------------------------------------- |
   *  | tab URL: `devtools://…`                     | **NOT Hosted** | `devtools://devtools/bundled/devtools_app.html?targetType=tab&...`            |
   *  | tab URL: `devtools://…?ws=…`                | **NOT Hosted** | `devtools://devtools/bundled/devtools_app.html?ws=localhost:9228/...`         |
   *  | tab URL: `devtools://…` but no connection   | **NOT Hosted** | `devtools://devtools/bundled/trace_app.html`                                  |
   *  | tab URL: `https://…` but no connection      | **Hosted**     | `https://chrome-devtools-frontend.appspot.com/serve_rev/@.../trace_app.html`  |
   *  | tab URL: `http://…?ws=` (connected)         | **Hosted**     | `http://localhost:9222/devtools/inspector.html?ws=localhost:9222/...`         |
   */
  isHostedMode(): boolean {
    return true;
  }

  setAddExtensionCallback(_callback: (arg0: ExtensionDescriptor) => void): void {
    // Extensions are not supported in hosted mode.
  }

  async initialTargetId(): Promise<string|null> {
    return null;
  }

  doAidaConversation(_request: string, _streamId: number, callback: (result: DoAidaConversationResult) => void): void {
    callback({
      error: 'Not implemented',
    });
  }

  registerAidaClientEvent(_request: string, callback: (result: AidaClientResult) => void): void {
    callback({
      error: 'Not implemented',
    });
  }

  aidaCodeComplete(_request: string, callback: (result: AidaCodeCompleteResult) => void): void {
    callback({
      error: 'Not implemented',
    });
  }

  dispatchHttpRequest(_request: DispatchHttpRequestRequest, callback: (result: DispatchHttpRequestResult) => void):
      void {
    callback({error: 'Not implemented'});
  }

  recordImpression(_event: ImpressionEvent): void {
  }
  recordResize(_event: ResizeEvent): void {
  }
  recordClick(_event: ClickEvent): void {
  }
  recordHover(_event: HoverEvent): void {
  }
  recordDrag(_event: DragEvent): void {
  }
  recordChange(_event: ChangeEvent): void {
  }
  recordKeyDown(_event: KeyDownEvent): void {
  }
  recordSettingAccess(_event: SettingAccessEvent): void {
  }
  recordFunctionCall(_event: FunctionCallEvent): void {
  }
}
