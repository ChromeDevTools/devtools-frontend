export default class PlatformFileSystem{constructor(path,type){this._path=path;this._type=type;}
getMetadata(path){return Promise.resolve((null));}
initialFilePaths(){return[];}
initialGitFolders(){return[];}
path(){return this._path;}
embedderPath(){throw new Error('Not implemented');}
type(){return this._type;}
async createFile(path,name){return Promise.resolve(null);}
deleteFile(path){return Promise.resolve(false);}
requestFileBlob(path){return Promise.resolve((null));}
async requestFileContent(path){return{error:ls`Unable to read files with this implementation.`,isEncoded:false};}
setFileContent(path,content,isBase64){throw new Error('Not implemented');}
renameFile(path,newName,callback){callback(false);}
addExcludedFolder(path){}
removeExcludedFolder(path){}
fileSystemRemoved(){}
isFileExcluded(folderPath){return false;}
excludedFolders(){return new Set();}
searchInPath(query,progress){return Promise.resolve([]);}
indexContent(progress){setImmediate(()=>progress.done());}
mimeFromPath(path){throw new Error('Not implemented');}
canExcludeFolder(path){return false;}
contentType(path){throw new Error('Not implemented');}
tooltipForURL(url){throw new Error('Not implemented');}
supportsAutomapping(){throw new Error('Not implemented');}}
self.Persistence=self.Persistence||{};Persistence=Persistence||{};Persistence.PlatformFileSystem=PlatformFileSystem;