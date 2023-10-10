// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Host from '../../../../../front_end/core/host/host.js';
import * as VisualLoggingTesting from '../../../../../front_end/ui/visual_logging/visual_logging-testing.js';
import * as VisualLogging from '../../../../../front_end/ui/visual_logging/visual_logging.js';
import {renderElementIntoDOM} from '../../helpers/DOMHelpers.js';

const {assert} = chai;

describe('LoggingDriver', () => {
  let recordImpression: sinon.SinonStub;
  const throttler = new Common.Throttler.Throttler(100000);

  beforeEach(() => {
    VisualLoggingTesting.LoggingState.resetStateForTesting();
    recordImpression = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordImpression',
    );
  });

  function addLoggableElements() {
    const parent = document.createElement('div') as HTMLElement;
    parent.id = 'parent';
    parent.setAttribute('jslog', 'TreeItem');
    parent.style.width = '300px';
    parent.style.height = '300px';
    const element = document.createElement('div') as HTMLElement;
    element.setAttribute('jslog', 'TreeItem; context:42');
    element.style.width = '300px';
    element.style.height = '300px';
    parent.appendChild(element);
    renderElementIntoDOM(parent);
  }

  it('logs impressions on startLogging', () => {
    addLoggableElements();
    VisualLogging.startLogging();
    assert.isTrue(recordImpression.calledOnce);
    assert.sameDeepMembers(
        recordImpression.firstCall.firstArg.impressions, [{id: 2, type: 1, context: 42, parent: 1}, {id: 1, type: 1}]);
  });

  async function assertImpressionRecordedDeferred(recorded = true) {
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(recordImpression.called);

    assert.exists(throttler.process);
    await throttler.process?.();
    assert.strictEqual(recorded, recordImpression.called);
  }

  it('does not log impressions when hidden', async () => {
    addLoggableElements();
    sinon.stub(document, 'hidden').value(true);
    VisualLogging.startLogging({domProcessingThrottler: throttler});

    await assertImpressionRecordedDeferred(false);
  });

  it('logs impressions when visibility changes', async () => {
    let hidden = true;
    addLoggableElements();
    sinon.stub(document, 'hidden').get(() => hidden);
    VisualLogging.startLogging({domProcessingThrottler: throttler});

    hidden = false;
    const event = document.createEvent('Event');
    event.initEvent('visibilitychange', true, true);
    document.dispatchEvent(event);

    await assertImpressionRecordedDeferred();
  });

  it('logs impressions on scroll', async () => {
    addLoggableElements();
    const parent = document.getElementById('parent') as HTMLElement;
    parent.style.marginTop = '2000px';
    VisualLogging.startLogging({domProcessingThrottler: throttler});

    window.scrollTo({
      top: 2000,
      left: 0,
      behavior: 'instant',
    });
    await assertImpressionRecordedDeferred();
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  });

  it('logs impressions on mutation', async () => {
    VisualLogging.startLogging({domProcessingThrottler: throttler});
    addLoggableElements();
    await assertImpressionRecordedDeferred();
  });

  it('logs impressions on mutation in shadow DOM', async () => {
    const parent = document.createElement('div') as HTMLElement;
    renderElementIntoDOM(parent);
    const shadow = parent.attachShadow({mode: 'open'});
    const shadowContent = document.createElement('div');
    shadow.appendChild(shadowContent);

    VisualLogging.startLogging({domProcessingThrottler: throttler});
    shadowContent.innerHTML = '<div jslog="TreeItem" style="width:300px;height:300px"></div>';
    await assertImpressionRecordedDeferred();
  });
});
