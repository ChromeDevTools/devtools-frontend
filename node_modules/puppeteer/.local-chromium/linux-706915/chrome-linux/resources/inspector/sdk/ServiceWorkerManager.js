export default class ServiceWorkerManager extends SDK.SDKModel{constructor(target){super(target);target.registerServiceWorkerDispatcher(new ServiceWorkerDispatcher(this));this._lastAnonymousTargetId=0;this._agent=target.serviceWorkerAgent();this._registrations=new Map();this.enable();this._forceUpdateSetting=Common.settings.createSetting('serviceWorkerUpdateOnReload',false);if(this._forceUpdateSetting.get()){this._forceUpdateSettingChanged();}
this._forceUpdateSetting.addChangeListener(this._forceUpdateSettingChanged,this);new ServiceWorkerContextNamer(target,this);}
enable(){if(this._enabled){return;}
this._enabled=true;this._agent.enable();}
disable(){if(!this._enabled){return;}
this._enabled=false;this._registrations.clear();this._agent.disable();}
registrations(){return this._registrations;}
hasRegistrationForURLs(urls){for(const registration of this._registrations.values()){if(urls.filter(url=>url&&url.startsWith(registration.scopeURL)).length===urls.length){return true;}}
return false;}
findVersion(versionId){for(const registration of this.registrations().values()){const version=registration.versions.get(versionId);if(version){return version;}}
return null;}
deleteRegistration(registrationId){const registration=this._registrations.get(registrationId);if(!registration){return;}
if(registration._isRedundant()){this._registrations.delete(registrationId);this.dispatchEventToListeners(Events.RegistrationDeleted,registration);return;}
registration._deleting=true;for(const version of registration.versions.values()){this.stopWorker(version.id);}
this._unregister(registration.scopeURL);}
updateRegistration(registrationId){const registration=this._registrations.get(registrationId);if(!registration){return;}
this._agent.updateRegistration(registration.scopeURL);}
deliverPushMessage(registrationId,data){const registration=this._registrations.get(registrationId);if(!registration){return;}
const origin=Common.ParsedURL.extractOrigin(registration.scopeURL);this._agent.deliverPushMessage(origin,registrationId,data);}
dispatchSyncEvent(registrationId,tag,lastChance){const registration=this._registrations.get(registrationId);if(!registration){return;}
const origin=Common.ParsedURL.extractOrigin(registration.scopeURL);this._agent.dispatchSyncEvent(origin,registrationId,tag,lastChance);}
dispatchPeriodicSyncEvent(registrationId,tag){const registration=this._registrations.get(registrationId);if(!registration){return;}
const origin=Common.ParsedURL.extractOrigin(registration.scopeURL);this._agent.dispatchPeriodicSyncEvent(origin,registrationId,tag);}
_unregister(scope){this._agent.unregister(scope);}
startWorker(scope){this._agent.startWorker(scope);}
skipWaiting(scope){this._agent.skipWaiting(scope);}
stopWorker(versionId){this._agent.stopWorker(versionId);}
inspectWorker(versionId){this._agent.inspectWorker(versionId);}
_workerRegistrationUpdated(registrations){for(const payload of registrations){let registration=this._registrations.get(payload.registrationId);if(!registration){registration=new ServiceWorkerRegistration(payload);this._registrations.set(payload.registrationId,registration);this.dispatchEventToListeners(Events.RegistrationUpdated,registration);continue;}
registration._update(payload);if(registration._shouldBeRemoved()){this._registrations.delete(registration.id);this.dispatchEventToListeners(Events.RegistrationDeleted,registration);}else{this.dispatchEventToListeners(Events.RegistrationUpdated,registration);}}}
_workerVersionUpdated(versions){const registrations=new Set();for(const payload of versions){const registration=this._registrations.get(payload.registrationId);if(!registration){continue;}
registration._updateVersion(payload);registrations.add(registration);}
for(const registration of registrations){if(registration._shouldBeRemoved()){this._registrations.delete(registration.id);this.dispatchEventToListeners(Events.RegistrationDeleted,registration);}else{this.dispatchEventToListeners(Events.RegistrationUpdated,registration);}}}
_workerErrorReported(payload){const registration=this._registrations.get(payload.registrationId);if(!registration){return;}
registration.errors.push(payload);this.dispatchEventToListeners(Events.RegistrationErrorAdded,{registration:registration,error:payload});}
forceUpdateOnReloadSetting(){return this._forceUpdateSetting;}
_forceUpdateSettingChanged(){this._agent.setForceUpdateOnPageLoad(this._forceUpdateSetting.get());}}
export const Events={RegistrationUpdated:Symbol('RegistrationUpdated'),RegistrationErrorAdded:Symbol('RegistrationErrorAdded'),RegistrationDeleted:Symbol('RegistrationDeleted')};export class ServiceWorkerDispatcher{constructor(manager){this._manager=manager;}
workerRegistrationUpdated(registrations){this._manager._workerRegistrationUpdated(registrations);}
workerVersionUpdated(versions){this._manager._workerVersionUpdated(versions);}
workerErrorReported(errorMessage){this._manager._workerErrorReported(errorMessage);}}
export class ServiceWorkerVersion{constructor(registration,payload){this.registration=registration;this._update(payload);}
_update(payload){this.id=payload.versionId;this.scriptURL=payload.scriptURL;const parsedURL=new Common.ParsedURL(payload.scriptURL);this.securityOrigin=parsedURL.securityOrigin();this.runningStatus=payload.runningStatus;this.status=payload.status;this.scriptLastModified=payload.scriptLastModified;this.scriptResponseTime=payload.scriptResponseTime;this.controlledClients=[];for(let i=0;i<payload.controlledClients.length;++i){this.controlledClients.push(payload.controlledClients[i]);}
this.targetId=payload.targetId||null;}
isStartable(){return!this.registration.isDeleted&&this.isActivated()&&this.isStopped();}
isStoppedAndRedundant(){return this.runningStatus===Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopped&&this.status===Protocol.ServiceWorker.ServiceWorkerVersionStatus.Redundant;}
isStopped(){return this.runningStatus===Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopped;}
isStarting(){return this.runningStatus===Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Starting;}
isRunning(){return this.runningStatus===Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Running;}
isStopping(){return this.runningStatus===Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopping;}
isNew(){return this.status===Protocol.ServiceWorker.ServiceWorkerVersionStatus.New;}
isInstalling(){return this.status===Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installing;}
isInstalled(){return this.status===Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installed;}
isActivating(){return this.status===Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activating;}
isActivated(){return this.status===Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated;}
isRedundant(){return this.status===Protocol.ServiceWorker.ServiceWorkerVersionStatus.Redundant;}
mode(){if(this.isNew()||this.isInstalling()){return ServiceWorkerVersion.Modes.Installing;}else if(this.isInstalled()){return ServiceWorkerVersion.Modes.Waiting;}else if(this.isActivating()||this.isActivated()){return ServiceWorkerVersion.Modes.Active;}
return ServiceWorkerVersion.Modes.Redundant;}}
ServiceWorkerVersion.RunningStatus={[Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Running]:ls`running`,[Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Starting]:ls`starting`,[Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopped]:ls`stopped`,[Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopping]:ls`stopping`,};ServiceWorkerVersion.Modes={Installing:'installing',Waiting:'waiting',Active:'active',Redundant:'redundant'};export class ServiceWorkerRegistration{constructor(payload){this._update(payload);this.versions=new Map();this._deleting=false;this.errors=[];}
_update(payload){this._fingerprint=Symbol('fingerprint');this.id=payload.registrationId;this.scopeURL=payload.scopeURL;const parsedURL=new Common.ParsedURL(payload.scopeURL);this.securityOrigin=parsedURL.securityOrigin();this.isDeleted=payload.isDeleted;this.forceUpdateOnPageLoad=payload.forceUpdateOnPageLoad;}
fingerprint(){return this._fingerprint;}
versionsByMode(){const result=new Map();for(const version of this.versions.values()){result.set(version.mode(),version);}
return result;}
_updateVersion(payload){this._fingerprint=Symbol('fingerprint');let version=this.versions.get(payload.versionId);if(!version){version=new ServiceWorkerVersion(this,payload);this.versions.set(payload.versionId,version);return version;}
version._update(payload);return version;}
_isRedundant(){for(const version of this.versions.values()){if(!version.isStoppedAndRedundant()){return false;}}
return true;}
_shouldBeRemoved(){return this._isRedundant()&&(!this.errors.length||this._deleting);}
canBeRemoved(){return this.isDeleted||this._deleting;}
clearErrors(){this._fingerprint=Symbol('fingerprint');this.errors=[];}}
export class ServiceWorkerContextNamer{constructor(target,serviceWorkerManager){this._target=target;this._serviceWorkerManager=serviceWorkerManager;this._versionByTargetId=new Map();serviceWorkerManager.addEventListener(Events.RegistrationUpdated,this._registrationsUpdated,this);serviceWorkerManager.addEventListener(Events.RegistrationDeleted,this._registrationsUpdated,this);SDK.targetManager.addModelListener(SDK.RuntimeModel,SDK.RuntimeModel.Events.ExecutionContextCreated,this._executionContextCreated,this);}
_registrationsUpdated(event){this._versionByTargetId.clear();const registrations=this._serviceWorkerManager.registrations().valuesArray();for(const registration of registrations){const versions=registration.versions.valuesArray();for(const version of versions){if(version.targetId){this._versionByTargetId.set(version.targetId,version);}}}
this._updateAllContextLabels();}
_executionContextCreated(event){const executionContext=(event.data);const serviceWorkerTargetId=this._serviceWorkerTargetId(executionContext.target());if(!serviceWorkerTargetId){return;}
this._updateContextLabel(executionContext,this._versionByTargetId.get(serviceWorkerTargetId)||null);}
_serviceWorkerTargetId(target){if(target.parentTarget()!==this._target||target.type()!==SDK.Target.Type.ServiceWorker){return null;}
return target.id();}
_updateAllContextLabels(){for(const target of SDK.targetManager.targets()){const serviceWorkerTargetId=this._serviceWorkerTargetId(target);if(!serviceWorkerTargetId){continue;}
const version=this._versionByTargetId.get(serviceWorkerTargetId)||null;const runtimeModel=target.model(SDK.RuntimeModel);const executionContexts=runtimeModel?runtimeModel.executionContexts():[];for(const context of executionContexts){this._updateContextLabel(context,version);}}}
_updateContextLabel(context,version){if(!version){context.setLabel('');return;}
const parsedUrl=context.origin.asParsedURL();const label=parsedUrl?parsedUrl.lastPathComponentWithFragment():context.name;context.setLabel(label+' #'+version.id+' ('+version.status+')');}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.ServiceWorkerManager=ServiceWorkerManager;SDK.ServiceWorkerManager.Events=Events;SDK.ServiceWorkerDispatcher=ServiceWorkerDispatcher;SDK.ServiceWorkerVersion=ServiceWorkerVersion;SDK.ServiceWorkerRegistration=ServiceWorkerRegistration;SDK.ServiceWorkerContextNamer=ServiceWorkerContextNamer;SDK.SDKModel.register(ServiceWorkerManager,SDK.Target.Capability.ServiceWorker,true);