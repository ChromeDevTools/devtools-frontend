// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = require('chai');
const {codeForFile} = require('../generate_css_js_files.js');

describe('generating CSS JS files', () => {
  it('minifies code when not in debug mode', async () => {
    const css = `div {
      height: 20px;
    }`;
    const contents = await codeForFile(
        {fileName: 'app.css', isDebug: false, input: css, isLegacy: false, buildTimestamp: Date.now()});
    assert.isTrue(contents.includes('div{height:20px}'));
  });

  it('supports container queries', async () => {
    const css = `
    @container (width<1024px) {
      .test {
        color: #fff;
      }
    }`;
    const contents = await codeForFile(
        {fileName: 'app.css', isDebug: false, input: css, isLegacy: false, buildTimestamp: Date.now()});
    assert.isTrue(contents.includes('@container (width<1024px){.test{color:#fff}}'));
  });

  it('does not minify when debug mode is on', async () => {
    const css = `
    @container (width<1024px) {
      .test {
        color: #fff;
      }
    }`;
    const contents = await codeForFile(
        {fileName: 'app.css', isDebug: true, input: css, isLegacy: false, buildTimestamp: Date.now()});
    assert.isTrue(contents.includes(css));
  });
});
