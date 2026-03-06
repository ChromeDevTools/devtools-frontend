// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Media from './media.js';

describeWithEnvironment('PlayerMessagesView', () => {
  it('renders messages and errors correctly', async () => {
    const view = new Media.PlayerMessagesView.PlayerMessagesView();
    renderElementIntoDOM(view);

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

    await view.performUpdate();

    await assertScreenshot('media/PlayerMessagesView.png');
  });
});
