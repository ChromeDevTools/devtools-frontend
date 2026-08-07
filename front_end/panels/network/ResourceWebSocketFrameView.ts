// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {BinaryResourceView} from './BinaryResourceView.js';
import {DataGridItem, ResourceChunkView} from './ResourceChunkView.js';

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
   * @description WebSocket opcode (operation code) name for a continuation frame in WebSocket messages view of the Network panel. In the WebSocket protocol, an opcode defines the frame payload type; continuation frames split large messages into multiple chunks.
   */
  continuationFrame: 'Continuation frame',
  /**
   * @description WebSocket opcode (operation code) name for a text message frame in WebSocket messages view of the Network panel. In the WebSocket protocol, an opcode defines the frame payload type.
   */
  textMessage: 'Text message',
  /**
   * @description WebSocket opcode (operation code) name for a binary message frame in WebSocket messages view of the Network panel. In the WebSocket protocol, an opcode defines the frame payload type.
   */
  binaryMessage: 'Binary message',
  /**
   * @description WebSocket opcode (operation code) name for a connection close frame in WebSocket messages view of the Network panel. In the WebSocket protocol, an opcode defines the frame payload type.
   */
  connectionCloseMessage: 'Connection close message',
  /**
   * @description WebSocket opcode (operation code) name for a ping frame in WebSocket messages view of the Network panel. In the WebSocket protocol, an opcode defines the frame payload type; ping frames check connection liveness.
   */
  pingMessage: 'Ping message',
  /**
   * @description WebSocket opcode (operation code) name for a pong frame in WebSocket messages view of the Network panel. In the WebSocket protocol, an opcode defines the frame payload type; pong frames reply to ping frames.
   */
  pongMessage: 'Pong message',
  /**
   * @description Accessible name for WebSocket message data grid in WebSocket messages view of the Network panel.
   */
  webSocketFrame: 'WebSocket frame',
  /**
   * @description Text shown when a value is not available in WebSocket messages view of the Network panel.
   */
  na: 'N/A',
  /**
   * @description Placeholder text for filter input in WebSocket messages view of the Network panel.
   */
  filterUsingRegex: 'Filter using regex (example: (web)?socket)',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/ResourceWebSocketFrameView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class ResourceWebSocketFrameView extends ResourceChunkView<SDK.NetworkRequest.WebSocketFrame> {
  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super(request, 'network-web-socket-message-filter', 'resource-web-socket-frame-split-view-state',
          i18nString(UIStrings.webSocketFrame), i18nString(UIStrings.filterUsingRegex),
          {jslog: `${VisualLogging.pane('web-socket-messages').track({resize: true})}`});
  }

  override getRequestChunks(): SDK.NetworkRequest.WebSocketFrame[] {
    return this.request.frames();
  }
  override createGridItem(frame: SDK.NetworkRequest.WebSocketFrame): DataGridItem {
    return new ResourceFrameNode(frame);
  }

  override chunkFilter(frame: SDK.NetworkRequest.WebSocketFrame): boolean {
    if (this.filterType && frame.type !== this.filterType) {
      return false;
    }
    return !this.filterRegex || this.filterRegex.test(frame.text);
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
    this.request.addEventListener(SDK.NetworkRequest.Events.WEBSOCKET_FRAME_ADDED, this.onWebSocketFrameAdded, this);
  }

  override willHide(): void {
    super.willHide();
    this.request.removeEventListener(SDK.NetworkRequest.Events.WEBSOCKET_FRAME_ADDED, this.onWebSocketFrameAdded, this);
  }

  private onWebSocketFrameAdded(event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.WebSocketFrame>): void {
    this.chunkAdded(event.data);
  }

  static opCodeDescription(opCode: number, mask: boolean): string {
    const localizedDescription = opCodeDescriptions[opCode] || (() => '');
    if (mask) {
      return i18nString(UIStrings.sOpcodeSMask, {PH1: localizedDescription(), PH2: opCode});
    }
    return i18nString(UIStrings.sOpcodeS, {PH1: localizedDescription(), PH2: opCode});
  }
}

const enum OpCodes {
  CONTINUATION_FRAME = 0,
  TEXT_FRAME = 1,
  BINARY_FRAME = 2,
  CONNECTION_CLOSE_FRAME = 8,
  PING_FRAME = 9,
  PONG_FRAME = 10,
}

const opCodeDescriptions: Array<() => string> = (function(): Array<() => Common.UIString.LocalizedString> {
  const map = [];
  map[OpCodes.CONTINUATION_FRAME] = i18nLazyString(UIStrings.continuationFrame);
  map[OpCodes.TEXT_FRAME] = i18nLazyString(UIStrings.textMessage);
  map[OpCodes.BINARY_FRAME] = i18nLazyString(UIStrings.binaryMessage);
  map[OpCodes.CONNECTION_CLOSE_FRAME] = i18nLazyString(UIStrings.connectionCloseMessage);
  map[OpCodes.PING_FRAME] = i18nLazyString(UIStrings.pingMessage);
  map[OpCodes.PONG_FRAME] = i18nLazyString(UIStrings.pongMessage);
  return map;
})();

class ResourceFrameNode extends DataGridItem {
  readonly frame: SDK.NetworkRequest.WebSocketFrame;
  override readonly isTextFrame: boolean;
  #dataText: string;
  #binaryView: BinaryResourceView|null = null;
  override readonly data: Record<string, string|HTMLElement>;
  override readonly cssClass?: string;

  constructor(frame: SDK.NetworkRequest.WebSocketFrame) {
    super();
    let length = String(frame.text.length);

    let dataText: string = frame.text;
    let description = ResourceWebSocketFrameView.opCodeDescription(frame.opCode, frame.mask);
    const isTextFrame = frame.opCode === OpCodes.TEXT_FRAME;

    if (frame.type === SDK.NetworkRequest.WebSocketFrameType.Error) {
      description = dataText;
      length = i18nString(UIStrings.na);
    } else if (isTextFrame) {
      description = dataText;
    } else if (frame.opCode === OpCodes.BINARY_FRAME) {
      length = i18n.ByteUtilities.bytesToString(Platform.StringUtilities.base64ToSize(frame.text));
      description = opCodeDescriptions[frame.opCode]();
    } else {
      dataText = description;
    }

    this.frame = frame;
    this.isTextFrame = isTextFrame;
    this.#dataText = dataText;

    this.data = {
      data: description,
      length,
    };

    if (frame.type === SDK.NetworkRequest.WebSocketFrameType.Error) {
      this.cssClass = 'resource-chunk-view-row-error';
    } else if (frame.type === SDK.NetworkRequest.WebSocketFrameType.Send) {
      this.cssClass = 'resource-chunk-view-row-send';
    } else if (frame.type === SDK.NetworkRequest.WebSocketFrameType.Receive) {
      this.cssClass = 'resource-chunk-view-row-receive';
    }
  }

  override dataText(): string {
    return this.#dataText;
  }

  override binaryView(): BinaryResourceView|null {
    if (this.isTextFrame || this.frame.type === SDK.NetworkRequest.WebSocketFrameType.Error) {
      return null;
    }

    if (!this.#binaryView) {
      if (this.#dataText.length > 0) {
        this.#binaryView = new BinaryResourceView(
            TextUtils.StreamingContentData.StreamingContentData.from(
                new TextUtils.ContentData.ContentData(this.#dataText, true, 'applicaiton/octet-stream')),
            Platform.DevToolsPath.EmptyUrlString, Common.ResourceType.resourceTypes.WebSocket);
      }
    }
    return this.#binaryView;
  }

  override getTime(): number {
    return this.frame.time;
  }
}
