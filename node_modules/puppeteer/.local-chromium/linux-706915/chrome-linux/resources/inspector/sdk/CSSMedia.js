export class CSSMediaQuery{constructor(payload){this._active=payload.active;this._expressions=[];for(let j=0;j<payload.expressions.length;++j){this._expressions.push(CSSMediaQueryExpression.parsePayload(payload.expressions[j]));}}
static parsePayload(payload){return new CSSMediaQuery(payload);}
active(){return this._active;}
expressions(){return this._expressions;}}
export class CSSMediaQueryExpression{constructor(payload){this._value=payload.value;this._unit=payload.unit;this._feature=payload.feature;this._valueRange=payload.valueRange?TextUtils.TextRange.fromObject(payload.valueRange):null;this._computedLength=payload.computedLength||null;}
static parsePayload(payload){return new CSSMediaQueryExpression(payload);}
value(){return this._value;}
unit(){return this._unit;}
feature(){return this._feature;}
valueRange(){return this._valueRange;}
computedLength(){return this._computedLength;}}
export default class CSSMedia{constructor(cssModel,payload){this._cssModel=cssModel;this._reinitialize(payload);}
static parsePayload(cssModel,payload){return new CSSMedia(cssModel,payload);}
static parseMediaArrayPayload(cssModel,payload){const result=[];for(let i=0;i<payload.length;++i){result.push(CSSMedia.parsePayload(cssModel,payload[i]));}
return result;}
_reinitialize(payload){this.text=payload.text;this.source=payload.source;this.sourceURL=payload.sourceURL||'';this.range=payload.range?TextUtils.TextRange.fromObject(payload.range):null;this.styleSheetId=payload.styleSheetId;this.mediaList=null;if(payload.mediaList){this.mediaList=[];for(let i=0;i<payload.mediaList.length;++i){this.mediaList.push(CSSMediaQuery.parsePayload(payload.mediaList[i]));}}}
rebase(edit){if(this.styleSheetId!==edit.styleSheetId||!this.range){return;}
if(edit.oldRange.equal(this.range)){this._reinitialize((edit.payload));}else{this.range=this.range.rebaseAfterTextEdit(edit.oldRange,edit.newRange);}}
equal(other){if(!this.styleSheetId||!this.range||!other.range){return false;}
return this.styleSheetId===other.styleSheetId&&this.range.equal(other.range);}
active(){if(!this.mediaList){return true;}
for(let i=0;i<this.mediaList.length;++i){if(this.mediaList[i].active()){return true;}}
return false;}
lineNumberInSource(){if(!this.range){return undefined;}
const header=this.header();if(!header){return undefined;}
return header.lineNumberInSource(this.range.startLine);}
columnNumberInSource(){if(!this.range){return undefined;}
const header=this.header();if(!header){return undefined;}
return header.columnNumberInSource(this.range.startLine,this.range.startColumn);}
header(){return this.styleSheetId?this._cssModel.styleSheetHeaderForId(this.styleSheetId):null;}
rawLocation(){const header=this.header();if(!header||this.lineNumberInSource()===undefined){return null;}
const lineNumber=Number(this.lineNumberInSource());return new SDK.CSSLocation(header,lineNumber,this.columnNumberInSource());}}
export const Source={LINKED_SHEET:'linkedSheet',INLINE_SHEET:'inlineSheet',MEDIA_RULE:'mediaRule',IMPORT_RULE:'importRule'};self.SDK=self.SDK||{};SDK=SDK||{};SDK.CSSMediaQuery=CSSMediaQuery;SDK.CSSMediaQueryExpression=CSSMediaQueryExpression;SDK.CSSMedia=CSSMedia;SDK.CSSMedia.Source=Source;