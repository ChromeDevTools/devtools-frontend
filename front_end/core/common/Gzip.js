// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * Quickly determine if gzipped, by seeing if the first 3 bytes of the file header match the gzip signature
 */
export function isGzip(ab) {
    const buf = new Uint8Array(ab);
    if (!buf || buf.length < 3) {
        return false;
    }
    // https://www.rfc-editor.org/rfc/rfc1952#page-6
    return buf[0] === 0x1F && buf[1] === 0x8B && buf[2] === 0x08;
}
/** Decode a gzipped _or_ plain text ArrayBuffer to a decoded string */
export async function arrayBufferToString(ab) {
    if (isGzip(ab)) {
        return await decompress(ab);
    }
    const str = new TextDecoder('utf-8').decode(ab);
    return str;
}
export async function fileToString(file) {
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
export async function decompress(gzippedBuffer) {
    const buffer = await gzipCodec(gzippedBuffer, new DecompressionStream('gzip'));
    const str = new TextDecoder('utf-8').decode(buffer);
    return str;
}
export async function compress(str) {
    const encoded = new TextEncoder().encode(str);
    const buffer = await gzipCodec(encoded, new CompressionStream('gzip'));
    return buffer;
}
/** Private coder/decoder **/
async function gzipCodec(buffer, codecStream) {
    const readable = new ReadableStream({
        start(controller) {
            controller.enqueue(buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer);
            controller.close();
        }
    });
    const codecReadable = readable.pipeThrough(codecStream);
    // A response is a convenient way to get an ArrayBuffer from a ReadableStream.
    return await new Response(codecReadable).arrayBuffer();
}
export function decompressStream(stream) {
    // https://github.com/wicg/compression/blob/main/explainer.md#deflate-compress-an-arraybuffer
    const ds = new DecompressionStream('gzip');
    return stream.pipeThrough(ds);
}
export function compressStream(stream) {
    const cs = new CompressionStream('gzip');
    return stream.pipeThrough(cs);
}
//# sourceMappingURL=Gzip.js.map