// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {parseClientVariations} from '../../../../front_end/client_variations/client_variations.js';

describe('parseClientVariations', () => {
  it('returns empty lists for unparseable text', () => {
    const result = parseClientVariations('gibberish');
    assert.deepEqual(result, {
      'variationIds': [],
      'triggerVariationIds': [],
    });
  });

  it('returns empty lists for empty input', () => {
    const result = parseClientVariations('');
    assert.deepEqual(result, {
      'variationIds': [],
      'triggerVariationIds': [],
    });
  });

  it('parses a valid serialized proto', () => {
    const result = parseClientVariations('CG8I3gEIzQIYvAMYqwQ=');
    assert.deepEqual(result, {
      'variationIds': [111, 222, 333],
      'triggerVariationIds': [444, 555],
    });
  });
});
