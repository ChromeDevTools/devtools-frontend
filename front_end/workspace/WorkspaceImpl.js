/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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

import * as Common from '../common/common.js';
import * as TextUtils from '../text_utils/text_utils.js';  // eslint-disable-line no-unused-vars

import {UISourceCode, UISourceCodeMetadata} from './UISourceCode.js';  // eslint-disable-line no-unused-vars

/**
 * @interface
 */
export class ProjectSearchConfig {
  /**
   * @return {string}
   */
  query() {
    throw new Error('not implemented');
  }

  /**
   * @return {boolean}
   */
  ignoreCase() {
    throw new Error('not implemented');
  }

  /**
   * @return {boolean}
   */
  isRegex() {
    throw new Error('not implemented');
  }

  /**
   * @return {!Array.<string>}
   */
  queries() {
    throw new Error('not implemented');
  }

  /**
   * @param {string} filePath
   * @return {boolean}
   */
  filePathMatchesFileQuery(filePath) {
    throw new Error('not implemented');
  }
}

/**
 * @interface
 */
export class Project {
  /**
   * @return {!WorkspaceImpl}
   */
  workspace() {
    throw new Error('not implemented');
  }

  /**
   * @return {string}
   */
  id() {
    throw new Error('not implemented');
  }

  /**
   * @return {string}
   */
  type() {
    throw new Error('not implemented');
  }

  /**
   * @return {boolean}
   */
  isServiceProject() {
    throw new Error('not implemented');
  }

  /**
   * @return {string}
   */
  displayName() {
    throw new Error('not implemented');
  }

  /**
   * @param {!UISourceCode} uiSourceCode
   * @return {!Promise<?UISourceCodeMetadata>}
   */
  requestMetadata(uiSourceCode) {
    throw new Error('not implemented');
  }

  /**
   * @param {!UISourceCode} uiSourceCode
   * @return {!Promise<!TextUtils.ContentProvider.DeferredContent>}
   */
  requestFileContent(uiSourceCode) {
    throw new Error('not implemented');
  }

  /**
   * @return {boolean}
   */
  canSetFileContent() {
    throw new Error('not implemented');
  }

  /**
   * @param {!UISourceCode} uiSourceCode
   * @param {string} newContent
   * @param {boolean} isBase64
   * @return {!Promise<void>}
   */
  setFileContent(uiSourceCode, newContent, isBase64) {
    throw new Error('not implemented');
  }

  /**
   * @param {!UISourceCode} uiSourceCode
   * @return {string}
   */
  fullDisplayName(uiSourceCode) {
    throw new Error('not implemented');
  }

  /**
   * @param {!UISourceCode} uiSourceCode
   * @return {string}
   */
  mimeType(uiSourceCode) {
    throw new Error('not implemented');
  }

  /**
   * @return {boolean}
   */
  canRename() {
    throw new Error('not implemented');
  }

  /**
   * @param {!UISourceCode} uiSourceCode
   * @param {string} newName
   * @param {function(boolean, string=, string=, !Common.ResourceType.ResourceType=):void} callback
   */
  rename(uiSourceCode, newName, callback) {
  }

  /**
   * @param {string} path
   */
  excludeFolder(path) {
  }

  /**
   * @param {string} path
   * @return {boolean}
   */
  canExcludeFolder(path) {
    throw new Error('not implemented');
  }

  /**
   * @param {string} path
   * @param {?string} name
   * @param {string} content
   * @param {boolean=} isBase64
   * @return {!Promise<?UISourceCode>}
   */
  createFile(path, name, content, isBase64) {
    throw new Error('not implemented');
  }

  /**
   * @return {boolean}
   */
  canCreateFile() {
    throw new Error('not implemented');
  }

  /**
   * @param {!UISourceCode} uiSourceCode
   */
  deleteFile(uiSourceCode) {
  }

  remove() {
  }

  /**
   * @param {!UISourceCode} uiSourceCode
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @return {!Promise<!Array<!TextUtils.ContentProvider.SearchMatch>>}
   */
  searchInFileContent(uiSourceCode, query, caseSensitive, isRegex) {
    throw new Error('not implemented');
  }

