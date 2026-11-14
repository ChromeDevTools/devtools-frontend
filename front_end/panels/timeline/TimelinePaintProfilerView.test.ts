// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';

import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, setupActionRegistry} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Timeline from './timeline.js';

const {TimelinePaintImageView} = Timeline.TimelinePaintProfilerView;

// A 40x20 PNG, blue on the left half and orange on the right half.
const SCREENSHOT_IMAGE_URL = 'data:image/png;base64,' +
    'iVBORw0KGgoAAAANSUhEUgAAACgAAAAUCAIAAABwJOjsAAAAKUlEQVR42mNwav1CNvrdw0A2Yhi1eNTiUYtHLR61eNTiUYtHLR45FgMAt8oXbOXdKDsAAAAASUVORK5CYII=';

// A 1x2 transparent PNG.
const IMAGE_URL = 'data:image/png;base64,' +
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAC0lEQVR4nGNggAEAAAoAAX+AdF4AAAAASUVORK5CYII=';

describeWithEnvironment('TimelinePaintImageView', () => {
  setupActionRegistry();

  async function createShownImageView(): Promise<{
    view: ViewFunctionStub<typeof TimelinePaintImageView>,
    widget: InstanceType<typeof TimelinePaintImageView>,
  }> {
    const view = createViewFunctionStub(TimelinePaintImageView);
    const widget = new TimelinePaintImageView(undefined, view);
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

  it('hides the image until an image URL is set', async () => {
    const {view, widget} = await createShownImageView();
    assert.isTrue(view.input.imageContainerHidden);

    widget.imageURL = IMAGE_URL;
    let input = await view.nextInput;
    assert.isFalse(input.imageContainerHidden);
    assert.strictEqual(input.imageURL, IMAGE_URL);

    widget.imageURL = undefined;
    input = await view.nextInput;
    assert.isTrue(input.imageContainerHidden);
    assert.isUndefined(widget.imageURL);
  });

  it('resets the mask style and transform when the image changes', async () => {
    const {view, widget} = await createShownImageView();
    widget.imageURL = IMAGE_URL;
    widget.maskRectangle = {x: 1, y: 2, width: 3, height: 4};
    let input = await view.nextInput;
    input.onImageLoaded(10, 20);
    input = await view.nextInput;
    assert.notDeepEqual(input.maskElementStyle, {});
    assert.notStrictEqual(input.imageContainerWebKitTransform, '');

    widget.imageURL = IMAGE_URL + '#other';
    input = await view.nextInput;
    assert.deepEqual(input.maskElementStyle, {});
    assert.strictEqual(input.imageContainerWebKitTransform, '');
  });

  it('computes the mask style once the image has loaded', async () => {
    const {view, widget} = await createShownImageView();
    assert.isTrue(view.input.maskElementHidden);

    widget.maskRectangle = {x: 1, y: 2, width: 3, height: 4};
    let input = await view.nextInput;
    assert.isFalse(input.maskElementHidden);
    assert.deepEqual(input.maskElementStyle, {});

    input.onImageLoaded(10, 20);
    input = await view.nextInput;
    assert.deepEqual(input.maskElementStyle, {
      width: '10px',
      height: '20px',
      borderLeftWidth: '1px',
      borderTopWidth: '2px',
      borderRightWidth: '6px',
      borderBottomWidth: '14px',
    });
  });
});

describeWithEnvironment('TimelinePaintImageView view', () => {
  function renderImageView(input: Partial<Timeline.TimelinePaintProfilerView.TimelinePaintImageViewInput>):
      HTMLElement {
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    const viewInput: Timeline.TimelinePaintProfilerView.TimelinePaintImageViewInput = {
      maskElementHidden: true,
      imageContainerHidden: true,
      imageURL: '',
      imageContainerWebKitTransform: '',
      maskElementStyle: {},
      onImageLoaded: () => {},
      ...input,
    };
    Timeline.TimelinePaintProfilerView.IMAGE_VIEW_DEFAULT_VIEW(viewInput, undefined, target);
    return target;
  }

  it('hides the image container when there is no image', () => {
    const target = renderImageView({imageContainerHidden: true});

    const container = target.querySelector('.paint-profiler-image-container');
    assert.exists(container);
    assert.isTrue(container.hasAttribute('hidden'));
  });

  it('omits the image src attribute when there is no image', () => {
    const target = renderImageView({imageContainerHidden: true, imageURL: ''});

    const img = target.querySelector('img');
    assert.exists(img);
    assert.isFalse(img.hasAttribute('src'));
  });

  it('renders the image with a mask rectangle', async () => {
    const target = document.createElement('div');
    target.style.width = '200px';
    target.style.height = '100px';
    renderElementIntoDOM(target, {includeCommonStyles: true});
    const {promise, resolve} = Promise.withResolvers<void>();
    Timeline.TimelinePaintProfilerView.IMAGE_VIEW_DEFAULT_VIEW({
      maskElementHidden: false,
      imageContainerHidden: false,
      imageURL: SCREENSHOT_IMAGE_URL,
      imageContainerWebKitTransform: 'translate(20px, 10px) scale(4)',
      maskElementStyle: {
        width: '40px',
        height: '20px',
        borderLeftWidth: '10px',
        borderTopWidth: '5px',
        borderRightWidth: '15px',
        borderBottomWidth: '7px',
      },
      onImageLoaded: () => resolve(),
    },
                                                               undefined, target);
    await promise;

    await assertScreenshot('timeline/timeline_paint_image_view.png');
  });

  it('renders the image with the mask style', () => {
    const target = renderImageView({
      imageContainerHidden: false,
      imageURL: IMAGE_URL,
      maskElementHidden: false,
      maskElementStyle: {width: '10px', borderLeftWidth: '1px'},
    });

    const container = target.querySelector('.paint-profiler-image-container');
    assert.exists(container);
    assert.isFalse(container.hasAttribute('hidden'));
    assert.strictEqual(target.querySelector('img')?.getAttribute('src'), IMAGE_URL);
    const mask = target.querySelector<HTMLElement>('.paint-profiler-image-container > div');
    assert.exists(mask);
    assert.strictEqual(mask.style.display, 'block');
    assert.strictEqual(mask.style.width, '10px');
    assert.strictEqual(mask.style.borderLeftWidth, '1px');
  });

  it('reports the natural image size once the image has loaded', async () => {
    const {promise, resolve} = Promise.withResolvers<{naturalWidth: number, naturalHeight: number}>();

    renderImageView({
      imageContainerHidden: false,
      imageURL: IMAGE_URL,
      onImageLoaded: (naturalWidth, naturalHeight) => resolve({naturalWidth, naturalHeight}),
    });

    assert.deepEqual(await promise, {naturalWidth: 1, naturalHeight: 2});
  });
});
