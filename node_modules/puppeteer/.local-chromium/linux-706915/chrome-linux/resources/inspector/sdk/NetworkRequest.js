export default class NetworkRequest extends Common.Object{constructor(requestId,url,documentURL,frameId,loaderId,initiator){super();this._requestId=requestId;this._backendRequestId=requestId;this.setUrl(url);this._documentURL=documentURL;this._frameId=frameId;this._loaderId=loaderId;this._initiator=initiator;this._redirectSource=null;this._redirectDestination=null;this._issueTime=-1;this._startTime=-1;this._endTime=-1;this._blockedReason=undefined;this.statusCode=0;this.statusText='';this.requestMethod='';this.requestTime=0;this.protocol='';this.mixedContentType=Protocol.Security.MixedContentType.None;this._initialPriority=null;this._currentPriority=null;this._signedExchangeInfo=null;this._resourceType=Common.resourceTypes.Other;this._contentData=null;this._frames=[];this._eventSourceMessages=[];this._responseHeaderValues={};this._responseHeadersText='';this._requestHeaders=[];this._requestHeaderValues={};this._remoteAddress='';this._referrerPolicy=null;this._securityState=Protocol.Security.SecurityState.Unknown;this._securityDetails=null;this.connectionId='0';this._formParametersPromise=null;this._requestFormDataPromise=(Promise.resolve(null));this._hasExtraRequestInfo=false;this._hasExtraResponseInfo=false;this._blockedRequestCookies=[];this._blockedResponseCookies=[];}
indentityCompare(other){const thisId=this.requestId();const thatId=other.requestId();if(thisId>thatId){return 1;}
if(thisId<thatId){return-1;}
return 0;}
requestId(){return this._requestId;}
backendRequestId(){return this._backendRequestId;}
url(){return this._url;}
isBlobRequest(){return this._url.startsWith('blob:');}
setUrl(x){if(this._url===x){return;}
this._url=x;this._parsedURL=new Common.ParsedURL(x);delete this._queryString;delete this._parsedQueryParameters;delete this._name;delete this._path;}
get documentURL(){return this._documentURL;}
get parsedURL(){return this._parsedURL;}
get frameId(){return this._frameId;}
get loaderId(){return this._loaderId;}
setRemoteAddress(ip,port){this._remoteAddress=ip+':'+port;this.dispatchEventToListeners(Events.RemoteAddressChanged,this);}
remoteAddress(){return this._remoteAddress;}
setReferrerPolicy(referrerPolicy){this._referrerPolicy=referrerPolicy;}
referrerPolicy(){return this._referrerPolicy;}
securityState(){return this._securityState;}
setSecurityState(securityState){this._securityState=securityState;}
securityDetails(){return this._securityDetails;}
setSecurityDetails(securityDetails){this._securityDetails=securityDetails;}
get startTime(){return this._startTime||-1;}
setIssueTime(monotonicTime,wallTime){this._issueTime=monotonicTime;this._wallIssueTime=wallTime;this._startTime=monotonicTime;}
issueTime(){return this._issueTime;}
pseudoWallTime(monotonicTime){return this._wallIssueTime?this._wallIssueTime-this._issueTime+monotonicTime:monotonicTime;}
get responseReceivedTime(){return this._responseReceivedTime||-1;}
set responseReceivedTime(x){this._responseReceivedTime=x;}
get endTime(){return this._endTime||-1;}
set endTime(x){if(this.timing&&this.timing.requestTime){this._endTime=Math.max(x,this.responseReceivedTime);}else{this._endTime=x;if(this._responseReceivedTime>x){this._responseReceivedTime=x;}}
this.dispatchEventToListeners(Events.TimingChanged,this);}
get duration(){if(this._endTime===-1||this._startTime===-1){return-1;}
return this._endTime-this._startTime;}
get latency(){if(this._responseReceivedTime===-1||this._startTime===-1){return-1;}
return this._responseReceivedTime-this._startTime;}
get resourceSize(){return this._resourceSize||0;}
set resourceSize(x){this._resourceSize=x;}
get transferSize(){return this._transferSize||0;}
increaseTransferSize(x){this._transferSize=(this._transferSize||0)+x;}
setTransferSize(x){this._transferSize=x;}
get finished(){return this._finished;}
set finished(x){if(this._finished===x){return;}
this._finished=x;if(x){this.dispatchEventToListeners(Events.FinishedLoading,this);}}
get failed(){return this._failed;}
set failed(x){this._failed=x;}
get canceled(){return this._canceled;}
set canceled(x){this._canceled=x;}
blockedReason(){return this._blockedReason;}
setBlockedReason(reason){this._blockedReason=reason;}
wasBlocked(){return!!this._blockedReason;}
cached(){return(!!this._fromMemoryCache||!!this._fromDiskCache)&&!this._transferSize;}
cachedInMemory(){return!!this._fromMemoryCache&&!this._transferSize;}
fromPrefetchCache(){return!!this._fromPrefetchCache;}
setFromMemoryCache(){this._fromMemoryCache=true;delete this._timing;}
setFromDiskCache(){this._fromDiskCache=true;}
setFromPrefetchCache(){this._fromPrefetchCache=true;}
get fetchedViaServiceWorker(){return!!this._fetchedViaServiceWorker;}
set fetchedViaServiceWorker(x){this._fetchedViaServiceWorker=x;}
initiatedByServiceWorker(){const networkManager=SDK.NetworkManager.forRequest(this);if(!networkManager){return false;}
return networkManager.target().type()===SDK.Target.Type.ServiceWorker;}
get timing(){return this._timing;}
set timing(timingInfo){if(!timingInfo||this._fromMemoryCache){return;}
this._startTime=timingInfo.requestTime;const headersReceivedTime=timingInfo.requestTime+timingInfo.receiveHeadersEnd/1000.0;if((this._responseReceivedTime||-1)<0||this._responseReceivedTime>headersReceivedTime){this._responseReceivedTime=headersReceivedTime;}
if(this._startTime>this._responseReceivedTime){this._responseReceivedTime=this._startTime;}
this._timing=timingInfo;this.dispatchEventToListeners(Events.TimingChanged,this);}
get mimeType(){return this._mimeType;}
set mimeType(x){this._mimeType=x;}
get displayName(){return this._parsedURL.displayName;}
name(){if(this._name){return this._name;}
this._parseNameAndPathFromURL();return this._name;}
path(){if(this._path){return this._path;}
this._parseNameAndPathFromURL();return this._path;}
_parseNameAndPathFromURL(){if(this._parsedURL.isDataURL()){this._name=this._parsedURL.dataURLDisplayName();this._path='';}else if(this._parsedURL.isBlobURL()){this._name=this._parsedURL.url;this._path='';}else if(this._parsedURL.isAboutBlank()){this._name=this._parsedURL.url;this._path='';}else{this._path=this._parsedURL.host+this._parsedURL.folderPathComponents;const networkManager=SDK.NetworkManager.forRequest(this);const inspectedURL=networkManager?networkManager.target().inspectedURL().asParsedURL():null;this._path=this._path.trimURL(inspectedURL?inspectedURL.host:'');if(this._parsedURL.lastPathComponent||this._parsedURL.queryParams){this._name=this._parsedURL.lastPathComponent+(this._parsedURL.queryParams?'?'+this._parsedURL.queryParams:'');}else if(this._parsedURL.folderPathComponents){this._name=this._parsedURL.folderPathComponents.substring(this._parsedURL.folderPathComponents.lastIndexOf('/')+1)+'/';this._path=this._path.substring(0,this._path.lastIndexOf('/'));}else{this._name=this._parsedURL.host;this._path='';}}}
get folder(){let path=this._parsedURL.path;const indexOfQuery=path.indexOf('?');if(indexOfQuery!==-1){path=path.substring(0,indexOfQuery);}
const lastSlashIndex=path.lastIndexOf('/');return lastSlashIndex!==-1?path.substring(0,lastSlashIndex):'';}
resourceType(){return this._resourceType;}
setResourceType(resourceType){this._resourceType=resourceType;}
get domain(){return this._parsedURL.host;}
get scheme(){return this._parsedURL.scheme;}
redirectSource(){return this._redirectSource;}
setRedirectSource(originatingRequest){this._redirectSource=originatingRequest;}
redirectDestination(){return this._redirectDestination;}
setRedirectDestination(redirectDestination){this._redirectDestination=redirectDestination;}
requestHeaders(){return this._requestHeaders;}
setRequestHeaders(headers){this._requestHeaders=headers;delete this._requestCookies;this.dispatchEventToListeners(Events.RequestHeadersChanged);}
requestHeadersText(){return this._requestHeadersText;}
setRequestHeadersText(text){this._requestHeadersText=text;this.dispatchEventToListeners(Events.RequestHeadersChanged);}
requestHeaderValue(headerName){if(this._requestHeaderValues[headerName]){return this._requestHeaderValues[headerName];}
this._requestHeaderValues[headerName]=this._computeHeaderValue(this.requestHeaders(),headerName);return this._requestHeaderValues[headerName];}
get requestCookies(){if(!this._requestCookies){this._requestCookies=SDK.CookieParser.parseCookie(this.requestHeaderValue('Cookie'));}
return this._requestCookies;}
requestFormData(){if(!this._requestFormDataPromise){this._requestFormDataPromise=SDK.NetworkManager.requestPostData(this);}
return this._requestFormDataPromise;}
setRequestFormData(hasData,data){this._requestFormDataPromise=(hasData&&data===null)?null:Promise.resolve(data);this._formParametersPromise=null;}
_filteredProtocolName(){const protocol=this.protocol.toLowerCase();if(protocol==='h2'){return'http/2.0';}
return protocol.replace(/^http\/2(\.0)?\+/,'http/2.0+');}
requestHttpVersion(){const headersText=this.requestHeadersText();if(!headersText){const version=this.requestHeaderValue('version')||this.requestHeaderValue(':version');if(version){return version;}
return this._filteredProtocolName();}
const firstLine=headersText.split(/\r\n/)[0];const match=firstLine.match(/(HTTP\/\d+\.\d+)$/);return match?match[1]:'HTTP/0.9';}
get responseHeaders(){return this._responseHeaders||[];}
set responseHeaders(x){this._responseHeaders=x;delete this._sortedResponseHeaders;delete this._serverTimings;delete this._responseCookies;this._responseHeaderValues={};this.dispatchEventToListeners(Events.ResponseHeadersChanged);}
get responseHeadersText(){return this._responseHeadersText;}
set responseHeadersText(x){this._responseHeadersText=x;this.dispatchEventToListeners(Events.ResponseHeadersChanged);}
get sortedResponseHeaders(){if(this._sortedResponseHeaders!==undefined){return this._sortedResponseHeaders;}
this._sortedResponseHeaders=this.responseHeaders.slice();this._sortedResponseHeaders.sort(function(a,b){return a.name.toLowerCase().compareTo(b.name.toLowerCase());});return this._sortedResponseHeaders;}
responseHeaderValue(headerName){if(headerName in this._responseHeaderValues){return this._responseHeaderValues[headerName];}
this._responseHeaderValues[headerName]=this._computeHeaderValue(this.responseHeaders,headerName);return this._responseHeaderValues[headerName];}
get responseCookies(){if(!this._responseCookies){this._responseCookies=SDK.CookieParser.parseSetCookie(this.responseHeaderValue('Set-Cookie'));}
return this._responseCookies;}
responseLastModified(){return this.responseHeaderValue('last-modified');}
get serverTimings(){if(typeof this._serverTimings==='undefined'){this._serverTimings=SDK.ServerTiming.parseHeaders(this.responseHeaders);}
return this._serverTimings;}
queryString(){if(this._queryString!==undefined){return this._queryString;}
let queryString=null;const url=this.url();const questionMarkPosition=url.indexOf('?');if(questionMarkPosition!==-1){queryString=url.substring(questionMarkPosition+1);const hashSignPosition=queryString.indexOf('#');if(hashSignPosition!==-1){queryString=queryString.substring(0,hashSignPosition);}}
this._queryString=queryString;return this._queryString;}
get queryParameters(){if(this._parsedQueryParameters){return this._parsedQueryParameters;}
const queryString=this.queryString();if(!queryString){return null;}
this._parsedQueryParameters=this._parseParameters(queryString);return this._parsedQueryParameters;}
async _parseFormParameters(){const requestContentType=this.requestContentType();if(!requestContentType){return null;}
if(requestContentType.match(/^application\/x-www-form-urlencoded\s*(;.*)?$/i)){const formData=await this.requestFormData();if(!formData){return null;}
return this._parseParameters(formData);}
const multipartDetails=requestContentType.match(/^multipart\/form-data\s*;\s*boundary\s*=\s*(\S+)\s*$/);if(!multipartDetails){return null;}
const boundary=multipartDetails[1];if(!boundary){return null;}
const formData=await this.requestFormData();if(!formData){return null;}
return this._parseMultipartFormDataParameters(formData,boundary);}
formParameters(){if(!this._formParametersPromise){this._formParametersPromise=this._parseFormParameters();}
return this._formParametersPromise;}
responseHttpVersion(){const headersText=this._responseHeadersText;if(!headersText){const version=this.responseHeaderValue('version')||this.responseHeaderValue(':version');if(version){return version;}
return this._filteredProtocolName();}
const firstLine=headersText.split(/\r\n/)[0];const match=firstLine.match(/^(HTTP\/\d+\.\d+)/);return match?match[1]:'HTTP/0.9';}
_parseParameters(queryString){function parseNameValue(pair){const position=pair.indexOf('=');if(position===-1){return{name:pair,value:''};}else{return{name:pair.substring(0,position),value:pair.substring(position+1)};}}
return queryString.split('&').map(parseNameValue);}
_parseMultipartFormDataParameters(data,boundary){const sanitizedBoundary=boundary.escapeForRegExp();const keyValuePattern=new RegExp('^\\r\\ncontent-disposition\\s*:\\s*form-data\\s*;\\s*name="([^"]*)"(?:\\s*;\\s*filename="([^"]*)")?'+'(?:\\r\\ncontent-type\\s*:\\s*([^\\r\\n]*))?'+'\\r\\n\\r\\n'+'(.*)'+'\\r\\n$','is');const fields=data.split(new RegExp(`--${sanitizedBoundary}(?:--\s*$)?`,'g'));return fields.reduce(parseMultipartField,[]);function parseMultipartField(result,field){const[match,name,filename,contentType,value]=field.match(keyValuePattern)||[];if(!match){return result;}
const processedValue=(filename||contentType)?ls`(binary)`:value;result.push({name,value:processedValue});return result;}}
_computeHeaderValue(headers,headerName){headerName=headerName.toLowerCase();const values=[];for(let i=0;i<headers.length;++i){if(headers[i].name.toLowerCase()===headerName){values.push(headers[i].value);}}
if(!values.length){return undefined;}
if(headerName==='set-cookie'){return values.join('\n');}
return values.join(', ');}
contentData(){if(this._contentData){return this._contentData;}
if(this._contentDataProvider){this._contentData=this._contentDataProvider();}else{this._contentData=SDK.NetworkManager.requestContentData(this);}
return this._contentData;}
setContentDataProvider(dataProvider){console.assert(!this._contentData,'contentData can only be set once.');this._contentDataProvider=dataProvider;}
contentURL(){return this._url;}
contentType(){return this._resourceType;}
async contentEncoded(){return(await this.contentData()).encoded;}
async requestContent(){const{content,error,encoded}=await this.contentData();return({content,error,isEncoded:encoded,});}
async searchInContent(query,caseSensitive,isRegex){if(!this._contentDataProvider){return SDK.NetworkManager.searchInRequest(this,query,caseSensitive,isRegex);}
const contentData=await this.contentData();let content=contentData.content;if(!content){return[];}
if(contentData.encoded){content=window.atob(content);}
return Common.ContentProvider.performSearchInContent(content,query,caseSensitive,isRegex);}
isHttpFamily(){return!!this.url().match(/^https?:/i);}
requestContentType(){return this.requestHeaderValue('Content-Type');}
hasErrorStatusCode(){return this.statusCode>=400;}
setInitialPriority(priority){this._initialPriority=priority;}
initialPriority(){return this._initialPriority;}
setPriority(priority){this._currentPriority=priority;}
priority(){return this._currentPriority||this._initialPriority||null;}
setSignedExchangeInfo(info){this._signedExchangeInfo=info;}
signedExchangeInfo(){return this._signedExchangeInfo;}
async populateImageSource(image){const{content,encoded}=await this.contentData();let imageSrc=Common.ContentProvider.contentAsDataURL(content,this._mimeType,encoded);if(imageSrc===null&&!this._failed){const cacheControl=this.responseHeaderValue('cache-control')||'';if(!cacheControl.includes('no-cache')){imageSrc=this._url;}}
if(imageSrc!==null){image.src=imageSrc;}}
initiator(){return this._initiator;}
frames(){return this._frames;}
addProtocolFrameError(errorMessage,time){this.addFrame({type:WebSocketFrameType.Error,text:errorMessage,time:this.pseudoWallTime(time),opCode:-1,mask:false});}
addProtocolFrame(response,time,sent){const type=sent?WebSocketFrameType.Send:WebSocketFrameType.Receive;this.addFrame({type:type,text:response.payloadData,time:this.pseudoWallTime(time),opCode:response.opcode,mask:response.mask});}
addFrame(frame){this._frames.push(frame);this.dispatchEventToListeners(Events.WebsocketFrameAdded,frame);}
eventSourceMessages(){return this._eventSourceMessages;}
addEventSourceMessage(time,eventName,eventId,data){const message={time:this.pseudoWallTime(time),eventName:eventName,eventId:eventId,data:data};this._eventSourceMessages.push(message);this.dispatchEventToListeners(Events.EventSourceMessageAdded,message);}
markAsRedirect(redirectCount){this._requestId=`${this._backendRequestId}:redirected.${redirectCount}`;}
setRequestIdForTest(requestId){this._backendRequestId=requestId;this._requestId=requestId;}
charset(){const contentTypeHeader=this.responseHeaderValue('content-type');if(!contentTypeHeader){return null;}
const responseCharsets=contentTypeHeader.replace(/ /g,'').split(';').filter(parameter=>parameter.toLowerCase().startsWith('charset=')).map(parameter=>parameter.slice('charset='.length));if(responseCharsets.length){return responseCharsets[0];}
return null;}
addExtraRequestInfo(extraRequestInfo){this._blockedRequestCookies=extraRequestInfo.blockedRequestCookies;this.setRequestHeaders(extraRequestInfo.requestHeaders);this._hasExtraRequestInfo=true;this.setRequestHeadersText('');}
hasExtraRequestInfo(){return this._hasExtraRequestInfo;}
blockedRequestCookies(){return this._blockedRequestCookies;}
addExtraResponseInfo(extraResponseInfo){this._blockedResponseCookies=extraResponseInfo.blockedResponseCookies;this.responseHeaders=extraResponseInfo.responseHeaders;if(extraResponseInfo.responseHeadersText){this.responseHeadersText=extraResponseInfo.responseHeadersText;if(!this.requestHeadersText()){let requestHeadersText=`${this.requestMethod} ${this.parsedURL.path}`;if(this.parsedURL.queryParams){requestHeadersText+=`?${this.parsedURL.queryParams}`;}
requestHeadersText+=` HTTP/1.1\r\n`;for(const{name,value}of this.requestHeaders()){requestHeadersText+=`${name}: ${value}\r\n`;}
this.setRequestHeadersText(requestHeadersText);}}
this._hasExtraResponseInfo=true;}
hasExtraResponseInfo(){return this._hasExtraResponseInfo;}
blockedResponseCookies(){return this._blockedResponseCookies;}}
export const Events={FinishedLoading:Symbol('FinishedLoading'),TimingChanged:Symbol('TimingChanged'),RemoteAddressChanged:Symbol('RemoteAddressChanged'),RequestHeadersChanged:Symbol('RequestHeadersChanged'),ResponseHeadersChanged:Symbol('ResponseHeadersChanged'),WebsocketFrameAdded:Symbol('WebsocketFrameAdded'),EventSourceMessageAdded:Symbol('EventSourceMessageAdded')};export const InitiatorType={Other:'other',Parser:'parser',Redirect:'redirect',Script:'script',Preload:'preload',SignedExchange:'signedExchange'};export const WebSocketFrameType={Send:'send',Receive:'receive',Error:'error'};export const cookieBlockedReasonToUiString=function(blockedReason){switch(blockedReason){case Protocol.Network.CookieBlockedReason.SecureOnly:return ls`This cookie had the "Secure" attribute and the connection was not secure.`;case Protocol.Network.CookieBlockedReason.NotOnPath:return ls`This cookie's path was not within the request url's path.`;case Protocol.Network.CookieBlockedReason.DomainMismatch:return ls`This cookie's domain is not configured to match the request url's domain, even though they share a common TLD+1 (TLD+1 of foo.bar.example.com is example.com).`;case Protocol.Network.CookieBlockedReason.SameSiteStrict:return ls`This cookie had the "SameSite=Strict" attribute and the request was made on on a different site. This includes navigation requests initiated by other sites.`;case Protocol.Network.CookieBlockedReason.SameSiteLax:return ls`This cookie had the "SameSite=Lax" attribute and the request was made on a different site. This does not include navigation requests initiated by other sites.`;case Protocol.Network.CookieBlockedReason.SameSiteExtended:return ls`This cookie had the "SameSite=Extended" attribute and the request was made on a different site. The different site is outside of the cookie's trusted first-party set.`;case Protocol.Network.CookieBlockedReason.SameSiteUnspecifiedTreatedAsLax:return ls`This cookie didn't specify a SameSite attribute when it was stored and was defaulted to "SameSite=Lax" and broke the same rules specified in the SameSiteLax value. The cookie had to have been set with "SameSite=None" to enable third-party usage.`;case Protocol.Network.CookieBlockedReason.SameSiteNoneInsecure:return ls`This cookie had the "SameSite=None" attribute but was not marked "Secure". Cookies without SameSite restrictions must be marked "Secure" and sent over a secure connection.`;case Protocol.Network.CookieBlockedReason.UserPreferences:return ls`This cookie was not sent due to user preferences.`;case Protocol.Network.CookieBlockedReason.UnknownError:return ls`An unknown error was encountered when trying to send this cookie.`;}
return'';};export const setCookieBlockedReasonToUiString=function(blockedReason){switch(blockedReason){case Protocol.Network.SetCookieBlockedReason.SecureOnly:return ls`This set-cookie had the "Secure" attribute but was not received over a secure connection.`;case Protocol.Network.SetCookieBlockedReason.SameSiteStrict:return ls`This set-cookie had the "SameSite=Strict" attribute but came from a cross-origin response. This includes navigation requests intitiated by other origins.`;case Protocol.Network.SetCookieBlockedReason.SameSiteLax:return ls`This set-cookie had the "SameSite=Lax" attribute but came from a cross-origin response.`;case Protocol.Network.SetCookieBlockedReason.SameSiteExtended:return ls`This set-cookie had the "SameSite=Extended" attribute but came from a cross-origin response.`;case Protocol.Network.SetCookieBlockedReason.SameSiteUnspecifiedTreatedAsLax:return ls`This set-cookie didn't specify a "SameSite" attribute and was defaulted to "SameSite=Lax" and broke the same rules specified in the SameSiteLax value.`;case Protocol.Network.SetCookieBlockedReason.SameSiteNoneInsecure:return ls`This set-cookie had the "SameSite=None" attribute but did not have the "Secure" attribute, which is required in order to use "SameSite=None".`;case Protocol.Network.SetCookieBlockedReason.UserPreferences:return ls`This set-cookie was not stored due to user preferences.`;case Protocol.Network.SetCookieBlockedReason.SyntaxError:return ls`This set-cookie had invalid syntax.`;case Protocol.Network.SetCookieBlockedReason.SchemeNotSupported:return ls`The scheme of this connection is not allowed to store cookies.`;case Protocol.Network.SetCookieBlockedReason.OverwriteSecure:return ls`This set-cookie was not sent over a secure connection and would have overwritten a cookie with the Secure attribute.`;case Protocol.Network.SetCookieBlockedReason.InvalidDomain:return ls`This set-cookie's Domain attribute was invalid with regards to the current host url.`;case Protocol.Network.SetCookieBlockedReason.InvalidPrefix:return ls`This set-cookie used the "__Secure-" or "__Host-" prefix in its name and broke the additional rules applied to cookies with these prefixes as defined in https://tools.ietf.org/html/draft-west-cookie-prefixes-05.`;case Protocol.Network.SetCookieBlockedReason.UnknownError:return ls`An unknown error was encountered when trying to store this cookie.`;}
return'';};export const cookieBlockedReasonToAttribute=function(blockedReason){switch(blockedReason){case Protocol.Network.CookieBlockedReason.SecureOnly:return SDK.Cookie.Attributes.Secure;case Protocol.Network.CookieBlockedReason.NotOnPath:return SDK.Cookie.Attributes.Path;case Protocol.Network.CookieBlockedReason.DomainMismatch:return SDK.Cookie.Attributes.Domain;case Protocol.Network.CookieBlockedReason.SameSiteStrict:case Protocol.Network.CookieBlockedReason.SameSiteLax:case Protocol.Network.CookieBlockedReason.SameSiteExtended:case Protocol.Network.CookieBlockedReason.SameSiteUnspecifiedTreatedAsLax:case Protocol.Network.CookieBlockedReason.SameSiteNoneInsecure:return SDK.Cookie.Attributes.SameSite;case Protocol.Network.CookieBlockedReason.UserPreferences:case Protocol.Network.CookieBlockedReason.UnknownError:return null;}
return null;};export const setCookieBlockedReasonToAttribute=function(blockedReason){switch(blockedReason){case Protocol.Network.SetCookieBlockedReason.SecureOnly:case Protocol.Network.SetCookieBlockedReason.OverwriteSecure:return SDK.Cookie.Attributes.Secure;case Protocol.Network.SetCookieBlockedReason.SameSiteStrict:case Protocol.Network.SetCookieBlockedReason.SameSiteLax:case Protocol.Network.SetCookieBlockedReason.SameSiteExtended:case Protocol.Network.SetCookieBlockedReason.SameSiteUnspecifiedTreatedAsLax:case Protocol.Network.SetCookieBlockedReason.SameSiteNoneInsecure:return SDK.Cookie.Attributes.SameSite;case Protocol.Network.SetCookieBlockedReason.InvalidDomain:return SDK.Cookie.Attributes.Domain;case Protocol.Network.SetCookieBlockedReason.InvalidPrefix:return SDK.Cookie.Attributes.Name;case Protocol.Network.SetCookieBlockedReason.UserPreferences:case Protocol.Network.SetCookieBlockedReason.SyntaxError:case Protocol.Network.SetCookieBlockedReason.SchemeNotSupported:case Protocol.Network.SetCookieBlockedReason.UnknownError:return null;}
return null;};self.SDK=self.SDK||{};SDK=SDK||{};SDK.NetworkRequest=NetworkRequest;SDK.NetworkRequest.Events=Events;SDK.NetworkRequest.InitiatorType=InitiatorType;SDK.NetworkRequest.WebSocketFrameType=WebSocketFrameType;SDK.NetworkRequest.cookieBlockedReasonToUiString=cookieBlockedReasonToUiString;SDK.NetworkRequest.setCookieBlockedReasonToUiString=setCookieBlockedReasonToUiString;SDK.NetworkRequest.cookieBlockedReasonToAttribute=cookieBlockedReasonToAttribute;SDK.NetworkRequest.setCookieBlockedReasonToAttribute=setCookieBlockedReasonToAttribute;SDK.NetworkRequest.NameValue;SDK.NetworkRequest.WebSocketFrame;SDK.NetworkRequest.EventSourceMessage;SDK.NetworkRequest.ContentData;SDK.NetworkRequest.BlockedCookieWithReason;SDK.NetworkRequest.ExtraRequestInfo;SDK.NetworkRequest.BlockedSetCookieWithReason;SDK.NetworkRequest.ExtraResponseInfo;