  /**
   * @param {!ProjectSearchConfig} searchConfig
   * @param {!Array.<string>} filesMathingFileQuery
   * @param {!Common.Progress.Progress} progress
   * @return {!Promise<!Array<string>>}
   */
  findFilesMatchingSearchRequest(searchConfig, filesMathingFileQuery, progress) {
    throw new Error('not implemented');
  }

  /**
   * @param {!Common.Progress.Progress} progress
   */
  indexContent(progress) {
  }

  /**
   * @param {string} url
   * @return {?UISourceCode}
   */
  uiSourceCodeForURL(url) {
    throw new Error('not implemented');
  }

  /**
   * @return {!Array.<!UISourceCode>}
   */
  uiSourceCodes() {
    throw new Error('not implemented');
  }
}

/**
 * @enum {string}
 */
export const projectTypes = {
  Debugger: 'debugger',
  Formatter: 'formatter',
  Network: 'network',
  FileSystem: 'filesystem',
  ContentScripts: 'contentscripts',
  Service: 'service'
};

/**
 * @unrestricted
 */
export class ProjectStore {
  /**
   * @param {!WorkspaceImpl} workspace
   * @param {string} id
   * @param {projectTypes} type
   * @param {string} displayName
   */
  constructor(workspace, id, type, displayName) {
    this._workspace = workspace;
    this._id = id;
    this._type = type;
    this._displayName = displayName;

    /** @type {!Map.<string, !{uiSourceCode: !UISourceCode, index: number}>} */
    this._uiSourceCodesMap = new Map();
    /** @type {!Array.<!UISourceCode>} */
    this._uiSourceCodesList = [];

    this._project = /** @type {!Project} */ (/** @type {*} */ (this));
  }

  /**
   * @return {string}
   */
  id() {
    return this._id;
  }

  /**
   * @return {string}
   */
  type() {
    return this._type;
  }

  /**
   * @return {string}
   */
  displayName() {
    return this._displayName;
  }

  /**
   * @return {!WorkspaceImpl}
   */
  workspace() {
    return this._workspace;
  }

  /**
   * @param {string} url
   * @param {!Common.ResourceType.ResourceType} contentType
   * @return {!UISourceCode}
   */
  createUISourceCode(url, contentType) {
    return new UISourceCode(this._project, url, contentType);
  }

  /**
   * @param {!UISourceCode} uiSourceCode
   * @return {boolean}
   */
  addUISourceCode(uiSourceCode) {
    const url = uiSourceCode.url();
    if (this.uiSourceCodeForURL(url)) {
      return false;
    }
    this._uiSourceCodesMap.set(url, {uiSourceCode: uiSourceCode, index: this._uiSourceCodesList.length});
    this._uiSourceCodesList.push(uiSourceCode);
    this._workspace.dispatchEventToListeners(Events.UISourceCodeAdded, uiSourceCode);
    return true;
  }

  /**
   * @param {string} url
   */
  removeUISourceCode(url) {
    const uiSourceCode = this.uiSourceCodeForURL(url);
    if (!uiSourceCode) {
      return;
    }

    const entry = this._uiSourceCodesMap.get(url);
    if (!entry) {
      return;
    }
    const movedUISourceCode = this._uiSourceCodesList[this._uiSourceCodesList.length - 1];
    this._uiSourceCodesList[entry.index] = movedUISourceCode;
    const movedEntry = this._uiSourceCodesMap.get(movedUISourceCode.url());
    if (movedEntry) {
      movedEntry.index = entry.index;
    }
    this._uiSourceCodesList.splice(this._uiSourceCodesList.length - 1, 1);
    this._uiSourceCodesMap.delete(url);
    this._workspace.dispatchEventToListeners(Events.UISourceCodeRemoved, entry.uiSourceCode);
  }

  removeProject() {
    this._workspace._removeProject(this._project);
    this._uiSourceCodesMap = new Map();
    this._uiSourceCodesList = [];
  }

  /**
   * @param {string} url
   * @return {?UISourceCode}
   */
  uiSourceCodeForURL(url) {
    const entry = this._uiSourceCodesMap.get(url);
    return entry ? entry.uiSourceCode : null;
  }

  /**
   * @return {!Array.<!UISourceCode>}
   */
  uiSourceCodes() {
    return this._uiSourceCodesList;
  }

