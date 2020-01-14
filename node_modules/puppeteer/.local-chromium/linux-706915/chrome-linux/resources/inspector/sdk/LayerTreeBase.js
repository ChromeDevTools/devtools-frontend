export class Layer{id(){}
parentId(){}
parent(){}
isRoot(){}
children(){}
addChild(child){}
node(){}
nodeForSelfOrAncestor(){}
offsetX(){}
offsetY(){}
width(){}
height(){}
transform(){}
quad(){}
anchorPoint(){}
invisible(){}
paintCount(){}
lastPaintRect(){}
scrollRects(){}
stickyPositionConstraint(){}
gpuMemoryUsage(){}
requestCompositingReasons(){}
drawsContent(){}
snapshots(){}}
Layer.ScrollRectType={NonFastScrollable:'NonFastScrollable',TouchEventHandler:'TouchEventHandler',WheelEventHandler:'WheelEventHandler',RepaintsOnScroll:'RepaintsOnScroll'};export class StickyPositionConstraint{constructor(layerTree,constraint){this._stickyBoxRect=constraint.stickyBoxRect;this._containingBlockRect=constraint.containingBlockRect;this._nearestLayerShiftingStickyBox=null;if(layerTree&&constraint.nearestLayerShiftingStickyBox){this._nearestLayerShiftingStickyBox=layerTree.layerById(constraint.nearestLayerShiftingStickyBox);}
this._nearestLayerShiftingContainingBlock=null;if(layerTree&&constraint.nearestLayerShiftingContainingBlock){this._nearestLayerShiftingContainingBlock=layerTree.layerById(constraint.nearestLayerShiftingContainingBlock);}}
stickyBoxRect(){return this._stickyBoxRect;}
containingBlockRect(){return this._containingBlockRect;}
nearestLayerShiftingStickyBox(){return this._nearestLayerShiftingStickyBox;}
nearestLayerShiftingContainingBlock(){return this._nearestLayerShiftingContainingBlock;}}
export default class LayerTreeBase{constructor(target){this._target=target;this._domModel=target?target.model(SDK.DOMModel):null;this._layersById={};this._root=null;this._contentRoot=null;this._backendNodeIdToNode=new Map();}
target(){return this._target;}
root(){return this._root;}
setRoot(root){this._root=root;}
contentRoot(){return this._contentRoot;}
setContentRoot(contentRoot){this._contentRoot=contentRoot;}
forEachLayer(callback,root){if(!root){root=this.root();if(!root){return false;}}
return callback(root)||root.children().some(this.forEachLayer.bind(this,callback));}
layerById(id){return this._layersById[id]||null;}
async resolveBackendNodeIds(requestedNodeIds){if(!requestedNodeIds.size||!this._domModel){return;}
const nodesMap=await this._domModel.pushNodesByBackendIdsToFrontend(requestedNodeIds);if(!nodesMap){return;}
for(const nodeId of nodesMap.keysArray()){this._backendNodeIdToNode.set(nodeId,nodesMap.get(nodeId)||null);}}
backendNodeIdToNode(){return this._backendNodeIdToNode;}
setViewportSize(viewportSize){this._viewportSize=viewportSize;}
viewportSize(){return this._viewportSize;}
_nodeForId(id){return this._domModel?this._domModel.nodeForId(id):null;}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.Layer=Layer;SDK.LayerTreeBase=LayerTreeBase;SDK.Layer.StickyPositionConstraint=StickyPositionConstraint;SDK.SnapshotWithRect;