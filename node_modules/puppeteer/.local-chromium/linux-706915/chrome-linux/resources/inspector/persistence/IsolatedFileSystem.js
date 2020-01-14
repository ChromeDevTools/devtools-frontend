export default class IsolatedFileSystem extends Persistence.PlatformFileSystem{constructor(manager,path,embedderPath,domFileSystem,type){super(path,type);this._manager=manager;this._embedderPath=embedderPath;this._domFileSystem=domFileSystem;this._excludedFoldersSetting=Common.settings.createLocalSetting('workspaceExcludedFolders',{});this._excludedFolders=new Set(this._excludedFoldersSetting.get()[path]||[]);this._excludedEmbedderFolders=[];this._initialFilePaths=new Set();this._initialGitFolders=new Set();this._fileLocks=new Map();}
static create(manager,path,embedderPath,type,name,rootURL){const domFileSystem=Host.InspectorFrontendHost.isolatedFileSystem(name,rootURL);if(!domFileSystem){return Promise.resolve((null));}
const fileSystem=new IsolatedFileSystem(manager,path,embedderPath,domFileSystem,type);return fileSystem._initializeFilePaths().then(()=>fileSystem).catchException((null));}
static errorMessage(error){return Common.UIString('File system error: %s',error.message);}
_serializedFileOperation(path,operation){const promise=Promise.resolve(this._fileLocks.get(path)).then(()=>operation.call(null));this._fileLocks.set(path,promise);return promise;}
getMetadata(path){let fulfill;const promise=new Promise(f=>fulfill=f);this._domFileSystem.root.getFile(path,undefined,fileEntryLoaded,errorHandler);return promise;function fileEntryLoaded(entry){entry.getMetadata(fulfill,errorHandler);}
function errorHandler(error){const errorMessage=IsolatedFileSystem.errorMessage(error);console.error(errorMessage+' when getting file metadata \''+path);fulfill(null);}}
initialFilePaths(){return this._initialFilePaths.valuesArray();}
initialGitFolders(){return this._initialGitFolders.valuesArray();}
embedderPath(){return this._embedderPath;}
_initializeFilePaths(){let fulfill;const promise=new Promise(x=>fulfill=x);let pendingRequests=1;const boundInnerCallback=innerCallback.bind(this);this._requestEntries('',boundInnerCallback);return promise;function innerCallback(entries){for(let i=0;i<entries.length;++i){const entry=entries[i];if(!entry.isDirectory){if(this.isFileExcluded(entry.fullPath)){continue;}
this._initialFilePaths.add(entry.fullPath.substr(1));}else{if(entry.fullPath.endsWith('/.git')){const lastSlash=entry.fullPath.lastIndexOf('/');const parentFolder=entry.fullPath.substring(1,lastSlash);this._initialGitFolders.add(parentFolder);}
if(this.isFileExcluded(entry.fullPath+'/')){this._excludedEmbedderFolders.push(Common.ParsedURL.urlToPlatformPath(this.path()+entry.fullPath,Host.isWin()));continue;}
++pendingRequests;this._requestEntries(entry.fullPath,boundInnerCallback);}}
if((--pendingRequests===0)){fulfill();}}}
async _createFoldersIfNotExist(folderPath){let dirEntry=await new Promise(resolve=>this._domFileSystem.root.getDirectory(folderPath,undefined,resolve,()=>resolve(null)));if(dirEntry){return dirEntry;}
const paths=folderPath.split('/');let activePath='';for(const path of paths){activePath=activePath+'/'+path;dirEntry=await this._innerCreateFolderIfNeeded(activePath);if(!dirEntry){return null;}}
return dirEntry;}
_innerCreateFolderIfNeeded(path){return new Promise(resolve=>{this._domFileSystem.root.getDirectory(path,{create:true},dirEntry=>resolve(dirEntry),error=>{const errorMessage=IsolatedFileSystem.errorMessage(error);console.error(errorMessage+' trying to create directory \''+path+'\'');resolve(null);});});}
async createFile(path,name){const dirEntry=await this._createFoldersIfNotExist(path);if(!dirEntry){return null;}
const fileEntry=await this._serializedFileOperation(path,createFileCandidate.bind(this,name||'NewFile'));if(!fileEntry){return null;}
return fileEntry.fullPath.substr(1);function createFileCandidate(name,newFileIndex){return new Promise(resolve=>{const nameCandidate=name+(newFileIndex||'');dirEntry.getFile(nameCandidate,{create:true,exclusive:true},resolve,error=>{if(error.name==='InvalidModificationError'){resolve(createFileCandidate.call(this,name,(newFileIndex?newFileIndex+1:1)));return;}
const errorMessage=IsolatedFileSystem.errorMessage(error);console.error(errorMessage+' when testing if file exists \''+(this.path()+'/'+path+'/'+nameCandidate)+'\'');resolve(null);});});}}
deleteFile(path){let resolveCallback;const promise=new Promise(resolve=>resolveCallback=resolve);this._domFileSystem.root.getFile(path,undefined,fileEntryLoaded.bind(this),errorHandler.bind(this));return promise;function fileEntryLoaded(fileEntry){fileEntry.remove(fileEntryRemoved,errorHandler.bind(this));}
function fileEntryRemoved(){resolveCallback(true);}
function errorHandler(error){const errorMessage=IsolatedFileSystem.errorMessage(error);console.error(errorMessage+' when deleting file \''+(this.path()+'/'+path)+'\'');resolveCallback(false);}}
requestFileBlob(path){return new Promise(resolve=>{this._domFileSystem.root.getFile(path,undefined,entry=>{entry.file(resolve,errorHandler.bind(this));},errorHandler.bind(this));function errorHandler(error){if(error.name==='NotFoundError'){resolve(null);return;}
const errorMessage=IsolatedFileSystem.errorMessage(error);console.error(errorMessage+' when getting content for file \''+(this.path()+'/'+path)+'\'');resolve(null);}});}
requestFileContent(path){return this._serializedFileOperation(path,()=>this._innerRequestFileContent(path));}
async _innerRequestFileContent(path){const blob=await this.requestFileBlob(path);if(!blob){return{error:ls`Blob could not be loaded.`,isEncoded:false};}
const reader=new FileReader();const extension=Common.ParsedURL.extractExtension(path);const encoded=Persistence.IsolatedFileSystem.BinaryExtensions.has(extension);const readPromise=new Promise(x=>reader.onloadend=x);if(encoded){reader.readAsBinaryString(blob);}else{reader.readAsText(blob);}
await readPromise;if(reader.error){const error=ls`Can't read file: ${path}: ${reader.error}`;console.error(error);return{isEncoded:false,error};}
let result=null;let error=null;try{result=(reader.result);}catch(e){result=null;error=ls`Can't read file: ${path}: ${e.message}`;}
if(result===undefined||result===null){error=error||ls`Unknown error reading file: ${path}`;console.error(error);return{isEncoded:false,error};}
return{isEncoded:encoded,content:encoded?btoa(result):result};}
async setFileContent(path,content,isBase64){Host.userMetrics.actionTaken(Host.UserMetrics.Action.FileSavedInWorkspace);let callback;const innerSetFileContent=()=>{const promise=new Promise(x=>callback=x);this._domFileSystem.root.getFile(path,{create:true},fileEntryLoaded.bind(this),errorHandler.bind(this));return promise;};this._serializedFileOperation(path,innerSetFileContent);function fileEntryLoaded(entry){entry.createWriter(fileWriterCreated.bind(this),errorHandler.bind(this));}
async function fileWriterCreated(fileWriter){fileWriter.onerror=errorHandler.bind(this);fileWriter.onwriteend=fileWritten;let blob;if(isBase64){blob=await(await fetch(`data:application/octet-stream;base64,${content}`)).blob();}else{blob=new Blob([content],{type:'text/plain'});}
fileWriter.write(blob);function fileWritten(){fileWriter.onwriteend=callback;fileWriter.truncate(blob.size);}}
function errorHandler(error){const errorMessage=IsolatedFileSystem.errorMessage(error);console.error(errorMessage+' when setting content for file \''+(this.path()+'/'+path)+'\'');callback();}}
renameFile(path,newName,callback){newName=newName?newName.trim():newName;if(!newName||newName.indexOf('/')!==-1){callback(false);return;}
let fileEntry;let dirEntry;this._domFileSystem.root.getFile(path,undefined,fileEntryLoaded.bind(this),errorHandler.bind(this));function fileEntryLoaded(entry){if(entry.name===newName){callback(false);return;}
fileEntry=entry;fileEntry.getParent(dirEntryLoaded.bind(this),errorHandler.bind(this));}
function dirEntryLoaded(entry){dirEntry=entry;dirEntry.getFile(newName,null,newFileEntryLoaded,newFileEntryLoadErrorHandler.bind(this));}
function newFileEntryLoaded(entry){callback(false);}
function newFileEntryLoadErrorHandler(error){if(error.name!=='NotFoundError'){callback(false);return;}
fileEntry.moveTo(dirEntry,newName,fileRenamed,errorHandler.bind(this));}
function fileRenamed(entry){callback(true,entry.name);}
function errorHandler(error){const errorMessage=IsolatedFileSystem.errorMessage(error);console.error(errorMessage+' when renaming file \''+(this.path()+'/'+path)+'\' to \''+newName+'\'');callback(false);}}
_readDirectory(dirEntry,callback){const dirReader=dirEntry.createReader();let entries=[];function innerCallback(results){if(!results.length){callback(entries.sort());}else{entries=entries.concat(toArray(results));dirReader.readEntries(innerCallback,errorHandler);}}
function toArray(list){return Array.prototype.slice.call(list||[],0);}
dirReader.readEntries(innerCallback,errorHandler);function errorHandler(error){const errorMessage=IsolatedFileSystem.errorMessage(error);console.error(errorMessage+' when reading directory \''+dirEntry.fullPath+'\'');callback([]);}}
_requestEntries(path,callback){this._domFileSystem.root.getDirectory(path,undefined,innerCallback.bind(this),errorHandler);function innerCallback(dirEntry){this._readDirectory(dirEntry,callback);}
function errorHandler(error){const errorMessage=IsolatedFileSystem.errorMessage(error);console.error(errorMessage+' when requesting entry \''+path+'\'');callback([]);}}
_saveExcludedFolders(){const settingValue=this._excludedFoldersSetting.get();settingValue[this.path()]=this._excludedFolders.valuesArray();this._excludedFoldersSetting.set(settingValue);}
addExcludedFolder(path){this._excludedFolders.add(path);this._saveExcludedFolders();this._manager.dispatchEventToListeners(Persistence.IsolatedFileSystemManager.Events.ExcludedFolderAdded,path);}
removeExcludedFolder(path){this._excludedFolders.delete(path);this._saveExcludedFolders();this._manager.dispatchEventToListeners(Persistence.IsolatedFileSystemManager.Events.ExcludedFolderRemoved,path);}
fileSystemRemoved(){const settingValue=this._excludedFoldersSetting.get();delete settingValue[this.path()];this._excludedFoldersSetting.set(settingValue);}
isFileExcluded(folderPath){if(this._excludedFolders.has(folderPath)){return true;}
const regex=this._manager.workspaceFolderExcludePatternSetting().asRegExp();return!!(regex&&regex.test(folderPath));}
excludedFolders(){return this._excludedFolders;}
searchInPath(query,progress){return new Promise(resolve=>{const requestId=this._manager.registerCallback(innerCallback);Host.InspectorFrontendHost.searchInPath(requestId,this._embedderPath,query);function innerCallback(files){resolve(files.map(path=>Common.ParsedURL.platformPathToURL(path)));progress.worked(1);}});}
indexContent(progress){progress.setTotalWork(1);const requestId=this._manager.registerProgress(progress);Host.InspectorFrontendHost.indexPath(requestId,this._embedderPath,JSON.stringify(this._excludedEmbedderFolders));}
mimeFromPath(path){return Common.ResourceType.mimeFromURL(path)||'text/plain';}
canExcludeFolder(path){return!!path&&this.type()!=='overrides';}
contentType(path){const extension=Common.ParsedURL.extractExtension(path);if(_styleSheetExtensions.has(extension)){return Common.resourceTypes.Stylesheet;}
if(_documentExtensions.has(extension)){return Common.resourceTypes.Document;}
if(ImageExtensions.has(extension)){return Common.resourceTypes.Image;}
if(_scriptExtensions.has(extension)){return Common.resourceTypes.Script;}
return BinaryExtensions.has(extension)?Common.resourceTypes.Other:Common.resourceTypes.Document;}
tooltipForURL(url){const path=Common.ParsedURL.urlToPlatformPath(url,Host.isWin()).trimMiddle(150);return ls`Linked to ${path}`;}
supportsAutomapping(){return this.type()!=='overrides';}}
export const _styleSheetExtensions=new Set(['css','scss','sass','less']);export const _documentExtensions=new Set(['htm','html','asp','aspx','phtml','jsp']);export const _scriptExtensions=new Set(['asp','aspx','c','cc','cljs','coffee','cpp','cs','dart','java','js','jsp','jsx','h','m','mjs','mm','py','sh','ts','tsx','ls']);export const ImageExtensions=new Set(['jpeg','jpg','svg','gif','webp','png','ico','tiff','tif','bmp']);export const BinaryExtensions=new Set(['cmd','com','exe','a','ar','iso','tar','bz2','gz','lz','lzma','z','7z','apk','arc','cab','dmg','jar','pak','rar','zip','3gp','aac','aiff','flac','m4a','mmf','mp3','ogg','oga','raw','sln','wav','wma','webm','mkv','flv','vob','ogv','gifv','avi','mov','qt','mp4','m4p','m4v','mpg','mpeg','jpeg','jpg','gif','webp','png','ico','tiff','tif','bmp']);self.Persistence=self.Persistence||{};Persistence=Persistence||{};Persistence.IsolatedFileSystem=IsolatedFileSystem;Persistence.IsolatedFileSystem._styleSheetExtensions=_styleSheetExtensions;Persistence.IsolatedFileSystem._documentExtensions=_documentExtensions;Persistence.IsolatedFileSystem._scriptExtensions=_scriptExtensions;Persistence.IsolatedFileSystem.ImageExtensions=ImageExtensions;Persistence.IsolatedFileSystem.BinaryExtensions=BinaryExtensions;