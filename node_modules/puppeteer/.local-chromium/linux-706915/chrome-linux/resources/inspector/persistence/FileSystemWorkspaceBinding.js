export default class FileSystemWorkspaceBinding{constructor(isolatedFileSystemManager,workspace){this._isolatedFileSystemManager=isolatedFileSystemManager;this._workspace=workspace;this._eventListeners=[this._isolatedFileSystemManager.addEventListener(Persistence.IsolatedFileSystemManager.Events.FileSystemAdded,this._onFileSystemAdded,this),this._isolatedFileSystemManager.addEventListener(Persistence.IsolatedFileSystemManager.Events.FileSystemRemoved,this._onFileSystemRemoved,this),this._isolatedFileSystemManager.addEventListener(Persistence.IsolatedFileSystemManager.Events.FileSystemFilesChanged,this._fileSystemFilesChanged,this)];this._boundFileSystems=new Map();this._isolatedFileSystemManager.waitForFileSystems().then(this._onFileSystemsLoaded.bind(this));}
static projectId(fileSystemPath){return fileSystemPath;}
static relativePath(uiSourceCode){const baseURL=(uiSourceCode.project())._fileSystemBaseURL;return uiSourceCode.url().substring(baseURL.length).split('/');}
static tooltipForUISourceCode(uiSourceCode){const fileSystem=(uiSourceCode.project())._fileSystem;return fileSystem.tooltipForURL(uiSourceCode.url());}
static fileSystemType(project){const fileSystem=(project)._fileSystem;return fileSystem.type();}
static fileSystemSupportsAutomapping(project){const fileSystem=(project)._fileSystem;return fileSystem.supportsAutomapping();}
static completeURL(project,relativePath){const fsProject=(project);return fsProject._fileSystemBaseURL+relativePath;}
static fileSystemPath(projectId){return projectId;}
fileSystemManager(){return this._isolatedFileSystemManager;}
_onFileSystemsLoaded(fileSystems){for(const fileSystem of fileSystems){this._addFileSystem(fileSystem);}}
_onFileSystemAdded(event){const fileSystem=(event.data);this._addFileSystem(fileSystem);}
_addFileSystem(fileSystem){const boundFileSystem=new FileSystem(this,fileSystem,this._workspace);this._boundFileSystems.set(fileSystem.path(),boundFileSystem);}
_onFileSystemRemoved(event){const fileSystem=(event.data);const boundFileSystem=this._boundFileSystems.get(fileSystem.path());boundFileSystem.dispose();this._boundFileSystems.remove(fileSystem.path());}
_fileSystemFilesChanged(event){const paths=(event.data);for(const fileSystemPath of paths.changed.keysArray()){const fileSystem=this._boundFileSystems.get(fileSystemPath);if(!fileSystem){continue;}
paths.changed.get(fileSystemPath).forEach(path=>fileSystem._fileChanged(path));}
for(const fileSystemPath of paths.added.keysArray()){const fileSystem=this._boundFileSystems.get(fileSystemPath);if(!fileSystem){continue;}
paths.added.get(fileSystemPath).forEach(path=>fileSystem._fileChanged(path));}
for(const fileSystemPath of paths.removed.keysArray()){const fileSystem=this._boundFileSystems.get(fileSystemPath);if(!fileSystem){continue;}
paths.removed.get(fileSystemPath).forEach(path=>fileSystem.removeUISourceCode(path));}}
dispose(){Common.EventTarget.removeEventListeners(this._eventListeners);for(const fileSystem of this._boundFileSystems.values()){fileSystem.dispose();this._boundFileSystems.remove(fileSystem._fileSystem.path());}}}
export class FileSystem extends Workspace.ProjectStore{constructor(fileSystemWorkspaceBinding,isolatedFileSystem,workspace){const fileSystemPath=isolatedFileSystem.path();const id=FileSystemWorkspaceBinding.projectId(fileSystemPath);console.assert(!workspace.project(id));const displayName=fileSystemPath.substr(fileSystemPath.lastIndexOf('/')+1);super(workspace,id,Workspace.projectTypes.FileSystem,displayName);this._fileSystem=isolatedFileSystem;this._fileSystemBaseURL=this._fileSystem.path()+'/';this._fileSystemParentURL=this._fileSystemBaseURL.substr(0,fileSystemPath.lastIndexOf('/')+1);this._fileSystemWorkspaceBinding=fileSystemWorkspaceBinding;this._fileSystemPath=fileSystemPath;this._creatingFilesGuard=new Set();workspace.addProject(this);this.populate();}
fileSystemPath(){return this._fileSystemPath;}
mimeType(uiSourceCode){return this._fileSystem.mimeFromPath(uiSourceCode.url());}
initialGitFolders(){return this._fileSystem.initialGitFolders().map(folder=>this._fileSystemPath+'/'+folder);}
_filePathForUISourceCode(uiSourceCode){return uiSourceCode.url().substring(this._fileSystemPath.length);}
isServiceProject(){return false;}
requestMetadata(uiSourceCode){if(uiSourceCode[_metadata]){return uiSourceCode[_metadata];}
const relativePath=this._filePathForUISourceCode(uiSourceCode);const promise=this._fileSystem.getMetadata(relativePath).then(onMetadata);uiSourceCode[_metadata]=promise;return promise;function onMetadata(metadata){if(!metadata){return null;}
return new Workspace.UISourceCodeMetadata(metadata.modificationTime,metadata.size);}}
requestFileBlob(uiSourceCode){return this._fileSystem.requestFileBlob(this._filePathForUISourceCode(uiSourceCode));}
requestFileContent(uiSourceCode){const filePath=this._filePathForUISourceCode(uiSourceCode);return this._fileSystem.requestFileContent(filePath);}
canSetFileContent(){return true;}
async setFileContent(uiSourceCode,newContent,isBase64){const filePath=this._filePathForUISourceCode(uiSourceCode);await this._fileSystem.setFileContent(filePath,newContent,isBase64);}
fullDisplayName(uiSourceCode){const baseURL=(uiSourceCode.project())._fileSystemParentURL;return uiSourceCode.url().substring(baseURL.length);}
canRename(){return true;}
rename(uiSourceCode,newName,callback){if(newName===uiSourceCode.name()){callback(true,uiSourceCode.name(),uiSourceCode.url(),uiSourceCode.contentType());return;}
let filePath=this._filePathForUISourceCode(uiSourceCode);this._fileSystem.renameFile(filePath,newName,innerCallback.bind(this));function innerCallback(success,newName){if(!success||!newName){callback(false,newName);return;}
console.assert(newName);const slash=filePath.lastIndexOf('/');const parentPath=filePath.substring(0,slash);filePath=parentPath+'/'+newName;filePath=filePath.substr(1);const newURL=this._fileSystemBaseURL+filePath;const newContentType=this._fileSystem.contentType(newName);this.renameUISourceCode(uiSourceCode,newName);callback(true,newName,newURL,newContentType);}}
async searchInFileContent(uiSourceCode,query,caseSensitive,isRegex){const filePath=this._filePathForUISourceCode(uiSourceCode);const{content}=await this._fileSystem.requestFileContent(filePath);if(content){return Common.ContentProvider.performSearchInContent(content,query,caseSensitive,isRegex);}
return[];}
async findFilesMatchingSearchRequest(searchConfig,filesMathingFileQuery,progress){let result=filesMathingFileQuery;const queriesToRun=searchConfig.queries().slice();if(!queriesToRun.length){queriesToRun.push('');}
progress.setTotalWork(queriesToRun.length);for(const query of queriesToRun){const files=await this._fileSystem.searchInPath(searchConfig.isRegex()?'':query,progress);result=result.intersectOrdered(files.sort(),String.naturalOrderComparator);progress.worked(1);}
progress.done();return result;}
indexContent(progress){this._fileSystem.indexContent(progress);}
populate(){const chunkSize=1000;const filePaths=this._fileSystem.initialFilePaths();reportFileChunk.call(this,0);function reportFileChunk(from){const to=Math.min(from+chunkSize,filePaths.length);for(let i=from;i<to;++i){this._addFile(filePaths[i]);}
if(to<filePaths.length){setTimeout(reportFileChunk.bind(this,to),100);}}}
excludeFolder(url){let relativeFolder=url.substring(this._fileSystemBaseURL.length);if(!relativeFolder.startsWith('/')){relativeFolder='/'+relativeFolder;}
if(!relativeFolder.endsWith('/')){relativeFolder+='/';}
this._fileSystem.addExcludedFolder(relativeFolder);const uiSourceCodes=this.uiSourceCodes().slice();for(let i=0;i<uiSourceCodes.length;++i){const uiSourceCode=uiSourceCodes[i];if(uiSourceCode.url().startsWith(url)){this.removeUISourceCode(uiSourceCode.url());}}}
canExcludeFolder(path){return this._fileSystem.canExcludeFolder(path);}
canCreateFile(){return true;}
async createFile(path,name,content,isBase64){const guardFileName=this._fileSystemPath+path+(!path.endsWith('/')?'/':'')+name;this._creatingFilesGuard.add(guardFileName);const filePath=await this._fileSystem.createFile(path,name);if(!filePath){return null;}
const uiSourceCode=this._addFile(filePath);uiSourceCode.setContent(content,!!isBase64);this._creatingFilesGuard.delete(guardFileName);return uiSourceCode;}
deleteFile(uiSourceCode){const relativePath=this._filePathForUISourceCode(uiSourceCode);this._fileSystem.deleteFile(relativePath).then(success=>{if(success){this.removeUISourceCode(uiSourceCode.url());}});}
remove(){this._fileSystemWorkspaceBinding._isolatedFileSystemManager.removeFileSystem(this._fileSystem);}
_addFile(filePath){const contentType=this._fileSystem.contentType(filePath);const uiSourceCode=this.createUISourceCode(this._fileSystemBaseURL+filePath,contentType);this.addUISourceCode(uiSourceCode);return uiSourceCode;}
_fileChanged(path){if(this._creatingFilesGuard.has(path)){return;}
const uiSourceCode=this.uiSourceCodeForURL(path);if(!uiSourceCode){const contentType=this._fileSystem.contentType(path);this.addUISourceCode(this.createUISourceCode(path,contentType));return;}
uiSourceCode[_metadata]=null;uiSourceCode.checkContentUpdated();}
tooltipForURL(url){return this._fileSystem.tooltipForURL(url);}
dispose(){this.removeProject();}}
export const _metadata=Symbol('FileSystemWorkspaceBinding.Metadata');self.Persistence=self.Persistence||{};Persistence=Persistence||{};Persistence.FileSystemWorkspaceBinding=FileSystemWorkspaceBinding;Persistence.FileSystemWorkspaceBinding.FileSystem=FileSystem;Persistence.FileSystemWorkspaceBinding._metadata=_metadata;