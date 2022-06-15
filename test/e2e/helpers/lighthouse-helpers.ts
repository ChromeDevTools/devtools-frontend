// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, goToResource, waitFor} from '../../shared/helper.js';

import {waitForQuotaUsage} from './application-helpers.js';

import type {ElementHandle} from 'puppeteer';

export async function waitForLighthousePanelContentLoaded() {
  await waitFor('.view-container[aria-label="Lighthouse panel"]');
}

export async function navigateToLighthouseTab(path?: string): Promise<ElementHandle<Element>> {
  await click('#tab-lighthouse');
  await waitForLighthousePanelContentLoaded();
  if (path) {
    await goToResource(path);
  }

  return waitFor('.lighthouse-start-view-fr');
}

export async function isGenerateReportButtonDisabled() {
  const button = await waitFor('.lighthouse-start-view-fr .primary-button');
  return button.evaluate(element => (element as HTMLButtonElement).disabled);
}

export async function openStorageView() {
  await click('#tab-resources');
  const STORAGE_SELECTOR = '[aria-label="Storage"]';
  await waitFor('.storage-group-list-item');
  await waitFor(STORAGE_SELECTOR);
  await click(STORAGE_SELECTOR);
}

export async function clearSiteData() {
  await goToResource('empty.html');
  await openStorageView();
  await click('#storage-view-clear-button');
  await waitForQuotaUsage(quota => quota === 0);
}

export async function waitForStorageUsage(p: (quota: number) => boolean) {
  await openStorageView();
  await waitForQuotaUsage(p);
  await click('#tab-lighthouse');
}
