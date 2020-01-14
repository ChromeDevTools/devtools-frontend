export default class Dialog extends UI.GlassPane{constructor(){super();this.registerRequiredCSS('ui/dialog.css');this.contentElement.tabIndex=0;this.contentElement.addEventListener('focus',()=>this.widget().focus(),false);this.contentElement.addEventListener('keydown',this._onKeyDown.bind(this),false);this.widget().setDefaultFocusedElement(this.contentElement);this.setPointerEventsBehavior(UI.GlassPane.PointerEventsBehavior.BlockedByGlassPane);this.setOutsideClickCallback(event=>{this.hide();event.consume(true);});UI.ARIAUtils.markAsModalDialog(this.contentElement);this._tabIndexMap=new Map();this._focusRestorer=null;this._closeOnEscape=true;}
static hasInstance(){return!!UI.Dialog._instance;}
show(where){const document=(where instanceof Document?where:(where||UI.inspectorView.element).ownerDocument);if(UI.Dialog._instance){UI.Dialog._instance.hide();}
UI.Dialog._instance=this;this._disableTabIndexOnElements(document);super.show(document);this._focusRestorer=new UI.WidgetFocusRestorer(this.widget());}
hide(){this._focusRestorer.restore();super.hide();this._restoreTabIndexOnElements();delete UI.Dialog._instance;}
setCloseOnEscape(close){this._closeOnEscape=close;}
addCloseButton(){const closeButton=this.contentElement.createChild('div','dialog-close-button','dt-close-button');closeButton.gray=true;closeButton.addEventListener('click',()=>this.hide(),false);}
_disableTabIndexOnElements(document){this._tabIndexMap.clear();for(let node=document;node;node=node.traverseNextNode(document)){if(node instanceof HTMLElement){const element=(node);const tabIndex=element.tabIndex;if(tabIndex>=0){this._tabIndexMap.set(element,tabIndex);element.tabIndex=-1;}}}}
_restoreTabIndexOnElements(){for(const element of this._tabIndexMap.keys()){element.tabIndex=(this._tabIndexMap.get(element));}
this._tabIndexMap.clear();}
_onKeyDown(event){if(this._closeOnEscape&&event.keyCode===UI.KeyboardShortcut.Keys.Esc.code&&UI.KeyboardShortcut.hasNoModifiers(event)){event.consume(true);this.hide();}}}
self.UI=self.UI||{};UI=UI||{};UI.Dialog=Dialog;