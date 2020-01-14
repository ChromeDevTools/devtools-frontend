export default class StylesSourceMapping{constructor(cssModel,workspace){this._cssModel=cssModel;const target=this._cssModel.target();this._project=new Bindings.ContentProviderBasedProject(workspace,'css:'+target.id(),Workspace.projectTypes.Network,'',false);Bindings.NetworkProject.setTargetForProject(this._project,target);this._styleFiles=new Map();this._eventListeners=[this._cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded,this._styleSheetAdded,this),this._cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved,this._styleSheetRemoved,this),this._cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged,this._styleSheetChanged,this),];}
rawLocationToUILocation(rawLocation){const header=rawLocation.header();if(!header||!this._acceptsHeader(header)){return null;}
const styleFile=this._styleFiles.get(header.resourceURL());if(!styleFile){return null;}
let lineNumber=rawLocation.lineNumber;let columnNumber=rawLocation.columnNumber;if(header.isInline&&header.hasSourceURL){lineNumber-=header.lineNumberInSource(0);columnNumber-=header.columnNumberInSource(lineNumber,0);}
return styleFile._uiSourceCode.uiLocation(lineNumber,columnNumber);}
uiLocationToRawLocations(uiLocation){const styleFile=uiLocation.uiSourceCode[StyleFile._symbol];if(!styleFile){return[];}
const rawLocations=[];for(const header of styleFile._headers){let lineNumber=uiLocation.lineNumber;let columnNumber=uiLocation.columnNumber;if(header.isInline&&header.hasSourceURL){columnNumber=header.columnNumberInSource(lineNumber,columnNumber);lineNumber=header.lineNumberInSource(lineNumber);}
rawLocations.push(new SDK.CSSLocation(header,lineNumber,columnNumber));}
return rawLocations;}
_acceptsHeader(header){if(header.isInline&&!header.hasSourceURL&&header.origin!=='inspector'){return false;}
if(!header.resourceURL()){return false;}
return true;}
_styleSheetAdded(event){const header=(event.data);if(!this._acceptsHeader(header)){return;}
const url=header.resourceURL();let styleFile=this._styleFiles.get(url);if(!styleFile){styleFile=new StyleFile(this._cssModel,this._project,header);this._styleFiles.set(url,styleFile);}else{styleFile.addHeader(header);}}
_styleSheetRemoved(event){const header=(event.data);if(!this._acceptsHeader(header)){return;}
const url=header.resourceURL();const styleFile=this._styleFiles.get(url);if(styleFile._headers.size===1){styleFile.dispose();this._styleFiles.delete(url);}else{styleFile.removeHeader(header);}}
_styleSheetChanged(event){const header=this._cssModel.styleSheetHeaderForId(event.data.styleSheetId);if(!header||!this._acceptsHeader(header)){return;}
const styleFile=this._styleFiles.get(header.resourceURL());styleFile._styleSheetChanged(header);}
dispose(){for(const styleFile of this._styleFiles.values()){styleFile.dispose();}
this._styleFiles.clear();Common.EventTarget.removeEventListeners(this._eventListeners);this._project.removeProject();}}
export class StyleFile{constructor(cssModel,project,header){this._cssModel=cssModel;this._project=project;this._headers=new Set([header]);const target=cssModel.target();const url=header.resourceURL();const metadata=Bindings.metadataForURL(target,header.frameId,url);this._uiSourceCode=this._project.createUISourceCode(url,header.contentType());this._uiSourceCode[StyleFile._symbol]=this;Bindings.NetworkProject.setInitialFrameAttribution(this._uiSourceCode,header.frameId);this._project.addUISourceCodeWithProvider(this._uiSourceCode,this,metadata,'text/css');this._eventListeners=[this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._workingCopyChanged,this),this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._workingCopyCommitted,this)];this._throttler=new Common.Throttler(StyleFile.updateTimeout);this._terminated=false;}
addHeader(header){this._headers.add(header);Bindings.NetworkProject.addFrameAttribution(this._uiSourceCode,header.frameId);}
removeHeader(header){this._headers.delete(header);Bindings.NetworkProject.removeFrameAttribution(this._uiSourceCode,header.frameId);}
_styleSheetChanged(header){console.assert(this._headers.has(header));if(this._isUpdatingHeaders||!this._headers.has(header)){return;}
const mirrorContentBound=this._mirrorContent.bind(this,header,true);this._throttler.schedule(mirrorContentBound,false);}
_workingCopyCommitted(event){if(this._isAddingRevision){return;}
const mirrorContentBound=this._mirrorContent.bind(this,this._uiSourceCode,true);this._throttler.schedule(mirrorContentBound,true);}
_workingCopyChanged(event){if(this._isAddingRevision){return;}
const mirrorContentBound=this._mirrorContent.bind(this,this._uiSourceCode,false);this._throttler.schedule(mirrorContentBound,false);}
async _mirrorContent(fromProvider,majorChange){if(this._terminated){this._styleFileSyncedForTest();return;}
let newContent=null;if(fromProvider===this._uiSourceCode){newContent=this._uiSourceCode.workingCopy();}else{const deferredContent=await fromProvider.requestContent();newContent=deferredContent.content;}
if(newContent===null||this._terminated){this._styleFileSyncedForTest();return;}
if(fromProvider!==this._uiSourceCode){this._isAddingRevision=true;this._uiSourceCode.addRevision(newContent);this._isAddingRevision=false;}
this._isUpdatingHeaders=true;const promises=[];for(const header of this._headers){if(header===fromProvider){continue;}
promises.push(this._cssModel.setStyleSheetText(header.id,newContent,majorChange));}
await Promise.all(promises);this._isUpdatingHeaders=false;this._styleFileSyncedForTest();}
_styleFileSyncedForTest(){}
dispose(){if(this._terminated){return;}
this._terminated=true;this._project.removeFile(this._uiSourceCode.url());Common.EventTarget.removeEventListeners(this._eventListeners);}
contentURL(){return this._headers.firstValue().originalContentProvider().contentURL();}
contentType(){return this._headers.firstValue().originalContentProvider().contentType();}
contentEncoded(){return this._headers.firstValue().originalContentProvider().contentEncoded();}
requestContent(){return this._headers.firstValue().originalContentProvider().requestContent();}
searchInContent(query,caseSensitive,isRegex){return this._headers.firstValue().originalContentProvider().searchInContent(query,caseSensitive,isRegex);}}
StyleFile._symbol=Symbol('Bindings.StyleFile._symbol');StyleFile.updateTimeout=200;self.Bindings=self.Bindings||{};Bindings=Bindings||{};Bindings.StylesSourceMapping=StylesSourceMapping;Bindings.StyleFile=StyleFile;