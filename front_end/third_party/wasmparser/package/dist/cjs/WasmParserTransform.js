"use strict";
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinaryReaderTransform = void 0;
var stream_1 = require("stream");
var WasmParser_js_1 = require("./WasmParser.js");
var WasmParser_js_2 = require("./WasmParser.js");
Object.defineProperty(exports, "BinaryReaderState", { enumerable: true, get: function () { return WasmParser_js_2.BinaryReaderState; } });
Object.defineProperty(exports, "SectionCode", { enumerable: true, get: function () { return WasmParser_js_2.SectionCode; } });
var BinaryReaderTransform = /** @class */ (function (_super) {
    __extends(BinaryReaderTransform, _super);
    function BinaryReaderTransform() {
        var _this = _super.call(this, {
            readableObjectMode: true,
        }) || this;
        _this._buffer = new ArrayBuffer(1024);
        _this._bufferSize = 0;
        _this._parser = new WasmParser_js_1.BinaryReader();
        return _this;
    }
    BinaryReaderTransform.prototype._transform = function (chunk, encoding, callback) {
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
    };
    BinaryReaderTransform.prototype._flush = function (callback) {
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
    };
    return BinaryReaderTransform;
}(stream_1.Transform));
exports.BinaryReaderTransform = BinaryReaderTransform;
//# sourceMappingURL=WasmParserTransform.js.map