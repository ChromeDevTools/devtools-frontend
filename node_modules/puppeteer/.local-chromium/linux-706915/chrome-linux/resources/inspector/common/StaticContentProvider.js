export default class StaticContentProvider{constructor(contentURL,contentType,lazyContent){this._contentURL=contentURL;this._contentType=contentType;this._lazyContent=lazyContent;}
static fromString(contentURL,contentType,content){const lazyContent=()=>Promise.resolve({content,isEncoded:false});return new Common.StaticContentProvider(contentURL,contentType,lazyContent);}
contentURL(){return this._contentURL;}
contentType(){return this._contentType;}
contentEncoded(){return Promise.resolve(false);}
requestContent(){return this._lazyContent();}
async searchInContent(query,caseSensitive,isRegex){const{content}=(await this._lazyContent());return content?Common.ContentProvider.performSearchInContent(content,query,caseSensitive,isRegex):[];}}
self.Common=self.Common||{};Common=Common||{};Common.StaticContentProvider=StaticContentProvider;