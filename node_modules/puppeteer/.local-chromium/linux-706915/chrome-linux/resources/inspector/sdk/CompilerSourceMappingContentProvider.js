export class CompilerSourceMappingContentProvider{constructor(sourceURL,contentType){this._sourceURL=sourceURL;this._contentType=contentType;}
contentURL(){return this._sourceURL;}
contentType(){return this._contentType;}
contentEncoded(){return Promise.resolve(false);}
requestContent(){return new Promise(resolve=>{SDK.multitargetNetworkManager.loadResource(this._sourceURL,(statusCode,_headers,content)=>{if(statusCode>=400){const error=ls`Could not load content for ${this._sourceURL} : HTTP status code: ${statusCode}`;console.error(error);resolve({error,isEncoded:false});}else{resolve({content,isEncoded:false});}});});}
async searchInContent(query,caseSensitive,isRegex){const{content}=await this.requestContent();if(typeof content!=='string'){return[];}
return Common.ContentProvider.performSearchInContent(content,query,caseSensitive,isRegex);}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.CompilerSourceMappingContentProvider=CompilerSourceMappingContentProvider;