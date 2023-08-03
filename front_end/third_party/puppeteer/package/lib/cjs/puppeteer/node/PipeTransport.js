"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipeTransport = void 0;
const util_js_1 = require("../common/util.js");
const assert_js_1 = require("../util/assert.js");
/**
 * @internal
 */
class PipeTransport {
    #pipeWrite;
    #eventListeners;
    #isClosed = false;
    #pendingMessage = '';
    onclose;
    onmessage;
    constructor(pipeWrite, pipeRead) {
        this.#pipeWrite = pipeWrite;
        this.#eventListeners = [
            (0, util_js_1.addEventListener)(pipeRead, 'data', buffer => {
                return this.#dispatch(buffer);
            }),
            (0, util_js_1.addEventListener)(pipeRead, 'close', () => {
                if (this.onclose) {
                    this.onclose.call(null);
                }
            }),
            (0, util_js_1.addEventListener)(pipeRead, 'error', util_js_1.debugError),
            (0, util_js_1.addEventListener)(pipeWrite, 'error', util_js_1.debugError),
        ];
    }
    send(message) {
        (0, assert_js_1.assert)(!this.#isClosed, '`PipeTransport` is closed.');
        this.#pipeWrite.write(message);
        this.#pipeWrite.write('\0');
    }
    #dispatch(buffer) {
        (0, assert_js_1.assert)(!this.#isClosed, '`PipeTransport` is closed.');
        let end = buffer.indexOf('\0');
        if (end === -1) {
            this.#pendingMessage += buffer.toString();
            return;
        }
        const message = this.#pendingMessage + buffer.toString(undefined, 0, end);
        if (this.onmessage) {
            this.onmessage.call(null, message);
        }
        let start = end + 1;
        end = buffer.indexOf('\0', start);
        while (end !== -1) {
            if (this.onmessage) {
                this.onmessage.call(null, buffer.toString(undefined, start, end));
            }
            start = end + 1;
            end = buffer.indexOf('\0', start);
        }
        this.#pendingMessage = buffer.toString(undefined, start);
    }
    close() {
        this.#isClosed = true;
        (0, util_js_1.removeEventListeners)(this.#eventListeners);
    }
}
exports.PipeTransport = PipeTransport;
//# sourceMappingURL=PipeTransport.js.map