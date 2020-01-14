export default class SourceMap{compiledURL(){}
url(){}
sourceURLs(){}
sourceContentProvider(sourceURL,contentType){}
embeddedContentByURL(sourceURL){}
findEntry(lineNumber,columnNumber){}}
export class SourceMapV3{constructor(){this.version;this.file;this.sources;this.sections;this.mappings;this.sourceRoot;this.names;}}
SourceMapV3.Section=class{constructor(){this.map;this.offset;}};SourceMapV3.Offset=class{constructor(){this.line;this.column;}};export class SourceMapEntry{constructor(lineNumber,columnNumber,sourceURL,sourceLineNumber,sourceColumnNumber,name){this.lineNumber=lineNumber;this.columnNumber=columnNumber;this.sourceURL=sourceURL;this.sourceLineNumber=sourceLineNumber;this.sourceColumnNumber=sourceColumnNumber;this.name=name;}
static compare(entry1,entry2){if(entry1.lineNumber!==entry2.lineNumber){return entry1.lineNumber-entry2.lineNumber;}
return entry1.columnNumber-entry2.columnNumber;}}
export class EditResult{constructor(map,compiledEdits,newSources){this.map=map;this.compiledEdits=compiledEdits;this.newSources=newSources;}}
export class TextSourceMap{constructor(compiledURL,sourceMappingURL,payload){if(!TextSourceMap._base64Map){const base64Digits='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';TextSourceMap._base64Map={};for(let i=0;i<base64Digits.length;++i){TextSourceMap._base64Map[base64Digits.charAt(i)]=i;}}
this._json=payload;this._compiledURL=compiledURL;this._sourceMappingURL=sourceMappingURL;this._baseURL=sourceMappingURL.startsWith('data:')?compiledURL:sourceMappingURL;this._mappings=null;this._sourceInfos=new Map();if(this._json.sections){const sectionWithURL=!!this._json.sections.find(section=>!!section.url);if(sectionWithURL){Common.console.warn(`SourceMap "${sourceMappingURL}" contains unsupported "URL" field in one of its sections.`);}}
this._eachSection(this._parseSources.bind(this));}
static load(sourceMapURL,compiledURL){let callback;const promise=new Promise(fulfill=>callback=fulfill);SDK.multitargetNetworkManager.loadResource(sourceMapURL,contentLoaded);return promise;function contentLoaded(statusCode,headers,content){if(!content||statusCode>=400){callback(null);return;}
if(content.slice(0,3)===')]}'){content=content.substring(content.indexOf('\n'));}
try{const payload=(JSON.parse(content));callback(new TextSourceMap(compiledURL,sourceMapURL,payload));}catch(e){console.error(e);Common.console.warn('DevTools failed to parse SourceMap: '+sourceMapURL);callback(null);}}}
compiledURL(){return this._compiledURL;}
url(){return this._sourceMappingURL;}
sourceURLs(){return this._sourceInfos.keysArray();}
sourceContentProvider(sourceURL,contentType){const info=this._sourceInfos.get(sourceURL);if(info.content){return Common.StaticContentProvider.fromString(sourceURL,contentType,info.content);}
return new SDK.CompilerSourceMappingContentProvider(sourceURL,contentType);}
embeddedContentByURL(sourceURL){if(!this._sourceInfos.has(sourceURL)){return null;}
return this._sourceInfos.get(sourceURL).content;}
findEntry(lineNumber,columnNumber){const mappings=this.mappings();const index=mappings.upperBound(undefined,(unused,entry)=>lineNumber-entry.lineNumber||columnNumber-entry.columnNumber);return index?mappings[index-1]:null;}
sourceLineMapping(sourceURL,lineNumber,columnNumber){const mappings=this._reversedMappings(sourceURL);const first=mappings.lowerBound(lineNumber,lineComparator);const last=mappings.upperBound(lineNumber,lineComparator);if(first>=mappings.length||mappings[first].sourceLineNumber!==lineNumber){return null;}
const columnMappings=mappings.slice(first,last);if(!columnMappings.length){return null;}
const index=columnMappings.lowerBound(columnNumber,(columnNumber,mapping)=>columnNumber-mapping.sourceColumnNumber);return index>=columnMappings.length?columnMappings[columnMappings.length-1]:columnMappings[index];function lineComparator(lineNumber,mapping){return lineNumber-mapping.sourceLineNumber;}}
findReverseEntries(sourceURL,lineNumber,columnNumber){const mappings=this._reversedMappings(sourceURL);const endIndex=mappings.upperBound(undefined,(unused,entry)=>lineNumber-entry.sourceLineNumber||columnNumber-entry.sourceColumnNumber);let startIndex=endIndex;while(startIndex>0&&mappings[startIndex-1].sourceLineNumber===mappings[endIndex-1].sourceLineNumber&&mappings[startIndex-1].sourceColumnNumber===mappings[endIndex-1].sourceColumnNumber){--startIndex;}
return mappings.slice(startIndex,endIndex);}
mappings(){if(this._mappings===null){this._mappings=[];this._eachSection(this._parseMap.bind(this));this._json=null;}
return(this._mappings);}
_reversedMappings(sourceURL){if(!this._sourceInfos.has(sourceURL)){return[];}
const mappings=this.mappings();const info=this._sourceInfos.get(sourceURL);if(info.reverseMappings===null){info.reverseMappings=mappings.filter(mapping=>mapping.sourceURL===sourceURL).sort(sourceMappingComparator);}
return info.reverseMappings;function sourceMappingComparator(a,b){if(a.sourceLineNumber!==b.sourceLineNumber){return a.sourceLineNumber-b.sourceLineNumber;}
if(a.sourceColumnNumber!==b.sourceColumnNumber){return a.sourceColumnNumber-b.sourceColumnNumber;}
if(a.lineNumber!==b.lineNumber){return a.lineNumber-b.lineNumber;}
return a.columnNumber-b.columnNumber;}}
_eachSection(callback){if(!this._json.sections){callback(this._json,0,0);return;}
for(const section of this._json.sections){callback(section.map,section.offset.line,section.offset.column);}}
_parseSources(sourceMap){const sourcesList=[];let sourceRoot=sourceMap.sourceRoot||'';if(sourceRoot&&!sourceRoot.endsWith('/')){sourceRoot+='/';}
for(let i=0;i<sourceMap.sources.length;++i){const href=sourceRoot+sourceMap.sources[i];let url=Common.ParsedURL.completeURL(this._baseURL,href)||href;const source=sourceMap.sourcesContent&&sourceMap.sourcesContent[i];if(url===this._compiledURL&&source){url+=Common.UIString('? [sm]');}
this._sourceInfos.set(url,new TextSourceMap.SourceInfo(source,null));sourcesList.push(url);}
sourceMap[TextSourceMap._sourcesListSymbol]=sourcesList;}
_parseMap(map,lineNumber,columnNumber){let sourceIndex=0;let sourceLineNumber=0;let sourceColumnNumber=0;let nameIndex=0;const sources=map[TextSourceMap._sourcesListSymbol];const names=map.names||[];const stringCharIterator=new TextSourceMap.StringCharIterator(map.mappings);let sourceURL=sources[sourceIndex];while(true){if(stringCharIterator.peek()===','){stringCharIterator.next();}else{while(stringCharIterator.peek()===';'){lineNumber+=1;columnNumber=0;stringCharIterator.next();}
if(!stringCharIterator.hasNext()){break;}}
columnNumber+=this._decodeVLQ(stringCharIterator);if(!stringCharIterator.hasNext()||this._isSeparator(stringCharIterator.peek())){this._mappings.push(new SourceMapEntry(lineNumber,columnNumber));continue;}
const sourceIndexDelta=this._decodeVLQ(stringCharIterator);if(sourceIndexDelta){sourceIndex+=sourceIndexDelta;sourceURL=sources[sourceIndex];}
sourceLineNumber+=this._decodeVLQ(stringCharIterator);sourceColumnNumber+=this._decodeVLQ(stringCharIterator);if(!stringCharIterator.hasNext()||this._isSeparator(stringCharIterator.peek())){this._mappings.push(new SourceMapEntry(lineNumber,columnNumber,sourceURL,sourceLineNumber,sourceColumnNumber));continue;}
nameIndex+=this._decodeVLQ(stringCharIterator);this._mappings.push(new SourceMapEntry(lineNumber,columnNumber,sourceURL,sourceLineNumber,sourceColumnNumber,names[nameIndex]));}
this._mappings.sort(SourceMapEntry.compare);}
_isSeparator(char){return char===','||char===';';}
_decodeVLQ(stringCharIterator){let result=0;let shift=0;let digit;do{digit=TextSourceMap._base64Map[stringCharIterator.next()];result+=(digit&TextSourceMap._VLQ_BASE_MASK)<<shift;shift+=TextSourceMap._VLQ_BASE_SHIFT;}while(digit&TextSourceMap._VLQ_CONTINUATION_MASK);const negative=result&1;result>>=1;return negative?-result:result;}
reverseMapTextRange(url,textRange){function comparator(position,mapping){if(position.lineNumber!==mapping.sourceLineNumber){return position.lineNumber-mapping.sourceLineNumber;}
return position.columnNumber-mapping.sourceColumnNumber;}
const mappings=this._reversedMappings(url);const startIndex=mappings.lowerBound({lineNumber:textRange.startLine,columnNumber:textRange.startColumn},comparator);const endIndex=mappings.upperBound({lineNumber:textRange.endLine,columnNumber:textRange.endColumn},comparator);const startMapping=mappings[startIndex];const endMapping=mappings[endIndex];return new TextUtils.TextRange(startMapping.lineNumber,startMapping.columnNumber,endMapping.lineNumber,endMapping.columnNumber);}}
TextSourceMap._VLQ_BASE_SHIFT=5;TextSourceMap._VLQ_BASE_MASK=(1<<5)-1;TextSourceMap._VLQ_CONTINUATION_MASK=1<<5;TextSourceMap.StringCharIterator=class{constructor(string){this._string=string;this._position=0;}
next(){return this._string.charAt(this._position++);}
peek(){return this._string.charAt(this._position);}
hasNext(){return this._position<this._string.length;}};TextSourceMap.SourceInfo=class{constructor(content,reverseMappings){this.content=content;this.reverseMappings=reverseMappings;}};TextSourceMap._sourcesListSymbol=Symbol('sourcesList');self.SDK=self.SDK||{};SDK=SDK||{};SDK.SourceMap=SourceMap;SDK.SourceMapV3=SourceMapV3;SDK.SourceMapEntry=SourceMapEntry;SDK.TextSourceMap=TextSourceMap;SDK.SourceMap.EditResult=EditResult;