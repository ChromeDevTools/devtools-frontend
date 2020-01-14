Elements.InspectElementModeController=class{constructor(){this._toggleSearchAction=UI.actionRegistry.action('elements.toggle-element-search');this._mode=Protocol.Overlay.InspectMode.None;SDK.targetManager.addEventListener(SDK.TargetManager.Events.SuspendStateChanged,this._suspendStateChanged,this);SDK.targetManager.addModelListener(SDK.OverlayModel,SDK.OverlayModel.Events.ExitedInspectMode,()=>this._setMode(Protocol.Overlay.InspectMode.None));SDK.OverlayModel.setInspectNodeHandler(this._inspectNode.bind(this));SDK.targetManager.observeModels(SDK.OverlayModel,this);this._showDetailedInspectTooltipSetting=Common.settings.moduleSetting('showDetailedInspectTooltip');this._showDetailedInspectTooltipSetting.addChangeListener(this._showDetailedInspectTooltipChanged.bind(this));document.addEventListener('keydown',event=>{if(event.keyCode!==UI.KeyboardShortcut.Keys.Esc.code){return;}
if(!this._isInInspectElementMode()){return;}
this._setMode(Protocol.Overlay.InspectMode.None);event.consume(true);},true);}
modelAdded(overlayModel){if(this._mode===Protocol.Overlay.InspectMode.None){return;}
overlayModel.setInspectMode(this._mode,this._showDetailedInspectTooltipSetting.get());}
modelRemoved(overlayModel){}
_isInInspectElementMode(){return this._mode!==Protocol.Overlay.InspectMode.None;}
_toggleInspectMode(){let mode;if(this._isInInspectElementMode()){mode=Protocol.Overlay.InspectMode.None;}else{mode=Common.moduleSetting('showUAShadowDOM').get()?Protocol.Overlay.InspectMode.SearchForUAShadowDOM:Protocol.Overlay.InspectMode.SearchForNode;}
this._setMode(mode);}
_captureScreenshotMode(){this._setMode(Protocol.Overlay.InspectMode.CaptureAreaScreenshot);}
_setMode(mode){if(SDK.targetManager.allTargetsSuspended()){return;}
this._mode=mode;for(const overlayModel of SDK.targetManager.models(SDK.OverlayModel)){overlayModel.setInspectMode(mode,this._showDetailedInspectTooltipSetting.get());}
this._toggleSearchAction.setToggled(this._isInInspectElementMode());}
_suspendStateChanged(){if(!SDK.targetManager.allTargetsSuspended()){return;}
this._mode=Protocol.Overlay.InspectMode.None;this._toggleSearchAction.setToggled(false);}
async _inspectNode(node){Elements.ElementsPanel.instance().revealAndSelectNode(node,true,true);}
_showDetailedInspectTooltipChanged(){this._setMode(this._mode);}};Elements.InspectElementModeController.ToggleSearchActionDelegate=class{handleAction(context,actionId){if(!Elements.inspectElementModeController){return false;}
if(actionId==='elements.toggle-element-search'){Elements.inspectElementModeController._toggleInspectMode();}else if(actionId==='elements.capture-area-screenshot'){Elements.inspectElementModeController._captureScreenshotMode();}
return true;}};Elements.inspectElementModeController=Root.Runtime.queryParam('isSharedWorker')?null:new Elements.InspectElementModeController();;Elements.BezierPopoverIcon=class{constructor(treeElement,swatchPopoverHelper,swatch){this._treeElement=treeElement;this._swatchPopoverHelper=swatchPopoverHelper;this._swatch=swatch;this._swatch.iconElement().title=Common.UIString('Open cubic bezier editor.');this._swatch.iconElement().addEventListener('click',this._iconClick.bind(this),false);this._swatch.iconElement().addEventListener('mousedown',event=>event.consume(),false);this._boundBezierChanged=this._bezierChanged.bind(this);this._boundOnScroll=this._onScroll.bind(this);}
_iconClick(event){event.consume(true);if(this._swatchPopoverHelper.isShowing()){this._swatchPopoverHelper.hide(true);return;}
this._bezierEditor=new InlineEditor.BezierEditor();let cubicBezier=UI.Geometry.CubicBezier.parse(this._swatch.bezierText());if(!cubicBezier){cubicBezier=(UI.Geometry.CubicBezier.parse('linear'));}
this._bezierEditor.setBezier(cubicBezier);this._bezierEditor.addEventListener(InlineEditor.BezierEditor.Events.BezierChanged,this._boundBezierChanged);this._swatchPopoverHelper.show(this._bezierEditor,this._swatch.iconElement(),this._onPopoverHidden.bind(this));this._scrollerElement=this._swatch.enclosingNodeOrSelfWithClass('style-panes-wrapper');if(this._scrollerElement){this._scrollerElement.addEventListener('scroll',this._boundOnScroll,false);}
this._originalPropertyText=this._treeElement.property.propertyText;this._treeElement.parentPane().setEditingStyle(true);const uiLocation=Bindings.cssWorkspaceBinding.propertyUILocation(this._treeElement.property,false);if(uiLocation){Common.Revealer.reveal(uiLocation,true);}}
_bezierChanged(event){this._swatch.setBezierText((event.data));this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(),false);}
_onScroll(event){this._swatchPopoverHelper.reposition();}
_onPopoverHidden(commitEdit){if(this._scrollerElement){this._scrollerElement.removeEventListener('scroll',this._boundOnScroll,false);}
this._bezierEditor.removeEventListener(InlineEditor.BezierEditor.Events.BezierChanged,this._boundBezierChanged);delete this._bezierEditor;const propertyText=commitEdit?this._treeElement.renderedPropertyText():this._originalPropertyText;this._treeElement.applyStyleText(propertyText,true);this._treeElement.parentPane().setEditingStyle(false);delete this._originalPropertyText;}};Elements.ColorSwatchPopoverIcon=class{constructor(treeElement,swatchPopoverHelper,swatch){this._treeElement=treeElement;this._treeElement[Elements.ColorSwatchPopoverIcon._treeElementSymbol]=this;this._swatchPopoverHelper=swatchPopoverHelper;this._swatch=swatch;const shiftClickMessage=Common.UIString('Shift + Click to change color format.');this._swatch.iconElement().title=Common.UIString('Open color picker. %s',shiftClickMessage);this._swatch.iconElement().addEventListener('click',this._iconClick.bind(this));this._swatch.iconElement().addEventListener('mousedown',event=>event.consume(),false);this._contrastInfo=null;this._boundSpectrumChanged=this._spectrumChanged.bind(this);this._boundOnScroll=this._onScroll.bind(this);}
_generateCSSVariablesPalette(){const matchedStyles=this._treeElement.matchedStyles();const style=this._treeElement.property.ownerStyle;const cssVariables=matchedStyles.availableCSSVariables(style);const colors=[];const colorNames=[];for(const cssVariable of cssVariables){if(cssVariable===this._treeElement.property.name){continue;}
const value=matchedStyles.computeCSSVariable(style,cssVariable);if(!value){continue;}
const color=Common.Color.parse(value);if(!color){continue;}
colors.push(value);colorNames.push(cssVariable);}
return{title:'CSS Variables',mutable:false,matchUserFormat:true,colors:colors,colorNames:colorNames};}
static forTreeElement(treeElement){return treeElement[Elements.ColorSwatchPopoverIcon._treeElementSymbol]||null;}
setContrastInfo(contrastInfo){this._contrastInfo=contrastInfo;}
_iconClick(event){event.consume(true);this.showPopover();}
showPopover(){if(this._swatchPopoverHelper.isShowing()){this._swatchPopoverHelper.hide(true);return;}
const color=this._swatch.color();let format=this._swatch.format();if(format===Common.Color.Format.Original){format=color.format();}
this._spectrum=new ColorPicker.Spectrum(this._contrastInfo);this._spectrum.setColor(color,format);this._spectrum.addPalette(this._generateCSSVariablesPalette());this._spectrum.addEventListener(ColorPicker.Spectrum.Events.SizeChanged,this._spectrumResized,this);this._spectrum.addEventListener(ColorPicker.Spectrum.Events.ColorChanged,this._boundSpectrumChanged);this._swatchPopoverHelper.show(this._spectrum,this._swatch.iconElement(),this._onPopoverHidden.bind(this));this._scrollerElement=this._swatch.enclosingNodeOrSelfWithClass('style-panes-wrapper');if(this._scrollerElement){this._scrollerElement.addEventListener('scroll',this._boundOnScroll,false);}
this._originalPropertyText=this._treeElement.property.propertyText;this._treeElement.parentPane().setEditingStyle(true);const uiLocation=Bindings.cssWorkspaceBinding.propertyUILocation(this._treeElement.property,false);if(uiLocation){Common.Revealer.reveal(uiLocation,true);}}
_spectrumResized(event){this._swatchPopoverHelper.reposition();}
_spectrumChanged(event){const color=Common.Color.parse((event.data));if(!color){return;}
this._swatch.setColor(color);const colorName=this._spectrum.colorName();if(colorName&&colorName.startsWith('--')){this._swatch.setText(`var(${colorName})`);}
this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(),false);}
_onScroll(event){this._swatchPopoverHelper.reposition();}
_onPopoverHidden(commitEdit){if(this._scrollerElement){this._scrollerElement.removeEventListener('scroll',this._boundOnScroll,false);}
this._spectrum.removeEventListener(ColorPicker.Spectrum.Events.ColorChanged,this._boundSpectrumChanged);delete this._spectrum;const propertyText=commitEdit?this._treeElement.renderedPropertyText():this._originalPropertyText;this._treeElement.applyStyleText(propertyText,true);this._treeElement.parentPane().setEditingStyle(false);delete this._originalPropertyText;}};Elements.ColorSwatchPopoverIcon._treeElementSymbol=Symbol('Elements.ColorSwatchPopoverIcon._treeElementSymbol');Elements.ShadowSwatchPopoverHelper=class{constructor(treeElement,swatchPopoverHelper,shadowSwatch){this._treeElement=treeElement;this._treeElement[Elements.ShadowSwatchPopoverHelper._treeElementSymbol]=this;this._swatchPopoverHelper=swatchPopoverHelper;this._shadowSwatch=shadowSwatch;this._iconElement=shadowSwatch.iconElement();this._iconElement.title=Common.UIString('Open shadow editor.');this._iconElement.addEventListener('click',this._iconClick.bind(this),false);this._iconElement.addEventListener('mousedown',event=>event.consume(),false);this._boundShadowChanged=this._shadowChanged.bind(this);this._boundOnScroll=this._onScroll.bind(this);}
static forTreeElement(treeElement){return treeElement[Elements.ShadowSwatchPopoverHelper._treeElementSymbol]||null;}
_iconClick(event){event.consume(true);this.showPopover();}
showPopover(){if(this._swatchPopoverHelper.isShowing()){this._swatchPopoverHelper.hide(true);return;}
this._cssShadowEditor=new InlineEditor.CSSShadowEditor();this._cssShadowEditor.setModel(this._shadowSwatch.model());this._cssShadowEditor.addEventListener(InlineEditor.CSSShadowEditor.Events.ShadowChanged,this._boundShadowChanged);this._swatchPopoverHelper.show(this._cssShadowEditor,this._iconElement,this._onPopoverHidden.bind(this));this._scrollerElement=this._iconElement.enclosingNodeOrSelfWithClass('style-panes-wrapper');if(this._scrollerElement){this._scrollerElement.addEventListener('scroll',this._boundOnScroll,false);}
this._originalPropertyText=this._treeElement.property.propertyText;this._treeElement.parentPane().setEditingStyle(true);const uiLocation=Bindings.cssWorkspaceBinding.propertyUILocation(this._treeElement.property,false);if(uiLocation){Common.Revealer.reveal(uiLocation,true);}}
_shadowChanged(event){this._shadowSwatch.setCSSShadow((event.data));this._treeElement.applyStyleText(this._treeElement.renderedPropertyText(),false);}
_onScroll(event){this._swatchPopoverHelper.reposition();}
_onPopoverHidden(commitEdit){if(this._scrollerElement){this._scrollerElement.removeEventListener('scroll',this._boundOnScroll,false);}
this._cssShadowEditor.removeEventListener(InlineEditor.CSSShadowEditor.Events.ShadowChanged,this._boundShadowChanged);delete this._cssShadowEditor;const propertyText=commitEdit?this._treeElement.renderedPropertyText():this._originalPropertyText;this._treeElement.applyStyleText(propertyText,true);this._treeElement.parentPane().setEditingStyle(false);delete this._originalPropertyText;}};Elements.ShadowSwatchPopoverHelper._treeElementSymbol=Symbol('Elements.ShadowSwatchPopoverHelper._treeElementSymbol');;Elements.ComputedStyleModel=class extends Common.Object{constructor(){super();this._node=UI.context.flavor(SDK.DOMNode);this._cssModel=null;this._eventListeners=[];UI.context.addFlavorChangeListener(SDK.DOMNode,this._onNodeChanged,this);}
node(){return this._node;}
cssModel(){return this._cssModel&&this._cssModel.isEnabled()?this._cssModel:null;}
_onNodeChanged(event){this._node=(event.data);this._updateModel(this._node?this._node.domModel().cssModel():null);this._onComputedStyleChanged(null);}
_updateModel(cssModel){if(this._cssModel===cssModel){return;}
Common.EventTarget.removeEventListeners(this._eventListeners);this._cssModel=cssModel;const domModel=cssModel?cssModel.domModel():null;const resourceTreeModel=cssModel?cssModel.target().model(SDK.ResourceTreeModel):null;if(cssModel&&domModel&&resourceTreeModel){this._eventListeners=[cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded,this._onComputedStyleChanged,this),cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved,this._onComputedStyleChanged,this),cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged,this._onComputedStyleChanged,this),cssModel.addEventListener(SDK.CSSModel.Events.FontsUpdated,this._onComputedStyleChanged,this),cssModel.addEventListener(SDK.CSSModel.Events.MediaQueryResultChanged,this._onComputedStyleChanged,this),cssModel.addEventListener(SDK.CSSModel.Events.PseudoStateForced,this._onComputedStyleChanged,this),cssModel.addEventListener(SDK.CSSModel.Events.ModelWasEnabled,this._onComputedStyleChanged,this),domModel.addEventListener(SDK.DOMModel.Events.DOMMutated,this._onDOMModelChanged,this),resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameResized,this._onFrameResized,this),];}}
_onComputedStyleChanged(event){delete this._computedStylePromise;this.dispatchEventToListeners(Elements.ComputedStyleModel.Events.ComputedStyleChanged,event?event.data:null);}
_onDOMModelChanged(event){const node=(event.data);if(!this._node||this._node!==node&&node.parentNode!==this._node.parentNode&&!node.isAncestor(this._node)){return;}
this._onComputedStyleChanged(null);}
_onFrameResized(event){function refreshContents(){this._onComputedStyleChanged(null);delete this._frameResizedTimer;}
if(this._frameResizedTimer){clearTimeout(this._frameResizedTimer);}
this._frameResizedTimer=setTimeout(refreshContents.bind(this),100);}
_elementNode(){return this.node()?this.node().enclosingElementOrSelf():null;}
fetchComputedStyle(){const elementNode=this._elementNode();const cssModel=this.cssModel();if(!elementNode||!cssModel){return Promise.resolve((null));}
if(!this._computedStylePromise){this._computedStylePromise=cssModel.computedStylePromise(elementNode.id).then(verifyOutdated.bind(this,elementNode));}
return this._computedStylePromise;function verifyOutdated(elementNode,style){return elementNode===this._elementNode()&&style?new Elements.ComputedStyleModel.ComputedStyle(elementNode,style):(null);}}};Elements.ComputedStyleModel.Events={ComputedStyleChanged:Symbol('ComputedStyleChanged')};Elements.ComputedStyleModel.ComputedStyle=class{constructor(node,computedStyle){this.node=node;this.computedStyle=computedStyle;}};;Elements.DOMLinkifier={};Elements.DOMLinkifier.decorateNodeLabel=function(node,parentElement,tooltipContent){const originalNode=node;const isPseudo=node.nodeType()===Node.ELEMENT_NODE&&node.pseudoType();if(isPseudo&&node.parentNode){node=node.parentNode;}
let title=node.nodeNameInCorrectCase();const nameElement=parentElement.createChild('span','node-label-name');nameElement.textContent=title;const idAttribute=node.getAttribute('id');if(idAttribute){const idElement=parentElement.createChild('span','node-label-id');const part='#'+idAttribute;title+=part;idElement.createTextChild(part);nameElement.classList.add('extra');}
const classAttribute=node.getAttribute('class');if(classAttribute){const classes=classAttribute.split(/\s+/);const foundClasses={};if(classes.length){const classesElement=parentElement.createChild('span','extra node-label-class');for(let i=0;i<classes.length;++i){const className=classes[i];if(className&&!(className in foundClasses)){const part='.'+className;title+=part;classesElement.createTextChild(part);foundClasses[className]=true;}}}}
if(isPseudo){const pseudoElement=parentElement.createChild('span','extra node-label-pseudo');const pseudoText='::'+originalNode.pseudoType();pseudoElement.createTextChild(pseudoText);title+=pseudoText;}
parentElement.title=tooltipContent||title;};Elements.DOMLinkifier.linkifyNodeReference=function(node,options={}){if(!node){return createTextNode(Common.UIString('<node>'));}
const root=createElementWithClass('span','monospace');const shadowRoot=UI.createShadowRootWithCoreStyles(root,'elements/domLinkifier.css');const link=shadowRoot.createChild('div','node-link');Elements.DOMLinkifier.decorateNodeLabel(node,link,options.tooltip);link.addEventListener('click',()=>Common.Revealer.reveal(node,false)&&false,false);link.addEventListener('mouseover',node.highlight.bind(node,undefined),false);link.addEventListener('mouseleave',()=>SDK.OverlayModel.hideDOMNodeHighlight(),false);if(!options.preventKeyboardFocus){link.addEventListener('keydown',event=>isEnterKey(event)&&Common.Revealer.reveal(node,false)&&false);link.tabIndex=0;UI.ARIAUtils.markAsLink(link);}
return root;};Elements.DOMLinkifier.linkifyDeferredNodeReference=function(deferredNode,options={}){const root=createElement('div');const shadowRoot=UI.createShadowRootWithCoreStyles(root,'elements/domLinkifier.css');const link=shadowRoot.createChild('div','node-link');link.createChild('slot');link.addEventListener('click',deferredNode.resolve.bind(deferredNode,onDeferredNodeResolved),false);link.addEventListener('mousedown',e=>e.consume(),false);if(!options.preventKeyboardFocus){link.addEventListener('keydown',event=>isEnterKey(event)&&deferredNode.resolve(onDeferredNodeResolved));link.tabIndex=0;UI.ARIAUtils.markAsLink(link);}
function onDeferredNodeResolved(node){Common.Revealer.reveal(node);}
return root;};Elements.DOMLinkifier.Linkifier=class{linkify(object,options){if(object instanceof SDK.DOMNode){return Elements.DOMLinkifier.linkifyNodeReference(object,options);}
if(object instanceof SDK.DeferredDOMNode){return Elements.DOMLinkifier.linkifyDeferredNodeReference(object,options);}
throw new Error('Can\'t linkify non-node');}};;Elements.DOMPath={};Elements.DOMPath.fullQualifiedSelector=function(node,justSelector){if(node.nodeType()!==Node.ELEMENT_NODE){return node.localName()||node.nodeName().toLowerCase();}
return Elements.DOMPath.cssPath(node,justSelector);};Elements.DOMPath.cssPath=function(node,optimized){if(node.nodeType()!==Node.ELEMENT_NODE){return'';}
const steps=[];let contextNode=node;while(contextNode){const step=Elements.DOMPath._cssPathStep(contextNode,!!optimized,contextNode===node);if(!step){break;}
steps.push(step);if(step.optimized){break;}
contextNode=contextNode.parentNode;}
steps.reverse();return steps.join(' > ');};Elements.DOMPath.canGetJSPath=function(node){let wp=node;while(wp){if(wp.ancestorShadowRoot()&&wp.ancestorShadowRoot().shadowRootType()!==SDK.DOMNode.ShadowRootTypes.Open){return false;}
wp=wp.ancestorShadowHost();}
return true;};Elements.DOMPath.jsPath=function(node,optimized){if(node.nodeType()!==Node.ELEMENT_NODE){return'';}
const path=[];let wp=node;while(wp){path.push(Elements.DOMPath.cssPath(wp,optimized));wp=wp.ancestorShadowHost();}
path.reverse();let result='';for(let i=0;i<path.length;++i){const string=JSON.stringify(path[i]);if(i){result+=`.shadowRoot.querySelector(${string})`;}else{result+=`document.querySelector(${string})`;}}
return result;};Elements.DOMPath._cssPathStep=function(node,optimized,isTargetNode){if(node.nodeType()!==Node.ELEMENT_NODE){return null;}
const id=node.getAttribute('id');if(optimized){if(id){return new Elements.DOMPath.Step(idSelector(id),true);}
const nodeNameLower=node.nodeName().toLowerCase();if(nodeNameLower==='body'||nodeNameLower==='head'||nodeNameLower==='html'){return new Elements.DOMPath.Step(node.nodeNameInCorrectCase(),true);}}
const nodeName=node.nodeNameInCorrectCase();if(id){return new Elements.DOMPath.Step(nodeName+idSelector(id),true);}
const parent=node.parentNode;if(!parent||parent.nodeType()===Node.DOCUMENT_NODE){return new Elements.DOMPath.Step(nodeName,true);}
function prefixedElementClassNames(node){const classAttribute=node.getAttribute('class');if(!classAttribute){return[];}
return classAttribute.split(/\s+/g).filter(Boolean).map(function(name){return'$'+name;});}
function idSelector(id){return'#'+CSS.escape(id);}
const prefixedOwnClassNamesArray=prefixedElementClassNames(node);let needsClassNames=false;let needsNthChild=false;let ownIndex=-1;let elementIndex=-1;const siblings=parent.children();for(let i=0;(ownIndex===-1||!needsNthChild)&&i<siblings.length;++i){const sibling=siblings[i];if(sibling.nodeType()!==Node.ELEMENT_NODE){continue;}
elementIndex+=1;if(sibling===node){ownIndex=elementIndex;continue;}
if(needsNthChild){continue;}
if(sibling.nodeNameInCorrectCase()!==nodeName){continue;}
needsClassNames=true;const ownClassNames=new Set(prefixedOwnClassNamesArray);if(!ownClassNames.size){needsNthChild=true;continue;}
const siblingClassNamesArray=prefixedElementClassNames(sibling);for(let j=0;j<siblingClassNamesArray.length;++j){const siblingClass=siblingClassNamesArray[j];if(!ownClassNames.has(siblingClass)){continue;}
ownClassNames.delete(siblingClass);if(!ownClassNames.size){needsNthChild=true;break;}}}
let result=nodeName;if(isTargetNode&&nodeName.toLowerCase()==='input'&&node.getAttribute('type')&&!node.getAttribute('id')&&!node.getAttribute('class')){result+='[type='+CSS.escape(node.getAttribute('type'))+']';}
if(needsNthChild){result+=':nth-child('+(ownIndex+1)+')';}else if(needsClassNames){for(const prefixedName of prefixedOwnClassNamesArray){result+='.'+CSS.escape(prefixedName.slice(1));}}
return new Elements.DOMPath.Step(result,false);};Elements.DOMPath.xPath=function(node,optimized){if(node.nodeType()===Node.DOCUMENT_NODE){return'/';}
const steps=[];let contextNode=node;while(contextNode){const step=Elements.DOMPath._xPathValue(contextNode,optimized);if(!step){break;}
steps.push(step);if(step.optimized){break;}
contextNode=contextNode.parentNode;}
steps.reverse();return(steps.length&&steps[0].optimized?'':'/')+steps.join('/');};Elements.DOMPath._xPathValue=function(node,optimized){let ownValue;const ownIndex=Elements.DOMPath._xPathIndex(node);if(ownIndex===-1){return null;}
switch(node.nodeType()){case Node.ELEMENT_NODE:if(optimized&&node.getAttribute('id')){return new Elements.DOMPath.Step('//*[@id="'+node.getAttribute('id')+'"]',true);}
ownValue=node.localName();break;case Node.ATTRIBUTE_NODE:ownValue='@'+node.nodeName();break;case Node.TEXT_NODE:case Node.CDATA_SECTION_NODE:ownValue='text()';break;case Node.PROCESSING_INSTRUCTION_NODE:ownValue='processing-instruction()';break;case Node.COMMENT_NODE:ownValue='comment()';break;case Node.DOCUMENT_NODE:ownValue='';break;default:ownValue='';break;}
if(ownIndex>0){ownValue+='['+ownIndex+']';}
return new Elements.DOMPath.Step(ownValue,node.nodeType()===Node.DOCUMENT_NODE);};Elements.DOMPath._xPathIndex=function(node){function areNodesSimilar(left,right){if(left===right){return true;}
if(left.nodeType()===Node.ELEMENT_NODE&&right.nodeType()===Node.ELEMENT_NODE){return left.localName()===right.localName();}
if(left.nodeType()===right.nodeType()){return true;}
const leftType=left.nodeType()===Node.CDATA_SECTION_NODE?Node.TEXT_NODE:left.nodeType();const rightType=right.nodeType()===Node.CDATA_SECTION_NODE?Node.TEXT_NODE:right.nodeType();return leftType===rightType;}
const siblings=node.parentNode?node.parentNode.children():null;if(!siblings){return 0;}
let hasSameNamedElements;for(let i=0;i<siblings.length;++i){if(areNodesSimilar(node,siblings[i])&&siblings[i]!==node){hasSameNamedElements=true;break;}}
if(!hasSameNamedElements){return 0;}
let ownIndex=1;for(let i=0;i<siblings.length;++i){if(areNodesSimilar(node,siblings[i])){if(siblings[i]===node){return ownIndex;}
++ownIndex;}}
return-1;};Elements.DOMPath.Step=class{constructor(value,optimized){this.value=value;this.optimized=optimized||false;}
toString(){return this.value;}};;Elements.ElementsBreadcrumbs=class extends UI.HBox{constructor(){super(true);this.registerRequiredCSS('elements/breadcrumbs.css');this.crumbsElement=this.contentElement.createChild('div','crumbs');this.crumbsElement.addEventListener('mousemove',this._mouseMovedInCrumbs.bind(this),false);this.crumbsElement.addEventListener('mouseleave',this._mouseMovedOutOfCrumbs.bind(this),false);this._nodeSymbol=Symbol('node');UI.ARIAUtils.markAsHidden(this.element);}
wasShown(){this.update();}
updateNodes(nodes){if(!nodes.length){return;}
const crumbs=this.crumbsElement;for(let crumb=crumbs.firstChild;crumb;crumb=crumb.nextSibling){if(nodes.indexOf(crumb[this._nodeSymbol])!==-1){this.update(true);return;}}}
setSelectedNode(node){this._currentDOMNode=node;this.crumbsElement.window().requestAnimationFrame(()=>this.update());}
_mouseMovedInCrumbs(event){const nodeUnderMouse=event.target;const crumbElement=nodeUnderMouse.enclosingNodeOrSelfWithClass('crumb');const node=(crumbElement?crumbElement[this._nodeSymbol]:null);if(node){node.highlight();}}
_mouseMovedOutOfCrumbs(event){if(this._currentDOMNode){SDK.OverlayModel.hideDOMNodeHighlight();}}
_onClickCrumb(event){event.preventDefault();let crumb=(event.currentTarget);if(!crumb.classList.contains('collapsed')){this.dispatchEventToListeners(Elements.ElementsBreadcrumbs.Events.NodeSelected,crumb[this._nodeSymbol]);return;}
if(crumb===this.crumbsElement.firstChild){let currentCrumb=crumb;while(currentCrumb){const hidden=currentCrumb.classList.contains('hidden');const collapsed=currentCrumb.classList.contains('collapsed');if(!hidden&&!collapsed){break;}
crumb=currentCrumb;currentCrumb=currentCrumb.nextSiblingElement;}}
this.updateSizes(crumb);}
_determineElementTitle(domNode){switch(domNode.nodeType()){case Node.ELEMENT_NODE:if(domNode.pseudoType()){return'::'+domNode.pseudoType();}
return null;case Node.TEXT_NODE:return Common.UIString('(text)');case Node.COMMENT_NODE:return'<!-->';case Node.DOCUMENT_TYPE_NODE:return'<!doctype>';case Node.DOCUMENT_FRAGMENT_NODE:return domNode.shadowRootType()?'#shadow-root':domNode.nodeNameInCorrectCase();default:return domNode.nodeNameInCorrectCase();}}
update(force){if(!this.isShowing()){return;}
const currentDOMNode=this._currentDOMNode;const crumbs=this.crumbsElement;let handled=false;let crumb=crumbs.firstChild;while(crumb){if(crumb[this._nodeSymbol]===currentDOMNode){crumb.classList.add('selected');handled=true;}else{crumb.classList.remove('selected');}
crumb=crumb.nextSibling;}
if(handled&&!force){this.updateSizes();return;}
crumbs.removeChildren();for(let current=currentDOMNode;current;current=current.parentNode){if(current.nodeType()===Node.DOCUMENT_NODE){continue;}
crumb=createElementWithClass('span','crumb');crumb[this._nodeSymbol]=current;crumb.addEventListener('mousedown',this._onClickCrumb.bind(this),false);const crumbTitle=this._determineElementTitle(current);if(crumbTitle){const nameElement=createElement('span');nameElement.textContent=crumbTitle;crumb.appendChild(nameElement);crumb.title=crumbTitle;}else{Elements.DOMLinkifier.decorateNodeLabel(current,crumb);}
if(current===currentDOMNode){crumb.classList.add('selected');}
crumbs.insertBefore(crumb,crumbs.firstChild);}
this.updateSizes();}
_resetCrumbStylesAndFindSelections(focusedCrumb){const crumbs=this.crumbsElement;let selectedIndex=0;let focusedIndex=0;let selectedCrumb=null;for(let i=0;i<crumbs.childNodes.length;++i){const crumb=crumbs.children[i];if(!selectedCrumb&&crumb.classList.contains('selected')){selectedCrumb=crumb;selectedIndex=i;}
if(crumb===focusedCrumb){focusedIndex=i;}
crumb.classList.remove('compact','collapsed','hidden');}
return{selectedIndex:selectedIndex,focusedIndex:focusedIndex,selectedCrumb:selectedCrumb};}
_measureElementSizes(){const crumbs=this.crumbsElement;const collapsedElement=createElementWithClass('span','crumb collapsed');crumbs.insertBefore(collapsedElement,crumbs.firstChild);const available=crumbs.offsetWidth;const collapsed=collapsedElement.offsetWidth;const normalSizes=[];for(let i=1;i<crumbs.childNodes.length;++i){const crumb=crumbs.childNodes[i];normalSizes[i-1]=crumb.offsetWidth;}
crumbs.removeChild(collapsedElement);const compactSizes=[];for(let i=0;i<crumbs.childNodes.length;++i){const crumb=crumbs.childNodes[i];crumb.classList.add('compact');}
for(let i=0;i<crumbs.childNodes.length;++i){const crumb=crumbs.childNodes[i];compactSizes[i]=crumb.offsetWidth;}
for(let i=0;i<crumbs.childNodes.length;++i){const crumb=crumbs.childNodes[i];crumb.classList.remove('compact','collapsed');}
return{normal:normalSizes,compact:compactSizes,collapsed:collapsed,available:available};}
updateSizes(focusedCrumb){if(!this.isShowing()){return;}
const crumbs=this.crumbsElement;if(!crumbs.firstChild){return;}
const selections=this._resetCrumbStylesAndFindSelections(focusedCrumb);const sizes=this._measureElementSizes();const selectedIndex=selections.selectedIndex;const focusedIndex=selections.focusedIndex;const selectedCrumb=selections.selectedCrumb;function crumbsAreSmallerThanContainer(){let totalSize=0;for(let i=0;i<crumbs.childNodes.length;++i){const crumb=crumbs.childNodes[i];if(crumb.classList.contains('hidden')){continue;}
if(crumb.classList.contains('collapsed')){totalSize+=sizes.collapsed;continue;}
totalSize+=crumb.classList.contains('compact')?sizes.compact[i]:sizes.normal[i];}
const rightPadding=10;return totalSize+rightPadding<sizes.available;}
if(crumbsAreSmallerThanContainer()){return;}
const BothSides=0;const AncestorSide=-1;const ChildSide=1;function makeCrumbsSmaller(shrinkingFunction,direction){const significantCrumb=focusedCrumb||selectedCrumb;const significantIndex=significantCrumb===selectedCrumb?selectedIndex:focusedIndex;function shrinkCrumbAtIndex(index){const shrinkCrumb=crumbs.children[index];if(shrinkCrumb&&shrinkCrumb!==significantCrumb){shrinkingFunction(shrinkCrumb);}
if(crumbsAreSmallerThanContainer()){return true;}
return false;}
if(direction){let index=(direction>0?0:crumbs.childNodes.length-1);while(index!==significantIndex){if(shrinkCrumbAtIndex(index)){return true;}
index+=(direction>0?1:-1);}}else{let startIndex=0;let endIndex=crumbs.childNodes.length-1;while(startIndex!==significantIndex||endIndex!==significantIndex){const startDistance=significantIndex-startIndex;const endDistance=endIndex-significantIndex;let index;if(startDistance>=endDistance){index=startIndex++;}else{index=endIndex--;}
if(shrinkCrumbAtIndex(index)){return true;}}}
return false;}
function coalesceCollapsedCrumbs(){let crumb=crumbs.firstChild;let collapsedRun=false;let newStartNeeded=false;let newEndNeeded=false;while(crumb){const hidden=crumb.classList.contains('hidden');if(!hidden){const collapsed=crumb.classList.contains('collapsed');if(collapsedRun&&collapsed){crumb.classList.add('hidden');crumb.classList.remove('compact');crumb.classList.remove('collapsed');if(crumb.classList.contains('start')){crumb.classList.remove('start');newStartNeeded=true;}
if(crumb.classList.contains('end')){crumb.classList.remove('end');newEndNeeded=true;}
continue;}
collapsedRun=collapsed;if(newEndNeeded){newEndNeeded=false;crumb.classList.add('end');}}else{collapsedRun=true;}
crumb=crumb.nextSibling;}
if(newStartNeeded){crumb=crumbs.lastChild;while(crumb){if(!crumb.classList.contains('hidden')){crumb.classList.add('start');break;}
crumb=crumb.previousSibling;}}}
function compact(crumb){if(crumb.classList.contains('hidden')){return;}
crumb.classList.add('compact');}
function collapse(crumb,dontCoalesce){if(crumb.classList.contains('hidden')){return;}
crumb.classList.add('collapsed');crumb.classList.remove('compact');if(!dontCoalesce){coalesceCollapsedCrumbs();}}
if(!focusedCrumb){if(makeCrumbsSmaller(compact,ChildSide)){return;}
if(makeCrumbsSmaller(collapse,ChildSide)){return;}}
if(makeCrumbsSmaller(compact,focusedCrumb?BothSides:AncestorSide)){return;}
if(makeCrumbsSmaller(collapse,focusedCrumb?BothSides:AncestorSide)){return;}
if(!selectedCrumb){return;}
compact(selectedCrumb);if(crumbsAreSmallerThanContainer()){return;}
collapse(selectedCrumb,true);}};Elements.ElementsBreadcrumbs.Events={NodeSelected:Symbol('NodeSelected')};;Elements.ElementsSidebarPane=class extends UI.VBox{constructor(delegatesFocus){super(true,delegatesFocus);this.element.classList.add('flex-none');this._computedStyleModel=new Elements.ComputedStyleModel();this._computedStyleModel.addEventListener(Elements.ComputedStyleModel.Events.ComputedStyleChanged,this.onCSSModelChanged,this);this._updateThrottler=new Common.Throttler(100);this._updateWhenVisible=false;}
node(){return this._computedStyleModel.node();}
cssModel(){return this._computedStyleModel.cssModel();}
doUpdate(){return Promise.resolve();}
update(){this._updateWhenVisible=!this.isShowing();if(this._updateWhenVisible){return;}
this._updateThrottler.schedule(innerUpdate.bind(this));function innerUpdate(){return this.isShowing()?this.doUpdate():Promise.resolve();}}
wasShown(){super.wasShown();if(this._updateWhenVisible){this.update();}}
onCSSModelChanged(event){}};;Elements.ElementsTreeElement=class extends UI.TreeElement{constructor(node,elementCloseTag){super();this._node=node;this._gutterContainer=this.listItemElement.createChild('div','gutter-container');this._gutterContainer.addEventListener('click',this._showContextMenu.bind(this));const gutterMenuIcon=UI.Icon.create('largeicon-menu','gutter-menu-icon');this._gutterContainer.appendChild(gutterMenuIcon);this._decorationsElement=this._gutterContainer.createChild('div','hidden');this._elementCloseTag=elementCloseTag;if(this._node.nodeType()===Node.ELEMENT_NODE&&!elementCloseTag){this._canAddAttributes=true;}
this._searchQuery=null;this._expandedChildrenLimit=Elements.ElementsTreeElement.InitialChildrenLimit;this._decorationsThrottler=new Common.Throttler(100);}
static animateOnDOMUpdate(treeElement){const tagName=treeElement.listItemElement.querySelector('.webkit-html-tag-name');UI.runCSSAnimationOnce(tagName||treeElement.listItemElement,'dom-update-highlight');}
static visibleShadowRoots(node){let roots=node.shadowRoots();if(roots.length&&!Common.moduleSetting('showUAShadowDOM').get()){roots=roots.filter(filter);}
function filter(root){return root.shadowRootType()!==SDK.DOMNode.ShadowRootTypes.UserAgent;}
return roots;}
static canShowInlineText(node){if(node.contentDocument()||node.importedDocument()||node.templateContent()||Elements.ElementsTreeElement.visibleShadowRoots(node).length||node.hasPseudoElements()){return false;}
if(node.nodeType()!==Node.ELEMENT_NODE){return false;}
if(!node.firstChild||node.firstChild!==node.lastChild||node.firstChild.nodeType()!==Node.TEXT_NODE){return false;}
const textChild=node.firstChild;const maxInlineTextChildLength=80;if(textChild.nodeValue().length<maxInlineTextChildLength){return true;}
return false;}
static populateForcedPseudoStateItems(contextMenu,node){const pseudoClasses=['active','hover','focus','visited','focus-within'];try{document.querySelector(':focus-visible');pseudoClasses.push('focus-visible');}catch(e){}
const forcedPseudoState=node.domModel().cssModel().pseudoState(node);const stateMenu=contextMenu.debugSection().appendSubMenuItem(Common.UIString('Force state'));for(let i=0;i<pseudoClasses.length;++i){const pseudoClassForced=forcedPseudoState.indexOf(pseudoClasses[i])>=0;stateMenu.defaultSection().appendCheckboxItem(':'+pseudoClasses[i],setPseudoStateCallback.bind(null,pseudoClasses[i],!pseudoClassForced),pseudoClassForced,false);}
function setPseudoStateCallback(pseudoState,enabled){node.domModel().cssModel().forcePseudoState(node,pseudoState,enabled);}}
isClosingTag(){return!!this._elementCloseTag;}
node(){return this._node;}
isEditing(){return!!this._editing;}
highlightSearchResults(searchQuery){if(this._searchQuery!==searchQuery){this._hideSearchHighlight();}
this._searchQuery=searchQuery;this._searchHighlightsVisible=true;this.updateTitle(null,true);}
hideSearchHighlights(){delete this._searchHighlightsVisible;this._hideSearchHighlight();}
_hideSearchHighlight(){if(!this._highlightResult){return;}
function updateEntryHide(entry){switch(entry.type){case'added':entry.node.remove();break;case'changed':entry.node.textContent=entry.oldText;break;}}
for(let i=(this._highlightResult.length-1);i>=0;--i){updateEntryHide(this._highlightResult[i]);}
delete this._highlightResult;}
setInClipboard(inClipboard){if(this._inClipboard===inClipboard){return;}
this._inClipboard=inClipboard;this.listItemElement.classList.toggle('in-clipboard',inClipboard);}
get hovered(){return this._hovered;}
set hovered(x){if(this._hovered===x){return;}
this._hovered=x;if(this.listItemElement){if(x){this._createSelection();this.listItemElement.classList.add('hovered');}else{this.listItemElement.classList.remove('hovered');}}}
expandedChildrenLimit(){return this._expandedChildrenLimit;}
setExpandedChildrenLimit(expandedChildrenLimit){this._expandedChildrenLimit=expandedChildrenLimit;}
_createSelection(){const listItemElement=this.listItemElement;if(!listItemElement){return;}
if(!this.selectionElement){this.selectionElement=createElement('div');this.selectionElement.className='selection fill';this.selectionElement.style.setProperty('margin-left',(-this._computeLeftIndent())+'px');listItemElement.insertBefore(this.selectionElement,listItemElement.firstChild);}}
_createHint(){if(this.listItemElement&&!this._hintElement){this._hintElement=this.listItemElement.createChild('span','selected-hint');const selectedElementCommand='$0';this._hintElement.title=ls`Use ${selectedElementCommand} in the console to refer to this element.`;UI.ARIAUtils.markAsHidden(this._hintElement);}}
onbind(){if(!this._elementCloseTag){this._node[this.treeOutline.treeElementSymbol()]=this;}}
onunbind(){if(this._node[this.treeOutline.treeElementSymbol()]===this){this._node[this.treeOutline.treeElementSymbol()]=null;}}
onattach(){if(this._hovered){this._createSelection();this.listItemElement.classList.add('hovered');}
this.updateTitle();this.listItemElement.draggable=true;}
async onpopulate(){return this.treeOutline.populateTreeElement(this);}
async expandRecursively(){await this._node.getSubtree(-1,true);await super.expandRecursively(Number.MAX_VALUE);}
onexpand(){if(this._elementCloseTag){return;}
this.updateTitle();}
oncollapse(){if(this._elementCloseTag){return;}
this.updateTitle();}
select(omitFocus,selectedByUser){if(this._editing){return false;}
return super.select(omitFocus,selectedByUser);}
onselect(selectedByUser){this.treeOutline.suppressRevealAndSelect=true;this.treeOutline.selectDOMNode(this._node,selectedByUser);if(selectedByUser){this._node.highlight();Host.userMetrics.actionTaken(Host.UserMetrics.Action.ChangeInspectedNodeInElementsPanel);}
this._createSelection();this._createHint();this.treeOutline.suppressRevealAndSelect=false;return true;}
ondelete(){const startTagTreeElement=this.treeOutline.findTreeElement(this._node);startTagTreeElement?startTagTreeElement.remove():this.remove();return true;}
onenter(){if(this._editing){return false;}
this._startEditing();return true;}
selectOnMouseDown(event){super.selectOnMouseDown(event);if(this._editing){return;}
if(event.detail>=2){event.preventDefault();}}
ondblclick(event){if(this._editing||this._elementCloseTag){return false;}
if(this._startEditingTarget((event.target))){return false;}
if(this.isExpandable()&&!this.expanded){this.expand();}
return false;}
hasEditableNode(){return!this._node.isShadowRoot()&&!this._node.ancestorUserAgentShadowRoot();}
_insertInLastAttributePosition(tag,node){if(tag.getElementsByClassName('webkit-html-attribute').length>0){tag.insertBefore(node,tag.lastChild);}else{const nodeName=tag.textContent.match(/^<(.*?)>$/)[1];tag.textContent='';tag.createTextChild('<'+nodeName);tag.appendChild(node);tag.createTextChild('>');}}
_startEditingTarget(eventTarget){if(this.treeOutline.selectedDOMNode()!==this._node){return false;}
if(this._node.nodeType()!==Node.ELEMENT_NODE&&this._node.nodeType()!==Node.TEXT_NODE){return false;}
const textNode=eventTarget.enclosingNodeOrSelfWithClass('webkit-html-text-node');if(textNode){return this._startEditingTextNode(textNode);}
const attribute=eventTarget.enclosingNodeOrSelfWithClass('webkit-html-attribute');if(attribute){return this._startEditingAttribute(attribute,eventTarget);}
const tagName=eventTarget.enclosingNodeOrSelfWithClass('webkit-html-tag-name');if(tagName){return this._startEditingTagName(tagName);}
const newAttribute=eventTarget.enclosingNodeOrSelfWithClass('add-attribute');if(newAttribute){return this._addNewAttribute();}
return false;}
_showContextMenu(event){this.treeOutline.showContextMenu(this,event);}
populateTagContextMenu(contextMenu,event){const treeElement=this._elementCloseTag?this.treeOutline.findTreeElement(this._node):this;contextMenu.editSection().appendItem(Common.UIString('Add attribute'),treeElement._addNewAttribute.bind(treeElement));const attribute=event.target.enclosingNodeOrSelfWithClass('webkit-html-attribute');const newAttribute=event.target.enclosingNodeOrSelfWithClass('add-attribute');if(attribute&&!newAttribute){contextMenu.editSection().appendItem(Common.UIString('Edit attribute'),this._startEditingAttribute.bind(this,attribute,event.target));}
this.populateNodeContextMenu(contextMenu);Elements.ElementsTreeElement.populateForcedPseudoStateItems(contextMenu,treeElement.node());this.populateScrollIntoView(contextMenu);contextMenu.viewSection().appendItem(Common.UIString('Focus'),async()=>{await this._node.focus();});}
populateScrollIntoView(contextMenu){contextMenu.viewSection().appendItem(Common.UIString('Scroll into view'),()=>this._node.scrollIntoView());}
populateTextContextMenu(contextMenu,textNode){if(!this._editing){contextMenu.editSection().appendItem(Common.UIString('Edit text'),this._startEditingTextNode.bind(this,textNode));}
this.populateNodeContextMenu(contextMenu);}
populateNodeContextMenu(contextMenu){const isEditable=this.hasEditableNode();if(isEditable&&!this._editing){contextMenu.editSection().appendItem(Common.UIString('Edit as HTML'),this._editAsHTML.bind(this));}
const isShadowRoot=this._node.isShadowRoot();const copyMenu=contextMenu.clipboardSection().appendSubMenuItem(Common.UIString('Copy'));const createShortcut=UI.KeyboardShortcut.shortcutToString.bind(null);const modifier=UI.KeyboardShortcut.Modifiers.CtrlOrMeta;const treeOutline=this.treeOutline;let menuItem;let section;if(!isShadowRoot){section=copyMenu.section();menuItem=section.appendItem(Common.UIString('Copy outerHTML'),treeOutline.performCopyOrCut.bind(treeOutline,false,this._node));menuItem.setShortcut(createShortcut('V',modifier));}
if(this._node.nodeType()===Node.ELEMENT_NODE){section.appendItem(Common.UIString('Copy selector'),this._copyCSSPath.bind(this));section.appendItem(Common.UIString('Copy JS path'),this._copyJSPath.bind(this),!Elements.DOMPath.canGetJSPath(this._node));section.appendItem(ls`Copy styles`,this._copyStyles.bind(this));}
if(!isShadowRoot){section.appendItem(Common.UIString('Copy XPath'),this._copyXPath.bind(this));section.appendItem(ls`Copy full XPath`,this._copyFullXPath.bind(this));}
if(!isShadowRoot){menuItem=copyMenu.clipboardSection().appendItem(Common.UIString('Cut element'),treeOutline.performCopyOrCut.bind(treeOutline,true,this._node),!this.hasEditableNode());menuItem.setShortcut(createShortcut('X',modifier));menuItem=copyMenu.clipboardSection().appendItem(Common.UIString('Copy element'),treeOutline.performCopyOrCut.bind(treeOutline,false,this._node));menuItem.setShortcut(createShortcut('C',modifier));menuItem=copyMenu.clipboardSection().appendItem(Common.UIString('Paste element'),treeOutline.pasteNode.bind(treeOutline,this._node),!treeOutline.canPaste(this._node));menuItem.setShortcut(createShortcut('V',modifier));}
menuItem=contextMenu.debugSection().appendCheckboxItem(Common.UIString('Hide element'),treeOutline.toggleHideElement.bind(treeOutline,this._node),treeOutline.isToggledToHidden(this._node));menuItem.setShortcut(UI.shortcutRegistry.shortcutTitleForAction('elements.hide-element'));if(isEditable){contextMenu.editSection().appendItem(Common.UIString('Delete element'),this.remove.bind(this));}
contextMenu.viewSection().appendItem(ls`Expand recursively`,this.expandRecursively.bind(this));contextMenu.viewSection().appendItem(ls`Collapse children`,this.collapseChildren.bind(this));}
_startEditing(){if(this.treeOutline.selectedDOMNode()!==this._node){return;}
const listItem=this.listItemElement;if(this._canAddAttributes){const attribute=listItem.getElementsByClassName('webkit-html-attribute')[0];if(attribute){return this._startEditingAttribute(attribute,attribute.getElementsByClassName('webkit-html-attribute-value')[0]);}
return this._addNewAttribute();}
if(this._node.nodeType()===Node.TEXT_NODE){const textNode=listItem.getElementsByClassName('webkit-html-text-node')[0];if(textNode){return this._startEditingTextNode(textNode);}
return;}}
_addNewAttribute(){const container=createElement('span');this._buildAttributeDOM(container,' ','',null);const attr=container.firstElementChild;attr.style.marginLeft='2px';attr.style.marginRight='2px';const tag=this.listItemElement.getElementsByClassName('webkit-html-tag')[0];this._insertInLastAttributePosition(tag,attr);attr.scrollIntoViewIfNeeded(true);return this._startEditingAttribute(attr,attr);}
_triggerEditAttribute(attributeName){const attributeElements=this.listItemElement.getElementsByClassName('webkit-html-attribute-name');for(let i=0,len=attributeElements.length;i<len;++i){if(attributeElements[i].textContent===attributeName){for(let elem=attributeElements[i].nextSibling;elem;elem=elem.nextSibling){if(elem.nodeType!==Node.ELEMENT_NODE){continue;}
if(elem.classList.contains('webkit-html-attribute-value')){return this._startEditingAttribute(elem.parentNode,elem);}}}}}
_startEditingAttribute(attribute,elementForSelection){console.assert(this.listItemElement.isAncestor(attribute));if(UI.isBeingEdited(attribute)){return true;}
const attributeNameElement=attribute.getElementsByClassName('webkit-html-attribute-name')[0];if(!attributeNameElement){return false;}
const attributeName=attributeNameElement.textContent;const attributeValueElement=attribute.getElementsByClassName('webkit-html-attribute-value')[0];elementForSelection=attributeValueElement.isAncestor(elementForSelection)?attributeValueElement:elementForSelection;function removeZeroWidthSpaceRecursive(node){if(node.nodeType===Node.TEXT_NODE){node.nodeValue=node.nodeValue.replace(/\u200B/g,'');return;}
if(node.nodeType!==Node.ELEMENT_NODE){return;}
for(let child=node.firstChild;child;child=child.nextSibling){removeZeroWidthSpaceRecursive(child);}}
const attributeValue=attributeName&&attributeValueElement?this._node.getAttribute(attributeName):undefined;if(attributeValue!==undefined){attributeValueElement.setTextContentTruncatedIfNeeded(attributeValue,Common.UIString('<value is too large to edit>'));}
removeZeroWidthSpaceRecursive(attribute);const config=new UI.InplaceEditor.Config(this._attributeEditingCommitted.bind(this),this._editingCancelled.bind(this),attributeName);function postKeyDownFinishHandler(event){UI.handleElementValueModifications(event,attribute);return'';}
if(!attributeValueElement.textContent.asParsedURL()){config.setPostKeydownFinishHandler(postKeyDownFinishHandler);}
this._editing=UI.InplaceEditor.startEditing(attribute,config);this.listItemElement.getComponentSelection().selectAllChildren(elementForSelection);return true;}
_startEditingTextNode(textNodeElement){if(UI.isBeingEdited(textNodeElement)){return true;}
let textNode=this._node;if(textNode.nodeType()===Node.ELEMENT_NODE&&textNode.firstChild){textNode=textNode.firstChild;}
const container=textNodeElement.enclosingNodeOrSelfWithClass('webkit-html-text-node');if(container){container.textContent=textNode.nodeValue();}
const config=new UI.InplaceEditor.Config(this._textNodeEditingCommitted.bind(this,textNode),this._editingCancelled.bind(this));this._editing=UI.InplaceEditor.startEditing(textNodeElement,config);this.listItemElement.getComponentSelection().selectAllChildren(textNodeElement);return true;}
_startEditingTagName(tagNameElement){if(!tagNameElement){tagNameElement=this.listItemElement.getElementsByClassName('webkit-html-tag-name')[0];if(!tagNameElement){return false;}}
const tagName=tagNameElement.textContent;if(Elements.ElementsTreeElement.EditTagBlacklist.has(tagName.toLowerCase())){return false;}
if(UI.isBeingEdited(tagNameElement)){return true;}
const closingTagElement=this._distinctClosingTagElement();function keyupListener(event){if(closingTagElement){closingTagElement.textContent='</'+tagNameElement.textContent+'>';}}
const keydownListener=event=>{if(event.key!==' '){return;}
this._editing.commit();event.consume(true);};function editingComitted(element,newTagName){tagNameElement.removeEventListener('keyup',keyupListener,false);tagNameElement.removeEventListener('keydown',keydownListener,false);this._tagNameEditingCommitted.apply(this,arguments);}
function editingCancelled(){tagNameElement.removeEventListener('keyup',keyupListener,false);tagNameElement.removeEventListener('keydown',keydownListener,false);this._editingCancelled.apply(this,arguments);}
tagNameElement.addEventListener('keyup',keyupListener,false);tagNameElement.addEventListener('keydown',keydownListener,false);const config=new UI.InplaceEditor.Config(editingComitted.bind(this),editingCancelled.bind(this),tagName);this._editing=UI.InplaceEditor.startEditing(tagNameElement,config);this.listItemElement.getComponentSelection().selectAllChildren(tagNameElement);return true;}
_startEditingAsHTML(commitCallback,disposeCallback,maybeInitialValue){if(maybeInitialValue===null){return;}
let initialValue=maybeInitialValue;if(this._editing){return;}
initialValue=this._convertWhitespaceToEntities(initialValue).text;this._htmlEditElement=createElement('div');this._htmlEditElement.className='source-code elements-tree-editor';let child=this.listItemElement.firstChild;while(child){child.style.display='none';child=child.nextSibling;}
if(this.childrenListElement){this.childrenListElement.style.display='none';}
this.listItemElement.appendChild(this._htmlEditElement);self.runtime.extension(UI.TextEditorFactory).instance().then(gotFactory.bind(this));function gotFactory(factory){const editor=factory.createEditor({lineNumbers:false,lineWrapping:Common.moduleSetting('domWordWrap').get(),mimeType:'text/html',autoHeight:false,padBottom:false});this._editing={commit:commit.bind(this),cancel:dispose.bind(this),editor:editor,resize:resize.bind(this)};resize.call(this);editor.widget().show(this._htmlEditElement);editor.setText(initialValue);editor.widget().focus();editor.widget().element.addEventListener('focusout',event=>{if(event.relatedTarget&&!event.relatedTarget.isSelfOrDescendant(editor.widget().element)){this._editing.commit();}},false);editor.widget().element.addEventListener('keydown',keydown.bind(this),true);this.treeOutline.setMultilineEditing(this._editing);}
function resize(){this._htmlEditElement.style.width=this.treeOutline.visibleWidth()-this._computeLeftIndent()-30+'px';this._editing.editor.onResize();}
function commit(){commitCallback(initialValue,this._editing.editor.text());dispose.call(this);}
function dispose(){this._editing.editor.widget().element.removeEventListener('blur',this._editing.commit,true);this._editing.editor.widget().detach();delete this._editing;this.listItemElement.removeChild(this._htmlEditElement);delete this._htmlEditElement;if(this.childrenListElement){this.childrenListElement.style.removeProperty('display');}
let child=this.listItemElement.firstChild;while(child){child.style.removeProperty('display');child=child.nextSibling;}
if(this.treeOutline){this.treeOutline.setMultilineEditing(null);this.treeOutline.focus();}
disposeCallback();}
function keydown(event){const isMetaOrCtrl=UI.KeyboardShortcut.eventHasCtrlOrMeta((event))&&!event.altKey&&!event.shiftKey;if(isEnterKey(event)&&(isMetaOrCtrl||event.isMetaOrCtrlForTest)){event.consume(true);this._editing.commit();}else if(event.keyCode===UI.KeyboardShortcut.Keys.Esc.code||event.key==='Escape'){event.consume(true);this._editing.cancel();}}}
_attributeEditingCommitted(element,newText,oldText,attributeName,moveDirection){delete this._editing;const treeOutline=this.treeOutline;function moveToNextAttributeIfNeeded(error){if(error){this._editingCancelled(element,attributeName);}
if(!moveDirection){return;}
treeOutline.runPendingUpdates();treeOutline.focus();const attributes=this._node.attributes();for(let i=0;i<attributes.length;++i){if(attributes[i].name!==attributeName){continue;}
if(moveDirection==='backward'){if(i===0){this._startEditingTagName();}else{this._triggerEditAttribute(attributes[i-1].name);}}else{if(i===attributes.length-1){this._addNewAttribute();}else{this._triggerEditAttribute(attributes[i+1].name);}}
return;}
if(moveDirection==='backward'){if(newText===' '){if(attributes.length>0){this._triggerEditAttribute(attributes[attributes.length-1].name);}}else{if(attributes.length>1){this._triggerEditAttribute(attributes[attributes.length-2].name);}}}else if(moveDirection==='forward'){if(!newText.isWhitespace()){this._addNewAttribute();}else{this._startEditingTagName();}}}
if((attributeName.trim()||newText.trim())&&oldText!==newText){this._node.setAttribute(attributeName,newText,moveToNextAttributeIfNeeded.bind(this));return;}
this.updateTitle();moveToNextAttributeIfNeeded.call(this);}
_tagNameEditingCommitted(element,newText,oldText,tagName,moveDirection){delete this._editing;const self=this;function cancel(){const closingTagElement=self._distinctClosingTagElement();if(closingTagElement){closingTagElement.textContent='</'+tagName+'>';}
self._editingCancelled(element,tagName);moveToNextAttributeIfNeeded.call(self);}
function moveToNextAttributeIfNeeded(){if(moveDirection!=='forward'){this._addNewAttribute();return;}
const attributes=this._node.attributes();if(attributes.length>0){this._triggerEditAttribute(attributes[0].name);}else{this._addNewAttribute();}}
newText=newText.trim();if(newText===oldText){cancel();return;}
const treeOutline=this.treeOutline;const wasExpanded=this.expanded;this._node.setNodeName(newText,(error,newNode)=>{if(error||!newNode){cancel();return;}
const newTreeItem=treeOutline.selectNodeAfterEdit(wasExpanded,error,newNode);moveToNextAttributeIfNeeded.call(newTreeItem);});}
_textNodeEditingCommitted(textNode,element,newText){delete this._editing;function callback(){this.updateTitle();}
textNode.setNodeValue(newText,callback.bind(this));}
_editingCancelled(element,context){delete this._editing;this.updateTitle();}
_distinctClosingTagElement(){if(this.expanded){const closers=this.childrenListElement.querySelectorAll('.close');return closers[closers.length-1];}
const tags=this.listItemElement.getElementsByClassName('webkit-html-tag');return(tags.length===1?null:tags[tags.length-1]);}
updateTitle(updateRecord,onlySearchQueryChanged){if(this._editing){return;}
if(onlySearchQueryChanged){this._hideSearchHighlight();}else{const nodeInfo=this._nodeTitleInfo(updateRecord||null);if(this._node.nodeType()===Node.DOCUMENT_FRAGMENT_NODE&&this._node.isInShadowTree()&&this._node.shadowRootType()){this.childrenListElement.classList.add('shadow-root');let depth=4;for(let node=this._node;depth&&node;node=node.parentNode){if(node.nodeType()===Node.DOCUMENT_FRAGMENT_NODE){depth--;}}
if(!depth){this.childrenListElement.classList.add('shadow-root-deep');}else{this.childrenListElement.classList.add('shadow-root-depth-'+depth);}}
const highlightElement=createElement('span');highlightElement.className='highlight';highlightElement.appendChild(nodeInfo);this.title=highlightElement;this.updateDecorations();this.listItemElement.insertBefore(this._gutterContainer,this.listItemElement.firstChild);delete this._highlightResult;delete this.selectionElement;delete this._hintElement;if(this.selected){this._createSelection();this._createHint();}}
this._highlightSearchResults();}
_computeLeftIndent(){let treeElement=this.parent;let depth=0;while(treeElement!==null){depth++;treeElement=treeElement.parent;}
return 12*(depth-2)+(this.isExpandable()?1:12);}
updateDecorations(){this._gutterContainer.style.left=(-this._computeLeftIndent())+'px';if(this.isClosingTag()){return;}
if(this._node.nodeType()!==Node.ELEMENT_NODE){return;}
this._decorationsThrottler.schedule(this._updateDecorationsInternal.bind(this));}
_updateDecorationsInternal(){if(!this.treeOutline){return Promise.resolve();}
const node=this._node;if(!this.treeOutline._decoratorExtensions){this.treeOutline._decoratorExtensions=self.runtime.extensions(Elements.MarkerDecorator);}
const markerToExtension=new Map();for(let i=0;i<this.treeOutline._decoratorExtensions.length;++i){markerToExtension.set(this.treeOutline._decoratorExtensions[i].descriptor()['marker'],this.treeOutline._decoratorExtensions[i]);}
const promises=[];const decorations=[];const descendantDecorations=[];node.traverseMarkers(visitor);function visitor(n,marker){const extension=markerToExtension.get(marker);if(!extension){return;}
promises.push(extension.instance().then(collectDecoration.bind(null,n)));}
function collectDecoration(n,decorator){const decoration=decorator.decorate(n);if(!decoration){return;}
(n===node?decorations:descendantDecorations).push(decoration);}
return Promise.all(promises).then(updateDecorationsUI.bind(this));function updateDecorationsUI(){this._decorationsElement.removeChildren();this._decorationsElement.classList.add('hidden');this._gutterContainer.classList.toggle('has-decorations',decorations.length||descendantDecorations.length);if(!decorations.length&&!descendantDecorations.length){return;}
const colors=new Set();const titles=createElement('div');for(const decoration of decorations){const titleElement=titles.createChild('div');titleElement.textContent=decoration.title;colors.add(decoration.color);}
if(this.expanded&&!decorations.length){return;}
const descendantColors=new Set();if(descendantDecorations.length){let element=titles.createChild('div');element.textContent=Common.UIString('Children:');for(const decoration of descendantDecorations){element=titles.createChild('div');element.style.marginLeft='15px';element.textContent=decoration.title;descendantColors.add(decoration.color);}}
let offset=0;processColors.call(this,colors,'elements-gutter-decoration');if(!this.expanded){processColors.call(this,descendantColors,'elements-gutter-decoration elements-has-decorated-children');}
UI.Tooltip.install(this._decorationsElement,titles);function processColors(colors,className){for(const color of colors){const child=this._decorationsElement.createChild('div',className);this._decorationsElement.classList.remove('hidden');child.style.backgroundColor=color;child.style.borderColor=color;if(offset){child.style.marginLeft=offset+'px';}
offset+=3;}}}}
_buildAttributeDOM(parentElement,name,value,updateRecord,forceValue,node){const closingPunctuationRegex=/[\/;:\)\]\}]/g;let highlightIndex=0;let highlightCount;let additionalHighlightOffset=0;let result;function replacer(match,replaceOffset){while(highlightIndex<highlightCount&&result.entityRanges[highlightIndex].offset<replaceOffset){result.entityRanges[highlightIndex].offset+=additionalHighlightOffset;++highlightIndex;}
additionalHighlightOffset+=1;return match+'\u200B';}
function setValueWithEntities(element,value){result=this._convertWhitespaceToEntities(value);highlightCount=result.entityRanges.length;value=result.text.replace(closingPunctuationRegex,replacer);while(highlightIndex<highlightCount){result.entityRanges[highlightIndex].offset+=additionalHighlightOffset;++highlightIndex;}
element.setTextContentTruncatedIfNeeded(value);UI.highlightRangesWithStyleClass(element,result.entityRanges,'webkit-html-entity-value');}
const hasText=(forceValue||value.length>0);const attrSpanElement=parentElement.createChild('span','webkit-html-attribute');const attrNameElement=attrSpanElement.createChild('span','webkit-html-attribute-name');attrNameElement.textContent=name;if(hasText){attrSpanElement.createTextChild('=\u200B"');}
const attrValueElement=attrSpanElement.createChild('span','webkit-html-attribute-value');if(updateRecord&&updateRecord.isAttributeModified(name)){UI.runCSSAnimationOnce(hasText?attrValueElement:attrNameElement,'dom-update-highlight');}
function linkifyValue(value){const rewrittenHref=node.resolveURL(value);if(rewrittenHref===null){const span=createElement('span');setValueWithEntities.call(this,span,value);return span;}
value=value.replace(closingPunctuationRegex,'$&\u200B');if(value.startsWith('data:')){value=value.trimMiddle(60);}
const link=node.nodeName().toLowerCase()==='a'?UI.XLink.create(rewrittenHref,value,'',true):Components.Linkifier.linkifyURL(rewrittenHref,{text:value,preventClick:true});link[Elements.ElementsTreeElement.HrefSymbol]=rewrittenHref;return link;}
const nodeName=node?node.nodeName().toLowerCase():'';if(nodeName&&(name==='src'||name==='href')){attrValueElement.appendChild(linkifyValue.call(this,value));}else if((nodeName==='img'||nodeName==='source')&&name==='srcset'){attrValueElement.appendChild(linkifySrcset.call(this,value));}else{setValueWithEntities.call(this,attrValueElement,value);}
if(hasText){attrSpanElement.createTextChild('"');}
function linkifySrcset(value){const fragment=createDocumentFragment();let i=0;while(value.length){if(i++>0){fragment.createTextChild(' ');}
value=value.trim();let url='';let descriptor='';const indexOfSpace=value.search(/\s/);if(indexOfSpace===-1){url=value;}else if(indexOfSpace>0&&value[indexOfSpace-1]===','){url=value.substring(0,indexOfSpace);}else{url=value.substring(0,indexOfSpace);const indexOfComma=value.indexOf(',',indexOfSpace);if(indexOfComma!==-1){descriptor=value.substring(indexOfSpace,indexOfComma+1);}else{descriptor=value.substring(indexOfSpace);}}
if(url){if(url.endsWith(',')){fragment.appendChild(linkifyValue.call(this,url.substring(0,url.length-1)));fragment.createTextChild(',');}else{fragment.appendChild(linkifyValue.call(this,url));}}
if(descriptor){fragment.createTextChild(descriptor);}
value=value.substring(url.length+descriptor.length);}
return fragment;}}
_buildPseudoElementDOM(parentElement,pseudoElementName){const pseudoElement=parentElement.createChild('span','webkit-html-pseudo-element');pseudoElement.textContent='::'+pseudoElementName;parentElement.createTextChild('\u200B');}
_buildTagDOM(parentElement,tagName,isClosingTag,isDistinctTreeElement,updateRecord){const node=this._node;const classes=['webkit-html-tag'];if(isClosingTag&&isDistinctTreeElement){classes.push('close');}
const tagElement=parentElement.createChild('span',classes.join(' '));tagElement.createTextChild('<');const tagNameElement=tagElement.createChild('span',isClosingTag?'webkit-html-close-tag-name':'webkit-html-tag-name');tagNameElement.textContent=(isClosingTag?'/':'')+tagName;if(!isClosingTag){if(node.hasAttributes()){const attributes=node.attributes();for(let i=0;i<attributes.length;++i){const attr=attributes[i];tagElement.createTextChild(' ');this._buildAttributeDOM(tagElement,attr.name,attr.value,updateRecord,false,node);}}
if(updateRecord){let hasUpdates=updateRecord.hasRemovedAttributes()||updateRecord.hasRemovedChildren();hasUpdates|=!this.expanded&&updateRecord.hasChangedChildren();if(hasUpdates){UI.runCSSAnimationOnce(tagNameElement,'dom-update-highlight');}}}
tagElement.createTextChild('>');parentElement.createTextChild('\u200B');}
_convertWhitespaceToEntities(text){let result='';let lastIndexAfterEntity=0;const entityRanges=[];const charToEntity=Elements.ElementsTreeOutline.MappedCharToEntity;for(let i=0,size=text.length;i<size;++i){const char=text.charAt(i);if(charToEntity[char]){result+=text.substring(lastIndexAfterEntity,i);const entityValue='&'+charToEntity[char]+';';entityRanges.push({offset:result.length,length:entityValue.length});result+=entityValue;lastIndexAfterEntity=i+1;}}
if(result){result+=text.substring(lastIndexAfterEntity);}
return{text:result||text,entityRanges:entityRanges};}
_nodeTitleInfo(updateRecord){const node=this._node;const titleDOM=createDocumentFragment();switch(node.nodeType()){case Node.ATTRIBUTE_NODE:this._buildAttributeDOM(titleDOM,(node.name),(node.value),updateRecord,true);break;case Node.ELEMENT_NODE:const pseudoType=node.pseudoType();if(pseudoType){this._buildPseudoElementDOM(titleDOM,pseudoType);break;}
const tagName=node.nodeNameInCorrectCase();if(this._elementCloseTag){this._buildTagDOM(titleDOM,tagName,true,true,updateRecord);break;}
this._buildTagDOM(titleDOM,tagName,false,false,updateRecord);if(this.isExpandable()){if(!this.expanded){const textNodeElement=titleDOM.createChild('span','webkit-html-text-node bogus');textNodeElement.textContent='\u2026';titleDOM.createTextChild('\u200B');this._buildTagDOM(titleDOM,tagName,true,false,updateRecord);}
break;}
if(Elements.ElementsTreeElement.canShowInlineText(node)){const textNodeElement=titleDOM.createChild('span','webkit-html-text-node');const result=this._convertWhitespaceToEntities(node.firstChild.nodeValue());textNodeElement.textContent=result.text;UI.highlightRangesWithStyleClass(textNodeElement,result.entityRanges,'webkit-html-entity-value');titleDOM.createTextChild('\u200B');this._buildTagDOM(titleDOM,tagName,true,false,updateRecord);if(updateRecord&&updateRecord.hasChangedChildren()){UI.runCSSAnimationOnce(textNodeElement,'dom-update-highlight');}
if(updateRecord&&updateRecord.isCharDataModified()){UI.runCSSAnimationOnce(textNodeElement,'dom-update-highlight');}
break;}
if(this.treeOutline.isXMLMimeType||!Elements.ElementsTreeElement.ForbiddenClosingTagElements.has(tagName)){this._buildTagDOM(titleDOM,tagName,true,false,updateRecord);}
break;case Node.TEXT_NODE:if(node.parentNode&&node.parentNode.nodeName().toLowerCase()==='script'){const newNode=titleDOM.createChild('span','webkit-html-text-node webkit-html-js-node');const text=node.nodeValue();newNode.textContent=text.startsWith('\n')?text.substring(1):text;const javascriptSyntaxHighlighter=new UI.SyntaxHighlighter('text/javascript',true);javascriptSyntaxHighlighter.syntaxHighlightNode(newNode).then(updateSearchHighlight.bind(this));}else if(node.parentNode&&node.parentNode.nodeName().toLowerCase()==='style'){const newNode=titleDOM.createChild('span','webkit-html-text-node webkit-html-css-node');const text=node.nodeValue();newNode.textContent=text.startsWith('\n')?text.substring(1):text;const cssSyntaxHighlighter=new UI.SyntaxHighlighter('text/css',true);cssSyntaxHighlighter.syntaxHighlightNode(newNode).then(updateSearchHighlight.bind(this));}else{titleDOM.createTextChild('"');const textNodeElement=titleDOM.createChild('span','webkit-html-text-node');const result=this._convertWhitespaceToEntities(node.nodeValue());textNodeElement.textContent=result.text;UI.highlightRangesWithStyleClass(textNodeElement,result.entityRanges,'webkit-html-entity-value');titleDOM.createTextChild('"');if(updateRecord&&updateRecord.isCharDataModified()){UI.runCSSAnimationOnce(textNodeElement,'dom-update-highlight');}}
break;case Node.COMMENT_NODE:const commentElement=titleDOM.createChild('span','webkit-html-comment');commentElement.createTextChild('<!--'+node.nodeValue()+'-->');break;case Node.DOCUMENT_TYPE_NODE:const docTypeElement=titleDOM.createChild('span','webkit-html-doctype');docTypeElement.createTextChild('<!doctype '+node.nodeName());if(node.publicId){docTypeElement.createTextChild(' PUBLIC "'+node.publicId+'"');if(node.systemId){docTypeElement.createTextChild(' "'+node.systemId+'"');}}else if(node.systemId){docTypeElement.createTextChild(' SYSTEM "'+node.systemId+'"');}
if(node.internalSubset){docTypeElement.createTextChild(' ['+node.internalSubset+']');}
docTypeElement.createTextChild('>');break;case Node.CDATA_SECTION_NODE:const cdataElement=titleDOM.createChild('span','webkit-html-text-node');cdataElement.createTextChild('<![CDATA['+node.nodeValue()+']]>');break;case Node.DOCUMENT_FRAGMENT_NODE:const fragmentElement=titleDOM.createChild('span','webkit-html-fragment');fragmentElement.textContent=node.nodeNameInCorrectCase().collapseWhitespace();break;default:titleDOM.createTextChild(node.nodeNameInCorrectCase().collapseWhitespace());}
function updateSearchHighlight(){delete this._highlightResult;this._highlightSearchResults();}
return titleDOM;}
remove(){if(this._node.pseudoType()){return;}
const parentElement=this.parent;if(!parentElement){return;}
if(!this._node.parentNode||this._node.parentNode.nodeType()===Node.DOCUMENT_NODE){return;}
this._node.removeNode();}
toggleEditAsHTML(callback,startEditing){if(this._editing&&this._htmlEditElement){this._editing.commit();return;}
if(startEditing===false){return;}
function selectNode(error){if(callback){callback(!error);}}
function commitChange(initialValue,value){if(initialValue!==value){node.setOuterHTML(value,selectNode);}}
function disposeCallback(){if(callback){callback(false);}}
const node=this._node;node.getOuterHTML().then(this._startEditingAsHTML.bind(this,commitChange,disposeCallback));}
_copyCSSPath(){Host.InspectorFrontendHost.copyText(Elements.DOMPath.cssPath(this._node,true));}
_copyJSPath(){Host.InspectorFrontendHost.copyText(Elements.DOMPath.jsPath(this._node,true));}
_copyXPath(){Host.InspectorFrontendHost.copyText(Elements.DOMPath.xPath(this._node,true));}
_copyFullXPath(){Host.InspectorFrontendHost.copyText(Elements.DOMPath.xPath(this._node,false));}
async _copyStyles(){const node=this._node;const cssModel=node.domModel().cssModel();const cascade=await cssModel.cachedMatchedCascadeForNode(node);if(!cascade){return;}
const lines=[];for(const style of cascade.nodeStyles().reverse()){for(const property of style.leadingProperties()){if(!property.parsedOk||property.disabled||!property.activeInStyle()||property.implicit){continue;}
if(cascade.isInherited(style)&&!SDK.cssMetadata().isPropertyInherited(property.name)){continue;}
if(style.parentRule&&style.parentRule.isUserAgent()){continue;}
if(cascade.propertyState(property)!==SDK.CSSMatchedStyles.PropertyState.Active){continue;}
lines.push(`${property.name}: ${property.value};`);}}
Host.InspectorFrontendHost.copyText(lines.join('\n'));}
_highlightSearchResults(){if(!this._searchQuery||!this._searchHighlightsVisible){return;}
this._hideSearchHighlight();const text=this.listItemElement.textContent;const regexObject=createPlainTextSearchRegex(this._searchQuery,'gi');let match=regexObject.exec(text);const matchRanges=[];while(match){matchRanges.push(new TextUtils.SourceRange(match.index,match[0].length));match=regexObject.exec(text);}
if(!matchRanges.length){matchRanges.push(new TextUtils.SourceRange(0,text.length));}
this._highlightResult=[];UI.highlightSearchResults(this.listItemElement,matchRanges,this._highlightResult);}
_editAsHTML(){const promise=Common.Revealer.reveal(this.node());promise.then(()=>UI.actionRegistry.action('elements.edit-as-html').execute());}};Elements.ElementsTreeElement.HrefSymbol=Symbol('ElementsTreeElement.Href');Elements.ElementsTreeElement.InitialChildrenLimit=500;Elements.ElementsTreeElement.ForbiddenClosingTagElements=new Set(['area','base','basefont','br','canvas','col','command','embed','frame','hr','img','input','keygen','link','menuitem','meta','param','source','track','wbr']);Elements.ElementsTreeElement.EditTagBlacklist=new Set(['html','head','body']);Elements.MultilineEditorController;;Elements.ElementsTreeOutline=class extends UI.TreeOutline{constructor(omitRootDOMNode,selectEnabled,hideGutter){super();this._treeElementSymbol=Symbol('treeElement');const shadowContainer=createElement('div');this._shadowRoot=UI.createShadowRootWithCoreStyles(shadowContainer,'elements/elementsTreeOutline.css');const outlineDisclosureElement=this._shadowRoot.createChild('div','elements-disclosure');this._element=this.element;this._element.classList.add('elements-tree-outline','source-code');if(hideGutter){this._element.classList.add('elements-hide-gutter');}
UI.ARIAUtils.setAccessibleName(this._element,Common.UIString('Page DOM'));this._element.addEventListener('focusout',this._onfocusout.bind(this),false);this._element.addEventListener('mousedown',this._onmousedown.bind(this),false);this._element.addEventListener('mousemove',this._onmousemove.bind(this),false);this._element.addEventListener('mouseleave',this._onmouseleave.bind(this),false);this._element.addEventListener('dragstart',this._ondragstart.bind(this),false);this._element.addEventListener('dragover',this._ondragover.bind(this),false);this._element.addEventListener('dragleave',this._ondragleave.bind(this),false);this._element.addEventListener('drop',this._ondrop.bind(this),false);this._element.addEventListener('dragend',this._ondragend.bind(this),false);this._element.addEventListener('contextmenu',this._contextMenuEventFired.bind(this),false);this._element.addEventListener('clipboard-beforecopy',this._onBeforeCopy.bind(this),false);this._element.addEventListener('clipboard-copy',this._onCopyOrCut.bind(this,false),false);this._element.addEventListener('clipboard-cut',this._onCopyOrCut.bind(this,true),false);this._element.addEventListener('clipboard-paste',this._onPaste.bind(this),false);this._element.addEventListener('keydown',this._onKeyDown.bind(this),false);outlineDisclosureElement.appendChild(this._element);this.element=shadowContainer;this._includeRootDOMNode=!omitRootDOMNode;this._selectEnabled=selectEnabled;this._rootDOMNode=null;this._selectedDOMNode=null;this._visible=false;this._popoverHelper=new UI.PopoverHelper(this._element,this._getPopoverRequest.bind(this));this._popoverHelper.setHasPadding(true);this._popoverHelper.setTimeout(0,100);this._updateRecords=new Map();this._treeElementsBeingUpdated=new Set();this._showHTMLCommentsSetting=Common.moduleSetting('showHTMLComments');this._showHTMLCommentsSetting.addChangeListener(this._onShowHTMLCommentsChange.bind(this));this.useLightSelectionColor();}
static forDOMModel(domModel){return domModel[Elements.ElementsTreeOutline._treeOutlineSymbol]||null;}
_onShowHTMLCommentsChange(){const selectedNode=this.selectedDOMNode();if(selectedNode&&selectedNode.nodeType()===Node.COMMENT_NODE&&!this._showHTMLCommentsSetting.get()){this.selectDOMNode(selectedNode.parentNode);}
this.update();}
treeElementSymbol(){return this._treeElementSymbol;}
setWordWrap(wrap){this._element.classList.toggle('elements-tree-nowrap',!wrap);}
setMultilineEditing(multilineEditing){this._multilineEditing=multilineEditing;}
visibleWidth(){return this._visibleWidth;}
setVisibleWidth(width){this._visibleWidth=width;if(this._multilineEditing){this._multilineEditing.resize();}}
_setClipboardData(data){if(this._clipboardNodeData){const treeElement=this.findTreeElement(this._clipboardNodeData.node);if(treeElement){treeElement.setInClipboard(false);}
delete this._clipboardNodeData;}
if(data){const treeElement=this.findTreeElement(data.node);if(treeElement){treeElement.setInClipboard(true);}
this._clipboardNodeData=data;}}
resetClipboardIfNeeded(removedNode){if(this._clipboardNodeData&&this._clipboardNodeData.node===removedNode){this._setClipboardData(null);}}
_onBeforeCopy(event){event.handled=true;}
_onCopyOrCut(isCut,event){this._setClipboardData(null);const originalEvent=event['original'];if(originalEvent.target.hasSelection()){return;}
if(UI.isEditing()){return;}
const targetNode=this.selectedDOMNode();if(!targetNode){return;}
originalEvent.clipboardData.clearData();event.handled=true;this.performCopyOrCut(isCut,targetNode);}
performCopyOrCut(isCut,node){if(isCut&&(node.isShadowRoot()||node.ancestorUserAgentShadowRoot())){return;}
node.copyNode();this._setClipboardData({node:node,isCut:isCut});}
canPaste(targetNode){if(targetNode.isShadowRoot()||targetNode.ancestorUserAgentShadowRoot()){return false;}
if(!this._clipboardNodeData){return false;}
const node=this._clipboardNodeData.node;if(this._clipboardNodeData.isCut&&(node===targetNode||node.isAncestor(targetNode))){return false;}
if(targetNode.domModel()!==node.domModel()){return false;}
return true;}
pasteNode(targetNode){if(this.canPaste(targetNode)){this._performPaste(targetNode);}}
_onPaste(event){if(UI.isEditing()){return;}
const targetNode=this.selectedDOMNode();if(!targetNode||!this.canPaste(targetNode)){return;}
event.handled=true;this._performPaste(targetNode);}
_performPaste(targetNode){if(this._clipboardNodeData.isCut){this._clipboardNodeData.node.moveTo(targetNode,null,expandCallback.bind(this));this._setClipboardData(null);}else{this._clipboardNodeData.node.copyTo(targetNode,null,expandCallback.bind(this));}
function expandCallback(error,nodeId){if(error){return;}
const pastedNode=targetNode.domModel().nodeForId(nodeId);if(!pastedNode){return;}
this.selectDOMNode(pastedNode);}}
setVisible(visible){if(visible===this._visible){return;}
this._visible=visible;if(!this._visible){this._popoverHelper.hidePopover();if(this._multilineEditing){this._multilineEditing.cancel();}
return;}
this.runPendingUpdates();if(this._selectedDOMNode){this._revealAndSelectNode(this._selectedDOMNode,false);}}
get rootDOMNode(){return this._rootDOMNode;}
set rootDOMNode(x){if(this._rootDOMNode===x){return;}
this._rootDOMNode=x;this._isXMLMimeType=x&&x.isXMLNode();this.update();}
get isXMLMimeType(){return this._isXMLMimeType;}
selectedDOMNode(){return this._selectedDOMNode;}
selectDOMNode(node,focus){if(this._selectedDOMNode===node){this._revealAndSelectNode(node,!focus);return;}
this._selectedDOMNode=node;this._revealAndSelectNode(node,!focus);if(this._selectedDOMNode===node){this._selectedNodeChanged(!!focus);}}
editing(){const node=this.selectedDOMNode();if(!node){return false;}
const treeElement=this.findTreeElement(node);if(!treeElement){return false;}
return treeElement.isEditing()||false;}
update(){const selectedNode=this.selectedDOMNode();this.removeChildren();if(!this.rootDOMNode){return;}
if(this._includeRootDOMNode){const treeElement=this._createElementTreeElement(this.rootDOMNode);this.appendChild(treeElement);}else{const children=this._visibleChildren(this.rootDOMNode);for(const child of children){const treeElement=this._createElementTreeElement(child);this.appendChild(treeElement);}}
if(selectedNode){this._revealAndSelectNode(selectedNode,true);}}
_selectedNodeChanged(focus){this.dispatchEventToListeners(Elements.ElementsTreeOutline.Events.SelectedNodeChanged,{node:this._selectedDOMNode,focus:focus});}
_fireElementsTreeUpdated(nodes){this.dispatchEventToListeners(Elements.ElementsTreeOutline.Events.ElementsTreeUpdated,nodes);}
findTreeElement(node){let treeElement=this._lookUpTreeElement(node);if(!treeElement&&node.nodeType()===Node.TEXT_NODE){treeElement=this._lookUpTreeElement(node.parentNode);}
return(treeElement);}
_lookUpTreeElement(node){if(!node){return null;}
const cachedElement=node[this._treeElementSymbol];if(cachedElement){return cachedElement;}
const ancestors=[];let currentNode;for(currentNode=node.parentNode;currentNode;currentNode=currentNode.parentNode){ancestors.push(currentNode);if(currentNode[this._treeElementSymbol])
{break;}}
if(!currentNode){return null;}
for(let i=ancestors.length-1;i>=0;--i){const child=ancestors[i-1]||node;const treeElement=ancestors[i][this._treeElementSymbol];if(treeElement){treeElement.onpopulate();if(child.index>=treeElement.expandedChildrenLimit()){this.setExpandedChildrenLimit(treeElement,child.index+1);}}}
return node[this._treeElementSymbol];}
createTreeElementFor(node){let treeElement=this.findTreeElement(node);if(treeElement){return treeElement;}
if(!node.parentNode){return null;}
treeElement=this.createTreeElementFor(node.parentNode);return treeElement?this._showChild(treeElement,node):null;}
set suppressRevealAndSelect(x){if(this._suppressRevealAndSelect===x){return;}
this._suppressRevealAndSelect=x;}
_revealAndSelectNode(node,omitFocus){if(this._suppressRevealAndSelect){return;}
if(!this._includeRootDOMNode&&node===this.rootDOMNode&&this.rootDOMNode){node=this.rootDOMNode.firstChild;}
if(!node){return;}
const treeElement=this.createTreeElementFor(node);if(!treeElement){return;}
treeElement.revealAndSelect(omitFocus);}
_treeElementFromEvent(event){const scrollContainer=this.element.parentElement;const x=scrollContainer.totalOffsetLeft()+scrollContainer.offsetWidth-36;const y=event.pageY;const elementUnderMouse=this.treeElementFromPoint(x,y);const elementAboveMouse=this.treeElementFromPoint(x,y-2);let element;if(elementUnderMouse===elementAboveMouse){element=elementUnderMouse;}else{element=this.treeElementFromPoint(x,y+2);}
return element;}
_getPopoverRequest(event){let link=event.target;while(link&&!link[Elements.ElementsTreeElement.HrefSymbol]){link=link.parentElementOrShadowHost();}
if(!link){return null;}
return{box:link.boxInWindow(),show:async popover=>{const listItem=link.enclosingNodeOrSelfWithNodeName('li');const node=(listItem.treeElement).node();const precomputedFeatures=await Components.ImagePreview.loadDimensionsForNode(node);const preview=await Components.ImagePreview.build(node.domModel().target(),link[Elements.ElementsTreeElement.HrefSymbol],true,{precomputedFeatures});if(preview){popover.contentElement.appendChild(preview);}
return!!preview;}};}
_onfocusout(event){SDK.OverlayModel.hideDOMNodeHighlight();}
_onmousedown(event){const element=this._treeElementFromEvent(event);if(!element||element.isEventWithinDisclosureTriangle(event)){return;}
element.select();}
setHoverEffect(treeElement){if(this._previousHoveredElement===treeElement){return;}
if(this._previousHoveredElement){this._previousHoveredElement.hovered=false;delete this._previousHoveredElement;}
if(treeElement){treeElement.hovered=true;this._previousHoveredElement=treeElement;}}
_onmousemove(event){const element=this._treeElementFromEvent(event);if(element&&this._previousHoveredElement===element){return;}
this.setHoverEffect(element);this._highlightTreeElement((element),!UI.KeyboardShortcut.eventHasCtrlOrMeta(event));}
_highlightTreeElement(element,showInfo){if(element instanceof Elements.ElementsTreeElement){element.node().domModel().overlayModel().highlightInOverlay({node:element.node()},'all',showInfo);return;}
if(element instanceof Elements.ElementsTreeOutline.ShortcutTreeElement){element.domModel().overlayModel().highlightInOverlay({deferredNode:element.deferredNode()},'all',showInfo);}}
_onmouseleave(event){this.setHoverEffect(null);SDK.OverlayModel.hideDOMNodeHighlight();}
_ondragstart(event){if(event.target.hasSelection()){return false;}
if(event.target.nodeName==='A'){return false;}
const treeElement=this._validDragSourceOrTarget(this._treeElementFromEvent(event));if(!treeElement){return false;}
if(treeElement.node().nodeName()==='BODY'||treeElement.node().nodeName()==='HEAD'){return false;}
event.dataTransfer.setData('text/plain',treeElement.listItemElement.textContent.replace(/\u200b/g,''));event.dataTransfer.effectAllowed='copyMove';this._treeElementBeingDragged=treeElement;SDK.OverlayModel.hideDOMNodeHighlight();return true;}
_ondragover(event){if(!this._treeElementBeingDragged){return false;}
const treeElement=this._validDragSourceOrTarget(this._treeElementFromEvent(event));if(!treeElement){return false;}
let node=treeElement.node();while(node){if(node===this._treeElementBeingDragged._node){return false;}
node=node.parentNode;}
treeElement.listItemElement.classList.add('elements-drag-over');this._dragOverTreeElement=treeElement;event.preventDefault();event.dataTransfer.dropEffect='move';return false;}
_ondragleave(event){this._clearDragOverTreeElementMarker();event.preventDefault();return false;}
_validDragSourceOrTarget(treeElement){if(!treeElement){return null;}
if(!(treeElement instanceof Elements.ElementsTreeElement)){return null;}
const elementsTreeElement=(treeElement);const node=elementsTreeElement.node();if(!node.parentNode||node.parentNode.nodeType()!==Node.ELEMENT_NODE){return null;}
return elementsTreeElement;}
_ondrop(event){event.preventDefault();const treeElement=this._treeElementFromEvent(event);if(treeElement instanceof Elements.ElementsTreeElement){this._doMove(treeElement);}}
_doMove(treeElement){if(!this._treeElementBeingDragged){return;}
let parentNode;let anchorNode;if(treeElement.isClosingTag()){parentNode=treeElement.node();}else{const dragTargetNode=treeElement.node();parentNode=dragTargetNode.parentNode;anchorNode=dragTargetNode;}
const wasExpanded=this._treeElementBeingDragged.expanded;this._treeElementBeingDragged._node.moveTo(parentNode,anchorNode,this.selectNodeAfterEdit.bind(this,wasExpanded));delete this._treeElementBeingDragged;}
_ondragend(event){event.preventDefault();this._clearDragOverTreeElementMarker();delete this._treeElementBeingDragged;}
_clearDragOverTreeElementMarker(){if(this._dragOverTreeElement){this._dragOverTreeElement.listItemElement.classList.remove('elements-drag-over');delete this._dragOverTreeElement;}}
_contextMenuEventFired(event){const treeElement=this._treeElementFromEvent(event);if(treeElement instanceof Elements.ElementsTreeElement){this.showContextMenu(treeElement,event);}}
showContextMenu(treeElement,event){if(UI.isEditing()){return;}
const contextMenu=new UI.ContextMenu(event);const isPseudoElement=!!treeElement.node().pseudoType();const isTag=treeElement.node().nodeType()===Node.ELEMENT_NODE&&!isPseudoElement;let textNode=event.target.enclosingNodeOrSelfWithClass('webkit-html-text-node');if(textNode&&textNode.classList.contains('bogus')){textNode=null;}
const commentNode=event.target.enclosingNodeOrSelfWithClass('webkit-html-comment');contextMenu.saveSection().appendItem(ls`Store as global variable`,this._saveNodeToTempVariable.bind(this,treeElement.node()));if(textNode){treeElement.populateTextContextMenu(contextMenu,textNode);}else if(isTag){treeElement.populateTagContextMenu(contextMenu,event);}else if(commentNode){treeElement.populateNodeContextMenu(contextMenu);}else if(isPseudoElement){treeElement.populateScrollIntoView(contextMenu);}
contextMenu.appendApplicableItems(treeElement.node());contextMenu.show();}
async _saveNodeToTempVariable(node){const remoteObjectForConsole=await node.resolveToObject();await SDK.consoleModel.saveToTempVariable(UI.context.flavor(SDK.ExecutionContext),remoteObjectForConsole);}
runPendingUpdates(){this._updateModifiedNodes();}
_onKeyDown(event){const keyboardEvent=(event);if(UI.isEditing()){return;}
const node=this.selectedDOMNode();if(!node){return;}
const treeElement=node[this._treeElementSymbol];if(!treeElement){return;}
if(UI.KeyboardShortcut.eventHasCtrlOrMeta(keyboardEvent)&&node.parentNode){if(keyboardEvent.key==='ArrowUp'&&node.previousSibling){node.moveTo(node.parentNode,node.previousSibling,this.selectNodeAfterEdit.bind(this,treeElement.expanded));keyboardEvent.consume(true);return;}
if(keyboardEvent.key==='ArrowDown'&&node.nextSibling){node.moveTo(node.parentNode,node.nextSibling.nextSibling,this.selectNodeAfterEdit.bind(this,treeElement.expanded));keyboardEvent.consume(true);return;}}}
toggleEditAsHTML(node,startEditing,callback){const treeElement=node[this._treeElementSymbol];if(!treeElement||!treeElement.hasEditableNode()){return;}
if(node.pseudoType()){return;}
const parentNode=node.parentNode;const index=node.index;const wasExpanded=treeElement.expanded;treeElement.toggleEditAsHTML(editingFinished.bind(this),startEditing);function editingFinished(success){if(callback){callback();}
if(!success){return;}
this.runPendingUpdates();const newNode=parentNode?parentNode.children()[index]||parentNode:null;if(!newNode){return;}
this.selectDOMNode(newNode,true);if(wasExpanded){const newTreeItem=this.findTreeElement(newNode);if(newTreeItem){newTreeItem.expand();}}}}
selectNodeAfterEdit(wasExpanded,error,newNode){if(error){return null;}
this.runPendingUpdates();if(!newNode){return null;}
this.selectDOMNode(newNode,true);const newTreeItem=this.findTreeElement(newNode);if(wasExpanded){if(newTreeItem){newTreeItem.expand();}}
return newTreeItem;}
async toggleHideElement(node){const pseudoType=node.pseudoType();const effectiveNode=pseudoType?node.parentNode:node;if(!effectiveNode){return;}
const hidden=node.marker('hidden-marker');const object=await effectiveNode.resolveToObject('');if(!object){return;}
await object.callFunction(toggleClassAndInjectStyleRule,[{value:pseudoType},{value:!hidden}]);object.release();node.setMarker('hidden-marker',hidden?null:true);function toggleClassAndInjectStyleRule(pseudoType,hidden){const classNamePrefix='__web-inspector-hide';const classNameSuffix='-shortcut__';const styleTagId='__web-inspector-hide-shortcut-style__';const selectors=[];selectors.push('.__web-inspector-hide-shortcut__');selectors.push('.__web-inspector-hide-shortcut__ *');selectors.push('.__web-inspector-hidebefore-shortcut__::before');selectors.push('.__web-inspector-hideafter-shortcut__::after');const selector=selectors.join(', ');const ruleBody='    visibility: hidden !important;';const rule='\n'+selector+'\n{\n'+ruleBody+'\n}\n';const className=classNamePrefix+(pseudoType||'')+classNameSuffix;this.classList.toggle(className,hidden);let localRoot=this;while(localRoot.parentNode){localRoot=localRoot.parentNode;}
if(localRoot.nodeType===Node.DOCUMENT_NODE){localRoot=document.head;}
let style=localRoot.querySelector('style#'+styleTagId);if(style){return;}
style=document.createElement('style');style.id=styleTagId;style.textContent=rule;localRoot.appendChild(style);}}
isToggledToHidden(node){return!!node.marker('hidden-marker');}
_reset(){this.rootDOMNode=null;this.selectDOMNode(null,false);this._popoverHelper.hidePopover();delete this._clipboardNodeData;SDK.OverlayModel.hideDOMNodeHighlight();this._updateRecords.clear();}
wireToDOMModel(domModel){domModel[Elements.ElementsTreeOutline._treeOutlineSymbol]=this;domModel.addEventListener(SDK.DOMModel.Events.MarkersChanged,this._markersChanged,this);domModel.addEventListener(SDK.DOMModel.Events.NodeInserted,this._nodeInserted,this);domModel.addEventListener(SDK.DOMModel.Events.NodeRemoved,this._nodeRemoved,this);domModel.addEventListener(SDK.DOMModel.Events.AttrModified,this._attributeModified,this);domModel.addEventListener(SDK.DOMModel.Events.AttrRemoved,this._attributeRemoved,this);domModel.addEventListener(SDK.DOMModel.Events.CharacterDataModified,this._characterDataModified,this);domModel.addEventListener(SDK.DOMModel.Events.DocumentUpdated,this._documentUpdated,this);domModel.addEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated,this._childNodeCountUpdated,this);domModel.addEventListener(SDK.DOMModel.Events.DistributedNodesChanged,this._distributedNodesChanged,this);}
unwireFromDOMModel(domModel){domModel.removeEventListener(SDK.DOMModel.Events.MarkersChanged,this._markersChanged,this);domModel.removeEventListener(SDK.DOMModel.Events.NodeInserted,this._nodeInserted,this);domModel.removeEventListener(SDK.DOMModel.Events.NodeRemoved,this._nodeRemoved,this);domModel.removeEventListener(SDK.DOMModel.Events.AttrModified,this._attributeModified,this);domModel.removeEventListener(SDK.DOMModel.Events.AttrRemoved,this._attributeRemoved,this);domModel.removeEventListener(SDK.DOMModel.Events.CharacterDataModified,this._characterDataModified,this);domModel.removeEventListener(SDK.DOMModel.Events.DocumentUpdated,this._documentUpdated,this);domModel.removeEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated,this._childNodeCountUpdated,this);domModel.removeEventListener(SDK.DOMModel.Events.DistributedNodesChanged,this._distributedNodesChanged,this);delete domModel[Elements.ElementsTreeOutline._treeOutlineSymbol];}
_addUpdateRecord(node){let record=this._updateRecords.get(node);if(!record){record=new Elements.ElementsTreeOutline.UpdateRecord();this._updateRecords.set(node,record);}
return record;}
_updateRecordForHighlight(node){if(!this._visible){return null;}
return this._updateRecords.get(node)||null;}
_documentUpdated(event){const domModel=(event.data);this._reset();if(domModel.existingDocument()){this.rootDOMNode=domModel.existingDocument();}}
_attributeModified(event){const node=(event.data.node);this._addUpdateRecord(node).attributeModified(event.data.name);this._updateModifiedNodesSoon();}
_attributeRemoved(event){const node=(event.data.node);this._addUpdateRecord(node).attributeRemoved(event.data.name);this._updateModifiedNodesSoon();}
_characterDataModified(event){const node=(event.data);this._addUpdateRecord(node).charDataModified();if(node.parentNode&&node.parentNode.firstChild===node.parentNode.lastChild){this._addUpdateRecord(node.parentNode).childrenModified();}
this._updateModifiedNodesSoon();}
_nodeInserted(event){const node=(event.data);this._addUpdateRecord((node.parentNode)).nodeInserted(node);this._updateModifiedNodesSoon();}
_nodeRemoved(event){const node=(event.data.node);const parentNode=(event.data.parent);this.resetClipboardIfNeeded(node);this._addUpdateRecord(parentNode).nodeRemoved(node);this._updateModifiedNodesSoon();}
_childNodeCountUpdated(event){const node=(event.data);this._addUpdateRecord(node).childrenModified();this._updateModifiedNodesSoon();}
_distributedNodesChanged(event){const node=(event.data);this._addUpdateRecord(node).childrenModified();this._updateModifiedNodesSoon();}
_updateModifiedNodesSoon(){if(!this._updateRecords.size){return;}
if(this._updateModifiedNodesTimeout){return;}
this._updateModifiedNodesTimeout=setTimeout(this._updateModifiedNodes.bind(this),50);}
_updateModifiedNodes(){if(this._updateModifiedNodesTimeout){clearTimeout(this._updateModifiedNodesTimeout);delete this._updateModifiedNodesTimeout;}
const updatedNodes=this._updateRecords.keysArray();const hidePanelWhileUpdating=updatedNodes.length>10;let treeOutlineContainerElement;let originalScrollTop;if(hidePanelWhileUpdating){treeOutlineContainerElement=this.element.parentNode;originalScrollTop=treeOutlineContainerElement?treeOutlineContainerElement.scrollTop:0;this._element.classList.add('hidden');}
if(this._rootDOMNode&&this._updateRecords.get(this._rootDOMNode)&&this._updateRecords.get(this._rootDOMNode).hasChangedChildren()){this.update();}else{for(const node of this._updateRecords.keys()){if(this._updateRecords.get(node).hasChangedChildren()){this._updateModifiedParentNode(node);}else{this._updateModifiedNode(node);}}}
if(hidePanelWhileUpdating){this._element.classList.remove('hidden');if(originalScrollTop){treeOutlineContainerElement.scrollTop=originalScrollTop;}}
this._updateRecords.clear();this._fireElementsTreeUpdated(updatedNodes);}
_updateModifiedNode(node){const treeElement=this.findTreeElement(node);if(treeElement){treeElement.updateTitle(this._updateRecordForHighlight(node));}}
_updateModifiedParentNode(node){const parentTreeElement=this.findTreeElement(node);if(parentTreeElement){parentTreeElement.setExpandable(this._hasVisibleChildren(node));parentTreeElement.updateTitle(this._updateRecordForHighlight(node));if(parentTreeElement.populated){this._updateChildren(parentTreeElement);}}}
populateTreeElement(treeElement){if(treeElement.childCount()||!treeElement.isExpandable()){return Promise.resolve();}
return new Promise(resolve=>{treeElement.node().getChildNodes(()=>{treeElement.populated=true;this._updateModifiedParentNode(treeElement.node());resolve();});});}
_createElementTreeElement(node,closingTag){const treeElement=new Elements.ElementsTreeElement(node,closingTag);treeElement.setExpandable(!closingTag&&this._hasVisibleChildren(node));if(node.nodeType()===Node.ELEMENT_NODE&&node.parentNode&&node.parentNode.nodeType()===Node.DOCUMENT_NODE&&!node.parentNode.parentNode){treeElement.setCollapsible(false);}
treeElement.selectable=this._selectEnabled;return treeElement;}
_showChild(treeElement,child){if(treeElement.isClosingTag()){return null;}
const index=this._visibleChildren(treeElement.node()).indexOf(child);if(index===-1){return null;}
if(index>=treeElement.expandedChildrenLimit()){this.setExpandedChildrenLimit(treeElement,index+1);}
return(treeElement.childAt(index));}
_visibleChildren(node){let visibleChildren=Elements.ElementsTreeElement.visibleShadowRoots(node);const contentDocument=node.contentDocument();if(contentDocument){visibleChildren.push(contentDocument);}
const importedDocument=node.importedDocument();if(importedDocument){visibleChildren.push(importedDocument);}
const templateContent=node.templateContent();if(templateContent){visibleChildren.push(templateContent);}
const beforePseudoElement=node.beforePseudoElement();if(beforePseudoElement){visibleChildren.push(beforePseudoElement);}
if(node.childNodeCount()){let children=node.children()||[];if(!this._showHTMLCommentsSetting.get()){children=children.filter(n=>n.nodeType()!==Node.COMMENT_NODE);}
visibleChildren=visibleChildren.concat(children);}
const afterPseudoElement=node.afterPseudoElement();if(afterPseudoElement){visibleChildren.push(afterPseudoElement);}
return visibleChildren;}
_hasVisibleChildren(node){if(node.isIframe()){return true;}
if(node.isPortal()){return true;}
if(node.contentDocument()){return true;}
if(node.importedDocument()){return true;}
if(node.templateContent()){return true;}
if(Elements.ElementsTreeElement.visibleShadowRoots(node).length){return true;}
if(node.hasPseudoElements()){return true;}
if(node.isInsertionPoint()){return true;}
return!!node.childNodeCount()&&!Elements.ElementsTreeElement.canShowInlineText(node);}
_createExpandAllButtonTreeElement(treeElement){const button=UI.createTextButton('',handleLoadAllChildren.bind(this));button.value='';const expandAllButtonElement=new UI.TreeElement(button);expandAllButtonElement.selectable=false;expandAllButtonElement.expandAllButton=true;expandAllButtonElement.button=button;return expandAllButtonElement;function handleLoadAllChildren(event){const visibleChildCount=this._visibleChildren(treeElement.node()).length;this.setExpandedChildrenLimit(treeElement,Math.max(visibleChildCount,treeElement.expandedChildrenLimit()+Elements.ElementsTreeElement.InitialChildrenLimit));event.consume();}}
setExpandedChildrenLimit(treeElement,expandedChildrenLimit){if(treeElement.expandedChildrenLimit()===expandedChildrenLimit){return;}
treeElement.setExpandedChildrenLimit(expandedChildrenLimit);if(treeElement.treeOutline&&!this._treeElementsBeingUpdated.has(treeElement)){this._updateModifiedParentNode(treeElement.node());}}
_updateChildren(treeElement){if(!treeElement.isExpandable()){const selectedTreeElement=treeElement.treeOutline.selectedTreeElement;if(selectedTreeElement&&selectedTreeElement.hasAncestor(treeElement)){treeElement.select(true);}
treeElement.removeChildren();return;}
console.assert(!treeElement.isClosingTag());this._innerUpdateChildren(treeElement);}
insertChildElement(treeElement,child,index,closingTag){const newElement=this._createElementTreeElement(child,closingTag);treeElement.insertChild(newElement,index);return newElement;}
_moveChild(treeElement,child,targetIndex){if(treeElement.indexOfChild(child)===targetIndex){return;}
const wasSelected=child.selected;if(child.parent){child.parent.removeChild(child);}
treeElement.insertChild(child,targetIndex);if(wasSelected){child.select();}}
_innerUpdateChildren(treeElement){if(this._treeElementsBeingUpdated.has(treeElement)){return;}
this._treeElementsBeingUpdated.add(treeElement);const node=treeElement.node();const visibleChildren=this._visibleChildren(node);const visibleChildrenSet=new Set(visibleChildren);const existingTreeElements=new Map();for(let i=treeElement.childCount()-1;i>=0;--i){const existingTreeElement=treeElement.childAt(i);if(!(existingTreeElement instanceof Elements.ElementsTreeElement)){treeElement.removeChildAtIndex(i);continue;}
const elementsTreeElement=(existingTreeElement);const existingNode=elementsTreeElement.node();if(visibleChildrenSet.has(existingNode)){existingTreeElements.set(existingNode,existingTreeElement);continue;}
treeElement.removeChildAtIndex(i);}
for(let i=0;i<visibleChildren.length&&i<treeElement.expandedChildrenLimit();++i){const child=visibleChildren[i];const existingTreeElement=existingTreeElements.get(child)||this.findTreeElement(child);if(existingTreeElement&&existingTreeElement!==treeElement){this._moveChild(treeElement,existingTreeElement,i);}else{const newElement=this.insertChildElement(treeElement,child,i);if(this._updateRecordForHighlight(node)&&treeElement.expanded){Elements.ElementsTreeElement.animateOnDOMUpdate(newElement);}
if(treeElement.childCount()>treeElement.expandedChildrenLimit()){this.setExpandedChildrenLimit(treeElement,treeElement.expandedChildrenLimit()+1);}}}
const expandedChildCount=treeElement.childCount();if(visibleChildren.length>expandedChildCount){const targetButtonIndex=expandedChildCount;if(!treeElement.expandAllButtonElement){treeElement.expandAllButtonElement=this._createExpandAllButtonTreeElement(treeElement);}
treeElement.insertChild(treeElement.expandAllButtonElement,targetButtonIndex);treeElement.expandAllButtonElement.button.textContent=Common.UIString('Show All Nodes (%d More)',visibleChildren.length-expandedChildCount);}else if(treeElement.expandAllButtonElement){delete treeElement.expandAllButtonElement;}
if(node.isInsertionPoint()){for(const distributedNode of node.distributedNodes()){treeElement.appendChild(new Elements.ElementsTreeOutline.ShortcutTreeElement(distributedNode));}}
if(node.nodeType()===Node.ELEMENT_NODE&&treeElement.isExpandable()){this.insertChildElement(treeElement,node,treeElement.childCount(),true);}
this._treeElementsBeingUpdated.delete(treeElement);}
_markersChanged(event){const node=(event.data);const treeElement=node[this._treeElementSymbol];if(treeElement){treeElement.updateDecorations();}}};Elements.ElementsTreeOutline._treeOutlineSymbol=Symbol('treeOutline');Elements.ElementsTreeOutline.ClipboardData;Elements.ElementsTreeOutline.Events={SelectedNodeChanged:Symbol('SelectedNodeChanged'),ElementsTreeUpdated:Symbol('ElementsTreeUpdated')};Elements.ElementsTreeOutline.MappedCharToEntity={'\xA0':'nbsp','\x93':'#147','\xAD':'shy','\u2002':'ensp','\u2003':'emsp','\u2009':'thinsp','\u200a':'#8202','\u200b':'#8203','\u200c':'zwnj','\u200d':'zwj','\u200e':'lrm','\u200f':'rlm','\u202a':'#8234','\u202b':'#8235','\u202c':'#8236','\u202d':'#8237','\u202e':'#8238','\ufeff':'#65279'};Elements.ElementsTreeOutline.UpdateRecord=class{attributeModified(attrName){if(this._removedAttributes&&this._removedAttributes.has(attrName)){this._removedAttributes.delete(attrName);}
if(!this._modifiedAttributes){this._modifiedAttributes=(new Set());}
this._modifiedAttributes.add(attrName);}
attributeRemoved(attrName){if(this._modifiedAttributes&&this._modifiedAttributes.has(attrName)){this._modifiedAttributes.delete(attrName);}
if(!this._removedAttributes){this._removedAttributes=(new Set());}
this._removedAttributes.add(attrName);}
nodeInserted(node){this._hasChangedChildren=true;}
nodeRemoved(node){this._hasChangedChildren=true;this._hasRemovedChildren=true;}
charDataModified(){this._charDataModified=true;}
childrenModified(){this._hasChangedChildren=true;}
isAttributeModified(attributeName){return this._modifiedAttributes&&this._modifiedAttributes.has(attributeName);}
hasRemovedAttributes(){return!!this._removedAttributes&&!!this._removedAttributes.size;}
isCharDataModified(){return!!this._charDataModified;}
hasChangedChildren(){return!!this._hasChangedChildren;}
hasRemovedChildren(){return!!this._hasRemovedChildren;}};Elements.ElementsTreeOutline.Renderer=class{render(object){return new Promise(renderPromise);function renderPromise(resolve,reject){if(object instanceof SDK.DOMNode){onNodeResolved((object));}else if(object instanceof SDK.DeferredDOMNode){((object)).resolve(onNodeResolved);}else{reject(new Error('Can\'t reveal not a node.'));}
function onNodeResolved(node){if(!node){reject(new Error('Could not resolve node.'));return;}
const treeOutline=new Elements.ElementsTreeOutline(false,true,true);treeOutline.rootDOMNode=node;if(!treeOutline.firstChild().isExpandable()){treeOutline._element.classList.add('single-node');}
treeOutline.setVisible(true);treeOutline.element.treeElementForTest=treeOutline.firstChild();treeOutline.setShowSelectionOnKeyboardFocus(true,true);resolve({node:treeOutline.element,tree:treeOutline});}}}};Elements.ElementsTreeOutline.ShortcutTreeElement=class extends UI.TreeElement{constructor(nodeShortcut){super('');this.listItemElement.createChild('div','selection fill');const title=this.listItemElement.createChild('span','elements-tree-shortcut-title');let text=nodeShortcut.nodeName.toLowerCase();if(nodeShortcut.nodeType===Node.ELEMENT_NODE){text='<'+text+'>';}
title.textContent='\u21AA '+text;const link=Elements.DOMLinkifier.linkifyDeferredNodeReference(nodeShortcut.deferredNode);this.listItemElement.createTextChild(' ');link.classList.add('elements-tree-shortcut-link');link.textContent=Common.UIString('reveal');this.listItemElement.appendChild(link);this._nodeShortcut=nodeShortcut;}
get hovered(){return this._hovered;}
set hovered(x){if(this._hovered===x){return;}
this._hovered=x;this.listItemElement.classList.toggle('hovered',x);}
deferredNode(){return this._nodeShortcut.deferredNode;}
domModel(){return this._nodeShortcut.deferredNode.domModel();}
onselect(selectedByUser){if(!selectedByUser){return true;}
this._nodeShortcut.deferredNode.highlight();this._nodeShortcut.deferredNode.resolve(resolved.bind(this));function resolved(node){if(node){this.treeOutline._selectedDOMNode=node;this.treeOutline._selectedNodeChanged();}}
return true;}};;Elements.EventListenersWidget=class extends UI.ThrottledWidget{constructor(){super();this._toolbarItems=[];this._showForAncestorsSetting=Common.settings.moduleSetting('showEventListenersForAncestors');this._showForAncestorsSetting.addChangeListener(this.update.bind(this));this._dispatchFilterBySetting=Common.settings.createSetting('eventListenerDispatchFilterType',Elements.EventListenersWidget.DispatchFilterBy.All);this._dispatchFilterBySetting.addChangeListener(this.update.bind(this));this._showFrameworkListenersSetting=Common.settings.createSetting('showFrameowkrListeners',true);this._showFrameworkListenersSetting.setTitle(Common.UIString('Framework listeners'));this._showFrameworkListenersSetting.addChangeListener(this._showFrameworkListenersChanged.bind(this));this._eventListenersView=new EventListeners.EventListenersView(this.update.bind(this));this._eventListenersView.show(this.element);const refreshButton=new UI.ToolbarButton(Common.UIString('Refresh'),'largeicon-refresh');refreshButton.addEventListener(UI.ToolbarButton.Events.Click,this.update.bind(this));this._toolbarItems.push(refreshButton);this._toolbarItems.push(new UI.ToolbarSettingCheckbox(this._showForAncestorsSetting,Common.UIString('Show listeners on the ancestors'),Common.UIString('Ancestors')));const dispatchFilter=new UI.ToolbarComboBox(this._onDispatchFilterTypeChanged.bind(this),ls`Event listeners category`);function addDispatchFilterOption(name,value){const option=dispatchFilter.createOption(name,value);if(value===this._dispatchFilterBySetting.get()){dispatchFilter.select(option);}}
addDispatchFilterOption.call(this,Common.UIString('All'),Elements.EventListenersWidget.DispatchFilterBy.All);addDispatchFilterOption.call(this,Common.UIString('Passive'),Elements.EventListenersWidget.DispatchFilterBy.Passive);addDispatchFilterOption.call(this,Common.UIString('Blocking'),Elements.EventListenersWidget.DispatchFilterBy.Blocking);dispatchFilter.setMaxWidth(200);this._toolbarItems.push(dispatchFilter);this._toolbarItems.push(new UI.ToolbarSettingCheckbox(this._showFrameworkListenersSetting,Common.UIString('Resolve event listeners bound with framework')));UI.context.addFlavorChangeListener(SDK.DOMNode,this.update,this);this.update();}
doUpdate(){if(this._lastRequestedNode){this._lastRequestedNode.domModel().runtimeModel().releaseObjectGroup(Elements.EventListenersWidget._objectGroupName);delete this._lastRequestedNode;}
const node=UI.context.flavor(SDK.DOMNode);if(!node){this._eventListenersView.reset();this._eventListenersView.addEmptyHolderIfNeeded();return Promise.resolve();}
this._lastRequestedNode=node;const selectedNodeOnly=!this._showForAncestorsSetting.get();const promises=[];promises.push(node.resolveToObject(Elements.EventListenersWidget._objectGroupName));if(!selectedNodeOnly){let currentNode=node.parentNode;while(currentNode){promises.push(currentNode.resolveToObject(Elements.EventListenersWidget._objectGroupName));currentNode=currentNode.parentNode;}
promises.push(this._windowObjectInNodeContext(node));}
return Promise.all(promises).then(this._eventListenersView.addObjects.bind(this._eventListenersView)).then(this._showFrameworkListenersChanged.bind(this));}
toolbarItems(){return this._toolbarItems;}
_onDispatchFilterTypeChanged(event){this._dispatchFilterBySetting.set(event.target.value);}
_showFrameworkListenersChanged(){const dispatchFilter=this._dispatchFilterBySetting.get();const showPassive=dispatchFilter===Elements.EventListenersWidget.DispatchFilterBy.All||dispatchFilter===Elements.EventListenersWidget.DispatchFilterBy.Passive;const showBlocking=dispatchFilter===Elements.EventListenersWidget.DispatchFilterBy.All||dispatchFilter===Elements.EventListenersWidget.DispatchFilterBy.Blocking;this._eventListenersView.showFrameworkListeners(this._showFrameworkListenersSetting.get(),showPassive,showBlocking);}
_windowObjectInNodeContext(node){const executionContexts=node.domModel().runtimeModel().executionContexts();let context=null;if(node.frameId()){for(let i=0;i<executionContexts.length;++i){const executionContext=executionContexts[i];if(executionContext.frameId===node.frameId()&&executionContext.isDefault){context=executionContext;}}}else{context=executionContexts[0];}
return context.evaluate({expression:'self',objectGroup:Elements.EventListenersWidget._objectGroupName,includeCommandLineAPI:false,silent:true,returnByValue:false,generatePreview:false},false,false).then(result=>result.object||null);}
_eventListenersArrivedForTest(){}};Elements.EventListenersWidget.DispatchFilterBy={All:'All',Blocking:'Blocking',Passive:'Passive'};Elements.EventListenersWidget._objectGroupName='event-listeners-panel';;Elements.MarkerDecorator=function(){};Elements.MarkerDecorator.prototype={decorate(node){}};Elements.GenericDecorator=class{constructor(extension){this._title=Common.UIString(extension.title());this._color=extension.descriptor()['color'];}
decorate(node){return{title:this._title,color:this._color};}};;Elements.MetricsSidebarPane=class extends Elements.ElementsSidebarPane{constructor(){super();this.registerRequiredCSS('elements/metricsSidebarPane.css');this._inlineStyle=null;}
doUpdate(){if(this._isEditingMetrics){return Promise.resolve();}
const node=this.node();const cssModel=this.cssModel();if(!node||node.nodeType()!==Node.ELEMENT_NODE||!cssModel){this.contentElement.removeChildren();return Promise.resolve();}
function callback(style){if(!style||this.node()!==node){return;}
this._updateMetrics(style);}
function inlineStyleCallback(inlineStyleResult){if(inlineStyleResult&&this.node()===node){this._inlineStyle=inlineStyleResult.inlineStyle;}}
const promises=[cssModel.computedStylePromise(node.id).then(callback.bind(this)),cssModel.inlineStylesPromise(node.id).then(inlineStyleCallback.bind(this))];return Promise.all(promises);}
onCSSModelChanged(){this.update();}
_getPropertyValueAsPx(style,propertyName){return Number(style.get(propertyName).replace(/px$/,'')||0);}
_getBox(computedStyle,componentName){const suffix=componentName==='border'?'-width':'';const left=this._getPropertyValueAsPx(computedStyle,componentName+'-left'+suffix);const top=this._getPropertyValueAsPx(computedStyle,componentName+'-top'+suffix);const right=this._getPropertyValueAsPx(computedStyle,componentName+'-right'+suffix);const bottom=this._getPropertyValueAsPx(computedStyle,componentName+'-bottom'+suffix);return{left:left,top:top,right:right,bottom:bottom};}
_highlightDOMNode(showHighlight,mode,event){event.consume();if(showHighlight&&this.node()){if(this._highlightMode===mode){return;}
this._highlightMode=mode;this.node().highlight(mode);}else{delete this._highlightMode;SDK.OverlayModel.hideDOMNodeHighlight();}
for(let i=0;this._boxElements&&i<this._boxElements.length;++i){const element=this._boxElements[i];if(!this.node()||mode==='all'||element._name===mode){element.style.backgroundColor=element._backgroundColor;}else{element.style.backgroundColor='';}}}
_updateMetrics(style){const metricsElement=createElement('div');metricsElement.className='metrics';const self=this;function createBoxPartElement(style,name,side,suffix){const propertyName=(name!=='position'?name+'-':'')+side+suffix;let value=style.get(propertyName);if(value===''||(name!=='position'&&value==='0px')){value='\u2012';}else if(name==='position'&&value==='auto'){value='\u2012';}
value=value.replace(/px$/,'');value=Number.toFixedIfFloating(value);const element=createElement('div');element.className=side;element.textContent=value;element.addEventListener('dblclick',this.startEditing.bind(this,element,name,propertyName,style),false);return element;}
function getContentAreaWidthPx(style){let width=style.get('width').replace(/px$/,'');if(!isNaN(width)&&style.get('box-sizing')==='border-box'){const borderBox=self._getBox(style,'border');const paddingBox=self._getBox(style,'padding');width=width-borderBox.left-borderBox.right-paddingBox.left-paddingBox.right;}
return Number.toFixedIfFloating(width.toString());}
function getContentAreaHeightPx(style){let height=style.get('height').replace(/px$/,'');if(!isNaN(height)&&style.get('box-sizing')==='border-box'){const borderBox=self._getBox(style,'border');const paddingBox=self._getBox(style,'padding');height=height-borderBox.top-borderBox.bottom-paddingBox.top-paddingBox.bottom;}
return Number.toFixedIfFloating(height.toString());}
const noMarginDisplayType={'table-cell':true,'table-column':true,'table-column-group':true,'table-footer-group':true,'table-header-group':true,'table-row':true,'table-row-group':true};const noPaddingDisplayType={'table-column':true,'table-column-group':true,'table-footer-group':true,'table-header-group':true,'table-row':true,'table-row-group':true};const noPositionType={'static':true};const boxes=['content','padding','border','margin','position'];const boxColors=[Common.Color.PageHighlight.Content,Common.Color.PageHighlight.Padding,Common.Color.PageHighlight.Border,Common.Color.PageHighlight.Margin,Common.Color.fromRGBA([0,0,0,0])];const boxLabels=[Common.UIString('content'),Common.UIString('padding'),Common.UIString('border'),Common.UIString('margin'),Common.UIString('position')];let previousBox=null;this._boxElements=[];for(let i=0;i<boxes.length;++i){const name=boxes[i];if(name==='margin'&&noMarginDisplayType[style.get('display')]){continue;}
if(name==='padding'&&noPaddingDisplayType[style.get('display')]){continue;}
if(name==='position'&&noPositionType[style.get('position')]){continue;}
const boxElement=createElement('div');boxElement.className=name;boxElement._backgroundColor=boxColors[i].asString(Common.Color.Format.RGBA);boxElement._name=name;boxElement.style.backgroundColor=boxElement._backgroundColor;boxElement.addEventListener('mouseover',this._highlightDOMNode.bind(this,true,name==='position'?'all':name),false);this._boxElements.push(boxElement);if(name==='content'){const widthElement=createElement('span');widthElement.textContent=getContentAreaWidthPx(style);widthElement.addEventListener('dblclick',this.startEditing.bind(this,widthElement,'width','width',style),false);const heightElement=createElement('span');heightElement.textContent=getContentAreaHeightPx(style);heightElement.addEventListener('dblclick',this.startEditing.bind(this,heightElement,'height','height',style),false);boxElement.appendChild(widthElement);boxElement.createTextChild(' \u00D7 ');boxElement.appendChild(heightElement);}else{const suffix=(name==='border'?'-width':'');const labelElement=createElement('div');labelElement.className='label';labelElement.textContent=boxLabels[i];boxElement.appendChild(labelElement);boxElement.appendChild(createBoxPartElement.call(this,style,name,'top',suffix));boxElement.appendChild(createElement('br'));boxElement.appendChild(createBoxPartElement.call(this,style,name,'left',suffix));if(previousBox){boxElement.appendChild(previousBox);}
boxElement.appendChild(createBoxPartElement.call(this,style,name,'right',suffix));boxElement.appendChild(createElement('br'));boxElement.appendChild(createBoxPartElement.call(this,style,name,'bottom',suffix));}
previousBox=boxElement;}
metricsElement.appendChild(previousBox);metricsElement.addEventListener('mouseover',this._highlightDOMNode.bind(this,false,'all'),false);this.contentElement.removeChildren();this.contentElement.appendChild(metricsElement);Host.userMetrics.panelLoaded('elements','DevTools.Launch.Elements');}
startEditing(targetElement,box,styleProperty,computedStyle){if(UI.isBeingEdited(targetElement)){return;}
const context={box:box,styleProperty:styleProperty,computedStyle:computedStyle};const boundKeyDown=this._handleKeyDown.bind(this,context,styleProperty);context.keyDownHandler=boundKeyDown;targetElement.addEventListener('keydown',boundKeyDown,false);this._isEditingMetrics=true;const config=new UI.InplaceEditor.Config(this._editingCommitted.bind(this),this.editingCancelled.bind(this),context);UI.InplaceEditor.startEditing(targetElement,config);targetElement.getComponentSelection().selectAllChildren(targetElement);}
_handleKeyDown(context,styleProperty,event){const element=event.currentTarget;function finishHandler(originalValue,replacementString){this._applyUserInput(element,replacementString,originalValue,context,false);}
function customNumberHandler(prefix,number,suffix){if(styleProperty!=='margin'&&number<0){number=0;}
return prefix+number+suffix;}
UI.handleElementValueModifications(event,element,finishHandler.bind(this),undefined,customNumberHandler);}
editingEnded(element,context){delete this.originalPropertyData;delete this.previousPropertyDataCandidate;element.removeEventListener('keydown',context.keyDownHandler,false);delete this._isEditingMetrics;}
editingCancelled(element,context){if('originalPropertyData'in this&&this._inlineStyle){if(!this.originalPropertyData){const pastLastSourcePropertyIndex=this._inlineStyle.pastLastSourcePropertyIndex();if(pastLastSourcePropertyIndex){this._inlineStyle.allProperties()[pastLastSourcePropertyIndex-1].setText('',false);}}else{this._inlineStyle.allProperties()[this.originalPropertyData.index].setText(this.originalPropertyData.propertyText,false);}}
this.editingEnded(element,context);this.update();}
_applyUserInput(element,userInput,previousContent,context,commitEditor){if(!this._inlineStyle){return this.editingCancelled(element,context);}
if(commitEditor&&userInput===previousContent){return this.editingCancelled(element,context);}
if(context.box!=='position'&&(!userInput||userInput==='\u2012')){userInput='0px';}else if(context.box==='position'&&(!userInput||userInput==='\u2012')){userInput='auto';}
userInput=userInput.toLowerCase();if(/^\d+$/.test(userInput)){userInput+='px';}
const styleProperty=context.styleProperty;const computedStyle=context.computedStyle;if(computedStyle.get('box-sizing')==='border-box'&&(styleProperty==='width'||styleProperty==='height')){if(!userInput.match(/px$/)){Common.console.error('For elements with box-sizing: border-box, only absolute content area dimensions can be applied');return;}
const borderBox=this._getBox(computedStyle,'border');const paddingBox=this._getBox(computedStyle,'padding');let userValuePx=Number(userInput.replace(/px$/,''));if(isNaN(userValuePx)){return;}
if(styleProperty==='width'){userValuePx+=borderBox.left+borderBox.right+paddingBox.left+paddingBox.right;}else{userValuePx+=borderBox.top+borderBox.bottom+paddingBox.top+paddingBox.bottom;}
userInput=userValuePx+'px';}
this.previousPropertyDataCandidate=null;const allProperties=this._inlineStyle.allProperties();for(let i=0;i<allProperties.length;++i){const property=allProperties[i];if(property.name!==context.styleProperty||!property.activeInStyle()){continue;}
this.previousPropertyDataCandidate=property;property.setValue(userInput,commitEditor,true,callback.bind(this));return;}
this._inlineStyle.appendProperty(context.styleProperty,userInput,callback.bind(this));function callback(success){if(!success){return;}
if(!('originalPropertyData'in this)){this.originalPropertyData=this.previousPropertyDataCandidate;}
if(typeof this._highlightMode!=='undefined'){this.node().highlight(this._highlightMode);}
if(commitEditor){this.update();}}}
_editingCommitted(element,userInput,previousContent,context){this.editingEnded(element,context);this._applyUserInput(element,userInput,previousContent,context,true);}};;Elements.PlatformFontsWidget=class extends UI.ThrottledWidget{constructor(sharedModel){super(true);this.registerRequiredCSS('elements/platformFontsWidget.css');this._sharedModel=sharedModel;this._sharedModel.addEventListener(Elements.ComputedStyleModel.Events.ComputedStyleChanged,this.update,this);this._sectionTitle=createElementWithClass('div','title');this.contentElement.classList.add('platform-fonts');this.contentElement.appendChild(this._sectionTitle);this._sectionTitle.textContent=Common.UIString('Rendered Fonts');this._fontStatsSection=this.contentElement.createChild('div','stats-section');}
doUpdate(){const cssModel=this._sharedModel.cssModel();const node=this._sharedModel.node();if(!node||!cssModel){return Promise.resolve();}
return cssModel.platformFontsPromise(node.id).then(this._refreshUI.bind(this,node));}
_refreshUI(node,platformFonts){if(this._sharedModel.node()!==node){return;}
this._fontStatsSection.removeChildren();const isEmptySection=!platformFonts||!platformFonts.length;this._sectionTitle.classList.toggle('hidden',isEmptySection);if(isEmptySection){return;}
platformFonts.sort(function(a,b){return b.glyphCount-a.glyphCount;});for(let i=0;i<platformFonts.length;++i){const fontStatElement=this._fontStatsSection.createChild('div','font-stats-item');const fontNameElement=fontStatElement.createChild('span','font-name');fontNameElement.textContent=platformFonts[i].familyName;const fontDelimeterElement=fontStatElement.createChild('span','font-delimeter');fontDelimeterElement.textContent='\u2014';const fontOrigin=fontStatElement.createChild('span');fontOrigin.textContent=platformFonts[i].isCustomFont?Common.UIString('Network resource'):Common.UIString('Local file');const fontUsageElement=fontStatElement.createChild('span','font-usage');const usage=platformFonts[i].glyphCount;fontUsageElement.textContent=usage===1?Common.UIString('(%d glyph)',usage):Common.UIString('(%d glyphs)',usage);}}};;Elements.PropertiesWidget=class extends UI.ThrottledWidget{constructor(){super(true);this.registerRequiredCSS('elements/propertiesWidget.css');SDK.targetManager.addModelListener(SDK.DOMModel,SDK.DOMModel.Events.AttrModified,this._onNodeChange,this);SDK.targetManager.addModelListener(SDK.DOMModel,SDK.DOMModel.Events.AttrRemoved,this._onNodeChange,this);SDK.targetManager.addModelListener(SDK.DOMModel,SDK.DOMModel.Events.CharacterDataModified,this._onNodeChange,this);SDK.targetManager.addModelListener(SDK.DOMModel,SDK.DOMModel.Events.ChildNodeCountUpdated,this._onNodeChange,this);UI.context.addFlavorChangeListener(SDK.DOMNode,this._setNode,this);this._node=UI.context.flavor(SDK.DOMNode);this._treeOutline=new ObjectUI.ObjectPropertiesSectionsTreeOutline({readOnly:true});this._treeOutline.setShowSelectionOnKeyboardFocus(true,false);this._expandController=new ObjectUI.ObjectPropertiesSectionsTreeExpandController(this._treeOutline);this.contentElement.appendChild(this._treeOutline.element);this._treeOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded,()=>{Host.userMetrics.actionTaken(Host.UserMetrics.Action.DOMPropertiesExpanded);});this.update();}
_setNode(event){this._node=(event.data);this.update();}
async doUpdate(){if(this._lastRequestedNode){this._lastRequestedNode.domModel().runtimeModel().releaseObjectGroup(Elements.PropertiesWidget._objectGroupName);delete this._lastRequestedNode;}
if(!this._node){this.contentElement.removeChildren();return;}
this._lastRequestedNode=this._node;const object=await this._node.resolveToObject(Elements.PropertiesWidget._objectGroupName);if(!object){return;}
const result=await object.callFunction(protoList);object.release();if(!result.object||result.wasThrown){return;}
const propertiesResult=await result.object.getOwnProperties(false);result.object.release();if(!propertiesResult||!propertiesResult.properties){return;}
const properties=propertiesResult.properties;this._treeOutline.removeChildren();let selected=false;for(let i=0;i<properties.length;++i){if(!parseInt(properties[i].name,10)){continue;}
const property=properties[i].value;let title=property.description;title=title.replace(/Prototype$/,'');const section=this._createSectionTreeElement(property,title);this._treeOutline.appendChild(section);if(!selected){section.select(true,false);selected=true;}}
function protoList(){let proto=this;const result={__proto__:null};let counter=1;while(proto){result[counter++]=proto;proto=proto.__proto__;}
return result;}}
_createSectionTreeElement(property,title){const titleElement=createElementWithClass('span','tree-element-title');titleElement.textContent=title;const section=new ObjectUI.ObjectPropertiesSection.RootElement(property);section.title=titleElement;this._expandController.watchSection(title,section);return section;}
_onNodeChange(event){if(!this._node){return;}
const data=event.data;const node=(data instanceof SDK.DOMNode?data:data.node);if(this._node!==node){return;}
this.update();}};Elements.PropertiesWidget._objectGroupName='properties-sidebar-pane';;Elements.NodeStackTraceWidget=class extends UI.ThrottledWidget{constructor(){super(true);this.registerRequiredCSS('elements/nodeStackTraceWidget.css');this._noStackTraceElement=this.contentElement.createChild('div','gray-info-message');this._noStackTraceElement.textContent=ls`No stack trace available`;this._creationStackTraceElement=this.contentElement.createChild('div','stack-trace');this._linkifier=new Components.Linkifier(Elements.NodeStackTraceWidget.MaxLengthForLinks);}
wasShown(){UI.context.addFlavorChangeListener(SDK.DOMNode,this.update,this);this.update();}
willHide(){UI.context.removeFlavorChangeListener(SDK.DOMNode,this.update,this);}
async doUpdate(){const node=UI.context.flavor(SDK.DOMNode);if(!node){this._noStackTraceElement.classList.remove('hidden');this._creationStackTraceElement.classList.add('hidden');return;}
const creationStackTrace=await node.creationStackTrace();if(creationStackTrace){this._noStackTraceElement.classList.add('hidden');this._creationStackTraceElement.classList.remove('hidden');const stackTracePreview=Components.JSPresentationUtils.buildStackTracePreviewContents(node.domModel().target(),this._linkifier,creationStackTrace);this._creationStackTraceElement.removeChildren();this._creationStackTraceElement.appendChild(stackTracePreview.element);}else{this._noStackTraceElement.classList.remove('hidden');this._creationStackTraceElement.classList.add('hidden');}}};Elements.NodeStackTraceWidget.MaxLengthForLinks=40;;Elements.StylePropertyHighlighter=class{constructor(ssp,cssProperty){this._styleSidebarPane=ssp;this._cssProperty=cssProperty;}
perform(){for(const section of this._styleSidebarPane.allSections()){for(let treeElement=section.propertiesTreeOutline.firstChild();treeElement;treeElement=treeElement.nextSibling){treeElement.onpopulate();}}
let highlightTreeElement=null;for(const section of this._styleSidebarPane.allSections()){let treeElement=section.propertiesTreeOutline.firstChild();while(treeElement&&!highlightTreeElement){if(treeElement.property===this._cssProperty){highlightTreeElement=treeElement;break;}
treeElement=treeElement.traverseNextTreeElement(false,null,true);}
if(highlightTreeElement){break;}}
if(!highlightTreeElement){return;}
highlightTreeElement.parent.expand();highlightTreeElement.listItemElement.scrollIntoViewIfNeeded();highlightTreeElement.listItemElement.animate([{offset:0,backgroundColor:'rgba(255, 255, 0, 0.2)'},{offset:0.1,backgroundColor:'rgba(255, 255, 0, 0.7)'},{offset:1,backgroundColor:'transparent'}],{duration:2000,easing:'cubic-bezier(0, 0, 0.2, 1)'});}};;Elements.StylesSidebarPane=class extends Elements.ElementsSidebarPane{constructor(){super(true);this.setMinimumSize(96,26);this.registerRequiredCSS('elements/stylesSidebarPane.css');Common.moduleSetting('colorFormat').addChangeListener(this.update.bind(this));Common.moduleSetting('textEditorIndent').addChangeListener(this.update.bind(this));this._currentToolbarPane=null;this._animatedToolbarPane=null;this._pendingWidget=null;this._pendingWidgetToggle=null;this._toolbarPaneElement=this._createStylesSidebarToolbar();this._noMatchesElement=this.contentElement.createChild('div','gray-info-message hidden');this._noMatchesElement.textContent=ls`No matching selector or style`;this._sectionsContainer=this.contentElement.createChild('div');UI.ARIAUtils.markAsTree(this._sectionsContainer);this._sectionsContainer.addEventListener('keydown',this._sectionsContainerKeyDown.bind(this),false);this._sectionsContainer.addEventListener('focusin',this._sectionsContainerFocusChanged.bind(this),false);this._sectionsContainer.addEventListener('focusout',this._sectionsContainerFocusChanged.bind(this),false);this._swatchPopoverHelper=new InlineEditor.SwatchPopoverHelper();this._linkifier=new Components.Linkifier(Elements.StylesSidebarPane._maxLinkLength,true);this._decorator=null;this._userOperation=false;this._isEditingStyle=false;this._filterRegex=null;this._isActivePropertyHighlighted=false;this.contentElement.classList.add('styles-pane');this._sectionBlocks=[];this._needsForceUpdate=false;Elements.StylesSidebarPane._instance=this;UI.context.addFlavorChangeListener(SDK.DOMNode,this.forceUpdate,this);this.contentElement.addEventListener('copy',this._clipboardCopy.bind(this));this._resizeThrottler=new Common.Throttler(100);}
swatchPopoverHelper(){return this._swatchPopoverHelper;}
setUserOperation(userOperation){this._userOperation=userOperation;}
static createExclamationMark(property){const exclamationElement=createElement('span','dt-icon-label');exclamationElement.className='exclamation-mark';if(!Elements.StylesSidebarPane.ignoreErrorsForProperty(property)){exclamationElement.type='smallicon-warning';}
exclamationElement.title=SDK.cssMetadata().isCSSPropertyName(property.name)?Common.UIString('Invalid property value'):Common.UIString('Unknown property name');return exclamationElement;}
static ignoreErrorsForProperty(property){function hasUnknownVendorPrefix(string){return!string.startsWith('-webkit-')&&/^[-_][\w\d]+-\w/.test(string);}
const name=property.name.toLowerCase();if(name.charAt(0)==='_'){return true;}
if(name==='filter'){return true;}
if(name.startsWith('scrollbar-')){return true;}
if(hasUnknownVendorPrefix(name)){return true;}
const value=property.value.toLowerCase();if(value.endsWith('\\9')){return true;}
if(hasUnknownVendorPrefix(value)){return true;}
return false;}
static createPropertyFilterElement(placeholder,container,filterCallback){const input=createElementWithClass('input');input.placeholder=placeholder;function searchHandler(){const regex=input.value?new RegExp(input.value.escapeForRegExp(),'i'):null;filterCallback(regex);}
input.addEventListener('input',searchHandler,false);function keydownHandler(event){if(event.key!=='Escape'||!input.value){return;}
event.consume(true);input.value='';searchHandler();}
input.addEventListener('keydown',keydownHandler,false);input.setFilterValue=setFilterValue;function setFilterValue(value){input.value=value;input.focus();searchHandler();}
return input;}
revealProperty(cssProperty){this._decorator=new Elements.StylePropertyHighlighter(this,cssProperty);this._decorator.perform();this.update();}
forceUpdate(){this._needsForceUpdate=true;this._swatchPopoverHelper.hide();this._resetCache();this.update();}
_sectionsContainerKeyDown(event){const activeElement=this._sectionsContainer.ownerDocument.deepActiveElement();if(!activeElement){return;}
const section=activeElement._section;if(!section){return;}
switch(event.key){case'ArrowUp':case'ArrowLeft':const sectionToFocus=section.previousSibling()||section.lastSibling();sectionToFocus.element.focus();event.consume(true);break;case'ArrowDown':case'ArrowRight':{const sectionToFocus=section.nextSibling()||section.firstSibling();sectionToFocus.element.focus();event.consume(true);break;}
case'Home':section.firstSibling().element.focus();event.consume(true);break;case'End':section.lastSibling().element.focus();event.consume(true);break;}}
_sectionsContainerFocusChanged(){this.resetFocus();}
resetFocus(){if(this._sectionBlocks[0]&&this._sectionBlocks[0].sections[0]){this._sectionBlocks[0].sections[0].element.tabIndex=this._sectionsContainer.hasFocus()?-1:0;}}
_onAddButtonLongClick(event){const cssModel=this.cssModel();if(!cssModel){return;}
const headers=cssModel.styleSheetHeaders().filter(styleSheetResourceHeader);const contextMenuDescriptors=[];for(let i=0;i<headers.length;++i){const header=headers[i];const handler=this._createNewRuleInStyleSheet.bind(this,header);contextMenuDescriptors.push({text:Bindings.displayNameForURL(header.resourceURL()),handler:handler});}
contextMenuDescriptors.sort(compareDescriptors);const contextMenu=new UI.ContextMenu(event);for(let i=0;i<contextMenuDescriptors.length;++i){const descriptor=contextMenuDescriptors[i];contextMenu.defaultSection().appendItem(descriptor.text,descriptor.handler);}
contextMenu.footerSection().appendItem('inspector-stylesheet',this._createNewRuleInViaInspectorStyleSheet.bind(this));contextMenu.show();function compareDescriptors(descriptor1,descriptor2){return String.naturalOrderComparator(descriptor1.text,descriptor2.text);}
function styleSheetResourceHeader(header){return!header.isViaInspector()&&!header.isInline&&!!header.resourceURL();}}
_onFilterChanged(regex){this._filterRegex=regex;this._updateFilter();}
_refreshUpdate(editedSection,editedTreeElement){if(editedTreeElement){for(const section of this.allSections()){if(section.isBlank){continue;}
section._updateVarFunctions(editedTreeElement);}}
if(this._isEditingStyle){return;}
const node=this.node();if(!node){return;}
for(const section of this.allSections()){if(section.isBlank){continue;}
section.update(section===editedSection);}
if(this._filterRegex){this._updateFilter();}
this._nodeStylesUpdatedForTest(node,false);}
doUpdate(){return this._fetchMatchedCascade().then(this._innerRebuildUpdate.bind(this));}
onResize(){this._resizeThrottler.schedule(this._innerResize.bind(this));}
_innerResize(){const width=this.contentElement.getBoundingClientRect().width+'px';this.allSections().forEach(section=>section.propertiesTreeOutline.element.style.width=width);return Promise.resolve();}
_resetCache(){if(this.cssModel()){this.cssModel().discardCachedMatchedCascade();}}
_fetchMatchedCascade(){const node=this.node();if(!node||!this.cssModel()){return Promise.resolve((null));}
return this.cssModel().cachedMatchedCascadeForNode(node).then(validateStyles.bind(this));function validateStyles(matchedStyles){return matchedStyles&&matchedStyles.node()===this.node()?matchedStyles:null;}}
setEditingStyle(editing,treeElement){if(this._isEditingStyle===editing){return;}
this.contentElement.classList.toggle('is-editing-style',editing);this._isEditingStyle=editing;this._setActiveProperty(null);}
_setActiveProperty(treeElement){if(this._isActivePropertyHighlighted){SDK.OverlayModel.hideDOMNodeHighlight();}
this._isActivePropertyHighlighted=false;if(!this.node()){return;}
if(!treeElement||treeElement.overloaded()||treeElement.inherited()){return;}
const rule=treeElement.property.ownerStyle.parentRule;const selectorList=rule?rule.selectorText():undefined;for(const mode of['padding','border','margin']){if(!treeElement.name.startsWith(mode)){continue;}
this.node().domModel().overlayModel().highlightInOverlay({node:(this.node()),selectorList},mode);this._isActivePropertyHighlighted=true;break;}}
onCSSModelChanged(event){const edit=event&&event.data?(event.data.edit):null;if(edit){for(const section of this.allSections()){section._styleSheetEdited(edit);}
return;}
if(this._userOperation||this._isEditingStyle){return;}
this._resetCache();this.update();}
focusedSectionIndex(){let index=0;for(const block of this._sectionBlocks){for(const section of block.sections){if(section.element.hasFocus()){return index;}
index++;}}
return-1;}
continueEditingElement(sectionIndex,propertyIndex){const section=this.allSections()[sectionIndex];if(section){section.propertiesTreeOutline.rootElement().childAt(propertyIndex).startEditing();}}
async _innerRebuildUpdate(matchedStyles){if(this._needsForceUpdate){this._needsForceUpdate=false;}else if(this._isEditingStyle||this._userOperation){return;}
const focusedIndex=this.focusedSectionIndex();this._linkifier.reset();this._sectionsContainer.removeChildren();this._sectionBlocks=[];const node=this.node();if(!matchedStyles||!node){this._noMatchesElement.classList.remove('hidden');return;}
this._sectionBlocks=await this._rebuildSectionsForMatchedStyleRules((matchedStyles));let pseudoTypes=[];const keys=matchedStyles.pseudoTypes();if(keys.delete(Protocol.DOM.PseudoType.Before)){pseudoTypes.push(Protocol.DOM.PseudoType.Before);}
pseudoTypes=pseudoTypes.concat(keys.valuesArray().sort());for(const pseudoType of pseudoTypes){const block=Elements.SectionBlock.createPseudoTypeBlock(pseudoType);for(const style of matchedStyles.pseudoStyles(pseudoType)){const section=new Elements.StylePropertiesSection(this,matchedStyles,style);block.sections.push(section);}
this._sectionBlocks.push(block);}
for(const keyframesRule of matchedStyles.keyframes()){const block=Elements.SectionBlock.createKeyframesBlock(keyframesRule.name().text);for(const keyframe of keyframesRule.keyframes()){block.sections.push(new Elements.KeyframePropertiesSection(this,matchedStyles,keyframe.style));}
this._sectionBlocks.push(block);}
let index=0;for(const block of this._sectionBlocks){const titleElement=block.titleElement();if(titleElement){this._sectionsContainer.appendChild(titleElement);}
for(const section of block.sections){this._sectionsContainer.appendChild(section.element);if(index===focusedIndex){section.element.focus();}
index++;}}
if(focusedIndex>=index){this._sectionBlocks[0].sections[0].element.focus();}
this._sectionsContainerFocusChanged();if(this._filterRegex){this._updateFilter();}else{this._noMatchesElement.classList.toggle('hidden',this._sectionBlocks.length>0);}
this._nodeStylesUpdatedForTest((node),true);if(this._decorator){this._decorator.perform();this._decorator=null;}}
_nodeStylesUpdatedForTest(node,rebuild){}
async _rebuildSectionsForMatchedStyleRules(matchedStyles){const blocks=[new Elements.SectionBlock(null)];let lastParentNode=null;for(const style of matchedStyles.nodeStyles()){const parentNode=matchedStyles.isInherited(style)?matchedStyles.nodeForStyle(style):null;if(parentNode&&parentNode!==lastParentNode){lastParentNode=parentNode;const block=await Elements.SectionBlock._createInheritedNodeBlock(lastParentNode);blocks.push(block);}
const section=new Elements.StylePropertiesSection(this,matchedStyles,style);blocks.peekLast().sections.push(section);}
return blocks;}
async _createNewRuleInViaInspectorStyleSheet(){const cssModel=this.cssModel();const node=this.node();if(!cssModel||!node){return;}
this.setUserOperation(true);const styleSheetHeader=await cssModel.requestViaInspectorStylesheet((node));this.setUserOperation(false);await this._createNewRuleInStyleSheet(styleSheetHeader);}
async _createNewRuleInStyleSheet(styleSheetHeader){if(!styleSheetHeader){return;}
const text=(await styleSheetHeader.requestContent()).content||'';const lines=text.split('\n');const range=TextUtils.TextRange.createFromLocation(lines.length-1,lines[lines.length-1].length);this._addBlankSection(this._sectionBlocks[0].sections[0],styleSheetHeader.id,range);}
_addBlankSection(insertAfterSection,styleSheetId,ruleLocation){const node=this.node();const blankSection=new Elements.BlankStylePropertiesSection(this,insertAfterSection._matchedStyles,node?node.simpleSelector():'',styleSheetId,ruleLocation,insertAfterSection._style);this._sectionsContainer.insertBefore(blankSection.element,insertAfterSection.element.nextSibling);for(const block of this._sectionBlocks){const index=block.sections.indexOf(insertAfterSection);if(index===-1){continue;}
block.sections.splice(index+1,0,blankSection);blankSection.startEditingSelector();}}
removeSection(section){for(const block of this._sectionBlocks){const index=block.sections.indexOf(section);if(index===-1){continue;}
block.sections.splice(index,1);section.element.remove();}}
filterRegex(){return this._filterRegex;}
_updateFilter(){let hasAnyVisibleBlock=false;for(const block of this._sectionBlocks){hasAnyVisibleBlock|=block.updateFilter();}
this._noMatchesElement.classList.toggle('hidden',!!hasAnyVisibleBlock);}
willHide(){this._swatchPopoverHelper.hide();super.willHide();}
allSections(){let sections=[];for(const block of this._sectionBlocks){sections=sections.concat(block.sections);}
return sections;}
_clipboardCopy(event){Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleCopied);}
_createStylesSidebarToolbar(){const container=this.contentElement.createChild('div','styles-sidebar-pane-toolbar-container');const hbox=container.createChild('div','hbox styles-sidebar-pane-toolbar');const filterContainerElement=hbox.createChild('div','styles-sidebar-pane-filter-box');const filterInput=Elements.StylesSidebarPane.createPropertyFilterElement(ls`Filter`,hbox,this._onFilterChanged.bind(this));UI.ARIAUtils.setAccessibleName(filterInput,Common.UIString('Filter Styles'));filterContainerElement.appendChild(filterInput);const toolbar=new UI.Toolbar('styles-pane-toolbar',hbox);toolbar.makeToggledGray();toolbar.appendItemsAtLocation('styles-sidebarpane-toolbar');const toolbarPaneContainer=container.createChild('div','styles-sidebar-toolbar-pane-container');const toolbarPaneContent=toolbarPaneContainer.createChild('div','styles-sidebar-toolbar-pane');return toolbarPaneContent;}
showToolbarPane(widget,toggle){if(this._pendingWidgetToggle){this._pendingWidgetToggle.setToggled(false);}
this._pendingWidgetToggle=toggle;if(this._animatedToolbarPane){this._pendingWidget=widget;}else{this._startToolbarPaneAnimation(widget);}
if(widget&&toggle){toggle.setToggled(true);}}
_startToolbarPaneAnimation(widget){if(widget===this._currentToolbarPane){return;}
if(widget&&this._currentToolbarPane){this._currentToolbarPane.detach();widget.show(this._toolbarPaneElement);this._currentToolbarPane=widget;this._currentToolbarPane.focus();return;}
this._animatedToolbarPane=widget;if(this._currentToolbarPane){this._toolbarPaneElement.style.animationName='styles-element-state-pane-slideout';}else if(widget){this._toolbarPaneElement.style.animationName='styles-element-state-pane-slidein';}
if(widget){widget.show(this._toolbarPaneElement);}
const listener=onAnimationEnd.bind(this);this._toolbarPaneElement.addEventListener('animationend',listener,false);function onAnimationEnd(){this._toolbarPaneElement.style.removeProperty('animation-name');this._toolbarPaneElement.removeEventListener('animationend',listener,false);if(this._currentToolbarPane){this._currentToolbarPane.detach();}
this._currentToolbarPane=this._animatedToolbarPane;if(this._currentToolbarPane){this._currentToolbarPane.focus();}
this._animatedToolbarPane=null;if(this._pendingWidget){this._startToolbarPaneAnimation(this._pendingWidget);this._pendingWidget=null;}}}};Elements.StylesSidebarPane._maxLinkLength=23;Elements.SectionBlock=class{constructor(titleElement){this._titleElement=titleElement;this.sections=[];}
static createPseudoTypeBlock(pseudoType){const separatorElement=createElement('div');separatorElement.className='sidebar-separator';separatorElement.textContent=Common.UIString('Pseudo ::%s element',pseudoType);return new Elements.SectionBlock(separatorElement);}
static createKeyframesBlock(keyframesName){const separatorElement=createElement('div');separatorElement.className='sidebar-separator';separatorElement.textContent=`@keyframes ${keyframesName}`;return new Elements.SectionBlock(separatorElement);}
static async _createInheritedNodeBlock(node){const separatorElement=createElement('div');separatorElement.className='sidebar-separator';separatorElement.createTextChild(ls`Inherited from${' '}`);const link=await Common.Linkifier.linkify(node,{preventKeyboardFocus:true});separatorElement.appendChild(link);return new Elements.SectionBlock(separatorElement);}
updateFilter(){let hasAnyVisibleSection=false;for(const section of this.sections){hasAnyVisibleSection|=section._updateFilter();}
if(this._titleElement){this._titleElement.classList.toggle('hidden',!hasAnyVisibleSection);}
return!!hasAnyVisibleSection;}
titleElement(){return this._titleElement;}};Elements.StylePropertiesSection=class{constructor(parentPane,matchedStyles,style){this._parentPane=parentPane;this._style=style;this._matchedStyles=matchedStyles;this.editable=!!(style.styleSheetId&&style.range);this._hoverTimer=null;this._willCauseCancelEditing=false;this._forceShowAll=false;this._originalPropertiesCount=style.leadingProperties().length;const rule=style.parentRule;this.element=createElementWithClass('div','styles-section matched-styles monospace');this.element.tabIndex=-1;UI.ARIAUtils.markAsTreeitem(this.element);this.element.addEventListener('keydown',this._onKeyDown.bind(this),false);this.element._section=this;this._innerElement=this.element.createChild('div');this._titleElement=this._innerElement.createChild('div','styles-section-title '+(rule?'styles-selector':''));this.propertiesTreeOutline=new UI.TreeOutlineInShadow();this.propertiesTreeOutline.setFocusable(false);this.propertiesTreeOutline.registerRequiredCSS('elements/stylesSectionTree.css');this.propertiesTreeOutline.element.classList.add('style-properties','matched-styles','monospace');this.propertiesTreeOutline.section=this;this._innerElement.appendChild(this.propertiesTreeOutline.element);this._showAllButton=UI.createTextButton('',this._showAllItems.bind(this),'styles-show-all');this._innerElement.appendChild(this._showAllButton);const selectorContainer=createElement('div');this._selectorElement=createElementWithClass('span','selector');this._selectorElement.textContent=this._headerText();selectorContainer.appendChild(this._selectorElement);this._selectorElement.addEventListener('mouseenter',this._onMouseEnterSelector.bind(this),false);this._selectorElement.addEventListener('mousemove',event=>event.consume(),false);this._selectorElement.addEventListener('mouseleave',this._onMouseOutSelector.bind(this),false);const openBrace=selectorContainer.createChild('span','sidebar-pane-open-brace');openBrace.textContent=' {';selectorContainer.addEventListener('mousedown',this._handleEmptySpaceMouseDown.bind(this),false);selectorContainer.addEventListener('click',this._handleSelectorContainerClick.bind(this),false);const closeBrace=this._innerElement.createChild('div','sidebar-pane-closing-brace');closeBrace.textContent='}';this._createHoverMenuToolbar(closeBrace);this._selectorElement.addEventListener('click',this._handleSelectorClick.bind(this),false);this.element.addEventListener('mousedown',this._handleEmptySpaceMouseDown.bind(this),false);this.element.addEventListener('click',this._handleEmptySpaceClick.bind(this),false);this.element.addEventListener('mousemove',this._onMouseMove.bind(this),false);this.element.addEventListener('mouseleave',this._onMouseLeave.bind(this),false);this._selectedSinceMouseDown=false;if(rule){if(rule.isUserAgent()||rule.isInjected()){this.editable=false;}else{if(rule.styleSheetId){const header=rule.cssModel().styleSheetHeaderForId(rule.styleSheetId);this.navigable=!header.isAnonymousInlineStyleSheet();}}}
this._mediaListElement=this._titleElement.createChild('div','media-list media-matches');this._selectorRefElement=this._titleElement.createChild('div','styles-section-subtitle');this._updateMediaList();this._updateRuleOrigin();this._titleElement.appendChild(selectorContainer);this._selectorContainer=selectorContainer;if(this.navigable){this.element.classList.add('navigable');}
if(!this.editable){this.element.classList.add('read-only');this.propertiesTreeOutline.element.classList.add('read-only');}
this._hoverableSelectorsMode=false;this._markSelectorMatches();this.onpopulate();}
static createRuleOriginNode(matchedStyles,linkifier,rule){if(!rule){return createTextNode('');}
const ruleLocation=this._getRuleLocationFromCSSRule(rule);const header=rule.styleSheetId?matchedStyles.cssModel().styleSheetHeaderForId(rule.styleSheetId):null;if(ruleLocation&&rule.styleSheetId&&header&&!header.isAnonymousInlineStyleSheet()){return Elements.StylePropertiesSection._linkifyRuleLocation(matchedStyles.cssModel(),linkifier,rule.styleSheetId,ruleLocation);}
if(rule.isUserAgent()){return createTextNode(Common.UIString('user agent stylesheet'));}
if(rule.isInjected()){return createTextNode(Common.UIString('injected stylesheet'));}
if(rule.isViaInspector()){return createTextNode(Common.UIString('via inspector'));}
if(header&&header.ownerNode){const link=Elements.DOMLinkifier.linkifyDeferredNodeReference(header.ownerNode,{preventKeyboardFocus:true});link.textContent='<style>';return link;}
return createTextNode('');}
static _getRuleLocationFromCSSRule(rule){let ruleLocation=null;if(rule instanceof SDK.CSSStyleRule){ruleLocation=rule.style.range;}else if(rule instanceof SDK.CSSKeyframeRule){ruleLocation=rule.key().range;}
return ruleLocation;}
static tryNavigateToRuleLocation(matchedStyles,rule){if(!rule){return;}
const ruleLocation=this._getRuleLocationFromCSSRule(rule);const header=rule.styleSheetId?matchedStyles.cssModel().styleSheetHeaderForId(rule.styleSheetId):null;if(ruleLocation&&rule.styleSheetId&&header&&!header.isAnonymousInlineStyleSheet()){const matchingSelectorLocation=this._getCSSSelectorLocation(matchedStyles.cssModel(),rule.styleSheetId,ruleLocation);this._revealSelectorSource(matchingSelectorLocation,true);}}
static _linkifyRuleLocation(cssModel,linkifier,styleSheetId,ruleLocation){const matchingSelectorLocation=this._getCSSSelectorLocation(cssModel,styleSheetId,ruleLocation);return linkifier.linkifyCSSLocation(matchingSelectorLocation);}
static _getCSSSelectorLocation(cssModel,styleSheetId,ruleLocation){const styleSheetHeader=cssModel.styleSheetHeaderForId(styleSheetId);const lineNumber=styleSheetHeader.lineNumberInSource(ruleLocation.startLine);const columnNumber=styleSheetHeader.columnNumberInSource(ruleLocation.startLine,ruleLocation.startColumn);return new SDK.CSSLocation(styleSheetHeader,lineNumber,columnNumber);}
_onKeyDown(event){if(UI.isEditing()||!this.editable||event.altKey||event.ctrlKey||event.metaKey){return;}
switch(event.key){case'Enter':case' ':this._startEditingAtFirstPosition();event.consume(true);break;default:if(event.key.length===1){this.addNewBlankProperty(0).startEditing();}
break;}}
_setSectionHovered(isHovered){this.element.classList.toggle('styles-panel-hovered',isHovered);this.propertiesTreeOutline.element.classList.toggle('styles-panel-hovered',isHovered);if(this._hoverableSelectorsMode!==isHovered){this._hoverableSelectorsMode=isHovered;this._markSelectorMatches();}}
_onMouseLeave(event){this._setSectionHovered(false);this._parentPane._setActiveProperty(null);}
_onMouseMove(event){const hasCtrlOrMeta=UI.KeyboardShortcut.eventHasCtrlOrMeta((event));this._setSectionHovered(hasCtrlOrMeta);const treeElement=this.propertiesTreeOutline.treeElementFromEvent(event);if(treeElement instanceof Elements.StylePropertyTreeElement){this._parentPane._setActiveProperty((treeElement));}else{this._parentPane._setActiveProperty(null);}
if(!this._selectedSinceMouseDown&&this.element.getComponentSelection().toString()){this._selectedSinceMouseDown=true;}}
_createHoverMenuToolbar(container){if(!this.editable){return;}
const items=[];const textShadowButton=new UI.ToolbarButton(Common.UIString('Add text-shadow'),'largeicon-text-shadow');textShadowButton.addEventListener(UI.ToolbarButton.Events.Click,this._onInsertShadowPropertyClick.bind(this,'text-shadow'));textShadowButton.element.tabIndex=-1;items.push(textShadowButton);const boxShadowButton=new UI.ToolbarButton(Common.UIString('Add box-shadow'),'largeicon-box-shadow');boxShadowButton.addEventListener(UI.ToolbarButton.Events.Click,this._onInsertShadowPropertyClick.bind(this,'box-shadow'));boxShadowButton.element.tabIndex=-1;items.push(boxShadowButton);const colorButton=new UI.ToolbarButton(Common.UIString('Add color'),'largeicon-foreground-color');colorButton.addEventListener(UI.ToolbarButton.Events.Click,this._onInsertColorPropertyClick,this);colorButton.element.tabIndex=-1;items.push(colorButton);const backgroundButton=new UI.ToolbarButton(Common.UIString('Add background-color'),'largeicon-background-color');backgroundButton.addEventListener(UI.ToolbarButton.Events.Click,this._onInsertBackgroundColorPropertyClick,this);backgroundButton.element.tabIndex=-1;items.push(backgroundButton);let newRuleButton=null;if(this._style.parentRule){newRuleButton=new UI.ToolbarButton(Common.UIString('Insert Style Rule Below'),'largeicon-add');newRuleButton.addEventListener(UI.ToolbarButton.Events.Click,this._onNewRuleClick,this);newRuleButton.element.tabIndex=-1;items.push(newRuleButton);}
const sectionToolbar=new UI.Toolbar('sidebar-pane-section-toolbar',container);for(let i=0;i<items.length;++i){sectionToolbar.appendToolbarItem(items[i]);}
const menuButton=new UI.ToolbarButton('','largeicon-menu');menuButton.element.tabIndex=-1;sectionToolbar.appendToolbarItem(menuButton);setItemsVisibility(items,false);sectionToolbar.element.addEventListener('mouseenter',setItemsVisibility.bind(null,items,true));sectionToolbar.element.addEventListener('mouseleave',setItemsVisibility.bind(null,items,false));UI.ARIAUtils.markAsHidden(sectionToolbar.element);function setItemsVisibility(items,value){for(let i=0;i<items.length;++i){items[i].setVisible(value);}
menuButton.setVisible(!value);}}
style(){return this._style;}
_headerText(){const node=this._matchedStyles.nodeForStyle(this._style);if(this._style.type===SDK.CSSStyleDeclaration.Type.Inline){return this._matchedStyles.isInherited(this._style)?Common.UIString('Style Attribute'):'element.style';}
if(this._style.type===SDK.CSSStyleDeclaration.Type.Attributes){return ls`${node.nodeNameInCorrectCase()}[Attributes Style]`;}
return this._style.parentRule.selectorText();}
_onMouseOutSelector(){if(this._hoverTimer){clearTimeout(this._hoverTimer);}
SDK.OverlayModel.hideDOMNodeHighlight();}
_onMouseEnterSelector(){if(this._hoverTimer){clearTimeout(this._hoverTimer);}
this._hoverTimer=setTimeout(this._highlight.bind(this),300);}
_highlight(mode='all'){SDK.OverlayModel.hideDOMNodeHighlight();const node=this._parentPane.node();if(!node){return;}
const selectorList=this._style.parentRule?this._style.parentRule.selectorText():undefined;node.domModel().overlayModel().highlightInOverlay({node,selectorList},mode);}
firstSibling(){const parent=this.element.parentElement;if(!parent){return null;}
let childElement=parent.firstChild;while(childElement){if(childElement._section){return childElement._section;}
childElement=childElement.nextSibling;}
return null;}
lastSibling(){const parent=this.element.parentElement;if(!parent){return null;}
let childElement=parent.lastChild;while(childElement){if(childElement._section){return childElement._section;}
childElement=childElement.previousSibling;}
return null;}
nextSibling(){let curElement=this.element;do{curElement=curElement.nextSibling;}while(curElement&&!curElement._section);return curElement?curElement._section:null;}
previousSibling(){let curElement=this.element;do{curElement=curElement.previousSibling;}while(curElement&&!curElement._section);return curElement?curElement._section:null;}
_onNewRuleClick(event){event.data.consume();const rule=this._style.parentRule;const range=TextUtils.TextRange.createFromLocation(rule.style.range.endLine,rule.style.range.endColumn+1);this._parentPane._addBlankSection(this,(rule.styleSheetId),range);}
_onInsertShadowPropertyClick(propertyName,event){event.data.consume(true);const treeElement=this.addNewBlankProperty();treeElement.property.name=propertyName;treeElement.property.value='0 0 black';treeElement.updateTitle();const shadowSwatchPopoverHelper=Elements.ShadowSwatchPopoverHelper.forTreeElement(treeElement);if(shadowSwatchPopoverHelper){shadowSwatchPopoverHelper.showPopover();}}
_onInsertColorPropertyClick(event){event.data.consume(true);const treeElement=this.addNewBlankProperty();treeElement.property.name='color';treeElement.property.value='black';treeElement.updateTitle();const colorSwatch=Elements.ColorSwatchPopoverIcon.forTreeElement(treeElement);if(colorSwatch){colorSwatch.showPopover();}}
_onInsertBackgroundColorPropertyClick(event){event.data.consume(true);const treeElement=this.addNewBlankProperty();treeElement.property.name='background-color';treeElement.property.value='white';treeElement.updateTitle();const colorSwatch=Elements.ColorSwatchPopoverIcon.forTreeElement(treeElement);if(colorSwatch){colorSwatch.showPopover();}}
_styleSheetEdited(edit){const rule=this._style.parentRule;if(rule){rule.rebase(edit);}else{this._style.rebase(edit);}
this._updateMediaList();this._updateRuleOrigin();}
_createMediaList(mediaRules){for(let i=mediaRules.length-1;i>=0;--i){const media=mediaRules[i];if(!media.text.includes('(')&&media.text!=='print'){continue;}
const mediaDataElement=this._mediaListElement.createChild('div','media');const mediaContainerElement=mediaDataElement.createChild('span');const mediaTextElement=mediaContainerElement.createChild('span','media-text');switch(media.source){case SDK.CSSMedia.Source.LINKED_SHEET:case SDK.CSSMedia.Source.INLINE_SHEET:mediaTextElement.textContent='media="'+media.text+'"';break;case SDK.CSSMedia.Source.MEDIA_RULE:const decoration=mediaContainerElement.createChild('span');mediaContainerElement.insertBefore(decoration,mediaTextElement);decoration.textContent='@media ';mediaTextElement.textContent=media.text;if(media.styleSheetId){mediaDataElement.classList.add('editable-media');mediaTextElement.addEventListener('click',this._handleMediaRuleClick.bind(this,media,mediaTextElement),false);}
break;case SDK.CSSMedia.Source.IMPORT_RULE:mediaTextElement.textContent='@import '+media.text;break;}}}
_updateMediaList(){this._mediaListElement.removeChildren();if(this._style.parentRule&&this._style.parentRule instanceof SDK.CSSStyleRule){this._createMediaList(this._style.parentRule.media);}}
isPropertyInherited(propertyName){if(this._matchedStyles.isInherited(this._style)){return!SDK.cssMetadata().isPropertyInherited(propertyName);}
return false;}
nextEditableSibling(){let curSection=this;do{curSection=curSection.nextSibling();}while(curSection&&!curSection.editable);if(!curSection){curSection=this.firstSibling();while(curSection&&!curSection.editable){curSection=curSection.nextSibling();}}
return(curSection&&curSection.editable)?curSection:null;}
previousEditableSibling(){let curSection=this;do{curSection=curSection.previousSibling();}while(curSection&&!curSection.editable);if(!curSection){curSection=this.lastSibling();while(curSection&&!curSection.editable){curSection=curSection.previousSibling();}}
return(curSection&&curSection.editable)?curSection:null;}
refreshUpdate(editedTreeElement){this._parentPane._refreshUpdate(this,editedTreeElement);}
_updateVarFunctions(editedTreeElement){let child=this.propertiesTreeOutline.firstChild();while(child){if(child!==editedTreeElement){child.updateTitleIfComputedValueChanged();}
child=child.traverseNextTreeElement(false,null,true);}}
update(full){this._selectorElement.textContent=this._headerText();this._markSelectorMatches();if(full){this.onpopulate();}else{let child=this.propertiesTreeOutline.firstChild();while(child){child.setOverloaded(this._isPropertyOverloaded(child.property));child=child.traverseNextTreeElement(false,null,true);}}}
_showAllItems(event){if(event){event.consume();}
if(this._forceShowAll){return;}
this._forceShowAll=true;this.onpopulate();}
onpopulate(){this._parentPane._setActiveProperty(null);this.propertiesTreeOutline.removeChildren();const style=this._style;let count=0;const properties=style.leadingProperties();const maxProperties=Elements.StylePropertiesSection.MaxProperties+properties.length-this._originalPropertiesCount;for(const property of properties){if(!this._forceShowAll&&count>=maxProperties){break;}
count++;const isShorthand=!!style.longhandProperties(property.name).length;const inherited=this.isPropertyInherited(property.name);const overloaded=this._isPropertyOverloaded(property);if(style.parentRule&&style.parentRule.isUserAgent()&&inherited){continue;}
const item=new Elements.StylePropertyTreeElement(this._parentPane,this._matchedStyles,property,isShorthand,inherited,overloaded,false);this.propertiesTreeOutline.appendChild(item);}
if(count<properties.length){this._showAllButton.classList.remove('hidden');this._showAllButton.textContent=ls`Show All Properties (${properties.length - count} more)`;}else{this._showAllButton.classList.add('hidden');}}
_isPropertyOverloaded(property){return this._matchedStyles.propertyState(property)===SDK.CSSMatchedStyles.PropertyState.Overloaded;}
_updateFilter(){let hasMatchingChild=false;this._showAllItems();for(const child of this.propertiesTreeOutline.rootElement().children()){hasMatchingChild|=child._updateFilter();}
const regex=this._parentPane.filterRegex();const hideRule=!hasMatchingChild&&!!regex&&!regex.test(this.element.deepTextContent());this.element.classList.toggle('hidden',hideRule);if(!hideRule&&this._style.parentRule){this._markSelectorHighlights();}
return!hideRule;}
_markSelectorMatches(){const rule=this._style.parentRule;if(!rule){return;}
this._mediaListElement.classList.toggle('media-matches',this._matchedStyles.mediaMatches(this._style));const selectorTexts=rule.selectors.map(selector=>selector.text);const matchingSelectorIndexes=this._matchedStyles.matchingSelectors((rule));const matchingSelectors=(new Array(selectorTexts.length).fill(false));for(const matchingIndex of matchingSelectorIndexes){matchingSelectors[matchingIndex]=true;}
if(this._parentPane._isEditingStyle){return;}
const fragment=this._hoverableSelectorsMode?this._renderHoverableSelectors(selectorTexts,matchingSelectors):this._renderSimplifiedSelectors(selectorTexts,matchingSelectors);this._selectorElement.removeChildren();this._selectorElement.appendChild(fragment);this._markSelectorHighlights();}
_renderHoverableSelectors(selectors,matchingSelectors){const fragment=createDocumentFragment();for(let i=0;i<selectors.length;++i){if(i){fragment.createTextChild(', ');}
fragment.appendChild(this._createSelectorElement(selectors[i],matchingSelectors[i],i));}
return fragment;}
_createSelectorElement(text,isMatching,navigationIndex){const element=createElementWithClass('span','simple-selector');element.classList.toggle('selector-matches',isMatching);if(typeof navigationIndex==='number'){element._selectorIndex=navigationIndex;}
element.textContent=text;return element;}
_renderSimplifiedSelectors(selectors,matchingSelectors){const fragment=createDocumentFragment();let currentMatching=false;let text='';for(let i=0;i<selectors.length;++i){if(currentMatching!==matchingSelectors[i]&&text){fragment.appendChild(this._createSelectorElement(text,currentMatching));text='';}
currentMatching=matchingSelectors[i];text+=selectors[i]+(i===selectors.length-1?'':', ');}
if(text){fragment.appendChild(this._createSelectorElement(text,currentMatching));}
return fragment;}
_markSelectorHighlights(){const selectors=this._selectorElement.getElementsByClassName('simple-selector');const regex=this._parentPane.filterRegex();for(let i=0;i<selectors.length;++i){const selectorMatchesFilter=!!regex&&regex.test(selectors[i].textContent);selectors[i].classList.toggle('filter-match',selectorMatchesFilter);}}
_checkWillCancelEditing(){const willCauseCancelEditing=this._willCauseCancelEditing;this._willCauseCancelEditing=false;return willCauseCancelEditing;}
_handleSelectorContainerClick(event){if(this._checkWillCancelEditing()||!this.editable){return;}
if(event.target===this._selectorContainer){this.addNewBlankProperty(0).startEditing();event.consume(true);}}
addNewBlankProperty(index=this.propertiesTreeOutline.rootElement().childCount()){const property=this._style.newBlankProperty(index);const item=new Elements.StylePropertyTreeElement(this._parentPane,this._matchedStyles,property,false,false,false,true);this.propertiesTreeOutline.insertChild(item,property.index);return item;}
_handleEmptySpaceMouseDown(){this._willCauseCancelEditing=this._parentPane._isEditingStyle;this._selectedSinceMouseDown=false;}
_handleEmptySpaceClick(event){if(!this.editable||this.element.hasSelection()||this._checkWillCancelEditing()||this._selectedSinceMouseDown){return;}
if(event.target.classList.contains('header')||this.element.classList.contains('read-only')||event.target.enclosingNodeOrSelfWithClass('media')){event.consume();return;}
const deepTarget=event.deepElementFromPoint();if(deepTarget.treeElement){this.addNewBlankProperty(deepTarget.treeElement.property.index+1).startEditing();}else{this.addNewBlankProperty().startEditing();}
event.consume(true);}
_handleMediaRuleClick(media,element,event){if(UI.isBeingEdited(element)){return;}
if(UI.KeyboardShortcut.eventHasCtrlOrMeta((event))&&this.navigable){const location=media.rawLocation();if(!location){event.consume(true);return;}
const uiLocation=Bindings.cssWorkspaceBinding.rawLocationToUILocation(location);if(uiLocation){Common.Revealer.reveal(uiLocation);}
event.consume(true);return;}
if(!this.editable){return;}
const config=new UI.InplaceEditor.Config(this._editingMediaCommitted.bind(this,media),this._editingMediaCancelled.bind(this,element),undefined,this._editingMediaBlurHandler.bind(this));UI.InplaceEditor.startEditing(element,config);element.getComponentSelection().selectAllChildren(element);this._parentPane.setEditingStyle(true);const parentMediaElement=element.enclosingNodeOrSelfWithClass('media');parentMediaElement.classList.add('editing-media');event.consume(true);}
_editingMediaFinished(element){this._parentPane.setEditingStyle(false);const parentMediaElement=element.enclosingNodeOrSelfWithClass('media');parentMediaElement.classList.remove('editing-media');}
_editingMediaCancelled(element){this._editingMediaFinished(element);this._markSelectorMatches();element.getComponentSelection().collapse(element,0);}
_editingMediaBlurHandler(editor,blurEvent){return true;}
_editingMediaCommitted(media,element,newContent,oldContent,context,moveDirection){this._parentPane.setEditingStyle(false);this._editingMediaFinished(element);if(newContent){newContent=newContent.trim();}
function userCallback(success){if(success){this._matchedStyles.resetActiveProperties();this._parentPane._refreshUpdate(this);}
this._parentPane.setUserOperation(false);this._editingMediaTextCommittedForTest();}
this._parentPane.setUserOperation(true);this._parentPane.cssModel().setMediaText(media.styleSheetId,media.range,newContent).then(userCallback.bind(this));}
_editingMediaTextCommittedForTest(){}
_handleSelectorClick(event){if(UI.KeyboardShortcut.eventHasCtrlOrMeta((event))&&this.navigable&&event.target.classList.contains('simple-selector')){this._navigateToSelectorSource(event.target._selectorIndex,true);event.consume(true);return;}
if(this.element.hasSelection()){return;}
this._startEditingAtFirstPosition();event.consume(true);}
_navigateToSelectorSource(index,focus){const cssModel=this._parentPane.cssModel();const rule=this._style.parentRule;const header=cssModel.styleSheetHeaderForId((rule.styleSheetId));if(!header){return;}
const rawLocation=new SDK.CSSLocation(header,rule.lineNumberInSource(index),rule.columnNumberInSource(index));Elements.StylePropertiesSection._revealSelectorSource(rawLocation,focus);}
static _revealSelectorSource(rawLocation,focus){const uiLocation=Bindings.cssWorkspaceBinding.rawLocationToUILocation(rawLocation);if(uiLocation){Common.Revealer.reveal(uiLocation,!focus);}}
_startEditingAtFirstPosition(){if(!this.editable){return;}
if(!this._style.parentRule){this.moveEditorFromSelector('forward');return;}
this.startEditingSelector();}
startEditingSelector(){const element=this._selectorElement;if(UI.isBeingEdited(element)){return;}
element.scrollIntoViewIfNeeded(false);element.textContent=element.textContent.replace(/\s+/g,' ').trim();const config=new UI.InplaceEditor.Config(this.editingSelectorCommitted.bind(this),this.editingSelectorCancelled.bind(this));UI.InplaceEditor.startEditing(this._selectorElement,config);element.getComponentSelection().selectAllChildren(element);this._parentPane.setEditingStyle(true);if(element.classList.contains('simple-selector')){this._navigateToSelectorSource(0,false);}}
moveEditorFromSelector(moveDirection){this._markSelectorMatches();if(!moveDirection){return;}
if(moveDirection==='forward'){let firstChild=this.propertiesTreeOutline.firstChild();while(firstChild&&firstChild.inherited()){firstChild=firstChild.nextSibling;}
if(!firstChild){this.addNewBlankProperty().startEditing();}else{firstChild.startEditing(firstChild.nameElement);}}else{const previousSection=this.previousEditableSibling();if(!previousSection){return;}
previousSection.addNewBlankProperty().startEditing();}}
editingSelectorCommitted(element,newContent,oldContent,context,moveDirection){this._editingSelectorEnded();if(newContent){newContent=newContent.trim();}
if(newContent===oldContent){this._selectorElement.textContent=newContent;this.moveEditorFromSelector(moveDirection);return;}
const rule=this._style.parentRule;if(!rule){return;}
function headerTextCommitted(){this._parentPane.setUserOperation(false);this.moveEditorFromSelector(moveDirection);this._editingSelectorCommittedForTest();}
this._parentPane.setUserOperation(true);this._setHeaderText(rule,newContent).then(headerTextCommitted.bind(this));}
_setHeaderText(rule,newContent){function onSelectorsUpdated(rule,success){if(!success){return Promise.resolve();}
return this._matchedStyles.recomputeMatchingSelectors(rule).then(updateSourceRanges.bind(this,rule));}
function updateSourceRanges(rule){const doesAffectSelectedNode=this._matchedStyles.matchingSelectors(rule).length>0;this.propertiesTreeOutline.element.classList.toggle('no-affect',!doesAffectSelectedNode);this._matchedStyles.resetActiveProperties();this._parentPane._refreshUpdate(this);}
console.assert(rule instanceof SDK.CSSStyleRule);const oldSelectorRange=rule.selectorRange();if(!oldSelectorRange){return Promise.resolve();}
return rule.setSelectorText(newContent).then(onSelectorsUpdated.bind(this,(rule),oldSelectorRange));}
_editingSelectorCommittedForTest(){}
_updateRuleOrigin(){this._selectorRefElement.removeChildren();this._selectorRefElement.appendChild(Elements.StylePropertiesSection.createRuleOriginNode(this._matchedStyles,this._parentPane._linkifier,this._style.parentRule));}
_editingSelectorEnded(){this._parentPane.setEditingStyle(false);}
editingSelectorCancelled(){this._editingSelectorEnded();this._markSelectorMatches();}};Elements.BlankStylePropertiesSection=class extends Elements.StylePropertiesSection{constructor(stylesPane,matchedStyles,defaultSelectorText,styleSheetId,ruleLocation,insertAfterStyle){const cssModel=(stylesPane.cssModel());const rule=SDK.CSSStyleRule.createDummyRule(cssModel,defaultSelectorText);super(stylesPane,matchedStyles,rule.style);this._normal=false;this._ruleLocation=ruleLocation;this._styleSheetId=styleSheetId;this._selectorRefElement.removeChildren();this._selectorRefElement.appendChild(Elements.StylePropertiesSection._linkifyRuleLocation(cssModel,this._parentPane._linkifier,styleSheetId,this._actualRuleLocation()));if(insertAfterStyle&&insertAfterStyle.parentRule){this._createMediaList(insertAfterStyle.parentRule.media);}
this.element.classList.add('blank-section');}
_actualRuleLocation(){const prefix=this._rulePrefix();const lines=prefix.split('\n');const editRange=new TextUtils.TextRange(0,0,lines.length-1,lines.peekLast().length);return this._ruleLocation.rebaseAfterTextEdit(TextUtils.TextRange.createFromLocation(0,0),editRange);}
_rulePrefix(){return this._ruleLocation.startLine===0&&this._ruleLocation.startColumn===0?'':'\n\n';}
get isBlank(){return!this._normal;}
editingSelectorCommitted(element,newContent,oldContent,context,moveDirection){if(!this.isBlank){super.editingSelectorCommitted(element,newContent,oldContent,context,moveDirection);return;}
function onRuleAdded(newRule){if(!newRule){this.editingSelectorCancelled();this._editingSelectorCommittedForTest();return Promise.resolve();}
return this._matchedStyles.addNewRule(newRule,this._matchedStyles.node()).then(onAddedToCascade.bind(this,newRule));}
function onAddedToCascade(newRule){const doesSelectorAffectSelectedNode=this._matchedStyles.matchingSelectors(newRule).length>0;this._makeNormal(newRule);if(!doesSelectorAffectSelectedNode){this.propertiesTreeOutline.element.classList.add('no-affect');}
this._updateRuleOrigin();this._parentPane.setUserOperation(false);this._editingSelectorEnded();if(this.element.parentElement)
{this.moveEditorFromSelector(moveDirection);}
this._markSelectorMatches();this._editingSelectorCommittedForTest();}
if(newContent){newContent=newContent.trim();}
this._parentPane.setUserOperation(true);const cssModel=this._parentPane.cssModel();const ruleText=this._rulePrefix()+newContent+' {}';cssModel.addRule(this._styleSheetId,ruleText,this._ruleLocation).then(onRuleAdded.bind(this));}
editingSelectorCancelled(){this._parentPane.setUserOperation(false);if(!this.isBlank){super.editingSelectorCancelled();return;}
this._editingSelectorEnded();this._parentPane.removeSection(this);}
_makeNormal(newRule){this.element.classList.remove('blank-section');this._style=newRule.style;this._normal=true;}};Elements.StylePropertiesSection.MaxProperties=50;Elements.KeyframePropertiesSection=class extends Elements.StylePropertiesSection{constructor(stylesPane,matchedStyles,style){super(stylesPane,matchedStyles,style);this._selectorElement.className='keyframe-key';}
_headerText(){return this._style.parentRule.key().text;}
_setHeaderText(rule,newContent){function updateSourceRanges(success){if(!success){return;}
this._parentPane._refreshUpdate(this);}
console.assert(rule instanceof SDK.CSSKeyframeRule);const oldRange=rule.key().range;if(!oldRange){return Promise.resolve();}
return rule.setKeyText(newContent).then(updateSourceRanges.bind(this));}
isPropertyInherited(propertyName){return false;}
_isPropertyOverloaded(property){return false;}
_markSelectorHighlights(){}
_markSelectorMatches(){this._selectorElement.textContent=this._style.parentRule.key().text;}
_highlight(){}};Elements.StylesSidebarPane.CSSPropertyPrompt=class extends UI.TextPrompt{constructor(treeElement,isEditingName){super();this.initialize(this._buildPropertyCompletions.bind(this),UI.StyleValueDelimiters);this._isColorAware=SDK.cssMetadata().isColorAwareProperty(treeElement.property.name);this._cssCompletions=[];if(isEditingName){this._cssCompletions=SDK.cssMetadata().allProperties();if(!treeElement.node().isSVGNode()){this._cssCompletions=this._cssCompletions.filter(property=>!SDK.cssMetadata().isSVGProperty(property));}}else{this._cssCompletions=SDK.cssMetadata().propertyValues(treeElement.nameElement.textContent);}
this._treeElement=treeElement;this._isEditingName=isEditingName;this._cssVariables=treeElement.matchedStyles().availableCSSVariables(treeElement.property.ownerStyle);if(this._cssVariables.length<1000){this._cssVariables.sort(String.naturalOrderComparator);}else{this._cssVariables.sort();}
if(!isEditingName){this.disableDefaultSuggestionForEmptyInput();if(treeElement&&treeElement.valueElement){const cssValueText=treeElement.valueElement.textContent;const cmdOrCtrl=Host.isMac()?'Cmd':'Ctrl';if(cssValueText.match(/#[\da-f]{3,6}$/i)){this.setTitle(ls`Increment/decrement with mousewheel or up/down keys. ${cmdOrCtrl}: R ±1, Shift: G ±1, Alt: B ±1`);}else if(cssValueText.match(/\d+/)){this.setTitle(ls`Increment/decrement with mousewheel or up/down keys. ${cmdOrCtrl}: ±100, Shift: ±10, Alt: ±0.1`);}}}}
onKeyDown(event){switch(event.key){case'ArrowUp':case'ArrowDown':case'PageUp':case'PageDown':if(!this.isSuggestBoxVisible()&&this._handleNameOrValueUpDown(event)){event.preventDefault();return;}
break;case'Enter':if(event.shiftKey){return;}
this.tabKeyPressed();event.preventDefault();return;}
super.onKeyDown(event);}
onMouseWheel(event){if(this._handleNameOrValueUpDown(event)){event.consume(true);return;}
super.onMouseWheel(event);}
tabKeyPressed(){this.acceptAutoComplete();return false;}
_handleNameOrValueUpDown(event){function finishHandler(originalValue,replacementString){this._treeElement.applyStyleText(this._treeElement.nameElement.textContent+': '+this._treeElement.valueElement.textContent,false);}
function customNumberHandler(prefix,number,suffix){if(number!==0&&!suffix.length&&SDK.cssMetadata().isLengthProperty(this._treeElement.property.name)){suffix='px';}
return prefix+number+suffix;}
if(!this._isEditingName&&this._treeElement.valueElement&&UI.handleElementValueModifications(event,this._treeElement.valueElement,finishHandler.bind(this),this._isValueSuggestion.bind(this),customNumberHandler.bind(this))){return true;}
return false;}
_isValueSuggestion(word){if(!word){return false;}
word=word.toLowerCase();return this._cssCompletions.indexOf(word)!==-1||word.startsWith('--');}
_buildPropertyCompletions(expression,query,force){const lowerQuery=query.toLowerCase();const editingVariable=!this._isEditingName&&expression.trim().endsWith('var(');if(!query&&!force&&!editingVariable&&(this._isEditingName||expression)){return Promise.resolve([]);}
const prefixResults=[];const anywhereResults=[];if(!editingVariable){this._cssCompletions.forEach(completion=>filterCompletions.call(this,completion,false));}
if(this._isEditingName){const nameValuePresets=SDK.cssMetadata().nameValuePresets(this._treeElement.node().isSVGNode());nameValuePresets.forEach(preset=>filterCompletions.call(this,preset,false,true));}
if(this._isEditingName||editingVariable){this._cssVariables.forEach(variable=>filterCompletions.call(this,variable,true));}
const results=prefixResults.concat(anywhereResults);if(!this._isEditingName&&!results.length&&query.length>1&&'!important'.startsWith(lowerQuery)){results.push({text:'!important'});}
const userEnteredText=query.replace('-','');if(userEnteredText&&(userEnteredText===userEnteredText.toUpperCase())){for(let i=0;i<results.length;++i){if(!results[i].text.startsWith('--')){results[i].text=results[i].text.toUpperCase();}}}
results.forEach(result=>{if(editingVariable){result.title=result.text;result.text+=')';return;}
const valuePreset=SDK.cssMetadata().getValuePreset(this._treeElement.name,result.text);if(!this._isEditingName&&valuePreset){result.title=result.text;result.text=valuePreset.text;result.selectionRange={startColumn:valuePreset.startColumn,endColumn:valuePreset.endColumn};}});if(this._isColorAware&&!this._isEditingName){results.sort((a,b)=>{if(!!a.subtitleRenderer===!!b.subtitleRenderer){return 0;}
return a.subtitleRenderer?-1:1;});}
return Promise.resolve(results);function filterCompletions(completion,variable,nameValue){const index=completion.toLowerCase().indexOf(lowerQuery);const result={text:completion};if(variable){const computedValue=this._treeElement.matchedStyles().computeCSSVariable(this._treeElement.property.ownerStyle,completion);if(computedValue){const color=Common.Color.parse(computedValue);if(color){result.subtitleRenderer=swatchRenderer.bind(null,color);}}}
if(nameValue){result.hideGhostText=true;}
if(index===0){result.priority=this._isEditingName?SDK.cssMetadata().propertyUsageWeight(completion):1;prefixResults.push(result);}else if(index>-1){anywhereResults.push(result);}}
function swatchRenderer(color){const swatch=InlineEditor.ColorSwatch.create();swatch.hideText(true);swatch.setColor(color);swatch.style.pointerEvents='none';return swatch;}}};Elements.StylesSidebarPropertyRenderer=class{constructor(rule,node,name,value){this._rule=rule;this._node=node;this._propertyName=name;this._propertyValue=value;this._colorHandler=null;this._bezierHandler=null;this._shadowHandler=null;this._gridHandler=null;this._varHandler=createTextNode;}
setColorHandler(handler){this._colorHandler=handler;}
setBezierHandler(handler){this._bezierHandler=handler;}
setShadowHandler(handler){this._shadowHandler=handler;}
setGridHandler(handler){this._gridHandler=handler;}
setVarHandler(handler){this._varHandler=handler;}
renderName(){const nameElement=createElement('span');nameElement.className='webkit-css-property';nameElement.textContent=this._propertyName;nameElement.normalize();return nameElement;}
renderValue(){const valueElement=createElement('span');valueElement.className='value';if(!this._propertyValue){return valueElement;}
if(this._shadowHandler&&(this._propertyName==='box-shadow'||this._propertyName==='text-shadow'||this._propertyName==='-webkit-box-shadow')&&!SDK.CSSMetadata.VariableRegex.test(this._propertyValue)){valueElement.appendChild(this._shadowHandler(this._propertyValue,this._propertyName));valueElement.normalize();return valueElement;}
if(this._gridHandler&&SDK.cssMetadata().isGridAreaDefiningProperty(this._propertyName)){valueElement.appendChild(this._gridHandler(this._propertyValue,this._propertyName));valueElement.normalize();return valueElement;}
const regexes=[SDK.CSSMetadata.VariableRegex,SDK.CSSMetadata.URLRegex];const processors=[this._varHandler,this._processURL.bind(this)];if(this._bezierHandler&&SDK.cssMetadata().isBezierAwareProperty(this._propertyName)){regexes.push(UI.Geometry.CubicBezier.Regex);processors.push(this._bezierHandler);}
if(this._colorHandler&&SDK.cssMetadata().isColorAwareProperty(this._propertyName)){regexes.push(Common.Color.Regex);processors.push(this._colorHandler);}
const results=TextUtils.TextUtils.splitStringByRegexes(this._propertyValue,regexes);for(let i=0;i<results.length;i++){const result=results[i];const processor=result.regexIndex===-1?createTextNode:processors[result.regexIndex];valueElement.appendChild(processor(result.value));}
valueElement.normalize();return valueElement;}
_processURL(text){let url=text.substring(4,text.length-1).trim();const isQuoted=/^'.*'$/.test(url)||/^".*"$/.test(url);if(isQuoted){url=url.substring(1,url.length-1);}
const container=createDocumentFragment();container.createTextChild('url(');let hrefUrl=null;if(this._rule&&this._rule.resourceURL()){hrefUrl=Common.ParsedURL.completeURL(this._rule.resourceURL(),url);}else if(this._node){hrefUrl=this._node.resolveURL(url);}
container.appendChild(Components.Linkifier.linkifyURL(hrefUrl||url,{text:url,preventClick:true}));container.createTextChild(')');return container;}};Elements.StylesSidebarPane.ButtonProvider=class{constructor(){this._button=new UI.ToolbarButton(Common.UIString('New Style Rule'),'largeicon-add');this._button.addEventListener(UI.ToolbarButton.Events.Click,this._clicked,this);const longclickTriangle=UI.Icon.create('largeicon-longclick-triangle','long-click-glyph');this._button.element.appendChild(longclickTriangle);new UI.LongClickController(this._button.element,this._longClicked.bind(this));UI.context.addFlavorChangeListener(SDK.DOMNode,onNodeChanged.bind(this));onNodeChanged.call(this);function onNodeChanged(){let node=UI.context.flavor(SDK.DOMNode);node=node?node.enclosingElementOrSelf():null;this._button.setEnabled(!!node);}}
_clicked(event){Elements.StylesSidebarPane._instance._createNewRuleInViaInspectorStyleSheet();}
_longClicked(e){Elements.StylesSidebarPane._instance._onAddButtonLongClick(e);}
item(){return this._button;}};;Elements.StylePropertyTreeElement=class extends UI.TreeElement{constructor(stylesPane,matchedStyles,property,isShorthand,inherited,overloaded,newProperty){super('',isShorthand);this._style=property.ownerStyle;this._matchedStyles=matchedStyles;this.property=property;this._inherited=inherited;this._overloaded=overloaded;this.selectable=false;this._parentPane=stylesPane;this.isShorthand=isShorthand;this._applyStyleThrottler=new Common.Throttler(0);this._newProperty=newProperty;if(this._newProperty){this.listItemElement.textContent='';}
this._expandedDueToFilter=false;this.valueElement=null;this.nameElement=null;this._expandElement=null;this._originalPropertyText='';this._hasBeenEditedIncrementally=false;this._prompt=null;this._lastComputedValue=null;this._contextForTest;}
matchedStyles(){return this._matchedStyles;}
_editable(){return!!(this._style.styleSheetId&&this._style.range);}
inherited(){return this._inherited;}
overloaded(){return this._overloaded;}
setOverloaded(x){if(x===this._overloaded){return;}
this._overloaded=x;this._updateState();}
get name(){return this.property.name;}
get value(){return this.property.value;}
_updateFilter(){const regex=this._parentPane.filterRegex();const matches=!!regex&&(regex.test(this.property.name)||regex.test(this.property.value));this.listItemElement.classList.toggle('filter-match',matches);this.onpopulate();let hasMatchingChildren=false;for(let i=0;i<this.childCount();++i){hasMatchingChildren|=this.childAt(i)._updateFilter();}
if(!regex){if(this._expandedDueToFilter){this.collapse();}
this._expandedDueToFilter=false;}else if(hasMatchingChildren&&!this.expanded){this.expand();this._expandedDueToFilter=true;}else if(!hasMatchingChildren&&this.expanded&&this._expandedDueToFilter){this.collapse();this._expandedDueToFilter=false;}
return matches;}
_processColor(text){const color=Common.Color.parse(text);if(!color){return createTextNode(text);}
if(!this._editable()){const swatch=InlineEditor.ColorSwatch.create();swatch.setColor(color);return swatch;}
const swatch=InlineEditor.ColorSwatch.create();swatch.setColor(color);swatch.setFormat(Common.Color.detectColorFormat(swatch.color()));this._addColorContrastInfo(swatch);return swatch;}
_processVar(text){const computedValue=this._matchedStyles.computeValue(this._style,text);if(!computedValue){return createTextNode(text);}
const color=Common.Color.parse(computedValue);if(!color){const node=createElement('span');node.textContent=text;node.title=computedValue;return node;}
if(!this._editable()){const swatch=InlineEditor.ColorSwatch.create();swatch.setText(text,computedValue);swatch.setColor(color);return swatch;}
const swatch=InlineEditor.ColorSwatch.create();swatch.setColor(color);swatch.setFormat(Common.Color.detectColorFormat(swatch.color()));swatch.setText(text,computedValue);this._addColorContrastInfo(swatch);return swatch;}
async _addColorContrastInfo(swatch){const swatchPopoverHelper=this._parentPane.swatchPopoverHelper();const swatchIcon=new Elements.ColorSwatchPopoverIcon(this,swatchPopoverHelper,swatch);if(this.property.name!=='color'||!this._parentPane.cssModel()||!this.node()){return;}
const cssModel=this._parentPane.cssModel();const contrastInfo=new ColorPicker.ContrastInfo(await cssModel.backgroundColorsPromise(this.node().id));swatchIcon.setContrastInfo(contrastInfo);}
renderedPropertyText(){return this.nameElement.textContent+': '+this.valueElement.textContent;}
_processBezier(text){if(!this._editable()||!UI.Geometry.CubicBezier.parse(text)){return createTextNode(text);}
const swatchPopoverHelper=this._parentPane.swatchPopoverHelper();const swatch=InlineEditor.BezierSwatch.create();swatch.setBezierText(text);new Elements.BezierPopoverIcon(this,swatchPopoverHelper,swatch);return swatch;}
_processShadow(propertyValue,propertyName){if(!this._editable()){return createTextNode(propertyValue);}
let shadows;if(propertyName==='text-shadow'){shadows=InlineEditor.CSSShadowModel.parseTextShadow(propertyValue);}else{shadows=InlineEditor.CSSShadowModel.parseBoxShadow(propertyValue);}
if(!shadows.length){return createTextNode(propertyValue);}
const container=createDocumentFragment();const swatchPopoverHelper=this._parentPane.swatchPopoverHelper();for(let i=0;i<shadows.length;i++){if(i!==0){container.appendChild(createTextNode(', '));}
const cssShadowSwatch=InlineEditor.CSSShadowSwatch.create();cssShadowSwatch.setCSSShadow(shadows[i]);new Elements.ShadowSwatchPopoverHelper(this,swatchPopoverHelper,cssShadowSwatch);const colorSwatch=cssShadowSwatch.colorSwatch();if(colorSwatch){new Elements.ColorSwatchPopoverIcon(this,swatchPopoverHelper,colorSwatch);}
container.appendChild(cssShadowSwatch);}
return container;}
_processGrid(propertyValue,propertyName){const splitResult=TextUtils.TextUtils.splitStringByRegexes(propertyValue,[SDK.CSSMetadata.GridAreaRowRegex]);if(splitResult.length<=1){return createTextNode(propertyValue);}
const indent=Common.moduleSetting('textEditorIndent').get();const container=createDocumentFragment();for(const result of splitResult){const value=result.value.trim();const content=UI.html`<br /><span class='styles-clipboard-only'>${indent.repeat(2)}</span>${value}`;container.appendChild(content);}
return container;}
_updateState(){if(!this.listItemElement){return;}
if(this._style.isPropertyImplicit(this.name)){this.listItemElement.classList.add('implicit');}else{this.listItemElement.classList.remove('implicit');}
const hasIgnorableError=!this.property.parsedOk&&Elements.StylesSidebarPane.ignoreErrorsForProperty(this.property);if(hasIgnorableError){this.listItemElement.classList.add('has-ignorable-error');}else{this.listItemElement.classList.remove('has-ignorable-error');}
if(this.inherited()){this.listItemElement.classList.add('inherited');}else{this.listItemElement.classList.remove('inherited');}
if(this.overloaded()){this.listItemElement.classList.add('overloaded');}else{this.listItemElement.classList.remove('overloaded');}
if(this.property.disabled){this.listItemElement.classList.add('disabled');}else{this.listItemElement.classList.remove('disabled');}}
node(){return this._parentPane.node();}
parentPane(){return this._parentPane;}
section(){return this.treeOutline&&this.treeOutline.section;}
_updatePane(){const section=this.section();if(section){section.refreshUpdate(this);}}
async _toggleDisabled(disabled){const oldStyleRange=this._style.range;if(!oldStyleRange){return;}
this._parentPane.setUserOperation(true);const success=await this.property.setDisabled(disabled);this._parentPane.setUserOperation(false);if(!success){return;}
this._matchedStyles.resetActiveProperties();this._updatePane();this.styleTextAppliedForTest();}
async onpopulate(){if(this.childCount()||!this.isShorthand){return;}
const longhandProperties=this._style.longhandProperties(this.name);for(let i=0;i<longhandProperties.length;++i){const name=longhandProperties[i].name;let inherited=false;let overloaded=false;const section=this.section();if(section){inherited=section.isPropertyInherited(name);overloaded=this._matchedStyles.propertyState(longhandProperties[i])===SDK.CSSMatchedStyles.PropertyState.Overloaded;}
const item=new Elements.StylePropertyTreeElement(this._parentPane,this._matchedStyles,longhandProperties[i],false,inherited,overloaded,false);this.appendChild(item);}}
onattach(){this.updateTitle();this.listItemElement.addEventListener('mousedown',event=>{if(event.which===1){this._parentPane[Elements.StylePropertyTreeElement.ActiveSymbol]=this;}},false);this.listItemElement.addEventListener('mouseup',this._mouseUp.bind(this));this.listItemElement.addEventListener('click',event=>{if(!event.target.hasSelection()&&event.target!==this.listItemElement){event.consume(true);}});}
onexpand(){this._updateExpandElement();}
oncollapse(){this._updateExpandElement();}
_updateExpandElement(){if(!this._expandElement){return;}
if(this.expanded){this._expandElement.setIconType('smallicon-triangle-down');}else{this._expandElement.setIconType('smallicon-triangle-right');}}
updateTitleIfComputedValueChanged(){const computedValue=this._matchedStyles.computeValue(this.property.ownerStyle,this.property.value);if(computedValue===this._lastComputedValue){return;}
this._lastComputedValue=computedValue;this._innerUpdateTitle();}
updateTitle(){this._lastComputedValue=this._matchedStyles.computeValue(this.property.ownerStyle,this.property.value);this._innerUpdateTitle();}
_innerUpdateTitle(){this._updateState();if(this.isExpandable()){this._expandElement=UI.Icon.create('smallicon-triangle-right','expand-icon');}else{this._expandElement=null;}
const propertyRenderer=new Elements.StylesSidebarPropertyRenderer(this._style.parentRule,this.node(),this.name,this.value);if(this.property.parsedOk){propertyRenderer.setVarHandler(this._processVar.bind(this));propertyRenderer.setColorHandler(this._processColor.bind(this));propertyRenderer.setBezierHandler(this._processBezier.bind(this));propertyRenderer.setShadowHandler(this._processShadow.bind(this));propertyRenderer.setGridHandler(this._processGrid.bind(this));}
this.listItemElement.removeChildren();this.nameElement=propertyRenderer.renderName();if(this.property.name.startsWith('--')){this.nameElement.title=this._matchedStyles.computeCSSVariable(this._style,this.property.name)||'';}
this.valueElement=propertyRenderer.renderValue();if(!this.treeOutline){return;}
const indent=Common.moduleSetting('textEditorIndent').get();this.listItemElement.createChild('span','styles-clipboard-only').createTextChild(indent+(this.property.disabled?'/* ':''));this.listItemElement.appendChild(this.nameElement);const lineBreakValue=this.valueElement.firstElementChild&&this.valueElement.firstElementChild.tagName==='BR';const separator=lineBreakValue?':':': ';this.listItemElement.createChild('span','styles-name-value-separator').textContent=separator;if(this._expandElement){this.listItemElement.appendChild(this._expandElement);}
this.listItemElement.appendChild(this.valueElement);this.listItemElement.createTextChild(';');if(this.property.disabled){this.listItemElement.createChild('span','styles-clipboard-only').createTextChild(' */');}
if(!this.property.parsedOk){this.listItemElement.classList.add('not-parsed-ok');this.listItemElement.insertBefore(Elements.StylesSidebarPane.createExclamationMark(this.property),this.listItemElement.firstChild);}
if(!this.property.activeInStyle()){this.listItemElement.classList.add('inactive');}
this._updateFilter();if(this.property.parsedOk&&this.section()&&this.parent.root){const enabledCheckboxElement=createElement('input');enabledCheckboxElement.className='enabled-button';enabledCheckboxElement.type='checkbox';enabledCheckboxElement.checked=!this.property.disabled;enabledCheckboxElement.addEventListener('mousedown',event=>event.consume(),false);enabledCheckboxElement.addEventListener('click',event=>{this._toggleDisabled(!this.property.disabled);event.consume();},false);UI.ARIAUtils.setAccessibleName(enabledCheckboxElement,`${this.nameElement.textContent} ${this.valueElement.textContent}`);this.listItemElement.insertBefore(enabledCheckboxElement,this.listItemElement.firstChild);}}
_mouseUp(event){const activeTreeElement=this._parentPane[Elements.StylePropertyTreeElement.ActiveSymbol];this._parentPane[Elements.StylePropertyTreeElement.ActiveSymbol]=null;if(activeTreeElement!==this){return;}
if(this.listItemElement.hasSelection()){return;}
if(UI.isBeingEdited((event.target))){return;}
event.consume(true);if(event.target===this.listItemElement){return;}
if(UI.KeyboardShortcut.eventHasCtrlOrMeta((event))&&this.section().navigable){this._navigateToSource((event.target));return;}
this.startEditing((event.target));}
_handleContextMenuEvent(context,event){const contextMenu=new UI.ContextMenu(event);if(this.property.parsedOk&&this.section()&&this.parent.root){contextMenu.defaultSection().appendCheckboxItem(ls`Toggle property and continue editing`,async()=>{this.editingCancelled(null,context);const sectionIndex=this._parentPane.focusedSectionIndex();const propertyIndex=this.treeOutline.rootElement().indexOfChild(this);await this._toggleDisabled(!this.property.disabled);event.consume();this._parentPane.continueEditingElement(sectionIndex,propertyIndex);},!this.property.disabled);}
contextMenu.defaultSection().appendItem(ls`Reveal in Sources panel`,this._navigateToSource.bind(this));contextMenu.show();}
_navigateToSource(element,omitFocus){if(!this.section().navigable){return;}
const propertyNameClicked=element===this.nameElement;const uiLocation=Bindings.cssWorkspaceBinding.propertyUILocation(this.property,propertyNameClicked);if(uiLocation){Common.Revealer.reveal(uiLocation,omitFocus);}}
startEditing(selectElement){if(this.parent.isShorthand){return;}
if(this._expandElement&&selectElement===this._expandElement){return;}
const section=this.section();if(section&&!section.editable){return;}
if(selectElement){selectElement=selectElement.enclosingNodeOrSelfWithClass('webkit-css-property')||selectElement.enclosingNodeOrSelfWithClass('value');}
if(!selectElement){selectElement=this.nameElement;}
if(UI.isBeingEdited(selectElement)){return;}
const isEditingName=selectElement===this.nameElement;if(!isEditingName){if(SDK.cssMetadata().isGridAreaDefiningProperty(this.name)){this.valueElement.textContent=restoreGridIndents(this.value);}
this.valueElement.textContent=restoreURLs(this.valueElement.textContent,this.value);}
function restoreGridIndents(value){const splitResult=TextUtils.TextUtils.splitStringByRegexes(value,[SDK.CSSMetadata.GridAreaRowRegex]);return splitResult.map(result=>result.value.trim()).join('\n');}
function restoreURLs(fieldValue,modelValue){const urlRegex=/\b(url\([^)]*\))/g;const splitFieldValue=fieldValue.split(urlRegex);if(splitFieldValue.length===1){return fieldValue;}
const modelUrlRegex=new RegExp(urlRegex);for(let i=1;i<splitFieldValue.length;i+=2){const match=modelUrlRegex.exec(modelValue);if(match){splitFieldValue[i]=match[0];}}
return splitFieldValue.join('');}
const context={expanded:this.expanded,hasChildren:this.isExpandable(),isEditingName:isEditingName,originalProperty:this.property,previousContent:selectElement.textContent};this._contextForTest=context;this.setExpandable(false);if(selectElement.parentElement){selectElement.parentElement.classList.add('child-editing');}
selectElement.textContent=selectElement.textContent;function pasteHandler(context,event){const data=event.clipboardData.getData('Text');if(!data){return;}
const colonIdx=data.indexOf(':');if(colonIdx<0){return;}
const name=data.substring(0,colonIdx).trim();const value=data.substring(colonIdx+1).trim();event.preventDefault();if(!('originalName'in context)){context.originalName=this.nameElement.textContent;context.originalValue=this.valueElement.textContent;}
this.property.name=name;this.property.value=value;this.nameElement.textContent=name;this.valueElement.textContent=value;this.nameElement.normalize();this.valueElement.normalize();this._editingCommitted(event.target.textContent,context,'forward');}
function blurListener(context,event){let text=event.target.textContent;if(!context.isEditingName){text=this.value||text;}
this._editingCommitted(text,context,'');}
this._originalPropertyText=this.property.propertyText;this._parentPane.setEditingStyle(true,this);if(selectElement.parentElement){selectElement.parentElement.scrollIntoViewIfNeeded(false);}
this._prompt=new Elements.StylesSidebarPane.CSSPropertyPrompt(this,isEditingName);this._prompt.setAutocompletionTimeout(0);this._prompt.addEventListener(UI.TextPrompt.Events.TextChanged,this._applyFreeFlowStyleTextEdit.bind(this,context));const proxyElement=this._prompt.attachAndStartEditing(selectElement,blurListener.bind(this,context));this._navigateToSource(selectElement,true);proxyElement.addEventListener('keydown',this._editingNameValueKeyDown.bind(this,context),false);proxyElement.addEventListener('keypress',this._editingNameValueKeyPress.bind(this,context),false);if(isEditingName){proxyElement.addEventListener('paste',pasteHandler.bind(this,context),false);proxyElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this,context),false);}
selectElement.getComponentSelection().selectAllChildren(selectElement);}
_editingNameValueKeyDown(context,event){if(event.handled){return;}
let result;if(isEnterKey(event)&&!event.shiftKey){result='forward';}else if(event.keyCode===UI.KeyboardShortcut.Keys.Esc.code||event.key==='Escape'){result='cancel';}else if(!context.isEditingName&&this._newProperty&&event.keyCode===UI.KeyboardShortcut.Keys.Backspace.code){const selection=event.target.getComponentSelection();if(selection.isCollapsed&&!selection.focusOffset){event.preventDefault();result='backward';}}else if(event.key==='Tab'){result=event.shiftKey?'backward':'forward';event.preventDefault();}
if(result){switch(result){case'cancel':this.editingCancelled(null,context);break;case'forward':case'backward':this._editingCommitted(event.target.textContent,context,result);break;}
event.consume();return;}}
_editingNameValueKeyPress(context,event){function shouldCommitValueSemicolon(text,cursorPosition){let openQuote='';for(let i=0;i<cursorPosition;++i){const ch=text[i];if(ch==='\\'&&openQuote!==''){++i;}
else if(!openQuote&&(ch==='"'||ch==='\'')){openQuote=ch;}else if(openQuote===ch){openQuote='';}}
return!openQuote;}
const keyChar=String.fromCharCode(event.charCode);const isFieldInputTerminated=(context.isEditingName?keyChar===':':keyChar===';'&&shouldCommitValueSemicolon(event.target.textContent,event.target.selectionLeftOffset()));if(isFieldInputTerminated){event.consume(true);this._editingCommitted(event.target.textContent,context,'forward');return;}}
async _applyFreeFlowStyleTextEdit(context){if(!this._prompt||!this._parentPane.node()){return;}
const enteredText=this._prompt.text();if(context.isEditingName&&enteredText.includes(':')){this._editingCommitted(enteredText,context,'forward');return;}
const valueText=this._prompt.textWithCurrentSuggestion();if(valueText.includes(';')){return;}
const isPseudo=!!this._parentPane.node().pseudoType();if(isPseudo){if(this.name.toLowerCase()==='content'){return;}
const lowerValueText=valueText.trim().toLowerCase();if(lowerValueText.startsWith('content:')||lowerValueText==='display: none'){return;}}
if(context.isEditingName){if(valueText.includes(':')){await this.applyStyleText(valueText,false);}else if(this._hasBeenEditedIncrementally){await this._applyOriginalStyle(context);}}else{await this.applyStyleText(`${this.nameElement.textContent}: ${valueText}`,false);}}
kickFreeFlowStyleEditForTest(){const context=this._contextForTest;return this._applyFreeFlowStyleTextEdit((context));}
editingEnded(context){this.setExpandable(context.hasChildren);if(context.expanded){this.expand();}
const editedElement=context.isEditingName?this.nameElement:this.valueElement;if(editedElement.parentElement){editedElement.parentElement.classList.remove('child-editing');}
this._parentPane.setEditingStyle(false);}
editingCancelled(element,context){this._removePrompt();if(this._hasBeenEditedIncrementally){this._applyOriginalStyle(context);}else if(this._newProperty){this.treeOutline.removeChild(this);}
this.updateTitle();this.editingEnded(context);}
async _applyOriginalStyle(context){await this.applyStyleText(this._originalPropertyText,false,context.originalProperty);}
_findSibling(moveDirection){let target=this;do{target=(moveDirection==='forward'?target.nextSibling:target.previousSibling);}while(target&&target.inherited());return target;}
async _editingCommitted(userInput,context,moveDirection){this._removePrompt();this.editingEnded(context);const isEditingName=context.isEditingName;const nameValueEntered=isEditingName&&this.nameElement.textContent.includes(':');let createNewProperty,moveToSelector;const isDataPasted='originalName'in context;const isDirtyViaPaste=isDataPasted&&(this.nameElement.textContent!==context.originalName||this.valueElement.textContent!==context.originalValue);const isPropertySplitPaste=isDataPasted&&isEditingName&&this.valueElement.textContent!==context.originalValue;let moveTo=this;const moveToOther=(isEditingName^(moveDirection==='forward'));const abandonNewProperty=this._newProperty&&!userInput&&(moveToOther||isEditingName);if(moveDirection==='forward'&&(!isEditingName||isPropertySplitPaste)||moveDirection==='backward'&&isEditingName){moveTo=moveTo._findSibling(moveDirection);if(!moveTo){if(moveDirection==='forward'&&(!this._newProperty||userInput)){createNewProperty=true;}else if(moveDirection==='backward'){moveToSelector=true;}}}
let moveToIndex=moveTo&&this.treeOutline?this.treeOutline.rootElement().indexOfChild(moveTo):-1;const blankInput=userInput.isWhitespace();const shouldCommitNewProperty=this._newProperty&&(isPropertySplitPaste||moveToOther||(!moveDirection&&!isEditingName)||(isEditingName&&blankInput)||nameValueEntered);const section=(this.section());if(((userInput!==context.previousContent||isDirtyViaPaste)&&!this._newProperty)||shouldCommitNewProperty){let propertyText;if(nameValueEntered){propertyText=this.nameElement.textContent;}else if(blankInput||(this._newProperty&&this.valueElement.textContent.isWhitespace())){propertyText='';}else{if(isEditingName){propertyText=userInput+': '+this.property.value;}else{propertyText=this.property.name+': '+userInput;}}
await this.applyStyleText(propertyText,true);moveToNextCallback.call(this,this._newProperty,!blankInput,section);}else{if(isEditingName){this.property.name=userInput;}else{this.property.value=userInput;}
if(!isDataPasted&&!this._newProperty){this.updateTitle();}
moveToNextCallback.call(this,this._newProperty,false,section);}
function moveToNextCallback(alreadyNew,valueChanged,section){if(!moveDirection){this._parentPane.resetFocus();return;}
if(moveTo&&moveTo.parent){moveTo.startEditing(!isEditingName?moveTo.nameElement:moveTo.valueElement);return;}
if(moveTo&&!moveTo.parent){const rootElement=section.propertiesTreeOutline.rootElement();if(moveDirection==='forward'&&blankInput&&!isEditingName){--moveToIndex;}
if(moveToIndex>=rootElement.childCount()&&!this._newProperty){createNewProperty=true;}else{const treeElement=moveToIndex>=0?rootElement.childAt(moveToIndex):null;if(treeElement){let elementToEdit=!isEditingName||isPropertySplitPaste?treeElement.nameElement:treeElement.valueElement;if(alreadyNew&&blankInput){elementToEdit=moveDirection==='forward'?treeElement.nameElement:treeElement.valueElement;}
treeElement.startEditing(elementToEdit);return;}else if(!alreadyNew){moveToSelector=true;}}}
if(createNewProperty){if(alreadyNew&&!valueChanged&&(isEditingName^(moveDirection==='backward'))){return;}
section.addNewBlankProperty().startEditing();return;}
if(abandonNewProperty){moveTo=this._findSibling(moveDirection);const sectionToEdit=(moveTo||moveDirection==='backward')?section:section.nextEditableSibling();if(sectionToEdit){if(sectionToEdit.style().parentRule){sectionToEdit.startEditingSelector();}else{sectionToEdit.moveEditorFromSelector(moveDirection);}}
return;}
if(moveToSelector){if(section.style().parentRule){section.startEditingSelector();}else{section.moveEditorFromSelector(moveDirection);}}}}
_removePrompt(){if(this._prompt){this._prompt.detach();this._prompt=null;}}
styleTextAppliedForTest(){}
applyStyleText(styleText,majorChange,property){return this._applyStyleThrottler.schedule(this._innerApplyStyleText.bind(this,styleText,majorChange,property));}
async _innerApplyStyleText(styleText,majorChange,property){if(!this.treeOutline){return;}
const oldStyleRange=this._style.range;if(!oldStyleRange){return;}
const hasBeenEditedIncrementally=this._hasBeenEditedIncrementally;styleText=styleText.replace(/[\xA0\t]/g,' ').trim();if(!styleText.length&&majorChange&&this._newProperty&&!hasBeenEditedIncrementally){this.parent.removeChild(this);return;}
const currentNode=this._parentPane.node();this._parentPane.setUserOperation(true);if(styleText.length&&!/;\s*$/.test(styleText)){styleText+=';';}
const overwriteProperty=!this._newProperty||hasBeenEditedIncrementally;let success=await this.property.setText(styleText,majorChange,overwriteProperty);if(hasBeenEditedIncrementally&&majorChange&&!success){majorChange=false;success=await this.property.setText(this._originalPropertyText,majorChange,overwriteProperty);}
this._parentPane.setUserOperation(false);if(!success){if(majorChange){if(this._newProperty){this.treeOutline.removeChild(this);}else{this.updateTitle();}}
this.styleTextAppliedForTest();return;}
this._matchedStyles.resetActiveProperties();this._hasBeenEditedIncrementally=true;this.property=property||this._style.propertyAt(this.property.index);if(currentNode===this.node()){this._updatePane();}
this.styleTextAppliedForTest();}
ondblclick(){return true;}
isEventWithinDisclosureTriangle(event){return event.target===this._expandElement;}};Elements.StylePropertyTreeElement.Context;Elements.StylePropertyTreeElement.ActiveSymbol=Symbol('ActiveSymbol');;Elements.ComputedStyleWidget=class extends UI.ThrottledWidget{constructor(){super(true);this.registerRequiredCSS('elements/computedStyleSidebarPane.css');this._alwaysShowComputedProperties={'display':true,'height':true,'width':true};this._computedStyleModel=new Elements.ComputedStyleModel();this._computedStyleModel.addEventListener(Elements.ComputedStyleModel.Events.ComputedStyleChanged,this.update,this);this._showInheritedComputedStylePropertiesSetting=Common.settings.createSetting('showInheritedComputedStyleProperties',false);this._showInheritedComputedStylePropertiesSetting.addChangeListener(this._showInheritedComputedStyleChanged.bind(this));const hbox=this.contentElement.createChild('div','hbox styles-sidebar-pane-toolbar');const filterContainerElement=hbox.createChild('div','styles-sidebar-pane-filter-box');const filterInput=Elements.StylesSidebarPane.createPropertyFilterElement(ls`Filter`,hbox,filterCallback.bind(this));UI.ARIAUtils.setAccessibleName(filterInput,Common.UIString('Filter Computed Styles'));filterContainerElement.appendChild(filterInput);this.setDefaultFocusedElement(filterInput);const toolbar=new UI.Toolbar('styles-pane-toolbar',hbox);toolbar.appendToolbarItem(new UI.ToolbarSettingCheckbox(this._showInheritedComputedStylePropertiesSetting,undefined,Common.UIString('Show all')));this._noMatchesElement=this.contentElement.createChild('div','gray-info-message');this._noMatchesElement.textContent=ls`No matching property`;this._propertiesOutline=new UI.TreeOutlineInShadow();this._propertiesOutline.hideOverflow();this._propertiesOutline.setShowSelectionOnKeyboardFocus(true);this._propertiesOutline.setFocusable(true);this._propertiesOutline.registerRequiredCSS('elements/computedStyleWidgetTree.css');this._propertiesOutline.element.classList.add('monospace','computed-properties');this.contentElement.appendChild(this._propertiesOutline.element);this._linkifier=new Components.Linkifier(Elements.ComputedStyleWidget._maxLinkLength);function filterCallback(regex){this._filterRegex=regex;this._updateFilter(regex);}
const fontsWidget=new Elements.PlatformFontsWidget(this._computedStyleModel);fontsWidget.show(this.contentElement);}
onResize(){const isNarrow=this.contentElement.offsetWidth<260;this._propertiesOutline.contentElement.classList.toggle('computed-narrow',isNarrow);}
_showInheritedComputedStyleChanged(){this.update();}
doUpdate(){const promises=[this._computedStyleModel.fetchComputedStyle(),this._fetchMatchedCascade()];return Promise.all(promises).spread(this._innerRebuildUpdate.bind(this));}
_fetchMatchedCascade(){const node=this._computedStyleModel.node();if(!node||!this._computedStyleModel.cssModel()){return Promise.resolve((null));}
return this._computedStyleModel.cssModel().cachedMatchedCascadeForNode(node).then(validateStyles.bind(this));function validateStyles(matchedStyles){return matchedStyles&&matchedStyles.node()===this._computedStyleModel.node()?matchedStyles:null;}}
_processColor(text){const color=Common.Color.parse(text);if(!color){return createTextNode(text);}
const swatch=InlineEditor.ColorSwatch.create();swatch.setColor(color);swatch.setFormat(Common.Color.detectColorFormat(color));return swatch;}
_innerRebuildUpdate(nodeStyle,matchedStyles){const expandedProperties=new Set();for(const treeElement of this._propertiesOutline.rootElement().children()){if(!treeElement.expanded){continue;}
const propertyName=treeElement[Elements.ComputedStyleWidget._propertySymbol].name;expandedProperties.add(propertyName);}
const hadFocus=this._propertiesOutline.element.hasFocus();this._propertiesOutline.removeChildren();this._linkifier.reset();const cssModel=this._computedStyleModel.cssModel();if(!nodeStyle||!matchedStyles||!cssModel){this._noMatchesElement.classList.remove('hidden');return;}
const uniqueProperties=nodeStyle.computedStyle.keysArray();uniqueProperties.sort(propertySorter);const propertyTraces=this._computePropertyTraces(matchedStyles);const inhertiedProperties=this._computeInheritedProperties(matchedStyles);const showInherited=this._showInheritedComputedStylePropertiesSetting.get();for(let i=0;i<uniqueProperties.length;++i){const propertyName=uniqueProperties[i];const propertyValue=nodeStyle.computedStyle.get(propertyName);const canonicalName=SDK.cssMetadata().canonicalPropertyName(propertyName);const inherited=!inhertiedProperties.has(canonicalName);if(!showInherited&&inherited&&!(propertyName in this._alwaysShowComputedProperties)){continue;}
if(!showInherited&&propertyName.startsWith('--')){continue;}
if(propertyName!==canonicalName&&propertyValue===nodeStyle.computedStyle.get(canonicalName)){continue;}
const propertyElement=createElement('div');propertyElement.classList.add('computed-style-property');propertyElement.classList.toggle('computed-style-property-inherited',inherited);const renderer=new Elements.StylesSidebarPropertyRenderer(null,nodeStyle.node,propertyName,(propertyValue));renderer.setColorHandler(this._processColor.bind(this));const propertyNameElement=renderer.renderName();propertyNameElement.classList.add('property-name');propertyElement.appendChild(propertyNameElement);const colon=createElementWithClass('span','delimeter');colon.textContent=': ';propertyNameElement.appendChild(colon);const propertyValueElement=propertyElement.createChild('span','property-value');const propertyValueText=renderer.renderValue();propertyValueText.classList.add('property-value-text');propertyValueElement.appendChild(propertyValueText);const semicolon=createElementWithClass('span','delimeter');semicolon.textContent=';';propertyValueElement.appendChild(semicolon);const treeElement=new UI.TreeElement();treeElement.title=propertyElement;treeElement[Elements.ComputedStyleWidget._propertySymbol]={name:propertyName,value:propertyValue};const isOdd=this._propertiesOutline.rootElement().children().length%2===0;treeElement.listItemElement.classList.toggle('odd-row',isOdd);this._propertiesOutline.appendChild(treeElement);if(!this._propertiesOutline.selectedTreeElement){treeElement.select(!hadFocus);}
const trace=propertyTraces.get(propertyName);if(trace){const activeProperty=this._renderPropertyTrace(cssModel,matchedStyles,nodeStyle.node,treeElement,trace);treeElement.listItemElement.addEventListener('mousedown',e=>e.consume(),false);treeElement.listItemElement.addEventListener('dblclick',e=>e.consume(),false);treeElement.listItemElement.addEventListener('click',handleClick.bind(null,treeElement),false);treeElement.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this,matchedStyles,activeProperty));const gotoSourceElement=UI.Icon.create('mediumicon-arrow-in-circle','goto-source-icon');gotoSourceElement.addEventListener('click',this._navigateToSource.bind(this,activeProperty));propertyValueElement.appendChild(gotoSourceElement);if(expandedProperties.has(propertyName)){treeElement.expand();}}}
this._updateFilter(this._filterRegex);function propertySorter(a,b){if(a.startsWith('--')^b.startsWith('--')){return a.startsWith('--')?1:-1;}
if(a.startsWith('-webkit')^b.startsWith('-webkit')){return a.startsWith('-webkit')?1:-1;}
const canonical1=SDK.cssMetadata().canonicalPropertyName(a);const canonical2=SDK.cssMetadata().canonicalPropertyName(b);return canonical1.compareTo(canonical2);}
function handleClick(treeElement,event){if(!treeElement.expanded){treeElement.expand();}else{treeElement.collapse();}
event.consume();}}
_navigateToSource(cssProperty,event){Common.Revealer.reveal(cssProperty);event.consume(true);}
_renderPropertyTrace(cssModel,matchedStyles,node,rootTreeElement,tracedProperties){let activeProperty=null;for(const property of tracedProperties){const trace=createElement('div');trace.classList.add('property-trace');if(matchedStyles.propertyState(property)===SDK.CSSMatchedStyles.PropertyState.Overloaded){trace.classList.add('property-trace-inactive');}else{activeProperty=property;}
const renderer=new Elements.StylesSidebarPropertyRenderer(null,node,property.name,(property.value));renderer.setColorHandler(this._processColor.bind(this));const valueElement=renderer.renderValue();valueElement.classList.add('property-trace-value');valueElement.addEventListener('click',this._navigateToSource.bind(this,property),false);const gotoSourceElement=UI.Icon.create('mediumicon-arrow-in-circle','goto-source-icon');gotoSourceElement.addEventListener('click',this._navigateToSource.bind(this,property));valueElement.insertBefore(gotoSourceElement,valueElement.firstChild);trace.appendChild(valueElement);const rule=property.ownerStyle.parentRule;const selectorElement=trace.createChild('span','property-trace-selector');selectorElement.textContent=rule?rule.selectorText():'element.style';selectorElement.title=selectorElement.textContent;if(rule){const linkSpan=trace.createChild('span','trace-link');linkSpan.appendChild(Elements.StylePropertiesSection.createRuleOriginNode(matchedStyles,this._linkifier,rule));}
const traceTreeElement=new UI.TreeElement();traceTreeElement.title=trace;traceTreeElement.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this,matchedStyles,property));rootTreeElement.appendChild(traceTreeElement);}
return(activeProperty);}
_handleContextMenuEvent(matchedStyles,property,event){const contextMenu=new UI.ContextMenu(event);const rule=property.ownerStyle.parentRule;if(rule){const header=rule.styleSheetId?matchedStyles.cssModel().styleSheetHeaderForId(rule.styleSheetId):null;if(header&&!header.isAnonymousInlineStyleSheet()){contextMenu.defaultSection().appendItem(ls`Navigate to selector source`,()=>{Elements.StylePropertiesSection.tryNavigateToRuleLocation(matchedStyles,rule);});}}
contextMenu.defaultSection().appendItem(ls`Navigate to style`,()=>Common.Revealer.reveal(property));contextMenu.show();}
_computePropertyTraces(matchedStyles){const result=new Map();for(const style of matchedStyles.nodeStyles()){const allProperties=style.allProperties();for(const property of allProperties){if(!property.activeInStyle()||!matchedStyles.propertyState(property)){continue;}
if(!result.has(property.name)){result.set(property.name,[]);}
result.get(property.name).push(property);}}
return result;}
_computeInheritedProperties(matchedStyles){const result=new Set();for(const style of matchedStyles.nodeStyles()){for(const property of style.allProperties()){if(!matchedStyles.propertyState(property)){continue;}
result.add(SDK.cssMetadata().canonicalPropertyName(property.name));}}
return result;}
_updateFilter(regex){const children=this._propertiesOutline.rootElement().children();let hasMatch=false;for(const child of children){const property=child[Elements.ComputedStyleWidget._propertySymbol];const matched=!regex||regex.test(property.name)||regex.test(property.value);child.hidden=!matched;hasMatch|=matched;}
this._noMatchesElement.classList.toggle('hidden',!!hasMatch);}};Elements.ComputedStyleWidget._maxLinkLength=30;Elements.ComputedStyleWidget._propertySymbol=Symbol('property');;Elements.ElementsPanel=class extends UI.Panel{constructor(){super('elements');this.registerRequiredCSS('elements/elementsPanel.css');this._splitWidget=new UI.SplitWidget(true,true,'elementsPanelSplitViewState',325,325);this._splitWidget.addEventListener(UI.SplitWidget.Events.SidebarSizeChanged,this._updateTreeOutlineVisibleWidth.bind(this));this._splitWidget.show(this.element);this._searchableView=new UI.SearchableView(this);this._searchableView.setMinimumSize(25,28);this._searchableView.setPlaceholder(Common.UIString('Find by string, selector, or XPath'));const stackElement=this._searchableView.element;this._contentElement=createElement('div');const crumbsContainer=createElement('div');stackElement.appendChild(this._contentElement);stackElement.appendChild(crumbsContainer);this._splitWidget.setMainWidget(this._searchableView);this._splitMode=null;this._contentElement.id='elements-content';if(Common.moduleSetting('domWordWrap').get()){this._contentElement.classList.add('elements-wrap');}
Common.moduleSetting('domWordWrap').addChangeListener(this._domWordWrapSettingChanged.bind(this));crumbsContainer.id='elements-crumbs';this._breadcrumbs=new Elements.ElementsBreadcrumbs();this._breadcrumbs.show(crumbsContainer);this._breadcrumbs.addEventListener(Elements.ElementsBreadcrumbs.Events.NodeSelected,this._crumbNodeSelected,this);this._stylesWidget=new Elements.StylesSidebarPane();this._computedStyleWidget=new Elements.ComputedStyleWidget();this._metricsWidget=new Elements.MetricsSidebarPane();Common.moduleSetting('sidebarPosition').addChangeListener(this._updateSidebarPosition.bind(this));this._updateSidebarPosition();this._treeOutlines=[];this._treeOutlineHeaders=new Map();SDK.targetManager.observeModels(SDK.DOMModel,this);SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged,event=>this._targetNameChanged((event.data)));Common.moduleSetting('showUAShadowDOM').addChangeListener(this._showUAShadowDOMChanged.bind(this));SDK.targetManager.addModelListener(SDK.DOMModel,SDK.DOMModel.Events.DocumentUpdated,this._documentUpdatedEvent,this);Extensions.extensionServer.addEventListener(Extensions.ExtensionServer.Events.SidebarPaneAdded,this._extensionSidebarPaneAdded,this);}
static instance(){return(self.runtime.sharedInstance(Elements.ElementsPanel));}
_revealProperty(cssProperty){return this.sidebarPaneView.showView(this._stylesViewToReveal).then(()=>{this._stylesWidget.revealProperty((cssProperty));});}
resolveLocation(locationName){return this.sidebarPaneView;}
showToolbarPane(widget,toggle){this._stylesWidget.showToolbarPane(widget,toggle);}
modelAdded(domModel){const parentModel=domModel.parentModel();let treeOutline=parentModel?Elements.ElementsTreeOutline.forDOMModel(parentModel):null;if(!treeOutline){treeOutline=new Elements.ElementsTreeOutline(true,true);treeOutline.setWordWrap(Common.moduleSetting('domWordWrap').get());treeOutline.addEventListener(Elements.ElementsTreeOutline.Events.SelectedNodeChanged,this._selectedNodeChanged,this);treeOutline.addEventListener(Elements.ElementsTreeOutline.Events.ElementsTreeUpdated,this._updateBreadcrumbIfNeeded,this);new Elements.ElementsTreeElementHighlighter(treeOutline);this._treeOutlines.push(treeOutline);if(domModel.target().parentTarget()){this._treeOutlineHeaders.set(treeOutline,createElementWithClass('div','elements-tree-header'));this._targetNameChanged(domModel.target());}}
treeOutline.wireToDOMModel(domModel);if(this.isShowing()){this.wasShown();}}
modelRemoved(domModel){const treeOutline=Elements.ElementsTreeOutline.forDOMModel(domModel);treeOutline.unwireFromDOMModel(domModel);if(domModel.parentModel()){return;}
this._treeOutlines.remove(treeOutline);const header=this._treeOutlineHeaders.get(treeOutline);if(header){header.remove();}
this._treeOutlineHeaders.delete(treeOutline);treeOutline.element.remove();}
_targetNameChanged(target){const domModel=target.model(SDK.DOMModel);if(!domModel){return;}
const treeOutline=Elements.ElementsTreeOutline.forDOMModel(domModel);if(!treeOutline){return;}
const header=this._treeOutlineHeaders.get(treeOutline);if(!header){return;}
header.removeChildren();header.createChild('div','elements-tree-header-frame').textContent=Common.UIString('Frame');header.appendChild(Components.Linkifier.linkifyURL(target.inspectedURL(),{text:target.name()}));}
_updateTreeOutlineVisibleWidth(){if(!this._treeOutlines.length){return;}
let width=this._splitWidget.element.offsetWidth;if(this._splitWidget.isVertical()){width-=this._splitWidget.sidebarSize();}
for(let i=0;i<this._treeOutlines.length;++i){this._treeOutlines[i].setVisibleWidth(width);}
this._breadcrumbs.updateSizes();}
focus(){if(this._treeOutlines.length){this._treeOutlines[0].focus();}}
searchableView(){return this._searchableView;}
wasShown(){UI.context.setFlavor(Elements.ElementsPanel,this);for(let i=0;i<this._treeOutlines.length;++i){const treeOutline=this._treeOutlines[i];if(treeOutline.element.parentElement!==this._contentElement){const header=this._treeOutlineHeaders.get(treeOutline);if(header){this._contentElement.appendChild(header);}
this._contentElement.appendChild(treeOutline.element);}}
super.wasShown();this._breadcrumbs.update();const domModels=SDK.targetManager.models(SDK.DOMModel);for(const domModel of domModels){if(domModel.parentModel()){continue;}
const treeOutline=Elements.ElementsTreeOutline.forDOMModel(domModel);treeOutline.setVisible(true);if(!treeOutline.rootDOMNode){if(domModel.existingDocument()){treeOutline.rootDOMNode=domModel.existingDocument();this._documentUpdated(domModel);}else{domModel.requestDocument();}}}}
willHide(){SDK.OverlayModel.hideDOMNodeHighlight();for(let i=0;i<this._treeOutlines.length;++i){const treeOutline=this._treeOutlines[i];treeOutline.setVisible(false);this._contentElement.removeChild(treeOutline.element);const header=this._treeOutlineHeaders.get(treeOutline);if(header){this._contentElement.removeChild(header);}}
if(this._popoverHelper){this._popoverHelper.hidePopover();}
super.willHide();UI.context.setFlavor(Elements.ElementsPanel,null);}
onResize(){this.element.window().requestAnimationFrame(this._updateSidebarPosition.bind(this));this._updateTreeOutlineVisibleWidth();}
_selectedNodeChanged(event){const selectedNode=(event.data.node);const focus=(event.data.focus);for(const treeOutline of this._treeOutlines){if(!selectedNode||Elements.ElementsTreeOutline.forDOMModel(selectedNode.domModel())!==treeOutline){treeOutline.selectDOMNode(null);}}
this._breadcrumbs.setSelectedNode(selectedNode);UI.context.setFlavor(SDK.DOMNode,selectedNode);if(!selectedNode){return;}
selectedNode.setAsInspectedNode();if(focus){this._selectedNodeOnReset=selectedNode;this._hasNonDefaultSelectedNode=true;}
const executionContexts=selectedNode.domModel().runtimeModel().executionContexts();const nodeFrameId=selectedNode.frameId();for(const context of executionContexts){if(context.frameId===nodeFrameId){UI.context.setFlavor(SDK.ExecutionContext,context);break;}}}
_documentUpdatedEvent(event){const domModel=(event.data);this._documentUpdated(domModel);}
_documentUpdated(domModel){this._searchableView.resetSearch();if(!domModel.existingDocument()){if(this.isShowing()){domModel.requestDocument();}
return;}
this._hasNonDefaultSelectedNode=false;if(this._omitDefaultSelection){return;}
const savedSelectedNodeOnReset=this._selectedNodeOnReset;restoreNode.call(this,domModel,this._selectedNodeOnReset);async function restoreNode(domModel,staleNode){const nodePath=staleNode?staleNode.path():null;const restoredNodeId=nodePath?await domModel.pushNodeByPathToFrontend(nodePath):null;if(savedSelectedNodeOnReset!==this._selectedNodeOnReset){return;}
let node=restoredNodeId?domModel.nodeForId(restoredNodeId):null;if(!node){const inspectedDocument=domModel.existingDocument();node=inspectedDocument?inspectedDocument.body||inspectedDocument.documentElement:null;}
this._setDefaultSelectedNode(node);this._lastSelectedNodeSelectedForTest();}}
_lastSelectedNodeSelectedForTest(){}
_setDefaultSelectedNode(node){if(!node||this._hasNonDefaultSelectedNode||this._pendingNodeReveal){return;}
const treeOutline=Elements.ElementsTreeOutline.forDOMModel(node.domModel());if(!treeOutline){return;}
this.selectDOMNode(node);if(treeOutline.selectedTreeElement){treeOutline.selectedTreeElement.expand();}}
searchCanceled(){delete this._searchConfig;this._hideSearchHighlights();this._searchableView.updateSearchMatchesCount(0);delete this._currentSearchResultIndex;delete this._searchResults;SDK.DOMModel.cancelSearch();}
performSearch(searchConfig,shouldJump,jumpBackwards){const query=searchConfig.query;const whitespaceTrimmedQuery=query.trim();if(!whitespaceTrimmedQuery.length){return;}
if(!this._searchConfig||this._searchConfig.query!==query){this.searchCanceled();}else{this._hideSearchHighlights();}
this._searchConfig=searchConfig;const showUAShadowDOM=Common.moduleSetting('showUAShadowDOM').get();const domModels=SDK.targetManager.models(SDK.DOMModel);const promises=domModels.map(domModel=>domModel.performSearch(whitespaceTrimmedQuery,showUAShadowDOM));Promise.all(promises).then(resultCountCallback.bind(this));function resultCountCallback(resultCounts){this._searchResults=[];for(let i=0;i<resultCounts.length;++i){const resultCount=resultCounts[i];for(let j=0;j<resultCount;++j){this._searchResults.push({domModel:domModels[i],index:j,node:undefined});}}
this._searchableView.updateSearchMatchesCount(this._searchResults.length);if(!this._searchResults.length){return;}
if(this._currentSearchResultIndex>=this._searchResults.length){this._currentSearchResultIndex=undefined;}
let index=this._currentSearchResultIndex;if(shouldJump){if(this._currentSearchResultIndex===undefined){index=jumpBackwards?-1:0;}else{index=jumpBackwards?index-1:index+1;}
this._jumpToSearchResult(index);}}}
_domWordWrapSettingChanged(event){this._contentElement.classList.toggle('elements-wrap',event.data);for(let i=0;i<this._treeOutlines.length;++i){this._treeOutlines[i].setWordWrap((event.data));}}
switchToAndFocus(node){this._searchableView.cancelSearch();UI.viewManager.showView('elements').then(()=>this.selectDOMNode(node,true));}
_getPopoverRequest(event){let link=event.target;while(link&&!link[Elements.ElementsTreeElement.HrefSymbol]){link=link.parentElementOrShadowHost();}
if(!link){return null;}
return{box:link.boxInWindow(),show:async popover=>{const node=this.selectedDOMNode();if(!node){return false;}
const preview=await Components.ImagePreview.build(node.domModel().target(),link[Elements.ElementsTreeElement.HrefSymbol],true);if(preview){popover.contentElement.appendChild(preview);}
return!!preview;}};}
_jumpToSearchResult(index){this._currentSearchResultIndex=(index+this._searchResults.length)%this._searchResults.length;this._highlightCurrentSearchResult();}
jumpToNextSearchResult(){if(!this._searchResults){return;}
this.performSearch(this._searchConfig,true);}
jumpToPreviousSearchResult(){if(!this._searchResults){return;}
this.performSearch(this._searchConfig,true,true);}
supportsCaseSensitiveSearch(){return false;}
supportsRegexSearch(){return false;}
_highlightCurrentSearchResult(){const index=this._currentSearchResultIndex;const searchResults=this._searchResults;const searchResult=searchResults[index];this._searchableView.updateCurrentMatchIndex(index);if(searchResult.node===null){return;}
if(typeof searchResult.node==='undefined'){searchResult.domModel.searchResult(searchResult.index).then(node=>{searchResult.node=node;this._highlightCurrentSearchResult();});return;}
const treeElement=this._treeElementForNode(searchResult.node);searchResult.node.scrollIntoView();if(treeElement){treeElement.highlightSearchResults(this._searchConfig.query);treeElement.reveal();const matches=treeElement.listItemElement.getElementsByClassName(UI.highlightedSearchResultClassName);if(matches.length){matches[0].scrollIntoViewIfNeeded(false);}}}
_hideSearchHighlights(){if(!this._searchResults||!this._searchResults.length||this._currentSearchResultIndex===undefined){return;}
const searchResult=this._searchResults[this._currentSearchResultIndex];if(!searchResult.node){return;}
const treeOutline=Elements.ElementsTreeOutline.forDOMModel(searchResult.node.domModel());const treeElement=treeOutline.findTreeElement(searchResult.node);if(treeElement){treeElement.hideSearchHighlights();}}
selectedDOMNode(){for(let i=0;i<this._treeOutlines.length;++i){const treeOutline=this._treeOutlines[i];if(treeOutline.selectedDOMNode()){return treeOutline.selectedDOMNode();}}
return null;}
selectDOMNode(node,focus){for(const treeOutline of this._treeOutlines){const outline=Elements.ElementsTreeOutline.forDOMModel(node.domModel());if(outline===treeOutline){treeOutline.selectDOMNode(node,focus);}else{treeOutline.selectDOMNode(null);}}}
_updateBreadcrumbIfNeeded(event){const nodes=(event.data);this._breadcrumbs.updateNodes(nodes);}
_crumbNodeSelected(event){const node=(event.data);this.selectDOMNode(node,true);}
_treeOutlineForNode(node){if(!node){return null;}
return Elements.ElementsTreeOutline.forDOMModel(node.domModel());}
_treeElementForNode(node){const treeOutline=this._treeOutlineForNode(node);return(treeOutline.findTreeElement(node));}
_leaveUserAgentShadowDOM(node){let userAgentShadowRoot;while((userAgentShadowRoot=node.ancestorUserAgentShadowRoot())&&userAgentShadowRoot.parentNode){node=userAgentShadowRoot.parentNode;}
return node;}
revealAndSelectNode(node,focus,omitHighlight){this._omitDefaultSelection=true;node=Common.moduleSetting('showUAShadowDOM').get()?node:this._leaveUserAgentShadowDOM(node);if(!omitHighlight){node.highlightForTwoSeconds();}
return UI.viewManager.showView('elements',false,!focus).then(()=>{this.selectDOMNode(node,focus);delete this._omitDefaultSelection;if(!this._notFirstInspectElement){Elements.ElementsPanel._firstInspectElementNodeNameForTest=node.nodeName();Elements.ElementsPanel._firstInspectElementCompletedForTest();Host.InspectorFrontendHost.inspectElementCompleted();}
this._notFirstInspectElement=true;});}
_showUAShadowDOMChanged(){for(let i=0;i<this._treeOutlines.length;++i){this._treeOutlines[i].update();}}
_setupTextSelectionHack(stylePaneWrapperElement){const uninstallHackBound=uninstallHack.bind(this);const uninstallHackOnMousemove=event=>{if(event.buttons===0){uninstallHack.call(this);}};stylePaneWrapperElement.addEventListener('mousedown',event=>{if(event.which!==1){return;}
this._splitWidget.element.classList.add('disable-resizer-for-elements-hack');stylePaneWrapperElement.style.setProperty('height',`${stylePaneWrapperElement.offsetHeight}px`);const largeLength=1000000;stylePaneWrapperElement.style.setProperty('left',`${- 1 * largeLength}px`);stylePaneWrapperElement.style.setProperty('padding-left',`${largeLength}px`);stylePaneWrapperElement.style.setProperty('width',`calc(100% + ${largeLength}px)`);stylePaneWrapperElement.style.setProperty('position',`fixed`);stylePaneWrapperElement.window().addEventListener('blur',uninstallHackBound);stylePaneWrapperElement.window().addEventListener('contextmenu',uninstallHackBound,true);stylePaneWrapperElement.window().addEventListener('dragstart',uninstallHackBound,true);stylePaneWrapperElement.window().addEventListener('mousemove',uninstallHackOnMousemove,true);stylePaneWrapperElement.window().addEventListener('mouseup',uninstallHackBound,true);stylePaneWrapperElement.window().addEventListener('visibilitychange',uninstallHackBound);},true);function uninstallHack(){this._splitWidget.element.classList.remove('disable-resizer-for-elements-hack');stylePaneWrapperElement.style.removeProperty('left');stylePaneWrapperElement.style.removeProperty('padding-left');stylePaneWrapperElement.style.removeProperty('width');stylePaneWrapperElement.style.removeProperty('position');stylePaneWrapperElement.window().removeEventListener('blur',uninstallHackBound);stylePaneWrapperElement.window().removeEventListener('contextmenu',uninstallHackBound,true);stylePaneWrapperElement.window().removeEventListener('dragstart',uninstallHackBound,true);stylePaneWrapperElement.window().removeEventListener('mousemove',uninstallHackOnMousemove,true);stylePaneWrapperElement.window().removeEventListener('mouseup',uninstallHackBound,true);stylePaneWrapperElement.window().removeEventListener('visibilitychange',uninstallHackBound);}}
_updateSidebarPosition(){if(this.sidebarPaneView&&this.sidebarPaneView.tabbedPane().shouldHideOnDetach()){return;}
let splitMode;const position=Common.moduleSetting('sidebarPosition').get();if(position==='right'||(position==='auto'&&UI.inspectorView.element.offsetWidth>680)){splitMode=Elements.ElementsPanel._splitMode.Vertical;}else if(UI.inspectorView.element.offsetWidth>415){splitMode=Elements.ElementsPanel._splitMode.Horizontal;}else{splitMode=Elements.ElementsPanel._splitMode.Slim;}
if(this.sidebarPaneView&&splitMode===this._splitMode){return;}
this._splitMode=splitMode;const extensionSidebarPanes=Extensions.extensionServer.sidebarPanes();let lastSelectedTabId=null;if(this.sidebarPaneView){lastSelectedTabId=this.sidebarPaneView.tabbedPane().selectedTabId;this.sidebarPaneView.tabbedPane().detach();this._splitWidget.uninstallResizer(this.sidebarPaneView.tabbedPane().headerElement());}
this._splitWidget.setVertical(this._splitMode===Elements.ElementsPanel._splitMode.Vertical);this.showToolbarPane(null,null);const matchedStylePanesWrapper=new UI.VBox();matchedStylePanesWrapper.element.classList.add('style-panes-wrapper');this._stylesWidget.show(matchedStylePanesWrapper.element);this._setupTextSelectionHack(matchedStylePanesWrapper.element);const computedStylePanesWrapper=new UI.VBox();computedStylePanesWrapper.element.classList.add('style-panes-wrapper');this._computedStyleWidget.show(computedStylePanesWrapper.element);function showMetrics(inComputedStyle){if(inComputedStyle){this._metricsWidget.show(computedStylePanesWrapper.element,this._computedStyleWidget.element);}else{this._metricsWidget.show(matchedStylePanesWrapper.element);}}
function tabSelected(event){const tabId=(event.data.tabId);if(tabId===Common.UIString('Computed')){showMetrics.call(this,true);}else if(tabId===Common.UIString('Styles')){showMetrics.call(this,false);}}
this.sidebarPaneView=UI.viewManager.createTabbedLocation(()=>UI.viewManager.showView('elements'));const tabbedPane=this.sidebarPaneView.tabbedPane();if(this._popoverHelper){this._popoverHelper.hidePopover();}
this._popoverHelper=new UI.PopoverHelper(tabbedPane.element,this._getPopoverRequest.bind(this));this._popoverHelper.setHasPadding(true);this._popoverHelper.setTimeout(0);if(this._splitMode!==Elements.ElementsPanel._splitMode.Vertical){this._splitWidget.installResizer(tabbedPane.headerElement());}
const stylesView=new UI.SimpleView(Common.UIString('Styles'));this.sidebarPaneView.appendView(stylesView);if(splitMode===Elements.ElementsPanel._splitMode.Horizontal){stylesView.element.classList.add('flex-auto');const splitWidget=new UI.SplitWidget(true,true,'stylesPaneSplitViewState',215);splitWidget.show(stylesView.element);splitWidget.setMainWidget(matchedStylePanesWrapper);splitWidget.setSidebarWidget(computedStylePanesWrapper);}else{stylesView.element.classList.add('flex-auto');matchedStylePanesWrapper.show(stylesView.element);const computedView=new UI.SimpleView(Common.UIString('Computed'));computedView.element.classList.add('composite','fill');computedStylePanesWrapper.show(computedView.element);tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected,tabSelected,this);this.sidebarPaneView.appendView(computedView);}
this._stylesViewToReveal=stylesView;showMetrics.call(this,this._splitMode===Elements.ElementsPanel._splitMode.Horizontal);this.sidebarPaneView.appendApplicableItems('elements-sidebar');for(let i=0;i<extensionSidebarPanes.length;++i){this._addExtensionSidebarPane(extensionSidebarPanes[i]);}
if(lastSelectedTabId){this.sidebarPaneView.tabbedPane().selectTab(lastSelectedTabId);}
this._splitWidget.setSidebarWidget(this.sidebarPaneView.tabbedPane());}
_extensionSidebarPaneAdded(event){const pane=(event.data);this._addExtensionSidebarPane(pane);}
_addExtensionSidebarPane(pane){if(pane.panelName()===this.name){this.sidebarPaneView.appendView(pane);}}};Elements.ElementsPanel._elementsSidebarViewTitleSymbol=Symbol('title');Elements.ElementsPanel._splitMode={Vertical:Symbol('Vertical'),Horizontal:Symbol('Horizontal'),Slim:Symbol('Slim'),};Elements.ElementsPanel._firstInspectElementCompletedForTest=function(){};Elements.ElementsPanel.ContextMenuProvider=class{appendApplicableItems(event,contextMenu,object){if(!(object instanceof SDK.RemoteObject&&((object)).isNode())&&!(object instanceof SDK.DOMNode)&&!(object instanceof SDK.DeferredDOMNode)){return;}
if(Elements.ElementsPanel.instance().element.isAncestor((event.target))){return;}
const commandCallback=Common.Revealer.reveal.bind(Common.Revealer,object);contextMenu.revealSection().appendItem(Common.UIString('Reveal in Elements panel'),commandCallback);}};Elements.ElementsPanel.DOMNodeRevealer=class{reveal(node,omitFocus){const panel=Elements.ElementsPanel.instance();panel._pendingNodeReveal=true;return new Promise(revealPromise);function revealPromise(resolve,reject){if(node instanceof SDK.DOMNode){onNodeResolved((node));}else if(node instanceof SDK.DeferredDOMNode){((node)).resolve(onNodeResolved);}else if(node instanceof SDK.RemoteObject){const domModel=(node).runtimeModel().target().model(SDK.DOMModel);if(domModel){domModel.pushObjectAsNodeToFrontend(node).then(onNodeResolved);}else{reject(new Error('Could not resolve a node to reveal.'));}}else{reject(new Error('Can\'t reveal a non-node.'));panel._pendingNodeReveal=false;}
function onNodeResolved(resolvedNode){panel._pendingNodeReveal=false;let currentNode=resolvedNode;while(currentNode.parentNode){currentNode=currentNode.parentNode;}
const isDetached=!(currentNode instanceof SDK.DOMDocument);const isDocument=node instanceof SDK.DOMDocument;if(!isDocument&&isDetached){const msg=ls`Node cannot be found in the current page.`;Common.console.warn(msg);reject(new Error(msg));return;}
if(resolvedNode){panel.revealAndSelectNode(resolvedNode,!omitFocus).then(resolve);return;}
reject(new Error('Could not resolve node to reveal.'));}}}};Elements.ElementsPanel.CSSPropertyRevealer=class{reveal(property){const panel=Elements.ElementsPanel.instance();return panel._revealProperty((property));}};Elements.ElementsActionDelegate=class{handleAction(context,actionId){const node=UI.context.flavor(SDK.DOMNode);if(!node){return true;}
const treeOutline=Elements.ElementsTreeOutline.forDOMModel(node.domModel());if(!treeOutline){return true;}
switch(actionId){case'elements.hide-element':treeOutline.toggleHideElement(node);return true;case'elements.edit-as-html':treeOutline.toggleEditAsHTML(node);return true;case'elements.undo':SDK.domModelUndoStack.undo();Elements.ElementsPanel.instance()._stylesWidget.forceUpdate();return true;case'elements.redo':SDK.domModelUndoStack.redo();Elements.ElementsPanel.instance()._stylesWidget.forceUpdate();return true;}
return false;}};Elements.ElementsPanel.PseudoStateMarkerDecorator=class{decorate(node){return{color:'orange',title:Common.UIString('Element state: %s',':'+node.domModel().cssModel().pseudoState(node).join(', :'))};}};;Elements.ClassesPaneWidget=class extends UI.Widget{constructor(){super(true);this.registerRequiredCSS('elements/classesPaneWidget.css');this.contentElement.className='styles-element-classes-pane';const container=this.contentElement.createChild('div','title-container');this._input=container.createChild('div','new-class-input monospace');this.setDefaultFocusedElement(this._input);this._classesContainer=this.contentElement.createChild('div','source-code');this._classesContainer.classList.add('styles-element-classes-container');this._prompt=new Elements.ClassesPaneWidget.ClassNamePrompt(this._nodeClasses.bind(this));this._prompt.setAutocompletionTimeout(0);this._prompt.renderAsBlock();const proxyElement=this._prompt.attach(this._input);this._prompt.setPlaceholder(Common.UIString('Add new class'));this._prompt.addEventListener(UI.TextPrompt.Events.TextChanged,this._onTextChanged,this);proxyElement.addEventListener('keydown',this._onKeyDown.bind(this),false);SDK.targetManager.addModelListener(SDK.DOMModel,SDK.DOMModel.Events.DOMMutated,this._onDOMMutated,this);this._mutatingNodes=new Set();this._pendingNodeClasses=new Map();this._updateNodeThrottler=new Common.Throttler(0);this._previousTarget=null;UI.context.addFlavorChangeListener(SDK.DOMNode,this._onSelectedNodeChanged,this);}
_splitTextIntoClasses(text){return text.split(/[.,\s]/).map(className=>className.trim()).filter(className=>className.length);}
_onKeyDown(event){if(!isEnterKey(event)&&!isEscKey(event)){return;}
if(isEnterKey(event)){event.consume();if(this._prompt.acceptAutoComplete()){return;}}
let text=event.target.textContent;if(isEscKey(event)){if(!text.isWhitespace()){event.consume(true);}
text='';}
this._prompt.clearAutocomplete();event.target.textContent='';const node=UI.context.flavor(SDK.DOMNode);if(!node){return;}
const classNames=this._splitTextIntoClasses(text);for(const className of classNames){this._toggleClass(node,className,true);}
this._installNodeClasses(node);this._update();}
_onTextChanged(){const node=UI.context.flavor(SDK.DOMNode);if(!node){return;}
this._installNodeClasses(node);}
_onDOMMutated(event){const node=(event.data);if(this._mutatingNodes.has(node)){return;}
delete node[Elements.ClassesPaneWidget._classesSymbol];this._update();}
_onSelectedNodeChanged(event){if(this._previousTarget&&this._prompt.text()){this._input.textContent='';this._installNodeClasses(this._previousTarget);}
this._previousTarget=(event.data);this._update();}
wasShown(){this._update();}
_update(){if(!this.isShowing()){return;}
let node=UI.context.flavor(SDK.DOMNode);if(node){node=node.enclosingElementOrSelf();}
this._classesContainer.removeChildren();this._input.disabled=!node;if(!node){return;}
const classes=this._nodeClasses(node);const keys=classes.keysArray();keys.sort(String.caseInsensetiveComparator);for(let i=0;i<keys.length;++i){const className=keys[i];const label=UI.CheckboxLabel.create(className,classes.get(className));label.classList.add('monospace');label.checkboxElement.addEventListener('click',this._onClick.bind(this,className),false);this._classesContainer.appendChild(label);}}
_onClick(className,event){const node=UI.context.flavor(SDK.DOMNode);if(!node){return;}
const enabled=event.target.checked;this._toggleClass(node,className,enabled);this._installNodeClasses(node);}
_nodeClasses(node){let result=node[Elements.ClassesPaneWidget._classesSymbol];if(!result){const classAttribute=node.getAttribute('class')||'';const classes=classAttribute.split(/\s/);result=new Map();for(let i=0;i<classes.length;++i){const className=classes[i].trim();if(!className.length){continue;}
result.set(className,true);}
node[Elements.ClassesPaneWidget._classesSymbol]=result;}
return result;}
_toggleClass(node,className,enabled){const classes=this._nodeClasses(node);classes.set(className,enabled);}
_installNodeClasses(node){const classes=this._nodeClasses(node);const activeClasses=new Set();for(const className of classes.keys()){if(classes.get(className)){activeClasses.add(className);}}
const additionalClasses=this._splitTextIntoClasses(this._prompt.textWithCurrentSuggestion());for(const className of additionalClasses){activeClasses.add(className);}
const newClasses=activeClasses.valuesArray();newClasses.sort();this._pendingNodeClasses.set(node,newClasses.join(' '));this._updateNodeThrottler.schedule(this._flushPendingClasses.bind(this));}
_flushPendingClasses(){const promises=[];for(const node of this._pendingNodeClasses.keys()){this._mutatingNodes.add(node);const promise=node.setAttributeValuePromise('class',this._pendingNodeClasses.get(node)).then(onClassValueUpdated.bind(this,node));promises.push(promise);}
this._pendingNodeClasses.clear();return Promise.all(promises);function onClassValueUpdated(node){this._mutatingNodes.delete(node);}}};Elements.ClassesPaneWidget._classesSymbol=Symbol('Elements.ClassesPaneWidget._classesSymbol');Elements.ClassesPaneWidget.ButtonProvider=class{constructor(){this._button=new UI.ToolbarToggle(Common.UIString('Element Classes'),'');this._button.setText('.cls');this._button.element.classList.add('monospace');this._button.addEventListener(UI.ToolbarButton.Events.Click,this._clicked,this);this._view=new Elements.ClassesPaneWidget();}
_clicked(){Elements.ElementsPanel.instance().showToolbarPane(!this._view.isShowing()?this._view:null,this._button);}
item(){return this._button;}};Elements.ClassesPaneWidget.ClassNamePrompt=class extends UI.TextPrompt{constructor(nodeClasses){super();this._nodeClasses=nodeClasses;this.initialize(this._buildClassNameCompletions.bind(this),' ');this.disableDefaultSuggestionForEmptyInput();this._selectedFrameId='';this._classNamesPromise=null;}
_getClassNames(selectedNode){const promises=[];const completions=new Set();this._selectedFrameId=selectedNode.frameId();const cssModel=selectedNode.domModel().cssModel();const allStyleSheets=cssModel.allStyleSheets();for(const stylesheet of allStyleSheets){if(stylesheet.frameId!==this._selectedFrameId){continue;}
const cssPromise=cssModel.classNamesPromise(stylesheet.id).then(classes=>completions.addAll(classes));promises.push(cssPromise);}
const domPromise=selectedNode.domModel().classNamesPromise(selectedNode.ownerDocument.id).then(classes=>completions.addAll(classes));promises.push(domPromise);return Promise.all(promises).then(()=>completions.valuesArray());}
_buildClassNameCompletions(expression,prefix,force){if(!prefix||force){this._classNamesPromise=null;}
const selectedNode=UI.context.flavor(SDK.DOMNode);if(!selectedNode||(!prefix&&!force&&!expression.trim())){return Promise.resolve([]);}
if(!this._classNamesPromise||this._selectedFrameId!==selectedNode.frameId()){this._classNamesPromise=this._getClassNames(selectedNode);}
return this._classNamesPromise.then(completions=>{const classesMap=this._nodeClasses((selectedNode));completions=completions.filter(value=>!classesMap.get(value));if(prefix[0]==='.'){completions=completions.map(value=>'.'+value);}
return completions.filter(value=>value.startsWith(prefix)).sort().map(completion=>({text:completion}));});}};;Elements.ElementStatePaneWidget=class extends UI.Widget{constructor(){super(true);this.registerRequiredCSS('elements/elementStatePaneWidget.css');this.contentElement.className='styles-element-state-pane';this.contentElement.createChild('div').createTextChild(Common.UIString('Force element state'));const table=createElementWithClass('table','source-code');const inputs=[];this._inputs=inputs;function clickListener(event){const node=UI.context.flavor(SDK.DOMNode);if(!node){return;}
node.domModel().cssModel().forcePseudoState(node,event.target.state,event.target.checked);}
function createCheckbox(state){const td=createElement('td');const label=UI.CheckboxLabel.create(':'+state);const input=label.checkboxElement;input.state=state;input.addEventListener('click',clickListener,false);inputs.push(input);td.appendChild(label);return td;}
let tr=table.createChild('tr');tr.appendChild(createCheckbox.call(null,'active'));tr.appendChild(createCheckbox.call(null,'hover'));tr=table.createChild('tr');tr.appendChild(createCheckbox.call(null,'focus'));tr.appendChild(createCheckbox.call(null,'visited'));tr=table.createChild('tr');tr.appendChild(createCheckbox.call(null,'focus-within'));try{tr.querySelector(':focus-visible');tr.appendChild(createCheckbox.call(null,'focus-visible'));}catch(e){}
this.contentElement.appendChild(table);UI.context.addFlavorChangeListener(SDK.DOMNode,this._update,this);}
_updateModel(cssModel){if(this._cssModel===cssModel){return;}
if(this._cssModel){this._cssModel.removeEventListener(SDK.CSSModel.Events.PseudoStateForced,this._update,this);}
this._cssModel=cssModel;if(this._cssModel){this._cssModel.addEventListener(SDK.CSSModel.Events.PseudoStateForced,this._update,this);}}
wasShown(){this._update();}
_update(){if(!this.isShowing()){return;}
let node=UI.context.flavor(SDK.DOMNode);if(node){node=node.enclosingElementOrSelf();}
this._updateModel(node?node.domModel().cssModel():null);if(node){const nodePseudoState=node.domModel().cssModel().pseudoState(node);for(const input of this._inputs){input.disabled=!!node.pseudoType();input.checked=nodePseudoState.indexOf(input.state)>=0;}}else{for(const input of this._inputs){input.disabled=true;input.checked=false;}}}};Elements.ElementStatePaneWidget.ButtonProvider=class{constructor(){this._button=new UI.ToolbarToggle(Common.UIString('Toggle Element State'),'');this._button.setText(Common.UIString(':hov'));this._button.addEventListener(UI.ToolbarButton.Events.Click,this._clicked,this);this._button.element.classList.add('monospace');this._view=new Elements.ElementStatePaneWidget();}
_clicked(){Elements.ElementsPanel.instance().showToolbarPane(!this._view.isShowing()?this._view:null,this._button);}
item(){return this._button;}};;Elements.ElementsTreeElementHighlighter=class{constructor(treeOutline){this._throttler=new Common.Throttler(100);this._treeOutline=treeOutline;this._treeOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded,this._clearState,this);this._treeOutline.addEventListener(UI.TreeOutline.Events.ElementCollapsed,this._clearState,this);this._treeOutline.addEventListener(Elements.ElementsTreeOutline.Events.SelectedNodeChanged,this._clearState,this);SDK.targetManager.addModelListener(SDK.OverlayModel,SDK.OverlayModel.Events.HighlightNodeRequested,this._highlightNode,this);SDK.targetManager.addModelListener(SDK.OverlayModel,SDK.OverlayModel.Events.InspectModeWillBeToggled,this._clearState,this);}
_highlightNode(event){if(!Common.moduleSetting('highlightNodeOnHoverInOverlay').get()){return;}
const domNode=(event.data);this._throttler.schedule(callback.bind(this));this._pendingHighlightNode=this._treeOutline===Elements.ElementsTreeOutline.forDOMModel(domNode.domModel())?domNode:null;function callback(){this._highlightNodeInternal(this._pendingHighlightNode);delete this._pendingHighlightNode;return Promise.resolve();}}
_highlightNodeInternal(node){this._isModifyingTreeOutline=true;let treeElement=null;if(this._currentHighlightedElement){let currentTreeElement=this._currentHighlightedElement;while(currentTreeElement!==this._alreadyExpandedParentElement){if(currentTreeElement.expanded){currentTreeElement.collapse();}
currentTreeElement=currentTreeElement.parent;}}
delete this._currentHighlightedElement;delete this._alreadyExpandedParentElement;if(node){let deepestExpandedParent=node;const treeElementSymbol=this._treeOutline.treeElementSymbol();while(deepestExpandedParent&&(!deepestExpandedParent[treeElementSymbol]||!deepestExpandedParent[treeElementSymbol].expanded)){deepestExpandedParent=deepestExpandedParent.parentNode;}
this._alreadyExpandedParentElement=deepestExpandedParent?deepestExpandedParent[treeElementSymbol]:this._treeOutline.rootElement();treeElement=this._treeOutline.createTreeElementFor(node);}
this._currentHighlightedElement=treeElement;this._treeOutline.setHoverEffect(treeElement);if(treeElement){treeElement.reveal(true);}
this._isModifyingTreeOutline=false;}
_clearState(){if(this._isModifyingTreeOutline){return;}
delete this._currentHighlightedElement;delete this._alreadyExpandedParentElement;delete this._pendingHighlightNode;}};;Root.Runtime.cachedResources["elements/breadcrumbs.css"]="/*\n * Copyright 2014 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.crumbs {\n    display: inline-block;\n    pointer-events: auto;\n    cursor: default;\n    white-space: nowrap;\n}\n\n.crumbs .crumb {\n    display: inline-block;\n    padding: 0 7px;\n    line-height: 23px;\n    white-space: nowrap;\n}\n\n.crumbs .crumb.collapsed > * {\n    display: none;\n}\n\n.crumbs .crumb.collapsed::before {\n    content: \"\\2026\";\n    font-weight: bold;\n}\n\n.crumbs .crumb.compact .extra {\n    display: none;\n}\n\n.crumb.selected, .crumb:hover {\n    background-color: var(--toolbar-bg-color);\n}\n\n.crumb:not(.selected) .node-label-name {\n    color: var(--dom-tag-name-color);\n}\n\n.crumb:not(.selected) .node-label-class {\n    color: var(--dom-attribute-name-color);\n}\n\n/*# sourceURL=elements/breadcrumbs.css */";Root.Runtime.cachedResources["elements/classesPaneWidget.css"]="/**\n * Copyright 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.styles-element-classes-pane {\n    background-color: var(--toolbar-bg-color);\n    border-bottom: 1px solid rgb(189, 189, 189);\n    padding: 6px 2px 2px;\n}\n\n.styles-element-classes-container {\n    display: flex;\n    flex-wrap: wrap;\n    justify-content: flex-start;\n}\n\n.styles-element-classes-pane [is=dt-checkbox] {\n    margin-right: 15px;\n}\n\n.styles-element-classes-pane .title-container {\n    padding-bottom: 2px;\n}\n\n.styles-element-classes-pane .new-class-input {\n    padding-left: 3px;\n    padding-right: 3px;\n    overflow: hidden;\n    border: 1px solid #ddd;\n    line-height: 15px;\n    margin-left: 3px;\n    width: calc(100% - 7px);\n    background-color: #fff;\n    cursor: text;\n}\n\n/*# sourceURL=elements/classesPaneWidget.css */";Root.Runtime.cachedResources["elements/computedStyleSidebarPane.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.computed-properties {\n    -webkit-user-select: text;\n    flex-shrink: 0;\n}\n\n.styles-sidebar-pane-toolbar {\n    border-bottom: 1px solid #eee;\n    flex-shrink: 0;\n}\n\n.styles-sidebar-pane-filter-box {\n    flex: auto;\n    display: flex;\n}\n\n.styles-sidebar-pane-filter-box > input {\n    outline: none !important;\n    border: none;\n    width: 100%;\n    background: white;\n    padding-left: 4px;\n    margin: 3px;\n}\n\n.styles-sidebar-pane-filter-box > input:focus,\n.styles-sidebar-pane-filter-box > input:not(:placeholder-shown) {\n    box-shadow: var(--focus-ring-active-shadow);\n}\n\n.styles-sidebar-pane-filter-box > input::placeholder {\n    color: rgba(0, 0, 0, 0.54);\n}\n\n/*# sourceURL=elements/computedStyleSidebarPane.css */";Root.Runtime.cachedResources["elements/computedStyleWidgetTree.css"]="/*\n * Copyright (c) 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.computed-style-property {\n    overflow: hidden;\n    flex: auto;\n    text-overflow: ellipsis;\n}\n\n.computed-style-property .property-name {\n    width: 16em;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    max-width: 52%;\n    display: inline-block;\n    vertical-align: text-top;\n}\n\n.computed-style-property .property-value {\n    margin-left: 2em;\n    position: relative;\n}\n\n.computed-style-property .property-value-text {\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n.tree-outline li:hover .goto-source-icon {\n    display: block;\n    margin-top: -2px;\n}\n\n.goto-source-icon {\n    background-color: #5a5a5a;\n    display: none;\n    position: absolute;\n    left: -16px;\n    top: 0;\n}\n\n.goto-source-icon:hover {\n    background-color: #333;\n}\n\n.computed-style-property-inherited {\n    opacity: 0.5;\n}\n\n.trace-link {\n    user-select: none;\n    float: right;\n    padding-left: 1em;\n    position: relative;\n    z-index: 1;\n}\n\n.property-trace {\n    text-overflow: ellipsis;\n    overflow: hidden;\n    flex-grow: 1;\n}\n\n.property-trace-selector {\n    color: gray;\n    padding-left: 2em;\n}\n\n.property-trace-value {\n    position: relative;\n    display: inline-block;\n    margin-left: 16px;\n}\n\n.property-trace-inactive .property-trace-value::before {\n    position: absolute;\n    content: \".\";\n    border-bottom: 1px solid rgba(0, 0, 0, 0.35);\n    top: 0;\n    bottom: 5px;\n    left: 0;\n    right: 0;\n}\n\n.tree-outline li.odd-row {\n    position: relative;\n    background-color: #F5F5F5;\n}\n\n.tree-outline, .tree-outline ol {\n    padding-left: 0;\n}\n\n.tree-outline li:hover {\n    background-color: rgb(235, 242, 252);\n    cursor: pointer;\n}\n\n.tree-outline li::before {\n    margin-left: 4px;\n}\n\n.delimeter {\n    color: transparent;\n}\n\n.delimeter::selection {\n    color: transparent;\n}\n\n.computed-narrow .computed-style-property .property-name,\n.computed-narrow .computed-style-property .property-value {\n    display: inline-block;\n    width: 100%;\n    max-width: 100%;\n    margin-left: 0;\n    white-space: nowrap;\n}\n\n.computed-narrow .computed-style-property {\n    padding: 2px 0;\n    display: block;\n    white-space: normal;\n}\n\n.computed-narrow.tree-outline li::before {\n    margin-top: -14px;\n}\n\n/*# sourceURL=elements/computedStyleWidgetTree.css */";Root.Runtime.cachedResources["elements/domLinkifier.css"]="/*\n * Copyright 2018 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n  display: inline;\n}\n\n.node-link {\n    cursor: pointer;\n    display: inline;\n    pointer-events: auto;\n}\n\n.node-link[data-keyboard-focus=\"true\"]:focus {\n    outline-width: unset;\n}\n\n.node-label-name {\n    color: rgb(136, 18, 128);\n}\n\n.node-label-class, .node-label-pseudo {\n    color: rgb(153, 69, 0);\n}\n\n/*# sourceURL=elements/domLinkifier.css */";Root.Runtime.cachedResources["elements/elementsPanel.css"]="/*\n * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.\n * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions\n * are met:\n *\n * 1.  Redistributions of source code must retain the above copyright\n *     notice, this list of conditions and the following disclaimer.\n * 2.  Redistributions in binary form must reproduce the above copyright\n *     notice, this list of conditions and the following disclaimer in the\n *     documentation and/or other materials provided with the distribution.\n * 3.  Neither the name of Apple Computer, Inc. (\"Apple\") nor the names of\n *     its contributors may be used to endorse or promote products derived\n *     from this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS \"AS IS\" AND ANY\n * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY\n * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\n * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n#elements-content {\n    flex: 1 1;\n    overflow: auto;\n    padding: 2px 0 0 0;\n}\n\n#elements-content:not(.elements-wrap) > div {\n    display: inline-block;\n    min-width: 100%;\n}\n\n#elements-content.elements-wrap {\n    overflow-x: hidden;\n}\n\n#elements-crumbs {\n    flex: 0 0 23px;\n    background-color: white;\n    border-top: 1px solid var(--divider-color);\n    overflow: hidden;\n    width: 100%;\n}\n\n.style-panes-wrapper {\n    overflow: hidden auto;\n}\n\n.style-panes-wrapper > div:not(:first-child) {\n    border-top: 1px solid var(--divider-color);\n}\n\n.elements-tree-header {\n    height: 24px;\n    border-top: 1px solid var(--divider-color);\n    border-bottom: 1px solid var(--divider-color);\n    display: flex;\n    flex-direction: row;\n    align-items: center;\n}\n\n.elements-tree-header-frame {\n    margin-left: 6px;\n    margin-right: 6px;\n    flex: none;\n}\n\n/*# sourceURL=elements/elementsPanel.css */";Root.Runtime.cachedResources["elements/elementStatePaneWidget.css"]="/**\n * Copyright 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.styles-element-state-pane {\n    overflow: hidden;\n    padding-left: 2px;\n    background-color: var(--toolbar-bg-color);\n    border-bottom: 1px solid rgb(189, 189, 189);\n    margin-top: 0;\n    padding-bottom: 2px;\n}\n\n.styles-element-state-pane > div {\n    margin: 8px 4px 6px;\n}\n\n.styles-element-state-pane > table {\n    width: 100%;\n    border-spacing: 0;\n}\n\n.styles-element-state-pane td {\n    padding: 0;\n}\n\n/*# sourceURL=elements/elementStatePaneWidget.css */";Root.Runtime.cachedResources["elements/elementsTreeOutline.css"]="/*\n * Copyright (c) 2014 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.elements-disclosure {\n    width: 100%;\n    display: inline-block;\n    line-height: normal;\n}\n\n.elements-disclosure li {\n    /** Keep margin-left & padding-left in sync with ElementsTreeElements.updateDecorators **/\n    padding: 0 0 0 14px;\n    border-top: 1px solid transparent;\n    margin-left: -2px;\n    word-wrap: break-word;\n    position: relative;\n    min-height: 15px;\n    line-height: 1.36;\n}\n\n.elements-disclosure li.parent {\n    /** Keep it in sync with ElementsTreeElements.updateDecorators **/\n    margin-left: -13px;\n}\n\n.elements-disclosure li .selected-hint:before {\n    font-style: italic;\n    content: \" == $0\";\n    opacity: 0;\n    position: absolute;\n    white-space: pre;\n}\n\n.elements-disclosure .elements-tree-outline:not(.hide-selection-when-blurred) li.selected .selected-hint:before {\n    opacity: 0.6;\n}\n\n.elements-disclosure li.parent::before {\n    box-sizing: border-box;\n}\n\n.elements-disclosure li.parent::before {\n    -webkit-user-select: none;\n    -webkit-mask-image: url(Images/treeoutlineTriangles.svg);\n    -webkit-mask-size: 32px 24px;\n    content: '\\00a0\\00a0';\n    color: transparent;\n    text-shadow: none;\n    margin-right: -3px;\n}\n\n.elements-disclosure li.always-parent::before {\n    visibility: hidden;\n}\n\n.elements-disclosure li.parent::before {\n    -webkit-mask-position: 0 0;\n    background-color: #727272;\n}\n\n.elements-disclosure li .selection {\n    display: none;\n    z-index: -1;\n}\n\n.elements-disclosure li.hovered:not(.selected) .selection {\n    display: block;\n    left: 3px;\n    right: 3px;\n    background-color: var(--item-hover-color);\n    border-radius: 5px;\n}\n\n.elements-disclosure li.parent.expanded::before {\n    -webkit-mask-position: -16px 0;\n}\n\n.elements-disclosure li.selected .selection {\n    display: block;\n}\n\n.elements-disclosure .elements-tree-outline:not(.hide-selection-when-blurred) .selection {\n    background-color: var(--item-selection-inactive-bg-color);\n}\n\n.elements-disclosure .elements-tree-outline.hide-selection-when-blurred .selected:focus[data-keyboard-focus=\"true\"] .highlight > * {\n    background: var(--focus-bg-color);\n    border-radius: 2px;\n    box-shadow: 0px 0px 0px 2px var(--focus-bg-color);\n}\n\n.elements-disclosure ol {\n    list-style-type: none;\n    /** Keep it in sync with ElementsTreeElements.updateDecorators **/\n    padding-inline-start: 12px;\n    margin: 0;\n}\n\n.elements-disclosure ol.children {\n    display: none;\n}\n\n.elements-disclosure ol.children.expanded {\n    display: block;\n}\n\n.elements-disclosure li .webkit-html-tag.close {\n    margin-left: -12px;\n}\n\n.elements-disclosure > ol {\n    position: relative;\n    margin: 0;\n    cursor: default;\n    min-width: 100%;\n    min-height: 100%;\n    padding-left: 2px;\n}\n\n.elements-disclosure .elements-tree-outline:not(.hide-selection-when-blurred) li.selected:focus .selection {\n    background-color: var(--item-selection-bg-color);\n}\n\n.elements-tree-outline ol.shadow-root-depth-4 {\n    background-color: rgba(0, 0, 0, 0.04);\n}\n\n.elements-tree-outline ol.shadow-root-depth-3 {\n    background-color: rgba(0, 0, 0, 0.03);\n}\n\n.elements-tree-outline ol.shadow-root-depth-2 {\n    background-color: rgba(0, 0, 0, 0.02);\n}\n\n.elements-tree-outline ol.shadow-root-depth-1 {\n    background-color: rgba(0, 0, 0, 0.01);\n}\n\n.elements-tree-outline ol.shadow-root-deep {\n    background-color: transparent;\n}\n\n.elements-tree-editor {\n    box-shadow: var(--drop-shadow);\n    margin-right: 4px;\n}\n\n.elements-disclosure li.elements-drag-over .selection {\n    display: block;\n    margin-top: -2px;\n    border-top: 2px solid var(--selection-bg-color);\n}\n\n.elements-disclosure li.in-clipboard .highlight {\n    outline: 1px dotted darkgrey;\n}\n\n.CodeMirror {\n    background-color: white;\n    height: 300px !important;\n}\n\n.CodeMirror-lines {\n    padding: 0;\n}\n\n.CodeMirror pre {\n    padding: 0;\n}\n\nbutton, input, select {\n  font-family: inherit;\n  font-size: inherit;\n}\n\n.editing {\n    box-shadow: var(--drop-shadow);\n    background-color: white;\n    text-overflow: clip !important;\n    padding-left: 2px;\n    margin-left: -2px;\n    padding-right: 2px;\n    margin-right: -2px;\n    margin-bottom: -1px;\n    padding-bottom: 1px;\n    opacity: 1.0 !important;\n}\n\n.editing,\n.editing * {\n    color: #222 !important;\n    text-decoration: none !important;\n}\n\n.editing br {\n    display: none;\n}\n\n.elements-gutter-decoration {\n    position: absolute;\n    top: 3px;\n    left: 2px;\n    height: 9px;\n    width: 9px;\n    border-radius: 5px;\n    border: 1px solid orange;\n    background-color: orange;\n    cursor: pointer;\n}\n\n.elements-gutter-decoration.elements-has-decorated-children {\n    opacity: 0.5;\n}\n\n.add-attribute {\n    margin-left: 1px;\n    margin-right: 1px;\n    white-space: nowrap;\n}\n\n.elements-tree-nowrap, .elements-tree-nowrap .li {\n    white-space: pre !important;\n}\n\n.elements-disclosure .elements-tree-nowrap li {\n    word-wrap: normal;\n}\n\n/* DOM update highlight */\n@-webkit-keyframes dom-update-highlight-animation {\n    from {\n        background-color: rgb(158, 54, 153);\n        color: white;\n    }\n    80% {\n        background-color: rgb(245, 219, 244);\n        color: inherit;\n    }\n    to {\n        background-color: inherit;\n    }\n}\n\n@-webkit-keyframes dom-update-highlight-animation-dark {\n    from {\n        background-color: rgb(158, 54, 153);\n        color: white;\n    }\n    80% {\n        background-color: #333;\n        color: inherit;\n    }\n    to {\n        background-color: inherit;\n    }\n}\n\n.dom-update-highlight {\n    -webkit-animation: dom-update-highlight-animation 1.4s 1 cubic-bezier(0, 0, 0.2, 1);\n    border-radius: 2px;\n}\n\n:host-context(.-theme-with-dark-background) .dom-update-highlight {\n    -webkit-animation: dom-update-highlight-animation-dark 1.4s 1 cubic-bezier(0, 0, 0.2, 1);\n}\n\n.elements-disclosure.single-node li {\n    padding-left: 2px;\n}\n\n.elements-tree-shortcut-title, .elements-tree-shortcut-link {\n    color: rgb(87, 87, 87);\n}\n\n.elements-disclosure .gutter-container {\n    position: absolute;\n    top: 0;\n    left: 0;\n    cursor: pointer;\n    width: 15px;\n    height: 15px;\n}\n\n.elements-hide-gutter .gutter-container {\n    display: none;\n}\n\n.gutter-menu-icon {\n    display: block;\n    visibility: hidden;\n    transform: rotate(-90deg) scale(0.8);\n    background-color: white;\n    position: relative;\n    left: -7px;\n    top: -3px;\n}\n\n.elements-disclosure li.selected .gutter-container:not(.has-decorations) .gutter-menu-icon {\n    visibility: visible;\n}\n\n/** Guide line */\nli.selected {\n    z-index: 0;\n}\n\nli.hovered:not(.always-parent) + ol.children, .elements-tree-outline ol.shadow-root, li.selected:not(.always-parent) + ol.children {\n    margin-left: 5px;\n    padding-inline-start: 6px;\n    border-width: 1px;\n    border-left-style: solid;\n}\n\nli.hovered:not(.always-parent) + ol.children:not(.shadow-root) {\n    border-color: hsla(0,0%,0%,0.1);\n}\n\n.elements-tree-outline ol.shadow-root {\n    border-color: hsla(0,0%,80%,1);\n}\n\nli.selected:not(.always-parent) + ol.children {\n    border-color: hsla(216,68%,80%,1) !important;\n}\n\n/*# sourceURL=elements/elementsTreeOutline.css */";Root.Runtime.cachedResources["elements/metricsSidebarPane.css"]="/**\n * Copyright 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.metrics {\n    padding: 8px;\n    font-size: 10px;\n    text-align: center;\n    white-space: nowrap;\n    min-height: var(--metrics-height);\n    display: flex;\n    flex-direction: column;\n    -webkit-align-items: center;\n    -webkit-justify-content: center;\n}\n\n:host {\n    --metrics-height: 190px;\n    height: var(--metrics-height);\n    contain: strict;\n}\n\n:host-context(.-theme-with-dark-background) .metrics {\n    color: #222;\n}\n\n:host-context(.-theme-with-dark-background) .metrics > div:hover {\n    color: #ccc;\n}\n\n.metrics .label {\n    position: absolute;\n    font-size: 10px;\n    margin-left: 3px;\n    padding-left: 2px;\n    padding-right: 2px;\n}\n\n.metrics .position {\n    border: 1px rgb(66%, 66%, 66%) dotted;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    padding: 3px;\n    margin: 3px;\n}\n\n.metrics .margin {\n    border: 1px dashed;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    vertical-align: middle;\n    padding: 3px 6px;\n    margin: 3px;\n}\n\n.metrics .border {\n    border: 1px black solid;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    vertical-align: middle;\n    padding: 3px 6px;\n    margin: 3px;\n}\n\n.metrics .padding {\n    border: 1px grey dashed;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    vertical-align: middle;\n    padding: 3px 6px;\n    margin: 3px;\n}\n\n.metrics .content {\n    position: static;\n    border: 1px gray solid;\n    background-color: white;\n    display: inline-block;\n    text-align: center;\n    vertical-align: middle;\n    padding: 3px;\n    margin: 3px;\n    min-width: 80px;\n    overflow: visible;\n}\n\n.metrics .content span {\n    display: inline-block;\n}\n\n.metrics .editing {\n    position: relative;\n    z-index: 100;\n    cursor: text;\n}\n\n.metrics .left {\n    display: inline-block;\n    vertical-align: middle;\n}\n\n.metrics .right {\n    display: inline-block;\n    vertical-align: middle;\n}\n\n.metrics .top {\n    display: inline-block;\n}\n\n.metrics .bottom {\n    display: inline-block;\n}\n\n/*# sourceURL=elements/metricsSidebarPane.css */";Root.Runtime.cachedResources["elements/platformFontsWidget.css"]="/**\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n    -webkit-user-select: text;\n}\n\n.platform-fonts {\n    flex-shrink: 0;\n}\n\n.font-name {\n    font-weight: bold;\n}\n\n.font-usage {\n    color: #888;\n    padding-left: 3px;\n}\n\n.title {\n    padding: 0 5px;\n    border-top: 1px solid;\n    border-bottom: 1px solid;\n    border-color: #ddd;\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    height: 24px;\n    background-color: #f1f1f1;\n    display: flex;\n    align-items: center;\n}\n\n.stats-section {\n    margin: 5px 0;\n}\n\n.font-stats-item {\n    padding-left: 1em;\n}\n\n.font-stats-item .font-delimeter {\n    margin: 0 1ex 0 1ex;\n}\n\n\n/*# sourceURL=elements/platformFontsWidget.css */";Root.Runtime.cachedResources["elements/propertiesWidget.css"]="/*\n * Copyright (c) 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.properties-widget-section {\n    padding: 2px 0px 2px 5px;\n    flex: none;\n}\n\n/*# sourceURL=elements/propertiesWidget.css */";Root.Runtime.cachedResources["elements/nodeStackTraceWidget.css"]="/*\n * Copyright 2019 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.stack-trace {\n  font-size: 11px !important;\n  font-family: Menlo, monospace;\n}\n\n/*# sourceURL=elements/nodeStackTraceWidget.css */";Root.Runtime.cachedResources["elements/stylesSectionTree.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.tree-outline {\n    padding: 0;\n}\n\n.tree-outline li.not-parsed-ok {\n    margin-left: 0;\n}\n\n.tree-outline li.filter-match {\n    background-color: rgba(255, 255, 0, 0.5);\n}\n\n:host-context(.-theme-with-dark-background) .tree-outline li.filter-match {\n    background-color: hsla(133, 100%, 30%, 0.5);\n}\n\n.tree-outline li.overloaded.filter-match {\n    background-color: rgba(255, 255, 0, 0.25);\n}\n\n:host-context(.-theme-with-dark-background) .tree-outline li.overloaded.filter-match {\n    background-color: hsla(133, 100%, 30%, 0.25);\n}\n\n.tree-outline li.not-parsed-ok .exclamation-mark {\n    display: inline-block;\n    position: relative;\n    width: 11px;\n    height: 10px;\n    margin: 0 7px 0 0;\n    top: 1px;\n    left: -36px; /* outdent to compensate for the top-level property indent */\n    -webkit-user-select: none;\n    cursor: default;\n    z-index: 1;\n}\n\n.tree-outline li {\n    margin-left: 12px;\n    padding-left: 22px;\n    white-space: normal;\n    text-overflow: ellipsis;\n    cursor: auto;\n    display: block;\n}\n\n.tree-outline li::before {\n    display: none;\n}\n\n.tree-outline li .webkit-css-property {\n    margin-left: -22px; /* outdent the first line of longhand properties (in an expanded shorthand) to compensate for the \"padding-left\" shift in .tree-outline li */\n}\n\n.tree-outline > li {\n    padding-left: 38px;\n    clear: both;\n    min-height: 14px;\n}\n\n.tree-outline > li .webkit-css-property {\n    margin-left: -38px; /* outdent the first line of the top-level properties to compensate for the \"padding-left\" shift in .tree-outline > li */\n}\n\n.tree-outline > li.child-editing {\n    padding-left: 8px;\n}\n\n.tree-outline > li.child-editing .text-prompt {\n    white-space: pre-wrap;\n}\n\n.tree-outline > li.child-editing .webkit-css-property {\n    margin-left: 0;\n}\n\n.tree-outline li.child-editing {\n    word-wrap: break-word !important;\n    white-space: normal !important;\n    padding-left: 0;\n}\n\nol:not(.tree-outline) {\n    display: none;\n    margin: 0;\n    padding-inline-start: 12px;\n    list-style: none;\n}\n\nol.expanded {\n    display: block;\n}\n\n.tree-outline li .info {\n    padding-top: 4px;\n    padding-bottom: 3px;\n}\n\n.enabled-button {\n    visibility: hidden;\n    float: left;\n    font-size: 10px;\n    margin: 0;\n    vertical-align: top;\n    position: relative;\n    z-index: 1;\n    width: 18px;\n    left: -40px; /* original -2px + (-38px) to compensate for the first line outdent */\n    top: 1px;\n    height: 13px;\n}\n\n.tree-outline li.editing .enabled-button {\n    display: none !important;\n}\n\n.overloaded:not(.has-ignorable-error),\n.inactive,\n.disabled,\n.not-parsed-ok:not(.has-ignorable-error) {\n    text-decoration: line-through;\n}\n\n.has-ignorable-error .webkit-css-property {\n    color: inherit;\n}\n\n.implicit,\n.inherited {\n    opacity: 0.5;\n}\n\n.has-ignorable-error {\n    color: gray;\n}\n\n.tree-outline li.editing {\n    margin-left: 10px;\n    text-overflow: clip;\n}\n\n.tree-outline li.editing-sub-part {\n    padding: 3px 6px 8px 18px;\n    margin: -1px -6px -8px -6px;\n    text-overflow: clip;\n}\n\n:host-context(.no-affect) .tree-outline li {\n    opacity: 0.5;\n}\n\n:host-context(.no-affect) .tree-outline li.editing {\n    opacity: 1.0;\n}\n\n:host-context(.styles-panel-hovered:not(.read-only)) .webkit-css-property:hover,\n:host-context(.styles-panel-hovered:not(.read-only)) .value:hover {\n    text-decoration: underline;\n    cursor: default;\n}\n\n.styles-name-value-separator {\n    display: inline-block;\n    width: 14px;\n    text-decoration: inherit;\n    white-space: pre;\n}\n\n.styles-clipboard-only {\n    display: inline-block;\n    width: 0;\n    opacity: 0;\n    pointer-events: none;\n    white-space: pre;\n}\n\n.tree-outline li.child-editing .styles-clipboard-only {\n    display: none;\n}\n\n/* Matched styles */\n\n:host-context(.matched-styles) .tree-outline li {\n    margin-left: 0 !important;\n}\n\n.expand-icon {\n    -webkit-user-select: none;\n    margin-left: -6px;\n    margin-right: 2px;\n    margin-bottom: -2px;\n}\n\n.tree-outline li:not(.parent) .expand-icon {\n    display: none;\n}\n\n:host-context(.matched-styles:not(.read-only):hover) .enabled-button {\n    visibility: visible;\n}\n\n:host-context(.matched-styles:not(.read-only)) .tree-outline li.disabled .enabled-button {\n    visibility: visible;\n}\n\n:host-context(.matched-styles) ol.expanded {\n    margin-left: 16px;\n}\n\n/*# sourceURL=elements/stylesSectionTree.css */";Root.Runtime.cachedResources["elements/stylesSidebarPane.css"]="/**\n * Copyright 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.styles-section {\n    min-height: 18px;\n    white-space: nowrap;\n    -webkit-user-select: text;\n    border-bottom: 1px solid var(--divider-color);\n    position: relative;\n    overflow: hidden;\n}\n\n.styles-section > div {\n    padding: 2px 2px 4px 4px;\n}\n\n.styles-section:last-child {\n    border-bottom: none;\n}\n\n.styles-section.read-only {\n    background-color: #fafafa;\n    font-style: italic;\n}\n\n.styles-section[data-keyboard-focus=\"true\"]:focus {\n    background-color: hsl(214, 48%, 95%);\n}\n\n.styles-section.read-only[data-keyboard-focus=\"true\"]:focus {\n    background-color: hsl(215, 25%, 87%);\n}\n\n.styles-section .simple-selector.filter-match {\n    background-color: rgba(255, 255, 0, 0.5);\n}\n\n:host-context(.-theme-with-dark-background) .styles-section .simple-selector.filter-match {\n    background-color: hsla(133, 100%, 30%, 0.5);\n}\n\n.sidebar-pane-closing-brace {\n    clear: both;\n}\n\n.styles-section-title {\n    background-origin: padding;\n    background-clip: padding;\n    word-wrap: break-word;\n    white-space: normal;\n}\n\n.styles-section-title .media-list {\n    color: hsl(0, 0%, 46%);\n}\n\n.styles-section-title .media-list.media-matches .media.editable-media {\n    color: #222;\n}\n\n.styles-section-title .media:not(.editing-media),\n.styles-section-title .media:not(.editing-media) .subtitle {\n    overflow: hidden;\n}\n\n.styles-section-title .media .subtitle {\n    float: right;\n    color: hsl(0, 0%, 34%);\n}\n\n.styles-section-subtitle {\n    color: hsl(0, 0%, 44%);\n    float: right;\n    padding-left: 15px;\n    max-width: 100%;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    white-space: nowrap;\n    height: 15px;\n    margin-bottom: -1px;\n}\n\n.sidebar-pane-open-brace,\n.sidebar-pane-closing-brace {\n    color: hsl(0, 0%, 46%);\n}\n\n.styles-section .styles-section-subtitle .devtools-link {\n    color: hsl(0, 0%, 44%);\n    text-decoration-color: hsl(0, 0%, 60%);\n}\n\n.styles-section .selector {\n    color: hsl(0, 0%, 46%);\n}\n\n.styles-section .simple-selector.selector-matches, .styles-section.keyframe-key {\n    color: #222;\n}\n\n.styles-section .devtools-link {\n    user-select: none;\n}\n\n.styles-section .style-properties {\n    margin: 0;\n    padding: 2px 4px 0 0;\n    list-style: none;\n    clear: both;\n    display: flex;\n}\n\n.styles-section.matched-styles .style-properties {\n    padding-left: 0;\n}\n\n@keyframes styles-element-state-pane-slidein {\n    from {\n        margin-top: -60px;\n    }\n    to {\n        margin-top: 0px;\n    }\n}\n\n@keyframes styles-element-state-pane-slideout {\n    from {\n        margin-top: 0px;\n    }\n    to {\n        margin-top: -60px;\n    }\n}\n\n.styles-sidebar-toolbar-pane {\n    position: relative;\n    animation-duration: 0.1s;\n    animation-direction: normal;\n}\n\n.styles-sidebar-toolbar-pane-container {\n    position: relative;\n    overflow: hidden;\n    flex-shrink: 0;\n}\n\n.styles-selector {\n    cursor: text;\n}\n\n.styles-sidebar-pane-toolbar-container {\n    flex-shrink: 0;\n    overflow: hidden;\n    position: sticky;\n    top: 0;\n    background-color: var(--toolbar-bg-color);\n    z-index: 1;\n}\n\n.styles-sidebar-pane-toolbar {\n    border-bottom: 1px solid #eee;\n    flex-shrink: 0;\n}\n\n.styles-sidebar-pane-filter-box {\n    flex: auto;\n    display: flex;\n}\n\n.styles-sidebar-pane-filter-box > input {\n    outline: none !important;\n    border: none;\n    width: 100%;\n    background: white;\n    padding-left: 4px;\n    margin: 3px;\n}\n\n.styles-sidebar-pane-filter-box > input:hover {\n    box-shadow: var(--focus-ring-inactive-shadow);\n}\n\n.styles-sidebar-pane-filter-box > input:focus,\n.styles-sidebar-pane-filter-box > input:not(:placeholder-shown) {\n    box-shadow: var(--focus-ring-active-shadow);\n}\n\n.styles-sidebar-pane-filter-box > input::placeholder {\n    color: rgba(0, 0, 0, 0.54);\n}\n\n.styles-section.styles-panel-hovered:not(.read-only) span.simple-selector:hover,\n.styles-section.styles-panel-hovered:not(.read-only) .media-text :hover{\n    text-decoration: underline;\n    cursor: default;\n}\n\n.sidebar-separator {\n    background-color: var(--toolbar-bg-color);\n    padding: 0 5px;\n    border-bottom: 1px solid var(--divider-color);\n    color: hsla(0, 0%, 32%, 1);\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    line-height: 22px;\n}\n\n.sidebar-separator > span.monospace {\n    max-width: 90px;\n    display: inline-block;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    vertical-align: middle;\n    margin-left: 2px;\n}\n\n.sidebar-pane-section-toolbar {\n    position: absolute;\n    right: 0;\n    bottom: 0;\n    visibility: hidden;\n    background-color: rgba(255, 255, 255, 0.9);\n    z-index: 0;\n}\n\n.styles-section[data-keyboard-focus=\"true\"]:focus .sidebar-pane-section-toolbar {\n    background-color: hsla(214, 67%, 95%, 0.9);\n}\n\n.styles-pane:not(.is-editing-style) .styles-section.matched-styles:not(.read-only):hover .sidebar-pane-section-toolbar {\n    visibility: visible;\n}\n\n.styles-show-all {\n    margin-left: 16px;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    max-width: -webkit-fill-available;\n}\n\n/*# sourceURL=elements/stylesSidebarPane.css */";