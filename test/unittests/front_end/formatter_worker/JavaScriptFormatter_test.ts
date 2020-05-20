// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Platform from '../../../../front_end/platform/platform.js';

import '../../../../front_end/third_party/acorn/package/dist/acorn.js';
import '../../../../front_end/formatter_worker/acorn/acorn_loose.js';

import {FormattedContentBuilder} from '../../../../front_end/formatter_worker/FormattedContentBuilder.js';
import {JavaScriptFormatter} from '../../../../front_end/formatter_worker/JavaScriptFormatter.js';

function formatJavaScript(text: string): string {
  // Indent using 2 spaces for these unit tests.
  const builder = new FormattedContentBuilder('  ');
  const formatter = new JavaScriptFormatter(builder);
  const lineEndings = Platform.StringUtilities.findLineEndingIndexes(text);
  formatter.format(text, lineEndings, 0, text.length);

  return builder.content();
}

describe('JavaScriptFormatter', () => {
  it('formats await expressions correctly', () => {
    const formattedCode =
        formatJavaScript('(async () => { await someFunctionThatNeedsAwaiting(); callSomeOtherFunction(); })();');
    assert.strictEqual(
        formattedCode, '(async()=>{\n  await someFunctionThatNeedsAwaiting();\n  callSomeOtherFunction();\n}\n)();\n');
  });

  it('formats nullish coalescing expressions correctly', () => {
    const formattedCode = formatJavaScript('false??true');
    assert.strictEqual(formattedCode, 'false ?? true\n');
  });
});
