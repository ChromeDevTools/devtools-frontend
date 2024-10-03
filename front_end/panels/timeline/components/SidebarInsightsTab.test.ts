// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as Components from './components.js';
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithEnvironment('SidebarInsightsTab', () => {
  it('renders a list of insights per navigation in the sidebar', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'multiple-navigations.json.gz');

    const component = new Components.SidebarInsightsTab.SidebarInsightsTab();
    renderElementIntoDOM(component);
    component.parsedTrace = parsedTrace;
    component.insights = insights;
    await coordinator.done();
    assert.isOk(component.shadowRoot);

    const navigationURLs =
        Array.from(component.shadowRoot.querySelectorAll<HTMLElement>('details > summary')).map(elem => elem.title);
    assert.deepEqual(navigationURLs, [
      'https://www.google.com/',
      'https://www.google.com/',
      'https://www.google.com/imghp?hl=en&ogbl',
      'https://www.google.com/search?q=dogs&hl=en&tbm=isch&source=hp&biw=738&bih=893&ei=_ER4YPD6D4zka4u2t8gM&oq=dogs&gs_lcp=CgNpbWcQAzICCAAyBQgAELEDMgUIABCxAzICCAAyBQgAELEDMgUIABCxAzIFCAAQsQMyAggAMgUIABCxAzIFCAAQsQM6CAgAELEDEIMBOgQIABADUI4QWOISYPsTaABwAHgAgAEiiAFxkgEBNJgBAKABAaoBC2d3cy13aXotaW1n&sclient=img&ved=0ahUKEwjw6IjVsoDwAhUM8hoKHQvbDckQ4dUDCAc&uact=5',
    ]);

    const navigationURLLabels =
        Array.from(component.shadowRoot.querySelectorAll<HTMLElement>('details > summary')).map(elem => elem.innerText);
    assert.deepEqual(navigationURLLabels, [
      '/',
      '/',
      '/imghp?hl=en&ogbl',
      '/search?q=dogs&hl=en&tbm=isch&source=hp&biw=738&bih=893&ei=_ER4YPD…&oq=dogs&gs_lcp=CgNpbWc…&sclient=img&ved=0ahUKEw…&uact=5',
    ]);

    const sets = component.shadowRoot.querySelectorAll('devtools-performance-sidebar-single-navigation');
    assert.lengthOf(sets, 4);  // same number of sets as there are navigations
  });
});
