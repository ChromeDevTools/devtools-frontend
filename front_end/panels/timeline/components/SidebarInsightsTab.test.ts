// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, it} from 'mocha';

import {assertScreenshot, renderElementIntoDOM, setColorScheme} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as Components from './components.js';

describeWithEnvironment('SidebarInsightsTab', () => {
  afterEach(() => {
    setColorScheme('light');
  });
  it('renders a list of insights per navigation in the sidebar', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'multiple-navigations.json.gz');

    const component = new Components.SidebarInsightsTab.SidebarInsightsTab();
    renderElementIntoDOM(component);
    component.parsedTrace = parsedTrace;
    await component.updateComplete;
    assert.isOk(component.element.shadowRoot);

    const navigationURLs = Array.from(component.element.shadowRoot.querySelectorAll<HTMLElement>('details > summary'))
                               .map(elem => elem.title);
    assert.deepEqual(navigationURLs, [
      'https://www.google.com/',
      'https://www.google.com/',
      'https://www.google.com/imghp?hl=en&ogbl',
      'https://www.google.com/search?q=dogs&hl=en&tbm=isch&source=hp&biw=738&bih=893&ei=_ER4YPD6D4zka4u2t8gM&oq=dogs&gs_lcp=CgNpbWcQAzICCAAyBQgAELEDMgUIABCxAzICCAAyBQgAELEDMgUIABCxAzIFCAAQsQMyAggAMgUIABCxAzIFCAAQsQM6CAgAELEDEIMBOgQIABADUI4QWOISYPsTaABwAHgAgAEiiAFxkgEBNJgBAKABAaoBC2d3cy13aXotaW1n&sclient=img&ved=0ahUKEwjw6IjVsoDwAhUM8hoKHQvbDckQ4dUDCAc&uact=5',
    ]);

    const navigationURLLabels =
        Array.from(component.element.shadowRoot.querySelectorAll<HTMLElement>('details > summary'))
            .map(elem => elem.innerText);
    assert.deepEqual(navigationURLLabels, [
      '/',
      '/',
      '/imghp?hl=en&ogbl',
      '/search?q=dogs&hl=en&tbm=isch&source=hp&biw=738&bih=893&ei=_ER4YPD…&oq=dogs&gs_lcp=CgNpbWc…&sclient=img&ved=0ahUKEw…&uact=5',
    ]);

    const sets = component.element.shadowRoot.querySelectorAll('[data-insight-set-key]');
    assert.lengthOf(sets, 4);  // same number of sets as there are navigations
  });

  it('applies flex layout to the content element via :scope', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'multiple-navigations.json.gz');

    const component = new Components.SidebarInsightsTab.SidebarInsightsTab();
    renderElementIntoDOM(component);
    component.parsedTrace = parsedTrace;
    await component.updateComplete;

    const computedStyle = getComputedStyle(component.contentElement);
    assert.strictEqual(computedStyle.display, 'flex');
    assert.strictEqual(computedStyle.flexDirection, 'column');
    assert.strictEqual(computedStyle.flexWrap, 'nowrap');
    assert.strictEqual(computedStyle.flexGrow, '1');
  });

  async function renderForScreenshot(context: Mocha.Context): Promise<void> {
    const parsedTrace = await TraceLoader.traceEngine(context, 'multiple-navigations.json.gz');

    const component = new Components.SidebarInsightsTab.SidebarInsightsTab();
    component.element.style.width = '300px';
    component.element.style.height = '400px';
    renderElementIntoDOM(component);
    component.parsedTrace = parsedTrace;
    await component.updateComplete;
  }

  it('renders correctly in light theme', async function() {
    await renderForScreenshot(this);

    setColorScheme('light');
    await assertScreenshot('timeline/sidebar_insights_tab_light.png');
  });

  it('renders correctly in dark theme', async function() {
    await renderForScreenshot(this);

    setColorScheme('dark');
    await assertScreenshot('timeline/sidebar_insights_tab_dark.png');
  });
});
