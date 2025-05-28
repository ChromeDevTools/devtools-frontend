// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {veImpression} from './visual-logging-helpers.js';

export function veImpressionForAnimationsPanel() {
  return veImpression('Panel', 'animations', [
    veImpression(
        'Toolbar', undefined,
        [
          veImpression('Action', 'animations.playback-rate-100'),
          veImpression('Action', 'animations.playback-rate-25'),
          veImpression('Action', 'animations.playback-rate-10'),
          veImpression('Action', 'animations.clear'),
          veImpression('Toggle', 'animations.pause-resume-all'),
        ]),
    veImpression('Timeline', 'animations.grid-header'),
    veImpression('Action', 'animations.play-replay-pause-animation-group'),
  ]);
}
