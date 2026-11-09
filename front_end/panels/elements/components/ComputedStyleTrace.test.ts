// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';

import * as ElementsComponents from './components.js';

describe('ComputedStyleTrace', () => {
  function renderDefaultView(input: Partial<ElementsComponents.ComputedStyleTrace.ViewInput> = {}): HTMLElement {
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    ElementsComponents.ComputedStyleTrace.DEFAULT_VIEW(
        {
          selector: '#id',
          active: true,
          onNavigateToSource: () => {},
          ...input,
        },
        undefined,
        target,
    );
    return target;
  }

  describe('view', () => {
    it('renders the selector', () => {
      const target = renderDefaultView({selector: '#id'});

      const renderedSelector = target.querySelector('.trace-selector');
      assert.exists(renderedSelector, 'selector was not rendered');
      assert.strictEqual(renderedSelector.textContent, '#id');
    });

    it('marks an active trace as active', () => {
      const target = renderDefaultView({active: true});

      assert.exists(target.querySelector('.computed-style-trace.active'));
      assert.notExists(target.querySelector('.computed-style-trace.inactive'));
    });

    it('marks an overloaded trace as inactive', () => {
      const target = renderDefaultView({active: false});

      assert.exists(target.querySelector('.computed-style-trace.inactive'));
      assert.notExists(target.querySelector('.computed-style-trace.active'));
    });

    it('renders a trace-link slot inside .trace-link', () => {
      const target = renderDefaultView();

      const slot = target.querySelector('.trace-link slot[name="trace-link"]');
      assert.exists(slot, 'trace-link slot was not rendered');
    });

    it('navigates to source when clicking the goto icon', () => {
      const onNavigateToSource = sinon.spy();
      const target = renderDefaultView({onNavigateToSource});

      const goto = target.querySelector<HTMLElement>('.goto');
      assert.exists(goto, 'goto did not exist');
      goto.click();
      sinon.assert.calledOnce(onNavigateToSource);
    });

    it('navigates to source when clicking the trace value', () => {
      const onNavigateToSource = sinon.spy();
      const target = renderDefaultView({onNavigateToSource});

      const traceValue = target.querySelector<HTMLElement>('slot[name="trace-value"]');
      assert.exists(traceValue, 'trace value slot was not rendered');
      traceValue.click();
      sinon.assert.calledOnce(onNavigateToSource);
    });

    it('adds the computed-style-trace class to the shadow host', () => {
      const host = document.createElement('div');
      renderElementIntoDOM(host);
      const shadowRoot = host.attachShadow({mode: 'open'});
      ElementsComponents.ComputedStyleTrace.DEFAULT_VIEW(
          {selector: '#id', active: true, onNavigateToSource: () => {}},
          undefined,
          shadowRoot,
      );

      assert.isTrue(host.classList.contains('computed-style-trace'));
      assert.exists(shadowRoot.querySelector('.trace-selector'));
    });
  });

  describe('widget', () => {
    it('passes properties to the view function', async () => {
      const view = createViewFunctionStub(ElementsComponents.ComputedStyleTrace.ComputedStyleTrace);
      const component = new ElementsComponents.ComputedStyleTrace.ComputedStyleTrace(undefined, view);
      const onNavigateToSource = sinon.spy();
      component.selector = '.container';
      component.active = false;
      component.onNavigateToSource = onNavigateToSource;

      const input = await view.nextInput;
      assert.strictEqual(input.selector, '.container');
      assert.isFalse(input.active);
      assert.strictEqual(input.onNavigateToSource, onNavigateToSource);
    });

    it('renders the default view and projects slotted trace link into its shadow root', async () => {
      const component = new ElementsComponents.ComputedStyleTrace.ComputedStyleTrace();
      component.selector = '#id';
      component.active = true;
      const link = document.createElement('span');
      link.slot = 'trace-link';
      link.textContent = 'styles.css:1';
      component.element.appendChild(link);
      renderElementIntoDOM(component);
      await component.updateComplete;

      assert.isTrue(component.element.classList.contains('computed-style-trace'));
      const renderedSelector = component.contentElement.querySelector('.trace-selector');
      assert.exists(renderedSelector, 'selector was not rendered');
      assert.strictEqual(renderedSelector.textContent, '#id');
      const linkSlot = component.contentElement.querySelector<HTMLSlotElement>('.trace-link slot[name="trace-link"]');
      assert.exists(linkSlot, 'trace-link slot was not rendered');
      assert.deepEqual(linkSlot.assignedNodes(), [link]);
    });
  });
});
