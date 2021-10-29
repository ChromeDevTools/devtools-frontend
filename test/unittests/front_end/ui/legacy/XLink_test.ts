// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import * as LitHtml from '../../../../../front_end/ui/lit-html/lit-html.js';

const {assert} = chai;

describe('XLink', () => {
  describe('HTML minification', () => {
    it('properly minifies whitespaces in release mode', () => {
      const target = document.createElement('section');
      LitHtml.render(UI.XLink.sample, target);
      const result = target.querySelector('p')?.innerText;
      assert.strictEqual(result, 'Hello, world!');
    });
  });
});
