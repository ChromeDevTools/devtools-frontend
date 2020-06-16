/* Copyright 2016 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Transform } from "stream";
import { BinaryReader } from "./WasmParser.js";
export { BinaryReaderState, SectionCode } from "./WasmParser.js";
export class BinaryReaderTransform extends Transform {
    constructor() {
        super({
            readableObjectMode: true,
        });
        this._buffer = new ArrayBuffer(1024);
        this._bufferSize = 0;
        this._parser = new BinaryReader();
    }
    _transform(chunk, encoding, callback) {
        var buf = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk, encoding);
        var bufferNeeded = this._bufferSize + buf.length;
        if (bufferNeeded > this._buffer.byteLength) {
            var oldData = new Uint8Array(this._buffer, 0, this._bufferSize);
            var newBuffer = new ArrayBuffer(bufferNeeded);
            new Uint8Array(newBuffer).set(oldData);
            this._buffer = newBuffer;
        }
        var arr = new Uint8Array(this._buffer, 0, bufferNeeded);
        arr.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.length), this._bufferSize);
        this._bufferSize = bufferNeeded;
        var parser = this._parser;
        parser.setData(this._buffer, 0, bufferNeeded, false);
        while (parser.read()) {
            this.push({
                state: parser.state,
                result: parser.result,
            });
        }
        if (parser.position > 0) {
            var left = parser.length - parser.position;
            if (left > 0) {
                arr.set(arr.subarray(parser.position, parser.length));
            }
            this._bufferSize = left;
        }
        callback();
    }
    _flush(callback) {
        var parser = this._parser;
        parser.setData(this._buffer, 0, this._bufferSize, true);
        while (parser.read()) {
            this.push({
                state: parser.state,
                result: parser.result,
            });
        }
        this._bufferSize = 0;
        callback();
    }
}
//# sourceMappingURL=WasmParserTransform.js.map