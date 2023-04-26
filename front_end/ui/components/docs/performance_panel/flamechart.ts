// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as EnvironmentHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as TraceHelpers from '../../../../../test/unittests/front_end/helpers/TraceHelpers.js';
import * as PerfUI from '../../../legacy/components/perf_ui/perf_ui.js';
import * as ComponentSetup from '../../helpers/helpers.js';
import type * as Platform from '../../../../core/platform/platform.js';
import type * as SDK from '../../../../core/sdk/sdk.js';

await EnvironmentHelpers.initializeGlobalVars();
await ComponentSetup.ComponentServerSetup.setup();

class FakeProvider implements PerfUI.FlameChart.FlameChartDataProvider {
  minimumBoundary(): number {
    return 0;
  }

  totalTime(): number {
    return 100;
  }

  formatValue(value: number): string {
    return value.toString();
  }

  maxStackDepth(): number {
    return 3;
  }

  prepareHighlightedEntryInfo(_entryIndex: number): Element|null {
    return null;
  }

  canJumpToEntry(_entryIndex: number): boolean {
    return false;
  }

  entryTitle(entryIndex: number): string|null {
    return `Entry ${entryIndex}`;
  }

  entryFont(_entryIndex: number): string|null {
    return null;
  }

  entryColor(_entryIndex: number): string {
    return 'lightblue';
  }

  decorateEntry(): boolean {
    return false;
  }

  forceDecoration(_entryIndex: number): boolean {
    return false;
  }

  textColor(_entryIndex: number): string {
    return 'black';
  }

  navStartTimes(): Map<string, SDK.TracingModel.Event> {
    return new Map();
  }

  timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
    return PerfUI.FlameChart.FlameChartTimelineData.create({
      entryLevels: [1, 1, 1],
      entryStartTimes: [5, 60, 80],
      entryTotalTimes: [50, 10, 10],
      groups: [{
        name: 'Test Group' as Platform.UIString.LocalizedString,
        startLevel: 1,
        style: {
          height: 17,
          padding: 4,
          collapsible: false,
          color: 'black',
          backgroundColor: 'grey',
          nestingLevel: 0,
          itemsHeight: 17,
        },
      }],
    });
  }
}

const container1 = document.querySelector('div#container1');
if (!container1) {
  throw new Error('No container');
}
const delegate = new TraceHelpers.MockFlameChartDelegate();
const dataProvider = new FakeProvider();
const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);

flameChart.markAsRoot();
flameChart.setWindowTimes(0, 100);
flameChart.show(container1);
flameChart.update();
