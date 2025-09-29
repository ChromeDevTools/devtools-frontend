// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as UI from '../../../ui/legacy/legacy.js';

import * as ApplicationComponents from './components.js';

describeWithLocale('EndpointsGrid', () => {
  describe('view', () => {
    let target!: HTMLElement;

    beforeEach(async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      const widget = new UI.Widget.Widget();
      widget.markAsRoot();
      widget.show(container);
      target = widget.element;
      target.style.display = 'flex';
      target.style.width = '780px';
      target.style.height = '400px';
    });

    it('looks fine with no endpoints', async () => {
      ApplicationComponents.EndpointsGrid.DEFAULT_VIEW({endpoints: new Map()}, undefined, target);
      await assertScreenshot('application/endpoints_grid_empty.png');
    });

    it('looks fine with endpoints', async () => {
      const endpoints = new Map([
        [
          'https://www.my-page.com',
          [
            {url: 'https://www.reports-endpoint/main', groupName: 'main-endpoint'},
            {url: 'https://www.reports-endpoint/default', groupName: 'default'},
          ],
        ],
        [
          'https://www.other-page.com',
          [
            {url: 'https://www.csp-reports/csp', groupName: 'csp-endpoint'},
          ],
        ],
      ]);
      ApplicationComponents.EndpointsGrid.DEFAULT_VIEW({endpoints}, undefined, target);
      await assertScreenshot('application/endpoints_grid.png');
    });
  });
});
