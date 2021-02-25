// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';

import type {FileSystem} from './FileSystemWorkspaceBinding.js';
import {FileSystemWorkspaceBinding} from './FileSystemWorkspaceBinding.js';
import {PersistenceBinding, PersistenceImpl} from './PersistenceImpl.js';

let networkPersistenceManagerInstance: NetworkPersistenceManager|null;

export class NetworkPersistenceManager extends Common.ObjectWrapper.ObjectWrapper {
  _bindings: WeakMap<Workspace.UISourceCode.UISourceCode, PersistenceBinding>;
  _originalResponseContentPromises: WeakMap<Workspace.UISourceCode.UISourceCode, Promise<string|null>>;
  _savingForOverrides: WeakSet<Workspace.UISourceCode.UISourceCode>;
  _savingSymbol: symbol;
  _enabledSetting: Common.Settings.Setting<boolean>;
  _workspace: Workspace.Workspace.WorkspaceImpl;
  _networkUISourceCodeForEncodedPath: Map<string, Workspace.UISourceCode.UISourceCode>;
  _interceptionHandlerBound: (interceptedRequest: SDK.NetworkManager.InterceptedRequest) => Promise<void>;
  _updateInterceptionThrottler: Common.Throttler.Throttler;
  _project: Workspace.Workspace.Project|null;
  _activeProject: Workspace.Workspace.Project|null;
  _active: boolean;
  _enabled: boolean;
  _eventDescriptors: Common.EventTarget.EventDescriptor[];

