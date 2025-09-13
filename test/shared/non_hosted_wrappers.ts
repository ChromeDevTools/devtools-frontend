// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages} from '../conductor/puppeteer-state.js';
import {getTestServerPort} from '../conductor/server_port.js';
import {BrowserWrapper} from '../e2e_non_hosted/shared/browser-helper.js';
import {DevToolsPage} from '../e2e_non_hosted/shared/frontend-helper.js';
import {InspectedPage} from '../e2e_non_hosted/shared/target-helper.js';

export function getBrowserAndPagesWrappers() {
  const {frontend, target, browser} = getBrowserAndPages();
  return {
    devToolsPage: new DevToolsPage(frontend),
    inspectedPage: new InspectedPage(target, getTestServerPort()),
    browserWrapper: new BrowserWrapper(browser),
  };
}
