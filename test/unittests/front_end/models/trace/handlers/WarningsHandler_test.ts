// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const {assert} = chai;
import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

describe('WarningsHandler', function() {
  beforeEach(() => {
    TraceEngine.Handlers.ModelHandlers.Warnings.reset();
  });

  it('identifies long tasks', async () => {
    const events = await TraceLoader.rawEvents(this, 'slow-interaction-keydown.json.gz');
    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.Warnings.handleEvent(event);
    }
    const data = TraceEngine.Handlers.ModelHandlers.Warnings.data();
    // We expect one long task.
    assert.strictEqual(data.perEvent.size, 1);
    const event = Array.from(data.perEvent.keys()).at(0);
    assert.strictEqual(event?.name, TraceEngine.Types.TraceEvents.KnownEventName.RunTask);
  });
});
