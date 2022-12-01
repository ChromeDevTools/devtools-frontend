// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {loadEventsFromTraceFile} from '../../../helpers/TraceHelpers.js';

describe('AnimationHandler', () => {
  it('finds animation events', async () => {
    const events = await loadEventsFromTraceFile('animation.json.gz');

    for (const event of events) {
      TraceModel.Handlers.ModelHandlers.Animation.handleEvent(event);
    }

    const animationEvents = TraceModel.Handlers.ModelHandlers.Animation.data().animations;
    assert.lengthOf(animationEvents, 5);
  });
});
