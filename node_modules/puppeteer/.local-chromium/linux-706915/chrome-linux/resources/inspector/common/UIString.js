export default function UIString(string,vararg){return String.vsprintf(Common.localize(string),Array.prototype.slice.call(arguments,1));}
export function serializeUIString(string,values=[]){const messageParts=[string];const serializedMessage={messageParts,values};return JSON.stringify(serializedMessage);}
export function deserializeUIString(serializedMessage){if(!serializedMessage){return{};}
return JSON.parse(serializedMessage);}
export function localize(string){return string;}
export class UIStringFormat{constructor(format){this._localizedFormat=localize(format);this._tokenizedFormat=String.tokenizeFormatString(this._localizedFormat,String.standardFormatters);}
static _append(a,b){return a+b;}
format(vararg){return String.format(this._localizedFormat,arguments,String.standardFormatters,'',Common.UIStringFormat._append,this._tokenizedFormat).formattedResult;}}
self.ls=function(strings,vararg){if(typeof strings==='string'){return strings;}
let substitutionString=Common._substitutionStrings.get(strings);if(!substitutionString){substitutionString=strings.join('%s');Common._substitutionStrings.set(strings,substitutionString);}
return Common.UIString(substitutionString,...Array.prototype.slice.call(arguments,1));};self.Common=self.Common||{};Common=Common||{};Common.UIStringFormat=UIStringFormat;Common.UIString=UIString;Common.serializeUIString=serializeUIString;Common.deserializeUIString=deserializeUIString;Common.localize=localize;Common._substitutionStrings=new WeakMap();