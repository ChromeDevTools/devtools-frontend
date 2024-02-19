// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../../../front_end/models/trace/trace.js';
import * as PerfUI from '../../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {describeWithLocale} from '../../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

const {MilliSeconds} = TraceEngine.Types.Timing;

describeWithLocale('TimelineGrid', () => {
  it('calculates a set of dividers for the grid', async () => {
    const calculator = new PerfUI.TimelineOverviewCalculator.TimelineOverviewCalculator();
    calculator.setDisplayWidth(200);
    calculator.setBounds(MilliSeconds(0), MilliSeconds(200));

    const dividers = PerfUI.TimelineGrid.TimelineGrid.calculateGridOffsets(calculator);
    assert.deepEqual(dividers, {
      offsets: [
        {

          position: 0,
          time: 0,
        },
        {
          position: 100,
          time: 100,

        },
        {
          position: 200,
          time: 200,
        },
      ],
      precision: 0,
    });
  });

  it('ups the precision if it is showing decimal values', async () => {
    const calculator = new PerfUI.TimelineOverviewCalculator.TimelineOverviewCalculator();
    calculator.setDisplayWidth(1000);
    calculator.setBounds(MilliSeconds(0), MilliSeconds(2));

    const dividers = PerfUI.TimelineGrid.TimelineGrid.calculateGridOffsets(calculator);
    assert.deepEqual(dividers, {
      offsets: [
        {
          position: 0,
          time: 0,
        },
        {
          position: 100,
          time: 0.2,
        },
        {
          position: 200,
          time: 0.4,
        },
        {
          position: 300,
          time: 0.6,
        },
        {
          position: 400,
          time: 0.8,
        },
        {
          position: 500,
          time: 1,
        },
        {
          position: 600,
          time: 1.2,
        },
        {
          position: 700,
          time: 1.4,
        },
        {
          position: 800,
          time: 1.6,
        },
        {
          position: 900,
          time: 1.8,
        },
        {
          position: 1000,
          time: 2,
        },
      ],
      precision: 1,
    });
  });
  it('generates more dividers if there is more pixel room', async () => {
    const calculator = new PerfUI.TimelineOverviewCalculator.TimelineOverviewCalculator();
    calculator.setDisplayWidth(1000);
    calculator.setBounds(MilliSeconds(0), MilliSeconds(200));

    const dividers = PerfUI.TimelineGrid.TimelineGrid.calculateGridOffsets(calculator);
    assert.deepEqual(dividers, {
      offsets: [
        {
          position: 0,
          time: 0,
        },
        {
          position: 100,
          time: 20,
        },
        {
          position: 200,
          time: 40,
        },
        {
          position: 300,
          time: 60,
        },
        {
          position: 400,
          time: 80,
        },
        {
          position: 500,
          time: 100,
        },
        {
          position: 600,
          time: 120,
        },
        {
          position: 700,
          time: 140,
        },
        {
          position: 800,
          time: 160,
        },
        {
          position: 900,
          time: 180,
        },
        {
          position: 1000,
          time: 200,
        },
      ],
      precision: 0,
    });
  });
});
