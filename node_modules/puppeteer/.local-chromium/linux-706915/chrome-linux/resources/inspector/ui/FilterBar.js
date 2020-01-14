export default class FilterBar extends UI.HBox{constructor(name,visibleByDefault){super();this.registerRequiredCSS('ui/filter.css');this._enabled=true;this.element.classList.add('filter-bar');this._stateSetting=Common.settings.createSetting('filterBar-'+name+'-toggled',!!visibleByDefault);this._filterButton=new UI.ToolbarSettingToggle(this._stateSetting,'largeicon-filter',Common.UIString('Filter'));this._filters=[];this._updateFilterBar();this._stateSetting.addChangeListener(this._updateFilterBar.bind(this));}
filterButton(){return this._filterButton;}
addFilter(filter){this._filters.push(filter);this.element.appendChild(filter.element());filter.addEventListener(FilterUI.Events.FilterChanged,this._filterChanged,this);this._updateFilterButton();}
setEnabled(enabled){this._enabled=enabled;this._filterButton.setEnabled(enabled);this._updateFilterBar();}
forceShowFilterBar(){this._alwaysShowFilters=true;this._updateFilterBar();}
showOnce(){this._stateSetting.set(true);}
_filterChanged(event){this._updateFilterButton();}
wasShown(){super.wasShown();this._updateFilterBar();}
_updateFilterBar(){if(!this.parentWidget()||this._showingWidget){return;}
if(this.visible()){this._showingWidget=true;this.showWidget();this._showingWidget=false;}else{this.hideWidget();}}
focus(){for(let i=0;i<this._filters.length;++i){if(this._filters[i]instanceof TextFilterUI){const textFilterUI=(this._filters[i]);textFilterUI.focus();break;}}}
_updateFilterButton(){let isActive=false;for(const filter of this._filters){isActive=isActive||filter.isActive();}
this._filterButton.setDefaultWithRedColor(isActive);this._filterButton.setToggleWithRedColor(isActive);}
clear(){this.element.removeChildren();this._filters=[];this._updateFilterButton();}
setting(){return this._stateSetting;}
visible(){return this._alwaysShowFilters||(this._stateSetting.get()&&this._enabled);}}
export class FilterUI extends Common.EventTarget{isActive(){}
element(){}}
FilterUI.Events={FilterChanged:Symbol('FilterChanged')};export class TextFilterUI extends Common.Object{constructor(){super();this._filterElement=createElement('div');this._filterElement.className='filter-text-filter';this._filterInputElement=this._filterElement.createChild('span','filter-input-field');this._prompt=new UI.TextPrompt();this._prompt.initialize(this._completions.bind(this),' ');this._proxyElement=this._prompt.attach(this._filterInputElement);this._proxyElement.title=Common.UIString('e.g. /small[\\d]+/ url:a.com/b');this._prompt.setPlaceholder(Common.UIString('Filter'));this._prompt.addEventListener(UI.TextPrompt.Events.TextChanged,this._valueChanged.bind(this));this._suggestionProvider=null;}
_completions(expression,prefix,force){if(this._suggestionProvider){return this._suggestionProvider(expression,prefix,force);}
return Promise.resolve([]);}
isActive(){return!!this._prompt.text();}
element(){return this._filterElement;}
value(){return this._prompt.textWithCurrentSuggestion();}
setValue(value){this._prompt.setText(value);this._valueChanged();}
focus(){this._filterInputElement.focus();}
setSuggestionProvider(suggestionProvider){this._prompt.clearAutocomplete();this._suggestionProvider=suggestionProvider;}
_valueChanged(){this.dispatchEventToListeners(FilterUI.Events.FilterChanged,null);}}
export class NamedBitSetFilterUI extends Common.Object{constructor(items,setting){super();this._filtersElement=createElementWithClass('div','filter-bitset-filter');UI.ARIAUtils.markAsListBox(this._filtersElement);UI.ARIAUtils.markAsMultiSelectable(this._filtersElement);this._filtersElement.title=Common.UIString('%sClick to select multiple types',UI.KeyboardShortcut.shortcutToString('',UI.KeyboardShortcut.Modifiers.CtrlOrMeta));this._allowedTypes={};this._typeFilterElements=[];this._addBit(NamedBitSetFilterUI.ALL_TYPES,Common.UIString('All'));this._typeFilterElements[0].tabIndex=0;this._filtersElement.createChild('div','filter-bitset-filter-divider');for(let i=0;i<items.length;++i){this._addBit(items[i].name,items[i].label,items[i].title);}
if(setting){this._setting=setting;setting.addChangeListener(this._settingChanged.bind(this));this._settingChanged();}else{this._toggleTypeFilter(NamedBitSetFilterUI.ALL_TYPES,false);}}
reset(){this._toggleTypeFilter(NamedBitSetFilterUI.ALL_TYPES,false);}
isActive(){return!this._allowedTypes[NamedBitSetFilterUI.ALL_TYPES];}
element(){return this._filtersElement;}
accept(typeName){return!!this._allowedTypes[NamedBitSetFilterUI.ALL_TYPES]||!!this._allowedTypes[typeName];}
_settingChanged(){const allowedTypes=this._setting.get();this._allowedTypes={};for(const element of this._typeFilterElements){if(allowedTypes[element.typeName]){this._allowedTypes[element.typeName]=true;}}
this._update();}
_update(){if((Object.keys(this._allowedTypes).length===0)||this._allowedTypes[NamedBitSetFilterUI.ALL_TYPES]){this._allowedTypes={};this._allowedTypes[NamedBitSetFilterUI.ALL_TYPES]=true;}
for(const element of this._typeFilterElements){const typeName=element.typeName;const active=!!this._allowedTypes[typeName];element.classList.toggle('selected',active);UI.ARIAUtils.setSelected(element,active);}
this.dispatchEventToListeners(FilterUI.Events.FilterChanged,null);}
_addBit(name,label,title){const typeFilterElement=this._filtersElement.createChild('span',name);typeFilterElement.tabIndex=-1;typeFilterElement.typeName=name;typeFilterElement.createTextChild(label);UI.ARIAUtils.markAsOption(typeFilterElement);if(title){typeFilterElement.title=title;}
typeFilterElement.addEventListener('click',this._onTypeFilterClicked.bind(this),false);typeFilterElement.addEventListener('keydown',this._onTypeFilterKeydown.bind(this),false);this._typeFilterElements.push(typeFilterElement);}
_onTypeFilterClicked(e){let toggle;if(Host.isMac()){toggle=e.metaKey&&!e.ctrlKey&&!e.altKey&&!e.shiftKey;}else{toggle=e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey;}
this._toggleTypeFilter(e.target.typeName,toggle);}
_onTypeFilterKeydown(event){const element=(event.target);if(!element){return;}
if(event.key==='ArrowLeft'||event.key==='ArrowUp'){if(this._keyFocusNextBit(element,true)){event.consume(true);}}else if(event.key==='ArrowRight'||event.key==='ArrowDown'){if(this._keyFocusNextBit(element,false)){event.consume(true);}}else if(isEnterOrSpaceKey(event)){this._onTypeFilterClicked(event);}}
_keyFocusNextBit(target,selectPrevious){const index=this._typeFilterElements.indexOf(target);if(index===-1){return false;}
const nextIndex=selectPrevious?index-1:index+1;if(nextIndex<0||nextIndex>=this._typeFilterElements.length){return false;}
const nextElement=this._typeFilterElements[nextIndex];nextElement.tabIndex=0;target.tabIndex=-1;nextElement.focus();return true;}
_toggleTypeFilter(typeName,allowMultiSelect){if(allowMultiSelect&&typeName!==NamedBitSetFilterUI.ALL_TYPES){this._allowedTypes[NamedBitSetFilterUI.ALL_TYPES]=false;}else{this._allowedTypes={};}
this._allowedTypes[typeName]=!this._allowedTypes[typeName];if(this._setting){this._setting.set(this._allowedTypes);}else{this._update();}}}
NamedBitSetFilterUI.ALL_TYPES='all';export class CheckboxFilterUI extends Common.Object{constructor(className,title,activeWhenChecked,setting){super();this._filterElement=createElementWithClass('div','filter-checkbox-filter');this._activeWhenChecked=!!activeWhenChecked;this._label=UI.CheckboxLabel.create(title);this._filterElement.appendChild(this._label);this._checkboxElement=this._label.checkboxElement;if(setting){UI.SettingsUI.bindCheckbox(this._checkboxElement,setting);}else{this._checkboxElement.checked=true;}
this._checkboxElement.addEventListener('change',this._fireUpdated.bind(this),false);}
isActive(){return this._activeWhenChecked===this._checkboxElement.checked;}
checked(){return this._checkboxElement.checked;}
setChecked(checked){this._checkboxElement.checked=checked;}
element(){return this._filterElement;}
labelElement(){return this._label;}
_fireUpdated(){this.dispatchEventToListeners(FilterUI.Events.FilterChanged,null);}
setColor(backgroundColor,borderColor){this._label.backgroundColor=backgroundColor;this._label.borderColor=borderColor;}}
self.UI=self.UI||{};UI=UI||{};UI.FilterBar=FilterBar;UI.FilterUI=FilterUI;UI.TextFilterUI=TextFilterUI;UI.NamedBitSetFilterUI=NamedBitSetFilterUI;UI.CheckboxFilterUI=CheckboxFilterUI;UI.NamedBitSetFilterUI.Item;