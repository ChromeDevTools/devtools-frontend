export default class CSSModel extends SDK.SDKModel{constructor(target){super(target);this._domModel=(target.model(SDK.DOMModel));this._sourceMapManager=new SDK.SourceMapManager(target);this._agent=target.cssAgent();this._styleLoader=new ComputedStyleLoader(this);this._resourceTreeModel=target.model(SDK.ResourceTreeModel);if(this._resourceTreeModel){this._resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated,this._resetStyleSheets,this);}
target.registerCSSDispatcher(new CSSDispatcher(this));if(!target.suspended()){this._enable();}
this._styleSheetIdToHeader=new Map();this._styleSheetIdsForURL=new Map();this._originalStyleSheetText=new Map();this._isRuleUsageTrackingEnabled=false;this._sourceMapManager.setEnabled(Common.moduleSetting('cssSourceMapsEnabled').get());Common.moduleSetting('cssSourceMapsEnabled').addChangeListener(event=>this._sourceMapManager.setEnabled((event.data)));}
headersForSourceURL(sourceURL){const headers=[];for(const headerId of this.styleSheetIdsForURL(sourceURL)){const header=this.styleSheetHeaderForId(headerId);if(header){headers.push(header);}}
return headers;}
createRawLocationsByURL(sourceURL,lineNumber,columnNumber){const headers=this.headersForSourceURL(sourceURL);headers.sort(stylesheetComparator);const compareToArgLocation=(_,header)=>lineNumber-header.startLine||columnNumber-header.startColumn;const endIndex=headers.upperBound(undefined,compareToArgLocation);if(!endIndex){return[];}
const locations=[];const last=headers[endIndex-1];for(let index=endIndex-1;index>=0&&headers[index].startLine===last.startLine&&headers[index].startColumn===last.startColumn;--index){if(headers[index].containsLocation(lineNumber,columnNumber)){locations.push(new SDK.CSSLocation(headers[index],lineNumber,columnNumber));}}
return locations;function stylesheetComparator(a,b){return a.startLine-b.startLine||a.startColumn-b.startColumn||a.id.localeCompare(b.id);}}
sourceMapManager(){return this._sourceMapManager;}
static trimSourceURL(text){let sourceURLIndex=text.lastIndexOf('/*# sourceURL=');if(sourceURLIndex===-1){sourceURLIndex=text.lastIndexOf('/*@ sourceURL=');if(sourceURLIndex===-1){return text;}}
const sourceURLLineIndex=text.lastIndexOf('\n',sourceURLIndex);if(sourceURLLineIndex===-1){return text;}
const sourceURLLine=text.substr(sourceURLLineIndex+1).split('\n',1)[0];const sourceURLRegex=/[\040\t]*\/\*[#@] sourceURL=[\040\t]*([^\s]*)[\040\t]*\*\/[\040\t]*$/;if(sourceURLLine.search(sourceURLRegex)===-1){return text;}
return text.substr(0,sourceURLLineIndex)+text.substr(sourceURLLineIndex+sourceURLLine.length+1);}
domModel(){return this._domModel;}
async setStyleText(styleSheetId,range,text,majorChange){try{await this._ensureOriginalStyleSheetText(styleSheetId);const stylePayloads=await this._agent.setStyleTexts([{styleSheetId:styleSheetId,range:range.serializeToObject(),text:text}]);if(!stylePayloads||stylePayloads.length!==1){return false;}
this._domModel.markUndoableState(!majorChange);const edit=new Edit(styleSheetId,range,text,stylePayloads[0]);this._fireStyleSheetChanged(styleSheetId,edit);return true;}catch(e){return false;}}
async setSelectorText(styleSheetId,range,text){Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);try{await this._ensureOriginalStyleSheetText(styleSheetId);const selectorPayload=await this._agent.setRuleSelector(styleSheetId,range,text);if(!selectorPayload){return false;}
this._domModel.markUndoableState();const edit=new Edit(styleSheetId,range,text,selectorPayload);this._fireStyleSheetChanged(styleSheetId,edit);return true;}catch(e){return false;}}
async setKeyframeKey(styleSheetId,range,text){Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);try{await this._ensureOriginalStyleSheetText(styleSheetId);const payload=await this._agent.setKeyframeKey(styleSheetId,range,text);if(!payload){return false;}
this._domModel.markUndoableState();const edit=new Edit(styleSheetId,range,text,payload);this._fireStyleSheetChanged(styleSheetId,edit);return true;}catch(e){return false;}}
startCoverage(){this._isRuleUsageTrackingEnabled=true;return this._agent.startRuleUsageTracking();}
takeCoverageDelta(){return this._agent.takeCoverageDelta().then(ruleUsage=>ruleUsage||[]);}
stopCoverage(){this._isRuleUsageTrackingEnabled=false;return this._agent.stopRuleUsageTracking();}
async mediaQueriesPromise(){const payload=await this._agent.getMediaQueries();return payload?SDK.CSSMedia.parseMediaArrayPayload(this,payload):[];}
isEnabled(){return this._isEnabled;}
async _enable(){await this._agent.enable();this._isEnabled=true;if(this._isRuleUsageTrackingEnabled){await this.startCoverage();}
this.dispatchEventToListeners(Events.ModelWasEnabled);}
async matchedStylesPromise(nodeId){const response=await this._agent.invoke_getMatchedStylesForNode({nodeId});if(response[Protocol.Error]){return null;}
const node=this._domModel.nodeForId(nodeId);if(!node){return null;}
return new SDK.CSSMatchedStyles(this,(node),response.inlineStyle||null,response.attributesStyle||null,response.matchedCSSRules||[],response.pseudoElements||[],response.inherited||[],response.cssKeyframesRules||[]);}
classNamesPromise(styleSheetId){return this._agent.collectClassNames(styleSheetId).then(classNames=>classNames||[]);}
computedStylePromise(nodeId){return this._styleLoader.computedStylePromise(nodeId);}
async backgroundColorsPromise(nodeId){const response=this._agent.invoke_getBackgroundColors({nodeId});if(response[Protocol.Error]){return null;}
return response;}
platformFontsPromise(nodeId){return this._agent.getPlatformFontsForNode(nodeId);}
allStyleSheets(){const values=this._styleSheetIdToHeader.valuesArray();function styleSheetComparator(a,b){if(a.sourceURL<b.sourceURL){return-1;}else if(a.sourceURL>b.sourceURL){return 1;}
return a.startLine-b.startLine||a.startColumn-b.startColumn;}
values.sort(styleSheetComparator);return values;}
async inlineStylesPromise(nodeId){const response=await this._agent.invoke_getInlineStylesForNode({nodeId});if(response[Protocol.Error]||!response.inlineStyle){return null;}
const inlineStyle=new SDK.CSSStyleDeclaration(this,null,response.inlineStyle,SDK.CSSStyleDeclaration.Type.Inline);const attributesStyle=response.attributesStyle?new SDK.CSSStyleDeclaration(this,null,response.attributesStyle,SDK.CSSStyleDeclaration.Type.Attributes):null;return new InlineStyleResult(inlineStyle,attributesStyle);}
forcePseudoState(node,pseudoClass,enable){const pseudoClasses=node.marker(PseudoStateMarker)||[];if(enable){if(pseudoClasses.indexOf(pseudoClass)>=0){return false;}
pseudoClasses.push(pseudoClass);node.setMarker(PseudoStateMarker,pseudoClasses);}else{if(pseudoClasses.indexOf(pseudoClass)<0){return false;}
pseudoClasses.remove(pseudoClass);if(pseudoClasses.length){node.setMarker(PseudoStateMarker,pseudoClasses);}else{node.setMarker(PseudoStateMarker,null);}}
this._agent.forcePseudoState(node.id,pseudoClasses);this.dispatchEventToListeners(Events.PseudoStateForced,{node:node,pseudoClass:pseudoClass,enable:enable});return true;}
pseudoState(node){return node.marker(PseudoStateMarker)||[];}
async setMediaText(styleSheetId,range,newMediaText){Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);try{await this._ensureOriginalStyleSheetText(styleSheetId);const mediaPayload=await this._agent.setMediaText(styleSheetId,range,newMediaText);if(!mediaPayload){return false;}
this._domModel.markUndoableState();const edit=new Edit(styleSheetId,range,newMediaText,mediaPayload);this._fireStyleSheetChanged(styleSheetId,edit);return true;}catch(e){return false;}}
async addRule(styleSheetId,ruleText,ruleLocation){try{await this._ensureOriginalStyleSheetText(styleSheetId);const rulePayload=await this._agent.addRule(styleSheetId,ruleText,ruleLocation);if(!rulePayload){return null;}
this._domModel.markUndoableState();const edit=new Edit(styleSheetId,ruleLocation,ruleText,rulePayload);this._fireStyleSheetChanged(styleSheetId,edit);return new SDK.CSSStyleRule(this,rulePayload);}catch(e){return null;}}
async requestViaInspectorStylesheet(node){const frameId=node.frameId()||(this._resourceTreeModel?this._resourceTreeModel.mainFrame.id:'');const headers=this._styleSheetIdToHeader.valuesArray();const styleSheetHeader=headers.find(header=>header.frameId===frameId&&header.isViaInspector());if(styleSheetHeader){return styleSheetHeader;}
try{const styleSheetId=await this._agent.createStyleSheet(frameId);return styleSheetId&&this._styleSheetIdToHeader.get(styleSheetId)||null;}catch(e){return null;}}
mediaQueryResultChanged(){this.dispatchEventToListeners(Events.MediaQueryResultChanged);}
fontsUpdated(){this.dispatchEventToListeners(Events.FontsUpdated);}
styleSheetHeaderForId(id){return this._styleSheetIdToHeader.get(id)||null;}
styleSheetHeaders(){return this._styleSheetIdToHeader.valuesArray();}
_fireStyleSheetChanged(styleSheetId,edit){this.dispatchEventToListeners(Events.StyleSheetChanged,{styleSheetId:styleSheetId,edit:edit});}
_ensureOriginalStyleSheetText(styleSheetId){const header=this.styleSheetHeaderForId(styleSheetId);if(!header){return Promise.resolve((null));}
let promise=this._originalStyleSheetText.get(header);if(!promise){promise=this.getStyleSheetText(header.id);this._originalStyleSheetText.set(header,promise);this._originalContentRequestedForTest(header);}
return promise;}
_originalContentRequestedForTest(header){}
originalStyleSheetText(header){return this._ensureOriginalStyleSheetText(header.id);}
_styleSheetAdded(header){console.assert(!this._styleSheetIdToHeader.get(header.styleSheetId));const styleSheetHeader=new SDK.CSSStyleSheetHeader(this,header);this._styleSheetIdToHeader.set(header.styleSheetId,styleSheetHeader);const url=styleSheetHeader.resourceURL();if(!this._styleSheetIdsForURL.get(url)){this._styleSheetIdsForURL.set(url,{});}
const frameIdToStyleSheetIds=this._styleSheetIdsForURL.get(url);let styleSheetIds=frameIdToStyleSheetIds[styleSheetHeader.frameId];if(!styleSheetIds){styleSheetIds=[];frameIdToStyleSheetIds[styleSheetHeader.frameId]=styleSheetIds;}
styleSheetIds.push(styleSheetHeader.id);this._sourceMapManager.attachSourceMap(styleSheetHeader,styleSheetHeader.sourceURL,styleSheetHeader.sourceMapURL);this.dispatchEventToListeners(Events.StyleSheetAdded,styleSheetHeader);}
_styleSheetRemoved(id){const header=this._styleSheetIdToHeader.get(id);console.assert(header);if(!header){return;}
this._styleSheetIdToHeader.remove(id);const url=header.resourceURL();const frameIdToStyleSheetIds=(this._styleSheetIdsForURL.get(url));console.assert(frameIdToStyleSheetIds,'No frameId to styleSheetId map is available for given style sheet URL.');frameIdToStyleSheetIds[header.frameId].remove(id);if(!frameIdToStyleSheetIds[header.frameId].length){delete frameIdToStyleSheetIds[header.frameId];if(!Object.keys(frameIdToStyleSheetIds).length){this._styleSheetIdsForURL.remove(url);}}
this._originalStyleSheetText.remove(header);this._sourceMapManager.detachSourceMap(header);this.dispatchEventToListeners(Events.StyleSheetRemoved,header);}
styleSheetIdsForURL(url){const frameIdToStyleSheetIds=this._styleSheetIdsForURL.get(url);if(!frameIdToStyleSheetIds){return[];}
let result=[];for(const frameId in frameIdToStyleSheetIds){result=result.concat(frameIdToStyleSheetIds[frameId]);}
return result;}
async setStyleSheetText(styleSheetId,newText,majorChange){const header=(this._styleSheetIdToHeader.get(styleSheetId));console.assert(header);newText=CSSModel.trimSourceURL(newText);if(header.hasSourceURL){newText+='\n/*# sourceURL='+header.sourceURL+' */';}
await this._ensureOriginalStyleSheetText(styleSheetId);const response=await this._agent.invoke_setStyleSheetText({styleSheetId:header.id,text:newText});const sourceMapURL=response.sourceMapURL;this._sourceMapManager.detachSourceMap(header);header.setSourceMapURL(sourceMapURL);this._sourceMapManager.attachSourceMap(header,header.sourceURL,header.sourceMapURL);if(sourceMapURL===null){return'Error in CSS.setStyleSheetText';}
this._domModel.markUndoableState(!majorChange);this._fireStyleSheetChanged(styleSheetId);return null;}
async getStyleSheetText(styleSheetId){try{const text=await this._agent.getStyleSheetText(styleSheetId);return text&&CSSModel.trimSourceURL(text);}catch(e){return null;}}
_resetStyleSheets(){const headers=this._styleSheetIdToHeader.valuesArray();this._styleSheetIdsForURL.clear();this._styleSheetIdToHeader.clear();for(let i=0;i<headers.length;++i){this._sourceMapManager.detachSourceMap(headers[i]);this.dispatchEventToListeners(Events.StyleSheetRemoved,headers[i]);}}
suspendModel(){this._isEnabled=false;return this._agent.disable().then(this._resetStyleSheets.bind(this));}
async resumeModel(){return this._enable();}
setEffectivePropertyValueForNode(nodeId,name,value){this._agent.setEffectivePropertyValueForNode(nodeId,name,value);}
cachedMatchedCascadeForNode(node){if(this._cachedMatchedCascadeNode!==node){this.discardCachedMatchedCascade();}
this._cachedMatchedCascadeNode=node;if(!this._cachedMatchedCascadePromise){this._cachedMatchedCascadePromise=this.matchedStylesPromise(node.id);}
return this._cachedMatchedCascadePromise;}
discardCachedMatchedCascade(){delete this._cachedMatchedCascadeNode;delete this._cachedMatchedCascadePromise;}
dispose(){super.dispose();this._sourceMapManager.dispose();}}
export const Events={FontsUpdated:Symbol('FontsUpdated'),MediaQueryResultChanged:Symbol('MediaQueryResultChanged'),ModelWasEnabled:Symbol('ModelWasEnabled'),PseudoStateForced:Symbol('PseudoStateForced'),StyleSheetAdded:Symbol('StyleSheetAdded'),StyleSheetChanged:Symbol('StyleSheetChanged'),StyleSheetRemoved:Symbol('StyleSheetRemoved')};export const MediaTypes=['all','braille','embossed','handheld','print','projection','screen','speech','tty','tv'];export const PseudoStateMarker='pseudo-state-marker';export class Edit{constructor(styleSheetId,oldRange,newText,payload){this.styleSheetId=styleSheetId;this.oldRange=oldRange;this.newRange=TextUtils.TextRange.fromEdit(oldRange,newText);this.newText=newText;this.payload=payload;}}
export class CSSLocation{constructor(header,lineNumber,columnNumber){this._cssModel=header.cssModel();this.styleSheetId=header.id;this.url=header.resourceURL();this.lineNumber=lineNumber;this.columnNumber=columnNumber||0;}
cssModel(){return this._cssModel;}
header(){return this._cssModel.styleSheetHeaderForId(this.styleSheetId);}}
export class CSSDispatcher{constructor(cssModel){this._cssModel=cssModel;}
mediaQueryResultChanged(){this._cssModel.mediaQueryResultChanged();}
fontsUpdated(){this._cssModel.fontsUpdated();}
styleSheetChanged(styleSheetId){this._cssModel._fireStyleSheetChanged(styleSheetId);}
styleSheetAdded(header){this._cssModel._styleSheetAdded(header);}
styleSheetRemoved(id){this._cssModel._styleSheetRemoved(id);}}
export class ComputedStyleLoader{constructor(cssModel){this._cssModel=cssModel;this._nodeIdToPromise=new Map();}
computedStylePromise(nodeId){let promise=this._nodeIdToPromise.get(nodeId);if(promise){return promise;}
promise=this._cssModel._agent.getComputedStyleForNode(nodeId).then(parsePayload.bind(this));this._nodeIdToPromise.set(nodeId,promise);return promise;function parsePayload(computedPayload){this._nodeIdToPromise.delete(nodeId);if(!computedPayload||!computedPayload.length){return null;}
const result=new Map();for(const property of computedPayload){result.set(property.name,property.value);}
return result;}}}
export class InlineStyleResult{constructor(inlineStyle,attributesStyle){this.inlineStyle=inlineStyle;this.attributesStyle=attributesStyle;}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.CSSModel=CSSModel;SDK.CSSModel.Events=Events;SDK.CSSModel.MediaTypes=MediaTypes;SDK.CSSModel.PseudoStateMarker=PseudoStateMarker;SDK.CSSModel.Edit=Edit;SDK.CSSModel.ComputedStyleLoader=ComputedStyleLoader;SDK.CSSModel.InlineStyleResult=InlineStyleResult;SDK.CSSLocation=CSSLocation;SDK.CSSDispatcher=CSSDispatcher;SDK.SDKModel.register(SDK.CSSModel,SDK.Target.Capability.DOM,true);SDK.CSSModel.RuleUsage;SDK.CSSModel.ContrastInfo;