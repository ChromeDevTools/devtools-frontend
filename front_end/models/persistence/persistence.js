var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/persistence/Automapping.js
var Automapping_exports = {};
__export(Automapping_exports, {
  Automapping: () => Automapping,
  AutomappingStatus: () => AutomappingStatus
});
import * as Common6 from "./../../core/common/common.js";
import * as Host5 from "./../../core/host/host.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Bindings2 from "./../bindings/bindings.js";
import * as TextUtils5 from "./../text_utils/text_utils.js";
import * as Workspace5 from "./../workspace/workspace.js";

// gen/front_end/models/persistence/FileSystemWorkspaceBinding.js
var FileSystemWorkspaceBinding_exports = {};
__export(FileSystemWorkspaceBinding_exports, {
  FileSystem: () => FileSystem,
  FileSystemWorkspaceBinding: () => FileSystemWorkspaceBinding
});
import * as Common4 from "./../../core/common/common.js";
import * as Host3 from "./../../core/host/host.js";
import * as Platform5 from "./../../core/platform/platform.js";
import * as TextUtils2 from "./../text_utils/text_utils.js";
import * as Workspace from "./../workspace/workspace.js";

// gen/front_end/models/persistence/IsolatedFileSystemManager.js
var IsolatedFileSystemManager_exports = {};
__export(IsolatedFileSystemManager_exports, {
  Events: () => Events,
  IsolatedFileSystemManager: () => IsolatedFileSystemManager
});
import * as Common3 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as Platform4 from "./../../core/platform/platform.js";

// gen/front_end/models/persistence/IsolatedFileSystem.js
var IsolatedFileSystem_exports = {};
__export(IsolatedFileSystem_exports, {
  BinaryExtensions: () => BinaryExtensions,
  IsolatedFileSystem: () => IsolatedFileSystem
});
import * as Common2 from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Platform2 from "./../../core/platform/platform.js";
import * as TextUtils from "./../text_utils/text_utils.js";

