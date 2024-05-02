// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const enum RecorderActions {
  CreateRecording = 'chrome-recorder.create-recording',
  StartRecording = 'chrome-recorder.start-recording',
  ReplayRecording = 'chrome-recorder.replay-recording',
  ToggleCodeView = 'chrome-recorder.toggle-code-view',
  CopyRecordingOrStep = 'chrome-recorder.copy-recording-or-step',
}
