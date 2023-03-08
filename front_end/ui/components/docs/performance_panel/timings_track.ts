// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../../test/unittests/front_end/helpers/TraceHelpers.js';
import * as ComponentSetup from '../../helpers/helpers.js';

await ComponentSetup.ComponentServerSetup.setup();

const container = document.getElementById('container');
if (!container) {
  throw new Error('could not find container');
}
container.innerHTML = '';
const {flameChart, dataProvider} =
    await FrontendHelpers.getMainFlameChartWithTracks('timings-track.json.gz', new Set(['Timings']));
const timingsTrackOffset = flameChart.levelToOffset(dataProvider.maxStackDepth());
container.style.height = `${timingsTrackOffset}px`;
flameChart.show(container);
