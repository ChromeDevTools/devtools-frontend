export default class OverlayModel extends SDK.SDKModel{constructor(target){super(target);this._domModel=(target.model(SDK.DOMModel));target.registerOverlayDispatcher(this);this._overlayAgent=target.overlayAgent();this._debuggerModel=target.model(SDK.DebuggerModel);if(this._debuggerModel){Common.moduleSetting('disablePausedStateOverlay').addChangeListener(this._updatePausedInDebuggerMessage,this);this._debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerPaused,this._updatePausedInDebuggerMessage,this);this._debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerResumed,this._updatePausedInDebuggerMessage,this);this._debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared,this._updatePausedInDebuggerMessage,this);}
this._inspectModeEnabled=false;this._hideHighlightTimeout=null;this._defaultHighlighter=new DefaultHighlighter(this);this._highlighter=this._defaultHighlighter;this._showPaintRectsSetting=Common.moduleSetting('showPaintRects');this._showLayoutShiftRegionsSetting=Common.moduleSetting('showLayoutShiftRegions');this._showAdHighlightsSetting=Common.moduleSetting('showAdHighlights');this._showDebugBordersSetting=Common.moduleSetting('showDebugBorders');this._showFPSCounterSetting=Common.moduleSetting('showFPSCounter');this._showScrollBottleneckRectsSetting=Common.moduleSetting('showScrollBottleneckRects');this._showHitTestBordersSetting=Common.moduleSetting('showHitTestBorders');this._registeredListeners=[];this._showViewportSizeOnResize=true;if(!target.suspended()){this._overlayAgent.enable();this._wireAgentToSettings();}}
static highlightObjectAsDOMNode(object){const domModel=object.runtimeModel().target().model(SDK.DOMModel);if(domModel){domModel.overlayModel().highlightInOverlay({object});}}
static hideDOMNodeHighlight(){for(const overlayModel of SDK.targetManager.models(OverlayModel)){overlayModel._delayedHideHighlight(0);}}
static async muteHighlight(){return Promise.all(SDK.targetManager.models(OverlayModel).map(model=>model.suspendModel()));}
static async unmuteHighlight(){return Promise.all(SDK.targetManager.models(OverlayModel).map(model=>model.resumeModel()));}
_wireAgentToSettings(){this._registeredListeners=[this._showPaintRectsSetting.addChangeListener(()=>this._overlayAgent.setShowPaintRects(this._showPaintRectsSetting.get())),this._showLayoutShiftRegionsSetting.addChangeListener(()=>this._overlayAgent.setShowLayoutShiftRegions(this._showLayoutShiftRegionsSetting.get())),this._showAdHighlightsSetting.addChangeListener(()=>this._overlayAgent.setShowAdHighlights(this._showAdHighlightsSetting.get())),this._showDebugBordersSetting.addChangeListener(()=>this._overlayAgent.setShowDebugBorders(this._showDebugBordersSetting.get())),this._showFPSCounterSetting.addChangeListener(()=>this._overlayAgent.setShowFPSCounter(this._showFPSCounterSetting.get())),this._showScrollBottleneckRectsSetting.addChangeListener(()=>this._overlayAgent.setShowScrollBottleneckRects(this._showScrollBottleneckRectsSetting.get())),this._showHitTestBordersSetting.addChangeListener(()=>this._overlayAgent.setShowHitTestBorders(this._showHitTestBordersSetting.get()))];if(this._showPaintRectsSetting.get()){this._overlayAgent.setShowPaintRects(true);}
if(this._showLayoutShiftRegionsSetting.get()){this._overlayAgent.setShowLayoutShiftRegions(true);}
if(this._showAdHighlightsSetting.get()){this._overlayAgent.setShowAdHighlights(true);}
if(this._showDebugBordersSetting.get()){this._overlayAgent.setShowDebugBorders(true);}
if(this._showFPSCounterSetting.get()){this._overlayAgent.setShowFPSCounter(true);}
if(this._showScrollBottleneckRectsSetting.get()){this._overlayAgent.setShowScrollBottleneckRects(true);}
if(this._showHitTestBordersSetting.get()){this._overlayAgent.setShowHitTestBorders(true);}
if(this._debuggerModel.isPaused()){this._updatePausedInDebuggerMessage();}
return this._overlayAgent.setShowViewportSizeOnResize(this._showViewportSizeOnResize);}
suspendModel(){Common.EventTarget.removeEventListeners(this._registeredListeners);return this._overlayAgent.disable();}
resumeModel(){this._overlayAgent.enable();return this._wireAgentToSettings();}
setShowViewportSizeOnResize(show){this._showViewportSizeOnResize=show;if(this.target().suspended()){return;}
this._overlayAgent.setShowViewportSizeOnResize(show);}
_updatePausedInDebuggerMessage(){if(this.target().suspended()){return Promise.resolve();}
const message=this._debuggerModel.isPaused()&&!Common.moduleSetting('disablePausedStateOverlay').get()?Common.UIString('Paused in debugger'):undefined;return this._overlayAgent.setPausedInDebuggerMessage(message);}
setHighlighter(highlighter){this._highlighter=highlighter||this._defaultHighlighter;}
async setInspectMode(mode,showStyles=true){await this._domModel.requestDocument();this._inspectModeEnabled=mode!==Protocol.Overlay.InspectMode.None;this.dispatchEventToListeners(Events.InspectModeWillBeToggled,this);this._highlighter.setInspectMode(mode,this._buildHighlightConfig('all',showStyles));}
inspectModeEnabled(){return this._inspectModeEnabled;}
highlightInOverlay(data,mode,showInfo){if(this._hideHighlightTimeout){clearTimeout(this._hideHighlightTimeout);this._hideHighlightTimeout=null;}
const highlightConfig=this._buildHighlightConfig(mode);if(typeof showInfo!=='undefined'){highlightConfig.showInfo=showInfo;}
this._highlighter.highlightInOverlay(data,highlightConfig);}
highlightInOverlayForTwoSeconds(data){this.highlightInOverlay(data);this._delayedHideHighlight(2000);}
_delayedHideHighlight(delay){if(this._hideHighlightTimeout===null){this._hideHighlightTimeout=setTimeout(()=>this.highlightInOverlay({}),delay);}}
highlightFrame(frameId){if(this._hideHighlightTimeout){clearTimeout(this._hideHighlightTimeout);this._hideHighlightTimeout=null;}
this._highlighter.highlightFrame(frameId);}
_buildHighlightConfig(mode='all',showStyles=false){const showRulers=Common.moduleSetting('showMetricsRulers').get();const highlightConfig={showInfo:mode==='all',showRulers:showRulers,showStyles,showExtensionLines:showRulers};if(mode==='all'||mode==='content'){highlightConfig.contentColor=Common.Color.PageHighlight.Content.toProtocolRGBA();}
if(mode==='all'||mode==='padding'){highlightConfig.paddingColor=Common.Color.PageHighlight.Padding.toProtocolRGBA();}
if(mode==='all'||mode==='border'){highlightConfig.borderColor=Common.Color.PageHighlight.Border.toProtocolRGBA();}
if(mode==='all'||mode==='margin'){highlightConfig.marginColor=Common.Color.PageHighlight.Margin.toProtocolRGBA();}
if(mode==='all'){highlightConfig.eventTargetColor=Common.Color.PageHighlight.EventTarget.toProtocolRGBA();highlightConfig.shapeColor=Common.Color.PageHighlight.Shape.toProtocolRGBA();highlightConfig.shapeMarginColor=Common.Color.PageHighlight.ShapeMargin.toProtocolRGBA();}
if(mode==='all'){highlightConfig.cssGridColor=Common.Color.PageHighlight.CssGrid.toProtocolRGBA();}
return highlightConfig;}
nodeHighlightRequested(nodeId){const node=this._domModel.nodeForId(nodeId);if(node){this.dispatchEventToListeners(Events.HighlightNodeRequested,node);}}
static setInspectNodeHandler(handler){OverlayModel._inspectNodeHandler=handler;}
inspectNodeRequested(backendNodeId){const deferredNode=new SDK.DeferredDOMNode(this.target(),backendNodeId);if(OverlayModel._inspectNodeHandler){deferredNode.resolvePromise().then(node=>{if(node){OverlayModel._inspectNodeHandler(node);}});}else{Common.Revealer.reveal(deferredNode);}
this.dispatchEventToListeners(Events.ExitedInspectMode);}
screenshotRequested(viewport){this.dispatchEventToListeners(Events.ScreenshotRequested,viewport);this.dispatchEventToListeners(Events.ExitedInspectMode);}
inspectModeCanceled(){this.dispatchEventToListeners(Events.ExitedInspectMode);}}
export const Events={InspectModeWillBeToggled:Symbol('InspectModeWillBeToggled'),ExitedInspectMode:Symbol('InspectModeExited'),HighlightNodeRequested:Symbol('HighlightNodeRequested'),ScreenshotRequested:Symbol('ScreenshotRequested'),};export class Highlighter{highlightInOverlay(data,config){}
setInspectMode(mode,config){}
highlightFrame(frameId){}}
export class DefaultHighlighter{constructor(model){this._model=model;}
highlightInOverlay(data,config){const{node,deferredNode,object,selectorList}=data;const nodeId=node?node.id:undefined;const backendNodeId=deferredNode?deferredNode.backendNodeId():undefined;const objectId=object?object.objectId:undefined;if(nodeId||backendNodeId||objectId){this._model._overlayAgent.highlightNode(config,nodeId,backendNodeId,objectId,selectorList);}else{this._model._overlayAgent.hideHighlight();}}
setInspectMode(mode,config){return this._model._overlayAgent.setInspectMode(mode,config);}
highlightFrame(frameId){this._model._overlayAgent.highlightFrame(frameId,Common.Color.PageHighlight.Content.toProtocolRGBA(),Common.Color.PageHighlight.ContentOutline.toProtocolRGBA());}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.OverlayModel=OverlayModel;SDK.OverlayModel.Events=Events;SDK.OverlayModel.Highlighter=Highlighter;SDK.OverlayModel.DefaultHighlighter=DefaultHighlighter;SDK.SDKModel.register(SDK.OverlayModel,SDK.Target.Capability.DOM,true);SDK.OverlayModel.HighlightData;