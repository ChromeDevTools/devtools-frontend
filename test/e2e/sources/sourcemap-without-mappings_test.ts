// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {setIgnoreListPattern} from '../helpers/settings-helpers.js';
import {addBreakpointForLine, openSourceCodeEditorForFile} from '../helpers/sources-helpers.js';

describe('SourceMap handling', () => {
  it('can deal with a source map that has no mappings', async () => {
    await setIgnoreListPattern('cljs/user.cljs');

    await openSourceCodeEditorForFile(
        'script-with-sourcemap-without-mappings.js', 'script-with-sourcemap-without-mappings.html');
    await addBreakpointForLine(1);
  });
});
