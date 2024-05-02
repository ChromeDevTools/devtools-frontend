// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, getBrowserAndPages, goToResource, waitFor, waitForFunction, waitForMany} from '../../shared/helper.js';

export async function playMediaFile(media: string) {
  const {target} = getBrowserAndPages();
  await goToResource(`media/${media}`);

  // Need to click play manually - autoplay policy prevents it otherwise.
  await target.evaluate(() => new Promise<void>(resolve => {
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
                            return;
                          }

                          // If the player has entered the ended state with t=0,
                          // this is an error, and the test should fail. If the player
                          // has not ended yet, then the event listener above should
                          // resolve the promise shortly.
                        }));
}

export async function getPlayerButton() {
  return await waitFor('.player-entry-player-title');
}

export async function getPlayerErrors(count: number) {
  await click('.player-entry-player-title');
  await click('#tab-messages');
  return await waitForMany('.media-message-error', count);
}

export async function getPlayerButtonText() {
  const playerEntry = await getPlayerButton();
  return await playerEntry.evaluate(element => element.textContent as string);
}

export async function waitForPlayerButtonTexts(count: number) {
  return waitForFunction(async () => {
    return await waitForMany('.player-entry-player-title', count);
  });
}
