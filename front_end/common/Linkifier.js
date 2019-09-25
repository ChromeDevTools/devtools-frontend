// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
export default class Linkifier {
  /**
   * @param {!Object} object
   * @param {!Common.Linkifier.Options=} options
   * @return {!Node}
   */
  linkify(object, options) {
  }
}

/**
 * @param {?Object} object
 * @param {!Common.Linkifier.Options=} options
 * @return {!Promise<!Node>}
 */
export function linkify(object, options) {
  if (!object)
    return Promise.reject(new Error('Can\'t linkify ' + object));
  return self.runtime.extension(Common.Linkifier, object)
      .instance()
      .then(linkifier => linkifier.linkify(object, options));
}

/* Legacy exported object */
self.Common = self.Common || {};
Common = Common || {};

/**
 * @interface
 */
Common.Linkifier = Linkifier;
Common.Linkifier.linkify = linkify;

/** @typedef {{tooltip: (string|undefined), preventKeyboardFocus: (boolean|undefined)}} */
Common.Linkifier.Options;
