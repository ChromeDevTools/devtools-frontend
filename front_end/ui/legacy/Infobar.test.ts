// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import {
  assertScreenshot,
  dispatchKeyDownEvent,
  getElementsWithinComponent,
  getElementWithinComponent,
  raf,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {
  createFakeSetting,
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';
import * as Buttons from '../components/buttons/buttons.js';
import {Link} from '../kit/kit.js';

import * as UI from './legacy.js';

describeWithEnvironment('Infobar', () => {
  const getInfobarElement = (infobar: UI.Infobar.Infobar): HTMLDivElement => {
    return getElementWithinComponent(infobar.element, '.infobar', HTMLDivElement);
  };

  const getMainRow = (infobar: UI.Infobar.Infobar): HTMLDivElement => {
    return getElementWithinComponent(infobar.element, '.infobar-main-row', HTMLDivElement);
  };

  const getInfoText = (infobar: UI.Infobar.Infobar): HTMLDivElement => {
    return getElementWithinComponent(infobar.element, '.infobar-info-text', HTMLDivElement);
  };

  const getCloseButton = (infobar: UI.Infobar.Infobar): HTMLElement => {
    return getElementWithinComponent(infobar.element, 'dt-close-button', HTMLElement);
  };

  const getDetails = (infobar: UI.Infobar.Infobar): HTMLDetailsElement => {
    return getElementWithinComponent(infobar.element, 'details', HTMLDetailsElement);
  };

  const getDetailsRows = (infobar: UI.Infobar.Infobar): HTMLDivElement[] => {
    return Array.from(
        getElementsWithinComponent(infobar.element, '.infobar-details-rows .infobar-details-row', HTMLDivElement));
  };

  const expandDetails = (infobar: UI.Infobar.Infobar): HTMLDetailsElement => {
    const details = getDetails(infobar);
    const summary = getElementWithinComponent(infobar.element, 'details > summary', HTMLElement);
    summary.click();
    return details;
  };

  const getActionButtons = (infobar: UI.Infobar.Infobar): Buttons.Button.Button[] => {
    return Array.from(
        getElementsWithinComponent(infobar.element, '.infobar-info-actions devtools-button', Buttons.Button.Button));
  };

  const getButtonByText = (infobar: UI.Infobar.Infobar, text: string): Buttons.Button.Button => {
    const button = getActionButtons(infobar).find(candidate => candidate.textContent === text);
    assert.exists(button, `Expected button with text "${text}"`);
    return button;
  };

  const finishAnimations = async(infobar: UI.Infobar.Infobar): Promise<void> => {
    await raf();
    for (const animation of infobar.element.getAnimations({subtree: true})) {
      animation.finish();
    }
    if (infobar.element.shadowRoot) {
      for (const animation of infobar.element.shadowRoot.getAnimations()) {
        animation.finish();
      }
    }
    await raf();
  };

  const checkDetailsMessage = (component: UI.Infobar.Infobar, messageText: string) => {
    renderElementIntoDOM(component.element);

    const details = getDetails(component);
    assert.isFalse(details.hasAttribute('open'));
    assert.deepEqual(getDetailsRows(component).map(row => row.textContent), [messageText]);

    expandDetails(component);
    assert.isTrue(details.hasAttribute('open'));
  };

  it('shows main message', () => {
    const component = new UI.Infobar.Infobar(UI.Infobar.Type.WARNING, 'This is a warning');
    renderElementIntoDOM(component.element);
    assert.strictEqual(getMainRow(component).textContent, 'This is a warning');
  });

  it('shows details message containing a string', () => {
    const component = new UI.Infobar.Infobar(UI.Infobar.Type.WARNING, 'This is a warning');
    const messageText = 'This is a more detailed warning';
    component.createDetailsRowMessage(messageText);
    checkDetailsMessage(component, messageText);
  });

  it('shows details message containing HTML element(s)', () => {
    const component = new UI.Infobar.Infobar(UI.Infobar.Type.WARNING, 'This is a warning');
    const linkText = 'example-link';
    const link = Link.create('https://www.example.com', linkText);
    component.createDetailsRowMessage(link);
    checkDetailsMessage(component, linkText);
  });

  it('appends multiple details rows in order', () => {
    const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message');
    infobar.createDetailsRowMessage('First row');
    infobar.createDetailsRowMessage('Second row');
    infobar.createDetailsRowMessage('Third row');
    renderElementIntoDOM(infobar.element);

    assert.deepEqual(
        getDetailsRows(infobar).map(row => row.textContent),
        ['First row', 'Second row', 'Third row'],
    );
  });

  describe('action buttons', () => {
    it('renders action text and invokes non-dismissing delegate without removing the infobar', () => {
      const keepOpenDelegate = sinon.spy();
      const closeCallback = sinon.spy();
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message', [
        {text: 'Keep open', delegate: keepOpenDelegate, dismiss: false},
      ]);
      infobar.setCloseCallback(closeCallback);
      renderElementIntoDOM(infobar.element);

      const button = getButtonByText(infobar, 'Keep open');
      button.click();

      sinon.assert.calledOnce(keepOpenDelegate);
      sinon.assert.notCalled(closeCallback);
      assert.isTrue(infobar.element.isConnected);
    });

    it('invokes dismissing action delegate, removes the infobar, and calls close callback', () => {
      const dismissDelegate = sinon.spy();
      const closeCallback = sinon.spy();
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message', [
        {text: 'Apply and close', delegate: dismissDelegate, dismiss: true},
      ]);
      infobar.setCloseCallback(closeCallback);
      renderElementIntoDOM(infobar.element);

      const button = getButtonByText(infobar, 'Apply and close');
      button.click();

      sinon.assert.calledOnce(dismissDelegate);
      sinon.assert.calledOnce(closeCallback);
      assert.isFalse(infobar.element.isConnected);
    });

    it('dismisses when an action has a null delegate and dismiss is true', () => {
      const closeCallback = sinon.spy();
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message', [
        {text: 'Dismiss only', delegate: null, dismiss: true},
      ]);
      infobar.setCloseCallback(closeCallback);
      renderElementIntoDOM(infobar.element);

      const button = getButtonByText(infobar, 'Dismiss only');
      button.click();

      sinon.assert.calledOnce(closeCallback);
      assert.isFalse(infobar.element.isConnected);
    });

    it('keeps the infobar open when an action has a null delegate and dismiss is false', () => {
      const closeCallback = sinon.spy();
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message', [
        {text: 'No-op', delegate: null, dismiss: false},
      ]);
      infobar.setCloseCallback(closeCallback);
      renderElementIntoDOM(infobar.element);

      const button = getButtonByText(infobar, 'No-op');
      button.click();

      sinon.assert.notCalled(closeCallback);
      assert.isTrue(infobar.element.isConnected);
    });

    it('uses OUTLINED by default without a disable setting and honors explicit buttonVariant', () => {
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message', [
        {text: 'Default action', delegate: null, dismiss: false},
        {text: 'Explicit primary', delegate: null, dismiss: false, buttonVariant: Buttons.Button.Variant.PRIMARY},
      ]);
      renderElementIntoDOM(infobar.element);

      assert.strictEqual(getButtonByText(infobar, 'Default action').variant, Buttons.Button.Variant.OUTLINED);
      assert.strictEqual(getButtonByText(infobar, 'Explicit primary').variant, Buttons.Button.Variant.PRIMARY);
    });

    it('uses TONAL by default when a disable setting is passed and honors explicit buttonVariant', () => {
      const disableSetting = createFakeSetting('infobar-test-disable-variant', false);
      const infobar = new UI.Infobar.Infobar(
          UI.Infobar.Type.INFO,
          'Message',
          [
            {text: 'Default tonal', delegate: null, dismiss: false},
            {text: 'Explicit primary', delegate: null, dismiss: false, buttonVariant: Buttons.Button.Variant.PRIMARY},
          ],
          disableSetting,
      );
      renderElementIntoDOM(infobar.element);

      assert.strictEqual(getButtonByText(infobar, 'Don’t show again').variant, Buttons.Button.Variant.OUTLINED);
      assert.strictEqual(getButtonByText(infobar, 'Default tonal').variant, Buttons.Button.Variant.TONAL);
      assert.strictEqual(getButtonByText(infobar, 'Explicit primary').variant, Buttons.Button.Variant.PRIMARY);
    });
  });

  describe('disable setting', () => {
    it('renders the "Don’t show again" button only when a disable setting is passed', () => {
      const withoutSetting = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message', [
        {text: 'Action', delegate: null, dismiss: false},
      ]);
      renderElementIntoDOM(withoutSetting.element);
      assert.deepEqual(
          getActionButtons(withoutSetting).map(button => button.textContent),
          ['Action'],
      );

      const disableSetting = createFakeSetting('infobar-test-disable-button', false);
      const withSetting = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message', undefined, disableSetting);
      renderElementIntoDOM(withSetting.element, {allowMultipleChildren: true});
      assert.deepEqual(
          getActionButtons(withSetting).map(button => button.textContent),
          ['Don’t show again'],
      );
    });

    it('sets the disable setting to true and dismisses when "Don’t show again" is clicked', () => {
      const disableSetting = createFakeSetting('infobar-test-disable-click', false);
      const closeCallback = sinon.spy();
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message', undefined, disableSetting);
      infobar.setCloseCallback(closeCallback);
      renderElementIntoDOM(infobar.element);

      const dontShowButton = getButtonByText(infobar, 'Don’t show again');
      dontShowButton.click();

      assert.isTrue(disableSetting.get());
      assert.isFalse(infobar.element.isConnected);
      sinon.assert.calledOnce(closeCallback);
    });

    it('returns null from Infobar.create when the disable setting is already true', () => {
      const disableSetting = createFakeSetting('infobar-test-already-disabled', true);
      assert.isNull(UI.Infobar.Infobar.create(UI.Infobar.Type.INFO, 'Message', undefined, disableSetting));

      disableSetting.set(false);
      const created = UI.Infobar.Infobar.create(UI.Infobar.Type.INFO, 'Message', undefined, disableSetting);
      assert.instanceOf(created, UI.Infobar.Infobar);
    });
  });

  describe('dismissal and parent view resize', () => {
    it('dismisses and invokes the close callback when clicking the close button', () => {
      const closeCallback = sinon.spy();
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message');
      infobar.setCloseCallback(closeCallback);
      renderElementIntoDOM(infobar.element);

      getCloseButton(infobar).click();

      assert.isFalse(infobar.element.isConnected);
      sinon.assert.calledOnce(closeCallback);
    });

    it('dismisses and invokes the close callback on Escape keydown from inside the infobar', () => {
      const closeCallback = sinon.spy();
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message');
      infobar.setCloseCallback(closeCallback);
      renderElementIntoDOM(infobar.element);
      const parentKeyDown = sinon.spy();
      infobar.element.parentElement!.addEventListener('keydown', parentKeyDown);

      dispatchKeyDownEvent(getCloseButton(infobar), {
        key: 'Escape',
        code: 'Escape',
        keyCode: UI.KeyboardShortcut.Keys.Esc.code,
        bubbles: true,
        composed: true,
      });

      sinon.assert.notCalled(parentKeyDown);
      assert.isFalse(infobar.element.isConnected);
      sinon.assert.calledOnce(closeCallback);
    });

    it('does not dismiss on non-Escape keydown', () => {
      const closeCallback = sinon.spy();
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message');
      infobar.setCloseCallback(closeCallback);
      renderElementIntoDOM(infobar.element);
      const parentKeyDown = sinon.spy();
      infobar.element.parentElement!.addEventListener('keydown', parentKeyDown);

      dispatchKeyDownEvent(getCloseButton(infobar), {
        key: 'Tab',
        code: 'Tab',
        bubbles: true,
        composed: true,
      });

      assert.isTrue(infobar.element.isConnected);
      sinon.assert.notCalled(closeCallback);
      sinon.assert.calledOnce(parentKeyDown);
    });

    it('calls parentView.doResize() when dismissed after setParentView', () => {
      const parentView = renderElementIntoDOM(new UI.Widget.VBox());
      const doResizeSpy = sinon.spy(parentView, 'doResize');
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message');
      infobar.setParentView(parentView);
      parentView.element.appendChild(infobar.element);

      infobar.dispose();

      sinon.assert.calledOnce(doResizeSpy);
      assert.isFalse(infobar.element.isConnected);
    });

    it('calls parentView.doResize() when setText is called after setParentView', () => {
      const parentView = renderElementIntoDOM(new UI.Widget.VBox());
      const doResizeSpy = sinon.spy(parentView, 'doResize');
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Initial text');
      infobar.setParentView(parentView);
      parentView.element.appendChild(infobar.element);

      infobar.setText('Updated text');

      sinon.assert.calledOnce(doResizeSpy);
      assert.strictEqual(getInfoText(infobar).textContent, 'Updated text');
    });
  });

  describe('attributes and text updates', () => {
    it('sets aria-label on .infobar and alert ARIA attributes on .infobar-info-text', () => {
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Initial text');
      renderElementIntoDOM(infobar.element);

      assert.strictEqual(getInfobarElement(infobar).getAttribute('aria-label'), 'Initial text');
      const infoText = getInfoText(infobar);
      assert.strictEqual(infoText.getAttribute('role'), 'alert');
      assert.strictEqual(infoText.getAttribute('aria-live'), 'polite');
    });

    it('updates .infobar-info-text when setText is called', () => {
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Initial text');
      renderElementIntoDOM(infobar.element);

      const infoText = getInfoText(infobar);
      assert.strictEqual(infoText.textContent, 'Initial text');

      infobar.setText('Updated text');
      assert.strictEqual(infoText.textContent, 'Updated text');
    });

    it('sets jslog on infobar.element only when jslogContext is passed', () => {
      const withoutContext = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message');
      assert.isFalse(withoutContext.element.hasAttribute('jslog'));

      const withContext = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message', undefined, undefined, 'test-infobar');
      assert.isTrue(withContext.element.hasAttribute('jslog'));
      assert.include(withContext.element.getAttribute('jslog') ?? '', 'test-infobar');
    });

    it('sets role="group" on .infobar only when actions are passed', () => {
      const withoutActions = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message');
      renderElementIntoDOM(withoutActions.element);
      assert.isFalse(getInfobarElement(withoutActions).hasAttribute('role'));

      const withActions = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message', [
        {text: 'Action', delegate: null, dismiss: false},
      ]);
      renderElementIntoDOM(withActions.element, {allowMultipleChildren: true});
      assert.strictEqual(getInfobarElement(withActions).getAttribute('role'), 'group');
    });

    it('sets tabindex on .infobar for every type except Type.ISSUE', () => {
      for (const type of [UI.Infobar.Type.WARNING, UI.Infobar.Type.INFO, UI.Infobar.Type.ERROR]) {
        const infobar = new UI.Infobar.Infobar(type, 'Message');
        renderElementIntoDOM(infobar.element, {allowMultipleChildren: true});
        const infobarElement = getInfobarElement(infobar);
        assert.strictEqual(infobarElement.getAttribute('tabindex'), '0', `Expected tabindex="0" for type ${type}`);
      }

      const issueInfobar = new UI.Infobar.Infobar(UI.Infobar.Type.ISSUE, 'Issue message');
      renderElementIntoDOM(issueInfobar.element, {allowMultipleChildren: true});
      assert.isFalse(getInfobarElement(issueInfobar).hasAttribute('tabindex'));
    });
  });

  describe('screenshots', () => {
    it('renders warning infobar with actions and disable setting', async () => {
      const disableSetting = createFakeSetting('infobar-screenshot-disable', false);
      const infobar = new UI.Infobar.Infobar(
          UI.Infobar.Type.WARNING,
          'This script is on the debugger’s ignore list.',
          [
            {text: 'Learn more', delegate: null, dismiss: false},
            {text: 'Configure', delegate: null, dismiss: false, buttonVariant: Buttons.Button.Variant.PRIMARY},
          ],
          disableSetting,
      );
      renderElementIntoDOM(infobar.element, {includeCommonStyles: true, width: 560, height: 120});
      await finishAnimations(infobar);

      await assertScreenshot('infobar/warning-with-actions.png');
    });

    it('renders info infobar with expanded details rows', async () => {
      const infobar = new UI.Infobar.Infobar(
          UI.Infobar.Type.INFO,
          'Source map skipped for this file.',
      );
      infobar.createDetailsRowMessage('Debugging power is reduced without a source map.');
      infobar.createDetailsRowMessage('Check the Developer Resources panel for details.');
      renderElementIntoDOM(infobar.element, {includeCommonStyles: true, width: 560, height: 160});

      expandDetails(infobar);
      await finishAnimations(infobar);

      await assertScreenshot('infobar/info-with-details-expanded.png');
    });
  });
});
