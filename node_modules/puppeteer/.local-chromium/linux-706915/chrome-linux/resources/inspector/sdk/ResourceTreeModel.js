export default class ResourceTreeModel extends SDK.SDKModel{constructor(target){super(target);const networkManager=target.model(SDK.NetworkManager);if(networkManager){networkManager.addEventListener(SDK.NetworkManager.Events.RequestFinished,this._onRequestFinished,this);networkManager.addEventListener(SDK.NetworkManager.Events.RequestUpdateDropped,this._onRequestUpdateDropped,this);}
this._agent=target.pageAgent();this._agent.enable();this._securityOriginManager=target.model(SDK.SecurityOriginManager);target.registerPageDispatcher(new SDK.PageDispatcher(this));this._frames=new Map();this._cachedResourcesProcessed=false;this._pendingReloadOptions=null;this._reloadSuspensionCount=0;this._isInterstitialShowing=false;this.mainFrame=null;this._agent.getResourceTree().then(this._processCachedResources.bind(this));}
static frameForRequest(request){const networkManager=SDK.NetworkManager.forRequest(request);const resourceTreeModel=networkManager?networkManager.target().model(ResourceTreeModel):null;if(!resourceTreeModel){return null;}
return resourceTreeModel.frameForId(request.frameId);}
static frames(){let result=[];for(const resourceTreeModel of SDK.targetManager.models(ResourceTreeModel)){result=result.concat(resourceTreeModel._frames.valuesArray());}
return result;}
static resourceForURL(url){for(const resourceTreeModel of SDK.targetManager.models(ResourceTreeModel)){const mainFrame=resourceTreeModel.mainFrame;const result=mainFrame?mainFrame.resourceForURL(url):null;if(result){return result;}}
return null;}
static reloadAllPages(bypassCache,scriptToEvaluateOnLoad){for(const resourceTreeModel of SDK.targetManager.models(ResourceTreeModel)){if(!resourceTreeModel.target().parentTarget()){resourceTreeModel.reloadPage(bypassCache,scriptToEvaluateOnLoad);}}}
domModel(){return(this.target().model(SDK.DOMModel));}
_processCachedResources(mainFramePayload){if(mainFramePayload){this.dispatchEventToListeners(Events.WillLoadCachedResources);this._addFramesRecursively(null,mainFramePayload);this.target().setInspectedURL(mainFramePayload.frame.url);}
this._cachedResourcesProcessed=true;const runtimeModel=this.target().model(SDK.RuntimeModel);if(runtimeModel){runtimeModel.setExecutionContextComparator(this._executionContextComparator.bind(this));runtimeModel.fireExecutionContextOrderChanged();}
this.dispatchEventToListeners(Events.CachedResourcesLoaded,this);}
cachedResourcesLoaded(){return this._cachedResourcesProcessed;}
isInterstitialShowing(){return this._isInterstitialShowing;}
_addFrame(frame,aboutToNavigate){this._frames.set(frame.id,frame);if(frame.isMainFrame()){this.mainFrame=frame;}
this.dispatchEventToListeners(Events.FrameAdded,frame);this._updateSecurityOrigins();}
_frameAttached(frameId,parentFrameId,stackTrace){const parentFrame=parentFrameId?(this._frames.get(parentFrameId)||null):null;if(!this._cachedResourcesProcessed&&parentFrame){return null;}
if(this._frames.has(frameId)){return null;}
const frame=new ResourceTreeFrame(this,parentFrame,frameId,null,stackTrace||null);if(parentFrameId&&!parentFrame){frame._crossTargetParentFrameId=parentFrameId;}
if(frame.isMainFrame()&&this.mainFrame){this._frameDetached(this.mainFrame.id);}
this._addFrame(frame,true);return frame;}
_frameNavigated(framePayload){const parentFrame=framePayload.parentId?(this._frames.get(framePayload.parentId)||null):null;if(!this._cachedResourcesProcessed&&parentFrame){return;}
let frame=this._frames.get(framePayload.id);if(!frame){frame=this._frameAttached(framePayload.id,framePayload.parentId||'');console.assert(frame);}
this.dispatchEventToListeners(Events.FrameWillNavigate,frame);frame._navigate(framePayload);this.dispatchEventToListeners(Events.FrameNavigated,frame);if(frame.isMainFrame()){this.dispatchEventToListeners(Events.MainFrameNavigated,frame);}
const resources=frame.resources();for(let i=0;i<resources.length;++i){this.dispatchEventToListeners(Events.ResourceAdded,resources[i]);}
if(frame.isMainFrame()){this.target().setInspectedURL(frame.url);}
this._updateSecurityOrigins();}
_frameDetached(frameId){if(!this._cachedResourcesProcessed){return;}
const frame=this._frames.get(frameId);if(!frame){return;}
if(frame.parentFrame){frame.parentFrame._removeChildFrame(frame);}else{frame._remove();}
this._updateSecurityOrigins();}
_onRequestFinished(event){if(!this._cachedResourcesProcessed){return;}
const request=(event.data);if(request.failed||request.resourceType()===Common.resourceTypes.XHR){return;}
const frame=this._frames.get(request.frameId);if(frame){frame._addRequest(request);}}
_onRequestUpdateDropped(event){if(!this._cachedResourcesProcessed){return;}
const frameId=event.data.frameId;const frame=this._frames.get(frameId);if(!frame){return;}
const url=event.data.url;if(frame._resourcesMap[url]){return;}
const resource=new SDK.Resource(this,null,url,frame.url,frameId,event.data.loaderId,Common.resourceTypes[event.data.resourceType],event.data.mimeType,event.data.lastModified,null);frame.addResource(resource);}
frameForId(frameId){return this._frames.get(frameId);}
forAllResources(callback){if(this.mainFrame){return this.mainFrame._callForFrameResources(callback);}
return false;}
frames(){return this._frames.valuesArray();}
resourceForURL(url){return this.mainFrame?this.mainFrame.resourceForURL(url):null;}
_addFramesRecursively(parentFrame,frameTreePayload){const framePayload=frameTreePayload.frame;const frame=new ResourceTreeFrame(this,parentFrame,framePayload.id,framePayload,null);if(!parentFrame&&framePayload.parentId){frame._crossTargetParentFrameId=framePayload.parentId;}
this._addFrame(frame);for(let i=0;frameTreePayload.childFrames&&i<frameTreePayload.childFrames.length;++i){this._addFramesRecursively(frame,frameTreePayload.childFrames[i]);}
for(let i=0;i<frameTreePayload.resources.length;++i){const subresource=frameTreePayload.resources[i];const resource=this._createResourceFromFramePayload(framePayload,subresource.url,Common.resourceTypes[subresource.type],subresource.mimeType,subresource.lastModified||null,subresource.contentSize||null);frame.addResource(resource);}
if(!frame._resourcesMap[framePayload.url]){const frameResource=this._createResourceFromFramePayload(framePayload,framePayload.url,Common.resourceTypes.Document,framePayload.mimeType,null,null);frame.addResource(frameResource);}}
_createResourceFromFramePayload(frame,url,type,mimeType,lastModifiedTime,contentSize){const lastModified=typeof lastModifiedTime==='number'?new Date(lastModifiedTime*1000):null;return new SDK.Resource(this,null,url,frame.url,frame.id,frame.loaderId,type,mimeType,lastModified,contentSize);}
suspendReload(){this._reloadSuspensionCount++;}
resumeReload(){this._reloadSuspensionCount--;console.assert(this._reloadSuspensionCount>=0,'Unbalanced call to ResourceTreeModel.resumeReload()');if(!this._reloadSuspensionCount&&this._pendingReloadOptions){this.reloadPage.apply(this,this._pendingReloadOptions);}}
reloadPage(bypassCache,scriptToEvaluateOnLoad){if(!this._pendingReloadOptions){this.dispatchEventToListeners(Events.PageReloadRequested,this);}
if(this._reloadSuspensionCount){this._pendingReloadOptions=[bypassCache,scriptToEvaluateOnLoad];return;}
this._pendingReloadOptions=null;this.dispatchEventToListeners(Events.WillReloadPage);this._agent.reload(bypassCache,scriptToEvaluateOnLoad);}
navigate(url){return this._agent.navigate(url);}
async navigationHistory(){const response=await this._agent.invoke_getNavigationHistory({});if(response[Protocol.Error]){return null;}
return{currentIndex:response.currentIndex,entries:response.entries};}
navigateToHistoryEntry(entry){this._agent.navigateToHistoryEntry(entry.id);}
async fetchAppManifest(){const response=await this._agent.invoke_getAppManifest({});if(response[Protocol.Error]){return{url:response.url,data:null,errors:[]};}
return{url:response.url,data:response.data||null,errors:response.errors};}
async getInstallabilityErrors(){const response=await this._agent.invoke_getInstallabilityErrors({});return response.errors||[];}
_executionContextComparator(a,b){function framePath(frame){let currentFrame=frame;const parents=[];while(currentFrame){parents.push(currentFrame);currentFrame=currentFrame.parentFrame;}
return parents.reverse();}
if(a.target()!==b.target()){return SDK.ExecutionContext.comparator(a,b);}
const framesA=a.frameId?framePath(this.frameForId(a.frameId)):[];const framesB=b.frameId?framePath(this.frameForId(b.frameId)):[];let frameA;let frameB;for(let i=0;;i++){if(!framesA[i]||!framesB[i]||(framesA[i]!==framesB[i])){frameA=framesA[i];frameB=framesB[i];break;}}
if(!frameA&&frameB){return-1;}
if(!frameB&&frameA){return 1;}
if(frameA&&frameB){return frameA.id.localeCompare(frameB.id);}
return SDK.ExecutionContext.comparator(a,b);}
_getSecurityOriginData(){const securityOrigins=new Set();let mainSecurityOrigin=null;let unreachableMainSecurityOrigin=null;for(const frame of this._frames.values()){const origin=frame.securityOrigin;if(!origin){continue;}
securityOrigins.add(origin);if(frame.isMainFrame()){mainSecurityOrigin=origin;if(frame.unreachableUrl()){const unreachableParsed=new Common.ParsedURL(frame.unreachableUrl());unreachableMainSecurityOrigin=unreachableParsed.securityOrigin();}}}
return{securityOrigins:securityOrigins,mainSecurityOrigin:mainSecurityOrigin,unreachableMainSecurityOrigin:unreachableMainSecurityOrigin};}
_updateSecurityOrigins(){const data=this._getSecurityOriginData();this._securityOriginManager.setMainSecurityOrigin(data.mainSecurityOrigin||'',data.unreachableMainSecurityOrigin||'');this._securityOriginManager.updateSecurityOrigins(data.securityOrigins);}
getMainSecurityOrigin(){const data=this._getSecurityOriginData();return data.mainSecurityOrigin||data.unreachableMainSecurityOrigin;}}
export const Events={FrameAdded:Symbol('FrameAdded'),FrameNavigated:Symbol('FrameNavigated'),FrameDetached:Symbol('FrameDetached'),FrameResized:Symbol('FrameResized'),FrameWillNavigate:Symbol('FrameWillNavigate'),MainFrameNavigated:Symbol('MainFrameNavigated'),ResourceAdded:Symbol('ResourceAdded'),WillLoadCachedResources:Symbol('WillLoadCachedResources'),CachedResourcesLoaded:Symbol('CachedResourcesLoaded'),DOMContentLoaded:Symbol('DOMContentLoaded'),LifecycleEvent:Symbol('LifecycleEvent'),Load:Symbol('Load'),PageReloadRequested:Symbol('PageReloadRequested'),WillReloadPage:Symbol('WillReloadPage'),InterstitialShown:Symbol('InterstitialShown'),InterstitialHidden:Symbol('InterstitialHidden')};export class ResourceTreeFrame{constructor(model,parentFrame,frameId,payload,creationStackTrace){this._model=model;this._parentFrame=parentFrame;this._id=frameId;this._url='';this._crossTargetParentFrameId=null;if(payload){this._loaderId=payload.loaderId;this._name=payload.name;this._url=payload.url;this._securityOrigin=payload.securityOrigin;this._mimeType=payload.mimeType;this._unreachableUrl=payload.unreachableUrl||'';}
this._creationStackTrace=creationStackTrace;this._childFrames=[];this._resourcesMap={};if(this._parentFrame){this._parentFrame._childFrames.push(this);}}
_navigate(framePayload){this._loaderId=framePayload.loaderId;this._name=framePayload.name;this._url=framePayload.url;this._securityOrigin=framePayload.securityOrigin;this._mimeType=framePayload.mimeType;this._unreachableUrl=framePayload.unreachableUrl||'';const mainResource=this._resourcesMap[this._url];this._resourcesMap={};this._removeChildFrames();if(mainResource&&mainResource.loaderId===this._loaderId){this.addResource(mainResource);}}
resourceTreeModel(){return this._model;}
get id(){return this._id;}
get name(){return this._name||'';}
get url(){return this._url;}
get securityOrigin(){return this._securityOrigin;}
unreachableUrl(){return this._unreachableUrl;}
get loaderId(){return this._loaderId;}
get parentFrame(){return this._parentFrame;}
get childFrames(){return this._childFrames;}
crossTargetParentFrame(){if(!this._crossTargetParentFrameId){return null;}
if(!this._model.target().parentTarget()){return null;}
const parentModel=this._model.target().parentTarget().model(ResourceTreeModel);if(!parentModel){return null;}
return parentModel._frames.get(this._crossTargetParentFrameId)||null;}
findCreationCallFrame(searchFn){let stackTrace=this._creationStackTrace;while(stackTrace){const foundEntry=stackTrace.callFrames.find(searchFn);if(foundEntry){return foundEntry;}
stackTrace=this.parent;}
return null;}
isMainFrame(){return!this._parentFrame;}
isTopFrame(){return!this._parentFrame&&!this._crossTargetParentFrameId;}
get mainResource(){return this._resourcesMap[this._url];}
_removeChildFrame(frame){this._childFrames.remove(frame);frame._remove();}
_removeChildFrames(){const frames=this._childFrames;this._childFrames=[];for(let i=0;i<frames.length;++i){frames[i]._remove();}}
_remove(){this._removeChildFrames();this._model._frames.delete(this.id);this._model.dispatchEventToListeners(Events.FrameDetached,this);}
addResource(resource){if(this._resourcesMap[resource.url]===resource){return;}
this._resourcesMap[resource.url]=resource;this._model.dispatchEventToListeners(Events.ResourceAdded,resource);}
_addRequest(request){let resource=this._resourcesMap[request.url()];if(resource&&resource.request===request){return;}
resource=new SDK.Resource(this._model,request,request.url(),request.documentURL,request.frameId,request.loaderId,request.resourceType(),request.mimeType,null,null);this._resourcesMap[resource.url]=resource;this._model.dispatchEventToListeners(Events.ResourceAdded,resource);}
resources(){const result=[];for(const url in this._resourcesMap){result.push(this._resourcesMap[url]);}
return result;}
resourceForURL(url){let resource=this._resourcesMap[url]||null;if(resource){return resource;}
for(let i=0;!resource&&i<this._childFrames.length;++i){resource=this._childFrames[i].resourceForURL(url);}
return resource;}
_callForFrameResources(callback){for(const url in this._resourcesMap){if(callback(this._resourcesMap[url])){return true;}}
for(let i=0;i<this._childFrames.length;++i){if(this._childFrames[i]._callForFrameResources(callback)){return true;}}
return false;}
displayName(){if(this.isTopFrame()){return Common.UIString('top');}
const subtitle=new Common.ParsedURL(this._url).displayName;if(subtitle){if(!this._name){return subtitle;}
return this._name+' ('+subtitle+')';}
return Common.UIString('<iframe>');}}
export class PageDispatcher{constructor(resourceTreeModel){this._resourceTreeModel=resourceTreeModel;}
domContentEventFired(time){this._resourceTreeModel.dispatchEventToListeners(Events.DOMContentLoaded,time);}
loadEventFired(time){this._resourceTreeModel.dispatchEventToListeners(Events.Load,{resourceTreeModel:this._resourceTreeModel,loadTime:time});}
lifecycleEvent(frameId,loaderId,name,time){this._resourceTreeModel.dispatchEventToListeners(Events.LifecycleEvent,{frameId,name});}
frameAttached(frameId,parentFrameId,stackTrace){this._resourceTreeModel._frameAttached(frameId,parentFrameId,stackTrace);}
frameNavigated(frame){this._resourceTreeModel._frameNavigated(frame);}
frameDetached(frameId){this._resourceTreeModel._frameDetached(frameId);}
frameStartedLoading(frameId){}
frameStoppedLoading(frameId){}
frameRequestedNavigation(frameId){}
frameScheduledNavigation(frameId,delay){}
frameClearedScheduledNavigation(frameId){}
navigatedWithinDocument(frameId,url){}
frameResized(){this._resourceTreeModel.dispatchEventToListeners(Events.FrameResized,null);}
javascriptDialogOpening(url,message,dialogType,hasBrowserHandler,prompt){if(!hasBrowserHandler){this._resourceTreeModel._agent.handleJavaScriptDialog(false);}}
javascriptDialogClosed(result,userInput){}
screencastFrame(data,metadata,sessionId){}
screencastVisibilityChanged(visible){}
interstitialShown(){this._resourceTreeModel._isInterstitialShowing=true;this._resourceTreeModel.dispatchEventToListeners(Events.InterstitialShown);}
interstitialHidden(){this._resourceTreeModel._isInterstitialShowing=false;this._resourceTreeModel.dispatchEventToListeners(Events.InterstitialHidden);}
windowOpen(url,windowName,windowFeatures,userGesture){}
compilationCacheProduced(url,data){}
fileChooserOpened(mode){}
downloadWillBegin(frameId,url){}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.ResourceTreeModel=ResourceTreeModel;SDK.ResourceTreeModel.Events=Events;SDK.ResourceTreeFrame=ResourceTreeFrame;SDK.PageDispatcher=PageDispatcher;SDK.ResourceTreeModel.SecurityOriginData;SDK.SDKModel.register(ResourceTreeModel,SDK.Target.Capability.DOM,true);