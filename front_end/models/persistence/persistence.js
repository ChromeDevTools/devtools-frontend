var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/persistence/Automapping.ts
var Automapping_exports = {};
__export(Automapping_exports, {
  Automapping: () => Automapping,
  AutomappingStatus: () => AutomappingStatus
});
import * as Common6 from "../../core/common/common.js";
import * as Host5 from "../../core/host/host.js";
import * as SDK2 from "../../core/sdk/sdk.js";
import * as TextUtils5 from "../../core/text_utils/text_utils.js";
import * as Bindings2 from "../bindings/bindings.js";
import * as Workspace5 from "../workspace/workspace.js";

// ../../front_end/models/persistence/FileSystemWorkspaceBinding.ts
var FileSystemWorkspaceBinding_exports = {};
__export(FileSystemWorkspaceBinding_exports, {
  FileSystem: () => FileSystem,
  FileSystemWorkspaceBinding: () => FileSystemWorkspaceBinding
});
import * as Common4 from "../../core/common/common.js";
import * as Host3 from "../../core/host/host.js";
import * as Platform5 from "../../core/platform/platform.js";
import * as TextUtils2 from "../../core/text_utils/text_utils.js";
import * as Workspace from "../workspace/workspace.js";

// ../../front_end/models/persistence/IsolatedFileSystemManager.ts
var IsolatedFileSystemManager_exports = {};
__export(IsolatedFileSystemManager_exports, {
  Events: () => Events2,
  IsolatedFileSystemManager: () => IsolatedFileSystemManager
});
import * as Common3 from "../../core/common/common.js";
import * as Host2 from "../../core/host/host.js";
import * as i18n5 from "../../core/i18n/i18n.js";
import * as Platform4 from "../../core/platform/platform.js";
import * as Root from "../../core/root/root.js";

// ../../front_end/models/persistence/IsolatedFileSystem.ts
var IsolatedFileSystem_exports = {};
__export(IsolatedFileSystem_exports, {
  BinaryExtensions: () => BinaryExtensions,
  IsolatedFileSystem: () => IsolatedFileSystem
});
import * as Common2 from "../../core/common/common.js";
import * as Host from "../../core/host/host.js";
import * as i18n3 from "../../core/i18n/i18n.js";
import * as Platform2 from "../../core/platform/platform.js";
import * as TextUtils from "../../core/text_utils/text_utils.js";

// ../../front_end/models/persistence/PlatformFileSystem.ts
var PlatformFileSystem_exports = {};
__export(PlatformFileSystem_exports, {
  Events: () => Events,
  PlatformFileSystem: () => PlatformFileSystem,
  PlatformFileSystemType: () => PlatformFileSystemType
});
import * as Common from "../../core/common/common.js";
import * as i18n from "../../core/i18n/i18n.js";
var UIStrings = {
  /**
   * @description Assertion error message when failing to load a file.
   */
  unableToReadFilesWithThis: "`PlatformFileSystem` can\u2019t read files"
};
var str_ = i18n.i18n.registerUIStrings("models/persistence/PlatformFileSystem.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var PlatformFileSystemType = /* @__PURE__ */ ((PlatformFileSystemType2) => {
  PlatformFileSystemType2["SNIPPETS"] = "snippets";
  PlatformFileSystemType2["OVERRIDES"] = "overrides";
  PlatformFileSystemType2["WORKSPACE_PROJECT"] = "workspace-project";
  return PlatformFileSystemType2;
})(PlatformFileSystemType || {});
var Events = /* @__PURE__ */ ((Events6) => {
  Events6["FILE_SYSTEM_ERROR"] = "file-system-error";
  return Events6;
})(Events || {});
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

// ../../front_end/models/persistence/IsolatedFileSystem.ts
var UIStrings2 = {
  /**
   * @description Text in isolated file system of workspace settings in Settings.
   * @example {folder does not exist} PH1
   */
  fileSystemErrorS: "File system error: {PH1}",
  /**
   * @description Error message when reading a remote blob.
   */
  blobCouldNotBeLoaded: "Blob couldn\u2019t be loaded",
  /**
   * @description Error message when reading a file.
   * @example {c:\dir\file.js} PH1
   * @example {Underlying error} PH2
   */
  cantReadFileSS: "Can\u2019t read file: {PH1}: {PH2}",
  /**
   * @description Text to show something is linked to another.
   * @example {example.url} PH1
   */
  linkedToS: "Linked to {PH1}",
  /**
   * @description Error message shown when DevTools failed to create a file system directory.
   * @example {path/} PH1
   */
  createDirFailedBecausePathIsFile: "Overrides: Failed to create directory {PH1} because the path exists and is a file",
  /**
   * @description Error message shown when DevTools failed to create a file system directory.
   * @example {path/} PH1
   */
  createDirFailed: "Overrides: Failed to create directory {PH1}. Are the workspace or overrides configured correctly?"
};
var str_2 = i18n3.i18n.registerUIStrings("models/persistence/IsolatedFileSystem.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var IsolatedFileSystem = class _IsolatedFileSystem extends PlatformFileSystem {
  manager;
  #embedderPath;
  domFileSystem;
  excludedFoldersSetting;
  #excludedFolders;
  excludedEmbedderFolders = [];
  #initialFilePaths = /* @__PURE__ */ new Set();
  #initialGitFolders = /* @__PURE__ */ new Set();
  fileLocks = /* @__PURE__ */ new Map();
  constructor(manager, path, embedderPath, domFileSystem, type, automatic, settings) {
    super(path, type, automatic);
    this.manager = manager;
    this.#embedderPath = embedderPath;
    this.domFileSystem = domFileSystem;
    this.excludedFoldersSetting = settings.createLocalSetting("workspace-excluded-folders", {});
    this.#excludedFolders = new Set(this.excludedFoldersSetting.get()[path] || []);
  }
  static async create(manager, path, embedderPath, type, name, rootURL, automatic, settings) {
    const domFileSystem = Host.InspectorFrontendHost.InspectorFrontendHostInstance.isolatedFileSystem(name, rootURL);
    if (!domFileSystem) {
      return null;
    }
    const fileSystem = new _IsolatedFileSystem(manager, path, embedderPath, domFileSystem, type, automatic, settings);
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
    this.domFileSystem.root.getFile(
      Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(path),
      void 0,
      fileEntryLoaded,
      errorHandler
    );
    return promise;
    function fileEntryLoaded(entry) {
      entry.getMetadata(resolve, errorHandler);
    }
    function errorHandler(error) {
      const errorMessage = _IsolatedFileSystem.errorMessage(error);
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
            if (this.isFileExcluded(Common2.ParsedURL.ParsedURL.rawPathToEncodedPathString(
              entry.fullPath
            ))) {
              continue;
            }
            this.#initialFilePaths.add(Common2.ParsedURL.ParsedURL.rawPathToEncodedPathString(
              Common2.ParsedURL.ParsedURL.substr(entry.fullPath, 1)
            ));
          } else {
            if (entry.fullPath.endsWith("/.git")) {
              const lastSlash = entry.fullPath.lastIndexOf("/");
              const parentFolder = Common2.ParsedURL.ParsedURL.substr(
                entry.fullPath,
                1,
                lastSlash
              );
              this.#initialGitFolders.add(Common2.ParsedURL.ParsedURL.rawPathToEncodedPathString(parentFolder));
            }
            if (this.isFileExcluded(Common2.ParsedURL.ParsedURL.concatenate(
              Common2.ParsedURL.ParsedURL.rawPathToEncodedPathString(
                entry.fullPath
              ),
              "/"
            ))) {
              const url = Common2.ParsedURL.ParsedURL.concatenate(
                this.path(),
                Common2.ParsedURL.ParsedURL.rawPathToEncodedPathString(
                  entry.fullPath
                )
              );
              this.excludedEmbedderFolders.push(
                Common2.ParsedURL.ParsedURL.urlToRawPathString(url, Host.Platform.isWin())
              );
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
    let dirEntry = await new Promise(
      (resolve) => this.domFileSystem.root.getDirectory(folderPath, void 0, resolve, () => resolve(null))
    );
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
        this.domFileSystem.root.getFile(
          path,
          void 0,
          () => this.dispatchEventToListeners(
            "file-system-error" /* FILE_SYSTEM_ERROR */,
            i18nString2(UIStrings2.createDirFailedBecausePathIsFile, { PH1: path })
          ),
          () => this.dispatchEventToListeners(
            "file-system-error" /* FILE_SYSTEM_ERROR */,
            i18nString2(UIStrings2.createDirFailed, { PH1: path })
          )
        );
        const errorMessage = _IsolatedFileSystem.errorMessage(error);
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
    const fileEntry = await this.serializedFileOperation(
      path,
      createFileCandidate.bind(this, name || "NewFile")
    );
    if (!fileEntry) {
      return null;
    }
    return Common2.ParsedURL.ParsedURL.rawPathToEncodedPathString(
      Common2.ParsedURL.ParsedURL.substr(fileEntry.fullPath, 1)
    );
    function createFileCandidate(name2, newFileIndex) {
      return new Promise((resolve) => {
        const nameCandidate = Common2.ParsedURL.ParsedURL.concatenate(name2, (newFileIndex || "").toString());
        dirEntry.getFile(nameCandidate, { create: true, exclusive: true }, resolve, (error) => {
          if (error.name === "InvalidModificationError") {
            resolve(createFileCandidate.call(this, name2, newFileIndex ? newFileIndex + 1 : 1));
            return;
          }
          const errorMessage = _IsolatedFileSystem.errorMessage(error);
          console.error(
            errorMessage + " when testing if file exists '" + (this.path() + "/" + path + "/" + nameCandidate) + "'"
          );
          resolve(null);
        });
      });
    }
  }
  deleteFile(path) {
    const { promise, resolve } = Promise.withResolvers();
    this.domFileSystem.root.getFile(
      Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(path),
      void 0,
      fileEntryLoaded.bind(this),
      errorHandler.bind(this)
    );
    return promise;
    function fileEntryLoaded(fileEntry) {
      fileEntry.remove(fileEntryRemoved, errorHandler.bind(this));
    }
    function fileEntryRemoved() {
      resolve(true);
    }
    function errorHandler(error) {
      const errorMessage = _IsolatedFileSystem.errorMessage(error);
      console.error(errorMessage + " when deleting file '" + (this.path() + "/" + path) + "'");
      resolve(false);
    }
  }
  deleteDirectoryRecursively(path) {
    const { promise, resolve } = Promise.withResolvers();
    this.domFileSystem.root.getDirectory(
      Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(path),
      void 0,
      dirEntryLoaded.bind(this),
      errorHandler.bind(this)
    );
    return promise;
    function dirEntryLoaded(dirEntry) {
      dirEntry.removeRecursively(dirEntryRemoved, errorHandler.bind(this));
    }
    function dirEntryRemoved() {
      resolve(true);
    }
    function errorHandler(error) {
      const errorMessage = _IsolatedFileSystem.errorMessage(error);
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
        const errorMessage = _IsolatedFileSystem.errorMessage(error);
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
      this.domFileSystem.root.getFile(
        Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(path),
        { create: true },
        fileEntryLoaded.bind(this),
        errorHandler.bind(this)
      );
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
      const errorMessage = _IsolatedFileSystem.errorMessage(error);
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
    this.domFileSystem.root.getFile(
      Common2.ParsedURL.ParsedURL.encodedPathToRawPathString(path),
      void 0,
      fileEntryLoaded.bind(this),
      errorHandler.bind(this)
    );
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
      const errorMessage = _IsolatedFileSystem.errorMessage(error);
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
      const errorMessage = _IsolatedFileSystem.errorMessage(error);
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
      const errorMessage = _IsolatedFileSystem.errorMessage(error);
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
    this.manager.dispatchEventToListeners("ExcludedFolderAdded" /* ExcludedFolderAdded */, path);
  }
  removeExcludedFolder(path) {
    this.#excludedFolders.delete(path);
    this.saveExcludedFolders();
    this.manager.dispatchEventToListeners("ExcludedFolderRemoved" /* ExcludedFolderRemoved */, path);
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
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.indexPath(
      requestId,
      this.#embedderPath,
      JSON.stringify(this.excludedEmbedderFolders)
    );
  }
  mimeFromPath(path) {
    return Common2.ResourceType.ResourceType.mimeFromURL(path) || "text/plain";
  }
  canExcludeFolder(path) {
    return Boolean(path) && this.type() !== "overrides" /* OVERRIDES */;
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
    const path = Platform2.StringUtilities.trimMiddle(
      Common2.ParsedURL.ParsedURL.urlToRawPathString(url, Host.Platform.isWin()),
      150
    );
    return i18nString2(UIStrings2.linkedToS, { PH1: path });
  }
  supportsAutomapping() {
    return this.type() !== "overrides" /* OVERRIDES */;
  }
};
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

// ../../front_end/models/persistence/IsolatedFileSystemManager.ts
var UIStrings3 = {
  /**
   * @description Text in isolated file system manager of workspace settings in Settings.
   * @example {folder does not exist} PH1
   */
  unableToAddFilesystemS: "Can\u2019t add file system: {PH1}"
};
var str_3 = i18n5.i18n.registerUIStrings("models/persistence/IsolatedFileSystemManager.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var IsolatedFileSystemManager = class _IsolatedFileSystemManager extends Common3.ObjectWrapper.ObjectWrapper {
  #fileSystems;
  callbacks;
  progresses;
  #workspaceFolderExcludePatternSetting;
  fileSystemRequestResolve;
  fileSystemsLoadedPromise;
  #settings;
  #console;
  #eventDescriptors;
  constructor(settings, console2) {
    super();
    this.#settings = settings;
    this.#console = console2;
    this.#fileSystems = /* @__PURE__ */ new Map();
    this.callbacks = /* @__PURE__ */ new Map();
    this.progresses = /* @__PURE__ */ new Map();
    this.#eventDescriptors = [
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host2.InspectorFrontendHostAPI.Events.FileSystemRemoved,
        this.onFileSystemRemoved,
        this
      ),
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host2.InspectorFrontendHostAPI.Events.FileSystemAdded,
        this.onFileSystemAdded,
        this
      ),
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host2.InspectorFrontendHostAPI.Events.FileSystemFilesChangedAddedRemoved,
        this.onFileSystemFilesChanged,
        this
      ),
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host2.InspectorFrontendHostAPI.Events.IndexingTotalWorkCalculated,
        this.onIndexingTotalWorkCalculated,
        this
      ),
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host2.InspectorFrontendHostAPI.Events.IndexingWorked,
        this.onIndexingWorked,
        this
      ),
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host2.InspectorFrontendHostAPI.Events.IndexingDone,
        this.onIndexingDone,
        this
      ),
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host2.InspectorFrontendHostAPI.Events.SearchCompleted,
        this.onSearchCompleted,
        this
      )
    ];
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
    this.#workspaceFolderExcludePatternSetting = this.#settings.createRegExpSetting(
      "workspace-folder-exclude-pattern",
      defaultExcludedFoldersPattern,
      Host2.Platform.isWin() ? "i" : ""
    );
    this.fileSystemRequestResolve = null;
    this.fileSystemsLoadedPromise = this.requestFileSystems();
  }
  // TODO(crbug.com/542394587): Should be `Symbol.dispsoe`
  dispose() {
    Common3.EventTarget.removeEventListeners(this.#eventDescriptors);
  }
  static instance(opts = {}) {
    const forceNew = opts.forceNew ?? null;
    const settings = opts.settings ?? Common3.Settings.Settings.instance();
    const console2 = opts.console ?? Common3.Console.Console.instance();
    if (!Root.DevToolsContext.globalInstance().has(_IsolatedFileSystemManager) || forceNew) {
      const instance = new _IsolatedFileSystemManager(settings, console2);
      Root.DevToolsContext.globalInstance().set(_IsolatedFileSystemManager, instance);
    }
    return Root.DevToolsContext.globalInstance().get(_IsolatedFileSystemManager);
  }
  static removeInstance() {
    Root.DevToolsContext.globalInstance().delete(_IsolatedFileSystemManager);
  }
  requestFileSystems() {
    const { resolve, promise } = Promise.withResolvers();
    const descriptor = Host2.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
      Host2.InspectorFrontendHostAPI.Events.FileSystemsLoaded,
      onFileSystemsLoaded,
      this
    );
    this.#eventDescriptors.push(descriptor);
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
    Host2.userMetrics.actionTaken(
      type === "overrides" ? Host2.UserMetrics.Action.OverrideTabAddFolder : Host2.UserMetrics.Action.WorkspaceTabAddFolder
    );
    return new Promise((resolve) => {
      this.fileSystemRequestResolve = resolve;
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.addFileSystem(type || "");
    });
  }
  removeFileSystem(fileSystem) {
    Host2.userMetrics.actionTaken(
      fileSystem.type() === "overrides" /* OVERRIDES */ ? Host2.UserMetrics.Action.OverrideTabRemoveFolder : Host2.UserMetrics.Action.WorkspaceTabRemoveFolder
    );
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.removeFileSystem(fileSystem.embedderPath());
  }
  waitForFileSystems() {
    return this.fileSystemsLoadedPromise;
  }
  #addFileSystem(fileSystem, dispatchEvent) {
    const embedderPath = fileSystem.fileSystemPath;
    const fileSystemURL = Common3.ParsedURL.ParsedURL.rawPathToUrlString(fileSystem.fileSystemPath);
    const promise = IsolatedFileSystem.create(
      this,
      fileSystemURL,
      embedderPath,
      hostFileSystemTypeToPlatformFileSystemType(fileSystem.type),
      fileSystem.fileSystemName,
      fileSystem.rootURL,
      fileSystem.type === "automatic",
      this.#settings
    );
    return promise.then(storeFileSystem.bind(this));
    function storeFileSystem(fileSystem2) {
      if (!fileSystem2) {
        return null;
      }
      this.#fileSystems.set(fileSystemURL, fileSystem2);
      fileSystem2.addEventListener("file-system-error" /* FILE_SYSTEM_ERROR */, this.#onFileSystemError, this);
      if (dispatchEvent) {
        this.dispatchEventToListeners("FileSystemAdded" /* FileSystemAdded */, fileSystem2);
      }
      return fileSystem2;
    }
  }
  addPlatformFileSystem(fileSystemURL, fileSystem) {
    this.#fileSystems.set(fileSystemURL, fileSystem);
    fileSystem.addEventListener("file-system-error" /* FILE_SYSTEM_ERROR */, this.#onFileSystemError, this);
    this.dispatchEventToListeners("FileSystemAdded" /* FileSystemAdded */, fileSystem);
  }
  onFileSystemAdded(event) {
    const { errorMessage, fileSystem } = event.data;
    if (errorMessage) {
      if (errorMessage !== "<selection cancelled>" && errorMessage !== "<permission denied>") {
        this.#console.error(i18nString3(UIStrings3.unableToAddFilesystemS, { PH1: errorMessage }));
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
    this.dispatchEventToListeners("FileSystemError" /* FileSystemError */, event.data);
  }
  onFileSystemRemoved(event) {
    const embedderPath = event.data;
    const fileSystemPath = Common3.ParsedURL.ParsedURL.rawPathToUrlString(embedderPath);
    const isolatedFileSystem = this.#fileSystems.get(fileSystemPath);
    if (!isolatedFileSystem) {
      return;
    }
    this.#fileSystems.delete(fileSystemPath);
    isolatedFileSystem.removeEventListener("file-system-error" /* FILE_SYSTEM_ERROR */, this.#onFileSystemError, this);
    isolatedFileSystem.fileSystemRemoved();
    this.dispatchEventToListeners("FileSystemRemoved" /* FileSystemRemoved */, isolatedFileSystem);
  }
  onFileSystemFilesChanged(event) {
    const urlPaths = {
      changed: groupFilePathsIntoFileSystemPaths.call(this, event.data.changed),
      added: groupFilePathsIntoFileSystemPaths.call(this, event.data.added),
      removed: groupFilePathsIntoFileSystemPaths.call(this, event.data.removed)
    };
    this.dispatchEventToListeners("FileSystemFilesChanged" /* FileSystemFilesChanged */, urlPaths);
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
var Events2 = /* @__PURE__ */ ((Events6) => {
  Events6["FileSystemAdded"] = "FileSystemAdded";
  Events6["FileSystemRemoved"] = "FileSystemRemoved";
  Events6["FileSystemFilesChanged"] = "FileSystemFilesChanged";
  Events6["ExcludedFolderAdded"] = "ExcludedFolderAdded";
  Events6["ExcludedFolderRemoved"] = "ExcludedFolderRemoved";
  Events6["FileSystemError"] = "FileSystemError";
  return Events6;
})(Events2 || {});
var lastRequestId = 0;
function hostFileSystemTypeToPlatformFileSystemType(type) {
  switch (type) {
    case "snippets":
      return "snippets" /* SNIPPETS */;
    case "overrides":
      return "overrides" /* OVERRIDES */;
    default:
      return "workspace-project" /* WORKSPACE_PROJECT */;
  }
}

// ../../front_end/models/persistence/FileSystemWorkspaceBinding.ts
var FileSystemWorkspaceBinding = class {
  isolatedFileSystemManager;
  #workspace;
  #eventListeners;
  #boundFileSystems = /* @__PURE__ */ new Map();
  constructor(isolatedFileSystemManager, workspace) {
    this.isolatedFileSystemManager = isolatedFileSystemManager;
    this.#workspace = workspace;
    this.#eventListeners = [
      this.isolatedFileSystemManager.addEventListener("FileSystemAdded" /* FileSystemAdded */, this.onFileSystemAdded, this),
      this.isolatedFileSystemManager.addEventListener("FileSystemRemoved" /* FileSystemRemoved */, this.onFileSystemRemoved, this),
      this.isolatedFileSystemManager.addEventListener("FileSystemFilesChanged" /* FileSystemFilesChanged */, this.fileSystemFilesChanged, this)
    ];
    void this.isolatedFileSystemManager.waitForFileSystems().then(this.onFileSystemsLoaded.bind(this));
  }
  static projectId(fileSystemPath) {
    return fileSystemPath;
  }
  static relativePath(uiSourceCode) {
    const baseURL = uiSourceCode.project().fileSystemBaseURL;
    return Common4.ParsedURL.ParsedURL.split(
      Common4.ParsedURL.ParsedURL.sliceUrlToEncodedPathString(uiSourceCode.url(), baseURL.length),
      "/"
    );
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
    return this.#fileSystem.initialGitFolders().map(
      (folder) => Common4.ParsedURL.ParsedURL.concatenate(this.#fileSystemPath, "/", folder)
    );
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
      workingFileSet = Platform5.ArrayUtilities.intersectOrdered(
        workingFileSet,
        files,
        Platform5.StringUtilities.naturalOrderComparator
      );
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
        globalThis.setTimeout(reportFileChunk.bind(this, to), 100);
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

// ../../front_end/models/persistence/PersistenceImpl.ts
var PersistenceImpl_exports = {};
__export(PersistenceImpl_exports, {
  Events: () => Events3,
  NodePrefix: () => NodePrefix,
  NodeShebang: () => NodeShebang,
  NodeSuffix: () => NodeSuffix,
  PersistenceBinding: () => PersistenceBinding,
  PersistenceImpl: () => PersistenceImpl
});
import * as Common5 from "../../core/common/common.js";
import * as Host4 from "../../core/host/host.js";
import * as Platform7 from "../../core/platform/platform.js";
import * as Root2 from "../../core/root/root.js";
import * as SDK from "../../core/sdk/sdk.js";
import * as TextUtils4 from "../../core/text_utils/text_utils.js";
import * as Bindings from "../bindings/bindings.js";
import * as BreakpointManager from "../breakpoints/breakpoints.js";
import * as Workspace3 from "../workspace/workspace.js";
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
    if (!Root2.DevToolsContext.globalInstance().has(_PersistenceImpl) || forceNew) {
      if (!workspace || !breakpointManager) {
        throw new Error("Missing arguments for workspace");
      }
      Root2.DevToolsContext.globalInstance().set(_PersistenceImpl, new _PersistenceImpl(workspace, breakpointManager));
    }
    return Root2.DevToolsContext.globalInstance().get(_PersistenceImpl);
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
    binding.network.addEventListener(
      Workspace3.UISourceCode.Events.WorkingCopyCommitted,
      this.onWorkingCopyCommitted,
      this
    );
    binding.fileSystem.addEventListener(
      Workspace3.UISourceCode.Events.WorkingCopyCommitted,
      this.onWorkingCopyCommitted,
      this
    );
    binding.network.addEventListener(Workspace3.UISourceCode.Events.WorkingCopyChanged, this.onWorkingCopyChanged, this);
    binding.fileSystem.addEventListener(
      Workspace3.UISourceCode.Events.WorkingCopyChanged,
      this.onWorkingCopyChanged,
      this
    );
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
    this.dispatchEventToListeners("BindingCreated" /* BindingCreated */, binding);
  }
  async #removeBinding(binding) {
    if (bindings.get(binding.network) !== binding) {
      return;
    }
    console.assert(
      bindings.get(binding.network) === bindings.get(binding.fileSystem),
      "ERROR: inconsistent binding for networkURL " + binding.network.url()
    );
    bindings.delete(binding.network);
    bindings.delete(binding.fileSystem);
    binding.network.removeEventListener(
      Workspace3.UISourceCode.Events.WorkingCopyCommitted,
      this.onWorkingCopyCommitted,
      this
    );
    binding.fileSystem.removeEventListener(
      Workspace3.UISourceCode.Events.WorkingCopyCommitted,
      this.onWorkingCopyCommitted,
      this
    );
    binding.network.removeEventListener(
      Workspace3.UISourceCode.Events.WorkingCopyChanged,
      this.onWorkingCopyChanged,
      this
    );
    binding.fileSystem.removeEventListener(
      Workspace3.UISourceCode.Events.WorkingCopyChanged,
      this.onWorkingCopyChanged,
      this
    );
    this.#filePathPrefixesToBindingCount.remove(binding.fileSystem.url());
    await this.#breakpointManager.copyBreakpoints(binding.network, binding.fileSystem);
    this.notifyBindingEvent(binding.network);
    this.notifyBindingEvent(binding.fileSystem);
    this.dispatchEventToListeners("BindingRemoved" /* BindingRemoved */, binding);
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
    const breakpoints = this.#breakpointManager.breakpointLocationsForUISourceCode(from).map(
      (breakpointLocation) => breakpointLocation.breakpoint
    );
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
        BreakpointManager.BreakpointManager.BreakpointOrigin.OTHER
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
  /**
   * Returns whether the UISourceCode has editable content - either its project
   * supports file content changes, or it has a persistence binding to a file system.
   */
  hasEditableContent(uiSourceCode) {
    return uiSourceCode.project().canSetFileContent() || this.binding(uiSourceCode) !== null;
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
var Events3 = /* @__PURE__ */ ((Events6) => {
  Events6["BindingCreated"] = "BindingCreated";
  Events6["BindingRemoved"] = "BindingRemoved";
  return Events6;
})(Events3 || {});
var PersistenceBinding = class {
  network;
  fileSystem;
  constructor(network, fileSystem) {
    this.network = network;
    this.fileSystem = fileSystem;
  }
};

// ../../front_end/models/persistence/Automapping.ts
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
    this.#workspace.addEventListener(
      Workspace5.Workspace.Events.UISourceCodeAdded,
      (event) => this.#onUISourceCodeAdded(event.data)
    );
    this.#workspace.addEventListener(
      Workspace5.Workspace.Events.UISourceCodeRemoved,
      (event) => this.#onUISourceCodeRemoved(event.data)
    );
    this.#workspace.addEventListener(Workspace5.Workspace.Events.UISourceCodeRenamed, this.#onUISourceCodeRenamed, this);
    this.#workspace.addEventListener(
      Workspace5.Workspace.Events.ProjectAdded,
      (event) => this.#onProjectAdded(event.data),
      this
    );
    this.#workspace.addEventListener(
      Workspace5.Workspace.Events.ProjectRemoved,
      (event) => this.#onProjectRemoved(event.data),
      this
    );
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

// ../../front_end/models/persistence/AutomaticFileSystemManager.ts
var AutomaticFileSystemManager_exports = {};
__export(AutomaticFileSystemManager_exports, {
  AutomaticFileSystemManager: () => AutomaticFileSystemManager,
  Events: () => Events4
});
import * as Common7 from "../../core/common/common.js";
import * as Host6 from "../../core/host/host.js";
import * as Root3 from "../../core/root/root.js";
import * as ProjectSettings from "../project_settings/project_settings.js";
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
    this.#inspectorFrontendHost.events.addEventListener(
      Host6.InspectorFrontendHostAPI.Events.FileSystemRemoved,
      this.#fileSystemRemoved,
      this
    );
    this.#projectSettingsModel.addEventListener(
      ProjectSettings.ProjectSettingsModel.Events.AVAILABILITY_CHANGED,
      this.#availabilityChanged,
      this
    );
    this.#availabilityChanged({ data: this.#projectSettingsModel.availability });
    this.#projectSettingsModel.addEventListener(
      ProjectSettings.ProjectSettingsModel.Events.PROJECT_SETTINGS_CHANGED,
      this.#projectSettingsChanged,
      this
    );
    this.#projectSettingsChanged({ data: this.#projectSettingsModel.projectSettings });
  }
  /**
   * Yields the `AutomaticFileSystemManager` singleton.
   *
   * @returns the singleton.
   */
  static instance({ forceNew, inspectorFrontendHost, projectSettingsModel } = { forceNew: false, inspectorFrontendHost: null, projectSettingsModel: null }) {
    if (!Root3.DevToolsContext.globalInstance().has(_AutomaticFileSystemManager) || forceNew) {
      if (!inspectorFrontendHost || !projectSettingsModel) {
        throw new Error(
          "Unable to create AutomaticFileSystemManager: inspectorFrontendHost, and projectSettingsModel must be provided"
        );
      }
      Root3.DevToolsContext.globalInstance().set(
        _AutomaticFileSystemManager,
        new _AutomaticFileSystemManager(
          inspectorFrontendHost,
          projectSettingsModel
        )
      );
    }
    return Root3.DevToolsContext.globalInstance().get(_AutomaticFileSystemManager);
  }
  /**
   * Clears the `AutomaticFileSystemManager` singleton (if any);
   */
  static removeInstance() {
    if (Root3.DevToolsContext.globalInstance().has(_AutomaticFileSystemManager)) {
      Root3.DevToolsContext.globalInstance().get(_AutomaticFileSystemManager).dispose();
      Root3.DevToolsContext.globalInstance().delete(_AutomaticFileSystemManager);
    }
  }
  dispose() {
    this.#inspectorFrontendHost.events.removeEventListener(
      Host6.InspectorFrontendHostAPI.Events.FileSystemRemoved,
      this.#fileSystemRemoved,
      this
    );
    this.#projectSettingsModel.removeEventListener(
      ProjectSettings.ProjectSettingsModel.Events.AVAILABILITY_CHANGED,
      this.#availabilityChanged,
      this
    );
    this.#projectSettingsModel.removeEventListener(
      ProjectSettings.ProjectSettingsModel.Events.PROJECT_SETTINGS_CHANGED,
      this.#projectSettingsChanged,
      this
    );
  }
  #availabilityChanged(event) {
    const availability = event.data;
    if (this.#availability !== availability) {
      this.#availability = availability;
      this.dispatchEventToListeners("AvailabilityChanged" /* AVAILABILITY_CHANGED */, this.#availability);
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
      this.dispatchEventToListeners("AutomaticFileSystemChanged" /* AUTOMATIC_FILE_SYSTEM_CHANGED */, this.#automaticFileSystem);
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
      this.dispatchEventToListeners("AutomaticFileSystemChanged" /* AUTOMATIC_FILE_SYSTEM_CHANGED */, this.#automaticFileSystem);
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
      this.dispatchEventToListeners("AutomaticFileSystemChanged" /* AUTOMATIC_FILE_SYSTEM_CHANGED */, this.#automaticFileSystem);
      const { success } = await new Promise(
        (resolve) => this.#inspectorFrontendHost.connectAutomaticFileSystem(root, uuid, addIfMissing, resolve)
      );
      if (this.#automaticFileSystem === automaticFileSystem) {
        const state2 = success ? "connected" : "disconnected";
        this.#automaticFileSystem = Object.freeze({ ...automaticFileSystem, state: state2 });
        this.dispatchEventToListeners("AutomaticFileSystemChanged" /* AUTOMATIC_FILE_SYSTEM_CHANGED */, this.#automaticFileSystem);
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
      this.dispatchEventToListeners("AutomaticFileSystemChanged" /* AUTOMATIC_FILE_SYSTEM_CHANGED */, this.#automaticFileSystem);
    }
  }
};
var Events4 = /* @__PURE__ */ ((Events6) => {
  Events6["AUTOMATIC_FILE_SYSTEM_CHANGED"] = "AutomaticFileSystemChanged";
  Events6["AVAILABILITY_CHANGED"] = "AvailabilityChanged";
  return Events6;
})(Events4 || {});

// ../../front_end/models/persistence/AutomaticFileSystemWorkspaceBinding.ts
var AutomaticFileSystemWorkspaceBinding_exports = {};
__export(AutomaticFileSystemWorkspaceBinding_exports, {
  AutomaticFileSystemWorkspaceBinding: () => AutomaticFileSystemWorkspaceBinding,
  FileSystem: () => FileSystem2
});
import * as Common8 from "../../core/common/common.js";
import * as Host7 from "../../core/host/host.js";
import * as Root4 from "../../core/root/root.js";
import * as Workspace7 from "../workspace/workspace.js";
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
  securityOrigin() {
    return null;
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
  async findFilesMatchingSearchRequest(_searchConfig, _filesMatchingFileQuery, progress) {
    await Promise.resolve();
    progress.done = true;
    return /* @__PURE__ */ new Map();
  }
  indexContent(progress) {
    queueMicrotask(() => {
      progress.done = true;
    });
  }
  uiSourceCodeForURL(_url) {
    return null;
  }
  uiSourceCodes() {
    return [];
  }
};
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
    this.#automaticFileSystemManager.addEventListener(
      "AutomaticFileSystemChanged" /* AUTOMATIC_FILE_SYSTEM_CHANGED */,
      this.#update,
      this
    );
    this.#isolatedFileSystemManager.addEventListener(
      "FileSystemAdded" /* FileSystemAdded */,
      this.#update,
      this
    );
    this.#isolatedFileSystemManager.addEventListener(
      "FileSystemRemoved" /* FileSystemRemoved */,
      this.#update,
      this
    );
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
    if (!Root4.DevToolsContext.globalInstance().has(_AutomaticFileSystemWorkspaceBinding) || forceNew) {
      if (!automaticFileSystemManager || !isolatedFileSystemManager || !workspace) {
        throw new Error(
          "Unable to create AutomaticFileSystemWorkspaceBinding: automaticFileSystemManager, isolatedFileSystemManager, and workspace must be provided"
        );
      }
      const automaticFileSystemWorkspaceBinding = new _AutomaticFileSystemWorkspaceBinding(
        automaticFileSystemManager,
        isolatedFileSystemManager,
        workspace
      );
      Root4.DevToolsContext.globalInstance().set(
        _AutomaticFileSystemWorkspaceBinding,
        automaticFileSystemWorkspaceBinding
      );
    }
    return Root4.DevToolsContext.globalInstance().get(_AutomaticFileSystemWorkspaceBinding);
  }
  /**
   * Clears the `AutomaticFileSystemWorkspaceBinding` singleton (if any);
   */
  static removeInstance() {
    if (Root4.DevToolsContext.globalInstance().has(_AutomaticFileSystemWorkspaceBinding)) {
      const automaticFileSystemWorkspaceBinding = Root4.DevToolsContext.globalInstance().get(_AutomaticFileSystemWorkspaceBinding);
      automaticFileSystemWorkspaceBinding.#dispose();
      Root4.DevToolsContext.globalInstance().delete(_AutomaticFileSystemWorkspaceBinding);
    }
  }
  #dispose() {
    if (this.#fileSystem) {
      this.#workspace.removeProject(this.#fileSystem);
    }
    this.#automaticFileSystemManager.removeEventListener(
      "AutomaticFileSystemChanged" /* AUTOMATIC_FILE_SYSTEM_CHANGED */,
      this.#update,
      this
    );
    this.#isolatedFileSystemManager.removeEventListener(
      "FileSystemAdded" /* FileSystemAdded */,
      this.#update,
      this
    );
    this.#isolatedFileSystemManager.removeEventListener(
      "FileSystemRemoved" /* FileSystemRemoved */,
      this.#update,
      this
    );
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
        this.#fileSystem = new FileSystem2(
          automaticFileSystem,
          this.#automaticFileSystemManager,
          this.#workspace
        );
        this.#workspace.addProject(this.#fileSystem);
      }
    }
  }
};

