export default class Script{constructor(debuggerModel,scriptId,sourceURL,startLine,startColumn,endLine,endColumn,executionContextId,hash,isContentScript,isLiveEdit,sourceMapURL,hasSourceURL,length,originStackTrace){this.debuggerModel=debuggerModel;this.scriptId=scriptId;this.sourceURL=sourceURL;this.lineOffset=startLine;this.columnOffset=startColumn;this.endLine=endLine;this.endColumn=endColumn;this.executionContextId=executionContextId;this.hash=hash;this._isContentScript=isContentScript;this._isLiveEdit=isLiveEdit;this.sourceMapURL=sourceMapURL;this.hasSourceURL=hasSourceURL;this.contentLength=length;this._originalContentProvider=null;this._originalSource=null;this.originStackTrace=originStackTrace;}
static _trimSourceURLComment(source){let sourceURLIndex=source.lastIndexOf('//# sourceURL=');if(sourceURLIndex===-1){sourceURLIndex=source.lastIndexOf('//@ sourceURL=');if(sourceURLIndex===-1){return source;}}
const sourceURLLineIndex=source.lastIndexOf('\n',sourceURLIndex);if(sourceURLLineIndex===-1){return source;}
const sourceURLLine=source.substr(sourceURLLineIndex+1);if(!sourceURLLine.match(sourceURLRegex)){return source;}
return source.substr(0,sourceURLLineIndex);}
isContentScript(){return this._isContentScript;}
executionContext(){return this.debuggerModel.runtimeModel().executionContext(this.executionContextId);}
isLiveEdit(){return this._isLiveEdit;}
contentURL(){return this.sourceURL;}
contentType(){return Common.resourceTypes.Script;}
contentEncoded(){return Promise.resolve(false);}
async requestContent(){if(this._source){return{content:this._source,isEncoded:false};}
if(!this.scriptId){return{error:ls`Script removed or deleted.`,isEncoded:false};}
try{const source=await this.debuggerModel.target().debuggerAgent().getScriptSource(this.scriptId);if(source&&this.hasSourceURL){this._source=SDK.Script._trimSourceURLComment(source);}else{this._source=source||'';}
if(this._originalSource===null){this._originalSource=this._source;}
return{content:this._source,isEncoded:false};}catch(err){return{error:ls`Unable to fetch script source.`,isEncoded:false};}}
originalContentProvider(){if(!this._originalContentProvider){const lazyContent=()=>this.requestContent().then(()=>{return{content:this._originalSource,isEncoded:false,};});this._originalContentProvider=new Common.StaticContentProvider(this.contentURL(),this.contentType(),lazyContent);}
return this._originalContentProvider;}
async searchInContent(query,caseSensitive,isRegex){if(!this.scriptId){return[];}
const matches=await this.debuggerModel.target().debuggerAgent().searchInContent(this.scriptId,query,caseSensitive,isRegex);return(matches||[]).map(match=>new Common.ContentProvider.SearchMatch(match.lineNumber,match.lineContent));}
_appendSourceURLCommentIfNeeded(source){if(!this.hasSourceURL){return source;}
return source+'\n //# sourceURL='+this.sourceURL;}
async editSource(newSource,callback){newSource=Script._trimSourceURLComment(newSource);newSource=this._appendSourceURLCommentIfNeeded(newSource);if(!this.scriptId){callback('Script failed to parse');return;}
await this.requestContent();if(this._source===newSource){callback(null);return;}
const response=await this.debuggerModel.target().debuggerAgent().invoke_setScriptSource({scriptId:this.scriptId,scriptSource:newSource});if(!response[Protocol.Error]&&!response.exceptionDetails){this._source=newSource;}
const needsStepIn=!!response.stackChanged;callback(response[Protocol.Error],response.exceptionDetails,response.callFrames,response.asyncStackTrace,response.asyncStackTraceId,needsStepIn);}
rawLocation(lineNumber,columnNumber){return new SDK.DebuggerModel.Location(this.debuggerModel,this.scriptId,lineNumber,columnNumber||0);}
isInlineScript(){const startsAtZero=!this.lineOffset&&!this.columnOffset;return!!this.sourceURL&&!startsAtZero;}
isAnonymousScript(){return!this.sourceURL;}
isInlineScriptWithSourceURL(){return!!this.hasSourceURL&&this.isInlineScript();}
async setBlackboxedRanges(positions){const response=await this.debuggerModel.target().debuggerAgent().invoke_setBlackboxedRanges({scriptId:this.scriptId,positions});return!response[Protocol.Error];}
containsLocation(lineNumber,columnNumber){const afterStart=(lineNumber===this.lineOffset&&columnNumber>=this.columnOffset)||lineNumber>this.lineOffset;const beforeEnd=lineNumber<this.endLine||(lineNumber===this.endLine&&columnNumber<=this.endColumn);return afterStart&&beforeEnd;}}
export const sourceURLRegex=/^[\040\t]*\/\/[@#] sourceURL=\s*(\S*?)\s*$/;self.SDK=self.SDK||{};SDK=SDK||{};SDK.Script=Script;SDK.Script.sourceURLRegex=sourceURLRegex;