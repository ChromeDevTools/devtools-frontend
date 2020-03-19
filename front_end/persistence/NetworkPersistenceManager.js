// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';

import {FileSystem, FileSystemWorkspaceBinding} from './FileSystemWorkspaceBinding.js';  // eslint-disable-line no-unused-vars
import {PersistenceBinding} from './PersistenceImpl.js';

export class NetworkPersistenceManager extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!Workspace.Workspace.WorkspaceImpl} workspace
   */
  constructor(workspace) {
    super();
    this._bindingSymbol = Symbol('NetworkPersistenceBinding');
    this._originalResponseContentPromiseSymbol = Symbol('OriginalResponsePromise');
    this._savingSymbol = Symbol('SavingForOverrides');

    this._enabledSetting = Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled');
    this._enabledSetting.addChangeListener(this._enabledChanged, this);

    this._workspace = workspace;

    /** @type {!Map<string, !Workspace.UISourceCode.UISourceCode>} */
    this._networkUISourceCodeForEncodedPath = new Map();
    this._interceptionHandlerBound = this._interceptionHandler.bind(this);
    this._updateInterceptionThrottler = new Common.Throttler.Throttler(50);

    /** @type {?Workspace.Workspace.Project} */
    this._project = null;
    /** @type {?Workspace.Workspace.Project} */
    this._activeProject = null;

    this._active = false;
    this._enabled = false;

    this._workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded, event => {
      this._onProjectAdded(/** @type {!Workspace.Workspace.Project} */ (event.data));
    });
    this._workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, event => {
      this._onProjectRemoved(/** @type {!Workspace.Workspace.Project} */ (event.data));
    });

    self.Persistence.persistence.addNetworkInterceptor(this._canHandleNetworkUISourceCode.bind(this));

    /** @type {!Array<!Common.EventTarget.EventDescriptor>} */
    this._eventDescriptors = [];
    this._enabledChanged();
  }

  /**
   * @return {boolean}
   */
  active() {
    return this._active;
  }

  /**
   * @return {?Workspace.Workspace.Project}
   */
  project() {
    return this._project;
  }


  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {?Promise<?string>}
   */
  originalContentForUISourceCode(uiSourceCode) {
    if (!uiSourceCode[this._bindingSymbol]) {
      return null;
    }
    const fileSystemUISourceCode = uiSourceCode[this._bindingSymbol].fileSystem;
    return fileSystemUISourceCode[this._originalResponseContentPromiseSymbol] || null;
  }

  async _enabledChanged() {
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
                /** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data.uiSourceCode)))
      ];
      await this._updateActiveProject();
    } else {
      Common.EventTarget.EventTarget.removeEventListeners(this._eventDescriptors);
      await this._updateActiveProject();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _uiSourceCodeRenamedListener(event) {
    const uiSourceCode = /** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data.uiSourceCode);
    await this._onUISourceCodeRemoved(uiSourceCode);
    await this._onUISourceCodeAdded(uiSourceCode);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _uiSourceCodeRemovedListener(event) {
    await this._onUISourceCodeRemoved(/** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data));
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _uiSourceCodeAdded(event) {
    await this._onUISourceCodeAdded(/** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data));
  }

  async _updateActiveProject() {
    const wasActive = this._active;
    this._active =
        !!(this._enabledSetting.get() && SDK.SDKModel.TargetManager.instance().mainTarget() && this._project);
    if (this._active === wasActive) {
      return;
    }

    if (this._active) {
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
    self.Persistence.persistence.refreshAutomapping();
  }

  /**
   * @param {string} url
   * @return {string}
   */
  _encodedPathFromUrl(url) {
    if (!this._active) {
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
      encodedPathParts =
          [domain, 'longurls', shortFileName + String.hashCode(encodedPath).toString(16) + extensionPart];
    }
    return encodedPathParts.join('/');

    /**
     * @param {string} urlPath
     * @return {!Array<string>}
     */
    function encodeUrlPathToLocalPathParts(urlPath) {
      const encodedParts = [];
      for (const pathPart of fileNamePartsFromUrlPath(urlPath)) {
        if (!pathPart) {
          continue;
        }
        // encodeURI() escapes all the unsafe filename characters except /:?*
        let encodedName = encodeURI(pathPart).replace(/[\/:\?\*]/g, match => '%' + match[0].charCodeAt(0).toString(16));
        // Windows does not allow a small set of filenames.
        if (_reservedFileNames.has(encodedName.toLowerCase())) {
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

    /**
     * @param {string} urlPath
     * @return {!Array<string>}
     */
    function fileNamePartsFromUrlPath(urlPath) {
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

  /**
   * @param {string} path
   * @return {string}
   */
  _decodeLocalPathToUrlPath(path) {
    try {
      return unescape(path);
    } catch (e) {
      console.error(e);
    }
    return path;
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  async _unbind(uiSourceCode) {
    const binding = uiSourceCode[this._bindingSymbol];
    if (binding) {
      delete binding.network[this._bindingSymbol];
      delete binding.fileSystem[this._bindingSymbol];
      await self.Persistence.persistence.removeBinding(binding);
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} networkUISourceCode
   * @param {!Workspace.UISourceCode.UISourceCode} fileSystemUISourceCode
   */
  async _bind(networkUISourceCode, fileSystemUISourceCode) {
    if (networkUISourceCode[this._bindingSymbol]) {
      await this._unbind(networkUISourceCode);
    }
    if (fileSystemUISourceCode[this._bindingSymbol]) {
      await this._unbind(fileSystemUISourceCode);
    }
    const binding = new PersistenceBinding(networkUISourceCode, fileSystemUISourceCode);
    networkUISourceCode[this._bindingSymbol] = binding;
    fileSystemUISourceCode[this._bindingSymbol] = binding;
    await self.Persistence.persistence.addBinding(binding);
    const uiSourceCodeOfTruth = networkUISourceCode[this._savingSymbol] ? networkUISourceCode : fileSystemUISourceCode;
    const [{content}, encoded] =
        await Promise.all([uiSourceCodeOfTruth.requestContent(), uiSourceCodeOfTruth.contentEncoded()]);
    self.Persistence.persistence.syncContent(uiSourceCodeOfTruth, content, encoded);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  _onUISourceCodeWorkingCopyCommitted(uiSourceCode) {
    this.saveUISourceCodeForOverrides(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  canSaveUISourceCodeForOverrides(uiSourceCode) {
    return this._active && uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network &&
        !uiSourceCode[this._bindingSymbol] && !uiSourceCode[this._savingSymbol];
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  async saveUISourceCodeForOverrides(uiSourceCode) {
    if (!this.canSaveUISourceCodeForOverrides(uiSourceCode)) {
      return;
    }
    uiSourceCode[this._savingSymbol] = true;
    let encodedPath = this._encodedPathFromUrl(uiSourceCode.url());
    const content = (await uiSourceCode.requestContent()).content || '';
    const encoded = await uiSourceCode.contentEncoded();
    const lastIndexOfSlash = encodedPath.lastIndexOf('/');
    const encodedFileName = encodedPath.substr(lastIndexOfSlash + 1);
    encodedPath = encodedPath.substr(0, lastIndexOfSlash);
    await this._project.createFile(encodedPath, encodedFileName, content, encoded);
    this._fileCreatedForTest(encodedPath, encodedFileName);
    uiSourceCode[this._savingSymbol] = false;
  }

  /**
   * @param {string} path
   * @param {string} fileName
   */
  _fileCreatedForTest(path, fileName) {
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {string}
   */
  _patternForFileSystemUISourceCode(uiSourceCode) {
    const relativePathParts = FileSystemWorkspaceBinding.relativePath(uiSourceCode);
    if (relativePathParts.length < 2) {
      return '';
    }
    if (relativePathParts[1] === 'longurls' && relativePathParts.length !== 2) {
      return 'http?://' + relativePathParts[0] + '/*';
    }
    return 'http?://' + this._decodeLocalPathToUrlPath(relativePathParts.join('/'));
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  async _onUISourceCodeAdded(uiSourceCode) {
    await this._networkUISourceCodeAdded(uiSourceCode);
    await this._filesystemUISourceCodeAdded(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  _canHandleNetworkUISourceCode(uiSourceCode) {
    return this._active && !uiSourceCode.url().startsWith('snippet://');
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  async _networkUISourceCodeAdded(uiSourceCode) {
    if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.Network ||
        !this._canHandleNetworkUISourceCode(uiSourceCode)) {
      return;
    }
    const url = Common.ParsedURL.ParsedURL.urlWithoutHash(uiSourceCode.url());
    this._networkUISourceCodeForEncodedPath.set(this._encodedPathFromUrl(url), uiSourceCode);

    const fileSystemUISourceCode = this._project.uiSourceCodeForURL(
        /** @type {!FileSystem} */ (this._project).fileSystemPath() + '/' + this._encodedPathFromUrl(url));
    if (fileSystemUISourceCode) {
      await this._bind(uiSourceCode, fileSystemUISourceCode);
    }
  }

  /**
    * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
    */
  async _filesystemUISourceCodeAdded(uiSourceCode) {
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

  _updateInterceptionPatterns() {
    this._updateInterceptionThrottler.schedule(innerUpdateInterceptionPatterns.bind(this));

    /**
     * @this {NetworkPersistenceManager}
     * @return {!Promise}
     */
    function innerUpdateInterceptionPatterns() {
      if (!this._active) {
        return self.SDK.multitargetNetworkManager.setInterceptionHandlerForPatterns([], this._interceptionHandlerBound);
      }
      const patterns = new Set();
      const indexFileName = 'index.html';
      for (const uiSourceCode of this._project.uiSourceCodes()) {
        const pattern = this._patternForFileSystemUISourceCode(uiSourceCode);
        patterns.add(pattern);
        if (pattern.endsWith('/' + indexFileName)) {
          patterns.add(pattern.substr(0, pattern.length - indexFileName.length));
        }
      }

      return self.SDK.multitargetNetworkManager.setInterceptionHandlerForPatterns(
          Array.from(patterns).map(
              pattern =>
                  ({urlPattern: pattern, interceptionStage: Protocol.Network.InterceptionStage.HeadersReceived})),
          this._interceptionHandlerBound);
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  async _onUISourceCodeRemoved(uiSourceCode) {
    await this._networkUISourceCodeRemoved(uiSourceCode);
    await this._filesystemUISourceCodeRemoved(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  async _networkUISourceCodeRemoved(uiSourceCode) {
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network) {
      await this._unbind(uiSourceCode);
      this._networkUISourceCodeForEncodedPath.delete(this._encodedPathFromUrl(uiSourceCode.url()));
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  async _filesystemUISourceCodeRemoved(uiSourceCode) {
    if (uiSourceCode.project() !== this._project) {
      return;
    }
    this._updateInterceptionPatterns();
    delete uiSourceCode[this._originalResponseContentPromiseSymbol];
    await this._unbind(uiSourceCode);
  }

  async _setProject(project) {
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

  /**
   * @param {!Workspace.Workspace.Project} project
   */
  async _onProjectAdded(project) {
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

  /**
   * @param {!Workspace.Workspace.Project} project
   */
  async _onProjectRemoved(project) {
    if (project === this._project) {
      await this._setProject(null);
    }
  }

  /**
   * @param {!SDK.NetworkManager.InterceptedRequest} interceptedRequest
   * @return {!Promise}
   */
  async _interceptionHandler(interceptedRequest) {
    const method = interceptedRequest.request.method;
    if (!this._active || (method !== 'GET' && method !== 'POST')) {
      return;
    }
    const path = /** @type {!FileSystem} */ (this._project).fileSystemPath() + '/' +
        this._encodedPathFromUrl(interceptedRequest.request.url);
    const fileSystemUISourceCode = this._project.uiSourceCodeForURL(path);
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
    const project =
        /** @type {!FileSystem} */ (fileSystemUISourceCode.project());

    fileSystemUISourceCode[this._originalResponseContentPromiseSymbol] =
        interceptedRequest.responseBody().then(response => {
          if (response.error || response.content === null) {
            return null;
          }
          return response.encoded ? atob(response.content) : response.content;
        });

    const blob = await project.requestFileBlob(fileSystemUISourceCode);
    interceptedRequest.continueRequestWithContent(new Blob([blob], {type: mimeType}));
  }
}

const _reservedFileNames = new Set([
  'con',  'prn',  'aux',  'nul',  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7',
  'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
]);

export const Events = {
  ProjectChanged: Symbol('ProjectChanged')
};
