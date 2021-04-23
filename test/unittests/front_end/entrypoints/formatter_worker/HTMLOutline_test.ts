// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as FormatterWorker from '../../../../../front_end/entrypoints/formatter_worker/formatter_worker.js';

type Item = {
  title: string,
  subtitle?: string, line: number, column: number,
};

function htmlOutline(text: string): Promise<Item[]> {
  return new Promise(resolve => {
    const items: Item[] = [];
    FormatterWorker.HTMLOutline.htmlOutline(text, ({chunk, isLastChunk}) => {
      items.push(...chunk);
      if (isLastChunk) {
        resolve(items);
      }
    });
  });
}

describe('HTMLOutline', () => {
  it('handles inline <script>s', async () => {
    const items = await htmlOutline(`<script>
  function first() {}
  function IrrelevantFunctionSeekOrMissEKGFreqUnderflow() {}
  function someFunction1() {}
  function someFunction2() {}
  debugger;
</script>`);
    assert.deepEqual(items, [
      {title: 'first', subtitle: '()', line: 1, column: 11},
      {title: 'IrrelevantFunctionSeekOrMissEKGFreqUnderflow', subtitle: '()', line: 2, column: 11},
      {title: 'someFunction1', subtitle: '()', line: 3, column: 11},
      {title: 'someFunction2', subtitle: '()', line: 4, column: 11},
    ]);
  });

  it('handles multiple <script>s', async () => {
    const items = await htmlOutline(`<!DOCTYPE html>
<html>
  <head>
    <script type="text/javascript">function add(x, y) { return x + y; }</script>
  </head>
  <body>
    <script>
      const sub = (a, b) => {
        return x + y;
      }
    </script>
  </body>
</html>
`);
    assert.deepEqual(items, [
      {title: 'add', subtitle: '(x, y)', line: 3, column: 44},
      {title: 'sub', subtitle: '(a, b)', line: 7, column: 12},
    ]);
  });
});
