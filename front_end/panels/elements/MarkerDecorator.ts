// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';

import {PseudoStateMarkerDecorator} from './ElementsPanel.js';

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
const str_ = i18n.i18n.registerUIStrings('panels/elements/MarkerDecorator.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export interface MarkerDecorator {
  decorate(node: SDK.DOMModel.DOMNode): {
    title: string,
    color: string,
  }|null;
}

export class GenericDecorator implements MarkerDecorator {
  private readonly title: string;
  private readonly color: string;

  constructor(extension: {
    marker: string,
    title: () => string,
    color: string,
  }) {
    if (!extension.title || !extension.color) {
      throw new Error(`Generic decorator requires a color and a title: ${extension.marker}`);
    }
    this.title = extension.title();
    this.color = (extension.color as string);
  }

  decorate(_node: SDK.DOMModel.DOMNode): {
    title: string,
    color: string,
  }|null {
    return {title: this.title, color: this.color};
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

export function getRegisteredDecorators(): MarkerDecoratorRegistration[] {
  return [
    {
      ...domBreakpointData,
      decorator: (): GenericDecorator => new GenericDecorator(domBreakpointData),
    },
    {
      ...elementIsHiddenData,
      decorator: (): GenericDecorator => new GenericDecorator(elementIsHiddenData),
    },
    {
      decorator: PseudoStateMarkerDecorator.instance,
      marker: 'pseudo-state-marker',
      title: undefined,
      color: undefined,
    },
  ];
}
export interface MarkerDecoratorRegistration {
  decorator: () => MarkerDecorator;
  marker: string;
  color?: string;
  title?: (() => Platform.UIString.LocalizedString);
}
