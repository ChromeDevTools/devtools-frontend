// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  expandFileTree,
  type NestedFileSelector,
  openFileInSourcesPanel,
  readSourcesTreeView,
  SourceFileEvents,
  waitForSourceFiles,
} from '../helpers/sources-helpers.js';

function createSelectorsForFile(domainName: string, folderName: string, fileName: string): NestedFileSelector {
  const rootSelector = '.navigator-frame-tree-item[aria-label="top, frame"]';
  const domainSelector = `${rootSelector} + ol > [aria-label="${domainName}, domain"]`;
  const folderSelector = `${domainSelector} + ol > [aria-label^="${folderName}, "]`;
  const fileSelector = `${folderSelector} + ol > [aria-label="${fileName}, file"]`;

  return {
    rootSelector,
    domainSelector,
    folderSelector,
    fileSelector,
  };
}

describe('The Sources Tab', () => {
  it('resolves relative sourceURL annotations correctly', async ({devToolsPage, inspectedPage}) => {
    const domainName = inspectedPage.getResourcesPath().split('/')[2];
    await openFileInSourcesPanel(devToolsPage, inspectedPage, 'sourceurl.html');
    await expandFileTree(devToolsPage, createSelectorsForFile(domainName, 'test/e2e/resources/sources', 'eval.js'));
    await expandFileTree(devToolsPage, createSelectorsForFile(domainName, 'test/e2e/resources/sources', 'inline.js'));
  });

  it('retains absolute webpack:/// and webpack-internal:/// sourceURL annotations',
     async ({devToolsPage, inspectedPage}) => {
       await openFileInSourcesPanel(devToolsPage, inspectedPage, 'sourceurl.html');
       await expandFileTree(devToolsPage, createSelectorsForFile('webpack://', 'src', 'index.js'));
       await expandFileTree(devToolsPage,
                            createSelectorsForFile('webpack-internal://', '(webpack-dev-server)', 'generated.js'));
     });

  it('shows dynamically added scripts and sourceURL annotations when loaded with Sources open',
     async ({devToolsPage, inspectedPage}) => {
       const domainName = inspectedPage.getResourcesPath().split('/')[2];
       await openFileInSourcesPanel(devToolsPage, inspectedPage, 'inline-css.html');

       let evaluatedTypes: Record<string, string> = {};
       await waitForSourceFiles(
           devToolsPage, SourceFileEvents.ADDED_TO_SOURCE_TREE,
           files => files.some(f => f.endsWith('/click-breakpoint.js')) &&
               files.some(f => f.endsWith('/evalSourceURL.js')) &&
               files.some(f => f.endsWith('/scriptElementContentSourceURL.js')),
           async () => {
             evaluatedTypes = await inspectedPage.evaluate(async () => {
               const appendDynamicScriptElement = (src: string, content?: string) => {
                 const scriptElement = document.createElement('script');
                 if (src) {
                   return new Promise<void>((resolve, reject) => {
                     scriptElement.src = src;
                     scriptElement.addEventListener('load', () => resolve(), {once: true});
                     scriptElement.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)),
                                                    {once: true});
                     document.head.appendChild(scriptElement);
                   });
                 }
                 scriptElement.textContent = content ?? '';
                 document.head.appendChild(scriptElement);
                 return Promise.resolve();
               };

               const sourceURLComment = '\n //# sourceURL=';
               window.eval('function fooEval() {}');
               window.eval('function fooEvalSourceURL() {}' + sourceURLComment + 'evalSourceURL.js');
               await appendDynamicScriptElement('', 'function fooScriptElementContent1() {}');
               await appendDynamicScriptElement('', 'function fooScriptElementContent2() {}');
               await appendDynamicScriptElement('',
                                                'function fooScriptElementContentSourceURL() {}' + sourceURLComment +
                                                    'scriptElementContentSourceURL.js');
               await appendDynamicScriptElement('click-breakpoint.js');

               const globalObj = globalThis as unknown as Record<string, unknown>;
               return {
                 fooEval: typeof globalObj.fooEval,
                 fooEvalSourceURL: typeof globalObj.fooEvalSourceURL,
                 fooScriptElementContent1: typeof globalObj.fooScriptElementContent1,
                 fooScriptElementContent2: typeof globalObj.fooScriptElementContent2,
                 fooScriptElementContentSourceURL: typeof globalObj.fooScriptElementContentSourceURL,
                 f2: typeof globalObj.f2,
               };
             });
           });

       assert.deepEqual(evaluatedTypes, {
         fooEval: 'function',
         fooEvalSourceURL: 'function',
         fooScriptElementContent1: 'function',
         fooScriptElementContent2: 'function',
         fooScriptElementContentSourceURL: 'function',
         f2: 'function',
       });

       const folder = 'test/e2e/resources/sources';
       await expandFileTree(devToolsPage, createSelectorsForFile(domainName, folder, 'click-breakpoint.js'));
       await expandFileTree(devToolsPage, createSelectorsForFile(domainName, folder, 'evalSourceURL.js'));
       await expandFileTree(devToolsPage, createSelectorsForFile(domainName, folder, 'inline-css.html'));
       await expandFileTree(devToolsPage,
                            createSelectorsForFile(domainName, folder, 'scriptElementContentSourceURL.js'));

       const expectedTree = [
         'top',
         'localhost:XXXX',
         'test/e2e/resources/sources',
         'inline-css.html',
         'click-breakpoint.js',
         'evalSourceURL.js',
         'scriptElementContentSourceURL.js',
       ];
       const actualTree = (await readSourcesTreeView(devToolsPage)).filter(item => !item.startsWith('pptr:evaluate;'));
       assert.deepEqual(actualTree, expectedTree);
     });
});
