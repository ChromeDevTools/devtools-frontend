// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type {UserFlow, Selector} from '../../../front_end/models/recorder/Steps.js';

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

async function setupRecorderWithScriptAndReplay(
    script: UserFlow, path: string = 'recorder/recorder.html'): Promise<void> {
  await enableExperiment('recorder');
  await goToResource(path);

  const {frontend} = getBrowserAndPages();

  await openSourcesPanel();
  await openRecorderSubPane();
  await createNewRecording('New recording');
  await setCode(JSON.stringify(script));

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
    it('should navigate to the url of the first section', async () => {
      const {target} = getBrowserAndPages();

      const promise = target.waitForNavigation();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        sections: [
          {
            url: `${getResourcesPath()}/recorder/recorder2.html`,
            screenshot: '',
            title: '',
            steps: [],
          },
        ],
      });
      await promise;
      assert.strictEqual(target.url(), `${getResourcesPath()}/recorder/recorder2.html`);
    });

    it('should be able to replay click steps', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        sections: [{
          url: `${getResourcesPath()}/recorder/recorder.html`,
          screenshot: '',
          title: '',
          steps: [{
            type: 'click',
            context: {
              path: [],
              target: 'main',
            },
            selector: 'a[href="recorder2.html"]' as Selector,
          }],
        }],
      });
      assert.strictEqual(target.url(), `${getResourcesPath()}/recorder/recorder2.html`);
    });

    it('should be able to replay keyboard events', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        sections: [{
          url: `${getResourcesPath()}/recorder/input.html`,
          screenshot: '',
          title: '',
          steps: [
            {
              'type': 'keydown',
              'context': {
                'path': [],
                'target': 'main',
              },
              'key': 'Tab',
            },
            {
              'type': 'keyup',
              'context': {
                'path': [],
                'target': 'main',
              },
              'key': 'Tab',
            },
            {
              'type': 'keydown',
              'context': {
                'path': [],
                'target': 'main',
              },
              'key': '1',
            },
            {
              'type': 'keyup',
              'context': {
                'path': [],
                'target': 'main',
              },
              'key': '1',
            },
            {
              'type': 'keydown',
              'context': {
                'path': [],
                'target': 'main',
              },
              'key': 'Tab',
            },
            {
              'type': 'keyup',
              'context': {
                'path': [],
                'target': 'main',
              },
              'key': 'Tab',
            },
            {
              'type': 'keydown',
              'context': {
                'path': [],
                'target': 'main',
              },
              'key': '2',
            },
            {
              'type': 'keyup',
              'context': {
                'path': [],
                'target': 'main',
              },
              'key': '2',
            },
          ],
        }],
      });

      const value = await target.$eval('#log', e => (e as HTMLElement).innerText.trim());
      assert.strictEqual(value, ['one:1', 'two:2'].join('\n'));
    });

    it('should be able to replay events on select', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        sections: [{
          url: `${getResourcesPath()}/recorder/select.html`,
          screenshot: '',
          title: '',
          steps: [
            {
              'type': 'change',
              'context': {
                'path': [],
                'target': 'main',
              },
              'selector': 'aria/Select' as Selector,
              'value': 'O2',
            },
          ],
        }],
      });

      const value = await target.$eval('#select', e => (e as HTMLSelectElement).value);
      assert.strictEqual(value, 'O2');
    });
  });
});
