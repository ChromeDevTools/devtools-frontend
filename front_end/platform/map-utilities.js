// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Multimap} from './utilities.js';
/**
 * @param {!Map<K,V>} map
 * @return {!Multimap<!V, !K>}
 * @template K,V
 */
export const inverse = function(map) {
  const result = new Multimap();
  for (const key of map.keys()) {
    const value = map.get(key);
    result.set(value, key);
  }
  return result;
};
