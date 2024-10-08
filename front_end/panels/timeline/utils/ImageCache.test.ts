// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {defaultTraceEvent} from '../../../testing/TraceHelpers.js';

import * as Utils from './utils.js';

const {cacheForTesting, emitter, getOrQueue, loadImageForTesting: loadImage, preload} = Utils.ImageCache;

describe('ImageCache', () => {
  // Generate at https://yulvil.github.io/gopherjs/02/ with 1,1,1,jpeg in the form fields
  const validJpegData =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAEElEQVR4nGISWfUPEAAA//8CmgG/YtkszwAAAABJRU5ErkJggg==';

  const rawSourceEvent: Trace.Types.Events.Screenshot = {
    ...defaultTraceEvent,
    id: '0x1',
    args: {snapshot: validJpegData},
    name: Trace.Types.Events.Name.SCREENSHOT,
    cat: 'disabled-by-default-devtools.screenshot',
    ph: Trace.Types.Events.Phase.OBJECT_SNAPSHOT,
  };

  Trace.Handlers.ModelHandlers.Screenshots.reset();
  Trace.Handlers.ModelHandlers.Screenshots.handleEvent(rawSourceEvent);
  void Trace.Handlers.ModelHandlers.Screenshots.finalize();

  const syntheticScreenshot1 = Trace.Handlers.ModelHandlers.Screenshots.data().all[0];
  const syntheticScreenshot2 = structuredClone(syntheticScreenshot1);
  syntheticScreenshot2.rawSourceEvent.id = '0x2';
  const badDataUriScreenshot = structuredClone(syntheticScreenshot1);
  badDataUriScreenshot.args.dataUri = 'INVALIDDATA';

  beforeEach(() => {
    const cache = cacheForTesting;
    cache.delete(syntheticScreenshot1);
    cache.delete(syntheticScreenshot2);
    cache.delete(badDataUriScreenshot);
  });

  it('loadImage resolves valid images', async () => {
    const datauri = `data:image/jpg;base64,${validJpegData}`;
    const res = await loadImage(datauri);
    assert.instanceOf(res, HTMLImageElement);
  });
  it('loadImage resolves invalid images to null', async () => {
    const datauri = 'data:image/jpg;base64,INVALIDDATA';
    const res = await loadImage(datauri);
    assert.strictEqual(res, null);
  });

  it('getOrQueue should return null for a new screenshot', () => {
    assert.strictEqual(getOrQueue(syntheticScreenshot1), null);
  });

  it('getOrQueue should return the same image for the same screenshot', async () => {
    // Preload to ensure image is loaded for both reads.
    await preload([syntheticScreenshot1]);

    const image1 = getOrQueue(syntheticScreenshot1);
    const image2 = getOrQueue(syntheticScreenshot1);
    assert.strictEqual(image2, image1);
    assert.instanceOf(image1, HTMLImageElement);
  });

  it('emitter should emit an event when a screenshot is updated', async () => {
    const {promise, resolve} = Promise.withResolvers();
    emitter.addEventListener('screenshot-loaded', ev => {
      const event = ev as CustomEvent;
      assert.strictEqual(event.detail.screenshot, syntheticScreenshot1);
      assert.instanceOf(event.detail.image, HTMLImageElement);
      // Cache is updated too.
      assert.instanceOf(getOrQueue(syntheticScreenshot1), HTMLImageElement);
      resolve(null);
    }, {once: true});

    assert.isNull(getOrQueue(syntheticScreenshot1));
    return promise;
  });

  it('getOrQueue should return null (immediately and eventually) for an invalid image', async () => {
    // First attempt is null because empty cache.
    assert.isNull(getOrQueue(badDataUriScreenshot));

    const {promise, resolve} = Promise.withResolvers();
    emitter.addEventListener('screenshot-loaded', ev => {
      const event = ev as CustomEvent;
      assert.strictEqual(event.detail.screenshot, badDataUriScreenshot);
      // Loaded but invalid, so null.
      assert.isNull(event.detail.image);
      // Null stored in the cache
      assert.isNull(getOrQueue(badDataUriScreenshot));

      resolve(null);
    }, {once: true});
    return promise;
  });

  it('preload should load all screenshots', async () => {
    await preload([syntheticScreenshot1, syntheticScreenshot2]);
    assert.instanceOf(getOrQueue(syntheticScreenshot1), HTMLImageElement);
    assert.instanceOf(getOrQueue(syntheticScreenshot2), HTMLImageElement);
  });
});
