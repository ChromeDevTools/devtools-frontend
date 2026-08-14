// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as TextUtils from '../../../../core/text_utils/text_utils.js';
import { ResourceSourceFrame } from './ResourceSourceFrame.js';
import { StreamingContentHexView } from './StreamingContentHexView.js';
export class BinaryResourceViewFactory {
    streamingContent;
    contentUrl;
    resourceType;
    constructor(content, contentUrl, resourceType) {
        this.streamingContent = content;
        this.contentUrl = contentUrl;
        this.resourceType = resourceType;
    }
    hex() {
        const binaryString = window.atob(this.base64());
        const array = Uint8Array.from(binaryString, m => m.codePointAt(0));
        return BinaryResourceViewFactory.#uint8ArrayToHexString(array);
    }
    base64() {
        return this.streamingContent.content().base64;
    }
    utf8() {
        return new TextUtils.ContentData.ContentData(this.base64(), /* isBase64 */ true, 'text/plain', 'utf-8').text;
    }
    createBase64View(element) {
        return new StreamingResourceSourceFrame(this.streamingContent, () => this.base64(), this.contentUrl, this.resourceType, { lineNumbers: false, lineWrapping: true }, element);
    }
    createHexView(element) {
        return new StreamingContentHexView(this.streamingContent, element);
    }
    createUtf8View(element) {
        return new StreamingResourceSourceFrame(this.streamingContent, () => this.utf8(), this.contentUrl, this.resourceType, { lineNumbers: true, lineWrapping: true }, element);
    }
    static #uint8ArrayToHexString(uint8Array) {
        let output = '';
        for (let i = 0; i < uint8Array.length; i++) {
            output += BinaryResourceViewFactory.#numberToHex(uint8Array[i], 2);
        }
        return output;
    }
    static #numberToHex(number, padding) {
        let hex = number.toString(16);
        while (hex.length < padding) {
            hex = '0' + hex;
        }
        return hex;
    }
}
class StreamingResourceSourceFrame extends ResourceSourceFrame {
    #streamingContent;
    #getContent;
    constructor(streamingContent, getContent, contentUrl, resourceType, options, element) {
        super(TextUtils.StaticContentProvider.StaticContentProvider.fromString(contentUrl, resourceType, getContent()), resourceType.canonicalMimeType(), options, element);
        this.#streamingContent = streamingContent;
        this.#getContent = getContent;
    }
    wasShown() {
        super.wasShown();
        this.#streamingContent.addEventListener("ChunkAdded" /* TextUtils.StreamingContentData.Events.CHUNK_ADDED */, this.#onChunkAdded, this);
    }
    willHide() {
        super.willHide();
        this.#streamingContent.removeEventListener("ChunkAdded" /* TextUtils.StreamingContentData.Events.CHUNK_ADDED */, this.#onChunkAdded, this);
    }
    #onChunkAdded() {
        void this.setContent(this.#getContent());
    }
}
//# sourceMappingURL=BinaryResourceViewFactory.js.map