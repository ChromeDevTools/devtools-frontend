// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {clickOnContextMenu, openSourceCodeEditorForFile} from '../helpers/sources-helpers.js';

describe('The Sources Tab', async () => {
  describe('Navigation', () => {
    it('should show a "search in folder" option in the context menu of folders', async () => {
      await openSourceCodeEditorForFile('index.html', 'navigation/index.html');

      await clickOnContextMenu('[aria-label="test/e2e/resources/sources/navigation, nw-folder"]', 'Search in folder');
      const element = await waitFor('[aria-label="Search Query"]');
      const value = await element.evaluate(input => (input as HTMLInputElement).value);

      assert.strictEqual(value, 'file:test/e2e/resources/sources/navigation');
    });
  });
});
