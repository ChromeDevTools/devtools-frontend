export default class ContentProviderBasedProject extends Workspace.ProjectStore{constructor(workspace,id,type,displayName,isServiceProject){super(workspace,id,type,displayName);this._contentProviders={};this._isServiceProject=isServiceProject;workspace.addProject(this);}
async requestFileContent(uiSourceCode){const contentProvider=this._contentProviders[uiSourceCode.url()];try{const[content,isEncoded]=await Promise.all([contentProvider.requestContent(),contentProvider.contentEncoded()]);return{content:content.content,isEncoded,error:content.error};}catch(err){return{isEncoded:false,error:err?String(err):ls`Unknown error loading file`};}}
isServiceProject(){return this._isServiceProject;}
requestMetadata(uiSourceCode){return Promise.resolve(uiSourceCode[_metadata]);}
canSetFileContent(){return false;}
async setFileContent(uiSourceCode,newContent,isBase64){}
fullDisplayName(uiSourceCode){let parentPath=uiSourceCode.parentURL().replace(/^(?:https?|file)\:\/\//,'');try{parentPath=decodeURI(parentPath);}catch(e){}
return parentPath+'/'+uiSourceCode.displayName(true);}
mimeType(uiSourceCode){return(uiSourceCode[_mimeType]);}
canRename(){return false;}
rename(uiSourceCode,newName,callback){const path=uiSourceCode.url();this.performRename(path,newName,innerCallback.bind(this));function innerCallback(success,newName){if(success&&newName){const copyOfPath=path.split('/');copyOfPath[copyOfPath.length-1]=newName;const newPath=copyOfPath.join('/');this._contentProviders[newPath]=this._contentProviders[path];delete this._contentProviders[path];this.renameUISourceCode(uiSourceCode,newName);}
callback(success,newName);}}
excludeFolder(path){}
canExcludeFolder(path){return false;}
createFile(path,name,content,isBase64){}
canCreateFile(){return false;}
deleteFile(uiSourceCode){}
remove(){}
performRename(path,newName,callback){callback(false);}
searchInFileContent(uiSourceCode,query,caseSensitive,isRegex){const contentProvider=this._contentProviders[uiSourceCode.url()];return contentProvider.searchInContent(query,caseSensitive,isRegex);}
async findFilesMatchingSearchRequest(searchConfig,filesMathingFileQuery,progress){const result=[];progress.setTotalWork(filesMathingFileQuery.length);await Promise.all(filesMathingFileQuery.map(searchInContent.bind(this)));progress.done();return result;async function searchInContent(path){const provider=this._contentProviders[path];let allMatchesFound=true;for(const query of searchConfig.queries().slice()){const searchMatches=await provider.searchInContent(query,!searchConfig.ignoreCase(),searchConfig.isRegex());if(!searchMatches.length){allMatchesFound=false;break;}}
if(allMatchesFound){result.push(path);}
progress.worked(1);}}
indexContent(progress){setImmediate(progress.done.bind(progress));}
addUISourceCodeWithProvider(uiSourceCode,contentProvider,metadata,mimeType){uiSourceCode[_mimeType]=mimeType;this._contentProviders[uiSourceCode.url()]=contentProvider;uiSourceCode[_metadata]=metadata;this.addUISourceCode(uiSourceCode);}
addContentProvider(url,contentProvider,mimeType){const uiSourceCode=this.createUISourceCode(url,contentProvider.contentType());this.addUISourceCodeWithProvider(uiSourceCode,contentProvider,null,mimeType);return uiSourceCode;}
removeFile(path){delete this._contentProviders[path];this.removeUISourceCode(path);}
reset(){this._contentProviders={};this.removeProject();this.workspace().addProject(this);}
dispose(){this._contentProviders={};this.removeProject();}}
export const _metadata=Symbol('ContentProviderBasedProject.Metadata');export const _mimeType=Symbol('ContentProviderBasedProject.MimeType');self.Bindings=self.Bindings||{};Bindings=Bindings||{};Bindings.ContentProviderBasedProject=ContentProviderBasedProject;Bindings.ContentProviderBasedProject._metadata=_metadata;Bindings.ContentProviderBasedProject._mimeType=_mimeType;