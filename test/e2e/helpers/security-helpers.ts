// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {DevToolsPage} from '../shared/frontend-helper.js';

import {openCommandMenu} from './quick_open-helpers.js';
import {openPanelViaMoreTools} from './settings-helpers.js';
import {veImpression} from './visual-logging-helpers.js';

const SECURITY_PANEL_CONTENT = '.view-container[aria-label="Security panel"]';
const SECURITY_TAB_SELECTOR = '#tab-security';
const SECURITY_PANEL_TITLE = 'Security';

export async function securityTabExists(devToolsPage: DevToolsPage) {
  await devToolsPage.waitFor(SECURITY_TAB_SELECTOR);
}

export async function securityTabDoesNotExist(devToolsPage: DevToolsPage) {
  await devToolsPage.waitForNone(SECURITY_TAB_SELECTOR);
}

export async function securityPanelContentIsLoaded(devToolsPage: DevToolsPage) {
  await devToolsPage.waitFor(SECURITY_PANEL_CONTENT);
}

export async function navigateToSecurityTab(devToolsPage: DevToolsPage) {
  await devToolsPage.click(SECURITY_TAB_SELECTOR);
  await securityPanelContentIsLoaded(devToolsPage);
}

export async function closeSecurityTab(devToolsPage: DevToolsPage) {
  await devToolsPage.closePanelTab(SECURITY_TAB_SELECTOR);
  await securityTabDoesNotExist(devToolsPage);
}

export async function openSecurityPanelFromMoreTools(devToolsPage: DevToolsPage) {
  await openPanelViaMoreTools(SECURITY_PANEL_TITLE, devToolsPage);
  await securityTabExists(devToolsPage);
  await securityPanelContentIsLoaded(devToolsPage);
}

export async function openSecurityPanelFromCommandMenu(devToolsPage: DevToolsPage) {
  await openCommandMenu(devToolsPage);
  await devToolsPage.typeText('Show Security');
  await devToolsPage.pressKey('Enter');
  await securityTabExists(devToolsPage);
  await securityPanelContentIsLoaded(devToolsPage);
}

export function veImpressionForSecurityPanel() {
  return veImpression('Panel', 'security', [
    veImpression(
        'Pane', 'sidebar',
        [
          veImpression(
              'Tree', undefined,
              [
                veImpression(
                    'TreeItem', 'security',
                    [
                      veImpression('TreeItem', undefined, [veImpression('TreeItem'), veImpression('Expand')]),
                    ]),
              ]),
        ]),
    veImpression('Pane', 'security.main-view'),
  ]);
}
