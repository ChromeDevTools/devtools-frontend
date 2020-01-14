export class CPUProfileNode extends SDK.ProfileNode{constructor(node,sampleTime){const callFrame=node.callFrame||({functionName:node['functionName'],scriptId:node['scriptId'],url:node['url'],lineNumber:node['lineNumber']-1,columnNumber:node['columnNumber']-1});super(callFrame);this.id=node.id;this.self=node.hitCount*sampleTime;this.positionTicks=node.positionTicks;this.deoptReason=node.deoptReason&&node.deoptReason!=='no reason'?node.deoptReason:null;}}
export default class CPUProfileDataModel extends SDK.ProfileTreeModel{constructor(profile,target){super(target);const isLegacyFormat=!!profile['head'];if(isLegacyFormat){this.profileStartTime=profile.startTime*1000;this.profileEndTime=profile.endTime*1000;this.timestamps=profile.timestamps;this._compatibilityConversionHeadToNodes(profile);}else{this.profileStartTime=profile.startTime/1000;this.profileEndTime=profile.endTime/1000;this.timestamps=this._convertTimeDeltas(profile);}
this.samples=profile.samples;this.lines=profile.lines;this.totalHitCount=0;this.profileHead=this._translateProfileTree(profile.nodes);this.initialize(this.profileHead);this._extractMetaNodes();if(this.samples){this._buildIdToNodeMap();this._sortSamples();this._normalizeTimestamps();this._fixMissingSamples();}}
_compatibilityConversionHeadToNodes(profile){if(!profile.head||profile.nodes){return;}
const nodes=[];convertNodesTree(profile.head);profile.nodes=nodes;delete profile.head;function convertNodesTree(node){nodes.push(node);node.children=((node.children)).map(convertNodesTree);return node.id;}}
_convertTimeDeltas(profile){if(!profile.timeDeltas){return null;}
let lastTimeUsec=profile.startTime;const timestamps=new Array(profile.timeDeltas.length);for(let i=0;i<profile.timeDeltas.length;++i){lastTimeUsec+=profile.timeDeltas[i];timestamps[i]=lastTimeUsec;}
return timestamps;}
_translateProfileTree(nodes){function isNativeNode(node){if(node.callFrame){return!!node.callFrame.url&&node.callFrame.url.startsWith('native ');}
return!!node['url']&&node['url'].startsWith('native ');}
function buildChildrenFromParents(nodes){if(nodes[0].children){return;}
nodes[0].children=[];for(let i=1;i<nodes.length;++i){const node=nodes[i];const parentNode=nodeByIdMap.get(node.parent);if(parentNode.children){parentNode.children.push(node.id);}else{parentNode.children=[node.id];}}}
function buildHitCountFromSamples(nodes,samples){if(typeof(nodes[0].hitCount)==='number'){return;}
console.assert(samples,'Error: Neither hitCount nor samples are present in profile.');for(let i=0;i<nodes.length;++i){nodes[i].hitCount=0;}
for(let i=0;i<samples.length;++i){++nodeByIdMap.get(samples[i]).hitCount;}}
const nodeByIdMap=new Map();for(let i=0;i<nodes.length;++i){const node=nodes[i];nodeByIdMap.set(node.id,node);}
buildHitCountFromSamples(nodes,this.samples);buildChildrenFromParents(nodes);this.totalHitCount=nodes.reduce((acc,node)=>acc+node.hitCount,0);const sampleTime=(this.profileEndTime-this.profileStartTime)/this.totalHitCount;const keepNatives=!!Common.moduleSetting('showNativeFunctionsInJSProfile').get();const root=nodes[0];const idMap=new Map([[root.id,root.id]]);const resultRoot=new CPUProfileNode(root,sampleTime);const parentNodeStack=root.children.map(()=>resultRoot);const sourceNodeStack=root.children.map(id=>nodeByIdMap.get(id));while(sourceNodeStack.length){let parentNode=parentNodeStack.pop();const sourceNode=sourceNodeStack.pop();if(!sourceNode.children){sourceNode.children=[];}
const targetNode=new CPUProfileNode(sourceNode,sampleTime);if(keepNatives||!isNativeNode(sourceNode)){parentNode.children.push(targetNode);parentNode=targetNode;}else{parentNode.self+=targetNode.self;}
idMap.set(sourceNode.id,parentNode.id);parentNodeStack.push.apply(parentNodeStack,sourceNode.children.map(()=>parentNode));sourceNodeStack.push.apply(sourceNodeStack,sourceNode.children.map(id=>nodeByIdMap.get(id)));}
if(this.samples){this.samples=this.samples.map(id=>idMap.get(id));}
return resultRoot;}
_sortSamples(){const timestamps=this.timestamps;if(!timestamps){return;}
const samples=this.samples;const indices=timestamps.map((x,index)=>index);indices.sort((a,b)=>timestamps[a]-timestamps[b]);for(let i=0;i<timestamps.length;++i){let index=indices[i];if(index===i){continue;}
const savedTimestamp=timestamps[i];const savedSample=samples[i];let currentIndex=i;while(index!==i){samples[currentIndex]=samples[index];timestamps[currentIndex]=timestamps[index];currentIndex=index;index=indices[index];indices[currentIndex]=currentIndex;}
samples[currentIndex]=savedSample;timestamps[currentIndex]=savedTimestamp;}}
_normalizeTimestamps(){let timestamps=this.timestamps;if(!timestamps){const profileStartTime=this.profileStartTime;const interval=(this.profileEndTime-profileStartTime)/this.samples.length;timestamps=new Float64Array(this.samples.length+1);for(let i=0;i<timestamps.length;++i){timestamps[i]=profileStartTime+i*interval;}
this.timestamps=timestamps;return;}
for(let i=0;i<timestamps.length;++i){timestamps[i]/=1000;}
if(this.samples.length===timestamps.length){const averageSample=(timestamps.peekLast()-timestamps[0])/(timestamps.length-1);this.timestamps.push(timestamps.peekLast()+averageSample);}
this.profileStartTime=timestamps[0];this.profileEndTime=timestamps.peekLast();}
_buildIdToNodeMap(){this._idToNode=new Map();const idToNode=this._idToNode;const stack=[this.profileHead];while(stack.length){const node=stack.pop();idToNode.set(node.id,node);stack.push.apply(stack,node.children);}}
_extractMetaNodes(){const topLevelNodes=this.profileHead.children;for(let i=0;i<topLevelNodes.length&&!(this.gcNode&&this.programNode&&this.idleNode);i++){const node=topLevelNodes[i];if(node.functionName==='(garbage collector)'){this.gcNode=node;}else if(node.functionName==='(program)'){this.programNode=node;}else if(node.functionName==='(idle)'){this.idleNode=node;}}}
_fixMissingSamples(){const samples=this.samples;const samplesCount=samples.length;if(!this.programNode||samplesCount<3){return;}
const idToNode=this._idToNode;const programNodeId=this.programNode.id;const gcNodeId=this.gcNode?this.gcNode.id:-1;const idleNodeId=this.idleNode?this.idleNode.id:-1;let prevNodeId=samples[0];let nodeId=samples[1];let count=0;for(let sampleIndex=1;sampleIndex<samplesCount-1;sampleIndex++){const nextNodeId=samples[sampleIndex+1];if(nodeId===programNodeId&&!isSystemNode(prevNodeId)&&!isSystemNode(nextNodeId)&&bottomNode(idToNode.get(prevNodeId))===bottomNode(idToNode.get(nextNodeId))){++count;samples[sampleIndex]=prevNodeId;}
prevNodeId=nodeId;nodeId=nextNodeId;}
if(count){Common.console.warn(ls`DevTools: CPU profile parser is fixing ${count} missing samples.`);}
function bottomNode(node){while(node.parent&&node.parent.parent){node=node.parent;}
return node;}
function isSystemNode(nodeId){return nodeId===programNodeId||nodeId===gcNodeId||nodeId===idleNodeId;}}
forEachFrame(openFrameCallback,closeFrameCallback,startTime,stopTime){if(!this.profileHead||!this.samples){return;}
startTime=startTime||0;stopTime=stopTime||Infinity;const samples=this.samples;const timestamps=this.timestamps;const idToNode=this._idToNode;const gcNode=this.gcNode;const samplesCount=samples.length;const startIndex=timestamps.lowerBound(startTime);let stackTop=0;const stackNodes=[];let prevId=this.profileHead.id;let sampleTime;let gcParentNode=null;const stackDepth=this.maxDepth+3;if(!this._stackStartTimes){this._stackStartTimes=new Float64Array(stackDepth);}
const stackStartTimes=this._stackStartTimes;if(!this._stackChildrenDuration){this._stackChildrenDuration=new Float64Array(stackDepth);}
const stackChildrenDuration=this._stackChildrenDuration;let node;let sampleIndex;for(sampleIndex=startIndex;sampleIndex<samplesCount;sampleIndex++){sampleTime=timestamps[sampleIndex];if(sampleTime>=stopTime){break;}
const id=samples[sampleIndex];if(id===prevId){continue;}
node=idToNode.get(id);let prevNode=idToNode.get(prevId);if(node===gcNode){gcParentNode=prevNode;openFrameCallback(gcParentNode.depth+1,gcNode,sampleTime);stackStartTimes[++stackTop]=sampleTime;stackChildrenDuration[stackTop]=0;prevId=id;continue;}
if(prevNode===gcNode){const start=stackStartTimes[stackTop];const duration=sampleTime-start;stackChildrenDuration[stackTop-1]+=duration;closeFrameCallback(gcParentNode.depth+1,gcNode,start,duration,duration-stackChildrenDuration[stackTop]);--stackTop;prevNode=gcParentNode;prevId=prevNode.id;gcParentNode=null;}
while(node.depth>prevNode.depth){stackNodes.push(node);node=node.parent;}
while(prevNode!==node){const start=stackStartTimes[stackTop];const duration=sampleTime-start;stackChildrenDuration[stackTop-1]+=duration;closeFrameCallback(prevNode.depth,(prevNode),start,duration,duration-stackChildrenDuration[stackTop]);--stackTop;if(node.depth===prevNode.depth){stackNodes.push(node);node=node.parent;}
prevNode=prevNode.parent;}
while(stackNodes.length){node=stackNodes.pop();openFrameCallback(node.depth,node,sampleTime);stackStartTimes[++stackTop]=sampleTime;stackChildrenDuration[stackTop]=0;}
prevId=id;}
sampleTime=timestamps[sampleIndex]||this.profileEndTime;if(idToNode.get(prevId)===gcNode){const start=stackStartTimes[stackTop];const duration=sampleTime-start;stackChildrenDuration[stackTop-1]+=duration;closeFrameCallback(gcParentNode.depth+1,node,start,duration,duration-stackChildrenDuration[stackTop]);--stackTop;prevId=gcParentNode.id;}
for(let node=idToNode.get(prevId);node.parent;node=node.parent){const start=stackStartTimes[stackTop];const duration=sampleTime-start;stackChildrenDuration[stackTop-1]+=duration;closeFrameCallback(node.depth,(node),start,duration,duration-stackChildrenDuration[stackTop]);--stackTop;}}
nodeByIndex(index){return this._idToNode.get(this.samples[index])||null;}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.CPUProfileDataModel=CPUProfileDataModel;SDK.CPUProfileNode=CPUProfileNode;