// gen/front_end/models/persistence/PlatformFileSystem.js
var PlatformFileSystem_exports = {};
__export(PlatformFileSystem_exports, {
  PlatformFileSystem: () => PlatformFileSystem,
  PlatformFileSystemType: () => PlatformFileSystemType
});
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
var UIStrings = {
  /**
   * @description Assertion error message when failing to load a file.
   */
  unableToReadFilesWithThis: "`PlatformFileSystem` cannot read files."
};
var str_ = i18n.i18n.registerUIStrings("models/persistence/PlatformFileSystem.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var PlatformFileSystemType;
(function(PlatformFileSystemType2) {
  PlatformFileSystemType2["SNIPPETS"] = "snippets";
  PlatformFileSystemType2["OVERRIDES"] = "overrides";
  PlatformFileSystemType2["WORKSPACE_PROJECT"] = "workspace-project";
})(PlatformFileSystemType || (PlatformFileSystemType = {}));
var PlatformFileSystem = class extends Common.ObjectWrapper.ObjectWrapper {
  #path;
  #type;
  /**
   * True if the filesystem was automatically discovered (see
   * https://goo.gle/devtools-json-design).
   */
  automatic;
  constructor(path, type, automatic) {
    super();
    this.#path = path;
    this.#type = type;
    this.automatic = automatic;
  }
  getMetadata(_path) {
    return Promise.resolve(null);
  }
  initialFilePaths() {
    return [];
  }
  initialGitFolders() {
    return [];
  }
  path() {
    return this.#path;
  }
  embedderPath() {
    throw new Error("Not implemented");
  }
  type() {
    return this.#type;
  }
  async createFile(_path, _name) {
    return await Promise.resolve(null);
  }
  deleteFile(_path) {
    return Promise.resolve(false);
  }
  deleteDirectoryRecursively(_path) {
    return Promise.resolve(false);
  }
  requestFileBlob(_path) {
    return Promise.resolve(null);
  }
  async requestFileContent(_path) {
    return { error: i18nString(UIStrings.unableToReadFilesWithThis) };
  }
  setFileContent(_path, _content, _isBase64) {
    throw new Error("Not implemented");
  }
  renameFile(_path, _newName, callback) {
    callback(false);
  }
  addExcludedFolder(_path) {
  }
  removeExcludedFolder(_path) {
  }
  fileSystemRemoved() {
  }
  isFileExcluded(_folderPath) {
    return false;
  }
  excludedFolders() {
    return /* @__PURE__ */ new Set();
  }
  searchInPath(_query, _progress) {
    return Promise.resolve([]);
  }
  indexContent(progress) {
    queueMicrotask(() => {
      progress.done = true;
    });
  }
  mimeFromPath(_path) {
    throw new Error("Not implemented");
  }
  canExcludeFolder(_path) {
    return false;
  }
  contentType(_path) {
    throw new Error("Not implemented");
  }
  tooltipForURL(_url) {
    throw new Error("Not implemented");
  }
  supportsAutomapping() {
    throw new Error("Not implemented");
  }
};

// gen/front_end/models/persistence/IsolatedFileSystem.js
var _a;
var UIStrings2 = {
  /**
   * @description Text in Isolated File System of the Workspace settings in Settings
   * @example {folder does not exist} PH1
   */
  fileSystemErrorS: "File system error: {PH1}",
  /**
   * @description Error message when reading a remote blob
   */
  blobCouldNotBeLoaded: "Blob could not be loaded.",
  /**
   * @description Error message when reading a file.
   * @example {c:\dir\file.js} PH1
   * @example {Underlying error} PH2
   */
  cantReadFileSS: "Can't read file: {PH1}: {PH2}",
  /**
   * @description Text to show something is linked to another
   * @example {example.url} PH1
   */
  linkedToS: "Linked to {PH1}",
  /**
   * @description Error message shown when devtools failed to create a file system directory.
   * @example {path/} PH1
   */
  createDirFailedBecausePathIsFile: "Overrides: Failed to create directory {PH1} because the path exists and is a file.",
  /**
   * @description Error message shown when devtools failed to create a file system directory.
   * @example {path/} PH1
   */
  createDirFailed: "Overrides: Failed to create directory {PH1}. Are the workspace or overrides configured correctly?"
};
var str_2 = i18n3.i18n.registerUIStrings("models/persistence/IsolatedFileSystem.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var IsolatedFileSystem = class extends PlatformFileSystem {
  manager;
  #embedderPath;
  domFileSystem;
  excludedFoldersSetting;
  #excludedFolders;
  excludedEmbedderFolders = [];
  #initialFilePaths = /* @__PURE__ */ new Set();
  #initialGitFolders = /* @__PURE__ */ new Set();
  fileLocks = /* @__PURE__ */ new Map();
  constructor(manager, path, embedderPath, domFileSystem, type, automatic) {
    super(path, type, automatic);
    this.manager = manager;
    this.#embedderPath = embedderPath;
    this.domFileSystem = domFileSystem;
    this.excludedFoldersSetting = Common2.Settings.Settings.instance().createLocalSetting("workspace-excluded-folders", {});
    this.#excludedFolders = new Set(this.excludedFoldersSetting.get()[path] || []);
  }
  static async create(manager, path, embedderPath, type, name, rootURL, automatic) {
    const domFileSystem = Host.InspectorFrontendHost.InspectorFrontendHostInstance.isolatedFileSystem(name, rootURL);
    if (!domFileSystem) {
      return null;
    }
    const fileSystem = new _a(manager, path, embedderPath, domFileSystem, type, automatic);
    return await fileSystem.initializeFilePaths().then(() => fileSystem).catch((error) => {
      console.error(error);
      return null;
    });
  }
  static errorMessage(error) {
    return i18nString2(UIStrings2.fileSystemErrorS, { PH1: error.message });
  }
  serializedFileOperation(path, operation) {
    const promise = Promise.resolve(this.fileLocks.get(path)).then(() => operation.call(null));
    this.fileLocks.set(path, promise);
    return promise;
  }
  getMetadata(path) {
    const { promise, resolve } = Promise.withResolvers();
    this.domFileSystem.root.getFile(Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(path), void 0, fileEntryLoaded, errorHandler);
    return promise;
    function fileEntryLoaded(entry) {
      entry.getMetadata(resolve, errorHandler);
    }
    function errorHandler(error) {
      const errorMessage = _a.errorMessage(error);
      console.error(errorMessage + " when getting file metadata '" + path);
      resolve(null);
    }
  }
  initialFilePaths() {
    return [...this.#initialFilePaths];
  }
  initialGitFolders() {
    return [...this.#initialGitFolders];
  }
  embedderPath() {
    return this.#embedderPath;
  }
  initializeFilePaths() {
    return new Promise((fulfill) => {
      let pendingRequests = 1;
      const boundInnerCallback = innerCallback.bind(this);
      this.requestEntries(Platform2.DevToolsPath.EmptyRawPathString, boundInnerCallback);
      function innerCallback(entries) {
        for (let i = 0; i < entries.length; ++i) {
          const entry = entries[i];
          if (!entry.isDirectory) {
            if (this.isFileExcluded(Common2.ParsedURL.ParsedURL.rawPathToEncodedPathString(entry.fullPath))) {
              continue;
            }
            this.#initialFilePaths.add(Common2.ParsedURL.ParsedURL.rawPathToEncodedPathString(Common2.ParsedURL.ParsedURL.substr(entry.fullPath, 1)));
          } else {
            if (entry.fullPath.endsWith("/.git")) {
              const lastSlash = entry.fullPath.lastIndexOf("/");
              const parentFolder = Common2.ParsedURL.ParsedURL.substr(entry.fullPath, 1, lastSlash);
              this.#initialGitFolders.add(Common2.ParsedURL.ParsedURL.rawPathToEncodedPathString(parentFolder));
            }
            if (this.isFileExcluded(Common2.ParsedURL.ParsedURL.concatenate(Common2.ParsedURL.ParsedURL.rawPathToEncodedPathString(entry.fullPath), "/"))) {
              const url = Common2.ParsedURL.ParsedURL.concatenate(this.path(), Common2.ParsedURL.ParsedURL.rawPathToEncodedPathString(entry.fullPath));
              this.excludedEmbedderFolders.push(Common2.ParsedURL.ParsedURL.urlToRawPathString(url, Host.Platform.isWin()));
              continue;
            }
            ++pendingRequests;
            this.requestEntries(entry.fullPath, boundInnerCallback);
          }
        }
        if (--pendingRequests === 0) {
          fulfill();
        }
      }
    });
  }
  async createFoldersIfNotExist(folderPath) {
    let dirEntry = await new Promise((resolve) => this.domFileSystem.root.getDirectory(folderPath, void 0, resolve, () => resolve(null)));
    if (dirEntry) {
      return dirEntry;
    }
    const paths = folderPath.split("/");
    let activePath = "";
    for (const path of paths) {
      activePath = activePath + "/" + path;
      dirEntry = await this.#createFolderIfNeeded(activePath);
      if (!dirEntry) {
        return null;
      }
    }
    return dirEntry;
  }
  #createFolderIfNeeded(path) {
    return new Promise((resolve) => {
      this.domFileSystem.root.getDirectory(path, { create: true }, (dirEntry) => resolve(dirEntry), (error) => {
        this.domFileSystem.root.getFile(path, void 0, () => this.dispatchEventToListeners("file-system-error", i18nString2(UIStrings2.createDirFailedBecausePathIsFile, { PH1: path })), () => this.dispatchEventToListeners("file-system-error", i18nString2(UIStrings2.createDirFailed, { PH1: path })));
        const errorMessage = _a.errorMessage(error);
        console.error(errorMessage + " trying to create directory '" + path + "'");
        resolve(null);
      });
    });
  }
  async createFile(path, name) {
    const dirEntry = await this.createFoldersIfNotExist(Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(path));
    if (!dirEntry) {
      return null;
    }
    const fileEntry = await this.serializedFileOperation(path, createFileCandidate.bind(this, name || "NewFile"));
    if (!fileEntry) {
      return null;
    }
    return Common2.ParsedURL.ParsedURL.rawPathToEncodedPathString(Common2.ParsedURL.ParsedURL.substr(fileEntry.fullPath, 1));
    function createFileCandidate(name2, newFileIndex) {
      return new Promise((resolve) => {
        const nameCandidate = Common2.ParsedURL.ParsedURL.concatenate(name2, (newFileIndex || "").toString());
        dirEntry.getFile(nameCandidate, { create: true, exclusive: true }, resolve, (error) => {
          if (error.name === "InvalidModificationError") {
            resolve(createFileCandidate.call(this, name2, newFileIndex ? newFileIndex + 1 : 1));
            return;
          }
          const errorMessage = _a.errorMessage(error);
          console.error(errorMessage + " when testing if file exists '" + (this.path() + "/" + path + "/" + nameCandidate) + "'");
          resolve(null);
        });
      });
    }
  }
  deleteFile(path) {
    const { promise, resolve } = Promise.withResolvers();
    this.domFileSystem.root.getFile(Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(path), void 0, fileEntryLoaded.bind(this), errorHandler.bind(this));
    return promise;
    function fileEntryLoaded(fileEntry) {
      fileEntry.remove(fileEntryRemoved, errorHandler.bind(this));
    }
    function fileEntryRemoved() {
      resolve(true);
    }
    function errorHandler(error) {
      const errorMessage = _a.errorMessage(error);
      console.error(errorMessage + " when deleting file '" + (this.path() + "/" + path) + "'");
      resolve(false);
    }
  }
  deleteDirectoryRecursively(path) {
    const { promise, resolve } = Promise.withResolvers();
    this.domFileSystem.root.getDirectory(Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(path), void 0, dirEntryLoaded.bind(this), errorHandler.bind(this));
    return promise;
    function dirEntryLoaded(dirEntry) {
      dirEntry.removeRecursively(dirEntryRemoved, errorHandler.bind(this));
    }
    function dirEntryRemoved() {
      resolve(true);
    }
    function errorHandler(error) {
      const errorMessage = _a.errorMessage(error);
      console.error(errorMessage + " when deleting directory '" + (this.path() + "/" + path) + "'");
      resolve(false);
    }
  }
  requestFileBlob(path) {
    return new Promise((resolve) => {
      this.domFileSystem.root.getFile(Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(path), void 0, (entry) => {
        entry.file(resolve, errorHandler.bind(this));
      }, errorHandler.bind(this));
      function errorHandler(error) {
        if (error.name === "NotFoundError") {
          resolve(null);
          return;
        }
        const errorMessage = _a.errorMessage(error);
        console.error(errorMessage + " when getting content for file '" + (this.path() + "/" + path) + "'");
        resolve(null);
      }
    });
  }
  requestFileContent(path) {
    return this.serializedFileOperation(path, () => this.innerRequestFileContent(path));
  }
  async innerRequestFileContent(path) {
    const blob = await this.requestFileBlob(path);
    if (!blob) {
      return { error: i18nString2(UIStrings2.blobCouldNotBeLoaded) };
    }
    const mimeType = mimeTypeForBlob(path, blob);
    try {
      if (Platform2.MimeType.isTextType(mimeType)) {
        return new TextUtils.ContentData.ContentData(
          await blob.text(),
          /* isBase64 */
          false,
          mimeType
        );
      }
      return new TextUtils.ContentData.ContentData(
        await Common2.Base64.encode(blob),
        /* isBase64 */
        true,
        mimeType
      );
    } catch (e) {
      return { error: i18nString2(UIStrings2.cantReadFileSS, { PH1: path, PH2: e.message }) };
    }
  }
  async setFileContent(path, content, isBase64) {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.FileSavedInWorkspace);
    let resolve;
    const innerSetFileContent = () => {
      const promise = new Promise((x) => {
        resolve = x;
      });
      this.domFileSystem.root.getFile(Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(path), { create: true }, fileEntryLoaded.bind(this), errorHandler.bind(this));
      return promise;
    };
    void this.serializedFileOperation(path, innerSetFileContent);
    function fileEntryLoaded(entry) {
      entry.createWriter(fileWriterCreated.bind(this), errorHandler.bind(this));
    }
    async function fileWriterCreated(fileWriter) {
      fileWriter.onerror = errorHandler.bind(this);
      fileWriter.onwriteend = fileWritten;
      let blob;
      if (isBase64) {
        blob = await (await fetch(`data:application/octet-stream;base64,${content}`)).blob();
      } else {
        blob = new Blob([content], { type: "text/plain" });
      }
      fileWriter.write(blob);
      function fileWritten() {
        fileWriter.onwriteend = resolve;
        fileWriter.truncate(blob.size);
      }
    }
    function errorHandler(error) {
      const errorMessage = _a.errorMessage(error);
      console.error(errorMessage + " when setting content for file '" + (this.path() + "/" + path) + "'");
      resolve(void 0);
    }
  }
  renameFile(path, newName, callback) {
    newName = newName ? Common2.ParsedURL.ParsedURL.trim(newName) : newName;
    if (!newName || newName.indexOf("/") !== -1) {
      callback(false);
      return;
    }
    let fileEntry;
    let dirEntry;
    this.domFileSystem.root.getFile(Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(path), void 0, fileEntryLoaded.bind(this), errorHandler.bind(this));
    function fileEntryLoaded(entry) {
      if (entry.name === newName) {
        callback(false);
        return;
      }
      fileEntry = entry;
      fileEntry.getParent(dirEntryLoaded.bind(this), errorHandler.bind(this));
    }
    function dirEntryLoaded(entry) {
      dirEntry = entry;
      dirEntry.getFile(newName, void 0, newFileEntryLoaded, newFileEntryLoadErrorHandler.bind(this));
    }
    function newFileEntryLoaded(_entry) {
      callback(false);
    }
    function newFileEntryLoadErrorHandler(error) {
      if (error.name !== "NotFoundError") {
        callback(false);
        return;
      }
      fileEntry.moveTo(dirEntry, newName, fileRenamed, errorHandler.bind(this));
    }
    function fileRenamed(entry) {
      callback(true, entry.name);
    }
    function errorHandler(error) {
      const errorMessage = _a.errorMessage(error);
      console.error(errorMessage + " when renaming file '" + (this.path() + "/" + path) + "' to '" + newName + "'");
      callback(false);
    }
  }
  readDirectory(dirEntry, callback) {
    const dirReader = dirEntry.createReader();
    let entries = [];
    function innerCallback(results) {
      if (!results.length) {
        callback(entries.sort());
      } else {
        entries = entries.concat(toArray(results));
        dirReader.readEntries(innerCallback, errorHandler);
      }
    }
    function toArray(list) {
      return Array.prototype.slice.call(list || [], 0);
    }
    dirReader.readEntries(innerCallback, errorHandler);
    function errorHandler(error) {
      const errorMessage = _a.errorMessage(error);
      console.error(errorMessage + " when reading directory '" + dirEntry.fullPath + "'");
      callback([]);
    }
  }
  requestEntries(path, callback) {
    this.domFileSystem.root.getDirectory(path, void 0, innerCallback.bind(this), errorHandler);
    function innerCallback(dirEntry) {
      this.readDirectory(dirEntry, callback);
    }
    function errorHandler(error) {
      const errorMessage = _a.errorMessage(error);
      console.error(errorMessage + " when requesting entry '" + path + "'");
      callback([]);
    }
  }
  saveExcludedFolders() {
    const settingValue = this.excludedFoldersSetting.get();
    settingValue[this.path()] = [...this.#excludedFolders];
    this.excludedFoldersSetting.set(settingValue);
  }
  addExcludedFolder(path) {
    this.#excludedFolders.add(path);
    this.saveExcludedFolders();
    this.manager.dispatchEventToListeners(Events.ExcludedFolderAdded, path);
  }
  removeExcludedFolder(path) {
    this.#excludedFolders.delete(path);
    this.saveExcludedFolders();
    this.manager.dispatchEventToListeners(Events.ExcludedFolderRemoved, path);
  }
  fileSystemRemoved() {
    const settingValue = this.excludedFoldersSetting.get();
    delete settingValue[this.path()];
    this.excludedFoldersSetting.set(settingValue);
  }
  isFileExcluded(folderPath) {
    if (this.#excludedFolders.has(folderPath)) {
      return true;
    }
    const regex = this.manager.workspaceFolderExcludePatternSetting().asRegExp();
    return Boolean(regex?.test(Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(folderPath)));
  }
  excludedFolders() {
    return this.#excludedFolders;
  }
  searchInPath(query, progress) {
    return new Promise((resolve) => {
      const requestId = this.manager.registerCallback(innerCallback);
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.searchInPath(requestId, this.#embedderPath, query);
      function innerCallback(files) {
        resolve(files.map((path) => Common2.ParsedURL.ParsedURL.rawPathToUrlString(path)));
        ++progress.worked;
      }
    });
  }
  indexContent(progress) {
    progress.totalWork = 1;
    const requestId = this.manager.registerProgress(progress);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.indexPath(requestId, this.#embedderPath, JSON.stringify(this.excludedEmbedderFolders));
  }
  mimeFromPath(path) {
    return Common2.ResourceType.ResourceType.mimeFromURL(path) || "text/plain";
  }
  canExcludeFolder(path) {
    return Boolean(path) && this.type() !== PlatformFileSystemType.OVERRIDES;
  }
  // path not typed as Branded Types as here we are interested in extention only
  contentType(path) {
    const extension = Common2.ParsedURL.ParsedURL.extractExtension(path);
    if (STYLE_SHEET_EXTENSIONS.has(extension)) {
      return Common2.ResourceType.resourceTypes.Stylesheet;
    }
    if (DOCUMENT_EXTENSIONS.has(extension)) {
      return Common2.ResourceType.resourceTypes.Document;
    }
    if (IMAGE_EXTENSIONS.has(extension)) {
      return Common2.ResourceType.resourceTypes.Image;
    }
    if (SCRIPT_EXTENSIONS.has(extension)) {
      return Common2.ResourceType.resourceTypes.Script;
    }
    return BinaryExtensions.has(extension) ? Common2.ResourceType.resourceTypes.Other : Common2.ResourceType.resourceTypes.Document;
  }
  tooltipForURL(url) {
    const path = Platform2.StringUtilities.trimMiddle(Common2.ParsedURL.ParsedURL.urlToRawPathString(url, Host.Platform.isWin()), 150);
    return i18nString2(UIStrings2.linkedToS, { PH1: path });
  }
  supportsAutomapping() {
    return this.type() !== PlatformFileSystemType.OVERRIDES;
  }
};
_a = IsolatedFileSystem;
function mimeTypeForBlob(path, blob) {
  if (blob.type) {
    return blob.type;
  }
  const extension = Common2.ParsedURL.ParsedURL.extractExtension(path);
  const maybeMime = Common2.ResourceType.ResourceType.mimeFromExtension(extension);
  if (maybeMime) {
    return maybeMime;
  }
  return BinaryExtensions.has(extension) ? "application/octet-stream" : "text/plain";
}
var STYLE_SHEET_EXTENSIONS = /* @__PURE__ */ new Set(["css", "scss", "sass", "less"]);
var DOCUMENT_EXTENSIONS = /* @__PURE__ */ new Set(["htm", "html", "asp", "aspx", "phtml", "jsp"]);
var SCRIPT_EXTENSIONS = /* @__PURE__ */ new Set([
  "asp",
  "aspx",
  "c",
  "cc",
  "cljs",
  "coffee",
  "cpp",
  "cs",
  "dart",
  "java",
  "js",
  "jsp",
  "jsx",
  "h",
  "m",
  "mjs",
  "mm",
  "py",
  "sh",
  "ts",
  "tsx",
  "ls"
]);
var IMAGE_EXTENSIONS = /* @__PURE__ */ new Set(["jpeg", "jpg", "svg", "gif", "webp", "png", "ico", "tiff", "tif", "bmp"]);
var BinaryExtensions = /* @__PURE__ */ new Set([
  // Executable extensions, roughly taken from https://en.wikipedia.org/wiki/Comparison_of_executable_file_formats
  "cmd",
  "com",
  "exe",
  // Archive extensions, roughly taken from https://en.wikipedia.org/wiki/List_of_archive_formats
  "a",
  "ar",
  "iso",
  "tar",
  "bz2",
  "gz",
  "lz",
  "lzma",
  "z",
  "7z",
  "apk",
  "arc",
  "cab",
  "dmg",
  "jar",
  "pak",
  "rar",
  "zip",
  // Audio file extensions, roughly taken from https://en.wikipedia.org/wiki/Audio_file_format#List_of_formats
  "3gp",
  "aac",
  "aiff",
  "flac",
  "m4a",
  "mmf",
  "mp3",
  "ogg",
  "oga",
  "raw",
  "sln",
  "wav",
  "wma",
  "webm",
  // Video file extensions, roughly taken from https://en.wikipedia.org/wiki/Video_file_format
  "mkv",
  "flv",
  "vob",
  "ogv",
  "gifv",
  "avi",
  "mov",
  "qt",
  "mp4",
  "m4p",
  "m4v",
  "mpg",
  "mpeg",
  // Image file extensions
  "jpeg",
  "jpg",
  "gif",
  "webp",
  "png",
  "ico",
  "tiff",
  "tif",
  "bmp"
]);

// gen/front_end/models/persistence/IsolatedFileSystemManager.js
var UIStrings3 = {
  /**
   * @description Text in Isolated File System Manager of the Workspace settings in Settings
   * @example {folder does not exist} PH1
   */
  unableToAddFilesystemS: "Unable to add filesystem: {PH1}"
};
var str_3 = i18n5.i18n.registerUIStrings("models/persistence/IsolatedFileSystemManager.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var isolatedFileSystemManagerInstance;
var IsolatedFileSystemManager = class _IsolatedFileSystemManager extends Common3.ObjectWrapper.ObjectWrapper {
  #fileSystems;
  callbacks;
  progresses;
  #workspaceFolderExcludePatternSetting;
  fileSystemRequestResolve;
  fileSystemsLoadedPromise;
  constructor() {
    super();
    this.#fileSystems = /* @__PURE__ */ new Map();
    this.callbacks = /* @__PURE__ */ new Map();
    this.progresses = /* @__PURE__ */ new Map();
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host2.InspectorFrontendHostAPI.Events.FileSystemRemoved, this.onFileSystemRemoved, this);
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host2.InspectorFrontendHostAPI.Events.FileSystemAdded, (event) => {
      this.onFileSystemAdded(event);
    }, this);
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host2.InspectorFrontendHostAPI.Events.FileSystemFilesChangedAddedRemoved, this.onFileSystemFilesChanged, this);
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host2.InspectorFrontendHostAPI.Events.IndexingTotalWorkCalculated, this.onIndexingTotalWorkCalculated, this);
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host2.InspectorFrontendHostAPI.Events.IndexingWorked, this.onIndexingWorked, this);
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host2.InspectorFrontendHostAPI.Events.IndexingDone, this.onIndexingDone, this);
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host2.InspectorFrontendHostAPI.Events.SearchCompleted, this.onSearchCompleted, this);
    const defaultCommonExcludedFolders = [
      "/node_modules/",
      "/\\.devtools",
      "/\\.git/",
      "/\\.sass-cache/",
      "/\\.hg/",
      "/\\.idea/",
      "/\\.svn/",
      "/\\.cache/",
      "/\\.project/",
      "/\\.next/"
    ];
    const defaultWinExcludedFolders = ["/Thumbs.db$", "/ehthumbs.db$", "/Desktop.ini$", "/\\$RECYCLE.BIN/"];
    const defaultMacExcludedFolders = [
      "/\\.DS_Store$",
      "/\\.Trashes$",
      "/\\.Spotlight-V100$",
      "/\\.AppleDouble$",
      "/\\.LSOverride$",
      "/Icon$",
      "/\\._.*$"
    ];
    const defaultLinuxExcludedFolders = ["/.*~$"];
    let defaultExcludedFolders = defaultCommonExcludedFolders;
    if (Host2.Platform.isWin()) {
      defaultExcludedFolders = defaultExcludedFolders.concat(defaultWinExcludedFolders);
    } else if (Host2.Platform.isMac()) {
      defaultExcludedFolders = defaultExcludedFolders.concat(defaultMacExcludedFolders);
    } else {
      defaultExcludedFolders = defaultExcludedFolders.concat(defaultLinuxExcludedFolders);
    }
    const defaultExcludedFoldersPattern = defaultExcludedFolders.join("|");
    this.#workspaceFolderExcludePatternSetting = Common3.Settings.Settings.instance().createRegExpSetting("workspace-folder-exclude-pattern", defaultExcludedFoldersPattern, Host2.Platform.isWin() ? "i" : "");
    this.fileSystemRequestResolve = null;
    this.fileSystemsLoadedPromise = this.requestFileSystems();
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!isolatedFileSystemManagerInstance || forceNew) {
      isolatedFileSystemManagerInstance = new _IsolatedFileSystemManager();
    }
    return isolatedFileSystemManagerInstance;
  }
  static removeInstance() {
    isolatedFileSystemManagerInstance = null;
  }
  requestFileSystems() {
    const { resolve, promise } = Promise.withResolvers();
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host2.InspectorFrontendHostAPI.Events.FileSystemsLoaded, onFileSystemsLoaded, this);
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.requestFileSystems();
    return promise;
    function onFileSystemsLoaded(event) {
      const fileSystems = event.data;
      const promises = [];
      for (let i = 0; i < fileSystems.length; ++i) {
        promises.push(this.#addFileSystem(fileSystems[i], false));
      }
      void Promise.all(promises).then(onFileSystemsAdded);
    }
    function onFileSystemsAdded(fileSystems) {
      resolve(fileSystems.filter((fs) => !!fs));
    }
  }
  addFileSystem(type) {
    Host2.userMetrics.actionTaken(type === "overrides" ? Host2.UserMetrics.Action.OverrideTabAddFolder : Host2.UserMetrics.Action.WorkspaceTabAddFolder);
    return new Promise((resolve) => {
      this.fileSystemRequestResolve = resolve;
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.addFileSystem(type || "");
    });
  }
  removeFileSystem(fileSystem) {
    Host2.userMetrics.actionTaken(fileSystem.type() === PlatformFileSystemType.OVERRIDES ? Host2.UserMetrics.Action.OverrideTabRemoveFolder : Host2.UserMetrics.Action.WorkspaceTabRemoveFolder);
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.removeFileSystem(fileSystem.embedderPath());
  }
  waitForFileSystems() {
    return this.fileSystemsLoadedPromise;
  }
  #addFileSystem(fileSystem, dispatchEvent) {
    const embedderPath = fileSystem.fileSystemPath;
    const fileSystemURL = Common3.ParsedURL.ParsedURL.rawPathToUrlString(fileSystem.fileSystemPath);
    const promise = IsolatedFileSystem.create(this, fileSystemURL, embedderPath, hostFileSystemTypeToPlatformFileSystemType(fileSystem.type), fileSystem.fileSystemName, fileSystem.rootURL, fileSystem.type === "automatic");
    return promise.then(storeFileSystem.bind(this));
    function storeFileSystem(fileSystem2) {
      if (!fileSystem2) {
        return null;
      }
      this.#fileSystems.set(fileSystemURL, fileSystem2);
      fileSystem2.addEventListener("file-system-error", this.#onFileSystemError, this);
      if (dispatchEvent) {
        this.dispatchEventToListeners(Events.FileSystemAdded, fileSystem2);
      }
      return fileSystem2;
    }
  }
  addPlatformFileSystem(fileSystemURL, fileSystem) {
    this.#fileSystems.set(fileSystemURL, fileSystem);
    fileSystem.addEventListener("file-system-error", this.#onFileSystemError, this);
    this.dispatchEventToListeners(Events.FileSystemAdded, fileSystem);
  }
  onFileSystemAdded(event) {
    const { errorMessage, fileSystem } = event.data;
    if (errorMessage) {
      if (errorMessage !== "<selection cancelled>" && errorMessage !== "<permission denied>") {
        Common3.Console.Console.instance().error(i18nString3(UIStrings3.unableToAddFilesystemS, { PH1: errorMessage }));
      }
      if (!this.fileSystemRequestResolve) {
        return;
      }
      this.fileSystemRequestResolve.call(null, null);
      this.fileSystemRequestResolve = null;
    } else if (fileSystem) {
      void this.#addFileSystem(fileSystem, true).then((fileSystem2) => {
        if (this.fileSystemRequestResolve) {
          this.fileSystemRequestResolve.call(null, fileSystem2);
          this.fileSystemRequestResolve = null;
        }
      });
    }
  }
  #onFileSystemError(event) {
    this.dispatchEventToListeners(Events.FileSystemError, event.data);
  }
  onFileSystemRemoved(event) {
    const embedderPath = event.data;
    const fileSystemPath = Common3.ParsedURL.ParsedURL.rawPathToUrlString(embedderPath);
    const isolatedFileSystem = this.#fileSystems.get(fileSystemPath);
    if (!isolatedFileSystem) {
      return;
    }
    this.#fileSystems.delete(fileSystemPath);
    isolatedFileSystem.removeEventListener("file-system-error", this.#onFileSystemError, this);
    isolatedFileSystem.fileSystemRemoved();
    this.dispatchEventToListeners(Events.FileSystemRemoved, isolatedFileSystem);
  }
  onFileSystemFilesChanged(event) {
    const urlPaths = {
      changed: groupFilePathsIntoFileSystemPaths.call(this, event.data.changed),
      added: groupFilePathsIntoFileSystemPaths.call(this, event.data.added),
      removed: groupFilePathsIntoFileSystemPaths.call(this, event.data.removed)
    };
    this.dispatchEventToListeners(Events.FileSystemFilesChanged, urlPaths);
    function groupFilePathsIntoFileSystemPaths(embedderPaths) {
      const paths = new Platform4.MapUtilities.Multimap();
      for (const embedderPath of embedderPaths) {
        const filePath = Common3.ParsedURL.ParsedURL.rawPathToUrlString(embedderPath);
        for (const fileSystemPath of this.#fileSystems.keys()) {
          const fileSystem = this.#fileSystems.get(fileSystemPath);
          if (fileSystem?.isFileExcluded(Common3.ParsedURL.ParsedURL.rawPathToEncodedPathString(embedderPath))) {
            continue;
          }
          const pathPrefix = fileSystemPath.endsWith("/") ? fileSystemPath : fileSystemPath + "/";
          if (!filePath.startsWith(pathPrefix)) {
            continue;
          }
          paths.set(fileSystemPath, filePath);
        }
      }
      return paths;
    }
  }
  fileSystems() {
    return [...this.#fileSystems.values()];
  }
  fileSystem(fileSystemPath) {
    return this.#fileSystems.get(fileSystemPath) || null;
  }
  workspaceFolderExcludePatternSetting() {
    return this.#workspaceFolderExcludePatternSetting;
  }
  registerCallback(callback) {
    const requestId = ++lastRequestId;
    this.callbacks.set(requestId, callback);
    return requestId;
  }
  registerProgress(progress) {
    const requestId = ++lastRequestId;
    this.progresses.set(requestId, progress);
    return requestId;
  }
  onIndexingTotalWorkCalculated(event) {
    const { requestId, totalWork } = event.data;
    const progress = this.progresses.get(requestId);
    if (!progress) {
      return;
    }
    progress.totalWork = totalWork;
  }
  onIndexingWorked(event) {
    const { requestId, worked } = event.data;
    const progress = this.progresses.get(requestId);
    if (!progress) {
      return;
    }
    progress.worked += worked;
    if (progress.canceled) {
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.stopIndexing(requestId);
      this.onIndexingDone(event);
    }
  }
  onIndexingDone(event) {
    const { requestId } = event.data;
    const progress = this.progresses.get(requestId);
    if (!progress) {
      return;
    }
    progress.done = true;
    this.progresses.delete(requestId);
  }
  onSearchCompleted(event) {
    const { requestId, files } = event.data;
    const callback = this.callbacks.get(requestId);
    if (!callback) {
      return;
    }
    callback.call(null, files);
    this.callbacks.delete(requestId);
  }
};
var Events;
(function(Events3) {
  Events3["FileSystemAdded"] = "FileSystemAdded";
  Events3["FileSystemRemoved"] = "FileSystemRemoved";
  Events3["FileSystemFilesChanged"] = "FileSystemFilesChanged";
  Events3["ExcludedFolderAdded"] = "ExcludedFolderAdded";
  Events3["ExcludedFolderRemoved"] = "ExcludedFolderRemoved";
  Events3["FileSystemError"] = "FileSystemError";
})(Events || (Events = {}));
var lastRequestId = 0;
function hostFileSystemTypeToPlatformFileSystemType(type) {
  switch (type) {
    case "snippets":
      return PlatformFileSystemType.SNIPPETS;
    case "overrides":
      return PlatformFileSystemType.OVERRIDES;
    default:
      return PlatformFileSystemType.WORKSPACE_PROJECT;
  }
}

// gen/front_end/models/persistence/FileSystemWorkspaceBinding.js
var FileSystemWorkspaceBinding = class {
  isolatedFileSystemManager;
  #workspace;
  #eventListeners;
  #boundFileSystems = /* @__PURE__ */ new Map();
  constructor(isolatedFileSystemManager, workspace) {
    this.isolatedFileSystemManager = isolatedFileSystemManager;
    this.#workspace = workspace;
    this.#eventListeners = [
      this.isolatedFileSystemManager.addEventListener(Events.FileSystemAdded, this.onFileSystemAdded, this),
      this.isolatedFileSystemManager.addEventListener(Events.FileSystemRemoved, this.onFileSystemRemoved, this),
      this.isolatedFileSystemManager.addEventListener(Events.FileSystemFilesChanged, this.fileSystemFilesChanged, this)
    ];
    void this.isolatedFileSystemManager.waitForFileSystems().then(this.onFileSystemsLoaded.bind(this));
  }
  static projectId(fileSystemPath) {
    return fileSystemPath;
  }
  static relativePath(uiSourceCode) {
    const baseURL = uiSourceCode.project().fileSystemBaseURL;
    return Common4.ParsedURL.ParsedURL.split(Common4.ParsedURL.ParsedURL.sliceUrlToEncodedPathString(uiSourceCode.url(), baseURL.length), "/");
  }
  static tooltipForUISourceCode(uiSourceCode) {
    const fileSystem = uiSourceCode.project().fileSystem();
    return fileSystem.tooltipForURL(uiSourceCode.url());
  }
  static fileSystemType(project) {
    if (project instanceof FileSystem) {
      return project.fileSystem().type();
    }
    throw new TypeError("project is not a FileSystem");
  }
  static fileSystemSupportsAutomapping(project) {
    const fileSystem = project.fileSystem();
    return fileSystem.supportsAutomapping();
  }
  static completeURL(project, relativePath) {
    const fsProject = project;
    return Common4.ParsedURL.ParsedURL.concatenate(fsProject.fileSystemBaseURL, relativePath);
  }
  static fileSystemPath(projectId) {
    return projectId;
  }
  onFileSystemsLoaded(fileSystems) {
    for (const fileSystem of fileSystems) {
      this.addFileSystem(fileSystem);
    }
  }
  onFileSystemAdded(event) {
    const fileSystem = event.data;
    this.addFileSystem(fileSystem);
  }
  addFileSystem(fileSystem) {
    const boundFileSystem = new FileSystem(this, fileSystem, this.#workspace);
    this.#boundFileSystems.set(fileSystem.path(), boundFileSystem);
  }
  onFileSystemRemoved(event) {
    const fileSystem = event.data;
    const boundFileSystem = this.#boundFileSystems.get(fileSystem.path());
    if (boundFileSystem) {
      boundFileSystem.dispose();
    }
    this.#boundFileSystems.delete(fileSystem.path());
  }
  fileSystemFilesChanged(event) {
    const paths = event.data;
    for (const fileSystemPath of paths.changed.keysArray()) {
      const fileSystem = this.#boundFileSystems.get(fileSystemPath);
      if (!fileSystem) {
        continue;
      }
      paths.changed.get(fileSystemPath).forEach((path) => fileSystem.fileChanged(path));
    }
    for (const fileSystemPath of paths.added.keysArray()) {
      const fileSystem = this.#boundFileSystems.get(fileSystemPath);
      if (!fileSystem) {
        continue;
      }
      paths.added.get(fileSystemPath).forEach((path) => fileSystem.fileChanged(path));
    }
    for (const fileSystemPath of paths.removed.keysArray()) {
      const fileSystem = this.#boundFileSystems.get(fileSystemPath);
      if (!fileSystem) {
        continue;
      }
      paths.removed.get(fileSystemPath).forEach((path) => fileSystem.removeUISourceCode(path));
    }
  }
  dispose() {
    Common4.EventTarget.removeEventListeners(this.#eventListeners);
    for (const fileSystem of this.#boundFileSystems.values()) {
      fileSystem.dispose();
      this.#boundFileSystems.delete(fileSystem.fileSystem().path());
    }
  }
};
var FileSystem = class extends Workspace.Workspace.ProjectStore {
  #fileSystem;
  fileSystemBaseURL;
  #fileSystemParentURL;
  #fileSystemWorkspaceBinding;
  #fileSystemPath;
  #creatingFilesGuard = /* @__PURE__ */ new Set();
  constructor(fileSystemWorkspaceBinding, isolatedFileSystem, workspace) {
    const fileSystemPath = isolatedFileSystem.path();
    const id = FileSystemWorkspaceBinding.projectId(fileSystemPath);
    console.assert(!workspace.project(id));
    const displayName = fileSystemPath.substr(fileSystemPath.lastIndexOf("/") + 1);
    super(workspace, id, Workspace.Workspace.projectTypes.FileSystem, displayName);
    this.#fileSystem = isolatedFileSystem;
    this.fileSystemBaseURL = Common4.ParsedURL.ParsedURL.concatenate(this.#fileSystem.path(), "/");
    this.#fileSystemParentURL = Common4.ParsedURL.ParsedURL.substr(this.fileSystemBaseURL, 0, fileSystemPath.lastIndexOf("/") + 1);
    this.#fileSystemWorkspaceBinding = fileSystemWorkspaceBinding;
    this.#fileSystemPath = fileSystemPath;
    workspace.addProject(this);
    this.populate();
  }
  fileSystemPath() {
    return this.#fileSystemPath;
  }
  fileSystem() {
    return this.#fileSystem;
  }
  mimeType(uiSourceCode) {
    return this.#fileSystem.mimeFromPath(uiSourceCode.url());
  }
  initialGitFolders() {
    return this.#fileSystem.initialGitFolders().map((folder) => Common4.ParsedURL.ParsedURL.concatenate(this.#fileSystemPath, "/", folder));
  }
  filePathForUISourceCode(uiSourceCode) {
    return Common4.ParsedURL.ParsedURL.sliceUrlToEncodedPathString(uiSourceCode.url(), this.#fileSystemPath.length);
  }
  isServiceProject() {
    return false;
  }
  requestMetadata(uiSourceCode) {
    const metadata = sourceCodeToMetadataMap.get(uiSourceCode);
    if (metadata) {
      return metadata;
    }
    const relativePath = this.filePathForUISourceCode(uiSourceCode);
    const promise = this.#fileSystem.getMetadata(relativePath).then(onMetadata);
    sourceCodeToMetadataMap.set(uiSourceCode, promise);
    return promise;
    function onMetadata(metadata2) {
      if (!metadata2) {
        return null;
      }
      return new Workspace.UISourceCode.UISourceCodeMetadata(metadata2.modificationTime, metadata2.size);
    }
  }
  requestFileBlob(uiSourceCode) {
    return this.#fileSystem.requestFileBlob(this.filePathForUISourceCode(uiSourceCode));
  }
  requestFileContent(uiSourceCode) {
    const filePath = this.filePathForUISourceCode(uiSourceCode);
    return this.#fileSystem.requestFileContent(filePath);
  }
  canSetFileContent() {
    return true;
  }
  async setFileContent(uiSourceCode, newContent, isBase64) {
    const filePath = this.filePathForUISourceCode(uiSourceCode);
    this.#fileSystem.setFileContent(filePath, newContent, isBase64);
  }
  fullDisplayName(uiSourceCode) {
    const baseURL = uiSourceCode.project().#fileSystemParentURL;
    return uiSourceCode.url().substring(baseURL.length);
  }
  canRename() {
    return true;
  }
  rename(uiSourceCode, newName, callback) {
    if (newName === uiSourceCode.name()) {
      callback(true, uiSourceCode.name(), uiSourceCode.url(), uiSourceCode.contentType());
      return;
    }
    let filePath = this.filePathForUISourceCode(uiSourceCode);
    this.#fileSystem.renameFile(filePath, newName, innerCallback.bind(this));
    function innerCallback(success, newName2) {
      if (!success || !newName2) {
        callback(false, newName2);
        return;
      }
      console.assert(Boolean(newName2));
      const slash = filePath.lastIndexOf("/");
      const parentPath = Common4.ParsedURL.ParsedURL.substr(filePath, 0, slash);
      filePath = Common4.ParsedURL.ParsedURL.encodedFromParentPathAndName(parentPath, newName2);
      filePath = Common4.ParsedURL.ParsedURL.substr(filePath, 1);
      const newURL = Common4.ParsedURL.ParsedURL.concatenate(this.fileSystemBaseURL, filePath);
      const newContentType = this.#fileSystem.contentType(newName2);
      this.renameUISourceCode(uiSourceCode, newName2);
      callback(true, newName2, newURL, newContentType);
    }
  }
  async searchInFileContent(uiSourceCode, query, caseSensitive, isRegex) {
    const filePath = this.filePathForUISourceCode(uiSourceCode);
    const content = await this.#fileSystem.requestFileContent(filePath);
    return TextUtils2.TextUtils.performSearchInContentData(content, query, caseSensitive, isRegex);
  }
  async findFilesMatchingSearchRequest(searchConfig, filesMatchingFileQuery, progress) {
    let workingFileSet = filesMatchingFileQuery.map((uiSoureCode) => uiSoureCode.url());
    const queriesToRun = searchConfig.queries().slice();
    if (!queriesToRun.length) {
      queriesToRun.push("");
    }
    progress.totalWork = queriesToRun.length;
    for (const query of queriesToRun) {
      const files = await this.#fileSystem.searchInPath(searchConfig.isRegex() ? "" : query, progress);
      files.sort(Platform5.StringUtilities.naturalOrderComparator);
      workingFileSet = Platform5.ArrayUtilities.intersectOrdered(workingFileSet, files, Platform5.StringUtilities.naturalOrderComparator);
      ++progress.worked;
    }
    const result = /* @__PURE__ */ new Map();
    for (const file of workingFileSet) {
      const uiSourceCode = this.uiSourceCodeForURL(file);
      if (uiSourceCode) {
        result.set(uiSourceCode, null);
      }
    }
    progress.done = true;
    return result;
  }
  indexContent(progress) {
    this.#fileSystem.indexContent(progress);
  }
  populate() {
    const filePaths = this.#fileSystem.initialFilePaths();
    if (filePaths.length === 0) {
      return;
    }
    const chunkSize = 1e3;
    const startTime = performance.now();
    reportFileChunk.call(this, 0);
    function reportFileChunk(from) {
      const to = Math.min(from + chunkSize, filePaths.length);
      for (let i = from; i < to; ++i) {
        this.addFile(filePaths[i]);
      }
      if (to < filePaths.length) {
        window.setTimeout(reportFileChunk.bind(this, to), 100);
      } else if (this.type() === "filesystem") {
        Host3.userMetrics.workspacesPopulated(performance.now() - startTime);
      }
    }
  }
  excludeFolder(url) {
    let relativeFolder = Common4.ParsedURL.ParsedURL.sliceUrlToEncodedPathString(url, this.fileSystemBaseURL.length);
    if (!relativeFolder.startsWith("/")) {
      relativeFolder = Common4.ParsedURL.ParsedURL.prepend("/", relativeFolder);
    }
    if (!relativeFolder.endsWith("/")) {
      relativeFolder = Common4.ParsedURL.ParsedURL.concatenate(relativeFolder, "/");
    }
    this.#fileSystem.addExcludedFolder(relativeFolder);
    for (const uiSourceCode of this.uiSourceCodes()) {
      if (uiSourceCode.url().startsWith(url)) {
        this.removeUISourceCode(uiSourceCode.url());
      }
    }
  }
  canExcludeFolder(path) {
    return this.#fileSystem.canExcludeFolder(path);
  }
  canCreateFile() {
    return true;
  }
  async createFile(path, name, content, isBase64) {
    const guardFileName = this.#fileSystemPath + path + (!path.endsWith("/") ? "/" : "") + name;
    this.#creatingFilesGuard.add(guardFileName);
    const filePath = await this.#fileSystem.createFile(path, name);
    if (!filePath) {
      return null;
    }
    const uiSourceCode = this.addFile(filePath, content, isBase64);
    this.#creatingFilesGuard.delete(guardFileName);
    return uiSourceCode;
  }
  deleteFile(uiSourceCode) {
    const relativePath = this.filePathForUISourceCode(uiSourceCode);
    void this.#fileSystem.deleteFile(relativePath).then((success) => {
      if (success) {
        this.removeUISourceCode(uiSourceCode.url());
      }
    });
  }
  deleteDirectoryRecursively(path) {
    return this.#fileSystem.deleteDirectoryRecursively(path);
  }
  remove() {
    this.#fileSystemWorkspaceBinding.isolatedFileSystemManager.removeFileSystem(this.#fileSystem);
  }
  addFile(filePath, content, isBase64) {
    const contentType = this.#fileSystem.contentType(filePath);
    const uiSourceCode = this.createUISourceCode(Common4.ParsedURL.ParsedURL.concatenate(this.fileSystemBaseURL, filePath), contentType);
    if (content !== void 0) {
      uiSourceCode.setContent(content, Boolean(isBase64));
    }
    this.addUISourceCode(uiSourceCode);
    return uiSourceCode;
  }
  fileChanged(path) {
    if (this.#creatingFilesGuard.has(path)) {
      return;
    }
    const uiSourceCode = this.uiSourceCodeForURL(path);
    if (!uiSourceCode) {
      const contentType = this.#fileSystem.contentType(path);
      this.addUISourceCode(this.createUISourceCode(path, contentType));
      return;
    }
    sourceCodeToMetadataMap.delete(uiSourceCode);
    void uiSourceCode.checkContentUpdated();
  }
  tooltipForURL(url) {
    return this.#fileSystem.tooltipForURL(url);
  }
  dispose() {
    this.removeProject();
  }
};
var sourceCodeToMetadataMap = /* @__PURE__ */ new WeakMap();

// gen/front_end/models/persistence/PersistenceImpl.js
var PersistenceImpl_exports = {};
__export(PersistenceImpl_exports, {
  Events: () => Events2,
  NodePrefix: () => NodePrefix,
  NodeShebang: () => NodeShebang,
  NodeSuffix: () => NodeSuffix,
  PersistenceBinding: () => PersistenceBinding,
  PersistenceImpl: () => PersistenceImpl
});
import * as Common5 from "./../../core/common/common.js";
import * as Host4 from "./../../core/host/host.js";
import * as Platform7 from "./../../core/platform/platform.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Bindings from "./../bindings/bindings.js";
import * as BreakpointManager from "./../breakpoints/breakpoints.js";
import * as TextUtils4 from "./../text_utils/text_utils.js";
import * as Workspace3 from "./../workspace/workspace.js";
var persistenceInstance;
var PersistenceImpl = class _PersistenceImpl extends Common5.ObjectWrapper.ObjectWrapper {
  #workspace;
  #breakpointManager;
  #filePathPrefixesToBindingCount = new FilePathPrefixesBindingCounts();
  #subscribedBindingEventListeners = new Platform7.MapUtilities.Multimap();
  #mapping;
  constructor(workspace, breakpointManager) {
    super();
    this.#workspace = workspace;
    this.#breakpointManager = breakpointManager;
    this.#breakpointManager.addUpdateBindingsCallback(this.#setupBindings.bind(this));
    this.#mapping = new Automapping(this.#workspace, this.onStatusAdded.bind(this), this.onStatusRemoved.bind(this));
  }
  static instance(opts = { forceNew: null, workspace: null, breakpointManager: null }) {
    const { forceNew, workspace, breakpointManager } = opts;
    if (!persistenceInstance || forceNew) {
      if (!workspace || !breakpointManager) {
        throw new Error("Missing arguments for workspace");
      }
      persistenceInstance = new _PersistenceImpl(workspace, breakpointManager);
    }
    return persistenceInstance;
  }
  addNetworkInterceptor(interceptor) {
    this.#mapping.addNetworkInterceptor(interceptor);
  }
  refreshAutomapping() {
    this.#mapping.scheduleRemap();
  }
  async addBinding(binding) {
    await this.#addBinding(binding);
  }
  async addBindingForTest(binding) {
    await this.#addBinding(binding);
  }
  async removeBinding(binding) {
    await this.#removeBinding(binding);
  }
  async removeBindingForTest(binding) {
    await this.#removeBinding(binding);
  }
  #setupBindings(networkUISourceCode) {
    if (networkUISourceCode.project().type() !== Workspace3.Workspace.projectTypes.Network) {
      return Promise.resolve();
    }
    return this.#mapping.computeNetworkStatus(networkUISourceCode);
  }
  async #addBinding(binding) {
    bindings.set(binding.network, binding);
    bindings.set(binding.fileSystem, binding);
    binding.fileSystem.forceLoadOnCheckContent();
    binding.network.addEventListener(Workspace3.UISourceCode.Events.WorkingCopyCommitted, this.onWorkingCopyCommitted, this);
    binding.fileSystem.addEventListener(Workspace3.UISourceCode.Events.WorkingCopyCommitted, this.onWorkingCopyCommitted, this);
    binding.network.addEventListener(Workspace3.UISourceCode.Events.WorkingCopyChanged, this.onWorkingCopyChanged, this);
    binding.fileSystem.addEventListener(Workspace3.UISourceCode.Events.WorkingCopyChanged, this.onWorkingCopyChanged, this);
    this.#filePathPrefixesToBindingCount.add(binding.fileSystem.url());
    await this.moveBreakpoints(binding.fileSystem, binding.network);
    console.assert(!binding.fileSystem.isDirty() || !binding.network.isDirty());
    if (binding.fileSystem.isDirty()) {
      this.syncWorkingCopy(binding.fileSystem);
    } else if (binding.network.isDirty()) {
      this.syncWorkingCopy(binding.network);
    } else if (binding.network.hasCommits() && binding.network.content() !== binding.fileSystem.content()) {
      binding.network.setWorkingCopy(binding.network.content());
      this.syncWorkingCopy(binding.network);
    }
    this.notifyBindingEvent(binding.network);
    this.notifyBindingEvent(binding.fileSystem);
    this.dispatchEventToListeners(Events2.BindingCreated, binding);
  }
  async #removeBinding(binding) {
    if (bindings.get(binding.network) !== binding) {
      return;
    }
    console.assert(bindings.get(binding.network) === bindings.get(binding.fileSystem), "ERROR: inconsistent binding for networkURL " + binding.network.url());
    bindings.delete(binding.network);
    bindings.delete(binding.fileSystem);
    binding.network.removeEventListener(Workspace3.UISourceCode.Events.WorkingCopyCommitted, this.onWorkingCopyCommitted, this);
    binding.fileSystem.removeEventListener(Workspace3.UISourceCode.Events.WorkingCopyCommitted, this.onWorkingCopyCommitted, this);
    binding.network.removeEventListener(Workspace3.UISourceCode.Events.WorkingCopyChanged, this.onWorkingCopyChanged, this);
    binding.fileSystem.removeEventListener(Workspace3.UISourceCode.Events.WorkingCopyChanged, this.onWorkingCopyChanged, this);
    this.#filePathPrefixesToBindingCount.remove(binding.fileSystem.url());
    await this.#breakpointManager.copyBreakpoints(binding.network, binding.fileSystem);
    this.notifyBindingEvent(binding.network);
    this.notifyBindingEvent(binding.fileSystem);
    this.dispatchEventToListeners(Events2.BindingRemoved, binding);
  }
  onStatusAdded(status) {
    const binding = new PersistenceBinding(status.network, status.fileSystem);
    statusBindings.set(status, binding);
    return this.#addBinding(binding);
  }
  async onStatusRemoved(status) {
    const binding = statusBindings.get(status);
    await this.#removeBinding(binding);
  }
  onWorkingCopyChanged(event) {
    const uiSourceCode = event.data;
    this.syncWorkingCopy(uiSourceCode);
  }
  syncWorkingCopy(uiSourceCode) {
    const binding = bindings.get(uiSourceCode);
    if (!binding || mutedWorkingCopies.has(binding)) {
      return;
    }
    const other = binding.network === uiSourceCode ? binding.fileSystem : binding.network;
    if (!uiSourceCode.isDirty()) {
      mutedWorkingCopies.add(binding);
      other.resetWorkingCopy();
      mutedWorkingCopies.delete(binding);
      this.contentSyncedForTest();
      return;
    }
    const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(binding.network);
    if (target && target.type() === SDK.Target.Type.NODE) {
      const newContent = uiSourceCode.workingCopy();
      void other.requestContentData().then(() => {
        const nodeJSContent = _PersistenceImpl.rewrapNodeJSContent(other, other.workingCopy(), newContent);
        setWorkingCopy.call(this, () => nodeJSContent);
      });
      return;
    }
    setWorkingCopy.call(this, () => uiSourceCode.workingCopy());
    function setWorkingCopy(workingCopyGetter) {
      if (binding) {
        mutedWorkingCopies.add(binding);
      }
      other.setWorkingCopyGetter(workingCopyGetter);
      if (binding) {
        mutedWorkingCopies.delete(binding);
      }
      this.contentSyncedForTest();
    }
  }
  onWorkingCopyCommitted(event) {
    const uiSourceCode = event.data.uiSourceCode;
    const newContent = event.data.content;
    this.syncContent(uiSourceCode, newContent, Boolean(event.data.encoded));
  }
  syncContent(uiSourceCode, newContent, encoded) {
    const binding = bindings.get(uiSourceCode);
    if (!binding || mutedCommits.has(binding)) {
      return;
    }
    const other = binding.network === uiSourceCode ? binding.fileSystem : binding.network;
    const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(binding.network);
    if (target && target.type() === SDK.Target.Type.NODE) {
      void other.requestContentData().then((contentDataOrError) => TextUtils4.ContentData.ContentData.textOr(contentDataOrError, "")).then((currentContent) => {
        const nodeJSContent = _PersistenceImpl.rewrapNodeJSContent(other, currentContent, newContent);
        setContent.call(this, nodeJSContent);
      });
      return;
    }
    setContent.call(this, newContent);
    function setContent(newContent2) {
      if (binding) {
        mutedCommits.add(binding);
      }
      other.setContent(newContent2, encoded);
      if (binding) {
        mutedCommits.delete(binding);
      }
      this.contentSyncedForTest();
    }
  }
  static rewrapNodeJSContent(uiSourceCode, currentContent, newContent) {
    if (uiSourceCode.project().type() === Workspace3.Workspace.projectTypes.FileSystem) {
      if (newContent.startsWith(NodePrefix) && newContent.endsWith(NodeSuffix)) {
        newContent = newContent.substring(NodePrefix.length, newContent.length - NodeSuffix.length);
      }
      if (currentContent.startsWith(NodeShebang)) {
        newContent = NodeShebang + newContent;
      }
    } else {
      if (newContent.startsWith(NodeShebang)) {
        newContent = newContent.substring(NodeShebang.length);
      }
      if (currentContent.startsWith(NodePrefix) && currentContent.endsWith(NodeSuffix)) {
        newContent = NodePrefix + newContent + NodeSuffix;
      }
    }
    return newContent;
  }
  contentSyncedForTest() {
  }
  async moveBreakpoints(from, to) {
    const breakpoints = this.#breakpointManager.breakpointLocationsForUISourceCode(from).map((breakpointLocation) => breakpointLocation.breakpoint);
    await Promise.all(breakpoints.map(async (breakpoint) => {
      await breakpoint.remove(
        false
        /* keepInStorage */
      );
      return await this.#breakpointManager.setBreakpoint(
        to,
        breakpoint.lineNumber(),
        breakpoint.columnNumber(),
        breakpoint.condition(),
        breakpoint.enabled(),
        breakpoint.isLogpoint(),
        "RESTORED"
        /* BreakpointManager.BreakpointManager.BreakpointOrigin.OTHER */
      );
    }));
  }
  hasUnsavedCommittedChanges(uiSourceCode) {
    if (this.#workspace.hasResourceContentTrackingExtensions()) {
      return false;
    }
    if (uiSourceCode.project().canSetFileContent()) {
      return false;
    }
    if (bindings.has(uiSourceCode)) {
      return false;
    }
    return Boolean(uiSourceCode.hasCommits());
  }
  binding(uiSourceCode) {
    return bindings.get(uiSourceCode) || null;
  }
  subscribeForBindingEvent(uiSourceCode, listener) {
    this.#subscribedBindingEventListeners.set(uiSourceCode, listener);
  }
  unsubscribeFromBindingEvent(uiSourceCode, listener) {
    this.#subscribedBindingEventListeners.delete(uiSourceCode, listener);
  }
  notifyBindingEvent(uiSourceCode) {
    if (!this.#subscribedBindingEventListeners.has(uiSourceCode)) {
      return;
    }
    const listeners = Array.from(this.#subscribedBindingEventListeners.get(uiSourceCode));
    for (const listener of listeners) {
      listener.call(null);
    }
  }
  fileSystem(uiSourceCode) {
    const binding = this.binding(uiSourceCode);
    return binding ? binding.fileSystem : null;
  }
  network(uiSourceCode) {
    const binding = this.binding(uiSourceCode);
    return binding ? binding.network : null;
  }
  filePathHasBindings(filePath) {
    return this.#filePathPrefixesToBindingCount.hasBindingPrefix(filePath);
  }
};
var FilePathPrefixesBindingCounts = class {
  #prefixCounts = /* @__PURE__ */ new Map();
  getPlatformCanonicalFilePath(path) {
    return Host4.Platform.isWin() ? Common5.ParsedURL.ParsedURL.toLowerCase(path) : path;
  }
  add(filePath) {
    filePath = this.getPlatformCanonicalFilePath(filePath);
    let relative = "";
    for (const token of filePath.split("/")) {
      relative += token + "/";
      const count = this.#prefixCounts.get(relative) || 0;
      this.#prefixCounts.set(relative, count + 1);
    }
  }
  remove(filePath) {
    filePath = this.getPlatformCanonicalFilePath(filePath);
    let relative = "";
    for (const token of filePath.split("/")) {
      relative += token + "/";
      const count = this.#prefixCounts.get(relative);
      if (count === 1) {
        this.#prefixCounts.delete(relative);
      } else if (count !== void 0) {
        this.#prefixCounts.set(relative, count - 1);
      }
    }
  }
  hasBindingPrefix(filePath) {
    filePath = this.getPlatformCanonicalFilePath(filePath);
    if (!filePath.endsWith("/")) {
      filePath = Common5.ParsedURL.ParsedURL.concatenate(filePath, "/");
    }
    return this.#prefixCounts.has(filePath);
  }
};
var bindings = /* @__PURE__ */ new WeakMap();
var statusBindings = /* @__PURE__ */ new WeakMap();
var mutedCommits = /* @__PURE__ */ new WeakSet();
var mutedWorkingCopies = /* @__PURE__ */ new WeakSet();
var NodePrefix = "(function (exports, require, module, __filename, __dirname) { ";
var NodeSuffix = "\n});";
var NodeShebang = "#!/usr/bin/env node";
var Events2;
(function(Events3) {
  Events3["BindingCreated"] = "BindingCreated";
  Events3["BindingRemoved"] = "BindingRemoved";
})(Events2 || (Events2 = {}));
var PersistenceBinding = class {
  network;
  fileSystem;
  constructor(network, fileSystem) {
    this.network = network;
    this.fileSystem = fileSystem;
  }
};

