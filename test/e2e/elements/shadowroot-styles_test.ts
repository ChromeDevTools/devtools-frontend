// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  expandSelectedNodeRecursively,
  getDisplayedStyleRules,
  waitForChildrenOfSelectedElementNode,
  waitForContentOfSelectedElementsNode,
  waitForPartialContentOfSelectedElementsNode,
} from '../helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';

describe('The Elements Tab', () => {
  it('can show styles in shadow roots', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/shadow-roots.html');

    // Wait for the file to be loaded and selectors to be shown
    await devToolsPage.waitFor('.styles-selector');

    // Check to make sure we have the correct node selected after opening a file
    await waitForContentOfSelectedElementsNode('<body>\u200B', devToolsPage);

    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode('<div id=\u200B"host">\u200B…\u200B</div>\u200B', devToolsPage);

    // Open the div (shows new nodes, but does not alter the selected node)
    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode('<div id=\u200B"host">\u200B', devToolsPage);

    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode('#shadow-root (open)', devToolsPage);

    // Open the shadow root (shows new nodes, but does not alter the selected node)
    await devToolsPage.pressKey('ArrowRight');
    await waitForChildrenOfSelectedElementNode(devToolsPage);
    await waitForContentOfSelectedElementsNode('#shadow-root (open)', devToolsPage);

    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode('<style>\u200B .red { color: red; } \u200B</style>\u200B', devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForContentOfSelectedElementsNode(
        '<div id=\u200B"inner" class=\u200B"red">\u200Bhi!\u200B</div>\u200B', devToolsPage);

    await devToolsPage.waitForFunction(async () => {
      const styleSections = await devToolsPage.$$('.styles-section');
      const numFound = styleSections.length;

      return numFound === 3;
    });

    const styleSections = await devToolsPage.$$('.styles-section');
    const selectorTexts =
        await Promise.all(styleSections.map(n => n.evaluate(node => (node as HTMLElement).innerText)));

    assert.deepEqual(selectorTexts, [
      'element.style {\n}',
      '<style>\n.red {\n}',
      'user agent stylesheet\ndiv {\n}',
    ]);
  });

  it('correctly shows overriden properties for pseudo elements in UA shadow dom',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToHtml(`
         <style>
           /* This overrides the content-visibility declaration in the style attribute in UA shadow dom */
           details::details-content { content-visibility: visible; }

           /* This overrides the color declaration in the style attribute in author shadow dom */
           ::part(exposed) { color:red; }

           /* This DOES NOT override the unicode-bidi declaration -webkit prefixed pseudo in UA shadow dom */
           input::-webkit-datetime-edit { unicode-bidi: bidi-override; }
         </style>
         <details>
           <summary>Summary</summary>
           Contents
         </details>
         <div>
           <template shadowrootmode=open>
             <div id=contained style="color:blue" part=exposed>Hello</div>
           </template>
         </div>
         <input type="date">
      `);

       await togglePreferenceInSettingsTab('Show user agent shadow DOM', undefined, devToolsPage);
       await expandSelectedNodeRecursively(devToolsPage);

       const getProperties = async (elementSpec: string, expectedSelector: string) => {
         await devToolsPage.click(`pierceShadowText/${elementSpec}`);
         await waitForPartialContentOfSelectedElementsNode(elementSpec, devToolsPage);
         return await devToolsPage.waitForFunction(async () => {
           const properties = await getDisplayedStyleRules(devToolsPage);
           const index = properties.findIndex(({selectorText}) => selectorText === expectedSelector);
           return index >= 0 ? properties.slice(0, index + 1) : undefined;
         });
       };

       // ::details-content pseudo elements override style attributes in UA shadow dom
       assert.deepEqual(await getProperties('pseudo=\u200B"details-content"', 'details::details-content'), [
         {
           propertyData: [
             {
               isInherited: false,
               isOverLoaded: true,
               propertyName: 'content-visibility',
             },
             {
               isInherited: false,
               isOverLoaded: false,
               propertyName: 'display',
             },
           ],
           selectorText: 'element.style',
         },
         {
           propertyData: [
             {
               isInherited: false,
               isOverLoaded: false,
               propertyName: 'content-visibility',
             },
           ],
           selectorText: 'details::details-content',
         },
       ]);

       // -webkit prefixed pseudo style attributes cannot be overridden by author styles without !important
       assert.deepEqual(await getProperties('pseudo=\u200B"-webkit-datetime-edit"', 'input::-webkit-datetime-edit'), [
         {
           propertyData: [
             {
               isInherited: false,
               isOverLoaded: false,
               propertyName: 'unicode-bidi',
             },
           ],
           selectorText: 'element.style',
         },
         {
           propertyData: [
             {
               isInherited: false,
               isOverLoaded: true,
               propertyName: 'unicode-bidi',
             },
           ],
           selectorText: 'input::-webkit-datetime-edit',
         },
       ]);

       // ::part pseudo elements override style attributes in shadow dom
       assert.deepEqual(await getProperties('id=\u200B"contained"', '::part(exposed)'), [
         {
           propertyData: [
             {
               isInherited: false,
               isOverLoaded: true,
               propertyName: 'color',
             },
           ],
           selectorText: 'element.style',
         },
         {
           propertyData: [
             {
               isInherited: false,
               isOverLoaded: false,
               propertyName: 'color',
             },
           ],
           selectorText: '::part(exposed)',
         },
       ]);
     });
});
