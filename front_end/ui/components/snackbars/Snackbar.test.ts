// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';

import * as Snackbars from './snackbars.js';

describeWithLocale('Snackbar', () => {
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

  it('closes the snackbar when the close button is clicked', async () => {
    const snackbar = Snackbars.Snackbar.Snackbar.show({message: 'Click Me', closable: true});

    assert.isTrue(document.body.contains(snackbar));
    assert.exists(snackbar.shadowRoot);
    const closeButton = snackbar.shadowRoot.querySelector('devtools-button.dismiss');
    assert.exists(closeButton);

    dispatchClickEvent(closeButton);
    assert.isFalse(document.body.contains(snackbar));
  });

  it('closes the snackbar and calls handler when the action button is clicked', async () => {
    const actionHandler = sinon.spy();
    const snackbar = Snackbars.Snackbar.Snackbar.show({
      message: 'Message',
      actionProperties: {label: 'Click Me', onClick: actionHandler},
    });

    assert.isTrue(document.body.contains(snackbar));
    assert.exists(snackbar.shadowRoot);
    const actionButton = snackbar.shadowRoot.querySelector('devtools-button');
    assert.exists(actionButton);

    dispatchClickEvent(actionButton);
    sinon.assert.calledOnce(actionHandler);
    assert.isFalse(document.body.contains(snackbar));
  });
});
