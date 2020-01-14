export default class CSSStyleDeclaration{constructor(cssModel,parentRule,payload,type){this._cssModel=cssModel;this.parentRule=parentRule;this._allProperties;this.styleSheetId;this.range;this.cssText;this._shorthandValues;this._shorthandIsImportant;this._activePropertyMap;this._leadingProperties;this._reinitialize(payload);this.type=type;}
rebase(edit){if(this.styleSheetId!==edit.styleSheetId||!this.range){return;}
if(edit.oldRange.equal(this.range)){this._reinitialize((edit.payload));}else{this.range=this.range.rebaseAfterTextEdit(edit.oldRange,edit.newRange);for(let i=0;i<this._allProperties.length;++i){this._allProperties[i].rebase(edit);}}}
_reinitialize(payload){this.styleSheetId=payload.styleSheetId;this.range=payload.range?TextUtils.TextRange.fromObject(payload.range):null;const shorthandEntries=payload.shorthandEntries;this._shorthandValues=new Map();this._shorthandIsImportant=new Set();for(let i=0;i<shorthandEntries.length;++i){this._shorthandValues.set(shorthandEntries[i].name,shorthandEntries[i].value);if(shorthandEntries[i].important){this._shorthandIsImportant.add(shorthandEntries[i].name);}}
this._allProperties=[];if(payload.cssText&&this.range){const cssText=new TextUtils.Text(payload.cssText);let start={line:this.range.startLine,column:this.range.startColumn};for(const cssProperty of payload.cssProperties){const range=cssProperty.range;if(range){parseUnusedText.call(this,cssText,start.line,start.column,range.startLine,range.startColumn);start={line:range.endLine,column:range.endColumn};}
this._allProperties.push(SDK.CSSProperty.parsePayload(this,this._allProperties.length,cssProperty));}
parseUnusedText.call(this,cssText,start.line,start.column,this.range.endLine,this.range.endColumn);}else{for(const cssProperty of payload.cssProperties){this._allProperties.push(SDK.CSSProperty.parsePayload(this,this._allProperties.length,cssProperty));}}
this._generateSyntheticPropertiesIfNeeded();this._computeInactiveProperties();this._activePropertyMap=new Map();for(const property of this._allProperties){if(!property.activeInStyle()){continue;}
this._activePropertyMap.set(property.name,property);}
this.cssText=payload.cssText;this._leadingProperties=null;function parseUnusedText(cssText,startLine,startColumn,endLine,endColumn){const tr=new TextUtils.TextRange(startLine,startColumn,endLine,endColumn);const missingText=cssText.extract(tr.relativeTo(this.range.startLine,this.range.startColumn));const lines=missingText.split('\n');let lineNumber=0;let inComment=false;for(const line of lines){let column=0;for(const property of line.split(';')){const strippedProperty=stripComments(property,inComment);const trimmedProperty=strippedProperty.text.trim();inComment=strippedProperty.inComment;if(trimmedProperty){let name;let value;const colonIndex=trimmedProperty.indexOf(':');if(colonIndex===-1){name=trimmedProperty;value='';}else{name=trimmedProperty.substring(0,colonIndex).trim();value=trimmedProperty.substring(colonIndex+1).trim();}
const range=new TextUtils.TextRange(lineNumber,column,lineNumber,column+property.length);this._allProperties.push(new SDK.CSSProperty(this,this._allProperties.length,name,value,false,false,false,false,property,range.relativeFrom(startLine,startColumn)));}
column+=property.length+1;}
lineNumber++;}}
function stripComments(text,inComment){let output='';for(let i=0;i<text.length;i++){if(!inComment&&text.substring(i,i+2)==='/*'){inComment=true;i++;}else if(inComment&&text.substring(i,i+2)==='*/'){inComment=false;i++;}else if(!inComment){output+=text[i];}}
return{text:output,inComment};}}
_generateSyntheticPropertiesIfNeeded(){if(this.range){return;}
if(!this._shorthandValues.size){return;}
const propertiesSet=new Set();for(const property of this._allProperties){propertiesSet.add(property.name);}
const generatedProperties=[];for(const property of this._allProperties){const shorthands=SDK.cssMetadata().shorthands(property.name)||[];for(const shorthand of shorthands){if(propertiesSet.has(shorthand)){continue;}
const shorthandValue=this._shorthandValues.get(shorthand);if(!shorthandValue){continue;}
const shorthandImportance=!!this._shorthandIsImportant.has(shorthand);const shorthandProperty=new SDK.CSSProperty(this,this.allProperties().length,shorthand,shorthandValue,shorthandImportance,false,true,false);generatedProperties.push(shorthandProperty);propertiesSet.add(shorthand);}}
this._allProperties=this._allProperties.concat(generatedProperties);}
_computeLeadingProperties(){function propertyHasRange(property){return!!property.range;}
if(this.range){return this._allProperties.filter(propertyHasRange);}
const leadingProperties=[];for(const property of this._allProperties){const shorthands=SDK.cssMetadata().shorthands(property.name)||[];let belongToAnyShorthand=false;for(const shorthand of shorthands){if(this._shorthandValues.get(shorthand)){belongToAnyShorthand=true;break;}}
if(!belongToAnyShorthand){leadingProperties.push(property);}}
return leadingProperties;}
leadingProperties(){if(!this._leadingProperties){this._leadingProperties=this._computeLeadingProperties();}
return this._leadingProperties;}
target(){return this._cssModel.target();}
cssModel(){return this._cssModel;}
_computeInactiveProperties(){const activeProperties={};for(let i=0;i<this._allProperties.length;++i){const property=this._allProperties[i];if(property.disabled||!property.parsedOk){property.setActive(false);continue;}
const canonicalName=SDK.cssMetadata().canonicalPropertyName(property.name);const activeProperty=activeProperties[canonicalName];if(!activeProperty){activeProperties[canonicalName]=property;}else if(!activeProperty.important||property.important){activeProperty.setActive(false);activeProperties[canonicalName]=property;}else{property.setActive(false);}}}
allProperties(){return this._allProperties;}
getPropertyValue(name){const property=this._activePropertyMap.get(name);return property?property.value:'';}
isPropertyImplicit(name){const property=this._activePropertyMap.get(name);return property?property.implicit:false;}
longhandProperties(name){const longhands=SDK.cssMetadata().longhands(name);const result=[];for(let i=0;longhands&&i<longhands.length;++i){const property=this._activePropertyMap.get(longhands[i]);if(property){result.push(property);}}
return result;}
propertyAt(index){return(index<this.allProperties().length)?this.allProperties()[index]:null;}
pastLastSourcePropertyIndex(){for(let i=this.allProperties().length-1;i>=0;--i){if(this.allProperties()[i].range){return i+1;}}
return 0;}
_insertionRange(index){const property=this.propertyAt(index);return property&&property.range?property.range.collapseToStart():this.range.collapseToEnd();}
newBlankProperty(index){index=(typeof index==='undefined')?this.pastLastSourcePropertyIndex():index;const property=new SDK.CSSProperty(this,index,'','',false,false,true,false,'',this._insertionRange(index));return property;}
setText(text,majorChange){if(!this.range||!this.styleSheetId){return Promise.resolve(false);}
return this._cssModel.setStyleText(this.styleSheetId,this.range,text,majorChange);}
insertPropertyAt(index,name,value,userCallback){this.newBlankProperty(index).setText(name+': '+value+';',false,true).then(userCallback);}
appendProperty(name,value,userCallback){this.insertPropertyAt(this.allProperties().length,name,value,userCallback);}}
export const Type={Regular:'Regular',Inline:'Inline',Attributes:'Attributes'};self.SDK=self.SDK||{};SDK=SDK||{};SDK.CSSStyleDeclaration=CSSStyleDeclaration;SDK.CSSStyleDeclaration.Type=Type;