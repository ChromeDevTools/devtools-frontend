export default class BlackboxManager{constructor(debuggerWorkspaceBinding){this._debuggerWorkspaceBinding=debuggerWorkspaceBinding;SDK.targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.GlobalObjectCleared,this._clearCacheIfNeeded.bind(this),this);Common.moduleSetting('skipStackFramesPattern').addChangeListener(this._patternChanged.bind(this));Common.moduleSetting('skipContentScripts').addChangeListener(this._patternChanged.bind(this));this._listeners=new Set();this._isBlackboxedURLCache=new Map();SDK.targetManager.observeModels(SDK.DebuggerModel,this);}
addChangeListener(listener){this._listeners.add(listener);}
removeChangeListener(listener){this._listeners.delete(listener);}
modelAdded(debuggerModel){this._setBlackboxPatterns(debuggerModel);const sourceMapManager=debuggerModel.sourceMapManager();sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapAttached,this._sourceMapAttached,this);sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapDetached,this._sourceMapDetached,this);}
modelRemoved(debuggerModel){this._clearCacheIfNeeded();const sourceMapManager=debuggerModel.sourceMapManager();sourceMapManager.removeEventListener(SDK.SourceMapManager.Events.SourceMapAttached,this._sourceMapAttached,this);sourceMapManager.removeEventListener(SDK.SourceMapManager.Events.SourceMapDetached,this._sourceMapDetached,this);}
_clearCacheIfNeeded(){if(this._isBlackboxedURLCache.size>1024){this._isBlackboxedURLCache.clear();}}
_setBlackboxPatterns(debuggerModel){const regexPatterns=Common.moduleSetting('skipStackFramesPattern').getAsArray();const patterns=([]);for(const item of regexPatterns){if(!item.disabled&&item.pattern){patterns.push(item.pattern);}}
return debuggerModel.setBlackboxPatterns(patterns);}
isBlackboxedUISourceCode(uiSourceCode){const projectType=uiSourceCode.project().type();const isContentScript=projectType===Workspace.projectTypes.ContentScripts;if(isContentScript&&Common.moduleSetting('skipContentScripts').get()){return true;}
const url=this._uiSourceCodeURL(uiSourceCode);return url?this.isBlackboxedURL(url):false;}
isBlackboxedURL(url,isContentScript){if(this._isBlackboxedURLCache.has(url)){return!!this._isBlackboxedURLCache.get(url);}
if(isContentScript&&Common.moduleSetting('skipContentScripts').get()){return true;}
const regex=Common.moduleSetting('skipStackFramesPattern').asRegExp();const isBlackboxed=(regex&&regex.test(url))||false;this._isBlackboxedURLCache.set(url,isBlackboxed);return isBlackboxed;}
_sourceMapAttached(event){const script=(event.data.client);const sourceMap=(event.data.sourceMap);this._updateScriptRanges(script,sourceMap);}
_sourceMapDetached(event){const script=(event.data.client);this._updateScriptRanges(script,null);}
async _updateScriptRanges(script,sourceMap){let hasBlackboxedMappings=false;if(!Bindings.blackboxManager.isBlackboxedURL(script.sourceURL,script.isContentScript())){hasBlackboxedMappings=sourceMap?sourceMap.sourceURLs().some(url=>this.isBlackboxedURL(url)):false;}
if(!hasBlackboxedMappings){if(script[_blackboxedRanges]&&await script.setBlackboxedRanges([])){delete script[_blackboxedRanges];}
this._debuggerWorkspaceBinding.updateLocations(script);return;}
const mappings=(sourceMap).mappings();const newRanges=[];let currentBlackboxed=false;if(mappings[0].lineNumber!==0||mappings[0].columnNumber!==0){newRanges.push({lineNumber:0,columnNumber:0});currentBlackboxed=true;}
for(const mapping of mappings){if(mapping.sourceURL&&currentBlackboxed!==this.isBlackboxedURL(mapping.sourceURL)){newRanges.push({lineNumber:mapping.lineNumber,columnNumber:mapping.columnNumber});currentBlackboxed=!currentBlackboxed;}}
const oldRanges=script[_blackboxedRanges]||[];if(!isEqual(oldRanges,newRanges)&&await script.setBlackboxedRanges(newRanges)){script[_blackboxedRanges]=newRanges;}
this._debuggerWorkspaceBinding.updateLocations(script);function isEqual(rangesA,rangesB){if(rangesA.length!==rangesB.length){return false;}
for(let i=0;i<rangesA.length;++i){if(rangesA[i].lineNumber!==rangesB[i].lineNumber||rangesA[i].columnNumber!==rangesB[i].columnNumber){return false;}}
return true;}}
_uiSourceCodeURL(uiSourceCode){return uiSourceCode.project().type()===Workspace.projectTypes.Debugger?null:uiSourceCode.url();}
canBlackboxUISourceCode(uiSourceCode){const url=this._uiSourceCodeURL(uiSourceCode);return url?!!this._urlToRegExpString(url):false;}
blackboxUISourceCode(uiSourceCode){const url=this._uiSourceCodeURL(uiSourceCode);if(url){this._blackboxURL(url);}}
unblackboxUISourceCode(uiSourceCode){const url=this._uiSourceCodeURL(uiSourceCode);if(url){this._unblackboxURL(url);}}
blackboxContentScripts(){Common.moduleSetting('skipContentScripts').set(true);}
unblackboxContentScripts(){Common.moduleSetting('skipContentScripts').set(false);}
_blackboxURL(url){const regexPatterns=Common.moduleSetting('skipStackFramesPattern').getAsArray();const regexValue=this._urlToRegExpString(url);if(!regexValue){return;}
let found=false;for(let i=0;i<regexPatterns.length;++i){const item=regexPatterns[i];if(item.pattern===regexValue){item.disabled=false;found=true;break;}}
if(!found){regexPatterns.push({pattern:regexValue});}
Common.moduleSetting('skipStackFramesPattern').setAsArray(regexPatterns);}
_unblackboxURL(url){let regexPatterns=Common.moduleSetting('skipStackFramesPattern').getAsArray();const regexValue=Bindings.blackboxManager._urlToRegExpString(url);if(!regexValue){return;}
regexPatterns=regexPatterns.filter(function(item){return item.pattern!==regexValue;});for(let i=0;i<regexPatterns.length;++i){const item=regexPatterns[i];if(item.disabled){continue;}
try{const regex=new RegExp(item.pattern);if(regex.test(url)){item.disabled=true;}}catch(e){}}
Common.moduleSetting('skipStackFramesPattern').setAsArray(regexPatterns);}
async _patternChanged(){this._isBlackboxedURLCache.clear();const promises=[];for(const debuggerModel of SDK.targetManager.models(SDK.DebuggerModel)){promises.push(this._setBlackboxPatterns(debuggerModel));const sourceMapManager=debuggerModel.sourceMapManager();for(const script of debuggerModel.scripts()){promises.push(this._updateScriptRanges(script,sourceMapManager.sourceMapForClient(script)));}}
await Promise.all(promises);const listeners=Array.from(this._listeners);for(const listener of listeners){listener();}
this._patternChangeFinishedForTests();}
_patternChangeFinishedForTests(){}
_urlToRegExpString(url){const parsedURL=new Common.ParsedURL(url);if(parsedURL.isAboutBlank()||parsedURL.isDataURL()){return'';}
if(!parsedURL.isValid){return'^'+url.escapeForRegExp()+'$';}
let name=parsedURL.lastPathComponent;if(name){name='/'+name;}else if(parsedURL.folderPathComponents){name=parsedURL.folderPathComponents+'/';}
if(!name){name=parsedURL.host;}
if(!name){return'';}
const scheme=parsedURL.scheme;let prefix='';if(scheme&&scheme!=='http'&&scheme!=='https'){prefix='^'+scheme+'://';if(scheme==='chrome-extension'){prefix+=parsedURL.host+'\\b';}
prefix+='.*';}
return prefix+name.escapeForRegExp()+(url.endsWith(name)?'$':'\\b');}}
export const _blackboxedRanges=Symbol('blackboxedRanged');self.Bindings=self.Bindings||{};Bindings=Bindings||{};Bindings.BlackboxManager=BlackboxManager;Bindings.BlackboxManager._blackboxedRanges=_blackboxedRanges;Bindings.blackboxManager;