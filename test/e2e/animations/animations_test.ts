// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

import {getBrowserAndPages} from '../../shared/helper.js';
import {navigateToSiteWithAnimation, waitForAnimationContent, waitForAnimationsPanelToLoad} from '../helpers/animations-helpers.js';

describe('The Animations Panel', async () => {
  it('Listens for animation in webpage', async () => {
    const {target} = getBrowserAndPages();
    await waitForAnimationsPanelToLoad();
    await navigateToSiteWithAnimation(target);
    await waitForAnimationContent();
  });
});
