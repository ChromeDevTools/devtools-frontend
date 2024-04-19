// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ClientVariations from './client-variations.js';

describe('formatClientVariations', () => {
  it('formats input containing both types of variation IDs', () => {
    const result = ClientVariations.formatClientVariations({
      variationIds: [111, 222, 333],
      triggerVariationIds: [444, 555],
    });
    assert.deepEqual(
        result,
        'message ClientVariations {\n  // Active Google-visible variation IDs on this client. These are reported for analysis, but do not directly affect any server-side behavior.\n  repeated int32 variation_id = [111, 222, 333];\n  // Active Google-visible variation IDs on this client that trigger server-side behavior. These are reported for analysis *and* directly affect server-side behavior.\n  repeated int32 trigger_variation_id = [444, 555];\n}');
  });

  it('formats input containing only plain variation IDs', () => {
    const result = ClientVariations.formatClientVariations({
      variationIds: [111, 222, 333],
      triggerVariationIds: [],
    });
    assert.deepEqual(
        result,
        'message ClientVariations {\n  // Active Google-visible variation IDs on this client. These are reported for analysis, but do not directly affect any server-side behavior.\n  repeated int32 variation_id = [111, 222, 333];\n}');
  });

  it('formats input containing only trigger variation IDs', () => {
    const result = ClientVariations.formatClientVariations({
      variationIds: [],
      triggerVariationIds: [444, 555],
    });
    assert.deepEqual(
        result,
        'message ClientVariations {\n  // Active Google-visible variation IDs on this client that trigger server-side behavior. These are reported for analysis *and* directly affect server-side behavior.\n  repeated int32 trigger_variation_id = [444, 555];\n}');
  });

  it('formats input containing no variation IDs', () => {
    const result = ClientVariations.formatClientVariations({
      variationIds: [],
      triggerVariationIds: [],
    });
    assert.deepEqual(result, 'message ClientVariations {\n}');
  });
});

describe('parseClientVariations', () => {
  it('returns empty lists for unparseable text', () => {
    const result = ClientVariations.parseClientVariations('gibberish');
    assert.deepEqual(result, {
      variationIds: [],
      triggerVariationIds: [],
    });
  });

  it('returns empty lists for empty input', () => {
    const result = ClientVariations.parseClientVariations('');
    assert.deepEqual(result, {
      variationIds: [],
      triggerVariationIds: [],
    });
  });

  it('parses a valid serialized proto', () => {
    const result = ClientVariations.parseClientVariations('CG8I3gEIzQIYvAMYqwQ=');
    assert.deepEqual(result, {
      variationIds: [111, 222, 333],
      triggerVariationIds: [444, 555],
    });
  });

  // Please refer crbug.com/1160346 for more details.
  it('returns empty lists for invalid encoded data', () => {
    const result = ClientVariations.parseClientVariations('Z2liYmVyaXNo');
    assert.deepEqual(result, {
      variationIds: [],
      triggerVariationIds: [],
    });
  });
});
