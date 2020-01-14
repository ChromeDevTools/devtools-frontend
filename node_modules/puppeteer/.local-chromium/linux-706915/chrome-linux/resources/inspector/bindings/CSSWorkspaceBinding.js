export default class CSSWorkspaceBinding{constructor(targetManager,workspace){this._workspace=workspace;this._modelToInfo=new Map();this._sourceMappings=[];targetManager.observeModels(SDK.CSSModel,this);}
modelAdded(cssModel){this._modelToInfo.set(cssModel,new ModelInfo(cssModel,this._workspace));}
modelRemoved(cssModel){this._modelToInfo.get(cssModel)._dispose();this._modelToInfo.delete(cssModel);}
updateLocations(header){this._modelToInfo.get(header.cssModel())._updateLocations(header);}
createLiveLocation(rawLocation,updateDelegate,locationPool){return this._modelToInfo.get(rawLocation.cssModel())._createLiveLocation(rawLocation,updateDelegate,locationPool);}
propertyUILocation(cssProperty,forName){const style=cssProperty.ownerStyle;if(!style||style.type!==SDK.CSSStyleDeclaration.Type.Regular||!style.styleSheetId){return null;}
const header=style.cssModel().styleSheetHeaderForId(style.styleSheetId);if(!header){return null;}
const range=forName?cssProperty.nameRange():cssProperty.valueRange();if(!range){return null;}
const lineNumber=range.startLine;const columnNumber=range.startColumn;const rawLocation=new SDK.CSSLocation(header,header.lineNumberInSource(lineNumber),header.columnNumberInSource(lineNumber,columnNumber));return this.rawLocationToUILocation(rawLocation);}
rawLocationToUILocation(rawLocation){for(let i=this._sourceMappings.length-1;i>=0;--i){const uiLocation=this._sourceMappings[i].rawLocationToUILocation(rawLocation);if(uiLocation){return uiLocation;}}
return this._modelToInfo.get(rawLocation.cssModel())._rawLocationToUILocation(rawLocation);}
uiLocationToRawLocations(uiLocation){for(let i=this._sourceMappings.length-1;i>=0;--i){const rawLocations=this._sourceMappings[i].uiLocationToRawLocations(uiLocation);if(rawLocations.length){return rawLocations;}}
const rawLocations=[];for(const modelInfo of this._modelToInfo.values()){rawLocations.pushAll(modelInfo._uiLocationToRawLocations(uiLocation));}
return rawLocations;}
addSourceMapping(sourceMapping){this._sourceMappings.push(sourceMapping);}}
export class SourceMapping{rawLocationToUILocation(rawLocation){}
uiLocationToRawLocations(uiLocation){}}
export class ModelInfo{constructor(cssModel,workspace){this._eventListeners=[cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded,this._styleSheetAdded,this),cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved,this._styleSheetRemoved,this)];this._stylesSourceMapping=new Bindings.StylesSourceMapping(cssModel,workspace);const sourceMapManager=cssModel.sourceMapManager();this._sassSourceMapping=new Bindings.SASSSourceMapping(cssModel.target(),sourceMapManager,workspace);this._locations=new Platform.Multimap();this._unboundLocations=new Platform.Multimap();}
_createLiveLocation(rawLocation,updateDelegate,locationPool){const location=new LiveLocation(rawLocation,this,updateDelegate,locationPool);const header=rawLocation.header();if(header){location._header=header;this._locations.set(header,location);location.update();}else{this._unboundLocations.set(rawLocation.url,location);}
return location;}
_disposeLocation(location){if(location._header){this._locations.delete(location._header,location);}else{this._unboundLocations.delete(location._url,location);}}
_updateLocations(header){for(const location of this._locations.get(header)){location.update();}}
_styleSheetAdded(event){const header=(event.data);if(!header.sourceURL){return;}
for(const location of this._unboundLocations.get(header.sourceURL)){location._header=header;this._locations.set(header,location);location.update();}
this._unboundLocations.deleteAll(header.sourceURL);}
_styleSheetRemoved(event){const header=(event.data);for(const location of this._locations.get(header)){location._header=null;this._unboundLocations.set(location._url,location);location.update();}
this._locations.deleteAll(header);}
_rawLocationToUILocation(rawLocation){let uiLocation=null;uiLocation=uiLocation||this._sassSourceMapping.rawLocationToUILocation(rawLocation);uiLocation=uiLocation||this._stylesSourceMapping.rawLocationToUILocation(rawLocation);uiLocation=uiLocation||Bindings.resourceMapping.cssLocationToUILocation(rawLocation);return uiLocation;}
_uiLocationToRawLocations(uiLocation){let rawLocations=this._sassSourceMapping.uiLocationToRawLocations(uiLocation);if(rawLocations.length){return rawLocations;}
rawLocations=this._stylesSourceMapping.uiLocationToRawLocations(uiLocation);if(rawLocations.length){return rawLocations;}
return Bindings.resourceMapping.uiLocationToCSSLocations(uiLocation);}
_dispose(){Common.EventTarget.removeEventListeners(this._eventListeners);this._stylesSourceMapping.dispose();this._sassSourceMapping.dispose();}}
export class LiveLocation extends Bindings.LiveLocationWithPool{constructor(rawLocation,info,updateDelegate,locationPool){super(updateDelegate,locationPool);this._url=rawLocation.url;this._lineNumber=rawLocation.lineNumber;this._columnNumber=rawLocation.columnNumber;this._info=info;this._header=null;}
uiLocation(){if(!this._header){return null;}
const rawLocation=new SDK.CSSLocation(this._header,this._lineNumber,this._columnNumber);return Bindings.cssWorkspaceBinding.rawLocationToUILocation(rawLocation);}
dispose(){super.dispose();this._info._disposeLocation(this);}
isBlackboxed(){return false;}}
self.Bindings=self.Bindings||{};Bindings=Bindings||{};Bindings.CSSWorkspaceBinding=CSSWorkspaceBinding;Bindings.CSSWorkspaceBinding.SourceMapping=SourceMapping;Bindings.SourceMapping=SourceMapping;Bindings.CSSWorkspaceBinding.ModelInfo=ModelInfo;Bindings.CSSWorkspaceBinding.LiveLocation=LiveLocation;Bindings.cssWorkspaceBinding;