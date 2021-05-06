// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../../../front_end/ui/components/helpers/helpers.js';
import {renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';

const {assert} = chai;

class TestComponent extends HTMLElement {
  private render() {
    this.innerHTML = '<p>Hello world!</p>';
  }

  connectedCallback() {
    this.render();
  }
}

describe('defineComponent()', () => {
  let stub: sinon.SinonStub;
  beforeEach(() => {
    stub = sinon.stub(console, 'error');
  });

  afterEach(() => {
    stub.restore();
  });

  it('defines component correctly', () => {
    ComponentHelpers.CustomElements.defineComponent('test-component', class extends TestComponent {});
    const testComponent = document.createElement('test-component');
    renderElementIntoDOM(testComponent);
    assert.strictEqual(testComponent.innerHTML, '<p>Hello world!</p>');
  });

  it('errors if component is defined twice', () => {
    const newClassComponent = class extends TestComponent {};
    ComponentHelpers.CustomElements.defineComponent('test-component-1', newClassComponent);
    ComponentHelpers.CustomElements.defineComponent('test-component-1', newClassComponent);
    assert.isTrue(stub.calledOnce, 'Not called just once');
    assert.isTrue(stub.calledWith('test-component-1 already defined!'), 'Not called with correct output');
  });
});
