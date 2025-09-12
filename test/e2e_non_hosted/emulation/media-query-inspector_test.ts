// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openDeviceToolbar, showMediaQueryInspector} from '../../e2e/helpers/emulation-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const MEDIA_INSPECTOR_MARKER_SELECTOR = '.media-inspector-marker';

async function loadMediaQueryInspector(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  await inspectedPage.goToResource('emulation/media-query-inspector.html');
  await devToolsPage.waitFor('.tabbed-pane-left-toolbar');
  await openDeviceToolbar(devToolsPage, inspectedPage);
  await showMediaQueryInspector(devToolsPage);
}

describe('Media query inspector', () => {
  it('lists all the media queries', async ({devToolsPage, inspectedPage}) => {
    await loadMediaQueryInspector(devToolsPage, inspectedPage);
    const inspectorMarkers = await devToolsPage.waitForFunction(async () => {
      const markers = await devToolsPage.$$(MEDIA_INSPECTOR_MARKER_SELECTOR);
      return markers.length >= 3 ? markers : undefined;
    });
    const markersContent = await Promise.all(inspectorMarkers.map(node => {
      return node.evaluate(node => node.textContent);
    }));
    assert.deepEqual(
        markersContent,
        [
          // They are duplicated, as the markers are added both on the left and right of the viewport
          '300px100px',
          '100px300px',
          '800px500px',
          '500px800px',
          '801px',
          '801px',
        ],
        'missed media query rule(s)');
  });
});
