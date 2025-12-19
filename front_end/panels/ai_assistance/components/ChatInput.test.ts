// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('ChatInput', () => {
  function createComponent():
      [ViewFunctionStub<typeof AiAssistance.ChatInput.ChatInput>, AiAssistance.ChatInput.ChatInput] {
    const view = createViewFunctionStub(AiAssistance.ChatInput.ChatInput);
    const component = new AiAssistance.ChatInput.ChatInput(undefined, view);
    component.wasShown();
    component.performUpdate();
    return [view, component];
  }

  it('should disable the send button when the input is empty', async () => {
    const [view, component] = createComponent();

    sinon.assert.callCount(view, 1);
    const mockTextArea = document.createElement('textarea');
    assert.isDefined(view.input.textAreaRef);
    (view.input.textAreaRef as {value: HTMLTextAreaElement}).value = mockTextArea;
    assert.isTrue(view.input.isTextInputEmpty);

    component.setInputValue('test');

    sinon.assert.callCount(view, 2);
    assert.isFalse(view.input.isTextInputEmpty);

    component.setInputValue('');

    sinon.assert.callCount(view, 3);
    assert.isTrue(view.input.isTextInputEmpty);

    component.setInputValue('test');

    sinon.assert.callCount(view, 4);
    assert.isFalse(view.input.isTextInputEmpty);
  });

  it('should render read-only state correctly', async () => {
    const [view, component] = createComponent();
    component.isReadOnly = true;
    component.performUpdate();

    sinon.assert.callCount(view, 2);
    assert.isTrue(view.input.isReadOnly);
  });
});
