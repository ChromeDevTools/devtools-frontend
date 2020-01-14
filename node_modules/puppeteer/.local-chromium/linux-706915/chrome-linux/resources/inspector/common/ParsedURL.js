export default class ParsedURL{constructor(url){this.isValid=false;this.url=url;this.scheme='';this.user='';this.host='';this.port='';this.path='';this.queryParams='';this.fragment='';this.folderPathComponents='';this.lastPathComponent='';const isBlobUrl=this.url.startsWith('blob:');const urlToMatch=isBlobUrl?url.substring(5):url;const match=urlToMatch.match(Common.ParsedURL._urlRegex());if(match){this.isValid=true;if(isBlobUrl){this._blobInnerScheme=match[2].toLowerCase();this.scheme='blob';}else{this.scheme=match[2].toLowerCase();}
this.user=match[3];this.host=match[4];this.port=match[5];this.path=match[6]||'/';this.queryParams=match[7]||'';this.fragment=match[8];}else{if(this.url.startsWith('data:')){this.scheme='data';return;}
if(this.url.startsWith('blob:')){this.scheme='blob';return;}
if(this.url==='about:blank'){this.scheme='about';return;}
this.path=this.url;}
const lastSlashIndex=this.path.lastIndexOf('/');if(lastSlashIndex!==-1){this.folderPathComponents=this.path.substring(0,lastSlashIndex);this.lastPathComponent=this.path.substring(lastSlashIndex+1);}else{this.lastPathComponent=this.path;}}
static platformPathToURL(fileSystemPath){fileSystemPath=fileSystemPath.replace(/\\/g,'/');if(!fileSystemPath.startsWith('file://')){if(fileSystemPath.startsWith('/')){fileSystemPath='file://'+fileSystemPath;}else{fileSystemPath='file:///'+fileSystemPath;}}
return fileSystemPath;}
static urlToPlatformPath(fileURL,isWindows){console.assert(fileURL.startsWith('file://'),'This must be a file URL.');if(isWindows){return fileURL.substr('file:///'.length).replace(/\//g,'\\');}
return fileURL.substr('file://'.length);}
static urlWithoutHash(url){const hashIndex=url.indexOf('#');if(hashIndex!==-1){return url.substr(0,hashIndex);}
return url;}
static _urlRegex(){if(Common.ParsedURL._urlRegexInstance){return Common.ParsedURL._urlRegexInstance;}
const schemeRegex=/([A-Za-z][A-Za-z0-9+.-]*):\/\//;const userRegex=/(?:([A-Za-z0-9\-._~%!$&'()*+,;=:]*)@)?/;const hostRegex=/((?:\[::\d?\])|(?:[^\s\/:]*))/;const portRegex=/(?::([\d]+))?/;const pathRegex=/(\/[^#?]*)?/;const queryRegex=/(?:\?([^#]*))?/;const fragmentRegex=/(?:#(.*))?/;Common.ParsedURL._urlRegexInstance=new RegExp('^('+schemeRegex.source+userRegex.source+hostRegex.source+portRegex.source+')'+pathRegex.source+
queryRegex.source+fragmentRegex.source+'$');return Common.ParsedURL._urlRegexInstance;}
static extractPath(url){const parsedURL=url.asParsedURL();return parsedURL?parsedURL.path:'';}
static extractOrigin(url){const parsedURL=url.asParsedURL();return parsedURL?parsedURL.securityOrigin():'';}
static extractExtension(url){url=Common.ParsedURL.urlWithoutHash(url);const indexOfQuestionMark=url.indexOf('?');if(indexOfQuestionMark!==-1){url=url.substr(0,indexOfQuestionMark);}
const lastIndexOfSlash=url.lastIndexOf('/');if(lastIndexOfSlash!==-1){url=url.substr(lastIndexOfSlash+1);}
const lastIndexOfDot=url.lastIndexOf('.');if(lastIndexOfDot!==-1){url=url.substr(lastIndexOfDot+1);const lastIndexOfPercent=url.indexOf('%');if(lastIndexOfPercent!==-1){return url.substr(0,lastIndexOfPercent);}
return url;}
return'';}
static extractName(url){let index=url.lastIndexOf('/');const pathAndQuery=index!==-1?url.substr(index+1):url;index=pathAndQuery.indexOf('?');return index<0?pathAndQuery:pathAndQuery.substr(0,index);}
static completeURL(baseURL,href){const trimmedHref=href.trim();if(trimmedHref.startsWith('data:')||trimmedHref.startsWith('blob:')||trimmedHref.startsWith('javascript:')||trimmedHref.startsWith('mailto:')){return href;}
const parsedHref=trimmedHref.asParsedURL();if(parsedHref&&parsedHref.scheme){return trimmedHref;}
const parsedURL=baseURL.asParsedURL();if(!parsedURL){return null;}
if(parsedURL.isDataURL()){return href;}
if(href.length>1&&href.charAt(0)==='/'&&href.charAt(1)==='/'){return parsedURL.scheme+':'+href;}
const securityOrigin=parsedURL.securityOrigin();const pathText=parsedURL.path;const queryText=parsedURL.queryParams?'?'+parsedURL.queryParams:'';if(!href.length){return securityOrigin+pathText+queryText;}
if(href.charAt(0)==='#'){return securityOrigin+pathText+queryText+href;}
if(href.charAt(0)==='?'){return securityOrigin+pathText+href;}
let hrefPath=href.match(/^[^#?]*/)[0];const hrefSuffix=href.substring(hrefPath.length);if(hrefPath.charAt(0)!=='/'){hrefPath=parsedURL.folderPathComponents+'/'+hrefPath;}
return securityOrigin+Root.Runtime.normalizePath(hrefPath)+hrefSuffix;}
static splitLineAndColumn(string){const beforePathMatch=string.match(Common.ParsedURL._urlRegex());let beforePath='';let pathAndAfter=string;if(beforePathMatch){beforePath=beforePathMatch[1];pathAndAfter=string.substring(beforePathMatch[1].length);}
const lineColumnRegEx=/(?::(\d+))?(?::(\d+))?$/;const lineColumnMatch=lineColumnRegEx.exec(pathAndAfter);let lineNumber;let columnNumber;console.assert(lineColumnMatch);if(typeof(lineColumnMatch[1])==='string'){lineNumber=parseInt(lineColumnMatch[1],10);lineNumber=isNaN(lineNumber)?undefined:lineNumber-1;}
if(typeof(lineColumnMatch[2])==='string'){columnNumber=parseInt(lineColumnMatch[2],10);columnNumber=isNaN(columnNumber)?undefined:columnNumber-1;}
return{url:beforePath+pathAndAfter.substring(0,pathAndAfter.length-lineColumnMatch[0].length),lineNumber:lineNumber,columnNumber:columnNumber};}
static isRelativeURL(url){return!(/^[A-Za-z][A-Za-z0-9+.-]*:/.test(url));}
get displayName(){if(this._displayName){return this._displayName;}
if(this.isDataURL()){return this.dataURLDisplayName();}
if(this.isBlobURL()){return this.url;}
if(this.isAboutBlank()){return this.url;}
this._displayName=this.lastPathComponent;if(!this._displayName){this._displayName=(this.host||'')+'/';}
if(this._displayName==='/'){this._displayName=this.url;}
return this._displayName;}
dataURLDisplayName(){if(this._dataURLDisplayName){return this._dataURLDisplayName;}
if(!this.isDataURL()){return'';}
this._dataURLDisplayName=this.url.trimEndWithMaxLength(20);return this._dataURLDisplayName;}
isAboutBlank(){return this.url==='about:blank';}
isDataURL(){return this.scheme==='data';}
isBlobURL(){return this.url.startsWith('blob:');}
lastPathComponentWithFragment(){return this.lastPathComponent+(this.fragment?'#'+this.fragment:'');}
domain(){if(this.isDataURL()){return'data:';}
return this.host+(this.port?':'+this.port:'');}
securityOrigin(){if(this.isDataURL()){return'data:';}
const scheme=this.isBlobURL()?this._blobInnerScheme:this.scheme;return scheme+'://'+this.domain();}
urlWithoutScheme(){if(this.scheme&&this.url.startsWith(this.scheme+'://')){return this.url.substring(this.scheme.length+3);}
return this.url;}}
String.prototype.asParsedURL=function(){const parsedURL=new Common.ParsedURL(this.toString());if(parsedURL.isValid){return parsedURL;}
return null;};self.Common=self.Common||{};Common=Common||{};Common.ParsedURL=ParsedURL;