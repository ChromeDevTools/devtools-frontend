export default class CSSStyleSheetHeader{constructor(cssModel,payload){this._cssModel=cssModel;this.id=payload.styleSheetId;this.frameId=payload.frameId;this.sourceURL=payload.sourceURL;this.hasSourceURL=!!payload.hasSourceURL;this.origin=payload.origin;this.title=payload.title;this.disabled=payload.disabled;this.isInline=payload.isInline;this.startLine=payload.startLine;this.startColumn=payload.startColumn;this.endLine=payload.endLine;this.endColumn=payload.endColumn;this.contentLength=payload.length;if(payload.ownerNode){this.ownerNode=new SDK.DeferredDOMNode(cssModel.target(),payload.ownerNode);}
this.setSourceMapURL(payload.sourceMapURL);}
originalContentProvider(){if(!this._originalContentProvider){const lazyContent=(async()=>{const originalText=await this._cssModel.originalStyleSheetText(this);if(!originalText){return{error:ls`Could not find the original style sheet.`,isEncoded:false};}
return{content:originalText,isEncoded:false};});this._originalContentProvider=new Common.StaticContentProvider(this.contentURL(),this.contentType(),lazyContent);}
return this._originalContentProvider;}
setSourceMapURL(sourceMapURL){this.sourceMapURL=sourceMapURL;}
cssModel(){return this._cssModel;}
isAnonymousInlineStyleSheet(){return!this.resourceURL()&&!this._cssModel.sourceMapManager().sourceMapForClient(this);}
resourceURL(){return this.isViaInspector()?this._viaInspectorResourceURL():this.sourceURL;}
_viaInspectorResourceURL(){const frame=this._cssModel.target().model(SDK.ResourceTreeModel).frameForId(this.frameId);console.assert(frame);const parsedURL=new Common.ParsedURL(frame.url);let fakeURL='inspector://'+parsedURL.host+parsedURL.folderPathComponents;if(!fakeURL.endsWith('/')){fakeURL+='/';}
fakeURL+='inspector-stylesheet';return fakeURL;}
lineNumberInSource(lineNumberInStyleSheet){return this.startLine+lineNumberInStyleSheet;}
columnNumberInSource(lineNumberInStyleSheet,columnNumberInStyleSheet){return(lineNumberInStyleSheet?0:this.startColumn)+columnNumberInStyleSheet;}
containsLocation(lineNumber,columnNumber){const afterStart=(lineNumber===this.startLine&&columnNumber>=this.startColumn)||lineNumber>this.startLine;const beforeEnd=lineNumber<this.endLine||(lineNumber===this.endLine&&columnNumber<=this.endColumn);return afterStart&&beforeEnd;}
contentURL(){return this.resourceURL();}
contentType(){return Common.resourceTypes.Stylesheet;}
contentEncoded(){return Promise.resolve(false);}
async requestContent(){try{const cssText=await this._cssModel.getStyleSheetText(this.id);return{content:(cssText),isEncoded:false};}catch(err){return{error:ls`There was an error retrieving the source styles.`,isEncoded:false,};}}
async searchInContent(query,caseSensitive,isRegex){const{content}=await this.requestContent();return Common.ContentProvider.performSearchInContent(content||'',query,caseSensitive,isRegex);}
isViaInspector(){return this.origin==='inspector';}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.CSSStyleSheetHeader=CSSStyleSheetHeader;