// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as VisualLogging from './visual_logging-testing.js';

describe('LoggingDriver', () => {
  it('builds a debug string', () => {
    assert.strictEqual(VisualLogging.Debugging.debugString({ve: 1}), 'TreeItem');
    assert.strictEqual(VisualLogging.Debugging.debugString({ve: 1, context: '42'}), 'TreeItem; context: 42');
    assert.strictEqual(VisualLogging.Debugging.debugString({ve: 1, track: {click: true}}), 'TreeItem; track: click');
    assert.strictEqual(
        VisualLogging.Debugging.debugString({ve: 1, track: {click: true, change: true}}),
        'TreeItem; track: click, change');
    assert.strictEqual(
        VisualLogging.Debugging.debugString({ve: 1, track: {keydown: 'Enter'}}), 'TreeItem; track: keydown: Enter');
    assert.strictEqual(
        VisualLogging.Debugging.debugString({ve: 1, context: '42', track: {keydown: 'Enter'}}),
        'TreeItem; context: 42; track: keydown: Enter');
  });
});
