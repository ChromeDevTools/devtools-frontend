// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from './legacy.js';

describe('KeyboardShortcut', () => {
  it('can be instantiated', () => {
    const descriptors = [{key: 587, name: 'Ctrl + K'}, {key: 595, name: 'Ctrl + S'}];
    const shortcut = new UI.KeyboardShortcut.KeyboardShortcut(
        descriptors, 'settings.shortcuts', UI.KeyboardShortcut.Type.DEFAULT_SHORTCUT);
    assert.deepEqual(shortcut.descriptors, descriptors, 'descriptors should be set');
    assert.strictEqual(shortcut.action, 'settings.shortcuts', 'action should be set');
  });

  it('creates a title', () => {
    const descriptors = [{key: 587, name: 'Ctrl + K'}, {key: 595, name: 'Ctrl + S'}];
    const shortcut = new UI.KeyboardShortcut.KeyboardShortcut(
        descriptors, 'settings.shortcuts', UI.KeyboardShortcut.Type.DEFAULT_SHORTCUT);
    assert.strictEqual(shortcut.title(), 'Ctrl + K Ctrl + S');
  });

  it('can make a key from an event', () => {
    const event = new KeyboardEvent('keydown', {key: 'ArrowDown', keyCode: 40} as KeyboardEventInit);
    const key = UI.KeyboardShortcut.KeyboardShortcut.makeKeyFromEvent(event);
    assert.strictEqual(key, 40);
  });
});
