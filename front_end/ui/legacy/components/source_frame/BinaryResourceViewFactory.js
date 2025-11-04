// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
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
    createBase64View() {
        const resourceFrame = new ResourceSourceFrame(TextUtils.StaticContentProvider.StaticContentProvider.fromString(this.contentUrl, this.resourceType, this.streamingContent.content().base64), this.resourceType.canonicalMimeType(), { lineNumbers: false, lineWrapping: true });
        this.streamingContent.addEventListener("ChunkAdded" /* TextUtils.StreamingContentData.Events.CHUNK_ADDED */, () => {
            void resourceFrame.setContent(this.base64());
        });
        return resourceFrame;
    }
    createHexView() {
        return new StreamingContentHexView(this.streamingContent);
    }
    createUtf8View() {
        const resourceFrame = new ResourceSourceFrame(TextUtils.StaticContentProvider.StaticContentProvider.fromString(this.contentUrl, this.resourceType, this.utf8()), this.resourceType.canonicalMimeType(), { lineNumbers: true, lineWrapping: true });
        this.streamingContent.addEventListener("ChunkAdded" /* TextUtils.StreamingContentData.Events.CHUNK_ADDED */, () => {
            void resourceFrame.setContent(this.utf8());
        });
        return resourceFrame;
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
//# sourceMappingURL=BinaryResourceViewFactory.js.map