// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from '../../shared/mocha-extensions.js';

import {createAProfile, navigateToProfilerTab} from '../helpers/profiler-helpers.js';

describe('The JavaScript Profiler Panel', async () => {
  it('Loads content', async () => {
    await navigateToProfilerTab();
  });

  it('Can make one profile and display its information', async () => {
    await navigateToProfilerTab();
    await createAProfile();
  });
});
