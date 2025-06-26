// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  addBreakpointForLine,
  BREAKPOINT_ITEM_SELECTOR,
  createSelectorsForWorkerFile,
  DEBUGGER_PAUSED_EVENT,
  executionLineHighlighted,
  getBreakpointDecorators,
  getOpenSources,
  openNestedWorkerFile,
  PAUSE_INDICATOR_SELECTOR,
  RESUME_BUTTON,
  retrieveTopCallFrameWithoutResuming,
  SourceFileEvents,
  THREADS_SELECTOR,
  waitForLines,
  waitForSourceFiles,
} from '../../e2e/helpers/sources-helpers.js';
import {assertNotNullOrUndefined} from '../../shared/helper.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

async function validateSourceTabs(devToolsPage: DevToolsPage) {
  const openSources = await devToolsPage.waitForFunction(async () => {
    const sources = await getOpenSources(devToolsPage);
    return sources.length ? sources : undefined;
  });
  assert.deepEqual(openSources, ['multi-workers.js']);
}

describe('Multi-Workers', function() {
  [false, true].forEach(sourceMaps => {
    const withOrWithout = sourceMaps ? 'with source maps' : 'without source maps';
    const targetPage = sourceMaps ? 'sources/multi-workers-sourcemap.html' : 'sources/multi-workers.html';
    const scriptFile = sourceMaps ? 'multi-workers.min.js' : 'multi-workers.js';
    function workerFileSelectors(workerIndex: number, inspectedPage: InspectedPage) {
      return createSelectorsForWorkerFile(
          scriptFile, 'test/e2e/resources/sources', 'multi-workers.js', workerIndex, inspectedPage);
    }

    async function validateNavigationTree(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
      await devToolsPage.waitFor(workerFileSelectors(10, inspectedPage).rootSelector);
    }

    async function validateBreakpoints(devToolsPage: DevToolsPage) {
      await waitForLines(12, devToolsPage);
      // Wait for breakpoints to be present
      await devToolsPage.waitFor('.cm-gutterElement ~ .cm-breakpoint ~ .cm-breakpoint');
      assert.deepEqual(await getBreakpointDecorators(false, 2, devToolsPage), [6, 12]);
      assert.deepEqual(await getBreakpointDecorators(true, 1, devToolsPage), [6]);
    }

    describe(`loads scripts exactly once ${withOrWithout}`, () => {
      it('but still distinguishes between the workers', async ({devToolsPage, inspectedPage}) => {
        // Have the target load the page.
        await inspectedPage.goToResource(targetPage);
        await devToolsPage.click('#tab-sources');
        await validateNavigationTree(devToolsPage, inspectedPage);
        await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);

        await inspectedPage.evaluate('workers[3].postMessage({command:"break"});');
        await devToolsPage.waitFor(RESUME_BUTTON);
        await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
        await devToolsPage.waitForFunction(async () => await devToolsPage.getPendingEvents(DEBUGGER_PAUSED_EVENT));
        await executionLineHighlighted(devToolsPage);

        // Look at source tabs
        await validateSourceTabs(devToolsPage);

        const selectedFile = workerFileSelectors(1, inspectedPage).fileSelector + '[aria-selected="true"]';
        const expandedWorker = workerFileSelectors(1, inspectedPage).rootSelector + '[aria-expanded="true"]';

        await devToolsPage.waitFor(selectedFile);
        const workers = await devToolsPage.$$(expandedWorker);
        assert.lengthOf(workers, 1);

        // Send message to a worker to a different worker to cause a different file to be
        // selected in the page tree
        await inspectedPage.evaluate('workers[5].postMessage({command:"break"});');

        // This typically happens too quickly to cause DevTools to switch to the other thread, so
        // click on the other paused thread.
        await devToolsPage.waitFor(THREADS_SELECTOR + '[aria-expanded="true"]');
        await devToolsPage.click('.thread-item:has( .thread-item-paused-state:not(:empty)):not(.selected)');

        // Now two workers are expanded
        await devToolsPage.waitFor(expandedWorker + ' ~ ' + expandedWorker);
        // And still only one source tab
        await validateSourceTabs(devToolsPage);
      });
    });

    describe(`loads scripts exactly once ${withOrWithout}`, () => {
      async function setupTest(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
        // Have the target load the page.
        await inspectedPage.goToResource(targetPage);
        await devToolsPage.click('#tab-sources');
        await validateNavigationTree(devToolsPage, inspectedPage);
        await openNestedWorkerFile(workerFileSelectors(1, inspectedPage), devToolsPage);

        // Look at source tabs
        await validateSourceTabs(devToolsPage);
      }

      it('on reload', async ({devToolsPage, inspectedPage}) => {
        await setupTest(devToolsPage, inspectedPage);

        // Reload page
        await inspectedPage.goToResource(targetPage);

        // Check workers again
        await validateNavigationTree(devToolsPage, inspectedPage);

        await validateSourceTabs(devToolsPage);
      });

      it('upon break', async ({devToolsPage, inspectedPage}) => {
        await setupTest(devToolsPage, inspectedPage);

        // Send message to a worker to trigger break
        await inspectedPage.evaluate('workers[3].postMessage({command:"break"});');

        // Validate that we are paused by locating the resume button
        await devToolsPage.waitFor(RESUME_BUTTON);

        await validateSourceTabs(devToolsPage);
      });
    });

    it(`shows exactly one breakpoint ${withOrWithout}`, async ({devToolsPage, inspectedPage}) => {
      await waitForSourceFiles(
          SourceFileEvents.SOURCE_FILE_LOADED, files => files.some(f => f.endsWith('multi-workers.js')), async () => {
            // Have the target load the page.
            await inspectedPage.goToResource(targetPage);
            await devToolsPage.click('#tab-sources');

            // Wait for all workers to load
            await validateNavigationTree(devToolsPage, inspectedPage);

            // Open file from second worker
            await openNestedWorkerFile(workerFileSelectors(2, inspectedPage), devToolsPage);
          }, devToolsPage);
      // Set a breakpoint
      await addBreakpointForLine(6, devToolsPage);

      await devToolsPage.waitFor(BREAKPOINT_ITEM_SELECTOR);
      const breakpoints = (await devToolsPage.$$(BREAKPOINT_ITEM_SELECTOR)).length;
      assert.strictEqual(breakpoints, 1);
    });

    describe(`copies breakpoints between workers ${withOrWithout}`, () => {
      async function setupBreakpoints(
          {devToolsPage, inspectedPage}: {devToolsPage: DevToolsPage, inspectedPage: InspectedPage}) {
        await waitForSourceFiles(
            SourceFileEvents.SOURCE_FILE_LOADED, files => files.some(f => f.endsWith('multi-workers.js')), async () => {
              // Have the target load the page.
              await inspectedPage.goToResource(targetPage);

              await devToolsPage.click('#tab-sources');

              // Wait for all workers to load
              await validateNavigationTree(devToolsPage, inspectedPage);

              await openNestedWorkerFile(workerFileSelectors(2, inspectedPage), devToolsPage);
            }, devToolsPage);

        await addBreakpointForLine(6, devToolsPage);

        const bpEntry = await devToolsPage.waitFor(BREAKPOINT_ITEM_SELECTOR);
        const bpCheckbox = await bpEntry?.$('input');
        assertNotNullOrUndefined(bpCheckbox);
        await bpCheckbox.click();
        await devToolsPage.waitFor('.cm-breakpoint-disabled');

        await addBreakpointForLine(12, devToolsPage);
        await validateBreakpoints(devToolsPage);
        await devToolsPage.click('[aria-label="Close multi-workers.js"]');
      }

      it('when opening different file in editor', async ({devToolsPage, inspectedPage}) => {
        await setupBreakpoints({devToolsPage, inspectedPage});

        // Open different worker
        await openNestedWorkerFile(workerFileSelectors(3, inspectedPage), devToolsPage);

        await validateBreakpoints(devToolsPage);
      });

      it('after reloading', async ({devToolsPage, inspectedPage}) => {
        await setupBreakpoints({devToolsPage, inspectedPage});

        await inspectedPage.reload();
        // FIXME(crbug/1112692): Refactor test to remove the timeout.
        await devToolsPage.timeout(100);

        await openNestedWorkerFile(workerFileSelectors(4, inspectedPage), devToolsPage);

        await devToolsPage.waitFor('.cm-breakpoint');
        await validateBreakpoints(devToolsPage);
      });
    });

    describe(`hits breakpoints added to workers ${withOrWithout}`, () => {
      setup({enabledDevToolsExperiments: ['instrumentation-breakpoints']});

      async function setupInstrumentationBreakpoints(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
        await waitForSourceFiles(
            SourceFileEvents.SOURCE_FILE_LOADED, files => files.some(f => f.endsWith('multi-workers.js')), async () => {
              // Have the target load the page.
              await inspectedPage.goToResource(targetPage);
              await devToolsPage.click('#tab-sources');
              await validateNavigationTree(devToolsPage, inspectedPage);
              await openNestedWorkerFile(workerFileSelectors(2, inspectedPage), devToolsPage);
            }, devToolsPage);

        await addBreakpointForLine(6, devToolsPage);
      }

      it('for pre-loaded workers', async ({devToolsPage, inspectedPage}) => {
        await setupInstrumentationBreakpoints(devToolsPage, inspectedPage);

        // Send message to a worker to trigger break
        await inspectedPage.evaluate('workers[5].postMessage({});');

        // Validate that we are paused by locating the resume button
        await devToolsPage.waitFor(RESUME_BUTTON);

        // Validate that the code has paused on the breakpoint at the correct script location
        assert.deepEqual(await retrieveTopCallFrameWithoutResuming(devToolsPage), 'multi-workers.js:6');

        // Look at source tabs
        await validateSourceTabs(devToolsPage);
      });

      it('for newly created workers', async ({devToolsPage, inspectedPage}) => {
        await setupInstrumentationBreakpoints(devToolsPage, inspectedPage);

        // Launch new worker to hit breakpoint
        await inspectedPage.evaluate(`new Worker('${scriptFile}').postMessage({});`);

        // Validate that we are paused by locating the resume button
        await devToolsPage.waitFor(RESUME_BUTTON);

        // Validate that the code has paused on the breakpoint at the correct script location
        assert.deepEqual(await retrieveTopCallFrameWithoutResuming(devToolsPage), 'multi-workers.js:6');

        await validateSourceTabs(devToolsPage);
      });
    });
  });
});
