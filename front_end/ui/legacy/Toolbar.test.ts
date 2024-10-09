// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Coordinator from '../components/render_coordinator/render_coordinator.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

import {
  dispatchClickEvent,
  doubleRaf,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

describeWithLocale('Toolbar', () => {
  describe('ToolbarInput', () => {
    it('sets a title on the clear button', async () => {
      const input = new UI.Toolbar.ToolbarInput('placeholder');
      renderElementIntoDOM(input.element);
      input.setValue('test value');
      const clearButton = input.element.querySelector('.toolbar-input-clear-button');
      await coordinator.done();
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
    const div = document.createElement('div');
    const toolbar = new UI.Toolbar.Toolbar('test-toolbar', div);
    renderElementIntoDOM(div);

    const itemOne = new UI.Toolbar.ToolbarInput('placeholder-item-1');
    toolbar.appendToolbarItem(itemOne);
    const itemTwo = new UI.Toolbar.ToolbarInput('placeholder-item-2');
    toolbar.appendToolbarItem(itemTwo);

    const toolbarInputs = div.querySelector('.toolbar')?.shadowRoot?.querySelectorAll('[data-placeholder]');
    assert.isOk(toolbarInputs);
    assert.lengthOf(toolbarInputs, 2);

    const placeholders = Array.from(toolbarInputs).map(input => {
      return input.getAttribute('data-placeholder');
    });

    assert.deepEqual(placeholders, ['placeholder-item-1', 'placeholder-item-2']);
  });

  it('can prepend items into the toolbar', async () => {
    const div = document.createElement('div');
    const toolbar = new UI.Toolbar.Toolbar('test-toolbar', div);
    renderElementIntoDOM(div);

    const itemOne = new UI.Toolbar.ToolbarInput('placeholder-item-1');
    toolbar.appendToolbarItem(itemOne);
    const itemTwo = new UI.Toolbar.ToolbarInput('placeholder-item-2');
    toolbar.prependToolbarItem(itemTwo);

    const toolbarInputs = div.querySelector('.toolbar')?.shadowRoot?.querySelectorAll('[data-placeholder]');
    assert.isOk(toolbarInputs);
    assert.lengthOf(toolbarInputs, 2);

    const placeholders = Array.from(toolbarInputs).map(input => {
      return input.getAttribute('data-placeholder');
    });

    // Ensure the second item was prepended correctly
    assert.deepEqual(placeholders, ['placeholder-item-2', 'placeholder-item-1']);
  });

  it('knows if it has an item in the toolbar', async () => {
    const toolbar = new UI.Toolbar.Toolbar('test-toolbar');
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
      const div = document.createElement('div');
      const toolbar = new UI.Toolbar.Toolbar('test-toolbar', div);
      renderElementIntoDOM(div);
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
