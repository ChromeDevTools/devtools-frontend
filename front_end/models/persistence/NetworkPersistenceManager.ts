// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Workspace from '../workspace/workspace.js';

import type {FileSystem} from './FileSystemWorkspaceBinding.js';
import {FileSystemWorkspaceBinding} from './FileSystemWorkspaceBinding.js';
import {PersistenceBinding, PersistenceImpl} from './PersistenceImpl.js';

let networkPersistenceManagerInstance: NetworkPersistenceManager|null;

export class NetworkPersistenceManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDK.TargetManager.Observer {
  private bindings: WeakMap<Workspace.UISourceCode.UISourceCode, PersistenceBinding>;
  private readonly originalResponseContentPromises: WeakMap<Workspace.UISourceCode.UISourceCode, Promise<string|null>>;
  private savingForOverrides: WeakSet<Workspace.UISourceCode.UISourceCode>;
  private readonly savingSymbol: symbol;
  private enabledSetting: Common.Settings.Setting<boolean>;
  private readonly workspace: Workspace.Workspace.WorkspaceImpl;
  private readonly networkUISourceCodeForEncodedPath: Map<string, Workspace.UISourceCode.UISourceCode>;
  private readonly interceptionHandlerBound:
      (interceptedRequest: SDK.NetworkManager.InterceptedRequest) => Promise<void>;
  private readonly updateInterceptionThrottler: Common.Throttler.Throttler;
  private projectInternal: Workspace.Workspace.Project|null;
  private readonly activeProject: Workspace.Workspace.Project|null;
  private activeInternal: boolean;
  private enabled: boolean;
  private eventDescriptors: Common.EventTarget.EventDescriptor[];
  #headerOverridesMap: Map<string, HeaderOverrideWithRegex[]> = new Map();

