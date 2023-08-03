import { addEventListener, debugError, removeEventListeners, } from '../common/util.js';
import { assert } from '../util/assert.js';
/**
 * @internal
 */
export class PipeTransport {
    #pipeWrite;
    #eventListeners;
    #isClosed = false;
    #pendingMessage = '';
    onclose;
    onmessage;
    constructor(pipeWrite, pipeRead) {
        this.#pipeWrite = pipeWrite;
        this.#eventListeners = [
            addEventListener(pipeRead, 'data', buffer => {
                return this.#dispatch(buffer);
            }),
            addEventListener(pipeRead, 'close', () => {
                if (this.onclose) {
                    this.onclose.call(null);
                }
            }),
            addEventListener(pipeRead, 'error', debugError),
            addEventListener(pipeWrite, 'error', debugError),
        ];
    }
    send(message) {
        assert(!this.#isClosed, '`PipeTransport` is closed.');
        this.#pipeWrite.write(message);
        this.#pipeWrite.write('\0');
    }
    #dispatch(buffer) {
        assert(!this.#isClosed, '`PipeTransport` is closed.');
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
        removeEventListeners(this.#eventListeners);
    }
}
//# sourceMappingURL=PipeTransport.js.map