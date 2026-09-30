// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  waitForElementsStyleSection,
  waitForPartialContentOfSelectedElementsNode,
} from '../helpers/elements-helpers.js';

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
});
