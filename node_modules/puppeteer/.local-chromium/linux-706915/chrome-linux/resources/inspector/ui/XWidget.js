export default class XWidget extends UI.XElement{constructor(){super();this.style.setProperty('display','flex');this.style.setProperty('flex-direction','column');this.style.setProperty('align-items','stretch');this.style.setProperty('justify-content','flex-start');this.style.setProperty('contain','layout style');this._visible=false;this._shadowRoot;this._defaultFocusedElement=null;this._elementsToRestoreScrollPositionsFor=[];this._onShownCallback;this._onHiddenCallback;this._onResizedCallback;if(!XWidget._observer){XWidget._observer=new ResizeObserver(entries=>{for(const entry of entries){if(entry.target._visible&&entry.target._onResizedCallback){entry.target._onResizedCallback.call(null);}}});}
XWidget._observer.observe(this);this.setElementsToRestoreScrollPositionsFor([this]);}
static focusWidgetForNode(node){node=node&&node.parentNodeOrShadowHost();let widget=null;while(node){if(node instanceof XWidget){if(widget){node._defaultFocusedElement=widget;}
widget=node;}
node=node.parentNodeOrShadowHost();}}
isShowing(){return this._visible;}
registerRequiredCSS(cssFile){UI.appendStyle(this._shadowRoot||this,cssFile);}
setOnShown(callback){this._onShownCallback=callback;}
setOnHidden(callback){this._onHiddenCallback=callback;}
setOnResized(callback){this._onResizedCallback=callback;}
setElementsToRestoreScrollPositionsFor(elements){for(const element of this._elementsToRestoreScrollPositionsFor){element.removeEventListener('scroll',XWidget._storeScrollPosition,{passive:true,capture:false});}
this._elementsToRestoreScrollPositionsFor=elements;for(const element of this._elementsToRestoreScrollPositionsFor){element.addEventListener('scroll',XWidget._storeScrollPosition,{passive:true,capture:false});}}
restoreScrollPositions(){for(const element of this._elementsToRestoreScrollPositionsFor){if(element._scrollTop){element.scrollTop=element._scrollTop;}
if(element._scrollLeft){element.scrollLeft=element._scrollLeft;}}}
static _storeScrollPosition(event){const element=event.currentTarget;element._scrollTop=element.scrollTop;element._scrollLeft=element.scrollLeft;}
setDefaultFocusedElement(element){if(element&&!this.isSelfOrAncestor(element)){throw new Error('Default focus must be descendant');}
this._defaultFocusedElement=element;}
focus(){if(!this._visible){return;}
let element;if(this._defaultFocusedElement&&this.isSelfOrAncestor(this._defaultFocusedElement)){element=this._defaultFocusedElement;}else if(this.tabIndex!==-1){element=this;}else{let child=this.traverseNextNode(this);while(child){if((child instanceof XWidget)&&child._visible){element=child;break;}
child=child.traverseNextNode(this);}}
if(!element||element.hasFocus()){return;}
if(element===this){HTMLElement.prototype.focus.call(this);}else{element.focus();}}
connectedCallback(){this._visible=true;this.restoreScrollPositions();if(this._onShownCallback){this._onShownCallback.call(null);}}
disconnectedCallback(){this._visible=false;if(this._onHiddenCallback){this._onHiddenCallback.call(null);}}}
self.customElements.define('x-widget',XWidget);self.UI=self.UI||{};UI=UI||{};UI.XWidget=XWidget;