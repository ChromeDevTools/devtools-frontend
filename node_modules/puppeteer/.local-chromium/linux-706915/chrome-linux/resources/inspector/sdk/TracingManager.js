export default class TracingManager extends SDK.SDKModel{constructor(target){super(target);this._tracingAgent=target.tracingAgent();target.registerTracingDispatcher(new TracingDispatcher(this));this._activeClient=null;this._eventBufferSize=0;this._eventsRetrieved=0;}
_bufferUsage(usage,eventCount,percentFull){this._eventBufferSize=eventCount;this._activeClient.tracingBufferUsage(usage||percentFull||0);}
_eventsCollected(events){this._activeClient.traceEventsCollected(events);this._eventsRetrieved+=events.length;if(!this._eventBufferSize){this._activeClient.eventsRetrievalProgress(0);return;}
if(this._eventsRetrieved>this._eventBufferSize){this._eventsRetrieved=this._eventBufferSize;}
this._activeClient.eventsRetrievalProgress(this._eventsRetrieved/this._eventBufferSize);}
_tracingComplete(){this._eventBufferSize=0;this._eventsRetrieved=0;this._activeClient.tracingComplete();this._activeClient=null;this._finishing=false;}
async start(client,categoryFilter,options){if(this._activeClient){throw new Error('Tracing is already started');}
const bufferUsageReportingIntervalMs=500;this._activeClient=client;const args={bufferUsageReportingInterval:bufferUsageReportingIntervalMs,categories:categoryFilter,options:options,transferMode:TransferMode.ReportEvents};const response=await this._tracingAgent.invoke_start(args);if(response[Protocol.Error]){this._activeClient=null;}
return response;}
stop(){if(!this._activeClient){throw new Error('Tracing is not started');}
if(this._finishing){throw new Error('Tracing is already being stopped');}
this._finishing=true;this._tracingAgent.end();}}
export const TransferMode={ReportEvents:'ReportEvents',ReturnAsStream:'ReturnAsStream'};export class TracingManagerClient{traceEventsCollected(events){}
tracingComplete(){}
tracingBufferUsage(usage){}
eventsRetrievalProgress(progress){}}
export class TracingDispatcher{constructor(tracingManager){this._tracingManager=tracingManager;}
bufferUsage(usage,eventCount,percentFull){this._tracingManager._bufferUsage(usage,eventCount,percentFull);}
dataCollected(data){this._tracingManager._eventsCollected(data);}
tracingComplete(){this._tracingManager._tracingComplete();}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.TracingManager=TracingManager;SDK.TracingManager.TransferMode=TransferMode;SDK.TracingManagerClient=TracingManagerClient;SDK.TracingDispatcher=TracingDispatcher;SDK.TracingManager.EventPayload;SDK.SDKModel.register(SDK.TracingManager,SDK.Target.Capability.Tracing,false);