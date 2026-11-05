// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';

import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as Components from './components.js';

describeWithEnvironment('CWVMetrics', () => {
  it('renders soft navigation badge for soft navigations', async function() {
    const component = new Components.CWVMetrics.CWVMetrics();
    renderElementIntoDOM(component, {includeCommonStyles: true});

    const parsedTrace = await TraceLoader.traceEngine(this, 'soft-navs.json.gz');
    // Find a soft navigation insight set
    const insightSetKey = 'NAVIGATION_2';

    component.data = {
      insightSetKey: insightSetKey as string,
      parsedTrace,
    };
    await component.updateComplete;

    component.element.style.width = '400px';
    component.element.style.height = '400px';
    component.element.style.display = 'block';
    await assertScreenshot('timeline/cwv-metrics-soft-nav-badge.png');
  });

  it('hides the soft navigation badge for hard navigations', async function() {
    const component = new Components.CWVMetrics.CWVMetrics();
    renderElementIntoDOM(component, {includeCommonStyles: true});

    const parsedTrace = await TraceLoader.traceEngine(this, 'multiple-navigations.json.gz');
    // First navigation is a hard navigation
    const keys = Array.from(parsedTrace.insights?.keys() || []);
    const insightSetKey = keys.find(key => key.startsWith('NAVIGATION_')) || keys[0];
    assert.isOk(insightSetKey);

    component.data = {
      insightSetKey: insightSetKey as string,
      parsedTrace,
    };
    await component.updateComplete;

    const badge = component.contentElement.querySelector('.soft-nav-badge');
    assert.isNull(badge);
  });

  it('styles unclassified metric values with subtle token color', async function() {
    const component = new Components.CWVMetrics.CWVMetrics();
    renderElementIntoDOM(component, {includeCommonStyles: true});

    const parsedTrace = await TraceLoader.traceEngine(this, 'multiple-navigations.json.gz');
    const keys = Array.from(parsedTrace.insights?.keys() || []);
    const insightSetKey = keys.find(key => key.startsWith('NAVIGATION_')) || keys[0];
    assert.isOk(insightSetKey);

    component.data = {
      insightSetKey: insightSetKey as string,
      parsedTrace,
    };
    await component.updateComplete;

    const unclassifiedElement =
        component.contentElement.querySelector<HTMLElement>('.metric-value.metric-value-unclassified');
    assert.isNotNull(unclassifiedElement);

    const probe = document.createElement('div');
    probe.style.color = 'var(--sys-color-token-subtle)';
    component.contentElement.appendChild(probe);
    const expectedColor = window.getComputedStyle(probe).color;
    probe.remove();

    assert.isNotEmpty(expectedColor);
    assert.notStrictEqual(expectedColor, 'rgb(0, 0, 0)', 'Theme token should resolve to non-default color');

    const computedColor = window.getComputedStyle(unclassifiedElement).color;
    assert.strictEqual(computedColor, expectedColor);
  });
});
