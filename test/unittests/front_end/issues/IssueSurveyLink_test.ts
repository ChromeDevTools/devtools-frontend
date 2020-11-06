// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {CanShowSurveyCallback, IssueSurveyLink, ShowSurveyCallback} from '../../../../front_end/issues/IssueSurveyLink.js';
import {assertNotNull, assertShadowRoot, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

function canShowSuccessfulCallback(trigger: string, callback: CanShowSurveyCallback) {
  callback({canShowSurvey: true});
}
function showSuccessfulCallback(trigger: string, callback: ShowSurveyCallback) {
  callback({surveyShown: true});
}
function canShowFailureCallback(trigger: string, callback: CanShowSurveyCallback) {
  callback({canShowSurvey: false});
}
function showFailureCallback(trigger: string, callback: ShowSurveyCallback) {
  callback({surveyShown: false});
}

describe('IssueSurveyLink', () => {
  it('shows no link when canShowSurvey is still pending', () => {
    const link = new IssueSurveyLink();
    link.data = {trigger: 'test trigger', canShowSurvey: () => {}, showSurvey: () => {}};
    renderElementIntoDOM(link);

    assertShadowRoot(link.shadowRoot);
    assert.strictEqual(link.shadowRoot.childElementCount, 0);
  });

  it('shows no link when canShowSurvey is false', () => {
    const link = new IssueSurveyLink();
    link.data = {trigger: 'test trigger', canShowSurvey: canShowFailureCallback, showSurvey: () => {}};
    renderElementIntoDOM(link);

    assertShadowRoot(link.shadowRoot);
    assert.strictEqual(link.shadowRoot.childElementCount, 0);
  });

  it('shows a link when canShowSurvey is true', () => {
    const link = new IssueSurveyLink();
    link.data = {trigger: 'test trigger', canShowSurvey: canShowSuccessfulCallback, showSurvey: () => {}};
    renderElementIntoDOM(link);

    assertShadowRoot(link.shadowRoot);
    const linkNode = link.shadowRoot.querySelector('a');
    assert.isNotNull(linkNode);
  });

  it('shows a pending state when trying to show the survey', () => {
    const link = new IssueSurveyLink();
    link.data = {trigger: 'test trigger', canShowSurvey: canShowSuccessfulCallback, showSurvey: () => {}};
    renderElementIntoDOM(link);

    assertShadowRoot(link.shadowRoot);
    const linkNode = link.shadowRoot.querySelector('a');
    assertNotNull(linkNode);
    assert.notInclude(linkNode.textContent?.trim(), '…');

    linkNode.click();

    // The only output signal we have is the link text which we don't want to assert exactly, so we
    // assume that the pending state has an elipsis.
    const pendingLink = link.shadowRoot.querySelector('a');
    assertNotNull(pendingLink);
    assert.include(pendingLink.textContent?.trim(), '…');
  });

  it('shows a successful state after showing the survey', () => {
    const link = new IssueSurveyLink();
    link.data = {trigger: 'test trigger', canShowSurvey: canShowSuccessfulCallback, showSurvey: showSuccessfulCallback};
    renderElementIntoDOM(link);

    assertShadowRoot(link.shadowRoot);
    const linkNode = link.shadowRoot.querySelector('a');
    assertNotNull(linkNode);

    linkNode.click();

    const successLink = link.shadowRoot.querySelector('a');
    assertNotNull(successLink);
    assert.include(successLink.textContent?.trim(), 'Thank you');
  });

  it('shows a failure state when failing to show the survey', () => {
    const link = new IssueSurveyLink();
    link.data = {trigger: 'test trigger', canShowSurvey: canShowSuccessfulCallback, showSurvey: showFailureCallback};
    renderElementIntoDOM(link);

    assertShadowRoot(link.shadowRoot);
    const linkNode = link.shadowRoot.querySelector('a');
    assertNotNull(linkNode);

    linkNode.click();

    const successLink = link.shadowRoot.querySelector('a');
    assertNotNull(successLink);
    assert.include(successLink.textContent?.trim(), 'error');
  });
});
