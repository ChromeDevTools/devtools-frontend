// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages, goToResource, waitFor} from '../../shared/helper.js';

export async function playMediaFile(media: string) {
  const {target} = getBrowserAndPages();
  await goToResource(`media/${media}`);

  // Need to click play manually - autoplay policy prevents it otherwise.
  return new Promise<void>(async resolve => {
    await target.exposeFunction('resolve', resolve);
    await target.evaluate(() => {
      const videoElement = document.getElementsByName('media')[0] as HTMLVideoElement;
      videoElement.addEventListener('play', () => {
        resolve();
      });
      // Just in case autoplay started before we could attach an event listener.
      if (!videoElement.paused || videoElement.readyState > 2) {
        resolve();
      } else {
        videoElement.play();
      }
    });
  });
}

export async function getPlayerButton() {
  return await waitFor('.player-entry-tree-element');
}

export async function getPlayerButtonText() {
  const playerEntry = await getPlayerButton();
  return await playerEntry.evaluate(element => element.textContent as string);
}
