const _registeredModels=new Map();export default class SDKModel extends Common.Object{constructor(target){super();this._target=target;}
target(){return this._target;}
preSuspendModel(reason){return Promise.resolve();}
suspendModel(reason){return Promise.resolve();}
resumeModel(){return Promise.resolve();}
postResumeModel(){return Promise.resolve();}
dispose(){}
static register(modelClass,capabilities,autostart){_registeredModels.set(modelClass,{capabilities,autostart});}
static get registeredModels(){return _registeredModels;}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.SDKModel=SDKModel;