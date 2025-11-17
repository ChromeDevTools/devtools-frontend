// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

import {openCommandMenu} from './quick_open-helpers.js';
import {openPanelViaMoreTools} from './settings-helpers.js';
import {veImpression} from './visual-logging-helpers.js';

const PRIVACY_AND_SECURITY_PANEL_CONTENT = '.view-container[aria-label="Privacy and security panel"]';
const SECURITY_PANEL_CONTENT = '.view-container[aria-label="Security panel"]';
const SECURITY_TAB_SELECTOR = '#tab-security';
const PRIVACY_AND_SECURITY_PANEL_TITLE = 'Privacy and security';
const SECURITY_PANEL_TITLE = 'Security';

export async function securityTabExists(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitFor(SECURITY_TAB_SELECTOR);
}

export async function securityTabDoesNotExist(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitForNone(SECURITY_TAB_SELECTOR);
}

export async function securityPanelContentIsLoaded(
    privacyEnabled?: boolean, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitFor(privacyEnabled ? PRIVACY_AND_SECURITY_PANEL_CONTENT : SECURITY_PANEL_CONTENT);
}

export async function navigateToSecurityTab(
    privacyEnabled?: boolean, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click(SECURITY_TAB_SELECTOR);
  await securityPanelContentIsLoaded(privacyEnabled, devToolsPage);
}

export async function closeSecurityTab(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.closePanelTab(SECURITY_TAB_SELECTOR);
  await securityTabDoesNotExist(devToolsPage);
}

export async function openSecurityPanelFromMoreTools(
    privacyEnabled?: boolean, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await openPanelViaMoreTools(privacyEnabled ? PRIVACY_AND_SECURITY_PANEL_TITLE : SECURITY_PANEL_TITLE, devToolsPage);
  await securityTabExists(devToolsPage);
  await securityPanelContentIsLoaded(privacyEnabled, devToolsPage);
}

export async function openSecurityPanelFromCommandMenu(
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await openCommandMenu(devToolsPage);
  await devToolsPage.typeText('Show Security');
  await devToolsPage.page.keyboard.press('Enter');
  await securityTabExists(devToolsPage);
  await securityPanelContentIsLoaded(true, devToolsPage);
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
