// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as UI from '../../../../front_end/ui/ui.js';

describe('SyntaxHighlighter', () => {
  it('can be instantiated correctly', () => {
    const syntaxHighlighter = new UI.SyntaxHighlighter.SyntaxHighlighter('TestMimeType', true);
    const result = syntaxHighlighter.createSpan('TestContent', 'TestClass');
    assert.strictEqual(result.tagName, 'SPAN', 'span element was not created correctly');
    assert.strictEqual(result.getAttribute('class'), 'cm-TestClass', 'class was not set correctly');
    assert.strictEqual(result.innerHTML, 'TestContent', 'content was not set correctly');
  });

  // TODO continue writing tests here or use another describe block
});
