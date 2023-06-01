// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import type * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';
import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';

async function loadWebDevTraceAsFile(): Promise<File> {
  const file = new URL('../../../fixtures/traces/web-dev.json.gz', import.meta.url);
  const response = await fetch(file);
  const asBlob = await response.blob();
  const asFile = new File([asBlob], 'web-dev.json.gz', {
    type: 'application/gzip',
  });
  return asFile;
}

describe('TimelineLoader', () => {
  it('can load a saved file', async () => {
    const file = await loadWebDevTraceAsFile();

    const loadingStartedSpy = sinon.spy();
    const loadingProgressSpy = sinon.spy();
    const processingStartedSpy = sinon.spy();
    const loadingCompleteSpy = sinon.spy();

    const client: Timeline.TimelineLoader.Client = {
      async loadingStarted() {
        loadingStartedSpy();
      },
      async loadingProgress(progress?: number) {
        loadingProgressSpy(progress);
      },
      async processingStarted() {
        processingStartedSpy();
      },
      async loadingComplete(
          tracingModel: SDK.TracingModel.TracingModel|null,
          exclusiveFilter: TimelineModel.TimelineModelFilter.TimelineModelFilter|null,
      ) {
        loadingCompleteSpy(tracingModel, exclusiveFilter);
      },
    };
    await Timeline.TimelineLoader.TimelineLoader.loadFromFile(file, client);

    assert.isTrue(loadingStartedSpy.calledOnce);
    // Exact number is deterministic so we can assert, but the fact it was 28
    // calls doesn't really matter. We just want to check it got called "a
    // bunch of times".
    assert.strictEqual(loadingProgressSpy.callCount, 28);
    assert.isTrue(processingStartedSpy.calledOnce);
    assert.isTrue(loadingCompleteSpy.calledOnce);

    // Get the arguments of the first (and only) call to the loadingComplete
    // function. TS doesn't know what the types are (they are [any, any] by
    // default), so we tell it that they align with the types of the
    // loadingComplete parameters.
    const [tracingModel, exclusiveFilter] =
        loadingCompleteSpy.args[0] as Parameters<Timeline.TimelineLoader.Client['loadingComplete']>;
    assert.isNull(exclusiveFilter);  // We are not filtering out any events for this trace.
    if (!tracingModel) {
      throw new Error('No tracing model found from results of loadTraceFromFile');
    }
    // Ensure that we loaded something that looks about right!
    assert.lengthOf(tracingModel.allRawEvents(), 8252);
  });
});
