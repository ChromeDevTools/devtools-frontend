export default class SplitWidget extends UI.Widget{constructor(isVertical,secondIsSidebar,settingName,defaultSidebarWidth,defaultSidebarHeight,constraintsInDip){super(true);this.element.classList.add('split-widget');this.registerRequiredCSS('ui/splitWidget.css');this.contentElement.classList.add('shadow-split-widget');this._sidebarElement=this.contentElement.createChild('div','shadow-split-widget-contents shadow-split-widget-sidebar vbox');this._mainElement=this.contentElement.createChild('div','shadow-split-widget-contents shadow-split-widget-main vbox');this._mainElement.createChild('slot').name='insertion-point-main';this._sidebarElement.createChild('slot').name='insertion-point-sidebar';this._resizerElement=this.contentElement.createChild('div','shadow-split-widget-resizer');this._resizerElementSize=null;this._resizerWidget=new UI.SimpleResizerWidget();this._resizerWidget.setEnabled(true);this._resizerWidget.addEventListener(UI.ResizerWidget.Events.ResizeStart,this._onResizeStart,this);this._resizerWidget.addEventListener(UI.ResizerWidget.Events.ResizeUpdate,this._onResizeUpdate,this);this._resizerWidget.addEventListener(UI.ResizerWidget.Events.ResizeEnd,this._onResizeEnd,this);this._defaultSidebarWidth=defaultSidebarWidth||200;this._defaultSidebarHeight=defaultSidebarHeight||this._defaultSidebarWidth;this._constraintsInDip=!!constraintsInDip;this._resizeStartSizeDIP=0;this._setting=settingName?Common.settings.createSetting(settingName,{}):null;this._totalSizeCSS=0;this._totalSizeOtherDimensionCSS=0;this._mainWidget=null;this._sidebarWidget=null;this._animationFrameHandle=0;this._animationCallback=null;this._showHideSidebarButtonTitle='';this._showHideSidebarButton=null;this._isVertical=false;this._sidebarMinimized=false;this._detaching=false;this._sidebarSizeDIP=-1;this._savedSidebarSizeDIP=this._sidebarSizeDIP;this._secondIsSidebar=false;this._shouldSaveShowMode=false;this._savedVerticalMainSize=null;this._savedHorizontalMainSize=null;this.setSecondIsSidebar(secondIsSidebar);this._innerSetVertical(isVertical);this._showMode=ShowMode.Both;this._savedShowMode=this._showMode;this.installResizer(this._resizerElement);}
isVertical(){return this._isVertical;}
setVertical(isVertical){if(this._isVertical===isVertical){return;}
this._innerSetVertical(isVertical);if(this.isShowing()){this._updateLayout();}}
_innerSetVertical(isVertical){this.contentElement.classList.toggle('vbox',!isVertical);this.contentElement.classList.toggle('hbox',isVertical);this._isVertical=isVertical;this._resizerElementSize=null;this._sidebarSizeDIP=-1;this._restoreSidebarSizeFromSettings();if(this._shouldSaveShowMode){this._restoreAndApplyShowModeFromSettings();}
this._updateShowHideSidebarButton();this._resizerWidget.setVertical(!isVertical);this.invalidateConstraints();}
_updateLayout(animate){this._totalSizeCSS=0;this._totalSizeOtherDimensionCSS=0;this._mainElement.style.removeProperty('width');this._mainElement.style.removeProperty('height');this._sidebarElement.style.removeProperty('width');this._sidebarElement.style.removeProperty('height');this._innerSetSidebarSizeDIP(this._preferredSidebarSizeDIP(),!!animate);}
setMainWidget(widget){if(this._mainWidget===widget){return;}
this.suspendInvalidations();if(this._mainWidget){this._mainWidget.detach();}
this._mainWidget=widget;if(widget){widget.element.slot='insertion-point-main';if(this._showMode===ShowMode.OnlyMain||this._showMode===ShowMode.Both){widget.show(this.element);}}
this.resumeInvalidations();}
setSidebarWidget(widget){if(this._sidebarWidget===widget){return;}
this.suspendInvalidations();if(this._sidebarWidget){this._sidebarWidget.detach();}
this._sidebarWidget=widget;if(widget){widget.element.slot='insertion-point-sidebar';if(this._showMode===ShowMode.OnlySidebar||this._showMode===ShowMode.Both){widget.show(this.element);}}
this.resumeInvalidations();}
mainWidget(){return this._mainWidget;}
sidebarWidget(){return this._sidebarWidget;}
childWasDetached(widget){if(this._detaching){return;}
if(this._mainWidget===widget){this._mainWidget=null;}
if(this._sidebarWidget===widget){this._sidebarWidget=null;}
this.invalidateConstraints();}
isSidebarSecond(){return this._secondIsSidebar;}
enableShowModeSaving(){this._shouldSaveShowMode=true;this._restoreAndApplyShowModeFromSettings();}
showMode(){return this._showMode;}
setSecondIsSidebar(secondIsSidebar){if(secondIsSidebar===this._secondIsSidebar){return;}
this._secondIsSidebar=secondIsSidebar;if(!this._mainWidget||!this._mainWidget.shouldHideOnDetach()){if(secondIsSidebar){this.contentElement.insertBefore(this._mainElement,this._sidebarElement);}else{this.contentElement.insertBefore(this._mainElement,this._resizerElement);}}else if(!this._sidebarWidget||!this._sidebarWidget.shouldHideOnDetach()){if(secondIsSidebar){this.contentElement.insertBefore(this._sidebarElement,this._resizerElement);}else{this.contentElement.insertBefore(this._sidebarElement,this._mainElement);}}else{console.error('Could not swap split widget side. Both children widgets contain iframes.');this._secondIsSidebar=!secondIsSidebar;}}
sidebarSide(){if(this._showMode!==ShowMode.Both){return null;}
return this._isVertical?(this._secondIsSidebar?'right':'left'):(this._secondIsSidebar?'bottom':'top');}
resizerElement(){return this._resizerElement;}
hideMain(animate){this._showOnly(this._sidebarWidget,this._mainWidget,this._sidebarElement,this._mainElement,animate);this._updateShowMode(ShowMode.OnlySidebar);}
hideSidebar(animate){this._showOnly(this._mainWidget,this._sidebarWidget,this._mainElement,this._sidebarElement,animate);this._updateShowMode(ShowMode.OnlyMain);}
setSidebarMinimized(minimized){this._sidebarMinimized=minimized;this.invalidateConstraints();}
isSidebarMinimized(){return this._sidebarMinimized;}
_showOnly(sideToShow,sideToHide,shadowToShow,shadowToHide,animate){this._cancelAnimation();function callback(){if(sideToShow){if(sideToShow===this._mainWidget){this._mainWidget.show(this.element,this._sidebarWidget?this._sidebarWidget.element:null);}else{this._sidebarWidget.show(this.element);}}
if(sideToHide){this._detaching=true;sideToHide.detach();this._detaching=false;}
this._resizerElement.classList.add('hidden');shadowToShow.classList.remove('hidden');shadowToShow.classList.add('maximized');shadowToHide.classList.add('hidden');shadowToHide.classList.remove('maximized');this._removeAllLayoutProperties();this.doResize();this._showFinishedForTest();}
if(animate){this._animate(true,callback.bind(this));}else{callback.call(this);}
this._sidebarSizeDIP=-1;this.setResizable(false);}
_showFinishedForTest(){}
_removeAllLayoutProperties(){this._sidebarElement.style.removeProperty('flexBasis');this._mainElement.style.removeProperty('width');this._mainElement.style.removeProperty('height');this._sidebarElement.style.removeProperty('width');this._sidebarElement.style.removeProperty('height');this._resizerElement.style.removeProperty('left');this._resizerElement.style.removeProperty('right');this._resizerElement.style.removeProperty('top');this._resizerElement.style.removeProperty('bottom');this._resizerElement.style.removeProperty('margin-left');this._resizerElement.style.removeProperty('margin-right');this._resizerElement.style.removeProperty('margin-top');this._resizerElement.style.removeProperty('margin-bottom');}
showBoth(animate){if(this._showMode===ShowMode.Both){animate=false;}
this._cancelAnimation();this._mainElement.classList.remove('maximized','hidden');this._sidebarElement.classList.remove('maximized','hidden');this._resizerElement.classList.remove('hidden');this.setResizable(true);this.suspendInvalidations();if(this._sidebarWidget){this._sidebarWidget.show(this.element);}
if(this._mainWidget){this._mainWidget.show(this.element,this._sidebarWidget?this._sidebarWidget.element:null);}
this.resumeInvalidations();this.setSecondIsSidebar(this._secondIsSidebar);this._sidebarSizeDIP=-1;this._updateShowMode(ShowMode.Both);this._updateLayout(animate);}
setResizable(resizable){this._resizerWidget.setEnabled(resizable);}
isResizable(){return this._resizerWidget.isEnabled();}
setSidebarSize(size){const sizeDIP=UI.zoomManager.cssToDIP(size);this._savedSidebarSizeDIP=sizeDIP;this._saveSetting();this._innerSetSidebarSizeDIP(sizeDIP,false,true);}
sidebarSize(){const sizeDIP=Math.max(0,this._sidebarSizeDIP);return UI.zoomManager.dipToCSS(sizeDIP);}
_totalSizeDIP(){if(!this._totalSizeCSS){this._totalSizeCSS=this._isVertical?this.contentElement.offsetWidth:this.contentElement.offsetHeight;this._totalSizeOtherDimensionCSS=this._isVertical?this.contentElement.offsetHeight:this.contentElement.offsetWidth;}
return UI.zoomManager.cssToDIP(this._totalSizeCSS);}
_updateShowMode(showMode){this._showMode=showMode;this._saveShowModeToSettings();this._updateShowHideSidebarButton();this.dispatchEventToListeners(SplitWidget.Events.ShowModeChanged,showMode);this.invalidateConstraints();}
_innerSetSidebarSizeDIP(sizeDIP,animate,userAction){if(this._showMode!==ShowMode.Both||!this.isShowing()){return;}
sizeDIP=this._applyConstraints(sizeDIP,userAction);if(this._sidebarSizeDIP===sizeDIP){return;}
if(!this._resizerElementSize){this._resizerElementSize=this._isVertical?this._resizerElement.offsetWidth:this._resizerElement.offsetHeight;}
this._removeAllLayoutProperties();const roundSizeCSS=Math.round(UI.zoomManager.dipToCSS(sizeDIP));const sidebarSizeValue=roundSizeCSS+'px';const mainSizeValue=(this._totalSizeCSS-roundSizeCSS)+'px';this._sidebarElement.style.flexBasis=sidebarSizeValue;if(this._isVertical){this._sidebarElement.style.width=sidebarSizeValue;this._mainElement.style.width=mainSizeValue;this._sidebarElement.style.height=this._totalSizeOtherDimensionCSS+'px';this._mainElement.style.height=this._totalSizeOtherDimensionCSS+'px';}else{this._sidebarElement.style.height=sidebarSizeValue;this._mainElement.style.height=mainSizeValue;this._sidebarElement.style.width=this._totalSizeOtherDimensionCSS+'px';this._mainElement.style.width=this._totalSizeOtherDimensionCSS+'px';}
if(this._isVertical){if(this._secondIsSidebar){this._resizerElement.style.right=sidebarSizeValue;this._resizerElement.style.marginRight=-this._resizerElementSize/2+'px';}else{this._resizerElement.style.left=sidebarSizeValue;this._resizerElement.style.marginLeft=-this._resizerElementSize/2+'px';}}else{if(this._secondIsSidebar){this._resizerElement.style.bottom=sidebarSizeValue;this._resizerElement.style.marginBottom=-this._resizerElementSize/2+'px';}else{this._resizerElement.style.top=sidebarSizeValue;this._resizerElement.style.marginTop=-this._resizerElementSize/2+'px';}}
this._sidebarSizeDIP=sizeDIP;if(animate){this._animate(false);}else{this.doResize();this.dispatchEventToListeners(SplitWidget.Events.SidebarSizeChanged,this.sidebarSize());}}
_animate(reverse,callback){const animationTime=50;this._animationCallback=callback||null;let animatedMarginPropertyName;if(this._isVertical){animatedMarginPropertyName=this._secondIsSidebar?'margin-right':'margin-left';}else{animatedMarginPropertyName=this._secondIsSidebar?'margin-bottom':'margin-top';}
const marginFrom=reverse?'0':'-'+UI.zoomManager.dipToCSS(this._sidebarSizeDIP)+'px';const marginTo=reverse?'-'+UI.zoomManager.dipToCSS(this._sidebarSizeDIP)+'px':'0';this.contentElement.style.setProperty(animatedMarginPropertyName,marginFrom);if(!reverse){suppressUnused(this._mainElement.offsetWidth);suppressUnused(this._sidebarElement.offsetWidth);}
if(!reverse){this._sidebarWidget.doResize();}
this.contentElement.style.setProperty('transition',animatedMarginPropertyName+' '+animationTime+'ms linear');const boundAnimationFrame=animationFrame.bind(this);let startTime;function animationFrame(){this._animationFrameHandle=0;if(!startTime){this.contentElement.style.setProperty(animatedMarginPropertyName,marginTo);startTime=window.performance.now();}else if(window.performance.now()<startTime+animationTime){if(this._mainWidget){this._mainWidget.doResize();}}else{this._cancelAnimation();if(this._mainWidget){this._mainWidget.doResize();}
this.dispatchEventToListeners(SplitWidget.Events.SidebarSizeChanged,this.sidebarSize());return;}
this._animationFrameHandle=this.contentElement.window().requestAnimationFrame(boundAnimationFrame);}
this._animationFrameHandle=this.contentElement.window().requestAnimationFrame(boundAnimationFrame);}
_cancelAnimation(){this.contentElement.style.removeProperty('margin-top');this.contentElement.style.removeProperty('margin-right');this.contentElement.style.removeProperty('margin-bottom');this.contentElement.style.removeProperty('margin-left');this.contentElement.style.removeProperty('transition');if(this._animationFrameHandle){this.contentElement.window().cancelAnimationFrame(this._animationFrameHandle);this._animationFrameHandle=0;}
if(this._animationCallback){this._animationCallback();this._animationCallback=null;}}
_applyConstraints(sidebarSize,userAction){const totalSize=this._totalSizeDIP();const zoomFactor=this._constraintsInDip?1:UI.zoomManager.zoomFactor();let constraints=this._sidebarWidget?this._sidebarWidget.constraints():new UI.Constraints();let minSidebarSize=this.isVertical()?constraints.minimum.width:constraints.minimum.height;if(!minSidebarSize){minSidebarSize=MinPadding;}
minSidebarSize*=zoomFactor;if(this._sidebarMinimized){sidebarSize=minSidebarSize;}
let preferredSidebarSize=this.isVertical()?constraints.preferred.width:constraints.preferred.height;if(!preferredSidebarSize){preferredSidebarSize=MinPadding;}
preferredSidebarSize*=zoomFactor;if(sidebarSize<preferredSidebarSize){preferredSidebarSize=Math.max(sidebarSize,minSidebarSize);}
preferredSidebarSize+=zoomFactor;constraints=this._mainWidget?this._mainWidget.constraints():new UI.Constraints();let minMainSize=this.isVertical()?constraints.minimum.width:constraints.minimum.height;if(!minMainSize){minMainSize=MinPadding;}
minMainSize*=zoomFactor;let preferredMainSize=this.isVertical()?constraints.preferred.width:constraints.preferred.height;if(!preferredMainSize){preferredMainSize=MinPadding;}
preferredMainSize*=zoomFactor;const savedMainSize=this.isVertical()?this._savedVerticalMainSize:this._savedHorizontalMainSize;if(savedMainSize!==null){preferredMainSize=Math.min(preferredMainSize,savedMainSize*zoomFactor);}
if(userAction){preferredMainSize=minMainSize;}
const totalPreferred=preferredMainSize+preferredSidebarSize;if(totalPreferred<=totalSize){return Number.constrain(sidebarSize,preferredSidebarSize,totalSize-preferredMainSize);}
if(minMainSize+minSidebarSize<=totalSize){const delta=totalPreferred-totalSize;const sidebarDelta=delta*preferredSidebarSize/totalPreferred;sidebarSize=preferredSidebarSize-sidebarDelta;return Number.constrain(sidebarSize,minSidebarSize,totalSize-minMainSize);}
return Math.max(0,totalSize-minMainSize);}
wasShown(){this._forceUpdateLayout();UI.zoomManager.addEventListener(UI.ZoomManager.Events.ZoomChanged,this._onZoomChanged,this);}
willHide(){UI.zoomManager.removeEventListener(UI.ZoomManager.Events.ZoomChanged,this._onZoomChanged,this);}
onResize(){this._updateLayout();}
onLayout(){this._updateLayout();}
calculateConstraints(){if(this._showMode===ShowMode.OnlyMain){return this._mainWidget?this._mainWidget.constraints():new UI.Constraints();}
if(this._showMode===ShowMode.OnlySidebar){return this._sidebarWidget?this._sidebarWidget.constraints():new UI.Constraints();}
let mainConstraints=this._mainWidget?this._mainWidget.constraints():new UI.Constraints();let sidebarConstraints=this._sidebarWidget?this._sidebarWidget.constraints():new UI.Constraints();const min=MinPadding;if(this._isVertical){mainConstraints=mainConstraints.widthToMax(min).addWidth(1);sidebarConstraints=sidebarConstraints.widthToMax(min);return mainConstraints.addWidth(sidebarConstraints).heightToMax(sidebarConstraints);}else{mainConstraints=mainConstraints.heightToMax(min).addHeight(1);sidebarConstraints=sidebarConstraints.heightToMax(min);return mainConstraints.widthToMax(sidebarConstraints).addHeight(sidebarConstraints);}}
_onResizeStart(event){this._resizeStartSizeDIP=this._sidebarSizeDIP;}
_onResizeUpdate(event){const offset=event.data.currentPosition-event.data.startPosition;const offsetDIP=UI.zoomManager.cssToDIP(offset);const newSizeDIP=this._secondIsSidebar?this._resizeStartSizeDIP-offsetDIP:this._resizeStartSizeDIP+offsetDIP;const constrainedSizeDIP=this._applyConstraints(newSizeDIP,true);this._savedSidebarSizeDIP=constrainedSizeDIP;this._saveSetting();this._innerSetSidebarSizeDIP(constrainedSizeDIP,false,true);if(this.isVertical()){this._savedVerticalMainSize=this._totalSizeDIP()-this._sidebarSizeDIP;}else{this._savedHorizontalMainSize=this._totalSizeDIP()-this._sidebarSizeDIP;}}
_onResizeEnd(event){this._resizeStartSizeDIP=0;}
hideDefaultResizer(noSplitter){this.uninstallResizer(this._resizerElement);this._sidebarElement.classList.toggle('no-default-splitter',!!noSplitter);}
installResizer(resizerElement){this._resizerWidget.addElement(resizerElement);}
uninstallResizer(resizerElement){this._resizerWidget.removeElement(resizerElement);}
hasCustomResizer(){const elements=this._resizerWidget.elements();return elements.length>1||(elements.length===1&&elements[0]!==this._resizerElement);}
toggleResizer(resizer,on){if(on){this.installResizer(resizer);}else{this.uninstallResizer(resizer);}}
_settingForOrientation(){const state=this._setting?this._setting.get():{};return this._isVertical?state.vertical:state.horizontal;}
_preferredSidebarSizeDIP(){let size=this._savedSidebarSizeDIP;if(!size){size=this._isVertical?this._defaultSidebarWidth:this._defaultSidebarHeight;if(0<size&&size<1){size*=this._totalSizeDIP();}}
return size;}
_restoreSidebarSizeFromSettings(){const settingForOrientation=this._settingForOrientation();this._savedSidebarSizeDIP=settingForOrientation?settingForOrientation.size:0;}
_restoreAndApplyShowModeFromSettings(){const orientationState=this._settingForOrientation();this._savedShowMode=orientationState&&orientationState.showMode?orientationState.showMode:this._showMode;this._showMode=this._savedShowMode;switch(this._savedShowMode){case ShowMode.Both:this.showBoth();break;case ShowMode.OnlyMain:this.hideSidebar();break;case ShowMode.OnlySidebar:this.hideMain();break;}}
_saveShowModeToSettings(){this._savedShowMode=this._showMode;this._saveSetting();}
_saveSetting(){if(!this._setting){return;}
const state=this._setting.get();const orientationState=(this._isVertical?state.vertical:state.horizontal)||{};orientationState.size=this._savedSidebarSizeDIP;if(this._shouldSaveShowMode){orientationState.showMode=this._savedShowMode;}
if(this._isVertical){state.vertical=orientationState;}else{state.horizontal=orientationState;}
this._setting.set(state);}
_forceUpdateLayout(){this._sidebarSizeDIP=-1;this._updateLayout();}
_onZoomChanged(event){this._forceUpdateLayout();}
createShowHideSidebarButton(title){this._showHideSidebarButtonTitle=title;this._showHideSidebarButton=new UI.ToolbarButton('','');this._showHideSidebarButton.addEventListener(UI.ToolbarButton.Events.Click,buttonClicked,this);this._updateShowHideSidebarButton();function buttonClicked(event){if(this._showMode!==ShowMode.Both){this.showBoth(true);}else{this.hideSidebar(true);}}
return this._showHideSidebarButton;}
_updateShowHideSidebarButton(){if(!this._showHideSidebarButton){return;}
const sidebarHidden=this._showMode===ShowMode.OnlyMain;let glyph='';if(sidebarHidden){glyph=this.isVertical()?(this.isSidebarSecond()?'largeicon-show-right-sidebar':'largeicon-show-left-sidebar'):(this.isSidebarSecond()?'largeicon-show-bottom-sidebar':'largeicon-show-top-sidebar');}else{glyph=this.isVertical()?(this.isSidebarSecond()?'largeicon-hide-right-sidebar':'largeicon-hide-left-sidebar'):(this.isSidebarSecond()?'largeicon-hide-bottom-sidebar':'largeicon-hide-top-sidebar');}
this._showHideSidebarButton.setGlyph(glyph);this._showHideSidebarButton.setTitle(sidebarHidden?Common.UIString('Show %s',this._showHideSidebarButtonTitle):Common.UIString('Hide %s',this._showHideSidebarButtonTitle));}}
export const ShowMode={Both:'Both',OnlyMain:'OnlyMain',OnlySidebar:'OnlySidebar'};export const Events={SidebarSizeChanged:Symbol('SidebarSizeChanged'),ShowModeChanged:Symbol('ShowModeChanged')};export const MinPadding=20;self.UI=self.UI||{};UI=UI||{};UI.SplitWidget=SplitWidget;UI.SplitWidget.ShowMode=ShowMode;UI.SplitWidget.MinPadding=MinPadding;UI.SplitWidget.Events=Events;UI.SplitWidget.SettingForOrientation;