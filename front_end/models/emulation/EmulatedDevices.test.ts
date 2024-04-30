// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as EmulationModel from '../emulation/emulation.js';

const BASE_URL = new URL('../../../front_end/emulated_devices/', import.meta.url).toString();

describe('EmulatedDevices can compute CSS image URLs', () => {
  it('as regular string', () => {
    const regularString = 'no url here';
    assert.strictEqual(regularString, EmulationModel.EmulatedDevices.computeRelativeImageURL(regularString));
  });

  it('with empty @url', () => {
    assert.strictEqual(BASE_URL, EmulationModel.EmulatedDevices.computeRelativeImageURL('@url()'));
  });

  it('with single file', () => {
    assert.strictEqual(`${BASE_URL}file.js`, EmulationModel.EmulatedDevices.computeRelativeImageURL('@url(file.js)'));
  });

  it('with surrounding text', () => {
    assert.strictEqual(
        `before ${BASE_URL}long/path/to/the/file.png after`,
        EmulationModel.EmulatedDevices.computeRelativeImageURL('before @url(long/path/to/the/file.png) after'));
  });

  it('with multiple URLs', () => {
    assert.strictEqual(
        `${BASE_URL}first.png ${BASE_URL}second.gif`,
        EmulationModel.EmulatedDevices.computeRelativeImageURL('@url(first.png) @url(second.gif)'));
  });

  it('with multiple URLs with text around', () => {
    assert.strictEqual(
        `a lot of ${BASE_URL}stuff in a ${BASE_URL}singleline and more url() @@url (not/a/resource.gif)`,
        EmulationModel.EmulatedDevices.computeRelativeImageURL(
            'a lot of @url(stuff) in a @url(single)line and more url() @@url (not/a/resource.gif)'));
  });
});
