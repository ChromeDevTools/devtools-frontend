// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {openSourceCodeEditorForFile} from '../../e2e/helpers/sources-helpers.js';

describe('The Sources Tab', () => {
  it('links to the correct origins for eval\'ed resources', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile('call-to-foo.js', 'eval-origin.html', devToolsPage, inspectedPage);
    await devToolsPage.waitFor('.devtools-link[title$="foo.js:3"]');
  });
});
