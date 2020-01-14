export default class DebuggerWorkspaceBinding{constructor(targetManager,workspace){this._workspace=workspace;this._sourceMappings=[];this._debuggerModelToData=new Map();targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.GlobalObjectCleared,this._globalObjectCleared,this);targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.DebuggerResumed,this._debuggerResumed,this);targetManager.observeModels(SDK.DebuggerModel,this);}
addSourceMapping(sourceMapping){this._sourceMappings.push(sourceMapping);}
modelAdded(debuggerModel){this._debuggerModelToData.set(debuggerModel,new ModelData(debuggerModel,this));}
modelRemoved(debuggerModel){const modelData=this._debuggerModelToData.get(debuggerModel);modelData._dispose();this._debuggerModelToData.remove(debuggerModel);}
updateLocations(script){const modelData=this._debuggerModelToData.get(script.debuggerModel);if(modelData){modelData._updateLocations(script);}}
createLiveLocation(rawLocation,updateDelegate,locationPool){const modelData=this._debuggerModelToData.get(rawLocation.script().debuggerModel);return modelData._createLiveLocation(rawLocation,updateDelegate,locationPool);}
createStackTraceTopFrameLiveLocation(rawLocations,updateDelegate,locationPool){console.assert(rawLocations.length);const location=new StackTraceTopFrameLocation(rawLocations,this,updateDelegate,locationPool);location.update();return location;}
createCallFrameLiveLocation(location,updateDelegate,locationPool){const script=location.script();if(!script){return null;}
const debuggerModel=location.debuggerModel;const liveLocation=this.createLiveLocation(location,updateDelegate,locationPool);this._registerCallFrameLiveLocation(debuggerModel,liveLocation);return liveLocation;}
rawLocationToUILocation(rawLocation){for(let i=0;i<this._sourceMappings.length;++i){const uiLocation=this._sourceMappings[i].rawLocationToUILocation(rawLocation);if(uiLocation){return uiLocation;}}
const modelData=this._debuggerModelToData.get(rawLocation.debuggerModel);return modelData._rawLocationToUILocation(rawLocation);}
uiSourceCodeForSourceMapSourceURL(debuggerModel,url,isContentScript){const modelData=this._debuggerModelToData.get(debuggerModel);if(!modelData){return null;}
return modelData._compilerMapping.uiSourceCodeForURL(url,isContentScript);}
uiLocationToRawLocations(uiSourceCode,lineNumber,columnNumber){let locations=[];for(let i=0;i<this._sourceMappings.length&&!locations.length;++i){locations=this._sourceMappings[i].uiLocationToRawLocations(uiSourceCode,lineNumber,columnNumber);}
if(locations.length){return locations;}
for(const modelData of this._debuggerModelToData.values()){locations.push(...modelData._uiLocationToRawLocations(uiSourceCode,lineNumber,columnNumber));}
return locations;}
normalizeUILocation(uiLocation){const rawLocations=this.uiLocationToRawLocations(uiLocation.uiSourceCode,uiLocation.lineNumber,uiLocation.columnNumber);for(const location of rawLocations){const uiLocationCandidate=this.rawLocationToUILocation(location);if(uiLocationCandidate){return uiLocationCandidate;}}
return uiLocation;}
scriptFile(uiSourceCode,debuggerModel){const modelData=this._debuggerModelToData.get(debuggerModel);return modelData?modelData._resourceMapping.scriptFile(uiSourceCode):null;}
sourceMapForScript(script){const modelData=this._debuggerModelToData.get(script.debuggerModel);if(!modelData){return null;}
return modelData._compilerMapping.sourceMapForScript(script);}
_globalObjectCleared(event){const debuggerModel=(event.data);this._reset(debuggerModel);}
_reset(debuggerModel){const modelData=this._debuggerModelToData.get(debuggerModel);modelData.callFrameLocations.valuesArray().forEach(location=>this._removeLiveLocation(location));modelData.callFrameLocations.clear();}
_resetForTest(target){const debuggerModel=(target.model(SDK.DebuggerModel));const modelData=this._debuggerModelToData.get(debuggerModel);modelData._resourceMapping.resetForTest();}
_registerCallFrameLiveLocation(debuggerModel,location){const locations=this._debuggerModelToData.get(debuggerModel).callFrameLocations;locations.add(location);}
_removeLiveLocation(location){const modelData=this._debuggerModelToData.get(location._script.debuggerModel);if(modelData){modelData._disposeLocation(location);}}
_debuggerResumed(event){const debuggerModel=(event.data);this._reset(debuggerModel);}}
export class ModelData{constructor(debuggerModel,debuggerWorkspaceBinding){this._debuggerModel=debuggerModel;this._debuggerWorkspaceBinding=debuggerWorkspaceBinding;this.callFrameLocations=new Set();const workspace=debuggerWorkspaceBinding._workspace;this._defaultMapping=new Bindings.DefaultScriptMapping(debuggerModel,workspace,debuggerWorkspaceBinding);this._resourceMapping=new Bindings.ResourceScriptMapping(debuggerModel,workspace,debuggerWorkspaceBinding);this._compilerMapping=new Bindings.CompilerScriptMapping(debuggerModel,workspace,debuggerWorkspaceBinding);this._locations=new Platform.Multimap();debuggerModel.setBeforePausedCallback(this._beforePaused.bind(this));}
_createLiveLocation(rawLocation,updateDelegate,locationPool){const script=(rawLocation.script());console.assert(script);const location=new Location(script,rawLocation,this._debuggerWorkspaceBinding,updateDelegate,locationPool);this._locations.set(script,location);location.update();return location;}
_disposeLocation(location){this._locations.delete(location._script,location);}
_updateLocations(script){for(const location of this._locations.get(script)){location.update();}}
_rawLocationToUILocation(rawLocation){let uiLocation=null;uiLocation=uiLocation||this._compilerMapping.rawLocationToUILocation(rawLocation);uiLocation=uiLocation||this._resourceMapping.rawLocationToUILocation(rawLocation);uiLocation=uiLocation||Bindings.resourceMapping.jsLocationToUILocation(rawLocation);uiLocation=uiLocation||this._defaultMapping.rawLocationToUILocation(rawLocation);return(uiLocation);}
_uiLocationToRawLocations(uiSourceCode,lineNumber,columnNumber){let locations=this._compilerMapping.uiLocationToRawLocations(uiSourceCode,lineNumber,columnNumber);locations=locations.length?locations:this._resourceMapping.uiLocationToRawLocations(uiSourceCode,lineNumber,columnNumber);locations=locations.length?locations:Bindings.resourceMapping.uiLocationToJSLocations(uiSourceCode,lineNumber,columnNumber);locations=locations.length?locations:this._defaultMapping.uiLocationToRawLocations(uiSourceCode,lineNumber,columnNumber);return locations;}
_beforePaused(debuggerPausedDetails){return!!this._compilerMapping.mapsToSourceCode(debuggerPausedDetails.callFrames[0].location());}
_dispose(){this._debuggerModel.setBeforePausedCallback(null);this._compilerMapping.dispose();this._resourceMapping.dispose();this._defaultMapping.dispose();}}
export class Location extends Bindings.LiveLocationWithPool{constructor(script,rawLocation,binding,updateDelegate,locationPool){super(updateDelegate,locationPool);this._script=script;this._rawLocation=rawLocation;this._binding=binding;}
uiLocation(){const debuggerModelLocation=this._rawLocation;return this._binding.rawLocationToUILocation(debuggerModelLocation);}
dispose(){super.dispose();this._binding._removeLiveLocation(this);}
isBlackboxed(){const uiLocation=this.uiLocation();return uiLocation?Bindings.blackboxManager.isBlackboxedUISourceCode(uiLocation.uiSourceCode):false;}}
export class StackTraceTopFrameLocation extends Bindings.LiveLocationWithPool{constructor(rawLocations,binding,updateDelegate,locationPool){super(updateDelegate,locationPool);this._updateScheduled=true;this._current=null;this._locations=rawLocations.map(location=>binding.createLiveLocation(location,this._scheduleUpdate.bind(this),locationPool));this._updateLocation();}
uiLocation(){return this._current.uiLocation();}
isBlackboxed(){return this._current.isBlackboxed();}
dispose(){super.dispose();for(const location of this._locations){location.dispose();}
this._locations=null;this._current=null;}
_scheduleUpdate(){if(this._updateScheduled){return;}
this._updateScheduled=true;setImmediate(this._updateLocation.bind(this));}
_updateLocation(){this._updateScheduled=false;if(!this._locations){return;}
this._current=this._locations.find(location=>!location.isBlackboxed())||this._locations[0];this.update();}}
export class DebuggerSourceMapping{rawLocationToUILocation(rawLocation){}
uiLocationToRawLocations(uiSourceCode,lineNumber,columnNumber){}}
self.Bindings=self.Bindings||{};Bindings=Bindings||{};Bindings.DebuggerWorkspaceBinding=DebuggerWorkspaceBinding;Bindings.DebuggerWorkspaceBinding.ModelData=ModelData;Bindings.DebuggerWorkspaceBinding.Location=Location;Bindings.DebuggerWorkspaceBinding.StackTraceTopFrameLocation=StackTraceTopFrameLocation;Bindings.DebuggerSourceMapping=DebuggerSourceMapping;Bindings.debuggerWorkspaceBinding;