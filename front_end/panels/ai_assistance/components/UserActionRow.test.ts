// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('UserActionRow', () => {
  function createComponent(props: AiAssistance.UserActionRowWidgetParams): [
    sinon.SinonStub<[AiAssistance.ViewInput, AiAssistance.ViewOutput, HTMLElement], void>, AiAssistance.UserActionRow
  ] {
    const view = sinon.stub<[AiAssistance.ViewInput, AiAssistance.ViewOutput, HTMLElement]>();
    const component = new AiAssistance.UserActionRow(undefined, view);
    Object.assign(component, props);
    component.wasShown();
    return [view, component];
  }

  it('should show the feedback form when canShowFeedbackForm is true', async () => {
    const [view] = createComponent({
      showRateButtons: true,
      canShowFeedbackForm: true,
      onSuggestionClick: sinon.stub(),
      onFeedbackSubmit: sinon.stub(),
    });

    assert.isTrue(view.calledOnce);

    {
      const [viewInput] = view.lastCall.args;
      expect(viewInput.isShowingFeedbackForm).equals(false);
      viewInput.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    assert.isTrue(view.calledTwice);
    {
      const [viewInput] = view.lastCall.args;
      expect(viewInput.isShowingFeedbackForm).equals(true);
    }
  });

  it('should not show the feedback form when canShowFeedbackForm is false', async () => {
    const [view] = createComponent({
      showRateButtons: true,
      canShowFeedbackForm: false,
      onSuggestionClick: sinon.stub(),
      onFeedbackSubmit: sinon.stub(),
    });

    assert.isTrue(view.calledOnce);

    {
      const [viewInput] = view.lastCall.args;
      expect(viewInput.isShowingFeedbackForm).equals(false);
      viewInput.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    assert.isTrue(view.calledTwice);
    {
      const [viewInput] = view.lastCall.args;
      expect(viewInput.isShowingFeedbackForm).equals(false);
    }
  });

  it('should disable the submit button when the input is empty', async () => {
    const [view] = createComponent({
      showRateButtons: true,
      canShowFeedbackForm: true,
      onSuggestionClick: sinon.stub(),
      onFeedbackSubmit: sinon.stub(),
    });

    assert.isTrue(view.calledOnce);

    {
      const [viewInput] = view.lastCall.args;
      expect(viewInput.isSubmitButtonDisabled).equals(false);
      viewInput.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    assert.isTrue(view.calledTwice);

    {
      const [viewInput] = view.lastCall.args;
      expect(viewInput.isSubmitButtonDisabled).equals(false);
      expect(viewInput.isShowingFeedbackForm).equals(true);
      viewInput.onInputChange('test');
      viewInput.onSubmit(new SubmitEvent('submit'));
    }

    {
      const [viewInput] = view.lastCall.args;
      expect(viewInput.isSubmitButtonDisabled).equals(true);
    }
  });
});
