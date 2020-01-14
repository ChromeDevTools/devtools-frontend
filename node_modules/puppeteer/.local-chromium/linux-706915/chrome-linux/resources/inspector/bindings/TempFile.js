export default class TempFile{constructor(){this._lastBlob=null;}
write(pieces){if(this._lastBlob){pieces.unshift(this._lastBlob);}
this._lastBlob=new Blob(pieces,{type:'text/plain'});}
read(){return this.readRange();}
size(){return this._lastBlob?this._lastBlob.size:0;}
async readRange(startOffset,endOffset){if(!this._lastBlob){Common.console.error('Attempt to read a temp file that was never written');return Promise.resolve('');}
const blob=typeof startOffset==='number'||typeof endOffset==='number'?this._lastBlob.slice((startOffset),(endOffset)):this._lastBlob;const reader=new FileReader();try{await new Promise((resolve,reject)=>{reader.onloadend=resolve;reader.onerror=reject;reader.readAsText(blob);});}catch(error){Common.console.error('Failed to read from temp file: '+error.message);}
return(reader.result);}
copyToOutputStream(outputStream,progress){if(!this._lastBlob){outputStream.close();return Promise.resolve((null));}
const reader=new Bindings.ChunkedFileReader((this._lastBlob),10*1000*1000,progress);return reader.read(outputStream).then(success=>success?null:reader.error());}
remove(){this._lastBlob=null;}}
export class TempFileBackingStorage{constructor(){this._file=null;this._strings;this._stringsLength;this.reset();}
appendString(string){this._strings.push(string);this._stringsLength+=string.length;const flushStringLength=10*1024*1024;if(this._stringsLength>flushStringLength){this._flush();}}
appendAccessibleString(string){this._flush();const startOffset=this._file.size();this._strings.push(string);this._flush();return this._file.readRange.bind(this._file,startOffset,this._file.size());}
_flush(){if(!this._strings.length){return;}
if(!this._file){this._file=new TempFile();}
this._stringsLength=0;this._file.write(this._strings.splice(0));}
finishWriting(){this._flush();}
reset(){if(this._file){this._file.remove();}
this._file=null;this._strings=[];this._stringsLength=0;}
writeToStream(outputStream){return this._file?this._file.copyToOutputStream(outputStream):Promise.resolve(null);}}
self.Bindings=self.Bindings||{};Bindings=Bindings||{};Bindings.TempFile=TempFile;Bindings.TempFileBackingStorage=TempFileBackingStorage;Bindings.TempFileBackingStorage.Chunk;