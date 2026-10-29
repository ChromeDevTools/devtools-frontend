// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import * as Media from './media.js';

describe('TickingFlameChart', () => {
  setupLocaleHooks();
  setupSettingsHooks();

  it('mounts the flame chart into the widget element and fills the container height', () => {
    const chartWidget = new Media.TickingFlameChart.TickingFlameChart();
    renderElementIntoDOM(chartWidget, {includeCommonStyles: true, width: 400, height: 400});

    assert.lengthOf(chartWidget.contentElement.children, 1);

    const firstChild = chartWidget.contentElement.firstElementChild;
    assert.exists(firstChild);
    assert.isDefined(UI.Widget.Widget.get(firstChild));

    const childWidget = chartWidget.children()[0];
    assert.exists(childWidget);
    const flameChart = childWidget instanceof PerfUI.FlameChart.FlameChart ? childWidget : childWidget.children()[0];
    assert.instanceOf(flameChart, PerfUI.FlameChart.FlameChart);
    assert.strictEqual(flameChart.element.clientHeight, 400);

    chartWidget.detach();
  });

  it('adds a ThemeSupport listener when shown and removes it when hidden', () => {
    const themeSupport = ThemeSupport.ThemeSupport.instance();
    const addSpy = sinon.spy(themeSupport, 'addEventListener');
    const removeSpy = sinon.spy(themeSupport, 'removeEventListener');
    const activeThemeListeners = (): number => {
      const isThemeChange = (call: sinon.SinonSpyCall): boolean =>
          call.args[0] === ThemeSupport.ThemeChangeEvent.eventName;
      return addSpy.getCalls().filter(isThemeChange).length - removeSpy.getCalls().filter(isThemeChange).length;
    };

    const timeline = new Media.TickingFlameChart.TickingFlameChart(undefined, () => {});
    assert.strictEqual(activeThemeListeners(), 0);

    renderElementIntoDOM(timeline);
    assert.strictEqual(activeThemeListeners(), 1);

    timeline.detach();
    assert.strictEqual(activeThemeListeners(), 0);
  });
});
