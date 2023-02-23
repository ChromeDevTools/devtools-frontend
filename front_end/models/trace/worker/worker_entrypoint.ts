// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Processor from './Processor.js';
import type * as Types from './Types.js';
import * as Platform from '../../../core/platform/platform.js';

self.postMessage('workerReady');

const processor = Processor.TraceProcessor.create();
// Send a message back from the worker. Exists purely to provide some type
// safety around the messages we send.
function sendMessage(event: Types.MessageFromWorker): void {
  self.postMessage(event);
}

// Karma is unable to access console messages that run within the worker.
// Therefore, when running in the terminal, we do not see any console messages
// that are logged from the worker. This is problematic when working on tests
// and using console.log messages to debug because you cannot see the output.
// To resolve this, we mock out the relevant methods to send data over
// postMessage, and the code that listens for these messages then logs them in
// the main thread context.
(self.console as Partial<typeof console>) = {
  error(...args: Transferable[]): void {
    sendMessage({
      message: 'CONSOLE_DEBUG',
      method: 'error',
      args,
    });
  },
  log(...args: Transferable[]): void {
    sendMessage({
      message: 'CONSOLE_DEBUG',
      method: 'log',
      args,
    });
  },
  warn(...args: Transferable[]): void {
    sendMessage({
      message: 'CONSOLE_DEBUG',
      method: 'warn',
      args,
    });
  },
};

processor.addEventListener(Processor.TraceParseProgressEvent.eventName, (event: Event) => {
  const updateEvent = event as Processor.TraceParseProgressEvent;
  sendMessage({message: 'PARSE_UPDATE', ...updateEvent.data});
});

self.onmessage = async function(event: MessageEvent): Promise<void> {
  if (!event.data.action) {
    return;
  }

  const message = event.data as Types.MessageToWorker;
  switch (message.action) {
    case 'PARSE': {
      try {
        await processor.parse(event.data.events, event.data.freshRecording);
        sendMessage({message: 'PARSE_COMPLETE', data: processor.data});
      } catch (error) {
        sendMessage({message: 'PARSE_ERROR', error});
      } finally {
        break;
      }
    }
    case 'RESET': {
      processor.reset();
      break;
    }
    default:
      Platform.assertNever(message, `Unknown trace worker message ${JSON.stringify(message)}`);
  }
};