  private constructor(workspace: Workspace.Workspace.WorkspaceImpl) {
    super();
    this.bindings = new WeakMap();
    this.originalResponseContentPromises = new WeakMap();
    this.savingForOverrides = new WeakSet();
    this.savingSymbol = Symbol('SavingForOverrides');

    this.enabledSetting = Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled');
    this.enabledSetting.addChangeListener(this.enabledChanged, this);

    this.workspace = workspace;

    this.networkUISourceCodeForEncodedPath = new Map();
    this.interceptionHandlerBound = this.interceptionHandler.bind(this);
    this.updateInterceptionThrottler = new Common.Throttler.Throttler(50);

    this.projectInternal = null;
    this.activeProject = null;

    this.activeInternal = false;
    this.enabled = false;

    this.workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded, event => {
      void this.onProjectAdded(event.data);
    });
    this.workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, event => {
      void this.onProjectRemoved(event.data);
    });

    PersistenceImpl.instance().addNetworkInterceptor(this.canHandleNetworkUISourceCode.bind(this));

    this.eventDescriptors = [];
    void this.enabledChanged();

    SDK.TargetManager.TargetManager.instance().observeTargets(this);
  }

  targetAdded(): void {
    void this.updateActiveProject();
  }
  targetRemoved(): void {
    void this.updateActiveProject();
  }

  static instance(opts: {
    forceNew: boolean|null,
    workspace: Workspace.Workspace.WorkspaceImpl|null,
  } = {forceNew: null, workspace: null}): NetworkPersistenceManager {
    const {forceNew, workspace} = opts;
    if (!networkPersistenceManagerInstance || forceNew) {
      if (!workspace) {
        throw new Error('Missing workspace for NetworkPersistenceManager');
      }
      networkPersistenceManagerInstance = new NetworkPersistenceManager(workspace);
    }

    return networkPersistenceManagerInstance;
  }

  active(): boolean {
    return this.activeInternal;
  }

  project(): Workspace.Workspace.Project|null {
    return this.projectInternal;
  }

  originalContentForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<string|null>|null {
    const binding = this.bindings.get(uiSourceCode);
    if (!binding) {
      return null;
    }
    const fileSystemUISourceCode = binding.fileSystem;
    return this.originalResponseContentPromises.get(fileSystemUISourceCode) || null;
  }

  private async enabledChanged(): Promise<void> {
    if (this.enabled === this.enabledSetting.get()) {
      return;
    }
    this.enabled = this.enabledSetting.get();
    if (this.enabled) {
      this.eventDescriptors = [
        Workspace.Workspace.WorkspaceImpl.instance().addEventListener(
            Workspace.Workspace.Events.UISourceCodeRenamed,
            event => {
              void this.uiSourceCodeRenamedListener(event);
            }),
        Workspace.Workspace.WorkspaceImpl.instance().addEventListener(
            Workspace.Workspace.Events.UISourceCodeAdded,
            event => {
              void this.uiSourceCodeAdded(event);
            }),
        Workspace.Workspace.WorkspaceImpl.instance().addEventListener(
            Workspace.Workspace.Events.UISourceCodeRemoved,
            event => {
              void this.uiSourceCodeRemovedListener(event);
            }),
        Workspace.Workspace.WorkspaceImpl.instance().addEventListener(
            Workspace.Workspace.Events.WorkingCopyCommitted,
            event => this.onUISourceCodeWorkingCopyCommitted(event.data.uiSourceCode)),
      ];
      await this.updateActiveProject();
    } else {
      Common.EventTarget.removeEventListeners(this.eventDescriptors);
      await this.updateActiveProject();
    }
  }

  private async uiSourceCodeRenamedListener(
      event: Common.EventTarget.EventTargetEvent<Workspace.Workspace.UISourceCodeRenamedEvent>): Promise<void> {
    const uiSourceCode = event.data.uiSourceCode;
    await this.onUISourceCodeRemoved(uiSourceCode);
    await this.onUISourceCodeAdded(uiSourceCode);
  }

  private async uiSourceCodeRemovedListener(
      event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): Promise<void> {
    await this.onUISourceCodeRemoved(event.data);
  }

  private async uiSourceCodeAdded(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>):
      Promise<void> {
    await this.onUISourceCodeAdded(event.data);
  }

  private async updateActiveProject(): Promise<void> {
    const wasActive = this.activeInternal;
    this.activeInternal = Boolean(
        this.enabledSetting.get() && SDK.TargetManager.TargetManager.instance().mainTarget() && this.projectInternal);
    if (this.activeInternal === wasActive) {
      return;
    }

    if (this.activeInternal && this.projectInternal) {
      await Promise.all(
          this.projectInternal.uiSourceCodes().map(uiSourceCode => this.filesystemUISourceCodeAdded(uiSourceCode)));

      const networkProjects = this.workspace.projectsForType(Workspace.Workspace.projectTypes.Network);
      for (const networkProject of networkProjects) {
        await Promise.all(
            networkProject.uiSourceCodes().map(uiSourceCode => this.networkUISourceCodeAdded(uiSourceCode)));
      }
    } else if (this.projectInternal) {
      await Promise.all(
          this.projectInternal.uiSourceCodes().map(uiSourceCode => this.filesystemUISourceCodeRemoved(uiSourceCode)));
      this.networkUISourceCodeForEncodedPath.clear();
    }
    PersistenceImpl.instance().refreshAutomapping();
  }

  private encodedPathFromUrl(url: string): string {
    if (!this.activeInternal || !this.projectInternal) {
      return '';
    }
    let urlPath = Common.ParsedURL.ParsedURL.urlWithoutHash(url.replace(/^https?:\/\//, ''));
    if (urlPath.endsWith('/') && urlPath.indexOf('?') === -1) {
      urlPath = urlPath + 'index.html';
    }
    let encodedPathParts = encodeUrlPathToLocalPathParts(urlPath);
    const projectPath = FileSystemWorkspaceBinding.fileSystemPath(this.projectInternal.id());
    const encodedPath = encodedPathParts.join('/');
    if (projectPath.length + encodedPath.length > 200) {
      const domain = encodedPathParts[0];
      const encodedFileName = encodedPathParts[encodedPathParts.length - 1];
      const shortFileName = encodedFileName ? encodedFileName.substr(0, 10) + '-' : '';
      const extension = Common.ParsedURL.ParsedURL.extractExtension(urlPath);
      const extensionPart = extension ? '.' + extension.substr(0, 10) : '';
      encodedPathParts = [
        domain,
        'longurls',
        shortFileName + Platform.StringUtilities.hashCode(encodedPath).toString(16) + extensionPart,
      ];
    }
    return encodedPathParts.join('/');

    function encodeUrlPathToLocalPathParts(urlPath: string): string[] {
      const encodedParts = [];
      for (const pathPart of fileNamePartsFromUrlPath(urlPath)) {
        if (!pathPart) {
          continue;
        }
        // encodeURI() escapes all the unsafe filename characters except /:?*
        let encodedName = encodeURI(pathPart).replace(/[\/:\?\*]/g, match => '%' + match[0].charCodeAt(0).toString(16));
        // Windows does not allow a small set of filenames.
        if (RESERVED_FILENAMES.has(encodedName.toLowerCase())) {
          encodedName = encodedName.split('').map(char => '%' + char.charCodeAt(0).toString(16)).join('');
        }
        // Windows does not allow the file to end in a space or dot (space should already be encoded).
        const lastChar = encodedName.charAt(encodedName.length - 1);
        if (lastChar === '.') {
          encodedName = encodedName.substr(0, encodedName.length - 1) + '%2e';
        }
        encodedParts.push(encodedName);
      }
      return encodedParts;
    }

    function fileNamePartsFromUrlPath(urlPath: string): string[] {
      urlPath = Common.ParsedURL.ParsedURL.urlWithoutHash(urlPath);
      const queryIndex = urlPath.indexOf('?');
      if (queryIndex === -1) {
        return urlPath.split('/');
      }
      if (queryIndex === 0) {
        return [urlPath];
      }
      const endSection = urlPath.substr(queryIndex);
      const parts = urlPath.substr(0, urlPath.length - endSection.length).split('/');
      parts[parts.length - 1] += endSection;
      return parts;
    }
  }

  private fileUrlFromNetworkUrl(url: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString {
    return (this.projectInternal as FileSystem).fileSystemPath() + '/' + this.encodedPathFromUrl(url) as
        Platform.DevToolsPath.UrlString;
  }

  private decodeLocalPathToUrlPath(path: string): string {
    try {
      return unescape(path);
    } catch (e) {
      console.error(e);
    }
    return path;
  }

  private async unbind(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    const binding = this.bindings.get(uiSourceCode);
    if (binding) {
      this.bindings.delete(binding.network);
      this.bindings.delete(binding.fileSystem);
      await PersistenceImpl.instance().removeBinding(binding);
    }
  }

  private async bind(
      networkUISourceCode: Workspace.UISourceCode.UISourceCode,
      fileSystemUISourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (this.bindings.has(networkUISourceCode)) {
      await this.unbind(networkUISourceCode);
    }
    if (this.bindings.has(fileSystemUISourceCode)) {
      await this.unbind(fileSystemUISourceCode);
    }
    const binding = new PersistenceBinding(networkUISourceCode, fileSystemUISourceCode);
    this.bindings.set(networkUISourceCode, binding);
    this.bindings.set(fileSystemUISourceCode, binding);
    await PersistenceImpl.instance().addBinding(binding);
    const uiSourceCodeOfTruth =
        this.savingForOverrides.has(networkUISourceCode) ? networkUISourceCode : fileSystemUISourceCode;
    const [{content}, encoded] =
        await Promise.all([uiSourceCodeOfTruth.requestContent(), uiSourceCodeOfTruth.contentEncoded()]);
    PersistenceImpl.instance().syncContent(uiSourceCodeOfTruth, content || '', encoded);
  }

  private onUISourceCodeWorkingCopyCommitted(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    void this.saveUISourceCodeForOverrides(uiSourceCode);
  }

  canSaveUISourceCodeForOverrides(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return this.activeInternal && uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network &&
        !this.bindings.has(uiSourceCode) && !this.savingForOverrides.has(uiSourceCode);
  }

  async saveUISourceCodeForOverrides(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (!this.canSaveUISourceCodeForOverrides(uiSourceCode)) {
      return;
    }
    this.savingForOverrides.add(uiSourceCode);
    let encodedPath = this.encodedPathFromUrl(uiSourceCode.url());
    const content = (await uiSourceCode.requestContent()).content || '';
    const encoded = await uiSourceCode.contentEncoded();
    const lastIndexOfSlash = encodedPath.lastIndexOf('/');
    const encodedFileName = encodedPath.substr(lastIndexOfSlash + 1);
    encodedPath = encodedPath.substr(0, lastIndexOfSlash);
    if (this.projectInternal) {
      await this.projectInternal.createFile(encodedPath, encodedFileName, content, encoded);
    }
    this.fileCreatedForTest(encodedPath, encodedFileName);
    this.savingForOverrides.delete(uiSourceCode);
  }

  private fileCreatedForTest(_path: string, _fileName: string): void {
  }

  private patternForFileSystemUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    const relativePathParts = FileSystemWorkspaceBinding.relativePath(uiSourceCode);
    if (relativePathParts.length < 2) {
      return '';
    }
    if (relativePathParts[1] === 'longurls' && relativePathParts.length !== 2) {
      return 'http?://' + relativePathParts[0] + '/*';
    }
    return 'http?://' + this.decodeLocalPathToUrlPath(relativePathParts.join('/'));
  }

  private async onUISourceCodeAdded(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    await this.networkUISourceCodeAdded(uiSourceCode);
    await this.filesystemUISourceCodeAdded(uiSourceCode);
  }

  private canHandleNetworkUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return this.activeInternal && !uiSourceCode.url().startsWith('snippet://');
  }

  private async networkUISourceCodeAdded(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.Network ||
        !this.canHandleNetworkUISourceCode(uiSourceCode)) {
      return;
    }
    const url = Common.ParsedURL.ParsedURL.urlWithoutHash(uiSourceCode.url()) as Platform.DevToolsPath.UrlString;
    this.networkUISourceCodeForEncodedPath.set(this.encodedPathFromUrl(url), uiSourceCode);

    const project = this.projectInternal as FileSystem;
    const fileSystemUISourceCode = project.uiSourceCodeForURL(this.fileUrlFromNetworkUrl(url));
    if (fileSystemUISourceCode) {
      await this.bind(uiSourceCode, fileSystemUISourceCode);
    }
  }

  private async filesystemUISourceCodeAdded(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (!this.activeInternal || uiSourceCode.project() !== this.projectInternal) {
      return;
    }
    this.updateInterceptionPatterns();

    const relativePath = FileSystemWorkspaceBinding.relativePath(uiSourceCode);
    const networkUISourceCode = this.networkUISourceCodeForEncodedPath.get(relativePath.join('/'));
    if (networkUISourceCode) {
      await this.bind(networkUISourceCode, uiSourceCode);
    }
  }

  async generateHeaderPatterns(uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Promise<{headerPatterns: Set<string>, path: string, overridesWithRegex: HeaderOverrideWithRegex[]}> {
    const headerPatterns = new Set<string>();
    const content = (await uiSourceCode.requestContent()).content || '';
    let headerOverrides: HeaderOverride[] = [];
    try {
      headerOverrides = JSON.parse(content) as HeaderOverride[];
      if (!headerOverrides.every(isHeaderOverride)) {
        throw 'Type mismatch after parsing';
      }
    } catch (e) {
      console.error('Failed to parse', uiSourceCode.url(), 'for locally overriding headers.');
      return {headerPatterns, path: '', overridesWithRegex: []};
    }
    const relativePath = FileSystemWorkspaceBinding.relativePath(uiSourceCode).join('/');
    const decodedPath = this.decodeLocalPathToUrlPath(relativePath).slice(0, -HEADERS_FILENAME.length);

    const overridesWithRegex: HeaderOverrideWithRegex[] = [];
    for (const headerOverride of headerOverrides) {
      headerPatterns.add('http?://' + decodedPath + headerOverride.applyTo);

      // Most servers have the concept of a "directory index", which is a
      // default resource name for a request targeting a "directory", e. g.
      // requesting "example.com/path/" would result in the same response as
      // requesting "example.com/path/index.html". To match this behavior we
      // generate an additional pattern without "index.html" as the longer
      // pattern would not match against a shorter request.
      const {head, tail} = extractDirectoryIndex(headerOverride.applyTo);
      if (tail) {
        headerPatterns.add('http?://' + decodedPath + head);

        const pattern = escapeRegex(decodedPath + head) + '(' + escapeRegex(tail) + ')?';
        const regex = new RegExp('^https?:\/\/' + pattern + '$');
        overridesWithRegex.push({
          applyToRegex: regex,
          headers: headerOverride.headers,
        });
      } else {
        const regex = new RegExp('^https?:\/\/' + escapeRegex(decodedPath + headerOverride.applyTo) + '$');
        overridesWithRegex.push({
          applyToRegex: regex,
          headers: headerOverride.headers,
        });
      }
    }
    return {headerPatterns, path: decodedPath, overridesWithRegex};
  }

  async updateInterceptionPatternsForTests(): Promise<void> {
    await this.#innerUpdateInterceptionPatterns();
  }

  private updateInterceptionPatterns(): void {
    void this.updateInterceptionThrottler.schedule(this.#innerUpdateInterceptionPatterns.bind(this));
  }

  async #innerUpdateInterceptionPatterns(): Promise<void> {
    this.#headerOverridesMap.clear();
    if (!this.activeInternal || !this.projectInternal) {
      return SDK.NetworkManager.MultitargetNetworkManager.instance().setInterceptionHandlerForPatterns(
          [], this.interceptionHandlerBound);
    }
    let patterns = new Set<string>();
    for (const uiSourceCode of this.projectInternal.uiSourceCodes()) {
      const pattern = this.patternForFileSystemUISourceCode(uiSourceCode);
      if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.HEADER_OVERRIDES) &&
          uiSourceCode.name() === HEADERS_FILENAME) {
        const {headerPatterns, path, overridesWithRegex} = await this.generateHeaderPatterns(uiSourceCode);
        if (headerPatterns.size > 0) {
          patterns = new Set([...patterns, ...headerPatterns]);
          this.#headerOverridesMap.set(path, overridesWithRegex);
        }
      } else {
        patterns.add(pattern);
      }
      // Most servers have the concept of a "directory index", which is a
      // default resource name for a request targeting a "directory", e. g.
      // requesting "example.com/path/" would result in the same response as
      // requesting "example.com/path/index.html". To match this behavior we
      // generate an additional pattern without "index.html" as the longer
      // pattern would not match against a shorter request.
      const {head, tail} = extractDirectoryIndex(pattern);
      if (tail) {
        patterns.add(head);
      }
    }

    return SDK.NetworkManager.MultitargetNetworkManager.instance().setInterceptionHandlerForPatterns(
        Array.from(patterns).map(
            pattern => ({urlPattern: pattern, requestStage: Protocol.Fetch.RequestStage.Response})),
        this.interceptionHandlerBound);
  }

  private async onUISourceCodeRemoved(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    await this.networkUISourceCodeRemoved(uiSourceCode);
    await this.filesystemUISourceCodeRemoved(uiSourceCode);
  }

  private async networkUISourceCodeRemoved(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network) {
      await this.unbind(uiSourceCode);
      this.networkUISourceCodeForEncodedPath.delete(this.encodedPathFromUrl(uiSourceCode.url()));
    }
  }

  private async filesystemUISourceCodeRemoved(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (uiSourceCode.project() !== this.projectInternal) {
      return;
    }
    this.updateInterceptionPatterns();
    this.originalResponseContentPromises.delete(uiSourceCode);
    await this.unbind(uiSourceCode);
  }

  async setProject(project: Workspace.Workspace.Project|null): Promise<void> {
    if (project === this.projectInternal) {
      return;
    }

    if (this.projectInternal) {
      await Promise.all(
          this.projectInternal.uiSourceCodes().map(uiSourceCode => this.filesystemUISourceCodeRemoved(uiSourceCode)));
    }

    this.projectInternal = project;

    if (this.projectInternal) {
      await Promise.all(
          this.projectInternal.uiSourceCodes().map(uiSourceCode => this.filesystemUISourceCodeAdded(uiSourceCode)));
    }

    await this.updateActiveProject();
    this.dispatchEventToListeners(Events.ProjectChanged, this.projectInternal);
  }

  private async onProjectAdded(project: Workspace.Workspace.Project): Promise<void> {
    if (project.type() !== Workspace.Workspace.projectTypes.FileSystem ||
        FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides') {
      return;
    }
    const fileSystemPath = FileSystemWorkspaceBinding.fileSystemPath(project.id());
    if (!fileSystemPath) {
      return;
    }
    if (this.projectInternal) {
      this.projectInternal.remove();
    }

    await this.setProject(project);
  }

  private async onProjectRemoved(project: Workspace.Workspace.Project): Promise<void> {
    if (project === this.projectInternal) {
      await this.setProject(null);
    }
  }

  mergeHeaders(baseHeaders: Protocol.Fetch.HeaderEntry[], overrideHeaders: Protocol.Network.Headers):
      Protocol.Fetch.HeaderEntry[] {
    const result: Protocol.Fetch.HeaderEntry[] = [];
    const headerMap = new Map<string, string>();
    for (const header of baseHeaders) {
      headerMap.set(header.name, header.value);
    }
    for (const [headerName, headerValue] of Object.entries(overrideHeaders)) {
      headerMap.set(headerName, headerValue);
    }
    headerMap.forEach((headerValue, headerName) => {
      result.push({name: headerName, value: headerValue});
    });
    return result;
  }

  #maybeMergeHeadersForPathSegment(path: string, requestUrl: string, headers: Protocol.Fetch.HeaderEntry[]):
      Protocol.Fetch.HeaderEntry[] {
    const headerOverrides = this.#headerOverridesMap.get(path) || [];
    for (const headerOverride of headerOverrides) {
      if (headerOverride.applyToRegex.test(requestUrl)) {
        headers = this.mergeHeaders(headers, headerOverride.headers);
      }
    }
    return headers;
  }

  handleHeaderInterception(interceptedRequest: SDK.NetworkManager.InterceptedRequest): Protocol.Fetch.HeaderEntry[] {
    let result: Protocol.Fetch.HeaderEntry[] = interceptedRequest.responseHeaders || [];
    const urlSegments = this.encodedPathFromUrl(interceptedRequest.request.url).split('/');
    // Traverse the hierarchy of overrides from the most general to the most
    // specific. Check with empty string first to match overrides applying to
    // all domains.
    // e.g. '', 'www.example.com/', 'www.example.com/path/', ...
    let path = '';
    result = this.#maybeMergeHeadersForPathSegment(path, interceptedRequest.request.url, result);
    for (const segment of urlSegments) {
      path += segment + '/';
      result = this.#maybeMergeHeadersForPathSegment(path, interceptedRequest.request.url, result);
    }
    return result;
  }

  private async interceptionHandler(interceptedRequest: SDK.NetworkManager.InterceptedRequest): Promise<void> {
    const method = interceptedRequest.request.method;
    if (!this.activeInternal || (method !== 'GET' && method !== 'POST')) {
      return;
    }
    const proj = this.projectInternal as FileSystem;
    const path = this.fileUrlFromNetworkUrl(interceptedRequest.request.url as Platform.DevToolsPath.UrlString);
    const fileSystemUISourceCode = proj.uiSourceCodeForURL(path);
    let responseHeaders: Protocol.Fetch.HeaderEntry[] = [];
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.HEADER_OVERRIDES)) {
      responseHeaders = this.handleHeaderInterception(interceptedRequest);
    }
    if (!fileSystemUISourceCode && !responseHeaders.length) {
      return;
    }
    if (!responseHeaders.length) {
      responseHeaders = interceptedRequest.responseHeaders || [];
    }

    let mimeType = '';
    if (interceptedRequest.responseHeaders) {
      for (const header of interceptedRequest.responseHeaders) {
        if (header.name.toLowerCase() === 'content-type') {
          mimeType = header.value;
          break;
        }
      }
    }

    if (!mimeType) {
      const expectedResourceType =
          Common.ResourceType.resourceTypes[interceptedRequest.resourceType] || Common.ResourceType.resourceTypes.Other;
      mimeType = fileSystemUISourceCode?.mimeType() || '';
      if (Common.ResourceType.ResourceType.fromMimeType(mimeType) !== expectedResourceType) {
        mimeType = expectedResourceType.canonicalMimeType();
      }
    }

    if (fileSystemUISourceCode) {
      this.originalResponseContentPromises.set(
          fileSystemUISourceCode, interceptedRequest.responseBody().then(response => {
            if (response.error || response.content === null) {
              return null;
            }
            if (response.encoded) {
              const text = atob(response.content);
              const data = new Uint8Array(text.length);
              for (let i = 0; i < text.length; ++i) {
                data[i] = text.charCodeAt(i);
              }
              return new TextDecoder('utf-8').decode(data);
            }
            return response.content;
          }));

      const project = fileSystemUISourceCode.project() as FileSystem;
      const blob = await project.requestFileBlob(fileSystemUISourceCode);
      if (blob) {
        void interceptedRequest.continueRequestWithContent(
            new Blob([blob], {type: mimeType}), /* encoded */ false, responseHeaders);
      }
    } else {
      const responseBody = await interceptedRequest.responseBody();
      if (!responseBody.error && responseBody.content) {
        void interceptedRequest.continueRequestWithContent(
            new Blob([responseBody.content], {type: mimeType}), /* encoded */ true, responseHeaders);
      }
    }
  }
}

