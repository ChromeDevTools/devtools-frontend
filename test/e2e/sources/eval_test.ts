// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitFor} from '../../shared/helper.js';

import {openSourceCodeEditorForFile} from '../helpers/sources-helpers.js';

describe('The Sources Tab', () => {
  it('links to the correct origins for eval\'ed resources', async () => {
    await openSourceCodeEditorForFile('call-to-foo.js', 'eval-origin.html');
    await waitFor('.devtools-link[title$="foo.js:3"]');
  });
});
