// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';  // eslint-disable-line no-unused-vars

const UIStrings = {
  /**
  *@description The UI destination when right clicking an item that can be revealed
  */
  elementsPanel: 'Elements panel',
  /**
  *@description The UI destination when right clicking an item that can be revealed
  */
  stylesSidebar: 'styles sidebar',
  /**
  *@description The UI destination when right clicking an item that can be revealed
  */
  changesDrawer: 'Changes drawer',
  /**
  *@description The UI destination when right clicking an item that can be revealed
  */
  issuesView: 'Issues view',
  /**
  *@description The UI destination when right clicking an item that can be revealed
  */
  networkPanel: 'Network panel',
  /**
  *@description The UI destination when right clicking an item that can be revealed
  */
  applicationPanel: 'Application panel',
  /**
  *@description The UI destination when right clicking an item that can be revealed
  */
  sourcesPanel: 'Sources panel',
};
const str_ = i18n.i18n.registerUIStrings('core/common/Revealer.js', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

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
  const revealers =
      await Promise.all(getApplicableRegisteredRevealers(revealable).map(registration => registration.loadRevealer()));

  return reveal(revealers);
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
  const extension = revealable ? getApplicableRegisteredRevealers(revealable)[0] : registeredRevealers[0];
  if (!extension) {
    return null;
  }
  return extension.destination?.() || null;
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
 * @return {!Array<RevealerRegistration>}
 */
function getApplicableRegisteredRevealers(revealable) {
  return registeredRevealers.filter(isRevealerApplicableToContextTypes);

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

/** @enum {() => Platform.UIString.LocalizedString} */
export const RevealerDestination = {
  ELEMENTS_PANEL: i18nLazyString(UIStrings.elementsPanel),
  STYLES_SIDEBAR: i18nLazyString(UIStrings.stylesSidebar),
  CHANGES_DRAWER: i18nLazyString(UIStrings.changesDrawer),
  ISSUES_VIEW: i18nLazyString(UIStrings.issuesView),
  NETWORK_PANEL: i18nLazyString(UIStrings.networkPanel),
  APPLICATION_PANEL: i18nLazyString(UIStrings.applicationPanel),
  SOURCES_PANEL: i18nLazyString(UIStrings.sourcesPanel),
};
