// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as UI from '../../legacy/legacy.js';

import * as Snackbars from './snackbars.js';

describeWithLocale('Snackbar', () => {
  let inspectorViewRootElementStub: HTMLElement;
  beforeEach(() => {
    inspectorViewRootElementStub = document.createElement('div');
    renderElementIntoDOM(inspectorViewRootElementStub, {allowMultipleChildren: true});

    const inspectorViewStub = sinon.createStubInstance(UI.InspectorView.InspectorView);
    Object.assign(inspectorViewStub, {element: inspectorViewRootElementStub});
    sinon.stub(UI.InspectorView.InspectorView, 'instance').returns(inspectorViewStub);
  });

  it('renders a basic snackbar', async () => {
    const snackbar = new Snackbars.Snackbar.Snackbar({message: 'Test message'});
    renderElementIntoDOM(snackbar, {allowMultipleChildren: true});

    assert.exists(snackbar.shadowRoot);
    const messageElement = snackbar.shadowRoot.querySelector('.message');
    assert.strictEqual(messageElement?.textContent?.trim(), 'Test message');
    assert.isFalse(snackbar.closable);
    assert.isNull(snackbar.actionButtonLabel);
  });

  it('renders a closable snackbar', async () => {
    const snackbar = new Snackbars.Snackbar.Snackbar({message: 'Test message', closable: true});
    renderElementIntoDOM(snackbar, {allowMultipleChildren: true});

    assert.exists(snackbar.shadowRoot);
    assert.isTrue(snackbar.closable);
    const closeButton = snackbar.shadowRoot.querySelector('devtools-button.dismiss');
    assert.exists(closeButton);
  });

  it('renders a snackbar with an action button', async () => {
    const actionHandler = sinon.spy();
    const snackbar = new Snackbars.Snackbar.Snackbar({
      message: 'Test message',
      actionProperties: {
        label: 'Click Me',
        onClick: actionHandler,
      },
    });
    renderElementIntoDOM(snackbar, {allowMultipleChildren: true});

    assert.exists(snackbar.shadowRoot);
    const actionButton = snackbar.shadowRoot.querySelector('devtools-button.snackbar-button');
    assert.exists(actionButton);
  });

  it('renders a snackbar with a long action button', async () => {
    const actionHandler = sinon.spy();
    const snackbar = new Snackbars.Snackbar.Snackbar({
      message: 'Test message',
      actionProperties: {
        label: 'This is a long action button',
        onClick: actionHandler,
      },
    });
    renderElementIntoDOM(snackbar, {allowMultipleChildren: true});

    assert.exists(snackbar.shadowRoot);
    const container = snackbar.shadowRoot.querySelector('.container');
    assert.isTrue(container?.classList.contains('long-action'));
    const actionButton = snackbar.shadowRoot.querySelector('.long-action-container devtools-button');
    assert.exists(actionButton);
  });

  describe('closes the snackbar', () => {
    it('closes the snackbar when the close button is clicked', async () => {
      const snackbar = Snackbars.Snackbar.Snackbar.show({message: 'Click Me', closable: true});

      assert.isTrue(inspectorViewRootElementStub.contains(snackbar));
      assert.exists(snackbar.shadowRoot);
      const closeButton = snackbar.shadowRoot.querySelector('devtools-button.dismiss');
      assert.exists(closeButton);

      dispatchClickEvent(closeButton);
      assert.isFalse(inspectorViewRootElementStub.contains(snackbar));
    });

    it('closes the snackbar and calls handler when the action button is clicked', async () => {
      const actionHandler = sinon.spy();
      const snackbar = Snackbars.Snackbar.Snackbar.show({
        message: 'Message',
        actionProperties: {label: 'Click Me', onClick: actionHandler},
      });

      assert.isTrue(inspectorViewRootElementStub.contains(snackbar));
      assert.exists(snackbar.shadowRoot);
      const actionButton = snackbar.shadowRoot.querySelector('devtools-button');
      assert.exists(actionButton);

      dispatchClickEvent(actionButton);
      sinon.assert.calledOnce(actionHandler);
      assert.isFalse(inspectorViewRootElementStub.contains(snackbar));
    });
  });

  describe('snackbarQueue', () => {
    beforeEach(() => {
      Snackbars.Snackbar.Snackbar.snackbarQueue = [];
    });

    it('shows the first snackbar and queues the second', () => {
      const snackbar1 = Snackbars.Snackbar.Snackbar.show({message: 'Snackbar 1'});
      const snackbar2 = Snackbars.Snackbar.Snackbar.show({message: 'Snackbar 2'});

      assert.isTrue(inspectorViewRootElementStub.contains(snackbar1));
      assert.isFalse(inspectorViewRootElementStub.contains(snackbar2));
      assert.lengthOf(Snackbars.Snackbar.Snackbar.snackbarQueue, 2);
    });

    it('shows the second snackbar after the first one is manually closed', () => {
      const snackbar1 = Snackbars.Snackbar.Snackbar.show({message: 'Snackbar 1', closable: true});
      const snackbar2 = Snackbars.Snackbar.Snackbar.show({message: 'Snackbar 2'});

      assert.isTrue(inspectorViewRootElementStub.contains(snackbar1));
      assert.isFalse(inspectorViewRootElementStub.contains(snackbar2));
      assert.exists(snackbar1.shadowRoot);
      const closeButton = snackbar1.shadowRoot.querySelector('devtools-button.dismiss');
      assert.exists(closeButton);
      dispatchClickEvent(closeButton);

      assert.isFalse(inspectorViewRootElementStub.contains(snackbar1));
      assert.isTrue(inspectorViewRootElementStub.contains(snackbar2));
      assert.lengthOf(Snackbars.Snackbar.Snackbar.snackbarQueue, 1);
    });
  });
});
