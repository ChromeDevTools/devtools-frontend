// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, setupActionRegistry} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LayerViewer from '../layer_viewer/layer_viewer.js';

import * as Timeline from './timeline.js';

const {TimelinePaintProfilerView, TimelinePaintImageView} = Timeline.TimelinePaintProfilerView;

// A 40x20 PNG, blue on the left half and orange on the right half.
const SCREENSHOT_IMAGE_URL = 'data:image/png;base64,' +
    'iVBORw0KGgoAAAANSUhEUgAAACgAAAAUCAIAAABwJOjsAAAAKUlEQVR42mNwav1CNvrdw0A2Yhi1eNTiUYtHLR61eNTiUYtHLR45FgMAt8oXbOXdKDsAAAAASUVORK5CYII=';

// A 1x2 transparent PNG.
const IMAGE_URL = 'data:image/png;base64,' +
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAC0lEQVR4nGNggAEAAAoAAX+AdF4AAAAASUVORK5CYII=';

function createSnapshot(log: SDK.PaintProfiler.PaintProfilerLogItem[] = []) {
  const snapshot = sinon.createStubInstance(SDK.PaintProfiler.PaintProfilerSnapshot);
  snapshot.commandLog.resolves(log);
  snapshot.profile.resolves([]);
  snapshot.replay.resolves(null);
  return snapshot;
}

async function waitForInput<T>(view: {input: T, nextInput: Promise<T>}, pred: (i: T) => boolean): Promise<T> {
  while (!view.input || !pred(view.input)) {
    await view.nextInput;
  }
  return view.input;
}

describeWithEnvironment('TimelinePaintProfilerView', () => {
  async function createShownWidget() {
    const view = createViewFunctionStub(TimelinePaintProfilerView);
    const widget = new TimelinePaintProfilerView(undefined, undefined, view);
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

  it('renders an empty profiler initially', async () => {
    const {view} = await createShownWidget();
    assert.isNull(view.input.snapshot);
    assert.isEmpty(view.input.log);
    assert.isUndefined(view.input.imageURL);
  });

  it('passes the snapshot command log to the view', async () => {
    const {view, widget} = await createShownWidget();
    const log = [new SDK.PaintProfiler.PaintProfilerLogItem({method: 'drawRect', params: null}, 0)];
    const s1 = createSnapshot(log);
    widget.setSnapshot(s1);
    assert.strictEqual((await waitForInput(view, i => i.snapshot === s1)).log, log);
  });

  it('releases the previous snapshot when replaced', async () => {
    const {view, widget} = await createShownWidget();
    const s1 = createSnapshot();
    const s2 = createSnapshot();
    widget.setSnapshot(s1);
    await waitForInput(view, i => i.snapshot === s1);
    widget.setSnapshot(s2);
    await waitForInput(view, i => i.snapshot === s2);
    sinon.assert.calledOnce(s1.release);
  });

  it('defers loading the snapshot until the widget is shown', async () => {
    const view = createViewFunctionStub(TimelinePaintProfilerView);
    const widget = new TimelinePaintProfilerView(undefined, undefined, view);
    const snapshot = createSnapshot();
    widget.setSnapshot(snapshot);
    sinon.assert.notCalled(snapshot.commandLog);
    renderElementIntoDOM(widget);
    await waitForInput(view, i => i.snapshot === snapshot);
    sinon.assert.calledOnce(snapshot.commandLog);
  });

  it('updates the image URL when the profiler shows an image', async () => {
    const {view} = await createShownWidget();
    view.input.onShowImage(IMAGE_URL);
    assert.strictEqual((await view.nextInput).imageURL, IMAGE_URL);
    view.input.onShowImage();
    assert.isUndefined((await view.nextInput).imageURL);
  });

  it('updates the selection window when the profiler window changes', async () => {
    const {view} = await createShownWidget();
    view.input.onWindowChanged({left: 1, right: 3});
    assert.deepEqual((await view.nextInput).selectionWindow, {left: 1, right: 3});
  });

  it('resets the selection window when the snapshot changes', async () => {
    const {view, widget} = await createShownWidget();
    const log = [new SDK.PaintProfiler.PaintProfilerLogItem({method: 'drawRect', params: null}, 0)];
    const s1 = createSnapshot(log);
    widget.setSnapshot(s1);
    const initialSelectionWindow = (await waitForInput(view, i => i.snapshot === s1)).selectionWindow;

    view.input.onWindowChanged({left: 1, right: 3});
    assert.deepEqual((await view.nextInput).selectionWindow, {left: 1, right: 3});

    const s2 = createSnapshot(log);
    widget.setSnapshot(s2);
    assert.deepEqual((await waitForInput(view, i => i.snapshot === s2)).selectionWindow, initialSelectionWindow);
  });
});

describeWithEnvironment('TimelinePaintProfilerView view', () => {
  setupActionRegistry();

  async function renderView(overrides: Partial<Timeline.TimelinePaintProfilerView.ViewInput> = {}) {
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    const input: Timeline.TimelinePaintProfilerView.ViewInput = {
      snapshot: null,
      log: [],
      clipRect: null,
      selectionWindow: null,
      imageURL: undefined,
      onShowImage: () => {},
      onWindowChanged: () => {},
      ...overrides,
    };
    Timeline.TimelinePaintProfilerView.DEFAULT_VIEW(input, undefined, target);
    await UI.Widget.Widget.allUpdatesComplete;
    return target;
  }

  it('renders the paint profiler, the command log and the image view', async () => {
    const log = [new SDK.PaintProfiler.PaintProfilerLogItem({method: 'drawRect', params: null}, 0)];
    const clipRect = {x: 1, y: 2, width: 3, height: 4};
    const target = await renderView({log, clipRect, imageURL: IMAGE_URL});
    const bar = target.querySelector<HTMLElement>('.timeline-paint-profiler-bar')!;
    assert.instanceOf(UI.Widget.Widget.get(bar), LayerViewer.PaintProfilerView.PaintProfilerView);
    const split = target.querySelector('devtools-split-view')!;
    const logView = UI.Widget.Widget.get(split.querySelector<HTMLElement>('[slot="sidebar"]')!);
    assert.instanceOf(logView, LayerViewer.PaintProfilerView.PaintProfilerCommandLogView);
    assert.strictEqual(logView.commandLog, log);
    assert.deepEqual(logView.selectionWindow, {left: 0, right: 1});
    const imgView = UI.Widget.Widget.get(split.querySelector<HTMLElement>('[slot="main"]')!);
    assert.instanceOf(imgView, TimelinePaintImageView);
    assert.strictEqual(imgView.imageURL, IMAGE_URL);
    assert.deepEqual(imgView.maskRectangle, clipRect);
  });

  it('forwards profiler window changes to the presenter', async () => {
    const onWindowChanged = sinon.stub();
    const target = await renderView({onWindowChanged});
    const event = new CustomEvent('WindowChanged', {detail: {left: 2, right: 5}});
    target.querySelector('.timeline-paint-profiler-bar')?.dispatchEvent(event);
    sinon.assert.calledOnceWithExactly(onWindowChanged, {left: 2, right: 5});
  });
});

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
