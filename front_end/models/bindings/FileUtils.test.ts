// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import * as Bindings from './bindings.js';

const ChunkedFileReader = Bindings.FileUtils.ChunkedFileReader;
const StringOutputStream = Common.StringOutputStream.StringOutputStream;

describe('FileUtils', () => {
  describe('ChunkedFileReader', () => {
    it('re-assembles chunks including multibyte characters', async () => {
      const text = [
        'Латынь из моды вышла ныне:\n',
        'Так, если правду вам сказать,\n',
        'Он знал довольно по-латыне,\n',
        'Чтоб эпиграфы разбирать\n',
      ];

      const blob = new Blob(text, {type: 'text/plain'});
      // Most of the characters above will be encoded as 2 bytes, so make sure we use odd
      // chunk size to cause chunk boundaries sometimes to happen between chaacter bytes.
      const chunkSize = 5;
      let chunkCount = 0;
      const reader = new ChunkedFileReader(new File([blob], 'ru.txt'), chunkSize, () => ++chunkCount);
      const output = new StringOutputStream();

      const hasNoError = await reader.read(output);

      assert.isTrue(hasNoError);
      assert.strictEqual(chunkCount, 41);
      assert.strictEqual(text.join(''), output.data(), 'Read text is different from written text');
    });

    it('can decompress gzipped data', async () => {
      async function getAsCompressedFile(text: string) {
        const blob = new Blob([text], {type: 'text/plain'});
        const cstream = Common.Gzip.compressStream(blob.stream());
        const creader = cstream.getReader();
        const values: string[] = [];

        while (true) {
          const {value, done} = await creader.read();
          if (done) {
            break;
          }
          values.push(value);
        }
        const cblob = new Blob(values, {type: 'application/gzip'});
        return cblob;
      }

      const expectedText = 'This text will get compressed and then decompressed!';
      const cblob = await getAsCompressedFile(expectedText);

      let chunkCount = 0;
      const chunkSize = 5;
      const output = new StringOutputStream();
      const compressedFile = new File([cblob], 'ru.txt.gz', {type: 'application/gzip'});
      const cfreader = new ChunkedFileReader(compressedFile, chunkSize, () => ++chunkCount);

      const hasNoError = await cfreader.read(output);
      assert.isTrue(hasNoError);
      assert.strictEqual(expectedText, output.data(), 'Read text is different from written text');
    });
  });
});
