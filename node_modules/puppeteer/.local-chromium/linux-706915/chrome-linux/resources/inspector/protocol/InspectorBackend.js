export const ProtocolError=Symbol('Protocol.Error');export const DevToolsStubErrorCode=-32015;const _GenericError=-32000;const _ConnectionClosedErrorCode=-32001;export default class InspectorBackend{constructor(){this._agentPrototypes=new Map();this._dispatcherPrototypes=new Map();this._initialized=false;}
static reportProtocolError(error,messageObject){console.error(error+': '+JSON.stringify(messageObject));}
isInitialized(){return this._initialized;}
_addAgentGetterMethodToProtocolTargetPrototype(domain){let upperCaseLength=0;while(upperCaseLength<domain.length&&domain[upperCaseLength].toLowerCase()!==domain[upperCaseLength]){++upperCaseLength;}
const methodName=domain.substr(0,upperCaseLength).toLowerCase()+domain.slice(upperCaseLength)+'Agent';function agentGetter(){return this._agents[domain];}
TargetBase.prototype[methodName]=agentGetter;function registerDispatcher(dispatcher){this.registerDispatcher(domain,dispatcher);}
TargetBase.prototype['register'+domain+'Dispatcher']=registerDispatcher;}
_agentPrototype(domain){if(!this._agentPrototypes.has(domain)){this._agentPrototypes.set(domain,new _AgentPrototype(domain));this._addAgentGetterMethodToProtocolTargetPrototype(domain);}
return this._agentPrototypes.get(domain);}
_dispatcherPrototype(domain){if(!this._dispatcherPrototypes.has(domain)){this._dispatcherPrototypes.set(domain,new _DispatcherPrototype());}
return this._dispatcherPrototypes.get(domain);}
registerCommand(method,signature,replyArgs,hasErrorData){const domainAndMethod=method.split('.');this._agentPrototype(domainAndMethod[0]).registerCommand(domainAndMethod[1],signature,replyArgs,hasErrorData);this._initialized=true;}
registerEnum(type,values){const domainAndName=type.split('.');const domain=domainAndName[0];if(!Protocol[domain]){Protocol[domain]={};}
Protocol[domain][domainAndName[1]]=values;this._initialized=true;}
registerEvent(eventName,params){const domain=eventName.split('.')[0];this._dispatcherPrototype(domain).registerEvent(eventName,params);this._initialized=true;}
wrapClientCallback(clientCallback,errorPrefix,constructor,defaultValue){function callbackWrapper(error,value){if(error){console.error(errorPrefix+error);clientCallback(defaultValue);return;}
if(constructor){clientCallback(new constructor(value));}else{clientCallback(value);}}
return callbackWrapper;}}
let _factory;export class Connection{constructor(){this._onMessage;}
setOnMessage(onMessage){}
setOnDisconnect(onDisconnect){}
sendRawMessage(message){}
disconnect(){}
static setFactory(factory){_factory=factory;}
static getFactory(){return _factory;}}
const test={dumpProtocol:null,deprecatedRunAfterPendingDispatches:null,sendRawMessage:null,suppressRequestErrors:false,onMessageSent:null,onMessageReceived:null,};export class SessionRouter{constructor(connection){this._connection=connection;this._lastMessageId=1;this._pendingResponsesCount=0;this._domainToLogger=new Map();this._sessions=new Map();this._pendingScripts=[];test.deprecatedRunAfterPendingDispatches=this._deprecatedRunAfterPendingDispatches.bind(this);test.sendRawMessage=this._sendRawMessageForTesting.bind(this);this._connection.setOnMessage(this._onMessage.bind(this));this._connection.setOnDisconnect(reason=>{const session=this._sessions.get('');if(session){session.target.dispose(reason);}});}
registerSession(target,sessionId,proxyConnection){this._sessions.set(sessionId,{target,callbacks:new Map(),proxyConnection});}
unregisterSession(sessionId){const session=this._sessions.get(sessionId);for(const callback of session.callbacks.values()){SessionRouter.dispatchConnectionError(callback);}
this._sessions.delete(sessionId);}
_getTargetBySessionId(sessionId){const session=this._sessions.get(sessionId?sessionId:'');if(!session){return null;}
return session.target;}
_nextMessageId(){return this._lastMessageId++;}
connection(){return this._connection;}
sendMessage(sessionId,domain,method,params,callback){const messageObject={};const messageId=this._nextMessageId();messageObject.id=messageId;messageObject.method=method;if(params){messageObject.params=params;}
if(sessionId){messageObject.sessionId=sessionId;}
if(test.dumpProtocol){test.dumpProtocol('frontend: '+JSON.stringify(messageObject));}
if(test.onMessageSent){const paramsObject=JSON.parse(JSON.stringify(params||{}));test.onMessageSent({domain,method,params:(paramsObject),id:messageId},this._getTargetBySessionId(sessionId));}
++this._pendingResponsesCount;this._sessions.get(sessionId).callbacks.set(messageId,callback);this._connection.sendRawMessage(JSON.stringify(messageObject));}
_sendRawMessageForTesting(method,params,callback){const domain=method.split('.')[0];this.sendMessage('',domain,method,params,callback||(()=>{}));}
_onMessage(message){if(test.dumpProtocol){test.dumpProtocol('backend: '+((typeof message==='string')?message:JSON.stringify(message)));}
if(test.onMessageReceived){const messageObjectCopy=JSON.parse((typeof message==='string')?message:JSON.stringify(message));test.onMessageReceived((messageObjectCopy),this._getTargetBySessionId(messageObjectCopy.sessionId));}
const messageObject=((typeof message==='string')?JSON.parse(message):message);let proxyConnectionIsActive=false;for(const session of this._sessions.values()){if(!session.proxyConnection){continue;}
if(proxyConnectionIsActive){Protocol.InspectorBackend.reportProtocolError('Protocol Error: multiple proxy connections are not explicitly supported right now',messageObject);}
if(session.proxyConnection._onMessage){session.proxyConnection._onMessage(messageObject);proxyConnectionIsActive=true;}else{Protocol.InspectorBackend.reportProtocolError('Protocol Error: the session has a proxyConnection with no _onMessage',messageObject);}}
const sessionId=messageObject.sessionId||'';const session=this._sessions.get(sessionId);if(!session){if(!proxyConnectionIsActive){Protocol.InspectorBackend.reportProtocolError('Protocol Error: the message with wrong session id',messageObject);}
return;}
if(session.proxyConnection){return;}
if(session.target._needsNodeJSPatching){Protocol.NodeURL.patch(messageObject);}
if('id'in messageObject){const callback=session.callbacks.get(messageObject.id);session.callbacks.delete(messageObject.id);if(!callback){if(!proxyConnectionIsActive){Protocol.InspectorBackend.reportProtocolError('Protocol Error: the message with wrong id',messageObject);}
return;}
callback(messageObject.error,messageObject.result);--this._pendingResponsesCount;if(this._pendingScripts.length&&!this._pendingResponsesCount){this._deprecatedRunAfterPendingDispatches();}}else{if(!('method'in messageObject)){Protocol.InspectorBackend.reportProtocolError('Protocol Error: the message without method',messageObject);return;}
const method=messageObject.method.split('.');const domainName=method[0];if(!(domainName in session.target._dispatchers)){Protocol.InspectorBackend.reportProtocolError(`Protocol Error: the message ${messageObject.method} is for non-existing domain '${domainName}'`,messageObject);return;}
session.target._dispatchers[domainName].dispatch(method[1],messageObject);}}
_deprecatedRunAfterPendingDispatches(script){if(script){this._pendingScripts.push(script);}
setTimeout(()=>{if(!this._pendingResponsesCount){this._executeAfterPendingDispatches();}else{this._deprecatedRunAfterPendingDispatches();}},0);}
_executeAfterPendingDispatches(){if(!this._pendingResponsesCount){const scripts=this._pendingScripts;this._pendingScripts=[];for(let id=0;id<scripts.length;++id){scripts[id]();}}}
static dispatchConnectionError(callback){const error={message:'Connection is closed, can\'t dispatch pending call',code:_ConnectionClosedErrorCode,data:null};setTimeout(()=>callback(error,null),0);}}
export class TargetBase{constructor(needsNodeJSPatching,parentTarget,sessionId,connection){this._needsNodeJSPatching=needsNodeJSPatching;this._sessionId=sessionId;if((!parentTarget&&connection)||(!parentTarget&&sessionId)||(connection&&sessionId)){throw new Error('Either connection or sessionId (but not both) must be supplied for a child target');}
if(sessionId){this._router=parentTarget._router;}else if(connection){this._router=new SessionRouter(connection);}else{this._router=new SessionRouter(_factory());}
this._router.registerSession(this,this._sessionId);this._agents={};for(const[domain,agentPrototype]of Protocol.inspectorBackend._agentPrototypes){this._agents[domain]=Object.create((agentPrototype));this._agents[domain]._target=this;}
this._dispatchers={};for(const[domain,dispatcherPrototype]of Protocol.inspectorBackend._dispatcherPrototypes){this._dispatchers[domain]=Object.create((dispatcherPrototype));this._dispatchers[domain]._dispatchers=[];}}
registerDispatcher(domain,dispatcher){if(!this._dispatchers[domain]){return;}
this._dispatchers[domain].addDomainDispatcher(dispatcher);}
dispose(reason){this._router.unregisterSession(this._sessionId);this._router=null;}
isDisposed(){return!this._router;}
markAsNodeJSForTest(){this._needsNodeJSPatching=true;}
router(){return this._router;}}
export class _AgentPrototype{constructor(domain){this._replyArgs={};this._hasErrorData={};this._domain=domain;}
registerCommand(methodName,signature,replyArgs,hasErrorData){const domainAndMethod=this._domain+'.'+methodName;function sendMessagePromise(vararg){const params=Array.prototype.slice.call(arguments);return _AgentPrototype.prototype._sendMessageToBackendPromise.call(this,domainAndMethod,signature,params);}
this[methodName]=sendMessagePromise;function invoke(request){return this._invoke(domainAndMethod,request);}
this['invoke_'+methodName]=invoke;this._replyArgs[domainAndMethod]=replyArgs;if(hasErrorData){this._hasErrorData[domainAndMethod]=true;}}
_prepareParameters(method,signature,args,errorCallback){const params={};let hasParams=false;for(const param of signature){const paramName=param['name'];const typeName=param['type'];const optionalFlag=param['optional'];if(!args.length&&!optionalFlag){errorCallback(`Protocol Error: Invalid number of arguments for method '${method}' call. `+`It must have the following arguments ${JSON.stringify(signature)}'.`);return null;}
const value=args.shift();if(optionalFlag&&typeof value==='undefined'){continue;}
if(typeof value!==typeName){errorCallback(`Protocol Error: Invalid type of argument '${paramName}' for method '${method}' call. `+`It must be '${typeName}' but it is '${typeof value}'.`);return null;}
params[paramName]=value;hasParams=true;}
if(args.length){errorCallback(`Protocol Error: Extra ${args.length} arguments in a call to method '${method}'.`);return null;}
return hasParams?params:null;}
_sendMessageToBackendPromise(method,signature,args){let errorMessage;function onError(message){console.error(message);errorMessage=message;}
const params=this._prepareParameters(method,signature,args,onError);if(errorMessage){return Promise.resolve(null);}
return new Promise(resolve=>{const callback=(error,result)=>{if(error&&!test.suppressRequestErrors&&error.code!==Protocol.DevToolsStubErrorCode&&error.code!==_GenericError&&error.code!==_ConnectionClosedErrorCode){console.error('Request '+method+' failed. '+JSON.stringify(error));}
if(error){resolve(null);return;}
const args=this._replyArgs[method];resolve(result&&args.length?result[args[0]]:undefined);};if(!this._target._router){SessionRouter.dispatchConnectionError(callback);}else{this._target._router.sendMessage(this._target._sessionId,this._domain,method,params,callback);}});}
_invoke(method,request){return new Promise(fulfill=>{const callback=(error,result)=>{if(error&&!test.suppressRequestErrors&&error.code!==Protocol.DevToolsStubErrorCode&&error.code!==_GenericError&&error.code!==_ConnectionClosedErrorCode){console.error('Request '+method+' failed. '+JSON.stringify(error));}
if(!result){result={};}
if(error){result[Protocol.Error]=error.message;}
fulfill(result);};if(!this._target._router){SessionRouter.dispatchConnectionError(callback);}else{this._target._router.sendMessage(this._target._sessionId,this._domain,method,request,callback);}});}}
export class _DispatcherPrototype{constructor(){this._eventArgs={};}
registerEvent(eventName,params){this._eventArgs[eventName]=params;}
addDomainDispatcher(dispatcher){this._dispatchers.push(dispatcher);}
dispatch(functionName,messageObject){if(!this._dispatchers.length){return;}
if(!this._eventArgs[messageObject.method]){Protocol.InspectorBackend.reportProtocolError(`Protocol Error: Attempted to dispatch an unspecified method '${messageObject.method}'`,messageObject);return;}
const params=[];if(messageObject.params){const paramNames=this._eventArgs[messageObject.method];for(let i=0;i<paramNames.length;++i){params.push(messageObject.params[paramNames[i]]);}}
for(let index=0;index<this._dispatchers.length;++index){const dispatcher=this._dispatchers[index];if(functionName in dispatcher){dispatcher[functionName].apply(dispatcher,params);}}}}
self.Protocol=self.Protocol||{};Protocol=Protocol||{};Protocol.DevToolsStubErrorCode=DevToolsStubErrorCode;Protocol.Error=ProtocolError;Protocol.InspectorBackend=InspectorBackend;Protocol.InspectorBackend._AgentPrototype=_AgentPrototype;Protocol.InspectorBackend._DispatcherPrototype=_DispatcherPrototype;Protocol.Connection=Connection;Protocol.inspectorBackend=new InspectorBackend();Protocol.test=test;Protocol.SessionRouter=SessionRouter;Protocol.TargetBase=TargetBase;Protocol._Callback;