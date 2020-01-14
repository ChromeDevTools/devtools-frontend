export default class XLink extends UI.XElement{static create(url,linkText,className,preventClick){if(!linkText){linkText=url;}
className=className||'';return UI.html`
        <x-link href='${url}' class='${className} devtools-link' ${preventClick ? 'no-click' : ''}
        >${linkText.trimMiddle(UI.MaxLengthForDisplayedURLs)}</x-link>`;}
constructor(){super();this.style.setProperty('display','inline');UI.ARIAUtils.markAsLink(this);this.tabIndex=0;this.setAttribute('target','_blank');this._href=null;this._clickable=true;this._onClick=event=>{event.consume(true);Host.InspectorFrontendHost.openInNewTab((this._href));};this._onKeyDown=event=>{if(isEnterOrSpaceKey(event)){event.consume(true);Host.InspectorFrontendHost.openInNewTab((this._href));}};}
static get observedAttributes(){return UI.XElement.observedAttributes.concat(['href','no-click']);}
attributeChangedCallback(attr,oldValue,newValue){if(attr==='no-click'){this._clickable=!newValue;this._updateClick();return;}
if(attr==='href'){let href=newValue;if(newValue.trim().toLowerCase().startsWith('javascript:')){href=null;}
if(Common.ParsedURL.isRelativeURL(newValue)){href=null;}
this._href=href;this.title=newValue;this._updateClick();return;}
super.attributeChangedCallback(attr,oldValue,newValue);}
_updateClick(){if(this._href!==null&&this._clickable){this.addEventListener('click',this._onClick,false);this.addEventListener('keydown',this._onKeyDown,false);this.style.setProperty('cursor','pointer');}else{this.removeEventListener('click',this._onClick,false);this.removeEventListener('keydown',this._onKeyDown,false);this.style.removeProperty('cursor');}}}
export class ContextMenuProvider{appendApplicableItems(event,contextMenu,target){let targetNode=(target);while(targetNode&&!(targetNode instanceof XLink)){targetNode=targetNode.parentNodeOrShadowHost();}
if(!targetNode||!targetNode._href){return;}
contextMenu.revealSection().appendItem(UI.openLinkExternallyLabel(),()=>Host.InspectorFrontendHost.openInNewTab(targetNode._href));contextMenu.revealSection().appendItem(UI.copyLinkAddressLabel(),()=>Host.InspectorFrontendHost.copyText(targetNode._href));}}
self.customElements.define('x-link',XLink);self.UI=self.UI||{};UI=UI||{};UI.XLink=XLink;UI.XLink.ContextMenuProvider=ContextMenuProvider;