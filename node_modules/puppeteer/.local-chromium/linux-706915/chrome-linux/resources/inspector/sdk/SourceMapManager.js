export default class SourceMapManager extends Common.Object{constructor(target){super();this._target=target;this._isEnabled=true;this._relativeSourceURL=new Map();this._relativeSourceMapURL=new Map();this._resolvedSourceMapId=new Map();this._sourceMapById=new Map();this._sourceMapIdToLoadingClients=new Platform.Multimap();this._sourceMapIdToClients=new Platform.Multimap();SDK.targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged,this._inspectedURLChanged,this);}
setEnabled(isEnabled){if(isEnabled===this._isEnabled){return;}
this._isEnabled=isEnabled;const clients=[...this._resolvedSourceMapId.keys()];for(const client of clients){const relativeSourceURL=this._relativeSourceURL.get(client);const relativeSourceMapURL=this._relativeSourceMapURL.get(client);this.detachSourceMap(client);this.attachSourceMap(client,relativeSourceURL,relativeSourceMapURL);}}
_inspectedURLChanged(event){if(event.data!==this._target){return;}
const prevSourceMapIds=new Map(this._resolvedSourceMapId);for(const[client,prevSourceMapId]of prevSourceMapIds){const relativeSourceURL=this._relativeSourceURL.get(client);const relativeSourceMapURL=this._relativeSourceMapURL.get(client);const{sourceMapId}=this._resolveRelativeURLs(relativeSourceURL,relativeSourceMapURL);if(prevSourceMapId!==sourceMapId){this.detachSourceMap(client);this.attachSourceMap(client,relativeSourceURL,relativeSourceMapURL);}}}
sourceMapForClient(client){const sourceMapId=this._resolvedSourceMapId.get(client);if(!sourceMapId){return null;}
return this._sourceMapById.get(sourceMapId)||null;}
clientsForSourceMap(sourceMap){const sourceMapId=this._getSourceMapId(sourceMap.compiledURL(),sourceMap.url());if(this._sourceMapIdToClients.has(sourceMapId)){return this._sourceMapIdToClients.get(sourceMapId).valuesArray();}
return this._sourceMapIdToLoadingClients.get(sourceMapId).valuesArray();}
_getSourceMapId(sourceURL,sourceMapURL){return`${sourceURL}:${sourceMapURL}`;}
_resolveRelativeURLs(sourceURL,sourceMapURL){const resolvedSourceURL=Common.ParsedURL.completeURL(this._target.inspectedURL(),sourceURL);if(!resolvedSourceURL){return null;}
const resolvedSourceMapURL=Common.ParsedURL.completeURL(resolvedSourceURL,sourceMapURL);if(!resolvedSourceMapURL){return null;}
return{sourceURL:resolvedSourceURL,sourceMapURL:resolvedSourceMapURL,sourceMapId:this._getSourceMapId(resolvedSourceURL,resolvedSourceMapURL)};}
attachSourceMap(client,relativeSourceURL,relativeSourceMapURL){if(!relativeSourceMapURL){return;}
console.assert(!this._resolvedSourceMapId.has(client),'SourceMap is already attached to client');const resolvedURLs=this._resolveRelativeURLs(relativeSourceURL,relativeSourceMapURL);if(!resolvedURLs){return;}
this._relativeSourceURL.set(client,relativeSourceURL);this._relativeSourceMapURL.set(client,relativeSourceMapURL);const{sourceURL,sourceMapURL,sourceMapId}=resolvedURLs;this._resolvedSourceMapId.set(client,sourceMapId);if(!this._isEnabled){return;}
this.dispatchEventToListeners(Events.SourceMapWillAttach,client);if(this._sourceMapById.has(sourceMapId)){attach.call(this,sourceMapId,client);return;}
if(!this._sourceMapIdToLoadingClients.has(sourceMapId)){SDK.TextSourceMap.load(sourceMapURL,sourceURL).then(onSourceMap.bind(this,sourceMapId));}
this._sourceMapIdToLoadingClients.set(sourceMapId,client);function onSourceMap(sourceMapId,sourceMap){this._sourceMapLoadedForTest();const clients=this._sourceMapIdToLoadingClients.get(sourceMapId);this._sourceMapIdToLoadingClients.deleteAll(sourceMapId);if(!clients.size){return;}
if(!sourceMap){for(const client of clients){this.dispatchEventToListeners(Events.SourceMapFailedToAttach,client);}
return;}
this._sourceMapById.set(sourceMapId,sourceMap);for(const client of clients){attach.call(this,sourceMapId,client);}}
function attach(sourceMapId,client){this._sourceMapIdToClients.set(sourceMapId,client);const sourceMap=this._sourceMapById.get(sourceMapId);this.dispatchEventToListeners(Events.SourceMapAttached,{client:client,sourceMap:sourceMap});}}
detachSourceMap(client){const sourceMapId=this._resolvedSourceMapId.get(client);this._relativeSourceURL.delete(client);this._relativeSourceMapURL.delete(client);this._resolvedSourceMapId.delete(client);if(!sourceMapId){return;}
if(!this._sourceMapIdToClients.hasValue(sourceMapId,client)){if(this._sourceMapIdToLoadingClients.delete(sourceMapId,client)){this.dispatchEventToListeners(Events.SourceMapFailedToAttach,client);}
return;}
this._sourceMapIdToClients.delete(sourceMapId,client);const sourceMap=this._sourceMapById.get(sourceMapId);if(!this._sourceMapIdToClients.has(sourceMapId)){this._sourceMapById.delete(sourceMapId);}
this.dispatchEventToListeners(Events.SourceMapDetached,{client:client,sourceMap:sourceMap});}
_sourceMapLoadedForTest(){}
dispose(){SDK.targetManager.removeEventListener(SDK.TargetManager.Events.InspectedURLChanged,this._inspectedURLChanged,this);}}
export const Events={SourceMapWillAttach:Symbol('SourceMapWillAttach'),SourceMapFailedToAttach:Symbol('SourceMapFailedToAttach'),SourceMapAttached:Symbol('SourceMapAttached'),SourceMapDetached:Symbol('SourceMapDetached'),SourceMapChanged:Symbol('SourceMapChanged')};self.SDK=self.SDK||{};SDK=SDK||{};SDK.SourceMapManager=SourceMapManager;SDK.SourceMapManager.Events=Events;