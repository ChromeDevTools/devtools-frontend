// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

const MapWithDefault = Common.MapWithDefault.MapWithDefault;

function convertToObject(map: Common.MapWithDefault.MapWithDefault<string, Map<string, string>>): Object {
  const ret: Record<string, Record<string, string>> = {};
  for (const [key1, map1] of map.entries()) {
    const ret1: Record<string, string> = {};
    for (const [key2, value] of map1.entries()) {
      ret1[key2] = value;
    }
    ret[key1] = ret1;
  }
  return ret;
}

describe('MapWithDefault', () => {
  it('sets a default entry for `getOrInsert()`', () => {
    const map = new MapWithDefault<string, Map<string, string>>();

    assert.deepEqual(convertToObject(map), {});

    map.getOrInsert('0', new Map());

    assert.deepEqual(convertToObject(map), {
      0: {},
    });

    map.getOrInsert('1', new Map()).set('fr', 'uno');
    map.getOrInsert('1', new Map()).set('de', 'eins');

    assert.deepEqual(convertToObject(map), {
      0: {},
      1: {fr: 'uno', de: 'eins'},
    });
  });

  it('creates a default entry for `getOrInsertComputed()`', () => {
    const map = new MapWithDefault<string, Map<string, string>>();

    assert.deepEqual(convertToObject(map), {});

    map.getOrInsertComputed('0', () => new Map());

    assert.deepEqual(convertToObject(map), {
      0: {},
    });

    map.getOrInsertComputed('1', () => new Map()).set('fr', 'uno');
    map.getOrInsertComputed('1', () => new Map()).set('de', 'eins');

    assert.deepEqual(convertToObject(map), {
      0: {},
      1: {fr: 'uno', de: 'eins'},
    });
  });
});
