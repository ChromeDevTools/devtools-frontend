// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import {querySelectorErrorOnMissing, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('RelevantDataDisclaimer', () => {
  function renderDisclaimer(): HTMLElement {
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    Lit.render(AiAssistance.RelevantDataDisclaimer.renderRelevantDataDisclaimer('test-tooltip', 'Disclaimer text'),
               target);
    return target;
  }

  it('renders "Relevant data" as a link followed by the rest of the sentence', () => {
    const target = renderDisclaimer();

    assert.strictEqual(target.innerText.replace(/\s+/g, ' '), 'Relevant data is sent to Google');
    const link = querySelectorErrorOnMissing(target, 'button.link');
    assert.strictEqual(link.innerText, 'Relevant data');
    assert.strictEqual(link.getAttribute('aria-details'), 'test-tooltip');
  });

  it('opens the AI settings when "Relevant data" is clicked', () => {
    const showView = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();
    const target = renderDisclaimer();

    querySelectorErrorOnMissing(target, 'button.link').click();

    sinon.assert.calledOnceWithExactly(showView, 'chrome-ai');
  });

  it('shows the disclaimer text and a settings link in the tooltip', () => {
    const showView = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();
    const target = renderDisclaimer();

    const tooltip = querySelectorErrorOnMissing(target, 'devtools-tooltip#test-tooltip');
    assert.include(tooltip.textContent, 'Disclaimer text');
    const link = querySelectorErrorOnMissing(tooltip, '.tooltip-link');
    assert.strictEqual(link.textContent?.trim(), 'Learn about AI in DevTools');

    link.click();
    sinon.assert.calledOnceWithExactly(showView, 'chrome-ai');
  });
});
