// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';

import * as SurveyLink from './survey_link.js';

function canShowSuccessfulCallback(trigger: string, callback: SurveyLink.SurveyLink.CanShowSurveyCallback) {
  callback({canShowSurvey: true});
}
function showSuccessfulCallback(trigger: string, callback: SurveyLink.SurveyLink.ShowSurveyCallback) {
  callback({surveyShown: true});
}
function canShowFailureCallback(trigger: string, callback: SurveyLink.SurveyLink.CanShowSurveyCallback) {
  callback({canShowSurvey: false});
}
function showFailureCallback(trigger: string, callback: SurveyLink.SurveyLink.ShowSurveyCallback) {
  callback({surveyShown: false});
}

const empty = Common.UIString.LocalizedEmptyString;

describeWithLocale('SurveyLink', () => {
  it('shows no link when canShowSurvey is still pending', () => {
    const link = new SurveyLink.SurveyLink.SurveyLink();
    link.data = {trigger: 'test trigger', promptText: empty, canShowSurvey: () => {}, showSurvey: () => {}};
    renderElementIntoDOM(link);

    assert.isNotNull(link.shadowRoot);
    assert.strictEqual(link.shadowRoot.childElementCount, 0);
  });

  it('shows no link when canShowSurvey is false', () => {
    const link = new SurveyLink.SurveyLink.SurveyLink();
    link.data =
        {trigger: 'test trigger', promptText: empty, canShowSurvey: canShowFailureCallback, showSurvey: () => {}};
    renderElementIntoDOM(link);

    assert.isNotNull(link.shadowRoot);
    assert.strictEqual(link.shadowRoot.childElementCount, 0);
  });

  it('shows a link when canShowSurvey is true', () => {
    const link = new SurveyLink.SurveyLink.SurveyLink();
    link.data =
        {trigger: 'test trigger', promptText: empty, canShowSurvey: canShowSuccessfulCallback, showSurvey: () => {}};
    renderElementIntoDOM(link);

    assert.isNotNull(link.shadowRoot);
    const linkNode = link.shadowRoot.querySelector('button');
    assert.isNotNull(linkNode);
  });

  it('shows a pending state when trying to show the survey', () => {
    const link = new SurveyLink.SurveyLink.SurveyLink();
    link.data =
        {trigger: 'test trigger', promptText: empty, canShowSurvey: canShowSuccessfulCallback, showSurvey: () => {}};
    renderElementIntoDOM(link);

    assert.isNotNull(link.shadowRoot);
    const linkNode = link.shadowRoot.querySelector('button');
    assert.exists(linkNode);
    assert.notInclude(linkNode.textContent?.trim(), '…');

    linkNode.click();

    // The only output signal we have is the link text which we don't want to assert exactly, so we
    // assume that the pending state has an elipsis.
    const pendingLink = link.shadowRoot.querySelector('button');
    assert.exists(pendingLink);
    assert.include(pendingLink.textContent?.trim(), '…');
  });

  it('shows a successful state after showing the survey', () => {
    const link = new SurveyLink.SurveyLink.SurveyLink();
    link.data = {
      trigger: 'test trigger',
      promptText: empty,
      canShowSurvey: canShowSuccessfulCallback,
      showSurvey: showSuccessfulCallback,
    };
    renderElementIntoDOM(link);

    assert.isNotNull(link.shadowRoot);
    const linkNode = link.shadowRoot.querySelector('button');
    assert.exists(linkNode);

    linkNode.click();

    const successLink = link.shadowRoot.querySelector('button');
    assert.exists(successLink);
    assert.include(successLink.textContent?.trim(), 'Thank you');
  });

  it('shows a failure state when failing to show the survey', () => {
    const link = new SurveyLink.SurveyLink.SurveyLink();
    link.data = {
      trigger: 'test trigger',
      promptText: empty,
      canShowSurvey: canShowSuccessfulCallback,
      showSurvey: showFailureCallback,
    };
    renderElementIntoDOM(link);

    assert.isNotNull(link.shadowRoot);
    const linkNode = link.shadowRoot.querySelector('button');
    assert.exists(linkNode);

    linkNode.click();

    const successLink = link.shadowRoot.querySelector('button');
    assert.exists(successLink);
    assert.include(successLink.textContent?.trim(), 'error');
  });
});
