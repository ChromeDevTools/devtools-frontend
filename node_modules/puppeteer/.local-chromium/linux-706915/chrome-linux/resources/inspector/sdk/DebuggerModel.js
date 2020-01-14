export default class DebuggerModel extends SDK.SDKModel{constructor(target){super(target);target.registerDebuggerDispatcher(new DebuggerDispatcher(this));this._agent=target.debuggerAgent();this._runtimeModel=(target.model(SDK.RuntimeModel));this._sourceMapManager=new SDK.SourceMapManager(target);this._sourceMapIdToScript=new Map();this._debuggerPausedDetails=null;this._scripts=new Map();this._scriptsBySourceURL=new Map();this._discardableScripts=[];this._breakpointResolvedEventTarget=new Common.Object();this._isPausing=false;Common.moduleSetting('pauseOnExceptionEnabled').addChangeListener(this._pauseOnExceptionStateChanged,this);Common.moduleSetting('pauseOnCaughtException').addChangeListener(this._pauseOnExceptionStateChanged,this);Common.moduleSetting('disableAsyncStackTraces').addChangeListener(this._asyncStackTracesStateChanged,this);Common.moduleSetting('breakpointsActive').addChangeListener(this._breakpointsActiveChanged,this);if(!target.suspended()){this._enableDebugger();}
this._stringMap=new Map();this._sourceMapManager.setEnabled(Common.moduleSetting('jsSourceMapsEnabled').get());Common.moduleSetting('jsSourceMapsEnabled').addChangeListener(event=>this._sourceMapManager.setEnabled((event.data)));}
static _sourceMapId(executionContextId,sourceURL,sourceMapURL){if(!sourceMapURL){return null;}
return executionContextId+':'+sourceURL+':'+sourceMapURL;}
sourceMapManager(){return this._sourceMapManager;}
runtimeModel(){return this._runtimeModel;}
debuggerEnabled(){return!!this._debuggerEnabled;}
_enableDebugger(){if(this._debuggerEnabled){return Promise.resolve();}
this._debuggerEnabled=true;const isRemoteFrontend=Root.Runtime.queryParam('remoteFrontend')||Root.Runtime.queryParam('ws');const maxScriptsCacheSize=isRemoteFrontend?10e6:100e6;const enablePromise=this._agent.enable(maxScriptsCacheSize);enablePromise.then(this._registerDebugger.bind(this));this._pauseOnExceptionStateChanged();this._asyncStackTracesStateChanged();if(!Common.moduleSetting('breakpointsActive').get()){this._breakpointsActiveChanged();}
if(SDK.DebuggerModel._scheduledPauseOnAsyncCall){this._pauseOnAsyncCall(SDK.DebuggerModel._scheduledPauseOnAsyncCall);}
this.dispatchEventToListeners(Events.DebuggerWasEnabled,this);return enablePromise;}
_registerDebugger(debuggerId){if(!debuggerId){return;}
SDK.DebuggerModel._debuggerIdToModel.set(debuggerId,this);this._debuggerId=debuggerId;this.dispatchEventToListeners(Events.DebuggerIsReadyToPause,this);}
isReadyToPause(){return!!this._debuggerId;}
static modelForDebuggerId(debuggerId){return SDK.DebuggerModel._debuggerIdToModel.get(debuggerId)||null;}
_disableDebugger(){if(!this._debuggerEnabled){return Promise.resolve();}
this._debuggerEnabled=false;const disablePromise=this._agent.disable();this._isPausing=false;this._asyncStackTracesStateChanged();this.globalObjectCleared();this.dispatchEventToListeners(Events.DebuggerWasDisabled);SDK.DebuggerModel._debuggerIdToModel.delete(this._debuggerId);return disablePromise;}
_skipAllPauses(skip){if(this._skipAllPausesTimeout){clearTimeout(this._skipAllPausesTimeout);delete this._skipAllPausesTimeout;}
this._agent.setSkipAllPauses(skip);}
skipAllPausesUntilReloadOrTimeout(timeout){if(this._skipAllPausesTimeout){clearTimeout(this._skipAllPausesTimeout);}
this._agent.setSkipAllPauses(true);this._skipAllPausesTimeout=setTimeout(this._skipAllPauses.bind(this,false),timeout);}
_pauseOnExceptionStateChanged(){let state;if(!Common.moduleSetting('pauseOnExceptionEnabled').get()){state=PauseOnExceptionsState.DontPauseOnExceptions;}else if(Common.moduleSetting('pauseOnCaughtException').get()){state=PauseOnExceptionsState.PauseOnAllExceptions;}else{state=PauseOnExceptionsState.PauseOnUncaughtExceptions;}
this._agent.setPauseOnExceptions(state);}
_asyncStackTracesStateChanged(){const maxAsyncStackChainDepth=32;const enabled=!Common.moduleSetting('disableAsyncStackTraces').get()&&this._debuggerEnabled;this._agent.setAsyncCallStackDepth(enabled?maxAsyncStackChainDepth:0);}
_breakpointsActiveChanged(){this._agent.setBreakpointsActive(Common.moduleSetting('breakpointsActive').get());}
stepInto(){this._agent.stepInto();}
stepOver(){this._agent.stepOver();}
stepOut(){this._agent.stepOut();}
scheduleStepIntoAsync(){this._agent.invoke_stepInto({breakOnAsyncCall:true});}
resume(){this._agent.resume();this._isPausing=false;}
pause(){this._isPausing=true;this._skipAllPauses(false);this._agent.pause();}
_pauseOnAsyncCall(parentStackTraceId){return this._agent.invoke_pauseOnAsyncCall({parentStackTraceId:parentStackTraceId});}
async setBreakpointByURL(url,lineNumber,columnNumber,condition){let urlRegex;if(this.target().type()===SDK.Target.Type.Node){const platformPath=Common.ParsedURL.urlToPlatformPath(url,Host.isWin());urlRegex=`${platformPath.escapeForRegExp()}|${url.escapeForRegExp()}`;}
let minColumnNumber=0;const scripts=this._scriptsBySourceURL.get(url)||[];for(let i=0,l=scripts.length;i<l;++i){const script=scripts[i];if(lineNumber===script.lineOffset){minColumnNumber=minColumnNumber?Math.min(minColumnNumber,script.columnOffset):script.columnOffset;}}
columnNumber=Math.max(columnNumber,minColumnNumber);const response=await this._agent.invoke_setBreakpointByUrl({lineNumber:lineNumber,url:urlRegex?undefined:url,urlRegex:urlRegex,columnNumber:columnNumber,condition:condition});if(response[Protocol.Error]){return{locations:[],breakpointId:null};}
let locations=[];if(response.locations){locations=response.locations.map(payload=>Location.fromPayload(this,payload));}
return{locations:locations,breakpointId:response.breakpointId};}
async setBreakpointInAnonymousScript(scriptId,scriptHash,lineNumber,columnNumber,condition){const response=await this._agent.invoke_setBreakpointByUrl({lineNumber:lineNumber,scriptHash:scriptHash,columnNumber:columnNumber,condition:condition});const error=response[Protocol.Error];if(error){if(error!=='Either url or urlRegex must be specified.'){return{locations:[],breakpointId:null};}
return this._setBreakpointBySourceId(scriptId,lineNumber,columnNumber,condition);}
let locations=[];if(response.locations){locations=response.locations.map(payload=>Location.fromPayload(this,payload));}
return{locations:locations,breakpointId:response.breakpointId};}
async _setBreakpointBySourceId(scriptId,lineNumber,columnNumber,condition){const response=await this._agent.invoke_setBreakpoint({location:{scriptId:scriptId,lineNumber:lineNumber,columnNumber:columnNumber},condition:condition});if(response[Protocol.Error]){return{breakpointId:null,locations:[]};}
let actualLocation=[];if(response.actualLocation){actualLocation=[Location.fromPayload(this,response.actualLocation)];}
return{locations:actualLocation,breakpointId:response.breakpointId};}
async removeBreakpoint(breakpointId){const response=await this._agent.invoke_removeBreakpoint({breakpointId});if(response[Protocol.Error]){console.error('Failed to remove breakpoint: '+response[Protocol.Error]);}}
async getPossibleBreakpoints(startLocation,endLocation,restrictToFunction){const response=await this._agent.invoke_getPossibleBreakpoints({start:startLocation.payload(),end:endLocation?endLocation.payload():undefined,restrictToFunction:restrictToFunction});if(response[Protocol.Error]||!response.locations){return[];}
return response.locations.map(location=>BreakLocation.fromPayload(this,location));}
async fetchAsyncStackTrace(stackId){const response=await this._agent.invoke_getStackTrace({stackTraceId:stackId});return response[Protocol.Error]?null:response.stackTrace;}
_breakpointResolved(breakpointId,location){this._breakpointResolvedEventTarget.dispatchEventToListeners(breakpointId,Location.fromPayload(this,location));}
globalObjectCleared(){this._setDebuggerPausedDetails(null);this._reset();this.dispatchEventToListeners(Events.GlobalObjectCleared,this);}
_reset(){for(const scriptWithSourceMap of this._sourceMapIdToScript.values()){this._sourceMapManager.detachSourceMap(scriptWithSourceMap);}
this._sourceMapIdToScript.clear();this._scripts.clear();this._scriptsBySourceURL.clear();this._stringMap.clear();this._discardableScripts=[];}
scripts(){return Array.from(this._scripts.values());}
scriptForId(scriptId){return this._scripts.get(scriptId)||null;}
scriptsForSourceURL(sourceURL){if(!sourceURL){return[];}
return this._scriptsBySourceURL.get(sourceURL)||[];}
scriptsForExecutionContext(executionContext){const result=[];for(const script of this._scripts.values()){if(script.executionContextId===executionContext.id){result.push(script);}}
return result;}
setScriptSource(scriptId,newSource,callback){this._scripts.get(scriptId).editSource(newSource,this._didEditScriptSource.bind(this,scriptId,newSource,callback));}
_didEditScriptSource(scriptId,newSource,callback,error,exceptionDetails,callFrames,asyncStackTrace,asyncStackTraceId,needsStepIn){callback(error,exceptionDetails);if(needsStepIn){this.stepInto();return;}
if(!error&&callFrames&&callFrames.length){this._pausedScript(callFrames,this._debuggerPausedDetails.reason,this._debuggerPausedDetails.auxData,this._debuggerPausedDetails.breakpointIds,asyncStackTrace,asyncStackTraceId);}}
get callFrames(){return this._debuggerPausedDetails?this._debuggerPausedDetails.callFrames:null;}
debuggerPausedDetails(){return this._debuggerPausedDetails;}
_setDebuggerPausedDetails(debuggerPausedDetails){this._isPausing=false;this._debuggerPausedDetails=debuggerPausedDetails;if(this._debuggerPausedDetails){if(Root.Runtime.experiments.isEnabled('emptySourceMapAutoStepping')&&this._beforePausedCallback){if(!this._beforePausedCallback.call(null,this._debuggerPausedDetails)){return false;}}
this.dispatchEventToListeners(Events.DebuggerPaused,this);}
if(debuggerPausedDetails){this.setSelectedCallFrame(debuggerPausedDetails.callFrames[0]);}else{this.setSelectedCallFrame(null);}
return true;}
setBeforePausedCallback(callback){this._beforePausedCallback=callback;}
async _pausedScript(callFrames,reason,auxData,breakpointIds,asyncStackTrace,asyncStackTraceId,asyncCallStackTraceId){if(asyncCallStackTraceId){SDK.DebuggerModel._scheduledPauseOnAsyncCall=asyncCallStackTraceId;const promises=[];for(const model of SDK.DebuggerModel._debuggerIdToModel.values()){promises.push(model._pauseOnAsyncCall(asyncCallStackTraceId));}
await Promise.all(promises);this.resume();return;}
const pausedDetails=new DebuggerPausedDetails(this,callFrames,reason,auxData,breakpointIds,asyncStackTrace,asyncStackTraceId);if(pausedDetails&&this._continueToLocationCallback){const callback=this._continueToLocationCallback;delete this._continueToLocationCallback;if(callback(pausedDetails)){return;}}
if(!this._setDebuggerPausedDetails(pausedDetails)){this._agent.stepInto();}
SDK.DebuggerModel._scheduledPauseOnAsyncCall=null;}
_resumedScript(){this._setDebuggerPausedDetails(null);this.dispatchEventToListeners(Events.DebuggerResumed,this);}
_parsedScriptSource(scriptId,sourceURL,startLine,startColumn,endLine,endColumn,executionContextId,hash,executionContextAuxData,isLiveEdit,sourceMapURL,hasSourceURLComment,hasSyntaxError,length,originStackTrace){if(this._scripts.has(scriptId)){return this._scripts.get(scriptId);}
let isContentScript=false;if(executionContextAuxData&&('isDefault'in executionContextAuxData)){isContentScript=!executionContextAuxData['isDefault'];}
sourceURL=this._internString(sourceURL);const script=new SDK.Script(this,scriptId,sourceURL,startLine,startColumn,endLine,endColumn,executionContextId,this._internString(hash),isContentScript,isLiveEdit,sourceMapURL,hasSourceURLComment,length,originStackTrace);this._registerScript(script);this.dispatchEventToListeners(Events.ParsedScriptSource,script);const sourceMapId=SDK.DebuggerModel._sourceMapId(script.executionContextId,script.sourceURL,script.sourceMapURL);if(sourceMapId&&!hasSyntaxError){const previousScript=this._sourceMapIdToScript.get(sourceMapId);if(previousScript){this._sourceMapManager.detachSourceMap(previousScript);}
this._sourceMapIdToScript.set(sourceMapId,script);this._sourceMapManager.attachSourceMap(script,script.sourceURL,script.sourceMapURL);}
const isDiscardable=hasSyntaxError&&script.isAnonymousScript();if(isDiscardable){this._discardableScripts.push(script);this._collectDiscardedScripts();}
return script;}
setSourceMapURL(script,newSourceMapURL){let sourceMapId=SDK.DebuggerModel._sourceMapId(script.executionContextId,script.sourceURL,script.sourceMapURL);if(sourceMapId&&this._sourceMapIdToScript.get(sourceMapId)===script){this._sourceMapIdToScript.delete(sourceMapId);}
this._sourceMapManager.detachSourceMap(script);script.sourceMapURL=newSourceMapURL;sourceMapId=SDK.DebuggerModel._sourceMapId(script.executionContextId,script.sourceURL,script.sourceMapURL);if(!sourceMapId){return;}
this._sourceMapIdToScript.set(sourceMapId,script);this._sourceMapManager.attachSourceMap(script,script.sourceURL,script.sourceMapURL);}
executionContextDestroyed(executionContext){const sourceMapIds=Array.from(this._sourceMapIdToScript.keys());for(const sourceMapId of sourceMapIds){const script=this._sourceMapIdToScript.get(sourceMapId);if(script.executionContextId===executionContext.id){this._sourceMapIdToScript.delete(sourceMapId);this._sourceMapManager.detachSourceMap(script);}}}
_registerScript(script){this._scripts.set(script.scriptId,script);if(script.isAnonymousScript()){return;}
let scripts=this._scriptsBySourceURL.get(script.sourceURL);if(!scripts){scripts=[];this._scriptsBySourceURL.set(script.sourceURL,scripts);}
scripts.push(script);}
_unregisterScript(script){console.assert(script.isAnonymousScript());this._scripts.delete(script.scriptId);}
_collectDiscardedScripts(){if(this._discardableScripts.length<1000){return;}
const scriptsToDiscard=this._discardableScripts.splice(0,100);for(const script of scriptsToDiscard){this._unregisterScript(script);this.dispatchEventToListeners(Events.DiscardedAnonymousScriptSource,script);}}
createRawLocation(script,lineNumber,columnNumber){return new Location(this,script.scriptId,lineNumber,columnNumber);}
createRawLocationByURL(sourceURL,lineNumber,columnNumber){let closestScript=null;const scripts=this._scriptsBySourceURL.get(sourceURL)||[];for(let i=0,l=scripts.length;i<l;++i){const script=scripts[i];if(!closestScript){closestScript=script;}
if(script.lineOffset>lineNumber||(script.lineOffset===lineNumber&&script.columnOffset>columnNumber)){continue;}
if(script.endLine<lineNumber||(script.endLine===lineNumber&&script.endColumn<=columnNumber)){continue;}
closestScript=script;break;}
return closestScript?new Location(this,closestScript.scriptId,lineNumber,columnNumber):null;}
createRawLocationByScriptId(scriptId,lineNumber,columnNumber){const script=this.scriptForId(scriptId);return script?this.createRawLocation(script,lineNumber,columnNumber):null;}
createRawLocationsByStackTrace(stackTrace){const frames=[];while(stackTrace){for(const frame of stackTrace.callFrames){frames.push(frame);}
stackTrace=stackTrace.parent;}
const rawLocations=[];for(const frame of frames){const rawLocation=this.createRawLocationByScriptId(frame.scriptId,frame.lineNumber,frame.columnNumber);if(rawLocation){rawLocations.push(rawLocation);}}
return rawLocations;}
isPaused(){return!!this.debuggerPausedDetails();}
isPausing(){return this._isPausing;}
setSelectedCallFrame(callFrame){if(this._selectedCallFrame===callFrame){return;}
this._selectedCallFrame=callFrame;this.dispatchEventToListeners(Events.CallFrameSelected,this);}
selectedCallFrame(){return this._selectedCallFrame;}
evaluateOnSelectedCallFrame(options){return this.selectedCallFrame().evaluate(options);}
functionDetailsPromise(remoteObject){return remoteObject.getAllProperties(false,false).then(buildDetails.bind(this));function buildDetails(response){if(!response){return null;}
let location=null;if(response.internalProperties){for(const prop of response.internalProperties){if(prop.name==='[[FunctionLocation]]'){location=prop.value;}}}
let functionName=null;if(response.properties){for(const prop of response.properties){if(prop.name==='name'&&prop.value&&prop.value.type==='string'){functionName=prop.value;}
if(prop.name==='displayName'&&prop.value&&prop.value.type==='string'){functionName=prop.value;break;}}}
let debuggerLocation=null;if(location){debuggerLocation=this.createRawLocationByScriptId(location.value.scriptId,location.value.lineNumber,location.value.columnNumber);}
return{location:debuggerLocation,functionName:functionName?functionName.value:''};}}
async setVariableValue(scopeNumber,variableName,newValue,callFrameId){const response=await this._agent.invoke_setVariableValue({scopeNumber,variableName,newValue,callFrameId});const error=response[Protocol.Error];if(error){console.error(error);}
return error;}
addBreakpointListener(breakpointId,listener,thisObject){this._breakpointResolvedEventTarget.addEventListener(breakpointId,listener,thisObject);}
removeBreakpointListener(breakpointId,listener,thisObject){this._breakpointResolvedEventTarget.removeEventListener(breakpointId,listener,thisObject);}
async setBlackboxPatterns(patterns){const response=await this._agent.invoke_setBlackboxPatterns({patterns});const error=response[Protocol.Error];if(error){console.error(error);}
return!error;}
dispose(){this._sourceMapManager.dispose();SDK.DebuggerModel._debuggerIdToModel.delete(this._debuggerId);Common.moduleSetting('pauseOnExceptionEnabled').removeChangeListener(this._pauseOnExceptionStateChanged,this);Common.moduleSetting('pauseOnCaughtException').removeChangeListener(this._pauseOnExceptionStateChanged,this);Common.moduleSetting('disableAsyncStackTraces').removeChangeListener(this._asyncStackTracesStateChanged,this);}
async suspendModel(){await this._disableDebugger();}
async resumeModel(){await this._enableDebugger();}
_internString(string){if(!this._stringMap.has(string)){this._stringMap.set(string,string);}
return this._stringMap.get(string);}}
export const _debuggerIdToModel=new Map();export const _scheduledPauseOnAsyncCall=null;export const PauseOnExceptionsState={DontPauseOnExceptions:'none',PauseOnAllExceptions:'all',PauseOnUncaughtExceptions:'uncaught'};export const Events={DebuggerWasEnabled:Symbol('DebuggerWasEnabled'),DebuggerWasDisabled:Symbol('DebuggerWasDisabled'),DebuggerPaused:Symbol('DebuggerPaused'),DebuggerResumed:Symbol('DebuggerResumed'),ParsedScriptSource:Symbol('ParsedScriptSource'),FailedToParseScriptSource:Symbol('FailedToParseScriptSource'),DiscardedAnonymousScriptSource:Symbol('DiscardedAnonymousScriptSource'),GlobalObjectCleared:Symbol('GlobalObjectCleared'),CallFrameSelected:Symbol('CallFrameSelected'),ConsoleCommandEvaluatedInSelectedCallFrame:Symbol('ConsoleCommandEvaluatedInSelectedCallFrame'),DebuggerIsReadyToPause:Symbol('DebuggerIsReadyToPause'),};export const BreakReason={DOM:'DOM',EventListener:'EventListener',XHR:'XHR',Exception:'exception',PromiseRejection:'promiseRejection',Assert:'assert',DebugCommand:'debugCommand',OOM:'OOM',Other:'other'};export const BreakLocationType={Return:'return',Call:'call',DebuggerStatement:'debuggerStatement'};export const DebuggerEventTypes={JavaScriptPause:0,JavaScriptBreakpoint:1,NativeBreakpoint:2};export const ContinueToLocationTargetCallFrames={Any:'any',Current:'current'};export class DebuggerDispatcher{constructor(debuggerModel){this._debuggerModel=debuggerModel;}
paused(callFrames,reason,auxData,breakpointIds,asyncStackTrace,asyncStackTraceId,asyncCallStackTraceId){this._debuggerModel._pausedScript(callFrames,reason,auxData,breakpointIds||[],asyncStackTrace,asyncStackTraceId,asyncCallStackTraceId);}
resumed(){this._debuggerModel._resumedScript();}
scriptParsed(scriptId,sourceURL,startLine,startColumn,endLine,endColumn,executionContextId,hash,executionContextAuxData,isLiveEdit,sourceMapURL,hasSourceURL,isModule,length,stackTrace){this._debuggerModel._parsedScriptSource(scriptId,sourceURL,startLine,startColumn,endLine,endColumn,executionContextId,hash,executionContextAuxData,!!isLiveEdit,sourceMapURL,!!hasSourceURL,false,length||0,stackTrace||null);}
scriptFailedToParse(scriptId,sourceURL,startLine,startColumn,endLine,endColumn,executionContextId,hash,executionContextAuxData,sourceMapURL,hasSourceURL,isModule,length,stackTrace){this._debuggerModel._parsedScriptSource(scriptId,sourceURL,startLine,startColumn,endLine,endColumn,executionContextId,hash,executionContextAuxData,false,sourceMapURL,!!hasSourceURL,true,length||0,stackTrace||null);}
breakpointResolved(breakpointId,location){this._debuggerModel._breakpointResolved(breakpointId,location);}}
export class Location{constructor(debuggerModel,scriptId,lineNumber,columnNumber){this.debuggerModel=debuggerModel;this.scriptId=scriptId;this.lineNumber=lineNumber;this.columnNumber=columnNumber||0;}
static fromPayload(debuggerModel,payload){return new Location(debuggerModel,payload.scriptId,payload.lineNumber,payload.columnNumber);}
payload(){return{scriptId:this.scriptId,lineNumber:this.lineNumber,columnNumber:this.columnNumber};}
script(){return this.debuggerModel.scriptForId(this.scriptId);}
continueToLocation(pausedCallback){if(pausedCallback){this.debuggerModel._continueToLocationCallback=this._paused.bind(this,pausedCallback);}
this.debuggerModel._agent.continueToLocation(this.payload(),ContinueToLocationTargetCallFrames.Current);}
_paused(pausedCallback,debuggerPausedDetails){const location=debuggerPausedDetails.callFrames[0].location();if(location.scriptId===this.scriptId&&location.lineNumber===this.lineNumber&&location.columnNumber===this.columnNumber){pausedCallback();return true;}
return false;}
id(){return this.debuggerModel.target().id()+':'+this.scriptId+':'+this.lineNumber+':'+this.columnNumber;}}
export class BreakLocation extends Location{constructor(debuggerModel,scriptId,lineNumber,columnNumber,type){super(debuggerModel,scriptId,lineNumber,columnNumber);if(type){this.type=type;}}
static fromPayload(debuggerModel,payload){return new BreakLocation(debuggerModel,payload.scriptId,payload.lineNumber,payload.columnNumber,payload.type);}}
export class CallFrame{constructor(debuggerModel,script,payload){this.debuggerModel=debuggerModel;this._script=script;this._payload=payload;this._location=Location.fromPayload(debuggerModel,payload.location);this._scopeChain=[];this._localScope=null;for(let i=0;i<payload.scopeChain.length;++i){const scope=new Scope(this,i);this._scopeChain.push(scope);if(scope.type()===Protocol.Debugger.ScopeType.Local){this._localScope=scope;}}
if(payload.functionLocation){this._functionLocation=Location.fromPayload(debuggerModel,payload.functionLocation);}
this._returnValue=payload.returnValue?this.debuggerModel._runtimeModel.createRemoteObject(payload.returnValue):null;}
static fromPayloadArray(debuggerModel,callFrames){const result=[];for(let i=0;i<callFrames.length;++i){const callFrame=callFrames[i];const script=debuggerModel.scriptForId(callFrame.location.scriptId);if(script){result.push(new CallFrame(debuggerModel,script,callFrame));}}
return result;}
get script(){return this._script;}
get id(){return this._payload.callFrameId;}
scopeChain(){return this._scopeChain;}
localScope(){return this._localScope;}
thisObject(){return this._payload.this?this.debuggerModel._runtimeModel.createRemoteObject(this._payload.this):null;}
returnValue(){return this._returnValue;}
async setReturnValue(expression){if(!this._returnValue){return null;}
const evaluateResponse=await this.debuggerModel._agent.invoke_evaluateOnCallFrame({callFrameId:this.id,expression:expression,silent:true,objectGroup:'backtrace'});if(evaluateResponse[Protocol.Error]||evaluateResponse.exceptionDetails){return null;}
const response=await this.debuggerModel._agent.invoke_setReturnValue({newValue:evaluateResponse.result});if(response[Protocol.Error]){return null;}
this._returnValue=this.debuggerModel._runtimeModel.createRemoteObject(evaluateResponse.result);return this._returnValue;}
get functionName(){return this._payload.functionName;}
location(){return this._location;}
functionLocation(){return this._functionLocation||null;}
async evaluate(options){const runtimeModel=this.debuggerModel.runtimeModel();const needsTerminationOptions=!!options.throwOnSideEffect||options.timeout!==undefined;if(needsTerminationOptions&&(runtimeModel.hasSideEffectSupport()===false||(runtimeModel.hasSideEffectSupport()===null&&!await runtimeModel.checkSideEffectSupport()))){return{error:'Side-effect checks not supported by backend.'};}
const response=await this.debuggerModel._agent.invoke_evaluateOnCallFrame({callFrameId:this.id,expression:options.expression,objectGroup:options.objectGroup,includeCommandLineAPI:options.includeCommandLineAPI,silent:options.silent,returnByValue:options.returnByValue,generatePreview:options.generatePreview,throwOnSideEffect:options.throwOnSideEffect,timeout:options.timeout});const error=response[Protocol.Error];if(error){console.error(error);return{error:error};}
return{object:runtimeModel.createRemoteObject(response.result),exceptionDetails:response.exceptionDetails};}
async restart(){const response=await this.debuggerModel._agent.invoke_restartFrame({callFrameId:this._payload.callFrameId});if(!response[Protocol.Error]){this.debuggerModel.stepInto();}}}
export class Scope{constructor(callFrame,ordinal){this._callFrame=callFrame;this._payload=callFrame._payload.scopeChain[ordinal];this._type=this._payload.type;this._name=this._payload.name;this._ordinal=ordinal;this._startLocation=this._payload.startLocation?Location.fromPayload(callFrame.debuggerModel,this._payload.startLocation):null;this._endLocation=this._payload.endLocation?Location.fromPayload(callFrame.debuggerModel,this._payload.endLocation):null;}
callFrame(){return this._callFrame;}
type(){return this._type;}
typeName(){switch(this._type){case Protocol.Debugger.ScopeType.Local:return Common.UIString('Local');case Protocol.Debugger.ScopeType.Closure:return Common.UIString('Closure');case Protocol.Debugger.ScopeType.Catch:return Common.UIString('Catch');case Protocol.Debugger.ScopeType.Block:return Common.UIString('Block');case Protocol.Debugger.ScopeType.Script:return Common.UIString('Script');case Protocol.Debugger.ScopeType.With:return Common.UIString('With Block');case Protocol.Debugger.ScopeType.Global:return Common.UIString('Global');case Protocol.Debugger.ScopeType.Module:return Common.UIString('Module');}
return'';}
name(){return this._name;}
startLocation(){return this._startLocation;}
endLocation(){return this._endLocation;}
object(){if(this._object){return this._object;}
const runtimeModel=this._callFrame.debuggerModel._runtimeModel;const declarativeScope=this._type!==Protocol.Debugger.ScopeType.With&&this._type!==Protocol.Debugger.ScopeType.Global;if(declarativeScope){this._object=runtimeModel.createScopeRemoteObject(this._payload.object,new SDK.ScopeRef(this._ordinal,this._callFrame.id));}else{this._object=runtimeModel.createRemoteObject(this._payload.object);}
return this._object;}
description(){const declarativeScope=this._type!==Protocol.Debugger.ScopeType.With&&this._type!==Protocol.Debugger.ScopeType.Global;return declarativeScope?'':(this._payload.object.description||'');}}
export class DebuggerPausedDetails{constructor(debuggerModel,callFrames,reason,auxData,breakpointIds,asyncStackTrace,asyncStackTraceId){this.debuggerModel=debuggerModel;this.callFrames=CallFrame.fromPayloadArray(debuggerModel,callFrames);this.reason=reason;this.auxData=auxData;this.breakpointIds=breakpointIds;if(asyncStackTrace){this.asyncStackTrace=this._cleanRedundantFrames(asyncStackTrace);}
this.asyncStackTraceId=asyncStackTraceId;}
exception(){if(this.reason!==BreakReason.Exception&&this.reason!==BreakReason.PromiseRejection){return null;}
return this.debuggerModel._runtimeModel.createRemoteObject((this.auxData));}
_cleanRedundantFrames(asyncStackTrace){let stack=asyncStackTrace;let previous=null;while(stack){if(stack.description==='async function'&&stack.callFrames.length){stack.callFrames.shift();}
if(previous&&!stack.callFrames.length){previous.parent=stack.parent;}else{previous=stack;}
stack=stack.parent;}
return asyncStackTrace;}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.DebuggerModel=DebuggerModel;SDK.DebuggerModel.PauseOnExceptionsState=PauseOnExceptionsState;SDK.DebuggerModel.Events=Events;SDK.DebuggerModel.BreakReason=BreakReason;SDK.DebuggerModel.BreakLocationType=BreakLocationType;SDK.DebuggerModel.ContinueToLocationTargetCallFrames=ContinueToLocationTargetCallFrames;SDK.DebuggerModel.Location=Location;SDK.DebuggerModel.BreakLocation=BreakLocation;SDK.DebuggerModel.CallFrame=CallFrame;SDK.DebuggerModel.Scope=Scope;SDK.DebuggerPausedDetails=DebuggerPausedDetails;SDK.DebuggerDispatcher=DebuggerDispatcher;SDK.DebuggerEventTypes=DebuggerEventTypes;SDK.SDKModel.register(SDK.DebuggerModel,SDK.Target.Capability.JS,true);SDK.DebuggerModel.FunctionDetails;SDK.DebuggerModel.SetBreakpointResult;SDK.DebuggerModel._debuggerIdToModel=_debuggerIdToModel;SDK.DebuggerModel._scheduledPauseOnAsyncCall=_scheduledPauseOnAsyncCall;