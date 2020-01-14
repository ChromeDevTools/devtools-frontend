export default class Settings{constructor(globalStorage,localStorage){this._globalStorage=globalStorage;this._localStorage=localStorage;this._sessionStorage=new Common.SettingsStorage({});this._eventSupport=new Common.Object();this._registry=new Map();this._moduleSettings=new Map();self.runtime.extensions('setting').forEach(this._registerModuleSetting.bind(this));}
_registerModuleSetting(extension){const descriptor=extension.descriptor();const settingName=descriptor['settingName'];const isRegex=descriptor['settingType']==='regex';const defaultValue=descriptor['defaultValue'];let storageType;switch(descriptor['storageType']){case('local'):storageType=Common.SettingStorageType.Local;break;case('session'):storageType=Common.SettingStorageType.Session;break;case('global'):storageType=Common.SettingStorageType.Global;break;default:storageType=Common.SettingStorageType.Global;}
const setting=isRegex?this.createRegExpSetting(settingName,defaultValue,undefined,storageType):this.createSetting(settingName,defaultValue,storageType);if(extension.title()){setting.setTitle(extension.title());}
if(descriptor['userActionCondition']){setting.setRequiresUserAction(!!Root.Runtime.queryParam(descriptor['userActionCondition']));}
setting._extension=extension;this._moduleSettings.set(settingName,setting);}
moduleSetting(settingName){const setting=this._moduleSettings.get(settingName);if(!setting){throw new Error('No setting registered: '+settingName);}
return setting;}
settingForTest(settingName){const setting=this._registry.get(settingName);if(!setting){throw new Error('No setting registered: '+settingName);}
return setting;}
createSetting(key,defaultValue,storageType){const storage=this._storageFromType(storageType);if(!this._registry.get(key)){this._registry.set(key,new Common.Setting(this,key,defaultValue,this._eventSupport,storage));}
return(this._registry.get(key));}
createLocalSetting(key,defaultValue){return this.createSetting(key,defaultValue,Common.SettingStorageType.Local);}
createRegExpSetting(key,defaultValue,regexFlags,storageType){if(!this._registry.get(key)){this._registry.set(key,new Common.RegExpSetting(this,key,defaultValue,this._eventSupport,this._storageFromType(storageType),regexFlags));}
return(this._registry.get(key));}
clearAll(){this._globalStorage.removeAll();this._localStorage.removeAll();const versionSetting=Common.settings.createSetting(Common.VersionController._currentVersionName,0);versionSetting.set(Common.VersionController.currentVersion);}
_storageFromType(storageType){switch(storageType){case(Common.SettingStorageType.Local):return this._localStorage;case(Common.SettingStorageType.Session):return this._sessionStorage;case(Common.SettingStorageType.Global):return this._globalStorage;}
return this._globalStorage;}}
export class SettingsStorage{constructor(object,setCallback,removeCallback,removeAllCallback,storagePrefix){this._object=object;this._setCallback=setCallback||function(){};this._removeCallback=removeCallback||function(){};this._removeAllCallback=removeAllCallback||function(){};this._storagePrefix=storagePrefix||'';}
set(name,value){name=this._storagePrefix+name;this._object[name]=value;this._setCallback(name,value);}
has(name){name=this._storagePrefix+name;return name in this._object;}
get(name){name=this._storagePrefix+name;return this._object[name];}
remove(name){name=this._storagePrefix+name;delete this._object[name];this._removeCallback(name);}
removeAll(){this._object={};this._removeAllCallback();}
_dumpSizes(){Common.console.log('Ten largest settings: ');const sizes={__proto__:null};for(const key in this._object){sizes[key]=this._object[key].length;}
const keys=Object.keys(sizes);function comparator(key1,key2){return sizes[key2]-sizes[key1];}
keys.sort(comparator);for(let i=0;i<10&&i<keys.length;++i){Common.console.log('Setting: \''+keys[i]+'\', size: '+sizes[keys[i]]);}}}
export class Setting{constructor(settings,name,defaultValue,eventSupport,storage){this._settings=settings;this._name=name;this._defaultValue=defaultValue;this._eventSupport=eventSupport;this._storage=storage;this._title='';this._extension=null;}
addChangeListener(listener,thisObject){return this._eventSupport.addEventListener(this._name,listener,thisObject);}
removeChangeListener(listener,thisObject){this._eventSupport.removeEventListener(this._name,listener,thisObject);}
get name(){return this._name;}
title(){return this._title;}
setTitle(title){this._title=title;}
setRequiresUserAction(requiresUserAction){this._requiresUserAction=requiresUserAction;}
get(){if(this._requiresUserAction&&!this._hadUserAction){return this._defaultValue;}
if(typeof this._value!=='undefined'){return this._value;}
this._value=this._defaultValue;if(this._storage.has(this._name)){try{this._value=JSON.parse(this._storage.get(this._name));}catch(e){this._storage.remove(this._name);}}
return this._value;}
set(value){this._hadUserAction=true;this._value=value;try{const settingString=JSON.stringify(value);try{this._storage.set(this._name,settingString);}catch(e){this._printSettingsSavingError(e.message,this._name,settingString);}}catch(e){Common.console.error('Cannot stringify setting with name: '+this._name+', error: '+e.message);}
this._eventSupport.dispatchEventToListeners(this._name,value);}
remove(){this._settings._registry.delete(this._name);this._settings._moduleSettings.delete(this._name);this._storage.remove(this._name);}
extension(){return this._extension;}
_printSettingsSavingError(message,name,value){const errorMessage='Error saving setting with name: '+this._name+', value length: '+value.length+'. Error: '+message;console.error(errorMessage);Common.console.error(errorMessage);this._storage._dumpSizes();}}
export class RegExpSetting extends Setting{constructor(settings,name,defaultValue,eventSupport,storage,regexFlags){super(settings,name,defaultValue?[{pattern:defaultValue}]:[],eventSupport,storage);this._regexFlags=regexFlags;}
get(){const result=[];const items=this.getAsArray();for(let i=0;i<items.length;++i){const item=items[i];if(item.pattern&&!item.disabled){result.push(item.pattern);}}
return result.join('|');}
getAsArray(){return super.get();}
set(value){this.setAsArray([{pattern:value}]);}
setAsArray(value){delete this._regex;super.set(value);}
asRegExp(){if(typeof this._regex!=='undefined'){return this._regex;}
this._regex=null;try{const pattern=this.get();if(pattern){this._regex=new RegExp(pattern,this._regexFlags||'');}}catch(e){}
return this._regex;}}
export class VersionController{updateVersion(){const localStorageVersion=window.localStorage?window.localStorage[Common.VersionController._currentVersionName]:0;const versionSetting=Common.settings.createSetting(Common.VersionController._currentVersionName,0);const currentVersion=Common.VersionController.currentVersion;const oldVersion=versionSetting.get()||parseInt(localStorageVersion||'0',10);if(oldVersion===0){versionSetting.set(currentVersion);return;}
const methodsToRun=this._methodsToRunToUpdateVersion(oldVersion,currentVersion);for(let i=0;i<methodsToRun.length;++i){this[methodsToRun[i]].call(this);}
versionSetting.set(currentVersion);}
_methodsToRunToUpdateVersion(oldVersion,currentVersion){const result=[];for(let i=oldVersion;i<currentVersion;++i){result.push('_updateVersionFrom'+i+'To'+(i+1));}
return result;}
_updateVersionFrom0To1(){this._clearBreakpointsWhenTooMany(Common.settings.createLocalSetting('breakpoints',[]),500000);}
_updateVersionFrom1To2(){Common.settings.createSetting('previouslyViewedFiles',[]).set([]);}
_updateVersionFrom2To3(){Common.settings.createSetting('fileSystemMapping',{}).set({});Common.settings.createSetting('fileMappingEntries',[]).remove();}
_updateVersionFrom3To4(){const advancedMode=Common.settings.createSetting('showHeaSnapshotObjectsHiddenProperties',false);Common.moduleSetting('showAdvancedHeapSnapshotProperties').set(advancedMode.get());advancedMode.remove();}
_updateVersionFrom4To5(){const settingNames={'FileSystemViewSidebarWidth':'fileSystemViewSplitViewState','elementsSidebarWidth':'elementsPanelSplitViewState','StylesPaneSplitRatio':'stylesPaneSplitViewState','heapSnapshotRetainersViewSize':'heapSnapshotSplitViewState','InspectorView.splitView':'InspectorView.splitViewState','InspectorView.screencastSplitView':'InspectorView.screencastSplitViewState','Inspector.drawerSplitView':'Inspector.drawerSplitViewState','layerDetailsSplitView':'layerDetailsSplitViewState','networkSidebarWidth':'networkPanelSplitViewState','sourcesSidebarWidth':'sourcesPanelSplitViewState','scriptsPanelNavigatorSidebarWidth':'sourcesPanelNavigatorSplitViewState','sourcesPanelSplitSidebarRatio':'sourcesPanelDebuggerSidebarSplitViewState','timeline-details':'timelinePanelDetailsSplitViewState','timeline-split':'timelinePanelRecorsSplitViewState','timeline-view':'timelinePanelTimelineStackSplitViewState','auditsSidebarWidth':'auditsPanelSplitViewState','layersSidebarWidth':'layersPanelSplitViewState','profilesSidebarWidth':'profilesPanelSplitViewState','resourcesSidebarWidth':'resourcesPanelSplitViewState'};const empty={};for(const oldName in settingNames){const newName=settingNames[oldName];const oldNameH=oldName+'H';let newValue=null;const oldSetting=Common.settings.createSetting(oldName,empty);if(oldSetting.get()!==empty){newValue=newValue||{};newValue.vertical={};newValue.vertical.size=oldSetting.get();oldSetting.remove();}
const oldSettingH=Common.settings.createSetting(oldNameH,empty);if(oldSettingH.get()!==empty){newValue=newValue||{};newValue.horizontal={};newValue.horizontal.size=oldSettingH.get();oldSettingH.remove();}
if(newValue){Common.settings.createSetting(newName,{}).set(newValue);}}}
_updateVersionFrom5To6(){const settingNames={'debuggerSidebarHidden':'sourcesPanelSplitViewState','navigatorHidden':'sourcesPanelNavigatorSplitViewState','WebInspector.Drawer.showOnLoad':'Inspector.drawerSplitViewState'};for(const oldName in settingNames){const oldSetting=Common.settings.createSetting(oldName,null);if(oldSetting.get()===null){oldSetting.remove();continue;}
const newName=settingNames[oldName];const invert=oldName==='WebInspector.Drawer.showOnLoad';const hidden=oldSetting.get()!==invert;oldSetting.remove();const showMode=hidden?'OnlyMain':'Both';const newSetting=Common.settings.createSetting(newName,{});const newValue=newSetting.get()||{};newValue.vertical=newValue.vertical||{};newValue.vertical.showMode=showMode;newValue.horizontal=newValue.horizontal||{};newValue.horizontal.showMode=showMode;newSetting.set(newValue);}}
_updateVersionFrom6To7(){const settingNames={'sourcesPanelNavigatorSplitViewState':'sourcesPanelNavigatorSplitViewState','elementsPanelSplitViewState':'elementsPanelSplitViewState','stylesPaneSplitViewState':'stylesPaneSplitViewState','sourcesPanelDebuggerSidebarSplitViewState':'sourcesPanelDebuggerSidebarSplitViewState'};const empty={};for(const name in settingNames){const setting=Common.settings.createSetting(name,empty);const value=setting.get();if(value===empty){continue;}
if(value.vertical&&value.vertical.size&&value.vertical.size<1){value.vertical.size=0;}
if(value.horizontal&&value.horizontal.size&&value.horizontal.size<1){value.horizontal.size=0;}
setting.set(value);}}
_updateVersionFrom7To8(){}
_updateVersionFrom8To9(){const settingNames=['skipStackFramesPattern','workspaceFolderExcludePattern'];for(let i=0;i<settingNames.length;++i){const setting=Common.settings.createSetting(settingNames[i],'');let value=setting.get();if(!value){return;}
if(typeof value==='string'){value=[value];}
for(let j=0;j<value.length;++j){if(typeof value[j]==='string'){value[j]={pattern:value[j]};}}
setting.set(value);}}
_updateVersionFrom9To10(){if(!window.localStorage){return;}
for(const key in window.localStorage){if(key.startsWith('revision-history')){window.localStorage.removeItem(key);}}}
_updateVersionFrom10To11(){const oldSettingName='customDevicePresets';const newSettingName='customEmulatedDeviceList';const oldSetting=Common.settings.createSetting(oldSettingName,undefined);const list=oldSetting.get();if(!Array.isArray(list)){return;}
const newList=[];for(let i=0;i<list.length;++i){const value=list[i];const device={};device['title']=value['title'];device['type']='unknown';device['user-agent']=value['userAgent'];device['capabilities']=[];if(value['touch']){device['capabilities'].push('touch');}
if(value['mobile']){device['capabilities'].push('mobile');}
device['screen']={};device['screen']['vertical']={width:value['width'],height:value['height']};device['screen']['horizontal']={width:value['height'],height:value['width']};device['screen']['device-pixel-ratio']=value['deviceScaleFactor'];device['modes']=[];device['show-by-default']=true;device['show']='Default';newList.push(device);}
if(newList.length){Common.settings.createSetting(newSettingName,[]).set(newList);}
oldSetting.remove();}
_updateVersionFrom11To12(){this._migrateSettingsFromLocalStorage();}
_updateVersionFrom12To13(){this._migrateSettingsFromLocalStorage();Common.settings.createSetting('timelineOverviewMode','').remove();}
_updateVersionFrom13To14(){const defaultValue={'throughput':-1,'latency':0};Common.settings.createSetting('networkConditions',defaultValue).set(defaultValue);}
_updateVersionFrom14To15(){const setting=Common.settings.createLocalSetting('workspaceExcludedFolders',{});const oldValue=setting.get();const newValue={};for(const fileSystemPath in oldValue){newValue[fileSystemPath]=[];for(const entry of oldValue[fileSystemPath]){newValue[fileSystemPath].push(entry.path);}}
setting.set(newValue);}
_updateVersionFrom15To16(){const setting=Common.settings.createSetting('InspectorView.panelOrder',{});const tabOrders=setting.get();for(const key of Object.keys(tabOrders)){tabOrders[key]=(tabOrders[key]+1)*10;}
setting.set(tabOrders);}
_updateVersionFrom16To17(){const setting=Common.settings.createSetting('networkConditionsCustomProfiles',[]);const oldValue=setting.get();const newValue=[];if(Array.isArray(oldValue)){for(const preset of oldValue){if(typeof preset.title==='string'&&typeof preset.value==='object'&&typeof preset.value.throughput==='number'&&typeof preset.value.latency==='number'){newValue.push({title:preset.title,value:{download:preset.value.throughput,upload:preset.value.throughput,latency:preset.value.latency}});}}}
setting.set(newValue);}
_updateVersionFrom17To18(){const setting=Common.settings.createLocalSetting('workspaceExcludedFolders',{});const oldValue=setting.get();const newValue={};for(const oldKey in oldValue){let newKey=oldKey.replace(/\\/g,'/');if(!newKey.startsWith('file://')){if(newKey.startsWith('/')){newKey='file://'+newKey;}else{newKey='file:///'+newKey;}}
newValue[newKey]=oldValue[oldKey];}
setting.set(newValue);}
_updateVersionFrom18To19(){const defaultColumns={status:true,type:true,initiator:true,size:true,time:true};const visibleColumnSettings=Common.settings.createSetting('networkLogColumnsVisibility',defaultColumns);const visibleColumns=visibleColumnSettings.get();visibleColumns.name=true;visibleColumns.timeline=true;const configs={};for(const columnId in visibleColumns){if(!visibleColumns.hasOwnProperty(columnId)){continue;}
configs[columnId.toLowerCase()]={visible:visibleColumns[columnId]};}
const newSetting=Common.settings.createSetting('networkLogColumns',{});newSetting.set(configs);visibleColumnSettings.remove();}
_updateVersionFrom19To20(){const oldSetting=Common.settings.createSetting('InspectorView.panelOrder',{});const newSetting=Common.settings.createSetting('panel-tabOrder',{});newSetting.set(oldSetting.get());oldSetting.remove();}
_updateVersionFrom20To21(){const networkColumns=Common.settings.createSetting('networkLogColumns',{});const columns=(networkColumns.get());delete columns['timeline'];delete columns['waterfall'];networkColumns.set(columns);}
_updateVersionFrom21To22(){const breakpointsSetting=Common.settings.createLocalSetting('breakpoints',[]);const breakpoints=breakpointsSetting.get();for(const breakpoint of breakpoints){breakpoint['url']=breakpoint['sourceFileId'];delete breakpoint['sourceFileId'];}
breakpointsSetting.set(breakpoints);}
_updateVersionFrom22To23(){}
_updateVersionFrom23To24(){const oldSetting=Common.settings.createSetting('searchInContentScripts',false);const newSetting=Common.settings.createSetting('searchInAnonymousAndContentScripts',false);newSetting.set(oldSetting.get());oldSetting.remove();}
_updateVersionFrom24To25(){const defaultColumns={status:true,type:true,initiator:true,size:true,time:true};const networkLogColumnsSetting=Common.settings.createSetting('networkLogColumns',defaultColumns);const columns=networkLogColumnsSetting.get();delete columns.product;networkLogColumnsSetting.set(columns);}
_updateVersionFrom25To26(){const oldSetting=Common.settings.createSetting('messageURLFilters',{});const urls=Object.keys(oldSetting.get());const textFilter=urls.map(url=>`-url:${url}`).join(' ');if(textFilter){const textFilterSetting=Common.settings.createSetting('console.textFilter','');const suffix=textFilterSetting.get()?` ${textFilterSetting.get()}`:'';textFilterSetting.set(`${textFilter}${suffix}`);}
oldSetting.remove();}
_updateVersionFrom26To27(){function renameKeyInObjectSetting(settingName,from,to){const setting=Common.settings.createSetting(settingName,{});const value=setting.get();if(from in value){value[to]=value[from];delete value[from];setting.set(value);}}
function renameInStringSetting(settingName,from,to){const setting=Common.settings.createSetting(settingName,'');const value=setting.get();if(value===from){setting.set(to);}}
renameKeyInObjectSetting('panel-tabOrder','audits2','audits');renameKeyInObjectSetting('panel-closeableTabs','audits2','audits');renameInStringSetting('panel-selectedTab','audits2','audits');}
_updateVersionFrom27To28(){const setting=Common.settings.createSetting('uiTheme','systemPreferred');if(setting.get()==='default'){setting.set('systemPreferred');}}
_migrateSettingsFromLocalStorage(){const localSettings=new Set(['advancedSearchConfig','breakpoints','consoleHistory','domBreakpoints','eventListenerBreakpoints','fileSystemMapping','lastSelectedSourcesSidebarPaneTab','previouslyViewedFiles','savedURLs','watchExpressions','workspaceExcludedFolders','xhrBreakpoints']);if(!window.localStorage){return;}
for(const key in window.localStorage){if(localSettings.has(key)){continue;}
const value=window.localStorage[key];window.localStorage.removeItem(key);Common.settings._globalStorage[key]=value;}}
_clearBreakpointsWhenTooMany(breakpointsSetting,maxBreakpointsCount){if(breakpointsSetting.get().length>maxBreakpointsCount){breakpointsSetting.set([]);}}}
export const SettingStorageType={Global:Symbol('Global'),Local:Symbol('Local'),Session:Symbol('Session')};export function moduleSetting(settingName){return Common.settings.moduleSetting(settingName);}
export function settingForTest(settingName){return Common.settings.settingForTest(settingName);}
self.Common=self.Common||{};Common=Common||{};Common.Settings=Settings;Common.SettingsStorage=SettingsStorage;Common.Setting=Setting;Common.RegExpSetting=RegExpSetting;Common.settingForTest=settingForTest;Common.VersionController=VersionController;Common.moduleSetting=moduleSetting;Common.SettingStorageType=SettingStorageType;Common.VersionController._currentVersionName='inspectorVersion';Common.VersionController.currentVersion=28;Common.settings;