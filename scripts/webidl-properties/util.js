// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Merges objects or arrays of objects. This is a simplistic merge operation
 * that is only useful for generating the DOM pinned properties dataset.
 *
 * The merge happens in-place: b is merged *into* a.
 * Both objects must be of the same type.
 * Arrays are merged as unions with simple same-value-zero equality.
 * Objects are merged with truthy-property precedence.
 *
 * @param {array|object} a
 * @param {array|object} b
 */
export function merge(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    mergeArrays(a, b);
  } else if (isNonNullObject(a) && isNonNullObject(b)) {
    mergeObjects(a, b);
  } else {
    throw Error;
  }

  function isNonNullObject(value) {
    return typeof value === 'object' && value !== null;
  }

  function mergeArrays(a, b) {
    const set = new Set(a);
    for (const value of b) {
      if (!set.has(value)) {
        a.push(value);
      }
    }
  }

  function mergeObjects(a, b) {
    for (const key of Object.keys(b)) {
      if (isNonNullObject(a[key]) && isNonNullObject(b[key])) {
        merge(a[key], b[key]);
      } else {
        a[key] = a[key] ?? b[key];
      }
    }
  }
}

/**
 * Finds "missing" types in a DOM pinned properties dataset.
 * A "missing" type is defined as a type that is inherited or included by/in
 * another type, but for which a definition wasn't found in the specs.
 *
 * This is a helper which helps to ensure that all relevant specs are parsed.
 * E.g. some specs might reference types defined in other specs.
 *
 * @param {object} data
 * @returns {array}
 */
export function getMissingTypes(data) {
  const missing = new Set();
  const keys = new Set(Object.keys(data));

  for (const value of Object.values(data)) {
    if (value.inherits) {
      if (!keys.has(value.inherits)) {
        missing.add(value.inherits);
      }
    }
    if (value.includes) {
      for (const include of value.includes) {
        if (!keys.has(include)) {
          missing.add(include);
        }
      }
    }
  }

  return [...missing];
}
