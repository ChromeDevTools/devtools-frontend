export class SuggestBoxDelegate{applySuggestion(suggestion,isIntermediateSuggestion){}
acceptSuggestion(){}}
export default class SuggestBox{constructor(suggestBoxDelegate,maxItemsHeight){this._suggestBoxDelegate=suggestBoxDelegate;this._maxItemsHeight=maxItemsHeight;this._rowHeight=17;this._userEnteredText='';this._defaultSelectionIsDimmed=false;this._onlyCompletion=null;this._items=new UI.ListModel();this._list=new UI.ListControl(this._items,this,UI.ListMode.EqualHeightItems);this._element=this._list.element;this._element.classList.add('suggest-box');this._element.addEventListener('mousedown',event=>event.preventDefault(),true);this._element.addEventListener('click',this._onClick.bind(this),false);this._glassPane=new UI.GlassPane();this._glassPane.setAnchorBehavior(UI.GlassPane.AnchorBehavior.PreferBottom);this._glassPane.setOutsideClickCallback(this.hide.bind(this));const shadowRoot=UI.createShadowRootWithCoreStyles(this._glassPane.contentElement,'ui/suggestBox.css');shadowRoot.appendChild(this._element);}
visible(){return this._glassPane.isShowing();}
setPosition(anchorBox){this._glassPane.setContentAnchorBox(anchorBox);}
setAnchorBehavior(behavior){this._glassPane.setAnchorBehavior(behavior);}
_updateMaxSize(items){const maxWidth=this._maxWidth(items);const length=this._maxItemsHeight?Math.min(this._maxItemsHeight,items.length):items.length;const maxHeight=length*this._rowHeight;this._glassPane.setMaxContentSize(new UI.Size(maxWidth,maxHeight));}
_maxWidth(items){const kMaxWidth=300;if(!items.length){return kMaxWidth;}
let maxItem;let maxLength=-Infinity;for(let i=0;i<items.length;i++){const length=(items[i].title||items[i].text).length+(items[i].subtitle||'').length;if(length>maxLength){maxLength=length;maxItem=items[i];}}
const element=this.createElementForItem((maxItem));const preferredWidth=UI.measurePreferredSize(element,this._element).width+UI.measuredScrollbarWidth(this._element.ownerDocument);return Math.min(kMaxWidth,preferredWidth);}
_show(){if(this.visible()){return;}
this._glassPane.show(document);this._rowHeight=UI.measurePreferredSize(this.createElementForItem({text:'1',subtitle:'12'}),this._element).height;}
hide(){if(!this.visible()){return;}
this._glassPane.hide();}
_applySuggestion(isIntermediateSuggestion){if(this._onlyCompletion){UI.ARIAUtils.alert(ls`${this._onlyCompletion.text}, suggestion`,this._element);this._suggestBoxDelegate.applySuggestion(this._onlyCompletion,isIntermediateSuggestion);return true;}
const suggestion=this._list.selectedItem();if(suggestion&&suggestion.text){UI.ARIAUtils.alert(ls`${suggestion.title || suggestion.text}, suggestion`,this._element);}
this._suggestBoxDelegate.applySuggestion(suggestion,isIntermediateSuggestion);return this.visible()&&!!suggestion;}
acceptSuggestion(){const result=this._applySuggestion();this.hide();if(!result){return false;}
this._suggestBoxDelegate.acceptSuggestion();return true;}
createElementForItem(item){const query=this._userEnteredText;const element=createElementWithClass('div','suggest-box-content-item source-code');if(item.iconType){const icon=UI.Icon.create(item.iconType,'suggestion-icon');element.appendChild(icon);}
if(item.isSecondary){element.classList.add('secondary');}
element.tabIndex=-1;const maxTextLength=50+query.length;const displayText=(item.title||item.text).trim().trimEndWithMaxLength(maxTextLength).replace(/\n/g,'\u21B5');const titleElement=element.createChild('span','suggestion-title');const index=displayText.toLowerCase().indexOf(query.toLowerCase());if(index>0){titleElement.createChild('span').textContent=displayText.substring(0,index);}
if(index>-1){titleElement.createChild('span','query').textContent=displayText.substring(index,index+query.length);}
titleElement.createChild('span').textContent=displayText.substring(index>-1?index+query.length:0);titleElement.createChild('span','spacer');if(item.subtitleRenderer){const subtitleElement=item.subtitleRenderer.call(null);subtitleElement.classList.add('suggestion-subtitle');element.appendChild(subtitleElement);}else if(item.subtitle){const subtitleElement=element.createChild('span','suggestion-subtitle');subtitleElement.textContent=item.subtitle.trimEndWithMaxLength(maxTextLength-displayText.length);}
return element;}
heightForItem(item){return this._rowHeight;}
isItemSelectable(item){return true;}
selectedItemChanged(from,to,fromElement,toElement){if(fromElement){fromElement.classList.remove('selected','force-white-icons');}
if(toElement){toElement.classList.add('selected');toElement.classList.add('force-white-icons');}
this._applySuggestion(true);}
_onClick(event){const item=this._list.itemForNode((event.target));if(!item){return;}
this._list.selectItem(item);this.acceptSuggestion();event.consume(true);}
_canShowBox(completions,highestPriorityItem,canShowForSingleItem,userEnteredText){if(!completions||!completions.length){return false;}
if(completions.length>1){return true;}
if(!highestPriorityItem||highestPriorityItem.isSecondary||!highestPriorityItem.text.startsWith(userEnteredText)){return true;}
return canShowForSingleItem&&highestPriorityItem.text!==userEnteredText;}
updateSuggestions(anchorBox,completions,selectHighestPriority,canShowForSingleItem,userEnteredText){this._onlyCompletion=null;const highestPriorityItem=selectHighestPriority?completions.reduce((a,b)=>(a.priority||0)>=(b.priority||0)?a:b):null;if(this._canShowBox(completions,highestPriorityItem,canShowForSingleItem,userEnteredText)){this._userEnteredText=userEnteredText;this._show();this._updateMaxSize(completions);this._glassPane.setContentAnchorBox(anchorBox);this._list.invalidateItemHeight();this._items.replaceAll(completions);if(highestPriorityItem&&!highestPriorityItem.isSecondary){this._list.selectItem(highestPriorityItem,true);}else{this._list.selectItem(null);}}else{if(completions.length===1){this._onlyCompletion=completions[0];this._applySuggestion(true);}
this.hide();}}
keyPressed(event){switch(event.key){case'Enter':return this.enterKeyPressed();case'ArrowUp':return this._list.selectPreviousItem(true,false);case'ArrowDown':return this._list.selectNextItem(true,false);case'PageUp':return this._list.selectItemPreviousPage(false);case'PageDown':return this._list.selectItemNextPage(false);}
return false;}
enterKeyPressed(){const hasSelectedItem=!!this._list.selectedItem()||!!this._onlyCompletion;this.acceptSuggestion();return hasSelectedItem;}}
self.UI=self.UI||{};UI=UI||{};UI.SuggestBox=SuggestBox;UI.SuggestBoxDelegate=SuggestBoxDelegate;UI.SuggestBox.Suggestion;UI.SuggestBox.Suggestions;