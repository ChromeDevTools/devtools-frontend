export default class DropTarget{constructor(element,transferTypes,messageText,handleDrop){element.addEventListener('dragenter',this._onDragEnter.bind(this),true);element.addEventListener('dragover',this._onDragOver.bind(this),true);this._element=element;this._transferTypes=transferTypes;this._messageText=messageText;this._handleDrop=handleDrop;this._enabled=true;}
setEnabled(enabled){this._enabled=enabled;}
_onDragEnter(event){if(this._enabled&&this._hasMatchingType(event)){event.consume(true);}}
_hasMatchingType(event){for(const transferType of this._transferTypes){const found=Array.from(event.dataTransfer.items).find(item=>{return transferType.kind===item.kind&&!!transferType.type.exec(item.type);});if(found){return true;}}
return false;}
_onDragOver(event){if(!this._enabled||!this._hasMatchingType(event)){return;}
event.dataTransfer.dropEffect='copy';event.consume(true);if(this._dragMaskElement){return;}
this._dragMaskElement=this._element.createChild('div','');const shadowRoot=UI.createShadowRootWithCoreStyles(this._dragMaskElement,'ui/dropTarget.css');shadowRoot.createChild('div','drop-target-message').textContent=this._messageText;this._dragMaskElement.addEventListener('drop',this._onDrop.bind(this),true);this._dragMaskElement.addEventListener('dragleave',this._onDragLeave.bind(this),true);}
_onDrop(event){event.consume(true);this._removeMask();if(this._enabled){this._handleDrop(event.dataTransfer);}}
_onDragLeave(event){event.consume(true);this._removeMask();}
_removeMask(){this._dragMaskElement.remove();delete this._dragMaskElement;}}
export const Type={URI:{kind:'string',type:/text\/uri-list/},Folder:{kind:'file',type:/$^/},File:{kind:'file',type:/.*/},WebFile:{kind:'file',type:/[\w]+/},ImageFile:{kind:'file',type:/image\/.*/},};self.UI=self.UI||{};UI=UI||{};UI.DropTarget=DropTarget;UI.DropTarget.Type=Type;