// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import {loadExtension} from '../helpers/extension-helpers.js';
import {
  getToolbarText,
  openFileInSourcesPanel,
  SourceFileEvents,
  waitForHighlightedLine,
  waitForSourceFiles,
} from '../helpers/sources-helpers.js';

describe('The Extension API', () => {
  it('can open wasm resources with offset', async ({devToolsPage, inspectedPage}) => {
    await waitForSourceFiles(devToolsPage, SourceFileEvents.ADDED_TO_SOURCE_TREE,
                             files => files.some(f => f.endsWith('scopes.wasm')),
                             () => openFileInSourcesPanel(devToolsPage, inspectedPage, 'wasm/scopes.html'));
    const extension = await loadExtension(devToolsPage, inspectedPage, 'TestExtension', undefined, undefined);
    const resource = `${inspectedPage.getResourcesPath()}/sources/wasm/scopes.wasm`;

    await extension.waitForFunction(async (resource: string) => {
      const resources =
          await new Promise<Chrome.DevTools.Resource[]>(r => window.chrome.devtools.inspectedWindow.getResources(r));
      return resources.find(r => r.url === resource);
    }, undefined, resource);

    // Accepts a wasm offset as column
    await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 0, 0x4b), resource);
    await waitForHighlightedLine(devToolsPage, 0x4b);

    // Selects the right wasm line on an inexact match
    await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 0, 0x4e), resource);
    await waitForHighlightedLine(devToolsPage, 0x4d);

    // Accepts a missing columnNumber
    await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 0), resource);
    await waitForHighlightedLine(devToolsPage, 0);

    // Accepts a wasm offset as column and a callback
    {
      const r = await extension.evaluate(
          resource => new Promise(r => window.chrome.devtools.panels.openResource(resource, 0, 0x4b, () => r(1))),
          resource);
      assert.deepEqual(r, 1);
    }
    await waitForHighlightedLine(devToolsPage, 0x4b);

    // Accepts a callback with an explicitly undefined columnNumber
    {
      const r = await extension.evaluate(
          resource =>
              new Promise(r => window.chrome.devtools.panels.openResource(
                              resource, /* lineNumber */ 0, /* columnNumber */ undefined, /* callback */ () => r(1))),
          resource);
      assert.deepEqual(r, 1);
    }
    await waitForHighlightedLine(devToolsPage, 0);

    // Is backwards compatible for JavaScript callers: accepts a callback with a missing `columnNumber`
    {
      const r = await extension.evaluate(resource => new Promise(r => {
                                           // Cast to `any` is required to bypass TypeScript compiler errors.
                                           // We are verifying the legacy runtime behavior for JavaScript callers
                                           // who skip the `columnNumber` argument, which is no longer statically
                                           // allowed in TypeScript.
                                           // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                           (window.chrome.devtools.panels as any)
                                               .openResource(resource, /* lineNumber */ 0, /* callback */ () => r(1));
                                         }),
                                         resource);
      assert.deepEqual(r, 1);
    }
    await waitForHighlightedLine(devToolsPage, 0);
  });

  it('can open page resources with column numbers', async ({devToolsPage, inspectedPage}) => {
    const resource = `${inspectedPage.getResourcesPath()}/sources/wasm/scopes.html`;
    await waitForSourceFiles(devToolsPage, SourceFileEvents.ADDED_TO_SOURCE_TREE,
                             files => files.some(f => f.endsWith('scopes.wasm')),
                             () => openFileInSourcesPanel(devToolsPage, inspectedPage, 'wasm/scopes.html'));

    const extension = await loadExtension(devToolsPage, inspectedPage, 'TestExtension', undefined, undefined);

    await extension.waitForFunction(async (resource: string) => {
      const resources =
          await new Promise<Chrome.DevTools.Resource[]>(r => window.chrome.devtools.inspectedWindow.getResources(r));
      return resources.find(r => r.url === resource);
    }, undefined, resource);

    // Accepts a missing columnNumber
    await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 2), resource);
    await waitForHighlightedLine(devToolsPage, 3);

    // Accepts a column number
    {
      await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 29, 160), resource);
      await waitForHighlightedLine(devToolsPage, 30);
      const toolbarText = await getToolbarText(devToolsPage);
      assert.isTrue(toolbarText.includes('Line 30, column 161'));
    }

    // Accepts a column number and a callback
    {
      const r = await extension.evaluate(
          resource => new Promise(r => window.chrome.devtools.panels.openResource(resource, 1, 2000, () => r(1))),
          resource);
      assert.deepEqual(r, 1);
      await waitForHighlightedLine(devToolsPage, 2);
      const toolbarText = await getToolbarText(devToolsPage);
      // Column 38 is the last column in the 2nd line.
      assert.isTrue(toolbarText.includes('Line 2, column 38'));
    }

    // Accepts a callback with an explicitly undefined columnNumber
    {
      const r = await extension.evaluate(
          resource =>
              new Promise(r => window.chrome.devtools.panels.openResource(
                              resource, /* lineNumber */ 2, /* columnNumber */ undefined, /* callback */ () => r(1))),
          resource);
      assert.deepEqual(r, 1);
      await waitForHighlightedLine(devToolsPage, 3);
    }

    // Is backwards compatible for JavaScript callers: accepts a callback with a missing `columnNumber`
    {
      const r = await extension.evaluate(resource => new Promise(r => {
                                           // Cast to `any` is required to bypass TypeScript compiler errors.
                                           // We are verifying the legacy runtime behavior for JavaScript callers
                                           // who skip the `columnNumber` argument, which is no longer statically
                                           // allowed in TypeScript.
                                           // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                           (window.chrome.devtools.panels as any)
                                               .openResource(resource, /* lineNumber */ 2, /* callback */ () => r(1));
                                         }),
                                         resource);
      assert.deepEqual(r, 1);
      await waitForHighlightedLine(devToolsPage, 3);
    }
  });
});
