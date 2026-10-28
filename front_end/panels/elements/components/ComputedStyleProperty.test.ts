// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';

import * as ElementsComponents from './components.js';

describe('ComputedStyleProperty', () => {
  it('renders inherited property correctly', () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    ElementsComponents.ComputedStyleProperty.DEFAULT_VIEW(
        {
          traceable: false,
          inherited: true,
          onNavigateToSource: () => {},
        },
        undefined,
        target,
    );

    const wrapper = target.querySelector('.computed-style-property.inherited');
    assert.exists(wrapper, 'it should add .inherited class to wrapper for inherited properties');
  });

  it('renders a clickable goto button that calls onNavigateToSource', () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    const onNavigateToSource = sinon.spy();
    ElementsComponents.ComputedStyleProperty.DEFAULT_VIEW(
        {
          traceable: true,
          inherited: false,
          onNavigateToSource,
        },
        undefined,
        target,
    );

    const goto = target.querySelector<HTMLElement>('.goto');
    assert.exists(goto, 'goto icon should exist');

    goto.click();
    sinon.assert.calledOnce(onNavigateToSource);
  });

  it('passes properties to the view function', async () => {
    const view = createViewFunctionStub(ElementsComponents.ComputedStyleProperty.ComputedStyleProperty);
    const component = new ElementsComponents.ComputedStyleProperty.ComputedStyleProperty(undefined, view);
    const onNavigateToSource = sinon.spy();
    component.traceable = true;
    component.inherited = true;
    component.onNavigateToSource = onNavigateToSource;

    const input = await view.nextInput;
    assert.isTrue(input.traceable);
    assert.isTrue(input.inherited);
    assert.strictEqual(input.onNavigateToSource, onNavigateToSource);
  });
});
