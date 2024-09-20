// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as TimelineComponents from './components.js';

describeWithEnvironment('TimelineComponents Invalidations', () => {
  it('processes and groups invalidations correctly', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'style-invalidation-change-attribute.json.gz');
    const updateLayoutTreeEvent = parsedTrace.Renderer.allTraceEntries.find(event => {
      return Trace.Types.Events.isUpdateLayoutTree(event) &&
          event.args.beginData?.stackTrace?.[0].functionName === 'testFuncs.changeAttributeAndDisplay';
    });
    if (!updateLayoutTreeEvent) {
      throw new Error('Could not find update layout tree event');
    }
    const invalidations = parsedTrace.Invalidations.invalidationsForEvent.get(updateLayoutTreeEvent) ?? [];

    const {groupedByReason, backendNodeIds} = TimelineComponents.DetailsView.generateInvalidationsList(invalidations);
    const reasons = Object.keys(groupedByReason);
    assert.deepEqual(reasons, [
      'PseudoClass:active',
      'Attribute (dir)',
      'Element has pending invalidation list',
    ]);
    // Map the backendNodeIds to numbers to avoid casting to Protocol.DOM.backendNodeId
    assert.deepEqual(Array.from(backendNodeIds).map(Number), [
      107,
      110,
      111,
    ]);
  });
});
