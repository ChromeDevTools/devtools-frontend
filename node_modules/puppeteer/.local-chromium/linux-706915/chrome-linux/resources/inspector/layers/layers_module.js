Layers.LayerPaintProfilerView=class extends UI.SplitWidget{constructor(showImageCallback){super(true,false);this._logTreeView=new LayerViewer.PaintProfilerCommandLogView();this.setSidebarWidget(this._logTreeView);this._paintProfilerView=new LayerViewer.PaintProfilerView(showImageCallback);this.setMainWidget(this._paintProfilerView);this._paintProfilerView.addEventListener(LayerViewer.PaintProfilerView.Events.WindowChanged,this._onWindowChanged,this);}
reset(){this._paintProfilerView.setSnapshotAndLog(null,[],null);}
profile(snapshot){snapshot.commandLog().then(log=>setSnapshotAndLog.call(this,snapshot,log));function setSnapshotAndLog(snapshot,log){this._logTreeView.setCommandLog(log||[]);this._paintProfilerView.setSnapshotAndLog(snapshot,log||[],null);if(snapshot){snapshot.release();}}}
setScale(scale){this._paintProfilerView.setScale(scale);}
_onWindowChanged(){this._logTreeView.updateWindow(this._paintProfilerView.selectionWindow());}};;Layers.LayerTreeModel=class extends SDK.SDKModel{constructor(target){super(target);this._layerTreeAgent=target.layerTreeAgent();target.registerLayerTreeDispatcher(new Layers.LayerTreeDispatcher(this));this._paintProfilerModel=(target.model(SDK.PaintProfilerModel));const resourceTreeModel=target.model(SDK.ResourceTreeModel);if(resourceTreeModel){resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated,this._onMainFrameNavigated,this);}
this._layerTree=null;this._throttler=new Common.Throttler(20);}
disable(){if(!this._enabled){return;}
this._enabled=false;this._layerTreeAgent.disable();}
enable(){if(this._enabled){return;}
this._enabled=true;this._forceEnable();}
_forceEnable(){this._lastPaintRectByLayerId={};if(!this._layerTree){this._layerTree=new Layers.AgentLayerTree(this);}
this._layerTreeAgent.enable();}
layerTree(){return this._layerTree;}
async _layerTreeChanged(layers){if(!this._enabled){return;}
this._throttler.schedule(this._innerSetLayers.bind(this,layers));}
async _innerSetLayers(layers){const layerTree=(this._layerTree);await layerTree.setLayers(layers);for(const layerId in this._lastPaintRectByLayerId){const lastPaintRect=this._lastPaintRectByLayerId[layerId];const layer=layerTree.layerById(layerId);if(layer){(layer)._lastPaintRect=lastPaintRect;}}
this._lastPaintRectByLayerId={};this.dispatchEventToListeners(Layers.LayerTreeModel.Events.LayerTreeChanged);}
_layerPainted(layerId,clipRect){if(!this._enabled){return;}
const layerTree=(this._layerTree);const layer=(layerTree.layerById(layerId));if(!layer){this._lastPaintRectByLayerId[layerId]=clipRect;return;}
layer._didPaint(clipRect);this.dispatchEventToListeners(Layers.LayerTreeModel.Events.LayerPainted,layer);}
_onMainFrameNavigated(){this._layerTree=null;if(this._enabled){this._forceEnable();}}};SDK.SDKModel.register(Layers.LayerTreeModel,SDK.Target.Capability.DOM,false);Layers.LayerTreeModel.Events={LayerTreeChanged:Symbol('LayerTreeChanged'),LayerPainted:Symbol('LayerPainted'),};Layers.AgentLayerTree=class extends SDK.LayerTreeBase{constructor(layerTreeModel){super(layerTreeModel.target());this._layerTreeModel=layerTreeModel;}
async setLayers(payload){if(!payload){this._innerSetLayers(payload);return;}
const idsToResolve=new Set();for(let i=0;i<payload.length;++i){const backendNodeId=payload[i].backendNodeId;if(!backendNodeId||this.backendNodeIdToNode().has(backendNodeId)){continue;}
idsToResolve.add(backendNodeId);}
await this.resolveBackendNodeIds(idsToResolve);this._innerSetLayers(payload);}
_innerSetLayers(layers){this.setRoot(null);this.setContentRoot(null);if(!layers){return;}
let root;const oldLayersById=this._layersById;this._layersById={};for(let i=0;i<layers.length;++i){const layerId=layers[i].layerId;let layer=oldLayersById[layerId];if(layer){layer._reset(layers[i]);}else{layer=new Layers.AgentLayer(this._layerTreeModel,layers[i]);}
this._layersById[layerId]=layer;const backendNodeId=layers[i].backendNodeId;if(backendNodeId){layer._setNode(this.backendNodeIdToNode().get(backendNodeId));}
if(!this.contentRoot()&&layer.drawsContent()){this.setContentRoot(layer);}
const parentId=layer.parentId();if(parentId){const parent=this._layersById[parentId];if(!parent){console.assert(parent,'missing parent '+parentId+' for layer '+layerId);}
parent.addChild(layer);}else{if(root){console.assert(false,'Multiple root layers');}
root=layer;}}
if(root){this.setRoot(root);root._calculateQuad(new WebKitCSSMatrix());}}};Layers.AgentLayer=class{constructor(layerTreeModel,layerPayload){this._layerTreeModel=layerTreeModel;this._reset(layerPayload);}
id(){return this._layerPayload.layerId;}
parentId(){return this._layerPayload.parentLayerId;}
parent(){return this._parent;}
isRoot(){return!this.parentId();}
children(){return this._children;}
addChild(childParam){const child=(childParam);if(child._parent){console.assert(false,'Child already has a parent');}
this._children.push(child);child._parent=this;}
_setNode(node){this._node=node;}
node(){return this._node;}
nodeForSelfOrAncestor(){for(let layer=this;layer;layer=layer._parent){if(layer._node){return layer._node;}}
return null;}
offsetX(){return this._layerPayload.offsetX;}
offsetY(){return this._layerPayload.offsetY;}
width(){return this._layerPayload.width;}
height(){return this._layerPayload.height;}
transform(){return this._layerPayload.transform;}
quad(){return this._quad;}
anchorPoint(){return[this._layerPayload.anchorX||0,this._layerPayload.anchorY||0,this._layerPayload.anchorZ||0,];}
invisible(){return this._layerPayload.invisible;}
paintCount(){return this._paintCount||this._layerPayload.paintCount;}
lastPaintRect(){return this._lastPaintRect;}
scrollRects(){return this._scrollRects;}
stickyPositionConstraint(){return this._stickyPositionConstraint;}
async requestCompositingReasons(){const reasons=await this._layerTreeModel._layerTreeAgent.compositingReasons(this.id());return reasons||[];}
drawsContent(){return this._layerPayload.drawsContent;}
gpuMemoryUsage(){const bytesPerPixel=4;return this.drawsContent()?this.width()*this.height()*bytesPerPixel:0;}
snapshots(){const promise=this._layerTreeModel._paintProfilerModel.makeSnapshot(this.id()).then(snapshot=>{if(!snapshot){return null;}
return{rect:{x:0,y:0,width:this.width(),height:this.height()},snapshot:snapshot};});return[promise];}
_didPaint(rect){this._lastPaintRect=rect;this._paintCount=this.paintCount()+1;this._image=null;}
_reset(layerPayload){this._node=null;this._children=[];this._parent=null;this._paintCount=0;this._layerPayload=layerPayload;this._image=null;this._scrollRects=this._layerPayload.scrollRects||[];this._stickyPositionConstraint=this._layerPayload.stickyPositionConstraint?new SDK.Layer.StickyPositionConstraint(this._layerTreeModel.layerTree(),this._layerPayload.stickyPositionConstraint):null;}
_matrixFromArray(a){function toFixed9(x){return x.toFixed(9);}
return new WebKitCSSMatrix('matrix3d('+a.map(toFixed9).join(',')+')');}
_calculateTransformToViewport(parentTransform){const offsetMatrix=new WebKitCSSMatrix().translate(this._layerPayload.offsetX,this._layerPayload.offsetY);let matrix=offsetMatrix;if(this._layerPayload.transform){const transformMatrix=this._matrixFromArray(this._layerPayload.transform);const anchorVector=new UI.Geometry.Vector(this._layerPayload.width*this.anchorPoint()[0],this._layerPayload.height*this.anchorPoint()[1],this.anchorPoint()[2]);const anchorPoint=UI.Geometry.multiplyVectorByMatrixAndNormalize(anchorVector,matrix);const anchorMatrix=new WebKitCSSMatrix().translate(-anchorPoint.x,-anchorPoint.y,-anchorPoint.z);matrix=anchorMatrix.inverse().multiply(transformMatrix.multiply(anchorMatrix.multiply(matrix)));}
matrix=parentTransform.multiply(matrix);return matrix;}
_createVertexArrayForRect(width,height){return[0,0,0,width,0,0,width,height,0,0,height,0];}
_calculateQuad(parentTransform){const matrix=this._calculateTransformToViewport(parentTransform);this._quad=[];const vertices=this._createVertexArrayForRect(this._layerPayload.width,this._layerPayload.height);for(let i=0;i<4;++i){const point=UI.Geometry.multiplyVectorByMatrixAndNormalize(new UI.Geometry.Vector(vertices[i*3],vertices[i*3+1],vertices[i*3+2]),matrix);this._quad.push(point.x,point.y);}
function calculateQuadForLayer(layer){layer._calculateQuad(matrix);}
this._children.forEach(calculateQuadForLayer);}};Layers.LayerTreeDispatcher=class{constructor(layerTreeModel){this._layerTreeModel=layerTreeModel;}
layerTreeDidChange(layers){this._layerTreeModel._layerTreeChanged(layers||null);}
layerPainted(layerId,clipRect){this._layerTreeModel._layerPainted(layerId,clipRect);}};;Layers.LayersPanel=class extends UI.PanelWithSidebar{constructor(){super('layers',225);this._model=null;SDK.targetManager.observeTargets(this);this._layerViewHost=new LayerViewer.LayerViewHost();this._layerTreeOutline=new LayerViewer.LayerTreeOutline(this._layerViewHost);this.panelSidebarElement().appendChild(this._layerTreeOutline.element);this.setDefaultFocusedElement(this._layerTreeOutline.element);this._rightSplitWidget=new UI.SplitWidget(false,true,'layerDetailsSplitViewState');this.splitWidget().setMainWidget(this._rightSplitWidget);this._layers3DView=new LayerViewer.Layers3DView(this._layerViewHost);this._rightSplitWidget.setMainWidget(this._layers3DView);this._layers3DView.addEventListener(LayerViewer.Layers3DView.Events.PaintProfilerRequested,this._onPaintProfileRequested,this);this._layers3DView.addEventListener(LayerViewer.Layers3DView.Events.ScaleChanged,this._onScaleChanged,this);this._tabbedPane=new UI.TabbedPane();this._rightSplitWidget.setSidebarWidget(this._tabbedPane);this._layerDetailsView=new LayerViewer.LayerDetailsView(this._layerViewHost);this._layerDetailsView.addEventListener(LayerViewer.LayerDetailsView.Events.PaintProfilerRequested,this._onPaintProfileRequested,this);this._tabbedPane.appendTab(Layers.LayersPanel.DetailsViewTabs.Details,Common.UIString('Details'),this._layerDetailsView);this._paintProfilerView=new Layers.LayerPaintProfilerView(this._showImage.bind(this));this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed,this._onTabClosed,this);this._updateThrottler=new Common.Throttler(100);}
focus(){this._layerTreeOutline.focus();}
wasShown(){super.wasShown();if(this._model){this._model.enable();}}
willHide(){if(this._model){this._model.disable();}
super.willHide();}
targetAdded(target){if(this._model){return;}
this._model=target.model(Layers.LayerTreeModel);if(!this._model){return;}
this._model.addEventListener(Layers.LayerTreeModel.Events.LayerTreeChanged,this._onLayerTreeUpdated,this);this._model.addEventListener(Layers.LayerTreeModel.Events.LayerPainted,this._onLayerPainted,this);if(this.isShowing()){this._model.enable();}}
targetRemoved(target){if(!this._model||this._model.target()!==target){return;}
this._model.removeEventListener(Layers.LayerTreeModel.Events.LayerTreeChanged,this._onLayerTreeUpdated,this);this._model.removeEventListener(Layers.LayerTreeModel.Events.LayerPainted,this._onLayerPainted,this);this._model.disable();this._model=null;}
_onLayerTreeUpdated(){this._updateThrottler.schedule(this._update.bind(this));}
_update(){if(this._model){this._layerViewHost.setLayerTree(this._model.layerTree());}
return Promise.resolve();}
_onLayerPainted(event){if(!this._model){return;}
const layer=(event.data);if(this._layerViewHost.selection()&&this._layerViewHost.selection().layer()===layer){this._layerDetailsView.update();}
this._layers3DView.updateLayerSnapshot(layer);}
_onPaintProfileRequested(event){const selection=(event.data);this._layers3DView.snapshotForSelection(selection).then(snapshotWithRect=>{if(!snapshotWithRect){return;}
this._layerBeingProfiled=selection.layer();if(!this._tabbedPane.hasTab(Layers.LayersPanel.DetailsViewTabs.Profiler)){this._tabbedPane.appendTab(Layers.LayersPanel.DetailsViewTabs.Profiler,Common.UIString('Profiler'),this._paintProfilerView,undefined,true,true);}
this._tabbedPane.selectTab(Layers.LayersPanel.DetailsViewTabs.Profiler);this._paintProfilerView.profile(snapshotWithRect.snapshot);});}
_onTabClosed(event){if(event.data.tabId!==Layers.LayersPanel.DetailsViewTabs.Profiler||!this._layerBeingProfiled){return;}
this._paintProfilerView.reset();this._layers3DView.showImageForLayer(this._layerBeingProfiled,undefined);this._layerBeingProfiled=null;}
_showImage(imageURL){this._layers3DView.showImageForLayer(this._layerBeingProfiled,imageURL);}
_onScaleChanged(event){this._paintProfilerView.setScale((event.data));}};Layers.LayersPanel.DetailsViewTabs={Details:'details',Profiler:'profiler'};;