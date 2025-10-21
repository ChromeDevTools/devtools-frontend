// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events';
import {searchForComponent} from '../../e2e/helpers/performance-helpers';
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

describe('trace_app.html', function() {
  setup({dockingMode: 'undocked'});
  if (this.timeout() > 0) {
    this.timeout(60000);
  }

  it('linkifies source mapped function calls', async ({devToolsPage, inspectedPage}) => {
    await loadTrace(devToolsPage, inspectedPage, 'performance/timeline/enhanced-trace.json.gz');

    // This is a function on a firebase script that has sourcemaps.
    await searchForComponent('createUserTimingTrace', devToolsPage);
    await devToolsPage.raf();
    await devToolsPage.timeout(3000);

    const topStackFrameLink =
        await devToolsPage.$('.devtools-link', await devToolsPage.$('.timeline-details-stack-values'));
    assert.isOk(topStackFrameLink);
    assert.strictEqual(await topStackFrameLink.evaluate(el => el.textContent), 'oob_resources_service.ts:83:10');
    await topStackFrameLink.click();

    // Sometimes (mostly in CI) clicking does nothing. We have no idea why. Wait a
    // bit and try again.
    for (let i = 0; i < 10; i++) {
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
    assert.include(await devToolsPage.getTextContent('.cm-highlightedLine'), 'createUserTimingTrace');
  });
});
