export default class Target extends Protocol.TargetBase{constructor(targetManager,id,name,type,parentTarget,sessionId,suspended,connection){const needsNodeJSPatching=type===Type.Node;super(needsNodeJSPatching,parentTarget,sessionId,connection);this._targetManager=targetManager;this._name=name;this._inspectedURL='';this._capabilitiesMask=0;switch(type){case Type.Frame:this._capabilitiesMask=Capability.Browser|Capability.Storage|Capability.DOM|Capability.JS|Capability.Log|Capability.Network|Capability.Target|Capability.Tracing|Capability.Emulation|Capability.Input|Capability.Inspector;if(!parentTarget){this._capabilitiesMask|=Capability.DeviceEmulation|Capability.ScreenCapture|Capability.Security|Capability.ServiceWorker;}
break;case Type.ServiceWorker:this._capabilitiesMask=Capability.JS|Capability.Log|Capability.Network|Capability.Target|Capability.Inspector;if(!parentTarget){this._capabilitiesMask|=Capability.Browser;}
break;case Type.Worker:this._capabilitiesMask=Capability.JS|Capability.Log|Capability.Network|Capability.Target;break;case Type.Node:this._capabilitiesMask=Capability.JS;break;case Type.Browser:this._capabilitiesMask=Capability.Target;break;}
this._type=type;this._parentTarget=parentTarget;this._id=id;this._modelByConstructor=new Map();this._isSuspended=suspended;}
createModels(required){this._creatingModels=true;this.model(SDK.ResourceTreeModel);const registered=Array.from(SDK.SDKModel.registeredModels.keys());for(const modelClass of registered){const info=SDK.SDKModel.registeredModels.get(modelClass);if(info.autostart||required.has(modelClass)){this.model(modelClass);}}
this._creatingModels=false;}
id(){return this._id;}
name(){return this._name||this._inspectedURLName;}
type(){return this._type;}
markAsNodeJSForTest(){super.markAsNodeJSForTest();this._type=Type.Node;}
targetManager(){return this._targetManager;}
hasAllCapabilities(capabilitiesMask){return(this._capabilitiesMask&capabilitiesMask)===capabilitiesMask;}
decorateLabel(label){return(this._type===Type.Worker||this._type===Type.ServiceWorker)?'\u2699 '+label:label;}
parentTarget(){return this._parentTarget;}
dispose(reason){super.dispose(reason);this._targetManager.removeTarget(this);for(const model of this._modelByConstructor.valuesArray()){model.dispose();}}
model(modelClass){if(!this._modelByConstructor.get(modelClass)){const info=SDK.SDKModel.registeredModels.get(modelClass);if(info===undefined){throw'Model class is not registered @'+new Error().stack;}
if((this._capabilitiesMask&info.capabilities)===info.capabilities){const model=new modelClass(this);this._modelByConstructor.set(modelClass,model);if(!this._creatingModels){this._targetManager.modelAdded(this,modelClass,model);}}}
return this._modelByConstructor.get(modelClass)||null;}
models(){return this._modelByConstructor;}
inspectedURL(){return this._inspectedURL;}
setInspectedURL(inspectedURL){this._inspectedURL=inspectedURL;const parsedURL=inspectedURL.asParsedURL();this._inspectedURLName=parsedURL?parsedURL.lastPathComponentWithFragment():'#'+this._id;if(!this.parentTarget()){Host.InspectorFrontendHost.inspectedURLChanged(inspectedURL||'');}
this._targetManager.dispatchEventToListeners(SDK.TargetManager.Events.InspectedURLChanged,this);if(!this._name){this._targetManager.dispatchEventToListeners(SDK.TargetManager.Events.NameChanged,this);}}
async suspend(reason){if(this._isSuspended){return Promise.resolve();}
this._isSuspended=true;await Promise.all(Array.from(this.models().values(),m=>m.preSuspendModel(reason)));await Promise.all(Array.from(this.models().values(),m=>m.suspendModel(reason)));}
async resume(){if(!this._isSuspended){return Promise.resolve();}
this._isSuspended=false;await Promise.all(Array.from(this.models().values(),m=>m.resumeModel()));await Promise.all(Array.from(this.models().values(),m=>m.postResumeModel()));}
suspended(){return this._isSuspended;}}
export const Capability={Browser:1<<0,DOM:1<<1,JS:1<<2,Log:1<<3,Network:1<<4,Target:1<<5,ScreenCapture:1<<6,Tracing:1<<7,Emulation:1<<8,Security:1<<9,Input:1<<10,Inspector:1<<11,DeviceEmulation:1<<12,Storage:1<<13,ServiceWorker:1<<14,None:0,};export const Type={Frame:'frame',ServiceWorker:'service-worker',Worker:'worker',Node:'node',Browser:'browser',};self.SDK=self.SDK||{};SDK=SDK||{};SDK.Target=Target;SDK.Target.Capability=Capability;SDK.Target.Type=Type;