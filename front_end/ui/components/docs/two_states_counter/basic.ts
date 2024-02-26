// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../helpers/helpers.js';
import * as TwoStatesCounter from '../../two_states_counter/two_states_counter.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

function getGeneralCounterData() {
  return {
    active: 3,
    inactive: 10,
    width: '18px',
    height: '18px',
    activeTitle: 'Num active',
    inactiveTitle: 'Num inactive',
  } as TwoStatesCounter.TwoStatesCounter.TwoStatesCounterData;
}

function appendCounter(counter: TwoStatesCounter.TwoStatesCounter.TwoStatesCounter): void {
  document.querySelector('#container')?.appendChild(counter);
}

// Active and inactive counts.
const counterData = getGeneralCounterData();
const counter = new TwoStatesCounter.TwoStatesCounter.TwoStatesCounter();
counter.data = counterData;
appendCounter(counter);

// Only active count.
const activeCountData = getGeneralCounterData();
activeCountData.inactive = 0;
const activeOnlyCounter = new TwoStatesCounter.TwoStatesCounter.TwoStatesCounter();
activeOnlyCounter.data = activeCountData;
appendCounter(activeOnlyCounter);

// Only inactive count.
const inactiveCountData = getGeneralCounterData();
inactiveCountData.active = 0;
const inactiveOnlyCounter = new TwoStatesCounter.TwoStatesCounter.TwoStatesCounter();
inactiveOnlyCounter.data = inactiveCountData;
appendCounter(inactiveOnlyCounter);
