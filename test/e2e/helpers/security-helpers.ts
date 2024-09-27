// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, closePanelTab, getBrowserAndPages, typeText, waitFor, waitForNone} from '../../shared/helper.js';

import {openCommandMenu} from './quick_open-helpers.js';
import {openPanelViaMoreTools} from './settings-helpers.js';
import {veImpression} from './visual-logging-helpers.js';

const SECURITY_PANEL_CONTENT = '.view-container[aria-label="Security panel"]';
const SECURITY_TAB_SELECTOR = '#tab-security';
const SECURITY_PANEL_TITLE = 'Security';

export async function securityTabExists() {
  await waitFor(SECURITY_TAB_SELECTOR);
}

export async function securityTabDoesNotExist() {
  await waitForNone(SECURITY_TAB_SELECTOR);
}

export async function securityPanelContentIsLoaded() {
  await waitFor(SECURITY_PANEL_CONTENT);
}

export async function navigateToSecurityTab() {
  await click(SECURITY_TAB_SELECTOR);
  await securityPanelContentIsLoaded();
}

export async function closeSecurityTab() {
  await closePanelTab(SECURITY_TAB_SELECTOR);
  await securityTabDoesNotExist();
}

export async function openSecurityPanelFromMoreTools() {
  await openPanelViaMoreTools(SECURITY_PANEL_TITLE);
  await securityTabExists();
  await securityPanelContentIsLoaded();
}

export async function openSecurityPanelFromCommandMenu() {
  const {frontend} = getBrowserAndPages();
  await openCommandMenu();
  await typeText('Show Security');
  await frontend.keyboard.press('Enter');
  await securityTabExists();
  await securityPanelContentIsLoaded();
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
