// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {
  getBrowserAndPages,
  waitFor,
  waitForElementWithTextContent,
} from '../../shared/helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

import {getQuotaUsage, waitForQuotaUsage} from './application-helpers.js';
import {openCommandMenu} from './quick_open-helpers.js';

export async function navigateToLighthouseTab(
    path?: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage = getBrowserAndPagesWrappers().inspectedPage): Promise<ElementHandle<Element>> {
  await openCommandMenu(devToolsPage);
  await devToolsPage.typeText('Lighthouse');
  await devToolsPage.page.keyboard.press('Enter');
  await devToolsPage.waitFor('.view-container > .lighthouse');

  if (path) {
    await inspectedPage.bringToFront();
    await inspectedPage.goToResource(path);
    await devToolsPage.bringToFront();
  }

  return await devToolsPage.waitFor('.lighthouse-start-view');
}

// Instead of watching the worker or controller/panel internals, we wait for the Lighthouse renderer
// to create the new report DOM. And we pull the LHR and artifacts off the lh-root node.
export async function waitForResult(
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage = getBrowserAndPagesWrappers().inspectedPage) {
  // Ensure the target page is in front so the Lighthouse run can finish.
  await inspectedPage.bringToFront();

  await devToolsPage.waitForFunction(() => {
    return devToolsPage.evaluate(`(async () => {
      const Lighthouse = await import('./panels/lighthouse/lighthouse.js');
      return Lighthouse.LighthousePanel.LighthousePanel.instance().reportSelector.hasItems();
    })()`);
  });

  // Bring the DT frontend back in front to render the Lighthouse report.
  await devToolsPage.bringToFront();

  const reportEl = await devToolsPage.waitFor('.lh-root');
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
}

// Can't reference UIUtils.CheckboxLabel inside e2e tests
type CheckboxLabel = Element&{checked: boolean};

/**
 * Set the category checkboxes
 * @param selectedCategoryIds One of 'performance'|'accessibility'|'best-practices'|'seo'|'pwa'
 */
export async function selectCategories(
    selectedCategoryIds: string[], devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const startViewHandle = await devToolsPage.waitFor('.lighthouse-start-view');
  const checkboxHandles = await startViewHandle.$$('devtools-checkbox');
  for (const checkboxHandle of checkboxHandles) {
    await checkboxHandle.evaluate((dtCheckboxElem, selectedCategoryIds: string[]) => {
      const elem = dtCheckboxElem as CheckboxLabel;
      const categoryId = elem.getAttribute('data-lh-category') || '';
      elem.checked = selectedCategoryIds.includes(categoryId);
      elem.dispatchEvent(new Event('change'));  // Need change event to update the backing setting.
    }, selectedCategoryIds);
  }
}

export async function selectRadioOption(
    value: string, optionName: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const startViewHandle = await devToolsPage.waitFor('.lighthouse-start-view');
  await startViewHandle.$eval(`input[value="${value}"][name="${optionName}"]`, radioElem => {
    (radioElem as HTMLInputElement).checked = true;
    (radioElem as HTMLInputElement)
        .dispatchEvent(new Event('change'));  // Need change event to update the backing setting.
  });
}

export async function selectMode(
    mode: 'navigation'|'timespan'|'snapshot', devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await selectRadioOption(mode, 'lighthouse.mode', devToolsPage);
}

export async function selectDevice(device: 'mobile'|'desktop') {
  await selectRadioOption(device, 'lighthouse.device-type');
}

export async function setToolbarCheckboxWithText(enabled: boolean, textContext: string) {
  const toolbarHandle = await waitFor('.lighthouse-settings-pane .lighthouse-settings-toolbar');
  const label = await waitForElementWithTextContent(textContext, toolbarHandle);
  await label.evaluate((label, enabled: boolean) => {
    const rootNode = label.getRootNode() as ShadowRoot;
    const checkboxId = label.getAttribute('for') as string;
    const checkboxElem = rootNode.getElementById(checkboxId) as HTMLInputElement;
    checkboxElem.checked = enabled;
    checkboxElem.dispatchEvent(new Event('change'));  // Need change event to update the backing setting.
  }, enabled);
}

