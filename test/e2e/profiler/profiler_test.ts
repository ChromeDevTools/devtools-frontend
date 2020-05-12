// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

import {getBrowserAndPages} from '../../shared/helper.js';
import {createAProfile, navigateToProfilerTab} from '../helpers/profiler-helpers.js';

describe('The JavaScript Profiler Panel', async () => {
  it('Loads content', async () => {
    const {target} = getBrowserAndPages();
    await navigateToProfilerTab(target);
  });

  it('Can make one profile and display its information', async () => {
    const {target} = getBrowserAndPages();
    await navigateToProfilerTab(target);
    await createAProfile();
  });
});
