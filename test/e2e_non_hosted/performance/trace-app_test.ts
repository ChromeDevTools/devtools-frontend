// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events';
import {searchForComponent} from '../helpers/performance-helpers';
import type {DevToolsPage} from '../shared/frontend-helper';
import type {InspectedPage} from '../shared/target-helper';

async function loadTrace(devToolsPage: DevToolsPage, inspectedPage: InspectedPage, resource: string) {
  // Scripts in these traces happen to fail asserts in formatter_worker.
  expectError(/ScopeParser\.js|formatter_worker\.js/);

  await devToolsPage.reloadWithParams({});
  const url = new URL(devToolsPage.page.url());
  url.pathname = url.pathname.replace('devtools_app.html', 'trace_app.html');
  url.search = '';
  const traceUrl = `${inspectedPage.getResourcesPath()}/${resource}`;
  // Can't do this because SanitizeFrontendQueryParam does not allow timeline, and when
  // the sanitized url differs from the page url workers will fail to load (like the
  // formatter worker).
  // But it's fine, Performance panel will always open because of TraceRevealer.
  // url.searchParams.set('panel', 'timeline');
  url.searchParams.set('isChromeForTesting', 'true');
  url.searchParams.set('traceURL', traceUrl);
  await devToolsPage.page.goto(url.href);

  // Wait for Performance panel to open.
  await devToolsPage.waitFor('.panel.timeline');

  // Performance and Sources.
  assert.lengthOf(await devToolsPage.$$('.tabbed-pane-header[aria-label="Main toolbar"] .tabbed-pane-header-tab'), 2);
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
  await topStackFrameLink.click();

  // Sometimes (mostly in CI) clicking does nothing. We have no idea why. Wait a
  // bit and try again.
  for (let i = 0; i < 100; i++) {
    await devToolsPage.raf();
    await devToolsPage.raf();
    const isVisible = await topStackFrameLink.evaluate(node => node.checkVisibility());
    if (!isVisible) {
      break;
    }

    await devToolsPage.timeout(500);
    await topStackFrameLink.click();
  }

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
    await loadTrace(devToolsPage, inspectedPage, 'performance/timeline/enhanced-trace.json.gz');
    // This is a function on a firebase script that has sourcemaps.
    await searchAndClickOnStackTrace(
        devToolsPage, 'createUserTimingTrace', 'createUserTimingTrace', 'oob_resources_service.ts:83:10');
  });

  it('linkifies function calls from inline scripts in HTML', async ({devToolsPage, inspectedPage}) => {
    await loadTrace(devToolsPage, inspectedPage, 'performance/timeline/enhanced-trace.json.gz');
    // This is a function from an inline script in the HTML. Please excuse the Paul humor.
    await searchAndClickOnStackTrace(devToolsPage, 'pooopInTheTrace', 'pooopInTheTrace', '(index):399:26');
  });

  it('linkifies to CSS resources', async ({devToolsPage, inspectedPage}) => {
    await loadTrace(devToolsPage, inspectedPage, 'performance/timeline/enhanced-trace.json.gz');
    await searchAndClickOnStackTrace(
        devToolsPage, 'fonts.googleapis.com', '/* latin */',
        'css?family=PT+Serif:regular,italic,bold|PT+Sans:regular,italic,bold|Droid+Sans:400,700|Lato:700,900');
  });
});
