// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './legacy.js';

import {
  dispatchClickEvent,
  doubleRaf,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../components/render_coordinator/render_coordinator.js';

import * as UI from './legacy.js';

describeWithLocale('Toolbar', () => {
  const {Toolbar} = UI.Toolbar;

  describe('Toolbar', () => {
    it('can be instantiated via `createElement`', () => {
      const toolbar = document.createElement('devtools-toolbar');

      assert.instanceOf(toolbar, Toolbar);
    });

    it('does not attach a shadow root', () => {
      const toolbar = document.createElement('devtools-toolbar');

      assert.isNull(toolbar.shadowRoot, 'Expected Toolbar to use Light DOM');
    });

    describe('connectedCallback', () => {
      it('adjusts the ARIA role to `toolbar` if unspecified', () => {
        const toolbar = document.createElement('devtools-toolbar');

        toolbar.connectedCallback();

        assert.strictEqual(toolbar.role, 'toolbar');
      });

      it('leaves the ARIA role as is if the developer specified one', () => {
        const toolbar = document.createElement('devtools-toolbar');
        toolbar.role = 'presentation';

        toolbar.connectedCallback();

        assert.strictEqual(toolbar.role, 'presentation');
      });
    });

    describe('orientation', () => {
      it('defaults to `horizontal`', () => {
        const toolbar = document.createElement('devtools-toolbar');

        assert.strictEqual(toolbar.orientation, 'horizontal');
      });

      it('can be changed to `vertical`', () => {
        const toolbar = document.createElement('devtools-toolbar');

        toolbar.orientation = 'vertical';

        assert.strictEqual(toolbar.orientation, 'vertical');
      });

      it('reflects changes onto the `orientation` attribute', () => {
        const toolbar = document.createElement('devtools-toolbar');

        toolbar.orientation = 'vertical';

        assert.strictEqual(toolbar.getAttribute('orientation'), 'vertical');
      });

      it('reflects changes onto the `aria-orientation` attribute', () => {
        const toolbar = document.createElement('devtools-toolbar');

        toolbar.orientation = 'vertical';

        assert.strictEqual(toolbar.ariaOrientation, 'vertical');
      });
    });

    describe('wrappable', () => {
      it('defaults to off', () => {
        const toolbar = document.createElement('devtools-toolbar');

        assert.isFalse(toolbar.wrappable);
      });

      it('change be toggled on', () => {
        const toolbar = document.createElement('devtools-toolbar');

        toolbar.wrappable = true;

        assert.isTrue(toolbar.wrappable);
      });

      it('reflects changes onto the `wrappable` attribute', () => {
        const toolbar = document.createElement('devtools-toolbar');

        toolbar.wrappable = true;

        assert.isTrue(toolbar.hasAttribute('wrappable'));
      });
    });
  });

  describe('ToolbarInput', () => {
    it('sets a title on the clear button', async () => {
      const input = new UI.Toolbar.ToolbarInput('placeholder');
      renderElementIntoDOM(input.element);
      input.setValue('test value');
      const clearButton = input.element.querySelector('.toolbar-input-clear-button');
      await RenderCoordinator.done();
      const innerButton = clearButton?.shadowRoot?.querySelector('button');
      assert.instanceOf(innerButton, HTMLElement);
      assert.strictEqual(innerButton.title, 'Clear');
    });

    it('clears the input when the clear button is clicked', () => {
      const input = new UI.Toolbar.ToolbarInput('placeholder');
      renderElementIntoDOM(input.element);
      const clearButton = input.element.querySelector('.toolbar-input-clear-button');
      assert.instanceOf(clearButton, HTMLElement);
      input.setValue('test value');
      dispatchClickEvent(clearButton);
      assert.strictEqual(input.value(), '');
    });
  });

  it('can append items into the toolbar', async () => {
    const toolbar = renderElementIntoDOM(document.createElement('devtools-toolbar'));

    const itemOne = new UI.Toolbar.ToolbarInput('placeholder-item-1');
    toolbar.appendToolbarItem(itemOne);
    const itemTwo = new UI.Toolbar.ToolbarInput('placeholder-item-2');
    toolbar.appendToolbarItem(itemTwo);

    const toolbarInputs = toolbar.querySelectorAll('[data-placeholder]');
    assert.isOk(toolbarInputs);
    assert.lengthOf(toolbarInputs, 2);

    const placeholders = Array.from(toolbarInputs).map(input => {
      return input.getAttribute('data-placeholder');
    });

    assert.deepEqual(placeholders, ['placeholder-item-1', 'placeholder-item-2']);
  });

  it('can prepend items into the toolbar', async () => {
    const toolbar = renderElementIntoDOM(document.createElement('devtools-toolbar'));

    const itemOne = new UI.Toolbar.ToolbarInput('placeholder-item-1');
    toolbar.appendToolbarItem(itemOne);
    const itemTwo = new UI.Toolbar.ToolbarInput('placeholder-item-2');
    toolbar.prependToolbarItem(itemTwo);

    const toolbarInputs = toolbar.querySelectorAll('[data-placeholder]');
    assert.isOk(toolbarInputs);
    assert.lengthOf(toolbarInputs, 2);

    const placeholders = Array.from(toolbarInputs).map(input => {
      return input.getAttribute('data-placeholder');
    });

    // Ensure the second item was prepended correctly
    assert.deepEqual(placeholders, ['placeholder-item-2', 'placeholder-item-1']);
  });

  it('knows if it has an item in the toolbar', async () => {
    const toolbar = document.createElement('devtools-toolbar');
    const item = new UI.Toolbar.ToolbarInput('placeholder');
    toolbar.appendToolbarItem(item);
    assert.isTrue(toolbar.hasItem(item));
    toolbar.removeToolbarItem(item);
    assert.isFalse(toolbar.hasItem(item));
  });

  describe('ToolbarMenuButton', () => {
    function createToolbarWithButton(
        contextMenuHandler: sinon.SinonStubStatic,
        ): UI.Toolbar.ToolbarMenuButton {
      const toolbar = renderElementIntoDOM(document.createElement('devtools-toolbar'));
      const menuButton = new UI.Toolbar.ToolbarMenuButton(contextMenuHandler);
      menuButton.setTriggerDelay(0);  // default is 200ms but don't want to slow tests down
      toolbar.appendToolbarItem(menuButton);
      return menuButton;
    }

    async function dispatchMouseDownEvent(element: HTMLElement): Promise<void> {
      const mouseDownEvent = new MouseEvent('mousedown', {
        buttons: 1,
      });
      element.dispatchEvent(mouseDownEvent);
      await doubleRaf();  // give the timer time to resolve + initiate the context menu
    }

    it('creates the context menu if it is enabled', async () => {
      const contextHandler = sinon.stub();
      const menuButton = createToolbarWithButton(contextHandler);
      menuButton.setEnabled(true);
      await dispatchMouseDownEvent(menuButton.element);
      assert.isTrue(contextHandler.called);
    });

    it('does not create a context menu if it is not enabled', async () => {
      const contextHandler = sinon.stub();
      const menuButton = createToolbarWithButton(contextHandler);
      menuButton.setEnabled(false);
      await dispatchMouseDownEvent(menuButton.element);
      assert.isFalse(contextHandler.called);
    });
  });
});
