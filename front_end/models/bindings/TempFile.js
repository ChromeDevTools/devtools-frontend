// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import { ChunkedFileReader } from './FileUtils.js';
export class TempFile {
    #lastBlob;
    constructor() {
        this.#lastBlob = null;
    }
    write(pieces) {
        if (this.#lastBlob) {
            pieces.unshift(this.#lastBlob);
        }
        this.#lastBlob = new Blob(pieces, { type: 'text/plain' });
    }
    read() {
        return this.readRange();
    }
    size() {
        return this.#lastBlob ? this.#lastBlob.size : 0;
    }
    async readRange(startOffset, endOffset) {
        if (!this.#lastBlob) {
            Common.Console.Console.instance().error('Attempt to read a temp file that was never written');
            return '';
        }
        const blob = typeof startOffset === 'number' || typeof endOffset === 'number' ?
            this.#lastBlob.slice(startOffset, endOffset) :
            this.#lastBlob;
        const reader = new FileReader();
        try {
            await new Promise((resolve, reject) => {
                reader.onloadend = resolve;
                reader.onerror = reject;
                reader.readAsText(blob);
            });
        }
        catch (error) {
            Common.Console.Console.instance().error('Failed to read from temp file: ' + error.message);
        }
        return reader.result;
    }
    async copyToOutputStream(outputStream, progress) {
        if (!this.#lastBlob) {
            void outputStream.close();
            return null;
        }
        const reader = new ChunkedFileReader(this.#lastBlob, 10 * 1000 * 1000, progress);
        return await reader.read(outputStream).then(success => success ? null : reader.error());
    }
    remove() {
        this.#lastBlob = null;
    }
}
//# sourceMappingURL=TempFile.js.map