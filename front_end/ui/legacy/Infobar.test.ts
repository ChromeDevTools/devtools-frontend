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
import {expectCall} from '../../testing/ExpectStubCall.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Buttons from '../components/buttons/buttons.js';
import {Link} from '../kit/kit.js';
import {html, nothing, render} from '../lit/lit.js';

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
    renderElementIntoDOM(component);

    const details = getDetails(component);
    assert.isFalse(details.hasAttribute('open'));
    assert.deepEqual(getDetailsRows(component).map(row => row.textContent), [messageText]);

    expandDetails(component);
    assert.isTrue(details.hasAttribute('open'));
  };

  it('shows main message', () => {
    const component = new UI.Infobar.Infobar(UI.Infobar.Type.WARNING, 'This is a warning');
    renderElementIntoDOM(component);
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
    renderElementIntoDOM(infobar);

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
      renderElementIntoDOM(infobar);

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
      renderElementIntoDOM(infobar);

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
      renderElementIntoDOM(infobar);

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
      renderElementIntoDOM(infobar);

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
      renderElementIntoDOM(infobar);

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
      renderElementIntoDOM(infobar);

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
      renderElementIntoDOM(withoutSetting);
      assert.deepEqual(
          getActionButtons(withoutSetting).map(button => button.textContent),
          ['Action'],
      );

      const disableSetting = createFakeSetting('infobar-test-disable-button', false);
      const withSetting = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message', undefined, disableSetting);
      renderElementIntoDOM(withSetting, {allowMultipleChildren: true});
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
      renderElementIntoDOM(infobar);

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
      renderElementIntoDOM(infobar);

      getCloseButton(infobar).click();

      assert.isFalse(infobar.element.isConnected);
      sinon.assert.calledOnce(closeCallback);
    });

    it('dismisses and invokes the close callback on Escape keydown from inside the infobar', () => {
      const closeCallback = sinon.spy();
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message');
      infobar.setCloseCallback(closeCallback);
      renderElementIntoDOM(infobar);
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
      renderElementIntoDOM(infobar);
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
      infobar.show(parentView.element);

      infobar.dispose();

      sinon.assert.calledOnce(doResizeSpy);
      assert.isFalse(infobar.element.isConnected);
    });

    it('calls parentView.doResize() when setText is called after setParentView', () => {
      const parentView = renderElementIntoDOM(new UI.Widget.VBox());
      const doResizeSpy = sinon.spy(parentView, 'doResize');
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Initial text');
      infobar.setParentView(parentView);
      infobar.show(parentView.element);

      infobar.setText('Updated text');

      sinon.assert.calledOnce(doResizeSpy);
      assert.strictEqual(getInfoText(infobar).textContent, 'Updated text');
    });
  });

  describe('attributes and text updates', () => {
    it('sets aria-label on .infobar and alert ARIA attributes on .infobar-info-text', () => {
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Initial text');
      renderElementIntoDOM(infobar);

      assert.strictEqual(getInfobarElement(infobar).getAttribute('aria-label'), 'Initial text');
      const infoText = getInfoText(infobar);
      assert.strictEqual(infoText.getAttribute('role'), 'alert');
      assert.strictEqual(infoText.getAttribute('aria-live'), 'polite');
    });

    it('updates .infobar-info-text when setText is called', () => {
      const infobar = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Initial text');
      renderElementIntoDOM(infobar);

      const infoText = getInfoText(infobar);
      assert.strictEqual(infoText.textContent, 'Initial text');

      infobar.setText('Updated text');
      assert.strictEqual(infoText.textContent, 'Updated text');
    });

    it('renders updated reactive property when detached before animation frame and re-shown', async () => {
      const infobar = new UI.Infobar.Infobar(undefined);
      infobar.text = 'Initial';
      renderElementIntoDOM(infobar);
      await infobar.updateComplete;
      assert.strictEqual(getInfoText(infobar).textContent, 'Initial');

      infobar.text = 'Updated';
      infobar.detach();
      renderElementIntoDOM(infobar, {allowMultipleChildren: true});
      await infobar.updateComplete;

      assert.strictEqual(getInfoText(infobar).textContent, 'Updated');
    });

    it('renders reactive property mutated while detached once shown', async () => {
      const infobar = new UI.Infobar.Infobar(undefined);
      infobar.text = 'Initial';
      renderElementIntoDOM(infobar);
      await infobar.updateComplete;

      infobar.detach();
      infobar.text = 'Updated while detached';
      renderElementIntoDOM(infobar, {allowMultipleChildren: true});
      await infobar.updateComplete;

      assert.strictEqual(getInfoText(infobar).textContent, 'Updated while detached');
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
      renderElementIntoDOM(withoutActions);
      assert.isFalse(getInfobarElement(withoutActions).hasAttribute('role'));

      const withActions = new UI.Infobar.Infobar(UI.Infobar.Type.INFO, 'Message', [
        {text: 'Action', delegate: null, dismiss: false},
      ]);
      renderElementIntoDOM(withActions, {allowMultipleChildren: true});
      assert.strictEqual(getInfobarElement(withActions).getAttribute('role'), 'group');
    });

    it('sets tabindex on .infobar for every type except Type.ISSUE', () => {
      for (const type of [UI.Infobar.Type.WARNING, UI.Infobar.Type.INFO, UI.Infobar.Type.ERROR]) {
        const infobar = new UI.Infobar.Infobar(type, 'Message');
        renderElementIntoDOM(infobar, {allowMultipleChildren: true});
        const infobarElement = getInfobarElement(infobar);
        assert.strictEqual(infobarElement.getAttribute('tabindex'), '0', `Expected tabindex="0" for type ${type}`);
      }

      const issueInfobar = new UI.Infobar.Infobar(UI.Infobar.Type.ISSUE, 'Issue message');
      renderElementIntoDOM(issueInfobar, {allowMultipleChildren: true});
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
      renderElementIntoDOM(infobar, {includeCommonStyles: true, width: 560, height: 120});
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
      renderElementIntoDOM(infobar, {includeCommonStyles: true, width: 560, height: 160});

      expandDetails(infobar);
      await finishAnimations(infobar);

      await assertScreenshot('infobar/info-with-details-expanded.png');
    });
  });
});

