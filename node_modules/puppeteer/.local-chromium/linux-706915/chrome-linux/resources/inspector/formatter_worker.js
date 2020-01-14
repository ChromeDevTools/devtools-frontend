const _loadedScripts={};(function(){const baseUrl=self.location?self.location.origin+self.location.pathname:'';self._importScriptPathPrefix=baseUrl.substring(0,baseUrl.lastIndexOf('/')+1);})();const REMOTE_MODULE_FALLBACK_REVISION='@010ddcfda246975d194964ccf20038ebbdec6084';class Runtime{constructor(descriptors){this._modules=[];this._modulesMap={};this._extensions=[];this._cachedTypeClasses={};this._descriptorsMap={};for(let i=0;i<descriptors.length;++i){this._registerModule(descriptors[i]);}}
static loadResourcePromise(url){return new Promise(load);function load(fulfill,reject){const xhr=new XMLHttpRequest();xhr.open('GET',url,true);xhr.onreadystatechange=onreadystatechange;function onreadystatechange(e){if(xhr.readyState!==XMLHttpRequest.DONE){return;}
const status=/^HTTP\/1.1 404/.test(e.target.response)?404:xhr.status;if([0,200,304].indexOf(status)===-1)
{reject(new Error('While loading from url '+url+' server responded with a status of '+status));}else{fulfill(e.target.response);}}
xhr.send(null);}}
static loadResourcePromiseWithFallback(url){return Runtime.loadResourcePromise(url).catch(err=>{const urlWithFallbackVersion=url.replace(/@[0-9a-f]{40}/,REMOTE_MODULE_FALLBACK_REVISION);if(urlWithFallbackVersion===url||!url.includes('audits_worker_module')){throw err;}
return Runtime.loadResourcePromise(urlWithFallbackVersion);});}
static normalizePath(path){if(path.indexOf('..')===-1&&path.indexOf('.')===-1){return path;}
const normalizedSegments=[];const segments=path.split('/');for(let i=0;i<segments.length;i++){const segment=segments[i];if(segment==='.'){continue;}else if(segment==='..'){normalizedSegments.pop();}else if(segment){normalizedSegments.push(segment);}}
let normalizedPath=normalizedSegments.join('/');if(normalizedPath[normalizedPath.length-1]==='/'){return normalizedPath;}
if(path[0]==='/'&&normalizedPath){normalizedPath='/'+normalizedPath;}
if((path[path.length-1]==='/')||(segments[segments.length-1]==='.')||(segments[segments.length-1]==='..')){normalizedPath=normalizedPath+'/';}
return normalizedPath;}
static getResourceURL(scriptName,base){const sourceURL=(base||self._importScriptPathPrefix)+scriptName;const schemaIndex=sourceURL.indexOf('://')+3;let pathIndex=sourceURL.indexOf('/',schemaIndex);if(pathIndex===-1){pathIndex=sourceURL.length;}
return sourceURL.substring(0,pathIndex)+Runtime.normalizePath(sourceURL.substring(pathIndex));}
static _loadScriptsPromise(scriptNames,base){const promises=[];const urls=[];const sources=new Array(scriptNames.length);let scriptToEval=0;for(let i=0;i<scriptNames.length;++i){const scriptName=scriptNames[i];const sourceURL=Runtime.getResourceURL(scriptName,base);if(_loadedScripts[sourceURL]){continue;}
urls.push(sourceURL);const loadResourcePromise=base?Runtime.loadResourcePromiseWithFallback(sourceURL):Runtime.loadResourcePromise(sourceURL);promises.push(loadResourcePromise.then(scriptSourceLoaded.bind(null,i),scriptSourceLoaded.bind(null,i,undefined)));}
return Promise.all(promises).then(undefined);function scriptSourceLoaded(scriptNumber,scriptSource){sources[scriptNumber]=scriptSource||'';while(typeof sources[scriptToEval]!=='undefined'){evaluateScript(urls[scriptToEval],sources[scriptToEval]);++scriptToEval;}}
function evaluateScript(sourceURL,scriptSource){_loadedScripts[sourceURL]=true;if(!scriptSource){console.error('Empty response arrived for script \''+sourceURL+'\'');return;}
self.eval(scriptSource+'\n//# sourceURL='+sourceURL);}}
static _loadResourceIntoCache(url,appendSourceURL){return Runtime.loadResourcePromise(url).then(cacheResource.bind(this,url),cacheResource.bind(this,url,undefined));function cacheResource(path,content){if(!content){console.error('Failed to load resource: '+path);return;}
const sourceURL=appendSourceURL?Runtime.resolveSourceURL(path):'';Runtime.cachedResources[path]=content+sourceURL;}}
static async appStarted(){return Runtime._appStartedPromise;}
static async startApplication(appName){console.timeStamp('Root.Runtime.startApplication');const allDescriptorsByName={};for(let i=0;i<Root.allDescriptors.length;++i){const d=Root.allDescriptors[i];allDescriptorsByName[d['name']]=d;}
if(!Root.applicationDescriptor){let data=await Runtime.loadResourcePromise(appName+'.json');Root.applicationDescriptor=JSON.parse(data);let descriptor=Root.applicationDescriptor;while(descriptor.extends){data=await Runtime.loadResourcePromise(descriptor.extends+'.json');descriptor=JSON.parse(data);Root.applicationDescriptor.modules=descriptor.modules.concat(Root.applicationDescriptor.modules);}}
const configuration=Root.applicationDescriptor.modules;const moduleJSONPromises=[];const coreModuleNames=[];for(let i=0;i<configuration.length;++i){const descriptor=configuration[i];const name=descriptor['name'];const moduleJSON=allDescriptorsByName[name];if(moduleJSON){moduleJSONPromises.push(Promise.resolve(moduleJSON));}else{moduleJSONPromises.push(Runtime.loadResourcePromise(name+'/module.json').then(JSON.parse.bind(JSON)));}
if(descriptor['type']==='autostart'){coreModuleNames.push(name);}}
const moduleDescriptors=await Promise.all(moduleJSONPromises);for(let i=0;i<moduleDescriptors.length;++i){moduleDescriptors[i].name=configuration[i]['name'];moduleDescriptors[i].condition=configuration[i]['condition'];moduleDescriptors[i].remote=configuration[i]['type']==='remote';}
self.runtime=new Runtime(moduleDescriptors);if(coreModuleNames){await self.runtime._loadAutoStartModules(coreModuleNames);}
Runtime._appStartedPromiseCallback();}
static startWorker(appName){return Root.Runtime.startApplication(appName).then(sendWorkerReady);function sendWorkerReady(){self.postMessage('workerReady');}}
static queryParam(name){return Runtime._queryParamsObject.get(name);}
static queryParamsString(){return location.search;}
static _experimentsSetting(){try{return(JSON.parse(self.localStorage&&self.localStorage['experiments']?self.localStorage['experiments']:'{}'));}catch(e){console.error('Failed to parse localStorage[\'experiments\']');return{};}}
static _assert(value,message){if(value){return;}
Runtime._originalAssert.call(Runtime._console,value,message+' '+new Error().stack);}
static setPlatform(platform){Runtime._platform=platform;}
static _isDescriptorEnabled(descriptor){const activatorExperiment=descriptor['experiment'];if(activatorExperiment==='*'){return Runtime.experiments.supportEnabled();}
if(activatorExperiment&&activatorExperiment.startsWith('!')&&Runtime.experiments.isEnabled(activatorExperiment.substring(1))){return false;}
if(activatorExperiment&&!activatorExperiment.startsWith('!')&&!Runtime.experiments.isEnabled(activatorExperiment)){return false;}
const condition=descriptor['condition'];if(condition&&!condition.startsWith('!')&&!Runtime.queryParam(condition)){return false;}
if(condition&&condition.startsWith('!')&&Runtime.queryParam(condition.substring(1))){return false;}
return true;}
static resolveSourceURL(path){let sourceURL=self.location.href;if(self.location.search){sourceURL=sourceURL.replace(self.location.search,'');}
sourceURL=sourceURL.substring(0,sourceURL.lastIndexOf('/')+1)+path;return'\n/*# sourceURL='+sourceURL+' */';}
static setL10nCallback(localizationFunction){Runtime._l10nCallback=localizationFunction;}
useTestBase(){Runtime._remoteBase='http://localhost:8000/inspector-sources/';if(Runtime.queryParam('debugFrontend')){Runtime._remoteBase+='debug/';}}
module(moduleName){return this._modulesMap[moduleName];}
_registerModule(descriptor){const module=new Runtime.Module(this,descriptor);this._modules.push(module);this._modulesMap[descriptor['name']]=module;}
loadModulePromise(moduleName){return this._modulesMap[moduleName]._loadPromise();}
_loadAutoStartModules(moduleNames){const promises=[];for(let i=0;i<moduleNames.length;++i){promises.push(this.loadModulePromise(moduleNames[i]));}
return Promise.all(promises);}
_checkExtensionApplicability(extension,predicate){if(!predicate){return false;}
const contextTypes=extension.descriptor().contextTypes;if(!contextTypes){return true;}
for(let i=0;i<contextTypes.length;++i){const contextType=this._resolve(contextTypes[i]);const isMatching=!!contextType&&predicate(contextType);if(isMatching){return true;}}
return false;}
isExtensionApplicableToContext(extension,context){if(!context){return true;}
return this._checkExtensionApplicability(extension,isInstanceOf);function isInstanceOf(targetType){return context instanceof targetType;}}
isExtensionApplicableToContextTypes(extension,currentContextTypes){if(!extension.descriptor().contextTypes){return true;}
return this._checkExtensionApplicability(extension,currentContextTypes?isContextTypeKnown:null);function isContextTypeKnown(targetType){return currentContextTypes.has(targetType);}}
extensions(type,context,sortByTitle){return this._extensions.filter(filter).sort(sortByTitle?titleComparator:orderComparator);function filter(extension){if(extension._type!==type&&extension._typeClass()!==type){return false;}
if(!extension.enabled()){return false;}
return!context||extension.isApplicable(context);}
function orderComparator(extension1,extension2){const order1=extension1.descriptor()['order']||0;const order2=extension2.descriptor()['order']||0;return order1-order2;}
function titleComparator(extension1,extension2){const title1=extension1.title()||'';const title2=extension2.title()||'';return title1.localeCompare(title2);}}
extension(type,context){return this.extensions(type,context)[0]||null;}
allInstances(type,context){return Promise.all(this.extensions(type,context).map(extension=>extension.instance()));}
_resolve(typeName){if(!this._cachedTypeClasses[typeName]){const path=typeName.split('.');let object=self;for(let i=0;object&&(i<path.length);++i){object=object[path[i]];}
if(object){this._cachedTypeClasses[typeName]=(object);}}
return this._cachedTypeClasses[typeName]||null;}
sharedInstance(constructorFunction){if(Runtime._instanceSymbol in constructorFunction&&Object.getOwnPropertySymbols(constructorFunction).includes(Runtime._instanceSymbol)){return constructorFunction[Runtime._instanceSymbol];}
const instance=new constructorFunction();constructorFunction[Runtime._instanceSymbol]=instance;return instance;}}
Runtime._queryParamsObject=new URLSearchParams(Runtime.queryParamsString());Runtime._instanceSymbol=Symbol('instance');Runtime.cachedResources={__proto__:null};Runtime._console=console;Runtime._originalAssert=console.assert;Runtime._platform='';class ModuleDescriptor{constructor(){this.name;this.extensions;this.dependencies;this.scripts;this.condition;this.remote;}}
class RuntimeExtensionDescriptor{constructor(){this.type;this.className;this.factoryName;this.contextTypes;}}
class Module{constructor(manager,descriptor){this._manager=manager;this._descriptor=descriptor;this._name=descriptor.name;this._extensions=[];this._extensionsByClassName=new Map();const extensions=(descriptor.extensions);for(let i=0;extensions&&i<extensions.length;++i){const extension=new Extension(this,extensions[i]);this._manager._extensions.push(extension);this._extensions.push(extension);}
this._loadedForTest=false;}
name(){return this._name;}
enabled(){return Runtime._isDescriptorEnabled(this._descriptor);}
resource(name){const fullName=this._name+'/'+name;const content=Runtime.cachedResources[fullName];if(!content){throw new Error(fullName+' not preloaded. Check module.json');}
return content;}
_loadPromise(){if(!this.enabled()){return Promise.reject(new Error('Module '+this._name+' is not enabled'));}
if(this._pendingLoadPromise){return this._pendingLoadPromise;}
const dependencies=this._descriptor.dependencies;const dependencyPromises=[];for(let i=0;dependencies&&i<dependencies.length;++i){dependencyPromises.push(this._manager._modulesMap[dependencies[i]]._loadPromise());}
this._pendingLoadPromise=Promise.all(dependencyPromises).then(this._loadResources.bind(this)).then(this._loadScripts.bind(this)).then(()=>this._loadedForTest=true);return this._pendingLoadPromise;}
_loadResources(){const resources=this._descriptor['resources'];if(!resources||!resources.length){return Promise.resolve();}
const promises=[];for(let i=0;i<resources.length;++i){const url=this._modularizeURL(resources[i]);const isHtml=url.endsWith('.html');promises.push(Runtime._loadResourceIntoCache(url,!isHtml));}
return Promise.all(promises).then(undefined);}
_loadScripts(){if(!this._descriptor.scripts||!this._descriptor.scripts.length){return Promise.resolve();}
const specialCases={'sdk':'SDK','js_sdk':'JSSDK','browser_sdk':'BrowserSDK','ui':'UI','object_ui':'ObjectUI','javascript_metadata':'JavaScriptMetadata','perf_ui':'PerfUI','har_importer':'HARImporter','sdk_test_runner':'SDKTestRunner','cpu_profiler_test_runner':'CPUProfilerTestRunner'};const namespace=specialCases[this._name]||this._name.split('_').map(a=>a.substring(0,1).toUpperCase()+a.substring(1)).join('');self[namespace]=self[namespace]||{};return Runtime._loadScriptsPromise(this._descriptor.scripts.map(this._modularizeURL,this),this._remoteBase());}
_modularizeURL(resourceName){return Runtime.normalizePath(this._name+'/'+resourceName);}
_remoteBase(){return!Runtime.queryParam('debugFrontend')&&this._descriptor.remote&&Runtime._remoteBase||undefined;}
fetchResource(resourceName){const base=this._remoteBase();const sourceURL=Runtime.getResourceURL(this._modularizeURL(resourceName),base);return base?Runtime.loadResourcePromiseWithFallback(sourceURL):Runtime.loadResourcePromise(sourceURL);}
substituteURL(value){const base=this._remoteBase()||'';return value.replace(/@url\(([^\)]*?)\)/g,convertURL.bind(this));function convertURL(match,url){return base+this._modularizeURL(url);}}}
class Extension{constructor(module,descriptor){this._module=module;this._descriptor=descriptor;this._type=descriptor.type;this._hasTypeClass=this._type.charAt(0)==='@';this._className=descriptor.className||null;this._factoryName=descriptor.factoryName||null;}
descriptor(){return this._descriptor;}
module(){return this._module;}
enabled(){return this._module.enabled()&&Runtime._isDescriptorEnabled(this.descriptor());}
_typeClass(){if(!this._hasTypeClass){return null;}
return this._module._manager._resolve(this._type.substring(1));}
isApplicable(context){return this._module._manager.isExtensionApplicableToContext(this,context);}
instance(){return this._module._loadPromise().then(this._createInstance.bind(this));}
canInstantiate(){return!!(this._className||this._factoryName);}
_createInstance(){const className=this._className||this._factoryName;if(!className){throw new Error('Could not instantiate extension with no class');}
const constructorFunction=self.eval((className));if(!(constructorFunction instanceof Function)){throw new Error('Could not instantiate: '+className);}
if(this._className){return this._module._manager.sharedInstance(constructorFunction);}
return new constructorFunction(this);}
title(){const title=this._descriptor['title-'+Runtime._platform]||this._descriptor['title'];if(title&&Runtime._l10nCallback){return Runtime._l10nCallback(title);}
return title;}
hasContextType(contextType){const contextTypes=this.descriptor().contextTypes;if(!contextTypes){return false;}
for(let i=0;i<contextTypes.length;++i){if(contextType===this._module._manager._resolve(contextTypes[i])){return true;}}
return false;}}
class ExperimentsSupport{constructor(){this._supportEnabled=Runtime.queryParam('experiments')!==null;this._experiments=[];this._experimentNames={};this._enabledTransiently={};this._serverEnabled=new Set();}
allConfigurableExperiments(){const result=[];for(let i=0;i<this._experiments.length;i++){const experiment=this._experiments[i];if(!this._enabledTransiently[experiment.name]){result.push(experiment);}}
return result;}
supportEnabled(){return this._supportEnabled;}
_setExperimentsSetting(value){if(!self.localStorage){return;}
self.localStorage['experiments']=JSON.stringify(value);}
register(experimentName,experimentTitle,hidden){Runtime._assert(!this._experimentNames[experimentName],'Duplicate registration of experiment '+experimentName);this._experimentNames[experimentName]=true;this._experiments.push(new Runtime.Experiment(this,experimentName,experimentTitle,!!hidden));}
isEnabled(experimentName){this._checkExperiment(experimentName);if(Runtime._experimentsSetting()[experimentName]===false){return false;}
if(this._enabledTransiently[experimentName]){return true;}
if(this._serverEnabled.has(experimentName)){return true;}
if(!this.supportEnabled()){return false;}
return!!Runtime._experimentsSetting()[experimentName];}
setEnabled(experimentName,enabled){this._checkExperiment(experimentName);const experimentsSetting=Runtime._experimentsSetting();experimentsSetting[experimentName]=enabled;this._setExperimentsSetting(experimentsSetting);}
setDefaultExperiments(experimentNames){for(let i=0;i<experimentNames.length;++i){this._checkExperiment(experimentNames[i]);this._enabledTransiently[experimentNames[i]]=true;}}
setServerEnabledExperiments(experimentNames){for(const experiment of experimentNames){this._checkExperiment(experiment);this._serverEnabled.add(experiment);}}
enableForTest(experimentName){this._checkExperiment(experimentName);this._enabledTransiently[experimentName]=true;}
clearForTest(){this._experiments=[];this._experimentNames={};this._enabledTransiently={};this._serverEnabled.clear();}
cleanUpStaleExperiments(){const experimentsSetting=Runtime._experimentsSetting();const cleanedUpExperimentSetting={};for(let i=0;i<this._experiments.length;++i){const experimentName=this._experiments[i].name;if(experimentsSetting[experimentName]){cleanedUpExperimentSetting[experimentName]=true;}}
this._setExperimentsSetting(cleanedUpExperimentSetting);}
_checkExperiment(experimentName){Runtime._assert(this._experimentNames[experimentName],'Unknown experiment '+experimentName);}}
class Experiment{constructor(experiments,name,title,hidden){this.name=name;this.title=title;this.hidden=hidden;this._experiments=experiments;}
isEnabled(){return this._experiments.isEnabled(this.name);}
setEnabled(enabled){this._experiments.setEnabled(this.name,enabled);}}
Runtime.experiments=new ExperimentsSupport();Runtime._appStartedPromiseCallback;Runtime._appStartedPromise=new Promise(fulfil=>Runtime._appStartedPromiseCallback=fulfil);Runtime._l10nCallback;Runtime._remoteBase;(function validateRemoteBase(){if(location.href.startsWith('devtools://devtools/bundled/')&&Runtime.queryParam('remoteBase')){const versionMatch=/\/serve_file\/(@[0-9a-zA-Z]+)\/?$/.exec(Runtime.queryParam('remoteBase'));if(versionMatch){Runtime._remoteBase=`${location.origin}/remote/serve_file/${versionMatch[1]}/`;}}})();self.Root=self.Root||{};Root=Root||{};Root.allDescriptors=[];Root.applicationDescriptor=undefined;Root.Runtime=Runtime;Root.runtime;Root.Runtime.ModuleDescriptor=ModuleDescriptor;Root.Runtime.ExtensionDescriptor=RuntimeExtensionDescriptor;Root.Runtime.Extension=Extension;Root.Runtime.Module=Module;Root.Runtime.ExperimentsSupport=ExperimentsSupport;Root.Runtime.Experiment=Experiment;Root.allDescriptors.push(...[{"dependencies":[],"modules":["utilities.js"],"name":"platform","scripts":[]},{"skip_compilation":["acorn/acorn.js","acorn/acorn_loose.js","../cm_web_modes/css.js","../cm_web_modes/xml.js"],"dependencies":["platform","text_utils","cm_headless"],"name":"formatter_worker"},{"dependencies":["platform"],"name":"text_utils"},{"skip_compilation":["headlesscodemirror.js"],"name":"cm_headless"}]);Root.applicationDescriptor={"has_html":false,"modules":[{"type":"autostart","name":"platform"},{"type":"autostart","name":"formatter_worker"},{"type":"autostart","name":"text_utils"},{"type":"autostart","name":"cm_headless"}]}
self['Platform']=self['Platform']||{};self['TextUtils']=self['TextUtils']||{};TextUtils.Text=class{constructor(value){this._value=value;}
lineEndings(){if(!this._lineEndings){this._lineEndings=this._value.computeLineEndings();}
return this._lineEndings;}
value(){return this._value;}
lineCount(){const lineEndings=this.lineEndings();return lineEndings.length;}
offsetFromPosition(lineNumber,columnNumber){return(lineNumber?this.lineEndings()[lineNumber-1]+1:0)+columnNumber;}
positionFromOffset(offset){const lineEndings=this.lineEndings();const lineNumber=lineEndings.lowerBound(offset);return{lineNumber:lineNumber,columnNumber:offset-(lineNumber&&(lineEndings[lineNumber-1]+1))};}
lineAt(lineNumber){const lineEndings=this.lineEndings();const lineStart=lineNumber>0?lineEndings[lineNumber-1]+1:0;const lineEnd=lineEndings[lineNumber];let lineContent=this._value.substring(lineStart,lineEnd);if(lineContent.length>0&&lineContent.charAt(lineContent.length-1)==='\r'){lineContent=lineContent.substring(0,lineContent.length-1);}
return lineContent;}
toSourceRange(range){const start=this.offsetFromPosition(range.startLine,range.startColumn);const end=this.offsetFromPosition(range.endLine,range.endColumn);return new TextUtils.SourceRange(start,end-start);}
toTextRange(sourceRange){const cursor=new TextUtils.TextCursor(this.lineEndings());const result=TextUtils.TextRange.createFromLocation(0,0);cursor.resetTo(sourceRange.offset);result.startLine=cursor.lineNumber();result.startColumn=cursor.columnNumber();cursor.advance(sourceRange.offset+sourceRange.length);result.endLine=cursor.lineNumber();result.endColumn=cursor.columnNumber();return result;}
replaceRange(range,replacement){const sourceRange=this.toSourceRange(range);return this._value.substring(0,sourceRange.offset)+replacement+
this._value.substring(sourceRange.offset+sourceRange.length);}
extract(range){const sourceRange=this.toSourceRange(range);return this._value.substr(sourceRange.offset,sourceRange.length);}};TextUtils.Text.Position;TextUtils.TextCursor=class{constructor(lineEndings){this._lineEndings=lineEndings;this._offset=0;this._lineNumber=0;this._columnNumber=0;}
advance(offset){this._offset=offset;while(this._lineNumber<this._lineEndings.length&&this._lineEndings[this._lineNumber]<this._offset){++this._lineNumber;}
this._columnNumber=this._lineNumber?this._offset-this._lineEndings[this._lineNumber-1]-1:this._offset;}
offset(){return this._offset;}
resetTo(offset){this._offset=offset;this._lineNumber=this._lineEndings.lowerBound(offset);this._columnNumber=this._lineNumber?this._offset-this._lineEndings[this._lineNumber-1]-1:this._offset;}
lineNumber(){return this._lineNumber;}
columnNumber(){return this._columnNumber;}};;TextUtils.TextUtils={isStopChar:function(char){return(char>' '&&char<'0')||(char>'9'&&char<'A')||(char>'Z'&&char<'_')||(char>'_'&&char<'a')||(char>'z'&&char<='~');},isWordChar:function(char){return!TextUtils.TextUtils.isStopChar(char)&&!TextUtils.TextUtils.isSpaceChar(char);},isSpaceChar:function(char){return TextUtils.TextUtils._SpaceCharRegex.test(char);},isWord:function(word){for(let i=0;i<word.length;++i){if(!TextUtils.TextUtils.isWordChar(word.charAt(i))){return false;}}
return true;},isOpeningBraceChar:function(char){return char==='('||char==='{';},isClosingBraceChar:function(char){return char===')'||char==='}';},isBraceChar:function(char){return TextUtils.TextUtils.isOpeningBraceChar(char)||TextUtils.TextUtils.isClosingBraceChar(char);},textToWords:function(text,isWordChar,wordCallback){let startWord=-1;for(let i=0;i<text.length;++i){if(!isWordChar(text.charAt(i))){if(startWord!==-1){wordCallback(text.substring(startWord,i));}
startWord=-1;}else if(startWord===-1){startWord=i;}}
if(startWord!==-1){wordCallback(text.substring(startWord));}},lineIndent:function(line){let indentation=0;while(indentation<line.length&&TextUtils.TextUtils.isSpaceChar(line.charAt(indentation))){++indentation;}
return line.substr(0,indentation);},isUpperCase:function(text){return text===text.toUpperCase();},isLowerCase:function(text){return text===text.toLowerCase();},splitStringByRegexes(text,regexes){const matches=[];const globalRegexes=[];for(let i=0;i<regexes.length;i++){const regex=regexes[i];if(!regex.global){globalRegexes.push(new RegExp(regex.source,regex.flags?regex.flags+'g':'g'));}else{globalRegexes.push(regex);}}
doSplit(text,0,0);return matches;function doSplit(text,regexIndex,startIndex){if(regexIndex>=globalRegexes.length){matches.push({value:text,position:startIndex,regexIndex:-1,captureGroups:[]});return;}
const regex=globalRegexes[regexIndex];let currentIndex=0;let result;regex.lastIndex=0;while((result=regex.exec(text))!==null){const stringBeforeMatch=text.substring(currentIndex,result.index);if(stringBeforeMatch){doSplit(stringBeforeMatch,regexIndex+1,startIndex+currentIndex);}
const match=result[0];matches.push({value:match,position:startIndex+result.index,regexIndex:regexIndex,captureGroups:result.slice(1)});currentIndex=result.index+match.length;}
const stringAfterMatches=text.substring(currentIndex);if(stringAfterMatches){doSplit(stringAfterMatches,regexIndex+1,startIndex+currentIndex);}}}};TextUtils.FilterParser=class{constructor(keys){this._keys=keys;}
static cloneFilter(filter){return{key:filter.key,text:filter.text,regex:filter.regex,negative:filter.negative};}
parse(query){const splitResult=TextUtils.TextUtils.splitStringByRegexes(query,[TextUtils.TextUtils._keyValueFilterRegex,TextUtils.TextUtils._regexFilterRegex,TextUtils.TextUtils._textFilterRegex]);const filters=[];for(let i=0;i<splitResult.length;i++){const regexIndex=splitResult[i].regexIndex;if(regexIndex===-1){continue;}
const result=splitResult[i].captureGroups;if(regexIndex===0){if(this._keys.indexOf((result[1]))!==-1){filters.push({key:result[1],text:result[2],negative:!!result[0]});}else{filters.push({text:result[1]+':'+result[2],negative:!!result[0]});}}else if(regexIndex===1){try{filters.push({regex:new RegExp(result[1],'i'),negative:!!result[0]});}catch(e){filters.push({text:'/'+result[1]+'/',negative:!!result[0]});}}else if(regexIndex===2){filters.push({text:result[1],negative:!!result[0]});}}
return filters;}};TextUtils.FilterParser.ParsedFilter;TextUtils.TextUtils._keyValueFilterRegex=/(?:^|\s)(\-)?([\w\-]+):([^\s]+)/;TextUtils.TextUtils._regexFilterRegex=/(?:^|\s)(\-)?\/([^\s]+)\//;TextUtils.TextUtils._textFilterRegex=/(?:^|\s)(\-)?([^\s]+)/;TextUtils.TextUtils._SpaceCharRegex=/\s/;TextUtils.TextUtils.Indent={TwoSpaces:'  ',FourSpaces:'    ',EightSpaces:'        ',TabCharacter:'\t'};TextUtils.TextUtils.BalancedJSONTokenizer=class{constructor(callback,findMultiple){this._callback=callback;this._index=0;this._balance=0;this._buffer='';this._findMultiple=findMultiple||false;this._closingDoubleQuoteRegex=/[^\\](?:\\\\)*"/g;}
write(chunk){this._buffer+=chunk;const lastIndex=this._buffer.length;const buffer=this._buffer;let index;for(index=this._index;index<lastIndex;++index){const character=buffer[index];if(character==='"'){this._closingDoubleQuoteRegex.lastIndex=index;if(!this._closingDoubleQuoteRegex.test(buffer)){break;}
index=this._closingDoubleQuoteRegex.lastIndex-1;}else if(character==='{'){++this._balance;}else if(character==='}'){--this._balance;if(this._balance<0){this._reportBalanced();return false;}
if(!this._balance){this._lastBalancedIndex=index+1;if(!this._findMultiple){break;}}}else if(character===']'&&!this._balance){this._reportBalanced();return false;}}
this._index=index;this._reportBalanced();return true;}
_reportBalanced(){if(!this._lastBalancedIndex){return;}
this._callback(this._buffer.slice(0,this._lastBalancedIndex));this._buffer=this._buffer.slice(this._lastBalancedIndex);this._index-=this._lastBalancedIndex;this._lastBalancedIndex=0;}
remainder(){return this._buffer;}};TextUtils.TokenizerFactory=function(){};TextUtils.TokenizerFactory.prototype={createTokenizer(mimeType){}};TextUtils.isMinified=function(text){const kMaxNonMinifiedLength=500;let linesToCheck=10;let lastPosition=0;do{let eolIndex=text.indexOf('\n',lastPosition);if(eolIndex<0){eolIndex=text.length;}
if(eolIndex-lastPosition>kMaxNonMinifiedLength&&text.substr(lastPosition,3)!=='//#'){return true;}
lastPosition=eolIndex+1;}while(--linesToCheck>=0&&lastPosition<text.length);linesToCheck=10;lastPosition=text.length;do{let eolIndex=text.lastIndexOf('\n',lastPosition);if(eolIndex<0){eolIndex=0;}
if(lastPosition-eolIndex>kMaxNonMinifiedLength&&text.substr(lastPosition,3)!=='//#'){return true;}
lastPosition=eolIndex-1;}while(--linesToCheck>=0&&lastPosition>0);return false;};;TextUtils.TextRange=class{constructor(startLine,startColumn,endLine,endColumn){this.startLine=startLine;this.startColumn=startColumn;this.endLine=endLine;this.endColumn=endColumn;}
static createFromLocation(line,column){return new TextUtils.TextRange(line,column,line,column);}
static fromObject(serializedTextRange){return new TextUtils.TextRange(serializedTextRange.startLine,serializedTextRange.startColumn,serializedTextRange.endLine,serializedTextRange.endColumn);}
static comparator(range1,range2){return range1.compareTo(range2);}
static fromEdit(oldRange,newText){let endLine=oldRange.startLine;let endColumn=oldRange.startColumn+newText.length;const lineEndings=newText.computeLineEndings();if(lineEndings.length>1){endLine=oldRange.startLine+lineEndings.length-1;const len=lineEndings.length;endColumn=lineEndings[len-1]-lineEndings[len-2]-1;}
return new TextUtils.TextRange(oldRange.startLine,oldRange.startColumn,endLine,endColumn);}
isEmpty(){return this.startLine===this.endLine&&this.startColumn===this.endColumn;}
immediatelyPrecedes(range){if(!range){return false;}
return this.endLine===range.startLine&&this.endColumn===range.startColumn;}
immediatelyFollows(range){if(!range){return false;}
return range.immediatelyPrecedes(this);}
follows(range){return(range.endLine===this.startLine&&range.endColumn<=this.startColumn)||range.endLine<this.startLine;}
get linesCount(){return this.endLine-this.startLine;}
collapseToEnd(){return new TextUtils.TextRange(this.endLine,this.endColumn,this.endLine,this.endColumn);}
collapseToStart(){return new TextUtils.TextRange(this.startLine,this.startColumn,this.startLine,this.startColumn);}
normalize(){if(this.startLine>this.endLine||(this.startLine===this.endLine&&this.startColumn>this.endColumn)){return new TextUtils.TextRange(this.endLine,this.endColumn,this.startLine,this.startColumn);}else{return this.clone();}}
clone(){return new TextUtils.TextRange(this.startLine,this.startColumn,this.endLine,this.endColumn);}
serializeToObject(){const serializedTextRange={};serializedTextRange.startLine=this.startLine;serializedTextRange.startColumn=this.startColumn;serializedTextRange.endLine=this.endLine;serializedTextRange.endColumn=this.endColumn;return serializedTextRange;}
compareTo(other){if(this.startLine>other.startLine){return 1;}
if(this.startLine<other.startLine){return-1;}
if(this.startColumn>other.startColumn){return 1;}
if(this.startColumn<other.startColumn){return-1;}
return 0;}
compareToPosition(lineNumber,columnNumber){if(lineNumber<this.startLine||(lineNumber===this.startLine&&columnNumber<this.startColumn)){return-1;}
if(lineNumber>this.endLine||(lineNumber===this.endLine&&columnNumber>this.endColumn)){return 1;}
return 0;}
equal(other){return this.startLine===other.startLine&&this.endLine===other.endLine&&this.startColumn===other.startColumn&&this.endColumn===other.endColumn;}
relativeTo(line,column){const relative=this.clone();if(this.startLine===line){relative.startColumn-=column;}
if(this.endLine===line){relative.endColumn-=column;}
relative.startLine-=line;relative.endLine-=line;return relative;}
relativeFrom(line,column){const relative=this.clone();if(this.startLine===0){relative.startColumn+=column;}
if(this.endLine===0){relative.endColumn+=column;}
relative.startLine+=line;relative.endLine+=line;return relative;}
rebaseAfterTextEdit(originalRange,editedRange){console.assert(originalRange.startLine===editedRange.startLine);console.assert(originalRange.startColumn===editedRange.startColumn);const rebase=this.clone();if(!this.follows(originalRange)){return rebase;}
const lineDelta=editedRange.endLine-originalRange.endLine;const columnDelta=editedRange.endColumn-originalRange.endColumn;rebase.startLine+=lineDelta;rebase.endLine+=lineDelta;if(rebase.startLine===editedRange.endLine){rebase.startColumn+=columnDelta;}
if(rebase.endLine===editedRange.endLine){rebase.endColumn+=columnDelta;}
return rebase;}
toString(){return JSON.stringify(this);}
containsLocation(lineNumber,columnNumber){if(this.startLine===this.endLine){return this.startLine===lineNumber&&this.startColumn<=columnNumber&&columnNumber<=this.endColumn;}
if(this.startLine===lineNumber){return this.startColumn<=columnNumber;}
if(this.endLine===lineNumber){return columnNumber<=this.endColumn;}
return this.startLine<lineNumber&&lineNumber<this.endLine;}};TextUtils.SourceRange=class{constructor(offset,length){this.offset=offset;this.length=length;}};TextUtils.SourceEdit=class{constructor(sourceURL,oldRange,newText){this.sourceURL=sourceURL;this.oldRange=oldRange;this.newText=newText;}
static comparator(edit1,edit2){return TextUtils.TextRange.comparator(edit1.oldRange,edit2.oldRange);}
newRange(){return TextUtils.TextRange.fromEdit(this.oldRange,this.newText);}};;self['CmHeadless']=self['CmHeadless']||{};(function(window){window.CodeMirror={};(function(){"use strict";function splitLines(string){return string.split(/\r?\n|\r/);};function StringStream(string){this.pos=this.start=0;this.string=string;this.lineStart=0;}
StringStream.prototype={eol:function(){return this.pos>=this.string.length;},sol:function(){return this.pos==0;},peek:function(){return this.string.charAt(this.pos)||null;},next:function(){if(this.pos<this.string.length)
return this.string.charAt(this.pos++);},eat:function(match){var ch=this.string.charAt(this.pos);if(typeof match=="string")var ok=ch==match;else var ok=ch&&(match.test?match.test(ch):match(ch));if(ok){++this.pos;return ch;}},eatWhile:function(match){var start=this.pos;while(this.eat(match)){}
return this.pos>start;},eatSpace:function(){var start=this.pos;while(/[\s\u00a0]/.test(this.string.charAt(this.pos)))++this.pos;return this.pos>start;},skipToEnd:function(){this.pos=this.string.length;},skipTo:function(ch){var found=this.string.indexOf(ch,this.pos);if(found>-1){this.pos=found;return true;}},backUp:function(n){this.pos-=n;},column:function(){return this.start-this.lineStart;},indentation:function(){return 0;},match:function(pattern,consume,caseInsensitive){if(typeof pattern=="string"){var cased=function(str){return caseInsensitive?str.toLowerCase():str;};var substr=this.string.substr(this.pos,pattern.length);if(cased(substr)==cased(pattern)){if(consume!==false)this.pos+=pattern.length;return true;}}else{var match=this.string.slice(this.pos).match(pattern);if(match&&match.index>0)return null;if(match&&consume!==false)this.pos+=match[0].length;return match;}},current:function(){return this.string.slice(this.start,this.pos);},hideFirstChars:function(n,inner){this.lineStart+=n;try{return inner();}
finally{this.lineStart-=n;}},lookAhead:function(){return null}};CodeMirror.StringStream=StringStream;CodeMirror.startState=function(mode,a1,a2){return mode.startState?mode.startState(a1,a2):true;};var modes=CodeMirror.modes={},mimeModes=CodeMirror.mimeModes={};CodeMirror.defineMode=function(name,mode){if(arguments.length>2)
mode.dependencies=Array.prototype.slice.call(arguments,2);modes[name]=mode;};CodeMirror.defineMIME=function(mime,spec){mimeModes[mime]=spec;};CodeMirror.resolveMode=function(spec){if(typeof spec=="string"&&mimeModes.hasOwnProperty(spec)){spec=mimeModes[spec];}else if(spec&&typeof spec.name=="string"&&mimeModes.hasOwnProperty(spec.name)){spec=mimeModes[spec.name];}
if(typeof spec=="string")return{name:spec};else return spec||{name:"null"};};CodeMirror.getMode=function(options,spec){spec=CodeMirror.resolveMode(spec);var mfactory=modes[spec.name];if(!mfactory)throw new Error("Unknown mode: "+spec);return mfactory(options,spec);};CodeMirror.registerHelper=CodeMirror.registerGlobalHelper=Math.min;CodeMirror.defineMode("null",function(){return{token:function(stream){stream.skipToEnd();}};});CodeMirror.defineMIME("text/plain","null");CodeMirror.runMode=function(string,modespec,callback,options){var mode=CodeMirror.getMode({indentUnit:2},modespec);if(callback.nodeType==1){var tabSize=(options&&options.tabSize)||4;var node=callback,col=0;node.innerHTML="";callback=function(text,style){if(text=="\n"){node.appendChild(document.createElement("br"));col=0;return;}
var content="";for(var pos=0;;){var idx=text.indexOf("\t",pos);if(idx==-1){content+=text.slice(pos);col+=text.length-pos;break;}else{col+=idx-pos;content+=text.slice(pos,idx);var size=tabSize-col%tabSize;col+=size;for(var i=0;i<size;++i)content+=" ";pos=idx+1;}}
if(style){var sp=node.appendChild(document.createElement("span"));sp.className="cm-"+style.replace(/ +/g," cm-");sp.appendChild(document.createTextNode(content));}else{node.appendChild(document.createTextNode(content));}};}
var lines=splitLines(string),state=(options&&options.state)||CodeMirror.startState(mode);for(var i=0,e=lines.length;i<e;++i){if(i)callback("\n");var stream=new CodeMirror.StringStream(lines[i]);if(!stream.string&&mode.blankLine)mode.blankLine(state);while(!stream.eol()){var style=mode.token(stream,state);callback(stream.current(),style,i,stream.start,state);stream.start=stream.pos;}}};})();}(this));self['FormatterWorker']=self['FormatterWorker']||{};(function(mod){if(typeof exports=="object"&&typeof module=="object")
mod(require("../../lib/codemirror"));else if(typeof define=="function"&&define.amd)
define(["../../lib/codemirror"],mod);else
mod(CodeMirror);})(function(CodeMirror){"use strict";CodeMirror.defineMode("css",function(config,parserConfig){var inline=parserConfig.inline
if(!parserConfig.propertyKeywords)parserConfig=CodeMirror.resolveMode("text/css");var indentUnit=config.indentUnit,tokenHooks=parserConfig.tokenHooks,documentTypes=parserConfig.documentTypes||{},mediaTypes=parserConfig.mediaTypes||{},mediaFeatures=parserConfig.mediaFeatures||{},mediaValueKeywords=parserConfig.mediaValueKeywords||{},propertyKeywords=parserConfig.propertyKeywords||{},nonStandardPropertyKeywords=parserConfig.nonStandardPropertyKeywords||{},fontProperties=parserConfig.fontProperties||{},counterDescriptors=parserConfig.counterDescriptors||{},colorKeywords=parserConfig.colorKeywords||{},valueKeywords=parserConfig.valueKeywords||{},allowNested=parserConfig.allowNested,lineComment=parserConfig.lineComment,supportsAtComponent=parserConfig.supportsAtComponent===true;var type,override;function ret(style,tp){type=tp;return style;}
function tokenBase(stream,state){var ch=stream.next();if(tokenHooks[ch]){var result=tokenHooks[ch](stream,state);if(result!==false)return result;}
if(ch=="@"){stream.eatWhile(/[\w\\\-]/);return ret("def",stream.current());}else if(ch=="="||(ch=="~"||ch=="|")&&stream.eat("=")){return ret(null,"compare");}else if(ch=="\""||ch=="'"){state.tokenize=tokenString(ch);return state.tokenize(stream,state);}else if(ch=="#"){stream.eatWhile(/[\w\\\-]/);return ret("atom","hash");}else if(ch=="!"){stream.match(/^\s*\w*/);return ret("keyword","important");}else if(/\d/.test(ch)||ch=="."&&stream.eat(/\d/)){stream.eatWhile(/[\w.%]/);return ret("number","unit");}else if(ch==="-"){if(/[\d.]/.test(stream.peek())){stream.eatWhile(/[\w.%]/);return ret("number","unit");}else if(stream.match(/^-[\w\\\-]*/)){stream.eatWhile(/[\w\\\-]/);if(stream.match(/^\s*:/,false))
return ret("variable-2","variable-definition");return ret("variable-2","variable");}else if(stream.match(/^\w+-/)){return ret("meta","meta");}}else if(/[,+>*\/]/.test(ch)){return ret(null,"select-op");}else if(ch=="."&&stream.match(/^-?[_a-z][_a-z0-9-]*/i)){return ret("qualifier","qualifier");}else if(/[:;{}\[\]\(\)]/.test(ch)){return ret(null,ch);}else if(stream.match(/[\w-.]+(?=\()/)){if(/^(url(-prefix)?|domain|regexp)$/.test(stream.current().toLowerCase())){state.tokenize=tokenParenthesized;}
return ret("variable callee","variable");}else if(/[\w\\\-]/.test(ch)){stream.eatWhile(/[\w\\\-]/);return ret("property","word");}else{return ret(null,null);}}
function tokenString(quote){return function(stream,state){var escaped=false,ch;while((ch=stream.next())!=null){if(ch==quote&&!escaped){if(quote==")")stream.backUp(1);break;}
escaped=!escaped&&ch=="\\";}
if(ch==quote||!escaped&&quote!=")")state.tokenize=null;return ret("string","string");};}
function tokenParenthesized(stream,state){stream.next();if(!stream.match(/\s*[\"\')]/,false))
state.tokenize=tokenString(")");else
state.tokenize=null;return ret(null,"(");}
function Context(type,indent,prev){this.type=type;this.indent=indent;this.prev=prev;}
function pushContext(state,stream,type,indent){state.context=new Context(type,stream.indentation()+(indent===false?0:indentUnit),state.context);return type;}
function popContext(state){if(state.context.prev)
state.context=state.context.prev;return state.context.type;}
function pass(type,stream,state){return states[state.context.type](type,stream,state);}
function popAndPass(type,stream,state,n){for(var i=n||1;i>0;i--)
state.context=state.context.prev;return pass(type,stream,state);}
function wordAsValue(stream){var word=stream.current().toLowerCase();if(valueKeywords.hasOwnProperty(word))
override="atom";else if(colorKeywords.hasOwnProperty(word))
override="keyword";else
override="variable";}
var states={};states.top=function(type,stream,state){if(type=="{"){return pushContext(state,stream,"block");}else if(type=="}"&&state.context.prev){return popContext(state);}else if(supportsAtComponent&&/@component/i.test(type)){return pushContext(state,stream,"atComponentBlock");}else if(/^@(-moz-)?document$/i.test(type)){return pushContext(state,stream,"documentTypes");}else if(/^@(media|supports|(-moz-)?document|import)$/i.test(type)){return pushContext(state,stream,"atBlock");}else if(/^@(font-face|counter-style)/i.test(type)){state.stateArg=type;return"restricted_atBlock_before";}else if(/^@(-(moz|ms|o|webkit)-)?keyframes$/i.test(type)){return"keyframes";}else if(type&&type.charAt(0)=="@"){return pushContext(state,stream,"at");}else if(type=="hash"){override="builtin";}else if(type=="word"){override="tag";}else if(type=="variable-definition"){return"maybeprop";}else if(type=="interpolation"){return pushContext(state,stream,"interpolation");}else if(type==":"){return"pseudo";}else if(allowNested&&type=="("){return pushContext(state,stream,"parens");}
return state.context.type;};states.block=function(type,stream,state){if(type=="word"){var word=stream.current().toLowerCase();if(propertyKeywords.hasOwnProperty(word)){override="property";return"maybeprop";}else if(nonStandardPropertyKeywords.hasOwnProperty(word)){override="string-2";return"maybeprop";}else if(allowNested){override=stream.match(/^\s*:(?:\s|$)/,false)?"property":"tag";return"block";}else{override+=" error";return"maybeprop";}}else if(type=="meta"){return"block";}else if(!allowNested&&(type=="hash"||type=="qualifier")){override="error";return"block";}else{return states.top(type,stream,state);}};states.maybeprop=function(type,stream,state){if(type==":")return pushContext(state,stream,"prop");return pass(type,stream,state);};states.prop=function(type,stream,state){if(type==";")return popContext(state);if(type=="{"&&allowNested)return pushContext(state,stream,"propBlock");if(type=="}"||type=="{")return popAndPass(type,stream,state);if(type=="(")return pushContext(state,stream,"parens");if(type=="hash"&&!/^#([0-9a-fA-f]{3,4}|[0-9a-fA-f]{6}|[0-9a-fA-f]{8})$/.test(stream.current())){override+=" error";}else if(type=="word"){wordAsValue(stream);}else if(type=="interpolation"){return pushContext(state,stream,"interpolation");}
return"prop";};states.propBlock=function(type,_stream,state){if(type=="}")return popContext(state);if(type=="word"){override="property";return"maybeprop";}
return state.context.type;};states.parens=function(type,stream,state){if(type=="{"||type=="}")return popAndPass(type,stream,state);if(type==")")return popContext(state);if(type=="(")return pushContext(state,stream,"parens");if(type=="interpolation")return pushContext(state,stream,"interpolation");if(type=="word")wordAsValue(stream);return"parens";};states.pseudo=function(type,stream,state){if(type=="meta")return"pseudo";if(type=="word"){override="variable-3";return state.context.type;}
return pass(type,stream,state);};states.documentTypes=function(type,stream,state){if(type=="word"&&documentTypes.hasOwnProperty(stream.current())){override="tag";return state.context.type;}else{return states.atBlock(type,stream,state);}};states.atBlock=function(type,stream,state){if(type=="(")return pushContext(state,stream,"atBlock_parens");if(type=="}"||type==";")return popAndPass(type,stream,state);if(type=="{")return popContext(state)&&pushContext(state,stream,allowNested?"block":"top");if(type=="interpolation")return pushContext(state,stream,"interpolation");if(type=="word"){var word=stream.current().toLowerCase();if(word=="only"||word=="not"||word=="and"||word=="or")
override="keyword";else if(mediaTypes.hasOwnProperty(word))
override="attribute";else if(mediaFeatures.hasOwnProperty(word))
override="property";else if(mediaValueKeywords.hasOwnProperty(word))
override="keyword";else if(propertyKeywords.hasOwnProperty(word))
override="property";else if(nonStandardPropertyKeywords.hasOwnProperty(word))
override="string-2";else if(valueKeywords.hasOwnProperty(word))
override="atom";else if(colorKeywords.hasOwnProperty(word))
override="keyword";else
override="error";}
return state.context.type;};states.atComponentBlock=function(type,stream,state){if(type=="}")
return popAndPass(type,stream,state);if(type=="{")
return popContext(state)&&pushContext(state,stream,allowNested?"block":"top",false);if(type=="word")
override="error";return state.context.type;};states.atBlock_parens=function(type,stream,state){if(type==")")return popContext(state);if(type=="{"||type=="}")return popAndPass(type,stream,state,2);return states.atBlock(type,stream,state);};states.restricted_atBlock_before=function(type,stream,state){if(type=="{")
return pushContext(state,stream,"restricted_atBlock");if(type=="word"&&state.stateArg=="@counter-style"){override="variable";return"restricted_atBlock_before";}
return pass(type,stream,state);};states.restricted_atBlock=function(type,stream,state){if(type=="}"){state.stateArg=null;return popContext(state);}
if(type=="word"){if((state.stateArg=="@font-face"&&!fontProperties.hasOwnProperty(stream.current().toLowerCase()))||(state.stateArg=="@counter-style"&&!counterDescriptors.hasOwnProperty(stream.current().toLowerCase())))
override="error";else
override="property";return"maybeprop";}
return"restricted_atBlock";};states.keyframes=function(type,stream,state){if(type=="word"){override="variable";return"keyframes";}
if(type=="{")return pushContext(state,stream,"top");return pass(type,stream,state);};states.at=function(type,stream,state){if(type==";")return popContext(state);if(type=="{"||type=="}")return popAndPass(type,stream,state);if(type=="word")override="tag";else if(type=="hash")override="builtin";return"at";};states.interpolation=function(type,stream,state){if(type=="}")return popContext(state);if(type=="{"||type==";")return popAndPass(type,stream,state);if(type=="word")override="variable";else if(type!="variable"&&type!="("&&type!=")")override="error";return"interpolation";};return{startState:function(base){return{tokenize:null,state:inline?"block":"top",stateArg:null,context:new Context(inline?"block":"top",base||0,null)};},token:function(stream,state){if(!state.tokenize&&stream.eatSpace())return null;var style=(state.tokenize||tokenBase)(stream,state);if(style&&typeof style=="object"){type=style[1];style=style[0];}
override=style;if(type!="comment")
state.state=states[state.state](type,stream,state);return override;},indent:function(state,textAfter){var cx=state.context,ch=textAfter&&textAfter.charAt(0);var indent=cx.indent;if(cx.type=="prop"&&(ch=="}"||ch==")"))cx=cx.prev;if(cx.prev){if(ch=="}"&&(cx.type=="block"||cx.type=="top"||cx.type=="interpolation"||cx.type=="restricted_atBlock")){cx=cx.prev;indent=cx.indent;}else if(ch==")"&&(cx.type=="parens"||cx.type=="atBlock_parens")||ch=="{"&&(cx.type=="at"||cx.type=="atBlock")){indent=Math.max(0,cx.indent-indentUnit);}}
return indent;},electricChars:"}",blockCommentStart:"/*",blockCommentEnd:"*/",blockCommentContinue:" * ",lineComment:lineComment,fold:"brace"};});function keySet(array){var keys={};for(var i=0;i<array.length;++i){keys[array[i].toLowerCase()]=true;}
return keys;}
var documentTypes_=["domain","regexp","url","url-prefix"],documentTypes=keySet(documentTypes_);var mediaTypes_=["all","aural","braille","handheld","print","projection","screen","tty","tv","embossed"],mediaTypes=keySet(mediaTypes_);var mediaFeatures_=["width","min-width","max-width","height","min-height","max-height","device-width","min-device-width","max-device-width","device-height","min-device-height","max-device-height","aspect-ratio","min-aspect-ratio","max-aspect-ratio","device-aspect-ratio","min-device-aspect-ratio","max-device-aspect-ratio","color","min-color","max-color","color-index","min-color-index","max-color-index","monochrome","min-monochrome","max-monochrome","resolution","min-resolution","max-resolution","scan","grid","orientation","device-pixel-ratio","min-device-pixel-ratio","max-device-pixel-ratio","pointer","any-pointer","hover","any-hover"],mediaFeatures=keySet(mediaFeatures_);var mediaValueKeywords_=["landscape","portrait","none","coarse","fine","on-demand","hover","interlace","progressive"],mediaValueKeywords=keySet(mediaValueKeywords_);var propertyKeywords_=["align-content","align-items","align-self","alignment-adjust","alignment-baseline","anchor-point","animation","animation-delay","animation-direction","animation-duration","animation-fill-mode","animation-iteration-count","animation-name","animation-play-state","animation-timing-function","appearance","azimuth","backface-visibility","background","background-attachment","background-blend-mode","background-clip","background-color","background-image","background-origin","background-position","background-repeat","background-size","baseline-shift","binding","bleed","bookmark-label","bookmark-level","bookmark-state","bookmark-target","border","border-bottom","border-bottom-color","border-bottom-left-radius","border-bottom-right-radius","border-bottom-style","border-bottom-width","border-collapse","border-color","border-image","border-image-outset","border-image-repeat","border-image-slice","border-image-source","border-image-width","border-left","border-left-color","border-left-style","border-left-width","border-radius","border-right","border-right-color","border-right-style","border-right-width","border-spacing","border-style","border-top","border-top-color","border-top-left-radius","border-top-right-radius","border-top-style","border-top-width","border-width","bottom","box-decoration-break","box-shadow","box-sizing","break-after","break-before","break-inside","caption-side","caret-color","clear","clip","color","color-profile","column-count","column-fill","column-gap","column-rule","column-rule-color","column-rule-style","column-rule-width","column-span","column-width","columns","content","counter-increment","counter-reset","crop","cue","cue-after","cue-before","cursor","direction","display","dominant-baseline","drop-initial-after-adjust","drop-initial-after-align","drop-initial-before-adjust","drop-initial-before-align","drop-initial-size","drop-initial-value","elevation","empty-cells","fit","fit-position","flex","flex-basis","flex-direction","flex-flow","flex-grow","flex-shrink","flex-wrap","float","float-offset","flow-from","flow-into","font","font-feature-settings","font-family","font-kerning","font-language-override","font-size","font-size-adjust","font-stretch","font-style","font-synthesis","font-variant","font-variant-alternates","font-variant-caps","font-variant-east-asian","font-variant-ligatures","font-variant-numeric","font-variant-position","font-weight","grid","grid-area","grid-auto-columns","grid-auto-flow","grid-auto-rows","grid-column","grid-column-end","grid-column-gap","grid-column-start","grid-gap","grid-row","grid-row-end","grid-row-gap","grid-row-start","grid-template","grid-template-areas","grid-template-columns","grid-template-rows","hanging-punctuation","height","hyphens","icon","image-orientation","image-rendering","image-resolution","inline-box-align","justify-content","justify-items","justify-self","left","letter-spacing","line-break","line-height","line-stacking","line-stacking-ruby","line-stacking-shift","line-stacking-strategy","list-style","list-style-image","list-style-position","list-style-type","margin","margin-bottom","margin-left","margin-right","margin-top","marks","marquee-direction","marquee-loop","marquee-play-count","marquee-speed","marquee-style","max-height","max-width","min-height","min-width","mix-blend-mode","move-to","nav-down","nav-index","nav-left","nav-right","nav-up","object-fit","object-position","opacity","order","orphans","outline","outline-color","outline-offset","outline-style","outline-width","overflow","overflow-style","overflow-wrap","overflow-x","overflow-y","padding","padding-bottom","padding-left","padding-right","padding-top","page","page-break-after","page-break-before","page-break-inside","page-policy","pause","pause-after","pause-before","perspective","perspective-origin","pitch","pitch-range","place-content","place-items","place-self","play-during","position","presentation-level","punctuation-trim","quotes","region-break-after","region-break-before","region-break-inside","region-fragment","rendering-intent","resize","rest","rest-after","rest-before","richness","right","rotation","rotation-point","ruby-align","ruby-overhang","ruby-position","ruby-span","shape-image-threshold","shape-inside","shape-margin","shape-outside","size","speak","speak-as","speak-header","speak-numeral","speak-punctuation","speech-rate","stress","string-set","tab-size","table-layout","target","target-name","target-new","target-position","text-align","text-align-last","text-decoration","text-decoration-color","text-decoration-line","text-decoration-skip","text-decoration-style","text-emphasis","text-emphasis-color","text-emphasis-position","text-emphasis-style","text-height","text-indent","text-justify","text-outline","text-overflow","text-shadow","text-size-adjust","text-space-collapse","text-transform","text-underline-position","text-wrap","top","transform","transform-origin","transform-style","transition","transition-delay","transition-duration","transition-property","transition-timing-function","unicode-bidi","user-select","vertical-align","visibility","voice-balance","voice-duration","voice-family","voice-pitch","voice-range","voice-rate","voice-stress","voice-volume","volume","white-space","widows","width","will-change","word-break","word-spacing","word-wrap","z-index","clip-path","clip-rule","mask","enable-background","filter","flood-color","flood-opacity","lighting-color","stop-color","stop-opacity","pointer-events","color-interpolation","color-interpolation-filters","color-rendering","fill","fill-opacity","fill-rule","image-rendering","marker","marker-end","marker-mid","marker-start","shape-rendering","stroke","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke-width","text-rendering","baseline-shift","dominant-baseline","glyph-orientation-horizontal","glyph-orientation-vertical","text-anchor","writing-mode"],propertyKeywords=keySet(propertyKeywords_);var nonStandardPropertyKeywords_=["scrollbar-arrow-color","scrollbar-base-color","scrollbar-dark-shadow-color","scrollbar-face-color","scrollbar-highlight-color","scrollbar-shadow-color","scrollbar-3d-light-color","scrollbar-track-color","shape-inside","searchfield-cancel-button","searchfield-decoration","searchfield-results-button","searchfield-results-decoration","zoom"],nonStandardPropertyKeywords=keySet(nonStandardPropertyKeywords_);var fontProperties_=["font-family","src","unicode-range","font-variant","font-feature-settings","font-stretch","font-weight","font-style"],fontProperties=keySet(fontProperties_);var counterDescriptors_=["additive-symbols","fallback","negative","pad","prefix","range","speak-as","suffix","symbols","system"],counterDescriptors=keySet(counterDescriptors_);var colorKeywords_=["aliceblue","antiquewhite","aqua","aquamarine","azure","beige","bisque","black","blanchedalmond","blue","blueviolet","brown","burlywood","cadetblue","chartreuse","chocolate","coral","cornflowerblue","cornsilk","crimson","cyan","darkblue","darkcyan","darkgoldenrod","darkgray","darkgreen","darkkhaki","darkmagenta","darkolivegreen","darkorange","darkorchid","darkred","darksalmon","darkseagreen","darkslateblue","darkslategray","darkturquoise","darkviolet","deeppink","deepskyblue","dimgray","dodgerblue","firebrick","floralwhite","forestgreen","fuchsia","gainsboro","ghostwhite","gold","goldenrod","gray","grey","green","greenyellow","honeydew","hotpink","indianred","indigo","ivory","khaki","lavender","lavenderblush","lawngreen","lemonchiffon","lightblue","lightcoral","lightcyan","lightgoldenrodyellow","lightgray","lightgreen","lightpink","lightsalmon","lightseagreen","lightskyblue","lightslategray","lightsteelblue","lightyellow","lime","limegreen","linen","magenta","maroon","mediumaquamarine","mediumblue","mediumorchid","mediumpurple","mediumseagreen","mediumslateblue","mediumspringgreen","mediumturquoise","mediumvioletred","midnightblue","mintcream","mistyrose","moccasin","navajowhite","navy","oldlace","olive","olivedrab","orange","orangered","orchid","palegoldenrod","palegreen","paleturquoise","palevioletred","papayawhip","peachpuff","peru","pink","plum","powderblue","purple","rebeccapurple","red","rosybrown","royalblue","saddlebrown","salmon","sandybrown","seagreen","seashell","sienna","silver","skyblue","slateblue","slategray","snow","springgreen","steelblue","tan","teal","thistle","tomato","turquoise","violet","wheat","white","whitesmoke","yellow","yellowgreen"],colorKeywords=keySet(colorKeywords_);var valueKeywords_=["above","absolute","activeborder","additive","activecaption","afar","after-white-space","ahead","alias","all","all-scroll","alphabetic","alternate","always","amharic","amharic-abegede","antialiased","appworkspace","arabic-indic","armenian","asterisks","attr","auto","auto-flow","avoid","avoid-column","avoid-page","avoid-region","background","backwards","baseline","below","bidi-override","binary","bengali","blink","block","block-axis","bold","bolder","border","border-box","both","bottom","break","break-all","break-word","bullets","button","button-bevel","buttonface","buttonhighlight","buttonshadow","buttontext","calc","cambodian","capitalize","caps-lock-indicator","caption","captiontext","caret","cell","center","checkbox","circle","cjk-decimal","cjk-earthly-branch","cjk-heavenly-stem","cjk-ideographic","clear","clip","close-quote","col-resize","collapse","color","color-burn","color-dodge","column","column-reverse","compact","condensed","contain","content","contents","content-box","context-menu","continuous","copy","counter","counters","cover","crop","cross","crosshair","currentcolor","cursive","cyclic","darken","dashed","decimal","decimal-leading-zero","default","default-button","dense","destination-atop","destination-in","destination-out","destination-over","devanagari","difference","disc","discard","disclosure-closed","disclosure-open","document","dot-dash","dot-dot-dash","dotted","double","down","e-resize","ease","ease-in","ease-in-out","ease-out","element","ellipse","ellipsis","embed","end","ethiopic","ethiopic-abegede","ethiopic-abegede-am-et","ethiopic-abegede-gez","ethiopic-abegede-ti-er","ethiopic-abegede-ti-et","ethiopic-halehame-aa-er","ethiopic-halehame-aa-et","ethiopic-halehame-am-et","ethiopic-halehame-gez","ethiopic-halehame-om-et","ethiopic-halehame-sid-et","ethiopic-halehame-so-et","ethiopic-halehame-ti-er","ethiopic-halehame-ti-et","ethiopic-halehame-tig","ethiopic-numeric","ew-resize","exclusion","expanded","extends","extra-condensed","extra-expanded","fantasy","fast","fill","fixed","flat","flex","flex-end","flex-start","footnotes","forwards","from","geometricPrecision","georgian","graytext","grid","groove","gujarati","gurmukhi","hand","hangul","hangul-consonant","hard-light","hebrew","help","hidden","hide","higher","highlight","highlighttext","hiragana","hiragana-iroha","horizontal","hsl","hsla","hue","icon","ignore","inactiveborder","inactivecaption","inactivecaptiontext","infinite","infobackground","infotext","inherit","initial","inline","inline-axis","inline-block","inline-flex","inline-grid","inline-table","inset","inside","intrinsic","invert","italic","japanese-formal","japanese-informal","justify","kannada","katakana","katakana-iroha","keep-all","khmer","korean-hangul-formal","korean-hanja-formal","korean-hanja-informal","landscape","lao","large","larger","left","level","lighter","lighten","line-through","linear","linear-gradient","lines","linktext","list-item","listbox","listitem","local","logical","loud","lower","lower-alpha","lower-armenian","lower-greek","lower-hexadecimal","lower-latin","lower-norwegian","lower-roman","lowercase","ltr","luminosity","malayalam","match","matrix","matrix3d","media-controls-background","media-current-time-display","media-fullscreen-button","media-mute-button","media-play-button","media-return-to-realtime-button","media-rewind-button","media-seek-back-button","media-seek-forward-button","media-slider","media-sliderthumb","media-time-remaining-display","media-volume-slider","media-volume-slider-container","media-volume-sliderthumb","medium","menu","menulist","menulist-button","menulist-text","menulist-textfield","menutext","message-box","middle","min-intrinsic","mix","mongolian","monospace","move","multiple","multiply","myanmar","n-resize","narrower","ne-resize","nesw-resize","no-close-quote","no-drop","no-open-quote","no-repeat","none","normal","not-allowed","nowrap","ns-resize","numbers","numeric","nw-resize","nwse-resize","oblique","octal","opacity","open-quote","optimizeLegibility","optimizeSpeed","oriya","oromo","outset","outside","outside-shape","overlay","overline","padding","padding-box","painted","page","paused","persian","perspective","plus-darker","plus-lighter","pointer","polygon","portrait","pre","pre-line","pre-wrap","preserve-3d","progress","push-button","radial-gradient","radio","read-only","read-write","read-write-plaintext-only","rectangle","region","relative","repeat","repeating-linear-gradient","repeating-radial-gradient","repeat-x","repeat-y","reset","reverse","rgb","rgba","ridge","right","rotate","rotate3d","rotateX","rotateY","rotateZ","round","row","row-resize","row-reverse","rtl","run-in","running","s-resize","sans-serif","saturation","scale","scale3d","scaleX","scaleY","scaleZ","screen","scroll","scrollbar","scroll-position","se-resize","searchfield","searchfield-cancel-button","searchfield-decoration","searchfield-results-button","searchfield-results-decoration","self-start","self-end","semi-condensed","semi-expanded","separate","serif","show","sidama","simp-chinese-formal","simp-chinese-informal","single","skew","skewX","skewY","skip-white-space","slide","slider-horizontal","slider-vertical","sliderthumb-horizontal","sliderthumb-vertical","slow","small","small-caps","small-caption","smaller","soft-light","solid","somali","source-atop","source-in","source-out","source-over","space","space-around","space-between","space-evenly","spell-out","square","square-button","start","static","status-bar","stretch","stroke","sub","subpixel-antialiased","super","sw-resize","symbolic","symbols","system-ui","table","table-caption","table-cell","table-column","table-column-group","table-footer-group","table-header-group","table-row","table-row-group","tamil","telugu","text","text-bottom","text-top","textarea","textfield","thai","thick","thin","threeddarkshadow","threedface","threedhighlight","threedlightshadow","threedshadow","tibetan","tigre","tigrinya-er","tigrinya-er-abegede","tigrinya-et","tigrinya-et-abegede","to","top","trad-chinese-formal","trad-chinese-informal","transform","translate","translate3d","translateX","translateY","translateZ","transparent","ultra-condensed","ultra-expanded","underline","unset","up","upper-alpha","upper-armenian","upper-greek","upper-hexadecimal","upper-latin","upper-norwegian","upper-roman","uppercase","urdu","url","var","vertical","vertical-text","visible","visibleFill","visiblePainted","visibleStroke","visitedtext","visual","w-resize","wait","wave","wider","window","windowframe","windowtext","words","wrap","wrap-reverse","x-large","x-small","xor","xx-large","xx-small"],valueKeywords=keySet(valueKeywords_);var allWords=documentTypes_.concat(mediaTypes_).concat(mediaFeatures_).concat(mediaValueKeywords_).concat(propertyKeywords_).concat(nonStandardPropertyKeywords_).concat(colorKeywords_).concat(valueKeywords_);CodeMirror.registerHelper("hintWords","css",allWords);function tokenCComment(stream,state){var maybeEnd=false,ch;while((ch=stream.next())!=null){if(maybeEnd&&ch=="/"){state.tokenize=null;break;}
maybeEnd=(ch=="*");}
return["comment","comment"];}
CodeMirror.defineMIME("text/css",{documentTypes:documentTypes,mediaTypes:mediaTypes,mediaFeatures:mediaFeatures,mediaValueKeywords:mediaValueKeywords,propertyKeywords:propertyKeywords,nonStandardPropertyKeywords:nonStandardPropertyKeywords,fontProperties:fontProperties,counterDescriptors:counterDescriptors,colorKeywords:colorKeywords,valueKeywords:valueKeywords,tokenHooks:{"/":function(stream,state){if(!stream.eat("*"))return false;state.tokenize=tokenCComment;return tokenCComment(stream,state);}},name:"css"});CodeMirror.defineMIME("text/x-scss",{mediaTypes:mediaTypes,mediaFeatures:mediaFeatures,mediaValueKeywords:mediaValueKeywords,propertyKeywords:propertyKeywords,nonStandardPropertyKeywords:nonStandardPropertyKeywords,colorKeywords:colorKeywords,valueKeywords:valueKeywords,fontProperties:fontProperties,allowNested:true,lineComment:"//",tokenHooks:{"/":function(stream,state){if(stream.eat("/")){stream.skipToEnd();return["comment","comment"];}else if(stream.eat("*")){state.tokenize=tokenCComment;return tokenCComment(stream,state);}else{return["operator","operator"];}},":":function(stream){if(stream.match(/\s*\{/,false))
return[null,null]
return false;},"$":function(stream){stream.match(/^[\w-]+/);if(stream.match(/^\s*:/,false))
return["variable-2","variable-definition"];return["variable-2","variable"];},"#":function(stream){if(!stream.eat("{"))return false;return[null,"interpolation"];}},name:"css",helperType:"scss"});CodeMirror.defineMIME("text/x-less",{mediaTypes:mediaTypes,mediaFeatures:mediaFeatures,mediaValueKeywords:mediaValueKeywords,propertyKeywords:propertyKeywords,nonStandardPropertyKeywords:nonStandardPropertyKeywords,colorKeywords:colorKeywords,valueKeywords:valueKeywords,fontProperties:fontProperties,allowNested:true,lineComment:"//",tokenHooks:{"/":function(stream,state){if(stream.eat("/")){stream.skipToEnd();return["comment","comment"];}else if(stream.eat("*")){state.tokenize=tokenCComment;return tokenCComment(stream,state);}else{return["operator","operator"];}},"@":function(stream){if(stream.eat("{"))return[null,"interpolation"];if(stream.match(/^(charset|document|font-face|import|(-(moz|ms|o|webkit)-)?keyframes|media|namespace|page|supports)\b/i,false))return false;stream.eatWhile(/[\w\\\-]/);if(stream.match(/^\s*:/,false))
return["variable-2","variable-definition"];return["variable-2","variable"];},"&":function(){return["atom","atom"];}},name:"css",helperType:"less"});CodeMirror.defineMIME("text/x-gss",{documentTypes:documentTypes,mediaTypes:mediaTypes,mediaFeatures:mediaFeatures,propertyKeywords:propertyKeywords,nonStandardPropertyKeywords:nonStandardPropertyKeywords,fontProperties:fontProperties,counterDescriptors:counterDescriptors,colorKeywords:colorKeywords,valueKeywords:valueKeywords,supportsAtComponent:true,tokenHooks:{"/":function(stream,state){if(!stream.eat("*"))return false;state.tokenize=tokenCComment;return tokenCComment(stream,state);}},name:"css",helperType:"gss"});});;(function(mod){if(typeof exports=="object"&&typeof module=="object")
mod(require("../../lib/codemirror"));else if(typeof define=="function"&&define.amd)
define(["../../lib/codemirror"],mod);else
mod(CodeMirror);})(function(CodeMirror){"use strict";var htmlConfig={autoSelfClosers:{'area':true,'base':true,'br':true,'col':true,'command':true,'embed':true,'frame':true,'hr':true,'img':true,'input':true,'keygen':true,'link':true,'meta':true,'param':true,'source':true,'track':true,'wbr':true,'menuitem':true},implicitlyClosed:{'dd':true,'li':true,'optgroup':true,'option':true,'p':true,'rp':true,'rt':true,'tbody':true,'td':true,'tfoot':true,'th':true,'tr':true},contextGrabbers:{'dd':{'dd':true,'dt':true},'dt':{'dd':true,'dt':true},'li':{'li':true},'option':{'option':true,'optgroup':true},'optgroup':{'optgroup':true},'p':{'address':true,'article':true,'aside':true,'blockquote':true,'dir':true,'div':true,'dl':true,'fieldset':true,'footer':true,'form':true,'h1':true,'h2':true,'h3':true,'h4':true,'h5':true,'h6':true,'header':true,'hgroup':true,'hr':true,'menu':true,'nav':true,'ol':true,'p':true,'pre':true,'section':true,'table':true,'ul':true},'rp':{'rp':true,'rt':true},'rt':{'rp':true,'rt':true},'tbody':{'tbody':true,'tfoot':true},'td':{'td':true,'th':true},'tfoot':{'tbody':true},'th':{'td':true,'th':true},'thead':{'tbody':true,'tfoot':true},'tr':{'tr':true}},doNotIndent:{"pre":true},allowUnquoted:true,allowMissing:true,caseFold:true}
var xmlConfig={autoSelfClosers:{},implicitlyClosed:{},contextGrabbers:{},doNotIndent:{},allowUnquoted:false,allowMissing:false,allowMissingTagName:false,caseFold:false}
CodeMirror.defineMode("xml",function(editorConf,config_){var indentUnit=editorConf.indentUnit
var config={}
var defaults=config_.htmlMode?htmlConfig:xmlConfig
for(var prop in defaults)config[prop]=defaults[prop]
for(var prop in config_)config[prop]=config_[prop]
var type,setStyle;function inText(stream,state){function chain(parser){state.tokenize=parser;return parser(stream,state);}
var ch=stream.next();if(ch=="<"){if(stream.eat("!")){if(stream.eat("[")){if(stream.match("CDATA["))return chain(inBlock("atom","]]>"));else return null;}else if(stream.match("--")){return chain(inBlock("comment","-->"));}else if(stream.match("DOCTYPE",true,true)){stream.eatWhile(/[\w\._\-]/);return chain(doctype(1));}else{return null;}}else if(stream.eat("?")){stream.eatWhile(/[\w\._\-]/);state.tokenize=inBlock("meta","?>");return"meta";}else{type=stream.eat("/")?"closeTag":"openTag";state.tokenize=inTag;return"tag bracket";}}else if(ch=="&"){var ok;if(stream.eat("#")){if(stream.eat("x")){ok=stream.eatWhile(/[a-fA-F\d]/)&&stream.eat(";");}else{ok=stream.eatWhile(/[\d]/)&&stream.eat(";");}}else{ok=stream.eatWhile(/[\w\.\-:]/)&&stream.eat(";");}
return ok?"atom":"error";}else{stream.eatWhile(/[^&<]/);return null;}}
inText.isInText=true;function inTag(stream,state){var ch=stream.next();if(ch==">"||(ch=="/"&&stream.eat(">"))){state.tokenize=inText;type=ch==">"?"endTag":"selfcloseTag";return"tag bracket";}else if(ch=="="){type="equals";return null;}else if(ch=="<"){state.tokenize=inText;state.state=baseState;state.tagName=state.tagStart=null;var next=state.tokenize(stream,state);return next?next+" tag error":"tag error";}else if(/[\'\"]/.test(ch)){state.tokenize=inAttribute(ch);state.stringStartCol=stream.column();return state.tokenize(stream,state);}else{stream.match(/^[^\s\u00a0=<>\"\']*[^\s\u00a0=<>\"\'\/]/);return"word";}}
function inAttribute(quote){var closure=function(stream,state){while(!stream.eol()){if(stream.next()==quote){state.tokenize=inTag;break;}}
return"string";};closure.isInAttribute=true;return closure;}
function inBlock(style,terminator){return function(stream,state){while(!stream.eol()){if(stream.match(terminator)){state.tokenize=inText;break;}
stream.next();}
return style;}}
function doctype(depth){return function(stream,state){var ch;while((ch=stream.next())!=null){if(ch=="<"){state.tokenize=doctype(depth+1);return state.tokenize(stream,state);}else if(ch==">"){if(depth==1){state.tokenize=inText;break;}else{state.tokenize=doctype(depth-1);return state.tokenize(stream,state);}}}
return"meta";};}
function Context(state,tagName,startOfLine){this.prev=state.context;this.tagName=tagName;this.indent=state.indented;this.startOfLine=startOfLine;if(config.doNotIndent.hasOwnProperty(tagName)||(state.context&&state.context.noIndent))
this.noIndent=true;}
function popContext(state){if(state.context)state.context=state.context.prev;}
function maybePopContext(state,nextTagName){var parentTagName;while(true){if(!state.context){return;}
parentTagName=state.context.tagName;if(!config.contextGrabbers.hasOwnProperty(parentTagName)||!config.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)){return;}
popContext(state);}}
function baseState(type,stream,state){if(type=="openTag"){state.tagStart=stream.column();return tagNameState;}else if(type=="closeTag"){return closeTagNameState;}else{return baseState;}}
function tagNameState(type,stream,state){if(type=="word"){state.tagName=stream.current();setStyle="tag";return attrState;}else if(config.allowMissingTagName&&type=="endTag"){setStyle="tag bracket";return attrState(type,stream,state);}else{setStyle="error";return tagNameState;}}
function closeTagNameState(type,stream,state){if(type=="word"){var tagName=stream.current();if(state.context&&state.context.tagName!=tagName&&config.implicitlyClosed.hasOwnProperty(state.context.tagName))
popContext(state);if((state.context&&state.context.tagName==tagName)||config.matchClosing===false){setStyle="tag";return closeState;}else{setStyle="tag error";return closeStateErr;}}else if(config.allowMissingTagName&&type=="endTag"){setStyle="tag bracket";return closeState(type,stream,state);}else{setStyle="error";return closeStateErr;}}
function closeState(type,_stream,state){if(type!="endTag"){setStyle="error";return closeState;}
popContext(state);return baseState;}
function closeStateErr(type,stream,state){setStyle="error";return closeState(type,stream,state);}
function attrState(type,_stream,state){if(type=="word"){setStyle="attribute";return attrEqState;}else if(type=="endTag"||type=="selfcloseTag"){var tagName=state.tagName,tagStart=state.tagStart;state.tagName=state.tagStart=null;if(type=="selfcloseTag"||config.autoSelfClosers.hasOwnProperty(tagName)){maybePopContext(state,tagName);}else{maybePopContext(state,tagName);state.context=new Context(state,tagName,tagStart==state.indented);}
return baseState;}
setStyle="error";return attrState;}
function attrEqState(type,stream,state){if(type=="equals")return attrValueState;if(!config.allowMissing)setStyle="error";return attrState(type,stream,state);}
function attrValueState(type,stream,state){if(type=="string")return attrContinuedState;if(type=="word"&&config.allowUnquoted){setStyle="string";return attrState;}
setStyle="error";return attrState(type,stream,state);}
function attrContinuedState(type,stream,state){if(type=="string")return attrContinuedState;return attrState(type,stream,state);}
return{startState:function(baseIndent){var state={tokenize:inText,state:baseState,indented:baseIndent||0,tagName:null,tagStart:null,context:null}
if(baseIndent!=null)state.baseIndent=baseIndent
return state},token:function(stream,state){if(!state.tagName&&stream.sol())
state.indented=stream.indentation();if(stream.eatSpace())return null;type=null;var style=state.tokenize(stream,state);if((style||type)&&style!="comment"){setStyle=null;state.state=state.state(type||style,stream,state);if(setStyle)
style=setStyle=="error"?style+" error":setStyle;}
return style;},indent:function(state,textAfter,fullLine){var context=state.context;if(state.tokenize.isInAttribute){if(state.tagStart==state.indented)
return state.stringStartCol+1;else
return state.indented+indentUnit;}
if(context&&context.noIndent)return CodeMirror.Pass;if(state.tokenize!=inTag&&state.tokenize!=inText)
return fullLine?fullLine.match(/^(\s*)/)[0].length:0;if(state.tagName){if(config.multilineTagIndentPastTag!==false)
return state.tagStart+state.tagName.length+2;else
return state.tagStart+indentUnit*(config.multilineTagIndentFactor||1);}
if(config.alignCDATA&&/<!\[CDATA\[/.test(textAfter))return 0;var tagAfter=textAfter&&/^<(\/)?([\w_:\.-]*)/.exec(textAfter);if(tagAfter&&tagAfter[1]){while(context){if(context.tagName==tagAfter[2]){context=context.prev;break;}else if(config.implicitlyClosed.hasOwnProperty(context.tagName)){context=context.prev;}else{break;}}}else if(tagAfter){while(context){var grabbers=config.contextGrabbers[context.tagName];if(grabbers&&grabbers.hasOwnProperty(tagAfter[2]))
context=context.prev;else
break;}}
while(context&&context.prev&&!context.startOfLine)
context=context.prev;if(context)return context.indent+indentUnit;else return state.baseIndent||0;},electricInput:/<\/[\s\w:]+>$/,blockCommentStart:"<!--",blockCommentEnd:"-->",configuration:config.htmlMode?"html":"xml",helperType:config.htmlMode?"html":"xml",skipAttribute:function(state){if(state.state==attrValueState)
state.state=attrState}};});CodeMirror.defineMIME("text/xml","xml");CodeMirror.defineMIME("application/xml","xml");if(!CodeMirror.mimeModes.hasOwnProperty("text/html"))
CodeMirror.defineMIME("text/html",{name:"xml",htmlMode:true});});;FormatterWorker.ESTreeWalker=class{constructor(beforeVisit,afterVisit){this._beforeVisit=beforeVisit;this._afterVisit=afterVisit||new Function();this._walkNulls=false;}
setWalkNulls(value){this._walkNulls=value;}
walk(ast){this._innerWalk(ast,null);}
_innerWalk(node,parent){if(!node&&parent&&this._walkNulls){const result=({raw:'null',value:null});result.type='Literal';node=(result);}
if(!node){return;}
node.parent=parent;if(this._beforeVisit.call(null,node)===FormatterWorker.ESTreeWalker.SkipSubtree){this._afterVisit.call(null,node);return;}
const walkOrder=FormatterWorker.ESTreeWalker._walkOrder[node.type];if(!walkOrder){console.error('Walk order not defined for '+node.type);return;}
if(node.type==='TemplateLiteral'){const templateLiteral=(node);const expressionsLength=templateLiteral.expressions.length;for(let i=0;i<expressionsLength;++i){this._innerWalk(templateLiteral.quasis[i],templateLiteral);this._innerWalk(templateLiteral.expressions[i],templateLiteral);}
this._innerWalk(templateLiteral.quasis[expressionsLength],templateLiteral);}else{for(let i=0;i<walkOrder.length;++i){const entity=node[walkOrder[i]];if(Array.isArray(entity)){this._walkArray(entity,node);}else{this._innerWalk(entity,node);}}}
this._afterVisit.call(null,node);}
_walkArray(nodeArray,parentNode){for(let i=0;i<nodeArray.length;++i){this._innerWalk(nodeArray[i],parentNode);}}};FormatterWorker.ESTreeWalker.SkipSubtree={};FormatterWorker.ESTreeWalker._walkOrder={'AwaitExpression':['arguments'],'ArrayExpression':['elements'],'ArrayPattern':['elements'],'ArrowFunctionExpression':['params','body'],'AssignmentExpression':['left','right'],'AssignmentPattern':['left','right'],'BinaryExpression':['left','right'],'BlockStatement':['body'],'BreakStatement':['label'],'CallExpression':['callee','arguments'],'CatchClause':['param','body'],'ClassBody':['body'],'ClassDeclaration':['id','superClass','body'],'ClassExpression':['id','superClass','body'],'ConditionalExpression':['test','consequent','alternate'],'ContinueStatement':['label'],'DebuggerStatement':[],'DoWhileStatement':['body','test'],'EmptyStatement':[],'ExpressionStatement':['expression'],'ForInStatement':['left','right','body'],'ForOfStatement':['left','right','body'],'ForStatement':['init','test','update','body'],'FunctionDeclaration':['id','params','body'],'FunctionExpression':['id','params','body'],'Identifier':[],'IfStatement':['test','consequent','alternate'],'LabeledStatement':['label','body'],'Literal':[],'LogicalExpression':['left','right'],'MemberExpression':['object','property'],'MethodDefinition':['key','value'],'NewExpression':['callee','arguments'],'ObjectExpression':['properties'],'ObjectPattern':['properties'],'ParenthesizedExpression':['expression'],'Program':['body'],'Property':['key','value'],'RestElement':['argument'],'ReturnStatement':['argument'],'SequenceExpression':['expressions'],'SpreadElement':['argument'],'Super':[],'SwitchCase':['test','consequent'],'SwitchStatement':['discriminant','cases'],'TaggedTemplateExpression':['tag','quasi'],'TemplateElement':[],'TemplateLiteral':['quasis','expressions'],'ThisExpression':[],'ThrowStatement':['argument'],'TryStatement':['block','handler','finalizer'],'UnaryExpression':['argument'],'UpdateExpression':['argument'],'VariableDeclaration':['declarations'],'VariableDeclarator':['id','init'],'WhileStatement':['test','body'],'WithStatement':['object','body'],'YieldExpression':['argument']};;FormatterWorker.createTokenizer=function(mimeType){const mode=CodeMirror.getMode({indentUnit:2},mimeType);const state=CodeMirror.startState(mode);function tokenize(line,callback){const stream=new CodeMirror.StringStream(line);while(!stream.eol()){const style=mode.token(stream,state);const value=stream.current();if(callback(value,style,stream.start,stream.start+value.length)===FormatterWorker.AbortTokenization){return;}
stream.start=stream.pos;}}
return tokenize;};FormatterWorker.AbortTokenization={};self.onmessage=function(event){const method=(event.data.method);const params=(event.data.params);if(!method){return;}
switch(method){case'format':FormatterWorker.format(params.mimeType,params.content,params.indentString);break;case'parseCSS':FormatterWorker.parseCSS(params.content);break;case'parseSCSS':FormatterWorker.FormatterWorkerContentParser.parse(params.content,'text/x-scss');break;case'javaScriptOutline':FormatterWorker.javaScriptOutline(params.content);break;case'javaScriptIdentifiers':FormatterWorker.javaScriptIdentifiers(params.content);break;case'evaluatableJavaScriptSubstring':FormatterWorker.evaluatableJavaScriptSubstring(params.content);break;case'parseJSONRelaxed':FormatterWorker.parseJSONRelaxed(params.content);break;case'preprocessTopLevelAwaitExpressions':FormatterWorker.preprocessTopLevelAwaitExpressions(params.content);break;case'findLastExpression':postMessage(FormatterWorker.findLastExpression(params.content));break;case'findLastFunctionCall':postMessage(FormatterWorker.findLastFunctionCall(params.content));break;case'argumentsList':postMessage(FormatterWorker.argumentsList(params.content));break;default:console.error('Unsupport method name: '+method);}};FormatterWorker.parseJSONRelaxed=function(content){postMessage(FormatterWorker.RelaxedJSONParser.parse(content));};FormatterWorker.evaluatableJavaScriptSubstring=function(content){const tokenizer=acorn.tokenizer(content,{});let result='';try{let token=tokenizer.getToken();while(token.type!==acorn.tokTypes.eof&&FormatterWorker.AcornTokenizer.punctuator(token)){token=tokenizer.getToken();}
const startIndex=token.start;let endIndex=token.end;let openBracketsCounter=0;while(token.type!==acorn.tokTypes.eof){const isIdentifier=FormatterWorker.AcornTokenizer.identifier(token);const isThis=FormatterWorker.AcornTokenizer.keyword(token,'this');const isString=token.type===acorn.tokTypes.string;if(!isThis&&!isIdentifier&&!isString){break;}
endIndex=token.end;token=tokenizer.getToken();while(FormatterWorker.AcornTokenizer.punctuator(token,'.[]')){if(FormatterWorker.AcornTokenizer.punctuator(token,'[')){openBracketsCounter++;}
if(FormatterWorker.AcornTokenizer.punctuator(token,']')){endIndex=openBracketsCounter>0?token.end:endIndex;openBracketsCounter--;}
token=tokenizer.getToken();}}
result=content.substring(startIndex,endIndex);}catch(e){console.error(e);}
postMessage(result);};FormatterWorker.preprocessTopLevelAwaitExpressions=function(content){let wrapped='(async () => {'+content+'\n})()';let root;let body;try{root=acorn.parse(wrapped,{});body=root.body[0].expression.callee.body;}catch(e){postMessage('');return;}
const changes=[];let containsAwait=false;let containsReturn=false;class Visitor{ClassDeclaration(node){if(node.parent===body){changes.push({text:node.id.name+'=',start:node.start,end:node.start});}}
FunctionDeclaration(node){changes.push({text:node.id.name+'=',start:node.start,end:node.start});return FormatterWorker.ESTreeWalker.SkipSubtree;}
FunctionExpression(node){return FormatterWorker.ESTreeWalker.SkipSubtree;}
ArrowFunctionExpression(node){return FormatterWorker.ESTreeWalker.SkipSubtree;}
MethodDefinition(node){return FormatterWorker.ESTreeWalker.SkipSubtree;}
AwaitExpression(node){containsAwait=true;}
ForOfStatement(node){if(node.await){containsAwait=true;}}
ReturnStatement(node){containsReturn=true;}
VariableDeclaration(node){if(node.kind!=='var'&&node.parent!==body){return;}
if(node.parent.type==='ForOfStatement'&&node.parent.left===node){return;}
const onlyOneDeclaration=node.declarations.length===1;changes.push({text:onlyOneDeclaration?'void':'void (',start:node.start,end:node.start+node.kind.length});for(const declaration of node.declarations){if(!declaration.init){changes.push({text:'(',start:declaration.start,end:declaration.start});changes.push({text:'=undefined)',start:declaration.end,end:declaration.end});continue;}
changes.push({text:'(',start:declaration.start,end:declaration.start});changes.push({text:')',start:declaration.end,end:declaration.end});}
if(!onlyOneDeclaration){const last=node.declarations.peekLast();changes.push({text:')',start:last.end,end:last.end});}}}
const walker=new FormatterWorker.ESTreeWalker(visit.bind(new Visitor()));walker.walk(body);function visit(node){if(node.type in this){return this[node.type](node);}}
if(!containsAwait||containsReturn){postMessage('');return;}
const last=body.body[body.body.length-1];if(last.type==='ExpressionStatement'){changes.push({text:'return (',start:last.start,end:last.start});if(wrapped[last.end-1]!==';'){changes.push({text:')',start:last.end,end:last.end});}else{changes.push({text:')',start:last.end-1,end:last.end-1});}}
while(changes.length){const change=changes.pop();wrapped=wrapped.substr(0,change.start)+change.text+wrapped.substr(change.end);}
postMessage(wrapped);};FormatterWorker.javaScriptIdentifiers=function(content){let root=null;try{root=acorn.parse(content,{ranges:false});}catch(e){}
const identifiers=[];const walker=new FormatterWorker.ESTreeWalker(beforeVisit);function isFunction(node){return node.type==='FunctionDeclaration'||node.type==='FunctionExpression'||node.type==='ArrowFunctionExpression';}
function beforeVisit(node){if(isFunction(node)){if(node.id){identifiers.push(node.id);}
return FormatterWorker.ESTreeWalker.SkipSubtree;}
if(node.type!=='Identifier'){return;}
if(node.parent&&node.parent.type==='MemberExpression'&&node.parent.property===node&&!node.parent.computed){return;}
identifiers.push(node);}
if(!root||root.type!=='Program'||root.body.length!==1||!isFunction(root.body[0])){postMessage([]);return;}
const functionNode=root.body[0];for(const param of functionNode.params){walker.walk(param);}
walker.walk(functionNode.body);const reduced=identifiers.map(id=>({name:id.name,offset:id.start}));postMessage(reduced);};FormatterWorker.format=function(mimeType,text,indentString){indentString=indentString||'    ';const result={};const builder=new FormatterWorker.FormattedContentBuilder(indentString);const lineEndings=text.computeLineEndings();try{switch(mimeType){case'text/html':{const formatter=new FormatterWorker.HTMLFormatter(builder);formatter.format(text,lineEndings);break;}
case'text/css':{const formatter=new FormatterWorker.CSSFormatter(builder);formatter.format(text,lineEndings,0,text.length);break;}
case'text/javascript':{const formatter=new FormatterWorker.JavaScriptFormatter(builder);formatter.format(text,lineEndings,0,text.length);break;}
default:{const formatter=new FormatterWorker.IdentityFormatter(builder);formatter.format(text,lineEndings,0,text.length);}}
result.mapping=builder.mapping();result.content=builder.content();}catch(e){console.error(e);result.mapping={original:[0],formatted:[0]};result.content=text;}
postMessage(result);};FormatterWorker.findLastFunctionCall=function(content){if(content.length>10000){return null;}
try{const tokenizer=acorn.tokenizer(content,{});while(tokenizer.getToken().type!==acorn.tokTypes.eof){}}catch(e){return null;}
const suffix='000)';const base=FormatterWorker._lastCompleteExpression(content,suffix,new Set(['CallExpression','NewExpression']));if(!base){return null;}
const callee=base.baseNode['callee'];let functionName='';const functionProperty=callee.type==='Identifier'?callee:callee.property;if(functionProperty){if(functionProperty.type==='Identifier'){functionName=functionProperty.name;}else if(functionProperty.type==='Literal'){functionName=functionProperty.value;}}
const argumentIndex=base.baseNode['arguments'].length-1;const baseExpression=`(${base.baseExpression.substring(callee.start - base.baseNode.start, callee.end - base.baseNode.start)})`;const possibleSideEffects=FormatterWorker._nodeHasPossibleSideEffects(callee);let receiver='(function(){return this})()';if(callee.type==='MemberExpression'){const receiverBase=callee['object'];receiver=base.baseExpression.substring(receiverBase.start-base.baseNode.start,receiverBase.end-base.baseNode.start);}
return{baseExpression,receiver,possibleSideEffects,argumentIndex,functionName};};FormatterWorker.argumentsList=function(content){if(content.length>10000){return[];}
let parsed=null;try{parsed=acorn.parse(`(${content})`,{});}catch(e){}
if(!parsed){try{parsed=acorn.parse(`({${content}})`,{});}catch(e){}}
if(!parsed||!parsed.body||!parsed.body[0]||!parsed.body[0].expression){return[];}
const expression=parsed.body[0].expression;let params=null;switch(expression.type){case'ClassExpression':if(!expression.body.body){break;}
const constructor=expression.body.body.find(method=>method.kind==='constructor');if(constructor){params=constructor.value.params;}
break;case'ObjectExpression':if(!expression.properties[0]||!expression.properties[0].value){break;}
params=expression.properties[0].value.params;break;case'FunctionExpression':case'ArrowFunctionExpression':params=expression.params;break;}
if(!params){return[];}
return params.map(paramName);function paramName(param){switch(param.type){case'Identifier':return param.name;case'AssignmentPattern':return'?'+paramName(param.left);case'ObjectPattern':return'obj';case'ArrayPattern':return'arr';case'RestElement':return'...'+paramName(param.argument);}
return'?';}};FormatterWorker.findLastExpression=function(content){if(content.length>10000){return null;}
try{const tokenizer=acorn.tokenizer(content,{});while(tokenizer.getToken().type!==acorn.tokTypes.eof){}}catch(e){return null;}
const suffix='.DEVTOOLS';try{acorn.parse(content+suffix,{});}catch(parseError){if(parseError.message.startsWith('Unexpected token')&&parseError.pos===content.length){return null;}}
const base=FormatterWorker._lastCompleteExpression(content,suffix,new Set(['MemberExpression','Identifier']));if(!base){return null;}
const{baseExpression,baseNode}=base;const possibleSideEffects=FormatterWorker._nodeHasPossibleSideEffects(baseNode);return{baseExpression,possibleSideEffects};};FormatterWorker._lastCompleteExpression=function(content,suffix,types){let ast;let parsedContent='';for(let i=0;i<content.length;i++){try{parsedContent=content[i]==='{'?`(${content.substring(i)})${suffix}`:`${content.substring(i)}${suffix}`;ast=acorn.parse(parsedContent,{});break;}catch(e){}}
if(!ast){return null;}
let baseNode=null;const walker=new FormatterWorker.ESTreeWalker(node=>{if(baseNode||node.end<ast.end){return FormatterWorker.ESTreeWalker.SkipSubtree;}
if(types.has(node.type)){baseNode=node;}});walker.walk(ast);if(!baseNode){return null;}
let baseExpression=parsedContent.substring(baseNode.start,parsedContent.length-suffix.length);if(baseExpression.startsWith('{')){baseExpression=`(${baseExpression})`;}
return{baseNode,baseExpression};};FormatterWorker._nodeHasPossibleSideEffects=function(baseNode){const sideEffectFreeTypes=new Set(['MemberExpression','Identifier','BinaryExpression','Literal','TemplateLiteral','TemplateElement','ObjectExpression','ArrayExpression','Property','ThisExpression']);let possibleSideEffects=false;const sideEffectwalker=new FormatterWorker.ESTreeWalker(node=>{if(!possibleSideEffects&&!sideEffectFreeTypes.has(node.type)){possibleSideEffects=true;}
if(possibleSideEffects){return FormatterWorker.ESTreeWalker.SkipSubtree;}});sideEffectwalker.walk((baseNode));return possibleSideEffects;};FormatterWorker.FormatterWorkerContentParser=function(){};FormatterWorker.FormatterWorkerContentParser.prototype={parse(content){}};FormatterWorker.FormatterWorkerContentParser.parse=function(content,mimeType){const extension=self.runtime.extensions(FormatterWorker.FormatterWorkerContentParser).find(findExtension);console.assert(extension);extension.instance().then(instance=>instance.parse(content)).catchException(null).then(postMessage);function findExtension(extension){return extension.descriptor()['mimeType']===mimeType;}};(function disableLoggingForTest(){if(Root.Runtime.queryParam('test')){console.error=()=>undefined;}})();;(function(global,factory){typeof exports==='object'&&typeof module!=='undefined'?factory(exports):typeof define==='function'&&define.amd?define(['exports'],factory):(global=global||self,factory(global.acorn={}));}(this,function(exports){'use strict';var reservedWords={3:"abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",5:"class enum extends super const export import",6:"enum",strict:"implements interface let package private protected public static yield",strictBind:"eval arguments"};var ecma5AndLessKeywords="break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";var keywords={5:ecma5AndLessKeywords,"5module":ecma5AndLessKeywords+" export import",6:ecma5AndLessKeywords+" const class extends export import super"};var keywordRelationalOperator=/^in(stanceof)?$/;var nonASCIIidentifierStartChars="\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf3\u1cf5\u1cf6\u1cfa\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7bf\ua7c2-\ua7c6\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab67\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";var nonASCIIidentifierChars="\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf4\u1cf7-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";var nonASCIIidentifierStart=new RegExp("["+nonASCIIidentifierStartChars+"]");var nonASCIIidentifier=new RegExp("["+nonASCIIidentifierStartChars+nonASCIIidentifierChars+"]");nonASCIIidentifierStartChars=nonASCIIidentifierChars=null;var astralIdentifierStartCodes=[0,11,2,25,2,18,2,1,2,14,3,13,35,122,70,52,268,28,4,48,48,31,14,29,6,37,11,29,3,35,5,7,2,4,43,157,19,35,5,35,5,39,9,51,157,310,10,21,11,7,153,5,3,0,2,43,2,1,4,0,3,22,11,22,10,30,66,18,2,1,11,21,11,25,71,55,7,1,65,0,16,3,2,2,2,28,43,28,4,28,36,7,2,27,28,53,11,21,11,18,14,17,111,72,56,50,14,50,14,35,477,28,11,0,9,21,155,22,13,52,76,44,33,24,27,35,30,0,12,34,4,0,13,47,15,3,22,0,2,0,36,17,2,24,85,6,2,0,2,3,2,14,2,9,8,46,39,7,3,1,3,21,2,6,2,1,2,4,4,0,19,0,13,4,159,52,19,3,21,0,33,47,21,1,2,0,185,46,42,3,37,47,21,0,60,42,14,0,72,26,230,43,117,63,32,0,161,7,3,38,17,0,2,0,29,0,11,39,8,0,22,0,12,45,20,0,35,56,264,8,2,36,18,0,50,29,113,6,2,1,2,37,22,0,26,5,2,1,2,31,15,0,328,18,270,921,103,110,18,195,2749,1070,4050,582,8634,568,8,30,114,29,19,47,17,3,32,20,6,18,689,63,129,74,6,0,67,12,65,1,2,0,29,6135,9,754,9486,286,50,2,18,3,9,395,2309,106,6,12,4,8,8,9,5991,84,2,70,2,1,3,0,3,1,3,3,2,11,2,0,2,6,2,64,2,3,3,7,2,6,2,27,2,3,2,4,2,0,4,6,2,339,3,24,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,7,2357,44,11,6,17,0,370,43,1301,196,60,67,8,0,1205,3,2,26,2,1,2,0,3,0,2,9,2,3,2,0,2,0,7,0,5,0,2,0,2,0,2,2,2,1,2,0,3,0,2,0,2,0,2,0,2,0,2,1,2,0,3,3,2,6,2,3,2,3,2,0,2,9,2,16,6,2,2,4,2,16,4421,42710,42,4148,12,221,3,5761,15,7472,3104,541];var astralIdentifierCodes=[509,0,227,0,150,4,294,9,1368,2,2,1,6,3,41,2,5,0,166,1,574,3,9,9,525,10,176,2,54,14,32,9,16,3,46,10,54,9,7,2,37,13,2,9,6,1,45,0,13,2,49,13,9,3,4,9,83,11,7,0,161,11,6,9,7,3,56,1,2,6,3,1,3,2,10,0,11,1,3,6,4,4,193,17,10,9,5,0,82,19,13,9,214,6,3,8,28,1,83,16,16,9,82,12,9,9,84,14,5,9,243,14,166,9,232,6,3,6,4,0,29,9,41,6,2,3,9,0,10,10,47,15,406,7,2,7,17,9,57,21,2,13,123,5,4,0,2,1,2,6,2,0,9,9,49,4,2,1,2,4,9,9,330,3,19306,9,135,4,60,6,26,9,1014,0,2,54,8,3,19723,1,5319,4,4,5,9,7,3,6,31,3,149,2,1418,49,513,54,5,49,9,0,15,0,23,4,2,14,1361,6,2,16,3,6,2,1,2,4,262,6,10,9,419,13,1495,6,110,6,6,9,792487,239];function isInAstralSet(code,set){var pos=0x10000;for(var i=0;i<set.length;i+=2){pos+=set[i];if(pos>code){return false}
pos+=set[i+1];if(pos>=code){return true}}}
function isIdentifierStart(code,astral){if(code<65){return code===36}
if(code<91){return true}
if(code<97){return code===95}
if(code<123){return true}
if(code<=0xffff){return code>=0xaa&&nonASCIIidentifierStart.test(String.fromCharCode(code))}
if(astral===false){return false}
return isInAstralSet(code,astralIdentifierStartCodes)}
function isIdentifierChar(code,astral){if(code<48){return code===36}
if(code<58){return true}
if(code<65){return false}
if(code<91){return true}
if(code<97){return code===95}
if(code<123){return true}
if(code<=0xffff){return code>=0xaa&&nonASCIIidentifier.test(String.fromCharCode(code))}
if(astral===false){return false}
return isInAstralSet(code,astralIdentifierStartCodes)||isInAstralSet(code,astralIdentifierCodes)}
var TokenType=function TokenType(label,conf){if(conf===void 0)conf={};this.label=label;this.keyword=conf.keyword;this.beforeExpr=!!conf.beforeExpr;this.startsExpr=!!conf.startsExpr;this.isLoop=!!conf.isLoop;this.isAssign=!!conf.isAssign;this.prefix=!!conf.prefix;this.postfix=!!conf.postfix;this.binop=conf.binop||null;this.updateContext=null;};function binop(name,prec){return new TokenType(name,{beforeExpr:true,binop:prec})}
var beforeExpr={beforeExpr:true},startsExpr={startsExpr:true};var keywords$1={};function kw(name,options){if(options===void 0)options={};options.keyword=name;return keywords$1[name]=new TokenType(name,options)}
var types={num:new TokenType("num",startsExpr),regexp:new TokenType("regexp",startsExpr),string:new TokenType("string",startsExpr),name:new TokenType("name",startsExpr),eof:new TokenType("eof"),bracketL:new TokenType("[",{beforeExpr:true,startsExpr:true}),bracketR:new TokenType("]"),braceL:new TokenType("{",{beforeExpr:true,startsExpr:true}),braceR:new TokenType("}"),parenL:new TokenType("(",{beforeExpr:true,startsExpr:true}),parenR:new TokenType(")"),comma:new TokenType(",",beforeExpr),semi:new TokenType(";",beforeExpr),colon:new TokenType(":",beforeExpr),dot:new TokenType("."),question:new TokenType("?",beforeExpr),arrow:new TokenType("=>",beforeExpr),template:new TokenType("template"),invalidTemplate:new TokenType("invalidTemplate"),ellipsis:new TokenType("...",beforeExpr),backQuote:new TokenType("`",startsExpr),dollarBraceL:new TokenType("${",{beforeExpr:true,startsExpr:true}),eq:new TokenType("=",{beforeExpr:true,isAssign:true}),assign:new TokenType("_=",{beforeExpr:true,isAssign:true}),incDec:new TokenType("++/--",{prefix:true,postfix:true,startsExpr:true}),prefix:new TokenType("!/~",{beforeExpr:true,prefix:true,startsExpr:true}),logicalOR:binop("||",1),logicalAND:binop("&&",2),bitwiseOR:binop("|",3),bitwiseXOR:binop("^",4),bitwiseAND:binop("&",5),equality:binop("==/!=/===/!==",6),relational:binop("</>/<=/>=",7),bitShift:binop("<</>>/>>>",8),plusMin:new TokenType("+/-",{beforeExpr:true,binop:9,prefix:true,startsExpr:true}),modulo:binop("%",10),star:binop("*",10),slash:binop("/",10),starstar:new TokenType("**",{beforeExpr:true}),_break:kw("break"),_case:kw("case",beforeExpr),_catch:kw("catch"),_continue:kw("continue"),_debugger:kw("debugger"),_default:kw("default",beforeExpr),_do:kw("do",{isLoop:true,beforeExpr:true}),_else:kw("else",beforeExpr),_finally:kw("finally"),_for:kw("for",{isLoop:true}),_function:kw("function",startsExpr),_if:kw("if"),_return:kw("return",beforeExpr),_switch:kw("switch"),_throw:kw("throw",beforeExpr),_try:kw("try"),_var:kw("var"),_const:kw("const"),_while:kw("while",{isLoop:true}),_with:kw("with"),_new:kw("new",{beforeExpr:true,startsExpr:true}),_this:kw("this",startsExpr),_super:kw("super",startsExpr),_class:kw("class",startsExpr),_extends:kw("extends",beforeExpr),_export:kw("export"),_import:kw("import",startsExpr),_null:kw("null",startsExpr),_true:kw("true",startsExpr),_false:kw("false",startsExpr),_in:kw("in",{beforeExpr:true,binop:7}),_instanceof:kw("instanceof",{beforeExpr:true,binop:7}),_typeof:kw("typeof",{beforeExpr:true,prefix:true,startsExpr:true}),_void:kw("void",{beforeExpr:true,prefix:true,startsExpr:true}),_delete:kw("delete",{beforeExpr:true,prefix:true,startsExpr:true})};var lineBreak=/\r\n?|\n|\u2028|\u2029/;var lineBreakG=new RegExp(lineBreak.source,"g");function isNewLine(code,ecma2019String){return code===10||code===13||(!ecma2019String&&(code===0x2028||code===0x2029))}
var nonASCIIwhitespace=/[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/;var skipWhiteSpace=/(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;var ref=Object.prototype;var hasOwnProperty=ref.hasOwnProperty;var toString=ref.toString;function has(obj,propName){return hasOwnProperty.call(obj,propName)}
var isArray=Array.isArray||(function(obj){return(toString.call(obj)==="[object Array]");});function wordsRegexp(words){return new RegExp("^(?:"+words.replace(/ /g,"|")+")$")}
var Position=function Position(line,col){this.line=line;this.column=col;};Position.prototype.offset=function offset(n){return new Position(this.line,this.column+n)};var SourceLocation=function SourceLocation(p,start,end){this.start=start;this.end=end;if(p.sourceFile!==null){this.source=p.sourceFile;}};function getLineInfo(input,offset){for(var line=1,cur=0;;){lineBreakG.lastIndex=cur;var match=lineBreakG.exec(input);if(match&&match.index<offset){++line;cur=match.index+match[0].length;}else{return new Position(line,offset-cur)}}}
var defaultOptions={ecmaVersion:10,sourceType:"script",onInsertedSemicolon:null,onTrailingComma:null,allowReserved:null,allowReturnOutsideFunction:false,allowImportExportEverywhere:false,allowAwaitOutsideFunction:false,allowHashBang:false,locations:false,onToken:null,onComment:null,ranges:false,program:null,sourceFile:null,directSourceFile:null,preserveParens:false};function getOptions(opts){var options={};for(var opt in defaultOptions)
{options[opt]=opts&&has(opts,opt)?opts[opt]:defaultOptions[opt];}
if(options.ecmaVersion>=2015)
{options.ecmaVersion-=2009;}
if(options.allowReserved==null)
{options.allowReserved=options.ecmaVersion<5;}
if(isArray(options.onToken)){var tokens=options.onToken;options.onToken=function(token){return tokens.push(token);};}
if(isArray(options.onComment))
{options.onComment=pushComment(options,options.onComment);}
return options}
function pushComment(options,array){return function(block,text,start,end,startLoc,endLoc){var comment={type:block?"Block":"Line",value:text,start:start,end:end};if(options.locations)
{comment.loc=new SourceLocation(this,startLoc,endLoc);}
if(options.ranges)
{comment.range=[start,end];}
array.push(comment);}}
var
SCOPE_TOP=1,SCOPE_FUNCTION=2,SCOPE_VAR=SCOPE_TOP|SCOPE_FUNCTION,SCOPE_ASYNC=4,SCOPE_GENERATOR=8,SCOPE_ARROW=16,SCOPE_SIMPLE_CATCH=32,SCOPE_SUPER=64,SCOPE_DIRECT_SUPER=128;function functionFlags(async,generator){return SCOPE_FUNCTION|(async?SCOPE_ASYNC:0)|(generator?SCOPE_GENERATOR:0)}
var
BIND_NONE=0,BIND_VAR=1,BIND_LEXICAL=2,BIND_FUNCTION=3,BIND_SIMPLE_CATCH=4,BIND_OUTSIDE=5;var Parser=function Parser(options,input,startPos){this.options=options=getOptions(options);this.sourceFile=options.sourceFile;this.keywords=wordsRegexp(keywords[options.ecmaVersion>=6?6:options.sourceType==="module"?"5module":5]);var reserved="";if(options.allowReserved!==true){for(var v=options.ecmaVersion;;v--)
{if(reserved=reservedWords[v]){break}}
if(options.sourceType==="module"){reserved+=" await";}}
this.reservedWords=wordsRegexp(reserved);var reservedStrict=(reserved?reserved+" ":"")+reservedWords.strict;this.reservedWordsStrict=wordsRegexp(reservedStrict);this.reservedWordsStrictBind=wordsRegexp(reservedStrict+" "+reservedWords.strictBind);this.input=String(input);this.containsEsc=false;if(startPos){this.pos=startPos;this.lineStart=this.input.lastIndexOf("\n",startPos-1)+1;this.curLine=this.input.slice(0,this.lineStart).split(lineBreak).length;}else{this.pos=this.lineStart=0;this.curLine=1;}
this.type=types.eof;this.value=null;this.start=this.end=this.pos;this.startLoc=this.endLoc=this.curPosition();this.lastTokEndLoc=this.lastTokStartLoc=null;this.lastTokStart=this.lastTokEnd=this.pos;this.context=this.initialContext();this.exprAllowed=true;this.inModule=options.sourceType==="module";this.strict=this.inModule||this.strictDirective(this.pos);this.potentialArrowAt=-1;this.yieldPos=this.awaitPos=this.awaitIdentPos=0;this.labels=[];this.undefinedExports={};if(this.pos===0&&options.allowHashBang&&this.input.slice(0,2)==="#!")
{this.skipLineComment(2);}
this.scopeStack=[];this.enterScope(SCOPE_TOP);this.regexpState=null;};var prototypeAccessors={inFunction:{configurable:true},inGenerator:{configurable:true},inAsync:{configurable:true},allowSuper:{configurable:true},allowDirectSuper:{configurable:true},treatFunctionsAsVar:{configurable:true}};Parser.prototype.parse=function parse(){var node=this.options.program||this.startNode();this.nextToken();return this.parseTopLevel(node)};prototypeAccessors.inFunction.get=function(){return(this.currentVarScope().flags&SCOPE_FUNCTION)>0};prototypeAccessors.inGenerator.get=function(){return(this.currentVarScope().flags&SCOPE_GENERATOR)>0};prototypeAccessors.inAsync.get=function(){return(this.currentVarScope().flags&SCOPE_ASYNC)>0};prototypeAccessors.allowSuper.get=function(){return(this.currentThisScope().flags&SCOPE_SUPER)>0};prototypeAccessors.allowDirectSuper.get=function(){return(this.currentThisScope().flags&SCOPE_DIRECT_SUPER)>0};prototypeAccessors.treatFunctionsAsVar.get=function(){return this.treatFunctionsAsVarInScope(this.currentScope())};Parser.prototype.inNonArrowFunction=function inNonArrowFunction(){return(this.currentThisScope().flags&SCOPE_FUNCTION)>0};Parser.extend=function extend(){var plugins=[],len=arguments.length;while(len--)plugins[len]=arguments[len];var cls=this;for(var i=0;i<plugins.length;i++){cls=plugins[i](cls);}
return cls};Parser.parse=function parse(input,options){return new this(options,input).parse()};Parser.parseExpressionAt=function parseExpressionAt(input,pos,options){var parser=new this(options,input,pos);parser.nextToken();return parser.parseExpression()};Parser.tokenizer=function tokenizer(input,options){return new this(options,input)};Object.defineProperties(Parser.prototype,prototypeAccessors);var pp=Parser.prototype;var literal=/^(?:'((?:\\.|[^'])*?)'|"((?:\\.|[^"])*?)")/;pp.strictDirective=function(start){for(;;){skipWhiteSpace.lastIndex=start;start+=skipWhiteSpace.exec(this.input)[0].length;var match=literal.exec(this.input.slice(start));if(!match){return false}
if((match[1]||match[2])==="use strict"){return true}
start+=match[0].length;skipWhiteSpace.lastIndex=start;start+=skipWhiteSpace.exec(this.input)[0].length;if(this.input[start]===";")
{start++;}}};pp.eat=function(type){if(this.type===type){this.next();return true}else{return false}};pp.isContextual=function(name){return this.type===types.name&&this.value===name&&!this.containsEsc};pp.eatContextual=function(name){if(!this.isContextual(name)){return false}
this.next();return true};pp.expectContextual=function(name){if(!this.eatContextual(name)){this.unexpected();}};pp.canInsertSemicolon=function(){return this.type===types.eof||this.type===types.braceR||lineBreak.test(this.input.slice(this.lastTokEnd,this.start))};pp.insertSemicolon=function(){if(this.canInsertSemicolon()){if(this.options.onInsertedSemicolon)
{this.options.onInsertedSemicolon(this.lastTokEnd,this.lastTokEndLoc);}
return true}};pp.semicolon=function(){if(!this.eat(types.semi)&&!this.insertSemicolon()){this.unexpected();}};pp.afterTrailingComma=function(tokType,notNext){if(this.type===tokType){if(this.options.onTrailingComma)
{this.options.onTrailingComma(this.lastTokStart,this.lastTokStartLoc);}
if(!notNext)
{this.next();}
return true}};pp.expect=function(type){this.eat(type)||this.unexpected();};pp.unexpected=function(pos){this.raise(pos!=null?pos:this.start,"Unexpected token");};function DestructuringErrors(){this.shorthandAssign=this.trailingComma=this.parenthesizedAssign=this.parenthesizedBind=this.doubleProto=-1;}
pp.checkPatternErrors=function(refDestructuringErrors,isAssign){if(!refDestructuringErrors){return}
if(refDestructuringErrors.trailingComma>-1)
{this.raiseRecoverable(refDestructuringErrors.trailingComma,"Comma is not permitted after the rest element");}
var parens=isAssign?refDestructuringErrors.parenthesizedAssign:refDestructuringErrors.parenthesizedBind;if(parens>-1){this.raiseRecoverable(parens,"Parenthesized pattern");}};pp.checkExpressionErrors=function(refDestructuringErrors,andThrow){if(!refDestructuringErrors){return false}
var shorthandAssign=refDestructuringErrors.shorthandAssign;var doubleProto=refDestructuringErrors.doubleProto;if(!andThrow){return shorthandAssign>=0||doubleProto>=0}
if(shorthandAssign>=0)
{this.raise(shorthandAssign,"Shorthand property assignments are valid only in destructuring patterns");}
if(doubleProto>=0)
{this.raiseRecoverable(doubleProto,"Redefinition of __proto__ property");}};pp.checkYieldAwaitInDefaultParams=function(){if(this.yieldPos&&(!this.awaitPos||this.yieldPos<this.awaitPos))
{this.raise(this.yieldPos,"Yield expression cannot be a default value");}
if(this.awaitPos)
{this.raise(this.awaitPos,"Await expression cannot be a default value");}};pp.isSimpleAssignTarget=function(expr){if(expr.type==="ParenthesizedExpression")
{return this.isSimpleAssignTarget(expr.expression)}
return expr.type==="Identifier"||expr.type==="MemberExpression"};var pp$1=Parser.prototype;pp$1.parseTopLevel=function(node){var exports={};if(!node.body){node.body=[];}
while(this.type!==types.eof){var stmt=this.parseStatement(null,true,exports);node.body.push(stmt);}
if(this.inModule)
{for(var i=0,list=Object.keys(this.undefinedExports);i<list.length;i+=1)
{var name=list[i];this.raiseRecoverable(this.undefinedExports[name].start,("Export '"+name+"' is not defined"));}}
this.adaptDirectivePrologue(node.body);this.next();node.sourceType=this.options.sourceType;return this.finishNode(node,"Program")};var loopLabel={kind:"loop"},switchLabel={kind:"switch"};pp$1.isLet=function(context){if(this.options.ecmaVersion<6||!this.isContextual("let")){return false}
skipWhiteSpace.lastIndex=this.pos;var skip=skipWhiteSpace.exec(this.input);var next=this.pos+skip[0].length,nextCh=this.input.charCodeAt(next);if(nextCh===91){return true}
if(context){return false}
if(nextCh===123){return true}
if(isIdentifierStart(nextCh,true)){var pos=next+1;while(isIdentifierChar(this.input.charCodeAt(pos),true)){++pos;}
var ident=this.input.slice(next,pos);if(!keywordRelationalOperator.test(ident)){return true}}
return false};pp$1.isAsyncFunction=function(){if(this.options.ecmaVersion<8||!this.isContextual("async"))
{return false}
skipWhiteSpace.lastIndex=this.pos;var skip=skipWhiteSpace.exec(this.input);var next=this.pos+skip[0].length;return!lineBreak.test(this.input.slice(this.pos,next))&&this.input.slice(next,next+8)==="function"&&(next+8===this.input.length||!isIdentifierChar(this.input.charAt(next+8)))};pp$1.parseStatement=function(context,topLevel,exports){var starttype=this.type,node=this.startNode(),kind;if(this.isLet(context)){starttype=types._var;kind="let";}
switch(starttype){case types._break:case types._continue:return this.parseBreakContinueStatement(node,starttype.keyword)
case types._debugger:return this.parseDebuggerStatement(node)
case types._do:return this.parseDoStatement(node)
case types._for:return this.parseForStatement(node)
case types._function:if((context&&(this.strict||context!=="if"&&context!=="label"))&&this.options.ecmaVersion>=6){this.unexpected();}
return this.parseFunctionStatement(node,false,!context)
case types._class:if(context){this.unexpected();}
return this.parseClass(node,true)
case types._if:return this.parseIfStatement(node)
case types._return:return this.parseReturnStatement(node)
case types._switch:return this.parseSwitchStatement(node)
case types._throw:return this.parseThrowStatement(node)
case types._try:return this.parseTryStatement(node)
case types._const:case types._var:kind=kind||this.value;if(context&&kind!=="var"){this.unexpected();}
return this.parseVarStatement(node,kind)
case types._while:return this.parseWhileStatement(node)
case types._with:return this.parseWithStatement(node)
case types.braceL:return this.parseBlock(true,node)
case types.semi:return this.parseEmptyStatement(node)
case types._export:case types._import:if(this.options.ecmaVersion>10&&starttype===types._import){skipWhiteSpace.lastIndex=this.pos;var skip=skipWhiteSpace.exec(this.input);var next=this.pos+skip[0].length,nextCh=this.input.charCodeAt(next);if(nextCh===40)
{return this.parseExpressionStatement(node,this.parseExpression())}}
if(!this.options.allowImportExportEverywhere){if(!topLevel)
{this.raise(this.start,"'import' and 'export' may only appear at the top level");}
if(!this.inModule)
{this.raise(this.start,"'import' and 'export' may appear only with 'sourceType: module'");}}
return starttype===types._import?this.parseImport(node):this.parseExport(node,exports)
default:if(this.isAsyncFunction()){if(context){this.unexpected();}
this.next();return this.parseFunctionStatement(node,true,!context)}
var maybeName=this.value,expr=this.parseExpression();if(starttype===types.name&&expr.type==="Identifier"&&this.eat(types.colon))
{return this.parseLabeledStatement(node,maybeName,expr,context)}
else{return this.parseExpressionStatement(node,expr)}}};pp$1.parseBreakContinueStatement=function(node,keyword){var isBreak=keyword==="break";this.next();if(this.eat(types.semi)||this.insertSemicolon()){node.label=null;}
else if(this.type!==types.name){this.unexpected();}
else{node.label=this.parseIdent();this.semicolon();}
var i=0;for(;i<this.labels.length;++i){var lab=this.labels[i];if(node.label==null||lab.name===node.label.name){if(lab.kind!=null&&(isBreak||lab.kind==="loop")){break}
if(node.label&&isBreak){break}}}
if(i===this.labels.length){this.raise(node.start,"Unsyntactic "+keyword);}
return this.finishNode(node,isBreak?"BreakStatement":"ContinueStatement")};pp$1.parseDebuggerStatement=function(node){this.next();this.semicolon();return this.finishNode(node,"DebuggerStatement")};pp$1.parseDoStatement=function(node){this.next();this.labels.push(loopLabel);node.body=this.parseStatement("do");this.labels.pop();this.expect(types._while);node.test=this.parseParenExpression();if(this.options.ecmaVersion>=6)
{this.eat(types.semi);}
else
{this.semicolon();}
return this.finishNode(node,"DoWhileStatement")};pp$1.parseForStatement=function(node){this.next();var awaitAt=(this.options.ecmaVersion>=9&&(this.inAsync||(!this.inFunction&&this.options.allowAwaitOutsideFunction))&&this.eatContextual("await"))?this.lastTokStart:-1;this.labels.push(loopLabel);this.enterScope(0);this.expect(types.parenL);if(this.type===types.semi){if(awaitAt>-1){this.unexpected(awaitAt);}
return this.parseFor(node,null)}
var isLet=this.isLet();if(this.type===types._var||this.type===types._const||isLet){var init$1=this.startNode(),kind=isLet?"let":this.value;this.next();this.parseVar(init$1,true,kind);this.finishNode(init$1,"VariableDeclaration");if((this.type===types._in||(this.options.ecmaVersion>=6&&this.isContextual("of")))&&init$1.declarations.length===1){if(this.options.ecmaVersion>=9){if(this.type===types._in){if(awaitAt>-1){this.unexpected(awaitAt);}}else{node.await=awaitAt>-1;}}
return this.parseForIn(node,init$1)}
if(awaitAt>-1){this.unexpected(awaitAt);}
return this.parseFor(node,init$1)}
var refDestructuringErrors=new DestructuringErrors;var init=this.parseExpression(true,refDestructuringErrors);if(this.type===types._in||(this.options.ecmaVersion>=6&&this.isContextual("of"))){if(this.options.ecmaVersion>=9){if(this.type===types._in){if(awaitAt>-1){this.unexpected(awaitAt);}}else{node.await=awaitAt>-1;}}
this.toAssignable(init,false,refDestructuringErrors);this.checkLVal(init);return this.parseForIn(node,init)}else{this.checkExpressionErrors(refDestructuringErrors,true);}
if(awaitAt>-1){this.unexpected(awaitAt);}
return this.parseFor(node,init)};pp$1.parseFunctionStatement=function(node,isAsync,declarationPosition){this.next();return this.parseFunction(node,FUNC_STATEMENT|(declarationPosition?0:FUNC_HANGING_STATEMENT),false,isAsync)};pp$1.parseIfStatement=function(node){this.next();node.test=this.parseParenExpression();node.consequent=this.parseStatement("if");node.alternate=this.eat(types._else)?this.parseStatement("if"):null;return this.finishNode(node,"IfStatement")};pp$1.parseReturnStatement=function(node){if(!this.inFunction&&!this.options.allowReturnOutsideFunction)
{this.raise(this.start,"'return' outside of function");}
this.next();if(this.eat(types.semi)||this.insertSemicolon()){node.argument=null;}
else{node.argument=this.parseExpression();this.semicolon();}
return this.finishNode(node,"ReturnStatement")};pp$1.parseSwitchStatement=function(node){this.next();node.discriminant=this.parseParenExpression();node.cases=[];this.expect(types.braceL);this.labels.push(switchLabel);this.enterScope(0);var cur;for(var sawDefault=false;this.type!==types.braceR;){if(this.type===types._case||this.type===types._default){var isCase=this.type===types._case;if(cur){this.finishNode(cur,"SwitchCase");}
node.cases.push(cur=this.startNode());cur.consequent=[];this.next();if(isCase){cur.test=this.parseExpression();}else{if(sawDefault){this.raiseRecoverable(this.lastTokStart,"Multiple default clauses");}
sawDefault=true;cur.test=null;}
this.expect(types.colon);}else{if(!cur){this.unexpected();}
cur.consequent.push(this.parseStatement(null));}}
this.exitScope();if(cur){this.finishNode(cur,"SwitchCase");}
this.next();this.labels.pop();return this.finishNode(node,"SwitchStatement")};pp$1.parseThrowStatement=function(node){this.next();if(lineBreak.test(this.input.slice(this.lastTokEnd,this.start)))
{this.raise(this.lastTokEnd,"Illegal newline after throw");}
node.argument=this.parseExpression();this.semicolon();return this.finishNode(node,"ThrowStatement")};var empty=[];pp$1.parseTryStatement=function(node){this.next();node.block=this.parseBlock();node.handler=null;if(this.type===types._catch){var clause=this.startNode();this.next();if(this.eat(types.parenL)){clause.param=this.parseBindingAtom();var simple=clause.param.type==="Identifier";this.enterScope(simple?SCOPE_SIMPLE_CATCH:0);this.checkLVal(clause.param,simple?BIND_SIMPLE_CATCH:BIND_LEXICAL);this.expect(types.parenR);}else{if(this.options.ecmaVersion<10){this.unexpected();}
clause.param=null;this.enterScope(0);}
clause.body=this.parseBlock(false);this.exitScope();node.handler=this.finishNode(clause,"CatchClause");}
node.finalizer=this.eat(types._finally)?this.parseBlock():null;if(!node.handler&&!node.finalizer)
{this.raise(node.start,"Missing catch or finally clause");}
return this.finishNode(node,"TryStatement")};pp$1.parseVarStatement=function(node,kind){this.next();this.parseVar(node,false,kind);this.semicolon();return this.finishNode(node,"VariableDeclaration")};pp$1.parseWhileStatement=function(node){this.next();node.test=this.parseParenExpression();this.labels.push(loopLabel);node.body=this.parseStatement("while");this.labels.pop();return this.finishNode(node,"WhileStatement")};pp$1.parseWithStatement=function(node){if(this.strict){this.raise(this.start,"'with' in strict mode");}
this.next();node.object=this.parseParenExpression();node.body=this.parseStatement("with");return this.finishNode(node,"WithStatement")};pp$1.parseEmptyStatement=function(node){this.next();return this.finishNode(node,"EmptyStatement")};pp$1.parseLabeledStatement=function(node,maybeName,expr,context){for(var i$1=0,list=this.labels;i$1<list.length;i$1+=1)
{var label=list[i$1];if(label.name===maybeName)
{this.raise(expr.start,"Label '"+maybeName+"' is already declared");}}
var kind=this.type.isLoop?"loop":this.type===types._switch?"switch":null;for(var i=this.labels.length-1;i>=0;i--){var label$1=this.labels[i];if(label$1.statementStart===node.start){label$1.statementStart=this.start;label$1.kind=kind;}else{break}}
this.labels.push({name:maybeName,kind:kind,statementStart:this.start});node.body=this.parseStatement(context?context.indexOf("label")===-1?context+"label":context:"label");this.labels.pop();node.label=expr;return this.finishNode(node,"LabeledStatement")};pp$1.parseExpressionStatement=function(node,expr){node.expression=expr;this.semicolon();return this.finishNode(node,"ExpressionStatement")};pp$1.parseBlock=function(createNewLexicalScope,node){if(createNewLexicalScope===void 0)createNewLexicalScope=true;if(node===void 0)node=this.startNode();node.body=[];this.expect(types.braceL);if(createNewLexicalScope){this.enterScope(0);}
while(!this.eat(types.braceR)){var stmt=this.parseStatement(null);node.body.push(stmt);}
if(createNewLexicalScope){this.exitScope();}
return this.finishNode(node,"BlockStatement")};pp$1.parseFor=function(node,init){node.init=init;this.expect(types.semi);node.test=this.type===types.semi?null:this.parseExpression();this.expect(types.semi);node.update=this.type===types.parenR?null:this.parseExpression();this.expect(types.parenR);node.body=this.parseStatement("for");this.exitScope();this.labels.pop();return this.finishNode(node,"ForStatement")};pp$1.parseForIn=function(node,init){var isForIn=this.type===types._in;this.next();if(init.type==="VariableDeclaration"&&init.declarations[0].init!=null&&(!isForIn||this.options.ecmaVersion<8||this.strict||init.kind!=="var"||init.declarations[0].id.type!=="Identifier")){this.raise(init.start,((isForIn?"for-in":"for-of")+" loop variable declaration may not have an initializer"));}else if(init.type==="AssignmentPattern"){this.raise(init.start,"Invalid left-hand side in for-loop");}
node.left=init;node.right=isForIn?this.parseExpression():this.parseMaybeAssign();this.expect(types.parenR);node.body=this.parseStatement("for");this.exitScope();this.labels.pop();return this.finishNode(node,isForIn?"ForInStatement":"ForOfStatement")};pp$1.parseVar=function(node,isFor,kind){node.declarations=[];node.kind=kind;for(;;){var decl=this.startNode();this.parseVarId(decl,kind);if(this.eat(types.eq)){decl.init=this.parseMaybeAssign(isFor);}else if(kind==="const"&&!(this.type===types._in||(this.options.ecmaVersion>=6&&this.isContextual("of")))){this.unexpected();}else if(decl.id.type!=="Identifier"&&!(isFor&&(this.type===types._in||this.isContextual("of")))){this.raise(this.lastTokEnd,"Complex binding patterns require an initialization value");}else{decl.init=null;}
node.declarations.push(this.finishNode(decl,"VariableDeclarator"));if(!this.eat(types.comma)){break}}
return node};pp$1.parseVarId=function(decl,kind){decl.id=this.parseBindingAtom();this.checkLVal(decl.id,kind==="var"?BIND_VAR:BIND_LEXICAL,false);};var FUNC_STATEMENT=1,FUNC_HANGING_STATEMENT=2,FUNC_NULLABLE_ID=4;pp$1.parseFunction=function(node,statement,allowExpressionBody,isAsync){this.initFunction(node);if(this.options.ecmaVersion>=9||this.options.ecmaVersion>=6&&!isAsync){if(this.type===types.star&&(statement&FUNC_HANGING_STATEMENT))
{this.unexpected();}
node.generator=this.eat(types.star);}
if(this.options.ecmaVersion>=8)
{node.async=!!isAsync;}
if(statement&FUNC_STATEMENT){node.id=(statement&FUNC_NULLABLE_ID)&&this.type!==types.name?null:this.parseIdent();if(node.id&&!(statement&FUNC_HANGING_STATEMENT))
{this.checkLVal(node.id,(this.strict||node.generator||node.async)?this.treatFunctionsAsVar?BIND_VAR:BIND_LEXICAL:BIND_FUNCTION);}}
var oldYieldPos=this.yieldPos,oldAwaitPos=this.awaitPos,oldAwaitIdentPos=this.awaitIdentPos;this.yieldPos=0;this.awaitPos=0;this.awaitIdentPos=0;this.enterScope(functionFlags(node.async,node.generator));if(!(statement&FUNC_STATEMENT))
{node.id=this.type===types.name?this.parseIdent():null;}
this.parseFunctionParams(node);this.parseFunctionBody(node,allowExpressionBody,false);this.yieldPos=oldYieldPos;this.awaitPos=oldAwaitPos;this.awaitIdentPos=oldAwaitIdentPos;return this.finishNode(node,(statement&FUNC_STATEMENT)?"FunctionDeclaration":"FunctionExpression")};pp$1.parseFunctionParams=function(node){this.expect(types.parenL);node.params=this.parseBindingList(types.parenR,false,this.options.ecmaVersion>=8);this.checkYieldAwaitInDefaultParams();};pp$1.parseClass=function(node,isStatement){this.next();var oldStrict=this.strict;this.strict=true;this.parseClassId(node,isStatement);this.parseClassSuper(node);var classBody=this.startNode();var hadConstructor=false;classBody.body=[];this.expect(types.braceL);while(!this.eat(types.braceR)){var element=this.parseClassElement(node.superClass!==null);if(element){classBody.body.push(element);if(element.type==="MethodDefinition"&&element.kind==="constructor"){if(hadConstructor){this.raise(element.start,"Duplicate constructor in the same class");}
hadConstructor=true;}}}
node.body=this.finishNode(classBody,"ClassBody");this.strict=oldStrict;return this.finishNode(node,isStatement?"ClassDeclaration":"ClassExpression")};pp$1.parseClassElement=function(constructorAllowsSuper){var this$1=this;if(this.eat(types.semi)){return null}
var method=this.startNode();var tryContextual=function(k,noLineBreak){if(noLineBreak===void 0)noLineBreak=false;var start=this$1.start,startLoc=this$1.startLoc;if(!this$1.eatContextual(k)){return false}
if(this$1.type!==types.parenL&&(!noLineBreak||!this$1.canInsertSemicolon())){return true}
if(method.key){this$1.unexpected();}
method.computed=false;method.key=this$1.startNodeAt(start,startLoc);method.key.name=k;this$1.finishNode(method.key,"Identifier");return false};method.kind="method";method.static=tryContextual("static");var isGenerator=this.eat(types.star);var isAsync=false;if(!isGenerator){if(this.options.ecmaVersion>=8&&tryContextual("async",true)){isAsync=true;isGenerator=this.options.ecmaVersion>=9&&this.eat(types.star);}else if(tryContextual("get")){method.kind="get";}else if(tryContextual("set")){method.kind="set";}}
if(!method.key){this.parsePropertyName(method);}
var key=method.key;var allowsDirectSuper=false;if(!method.computed&&!method.static&&(key.type==="Identifier"&&key.name==="constructor"||key.type==="Literal"&&key.value==="constructor")){if(method.kind!=="method"){this.raise(key.start,"Constructor can't have get/set modifier");}
if(isGenerator){this.raise(key.start,"Constructor can't be a generator");}
if(isAsync){this.raise(key.start,"Constructor can't be an async method");}
method.kind="constructor";allowsDirectSuper=constructorAllowsSuper;}else if(method.static&&key.type==="Identifier"&&key.name==="prototype"){this.raise(key.start,"Classes may not have a static property named prototype");}
this.parseClassMethod(method,isGenerator,isAsync,allowsDirectSuper);if(method.kind==="get"&&method.value.params.length!==0)
{this.raiseRecoverable(method.value.start,"getter should have no params");}
if(method.kind==="set"&&method.value.params.length!==1)
{this.raiseRecoverable(method.value.start,"setter should have exactly one param");}
if(method.kind==="set"&&method.value.params[0].type==="RestElement")
{this.raiseRecoverable(method.value.params[0].start,"Setter cannot use rest params");}
return method};pp$1.parseClassMethod=function(method,isGenerator,isAsync,allowsDirectSuper){method.value=this.parseMethod(isGenerator,isAsync,allowsDirectSuper);return this.finishNode(method,"MethodDefinition")};pp$1.parseClassId=function(node,isStatement){if(this.type===types.name){node.id=this.parseIdent();if(isStatement)
{this.checkLVal(node.id,BIND_LEXICAL,false);}}else{if(isStatement===true)
{this.unexpected();}
node.id=null;}};pp$1.parseClassSuper=function(node){node.superClass=this.eat(types._extends)?this.parseExprSubscripts():null;};pp$1.parseExport=function(node,exports){this.next();if(this.eat(types.star)){this.expectContextual("from");if(this.type!==types.string){this.unexpected();}
node.source=this.parseExprAtom();this.semicolon();return this.finishNode(node,"ExportAllDeclaration")}
if(this.eat(types._default)){this.checkExport(exports,"default",this.lastTokStart);var isAsync;if(this.type===types._function||(isAsync=this.isAsyncFunction())){var fNode=this.startNode();this.next();if(isAsync){this.next();}
node.declaration=this.parseFunction(fNode,FUNC_STATEMENT|FUNC_NULLABLE_ID,false,isAsync);}else if(this.type===types._class){var cNode=this.startNode();node.declaration=this.parseClass(cNode,"nullableID");}else{node.declaration=this.parseMaybeAssign();this.semicolon();}
return this.finishNode(node,"ExportDefaultDeclaration")}
if(this.shouldParseExportStatement()){node.declaration=this.parseStatement(null);if(node.declaration.type==="VariableDeclaration")
{this.checkVariableExport(exports,node.declaration.declarations);}
else
{this.checkExport(exports,node.declaration.id.name,node.declaration.id.start);}
node.specifiers=[];node.source=null;}else{node.declaration=null;node.specifiers=this.parseExportSpecifiers(exports);if(this.eatContextual("from")){if(this.type!==types.string){this.unexpected();}
node.source=this.parseExprAtom();}else{for(var i=0,list=node.specifiers;i<list.length;i+=1){var spec=list[i];this.checkUnreserved(spec.local);this.checkLocalExport(spec.local);}
node.source=null;}
this.semicolon();}
return this.finishNode(node,"ExportNamedDeclaration")};pp$1.checkExport=function(exports,name,pos){if(!exports){return}
if(has(exports,name))
{this.raiseRecoverable(pos,"Duplicate export '"+name+"'");}
exports[name]=true;};pp$1.checkPatternExport=function(exports,pat){var type=pat.type;if(type==="Identifier")
{this.checkExport(exports,pat.name,pat.start);}
else if(type==="ObjectPattern")
{for(var i=0,list=pat.properties;i<list.length;i+=1)
{var prop=list[i];this.checkPatternExport(exports,prop);}}
else if(type==="ArrayPattern")
{for(var i$1=0,list$1=pat.elements;i$1<list$1.length;i$1+=1){var elt=list$1[i$1];if(elt){this.checkPatternExport(exports,elt);}}}
else if(type==="Property")
{this.checkPatternExport(exports,pat.value);}
else if(type==="AssignmentPattern")
{this.checkPatternExport(exports,pat.left);}
else if(type==="RestElement")
{this.checkPatternExport(exports,pat.argument);}
else if(type==="ParenthesizedExpression")
{this.checkPatternExport(exports,pat.expression);}};pp$1.checkVariableExport=function(exports,decls){if(!exports){return}
for(var i=0,list=decls;i<list.length;i+=1)
{var decl=list[i];this.checkPatternExport(exports,decl.id);}};pp$1.shouldParseExportStatement=function(){return this.type.keyword==="var"||this.type.keyword==="const"||this.type.keyword==="class"||this.type.keyword==="function"||this.isLet()||this.isAsyncFunction()};pp$1.parseExportSpecifiers=function(exports){var nodes=[],first=true;this.expect(types.braceL);while(!this.eat(types.braceR)){if(!first){this.expect(types.comma);if(this.afterTrailingComma(types.braceR)){break}}else{first=false;}
var node=this.startNode();node.local=this.parseIdent(true);node.exported=this.eatContextual("as")?this.parseIdent(true):node.local;this.checkExport(exports,node.exported.name,node.exported.start);nodes.push(this.finishNode(node,"ExportSpecifier"));}
return nodes};pp$1.parseImport=function(node){this.next();if(this.type===types.string){node.specifiers=empty;node.source=this.parseExprAtom();}else{node.specifiers=this.parseImportSpecifiers();this.expectContextual("from");node.source=this.type===types.string?this.parseExprAtom():this.unexpected();}
this.semicolon();return this.finishNode(node,"ImportDeclaration")};pp$1.parseImportSpecifiers=function(){var nodes=[],first=true;if(this.type===types.name){var node=this.startNode();node.local=this.parseIdent();this.checkLVal(node.local,BIND_LEXICAL);nodes.push(this.finishNode(node,"ImportDefaultSpecifier"));if(!this.eat(types.comma)){return nodes}}
if(this.type===types.star){var node$1=this.startNode();this.next();this.expectContextual("as");node$1.local=this.parseIdent();this.checkLVal(node$1.local,BIND_LEXICAL);nodes.push(this.finishNode(node$1,"ImportNamespaceSpecifier"));return nodes}
this.expect(types.braceL);while(!this.eat(types.braceR)){if(!first){this.expect(types.comma);if(this.afterTrailingComma(types.braceR)){break}}else{first=false;}
var node$2=this.startNode();node$2.imported=this.parseIdent(true);if(this.eatContextual("as")){node$2.local=this.parseIdent();}else{this.checkUnreserved(node$2.imported);node$2.local=node$2.imported;}
this.checkLVal(node$2.local,BIND_LEXICAL);nodes.push(this.finishNode(node$2,"ImportSpecifier"));}
return nodes};pp$1.adaptDirectivePrologue=function(statements){for(var i=0;i<statements.length&&this.isDirectiveCandidate(statements[i]);++i){statements[i].directive=statements[i].expression.raw.slice(1,-1);}};pp$1.isDirectiveCandidate=function(statement){return(statement.type==="ExpressionStatement"&&statement.expression.type==="Literal"&&typeof statement.expression.value==="string"&&(this.input[statement.start]==="\""||this.input[statement.start]==="'"))};var pp$2=Parser.prototype;pp$2.toAssignable=function(node,isBinding,refDestructuringErrors){if(this.options.ecmaVersion>=6&&node){switch(node.type){case"Identifier":if(this.inAsync&&node.name==="await")
{this.raise(node.start,"Cannot use 'await' as identifier inside an async function");}
break
case"ObjectPattern":case"ArrayPattern":case"RestElement":break
case"ObjectExpression":node.type="ObjectPattern";if(refDestructuringErrors){this.checkPatternErrors(refDestructuringErrors,true);}
for(var i=0,list=node.properties;i<list.length;i+=1){var prop=list[i];this.toAssignable(prop,isBinding);if(prop.type==="RestElement"&&(prop.argument.type==="ArrayPattern"||prop.argument.type==="ObjectPattern")){this.raise(prop.argument.start,"Unexpected token");}}
break
case"Property":if(node.kind!=="init"){this.raise(node.key.start,"Object pattern can't contain getter or setter");}
this.toAssignable(node.value,isBinding);break
case"ArrayExpression":node.type="ArrayPattern";if(refDestructuringErrors){this.checkPatternErrors(refDestructuringErrors,true);}
this.toAssignableList(node.elements,isBinding);break
case"SpreadElement":node.type="RestElement";this.toAssignable(node.argument,isBinding);if(node.argument.type==="AssignmentPattern")
{this.raise(node.argument.start,"Rest elements cannot have a default value");}
break
case"AssignmentExpression":if(node.operator!=="="){this.raise(node.left.end,"Only '=' operator can be used for specifying default value.");}
node.type="AssignmentPattern";delete node.operator;this.toAssignable(node.left,isBinding);case"AssignmentPattern":break
case"ParenthesizedExpression":this.toAssignable(node.expression,isBinding,refDestructuringErrors);break
case"MemberExpression":if(!isBinding){break}
default:this.raise(node.start,"Assigning to rvalue");}}else if(refDestructuringErrors){this.checkPatternErrors(refDestructuringErrors,true);}
return node};pp$2.toAssignableList=function(exprList,isBinding){var end=exprList.length;for(var i=0;i<end;i++){var elt=exprList[i];if(elt){this.toAssignable(elt,isBinding);}}
if(end){var last=exprList[end-1];if(this.options.ecmaVersion===6&&isBinding&&last&&last.type==="RestElement"&&last.argument.type!=="Identifier")
{this.unexpected(last.argument.start);}}
return exprList};pp$2.parseSpread=function(refDestructuringErrors){var node=this.startNode();this.next();node.argument=this.parseMaybeAssign(false,refDestructuringErrors);return this.finishNode(node,"SpreadElement")};pp$2.parseRestBinding=function(){var node=this.startNode();this.next();if(this.options.ecmaVersion===6&&this.type!==types.name)
{this.unexpected();}
node.argument=this.parseBindingAtom();return this.finishNode(node,"RestElement")};pp$2.parseBindingAtom=function(){if(this.options.ecmaVersion>=6){switch(this.type){case types.bracketL:var node=this.startNode();this.next();node.elements=this.parseBindingList(types.bracketR,true,true);return this.finishNode(node,"ArrayPattern")
case types.braceL:return this.parseObj(true)}}
return this.parseIdent()};pp$2.parseBindingList=function(close,allowEmpty,allowTrailingComma){var elts=[],first=true;while(!this.eat(close)){if(first){first=false;}
else{this.expect(types.comma);}
if(allowEmpty&&this.type===types.comma){elts.push(null);}else if(allowTrailingComma&&this.afterTrailingComma(close)){break}else if(this.type===types.ellipsis){var rest=this.parseRestBinding();this.parseBindingListItem(rest);elts.push(rest);if(this.type===types.comma){this.raise(this.start,"Comma is not permitted after the rest element");}
this.expect(close);break}else{var elem=this.parseMaybeDefault(this.start,this.startLoc);this.parseBindingListItem(elem);elts.push(elem);}}
return elts};pp$2.parseBindingListItem=function(param){return param};pp$2.parseMaybeDefault=function(startPos,startLoc,left){left=left||this.parseBindingAtom();if(this.options.ecmaVersion<6||!this.eat(types.eq)){return left}
var node=this.startNodeAt(startPos,startLoc);node.left=left;node.right=this.parseMaybeAssign();return this.finishNode(node,"AssignmentPattern")};pp$2.checkLVal=function(expr,bindingType,checkClashes){if(bindingType===void 0)bindingType=BIND_NONE;switch(expr.type){case"Identifier":if(bindingType===BIND_LEXICAL&&expr.name==="let")
{this.raiseRecoverable(expr.start,"let is disallowed as a lexically bound name");}
if(this.strict&&this.reservedWordsStrictBind.test(expr.name))
{this.raiseRecoverable(expr.start,(bindingType?"Binding ":"Assigning to ")+expr.name+" in strict mode");}
if(checkClashes){if(has(checkClashes,expr.name))
{this.raiseRecoverable(expr.start,"Argument name clash");}
checkClashes[expr.name]=true;}
if(bindingType!==BIND_NONE&&bindingType!==BIND_OUTSIDE){this.declareName(expr.name,bindingType,expr.start);}
break
case"MemberExpression":if(bindingType){this.raiseRecoverable(expr.start,"Binding member expression");}
break
case"ObjectPattern":for(var i=0,list=expr.properties;i<list.length;i+=1)
{var prop=list[i];this.checkLVal(prop,bindingType,checkClashes);}
break
case"Property":this.checkLVal(expr.value,bindingType,checkClashes);break
case"ArrayPattern":for(var i$1=0,list$1=expr.elements;i$1<list$1.length;i$1+=1){var elem=list$1[i$1];if(elem){this.checkLVal(elem,bindingType,checkClashes);}}
break
case"AssignmentPattern":this.checkLVal(expr.left,bindingType,checkClashes);break
case"RestElement":this.checkLVal(expr.argument,bindingType,checkClashes);break
case"ParenthesizedExpression":this.checkLVal(expr.expression,bindingType,checkClashes);break
default:this.raise(expr.start,(bindingType?"Binding":"Assigning to")+" rvalue");}};var pp$3=Parser.prototype;pp$3.checkPropClash=function(prop,propHash,refDestructuringErrors){if(this.options.ecmaVersion>=9&&prop.type==="SpreadElement")
{return}
if(this.options.ecmaVersion>=6&&(prop.computed||prop.method||prop.shorthand))
{return}
var key=prop.key;var name;switch(key.type){case"Identifier":name=key.name;break
case"Literal":name=String(key.value);break
default:return}
var kind=prop.kind;if(this.options.ecmaVersion>=6){if(name==="__proto__"&&kind==="init"){if(propHash.proto){if(refDestructuringErrors&&refDestructuringErrors.doubleProto<0){refDestructuringErrors.doubleProto=key.start;}
else{this.raiseRecoverable(key.start,"Redefinition of __proto__ property");}}
propHash.proto=true;}
return}
name="$"+name;var other=propHash[name];if(other){var redefinition;if(kind==="init"){redefinition=this.strict&&other.init||other.get||other.set;}else{redefinition=other.init||other[kind];}
if(redefinition)
{this.raiseRecoverable(key.start,"Redefinition of property");}}else{other=propHash[name]={init:false,get:false,set:false};}
other[kind]=true;};pp$3.parseExpression=function(noIn,refDestructuringErrors){var startPos=this.start,startLoc=this.startLoc;var expr=this.parseMaybeAssign(noIn,refDestructuringErrors);if(this.type===types.comma){var node=this.startNodeAt(startPos,startLoc);node.expressions=[expr];while(this.eat(types.comma)){node.expressions.push(this.parseMaybeAssign(noIn,refDestructuringErrors));}
return this.finishNode(node,"SequenceExpression")}
return expr};pp$3.parseMaybeAssign=function(noIn,refDestructuringErrors,afterLeftParse){if(this.isContextual("yield")){if(this.inGenerator){return this.parseYield(noIn)}
else{this.exprAllowed=false;}}
var ownDestructuringErrors=false,oldParenAssign=-1,oldTrailingComma=-1,oldShorthandAssign=-1;if(refDestructuringErrors){oldParenAssign=refDestructuringErrors.parenthesizedAssign;oldTrailingComma=refDestructuringErrors.trailingComma;oldShorthandAssign=refDestructuringErrors.shorthandAssign;refDestructuringErrors.parenthesizedAssign=refDestructuringErrors.trailingComma=refDestructuringErrors.shorthandAssign=-1;}else{refDestructuringErrors=new DestructuringErrors;ownDestructuringErrors=true;}
var startPos=this.start,startLoc=this.startLoc;if(this.type===types.parenL||this.type===types.name)
{this.potentialArrowAt=this.start;}
var left=this.parseMaybeConditional(noIn,refDestructuringErrors);if(afterLeftParse){left=afterLeftParse.call(this,left,startPos,startLoc);}
if(this.type.isAssign){var node=this.startNodeAt(startPos,startLoc);node.operator=this.value;node.left=this.type===types.eq?this.toAssignable(left,false,refDestructuringErrors):left;if(!ownDestructuringErrors){DestructuringErrors.call(refDestructuringErrors);}
refDestructuringErrors.shorthandAssign=-1;this.checkLVal(left);this.next();node.right=this.parseMaybeAssign(noIn);return this.finishNode(node,"AssignmentExpression")}else{if(ownDestructuringErrors){this.checkExpressionErrors(refDestructuringErrors,true);}}
if(oldParenAssign>-1){refDestructuringErrors.parenthesizedAssign=oldParenAssign;}
if(oldTrailingComma>-1){refDestructuringErrors.trailingComma=oldTrailingComma;}
if(oldShorthandAssign>-1){refDestructuringErrors.shorthandAssign=oldShorthandAssign;}
return left};pp$3.parseMaybeConditional=function(noIn,refDestructuringErrors){var startPos=this.start,startLoc=this.startLoc;var expr=this.parseExprOps(noIn,refDestructuringErrors);if(this.checkExpressionErrors(refDestructuringErrors)){return expr}
if(this.eat(types.question)){var node=this.startNodeAt(startPos,startLoc);node.test=expr;node.consequent=this.parseMaybeAssign();this.expect(types.colon);node.alternate=this.parseMaybeAssign(noIn);return this.finishNode(node,"ConditionalExpression")}
return expr};pp$3.parseExprOps=function(noIn,refDestructuringErrors){var startPos=this.start,startLoc=this.startLoc;var expr=this.parseMaybeUnary(refDestructuringErrors,false);if(this.checkExpressionErrors(refDestructuringErrors)){return expr}
return expr.start===startPos&&expr.type==="ArrowFunctionExpression"?expr:this.parseExprOp(expr,startPos,startLoc,-1,noIn)};pp$3.parseExprOp=function(left,leftStartPos,leftStartLoc,minPrec,noIn){var prec=this.type.binop;if(prec!=null&&(!noIn||this.type!==types._in)){if(prec>minPrec){var logical=this.type===types.logicalOR||this.type===types.logicalAND;var op=this.value;this.next();var startPos=this.start,startLoc=this.startLoc;var right=this.parseExprOp(this.parseMaybeUnary(null,false),startPos,startLoc,prec,noIn);var node=this.buildBinary(leftStartPos,leftStartLoc,left,right,op,logical);return this.parseExprOp(node,leftStartPos,leftStartLoc,minPrec,noIn)}}
return left};pp$3.buildBinary=function(startPos,startLoc,left,right,op,logical){var node=this.startNodeAt(startPos,startLoc);node.left=left;node.operator=op;node.right=right;return this.finishNode(node,logical?"LogicalExpression":"BinaryExpression")};pp$3.parseMaybeUnary=function(refDestructuringErrors,sawUnary){var startPos=this.start,startLoc=this.startLoc,expr;if(this.isContextual("await")&&(this.inAsync||(!this.inFunction&&this.options.allowAwaitOutsideFunction))){expr=this.parseAwait();sawUnary=true;}else if(this.type.prefix){var node=this.startNode(),update=this.type===types.incDec;node.operator=this.value;node.prefix=true;this.next();node.argument=this.parseMaybeUnary(null,true);this.checkExpressionErrors(refDestructuringErrors,true);if(update){this.checkLVal(node.argument);}
else if(this.strict&&node.operator==="delete"&&node.argument.type==="Identifier")
{this.raiseRecoverable(node.start,"Deleting local variable in strict mode");}
else{sawUnary=true;}
expr=this.finishNode(node,update?"UpdateExpression":"UnaryExpression");}else{expr=this.parseExprSubscripts(refDestructuringErrors);if(this.checkExpressionErrors(refDestructuringErrors)){return expr}
while(this.type.postfix&&!this.canInsertSemicolon()){var node$1=this.startNodeAt(startPos,startLoc);node$1.operator=this.value;node$1.prefix=false;node$1.argument=expr;this.checkLVal(expr);this.next();expr=this.finishNode(node$1,"UpdateExpression");}}
if(!sawUnary&&this.eat(types.starstar))
{return this.buildBinary(startPos,startLoc,expr,this.parseMaybeUnary(null,false),"**",false)}
else
{return expr}};pp$3.parseExprSubscripts=function(refDestructuringErrors){var startPos=this.start,startLoc=this.startLoc;var expr=this.parseExprAtom(refDestructuringErrors);var skipArrowSubscripts=expr.type==="ArrowFunctionExpression"&&this.input.slice(this.lastTokStart,this.lastTokEnd)!==")";if(this.checkExpressionErrors(refDestructuringErrors)||skipArrowSubscripts){return expr}
var result=this.parseSubscripts(expr,startPos,startLoc);if(refDestructuringErrors&&result.type==="MemberExpression"){if(refDestructuringErrors.parenthesizedAssign>=result.start){refDestructuringErrors.parenthesizedAssign=-1;}
if(refDestructuringErrors.parenthesizedBind>=result.start){refDestructuringErrors.parenthesizedBind=-1;}}
return result};pp$3.parseSubscripts=function(base,startPos,startLoc,noCalls){var maybeAsyncArrow=this.options.ecmaVersion>=8&&base.type==="Identifier"&&base.name==="async"&&this.lastTokEnd===base.end&&!this.canInsertSemicolon()&&this.input.slice(base.start,base.end)==="async";while(true){var element=this.parseSubscript(base,startPos,startLoc,noCalls,maybeAsyncArrow);if(element===base||element.type==="ArrowFunctionExpression"){return element}
base=element;}};pp$3.parseSubscript=function(base,startPos,startLoc,noCalls,maybeAsyncArrow){var computed=this.eat(types.bracketL);if(computed||this.eat(types.dot)){var node=this.startNodeAt(startPos,startLoc);node.object=base;node.property=computed?this.parseExpression():this.parseIdent(this.options.allowReserved!=="never");node.computed=!!computed;if(computed){this.expect(types.bracketR);}
base=this.finishNode(node,"MemberExpression");}else if(!noCalls&&this.eat(types.parenL)){var refDestructuringErrors=new DestructuringErrors,oldYieldPos=this.yieldPos,oldAwaitPos=this.awaitPos,oldAwaitIdentPos=this.awaitIdentPos;this.yieldPos=0;this.awaitPos=0;this.awaitIdentPos=0;var exprList=this.parseExprList(types.parenR,this.options.ecmaVersion>=8,false,refDestructuringErrors);if(maybeAsyncArrow&&!this.canInsertSemicolon()&&this.eat(types.arrow)){this.checkPatternErrors(refDestructuringErrors,false);this.checkYieldAwaitInDefaultParams();if(this.awaitIdentPos>0)
{this.raise(this.awaitIdentPos,"Cannot use 'await' as identifier inside an async function");}
this.yieldPos=oldYieldPos;this.awaitPos=oldAwaitPos;this.awaitIdentPos=oldAwaitIdentPos;return this.parseArrowExpression(this.startNodeAt(startPos,startLoc),exprList,true)}
this.checkExpressionErrors(refDestructuringErrors,true);this.yieldPos=oldYieldPos||this.yieldPos;this.awaitPos=oldAwaitPos||this.awaitPos;this.awaitIdentPos=oldAwaitIdentPos||this.awaitIdentPos;var node$1=this.startNodeAt(startPos,startLoc);node$1.callee=base;node$1.arguments=exprList;base=this.finishNode(node$1,"CallExpression");}else if(this.type===types.backQuote){var node$2=this.startNodeAt(startPos,startLoc);node$2.tag=base;node$2.quasi=this.parseTemplate({isTagged:true});base=this.finishNode(node$2,"TaggedTemplateExpression");}
return base};pp$3.parseExprAtom=function(refDestructuringErrors){if(this.type===types.slash){this.readRegexp();}
var node,canBeArrow=this.potentialArrowAt===this.start;switch(this.type){case types._super:if(!this.allowSuper)
{this.raise(this.start,"'super' keyword outside a method");}
node=this.startNode();this.next();if(this.type===types.parenL&&!this.allowDirectSuper)
{this.raise(node.start,"super() call outside constructor of a subclass");}
if(this.type!==types.dot&&this.type!==types.bracketL&&this.type!==types.parenL)
{this.unexpected();}
return this.finishNode(node,"Super")
case types._this:node=this.startNode();this.next();return this.finishNode(node,"ThisExpression")
case types.name:var startPos=this.start,startLoc=this.startLoc,containsEsc=this.containsEsc;var id=this.parseIdent(false);if(this.options.ecmaVersion>=8&&!containsEsc&&id.name==="async"&&!this.canInsertSemicolon()&&this.eat(types._function))
{return this.parseFunction(this.startNodeAt(startPos,startLoc),0,false,true)}
if(canBeArrow&&!this.canInsertSemicolon()){if(this.eat(types.arrow))
{return this.parseArrowExpression(this.startNodeAt(startPos,startLoc),[id],false)}
if(this.options.ecmaVersion>=8&&id.name==="async"&&this.type===types.name&&!containsEsc){id=this.parseIdent(false);if(this.canInsertSemicolon()||!this.eat(types.arrow))
{this.unexpected();}
return this.parseArrowExpression(this.startNodeAt(startPos,startLoc),[id],true)}}
return id
case types.regexp:var value=this.value;node=this.parseLiteral(value.value);node.regex={pattern:value.pattern,flags:value.flags};return node
case types.num:case types.string:return this.parseLiteral(this.value)
case types._null:case types._true:case types._false:node=this.startNode();node.value=this.type===types._null?null:this.type===types._true;node.raw=this.type.keyword;this.next();return this.finishNode(node,"Literal")
case types.parenL:var start=this.start,expr=this.parseParenAndDistinguishExpression(canBeArrow);if(refDestructuringErrors){if(refDestructuringErrors.parenthesizedAssign<0&&!this.isSimpleAssignTarget(expr))
{refDestructuringErrors.parenthesizedAssign=start;}
if(refDestructuringErrors.parenthesizedBind<0)
{refDestructuringErrors.parenthesizedBind=start;}}
return expr
case types.bracketL:node=this.startNode();this.next();node.elements=this.parseExprList(types.bracketR,true,true,refDestructuringErrors);return this.finishNode(node,"ArrayExpression")
case types.braceL:return this.parseObj(false,refDestructuringErrors)
case types._function:node=this.startNode();this.next();return this.parseFunction(node,0)
case types._class:return this.parseClass(this.startNode(),false)
case types._new:return this.parseNew()
case types.backQuote:return this.parseTemplate()
case types._import:if(this.options.ecmaVersion>=11){return this.parseExprImport()}else{return this.unexpected()}
default:this.unexpected();}};pp$3.parseExprImport=function(){var node=this.startNode();this.next();switch(this.type){case types.parenL:return this.parseDynamicImport(node)
default:this.unexpected();}};pp$3.parseDynamicImport=function(node){this.next();node.source=this.parseMaybeAssign();if(!this.eat(types.parenR)){var errorPos=this.start;if(this.eat(types.comma)&&this.eat(types.parenR)){this.raiseRecoverable(errorPos,"Trailing comma is not allowed in import()");}else{this.unexpected(errorPos);}}
return this.finishNode(node,"ImportExpression")};pp$3.parseLiteral=function(value){var node=this.startNode();node.value=value;node.raw=this.input.slice(this.start,this.end);if(node.raw.charCodeAt(node.raw.length-1)===110){node.bigint=node.raw.slice(0,-1);}
this.next();return this.finishNode(node,"Literal")};pp$3.parseParenExpression=function(){this.expect(types.parenL);var val=this.parseExpression();this.expect(types.parenR);return val};pp$3.parseParenAndDistinguishExpression=function(canBeArrow){var startPos=this.start,startLoc=this.startLoc,val,allowTrailingComma=this.options.ecmaVersion>=8;if(this.options.ecmaVersion>=6){this.next();var innerStartPos=this.start,innerStartLoc=this.startLoc;var exprList=[],first=true,lastIsComma=false;var refDestructuringErrors=new DestructuringErrors,oldYieldPos=this.yieldPos,oldAwaitPos=this.awaitPos,spreadStart;this.yieldPos=0;this.awaitPos=0;while(this.type!==types.parenR){first?first=false:this.expect(types.comma);if(allowTrailingComma&&this.afterTrailingComma(types.parenR,true)){lastIsComma=true;break}else if(this.type===types.ellipsis){spreadStart=this.start;exprList.push(this.parseParenItem(this.parseRestBinding()));if(this.type===types.comma){this.raise(this.start,"Comma is not permitted after the rest element");}
break}else{exprList.push(this.parseMaybeAssign(false,refDestructuringErrors,this.parseParenItem));}}
var innerEndPos=this.start,innerEndLoc=this.startLoc;this.expect(types.parenR);if(canBeArrow&&!this.canInsertSemicolon()&&this.eat(types.arrow)){this.checkPatternErrors(refDestructuringErrors,false);this.checkYieldAwaitInDefaultParams();this.yieldPos=oldYieldPos;this.awaitPos=oldAwaitPos;return this.parseParenArrowList(startPos,startLoc,exprList)}
if(!exprList.length||lastIsComma){this.unexpected(this.lastTokStart);}
if(spreadStart){this.unexpected(spreadStart);}
this.checkExpressionErrors(refDestructuringErrors,true);this.yieldPos=oldYieldPos||this.yieldPos;this.awaitPos=oldAwaitPos||this.awaitPos;if(exprList.length>1){val=this.startNodeAt(innerStartPos,innerStartLoc);val.expressions=exprList;this.finishNodeAt(val,"SequenceExpression",innerEndPos,innerEndLoc);}else{val=exprList[0];}}else{val=this.parseParenExpression();}
if(this.options.preserveParens){var par=this.startNodeAt(startPos,startLoc);par.expression=val;return this.finishNode(par,"ParenthesizedExpression")}else{return val}};pp$3.parseParenItem=function(item){return item};pp$3.parseParenArrowList=function(startPos,startLoc,exprList){return this.parseArrowExpression(this.startNodeAt(startPos,startLoc),exprList)};var empty$1=[];pp$3.parseNew=function(){var node=this.startNode();var meta=this.parseIdent(true);if(this.options.ecmaVersion>=6&&this.eat(types.dot)){node.meta=meta;var containsEsc=this.containsEsc;node.property=this.parseIdent(true);if(node.property.name!=="target"||containsEsc)
{this.raiseRecoverable(node.property.start,"The only valid meta property for new is new.target");}
if(!this.inNonArrowFunction())
{this.raiseRecoverable(node.start,"new.target can only be used in functions");}
return this.finishNode(node,"MetaProperty")}
var startPos=this.start,startLoc=this.startLoc,isImport=this.type===types._import;node.callee=this.parseSubscripts(this.parseExprAtom(),startPos,startLoc,true);if(isImport&&node.callee.type==="ImportExpression"){this.raise(startPos,"Cannot use new with import()");}
if(this.eat(types.parenL)){node.arguments=this.parseExprList(types.parenR,this.options.ecmaVersion>=8,false);}
else{node.arguments=empty$1;}
return this.finishNode(node,"NewExpression")};pp$3.parseTemplateElement=function(ref){var isTagged=ref.isTagged;var elem=this.startNode();if(this.type===types.invalidTemplate){if(!isTagged){this.raiseRecoverable(this.start,"Bad escape sequence in untagged template literal");}
elem.value={raw:this.value,cooked:null};}else{elem.value={raw:this.input.slice(this.start,this.end).replace(/\r\n?/g,"\n"),cooked:this.value};}
this.next();elem.tail=this.type===types.backQuote;return this.finishNode(elem,"TemplateElement")};pp$3.parseTemplate=function(ref){if(ref===void 0)ref={};var isTagged=ref.isTagged;if(isTagged===void 0)isTagged=false;var node=this.startNode();this.next();node.expressions=[];var curElt=this.parseTemplateElement({isTagged:isTagged});node.quasis=[curElt];while(!curElt.tail){if(this.type===types.eof){this.raise(this.pos,"Unterminated template literal");}
this.expect(types.dollarBraceL);node.expressions.push(this.parseExpression());this.expect(types.braceR);node.quasis.push(curElt=this.parseTemplateElement({isTagged:isTagged}));}
this.next();return this.finishNode(node,"TemplateLiteral")};pp$3.isAsyncProp=function(prop){return!prop.computed&&prop.key.type==="Identifier"&&prop.key.name==="async"&&(this.type===types.name||this.type===types.num||this.type===types.string||this.type===types.bracketL||this.type.keyword||(this.options.ecmaVersion>=9&&this.type===types.star))&&!lineBreak.test(this.input.slice(this.lastTokEnd,this.start))};pp$3.parseObj=function(isPattern,refDestructuringErrors){var node=this.startNode(),first=true,propHash={};node.properties=[];this.next();while(!this.eat(types.braceR)){if(!first){this.expect(types.comma);if(this.options.ecmaVersion>=5&&this.afterTrailingComma(types.braceR)){break}}else{first=false;}
var prop=this.parseProperty(isPattern,refDestructuringErrors);if(!isPattern){this.checkPropClash(prop,propHash,refDestructuringErrors);}
node.properties.push(prop);}
return this.finishNode(node,isPattern?"ObjectPattern":"ObjectExpression")};pp$3.parseProperty=function(isPattern,refDestructuringErrors){var prop=this.startNode(),isGenerator,isAsync,startPos,startLoc;if(this.options.ecmaVersion>=9&&this.eat(types.ellipsis)){if(isPattern){prop.argument=this.parseIdent(false);if(this.type===types.comma){this.raise(this.start,"Comma is not permitted after the rest element");}
return this.finishNode(prop,"RestElement")}
if(this.type===types.parenL&&refDestructuringErrors){if(refDestructuringErrors.parenthesizedAssign<0){refDestructuringErrors.parenthesizedAssign=this.start;}
if(refDestructuringErrors.parenthesizedBind<0){refDestructuringErrors.parenthesizedBind=this.start;}}
prop.argument=this.parseMaybeAssign(false,refDestructuringErrors);if(this.type===types.comma&&refDestructuringErrors&&refDestructuringErrors.trailingComma<0){refDestructuringErrors.trailingComma=this.start;}
return this.finishNode(prop,"SpreadElement")}
if(this.options.ecmaVersion>=6){prop.method=false;prop.shorthand=false;if(isPattern||refDestructuringErrors){startPos=this.start;startLoc=this.startLoc;}
if(!isPattern)
{isGenerator=this.eat(types.star);}}
var containsEsc=this.containsEsc;this.parsePropertyName(prop);if(!isPattern&&!containsEsc&&this.options.ecmaVersion>=8&&!isGenerator&&this.isAsyncProp(prop)){isAsync=true;isGenerator=this.options.ecmaVersion>=9&&this.eat(types.star);this.parsePropertyName(prop,refDestructuringErrors);}else{isAsync=false;}
this.parsePropertyValue(prop,isPattern,isGenerator,isAsync,startPos,startLoc,refDestructuringErrors,containsEsc);return this.finishNode(prop,"Property")};pp$3.parsePropertyValue=function(prop,isPattern,isGenerator,isAsync,startPos,startLoc,refDestructuringErrors,containsEsc){if((isGenerator||isAsync)&&this.type===types.colon)
{this.unexpected();}
if(this.eat(types.colon)){prop.value=isPattern?this.parseMaybeDefault(this.start,this.startLoc):this.parseMaybeAssign(false,refDestructuringErrors);prop.kind="init";}else if(this.options.ecmaVersion>=6&&this.type===types.parenL){if(isPattern){this.unexpected();}
prop.kind="init";prop.method=true;prop.value=this.parseMethod(isGenerator,isAsync);}else if(!isPattern&&!containsEsc&&this.options.ecmaVersion>=5&&!prop.computed&&prop.key.type==="Identifier"&&(prop.key.name==="get"||prop.key.name==="set")&&(this.type!==types.comma&&this.type!==types.braceR)){if(isGenerator||isAsync){this.unexpected();}
prop.kind=prop.key.name;this.parsePropertyName(prop);prop.value=this.parseMethod(false);var paramCount=prop.kind==="get"?0:1;if(prop.value.params.length!==paramCount){var start=prop.value.start;if(prop.kind==="get")
{this.raiseRecoverable(start,"getter should have no params");}
else
{this.raiseRecoverable(start,"setter should have exactly one param");}}else{if(prop.kind==="set"&&prop.value.params[0].type==="RestElement")
{this.raiseRecoverable(prop.value.params[0].start,"Setter cannot use rest params");}}}else if(this.options.ecmaVersion>=6&&!prop.computed&&prop.key.type==="Identifier"){if(isGenerator||isAsync){this.unexpected();}
this.checkUnreserved(prop.key);if(prop.key.name==="await"&&!this.awaitIdentPos)
{this.awaitIdentPos=startPos;}
prop.kind="init";if(isPattern){prop.value=this.parseMaybeDefault(startPos,startLoc,prop.key);}else if(this.type===types.eq&&refDestructuringErrors){if(refDestructuringErrors.shorthandAssign<0)
{refDestructuringErrors.shorthandAssign=this.start;}
prop.value=this.parseMaybeDefault(startPos,startLoc,prop.key);}else{prop.value=prop.key;}
prop.shorthand=true;}else{this.unexpected();}};pp$3.parsePropertyName=function(prop){if(this.options.ecmaVersion>=6){if(this.eat(types.bracketL)){prop.computed=true;prop.key=this.parseMaybeAssign();this.expect(types.bracketR);return prop.key}else{prop.computed=false;}}
return prop.key=this.type===types.num||this.type===types.string?this.parseExprAtom():this.parseIdent(this.options.allowReserved!=="never")};pp$3.initFunction=function(node){node.id=null;if(this.options.ecmaVersion>=6){node.generator=node.expression=false;}
if(this.options.ecmaVersion>=8){node.async=false;}};pp$3.parseMethod=function(isGenerator,isAsync,allowDirectSuper){var node=this.startNode(),oldYieldPos=this.yieldPos,oldAwaitPos=this.awaitPos,oldAwaitIdentPos=this.awaitIdentPos;this.initFunction(node);if(this.options.ecmaVersion>=6)
{node.generator=isGenerator;}
if(this.options.ecmaVersion>=8)
{node.async=!!isAsync;}
this.yieldPos=0;this.awaitPos=0;this.awaitIdentPos=0;this.enterScope(functionFlags(isAsync,node.generator)|SCOPE_SUPER|(allowDirectSuper?SCOPE_DIRECT_SUPER:0));this.expect(types.parenL);node.params=this.parseBindingList(types.parenR,false,this.options.ecmaVersion>=8);this.checkYieldAwaitInDefaultParams();this.parseFunctionBody(node,false,true);this.yieldPos=oldYieldPos;this.awaitPos=oldAwaitPos;this.awaitIdentPos=oldAwaitIdentPos;return this.finishNode(node,"FunctionExpression")};pp$3.parseArrowExpression=function(node,params,isAsync){var oldYieldPos=this.yieldPos,oldAwaitPos=this.awaitPos,oldAwaitIdentPos=this.awaitIdentPos;this.enterScope(functionFlags(isAsync,false)|SCOPE_ARROW);this.initFunction(node);if(this.options.ecmaVersion>=8){node.async=!!isAsync;}
this.yieldPos=0;this.awaitPos=0;this.awaitIdentPos=0;node.params=this.toAssignableList(params,true);this.parseFunctionBody(node,true,false);this.yieldPos=oldYieldPos;this.awaitPos=oldAwaitPos;this.awaitIdentPos=oldAwaitIdentPos;return this.finishNode(node,"ArrowFunctionExpression")};pp$3.parseFunctionBody=function(node,isArrowFunction,isMethod){var isExpression=isArrowFunction&&this.type!==types.braceL;var oldStrict=this.strict,useStrict=false;if(isExpression){node.body=this.parseMaybeAssign();node.expression=true;this.checkParams(node,false);}else{var nonSimple=this.options.ecmaVersion>=7&&!this.isSimpleParamList(node.params);if(!oldStrict||nonSimple){useStrict=this.strictDirective(this.end);if(useStrict&&nonSimple)
{this.raiseRecoverable(node.start,"Illegal 'use strict' directive in function with non-simple parameter list");}}
var oldLabels=this.labels;this.labels=[];if(useStrict){this.strict=true;}
this.checkParams(node,!oldStrict&&!useStrict&&!isArrowFunction&&!isMethod&&this.isSimpleParamList(node.params));node.body=this.parseBlock(false);node.expression=false;this.adaptDirectivePrologue(node.body.body);this.labels=oldLabels;}
this.exitScope();if(this.strict&&node.id){this.checkLVal(node.id,BIND_OUTSIDE);}
this.strict=oldStrict;};pp$3.isSimpleParamList=function(params){for(var i=0,list=params;i<list.length;i+=1)
{var param=list[i];if(param.type!=="Identifier"){return false}}
return true};pp$3.checkParams=function(node,allowDuplicates){var nameHash={};for(var i=0,list=node.params;i<list.length;i+=1)
{var param=list[i];this.checkLVal(param,BIND_VAR,allowDuplicates?null:nameHash);}};pp$3.parseExprList=function(close,allowTrailingComma,allowEmpty,refDestructuringErrors){var elts=[],first=true;while(!this.eat(close)){if(!first){this.expect(types.comma);if(allowTrailingComma&&this.afterTrailingComma(close)){break}}else{first=false;}
var elt=(void 0);if(allowEmpty&&this.type===types.comma)
{elt=null;}
else if(this.type===types.ellipsis){elt=this.parseSpread(refDestructuringErrors);if(refDestructuringErrors&&this.type===types.comma&&refDestructuringErrors.trailingComma<0)
{refDestructuringErrors.trailingComma=this.start;}}else{elt=this.parseMaybeAssign(false,refDestructuringErrors);}
elts.push(elt);}
return elts};pp$3.checkUnreserved=function(ref){var start=ref.start;var end=ref.end;var name=ref.name;if(this.inGenerator&&name==="yield")
{this.raiseRecoverable(start,"Cannot use 'yield' as identifier inside a generator");}
if(this.inAsync&&name==="await")
{this.raiseRecoverable(start,"Cannot use 'await' as identifier inside an async function");}
if(this.keywords.test(name))
{this.raise(start,("Unexpected keyword '"+name+"'"));}
if(this.options.ecmaVersion<6&&this.input.slice(start,end).indexOf("\\")!==-1){return}
var re=this.strict?this.reservedWordsStrict:this.reservedWords;if(re.test(name)){if(!this.inAsync&&name==="await")
{this.raiseRecoverable(start,"Cannot use keyword 'await' outside an async function");}
this.raiseRecoverable(start,("The keyword '"+name+"' is reserved"));}};pp$3.parseIdent=function(liberal,isBinding){var node=this.startNode();if(this.type===types.name){node.name=this.value;}else if(this.type.keyword){node.name=this.type.keyword;if((node.name==="class"||node.name==="function")&&(this.lastTokEnd!==this.lastTokStart+1||this.input.charCodeAt(this.lastTokStart)!==46)){this.context.pop();}}else{this.unexpected();}
this.next();this.finishNode(node,"Identifier");if(!liberal){this.checkUnreserved(node);if(node.name==="await"&&!this.awaitIdentPos)
{this.awaitIdentPos=node.start;}}
return node};pp$3.parseYield=function(noIn){if(!this.yieldPos){this.yieldPos=this.start;}
var node=this.startNode();this.next();if(this.type===types.semi||this.canInsertSemicolon()||(this.type!==types.star&&!this.type.startsExpr)){node.delegate=false;node.argument=null;}else{node.delegate=this.eat(types.star);node.argument=this.parseMaybeAssign(noIn);}
return this.finishNode(node,"YieldExpression")};pp$3.parseAwait=function(){if(!this.awaitPos){this.awaitPos=this.start;}
var node=this.startNode();this.next();node.argument=this.parseMaybeUnary(null,true);return this.finishNode(node,"AwaitExpression")};var pp$4=Parser.prototype;pp$4.raise=function(pos,message){var loc=getLineInfo(this.input,pos);message+=" ("+loc.line+":"+loc.column+")";var err=new SyntaxError(message);err.pos=pos;err.loc=loc;err.raisedAt=this.pos;throw err};pp$4.raiseRecoverable=pp$4.raise;pp$4.curPosition=function(){if(this.options.locations){return new Position(this.curLine,this.pos-this.lineStart)}};var pp$5=Parser.prototype;var Scope=function Scope(flags){this.flags=flags;this.var=[];this.lexical=[];this.functions=[];};pp$5.enterScope=function(flags){this.scopeStack.push(new Scope(flags));};pp$5.exitScope=function(){this.scopeStack.pop();};pp$5.treatFunctionsAsVarInScope=function(scope){return(scope.flags&SCOPE_FUNCTION)||!this.inModule&&(scope.flags&SCOPE_TOP)};pp$5.declareName=function(name,bindingType,pos){var redeclared=false;if(bindingType===BIND_LEXICAL){var scope=this.currentScope();redeclared=scope.lexical.indexOf(name)>-1||scope.functions.indexOf(name)>-1||scope.var.indexOf(name)>-1;scope.lexical.push(name);if(this.inModule&&(scope.flags&SCOPE_TOP))
{delete this.undefinedExports[name];}}else if(bindingType===BIND_SIMPLE_CATCH){var scope$1=this.currentScope();scope$1.lexical.push(name);}else if(bindingType===BIND_FUNCTION){var scope$2=this.currentScope();if(this.treatFunctionsAsVar)
{redeclared=scope$2.lexical.indexOf(name)>-1;}
else
{redeclared=scope$2.lexical.indexOf(name)>-1||scope$2.var.indexOf(name)>-1;}
scope$2.functions.push(name);}else{for(var i=this.scopeStack.length-1;i>=0;--i){var scope$3=this.scopeStack[i];if(scope$3.lexical.indexOf(name)>-1&&!((scope$3.flags&SCOPE_SIMPLE_CATCH)&&scope$3.lexical[0]===name)||!this.treatFunctionsAsVarInScope(scope$3)&&scope$3.functions.indexOf(name)>-1){redeclared=true;break}
scope$3.var.push(name);if(this.inModule&&(scope$3.flags&SCOPE_TOP))
{delete this.undefinedExports[name];}
if(scope$3.flags&SCOPE_VAR){break}}}
if(redeclared){this.raiseRecoverable(pos,("Identifier '"+name+"' has already been declared"));}};pp$5.checkLocalExport=function(id){if(this.scopeStack[0].lexical.indexOf(id.name)===-1&&this.scopeStack[0].var.indexOf(id.name)===-1){this.undefinedExports[id.name]=id;}};pp$5.currentScope=function(){return this.scopeStack[this.scopeStack.length-1]};pp$5.currentVarScope=function(){for(var i=this.scopeStack.length-1;;i--){var scope=this.scopeStack[i];if(scope.flags&SCOPE_VAR){return scope}}};pp$5.currentThisScope=function(){for(var i=this.scopeStack.length-1;;i--){var scope=this.scopeStack[i];if(scope.flags&SCOPE_VAR&&!(scope.flags&SCOPE_ARROW)){return scope}}};var Node=function Node(parser,pos,loc){this.type="";this.start=pos;this.end=0;if(parser.options.locations)
{this.loc=new SourceLocation(parser,loc);}
if(parser.options.directSourceFile)
{this.sourceFile=parser.options.directSourceFile;}
if(parser.options.ranges)
{this.range=[pos,0];}};var pp$6=Parser.prototype;pp$6.startNode=function(){return new Node(this,this.start,this.startLoc)};pp$6.startNodeAt=function(pos,loc){return new Node(this,pos,loc)};function finishNodeAt(node,type,pos,loc){node.type=type;node.end=pos;if(this.options.locations)
{node.loc.end=loc;}
if(this.options.ranges)
{node.range[1]=pos;}
return node}
pp$6.finishNode=function(node,type){return finishNodeAt.call(this,node,type,this.lastTokEnd,this.lastTokEndLoc)};pp$6.finishNodeAt=function(node,type,pos,loc){return finishNodeAt.call(this,node,type,pos,loc)};var TokContext=function TokContext(token,isExpr,preserveSpace,override,generator){this.token=token;this.isExpr=!!isExpr;this.preserveSpace=!!preserveSpace;this.override=override;this.generator=!!generator;};var types$1={b_stat:new TokContext("{",false),b_expr:new TokContext("{",true),b_tmpl:new TokContext("${",false),p_stat:new TokContext("(",false),p_expr:new TokContext("(",true),q_tmpl:new TokContext("`",true,true,function(p){return p.tryReadTemplateToken();}),f_stat:new TokContext("function",false),f_expr:new TokContext("function",true),f_expr_gen:new TokContext("function",true,false,null,true),f_gen:new TokContext("function",false,false,null,true)};var pp$7=Parser.prototype;pp$7.initialContext=function(){return[types$1.b_stat]};pp$7.braceIsBlock=function(prevType){var parent=this.curContext();if(parent===types$1.f_expr||parent===types$1.f_stat)
{return true}
if(prevType===types.colon&&(parent===types$1.b_stat||parent===types$1.b_expr))
{return!parent.isExpr}
if(prevType===types._return||prevType===types.name&&this.exprAllowed)
{return lineBreak.test(this.input.slice(this.lastTokEnd,this.start))}
if(prevType===types._else||prevType===types.semi||prevType===types.eof||prevType===types.parenR||prevType===types.arrow)
{return true}
if(prevType===types.braceL)
{return parent===types$1.b_stat}
if(prevType===types._var||prevType===types._const||prevType===types.name)
{return false}
return!this.exprAllowed};pp$7.inGeneratorContext=function(){for(var i=this.context.length-1;i>=1;i--){var context=this.context[i];if(context.token==="function")
{return context.generator}}
return false};pp$7.updateContext=function(prevType){var update,type=this.type;if(type.keyword&&prevType===types.dot)
{this.exprAllowed=false;}
else if(update=type.updateContext)
{update.call(this,prevType);}
else
{this.exprAllowed=type.beforeExpr;}};types.parenR.updateContext=types.braceR.updateContext=function(){if(this.context.length===1){this.exprAllowed=true;return}
var out=this.context.pop();if(out===types$1.b_stat&&this.curContext().token==="function"){out=this.context.pop();}
this.exprAllowed=!out.isExpr;};types.braceL.updateContext=function(prevType){this.context.push(this.braceIsBlock(prevType)?types$1.b_stat:types$1.b_expr);this.exprAllowed=true;};types.dollarBraceL.updateContext=function(){this.context.push(types$1.b_tmpl);this.exprAllowed=true;};types.parenL.updateContext=function(prevType){var statementParens=prevType===types._if||prevType===types._for||prevType===types._with||prevType===types._while;this.context.push(statementParens?types$1.p_stat:types$1.p_expr);this.exprAllowed=true;};types.incDec.updateContext=function(){};types._function.updateContext=types._class.updateContext=function(prevType){if(prevType.beforeExpr&&prevType!==types.semi&&prevType!==types._else&&!(prevType===types._return&&lineBreak.test(this.input.slice(this.lastTokEnd,this.start)))&&!((prevType===types.colon||prevType===types.braceL)&&this.curContext()===types$1.b_stat))
{this.context.push(types$1.f_expr);}
else
{this.context.push(types$1.f_stat);}
this.exprAllowed=false;};types.backQuote.updateContext=function(){if(this.curContext()===types$1.q_tmpl)
{this.context.pop();}
else
{this.context.push(types$1.q_tmpl);}
this.exprAllowed=false;};types.star.updateContext=function(prevType){if(prevType===types._function){var index=this.context.length-1;if(this.context[index]===types$1.f_expr)
{this.context[index]=types$1.f_expr_gen;}
else
{this.context[index]=types$1.f_gen;}}
this.exprAllowed=true;};types.name.updateContext=function(prevType){var allowed=false;if(this.options.ecmaVersion>=6&&prevType!==types.dot){if(this.value==="of"&&!this.exprAllowed||this.value==="yield"&&this.inGeneratorContext())
{allowed=true;}}
this.exprAllowed=allowed;};var ecma9BinaryProperties="ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS";var ecma10BinaryProperties=ecma9BinaryProperties+" Extended_Pictographic";var ecma11BinaryProperties=ecma10BinaryProperties;var unicodeBinaryProperties={9:ecma9BinaryProperties,10:ecma10BinaryProperties,11:ecma11BinaryProperties};var unicodeGeneralCategoryValues="Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu";var ecma9ScriptValues="Adlam Adlm Ahom Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb";var ecma10ScriptValues=ecma9ScriptValues+" Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd";var ecma11ScriptValues=ecma10ScriptValues+" Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho";var unicodeScriptValues={9:ecma9ScriptValues,10:ecma10ScriptValues,11:ecma11ScriptValues};var data={};function buildUnicodeData(ecmaVersion){var d=data[ecmaVersion]={binary:wordsRegexp(unicodeBinaryProperties[ecmaVersion]+" "+unicodeGeneralCategoryValues),nonBinary:{General_Category:wordsRegexp(unicodeGeneralCategoryValues),Script:wordsRegexp(unicodeScriptValues[ecmaVersion])}};d.nonBinary.Script_Extensions=d.nonBinary.Script;d.nonBinary.gc=d.nonBinary.General_Category;d.nonBinary.sc=d.nonBinary.Script;d.nonBinary.scx=d.nonBinary.Script_Extensions;}
buildUnicodeData(9);buildUnicodeData(10);buildUnicodeData(11);var pp$8=Parser.prototype;var RegExpValidationState=function RegExpValidationState(parser){this.parser=parser;this.validFlags="gim"+(parser.options.ecmaVersion>=6?"uy":"")+(parser.options.ecmaVersion>=9?"s":"");this.unicodeProperties=data[parser.options.ecmaVersion>=11?11:parser.options.ecmaVersion];this.source="";this.flags="";this.start=0;this.switchU=false;this.switchN=false;this.pos=0;this.lastIntValue=0;this.lastStringValue="";this.lastAssertionIsQuantifiable=false;this.numCapturingParens=0;this.maxBackReference=0;this.groupNames=[];this.backReferenceNames=[];};RegExpValidationState.prototype.reset=function reset(start,pattern,flags){var unicode=flags.indexOf("u")!==-1;this.start=start|0;this.source=pattern+"";this.flags=flags;this.switchU=unicode&&this.parser.options.ecmaVersion>=6;this.switchN=unicode&&this.parser.options.ecmaVersion>=9;};RegExpValidationState.prototype.raise=function raise(message){this.parser.raiseRecoverable(this.start,("Invalid regular expression: /"+(this.source)+"/: "+message));};RegExpValidationState.prototype.at=function at(i){var s=this.source;var l=s.length;if(i>=l){return-1}
var c=s.charCodeAt(i);if(!this.switchU||c<=0xD7FF||c>=0xE000||i+1>=l){return c}
return(c<<10)+s.charCodeAt(i+1)-0x35FDC00};RegExpValidationState.prototype.nextIndex=function nextIndex(i){var s=this.source;var l=s.length;if(i>=l){return l}
var c=s.charCodeAt(i);if(!this.switchU||c<=0xD7FF||c>=0xE000||i+1>=l){return i+1}
return i+2};RegExpValidationState.prototype.current=function current(){return this.at(this.pos)};RegExpValidationState.prototype.lookahead=function lookahead(){return this.at(this.nextIndex(this.pos))};RegExpValidationState.prototype.advance=function advance(){this.pos=this.nextIndex(this.pos);};RegExpValidationState.prototype.eat=function eat(ch){if(this.current()===ch){this.advance();return true}
return false};function codePointToString(ch){if(ch<=0xFFFF){return String.fromCharCode(ch)}
ch-=0x10000;return String.fromCharCode((ch>>10)+0xD800,(ch&0x03FF)+0xDC00)}
pp$8.validateRegExpFlags=function(state){var validFlags=state.validFlags;var flags=state.flags;for(var i=0;i<flags.length;i++){var flag=flags.charAt(i);if(validFlags.indexOf(flag)===-1){this.raise(state.start,"Invalid regular expression flag");}
if(flags.indexOf(flag,i+1)>-1){this.raise(state.start,"Duplicate regular expression flag");}}};pp$8.validateRegExpPattern=function(state){this.regexp_pattern(state);if(!state.switchN&&this.options.ecmaVersion>=9&&state.groupNames.length>0){state.switchN=true;this.regexp_pattern(state);}};pp$8.regexp_pattern=function(state){state.pos=0;state.lastIntValue=0;state.lastStringValue="";state.lastAssertionIsQuantifiable=false;state.numCapturingParens=0;state.maxBackReference=0;state.groupNames.length=0;state.backReferenceNames.length=0;this.regexp_disjunction(state);if(state.pos!==state.source.length){if(state.eat(0x29)){state.raise("Unmatched ')'");}
if(state.eat(0x5D)||state.eat(0x7D)){state.raise("Lone quantifier brackets");}}
if(state.maxBackReference>state.numCapturingParens){state.raise("Invalid escape");}
for(var i=0,list=state.backReferenceNames;i<list.length;i+=1){var name=list[i];if(state.groupNames.indexOf(name)===-1){state.raise("Invalid named capture referenced");}}};pp$8.regexp_disjunction=function(state){this.regexp_alternative(state);while(state.eat(0x7C)){this.regexp_alternative(state);}
if(this.regexp_eatQuantifier(state,true)){state.raise("Nothing to repeat");}
if(state.eat(0x7B)){state.raise("Lone quantifier brackets");}};pp$8.regexp_alternative=function(state){while(state.pos<state.source.length&&this.regexp_eatTerm(state))
{}};pp$8.regexp_eatTerm=function(state){if(this.regexp_eatAssertion(state)){if(state.lastAssertionIsQuantifiable&&this.regexp_eatQuantifier(state)){if(state.switchU){state.raise("Invalid quantifier");}}
return true}
if(state.switchU?this.regexp_eatAtom(state):this.regexp_eatExtendedAtom(state)){this.regexp_eatQuantifier(state);return true}
return false};pp$8.regexp_eatAssertion=function(state){var start=state.pos;state.lastAssertionIsQuantifiable=false;if(state.eat(0x5E)||state.eat(0x24)){return true}
if(state.eat(0x5C)){if(state.eat(0x42)||state.eat(0x62)){return true}
state.pos=start;}
if(state.eat(0x28)&&state.eat(0x3F)){var lookbehind=false;if(this.options.ecmaVersion>=9){lookbehind=state.eat(0x3C);}
if(state.eat(0x3D)||state.eat(0x21)){this.regexp_disjunction(state);if(!state.eat(0x29)){state.raise("Unterminated group");}
state.lastAssertionIsQuantifiable=!lookbehind;return true}}
state.pos=start;return false};pp$8.regexp_eatQuantifier=function(state,noError){if(noError===void 0)noError=false;if(this.regexp_eatQuantifierPrefix(state,noError)){state.eat(0x3F);return true}
return false};pp$8.regexp_eatQuantifierPrefix=function(state,noError){return(state.eat(0x2A)||state.eat(0x2B)||state.eat(0x3F)||this.regexp_eatBracedQuantifier(state,noError))};pp$8.regexp_eatBracedQuantifier=function(state,noError){var start=state.pos;if(state.eat(0x7B)){var min=0,max=-1;if(this.regexp_eatDecimalDigits(state)){min=state.lastIntValue;if(state.eat(0x2C)&&this.regexp_eatDecimalDigits(state)){max=state.lastIntValue;}
if(state.eat(0x7D)){if(max!==-1&&max<min&&!noError){state.raise("numbers out of order in {} quantifier");}
return true}}
if(state.switchU&&!noError){state.raise("Incomplete quantifier");}
state.pos=start;}
return false};pp$8.regexp_eatAtom=function(state){return(this.regexp_eatPatternCharacters(state)||state.eat(0x2E)||this.regexp_eatReverseSolidusAtomEscape(state)||this.regexp_eatCharacterClass(state)||this.regexp_eatUncapturingGroup(state)||this.regexp_eatCapturingGroup(state))};pp$8.regexp_eatReverseSolidusAtomEscape=function(state){var start=state.pos;if(state.eat(0x5C)){if(this.regexp_eatAtomEscape(state)){return true}
state.pos=start;}
return false};pp$8.regexp_eatUncapturingGroup=function(state){var start=state.pos;if(state.eat(0x28)){if(state.eat(0x3F)&&state.eat(0x3A)){this.regexp_disjunction(state);if(state.eat(0x29)){return true}
state.raise("Unterminated group");}
state.pos=start;}
return false};pp$8.regexp_eatCapturingGroup=function(state){if(state.eat(0x28)){if(this.options.ecmaVersion>=9){this.regexp_groupSpecifier(state);}else if(state.current()===0x3F){state.raise("Invalid group");}
this.regexp_disjunction(state);if(state.eat(0x29)){state.numCapturingParens+=1;return true}
state.raise("Unterminated group");}
return false};pp$8.regexp_eatExtendedAtom=function(state){return(state.eat(0x2E)||this.regexp_eatReverseSolidusAtomEscape(state)||this.regexp_eatCharacterClass(state)||this.regexp_eatUncapturingGroup(state)||this.regexp_eatCapturingGroup(state)||this.regexp_eatInvalidBracedQuantifier(state)||this.regexp_eatExtendedPatternCharacter(state))};pp$8.regexp_eatInvalidBracedQuantifier=function(state){if(this.regexp_eatBracedQuantifier(state,true)){state.raise("Nothing to repeat");}
return false};pp$8.regexp_eatSyntaxCharacter=function(state){var ch=state.current();if(isSyntaxCharacter(ch)){state.lastIntValue=ch;state.advance();return true}
return false};function isSyntaxCharacter(ch){return(ch===0x24||ch>=0x28&&ch<=0x2B||ch===0x2E||ch===0x3F||ch>=0x5B&&ch<=0x5E||ch>=0x7B&&ch<=0x7D)}
pp$8.regexp_eatPatternCharacters=function(state){var start=state.pos;var ch=0;while((ch=state.current())!==-1&&!isSyntaxCharacter(ch)){state.advance();}
return state.pos!==start};pp$8.regexp_eatExtendedPatternCharacter=function(state){var ch=state.current();if(ch!==-1&&ch!==0x24&&!(ch>=0x28&&ch<=0x2B)&&ch!==0x2E&&ch!==0x3F&&ch!==0x5B&&ch!==0x5E&&ch!==0x7C){state.advance();return true}
return false};pp$8.regexp_groupSpecifier=function(state){if(state.eat(0x3F)){if(this.regexp_eatGroupName(state)){if(state.groupNames.indexOf(state.lastStringValue)!==-1){state.raise("Duplicate capture group name");}
state.groupNames.push(state.lastStringValue);return}
state.raise("Invalid group");}};pp$8.regexp_eatGroupName=function(state){state.lastStringValue="";if(state.eat(0x3C)){if(this.regexp_eatRegExpIdentifierName(state)&&state.eat(0x3E)){return true}
state.raise("Invalid capture group name");}
return false};pp$8.regexp_eatRegExpIdentifierName=function(state){state.lastStringValue="";if(this.regexp_eatRegExpIdentifierStart(state)){state.lastStringValue+=codePointToString(state.lastIntValue);while(this.regexp_eatRegExpIdentifierPart(state)){state.lastStringValue+=codePointToString(state.lastIntValue);}
return true}
return false};pp$8.regexp_eatRegExpIdentifierStart=function(state){var start=state.pos;var ch=state.current();state.advance();if(ch===0x5C&&this.regexp_eatRegExpUnicodeEscapeSequence(state)){ch=state.lastIntValue;}
if(isRegExpIdentifierStart(ch)){state.lastIntValue=ch;return true}
state.pos=start;return false};function isRegExpIdentifierStart(ch){return isIdentifierStart(ch,true)||ch===0x24||ch===0x5F}
pp$8.regexp_eatRegExpIdentifierPart=function(state){var start=state.pos;var ch=state.current();state.advance();if(ch===0x5C&&this.regexp_eatRegExpUnicodeEscapeSequence(state)){ch=state.lastIntValue;}
if(isRegExpIdentifierPart(ch)){state.lastIntValue=ch;return true}
state.pos=start;return false};function isRegExpIdentifierPart(ch){return isIdentifierChar(ch,true)||ch===0x24||ch===0x5F||ch===0x200C||ch===0x200D}
pp$8.regexp_eatAtomEscape=function(state){if(this.regexp_eatBackReference(state)||this.regexp_eatCharacterClassEscape(state)||this.regexp_eatCharacterEscape(state)||(state.switchN&&this.regexp_eatKGroupName(state))){return true}
if(state.switchU){if(state.current()===0x63){state.raise("Invalid unicode escape");}
state.raise("Invalid escape");}
return false};pp$8.regexp_eatBackReference=function(state){var start=state.pos;if(this.regexp_eatDecimalEscape(state)){var n=state.lastIntValue;if(state.switchU){if(n>state.maxBackReference){state.maxBackReference=n;}
return true}
if(n<=state.numCapturingParens){return true}
state.pos=start;}
return false};pp$8.regexp_eatKGroupName=function(state){if(state.eat(0x6B)){if(this.regexp_eatGroupName(state)){state.backReferenceNames.push(state.lastStringValue);return true}
state.raise("Invalid named reference");}
return false};pp$8.regexp_eatCharacterEscape=function(state){return(this.regexp_eatControlEscape(state)||this.regexp_eatCControlLetter(state)||this.regexp_eatZero(state)||this.regexp_eatHexEscapeSequence(state)||this.regexp_eatRegExpUnicodeEscapeSequence(state)||(!state.switchU&&this.regexp_eatLegacyOctalEscapeSequence(state))||this.regexp_eatIdentityEscape(state))};pp$8.regexp_eatCControlLetter=function(state){var start=state.pos;if(state.eat(0x63)){if(this.regexp_eatControlLetter(state)){return true}
state.pos=start;}
return false};pp$8.regexp_eatZero=function(state){if(state.current()===0x30&&!isDecimalDigit(state.lookahead())){state.lastIntValue=0;state.advance();return true}
return false};pp$8.regexp_eatControlEscape=function(state){var ch=state.current();if(ch===0x74){state.lastIntValue=0x09;state.advance();return true}
if(ch===0x6E){state.lastIntValue=0x0A;state.advance();return true}
if(ch===0x76){state.lastIntValue=0x0B;state.advance();return true}
if(ch===0x66){state.lastIntValue=0x0C;state.advance();return true}
if(ch===0x72){state.lastIntValue=0x0D;state.advance();return true}
return false};pp$8.regexp_eatControlLetter=function(state){var ch=state.current();if(isControlLetter(ch)){state.lastIntValue=ch%0x20;state.advance();return true}
return false};function isControlLetter(ch){return((ch>=0x41&&ch<=0x5A)||(ch>=0x61&&ch<=0x7A))}
pp$8.regexp_eatRegExpUnicodeEscapeSequence=function(state){var start=state.pos;if(state.eat(0x75)){if(this.regexp_eatFixedHexDigits(state,4)){var lead=state.lastIntValue;if(state.switchU&&lead>=0xD800&&lead<=0xDBFF){var leadSurrogateEnd=state.pos;if(state.eat(0x5C)&&state.eat(0x75)&&this.regexp_eatFixedHexDigits(state,4)){var trail=state.lastIntValue;if(trail>=0xDC00&&trail<=0xDFFF){state.lastIntValue=(lead-0xD800)*0x400+(trail-0xDC00)+0x10000;return true}}
state.pos=leadSurrogateEnd;state.lastIntValue=lead;}
return true}
if(state.switchU&&state.eat(0x7B)&&this.regexp_eatHexDigits(state)&&state.eat(0x7D)&&isValidUnicode(state.lastIntValue)){return true}
if(state.switchU){state.raise("Invalid unicode escape");}
state.pos=start;}
return false};function isValidUnicode(ch){return ch>=0&&ch<=0x10FFFF}
pp$8.regexp_eatIdentityEscape=function(state){if(state.switchU){if(this.regexp_eatSyntaxCharacter(state)){return true}
if(state.eat(0x2F)){state.lastIntValue=0x2F;return true}
return false}
var ch=state.current();if(ch!==0x63&&(!state.switchN||ch!==0x6B)){state.lastIntValue=ch;state.advance();return true}
return false};pp$8.regexp_eatDecimalEscape=function(state){state.lastIntValue=0;var ch=state.current();if(ch>=0x31&&ch<=0x39){do{state.lastIntValue=10*state.lastIntValue+(ch-0x30);state.advance();}while((ch=state.current())>=0x30&&ch<=0x39)
return true}
return false};pp$8.regexp_eatCharacterClassEscape=function(state){var ch=state.current();if(isCharacterClassEscape(ch)){state.lastIntValue=-1;state.advance();return true}
if(state.switchU&&this.options.ecmaVersion>=9&&(ch===0x50||ch===0x70)){state.lastIntValue=-1;state.advance();if(state.eat(0x7B)&&this.regexp_eatUnicodePropertyValueExpression(state)&&state.eat(0x7D)){return true}
state.raise("Invalid property name");}
return false};function isCharacterClassEscape(ch){return(ch===0x64||ch===0x44||ch===0x73||ch===0x53||ch===0x77||ch===0x57)}
pp$8.regexp_eatUnicodePropertyValueExpression=function(state){var start=state.pos;if(this.regexp_eatUnicodePropertyName(state)&&state.eat(0x3D)){var name=state.lastStringValue;if(this.regexp_eatUnicodePropertyValue(state)){var value=state.lastStringValue;this.regexp_validateUnicodePropertyNameAndValue(state,name,value);return true}}
state.pos=start;if(this.regexp_eatLoneUnicodePropertyNameOrValue(state)){var nameOrValue=state.lastStringValue;this.regexp_validateUnicodePropertyNameOrValue(state,nameOrValue);return true}
return false};pp$8.regexp_validateUnicodePropertyNameAndValue=function(state,name,value){if(!has(state.unicodeProperties.nonBinary,name))
{state.raise("Invalid property name");}
if(!state.unicodeProperties.nonBinary[name].test(value))
{state.raise("Invalid property value");}};pp$8.regexp_validateUnicodePropertyNameOrValue=function(state,nameOrValue){if(!state.unicodeProperties.binary.test(nameOrValue))
{state.raise("Invalid property name");}};pp$8.regexp_eatUnicodePropertyName=function(state){var ch=0;state.lastStringValue="";while(isUnicodePropertyNameCharacter(ch=state.current())){state.lastStringValue+=codePointToString(ch);state.advance();}
return state.lastStringValue!==""};function isUnicodePropertyNameCharacter(ch){return isControlLetter(ch)||ch===0x5F}
pp$8.regexp_eatUnicodePropertyValue=function(state){var ch=0;state.lastStringValue="";while(isUnicodePropertyValueCharacter(ch=state.current())){state.lastStringValue+=codePointToString(ch);state.advance();}
return state.lastStringValue!==""};function isUnicodePropertyValueCharacter(ch){return isUnicodePropertyNameCharacter(ch)||isDecimalDigit(ch)}
pp$8.regexp_eatLoneUnicodePropertyNameOrValue=function(state){return this.regexp_eatUnicodePropertyValue(state)};pp$8.regexp_eatCharacterClass=function(state){if(state.eat(0x5B)){state.eat(0x5E);this.regexp_classRanges(state);if(state.eat(0x5D)){return true}
state.raise("Unterminated character class");}
return false};pp$8.regexp_classRanges=function(state){while(this.regexp_eatClassAtom(state)){var left=state.lastIntValue;if(state.eat(0x2D)&&this.regexp_eatClassAtom(state)){var right=state.lastIntValue;if(state.switchU&&(left===-1||right===-1)){state.raise("Invalid character class");}
if(left!==-1&&right!==-1&&left>right){state.raise("Range out of order in character class");}}}};pp$8.regexp_eatClassAtom=function(state){var start=state.pos;if(state.eat(0x5C)){if(this.regexp_eatClassEscape(state)){return true}
if(state.switchU){var ch$1=state.current();if(ch$1===0x63||isOctalDigit(ch$1)){state.raise("Invalid class escape");}
state.raise("Invalid escape");}
state.pos=start;}
var ch=state.current();if(ch!==0x5D){state.lastIntValue=ch;state.advance();return true}
return false};pp$8.regexp_eatClassEscape=function(state){var start=state.pos;if(state.eat(0x62)){state.lastIntValue=0x08;return true}
if(state.switchU&&state.eat(0x2D)){state.lastIntValue=0x2D;return true}
if(!state.switchU&&state.eat(0x63)){if(this.regexp_eatClassControlLetter(state)){return true}
state.pos=start;}
return(this.regexp_eatCharacterClassEscape(state)||this.regexp_eatCharacterEscape(state))};pp$8.regexp_eatClassControlLetter=function(state){var ch=state.current();if(isDecimalDigit(ch)||ch===0x5F){state.lastIntValue=ch%0x20;state.advance();return true}
return false};pp$8.regexp_eatHexEscapeSequence=function(state){var start=state.pos;if(state.eat(0x78)){if(this.regexp_eatFixedHexDigits(state,2)){return true}
if(state.switchU){state.raise("Invalid escape");}
state.pos=start;}
return false};pp$8.regexp_eatDecimalDigits=function(state){var start=state.pos;var ch=0;state.lastIntValue=0;while(isDecimalDigit(ch=state.current())){state.lastIntValue=10*state.lastIntValue+(ch-0x30);state.advance();}
return state.pos!==start};function isDecimalDigit(ch){return ch>=0x30&&ch<=0x39}
pp$8.regexp_eatHexDigits=function(state){var start=state.pos;var ch=0;state.lastIntValue=0;while(isHexDigit(ch=state.current())){state.lastIntValue=16*state.lastIntValue+hexToInt(ch);state.advance();}
return state.pos!==start};function isHexDigit(ch){return((ch>=0x30&&ch<=0x39)||(ch>=0x41&&ch<=0x46)||(ch>=0x61&&ch<=0x66))}
function hexToInt(ch){if(ch>=0x41&&ch<=0x46){return 10+(ch-0x41)}
if(ch>=0x61&&ch<=0x66){return 10+(ch-0x61)}
return ch-0x30}
pp$8.regexp_eatLegacyOctalEscapeSequence=function(state){if(this.regexp_eatOctalDigit(state)){var n1=state.lastIntValue;if(this.regexp_eatOctalDigit(state)){var n2=state.lastIntValue;if(n1<=3&&this.regexp_eatOctalDigit(state)){state.lastIntValue=n1*64+n2*8+state.lastIntValue;}else{state.lastIntValue=n1*8+n2;}}else{state.lastIntValue=n1;}
return true}
return false};pp$8.regexp_eatOctalDigit=function(state){var ch=state.current();if(isOctalDigit(ch)){state.lastIntValue=ch-0x30;state.advance();return true}
state.lastIntValue=0;return false};function isOctalDigit(ch){return ch>=0x30&&ch<=0x37}
pp$8.regexp_eatFixedHexDigits=function(state,length){var start=state.pos;state.lastIntValue=0;for(var i=0;i<length;++i){var ch=state.current();if(!isHexDigit(ch)){state.pos=start;return false}
state.lastIntValue=16*state.lastIntValue+hexToInt(ch);state.advance();}
return true};var Token=function Token(p){this.type=p.type;this.value=p.value;this.start=p.start;this.end=p.end;if(p.options.locations)
{this.loc=new SourceLocation(p,p.startLoc,p.endLoc);}
if(p.options.ranges)
{this.range=[p.start,p.end];}};var pp$9=Parser.prototype;pp$9.next=function(){if(this.options.onToken)
{this.options.onToken(new Token(this));}
this.lastTokEnd=this.end;this.lastTokStart=this.start;this.lastTokEndLoc=this.endLoc;this.lastTokStartLoc=this.startLoc;this.nextToken();};pp$9.getToken=function(){this.next();return new Token(this)};if(typeof Symbol!=="undefined")
{pp$9[Symbol.iterator]=function(){var this$1=this;return{next:function(){var token=this$1.getToken();return{done:token.type===types.eof,value:token}}}};}
pp$9.curContext=function(){return this.context[this.context.length-1]};pp$9.nextToken=function(){var curContext=this.curContext();if(!curContext||!curContext.preserveSpace){this.skipSpace();}
this.start=this.pos;if(this.options.locations){this.startLoc=this.curPosition();}
if(this.pos>=this.input.length){return this.finishToken(types.eof)}
if(curContext.override){return curContext.override(this)}
else{this.readToken(this.fullCharCodeAtPos());}};pp$9.readToken=function(code){if(isIdentifierStart(code,this.options.ecmaVersion>=6)||code===92)
{return this.readWord()}
return this.getTokenFromCode(code)};pp$9.fullCharCodeAtPos=function(){var code=this.input.charCodeAt(this.pos);if(code<=0xd7ff||code>=0xe000){return code}
var next=this.input.charCodeAt(this.pos+1);return(code<<10)+next-0x35fdc00};pp$9.skipBlockComment=function(){var startLoc=this.options.onComment&&this.curPosition();var start=this.pos,end=this.input.indexOf("*/",this.pos+=2);if(end===-1){this.raise(this.pos-2,"Unterminated comment");}
this.pos=end+2;if(this.options.locations){lineBreakG.lastIndex=start;var match;while((match=lineBreakG.exec(this.input))&&match.index<this.pos){++this.curLine;this.lineStart=match.index+match[0].length;}}
if(this.options.onComment)
{this.options.onComment(true,this.input.slice(start+2,end),start,this.pos,startLoc,this.curPosition());}};pp$9.skipLineComment=function(startSkip){var start=this.pos;var startLoc=this.options.onComment&&this.curPosition();var ch=this.input.charCodeAt(this.pos+=startSkip);while(this.pos<this.input.length&&!isNewLine(ch)){ch=this.input.charCodeAt(++this.pos);}
if(this.options.onComment)
{this.options.onComment(false,this.input.slice(start+startSkip,this.pos),start,this.pos,startLoc,this.curPosition());}};pp$9.skipSpace=function(){loop:while(this.pos<this.input.length){var ch=this.input.charCodeAt(this.pos);switch(ch){case 32:case 160:++this.pos;break
case 13:if(this.input.charCodeAt(this.pos+1)===10){++this.pos;}
case 10:case 8232:case 8233:++this.pos;if(this.options.locations){++this.curLine;this.lineStart=this.pos;}
break
case 47:switch(this.input.charCodeAt(this.pos+1)){case 42:this.skipBlockComment();break
case 47:this.skipLineComment(2);break
default:break loop}
break
default:if(ch>8&&ch<14||ch>=5760&&nonASCIIwhitespace.test(String.fromCharCode(ch))){++this.pos;}else{break loop}}}};pp$9.finishToken=function(type,val){this.end=this.pos;if(this.options.locations){this.endLoc=this.curPosition();}
var prevType=this.type;this.type=type;this.value=val;this.updateContext(prevType);};pp$9.readToken_dot=function(){var next=this.input.charCodeAt(this.pos+1);if(next>=48&&next<=57){return this.readNumber(true)}
var next2=this.input.charCodeAt(this.pos+2);if(this.options.ecmaVersion>=6&&next===46&&next2===46){this.pos+=3;return this.finishToken(types.ellipsis)}else{++this.pos;return this.finishToken(types.dot)}};pp$9.readToken_slash=function(){var next=this.input.charCodeAt(this.pos+1);if(this.exprAllowed){++this.pos;return this.readRegexp()}
if(next===61){return this.finishOp(types.assign,2)}
return this.finishOp(types.slash,1)};pp$9.readToken_mult_modulo_exp=function(code){var next=this.input.charCodeAt(this.pos+1);var size=1;var tokentype=code===42?types.star:types.modulo;if(this.options.ecmaVersion>=7&&code===42&&next===42){++size;tokentype=types.starstar;next=this.input.charCodeAt(this.pos+2);}
if(next===61){return this.finishOp(types.assign,size+1)}
return this.finishOp(tokentype,size)};pp$9.readToken_pipe_amp=function(code){var next=this.input.charCodeAt(this.pos+1);if(next===code){return this.finishOp(code===124?types.logicalOR:types.logicalAND,2)}
if(next===61){return this.finishOp(types.assign,2)}
return this.finishOp(code===124?types.bitwiseOR:types.bitwiseAND,1)};pp$9.readToken_caret=function(){var next=this.input.charCodeAt(this.pos+1);if(next===61){return this.finishOp(types.assign,2)}
return this.finishOp(types.bitwiseXOR,1)};pp$9.readToken_plus_min=function(code){var next=this.input.charCodeAt(this.pos+1);if(next===code){if(next===45&&!this.inModule&&this.input.charCodeAt(this.pos+2)===62&&(this.lastTokEnd===0||lineBreak.test(this.input.slice(this.lastTokEnd,this.pos)))){this.skipLineComment(3);this.skipSpace();return this.nextToken()}
return this.finishOp(types.incDec,2)}
if(next===61){return this.finishOp(types.assign,2)}
return this.finishOp(types.plusMin,1)};pp$9.readToken_lt_gt=function(code){var next=this.input.charCodeAt(this.pos+1);var size=1;if(next===code){size=code===62&&this.input.charCodeAt(this.pos+2)===62?3:2;if(this.input.charCodeAt(this.pos+size)===61){return this.finishOp(types.assign,size+1)}
return this.finishOp(types.bitShift,size)}
if(next===33&&code===60&&!this.inModule&&this.input.charCodeAt(this.pos+2)===45&&this.input.charCodeAt(this.pos+3)===45){this.skipLineComment(4);this.skipSpace();return this.nextToken()}
if(next===61){size=2;}
return this.finishOp(types.relational,size)};pp$9.readToken_eq_excl=function(code){var next=this.input.charCodeAt(this.pos+1);if(next===61){return this.finishOp(types.equality,this.input.charCodeAt(this.pos+2)===61?3:2)}
if(code===61&&next===62&&this.options.ecmaVersion>=6){this.pos+=2;return this.finishToken(types.arrow)}
return this.finishOp(code===61?types.eq:types.prefix,1)};pp$9.getTokenFromCode=function(code){switch(code){case 46:return this.readToken_dot()
case 40:++this.pos;return this.finishToken(types.parenL)
case 41:++this.pos;return this.finishToken(types.parenR)
case 59:++this.pos;return this.finishToken(types.semi)
case 44:++this.pos;return this.finishToken(types.comma)
case 91:++this.pos;return this.finishToken(types.bracketL)
case 93:++this.pos;return this.finishToken(types.bracketR)
case 123:++this.pos;return this.finishToken(types.braceL)
case 125:++this.pos;return this.finishToken(types.braceR)
case 58:++this.pos;return this.finishToken(types.colon)
case 63:++this.pos;return this.finishToken(types.question)
case 96:if(this.options.ecmaVersion<6){break}
++this.pos;return this.finishToken(types.backQuote)
case 48:var next=this.input.charCodeAt(this.pos+1);if(next===120||next===88){return this.readRadixNumber(16)}
if(this.options.ecmaVersion>=6){if(next===111||next===79){return this.readRadixNumber(8)}
if(next===98||next===66){return this.readRadixNumber(2)}}
case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:return this.readNumber(false)
case 34:case 39:return this.readString(code)
case 47:return this.readToken_slash()
case 37:case 42:return this.readToken_mult_modulo_exp(code)
case 124:case 38:return this.readToken_pipe_amp(code)
case 94:return this.readToken_caret()
case 43:case 45:return this.readToken_plus_min(code)
case 60:case 62:return this.readToken_lt_gt(code)
case 61:case 33:return this.readToken_eq_excl(code)
case 126:return this.finishOp(types.prefix,1)}
this.raise(this.pos,"Unexpected character '"+codePointToString$1(code)+"'");};pp$9.finishOp=function(type,size){var str=this.input.slice(this.pos,this.pos+size);this.pos+=size;return this.finishToken(type,str)};pp$9.readRegexp=function(){var escaped,inClass,start=this.pos;for(;;){if(this.pos>=this.input.length){this.raise(start,"Unterminated regular expression");}
var ch=this.input.charAt(this.pos);if(lineBreak.test(ch)){this.raise(start,"Unterminated regular expression");}
if(!escaped){if(ch==="["){inClass=true;}
else if(ch==="]"&&inClass){inClass=false;}
else if(ch==="/"&&!inClass){break}
escaped=ch==="\\";}else{escaped=false;}
++this.pos;}
var pattern=this.input.slice(start,this.pos);++this.pos;var flagsStart=this.pos;var flags=this.readWord1();if(this.containsEsc){this.unexpected(flagsStart);}
var state=this.regexpState||(this.regexpState=new RegExpValidationState(this));state.reset(start,pattern,flags);this.validateRegExpFlags(state);this.validateRegExpPattern(state);var value=null;try{value=new RegExp(pattern,flags);}catch(e){}
return this.finishToken(types.regexp,{pattern:pattern,flags:flags,value:value})};pp$9.readInt=function(radix,len){var start=this.pos,total=0;for(var i=0,e=len==null?Infinity:len;i<e;++i){var code=this.input.charCodeAt(this.pos),val=(void 0);if(code>=97){val=code-97+10;}
else if(code>=65){val=code-65+10;}
else if(code>=48&&code<=57){val=code-48;}
else{val=Infinity;}
if(val>=radix){break}
++this.pos;total=total*radix+val;}
if(this.pos===start||len!=null&&this.pos-start!==len){return null}
return total};pp$9.readRadixNumber=function(radix){var start=this.pos;this.pos+=2;var val=this.readInt(radix);if(val==null){this.raise(this.start+2,"Expected number in radix "+radix);}
if(this.options.ecmaVersion>=11&&this.input.charCodeAt(this.pos)===110){val=typeof BigInt!=="undefined"?BigInt(this.input.slice(start,this.pos)):null;++this.pos;}else if(isIdentifierStart(this.fullCharCodeAtPos())){this.raise(this.pos,"Identifier directly after number");}
return this.finishToken(types.num,val)};pp$9.readNumber=function(startsWithDot){var start=this.pos;if(!startsWithDot&&this.readInt(10)===null){this.raise(start,"Invalid number");}
var octal=this.pos-start>=2&&this.input.charCodeAt(start)===48;if(octal&&this.strict){this.raise(start,"Invalid number");}
if(octal&&/[89]/.test(this.input.slice(start,this.pos))){octal=false;}
var next=this.input.charCodeAt(this.pos);if(!octal&&!startsWithDot&&this.options.ecmaVersion>=11&&next===110){var str$1=this.input.slice(start,this.pos);var val$1=typeof BigInt!=="undefined"?BigInt(str$1):null;++this.pos;if(isIdentifierStart(this.fullCharCodeAtPos())){this.raise(this.pos,"Identifier directly after number");}
return this.finishToken(types.num,val$1)}
if(next===46&&!octal){++this.pos;this.readInt(10);next=this.input.charCodeAt(this.pos);}
if((next===69||next===101)&&!octal){next=this.input.charCodeAt(++this.pos);if(next===43||next===45){++this.pos;}
if(this.readInt(10)===null){this.raise(start,"Invalid number");}}
if(isIdentifierStart(this.fullCharCodeAtPos())){this.raise(this.pos,"Identifier directly after number");}
var str=this.input.slice(start,this.pos);var val=octal?parseInt(str,8):parseFloat(str);return this.finishToken(types.num,val)};pp$9.readCodePoint=function(){var ch=this.input.charCodeAt(this.pos),code;if(ch===123){if(this.options.ecmaVersion<6){this.unexpected();}
var codePos=++this.pos;code=this.readHexChar(this.input.indexOf("}",this.pos)-this.pos);++this.pos;if(code>0x10FFFF){this.invalidStringToken(codePos,"Code point out of bounds");}}else{code=this.readHexChar(4);}
return code};function codePointToString$1(code){if(code<=0xFFFF){return String.fromCharCode(code)}
code-=0x10000;return String.fromCharCode((code>>10)+0xD800,(code&1023)+0xDC00)}
pp$9.readString=function(quote){var out="",chunkStart=++this.pos;for(;;){if(this.pos>=this.input.length){this.raise(this.start,"Unterminated string constant");}
var ch=this.input.charCodeAt(this.pos);if(ch===quote){break}
if(ch===92){out+=this.input.slice(chunkStart,this.pos);out+=this.readEscapedChar(false);chunkStart=this.pos;}else{if(isNewLine(ch,this.options.ecmaVersion>=10)){this.raise(this.start,"Unterminated string constant");}
++this.pos;}}
out+=this.input.slice(chunkStart,this.pos++);return this.finishToken(types.string,out)};var INVALID_TEMPLATE_ESCAPE_ERROR={};pp$9.tryReadTemplateToken=function(){this.inTemplateElement=true;try{this.readTmplToken();}catch(err){if(err===INVALID_TEMPLATE_ESCAPE_ERROR){this.readInvalidTemplateToken();}else{throw err}}
this.inTemplateElement=false;};pp$9.invalidStringToken=function(position,message){if(this.inTemplateElement&&this.options.ecmaVersion>=9){throw INVALID_TEMPLATE_ESCAPE_ERROR}else{this.raise(position,message);}};pp$9.readTmplToken=function(){var out="",chunkStart=this.pos;for(;;){if(this.pos>=this.input.length){this.raise(this.start,"Unterminated template");}
var ch=this.input.charCodeAt(this.pos);if(ch===96||ch===36&&this.input.charCodeAt(this.pos+1)===123){if(this.pos===this.start&&(this.type===types.template||this.type===types.invalidTemplate)){if(ch===36){this.pos+=2;return this.finishToken(types.dollarBraceL)}else{++this.pos;return this.finishToken(types.backQuote)}}
out+=this.input.slice(chunkStart,this.pos);return this.finishToken(types.template,out)}
if(ch===92){out+=this.input.slice(chunkStart,this.pos);out+=this.readEscapedChar(true);chunkStart=this.pos;}else if(isNewLine(ch)){out+=this.input.slice(chunkStart,this.pos);++this.pos;switch(ch){case 13:if(this.input.charCodeAt(this.pos)===10){++this.pos;}
case 10:out+="\n";break
default:out+=String.fromCharCode(ch);break}
if(this.options.locations){++this.curLine;this.lineStart=this.pos;}
chunkStart=this.pos;}else{++this.pos;}}};pp$9.readInvalidTemplateToken=function(){for(;this.pos<this.input.length;this.pos++){switch(this.input[this.pos]){case"\\":++this.pos;break
case"$":if(this.input[this.pos+1]!=="{"){break}
case"`":return this.finishToken(types.invalidTemplate,this.input.slice(this.start,this.pos))}}
this.raise(this.start,"Unterminated template");};pp$9.readEscapedChar=function(inTemplate){var ch=this.input.charCodeAt(++this.pos);++this.pos;switch(ch){case 110:return"\n"
case 114:return"\r"
case 120:return String.fromCharCode(this.readHexChar(2))
case 117:return codePointToString$1(this.readCodePoint())
case 116:return"\t"
case 98:return"\b"
case 118:return"\u000b"
case 102:return"\f"
case 13:if(this.input.charCodeAt(this.pos)===10){++this.pos;}
case 10:if(this.options.locations){this.lineStart=this.pos;++this.curLine;}
return""
default:if(ch>=48&&ch<=55){var octalStr=this.input.substr(this.pos-1,3).match(/^[0-7]+/)[0];var octal=parseInt(octalStr,8);if(octal>255){octalStr=octalStr.slice(0,-1);octal=parseInt(octalStr,8);}
this.pos+=octalStr.length-1;ch=this.input.charCodeAt(this.pos);if((octalStr!=="0"||ch===56||ch===57)&&(this.strict||inTemplate)){this.invalidStringToken(this.pos-1-octalStr.length,inTemplate?"Octal literal in template string":"Octal literal in strict mode");}
return String.fromCharCode(octal)}
if(isNewLine(ch)){return""}
return String.fromCharCode(ch)}};pp$9.readHexChar=function(len){var codePos=this.pos;var n=this.readInt(16,len);if(n===null){this.invalidStringToken(codePos,"Bad character escape sequence");}
return n};pp$9.readWord1=function(){this.containsEsc=false;var word="",first=true,chunkStart=this.pos;var astral=this.options.ecmaVersion>=6;while(this.pos<this.input.length){var ch=this.fullCharCodeAtPos();if(isIdentifierChar(ch,astral)){this.pos+=ch<=0xffff?1:2;}else if(ch===92){this.containsEsc=true;word+=this.input.slice(chunkStart,this.pos);var escStart=this.pos;if(this.input.charCodeAt(++this.pos)!==117)
{this.invalidStringToken(this.pos,"Expecting Unicode escape sequence \\uXXXX");}
++this.pos;var esc=this.readCodePoint();if(!(first?isIdentifierStart:isIdentifierChar)(esc,astral))
{this.invalidStringToken(escStart,"Invalid Unicode escape");}
word+=codePointToString$1(esc);chunkStart=this.pos;}else{break}
first=false;}
return word+this.input.slice(chunkStart,this.pos)};pp$9.readWord=function(){var word=this.readWord1();var type=types.name;if(this.keywords.test(word)){if(this.containsEsc){this.raiseRecoverable(this.start,"Escape sequence in keyword "+word);}
type=keywords$1[word];}
return this.finishToken(type,word)};var version="7.1.0";Parser.acorn={Parser:Parser,version:version,defaultOptions:defaultOptions,Position:Position,SourceLocation:SourceLocation,getLineInfo:getLineInfo,Node:Node,TokenType:TokenType,tokTypes:types,keywordTypes:keywords$1,TokContext:TokContext,tokContexts:types$1,isIdentifierChar:isIdentifierChar,isIdentifierStart:isIdentifierStart,Token:Token,isNewLine:isNewLine,lineBreak:lineBreak,lineBreakG:lineBreakG,nonASCIIwhitespace:nonASCIIwhitespace};function parse(input,options){return Parser.parse(input,options)}
function parseExpressionAt(input,pos,options){return Parser.parseExpressionAt(input,pos,options)}
function tokenizer(input,options){return Parser.tokenizer(input,options)}
exports.Node=Node;exports.Parser=Parser;exports.Position=Position;exports.SourceLocation=SourceLocation;exports.TokContext=TokContext;exports.Token=Token;exports.TokenType=TokenType;exports.defaultOptions=defaultOptions;exports.getLineInfo=getLineInfo;exports.isIdentifierChar=isIdentifierChar;exports.isIdentifierStart=isIdentifierStart;exports.isNewLine=isNewLine;exports.keywordTypes=keywords$1;exports.lineBreak=lineBreak;exports.lineBreakG=lineBreakG;exports.nonASCIIwhitespace=nonASCIIwhitespace;exports.parse=parse;exports.parseExpressionAt=parseExpressionAt;exports.tokContexts=types$1;exports.tokTypes=types;exports.tokenizer=tokenizer;exports.version=version;Object.defineProperty(exports,'__esModule',{value:true});}));;(function(global,factory){typeof exports==='object'&&typeof module!=='undefined'?factory(exports,require('acorn')):typeof define==='function'&&define.amd?define(['exports','acorn'],factory):(global=global||self,factory((global.acorn=global.acorn||{},global.acorn.loose={}),global.acorn));}(this,function(exports,acorn){'use strict';function noop(){}
var LooseParser=function LooseParser(input,options){if(options===void 0)options={};this.toks=this.constructor.BaseParser.tokenizer(input,options);this.options=this.toks.options;this.input=this.toks.input;this.tok=this.last={type:acorn.tokTypes.eof,start:0,end:0};this.tok.validateRegExpFlags=noop;this.tok.validateRegExpPattern=noop;if(this.options.locations){var here=this.toks.curPosition();this.tok.loc=new acorn.SourceLocation(this.toks,here,here);}
this.ahead=[];this.context=[];this.curIndent=0;this.curLineStart=0;this.nextLineStart=this.lineEnd(this.curLineStart)+1;this.inAsync=false;this.inFunction=false;};LooseParser.prototype.startNode=function startNode(){return new acorn.Node(this.toks,this.tok.start,this.options.locations?this.tok.loc.start:null)};LooseParser.prototype.storeCurrentPos=function storeCurrentPos(){return this.options.locations?[this.tok.start,this.tok.loc.start]:this.tok.start};LooseParser.prototype.startNodeAt=function startNodeAt(pos){if(this.options.locations){return new acorn.Node(this.toks,pos[0],pos[1])}else{return new acorn.Node(this.toks,pos)}};LooseParser.prototype.finishNode=function finishNode(node,type){node.type=type;node.end=this.last.end;if(this.options.locations)
{node.loc.end=this.last.loc.end;}
if(this.options.ranges)
{node.range[1]=this.last.end;}
return node};LooseParser.prototype.dummyNode=function dummyNode(type){var dummy=this.startNode();dummy.type=type;dummy.end=dummy.start;if(this.options.locations)
{dummy.loc.end=dummy.loc.start;}
if(this.options.ranges)
{dummy.range[1]=dummy.start;}
this.last={type:acorn.tokTypes.name,start:dummy.start,end:dummy.start,loc:dummy.loc};return dummy};LooseParser.prototype.dummyIdent=function dummyIdent(){var dummy=this.dummyNode("Identifier");dummy.name="✖";return dummy};LooseParser.prototype.dummyString=function dummyString(){var dummy=this.dummyNode("Literal");dummy.value=dummy.raw="✖";return dummy};LooseParser.prototype.eat=function eat(type){if(this.tok.type===type){this.next();return true}else{return false}};LooseParser.prototype.isContextual=function isContextual(name){return this.tok.type===acorn.tokTypes.name&&this.tok.value===name};LooseParser.prototype.eatContextual=function eatContextual(name){return this.tok.value===name&&this.eat(acorn.tokTypes.name)};LooseParser.prototype.canInsertSemicolon=function canInsertSemicolon(){return this.tok.type===acorn.tokTypes.eof||this.tok.type===acorn.tokTypes.braceR||acorn.lineBreak.test(this.input.slice(this.last.end,this.tok.start))};LooseParser.prototype.semicolon=function semicolon(){return this.eat(acorn.tokTypes.semi)};LooseParser.prototype.expect=function expect(type){if(this.eat(type)){return true}
for(var i=1;i<=2;i++){if(this.lookAhead(i).type===type){for(var j=0;j<i;j++){this.next();}
return true}}};LooseParser.prototype.pushCx=function pushCx(){this.context.push(this.curIndent);};LooseParser.prototype.popCx=function popCx(){this.curIndent=this.context.pop();};LooseParser.prototype.lineEnd=function lineEnd(pos){while(pos<this.input.length&&!acorn.isNewLine(this.input.charCodeAt(pos))){++pos;}
return pos};LooseParser.prototype.indentationAfter=function indentationAfter(pos){for(var count=0;;++pos){var ch=this.input.charCodeAt(pos);if(ch===32){++count;}
else if(ch===9){count+=this.options.tabSize;}
else{return count}}};LooseParser.prototype.closes=function closes(closeTok,indent,line,blockHeuristic){if(this.tok.type===closeTok||this.tok.type===acorn.tokTypes.eof){return true}
return line!==this.curLineStart&&this.curIndent<indent&&this.tokenStartsLine()&&(!blockHeuristic||this.nextLineStart>=this.input.length||this.indentationAfter(this.nextLineStart)<indent)};LooseParser.prototype.tokenStartsLine=function tokenStartsLine(){for(var p=this.tok.start-1;p>=this.curLineStart;--p){var ch=this.input.charCodeAt(p);if(ch!==9&&ch!==32){return false}}
return true};LooseParser.prototype.extend=function extend(name,f){this[name]=f(this[name]);};LooseParser.prototype.parse=function parse(){this.next();return this.parseTopLevel()};LooseParser.extend=function extend(){var plugins=[],len=arguments.length;while(len--)plugins[len]=arguments[len];var cls=this;for(var i=0;i<plugins.length;i++){cls=plugins[i](cls);}
return cls};LooseParser.parse=function parse(input,options){return new this(input,options).parse()};LooseParser.BaseParser=acorn.Parser;var lp=LooseParser.prototype;function isSpace(ch){return(ch<14&&ch>8)||ch===32||ch===160||acorn.isNewLine(ch)}
lp.next=function(){this.last=this.tok;if(this.ahead.length)
{this.tok=this.ahead.shift();}
else
{this.tok=this.readToken();}
if(this.tok.start>=this.nextLineStart){while(this.tok.start>=this.nextLineStart){this.curLineStart=this.nextLineStart;this.nextLineStart=this.lineEnd(this.curLineStart)+1;}
this.curIndent=this.indentationAfter(this.curLineStart);}};lp.readToken=function(){for(;;){try{this.toks.next();if(this.toks.type===acorn.tokTypes.dot&&this.input.substr(this.toks.end,1)==="."&&this.options.ecmaVersion>=6){this.toks.end++;this.toks.type=acorn.tokTypes.ellipsis;}
return new acorn.Token(this.toks)}catch(e){if(!(e instanceof SyntaxError)){throw e}
var msg=e.message,pos=e.raisedAt,replace=true;if(/unterminated/i.test(msg)){pos=this.lineEnd(e.pos+1);if(/string/.test(msg)){replace={start:e.pos,end:pos,type:acorn.tokTypes.string,value:this.input.slice(e.pos+1,pos)};}else if(/regular expr/i.test(msg)){var re=this.input.slice(e.pos,pos);try{re=new RegExp(re);}catch(e){}
replace={start:e.pos,end:pos,type:acorn.tokTypes.regexp,value:re};}else if(/template/.test(msg)){replace={start:e.pos,end:pos,type:acorn.tokTypes.template,value:this.input.slice(e.pos,pos)};}else{replace=false;}}else if(/invalid (unicode|regexp|number)|expecting unicode|octal literal|is reserved|directly after number|expected number in radix/i.test(msg)){while(pos<this.input.length&&!isSpace(this.input.charCodeAt(pos))){++pos;}}else if(/character escape|expected hexadecimal/i.test(msg)){while(pos<this.input.length){var ch=this.input.charCodeAt(pos++);if(ch===34||ch===39||acorn.isNewLine(ch)){break}}}else if(/unexpected character/i.test(msg)){pos++;replace=false;}else if(/regular expression/i.test(msg)){replace=true;}else{throw e}
this.resetTo(pos);if(replace===true){replace={start:pos,end:pos,type:acorn.tokTypes.name,value:"✖"};}
if(replace){if(this.options.locations)
{replace.loc=new acorn.SourceLocation(this.toks,acorn.getLineInfo(this.input,replace.start),acorn.getLineInfo(this.input,replace.end));}
return replace}}}};lp.resetTo=function(pos){this.toks.pos=pos;var ch=this.input.charAt(pos-1);this.toks.exprAllowed=!ch||/[[{(,;:?/*=+\-~!|&%^<>]/.test(ch)||/[enwfd]/.test(ch)&&/\b(case|else|return|throw|new|in|(instance|type)?of|delete|void)$/.test(this.input.slice(pos-10,pos));if(this.options.locations){this.toks.curLine=1;this.toks.lineStart=acorn.lineBreakG.lastIndex=0;var match;while((match=acorn.lineBreakG.exec(this.input))&&match.index<pos){++this.toks.curLine;this.toks.lineStart=match.index+match[0].length;}}};lp.lookAhead=function(n){while(n>this.ahead.length)
{this.ahead.push(this.readToken());}
return this.ahead[n-1]};function isDummy(node){return node.name==="✖"}
var lp$1=LooseParser.prototype;lp$1.parseTopLevel=function(){var node=this.startNodeAt(this.options.locations?[0,acorn.getLineInfo(this.input,0)]:0);node.body=[];while(this.tok.type!==acorn.tokTypes.eof){node.body.push(this.parseStatement());}
this.toks.adaptDirectivePrologue(node.body);this.last=this.tok;node.sourceType=this.options.sourceType;return this.finishNode(node,"Program")};lp$1.parseStatement=function(){var starttype=this.tok.type,node=this.startNode(),kind;if(this.toks.isLet()){starttype=acorn.tokTypes._var;kind="let";}
switch(starttype){case acorn.tokTypes._break:case acorn.tokTypes._continue:this.next();var isBreak=starttype===acorn.tokTypes._break;if(this.semicolon()||this.canInsertSemicolon()){node.label=null;}else{node.label=this.tok.type===acorn.tokTypes.name?this.parseIdent():null;this.semicolon();}
return this.finishNode(node,isBreak?"BreakStatement":"ContinueStatement")
case acorn.tokTypes._debugger:this.next();this.semicolon();return this.finishNode(node,"DebuggerStatement")
case acorn.tokTypes._do:this.next();node.body=this.parseStatement();node.test=this.eat(acorn.tokTypes._while)?this.parseParenExpression():this.dummyIdent();this.semicolon();return this.finishNode(node,"DoWhileStatement")
case acorn.tokTypes._for:this.next();var isAwait=this.options.ecmaVersion>=9&&this.inAsync&&this.eatContextual("await");this.pushCx();this.expect(acorn.tokTypes.parenL);if(this.tok.type===acorn.tokTypes.semi){return this.parseFor(node,null)}
var isLet=this.toks.isLet();if(isLet||this.tok.type===acorn.tokTypes._var||this.tok.type===acorn.tokTypes._const){var init$1=this.parseVar(this.startNode(),true,isLet?"let":this.tok.value);if(init$1.declarations.length===1&&(this.tok.type===acorn.tokTypes._in||this.isContextual("of"))){if(this.options.ecmaVersion>=9&&this.tok.type!==acorn.tokTypes._in){node.await=isAwait;}
return this.parseForIn(node,init$1)}
return this.parseFor(node,init$1)}
var init=this.parseExpression(true);if(this.tok.type===acorn.tokTypes._in||this.isContextual("of")){if(this.options.ecmaVersion>=9&&this.tok.type!==acorn.tokTypes._in){node.await=isAwait;}
return this.parseForIn(node,this.toAssignable(init))}
return this.parseFor(node,init)
case acorn.tokTypes._function:this.next();return this.parseFunction(node,true)
case acorn.tokTypes._if:this.next();node.test=this.parseParenExpression();node.consequent=this.parseStatement();node.alternate=this.eat(acorn.tokTypes._else)?this.parseStatement():null;return this.finishNode(node,"IfStatement")
case acorn.tokTypes._return:this.next();if(this.eat(acorn.tokTypes.semi)||this.canInsertSemicolon()){node.argument=null;}
else{node.argument=this.parseExpression();this.semicolon();}
return this.finishNode(node,"ReturnStatement")
case acorn.tokTypes._switch:var blockIndent=this.curIndent,line=this.curLineStart;this.next();node.discriminant=this.parseParenExpression();node.cases=[];this.pushCx();this.expect(acorn.tokTypes.braceL);var cur;while(!this.closes(acorn.tokTypes.braceR,blockIndent,line,true)){if(this.tok.type===acorn.tokTypes._case||this.tok.type===acorn.tokTypes._default){var isCase=this.tok.type===acorn.tokTypes._case;if(cur){this.finishNode(cur,"SwitchCase");}
node.cases.push(cur=this.startNode());cur.consequent=[];this.next();if(isCase){cur.test=this.parseExpression();}
else{cur.test=null;}
this.expect(acorn.tokTypes.colon);}else{if(!cur){node.cases.push(cur=this.startNode());cur.consequent=[];cur.test=null;}
cur.consequent.push(this.parseStatement());}}
if(cur){this.finishNode(cur,"SwitchCase");}
this.popCx();this.eat(acorn.tokTypes.braceR);return this.finishNode(node,"SwitchStatement")
case acorn.tokTypes._throw:this.next();node.argument=this.parseExpression();this.semicolon();return this.finishNode(node,"ThrowStatement")
case acorn.tokTypes._try:this.next();node.block=this.parseBlock();node.handler=null;if(this.tok.type===acorn.tokTypes._catch){var clause=this.startNode();this.next();if(this.eat(acorn.tokTypes.parenL)){clause.param=this.toAssignable(this.parseExprAtom(),true);this.expect(acorn.tokTypes.parenR);}else{clause.param=null;}
clause.body=this.parseBlock();node.handler=this.finishNode(clause,"CatchClause");}
node.finalizer=this.eat(acorn.tokTypes._finally)?this.parseBlock():null;if(!node.handler&&!node.finalizer){return node.block}
return this.finishNode(node,"TryStatement")
case acorn.tokTypes._var:case acorn.tokTypes._const:return this.parseVar(node,false,kind||this.tok.value)
case acorn.tokTypes._while:this.next();node.test=this.parseParenExpression();node.body=this.parseStatement();return this.finishNode(node,"WhileStatement")
case acorn.tokTypes._with:this.next();node.object=this.parseParenExpression();node.body=this.parseStatement();return this.finishNode(node,"WithStatement")
case acorn.tokTypes.braceL:return this.parseBlock()
case acorn.tokTypes.semi:this.next();return this.finishNode(node,"EmptyStatement")
case acorn.tokTypes._class:return this.parseClass(true)
case acorn.tokTypes._import:if(this.options.ecmaVersion>10&&this.lookAhead(1).type===acorn.tokTypes.parenL){node.expression=this.parseExpression();this.semicolon();return this.finishNode(node,"ExpressionStatement")}
return this.parseImport()
case acorn.tokTypes._export:return this.parseExport()
default:if(this.toks.isAsyncFunction()){this.next();this.next();return this.parseFunction(node,true,true)}
var expr=this.parseExpression();if(isDummy(expr)){this.next();if(this.tok.type===acorn.tokTypes.eof){return this.finishNode(node,"EmptyStatement")}
return this.parseStatement()}else if(starttype===acorn.tokTypes.name&&expr.type==="Identifier"&&this.eat(acorn.tokTypes.colon)){node.body=this.parseStatement();node.label=expr;return this.finishNode(node,"LabeledStatement")}else{node.expression=expr;this.semicolon();return this.finishNode(node,"ExpressionStatement")}}};lp$1.parseBlock=function(){var node=this.startNode();this.pushCx();this.expect(acorn.tokTypes.braceL);var blockIndent=this.curIndent,line=this.curLineStart;node.body=[];while(!this.closes(acorn.tokTypes.braceR,blockIndent,line,true))
{node.body.push(this.parseStatement());}
this.popCx();this.eat(acorn.tokTypes.braceR);return this.finishNode(node,"BlockStatement")};lp$1.parseFor=function(node,init){node.init=init;node.test=node.update=null;if(this.eat(acorn.tokTypes.semi)&&this.tok.type!==acorn.tokTypes.semi){node.test=this.parseExpression();}
if(this.eat(acorn.tokTypes.semi)&&this.tok.type!==acorn.tokTypes.parenR){node.update=this.parseExpression();}
this.popCx();this.expect(acorn.tokTypes.parenR);node.body=this.parseStatement();return this.finishNode(node,"ForStatement")};lp$1.parseForIn=function(node,init){var type=this.tok.type===acorn.tokTypes._in?"ForInStatement":"ForOfStatement";this.next();node.left=init;node.right=this.parseExpression();this.popCx();this.expect(acorn.tokTypes.parenR);node.body=this.parseStatement();return this.finishNode(node,type)};lp$1.parseVar=function(node,noIn,kind){node.kind=kind;this.next();node.declarations=[];do{var decl=this.startNode();decl.id=this.options.ecmaVersion>=6?this.toAssignable(this.parseExprAtom(),true):this.parseIdent();decl.init=this.eat(acorn.tokTypes.eq)?this.parseMaybeAssign(noIn):null;node.declarations.push(this.finishNode(decl,"VariableDeclarator"));}while(this.eat(acorn.tokTypes.comma))
if(!node.declarations.length){var decl$1=this.startNode();decl$1.id=this.dummyIdent();node.declarations.push(this.finishNode(decl$1,"VariableDeclarator"));}
if(!noIn){this.semicolon();}
return this.finishNode(node,"VariableDeclaration")};lp$1.parseClass=function(isStatement){var node=this.startNode();this.next();if(this.tok.type===acorn.tokTypes.name){node.id=this.parseIdent();}
else if(isStatement===true){node.id=this.dummyIdent();}
else{node.id=null;}
node.superClass=this.eat(acorn.tokTypes._extends)?this.parseExpression():null;node.body=this.startNode();node.body.body=[];this.pushCx();var indent=this.curIndent+1,line=this.curLineStart;this.eat(acorn.tokTypes.braceL);if(this.curIndent+1<indent){indent=this.curIndent;line=this.curLineStart;}
while(!this.closes(acorn.tokTypes.braceR,indent,line)){if(this.semicolon()){continue}
var method=this.startNode(),isGenerator=(void 0),isAsync=(void 0);if(this.options.ecmaVersion>=6){method.static=false;isGenerator=this.eat(acorn.tokTypes.star);}
this.parsePropertyName(method);if(isDummy(method.key)){if(isDummy(this.parseMaybeAssign())){this.next();}this.eat(acorn.tokTypes.comma);continue}
if(method.key.type==="Identifier"&&!method.computed&&method.key.name==="static"&&(this.tok.type!==acorn.tokTypes.parenL&&this.tok.type!==acorn.tokTypes.braceL)){method.static=true;isGenerator=this.eat(acorn.tokTypes.star);this.parsePropertyName(method);}else{method.static=false;}
if(!method.computed&&method.key.type==="Identifier"&&method.key.name==="async"&&this.tok.type!==acorn.tokTypes.parenL&&!this.canInsertSemicolon()){isAsync=true;isGenerator=this.options.ecmaVersion>=9&&this.eat(acorn.tokTypes.star);this.parsePropertyName(method);}else{isAsync=false;}
if(this.options.ecmaVersion>=5&&method.key.type==="Identifier"&&!method.computed&&(method.key.name==="get"||method.key.name==="set")&&this.tok.type!==acorn.tokTypes.parenL&&this.tok.type!==acorn.tokTypes.braceL){method.kind=method.key.name;this.parsePropertyName(method);method.value=this.parseMethod(false);}else{if(!method.computed&&!method.static&&!isGenerator&&!isAsync&&(method.key.type==="Identifier"&&method.key.name==="constructor"||method.key.type==="Literal"&&method.key.value==="constructor")){method.kind="constructor";}else{method.kind="method";}
method.value=this.parseMethod(isGenerator,isAsync);}
node.body.body.push(this.finishNode(method,"MethodDefinition"));}
this.popCx();if(!this.eat(acorn.tokTypes.braceR)){this.last.end=this.tok.start;if(this.options.locations){this.last.loc.end=this.tok.loc.start;}}
this.semicolon();this.finishNode(node.body,"ClassBody");return this.finishNode(node,isStatement?"ClassDeclaration":"ClassExpression")};lp$1.parseFunction=function(node,isStatement,isAsync){var oldInAsync=this.inAsync,oldInFunction=this.inFunction;this.initFunction(node);if(this.options.ecmaVersion>=6){node.generator=this.eat(acorn.tokTypes.star);}
if(this.options.ecmaVersion>=8){node.async=!!isAsync;}
if(this.tok.type===acorn.tokTypes.name){node.id=this.parseIdent();}
else if(isStatement===true){node.id=this.dummyIdent();}
this.inAsync=node.async;this.inFunction=true;node.params=this.parseFunctionParams();node.body=this.parseBlock();this.toks.adaptDirectivePrologue(node.body.body);this.inAsync=oldInAsync;this.inFunction=oldInFunction;return this.finishNode(node,isStatement?"FunctionDeclaration":"FunctionExpression")};lp$1.parseExport=function(){var node=this.startNode();this.next();if(this.eat(acorn.tokTypes.star)){node.source=this.eatContextual("from")?this.parseExprAtom():this.dummyString();return this.finishNode(node,"ExportAllDeclaration")}
if(this.eat(acorn.tokTypes._default)){var isAsync;if(this.tok.type===acorn.tokTypes._function||(isAsync=this.toks.isAsyncFunction())){var fNode=this.startNode();this.next();if(isAsync){this.next();}
node.declaration=this.parseFunction(fNode,"nullableID",isAsync);}else if(this.tok.type===acorn.tokTypes._class){node.declaration=this.parseClass("nullableID");}else{node.declaration=this.parseMaybeAssign();this.semicolon();}
return this.finishNode(node,"ExportDefaultDeclaration")}
if(this.tok.type.keyword||this.toks.isLet()||this.toks.isAsyncFunction()){node.declaration=this.parseStatement();node.specifiers=[];node.source=null;}else{node.declaration=null;node.specifiers=this.parseExportSpecifierList();node.source=this.eatContextual("from")?this.parseExprAtom():null;this.semicolon();}
return this.finishNode(node,"ExportNamedDeclaration")};lp$1.parseImport=function(){var node=this.startNode();this.next();if(this.tok.type===acorn.tokTypes.string){node.specifiers=[];node.source=this.parseExprAtom();}else{var elt;if(this.tok.type===acorn.tokTypes.name&&this.tok.value!=="from"){elt=this.startNode();elt.local=this.parseIdent();this.finishNode(elt,"ImportDefaultSpecifier");this.eat(acorn.tokTypes.comma);}
node.specifiers=this.parseImportSpecifiers();node.source=this.eatContextual("from")&&this.tok.type===acorn.tokTypes.string?this.parseExprAtom():this.dummyString();if(elt){node.specifiers.unshift(elt);}}
this.semicolon();return this.finishNode(node,"ImportDeclaration")};lp$1.parseImportSpecifiers=function(){var elts=[];if(this.tok.type===acorn.tokTypes.star){var elt=this.startNode();this.next();elt.local=this.eatContextual("as")?this.parseIdent():this.dummyIdent();elts.push(this.finishNode(elt,"ImportNamespaceSpecifier"));}else{var indent=this.curIndent,line=this.curLineStart,continuedLine=this.nextLineStart;this.pushCx();this.eat(acorn.tokTypes.braceL);if(this.curLineStart>continuedLine){continuedLine=this.curLineStart;}
while(!this.closes(acorn.tokTypes.braceR,indent+(this.curLineStart<=continuedLine?1:0),line)){var elt$1=this.startNode();if(this.eat(acorn.tokTypes.star)){elt$1.local=this.eatContextual("as")?this.parseIdent():this.dummyIdent();this.finishNode(elt$1,"ImportNamespaceSpecifier");}else{if(this.isContextual("from")){break}
elt$1.imported=this.parseIdent();if(isDummy(elt$1.imported)){break}
elt$1.local=this.eatContextual("as")?this.parseIdent():elt$1.imported;this.finishNode(elt$1,"ImportSpecifier");}
elts.push(elt$1);this.eat(acorn.tokTypes.comma);}
this.eat(acorn.tokTypes.braceR);this.popCx();}
return elts};lp$1.parseExportSpecifierList=function(){var elts=[];var indent=this.curIndent,line=this.curLineStart,continuedLine=this.nextLineStart;this.pushCx();this.eat(acorn.tokTypes.braceL);if(this.curLineStart>continuedLine){continuedLine=this.curLineStart;}
while(!this.closes(acorn.tokTypes.braceR,indent+(this.curLineStart<=continuedLine?1:0),line)){if(this.isContextual("from")){break}
var elt=this.startNode();elt.local=this.parseIdent();if(isDummy(elt.local)){break}
elt.exported=this.eatContextual("as")?this.parseIdent():elt.local;this.finishNode(elt,"ExportSpecifier");elts.push(elt);this.eat(acorn.tokTypes.comma);}
this.eat(acorn.tokTypes.braceR);this.popCx();return elts};var lp$2=LooseParser.prototype;lp$2.checkLVal=function(expr){if(!expr){return expr}
switch(expr.type){case"Identifier":case"MemberExpression":return expr
case"ParenthesizedExpression":expr.expression=this.checkLVal(expr.expression);return expr
default:return this.dummyIdent()}};lp$2.parseExpression=function(noIn){var start=this.storeCurrentPos();var expr=this.parseMaybeAssign(noIn);if(this.tok.type===acorn.tokTypes.comma){var node=this.startNodeAt(start);node.expressions=[expr];while(this.eat(acorn.tokTypes.comma)){node.expressions.push(this.parseMaybeAssign(noIn));}
return this.finishNode(node,"SequenceExpression")}
return expr};lp$2.parseParenExpression=function(){this.pushCx();this.expect(acorn.tokTypes.parenL);var val=this.parseExpression();this.popCx();this.expect(acorn.tokTypes.parenR);return val};lp$2.parseMaybeAssign=function(noIn){if(this.toks.isContextual("yield")){var node=this.startNode();this.next();if(this.semicolon()||this.canInsertSemicolon()||(this.tok.type!==acorn.tokTypes.star&&!this.tok.type.startsExpr)){node.delegate=false;node.argument=null;}else{node.delegate=this.eat(acorn.tokTypes.star);node.argument=this.parseMaybeAssign();}
return this.finishNode(node,"YieldExpression")}
var start=this.storeCurrentPos();var left=this.parseMaybeConditional(noIn);if(this.tok.type.isAssign){var node$1=this.startNodeAt(start);node$1.operator=this.tok.value;node$1.left=this.tok.type===acorn.tokTypes.eq?this.toAssignable(left):this.checkLVal(left);this.next();node$1.right=this.parseMaybeAssign(noIn);return this.finishNode(node$1,"AssignmentExpression")}
return left};lp$2.parseMaybeConditional=function(noIn){var start=this.storeCurrentPos();var expr=this.parseExprOps(noIn);if(this.eat(acorn.tokTypes.question)){var node=this.startNodeAt(start);node.test=expr;node.consequent=this.parseMaybeAssign();node.alternate=this.expect(acorn.tokTypes.colon)?this.parseMaybeAssign(noIn):this.dummyIdent();return this.finishNode(node,"ConditionalExpression")}
return expr};lp$2.parseExprOps=function(noIn){var start=this.storeCurrentPos();var indent=this.curIndent,line=this.curLineStart;return this.parseExprOp(this.parseMaybeUnary(false),start,-1,noIn,indent,line)};lp$2.parseExprOp=function(left,start,minPrec,noIn,indent,line){if(this.curLineStart!==line&&this.curIndent<indent&&this.tokenStartsLine()){return left}
var prec=this.tok.type.binop;if(prec!=null&&(!noIn||this.tok.type!==acorn.tokTypes._in)){if(prec>minPrec){var node=this.startNodeAt(start);node.left=left;node.operator=this.tok.value;this.next();if(this.curLineStart!==line&&this.curIndent<indent&&this.tokenStartsLine()){node.right=this.dummyIdent();}else{var rightStart=this.storeCurrentPos();node.right=this.parseExprOp(this.parseMaybeUnary(false),rightStart,prec,noIn,indent,line);}
this.finishNode(node,/&&|\|\|/.test(node.operator)?"LogicalExpression":"BinaryExpression");return this.parseExprOp(node,start,minPrec,noIn,indent,line)}}
return left};lp$2.parseMaybeUnary=function(sawUnary){var start=this.storeCurrentPos(),expr;if(this.options.ecmaVersion>=8&&this.toks.isContextual("await")&&(this.inAsync||(!this.inFunction&&this.options.allowAwaitOutsideFunction))){expr=this.parseAwait();sawUnary=true;}else if(this.tok.type.prefix){var node=this.startNode(),update=this.tok.type===acorn.tokTypes.incDec;if(!update){sawUnary=true;}
node.operator=this.tok.value;node.prefix=true;this.next();node.argument=this.parseMaybeUnary(true);if(update){node.argument=this.checkLVal(node.argument);}
expr=this.finishNode(node,update?"UpdateExpression":"UnaryExpression");}else if(this.tok.type===acorn.tokTypes.ellipsis){var node$1=this.startNode();this.next();node$1.argument=this.parseMaybeUnary(sawUnary);expr=this.finishNode(node$1,"SpreadElement");}else{expr=this.parseExprSubscripts();while(this.tok.type.postfix&&!this.canInsertSemicolon()){var node$2=this.startNodeAt(start);node$2.operator=this.tok.value;node$2.prefix=false;node$2.argument=this.checkLVal(expr);this.next();expr=this.finishNode(node$2,"UpdateExpression");}}
if(!sawUnary&&this.eat(acorn.tokTypes.starstar)){var node$3=this.startNodeAt(start);node$3.operator="**";node$3.left=expr;node$3.right=this.parseMaybeUnary(false);return this.finishNode(node$3,"BinaryExpression")}
return expr};lp$2.parseExprSubscripts=function(){var start=this.storeCurrentPos();return this.parseSubscripts(this.parseExprAtom(),start,false,this.curIndent,this.curLineStart)};lp$2.parseSubscripts=function(base,start,noCalls,startIndent,line){for(;;){if(this.curLineStart!==line&&this.curIndent<=startIndent&&this.tokenStartsLine()){if(this.tok.type===acorn.tokTypes.dot&&this.curIndent===startIndent)
{--startIndent;}
else
{return base}}
var maybeAsyncArrow=base.type==="Identifier"&&base.name==="async"&&!this.canInsertSemicolon();if(this.eat(acorn.tokTypes.dot)){var node=this.startNodeAt(start);node.object=base;if(this.curLineStart!==line&&this.curIndent<=startIndent&&this.tokenStartsLine())
{node.property=this.dummyIdent();}
else
{node.property=this.parsePropertyAccessor()||this.dummyIdent();}
node.computed=false;base=this.finishNode(node,"MemberExpression");}else if(this.tok.type===acorn.tokTypes.bracketL){this.pushCx();this.next();var node$1=this.startNodeAt(start);node$1.object=base;node$1.property=this.parseExpression();node$1.computed=true;this.popCx();this.expect(acorn.tokTypes.bracketR);base=this.finishNode(node$1,"MemberExpression");}else if(!noCalls&&this.tok.type===acorn.tokTypes.parenL){var exprList=this.parseExprList(acorn.tokTypes.parenR);if(maybeAsyncArrow&&this.eat(acorn.tokTypes.arrow))
{return this.parseArrowExpression(this.startNodeAt(start),exprList,true)}
var node$2=this.startNodeAt(start);node$2.callee=base;node$2.arguments=exprList;base=this.finishNode(node$2,"CallExpression");}else if(this.tok.type===acorn.tokTypes.backQuote){var node$3=this.startNodeAt(start);node$3.tag=base;node$3.quasi=this.parseTemplate();base=this.finishNode(node$3,"TaggedTemplateExpression");}else{return base}}};lp$2.parseExprAtom=function(){var node;switch(this.tok.type){case acorn.tokTypes._this:case acorn.tokTypes._super:var type=this.tok.type===acorn.tokTypes._this?"ThisExpression":"Super";node=this.startNode();this.next();return this.finishNode(node,type)
case acorn.tokTypes.name:var start=this.storeCurrentPos();var id=this.parseIdent();var isAsync=false;if(id.name==="async"&&!this.canInsertSemicolon()){if(this.eat(acorn.tokTypes._function))
{return this.parseFunction(this.startNodeAt(start),false,true)}
if(this.tok.type===acorn.tokTypes.name){id=this.parseIdent();isAsync=true;}}
return this.eat(acorn.tokTypes.arrow)?this.parseArrowExpression(this.startNodeAt(start),[id],isAsync):id
case acorn.tokTypes.regexp:node=this.startNode();var val=this.tok.value;node.regex={pattern:val.pattern,flags:val.flags};node.value=val.value;node.raw=this.input.slice(this.tok.start,this.tok.end);this.next();return this.finishNode(node,"Literal")
case acorn.tokTypes.num:case acorn.tokTypes.string:node=this.startNode();node.value=this.tok.value;node.raw=this.input.slice(this.tok.start,this.tok.end);if(this.tok.type===acorn.tokTypes.num&&node.raw.charCodeAt(node.raw.length-1)===110){node.bigint=node.raw.slice(0,-1);}
this.next();return this.finishNode(node,"Literal")
case acorn.tokTypes._null:case acorn.tokTypes._true:case acorn.tokTypes._false:node=this.startNode();node.value=this.tok.type===acorn.tokTypes._null?null:this.tok.type===acorn.tokTypes._true;node.raw=this.tok.type.keyword;this.next();return this.finishNode(node,"Literal")
case acorn.tokTypes.parenL:var parenStart=this.storeCurrentPos();this.next();var inner=this.parseExpression();this.expect(acorn.tokTypes.parenR);if(this.eat(acorn.tokTypes.arrow)){var params=inner.expressions||[inner];if(params.length&&isDummy(params[params.length-1]))
{params.pop();}
return this.parseArrowExpression(this.startNodeAt(parenStart),params)}
if(this.options.preserveParens){var par=this.startNodeAt(parenStart);par.expression=inner;inner=this.finishNode(par,"ParenthesizedExpression");}
return inner
case acorn.tokTypes.bracketL:node=this.startNode();node.elements=this.parseExprList(acorn.tokTypes.bracketR,true);return this.finishNode(node,"ArrayExpression")
case acorn.tokTypes.braceL:return this.parseObj()
case acorn.tokTypes._class:return this.parseClass(false)
case acorn.tokTypes._function:node=this.startNode();this.next();return this.parseFunction(node,false)
case acorn.tokTypes._new:return this.parseNew()
case acorn.tokTypes.backQuote:return this.parseTemplate()
case acorn.tokTypes._import:if(this.options.ecmaVersion>=11){return this.parseExprImport()}else{return this.dummyIdent()}
default:return this.dummyIdent()}};lp$2.parseExprImport=function(){var node=this.startNode();this.next();switch(this.tok.type){case acorn.tokTypes.parenL:return this.parseDynamicImport(node)
default:node.name="import";return this.finishNode(node,"Identifier")}};lp$2.parseDynamicImport=function(node){node.source=this.parseExprList(acorn.tokTypes.parenR)[0]||this.dummyString();return this.finishNode(node,"ImportExpression")};lp$2.parseNew=function(){var node=this.startNode(),startIndent=this.curIndent,line=this.curLineStart;var meta=this.parseIdent(true);if(this.options.ecmaVersion>=6&&this.eat(acorn.tokTypes.dot)){node.meta=meta;node.property=this.parseIdent(true);return this.finishNode(node,"MetaProperty")}
var start=this.storeCurrentPos();node.callee=this.parseSubscripts(this.parseExprAtom(),start,true,startIndent,line);if(this.tok.type===acorn.tokTypes.parenL){node.arguments=this.parseExprList(acorn.tokTypes.parenR);}else{node.arguments=[];}
return this.finishNode(node,"NewExpression")};lp$2.parseTemplateElement=function(){var elem=this.startNode();if(this.tok.type===acorn.tokTypes.invalidTemplate){elem.value={raw:this.tok.value,cooked:null};}else{elem.value={raw:this.input.slice(this.tok.start,this.tok.end).replace(/\r\n?/g,"\n"),cooked:this.tok.value};}
this.next();elem.tail=this.tok.type===acorn.tokTypes.backQuote;return this.finishNode(elem,"TemplateElement")};lp$2.parseTemplate=function(){var node=this.startNode();this.next();node.expressions=[];var curElt=this.parseTemplateElement();node.quasis=[curElt];while(!curElt.tail){this.next();node.expressions.push(this.parseExpression());if(this.expect(acorn.tokTypes.braceR)){curElt=this.parseTemplateElement();}else{curElt=this.startNode();curElt.value={cooked:"",raw:""};curElt.tail=true;this.finishNode(curElt,"TemplateElement");}
node.quasis.push(curElt);}
this.expect(acorn.tokTypes.backQuote);return this.finishNode(node,"TemplateLiteral")};lp$2.parseObj=function(){var node=this.startNode();node.properties=[];this.pushCx();var indent=this.curIndent+1,line=this.curLineStart;this.eat(acorn.tokTypes.braceL);if(this.curIndent+1<indent){indent=this.curIndent;line=this.curLineStart;}
while(!this.closes(acorn.tokTypes.braceR,indent,line)){var prop=this.startNode(),isGenerator=(void 0),isAsync=(void 0),start=(void 0);if(this.options.ecmaVersion>=9&&this.eat(acorn.tokTypes.ellipsis)){prop.argument=this.parseMaybeAssign();node.properties.push(this.finishNode(prop,"SpreadElement"));this.eat(acorn.tokTypes.comma);continue}
if(this.options.ecmaVersion>=6){start=this.storeCurrentPos();prop.method=false;prop.shorthand=false;isGenerator=this.eat(acorn.tokTypes.star);}
this.parsePropertyName(prop);if(this.toks.isAsyncProp(prop)){isAsync=true;isGenerator=this.options.ecmaVersion>=9&&this.eat(acorn.tokTypes.star);this.parsePropertyName(prop);}else{isAsync=false;}
if(isDummy(prop.key)){if(isDummy(this.parseMaybeAssign())){this.next();}this.eat(acorn.tokTypes.comma);continue}
if(this.eat(acorn.tokTypes.colon)){prop.kind="init";prop.value=this.parseMaybeAssign();}else if(this.options.ecmaVersion>=6&&(this.tok.type===acorn.tokTypes.parenL||this.tok.type===acorn.tokTypes.braceL)){prop.kind="init";prop.method=true;prop.value=this.parseMethod(isGenerator,isAsync);}else if(this.options.ecmaVersion>=5&&prop.key.type==="Identifier"&&!prop.computed&&(prop.key.name==="get"||prop.key.name==="set")&&(this.tok.type!==acorn.tokTypes.comma&&this.tok.type!==acorn.tokTypes.braceR&&this.tok.type!==acorn.tokTypes.eq)){prop.kind=prop.key.name;this.parsePropertyName(prop);prop.value=this.parseMethod(false);}else{prop.kind="init";if(this.options.ecmaVersion>=6){if(this.eat(acorn.tokTypes.eq)){var assign=this.startNodeAt(start);assign.operator="=";assign.left=prop.key;assign.right=this.parseMaybeAssign();prop.value=this.finishNode(assign,"AssignmentExpression");}else{prop.value=prop.key;}}else{prop.value=this.dummyIdent();}
prop.shorthand=true;}
node.properties.push(this.finishNode(prop,"Property"));this.eat(acorn.tokTypes.comma);}
this.popCx();if(!this.eat(acorn.tokTypes.braceR)){this.last.end=this.tok.start;if(this.options.locations){this.last.loc.end=this.tok.loc.start;}}
return this.finishNode(node,"ObjectExpression")};lp$2.parsePropertyName=function(prop){if(this.options.ecmaVersion>=6){if(this.eat(acorn.tokTypes.bracketL)){prop.computed=true;prop.key=this.parseExpression();this.expect(acorn.tokTypes.bracketR);return}else{prop.computed=false;}}
var key=(this.tok.type===acorn.tokTypes.num||this.tok.type===acorn.tokTypes.string)?this.parseExprAtom():this.parseIdent();prop.key=key||this.dummyIdent();};lp$2.parsePropertyAccessor=function(){if(this.tok.type===acorn.tokTypes.name||this.tok.type.keyword){return this.parseIdent()}};lp$2.parseIdent=function(){var name=this.tok.type===acorn.tokTypes.name?this.tok.value:this.tok.type.keyword;if(!name){return this.dummyIdent()}
var node=this.startNode();this.next();node.name=name;return this.finishNode(node,"Identifier")};lp$2.initFunction=function(node){node.id=null;node.params=[];if(this.options.ecmaVersion>=6){node.generator=false;node.expression=false;}
if(this.options.ecmaVersion>=8)
{node.async=false;}};lp$2.toAssignable=function(node,binding){if(!node||node.type==="Identifier"||(node.type==="MemberExpression"&&!binding));else if(node.type==="ParenthesizedExpression"){this.toAssignable(node.expression,binding);}else if(this.options.ecmaVersion<6){return this.dummyIdent()}else if(node.type==="ObjectExpression"){node.type="ObjectPattern";for(var i=0,list=node.properties;i<list.length;i+=1)
{var prop=list[i];this.toAssignable(prop,binding);}}else if(node.type==="ArrayExpression"){node.type="ArrayPattern";this.toAssignableList(node.elements,binding);}else if(node.type==="Property"){this.toAssignable(node.value,binding);}else if(node.type==="SpreadElement"){node.type="RestElement";this.toAssignable(node.argument,binding);}else if(node.type==="AssignmentExpression"){node.type="AssignmentPattern";delete node.operator;}else{return this.dummyIdent()}
return node};lp$2.toAssignableList=function(exprList,binding){for(var i=0,list=exprList;i<list.length;i+=1)
{var expr=list[i];this.toAssignable(expr,binding);}
return exprList};lp$2.parseFunctionParams=function(params){params=this.parseExprList(acorn.tokTypes.parenR);return this.toAssignableList(params,true)};lp$2.parseMethod=function(isGenerator,isAsync){var node=this.startNode(),oldInAsync=this.inAsync,oldInFunction=this.inFunction;this.initFunction(node);if(this.options.ecmaVersion>=6)
{node.generator=!!isGenerator;}
if(this.options.ecmaVersion>=8)
{node.async=!!isAsync;}
this.inAsync=node.async;this.inFunction=true;node.params=this.parseFunctionParams();node.body=this.parseBlock();this.toks.adaptDirectivePrologue(node.body.body);this.inAsync=oldInAsync;this.inFunction=oldInFunction;return this.finishNode(node,"FunctionExpression")};lp$2.parseArrowExpression=function(node,params,isAsync){var oldInAsync=this.inAsync,oldInFunction=this.inFunction;this.initFunction(node);if(this.options.ecmaVersion>=8)
{node.async=!!isAsync;}
this.inAsync=node.async;this.inFunction=true;node.params=this.toAssignableList(params,true);node.expression=this.tok.type!==acorn.tokTypes.braceL;if(node.expression){node.body=this.parseMaybeAssign();}else{node.body=this.parseBlock();this.toks.adaptDirectivePrologue(node.body.body);}
this.inAsync=oldInAsync;this.inFunction=oldInFunction;return this.finishNode(node,"ArrowFunctionExpression")};lp$2.parseExprList=function(close,allowEmpty){this.pushCx();var indent=this.curIndent,line=this.curLineStart,elts=[];this.next();while(!this.closes(close,indent+1,line)){if(this.eat(acorn.tokTypes.comma)){elts.push(allowEmpty?null:this.dummyIdent());continue}
var elt=this.parseMaybeAssign();if(isDummy(elt)){if(this.closes(close,indent,line)){break}
this.next();}else{elts.push(elt);}
this.eat(acorn.tokTypes.comma);}
this.popCx();if(!this.eat(close)){this.last.end=this.tok.start;if(this.options.locations){this.last.loc.end=this.tok.loc.start;}}
return elts};lp$2.parseAwait=function(){var node=this.startNode();this.next();node.argument=this.parseMaybeUnary();return this.finishNode(node,"AwaitExpression")};acorn.defaultOptions.tabSize=4;function parse(input,options){return LooseParser.parse(input,options)}
exports.LooseParser=LooseParser;exports.parse=parse;Object.defineProperty(exports,'__esModule',{value:true});}));;FormatterWorker.CSSFormatter=class{constructor(builder){this._builder=builder;}
format(text,lineEndings,fromOffset,toOffset){this._lineEndings=lineEndings;this._fromOffset=fromOffset;this._toOffset=toOffset;this._lastLine=-1;this._state={};const tokenize=FormatterWorker.createTokenizer('text/css');const oldEnforce=this._builder.setEnforceSpaceBetweenWords(false);tokenize(text.substring(this._fromOffset,this._toOffset),this._tokenCallback.bind(this));this._builder.setEnforceSpaceBetweenWords(oldEnforce);}
_tokenCallback(token,type,startPosition){startPosition+=this._fromOffset;const startLine=this._lineEndings.lowerBound(startPosition);if(startLine!==this._lastLine){this._state.eatWhitespace=true;}
if(/^property/.test(type)&&!this._state.inPropertyValue){this._state.seenProperty=true;}
this._lastLine=startLine;const isWhitespace=/^\s+$/.test(token);if(isWhitespace){if(!this._state.eatWhitespace){this._builder.addSoftSpace();}
return;}
this._state.eatWhitespace=false;if(token==='\n'){return;}
if(token!=='}'){if(this._state.afterClosingBrace){this._builder.addNewLine(true);}
this._state.afterClosingBrace=false;}
if(token==='}'){if(this._state.inPropertyValue){this._builder.addNewLine();}
this._builder.decreaseNestingLevel();this._state.afterClosingBrace=true;this._state.inPropertyValue=false;}else if(token===':'&&!this._state.inPropertyValue&&this._state.seenProperty){this._builder.addToken(token,startPosition);this._builder.addSoftSpace();this._state.eatWhitespace=true;this._state.inPropertyValue=true;this._state.seenProperty=false;return;}else if(token==='{'){this._builder.addSoftSpace();this._builder.addToken(token,startPosition);this._builder.addNewLine();this._builder.increaseNestingLevel();return;}
this._builder.addToken(token,startPosition);if(type==='comment'&&!this._state.inPropertyValue&&!this._state.seenProperty){this._builder.addNewLine();}
if(token===';'&&this._state.inPropertyValue){this._state.inPropertyValue=false;this._builder.addNewLine();}else if(token==='}'){this._builder.addNewLine();}}};;FormatterWorker.AcornTokenizer=class{constructor(content){this._content=content;this._comments=[];this._tokenizer=acorn.tokenizer(this._content,{onComment:this._comments});this._textCursor=new TextUtils.TextCursor(this._content.computeLineEndings());this._tokenLineStart=0;this._tokenLineEnd=0;this._nextTokenInternal();}
static punctuator(token,values){return token.type!==acorn.tokTypes.num&&token.type!==acorn.tokTypes.regexp&&token.type!==acorn.tokTypes.string&&token.type!==acorn.tokTypes.name&&!token.type.keyword&&(!values||(token.type.label.length===1&&values.indexOf(token.type.label)!==-1));}
static keyword(token,keyword){return!!token.type.keyword&&token.type!==acorn.tokTypes['_true']&&token.type!==acorn.tokTypes['_false']&&token.type!==acorn.tokTypes['_null']&&(!keyword||token.type.keyword===keyword);}
static identifier(token,identifier){return token.type===acorn.tokTypes.name&&(!identifier||token.value===identifier);}
static lineComment(token){return token.type==='Line';}
static blockComment(token){return token.type==='Block';}
_nextTokenInternal(){if(this._comments.length){return this._comments.shift();}
const token=this._bufferedToken;this._bufferedToken=this._tokenizer.getToken();return token;}
nextToken(){const token=this._nextTokenInternal();if(token.type===acorn.tokTypes.eof){return null;}
this._textCursor.advance(token.start);this._tokenLineStart=this._textCursor.lineNumber();this._tokenColumnStart=this._textCursor.columnNumber();this._textCursor.advance(token.end);this._tokenLineEnd=this._textCursor.lineNumber();return token;}
peekToken(){if(this._comments.length){return this._comments[0];}
return this._bufferedToken.type!==acorn.tokTypes.eof?this._bufferedToken:null;}
tokenLineStart(){return this._tokenLineStart;}
tokenLineEnd(){return this._tokenLineEnd;}
tokenColumnStart(){return this._tokenColumnStart;}};;FormatterWorker.JavaScriptFormatter=class{constructor(builder){this._builder=builder;}
format(text,lineEndings,fromOffset,toOffset){this._fromOffset=fromOffset;this._toOffset=toOffset;this._content=text.substring(this._fromOffset,this._toOffset);this._lastLineNumber=0;this._tokenizer=new FormatterWorker.AcornTokenizer(this._content);const ast=acorn.parse(this._content,{ranges:false,preserveParens:true});const walker=new FormatterWorker.ESTreeWalker(this._beforeVisit.bind(this),this._afterVisit.bind(this));walker.walk(ast);}
_push(token,format){for(let i=0;i<format.length;++i){if(format[i]==='s'){this._builder.addSoftSpace();}else if(format[i]==='S'){this._builder.addHardSpace();}else if(format[i]==='n'){this._builder.addNewLine();}else if(format[i]==='>'){this._builder.increaseNestingLevel();}else if(format[i]==='<'){this._builder.decreaseNestingLevel();}else if(format[i]==='t'){if(this._tokenizer.tokenLineStart()-this._lastLineNumber>1){this._builder.addNewLine(true);}
this._lastLineNumber=this._tokenizer.tokenLineEnd();this._builder.addToken(this._content.substring(token.start,token.end),this._fromOffset+token.start);}}}
_beforeVisit(node){if(!node.parent){return;}
while(this._tokenizer.peekToken()&&this._tokenizer.peekToken().start<node.start){const token=(this._tokenizer.nextToken());const format=this._formatToken(node.parent,token);this._push(token,format);}}
_afterVisit(node){while(this._tokenizer.peekToken()&&this._tokenizer.peekToken().start<node.end){const token=(this._tokenizer.nextToken());const format=this._formatToken(node,token);this._push(token,format);}
this._push(null,this._finishNode(node));}
_inForLoopHeader(node){const parent=node.parent;if(!parent){return false;}
if(parent.type==='ForStatement'){return node===parent.init||node===parent.test||node===parent.update;}
if(parent.type==='ForInStatement'||parent.type==='ForOfStatement'){return node===parent.left||parent.right;}
return false;}
_formatToken(node,token){const AT=FormatterWorker.AcornTokenizer;if(AT.lineComment(token)){return'tn';}
if(AT.blockComment(token)){return'tn';}
if(node.type==='ContinueStatement'||node.type==='BreakStatement'){return node.label&&AT.keyword(token)?'ts':'t';}else if(node.type==='Identifier'){return't';}else if(node.type==='ReturnStatement'){if(AT.punctuator(token,';')){return't';}
return node.argument?'ts':'t';}else if(node.type==='Property'){if(AT.punctuator(token,':')){return'ts';}
return't';}else if(node.type==='ArrayExpression'){if(AT.punctuator(token,',')){return'ts';}
return't';}else if(node.type==='LabeledStatement'){if(AT.punctuator(token,':')){return'ts';}}else if(node.type==='LogicalExpression'||node.type==='AssignmentExpression'||node.type==='BinaryExpression'){if(AT.punctuator(token)&&!AT.punctuator(token,'()')){return'sts';}}else if(node.type==='ConditionalExpression'){if(AT.punctuator(token,'?:')){return'sts';}}else if(node.type==='VariableDeclarator'){if(AT.punctuator(token,'=')){return'sts';}}else if(node.type==='ObjectPattern'){if(node.parent&&node.parent.type==='VariableDeclarator'&&AT.punctuator(token,'{')){return'st';}
if(AT.punctuator(token,',')){return'ts';}}else if(node.type==='FunctionDeclaration'){if(AT.punctuator(token,',)')){return'ts';}}else if(node.type==='FunctionExpression'){if(AT.punctuator(token,',)')){return'ts';}
if(AT.keyword(token,'function')){return node.id?'ts':'t';}}else if(node.type==='WithStatement'){if(AT.punctuator(token,')')){return node.body&&node.body.type==='BlockStatement'?'ts':'tn>';}}else if(node.type==='SwitchStatement'){if(AT.punctuator(token,'{')){return'tn>';}
if(AT.punctuator(token,'}')){return'n<tn';}
if(AT.punctuator(token,')')){return'ts';}}else if(node.type==='SwitchCase'){if(AT.keyword(token,'case')){return'n<ts';}
if(AT.keyword(token,'default')){return'n<t';}
if(AT.punctuator(token,':')){return'tn>';}}else if(node.type==='VariableDeclaration'){if(AT.punctuator(token,',')){let allVariablesInitialized=true;const declarations=(node.declarations);for(let i=0;i<declarations.length;++i){allVariablesInitialized=allVariablesInitialized&&!!declarations[i].init;}
return!this._inForLoopHeader(node)&&allVariablesInitialized?'nSSts':'ts';}}else if(node.type==='BlockStatement'){if(AT.punctuator(token,'{')){return node.body.length?'tn>':'t';}
if(AT.punctuator(token,'}')){return node.body.length?'n<t':'t';}}else if(node.type==='CatchClause'){if(AT.punctuator(token,')')){return'ts';}}else if(node.type==='ObjectExpression'){if(!node.properties.length){return't';}
if(AT.punctuator(token,'{')){return'tn>';}
if(AT.punctuator(token,'}')){return'n<t';}
if(AT.punctuator(token,',')){return'tn';}}else if(node.type==='IfStatement'){if(AT.punctuator(token,')')){return node.consequent&&node.consequent.type==='BlockStatement'?'ts':'tn>';}
if(AT.keyword(token,'else')){const preFormat=node.consequent&&node.consequent.type==='BlockStatement'?'st':'n<t';let postFormat='n>';if(node.alternate&&(node.alternate.type==='BlockStatement'||node.alternate.type==='IfStatement')){postFormat='s';}
return preFormat+postFormat;}}else if(node.type==='CallExpression'){if(AT.punctuator(token,',')){return'ts';}}else if(node.type==='SequenceExpression'&&AT.punctuator(token,',')){return node.parent&&node.parent.type==='SwitchCase'?'ts':'tn';}else if(node.type==='ForStatement'||node.type==='ForOfStatement'||node.type==='ForInStatement'){if(AT.punctuator(token,';')){return'ts';}
if(AT.keyword(token,'in')||AT.identifier(token,'of')){return'sts';}
if(AT.punctuator(token,')')){return node.body&&node.body.type==='BlockStatement'?'ts':'tn>';}}else if(node.type==='WhileStatement'){if(AT.punctuator(token,')')){return node.body&&node.body.type==='BlockStatement'?'ts':'tn>';}}else if(node.type==='DoWhileStatement'){const blockBody=node.body&&node.body.type==='BlockStatement';if(AT.keyword(token,'do')){return blockBody?'ts':'tn>';}
if(AT.keyword(token,'while')){return blockBody?'sts':'n<ts';}}else if(node.type==='ClassBody'){if(AT.punctuator(token,'{')){return'stn>';}
if(AT.punctuator(token,'}')){return'<ntn';}
return't';}else if(node.type==='YieldExpression'){return't';}else if(node.type==='Super'){return't';}
return AT.keyword(token)&&!AT.keyword(token,'this')?'ts':'t';}
_finishNode(node){if(node.type==='WithStatement'){if(node.body&&node.body.type!=='BlockStatement'){return'n<';}}else if(node.type==='VariableDeclaration'){if(!this._inForLoopHeader(node)){return'n';}}else if(node.type==='ForStatement'||node.type==='ForOfStatement'||node.type==='ForInStatement'){if(node.body&&node.body.type!=='BlockStatement'){return'n<';}}else if(node.type==='BlockStatement'){if(node.parent&&node.parent.type==='IfStatement'&&node.parent.alternate&&node.parent.consequent===node){return'';}
if(node.parent&&node.parent.type==='FunctionExpression'&&node.parent.parent&&node.parent.parent.type==='Property'){return'';}
if(node.parent&&node.parent.type==='FunctionExpression'&&node.parent.parent&&node.parent.parent.type==='VariableDeclarator'){return'';}
if(node.parent&&node.parent.type==='FunctionExpression'&&node.parent.parent&&node.parent.parent.type==='CallExpression'){return'';}
if(node.parent&&node.parent.type==='DoWhileStatement'){return'';}
if(node.parent&&node.parent.type==='TryStatement'&&node.parent.block===node){return's';}
if(node.parent&&node.parent.type==='CatchClause'&&node.parent.parent.finalizer){return's';}
return'n';}else if(node.type==='WhileStatement'){if(node.body&&node.body.type!=='BlockStatement'){return'n<';}}else if(node.type==='IfStatement'){if(node.alternate){if(node.alternate.type!=='BlockStatement'&&node.alternate.type!=='IfStatement'){return'<';}}else if(node.consequent){if(node.consequent.type!=='BlockStatement'){return'<';}}}else if(node.type==='BreakStatement'||node.type==='ContinueStatement'||node.type==='ThrowStatement'||node.type==='ReturnStatement'||node.type==='ExpressionStatement'){return'n';}
return'';}};;FormatterWorker.FormattedContentBuilder=class{constructor(indentString){this._lastOriginalPosition=0;this._formattedContent=[];this._formattedContentLength=0;this._lastFormattedPosition=0;this._mapping={original:[0],formatted:[0]};this._nestingLevel=0;this._indentString=indentString;this._cachedIndents=new Map();this._newLines=0;this._softSpace=false;this._hardSpaces=0;this._enforceSpaceBetweenWords=true;}
setEnforceSpaceBetweenWords(value){const oldValue=this._enforceSpaceBetweenWords;this._enforceSpaceBetweenWords=value;return oldValue;}
addToken(token,offset){const last=this._formattedContent.peekLast();if(this._enforceSpaceBetweenWords&&last&&/\w/.test(last[last.length-1])&&/\w/.test(token)){this.addSoftSpace();}
this._appendFormatting();this._addMappingIfNeeded(offset);this._addText(token);}
addSoftSpace(){if(!this._hardSpaces){this._softSpace=true;}}
addHardSpace(){this._softSpace=false;++this._hardSpaces;}
addNewLine(noSquash){if(!this._formattedContentLength){return;}
if(noSquash){++this._newLines;}else{this._newLines=this._newLines||1;}}
increaseNestingLevel(){this._nestingLevel+=1;}
decreaseNestingLevel(){if(this._nestingLevel>0){this._nestingLevel-=1;}}
_appendFormatting(){if(this._newLines){for(let i=0;i<this._newLines;++i){this._addText('\n');}
this._addText(this._indent());}else if(this._softSpace){this._addText(' ');}
if(this._hardSpaces){for(let i=0;i<this._hardSpaces;++i){this._addText(' ');}}
this._newLines=0;this._softSpace=false;this._hardSpaces=0;}
content(){return this._formattedContent.join('')+(this._newLines?'\n':'');}
mapping(){return this._mapping;}
_indent(){const cachedValue=this._cachedIndents.get(this._nestingLevel);if(cachedValue){return cachedValue;}
let fullIndent='';for(let i=0;i<this._nestingLevel;++i){fullIndent+=this._indentString;}
if(this._nestingLevel<=20){this._cachedIndents.set(this._nestingLevel,fullIndent);}
return fullIndent;}
_addText(text){this._formattedContent.push(text);this._formattedContentLength+=text.length;}
_addMappingIfNeeded(originalPosition){if(originalPosition-this._lastOriginalPosition===this._formattedContentLength-this._lastFormattedPosition){return;}
this._mapping.original.push(originalPosition);this._lastOriginalPosition=originalPosition;this._mapping.formatted.push(this._formattedContentLength);this._lastFormattedPosition=this._formattedContentLength;}};;FormatterWorker.CSSParserStates={Initial:'Initial',Selector:'Selector',Style:'Style',PropertyName:'PropertyName',PropertyValue:'PropertyValue',AtRule:'AtRule'};FormatterWorker.parseCSS=function(text){FormatterWorker._innerParseCSS(text,postMessage);};FormatterWorker._innerParseCSS=function(text,chunkCallback){const chunkSize=100000;const lines=text.split('\n');let rules=[];let processedChunkCharacters=0;let state=FormatterWorker.CSSParserStates.Initial;let rule;let property;const UndefTokenType=new Set();let disabledRules=[];function disabledRulesCallback(chunk){disabledRules=disabledRules.concat(chunk.chunk);}
function processToken(tokenValue,tokenTypes,column,newColumn){const tokenType=tokenTypes?new Set(tokenTypes.split(' ')):UndefTokenType;switch(state){case FormatterWorker.CSSParserStates.Initial:if(tokenType.has('qualifier')||tokenType.has('builtin')||tokenType.has('tag')){rule={selectorText:tokenValue,lineNumber:lineNumber,columnNumber:column,properties:[],};state=FormatterWorker.CSSParserStates.Selector;}else if(tokenType.has('def')){rule={atRule:tokenValue,lineNumber:lineNumber,columnNumber:column,};state=FormatterWorker.CSSParserStates.AtRule;}
break;case FormatterWorker.CSSParserStates.Selector:if(tokenValue==='{'&&tokenType===UndefTokenType){rule.selectorText=rule.selectorText.trim();rule.styleRange=createRange(lineNumber,newColumn);state=FormatterWorker.CSSParserStates.Style;}else{rule.selectorText+=tokenValue;}
break;case FormatterWorker.CSSParserStates.AtRule:if((tokenValue===';'||tokenValue==='{')&&tokenType===UndefTokenType){rule.atRule=rule.atRule.trim();rules.push(rule);state=FormatterWorker.CSSParserStates.Initial;}else{rule.atRule+=tokenValue;}
break;case FormatterWorker.CSSParserStates.Style:if(tokenType.has('meta')||tokenType.has('property')){property={name:tokenValue,value:'',range:createRange(lineNumber,column),nameRange:createRange(lineNumber,column)};state=FormatterWorker.CSSParserStates.PropertyName;}else if(tokenValue==='}'&&tokenType===UndefTokenType){rule.styleRange.endLine=lineNumber;rule.styleRange.endColumn=column;rules.push(rule);state=FormatterWorker.CSSParserStates.Initial;}else if(tokenType.has('comment')){if(tokenValue.substring(0,2)!=='/*'||tokenValue.substring(tokenValue.length-2)!=='*/'){break;}
const uncommentedText=tokenValue.substring(2,tokenValue.length-2);const fakeRule='a{\n'+uncommentedText+'}';disabledRules=[];FormatterWorker._innerParseCSS(fakeRule,disabledRulesCallback);if(disabledRules.length===1&&disabledRules[0].properties.length===1){const disabledProperty=disabledRules[0].properties[0];disabledProperty.disabled=true;disabledProperty.range=createRange(lineNumber,column);disabledProperty.range.endColumn=newColumn;const lineOffset=lineNumber-1;const columnOffset=column+2;disabledProperty.nameRange.startLine+=lineOffset;disabledProperty.nameRange.startColumn+=columnOffset;disabledProperty.nameRange.endLine+=lineOffset;disabledProperty.nameRange.endColumn+=columnOffset;disabledProperty.valueRange.startLine+=lineOffset;disabledProperty.valueRange.startColumn+=columnOffset;disabledProperty.valueRange.endLine+=lineOffset;disabledProperty.valueRange.endColumn+=columnOffset;rule.properties.push(disabledProperty);}}
break;case FormatterWorker.CSSParserStates.PropertyName:if(tokenValue===':'&&tokenType===UndefTokenType){property.name=property.name;property.nameRange.endLine=lineNumber;property.nameRange.endColumn=column;property.valueRange=createRange(lineNumber,newColumn);state=FormatterWorker.CSSParserStates.PropertyValue;}else if(tokenType.has('property')){property.name+=tokenValue;}
break;case FormatterWorker.CSSParserStates.PropertyValue:if((tokenValue===';'||tokenValue==='}')&&tokenType===UndefTokenType){property.value=property.value;property.valueRange.endLine=lineNumber;property.valueRange.endColumn=column;property.range.endLine=lineNumber;property.range.endColumn=tokenValue===';'?newColumn:column;rule.properties.push(property);if(tokenValue==='}'){rule.styleRange.endLine=lineNumber;rule.styleRange.endColumn=column;rules.push(rule);state=FormatterWorker.CSSParserStates.Initial;}else{state=FormatterWorker.CSSParserStates.Style;}}else if(!tokenType.has('comment')){property.value+=tokenValue;}
break;default:console.assert(false,'Unknown CSS parser state.');}
processedChunkCharacters+=newColumn-column;if(processedChunkCharacters>chunkSize){chunkCallback({chunk:rules,isLastChunk:false});rules=[];processedChunkCharacters=0;}}
const tokenizer=FormatterWorker.createTokenizer('text/css');let lineNumber;for(lineNumber=0;lineNumber<lines.length;++lineNumber){const line=lines[lineNumber];tokenizer(line,processToken);processToken('\n',null,line.length,line.length+1);}
chunkCallback({chunk:rules,isLastChunk:true});function createRange(lineNumber,columnNumber){return{startLine:lineNumber,startColumn:columnNumber,endLine:lineNumber,endColumn:columnNumber};}};;FormatterWorker.HTMLFormatter=class{constructor(builder){this._builder=builder;this._jsFormatter=new FormatterWorker.JavaScriptFormatter(builder);this._cssFormatter=new FormatterWorker.CSSFormatter(builder);}
format(text,lineEndings){this._text=text;this._lineEndings=lineEndings;this._model=new FormatterWorker.HTMLModel(text);this._walk(this._model.document());}
_formatTokensTill(element,offset){while(this._model.peekToken()&&this._model.peekToken().startOffset<offset){const token=this._model.nextToken();this._formatToken(element,token);}}
_walk(element){if(element.parent){this._formatTokensTill(element.parent,element.openTag.startOffset);}
this._beforeOpenTag(element);this._formatTokensTill(element,element.openTag.endOffset);this._afterOpenTag(element);for(let i=0;i<element.children.length;++i){this._walk(element.children[i]);}
this._formatTokensTill(element,element.closeTag.startOffset);this._beforeCloseTag(element);this._formatTokensTill(element,element.closeTag.endOffset);this._afterCloseTag(element);}
_beforeOpenTag(element){if(!element.children.length||element===this._model.document()){return;}
this._builder.addNewLine();}
_afterOpenTag(element){if(!element.children.length||element===this._model.document()){return;}
this._builder.increaseNestingLevel();this._builder.addNewLine();}
_beforeCloseTag(element){if(!element.children.length||element===this._model.document()){return;}
this._builder.decreaseNestingLevel();this._builder.addNewLine();}
_afterCloseTag(element){this._builder.addNewLine();}
_formatToken(element,token){if(token.value.isWhitespace()){return;}
if(token.type.has('comment')||token.type.has('meta')){this._builder.addNewLine();this._builder.addToken(token.value.trim(),token.startOffset);this._builder.addNewLine();return;}
const isBodyToken=element.openTag.endOffset<=token.startOffset&&token.startOffset<element.closeTag.startOffset;if(isBodyToken&&element.name==='style'){this._builder.addNewLine();this._builder.increaseNestingLevel();this._cssFormatter.format(this._text,this._lineEndings,token.startOffset,token.endOffset);this._builder.decreaseNestingLevel();return;}
if(isBodyToken&&element.name==='script'){this._builder.addNewLine();this._builder.increaseNestingLevel();if(this._scriptTagIsJavaScript(element)){this._jsFormatter.format(this._text,this._lineEndings,token.startOffset,token.endOffset);}else{this._builder.addToken(token.value,token.startOffset);this._builder.addNewLine();}
this._builder.decreaseNestingLevel();return;}
if(!isBodyToken&&token.type.has('attribute')){this._builder.addSoftSpace();}
this._builder.addToken(token.value,token.startOffset);}
_scriptTagIsJavaScript(element){if(!element.openTag.attributes.has('type')){return true;}
let type=element.openTag.attributes.get('type').toLowerCase();if(!type){return true;}
const isWrappedInQuotes=/^(["\'])(.*)\1$/.exec(type.trim());if(isWrappedInQuotes){type=isWrappedInQuotes[2];}
return FormatterWorker.HTMLFormatter.SupportedJavaScriptMimeTypes.has(type.trim());}};FormatterWorker.HTMLFormatter.SupportedJavaScriptMimeTypes=new Set(['application/ecmascript','application/javascript','application/x-ecmascript','application/x-javascript','text/ecmascript','text/javascript','text/javascript1.0','text/javascript1.1','text/javascript1.2','text/javascript1.3','text/javascript1.4','text/javascript1.5','text/jscript','text/livescript','text/x-ecmascript','text/x-javascript']);FormatterWorker.HTMLModel=class{constructor(text){this._state=FormatterWorker.HTMLModel.ParseState.Initial;this._document=new FormatterWorker.HTMLModel.Element('document');this._document.openTag=new FormatterWorker.HTMLModel.Tag('document',0,0,new Map(),true,false);this._document.closeTag=new FormatterWorker.HTMLModel.Tag('document',text.length,text.length,new Map(),false,false);this._stack=[this._document];this._tokens=[];this._tokenIndex=0;this._build(text);}
_build(text){const tokenizer=FormatterWorker.createTokenizer('text/html');let lastOffset=0;const lowerCaseText=text.toLowerCase();while(true){tokenizer(text.substring(lastOffset),processToken.bind(this,lastOffset));if(lastOffset>=text.length){break;}
const element=this._stack.peekLast();lastOffset=lowerCaseText.indexOf('</'+element.name,lastOffset);if(lastOffset===-1){lastOffset=text.length;}
const tokenStart=element.openTag.endOffset;const tokenEnd=lastOffset;const tokenValue=text.substring(tokenStart,tokenEnd);this._tokens.push(new FormatterWorker.HTMLModel.Token(tokenValue,new Set(),tokenStart,tokenEnd));}
while(this._stack.length>1){const element=this._stack.peekLast();this._popElement(new FormatterWorker.HTMLModel.Tag(element.name,text.length,text.length,new Map(),false,false));}
function processToken(baseOffset,tokenValue,type,tokenStart,tokenEnd){tokenStart+=baseOffset;tokenEnd+=baseOffset;lastOffset=tokenEnd;const tokenType=type?new Set(type.split(' ')):new Set();const token=new FormatterWorker.HTMLModel.Token(tokenValue,tokenType,tokenStart,tokenEnd);this._tokens.push(token);this._updateDOM(token);const element=this._stack.peekLast();if(element&&(element.name==='script'||element.name==='style')&&element.openTag.endOffset===lastOffset){return FormatterWorker.AbortTokenization;}}}
_updateDOM(token){const S=FormatterWorker.HTMLModel.ParseState;const value=token.value;const type=token.type;switch(this._state){case S.Initial:if(type.has('bracket')&&(value==='<'||value==='</')){this._onStartTag(token);this._state=S.Tag;}
return;case S.Tag:if(type.has('tag')&&!type.has('bracket')){this._tagName=value.trim().toLowerCase();}else if(type.has('attribute')){this._attributeName=value.trim().toLowerCase();this._attributes.set(this._attributeName,'');this._state=S.AttributeName;}else if(type.has('bracket')&&(value==='>'||value==='/>')){this._onEndTag(token);this._state=S.Initial;}
return;case S.AttributeName:if(!type.size&&value==='='){this._state=S.AttributeValue;}else if(type.has('bracket')&&(value==='>'||value==='/>')){this._onEndTag(token);this._state=S.Initial;}
return;case S.AttributeValue:if(type.has('string')){this._attributes.set(this._attributeName,value);this._state=S.Tag;}else if(type.has('bracket')&&(value==='>'||value==='/>')){this._onEndTag(token);this._state=S.Initial;}
return;}}
_onStartTag(token){this._tagName='';this._tagStartOffset=token.startOffset;this._tagEndOffset=null;this._attributes=new Map();this._attributeName='';this._isOpenTag=token.value==='<';}
_onEndTag(token){this._tagEndOffset=token.endOffset;const selfClosingTag=token.value==='/>'||FormatterWorker.HTMLModel.SelfClosingTags.has(this._tagName);const tag=new FormatterWorker.HTMLModel.Tag(this._tagName,this._tagStartOffset,this._tagEndOffset,this._attributes,this._isOpenTag,selfClosingTag);this._onTagComplete(tag);}
_onTagComplete(tag){if(tag.isOpenTag){const topElement=this._stack.peekLast();if(topElement!==this._document&&topElement.openTag.selfClosingTag){this._popElement(autocloseTag(topElement,topElement.openTag.endOffset));}else if((topElement.name in FormatterWorker.HTMLModel.AutoClosingTags)&&FormatterWorker.HTMLModel.AutoClosingTags[topElement.name].has(tag.name)){this._popElement(autocloseTag(topElement,tag.startOffset));}
this._pushElement(tag);return;}
while(this._stack.length>1&&this._stack.peekLast().name!==tag.name){this._popElement(autocloseTag(this._stack.peekLast(),tag.startOffset));}
if(this._stack.length===1){return;}
this._popElement(tag);function autocloseTag(element,offset){return new FormatterWorker.HTMLModel.Tag(element.name,offset,offset,new Map(),false,false);}}
_popElement(closeTag){const element=this._stack.pop();element.closeTag=closeTag;}
_pushElement(openTag){const topElement=this._stack.peekLast();const newElement=new FormatterWorker.HTMLModel.Element(openTag.name);newElement.parent=topElement;topElement.children.push(newElement);newElement.openTag=openTag;this._stack.push(newElement);}
peekToken(){return this._tokenIndex<this._tokens.length?this._tokens[this._tokenIndex]:null;}
nextToken(){return this._tokens[this._tokenIndex++];}
document(){return this._document;}};FormatterWorker.HTMLModel.SelfClosingTags=new Set(['area','base','br','col','command','embed','hr','img','input','keygen','link','meta','param','source','track','wbr']);FormatterWorker.HTMLModel.AutoClosingTags={'head':new Set(['body']),'li':new Set(['li']),'dt':new Set(['dt','dd']),'dd':new Set(['dt','dd']),'p':new Set(['address','article','aside','blockquote','div','dl','fieldset','footer','form','h1','h2','h3','h4','h5','h6','header','hgroup','hr','main','nav','ol','p','pre','section','table','ul']),'rb':new Set(['rb','rt','rtc','rp']),'rt':new Set(['rb','rt','rtc','rp']),'rtc':new Set(['rb','rtc','rp']),'rp':new Set(['rb','rt','rtc','rp']),'optgroup':new Set(['optgroup']),'option':new Set(['option','optgroup']),'colgroup':new Set(['colgroup']),'thead':new Set(['tbody','tfoot']),'tbody':new Set(['tbody','tfoot']),'tfoot':new Set(['tbody']),'tr':new Set(['tr']),'td':new Set(['td','th']),'th':new Set(['td','th']),};FormatterWorker.HTMLModel.ParseState={Initial:'Initial',Tag:'Tag',AttributeName:'AttributeName',AttributeValue:'AttributeValue'};FormatterWorker.HTMLModel.Token=class{constructor(value,type,startOffset,endOffset){this.value=value;this.type=type;this.startOffset=startOffset;this.endOffset=endOffset;}};FormatterWorker.HTMLModel.Tag=class{constructor(name,startOffset,endOffset,attributes,isOpenTag,selfClosingTag){this.name=name;this.startOffset=startOffset;this.endOffset=endOffset;this.attributes=attributes;this.isOpenTag=isOpenTag;this.selfClosingTag=selfClosingTag;}};FormatterWorker.HTMLModel.Element=class{constructor(name){this.name=name;this.children=[];this.parent=null;this.openTag=null;this.closeTag=null;}};;FormatterWorker.IdentityFormatter=class{constructor(builder){this._builder=builder;}
format(text,lineEndings,fromOffset,toOffset){const content=text.substring(fromOffset,toOffset);this._builder.addToken(content,fromOffset);}};;FormatterWorker.javaScriptOutline=function(content){const chunkSize=100000;let outlineChunk=[];let lastReportedOffset=0;let ast;try{ast=acorn.parse(content,{ranges:false});}catch(e){ast=acorn.loose.parse(content,{ranges:false});}
const textCursor=new TextUtils.TextCursor(content.computeLineEndings());const walker=new FormatterWorker.ESTreeWalker(beforeVisit);walker.walk(ast);postMessage({chunk:outlineChunk,isLastChunk:true});function beforeVisit(node){if(node.type==='ClassDeclaration'){reportClass((node.id));}else if(node.type==='VariableDeclarator'&&isClassNode(node.init)){reportClass((node.id));}else if(node.type==='AssignmentExpression'&&isNameNode(node.left)&&isClassNode(node.right)){reportClass((node.left));}else if(node.type==='Property'&&isNameNode(node.key)&&isClassNode(node.value)){reportClass((node.key));}else if(node.type==='FunctionDeclaration'){reportFunction((node.id),node);}else if(node.type==='VariableDeclarator'&&isFunctionNode(node.init)){reportFunction((node.id),(node.init));}else if(node.type==='AssignmentExpression'&&isNameNode(node.left)&&isFunctionNode(node.right)){reportFunction((node.left),(node.right));}else if((node.type==='MethodDefinition'||node.type==='Property')&&isNameNode(node.key)&&isFunctionNode(node.value)){const namePrefix=[];if(node.kind==='get'||node.kind==='set'){namePrefix.push(node.kind);}
if(node.static){namePrefix.push('static');}
reportFunction(node.key,node.value,namePrefix.join(' '));}}
function reportClass(nameNode){const name='class '+stringifyNameNode(nameNode);textCursor.advance(nameNode.start);addOutlineItem({name:name,line:textCursor.lineNumber(),column:textCursor.columnNumber(),});}
function reportFunction(nameNode,functionNode,namePrefix){let name=stringifyNameNode(nameNode);if(functionNode.generator){name='*'+name;}
if(namePrefix){name=namePrefix+' '+name;}
if(functionNode.async){name='async '+name;}
textCursor.advance(nameNode.start);addOutlineItem({name:name,line:textCursor.lineNumber(),column:textCursor.columnNumber(),arguments:stringifyArguments((functionNode.params))});}
function isNameNode(node){if(!node){return false;}
if(node.type==='MemberExpression'){return!node.computed&&node.property.type==='Identifier';}
return node.type==='Identifier';}
function isFunctionNode(node){if(!node){return false;}
return node.type==='FunctionExpression'||node.type==='ArrowFunctionExpression';}
function isClassNode(node){return!!node&&node.type==='ClassExpression';}
function stringifyNameNode(node){if(node.type==='MemberExpression'){node=(node.property);}
console.assert(node.type==='Identifier','Cannot extract identifier from unknown type: '+node.type);return(node.name);}
function stringifyArguments(params){const result=[];for(const param of params){if(param.type==='Identifier'){result.push(param.name);}else if(param.type==='RestElement'&&param.argument.type==='Identifier'){result.push('...'+param.argument.name);}else{console.error('Error: unexpected function parameter type: '+param.type);}}
return'('+result.join(', ')+')';}
function addOutlineItem(item){outlineChunk.push(item);if(textCursor.offset()-lastReportedOffset<chunkSize){return;}
postMessage({chunk:outlineChunk,isLastChunk:false});outlineChunk=[];lastReportedOffset=textCursor.offset();}};;FormatterWorker.RelaxedJSONParser={};FormatterWorker.RelaxedJSONParser.States={ExpectKey:'ExpectKey',ExpectValue:'ExpectValue'};FormatterWorker.RelaxedJSONParser.Keywords={'NaN':NaN,'true':true,'false':false,'Infinity':Infinity,'undefined':undefined,'null':null};FormatterWorker.RelaxedJSONParser.parse=function(content){const Keywords=FormatterWorker.RelaxedJSONParser.Keywords;const States=FormatterWorker.RelaxedJSONParser.States;content='('+content+')';let root;try{root=acorn.parse(content,{});}catch(e){return null;}
const walker=new FormatterWorker.ESTreeWalker(beforeVisit,afterVisit);const rootTip=[];const stack=[];let stackData=({key:0,tip:rootTip,state:States.ExpectValue,parentIsArray:true});walker.setWalkNulls(true);let hasExpression=false;walker.walk(root);if(hasExpression){return null;}
return rootTip.length?rootTip[0]:null;function pushStack(newStack){stack.push(stackData);stackData=newStack;}
function popStack(){stackData=stack.pop();}
function applyValue(value){stackData.tip[stackData.key]=value;if(stackData.parentIsArray){stackData.key++;}else{stackData.state=null;}}
function beforeVisit(node){switch(node.type){case'ObjectExpression':{const newTip={};applyValue(newTip);pushStack(({key:null,tip:newTip,state:null,parentIsArray:false}));break;}
case'ArrayExpression':{const newTip=[];applyValue(newTip);pushStack(({key:0,tip:newTip,state:States.ExpectValue,parentIsArray:true}));break;}
case'Property':stackData.state=States.ExpectKey;break;case'Literal':if(stackData.state===States.ExpectKey){stackData.key=node.value;stackData.state=States.ExpectValue;}else if(stackData.state===States.ExpectValue){applyValue(extractValue(node));return FormatterWorker.ESTreeWalker.SkipSubtree;}
break;case'Identifier':if(stackData.state===States.ExpectKey){stackData.key=(node.name);stackData.state=States.ExpectValue;}else if(stackData.state===States.ExpectValue){applyValue(extractValue(node));return FormatterWorker.ESTreeWalker.SkipSubtree;}
break;case'UnaryExpression':if(stackData.state===States.ExpectValue){applyValue(extractValue(node));return FormatterWorker.ESTreeWalker.SkipSubtree;}
break;case'Program':case'ExpressionStatement':break;default:if(stackData.state===States.ExpectValue){applyValue(extractValue(node));}
return FormatterWorker.ESTreeWalker.SkipSubtree;}}
function afterVisit(node){if(node.type==='ObjectExpression'||node.type==='ArrayExpression'){popStack();}}
function extractValue(node){let isNegative=false;const originalNode=node;let value;if(node.type==='UnaryExpression'&&(node.operator==='-'||node.operator==='+')){if(node.operator==='-'){isNegative=true;}
node=(node.argument);}
if(node.type==='Literal'){value=node.value;}else if(node.type==='Identifier'&&Keywords.hasOwnProperty(node.name)){value=Keywords[node.name];}else{hasExpression=true;return content.substring(originalNode.start,originalNode.end);}
if(isNegative){if(typeof value!=='number'){hasExpression=true;return content.substring(originalNode.start,originalNode.end);}
value=-(value);}
return value;}};FormatterWorker.RelaxedJSONParser.Context;;;;self.importScripts('platform/utilities.js');if(!self.Root||!self.Root.Runtime){self.importScripts('Runtime.js');}
Root.Runtime.startWorker('formatter_worker');