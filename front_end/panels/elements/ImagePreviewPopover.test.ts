// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('ImagePreviewPopover', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    // UI.PopoverHelper.PopoverHelper uses setTimeout internally to manage popover
    // show and hide timing. Using fake timers allows us to control these
    // timeouts synchronously in the test without real-world delays or flakiness.
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  /**
   * Periodically ticks the fake clock and flushes microtasks until the given
   * condition is met. This is used to wait for asynchronous work that is
   * triggered by timers (like PopoverHelper) or multiple await points.
   */
  async function poll(condition: () => boolean): Promise<void> {
    for (let i = 0; i < 20; i++) {
      if (condition()) {
        return;
      }
      clock.tick(1);
      await Promise.resolve();
    }
    throw new Error('Condition not met');
  }

  it('shows an image preview when hovering over an element with an image URL', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const getLinkElement = (event: Event) => event.target as Element;
    const getNodeFeatures = async () => undefined;
    new Elements.ImagePreviewPopover.ImagePreviewPopover(container, getLinkElement, getNodeFeatures);

    const element = document.createElement('span');
    element.textContent = 'hover me';
    element.boxInWindow = () => new AnchorBox(0, 0, 10, 10);
    container.appendChild(element);

    const imageUrl = urlString`http://example.com/image.png`;
    Elements.ImagePreviewPopover.ImagePreviewPopover.setImageUrl(element, imageUrl);

    const buildStub = sinon.stub(Components.ImagePreview.ImagePreview, 'build').resolves(document.createElement('div'));

    const event = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 5,
      clientY: 5,
    });
    element.dispatchEvent(event);

    // Wait for the build stub to be called, which happens inside the async show() method
    // triggered after PopoverHelper's internal timer.
    await poll(() => buildStub.called);

    sinon.assert.calledWith(buildStub, imageUrl, true);
  });

  it('does not show a preview when hovering over an element without an image URL', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const getLinkElement = (event: Event) => event.target as Element;
    const getNodeFeatures = async () => undefined;
    new Elements.ImagePreviewPopover.ImagePreviewPopover(container, getLinkElement, getNodeFeatures);

    const element = document.createElement('span');
    element.textContent = 'hover me';
    element.boxInWindow = () => new AnchorBox(0, 0, 10, 10);
    container.appendChild(element);

    const buildStub = sinon.stub(Components.ImagePreview.ImagePreview, 'build').resolves(document.createElement('div'));

    const event = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 5,
      clientY: 5,
    });
    element.dispatchEvent(event);

    // Tick the clock and flush microtasks to ensure any scheduled work has a chance to run.
    clock.tick(1);
    await Promise.resolve();

    sinon.assert.notCalled(buildStub);
  });

  it('hides the popover when hide() is called', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const getLinkElement = (event: Event) => event.target as Element;
    const getNodeFeatures = async () => undefined;
    const imagePreviewPopover =
        new Elements.ImagePreviewPopover.ImagePreviewPopover(container, getLinkElement, getNodeFeatures);

    const element = document.createElement('span');
    element.boxInWindow = () => new AnchorBox(0, 0, 10, 10);
    container.appendChild(element);

    const imageUrl = urlString`http://example.com/image.png`;
    Elements.ImagePreviewPopover.ImagePreviewPopover.setImageUrl(element, imageUrl);

    sinon.stub(Components.ImagePreview.ImagePreview, 'build').resolves(document.createElement('div'));
    const glassPaneShowStub = sinon.stub(UI.GlassPane.GlassPane.prototype, 'show');
    const glassPaneHideStub = sinon.stub(UI.GlassPane.GlassPane.prototype, 'hide');

    const event = new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 5,
      clientY: 5,
    });
    element.dispatchEvent(event);

    // Wait until the popover's show() method has been called. This ensures the
    // async chain in PopoverHelper has finished and the hidePopoverCallback is set.
    await poll(() => glassPaneShowStub.called);

    imagePreviewPopover.hide();
    sinon.assert.called(glassPaneHideStub);
  });
});
