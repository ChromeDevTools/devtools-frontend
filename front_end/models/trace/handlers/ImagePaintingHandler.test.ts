
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describe('ImagePaintingHandler', () => {
  beforeEach(() => {
    Trace.Handlers.ModelHandlers.ImagePainting.reset();
  });

  it('can pair DrawLazyPixelRef events to PaintImages by their reference number', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev.json.gz');

    for (const event of events) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      Trace.Handlers.ModelHandlers.ImagePainting.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();
    await Trace.Handlers.ModelHandlers.ImagePainting.finalize({allTraceEvents: events});

    const drawLazyPixelRefEvent = events.find(Trace.Types.Events.isDrawLazyPixelRef);
    assert.isOk(drawLazyPixelRefEvent);
    assert.isOk(drawLazyPixelRefEvent.args?.LazyPixelRef);

    const data = Trace.Handlers.ModelHandlers.ImagePainting.data();

    const matchingPaintEvent = data.paintImageByDrawLazyPixelRef.get(drawLazyPixelRefEvent.args.LazyPixelRef);
    assert.isOk(matchingPaintEvent);

    assert.isNotOk(data.didCorrectForHostDpr);
  });

  it('can pair a DecodeImage event to a PaintImage via the DrawLazyPixelRef', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev.json.gz');

    for (const event of events) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      Trace.Handlers.ModelHandlers.ImagePainting.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();
    await Trace.Handlers.ModelHandlers.ImagePainting.finalize({allTraceEvents: events});

    const decodeImage = events.find(Trace.Types.Events.isDecodeImage);
    assert.isOk(decodeImage);

    const data = Trace.Handlers.ModelHandlers.ImagePainting.data();

    const matchingPaintEvent = data.paintImageForEvent.get(decodeImage);
    assert.isOk(matchingPaintEvent);

    assert.isNotOk(data.didCorrectForHostDpr);
  });

  it('corrects for host DPR', async function() {
    const events = await TraceLoader.rawEvents(this, 'dpr.json.gz');

    for (const event of events) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      Trace.Handlers.ModelHandlers.ImagePainting.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();
    await Trace.Handlers.ModelHandlers.ImagePainting.finalize({
      metadata: {hostDPR: 2},
      allTraceEvents: events,
    });

    const decodeImage = events.find(Trace.Types.Events.isDecodeImage);
    assert.isOk(decodeImage);

    const data = Trace.Handlers.ModelHandlers.ImagePainting.data();

    assert(data.didCorrectForHostDpr);

    const [paintEvent, corrected] = [...data.paintEventToCorrectedDisplaySize.entries()][0];
    assert.deepEqual({width: paintEvent.args.data.width, height: paintEvent.args.data.height}, {
      width: 792,
      height: 750,
    });
    assert.deepEqual(corrected, {
      width: 693,
      height: 656.25,
    });
  });
});
