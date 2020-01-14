export default class FilmStripModel{constructor(tracingModel,zeroTime){this.reset(tracingModel,zeroTime);}
reset(tracingModel,zeroTime){this._zeroTime=zeroTime||tracingModel.minimumRecordTime();this._spanTime=tracingModel.maximumRecordTime()-this._zeroTime;this._frames=[];const browserMain=SDK.TracingModel.browserMainThread(tracingModel);if(!browserMain){return;}
const events=browserMain.events();for(let i=0;i<events.length;++i){const event=events[i];if(event.startTime<this._zeroTime){continue;}
if(!event.hasCategory(_category)){continue;}
if(event.name===TraceEvents.CaptureFrame){const data=event.args['data'];if(data){this._frames.push(Frame._fromEvent(this,event,this._frames.length));}}else if(event.name===TraceEvents.Screenshot){this._frames.push(Frame._fromSnapshot(this,(event),this._frames.length));}}}
frames(){return this._frames;}
zeroTime(){return this._zeroTime;}
spanTime(){return this._spanTime;}
frameByTimestamp(timestamp){const index=this._frames.upperBound(timestamp,(timestamp,frame)=>timestamp-frame.timestamp)-1;return index>=0?this._frames[index]:null;}}
export const _category='disabled-by-default-devtools.screenshot';export const TraceEvents={CaptureFrame:'CaptureFrame',Screenshot:'Screenshot'};export class Frame{constructor(model,timestamp,index){this._model=model;this.timestamp=timestamp;this.index=index;this._imageData=null;this._snapshot=null;}
static _fromEvent(model,event,index){const frame=new Frame(model,event.startTime,index);frame._imageData=event.args['data'];return frame;}
static _fromSnapshot(model,snapshot,index){const frame=new Frame(model,snapshot.startTime,index);frame._snapshot=snapshot;return frame;}
model(){return this._model;}
imageDataPromise(){if(this._imageData||!this._snapshot){return Promise.resolve(this._imageData);}
return(this._snapshot.objectPromise());}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.FilmStripModel=FilmStripModel;SDK.FilmStripModel._category=_category;SDK.FilmStripModel.TraceEvents=TraceEvents;SDK.FilmStripModel.Frame=Frame;