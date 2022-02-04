// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = require('chai');
const path = require('path');

const {devtoolsPlugin} = require('../devtools_plugin.js');

describe('devtools_plugin can compute paths with', () => {
  it('same directory import', () => {
    assert.deepEqual(
        devtoolsPlugin('./AnotherFile.js', 'front_end/core/sdk/FirstFile.js'),
        {id: path.join('front_end', 'core', 'sdk', 'AnotherFile.js'), external: false});
  });

  it('different directory import', () => {
    assert.deepEqual(
        devtoolsPlugin('../common/common.js', 'front_end/core/sdk/FirstFile.js'),
        {id: path.join('front_end', 'core', 'common', 'common.js'), external: true});
  });

  it('node built-in modules', () => {
    assert.deepEqual(devtoolsPlugin('fs', 'scripts/some-script.js'), {id: 'fs', external: true});
  });

  it('importing generated files', () => {
    assert.strictEqual(devtoolsPlugin('../../generated/Protocol.js', 'front_end/core/sdk/FirstFile.js'), null);
  });
});
