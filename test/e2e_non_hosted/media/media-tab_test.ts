// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers';
import type {DevToolsPage} from '../shared/frontend-helper';
import type {InspectedPage} from '../shared/target-helper';

describe('Media Tab', () => {
  async function playMediaFile(media: string, inspectedPage: InspectedPage) {
    await inspectedPage.goToResource(`media/${media}`);

    // Need to click play manually - autoplay policy prevents it otherwise.
    await inspectedPage.evaluate(() => new Promise<void>((resolve, reject) => {
                                   const videoElement = document.getElementsByName('media')[0] as HTMLVideoElement;

                                   // Only resolve the promise when the video has finished
                                   // the entirety of it's playback.
                                   videoElement.addEventListener('ended', () => {
                                     resolve();
                                   }, {once: true});

                                   // If the element is in the error state, then consider
                                   // it to be finished.
                                   if (videoElement.error) {
                                     resolve();
                                   }

                                   // If the video is _already_ in an ended state and time
                                   // is greater than 0, then autoplay allowed playback and
                                   // the playback has already finished. We can just resolve
                                   // in this case.
                                   if (videoElement.ended && videoElement.currentTime > 0) {
                                     resolve();
                                     return;
                                   }

                                   // If we aren't ended or errord, and the time is still 0,
                                   // then autoplay requires us to play the video manually.
                                   if (!videoElement.ended && videoElement.currentTime === 0) {
                                     void videoElement.play();
                                     resolve();
                                     return;
                                   }

                                   // If the player has entered the ended state with t=0,
                                   // this is an error, and the test should fail. If the player
                                   // has not ended yet, then the event listener above should
                                   // resolve the promise shortly.
                                   reject();
                                 }));
  }

  async function getPlayerButton(devToolsPage: DevToolsPage) {
    return await devToolsPage.waitFor('.player-entry-player-title');
  }

  async function getPlayerErrors(count: number, devToolsPage: DevToolsPage) {
    await devToolsPage.click('.player-entry-player-title');
    await devToolsPage.click('#tab-messages');
    return await devToolsPage.waitForMany('.media-message-error', count);
  }

  async function getPlayerButtonText(devToolsPage: DevToolsPage) {
    const playerEntry = await getPlayerButton(devToolsPage);
    return await playerEntry.evaluate(element => element.textContent as string);
  }

  async function waitForPlayerButtonTexts(count: number, devToolsPage: DevToolsPage) {
    return await devToolsPage.waitForFunction(async () => {
      return await devToolsPage.waitForMany('.player-entry-player-title', count);
    });
  }

  // Skip to allow DEPS roll while we properly figure out how to re-enable this.
  it.skip('[crbug.com/40269197] ensures video playback adds entry', async ({devToolsPage, inspectedPage}) => {
    await openPanelViaMoreTools('Media', devToolsPage);
    await playMediaFile('fisch.webm', inspectedPage);
    await devToolsPage.waitForFunction(async () => {
      const entryName = await getPlayerButtonText(devToolsPage);
      return entryName === 'fisch.webm';
    });
  });

  // Skip to allow DEPS roll while we properly figure out how to re-enable this.
  it.skip(
      '[crbug.com/40269197] ensures video playback adds entry for web worker',
      async ({devToolsPage, inspectedPage}) => {
        await devToolsPage.bringToFront();
        await openPanelViaMoreTools('Media', devToolsPage);
        await inspectedPage.goToResource('media/codec_worker.html');
        await waitForPlayerButtonTexts(4, devToolsPage);
      });

  // Skip to allow DEPS roll while we properly figure out how to re-enable this.
  it.skip('[crbug.com/40269197] ensures that errors are rendered nicely', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.bringToFront();
    await openPanelViaMoreTools('Media', devToolsPage);
    await inspectedPage.goToResource('media/corrupt.webm');
    await inspectedPage.bringToFront();
    await inspectedPage.evaluate(() => {
      const videoElement = document.getElementsByName('media')[0] as HTMLVideoElement;
      void videoElement.play();
    });
    await inspectedPage.raf();
    await devToolsPage.bringToFront();
    await devToolsPage.raf();
    const errors = await getPlayerErrors(2, devToolsPage);
    const errorContent = await errors[1].evaluate(el => el.textContent);
    assert.include(errorContent, 'PipelineStatus');
  });
});
