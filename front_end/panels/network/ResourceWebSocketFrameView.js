// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/*
 * Copyright (C) 2012 Research In Motion Limited. All rights reserved.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
 */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { BinaryResourceView } from './BinaryResourceView.js';
import { DataGridItem, ResourceChunkView } from './ResourceChunkView.js';
const UIStrings = {
    /**
     * @description Text in Resource Web Socket Frame View of the Network panel. Displays which Opcode
     * is relevant to a particular operation. 'mask' indicates that the Opcode used a mask, which is a
     * way of modifying a value by overlaying another value on top of it, partially covering/changing
     * it, hence 'masking' it.
     * https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
     * @example {Localized name of the Opcode} PH1
     * @example {0} PH2
     */
    sOpcodeSMask: '{PH1} (Opcode {PH2}, mask)',
    /**
     * @description Text in Resource Web Socket Frame View of the Network panel. Displays which Opcode
     * is relevant to a particular operation.
     * @example {Localized name of the Opcode} PH1
     * @example {0} PH2
     */
    sOpcodeS: '{PH1} (Opcode {PH2})',
    /**
     * @description Op codes continuation frame of map in Resource Web Socket Frame View of the Network panel
     */
    continuationFrame: 'Continuation Frame',
    /**
     * @description Op codes text frame of map in Resource Web Socket Frame View of the Network panel
     */
    textMessage: 'Text Message',
    /**
     * @description Op codes binary frame of map in Resource Web Socket Frame View of the Network panel
     */
    binaryMessage: 'Binary Message',
    /**
     * @description Op codes continuation frame of map in Resource Web Socket Frame View of the Network panel indicating that the web socket connection has been closed.
     */
    connectionCloseMessage: 'Connection Close Message',
    /**
     * @description Op codes ping frame of map in Resource Web Socket Frame View of the Network panel
     */
    pingMessage: 'Ping Message',
    /**
     * @description Op codes pong frame of map in Resource Web Socket Frame View of the Network panel
     */
    pongMessage: 'Pong Message',
    /**
     * @description Data grid name for Web Socket Frame data grids
     */
    webSocketFrame: 'Web Socket Frame',
    /**
     * @description Text for something not available
     */
    na: 'N/A',
    /**
     * @description Example for placeholder text
     */
    filterUsingRegex: 'Filter using regex (example: (web)?socket)',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/ResourceWebSocketFrameView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export class ResourceWebSocketFrameView extends ResourceChunkView {
    constructor(request) {
        super(request, 'network-web-socket-message-filter', 'resource-web-socket-frame-split-view-state', i18nString(UIStrings.webSocketFrame), i18nString(UIStrings.filterUsingRegex));
        this.element.setAttribute('jslog', `${VisualLogging.pane('web-socket-messages').track({ resize: true })}`);
    }
    getRequestChunks() {
        return this.request.frames();
    }
    createGridItem(frame) {
        return new ResourceFrameNode(frame);
    }
    chunkFilter(frame) {
        if (this.filterType && frame.type !== this.filterType) {
            return false;
        }
        return !this.filterRegex || this.filterRegex.test(frame.text);
    }
    wasShown() {
        super.wasShown();
        this.refresh();
        this.request.addEventListener(SDK.NetworkRequest.Events.WEBSOCKET_FRAME_ADDED, this.onWebSocketFrameAdded, this);
    }
    willHide() {
        super.willHide();
        this.request.removeEventListener(SDK.NetworkRequest.Events.WEBSOCKET_FRAME_ADDED, this.onWebSocketFrameAdded, this);
    }
    onWebSocketFrameAdded(event) {
        this.chunkAdded(event.data);
    }
    static opCodeDescription(opCode, mask) {
        const localizedDescription = opCodeDescriptions[opCode] || (() => '');
        if (mask) {
            return i18nString(UIStrings.sOpcodeSMask, { PH1: localizedDescription(), PH2: opCode });
        }
        return i18nString(UIStrings.sOpcodeS, { PH1: localizedDescription(), PH2: opCode });
    }
}
const opCodeDescriptions = (function () {
    const map = [];
    map[0 /* OpCodes.CONTINUATION_FRAME */] = i18nLazyString(UIStrings.continuationFrame);
    map[1 /* OpCodes.TEXT_FRAME */] = i18nLazyString(UIStrings.textMessage);
    map[2 /* OpCodes.BINARY_FRAME */] = i18nLazyString(UIStrings.binaryMessage);
    map[8 /* OpCodes.CONNECTION_CLOSE_FRAME */] = i18nLazyString(UIStrings.connectionCloseMessage);
    map[9 /* OpCodes.PING_FRAME */] = i18nLazyString(UIStrings.pingMessage);
    map[10 /* OpCodes.PONG_FRAME */] = i18nLazyString(UIStrings.pongMessage);
    return map;
})();
class ResourceFrameNode extends DataGridItem {
    frame;
    isTextFrame;
    #dataText;
    #binaryView;
    constructor(frame) {
        let length = String(frame.text.length);
        const time = new Date(frame.time * 1000);
        const timeText = ('0' + time.getHours()).substr(-2) + ':' + ('0' + time.getMinutes()).substr(-2) + ':' +
            ('0' + time.getSeconds()).substr(-2) + '.' + ('00' + time.getMilliseconds()).substr(-3);
        const timeNode = document.createElement('div');
        UI.UIUtils.createTextChild(timeNode, timeText);
        UI.Tooltip.Tooltip.install(timeNode, time.toLocaleString());
        let dataText = frame.text;
        let description = ResourceWebSocketFrameView.opCodeDescription(frame.opCode, frame.mask);
        const isTextFrame = frame.opCode === 1 /* OpCodes.TEXT_FRAME */;
        if (frame.type === SDK.NetworkRequest.WebSocketFrameType.Error) {
            description = dataText;
            length = i18nString(UIStrings.na);
        }
        else if (isTextFrame) {
            description = dataText;
        }
        else if (frame.opCode === 2 /* OpCodes.BINARY_FRAME */) {
            length = i18n.ByteUtilities.bytesToString(Platform.StringUtilities.base64ToSize(frame.text));
            description = opCodeDescriptions[frame.opCode]();
        }
        else {
            dataText = description;
        }
        super({ data: description, length, time: timeNode });
        this.frame = frame;
        this.isTextFrame = isTextFrame;
        this.#dataText = dataText;
        this.#binaryView = null;
    }
    createCells(element) {
        element.classList.toggle('resource-chunk-view-row-error', this.frame.type === SDK.NetworkRequest.WebSocketFrameType.Error);
        element.classList.toggle('resource-chunk-view-row-send', this.frame.type === SDK.NetworkRequest.WebSocketFrameType.Send);
        element.classList.toggle('resource-chunk-view-row-receive', this.frame.type === SDK.NetworkRequest.WebSocketFrameType.Receive);
        super.createCells(element);
    }
    nodeSelfHeight() {
        return 21;
    }
    dataText() {
        return this.#dataText;
    }
    binaryView() {
        if (this.isTextFrame || this.frame.type === SDK.NetworkRequest.WebSocketFrameType.Error) {
            return null;
        }
        if (!this.#binaryView) {
            if (this.#dataText.length > 0) {
                this.#binaryView = new BinaryResourceView(TextUtils.StreamingContentData.StreamingContentData.from(new TextUtils.ContentData.ContentData(this.#dataText, true, 'applicaiton/octet-stream')), Platform.DevToolsPath.EmptyUrlString, Common.ResourceType.resourceTypes.WebSocket);
            }
        }
        return this.#binaryView;
    }
    getTime() {
        return this.frame.time;
    }
}
//# sourceMappingURL=ResourceWebSocketFrameView.js.map