const RESERVED_FILENAMES = new Set<string>([
  'con',  'prn',  'aux',  'nul',  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7',
  'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

const HEADERS_FILENAME = '.headers';

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  ProjectChanged = 'ProjectChanged',
}

export type EventTypes = {
  [Events.ProjectChanged]: Workspace.Workspace.Project|null,
};

interface HeaderOverride {
  applyTo: string;
  headers: Protocol.Network.Headers;
}

interface HeaderOverrideWithRegex {
  applyToRegex: RegExp;
  headers: Protocol.Network.Headers;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isHeaderOverride(arg: any): arg is HeaderOverride {
  if (!(arg && arg.applyTo && typeof (arg.applyTo === 'string') && arg.headers && Object.keys(arg.headers).length)) {
    return false;
  }
  return Object.values(arg.headers).every(value => typeof value === 'string');
}

export function escapeRegex(pattern: string): string {
  return Platform.StringUtilities.escapeCharacters(pattern, '[]{}()\\.^$+|-,?').replaceAll('*', '.*');
}

export function extractDirectoryIndex(pattern: string): {head: string, tail?: string} {
  const lastSlash = pattern.lastIndexOf('/');
  const tail = lastSlash >= 0 ? pattern.slice(lastSlash + 1) : pattern;
  const head = lastSlash >= 0 ? pattern.slice(0, lastSlash + 1) : '';
  const regex = new RegExp('^' + escapeRegex(tail) + '$');
  if (regex.test('index.html') || regex.test('index.htm') || regex.test('index.php')) {
    return {head, tail};
  }
  return {head: pattern};
}
