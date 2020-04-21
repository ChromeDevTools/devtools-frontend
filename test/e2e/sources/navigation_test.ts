// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getBrowserAndPages, waitFor} from '../../shared/helper.js';
import {clickOnContextMenu, openSourceCodeEditorForFile} from '../helpers/sources-helpers.js';

describe('The Sources Tab', async () => {
  describe('Navigation', () => {
    it('should show a "search in folder" option in the context menu of folders', async () => {
      const {target} = getBrowserAndPages();

      await openSourceCodeEditorForFile(target, 'index.html', 'navigation/index.html');

      await clickOnContextMenu('[aria-label="test/e2e/resources/sources/navigation, nw-folder"]', 'Search in folder');
      const element = await waitFor('[aria-label="Search Query"]');
      const value = await element.evaluate(input => input.value);

      assert.equal(value, 'file:test/e2e/resources/sources/navigation');
    });
  });
});
