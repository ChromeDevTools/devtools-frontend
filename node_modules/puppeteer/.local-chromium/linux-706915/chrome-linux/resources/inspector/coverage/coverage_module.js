Coverage.RangeUseCount;Coverage.CoverageSegment;Coverage.CoverageType={CSS:(1<<0),JavaScript:(1<<1),JavaScriptCoarse:(1<<2),};Coverage.SuspensionState={Active:Symbol('Active'),Suspending:Symbol('Suspending'),Suspended:Symbol('Suspended')};Coverage.CoverageModel=class extends SDK.SDKModel{constructor(target){super(target);this._cpuProfilerModel=target.model(SDK.CPUProfilerModel);this._cssModel=target.model(SDK.CSSModel);this._debuggerModel=target.model(SDK.DebuggerModel);this._coverageByURL=new Map();this._coverageByContentProvider=new Map();this._bestEffortCoveragePromise=null;this._suspensionState=Coverage.SuspensionState.Active;this._pollTimer=null;this._currentPollPromise=null;this._shouldResumePollingOnResume=false;this._jsBacklog=[];this._cssBacklog=[];this._performanceTraceRecording=false;}
async start(){if(this._suspensionState!==Coverage.SuspensionState.Active){throw Error('Cannot start CoverageModel while it is not active.');}
const promises=[];if(this._cssModel){this._clearCSS();promises.push(this._cssModel.startCoverage());}
if(this._cpuProfilerModel){this._bestEffortCoveragePromise=this._cpuProfilerModel.bestEffortCoverage();promises.push(this._cpuProfilerModel.startPreciseCoverage());}
await Promise.all(promises);return!!(this._cssModel||this._cpuProfilerModel);}
async stop(){await this.stopPolling();const promises=[];if(this._cpuProfilerModel){promises.push(this._cpuProfilerModel.stopPreciseCoverage());}
if(this._cssModel){promises.push(this._cssModel.stopCoverage());}
await Promise.all(promises);}
reset(){this._coverageByURL=new Map();this._coverageByContentProvider=new Map();}
async startPolling(){if(this._currentPollPromise||this._suspensionState!==Coverage.SuspensionState.Active){return;}
await this._pollLoop();}
async _pollLoop(){this._clearTimer();this._currentPollPromise=this._pollAndCallback();await this._currentPollPromise;if(this._suspensionState===Coverage.SuspensionState.Active||this._performanceTraceRecording){this._pollTimer=setTimeout(()=>this._pollLoop(),Coverage.CoverageModel._coveragePollingPeriodMs);}}
async stopPolling(){this._clearTimer();await this._currentPollPromise;this._currentPollPromise=null;await this._pollAndCallback();}
async _pollAndCallback(){if(this._suspensionState===Coverage.SuspensionState.Suspended&&!this._performanceTraceRecording){return;}
const updates=await this._takeAllCoverage();console.assert(this._suspensionState!==Coverage.SuspensionState.Suspended||this._performanceTraceRecording,'CoverageModel was suspended while polling.');if(updates.length){this.dispatchEventToListeners(Coverage.CoverageModel.Events.CoverageUpdated,updates);}}
_clearTimer(){if(this._pollTimer){clearTimeout(this._pollTimer);this._pollTimer=null;}}
async preSuspendModel(reason){if(this._suspensionState!==Coverage.SuspensionState.Active){return;}
this._suspensionState=Coverage.SuspensionState.Suspending;if(reason==='performance-timeline'){this._performanceTraceRecording=true;return;}
if(this._currentPollPromise){await this.stopPolling();this._shouldResumePollingOnResume=true;}}
async suspendModel(reason){this._suspensionState=Coverage.SuspensionState.Suspended;}
async resumeModel(){}
async postResumeModel(){this._suspensionState=Coverage.SuspensionState.Active;this._performanceTraceRecording=false;if(this._shouldResumePollingOnResume){this._shouldResumePollingOnResume=false;await this.startPolling();}}
entries(){return Array.from(this._coverageByURL.values());}
usageForRange(contentProvider,startOffset,endOffset){const coverageInfo=this._coverageByContentProvider.get(contentProvider);return coverageInfo&&coverageInfo.usageForRange(startOffset,endOffset);}
_clearCSS(){for(const entry of this._coverageByContentProvider.values()){if(entry.type()!==Coverage.CoverageType.CSS){continue;}
const contentProvider=(entry.contentProvider());this._coverageByContentProvider.delete(contentProvider);const key=`${contentProvider.startLine}:${contentProvider.startColumn}`;const urlEntry=this._coverageByURL.get(entry.url());if(!urlEntry||!urlEntry._coverageInfoByLocation.delete(key)){continue;}
urlEntry._size-=entry._size;urlEntry._usedSize-=entry._usedSize;if(!urlEntry._coverageInfoByLocation.size){this._coverageByURL.delete(entry.url());}}}
async _takeAllCoverage(){const[updatesCSS,updatesJS]=await Promise.all([this._takeCSSCoverage(),this._takeJSCoverage()]);return[...updatesCSS,...updatesJS];}
async _takeJSCoverage(){if(!this._cpuProfilerModel){return[];}
const now=Date.now();let freshRawCoverageData=await this._cpuProfilerModel.takePreciseCoverage();if(this._bestEffortCoveragePromise){const bestEffortCoverage=await this._bestEffortCoveragePromise;this._bestEffortCoveragePromise=null;freshRawCoverageData=bestEffortCoverage.concat(freshRawCoverageData);}
if(this._suspensionState!==Coverage.SuspensionState.Active){if(freshRawCoverageData.length>0){this._jsBacklog.push({rawCoverageData:freshRawCoverageData,stamp:now});}
return[];}
const results=[];for(const{rawCoverageData,stamp}of this._jsBacklog){results.push(this._processJSCoverage(rawCoverageData,stamp));}
this._jsBacklog=[];if(freshRawCoverageData.length>0){results.push(this._processJSCoverage(freshRawCoverageData,now));}
return results.flat();}
_processJSCoverage(scriptsCoverage,stamp){const updatedEntries=[];for(const entry of scriptsCoverage){const script=this._debuggerModel.scriptForId(entry.scriptId);if(!script){continue;}
const ranges=[];let type=Coverage.CoverageType.JavaScript;for(const func of entry.functions){if(func.isBlockCoverage===false&&!(func.ranges.length===1&&!func.ranges[0].count)){type|=Coverage.CoverageType.JavaScriptCoarse;}
for(const range of func.ranges){ranges.push(range);}}
const subentry=this._addCoverage(script,script.contentLength,script.lineOffset,script.columnOffset,ranges,(type),stamp);if(subentry){updatedEntries.push(subentry);}}
return updatedEntries;}
async _takeCSSCoverage(){if(!this._cssModel){return[];}
const now=Date.now();const freshRawCoverageData=await this._cssModel.takeCoverageDelta();if(this._suspensionState!==Coverage.SuspensionState.Active){if(freshRawCoverageData.length>0){this._cssBacklog.push({rawCoverageData:freshRawCoverageData,stamp:now});}
return[];}
const results=[];for(const{rawCoverageData,stamp}of this._cssBacklog){results.push(this._processCSSCoverage(rawCoverageData,stamp));}
this._cssBacklog=[];if(freshRawCoverageData.length>0){results.push(this._processCSSCoverage(freshRawCoverageData,now));}
return results.flat();}
_processCSSCoverage(ruleUsageList,stamp){const updatedEntries=[];const rulesByStyleSheet=new Map();for(const rule of ruleUsageList){const styleSheetHeader=this._cssModel.styleSheetHeaderForId(rule.styleSheetId);if(!styleSheetHeader){continue;}
let ranges=rulesByStyleSheet.get(styleSheetHeader);if(!ranges){ranges=[];rulesByStyleSheet.set(styleSheetHeader,ranges);}
ranges.push({startOffset:rule.startOffset,endOffset:rule.endOffset,count:Number(rule.used)});}
for(const entry of rulesByStyleSheet){const styleSheetHeader=(entry[0]);const ranges=(entry[1]);const subentry=this._addCoverage(styleSheetHeader,styleSheetHeader.contentLength,styleSheetHeader.startLine,styleSheetHeader.startColumn,ranges,Coverage.CoverageType.CSS,stamp);if(subentry){updatedEntries.push(subentry);}}
return updatedEntries;}
static _convertToDisjointSegments(ranges,stamp){ranges.sort((a,b)=>a.startOffset-b.startOffset);const result=[];const stack=[];for(const entry of ranges){let top=stack.peekLast();while(top&&top.endOffset<=entry.startOffset){append(top.endOffset,top.count);stack.pop();top=stack.peekLast();}
append(entry.startOffset,top?top.count:undefined);stack.push(entry);}
while(stack.length){const top=stack.pop();append(top.endOffset,top.count);}
function append(end,count){const last=result.peekLast();if(last){if(last.end===end){return;}
if(last.count===count){last.end=end;return;}}
result.push({end:end,count:count,stamp:stamp});}
return result;}
_addCoverage(contentProvider,contentLength,startLine,startColumn,ranges,type,stamp){const url=contentProvider.contentURL();if(!url){return null;}
let urlCoverage=this._coverageByURL.get(url);let isNewUrlCoverage=false;if(!urlCoverage){isNewUrlCoverage=true;urlCoverage=new Coverage.URLCoverageInfo(url);this._coverageByURL.set(url,urlCoverage);}
const coverageInfo=urlCoverage._ensureEntry(contentProvider,contentLength,startLine,startColumn,type);this._coverageByContentProvider.set(contentProvider,coverageInfo);const segments=Coverage.CoverageModel._convertToDisjointSegments(ranges,stamp);if(segments.length&&segments.peekLast().end<contentLength){segments.push({end:contentLength,stamp:stamp});}
const oldUsedSize=coverageInfo._usedSize;coverageInfo.mergeCoverage(segments);if(!isNewUrlCoverage&&coverageInfo._usedSize===oldUsedSize){return null;}
urlCoverage._usedSize+=coverageInfo._usedSize-oldUsedSize;return coverageInfo;}
async exportReport(fos){const result=[];function locationCompare(a,b){const[aLine,aPos]=a.split(':');const[bLine,bPos]=b.split(':');return aLine-bLine||aPos-bPos;}
const coverageByUrlKeys=Array.from(this._coverageByURL.keys()).sort();for(const urlInfoKey of coverageByUrlKeys){const urlInfo=this._coverageByURL.get(urlInfoKey);const url=urlInfo.url();if(url.startsWith('extensions::')||url.startsWith('chrome-extension://')){continue;}
let useFullText=false;for(const info of urlInfo._coverageInfoByLocation.values()){if(info._lineOffset||info._columnOffset){useFullText=!!url;break;}}
let fullText=null;if(useFullText){const resource=SDK.ResourceTreeModel.resourceForURL(url);const content=(await resource.requestContent()).content;fullText=resource?new TextUtils.Text(content||''):null;}
const coverageByLocationKeys=Array.from(urlInfo._coverageInfoByLocation.keys()).sort(locationCompare);if(fullText){const entry={url,ranges:[],text:fullText.value()};for(const infoKey of coverageByLocationKeys){const info=urlInfo._coverageInfoByLocation.get(infoKey);const offset=fullText?fullText.offsetFromPosition(info._lineOffset,info._columnOffset):0;let start=0;for(const segment of info._segments){if(segment.count){entry.ranges.push({start:start+offset,end:segment.end+offset});}else{start=segment.end;}}}
result.push(entry);continue;}
for(const infoKey of coverageByLocationKeys){const info=urlInfo._coverageInfoByLocation.get(infoKey);const entry={url,ranges:[],text:(await info.contentProvider().requestContent()).content};let start=0;for(const segment of info._segments){if(segment.count){entry.ranges.push({start:start,end:segment.end});}else{start=segment.end;}}
result.push(entry);}}
await fos.write(JSON.stringify(result,undefined,2));fos.close();}};Coverage.CoverageModel.Events={CoverageUpdated:Symbol('CoverageUpdated')};Coverage.CoverageModel._coveragePollingPeriodMs=200;SDK.SDKModel.register(Coverage.CoverageModel,SDK.Target.Capability.None,false);Coverage.URLCoverageInfo=class{constructor(url){this._url=url;this._coverageInfoByLocation=new Map();this._size=0;this._usedSize=0;this._type;this._isContentScript=false;}
url(){return this._url;}
type(){return this._type;}
size(){return this._size;}
usedSize(){return this._usedSize;}
unusedSize(){return this._size-this._usedSize;}
isContentScript(){return this._isContentScript;}
entries(){return this._coverageInfoByLocation.values();}
_ensureEntry(contentProvider,contentLength,lineOffset,columnOffset,type){const key=`${lineOffset}:${columnOffset}`;let entry=this._coverageInfoByLocation.get(key);if((type&Coverage.CoverageType.JavaScript)&&!this._coverageInfoByLocation.size){this._isContentScript=(contentProvider).isContentScript();}
this._type|=type;if(entry){entry._coverageType|=type;return entry;}
if((type&Coverage.CoverageType.JavaScript)&&!this._coverageInfoByLocation.size){this._isContentScript=(contentProvider).isContentScript();}
entry=new Coverage.CoverageInfo(contentProvider,contentLength,lineOffset,columnOffset,type);this._coverageInfoByLocation.set(key,entry);this._size+=contentLength;return entry;}};Coverage.CoverageInfo=class{constructor(contentProvider,size,lineOffset,columnOffset,type){this._contentProvider=contentProvider;this._size=size;this._usedSize=0;this._statsByTimestamp=new Map();this._lineOffset=lineOffset;this._columnOffset=columnOffset;this._coverageType=type;this._segments=[];}
contentProvider(){return this._contentProvider;}
url(){return this._contentProvider.contentURL();}
type(){return this._coverageType;}
mergeCoverage(segments){this._segments=Coverage.CoverageInfo._mergeCoverage(this._segments,segments);this._updateStats();}
usedByTimestamp(){return this._statsByTimestamp;}
size(){return this._size;}
usageForRange(start,end){let index=this._segments.upperBound(start,(position,segment)=>position-segment.end);for(;index<this._segments.length&&this._segments[index].end<end;++index){if(this._segments[index].count){return true;}}
return index<this._segments.length&&!!this._segments[index].count;}
static _mergeCoverage(segmentsA,segmentsB){const result=[];let indexA=0;let indexB=0;while(indexA<segmentsA.length&&indexB<segmentsB.length){const a=segmentsA[indexA];const b=segmentsB[indexB];const count=typeof a.count==='number'||typeof b.count==='number'?(a.count||0)+(b.count||0):undefined;const end=Math.min(a.end,b.end);const last=result.peekLast();const stamp=Math.min(a.stamp,b.stamp);if(!last||last.count!==count||last.stamp!==stamp){result.push({end:end,count:count,stamp:stamp});}else{last.end=end;}
if(a.end<=b.end){indexA++;}
if(a.end>=b.end){indexB++;}}
for(;indexA<segmentsA.length;indexA++){result.push(segmentsA[indexA]);}
for(;indexB<segmentsB.length;indexB++){result.push(segmentsB[indexB]);}
return result;}
_updateStats(){this._statsByTimestamp=new Map();this._usedSize=0;let last=0;for(const segment of this._segments){if(!this._statsByTimestamp.has(segment.stamp)){this._statsByTimestamp.set(segment.stamp,0);}
if(segment.count){const used=segment.end-last;this._usedSize+=used;this._statsByTimestamp.set(segment.stamp,this._statsByTimestamp.get(segment.stamp)+used);}
last=segment.end;}}};;Coverage.CoverageListView=class extends UI.VBox{constructor(filterCallback){super(true);this._nodeForCoverageInfo=new Map();this._filterCallback=filterCallback;this._highlightRegExp=null;this.registerRequiredCSS('coverage/coverageListView.css');const columns=[{id:'url',title:Common.UIString('URL'),width:'250px',fixedWidth:false,sortable:true},{id:'type',title:Common.UIString('Type'),width:'45px',fixedWidth:true,sortable:true},{id:'size',title:Common.UIString('Total Bytes'),width:'60px',fixedWidth:true,sortable:true,align:DataGrid.DataGrid.Align.Right},{id:'unusedSize',title:Common.UIString('Unused Bytes'),width:'100px',fixedWidth:true,sortable:true,align:DataGrid.DataGrid.Align.Right,sort:DataGrid.DataGrid.Order.Descending},{id:'bars',title:'',width:'250px',fixedWidth:false,sortable:true}];this._dataGrid=new DataGrid.SortableDataGrid(columns);this._dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);this._dataGrid.element.classList.add('flex-auto');this._dataGrid.element.addEventListener('keydown',this._onKeyDown.bind(this),false);this._dataGrid.addEventListener(DataGrid.DataGrid.Events.OpenedNode,this._onOpenedNode,this);this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged,this._sortingChanged,this);const dataGridWidget=this._dataGrid.asWidget();dataGridWidget.show(this.contentElement);}
update(coverageInfo){let hadUpdates=false;const maxSize=coverageInfo.reduce((acc,entry)=>Math.max(acc,entry.size()),0);const rootNode=this._dataGrid.rootNode();for(const entry of coverageInfo){let node=this._nodeForCoverageInfo.get(entry);if(node){if(this._filterCallback(node._coverageInfo)){hadUpdates=node._refreshIfNeeded(maxSize)||hadUpdates;}
continue;}
node=new Coverage.CoverageListView.GridNode(entry,maxSize);this._nodeForCoverageInfo.set(entry,node);if(this._filterCallback(node._coverageInfo)){rootNode.appendChild(node);hadUpdates=true;}}
if(hadUpdates){this._sortingChanged();}}
reset(){this._nodeForCoverageInfo.clear();this._dataGrid.rootNode().removeChildren();}
updateFilterAndHighlight(highlightRegExp){this._highlightRegExp=highlightRegExp;let hadTreeUpdates=false;for(const node of this._nodeForCoverageInfo.values()){const shouldBeVisible=this._filterCallback(node._coverageInfo);const isVisible=!!node.parent;if(shouldBeVisible){node._setHighlight(this._highlightRegExp);}
if(shouldBeVisible===isVisible){continue;}
hadTreeUpdates=true;if(!shouldBeVisible){node.remove();}else{this._dataGrid.rootNode().appendChild(node);}}
if(hadTreeUpdates){this._sortingChanged();}}
selectByUrl(url){for(const[info,node]of this._nodeForCoverageInfo.entries()){if(info.url()===url){node.revealAndSelect();break;}}}
_onOpenedNode(){this._revealSourceForSelectedNode();}
_onKeyDown(event){if(!isEnterKey(event)){return;}
event.consume(true);this._revealSourceForSelectedNode();}
async _revealSourceForSelectedNode(){const node=this._dataGrid.selectedNode;if(!node){return;}
const coverageInfo=(node)._coverageInfo;let sourceCode=Workspace.workspace.uiSourceCodeForURL(coverageInfo.url());if(!sourceCode){return;}
const content=(await sourceCode.requestContent()).content||'';if(TextUtils.isMinified(content)){const formatData=await Sources.sourceFormatter.format(sourceCode);sourceCode=formatData.formattedSourceCode;}
if(this._dataGrid.selectedNode!==node){return;}
Common.Revealer.reveal(sourceCode);}
_sortingChanged(){const columnId=this._dataGrid.sortColumnId();if(!columnId){return;}
let sortFunction;switch(columnId){case'url':sortFunction=compareURL;break;case'type':sortFunction=compareType;break;case'size':sortFunction=compareNumericField.bind(null,'size');break;case'bars':case'unusedSize':sortFunction=compareNumericField.bind(null,'unusedSize');break;default:console.assert(false,'Unknown sort field: '+columnId);return;}
this._dataGrid.sortNodes(sortFunction,!this._dataGrid.isSortOrderAscending());function compareURL(a,b){const nodeA=(a);const nodeB=(b);return nodeA._url.localeCompare(nodeB._url);}
function compareNumericField(fieldName,a,b){const nodeA=(a);const nodeB=(b);return nodeA._coverageInfo[fieldName]()-nodeB._coverageInfo[fieldName]()||compareURL(a,b);}
function compareType(a,b){const nodeA=(a);const nodeB=(b);const typeA=Coverage.CoverageListView._typeToString(nodeA._coverageInfo.type());const typeB=Coverage.CoverageListView._typeToString(nodeB._coverageInfo.type());return typeA.localeCompare(typeB)||compareURL(a,b);}}
static _typeToString(type){const types=[];if(type&Coverage.CoverageType.CSS){types.push(Common.UIString('CSS'));}
if(type&Coverage.CoverageType.JavaScriptCoarse){types.push(Common.UIString('JS (coarse)'));}else if(type&Coverage.CoverageType.JavaScript){types.push(Common.UIString('JS'));}
return types.join('+');}};Coverage.CoverageListView.GridNode=class extends DataGrid.SortableDataGridNode{constructor(coverageInfo,maxSize){super();this._coverageInfo=coverageInfo;this._lastUsedSize;this._url=coverageInfo.url();this._maxSize=maxSize;this._highlightDOMChanges=[];this._highlightRegExp=null;}
_setHighlight(highlightRegExp){if(this._highlightRegExp===highlightRegExp){return;}
this._highlightRegExp=highlightRegExp;this.refresh();}
_refreshIfNeeded(maxSize){if(this._lastUsedSize===this._coverageInfo.usedSize()&&maxSize===this._maxSize){return false;}
this._lastUsedSize=this._coverageInfo.usedSize();this._maxSize=maxSize;this.refresh();return true;}
createCell(columnId){const cell=this.createTD(columnId);switch(columnId){case'url':cell.title=this._url;const outer=cell.createChild('div','url-outer');const prefix=outer.createChild('div','url-prefix');const suffix=outer.createChild('div','url-suffix');const splitURL=/^(.*)(\/[^/]*)$/.exec(this._url);prefix.textContent=splitURL?splitURL[1]:this._url;suffix.textContent=splitURL?splitURL[2]:'';if(this._highlightRegExp){this._highlight(outer,this._url);}
break;case'type':cell.textContent=Coverage.CoverageListView._typeToString(this._coverageInfo.type());if(this._coverageInfo.type()&Coverage.CoverageType.JavaScriptCoarse){cell.title=Common.UIString('JS coverage is function-level only. Reload the page for block-level coverage.');}
break;case'size':cell.textContent=Number.withThousandsSeparator(this._coverageInfo.size()||0);break;case'unusedSize':const unusedSize=this._coverageInfo.unusedSize()||0;const unusedSizeSpan=cell.createChild('span');const unusedPercentsSpan=cell.createChild('span','percent-value');unusedSizeSpan.textContent=Number.withThousandsSeparator(unusedSize);unusedPercentsSpan.textContent=Common.UIString('%.1f\xa0%%',unusedSize/this._coverageInfo.size()*100);break;case'bars':const barContainer=cell.createChild('div','bar-container');const unusedSizeBar=barContainer.createChild('div','bar bar-unused-size');unusedSizeBar.style.width=(100*this._coverageInfo.unusedSize()/this._maxSize).toFixed(4)+'%';const usedSizeBar=barContainer.createChild('div','bar bar-used-size');usedSizeBar.style.width=(100*this._coverageInfo.usedSize()/this._maxSize).toFixed(4)+'%';}
return cell;}
_highlight(element,textContent){const matches=this._highlightRegExp.exec(textContent);if(!matches||!matches.length){return;}
const range=new TextUtils.SourceRange(matches.index,matches[0].length);UI.highlightRangesWithStyleClass(element,[range],'filter-highlight');}};;Coverage.CoverageView=class extends UI.VBox{constructor(){super(true);this._model=null;this._decorationManager=null;this._resourceTreeModel=null;this.registerRequiredCSS('coverage/coverageView.css');const toolbarContainer=this.contentElement.createChild('div','coverage-toolbar-container');const toolbar=new UI.Toolbar('coverage-toolbar',toolbarContainer);this._toggleRecordAction=(UI.actionRegistry.action('coverage.toggle-recording'));this._toggleRecordButton=UI.Toolbar.createActionButton(this._toggleRecordAction);toolbar.appendToolbarItem(this._toggleRecordButton);const mainTarget=SDK.targetManager.mainTarget();if(mainTarget&&mainTarget.model(SDK.ResourceTreeModel)){const startWithReloadAction=(UI.actionRegistry.action('coverage.start-with-reload'));this._startWithReloadButton=UI.Toolbar.createActionButton(startWithReloadAction);toolbar.appendToolbarItem(this._startWithReloadButton);}
this._clearButton=new UI.ToolbarButton(Common.UIString('Clear all'),'largeicon-clear');this._clearButton.addEventListener(UI.ToolbarButton.Events.Click,this._clear.bind(this));toolbar.appendToolbarItem(this._clearButton);toolbar.appendSeparator();const saveButton=new UI.ToolbarButton(Common.UIString('Export...'),'largeicon-download');saveButton.addEventListener(UI.ToolbarButton.Events.Click,()=>this._exportReport());toolbar.appendToolbarItem(saveButton);this._textFilterRegExp=null;toolbar.appendSeparator();this._filterInput=new UI.ToolbarInput(Common.UIString('URL filter'),'',0.4,1);this._filterInput.setEnabled(false);this._filterInput.addEventListener(UI.ToolbarInput.Event.TextChanged,this._onFilterChanged,this);toolbar.appendToolbarItem(this._filterInput);toolbar.appendSeparator();this._typeFilterValue=null;this._filterByTypeComboBox=new UI.ToolbarComboBox(this._onFilterByTypeChanged.bind(this),ls`Filter coverage by type`);const options=[{label:ls`All`,value:'',},{label:ls`CSS`,value:Coverage.CoverageType.CSS,},{label:ls`JavaScript`,value:Coverage.CoverageType.JavaScript|Coverage.CoverageType.JavaScriptCoarse,},];for(const option of options){this._filterByTypeComboBox.addOption(this._filterByTypeComboBox.createOption(option.label,option.value));}
this._filterByTypeComboBox.setSelectedIndex(0);this._filterByTypeComboBox.setEnabled(false);toolbar.appendToolbarItem(this._filterByTypeComboBox);toolbar.appendSeparator();this._showContentScriptsSetting=Common.settings.createSetting('showContentScripts',false);this._showContentScriptsSetting.addChangeListener(this._onFilterChanged,this);const contentScriptsCheckbox=new UI.ToolbarSettingCheckbox(this._showContentScriptsSetting,Common.UIString('Include extension content scripts'),Common.UIString('Content scripts'));toolbar.appendToolbarItem(contentScriptsCheckbox);this._coverageResultsElement=this.contentElement.createChild('div','coverage-results');this._landingPage=this._buildLandingPage();this._listView=new Coverage.CoverageListView(this._isVisible.bind(this,false));this._statusToolbarElement=this.contentElement.createChild('div','coverage-toolbar-summary');this._statusMessageElement=this._statusToolbarElement.createChild('div','coverage-message');this._landingPage.show(this._coverageResultsElement);}
_buildLandingPage(){const recordButton=UI.createInlineButton(UI.Toolbar.createActionButton(this._toggleRecordAction));const widget=new UI.VBox();let message;if(this._startWithReloadButton){const reloadButton=UI.createInlineButton(UI.Toolbar.createActionButtonForId('coverage.start-with-reload'));message=UI.formatLocalized('Click the record button %s to start capturing coverage.\nClick the reload button %s to reload and start capturing coverage.',[recordButton,reloadButton]);}else{message=UI.formatLocalized('Click the record button %s to start capturing coverage.',[recordButton]);}
message.classList.add('message');widget.contentElement.appendChild(message);widget.element.classList.add('landing-page');return widget;}
_clear(){if(this._model){this._model.reset();}
this._reset();}
_reset(){if(this._decorationManager){this._decorationManager.dispose();this._decorationManager=null;}
this._listView.reset();this._listView.detach();this._landingPage.show(this._coverageResultsElement);this._statusMessageElement.textContent='';this._filterInput.setEnabled(false);this._filterByTypeComboBox.setEnabled(false);}
_toggleRecording(){const enable=!this._toggleRecordAction.toggled();if(enable){this._startRecording(false);}else{this.stopRecording();}}
async ensureRecordingStarted(){const enable=!this._toggleRecordAction.toggled();if(enable){await this._startRecording(false);}}
async _startRecording(reload){this._reset();const mainTarget=SDK.targetManager.mainTarget();if(!mainTarget){return;}
if(!this._model||reload){this._model=mainTarget.model(Coverage.CoverageModel);}
Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageStarted);const success=await this._model.start();if(!success){return;}
this._model.addEventListener(Coverage.CoverageModel.Events.CoverageUpdated,this._onCoverageDataReceived,this);this._resourceTreeModel=(mainTarget.model(SDK.ResourceTreeModel));if(this._resourceTreeModel){this._resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated,this._onMainFrameNavigated,this);}
this._decorationManager=new Coverage.CoverageDecorationManager((this._model));this._toggleRecordAction.setToggled(true);this._clearButton.setEnabled(false);if(this._startWithReloadButton){this._startWithReloadButton.setEnabled(false);}
this._filterInput.setEnabled(true);this._filterByTypeComboBox.setEnabled(true);if(this._landingPage.isShowing()){this._landingPage.detach();}
this._listView.show(this._coverageResultsElement);if(reload&&this._resourceTreeModel){this._resourceTreeModel.reloadPage();}else{this._model.startPolling();}}
_onCoverageDataReceived(event){this._updateViews(event.data);}
async stopRecording(){if(this._resourceTreeModel){this._resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated,this._onMainFrameNavigated,this);this._resourceTreeModel=null;}
await this._model.stop();this._model.removeEventListener(Coverage.CoverageModel.Events.CoverageUpdated,this._onCoverageDataReceived,this);this._toggleRecordAction.setToggled(false);if(this._startWithReloadButton){this._startWithReloadButton.setEnabled(true);}
this._clearButton.setEnabled(true);}
_onMainFrameNavigated(){this._model.reset();this._decorationManager.reset();this._listView.reset();this._model.startPolling();}
_updateViews(updatedEntries){this._updateStats();this._listView.update(this._model.entries());this._decorationManager.update(updatedEntries);}
_updateStats(){let total=0;let unused=0;for(const info of this._model.entries()){if(!this._isVisible(true,info)){continue;}
total+=info.size();unused+=info.unusedSize();}
const used=total-unused;const percentUsed=total?Math.round(100*used/total):0;this._statusMessageElement.textContent=ls`${Number.bytesToString(used)} of ${Number.bytesToString(total)} (${percentUsed}%) used so far.
        ${Number.bytesToString(unused)} unused.`;}
