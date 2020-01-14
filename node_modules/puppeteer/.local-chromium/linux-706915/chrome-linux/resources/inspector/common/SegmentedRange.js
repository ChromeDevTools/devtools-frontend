export class Segment{constructor(begin,end,data){if(begin>end){throw new Error('Invalid segment');}
this.begin=begin;this.end=end;this.data=data;}
intersects(that){return this.begin<that.end&&that.begin<this.end;}}
export default class SegmentedRange{constructor(mergeCallback){this._segments=[];this._mergeCallback=mergeCallback;}
append(newSegment){let startIndex=this._segments.lowerBound(newSegment,(a,b)=>a.begin-b.begin);let endIndex=startIndex;let merged=null;if(startIndex>0){const precedingSegment=this._segments[startIndex-1];merged=this._tryMerge(precedingSegment,newSegment);if(merged){--startIndex;newSegment=merged;}else if(this._segments[startIndex-1].end>=newSegment.begin){if(newSegment.end<precedingSegment.end){this._segments.splice(startIndex,0,new Common.Segment(newSegment.end,precedingSegment.end,precedingSegment.data));}
precedingSegment.end=newSegment.begin;}}
while(endIndex<this._segments.length&&this._segments[endIndex].end<=newSegment.end){++endIndex;}
if(endIndex<this._segments.length){merged=this._tryMerge(newSegment,this._segments[endIndex]);if(merged){endIndex++;newSegment=merged;}else if(newSegment.intersects(this._segments[endIndex])){this._segments[endIndex].begin=newSegment.end;}}
this._segments.splice(startIndex,endIndex-startIndex,newSegment);}
appendRange(that){that.segments().forEach(segment=>this.append(segment));}
segments(){return this._segments;}
_tryMerge(first,second){const merged=this._mergeCallback&&this._mergeCallback(first,second);if(!merged){return null;}
merged.begin=first.begin;merged.end=Math.max(first.end,second.end);return merged;}}
self.Common=self.Common||{};Common=Common||{};Common.Segment=Segment;Common.SegmentedRange=SegmentedRange;