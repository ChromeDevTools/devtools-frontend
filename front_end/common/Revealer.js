// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';

/**
 * @interface
 */
export class Revealer {
  /**
   * @param {!Object} object
   * @param {boolean=} omitFocus
   * @return {!Promise<void>}
   */
  reveal(object, omitFocus) {
    throw new Error('not implemented');
  }
}

/**
 * @param {?Object} revealable
 * @param {boolean=} omitFocus
 * @return {!Promise.<void>}
 */
export let reveal = async function(revealable, omitFocus) {
  if (!revealable) {
    return Promise.reject(new Error('Can\'t reveal ' + revealable));
  }
  const legacyRevealers =
      /** @type {!Array<!Revealer>} */ (await Root.Runtime.Runtime.instance().allInstances(Revealer, revealable));
  const revealers = await loadApplicableRegisteredRevealers(revealable);

  return reveal([...legacyRevealers, ...revealers]);
  /**
   * @param {!Array.<!Revealer>} revealers
   * @return {!Promise.<void>}
   */
  function reveal(revealers) {
    const promises = [];
    for (let i = 0; i < revealers.length; ++i) {
      promises.push(revealers[i].reveal(/** @type {!Object} */ (revealable), omitFocus));
    }
    return Promise.race(promises);
  }
};

/**
 * @param {function(?Object, boolean=):!Promise.<undefined>} newReveal
 */
export function setRevealForTest(newReveal) {
  reveal = newReveal;
}

/**
 * @param {?Object} revealable
 * @return {?string}
 */
export const revealDestination = function(revealable) {
  const extension = Root.Runtime.Runtime.instance().extension(Revealer, revealable);
  if (!extension) {
    return null;
  }
  return extension.descriptor()['destination'];
};

/** @type {!Array<!RevealerRegistration>} */
const registeredRevealers = [];

/**
 * @param {!RevealerRegistration} registration
 */
export function registerRevealer(registration) {
  registeredRevealers.push(registration);
}

/**
 * @param {!Object} revealable
 * @return {!Promise<Array<Revealer>>}
 */
async function loadApplicableRegisteredRevealers(revealable) {
  return Promise.all(
      registeredRevealers.filter(isRevealerApplicableToContextTypes).map(registration => registration.loadRevealer()));

  /**
   * @param {!RevealerRegistration} revealerRegistration
   * @return {boolean}
   */
  function isRevealerApplicableToContextTypes(revealerRegistration) {
    if (!revealerRegistration.contextTypes) {
      return true;
    }
    for (const contextType of revealerRegistration.contextTypes()) {
      if (revealable instanceof contextType) {
        return true;
      }
    }
    return false;
  }
}

/**
 * @typedef {{
  *  contextTypes: function(): !Array<?>,
  *  loadRevealer: function(): !Promise<!Revealer>,
  *  destination: (undefined|RevealerDestination)
  * }} */
// @ts-ignore typedef
export let RevealerRegistration;

/** @enum {string} */
export const RevealerDestination = {
  ELEMENTS_PANEL: ls`Elements panel`,
  STYLES_SIDEBAR: ls`styles sidebar`,
  CHANGES_DRAWER: ls`Changes drawer`,
  ISSUES_VIEW: ls`Issues view`,
  NETWORK_PANEL: ls`Network panel`,
  APPLICATION_PANEL: ls`Application panel`,
};
