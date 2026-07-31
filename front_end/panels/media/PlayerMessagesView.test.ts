// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, dispatchInputEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Media from './media.js';

describeWithEnvironment('PlayerMessagesView', () => {
  it('renders messages and errors correctly', async () => {
    const view = new Media.PlayerMessagesView.PlayerMessagesView();
    renderElementIntoDOM(view, {includeCommonStyles: true});

    view.addMessage({
      level: Protocol.Media.PlayerMessageLevel.Info,
      message: 'This is an info message',
    } as Protocol.Media.PlayerMessage);

    view.addMessage({
      level: Protocol.Media.PlayerMessageLevel.Warning,
      message: 'This is a warning message',
    } as Protocol.Media.PlayerMessage);

    view.addMessage({
      level: Protocol.Media.PlayerMessageLevel.Error,
      message: 'This is an error message',
    } as Protocol.Media.PlayerMessage);

    view.addMessage({
      level: Protocol.Media.PlayerMessageLevel.Debug,
      message: 'This is a debug message',
    } as Protocol.Media.PlayerMessage);

    view.addError({
      errorType: 'pipeline_error',
      code: 123,
      stack: [
        {file: 'foo.js', line: 10},
        {file: 'bar.js', line: 20},
      ],
      cause: [{
        errorType: 'inner_error',
        code: 456,
        stack: [],
        cause: [],
        data: {},
      }],
      data: {extra: 'info'},
    } as Protocol.Media.PlayerError);

    view.regenerateMessageDisplayCss([]);
    view.performUpdate();

    await assertScreenshot('media/PlayerMessagesView.png');
  });

  it('filters messages by log level', () => {
    const view = new Media.PlayerMessagesView.PlayerMessagesView();
    renderElementIntoDOM(view);

    view.addMessage({
      level: Protocol.Media.PlayerMessageLevel.Info,
      message: 'First info message',
    } as Protocol.Media.PlayerMessage);

    view.addMessage({
      level: Protocol.Media.PlayerMessageLevel.Error,
      message: 'Critical error message',
    } as Protocol.Media.PlayerMessage);

    const messages = view.contentElement.getElementsByClassName('media-messages-message-container');
    assert.lengthOf(messages, 2);
    assert.isFalse(messages[0].classList.contains('media-messages-message-unselected'));
    assert.isFalse(messages[1].classList.contains('media-messages-message-unselected'));

    view.regenerateMessageDisplayCss(['info']);
    assert.isTrue(messages[0].classList.contains('media-messages-message-unselected'));
    assert.isFalse(messages[1].classList.contains('media-messages-message-unselected'));

    view.regenerateMessageDisplayCss([]);
    assert.isFalse(messages[0].classList.contains('media-messages-message-unselected'));
    assert.isFalse(messages[1].classList.contains('media-messages-message-unselected'));
  });

  it('filters messages by filter string', () => {
    const view = new Media.PlayerMessagesView.PlayerMessagesView();
    renderElementIntoDOM(view);

    view.addMessage({
      level: Protocol.Media.PlayerMessageLevel.Info,
      message: 'First info message about decoding',
    } as Protocol.Media.PlayerMessage);

    view.addMessage({
      level: Protocol.Media.PlayerMessageLevel.Error,
      message: 'Critical error message about network',
    } as Protocol.Media.PlayerMessage);

    const messages = view.contentElement.getElementsByClassName('media-messages-message-container');
    assert.lengthOf(messages, 2);
    assert.isFalse(messages[0].classList.contains('media-messages-message-filtered'));
    assert.isFalse(messages[1].classList.contains('media-messages-message-filtered'));

    const filterInput = view.contentElement.querySelector('.toolbar-filter .text-prompt');
    assert.instanceOf(filterInput, HTMLElement);
    filterInput.textContent = 'decoding';
    dispatchInputEvent(filterInput);
    assert.isFalse(messages[0].classList.contains('media-messages-message-filtered'));
    assert.isTrue(messages[1].classList.contains('media-messages-message-filtered'));

    filterInput.textContent = '';
    dispatchInputEvent(filterInput);
    assert.isFalse(messages[0].classList.contains('media-messages-message-filtered'));
    assert.isFalse(messages[1].classList.contains('media-messages-message-filtered'));
  });

  it('filters errors by filter string including causes', () => {
    const view = new Media.PlayerMessagesView.PlayerMessagesView();
    renderElementIntoDOM(view);

    view.addError({
      errorType: 'pipeline_error',
      code: 123,
      stack: [
        {file: 'foo.js', line: 10},
      ],
      cause: [
        {
          errorType: 'decoder_error',
          code: 456,
          stack: [],
          cause: [],
          data: {codec: 'h264'},
        },
        {
          errorType: 'render_error',
          code: 789,
          stack: [],
          cause: [],
          data: {renderer: 'somerenderer'},
        },
      ],
      data: {extra: 'info'},
    } as Protocol.Media.PlayerError);

    view.addError({
      errorType: 'network_error',
      code: 404,
      stack: [],
      cause: [],
      data: {url: 'example.com'},
    } as Protocol.Media.PlayerError);

    const messages = view.contentElement.getElementsByClassName('media-messages-message-container');
    assert.lengthOf(messages, 2);
    assert.isFalse(messages[0].classList.contains('media-messages-message-filtered'));
    assert.isFalse(messages[1].classList.contains('media-messages-message-filtered'));

    // Both causes should be rendered in the DOM
    assert.include(messages[0].textContent, 'decoder_error');
    assert.include(messages[0].textContent, 'render_error');

    const filterInput = view.contentElement.querySelector('.toolbar-filter .text-prompt');
    assert.instanceOf(filterInput, HTMLElement);

    // Filter by first cause
    filterInput.textContent = 'decoder_error';
    dispatchInputEvent(filterInput);
    assert.isFalse(messages[0].classList.contains('media-messages-message-filtered'));
    assert.isTrue(messages[1].classList.contains('media-messages-message-filtered'));

    // Filter by second cause
    filterInput.textContent = 'render_error';
    dispatchInputEvent(filterInput);
    assert.isFalse(messages[0].classList.contains('media-messages-message-filtered'));
    assert.isTrue(messages[1].classList.contains('media-messages-message-filtered'));

    // Filter by data inside second cause
    filterInput.textContent = 'somerenderer';
    dispatchInputEvent(filterInput);
    assert.isFalse(messages[0].classList.contains('media-messages-message-filtered'));
    assert.isTrue(messages[1].classList.contains('media-messages-message-filtered'));

    // Filter by error code of second error
    filterInput.textContent = '404';
    dispatchInputEvent(filterInput);
    assert.isTrue(messages[0].classList.contains('media-messages-message-filtered'));
    assert.isFalse(messages[1].classList.contains('media-messages-message-filtered'));

    // Filter by string that does not match any of the messages
    filterInput.textContent = 'success';
    dispatchInputEvent(filterInput);
    assert.isTrue(messages[0].classList.contains('media-messages-message-filtered'));
    assert.isTrue(messages[1].classList.contains('media-messages-message-filtered'));

    // Reset filter
    filterInput.textContent = '';
    dispatchInputEvent(filterInput);
    assert.isFalse(messages[0].classList.contains('media-messages-message-filtered'));
    assert.isFalse(messages[1].classList.contains('media-messages-message-filtered'));
  });
});
