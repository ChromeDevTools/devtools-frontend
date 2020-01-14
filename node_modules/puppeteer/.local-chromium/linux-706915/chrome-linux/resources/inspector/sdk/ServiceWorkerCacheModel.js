export default class ServiceWorkerCacheModel extends SDK.SDKModel{constructor(target){super(target);target.registerStorageDispatcher(this);this._caches=new Map();this._cacheAgent=target.cacheStorageAgent();this._storageAgent=target.storageAgent();this._securityOriginManager=target.model(SDK.SecurityOriginManager);this._originsUpdated=new Set();this._throttler=new Common.Throttler(2000);this._enabled=false;}
enable(){if(this._enabled){return;}
this._securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginAdded,this._securityOriginAdded,this);this._securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginRemoved,this._securityOriginRemoved,this);for(const securityOrigin of this._securityOriginManager.securityOrigins()){this._addOrigin(securityOrigin);}
this._enabled=true;}
clearForOrigin(origin){this._removeOrigin(origin);this._addOrigin(origin);}
refreshCacheNames(){for(const cache of this._caches.values()){this._cacheRemoved(cache);}
this._caches.clear();const securityOrigins=this._securityOriginManager.securityOrigins();for(const securityOrigin of securityOrigins){this._loadCacheNames(securityOrigin);}}
async deleteCache(cache){const response=await this._cacheAgent.invoke_deleteCache({cacheId:cache.cacheId});if(response[Protocol.Error]){console.error(`ServiceWorkerCacheAgent error deleting cache ${cache.toString()}: ${response[Protocol.Error]}`);return;}
this._caches.delete(cache.cacheId);this._cacheRemoved(cache);}
async deleteCacheEntry(cache,request){const response=await this._cacheAgent.invoke_deleteEntry({cacheId:cache.cacheId,request});if(!response[Protocol.Error]){return;}
Common.console.error(Common.UIString('ServiceWorkerCacheAgent error deleting cache entry %s in cache: %s',cache.toString(),response[Protocol.Error]));}
loadCacheData(cache,skipCount,pageSize,pathFilter,callback){this._requestEntries(cache,skipCount,pageSize,pathFilter,callback);}
caches(){const caches=new Array();for(const cache of this._caches.values()){caches.push(cache);}
return caches;}
dispose(){for(const cache of this._caches.values()){this._cacheRemoved(cache);}
this._caches.clear();if(this._enabled){this._securityOriginManager.removeEventListener(SDK.SecurityOriginManager.Events.SecurityOriginAdded,this._securityOriginAdded,this);this._securityOriginManager.removeEventListener(SDK.SecurityOriginManager.Events.SecurityOriginRemoved,this._securityOriginRemoved,this);}}
_addOrigin(securityOrigin){this._loadCacheNames(securityOrigin);if(this._isValidSecurityOrigin(securityOrigin)){this._storageAgent.trackCacheStorageForOrigin(securityOrigin);}}
_removeOrigin(securityOrigin){for(const opaqueId of this._caches.keys()){const cache=this._caches.get(opaqueId);if(cache.securityOrigin===securityOrigin){this._caches.delete(opaqueId);this._cacheRemoved(cache);}}
if(this._isValidSecurityOrigin(securityOrigin)){this._storageAgent.untrackCacheStorageForOrigin(securityOrigin);}}
_isValidSecurityOrigin(securityOrigin){const parsedURL=securityOrigin.asParsedURL();return!!parsedURL&&parsedURL.scheme.startsWith('http');}
async _loadCacheNames(securityOrigin){const caches=await this._cacheAgent.requestCacheNames(securityOrigin);if(!caches){return;}
this._updateCacheNames(securityOrigin,caches);}
_updateCacheNames(securityOrigin,cachesJson){function deleteAndSaveOldCaches(cache){if(cache.securityOrigin===securityOrigin&&!updatingCachesIds.has(cache.cacheId)){oldCaches.set(cache.cacheId,cache);this._caches.delete(cache.cacheId);}}
const updatingCachesIds=new Set();const newCaches=new Map();const oldCaches=new Map();for(const cacheJson of cachesJson){const cache=new Cache(this,cacheJson.securityOrigin,cacheJson.cacheName,cacheJson.cacheId);updatingCachesIds.add(cache.cacheId);if(this._caches.has(cache.cacheId)){continue;}
newCaches.set(cache.cacheId,cache);this._caches.set(cache.cacheId,cache);}
this._caches.forEach(deleteAndSaveOldCaches,this);newCaches.forEach(this._cacheAdded,this);oldCaches.forEach(this._cacheRemoved,this);}
_securityOriginAdded(event){const securityOrigin=(event.data);this._addOrigin(securityOrigin);}
_securityOriginRemoved(event){const securityOrigin=(event.data);this._removeOrigin(securityOrigin);}
_cacheAdded(cache){this.dispatchEventToListeners(Events.CacheAdded,{model:this,cache:cache});}
_cacheRemoved(cache){this.dispatchEventToListeners(Events.CacheRemoved,{model:this,cache:cache});}
async _requestEntries(cache,skipCount,pageSize,pathFilter,callback){const response=await this._cacheAgent.invoke_requestEntries({cacheId:cache.cacheId,skipCount,pageSize,pathFilter});if(response[Protocol.Error]){console.error('ServiceWorkerCacheAgent error while requesting entries: ',response[Protocol.Error]);return;}
callback(response.cacheDataEntries,response.returnCount);}
cacheStorageListUpdated(origin){this._originsUpdated.add(origin);this._throttler.schedule(()=>{const promises=Array.from(this._originsUpdated,origin=>this._loadCacheNames(origin));this._originsUpdated.clear();return Promise.all(promises);});}
cacheStorageContentUpdated(origin,cacheName){this.dispatchEventToListeners(Events.CacheStorageContentUpdated,{origin:origin,cacheName:cacheName});}
indexedDBListUpdated(origin){}
indexedDBContentUpdated(origin,databaseName,objectStoreName){}}
export const Events={CacheAdded:Symbol('CacheAdded'),CacheRemoved:Symbol('CacheRemoved'),CacheStorageContentUpdated:Symbol('CacheStorageContentUpdated')};export class Cache{constructor(model,securityOrigin,cacheName,cacheId){this._model=model;this.securityOrigin=securityOrigin;this.cacheName=cacheName;this.cacheId=cacheId;}
equals(cache){return this.cacheId===cache.cacheId;}
toString(){return this.securityOrigin+this.cacheName;}
requestCachedResponse(url,requestHeaders){return this._model._cacheAgent.requestCachedResponse(this.cacheId,url,requestHeaders);}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.ServiceWorkerCacheModel=ServiceWorkerCacheModel;SDK.ServiceWorkerCacheModel.Events=Events;SDK.ServiceWorkerCacheModel.Cache=Cache;SDK.SDKModel.register(SDK.ServiceWorkerCacheModel,SDK.Target.Capability.Storage,false);