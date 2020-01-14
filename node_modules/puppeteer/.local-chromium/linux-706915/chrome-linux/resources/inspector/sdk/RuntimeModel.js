export default class RuntimeModel extends SDK.SDKModel{constructor(target){super(target);this._agent=target.runtimeAgent();this.target().registerRuntimeDispatcher(new RuntimeDispatcher(this));this._agent.enable();this._executionContextById=new Map();this._executionContextComparator=ExecutionContext.comparator;this._hasSideEffectSupport=null;if(Common.moduleSetting('customFormatters').get()){this._agent.setCustomObjectFormatterEnabled(true);}
Common.moduleSetting('customFormatters').addChangeListener(this._customFormattersStateChanged.bind(this));}
static isSideEffectFailure(response){const exceptionDetails=!response[Protocol.Error]&&response.exceptionDetails;return!!(exceptionDetails&&exceptionDetails.exception&&exceptionDetails.exception.description&&exceptionDetails.exception.description.startsWith('EvalError: Possible side-effect in debug-evaluate'));}
debuggerModel(){return(this.target().model(SDK.DebuggerModel));}
heapProfilerModel(){return(this.target().model(SDK.HeapProfilerModel));}
executionContexts(){return this._executionContextById.valuesArray().sort(this.executionContextComparator());}
setExecutionContextComparator(comparator){this._executionContextComparator=comparator;}
executionContextComparator(){return this._executionContextComparator;}
defaultExecutionContext(){for(const context of this.executionContexts()){if(context.isDefault){return context;}}
return null;}
executionContext(id){return this._executionContextById.get(id)||null;}
_executionContextCreated(context){const data=context.auxData||{isDefault:true};const executionContext=new ExecutionContext(this,context.id,context.name,context.origin,data['isDefault'],data['frameId']);this._executionContextById.set(executionContext.id,executionContext);this.dispatchEventToListeners(Events.ExecutionContextCreated,executionContext);}
_executionContextDestroyed(executionContextId){const executionContext=this._executionContextById.get(executionContextId);if(!executionContext){return;}
this.debuggerModel().executionContextDestroyed(executionContext);this._executionContextById.delete(executionContextId);this.dispatchEventToListeners(Events.ExecutionContextDestroyed,executionContext);}
fireExecutionContextOrderChanged(){this.dispatchEventToListeners(Events.ExecutionContextOrderChanged,this);}
_executionContextsCleared(){this.debuggerModel().globalObjectCleared();const contexts=this.executionContexts();this._executionContextById.clear();for(let i=0;i<contexts.length;++i){this.dispatchEventToListeners(Events.ExecutionContextDestroyed,contexts[i]);}}
createRemoteObject(payload){console.assert(typeof payload==='object','Remote object payload should only be an object');return new SDK.RemoteObjectImpl(this,payload.objectId,payload.type,payload.subtype,payload.value,payload.unserializableValue,payload.description,payload.preview,payload.customPreview,payload.className);}
createScopeRemoteObject(payload,scopeRef){return new SDK.ScopeRemoteObject(this,payload.objectId,scopeRef,payload.type,payload.subtype,payload.value,payload.unserializableValue,payload.description,payload.preview);}
createRemoteObjectFromPrimitiveValue(value){const type=typeof value;let unserializableValue=undefined;const unserializableDescription=SDK.RemoteObject.unserializableDescription(value);if(unserializableDescription!==null){unserializableValue=(unserializableDescription);}
if(typeof unserializableValue!=='undefined'){value=undefined;}
return new SDK.RemoteObjectImpl(this,undefined,type,undefined,value,unserializableValue);}
createRemotePropertyFromPrimitiveValue(name,value){return new SDK.RemoteObjectProperty(name,this.createRemoteObjectFromPrimitiveValue(value));}
discardConsoleEntries(){this._agent.discardConsoleEntries();}
releaseObjectGroup(objectGroupName){this._agent.releaseObjectGroup(objectGroupName);}
releaseEvaluationResult(result){if(result.object){result.object.release();}
if(result.exceptionDetails&&result.exceptionDetails.exception){const exception=result.exceptionDetails.exception;const exceptionObject=this.createRemoteObject({type:exception.type,objectId:exception.objectId});exceptionObject.release();}}
runIfWaitingForDebugger(){this._agent.runIfWaitingForDebugger();}
_customFormattersStateChanged(event){const enabled=(event.data);this._agent.setCustomObjectFormatterEnabled(enabled);}
async compileScript(expression,sourceURL,persistScript,executionContextId){const response=await this._agent.invoke_compileScript({expression:String.escapeInvalidUnicodeCharacters(expression),sourceURL:sourceURL,persistScript:persistScript,executionContextId:executionContextId});if(response[Protocol.Error]){console.error(response[Protocol.Error]);return null;}
return{scriptId:response.scriptId,exceptionDetails:response.exceptionDetails};}
async runScript(scriptId,executionContextId,objectGroup,silent,includeCommandLineAPI,returnByValue,generatePreview,awaitPromise){const response=await this._agent.invoke_runScript({scriptId,executionContextId,objectGroup,silent,includeCommandLineAPI,returnByValue,generatePreview,awaitPromise});const error=response[Protocol.Error];if(error){console.error(error);return{error:error};}
return{object:this.createRemoteObject(response.result),exceptionDetails:response.exceptionDetails};}
async queryObjects(prototype){if(!prototype.objectId){return{error:'Prototype should be an Object.'};}
const response=await this._agent.invoke_queryObjects({prototypeObjectId:(prototype.objectId),objectGroup:'console'});const error=response[Protocol.Error];if(error){console.error(error);return{error:error};}
return{objects:this.createRemoteObject(response.objects)};}
async isolateId(){return(await this._agent.getIsolateId())||this.target().id();}
async heapUsage(){const result=await this._agent.invoke_getHeapUsage({});return result[Protocol.Error]?null:result;}
_inspectRequested(payload,hints){const object=this.createRemoteObject(payload);if(hints.copyToClipboard){this._copyRequested(object);return;}
if(hints.queryObjects){this._queryObjectsRequested(object);return;}
if(object.isNode()){Common.Revealer.reveal(object).then(object.release.bind(object));return;}
if(object.type==='function'){SDK.RemoteFunction.objectAsFunction(object).targetFunctionDetails().then(didGetDetails);return;}
function didGetDetails(response){object.release();if(!response||!response.location){return;}
Common.Revealer.reveal(response.location);}
object.release();}
_copyRequested(object){if(!object.objectId){Host.InspectorFrontendHost.copyText(object.unserializableValue()||(object.value));return;}
object.callFunctionJSON(toStringForClipboard,[{value:object.subtype}]).then(Host.InspectorFrontendHost.copyText.bind(Host.InspectorFrontendHost));function toStringForClipboard(subtype){if(subtype==='node'){return this.outerHTML;}
if(subtype&&typeof this==='undefined'){return subtype+'';}
try{return JSON.stringify(this,null,'  ');}catch(e){return''+this;}}}
async _queryObjectsRequested(object){const result=await this.queryObjects(object);object.release();if(result.error){Common.console.error(result.error);return;}
this.dispatchEventToListeners(Events.QueryObjectRequested,{objects:result.objects});}
static simpleTextFromException(exceptionDetails){let text=exceptionDetails.text;if(exceptionDetails.exception&&exceptionDetails.exception.description){let description=exceptionDetails.exception.description;if(description.indexOf('\n')!==-1){description=description.substring(0,description.indexOf('\n'));}
text+=' '+description;}
return text;}
exceptionThrown(timestamp,exceptionDetails){const exceptionWithTimestamp={timestamp:timestamp,details:exceptionDetails};this.dispatchEventToListeners(Events.ExceptionThrown,exceptionWithTimestamp);}
_exceptionRevoked(exceptionId){this.dispatchEventToListeners(Events.ExceptionRevoked,exceptionId);}
_consoleAPICalled(type,args,executionContextId,timestamp,stackTrace,context){const consoleAPICall={type:type,args:args,executionContextId:executionContextId,timestamp:timestamp,stackTrace:stackTrace,context:context};this.dispatchEventToListeners(Events.ConsoleAPICalled,consoleAPICall);}
executionContextIdForScriptId(scriptId){const script=this.debuggerModel().scriptForId(scriptId);return script?script.executionContextId:0;}
executionContextForStackTrace(stackTrace){while(stackTrace&&!stackTrace.callFrames.length){stackTrace=stackTrace.parent;}
if(!stackTrace||!stackTrace.callFrames.length){return 0;}
return this.executionContextIdForScriptId(stackTrace.callFrames[0].scriptId);}
hasSideEffectSupport(){return this._hasSideEffectSupport;}
async checkSideEffectSupport(){const testContext=this.executionContexts().peekLast();if(!testContext){return false;}
const response=await this._agent.invoke_evaluate({expression:String.escapeInvalidUnicodeCharacters(_sideEffectTestExpression),contextId:testContext.id,throwOnSideEffect:true});this._hasSideEffectSupport=RuntimeModel.isSideEffectFailure(response);return this._hasSideEffectSupport;}
terminateExecution(){return this._agent.invoke_terminateExecution({});}}
export const _sideEffectTestExpression='(async function(){ await 1; })()';export const Events={ExecutionContextCreated:Symbol('ExecutionContextCreated'),ExecutionContextDestroyed:Symbol('ExecutionContextDestroyed'),ExecutionContextChanged:Symbol('ExecutionContextChanged'),ExecutionContextOrderChanged:Symbol('ExecutionContextOrderChanged'),ExceptionThrown:Symbol('ExceptionThrown'),ExceptionRevoked:Symbol('ExceptionRevoked'),ConsoleAPICalled:Symbol('ConsoleAPICalled'),QueryObjectRequested:Symbol('QueryObjectRequested'),};export class RuntimeDispatcher{constructor(runtimeModel){this._runtimeModel=runtimeModel;}
executionContextCreated(context){this._runtimeModel._executionContextCreated(context);}
executionContextDestroyed(executionContextId){this._runtimeModel._executionContextDestroyed(executionContextId);}
executionContextsCleared(){this._runtimeModel._executionContextsCleared();}
exceptionThrown(timestamp,exceptionDetails){this._runtimeModel.exceptionThrown(timestamp,exceptionDetails);}
exceptionRevoked(reason,exceptionId){this._runtimeModel._exceptionRevoked(exceptionId);}
consoleAPICalled(type,args,executionContextId,timestamp,stackTrace,context){this._runtimeModel._consoleAPICalled(type,args,executionContextId,timestamp,stackTrace,context);}
inspectRequested(payload,hints){this._runtimeModel._inspectRequested(payload,hints);}}
export class ExecutionContext{constructor(runtimeModel,id,name,origin,isDefault,frameId){this.id=id;this.name=name;this.origin=origin;this.isDefault=isDefault;this.runtimeModel=runtimeModel;this.debuggerModel=runtimeModel.debuggerModel();this.frameId=frameId;this._setLabel('');}
target(){return this.runtimeModel.target();}
static comparator(a,b){function targetWeight(target){if(!target.parentTarget()){return 5;}
if(target.type()===SDK.Target.Type.Frame){return 4;}
if(target.type()===SDK.Target.Type.ServiceWorker){return 3;}
if(target.type()===SDK.Target.Type.Worker){return 2;}
return 1;}
function targetPath(target){let currentTarget=target;const parents=[];while(currentTarget){parents.push(currentTarget);currentTarget=currentTarget.parentTarget();}
return parents.reverse();}
const tagetsA=targetPath(a.target());const targetsB=targetPath(b.target());let targetA;let targetB;for(let i=0;;i++){if(!tagetsA[i]||!targetsB[i]||(tagetsA[i]!==targetsB[i])){targetA=tagetsA[i];targetB=targetsB[i];break;}}
if(!targetA&&targetB){return-1;}
if(!targetB&&targetA){return 1;}
if(targetA&&targetB){const weightDiff=targetWeight(targetA)-targetWeight(targetB);if(weightDiff){return-weightDiff;}
return targetA.id().localeCompare(targetB.id());}
if(a.isDefault){return-1;}
if(b.isDefault){return+1;}
return a.name.localeCompare(b.name);}
evaluate(options,userGesture,awaitPromise){if(this.debuggerModel.selectedCallFrame()){return this.debuggerModel.evaluateOnSelectedCallFrame(options);}
const needsTerminationOptions=!!options.throwOnSideEffect||options.timeout!==undefined;if(!needsTerminationOptions||this.runtimeModel.hasSideEffectSupport()){return this._evaluateGlobal(options,userGesture,awaitPromise);}
const unsupportedError={error:'Side-effect checks not supported by backend.'};if(this.runtimeModel.hasSideEffectSupport()===false){return Promise.resolve(unsupportedError);}
return this.runtimeModel.checkSideEffectSupport().then(()=>{if(this.runtimeModel.hasSideEffectSupport()){return this._evaluateGlobal(options,userGesture,awaitPromise);}
return Promise.resolve(unsupportedError);});}
globalObject(objectGroup,generatePreview){return this._evaluateGlobal({expression:'this',objectGroup:objectGroup,includeCommandLineAPI:false,silent:true,returnByValue:false,generatePreview:generatePreview},false,false);}
async _evaluateGlobal(options,userGesture,awaitPromise){if(!options.expression){options.expression='this';}
const response=await this.runtimeModel._agent.invoke_evaluate({expression:String.escapeInvalidUnicodeCharacters(options.expression),objectGroup:options.objectGroup,includeCommandLineAPI:options.includeCommandLineAPI,silent:options.silent,contextId:this.id,returnByValue:options.returnByValue,generatePreview:options.generatePreview,userGesture:userGesture,awaitPromise:awaitPromise,throwOnSideEffect:options.throwOnSideEffect,timeout:options.timeout,disableBreaks:options.disableBreaks});const error=response[Protocol.Error];if(error){console.error(error);return{error:error};}
return{object:this.runtimeModel.createRemoteObject(response.result),exceptionDetails:response.exceptionDetails};}
async globalLexicalScopeNames(){const response=await this.runtimeModel._agent.invoke_globalLexicalScopeNames({executionContextId:this.id});return response[Protocol.Error]?[]:response.names;}
label(){return this._label;}
setLabel(label){this._setLabel(label);this.runtimeModel.dispatchEventToListeners(Events.ExecutionContextChanged,this);}
_setLabel(label){if(label){this._label=label;return;}
if(this.name){this._label=this.name;return;}
const parsedUrl=this.origin.asParsedURL();this._label=parsedUrl?parsedUrl.lastPathComponentWithFragment():'';}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.RuntimeModel=RuntimeModel;SDK.RuntimeModel._sideEffectTestExpression=_sideEffectTestExpression;SDK.RuntimeModel.Events=Events;SDK.RuntimeDispatcher=RuntimeDispatcher;SDK.ExecutionContext=ExecutionContext;SDK.RuntimeModel.CompileScriptResult;SDK.RuntimeModel.EvaluationOptions;SDK.RuntimeModel.EvaluationResult;SDK.RuntimeModel.QueryObjectResult;SDK.RuntimeModel.ConsoleAPICall;SDK.RuntimeModel.ExceptionWithTimestamp;SDK.SDKModel.register(SDK.RuntimeModel,SDK.Target.Capability.JS,true);