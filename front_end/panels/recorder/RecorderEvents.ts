// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Models from './models/models.js';

export class ReplayFinishedEvent extends Event {
  static readonly eventName = 'replayfinished';

  constructor() {
    super(ReplayFinishedEvent.eventName, {bubbles: true, composed: true});
  }
}

export class RecordingStateChangedEvent extends Event {
  static readonly eventName = 'recordingstatechanged';

  constructor(public recording: Models.Schema.UserFlow) {
    super(RecordingStateChangedEvent.eventName, {
      bubbles: true,
      composed: true,
    });
  }
}
