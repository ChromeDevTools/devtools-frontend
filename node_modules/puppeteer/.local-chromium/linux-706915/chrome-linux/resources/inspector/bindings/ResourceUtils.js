export function resourceForURL(url){for(const resourceTreeModel of SDK.targetManager.models(SDK.ResourceTreeModel)){const resource=resourceTreeModel.resourceForURL(url);if(resource){return resource;}}
return null;}
export function forAllResources(callback){for(const resourceTreeModel of SDK.targetManager.models(SDK.ResourceTreeModel)){resourceTreeModel.forAllResources(callback);}}
export function displayNameForURL(url){if(!url){return'';}
const resource=Bindings.resourceForURL(url);if(resource){return resource.displayName;}
const uiSourceCode=Workspace.workspace.uiSourceCodeForURL(url);if(uiSourceCode){return uiSourceCode.displayName();}
const mainTarget=SDK.targetManager.mainTarget();const inspectedURL=mainTarget&&mainTarget.inspectedURL();if(!inspectedURL){return url.trimURL('');}
const parsedURL=inspectedURL.asParsedURL();const lastPathComponent=parsedURL?parsedURL.lastPathComponent:parsedURL;const index=inspectedURL.indexOf(lastPathComponent);if(index!==-1&&index+lastPathComponent.length===inspectedURL.length){const baseURL=inspectedURL.substring(0,index);if(url.startsWith(baseURL)){return url.substring(index);}}
if(!parsedURL){return url;}
const displayName=url.trimURL(parsedURL.host);return displayName==='/'?parsedURL.host+'/':displayName;}
export function metadataForURL(target,frameId,url){const resourceTreeModel=target.model(SDK.ResourceTreeModel);if(!resourceTreeModel){return null;}
const frame=resourceTreeModel.frameForId(frameId);if(!frame){return null;}
return Bindings.resourceMetadata(frame.resourceForURL(url));}
export function resourceMetadata(resource){if(!resource||(typeof resource.contentSize()!=='number'&&!resource.lastModified())){return null;}
return new Workspace.UISourceCodeMetadata(resource.lastModified(),resource.contentSize());}
export function frameIdForScript(script){const executionContext=script.executionContext();if(executionContext){return executionContext.frameId||'';}
const resourceTreeModel=script.debuggerModel.target().model(SDK.ResourceTreeModel);if(!resourceTreeModel||!resourceTreeModel.mainFrame){return'';}
return resourceTreeModel.mainFrame.id;}
self.Bindings=self.Bindings||{};Bindings=Bindings||{};Bindings.resourceForURL=resourceForURL;Bindings.forAllResources=forAllResources;Bindings.displayNameForURL=displayNameForURL;Bindings.metadataForURL=metadataForURL;Bindings.resourceMetadata=resourceMetadata;Bindings.frameIdForScript=frameIdForScript;