export default class Infobar{constructor(type,text,disableSetting){this.element=createElementWithClass('div','flex-none');this._shadowRoot=UI.createShadowRootWithCoreStyles(this.element,'ui/infobar.css');this._contentElement=this._shadowRoot.createChild('div','infobar infobar-'+type);this._mainRow=this._contentElement.createChild('div','infobar-main-row');this._mainRow.createChild('div',type+'-icon icon');this._mainRowText=this._mainRow.createChild('div','infobar-main-title');this._mainRowText.textContent=text;this._detailsRows=this._contentElement.createChild('div','infobar-details-rows hidden');this._toggleElement=UI.createTextButton(ls`more`,this._onToggleDetails.bind(this),'infobar-toggle link-style hidden');this._mainRow.appendChild(this._toggleElement);this._disableSetting=disableSetting||null;if(disableSetting){const disableButton=UI.createTextButton(ls`never show`,this._onDisable.bind(this),'infobar-toggle link-style');this._mainRow.appendChild(disableButton);}
this._closeButton=this._contentElement.createChild('div','close-button','dt-close-button');this._closeButton.setTabbable(true);self.onInvokeElement(this._closeButton,this.dispose.bind(this));this._closeCallback=null;}
static create(type,text,disableSetting){if(disableSetting&&disableSetting.get()){return null;}
return new Infobar(type,text,disableSetting);}
dispose(){this.element.remove();this._onResize();if(this._closeCallback){this._closeCallback.call(null);}}
setText(text){this._mainRowText.textContent=text;this._onResize();}
setCloseCallback(callback){this._closeCallback=callback;}
setParentView(parentView){this._parentView=parentView;}
_onResize(){if(this._parentView){this._parentView.doResize();}}
_onDisable(){this._disableSetting.set(true);this.dispose();}
_onToggleDetails(){this._detailsRows.classList.remove('hidden');this._toggleElement.remove();this._onResize();}
createDetailsRowMessage(message){this._toggleElement.classList.remove('hidden');const infobarDetailsRow=this._detailsRows.createChild('div','infobar-details-row');const detailsRowMessage=infobarDetailsRow.createChild('span','infobar-row-message');detailsRowMessage.textContent=message||'';return detailsRowMessage;}}
export const Type={Warning:'warning',Info:'info'};self.UI=self.UI||{};UI=UI||{};UI.Infobar=Infobar;UI.Infobar.Type=Type;