// gen/front_end/models/persistence/Automapping.js
var Automapping = class {
  #workspace;
  #onStatusAdded;
  #onStatusRemoved;
  // Used in web tests
  statuses = /* @__PURE__ */ new Set();
  #fileSystemUISourceCodes = new FileSystemUISourceCodes();
  // Used in web tests
  sweepThrottler = new Common6.Throttler.Throttler(100);
  #sourceCodeToProcessingPromiseMap = /* @__PURE__ */ new WeakMap();
  #sourceCodeToAutoMappingStatusMap = /* @__PURE__ */ new WeakMap();
  #sourceCodeToMetadataMap = /* @__PURE__ */ new WeakMap();
  #filesIndex = new FilePathIndex();
  #projectFoldersIndex = new FolderIndex();
  #activeFoldersIndex = new FolderIndex();
  #interceptors = [];
  constructor(workspace, onStatusAdded, onStatusRemoved) {
    this.#workspace = workspace;
    this.#onStatusAdded = onStatusAdded;
    this.#onStatusRemoved = onStatusRemoved;
    this.#workspace.addEventListener(Workspace5.Workspace.Events.UISourceCodeAdded, (event) => this.#onUISourceCodeAdded(event.data));
    this.#workspace.addEventListener(Workspace5.Workspace.Events.UISourceCodeRemoved, (event) => this.#onUISourceCodeRemoved(event.data));
    this.#workspace.addEventListener(Workspace5.Workspace.Events.UISourceCodeRenamed, this.#onUISourceCodeRenamed, this);
    this.#workspace.addEventListener(Workspace5.Workspace.Events.ProjectAdded, (event) => this.#onProjectAdded(event.data), this);
    this.#workspace.addEventListener(Workspace5.Workspace.Events.ProjectRemoved, (event) => this.#onProjectRemoved(event.data), this);
    for (const fileSystem of workspace.projects()) {
      this.#onProjectAdded(fileSystem);
    }
    for (const uiSourceCode of workspace.uiSourceCodes()) {
      this.#onUISourceCodeAdded(uiSourceCode);
    }
  }
  addNetworkInterceptor(interceptor) {
    this.#interceptors.push(interceptor);
    this.scheduleRemap();
  }
  scheduleRemap() {
    for (const status of this.statuses.values()) {
      this.#clearNetworkStatus(status.network);
    }
    this.#scheduleSweep();
  }
  #scheduleSweep() {
    void this.sweepThrottler.schedule(sweepUnmapped.bind(this));
    function sweepUnmapped() {
      const networkProjects = this.#workspace.projectsForType(Workspace5.Workspace.projectTypes.Network);
      for (const networkProject of networkProjects) {
        for (const uiSourceCode of networkProject.uiSourceCodes()) {
          void this.computeNetworkStatus(uiSourceCode);
        }
      }
      this.onSweepHappenedForTest();
      return Promise.resolve();
    }
  }
  onSweepHappenedForTest() {
  }
  #onProjectRemoved(project) {
    for (const uiSourceCode of project.uiSourceCodes()) {
      this.#onUISourceCodeRemoved(uiSourceCode);
    }
    if (project.type() !== Workspace5.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystem = project;
    for (const gitFolder of fileSystem.initialGitFolders()) {
      this.#projectFoldersIndex.removeFolder(gitFolder);
    }
    this.#projectFoldersIndex.removeFolder(fileSystem.fileSystemPath());
    this.scheduleRemap();
  }
  #onProjectAdded(project) {
    if (project.type() !== Workspace5.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystem = project;
    for (const gitFolder of fileSystem.initialGitFolders()) {
      this.#projectFoldersIndex.addFolder(gitFolder);
    }
    this.#projectFoldersIndex.addFolder(fileSystem.fileSystemPath());
    for (const uiSourceCode of project.uiSourceCodes()) {
      this.#onUISourceCodeAdded(uiSourceCode);
    }
    this.scheduleRemap();
  }
  #onUISourceCodeAdded(uiSourceCode) {
    const project = uiSourceCode.project();
    if (project.type() === Workspace5.Workspace.projectTypes.FileSystem) {
      if (!FileSystemWorkspaceBinding.fileSystemSupportsAutomapping(project)) {
        return;
      }
      this.#filesIndex.addPath(uiSourceCode.url());
      this.#fileSystemUISourceCodes.add(uiSourceCode);
      this.#scheduleSweep();
    } else if (project.type() === Workspace5.Workspace.projectTypes.Network) {
      void this.computeNetworkStatus(uiSourceCode);
    }
  }
  #onUISourceCodeRemoved(uiSourceCode) {
    if (uiSourceCode.project().type() === Workspace5.Workspace.projectTypes.FileSystem) {
      this.#filesIndex.removePath(uiSourceCode.url());
      this.#fileSystemUISourceCodes.delete(uiSourceCode.url());
      const status = this.#sourceCodeToAutoMappingStatusMap.get(uiSourceCode);
      if (status) {
        this.#clearNetworkStatus(status.network);
      }
    } else if (uiSourceCode.project().type() === Workspace5.Workspace.projectTypes.Network) {
      this.#clearNetworkStatus(uiSourceCode);
    }
  }
  #onUISourceCodeRenamed(event) {
    const { uiSourceCode, oldURL } = event.data;
    if (uiSourceCode.project().type() !== Workspace5.Workspace.projectTypes.FileSystem) {
      return;
    }
    this.#filesIndex.removePath(oldURL);
    this.#fileSystemUISourceCodes.delete(oldURL);
    const status = this.#sourceCodeToAutoMappingStatusMap.get(uiSourceCode);
    if (status) {
      this.#clearNetworkStatus(status.network);
    }
    this.#filesIndex.addPath(uiSourceCode.url());
    this.#fileSystemUISourceCodes.add(uiSourceCode);
    this.#scheduleSweep();
  }
  computeNetworkStatus(networkSourceCode) {
    const processingPromise = this.#sourceCodeToProcessingPromiseMap.get(networkSourceCode);
    if (processingPromise) {
      return processingPromise;
    }
    if (this.#sourceCodeToAutoMappingStatusMap.has(networkSourceCode)) {
      return Promise.resolve();
    }
    if (this.#interceptors.some((interceptor) => interceptor(networkSourceCode))) {
      return Promise.resolve();
    }
    if (Common6.ParsedURL.schemeIs(networkSourceCode.url(), "wasm:")) {
      return Promise.resolve();
    }
    const createBindingPromise = this.#createBinding(networkSourceCode).then(validateStatus.bind(this)).then(onStatus.bind(this));
    this.#sourceCodeToProcessingPromiseMap.set(networkSourceCode, createBindingPromise);
    return createBindingPromise;
    async function validateStatus(status) {
      if (!status) {
        return null;
      }
      if (this.#sourceCodeToProcessingPromiseMap.get(networkSourceCode) !== createBindingPromise) {
        return null;
      }
      if (status.network.contentType().isFromSourceMap() || !status.fileSystem.contentType().isTextType()) {
        return status;
      }
      if (status.fileSystem.isDirty() && (status.network.isDirty() || status.network.hasCommits())) {
        return null;
      }
      const [fileSystemContent, networkContent] = (await Promise.all([
        status.fileSystem.requestContentData(),
        status.network.project().requestFileContent(status.network)
      ])).map(TextUtils5.ContentData.ContentData.asDeferredContent);
      if (fileSystemContent.content === null || networkContent === null) {
        return null;
      }
      if (this.#sourceCodeToProcessingPromiseMap.get(networkSourceCode) !== createBindingPromise) {
        return null;
      }
      const target = Bindings2.NetworkProject.NetworkProject.targetForUISourceCode(status.network);
      let isValid = false;
      const fileContent = fileSystemContent.content;
      if (target && target.type() === SDK2.Target.Type.NODE) {
        if (networkContent.content) {
          const rewrappedNetworkContent = PersistenceImpl.rewrapNodeJSContent(status.fileSystem, fileContent, networkContent.content);
          isValid = fileContent === rewrappedNetworkContent;
        }
      } else if (networkContent.content) {
        isValid = fileContent.trimEnd() === networkContent.content.trimEnd();
      }
      if (!isValid) {
        this.prevalidationFailedForTest(status);
        return null;
      }
      return status;
    }
    async function onStatus(status) {
      if (this.#sourceCodeToProcessingPromiseMap.get(networkSourceCode) !== createBindingPromise) {
        return;
      }
      if (!status) {
        this.onBindingFailedForTest();
        this.#sourceCodeToProcessingPromiseMap.delete(networkSourceCode);
        return;
      }
      if (this.#sourceCodeToAutoMappingStatusMap.has(status.network) || this.#sourceCodeToAutoMappingStatusMap.has(status.fileSystem)) {
        this.#sourceCodeToProcessingPromiseMap.delete(networkSourceCode);
        return;
      }
      this.statuses.add(status);
      this.#sourceCodeToAutoMappingStatusMap.set(status.network, status);
      this.#sourceCodeToAutoMappingStatusMap.set(status.fileSystem, status);
      if (status.exactMatch) {
        const projectFolder = this.#projectFoldersIndex.closestParentFolder(status.fileSystem.url());
        const newFolderAdded = projectFolder ? this.#activeFoldersIndex.addFolder(projectFolder) : false;
        if (newFolderAdded) {
          this.#scheduleSweep();
        }
      }
      await this.#onStatusAdded.call(null, status);
      this.#sourceCodeToProcessingPromiseMap.delete(networkSourceCode);
    }
  }
  prevalidationFailedForTest(_binding) {
  }
  onBindingFailedForTest() {
  }
  #clearNetworkStatus(networkSourceCode) {
    if (this.#sourceCodeToProcessingPromiseMap.has(networkSourceCode)) {
      this.#sourceCodeToProcessingPromiseMap.delete(networkSourceCode);
      return;
    }
    const status = this.#sourceCodeToAutoMappingStatusMap.get(networkSourceCode);
    if (!status) {
      return;
    }
    this.statuses.delete(status);
    this.#sourceCodeToAutoMappingStatusMap.delete(status.network);
    this.#sourceCodeToAutoMappingStatusMap.delete(status.fileSystem);
    if (status.exactMatch) {
      const projectFolder = this.#projectFoldersIndex.closestParentFolder(status.fileSystem.url());
      if (projectFolder) {
        this.#activeFoldersIndex.removeFolder(projectFolder);
      }
    }
    void this.#onStatusRemoved.call(null, status);
  }
  async #createBinding(networkSourceCode) {
    const url = networkSourceCode.url();
    if (Common6.ParsedURL.schemeIs(url, "file:") || Common6.ParsedURL.schemeIs(url, "snippet:")) {
      const fileSourceCode = this.#fileSystemUISourceCodes.get(url);
      const status = fileSourceCode ? new AutomappingStatus(networkSourceCode, fileSourceCode, false) : null;
      return status;
    }
    let networkPath = Common6.ParsedURL.ParsedURL.extractPath(url);
    if (networkPath === null) {
      return null;
    }
    if (networkPath.endsWith("/")) {
      networkPath = Common6.ParsedURL.ParsedURL.concatenate(networkPath, "index.html");
    }
    const similarFiles = this.#filesIndex.similarFiles(networkPath).map((path) => this.#fileSystemUISourceCodes.get(path));
    if (!similarFiles.length) {
      return null;
    }
    await Promise.all(similarFiles.concat(networkSourceCode).map(async (sourceCode) => {
      this.#sourceCodeToMetadataMap.set(sourceCode, await sourceCode.requestMetadata());
    }));
    const activeFiles = similarFiles.filter((file) => !!this.#activeFoldersIndex.closestParentFolder(file.url()));
    const networkMetadata = this.#sourceCodeToMetadataMap.get(networkSourceCode);
    if (!networkMetadata || !networkMetadata.modificationTime && typeof networkMetadata.contentSize !== "number") {
      if (activeFiles.length !== 1) {
        return null;
      }
      return new AutomappingStatus(networkSourceCode, activeFiles[0], false);
    }
    let exactMatches = this.#filterWithMetadata(activeFiles, networkMetadata);
    if (!exactMatches.length) {
      exactMatches = this.#filterWithMetadata(similarFiles, networkMetadata);
    }
    if (exactMatches.length !== 1) {
      return null;
    }
    return new AutomappingStatus(networkSourceCode, exactMatches[0], true);
  }
  #filterWithMetadata(files, networkMetadata) {
    return files.filter((file) => {
      const fileMetadata = this.#sourceCodeToMetadataMap.get(file);
      if (!fileMetadata) {
        return false;
      }
      const timeMatches = !networkMetadata.modificationTime || !fileMetadata.modificationTime || Math.abs(networkMetadata.modificationTime.getTime() - fileMetadata.modificationTime.getTime()) < 1e3;
      const contentMatches = !networkMetadata.contentSize || fileMetadata.contentSize === networkMetadata.contentSize;
      return timeMatches && contentMatches;
    });
  }
};
var FilePathIndex = class {
  #reversedIndex = Common6.Trie.Trie.newArrayTrie();
  addPath(path) {
    const reversePathParts = path.split("/").reverse();
    this.#reversedIndex.add(reversePathParts);
  }
  removePath(path) {
    const reversePathParts = path.split("/").reverse();
    this.#reversedIndex.remove(reversePathParts);
  }
  similarFiles(networkPath) {
    const reversePathParts = networkPath.split("/").reverse();
    const longestCommonPrefix = this.#reversedIndex.longestPrefix(reversePathParts, false);
    if (longestCommonPrefix.length === 0) {
      return [];
    }
    return this.#reversedIndex.words(longestCommonPrefix).map((reversePathParts2) => reversePathParts2.reverse().join("/"));
  }
};
var FolderIndex = class {
  #index = Common6.Trie.Trie.newArrayTrie();
  #folderCount = /* @__PURE__ */ new Map();
  addFolder(path) {
    const pathParts = this.#removeTrailingSlash(path).split("/");
    this.#index.add(pathParts);
    const pathForCount = pathParts.join("/");
    const count = this.#folderCount.get(pathForCount) ?? 0;
    this.#folderCount.set(pathForCount, count + 1);
    return count === 0;
  }
  removeFolder(path) {
    const pathParts = this.#removeTrailingSlash(path).split("/");
    const pathForCount = pathParts.join("/");
    const count = this.#folderCount.get(pathForCount) ?? 0;
    if (!count) {
      return false;
    }
    if (count > 1) {
      this.#folderCount.set(pathForCount, count - 1);
      return false;
    }
    this.#index.remove(pathParts);
    this.#folderCount.delete(pathForCount);
    return true;
  }
  closestParentFolder(path) {
    const pathParts = path.split("/");
    const commonPrefix = this.#index.longestPrefix(
      pathParts,
      /* fullWordOnly */
      true
    );
    return commonPrefix.join("/");
  }
  #removeTrailingSlash(path) {
    if (path.endsWith("/")) {
      return Common6.ParsedURL.ParsedURL.substring(path, 0, path.length - 1);
    }
    return path;
  }
};
var FileSystemUISourceCodes = class {
  #sourceCodes = /* @__PURE__ */ new Map();
  getPlatformCanonicalFileUrl(path) {
    return Host5.Platform.isWin() ? Common6.ParsedURL.ParsedURL.toLowerCase(path) : path;
  }
  add(sourceCode) {
    const fileUrl = this.getPlatformCanonicalFileUrl(sourceCode.url());
    this.#sourceCodes.set(fileUrl, sourceCode);
  }
  get(fileUrl) {
    fileUrl = this.getPlatformCanonicalFileUrl(fileUrl);
    return this.#sourceCodes.get(fileUrl);
  }
  delete(fileUrl) {
    fileUrl = this.getPlatformCanonicalFileUrl(fileUrl);
    this.#sourceCodes.delete(fileUrl);
  }
};
var AutomappingStatus = class {
  network;
  fileSystem;
  exactMatch;
  constructor(network, fileSystem, exactMatch) {
    this.network = network;
    this.fileSystem = fileSystem;
    this.exactMatch = exactMatch;
  }
};

