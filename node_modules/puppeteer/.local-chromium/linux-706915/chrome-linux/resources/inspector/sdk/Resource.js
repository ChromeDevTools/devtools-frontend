export default class Resource{constructor(resourceTreeModel,request,url,documentURL,frameId,loaderId,type,mimeType,lastModified,contentSize){this._resourceTreeModel=resourceTreeModel;this._request=request;this.url=url;this._documentURL=documentURL;this._frameId=frameId;this._loaderId=loaderId;this._type=type||Common.resourceTypes.Other;this._mimeType=mimeType;this._lastModified=lastModified&&lastModified.isValid()?lastModified:null;this._contentSize=contentSize;this._content;this._contentLoadError;this._contentEncoded;this._pendingContentCallbacks=[];if(this._request&&!this._request.finished){this._request.addEventListener(SDK.NetworkRequest.Events.FinishedLoading,this._requestFinished,this);}}
lastModified(){if(this._lastModified||!this._request){return this._lastModified;}
const lastModifiedHeader=this._request.responseLastModified();const date=lastModifiedHeader?new Date(lastModifiedHeader):null;this._lastModified=date&&date.isValid()?date:null;return this._lastModified;}
contentSize(){if(typeof this._contentSize==='number'||!this._request){return this._contentSize;}
return this._request.resourceSize;}
get request(){return this._request;}
get url(){return this._url;}
set url(x){this._url=x;this._parsedURL=new Common.ParsedURL(x);}
get parsedURL(){return this._parsedURL;}
get documentURL(){return this._documentURL;}
get frameId(){return this._frameId;}
get loaderId(){return this._loaderId;}
get displayName(){return this._parsedURL.displayName;}
resourceType(){return this._request?this._request.resourceType():this._type;}
get mimeType(){return this._request?this._request.mimeType:this._mimeType;}
get content(){return this._content;}
contentURL(){return this._url;}
contentType(){if(this.resourceType()===Common.resourceTypes.Document&&this.mimeType.indexOf('javascript')!==-1){return Common.resourceTypes.Script;}
return this.resourceType();}
async contentEncoded(){await this.requestContent();return this._contentEncoded;}
requestContent(){if(typeof this._content!=='undefined'){return Promise.resolve({content:(this._content),isEncoded:this._contentEncoded});}
let callback;const promise=new Promise(fulfill=>callback=fulfill);this._pendingContentCallbacks.push(callback);if(!this._request||this._request.finished){this._innerRequestContent();}
return promise;}
canonicalMimeType(){return this.contentType().canonicalMimeType()||this.mimeType;}
async searchInContent(query,caseSensitive,isRegex){if(!this.frameId){return[];}
if(this.request){return this.request.searchInContent(query,caseSensitive,isRegex);}
const result=await this._resourceTreeModel.target().pageAgent().searchInResource(this.frameId,this.url,query,caseSensitive,isRegex);return result||[];}
async populateImageSource(image){const{content}=await this.requestContent();const encoded=this._contentEncoded;image.src=Common.ContentProvider.contentAsDataURL(content,this._mimeType,encoded)||this._url;}
_requestFinished(){this._request.removeEventListener(SDK.NetworkRequest.Events.FinishedLoading,this._requestFinished,this);if(this._pendingContentCallbacks.length){this._innerRequestContent();}}
async _innerRequestContent(){if(this._contentRequested){return;}
this._contentRequested=true;let loadResult;if(this.request){const contentData=await this.request.contentData();this._content=contentData.content;this._contentEncoded=contentData.encoded;loadResult={content:(contentData.content),isEncoded:contentData.encoded};}else{const response=await this._resourceTreeModel.target().pageAgent().invoke_getResourceContent({frameId:this.frameId,url:this.url});if(response[Protocol.Error]){this._contentLoadError=response[Protocol.Error];this._content=null;loadResult={error:response[Protocol.Error],isEncoded:false};}else{this._content=response.content;this._contentLoadError=null;loadResult={content:response.content,isEncoded:response.base64Encoded};}
this._contentEncoded=response.base64Encoded;}
if(this._content===null){this._contentEncoded=false;}
for(const callback of this._pendingContentCallbacks.splice(0)){callback(loadResult);}
delete this._contentRequested;}
hasTextContent(){if(this._type.isTextType()){return true;}
if(this._type===Common.resourceTypes.Other){return!!this._content&&!this._contentEncoded;}
return false;}
frame(){return this._resourceTreeModel.frameForId(this._frameId);}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.Resource=Resource;