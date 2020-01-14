Snippets.SnippetFileSystem=class extends Persistence.PlatformFileSystem{constructor(){super('snippet://','snippets');this._lastSnippetIdentifierSetting=Common.settings.createSetting('scriptSnippets_lastIdentifier',0);this._snippetsSetting=Common.settings.createSetting('scriptSnippets',[]);}
initialFilePaths(){const savedSnippets=this._snippetsSetting.get();return savedSnippets.map(snippet=>escape(snippet.name));}
async createFile(path,name){const nextId=this._lastSnippetIdentifierSetting.get()+1;this._lastSnippetIdentifierSetting.set(nextId);const snippetName=ls`Script snippet #${nextId}`;const snippets=this._snippetsSetting.get();snippets.push({name:snippetName,content:''});this._snippetsSetting.set(snippets);return escape(snippetName);}
async deleteFile(path){const name=unescape(path.substring(1));const allSnippets=this._snippetsSetting.get();const snippets=allSnippets.filter(snippet=>snippet.name!==name);if(allSnippets.length!==snippets.length){this._snippetsSetting.set(snippets);return true;}
return false;}
async requestFileContent(path){const name=unescape(path.substring(1));const snippet=this._snippetsSetting.get().find(snippet=>snippet.name===name);return{content:snippet?snippet.content:null,isEncoded:false};}
async setFileContent(path,content,isBase64){const name=unescape(path.substring(1));const snippets=this._snippetsSetting.get();const snippet=snippets.find(snippet=>snippet.name===name);if(snippet){snippet.content=content;this._snippetsSetting.set(snippets);return true;}
return false;}
renameFile(path,newName,callback){const name=unescape(path.substring(1));const snippets=this._snippetsSetting.get();const snippet=snippets.find(snippet=>snippet.name===name);newName=newName.trim();if(!snippet||newName.length===0||snippets.find(snippet=>snippet.name===newName)){callback(false);return;}
snippet.name=newName;this._snippetsSetting.set(snippets);callback(true,newName);}
async searchInPath(query,progress){const re=new RegExp(query.escapeForRegExp(),'i');const snippets=this._snippetsSetting.get().filter(snippet=>snippet.content.match(re));return snippets.map(snippet=>escape(snippet.name));}
mimeFromPath(path){return'text/javascript';}
contentType(path){return Common.resourceTypes.Script;}
tooltipForURL(url){return ls`Linked to ${unescape(url.substring(this.path().length))}`;}
supportsAutomapping(){return true;}};Snippets.evaluateScriptSnippet=async function(uiSourceCode){if(!uiSourceCode.url().startsWith('snippet://')){return;}
const executionContext=UI.context.flavor(SDK.ExecutionContext);if(!executionContext){return;}
const runtimeModel=executionContext.runtimeModel;await uiSourceCode.requestContent();uiSourceCode.commitWorkingCopy();const expression=uiSourceCode.workingCopy();Common.console.show();const url=uiSourceCode.url();const result=await executionContext.evaluate({expression:`${expression}\n//# sourceURL=${url}`,objectGroup:'console',silent:false,includeCommandLineAPI:true,returnByValue:false,generatePreview:true,},false,true);if(result.exceptionDetails){SDK.consoleModel.addMessage(SDK.ConsoleMessage.fromException(runtimeModel,result.exceptionDetails,undefined,undefined,url));return;}
if(!result.object){return;}
const scripts=executionContext.debuggerModel.scriptsForSourceURL(url);const scriptId=scripts[scripts.length-1].scriptId;SDK.consoleModel.addMessage(new SDK.ConsoleMessage(runtimeModel,SDK.ConsoleMessage.MessageSource.JS,SDK.ConsoleMessage.MessageLevel.Info,'',SDK.ConsoleMessage.MessageType.Result,url,undefined,undefined,[result.object],undefined,undefined,executionContext.id,scriptId));};Snippets.isSnippetsUISourceCode=function(uiSourceCode){return uiSourceCode.url().startsWith('snippet://');};Snippets.isSnippetsProject=function(project){return project.type()===Workspace.projectTypes.FileSystem&&Persistence.FileSystemWorkspaceBinding.fileSystemType(project)==='snippets';};Persistence.isolatedFileSystemManager.addPlatformFileSystem('snippet://',new Snippets.SnippetFileSystem());Snippets.project=(Workspace.workspace.projectsForType(Workspace.projectTypes.FileSystem).find(project=>Persistence.FileSystemWorkspaceBinding.fileSystemType(project)==='snippets'));;Snippets.SnippetsQuickOpen=class extends QuickOpen.FilteredListWidget.Provider{constructor(){super();this._snippets=[];}
selectItem(itemIndex,promptValue){if(itemIndex===null){return;}
Snippets.evaluateScriptSnippet(this._snippets[itemIndex]);}
notFoundText(query){return Common.UIString('No snippets found.');}
attach(){this._snippets=Snippets.project.uiSourceCodes();}
detach(){this._snippets=[];}
itemCount(){return this._snippets.length;}
itemKeyAt(itemIndex){return this._snippets[itemIndex].name();}
renderItem(itemIndex,query,titleElement,subtitleElement){titleElement.textContent=unescape(this._snippets[itemIndex].name());titleElement.classList.add('monospace');QuickOpen.FilteredListWidget.highlightRanges(titleElement,query,true);}};;