export default class Automapping{constructor(workspace,onStatusAdded,onStatusRemoved){this._workspace=workspace;this._onStatusAdded=onStatusAdded;this._onStatusRemoved=onStatusRemoved;this._statuses=new Set();this._statusSymbol=Symbol('Automapping.Status');this._processingPromiseSymbol=Symbol('Automapping.ProcessingPromise');this._metadataSymbol=Symbol('Automapping.Metadata');this._fileSystemUISourceCodes=new Map();this._sweepThrottler=new Common.Throttler(100);const pathEncoder=new Persistence.PathEncoder();this._filesIndex=new FilePathIndex(pathEncoder);this._projectFoldersIndex=new FolderIndex(pathEncoder);this._activeFoldersIndex=new FolderIndex(pathEncoder);this._interceptors=[];this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded,event=>this._onUISourceCodeAdded((event.data)));this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved,event=>this._onUISourceCodeRemoved((event.data)));this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRenamed,this._onUISourceCodeRenamed,this);this._workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded,event=>this._onProjectAdded((event.data)),this);this._workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved,event=>this._onProjectRemoved((event.data)),this);for(const fileSystem of workspace.projects()){this._onProjectAdded(fileSystem);}
for(const uiSourceCode of workspace.uiSourceCodes()){this._onUISourceCodeAdded(uiSourceCode);}}
addNetworkInterceptor(interceptor){this._interceptors.push(interceptor);this.scheduleRemap();}
scheduleRemap(){for(const status of this._statuses.valuesArray()){this._clearNetworkStatus(status.network);}
this._scheduleSweep();}
_scheduleSweep(){this._sweepThrottler.schedule(sweepUnmapped.bind(this));function sweepUnmapped(){const networkProjects=this._workspace.projectsForType(Workspace.projectTypes.Network);for(const networkProject of networkProjects){for(const uiSourceCode of networkProject.uiSourceCodes()){this._computeNetworkStatus(uiSourceCode);}}
this._onSweepHappenedForTest();return Promise.resolve();}}
_onSweepHappenedForTest(){}
_onProjectRemoved(project){for(const uiSourceCode of project.uiSourceCodes()){this._onUISourceCodeRemoved(uiSourceCode);}
if(project.type()!==Workspace.projectTypes.FileSystem){return;}
const fileSystem=(project);for(const gitFolder of fileSystem.initialGitFolders()){this._projectFoldersIndex.removeFolder(gitFolder);}
this._projectFoldersIndex.removeFolder(fileSystem.fileSystemPath());this.scheduleRemap();}
_onProjectAdded(project){if(project.type()!==Workspace.projectTypes.FileSystem){return;}
const fileSystem=(project);for(const gitFolder of fileSystem.initialGitFolders()){this._projectFoldersIndex.addFolder(gitFolder);}
this._projectFoldersIndex.addFolder(fileSystem.fileSystemPath());project.uiSourceCodes().forEach(this._onUISourceCodeAdded.bind(this));this.scheduleRemap();}
_onUISourceCodeAdded(uiSourceCode){const project=uiSourceCode.project();if(project.type()===Workspace.projectTypes.FileSystem){if(!Persistence.FileSystemWorkspaceBinding.fileSystemSupportsAutomapping(project)){return;}
this._filesIndex.addPath(uiSourceCode.url());this._fileSystemUISourceCodes.set(uiSourceCode.url(),uiSourceCode);this._scheduleSweep();}else if(project.type()===Workspace.projectTypes.Network){this._computeNetworkStatus(uiSourceCode);}}
_onUISourceCodeRemoved(uiSourceCode){if(uiSourceCode.project().type()===Workspace.projectTypes.FileSystem){this._filesIndex.removePath(uiSourceCode.url());this._fileSystemUISourceCodes.delete(uiSourceCode.url());const status=uiSourceCode[this._statusSymbol];if(status){this._clearNetworkStatus(status.network);}}else if(uiSourceCode.project().type()===Workspace.projectTypes.Network){this._clearNetworkStatus(uiSourceCode);}}
_onUISourceCodeRenamed(event){const uiSourceCode=(event.data.uiSourceCode);const oldURL=(event.data.oldURL);if(uiSourceCode.project().type()!==Workspace.projectTypes.FileSystem){return;}
this._filesIndex.removePath(oldURL);this._fileSystemUISourceCodes.delete(oldURL);const status=uiSourceCode[this._statusSymbol];if(status){this._clearNetworkStatus(status.network);}
this._filesIndex.addPath(uiSourceCode.url());this._fileSystemUISourceCodes.set(uiSourceCode.url(),uiSourceCode);this._scheduleSweep();}
_computeNetworkStatus(networkSourceCode){if(networkSourceCode[this._processingPromiseSymbol]||networkSourceCode[this._statusSymbol]){return;}
if(this._interceptors.some(interceptor=>interceptor(networkSourceCode))){return;}
if(networkSourceCode.url().startsWith('wasm://')){return;}
const createBindingPromise=this._createBinding(networkSourceCode).then(validateStatus.bind(this)).then(onStatus.bind(this));networkSourceCode[this._processingPromiseSymbol]=createBindingPromise;async function validateStatus(status){if(!status){return null;}
if(networkSourceCode[this._processingPromiseSymbol]!==createBindingPromise){return null;}
if(status.network.contentType().isFromSourceMap()||!status.fileSystem.contentType().isTextType()){return status;}
if(status.fileSystem.isDirty()&&(status.network.isDirty()||status.network.hasCommits())){return null;}
const[fileSystemContent,networkContent]=await Promise.all([status.fileSystem.requestContent(),status.network.project().requestFileContent(status.network)]);if(fileSystemContent.content===null||networkContent===null){return null;}
if(networkSourceCode[this._processingPromiseSymbol]!==createBindingPromise){return null;}
const target=Bindings.NetworkProject.targetForUISourceCode(status.network);let isValid=false;const fileContent=fileSystemContent.content;if(target&&target.type()===SDK.Target.Type.Node){const rewrappedNetworkContent=Persistence.Persistence.rewrapNodeJSContent(status.fileSystem,fileContent,networkContent.content);isValid=fileContent===rewrappedNetworkContent;}else{isValid=fileContent.trimRight()===networkContent.content.trimRight();}
if(!isValid){this._prevalidationFailedForTest(status);return null;}
return status;}
function onStatus(status){if(networkSourceCode[this._processingPromiseSymbol]!==createBindingPromise){return;}
networkSourceCode[this._processingPromiseSymbol]=null;if(!status){this._onBindingFailedForTest();return;}
if(status.network[this._statusSymbol]||status.fileSystem[this._statusSymbol]){return;}
this._statuses.add(status);status.network[this._statusSymbol]=status;status.fileSystem[this._statusSymbol]=status;if(status.exactMatch){const projectFolder=this._projectFoldersIndex.closestParentFolder(status.fileSystem.url());const newFolderAdded=projectFolder?this._activeFoldersIndex.addFolder(projectFolder):false;if(newFolderAdded){this._scheduleSweep();}}
this._onStatusAdded.call(null,status);}}
_prevalidationFailedForTest(binding){}
_onBindingFailedForTest(){}
_clearNetworkStatus(networkSourceCode){if(networkSourceCode[this._processingPromiseSymbol]){networkSourceCode[this._processingPromiseSymbol]=null;return;}
const status=networkSourceCode[this._statusSymbol];if(!status){return;}
this._statuses.delete(status);status.network[this._statusSymbol]=null;status.fileSystem[this._statusSymbol]=null;if(status.exactMatch){const projectFolder=this._projectFoldersIndex.closestParentFolder(status.fileSystem.url());if(projectFolder){this._activeFoldersIndex.removeFolder(projectFolder);}}
this._onStatusRemoved.call(null,status);}
_createBinding(networkSourceCode){if(networkSourceCode.url().startsWith('file://')||networkSourceCode.url().startsWith('snippet://')){const decodedUrl=decodeURI(networkSourceCode.url());const fileSourceCode=this._fileSystemUISourceCodes.get(decodedUrl);const status=fileSourceCode?new AutomappingStatus(networkSourceCode,fileSourceCode,false):null;return Promise.resolve(status);}
let networkPath=Common.ParsedURL.extractPath(networkSourceCode.url());if(networkPath===null){return Promise.resolve((null));}
if(networkPath.endsWith('/')){networkPath+='index.html';}
const urlDecodedNetworkPath=decodeURI(networkPath);const similarFiles=this._filesIndex.similarFiles(urlDecodedNetworkPath).map(path=>this._fileSystemUISourceCodes.get(path));if(!similarFiles.length){return Promise.resolve((null));}
return this._pullMetadatas(similarFiles.concat(networkSourceCode)).then(onMetadatas.bind(this));function onMetadatas(){const activeFiles=similarFiles.filter(file=>!!this._activeFoldersIndex.closestParentFolder(file.url()));const networkMetadata=networkSourceCode[this._metadataSymbol];if(!networkMetadata||(!networkMetadata.modificationTime&&typeof networkMetadata.contentSize!=='number')){if(activeFiles.length!==1){return null;}
return new AutomappingStatus(networkSourceCode,activeFiles[0],false);}
let exactMatches=this._filterWithMetadata(activeFiles,networkMetadata);if(!exactMatches.length){exactMatches=this._filterWithMetadata(similarFiles,networkMetadata);}
if(exactMatches.length!==1){return null;}
return new AutomappingStatus(networkSourceCode,exactMatches[0],true);}}
_pullMetadatas(uiSourceCodes){return Promise.all(uiSourceCodes.map(async file=>{file[this._metadataSymbol]=await file.requestMetadata();}));}
_filterWithMetadata(files,networkMetadata){return files.filter(file=>{const fileMetadata=file[this._metadataSymbol];if(!fileMetadata){return false;}
const timeMatches=!networkMetadata.modificationTime||Math.abs(networkMetadata.modificationTime-fileMetadata.modificationTime)<1000;const contentMatches=!networkMetadata.contentSize||fileMetadata.contentSize===networkMetadata.contentSize;return timeMatches&&contentMatches;});}}
export class FilePathIndex{constructor(encoder){this._encoder=encoder;this._reversedIndex=new Common.Trie();}
addPath(path){const encodedPath=this._encoder.encode(path);this._reversedIndex.add(encodedPath.reverse());}
removePath(path){const encodedPath=this._encoder.encode(path);this._reversedIndex.remove(encodedPath.reverse());}
similarFiles(networkPath){const encodedPath=this._encoder.encode(networkPath);const longestCommonPrefix=this._reversedIndex.longestPrefix(encodedPath.reverse(),false);if(!longestCommonPrefix){return[];}
return this._reversedIndex.words(longestCommonPrefix).map(encodedPath=>this._encoder.decode(encodedPath.reverse()));}}
export class FolderIndex{constructor(encoder){this._encoder=encoder;this._index=new Common.Trie();this._folderCount=new Map();}
addFolder(path){if(path.endsWith('/')){path=path.substring(0,path.length-1);}
const encodedPath=this._encoder.encode(path);this._index.add(encodedPath);const count=this._folderCount.get(encodedPath)||0;this._folderCount.set(encodedPath,count+1);return count===0;}
removeFolder(path){if(path.endsWith('/')){path=path.substring(0,path.length-1);}
const encodedPath=this._encoder.encode(path);const count=this._folderCount.get(encodedPath)||0;if(!count){return false;}
if(count>1){this._folderCount.set(encodedPath,count-1);return false;}
this._index.remove(encodedPath);this._folderCount.delete(encodedPath);return true;}
closestParentFolder(path){const encodedPath=this._encoder.encode(path);const commonPrefix=this._index.longestPrefix(encodedPath,true);return this._encoder.decode(commonPrefix);}}
export class AutomappingStatus{constructor(network,fileSystem,exactMatch){this.network=network;this.fileSystem=fileSystem;this.exactMatch=exactMatch;}}
self.Persistence=self.Persistence||{};Persistence=Persistence||{};Persistence.Automapping=Automapping;Persistence.Automapping.FilePathIndex=FilePathIndex;Persistence.Automapping.FolderIndex=FolderIndex;Persistence.AutomappingStatus=AutomappingStatus;