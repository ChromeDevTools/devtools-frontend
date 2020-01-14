export default class CookieModel extends SDK.SDKModel{constructor(target){super(target);}
static cookieMatchesResourceURL(cookie,resourceURL){const url=resourceURL.asParsedURL();if(!url||!CookieModel.cookieDomainMatchesResourceDomain(cookie.domain(),url.host)){return false;}
return(url.path.startsWith(cookie.path())&&(!cookie.port()||url.port===cookie.port())&&(!cookie.secure()||url.scheme==='https'));}
static cookieDomainMatchesResourceDomain(cookieDomain,resourceDomain){if(cookieDomain.charAt(0)!=='.'){return resourceDomain===cookieDomain;}
return!!resourceDomain.match(new RegExp('^([^\\.]+\\.)*'+cookieDomain.substring(1).escapeForRegExp()+'$','i'));}
getCookies(urls){return this.target().networkAgent().getCookies(urls).then(cookies=>(cookies||[]).map(cookie=>SDK.Cookie.fromProtocolCookie(cookie)));}
deleteCookie(cookie,callback){this._deleteAll([cookie],callback);}
clear(domain,callback){this.getCookiesForDomain(domain||null).then(cookies=>this._deleteAll(cookies,callback));}
saveCookie(cookie){let domain=cookie.domain();if(!domain.startsWith('.')){domain='';}
let expires=undefined;if(cookie.expires()){expires=Math.floor(Date.parse(cookie.expires())/1000);}
return this.target().networkAgent().setCookie(cookie.name(),cookie.value(),cookie.url(),domain,cookie.path(),cookie.secure(),cookie.httpOnly(),cookie.sameSite(),expires).then(success=>!!success);}
getCookiesForDomain(domain){const resourceURLs=[];function populateResourceURLs(resource){const documentURL=resource.documentURL.asParsedURL();if(documentURL&&(!domain||documentURL.securityOrigin()===domain)){resourceURLs.push(resource.url);}}
const resourceTreeModel=this.target().model(SDK.ResourceTreeModel);if(resourceTreeModel){resourceTreeModel.forAllResources(populateResourceURLs);}
return this.getCookies(resourceURLs);}
_deleteAll(cookies,callback){const networkAgent=this.target().networkAgent();Promise.all(cookies.map(cookie=>networkAgent.deleteCookies(cookie.name(),undefined,cookie.domain(),cookie.path()))).then(callback||function(){});}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.CookieModel=CookieModel;SDK.SDKModel.register(SDK.CookieModel,SDK.Target.Capability.Network,false);