// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {type Chrome} from '../../../extension-api/ExtensionAPI.js';
import {loadExtension} from '../helpers/extension-helpers.js';
import {
  waitForHighlightedLine,
  getToolbarText,
  waitForSourceFiles,
  SourceFileEvents,
  openFileInSourcesPanel,
} from '../helpers/sources-helpers.js';

import {getResourcesPath} from '../../shared/helper.js';

describe('The Extension API', () => {
  it('can open wasm resources with offset', async () => {
    await waitForSourceFiles(
        SourceFileEvents.ADDED_TO_SOURCE_TREE, files => files.some(f => f.endsWith('scopes.wasm')),
        () => openFileInSourcesPanel('wasm/scopes.html'));
    const extension = await loadExtension('TestExtension');
    const resource = `${getResourcesPath()}/sources/wasm/scopes.wasm`;

    await extension.waitForFunction(async (resource: string) => {
      const resources =
          await new Promise<Chrome.DevTools.Resource[]>(r => window.chrome.devtools.inspectedWindow.getResources(r));
      return resources.find(r => r.url === resource);
    }, undefined, resource);

    // Accepts a wasm offset as column
    await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 0, 0x4b), resource);
    await waitForHighlightedLine(0x4b);

    // Selects the right wasm line on an inexact match
    await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 0, 0x4e), resource);
    await waitForHighlightedLine(0x4d);

    // Accepts a missing columnNumber
    await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 0), resource);
    await waitForHighlightedLine(0);

    // Accepts a wasm offset as column and a callback
    {
      const r = await extension.evaluate(
          resource => new Promise(r => window.chrome.devtools.panels.openResource(resource, 0, 0x4b, () => r(1))),
          resource);
      assert.deepEqual(r, 1);
    }
    await waitForHighlightedLine(0x4b);

    // Is backwards compatible: accepts a callback with a missing columnNumber
    {
      const r = await extension.evaluate(
          // @ts-expect-error Legacy API
          resource => new Promise(r => window.chrome.devtools.panels.openResource(resource, 0, () => r(1))), resource);
      assert.deepEqual(r, 1);
    }
    await waitForHighlightedLine(0);
  });

  it('can open page resources with column numbers', async () => {
    const resource = `${getResourcesPath()}/sources/wasm/scopes.html`;
    await waitForSourceFiles(
        SourceFileEvents.ADDED_TO_SOURCE_TREE, files => files.some(f => f.endsWith('scopes.wasm')),
        () => openFileInSourcesPanel('wasm/scopes.html'));

    const extension = await loadExtension('TestExtension');

    await extension.waitForFunction(async (resource: string) => {
      const resources =
          await new Promise<Chrome.DevTools.Resource[]>(r => window.chrome.devtools.inspectedWindow.getResources(r));
      return resources.find(r => r.url === resource);
    }, undefined, resource);

    // Accepts a missing columnNumber
    await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 2), resource);
    await waitForHighlightedLine(3);

    // Accepts a column number
    {
      await extension.evaluate(resource => window.chrome.devtools.panels.openResource(resource, 29, 160), resource);
      await waitForHighlightedLine(30);
      const toolbarText = await getToolbarText();
      assert.isTrue(toolbarText.includes('Line 30, Column 161'));
    }

    // Accepts a column number and a callback
    {
      const r = await extension.evaluate(
          resource => new Promise(r => window.chrome.devtools.panels.openResource(resource, 1, 2000, () => r(1))),
          resource);
      assert.deepEqual(r, 1);
      await waitForHighlightedLine(2);
      const toolbarText = await getToolbarText();
      assert.isTrue(toolbarText.includes('Line 2, Column 60'));
    }

    // Is backwards compatible: accepts a callback with a missing columnNumber
    {
      const r = await extension.evaluate(
          // @ts-expect-error Legacy API
          resource => new Promise(r => window.chrome.devtools.panels.openResource(resource, 2, () => r(1))), resource);
      assert.deepEqual(r, 1);
      await waitForHighlightedLine(3);
    }
  });
});
