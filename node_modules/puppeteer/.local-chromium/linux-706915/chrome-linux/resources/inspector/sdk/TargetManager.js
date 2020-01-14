export default class TargetManager extends Common.Object{constructor(){super();this._targets=[];this._observers=[];this._modelListeners=new Platform.Multimap();this._modelObservers=new Platform.Multimap();this._isSuspended=false;}
suspendAllTargets(reason){if(this._isSuspended){return Promise.resolve();}
this._isSuspended=true;this.dispatchEventToListeners(Events.SuspendStateChanged);return Promise.all(this._targets.map(target=>target.suspend(reason)));}
resumeAllTargets(){if(!this._isSuspended){return Promise.resolve();}
this._isSuspended=false;this.dispatchEventToListeners(Events.SuspendStateChanged);return Promise.all(this._targets.map(target=>target.resume()));}
allTargetsSuspended(){return this._isSuspended;}
models(modelClass){const result=[];for(let i=0;i<this._targets.length;++i){const model=this._targets[i].model(modelClass);if(model){result.push(model);}}
return result;}
inspectedURL(){return this._targets[0]?this._targets[0].inspectedURL():'';}
observeModels(modelClass,observer){const models=this.models(modelClass);this._modelObservers.set(modelClass,observer);for(const model of models){observer.modelAdded(model);}}
unobserveModels(modelClass,observer){this._modelObservers.delete(modelClass,observer);}
modelAdded(target,modelClass,model){for(const observer of this._modelObservers.get(modelClass).valuesArray()){observer.modelAdded(model);}}
_modelRemoved(target,modelClass,model){for(const observer of this._modelObservers.get(modelClass).valuesArray()){observer.modelRemoved(model);}}
addModelListener(modelClass,eventType,listener,thisObject){for(let i=0;i<this._targets.length;++i){const model=this._targets[i].model(modelClass);if(model){model.addEventListener(eventType,listener,thisObject);}}
this._modelListeners.set(eventType,{modelClass:modelClass,thisObject:thisObject,listener:listener});}
removeModelListener(modelClass,eventType,listener,thisObject){if(!this._modelListeners.has(eventType)){return;}
for(let i=0;i<this._targets.length;++i){const model=this._targets[i].model(modelClass);if(model){model.removeEventListener(eventType,listener,thisObject);}}
for(const info of this._modelListeners.get(eventType)){if(info.modelClass===modelClass&&info.listener===listener&&info.thisObject===thisObject){this._modelListeners.delete(eventType,info);}}}
observeTargets(targetObserver){if(this._observers.indexOf(targetObserver)!==-1){throw new Error('Observer can only be registered once');}
for(const target of this._targets){targetObserver.targetAdded(target);}
this._observers.push(targetObserver);}
unobserveTargets(targetObserver){this._observers.remove(targetObserver);}
createTarget(id,name,type,parentTarget,sessionId,waitForDebuggerInPage,connection){const target=new SDK.Target(this,id,name,type,parentTarget,sessionId||'',this._isSuspended,connection||null);if(waitForDebuggerInPage){target.pageAgent().waitForDebugger();}
target.createModels(new Set(this._modelObservers.keysArray()));this._targets.push(target);const copy=this._observers.slice(0);for(const observer of copy){observer.targetAdded(target);}
for(const modelClass of target.models().keys()){this.modelAdded(target,modelClass,target.models().get(modelClass));}
for(const key of this._modelListeners.keysArray()){for(const info of this._modelListeners.get(key)){const model=target.model(info.modelClass);if(model){model.addEventListener(key,info.listener,info.thisObject);}}}
return target;}
removeTarget(target){if(!this._targets.includes(target)){return;}
this._targets.remove(target);for(const modelClass of target.models().keys()){this._modelRemoved(target,modelClass,target.models().get(modelClass));}
const copy=this._observers.slice(0);for(const observer of copy){observer.targetRemoved(target);}
for(const key of this._modelListeners.keysArray()){for(const info of this._modelListeners.get(key)){const model=target.model(info.modelClass);if(model){model.removeEventListener(key,info.listener,info.thisObject);}}}}
targets(){return this._targets.slice();}
targetById(id){for(let i=0;i<this._targets.length;++i){if(this._targets[i].id()===id){return this._targets[i];}}
return null;}
mainTarget(){return this._targets[0]||null;}}
export const Events={AvailableTargetsChanged:Symbol('AvailableTargetsChanged'),InspectedURLChanged:Symbol('InspectedURLChanged'),NameChanged:Symbol('NameChanged'),SuspendStateChanged:Symbol('SuspendStateChanged')};export class Observer{targetAdded(target){}
targetRemoved(target){}}
export class SDKModelObserver{modelAdded(model){}
modelRemoved(model){}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.TargetManager=TargetManager;SDK.TargetManager.Events=Events;SDK.TargetManager.Observer=Observer;SDK.SDKModelObserver=SDKModelObserver;SDK.targetManager=new TargetManager();