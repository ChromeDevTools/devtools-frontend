// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../../../front_end/core/sdk/sdk.js';
import * as PerfUI from '../../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {querySelectorErrorOnMissing, raf, renderElementIntoDOM} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';
import {allModelsFromFile} from '../../../../helpers/TraceHelpers.js';

const {assert} = chai;

describeWithEnvironment('FilmStripView', () => {
  async function renderView(filmStripModel: SDK.FilmStripModel.FilmStripModel):
      Promise<PerfUI.FilmStripView.FilmStripView> {
    const filmStrip = new PerfUI.FilmStripView.FilmStripView();
    filmStrip.setModel(filmStripModel, filmStripModel.zeroTime(), filmStripModel.spanTime());
    filmStrip.setMode(PerfUI.FilmStripView.Modes.FrameBased);
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
});
