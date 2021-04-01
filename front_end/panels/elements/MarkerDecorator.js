// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../../core/sdk/sdk.js';                 // eslint-disable-line no-unused-vars

import {PseudoStateMarkerDecorator} from './ElementsPanel.js';  // eslint-disable-line no-unused-vars

const UIStrings = {
  /**
  *@description Title of the Marker Decorator of Elements
  */
  domBreakpoint: 'DOM Breakpoint',
  /**
  *@description Title of the Marker Decorator of Elements
  */
  elementIsHidden: 'Element is hidden',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/MarkerDecorator.js', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
/**
 * @interface
 */
export class MarkerDecorator {
  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {?{title: string, color: string}}
   */
  decorate(node) {
    throw new Error('Not implemented yet');
  }
}

/**
 * @implements {MarkerDecorator}
 */
export class GenericDecorator {
  /**
   * @param {{marker: string, title: ()=>string, color: string}} extension
   */
  constructor(extension) {
    if (!extension.title || !extension.color) {
      throw new Error(`Generic decorator requires a color and a title: ${extension.marker}`);
    }
    this._title = extension.title();
    this._color = /** @type {string} */ (extension.color);
  }

  /**
   * @override
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {?{title: string, color: string}}
   */
  decorate(node) {
    return {title: this._title, color: this._color};
  }
}

const domBreakpointData = {
  marker: 'breakpoint-marker',
  title: i18nLazyString(UIStrings.domBreakpoint),
  color: 'rgb(105, 140, 254)',
};

const elementIsHiddenData = {
  marker: 'hidden-marker',
  title: i18nLazyString(UIStrings.elementIsHidden),
  color: '#555',
};

/**
 * @return {!Array<!MarkerDecoratorRegistration>}
 */
export function getRegisteredDecorators() {
  return [
    {
      ...domBreakpointData,
      decorator: () => new GenericDecorator(domBreakpointData),
    },
    {
      ...elementIsHiddenData,
      decorator: () => new GenericDecorator(elementIsHiddenData),
    },
    {
      decorator: PseudoStateMarkerDecorator.instance,
      marker: 'pseudo-state-marker',
      title: undefined,
      color: undefined,
    },
  ];
}

/**
  * @typedef {{
  *   decorator: function(): !MarkerDecorator,
  *   marker: string,
  *   color: string|undefined,
  *   title: (()=>Platform.UIString.LocalizedString)|undefined
  * }}
  */
// @ts-ignore typedef
export let MarkerDecoratorRegistration;
