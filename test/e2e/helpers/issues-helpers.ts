// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, waitFor} from '../../shared/helper.js';
import {openPanelViaMoreTools} from './settings-helpers';

export const ISSUE = '.issue';
export const AFFECTED_ELEMENT_ICON = '.affected-resource-csp-info-node';
export const ELEMENT_REVEAL_ICON = '.element-reveal-icon';
export const ELEMENTS_PANEL_SELECTOR = '.panel[aria-label="elements"]';
export const SOURCES_LINK = '.affected-source-location > span';

export async function navigateToIssuesTab() {
  await openPanelViaMoreTools('Issues');
}

export async function expandIssue() {
  await waitFor(ISSUE);
  await click(ISSUE);
  await waitFor('.message');
}

export async function revealNodeInElementsPanel() {
  const revealIcon = await waitFor(ELEMENT_REVEAL_ICON);
  await revealIcon.click();
}

export async function revealViolatingSourcesLines() {
  const sourcesLink = await waitFor(SOURCES_LINK);
  await sourcesLink.click();
}
