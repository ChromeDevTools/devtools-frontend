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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as TextUtils from '../text_utils/text_utils.js';  // eslint-disable-line no-unused-vars

import {UISourceCode, UISourceCodeMetadata} from './UISourceCode.js';  // eslint-disable-line no-unused-vars

export interface ProjectSearchConfig {
  query(): string;
  ignoreCase(): boolean;
  isRegex(): boolean;
  queries(): string[];
  filePathMatchesFileQuery(filePath: string): boolean;
}

export abstract class Project {
  abstract workspace(): WorkspaceImpl;
  abstract id(): string;
  abstract type(): string;
  abstract isServiceProject(): boolean;
  abstract displayName(): string;
  abstract requestMetadata(uiSourceCode: UISourceCode): Promise<UISourceCodeMetadata|null>;
  abstract requestFileContent(uiSourceCode: UISourceCode): Promise<TextUtils.ContentProvider.DeferredContent>;
  abstract canSetFileContent(): boolean;
  abstract setFileContent(uiSourceCode: UISourceCode, newContent: string, isBase64: boolean): Promise<void>;
  abstract fullDisplayName(uiSourceCode: UISourceCode): string;
  abstract mimeType(uiSourceCode: UISourceCode): string;
  abstract canRename(): boolean;
  rename(
      _uiSourceCode: UISourceCode, _newName: string,
      _callback: (arg0: boolean, arg1?: string, arg2?: string, arg3?: Common.ResourceType.ResourceType) => void): void {
  }
  excludeFolder(_path: string): void {
  }
  abstract canExcludeFolder(path: string): boolean;
  abstract createFile(path: string, name: string|null, content: string, isBase64?: boolean): Promise<UISourceCode|null>;
  abstract canCreateFile(): boolean;
  deleteFile(_uiSourceCode: UISourceCode): void {
  }
  remove(): void {
  }
  abstract searchInFileContent(uiSourceCode: UISourceCode, query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]>;
  abstract findFilesMatchingSearchRequest(
      searchConfig: ProjectSearchConfig, filesMathingFileQuery: string[],
      progress: Common.Progress.Progress): Promise<string[]>;
  indexContent(_progress: Common.Progress.Progress): void {
  }
  abstract uiSourceCodeForURL(url: string): UISourceCode|null;
  abstract uiSourceCodes(): UISourceCode[];
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum projectTypes {
  Debugger = 'debugger',
  Formatter = 'formatter',
  Network = 'network',
  FileSystem = 'filesystem',
  ContentScripts = 'contentscripts',
  Service = 'service',
}

export class ProjectStore {
  _workspace: WorkspaceImpl;
  _id: string;
  _type: projectTypes;
  _displayName: string;
  _uiSourceCodesMap: Map < string, {
    uiSourceCode: UISourceCode;
    index: number;
  }
  > ;
  _uiSourceCodesList: UISourceCode[];
  _project: Project;

  constructor(workspace: WorkspaceImpl, id: string, type: projectTypes, displayName: string) {
    this._workspace = workspace;
    this._id = id;
    this._type = type;
    this._displayName = displayName;

    this._uiSourceCodesMap = new Map();
    this._uiSourceCodesList = [];
    this._project = (this as unknown as Project);
  }

  id(): string {
    return this._id;
  }

  type(): string {
    return this._type;
  }

  displayName(): string {
    return this._displayName;
  }

  workspace(): WorkspaceImpl {
    return this._workspace;
  }

  createUISourceCode(url: string, contentType: Common.ResourceType.ResourceType): UISourceCode {
    return new UISourceCode(this._project, url, contentType);
  }

  addUISourceCode(uiSourceCode: UISourceCode): boolean {
    const url = uiSourceCode.url();
    if (this.uiSourceCodeForURL(url)) {
      return false;
    }
    this._uiSourceCodesMap.set(url, {uiSourceCode: uiSourceCode, index: this._uiSourceCodesList.length});
    this._uiSourceCodesList.push(uiSourceCode);
    this._workspace.dispatchEventToListeners(Events.UISourceCodeAdded, uiSourceCode);
    return true;
  }

