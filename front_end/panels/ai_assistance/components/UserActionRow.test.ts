// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('UserActionRow', () => {
  function createComponent(props: AiAssistance.UserActionRow.UserActionRowWidgetParams):
      [ViewFunctionStub<typeof AiAssistance.UserActionRow.UserActionRow>, AiAssistance.UserActionRow.UserActionRow] {
    const view = createViewFunctionStub(AiAssistance.UserActionRow.UserActionRow);
    const component = new AiAssistance.UserActionRow.UserActionRow(undefined, view);
    Object.assign(component, props);
    component.wasShown();
    return [view, component];
  }

  it('should show the feedback form when canShowFeedbackForm is true', async () => {
    const [view] = createComponent({
      showRateButtons: true,
      canShowFeedbackForm: true,
      onSuggestionClick: sinon.stub(),
      onCopyResponseClick: sinon.stub(),
      onFeedbackSubmit: sinon.stub(),
    });

    sinon.assert.callCount(view, 1);

    {
      expect(view.input.isShowingFeedbackForm).equals(false);
      view.input.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    sinon.assert.callCount(view, 2);
    {
      expect(view.input.isShowingFeedbackForm).equals(true);
    }
  });

  it('should not show the feedback form when canShowFeedbackForm is false', async () => {
    const [view] = createComponent({
      showRateButtons: true,
      canShowFeedbackForm: false,
      onSuggestionClick: sinon.stub(),
      onCopyResponseClick: sinon.stub(),
      onFeedbackSubmit: sinon.stub(),
    });

    sinon.assert.callCount(view, 1);

    {
      expect(view.input.isShowingFeedbackForm).equals(false);
      view.input.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    sinon.assert.callCount(view, 2);
    {
      expect(view.input.isShowingFeedbackForm).equals(false);
    }
  });

  it('should disable the submit button when the input is empty', async () => {
    const [view] = createComponent({
      showRateButtons: true,
      canShowFeedbackForm: true,
      onSuggestionClick: sinon.stub(),
      onCopyResponseClick: sinon.stub(),
      onFeedbackSubmit: sinon.stub(),
    });

    sinon.assert.callCount(view, 1);

    {
      expect(view.input.isSubmitButtonDisabled).equals(true);
      view.input.onRatingClick(Host.AidaClient.Rating.POSITIVE);
    }

    sinon.assert.callCount(view, 2);

    {
      expect(view.input.isShowingFeedbackForm).equals(true);
      view.input.onInputChange('test');
    }

    {
      expect(view.input.isSubmitButtonDisabled).equals(false);
      view.input.onSubmit(new SubmitEvent('submit'));
    }

    {
      expect(view.input.isSubmitButtonDisabled).equals(true);
    }
  });

  describe('view', () => {
    it('looks fine', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      AiAssistance.UserActionRow.DEFAULT_VIEW(
          {
            onRatingClick: () => {},
            onReportClick: () => {},
            onCopyResponseClick: () => {},
            scrollSuggestionsScrollContainer: () => {},
            onSuggestionsScrollOrResize: () => {},
            onSuggestionClick: () => {},
            onSubmit: () => {},
            onClose: () => {},
            onInputChange: () => {},
            showRateButtons: true,
            isSubmitButtonDisabled: false,
            isShowingFeedbackForm: true,
          },
          {}, target);
      await assertScreenshot('ai_assistance/user_action_row.png');
    });
  });
});
