// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Quickly determine if gzipped, by seeing if the first 3 bytes of the file header match the gzip signature
 */
export function isGzip(ab: ArrayBuffer): boolean {
  const buf = new Uint8Array(ab);
  if (!buf || buf.length < 3) {
    return false;
  }
  // https://www.rfc-editor.org/rfc/rfc1952#page-6
  return buf[0] === 0x1F && buf[1] === 0x8B && buf[2] === 0x08;
}

/** Decode a gzipped _or_ plain text ArrayBuffer to a decoded string */
export async function arrayBufferToString(ab: ArrayBuffer): Promise<string> {
  if (isGzip(ab)) {
    return await decompress(ab);
  }
  const str = new TextDecoder('utf-8').decode(ab);
  return str;
}

export async function fileToString(file: File): Promise<string> {
  let stream = file.stream();
  if (file.type.endsWith('gzip')) {
    stream = decompressStream(stream);
  }
  const arrayBuffer = await new Response(stream).arrayBuffer();
  const str = new TextDecoder('utf-8').decode(arrayBuffer);
  return str;
}

/**
 * Decompress a gzipped ArrayBuffer to a string.
 * Consider using `arrayBufferToString` instead, which can handle both gzipped and plain text buffers.
 */
export async function decompress(gzippedBuffer: ArrayBuffer): Promise<string> {
  const buffer = await gzipCodec(gzippedBuffer, new DecompressionStream('gzip'));
  const str = new TextDecoder('utf-8').decode(buffer);
  return str;
}
export async function compress(str: string): Promise<ArrayBuffer> {
  const encoded = new TextEncoder().encode(str);
  const buffer = await gzipCodec(encoded, new CompressionStream('gzip'));
  return buffer;
}

// Private coder/decoder
function gzipCodec(buffer: Uint8Array<ArrayBufferLike>|ArrayBuffer, codecStream: CompressionStream|DecompressionStream):
    Promise<ArrayBuffer> {
  const {readable, writable} = new TransformStream();
  const codecReadable = readable.pipeThrough(codecStream);

  const writer = writable.getWriter();
  void writer.write(buffer);
  void writer.close();
  // A response is a convenient way to get an ArrayBuffer from a ReadableStream.
  return new Response(codecReadable).arrayBuffer();
}

export function decompressStream(stream: ReadableStream): ReadableStream {
  // https://github.com/wicg/compression/blob/main/explainer.md#deflate-compress-an-arraybuffer
  const ds = new DecompressionStream('gzip');
  return stream.pipeThrough(ds);
}
export function compressStream(stream: ReadableStream): ReadableStream {
  const cs = new CompressionStream('gzip');
  return stream.pipeThrough(cs);
}
