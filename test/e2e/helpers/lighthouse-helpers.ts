// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, goToResource, waitFor, waitForElementWithTextContent, waitForFunction} from '../../shared/helper.js';

import {waitForQuotaUsage} from './application-helpers.js';

import {type ElementHandle} from 'puppeteer';

export async function navigateToLighthouseTab(path?: string): Promise<ElementHandle<Element>> {
  await click('#tab-lighthouse');
  await waitFor('.view-container > .lighthouse');
  if (path) {
    await goToResource(path);
  }

  return waitFor('.lighthouse-start-view-fr');
}

// Instead of watching the worker or controller/panel internals, we wait for the Lighthouse renderer
// to create the new report DOM. And we pull the LHR and artifacts off the lh-root node.
export async function waitForResult() {
  return await waitForFunction(async () => {
    const reportEl = await waitFor('.lh-root');
    const result = await reportEl.evaluate(elem => {
      // @ts-expect-error we installed this obj on a DOM element
      const lhr = elem._lighthouseResultForTesting;
      // @ts-expect-error we installed this obj on a DOM element
      const artifacts = elem._lighthouseArtifactsForTesting;
      // Delete so any subsequent runs don't accidentally reuse this.
      // @ts-expect-error
      delete elem._lighthouseResultForTesting;
      // @ts-expect-error
      delete elem._lighthouseArtifactsForTesting;
      return {lhr, artifacts};
    });
    return {...result, reportEl};
  });
}

// Can't reference ToolbarSettingCheckbox inside e2e
type CheckboxLabel = Element&{checkboxElement: HTMLInputElement};

/**
 * Set the category checkboxes
 * @param selectedCategoryIds One of 'performance'|'accessibility'|'best-practices'|'seo'|'pwa'|'lighthouse-plugin-publisher-ads'
 */
export async function selectCategories(selectedCategoryIds: string[]) {
  const startViewHandle = await waitFor('.lighthouse-start-view-fr');
  const checkboxHandles = await startViewHandle.$$('[is=dt-checkbox]');
  for (const checkboxHandle of checkboxHandles) {
    await checkboxHandle.evaluate((dtCheckboxElem, selectedCategoryIds: string[]) => {
      const elem = dtCheckboxElem as CheckboxLabel;
      const categoryId = elem.getAttribute('data-lh-category') || '';
      elem.checkboxElement.checked = selectedCategoryIds.includes(categoryId);
      elem.checkboxElement.dispatchEvent(new Event('change'));  // Need change event to update the backing setting.
    }, selectedCategoryIds);
  }
}

export async function selectMode(device: 'mobile'|'desktop') {
  const startViewHandle = await waitFor('.lighthouse-start-view-fr');
  await startViewHandle.$eval(`input[value="${device}"][name="lighthouse.device_type"]`, radioElem => {
    (radioElem as HTMLInputElement).checked = true;
    (radioElem as HTMLInputElement)
        .dispatchEvent(new Event('change'));  // Need change event to update the backing setting.
  });
}

export async function setToolbarCheckboxWithText(enabled: boolean, textContext: string) {
  const toolbarHandle = await waitFor('.lighthouse-settings-pane .toolbar');
  const label = await waitForElementWithTextContent(textContext, toolbarHandle);
  await label.evaluate((label, enabled: boolean) => {
    const rootNode = label.getRootNode() as ShadowRoot;
    const checkboxId = label.getAttribute('for') as string;
    const checkboxElem = rootNode.getElementById(checkboxId) as HTMLInputElement;
    checkboxElem.checked = enabled;
    checkboxElem.dispatchEvent(new Event('change'));  // Need change event to update the backing setting.
  }, enabled);
}

export async function setLegacyNavigation(enabled: boolean) {
  return setToolbarCheckboxWithText(enabled, 'Legacy navigation');
}

export async function setThrottlingMethod(throttlingMethod: 'simulate'|'devtools') {
  const toolbarHandle = await waitFor('.lighthouse-settings-pane .toolbar');
  await toolbarHandle.evaluate((toolbar, throttlingMethod) => {
    const selectElem = toolbar.shadowRoot?.querySelector('select') as HTMLSelectElement;
    const optionElem = selectElem.querySelector(`option[value="${throttlingMethod}"]`) as HTMLOptionElement;
    optionElem.selected = true;
    selectElem.dispatchEvent(new Event('change'));  // Need change event to update the backing setting.
  }, throttlingMethod);
}

export async function clickStartButton() {
  const panel = await waitFor('.lighthouse-start-view-fr');
  const button = await waitFor('button', panel);
  await button.click();
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAuditsBreakdown(lhr: any, flakyAudits: string[] = []) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auditResults = Object.values(lhr.audits) as any[];
  const irrelevantDisplayModes = new Set(['notApplicable', 'manual']);
  const applicableAudits = auditResults.filter(
      audit => !irrelevantDisplayModes.has(audit.scoreDisplayMode),
  );

  const informativeAudits = applicableAudits.filter(
      audit => audit.scoreDisplayMode === 'informative',
  );

  const erroredAudits = applicableAudits.filter(
      audit => audit.score === null && audit && !informativeAudits.includes(audit),
  );

  // 0.5 is the minimum score before we consider an audit "failed"
  // https://github.com/GoogleChrome/lighthouse/blob/d956ec929d2b67028279f5e40d7e9a515a0b7404/report/renderer/util.js#L27
  const failedAudits = applicableAudits.filter(
      audit => audit.score !== null && audit.score < 0.5 && !flakyAudits.includes(audit.id),
  );

  return {auditResults, erroredAudits, failedAudits};
}
