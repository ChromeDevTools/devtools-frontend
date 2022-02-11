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

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as TextUtils from '../text_utils/text_utils.js';

import type {UISourceCodeMetadata} from './UISourceCode.js';
import {UISourceCode} from './UISourceCode.js';

export interface ProjectSearchConfig {
  query(): string;
  ignoreCase(): boolean;
  isRegex(): boolean;
  queries(): string[];
  filePathMatchesFileQuery(filePath: string): boolean;
}

export interface Project {
  workspace(): WorkspaceImpl;
  id(): string;
  type(): projectTypes;
  isServiceProject(): boolean;
  displayName(): string;
  requestMetadata(uiSourceCode: UISourceCode): Promise<UISourceCodeMetadata|null>;
  requestFileContent(uiSourceCode: UISourceCode): Promise<TextUtils.ContentProvider.DeferredContent>;
  canSetFileContent(): boolean;
  setFileContent(uiSourceCode: UISourceCode, newContent: string, isBase64: boolean): Promise<void>;
  fullDisplayName(uiSourceCode: UISourceCode): string;
  mimeType(uiSourceCode: UISourceCode): string;
  canRename(): boolean;
  rename(
      uiSourceCode: UISourceCode, newName: string,
      callback: (arg0: boolean, arg1?: string, arg2?: string, arg3?: Common.ResourceType.ResourceType) => void): void;
  excludeFolder(path: string): void;
  canExcludeFolder(path: string): boolean;
  createFile(path: string, name: string|null, content: string, isBase64?: boolean): Promise<UISourceCode|null>;
  canCreateFile(): boolean;
  deleteFile(uiSourceCode: UISourceCode): void;
  remove(): void;
  searchInFileContent(uiSourceCode: UISourceCode, query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]>;
  findFilesMatchingSearchRequest(
      searchConfig: ProjectSearchConfig, filesMathingFileQuery: string[],
      progress: Common.Progress.Progress): Promise<string[]>;
  indexContent(progress: Common.Progress.Progress): void;
  uiSourceCodeForURL(url: string): UISourceCode|null;
  uiSourceCodes(): UISourceCode[];
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum, @typescript-eslint/naming-convention
export enum projectTypes {
  Debugger = 'debugger',
  Formatter = 'formatter',
  Network = 'network',
  FileSystem = 'filesystem',
  ContentScripts = 'contentscripts',
  Service = 'service',
}

export abstract class ProjectStore implements Project {
  private readonly workspaceInternal: WorkspaceImpl;
  private readonly idInternal: string;
  private readonly typeInternal: projectTypes;
  private readonly displayNameInternal: string;
  private uiSourceCodesMap: Map<string, {
    uiSourceCode: UISourceCode,
    index: number,
  }>;
  private uiSourceCodesList: UISourceCode[];

  constructor(workspace: WorkspaceImpl, id: string, type: projectTypes, displayName: string) {
    this.workspaceInternal = workspace;
    this.idInternal = id;
    this.typeInternal = type;
    this.displayNameInternal = displayName;

    this.uiSourceCodesMap = new Map();
    this.uiSourceCodesList = [];
  }

  id(): string {
    return this.idInternal;
  }

  type(): projectTypes {
    return this.typeInternal;
  }

  displayName(): string {
    return this.displayNameInternal;
  }

  workspace(): WorkspaceImpl {
    return this.workspaceInternal;
  }

  createUISourceCode(url: string, contentType: Common.ResourceType.ResourceType): UISourceCode {
    return new UISourceCode(this, url, contentType);
  }

  addUISourceCode(uiSourceCode: UISourceCode): boolean {
    const url = uiSourceCode.url();
    if (this.uiSourceCodeForURL(url)) {
      return false;
    }
    this.uiSourceCodesMap.set(url, {uiSourceCode: uiSourceCode, index: this.uiSourceCodesList.length});
    this.uiSourceCodesList.push(uiSourceCode);
    this.workspaceInternal.dispatchEventToListeners(Events.UISourceCodeAdded, uiSourceCode);
    return true;
  }

  removeUISourceCode(url: string): void {
    const uiSourceCode = this.uiSourceCodeForURL(url);
    if (!uiSourceCode) {
      return;
    }

    const entry = this.uiSourceCodesMap.get(url);
    if (!entry) {
      return;
    }
    const movedUISourceCode = this.uiSourceCodesList[this.uiSourceCodesList.length - 1];
    this.uiSourceCodesList[entry.index] = movedUISourceCode;
    const movedEntry = this.uiSourceCodesMap.get(movedUISourceCode.url());
    if (movedEntry) {
      movedEntry.index = entry.index;
    }
    this.uiSourceCodesList.splice(this.uiSourceCodesList.length - 1, 1);
    this.uiSourceCodesMap.delete(url);
    this.workspaceInternal.dispatchEventToListeners(Events.UISourceCodeRemoved, entry.uiSourceCode);
  }

  removeProject(): void {
    this.workspaceInternal.removeProject(this);
    this.uiSourceCodesMap = new Map();
    this.uiSourceCodesList = [];
  }

  uiSourceCodeForURL(url: string): UISourceCode|null {
    const entry = this.uiSourceCodesMap.get(url);
    return entry ? entry.uiSourceCode : null;
  }

  uiSourceCodes(): UISourceCode[] {
    return this.uiSourceCodesList;
  }

