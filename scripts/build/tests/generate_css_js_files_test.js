// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = require('chai');
const {codeForFile} = require('../generate_css_js_files.js');

describe('generating CSS JS files', () => {
  it('minifies code when not in debug mode', () => {
    const css = `div {
      height: 20px;
    }`;
    const contents =
        codeForFile({fileName: 'app.css', isDebug: false, input: css, isLegacy: false, buildTimestamp: Date.now()});
    assert.isTrue(contents.includes('div{height:20px}'));
  });

  it('respects clean-css ignore comments', () => {
    const css = `
    /* clean-css ignore:start */
    div {
      height: 20px;
    }
    /* clean-css ignore:end */
    otherDiv {
      width: 20px;
    }`;
    const contents =
        codeForFile({fileName: 'app.css', isDebug: false, input: css, isLegacy: false, buildTimestamp: Date.now()});
    assert.isTrue(contents.includes(`div {
      height: 20px;
    }`));
  });

  it('does not strip container queries wrapped in clean-css ignore', () => {
    const css = `
    /* clean-css ignore:start */
    @container (width<1024px) {
      .test {
        color: #fff;
      }
    }
    /* clean-css ignore:end */
    `;
    const contents =
        codeForFile({fileName: 'app.css', isDebug: false, input: css, isLegacy: false, buildTimestamp: Date.now()});
    assert.isTrue(contents.includes(`@container (width<1024px) {
      .test {
        color: #fff;
      }
    }`));
  });
});
