// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../../../front_end/core/sdk/sdk.js';
import * as PerfUI from '../../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {
  dispatchClickEvent,
  dispatchKeyDownEvent,
  querySelectorErrorOnMissing,
  raf,
  renderElementIntoDOM,
} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';
import {allModelsFromFile} from '../../../../helpers/TraceHelpers.js';

const {assert} = chai;

describeWithEnvironment('FilmStripView', () => {
  async function renderView(filmStripModel: SDK.FilmStripModel.FilmStripModel):
      Promise<PerfUI.FilmStripView.FilmStripView> {
    const filmStrip = new PerfUI.FilmStripView.FilmStripView();
    filmStrip.setModel(filmStripModel, filmStripModel.zeroTime());
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    filmStrip.markAsRoot();
    filmStrip.show(container);
    // Give the film strip time to render.
    await raf();
    return filmStrip;
  }

  it('generates frames and timestamps', async () => {
    const {tracingModel, traceParsedData} = await allModelsFromFile('web-dev.json.gz');
    const filmStripModel = new SDK.FilmStripModel.FilmStripModel(tracingModel);
    const filmStrip = await renderView(filmStripModel);
    const renderedFrames = Array.from(filmStrip.contentElement.querySelectorAll<HTMLElement>('div.frame'));
    assert.lengthOf(renderedFrames, 5);
    const expectedTimeLabelsForFrames = [
      '0ms',
      '139ms',
      '222ms',
      '239ms',
      '289ms',
    ];
    // Ensure for each frame that we rendered the right snapshot from the trace
    // data. And that the time label is as expected.
    renderedFrames.forEach((frame, index) => {
      const img = querySelectorErrorOnMissing<HTMLImageElement>(frame, 'img');
      assert.isTrue(img.src.includes(traceParsedData.Screenshots[index].args.snapshot));

      const timeElement = querySelectorErrorOnMissing<HTMLDivElement>(frame, '.time');
      // Remove whitespace to avoid having to compare with &nbsp; in the
      // expected text.
      assert.strictEqual(timeElement.innerText.replace(/\s/, ''), expectedTimeLabelsForFrames[index]);
    });
    assert.deepStrictEqual(1, 1);

    filmStrip.detach();
  });

  describe('FilmStripView Dialog', () => {
    async function renderDialog(filmStripModel: SDK.FilmStripModel.FilmStripModel, selectedFrameIndex: number):
        Promise<{dialog: PerfUI.FilmStripView.Dialog, shadowRoot: ShadowRoot}> {
      const selectedFrame = filmStripModel.frames().at(selectedFrameIndex);
      if (!selectedFrame) {
        throw new Error(`Could not find selected frame at index ${selectedFrameIndex}`);
      }
      const dialogWidget = new PerfUI.FilmStripView.Dialog(selectedFrame);
      // Give the dialog time to render
      await raf();

      // Creating the dialog widget is enough to cause it to render, so now we can find the Dialog HTML.
      const container = document.body.querySelector<HTMLDivElement>('[data-devtools-glass-pane]');
      const containerShadowRoot = container?.shadowRoot;
      if (!containerShadowRoot) {
        throw new Error('Could not find the Dialog shadowRoot');
      }
      return {dialog: dialogWidget, shadowRoot: containerShadowRoot};
    }

    it('renders and shows the provided frame by default', async () => {
      const {tracingModel, traceParsedData} = await allModelsFromFile('web-dev.json.gz');
      const filmStripModel = new SDK.FilmStripModel.FilmStripModel(tracingModel);
      const {dialog, shadowRoot} = await renderDialog(filmStripModel, 0);
      const renderedImage = shadowRoot.querySelector<HTMLImageElement>('[data-film-strip-dialog-img]');
      assert.isTrue(renderedImage?.currentSrc.includes(traceParsedData.Screenshots[0].args.snapshot));
      dialog.hide();
    });

    it('does not let the user navigate back if they are at the first frame already', async () => {
      const {tracingModel, traceParsedData} = await allModelsFromFile('web-dev.json.gz');
      const filmStripModel = new SDK.FilmStripModel.FilmStripModel(tracingModel);
      const {dialog, shadowRoot} = await renderDialog(filmStripModel, 0);
      const previousBtn = shadowRoot.querySelector<HTMLButtonElement>('[title="Previous frame"]');
      if (!previousBtn) {
        throw new Error('Could not find previous button');
      }
      dispatchClickEvent(previousBtn);
      await raf();
      const renderedImage = shadowRoot.querySelector<HTMLImageElement>('[data-film-strip-dialog-img]');
      assert.isTrue(renderedImage?.currentSrc.includes(traceParsedData.Screenshots[0].args.snapshot));
      dialog.hide();
    });

    it('lets the user navigate back to the previous frame with the mouse', async () => {
      const {tracingModel, traceParsedData} = await allModelsFromFile('web-dev.json.gz');
      const filmStripModel = new SDK.FilmStripModel.FilmStripModel(tracingModel);
      const {dialog, shadowRoot} = await renderDialog(filmStripModel, 1);
      const previousBtn = shadowRoot.querySelector<HTMLButtonElement>('[title="Previous frame"]');
      if (!previousBtn) {
        throw new Error('Could not find previous button');
      }
      dispatchClickEvent(previousBtn);
      await raf();
      const renderedImage = shadowRoot.querySelector<HTMLImageElement>('[data-film-strip-dialog-img]');
      assert.isTrue(renderedImage?.currentSrc.includes(traceParsedData.Screenshots[0].args.snapshot));
      dialog.hide();
    });

    it('lets the user navigate back to the previous frame with the keyboard', async () => {
      const {tracingModel, traceParsedData} = await allModelsFromFile('web-dev.json.gz');
      const filmStripModel = new SDK.FilmStripModel.FilmStripModel(tracingModel);
      const {dialog, shadowRoot} = await renderDialog(filmStripModel, 1);
      const renderedImage = shadowRoot.querySelector<HTMLImageElement>('[data-film-strip-dialog-img]');
      if (!renderedImage) {
        throw new Error('Could not find film-strip-dialog img');
      }
      dispatchKeyDownEvent(renderedImage, {
        key: 'ArrowLeft',
        bubbles: true,
      });
      await raf();
      assert.isTrue(renderedImage?.currentSrc.includes(traceParsedData.Screenshots[0].args.snapshot));
      dialog.hide();
    });

    it('lets the user navigate forwards to the next frame with the mouse', async () => {
      const {tracingModel, traceParsedData} = await allModelsFromFile('web-dev.json.gz');
      const filmStripModel = new SDK.FilmStripModel.FilmStripModel(tracingModel);
      const {dialog, shadowRoot} = await renderDialog(filmStripModel, 0);

      const nextBtn = shadowRoot.querySelector<HTMLButtonElement>('[title="Next frame"]');
      if (!nextBtn) {
        throw new Error('Could not find next button');
      }
      dispatchClickEvent(nextBtn);
      await raf();
      const renderedImage = shadowRoot.querySelector<HTMLImageElement>('[data-film-strip-dialog-img]');
      assert.isTrue(renderedImage?.currentSrc.includes(traceParsedData.Screenshots[1].args.snapshot));
      dialog.hide();
    });

    it('does not let the user go beyond the last image', async () => {
      const {tracingModel, traceParsedData} = await allModelsFromFile('web-dev.json.gz');
      const filmStripModel = new SDK.FilmStripModel.FilmStripModel(tracingModel);
      const numberOfFrames = filmStripModel.frames().length;
      const {dialog, shadowRoot} = await renderDialog(filmStripModel, numberOfFrames - 1);

      let renderedImage = shadowRoot.querySelector<HTMLImageElement>('[data-film-strip-dialog-img]');
      assert.isTrue(renderedImage?.currentSrc.includes(traceParsedData.Screenshots[numberOfFrames - 1].args.snapshot));

      const nextBtn = shadowRoot.querySelector<HTMLButtonElement>('[title="Next frame"]');
      if (!nextBtn) {
        throw new Error('Could not find next button');
      }
      dispatchClickEvent(nextBtn);
      await raf();
      renderedImage = shadowRoot.querySelector<HTMLImageElement>('[data-film-strip-dialog-img]');
      assert.isTrue(renderedImage?.currentSrc.includes(traceParsedData.Screenshots[numberOfFrames - 1].args.snapshot));
      dialog.hide();
    });

    it('lets the user navigate forwards to the next frame with the keyboard', async () => {
      const {tracingModel, traceParsedData} = await allModelsFromFile('web-dev.json.gz');
      const filmStripModel = new SDK.FilmStripModel.FilmStripModel(tracingModel);
      const {dialog, shadowRoot} = await renderDialog(filmStripModel, 0);
      const renderedImage = shadowRoot.querySelector<HTMLImageElement>('[data-film-strip-dialog-img]');
      if (!renderedImage) {
        throw new Error('Could not find film-strip-dialog img');
      }
      dispatchKeyDownEvent(renderedImage, {
        key: 'ArrowRight',
        bubbles: true,
      });
      await raf();
      assert.isTrue(renderedImage?.currentSrc.includes(traceParsedData.Screenshots[1].args.snapshot));
      dialog.hide();
    });
  });
});