// ../../front_end/models/persistence/NetworkPersistenceManager.ts
var NetworkPersistenceManager_exports = {};
__export(NetworkPersistenceManager_exports, {
  Events: () => Events5,
  HEADERS_FILENAME: () => HEADERS_FILENAME,
  NetworkPersistenceManager: () => NetworkPersistenceManager,
  escapeRegex: () => escapeRegex,
  extractDirectoryIndex: () => extractDirectoryIndex,
  isHeaderOverride: () => isHeaderOverride,
  persistenceNetworkOverridesEnabledSettingDescriptor: () => persistenceNetworkOverridesEnabledSettingDescriptor
});
import * as Common9 from "../../core/common/common.js";
import * as Host8 from "../../core/host/host.js";
import * as Platform11 from "../../core/platform/platform.js";
import * as Root5 from "../../core/root/root.js";
import * as SDK3 from "../../core/sdk/sdk.js";
import * as TextUtils6 from "../../core/text_utils/text_utils.js";

// ../../front_end/generated/protocol.ts
var Accessibility;
((Accessibility2) => {
  let AXValueType;
  ((AXValueType2) => {
    AXValueType2["Boolean"] = "boolean";
    AXValueType2["Tristate"] = "tristate";
    AXValueType2["BooleanOrUndefined"] = "booleanOrUndefined";
    AXValueType2["Idref"] = "idref";
    AXValueType2["IdrefList"] = "idrefList";
    AXValueType2["Integer"] = "integer";
    AXValueType2["Node"] = "node";
    AXValueType2["NodeList"] = "nodeList";
    AXValueType2["Number"] = "number";
    AXValueType2["String"] = "string";
    AXValueType2["ComputedString"] = "computedString";
    AXValueType2["Token"] = "token";
    AXValueType2["TokenList"] = "tokenList";
    AXValueType2["DomRelation"] = "domRelation";
    AXValueType2["Role"] = "role";
    AXValueType2["InternalRole"] = "internalRole";
    AXValueType2["ValueUndefined"] = "valueUndefined";
  })(AXValueType = Accessibility2.AXValueType || (Accessibility2.AXValueType = {}));
  let AXValueSourceType;
  ((AXValueSourceType2) => {
    AXValueSourceType2["Attribute"] = "attribute";
    AXValueSourceType2["Implicit"] = "implicit";
    AXValueSourceType2["Style"] = "style";
    AXValueSourceType2["Contents"] = "contents";
    AXValueSourceType2["Placeholder"] = "placeholder";
    AXValueSourceType2["RelatedElement"] = "relatedElement";
  })(AXValueSourceType = Accessibility2.AXValueSourceType || (Accessibility2.AXValueSourceType = {}));
  let AXValueNativeSourceType;
  ((AXValueNativeSourceType2) => {
    AXValueNativeSourceType2["Description"] = "description";
    AXValueNativeSourceType2["Figcaption"] = "figcaption";
    AXValueNativeSourceType2["Label"] = "label";
    AXValueNativeSourceType2["Labelfor"] = "labelfor";
    AXValueNativeSourceType2["Labelwrapped"] = "labelwrapped";
    AXValueNativeSourceType2["Legend"] = "legend";
    AXValueNativeSourceType2["Rubyannotation"] = "rubyannotation";
    AXValueNativeSourceType2["Tablecaption"] = "tablecaption";
    AXValueNativeSourceType2["Title"] = "title";
    AXValueNativeSourceType2["Other"] = "other";
  })(AXValueNativeSourceType = Accessibility2.AXValueNativeSourceType || (Accessibility2.AXValueNativeSourceType = {}));
  let AXPropertyName;
  ((AXPropertyName2) => {
    AXPropertyName2["Actions"] = "actions";
    AXPropertyName2["Busy"] = "busy";
    AXPropertyName2["Disabled"] = "disabled";
    AXPropertyName2["Editable"] = "editable";
    AXPropertyName2["Focusable"] = "focusable";
    AXPropertyName2["Focused"] = "focused";
    AXPropertyName2["Hidden"] = "hidden";
    AXPropertyName2["HiddenRoot"] = "hiddenRoot";
    AXPropertyName2["Invalid"] = "invalid";
    AXPropertyName2["Keyshortcuts"] = "keyshortcuts";
    AXPropertyName2["Settable"] = "settable";
    AXPropertyName2["Roledescription"] = "roledescription";
    AXPropertyName2["Live"] = "live";
    AXPropertyName2["Atomic"] = "atomic";
    AXPropertyName2["Relevant"] = "relevant";
    AXPropertyName2["Root"] = "root";
    AXPropertyName2["Autocomplete"] = "autocomplete";
    AXPropertyName2["HasPopup"] = "hasPopup";
    AXPropertyName2["Level"] = "level";
    AXPropertyName2["Multiselectable"] = "multiselectable";
    AXPropertyName2["Orientation"] = "orientation";
    AXPropertyName2["Multiline"] = "multiline";
    AXPropertyName2["Readonly"] = "readonly";
    AXPropertyName2["Required"] = "required";
    AXPropertyName2["Valuemin"] = "valuemin";
    AXPropertyName2["Valuemax"] = "valuemax";
    AXPropertyName2["Valuetext"] = "valuetext";
    AXPropertyName2["Checked"] = "checked";
    AXPropertyName2["Expanded"] = "expanded";
    AXPropertyName2["Modal"] = "modal";
    AXPropertyName2["Pressed"] = "pressed";
    AXPropertyName2["Selected"] = "selected";
    AXPropertyName2["Activedescendant"] = "activedescendant";
    AXPropertyName2["Controls"] = "controls";
    AXPropertyName2["Describedby"] = "describedby";
    AXPropertyName2["Details"] = "details";
    AXPropertyName2["Errormessage"] = "errormessage";
    AXPropertyName2["Flowto"] = "flowto";
    AXPropertyName2["Labelledby"] = "labelledby";
    AXPropertyName2["Owns"] = "owns";
    AXPropertyName2["Url"] = "url";
    AXPropertyName2["ActiveFullscreenElement"] = "activeFullscreenElement";
    AXPropertyName2["ActiveModalDialog"] = "activeModalDialog";
    AXPropertyName2["ActiveAriaModalDialog"] = "activeAriaModalDialog";
    AXPropertyName2["AriaHiddenElement"] = "ariaHiddenElement";
    AXPropertyName2["AriaHiddenSubtree"] = "ariaHiddenSubtree";
    AXPropertyName2["EmptyAlt"] = "emptyAlt";
    AXPropertyName2["EmptyText"] = "emptyText";
    AXPropertyName2["InertElement"] = "inertElement";
    AXPropertyName2["InertSubtree"] = "inertSubtree";
    AXPropertyName2["LabelContainer"] = "labelContainer";
    AXPropertyName2["LabelFor"] = "labelFor";
    AXPropertyName2["NotRendered"] = "notRendered";
    AXPropertyName2["NotVisible"] = "notVisible";
    AXPropertyName2["PresentationalRole"] = "presentationalRole";
    AXPropertyName2["ProbablyPresentational"] = "probablyPresentational";
    AXPropertyName2["InactiveCarouselTabContent"] = "inactiveCarouselTabContent";
    AXPropertyName2["Uninteresting"] = "uninteresting";
  })(AXPropertyName = Accessibility2.AXPropertyName || (Accessibility2.AXPropertyName = {}));
})(Accessibility || (Accessibility = {}));
var Animation;
((Animation2) => {
  let AnimationType;
  ((AnimationType2) => {
    AnimationType2["CSSTransition"] = "CSSTransition";
    AnimationType2["CSSAnimation"] = "CSSAnimation";
    AnimationType2["WebAnimation"] = "WebAnimation";
  })(AnimationType = Animation2.AnimationType || (Animation2.AnimationType = {}));
})(Animation || (Animation = {}));
var Audits;
((Audits2) => {
  let CookieExclusionReason;
  ((CookieExclusionReason2) => {
    CookieExclusionReason2["ExcludeSameSiteUnspecifiedTreatedAsLax"] = "ExcludeSameSiteUnspecifiedTreatedAsLax";
    CookieExclusionReason2["ExcludeSameSiteNoneInsecure"] = "ExcludeSameSiteNoneInsecure";
    CookieExclusionReason2["ExcludeSameSiteLax"] = "ExcludeSameSiteLax";
    CookieExclusionReason2["ExcludeSameSiteStrict"] = "ExcludeSameSiteStrict";
    CookieExclusionReason2["ExcludeDomainNonASCII"] = "ExcludeDomainNonASCII";
    CookieExclusionReason2["ExcludeThirdPartyCookieBlockedInFirstPartySet"] = "ExcludeThirdPartyCookieBlockedInFirstPartySet";
    CookieExclusionReason2["ExcludeThirdPartyPhaseout"] = "ExcludeThirdPartyPhaseout";
    CookieExclusionReason2["ExcludePortMismatch"] = "ExcludePortMismatch";
    CookieExclusionReason2["ExcludeSchemeMismatch"] = "ExcludeSchemeMismatch";
  })(CookieExclusionReason = Audits2.CookieExclusionReason || (Audits2.CookieExclusionReason = {}));
  let CookieWarningReason;
  ((CookieWarningReason2) => {
    CookieWarningReason2["WarnSameSiteUnspecifiedCrossSiteContext"] = "WarnSameSiteUnspecifiedCrossSiteContext";
    CookieWarningReason2["WarnSameSiteNoneInsecure"] = "WarnSameSiteNoneInsecure";
    CookieWarningReason2["WarnSameSiteUnspecifiedLaxAllowUnsafe"] = "WarnSameSiteUnspecifiedLaxAllowUnsafe";
    CookieWarningReason2["WarnSameSiteStrictLaxDowngradeStrict"] = "WarnSameSiteStrictLaxDowngradeStrict";
    CookieWarningReason2["WarnSameSiteStrictCrossDowngradeStrict"] = "WarnSameSiteStrictCrossDowngradeStrict";
    CookieWarningReason2["WarnSameSiteStrictCrossDowngradeLax"] = "WarnSameSiteStrictCrossDowngradeLax";
    CookieWarningReason2["WarnSameSiteLaxCrossDowngradeStrict"] = "WarnSameSiteLaxCrossDowngradeStrict";
    CookieWarningReason2["WarnSameSiteLaxCrossDowngradeLax"] = "WarnSameSiteLaxCrossDowngradeLax";
    CookieWarningReason2["WarnAttributeValueExceedsMaxSize"] = "WarnAttributeValueExceedsMaxSize";
    CookieWarningReason2["WarnDomainNonASCII"] = "WarnDomainNonASCII";
    CookieWarningReason2["WarnThirdPartyPhaseout"] = "WarnThirdPartyPhaseout";
    CookieWarningReason2["WarnCrossSiteRedirectDowngradeChangesInclusion"] = "WarnCrossSiteRedirectDowngradeChangesInclusion";
    CookieWarningReason2["WarnDeprecationTrialMetadata"] = "WarnDeprecationTrialMetadata";
    CookieWarningReason2["WarnThirdPartyCookieHeuristic"] = "WarnThirdPartyCookieHeuristic";
  })(CookieWarningReason = Audits2.CookieWarningReason || (Audits2.CookieWarningReason = {}));
  let CookieOperation;
  ((CookieOperation2) => {
    CookieOperation2["SetCookie"] = "SetCookie";
    CookieOperation2["ReadCookie"] = "ReadCookie";
  })(CookieOperation = Audits2.CookieOperation || (Audits2.CookieOperation = {}));
  let InsightType;
  ((InsightType2) => {
    InsightType2["GitHubResource"] = "GitHubResource";
    InsightType2["GracePeriod"] = "GracePeriod";
    InsightType2["Heuristics"] = "Heuristics";
  })(InsightType = Audits2.InsightType || (Audits2.InsightType = {}));
  let PerformanceIssueType;
  ((PerformanceIssueType2) => {
    PerformanceIssueType2["DocumentCookie"] = "DocumentCookie";
  })(PerformanceIssueType = Audits2.PerformanceIssueType || (Audits2.PerformanceIssueType = {}));
  let MixedContentResolutionStatus;
  ((MixedContentResolutionStatus2) => {
    MixedContentResolutionStatus2["MixedContentBlocked"] = "MixedContentBlocked";
    MixedContentResolutionStatus2["MixedContentAutomaticallyUpgraded"] = "MixedContentAutomaticallyUpgraded";
    MixedContentResolutionStatus2["MixedContentWarning"] = "MixedContentWarning";
  })(MixedContentResolutionStatus = Audits2.MixedContentResolutionStatus || (Audits2.MixedContentResolutionStatus = {}));
  let MixedContentResourceType;
  ((MixedContentResourceType2) => {
    MixedContentResourceType2["Audio"] = "Audio";
    MixedContentResourceType2["Beacon"] = "Beacon";
    MixedContentResourceType2["CSPReport"] = "CSPReport";
    MixedContentResourceType2["Download"] = "Download";
    MixedContentResourceType2["EventSource"] = "EventSource";
    MixedContentResourceType2["Favicon"] = "Favicon";
    MixedContentResourceType2["Font"] = "Font";
    MixedContentResourceType2["Form"] = "Form";
    MixedContentResourceType2["Frame"] = "Frame";
    MixedContentResourceType2["Image"] = "Image";
    MixedContentResourceType2["Import"] = "Import";
    MixedContentResourceType2["JSON"] = "JSON";
    MixedContentResourceType2["Manifest"] = "Manifest";
    MixedContentResourceType2["Ping"] = "Ping";
    MixedContentResourceType2["PluginData"] = "PluginData";
    MixedContentResourceType2["PluginResource"] = "PluginResource";
    MixedContentResourceType2["Prefetch"] = "Prefetch";
    MixedContentResourceType2["Resource"] = "Resource";
    MixedContentResourceType2["Script"] = "Script";
    MixedContentResourceType2["ServiceWorker"] = "ServiceWorker";
    MixedContentResourceType2["SharedWorker"] = "SharedWorker";
    MixedContentResourceType2["SpeculationRules"] = "SpeculationRules";
    MixedContentResourceType2["Stylesheet"] = "Stylesheet";
    MixedContentResourceType2["Track"] = "Track";
    MixedContentResourceType2["Video"] = "Video";
    MixedContentResourceType2["Worker"] = "Worker";
    MixedContentResourceType2["XMLHttpRequest"] = "XMLHttpRequest";
    MixedContentResourceType2["XSLT"] = "XSLT";
  })(MixedContentResourceType = Audits2.MixedContentResourceType || (Audits2.MixedContentResourceType = {}));
  let BlockedByResponseReason;
  ((BlockedByResponseReason2) => {
    BlockedByResponseReason2["CoepFrameResourceNeedsCoepHeader"] = "CoepFrameResourceNeedsCoepHeader";
    BlockedByResponseReason2["CoopSandboxedIFrameCannotNavigateToCoopPage"] = "CoopSandboxedIFrameCannotNavigateToCoopPage";
    BlockedByResponseReason2["CorpNotSameOrigin"] = "CorpNotSameOrigin";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = "CorpNotSameOriginAfterDefaultedToSameOriginByCoep";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByDip"] = "CorpNotSameOriginAfterDefaultedToSameOriginByDip";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip"] = "CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip";
    BlockedByResponseReason2["CorpNotSameSite"] = "CorpNotSameSite";
    BlockedByResponseReason2["SRIMessageSignatureMismatch"] = "SRIMessageSignatureMismatch";
  })(BlockedByResponseReason = Audits2.BlockedByResponseReason || (Audits2.BlockedByResponseReason = {}));
  let HeavyAdResolutionStatus;
  ((HeavyAdResolutionStatus2) => {
    HeavyAdResolutionStatus2["HeavyAdBlocked"] = "HeavyAdBlocked";
    HeavyAdResolutionStatus2["HeavyAdWarning"] = "HeavyAdWarning";
  })(HeavyAdResolutionStatus = Audits2.HeavyAdResolutionStatus || (Audits2.HeavyAdResolutionStatus = {}));
  let HeavyAdReason;
  ((HeavyAdReason2) => {
    HeavyAdReason2["NetworkTotalLimit"] = "NetworkTotalLimit";
    HeavyAdReason2["CpuTotalLimit"] = "CpuTotalLimit";
    HeavyAdReason2["CpuPeakLimit"] = "CpuPeakLimit";
  })(HeavyAdReason = Audits2.HeavyAdReason || (Audits2.HeavyAdReason = {}));
  let ContentSecurityPolicyViolationType;
  ((ContentSecurityPolicyViolationType2) => {
    ContentSecurityPolicyViolationType2["KInlineViolation"] = "kInlineViolation";
    ContentSecurityPolicyViolationType2["KEvalViolation"] = "kEvalViolation";
    ContentSecurityPolicyViolationType2["KURLViolation"] = "kURLViolation";
    ContentSecurityPolicyViolationType2["KSRIViolation"] = "kSRIViolation";
    ContentSecurityPolicyViolationType2["KTrustedTypesSinkViolation"] = "kTrustedTypesSinkViolation";
    ContentSecurityPolicyViolationType2["KTrustedTypesPolicyViolation"] = "kTrustedTypesPolicyViolation";
    ContentSecurityPolicyViolationType2["KWasmEvalViolation"] = "kWasmEvalViolation";
  })(ContentSecurityPolicyViolationType = Audits2.ContentSecurityPolicyViolationType || (Audits2.ContentSecurityPolicyViolationType = {}));
  let SharedArrayBufferIssueType;
  ((SharedArrayBufferIssueType2) => {
    SharedArrayBufferIssueType2["TransferIssue"] = "TransferIssue";
    SharedArrayBufferIssueType2["CreationIssue"] = "CreationIssue";
  })(SharedArrayBufferIssueType = Audits2.SharedArrayBufferIssueType || (Audits2.SharedArrayBufferIssueType = {}));
  let SharedDictionaryError;
  ((SharedDictionaryError2) => {
    SharedDictionaryError2["UseErrorCrossOriginNoCorsRequest"] = "UseErrorCrossOriginNoCorsRequest";
    SharedDictionaryError2["UseErrorDictionaryLoadFailure"] = "UseErrorDictionaryLoadFailure";
    SharedDictionaryError2["UseErrorMatchingDictionaryNotUsed"] = "UseErrorMatchingDictionaryNotUsed";
    SharedDictionaryError2["UseErrorUnexpectedContentDictionaryHeader"] = "UseErrorUnexpectedContentDictionaryHeader";
    SharedDictionaryError2["WriteErrorCossOriginNoCorsRequest"] = "WriteErrorCossOriginNoCorsRequest";
    SharedDictionaryError2["WriteErrorDisallowedBySettings"] = "WriteErrorDisallowedBySettings";
    SharedDictionaryError2["WriteErrorExpiredResponse"] = "WriteErrorExpiredResponse";
    SharedDictionaryError2["WriteErrorFeatureDisabled"] = "WriteErrorFeatureDisabled";
    SharedDictionaryError2["WriteErrorInsufficientResources"] = "WriteErrorInsufficientResources";
    SharedDictionaryError2["WriteErrorInvalidMatchField"] = "WriteErrorInvalidMatchField";
    SharedDictionaryError2["WriteErrorInvalidStructuredHeader"] = "WriteErrorInvalidStructuredHeader";
    SharedDictionaryError2["WriteErrorInvalidTTLField"] = "WriteErrorInvalidTTLField";
    SharedDictionaryError2["WriteErrorNavigationRequest"] = "WriteErrorNavigationRequest";
    SharedDictionaryError2["WriteErrorNoMatchField"] = "WriteErrorNoMatchField";
    SharedDictionaryError2["WriteErrorNonIntegerTTLField"] = "WriteErrorNonIntegerTTLField";
    SharedDictionaryError2["WriteErrorNonListMatchDestField"] = "WriteErrorNonListMatchDestField";
    SharedDictionaryError2["WriteErrorNonSecureContext"] = "WriteErrorNonSecureContext";
    SharedDictionaryError2["WriteErrorNonStringIdField"] = "WriteErrorNonStringIdField";
    SharedDictionaryError2["WriteErrorNonStringInMatchDestList"] = "WriteErrorNonStringInMatchDestList";
    SharedDictionaryError2["WriteErrorInvalidMatchDestList"] = "WriteErrorInvalidMatchDestList";
    SharedDictionaryError2["WriteErrorNonStringMatchField"] = "WriteErrorNonStringMatchField";
    SharedDictionaryError2["WriteErrorNonTokenTypeField"] = "WriteErrorNonTokenTypeField";
    SharedDictionaryError2["WriteErrorRequestAborted"] = "WriteErrorRequestAborted";
    SharedDictionaryError2["WriteErrorShuttingDown"] = "WriteErrorShuttingDown";
    SharedDictionaryError2["WriteErrorTooLongIdField"] = "WriteErrorTooLongIdField";
    SharedDictionaryError2["WriteErrorUnsupportedType"] = "WriteErrorUnsupportedType";
  })(SharedDictionaryError = Audits2.SharedDictionaryError || (Audits2.SharedDictionaryError = {}));
  let SRIMessageSignatureError;
  ((SRIMessageSignatureError2) => {
    SRIMessageSignatureError2["MissingSignatureHeader"] = "MissingSignatureHeader";
    SRIMessageSignatureError2["MissingSignatureInputHeader"] = "MissingSignatureInputHeader";
    SRIMessageSignatureError2["InvalidSignatureHeader"] = "InvalidSignatureHeader";
    SRIMessageSignatureError2["InvalidSignatureInputHeader"] = "InvalidSignatureInputHeader";
    SRIMessageSignatureError2["SignatureHeaderValueIsNotByteSequence"] = "SignatureHeaderValueIsNotByteSequence";
    SRIMessageSignatureError2["SignatureHeaderValueIsParameterized"] = "SignatureHeaderValueIsParameterized";
    SRIMessageSignatureError2["SignatureHeaderValueIsIncorrectLength"] = "SignatureHeaderValueIsIncorrectLength";
    SRIMessageSignatureError2["SignatureInputHeaderMissingLabel"] = "SignatureInputHeaderMissingLabel";
    SRIMessageSignatureError2["SignatureInputHeaderValueNotInnerList"] = "SignatureInputHeaderValueNotInnerList";
    SRIMessageSignatureError2["SignatureInputHeaderValueMissingComponents"] = "SignatureInputHeaderValueMissingComponents";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidComponentType"] = "SignatureInputHeaderInvalidComponentType";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidComponentName"] = "SignatureInputHeaderInvalidComponentName";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidHeaderComponentParameter"] = "SignatureInputHeaderInvalidHeaderComponentParameter";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidDerivedComponentParameter"] = "SignatureInputHeaderInvalidDerivedComponentParameter";
    SRIMessageSignatureError2["SignatureInputHeaderKeyIdLength"] = "SignatureInputHeaderKeyIdLength";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidParameter"] = "SignatureInputHeaderInvalidParameter";
    SRIMessageSignatureError2["SignatureInputHeaderMissingRequiredParameters"] = "SignatureInputHeaderMissingRequiredParameters";
    SRIMessageSignatureError2["ValidationFailedSignatureExpired"] = "ValidationFailedSignatureExpired";
    SRIMessageSignatureError2["ValidationFailedInvalidLength"] = "ValidationFailedInvalidLength";
    SRIMessageSignatureError2["ValidationFailedSignatureMismatch"] = "ValidationFailedSignatureMismatch";
    SRIMessageSignatureError2["ValidationFailedIntegrityMismatch"] = "ValidationFailedIntegrityMismatch";
    SRIMessageSignatureError2["SignatureBaseUnknownDerivedComponent"] = "SignatureBaseUnknownDerivedComponent";
    SRIMessageSignatureError2["SignatureBaseMissingHeader"] = "SignatureBaseMissingHeader";
    SRIMessageSignatureError2["SignatureBaseInvalidUnencodedDigest"] = "SignatureBaseInvalidUnencodedDigest";
    SRIMessageSignatureError2["SignatureBaseUnsupportedComponent"] = "SignatureBaseUnsupportedComponent";
  })(SRIMessageSignatureError = Audits2.SRIMessageSignatureError || (Audits2.SRIMessageSignatureError = {}));
  let UnencodedDigestError;
  ((UnencodedDigestError2) => {
    UnencodedDigestError2["MalformedDictionary"] = "MalformedDictionary";
    UnencodedDigestError2["UnknownAlgorithm"] = "UnknownAlgorithm";
    UnencodedDigestError2["IncorrectDigestType"] = "IncorrectDigestType";
    UnencodedDigestError2["IncorrectDigestLength"] = "IncorrectDigestLength";
  })(UnencodedDigestError = Audits2.UnencodedDigestError || (Audits2.UnencodedDigestError = {}));
  let ConnectionAllowlistError;
  ((ConnectionAllowlistError2) => {
    ConnectionAllowlistError2["InvalidHeader"] = "InvalidHeader";
    ConnectionAllowlistError2["MoreThanOneList"] = "MoreThanOneList";
    ConnectionAllowlistError2["ItemNotInnerList"] = "ItemNotInnerList";
    ConnectionAllowlistError2["InvalidAllowlistItemType"] = "InvalidAllowlistItemType";
    ConnectionAllowlistError2["ReportingEndpointNotToken"] = "ReportingEndpointNotToken";
    ConnectionAllowlistError2["InvalidUrlPattern"] = "InvalidUrlPattern";
    ConnectionAllowlistError2["IFrameAttributeLoosensEmbeddingRequirement"] = "IFrameAttributeLoosensEmbeddingRequirement";
    ConnectionAllowlistError2["InvalidAllowConnectionAllowlistFrom"] = "InvalidAllowConnectionAllowlistFrom";
    ConnectionAllowlistError2["EmbeddingRequirementNotSatisfied"] = "EmbeddingRequirementNotSatisfied";
  })(ConnectionAllowlistError = Audits2.ConnectionAllowlistError || (Audits2.ConnectionAllowlistError = {}));
  let GenericIssueErrorType;
  ((GenericIssueErrorType2) => {
    GenericIssueErrorType2["FormLabelForNameError"] = "FormLabelForNameError";
    GenericIssueErrorType2["FormDuplicateIdForInputError"] = "FormDuplicateIdForInputError";
    GenericIssueErrorType2["FormInputWithNoLabelError"] = "FormInputWithNoLabelError";
    GenericIssueErrorType2["FormAutocompleteAttributeEmptyError"] = "FormAutocompleteAttributeEmptyError";
    GenericIssueErrorType2["FormEmptyIdAndNameAttributesForInputError"] = "FormEmptyIdAndNameAttributesForInputError";
    GenericIssueErrorType2["FormAriaLabelledByToNonExistingIdError"] = "FormAriaLabelledByToNonExistingIdError";
    GenericIssueErrorType2["FormInputAssignedAutocompleteValueToIdOrNameAttributeError"] = "FormInputAssignedAutocompleteValueToIdOrNameAttributeError";
    GenericIssueErrorType2["FormLabelHasNeitherForNorNestedInputError"] = "FormLabelHasNeitherForNorNestedInputError";
    GenericIssueErrorType2["FormLabelForMatchesNonExistingIdError"] = "FormLabelForMatchesNonExistingIdError";
    GenericIssueErrorType2["FormInputHasWrongButWellIntendedAutocompleteValueError"] = "FormInputHasWrongButWellIntendedAutocompleteValueError";
    GenericIssueErrorType2["ResponseWasBlockedByORB"] = "ResponseWasBlockedByORB";
    GenericIssueErrorType2["NavigationEntryMarkedSkippable"] = "NavigationEntryMarkedSkippable";
    GenericIssueErrorType2["BackUINavigationWouldSkipAd"] = "BackUINavigationWouldSkipAd";
    GenericIssueErrorType2["AutofillAndManualTextPolicyControlledFeaturesInfo"] = "AutofillAndManualTextPolicyControlledFeaturesInfo";
    GenericIssueErrorType2["AutofillPolicyControlledFeatureInfo"] = "AutofillPolicyControlledFeatureInfo";
    GenericIssueErrorType2["ManualTextPolicyControlledFeatureInfo"] = "ManualTextPolicyControlledFeatureInfo";
    GenericIssueErrorType2["FormModelContextParameterMissingTitleAndDescription"] = "FormModelContextParameterMissingTitleAndDescription";
    GenericIssueErrorType2["FormModelContextMissingToolName"] = "FormModelContextMissingToolName";
    GenericIssueErrorType2["FormModelContextMissingToolDescription"] = "FormModelContextMissingToolDescription";
    GenericIssueErrorType2["FormModelContextRequiredParameterMissingName"] = "FormModelContextRequiredParameterMissingName";
    GenericIssueErrorType2["FormModelContextParameterMissingName"] = "FormModelContextParameterMissingName";
  })(GenericIssueErrorType = Audits2.GenericIssueErrorType || (Audits2.GenericIssueErrorType = {}));
  let ClientHintIssueReason;
  ((ClientHintIssueReason2) => {
    ClientHintIssueReason2["MetaTagAllowListInvalidOrigin"] = "MetaTagAllowListInvalidOrigin";
    ClientHintIssueReason2["MetaTagModifiedHTML"] = "MetaTagModifiedHTML";
  })(ClientHintIssueReason = Audits2.ClientHintIssueReason || (Audits2.ClientHintIssueReason = {}));
  let FederatedAuthRequestIssueReason;
  ((FederatedAuthRequestIssueReason2) => {
    FederatedAuthRequestIssueReason2["ShouldEmbargo"] = "ShouldEmbargo";
    FederatedAuthRequestIssueReason2["TooManyRequests"] = "TooManyRequests";
    FederatedAuthRequestIssueReason2["WellKnownHttpNotFound"] = "WellKnownHttpNotFound";
    FederatedAuthRequestIssueReason2["WellKnownNoResponse"] = "WellKnownNoResponse";
    FederatedAuthRequestIssueReason2["WellKnownBlockedByConnectionAllowlist"] = "WellKnownBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["WellKnownInvalidResponse"] = "WellKnownInvalidResponse";
    FederatedAuthRequestIssueReason2["WellKnownListEmpty"] = "WellKnownListEmpty";
    FederatedAuthRequestIssueReason2["WellKnownInvalidContentType"] = "WellKnownInvalidContentType";
    FederatedAuthRequestIssueReason2["ConfigNotInWellKnown"] = "ConfigNotInWellKnown";
    FederatedAuthRequestIssueReason2["WellKnownTooBig"] = "WellKnownTooBig";
    FederatedAuthRequestIssueReason2["ConfigHttpNotFound"] = "ConfigHttpNotFound";
    FederatedAuthRequestIssueReason2["ConfigNoResponse"] = "ConfigNoResponse";
    FederatedAuthRequestIssueReason2["ConfigBlockedByConnectionAllowlist"] = "ConfigBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["ConfigInvalidResponse"] = "ConfigInvalidResponse";
    FederatedAuthRequestIssueReason2["ConfigInvalidContentType"] = "ConfigInvalidContentType";
    FederatedAuthRequestIssueReason2["IdpNotPotentiallyTrustworthy"] = "IdpNotPotentiallyTrustworthy";
    FederatedAuthRequestIssueReason2["DisabledInSettings"] = "DisabledInSettings";
    FederatedAuthRequestIssueReason2["DisabledInFlags"] = "DisabledInFlags";
    FederatedAuthRequestIssueReason2["ErrorFetchingSignin"] = "ErrorFetchingSignin";
    FederatedAuthRequestIssueReason2["InvalidSigninResponse"] = "InvalidSigninResponse";
    FederatedAuthRequestIssueReason2["AccountsHttpNotFound"] = "AccountsHttpNotFound";
    FederatedAuthRequestIssueReason2["AccountsNoResponse"] = "AccountsNoResponse";
    FederatedAuthRequestIssueReason2["AccountsBlockedByConnectionAllowlist"] = "AccountsBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["AccountsInvalidResponse"] = "AccountsInvalidResponse";
    FederatedAuthRequestIssueReason2["AccountsListEmpty"] = "AccountsListEmpty";
    FederatedAuthRequestIssueReason2["AccountsInvalidContentType"] = "AccountsInvalidContentType";
    FederatedAuthRequestIssueReason2["IdTokenHttpNotFound"] = "IdTokenHttpNotFound";
    FederatedAuthRequestIssueReason2["IdTokenNoResponse"] = "IdTokenNoResponse";
    FederatedAuthRequestIssueReason2["IdTokenBlockedByConnectionAllowlist"] = "IdTokenBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["IdTokenInvalidResponse"] = "IdTokenInvalidResponse";
    FederatedAuthRequestIssueReason2["IdTokenIdpErrorResponse"] = "IdTokenIdpErrorResponse";
    FederatedAuthRequestIssueReason2["IdTokenCrossSiteIdpErrorResponse"] = "IdTokenCrossSiteIdpErrorResponse";
    FederatedAuthRequestIssueReason2["IdTokenInvalidRequest"] = "IdTokenInvalidRequest";
    FederatedAuthRequestIssueReason2["IdTokenInvalidContentType"] = "IdTokenInvalidContentType";
    FederatedAuthRequestIssueReason2["ErrorIdToken"] = "ErrorIdToken";
    FederatedAuthRequestIssueReason2["Canceled"] = "Canceled";
    FederatedAuthRequestIssueReason2["RpPageNotVisible"] = "RpPageNotVisible";
    FederatedAuthRequestIssueReason2["SilentMediationFailure"] = "SilentMediationFailure";
    FederatedAuthRequestIssueReason2["NotSignedInWithIdp"] = "NotSignedInWithIdp";
    FederatedAuthRequestIssueReason2["MissingTransientUserActivation"] = "MissingTransientUserActivation";
    FederatedAuthRequestIssueReason2["ReplacedByActiveMode"] = "ReplacedByActiveMode";
    FederatedAuthRequestIssueReason2["RelyingPartyOriginIsOpaque"] = "RelyingPartyOriginIsOpaque";
    FederatedAuthRequestIssueReason2["TypeNotMatching"] = "TypeNotMatching";
    FederatedAuthRequestIssueReason2["UiDismissedNoEmbargo"] = "UiDismissedNoEmbargo";
    FederatedAuthRequestIssueReason2["CorsError"] = "CorsError";
    FederatedAuthRequestIssueReason2["SuppressedBySegmentationPlatform"] = "SuppressedBySegmentationPlatform";
  })(FederatedAuthRequestIssueReason = Audits2.FederatedAuthRequestIssueReason || (Audits2.FederatedAuthRequestIssueReason = {}));
  let FederatedAuthUserInfoRequestIssueReason;
  ((FederatedAuthUserInfoRequestIssueReason2) => {
    FederatedAuthUserInfoRequestIssueReason2["NotSameOrigin"] = "NotSameOrigin";
    FederatedAuthUserInfoRequestIssueReason2["NotIframe"] = "NotIframe";
    FederatedAuthUserInfoRequestIssueReason2["NotPotentiallyTrustworthy"] = "NotPotentiallyTrustworthy";
    FederatedAuthUserInfoRequestIssueReason2["NoAPIPermission"] = "NoApiPermission";
    FederatedAuthUserInfoRequestIssueReason2["NotSignedInWithIdp"] = "NotSignedInWithIdp";
    FederatedAuthUserInfoRequestIssueReason2["NoAccountSharingPermission"] = "NoAccountSharingPermission";
    FederatedAuthUserInfoRequestIssueReason2["InvalidConfigOrWellKnown"] = "InvalidConfigOrWellKnown";
    FederatedAuthUserInfoRequestIssueReason2["InvalidAccountsResponse"] = "InvalidAccountsResponse";
    FederatedAuthUserInfoRequestIssueReason2["NoReturningUserFromFetchedAccounts"] = "NoReturningUserFromFetchedAccounts";
  })(FederatedAuthUserInfoRequestIssueReason = Audits2.FederatedAuthUserInfoRequestIssueReason || (Audits2.FederatedAuthUserInfoRequestIssueReason = {}));
  let EmailVerificationRequestIssueReason;
  ((EmailVerificationRequestIssueReason2) => {
    EmailVerificationRequestIssueReason2["InvalidEmail"] = "InvalidEmail";
    EmailVerificationRequestIssueReason2["DnsFetchFailed"] = "DnsFetchFailed";
    EmailVerificationRequestIssueReason2["DnsInvalidRecord"] = "DnsInvalidRecord";
    EmailVerificationRequestIssueReason2["WellKnownHttpNotFound"] = "WellKnownHttpNotFound";
    EmailVerificationRequestIssueReason2["WellKnownNoResponse"] = "WellKnownNoResponse";
    EmailVerificationRequestIssueReason2["WellKnownInvalidResponse"] = "WellKnownInvalidResponse";
    EmailVerificationRequestIssueReason2["WellKnownListEmpty"] = "WellKnownListEmpty";
    EmailVerificationRequestIssueReason2["WellKnownInvalidContentType"] = "WellKnownInvalidContentType";
    EmailVerificationRequestIssueReason2["WellKnownMissingIssuanceEndpoint"] = "WellKnownMissingIssuanceEndpoint";
    EmailVerificationRequestIssueReason2["WellKnownIssuanceEndpointCrossOrigin"] = "WellKnownIssuanceEndpointCrossOrigin";
    EmailVerificationRequestIssueReason2["WellKnownUnsupportedSigningAlgorithm"] = "WellKnownUnsupportedSigningAlgorithm";
    EmailVerificationRequestIssueReason2["TokenHttpNotFound"] = "TokenHttpNotFound";
    EmailVerificationRequestIssueReason2["TokenNoResponse"] = "TokenNoResponse";
    EmailVerificationRequestIssueReason2["TokenInvalidResponse"] = "TokenInvalidResponse";
    EmailVerificationRequestIssueReason2["TokenInvalidContentType"] = "TokenInvalidContentType";
    EmailVerificationRequestIssueReason2["TokenMalformedSdJwt"] = "TokenMalformedSdJwt";
    EmailVerificationRequestIssueReason2["TokenInvalidSdJwt"] = "TokenInvalidSdJwt";
    EmailVerificationRequestIssueReason2["KeyBindingSigningFailed"] = "KeyBindingSigningFailed";
    EmailVerificationRequestIssueReason2["RpOriginIsOpaque"] = "RpOriginIsOpaque";
    EmailVerificationRequestIssueReason2["WellKnownMissingAccountsEndpoint"] = "WellKnownMissingAccountsEndpoint";
    EmailVerificationRequestIssueReason2["UserLoggedOut"] = "UserLoggedOut";
    EmailVerificationRequestIssueReason2["WellKnownAccountsEndpointCrossOrigin"] = "WellKnownAccountsEndpointCrossOrigin";
    EmailVerificationRequestIssueReason2["AccountsHttpNotFound"] = "AccountsHttpNotFound";
    EmailVerificationRequestIssueReason2["AccountsNoResponse"] = "AccountsNoResponse";
    EmailVerificationRequestIssueReason2["AccountsInvalidResponse"] = "AccountsInvalidResponse";
    EmailVerificationRequestIssueReason2["AccountsInvalidContentType"] = "AccountsInvalidContentType";
    EmailVerificationRequestIssueReason2["AccountsEmptyList"] = "AccountsEmptyList";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownHttpNotFound"] = "EmailVerificationWellKnownHttpNotFound";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownNoResponse"] = "EmailVerificationWellKnownNoResponse";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownInvalidResponse"] = "EmailVerificationWellKnownInvalidResponse";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownInvalidContentType"] = "EmailVerificationWellKnownInvalidContentType";
    EmailVerificationRequestIssueReason2["JwksHttpNotFound"] = "JwksHttpNotFound";
    EmailVerificationRequestIssueReason2["JwksInvalidResponse"] = "JwksInvalidResponse";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtUnsupportedHeaderAlg"] = "TokenVerificationSdJwtUnsupportedHeaderAlg";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidTyp"] = "TokenVerificationSdJwtInvalidTyp";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingIss"] = "TokenVerificationSdJwtMissingIss";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingIat"] = "TokenVerificationSdJwtMissingIat";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingCnf"] = "TokenVerificationSdJwtMissingCnf";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingEmail"] = "TokenVerificationSdJwtMissingEmail";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidIssuedAt"] = "TokenVerificationSdJwtInvalidIssuedAt";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidIssuer"] = "TokenVerificationSdJwtInvalidIssuer";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtJwksMissingKeys"] = "TokenVerificationSdJwtJwksMissingKeys";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtSignatureFailed"] = "TokenVerificationSdJwtSignatureFailed";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidEmailVerified"] = "TokenVerificationSdJwtInvalidEmailVerified";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidEmail"] = "TokenVerificationSdJwtInvalidEmail";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidHolderKey"] = "TokenVerificationSdJwtInvalidHolderKey";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidTyp"] = "TokenVerificationKbInvalidTyp";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingAud"] = "TokenVerificationKbMissingAud";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingNonce"] = "TokenVerificationKbMissingNonce";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingIat"] = "TokenVerificationKbMissingIat";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingSdHash"] = "TokenVerificationKbMissingSdHash";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidIssuedAt"] = "TokenVerificationKbInvalidIssuedAt";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidAudience"] = "TokenVerificationKbInvalidAudience";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidNonce"] = "TokenVerificationKbInvalidNonce";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidSdHash"] = "TokenVerificationKbInvalidSdHash";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingCnf"] = "TokenVerificationKbMissingCnf";
    EmailVerificationRequestIssueReason2["TokenVerificationKbSignatureFailed"] = "TokenVerificationKbSignatureFailed";
  })(EmailVerificationRequestIssueReason = Audits2.EmailVerificationRequestIssueReason || (Audits2.EmailVerificationRequestIssueReason = {}));
  let PartitioningBlobURLInfo;
  ((PartitioningBlobURLInfo2) => {
    PartitioningBlobURLInfo2["BlockedCrossPartitionFetching"] = "BlockedCrossPartitionFetching";
    PartitioningBlobURLInfo2["EnforceNoopenerForNavigation"] = "EnforceNoopenerForNavigation";
  })(PartitioningBlobURLInfo = Audits2.PartitioningBlobURLInfo || (Audits2.PartitioningBlobURLInfo = {}));
  let ElementAccessibilityIssueReason;
  ((ElementAccessibilityIssueReason2) => {
    ElementAccessibilityIssueReason2["DisallowedSelectChild"] = "DisallowedSelectChild";
    ElementAccessibilityIssueReason2["DisallowedOptGroupChild"] = "DisallowedOptGroupChild";
    ElementAccessibilityIssueReason2["NonPhrasingContentOptionChild"] = "NonPhrasingContentOptionChild";
    ElementAccessibilityIssueReason2["InteractiveContentOptionChild"] = "InteractiveContentOptionChild";
    ElementAccessibilityIssueReason2["InteractiveContentLegendChild"] = "InteractiveContentLegendChild";
    ElementAccessibilityIssueReason2["InteractiveContentSummaryDescendant"] = "InteractiveContentSummaryDescendant";
  })(ElementAccessibilityIssueReason = Audits2.ElementAccessibilityIssueReason || (Audits2.ElementAccessibilityIssueReason = {}));
  let StyleSheetLoadingIssueReason;
  ((StyleSheetLoadingIssueReason2) => {
    StyleSheetLoadingIssueReason2["LateImportRule"] = "LateImportRule";
    StyleSheetLoadingIssueReason2["RequestFailed"] = "RequestFailed";
  })(StyleSheetLoadingIssueReason = Audits2.StyleSheetLoadingIssueReason || (Audits2.StyleSheetLoadingIssueReason = {}));
  let PropertyRuleIssueReason;
  ((PropertyRuleIssueReason2) => {
    PropertyRuleIssueReason2["InvalidSyntax"] = "InvalidSyntax";
    PropertyRuleIssueReason2["InvalidInitialValue"] = "InvalidInitialValue";
    PropertyRuleIssueReason2["InvalidInherits"] = "InvalidInherits";
    PropertyRuleIssueReason2["InvalidName"] = "InvalidName";
  })(PropertyRuleIssueReason = Audits2.PropertyRuleIssueReason || (Audits2.PropertyRuleIssueReason = {}));
  let UserReidentificationIssueType;
  ((UserReidentificationIssueType2) => {
    UserReidentificationIssueType2["BlockedFrameNavigation"] = "BlockedFrameNavigation";
    UserReidentificationIssueType2["BlockedSubresource"] = "BlockedSubresource";
    UserReidentificationIssueType2["NoisedCanvasReadback"] = "NoisedCanvasReadback";
  })(UserReidentificationIssueType = Audits2.UserReidentificationIssueType || (Audits2.UserReidentificationIssueType = {}));
  let PermissionElementIssueType;
  ((PermissionElementIssueType2) => {
    PermissionElementIssueType2["InvalidType"] = "InvalidType";
    PermissionElementIssueType2["FencedFrameDisallowed"] = "FencedFrameDisallowed";
    PermissionElementIssueType2["CspFrameAncestorsMissing"] = "CspFrameAncestorsMissing";
    PermissionElementIssueType2["PermissionsPolicyBlocked"] = "PermissionsPolicyBlocked";
    PermissionElementIssueType2["PaddingRightUnsupported"] = "PaddingRightUnsupported";
    PermissionElementIssueType2["PaddingBottomUnsupported"] = "PaddingBottomUnsupported";
    PermissionElementIssueType2["InsetBoxShadowUnsupported"] = "InsetBoxShadowUnsupported";
    PermissionElementIssueType2["RequestInProgress"] = "RequestInProgress";
    PermissionElementIssueType2["UntrustedEvent"] = "UntrustedEvent";
    PermissionElementIssueType2["RegistrationFailed"] = "RegistrationFailed";
    PermissionElementIssueType2["TypeNotSupported"] = "TypeNotSupported";
    PermissionElementIssueType2["InvalidTypeActivation"] = "InvalidTypeActivation";
    PermissionElementIssueType2["SecurityChecksFailed"] = "SecurityChecksFailed";
    PermissionElementIssueType2["ActivationDisabled"] = "ActivationDisabled";
    PermissionElementIssueType2["GeolocationDeprecated"] = "GeolocationDeprecated";
    PermissionElementIssueType2["InvalidDisplayStyle"] = "InvalidDisplayStyle";
    PermissionElementIssueType2["NonOpaqueColor"] = "NonOpaqueColor";
    PermissionElementIssueType2["LowContrast"] = "LowContrast";
    PermissionElementIssueType2["FontSizeTooSmall"] = "FontSizeTooSmall";
    PermissionElementIssueType2["FontSizeTooLarge"] = "FontSizeTooLarge";
    PermissionElementIssueType2["InvalidSizeValue"] = "InvalidSizeValue";
    PermissionElementIssueType2["NonSecureContext"] = "NonSecureContext";
    PermissionElementIssueType2["MissingTransientUserActivation"] = "MissingTransientUserActivation";
  })(PermissionElementIssueType = Audits2.PermissionElementIssueType || (Audits2.PermissionElementIssueType = {}));
  let InspectorIssueCode;
  ((InspectorIssueCode2) => {
    InspectorIssueCode2["CookieIssue"] = "CookieIssue";
    InspectorIssueCode2["MixedContentIssue"] = "MixedContentIssue";
    InspectorIssueCode2["BlockedByResponseIssue"] = "BlockedByResponseIssue";
    InspectorIssueCode2["HeavyAdIssue"] = "HeavyAdIssue";
    InspectorIssueCode2["ContentSecurityPolicyIssue"] = "ContentSecurityPolicyIssue";
    InspectorIssueCode2["SharedArrayBufferIssue"] = "SharedArrayBufferIssue";
    InspectorIssueCode2["CorsIssue"] = "CorsIssue";
    InspectorIssueCode2["QuirksModeIssue"] = "QuirksModeIssue";
    InspectorIssueCode2["PartitioningBlobURLIssue"] = "PartitioningBlobURLIssue";
    InspectorIssueCode2["NavigatorUserAgentIssue"] = "NavigatorUserAgentIssue";
    InspectorIssueCode2["GenericIssue"] = "GenericIssue";
    InspectorIssueCode2["DeprecationIssue"] = "DeprecationIssue";
    InspectorIssueCode2["ClientHintIssue"] = "ClientHintIssue";
    InspectorIssueCode2["FederatedAuthRequestIssue"] = "FederatedAuthRequestIssue";
    InspectorIssueCode2["BounceTrackingIssue"] = "BounceTrackingIssue";
    InspectorIssueCode2["CookieDeprecationMetadataIssue"] = "CookieDeprecationMetadataIssue";
    InspectorIssueCode2["StylesheetLoadingIssue"] = "StylesheetLoadingIssue";
    InspectorIssueCode2["FederatedAuthUserInfoRequestIssue"] = "FederatedAuthUserInfoRequestIssue";
    InspectorIssueCode2["PropertyRuleIssue"] = "PropertyRuleIssue";
    InspectorIssueCode2["SharedDictionaryIssue"] = "SharedDictionaryIssue";
    InspectorIssueCode2["ElementAccessibilityIssue"] = "ElementAccessibilityIssue";
    InspectorIssueCode2["SRIMessageSignatureIssue"] = "SRIMessageSignatureIssue";
    InspectorIssueCode2["UnencodedDigestIssue"] = "UnencodedDigestIssue";
    InspectorIssueCode2["ConnectionAllowlistIssue"] = "ConnectionAllowlistIssue";
    InspectorIssueCode2["UserReidentificationIssue"] = "UserReidentificationIssue";
    InspectorIssueCode2["PermissionElementIssue"] = "PermissionElementIssue";
    InspectorIssueCode2["PerformanceIssue"] = "PerformanceIssue";
    InspectorIssueCode2["SelectivePermissionsInterventionIssue"] = "SelectivePermissionsInterventionIssue";
    InspectorIssueCode2["EmailVerificationRequestIssue"] = "EmailVerificationRequestIssue";
    InspectorIssueCode2["LazyLoadImageIssue"] = "LazyLoadImageIssue";
  })(InspectorIssueCode = Audits2.InspectorIssueCode || (Audits2.InspectorIssueCode = {}));
  let GetEncodedResponseRequestEncoding;
  ((GetEncodedResponseRequestEncoding2) => {
    GetEncodedResponseRequestEncoding2["Webp"] = "webp";
    GetEncodedResponseRequestEncoding2["Jpeg"] = "jpeg";
    GetEncodedResponseRequestEncoding2["Png"] = "png";
  })(GetEncodedResponseRequestEncoding = Audits2.GetEncodedResponseRequestEncoding || (Audits2.GetEncodedResponseRequestEncoding = {}));
})(Audits || (Audits = {}));
var Autofill;
((Autofill2) => {
  let FillingStrategy;
  ((FillingStrategy2) => {
    FillingStrategy2["AutocompleteAttribute"] = "autocompleteAttribute";
    FillingStrategy2["AutofillInferred"] = "autofillInferred";
  })(FillingStrategy = Autofill2.FillingStrategy || (Autofill2.FillingStrategy = {}));
})(Autofill || (Autofill = {}));
var BackgroundService;
((BackgroundService2) => {
  let ServiceName;
  ((ServiceName2) => {
    ServiceName2["BackgroundFetch"] = "backgroundFetch";
    ServiceName2["BackgroundSync"] = "backgroundSync";
    ServiceName2["PushMessaging"] = "pushMessaging";
    ServiceName2["Notifications"] = "notifications";
    ServiceName2["PaymentHandler"] = "paymentHandler";
    ServiceName2["PeriodicBackgroundSync"] = "periodicBackgroundSync";
  })(ServiceName = BackgroundService2.ServiceName || (BackgroundService2.ServiceName = {}));
})(BackgroundService || (BackgroundService = {}));
var BluetoothEmulation;
((BluetoothEmulation2) => {
  let CentralState;
  ((CentralState2) => {
    CentralState2["Absent"] = "absent";
    CentralState2["PoweredOff"] = "powered-off";
    CentralState2["PoweredOn"] = "powered-on";
  })(CentralState = BluetoothEmulation2.CentralState || (BluetoothEmulation2.CentralState = {}));
  let GATTOperationType;
  ((GATTOperationType2) => {
    GATTOperationType2["Connection"] = "connection";
    GATTOperationType2["Discovery"] = "discovery";
  })(GATTOperationType = BluetoothEmulation2.GATTOperationType || (BluetoothEmulation2.GATTOperationType = {}));
  let CharacteristicWriteType;
  ((CharacteristicWriteType2) => {
    CharacteristicWriteType2["WriteDefaultDeprecated"] = "write-default-deprecated";
    CharacteristicWriteType2["WriteWithResponse"] = "write-with-response";
    CharacteristicWriteType2["WriteWithoutResponse"] = "write-without-response";
  })(CharacteristicWriteType = BluetoothEmulation2.CharacteristicWriteType || (BluetoothEmulation2.CharacteristicWriteType = {}));
  let CharacteristicOperationType;
  ((CharacteristicOperationType2) => {
    CharacteristicOperationType2["Read"] = "read";
    CharacteristicOperationType2["Write"] = "write";
    CharacteristicOperationType2["SubscribeToNotifications"] = "subscribe-to-notifications";
    CharacteristicOperationType2["UnsubscribeFromNotifications"] = "unsubscribe-from-notifications";
  })(CharacteristicOperationType = BluetoothEmulation2.CharacteristicOperationType || (BluetoothEmulation2.CharacteristicOperationType = {}));
  let DescriptorOperationType;
  ((DescriptorOperationType2) => {
    DescriptorOperationType2["Read"] = "read";
    DescriptorOperationType2["Write"] = "write";
  })(DescriptorOperationType = BluetoothEmulation2.DescriptorOperationType || (BluetoothEmulation2.DescriptorOperationType = {}));
})(BluetoothEmulation || (BluetoothEmulation = {}));
var Browser;
((Browser2) => {
  let WindowState;
  ((WindowState2) => {
    WindowState2["Normal"] = "normal";
    WindowState2["Minimized"] = "minimized";
    WindowState2["Maximized"] = "maximized";
    WindowState2["Fullscreen"] = "fullscreen";
  })(WindowState = Browser2.WindowState || (Browser2.WindowState = {}));
  let PermissionType;
  ((PermissionType2) => {
    PermissionType2["Ar"] = "ar";
    PermissionType2["AudioCapture"] = "audioCapture";
    PermissionType2["AutomaticFullscreen"] = "automaticFullscreen";
    PermissionType2["BackgroundFetch"] = "backgroundFetch";
    PermissionType2["BackgroundSync"] = "backgroundSync";
    PermissionType2["CameraPanTiltZoom"] = "cameraPanTiltZoom";
    PermissionType2["CapturedSurfaceControl"] = "capturedSurfaceControl";
    PermissionType2["ClipboardReadWrite"] = "clipboardReadWrite";
    PermissionType2["ClipboardSanitizedWrite"] = "clipboardSanitizedWrite";
    PermissionType2["DisplayCapture"] = "displayCapture";
    PermissionType2["DurableStorage"] = "durableStorage";
    PermissionType2["Geolocation"] = "geolocation";
    PermissionType2["HandTracking"] = "handTracking";
    PermissionType2["IdleDetection"] = "idleDetection";
    PermissionType2["KeyboardLock"] = "keyboardLock";
    PermissionType2["LocalFonts"] = "localFonts";
    PermissionType2["LocalNetwork"] = "localNetwork";
    PermissionType2["LocalNetworkAccess"] = "localNetworkAccess";
    PermissionType2["LoopbackNetwork"] = "loopbackNetwork";
    PermissionType2["Midi"] = "midi";
    PermissionType2["MidiSysex"] = "midiSysex";
    PermissionType2["Nfc"] = "nfc";
    PermissionType2["Notifications"] = "notifications";
    PermissionType2["PaymentHandler"] = "paymentHandler";
    PermissionType2["PeriodicBackgroundSync"] = "periodicBackgroundSync";
    PermissionType2["PointerLock"] = "pointerLock";
    PermissionType2["ProtectedMediaIdentifier"] = "protectedMediaIdentifier";
    PermissionType2["Sensors"] = "sensors";
    PermissionType2["SmartCard"] = "smartCard";
    PermissionType2["SpeakerSelection"] = "speakerSelection";
    PermissionType2["StorageAccess"] = "storageAccess";
    PermissionType2["TopLevelStorageAccess"] = "topLevelStorageAccess";
    PermissionType2["VideoCapture"] = "videoCapture";
    PermissionType2["Vr"] = "vr";
    PermissionType2["WakeLockScreen"] = "wakeLockScreen";
    PermissionType2["WakeLockSystem"] = "wakeLockSystem";
    PermissionType2["WebAppInstallation"] = "webAppInstallation";
    PermissionType2["WebPrinting"] = "webPrinting";
    PermissionType2["WindowManagement"] = "windowManagement";
  })(PermissionType = Browser2.PermissionType || (Browser2.PermissionType = {}));
  let PermissionSetting;
  ((PermissionSetting2) => {
    PermissionSetting2["Granted"] = "granted";
    PermissionSetting2["Denied"] = "denied";
    PermissionSetting2["Prompt"] = "prompt";
  })(PermissionSetting = Browser2.PermissionSetting || (Browser2.PermissionSetting = {}));
  let BrowserCommandId;
  ((BrowserCommandId2) => {
    BrowserCommandId2["OpenTabSearch"] = "openTabSearch";
    BrowserCommandId2["CloseTabSearch"] = "closeTabSearch";
    BrowserCommandId2["OpenGlic"] = "openGlic";
  })(BrowserCommandId = Browser2.BrowserCommandId || (Browser2.BrowserCommandId = {}));
  let SetDownloadBehaviorRequestBehavior;
  ((SetDownloadBehaviorRequestBehavior2) => {
    SetDownloadBehaviorRequestBehavior2["Deny"] = "deny";
    SetDownloadBehaviorRequestBehavior2["Allow"] = "allow";
    SetDownloadBehaviorRequestBehavior2["AllowAndName"] = "allowAndName";
    SetDownloadBehaviorRequestBehavior2["Default"] = "default";
  })(SetDownloadBehaviorRequestBehavior = Browser2.SetDownloadBehaviorRequestBehavior || (Browser2.SetDownloadBehaviorRequestBehavior = {}));
  let DownloadProgressEventState;
  ((DownloadProgressEventState2) => {
    DownloadProgressEventState2["InProgress"] = "inProgress";
    DownloadProgressEventState2["Completed"] = "completed";
    DownloadProgressEventState2["Canceled"] = "canceled";
  })(DownloadProgressEventState = Browser2.DownloadProgressEventState || (Browser2.DownloadProgressEventState = {}));
})(Browser || (Browser = {}));
var CSS;
((CSS2) => {
  let StyleSheetOrigin;
  ((StyleSheetOrigin2) => {
    StyleSheetOrigin2["Injected"] = "injected";
    StyleSheetOrigin2["UserAgent"] = "user-agent";
    StyleSheetOrigin2["Inspector"] = "inspector";
    StyleSheetOrigin2["Regular"] = "regular";
  })(StyleSheetOrigin = CSS2.StyleSheetOrigin || (CSS2.StyleSheetOrigin = {}));
  let CSSRuleType;
  ((CSSRuleType2) => {
    CSSRuleType2["MediaRule"] = "MediaRule";
    CSSRuleType2["SupportsRule"] = "SupportsRule";
    CSSRuleType2["ContainerRule"] = "ContainerRule";
    CSSRuleType2["LayerRule"] = "LayerRule";
    CSSRuleType2["ScopeRule"] = "ScopeRule";
    CSSRuleType2["StyleRule"] = "StyleRule";
    CSSRuleType2["StartingStyleRule"] = "StartingStyleRule";
    CSSRuleType2["NavigationRule"] = "NavigationRule";
  })(CSSRuleType = CSS2.CSSRuleType || (CSS2.CSSRuleType = {}));
  let CSSMediaSource;
  ((CSSMediaSource2) => {
    CSSMediaSource2["MediaRule"] = "mediaRule";
    CSSMediaSource2["ImportRule"] = "importRule";
    CSSMediaSource2["LinkedSheet"] = "linkedSheet";
    CSSMediaSource2["InlineSheet"] = "inlineSheet";
  })(CSSMediaSource = CSS2.CSSMediaSource || (CSS2.CSSMediaSource = {}));
  let CSSAtRuleType;
  ((CSSAtRuleType2) => {
    CSSAtRuleType2["FontFace"] = "font-face";
    CSSAtRuleType2["FontFeatureValues"] = "font-feature-values";
    CSSAtRuleType2["FontPaletteValues"] = "font-palette-values";
    CSSAtRuleType2["CounterStyle"] = "counter-style";
  })(CSSAtRuleType = CSS2.CSSAtRuleType || (CSS2.CSSAtRuleType = {}));
  let CSSAtRuleSubsection;
  ((CSSAtRuleSubsection2) => {
    CSSAtRuleSubsection2["Swash"] = "swash";
    CSSAtRuleSubsection2["Annotation"] = "annotation";
    CSSAtRuleSubsection2["Ornaments"] = "ornaments";
    CSSAtRuleSubsection2["Stylistic"] = "stylistic";
    CSSAtRuleSubsection2["Styleset"] = "styleset";
    CSSAtRuleSubsection2["CharacterVariant"] = "character-variant";
  })(CSSAtRuleSubsection = CSS2.CSSAtRuleSubsection || (CSS2.CSSAtRuleSubsection = {}));
})(CSS || (CSS = {}));
var CacheStorage;
((CacheStorage2) => {
  let CachedResponseType;
  ((CachedResponseType2) => {
    CachedResponseType2["Basic"] = "basic";
    CachedResponseType2["Cors"] = "cors";
    CachedResponseType2["Default"] = "default";
    CachedResponseType2["Error"] = "error";
    CachedResponseType2["OpaqueResponse"] = "opaqueResponse";
    CachedResponseType2["OpaqueRedirect"] = "opaqueRedirect";
  })(CachedResponseType = CacheStorage2.CachedResponseType || (CacheStorage2.CachedResponseType = {}));
})(CacheStorage || (CacheStorage = {}));
var DOM;
((DOM2) => {
  let PseudoType;
  ((PseudoType2) => {
    PseudoType2["FirstLine"] = "first-line";
    PseudoType2["FirstLetter"] = "first-letter";
    PseudoType2["Checkmark"] = "checkmark";
    PseudoType2["Before"] = "before";
    PseudoType2["After"] = "after";
    PseudoType2["ExpandIcon"] = "expand-icon";
    PseudoType2["PickerIcon"] = "picker-icon";
    PseudoType2["InterestButton"] = "interest-button";
    PseudoType2["Marker"] = "marker";
    PseudoType2["Backdrop"] = "backdrop";
    PseudoType2["Column"] = "column";
    PseudoType2["Selection"] = "selection";
    PseudoType2["SearchText"] = "search-text";
    PseudoType2["TargetText"] = "target-text";
    PseudoType2["SpellingError"] = "spelling-error";
    PseudoType2["GrammarError"] = "grammar-error";
    PseudoType2["Highlight"] = "highlight";
    PseudoType2["FirstLineInherited"] = "first-line-inherited";
    PseudoType2["ScrollMarker"] = "scroll-marker";
    PseudoType2["ScrollMarkerGroup"] = "scroll-marker-group";
    PseudoType2["ScrollButton"] = "scroll-button";
    PseudoType2["Scrollbar"] = "scrollbar";
    PseudoType2["ScrollbarThumb"] = "scrollbar-thumb";
    PseudoType2["ScrollbarButton"] = "scrollbar-button";
    PseudoType2["ScrollbarTrack"] = "scrollbar-track";
    PseudoType2["ScrollbarTrackPiece"] = "scrollbar-track-piece";
    PseudoType2["ScrollbarCorner"] = "scrollbar-corner";
    PseudoType2["Resizer"] = "resizer";
    PseudoType2["InputListButton"] = "input-list-button";
    PseudoType2["ViewTransition"] = "view-transition";
    PseudoType2["ViewTransitionGroup"] = "view-transition-group";
    PseudoType2["ViewTransitionImagePair"] = "view-transition-image-pair";
    PseudoType2["ViewTransitionGroupChildren"] = "view-transition-group-children";
    PseudoType2["ViewTransitionOld"] = "view-transition-old";
    PseudoType2["ViewTransitionNew"] = "view-transition-new";
    PseudoType2["Placeholder"] = "placeholder";
    PseudoType2["FileSelectorButton"] = "file-selector-button";
    PseudoType2["DetailsContent"] = "details-content";
    PseudoType2["Picker"] = "picker";
    PseudoType2["SelectListbox"] = "select-listbox";
    PseudoType2["PermissionIcon"] = "permission-icon";
    PseudoType2["OverscrollAreaParent"] = "overscroll-area-parent";
    PseudoType2["OverscrollBackdrop"] = "overscroll-backdrop";
    PseudoType2["Skeleton"] = "skeleton";
  })(PseudoType = DOM2.PseudoType || (DOM2.PseudoType = {}));
  let ShadowRootType;
  ((ShadowRootType2) => {
    ShadowRootType2["UserAgent"] = "user-agent";
    ShadowRootType2["Open"] = "open";
    ShadowRootType2["Closed"] = "closed";
  })(ShadowRootType = DOM2.ShadowRootType || (DOM2.ShadowRootType = {}));
  let CompatibilityMode;
  ((CompatibilityMode2) => {
    CompatibilityMode2["QuirksMode"] = "QuirksMode";
    CompatibilityMode2["LimitedQuirksMode"] = "LimitedQuirksMode";
    CompatibilityMode2["NoQuirksMode"] = "NoQuirksMode";
  })(CompatibilityMode = DOM2.CompatibilityMode || (DOM2.CompatibilityMode = {}));
  let PhysicalAxes;
  ((PhysicalAxes2) => {
    PhysicalAxes2["Horizontal"] = "Horizontal";
    PhysicalAxes2["Vertical"] = "Vertical";
    PhysicalAxes2["Both"] = "Both";
  })(PhysicalAxes = DOM2.PhysicalAxes || (DOM2.PhysicalAxes = {}));
  let LogicalAxes;
  ((LogicalAxes2) => {
    LogicalAxes2["Inline"] = "Inline";
    LogicalAxes2["Block"] = "Block";
    LogicalAxes2["Both"] = "Both";
  })(LogicalAxes = DOM2.LogicalAxes || (DOM2.LogicalAxes = {}));
  let ScrollOrientation;
  ((ScrollOrientation2) => {
    ScrollOrientation2["Horizontal"] = "horizontal";
    ScrollOrientation2["Vertical"] = "vertical";
  })(ScrollOrientation = DOM2.ScrollOrientation || (DOM2.ScrollOrientation = {}));
  let EnableRequestIncludeWhitespace;
  ((EnableRequestIncludeWhitespace2) => {
    EnableRequestIncludeWhitespace2["None"] = "none";
    EnableRequestIncludeWhitespace2["All"] = "all";
  })(EnableRequestIncludeWhitespace = DOM2.EnableRequestIncludeWhitespace || (DOM2.EnableRequestIncludeWhitespace = {}));
  let GetElementByRelationRequestRelation;
  ((GetElementByRelationRequestRelation2) => {
    GetElementByRelationRequestRelation2["PopoverTarget"] = "PopoverTarget";
    GetElementByRelationRequestRelation2["InterestTarget"] = "InterestTarget";
    GetElementByRelationRequestRelation2["CommandFor"] = "CommandFor";
  })(GetElementByRelationRequestRelation = DOM2.GetElementByRelationRequestRelation || (DOM2.GetElementByRelationRequestRelation = {}));
})(DOM || (DOM = {}));
var DOMDebugger;
((DOMDebugger2) => {
  let DOMBreakpointType;
  ((DOMBreakpointType2) => {
    DOMBreakpointType2["SubtreeModified"] = "subtree-modified";
    DOMBreakpointType2["AttributeModified"] = "attribute-modified";
    DOMBreakpointType2["NodeRemoved"] = "node-removed";
  })(DOMBreakpointType = DOMDebugger2.DOMBreakpointType || (DOMDebugger2.DOMBreakpointType = {}));
  let CSPViolationType;
  ((CSPViolationType2) => {
    CSPViolationType2["TrustedtypeSinkViolation"] = "trustedtype-sink-violation";
    CSPViolationType2["TrustedtypePolicyViolation"] = "trustedtype-policy-violation";
  })(CSPViolationType = DOMDebugger2.CSPViolationType || (DOMDebugger2.CSPViolationType = {}));
})(DOMDebugger || (DOMDebugger = {}));
var DigitalCredentials;
((DigitalCredentials2) => {
  let VirtualWalletAction;
  ((VirtualWalletAction2) => {
    VirtualWalletAction2["Respond"] = "respond";
    VirtualWalletAction2["Decline"] = "decline";
    VirtualWalletAction2["Wait"] = "wait";
    VirtualWalletAction2["Clear"] = "clear";
  })(VirtualWalletAction = DigitalCredentials2.VirtualWalletAction || (DigitalCredentials2.VirtualWalletAction = {}));
})(DigitalCredentials || (DigitalCredentials = {}));
var Emulation;
((Emulation2) => {
  let ScreenOrientationType;
  ((ScreenOrientationType2) => {
    ScreenOrientationType2["PortraitPrimary"] = "portraitPrimary";
    ScreenOrientationType2["PortraitSecondary"] = "portraitSecondary";
    ScreenOrientationType2["LandscapePrimary"] = "landscapePrimary";
    ScreenOrientationType2["LandscapeSecondary"] = "landscapeSecondary";
  })(ScreenOrientationType = Emulation2.ScreenOrientationType || (Emulation2.ScreenOrientationType = {}));
  let DisplayFeatureOrientation;
  ((DisplayFeatureOrientation2) => {
    DisplayFeatureOrientation2["Vertical"] = "vertical";
    DisplayFeatureOrientation2["Horizontal"] = "horizontal";
  })(DisplayFeatureOrientation = Emulation2.DisplayFeatureOrientation || (Emulation2.DisplayFeatureOrientation = {}));
  let DevicePostureType;
  ((DevicePostureType2) => {
    DevicePostureType2["Continuous"] = "continuous";
    DevicePostureType2["Folded"] = "folded";
  })(DevicePostureType = Emulation2.DevicePostureType || (Emulation2.DevicePostureType = {}));
  let VirtualTimePolicy;
  ((VirtualTimePolicy2) => {
    VirtualTimePolicy2["Advance"] = "advance";
    VirtualTimePolicy2["Pause"] = "pause";
    VirtualTimePolicy2["PauseIfNetworkFetchesPending"] = "pauseIfNetworkFetchesPending";
  })(VirtualTimePolicy = Emulation2.VirtualTimePolicy || (Emulation2.VirtualTimePolicy = {}));
  let SensorType;
  ((SensorType2) => {
    SensorType2["AbsoluteOrientation"] = "absolute-orientation";
    SensorType2["Accelerometer"] = "accelerometer";
    SensorType2["AmbientLight"] = "ambient-light";
    SensorType2["Gravity"] = "gravity";
    SensorType2["Gyroscope"] = "gyroscope";
    SensorType2["LinearAcceleration"] = "linear-acceleration";
    SensorType2["Magnetometer"] = "magnetometer";
    SensorType2["RelativeOrientation"] = "relative-orientation";
  })(SensorType = Emulation2.SensorType || (Emulation2.SensorType = {}));
  let PressureSource;
  ((PressureSource2) => {
    PressureSource2["Cpu"] = "cpu";
  })(PressureSource = Emulation2.PressureSource || (Emulation2.PressureSource = {}));
  let PressureState;
  ((PressureState2) => {
    PressureState2["Nominal"] = "nominal";
    PressureState2["Fair"] = "fair";
    PressureState2["Serious"] = "serious";
    PressureState2["Critical"] = "critical";
  })(PressureState = Emulation2.PressureState || (Emulation2.PressureState = {}));
  let DisabledImageType;
  ((DisabledImageType2) => {
    DisabledImageType2["Avif"] = "avif";
    DisabledImageType2["Jxl"] = "jxl";
    DisabledImageType2["Webp"] = "webp";
  })(DisabledImageType = Emulation2.DisabledImageType || (Emulation2.DisabledImageType = {}));
  let SetDeviceMetricsOverrideRequestScrollbarType;
  ((SetDeviceMetricsOverrideRequestScrollbarType2) => {
    SetDeviceMetricsOverrideRequestScrollbarType2["Overlay"] = "overlay";
    SetDeviceMetricsOverrideRequestScrollbarType2["Default"] = "default";
  })(SetDeviceMetricsOverrideRequestScrollbarType = Emulation2.SetDeviceMetricsOverrideRequestScrollbarType || (Emulation2.SetDeviceMetricsOverrideRequestScrollbarType = {}));
  let SetEmitTouchEventsForMouseRequestConfiguration;
  ((SetEmitTouchEventsForMouseRequestConfiguration2) => {
    SetEmitTouchEventsForMouseRequestConfiguration2["Mobile"] = "mobile";
    SetEmitTouchEventsForMouseRequestConfiguration2["Desktop"] = "desktop";
  })(SetEmitTouchEventsForMouseRequestConfiguration = Emulation2.SetEmitTouchEventsForMouseRequestConfiguration || (Emulation2.SetEmitTouchEventsForMouseRequestConfiguration = {}));
  let SetEmulatedVisionDeficiencyRequestType;
  ((SetEmulatedVisionDeficiencyRequestType2) => {
    SetEmulatedVisionDeficiencyRequestType2["None"] = "none";
    SetEmulatedVisionDeficiencyRequestType2["BlurredVision"] = "blurredVision";
    SetEmulatedVisionDeficiencyRequestType2["ReducedContrast"] = "reducedContrast";
    SetEmulatedVisionDeficiencyRequestType2["Achromatopsia"] = "achromatopsia";
    SetEmulatedVisionDeficiencyRequestType2["Deuteranopia"] = "deuteranopia";
    SetEmulatedVisionDeficiencyRequestType2["Protanopia"] = "protanopia";
    SetEmulatedVisionDeficiencyRequestType2["Tritanopia"] = "tritanopia";
  })(SetEmulatedVisionDeficiencyRequestType = Emulation2.SetEmulatedVisionDeficiencyRequestType || (Emulation2.SetEmulatedVisionDeficiencyRequestType = {}));
  let SetCPUPerformanceOverrideRequestPerformanceTier;
  ((SetCPUPerformanceOverrideRequestPerformanceTier2) => {
    SetCPUPerformanceOverrideRequestPerformanceTier2["Unknown"] = "unknown";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Low"] = "low";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Mid"] = "mid";
    SetCPUPerformanceOverrideRequestPerformanceTier2["High"] = "high";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Ultra"] = "ultra";
  })(SetCPUPerformanceOverrideRequestPerformanceTier = Emulation2.SetCPUPerformanceOverrideRequestPerformanceTier || (Emulation2.SetCPUPerformanceOverrideRequestPerformanceTier = {}));
})(Emulation || (Emulation = {}));
var Extensions;
((Extensions2) => {
  let StorageArea;
  ((StorageArea2) => {
    StorageArea2["Session"] = "session";
    StorageArea2["Local"] = "local";
    StorageArea2["Sync"] = "sync";
    StorageArea2["Managed"] = "managed";
  })(StorageArea = Extensions2.StorageArea || (Extensions2.StorageArea = {}));
})(Extensions || (Extensions = {}));
var FedCm;
((FedCm2) => {
  let LoginState;
  ((LoginState2) => {
    LoginState2["SignIn"] = "SignIn";
    LoginState2["SignUp"] = "SignUp";
  })(LoginState = FedCm2.LoginState || (FedCm2.LoginState = {}));
  let DialogType;
  ((DialogType2) => {
    DialogType2["AccountChooser"] = "AccountChooser";
    DialogType2["AutoReauthn"] = "AutoReauthn";
    DialogType2["ConfirmIdpLogin"] = "ConfirmIdpLogin";
    DialogType2["Error"] = "Error";
  })(DialogType = FedCm2.DialogType || (FedCm2.DialogType = {}));
  let DialogButton;
  ((DialogButton2) => {
    DialogButton2["ConfirmIdpLoginContinue"] = "ConfirmIdpLoginContinue";
    DialogButton2["ErrorGotIt"] = "ErrorGotIt";
    DialogButton2["ErrorMoreDetails"] = "ErrorMoreDetails";
  })(DialogButton = FedCm2.DialogButton || (FedCm2.DialogButton = {}));
  let AccountUrlType;
  ((AccountUrlType2) => {
    AccountUrlType2["TermsOfService"] = "TermsOfService";
    AccountUrlType2["PrivacyPolicy"] = "PrivacyPolicy";
  })(AccountUrlType = FedCm2.AccountUrlType || (FedCm2.AccountUrlType = {}));
})(FedCm || (FedCm = {}));
var Fetch;
((Fetch2) => {
  let RequestStage;
  ((RequestStage2) => {
    RequestStage2["Request"] = "Request";
    RequestStage2["Response"] = "Response";
  })(RequestStage = Fetch2.RequestStage || (Fetch2.RequestStage = {}));
  let AuthChallengeSource;
  ((AuthChallengeSource2) => {
    AuthChallengeSource2["Server"] = "Server";
    AuthChallengeSource2["Proxy"] = "Proxy";
  })(AuthChallengeSource = Fetch2.AuthChallengeSource || (Fetch2.AuthChallengeSource = {}));
  let AuthChallengeResponseResponse;
  ((AuthChallengeResponseResponse2) => {
    AuthChallengeResponseResponse2["Default"] = "Default";
    AuthChallengeResponseResponse2["CancelAuth"] = "CancelAuth";
    AuthChallengeResponseResponse2["ProvideCredentials"] = "ProvideCredentials";
  })(AuthChallengeResponseResponse = Fetch2.AuthChallengeResponseResponse || (Fetch2.AuthChallengeResponseResponse = {}));
})(Fetch || (Fetch = {}));
var HeadlessExperimental;
((HeadlessExperimental2) => {
  let ScreenshotParamsFormat;
  ((ScreenshotParamsFormat2) => {
    ScreenshotParamsFormat2["Jpeg"] = "jpeg";
    ScreenshotParamsFormat2["Png"] = "png";
    ScreenshotParamsFormat2["Webp"] = "webp";
  })(ScreenshotParamsFormat = HeadlessExperimental2.ScreenshotParamsFormat || (HeadlessExperimental2.ScreenshotParamsFormat = {}));
})(HeadlessExperimental || (HeadlessExperimental = {}));
var IndexedDB;
((IndexedDB2) => {
  let KeyType;
  ((KeyType2) => {
    KeyType2["Number"] = "number";
    KeyType2["String"] = "string";
    KeyType2["Date"] = "date";
    KeyType2["Array"] = "array";
  })(KeyType = IndexedDB2.KeyType || (IndexedDB2.KeyType = {}));
  let KeyPathType;
  ((KeyPathType2) => {
    KeyPathType2["Null"] = "null";
    KeyPathType2["String"] = "string";
    KeyPathType2["Array"] = "array";
  })(KeyPathType = IndexedDB2.KeyPathType || (IndexedDB2.KeyPathType = {}));
})(IndexedDB || (IndexedDB = {}));
var Input;
((Input2) => {
  let GestureSourceType;
  ((GestureSourceType2) => {
    GestureSourceType2["Default"] = "default";
    GestureSourceType2["Touch"] = "touch";
    GestureSourceType2["Mouse"] = "mouse";
  })(GestureSourceType = Input2.GestureSourceType || (Input2.GestureSourceType = {}));
  let MouseButton;
  ((MouseButton2) => {
    MouseButton2["None"] = "none";
    MouseButton2["Left"] = "left";
    MouseButton2["Middle"] = "middle";
    MouseButton2["Right"] = "right";
    MouseButton2["Back"] = "back";
    MouseButton2["Forward"] = "forward";
  })(MouseButton = Input2.MouseButton || (Input2.MouseButton = {}));
  let DispatchDragEventRequestType;
  ((DispatchDragEventRequestType2) => {
    DispatchDragEventRequestType2["DragEnter"] = "dragEnter";
    DispatchDragEventRequestType2["DragOver"] = "dragOver";
    DispatchDragEventRequestType2["Drop"] = "drop";
    DispatchDragEventRequestType2["DragCancel"] = "dragCancel";
  })(DispatchDragEventRequestType = Input2.DispatchDragEventRequestType || (Input2.DispatchDragEventRequestType = {}));
  let DispatchKeyEventRequestType;
  ((DispatchKeyEventRequestType2) => {
    DispatchKeyEventRequestType2["KeyDown"] = "keyDown";
    DispatchKeyEventRequestType2["KeyUp"] = "keyUp";
    DispatchKeyEventRequestType2["RawKeyDown"] = "rawKeyDown";
    DispatchKeyEventRequestType2["Char"] = "char";
  })(DispatchKeyEventRequestType = Input2.DispatchKeyEventRequestType || (Input2.DispatchKeyEventRequestType = {}));
  let DispatchMouseEventRequestType;
  ((DispatchMouseEventRequestType2) => {
    DispatchMouseEventRequestType2["MousePressed"] = "mousePressed";
    DispatchMouseEventRequestType2["MouseReleased"] = "mouseReleased";
    DispatchMouseEventRequestType2["MouseMoved"] = "mouseMoved";
    DispatchMouseEventRequestType2["MouseWheel"] = "mouseWheel";
  })(DispatchMouseEventRequestType = Input2.DispatchMouseEventRequestType || (Input2.DispatchMouseEventRequestType = {}));
  let DispatchMouseEventRequestPointerType;
  ((DispatchMouseEventRequestPointerType2) => {
    DispatchMouseEventRequestPointerType2["Mouse"] = "mouse";
    DispatchMouseEventRequestPointerType2["Pen"] = "pen";
  })(DispatchMouseEventRequestPointerType = Input2.DispatchMouseEventRequestPointerType || (Input2.DispatchMouseEventRequestPointerType = {}));
  let DispatchTouchEventRequestType;
  ((DispatchTouchEventRequestType2) => {
    DispatchTouchEventRequestType2["TouchStart"] = "touchStart";
    DispatchTouchEventRequestType2["TouchEnd"] = "touchEnd";
    DispatchTouchEventRequestType2["TouchMove"] = "touchMove";
    DispatchTouchEventRequestType2["TouchCancel"] = "touchCancel";
  })(DispatchTouchEventRequestType = Input2.DispatchTouchEventRequestType || (Input2.DispatchTouchEventRequestType = {}));
  let EmulateTouchFromMouseEventRequestType;
  ((EmulateTouchFromMouseEventRequestType2) => {
    EmulateTouchFromMouseEventRequestType2["MousePressed"] = "mousePressed";
    EmulateTouchFromMouseEventRequestType2["MouseReleased"] = "mouseReleased";
    EmulateTouchFromMouseEventRequestType2["MouseMoved"] = "mouseMoved";
    EmulateTouchFromMouseEventRequestType2["MouseWheel"] = "mouseWheel";
  })(EmulateTouchFromMouseEventRequestType = Input2.EmulateTouchFromMouseEventRequestType || (Input2.EmulateTouchFromMouseEventRequestType = {}));
})(Input || (Input = {}));
var LayerTree;
((LayerTree2) => {
  let ScrollRectType;
  ((ScrollRectType2) => {
    ScrollRectType2["RepaintsOnScroll"] = "RepaintsOnScroll";
    ScrollRectType2["TouchEventHandler"] = "TouchEventHandler";
    ScrollRectType2["WheelEventHandler"] = "WheelEventHandler";
  })(ScrollRectType = LayerTree2.ScrollRectType || (LayerTree2.ScrollRectType = {}));
})(LayerTree || (LayerTree = {}));
var Log;
((Log2) => {
  let LogEntrySource;
  ((LogEntrySource2) => {
    LogEntrySource2["XML"] = "xml";
    LogEntrySource2["Javascript"] = "javascript";
    LogEntrySource2["Network"] = "network";
    LogEntrySource2["Storage"] = "storage";
    LogEntrySource2["Appcache"] = "appcache";
    LogEntrySource2["Rendering"] = "rendering";
    LogEntrySource2["Security"] = "security";
    LogEntrySource2["Deprecation"] = "deprecation";
    LogEntrySource2["Worker"] = "worker";
    LogEntrySource2["Violation"] = "violation";
    LogEntrySource2["Intervention"] = "intervention";
    LogEntrySource2["Recommendation"] = "recommendation";
    LogEntrySource2["Other"] = "other";
  })(LogEntrySource = Log2.LogEntrySource || (Log2.LogEntrySource = {}));
  let LogEntryLevel;
  ((LogEntryLevel2) => {
    LogEntryLevel2["Verbose"] = "verbose";
    LogEntryLevel2["Info"] = "info";
    LogEntryLevel2["Warning"] = "warning";
    LogEntryLevel2["Error"] = "error";
  })(LogEntryLevel = Log2.LogEntryLevel || (Log2.LogEntryLevel = {}));
  let LogEntryCategory;
  ((LogEntryCategory2) => {
    LogEntryCategory2["Cors"] = "cors";
  })(LogEntryCategory = Log2.LogEntryCategory || (Log2.LogEntryCategory = {}));
  let ViolationSettingName;
  ((ViolationSettingName2) => {
    ViolationSettingName2["LongTask"] = "longTask";
    ViolationSettingName2["LongLayout"] = "longLayout";
    ViolationSettingName2["BlockedEvent"] = "blockedEvent";
    ViolationSettingName2["BlockedParser"] = "blockedParser";
    ViolationSettingName2["DiscouragedAPIUse"] = "discouragedAPIUse";
    ViolationSettingName2["Handler"] = "handler";
    ViolationSettingName2["RecurringHandler"] = "recurringHandler";
  })(ViolationSettingName = Log2.ViolationSettingName || (Log2.ViolationSettingName = {}));
})(Log || (Log = {}));
var Media;
((Media2) => {
  let PlayerMessageLevel;
  ((PlayerMessageLevel2) => {
    PlayerMessageLevel2["Error"] = "error";
    PlayerMessageLevel2["Warning"] = "warning";
    PlayerMessageLevel2["Info"] = "info";
    PlayerMessageLevel2["Debug"] = "debug";
  })(PlayerMessageLevel = Media2.PlayerMessageLevel || (Media2.PlayerMessageLevel = {}));
})(Media || (Media = {}));
var Memory;
((Memory2) => {
  let PressureLevel;
  ((PressureLevel2) => {
    PressureLevel2["Moderate"] = "moderate";
    PressureLevel2["Critical"] = "critical";
  })(PressureLevel = Memory2.PressureLevel || (Memory2.PressureLevel = {}));
})(Memory || (Memory = {}));
var Network;
((Network2) => {
  let ResourceType3;
  ((ResourceType4) => {
    ResourceType4["Document"] = "Document";
    ResourceType4["Stylesheet"] = "Stylesheet";
    ResourceType4["Image"] = "Image";
    ResourceType4["Media"] = "Media";
    ResourceType4["Font"] = "Font";
    ResourceType4["Script"] = "Script";
    ResourceType4["TextTrack"] = "TextTrack";
    ResourceType4["XHR"] = "XHR";
    ResourceType4["Fetch"] = "Fetch";
    ResourceType4["Prefetch"] = "Prefetch";
    ResourceType4["EventSource"] = "EventSource";
    ResourceType4["WebSocket"] = "WebSocket";
    ResourceType4["Manifest"] = "Manifest";
    ResourceType4["SignedExchange"] = "SignedExchange";
    ResourceType4["Ping"] = "Ping";
    ResourceType4["CSPViolationReport"] = "CSPViolationReport";
    ResourceType4["Preflight"] = "Preflight";
    ResourceType4["FedCM"] = "FedCM";
    ResourceType4["Other"] = "Other";
  })(ResourceType3 = Network2.ResourceType || (Network2.ResourceType = {}));
  let ErrorReason;
  ((ErrorReason2) => {
    ErrorReason2["Failed"] = "Failed";
    ErrorReason2["Aborted"] = "Aborted";
    ErrorReason2["TimedOut"] = "TimedOut";
    ErrorReason2["AccessDenied"] = "AccessDenied";
    ErrorReason2["ConnectionClosed"] = "ConnectionClosed";
    ErrorReason2["ConnectionReset"] = "ConnectionReset";
    ErrorReason2["ConnectionRefused"] = "ConnectionRefused";
    ErrorReason2["ConnectionAborted"] = "ConnectionAborted";
    ErrorReason2["ConnectionFailed"] = "ConnectionFailed";
    ErrorReason2["NameNotResolved"] = "NameNotResolved";
    ErrorReason2["InternetDisconnected"] = "InternetDisconnected";
    ErrorReason2["AddressUnreachable"] = "AddressUnreachable";
    ErrorReason2["BlockedByClient"] = "BlockedByClient";
    ErrorReason2["BlockedByResponse"] = "BlockedByResponse";
  })(ErrorReason = Network2.ErrorReason || (Network2.ErrorReason = {}));
  let ConnectionType;
  ((ConnectionType2) => {
    ConnectionType2["None"] = "none";
    ConnectionType2["Cellular2g"] = "cellular2g";
    ConnectionType2["Cellular3g"] = "cellular3g";
    ConnectionType2["Cellular4g"] = "cellular4g";
    ConnectionType2["Bluetooth"] = "bluetooth";
    ConnectionType2["Ethernet"] = "ethernet";
    ConnectionType2["Wifi"] = "wifi";
    ConnectionType2["Wimax"] = "wimax";
    ConnectionType2["Other"] = "other";
  })(ConnectionType = Network2.ConnectionType || (Network2.ConnectionType = {}));
  let CookieSameSite;
  ((CookieSameSite2) => {
    CookieSameSite2["Strict"] = "Strict";
    CookieSameSite2["Lax"] = "Lax";
    CookieSameSite2["None"] = "None";
  })(CookieSameSite = Network2.CookieSameSite || (Network2.CookieSameSite = {}));
  let CookiePriority;
  ((CookiePriority2) => {
    CookiePriority2["Low"] = "Low";
    CookiePriority2["Medium"] = "Medium";
    CookiePriority2["High"] = "High";
  })(CookiePriority = Network2.CookiePriority || (Network2.CookiePriority = {}));
  let CookieSourceScheme;
  ((CookieSourceScheme2) => {
    CookieSourceScheme2["Unset"] = "Unset";
    CookieSourceScheme2["NonSecure"] = "NonSecure";
    CookieSourceScheme2["Secure"] = "Secure";
  })(CookieSourceScheme = Network2.CookieSourceScheme || (Network2.CookieSourceScheme = {}));
  let ResourcePriority;
  ((ResourcePriority2) => {
    ResourcePriority2["VeryLow"] = "VeryLow";
    ResourcePriority2["Low"] = "Low";
    ResourcePriority2["Medium"] = "Medium";
    ResourcePriority2["High"] = "High";
    ResourcePriority2["VeryHigh"] = "VeryHigh";
  })(ResourcePriority = Network2.ResourcePriority || (Network2.ResourcePriority = {}));
  let RenderBlockingBehavior;
  ((RenderBlockingBehavior2) => {
    RenderBlockingBehavior2["Blocking"] = "Blocking";
    RenderBlockingBehavior2["InBodyParserBlocking"] = "InBodyParserBlocking";
    RenderBlockingBehavior2["NonBlocking"] = "NonBlocking";
    RenderBlockingBehavior2["NonBlockingDynamic"] = "NonBlockingDynamic";
    RenderBlockingBehavior2["PotentiallyBlocking"] = "PotentiallyBlocking";
  })(RenderBlockingBehavior = Network2.RenderBlockingBehavior || (Network2.RenderBlockingBehavior = {}));
  let RequestReferrerPolicy;
  ((RequestReferrerPolicy2) => {
    RequestReferrerPolicy2["UnsafeUrl"] = "unsafe-url";
    RequestReferrerPolicy2["NoReferrerWhenDowngrade"] = "no-referrer-when-downgrade";
    RequestReferrerPolicy2["NoReferrer"] = "no-referrer";
    RequestReferrerPolicy2["Origin"] = "origin";
    RequestReferrerPolicy2["OriginWhenCrossOrigin"] = "origin-when-cross-origin";
    RequestReferrerPolicy2["SameOrigin"] = "same-origin";
    RequestReferrerPolicy2["StrictOrigin"] = "strict-origin";
    RequestReferrerPolicy2["StrictOriginWhenCrossOrigin"] = "strict-origin-when-cross-origin";
  })(RequestReferrerPolicy = Network2.RequestReferrerPolicy || (Network2.RequestReferrerPolicy = {}));
  let CertificateTransparencyCompliance;
  ((CertificateTransparencyCompliance2) => {
    CertificateTransparencyCompliance2["Unknown"] = "unknown";
    CertificateTransparencyCompliance2["NotCompliant"] = "not-compliant";
    CertificateTransparencyCompliance2["Compliant"] = "compliant";
  })(CertificateTransparencyCompliance = Network2.CertificateTransparencyCompliance || (Network2.CertificateTransparencyCompliance = {}));
  let BlockedReason;
  ((BlockedReason2) => {
    BlockedReason2["Other"] = "other";
    BlockedReason2["Csp"] = "csp";
    BlockedReason2["MixedContent"] = "mixed-content";
    BlockedReason2["Origin"] = "origin";
    BlockedReason2["Inspector"] = "inspector";
    BlockedReason2["Integrity"] = "integrity";
    BlockedReason2["SubresourceFilter"] = "subresource-filter";
    BlockedReason2["ContentType"] = "content-type";
    BlockedReason2["CoepFrameResourceNeedsCoepHeader"] = "coep-frame-resource-needs-coep-header";
    BlockedReason2["CoopSandboxedIframeCannotNavigateToCoopPage"] = "coop-sandboxed-iframe-cannot-navigate-to-coop-page";
    BlockedReason2["CorpNotSameOrigin"] = "corp-not-same-origin";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-coep";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByDip"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-dip";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-coep-and-dip";
    BlockedReason2["CorpNotSameSite"] = "corp-not-same-site";
    BlockedReason2["SriMessageSignatureMismatch"] = "sri-message-signature-mismatch";
  })(BlockedReason = Network2.BlockedReason || (Network2.BlockedReason = {}));
  let CorsError;
  ((CorsError2) => {
    CorsError2["DisallowedByMode"] = "DisallowedByMode";
    CorsError2["InvalidResponse"] = "InvalidResponse";
    CorsError2["WildcardOriginNotAllowed"] = "WildcardOriginNotAllowed";
    CorsError2["MissingAllowOriginHeader"] = "MissingAllowOriginHeader";
    CorsError2["MultipleAllowOriginValues"] = "MultipleAllowOriginValues";
    CorsError2["InvalidAllowOriginValue"] = "InvalidAllowOriginValue";
    CorsError2["AllowOriginMismatch"] = "AllowOriginMismatch";
    CorsError2["InvalidAllowCredentials"] = "InvalidAllowCredentials";
    CorsError2["CorsDisabledScheme"] = "CorsDisabledScheme";
    CorsError2["PreflightInvalidStatus"] = "PreflightInvalidStatus";
    CorsError2["PreflightDisallowedRedirect"] = "PreflightDisallowedRedirect";
    CorsError2["PreflightWildcardOriginNotAllowed"] = "PreflightWildcardOriginNotAllowed";
    CorsError2["PreflightMissingAllowOriginHeader"] = "PreflightMissingAllowOriginHeader";
    CorsError2["PreflightMultipleAllowOriginValues"] = "PreflightMultipleAllowOriginValues";
    CorsError2["PreflightInvalidAllowOriginValue"] = "PreflightInvalidAllowOriginValue";
    CorsError2["PreflightAllowOriginMismatch"] = "PreflightAllowOriginMismatch";
    CorsError2["PreflightInvalidAllowCredentials"] = "PreflightInvalidAllowCredentials";
    CorsError2["PreflightMissingAllowExternal"] = "PreflightMissingAllowExternal";
    CorsError2["PreflightInvalidAllowExternal"] = "PreflightInvalidAllowExternal";
    CorsError2["InvalidAllowMethodsPreflightResponse"] = "InvalidAllowMethodsPreflightResponse";
    CorsError2["InvalidAllowHeadersPreflightResponse"] = "InvalidAllowHeadersPreflightResponse";
    CorsError2["MethodDisallowedByPreflightResponse"] = "MethodDisallowedByPreflightResponse";
    CorsError2["HeaderDisallowedByPreflightResponse"] = "HeaderDisallowedByPreflightResponse";
    CorsError2["RedirectContainsCredentials"] = "RedirectContainsCredentials";
    CorsError2["InsecureLocalNetwork"] = "InsecureLocalNetwork";
    CorsError2["InvalidLocalNetworkAccess"] = "InvalidLocalNetworkAccess";
    CorsError2["NoCorsRedirectModeNotFollow"] = "NoCorsRedirectModeNotFollow";
    CorsError2["LocalNetworkAccessPermissionDenied"] = "LocalNetworkAccessPermissionDenied";
  })(CorsError = Network2.CorsError || (Network2.CorsError = {}));
  let ServiceWorkerResponseSource;
  ((ServiceWorkerResponseSource2) => {
    ServiceWorkerResponseSource2["CacheStorage"] = "cache-storage";
    ServiceWorkerResponseSource2["HttpCache"] = "http-cache";
    ServiceWorkerResponseSource2["FallbackCode"] = "fallback-code";
    ServiceWorkerResponseSource2["Network"] = "network";
  })(ServiceWorkerResponseSource = Network2.ServiceWorkerResponseSource || (Network2.ServiceWorkerResponseSource = {}));
  let TrustTokenParamsRefreshPolicy;
  ((TrustTokenParamsRefreshPolicy2) => {
    TrustTokenParamsRefreshPolicy2["UseCached"] = "UseCached";
    TrustTokenParamsRefreshPolicy2["Refresh"] = "Refresh";
  })(TrustTokenParamsRefreshPolicy = Network2.TrustTokenParamsRefreshPolicy || (Network2.TrustTokenParamsRefreshPolicy = {}));
  let TrustTokenOperationType;
  ((TrustTokenOperationType2) => {
    TrustTokenOperationType2["Issuance"] = "Issuance";
    TrustTokenOperationType2["Redemption"] = "Redemption";
    TrustTokenOperationType2["Signing"] = "Signing";
  })(TrustTokenOperationType = Network2.TrustTokenOperationType || (Network2.TrustTokenOperationType = {}));
  let AlternateProtocolUsage;
  ((AlternateProtocolUsage2) => {
    AlternateProtocolUsage2["AlternativeJobWonWithoutRace"] = "alternativeJobWonWithoutRace";
    AlternateProtocolUsage2["AlternativeJobWonRace"] = "alternativeJobWonRace";
    AlternateProtocolUsage2["MainJobWonRace"] = "mainJobWonRace";
    AlternateProtocolUsage2["MappingMissing"] = "mappingMissing";
    AlternateProtocolUsage2["Broken"] = "broken";
    AlternateProtocolUsage2["DnsAlpnH3JobWonWithoutRace"] = "dnsAlpnH3JobWonWithoutRace";
    AlternateProtocolUsage2["DnsAlpnH3JobWonRace"] = "dnsAlpnH3JobWonRace";
    AlternateProtocolUsage2["UnspecifiedReason"] = "unspecifiedReason";
  })(AlternateProtocolUsage = Network2.AlternateProtocolUsage || (Network2.AlternateProtocolUsage = {}));
  let ServiceWorkerRouterSource;
  ((ServiceWorkerRouterSource2) => {
    ServiceWorkerRouterSource2["Network"] = "network";
    ServiceWorkerRouterSource2["Cache"] = "cache";
    ServiceWorkerRouterSource2["FetchEvent"] = "fetch-event";
    ServiceWorkerRouterSource2["RaceNetworkAndFetchHandler"] = "race-network-and-fetch-handler";
    ServiceWorkerRouterSource2["RaceNetworkAndCache"] = "race-network-and-cache";
  })(ServiceWorkerRouterSource = Network2.ServiceWorkerRouterSource || (Network2.ServiceWorkerRouterSource = {}));
  let InitiatorType;
  ((InitiatorType2) => {
    InitiatorType2["Parser"] = "parser";
    InitiatorType2["Script"] = "script";
    InitiatorType2["Preload"] = "preload";
    InitiatorType2["SignedExchange"] = "SignedExchange";
    InitiatorType2["Preflight"] = "preflight";
    InitiatorType2["FedCM"] = "FedCM";
    InitiatorType2["Other"] = "other";
  })(InitiatorType = Network2.InitiatorType || (Network2.InitiatorType = {}));
  let SetCookieBlockedReason;
  ((SetCookieBlockedReason2) => {
    SetCookieBlockedReason2["SecureOnly"] = "SecureOnly";
    SetCookieBlockedReason2["SameSiteStrict"] = "SameSiteStrict";
    SetCookieBlockedReason2["SameSiteLax"] = "SameSiteLax";
    SetCookieBlockedReason2["SameSiteUnspecifiedTreatedAsLax"] = "SameSiteUnspecifiedTreatedAsLax";
    SetCookieBlockedReason2["SameSiteNoneInsecure"] = "SameSiteNoneInsecure";
    SetCookieBlockedReason2["UserPreferences"] = "UserPreferences";
    SetCookieBlockedReason2["ThirdPartyPhaseout"] = "ThirdPartyPhaseout";
    SetCookieBlockedReason2["ThirdPartyBlockedInFirstPartySet"] = "ThirdPartyBlockedInFirstPartySet";
    SetCookieBlockedReason2["SyntaxError"] = "SyntaxError";
    SetCookieBlockedReason2["SchemeNotSupported"] = "SchemeNotSupported";
    SetCookieBlockedReason2["OverwriteSecure"] = "OverwriteSecure";
    SetCookieBlockedReason2["InvalidDomain"] = "InvalidDomain";
    SetCookieBlockedReason2["InvalidPrefix"] = "InvalidPrefix";
    SetCookieBlockedReason2["UnknownError"] = "UnknownError";
    SetCookieBlockedReason2["SchemefulSameSiteStrict"] = "SchemefulSameSiteStrict";
    SetCookieBlockedReason2["SchemefulSameSiteLax"] = "SchemefulSameSiteLax";
    SetCookieBlockedReason2["SchemefulSameSiteUnspecifiedTreatedAsLax"] = "SchemefulSameSiteUnspecifiedTreatedAsLax";
    SetCookieBlockedReason2["NameValuePairExceedsMaxSize"] = "NameValuePairExceedsMaxSize";
    SetCookieBlockedReason2["DisallowedCharacter"] = "DisallowedCharacter";
    SetCookieBlockedReason2["NoCookieContent"] = "NoCookieContent";
  })(SetCookieBlockedReason = Network2.SetCookieBlockedReason || (Network2.SetCookieBlockedReason = {}));
  let CookieBlockedReason;
  ((CookieBlockedReason2) => {
    CookieBlockedReason2["SecureOnly"] = "SecureOnly";
    CookieBlockedReason2["NotOnPath"] = "NotOnPath";
    CookieBlockedReason2["DomainMismatch"] = "DomainMismatch";
    CookieBlockedReason2["SameSiteStrict"] = "SameSiteStrict";
    CookieBlockedReason2["SameSiteLax"] = "SameSiteLax";
    CookieBlockedReason2["SameSiteUnspecifiedTreatedAsLax"] = "SameSiteUnspecifiedTreatedAsLax";
    CookieBlockedReason2["SameSiteNoneInsecure"] = "SameSiteNoneInsecure";
    CookieBlockedReason2["UserPreferences"] = "UserPreferences";
    CookieBlockedReason2["ThirdPartyPhaseout"] = "ThirdPartyPhaseout";
    CookieBlockedReason2["ThirdPartyBlockedInFirstPartySet"] = "ThirdPartyBlockedInFirstPartySet";
    CookieBlockedReason2["UnknownError"] = "UnknownError";
    CookieBlockedReason2["SchemefulSameSiteStrict"] = "SchemefulSameSiteStrict";
    CookieBlockedReason2["SchemefulSameSiteLax"] = "SchemefulSameSiteLax";
    CookieBlockedReason2["SchemefulSameSiteUnspecifiedTreatedAsLax"] = "SchemefulSameSiteUnspecifiedTreatedAsLax";
    CookieBlockedReason2["NameValuePairExceedsMaxSize"] = "NameValuePairExceedsMaxSize";
    CookieBlockedReason2["PortMismatch"] = "PortMismatch";
    CookieBlockedReason2["SchemeMismatch"] = "SchemeMismatch";
    CookieBlockedReason2["AnonymousContext"] = "AnonymousContext";
  })(CookieBlockedReason = Network2.CookieBlockedReason || (Network2.CookieBlockedReason = {}));
  let CookieExemptionReason;
  ((CookieExemptionReason2) => {
    CookieExemptionReason2["None"] = "None";
    CookieExemptionReason2["UserSetting"] = "UserSetting";
    CookieExemptionReason2["EnterprisePolicy"] = "EnterprisePolicy";
    CookieExemptionReason2["StorageAccess"] = "StorageAccess";
    CookieExemptionReason2["TopLevelStorageAccess"] = "TopLevelStorageAccess";
    CookieExemptionReason2["Scheme"] = "Scheme";
    CookieExemptionReason2["SameSiteNoneCookiesInSandbox"] = "SameSiteNoneCookiesInSandbox";
  })(CookieExemptionReason = Network2.CookieExemptionReason || (Network2.CookieExemptionReason = {}));
  let AuthChallengeSource;
  ((AuthChallengeSource2) => {
    AuthChallengeSource2["Server"] = "Server";
    AuthChallengeSource2["Proxy"] = "Proxy";
  })(AuthChallengeSource = Network2.AuthChallengeSource || (Network2.AuthChallengeSource = {}));
  let AuthChallengeResponseResponse;
  ((AuthChallengeResponseResponse2) => {
    AuthChallengeResponseResponse2["Default"] = "Default";
    AuthChallengeResponseResponse2["CancelAuth"] = "CancelAuth";
    AuthChallengeResponseResponse2["ProvideCredentials"] = "ProvideCredentials";
  })(AuthChallengeResponseResponse = Network2.AuthChallengeResponseResponse || (Network2.AuthChallengeResponseResponse = {}));
  let SignedExchangeErrorField;
  ((SignedExchangeErrorField2) => {
    SignedExchangeErrorField2["SignatureSig"] = "signatureSig";
    SignedExchangeErrorField2["SignatureIntegrity"] = "signatureIntegrity";
    SignedExchangeErrorField2["SignatureCertUrl"] = "signatureCertUrl";
    SignedExchangeErrorField2["SignatureCertSha256"] = "signatureCertSha256";
    SignedExchangeErrorField2["SignatureValidityUrl"] = "signatureValidityUrl";
    SignedExchangeErrorField2["SignatureTimestamps"] = "signatureTimestamps";
  })(SignedExchangeErrorField = Network2.SignedExchangeErrorField || (Network2.SignedExchangeErrorField = {}));
  let DirectSocketDnsQueryType;
  ((DirectSocketDnsQueryType2) => {
    DirectSocketDnsQueryType2["Ipv4"] = "ipv4";
    DirectSocketDnsQueryType2["Ipv6"] = "ipv6";
  })(DirectSocketDnsQueryType = Network2.DirectSocketDnsQueryType || (Network2.DirectSocketDnsQueryType = {}));
  let LocalNetworkAccessRequestPolicy;
  ((LocalNetworkAccessRequestPolicy2) => {
    LocalNetworkAccessRequestPolicy2["Allow"] = "Allow";
    LocalNetworkAccessRequestPolicy2["BlockFromInsecureToMorePrivate"] = "BlockFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["WarnFromInsecureToMorePrivate"] = "WarnFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["PermissionBlock"] = "PermissionBlock";
    LocalNetworkAccessRequestPolicy2["PermissionWarn"] = "PermissionWarn";
  })(LocalNetworkAccessRequestPolicy = Network2.LocalNetworkAccessRequestPolicy || (Network2.LocalNetworkAccessRequestPolicy = {}));
  let IPAddressSpace;
  ((IPAddressSpace2) => {
    IPAddressSpace2["Loopback"] = "Loopback";
    IPAddressSpace2["Local"] = "Local";
    IPAddressSpace2["Public"] = "Public";
    IPAddressSpace2["Unknown"] = "Unknown";
  })(IPAddressSpace = Network2.IPAddressSpace || (Network2.IPAddressSpace = {}));
  let CrossOriginOpenerPolicyValue;
  ((CrossOriginOpenerPolicyValue2) => {
    CrossOriginOpenerPolicyValue2["SameOrigin"] = "SameOrigin";
    CrossOriginOpenerPolicyValue2["SameOriginAllowPopups"] = "SameOriginAllowPopups";
    CrossOriginOpenerPolicyValue2["RestrictProperties"] = "RestrictProperties";
    CrossOriginOpenerPolicyValue2["UnsafeNone"] = "UnsafeNone";
    CrossOriginOpenerPolicyValue2["SameOriginPlusCoep"] = "SameOriginPlusCoep";
    CrossOriginOpenerPolicyValue2["RestrictPropertiesPlusCoep"] = "RestrictPropertiesPlusCoep";
    CrossOriginOpenerPolicyValue2["NoopenerAllowPopups"] = "NoopenerAllowPopups";
  })(CrossOriginOpenerPolicyValue = Network2.CrossOriginOpenerPolicyValue || (Network2.CrossOriginOpenerPolicyValue = {}));
  let CrossOriginEmbedderPolicyValue;
  ((CrossOriginEmbedderPolicyValue2) => {
    CrossOriginEmbedderPolicyValue2["None"] = "None";
    CrossOriginEmbedderPolicyValue2["Credentialless"] = "Credentialless";
    CrossOriginEmbedderPolicyValue2["RequireCorp"] = "RequireCorp";
  })(CrossOriginEmbedderPolicyValue = Network2.CrossOriginEmbedderPolicyValue || (Network2.CrossOriginEmbedderPolicyValue = {}));
  let ContentSecurityPolicySource;
  ((ContentSecurityPolicySource2) => {
    ContentSecurityPolicySource2["HTTP"] = "HTTP";
    ContentSecurityPolicySource2["Meta"] = "Meta";
  })(ContentSecurityPolicySource = Network2.ContentSecurityPolicySource || (Network2.ContentSecurityPolicySource = {}));
  let ReportStatus;
  ((ReportStatus2) => {
    ReportStatus2["Queued"] = "Queued";
    ReportStatus2["Pending"] = "Pending";
    ReportStatus2["MarkedForRemoval"] = "MarkedForRemoval";
    ReportStatus2["Success"] = "Success";
  })(ReportStatus = Network2.ReportStatus || (Network2.ReportStatus = {}));
  let DeviceBoundSessionWithUsageUsage;
  ((DeviceBoundSessionWithUsageUsage2) => {
    DeviceBoundSessionWithUsageUsage2["NotInScope"] = "NotInScope";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotYetNeeded"] = "InScopeRefreshNotYetNeeded";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotAllowed"] = "InScopeRefreshNotAllowed";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshNotPossible"] = "ProactiveRefreshNotPossible";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshAttempted"] = "ProactiveRefreshAttempted";
    DeviceBoundSessionWithUsageUsage2["Deferred"] = "Deferred";
  })(DeviceBoundSessionWithUsageUsage = Network2.DeviceBoundSessionWithUsageUsage || (Network2.DeviceBoundSessionWithUsageUsage = {}));
  let DeviceBoundSessionUrlRuleRuleType;
  ((DeviceBoundSessionUrlRuleRuleType2) => {
    DeviceBoundSessionUrlRuleRuleType2["Exclude"] = "Exclude";
    DeviceBoundSessionUrlRuleRuleType2["Include"] = "Include";
  })(DeviceBoundSessionUrlRuleRuleType = Network2.DeviceBoundSessionUrlRuleRuleType || (Network2.DeviceBoundSessionUrlRuleRuleType = {}));
  let DeviceBoundSessionFetchResult;
  ((DeviceBoundSessionFetchResult2) => {
    DeviceBoundSessionFetchResult2["Success"] = "Success";
    DeviceBoundSessionFetchResult2["SigningKeyGenerationError"] = "SigningKeyGenerationError";
    DeviceBoundSessionFetchResult2["AttestationKeyGenerationError"] = "AttestationKeyGenerationError";
    DeviceBoundSessionFetchResult2["SigningError"] = "SigningError";
    DeviceBoundSessionFetchResult2["TransientSigningError"] = "TransientSigningError";
    DeviceBoundSessionFetchResult2["ServerRequestedTermination"] = "ServerRequestedTermination";
    DeviceBoundSessionFetchResult2["InvalidSessionId"] = "InvalidSessionId";
    DeviceBoundSessionFetchResult2["InvalidChallenge"] = "InvalidChallenge";
    DeviceBoundSessionFetchResult2["TooManyChallenges"] = "TooManyChallenges";
    DeviceBoundSessionFetchResult2["InvalidFetcherUrl"] = "InvalidFetcherUrl";
    DeviceBoundSessionFetchResult2["InvalidRefreshUrl"] = "InvalidRefreshUrl";
    DeviceBoundSessionFetchResult2["TransientHttpError"] = "TransientHttpError";
    DeviceBoundSessionFetchResult2["ScopeOriginSameSiteMismatch"] = "ScopeOriginSameSiteMismatch";
    DeviceBoundSessionFetchResult2["RefreshUrlSameSiteMismatch"] = "RefreshUrlSameSiteMismatch";
    DeviceBoundSessionFetchResult2["MismatchedSessionId"] = "MismatchedSessionId";
    DeviceBoundSessionFetchResult2["MissingScope"] = "MissingScope";
    DeviceBoundSessionFetchResult2["NoCredentials"] = "NoCredentials";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationWellKnownUnavailable"] = "SubdomainRegistrationWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationUnauthorized"] = "SubdomainRegistrationUnauthorized";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationWellKnownMalformed"] = "SubdomainRegistrationWellKnownMalformed";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownUnavailable"] = "SessionProviderWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownUnavailable"] = "RelyingPartyWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["FederatedKeyThumbprintMismatch"] = "FederatedKeyThumbprintMismatch";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionUrl"] = "InvalidFederatedSessionUrl";
    DeviceBoundSessionFetchResult2["InvalidFederatedKey"] = "InvalidFederatedKey";
    DeviceBoundSessionFetchResult2["TooManyRelyingOriginLabels"] = "TooManyRelyingOriginLabels";
    DeviceBoundSessionFetchResult2["BoundCookieSetForbidden"] = "BoundCookieSetForbidden";
    DeviceBoundSessionFetchResult2["NetError"] = "NetError";
    DeviceBoundSessionFetchResult2["ProxyError"] = "ProxyError";
    DeviceBoundSessionFetchResult2["EmptySessionConfig"] = "EmptySessionConfig";
    DeviceBoundSessionFetchResult2["InvalidCredentialsConfig"] = "InvalidCredentialsConfig";
    DeviceBoundSessionFetchResult2["InvalidCredentialsType"] = "InvalidCredentialsType";
    DeviceBoundSessionFetchResult2["InvalidCredentialsEmptyName"] = "InvalidCredentialsEmptyName";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookie"] = "InvalidCredentialsCookie";
    DeviceBoundSessionFetchResult2["PersistentHttpError"] = "PersistentHttpError";
    DeviceBoundSessionFetchResult2["RegistrationAttemptedChallenge"] = "RegistrationAttemptedChallenge";
    DeviceBoundSessionFetchResult2["InvalidScopeOrigin"] = "InvalidScopeOrigin";
    DeviceBoundSessionFetchResult2["ScopeOriginContainsPath"] = "ScopeOriginContainsPath";
    DeviceBoundSessionFetchResult2["RefreshInitiatorNotString"] = "RefreshInitiatorNotString";
    DeviceBoundSessionFetchResult2["RefreshInitiatorInvalidHostPattern"] = "RefreshInitiatorInvalidHostPattern";
    DeviceBoundSessionFetchResult2["InvalidScopeSpecification"] = "InvalidScopeSpecification";
    DeviceBoundSessionFetchResult2["MissingScopeSpecificationType"] = "MissingScopeSpecificationType";
    DeviceBoundSessionFetchResult2["EmptyScopeSpecificationDomain"] = "EmptyScopeSpecificationDomain";
    DeviceBoundSessionFetchResult2["EmptyScopeSpecificationPath"] = "EmptyScopeSpecificationPath";
    DeviceBoundSessionFetchResult2["InvalidScopeSpecificationType"] = "InvalidScopeSpecificationType";
    DeviceBoundSessionFetchResult2["InvalidScopeIncludeSite"] = "InvalidScopeIncludeSite";
    DeviceBoundSessionFetchResult2["MissingScopeIncludeSite"] = "MissingScopeIncludeSite";
    DeviceBoundSessionFetchResult2["FederatedNotAuthorizedByProvider"] = "FederatedNotAuthorizedByProvider";
    DeviceBoundSessionFetchResult2["FederatedNotAuthorizedByRelyingParty"] = "FederatedNotAuthorizedByRelyingParty";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownMalformed"] = "SessionProviderWellKnownMalformed";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownHasProviderOrigin"] = "SessionProviderWellKnownHasProviderOrigin";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownMalformed"] = "RelyingPartyWellKnownMalformed";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownHasRelyingOrigins"] = "RelyingPartyWellKnownHasRelyingOrigins";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionProviderSessionMissing"] = "InvalidFederatedSessionProviderSessionMissing";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionWrongProviderOrigin"] = "InvalidFederatedSessionWrongProviderOrigin";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieCreationTime"] = "InvalidCredentialsCookieCreationTime";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieName"] = "InvalidCredentialsCookieName";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieParsing"] = "InvalidCredentialsCookieParsing";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieUnpermittedAttribute"] = "InvalidCredentialsCookieUnpermittedAttribute";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieInvalidDomain"] = "InvalidCredentialsCookieInvalidDomain";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookiePrefix"] = "InvalidCredentialsCookiePrefix";
    DeviceBoundSessionFetchResult2["InvalidScopeRulePath"] = "InvalidScopeRulePath";
    DeviceBoundSessionFetchResult2["InvalidScopeRuleHostPattern"] = "InvalidScopeRuleHostPattern";
    DeviceBoundSessionFetchResult2["ScopeRuleOriginScopedHostPatternMismatch"] = "ScopeRuleOriginScopedHostPatternMismatch";
    DeviceBoundSessionFetchResult2["ScopeRuleSiteScopedHostPatternMismatch"] = "ScopeRuleSiteScopedHostPatternMismatch";
    DeviceBoundSessionFetchResult2["SigningQuotaExceeded"] = "SigningQuotaExceeded";
    DeviceBoundSessionFetchResult2["InvalidConfigJson"] = "InvalidConfigJson";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionProviderFailedToRestoreKey"] = "InvalidFederatedSessionProviderFailedToRestoreKey";
    DeviceBoundSessionFetchResult2["FailedToUnwrapKey"] = "FailedToUnwrapKey";
    DeviceBoundSessionFetchResult2["SessionDeletedDuringRefresh"] = "SessionDeletedDuringRefresh";
    DeviceBoundSessionFetchResult2["CrossOriginRegistrationSiteNotIncluded"] = "CrossOriginRegistrationSiteNotIncluded";
    DeviceBoundSessionFetchResult2["InvalidPreProvisionedKeyInitiatorMissing"] = "InvalidPreProvisionedKeyInitiatorMissing";
    DeviceBoundSessionFetchResult2["PreProvisionedKeyAccessNotGranted"] = "PreProvisionedKeyAccessNotGranted";
    DeviceBoundSessionFetchResult2["PreProvisionedKeyNotFound"] = "PreProvisionedKeyNotFound";
    DeviceBoundSessionFetchResult2["AttestationCertificationError"] = "AttestationCertificationError";
    DeviceBoundSessionFetchResult2["AttestationSigningError"] = "AttestationSigningError";
  })(DeviceBoundSessionFetchResult = Network2.DeviceBoundSessionFetchResult || (Network2.DeviceBoundSessionFetchResult = {}));
  let RefreshEventDetailsRefreshResult;
  ((RefreshEventDetailsRefreshResult2) => {
    RefreshEventDetailsRefreshResult2["Refreshed"] = "Refreshed";
    RefreshEventDetailsRefreshResult2["InitializedService"] = "InitializedService";
    RefreshEventDetailsRefreshResult2["Unreachable"] = "Unreachable";
    RefreshEventDetailsRefreshResult2["ServerError"] = "ServerError";
    RefreshEventDetailsRefreshResult2["FatalError"] = "FatalError";
    RefreshEventDetailsRefreshResult2["SigningQuotaExceeded"] = "SigningQuotaExceeded";
    RefreshEventDetailsRefreshResult2["RefreshedAsWaiter"] = "RefreshedAsWaiter";
    RefreshEventDetailsRefreshResult2["TransientSigningError"] = "TransientSigningError";
    RefreshEventDetailsRefreshResult2["InScopeRefreshNotYetNeeded"] = "InScopeRefreshNotYetNeeded";
  })(RefreshEventDetailsRefreshResult = Network2.RefreshEventDetailsRefreshResult || (Network2.RefreshEventDetailsRefreshResult = {}));
  let TerminationEventDetailsDeletionReason;
  ((TerminationEventDetailsDeletionReason2) => {
    TerminationEventDetailsDeletionReason2["Expired"] = "Expired";
    TerminationEventDetailsDeletionReason2["FailedToRestoreKey"] = "FailedToRestoreKey";
    TerminationEventDetailsDeletionReason2["FailedToUnwrapKey"] = "FailedToUnwrapKey";
    TerminationEventDetailsDeletionReason2["StoragePartitionCleared"] = "StoragePartitionCleared";
    TerminationEventDetailsDeletionReason2["ClearBrowsingData"] = "ClearBrowsingData";
    TerminationEventDetailsDeletionReason2["ServerRequested"] = "ServerRequested";
    TerminationEventDetailsDeletionReason2["InvalidSessionParams"] = "InvalidSessionParams";
    TerminationEventDetailsDeletionReason2["RefreshFatalError"] = "RefreshFatalError";
    TerminationEventDetailsDeletionReason2["DevTools"] = "DevTools";
  })(TerminationEventDetailsDeletionReason = Network2.TerminationEventDetailsDeletionReason || (Network2.TerminationEventDetailsDeletionReason = {}));
  let ChallengeEventDetailsChallengeResult;
  ((ChallengeEventDetailsChallengeResult2) => {
    ChallengeEventDetailsChallengeResult2["Success"] = "Success";
    ChallengeEventDetailsChallengeResult2["NoSessionId"] = "NoSessionId";
    ChallengeEventDetailsChallengeResult2["NoSessionMatch"] = "NoSessionMatch";
    ChallengeEventDetailsChallengeResult2["CantSetBoundCookie"] = "CantSetBoundCookie";
  })(ChallengeEventDetailsChallengeResult = Network2.ChallengeEventDetailsChallengeResult || (Network2.ChallengeEventDetailsChallengeResult = {}));
  let TrustTokenOperationDoneEventStatus;
  ((TrustTokenOperationDoneEventStatus2) => {
    TrustTokenOperationDoneEventStatus2["Ok"] = "Ok";
    TrustTokenOperationDoneEventStatus2["InvalidArgument"] = "InvalidArgument";
    TrustTokenOperationDoneEventStatus2["MissingIssuerKeys"] = "MissingIssuerKeys";
    TrustTokenOperationDoneEventStatus2["FailedPrecondition"] = "FailedPrecondition";
    TrustTokenOperationDoneEventStatus2["ResourceExhausted"] = "ResourceExhausted";
    TrustTokenOperationDoneEventStatus2["AlreadyExists"] = "AlreadyExists";
    TrustTokenOperationDoneEventStatus2["ResourceLimited"] = "ResourceLimited";
    TrustTokenOperationDoneEventStatus2["Unauthorized"] = "Unauthorized";
    TrustTokenOperationDoneEventStatus2["BadResponse"] = "BadResponse";
    TrustTokenOperationDoneEventStatus2["InternalError"] = "InternalError";
    TrustTokenOperationDoneEventStatus2["UnknownError"] = "UnknownError";
    TrustTokenOperationDoneEventStatus2["FulfilledLocally"] = "FulfilledLocally";
    TrustTokenOperationDoneEventStatus2["SiteIssuerLimit"] = "SiteIssuerLimit";
  })(TrustTokenOperationDoneEventStatus = Network2.TrustTokenOperationDoneEventStatus || (Network2.TrustTokenOperationDoneEventStatus = {}));
})(Network || (Network = {}));
var Overlay;
((Overlay2) => {
  let LineStylePattern;
  ((LineStylePattern2) => {
    LineStylePattern2["Dashed"] = "dashed";
    LineStylePattern2["Dotted"] = "dotted";
  })(LineStylePattern = Overlay2.LineStylePattern || (Overlay2.LineStylePattern = {}));
  let ContrastAlgorithm;
  ((ContrastAlgorithm2) => {
    ContrastAlgorithm2["Aa"] = "aa";
    ContrastAlgorithm2["Aaa"] = "aaa";
    ContrastAlgorithm2["Apca"] = "apca";
  })(ContrastAlgorithm = Overlay2.ContrastAlgorithm || (Overlay2.ContrastAlgorithm = {}));
  let ColorFormat;
  ((ColorFormat2) => {
    ColorFormat2["Rgb"] = "rgb";
    ColorFormat2["Hsl"] = "hsl";
    ColorFormat2["Hwb"] = "hwb";
    ColorFormat2["Hex"] = "hex";
  })(ColorFormat = Overlay2.ColorFormat || (Overlay2.ColorFormat = {}));
  let DisplayCutoutShape;
  ((DisplayCutoutShape2) => {
    DisplayCutoutShape2["Pill"] = "pill";
    DisplayCutoutShape2["Notch"] = "notch";
    DisplayCutoutShape2["Circle"] = "circle";
    DisplayCutoutShape2["Rectangle"] = "rectangle";
  })(DisplayCutoutShape = Overlay2.DisplayCutoutShape || (Overlay2.DisplayCutoutShape = {}));
  let InspectMode;
  ((InspectMode2) => {
    InspectMode2["SearchForNode"] = "searchForNode";
    InspectMode2["SearchForUAShadowDOM"] = "searchForUAShadowDOM";
    InspectMode2["CaptureAreaScreenshot"] = "captureAreaScreenshot";
    InspectMode2["None"] = "none";
  })(InspectMode = Overlay2.InspectMode || (Overlay2.InspectMode = {}));
})(Overlay || (Overlay = {}));
var PWA;
((PWA2) => {
  let DisplayMode;
  ((DisplayMode2) => {
    DisplayMode2["Standalone"] = "standalone";
    DisplayMode2["Browser"] = "browser";
  })(DisplayMode = PWA2.DisplayMode || (PWA2.DisplayMode = {}));
})(PWA || (PWA = {}));
var Page;
((Page2) => {
  let AdFrameType;
  ((AdFrameType2) => {
    AdFrameType2["None"] = "none";
    AdFrameType2["Child"] = "child";
    AdFrameType2["Root"] = "root";
  })(AdFrameType = Page2.AdFrameType || (Page2.AdFrameType = {}));
  let AdFrameExplanation;
  ((AdFrameExplanation2) => {
    AdFrameExplanation2["ParentIsAd"] = "ParentIsAd";
    AdFrameExplanation2["CreatedByAdScript"] = "CreatedByAdScript";
    AdFrameExplanation2["MatchedBlockingRule"] = "MatchedBlockingRule";
  })(AdFrameExplanation = Page2.AdFrameExplanation || (Page2.AdFrameExplanation = {}));
  let SecureContextType;
  ((SecureContextType2) => {
    SecureContextType2["Secure"] = "Secure";
    SecureContextType2["SecureLocalhost"] = "SecureLocalhost";
    SecureContextType2["InsecureScheme"] = "InsecureScheme";
    SecureContextType2["InsecureAncestor"] = "InsecureAncestor";
  })(SecureContextType = Page2.SecureContextType || (Page2.SecureContextType = {}));
  let CrossOriginIsolatedContextType;
  ((CrossOriginIsolatedContextType2) => {
    CrossOriginIsolatedContextType2["Isolated"] = "Isolated";
    CrossOriginIsolatedContextType2["NotIsolated"] = "NotIsolated";
    CrossOriginIsolatedContextType2["NotIsolatedFeatureDisabled"] = "NotIsolatedFeatureDisabled";
  })(CrossOriginIsolatedContextType = Page2.CrossOriginIsolatedContextType || (Page2.CrossOriginIsolatedContextType = {}));
  let GatedAPIFeatures;
  ((GatedAPIFeatures2) => {
    GatedAPIFeatures2["SharedArrayBuffers"] = "SharedArrayBuffers";
    GatedAPIFeatures2["SharedArrayBuffersTransferAllowed"] = "SharedArrayBuffersTransferAllowed";
    GatedAPIFeatures2["PerformanceMeasureMemory"] = "PerformanceMeasureMemory";
    GatedAPIFeatures2["PerformanceProfile"] = "PerformanceProfile";
  })(GatedAPIFeatures = Page2.GatedAPIFeatures || (Page2.GatedAPIFeatures = {}));
  let PermissionsPolicyFeature;
  ((PermissionsPolicyFeature2) => {
    PermissionsPolicyFeature2["Accelerometer"] = "accelerometer";
    PermissionsPolicyFeature2["AllScreensCapture"] = "all-screens-capture";
    PermissionsPolicyFeature2["AmbientLightSensor"] = "ambient-light-sensor";
    PermissionsPolicyFeature2["AriaNotify"] = "aria-notify";
    PermissionsPolicyFeature2["Autofill"] = "autofill";
    PermissionsPolicyFeature2["Autoplay"] = "autoplay";
    PermissionsPolicyFeature2["Bluetooth"] = "bluetooth";
    PermissionsPolicyFeature2["BrowsingTopics"] = "browsing-topics";
    PermissionsPolicyFeature2["Camera"] = "camera";
    PermissionsPolicyFeature2["CapturedSurfaceControl"] = "captured-surface-control";
    PermissionsPolicyFeature2["ChDpr"] = "ch-dpr";
    PermissionsPolicyFeature2["ChDeviceMemory"] = "ch-device-memory";
    PermissionsPolicyFeature2["ChDownlink"] = "ch-downlink";
    PermissionsPolicyFeature2["ChEct"] = "ch-ect";
    PermissionsPolicyFeature2["ChPrefersColorScheme"] = "ch-prefers-color-scheme";
    PermissionsPolicyFeature2["ChPrefersReducedMotion"] = "ch-prefers-reduced-motion";
    PermissionsPolicyFeature2["ChPrefersReducedTransparency"] = "ch-prefers-reduced-transparency";
    PermissionsPolicyFeature2["ChRtt"] = "ch-rtt";
    PermissionsPolicyFeature2["ChSaveData"] = "ch-save-data";
    PermissionsPolicyFeature2["ChUa"] = "ch-ua";
    PermissionsPolicyFeature2["ChUaArch"] = "ch-ua-arch";
    PermissionsPolicyFeature2["ChUaBitness"] = "ch-ua-bitness";
    PermissionsPolicyFeature2["ChUaHighEntropyValues"] = "ch-ua-high-entropy-values";
    PermissionsPolicyFeature2["ChUaPlatform"] = "ch-ua-platform";
    PermissionsPolicyFeature2["ChUaModel"] = "ch-ua-model";
    PermissionsPolicyFeature2["ChUaMobile"] = "ch-ua-mobile";
    PermissionsPolicyFeature2["ChUaFormFactors"] = "ch-ua-form-factors";
    PermissionsPolicyFeature2["ChUaFullVersion"] = "ch-ua-full-version";
    PermissionsPolicyFeature2["ChUaFullVersionList"] = "ch-ua-full-version-list";
    PermissionsPolicyFeature2["ChUaPlatformVersion"] = "ch-ua-platform-version";
    PermissionsPolicyFeature2["ChUaWow64"] = "ch-ua-wow64";
    PermissionsPolicyFeature2["ChViewportHeight"] = "ch-viewport-height";
    PermissionsPolicyFeature2["ChViewportWidth"] = "ch-viewport-width";
    PermissionsPolicyFeature2["ChWidth"] = "ch-width";
    PermissionsPolicyFeature2["ClipboardRead"] = "clipboard-read";
    PermissionsPolicyFeature2["ClipboardWrite"] = "clipboard-write";
    PermissionsPolicyFeature2["ComputePressure"] = "compute-pressure";
    PermissionsPolicyFeature2["ControlledFrame"] = "controlled-frame";
    PermissionsPolicyFeature2["CrossOriginIsolated"] = "cross-origin-isolated";
    PermissionsPolicyFeature2["DeferredFetch"] = "deferred-fetch";
    PermissionsPolicyFeature2["DeferredFetchMinimal"] = "deferred-fetch-minimal";
    PermissionsPolicyFeature2["DeviceAttributes"] = "device-attributes";
    PermissionsPolicyFeature2["DigitalCredentialsCreate"] = "digital-credentials-create";
    PermissionsPolicyFeature2["DigitalCredentialsGet"] = "digital-credentials-get";
    PermissionsPolicyFeature2["DirectSockets"] = "direct-sockets";
    PermissionsPolicyFeature2["DirectSocketsMulticast"] = "direct-sockets-multicast";
    PermissionsPolicyFeature2["DisplayCapture"] = "display-capture";
    PermissionsPolicyFeature2["DocumentDomain"] = "document-domain";
    PermissionsPolicyFeature2["EncryptedMedia"] = "encrypted-media";
    PermissionsPolicyFeature2["ExecutionWhileOutOfViewport"] = "execution-while-out-of-viewport";
    PermissionsPolicyFeature2["ExecutionWhileNotRendered"] = "execution-while-not-rendered";
    PermissionsPolicyFeature2["FocusWithoutUserActivation"] = "focus-without-user-activation";
    PermissionsPolicyFeature2["Fullscreen"] = "fullscreen";
    PermissionsPolicyFeature2["Frobulate"] = "frobulate";
    PermissionsPolicyFeature2["Gamepad"] = "gamepad";
    PermissionsPolicyFeature2["Geolocation"] = "geolocation";
    PermissionsPolicyFeature2["Gyroscope"] = "gyroscope";
    PermissionsPolicyFeature2["Haptics"] = "haptics";
    PermissionsPolicyFeature2["Hid"] = "hid";
    PermissionsPolicyFeature2["IdentityCredentialsGet"] = "identity-credentials-get";
    PermissionsPolicyFeature2["IdleDetection"] = "idle-detection";
    PermissionsPolicyFeature2["InterestCohort"] = "interest-cohort";
    PermissionsPolicyFeature2["KeyboardMap"] = "keyboard-map";
    PermissionsPolicyFeature2["LanguageDetector"] = "language-detector";
    PermissionsPolicyFeature2["LanguageModel"] = "language-model";
    PermissionsPolicyFeature2["LocalFonts"] = "local-fonts";
    PermissionsPolicyFeature2["LocalNetwork"] = "local-network";
    PermissionsPolicyFeature2["LocalNetworkAccess"] = "local-network-access";
    PermissionsPolicyFeature2["LoopbackNetwork"] = "loopback-network";
    PermissionsPolicyFeature2["Magnetometer"] = "magnetometer";
    PermissionsPolicyFeature2["ManualText"] = "manual-text";
    PermissionsPolicyFeature2["MediaPlaybackWhileNotVisible"] = "media-playback-while-not-visible";
    PermissionsPolicyFeature2["Microphone"] = "microphone";
    PermissionsPolicyFeature2["Midi"] = "midi";
    PermissionsPolicyFeature2["OnDeviceSpeechRecognition"] = "on-device-speech-recognition";
    PermissionsPolicyFeature2["OtpCredentials"] = "otp-credentials";
    PermissionsPolicyFeature2["Payment"] = "payment";
    PermissionsPolicyFeature2["PictureInPicture"] = "picture-in-picture";
    PermissionsPolicyFeature2["PrivateStateTokenIssuance"] = "private-state-token-issuance";
    PermissionsPolicyFeature2["PrivateStateTokenRedemption"] = "private-state-token-redemption";
    PermissionsPolicyFeature2["PublickeyCredentialsCreate"] = "publickey-credentials-create";
    PermissionsPolicyFeature2["PublickeyCredentialsGet"] = "publickey-credentials-get";
    PermissionsPolicyFeature2["Rewriter"] = "rewriter";
    PermissionsPolicyFeature2["ScreenWakeLock"] = "screen-wake-lock";
    PermissionsPolicyFeature2["Serial"] = "serial";
    PermissionsPolicyFeature2["SharedStorage"] = "shared-storage";
    PermissionsPolicyFeature2["SharedStorageSelectUrl"] = "shared-storage-select-url";
    PermissionsPolicyFeature2["SmartCard"] = "smart-card";
    PermissionsPolicyFeature2["SpeakerSelection"] = "speaker-selection";
    PermissionsPolicyFeature2["StorageAccess"] = "storage-access";
    PermissionsPolicyFeature2["SubApps"] = "sub-apps";
    PermissionsPolicyFeature2["Summarizer"] = "summarizer";
    PermissionsPolicyFeature2["SyncXhr"] = "sync-xhr";
    PermissionsPolicyFeature2["Tools"] = "tools";
    PermissionsPolicyFeature2["Translator"] = "translator";
    PermissionsPolicyFeature2["Unload"] = "unload";
    PermissionsPolicyFeature2["Usb"] = "usb";
    PermissionsPolicyFeature2["UsbUnrestricted"] = "usb-unrestricted";
    PermissionsPolicyFeature2["VerticalScroll"] = "vertical-scroll";
    PermissionsPolicyFeature2["WebAppInstallation"] = "web-app-installation";
    PermissionsPolicyFeature2["Webnn"] = "webnn";
    PermissionsPolicyFeature2["WebPrinting"] = "web-printing";
    PermissionsPolicyFeature2["WebShare"] = "web-share";
    PermissionsPolicyFeature2["WindowManagement"] = "window-management";
    PermissionsPolicyFeature2["Writer"] = "writer";
    PermissionsPolicyFeature2["XrSpatialTracking"] = "xr-spatial-tracking";
  })(PermissionsPolicyFeature = Page2.PermissionsPolicyFeature || (Page2.PermissionsPolicyFeature = {}));
  let PermissionsPolicyBlockReason;
  ((PermissionsPolicyBlockReason2) => {
    PermissionsPolicyBlockReason2["Header"] = "Header";
    PermissionsPolicyBlockReason2["IframeAttribute"] = "IframeAttribute";
    PermissionsPolicyBlockReason2["InFencedFrameTree"] = "InFencedFrameTree";
    PermissionsPolicyBlockReason2["InIsolatedApp"] = "InIsolatedApp";
  })(PermissionsPolicyBlockReason = Page2.PermissionsPolicyBlockReason || (Page2.PermissionsPolicyBlockReason = {}));
  let OriginTrialTokenStatus;
  ((OriginTrialTokenStatus2) => {
    OriginTrialTokenStatus2["Success"] = "Success";
    OriginTrialTokenStatus2["NotSupported"] = "NotSupported";
    OriginTrialTokenStatus2["Insecure"] = "Insecure";
    OriginTrialTokenStatus2["Expired"] = "Expired";
    OriginTrialTokenStatus2["WrongOrigin"] = "WrongOrigin";
    OriginTrialTokenStatus2["InvalidSignature"] = "InvalidSignature";
    OriginTrialTokenStatus2["Malformed"] = "Malformed";
    OriginTrialTokenStatus2["WrongVersion"] = "WrongVersion";
    OriginTrialTokenStatus2["FeatureDisabled"] = "FeatureDisabled";
    OriginTrialTokenStatus2["TokenDisabled"] = "TokenDisabled";
    OriginTrialTokenStatus2["FeatureDisabledForUser"] = "FeatureDisabledForUser";
    OriginTrialTokenStatus2["UnknownTrial"] = "UnknownTrial";
  })(OriginTrialTokenStatus = Page2.OriginTrialTokenStatus || (Page2.OriginTrialTokenStatus = {}));
  let OriginTrialStatus;
  ((OriginTrialStatus2) => {
    OriginTrialStatus2["Enabled"] = "Enabled";
    OriginTrialStatus2["ValidTokenNotProvided"] = "ValidTokenNotProvided";
    OriginTrialStatus2["OSNotSupported"] = "OSNotSupported";
    OriginTrialStatus2["TrialNotAllowed"] = "TrialNotAllowed";
  })(OriginTrialStatus = Page2.OriginTrialStatus || (Page2.OriginTrialStatus = {}));
  let OriginTrialUsageRestriction;
  ((OriginTrialUsageRestriction2) => {
    OriginTrialUsageRestriction2["None"] = "None";
    OriginTrialUsageRestriction2["Subset"] = "Subset";
  })(OriginTrialUsageRestriction = Page2.OriginTrialUsageRestriction || (Page2.OriginTrialUsageRestriction = {}));
  let TransitionType;
  ((TransitionType2) => {
    TransitionType2["Link"] = "link";
    TransitionType2["Typed"] = "typed";
    TransitionType2["Address_bar"] = "address_bar";
    TransitionType2["Auto_bookmark"] = "auto_bookmark";
    TransitionType2["Auto_subframe"] = "auto_subframe";
    TransitionType2["Manual_subframe"] = "manual_subframe";
    TransitionType2["Generated"] = "generated";
    TransitionType2["Auto_toplevel"] = "auto_toplevel";
    TransitionType2["Form_submit"] = "form_submit";
    TransitionType2["Reload"] = "reload";
    TransitionType2["Keyword"] = "keyword";
    TransitionType2["Keyword_generated"] = "keyword_generated";
    TransitionType2["Other"] = "other";
  })(TransitionType = Page2.TransitionType || (Page2.TransitionType = {}));
  let DialogType;
  ((DialogType2) => {
    DialogType2["Alert"] = "alert";
    DialogType2["Confirm"] = "confirm";
    DialogType2["Prompt"] = "prompt";
    DialogType2["Beforeunload"] = "beforeunload";
  })(DialogType = Page2.DialogType || (Page2.DialogType = {}));
  let ClientNavigationReason;
  ((ClientNavigationReason2) => {
    ClientNavigationReason2["AnchorClick"] = "anchorClick";
    ClientNavigationReason2["FormSubmissionGet"] = "formSubmissionGet";
    ClientNavigationReason2["FormSubmissionPost"] = "formSubmissionPost";
    ClientNavigationReason2["HttpHeaderRefresh"] = "httpHeaderRefresh";
    ClientNavigationReason2["InitialFrameNavigation"] = "initialFrameNavigation";
    ClientNavigationReason2["MetaTagRefresh"] = "metaTagRefresh";
    ClientNavigationReason2["Other"] = "other";
    ClientNavigationReason2["PageBlockInterstitial"] = "pageBlockInterstitial";
    ClientNavigationReason2["Reload"] = "reload";
    ClientNavigationReason2["ScriptInitiated"] = "scriptInitiated";
  })(ClientNavigationReason = Page2.ClientNavigationReason || (Page2.ClientNavigationReason = {}));
  let ClientNavigationDisposition;
  ((ClientNavigationDisposition2) => {
    ClientNavigationDisposition2["CurrentTab"] = "currentTab";
    ClientNavigationDisposition2["NewTab"] = "newTab";
    ClientNavigationDisposition2["NewWindow"] = "newWindow";
    ClientNavigationDisposition2["Download"] = "download";
  })(ClientNavigationDisposition = Page2.ClientNavigationDisposition || (Page2.ClientNavigationDisposition = {}));
  let ReferrerPolicy;
  ((ReferrerPolicy2) => {
    ReferrerPolicy2["NoReferrer"] = "noReferrer";
    ReferrerPolicy2["NoReferrerWhenDowngrade"] = "noReferrerWhenDowngrade";
    ReferrerPolicy2["Origin"] = "origin";
    ReferrerPolicy2["OriginWhenCrossOrigin"] = "originWhenCrossOrigin";
    ReferrerPolicy2["SameOrigin"] = "sameOrigin";
    ReferrerPolicy2["StrictOrigin"] = "strictOrigin";
    ReferrerPolicy2["StrictOriginWhenCrossOrigin"] = "strictOriginWhenCrossOrigin";
    ReferrerPolicy2["UnsafeUrl"] = "unsafeUrl";
  })(ReferrerPolicy = Page2.ReferrerPolicy || (Page2.ReferrerPolicy = {}));
  let NavigationType;
  ((NavigationType2) => {
    NavigationType2["Navigation"] = "Navigation";
    NavigationType2["BackForwardCacheRestore"] = "BackForwardCacheRestore";
  })(NavigationType = Page2.NavigationType || (Page2.NavigationType = {}));
  let BackForwardCacheNotRestoredReason;
  ((BackForwardCacheNotRestoredReason2) => {
    BackForwardCacheNotRestoredReason2["NotPrimaryMainFrame"] = "NotPrimaryMainFrame";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabled"] = "BackForwardCacheDisabled";
    BackForwardCacheNotRestoredReason2["RelatedActiveContentsExist"] = "RelatedActiveContentsExist";
    BackForwardCacheNotRestoredReason2["HTTPStatusNotOK"] = "HTTPStatusNotOK";
    BackForwardCacheNotRestoredReason2["SchemeNotHTTPOrHTTPS"] = "SchemeNotHTTPOrHTTPS";
    BackForwardCacheNotRestoredReason2["Loading"] = "Loading";
    BackForwardCacheNotRestoredReason2["WasGrantedMediaAccess"] = "WasGrantedMediaAccess";
    BackForwardCacheNotRestoredReason2["DisableForRenderFrameHostCalled"] = "DisableForRenderFrameHostCalled";
    BackForwardCacheNotRestoredReason2["DomainNotAllowed"] = "DomainNotAllowed";
    BackForwardCacheNotRestoredReason2["HTTPMethodNotGET"] = "HTTPMethodNotGET";
    BackForwardCacheNotRestoredReason2["SubframeIsNavigating"] = "SubframeIsNavigating";
    BackForwardCacheNotRestoredReason2["Timeout"] = "Timeout";
    BackForwardCacheNotRestoredReason2["CacheLimit"] = "CacheLimit";
    BackForwardCacheNotRestoredReason2["JavaScriptExecution"] = "JavaScriptExecution";
    BackForwardCacheNotRestoredReason2["RendererProcessKilled"] = "RendererProcessKilled";
    BackForwardCacheNotRestoredReason2["RendererProcessCrashed"] = "RendererProcessCrashed";
    BackForwardCacheNotRestoredReason2["SchedulerTrackedFeatureUsed"] = "SchedulerTrackedFeatureUsed";
    BackForwardCacheNotRestoredReason2["ConflictingBrowsingInstance"] = "ConflictingBrowsingInstance";
    BackForwardCacheNotRestoredReason2["CacheFlushed"] = "CacheFlushed";
    BackForwardCacheNotRestoredReason2["ServiceWorkerVersionActivation"] = "ServiceWorkerVersionActivation";
    BackForwardCacheNotRestoredReason2["SessionRestored"] = "SessionRestored";
    BackForwardCacheNotRestoredReason2["ServiceWorkerPostMessage"] = "ServiceWorkerPostMessage";
    BackForwardCacheNotRestoredReason2["EnteredBackForwardCacheBeforeServiceWorkerHostAdded"] = "EnteredBackForwardCacheBeforeServiceWorkerHostAdded";
    BackForwardCacheNotRestoredReason2["RenderFrameHostReused_SameSite"] = "RenderFrameHostReused_SameSite";
    BackForwardCacheNotRestoredReason2["RenderFrameHostReused_CrossSite"] = "RenderFrameHostReused_CrossSite";
    BackForwardCacheNotRestoredReason2["ServiceWorkerClaim"] = "ServiceWorkerClaim";
    BackForwardCacheNotRestoredReason2["IgnoreEventAndEvict"] = "IgnoreEventAndEvict";
    BackForwardCacheNotRestoredReason2["HaveInnerContents"] = "HaveInnerContents";
    BackForwardCacheNotRestoredReason2["TimeoutPuttingInCache"] = "TimeoutPuttingInCache";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledByLowMemory"] = "BackForwardCacheDisabledByLowMemory";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledByCommandLine"] = "BackForwardCacheDisabledByCommandLine";
    BackForwardCacheNotRestoredReason2["NetworkRequestDatAPIpeDrainedAsBytesConsumer"] = "NetworkRequestDatapipeDrainedAsBytesConsumer";
    BackForwardCacheNotRestoredReason2["NetworkRequestRedirected"] = "NetworkRequestRedirected";
    BackForwardCacheNotRestoredReason2["NetworkRequestTimeout"] = "NetworkRequestTimeout";
    BackForwardCacheNotRestoredReason2["NetworkExceedsBufferLimit"] = "NetworkExceedsBufferLimit";
    BackForwardCacheNotRestoredReason2["NavigationCancelledWhileRestoring"] = "NavigationCancelledWhileRestoring";
    BackForwardCacheNotRestoredReason2["NotMostRecentNavigationEntry"] = "NotMostRecentNavigationEntry";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledForPrerender"] = "BackForwardCacheDisabledForPrerender";
    BackForwardCacheNotRestoredReason2["UserAgentOverrideDiffers"] = "UserAgentOverrideDiffers";
    BackForwardCacheNotRestoredReason2["ForegroundCacheLimit"] = "ForegroundCacheLimit";
    BackForwardCacheNotRestoredReason2["ForwardCacheDisabled"] = "ForwardCacheDisabled";
    BackForwardCacheNotRestoredReason2["BrowsingInstanceNotSwapped"] = "BrowsingInstanceNotSwapped";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledForDelegate"] = "BackForwardCacheDisabledForDelegate";
    BackForwardCacheNotRestoredReason2["UnloadHandlerExistsInMainFrame"] = "UnloadHandlerExistsInMainFrame";
    BackForwardCacheNotRestoredReason2["UnloadHandlerExistsInSubFrame"] = "UnloadHandlerExistsInSubFrame";
    BackForwardCacheNotRestoredReason2["ServiceWorkerUnregistration"] = "ServiceWorkerUnregistration";
    BackForwardCacheNotRestoredReason2["CacheControlNoStore"] = "CacheControlNoStore";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreCookieModified"] = "CacheControlNoStoreCookieModified";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreHTTPOnlyCookieModified"] = "CacheControlNoStoreHTTPOnlyCookieModified";
    BackForwardCacheNotRestoredReason2["NoResponseHead"] = "NoResponseHead";
    BackForwardCacheNotRestoredReason2["Unknown"] = "Unknown";
    BackForwardCacheNotRestoredReason2["ActivationNavigationsDisallowedForBug1234857"] = "ActivationNavigationsDisallowedForBug1234857";
    BackForwardCacheNotRestoredReason2["ErrorDocument"] = "ErrorDocument";
    BackForwardCacheNotRestoredReason2["FencedFramesEmbedder"] = "FencedFramesEmbedder";
    BackForwardCacheNotRestoredReason2["CookieDisabled"] = "CookieDisabled";
    BackForwardCacheNotRestoredReason2["HTTPAuthRequired"] = "HTTPAuthRequired";
    BackForwardCacheNotRestoredReason2["CookieFlushed"] = "CookieFlushed";
    BackForwardCacheNotRestoredReason2["BroadcastChannelOnMessage"] = "BroadcastChannelOnMessage";
    BackForwardCacheNotRestoredReason2["WebViewSettingsChanged"] = "WebViewSettingsChanged";
    BackForwardCacheNotRestoredReason2["WebViewJavaScriptObjectChanged"] = "WebViewJavaScriptObjectChanged";
    BackForwardCacheNotRestoredReason2["WebViewMessageListenerInjected"] = "WebViewMessageListenerInjected";
    BackForwardCacheNotRestoredReason2["WebViewSafeBrowsingAllowlistChanged"] = "WebViewSafeBrowsingAllowlistChanged";
    BackForwardCacheNotRestoredReason2["WebViewDocumentStartJavascriptChanged"] = "WebViewDocumentStartJavascriptChanged";
    BackForwardCacheNotRestoredReason2["WebSocket"] = "WebSocket";
    BackForwardCacheNotRestoredReason2["WebTransport"] = "WebTransport";
    BackForwardCacheNotRestoredReason2["WebRTC"] = "WebRTC";
    BackForwardCacheNotRestoredReason2["MainResourceHasCacheControlNoStore"] = "MainResourceHasCacheControlNoStore";
    BackForwardCacheNotRestoredReason2["MainResourceHasCacheControlNoCache"] = "MainResourceHasCacheControlNoCache";
    BackForwardCacheNotRestoredReason2["SubresourceHasCacheControlNoStore"] = "SubresourceHasCacheControlNoStore";
    BackForwardCacheNotRestoredReason2["SubresourceHasCacheControlNoCache"] = "SubresourceHasCacheControlNoCache";
    BackForwardCacheNotRestoredReason2["ContainsPlugins"] = "ContainsPlugins";
    BackForwardCacheNotRestoredReason2["DocumentLoaded"] = "DocumentLoaded";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestOthers"] = "OutstandingNetworkRequestOthers";
    BackForwardCacheNotRestoredReason2["RequestedMIDIPermission"] = "RequestedMIDIPermission";
    BackForwardCacheNotRestoredReason2["RequestedAudioCapturePermission"] = "RequestedAudioCapturePermission";
    BackForwardCacheNotRestoredReason2["RequestedVideoCapturePermission"] = "RequestedVideoCapturePermission";
    BackForwardCacheNotRestoredReason2["RequestedBackForwardCacheBlockedSensors"] = "RequestedBackForwardCacheBlockedSensors";
    BackForwardCacheNotRestoredReason2["RequestedBackgroundWorkPermission"] = "RequestedBackgroundWorkPermission";
    BackForwardCacheNotRestoredReason2["BroadcastChannel"] = "BroadcastChannel";
    BackForwardCacheNotRestoredReason2["WebXR"] = "WebXR";
    BackForwardCacheNotRestoredReason2["SharedWorker"] = "SharedWorker";
    BackForwardCacheNotRestoredReason2["SharedWorkerMessage"] = "SharedWorkerMessage";
    BackForwardCacheNotRestoredReason2["SharedWorkerWithNoActiveClient"] = "SharedWorkerWithNoActiveClient";
    BackForwardCacheNotRestoredReason2["WebLocks"] = "WebLocks";
    BackForwardCacheNotRestoredReason2["WebLocksContention"] = "WebLocksContention";
    BackForwardCacheNotRestoredReason2["WebHID"] = "WebHID";
    BackForwardCacheNotRestoredReason2["WebBluetooth"] = "WebBluetooth";
    BackForwardCacheNotRestoredReason2["WebShare"] = "WebShare";
    BackForwardCacheNotRestoredReason2["RequestedStorageAccessGrant"] = "RequestedStorageAccessGrant";
    BackForwardCacheNotRestoredReason2["WebNfc"] = "WebNfc";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestFetch"] = "OutstandingNetworkRequestFetch";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestXHR"] = "OutstandingNetworkRequestXHR";
    BackForwardCacheNotRestoredReason2["AppBanner"] = "AppBanner";
    BackForwardCacheNotRestoredReason2["Printing"] = "Printing";
    BackForwardCacheNotRestoredReason2["WebDatabase"] = "WebDatabase";
    BackForwardCacheNotRestoredReason2["PictureInPicture"] = "PictureInPicture";
    BackForwardCacheNotRestoredReason2["SpeechRecognizer"] = "SpeechRecognizer";
    BackForwardCacheNotRestoredReason2["IdleManager"] = "IdleManager";
    BackForwardCacheNotRestoredReason2["PaymentManager"] = "PaymentManager";
    BackForwardCacheNotRestoredReason2["SpeechSynthesis"] = "SpeechSynthesis";
    BackForwardCacheNotRestoredReason2["KeyboardLock"] = "KeyboardLock";
    BackForwardCacheNotRestoredReason2["WebOTPService"] = "WebOTPService";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestDirectSocket"] = "OutstandingNetworkRequestDirectSocket";
    BackForwardCacheNotRestoredReason2["InjectedJavascript"] = "InjectedJavascript";
    BackForwardCacheNotRestoredReason2["InjectedStyleSheet"] = "InjectedStyleSheet";
    BackForwardCacheNotRestoredReason2["KeepaliveRequest"] = "KeepaliveRequest";
    BackForwardCacheNotRestoredReason2["IndexedDBEvent"] = "IndexedDBEvent";
    BackForwardCacheNotRestoredReason2["Dummy"] = "Dummy";
    BackForwardCacheNotRestoredReason2["JsNetworkRequestReceivedCacheControlNoStoreResource"] = "JsNetworkRequestReceivedCacheControlNoStoreResource";
    BackForwardCacheNotRestoredReason2["WebRTCUsedWithCCNS"] = "WebRTCUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["WebTransportUsedWithCCNS"] = "WebTransportUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["WebSocketUsedWithCCNS"] = "WebSocketUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["SmartCard"] = "SmartCard";
    BackForwardCacheNotRestoredReason2["LiveMediaStreamTrack"] = "LiveMediaStreamTrack";
    BackForwardCacheNotRestoredReason2["UnloadHandler"] = "UnloadHandler";
    BackForwardCacheNotRestoredReason2["ParserAborted"] = "ParserAborted";
    BackForwardCacheNotRestoredReason2["ContentSecurityHandler"] = "ContentSecurityHandler";
    BackForwardCacheNotRestoredReason2["ContentWebAuthenticationAPI"] = "ContentWebAuthenticationAPI";
    BackForwardCacheNotRestoredReason2["ContentFileChooser"] = "ContentFileChooser";
    BackForwardCacheNotRestoredReason2["ContentSerial"] = "ContentSerial";
    BackForwardCacheNotRestoredReason2["ContentFileSystemAccess"] = "ContentFileSystemAccess";
    BackForwardCacheNotRestoredReason2["ContentMediaDevicesDispatcherHost"] = "ContentMediaDevicesDispatcherHost";
    BackForwardCacheNotRestoredReason2["ContentWebBluetooth"] = "ContentWebBluetooth";
    BackForwardCacheNotRestoredReason2["ContentWebUSB"] = "ContentWebUSB";
    BackForwardCacheNotRestoredReason2["ContentMediaSessionService"] = "ContentMediaSessionService";
    BackForwardCacheNotRestoredReason2["ContentScreenReader"] = "ContentScreenReader";
    BackForwardCacheNotRestoredReason2["ContentDiscarded"] = "ContentDiscarded";
    BackForwardCacheNotRestoredReason2["EmbedderPopupBlockerTabHelper"] = "EmbedderPopupBlockerTabHelper";
    BackForwardCacheNotRestoredReason2["EmbedderSafeBrowsingTriggeredPopupBlocker"] = "EmbedderSafeBrowsingTriggeredPopupBlocker";
    BackForwardCacheNotRestoredReason2["EmbedderSafeBrowsingThreatDetails"] = "EmbedderSafeBrowsingThreatDetails";
    BackForwardCacheNotRestoredReason2["EmbedderAppBannerManager"] = "EmbedderAppBannerManager";
    BackForwardCacheNotRestoredReason2["EmbedderDomDistillerViewerSource"] = "EmbedderDomDistillerViewerSource";
    BackForwardCacheNotRestoredReason2["EmbedderDomDistillerSelfDeletingRequestDelegate"] = "EmbedderDomDistillerSelfDeletingRequestDelegate";
    BackForwardCacheNotRestoredReason2["EmbedderOomInterventionTabHelper"] = "EmbedderOomInterventionTabHelper";
    BackForwardCacheNotRestoredReason2["EmbedderOfflinePage"] = "EmbedderOfflinePage";
    BackForwardCacheNotRestoredReason2["EmbedderChromePasswordManagerClientBindCredentialManager"] = "EmbedderChromePasswordManagerClientBindCredentialManager";
    BackForwardCacheNotRestoredReason2["EmbedderPermissionRequestManager"] = "EmbedderPermissionRequestManager";
    BackForwardCacheNotRestoredReason2["EmbedderModalDialog"] = "EmbedderModalDialog";
    BackForwardCacheNotRestoredReason2["EmbedderExtensions"] = "EmbedderExtensions";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionMessaging"] = "EmbedderExtensionMessaging";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionMessagingForOpenPort"] = "EmbedderExtensionMessagingForOpenPort";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionSentMessageToCachedFrame"] = "EmbedderExtensionSentMessageToCachedFrame";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionFrame"] = "EmbedderExtensionFrame";
    BackForwardCacheNotRestoredReason2["EmbedderPrivilegedWebContents"] = "EmbedderPrivilegedWebContents";
    BackForwardCacheNotRestoredReason2["RequestedByWebViewClient"] = "RequestedByWebViewClient";
    BackForwardCacheNotRestoredReason2["PostMessageByWebViewClient"] = "PostMessageByWebViewClient";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreDeviceBoundSessionTerminated"] = "CacheControlNoStoreDeviceBoundSessionTerminated";
    BackForwardCacheNotRestoredReason2["CacheLimitPrunedOnModerateMemoryPressure"] = "CacheLimitPrunedOnModerateMemoryPressure";
    BackForwardCacheNotRestoredReason2["CacheLimitPrunedOnCriticalMemoryPressure"] = "CacheLimitPrunedOnCriticalMemoryPressure";
  })(BackForwardCacheNotRestoredReason = Page2.BackForwardCacheNotRestoredReason || (Page2.BackForwardCacheNotRestoredReason = {}));
  let BackForwardCacheNotRestoredReasonType;
  ((BackForwardCacheNotRestoredReasonType2) => {
    BackForwardCacheNotRestoredReasonType2["SupportPending"] = "SupportPending";
    BackForwardCacheNotRestoredReasonType2["PageSupportNeeded"] = "PageSupportNeeded";
    BackForwardCacheNotRestoredReasonType2["Circumstantial"] = "Circumstantial";
  })(BackForwardCacheNotRestoredReasonType = Page2.BackForwardCacheNotRestoredReasonType || (Page2.BackForwardCacheNotRestoredReasonType = {}));
  let CaptureScreenshotRequestFormat;
  ((CaptureScreenshotRequestFormat2) => {
    CaptureScreenshotRequestFormat2["Jpeg"] = "jpeg";
    CaptureScreenshotRequestFormat2["Png"] = "png";
    CaptureScreenshotRequestFormat2["Webp"] = "webp";
  })(CaptureScreenshotRequestFormat = Page2.CaptureScreenshotRequestFormat || (Page2.CaptureScreenshotRequestFormat = {}));
  let CaptureSnapshotRequestFormat;
  ((CaptureSnapshotRequestFormat2) => {
    CaptureSnapshotRequestFormat2["MHTML"] = "mhtml";
  })(CaptureSnapshotRequestFormat = Page2.CaptureSnapshotRequestFormat || (Page2.CaptureSnapshotRequestFormat = {}));
  let PrintToPDFRequestTransferMode;
  ((PrintToPDFRequestTransferMode2) => {
    PrintToPDFRequestTransferMode2["ReturnAsBase64"] = "ReturnAsBase64";
    PrintToPDFRequestTransferMode2["ReturnAsStream"] = "ReturnAsStream";
  })(PrintToPDFRequestTransferMode = Page2.PrintToPDFRequestTransferMode || (Page2.PrintToPDFRequestTransferMode = {}));
  let SetDownloadBehaviorRequestBehavior;
  ((SetDownloadBehaviorRequestBehavior2) => {
    SetDownloadBehaviorRequestBehavior2["Deny"] = "deny";
    SetDownloadBehaviorRequestBehavior2["Allow"] = "allow";
    SetDownloadBehaviorRequestBehavior2["Default"] = "default";
  })(SetDownloadBehaviorRequestBehavior = Page2.SetDownloadBehaviorRequestBehavior || (Page2.SetDownloadBehaviorRequestBehavior = {}));
  let SetTouchEmulationEnabledRequestConfiguration;
  ((SetTouchEmulationEnabledRequestConfiguration2) => {
    SetTouchEmulationEnabledRequestConfiguration2["Mobile"] = "mobile";
    SetTouchEmulationEnabledRequestConfiguration2["Desktop"] = "desktop";
  })(SetTouchEmulationEnabledRequestConfiguration = Page2.SetTouchEmulationEnabledRequestConfiguration || (Page2.SetTouchEmulationEnabledRequestConfiguration = {}));
  let StartScreencastRequestFormat;
  ((StartScreencastRequestFormat2) => {
    StartScreencastRequestFormat2["Jpeg"] = "jpeg";
    StartScreencastRequestFormat2["Png"] = "png";
  })(StartScreencastRequestFormat = Page2.StartScreencastRequestFormat || (Page2.StartScreencastRequestFormat = {}));
  let SetWebLifecycleStateRequestState;
  ((SetWebLifecycleStateRequestState2) => {
    SetWebLifecycleStateRequestState2["Frozen"] = "frozen";
    SetWebLifecycleStateRequestState2["Active"] = "active";
  })(SetWebLifecycleStateRequestState = Page2.SetWebLifecycleStateRequestState || (Page2.SetWebLifecycleStateRequestState = {}));
  let SetSPCTransactionModeRequestMode;
  ((SetSPCTransactionModeRequestMode2) => {
    SetSPCTransactionModeRequestMode2["None"] = "none";
    SetSPCTransactionModeRequestMode2["AutoAccept"] = "autoAccept";
    SetSPCTransactionModeRequestMode2["AutoChooseToAuthAnotherWay"] = "autoChooseToAuthAnotherWay";
    SetSPCTransactionModeRequestMode2["AutoReject"] = "autoReject";
    SetSPCTransactionModeRequestMode2["AutoOptOut"] = "autoOptOut";
  })(SetSPCTransactionModeRequestMode = Page2.SetSPCTransactionModeRequestMode || (Page2.SetSPCTransactionModeRequestMode = {}));
  let SetRPHRegistrationModeRequestMode;
  ((SetRPHRegistrationModeRequestMode2) => {
    SetRPHRegistrationModeRequestMode2["None"] = "none";
    SetRPHRegistrationModeRequestMode2["AutoAccept"] = "autoAccept";
    SetRPHRegistrationModeRequestMode2["AutoReject"] = "autoReject";
  })(SetRPHRegistrationModeRequestMode = Page2.SetRPHRegistrationModeRequestMode || (Page2.SetRPHRegistrationModeRequestMode = {}));
  let FileChooserOpenedEventMode;
  ((FileChooserOpenedEventMode2) => {
    FileChooserOpenedEventMode2["SelectSingle"] = "selectSingle";
    FileChooserOpenedEventMode2["SelectMultiple"] = "selectMultiple";
  })(FileChooserOpenedEventMode = Page2.FileChooserOpenedEventMode || (Page2.FileChooserOpenedEventMode = {}));
  let FrameDetachedEventReason;
  ((FrameDetachedEventReason2) => {
    FrameDetachedEventReason2["Remove"] = "remove";
    FrameDetachedEventReason2["Swap"] = "swap";
  })(FrameDetachedEventReason = Page2.FrameDetachedEventReason || (Page2.FrameDetachedEventReason = {}));
  let FrameStartedNavigatingEventNavigationType;
  ((FrameStartedNavigatingEventNavigationType2) => {
    FrameStartedNavigatingEventNavigationType2["Reload"] = "reload";
    FrameStartedNavigatingEventNavigationType2["ReloadBypassingCache"] = "reloadBypassingCache";
    FrameStartedNavigatingEventNavigationType2["Restore"] = "restore";
    FrameStartedNavigatingEventNavigationType2["RestoreWithPost"] = "restoreWithPost";
    FrameStartedNavigatingEventNavigationType2["HistorySameDocument"] = "historySameDocument";
    FrameStartedNavigatingEventNavigationType2["HistoryDifferentDocument"] = "historyDifferentDocument";
    FrameStartedNavigatingEventNavigationType2["SameDocument"] = "sameDocument";
    FrameStartedNavigatingEventNavigationType2["DifferentDocument"] = "differentDocument";
  })(FrameStartedNavigatingEventNavigationType = Page2.FrameStartedNavigatingEventNavigationType || (Page2.FrameStartedNavigatingEventNavigationType = {}));
  let DownloadProgressEventState;
  ((DownloadProgressEventState2) => {
    DownloadProgressEventState2["InProgress"] = "inProgress";
    DownloadProgressEventState2["Completed"] = "completed";
    DownloadProgressEventState2["Canceled"] = "canceled";
  })(DownloadProgressEventState = Page2.DownloadProgressEventState || (Page2.DownloadProgressEventState = {}));
  let NavigatedWithinDocumentEventNavigationType;
  ((NavigatedWithinDocumentEventNavigationType2) => {
    NavigatedWithinDocumentEventNavigationType2["Fragment"] = "fragment";
    NavigatedWithinDocumentEventNavigationType2["HistoryAPI"] = "historyApi";
    NavigatedWithinDocumentEventNavigationType2["Other"] = "other";
  })(NavigatedWithinDocumentEventNavigationType = Page2.NavigatedWithinDocumentEventNavigationType || (Page2.NavigatedWithinDocumentEventNavigationType = {}));
})(Page || (Page = {}));
var Performance;
((Performance2) => {
  let EnableRequestTimeDomain;
  ((EnableRequestTimeDomain2) => {
    EnableRequestTimeDomain2["TimeTicks"] = "timeTicks";
    EnableRequestTimeDomain2["ThreadTicks"] = "threadTicks";
  })(EnableRequestTimeDomain = Performance2.EnableRequestTimeDomain || (Performance2.EnableRequestTimeDomain = {}));
  let SetTimeDomainRequestTimeDomain;
  ((SetTimeDomainRequestTimeDomain2) => {
    SetTimeDomainRequestTimeDomain2["TimeTicks"] = "timeTicks";
    SetTimeDomainRequestTimeDomain2["ThreadTicks"] = "threadTicks";
  })(SetTimeDomainRequestTimeDomain = Performance2.SetTimeDomainRequestTimeDomain || (Performance2.SetTimeDomainRequestTimeDomain = {}));
})(Performance || (Performance = {}));
var Preload;
((Preload2) => {
  let RuleSetErrorType;
  ((RuleSetErrorType2) => {
    RuleSetErrorType2["SourceIsNotJsonObject"] = "SourceIsNotJsonObject";
    RuleSetErrorType2["InvalidRulesSkipped"] = "InvalidRulesSkipped";
    RuleSetErrorType2["InvalidRulesetLevelTag"] = "InvalidRulesetLevelTag";
  })(RuleSetErrorType = Preload2.RuleSetErrorType || (Preload2.RuleSetErrorType = {}));
  let SpeculationAction;
  ((SpeculationAction2) => {
    SpeculationAction2["Prefetch"] = "Prefetch";
    SpeculationAction2["Prerender"] = "Prerender";
    SpeculationAction2["PrerenderUntilScript"] = "PrerenderUntilScript";
  })(SpeculationAction = Preload2.SpeculationAction || (Preload2.SpeculationAction = {}));
  let SpeculationTargetHint;
  ((SpeculationTargetHint2) => {
    SpeculationTargetHint2["Blank"] = "Blank";
    SpeculationTargetHint2["Self"] = "Self";
  })(SpeculationTargetHint = Preload2.SpeculationTargetHint || (Preload2.SpeculationTargetHint = {}));
  let PrerenderFinalStatus;
  ((PrerenderFinalStatus2) => {
    PrerenderFinalStatus2["Activated"] = "Activated";
    PrerenderFinalStatus2["Destroyed"] = "Destroyed";
    PrerenderFinalStatus2["LowEndDevice"] = "LowEndDevice";
    PrerenderFinalStatus2["InvalidSchemeRedirect"] = "InvalidSchemeRedirect";
    PrerenderFinalStatus2["InvalidSchemeNavigation"] = "InvalidSchemeNavigation";
    PrerenderFinalStatus2["NavigationRequestBlockedByCsp"] = "NavigationRequestBlockedByCsp";
    PrerenderFinalStatus2["MojoBinderPolicy"] = "MojoBinderPolicy";
    PrerenderFinalStatus2["RendererProcessCrashed"] = "RendererProcessCrashed";
    PrerenderFinalStatus2["RendererProcessKilled"] = "RendererProcessKilled";
    PrerenderFinalStatus2["Download"] = "Download";
    PrerenderFinalStatus2["TriggerDestroyed"] = "TriggerDestroyed";
    PrerenderFinalStatus2["NavigationNotCommitted"] = "NavigationNotCommitted";
    PrerenderFinalStatus2["NavigationBadHttpStatus"] = "NavigationBadHttpStatus";
    PrerenderFinalStatus2["ClientCertRequested"] = "ClientCertRequested";
    PrerenderFinalStatus2["NavigationRequestNetworkError"] = "NavigationRequestNetworkError";
    PrerenderFinalStatus2["CancelAllHostsForTesting"] = "CancelAllHostsForTesting";
    PrerenderFinalStatus2["DidFailLoad"] = "DidFailLoad";
    PrerenderFinalStatus2["Stop"] = "Stop";
    PrerenderFinalStatus2["SslCertificateError"] = "SslCertificateError";
    PrerenderFinalStatus2["LoginAuthRequested"] = "LoginAuthRequested";
    PrerenderFinalStatus2["UaChangeRequiresReload"] = "UaChangeRequiresReload";
    PrerenderFinalStatus2["BlockedByClient"] = "BlockedByClient";
    PrerenderFinalStatus2["AudioOutputDeviceRequested"] = "AudioOutputDeviceRequested";
    PrerenderFinalStatus2["MixedContent"] = "MixedContent";
    PrerenderFinalStatus2["TriggerBackgrounded"] = "TriggerBackgrounded";
    PrerenderFinalStatus2["MemoryLimitExceeded"] = "MemoryLimitExceeded";
    PrerenderFinalStatus2["DataSaverEnabled"] = "DataSaverEnabled";
    PrerenderFinalStatus2["TriggerUrlHasEffectiveUrl"] = "TriggerUrlHasEffectiveUrl";
    PrerenderFinalStatus2["ActivatedBeforeStarted"] = "ActivatedBeforeStarted";
    PrerenderFinalStatus2["InactivePageRestriction"] = "InactivePageRestriction";
    PrerenderFinalStatus2["StartFailed"] = "StartFailed";
    PrerenderFinalStatus2["TimeoutBackgrounded"] = "TimeoutBackgrounded";
    PrerenderFinalStatus2["CrossSiteRedirectInInitialNavigation"] = "CrossSiteRedirectInInitialNavigation";
    PrerenderFinalStatus2["CrossSiteNavigationInInitialNavigation"] = "CrossSiteNavigationInInitialNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginRedirectNotOptInInInitialNavigation"] = "SameSiteCrossOriginRedirectNotOptInInInitialNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginNavigationNotOptInInInitialNavigation"] = "SameSiteCrossOriginNavigationNotOptInInInitialNavigation";
    PrerenderFinalStatus2["ActivationNavigationParameterMismatch"] = "ActivationNavigationParameterMismatch";
    PrerenderFinalStatus2["ActivatedInBackground"] = "ActivatedInBackground";
    PrerenderFinalStatus2["EmbedderHostDisallowed"] = "EmbedderHostDisallowed";
    PrerenderFinalStatus2["ActivationNavigationDestroyedBeforeSuccess"] = "ActivationNavigationDestroyedBeforeSuccess";
    PrerenderFinalStatus2["TabClosedByUserGesture"] = "TabClosedByUserGesture";
    PrerenderFinalStatus2["TabClosedWithoutUserGesture"] = "TabClosedWithoutUserGesture";
    PrerenderFinalStatus2["PrimaryMainFrameRendererProcessCrashed"] = "PrimaryMainFrameRendererProcessCrashed";
    PrerenderFinalStatus2["PrimaryMainFrameRendererProcessKilled"] = "PrimaryMainFrameRendererProcessKilled";
    PrerenderFinalStatus2["ActivationFramePolicyNotCompatible"] = "ActivationFramePolicyNotCompatible";
    PrerenderFinalStatus2["PreloadingDisabled"] = "PreloadingDisabled";
    PrerenderFinalStatus2["BatterySaverEnabled"] = "BatterySaverEnabled";
    PrerenderFinalStatus2["ActivatedDuringMainFrameNavigation"] = "ActivatedDuringMainFrameNavigation";
    PrerenderFinalStatus2["PreloadingUnsupportedByWebContents"] = "PreloadingUnsupportedByWebContents";
    PrerenderFinalStatus2["CrossSiteRedirectInMainFrameNavigation"] = "CrossSiteRedirectInMainFrameNavigation";
    PrerenderFinalStatus2["CrossSiteNavigationInMainFrameNavigation"] = "CrossSiteNavigationInMainFrameNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation"] = "SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation"] = "SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation";
    PrerenderFinalStatus2["MemoryPressureOnTrigger"] = "MemoryPressureOnTrigger";
    PrerenderFinalStatus2["MemoryPressureAfterTriggered"] = "MemoryPressureAfterTriggered";
    PrerenderFinalStatus2["PrerenderingDisabledByDevTools"] = "PrerenderingDisabledByDevTools";
    PrerenderFinalStatus2["SpeculationRuleRemoved"] = "SpeculationRuleRemoved";
    PrerenderFinalStatus2["ActivatedWithAuxiliaryBrowsingContexts"] = "ActivatedWithAuxiliaryBrowsingContexts";
    PrerenderFinalStatus2["MaxNumOfRunningEagerPrerendersExceeded"] = "MaxNumOfRunningEagerPrerendersExceeded";
    PrerenderFinalStatus2["MaxNumOfRunningNonEagerPrerendersExceeded"] = "MaxNumOfRunningNonEagerPrerendersExceeded";
    PrerenderFinalStatus2["MaxNumOfRunningEmbedderPrerendersExceeded"] = "MaxNumOfRunningEmbedderPrerendersExceeded";
    PrerenderFinalStatus2["PrerenderingUrlHasEffectiveUrl"] = "PrerenderingUrlHasEffectiveUrl";
    PrerenderFinalStatus2["RedirectedPrerenderingUrlHasEffectiveUrl"] = "RedirectedPrerenderingUrlHasEffectiveUrl";
    PrerenderFinalStatus2["ActivationUrlHasEffectiveUrl"] = "ActivationUrlHasEffectiveUrl";
    PrerenderFinalStatus2["JavaScriptInterfaceAdded"] = "JavaScriptInterfaceAdded";
    PrerenderFinalStatus2["JavaScriptInterfaceRemoved"] = "JavaScriptInterfaceRemoved";
    PrerenderFinalStatus2["AllPrerenderingCanceled"] = "AllPrerenderingCanceled";
    PrerenderFinalStatus2["WindowClosed"] = "WindowClosed";
    PrerenderFinalStatus2["SlowNetwork"] = "SlowNetwork";
    PrerenderFinalStatus2["OtherPrerenderedPageActivated"] = "OtherPrerenderedPageActivated";
    PrerenderFinalStatus2["V8OptimizerDisabled"] = "V8OptimizerDisabled";
    PrerenderFinalStatus2["PrerenderFailedDuringPrefetch"] = "PrerenderFailedDuringPrefetch";
    PrerenderFinalStatus2["BrowsingDataRemoved"] = "BrowsingDataRemoved";
    PrerenderFinalStatus2["PrerenderHostReused"] = "PrerenderHostReused";
    PrerenderFinalStatus2["FormSubmitWhenPrerendering"] = "FormSubmitWhenPrerendering";
    PrerenderFinalStatus2["CrossDocumentRestart"] = "CrossDocumentRestart";
  })(PrerenderFinalStatus = Preload2.PrerenderFinalStatus || (Preload2.PrerenderFinalStatus = {}));
  let PreloadingStatus;
  ((PreloadingStatus2) => {
    PreloadingStatus2["Pending"] = "Pending";
    PreloadingStatus2["Running"] = "Running";
    PreloadingStatus2["Ready"] = "Ready";
    PreloadingStatus2["Success"] = "Success";
    PreloadingStatus2["Failure"] = "Failure";
    PreloadingStatus2["NotSupported"] = "NotSupported";
  })(PreloadingStatus = Preload2.PreloadingStatus || (Preload2.PreloadingStatus = {}));
  let PrefetchStatus;
  ((PrefetchStatus2) => {
    PrefetchStatus2["PrefetchAllowed"] = "PrefetchAllowed";
    PrefetchStatus2["PrefetchFailedIneligibleRedirect"] = "PrefetchFailedIneligibleRedirect";
    PrefetchStatus2["PrefetchFailedInvalidRedirect"] = "PrefetchFailedInvalidRedirect";
    PrefetchStatus2["PrefetchFailedMIMENotSupported"] = "PrefetchFailedMIMENotSupported";
    PrefetchStatus2["PrefetchFailedNetError"] = "PrefetchFailedNetError";
    PrefetchStatus2["PrefetchFailedNon2XX"] = "PrefetchFailedNon2XX";
    PrefetchStatus2["PrefetchEvictedAfterBrowsingDataRemoved"] = "PrefetchEvictedAfterBrowsingDataRemoved";
    PrefetchStatus2["PrefetchEvictedAfterCandidateRemoved"] = "PrefetchEvictedAfterCandidateRemoved";
    PrefetchStatus2["PrefetchEvictedForNewerPrefetch"] = "PrefetchEvictedForNewerPrefetch";
    PrefetchStatus2["PrefetchHeldback"] = "PrefetchHeldback";
    PrefetchStatus2["PrefetchIneligibleRetryAfter"] = "PrefetchIneligibleRetryAfter";
    PrefetchStatus2["PrefetchIsPrivacyDecoy"] = "PrefetchIsPrivacyDecoy";
    PrefetchStatus2["PrefetchIsStale"] = "PrefetchIsStale";
    PrefetchStatus2["PrefetchNotEligibleBlockedByConnectionAllowlist"] = "PrefetchNotEligibleBlockedByConnectionAllowlist";
    PrefetchStatus2["PrefetchNotEligibleBrowserContextOffTheRecord"] = "PrefetchNotEligibleBrowserContextOffTheRecord";
    PrefetchStatus2["PrefetchNotEligibleCrossOrigin"] = "PrefetchNotEligibleCrossOrigin";
    PrefetchStatus2["PrefetchNotEligibleDataSaverEnabled"] = "PrefetchNotEligibleDataSaverEnabled";
    PrefetchStatus2["PrefetchNotEligibleExistingProxy"] = "PrefetchNotEligibleExistingProxy";
    PrefetchStatus2["PrefetchNotEligibleHostIsNonUnique"] = "PrefetchNotEligibleHostIsNonUnique";
    PrefetchStatus2["PrefetchNotEligibleNonDefaultStoragePartition"] = "PrefetchNotEligibleNonDefaultStoragePartition";
    PrefetchStatus2["PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy"] = "PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy";
    PrefetchStatus2["PrefetchNotEligibleSchemeIsNotHttps"] = "PrefetchNotEligibleSchemeIsNotHttps";
    PrefetchStatus2["PrefetchNotEligibleUserHasCookies"] = "PrefetchNotEligibleUserHasCookies";
    PrefetchStatus2["PrefetchNotEligibleUserHasServiceWorker"] = "PrefetchNotEligibleUserHasServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler"] = "PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler";
    PrefetchStatus2["PrefetchNotEligibleRedirectFromServiceWorker"] = "PrefetchNotEligibleRedirectFromServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleRedirectToServiceWorker"] = "PrefetchNotEligibleRedirectToServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleBatterySaverEnabled"] = "PrefetchNotEligibleBatterySaverEnabled";
    PrefetchStatus2["PrefetchNotEligiblePreloadingDisabled"] = "PrefetchNotEligiblePreloadingDisabled";
    PrefetchStatus2["PrefetchNotFinishedInTime"] = "PrefetchNotFinishedInTime";
    PrefetchStatus2["PrefetchNotStarted"] = "PrefetchNotStarted";
    PrefetchStatus2["PrefetchNotUsedCookiesChanged"] = "PrefetchNotUsedCookiesChanged";
    PrefetchStatus2["PrefetchProxyNotAvailable"] = "PrefetchProxyNotAvailable";
    PrefetchStatus2["PrefetchResponseUsed"] = "PrefetchResponseUsed";
    PrefetchStatus2["PrefetchSuccessfulButNotUsed"] = "PrefetchSuccessfulButNotUsed";
    PrefetchStatus2["PrefetchNotUsedProbeFailed"] = "PrefetchNotUsedProbeFailed";
    PrefetchStatus2["PrefetchCancelledOnUserNavigation"] = "PrefetchCancelledOnUserNavigation";
  })(PrefetchStatus = Preload2.PrefetchStatus || (Preload2.PrefetchStatus = {}));
})(Preload || (Preload = {}));
var Security;
((Security2) => {
  let MixedContentType;
  ((MixedContentType2) => {
    MixedContentType2["Blockable"] = "blockable";
    MixedContentType2["OptionallyBlockable"] = "optionally-blockable";
    MixedContentType2["None"] = "none";
  })(MixedContentType = Security2.MixedContentType || (Security2.MixedContentType = {}));
  let SecurityState;
  ((SecurityState2) => {
    SecurityState2["Unknown"] = "unknown";
    SecurityState2["Neutral"] = "neutral";
    SecurityState2["Insecure"] = "insecure";
    SecurityState2["Secure"] = "secure";
    SecurityState2["Info"] = "info";
    SecurityState2["InsecureBroken"] = "insecure-broken";
  })(SecurityState = Security2.SecurityState || (Security2.SecurityState = {}));
  let SafetyTipStatus;
  ((SafetyTipStatus2) => {
    SafetyTipStatus2["BadReputation"] = "badReputation";
    SafetyTipStatus2["Lookalike"] = "lookalike";
  })(SafetyTipStatus = Security2.SafetyTipStatus || (Security2.SafetyTipStatus = {}));
  let CertificateErrorAction;
  ((CertificateErrorAction2) => {
    CertificateErrorAction2["Continue"] = "continue";
    CertificateErrorAction2["Cancel"] = "cancel";
  })(CertificateErrorAction = Security2.CertificateErrorAction || (Security2.CertificateErrorAction = {}));
})(Security || (Security = {}));
var ServiceWorker;
((ServiceWorker2) => {
  let ServiceWorkerVersionRunningStatus;
  ((ServiceWorkerVersionRunningStatus2) => {
    ServiceWorkerVersionRunningStatus2["Stopped"] = "stopped";
    ServiceWorkerVersionRunningStatus2["Starting"] = "starting";
    ServiceWorkerVersionRunningStatus2["Running"] = "running";
    ServiceWorkerVersionRunningStatus2["Stopping"] = "stopping";
  })(ServiceWorkerVersionRunningStatus = ServiceWorker2.ServiceWorkerVersionRunningStatus || (ServiceWorker2.ServiceWorkerVersionRunningStatus = {}));
  let ServiceWorkerVersionStatus;
  ((ServiceWorkerVersionStatus2) => {
    ServiceWorkerVersionStatus2["New"] = "new";
    ServiceWorkerVersionStatus2["Installing"] = "installing";
    ServiceWorkerVersionStatus2["Installed"] = "installed";
    ServiceWorkerVersionStatus2["Activating"] = "activating";
    ServiceWorkerVersionStatus2["Activated"] = "activated";
    ServiceWorkerVersionStatus2["Redundant"] = "redundant";
  })(ServiceWorkerVersionStatus = ServiceWorker2.ServiceWorkerVersionStatus || (ServiceWorker2.ServiceWorkerVersionStatus = {}));
  let ServiceWorkerRouterSourceType;
  ((ServiceWorkerRouterSourceType2) => {
    ServiceWorkerRouterSourceType2["Cache"] = "cache";
    ServiceWorkerRouterSourceType2["FetchEvent"] = "fetchEvent";
    ServiceWorkerRouterSourceType2["Network"] = "network";
    ServiceWorkerRouterSourceType2["RaceNetworkAndFetchHandler"] = "raceNetworkAndFetchHandler";
    ServiceWorkerRouterSourceType2["RaceNetworkAndCache"] = "raceNetworkAndCache";
    ServiceWorkerRouterSourceType2["SourceDict"] = "sourceDict";
  })(ServiceWorkerRouterSourceType = ServiceWorker2.ServiceWorkerRouterSourceType || (ServiceWorker2.ServiceWorkerRouterSourceType = {}));
})(ServiceWorker || (ServiceWorker = {}));
var SmartCardEmulation;
((SmartCardEmulation2) => {
  let ResultCode;
  ((ResultCode2) => {
    ResultCode2["Success"] = "success";
    ResultCode2["RemovedCard"] = "removed-card";
    ResultCode2["ResetCard"] = "reset-card";
    ResultCode2["UnpoweredCard"] = "unpowered-card";
    ResultCode2["UnresponsiveCard"] = "unresponsive-card";
    ResultCode2["UnsupportedCard"] = "unsupported-card";
    ResultCode2["ReaderUnavailable"] = "reader-unavailable";
    ResultCode2["SharingViolation"] = "sharing-violation";
    ResultCode2["NotTransacted"] = "not-transacted";
    ResultCode2["NoSmartcard"] = "no-smartcard";
    ResultCode2["ProtoMismatch"] = "proto-mismatch";
    ResultCode2["SystemCancelled"] = "system-cancelled";
    ResultCode2["NotReady"] = "not-ready";
    ResultCode2["Cancelled"] = "cancelled";
    ResultCode2["InsufficientBuffer"] = "insufficient-buffer";
    ResultCode2["InvalidHandle"] = "invalid-handle";
    ResultCode2["InvalidParameter"] = "invalid-parameter";
    ResultCode2["InvalidValue"] = "invalid-value";
    ResultCode2["NoMemory"] = "no-memory";
    ResultCode2["Timeout"] = "timeout";
    ResultCode2["UnknownReader"] = "unknown-reader";
    ResultCode2["UnsupportedFeature"] = "unsupported-feature";
    ResultCode2["NoReadersAvailable"] = "no-readers-available";
    ResultCode2["ServiceStopped"] = "service-stopped";
    ResultCode2["NoService"] = "no-service";
    ResultCode2["CommError"] = "comm-error";
    ResultCode2["InternalError"] = "internal-error";
    ResultCode2["ServerTooBusy"] = "server-too-busy";
    ResultCode2["Unexpected"] = "unexpected";
    ResultCode2["Shutdown"] = "shutdown";
    ResultCode2["UnknownCard"] = "unknown-card";
    ResultCode2["Unknown"] = "unknown";
  })(ResultCode = SmartCardEmulation2.ResultCode || (SmartCardEmulation2.ResultCode = {}));
  let ShareMode;
  ((ShareMode2) => {
    ShareMode2["Shared"] = "shared";
    ShareMode2["Exclusive"] = "exclusive";
    ShareMode2["Direct"] = "direct";
  })(ShareMode = SmartCardEmulation2.ShareMode || (SmartCardEmulation2.ShareMode = {}));
  let Disposition;
  ((Disposition2) => {
    Disposition2["LeaveCard"] = "leave-card";
    Disposition2["ResetCard"] = "reset-card";
    Disposition2["UnpowerCard"] = "unpower-card";
    Disposition2["EjectCard"] = "eject-card";
  })(Disposition = SmartCardEmulation2.Disposition || (SmartCardEmulation2.Disposition = {}));
  let ConnectionState;
  ((ConnectionState2) => {
    ConnectionState2["Absent"] = "absent";
    ConnectionState2["Present"] = "present";
    ConnectionState2["Swallowed"] = "swallowed";
    ConnectionState2["Powered"] = "powered";
    ConnectionState2["Negotiable"] = "negotiable";
    ConnectionState2["Specific"] = "specific";
  })(ConnectionState = SmartCardEmulation2.ConnectionState || (SmartCardEmulation2.ConnectionState = {}));
  let Protocol;
  ((Protocol2) => {
    Protocol2["T0"] = "t0";
    Protocol2["T1"] = "t1";
    Protocol2["Raw"] = "raw";
  })(Protocol = SmartCardEmulation2.Protocol || (SmartCardEmulation2.Protocol = {}));
})(SmartCardEmulation || (SmartCardEmulation = {}));
var Storage;
((Storage2) => {
  let StorageType;
  ((StorageType2) => {
    StorageType2["Cookies"] = "cookies";
    StorageType2["File_systems"] = "file_systems";
    StorageType2["Indexeddb"] = "indexeddb";
    StorageType2["Local_storage"] = "local_storage";
    StorageType2["Shader_cache"] = "shader_cache";
    StorageType2["Websql"] = "websql";
    StorageType2["Service_workers"] = "service_workers";
    StorageType2["Cache_storage"] = "cache_storage";
    StorageType2["Storage_buckets"] = "storage_buckets";
    StorageType2["All"] = "all";
    StorageType2["Other"] = "other";
  })(StorageType = Storage2.StorageType || (Storage2.StorageType = {}));
  let StorageBucketsDurability;
  ((StorageBucketsDurability2) => {
    StorageBucketsDurability2["Relaxed"] = "relaxed";
    StorageBucketsDurability2["Strict"] = "strict";
  })(StorageBucketsDurability = Storage2.StorageBucketsDurability || (Storage2.StorageBucketsDurability = {}));
})(Storage || (Storage = {}));
var SystemInfo;
((SystemInfo2) => {
  let SubsamplingFormat;
  ((SubsamplingFormat2) => {
    SubsamplingFormat2["Yuv420"] = "yuv420";
    SubsamplingFormat2["Yuv422"] = "yuv422";
    SubsamplingFormat2["Yuv444"] = "yuv444";
  })(SubsamplingFormat = SystemInfo2.SubsamplingFormat || (SystemInfo2.SubsamplingFormat = {}));
  let ImageType;
  ((ImageType2) => {
    ImageType2["Jpeg"] = "jpeg";
    ImageType2["Webp"] = "webp";
    ImageType2["Unknown"] = "unknown";
  })(ImageType = SystemInfo2.ImageType || (SystemInfo2.ImageType = {}));
})(SystemInfo || (SystemInfo = {}));
var Target3;
((Target4) => {
  let WindowState;
  ((WindowState2) => {
    WindowState2["Normal"] = "normal";
    WindowState2["Minimized"] = "minimized";
    WindowState2["Maximized"] = "maximized";
    WindowState2["Fullscreen"] = "fullscreen";
  })(WindowState = Target4.WindowState || (Target4.WindowState = {}));
})(Target3 || (Target3 = {}));
var Tracing;
((Tracing2) => {
  let TraceConfigRecordMode;
  ((TraceConfigRecordMode2) => {
    TraceConfigRecordMode2["RecordUntilFull"] = "recordUntilFull";
    TraceConfigRecordMode2["RecordContinuously"] = "recordContinuously";
    TraceConfigRecordMode2["RecordAsMuchAsPossible"] = "recordAsMuchAsPossible";
    TraceConfigRecordMode2["EchoToConsole"] = "echoToConsole";
  })(TraceConfigRecordMode = Tracing2.TraceConfigRecordMode || (Tracing2.TraceConfigRecordMode = {}));
  let StreamFormat;
  ((StreamFormat2) => {
    StreamFormat2["Json"] = "json";
    StreamFormat2["Proto"] = "proto";
  })(StreamFormat = Tracing2.StreamFormat || (Tracing2.StreamFormat = {}));
  let StreamCompression;
  ((StreamCompression2) => {
    StreamCompression2["None"] = "none";
    StreamCompression2["Gzip"] = "gzip";
  })(StreamCompression = Tracing2.StreamCompression || (Tracing2.StreamCompression = {}));
  let MemoryDumpLevelOfDetail;
  ((MemoryDumpLevelOfDetail2) => {
    MemoryDumpLevelOfDetail2["Background"] = "background";
    MemoryDumpLevelOfDetail2["Light"] = "light";
    MemoryDumpLevelOfDetail2["Detailed"] = "detailed";
  })(MemoryDumpLevelOfDetail = Tracing2.MemoryDumpLevelOfDetail || (Tracing2.MemoryDumpLevelOfDetail = {}));
  let TracingBackend;
  ((TracingBackend2) => {
    TracingBackend2["Auto"] = "auto";
    TracingBackend2["Chrome"] = "chrome";
    TracingBackend2["System"] = "system";
  })(TracingBackend = Tracing2.TracingBackend || (Tracing2.TracingBackend = {}));
  let StartRequestTransferMode;
  ((StartRequestTransferMode2) => {
    StartRequestTransferMode2["ReportEvents"] = "ReportEvents";
    StartRequestTransferMode2["ReturnAsStream"] = "ReturnAsStream";
  })(StartRequestTransferMode = Tracing2.StartRequestTransferMode || (Tracing2.StartRequestTransferMode = {}));
})(Tracing || (Tracing = {}));
var WebAudio;
((WebAudio2) => {
  let ContextType;
  ((ContextType2) => {
    ContextType2["Realtime"] = "realtime";
    ContextType2["Offline"] = "offline";
  })(ContextType = WebAudio2.ContextType || (WebAudio2.ContextType = {}));
  let ContextState;
  ((ContextState2) => {
    ContextState2["Suspended"] = "suspended";
    ContextState2["Running"] = "running";
    ContextState2["Closed"] = "closed";
    ContextState2["Interrupted"] = "interrupted";
  })(ContextState = WebAudio2.ContextState || (WebAudio2.ContextState = {}));
  let ChannelCountMode;
  ((ChannelCountMode2) => {
    ChannelCountMode2["ClampedMax"] = "clamped-max";
    ChannelCountMode2["Explicit"] = "explicit";
    ChannelCountMode2["Max"] = "max";
  })(ChannelCountMode = WebAudio2.ChannelCountMode || (WebAudio2.ChannelCountMode = {}));
  let ChannelInterpretation;
  ((ChannelInterpretation2) => {
    ChannelInterpretation2["Discrete"] = "discrete";
    ChannelInterpretation2["Speakers"] = "speakers";
  })(ChannelInterpretation = WebAudio2.ChannelInterpretation || (WebAudio2.ChannelInterpretation = {}));
  let AutomationRate;
  ((AutomationRate2) => {
    AutomationRate2["ARate"] = "a-rate";
    AutomationRate2["KRate"] = "k-rate";
  })(AutomationRate = WebAudio2.AutomationRate || (WebAudio2.AutomationRate = {}));
})(WebAudio || (WebAudio = {}));
var WebAuthn;
((WebAuthn2) => {
  let AuthenticatorProtocol;
  ((AuthenticatorProtocol2) => {
    AuthenticatorProtocol2["U2f"] = "u2f";
    AuthenticatorProtocol2["Ctap2"] = "ctap2";
  })(AuthenticatorProtocol = WebAuthn2.AuthenticatorProtocol || (WebAuthn2.AuthenticatorProtocol = {}));
  let Ctap2Version;
  ((Ctap2Version2) => {
    Ctap2Version2["Ctap2_0"] = "ctap2_0";
    Ctap2Version2["Ctap2_1"] = "ctap2_1";
    Ctap2Version2["Ctap2_2"] = "ctap2_2";
  })(Ctap2Version = WebAuthn2.Ctap2Version || (WebAuthn2.Ctap2Version = {}));
  let AuthenticatorTransport;
  ((AuthenticatorTransport2) => {
    AuthenticatorTransport2["Usb"] = "usb";
    AuthenticatorTransport2["Nfc"] = "nfc";
    AuthenticatorTransport2["Ble"] = "ble";
    AuthenticatorTransport2["Cable"] = "cable";
    AuthenticatorTransport2["Hybrid"] = "hybrid";
    AuthenticatorTransport2["SmartCard"] = "smart-card";
    AuthenticatorTransport2["Internal"] = "internal";
  })(AuthenticatorTransport = WebAuthn2.AuthenticatorTransport || (WebAuthn2.AuthenticatorTransport = {}));
})(WebAuthn || (WebAuthn = {}));
var WebMCP;
((WebMCP2) => {
  let InvocationStatus;
  ((InvocationStatus2) => {
    InvocationStatus2["Completed"] = "Completed";
    InvocationStatus2["Canceled"] = "Canceled";
    InvocationStatus2["Error"] = "Error";
  })(InvocationStatus = WebMCP2.InvocationStatus || (WebMCP2.InvocationStatus = {}));
})(WebMCP || (WebMCP = {}));
var Debugger;
((Debugger2) => {
  let ScopeType;
  ((ScopeType2) => {
    ScopeType2["Global"] = "global";
    ScopeType2["Local"] = "local";
    ScopeType2["With"] = "with";
    ScopeType2["Closure"] = "closure";
    ScopeType2["Catch"] = "catch";
    ScopeType2["Block"] = "block";
    ScopeType2["Script"] = "script";
    ScopeType2["Eval"] = "eval";
    ScopeType2["Module"] = "module";
    ScopeType2["WasmExpressionStack"] = "wasm-expression-stack";
  })(ScopeType = Debugger2.ScopeType || (Debugger2.ScopeType = {}));
  let BreakLocationType;
  ((BreakLocationType2) => {
    BreakLocationType2["DebuggerStatement"] = "debuggerStatement";
    BreakLocationType2["Call"] = "call";
    BreakLocationType2["Return"] = "return";
  })(BreakLocationType = Debugger2.BreakLocationType || (Debugger2.BreakLocationType = {}));
  let ScriptLanguage;
  ((ScriptLanguage2) => {
    ScriptLanguage2["JavaScript"] = "JavaScript";
    ScriptLanguage2["WebAssembly"] = "WebAssembly";
  })(ScriptLanguage = Debugger2.ScriptLanguage || (Debugger2.ScriptLanguage = {}));
  let DebugSymbolsType;
  ((DebugSymbolsType2) => {
    DebugSymbolsType2["SourceMap"] = "SourceMap";
    DebugSymbolsType2["EmbeddedDWARF"] = "EmbeddedDWARF";
    DebugSymbolsType2["ExternalDWARF"] = "ExternalDWARF";
  })(DebugSymbolsType = Debugger2.DebugSymbolsType || (Debugger2.DebugSymbolsType = {}));
  let ContinueToLocationRequestTargetCallFrames;
  ((ContinueToLocationRequestTargetCallFrames2) => {
    ContinueToLocationRequestTargetCallFrames2["Any"] = "any";
    ContinueToLocationRequestTargetCallFrames2["Current"] = "current";
  })(ContinueToLocationRequestTargetCallFrames = Debugger2.ContinueToLocationRequestTargetCallFrames || (Debugger2.ContinueToLocationRequestTargetCallFrames = {}));
  let RestartFrameRequestMode;
  ((RestartFrameRequestMode2) => {
    RestartFrameRequestMode2["StepInto"] = "StepInto";
  })(RestartFrameRequestMode = Debugger2.RestartFrameRequestMode || (Debugger2.RestartFrameRequestMode = {}));
  let SetInstrumentationBreakpointRequestInstrumentation;
  ((SetInstrumentationBreakpointRequestInstrumentation2) => {
    SetInstrumentationBreakpointRequestInstrumentation2["BeforeScriptExecution"] = "beforeScriptExecution";
    SetInstrumentationBreakpointRequestInstrumentation2["BeforeScriptWithSourceMapExecution"] = "beforeScriptWithSourceMapExecution";
  })(SetInstrumentationBreakpointRequestInstrumentation = Debugger2.SetInstrumentationBreakpointRequestInstrumentation || (Debugger2.SetInstrumentationBreakpointRequestInstrumentation = {}));
  let SetPauseOnExceptionsRequestState;
  ((SetPauseOnExceptionsRequestState2) => {
    SetPauseOnExceptionsRequestState2["None"] = "none";
    SetPauseOnExceptionsRequestState2["Caught"] = "caught";
    SetPauseOnExceptionsRequestState2["Uncaught"] = "uncaught";
    SetPauseOnExceptionsRequestState2["All"] = "all";
  })(SetPauseOnExceptionsRequestState = Debugger2.SetPauseOnExceptionsRequestState || (Debugger2.SetPauseOnExceptionsRequestState = {}));
  let SetScriptSourceResponseStatus;
  ((SetScriptSourceResponseStatus2) => {
    SetScriptSourceResponseStatus2["Ok"] = "Ok";
    SetScriptSourceResponseStatus2["CompileError"] = "CompileError";
    SetScriptSourceResponseStatus2["BlockedByActiveGenerator"] = "BlockedByActiveGenerator";
    SetScriptSourceResponseStatus2["BlockedByActiveFunction"] = "BlockedByActiveFunction";
    SetScriptSourceResponseStatus2["BlockedByTopLevelEsModuleChange"] = "BlockedByTopLevelEsModuleChange";
  })(SetScriptSourceResponseStatus = Debugger2.SetScriptSourceResponseStatus || (Debugger2.SetScriptSourceResponseStatus = {}));
  let PausedEventReason;
  ((PausedEventReason2) => {
    PausedEventReason2["Ambiguous"] = "ambiguous";
    PausedEventReason2["Assert"] = "assert";
    PausedEventReason2["CSPViolation"] = "CSPViolation";
    PausedEventReason2["DebugCommand"] = "debugCommand";
    PausedEventReason2["DOM"] = "DOM";
    PausedEventReason2["EventListener"] = "EventListener";
    PausedEventReason2["Exception"] = "exception";
    PausedEventReason2["Instrumentation"] = "instrumentation";
    PausedEventReason2["OOM"] = "OOM";
    PausedEventReason2["Other"] = "other";
    PausedEventReason2["PromiseRejection"] = "promiseRejection";
    PausedEventReason2["XHR"] = "XHR";
    PausedEventReason2["Step"] = "step";
  })(PausedEventReason = Debugger2.PausedEventReason || (Debugger2.PausedEventReason = {}));
})(Debugger || (Debugger = {}));
var Runtime;
((Runtime2) => {
  let SerializationOptionsSerialization;
  ((SerializationOptionsSerialization2) => {
    SerializationOptionsSerialization2["Deep"] = "deep";
    SerializationOptionsSerialization2["Json"] = "json";
    SerializationOptionsSerialization2["IdOnly"] = "idOnly";
  })(SerializationOptionsSerialization = Runtime2.SerializationOptionsSerialization || (Runtime2.SerializationOptionsSerialization = {}));
  let DeepSerializedValueType;
  ((DeepSerializedValueType2) => {
    DeepSerializedValueType2["Undefined"] = "undefined";
    DeepSerializedValueType2["Null"] = "null";
    DeepSerializedValueType2["String"] = "string";
    DeepSerializedValueType2["Number"] = "number";
    DeepSerializedValueType2["Boolean"] = "boolean";
    DeepSerializedValueType2["Bigint"] = "bigint";
    DeepSerializedValueType2["Regexp"] = "regexp";
    DeepSerializedValueType2["Date"] = "date";
    DeepSerializedValueType2["Symbol"] = "symbol";
    DeepSerializedValueType2["Array"] = "array";
    DeepSerializedValueType2["Object"] = "object";
    DeepSerializedValueType2["Function"] = "function";
    DeepSerializedValueType2["Map"] = "map";
    DeepSerializedValueType2["Set"] = "set";
    DeepSerializedValueType2["Weakmap"] = "weakmap";
    DeepSerializedValueType2["Weakset"] = "weakset";
    DeepSerializedValueType2["Error"] = "error";
    DeepSerializedValueType2["Proxy"] = "proxy";
    DeepSerializedValueType2["Promise"] = "promise";
    DeepSerializedValueType2["Typedarray"] = "typedarray";
    DeepSerializedValueType2["Arraybuffer"] = "arraybuffer";
    DeepSerializedValueType2["Node"] = "node";
    DeepSerializedValueType2["Window"] = "window";
    DeepSerializedValueType2["Generator"] = "generator";
  })(DeepSerializedValueType = Runtime2.DeepSerializedValueType || (Runtime2.DeepSerializedValueType = {}));
  let RemoteObjectType;
  ((RemoteObjectType2) => {
    RemoteObjectType2["Object"] = "object";
    RemoteObjectType2["Function"] = "function";
    RemoteObjectType2["Undefined"] = "undefined";
    RemoteObjectType2["String"] = "string";
    RemoteObjectType2["Number"] = "number";
    RemoteObjectType2["Boolean"] = "boolean";
    RemoteObjectType2["Symbol"] = "symbol";
    RemoteObjectType2["Bigint"] = "bigint";
  })(RemoteObjectType = Runtime2.RemoteObjectType || (Runtime2.RemoteObjectType = {}));
  let RemoteObjectSubtype;
  ((RemoteObjectSubtype2) => {
    RemoteObjectSubtype2["Array"] = "array";
    RemoteObjectSubtype2["Null"] = "null";
    RemoteObjectSubtype2["Node"] = "node";
    RemoteObjectSubtype2["Regexp"] = "regexp";
    RemoteObjectSubtype2["Date"] = "date";
    RemoteObjectSubtype2["Map"] = "map";
    RemoteObjectSubtype2["Set"] = "set";
    RemoteObjectSubtype2["Weakmap"] = "weakmap";
    RemoteObjectSubtype2["Weakset"] = "weakset";
    RemoteObjectSubtype2["Iterator"] = "iterator";
    RemoteObjectSubtype2["Generator"] = "generator";
    RemoteObjectSubtype2["Error"] = "error";
    RemoteObjectSubtype2["Proxy"] = "proxy";
    RemoteObjectSubtype2["Promise"] = "promise";
    RemoteObjectSubtype2["Typedarray"] = "typedarray";
    RemoteObjectSubtype2["Arraybuffer"] = "arraybuffer";
    RemoteObjectSubtype2["Dataview"] = "dataview";
    RemoteObjectSubtype2["Webassemblymemory"] = "webassemblymemory";
    RemoteObjectSubtype2["Wasmvalue"] = "wasmvalue";
    RemoteObjectSubtype2["Trustedtype"] = "trustedtype";
  })(RemoteObjectSubtype = Runtime2.RemoteObjectSubtype || (Runtime2.RemoteObjectSubtype = {}));
  let ObjectPreviewType;
  ((ObjectPreviewType2) => {
    ObjectPreviewType2["Object"] = "object";
    ObjectPreviewType2["Function"] = "function";
    ObjectPreviewType2["Undefined"] = "undefined";
    ObjectPreviewType2["String"] = "string";
    ObjectPreviewType2["Number"] = "number";
    ObjectPreviewType2["Boolean"] = "boolean";
    ObjectPreviewType2["Symbol"] = "symbol";
    ObjectPreviewType2["Bigint"] = "bigint";
  })(ObjectPreviewType = Runtime2.ObjectPreviewType || (Runtime2.ObjectPreviewType = {}));
  let ObjectPreviewSubtype;
  ((ObjectPreviewSubtype2) => {
    ObjectPreviewSubtype2["Array"] = "array";
    ObjectPreviewSubtype2["Null"] = "null";
    ObjectPreviewSubtype2["Node"] = "node";
    ObjectPreviewSubtype2["Regexp"] = "regexp";
    ObjectPreviewSubtype2["Date"] = "date";
    ObjectPreviewSubtype2["Map"] = "map";
    ObjectPreviewSubtype2["Set"] = "set";
    ObjectPreviewSubtype2["Weakmap"] = "weakmap";
    ObjectPreviewSubtype2["Weakset"] = "weakset";
    ObjectPreviewSubtype2["Iterator"] = "iterator";
    ObjectPreviewSubtype2["Generator"] = "generator";
    ObjectPreviewSubtype2["Error"] = "error";
    ObjectPreviewSubtype2["Proxy"] = "proxy";
    ObjectPreviewSubtype2["Promise"] = "promise";
    ObjectPreviewSubtype2["Typedarray"] = "typedarray";
    ObjectPreviewSubtype2["Arraybuffer"] = "arraybuffer";
    ObjectPreviewSubtype2["Dataview"] = "dataview";
    ObjectPreviewSubtype2["Webassemblymemory"] = "webassemblymemory";
    ObjectPreviewSubtype2["Wasmvalue"] = "wasmvalue";
    ObjectPreviewSubtype2["Trustedtype"] = "trustedtype";
  })(ObjectPreviewSubtype = Runtime2.ObjectPreviewSubtype || (Runtime2.ObjectPreviewSubtype = {}));
  let PropertyPreviewType;
  ((PropertyPreviewType2) => {
    PropertyPreviewType2["Object"] = "object";
    PropertyPreviewType2["Function"] = "function";
    PropertyPreviewType2["Undefined"] = "undefined";
    PropertyPreviewType2["String"] = "string";
    PropertyPreviewType2["Number"] = "number";
    PropertyPreviewType2["Boolean"] = "boolean";
    PropertyPreviewType2["Symbol"] = "symbol";
    PropertyPreviewType2["Accessor"] = "accessor";
    PropertyPreviewType2["Bigint"] = "bigint";
  })(PropertyPreviewType = Runtime2.PropertyPreviewType || (Runtime2.PropertyPreviewType = {}));
  let PropertyPreviewSubtype;
  ((PropertyPreviewSubtype2) => {
    PropertyPreviewSubtype2["Array"] = "array";
    PropertyPreviewSubtype2["Null"] = "null";
    PropertyPreviewSubtype2["Node"] = "node";
    PropertyPreviewSubtype2["Regexp"] = "regexp";
    PropertyPreviewSubtype2["Date"] = "date";
    PropertyPreviewSubtype2["Map"] = "map";
    PropertyPreviewSubtype2["Set"] = "set";
    PropertyPreviewSubtype2["Weakmap"] = "weakmap";
    PropertyPreviewSubtype2["Weakset"] = "weakset";
    PropertyPreviewSubtype2["Iterator"] = "iterator";
    PropertyPreviewSubtype2["Generator"] = "generator";
    PropertyPreviewSubtype2["Error"] = "error";
    PropertyPreviewSubtype2["Proxy"] = "proxy";
    PropertyPreviewSubtype2["Promise"] = "promise";
    PropertyPreviewSubtype2["Typedarray"] = "typedarray";
    PropertyPreviewSubtype2["Arraybuffer"] = "arraybuffer";
    PropertyPreviewSubtype2["Dataview"] = "dataview";
    PropertyPreviewSubtype2["Webassemblymemory"] = "webassemblymemory";
    PropertyPreviewSubtype2["Wasmvalue"] = "wasmvalue";
    PropertyPreviewSubtype2["Trustedtype"] = "trustedtype";
  })(PropertyPreviewSubtype = Runtime2.PropertyPreviewSubtype || (Runtime2.PropertyPreviewSubtype = {}));
  let ConsoleAPICalledEventType;
  ((ConsoleAPICalledEventType2) => {
    ConsoleAPICalledEventType2["Log"] = "log";
    ConsoleAPICalledEventType2["Debug"] = "debug";
    ConsoleAPICalledEventType2["Info"] = "info";
    ConsoleAPICalledEventType2["Error"] = "error";
    ConsoleAPICalledEventType2["Warning"] = "warning";
    ConsoleAPICalledEventType2["Dir"] = "dir";
    ConsoleAPICalledEventType2["DirXML"] = "dirxml";
    ConsoleAPICalledEventType2["Table"] = "table";
    ConsoleAPICalledEventType2["Trace"] = "trace";
    ConsoleAPICalledEventType2["Clear"] = "clear";
    ConsoleAPICalledEventType2["StartGroup"] = "startGroup";
    ConsoleAPICalledEventType2["StartGroupCollapsed"] = "startGroupCollapsed";
    ConsoleAPICalledEventType2["EndGroup"] = "endGroup";
    ConsoleAPICalledEventType2["Assert"] = "assert";
    ConsoleAPICalledEventType2["Profile"] = "profile";
    ConsoleAPICalledEventType2["ProfileEnd"] = "profileEnd";
    ConsoleAPICalledEventType2["Count"] = "count";
    ConsoleAPICalledEventType2["TimeEnd"] = "timeEnd";
  })(ConsoleAPICalledEventType = Runtime2.ConsoleAPICalledEventType || (Runtime2.ConsoleAPICalledEventType = {}));
})(Runtime || (Runtime = {}));