export async function setThrottlingMethod(throttlingMethod: 'simulate'|'devtools') {
  const toolbarHandle = await waitFor('.lighthouse-settings-pane .lighthouse-settings-toolbar');
  await toolbarHandle.evaluate((toolbar, throttlingMethod) => {
    const selectElem = toolbar.querySelector('select')!;
    const optionElem = selectElem.querySelector(`option[value="${throttlingMethod}"]`) as HTMLOptionElement;
    optionElem.selected = true;
    selectElem.dispatchEvent(new Event('change'));  // Need change event to update the backing setting.
  }, throttlingMethod);
}

export async function clickStartButton(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click('.lighthouse-start-view devtools-button');
}

export async function isGenerateReportButtonDisabled(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const buttonContainer = await devToolsPage.waitFor<HTMLElement>('.lighthouse-start-button-container');
  const button = await devToolsPage.waitFor('button', buttonContainer);
  return await button.evaluate(element => element.hasAttribute('disabled'));
}

export async function getHelpText(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const helpTextHandle = await devToolsPage.waitFor('.lighthouse-start-view .lighthouse-help-text');
  return await helpTextHandle.evaluate(helpTextEl => helpTextEl.textContent);
}

export async function openStorageView(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click('#tab-resources');
  await devToolsPage.waitFor('.storage-group-list-item');
  await devToolsPage.click('[aria-label="Storage"]');
}

export async function clearSiteData(
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage = getBrowserAndPagesWrappers().inspectedPage) {
  await inspectedPage.goToResource('empty.html');
  await openStorageView(devToolsPage);
  await devToolsPage.waitForFunction(async () => {
    await devToolsPage.click('#storage-view-clear-button');
    return (await getQuotaUsage(devToolsPage)) === 0;
  });
}

export async function waitForStorageUsage(
    p: (quota: number) => boolean, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await openStorageView(devToolsPage);
  await waitForQuotaUsage(p, devToolsPage);
  await devToolsPage.click('#tab-lighthouse');
}

export async function waitForTimespanStarted() {
  await waitForElementWithTextContent('Timespan started');
}

export async function endTimespan() {
  const endTimespanBtn = await waitForElementWithTextContent('End timespan');
  await endTimespanBtn.click();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAuditsBreakdown(lhr: any, flakyAudits: string[] = []) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auditResults = Object.values<any>(lhr.audits);
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

export async function getTargetViewport(inspectedPage = getBrowserAndPagesWrappers().inspectedPage) {
  return await inspectedPage.evaluate(() => ({
                                        innerHeight: window.innerHeight,
                                        innerWidth: window.innerWidth,
                                        outerWidth: window.outerWidth,
                                        outerHeight: window.outerHeight,
                                        devicePixelRatio: window.devicePixelRatio,
                                      }));
}

export async function getServiceWorkerCount() {
  const {target} = await getBrowserAndPages();
  return await target.evaluate(async () => {
    return (await navigator.serviceWorker.getRegistrations()).length;
  });
}

export async function registerServiceWorker() {
  const {target} = getBrowserAndPages();
  await target.evaluate(async () => {
    // @ts-expect-error Custom function added to global scope.
    await window.registerServiceWorker();
  });
  assert.strictEqual(await getServiceWorkerCount(), 1);
}

export async function interceptNextFileSave(): Promise<() => Promise<string>> {
  const {frontend} = await getBrowserAndPages();
  await frontend.evaluate(() => {
    // @ts-expect-error
    const original = InspectorFrontendHost.save;
    const nextFilePromise = new Promise(resolve => {
      // @ts-expect-error
      InspectorFrontendHost.save = (_, content) => {
        resolve(content);
      };
    });
    void nextFilePromise.finally(() => {
      // @ts-expect-error
      InspectorFrontendHost.save = original;
    });
    // @ts-expect-error
    window.__nextFile = nextFilePromise;
  });

  // @ts-expect-error
  return () => frontend.evaluate(() => window.__nextFile);
}

export async function renderHtmlInIframe(html: string) {
  const {target} = getBrowserAndPages();
  return (await target.evaluateHandle(async html => {
           const iframe = document.createElement('iframe');
           iframe.srcdoc = html;
           document.documentElement.append(iframe);
           await new Promise(resolve => iframe.addEventListener('load', resolve));
           return iframe.contentDocument;
         }, html)).asElement() as ElementHandle<Document>;
}