  private constructor(workspace: Workspace.Workspace.WorkspaceImpl) {
    super();
    this._bindings = new WeakMap();
    this._originalResponseContentPromises = new WeakMap();
    this._savingForOverrides = new WeakSet();
    this._savingSymbol = Symbol('SavingForOverrides');

    this._enabledSetting = Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled');
    this._enabledSetting.addChangeListener(this._enabledChanged, this);

    this._workspace = workspace;

    this._networkUISourceCodeForEncodedPath = new Map();
    this._interceptionHandlerBound = this._interceptionHandler.bind(this);
    this._updateInterceptionThrottler = new Common.Throttler.Throttler(50);

    this._project = null;
    this._activeProject = null;

    this._active = false;
    this._enabled = false;

    this._workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded, event => {
      this._onProjectAdded(event.data as Workspace.Workspace.Project);
    });
    this._workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, event => {
      this._onProjectRemoved(event.data as Workspace.Workspace.Project);
    });

    PersistenceImpl.instance().addNetworkInterceptor(this._canHandleNetworkUISourceCode.bind(this));

    this._eventDescriptors = [];
    this._enabledChanged();
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
    return this._active;
  }

  project(): Workspace.Workspace.Project|null {
    return this._project;
  }

  originalContentForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<string|null>|null {
    const binding = this._bindings.get(uiSourceCode);
    if (!binding) {
      return null;
    }
    const fileSystemUISourceCode = binding.fileSystem;
    return this._originalResponseContentPromises.get(fileSystemUISourceCode) || null;
  }

  async _enabledChanged(): Promise<void> {
    if (this._enabled === this._enabledSetting.get()) {
      return;
    }
    this._enabled = this._enabledSetting.get();
    if (this._enabled) {
      this._eventDescriptors = [
        Workspace.Workspace.WorkspaceImpl.instance().addEventListener(
            Workspace.Workspace.Events.UISourceCodeRenamed,
            event => {
              this._uiSourceCodeRenamedListener(event);
            }),
        Workspace.Workspace.WorkspaceImpl.instance().addEventListener(
            Workspace.Workspace.Events.UISourceCodeAdded,
            event => {
              this._uiSourceCodeAdded(event);
            }),
        Workspace.Workspace.WorkspaceImpl.instance().addEventListener(
            Workspace.Workspace.Events.UISourceCodeRemoved,
            event => {
              this._uiSourceCodeRemovedListener(event);
            }),
        Workspace.Workspace.WorkspaceImpl.instance().addEventListener(
            Workspace.Workspace.Events.WorkingCopyCommitted,
            event => this._onUISourceCodeWorkingCopyCommitted(
                event.data.uiSourceCode as Workspace.UISourceCode.UISourceCode)),
      ];
      await this._updateActiveProject();
    } else {
      Common.EventTarget.EventTarget.removeEventListeners(this._eventDescriptors);
      await this._updateActiveProject();
    }
  }

  async _uiSourceCodeRenamedListener(event: Common.EventTarget.EventTargetEvent): Promise<void> {
    const uiSourceCode = event.data.uiSourceCode as Workspace.UISourceCode.UISourceCode;
    await this._onUISourceCodeRemoved(uiSourceCode);
    await this._onUISourceCodeAdded(uiSourceCode);
  }

  async _uiSourceCodeRemovedListener(event: Common.EventTarget.EventTargetEvent): Promise<void> {
    await this._onUISourceCodeRemoved(event.data as Workspace.UISourceCode.UISourceCode);
  }

  async _uiSourceCodeAdded(event: Common.EventTarget.EventTargetEvent): Promise<void> {
    await this._onUISourceCodeAdded(event.data as Workspace.UISourceCode.UISourceCode);
  }

  async _updateActiveProject(): Promise<void> {
    const wasActive = this._active;
    this._active =
        Boolean(this._enabledSetting.get() && SDK.SDKModel.TargetManager.instance().mainTarget() && this._project);
    if (this._active === wasActive) {
      return;
    }

    if (this._active && this._project) {
      await Promise.all(
          this._project.uiSourceCodes().map(uiSourceCode => this._filesystemUISourceCodeAdded(uiSourceCode)));

      const networkProjects = this._workspace.projectsForType(Workspace.Workspace.projectTypes.Network);
      for (const networkProject of networkProjects) {
        await Promise.all(
            networkProject.uiSourceCodes().map(uiSourceCode => this._networkUISourceCodeAdded(uiSourceCode)));
      }
    } else if (this._project) {
      await Promise.all(
          this._project.uiSourceCodes().map(uiSourceCode => this._filesystemUISourceCodeRemoved(uiSourceCode)));
      this._networkUISourceCodeForEncodedPath.clear();
    }
    PersistenceImpl.instance().refreshAutomapping();
  }

  _encodedPathFromUrl(url: string): string {
    if (!this._active || !this._project) {
      return '';
    }
    let urlPath = Common.ParsedURL.ParsedURL.urlWithoutHash(url.replace(/^https?:\/\//, ''));
    if (urlPath.endsWith('/') && urlPath.indexOf('?') === -1) {
      urlPath = urlPath + 'index.html';
    }
    let encodedPathParts = encodeUrlPathToLocalPathParts(urlPath);
    const projectPath = FileSystemWorkspaceBinding.fileSystemPath(this._project.id());
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

  _decodeLocalPathToUrlPath(path: string): string {
    try {
      return unescape(path);
    } catch (e) {
      console.error(e);
    }
    return path;
  }

  async _unbind(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    const binding = this._bindings.get(uiSourceCode);
    if (binding) {
      this._bindings.delete(binding.network);
      this._bindings.delete(binding.fileSystem);
      await PersistenceImpl.instance().removeBinding(binding);
    }
  }

  async _bind(
      networkUISourceCode: Workspace.UISourceCode.UISourceCode,
      fileSystemUISourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (this._bindings.has(networkUISourceCode)) {
      await this._unbind(networkUISourceCode);
    }
    if (this._bindings.has(fileSystemUISourceCode)) {
      await this._unbind(fileSystemUISourceCode);
    }
    const binding = new PersistenceBinding(networkUISourceCode, fileSystemUISourceCode);
    this._bindings.set(networkUISourceCode, binding);
    this._bindings.set(fileSystemUISourceCode, binding);
    await PersistenceImpl.instance().addBinding(binding);
    const uiSourceCodeOfTruth =
        this._savingForOverrides.has(networkUISourceCode) ? networkUISourceCode : fileSystemUISourceCode;
    const [{content}, encoded] =
        await Promise.all([uiSourceCodeOfTruth.requestContent(), uiSourceCodeOfTruth.contentEncoded()]);
    PersistenceImpl.instance().syncContent(uiSourceCodeOfTruth, content || '', encoded);
  }

  _onUISourceCodeWorkingCopyCommitted(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.saveUISourceCodeForOverrides(uiSourceCode);
  }

  canSaveUISourceCodeForOverrides(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return this._active && uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network &&
        !this._bindings.has(uiSourceCode) && !this._savingForOverrides.has(uiSourceCode);
  }

  async saveUISourceCodeForOverrides(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (!this.canSaveUISourceCodeForOverrides(uiSourceCode)) {
      return;
    }
    this._savingForOverrides.add(uiSourceCode);
    let encodedPath = this._encodedPathFromUrl(uiSourceCode.url());
    const content = (await uiSourceCode.requestContent()).content || '';
    const encoded = await uiSourceCode.contentEncoded();
    const lastIndexOfSlash = encodedPath.lastIndexOf('/');
    const encodedFileName = encodedPath.substr(lastIndexOfSlash + 1);
    encodedPath = encodedPath.substr(0, lastIndexOfSlash);
    if (this._project) {
      await this._project.createFile(encodedPath, encodedFileName, content, encoded);
    }
    this._fileCreatedForTest(encodedPath, encodedFileName);
    this._savingForOverrides.delete(uiSourceCode);
  }

  _fileCreatedForTest(_path: string, _fileName: string): void {
  }

  _patternForFileSystemUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    const relativePathParts = FileSystemWorkspaceBinding.relativePath(uiSourceCode);
    if (relativePathParts.length < 2) {
      return '';
    }
    if (relativePathParts[1] === 'longurls' && relativePathParts.length !== 2) {
      return 'http?://' + relativePathParts[0] + '/*';
    }
    return 'http?://' + this._decodeLocalPathToUrlPath(relativePathParts.join('/'));
  }

  async _onUISourceCodeAdded(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    await this._networkUISourceCodeAdded(uiSourceCode);
    await this._filesystemUISourceCodeAdded(uiSourceCode);
  }

  _canHandleNetworkUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return this._active && !uiSourceCode.url().startsWith('snippet://');
  }

  async _networkUISourceCodeAdded(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.Network ||
        !this._canHandleNetworkUISourceCode(uiSourceCode)) {
      return;
    }
    const url = Common.ParsedURL.ParsedURL.urlWithoutHash(uiSourceCode.url());
    this._networkUISourceCodeForEncodedPath.set(this._encodedPathFromUrl(url), uiSourceCode);

    const project = this._project as FileSystem;
    const fileSystemUISourceCode =
        project.uiSourceCodeForURL(project.fileSystemPath() + '/' + this._encodedPathFromUrl(url));
    if (fileSystemUISourceCode) {
      await this._bind(uiSourceCode, fileSystemUISourceCode);
    }
  }

  async _filesystemUISourceCodeAdded(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (!this._active || uiSourceCode.project() !== this._project) {
      return;
    }
    this._updateInterceptionPatterns();

    const relativePath = FileSystemWorkspaceBinding.relativePath(uiSourceCode);
    const networkUISourceCode = this._networkUISourceCodeForEncodedPath.get(relativePath.join('/'));
    if (networkUISourceCode) {
      await this._bind(networkUISourceCode, uiSourceCode);
    }
  }

  _updateInterceptionPatterns(): void {
    this._updateInterceptionThrottler.schedule(innerUpdateInterceptionPatterns.bind(this));

    function innerUpdateInterceptionPatterns(this: NetworkPersistenceManager): Promise<void> {
      if (!this._active || !this._project) {
        return SDK.NetworkManager.MultitargetNetworkManager.instance().setInterceptionHandlerForPatterns(
            [], this._interceptionHandlerBound);
      }
      const patterns = new Set<string>();
      const indexFileName = 'index.html';
      for (const uiSourceCode of this._project.uiSourceCodes()) {
        const pattern = this._patternForFileSystemUISourceCode(uiSourceCode);
        patterns.add(pattern);
        if (pattern.endsWith('/' + indexFileName)) {
          patterns.add(pattern.substr(0, pattern.length - indexFileName.length));
        }
      }

      return SDK.NetworkManager.MultitargetNetworkManager.instance().setInterceptionHandlerForPatterns(
          Array.from(patterns).map(
              pattern =>
                  ({urlPattern: pattern, interceptionStage: Protocol.Network.InterceptionStage.HeadersReceived})),
          this._interceptionHandlerBound);
    }
  }

  async _onUISourceCodeRemoved(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    await this._networkUISourceCodeRemoved(uiSourceCode);
    await this._filesystemUISourceCodeRemoved(uiSourceCode);
  }

  async _networkUISourceCodeRemoved(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network) {
      await this._unbind(uiSourceCode);
      this._networkUISourceCodeForEncodedPath.delete(this._encodedPathFromUrl(uiSourceCode.url()));
    }
  }

  async _filesystemUISourceCodeRemoved(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (uiSourceCode.project() !== this._project) {
      return;
    }
    this._updateInterceptionPatterns();
    this._originalResponseContentPromises.delete(uiSourceCode);
    await this._unbind(uiSourceCode);
  }

  async _setProject(project: Workspace.Workspace.Project|null): Promise<void> {
    if (project === this._project) {
      return;
    }

    if (this._project) {
      await Promise.all(
          this._project.uiSourceCodes().map(uiSourceCode => this._filesystemUISourceCodeRemoved(uiSourceCode)));
    }

    this._project = project;

    if (this._project) {
      await Promise.all(
          this._project.uiSourceCodes().map(uiSourceCode => this._filesystemUISourceCodeAdded(uiSourceCode)));
    }

    await this._updateActiveProject();
    this.dispatchEventToListeners(Events.ProjectChanged, this._project);
  }

  async _onProjectAdded(project: Workspace.Workspace.Project): Promise<void> {
    if (project.type() !== Workspace.Workspace.projectTypes.FileSystem ||
        FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides') {
      return;
    }
    const fileSystemPath = FileSystemWorkspaceBinding.fileSystemPath(project.id());
    if (!fileSystemPath) {
      return;
    }
    if (this._project) {
      this._project.remove();
    }

    await this._setProject(project);
  }

  async _onProjectRemoved(project: Workspace.Workspace.Project): Promise<void> {
    if (project === this._project) {
      await this._setProject(null);
    }
  }

  async _interceptionHandler(interceptedRequest: SDK.NetworkManager.InterceptedRequest): Promise<void> {
    const method = interceptedRequest.request.method;
    if (!this._active || (method !== 'GET' && method !== 'POST')) {
      return;
    }
    const proj = this._project as FileSystem;
    const path = proj.fileSystemPath() + '/' + this._encodedPathFromUrl(interceptedRequest.request.url);
    const fileSystemUISourceCode = proj.uiSourceCodeForURL(path);
    if (!fileSystemUISourceCode) {
      return;
    }

    let mimeType = '';
    if (interceptedRequest.responseHeaders) {
      const responseHeaders = SDK.NetworkManager.NetworkManager.lowercaseHeaders(interceptedRequest.responseHeaders);
      mimeType = responseHeaders['content-type'];
    }

    if (!mimeType) {
      const expectedResourceType =
          Common.ResourceType.resourceTypes[interceptedRequest.resourceType] || Common.ResourceType.resourceTypes.Other;
      mimeType = fileSystemUISourceCode.mimeType();
      if (Common.ResourceType.ResourceType.fromMimeType(mimeType) !== expectedResourceType) {
        mimeType = expectedResourceType.canonicalMimeType();
      }
    }
    const project = fileSystemUISourceCode.project() as FileSystem;

    this._originalResponseContentPromises.set(
        fileSystemUISourceCode, interceptedRequest.responseBody().then(response => {
          if (response.error || response.content === null) {
            return null;
          }
          return response.encoded ? atob(response.content) : response.content;
        }));

    const blob = await project.requestFileBlob(fileSystemUISourceCode);
    if (blob) {
      interceptedRequest.continueRequestWithContent(new Blob([blob], {type: mimeType}));
    }
  }
}

const RESERVED_FILENAMES = new Set<string>([
  'con',  'prn',  'aux',  'nul',  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7',
  'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

export const Events = {
  ProjectChanged: Symbol('ProjectChanged'),
};
