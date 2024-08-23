// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';

import {Events, type EventSourceMessage, type NetworkRequest} from './NetworkRequest.js';
import {ServerSentEventsParser} from './ServerSentEventsProtocol.js';

/**
 * Server sent events only arrive via CDP (Explicit Network.eventSourceMessageReceived) when
 * the page uses "EventSource" in the code.
 *
 * If the page manually uses 'fetch' or XHR we have to do the protocol parsing
 * ourselves.
 *
 * `ServerSentEvents` is a small helper class that manages this distinction for a specific
 * request, stores the event data and sends out "EventSourceMessageAdded" events for a request.
 */
export class ServerSentEvents {
  readonly #request: NetworkRequest;
  readonly #parser?: ServerSentEventsParser;

  // In the case where we parse the events ourselves we use the time of the last 'dataReceived'
  // event for all the events that come out of the corresponding chunk of data.
  #lastDataReceivedTime: number = 0;

  readonly #eventSourceMessages: EventSourceMessage[] = [];

  constructor(request: NetworkRequest, parseFromStreamedData: boolean) {
    this.#request = request;

    // Only setup parsing if we don't get the events over CDP directly.
    if (parseFromStreamedData) {
      this.#lastDataReceivedTime = request.pseudoWallTime(request.startTime);
      this.#parser = new ServerSentEventsParser(this.#onParserEvent.bind(this), request.charset() ?? undefined);

      // Get the streaming content and add the already received bytes if someone else started
      // the streaming earlier.
      void this.#request.requestStreamingContent().then(streamingContentData => {
        if (!TextUtils.StreamingContentData.isError(streamingContentData)) {
          void this.#parser?.addBase64Chunk(streamingContentData.content().base64);
          streamingContentData.addEventListener(
              TextUtils.StreamingContentData.Events.CHUNK_ADDED, ({data: {chunk}}) => {
                this.#lastDataReceivedTime = request.pseudoWallTime(request.endTime);
                void this.#parser?.addBase64Chunk(chunk);
              });
        }
      });
    }
  }

  get eventSourceMessages(): readonly EventSourceMessage[] {
    return this.#eventSourceMessages;
  }

  /** Forwarded Network.eventSourceMessage received */
  onProtocolEventSourceMessageReceived(eventName: string, data: string, eventId: string, time: number): void {
    this.#recordMessageAndDispatchEvent({
      eventName,
      eventId,
      data,
      time,
    });
  }

  #onParserEvent(eventName: string, data: string, eventId: string): void {
    this.#recordMessageAndDispatchEvent({
      eventName,
      eventId,
      data,
      time: this.#lastDataReceivedTime,
    });
  }

  #recordMessageAndDispatchEvent(message: EventSourceMessage): void {
    this.#eventSourceMessages.push(message);
    this.#request.dispatchEventToListeners(Events.EVENT_SOURCE_MESSAGE_ADDED, message);
  }
}
