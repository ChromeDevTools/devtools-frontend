// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {setIgnoreListPattern} from '../helpers/settings-helpers.js';
import {addBreakpointForLine, openSourceCodeEditorForFile} from '../helpers/sources-helpers.js';

describe('SourceMap handling', async () => {
  it('can deal with a source map that has no mappings', async () => {
    const {frontend} = getBrowserAndPages();

    await setIgnoreListPattern('cljs/user.cljs');

    await openSourceCodeEditorForFile(
        'script-with-sourcemap-without-mappings.js', 'script-with-sourcemap-without-mappings.html');
    await addBreakpointForLine(frontend, 1);
  });
});