// ../../front_end/models/persistence/NetworkPersistenceManager.ts
import * as Breakpoints from "../breakpoints/breakpoints.js";
import * as Workspace9 from "../workspace/workspace.js";
var forbiddenUrls = ["chromewebstore.google.com", "chrome.google.com"];
var persistenceNetworkOverridesEnabledSettingDescriptor = {
  name: "persistence-network-overrides-enabled",
  type: Common9.Settings.SettingType.BOOLEAN,
  defaultValue: false
};
var NetworkPersistenceManager = class _NetworkPersistenceManager extends Common9.ObjectWrapper.ObjectWrapper {
  #bindings = /* @__PURE__ */ new WeakMap();
  #originalResponseContentPromises = /* @__PURE__ */ new WeakMap();
  #savingForOverrides = /* @__PURE__ */ new WeakSet();
  #enabledSetting;
  #workspace;
  #persistence;
  #breakpointManager;
  #targetManager;
  #settings;
  #isolatedFileSystemManager;
  #multitargetNetworkManager;
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
  constructor(workspace, persistence, breakpointManager, targetManager, settings, isolatedFileSystemManager, multitargetNetworkManager) {
    super();
    this.#workspace = workspace;
    this.#persistence = persistence;
    this.#breakpointManager = breakpointManager;
    this.#targetManager = targetManager;
    this.#settings = settings;
    this.#isolatedFileSystemManager = isolatedFileSystemManager;
    this.#multitargetNetworkManager = multitargetNetworkManager;
    this.#enabledSetting = this.#settings.resolve(persistenceNetworkOverridesEnabledSettingDescriptor);
    this.#enabledSetting.addChangeListener(this.enabledChanged, this);
    this.#interceptionHandlerBound = this.interceptionHandler.bind(this);
    this.#workspace.addEventListener(Workspace9.Workspace.Events.ProjectAdded, (event) => {
      void this.onProjectAdded(event.data);
    });
    this.#workspace.addEventListener(Workspace9.Workspace.Events.ProjectRemoved, (event) => {
      void this.onProjectRemoved(event.data);
    });
    this.#persistence.addNetworkInterceptor(this.canHandleNetworkUISourceCode.bind(this));
    this.#breakpointManager.addUpdateBindingsCallback(this.networkUISourceCodeAdded.bind(this));
    void this.enabledChanged();
    this.#targetManager.observeTargets(this);
  }
  targetAdded() {
    void this.updateActiveProject();
  }
  targetRemoved() {
    void this.updateActiveProject();
  }
  static instance(opts = { forceNew: null, workspace: null }) {
    const { forceNew, workspace } = opts;
    if (!Root5.DevToolsContext.globalInstance().has(_NetworkPersistenceManager) || forceNew) {
      if (!workspace) {
        throw new Error("Missing workspace for NetworkPersistenceManager");
      }
      Root5.DevToolsContext.globalInstance().set(
        _NetworkPersistenceManager,
        new _NetworkPersistenceManager(
          workspace,
          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
          PersistenceImpl.instance(),
          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
          Breakpoints.BreakpointManager.BreakpointManager.instance(),
          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
          SDK3.TargetManager.TargetManager.instance(),
          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
          Common9.Settings.Settings.instance(),
          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
          IsolatedFileSystemManager.instance(),
          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
          SDK3.NetworkManager.MultitargetNetworkManager.instance()
        )
      );
    }
    return Root5.DevToolsContext.globalInstance().get(_NetworkPersistenceManager);
  }
  static removeInstance() {
    Root5.DevToolsContext.globalInstance().delete(_NetworkPersistenceManager);
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
        this.#workspace.addEventListener(
          Workspace9.Workspace.Events.UISourceCodeRenamed,
          (event) => {
            void this.uiSourceCodeRenamedListener(event);
          }
        ),
        this.#workspace.addEventListener(
          Workspace9.Workspace.Events.UISourceCodeAdded,
          (event) => {
            void this.uiSourceCodeAdded(event);
          }
        ),
        this.#workspace.addEventListener(
          Workspace9.Workspace.Events.UISourceCodeRemoved,
          (event) => {
            void this.uiSourceCodeRemovedListener(event);
          }
        ),
        this.#workspace.addEventListener(
          Workspace9.Workspace.Events.WorkingCopyCommitted,
          (event) => this.onUISourceCodeWorkingCopyCommitted(event.data.uiSourceCode)
        )
      ];
      await this.updateActiveProject();
    } else {
      Host8.userMetrics.actionTaken(Host8.UserMetrics.Action.PersistenceNetworkOverridesDisabled);
      Common9.EventTarget.removeEventListeners(this.#eventDescriptors);
      await this.updateActiveProject();
    }
    this.dispatchEventToListeners("LocalOverridesProjectUpdated" /* LOCAL_OVERRIDES_PROJECT_UPDATED */, this.#enabled);
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
    this.#active = Boolean(this.#enabledSetting.get() && this.#targetManager.rootTarget() && this.#project);
    if (this.#active === wasActive) {
      return;
    }
    if (this.#active && this.#project) {
      await Promise.all(
        [...this.#project.uiSourceCodes()].map((uiSourceCode) => this.filesystemUISourceCodeAdded(uiSourceCode))
      );
      const networkProjects = this.#workspace.projectsForType(Workspace9.Workspace.projectTypes.Network);
      for (const networkProject of networkProjects) {
        await Promise.all(
          [...networkProject.uiSourceCodes()].map((uiSourceCode) => this.networkUISourceCodeAdded(uiSourceCode))
        );
      }
    } else if (this.#project) {
      await Promise.all(
        [...this.#project.uiSourceCodes()].map((uiSourceCode) => this.filesystemUISourceCodeRemoved(uiSourceCode))
      );
      this.#networkUISourceCodeForEncodedPath.clear();
    }
    this.#persistence.refreshAutomapping();
  }
  encodedPathFromUrl(url, ignoreInactive) {
    return Common9.ParsedURL.ParsedURL.rawPathToEncodedPathString(this.rawPathFromUrl(url, ignoreInactive));
  }
  rawPathFromUrl(url, ignoreInactive) {
    if (!this.#active && !ignoreInactive || !this.#project) {
      return Platform11.DevToolsPath.EmptyRawPathString;
    }
    if (_NetworkPersistenceManager.isForbiddenNetworkUrl(url)) {
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
      if (encodedName === "..") {
        encodedName = "%2E%2E";
      }
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
    const encodedPath = this.encodedPathFromUrl(url, ignoreInactive);
    if (!encodedPath) {
      return Platform11.DevToolsPath.EmptyUrlString;
    }
    return Common9.ParsedURL.ParsedURL.concatenate(this.#project.fileSystemPath(), "/", encodedPath);
  }
  getHeadersUISourceCodeFromUrl(url) {
    const fileUrlFromRequest = this.fileUrlFromNetworkUrl(
      url,
      /* ignoreNoActive */
      true
    );
    if (!fileUrlFromRequest) {
      return null;
    }
    const folderUrlFromRequest = Common9.ParsedURL.ParsedURL.substring(fileUrlFromRequest, 0, fileUrlFromRequest.lastIndexOf("/"));
    const headersFileUrl = Common9.ParsedURL.ParsedURL.concatenate(folderUrlFromRequest, "/", HEADERS_FILENAME);
    return this.#workspace.uiSourceCodeForURL(headersFileUrl);
  }
  async getOrCreateHeadersUISourceCodeFromUrl(url) {
    let uiSourceCode = this.getHeadersUISourceCodeFromUrl(url);
    if (!uiSourceCode && this.#project) {
      const encodedFilePath = this.encodedPathFromUrl(
        url,
        /* ignoreNoActive */
        true
      );
      if (!encodedFilePath) {
        return null;
      }
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
      this.dispatchEventToListeners("RequestsForHeaderOverridesFileChanged" /* REQUEST_FOR_HEADER_OVERRIDES_FILE_CHANGED */, uiSourceCode);
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
    return this.#persistence.removeBinding(binding);
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
    await this.#persistence.addBinding(binding);
    const uiSourceCodeOfTruth = this.#savingForOverrides.has(networkUISourceCode) ? networkUISourceCode : fileSystemUISourceCode;
    const contentDataOrError = await uiSourceCodeOfTruth.requestContentData();
    const { content, isEncoded } = TextUtils6.ContentData.ContentData.asDeferredContent(contentDataOrError);
    this.#persistence.syncContent(uiSourceCodeOfTruth, content || "", isEncoded);
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
    if (!this.isUISourceCodeOverridable(uiSourceCode)) {
      return false;
    }
    if (this.#shouldPromptSaveForOverridesDialog(uiSourceCode)) {
      Host8.userMetrics.actionTaken(Host8.UserMetrics.Action.OverrideContentContextMenuSetup);
      await new Promise((resolve) => this.dispatchEventToListeners("LocalOverridesRequested" /* LOCAL_OVERRIDES_REQUESTED */, resolve));
      await this.#isolatedFileSystemManager.addFileSystem("overrides");
    }
    if (!this.project()) {
      Host8.userMetrics.actionTaken(Host8.UserMetrics.Action.OverrideContentContextMenuAbandonSetup);
      return false;
    }
    if (!this.#enabledSetting.get()) {
      Host8.userMetrics.actionTaken(Host8.UserMetrics.Action.OverrideContentContextMenuActivateDisabled);
      this.#enabledSetting.set(true);
      await this.once("LocalOverridesProjectUpdated" /* LOCAL_OVERRIDES_PROJECT_UPDATED */);
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
    if (!encodedPath) {
      this.#savingForOverrides.delete(uiSourceCode);
      return;
    }
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
    const host = this.decodeLocalPathToUrlPath(this.decodeLocalPathToUrlPath(relativePathParts[0] || "")).toLowerCase();
    return ["chrome:", "data:", "blob:", "javascript:", "about:", "mailto:", "vbscript:"].includes(host) || forbiddenUrls.includes(host);
  }
  static isForbiddenNetworkUrl(urlString) {
    const trimmedUrl = urlString.trim().toLowerCase();
    if (trimmedUrl.startsWith("data:") || trimmedUrl.startsWith("blob:") || trimmedUrl.startsWith("javascript:") || trimmedUrl.startsWith("about:") || trimmedUrl.startsWith("mailto:") || trimmedUrl.startsWith("vbscript:")) {
      return true;
    }
    const url = Common9.ParsedURL.ParsedURL.fromString(urlString);
    if (!url) {
      return false;
    }
    return !["http", "https", "file"].includes(url.scheme) || forbiddenUrls.includes(url.host);
  }
  async onUISourceCodeAdded(uiSourceCode) {
    await this.networkUISourceCodeAdded(uiSourceCode);
    await this.filesystemUISourceCodeAdded(uiSourceCode);
  }
  canHandleNetworkUISourceCode(uiSourceCode) {
    return this.#active && !Common9.ParsedURL.schemeIs(uiSourceCode.url(), "snippet:") && !_NetworkPersistenceManager.isForbiddenNetworkUrl(uiSourceCode.url());
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
    const relativePath = Common9.ParsedURL.ParsedURL.slice(
      Common9.ParsedURL.ParsedURL.join(relativePathParts, "/"),
      0,
      -HEADERS_FILENAME.length
    );
    const { singlyDecodedPath, decodedPath } = this.#doubleDecodeEncodedPathString(relativePath);
    let patterns;
    if (relativePathParts.length > 2 && relativePathParts[1] === "longurls" && headerOverrides.length) {
      patterns = this.#generateHeaderPatternsForLongUrl(decodedPath, headerOverrides, relativePathParts[0]);
    } else if (decodedPath.startsWith("file:/")) {
      patterns = this.#generateHeaderPatternsForFileUrl(
        Common9.ParsedURL.ParsedURL.substring(decodedPath, "file:/".length),
        headerOverrides
      );
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
      return await this.#multitargetNetworkManager.setInterceptionHandlerForPatterns(
        [],
        this.#interceptionHandlerBound
      );
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
    return await this.#multitargetNetworkManager.setInterceptionHandlerForPatterns(
      Array.from(patterns).map((pattern) => ({ urlPattern: pattern, requestStage: Fetch.RequestStage.Response })),
      this.#interceptionHandlerBound
    );
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
      this.dispatchEventToListeners("RequestsForHeaderOverridesFileChanged" /* REQUEST_FOR_HEADER_OVERRIDES_FILE_CHANGED */, headersFileUiSourceCode);
    }
    this.#headerOverridesForEventDispatch.clear();
    return Promise.resolve();
  }
  hasMatchingNetworkUISourceCodeForHeaderOverridesFile(headersFile) {
    const relativePathParts = FileSystemWorkspaceBinding.relativePath(headersFile);
    const relativePath = Common9.ParsedURL.ParsedURL.slice(
      Common9.ParsedURL.ParsedURL.join(relativePathParts, "/"),
      0,
      -HEADERS_FILENAME.length
    );
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
      await Promise.all(
        [...this.#project.uiSourceCodes()].map((uiSourceCode) => this.filesystemUISourceCodeRemoved(uiSourceCode))
      );
    }
    this.#project = project;
    if (this.#project) {
      await Promise.all(
        [...this.#project.uiSourceCodes()].map((uiSourceCode) => this.filesystemUISourceCodeAdded(uiSourceCode))
      );
    }
    await this.updateActiveProject();
    this.dispatchEventToListeners("ProjectChanged" /* PROJECT_CHANGED */, this.#project);
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
    const mergedHeaders = SDK3.NetworkManager.InterceptedRequest.mergeSetCookieHeaders(
      originalSetCookieHeaders,
      setCookieHeadersFromOverrides
    );
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
    if (_NetworkPersistenceManager.isForbiddenNetworkUrl(interceptedRequest.request.url)) {
      return [];
    }
    let result = interceptedRequest.responseHeaders || [];
    const urlSegments = this.rawPathFromUrl(interceptedRequest.request.url).split("/");
    let path = Platform11.DevToolsPath.EmptyEncodedPathString;
    result = this.#maybeMergeHeadersForPathSegment(
      path,
      interceptedRequest.request.url,
      result
    );
    for (const segment of urlSegments) {
      path = Common9.ParsedURL.ParsedURL.concatenate(path, segment, "/");
      result = this.#maybeMergeHeadersForPathSegment(
        path,
        interceptedRequest.request.url,
        result
      );
    }
    return result;
  }
  async interceptionHandler(interceptedRequest) {
    const method = interceptedRequest.request.method;
    if (!this.#active || method === "OPTIONS") {
      return;
    }
    const requestUrl = interceptedRequest.request.url;
    if (_NetworkPersistenceManager.isForbiddenNetworkUrl(requestUrl)) {
      return;
    }
    const proj = this.#project;
    const path = this.fileUrlFromNetworkUrl(requestUrl);
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
      this.#originalResponseContentPromises.set(
        fileSystemUISourceCode,
        interceptedRequest.responseBody().then((response) => {
          if (TextUtils6.ContentData.ContentData.isError(response) || !response.isTextContent) {
            return null;
          }
          return response.text;
        })
      );
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
var Events5 = /* @__PURE__ */ ((Events6) => {
  Events6["PROJECT_CHANGED"] = "ProjectChanged";
  Events6["REQUEST_FOR_HEADER_OVERRIDES_FILE_CHANGED"] = "RequestsForHeaderOverridesFileChanged";
  Events6["LOCAL_OVERRIDES_PROJECT_UPDATED"] = "LocalOverridesProjectUpdated";
  Events6["LOCAL_OVERRIDES_REQUESTED"] = "LocalOverridesRequested";
  return Events6;
})(Events5 || {});
function isHeaderOverride(arg) {
  if (!(arg && typeof arg.applyTo === "string" && arg.headers?.length && Array.isArray(arg.headers))) {
    return false;
  }
  return arg.headers.every(
    (header) => typeof header.name === "string" && typeof header.value === "string"
  );
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
