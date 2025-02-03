// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import * as Freestyler from '../ai_assistance.js';

describeWithEnvironment('UserActionRow', () => {
  function createComponent(props: Freestyler.UserActionRowProps):
      [sinon.SinonStub<[Freestyler.ViewInput, Freestyler.ViewOutput, HTMLElement], void>, Freestyler.UserActionRow] {
    const view = sinon.stub<[Freestyler.ViewInput, Freestyler.ViewOutput, HTMLElement]>();
    const component = new Freestyler.UserActionRow(undefined, view);
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
      const [viewInput] = view.args[0];
      expect(viewInput.isShowingFeedbackForm).equals(false);
      viewInput.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    assert.isTrue(view.calledTwice);
    {
      const [viewInput] = view.args[0];
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
      const [viewInput] = view.args[0];
      expect(viewInput.isShowingFeedbackForm).equals(false);
      viewInput.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    assert.isTrue(view.calledTwice);
    {
      const [viewInput] = view.args[0];
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
      const [viewInput] = view.args[0];
      expect(viewInput.isSubmitButtonDisabled).equals(false);
      viewInput.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    assert.isTrue(view.calledTwice);

    {
      const [viewInput] = view.args[0];
      expect(viewInput.isSubmitButtonDisabled).equals(false);
      expect(viewInput.isShowingFeedbackForm).equals(true);
      viewInput.onInputChange('test');
      viewInput.onSubmit(new SubmitEvent('submit'));
    }

    {
      const [viewInput] = view.args[0];
      expect(viewInput.isSubmitButtonDisabled).equals(true);
    }
  });
});
