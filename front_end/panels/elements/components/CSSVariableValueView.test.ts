// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertShadowRoot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';

import * as ElementsComponents from './components.js';

const {assert} = chai;

describeWithEnvironment('CSSVariableValueView', () => {
  it('renders right tooltip', () => {
    const popupComponent = new ElementsComponents.CSSVariableValueView.CSSVariableValueView({
      variableName: '--var-name',
      value: 'pink',
    });
    renderElementIntoDOM(popupComponent);

    assertShadowRoot(popupComponent.shadowRoot);

    const shadowRoot = popupComponent.shadowRoot;

    const popupContentRendered = shadowRoot.querySelector('.variable-value-popup-wrapper') !== null;
    assert.isTrue(popupContentRendered);

    const popupContent = shadowRoot.querySelector('.variable-value-popup-wrapper')?.textContent?.trim();
    assert.strictEqual(popupContent, 'pink');
  });
});