  renameUISourceCode(uiSourceCode: UISourceCode, newName: string): void {
    const oldPath = uiSourceCode.url();
    const newPath = uiSourceCode.parentURL() ?
        Common.ParsedURL.ParsedURL.urlFromParentUrlAndName(
            uiSourceCode.parentURL() as Platform.DevToolsPath.UrlString, newName) :
        encodeURIComponent(newName);
    const value = this.uiSourceCodesMap.get(oldPath) as {
      uiSourceCode: UISourceCode,
      index: number,
    };
    this.uiSourceCodesMap.set(newPath, value);
    this.uiSourceCodesMap.delete(oldPath);
  }

  // No-op implementation for a handfull of interface methods.

  rename(
      _uiSourceCode: UISourceCode, _newName: string,
      _callback: (arg0: boolean, arg1?: string, arg2?: string, arg3?: Common.ResourceType.ResourceType) => void): void {
  }
  excludeFolder(_path: string): void {
  }
  deleteFile(_uiSourceCode: UISourceCode): void {
  }
  remove(): void {
  }
  indexContent(_progress: Common.Progress.Progress): void {
  }

  abstract isServiceProject(): boolean;
  abstract requestMetadata(uiSourceCode: UISourceCode): Promise<UISourceCodeMetadata|null>;
  abstract requestFileContent(uiSourceCode: UISourceCode): Promise<TextUtils.ContentProvider.DeferredContent>;
  abstract canSetFileContent(): boolean;
  abstract setFileContent(uiSourceCode: UISourceCode, newContent: string, isBase64: boolean): Promise<void>;
  abstract fullDisplayName(uiSourceCode: UISourceCode): string;
  abstract mimeType(uiSourceCode: UISourceCode): string;
  abstract canRename(): boolean;
  abstract canExcludeFolder(path: string): boolean;
  abstract createFile(path: string, name: string|null, content: string, isBase64?: boolean): Promise<UISourceCode|null>;
  abstract canCreateFile(): boolean;
  abstract searchInFileContent(uiSourceCode: UISourceCode, query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]>;
  abstract findFilesMatchingSearchRequest(
      searchConfig: ProjectSearchConfig, filesMathingFileQuery: string[],
      progress: Common.Progress.Progress): Promise<string[]>;
}

let workspaceInstance: WorkspaceImpl|undefined;

export class WorkspaceImpl extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private projectsInternal: Map<string, Project>;
  private hasResourceContentTrackingExtensionsInternal: boolean;

  private constructor() {
    super();
    this.projectsInternal = new Map();
    this.hasResourceContentTrackingExtensionsInternal = false;
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): WorkspaceImpl {
    const {forceNew} = opts;
    if (!workspaceInstance || forceNew) {
      workspaceInstance = new WorkspaceImpl();
    }

    return workspaceInstance;
  }

  static removeInstance(): void {
    workspaceInstance = undefined;
  }

  uiSourceCode(projectId: string, url: string): UISourceCode|null {
    const project = this.projectsInternal.get(projectId);
    return project ? project.uiSourceCodeForURL(url) : null;
  }

  uiSourceCodeForURL(url: string): UISourceCode|null {
    for (const project of this.projectsInternal.values()) {
      const uiSourceCode = project.uiSourceCodeForURL(url);
      if (uiSourceCode) {
        return uiSourceCode;
      }
    }
    return null;
  }

  uiSourceCodesForProjectType(type: string): UISourceCode[] {
    const result: UISourceCode[] = [];
    for (const project of this.projectsInternal.values()) {
      if (project.type() === type) {
        result.push(...project.uiSourceCodes());
      }
    }
    return result;
  }

  addProject(project: Project): void {
    console.assert(!this.projectsInternal.has(project.id()), `A project with id ${project.id()} already exists!`);
    this.projectsInternal.set(project.id(), project);
    this.dispatchEventToListeners(Events.ProjectAdded, project);
  }

  removeProject(project: Project): void {
    this.projectsInternal.delete(project.id());
    this.dispatchEventToListeners(Events.ProjectRemoved, project);
  }

  project(projectId: string): Project|null {
    return this.projectsInternal.get(projectId) || null;
  }

  projects(): Project[] {
    return [...this.projectsInternal.values()];
  }

  projectsForType(type: string): Project[] {
    function filterByType(project: Project): boolean {
      return project.type() === type;
    }
    return this.projects().filter(filterByType);
  }

  uiSourceCodes(): UISourceCode[] {
    const result: UISourceCode[] = [];
    for (const project of this.projectsInternal.values()) {
      result.push(...project.uiSourceCodes());
    }
    return result;
  }

  setHasResourceContentTrackingExtensions(hasExtensions: boolean): void {
    this.hasResourceContentTrackingExtensionsInternal = hasExtensions;
  }

  hasResourceContentTrackingExtensions(): boolean {
    return this.hasResourceContentTrackingExtensionsInternal;
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

export interface UISourceCodeRenamedEvent {
  oldURL: string;
  uiSourceCode: UISourceCode;
}

export interface WorkingCopyChangedEvent {
  uiSourceCode: UISourceCode;
}

export interface WorkingCopyCommitedEvent {
  uiSourceCode: UISourceCode;
  content: string;
  encoded?: boolean;
}

export type EventTypes = {
  [Events.UISourceCodeAdded]: UISourceCode,
  [Events.UISourceCodeRemoved]: UISourceCode,
  [Events.UISourceCodeRenamed]: UISourceCodeRenamedEvent,
  [Events.WorkingCopyChanged]: WorkingCopyChangedEvent,
  [Events.WorkingCopyCommitted]: WorkingCopyCommitedEvent,
  [Events.WorkingCopyCommittedByUser]: WorkingCopyCommitedEvent,
  [Events.ProjectAdded]: Project,
  [Events.ProjectRemoved]: Project,
};
