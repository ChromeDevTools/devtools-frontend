export default class ResourceScriptMapping{constructor(debuggerModel,workspace,debuggerWorkspaceBinding){this._debuggerModel=debuggerModel;this._workspace=workspace;this._debuggerWorkspaceBinding=debuggerWorkspaceBinding;this._uiSourceCodeToScriptFile=new Map();this._projects=new Map();this._acceptedScripts=new Set();const runtimeModel=debuggerModel.runtimeModel();this._eventListeners=[this._debuggerModel.addEventListener(SDK.DebuggerModel.Events.ParsedScriptSource,this._parsedScriptSource,this),this._debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared,this._globalObjectCleared,this),runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExecutionContextDestroyed,this._executionContextDestroyed,this),];}
_project(script){const frameId=script[_frameIdSymbol];const prefix=script.isContentScript()?'js:extensions:':'js::';const projectId=prefix+this._debuggerModel.target().id()+':'+frameId;let project=this._projects.get(projectId);if(!project){const projectType=script.isContentScript()?Workspace.projectTypes.ContentScripts:Workspace.projectTypes.Network;project=new Bindings.ContentProviderBasedProject(this._workspace,projectId,projectType,'',false);Bindings.NetworkProject.setTargetForProject(project,this._debuggerModel.target());this._projects.set(projectId,project);}
return project;}
rawLocationToUILocation(rawLocation){const script=rawLocation.script();if(!script){return null;}
const project=this._project(script);const uiSourceCode=project.uiSourceCodeForURL(script.sourceURL);if(!uiSourceCode){return null;}
const scriptFile=this._uiSourceCodeToScriptFile.get(uiSourceCode);if(!scriptFile){return null;}
if((scriptFile.hasDivergedFromVM()&&!scriptFile.isMergingToVM())||scriptFile.isDivergingFromVM()){return null;}
if(!scriptFile._hasScripts([script])){return null;}
const lineNumber=rawLocation.lineNumber-(script.isInlineScriptWithSourceURL()?script.lineOffset:0);let columnNumber=rawLocation.columnNumber||0;if(script.isInlineScriptWithSourceURL()&&!lineNumber&&columnNumber){columnNumber-=script.columnOffset;}
return uiSourceCode.uiLocation(lineNumber,columnNumber);}
uiLocationToRawLocations(uiSourceCode,lineNumber,columnNumber){const scriptFile=this._uiSourceCodeToScriptFile.get(uiSourceCode);if(!scriptFile){return[];}
const script=scriptFile._script;if(script.isInlineScriptWithSourceURL()){return[this._debuggerModel.createRawLocation(script,lineNumber+script.lineOffset,lineNumber?columnNumber:columnNumber+script.columnOffset)];}
return[this._debuggerModel.createRawLocation(script,lineNumber,columnNumber)];}
_acceptsScript(script){if(!script.sourceURL||script.isLiveEdit()||(script.isInlineScript()&&!script.hasSourceURL)){return false;}
if(script.isContentScript()&&!script.hasSourceURL){const parsedURL=new Common.ParsedURL(script.sourceURL);if(!parsedURL.isValid){return false;}}
return true;}
_parsedScriptSource(event){const script=(event.data);if(!this._acceptsScript(script)){return;}
this._acceptedScripts.add(script);const originalContentProvider=script.originalContentProvider();const frameId=Bindings.frameIdForScript(script);script[_frameIdSymbol]=frameId;const url=script.sourceURL;const project=this._project(script);const oldUISourceCode=project.uiSourceCodeForURL(url);if(oldUISourceCode){const scriptFile=this._uiSourceCodeToScriptFile.get(oldUISourceCode);this._removeScript(scriptFile._script);}
const uiSourceCode=project.createUISourceCode(url,originalContentProvider.contentType());Bindings.NetworkProject.setInitialFrameAttribution(uiSourceCode,frameId);const metadata=Bindings.metadataForURL(this._debuggerModel.target(),frameId,url);const scriptFile=new ResourceScriptFile(this,uiSourceCode,[script]);this._uiSourceCodeToScriptFile.set(uiSourceCode,scriptFile);project.addUISourceCodeWithProvider(uiSourceCode,originalContentProvider,metadata,'text/javascript');this._debuggerWorkspaceBinding.updateLocations(script);}
scriptFile(uiSourceCode){return this._uiSourceCodeToScriptFile.get(uiSourceCode)||null;}
_removeScript(script){if(!this._acceptedScripts.has(script)){return;}
this._acceptedScripts.delete(script);const project=this._project(script);const uiSourceCode=(project.uiSourceCodeForURL(script.sourceURL));const scriptFile=this._uiSourceCodeToScriptFile.get(uiSourceCode);scriptFile.dispose();this._uiSourceCodeToScriptFile.delete(uiSourceCode);project.removeFile(script.sourceURL);this._debuggerWorkspaceBinding.updateLocations(script);}
_executionContextDestroyed(event){const executionContext=(event.data);const scripts=this._debuggerModel.scriptsForExecutionContext(executionContext);for(const script of scripts){this._removeScript(script);}}
_globalObjectCleared(event){const scripts=Array.from(this._acceptedScripts);for(const script of scripts){this._removeScript(script);}}
resetForTest(){const scripts=Array.from(this._acceptedScripts);for(const script of scripts){this._removeScript(script);}}
dispose(){Common.EventTarget.removeEventListeners(this._eventListeners);const scripts=Array.from(this._acceptedScripts);for(const script of scripts){this._removeScript(script);}
for(const project of this._projects.values()){project.removeProject();}
this._projects.clear();}}
export class ResourceScriptFile extends Common.Object{constructor(resourceScriptMapping,uiSourceCode,scripts){super();console.assert(scripts.length);this._resourceScriptMapping=resourceScriptMapping;this._uiSourceCode=uiSourceCode;if(this._uiSourceCode.contentType().isScript()){this._script=scripts[scripts.length-1];}
this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._workingCopyChanged,this);this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._workingCopyCommitted,this);}
_hasScripts(scripts){return this._script&&this._script===scripts[0];}
_isDiverged(){if(this._uiSourceCode.isDirty()){return true;}
if(!this._script){return false;}
if(typeof this._scriptSource==='undefined'){return false;}
const workingCopy=this._uiSourceCode.workingCopy();if(!workingCopy){return false;}
if(!workingCopy.startsWith(this._scriptSource.trimRight())){return true;}
const suffix=this._uiSourceCode.workingCopy().substr(this._scriptSource.length);return!!suffix.length&&!suffix.match(SDK.Script.sourceURLRegex);}
_workingCopyChanged(event){this._update();}
_workingCopyCommitted(event){if(this._uiSourceCode.project().canSetFileContent()){return;}
if(!this._script){return;}
const debuggerModel=this._resourceScriptMapping._debuggerModel;const breakpoints=Bindings.breakpointManager.breakpointLocationsForUISourceCode(this._uiSourceCode).map(breakpointLocation=>breakpointLocation.breakpoint);const source=this._uiSourceCode.workingCopy();debuggerModel.setScriptSource(this._script.scriptId,source,scriptSourceWasSet.bind(this));async function scriptSourceWasSet(error,exceptionDetails){if(!error&&!exceptionDetails){this._scriptSource=source;}
this._update();if(!error&&!exceptionDetails){breakpoints.map(breakpoint=>breakpoint.refreshInDebugger());return;}
if(!exceptionDetails){Common.console.addMessage(Common.UIString('LiveEdit failed: %s',error),Common.Console.MessageLevel.Warning);return;}
const messageText=Common.UIString('LiveEdit compile failed: %s',exceptionDetails.text);this._uiSourceCode.addLineMessage(Workspace.UISourceCode.Message.Level.Error,messageText,exceptionDetails.lineNumber,exceptionDetails.columnNumber);}}
_update(){if(this._isDiverged()&&!this._hasDivergedFromVM){this._divergeFromVM();}else if(!this._isDiverged()&&this._hasDivergedFromVM){this._mergeToVM();}}
_divergeFromVM(){this._isDivergingFromVM=true;this._resourceScriptMapping._debuggerWorkspaceBinding.updateLocations(this._script);delete this._isDivergingFromVM;this._hasDivergedFromVM=true;this.dispatchEventToListeners(ResourceScriptFile.Events.DidDivergeFromVM,this._uiSourceCode);}
_mergeToVM(){delete this._hasDivergedFromVM;this._isMergingToVM=true;this._resourceScriptMapping._debuggerWorkspaceBinding.updateLocations(this._script);delete this._isMergingToVM;this.dispatchEventToListeners(ResourceScriptFile.Events.DidMergeToVM,this._uiSourceCode);}
hasDivergedFromVM(){return this._hasDivergedFromVM;}
isDivergingFromVM(){return this._isDivergingFromVM;}
isMergingToVM(){return this._isMergingToVM;}
checkMapping(){if(!this._script||typeof this._scriptSource!=='undefined'){this._mappingCheckedForTest();return;}
this._script.requestContent().then(deferredContent=>{this._scriptSource=deferredContent.content;this._update();this._mappingCheckedForTest();});}
_mappingCheckedForTest(){}
dispose(){this._uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._workingCopyChanged,this);this._uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._workingCopyCommitted,this);}
addSourceMapURL(sourceMapURL){if(!this._script){return;}
this._script.debuggerModel.setSourceMapURL(this._script,sourceMapURL);}
hasSourceMapURL(){return this._script&&!!this._script.sourceMapURL;}}
export const _frameIdSymbol=Symbol('frameid');ResourceScriptFile.Events={DidMergeToVM:Symbol('DidMergeToVM'),DidDivergeFromVM:Symbol('DidDivergeFromVM'),};self.Bindings=self.Bindings||{};Bindings=Bindings||{};Bindings.ResourceScriptMapping=ResourceScriptMapping;Bindings.ResourceScriptMapping._frameIdSymbol=_frameIdSymbol;Bindings.ResourceScriptFile=ResourceScriptFile;