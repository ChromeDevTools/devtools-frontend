// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../../front_end/core/host/host.js';
import * as VisualLogging from '../../../../../front_end/ui/visual_logging/visual_logging-testing.js';

const {assert} = chai;

describe('LoggingEvents', () => {
  let parent: Element;
  let element: Element;

  beforeEach(() => {
    VisualLogging.LoggingState.resetStateForTesting();
    parent = document.createElement('div');
    parent.setAttribute('jslog', 'TreeItem');
    element = document.createElement('div');
    element.setAttribute('jslog', 'TreeItem; context:42');
  });

  it('calls UI binding to log an impression', () => {
    const recordImpression = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordImpression',
    );
    VisualLogging.LoggingState.getLoggingState(element, parent);
    VisualLogging.LoggingEvents.logImpressions([element, parent]);
    assert.isTrue(recordImpression.calledOnce);
    assert.sameDeepMembers(
        recordImpression.firstCall.firstArg.impressions, [{id: 1, type: 1, context: 42, parent: 2}, {id: 2, type: 1}]);
  });
});
