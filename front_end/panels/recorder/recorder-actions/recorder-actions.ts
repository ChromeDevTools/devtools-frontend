// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const enum RecorderActions {
  CREATE_RECORDING = 'chrome-recorder.create-recording',
  START_RECORDING = 'chrome-recorder.start-recording',
  REPLAY_RECORDING = 'chrome-recorder.replay-recording',
  TOGGLE_CODE_VIEW = 'chrome-recorder.toggle-code-view',
  COPY_RECORDING_OR_STEP = 'chrome-recorder.copy-recording-or-step',
}
