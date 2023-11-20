// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

describe('InitiatorsHandler', () => {
  beforeEach(() => {
    TraceModel.Handlers.ModelHandlers.Initiators.reset();
    TraceModel.Handlers.ModelHandlers.Initiators.initialize();
  });

  it('for an UpdateLayoutTree event it sets the initiator to the previous ScheduledStyleRecalculation event',
     async function() {
       const traceEvents = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
       for (const event of traceEvents) {
         TraceModel.Handlers.ModelHandlers.Initiators.handleEvent(event);
       }
       await TraceModel.Handlers.ModelHandlers.Initiators.finalize();
       const data = TraceModel.Handlers.ModelHandlers.Initiators.data();
       const updateLayoutTreeEvent = traceEvents.find(event => {
         return TraceModel.Types.TraceEvents.isTraceEventUpdateLayoutTree(event) && event.ts === 122411039965;
       });
       if (!updateLayoutTreeEvent ||
           !TraceModel.Types.TraceEvents.isTraceEventUpdateLayoutTree(updateLayoutTreeEvent)) {
         throw new Error('Could not find layout tree event.');
       }
       const initiator = data.eventToInitiator.get(updateLayoutTreeEvent);
       if (!initiator) {
         throw new Error('Did not find expected initiator for updateLayoutTreeEvent');
       }
       assert.isTrue(TraceModel.Types.TraceEvents.isTraceEventScheduleStyleRecalculation(initiator));
       assert.strictEqual(updateLayoutTreeEvent.args.beginData?.frame, '25D2F12F1818C70B5BD4325CC9ACD8FF');
       assert.strictEqual(updateLayoutTreeEvent.args.beginData?.frame, initiator.args?.data?.frame);
     });

  it('for a Layout event it sets the initiator to the last InvalidateLayout event on that frame', async function() {
    const traceEvents = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
    for (const event of traceEvents) {
      TraceModel.Handlers.ModelHandlers.Initiators.handleEvent(event);
    }
    await TraceModel.Handlers.ModelHandlers.Initiators.finalize();
    const data = TraceModel.Handlers.ModelHandlers.Initiators.data();

    const layoutEvent = traceEvents.find(event => {
      return TraceModel.Types.TraceEvents.isTraceEventLayout(event) && event.ts === 122411039994;
    });
    if (!layoutEvent || !TraceModel.Types.TraceEvents.isTraceEventLayout(layoutEvent)) {
      throw new Error('Could not find layout event.');
    }
    const initiator = data.eventToInitiator.get(layoutEvent);
    if (!initiator) {
      throw new Error('Did not find expected initiator for LayoutEvent');
    }
    assert.isTrue(TraceModel.Types.TraceEvents.isTraceEventInvalidateLayout(initiator));
    assert.strictEqual(initiator.ts, 122411036517);
  });

  it('for a Layout event it sets the initiator to the last ScheduledStyleRecalculation if it occurred before the InvalidateLayout event',
     async function() {
       const traceEvents = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
       for (const event of traceEvents) {
         TraceModel.Handlers.ModelHandlers.Initiators.handleEvent(event);
       }
       await TraceModel.Handlers.ModelHandlers.Initiators.finalize();
       const data = TraceModel.Handlers.ModelHandlers.Initiators.data();

       const layoutEvent = traceEvents.find(event => {
         return TraceModel.Types.TraceEvents.isTraceEventLayout(event) && event.ts === 122411054960;
       });
       if (!layoutEvent || !TraceModel.Types.TraceEvents.isTraceEventLayout(layoutEvent)) {
         throw new Error('Could not find layout event.');
       }
       const initiator = data.eventToInitiator.get(layoutEvent);
       if (!initiator) {
         throw new Error('Did not find expected initiator for LayoutEvent');
       }
       assert.isTrue(TraceModel.Types.TraceEvents.isTraceEventScheduleStyleRecalculation(initiator));
       assert.strictEqual(initiator.ts, 122411054482);
     });
});
