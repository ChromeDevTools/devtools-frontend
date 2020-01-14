export default class NetworkPersistenceManager extends Common.Object{constructor(workspace){super();this._bindingSymbol=Symbol('NetworkPersistenceBinding');this._originalResponseContentPromiseSymbol=Symbol('OriginalResponsePromise');this._savingSymbol=Symbol('SavingForOverrides');this._enabledSetting=Common.settings.moduleSetting('persistenceNetworkOverridesEnabled');this._enabledSetting.addChangeListener(this._enabledChanged,this);this._workspace=workspace;this._networkUISourceCodeForEncodedPath=new Map();this._interceptionHandlerBound=this._interceptionHandler.bind(this);this._updateInterceptionThrottler=new Common.Throttler(50);this._project=null;this._activeProject=null;this._active=false;this._enabled=false;this._workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded,event=>this._onProjectAdded((event.data)));this._workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved,event=>this._onProjectRemoved((event.data)));Persistence.persistence.addNetworkInterceptor(this._canHandleNetworkUISourceCode.bind(this));this._eventDescriptors=[];this._enabledChanged();}
active(){return this._active;}
project(){return this._project;}
originalContentForUISourceCode(uiSourceCode){if(!uiSourceCode[this._bindingSymbol]){return null;}
const fileSystemUISourceCode=uiSourceCode[this._bindingSymbol].fileSystem;return fileSystemUISourceCode[this._originalResponseContentPromiseSymbol]||null;}
_enabledChanged(){if(this._enabled===this._enabledSetting.get()){return;}
this._enabled=this._enabledSetting.get();if(this._enabled){this._eventDescriptors=[Workspace.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRenamed,event=>{const uiSourceCode=(event.data.uiSourceCode);this._onUISourceCodeRemoved(uiSourceCode);this._onUISourceCodeAdded(uiSourceCode);}),Workspace.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded,event=>this._onUISourceCodeAdded((event.data))),Workspace.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved,event=>this._onUISourceCodeRemoved((event.data))),Workspace.workspace.addEventListener(Workspace.Workspace.Events.WorkingCopyCommitted,event=>this._onUISourceCodeWorkingCopyCommitted((event.data.uiSourceCode)))];this._updateActiveProject();}else{Common.EventTarget.removeEventListeners(this._eventDescriptors);this._updateActiveProject();}}
_updateActiveProject(){const wasActive=this._active;this._active=!!(this._enabledSetting.get()&&SDK.targetManager.mainTarget()&&this._project);if(this._active===wasActive){return;}
if(this._active){this._project.uiSourceCodes().forEach(this._filesystemUISourceCodeAdded.bind(this));const networkProjects=this._workspace.projectsForType(Workspace.projectTypes.Network);for(const networkProject of networkProjects){networkProject.uiSourceCodes().forEach(this._networkUISourceCodeAdded.bind(this));}}else if(this._project){this._project.uiSourceCodes().forEach(this._filesystemUISourceCodeRemoved.bind(this));this._networkUISourceCodeForEncodedPath.clear();}
Persistence.persistence.refreshAutomapping();}
_encodedPathFromUrl(url){if(!this._active){return'';}
let urlPath=Common.ParsedURL.urlWithoutHash(url.replace(/^https?:\/\//,''));if(urlPath.endsWith('/')&&urlPath.indexOf('?')===-1){urlPath=urlPath+'index.html';}
let encodedPathParts=encodeUrlPathToLocalPathParts(urlPath);const projectPath=Persistence.FileSystemWorkspaceBinding.fileSystemPath(this._project.id());const encodedPath=encodedPathParts.join('/');if(projectPath.length+encodedPath.length>200){const domain=encodedPathParts[0];const encodedFileName=encodedPathParts[encodedPathParts.length-1];const shortFileName=encodedFileName?encodedFileName.substr(0,10)+'-':'';const extension=Common.ParsedURL.extractExtension(urlPath);const extensionPart=extension?'.'+extension.substr(0,10):'';encodedPathParts=[domain,'longurls',shortFileName+String.hashCode(encodedPath).toString(16)+extensionPart];}
return encodedPathParts.join('/');function encodeUrlPathToLocalPathParts(urlPath){const encodedParts=[];for(const pathPart of fileNamePartsFromUrlPath(urlPath)){if(!pathPart){continue;}
let encodedName=encodeURI(pathPart).replace(/[\/:\?\*]/g,match=>'%'+match[0].charCodeAt(0).toString(16));if(_reservedFileNames.has(encodedName.toLowerCase())){encodedName=encodedName.split('').map(char=>'%'+char.charCodeAt(0).toString(16)).join('');}
const lastChar=encodedName.charAt(encodedName.length-1);if(lastChar==='.'){encodedName=encodedName.substr(0,encodedName.length-1)+'%2e';}
encodedParts.push(encodedName);}
return encodedParts;}
function fileNamePartsFromUrlPath(urlPath){urlPath=Common.ParsedURL.urlWithoutHash(urlPath);const queryIndex=urlPath.indexOf('?');if(queryIndex===-1){return urlPath.split('/');}
if(queryIndex===0){return[urlPath];}
const endSection=urlPath.substr(queryIndex);const parts=urlPath.substr(0,urlPath.length-endSection.length).split('/');parts[parts.length-1]+=endSection;return parts;}}
_decodeLocalPathToUrlPath(path){try{return unescape(path);}catch(e){console.error(e);}
return path;}
_unbind(uiSourceCode){const binding=uiSourceCode[this._bindingSymbol];if(!binding){return;}
delete binding.network[this._bindingSymbol];delete binding.fileSystem[this._bindingSymbol];Persistence.persistence.removeBinding(binding);}
async _bind(networkUISourceCode,fileSystemUISourceCode){if(networkUISourceCode[this._bindingSymbol]){this._unbind(networkUISourceCode);}
if(fileSystemUISourceCode[this._bindingSymbol]){this._unbind(fileSystemUISourceCode);}
const binding=new Persistence.PersistenceBinding(networkUISourceCode,fileSystemUISourceCode);networkUISourceCode[this._bindingSymbol]=binding;fileSystemUISourceCode[this._bindingSymbol]=binding;Persistence.persistence.addBinding(binding);const uiSourceCodeOfTruth=networkUISourceCode[this._savingSymbol]?networkUISourceCode:fileSystemUISourceCode;const[{content},encoded]=await Promise.all([uiSourceCodeOfTruth.requestContent(),uiSourceCodeOfTruth.contentEncoded()]);Persistence.persistence.syncContent(uiSourceCodeOfTruth,content,encoded);}
_onUISourceCodeWorkingCopyCommitted(uiSourceCode){this.saveUISourceCodeForOverrides(uiSourceCode);}
canSaveUISourceCodeForOverrides(uiSourceCode){return this._active&&uiSourceCode.project().type()===Workspace.projectTypes.Network&&!uiSourceCode[this._bindingSymbol]&&!uiSourceCode[this._savingSymbol];}
async saveUISourceCodeForOverrides(uiSourceCode){if(!this.canSaveUISourceCodeForOverrides(uiSourceCode)){return;}
uiSourceCode[this._savingSymbol]=true;let encodedPath=this._encodedPathFromUrl(uiSourceCode.url());const content=(await uiSourceCode.requestContent()).content||'';const encoded=await uiSourceCode.contentEncoded();const lastIndexOfSlash=encodedPath.lastIndexOf('/');const encodedFileName=encodedPath.substr(lastIndexOfSlash+1);encodedPath=encodedPath.substr(0,lastIndexOfSlash);await this._project.createFile(encodedPath,encodedFileName,content,encoded);this._fileCreatedForTest(encodedPath,encodedFileName);uiSourceCode[this._savingSymbol]=false;}
_fileCreatedForTest(path,fileName){}
_patternForFileSystemUISourceCode(uiSourceCode){const relativePathParts=Persistence.FileSystemWorkspaceBinding.relativePath(uiSourceCode);if(relativePathParts.length<2){return'';}
if(relativePathParts[1]==='longurls'&&relativePathParts.length!==2){return'http?://'+relativePathParts[0]+'/*';}
return'http?://'+this._decodeLocalPathToUrlPath(relativePathParts.join('/'));}
_onUISourceCodeAdded(uiSourceCode){this._networkUISourceCodeAdded(uiSourceCode);this._filesystemUISourceCodeAdded(uiSourceCode);}
_canHandleNetworkUISourceCode(uiSourceCode){return this._active&&!uiSourceCode.url().startsWith('snippet://');}
_networkUISourceCodeAdded(uiSourceCode){if(uiSourceCode.project().type()!==Workspace.projectTypes.Network||!this._canHandleNetworkUISourceCode(uiSourceCode)){return;}
const url=Common.ParsedURL.urlWithoutHash(uiSourceCode.url());this._networkUISourceCodeForEncodedPath.set(this._encodedPathFromUrl(url),uiSourceCode);const fileSystemUISourceCode=this._project.uiSourceCodeForURL((this._project).fileSystemPath()+'/'+
this._encodedPathFromUrl(url));if(!fileSystemUISourceCode){return;}
this._bind(uiSourceCode,fileSystemUISourceCode);}
_filesystemUISourceCodeAdded(uiSourceCode){if(!this._active||uiSourceCode.project()!==this._project){return;}
this._updateInterceptionPatterns();const relativePath=Persistence.FileSystemWorkspaceBinding.relativePath(uiSourceCode);const networkUISourceCode=this._networkUISourceCodeForEncodedPath.get(relativePath.join('/'));if(networkUISourceCode){this._bind(networkUISourceCode,uiSourceCode);}}
_updateInterceptionPatterns(){this._updateInterceptionThrottler.schedule(innerUpdateInterceptionPatterns.bind(this));function innerUpdateInterceptionPatterns(){if(!this._active){return SDK.multitargetNetworkManager.setInterceptionHandlerForPatterns([],this._interceptionHandlerBound);}
const patterns=new Set();const indexFileName='index.html';for(const uiSourceCode of this._project.uiSourceCodes()){const pattern=this._patternForFileSystemUISourceCode(uiSourceCode);patterns.add(pattern);if(pattern.endsWith('/'+indexFileName)){patterns.add(pattern.substr(0,pattern.length-indexFileName.length));}}
return SDK.multitargetNetworkManager.setInterceptionHandlerForPatterns(Array.from(patterns).map(pattern=>({urlPattern:pattern,interceptionStage:Protocol.Network.InterceptionStage.HeadersReceived})),this._interceptionHandlerBound);}}
_onUISourceCodeRemoved(uiSourceCode){this._networkUISourceCodeRemoved(uiSourceCode);this._filesystemUISourceCodeRemoved(uiSourceCode);}
_networkUISourceCodeRemoved(uiSourceCode){if(uiSourceCode.project().type()!==Workspace.projectTypes.Network){return;}
this._unbind(uiSourceCode);this._networkUISourceCodeForEncodedPath.delete(this._encodedPathFromUrl(uiSourceCode.url()));}
_filesystemUISourceCodeRemoved(uiSourceCode){if(uiSourceCode.project()!==this._project){return;}
this._updateInterceptionPatterns();delete uiSourceCode[this._originalResponseContentPromiseSymbol];this._unbind(uiSourceCode);}
_setProject(project){if(project===this._project){return;}
if(this._project){this._project.uiSourceCodes().forEach(this._filesystemUISourceCodeRemoved.bind(this));}
this._project=project;if(this._project){this._project.uiSourceCodes().forEach(this._filesystemUISourceCodeAdded.bind(this));}
this._updateActiveProject();this.dispatchEventToListeners(Events.ProjectChanged,this._project);}
_onProjectAdded(project){if(project.type()!==Workspace.projectTypes.FileSystem||Persistence.FileSystemWorkspaceBinding.fileSystemType(project)!=='overrides'){return;}
const fileSystemPath=Persistence.FileSystemWorkspaceBinding.fileSystemPath(project.id());if(!fileSystemPath){return;}
if(this._project){this._project.remove();}
this._setProject(project);}
_onProjectRemoved(project){if(project!==this._project){return;}
this._setProject(null);}
async _interceptionHandler(interceptedRequest){const method=interceptedRequest.request.method;if(!this._active||(method!=='GET'&&method!=='POST')){return;}
const path=(this._project).fileSystemPath()+'/'+this._encodedPathFromUrl(interceptedRequest.request.url);const fileSystemUISourceCode=this._project.uiSourceCodeForURL(path);if(!fileSystemUISourceCode){return;}
let mimeType='';if(interceptedRequest.responseHeaders){const responseHeaders=SDK.NetworkManager.lowercaseHeaders(interceptedRequest.responseHeaders);mimeType=responseHeaders['content-type'];}
if(!mimeType){const expectedResourceType=Common.resourceTypes[interceptedRequest.resourceType]||Common.resourceTypes.Other;mimeType=fileSystemUISourceCode.mimeType();if(Common.ResourceType.fromMimeType(mimeType)!==expectedResourceType){mimeType=expectedResourceType.canonicalMimeType();}}
const project=(fileSystemUISourceCode.project());fileSystemUISourceCode[this._originalResponseContentPromiseSymbol]=interceptedRequest.responseBody().then(response=>{if(response.error||response.content===null){return null;}
return response.encoded?atob(response.content):response.content;});const blob=await project.requestFileBlob(fileSystemUISourceCode);interceptedRequest.continueRequestWithContent(new Blob([blob],{type:mimeType}));}}
export const _reservedFileNames=new Set(['con','prn','aux','nul','com1','com2','com3','com4','com5','com6','com7','com8','com9','lpt1','lpt2','lpt3','lpt4','lpt5','lpt6','lpt7','lpt8','lpt9']);export const Events={ProjectChanged:Symbol('ProjectChanged')};self.Persistence=self.Persistence||{};Persistence=Persistence||{};Persistence.NetworkPersistenceManager=NetworkPersistenceManager;Persistence.NetworkPersistenceManager._reservedFileNames=_reservedFileNames;Persistence.NetworkPersistenceManager.Events=Events;Persistence.networkPersistenceManager;