// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import {loadExtension} from '../../e2e/helpers/extension-helpers.js';
import {
  getToolbarText,
  openFileInSourcesPanel,
  SourceFileEvents,
  waitForHighlightedLine,
  waitForSourceFiles,
} from '../../e2e/helpers/sources-helpers.js';

describe('The Extension API', () => {
  it('can open wasm resources with offset', async ({devToolsPage, inspectedPage}) => {
    await waitForSourceFiles(
        SourceFileEvents.ADDED_TO_SOURCE_TREE, files => files.some(f => f.endsWith('scopes.wasm')),
        () => openFileInSourcesPanel('wasm/scopes.html', devToolsPage, inspectedPage), devToolsPage);
    const extension = await loadExtension('TestExtension', undefined, undefined, devToolsPage, inspectedPage);
    const resource = `${inspectedPage.getResourcesPath()}/sources/wasm/scopes.wasm`;

    await extension.waitForFunction(async (resource: string) => {
      const resources =
          await new Promise<Chrome.DevTools.Resource[]>(r => window.chrome.devtools.inspectedWindow.getResources(r));
      return resources.find(r => r.url === resource);
    }, undefined, resource);

    // Accepts a wasm offset as column
    await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 0, 0x4b), resource);
    await waitForHighlightedLine(0x4b, devToolsPage);

    // Selects the right wasm line on an inexact match
    await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 0, 0x4e), resource);
    await waitForHighlightedLine(0x4d, devToolsPage);

    // Accepts a missing columnNumber
    await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 0), resource);
    await waitForHighlightedLine(0, devToolsPage);

    // Accepts a wasm offset as column and a callback
    {
      const r = await extension.evaluate(
          resource => new Promise(r => window.chrome.devtools.panels.openResource(resource, 0, 0x4b, () => r(1))),
          resource);
      assert.deepEqual(r, 1);
    }
    await waitForHighlightedLine(0x4b, devToolsPage);

    // Is backwards compatible: accepts a callback with a missing columnNumber
    {
      const r = await extension.evaluate(
          // @ts-expect-error Legacy API
          resource => new Promise(r => window.chrome.devtools.panels.openResource(resource, 0, () => r(1))), resource);
      assert.deepEqual(r, 1);
    }
    await waitForHighlightedLine(0, devToolsPage);
  });

  it('can open page resources with column numbers', async ({devToolsPage, inspectedPage}) => {
    const resource = `${inspectedPage.getResourcesPath()}/sources/wasm/scopes.html`;
    await waitForSourceFiles(
        SourceFileEvents.ADDED_TO_SOURCE_TREE, files => files.some(f => f.endsWith('scopes.wasm')),
        () => openFileInSourcesPanel('wasm/scopes.html', devToolsPage, inspectedPage), devToolsPage);

    const extension = await loadExtension('TestExtension', undefined, undefined, devToolsPage, inspectedPage);

    await extension.waitForFunction(async (resource: string) => {
      const resources =
          await new Promise<Chrome.DevTools.Resource[]>(r => window.chrome.devtools.inspectedWindow.getResources(r));
      return resources.find(r => r.url === resource);
    }, undefined, resource);

    // Accepts a missing columnNumber
    await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 2), resource);
    await waitForHighlightedLine(3, devToolsPage);

    // Accepts a column number
    {
      await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 29, 160), resource);
      await waitForHighlightedLine(30, devToolsPage);
      const toolbarText = await getToolbarText(devToolsPage);
      assert.isTrue(toolbarText.includes('Line 30, Column 161'));
    }

    // Accepts a column number and a callback
    {
      const r = await extension.evaluate(
          resource => new Promise(r => window.chrome.devtools.panels.openResource(resource, 1, 2000, () => r(1))),
          resource);
      assert.deepEqual(r, 1);
      await waitForHighlightedLine(2, devToolsPage);
      const toolbarText = await getToolbarText(devToolsPage);
      // Column 38 is the last column in the 2nd line.
      assert.isTrue(toolbarText.includes('Line 2, Column 38'));
    }

    // Is backwards compatible: accepts a callback with a missing columnNumber
    {
      const r = await extension.evaluate(
          // @ts-expect-error Legacy API
          resource => new Promise(r => window.chrome.devtools.panels.openResource(resource, 2, () => r(1))), resource);
      assert.deepEqual(r, 1);
      await waitForHighlightedLine(3, devToolsPage);
    }
  });
});
