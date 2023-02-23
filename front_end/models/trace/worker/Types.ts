// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Types from '../types/types.js';
import type * as Handlers from '../handlers/handlers.js';

export type MessageToWorker = {
  action: 'PARSE',
  events: readonly Types.TraceEvents.TraceEventData[],
  freshRecording: boolean,
}|{
  action: 'RESET',
};

export type MessageFromWorker = {
  message: 'PARSE_COMPLETE',
  data: Handlers.Types.HandlerData<typeof Handlers.ModelHandlers>|null,
}|{
  message: 'PARSE_UPDATE',
  index: number,
  total: number,
}|{
  message: 'PARSE_ERROR',
  error: Error,
}|{
  message: 'CONSOLE_DEBUG',
  args: Transferable[],
  method: 'log' | 'warn' | 'error',
};
