// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$$, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {openDeviceToolbar, reloadDockableFrontEnd, showMediaQueryInspector} from '../helpers/emulation-helpers.js';

const MEDIA_INSPECTOR_MARKER_SELECTOR = '.media-inspector-marker';

describe('Media query inspector', async () => {
  beforeEach(async function() {
    await reloadDockableFrontEnd();

    await goToResource('emulation/media-query-inspector.html');
    await waitFor('.tabbed-pane-left-toolbar');
    await openDeviceToolbar();
    await showMediaQueryInspector();
  });

  it('lists all the media queries', async () => {
    const inspectorMarkers = await waitForFunction(async () => {
      const markers = await $$(MEDIA_INSPECTOR_MARKER_SELECTOR);
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
