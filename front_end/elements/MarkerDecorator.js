// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';  // eslint-disable-line no-unused-vars
import {ls} from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars

import {PseudoStateMarkerDecorator} from './ElementsPanel.js';  // eslint-disable-line no-unused-vars

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
   * @param {{marker: string, title: string, color: string}} extension
   */
  constructor(extension) {
    if (!extension.title || !extension.color) {
      throw new Error(`Generic decorator requires a color and a title: ${extension.marker}`);
    }
    this._title = extension.title;
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
  title: ls`DOM Breakpoint`,
  color: 'rgb(105, 140, 254)',
};

const elementIsHiddenData = {
  marker: 'hidden-marker',
  title: ls`Element is hidden`,
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
  *   title: Platform.UIString.LocalizedString|undefined
  * }}
  */
// @ts-ignore typedef
export let MarkerDecoratorRegistration;
