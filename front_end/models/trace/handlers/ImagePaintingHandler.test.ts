
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TraceEngine from '../trace.js';

describe('ImagePaintingHandler', () => {
  beforeEach(() => {
    TraceEngine.Handlers.ModelHandlers.ImagePainting.reset();
  });

  it('can pair DrawLazyPixelRef events to PaintImages by their reference number', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev.json.gz');

    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.ImagePainting.handleEvent(event);
    }

    const drawLazyPixelRefEvent = events.find(TraceEngine.Types.TraceEvents.isTraceEventDrawLazyPixelRef);
    assert.isOk(drawLazyPixelRefEvent);
    assert.isOk(drawLazyPixelRefEvent.args?.LazyPixelRef);

    const data = TraceEngine.Handlers.ModelHandlers.ImagePainting.data();

    const matchingPaintEvent = data.paintImageByDrawLazyPixelRef.get(drawLazyPixelRefEvent.args.LazyPixelRef);
    assert.isOk(matchingPaintEvent);
  });

  it('can pair a DecodeImage event to a PaintImage via the DrawLazyPixelRef', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev.json.gz');

    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.ImagePainting.handleEvent(event);
    }

    const decodeImage = events.find(TraceEngine.Types.TraceEvents.isTraceEventDecodeImage);
    assert.isOk(decodeImage);

    const data = TraceEngine.Handlers.ModelHandlers.ImagePainting.data();

    const matchingPaintEvent = data.paintImageForEvent.get(decodeImage);
    assert.isOk(matchingPaintEvent);
  });
});
