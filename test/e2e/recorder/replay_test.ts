// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {enableExperiment, getBrowserAndPages, getResourcesPath, goToResource, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {createNewRecording, openRecorderSubPane, openSourcesPanel} from '../helpers/sources-helpers.js';

function setCodeMirrorEditorContent(code: string) {
  // @ts-ignore
  const codeMirror = document.querySelector('.CodeMirror').CodeMirror;
  codeMirror.setValue(code);
}

async function setCode(code: string) {
  const {frontend} = getBrowserAndPages();
  await frontend.evaluate(setCodeMirrorEditorContent, code);

  // Commit the changes
  if (process.platform === 'darwin') {
    await frontend.keyboard.down('Meta');
    await frontend.keyboard.down('S');
    await frontend.keyboard.up('S');
    await frontend.keyboard.up('Meta');
  } else {
    await frontend.keyboard.down('Control');
    await frontend.keyboard.down('S');
    await frontend.keyboard.up('S');
    await frontend.keyboard.up('Control');
  }
}

async function setupRecorderWithScriptAndReplay(script: string): Promise<void> {
  await enableExperiment('recorder');
  await goToResource('recorder/recorder.html');

  const {frontend} = getBrowserAndPages();

  await openSourcesPanel();
  await openRecorderSubPane();
  await createNewRecording('New recording');
  await setCode(script);

  await frontend.click('pierce/[aria-label="Replay"]');
  // TODO: find out why this is not working:
  // document.querySelector('[aria-label="Replay"]:not([disabled])');
  await waitForFunction(async () => {
    const disabled = await frontend.$eval('pierce/[aria-label="Replay"]', e => (e as HTMLButtonElement).disabled);
    return !disabled || undefined;
  });
}

describe('Recorder', function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  this.timeout(10000);

  describe('Replay', () => {
    it('should be able to replay navigation steps', async () => {
      const {target} = getBrowserAndPages();

      const promise = target.waitForNavigation();
      await setupRecorderWithScriptAndReplay(`[
        {
            "action": "navigate",
            "condition": null,
            "url": "${getResourcesPath()}/recorder/recorder2.html"
        }
      ]`);
      await promise;
      assert.strictEqual(target.url(), `${getResourcesPath()}/recorder/recorder2.html`);
    });

    it('should be able to replay click steps', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay(`[
        {
          "action": "click",
          "condition": {
              "expectedUrl": "${getResourcesPath()}/recorder/recorder2.html"
          },
          "context": {
              "path": [],
              "target": "main"
          },
          "selector": "a[href=\\"recorder2.html\\"]"
      }
      ]`);
      assert.strictEqual(target.url(), `${getResourcesPath()}/recorder/recorder2.html`);
    });

    it('should be able to replay change steps', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay(`[
        {
            "action": "change",
            "condition": null,
            "context": {
                "path": [],
                "target": "main"
            },
            "selector": "#input",
            "value": "Hello World"
        }
      ]`);

      const value = await target.$eval('#input', e => (e as HTMLInputElement).value);
      assert.strictEqual(value, 'Hello World');
    });
  });
});
