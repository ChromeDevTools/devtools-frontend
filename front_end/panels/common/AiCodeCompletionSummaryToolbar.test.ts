// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Common from './common.js';

describeWithEnvironment('AiCodeCompletionSummaryToolbar', () => {
  async function createToolbar() {
    const view = createViewFunctionStub(Common.AiCodeCompletionSummaryToolbar.AiCodeCompletionSummaryToolbar);
    const widget = new Common.AiCodeCompletionSummaryToolbar.AiCodeCompletionSummaryToolbar(
        {
          citationsTooltipId: 'citations-tooltip',
          disclaimerTooltipId: 'disclaimer-tooltip',
          spinnerTooltipId: 'spinner-tooltip',
          hasTopBorder: false,
          panel: AiCodeCompletion.AiCodeCompletion.ContextFlavor.SOURCES,
        },
        view);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

  it('should update citations', async () => {
    const {view, widget} = await createToolbar();
    const expectedCitations = new Set();

    assert.deepEqual(view.input.citations, expectedCitations);

    widget.updateCitations(['https://example.com/1']);
    await view.nextInput;

    expectedCitations.add('https://example.com/1');
    assert.deepEqual(view.input.citations, expectedCitations);

    widget.updateCitations(['https://example.com/2']);
    await view.nextInput;

    expectedCitations.add('https://example.com/2');
    assert.deepEqual(view.input.citations, expectedCitations);

    widget.detach();
  });

  it('should not add duplicate citations', async () => {
    const {view, widget} = await createToolbar();
    const expectedCitations = new Set();

    assert.deepEqual(view.input.citations, expectedCitations);

    widget.updateCitations(['https://example.com/1']);
    await view.nextInput;

    expectedCitations.add('https://example.com/1');
    assert.deepEqual(view.input.citations, expectedCitations);

    widget.updateCitations(['https://example.com/1']);
    await view.nextInput;

    assert.deepEqual(view.input.citations, expectedCitations);

    widget.detach();
  });

  it('should clear citations', async () => {
    const {view, widget} = await createToolbar();
    const expectedCitations = new Set();
    expectedCitations.add('https://example.com/1');
    widget.updateCitations(['https://example.com/1']);
    await view.nextInput;

    assert.deepEqual(view.input.citations, expectedCitations);

    widget.clearCitations();
    await view.nextInput;

    expectedCitations.clear();
    assert.deepEqual(view.input.citations, expectedCitations);

    widget.detach();
  });

  it('renders when AIDA becomes available', async () => {
    const checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions');
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);

    const {view, widget} = await createToolbar();

    assert.strictEqual(view.input.aidaAvailability, Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);

    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);

    await view.nextInput;

    assert.strictEqual(view.input.aidaAvailability, Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    widget.detach();
  });

  it('does not render when AIDA becomes unavailable', async () => {
    const checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions');
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);

    const {view, widget} = await createToolbar();

    assert.strictEqual(view.input.aidaAvailability, Host.AidaClient.AidaAccessPreconditions.AVAILABLE);

    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
    Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);

    await view.nextInput;

    assert.strictEqual(view.input.aidaAvailability, Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
    widget.detach();
  });

  describe('screenshots', () => {
    beforeEach(() => {
      sinon.stub(Host.AidaClient.HostConfigTracker.instance(), 'pollAidaAvailability').callsFake(async () => {});
      const checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions');
      checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    });

    function createTarget(width: string) {
      const container = document.createElement('div');
      container.style.containerType = 'inline-size';
      container.style.width = width;

      const target = document.createElement('div');
      target.style.width = width;
      target.style.height = '200px';

      container.appendChild(target);
      renderElementIntoDOM(container, {includeCommonStyles: true});

      return target;
    }

    it('renders correct wide layout', async () => {
      const target = createTarget('700px');
      const citations = new Set<string>(['https://example.com/1']);
      Common.AiCodeCompletionSummaryToolbar.DEFAULT_SUMMARY_TOOLBAR_VIEW(
          {
            citationsTooltipId: 'citations-tooltip',
            disclaimerTooltipId: 'disclaimer-tooltip',
            spinnerTooltipId: 'spinner-tooltip',
            hasTopBorder: false,
            panel: AiCodeCompletion.AiCodeCompletion.ContextFlavor.SOURCES,
            citations,
            loading: false,
            aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          },
          undefined, target);

      await assertScreenshot('panels/common/ai-code-completion-summary-toolbar-wide.png');
    });

    it('renders correct narrow layout', async () => {
      const target = createTarget('400px');
      const citations = new Set<string>(['https://example.com/1']);
      Common.AiCodeCompletionSummaryToolbar.DEFAULT_SUMMARY_TOOLBAR_VIEW(
          {
            citationsTooltipId: 'citations-tooltip',
            disclaimerTooltipId: 'disclaimer-tooltip',
            spinnerTooltipId: 'spinner-tooltip',
            hasTopBorder: false,
            panel: AiCodeCompletion.AiCodeCompletion.ContextFlavor.SOURCES,
            citations,
            loading: false,
            aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          },
          undefined, target);

      await assertScreenshot('panels/common/ai-code-completion-summary-toolbar-narrow.png');
    });
  });
});
