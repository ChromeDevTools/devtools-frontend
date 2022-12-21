/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';

import type * as TextUtils from '../text_utils/text_utils.js';

import {Events, type IsolatedFileSystemManager} from './IsolatedFileSystemManager.js';
import {PlatformFileSystem} from './PlatformFileSystem.js';

const UIStrings = {
  /**
   *@description Text in Isolated File System of the Workspace settings in Settings
   *@example {folder does not exist} PH1
   */
  fileSystemErrorS: 'File system error: {PH1}',
  /**
   *@description Error message when reading a remote blob
   */
  blobCouldNotBeLoaded: 'Blob could not be loaded.',
  /**
   *@description Error message when reading a file.
   *@example {c:\dir\file.js} PH1
   *@example {Underlying error} PH2
   */
  cantReadFileSS: 'Can\'t read file: {PH1}: {PH2}',
  /**
   *@description Error message when failing to load a file
   *@example {c:\dir\file.js} PH1
   */
  unknownErrorReadingFileS: 'Unknown error reading file: {PH1}',
  /**
   *@description Text to show something is linked to another
   *@example {example.url} PH1
   */
  linkedToS: 'Linked to {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('models/persistence/IsolatedFileSystem.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class IsolatedFileSystem extends PlatformFileSystem {
  private readonly manager: IsolatedFileSystemManager;
  private readonly embedderPathInternal: Platform.DevToolsPath.RawPathString;
  private readonly domFileSystem: FileSystem;
  private readonly excludedFoldersSetting:
      Common.Settings.Setting<{[path: Platform.DevToolsPath.UrlString]: Platform.DevToolsPath.EncodedPathString[]}>;
  private excludedFoldersInternal: Set<Platform.DevToolsPath.EncodedPathString>;
  private readonly excludedEmbedderFolders: Platform.DevToolsPath.RawPathString[];
  private readonly initialFilePathsInternal: Set<Platform.DevToolsPath.EncodedPathString>;
  private readonly initialGitFoldersInternal: Set<Platform.DevToolsPath.EncodedPathString>;
  private readonly fileLocks: Map<Platform.DevToolsPath.EncodedPathString, Promise<void>>;

  constructor(
      manager: IsolatedFileSystemManager, path: Platform.DevToolsPath.UrlString,
      embedderPath: Platform.DevToolsPath.RawPathString, domFileSystem: FileSystem, type: string) {
    super(path, type);
    this.manager = manager;
    this.embedderPathInternal = embedderPath;
    this.domFileSystem = domFileSystem;
    this.excludedFoldersSetting =
        Common.Settings.Settings.instance().createLocalSetting('workspaceExcludedFolders', {});
    this.excludedFoldersInternal = new Set(this.excludedFoldersSetting.get()[path] || []);
    this.excludedEmbedderFolders = [];

    this.initialFilePathsInternal = new Set();
    this.initialGitFoldersInternal = new Set();
    this.fileLocks = new Map();
  }

  static async create(
      manager: IsolatedFileSystemManager, path: Platform.DevToolsPath.UrlString,
      embedderPath: Platform.DevToolsPath.RawPathString, type: string, name: string,
      rootURL: string): Promise<IsolatedFileSystem|null> {
    const domFileSystem = Host.InspectorFrontendHost.InspectorFrontendHostInstance.isolatedFileSystem(name, rootURL);
    if (!domFileSystem) {
      return null as IsolatedFileSystem | null;
    }

    const fileSystem = new IsolatedFileSystem(manager, path, embedderPath, domFileSystem, type);
    return fileSystem.initializeFilePaths().then(() => fileSystem).catch(error => {
      console.error(error);
      return null;
    });
  }

  static errorMessage(error: DOMError): string {
    // @ts-ignore TODO(crbug.com/1172300) Properly type this after jsdoc to ts migration
    return i18nString(UIStrings.fileSystemErrorS, {PH1: error.message});
  }

  private serializedFileOperation<T>(path: Platform.DevToolsPath.EncodedPathString, operation: () => Promise<T>):
      Promise<T> {
    const promise = Promise.resolve(this.fileLocks.get(path)).then(() => operation.call(null));
    this.fileLocks.set(path, promise as unknown as Promise<void>);
    return promise;
  }

  getMetadata(path: Platform.DevToolsPath.EncodedPathString): Promise<Metadata|null> {
    let fulfill: (arg0: Metadata|null) => void;
    const promise = new Promise<Metadata|null>(f => {
      fulfill = f;
    });
    this.domFileSystem.root.getFile(
        Common.ParsedURL.ParsedURL.encodedPathToRawPathString(path), undefined, fileEntryLoaded, errorHandler);
    return promise;

    function fileEntryLoaded(entry: FileEntry): void {
      entry.getMetadata(fulfill, errorHandler);
    }

    function errorHandler(error: DOMError): void {
      const errorMessage = IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when getting file metadata \'' + path);
      fulfill(null);
    }
  }

  initialFilePaths(): Platform.DevToolsPath.EncodedPathString[] {
    return [...this.initialFilePathsInternal];
  }

  initialGitFolders(): Platform.DevToolsPath.EncodedPathString[] {
    return [...this.initialGitFoldersInternal];
  }

  embedderPath(): Platform.DevToolsPath.RawPathString {
    return this.embedderPathInternal;
  }

  private initializeFilePaths(): Promise<void> {
    return new Promise(fulfill => {
      let pendingRequests = 1;
      const boundInnerCallback = innerCallback.bind(this);
      this.requestEntries(Platform.DevToolsPath.EmptyRawPathString, boundInnerCallback);

      function innerCallback(this: IsolatedFileSystem, entries: FileEntry[]): void {
        for (let i = 0; i < entries.length; ++i) {
          const entry = entries[i];
          if (!entry.isDirectory) {
            if (this.isFileExcluded(Common.ParsedURL.ParsedURL.rawPathToEncodedPathString(
                    entry.fullPath as Platform.DevToolsPath.RawPathString))) {
              continue;
            }
            this.initialFilePathsInternal.add(Common.ParsedURL.ParsedURL.rawPathToEncodedPathString(
                Common.ParsedURL.ParsedURL.substr(entry.fullPath as Platform.DevToolsPath.RawPathString, 1)));
          } else {
            if (entry.fullPath.endsWith('/.git')) {
              const lastSlash = entry.fullPath.lastIndexOf('/');
              const parentFolder = Common.ParsedURL.ParsedURL.substr(
                  entry.fullPath as Platform.DevToolsPath.RawPathString, 1, lastSlash);
              this.initialGitFoldersInternal.add(Common.ParsedURL.ParsedURL.rawPathToEncodedPathString(parentFolder));
            }
            if (this.isFileExcluded(Common.ParsedURL.ParsedURL.concatenate(
                    Common.ParsedURL.ParsedURL.rawPathToEncodedPathString(
                        entry.fullPath as Platform.DevToolsPath.RawPathString),
                    '/'))) {
              const url = Common.ParsedURL.ParsedURL.concatenate(
                  this.path(),
                  Common.ParsedURL.ParsedURL.rawPathToEncodedPathString(
                      entry.fullPath as Platform.DevToolsPath.RawPathString));
              this.excludedEmbedderFolders.push(
                  Common.ParsedURL.ParsedURL.urlToRawPathString(url, Host.Platform.isWin()));
              continue;
            }
            ++pendingRequests;
            this.requestEntries(entry.fullPath as Platform.DevToolsPath.RawPathString, boundInnerCallback);
          }
        }
        if ((--pendingRequests === 0)) {
          fulfill();
        }
      }
    });
  }

  private async createFoldersIfNotExist(folderPath: Platform.DevToolsPath.RawPathString): Promise<DirectoryEntry|null> {
    // Fast-path. If parent directory already exists we return it immidiatly.
    let dirEntry = await new Promise<DirectoryEntry|null>(
        resolve => this.domFileSystem.root.getDirectory(folderPath, undefined, resolve, () => resolve(null)));
    if (dirEntry) {
      return dirEntry;
    }
    const paths = folderPath.split('/');
    let activePath = '';
    for (const path of paths) {
      activePath = activePath + '/' + path;
      dirEntry = await this.innerCreateFolderIfNeeded(activePath);
      if (!dirEntry) {
        return null;
      }
    }
    return dirEntry;
  }

  private innerCreateFolderIfNeeded(path: string): Promise<DirectoryEntry|null> {
    return new Promise(resolve => {
      this.domFileSystem.root.getDirectory(path, {create: true}, dirEntry => resolve(dirEntry), error => {
        const errorMessage = IsolatedFileSystem.errorMessage(error);
        console.error(errorMessage + ' trying to create directory \'' + path + '\'');
        resolve(null);
      });
    });
  }

  async createFile(path: Platform.DevToolsPath.EncodedPathString, name: Platform.DevToolsPath.RawPathString|null):
      Promise<Platform.DevToolsPath.EncodedPathString|null> {
    const dirEntry = await this.createFoldersIfNotExist(Common.ParsedURL.ParsedURL.encodedPathToRawPathString(path));
    if (!dirEntry) {
      return null;
    }
    const fileEntry =
        await this.serializedFileOperation(
            path, createFileCandidate.bind(this, name || 'NewFile' as Platform.DevToolsPath.RawPathString)) as
            FileEntry |
        null;
    if (!fileEntry) {
      return null;
    }
    return Common.ParsedURL.ParsedURL.rawPathToEncodedPathString(
        Common.ParsedURL.ParsedURL.substr(fileEntry.fullPath as Platform.DevToolsPath.RawPathString, 1));

    function createFileCandidate(
        this: IsolatedFileSystem, name: Platform.DevToolsPath.RawPathString,
        newFileIndex?: number): Promise<FileEntry|null> {
      return new Promise(resolve => {
        const nameCandidate = Common.ParsedURL.ParsedURL.concatenate(name, (newFileIndex || '').toString());
        (dirEntry as DirectoryEntry).getFile(nameCandidate, {create: true, exclusive: true}, resolve, error => {
          if (error.name === 'InvalidModificationError') {
            resolve(createFileCandidate.call(this, name, (newFileIndex ? newFileIndex + 1 : 1)));
            return;
          }
          const errorMessage = IsolatedFileSystem.errorMessage(error);
          console.error(
              errorMessage + ' when testing if file exists \'' + (this.path() + '/' + path + '/' + nameCandidate) +
              '\'');
          resolve(null);
        });
      });
    }
  }

  deleteFile(path: Platform.DevToolsPath.EncodedPathString): Promise<boolean> {
    let resolveCallback: (arg0: boolean) => void;
    const promise = new Promise<boolean>(resolve => {
      resolveCallback = resolve;
    });
    this.domFileSystem.root.getFile(
        Common.ParsedURL.ParsedURL.encodedPathToRawPathString(path), undefined, fileEntryLoaded.bind(this),
        errorHandler.bind(this));
    return promise;

    function fileEntryLoaded(this: IsolatedFileSystem, fileEntry: FileEntry): void {
      fileEntry.remove(fileEntryRemoved, errorHandler.bind(this));
    }

    function fileEntryRemoved(): void {
      resolveCallback(true);
    }

    /**
     * TODO(jsbell): Update externs replacing DOMError with DOMException. https://crbug.com/496901
     */
    function errorHandler(this: IsolatedFileSystem, error: DOMError): void {
      const errorMessage = IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when deleting file \'' + (this.path() + '/' + path) + '\'');
      resolveCallback(false);
    }
  }

  requestFileBlob(path: Platform.DevToolsPath.EncodedPathString): Promise<Blob|null> {
    return new Promise(resolve => {
      this.domFileSystem.root.getFile(Common.ParsedURL.ParsedURL.encodedPathToRawPathString(path), undefined, entry => {
        entry.file(resolve, errorHandler.bind(this));
      }, errorHandler.bind(this));

      function errorHandler(this: IsolatedFileSystem, error: DOMError): void {
        if (error.name === 'NotFoundError') {
          resolve(null);
          return;
        }

        const errorMessage = IsolatedFileSystem.errorMessage(error);
        console.error(errorMessage + ' when getting content for file \'' + (this.path() + '/' + path) + '\'');
        resolve(null);
      }
    });
  }

  requestFileContent(path: Platform.DevToolsPath.EncodedPathString):
      Promise<TextUtils.ContentProvider.DeferredContent> {
    return this.serializedFileOperation(path, () => this.innerRequestFileContent(path));
  }

  private async innerRequestFileContent(path: Platform.DevToolsPath.EncodedPathString):
      Promise<TextUtils.ContentProvider.DeferredContent> {
    const blob = await this.requestFileBlob(path);
    if (!blob) {
      return {content: null, error: i18nString(UIStrings.blobCouldNotBeLoaded), isEncoded: false};
    }

    const reader = new FileReader();
    const extension = Common.ParsedURL.ParsedURL.extractExtension(path);
    const encoded = BinaryExtensions.has(extension);
    const readPromise = new Promise(x => {
      reader.onloadend = x;
    });
    if (encoded) {
      reader.readAsBinaryString(blob);
    } else {
      reader.readAsText(blob);
    }
    await readPromise;
    if (reader.error) {
      const error = i18nString(UIStrings.cantReadFileSS, {PH1: path, PH2: reader.error.toString()});
      console.error(error);
      return {content: null, isEncoded: false, error};
    }
    let result: string|null = null;
    let error: Common.UIString.LocalizedString|null = null;
    try {
      result = reader.result as string;
    } catch (e) {
      result = null;
      error = i18nString(UIStrings.cantReadFileSS, {PH1: path, PH2: e.message});
    }
    if (result === undefined || result === null) {
      error = error || i18nString(UIStrings.unknownErrorReadingFileS, {PH1: path});
      console.error(error);
      return {content: null, isEncoded: false, error};
    }
    return {isEncoded: encoded, content: encoded ? btoa(result) : result};
  }

  async setFileContent(path: Platform.DevToolsPath.EncodedPathString, content: string, isBase64: boolean):
      Promise<void> {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.FileSavedInWorkspace);
    let callback: (event?: ProgressEvent<EventTarget>) => void;
    const innerSetFileContent = (): Promise<ProgressEvent<EventTarget>> => {
      const promise = new Promise<ProgressEvent<EventTarget>>(x => {
        // @ts-ignore TODO(crbug.com/1172300) Properly type this after jsdoc to ts migration
        callback = x;
      });
      this.domFileSystem.root.getFile(
          Common.ParsedURL.ParsedURL.encodedPathToRawPathString(path), {create: true}, fileEntryLoaded.bind(this),
          errorHandler.bind(this));
      return promise;
    };

    void this.serializedFileOperation(path, innerSetFileContent);

    function fileEntryLoaded(this: IsolatedFileSystem, entry: FileEntry): void {
      entry.createWriter(fileWriterCreated.bind(this), errorHandler.bind(this));
    }

    async function fileWriterCreated(this: IsolatedFileSystem, fileWriter: FileWriter): Promise<void> {
      fileWriter.onerror = errorHandler.bind(this);
      fileWriter.onwriteend = fileWritten;
      let blob: Blob;
      if (isBase64) {
        blob = await (await fetch(`data:application/octet-stream;base64,${content}`)).blob();
      } else {
        blob = new Blob([content], {type: 'text/plain'});
      }
      fileWriter.write(blob);

      function fileWritten(): void {
        fileWriter.onwriteend = callback;
        fileWriter.truncate(blob.size);
      }
    }

    function errorHandler(this: IsolatedFileSystem, error: DOMError|ProgressEvent<EventTarget>): void {
      // @ts-ignore TODO(crbug.com/1172300) Properly type this after jsdoc to ts migration
      const errorMessage = IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when setting content for file \'' + (this.path() + '/' + path) + '\'');
      callback(undefined);
    }
  }

  renameFile(
      path: Platform.DevToolsPath.EncodedPathString, newName: Platform.DevToolsPath.RawPathString,
      callback: (arg0: boolean, arg1?: string|undefined) => void): void {
    newName = newName ? Common.ParsedURL.ParsedURL.trim(newName) : newName;
    if (!newName || newName.indexOf('/') !== -1) {
      callback(false);
      return;
    }
    let fileEntry: FileEntry;
    let dirEntry: DirectoryEntry;

    this.domFileSystem.root.getFile(
        Common.ParsedURL.ParsedURL.encodedPathToRawPathString(path), undefined, fileEntryLoaded.bind(this),
        errorHandler.bind(this));

    function fileEntryLoaded(this: IsolatedFileSystem, entry: FileEntry): void {
      if (entry.name === newName) {
        callback(false);
        return;
      }

      fileEntry = entry;
      fileEntry.getParent(dirEntryLoaded.bind(this), errorHandler.bind(this));
    }

    function dirEntryLoaded(this: IsolatedFileSystem, entry: Entry): void {
      dirEntry = entry as DirectoryEntry;
      dirEntry.getFile(newName, undefined, newFileEntryLoaded, newFileEntryLoadErrorHandler.bind(this));
    }

    function newFileEntryLoaded(_entry: FileEntry): void {
      callback(false);
    }

    function newFileEntryLoadErrorHandler(this: IsolatedFileSystem, error: DOMError): void {
      if (error.name !== 'NotFoundError') {
        callback(false);
        return;
      }
      fileEntry.moveTo(dirEntry, newName, fileRenamed, errorHandler.bind(this));
    }

    function fileRenamed(entry: Entry): void {
      callback(true, entry.name);
    }

    function errorHandler(this: IsolatedFileSystem, error: DOMError): void {
      const errorMessage = IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when renaming file \'' + (this.path() + '/' + path) + '\' to \'' + newName + '\'');
      callback(false);
    }
  }

  private readDirectory(dirEntry: DirectoryEntry, callback: (arg0: Array<FileEntry>) => void): void {
    const dirReader = dirEntry.createReader();
    let entries: FileEntry[] = [];

    function innerCallback(results: Entry[]): void {
      if (!results.length) {
        callback(entries.sort());
      } else {
        entries = entries.concat(toArray(results));
        dirReader.readEntries(innerCallback, errorHandler);
      }
    }

    function toArray(list: Entry[]): FileEntry[] {
      return Array.prototype.slice.call(list || [], 0);
    }

    dirReader.readEntries(innerCallback, errorHandler);

    function errorHandler(error: DOMError): void {
      const errorMessage = IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when reading directory \'' + dirEntry.fullPath + '\'');
      callback([]);
    }
  }

  private requestEntries(path: Platform.DevToolsPath.RawPathString, callback: (arg0: Array<FileEntry>) => void): void {
    this.domFileSystem.root.getDirectory(path, undefined, innerCallback.bind(this), errorHandler);

    function innerCallback(this: IsolatedFileSystem, dirEntry: DirectoryEntry): void {
      this.readDirectory(dirEntry, callback);
    }

    function errorHandler(error: DOMError): void {
      const errorMessage = IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + ' when requesting entry \'' + path + '\'');
      callback([]);
    }
  }

  private saveExcludedFolders(): void {
    const settingValue = this.excludedFoldersSetting.get();
    settingValue[this.path()] = [...this.excludedFoldersInternal];
    this.excludedFoldersSetting.set(settingValue);
  }

  addExcludedFolder(path: Platform.DevToolsPath.EncodedPathString): void {
    this.excludedFoldersInternal.add(path);
    this.saveExcludedFolders();
    this.manager.dispatchEventToListeners(Events.ExcludedFolderAdded, path);
  }

  removeExcludedFolder(path: Platform.DevToolsPath.EncodedPathString): void {
    this.excludedFoldersInternal.delete(path);
    this.saveExcludedFolders();
    this.manager.dispatchEventToListeners(Events.ExcludedFolderRemoved, path);
  }

  fileSystemRemoved(): void {
    const settingValue = this.excludedFoldersSetting.get();
    delete settingValue[this.path()];
    this.excludedFoldersSetting.set(settingValue);
  }

  isFileExcluded(folderPath: Platform.DevToolsPath.EncodedPathString): boolean {
    if (this.excludedFoldersInternal.has(folderPath)) {
      return true;
    }
    const regex = (this.manager.workspaceFolderExcludePatternSetting() as Common.Settings.RegExpSetting).asRegExp();
    return Boolean(regex && regex.test(Common.ParsedURL.ParsedURL.encodedPathToRawPathString(folderPath)));
  }

  excludedFolders(): Set<Platform.DevToolsPath.EncodedPathString> {
    return this.excludedFoldersInternal;
  }

  searchInPath(query: string, progress: Common.Progress.Progress): Promise<string[]> {
    return new Promise(resolve => {
      const requestId = this.manager.registerCallback(innerCallback);
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.searchInPath(
          requestId, this.embedderPathInternal, query);

      function innerCallback(files: Platform.DevToolsPath.RawPathString[]): void {
        resolve(files.map(path => Common.ParsedURL.ParsedURL.rawPathToUrlString(path)));
        progress.incrementWorked(1);
      }
    });
  }

  indexContent(progress: Common.Progress.Progress): void {
    progress.setTotalWork(1);
    const requestId = this.manager.registerProgress(progress);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.indexPath(
        requestId, this.embedderPathInternal, JSON.stringify(this.excludedEmbedderFolders));
  }

  mimeFromPath(path: Platform.DevToolsPath.UrlString): string {
    return Common.ResourceType.ResourceType.mimeFromURL(path) || 'text/plain';
  }

  canExcludeFolder(path: Platform.DevToolsPath.EncodedPathString): boolean {
    return Boolean(path) && this.type() !== 'overrides';
  }

  // path not typed as Branded Types as here we are interested in extention only
  contentType(path: string): Common.ResourceType.ResourceType {
    const extension = Common.ParsedURL.ParsedURL.extractExtension(path);
    if (STYLE_SHEET_EXTENSIONS.has(extension)) {
      return Common.ResourceType.resourceTypes.Stylesheet;
    }
    if (DOCUMENT_EXTENSIONS.has(extension)) {
      return Common.ResourceType.resourceTypes.Document;
    }
    if (IMAGE_EXTENSIONS.has(extension)) {
      return Common.ResourceType.resourceTypes.Image;
    }
    if (SCRIPT_EXTENSIONS.has(extension)) {
      return Common.ResourceType.resourceTypes.Script;
    }
    return BinaryExtensions.has(extension) ? Common.ResourceType.resourceTypes.Other :
                                             Common.ResourceType.resourceTypes.Document;
  }

  tooltipForURL(url: Platform.DevToolsPath.UrlString): string {
    const path = Platform.StringUtilities.trimMiddle(
        Common.ParsedURL.ParsedURL.urlToRawPathString(url, Host.Platform.isWin()), 150);
    return i18nString(UIStrings.linkedToS, {PH1: path});
  }

  supportsAutomapping(): boolean {
    return this.type() !== 'overrides';
  }
}

