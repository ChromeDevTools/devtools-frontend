// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {CONSOLE_PROMPT_SELECTOR, CONSOLE_TAB_SELECTOR, typeIntoConsole} from '../helpers/console-helpers.js';
import {
  waitForElementsStyleSection,
  waitForPartialContentOfSelectedElementsNode,
} from '../helpers/elements-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';

describe('The Elements panel ', () => {
  it('can inspect elements with pointer-events: none', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(`
      <style>
        #outer {
          width: 200px;
          height: 200px;
          background-color: green;
        }
        #inner {
          pointer-events: none;
          width: 100px;
          height: 100px;
          background-color: red;
        }
      </style>
      <div id="outer"><div id="inner"></div></div>
    `);

    // Enable inspect mode and click on #inner without shift. #outer should be selected.
    await devToolsPage.click('[aria-label="Select an element in the page to inspect it"]');

    await inspectedPage.click('#inner');

    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'outer');

    // Enable inspect mode again and click on #inner with shift. #inner should be selected.
    await devToolsPage.click('[aria-label="Select an element in the page to inspect it"]');

    await inspectedPage.click('#inner', {modifiers: {shift: true}});

    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'inner');
  });

  it('can inspect an element inside an iframe', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(`
      <iframe id="frame" srcdoc="<div id='iframe-target' style='width:100px;height:100px;background:blue'>text</div>"
        style="width:200px;height:200px;border:0"></iframe>
    `);
    await waitForElementsStyleSection(devToolsPage, undefined);
    await devToolsPage.click('[aria-label="Select an element in the page to inspect it"]');
    await inspectedPage.click('#frame');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'iframe-target');
  });

  it('can inspect an element after CPU profiling finishes', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml('<div id="post-profile-target" style="width:100px;height:100px">Target</div>');
    await waitForElementsStyleSection(devToolsPage, undefined);
    await devToolsPage.evaluate(async () => {
      // @ts-expect-error Runtime dynamic import inside DevTools page context.
      const SDK = await import('./core/sdk/sdk.js');
      const cpuProfilerModel =
          SDK.TargetManager.TargetManager.instance().primaryPageTarget()?.model(SDK.CPUProfilerModel.CPUProfilerModel);
      if (!cpuProfilerModel) {
        throw new Error('CPUProfilerModel is not available on the primary page target');
      }
      await cpuProfilerModel.startRecording();
      await cpuProfilerModel.stopRecording();
    });
    await devToolsPage.click('[aria-label="Select an element in the page to inspect it"]');
    await inspectedPage.click('#post-profile-target');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'post-profile-target');
  });

  it('can inspect text inside a shadow root', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(`
      <div id="shadow-host" style="display:inline-block"></div>
      <script>
        const root = document.getElementById('shadow-host').attachShadow({mode: 'open'});
        root.innerHTML = 'Text Text Text<br>Text Text Text';
      </script>
    `);
    await waitForElementsStyleSection(devToolsPage, undefined);
    await devToolsPage.click('[aria-label="Select an element in the page to inspect it"]');
    await inspectedPage.click('#shadow-host');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'shadow-host');
  });

  it('can inspect an element rendered via a ::before pseudo-element', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(`
      <style>
        #pseudo-host {
          width: 100px;
          height: 100px;
        }
        #pseudo-host::before {
          content: "BEFORE";
          display: block;
          width: 100px;
          height: 100px;
          background: orange;
        }
      </style>
      <div id="pseudo-host"></div>
    `);
    await waitForElementsStyleSection(devToolsPage, undefined);
    await devToolsPage.click('[aria-label="Select an element in the page to inspect it"]');
    await inspectedPage.click('#pseudo-host');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '::before');
  });

  const inspectFromConsole = async (devToolsPage: DevToolsPage, expression: string) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await devToolsPage.waitFor(CONSOLE_PROMPT_SELECTOR);
    await typeIntoConsole(devToolsPage, `inspect(${expression})`);
  };

  it('selects iframe nodes created by either the main or the iframe document when inspected from the console',
     async ({devToolsPage, inspectedPage}) => {
       // Regression test for WebKit bug 60031: the node created via the main document's createElement lives in
       // the iframe's document after being appended there.
       await inspectedPage.goToHtml(`
        <body id="top-body">
          <iframe style="width:400px"></iframe>
          <script>
            const frameDoc = window.frames[0].document;
            window.el1 = document.createElement('div');
            el1.id = 'main-frame-div';
            el1.textContent = 'Element created via main document createElement';
            window.el2 = frameDoc.createElement('div');
            el2.id = 'iframe-div';
            el2.textContent = 'Element created via frame document createElement';
            frameDoc.body.appendChild(el1);
            frameDoc.body.appendChild(el2);
          </script>
        </body>
      `);
       await waitForElementsStyleSection(devToolsPage, undefined);

       // `top.` is used because inspecting a node in the iframe switches the console's execution context to it.
       await inspectFromConsole(devToolsPage, 'top.el1');
       await waitForPartialContentOfSelectedElementsNode(devToolsPage, '<div id=\u200B"main-frame-div">');

       await inspectFromConsole(devToolsPage, 'top.document.body');
       await waitForPartialContentOfSelectedElementsNode(devToolsPage, '<body id=\u200B"top-body">');

       await inspectFromConsole(devToolsPage, 'top.el2');
       await waitForPartialContentOfSelectedElementsNode(devToolsPage, '<div id=\u200B"iframe-div">');
     });

  it('selects deep shadow DOM nodes when inspected from the console', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(`
      <div>
        <div>
          <div id="host"></div>
          <span id="hostOpen"></span>
        </div>
      </div>
      <script>
        document.querySelector('#host').attachShadow({mode: 'open'}).innerHTML =
            "<div><div><span id='shadow'>Shadow</span></div></div><div id='nestedHost'></div>";
        document.querySelector('#hostOpen').attachShadow({mode: 'open'}).innerHTML =
            "<div><div><span id='shadow-open'>Shadow</span></div></div>";
        host.shadowRoot.querySelector('#nestedHost').attachShadow({mode: 'open'}).innerHTML =
            "<div><span id='nested-shadow'>Nested shadow</span></div>";
      </script>
    `);
    await waitForElementsStyleSection(devToolsPage, undefined);

    await inspectFromConsole(devToolsPage, 'host.shadowRoot.firstChild.firstChild.firstChild');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '<span id=\u200B"shadow">');

    await inspectFromConsole(devToolsPage, 'hostOpen.shadowRoot.firstChild.firstChild.firstChild');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '<span id=\u200B"shadow-open">');

    await inspectFromConsole(devToolsPage,
                             'host.shadowRoot.querySelector("#nestedHost").shadowRoot.querySelector("#nested-shadow")');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '<span id=\u200B"nested-shadow">');
  });
});
