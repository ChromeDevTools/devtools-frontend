export default class UISourceCode extends Common.Object{constructor(project,url,contentType){super();this._project=project;this._url=url;const parsedURL=url.asParsedURL();if(parsedURL){this._origin=parsedURL.securityOrigin();this._parentURL=this._origin+parsedURL.folderPathComponents;this._name=parsedURL.lastPathComponent;if(parsedURL.queryParams){this._name+='?'+parsedURL.queryParams;}}else{this._origin='';this._parentURL='';this._name=url;}
this._contentType=contentType;this._requestContentPromise=null;this._decorations=null;this._hasCommits=false;this._messages=null;this._contentLoaded=false;this._content=null;this._forceLoadOnCheckContent=false;this._checkingContent=false;this._lastAcceptedContent=null;this._workingCopy=null;this._workingCopyGetter=null;}
requestMetadata(){return this._project.requestMetadata(this);}
name(){return this._name;}
mimeType(){return this._project.mimeType(this);}
url(){return this._url;}
parentURL(){return this._parentURL;}
origin(){return this._origin;}
fullDisplayName(){return this._project.fullDisplayName(this);}
displayName(skipTrim){if(!this._name){return Common.UIString('(index)');}
let name=this._name;try{if(this.project().type()===Workspace.projectTypes.FileSystem){name=unescape(name);}else{name=decodeURI(name);}}catch(e){}
return skipTrim?name:name.trimEndWithMaxLength(100);}
canRename(){return this._project.canRename();}
rename(newName){let fulfill;const promise=new Promise(x=>fulfill=x);this._project.rename(this,newName,innerCallback.bind(this));return promise;function innerCallback(success,newName,newURL,newContentType){if(success){this._updateName((newName),(newURL),(newContentType));}
fulfill(success);}}
remove(){this._project.deleteFile(this);}
_updateName(name,url,contentType){const oldURL=this._url;this._url=this._url.substring(0,this._url.length-this._name.length)+name;this._name=name;if(url){this._url=url;}
if(contentType){this._contentType=contentType;}
this.dispatchEventToListeners(Events.TitleChanged,this);this.project().workspace().dispatchEventToListeners(Workspace.Workspace.Events.UISourceCodeRenamed,{oldURL:oldURL,uiSourceCode:this});}
contentURL(){return this.url();}
contentType(){return this._contentType;}
async contentEncoded(){await this.requestContent();return this._contentEncoded||false;}
project(){return this._project;}
requestContent(){if(this._requestContentPromise){return this._requestContentPromise;}
if(this._contentLoaded){return Promise.resolve((this._content));}
this._requestContentPromise=this._requestContentImpl();return this._requestContentPromise;}
async _requestContentImpl(){try{const content=await this._project.requestFileContent(this);if(!this._contentLoaded){this._contentLoaded=true;this._content=content;this._contentEncoded=content.isEncoded;}}catch(err){this._contentLoaded=true;this._content={error:err?String(err):'',isEncoded:false};}
return(this._content);}
async checkContentUpdated(){if(!this._contentLoaded&&!this._forceLoadOnCheckContent){return;}
if(!this._project.canSetFileContent()||this._checkingContent){return;}
this._checkingContent=true;const updatedContent=await this._project.requestFileContent(this);this._checkingContent=false;if(updatedContent.content===null){const workingCopy=this.workingCopy();this._contentCommitted('',false);this.setWorkingCopy(workingCopy);return;}
if(this._lastAcceptedContent===updatedContent.content){return;}
if(this._content&&this._content.content===updatedContent.content){this._lastAcceptedContent=null;return;}
if(!this.isDirty()||this._workingCopy===updatedContent.content){this._contentCommitted((updatedContent.content),false);return;}
await Common.Revealer.reveal(this);await new Promise(resolve=>setTimeout(resolve,0));const shouldUpdate=window.confirm(ls`This file was changed externally. Would you like to reload it?`);if(shouldUpdate){this._contentCommitted((updatedContent.content),false);}else{this._lastAcceptedContent=updatedContent.content;}}
forceLoadOnCheckContent(){this._forceLoadOnCheckContent=true;}
_commitContent(content){if(this._project.canSetFileContent()){this._project.setFileContent(this,content,false);}
this._contentCommitted(content,true);}
_contentCommitted(content,committedByUser){this._lastAcceptedContent=null;this._content={content,isEncoded:false};this._contentLoaded=true;this._requestContentPromise=null;this._hasCommits=true;this._innerResetWorkingCopy();const data={uiSourceCode:this,content,encoded:this._contentEncoded};this.dispatchEventToListeners(Events.WorkingCopyCommitted,data);this._project.workspace().dispatchEventToListeners(Workspace.Workspace.Events.WorkingCopyCommitted,data);if(committedByUser){this._project.workspace().dispatchEventToListeners(Workspace.Workspace.Events.WorkingCopyCommittedByUser,data);}}
addRevision(content){this._commitContent(content);}
hasCommits(){return this._hasCommits;}
workingCopy(){if(this._workingCopyGetter){this._workingCopy=this._workingCopyGetter();this._workingCopyGetter=null;}
if(this.isDirty()){return(this._workingCopy);}
return(this._content&&this._content.content)||'';}
resetWorkingCopy(){this._innerResetWorkingCopy();this._workingCopyChanged();}
_innerResetWorkingCopy(){this._workingCopy=null;this._workingCopyGetter=null;}
setWorkingCopy(newWorkingCopy){this._workingCopy=newWorkingCopy;this._workingCopyGetter=null;this._workingCopyChanged();}
setContent(content,isBase64){this._contentEncoded=isBase64;if(this._project.canSetFileContent()){this._project.setFileContent(this,content,isBase64);}
this._contentCommitted(content,true);}
setWorkingCopyGetter(workingCopyGetter){this._workingCopyGetter=workingCopyGetter;this._workingCopyChanged();}
_workingCopyChanged(){this._removeAllMessages();this.dispatchEventToListeners(Events.WorkingCopyChanged,this);this._project.workspace().dispatchEventToListeners(Workspace.Workspace.Events.WorkingCopyChanged,{uiSourceCode:this});}
removeWorkingCopyGetter(){if(!this._workingCopyGetter){return;}
this._workingCopy=this._workingCopyGetter();this._workingCopyGetter=null;}
commitWorkingCopy(){if(this.isDirty()){this._commitContent(this.workingCopy());}}
isDirty(){return this._workingCopy!==null||this._workingCopyGetter!==null;}
extension(){return Common.ParsedURL.extractExtension(this._name);}
content(){return(this._content&&this._content.content)||'';}
loadError(){return(this._content&&this._content.error);}
searchInContent(query,caseSensitive,isRegex){const content=this.content();if(!content){return this._project.searchInFileContent(this,query,caseSensitive,isRegex);}
return Promise.resolve(Common.ContentProvider.performSearchInContent(content,query,caseSensitive,isRegex));}
contentLoaded(){return this._contentLoaded;}
uiLocation(lineNumber,columnNumber){if(typeof columnNumber==='undefined'){columnNumber=0;}
return new UILocation(this,lineNumber,columnNumber);}
messages(){return this._messages?new Set(this._messages):new Set();}
addLineMessage(level,text,lineNumber,columnNumber){return this.addMessage(level,text,new TextUtils.TextRange(lineNumber,columnNumber||0,lineNumber,columnNumber||0));}
addMessage(level,text,range){const message=new Message(this,level,text,range);if(!this._messages){this._messages=new Set();}
this._messages.add(message);this.dispatchEventToListeners(Events.MessageAdded,message);return message;}
removeMessage(message){if(this._messages&&this._messages.delete(message)){this.dispatchEventToListeners(Events.MessageRemoved,message);}}
_removeAllMessages(){if(!this._messages){return;}
for(const message of this._messages){this.dispatchEventToListeners(Events.MessageRemoved,message);}
this._messages=null;}
addLineDecoration(lineNumber,type,data){this.addDecoration(TextUtils.TextRange.createFromLocation(lineNumber,0),type,data);}
addDecoration(range,type,data){const marker=new LineMarker(range,type,data);if(!this._decorations){this._decorations=new Platform.Multimap();}
this._decorations.set(type,marker);this.dispatchEventToListeners(Events.LineDecorationAdded,marker);}
removeDecorationsForType(type){if(!this._decorations){return;}
const markers=this._decorations.get(type);this._decorations.deleteAll(type);markers.forEach(marker=>{this.dispatchEventToListeners(Events.LineDecorationRemoved,marker);});}
allDecorations(){return this._decorations?this._decorations.valuesArray():[];}
removeAllDecorations(){if(!this._decorations){return;}
const decorationList=this._decorations.valuesArray();this._decorations.clear();decorationList.forEach(marker=>this.dispatchEventToListeners(Events.LineDecorationRemoved,marker));}
decorationsForType(type){return this._decorations?this._decorations.get(type):null;}}
export const Events={WorkingCopyChanged:Symbol('WorkingCopyChanged'),WorkingCopyCommitted:Symbol('WorkingCopyCommitted'),TitleChanged:Symbol('TitleChanged'),MessageAdded:Symbol('MessageAdded'),MessageRemoved:Symbol('MessageRemoved'),LineDecorationAdded:Symbol('LineDecorationAdded'),LineDecorationRemoved:Symbol('LineDecorationRemoved')};export class UILocation{constructor(uiSourceCode,lineNumber,columnNumber){this.uiSourceCode=uiSourceCode;this.lineNumber=lineNumber;this.columnNumber=columnNumber;}
linkText(skipTrim){let linkText=this.uiSourceCode.displayName(skipTrim);if(typeof this.lineNumber==='number'){linkText+=':'+(this.lineNumber+1);}
return linkText;}
id(){return this.uiSourceCode.project().id()+':'+this.uiSourceCode.url()+':'+this.lineNumber+':'+
this.columnNumber;}
toUIString(){return this.uiSourceCode.url()+':'+(this.lineNumber+1);}
static comparator(location1,location2){return location1.compareTo(location2);}
compareTo(other){if(this.uiSourceCode.url()!==other.uiSourceCode.url()){return this.uiSourceCode.url()>other.uiSourceCode.url()?1:-1;}
if(this.lineNumber!==other.lineNumber){return this.lineNumber-other.lineNumber;}
return this.columnNumber-other.columnNumber;}}
export class Message{constructor(uiSourceCode,level,text,range){this._uiSourceCode=uiSourceCode;this._level=level;this._text=text;this._range=range;}
uiSourceCode(){return this._uiSourceCode;}
level(){return this._level;}
text(){return this._text;}
range(){return this._range;}
lineNumber(){return this._range.startLine;}
columnNumber(){return this._range.startColumn;}
isEqual(another){return this._uiSourceCode===another._uiSourceCode&&this.text()===another.text()&&this.level()===another.level()&&this.range().equal(another.range());}
remove(){this._uiSourceCode.removeMessage(this);}}
Message.Level={Error:'Error',Warning:'Warning'};export class LineMarker{constructor(range,type,data){this._range=range;this._type=type;this._data=data;}
range(){return this._range;}
type(){return this._type;}
data(){return this._data;}}
export class UISourceCodeMetadata{constructor(modificationTime,contentSize){this.modificationTime=modificationTime;this.contentSize=contentSize;}}
self.Workspace=self.Workspace||{};Workspace=Workspace||{};Workspace.UISourceCode=UISourceCode;Workspace.UISourceCode.Events=Events;Workspace.UISourceCode.Message=Message;Workspace.UISourceCode.LineMarker=LineMarker;Workspace.UILocation=UILocation;Workspace.UISourceCodeMetadata=UISourceCodeMetadata;