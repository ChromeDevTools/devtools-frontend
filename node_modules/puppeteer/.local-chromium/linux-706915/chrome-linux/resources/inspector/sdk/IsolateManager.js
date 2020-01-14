export default class IsolateManager extends Common.Object{constructor(){super();console.assert(!SDK.isolateManager,'Use SDK.isolateManager singleton.');this._isolates=new Map();this._isolateIdByModel=new Map();this._observers=new Set();SDK.targetManager.observeModels(SDK.RuntimeModel,this);this._pollId=0;}
observeIsolates(observer){if(this._observers.has(observer)){throw new Error('Observer can only be registered once');}
if(!this._observers.size){this._poll();}
this._observers.add(observer);for(const isolate of this._isolates.values()){observer.isolateAdded(isolate);}}
unobserveIsolates(observer){this._observers.delete(observer);if(!this._observers.size){++this._pollId;}}
modelAdded(model){this._modelAdded(model);}
async _modelAdded(model){this._isolateIdByModel.set(model,null);const isolateId=await model.isolateId();if(!this._isolateIdByModel.has(model)){return;}
if(!isolateId){this._isolateIdByModel.delete(model);return;}
this._isolateIdByModel.set(model,isolateId);let isolate=this._isolates.get(isolateId);if(!isolate){isolate=new Isolate(isolateId);this._isolates.set(isolateId,isolate);}
isolate._models.add(model);if(isolate._models.size===1){for(const observer of this._observers){observer.isolateAdded(isolate);}}else{for(const observer of this._observers){observer.isolateChanged(isolate);}}}
modelRemoved(model){const isolateId=this._isolateIdByModel.get(model);this._isolateIdByModel.delete(model);if(!isolateId){return;}
const isolate=this._isolates.get(isolateId);isolate._models.delete(model);if(isolate._models.size){for(const observer of this._observers){observer.isolateChanged(isolate);}
return;}
for(const observer of this._observers){observer.isolateRemoved(isolate);}
this._isolates.delete(isolateId);}
isolateByModel(model){return this._isolates.get(this._isolateIdByModel.get(model)||'')||null;}
isolates(){return this._isolates.values();}
async _poll(){const pollId=this._pollId;while(pollId===this._pollId){await Promise.all(Array.from(this.isolates(),isolate=>isolate._update()));await new Promise(r=>setTimeout(r,PollIntervalMs));}}}
export class Observer{isolateAdded(isolate){}
isolateRemoved(isolate){}
isolateChanged(isolate){}}
export const Events={MemoryChanged:Symbol('MemoryChanged')};export const MemoryTrendWindowMs=120e3;export const PollIntervalMs=2e3;export class Isolate{constructor(id){this._id=id;this._models=new Set();this._usedHeapSize=0;const count=MemoryTrendWindowMs/PollIntervalMs;this._memoryTrend=new MemoryTrend(count);}
id(){return this._id;}
models(){return this._models;}
runtimeModel(){return this._models.values().next().value||null;}
heapProfilerModel(){const runtimeModel=this.runtimeModel();return runtimeModel&&runtimeModel.heapProfilerModel();}
async _update(){const model=this.runtimeModel();const usage=model&&await model.heapUsage();if(!usage){return;}
this._usedHeapSize=usage.usedSize;this._memoryTrend.add(this._usedHeapSize);SDK.isolateManager.dispatchEventToListeners(Events.MemoryChanged,this);}
samplesCount(){return this._memoryTrend.count();}
usedHeapSize(){return this._usedHeapSize;}
usedHeapSizeGrowRate(){return this._memoryTrend.fitSlope();}}
export class MemoryTrend{constructor(maxCount){this._maxCount=maxCount|0;this.reset();}
reset(){this._base=Date.now();this._index=0;this._x=[];this._y=[];this._sx=0;this._sy=0;this._sxx=0;this._sxy=0;}
count(){return this._x.length;}
add(heapSize,timestamp){const x=typeof timestamp==='number'?timestamp:Date.now()-this._base;const y=heapSize;if(this._x.length===this._maxCount){const x0=this._x[this._index];const y0=this._y[this._index];this._sx-=x0;this._sy-=y0;this._sxx-=x0*x0;this._sxy-=x0*y0;}
this._sx+=x;this._sy+=y;this._sxx+=x*x;this._sxy+=x*y;this._x[this._index]=x;this._y[this._index]=y;this._index=(this._index+1)%this._maxCount;}
fitSlope(){const n=this.count();return n<2?0:(this._sxy-this._sx*this._sy/n)/(this._sxx-this._sx*this._sx/n);}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.IsolateManager=IsolateManager;SDK.IsolateManager.Observer=Observer;SDK.IsolateManager.Events=Events;SDK.IsolateManager.MemoryTrendWindowMs=MemoryTrendWindowMs;SDK.IsolateManager.PollIntervalMs=PollIntervalMs;SDK.IsolateManager.Isolate=Isolate;SDK.IsolateManager.MemoryTrend=MemoryTrend;SDK.isolateManager=new IsolateManager();