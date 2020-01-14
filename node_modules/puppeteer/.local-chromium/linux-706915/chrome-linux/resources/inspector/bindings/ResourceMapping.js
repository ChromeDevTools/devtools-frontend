export default class ResourceMapping{constructor(targetManager,workspace){this._workspace=workspace;this._modelToInfo=new Map();targetManager.observeModels(SDK.ResourceTreeModel,this);}
modelAdded(resourceTreeModel){const info=new ModelInfo(this._workspace,resourceTreeModel);this._modelToInfo.set(resourceTreeModel,info);}
modelRemoved(resourceTreeModel){const info=this._modelToInfo.get(resourceTreeModel);info.dispose();this._modelToInfo.delete(resourceTreeModel);}
_infoForTarget(target){const resourceTreeModel=target.model(SDK.ResourceTreeModel);return resourceTreeModel?this._modelToInfo.get(resourceTreeModel):null;}
cssLocationToUILocation(cssLocation){const header=cssLocation.header();if(!header){return null;}
const info=this._infoForTarget(cssLocation.cssModel().target());if(!info){return null;}
const uiSourceCode=info._project.uiSourceCodeForURL(cssLocation.url);if(!uiSourceCode){return null;}
const offset=header[_offsetSymbol]||TextUtils.TextRange.createFromLocation(header.startLine,header.startColumn);const lineNumber=cssLocation.lineNumber+offset.startLine-header.startLine;let columnNumber=cssLocation.columnNumber;if(cssLocation.lineNumber===header.startLine){columnNumber+=offset.startColumn-header.startColumn;}
return uiSourceCode.uiLocation(lineNumber,columnNumber);}
jsLocationToUILocation(jsLocation){const script=jsLocation.script();if(!script){return null;}
const info=this._infoForTarget(jsLocation.debuggerModel.target());if(!info){return null;}
const uiSourceCode=info._project.uiSourceCodeForURL(script.sourceURL);if(!uiSourceCode){return null;}
const offset=script[_offsetSymbol]||TextUtils.TextRange.createFromLocation(script.lineOffset,script.columnOffset);const lineNumber=jsLocation.lineNumber+offset.startLine-script.lineOffset;let columnNumber=jsLocation.columnNumber;if(jsLocation.lineNumber===script.lineOffset){columnNumber+=offset.startColumn-script.columnOffset;}
return uiSourceCode.uiLocation(lineNumber,columnNumber);}
uiLocationToJSLocations(uiSourceCode,lineNumber,columnNumber){if(!uiSourceCode[_symbol]){return[];}
const target=Bindings.NetworkProject.targetForUISourceCode(uiSourceCode);if(!target){return[];}
const debuggerModel=target.model(SDK.DebuggerModel);if(!debuggerModel){return[];}
const location=debuggerModel.createRawLocationByURL(uiSourceCode.url(),lineNumber,columnNumber);if(location&&location.script().containsLocation(lineNumber,columnNumber)){return[location];}
return[];}
uiLocationToCSSLocations(uiLocation){if(!uiLocation.uiSourceCode[_symbol]){return[];}
const target=Bindings.NetworkProject.targetForUISourceCode(uiLocation.uiSourceCode);if(!target){return[];}
const cssModel=target.model(SDK.CSSModel);if(!cssModel){return[];}
return cssModel.createRawLocationsByURL(uiLocation.uiSourceCode.url(),uiLocation.lineNumber,uiLocation.columnNumber);}
_resetForTest(target){const resourceTreeModel=target.model(SDK.ResourceTreeModel);const info=resourceTreeModel?this._modelToInfo.get(resourceTreeModel):null;if(info){info._resetForTest();}}}
export class ModelInfo{constructor(workspace,resourceTreeModel){const target=resourceTreeModel.target();this._project=new Bindings.ContentProviderBasedProject(workspace,'resources:'+target.id(),Workspace.projectTypes.Network,'',false);Bindings.NetworkProject.setTargetForProject(this._project,target);this._bindings=new Map();const cssModel=target.model(SDK.CSSModel);this._cssModel=cssModel;this._eventListeners=[resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.ResourceAdded,this._resourceAdded,this),resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameWillNavigate,this._frameWillNavigate,this),resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameDetached,this._frameDetached,this),cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged,this._styleSheetChanged,this)];}
_styleSheetChanged(event){const header=this._cssModel.styleSheetHeaderForId(event.data.styleSheetId);if(!header||!header.isInline){return;}
const binding=this._bindings.get(header.resourceURL());if(!binding){return;}
binding._styleSheetChanged(header,event.data.edit);}
_acceptsResource(resource){const resourceType=resource.resourceType();if(resourceType!==Common.resourceTypes.Image&&resourceType!==Common.resourceTypes.Font&&resourceType!==Common.resourceTypes.Document&&resourceType!==Common.resourceTypes.Manifest){return false;}
if(resourceType===Common.resourceTypes.Image&&resource.mimeType&&!resource.mimeType.startsWith('image')){return false;}
if(resourceType===Common.resourceTypes.Font&&resource.mimeType&&!resource.mimeType.includes('font')){return false;}
if((resourceType===Common.resourceTypes.Image||resourceType===Common.resourceTypes.Font)&&resource.contentURL().startsWith('data:')){return false;}
return true;}
_resourceAdded(event){const resource=(event.data);if(!this._acceptsResource(resource)){return;}
let binding=this._bindings.get(resource.url);if(!binding){binding=new Binding(this._project,resource);this._bindings.set(resource.url,binding);}else{binding.addResource(resource);}}
_removeFrameResources(frame){for(const resource of frame.resources()){if(!this._acceptsResource(resource)){continue;}
const binding=this._bindings.get(resource.url);if(binding._resources.size===1){binding.dispose();this._bindings.delete(resource.url);}else{binding.removeResource(resource);}}}
_frameWillNavigate(event){const frame=(event.data);this._removeFrameResources(frame);}
_frameDetached(event){const frame=(event.data);this._removeFrameResources(frame);}
_resetForTest(){for(const binding of this._bindings.valuesArray()){binding.dispose();}
this._bindings.clear();}
dispose(){Common.EventTarget.removeEventListeners(this._eventListeners);for(const binding of this._bindings.valuesArray()){binding.dispose();}
this._bindings.clear();this._project.removeProject();}}
export class Binding{constructor(project,resource){this._resources=new Set([resource]);this._project=project;this._uiSourceCode=this._project.createUISourceCode(resource.url,resource.contentType());this._uiSourceCode[_symbol]=true;Bindings.NetworkProject.setInitialFrameAttribution(this._uiSourceCode,resource.frameId);this._project.addUISourceCodeWithProvider(this._uiSourceCode,this,Bindings.resourceMetadata(resource),resource.mimeType);this._edits=[];}
_inlineStyles(){const target=Bindings.NetworkProject.targetForUISourceCode(this._uiSourceCode);const cssModel=target.model(SDK.CSSModel);const stylesheets=[];if(cssModel){for(const headerId of cssModel.styleSheetIdsForURL(this._uiSourceCode.url())){const header=cssModel.styleSheetHeaderForId(headerId);if(header){stylesheets.push(header);}}}
return stylesheets;}
_inlineScripts(){const target=Bindings.NetworkProject.targetForUISourceCode(this._uiSourceCode);const debuggerModel=target.model(SDK.DebuggerModel);if(!debuggerModel){return[];}
return debuggerModel.scriptsForSourceURL(this._uiSourceCode.url());}
async _styleSheetChanged(stylesheet,edit){this._edits.push({stylesheet,edit});if(this._edits.length>1){return;}
const{content}=await this._uiSourceCode.requestContent();if(content!==null){this._innerStyleSheetChanged(content);}
this._edits=[];}
_innerStyleSheetChanged(content){const scripts=this._inlineScripts();const styles=this._inlineStyles();let text=new TextUtils.Text(content);for(const data of this._edits){const edit=data.edit;const stylesheet=data.stylesheet;const startLocation=stylesheet[_offsetSymbol]||TextUtils.TextRange.createFromLocation(stylesheet.startLine,stylesheet.startColumn);const oldRange=edit.oldRange.relativeFrom(startLocation.startLine,startLocation.startColumn);const newRange=edit.newRange.relativeFrom(startLocation.startLine,startLocation.startColumn);text=new TextUtils.Text(text.replaceRange(oldRange,edit.newText));for(const script of scripts){const scriptOffset=script[_offsetSymbol]||TextUtils.TextRange.createFromLocation(script.lineOffset,script.columnOffset);if(!scriptOffset.follows(oldRange)){continue;}
script[_offsetSymbol]=scriptOffset.rebaseAfterTextEdit(oldRange,newRange);Bindings.debuggerWorkspaceBinding.updateLocations(script);}
for(const style of styles){const styleOffset=style[_offsetSymbol]||TextUtils.TextRange.createFromLocation(style.startLine,style.startColumn);if(!styleOffset.follows(oldRange)){continue;}
style[_offsetSymbol]=styleOffset.rebaseAfterTextEdit(oldRange,newRange);Bindings.cssWorkspaceBinding.updateLocations(style);}}
this._uiSourceCode.addRevision(text.value());}
addResource(resource){this._resources.add(resource);Bindings.NetworkProject.addFrameAttribution(this._uiSourceCode,resource.frameId);}
removeResource(resource){this._resources.delete(resource);Bindings.NetworkProject.removeFrameAttribution(this._uiSourceCode,resource.frameId);}
dispose(){this._project.removeFile(this._uiSourceCode.url());}
contentURL(){return this._resources.firstValue().contentURL();}
contentType(){return this._resources.firstValue().contentType();}
contentEncoded(){return this._resources.firstValue().contentEncoded();}
requestContent(){return this._resources.firstValue().requestContent();}
searchInContent(query,caseSensitive,isRegex){return this._resources.firstValue().searchInContent(query,caseSensitive,isRegex);}}
export const _symbol=Symbol('Bindings.ResourceMapping._symbol');export const _offsetSymbol=Symbol('Bindings.ResourceMapping._offsetSymbol');self.Bindings=self.Bindings||{};Bindings=Bindings||{};Bindings.ResourceMapping=ResourceMapping;Bindings.ResourceMapping.ModelInfo=ModelInfo;Bindings.ResourceMapping.Binding=Binding;Bindings.ResourceMapping._symbol=_symbol;Bindings.ResourceMapping._offsetSymbol=_offsetSymbol;