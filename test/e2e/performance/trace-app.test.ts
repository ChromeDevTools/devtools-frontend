// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'node:path';

import {expectError} from '../../conductor/events.js';
import {GEN_DIR} from '../../conductor/paths.js';
import {
  loadTraceAndWaitToFullyRender,
  navigateToPerformanceTab,
  searchForComponent
} from '../helpers/performance-helpers.js';
import {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

async function loadEnhancedTrace(
    devToolsPage: DevToolsPage, inspectedPage: InspectedPage, resource: string): Promise<DevToolsPage> {
  // Scripts in these traces happen to fail asserts in formatter_worker.
  expectError(/ScopeParser\.js|formatter_worker\.js/);

  await navigateToPerformanceTab(undefined, devToolsPage, inspectedPage);

  const uploadProfileHandle = await devToolsPage.waitFor('input[type=file]');
  const tracePath = path.join(GEN_DIR, 'test/e2e/resources', resource);

  // Open the popup and wait for the target to be created.
  const [newTarget] = await Promise.all([
    devToolsPage.page.browserContext().waitForTarget(target => target.url().includes('trace_app.html')),
    uploadProfileHandle.uploadFile(tracePath),
  ]);

  const newPage = await newTarget.page();
  if (!newPage) {
    throw new Error('Failed to get page from trace_app target');
  }

  // Wrap the new page in DevToolsPage.
  const tracePage = new DevToolsPage(newPage);

  // Wait for Performance panel to open in the popup.
  // This creates a race condition where the event for
  // `traceload` has already happened so check the panel as well.
  await loadTraceAndWaitToFullyRender(tracePage, async () => {}, true);

  // Performance and Sources.
  assert.lengthOf(await tracePage.$$('.tabbed-pane-header[aria-label="Main toolbar"] .tabbed-pane-header-tab'), 2);

  return tracePage;
}

async function searchAndClickOnStackTrace(
    devToolsPage: DevToolsPage, searchTerm: string, expectedHighlightedContent: string,
    expectedSourceLocation: string) {
  // This is a function on a firebase script that has sourcemaps.
  await searchForComponent(searchTerm, devToolsPage);
  await devToolsPage.raf();
  await devToolsPage.timeout(3000);

  // Prefer stack trace if present.
  const containerEl =
      await devToolsPage.$('.timeline-details-stack-values') ?? await devToolsPage.$('.timeline-details-view');
  assert.isOk(containerEl);

  const topStackFrameLink = await devToolsPage.$('.devtools-link', containerEl);
  assert.isOk(topStackFrameLink);
  assert.strictEqual(await topStackFrameLink.evaluate(el => el.textContent), expectedSourceLocation);

  await devToolsPage.click('.devtools-link', {root: containerEl});

  // Now we're in the Sources panel.
  await devToolsPage.waitFor('.cm-content');
  await devToolsPage.waitFor('.cm-highlightedLine');
  assert.include(await devToolsPage.getTextContent('.cm-highlightedLine'), expectedHighlightedContent);
}

describe('trace_app.html', function() {
  setup({dockingMode: 'undocked'});
  if (this.timeout() > 0) {
    this.timeout(60000);
  }

  it('linkifies source mapped function calls', async ({devToolsPage, inspectedPage}) => {
    const framePage =
        await loadEnhancedTrace(devToolsPage, inspectedPage, 'performance/timeline/enhanced-trace.json.gz');
    // This is a function on a firebase script that has sourcemaps.
    await searchAndClickOnStackTrace(
        framePage, 'createUserTimingTrace', 'createUserTimingTrace', 'oob_resources_service.ts:83:10');
  });

  it('linkifies function calls from inline scripts in HTML', async ({devToolsPage, inspectedPage}) => {
    const framePage =
        await loadEnhancedTrace(devToolsPage, inspectedPage, 'performance/timeline/enhanced-trace.json.gz');
    // This is a function from an inline script in the HTML. Please excuse the Paul humor.
    await searchAndClickOnStackTrace(framePage, 'pooopInTheTrace', 'pooopInTheTrace', '(index):399:26');
  });

  it('linkifies to CSS resources', async ({devToolsPage, inspectedPage}) => {
    const framePage =
        await loadEnhancedTrace(devToolsPage, inspectedPage, 'performance/timeline/enhanced-trace.json.gz');
    await searchAndClickOnStackTrace(
        framePage, 'fonts.googleapis.com', '/* latin */',
        'css?family=PT+Serif:regular,italic,bold|PT+Sans:regular,italic,bold|Droid+Sans:400,700|Lato:700,900');
  });
});