// gen/front_end/models/persistence/AutomaticFileSystemManager.js
var AutomaticFileSystemManager_exports = {};
__export(AutomaticFileSystemManager_exports, {
  AutomaticFileSystemManager: () => AutomaticFileSystemManager
});
import * as Common7 from "./../../core/common/common.js";
import * as Host6 from "./../../core/host/host.js";
import * as ProjectSettings from "./../project_settings/project_settings.js";
var automaticFileSystemManagerInstance;
var AutomaticFileSystemManager = class _AutomaticFileSystemManager extends Common7.ObjectWrapper.ObjectWrapper {
  #automaticFileSystem;
  #availability = "unavailable";
  #inspectorFrontendHost;
  #projectSettingsModel;
  /**
   * Yields the current `AutomaticFileSystem` (if any).
   *
   * @returns the current automatic file system or `null`.
   */
  get automaticFileSystem() {
    return this.#automaticFileSystem;
  }
  /**
   * Yields the availability of the Automatic Workspace Folders feature.
   *
   * `'available'` means that the feature is enabled and the project settings
   * are also available. It doesn't indicate whether or not the page is actually
   * providing a `com.chrome.devtools.json` or not, and whether or not that file
   * (if it exists) provides workspace information.
   *
   * @returns `'available'` if the feature is available and the project settings
   *         feature is also available, otherwise `'unavailable'`.
   */
  get availability() {
    return this.#availability;
  }
  /**
   * @internal
   */
  constructor(inspectorFrontendHost, projectSettingsModel) {
    super();
    this.#automaticFileSystem = null;
    this.#inspectorFrontendHost = inspectorFrontendHost;
    this.#projectSettingsModel = projectSettingsModel;
    this.#inspectorFrontendHost.events.addEventListener(Host6.InspectorFrontendHostAPI.Events.FileSystemRemoved, this.#fileSystemRemoved, this);
    this.#projectSettingsModel.addEventListener("AvailabilityChanged", this.#availabilityChanged, this);
    this.#availabilityChanged({ data: this.#projectSettingsModel.availability });
    this.#projectSettingsModel.addEventListener("ProjectSettingsChanged", this.#projectSettingsChanged, this);
    this.#projectSettingsChanged({ data: this.#projectSettingsModel.projectSettings });
  }
  /**
   * Yields the `AutomaticFileSystemManager` singleton.
   *
   * @returns the singleton.
   */
  static instance({ forceNew, inspectorFrontendHost, projectSettingsModel } = { forceNew: false, inspectorFrontendHost: null, projectSettingsModel: null }) {
    if (!automaticFileSystemManagerInstance || forceNew) {
      if (!inspectorFrontendHost || !projectSettingsModel) {
        throw new Error("Unable to create AutomaticFileSystemManager: inspectorFrontendHost, and projectSettingsModel must be provided");
      }
      automaticFileSystemManagerInstance = new _AutomaticFileSystemManager(inspectorFrontendHost, projectSettingsModel);
    }
    return automaticFileSystemManagerInstance;
  }
  /**
   * Clears the `AutomaticFileSystemManager` singleton (if any);
   */
  static removeInstance() {
    if (automaticFileSystemManagerInstance) {
      automaticFileSystemManagerInstance.#dispose();
      automaticFileSystemManagerInstance = void 0;
    }
  }
  #dispose() {
    this.#inspectorFrontendHost.events.removeEventListener(Host6.InspectorFrontendHostAPI.Events.FileSystemRemoved, this.#fileSystemRemoved, this);
    this.#projectSettingsModel.removeEventListener("AvailabilityChanged", this.#availabilityChanged, this);
    this.#projectSettingsModel.removeEventListener("ProjectSettingsChanged", this.#projectSettingsChanged, this);
  }
  #availabilityChanged(event) {
    const availability = event.data;
    if (this.#availability !== availability) {
      this.#availability = availability;
      this.dispatchEventToListeners("AvailabilityChanged", this.#availability);
    }
  }
  #fileSystemRemoved(event) {
    if (this.#automaticFileSystem === null) {
      return;
    }
    if (this.#automaticFileSystem.root === event.data) {
      this.#automaticFileSystem = Object.freeze({
        ...this.#automaticFileSystem,
        state: "disconnected"
      });
      this.dispatchEventToListeners("AutomaticFileSystemChanged", this.#automaticFileSystem);
    }
  }
  #projectSettingsChanged(event) {
    const projectSettings = event.data;
    let automaticFileSystem = this.#automaticFileSystem;
    if (projectSettings.workspace) {
      const { root, uuid } = projectSettings.workspace;
      if (automaticFileSystem?.root !== root || automaticFileSystem.uuid !== uuid) {
        automaticFileSystem = Object.freeze({ root, uuid, state: "disconnected" });
      }
    } else if (automaticFileSystem !== null) {
      automaticFileSystem = null;
    }
    if (this.#automaticFileSystem !== automaticFileSystem) {
      this.disconnectedAutomaticFileSystem();
      this.#automaticFileSystem = automaticFileSystem;
      this.dispatchEventToListeners("AutomaticFileSystemChanged", this.#automaticFileSystem);
      void this.connectAutomaticFileSystem(
        /* addIfMissing= */
        false
      );
    }
  }
  /**
   * Attempt to connect the automatic workspace folder (if any).
   *
   * @param addIfMissing if `false` (the default), this will only try to connect
   *                     to a previously connected automatic workspace folder.
   *                     If the folder was never connected before and `true` is
   *                     specified, the user will be asked to grant permission
   *                     to allow Chrome DevTools to access the folder first.
   * @returns `true` if the automatic workspace folder was connected, `false`
   *          if there wasn't any, or the connection attempt failed (e.g. the
   *          user did not grant permission).
   */
  async connectAutomaticFileSystem(addIfMissing = false) {
    if (!this.#automaticFileSystem) {
      return false;
    }
    const { root, uuid, state } = this.#automaticFileSystem;
    if (state === "disconnected") {
      const automaticFileSystem = this.#automaticFileSystem = Object.freeze({ ...this.#automaticFileSystem, state: "connecting" });
      this.dispatchEventToListeners("AutomaticFileSystemChanged", this.#automaticFileSystem);
      const { success } = await new Promise((resolve) => this.#inspectorFrontendHost.connectAutomaticFileSystem(root, uuid, addIfMissing, resolve));
      if (this.#automaticFileSystem === automaticFileSystem) {
        const state2 = success ? "connected" : "disconnected";
        this.#automaticFileSystem = Object.freeze({ ...automaticFileSystem, state: state2 });
        this.dispatchEventToListeners("AutomaticFileSystemChanged", this.#automaticFileSystem);
      }
    }
    return this.#automaticFileSystem?.state === "connected";
  }
  /**
   * Disconnects any automatic workspace folder.
   */
  disconnectedAutomaticFileSystem() {
    if (this.#automaticFileSystem && this.#automaticFileSystem.state !== "disconnected") {
      this.#inspectorFrontendHost.disconnectAutomaticFileSystem(this.#automaticFileSystem.root);
      this.#automaticFileSystem = Object.freeze({ ...this.#automaticFileSystem, state: "disconnected" });
      this.dispatchEventToListeners("AutomaticFileSystemChanged", this.#automaticFileSystem);
    }
  }
};

// gen/front_end/models/persistence/AutomaticFileSystemWorkspaceBinding.js
var AutomaticFileSystemWorkspaceBinding_exports = {};
__export(AutomaticFileSystemWorkspaceBinding_exports, {
  AutomaticFileSystemWorkspaceBinding: () => AutomaticFileSystemWorkspaceBinding,
  FileSystem: () => FileSystem2
});
import * as Common8 from "./../../core/common/common.js";
import * as Host7 from "./../../core/host/host.js";
import * as Workspace7 from "./../workspace/workspace.js";
var FileSystem2 = class {
  automaticFileSystem;
  automaticFileSystemManager;
  #workspace;
  constructor(automaticFileSystem, automaticFileSystemManager, workspace) {
    this.automaticFileSystem = automaticFileSystem;
    this.automaticFileSystemManager = automaticFileSystemManager;
    this.#workspace = workspace;
  }
  workspace() {
    return this.#workspace;
  }
  id() {
    return `${this.type()}:${this.automaticFileSystem.root}:${this.automaticFileSystem.uuid}`;
  }
  type() {
    return Workspace7.Workspace.projectTypes.ConnectableFileSystem;
  }
  isServiceProject() {
    return false;
  }
  displayName() {
    const { root } = this.automaticFileSystem;
    let slash = root.lastIndexOf("/");
    if (slash === -1 && Host7.Platform.isWin()) {
      slash = root.lastIndexOf("\\");
    }
    return root.substr(slash + 1);
  }
  async requestMetadata(_uiSourceCode) {
    throw new Error("Not implemented");
  }
  async requestFileContent(_uiSourceCode) {
    throw new Error("Not implemented");
  }
  canSetFileContent() {
    return false;
  }
  async setFileContent(_uiSourceCode, _newContent, _isBase64) {
    throw new Error("Not implemented");
  }
  fullDisplayName(_uiSourceCode) {
    throw new Error("Not implemented");
  }
  mimeType(_uiSourceCode) {
    throw new Error("Not implemented");
  }
  canRename() {
    return false;
  }
  rename(_uiSourceCode, _newName, _callback) {
    throw new Error("Not implemented");
  }
  excludeFolder(_path) {
    throw new Error("Not implemented");
  }
  canExcludeFolder(_path) {
    return false;
  }
  async createFile(_path, _name, _content, _isBase64) {
    throw new Error("Not implemented");
  }
  canCreateFile() {
    return false;
  }
  deleteFile(_uiSourceCode) {
    throw new Error("Not implemented");
  }
  async deleteDirectoryRecursively(_path) {
    throw new Error("Not implemented");
  }
  remove() {
  }
  removeUISourceCode(_url) {
    throw new Error("Not implemented");
  }
  async searchInFileContent(_uiSourceCode, _query, _caseSensitive, _isRegex) {
    return [];
  }
  async findFilesMatchingSearchRequest(_searchConfig, _filesMatchingFileQuery, _progress) {
    return /* @__PURE__ */ new Map();
  }
  indexContent(_progress) {
  }
  uiSourceCodeForURL(_url) {
    return null;
  }
  uiSourceCodes() {
    return [];
  }
};
var automaticFileSystemWorkspaceBindingInstance;
var AutomaticFileSystemWorkspaceBinding = class _AutomaticFileSystemWorkspaceBinding {
  #automaticFileSystemManager;
  #fileSystem = null;
  #isolatedFileSystemManager;
  #workspace;
  /**
   * @internal
   */
  constructor(automaticFileSystemManager, isolatedFileSystemManager, workspace) {
    this.#automaticFileSystemManager = automaticFileSystemManager;
    this.#isolatedFileSystemManager = isolatedFileSystemManager;
    this.#workspace = workspace;
    this.#automaticFileSystemManager.addEventListener("AutomaticFileSystemChanged", this.#update, this);
    this.#isolatedFileSystemManager.addEventListener(Events.FileSystemAdded, this.#update, this);
    this.#isolatedFileSystemManager.addEventListener(Events.FileSystemRemoved, this.#update, this);
    this.#update();
  }
  /**
   * Yields the `AutomaticFileSystemWorkspaceBinding` singleton.
   *
   * @returns the singleton.
   */
  static instance({ forceNew, automaticFileSystemManager, isolatedFileSystemManager, workspace } = {
    forceNew: false,
    automaticFileSystemManager: null,
    isolatedFileSystemManager: null,
    workspace: null
  }) {
    if (!automaticFileSystemWorkspaceBindingInstance || forceNew) {
      if (!automaticFileSystemManager || !isolatedFileSystemManager || !workspace) {
        throw new Error("Unable to create AutomaticFileSystemWorkspaceBinding: automaticFileSystemManager, isolatedFileSystemManager, and workspace must be provided");
      }
      automaticFileSystemWorkspaceBindingInstance = new _AutomaticFileSystemWorkspaceBinding(automaticFileSystemManager, isolatedFileSystemManager, workspace);
    }
    return automaticFileSystemWorkspaceBindingInstance;
  }
  /**
   * Clears the `AutomaticFileSystemWorkspaceBinding` singleton (if any);
   */
  static removeInstance() {
    if (automaticFileSystemWorkspaceBindingInstance) {
      automaticFileSystemWorkspaceBindingInstance.#dispose();
      automaticFileSystemWorkspaceBindingInstance = void 0;
    }
  }
  #dispose() {
    if (this.#fileSystem) {
      this.#workspace.removeProject(this.#fileSystem);
    }
    this.#automaticFileSystemManager.removeEventListener("AutomaticFileSystemChanged", this.#update, this);
    this.#isolatedFileSystemManager.removeEventListener(Events.FileSystemAdded, this.#update, this);
    this.#isolatedFileSystemManager.removeEventListener(Events.FileSystemRemoved, this.#update, this);
  }
  #update() {
    const automaticFileSystem = this.#automaticFileSystemManager.automaticFileSystem;
    if (this.#fileSystem !== null) {
      if (this.#fileSystem.automaticFileSystem === automaticFileSystem) {
        return;
      }
      this.#workspace.removeProject(this.#fileSystem);
      this.#fileSystem = null;
    }
    if (automaticFileSystem !== null && automaticFileSystem.state !== "connected") {
      const fileSystemURL = Common8.ParsedURL.ParsedURL.rawPathToUrlString(automaticFileSystem.root);
      if (this.#isolatedFileSystemManager.fileSystem(fileSystemURL) === null) {
        this.#fileSystem = new FileSystem2(automaticFileSystem, this.#automaticFileSystemManager, this.#workspace);
        this.#workspace.addProject(this.#fileSystem);
      }
    }
  }
};

// gen/front_end/models/persistence/NetworkPersistenceManager.js
var NetworkPersistenceManager_exports = {};
__export(NetworkPersistenceManager_exports, {
  HEADERS_FILENAME: () => HEADERS_FILENAME,
  NetworkPersistenceManager: () => NetworkPersistenceManager,
  escapeRegex: () => escapeRegex,
  extractDirectoryIndex: () => extractDirectoryIndex,
  isHeaderOverride: () => isHeaderOverride
});
import * as Common9 from "./../../core/common/common.js";
import * as Host8 from "./../../core/host/host.js";
import * as Platform11 from "./../../core/platform/platform.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import * as Breakpoints from "./../breakpoints/breakpoints.js";
import * as TextUtils6 from "./../text_utils/text_utils.js";
import * as Workspace9 from "./../workspace/workspace.js";
var networkPersistenceManagerInstance;
var forbiddenUrls = ["chromewebstore.google.com", "chrome.google.com"];
var NetworkPersistenceManager = class _NetworkPersistenceManager extends Common9.ObjectWrapper.ObjectWrapper {
  #bindings = /* @__PURE__ */ new WeakMap();
  #originalResponseContentPromises = /* @__PURE__ */ new WeakMap();
  #savingForOverrides = /* @__PURE__ */ new WeakSet();
  #enabledSetting = Common9.Settings.Settings.instance().moduleSetting("persistence-network-overrides-enabled");
  #workspace;
  #networkUISourceCodeForEncodedPath = /* @__PURE__ */ new Map();
  #interceptionHandlerBound;
  #updateInterceptionThrottler = new Common9.Throttler.Throttler(50);
  #project = null;
  #active = false;
  #enabled = false;
  #eventDescriptors = [];
  #headerOverridesMap = /* @__PURE__ */ new Map();
  #sourceCodeToBindProcessMutex = /* @__PURE__ */ new WeakMap();
  #eventDispatchThrottler = new Common9.Throttler.Throttler(50);
  #headerOverridesForEventDispatch = /* @__PURE__ */ new Set();
  constructor(workspace) {
    super();
    this.#enabledSetting.addChangeListener(this.enabledChanged, this);
    this.#workspace = workspace;
    this.#interceptionHandlerBound = this.interceptionHandler.bind(this);
    this.#workspace.addEventListener(Workspace9.Workspace.Events.ProjectAdded, (event) => {
      void this.onProjectAdded(event.data);
    });
    this.#workspace.addEventListener(Workspace9.Workspace.Events.ProjectRemoved, (event) => {
      void this.onProjectRemoved(event.data);
    });
    PersistenceImpl.instance().addNetworkInterceptor(this.canHandleNetworkUISourceCode.bind(this));
    Breakpoints.BreakpointManager.BreakpointManager.instance().addUpdateBindingsCallback(this.networkUISourceCodeAdded.bind(this));
    void this.enabledChanged();
    SDK3.TargetManager.TargetManager.instance().observeTargets(this);
  }
  targetAdded() {
    void this.updateActiveProject();
  }
  targetRemoved() {
    void this.updateActiveProject();
  }
  static instance(opts = { forceNew: null, workspace: null }) {
    const { forceNew, workspace } = opts;
    if (!networkPersistenceManagerInstance || forceNew) {
      if (!workspace) {
        throw new Error("Missing workspace for NetworkPersistenceManager");
      }
      networkPersistenceManagerInstance = new _NetworkPersistenceManager(workspace);
    }
    return networkPersistenceManagerInstance;
  }
  active() {
    return this.#active;
  }
  project() {
    return this.#project;
  }
  originalContentForUISourceCode(uiSourceCode) {
    const binding = this.#bindings.get(uiSourceCode);
    if (!binding) {
      return null;
    }
    const fileSystemUISourceCode = binding.fileSystem;
    return this.#originalResponseContentPromises.get(fileSystemUISourceCode) || null;
  }
  async enabledChanged() {
    if (this.#enabled === this.#enabledSetting.get()) {
      return;
    }
    this.#enabled = this.#enabledSetting.get();
    if (this.#enabled) {
      Host8.userMetrics.actionTaken(Host8.UserMetrics.Action.PersistenceNetworkOverridesEnabled);
      this.#eventDescriptors = [
        Workspace9.Workspace.WorkspaceImpl.instance().addEventListener(Workspace9.Workspace.Events.UISourceCodeRenamed, (event) => {
          void this.uiSourceCodeRenamedListener(event);
        }),
        Workspace9.Workspace.WorkspaceImpl.instance().addEventListener(Workspace9.Workspace.Events.UISourceCodeAdded, (event) => {
          void this.uiSourceCodeAdded(event);
        }),
        Workspace9.Workspace.WorkspaceImpl.instance().addEventListener(Workspace9.Workspace.Events.UISourceCodeRemoved, (event) => {
          void this.uiSourceCodeRemovedListener(event);
        }),
        Workspace9.Workspace.WorkspaceImpl.instance().addEventListener(Workspace9.Workspace.Events.WorkingCopyCommitted, (event) => this.onUISourceCodeWorkingCopyCommitted(event.data.uiSourceCode))
      ];
      await this.updateActiveProject();
    } else {
      Host8.userMetrics.actionTaken(Host8.UserMetrics.Action.PersistenceNetworkOverridesDisabled);
      Common9.EventTarget.removeEventListeners(this.#eventDescriptors);
      await this.updateActiveProject();
    }
    this.dispatchEventToListeners("LocalOverridesProjectUpdated", this.#enabled);
  }
  async uiSourceCodeRenamedListener(event) {
    const uiSourceCode = event.data.uiSourceCode;
    await this.onUISourceCodeRemoved(uiSourceCode);
    await this.onUISourceCodeAdded(uiSourceCode);
  }
  async uiSourceCodeRemovedListener(event) {
    await this.onUISourceCodeRemoved(event.data);
  }
  async uiSourceCodeAdded(event) {
    await this.onUISourceCodeAdded(event.data);
  }
  async updateActiveProject() {
    const wasActive = this.#active;
    this.#active = Boolean(this.#enabledSetting.get() && SDK3.TargetManager.TargetManager.instance().rootTarget() && this.#project);
    if (this.#active === wasActive) {
      return;
    }
    if (this.#active && this.#project) {
      await Promise.all([...this.#project.uiSourceCodes()].map((uiSourceCode) => this.filesystemUISourceCodeAdded(uiSourceCode)));
      const networkProjects = this.#workspace.projectsForType(Workspace9.Workspace.projectTypes.Network);
      for (const networkProject of networkProjects) {
        await Promise.all([...networkProject.uiSourceCodes()].map((uiSourceCode) => this.networkUISourceCodeAdded(uiSourceCode)));
      }
    } else if (this.#project) {
      await Promise.all([...this.#project.uiSourceCodes()].map((uiSourceCode) => this.filesystemUISourceCodeRemoved(uiSourceCode)));
      this.#networkUISourceCodeForEncodedPath.clear();
    }
    PersistenceImpl.instance().refreshAutomapping();
  }
  encodedPathFromUrl(url, ignoreInactive) {
    return Common9.ParsedURL.ParsedURL.rawPathToEncodedPathString(this.rawPathFromUrl(url, ignoreInactive));
  }
  rawPathFromUrl(url, ignoreInactive) {
    if (!this.#active && !ignoreInactive || !this.#project) {
      return Platform11.DevToolsPath.EmptyRawPathString;
    }
    let initialEncodedPath = Common9.ParsedURL.ParsedURL.urlWithoutHash(url.replace(/^https?:\/\//, ""));
    if (initialEncodedPath.endsWith("/") && initialEncodedPath.indexOf("?") === -1) {
      initialEncodedPath = Common9.ParsedURL.ParsedURL.concatenate(initialEncodedPath, "index.html");
    }
    let encodedPathParts = _NetworkPersistenceManager.encodeEncodedPathToLocalPathParts(initialEncodedPath);
    const projectPath = FileSystemWorkspaceBinding.fileSystemPath(this.#project.id());
    const encodedPath = encodedPathParts.join("/");
    if (projectPath.length + encodedPath.length > 200) {
      const domain = encodedPathParts[0];
      const encodedFileName = encodedPathParts[encodedPathParts.length - 1];
      const shortFileName = encodedFileName ? encodedFileName.substr(0, 10) + "-" : "";
      const extension = Common9.ParsedURL.ParsedURL.extractExtension(initialEncodedPath);
      const extensionPart = extension ? "." + extension.substr(0, 10) : "";
      encodedPathParts = [
        domain,
        "longurls",
        shortFileName + Platform11.StringUtilities.hashCode(encodedPath).toString(16) + extensionPart
      ];
    }
    return Common9.ParsedURL.ParsedURL.join(encodedPathParts, "/");
  }
  static encodeEncodedPathToLocalPathParts(encodedPath) {
    const encodedParts = [];
    for (const pathPart of this.#fileNamePartsFromEncodedPath(encodedPath)) {
      if (!pathPart) {
        continue;
      }
      let encodedName = encodeURI(pathPart).replace(/[\/\*]/g, (match) => "%" + match[0].charCodeAt(0).toString(16).toUpperCase());
      if (Host8.Platform.isWin()) {
        encodedName = encodedName.replace(/[:\?]/g, (match) => "%" + match[0].charCodeAt(0).toString(16).toUpperCase());
        if (RESERVED_FILENAMES.has(encodedName.toLowerCase())) {
          encodedName = encodedName.split("").map((char) => "%" + char.charCodeAt(0).toString(16).toUpperCase()).join("");
        }
        const lastChar = encodedName.charAt(encodedName.length - 1);
        if (lastChar === ".") {
          encodedName = encodedName.substr(0, encodedName.length - 1) + "%2E";
        }
      }
      encodedParts.push(encodedName);
    }
    return encodedParts;
  }
  static #fileNamePartsFromEncodedPath(encodedPath) {
    encodedPath = Common9.ParsedURL.ParsedURL.urlWithoutHash(encodedPath);
    const queryIndex = encodedPath.indexOf("?");
    if (queryIndex === -1) {
      return encodedPath.split("/");
    }
    if (queryIndex === 0) {
      return [encodedPath];
    }
    const endSection = encodedPath.substr(queryIndex);
    const parts = encodedPath.substr(0, encodedPath.length - endSection.length).split("/");
    parts[parts.length - 1] += endSection;
    return parts;
  }
  fileUrlFromNetworkUrl(url, ignoreInactive) {
    if (!this.#project) {
      return Platform11.DevToolsPath.EmptyUrlString;
    }
    return Common9.ParsedURL.ParsedURL.concatenate(this.#project.fileSystemPath(), "/", this.encodedPathFromUrl(url, ignoreInactive));
  }
  getHeadersUISourceCodeFromUrl(url) {
    const fileUrlFromRequest = this.fileUrlFromNetworkUrl(
      url,
      /* ignoreNoActive */
      true
    );
    const folderUrlFromRequest = Common9.ParsedURL.ParsedURL.substring(fileUrlFromRequest, 0, fileUrlFromRequest.lastIndexOf("/"));
    const headersFileUrl = Common9.ParsedURL.ParsedURL.concatenate(folderUrlFromRequest, "/", HEADERS_FILENAME);
    return Workspace9.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(headersFileUrl);
  }
  async getOrCreateHeadersUISourceCodeFromUrl(url) {
    let uiSourceCode = this.getHeadersUISourceCodeFromUrl(url);
    if (!uiSourceCode && this.#project) {
      const encodedFilePath = this.encodedPathFromUrl(
        url,
        /* ignoreNoActive */
        true
      );
      const encodedPath = Common9.ParsedURL.ParsedURL.substring(encodedFilePath, 0, encodedFilePath.lastIndexOf("/"));
      uiSourceCode = await this.#project.createFile(encodedPath, HEADERS_FILENAME, "");
      Host8.userMetrics.actionTaken(Host8.UserMetrics.Action.HeaderOverrideFileCreated);
    }
    return uiSourceCode;
  }
  decodeLocalPathToUrlPath(path) {
    try {
      return unescape(path);
    } catch (e) {
      console.error(e);
    }
    return path;
  }
  async #unbind(uiSourceCode) {
    const binding = this.#bindings.get(uiSourceCode);
    const headerBinding = uiSourceCode.url().endsWith(HEADERS_FILENAME);
    if (binding) {
      const mutex = this.#getOrCreateMutex(binding.network);
      await mutex.run(this.#innerUnbind.bind(this, binding));
    } else if (headerBinding) {
      this.dispatchEventToListeners("RequestsForHeaderOverridesFileChanged", uiSourceCode);
    }
  }
  async #unbindUnguarded(uiSourceCode) {
    const binding = this.#bindings.get(uiSourceCode);
    if (binding) {
      await this.#innerUnbind(binding);
    }
  }
  #innerUnbind(binding) {
    this.#bindings.delete(binding.network);
    this.#bindings.delete(binding.fileSystem);
    return PersistenceImpl.instance().removeBinding(binding);
  }
  async #bind(networkUISourceCode, fileSystemUISourceCode) {
    const mutex = this.#getOrCreateMutex(networkUISourceCode);
    await mutex.run(async () => {
      const existingBinding = this.#bindings.get(networkUISourceCode);
      if (existingBinding) {
        const { network, fileSystem } = existingBinding;
        if (networkUISourceCode === network && fileSystemUISourceCode === fileSystem) {
          return;
        }
        await this.#unbindUnguarded(networkUISourceCode);
        await this.#unbindUnguarded(fileSystemUISourceCode);
      }
      await this.#innerAddBinding(networkUISourceCode, fileSystemUISourceCode);
    });
  }
  #getOrCreateMutex(networkUISourceCode) {
    let mutex = this.#sourceCodeToBindProcessMutex.get(networkUISourceCode);
    if (!mutex) {
      mutex = new Common9.Mutex.Mutex();
      this.#sourceCodeToBindProcessMutex.set(networkUISourceCode, mutex);
    }
    return mutex;
  }
  async #innerAddBinding(networkUISourceCode, fileSystemUISourceCode) {
    const binding = new PersistenceBinding(networkUISourceCode, fileSystemUISourceCode);
    this.#bindings.set(networkUISourceCode, binding);
    this.#bindings.set(fileSystemUISourceCode, binding);
    await PersistenceImpl.instance().addBinding(binding);
    const uiSourceCodeOfTruth = this.#savingForOverrides.has(networkUISourceCode) ? networkUISourceCode : fileSystemUISourceCode;
    const contentDataOrError = await uiSourceCodeOfTruth.requestContentData();
    const { content, isEncoded } = TextUtils6.ContentData.ContentData.asDeferredContent(contentDataOrError);
    PersistenceImpl.instance().syncContent(uiSourceCodeOfTruth, content || "", isEncoded);
  }
  onUISourceCodeWorkingCopyCommitted(uiSourceCode) {
    void this.saveUISourceCodeForOverrides(uiSourceCode);
    this.updateInterceptionPatterns();
  }
  isActiveHeaderOverrides(uiSourceCode) {
    if (!this.#enabledSetting.get()) {
      return false;
    }
    return uiSourceCode.url().endsWith(HEADERS_FILENAME) && this.hasMatchingNetworkUISourceCodeForHeaderOverridesFile(uiSourceCode);
  }
  isUISourceCodeOverridable(uiSourceCode) {
    return uiSourceCode.project().type() === Workspace9.Workspace.projectTypes.Network && !_NetworkPersistenceManager.isForbiddenNetworkUrl(uiSourceCode.url());
  }
  #isUISourceCodeAlreadyOverridden(uiSourceCode) {
    return this.#bindings.has(uiSourceCode) || this.#savingForOverrides.has(uiSourceCode);
  }
  #shouldPromptSaveForOverridesDialog(uiSourceCode) {
    return this.isUISourceCodeOverridable(uiSourceCode) && !this.#isUISourceCodeAlreadyOverridden(uiSourceCode) && !this.#active && !this.#project;
  }
  #canSaveUISourceCodeForOverrides(uiSourceCode) {
    return this.#active && this.isUISourceCodeOverridable(uiSourceCode) && !this.#isUISourceCodeAlreadyOverridden(uiSourceCode);
  }
  async setupAndStartLocalOverrides(uiSourceCode) {
    if (this.#shouldPromptSaveForOverridesDialog(uiSourceCode)) {
      Host8.userMetrics.actionTaken(Host8.UserMetrics.Action.OverrideContentContextMenuSetup);
      await new Promise((resolve) => this.dispatchEventToListeners("LocalOverridesRequested", resolve));
      await IsolatedFileSystemManager.instance().addFileSystem("overrides");
    }
    if (!this.project()) {
      Host8.userMetrics.actionTaken(Host8.UserMetrics.Action.OverrideContentContextMenuAbandonSetup);
      return false;
    }
    if (!this.#enabledSetting.get()) {
      Host8.userMetrics.actionTaken(Host8.UserMetrics.Action.OverrideContentContextMenuActivateDisabled);
      this.#enabledSetting.set(true);
      await this.once(
        "LocalOverridesProjectUpdated"
        /* Events.LOCAL_OVERRIDES_PROJECT_UPDATED */
      );
    }
    if (!this.#isUISourceCodeAlreadyOverridden(uiSourceCode)) {
      Host8.userMetrics.actionTaken(Host8.UserMetrics.Action.OverrideContentContextMenuSaveNewFile);
      uiSourceCode.commitWorkingCopy();
      await this.saveUISourceCodeForOverrides(uiSourceCode);
    } else {
      Host8.userMetrics.actionTaken(Host8.UserMetrics.Action.OverrideContentContextMenuOpenExistingFile);
    }
    return true;
  }
  async saveUISourceCodeForOverrides(uiSourceCode) {
    if (!this.#canSaveUISourceCodeForOverrides(uiSourceCode)) {
      return;
    }
    this.#savingForOverrides.add(uiSourceCode);
    let encodedPath = this.encodedPathFromUrl(uiSourceCode.url());
    const contentDataOrError = await uiSourceCode.requestContentData();
    const { content, isEncoded } = TextUtils6.ContentData.ContentData.asDeferredContent(contentDataOrError);
    const lastIndexOfSlash = encodedPath.lastIndexOf("/");
    const encodedFileName = Common9.ParsedURL.ParsedURL.substring(encodedPath, lastIndexOfSlash + 1);
    const rawFileName = Common9.ParsedURL.ParsedURL.encodedPathToRawPathString(encodedFileName);
    encodedPath = Common9.ParsedURL.ParsedURL.substr(encodedPath, 0, lastIndexOfSlash);
    if (this.#project) {
      await this.#project.createFile(encodedPath, rawFileName, content ?? "", isEncoded);
    }
    this.fileCreatedForTest(encodedPath, rawFileName);
    this.#savingForOverrides.delete(uiSourceCode);
  }
  fileCreatedForTest(_path, _fileName) {
  }
  patternForFileSystemUISourceCode(uiSourceCode) {
    const relativePathParts = FileSystemWorkspaceBinding.relativePath(uiSourceCode);
    if (relativePathParts.length < 2) {
      return "";
    }
    if (relativePathParts[1] === "longurls" && relativePathParts.length !== 2) {
      if (relativePathParts[0] === "file:") {
        return "file:///*";
      }
      return "http?://" + relativePathParts[0] + "/*";
    }
    const path = this.decodeLocalPathToUrlPath(this.decodeLocalPathToUrlPath(relativePathParts.join("/")));
    if (path.startsWith("file:/")) {
      return "file:///" + path.substring("file:/".length);
    }
    return "http?://" + path;
  }
  // 'chrome://'-URLs and the Chrome Web Store are privileged URLs. We don't want users
  // to be able to override those. Ideally we'd have a similar check in the backend,
  // because the fix here has no effect on non-DevTools CDP clients.
  isForbiddenFileUrl(uiSourceCode) {
    const relativePathParts = FileSystemWorkspaceBinding.relativePath(uiSourceCode);
    const host = this.decodeLocalPathToUrlPath(this.decodeLocalPathToUrlPath(relativePathParts[0] || ""));
    return host === "chrome:" || forbiddenUrls.includes(host);
  }
  static isForbiddenNetworkUrl(urlString) {
    const url = Common9.ParsedURL.ParsedURL.fromString(urlString);
    if (!url) {
      return false;
    }
    return url.scheme === "chrome" || forbiddenUrls.includes(url.host);
  }
  async onUISourceCodeAdded(uiSourceCode) {
    await this.networkUISourceCodeAdded(uiSourceCode);
    await this.filesystemUISourceCodeAdded(uiSourceCode);
  }
  canHandleNetworkUISourceCode(uiSourceCode) {
    return this.#active && !Common9.ParsedURL.schemeIs(uiSourceCode.url(), "snippet:");
  }
  async networkUISourceCodeAdded(uiSourceCode) {
    if (uiSourceCode.project().type() !== Workspace9.Workspace.projectTypes.Network || !this.canHandleNetworkUISourceCode(uiSourceCode)) {
      return;
    }
    const url = Common9.ParsedURL.ParsedURL.urlWithoutHash(uiSourceCode.url());
    this.#networkUISourceCodeForEncodedPath.set(this.encodedPathFromUrl(url), uiSourceCode);
    const project = this.#project;
    const fileSystemUISourceCode = project.uiSourceCodeForURL(this.fileUrlFromNetworkUrl(url));
    if (fileSystemUISourceCode) {
      await this.#bind(uiSourceCode, fileSystemUISourceCode);
    }
    this.#maybeDispatchRequestsForHeaderOverridesFileChanged(uiSourceCode);
  }
  async filesystemUISourceCodeAdded(uiSourceCode) {
    if (!this.#active || uiSourceCode.project() !== this.#project) {
      return;
    }
    this.updateInterceptionPatterns();
    const relativePath = FileSystemWorkspaceBinding.relativePath(uiSourceCode);
    const networkUISourceCode = this.#networkUISourceCodeForEncodedPath.get(Common9.ParsedURL.ParsedURL.join(relativePath, "/"));
    if (networkUISourceCode) {
      await this.#bind(networkUISourceCode, uiSourceCode);
    }
  }
  async #getHeaderOverridesFromUiSourceCode(uiSourceCode) {
    const contentData = await uiSourceCode.requestContentData().then(TextUtils6.ContentData.ContentData.contentDataOrEmpty);
    const content = contentData.text || "[]";
    let headerOverrides = [];
    try {
      headerOverrides = JSON.parse(content);
      if (!headerOverrides.every(isHeaderOverride)) {
        throw new Error("Type mismatch after parsing");
      }
    } catch {
      console.error("Failed to parse", uiSourceCode.url(), "for locally overriding headers.");
      return [];
    }
    return headerOverrides;
  }
  #doubleDecodeEncodedPathString(relativePath) {
    const singlyDecodedPath = this.decodeLocalPathToUrlPath(relativePath);
    const decodedPath = this.decodeLocalPathToUrlPath(singlyDecodedPath);
    return { singlyDecodedPath, decodedPath };
  }
  async generateHeaderPatterns(uiSourceCode) {
    const headerOverrides = await this.#getHeaderOverridesFromUiSourceCode(uiSourceCode);
    const relativePathParts = FileSystemWorkspaceBinding.relativePath(uiSourceCode);
    const relativePath = Common9.ParsedURL.ParsedURL.slice(Common9.ParsedURL.ParsedURL.join(relativePathParts, "/"), 0, -HEADERS_FILENAME.length);
    const { singlyDecodedPath, decodedPath } = this.#doubleDecodeEncodedPathString(relativePath);
    let patterns;
    if (relativePathParts.length > 2 && relativePathParts[1] === "longurls" && headerOverrides.length) {
      patterns = this.#generateHeaderPatternsForLongUrl(decodedPath, headerOverrides, relativePathParts[0]);
    } else if (decodedPath.startsWith("file:/")) {
      patterns = this.#generateHeaderPatternsForFileUrl(Common9.ParsedURL.ParsedURL.substring(decodedPath, "file:/".length), headerOverrides);
    } else {
      patterns = this.#generateHeaderPatternsForHttpUrl(decodedPath, headerOverrides);
    }
    return { ...patterns, path: singlyDecodedPath };
  }
  #generateHeaderPatternsForHttpUrl(decodedPath, headerOverrides) {
    const headerPatterns = /* @__PURE__ */ new Set();
    const overridesWithRegex = [];
    for (const headerOverride of headerOverrides) {
      headerPatterns.add("http?://" + decodedPath + headerOverride.applyTo);
      if (decodedPath === "") {
        headerPatterns.add("file:///" + headerOverride.applyTo);
        overridesWithRegex.push({
          applyToRegex: new RegExp("^file:///" + escapeRegex(decodedPath + headerOverride.applyTo) + "$"),
          headers: headerOverride.headers
        });
      }
      const { head, tail } = extractDirectoryIndex(headerOverride.applyTo);
      if (tail) {
        headerPatterns.add("http?://" + decodedPath + head);
        overridesWithRegex.push({
          applyToRegex: new RegExp(`^${escapeRegex(decodedPath + head)}(${escapeRegex(tail)})?$`),
          headers: headerOverride.headers
        });
      } else {
        overridesWithRegex.push({
          applyToRegex: new RegExp(`^${escapeRegex(decodedPath + headerOverride.applyTo)}$`),
          headers: headerOverride.headers
        });
      }
    }
    return { headerPatterns, overridesWithRegex };
  }
  #generateHeaderPatternsForFileUrl(decodedPath, headerOverrides) {
    const headerPatterns = /* @__PURE__ */ new Set();
    const overridesWithRegex = [];
    for (const headerOverride of headerOverrides) {
      headerPatterns.add("file:///" + decodedPath + headerOverride.applyTo);
      overridesWithRegex.push({
        applyToRegex: new RegExp(`^file:/${escapeRegex(decodedPath + headerOverride.applyTo)}$`),
        headers: headerOverride.headers
      });
    }
    return { headerPatterns, overridesWithRegex };
  }
  // For very long URLs, part of the URL is hashed for local overrides, so that
  // the URL appears shorter. This special case is handled here.
  #generateHeaderPatternsForLongUrl(decodedPath, headerOverrides, relativePathPart) {
    const headerPatterns = /* @__PURE__ */ new Set();
    let { decodedPath: decodedPattern } = this.#doubleDecodeEncodedPathString(Common9.ParsedURL.ParsedURL.concatenate(relativePathPart, "/*"));
    const isFileUrl = decodedPath.startsWith("file:/");
    if (isFileUrl) {
      decodedPath = Common9.ParsedURL.ParsedURL.substring(decodedPath, "file:/".length);
      decodedPattern = Common9.ParsedURL.ParsedURL.substring(decodedPattern, "file:/".length);
    }
    headerPatterns.add((isFileUrl ? "file:///" : "http?://") + decodedPattern);
    const overridesWithRegex = [];
    for (const headerOverride of headerOverrides) {
      overridesWithRegex.push({
        applyToRegex: new RegExp(`^${isFileUrl ? "file:/" : ""}${escapeRegex(decodedPath + headerOverride.applyTo)}$`),
        headers: headerOverride.headers
      });
    }
    return { headerPatterns, overridesWithRegex };
  }
  async updateInterceptionPatternsForTests() {
    await this.#innerUpdateInterceptionPatterns();
  }
  updateInterceptionPatterns() {
    void this.#updateInterceptionThrottler.schedule(this.#innerUpdateInterceptionPatterns.bind(this));
  }
  async #innerUpdateInterceptionPatterns() {
    this.#headerOverridesMap.clear();
    if (!this.#active || !this.#project) {
      return await SDK3.NetworkManager.MultitargetNetworkManager.instance().setInterceptionHandlerForPatterns([], this.#interceptionHandlerBound);
    }
    let patterns = /* @__PURE__ */ new Set();
    for (const uiSourceCode of this.#project.uiSourceCodes()) {
      if (this.isForbiddenFileUrl(uiSourceCode)) {
        continue;
      }
      const pattern = this.patternForFileSystemUISourceCode(uiSourceCode);
      if (uiSourceCode.name() === HEADERS_FILENAME) {
        const { headerPatterns, path, overridesWithRegex } = await this.generateHeaderPatterns(uiSourceCode);
        if (headerPatterns.size > 0) {
          patterns = /* @__PURE__ */ new Set([...patterns, ...headerPatterns]);
          this.#headerOverridesMap.set(path, overridesWithRegex);
        }
      } else {
        patterns.add(pattern);
      }
      const { head, tail } = extractDirectoryIndex(pattern);
      if (tail) {
        patterns.add(head);
      }
    }
    return await SDK3.NetworkManager.MultitargetNetworkManager.instance().setInterceptionHandlerForPatterns(Array.from(patterns).map((pattern) => ({
      urlPattern: pattern,
      requestStage: "Response"
      /* Protocol.Fetch.RequestStage.Response */
    })), this.#interceptionHandlerBound);
  }
  async onUISourceCodeRemoved(uiSourceCode) {
    await this.networkUISourceCodeRemoved(uiSourceCode);
    await this.filesystemUISourceCodeRemoved(uiSourceCode);
  }
  async networkUISourceCodeRemoved(uiSourceCode) {
    if (uiSourceCode.project().type() === Workspace9.Workspace.projectTypes.Network) {
      await this.#unbind(uiSourceCode);
      this.#sourceCodeToBindProcessMutex.delete(uiSourceCode);
      this.#networkUISourceCodeForEncodedPath.delete(this.encodedPathFromUrl(uiSourceCode.url()));
    }
    this.#maybeDispatchRequestsForHeaderOverridesFileChanged(uiSourceCode);
  }
  // We consider a header override file as active, if it matches (= potentially contains
  // header overrides for) some of the current page's requests.
  // The editors (in the Sources panel) of active header override files should have an
  // emphasized icon. For regular overrides we use bindings to determine which editors
  // are active. For header overrides we do not have a 1:1 matching between the file
  // defining the header overrides and the request matching the override definition,
  // because a single '.headers' file can contain header overrides for multiple requests.
  // For each request, we therefore look whether one or more matching header override
  // files exist, and if they do, for each of them we emit an event, which causes
  // potential matching editors to update their icon.
  #maybeDispatchRequestsForHeaderOverridesFileChanged(uiSourceCode) {
    if (!this.#project) {
      return;
    }
    const project = this.#project;
    const fileUrl = this.fileUrlFromNetworkUrl(uiSourceCode.url());
    for (let i = project.fileSystemPath().length; i < fileUrl.length; i++) {
      if (fileUrl[i] !== "/") {
        continue;
      }
      const headersFilePath = Common9.ParsedURL.ParsedURL.concatenate(Common9.ParsedURL.ParsedURL.substring(fileUrl, 0, i + 1), ".headers");
      const headersFileUiSourceCode = project.uiSourceCodeForURL(headersFilePath);
      if (!headersFileUiSourceCode) {
        continue;
      }
      this.#headerOverridesForEventDispatch.add(headersFileUiSourceCode);
      void this.#eventDispatchThrottler.schedule(this.#dispatchRequestsForHeaderOverridesFileChanged.bind(this));
    }
  }
  #dispatchRequestsForHeaderOverridesFileChanged() {
    for (const headersFileUiSourceCode of this.#headerOverridesForEventDispatch) {
      this.dispatchEventToListeners("RequestsForHeaderOverridesFileChanged", headersFileUiSourceCode);
    }
    this.#headerOverridesForEventDispatch.clear();
    return Promise.resolve();
  }
  hasMatchingNetworkUISourceCodeForHeaderOverridesFile(headersFile) {
    const relativePathParts = FileSystemWorkspaceBinding.relativePath(headersFile);
    const relativePath = Common9.ParsedURL.ParsedURL.slice(Common9.ParsedURL.ParsedURL.join(relativePathParts, "/"), 0, -HEADERS_FILENAME.length);
    for (const encodedNetworkPath of this.#networkUISourceCodeForEncodedPath.keys()) {
      if (encodedNetworkPath.startsWith(relativePath)) {
        return true;
      }
    }
    return false;
  }
  async filesystemUISourceCodeRemoved(uiSourceCode) {
    if (uiSourceCode.project() !== this.#project) {
      return;
    }
    this.updateInterceptionPatterns();
    this.#originalResponseContentPromises.delete(uiSourceCode);
    await this.#unbind(uiSourceCode);
  }
  async setProject(project) {
    if (project === this.#project) {
      return;
    }
    if (this.#project) {
      await Promise.all([...this.#project.uiSourceCodes()].map((uiSourceCode) => this.filesystemUISourceCodeRemoved(uiSourceCode)));
    }
    this.#project = project;
    if (this.#project) {
      await Promise.all([...this.#project.uiSourceCodes()].map((uiSourceCode) => this.filesystemUISourceCodeAdded(uiSourceCode)));
    }
    await this.updateActiveProject();
    this.dispatchEventToListeners("ProjectChanged", this.#project);
  }
  async onProjectAdded(project) {
    if (project.type() !== Workspace9.Workspace.projectTypes.FileSystem || FileSystemWorkspaceBinding.fileSystemType(project) !== "overrides") {
      return;
    }
    const fileSystemPath = FileSystemWorkspaceBinding.fileSystemPath(project.id());
    if (!fileSystemPath) {
      return;
    }
    if (this.#project) {
      this.#project.remove();
    }
    await this.setProject(project);
  }
  async onProjectRemoved(project) {
    for (const uiSourceCode of project.uiSourceCodes()) {
      await this.networkUISourceCodeRemoved(uiSourceCode);
    }
    if (project === this.#project) {
      await this.setProject(null);
    }
  }
  mergeHeaders(baseHeaders, overrideHeaders) {
    const headerMap = new Platform11.MapUtilities.Multimap();
    for (const { name, value } of overrideHeaders) {
      if (name.toLowerCase() !== "set-cookie") {
        headerMap.set(name.toLowerCase(), value);
      }
    }
    const overriddenHeaderNames = new Set(headerMap.keysArray());
    for (const { name, value } of baseHeaders) {
      const lowerCaseName = name.toLowerCase();
      if (!overriddenHeaderNames.has(lowerCaseName) && lowerCaseName !== "set-cookie") {
        headerMap.set(lowerCaseName, value);
      }
    }
    const result = [];
    for (const headerName of headerMap.keysArray()) {
      for (const headerValue of headerMap.get(headerName)) {
        result.push({ name: headerName, value: headerValue });
      }
    }
    const originalSetCookieHeaders = baseHeaders.filter((header) => header.name.toLowerCase() === "set-cookie") || [];
    const setCookieHeadersFromOverrides = overrideHeaders.filter((header) => header.name.toLowerCase() === "set-cookie");
    const mergedHeaders = SDK3.NetworkManager.InterceptedRequest.mergeSetCookieHeaders(originalSetCookieHeaders, setCookieHeadersFromOverrides);
    result.push(...mergedHeaders);
    return result;
  }
  #maybeMergeHeadersForPathSegment(path, requestUrl, headers) {
    const headerOverrides = this.#headerOverridesMap.get(path) || [];
    for (const headerOverride of headerOverrides) {
      const requestUrlWithLongUrlReplacement = this.decodeLocalPathToUrlPath(this.rawPathFromUrl(requestUrl));
      if (headerOverride.applyToRegex.test(requestUrlWithLongUrlReplacement)) {
        headers = this.mergeHeaders(headers, headerOverride.headers);
      }
    }
    return headers;
  }
  handleHeaderInterception(interceptedRequest) {
    let result = interceptedRequest.responseHeaders || [];
    const urlSegments = this.rawPathFromUrl(interceptedRequest.request.url).split("/");
    let path = Platform11.DevToolsPath.EmptyEncodedPathString;
    result = this.#maybeMergeHeadersForPathSegment(path, interceptedRequest.request.url, result);
    for (const segment of urlSegments) {
      path = Common9.ParsedURL.ParsedURL.concatenate(path, segment, "/");
      result = this.#maybeMergeHeadersForPathSegment(path, interceptedRequest.request.url, result);
    }
    return result;
  }
  async interceptionHandler(interceptedRequest) {
    const method = interceptedRequest.request.method;
    if (!this.#active || method === "OPTIONS") {
      return;
    }
    const proj = this.#project;
    const path = this.fileUrlFromNetworkUrl(interceptedRequest.request.url);
    const fileSystemUISourceCode = proj.uiSourceCodeForURL(path);
    let responseHeaders = this.handleHeaderInterception(interceptedRequest);
    if (!fileSystemUISourceCode && !responseHeaders.length) {
      return;
    }
    if (!responseHeaders.length) {
      responseHeaders = interceptedRequest.responseHeaders || [];
    }
    let { mimeType } = interceptedRequest.getMimeTypeAndCharset();
    if (!mimeType) {
      const expectedResourceType = Common9.ResourceType.resourceTypes[interceptedRequest.resourceType] || Common9.ResourceType.resourceTypes.Other;
      mimeType = fileSystemUISourceCode?.mimeType() || "";
      if (Common9.ResourceType.ResourceType.fromMimeType(mimeType) !== expectedResourceType) {
        mimeType = expectedResourceType.canonicalMimeType();
      }
    }
    if (fileSystemUISourceCode) {
      this.#originalResponseContentPromises.set(fileSystemUISourceCode, interceptedRequest.responseBody().then((response) => {
        if (TextUtils6.ContentData.ContentData.isError(response) || !response.isTextContent) {
          return null;
        }
        return response.text;
      }));
      const project = fileSystemUISourceCode.project();
      const blob = await project.requestFileBlob(fileSystemUISourceCode);
      if (blob) {
        void interceptedRequest.continueRequestWithContent(
          new Blob([blob], { type: mimeType }),
          /* encoded */
          false,
          responseHeaders,
          /* isBodyOverridden */
          true
        );
      }
    } else if (interceptedRequest.isRedirect()) {
      void interceptedRequest.continueRequestWithContent(
        new Blob([], { type: mimeType }),
        /* encoded */
        true,
        responseHeaders,
        /* isBodyOverridden */
        false
      );
    } else {
      const responseBody = await interceptedRequest.responseBody();
      if (!TextUtils6.ContentData.ContentData.isError(responseBody)) {
        const content = responseBody.isTextContent ? responseBody.text : responseBody.base64;
        void interceptedRequest.continueRequestWithContent(
          new Blob([content], { type: mimeType }),
          /* encoded */
          !responseBody.isTextContent,
          responseHeaders,
          /* isBodyOverridden */
          false
        );
      }
    }
  }
};
var RESERVED_FILENAMES = /* @__PURE__ */ new Set([
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9"
]);
var HEADERS_FILENAME = ".headers";
function isHeaderOverride(arg) {
  if (!(arg && typeof arg.applyTo === "string" && arg.headers?.length && Array.isArray(arg.headers))) {
    return false;
  }
  return arg.headers.every((header) => typeof header.name === "string" && typeof header.value === "string");
}
function escapeRegex(pattern) {
  return Platform11.StringUtilities.escapeCharacters(pattern, "[]{}()\\.^$+|-,?").replaceAll("*", ".*");
}
function extractDirectoryIndex(pattern) {
  const lastSlash = pattern.lastIndexOf("/");
  const tail = lastSlash >= 0 ? pattern.slice(lastSlash + 1) : pattern;
  const head = lastSlash >= 0 ? pattern.slice(0, lastSlash + 1) : "";
  const regex = new RegExp("^" + escapeRegex(tail) + "$");
  if (tail !== "*" && (regex.test("index.html") || regex.test("index.htm") || regex.test("index.php"))) {
    return { head, tail };
  }
  return { head: pattern };
}
export {
  Automapping_exports as Automapping,
  AutomaticFileSystemManager_exports as AutomaticFileSystemManager,
  AutomaticFileSystemWorkspaceBinding_exports as AutomaticFileSystemWorkspaceBinding,
  FileSystemWorkspaceBinding_exports as FileSystemWorkspaceBinding,
  IsolatedFileSystem_exports as IsolatedFileSystem,
  IsolatedFileSystemManager_exports as IsolatedFileSystemManager,
  NetworkPersistenceManager_exports as NetworkPersistenceManager,
  PersistenceImpl_exports as Persistence,
  PlatformFileSystem_exports as PlatformFileSystem
};
//# sourceMappingURL=persistence.js.map
