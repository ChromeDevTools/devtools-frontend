export default class ServerTiming{constructor(metric,value,description){this.metric=metric;this.value=value;this.description=description;}
static parseHeaders(headers){const rawServerTimingHeaders=headers.filter(item=>item.name.toLowerCase()==='server-timing');if(!rawServerTimingHeaders.length){return null;}
const serverTimings=rawServerTimingHeaders.reduce((memo,header)=>{const timing=this.createFromHeaderValue(header.value);memo.pushAll(timing.map(function(entry){return new ServerTiming(entry.name,entry.hasOwnProperty('dur')?entry.dur:null,entry.hasOwnProperty('desc')?entry.desc:'');}));return memo;},[]);serverTimings.sort((a,b)=>a.metric.toLowerCase().compareTo(b.metric.toLowerCase()));return serverTimings;}
static createFromHeaderValue(valueString){function trimLeadingWhiteSpace(){valueString=valueString.replace(/^\s*/,'');}
function consumeDelimiter(char){console.assert(char.length===1);trimLeadingWhiteSpace();if(valueString.charAt(0)!==char){return false;}
valueString=valueString.substring(1);return true;}
function consumeToken(){const result=/^(?:\s*)([\w!#$%&'*+\-.^`|~]+)(?:\s*)(.*)/.exec(valueString);if(!result){return null;}
valueString=result[2];return result[1];}
function consumeTokenOrQuotedString(){trimLeadingWhiteSpace();if(valueString.charAt(0)==='"'){return consumeQuotedString();}
return consumeToken();}
function consumeQuotedString(){console.assert(valueString.charAt(0)==='"');valueString=valueString.substring(1);let value='';while(valueString.length){const result=/^([^"\\]*)(.*)/.exec(valueString);value+=result[1];if(result[2].charAt(0)==='"'){valueString=result[2].substring(1);return value;}
console.assert(result[2].charAt(0)==='\\');value+=result[2].charAt(1);valueString=result[2].substring(2);}
return null;}
function consumeExtraneous(){const result=/([,;].*)/.exec(valueString);if(result){valueString=result[1];}}
const result=[];let name;while((name=consumeToken())!==null){const entry={name};if(valueString.charAt(0)==='='){this.showWarning(ls`Deprecated syntax found. Please use: <name>;dur=<duration>;desc=<description>`);}
while(consumeDelimiter(';')){let paramName;if((paramName=consumeToken())===null){continue;}
paramName=paramName.toLowerCase();const parseParameter=this.getParserForParameter(paramName);let paramValue=null;if(consumeDelimiter('=')){paramValue=consumeTokenOrQuotedString();consumeExtraneous();}
if(parseParameter){if(entry.hasOwnProperty(paramName)){this.showWarning(ls`Duplicate parameter \"${paramName}\" ignored.`);continue;}
if(paramValue===null){this.showWarning(ls`No value found for parameter \"${paramName}\".`);}
parseParameter.call(this,entry,paramValue);}else{this.showWarning(ls`Unrecognized parameter \"${paramName}\".`);}}
result.push(entry);if(!consumeDelimiter(',')){break;}}
if(valueString.length){this.showWarning(ls`Extraneous trailing characters.`);}
return result;}
static getParserForParameter(paramName){switch(paramName){case'dur':return function(entry,paramValue){entry.dur=0;if(paramValue!==null){const duration=parseFloat(paramValue);if(isNaN(duration)){this.showWarning(ls`Unable to parse \"${paramName}\" value \"${paramValue}\".`);return;}
entry.dur=duration;}};case'desc':return function(entry,paramValue){entry.desc=paramValue||'';};default:return null;}}
static showWarning(msg){Common.console.warn(Common.UIString(`ServerTiming: ${msg}`));}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.ServerTiming=ServerTiming;