// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

describe('Gzip', () => {
  it('can compress and decompress a string', async () => {
    const text = 'Hello, world!';
    const compressed = await Common.Gzip.compress(text);
    const decompressed = await Common.Gzip.decompress(compressed);
    assert.strictEqual(decompressed, text);
  });

  it('can compress and decompress a stream', async () => {
    const text = 'Hello, world! This is a stream test.';
    // @ts-expect-error missing types in devtools_foundation_module.
    const textEncoder = new TextEncoder();
    // @ts-expect-error missing types in devtools_foundation_module.
    const inputStream = new ReadableStream({
      // @ts-expect-error missing types in devtools_foundation_module.
      start(controller: ReadableStreamController<Uint8Array<ArrayBuffer>>) {
        controller.enqueue(textEncoder.encode(text));
        controller.close();
      },
    });

    const compressedStream = Common.Gzip.compressStream(inputStream);
    const decompressedStream = Common.Gzip.decompressStream(compressedStream);

    // @ts-expect-error missing types in devtools_foundation_module.
    const buffer = await new Response(decompressedStream).arrayBuffer();
    // @ts-expect-error missing types in devtools_foundation_module.
    const decodedText = new TextDecoder().decode(buffer);

    assert.strictEqual(decodedText, text);
  });
});

describe('arrayBufferToString', () => {
  it('can decompress a gzipped buffer', async () => {
    const text = 'Hello, world!';
    const compressed = await Common.Gzip.compress(text);
    const result = await Common.Gzip.arrayBufferToString(compressed);
    assert.strictEqual(result, text);
  });
  it('can decode a plaintext buffer', async () => {
    const text = 'Hello, buddy!';
    // @ts-expect-error missing types in devtools_foundation_module.
    const buffer = new TextEncoder().encode(text).buffer;
    const result = await Common.Gzip.arrayBufferToString(buffer);
    assert.strictEqual(result, text);
  });
});

describe('fileToString', () => {
  it('can decompress a gzipped file', async () => {
    const text = '{"key": "value"}';
    const compressed = await Common.Gzip.compress(text);
    // @ts-expect-error missing types in devtools_foundation_module.
    const result = await Common.Gzip.fileToString(new File([compressed], 'file.json.gz', {type: 'application/gzip'}));
    assert.strictEqual(result, text);
  });
  it('can decode a plaintext file', async () => {
    const text = 'Hello, buddy!';
    // @ts-expect-error missing types in devtools_foundation_module.
    const file = new File([text], 'test.txt');
    const result = await Common.Gzip.fileToString(file);
    assert.strictEqual(result, text);
  });
});
