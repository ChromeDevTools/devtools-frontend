export default class HARLog{static pseudoWallTime(request,monotonicTime){return new Date(request.pseudoWallTime(monotonicTime)*1000);}
static async build(requests){const log=new HARLog();const entryPromises=[];for(const request of requests){entryPromises.push(Entry.build(request));}
const entries=await Promise.all(entryPromises);return{version:'1.2',creator:log._creator(),pages:log._buildPages(requests),entries:entries};}
_creator(){const webKitVersion=/AppleWebKit\/([^ ]+)/.exec(window.navigator.userAgent);return{name:'WebInspector',version:webKitVersion?webKitVersion[1]:'n/a'};}
_buildPages(requests){const seenIdentifiers={};const pages=[];for(let i=0;i<requests.length;++i){const request=requests[i];const page=SDK.NetworkLog.PageLoad.forRequest(request);if(!page||seenIdentifiers[page.id]){continue;}
seenIdentifiers[page.id]=true;pages.push(this._convertPage(page,request));}
return pages;}
_convertPage(page,request){return{startedDateTime:HARLog.pseudoWallTime(request,page.startTime).toJSON(),id:'page_'+page.id,title:page.url,pageTimings:{onContentLoad:this._pageEventTime(page,page.contentLoadTime),onLoad:this._pageEventTime(page,page.loadTime)}};}
_pageEventTime(page,time){const startTime=page.startTime;if(time===-1||startTime===-1){return-1;}
return Entry._toMilliseconds(time-startTime);}}
export class Entry{constructor(request){this._request=request;}
static _toMilliseconds(time){return time===-1?-1:time*1000;}
static async build(request){const harEntry=new Entry(request);let ipAddress=harEntry._request.remoteAddress();const portPositionInString=ipAddress.lastIndexOf(':');if(portPositionInString!==-1){ipAddress=ipAddress.substr(0,portPositionInString);}
const timings=harEntry._buildTimings();let time=0;for(const t of[timings.blocked,timings.dns,timings.connect,timings.send,timings.wait,timings.receive]){time+=Math.max(t,0);}
const initiator=harEntry._request.initiator();const exportedInitiator={};exportedInitiator.type=initiator.type;if(initiator.url!==undefined){exportedInitiator.url=initiator.url;}
if(initiator.lineNumber!==undefined){exportedInitiator.lineNumber=initiator.lineNumber;}
if(initiator.stack){exportedInitiator.stack=initiator.stack;}
const entry={startedDateTime:HARLog.pseudoWallTime(harEntry._request,harEntry._request.issueTime()).toJSON(),time:time,request:await harEntry._buildRequest(),response:harEntry._buildResponse(),cache:{},timings:timings,serverIPAddress:ipAddress.replace(/\[\]/g,''),_initiator:exportedInitiator,_priority:harEntry._request.priority(),_resourceType:harEntry._request.resourceType().name()};if(harEntry._request.cached()){entry._fromCache=harEntry._request.cachedInMemory()?'memory':'disk';}
if(harEntry._request.connectionId!=='0'){entry.connection=harEntry._request.connectionId;}
const page=SDK.NetworkLog.PageLoad.forRequest(harEntry._request);if(page){entry.pageref='page_'+page.id;}
if(harEntry._request.resourceType()===Common.resourceTypes.WebSocket){const messages=[];for(const message of harEntry._request.frames()){messages.push({type:message.type,time:message.time,opcode:message.opCode,data:message.text});}
entry._webSocketMessages=messages;}
return entry;}
async _buildRequest(){const headersText=this._request.requestHeadersText();const res={method:this._request.requestMethod,url:this._buildRequestURL(this._request.url()),httpVersion:this._request.requestHttpVersion(),headers:this._request.requestHeaders(),queryString:this._buildParameters(this._request.queryParameters||[]),cookies:this._buildCookies(this._request.requestCookies||[]),headersSize:headersText?headersText.length:-1,bodySize:await this._requestBodySize()};const postData=await this._buildPostData();if(postData){res.postData=postData;}
return res;}
_buildResponse(){const headersText=this._request.responseHeadersText;return{status:this._request.statusCode,statusText:this._request.statusText,httpVersion:this._request.responseHttpVersion(),headers:this._request.responseHeaders,cookies:this._buildCookies(this._request.responseCookies||[]),content:this._buildContent(),redirectURL:this._request.responseHeaderValue('Location')||'',headersSize:headersText?headersText.length:-1,bodySize:this.responseBodySize,_transferSize:this._request.transferSize,_error:this._request.localizedFailDescription};}
_buildContent(){const content={size:this._request.resourceSize,mimeType:this._request.mimeType||'x-unknown',};const compression=this.responseCompression;if(typeof compression==='number'){content.compression=compression;}
return content;}
_buildTimings(){const timing=this._request.timing;const issueTime=this._request.issueTime();const startTime=this._request.startTime;const result={blocked:-1,dns:-1,ssl:-1,connect:-1,send:0,wait:0,receive:0,_blocked_queueing:-1};const queuedTime=(issueTime<startTime)?startTime-issueTime:-1;result.blocked=Entry._toMilliseconds(queuedTime);result._blocked_queueing=Entry._toMilliseconds(queuedTime);let highestTime=0;if(timing){const blockedStart=leastNonNegative([timing.dnsStart,timing.connectStart,timing.sendStart]);if(blockedStart!==Infinity){result.blocked+=blockedStart;}
if(timing.proxyEnd!==-1){result._blocked_proxy=timing.proxyEnd-timing.proxyStart;}
if(result._blocked_proxy&&result._blocked_proxy>result.blocked){result.blocked=result._blocked_proxy;}
const dnsStart=timing.dnsEnd>=0?blockedStart:0;const dnsEnd=timing.dnsEnd>=0?timing.dnsEnd:-1;result.dns=dnsEnd-dnsStart;const sslStart=timing.sslEnd>0?timing.sslStart:0;const sslEnd=timing.sslEnd>0?timing.sslEnd:-1;result.ssl=sslEnd-sslStart;const connectStart=timing.connectEnd>=0?leastNonNegative([dnsEnd,blockedStart]):0;const connectEnd=timing.connectEnd>=0?timing.connectEnd:-1;result.connect=connectEnd-connectStart;const sendStart=timing.sendEnd>=0?Math.max(connectEnd,dnsEnd,blockedStart):0;const sendEnd=timing.sendEnd>=0?timing.sendEnd:0;result.send=sendEnd-sendStart;if(result.send<0){result.send=0;}
highestTime=Math.max(sendEnd,connectEnd,sslEnd,dnsEnd,blockedStart,0);}else if(this._request.responseReceivedTime===-1){result.blocked=this._request.endTime-issueTime;return result;}
const requestTime=timing?timing.requestTime:startTime;const waitStart=highestTime;const waitEnd=Entry._toMilliseconds(this._request.responseReceivedTime-requestTime);result.wait=waitEnd-waitStart;const receiveStart=waitEnd;const receiveEnd=Entry._toMilliseconds(this._request.endTime-requestTime);result.receive=Math.max(receiveEnd-receiveStart,0);return result;function leastNonNegative(values){return values.reduce((best,value)=>(value>=0&&value<best)?value:best,Infinity);}}
async _buildPostData(){const postData=await this._request.requestFormData();if(!postData){return null;}
const res={mimeType:this._request.requestContentType()||'',text:postData};const formParameters=await this._request.formParameters();if(formParameters){res.params=this._buildParameters(formParameters);}
return res;}
_buildParameters(parameters){return parameters.slice();}
_buildRequestURL(url){return url.split('#',2)[0];}
_buildCookies(cookies){return cookies.map(this._buildCookie.bind(this));}
_buildCookie(cookie){const c={name:cookie.name(),value:cookie.value(),path:cookie.path(),domain:cookie.domain(),expires:cookie.expiresDate(HARLog.pseudoWallTime(this._request,this._request.startTime)),httpOnly:cookie.httpOnly(),secure:cookie.secure()};if(cookie.sameSite()){c.sameSite=cookie.sameSite();}
return c;}
async _requestBodySize(){const postData=await this._request.requestFormData();if(!postData){return 0;}
return new TextEncoder('utf-8').encode(postData).length;}
get responseBodySize(){if(this._request.cached()||this._request.statusCode===304){return 0;}
if(!this._request.responseHeadersText){return-1;}
return this._request.transferSize-this._request.responseHeadersText.length;}
get responseCompression(){if(this._request.cached()||this._request.statusCode===304||this._request.statusCode===206){return;}
if(!this._request.responseHeadersText){return;}
return this._request.resourceSize-this.responseBodySize;}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.HARLog=HARLog;SDK.HARLog.Entry=Entry;SDK.HARLog.Entry.Timing;