describeWithEnvironment('Infobar Widget', () => {
  it('renders via view function and updates reactive properties', async () => {
    const view = createViewFunctionStub(UI.Infobar.Infobar);
    const infobar = new UI.Infobar.Infobar(undefined, view);
    renderElementIntoDOM(infobar);
    await infobar.updateComplete;

    sinon.assert.callCount(view, 1);
    assert.strictEqual(view.input.type, UI.Infobar.Type.INFO);
    assert.strictEqual(view.input.text, '');
    assert.isFalse(view.input.hasDisableSetting);
    assert.deepEqual(view.input.detailsRows, []);

    const nextInput = view.nextInput;
    const actions: UI.Infobar.InfobarAction[] = [{text: 'Action', delegate: null, dismiss: true}];
    const disableSetting = createFakeSetting('infobar-widget-disable', false);
    infobar.type = UI.Infobar.Type.WARNING;
    infobar.text = 'Updated';
    infobar.actions = actions;
    infobar.disableSetting = disableSetting;
    infobar.jslogContext = 'my-infobar';
    infobar.detailsRows = [html`<span>Template row</span>`];

    const updated = await nextInput;
    assert.strictEqual(updated.type, UI.Infobar.Type.WARNING);
    assert.strictEqual(updated.text, 'Updated');
    assert.strictEqual(updated.actions, actions);
    assert.isTrue(updated.hasDisableSetting);
    assert.strictEqual(updated.jslogContext, 'my-infobar');
    assert.lengthOf(updated.detailsRows, 1);
  });

  it('does not schedule updates when property values are unchanged', async () => {
    const view = createViewFunctionStub(UI.Infobar.Infobar);
    const infobar = new UI.Infobar.Infobar(undefined, view);

    infobar.type = UI.Infobar.Type.INFO;
    infobar.text = '';
    infobar.actions = undefined;
    infobar.disableSetting = null;
    infobar.jslogContext = undefined;
    infobar.detailsRows = infobar.detailsRows;

    await UI.Widget.Widget.allUpdatesComplete;
    sinon.assert.callCount(view, 0);
  });

  it('calls parentWidget().doResize() after text property update completes', async () => {
    const view = createViewFunctionStub(UI.Infobar.Infobar);
    const parentView = renderElementIntoDOM(new UI.Widget.VBox());
    const doResizeSpy = sinon.spy(parentView, 'doResize');

    const infobar = new UI.Infobar.Infobar(undefined, view);
    infobar.show(parentView.element);
    await infobar.updateComplete;

    infobar.text = 'New';
    sinon.assert.notCalled(doResizeSpy);
    await infobar.updateComplete;
    sinon.assert.calledOnce(doResizeSpy);
  });

  it('calls setParentView target doResize() after text property update completes', async () => {
    const view = createViewFunctionStub(UI.Infobar.Infobar);
    const parentView = renderElementIntoDOM(new UI.Widget.VBox());
    const doResizeSpy = sinon.spy(parentView, 'doResize');

    const infobar = new UI.Infobar.Infobar(undefined, view);
    infobar.setParentView(parentView);
    renderElementIntoDOM(infobar, {allowMultipleChildren: true});
    await infobar.updateComplete;

    infobar.text = 'New';
    sinon.assert.notCalled(doResizeSpy);
    await infobar.updateComplete;
    sinon.assert.calledOnce(doResizeSpy);
  });

  it('invokes non-dismissing action delegate via onAction without calling onClose', async () => {
    const view = createViewFunctionStub(UI.Infobar.Infobar);
    const onClose = sinon.spy();
    const delegate = sinon.spy();
    const infobar = new UI.Infobar.Infobar(undefined, view);
    infobar.onClose = onClose;
    renderElementIntoDOM(infobar);
    await infobar.updateComplete;

    view.input.onAction({text: 'Keep', delegate, dismiss: false});
    sinon.assert.calledOnce(delegate);
    sinon.assert.notCalled(onClose);
  });

  it('invokes dismissing action delegate via onAction and calls onClose', async () => {
    const view = createViewFunctionStub(UI.Infobar.Infobar);
    const onClose = sinon.spy();
    const delegate = sinon.spy();
    const infobar = new UI.Infobar.Infobar(undefined, view);
    infobar.onClose = onClose;
    renderElementIntoDOM(infobar);
    await infobar.updateComplete;

    view.input.onAction({text: 'Close', delegate, dismiss: true});
    sinon.assert.calledOnce(delegate);
    sinon.assert.calledOnce(onClose);
  });

  it('updates disableSetting and calls onClose when onDisable is invoked', async () => {
    const view = createViewFunctionStub(UI.Infobar.Infobar);
    const onClose = sinon.spy();
    const disableSetting = createFakeSetting('infobar-widget-callback-disable', false);
    const infobar = new UI.Infobar.Infobar(undefined, view);
    infobar.onClose = onClose;
    infobar.disableSetting = disableSetting;
    renderElementIntoDOM(infobar);
    await infobar.updateComplete;

    view.input.onDisable();
    assert.isTrue(disableSetting.get());
    sinon.assert.calledOnce(onClose);
  });

  it('calls onClose when onDismiss is invoked', async () => {
    const view = createViewFunctionStub(UI.Infobar.Infobar);
    const onClose = sinon.spy();
    const infobar = new UI.Infobar.Infobar(undefined, view);
    infobar.onClose = onClose;
    renderElementIntoDOM(infobar);
    await infobar.updateComplete;

    view.input.onDismiss();
    sinon.assert.calledOnce(onClose);
  });

  it('keeps declarative devtools-widget connected when dispose() is called', async () => {
    const container = renderElementIntoDOM(document.createElement('div'));
    const onClose = sinon.spy();
    render(html`${UI.Widget.widget(UI.Infobar.Infobar, {
             type: UI.Infobar.Type.INFO,
             text: 'Hello',
             onClose,
           })}`,
           container);
    await UI.Widget.Widget.allUpdatesComplete;

    const widgetElement = container.querySelector('devtools-widget') as UI.Widget.WidgetElement<UI.Infobar.Infobar>;
    assert.exists(widgetElement);
    const infobar = widgetElement.getWidget();
    assert.instanceOf(infobar, UI.Infobar.Infobar);

    infobar.dispose();

    sinon.assert.calledOnce(onClose);
    assert.isTrue(widgetElement.isConnected);
    assert.isTrue(infobar.element.isConnected);
  });

  it('calls parentWidget().doResize() when declarative devtools-widget disconnects, and not synchronously in dispose()',
     async () => {
       const parentView = renderElementIntoDOM(new UI.Widget.VBox());
       const onClose = sinon.spy();
       render(html`${UI.Widget.widget(UI.Infobar.Infobar, {
                type: UI.Infobar.Type.INFO,
                text: 'Hello',
                onClose,
              })}`,
              parentView.contentElement);
       await UI.Widget.Widget.allUpdatesComplete;

       const widgetElement =
           parentView.contentElement.querySelector('devtools-widget') as UI.Widget.WidgetElement<UI.Infobar.Infobar>;
       assert.exists(widgetElement);
       const infobar = widgetElement.getWidget();
       assert.instanceOf(infobar, UI.Infobar.Infobar);

       const doResizeStub = sinon.stub(parentView, 'doResize');
       infobar.dispose();
       sinon.assert.calledOnce(onClose);
       sinon.assert.notCalled(doResizeStub);

       const doResizeCalled = expectCall(doResizeStub);
       render(nothing, parentView.contentElement);
       await doResizeCalled;
       sinon.assert.calledOnce(doResizeStub);
     });
});
