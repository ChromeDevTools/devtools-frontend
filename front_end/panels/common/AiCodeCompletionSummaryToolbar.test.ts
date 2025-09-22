// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Common from './common.js';

describeWithEnvironment('AiCodeCompletionSummaryToolbar', () => {
  async function createToolbar() {
    const view = createViewFunctionStub(Common.AiCodeCompletionSummaryToolbar);
    const widget = new Common.AiCodeCompletionSummaryToolbar(
        {
          citationsTooltipId: 'citations-tooltip',
          disclaimerTooltipId: 'disclaimer-tooltip',
          spinnerTooltipId: 'spinner-tooltip',
          hasTopBorder: false
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
});