_onFilterChanged(){if(!this._listView){return;}
const text=this._filterInput.value();this._textFilterRegExp=text?createPlainTextSearchRegex(text,'i'):null;this._listView.updateFilterAndHighlight(this._textFilterRegExp);this._updateStats();}
_onFilterByTypeChanged(){if(!this._listView){return;}
Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageReportFiltered);const type=this._filterByTypeComboBox.selectedOption().value;this._typeFilterValue=parseInt(type,10)||null;this._listView.updateFilterAndHighlight(this._textFilterRegExp);this._updateStats();}
_isVisible(ignoreTextFilter,coverageInfo){const url=coverageInfo.url();if(url.startsWith(Coverage.CoverageView._extensionBindingsURLPrefix)){return false;}
if(coverageInfo.isContentScript()&&!this._showContentScriptsSetting.get()){return false;}
if(this._typeFilterValue&&!(coverageInfo.type()&this._typeFilterValue)){return false;}
return ignoreTextFilter||!this._textFilterRegExp||this._textFilterRegExp.test(url);}
async _exportReport(){const fos=new Bindings.FileOutputStream();const fileName=`Coverage-${new Date().toISO8601Compact()}.json`;const accepted=await fos.open(fileName);if(!accepted){return;}
this._model.exportReport(fos);}
selectCoverageItemByUrl(url){this._listView.selectByUrl(url);}};Coverage.CoverageView._extensionBindingsURLPrefix='extensions::';Coverage.CoverageView.ActionDelegate=class{handleAction(context,actionId){const coverageViewId='coverage';UI.viewManager.showView(coverageViewId).then(()=>UI.viewManager.view(coverageViewId).widget()).then(widget=>this._innerHandleAction((widget),actionId));return true;}
_innerHandleAction(coverageView,actionId){switch(actionId){case'coverage.toggle-recording':coverageView._toggleRecording();break;case'coverage.start-with-reload':coverageView._startRecording(true);break;default:console.assert(false,`Unknown action: ${actionId}`);}}};;Coverage.RawLocation;Coverage.CoverageDecorationManager=class{constructor(coverageModel){this._coverageModel=coverageModel;this._textByProvider=new Map();this._uiSourceCodeByContentProvider=new Platform.Multimap();for(const uiSourceCode of Workspace.workspace.uiSourceCodes()){uiSourceCode.addLineDecoration(0,Coverage.CoverageDecorationManager._decoratorType,this);}
Workspace.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded,this._onUISourceCodeAdded,this);}
reset(){for(const uiSourceCode of Workspace.workspace.uiSourceCodes()){uiSourceCode.removeDecorationsForType(Coverage.CoverageDecorationManager._decoratorType);}}
dispose(){this.reset();Workspace.workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded,this._onUISourceCodeAdded,this);}
update(updatedEntries){for(const entry of updatedEntries){for(const uiSourceCode of this._uiSourceCodeByContentProvider.get(entry.contentProvider())){uiSourceCode.removeDecorationsForType(Coverage.CoverageDecorationManager._decoratorType);uiSourceCode.addLineDecoration(0,Coverage.CoverageDecorationManager._decoratorType,this);}}}
async usageByLine(uiSourceCode){const result=[];const{content}=await uiSourceCode.requestContent();if(!content){return[];}
const sourceText=new TextUtils.Text((content));await this._updateTexts(uiSourceCode,sourceText);const lineEndings=sourceText.lineEndings();for(let line=0;line<sourceText.lineCount();++line){const lineLength=lineEndings[line]-(line?lineEndings[line-1]:0)-1;if(!lineLength){result.push(undefined);continue;}
const startLocations=this._rawLocationsForSourceLocation(uiSourceCode,line,0);const endLocations=this._rawLocationsForSourceLocation(uiSourceCode,line,lineLength);let used=undefined;for(let startIndex=0,endIndex=0;startIndex<startLocations.length;++startIndex){const start=startLocations[startIndex];while(endIndex<endLocations.length&&Coverage.CoverageDecorationManager._compareLocations(start,endLocations[endIndex])>=0){++endIndex;}
if(endIndex>=endLocations.length||endLocations[endIndex].id!==start.id){continue;}
const end=endLocations[endIndex++];const text=this._textByProvider.get(end.contentProvider);if(!text){continue;}
const textValue=text.value();let startOffset=Math.min(text.offsetFromPosition(start.line,start.column),textValue.length-1);let endOffset=Math.min(text.offsetFromPosition(end.line,end.column),textValue.length-1);while(startOffset<=endOffset&&/\s/.test(textValue[startOffset])){++startOffset;}
while(startOffset<=endOffset&&/\s/.test(textValue[endOffset])){--endOffset;}
if(startOffset<=endOffset){used=this._coverageModel.usageForRange(end.contentProvider,startOffset,endOffset);}
if(used){break;}}
result.push(used);}
return result;}
_updateTexts(uiSourceCode,text){const promises=[];for(let line=0;line<text.lineCount();++line){for(const entry of this._rawLocationsForSourceLocation(uiSourceCode,line,0)){if(this._textByProvider.has(entry.contentProvider)){continue;}
this._textByProvider.set(entry.contentProvider,null);this._uiSourceCodeByContentProvider.set(entry.contentProvider,uiSourceCode);promises.push(this._updateTextForProvider(entry.contentProvider));}}
return Promise.all(promises);}
async _updateTextForProvider(contentProvider){const{content}=await contentProvider.requestContent();this._textByProvider.set(contentProvider,new TextUtils.Text(content||''));}
_rawLocationsForSourceLocation(uiSourceCode,line,column){const result=[];const contentType=uiSourceCode.contentType();if(contentType.hasScripts()){let locations=Bindings.debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode,line,column);locations=locations.filter(location=>!!location.script());for(const location of locations){const script=location.script();if(script.isInlineScript()&&contentType.isDocument()){location.lineNumber-=script.lineOffset;if(!location.lineNumber){location.columnNumber-=script.columnOffset;}}
result.push({id:`js:${location.scriptId}`,contentProvider:location.script(),line:location.lineNumber,column:location.columnNumber});}}
if(contentType.isStyleSheet()||contentType.isDocument()){const rawStyleLocations=Bindings.cssWorkspaceBinding.uiLocationToRawLocations(new Workspace.UILocation(uiSourceCode,line,column));for(const location of rawStyleLocations){const header=location.header();if(!header){continue;}
if(header.isInline&&contentType.isDocument()){location.lineNumber-=header.startLine;if(!location.lineNumber){location.columnNumber-=header.startColumn;}}
result.push({id:`css:${location.styleSheetId}`,contentProvider:location.header(),line:location.lineNumber,column:location.columnNumber});}}
return result.sort(Coverage.CoverageDecorationManager._compareLocations);}
static _compareLocations(a,b){return a.id.localeCompare(b.id)||a.line-b.line||a.column-b.column;}
_onUISourceCodeAdded(event){const uiSourceCode=(event.data);uiSourceCode.addLineDecoration(0,Coverage.CoverageDecorationManager._decoratorType,this);}};Coverage.CoverageDecorationManager._decoratorType='coverage';Coverage.CoverageView.LineDecorator=class{constructor(){this._listeners=new WeakMap();}
decorate(uiSourceCode,textEditor){const decorations=uiSourceCode.decorationsForType(Coverage.CoverageDecorationManager._decoratorType);if(!decorations||!decorations.size){this._uninstallGutter(textEditor);return;}
const decorationManager=(decorations.values().next().value.data());decorationManager.usageByLine(uiSourceCode).then(lineUsage=>{textEditor.operation(()=>this._innerDecorate(uiSourceCode,textEditor,lineUsage));});}
_innerDecorate(uiSourceCode,textEditor,lineUsage){const gutterType=Coverage.CoverageView.LineDecorator._gutterType;this._uninstallGutter(textEditor);if(lineUsage.length){this._installGutter(textEditor,uiSourceCode.url());}
for(let line=0;line<lineUsage.length;++line){if(typeof lineUsage[line]!=='boolean'){continue;}
const className=lineUsage[line]?'text-editor-coverage-used-marker':'text-editor-coverage-unused-marker';const gutterElement=createElementWithClass('div',className);textEditor.setGutterDecoration(line,gutterType,gutterElement);}}
makeGutterClickHandler(url){function handleGutterClick(event){const eventData=(event.data);if(eventData.gutterType!==Coverage.CoverageView.LineDecorator._gutterType){return;}
const coverageViewId='coverage';UI.viewManager.showView(coverageViewId).then(()=>UI.viewManager.view(coverageViewId).widget()).then(widget=>{const matchFormattedSuffix=url.match(/(.*):formatted$/);const urlWithoutFormattedSuffix=(matchFormattedSuffix&&matchFormattedSuffix[1])||url;widget.selectCoverageItemByUrl(urlWithoutFormattedSuffix);});}
return handleGutterClick;}
_installGutter(textEditor,url){let listener=this._listeners.get(textEditor);if(!listener){listener=this.makeGutterClickHandler(url);this._listeners.set(textEditor,listener);}
textEditor.installGutter(Coverage.CoverageView.LineDecorator._gutterType,false);textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.GutterClick,listener,this);}
_uninstallGutter(textEditor){textEditor.uninstallGutter(Coverage.CoverageView.LineDecorator._gutterType);const listener=this._listeners.get(textEditor);if(listener){textEditor.removeEventListener(SourceFrame.SourcesTextEditor.Events.GutterClick,listener,this);this._listeners.delete(textEditor);}}};Coverage.CoverageView.LineDecorator._gutterType='CodeMirror-gutter-coverage';;Root.Runtime.cachedResources["coverage/coverageListView.css"]=".data-grid {\n  border: none;\n}\n\n.data-grid td .url-outer {\n  width: 100%;\n  display: inline-flex;\n  justify-content: flex-start;\n}\n\n.data-grid td .url-outer .filter-highlight {\n  font-weight: bold;\n}\n\n.data-grid td .url-prefix {\n  overflow-x: hidden;\n  text-overflow: ellipsis;\n}\n\n.data-grid td .url-suffix {\n  flex: none;\n}\n\n.data-grid td .bar {\n  display: inline-block;\n  height: 8px;\n}\n\n.data-grid .selected td .bar {\n  border-top: 1px white solid;\n  border-bottom: 1px white solid;\n}\n\n.data-grid .selected td .bar:last-child {\n  border-right: 1px white solid;\n}\n\n.data-grid .selected td .bar:first-child {\n  border-left: 1px white solid;\n}\n\n.data-grid td .bar-container {\n}\n\n.data-grid td .bar-unused-size {\n  background-color: #EE442F;\n}\n\n.data-grid td .bar-used-size {\n  background-color: #63ACBE;\n}\n\n.data-grid td .percent-value {\n  color: #888;\n  width: 45px;\n  display: inline-block;\n}\n\n.data-grid:focus tr.selected span.percent-value {\n  color: #eee;\n}\n\n/*# sourceURL=coverage/coverageListView.css */";Root.Runtime.cachedResources["coverage/coverageView.css"]="/*\n * Copyright (c) 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n    overflow: hidden;\n}\n\n.coverage-toolbar-container {\n    display: flex;\n    border-bottom: 1px solid #ccc;\n    flex: 0 0 auto;\n}\n\n.coverage-toolbar {\n    display: inline-block;\n}\n\n.coverage-toolbar-summary {\n    background-color: #eee;\n    border-top: 1px solid #ccc;\n    padding-left: 5px;\n    flex: 0 0 19px;\n    display: flex;\n    padding-right: 5px;\n}\n\n.coverage-toolbar-summary .coverage-message {\n    padding-top: 2px;\n    padding-left: 1ex;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    overflow: hidden;\n}\n\n.coverage-results {\n    overflow-y: auto;\n    display: flex;\n    flex: auto;\n}\n\n.landing-page {\n    justify-content: center;\n    align-items:  center;\n    padding: 20px;\n}\n\n.landing-page .message {\n    white-space: pre-line;\n}\n\n/*# sourceURL=coverage/coverageView.css */";