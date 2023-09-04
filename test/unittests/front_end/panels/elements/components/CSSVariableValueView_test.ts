// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ElementsComponents from '../../../../../../front_end/panels/elements/components/components.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

describeWithEnvironment('CSSVariableValueView', async () => {
  it('renders right tooltip', () => {
    const popupComponent = new ElementsComponents.CSSVariableValueView.CSSVariableValueView('pink');
    renderElementIntoDOM(popupComponent);

    assertShadowRoot(popupComponent.shadowRoot);

    const shadowRoot = popupComponent.shadowRoot;

    const popupContentRendered = shadowRoot.querySelector('.variable-value-popup-wrapper') !== null;
    assert.isTrue(popupContentRendered);

    const popupContent = shadowRoot.querySelector('.variable-value-popup-wrapper')?.textContent?.trim();
    assert.strictEqual(popupContent, 'pink');
  });
});
