TimelineModel.TimelineModelFilter=class{accept(event){return true;}};TimelineModel.TimelineVisibleEventsFilter=class extends TimelineModel.TimelineModelFilter{constructor(visibleTypes){super();this._visibleTypes=new Set(visibleTypes);}
accept(event){return this._visibleTypes.has(TimelineModel.TimelineVisibleEventsFilter._eventType(event));}
static _eventType(event){if(event.hasCategory(TimelineModel.TimelineModel.Category.Console)){return TimelineModel.TimelineModel.RecordType.ConsoleTime;}
if(event.hasCategory(TimelineModel.TimelineModel.Category.UserTiming)){return TimelineModel.TimelineModel.RecordType.UserTiming;}
if(event.hasCategory(TimelineModel.TimelineModel.Category.LatencyInfo)){return TimelineModel.TimelineModel.RecordType.LatencyInfo;}
return(event.name);}};TimelineModel.TimelineInvisibleEventsFilter=class extends TimelineModel.TimelineModelFilter{constructor(invisibleTypes){super();this._invisibleTypes=new Set(invisibleTypes);}
accept(event){return!this._invisibleTypes.has(TimelineModel.TimelineVisibleEventsFilter._eventType(event));}};TimelineModel.ExclusiveNameFilter=class extends TimelineModel.TimelineModelFilter{constructor(excludeNames){super();this._excludeNames=new Set(excludeNames);}
accept(event){return!this._excludeNames.has(event.name);}};;TimelineModel.TracingLayerPayload;TimelineModel.TracingLayerTile;TimelineModel.TracingLayerTree=class extends SDK.LayerTreeBase{constructor(target){super(target);this._tileById=new Map();this._paintProfilerModel=target&&target.model(SDK.PaintProfilerModel);}
async setLayers(root,layers,paints){const idsToResolve=new Set();if(root){this._extractNodeIdsToResolve(idsToResolve,{},root);}else{for(let i=0;i<layers.length;++i){this._extractNodeIdsToResolve(idsToResolve,{},layers[i]);}}
await this.resolveBackendNodeIds(idsToResolve);const oldLayersById=this._layersById;this._layersById={};this.setContentRoot(null);if(root){const convertedLayers=this._innerSetLayers(oldLayersById,root);this.setRoot(convertedLayers);}else{const processedLayers=layers.map(this._innerSetLayers.bind(this,oldLayersById));const contentRoot=this.contentRoot();this.setRoot(contentRoot);for(let i=0;i<processedLayers.length;++i){if(processedLayers[i].id()!==contentRoot.id()){contentRoot.addChild(processedLayers[i]);}}}
this._setPaints(paints);}
setTiles(tiles){this._tileById=new Map();for(const tile of tiles){this._tileById.set(tile.id,tile);}}
pictureForRasterTile(tileId){const tile=this._tileById.get('cc::Tile/'+tileId);if(!tile){Common.console.error(`Tile ${tileId} is missing`);return(Promise.resolve(null));}
const layer=(this.layerById(tile.layer_id));if(!layer){Common.console.error(`Layer ${tile.layer_id} for tile ${tileId} is not found`);return(Promise.resolve(null));}
return layer._pictureForRect(tile.content_rect);}
_setPaints(paints){for(let i=0;i<paints.length;++i){const layer=this._layersById[paints[i].layerId()];if(layer){layer._addPaintEvent(paints[i]);}}}
_innerSetLayers(oldLayersById,payload){let layer=(oldLayersById[payload.layer_id]);if(layer){layer._reset(payload);}else{layer=new TimelineModel.TracingLayer(this._paintProfilerModel,payload);}
this._layersById[payload.layer_id]=layer;if(payload.owner_node){layer._setNode(this.backendNodeIdToNode().get(payload.owner_node)||null);}
if(!this.contentRoot()&&layer.drawsContent()){this.setContentRoot(layer);}
for(let i=0;payload.children&&i<payload.children.length;++i){layer.addChild(this._innerSetLayers(oldLayersById,payload.children[i]));}
return layer;}
_extractNodeIdsToResolve(nodeIdsToResolve,seenNodeIds,payload){const backendNodeId=payload.owner_node;if(backendNodeId&&!this.backendNodeIdToNode().has(backendNodeId)){nodeIdsToResolve.add(backendNodeId);}
for(let i=0;payload.children&&i<payload.children.length;++i){this._extractNodeIdsToResolve(nodeIdsToResolve,seenNodeIds,payload.children[i]);}}};TimelineModel.TracingLayer=class{constructor(paintProfilerModel,payload){this._paintProfilerModel=paintProfilerModel;this._reset(payload);}
_reset(payload){this._node=null;this._layerId=String(payload.layer_id);this._offsetX=payload.position[0];this._offsetY=payload.position[1];this._width=payload.bounds.width;this._height=payload.bounds.height;this._children=[];this._parentLayerId=null;this._parent=null;this._quad=payload.layer_quad||[];this._createScrollRects(payload);this._compositingReasons=payload.compositing_reasons||(payload.debug_info&&payload.debug_info.compositing_reasons)||[];this._drawsContent=!!payload.draws_content;this._gpuMemoryUsage=payload.gpu_memory_usage;this._paints=[];}
id(){return this._layerId;}
parentId(){return this._parentLayerId;}
parent(){return this._parent;}
isRoot(){return!this.parentId();}
children(){return this._children;}
addChild(childParam){const child=(childParam);if(child._parent){console.assert(false,'Child already has a parent');}
this._children.push(child);child._parent=this;child._parentLayerId=this._layerId;}
_setNode(node){this._node=node;}
node(){return this._node;}
nodeForSelfOrAncestor(){for(let layer=this;layer;layer=layer._parent){if(layer._node){return layer._node;}}
return null;}
offsetX(){return this._offsetX;}
offsetY(){return this._offsetY;}
width(){return this._width;}
height(){return this._height;}
transform(){return null;}
quad(){return this._quad;}
anchorPoint(){return[0.5,0.5,0];}
invisible(){return false;}
paintCount(){return 0;}
lastPaintRect(){return null;}
scrollRects(){return this._scrollRects;}
stickyPositionConstraint(){return null;}
gpuMemoryUsage(){return this._gpuMemoryUsage;}
snapshots(){return this._paints.map(paint=>paint.snapshotPromise().then(snapshot=>{if(!snapshot){return null;}
const rect={x:snapshot.rect[0],y:snapshot.rect[1],width:snapshot.rect[2],height:snapshot.rect[3]};return{rect:rect,snapshot:snapshot.snapshot};}));}
_pictureForRect(targetRect){return Promise.all(this._paints.map(paint=>paint.picturePromise())).then(pictures=>{const fragments=pictures.filter(picture=>picture&&rectsOverlap(picture.rect,targetRect)).map(picture=>({x:picture.rect[0],y:picture.rect[1],picture:picture.serializedPicture}));if(!fragments.length||!this._paintProfilerModel){return null;}
const x0=fragments.reduce((min,item)=>Math.min(min,item.x),Infinity);const y0=fragments.reduce((min,item)=>Math.min(min,item.y),Infinity);const rect={x:targetRect[0]-x0,y:targetRect[1]-y0,width:targetRect[2],height:targetRect[3]};return this._paintProfilerModel.loadSnapshotFromFragments(fragments).then(snapshot=>snapshot?{rect:rect,snapshot:snapshot}:null);});function segmentsOverlap(a1,a2,b1,b2){console.assert(a1<=a2&&b1<=b2,'segments should be specified as ordered pairs');return a2>b1&&a1<b2;}
function rectsOverlap(a,b){return segmentsOverlap(a[0],a[0]+a[2],b[0],b[0]+b[2])&&segmentsOverlap(a[1],a[1]+a[3],b[1],b[1]+b[3]);}}
_scrollRectsFromParams(params,type){return{rect:{x:params[0],y:params[1],width:params[2],height:params[3]},type:type};}
_createScrollRects(payload){this._scrollRects=[];if(payload.non_fast_scrollable_region){this._scrollRects.push(this._scrollRectsFromParams(payload.non_fast_scrollable_region,SDK.Layer.ScrollRectType.NonFastScrollable.name));}
if(payload.touch_event_handler_region){this._scrollRects.push(this._scrollRectsFromParams(payload.touch_event_handler_region,SDK.Layer.ScrollRectType.TouchEventHandler.name));}
if(payload.wheel_event_handler_region){this._scrollRects.push(this._scrollRectsFromParams(payload.wheel_event_handler_region,SDK.Layer.ScrollRectType.WheelEventHandler.name));}
if(payload.scroll_event_handler_region){this._scrollRects.push(this._scrollRectsFromParams(payload.scroll_event_handler_region,SDK.Layer.ScrollRectType.RepaintsOnScroll.name));}}
_addPaintEvent(paint){this._paints.push(paint);}
requestCompositingReasons(){return Promise.resolve(this._compositingReasons);}
drawsContent(){return this._drawsContent;}};;TimelineModel.TimelineModel=class{constructor(){this._reset();}
static forEachEvent(events,onStartEvent,onEndEvent,onInstantEvent,startTime,endTime,filter){startTime=startTime||0;endTime=endTime||Infinity;const stack=[];const startEvent=TimelineModel.TimelineModel._topLevelEventEndingAfter(events,startTime);for(let i=startEvent;i<events.length;++i){const e=events[i];if((e.endTime||e.startTime)<startTime){continue;}
if(e.startTime>=endTime){break;}
if(SDK.TracingModel.isAsyncPhase(e.phase)||SDK.TracingModel.isFlowPhase(e.phase)){continue;}
while(stack.length&&stack.peekLast().endTime<=e.startTime){onEndEvent(stack.pop());}
if(filter&&!filter(e)){continue;}
if(e.duration){onStartEvent(e);stack.push(e);}else{onInstantEvent&&onInstantEvent(e,stack.peekLast()||null);}}
while(stack.length){onEndEvent(stack.pop());}}
static _topLevelEventEndingAfter(events,time){let index=events.upperBound(time,(time,event)=>time-event.startTime)-1;while(index>0&&!SDK.TracingModel.isTopLevelEvent(events[index])){index--;}
return Math.max(index,0);}
isMarkerEvent(event){const recordTypes=TimelineModel.TimelineModel.RecordType;switch(event.name){case recordTypes.TimeStamp:return true;case recordTypes.MarkFirstPaint:case recordTypes.MarkFCP:case recordTypes.MarkFMP:return this._mainFrame&&event.args.frame===this._mainFrame.frameId&&!!event.args.data;case recordTypes.MarkDOMContent:case recordTypes.MarkLoad:case recordTypes.MarkLCPCandidate:case recordTypes.MarkLCPInvalidate:return!!event.args['data']['isMainFrame'];default:return false;}}
isLCPCandidateEvent(event){return event.name===TimelineModel.TimelineModel.RecordType.MarkLCPCandidate&&!!event.args['data']['isMainFrame'];}
isLCPInvalidateEvent(event){return event.name===TimelineModel.TimelineModel.RecordType.MarkLCPInvalidate&&!!event.args['data']['isMainFrame'];}
static globalEventId(event,field){const data=event.args['data']||event.args['beginData'];const id=data&&data[field];if(!id){return'';}
return`${event.thread.process().id()}.${id}`;}
static eventFrameId(event){const data=event.args['data']||event.args['beginData'];return data&&data['frame']||'';}
cpuProfiles(){return this._cpuProfiles;}
targetByEvent(event){const workerId=this._workerIdByThread.get(event.thread);const mainTarget=SDK.targetManager.mainTarget();return workerId?SDK.targetManager.targetById(workerId):mainTarget;}
setEvents(tracingModel){this._reset();this._resetProcessingState();this._tracingModel=tracingModel;this._minimumRecordTime=tracingModel.minimumRecordTime();this._maximumRecordTime=tracingModel.maximumRecordTime();this._processSyncBrowserEvents(tracingModel);if(this._browserFrameTracking){this._processThreadsForBrowserFrames(tracingModel);}else{const metadataEvents=this._processMetadataEvents(tracingModel);this._isGenericTrace=!metadataEvents;if(metadataEvents){this._processMetadataAndThreads(tracingModel,metadataEvents);}else{this._processGenericTrace(tracingModel);}}
this._inspectedTargetEvents.sort(SDK.TracingModel.Event.compareStartTime);this._processAsyncBrowserEvents(tracingModel);this._buildGPUEvents(tracingModel);this._resetProcessingState();}
_processGenericTrace(tracingModel){let browserMainThread=SDK.TracingModel.browserMainThread(tracingModel);if(!browserMainThread&&tracingModel.sortedProcesses().length){browserMainThread=tracingModel.sortedProcesses()[0].sortedThreads()[0];}
for(const process of tracingModel.sortedProcesses()){for(const thread of process.sortedThreads()){this._processThreadEvents(tracingModel,[{from:0,to:Infinity}],thread,thread===browserMainThread,false,true,null);}}}
_processMetadataAndThreads(tracingModel,metadataEvents){let startTime=0;for(let i=0,length=metadataEvents.page.length;i<length;i++){const metaEvent=metadataEvents.page[i];const process=metaEvent.thread.process();const endTime=i+1<length?metadataEvents.page[i+1].startTime:Infinity;if(startTime===endTime){continue;}
this._legacyCurrentPage=metaEvent.args['data']&&metaEvent.args['data']['page'];for(const thread of process.sortedThreads()){let workerUrl=null;if(thread.name()===TimelineModel.TimelineModel.WorkerThreadName||thread.name()===TimelineModel.TimelineModel.WorkerThreadNameLegacy){const workerMetaEvent=metadataEvents.workers.find(e=>{if(e.args['data']['workerThreadId']!==thread.id()){return false;}
if(e.args['data']['sessionId']===this._sessionId){return true;}
return!!this._pageFrames.get(TimelineModel.TimelineModel.eventFrameId(e));});if(!workerMetaEvent){continue;}
const workerId=workerMetaEvent.args['data']['workerId'];if(workerId){this._workerIdByThread.set(thread,workerId);}
workerUrl=workerMetaEvent.args['data']['url']||'';}
this._processThreadEvents(tracingModel,[{from:startTime,to:endTime}],thread,thread===metaEvent.thread,!!workerUrl,true,workerUrl);}
startTime=endTime;}}
_processThreadsForBrowserFrames(tracingModel){const processData=new Map();for(const frame of this._pageFrames.values()){for(let i=0;i<frame.processes.length;i++){const pid=frame.processes[i].processId;let data=processData.get(pid);if(!data){data=[];processData.set(pid,data);}
const to=i===frame.processes.length-1?(frame.deletedTime||Infinity):frame.processes[i+1].time;data.push({from:frame.processes[i].time,to:to,main:!frame.parent,url:frame.processes[i].url});}}
const allMetadataEvents=tracingModel.devToolsMetadataEvents();for(const process of tracingModel.sortedProcesses()){const data=processData.get(process.id());if(!data){continue;}
data.sort((a,b)=>a.from-b.from||a.to-b.to);const ranges=[];let lastUrl=null;let lastMainUrl=null;let hasMain=false;for(const item of data){if(!ranges.length||item.from>ranges.peekLast().to){ranges.push({from:item.from,to:item.to});}else{ranges.peekLast().to=item.to;}
if(item.main){hasMain=true;}
if(item.url){if(item.main){lastMainUrl=item.url;}
lastUrl=item.url;}}
for(const thread of process.sortedThreads()){if(thread.name()===TimelineModel.TimelineModel.RendererMainThreadName){this._processThreadEvents(tracingModel,ranges,thread,true,false,hasMain,hasMain?lastMainUrl:lastUrl);}else if(thread.name()===TimelineModel.TimelineModel.WorkerThreadName||thread.name()===TimelineModel.TimelineModel.WorkerThreadNameLegacy){const workerMetaEvent=allMetadataEvents.find(e=>{if(e.name!==TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingSessionIdForWorker){return false;}
if(e.thread.process()!==process){return false;}
if(e.args['data']['workerThreadId']!==thread.id()){return false;}
return!!this._pageFrames.get(TimelineModel.TimelineModel.eventFrameId(e));});if(!workerMetaEvent){continue;}
this._workerIdByThread.set(thread,workerMetaEvent.args['data']['workerId']||'');this._processThreadEvents(tracingModel,ranges,thread,false,true,false,workerMetaEvent.args['data']['url']||'');}else{this._processThreadEvents(tracingModel,ranges,thread,false,false,false,null);}}}}
_processMetadataEvents(tracingModel){const metadataEvents=tracingModel.devToolsMetadataEvents();const pageDevToolsMetadataEvents=[];const workersDevToolsMetadataEvents=[];for(const event of metadataEvents){if(event.name===TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingStartedInPage){pageDevToolsMetadataEvents.push(event);if(event.args['data']&&event.args['data']['persistentIds']){this._persistentIds=true;}
const frames=((event.args['data']&&event.args['data']['frames'])||[]);frames.forEach(payload=>this._addPageFrame(event,payload));this._mainFrame=this.rootFrames()[0];}else if(event.name===TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingSessionIdForWorker){workersDevToolsMetadataEvents.push(event);}else if(event.name===TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingStartedInBrowser){console.assert(!this._mainFrameNodeId,'Multiple sessions in trace');this._mainFrameNodeId=event.args['frameTreeNodeId'];}}
if(!pageDevToolsMetadataEvents.length){return null;}
const sessionId=pageDevToolsMetadataEvents[0].args['sessionId']||pageDevToolsMetadataEvents[0].args['data']['sessionId'];this._sessionId=sessionId;const mismatchingIds=new Set();function checkSessionId(event){let args=event.args;if(args['data']){args=args['data'];}
const id=args['sessionId'];if(id===sessionId){return true;}
mismatchingIds.add(id);return false;}
const result={page:pageDevToolsMetadataEvents.filter(checkSessionId).sort(SDK.TracingModel.Event.compareStartTime),workers:workersDevToolsMetadataEvents.sort(SDK.TracingModel.Event.compareStartTime)};if(mismatchingIds.size){Common.console.error('Timeline recording was started in more than one page simultaneously. Session id mismatch: '+
this._sessionId+' and '+mismatchingIds.valuesArray()+'.');}
return result;}
_processSyncBrowserEvents(tracingModel){const browserMain=SDK.TracingModel.browserMainThread(tracingModel);if(browserMain){browserMain.events().forEach(this._processBrowserEvent,this);}}
_processAsyncBrowserEvents(tracingModel){const browserMain=SDK.TracingModel.browserMainThread(tracingModel);if(browserMain){this._processAsyncEvents(browserMain,[{from:0,to:Infinity}]);}}
_buildGPUEvents(tracingModel){const thread=tracingModel.threadByName('GPU Process','CrGpuMain');if(!thread){return;}
const gpuEventName=TimelineModel.TimelineModel.RecordType.GPUTask;const track=this._ensureNamedTrack(TimelineModel.TimelineModel.TrackType.GPU);track.thread=thread;track.events=thread.events().filter(event=>event.name===gpuEventName);}
_resetProcessingState(){this._asyncEventTracker=new TimelineModel.TimelineAsyncEventTracker();this._invalidationTracker=new TimelineModel.InvalidationTracker();this._layoutInvalidate={};this._lastScheduleStyleRecalculation={};this._paintImageEventByPixelRefId={};this._lastPaintForLayer={};this._lastRecalculateStylesEvent=null;this._currentScriptEvent=null;this._eventStack=[];this._knownInputEvents=new Set();this._browserFrameTracking=false;this._persistentIds=false;this._legacyCurrentPage=null;}
_extractCpuProfile(tracingModel,thread){const events=thread.events();let cpuProfile;let target=null;let cpuProfileEvent=events.peekLast();if(cpuProfileEvent&&cpuProfileEvent.name===TimelineModel.TimelineModel.RecordType.CpuProfile){const eventData=cpuProfileEvent.args['data'];cpuProfile=(eventData&&eventData['cpuProfile']);target=this.targetByEvent(cpuProfileEvent);}
if(!cpuProfile){cpuProfileEvent=events.find(e=>e.name===TimelineModel.TimelineModel.RecordType.Profile);if(!cpuProfileEvent){return null;}
target=this.targetByEvent(cpuProfileEvent);const profileGroup=tracingModel.profileGroup(cpuProfileEvent);if(!profileGroup){Common.console.error('Invalid CPU profile format.');return null;}
cpuProfile=({startTime:cpuProfileEvent.args['data']['startTime'],endTime:0,nodes:[],samples:[],timeDeltas:[],lines:[]});for(const profileEvent of profileGroup.children){const eventData=profileEvent.args['data'];if('startTime'in eventData){cpuProfile.startTime=eventData['startTime'];}
if('endTime'in eventData){cpuProfile.endTime=eventData['endTime'];}
const nodesAndSamples=eventData['cpuProfile']||{};const samples=nodesAndSamples['samples']||[];const lines=eventData['lines']||Array(samples.length).fill(0);cpuProfile.nodes.pushAll(nodesAndSamples['nodes']||[]);cpuProfile.lines.pushAll(lines);cpuProfile.samples.pushAll(samples);cpuProfile.timeDeltas.pushAll(eventData['timeDeltas']||[]);if(cpuProfile.samples.length!==cpuProfile.timeDeltas.length){Common.console.error('Failed to parse CPU profile.');return null;}}
if(!cpuProfile.endTime){cpuProfile.endTime=cpuProfile.timeDeltas.reduce((x,y)=>x+y,cpuProfile.startTime);}}
try{const jsProfileModel=new SDK.CPUProfileDataModel(cpuProfile,target);this._cpuProfiles.push(jsProfileModel);return jsProfileModel;}catch(e){Common.console.error('Failed to parse CPU profile.');}
return null;}
_injectJSFrameEvents(tracingModel,thread){const jsProfileModel=this._extractCpuProfile(tracingModel,thread);let events=thread.events();const jsSamples=jsProfileModel?TimelineModel.TimelineJSProfileProcessor.generateTracingEventsFromCpuProfile(jsProfileModel,thread):null;if(jsSamples&&jsSamples.length){events=events.mergeOrdered(jsSamples,SDK.TracingModel.Event.orderedCompareStartTime);}
if(jsSamples||events.some(e=>e.name===TimelineModel.TimelineModel.RecordType.JSSample)){const jsFrameEvents=TimelineModel.TimelineJSProfileProcessor.generateJSFrameEvents(events);if(jsFrameEvents&&jsFrameEvents.length){events=jsFrameEvents.mergeOrdered(events,SDK.TracingModel.Event.orderedCompareStartTime);}}
return events;}
_processThreadEvents(tracingModel,ranges,thread,isMainThread,isWorker,forMainFrame,url){const track=new TimelineModel.TimelineModel.Track();track.name=thread.name()||ls`Thread ${thread.id()}`;track.type=TimelineModel.TimelineModel.TrackType.Other;track.thread=thread;if(isMainThread){track.type=TimelineModel.TimelineModel.TrackType.MainThread;track.url=url||null;track.forMainFrame=forMainFrame;}else if(isWorker){track.type=TimelineModel.TimelineModel.TrackType.Worker;track.url=url;}else if(thread.name().startsWith('CompositorTileWorker')){track.type=TimelineModel.TimelineModel.TrackType.Raster;}
this._tracks.push(track);const events=this._injectJSFrameEvents(tracingModel,thread);this._eventStack=[];const eventStack=this._eventStack;for(const range of ranges){let i=events.lowerBound(range.from,(time,event)=>time-event.startTime);for(;i<events.length;i++){const event=events[i];if(event.startTime>=range.to){break;}
while(eventStack.length&&eventStack.peekLast().endTime<=event.startTime){eventStack.pop();}
if(!this._processEvent(event)){continue;}
if(!SDK.TracingModel.isAsyncPhase(event.phase)&&event.duration){if(eventStack.length){const parent=eventStack.peekLast();parent.selfTime-=event.duration;if(parent.selfTime<0){this._fixNegativeDuration(parent,event);}}
event.selfTime=event.duration;if(!eventStack.length){track.tasks.push(event);}
eventStack.push(event);}
if(this.isMarkerEvent(event)){this._timeMarkerEvents.push(event);}
track.events.push(event);this._inspectedTargetEvents.push(event);}}
this._processAsyncEvents(thread,ranges);}
_fixNegativeDuration(event,child){const epsilon=1e-3;if(event.selfTime<-epsilon){console.error(`Children are longer than parent at ${event.startTime} `+`(${(child.startTime - this.minimumRecordTime()).toFixed(3)} by ${(-event.selfTime).toFixed(3)}`);}
event.selfTime=0;}
_processAsyncEvents(thread,ranges){const asyncEvents=thread.asyncEvents();const groups=new Map();function group(type){if(!groups.has(type)){groups.set(type,[]);}
return groups.get(type);}
for(const range of ranges){let i=asyncEvents.lowerBound(range.from,function(time,asyncEvent){return time-asyncEvent.startTime;});for(;i<asyncEvents.length;++i){const asyncEvent=asyncEvents[i];if(asyncEvent.startTime>=range.to){break;}
if(asyncEvent.hasCategory(TimelineModel.TimelineModel.Category.Console)){group(TimelineModel.TimelineModel.TrackType.Console).push(asyncEvent);continue;}
if(asyncEvent.hasCategory(TimelineModel.TimelineModel.Category.UserTiming)){group(TimelineModel.TimelineModel.TrackType.Timings).push(asyncEvent);continue;}
if(asyncEvent.name===TimelineModel.TimelineModel.RecordType.Animation){group(TimelineModel.TimelineModel.TrackType.Animation).push(asyncEvent);continue;}
if(asyncEvent.hasCategory(TimelineModel.TimelineModel.Category.LatencyInfo)||asyncEvent.name===TimelineModel.TimelineModel.RecordType.ImplSideFling){const lastStep=asyncEvent.steps.peekLast();if(lastStep.phase!==SDK.TracingModel.Phase.AsyncEnd){continue;}
const data=lastStep.args['data'];asyncEvent.causedFrame=!!(data&&data['INPUT_EVENT_LATENCY_RENDERER_SWAP_COMPONENT']);if(asyncEvent.hasCategory(TimelineModel.TimelineModel.Category.LatencyInfo)){if(!this._knownInputEvents.has(lastStep.id)){continue;}
if(asyncEvent.name===TimelineModel.TimelineModel.RecordType.InputLatencyMouseMove&&!asyncEvent.causedFrame){continue;}
const rendererMain=data['INPUT_EVENT_LATENCY_RENDERER_MAIN_COMPONENT'];if(rendererMain){const time=rendererMain['time']/1000;TimelineModel.TimelineData.forEvent(asyncEvent.steps[0]).timeWaitingForMainThread=time-asyncEvent.steps[0].startTime;}}
group(TimelineModel.TimelineModel.TrackType.Input).push(asyncEvent);continue;}}}
for(const[type,events]of groups){const track=this._ensureNamedTrack(type);track.thread=thread;track.asyncEvents=track.asyncEvents.mergeOrdered(events,SDK.TracingModel.Event.compareStartTime);}}
_processEvent(event){const recordTypes=TimelineModel.TimelineModel.RecordType;const eventStack=this._eventStack;if(!eventStack.length){if(this._currentTaskLayoutAndRecalcEvents&&this._currentTaskLayoutAndRecalcEvents.length){const totalTime=this._currentTaskLayoutAndRecalcEvents.reduce((time,event)=>time+event.duration,0);if(totalTime>TimelineModel.TimelineModel.Thresholds.ForcedLayout){for(const e of this._currentTaskLayoutAndRecalcEvents){const timelineData=TimelineModel.TimelineData.forEvent(e);timelineData.warning=e.name===recordTypes.Layout?TimelineModel.TimelineModel.WarningType.ForcedLayout:TimelineModel.TimelineModel.WarningType.ForcedStyle;}}}
this._currentTaskLayoutAndRecalcEvents=[];}
if(this._currentScriptEvent&&event.startTime>this._currentScriptEvent.endTime){this._currentScriptEvent=null;}
const eventData=event.args['data']||event.args['beginData']||{};const timelineData=TimelineModel.TimelineData.forEvent(event);if(eventData['stackTrace']){timelineData.stackTrace=eventData['stackTrace'];}
if(timelineData.stackTrace&&event.name!==recordTypes.JSSample){for(let i=0;i<timelineData.stackTrace.length;++i){--timelineData.stackTrace[i].lineNumber;--timelineData.stackTrace[i].columnNumber;}}
let pageFrameId=TimelineModel.TimelineModel.eventFrameId(event);if(!pageFrameId&&eventStack.length){pageFrameId=TimelineModel.TimelineData.forEvent(eventStack.peekLast()).frameId;}
timelineData.frameId=pageFrameId||(this._mainFrame&&this._mainFrame.frameId)||'';this._asyncEventTracker.processEvent(event);if(this.isMarkerEvent(event)){this._ensureNamedTrack(TimelineModel.TimelineModel.TrackType.Timings);}
switch(event.name){case recordTypes.ResourceSendRequest:case recordTypes.WebSocketCreate:timelineData.setInitiator(eventStack.peekLast()||null);timelineData.url=eventData['url'];break;case recordTypes.ScheduleStyleRecalculation:this._lastScheduleStyleRecalculation[eventData['frame']]=event;break;case recordTypes.UpdateLayoutTree:case recordTypes.RecalculateStyles:this._invalidationTracker.didRecalcStyle(event);if(event.args['beginData']){timelineData.setInitiator(this._lastScheduleStyleRecalculation[event.args['beginData']['frame']]);}
this._lastRecalculateStylesEvent=event;if(this._currentScriptEvent){this._currentTaskLayoutAndRecalcEvents.push(event);}
break;case recordTypes.ScheduleStyleInvalidationTracking:case recordTypes.StyleRecalcInvalidationTracking:case recordTypes.StyleInvalidatorInvalidationTracking:case recordTypes.LayoutInvalidationTracking:this._invalidationTracker.addInvalidation(new TimelineModel.InvalidationTrackingEvent(event));break;case recordTypes.InvalidateLayout:{let layoutInitator=event;const frameId=eventData['frame'];if(!this._layoutInvalidate[frameId]&&this._lastRecalculateStylesEvent&&this._lastRecalculateStylesEvent.endTime>event.startTime){layoutInitator=TimelineModel.TimelineData.forEvent(this._lastRecalculateStylesEvent).initiator();}
this._layoutInvalidate[frameId]=layoutInitator;break;}
case recordTypes.Layout:{this._invalidationTracker.didLayout(event);const frameId=event.args['beginData']['frame'];timelineData.setInitiator(this._layoutInvalidate[frameId]);if(event.args['endData']){timelineData.backendNodeId=event.args['endData']['rootNode'];}
this._layoutInvalidate[frameId]=null;if(this._currentScriptEvent){this._currentTaskLayoutAndRecalcEvents.push(event);}
break;}
case recordTypes.Task:if(event.duration>TimelineModel.TimelineModel.Thresholds.LongTask){timelineData.warning=TimelineModel.TimelineModel.WarningType.LongTask;}
break;case recordTypes.EventDispatch:if(event.duration>TimelineModel.TimelineModel.Thresholds.RecurringHandler){timelineData.warning=TimelineModel.TimelineModel.WarningType.LongHandler;}
break;case recordTypes.TimerFire:case recordTypes.FireAnimationFrame:if(event.duration>TimelineModel.TimelineModel.Thresholds.RecurringHandler){timelineData.warning=TimelineModel.TimelineModel.WarningType.LongRecurringHandler;}
break;case recordTypes.FunctionCall:if(typeof eventData['scriptName']==='string'){eventData['url']=eventData['scriptName'];}
if(typeof eventData['scriptLine']==='number'){eventData['lineNumber']=eventData['scriptLine'];}
case recordTypes.EvaluateScript:case recordTypes.CompileScript:if(typeof eventData['lineNumber']==='number'){--eventData['lineNumber'];}
if(typeof eventData['columnNumber']==='number'){--eventData['columnNumber'];}
case recordTypes.RunMicrotasks:if(!this._currentScriptEvent){this._currentScriptEvent=event;}
break;case recordTypes.SetLayerTreeId:if(this._sessionId&&eventData['sessionId']&&this._sessionId===eventData['sessionId']){this._mainFrameLayerTreeId=eventData['layerTreeId'];break;}
const frameId=TimelineModel.TimelineModel.eventFrameId(event);const pageFrame=this._pageFrames.get(frameId);if(!pageFrame||pageFrame.parent){return false;}
this._mainFrameLayerTreeId=eventData['layerTreeId'];break;case recordTypes.Paint:{this._invalidationTracker.didPaint(event);timelineData.backendNodeId=eventData['nodeId'];if(!eventData['layerId']){break;}
const layerId=eventData['layerId'];this._lastPaintForLayer[layerId]=event;break;}
case recordTypes.DisplayItemListSnapshot:case recordTypes.PictureSnapshot:{const layerUpdateEvent=this._findAncestorEvent(recordTypes.UpdateLayer);if(!layerUpdateEvent||layerUpdateEvent.args['layerTreeId']!==this._mainFrameLayerTreeId){break;}
const paintEvent=this._lastPaintForLayer[layerUpdateEvent.args['layerId']];if(paintEvent){TimelineModel.TimelineData.forEvent(paintEvent).picture=(event);}
break;}
case recordTypes.ScrollLayer:timelineData.backendNodeId=eventData['nodeId'];break;case recordTypes.PaintImage:timelineData.backendNodeId=eventData['nodeId'];timelineData.url=eventData['url'];break;case recordTypes.DecodeImage:case recordTypes.ResizeImage:{let paintImageEvent=this._findAncestorEvent(recordTypes.PaintImage);if(!paintImageEvent){const decodeLazyPixelRefEvent=this._findAncestorEvent(recordTypes.DecodeLazyPixelRef);paintImageEvent=decodeLazyPixelRefEvent&&this._paintImageEventByPixelRefId[decodeLazyPixelRefEvent.args['LazyPixelRef']];}
if(!paintImageEvent){break;}
const paintImageData=TimelineModel.TimelineData.forEvent(paintImageEvent);timelineData.backendNodeId=paintImageData.backendNodeId;timelineData.url=paintImageData.url;break;}
case recordTypes.DrawLazyPixelRef:{const paintImageEvent=this._findAncestorEvent(recordTypes.PaintImage);if(!paintImageEvent){break;}
this._paintImageEventByPixelRefId[event.args['LazyPixelRef']]=paintImageEvent;const paintImageData=TimelineModel.TimelineData.forEvent(paintImageEvent);timelineData.backendNodeId=paintImageData.backendNodeId;timelineData.url=paintImageData.url;break;}
case recordTypes.FrameStartedLoading:if(timelineData.frameId!==event.args['frame']){return false;}
break;case recordTypes.MarkLCPCandidate:timelineData.backendNodeId=eventData['nodeId'];break;case recordTypes.MarkDOMContent:case recordTypes.MarkLoad:{const frameId=TimelineModel.TimelineModel.eventFrameId(event);if(!this._pageFrames.has(frameId)){return false;}
break;}
case recordTypes.CommitLoad:{if(this._browserFrameTracking){break;}
const frameId=TimelineModel.TimelineModel.eventFrameId(event);const isMainFrame=!!eventData['isMainFrame'];const pageFrame=this._pageFrames.get(frameId);if(pageFrame){pageFrame.update(event.startTime,eventData);}else{if(!this._persistentIds){if(eventData['page']&&eventData['page']!==this._legacyCurrentPage){return false;}}else if(isMainFrame){return false;}else if(!this._addPageFrame(event,eventData)){return false;}}
if(isMainFrame){this._mainFrame=this._pageFrames.get(frameId);}
break;}
case recordTypes.FireIdleCallback:if(event.duration>eventData['allottedMilliseconds']+TimelineModel.TimelineModel.Thresholds.IdleCallbackAddon){timelineData.warning=TimelineModel.TimelineModel.WarningType.IdleDeadlineExceeded;}
break;}
return true;}
_processBrowserEvent(event){if(event.name===TimelineModel.TimelineModel.RecordType.LatencyInfoFlow){const frameId=event.args['frameTreeNodeId'];if(typeof frameId==='number'&&frameId===this._mainFrameNodeId){this._knownInputEvents.add(event.bind_id);}
return;}
if(event.name===TimelineModel.TimelineModel.RecordType.ResourceWillSendRequest){const requestId=event.args['data']['requestId'];if(typeof requestId==='string'){this._requestsFromBrowser.set(requestId,event);}
return;}
if(event.hasCategory(SDK.TracingModel.DevToolsMetadataEventCategory)&&event.args['data']){const data=event.args['data'];if(event.name===TimelineModel.TimelineModel.DevToolsMetadataEvent.TracingStartedInBrowser){if(!data['persistentIds']){return;}
this._browserFrameTracking=true;this._mainFrameNodeId=data['frameTreeNodeId'];const frames=data['frames']||[];frames.forEach(payload=>{const parent=payload['parent']&&this._pageFrames.get(payload['parent']);if(payload['parent']&&!parent){return;}
let frame=this._pageFrames.get(payload['frame']);if(!frame){frame=new TimelineModel.TimelineModel.PageFrame(payload);this._pageFrames.set(frame.frameId,frame);if(parent){parent.addChild(frame);}else{this._mainFrame=frame;}}
frame.update(this._minimumRecordTime,payload);});return;}
if(event.name===TimelineModel.TimelineModel.DevToolsMetadataEvent.FrameCommittedInBrowser&&this._browserFrameTracking){let frame=this._pageFrames.get(data['frame']);if(!frame){const parent=data['parent']&&this._pageFrames.get(data['parent']);if(!parent){return;}
frame=new TimelineModel.TimelineModel.PageFrame(data);this._pageFrames.set(frame.frameId,frame);parent.addChild(frame);}
frame.update(event.startTime,data);return;}
if(event.name===TimelineModel.TimelineModel.DevToolsMetadataEvent.ProcessReadyInBrowser&&this._browserFrameTracking){const frame=this._pageFrames.get(data['frame']);if(frame){frame.processReady(data['processPseudoId'],data['processId']);}
return;}
if(event.name===TimelineModel.TimelineModel.DevToolsMetadataEvent.FrameDeletedInBrowser&&this._browserFrameTracking){const frame=this._pageFrames.get(data['frame']);if(frame){frame.deletedTime=event.startTime;}
return;}}}
_ensureNamedTrack(type){if(!this._namedTracks.has(type)){const track=new TimelineModel.TimelineModel.Track();track.type=type;this._tracks.push(track);this._namedTracks.set(type,track);}
return this._namedTracks.get(type);}
_findAncestorEvent(name){for(let i=this._eventStack.length-1;i>=0;--i){const event=this._eventStack[i];if(event.name===name){return event;}}
return null;}
_addPageFrame(event,payload){const parent=payload['parent']&&this._pageFrames.get(payload['parent']);if(payload['parent']&&!parent){return false;}
const pageFrame=new TimelineModel.TimelineModel.PageFrame(payload);this._pageFrames.set(pageFrame.frameId,pageFrame);pageFrame.update(event.startTime,payload);if(parent){parent.addChild(pageFrame);}
return true;}
_reset(){this._isGenericTrace=false;this._tracks=[];this._namedTracks=new Map();this._inspectedTargetEvents=[];this._timeMarkerEvents=[];this._sessionId=null;this._mainFrameNodeId=null;this._cpuProfiles=[];this._workerIdByThread=new WeakMap();this._pageFrames=new Map();this._mainFrame=null;this._requestsFromBrowser=new Map();this._minimumRecordTime=0;this._maximumRecordTime=0;}
isGenericTrace(){return this._isGenericTrace;}
tracingModel(){return this._tracingModel;}
minimumRecordTime(){return this._minimumRecordTime;}
maximumRecordTime(){return this._maximumRecordTime;}
inspectedTargetEvents(){return this._inspectedTargetEvents;}
tracks(){return this._tracks;}
isEmpty(){return this.minimumRecordTime()===0&&this.maximumRecordTime()===0;}
timeMarkerEvents(){return this._timeMarkerEvents;}
rootFrames(){return Array.from(this._pageFrames.values()).filter(frame=>!frame.parent);}
pageURL(){return this._mainFrame&&this._mainFrame.url||'';}
pageFrameById(frameId){return frameId?this._pageFrames.get(frameId)||null:null;}
networkRequests(){if(this.isGenericTrace()){return[];}
const requests=new Map();const requestsList=[];const zeroStartRequestsList=[];const types=TimelineModel.TimelineModel.RecordType;const resourceTypes=new Set([types.ResourceWillSendRequest,types.ResourceSendRequest,types.ResourceReceiveResponse,types.ResourceReceivedData,types.ResourceFinish,types.ResourceMarkAsCached]);const events=this.inspectedTargetEvents();for(let i=0;i<events.length;++i){const e=events[i];if(!resourceTypes.has(e.name)){continue;}
const id=TimelineModel.TimelineModel.globalEventId(e,'requestId');if(e.name===types.ResourceSendRequest&&this._requestsFromBrowser.has(e.args.data.requestId)){addRequest(this._requestsFromBrowser.get(e.args.data.requestId),id);}
addRequest(e,id);}
function addRequest(e,id){let request=requests.get(id);if(request){request.addEvent(e);}else{request=new TimelineModel.TimelineModel.NetworkRequest(e);requests.set(id,request);if(request.startTime){requestsList.push(request);}else{zeroStartRequestsList.push(request);}}}
return zeroStartRequestsList.concat(requestsList);}};TimelineModel.TimelineModel.RecordType={Task:'RunTask',Program:'Program',EventDispatch:'EventDispatch',GPUTask:'GPUTask',Animation:'Animation',RequestMainThreadFrame:'RequestMainThreadFrame',BeginFrame:'BeginFrame',NeedsBeginFrameChanged:'NeedsBeginFrameChanged',BeginMainThreadFrame:'BeginMainThreadFrame',ActivateLayerTree:'ActivateLayerTree',DrawFrame:'DrawFrame',HitTest:'HitTest',ScheduleStyleRecalculation:'ScheduleStyleRecalculation',RecalculateStyles:'RecalculateStyles',UpdateLayoutTree:'UpdateLayoutTree',InvalidateLayout:'InvalidateLayout',Layout:'Layout',UpdateLayer:'UpdateLayer',UpdateLayerTree:'UpdateLayerTree',PaintSetup:'PaintSetup',Paint:'Paint',PaintImage:'PaintImage',Rasterize:'Rasterize',RasterTask:'RasterTask',ScrollLayer:'ScrollLayer',CompositeLayers:'CompositeLayers',ScheduleStyleInvalidationTracking:'ScheduleStyleInvalidationTracking',StyleRecalcInvalidationTracking:'StyleRecalcInvalidationTracking',StyleInvalidatorInvalidationTracking:'StyleInvalidatorInvalidationTracking',LayoutInvalidationTracking:'LayoutInvalidationTracking',ParseHTML:'ParseHTML',ParseAuthorStyleSheet:'ParseAuthorStyleSheet',TimerInstall:'TimerInstall',TimerRemove:'TimerRemove',TimerFire:'TimerFire',XHRReadyStateChange:'XHRReadyStateChange',XHRLoad:'XHRLoad',CompileScript:'v8.compile',EvaluateScript:'EvaluateScript',CompileModule:'v8.compileModule',EvaluateModule:'v8.evaluateModule',WasmStreamFromResponseCallback:'v8.wasm.streamFromResponseCallback',WasmCompiledModule:'v8.wasm.compiledModule',WasmCachedModule:'v8.wasm.cachedModule',WasmModuleCacheHit:'v8.wasm.moduleCacheHit',WasmModuleCacheInvalid:'v8.wasm.moduleCacheInvalid',FrameStartedLoading:'FrameStartedLoading',CommitLoad:'CommitLoad',MarkLoad:'MarkLoad',MarkDOMContent:'MarkDOMContent',MarkFirstPaint:'firstPaint',MarkFCP:'firstContentfulPaint',MarkFMP:'firstMeaningfulPaint',MarkLCPCandidate:'largestContentfulPaint::Candidate',MarkLCPInvalidate:'largestContentfulPaint::Invalidate',TimeStamp:'TimeStamp',ConsoleTime:'ConsoleTime',UserTiming:'UserTiming',ResourceWillSendRequest:'ResourceWillSendRequest',ResourceSendRequest:'ResourceSendRequest',ResourceReceiveResponse:'ResourceReceiveResponse',ResourceReceivedData:'ResourceReceivedData',ResourceFinish:'ResourceFinish',ResourceMarkAsCached:'ResourceMarkAsCached',RunMicrotasks:'RunMicrotasks',FunctionCall:'FunctionCall',GCEvent:'GCEvent',MajorGC:'MajorGC',MinorGC:'MinorGC',JSFrame:'JSFrame',JSSample:'JSSample',V8Sample:'V8Sample',JitCodeAdded:'JitCodeAdded',JitCodeMoved:'JitCodeMoved',StreamingCompileScript:'v8.parseOnBackground',V8Execute:'V8.Execute',UpdateCounters:'UpdateCounters',RequestAnimationFrame:'RequestAnimationFrame',CancelAnimationFrame:'CancelAnimationFrame',FireAnimationFrame:'FireAnimationFrame',RequestIdleCallback:'RequestIdleCallback',CancelIdleCallback:'CancelIdleCallback',FireIdleCallback:'FireIdleCallback',WebSocketCreate:'WebSocketCreate',WebSocketSendHandshakeRequest:'WebSocketSendHandshakeRequest',WebSocketReceiveHandshakeResponse:'WebSocketReceiveHandshakeResponse',WebSocketDestroy:'WebSocketDestroy',EmbedderCallback:'EmbedderCallback',SetLayerTreeId:'SetLayerTreeId',TracingStartedInPage:'TracingStartedInPage',TracingSessionIdForWorker:'TracingSessionIdForWorker',DecodeImage:'Decode Image',ResizeImage:'Resize Image',DrawLazyPixelRef:'Draw LazyPixelRef',DecodeLazyPixelRef:'Decode LazyPixelRef',LazyPixelRef:'LazyPixelRef',LayerTreeHostImplSnapshot:'cc::LayerTreeHostImpl',PictureSnapshot:'cc::Picture',DisplayItemListSnapshot:'cc::DisplayItemList',LatencyInfo:'LatencyInfo',LatencyInfoFlow:'LatencyInfo.Flow',InputLatencyMouseMove:'InputLatency::MouseMove',InputLatencyMouseWheel:'InputLatency::MouseWheel',ImplSideFling:'InputHandlerProxy::HandleGestureFling::started',GCCollectGarbage:'BlinkGC.AtomicPhase',CryptoDoEncrypt:'DoEncrypt',CryptoDoEncryptReply:'DoEncryptReply',CryptoDoDecrypt:'DoDecrypt',CryptoDoDecryptReply:'DoDecryptReply',CryptoDoDigest:'DoDigest',CryptoDoDigestReply:'DoDigestReply',CryptoDoSign:'DoSign',CryptoDoSignReply:'DoSignReply',CryptoDoVerify:'DoVerify',CryptoDoVerifyReply:'DoVerifyReply',CpuProfile:'CpuProfile',Profile:'Profile',AsyncTask:'AsyncTask',};TimelineModel.TimelineModel.Category={Console:'blink.console',UserTiming:'blink.user_timing',LatencyInfo:'latencyInfo'};TimelineModel.TimelineModel.WarningType={LongTask:'LongTask',ForcedStyle:'ForcedStyle',ForcedLayout:'ForcedLayout',IdleDeadlineExceeded:'IdleDeadlineExceeded',LongHandler:'LongHandler',LongRecurringHandler:'LongRecurringHandler',V8Deopt:'V8Deopt'};TimelineModel.TimelineModel.WorkerThreadName='DedicatedWorker thread';TimelineModel.TimelineModel.WorkerThreadNameLegacy='DedicatedWorker Thread';TimelineModel.TimelineModel.RendererMainThreadName='CrRendererMain';TimelineModel.TimelineModel.BrowserMainThreadName='CrBrowserMain';TimelineModel.TimelineModel.DevToolsMetadataEvent={TracingStartedInBrowser:'TracingStartedInBrowser',TracingStartedInPage:'TracingStartedInPage',TracingSessionIdForWorker:'TracingSessionIdForWorker',FrameCommittedInBrowser:'FrameCommittedInBrowser',ProcessReadyInBrowser:'ProcessReadyInBrowser',FrameDeletedInBrowser:'FrameDeletedInBrowser',};TimelineModel.TimelineModel.Thresholds={LongTask:200,Handler:150,RecurringHandler:50,ForcedLayout:30,IdleCallbackAddon:5};TimelineModel.TimelineModel.Track=class{constructor(){this.name='';this.type=TimelineModel.TimelineModel.TrackType.Other;this.forMainFrame=false;this.url='';this.events=[];this.asyncEvents=[];this.tasks=[];this._syncEvents=null;this.thread=null;}
syncEvents(){if(this.events.length){return this.events;}
if(this._syncEvents){return this._syncEvents;}
const stack=[];this._syncEvents=[];for(const event of this.asyncEvents){const startTime=event.startTime;const endTime=event.endTime;while(stack.length&&startTime>=stack.peekLast().endTime){stack.pop();}
if(stack.length&&endTime>stack.peekLast().endTime){this._syncEvents=[];break;}
const syncEvent=new SDK.TracingModel.Event(event.categoriesString,event.name,SDK.TracingModel.Phase.Complete,startTime,event.thread);syncEvent.setEndTime(endTime);syncEvent.addArgs(event.args);this._syncEvents.push(syncEvent);stack.push(syncEvent);}
return this._syncEvents;}};TimelineModel.TimelineModel.TrackType={MainThread:Symbol('MainThread'),Worker:Symbol('Worker'),Input:Symbol('Input'),Animation:Symbol('Animation'),Timings:Symbol('Timings'),Console:Symbol('Console'),Raster:Symbol('Raster'),GPU:Symbol('GPU'),Other:Symbol('Other'),};TimelineModel.TimelineModel.PageFrame=class{constructor(payload){this.frameId=payload['frame'];this.url=payload['url']||'';this.name=payload['name'];this.children=[];this.parent=null;this.processes=[];this.deletedTime=null;this.ownerNode=null;}
update(time,payload){this.url=payload['url']||'';this.name=payload['name'];if(payload['processId']){this.processes.push({time:time,processId:payload['processId'],processPseudoId:'',url:payload['url']||''});}else{this.processes.push({time:time,processId:-1,processPseudoId:payload['processPseudoId'],url:payload['url']||''});}}
processReady(processPseudoId,processId){for(const process of this.processes){if(process.processPseudoId===processPseudoId){process.processPseudoId='';process.processId=processId;}}}
addChild(child){this.children.push(child);child.parent=this;}};TimelineModel.TimelineModel.MetadataEvents;TimelineModel.TimelineModel.NetworkRequest=class{constructor(event){const recordType=TimelineModel.TimelineModel.RecordType;const isInitial=event.name===recordType.ResourceSendRequest||event.name===recordType.ResourceWillSendRequest;this.startTime=isInitial?event.startTime:0;this.endTime=Infinity;this.encodedDataLength=0;this.decodedBodyLength=0;this.children=[];this.timing;this.mimeType;this.url;this.requestMethod;this._transferSize=0;this._maybeDiskCached=false;this._memoryCached=false;this.addEvent(event);}
addEvent(event){this.children.push(event);const recordType=TimelineModel.TimelineModel.RecordType;this.startTime=Math.min(this.startTime,event.startTime);const eventData=event.args['data'];if(eventData['mimeType']){this.mimeType=eventData['mimeType'];}
if('priority'in eventData){this.priority=eventData['priority'];}
if(event.name===recordType.ResourceFinish){this.endTime=event.startTime;}
if(eventData['finishTime']){this.finishTime=eventData['finishTime']*1000;}
if(!this.responseTime&&(event.name===recordType.ResourceReceiveResponse||event.name===recordType.ResourceReceivedData)){this.responseTime=event.startTime;}
const encodedDataLength=eventData['encodedDataLength']||0;if(event.name===recordType.ResourceMarkAsCached){this._memoryCached=true;}
if(event.name===recordType.ResourceReceiveResponse){if(eventData['fromCache']){this._maybeDiskCached=true;}
if(eventData['fromServiceWorker']){this.fromServiceWorker=true;}
if(eventData['hasCachedResource']){this.hasCachedResource=true;}
this.encodedDataLength=encodedDataLength;}
if(event.name===recordType.ResourceReceivedData){this.encodedDataLength+=encodedDataLength;}
if(event.name===recordType.ResourceFinish&&encodedDataLength){this.encodedDataLength=encodedDataLength;this._transferSize=encodedDataLength;}
const decodedBodyLength=eventData['decodedBodyLength'];if(event.name===recordType.ResourceFinish&&decodedBodyLength){this.decodedBodyLength=decodedBodyLength;}
if(!this.url){this.url=eventData['url'];}
if(!this.requestMethod){this.requestMethod=eventData['requestMethod'];}
if(!this.timing){this.timing=eventData['timing'];}
if(eventData['fromServiceWorker']){this.fromServiceWorker=true;}}
cached(){return!!this._memoryCached||(!!this._maybeDiskCached&&!this._transferSize&&!this.fromServiceWorker);}
memoryCached(){return this._memoryCached;}
getSendReceiveTiming(){if(this.cached()||!this.timing){return{sendStartTime:this.startTime,headersEndTime:this.startTime};}
const requestTime=this.timing.requestTime*1000;const sendStartTime=requestTime+this.timing.sendStart;const headersEndTime=requestTime+this.timing.receiveHeadersEnd;return{sendStartTime,headersEndTime};}
getStartTime(){return Math.min(this.startTime,!this.cached()&&this.timing&&this.timing.requestTime*1000||Infinity);}
beginTime(){return Math.min(this.getStartTime(),!this.cached()&&this.timing&&this.timing.pushStart*1000||Infinity);}};TimelineModel.InvalidationTrackingEvent=class{constructor(event){this.type=event.name;this.startTime=event.startTime;this._tracingEvent=event;const eventData=event.args['data'];this.frame=eventData['frame'];this.nodeId=eventData['nodeId'];this.nodeName=eventData['nodeName'];this.invalidationSet=eventData['invalidationSet'];this.invalidatedSelectorId=eventData['invalidatedSelectorId'];this.changedId=eventData['changedId'];this.changedClass=eventData['changedClass'];this.changedAttribute=eventData['changedAttribute'];this.changedPseudo=eventData['changedPseudo'];this.selectorPart=eventData['selectorPart'];this.extraData=eventData['extraData'];this.invalidationList=eventData['invalidationList'];this.cause={reason:eventData['reason'],stackTrace:eventData['stackTrace']};if(!this.cause.reason&&this.cause.stackTrace&&this.type===TimelineModel.TimelineModel.RecordType.LayoutInvalidationTracking){this.cause.reason='Layout forced';}}};TimelineModel.InvalidationCause;TimelineModel.InvalidationTracker=class{constructor(){this._lastRecalcStyle=null;this._lastPaintWithLayer=null;this._didPaint=false;this._initializePerFrameState();}
static invalidationEventsFor(event){return event[TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol]||null;}
addInvalidation(invalidation){this._startNewFrameIfNeeded();if(!invalidation.nodeId){console.error('Invalidation lacks node information.');console.error(invalidation);return;}
const recordTypes=TimelineModel.TimelineModel.RecordType;if(invalidation.type===recordTypes.StyleRecalcInvalidationTracking&&invalidation.cause.reason==='StyleInvalidator'){return;}
const styleRecalcInvalidation=(invalidation.type===recordTypes.ScheduleStyleInvalidationTracking||invalidation.type===recordTypes.StyleInvalidatorInvalidationTracking||invalidation.type===recordTypes.StyleRecalcInvalidationTracking);if(styleRecalcInvalidation){const duringRecalcStyle=invalidation.startTime&&this._lastRecalcStyle&&invalidation.startTime>=this._lastRecalcStyle.startTime&&invalidation.startTime<=this._lastRecalcStyle.endTime;if(duringRecalcStyle){this._associateWithLastRecalcStyleEvent(invalidation);}}
if(this._invalidations[invalidation.type]){this._invalidations[invalidation.type].push(invalidation);}else{this._invalidations[invalidation.type]=[invalidation];}
if(invalidation.nodeId){if(this._invalidationsByNodeId[invalidation.nodeId]){this._invalidationsByNodeId[invalidation.nodeId].push(invalidation);}else{this._invalidationsByNodeId[invalidation.nodeId]=[invalidation];}}}
didRecalcStyle(recalcStyleEvent){this._lastRecalcStyle=recalcStyleEvent;const types=[TimelineModel.TimelineModel.RecordType.ScheduleStyleInvalidationTracking,TimelineModel.TimelineModel.RecordType.StyleInvalidatorInvalidationTracking,TimelineModel.TimelineModel.RecordType.StyleRecalcInvalidationTracking];for(const invalidation of this._invalidationsOfTypes(types)){this._associateWithLastRecalcStyleEvent(invalidation);}}
_associateWithLastRecalcStyleEvent(invalidation){if(invalidation.linkedRecalcStyleEvent){return;}
const recordTypes=TimelineModel.TimelineModel.RecordType;const recalcStyleFrameId=this._lastRecalcStyle.args['beginData']['frame'];if(invalidation.type===recordTypes.StyleInvalidatorInvalidationTracking){this._addSyntheticStyleRecalcInvalidations(this._lastRecalcStyle,recalcStyleFrameId,invalidation);}else if(invalidation.type===recordTypes.ScheduleStyleInvalidationTracking){}else{this._addInvalidationToEvent(this._lastRecalcStyle,recalcStyleFrameId,invalidation);}
invalidation.linkedRecalcStyleEvent=true;}
_addSyntheticStyleRecalcInvalidations(event,frameId,styleInvalidatorInvalidation){if(!styleInvalidatorInvalidation.invalidationList){this._addSyntheticStyleRecalcInvalidation(styleInvalidatorInvalidation._tracingEvent,styleInvalidatorInvalidation);return;}
if(!styleInvalidatorInvalidation.nodeId){console.error('Invalidation lacks node information.');console.error(styleInvalidatorInvalidation);return;}
for(let i=0;i<styleInvalidatorInvalidation.invalidationList.length;i++){const setId=styleInvalidatorInvalidation.invalidationList[i]['id'];let lastScheduleStyleRecalculation;const nodeInvalidations=this._invalidationsByNodeId[styleInvalidatorInvalidation.nodeId]||[];for(let j=0;j<nodeInvalidations.length;j++){const invalidation=nodeInvalidations[j];if(invalidation.frame!==frameId||invalidation.invalidationSet!==setId||invalidation.type!==TimelineModel.TimelineModel.RecordType.ScheduleStyleInvalidationTracking){continue;}
lastScheduleStyleRecalculation=invalidation;}
if(!lastScheduleStyleRecalculation){console.error('Failed to lookup the event that scheduled a style invalidator invalidation.');continue;}
this._addSyntheticStyleRecalcInvalidation(lastScheduleStyleRecalculation._tracingEvent,styleInvalidatorInvalidation);}}
_addSyntheticStyleRecalcInvalidation(baseEvent,styleInvalidatorInvalidation){const invalidation=new TimelineModel.InvalidationTrackingEvent(baseEvent);invalidation.type=TimelineModel.TimelineModel.RecordType.StyleRecalcInvalidationTracking;if(styleInvalidatorInvalidation.cause.reason){invalidation.cause.reason=styleInvalidatorInvalidation.cause.reason;}
if(styleInvalidatorInvalidation.selectorPart){invalidation.selectorPart=styleInvalidatorInvalidation.selectorPart;}
this.addInvalidation(invalidation);if(!invalidation.linkedRecalcStyleEvent){this._associateWithLastRecalcStyleEvent(invalidation);}}
didLayout(layoutEvent){const layoutFrameId=layoutEvent.args['beginData']['frame'];for(const invalidation of this._invalidationsOfTypes([TimelineModel.TimelineModel.RecordType.LayoutInvalidationTracking])){if(invalidation.linkedLayoutEvent){continue;}
this._addInvalidationToEvent(layoutEvent,layoutFrameId,invalidation);invalidation.linkedLayoutEvent=true;}}
didPaint(paintEvent){this._didPaint=true;}
_addInvalidationToEvent(event,eventFrameId,invalidation){if(eventFrameId!==invalidation.frame){return;}
if(!event[TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol]){event[TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol]=[invalidation];}else{event[TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol].push(invalidation);}}
_invalidationsOfTypes(types){const invalidations=this._invalidations;if(!types){types=Object.keys(invalidations);}
function*generator(){for(let i=0;i<types.length;++i){const invalidationList=invalidations[types[i]]||[];for(let j=0;j<invalidationList.length;++j){yield invalidationList[j];}}}
return generator();}
_startNewFrameIfNeeded(){if(!this._didPaint){return;}
this._initializePerFrameState();}
_initializePerFrameState(){this._invalidations={};this._invalidationsByNodeId={};this._lastRecalcStyle=null;this._lastPaintWithLayer=null;this._didPaint=false;}};TimelineModel.InvalidationTracker._invalidationTrackingEventsSymbol=Symbol('invalidationTrackingEvents');TimelineModel.TimelineAsyncEventTracker=class{constructor(){TimelineModel.TimelineAsyncEventTracker._initialize();this._initiatorByType=new Map();for(const initiator of TimelineModel.TimelineAsyncEventTracker._asyncEvents.keys()){this._initiatorByType.set(initiator,new Map());}}
static _initialize(){if(TimelineModel.TimelineAsyncEventTracker._asyncEvents){return;}
const events=new Map();let type=TimelineModel.TimelineModel.RecordType;events.set(type.TimerInstall,{causes:[type.TimerFire],joinBy:'timerId'});events.set(type.ResourceSendRequest,{causes:[type.ResourceMarkAsCached,type.ResourceReceiveResponse,type.ResourceReceivedData,type.ResourceFinish],joinBy:'requestId'});events.set(type.RequestAnimationFrame,{causes:[type.FireAnimationFrame],joinBy:'id'});events.set(type.RequestIdleCallback,{causes:[type.FireIdleCallback],joinBy:'id'});events.set(type.WebSocketCreate,{causes:[type.WebSocketSendHandshakeRequest,type.WebSocketReceiveHandshakeResponse,type.WebSocketDestroy],joinBy:'identifier'});TimelineModel.TimelineAsyncEventTracker._asyncEvents=events;TimelineModel.TimelineAsyncEventTracker._typeToInitiator=new Map();for(const entry of events){const types=entry[1].causes;for(type of types){TimelineModel.TimelineAsyncEventTracker._typeToInitiator.set(type,entry[0]);}}}
processEvent(event){let initiatorType=TimelineModel.TimelineAsyncEventTracker._typeToInitiator.get((event.name));const isInitiator=!initiatorType;if(!initiatorType){initiatorType=(event.name);}
const initiatorInfo=TimelineModel.TimelineAsyncEventTracker._asyncEvents.get(initiatorType);if(!initiatorInfo){return;}
const id=TimelineModel.TimelineModel.globalEventId(event,initiatorInfo.joinBy);if(!id){return;}
const initiatorMap=this._initiatorByType.get(initiatorType);if(isInitiator){initiatorMap.set(id,event);return;}
const initiator=initiatorMap.get(id)||null;const timelineData=TimelineModel.TimelineData.forEvent(event);timelineData.setInitiator(initiator);if(!timelineData.frameId&&initiator){timelineData.frameId=TimelineModel.TimelineModel.eventFrameId(initiator);}}};TimelineModel.TimelineData=class{constructor(){this.warning=null;this.previewElement=null;this.url=null;this.backendNodeId=0;this.stackTrace=null;this.picture=null;this._initiator=null;this.frameId='';this.timeWaitingForMainThread;}
setInitiator(initiator){this._initiator=initiator;if(!initiator||this.url){return;}
const initiatorURL=TimelineModel.TimelineData.forEvent(initiator).url;if(initiatorURL){this.url=initiatorURL;}}
initiator(){return this._initiator;}
topFrame(){const stackTrace=this.stackTraceForSelfOrInitiator();return stackTrace&&stackTrace[0]||null;}
stackTraceForSelfOrInitiator(){return this.stackTrace||(this._initiator&&TimelineModel.TimelineData.forEvent(this._initiator).stackTrace);}
static forEvent(event){let data=event[TimelineModel.TimelineData._symbol];if(!data){data=new TimelineModel.TimelineData();event[TimelineModel.TimelineData._symbol]=data;}
return data;}};TimelineModel.TimelineData._symbol=Symbol('timelineData');;TimelineModel.TimelineIRModel=class{constructor(){this.reset();}
static phaseForEvent(event){return event[TimelineModel.TimelineIRModel._eventIRPhase];}
populate(inputLatencies,animations){this.reset();if(!inputLatencies){return;}
this._processInputLatencies(inputLatencies);if(animations){this._processAnimations(animations);}
const range=new Common.SegmentedRange();range.appendRange(this._drags);range.appendRange(this._cssAnimations);range.appendRange(this._scrolls);range.appendRange(this._responses);this._segments=range.segments();}
_processInputLatencies(events){const eventTypes=TimelineModel.TimelineIRModel.InputEvents;const phases=TimelineModel.TimelineIRModel.Phases;const thresholdsMs=TimelineModel.TimelineIRModel._mergeThresholdsMs;let scrollStart;let flingStart;let touchStart;let firstTouchMove;let mouseWheel;let mouseDown;let mouseMove;for(let i=0;i<events.length;++i){const event=events[i];if(i>0&&events[i].startTime<events[i-1].startTime){console.assert(false,'Unordered input events');}
const type=this._inputEventType(event.name);switch(type){case eventTypes.ScrollBegin:this._scrolls.append(this._segmentForEvent(event,phases.Scroll));scrollStart=event;break;case eventTypes.ScrollEnd:if(scrollStart){this._scrolls.append(this._segmentForEventRange(scrollStart,event,phases.Scroll));}else{this._scrolls.append(this._segmentForEvent(event,phases.Scroll));}
scrollStart=null;break;case eventTypes.ScrollUpdate:touchStart=null;this._scrolls.append(this._segmentForEvent(event,phases.Scroll));break;case eventTypes.FlingStart:if(flingStart){Common.console.error(Common.UIString('Two flings at the same time? %s vs %s',flingStart.startTime,event.startTime));break;}
flingStart=event;break;case eventTypes.FlingCancel:if(!flingStart){break;}
this._scrolls.append(this._segmentForEventRange(flingStart,event,phases.Fling));flingStart=null;break;case eventTypes.ImplSideFling:this._scrolls.append(this._segmentForEvent(event,phases.Fling));break;case eventTypes.ShowPress:case eventTypes.Tap:case eventTypes.KeyDown:case eventTypes.KeyDownRaw:case eventTypes.KeyUp:case eventTypes.Char:case eventTypes.Click:case eventTypes.ContextMenu:this._responses.append(this._segmentForEvent(event,phases.Response));break;case eventTypes.TouchStart:if(touchStart){Common.console.error(Common.UIString('Two touches at the same time? %s vs %s',touchStart.startTime,event.startTime));break;}
touchStart=event;event.steps[0][TimelineModel.TimelineIRModel._eventIRPhase]=phases.Response;firstTouchMove=null;break;case eventTypes.TouchCancel:touchStart=null;break;case eventTypes.TouchMove:if(firstTouchMove){this._drags.append(this._segmentForEvent(event,phases.Drag));}else if(touchStart){firstTouchMove=event;this._responses.append(this._segmentForEventRange(touchStart,event,phases.Response));}
break;case eventTypes.TouchEnd:touchStart=null;break;case eventTypes.MouseDown:mouseDown=event;mouseMove=null;break;case eventTypes.MouseMove:if(mouseDown&&!mouseMove&&mouseDown.startTime+thresholdsMs.mouse>event.startTime){this._responses.append(this._segmentForEvent(mouseDown,phases.Response));this._responses.append(this._segmentForEvent(event,phases.Response));}else if(mouseDown){this._drags.append(this._segmentForEvent(event,phases.Drag));}
mouseMove=event;break;case eventTypes.MouseUp:this._responses.append(this._segmentForEvent(event,phases.Response));mouseDown=null;break;case eventTypes.MouseWheel:if(mouseWheel&&canMerge(thresholdsMs.mouse,mouseWheel,event)){this._scrolls.append(this._segmentForEventRange(mouseWheel,event,phases.Scroll));}else{this._scrolls.append(this._segmentForEvent(event,phases.Scroll));}
mouseWheel=event;break;}}
function canMerge(threshold,first,second){return first.endTime<second.startTime&&second.startTime<first.endTime+threshold;}}
_processAnimations(events){for(let i=0;i<events.length;++i){this._cssAnimations.append(this._segmentForEvent(events[i],TimelineModel.TimelineIRModel.Phases.Animation));}}
_segmentForEvent(event,phase){this._setPhaseForEvent(event,phase);return new Common.Segment(event.startTime,event.endTime,phase);}
_segmentForEventRange(startEvent,endEvent,phase){this._setPhaseForEvent(startEvent,phase);this._setPhaseForEvent(endEvent,phase);return new Common.Segment(startEvent.startTime,endEvent.endTime,phase);}
_setPhaseForEvent(asyncEvent,phase){asyncEvent.steps[0][TimelineModel.TimelineIRModel._eventIRPhase]=phase;}
interactionRecords(){return this._segments;}
reset(){const thresholdsMs=TimelineModel.TimelineIRModel._mergeThresholdsMs;this._segments=[];this._drags=new Common.SegmentedRange(merge.bind(null,thresholdsMs.mouse));this._cssAnimations=new Common.SegmentedRange(merge.bind(null,thresholdsMs.animation));this._responses=new Common.SegmentedRange(merge.bind(null,0));this._scrolls=new Common.SegmentedRange(merge.bind(null,thresholdsMs.animation));function merge(threshold,first,second){return first.end+threshold>=second.begin&&first.data===second.data?first:null;}}
_inputEventType(eventName){const prefix='InputLatency::';if(!eventName.startsWith(prefix)){if(eventName===TimelineModel.TimelineIRModel.InputEvents.ImplSideFling){return(eventName);}
console.error('Unrecognized input latency event: '+eventName);return null;}
return(eventName.substr(prefix.length));}};TimelineModel.TimelineIRModel.Phases={Idle:'Idle',Response:'Response',Scroll:'Scroll',Fling:'Fling',Drag:'Drag',Animation:'Animation',Uncategorized:'Uncategorized'};TimelineModel.TimelineIRModel.InputEvents={Char:'Char',Click:'GestureClick',ContextMenu:'ContextMenu',FlingCancel:'GestureFlingCancel',FlingStart:'GestureFlingStart',ImplSideFling:TimelineModel.TimelineModel.RecordType.ImplSideFling,KeyDown:'KeyDown',KeyDownRaw:'RawKeyDown',KeyUp:'KeyUp',LatencyScrollUpdate:'ScrollUpdate',MouseDown:'MouseDown',MouseMove:'MouseMove',MouseUp:'MouseUp',MouseWheel:'MouseWheel',PinchBegin:'GesturePinchBegin',PinchEnd:'GesturePinchEnd',PinchUpdate:'GesturePinchUpdate',ScrollBegin:'GestureScrollBegin',ScrollEnd:'GestureScrollEnd',ScrollUpdate:'GestureScrollUpdate',ScrollUpdateRenderer:'ScrollUpdate',ShowPress:'GestureShowPress',Tap:'GestureTap',TapCancel:'GestureTapCancel',TapDown:'GestureTapDown',TouchCancel:'TouchCancel',TouchEnd:'TouchEnd',TouchMove:'TouchMove',TouchStart:'TouchStart'};TimelineModel.TimelineIRModel._mergeThresholdsMs={animation:1,mouse:40,};TimelineModel.TimelineIRModel._eventIRPhase=Symbol('eventIRPhase');;TimelineModel.TimelineJSProfileProcessor=class{static generateTracingEventsFromCpuProfile(jsProfileModel,thread){const idleNode=jsProfileModel.idleNode;const programNode=jsProfileModel.programNode;const gcNode=jsProfileModel.gcNode;const samples=jsProfileModel.samples;const timestamps=jsProfileModel.timestamps;const jsEvents=[];const nodeToStackMap=new Map();nodeToStackMap.set(programNode,[]);for(let i=0;i<samples.length;++i){let node=jsProfileModel.nodeByIndex(i);if(!node){console.error(`Node with unknown id ${samples[i]} at index ${i}`);continue;}
if(node===gcNode||node===idleNode){continue;}
let callFrames=nodeToStackMap.get(node);if(!callFrames){callFrames=(new Array(node.depth+1));nodeToStackMap.set(node,callFrames);for(let j=0;node.parent;node=node.parent){callFrames[j++]=(node);}}
const jsSampleEvent=new SDK.TracingModel.Event(SDK.TracingModel.DevToolsTimelineEventCategory,TimelineModel.TimelineModel.RecordType.JSSample,SDK.TracingModel.Phase.Instant,timestamps[i],thread);jsSampleEvent.args['data']={stackTrace:callFrames};jsEvents.push(jsSampleEvent);}
return jsEvents;}
static generateJSFrameEvents(events){function equalFrames(frame1,frame2){return frame1.scriptId===frame2.scriptId&&frame1.functionName===frame2.functionName&&frame1.lineNumber===frame2.lineNumber;}
function isJSInvocationEvent(e){switch(e.name){case TimelineModel.TimelineModel.RecordType.RunMicrotasks:case TimelineModel.TimelineModel.RecordType.FunctionCall:case TimelineModel.TimelineModel.RecordType.EvaluateScript:case TimelineModel.TimelineModel.RecordType.EvaluateModule:case TimelineModel.TimelineModel.RecordType.EventDispatch:case TimelineModel.TimelineModel.RecordType.V8Execute:return true;}
return false;}
const jsFrameEvents=[];const jsFramesStack=[];const lockedJsStackDepth=[];let ordinal=0;const showAllEvents=Root.Runtime.experiments.isEnabled('timelineShowAllEvents');const showRuntimeCallStats=Root.Runtime.experiments.isEnabled('timelineV8RuntimeCallStats');const showNativeFunctions=Common.moduleSetting('showNativeFunctionsInJSProfile').get();function onStartEvent(e){e.ordinal=++ordinal;extractStackTrace(e);lockedJsStackDepth.push(jsFramesStack.length);}
function onInstantEvent(e,parent){e.ordinal=++ordinal;if(parent&&isJSInvocationEvent(parent)){extractStackTrace(e);}}
function onEndEvent(e){truncateJSStack(lockedJsStackDepth.pop(),e.endTime);}
function truncateJSStack(depth,time){if(lockedJsStackDepth.length){const lockedDepth=lockedJsStackDepth.peekLast();if(depth<lockedDepth){console.error(`Child stack is shallower (${depth}) than the parent stack (${lockedDepth}) at ${time}`);depth=lockedDepth;}}
if(jsFramesStack.length<depth){console.error(`Trying to truncate higher than the current stack size at ${time}`);depth=jsFramesStack.length;}
for(let k=0;k<jsFramesStack.length;++k){jsFramesStack[k].setEndTime(time);}
jsFramesStack.length=depth;}
function showNativeName(name){return showRuntimeCallStats&&!!TimelineModel.TimelineJSProfileProcessor.nativeGroup(name);}
function filterStackFrames(stack){if(showAllEvents){return;}
let previousNativeFrameName=null;let j=0;for(let i=0;i<stack.length;++i){const frame=stack[i];const url=frame.url;const isNativeFrame=url&&url.startsWith('native ');if(!showNativeFunctions&&isNativeFrame){continue;}
const isNativeRuntimeFrame=TimelineModel.TimelineJSProfileProcessor.isNativeRuntimeFrame(frame);if(isNativeRuntimeFrame&&!showNativeName(frame.functionName)){continue;}
const nativeFrameName=isNativeRuntimeFrame?TimelineModel.TimelineJSProfileProcessor.nativeGroup(frame.functionName):null;if(previousNativeFrameName&&previousNativeFrameName===nativeFrameName){continue;}
previousNativeFrameName=nativeFrameName;stack[j++]=frame;}
stack.length=j;}
function extractStackTrace(e){const recordTypes=TimelineModel.TimelineModel.RecordType;const callFrames=e.name===recordTypes.JSSample?e.args['data']['stackTrace'].slice().reverse():jsFramesStack.map(frameEvent=>frameEvent.args['data']);filterStackFrames(callFrames);const endTime=e.endTime||e.startTime;const minFrames=Math.min(callFrames.length,jsFramesStack.length);let i;for(i=lockedJsStackDepth.peekLast()||0;i<minFrames;++i){const newFrame=callFrames[i];const oldFrame=jsFramesStack[i].args['data'];if(!equalFrames(newFrame,oldFrame)){break;}
jsFramesStack[i].setEndTime(Math.max(jsFramesStack[i].endTime,endTime));}
truncateJSStack(i,e.startTime);for(;i<callFrames.length;++i){const frame=callFrames[i];const jsFrameEvent=new SDK.TracingModel.Event(SDK.TracingModel.DevToolsTimelineEventCategory,recordTypes.JSFrame,SDK.TracingModel.Phase.Complete,e.startTime,e.thread);jsFrameEvent.ordinal=e.ordinal;jsFrameEvent.addArgs({data:frame});jsFrameEvent.setEndTime(endTime);jsFramesStack.push(jsFrameEvent);jsFrameEvents.push(jsFrameEvent);}}
const firstTopLevelEvent=events.find(SDK.TracingModel.isTopLevelEvent);const startTime=firstTopLevelEvent?firstTopLevelEvent.startTime:0;TimelineModel.TimelineModel.forEachEvent(events,onStartEvent,onEndEvent,onInstantEvent,startTime);return jsFrameEvents;}
static isNativeRuntimeFrame(frame){return frame.url==='native V8Runtime';}
static nativeGroup(nativeName){if(nativeName.startsWith('Parse')){return TimelineModel.TimelineJSProfileProcessor.NativeGroups.Parse;}
if(nativeName.startsWith('Compile')||nativeName.startsWith('Recompile')){return TimelineModel.TimelineJSProfileProcessor.NativeGroups.Compile;}
return null;}
static buildTraceProfileFromCpuProfile(profile,tid,injectPageEvent,name){const events=[];if(injectPageEvent){appendEvent('TracingStartedInPage',{data:{'sessionId':'1'}},0,0,'M');}
if(!name){name=ls`Thread ${tid}`;}
appendEvent(SDK.TracingModel.MetadataEvent.ThreadName,{name},0,0,'M','__metadata');if(!profile){return events;}
const idToNode=new Map();const nodes=profile['nodes'];for(let i=0;i<nodes.length;++i){idToNode.set(nodes[i].id,nodes[i]);}
let programEvent=null;let functionEvent=null;let nextTime=profile.startTime;let currentTime;const samples=profile['samples'];const timeDeltas=profile['timeDeltas'];for(let i=0;i<samples.length;++i){currentTime=nextTime;nextTime+=timeDeltas[i];const node=idToNode.get(samples[i]);const name=node.callFrame.functionName;if(name==='(idle)'){closeEvents();continue;}
if(!programEvent){programEvent=appendEvent('MessageLoop::RunTask',{},currentTime,0,'X','toplevel');}
if(name==='(program)'){if(functionEvent){functionEvent.dur=currentTime-functionEvent.ts;functionEvent=null;}}else{if(!functionEvent){functionEvent=appendEvent('FunctionCall',{data:{'sessionId':'1'}},currentTime);}}}
closeEvents();appendEvent('CpuProfile',{data:{'cpuProfile':profile}},profile.endTime,0,'I');return events;function closeEvents(){if(programEvent){programEvent.dur=currentTime-programEvent.ts;}
if(functionEvent){functionEvent.dur=currentTime-functionEvent.ts;}
programEvent=null;functionEvent=null;}
function appendEvent(name,args,ts,dur,ph,cat){const event=({cat:cat||'disabled-by-default-devtools.timeline',name,ph:ph||'X',pid:1,tid,ts,args});if(dur){event.dur=dur;}
events.push(event);return event;}}};TimelineModel.TimelineJSProfileProcessor.NativeGroups={'Compile':'Compile','Parse':'Parse'};;TimelineModel.TimelineFrameModel=class{constructor(categoryMapper){this._categoryMapper=categoryMapper;this.reset();}
frames(startTime,endTime){if(!startTime&&!endTime){return this._frames;}
const firstFrame=this._frames.lowerBound(startTime||0,(time,frame)=>time-frame.endTime);const lastFrame=this._frames.lowerBound(endTime||Infinity,(time,frame)=>time-frame.startTime);return this._frames.slice(firstFrame,lastFrame);}
hasRasterTile(rasterTask){const data=rasterTask.args['tileData'];if(!data){return false;}
const frameId=data['sourceFrameNumber'];const frame=frameId&&this._frameById[frameId];if(!frame||!frame.layerTree){return false;}
return true;}
rasterTilePromise(rasterTask){if(!this._target){return Promise.resolve(null);}
const data=rasterTask.args['tileData'];const frameId=data['sourceFrameNumber'];const tileId=data['tileId']&&data['tileId']['id_ref'];const frame=frameId&&this._frameById[frameId];if(!frame||!frame.layerTree||!tileId){return Promise.resolve(null);}
return frame.layerTree.layerTreePromise().then(layerTree=>layerTree&&layerTree.pictureForRasterTile(tileId));}
reset(){this._minimumRecordTime=Infinity;this._frames=[];this._frameById={};this._lastFrame=null;this._lastLayerTree=null;this._mainFrameCommitted=false;this._mainFrameRequested=false;this._framePendingCommit=null;this._lastBeginFrame=null;this._lastNeedsBeginFrame=null;this._framePendingActivation=null;this._lastTaskBeginTime=null;this._target=null;this._layerTreeId=null;this._currentTaskTimeByCategory={};}
handleBeginFrame(startTime){if(!this._lastFrame){this._startFrame(startTime);}
this._lastBeginFrame=startTime;}
handleDrawFrame(startTime){if(!this._lastFrame){this._startFrame(startTime);return;}
if(this._mainFrameCommitted||!this._mainFrameRequested){if(this._lastNeedsBeginFrame){const idleTimeEnd=this._framePendingActivation?this._framePendingActivation.triggerTime:(this._lastBeginFrame||this._lastNeedsBeginFrame);if(idleTimeEnd>this._lastFrame.startTime){this._lastFrame.idle=true;this._startFrame(idleTimeEnd);if(this._framePendingActivation){this._commitPendingFrame();}
this._lastBeginFrame=null;}
this._lastNeedsBeginFrame=null;}
this._startFrame(startTime);}
this._mainFrameCommitted=false;}
handleActivateLayerTree(){if(!this._lastFrame){return;}
if(this._framePendingActivation&&!this._lastNeedsBeginFrame){this._commitPendingFrame();}}
handleRequestMainThreadFrame(){if(!this._lastFrame){return;}
this._mainFrameRequested=true;}
handleCompositeLayers(){if(!this._framePendingCommit){return;}
this._framePendingActivation=this._framePendingCommit;this._framePendingCommit=null;this._mainFrameRequested=false;this._mainFrameCommitted=true;}
handleLayerTreeSnapshot(layerTree){this._lastLayerTree=layerTree;}
handleNeedFrameChanged(startTime,needsBeginFrame){if(needsBeginFrame){this._lastNeedsBeginFrame=startTime;}}
_startFrame(startTime){if(this._lastFrame){this._flushFrame(this._lastFrame,startTime);}
this._lastFrame=new TimelineModel.TimelineFrame(startTime,startTime-this._minimumRecordTime);}
_flushFrame(frame,endTime){frame._setLayerTree(this._lastLayerTree);frame._setEndTime(endTime);if(this._lastLayerTree){this._lastLayerTree._setPaints(frame._paints);}
if(this._frames.length&&(frame.startTime!==this._frames.peekLast().endTime||frame.startTime>frame.endTime)){console.assert(false,`Inconsistent frame time for frame ${this._frames.length} (${frame.startTime} - ${frame.endTime})`);}
this._frames.push(frame);if(typeof frame._mainFrameId==='number'){this._frameById[frame._mainFrameId]=frame;}}
_commitPendingFrame(){this._lastFrame._addTimeForCategories(this._framePendingActivation.timeByCategory);this._lastFrame._paints=this._framePendingActivation.paints;this._lastFrame._mainFrameId=this._framePendingActivation.mainFrameId;this._framePendingActivation=null;}
addTraceEvents(target,events,threadData){this._target=target;let j=0;this._currentProcessMainThread=threadData.length&&threadData[0].thread||null;for(let i=0;i<events.length;++i){while(j+1<threadData.length&&threadData[j+1].time<=events[i].startTime){this._currentProcessMainThread=threadData[++j].thread;}
this._addTraceEvent(events[i]);}
this._currentProcessMainThread=null;}
_addTraceEvent(event){const eventNames=TimelineModel.TimelineModel.RecordType;if(event.startTime&&event.startTime<this._minimumRecordTime){this._minimumRecordTime=event.startTime;}
if(event.name===eventNames.SetLayerTreeId){this._layerTreeId=event.args['layerTreeId']||event.args['data']['layerTreeId'];}else if(event.phase===SDK.TracingModel.Phase.SnapshotObject&&event.name===eventNames.LayerTreeHostImplSnapshot&&parseInt(event.id,0)===this._layerTreeId){const snapshot=(event);this.handleLayerTreeSnapshot(new TimelineModel.TracingFrameLayerTree(this._target,snapshot));}else{this._processCompositorEvents(event);if(event.thread===this._currentProcessMainThread){this._addMainThreadTraceEvent(event);}else if(this._lastFrame&&event.selfTime&&!SDK.TracingModel.isTopLevelEvent(event)){this._lastFrame._addTimeForCategory(this._categoryMapper(event),event.selfTime);}}}
_processCompositorEvents(event){const eventNames=TimelineModel.TimelineModel.RecordType;if(event.args['layerTreeId']!==this._layerTreeId){return;}
const timestamp=event.startTime;if(event.name===eventNames.BeginFrame){this.handleBeginFrame(timestamp);}else if(event.name===eventNames.DrawFrame){this.handleDrawFrame(timestamp);}else if(event.name===eventNames.ActivateLayerTree){this.handleActivateLayerTree();}else if(event.name===eventNames.RequestMainThreadFrame){this.handleRequestMainThreadFrame();}else if(event.name===eventNames.NeedsBeginFrameChanged){this.handleNeedFrameChanged(timestamp,event.args['data']&&event.args['data']['needsBeginFrame']);}}
_addMainThreadTraceEvent(event){const eventNames=TimelineModel.TimelineModel.RecordType;if(SDK.TracingModel.isTopLevelEvent(event)){this._currentTaskTimeByCategory={};this._lastTaskBeginTime=event.startTime;}
if(!this._framePendingCommit&&TimelineModel.TimelineFrameModel._mainFrameMarkers.indexOf(event.name)>=0){this._framePendingCommit=new TimelineModel.PendingFrame(this._lastTaskBeginTime||event.startTime,this._currentTaskTimeByCategory);}
if(!this._framePendingCommit){this._addTimeForCategory(this._currentTaskTimeByCategory,event);return;}
this._addTimeForCategory(this._framePendingCommit.timeByCategory,event);if(event.name===eventNames.BeginMainThreadFrame&&event.args['data']&&event.args['data']['frameId']){this._framePendingCommit.mainFrameId=event.args['data']['frameId'];}
if(event.name===eventNames.Paint&&event.args['data']['layerId']&&TimelineModel.TimelineData.forEvent(event).picture&&this._target){this._framePendingCommit.paints.push(new TimelineModel.LayerPaintEvent(event,this._target));}
if(event.name===eventNames.CompositeLayers&&event.args['layerTreeId']===this._layerTreeId){this.handleCompositeLayers();}}
_addTimeForCategory(timeByCategory,event){if(!event.selfTime){return;}
const categoryName=this._categoryMapper(event);timeByCategory[categoryName]=(timeByCategory[categoryName]||0)+event.selfTime;}};TimelineModel.TimelineFrameModel._mainFrameMarkers=[TimelineModel.TimelineModel.RecordType.ScheduleStyleRecalculation,TimelineModel.TimelineModel.RecordType.InvalidateLayout,TimelineModel.TimelineModel.RecordType.BeginMainThreadFrame,TimelineModel.TimelineModel.RecordType.ScrollLayer];TimelineModel.TracingFrameLayerTree=class{constructor(target,snapshot){this._target=target;this._snapshot=snapshot;this._paints;}
async layerTreePromise(){const result=await this._snapshot.objectPromise();if(!result){return null;}
const viewport=result['device_viewport_size'];const tiles=result['active_tiles'];const rootLayer=result['active_tree']['root_layer'];const layers=result['active_tree']['layers'];const layerTree=new TimelineModel.TracingLayerTree(this._target);layerTree.setViewportSize(viewport);layerTree.setTiles(tiles);await layerTree.setLayers(rootLayer,layers,this._paints||[]);return layerTree;}
paints(){return this._paints||[];}
_setPaints(paints){this._paints=paints;}};TimelineModel.TimelineFrame=class{constructor(startTime,startTimeOffset){this.startTime=startTime;this.startTimeOffset=startTimeOffset;this.endTime=this.startTime;this.duration=0;this.timeByCategory={};this.cpuTime=0;this.idle=false;this.layerTree=null;this._paints=[];this._mainFrameId=undefined;}
hasWarnings(){return false;}
_setEndTime(endTime){this.endTime=endTime;this.duration=this.endTime-this.startTime;}
_setLayerTree(layerTree){this.layerTree=layerTree;}
_addTimeForCategories(timeByCategory){for(const category in timeByCategory){this._addTimeForCategory(category,timeByCategory[category]);}}
_addTimeForCategory(category,time){this.timeByCategory[category]=(this.timeByCategory[category]||0)+time;this.cpuTime+=time;}};TimelineModel.LayerPaintEvent=class{constructor(event,target){this._event=event;this._target=target;}
layerId(){return this._event.args['data']['layerId'];}
event(){return this._event;}
picturePromise(){const picture=TimelineModel.TimelineData.forEvent(this._event).picture;return picture.objectPromise().then(result=>{if(!result){return null;}
const rect=result['params']&&result['params']['layer_rect'];const picture=result['skp64'];return rect&&picture?{rect:rect,serializedPicture:picture}:null;});}
snapshotPromise(){const paintProfilerModel=this._target&&this._target.model(SDK.PaintProfilerModel);return this.picturePromise().then(picture=>{if(!picture||!paintProfilerModel){return null;}
return paintProfilerModel.loadSnapshot(picture.serializedPicture).then(snapshot=>snapshot?{rect:picture.rect,snapshot:snapshot}:null);});}};TimelineModel.PendingFrame=class{constructor(triggerTime,timeByCategory){this.timeByCategory=timeByCategory;this.paints=[];this.mainFrameId=undefined;this.triggerTime=triggerTime;}};;TimelineModel.TimelineProfileTree={};TimelineModel.TimelineProfileTree.ChildrenCache;TimelineModel.TimelineProfileTree.Node=class{constructor(id,event){this.totalTime=0;this.selfTime=0;this.id=id;this.event=event;this.parent;this._groupId='';this._isGroupNode=false;}
isGroupNode(){return this._isGroupNode;}
hasChildren(){throw'Not implemented';}
children(){throw'Not implemented';}
searchTree(matchFunction,results){results=results||[];if(this.event&&matchFunction(this.event)){results.push(this);}
for(const child of this.children().values()){child.searchTree(matchFunction,results);}
return results;}};TimelineModel.TimelineProfileTree.TopDownNode=class extends TimelineModel.TimelineProfileTree.Node{constructor(id,event,parent){super(id,event);this._root=parent&&parent._root;this._hasChildren=false;this._children=null;this.parent=parent;}
hasChildren(){return this._hasChildren;}
children(){return this._children||this._buildChildren();}
_buildChildren(){const path=[];for(let node=this;node.parent&&!node._isGroupNode;node=node.parent){path.push((node));}
path.reverse();const children=new Map();const self=this;const root=this._root;const startTime=root._startTime;const endTime=root._endTime;const instantEventCallback=root._doNotAggregate?onInstantEvent:undefined;const eventIdCallback=root._doNotAggregate?undefined:TimelineModel.TimelineProfileTree._eventId;const eventGroupIdCallback=root._eventGroupIdCallback;let depth=0;let matchedDepth=0;let currentDirectChild=null;TimelineModel.TimelineModel.forEachEvent(root._events,onStartEvent,onEndEvent,instantEventCallback,startTime,endTime,root._filter);function onStartEvent(e){++depth;if(depth>path.length+2){return;}
if(!matchPath(e)){return;}
const duration=Math.min(endTime,e.endTime)-Math.max(startTime,e.startTime);if(duration<0){console.error('Negative event duration');}
processEvent(e,duration);}
function onInstantEvent(e){++depth;if(matchedDepth===path.length&&depth<=path.length+2){processEvent(e,0);}
--depth;}
function processEvent(e,duration){if(depth===path.length+2){currentDirectChild._hasChildren=true;currentDirectChild.selfTime-=duration;return;}
let id;let groupId='';if(!eventIdCallback){id=Symbol('uniqueId');}else{id=eventIdCallback(e);groupId=eventGroupIdCallback?eventGroupIdCallback(e):'';if(groupId){id+='/'+groupId;}}
let node=children.get(id);if(!node){node=new TimelineModel.TimelineProfileTree.TopDownNode(id,e,self);node._groupId=groupId;children.set(id,node);}
node.selfTime+=duration;node.totalTime+=duration;currentDirectChild=node;}
function matchPath(e){if(matchedDepth===path.length){return true;}
if(matchedDepth!==depth-1){return false;}
if(!e.endTime){return false;}
if(!eventIdCallback){if(e===path[matchedDepth].event){++matchedDepth;}
return false;}
let id=eventIdCallback(e);const groupId=eventGroupIdCallback?eventGroupIdCallback(e):'';if(groupId){id+='/'+groupId;}
if(id===path[matchedDepth].id){++matchedDepth;}
return false;}
function onEndEvent(e){--depth;if(matchedDepth>depth){matchedDepth=depth;}}
this._children=children;return children;}};TimelineModel.TimelineProfileTree.TopDownRootNode=class extends TimelineModel.TimelineProfileTree.TopDownNode{constructor(events,filters,startTime,endTime,doNotAggregate,eventGroupIdCallback){super('',null,null);this._root=this;this._events=events;this._filter=e=>filters.every(f=>f.accept(e));this._startTime=startTime;this._endTime=endTime;this._eventGroupIdCallback=eventGroupIdCallback;this._doNotAggregate=doNotAggregate;this.totalTime=endTime-startTime;this.selfTime=this.totalTime;}
children(){return this._children||this._grouppedTopNodes();}
_grouppedTopNodes(){const flatNodes=super.children();for(const node of flatNodes.values()){this.selfTime-=node.totalTime;}
if(!this._eventGroupIdCallback){return flatNodes;}
const groupNodes=new Map();for(const node of flatNodes.values()){const groupId=this._eventGroupIdCallback((node.event));let groupNode=groupNodes.get(groupId);if(!groupNode){groupNode=new TimelineModel.TimelineProfileTree.GroupNode(groupId,this,(node.event));groupNodes.set(groupId,groupNode);}
groupNode.addChild(node,node.selfTime,node.totalTime);}
this._children=groupNodes;return groupNodes;}};TimelineModel.TimelineProfileTree.BottomUpRootNode=class extends TimelineModel.TimelineProfileTree.Node{constructor(events,textFilter,filters,startTime,endTime,eventGroupIdCallback){super('',null);this._children=null;this._events=events;this._textFilter=textFilter;this._filter=e=>filters.every(f=>f.accept(e));this._startTime=startTime;this._endTime=endTime;this._eventGroupIdCallback=eventGroupIdCallback;this.totalTime=endTime-startTime;}
hasChildren(){return true;}
_filterChildren(children){for(const[id,child]of children){if(child.event&&!this._textFilter.accept(child.event)){children.delete((id));}}
return children;}
children(){if(!this._children){this._children=this._filterChildren(this._grouppedTopNodes());}
return this._children;}
_ungrouppedTopNodes(){const root=this;const startTime=this._startTime;const endTime=this._endTime;const nodeById=new Map();const selfTimeStack=[endTime-startTime];const firstNodeStack=[];const totalTimeById=new Map();TimelineModel.TimelineModel.forEachEvent(this._events,onStartEvent,onEndEvent,undefined,startTime,endTime,this._filter);function onStartEvent(e){const duration=Math.min(e.endTime,endTime)-Math.max(e.startTime,startTime);selfTimeStack[selfTimeStack.length-1]-=duration;selfTimeStack.push(duration);const id=TimelineModel.TimelineProfileTree._eventId(e);const noNodeOnStack=!totalTimeById.has(id);if(noNodeOnStack){totalTimeById.set(id,duration);}
firstNodeStack.push(noNodeOnStack);}
function onEndEvent(e){const id=TimelineModel.TimelineProfileTree._eventId(e);let node=nodeById.get(id);if(!node){node=new TimelineModel.TimelineProfileTree.BottomUpNode(root,id,e,false,root);nodeById.set(id,node);}
node.selfTime+=selfTimeStack.pop();if(firstNodeStack.pop()){node.totalTime+=totalTimeById.get(id);totalTimeById.delete(id);}
if(firstNodeStack.length){node.setHasChildren();}}
this.selfTime=selfTimeStack.pop();for(const pair of nodeById){if(pair[1].selfTime<=0){nodeById.delete((pair[0]));}}
return nodeById;}
_grouppedTopNodes(){const flatNodes=this._ungrouppedTopNodes();if(!this._eventGroupIdCallback){return flatNodes;}
const groupNodes=new Map();for(const node of flatNodes.values()){const groupId=this._eventGroupIdCallback((node.event));let groupNode=groupNodes.get(groupId);if(!groupNode){groupNode=new TimelineModel.TimelineProfileTree.GroupNode(groupId,this,(node.event));groupNodes.set(groupId,groupNode);}
groupNode.addChild(node,node.selfTime,node.selfTime);}
return groupNodes;}};TimelineModel.TimelineProfileTree.GroupNode=class extends TimelineModel.TimelineProfileTree.Node{constructor(id,parent,event){super(id,event);this._children=new Map();this.parent=parent;this._isGroupNode=true;}
addChild(child,selfTime,totalTime){this._children.set(child.id,child);this.selfTime+=selfTime;this.totalTime+=totalTime;child.parent=this;}
hasChildren(){return true;}
children(){return this._children;}};TimelineModel.TimelineProfileTree.BottomUpNode=class extends TimelineModel.TimelineProfileTree.Node{constructor(root,id,event,hasChildren,parent){super(id,event);this.parent=parent;this._root=root;this._depth=(parent._depth||0)+1;this._cachedChildren=null;this._hasChildren=hasChildren;}
setHasChildren(){this._hasChildren=true;}
hasChildren(){return this._hasChildren;}
children(){if(this._cachedChildren){return this._cachedChildren;}
const selfTimeStack=[0];const eventIdStack=[];const eventStack=[];const nodeById=new Map();const startTime=this._root._startTime;const endTime=this._root._endTime;let lastTimeMarker=startTime;const self=this;TimelineModel.TimelineModel.forEachEvent(this._root._events,onStartEvent,onEndEvent,undefined,startTime,endTime,this._root._filter);function onStartEvent(e){const duration=Math.min(e.endTime,endTime)-Math.max(e.startTime,startTime);if(duration<0){console.assert(false,'Negative duration of an event');}
selfTimeStack[selfTimeStack.length-1]-=duration;selfTimeStack.push(duration);const id=TimelineModel.TimelineProfileTree._eventId(e);eventIdStack.push(id);eventStack.push(e);}
function onEndEvent(e){const selfTime=selfTimeStack.pop();const id=eventIdStack.pop();eventStack.pop();let node;for(node=self;node._depth>1;node=node.parent){if(node.id!==eventIdStack[eventIdStack.length+1-node._depth]){return;}}
if(node.id!==id||eventIdStack.length<self._depth){return;}
const childId=eventIdStack[eventIdStack.length-self._depth];node=nodeById.get(childId);if(!node){const event=eventStack[eventStack.length-self._depth];const hasChildren=eventStack.length>self._depth;node=new TimelineModel.TimelineProfileTree.BottomUpNode(self._root,childId,event,hasChildren,self);nodeById.set(childId,node);}
const totalTime=Math.min(e.endTime,endTime)-Math.max(e.startTime,lastTimeMarker);node.selfTime+=selfTime;node.totalTime+=totalTime;lastTimeMarker=Math.min(e.endTime,endTime);}
this._cachedChildren=this._root._filterChildren(nodeById);return this._cachedChildren;}
searchTree(matchFunction,results){results=results||[];if(this.event&&matchFunction(this.event)){results.push(this);}
return results;}};TimelineModel.TimelineProfileTree.eventURL=function(event){const data=event.args['data']||event.args['beginData'];if(data&&data['url']){return data['url'];}
let frame=TimelineModel.TimelineProfileTree.eventStackFrame(event);while(frame){const url=frame['url'];if(url){return url;}
frame=frame.parent;}
return null;};TimelineModel.TimelineProfileTree.eventStackFrame=function(event){if(event.name===TimelineModel.TimelineModel.RecordType.JSFrame){return(event.args['data']||null);}
return TimelineModel.TimelineData.forEvent(event).topFrame();};TimelineModel.TimelineProfileTree._eventId=function(event){if(event.name===TimelineModel.TimelineModel.RecordType.TimeStamp){return`${event.name}:${event.args.data.message}`;}
if(event.name!==TimelineModel.TimelineModel.RecordType.JSFrame){return event.name;}
const frame=event.args['data'];const location=frame['scriptId']||frame['url']||'';const functionName=frame['functionName'];const name=TimelineModel.TimelineJSProfileProcessor.isNativeRuntimeFrame(frame)?TimelineModel.TimelineJSProfileProcessor.nativeGroup(functionName)||functionName:`${functionName}:${frame['lineNumber']}:${frame['columnNumber']}`;return`f:${name}@${location}`;};;