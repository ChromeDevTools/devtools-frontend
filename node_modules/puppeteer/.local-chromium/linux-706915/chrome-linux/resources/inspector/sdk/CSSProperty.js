export default class CSSProperty{constructor(ownerStyle,index,name,value,important,disabled,parsedOk,implicit,text,range){this.ownerStyle=ownerStyle;this.index=index;this.name=name;this.value=value;this.important=important;this.disabled=disabled;this.parsedOk=parsedOk;this.implicit=implicit;this.text=text;this.range=range?TextUtils.TextRange.fromObject(range):null;this._active=true;this._nameRange=null;this._valueRange=null;}
static parsePayload(ownerStyle,index,payload){const result=new CSSProperty(ownerStyle,index,payload.name,payload.value,payload.important||false,payload.disabled||false,('parsedOk'in payload)?!!payload.parsedOk:true,!!payload.implicit,payload.text,payload.range);return result;}
_ensureRanges(){if(this._nameRange&&this._valueRange){return;}
const range=this.range;const text=this.text?new TextUtils.Text(this.text):null;if(!range||!text){return;}
const nameIndex=text.value().indexOf(this.name);const valueIndex=text.value().lastIndexOf(this.value);if(nameIndex===-1||valueIndex===-1||nameIndex>valueIndex){return;}
const nameSourceRange=new TextUtils.SourceRange(nameIndex,this.name.length);const valueSourceRange=new TextUtils.SourceRange(valueIndex,this.value.length);this._nameRange=rebase(text.toTextRange(nameSourceRange),range.startLine,range.startColumn);this._valueRange=rebase(text.toTextRange(valueSourceRange),range.startLine,range.startColumn);function rebase(oneLineRange,lineOffset,columnOffset){if(oneLineRange.startLine===0){oneLineRange.startColumn+=columnOffset;oneLineRange.endColumn+=columnOffset;}
oneLineRange.startLine+=lineOffset;oneLineRange.endLine+=lineOffset;return oneLineRange;}}
nameRange(){this._ensureRanges();return this._nameRange;}
valueRange(){this._ensureRanges();return this._valueRange;}
rebase(edit){if(this.ownerStyle.styleSheetId!==edit.styleSheetId){return;}
if(this.range){this.range=this.range.rebaseAfterTextEdit(edit.oldRange,edit.newRange);}}
setActive(active){this._active=active;}
get propertyText(){if(this.text!==undefined){return this.text;}
if(this.name===''){return'';}
return this.name+': '+this.value+(this.important?' !important':'')+';';}
activeInStyle(){return this._active;}
async setText(propertyText,majorChange,overwrite){if(!this.ownerStyle){return Promise.reject(new Error('No ownerStyle for property'));}
if(!this.ownerStyle.styleSheetId){return Promise.reject(new Error('No owner style id'));}
if(!this.range||!this.ownerStyle.range){return Promise.reject(new Error('Style not editable'));}
if(majorChange){Host.userMetrics.actionTaken(Host.UserMetrics.Action.StyleRuleEdited);}
if(overwrite&&propertyText===this.propertyText){this.ownerStyle.cssModel().domModel().markUndoableState(!majorChange);return Promise.resolve(true);}
const range=this.range.relativeTo(this.ownerStyle.range.startLine,this.ownerStyle.range.startColumn);const indentation=this.ownerStyle.cssText?this._detectIndentation(this.ownerStyle.cssText):Common.moduleSetting('textEditorIndent').get();const endIndentation=this.ownerStyle.cssText?indentation.substring(0,this.ownerStyle.range.endColumn):'';const text=new TextUtils.Text(this.ownerStyle.cssText||'');const newStyleText=text.replaceRange(range,String.sprintf(';%s;',propertyText));const tokenizerFactory=await self.runtime.extension(TextUtils.TokenizerFactory).instance();const styleText=CSSProperty._formatStyle(newStyleText,indentation,endIndentation,tokenizerFactory);return this.ownerStyle.setText(styleText,majorChange);}
static _formatStyle(styleText,indentation,endIndentation,tokenizerFactory){const doubleIndent=indentation.substring(endIndentation.length)+indentation;if(indentation){indentation='\n'+indentation;}
let result='';let propertyName='';let propertyText;let insideProperty=false;let needsSemi=false;const tokenize=tokenizerFactory.createTokenizer('text/css');tokenize('*{'+styleText+'}',processToken);if(insideProperty){result+=propertyText;}
result=result.substring(2,result.length-1).trimRight();return result+(indentation?'\n'+endIndentation:'');function processToken(token,tokenType,column,newColumn){if(!insideProperty){const disabledProperty=tokenType&&tokenType.includes('css-comment')&&isDisabledProperty(token);const isPropertyStart=tokenType&&(tokenType.includes('css-string')||tokenType.includes('css-meta')||tokenType.includes('css-property')||tokenType.includes('css-variable-2'));if(disabledProperty){result=result.trimRight()+indentation+token;}else if(isPropertyStart){insideProperty=true;propertyText=token;}else if(token!==';'||needsSemi){result+=token;if(token.trim()&&!(tokenType&&tokenType.includes('css-comment'))){needsSemi=token!==';';}}
if(token==='{'&&!tokenType){needsSemi=false;}
return;}
if(token==='}'||token===';'){result=result.trimRight()+indentation+propertyText.trim()+';';needsSemi=false;insideProperty=false;propertyName='';if(token==='}'){result+='}';}}else{if(SDK.cssMetadata().isGridAreaDefiningProperty(propertyName)){const rowResult=SDK.CSSMetadata.GridAreaRowRegex.exec(token);if(rowResult&&rowResult.index===0&&!propertyText.trimRight().endsWith(']')){propertyText=propertyText.trimRight()+'\n'+doubleIndent;}}
if(!propertyName&&token===':'){propertyName=propertyText;}
propertyText+=token;}}
function isDisabledProperty(text){const colon=text.indexOf(':');if(colon===-1){return false;}
const propertyName=text.substring(2,colon).trim();return SDK.cssMetadata().isCSSPropertyName(propertyName);}}
_detectIndentation(text){const lines=text.split('\n');if(lines.length<2){return'';}
return TextUtils.TextUtils.lineIndent(lines[1]);}
setValue(newValue,majorChange,overwrite,userCallback){const text=this.name+': '+newValue+(this.important?' !important':'')+';';this.setText(text,majorChange,overwrite).then(userCallback);}
setDisabled(disabled){if(!this.ownerStyle){return Promise.resolve(false);}
if(disabled===this.disabled){return Promise.resolve(true);}
const propertyText=this.text.trim();const text=disabled?'/* '+propertyText+' */':this.text.substring(2,propertyText.length-2).trim();return this.setText(text,true,true);}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.CSSProperty=CSSProperty;