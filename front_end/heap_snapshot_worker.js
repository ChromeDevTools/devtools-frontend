// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Release build has Runtime.js bundled.

if (!self.Runtime)
  self.importScripts('Runtime.js');

// Due to a lack of ESM within workers the functionality required by the
// worker is duplicated here from Common. When ESM lands in Workers, this code
// can be replaced with the ESM equivalent.
// TODO(https://crbug.com/680046) Remove the dupe code below.

const _substitutionStrings = new WeakMap();

/**
 * @param {string} string
 * @param {?ArrayLike} values
 * @return {string}
 */
function serializeUIString(string, values = []) {
  const messageParts = [string];
  const serializedMessage = {messageParts, values};
  return JSON.stringify(serializedMessage);
}

/**
 * @param {string} serializedMessage
 * @return {*}
 */
function deserializeUIString(serializedMessage) {
  if (!serializedMessage)
    return {};

  return JSON.parse(serializedMessage);
}

function localize(string) {
  return string;
}

function UIString(string, vararg) {
  return String.vsprintf(localize(string), Array.prototype.slice.call(arguments, 1));
}

/**
 * @param {!Array<string>|string} strings
 * @param {...*} vararg
 * @return {string}
 */
self.ls = function(strings, vararg) {
  if (typeof strings === 'string')
    return strings;
  let substitutionString = _substitutionStrings.get(strings);
  if (!substitutionString) {
    substitutionString = strings.join('%s');
    _substitutionStrings.set(strings, substitutionString);
  }
  return UIString(substitutionString, ...Array.prototype.slice.call(arguments, 1));
};

self.serializeUIString = serializeUIString;
self.deserializeUIString = deserializeUIString;

Runtime.startWorker('heap_snapshot_worker');
