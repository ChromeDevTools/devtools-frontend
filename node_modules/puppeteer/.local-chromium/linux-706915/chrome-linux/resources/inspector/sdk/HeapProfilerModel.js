export default class HeapProfilerModel extends SDK.SDKModel{constructor(target){super(target);target.registerHeapProfilerDispatcher(new HeapProfilerDispatcher(this));this._enabled=false;this._heapProfilerAgent=target.heapProfilerAgent();this._memoryAgent=target.memoryAgent();this._runtimeModel=(target.model(SDK.RuntimeModel));this._samplingProfilerDepth=0;}
debuggerModel(){return this._runtimeModel.debuggerModel();}
runtimeModel(){return this._runtimeModel;}
enable(){if(this._enabled){return;}
this._enabled=true;this._heapProfilerAgent.enable();}
startSampling(samplingRateInBytes){if(this._samplingProfilerDepth++){return;}
const defaultSamplingIntervalInBytes=16384;this._heapProfilerAgent.startSampling(samplingRateInBytes||defaultSamplingIntervalInBytes);}
stopSampling(){if(!this._samplingProfilerDepth){throw new Error('Sampling profiler is not running.');}
if(--this._samplingProfilerDepth){return this.getSamplingProfile();}
return this._heapProfilerAgent.stopSampling();}
getSamplingProfile(){return this._heapProfilerAgent.getSamplingProfile();}
startNativeSampling(){const defaultSamplingIntervalInBytes=65536;this._memoryAgent.startSampling(defaultSamplingIntervalInBytes);}
async stopNativeSampling(){const rawProfile=(await this._memoryAgent.getSamplingProfile());this._memoryAgent.stopSampling();return this._convertNativeProfile(rawProfile);}
async takeNativeSnapshot(){const rawProfile=(await this._memoryAgent.getAllTimeSamplingProfile());return this._convertNativeProfile(rawProfile);}
async takeNativeBrowserSnapshot(){const rawProfile=(await this._memoryAgent.getBrowserSamplingProfile());return this._convertNativeProfile(rawProfile);}
_convertNativeProfile(rawProfile){const head=({children:new Map(),selfSize:0,callFrame:{functionName:'(root)',url:''}});for(const sample of rawProfile.samples){const node=sample.stack.reverse().reduce((node,name)=>{let child=node.children.get(name);if(child){return child;}
const namespace=/^([^:]*)::/.exec(name);child={children:new Map(),callFrame:{functionName:name,url:namespace&&namespace[1]||''},selfSize:0};node.children.set(name,child);return child;},head);node.selfSize+=sample.total;}
function convertChildren(node){node.children=Array.from(node.children.values());node.children.forEach(convertChildren);}
convertChildren(head);return new NativeHeapProfile(head,rawProfile.modules);}
collectGarbage(){return this._heapProfilerAgent.collectGarbage();}
snapshotObjectIdForObjectId(objectId){return this._heapProfilerAgent.getHeapObjectId(objectId);}
async objectForSnapshotObjectId(snapshotObjectId,objectGroupName){const result=await this._heapProfilerAgent.getObjectByHeapObjectId(snapshotObjectId,objectGroupName);return result&&result.type&&this._runtimeModel.createRemoteObject(result)||null;}
addInspectedHeapObject(snapshotObjectId){return this._heapProfilerAgent.addInspectedHeapObject(snapshotObjectId);}
takeHeapSnapshot(reportProgress){return this._heapProfilerAgent.takeHeapSnapshot(reportProgress);}
startTrackingHeapObjects(recordAllocationStacks){return this._heapProfilerAgent.startTrackingHeapObjects(recordAllocationStacks);}
stopTrackingHeapObjects(reportProgress){return this._heapProfilerAgent.stopTrackingHeapObjects(reportProgress);}
heapStatsUpdate(samples){this.dispatchEventToListeners(Events.HeapStatsUpdate,samples);}
lastSeenObjectId(lastSeenObjectId,timestamp){this.dispatchEventToListeners(Events.LastSeenObjectId,{lastSeenObjectId:lastSeenObjectId,timestamp:timestamp});}
addHeapSnapshotChunk(chunk){this.dispatchEventToListeners(Events.AddHeapSnapshotChunk,chunk);}
reportHeapSnapshotProgress(done,total,finished){this.dispatchEventToListeners(Events.ReportHeapSnapshotProgress,{done:done,total:total,finished:finished});}
resetProfiles(){this.dispatchEventToListeners(Events.ResetProfiles,this);}}
export const Events={HeapStatsUpdate:Symbol('HeapStatsUpdate'),LastSeenObjectId:Symbol('LastSeenObjectId'),AddHeapSnapshotChunk:Symbol('AddHeapSnapshotChunk'),ReportHeapSnapshotProgress:Symbol('ReportHeapSnapshotProgress'),ResetProfiles:Symbol('ResetProfiles')};export class NativeHeapProfile{constructor(head,modules){this.head=head;this.modules=modules;}}
export class HeapProfilerDispatcher{constructor(model){this._heapProfilerModel=model;}
heapStatsUpdate(samples){this._heapProfilerModel.heapStatsUpdate(samples);}
lastSeenObjectId(lastSeenObjectId,timestamp){this._heapProfilerModel.lastSeenObjectId(lastSeenObjectId,timestamp);}
addHeapSnapshotChunk(chunk){this._heapProfilerModel.addHeapSnapshotChunk(chunk);}
reportHeapSnapshotProgress(done,total,finished){this._heapProfilerModel.reportHeapSnapshotProgress(done,total,finished);}
resetProfiles(){this._heapProfilerModel.resetProfiles();}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.HeapProfilerModel=HeapProfilerModel;SDK.HeapProfilerModel.Events=Events;SDK.HeapProfilerModel.NativeHeapProfile=NativeHeapProfile;SDK.HeapProfilerDispatcher=HeapProfilerDispatcher;SDK.SDKModel.register(SDK.HeapProfilerModel,SDK.Target.Capability.JS,false);