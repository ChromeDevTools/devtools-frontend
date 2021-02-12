// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
export class Linkifier {
  /**
   * @param {!Object} object
   * @param {!Options=} options
   * @return {!Node}
   */
  linkify(object, options) {
    throw new Error('linkify not implemented');
  }

  /**
   * @param {?Object} object
   * @param {!Options=} options
   * @return {!Promise<!Node>}
   */
  static linkify(object, options) {
    if (!object) {
      return Promise.reject(new Error('Can\'t linkify ' + object));
    }
    const linkifierRegistration = getApplicableRegisteredlinkifiers(object)[0];
    if (!linkifierRegistration) {
      return Promise.reject(new Error('No linkifiers registered for object ' + object));
    }
    return linkifierRegistration.loadLinkifier().then(
        linkifier => /** @type {!Linkifier} */ (linkifier).linkify(/** @type {!Object} */ (object), options));
  }
}

/** @typedef {{tooltip: (string|undefined), preventKeyboardFocus: (boolean|undefined)}} */
// @ts-ignore typedef.
export let Options;

/** @type {!Array<!LinkifierRegistration>} */
const registeredLinkifiers = [];

/**
 * @param {!LinkifierRegistration} registration
 */
export function registerLinkifier(registration) {
  registeredLinkifiers.push(registration);
}
/**
 * @param {!Object} object
 * @return {!Array<!LinkifierRegistration>}
 */
export function getApplicableRegisteredlinkifiers(object) {
  return registeredLinkifiers.filter(isLinkifierApplicableToContextTypes);

  /**
   * @param {!LinkifierRegistration} linkifierRegistration
   * @return {boolean}
   */
  function isLinkifierApplicableToContextTypes(linkifierRegistration) {
    if (!linkifierRegistration.contextTypes) {
      return true;
    }
    for (const contextType of linkifierRegistration.contextTypes()) {
      if (object instanceof contextType) {
        return true;
      }
    }
    return false;
  }
}

/**
  * @typedef {{
    *  loadLinkifier: function(): !Promise<!Linkifier>,
    *  contextTypes: undefined|function(): !Array<?>,
    * }}
    */
// @ts-ignore typedef
export let LinkifierRegistration;
