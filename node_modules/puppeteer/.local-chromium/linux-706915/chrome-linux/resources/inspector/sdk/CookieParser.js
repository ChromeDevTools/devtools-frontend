export default class CookieParser{constructor(){}
static parseCookie(header){return(new CookieParser()).parseCookie(header);}
static parseSetCookie(header){return(new CookieParser()).parseSetCookie(header);}
cookies(){return this._cookies;}
parseCookie(cookieHeader){if(!this._initialize(cookieHeader)){return null;}
for(let kv=this._extractKeyValue();kv;kv=this._extractKeyValue()){if(kv.key.charAt(0)==='$'&&this._lastCookie){this._lastCookie.addAttribute(kv.key.slice(1),kv.value);}else if(kv.key.toLowerCase()!=='$version'&&typeof kv.value==='string'){this._addCookie(kv,Type.Request);}
this._advanceAndCheckCookieDelimiter();}
this._flushCookie();return this._cookies;}
parseSetCookie(setCookieHeader){if(!this._initialize(setCookieHeader)){return null;}
for(let kv=this._extractKeyValue();kv;kv=this._extractKeyValue()){if(this._lastCookie){this._lastCookie.addAttribute(kv.key,kv.value);}else{this._addCookie(kv,Type.Response);}
if(this._advanceAndCheckCookieDelimiter()){this._flushCookie();}}
this._flushCookie();return this._cookies;}
_initialize(headerValue){this._input=headerValue;if(typeof headerValue!=='string'){return false;}
this._cookies=[];this._lastCookie=null;this._lastCookieLine='';this._originalInputLength=this._input.length;return true;}
_flushCookie(){if(this._lastCookie){this._lastCookie.setSize(this._originalInputLength-this._input.length-this._lastCookiePosition);this._lastCookie._setCookieLine(this._lastCookieLine.replace('\n',''));}
this._lastCookie=null;this._lastCookieLine='';}
_extractKeyValue(){if(!this._input||!this._input.length){return null;}
const keyValueMatch=/^[ \t]*([^\s=;]+)[ \t]*(?:=[ \t]*([^;\n]*))?/.exec(this._input);if(!keyValueMatch){console.error('Failed parsing cookie header before: '+this._input);return null;}
const result=new KeyValue(keyValueMatch[1],keyValueMatch[2]&&keyValueMatch[2].trim(),this._originalInputLength-this._input.length);this._lastCookieLine+=keyValueMatch[0];this._input=this._input.slice(keyValueMatch[0].length);return result;}
_advanceAndCheckCookieDelimiter(){const match=/^\s*[\n;]\s*/.exec(this._input);if(!match){return false;}
this._lastCookieLine+=match[0];this._input=this._input.slice(match[0].length);return match[0].match('\n')!==null;}
_addCookie(keyValue,type){if(this._lastCookie){this._lastCookie.setSize(keyValue.position-this._lastCookiePosition);}
this._lastCookie=typeof keyValue.value==='string'?new SDK.Cookie(keyValue.key,keyValue.value,type):new SDK.Cookie('',keyValue.key,type);this._lastCookiePosition=keyValue.position;this._cookies.push(this._lastCookie);}}
export class KeyValue{constructor(key,value,position){this.key=key;this.value=value;this.position=position;}}
export class Cookie{constructor(name,value,type){this._name=name;this._value=value;this._type=type;this._attributes={};this._size=0;this._cookieLine=null;}
static fromProtocolCookie(protocolCookie){const cookie=new SDK.Cookie(protocolCookie.name,protocolCookie.value,null);cookie.addAttribute('domain',protocolCookie['domain']);cookie.addAttribute('path',protocolCookie['path']);cookie.addAttribute('port',protocolCookie['port']);if(protocolCookie['expires']){cookie.addAttribute('expires',protocolCookie['expires']*1000);}
if(protocolCookie['httpOnly']){cookie.addAttribute('httpOnly');}
if(protocolCookie['secure']){cookie.addAttribute('secure');}
if(protocolCookie['sameSite']){cookie.addAttribute('sameSite',protocolCookie['sameSite']);}
cookie.setSize(protocolCookie['size']);return cookie;}
name(){return this._name;}
value(){return this._value;}
type(){return this._type;}
httpOnly(){return'httponly'in this._attributes;}
secure(){return'secure'in this._attributes;}
sameSite(){return(this._attributes['samesite']);}
session(){return!('expires'in this._attributes||'max-age'in this._attributes);}
path(){return this._attributes['path'];}
port(){return this._attributes['port'];}
domain(){return this._attributes['domain'];}
expires(){return this._attributes['expires'];}
maxAge(){return this._attributes['max-age'];}
size(){return this._size;}
url(){return(this.secure()?'https://':'http://')+this.domain()+this.path();}
setSize(size){this._size=size;}
expiresDate(requestDate){if(this.maxAge()){const targetDate=requestDate===null?new Date():requestDate;return new Date(targetDate.getTime()+1000*this.maxAge());}
if(this.expires()){return new Date(this.expires());}
return null;}
attributes(){return this._attributes;}
addAttribute(key,value){this._attributes[key.toLowerCase()]=value;}
_setCookieLine(cookieLine){this._cookieLine=cookieLine;}
getCookieLine(){return this._cookieLine;}}
export const Type={Request:0,Response:1};export const Attributes={Name:'name',Value:'value',Size:'size',Domain:'domain',Path:'path',Expires:'expires',HttpOnly:'httpOnly',Secure:'secure',SameSite:'sameSite',};self.SDK=self.SDK||{};SDK=SDK||{};SDK.CookieParser=CookieParser;SDK.CookieParser.KeyValue=KeyValue;SDK.Cookie=Cookie;SDK.Cookie.Type=Type;SDK.Cookie.Attributes=Attributes;