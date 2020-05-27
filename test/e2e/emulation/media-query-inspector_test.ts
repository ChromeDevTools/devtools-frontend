// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {$$, getBrowserAndPages, resourcesPath, waitFor} from '../../shared/helper.js';
import {openDeviceToolbar, reloadDockableFrontEnd, showMediaQueryInspector} from '../helpers/emulation-helpers.js';

const MEDIA_INSPECTOR_MARKER_SELECTOR = '.media-inspector-marker';

describe('Media query inspector', async () => {
  beforeEach(async function() {
    await reloadDockableFrontEnd();

    const {target} = getBrowserAndPages();
    await target.goto(`${resourcesPath}/emulation/media-query-inspector.html`);
    await waitFor('.tabbed-pane-left-toolbar');
    await openDeviceToolbar();
    await showMediaQueryInspector();
  });

  it('lists all the media queries', async () => {
    const inspectorMarkers = await $$(MEDIA_INSPECTOR_MARKER_SELECTOR);
    const markersContent = await inspectorMarkers.evaluate((nodes: HTMLElement[]) => {
      return nodes.map((node: HTMLElement) => node.textContent);
    });
    assert.includeMembers(
        markersContent,
        [
          '100px300px',
          '500px800px',
          '801px',
        ],
        'missed media query rule(s)');
  });
});
