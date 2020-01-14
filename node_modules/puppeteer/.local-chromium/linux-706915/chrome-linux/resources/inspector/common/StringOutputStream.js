export class OutputStream{async write(data){}
async close(){}}
export default class StringOutputStream{constructor(){this._data='';}
async write(chunk){this._data+=chunk;}
async close(){}
data(){return this._data;}}
self.Common=self.Common||{};Common=Common||{};Common.OutputStream=OutputStream;Common.StringOutputStream=StringOutputStream;