  /**
   * @param {!UISourceCode} uiSourceCode
   * @param {string} newName
   */
  renameUISourceCode(uiSourceCode, newName) {
    const oldPath = uiSourceCode.url();
    const newPath = uiSourceCode.parentURL() ? uiSourceCode.parentURL() + '/' + newName : newName;
    const value =
        /** @type {!{uiSourceCode: !UISourceCode, index: number}} */ (this._uiSourceCodesMap.get(oldPath));
    this._uiSourceCodesMap.set(newPath, value);
    this._uiSourceCodesMap.delete(oldPath);
  }
}

/**
 * @type {!WorkspaceImpl}
 */
let workspaceInstance;

/**
 * @unrestricted
 */
export class WorkspaceImpl extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @private
   */
  constructor() {
    super();
    /** @type {!Map<string, !Project>} */
    this._projects = new Map();
    this._hasResourceContentTrackingExtensions = false;
  }

  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!workspaceInstance || forceNew) {
      workspaceInstance = new WorkspaceImpl();
    }

    return workspaceInstance;
  }

  /**
   * @param {string} projectId
   * @param {string} url
   * @return {?UISourceCode}
   */
  uiSourceCode(projectId, url) {
    const project = this._projects.get(projectId);
    return project ? project.uiSourceCodeForURL(url) : null;
  }

  /**
   * @param {string} url
   * @return {?UISourceCode}
   */
  uiSourceCodeForURL(url) {
    for (const project of this._projects.values()) {
      const uiSourceCode = project.uiSourceCodeForURL(url);
      if (uiSourceCode) {
        return uiSourceCode;
      }
    }
    return null;
  }

  /**
   * @param {string} type
   * @return {!Array.<!UISourceCode>}
   */
  uiSourceCodesForProjectType(type) {
    /** @type {!Array<!UISourceCode>} */
    const result = [];
    for (const project of this._projects.values()) {
      if (project.type() === type) {
        result.push(...project.uiSourceCodes());
      }
    }
    return result;
  }

  /**
   * @param {!Project} project
   */
  addProject(project) {
    console.assert(!this._projects.has(project.id()), `A project with id ${project.id()} already exists!`);
    this._projects.set(project.id(), project);
    this.dispatchEventToListeners(Events.ProjectAdded, project);
  }

  /**
   * @param {!Project} project
   */
  _removeProject(project) {
    this._projects.delete(project.id());
    this.dispatchEventToListeners(Events.ProjectRemoved, project);
  }

  /**
   * @param {string} projectId
   * @return {?Project}
   */
  project(projectId) {
    return this._projects.get(projectId) || null;
  }

  /**
   * @return {!Array.<!Project>}
   */
  projects() {
    return [...this._projects.values()];
  }

  /**
   * @param {string} type
   * @return {!Array.<!Project>}
   */
  projectsForType(type) {
    /**
     * @param {!Project} project
     */
    function filterByType(project) {
      return project.type() === type;
    }
    return this.projects().filter(filterByType);
  }

  /**
   * @return {!Array.<!UISourceCode>}
   */
  uiSourceCodes() {
    /** @type {!Array.<!UISourceCode>} */
    const result = [];
    for (const project of this._projects.values()) {
      result.push(...project.uiSourceCodes());
    }
    return result;
  }

  /**
   * @param {boolean} hasExtensions
   */
  setHasResourceContentTrackingExtensions(hasExtensions) {
    this._hasResourceContentTrackingExtensions = hasExtensions;
  }

  /**
   * @return {boolean}
   */
  hasResourceContentTrackingExtensions() {
    return this._hasResourceContentTrackingExtensions;
  }
}

/** @enum {symbol} */
export const Events = {
  UISourceCodeAdded: Symbol('UISourceCodeAdded'),
  UISourceCodeRemoved: Symbol('UISourceCodeRemoved'),
  UISourceCodeRenamed: Symbol('UISourceCodeRenamed'),
  WorkingCopyChanged: Symbol('WorkingCopyChanged'),
  WorkingCopyCommitted: Symbol('WorkingCopyCommitted'),
  WorkingCopyCommittedByUser: Symbol('WorkingCopyCommittedByUser'),
  ProjectAdded: Symbol('ProjectAdded'),
  ProjectRemoved: Symbol('ProjectRemoved')
};
