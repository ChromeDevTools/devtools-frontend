export default class EmptyWidget extends UI.VBox{constructor(text){super();this.registerRequiredCSS('ui/emptyWidget.css');this.element.classList.add('empty-view-scroller');this._contentElement=this.element.createChild('div','empty-view');this._textElement=this._contentElement.createChild('div','empty-bold-text');this._textElement.textContent=text;}
appendParagraph(){return this._contentElement.createChild('p');}
appendLink(link){return this._contentElement.appendChild(UI.XLink.create(link,'Learn more'));}
set text(text){this._textElement.textContent=text;}}
self.UI=self.UI||{};UI=UI||{};UI.EmptyWidget=EmptyWidget;