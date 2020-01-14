export class ProjectSearchConfig{query(){}
ignoreCase(){}
isRegex(){}
queries(){}
filePathMatchesFileQuery(filePath){}}
export class Project{workspace(){}
id(){}
type(){}
isServiceProject(){}
displayName(){}
requestMetadata(uiSourceCode){}
requestFileContent(uiSourceCode){}
canSetFileContent(){}
setFileContent(uiSourceCode,newContent,isBase64){}
fullDisplayName(uiSourceCode){}
mimeType(uiSourceCode){}
canRename(){}
rename(uiSourceCode,newName,callback){}
excludeFolder(path){}
canExcludeFolder(path){}
createFile(path,name,content,isBase64){}
canCreateFile(){}
deleteFile(uiSourceCode){}
remove(){}
searchInFileContent(uiSourceCode,query,caseSensitive,isRegex){}
findFilesMatchingSearchRequest(searchConfig,filesMathingFileQuery,progress){}
indexContent(progress){}
uiSourceCodeForURL(url){}
uiSourceCodes(){}}
export const projectTypes={Debugger:'debugger',Formatter:'formatter',Network:'network',FileSystem:'filesystem',ContentScripts:'contentscripts',Service:'service'};export class ProjectStore{constructor(workspace,id,type,displayName){this._workspace=workspace;this._id=id;this._type=type;this._displayName=displayName;this._uiSourceCodesMap=new Map();this._uiSourceCodesList=[];this._project=(this);}
id(){return this._id;}
type(){return this._type;}
displayName(){return this._displayName;}
workspace(){return this._workspace;}
createUISourceCode(url,contentType){return new Workspace.UISourceCode(this._project,url,contentType);}
addUISourceCode(uiSourceCode){const url=uiSourceCode.url();if(this.uiSourceCodeForURL(url)){return false;}
this._uiSourceCodesMap.set(url,{uiSourceCode:uiSourceCode,index:this._uiSourceCodesList.length});this._uiSourceCodesList.push(uiSourceCode);this._workspace.dispatchEventToListeners(Events.UISourceCodeAdded,uiSourceCode);return true;}
removeUISourceCode(url){const uiSourceCode=this.uiSourceCodeForURL(url);if(!uiSourceCode){return;}
const entry=this._uiSourceCodesMap.get(url);const movedUISourceCode=this._uiSourceCodesList[this._uiSourceCodesList.length-1];this._uiSourceCodesList[entry.index]=movedUISourceCode;const movedEntry=this._uiSourceCodesMap.get(movedUISourceCode.url());movedEntry.index=entry.index;this._uiSourceCodesList.splice(this._uiSourceCodesList.length-1,1);this._uiSourceCodesMap.delete(url);this._workspace.dispatchEventToListeners(Events.UISourceCodeRemoved,entry.uiSourceCode);}
removeProject(){this._workspace._removeProject(this._project);this._uiSourceCodesMap=new Map();this._uiSourceCodesList=[];}
uiSourceCodeForURL(url){const entry=this._uiSourceCodesMap.get(url);return entry?entry.uiSourceCode:null;}
uiSourceCodes(){return this._uiSourceCodesList;}
renameUISourceCode(uiSourceCode,newName){const oldPath=uiSourceCode.url();const newPath=uiSourceCode.parentURL()?uiSourceCode.parentURL()+'/'+newName:newName;const value=(this._uiSourceCodesMap.get(oldPath));this._uiSourceCodesMap.set(newPath,value);this._uiSourceCodesMap.delete(oldPath);}}
export default class WorkspaceImpl extends Common.Object{constructor(){super();this._projects=new Map();this._hasResourceContentTrackingExtensions=false;}
uiSourceCode(projectId,url){const project=this._projects.get(projectId);return project?project.uiSourceCodeForURL(url):null;}
uiSourceCodeForURL(url){for(const project of this._projects.values()){const uiSourceCode=project.uiSourceCodeForURL(url);if(uiSourceCode){return uiSourceCode;}}
return null;}
uiSourceCodesForProjectType(type){let result=[];for(const project of this._projects.values()){if(project.type()===type){result=result.concat(project.uiSourceCodes());}}
return result;}
addProject(project){console.assert(!this._projects.has(project.id()),`A project with id ${project.id()} already exists!`);this._projects.set(project.id(),project);this.dispatchEventToListeners(Events.ProjectAdded,project);}
_removeProject(project){this._projects.delete(project.id());this.dispatchEventToListeners(Events.ProjectRemoved,project);}
project(projectId){return this._projects.get(projectId)||null;}
projects(){return this._projects.valuesArray();}
projectsForType(type){function filterByType(project){return project.type()===type;}
return this.projects().filter(filterByType);}
uiSourceCodes(){let result=[];for(const project of this._projects.values()){result=result.concat(project.uiSourceCodes());}
return result;}
setHasResourceContentTrackingExtensions(hasExtensions){this._hasResourceContentTrackingExtensions=hasExtensions;}
hasResourceContentTrackingExtensions(){return this._hasResourceContentTrackingExtensions;}}
export const Events={UISourceCodeAdded:Symbol('UISourceCodeAdded'),UISourceCodeRemoved:Symbol('UISourceCodeRemoved'),UISourceCodeRenamed:Symbol('UISourceCodeRenamed'),WorkingCopyChanged:Symbol('WorkingCopyChanged'),WorkingCopyCommitted:Symbol('WorkingCopyCommitted'),WorkingCopyCommittedByUser:Symbol('WorkingCopyCommittedByUser'),ProjectAdded:Symbol('ProjectAdded'),ProjectRemoved:Symbol('ProjectRemoved')};self.Workspace=self.Workspace||{};Workspace=Workspace||{};Workspace.Workspace=WorkspaceImpl;Workspace.Workspace.Events=Events;Workspace.ProjectSearchConfig=ProjectSearchConfig;Workspace.Project=Project;Workspace.projectTypes=projectTypes;Workspace.ProjectStore=ProjectStore;Workspace.workspace;