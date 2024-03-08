// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as InlineEditor from './inline_editor.js';

describe('CSSLength', () => {
  it('parses lengths correctly', () => {
    const parseLength = (input: string, expected: string|undefined) => {
      assert.strictEqual(InlineEditor.CSSShadowEditor.CSSLength.parse(input)?.asCSSText(), expected);
    };
    parseLength('10px', '10px');
    parseLength('10PX', '10PX');
    parseLength('-10px', '-10px');
    parseLength('+10px', '10px');
    parseLength('10.11px', '10.11px');
    parseLength('.11px', '0.11px');
    parseLength('10e3px', '10000px');
    parseLength('10E3px', '10000px');
    parseLength('10.11e3px', '10110px');
    parseLength('-10.11e-3px', '-0.01011px');
    parseLength('0px', '0px');
    parseLength('0', '0');
    parseLength('-0.0', '0');
    parseLength('+0.0', '0');
    parseLength('0e-3', '0');

    parseLength('', undefined);
    parseLength('10', undefined);
    parseLength('10 px', undefined);
    parseLength('10.px', undefined);
    parseLength('10pxx', undefined);
    parseLength('10.10.10px', undefined);
    parseLength('hello10pxhello', undefined);
  });
});
