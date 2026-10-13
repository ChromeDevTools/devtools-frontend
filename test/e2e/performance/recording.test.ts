// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  getTotalTimeFromSummary,
  increaseTimeoutForPerfPanel,
  navigateToPerformanceTab,
  reloadAndRecord,
  startRecording,
  stopRecording,
  uploadTraceFile,
} from '../helpers/performance-helpers.js';
import {runCommandWithQuickOpen} from '../helpers/quick_open-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';

async function getDeveloperResourceRows(devToolsPage: DevToolsPage, urlFragment: string): Promise<string[][]> {
  const canvas = await devToolsPage.waitFor('canvas.flame-chart-canvas');
  await devToolsPage.waitForFunction(async () => {
    const height = await canvas.evaluate(elem => elem.clientHeight);
    return height > 200;
  });

  await runCommandWithQuickOpen(devToolsPage, 'Show Developer resources');
  const resourcesGrid = await devToolsPage.waitFor('.developer-resource-view-results');
  return await devToolsPage.waitForFunction(async () => {
    const rows = await devToolsPage.$$('.data-grid-data-grid-node', resourcesGrid);
    const matches: string[][] = [];
    for (const row of rows) {
      const cells = await devToolsPage.getAllTextContents('td', row);
      if (cells[1]?.includes(urlFragment)) {
        matches.push(cells.map(c => c?.trim() ?? ''));
      }
    }
    return matches.length > 0 ? matches : undefined;
  });
}

describe('The Performance panel', function() {
  setup({dockingMode: 'undocked'});
  increaseTimeoutForPerfPanel(this);

  it('supports the user manually starting and stopping a recording', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab(devToolsPage, inspectedPage, 'empty');

    await startRecording(devToolsPage);
    await stopRecording(devToolsPage);
    await devToolsPage.waitForFunction(async () => {
      const totalTime = await getTotalTimeFromSummary(devToolsPage);
      return totalTime > 0;
    });
  });

  it('can reload and record a trace', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab(devToolsPage, inspectedPage, 'fake-website');
    await reloadAndRecord(devToolsPage);

    await devToolsPage.waitForFunction(async () => {
      const totalTime = await getTotalTimeFromSummary(devToolsPage);
      return totalTime > 0;
    });
  });

  it('can import a stored trace file', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab(devToolsPage, inspectedPage, 'empty');
    await uploadTraceFile(devToolsPage, 'test/e2e/resources/performance/timeline/web.dev-trace.json.gz');
    const canvas = await devToolsPage.waitFor('canvas.flame-chart-canvas');
    // Check that we have rendered the timeline canvas.
    await devToolsPage.waitForFunction(async () => {
      const height = await canvas.evaluate(elem => elem.clientHeight);
      return height > 200;
    });
  });

  it('enforces the inspected page CSP when loading source maps for detached frames',
     async ({devToolsPage, inspectedPage}) => {
       const expectedCdpError = expectError(/Request Network\.loadNetworkResource failed.*CSP violation/);
       const expectedSourceMapError = expectError(/Could not load content for|JSHandle@error/);
       try {
         await navigateToPerformanceTab(devToolsPage, inspectedPage, 'frame-metrics/index');
         await inspectedPage.evaluate(() => {
           const meta = document.createElement('meta');
           meta.httpEquiv = 'Content-Security-Policy';
           meta.content = 'default-src \'self\'; script-src \'self\' \'unsafe-inline\'; connect-src \'none\'';
           document.head.appendChild(meta);
         });

         await startRecording(devToolsPage);
         await inspectedPage.evaluate(async () => {
           const iframe = document.querySelector('iframe');
           const iframeDoc = iframe?.contentDocument;
           if (!iframe || !iframeDoc) {
             throw new Error('Expected iframe to be present');
           }
           // Load an existing script that references sourcemap-stepping.map so that if CSP
           // or host-bindings blocking failed, the source map load would succeed with 200 OK.
           const script = iframeDoc.createElement('script');
           script.src = new URL('../../sources/sourcemap-stepping-target.js', iframeDoc.location.href).href;
           await new Promise<void>((resolve, reject) => {
             script.addEventListener('load', () => resolve(), {once: true});
             script.addEventListener('error', () => reject(new Error('Failed to load script in iframe')), {once: true});
             iframeDoc.head.appendChild(script);
           });
           iframe.remove();
         });
         await stopRecording(devToolsPage);

         const matchingRows = await getDeveloperResourceRows(devToolsPage, '/sourcemap-stepping.map');
         assert.lengthOf(matchingRows, 1);
         assert.strictEqual(matchingRows[0][0], 'Failure');
         assert.strictEqual(matchingRows[0][5], 'CSP violation');
       } finally {
         expectedCdpError.drop();
         expectedSourceMapError.drop();
       }
     });

  it('does not load source maps for cross-origin detached frames', async ({devToolsPage, inspectedPage}) => {
    const expectedSourceMapError = expectError(/Could not load content for|JSHandle@error/);
    try {
      await navigateToPerformanceTab(devToolsPage, inspectedPage, 'frame-metrics/index');

      await startRecording(devToolsPage);
      await inspectedPage.evaluate(async () => {
        const iframe = document.querySelector('iframe');
        if (!iframe) {
          throw new Error('Expected iframe to be present');
        }
        // Point to an existing source map resource on the local test server so that if
        // PageResourceLoader loaded it under mainFrame.id or host bindings, it would succeed.
        const sourceMapUrl = new URL('../../sources/sourcemap-stepping.map', window.location.href).href;
        const html = `<script>window.__work = 1;\n//# sourceMappingURL=${sourceMapUrl}</script>`;
        await new Promise<void>(resolve => {
          iframe.addEventListener('load', () => resolve(), {once: true});
          iframe.src = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
        });
        iframe.remove();
      });
      await stopRecording(devToolsPage);

      const matchingRows = await getDeveloperResourceRows(devToolsPage, '/sourcemap-stepping.map');
      assert.lengthOf(matchingRows, 1);
      assert.strictEqual(matchingRows[0][0], 'Failure');
      assert.strictEqual(matchingRows[0][5], 'Can’t load resource for an unavailable cross-origin frame');
    } finally {
      expectedSourceMapError.drop();
    }
  });
});
