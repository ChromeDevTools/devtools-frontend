// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Network from './network.js';

describe('RequestPayloadView', () => {
  it('decodes headers', async () => {
    const encoded = 'Test+%21%40%23%24%25%5E%26*%28%29_%2B+parameters.';
    const parameterElement = Network.RequestPayloadView.RequestPayloadView.formatParameter(encoded, '', true);
    assert.strictEqual(parameterElement.textContent, 'Test !@#$%^&*()_+ parameters.');
  });
});
