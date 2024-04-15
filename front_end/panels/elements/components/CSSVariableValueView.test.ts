// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';

import * as ElementsComponents from './components.js';

describeWithEnvironment('CSSVariableValueView', () => {
  it('renders right tooltip', () => {
    const view = new ElementsComponents.CSSVariableValueView.CSSVariableValueView({
      variableName: '--var-name',
      value: 'pink',
    });
    renderElementIntoDOM(view);

    assert.strictEqual(view.shadowRoot!.querySelector('.variable-value-popup-wrapper')!.textContent!.trim(), 'pink');
  });
});
