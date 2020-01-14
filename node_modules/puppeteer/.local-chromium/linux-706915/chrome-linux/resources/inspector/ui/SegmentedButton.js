export default class SegmentedButton extends UI.HBox{constructor(){super(true);this._buttons=new Map();this._selected=null;this.registerRequiredCSS('ui/segmentedButton.css');this.contentElement.classList.add('segmented-button');}
addSegment(label,value,tooltip){const button=this.contentElement.createChild('button','segmented-button-segment');button.textContent=label;button.title=tooltip;this._buttons.set(value,button);button.addEventListener('click',()=>this.select(value));}
select(value){if(this._selected===value){return;}
this._selected=value;for(const key of this._buttons.keys()){this._buttons.get(key).classList.toggle('segmented-button-segment-selected',key===this._selected);}}
selected(){return this._selected;}}
self.UI=self.UI||{};UI=UI||{};UI.SegmentedButton=SegmentedButton;