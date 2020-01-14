export default class CSSRule{constructor(cssModel,payload){this._cssModel=cssModel;this.styleSheetId=payload.styleSheetId;if(this.styleSheetId){const styleSheetHeader=cssModel.styleSheetHeaderForId(this.styleSheetId);this.sourceURL=styleSheetHeader.sourceURL;}
this.origin=payload.origin;this.style=new SDK.CSSStyleDeclaration(this._cssModel,this,payload.style,SDK.CSSStyleDeclaration.Type.Regular);}
rebase(edit){if(this.styleSheetId!==edit.styleSheetId){return;}
this.style.rebase(edit);}
resourceURL(){if(!this.styleSheetId){return'';}
const styleSheetHeader=this._cssModel.styleSheetHeaderForId(this.styleSheetId);return styleSheetHeader.resourceURL();}
isUserAgent(){return this.origin===Protocol.CSS.StyleSheetOrigin.UserAgent;}
isInjected(){return this.origin===Protocol.CSS.StyleSheetOrigin.Injected;}
isViaInspector(){return this.origin===Protocol.CSS.StyleSheetOrigin.Inspector;}
isRegular(){return this.origin===Protocol.CSS.StyleSheetOrigin.Regular;}
cssModel(){return this._cssModel;}}
export class CSSValue{constructor(payload){this.text=payload.text;if(payload.range){this.range=TextUtils.TextRange.fromObject(payload.range);}}
rebase(edit){if(!this.range){return;}
this.range=this.range.rebaseAfterTextEdit(edit.oldRange,edit.newRange);}}
export class CSSStyleRule extends CSSRule{constructor(cssModel,payload,wasUsed){super(cssModel,payload);this._reinitializeSelectors(payload.selectorList);this.media=payload.media?SDK.CSSMedia.parseMediaArrayPayload(cssModel,payload.media):[];this.wasUsed=wasUsed||false;}
static createDummyRule(cssModel,selectorText){const dummyPayload={selectorList:{selectors:[{text:selectorText}],},style:{styleSheetId:'0',range:new TextUtils.TextRange(0,0,0,0),shorthandEntries:[],cssProperties:[]}};return new CSSStyleRule(cssModel,(dummyPayload));}
_reinitializeSelectors(selectorList){this.selectors=[];for(let i=0;i<selectorList.selectors.length;++i){this.selectors.push(new CSSValue(selectorList.selectors[i]));}}
setSelectorText(newSelector){const styleSheetId=this.styleSheetId;if(!styleSheetId){throw'No rule stylesheet id';}
const range=this.selectorRange();if(!range){throw'Rule selector is not editable';}
return this._cssModel.setSelectorText(styleSheetId,range,newSelector);}
selectorText(){return this.selectors.select('text').join(', ');}
selectorRange(){const firstRange=this.selectors[0].range;if(!firstRange){return null;}
const lastRange=this.selectors.peekLast().range;return new TextUtils.TextRange(firstRange.startLine,firstRange.startColumn,lastRange.endLine,lastRange.endColumn);}
lineNumberInSource(selectorIndex){const selector=this.selectors[selectorIndex];if(!selector||!selector.range||!this.styleSheetId){return 0;}
const styleSheetHeader=this._cssModel.styleSheetHeaderForId(this.styleSheetId);return styleSheetHeader.lineNumberInSource(selector.range.startLine);}
columnNumberInSource(selectorIndex){const selector=this.selectors[selectorIndex];if(!selector||!selector.range||!this.styleSheetId){return undefined;}
const styleSheetHeader=this._cssModel.styleSheetHeaderForId(this.styleSheetId);console.assert(styleSheetHeader);return styleSheetHeader.columnNumberInSource(selector.range.startLine,selector.range.startColumn);}
rebase(edit){if(this.styleSheetId!==edit.styleSheetId){return;}
if(this.selectorRange().equal(edit.oldRange)){this._reinitializeSelectors((edit.payload));}else{for(let i=0;i<this.selectors.length;++i){this.selectors[i].rebase(edit);}}
for(const media of this.media){media.rebase(edit);}
super.rebase(edit);}}
export class CSSKeyframesRule{constructor(cssModel,payload){this._cssModel=cssModel;this._animationName=new CSSValue(payload.animationName);this._keyframes=payload.keyframes.map(keyframeRule=>new CSSKeyframeRule(cssModel,keyframeRule));}
name(){return this._animationName;}
keyframes(){return this._keyframes;}}
export class CSSKeyframeRule extends CSSRule{constructor(cssModel,payload){super(cssModel,payload);this._reinitializeKey(payload.keyText);}
key(){return this._keyText;}
_reinitializeKey(payload){this._keyText=new CSSValue(payload);}
rebase(edit){if(this.styleSheetId!==edit.styleSheetId||!this._keyText.range){return;}
if(edit.oldRange.equal(this._keyText.range)){this._reinitializeKey((edit.payload));}else{this._keyText.rebase(edit);}
super.rebase(edit);}
setKeyText(newKeyText){const styleSheetId=this.styleSheetId;if(!styleSheetId){throw'No rule stylesheet id';}
const range=this._keyText.range;if(!range){throw'Keyframe key is not editable';}
return this._cssModel.setKeyframeKey(styleSheetId,range,newKeyText);}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.CSSRule=CSSRule;SDK.CSSValue=CSSValue;SDK.CSSStyleRule=CSSStyleRule;SDK.CSSKeyframesRule=CSSKeyframesRule;SDK.CSSKeyframeRule=CSSKeyframeRule;