const STYLE_SHEET_EXTENSIONS = new Set<string>(['css', 'scss', 'sass', 'less']);
const DOCUMENT_EXTENSIONS = new Set<string>(['htm', 'html', 'asp', 'aspx', 'phtml', 'jsp']);

const SCRIPT_EXTENSIONS = new Set<string>([
  'asp', 'aspx', 'c', 'cc', 'cljs', 'coffee', 'cpp', 'cs', 'dart', 'java', 'js',
  'jsp', 'jsx',  'h', 'm',  'mjs',  'mm',     'py',  'sh', 'ts',   'tsx',  'ls',
]);

const IMAGE_EXTENSIONS = new Set<string>(['jpeg', 'jpg', 'svg', 'gif', 'webp', 'png', 'ico', 'tiff', 'tif', 'bmp']);

export const BinaryExtensions = new Set<string>([
  // Executable extensions, roughly taken from https://en.wikipedia.org/wiki/Comparison_of_executable_file_formats
  'cmd',
  'com',
  'exe',
  // Archive extensions, roughly taken from https://en.wikipedia.org/wiki/List_of_archive_formats
  'a',
  'ar',
  'iso',
  'tar',
  'bz2',
  'gz',
  'lz',
  'lzma',
  'z',
  '7z',
  'apk',
  'arc',
  'cab',
  'dmg',
  'jar',
  'pak',
  'rar',
  'zip',
  // Audio file extensions, roughly taken from https://en.wikipedia.org/wiki/Audio_file_format#List_of_formats
  '3gp',
  'aac',
  'aiff',
  'flac',
  'm4a',
  'mmf',
  'mp3',
  'ogg',
  'oga',
  'raw',
  'sln',
  'wav',
  'wma',
  'webm',
  // Video file extensions, roughly taken from https://en.wikipedia.org/wiki/Video_file_format
  'mkv',
  'flv',
  'vob',
  'ogv',
  'gifv',
  'avi',
  'mov',
  'qt',
  'mp4',
  'm4p',
  'm4v',
  'mpg',
  'mpeg',
  // Image file extensions
  'jpeg',
  'jpg',
  'gif',
  'webp',
  'png',
  'ico',
  'tiff',
  'tif',
  'bmp',
]);
