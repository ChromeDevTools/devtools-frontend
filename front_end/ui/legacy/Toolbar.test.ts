// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import {dispatchClickEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import * as RenderCoordinator from '../components/render_coordinator/render_coordinator.js';

import * as UI from './legacy.js';

describeWithLocale('Toolbar', () => {
  const {Toolbar} = UI.Toolbar;

  describe('Toolbar', () => {
    it('can be instantiated via `createElement`', () => {
      const toolbar = document.createElement('devtools-toolbar');

      assert.instanceOf(toolbar, Toolbar);
    });

    it('attaches a shadow root', () => {
      const toolbar = document.createElement('devtools-toolbar');

      assert.isNotNull(toolbar.shadowRoot, 'Expected Toolbar to use Light DOM');
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

    describe('floating', () => {
      it('defaults to off', () => {
        const toolbar = document.createElement('devtools-toolbar');

        assert.isFalse(toolbar.floating);
      });

      it('can be toggled on', () => {
        const toolbar = document.createElement('devtools-toolbar');

        toolbar.floating = true;

        assert.isTrue(toolbar.floating);
      });

      it('reflects changes onto the `floating` attribute', () => {
        const toolbar = document.createElement('devtools-toolbar');

        toolbar.floating = true;

        assert.isTrue(toolbar.hasAttribute('floating'));
      });
    });

    describe('hidden', () => {
      it('hides the toolbar when present', () => {
        const toolbar = renderElementIntoDOM(document.createElement('devtools-toolbar'));

        toolbar.hidden = true;

        assert.strictEqual(window.getComputedStyle(toolbar).display, 'none');
      });
    });

    describe('wrappable', () => {
      it('defaults to off', () => {
        const toolbar = document.createElement('devtools-toolbar');

        assert.isFalse(toolbar.wrappable);
      });

      it('can be toggled on', () => {
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
    }

    it('creates the context menu if it is enabled', async () => {
      const contextHandler = sinon.stub();
      const menuButton = createToolbarWithButton(contextHandler);
      menuButton.setEnabled(true);
      const contextHandlerCalled = expectCall(contextHandler);
      await dispatchMouseDownEvent(menuButton.element);
      await contextHandlerCalled;
    });

    it('does not create a context menu if it is not enabled', async () => {
      const contextHandler = sinon.stub();
      const menuButton = createToolbarWithButton(contextHandler);
      menuButton.setEnabled(false);
      await dispatchMouseDownEvent(menuButton.element);
      sinon.assert.notCalled(contextHandler);
    });
  });

  describeWithEnvironment('ToolbarSettingComboBox', () => {
    it('updates its title with the currently active setting', async () => {
      const setting = Common.Settings.Settings.instance().createSetting<string>('test-combo-box-setting', 'option-1');
      setting.set('option-1');
      const box = new UI.Toolbar.ToolbarSettingComboBox(
          [{value: 'option-1', label: 'Option 1'}, {value: 'option-2', label: 'Option 2'}], setting, 'title-value');
      assert.strictEqual(box.element.title, 'Option 1');
      const options = box.options();
      // Ensure it works with select()
      box.select(options[1]);
      assert.strictEqual(box.element.title, 'Option 2');

      // Ensure it works with setSelectedIndex()
      box.setSelectedIndex(0);
      assert.strictEqual(box.element.title, 'Option 1');
    });

    it('updates the title when the user changes the setting', async () => {
      const setting = Common.Settings.Settings.instance().createSetting<string>('test-combo-box-setting', 'option-1');
      setting.set('option-1');
      const box = new UI.Toolbar.ToolbarSettingComboBox(
          [{value: 'option-1', label: 'Option 1'}, {value: 'option-2', label: 'Option 2'}], setting, 'title-value');

      // Pretend that the user has interacted & clicked Option 2
      sinon.stub(box, 'selectedIndex').callsFake(() => 1);
      const changeEvent = new Event('change');
      box.element.dispatchEvent(changeEvent);
      assert.strictEqual(box.element.title, 'Option 2');
    });
  });
});
