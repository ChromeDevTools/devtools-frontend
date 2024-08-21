// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Freestyler from './freestyler.js';

describe('ChangeManager', () => {
  it('can register a change', () => {
    const changeManager = new Freestyler.ChangeManager();
    changeManager.addChange({
      selector: 'div',
      styles: 'color: blue;',
    });
    assert.strictEqual(changeManager.buildStyleSheet(), `.ai-assistant-change {
  div& {
    color: blue;
  }
}`);
  });
  it('can register multiple changes with different selectors', () => {
    const changeManager = new Freestyler.ChangeManager();
    changeManager.addChange({
      selector: 'div',
      styles: 'color: blue;',
    });
    changeManager.addChange({
      selector: 'body',
      styles: 'color: green;',
    });
    assert.strictEqual(changeManager.buildStyleSheet(), `.ai-assistant-change {
  div& {
    color: blue;
  }
  body& {
    color: green;
  }
}`);
  });

  it('can register multiple changes with the same selector', () => {
    const changeManager = new Freestyler.ChangeManager();
    changeManager.addChange({
      selector: 'div',
      styles: 'color: blue;',
    });
    changeManager.addChange({
      selector: 'div',
      styles: 'color: green;',
    });
    assert.strictEqual(changeManager.buildStyleSheet(), `.ai-assistant-change {
  div& {
    color: blue;
  }
  div& {
    color: green;
  }
}`);
  });
});
