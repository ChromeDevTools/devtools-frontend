// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {setIgnoreListPattern} from '../helpers/settings-helpers.js';
import {addBreakpointForLine, openSourceCodeEditorForFile} from '../helpers/sources-helpers.js';

describe('SourceMap handling', () => {
  it('can deal with a source map that has no mappings', async ({devToolsPage, inspectedPage}) => {
    await setIgnoreListPattern(devToolsPage, 'cljs/user.cljs');

    await openSourceCodeEditorForFile(devToolsPage, inspectedPage, 'script-with-sourcemap-without-mappings.js',
                                      'script-with-sourcemap-without-mappings.html');
    await addBreakpointForLine(devToolsPage, 1);
  });
});
