export class Item{constructor(contextMenu,type,label,disabled,checked){this._type=type;this._label=label;this._disabled=disabled;this._checked=checked;this._contextMenu=contextMenu;if(type==='item'||type==='checkbox'){this._id=contextMenu?contextMenu._nextId():0;}}
id(){return this._id;}
type(){return this._type;}
isEnabled(){return!this._disabled;}
setEnabled(enabled){this._disabled=!enabled;}
_buildDescriptor(){switch(this._type){case'item':const result={type:'item',id:this._id,label:this._label,enabled:!this._disabled};if(this._customElement){result.element=this._customElement;}
if(this._shortcut){result.shortcut=this._shortcut;}
return result;case'separator':return{type:'separator'};case'checkbox':return{type:'checkbox',id:this._id,label:this._label,checked:!!this._checked,enabled:!this._disabled};}
throw new Error('Invalid item type:'+this._type);}
setShortcut(shortcut){this._shortcut=shortcut;}}
export class Section{constructor(contextMenu){this._contextMenu=contextMenu;this._items=[];}
appendItem(label,handler,disabled){const item=new Item(this._contextMenu,'item',label,disabled);this._items.push(item);this._contextMenu._setHandler(item.id(),handler);return item;}
appendCustomItem(element){const item=new Item(this._contextMenu,'item','<custom>');item._customElement=element;this._items.push(item);return item;}
appendAction(actionId,label,optional){const action=UI.actionRegistry.action(actionId);if(!action){if(!optional){console.error(`Action ${actionId} was not defined`);}
return;}
if(!label){label=action.title();}
const result=this.appendItem(label,action.execute.bind(action));const shortcut=UI.shortcutRegistry.shortcutTitleForAction(actionId);if(shortcut){result.setShortcut(shortcut);}}
appendSubMenuItem(label,disabled){const item=new SubMenu(this._contextMenu,label,disabled);item._init();this._items.push(item);return item;}
appendCheckboxItem(label,handler,checked,disabled){const item=new Item(this._contextMenu,'checkbox',label,disabled,checked);this._items.push(item);this._contextMenu._setHandler(item.id(),handler);return item;}}
export class SubMenu extends Item{constructor(contextMenu,label,disabled){super(contextMenu,'subMenu',label,disabled);this._sections=new Map();this._sectionList=[];}
_init(){_groupWeights.forEach(name=>this.section(name));}
section(name){let section=name?this._sections.get(name):null;if(!section){section=new Section(this._contextMenu);if(name){this._sections.set(name,section);this._sectionList.push(section);}else{this._sectionList.splice(ContextMenu._groupWeights.indexOf('default'),0,section);}}
return section;}
headerSection(){return this.section('header');}
newSection(){return this.section('new');}
revealSection(){return this.section('reveal');}
clipboardSection(){return this.section('clipboard');}
editSection(){return this.section('edit');}
debugSection(){return this.section('debug');}
viewSection(){return this.section('view');}
defaultSection(){return this.section('default');}
saveSection(){return this.section('save');}
footerSection(){return this.section('footer');}
_buildDescriptor(){const result={type:'subMenu',label:this._label,enabled:!this._disabled,subItems:[]};const nonEmptySections=this._sectionList.filter(section=>!!section._items.length);for(const section of nonEmptySections){for(const item of section._items){result.subItems.push(item._buildDescriptor());}
if(section!==nonEmptySections.peekLast()){result.subItems.push({type:'separator'});}}
return result;}
appendItemsAtLocation(location){for(const extension of self.runtime.extensions('context-menu-item')){const itemLocation=extension.descriptor()['location']||'';if(!itemLocation.startsWith(location+'/')){continue;}
const section=itemLocation.substr(location.length+1);if(!section||section.includes('/')){continue;}
this.section(section).appendAction(extension.descriptor()['actionId']);}}}
Item._uniqueSectionName=0;export default class ContextMenu extends SubMenu{constructor(event,useSoftMenu,x,y){super(null);this._contextMenu=this;super._init();this._defaultSection=this.defaultSection();this._pendingPromises=[];this._pendingTargets=[];this._event=event;this._useSoftMenu=!!useSoftMenu;this._x=x===undefined?event.x:x;this._y=y===undefined?event.y:y;this._handlers={};this._id=0;const target=event.deepElementFromPoint();if(target){this.appendApplicableItems((target));}}
static initialize(){Host.InspectorFrontendHost.events.addEventListener(Host.InspectorFrontendHostAPI.Events.SetUseSoftMenu,setUseSoftMenu);function setUseSoftMenu(event){ContextMenu._useSoftMenu=(event.data);}}
static installHandler(doc){doc.body.addEventListener('contextmenu',handler,false);function handler(event){const contextMenu=new ContextMenu(event);contextMenu.show();}}
_nextId(){return this._id++;}
show(){Promise.all(this._pendingPromises).then(populate.bind(this)).then(this._innerShow.bind(this));ContextMenu._pendingMenu=this;function populate(appendCallResults){if(ContextMenu._pendingMenu!==this){return;}
delete ContextMenu._pendingMenu;for(let i=0;i<appendCallResults.length;++i){const providers=appendCallResults[i];const target=this._pendingTargets[i];for(let j=0;j<providers.length;++j){const provider=(providers[j]);provider.appendApplicableItems(this._event,this,target);}}
this._pendingPromises=[];this._pendingTargets=[];}
this._event.consume(true);}
discard(){if(this._softMenu){this._softMenu.discard();}}
_innerShow(){const menuObject=this._buildMenuDescriptors();if(this._useSoftMenu||ContextMenu._useSoftMenu||Host.InspectorFrontendHost.isHostedMode()){this._softMenu=new UI.SoftContextMenu(menuObject,this._itemSelected.bind(this));this._softMenu.show(this._event.target.ownerDocument,new AnchorBox(this._x,this._y,0,0));}else{Host.InspectorFrontendHost.showContextMenuAtPoint(this._x,this._y,menuObject,this._event.target.ownerDocument);function listenToEvents(){Host.InspectorFrontendHost.events.addEventListener(Host.InspectorFrontendHostAPI.Events.ContextMenuCleared,this._menuCleared,this);Host.InspectorFrontendHost.events.addEventListener(Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected,this._onItemSelected,this);}
setImmediate(listenToEvents.bind(this));}}
setX(x){this._x=x;}
setY(y){this._y=y;}
_setHandler(id,handler){if(handler){this._handlers[id]=handler;}}
_buildMenuDescriptors(){return(super._buildDescriptor().subItems);}
_onItemSelected(event){this._itemSelected((event.data));}
_itemSelected(id){if(this._handlers[id]){this._handlers[id].call(this);}
this._menuCleared();}
_menuCleared(){Host.InspectorFrontendHost.events.removeEventListener(Host.InspectorFrontendHostAPI.Events.ContextMenuCleared,this._menuCleared,this);Host.InspectorFrontendHost.events.removeEventListener(Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected,this._onItemSelected,this);}
containsTarget(target){return this._pendingTargets.indexOf(target)>=0;}
appendApplicableItems(target){this._pendingPromises.push(self.runtime.allInstances(Provider,target));this._pendingTargets.push(target);}}
export const _groupWeights=['header','new','reveal','edit','clipboard','debug','view','default','save','footer'];export class Provider{appendApplicableItems(event,contextMenu,target){}}
self.UI=self.UI||{};UI=UI||{};UI.ContextMenu=ContextMenu;ContextMenu._groupWeights=_groupWeights;UI.ContextMenuItem=Item;UI.ContextMenuSection=Section;UI.ContextSubMenu=SubMenu;UI.ContextMenu.Provider=Provider;