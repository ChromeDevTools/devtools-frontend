export class PaintProfilerModel extends SDK.SDKModel{constructor(target){super(target);this._layerTreeAgent=target.layerTreeAgent();}
async loadSnapshotFromFragments(fragments){const snapshotId=await this._layerTreeAgent.loadSnapshot(fragments);return snapshotId&&new PaintProfilerSnapshot(this,snapshotId);}
loadSnapshot(encodedPicture){const fragment={x:0,y:0,picture:encodedPicture};return this.loadSnapshotFromFragments([fragment]);}
async makeSnapshot(layerId){const snapshotId=await this._layerTreeAgent.makeSnapshot(layerId);return snapshotId&&new PaintProfilerSnapshot(this,snapshotId);}}
export class PaintProfilerSnapshot{constructor(paintProfilerModel,snapshotId){this._paintProfilerModel=paintProfilerModel;this._id=snapshotId;this._refCount=1;}
release(){console.assert(this._refCount>0,'release is already called on the object');if(!--this._refCount){this._paintProfilerModel._layerTreeAgent.releaseSnapshot(this._id);}}
addReference(){++this._refCount;console.assert(this._refCount>0,'Referencing a dead object');}
replay(scale,firstStep,lastStep){return this._paintProfilerModel._layerTreeAgent.replaySnapshot(this._id,firstStep,lastStep,scale||1.0);}
profile(clipRect){return this._paintProfilerModel._layerTreeAgent.profileSnapshot(this._id,5,1,clipRect||undefined);}
async commandLog(){const log=await this._paintProfilerModel._layerTreeAgent.snapshotCommandLog(this._id);return log&&log.map((entry,index)=>new PaintProfilerLogItem((entry),index));}}
export class PaintProfilerLogItem{constructor(rawEntry,commandIndex){this.method=rawEntry.method;this.params=rawEntry.params;this.commandIndex=commandIndex;}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.PaintProfilerModel=PaintProfilerModel;SDK.PaintProfilerSnapshot=PaintProfilerSnapshot;SDK.PaintProfilerLogItem=PaintProfilerLogItem;SDK.PictureFragment;SDK.RawPaintProfilerLogItem;SDK.SDKModel.register(PaintProfilerModel,SDK.Target.Capability.DOM,false);