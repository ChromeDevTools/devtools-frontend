export default class CPUProfilerModel extends SDK.SDKModel{constructor(target){super(target);this._isRecording=false;this._nextAnonymousConsoleProfileNumber=1;this._anonymousConsoleProfileIdToTitle=new Map();this._profilerAgent=target.profilerAgent();target.registerProfilerDispatcher(this);this._profilerAgent.enable();this._debuggerModel=(target.model(SDK.DebuggerModel));}
runtimeModel(){return this._debuggerModel.runtimeModel();}
debuggerModel(){return this._debuggerModel;}
consoleProfileStarted(id,scriptLocation,title){if(!title){title=Common.UIString('Profile %d',this._nextAnonymousConsoleProfileNumber++);this._anonymousConsoleProfileIdToTitle.set(id,title);}
this._dispatchProfileEvent(Events.ConsoleProfileStarted,id,scriptLocation,title);}
consoleProfileFinished(id,scriptLocation,cpuProfile,title){if(!title){title=this._anonymousConsoleProfileIdToTitle.get(id);this._anonymousConsoleProfileIdToTitle.delete(id);}
self.runtime.loadModulePromise('profiler').then(()=>{this._dispatchProfileEvent(Events.ConsoleProfileFinished,id,scriptLocation,title,cpuProfile);});}
_dispatchProfileEvent(eventName,id,scriptLocation,title,cpuProfile){const debuggerLocation=SDK.DebuggerModel.Location.fromPayload(this._debuggerModel,scriptLocation);const globalId=this.target().id()+'.'+id;const data=({id:globalId,scriptLocation:debuggerLocation,cpuProfile:cpuProfile,title:title,cpuProfilerModel:this});this.dispatchEventToListeners(eventName,data);}
isRecordingProfile(){return this._isRecording;}
startRecording(){this._isRecording=true;const intervalUs=Common.moduleSetting('highResolutionCpuProfiling').get()?100:1000;this._profilerAgent.setSamplingInterval(intervalUs);return this._profilerAgent.start();}
stopRecording(){this._isRecording=false;return this._profilerAgent.stop();}
startPreciseCoverage(){const callCount=false;const detailed=true;return this._profilerAgent.startPreciseCoverage(callCount,detailed);}
takePreciseCoverage(){return this._profilerAgent.takePreciseCoverage().then(result=>result||[]);}
stopPreciseCoverage(){return this._profilerAgent.stopPreciseCoverage();}
bestEffortCoverage(){return this._profilerAgent.getBestEffortCoverage().then(result=>result||[]);}}
export const Events={ConsoleProfileStarted:Symbol('ConsoleProfileStarted'),ConsoleProfileFinished:Symbol('ConsoleProfileFinished')};self.SDK=self.SDK||{};SDK=SDK||{};SDK.CPUProfilerModel=CPUProfilerModel;SDK.CPUProfilerModel.Events=Events;SDK.SDKModel.register(SDK.CPUProfilerModel,SDK.Target.Capability.JS,true);SDK.CPUProfilerModel.EventData;