  removeUISourceCode(url: string): void {
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

  removeProject(): void {
    this._workspace._removeProject(this._project);
    this._uiSourceCodesMap = new Map();
    this._uiSourceCodesList = [];
  }

  uiSourceCodeForURL(url: string): UISourceCode|null {
    const entry = this._uiSourceCodesMap.get(url);
    return entry ? entry.uiSourceCode : null;
  }

  uiSourceCodes(): UISourceCode[] {
    return this._uiSourceCodesList;
  }

  renameUISourceCode(uiSourceCode: UISourceCode, newName: string): void {
    const oldPath = uiSourceCode.url();
    const newPath = uiSourceCode.parentURL() ? uiSourceCode.parentURL() + '/' + newName : newName;
    const value = this._uiSourceCodesMap.get(oldPath) as {
      uiSourceCode: UISourceCode;
      index: number;
    };
    this._uiSourceCodesMap.set(newPath, value);
    this._uiSourceCodesMap.delete(oldPath);
  }
}

let workspaceInstance: WorkspaceImpl;

export class WorkspaceImpl extends Common.ObjectWrapper.ObjectWrapper {
  _projects: Map<string, Project>;
  _hasResourceContentTrackingExtensions: boolean;

  private constructor() {
    super();
    this._projects = new Map();
    this._hasResourceContentTrackingExtensions = false;
  }

  static instance(opts: {forceNew: boolean|null;} = {forceNew: null}): WorkspaceImpl {
    const {forceNew} = opts;
    if (!workspaceInstance || forceNew) {
      workspaceInstance = new WorkspaceImpl();
    }

    return workspaceInstance;
  }

  uiSourceCode(projectId: string, url: string): UISourceCode|null {
    const project = this._projects.get(projectId);
    return project ? project.uiSourceCodeForURL(url) : null;
  }

  uiSourceCodeForURL(url: string): UISourceCode|null {
    for (const project of this._projects.values()) {
      const uiSourceCode = project.uiSourceCodeForURL(url);
      if (uiSourceCode) {
        return uiSourceCode;
      }
    }
    return null;
  }

  uiSourceCodesForProjectType(type: string): UISourceCode[] {
    const result: UISourceCode[] = [];
    for (const project of this._projects.values()) {
      if (project.type() === type) {
        result.push(...project.uiSourceCodes());
      }
    }
    return result;
  }

  addProject(project: Project): void {
    console.assert(!this._projects.has(project.id()), `A project with id ${project.id()} already exists!`);
    this._projects.set(project.id(), project);
    this.dispatchEventToListeners(Events.ProjectAdded, project);
  }

  _removeProject(project: Project): void {
    this._projects.delete(project.id());
    this.dispatchEventToListeners(Events.ProjectRemoved, project);
  }

  project(projectId: string): Project|null {
    return this._projects.get(projectId) || null;
  }

  projects(): Project[] {
    return [...this._projects.values()];
  }

  projectsForType(type: string): Project[] {
    function filterByType(project: Project): boolean {
      return project.type() === type;
    }
    return this.projects().filter(filterByType);
  }

  uiSourceCodes(): UISourceCode[] {
    const result: UISourceCode[] = [];
    for (const project of this._projects.values()) {
      result.push(...project.uiSourceCodes());
    }
    return result;
  }

  setHasResourceContentTrackingExtensions(hasExtensions: boolean): void {
    this._hasResourceContentTrackingExtensions = hasExtensions;
  }

  hasResourceContentTrackingExtensions(): boolean {
    return this._hasResourceContentTrackingExtensions;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  UISourceCodeAdded = 'UISourceCodeAdded',
  UISourceCodeRemoved = 'UISourceCodeRemoved',
  UISourceCodeRenamed = 'UISourceCodeRenamed',
  WorkingCopyChanged = 'WorkingCopyChanged',
  WorkingCopyCommitted = 'WorkingCopyCommitted',
  WorkingCopyCommittedByUser = 'WorkingCopyCommittedByUser',
  ProjectAdded = 'ProjectAdded',
  ProjectRemoved = 'ProjectRemoved',
}
