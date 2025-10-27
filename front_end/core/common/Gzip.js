"use strict";
export function isGzip(ab) {
  const buf = new Uint8Array(ab);
  if (!buf || buf.length < 3) {
    return false;
  }
  return buf[0] === 31 && buf[1] === 139 && buf[2] === 8;
}
export async function arrayBufferToString(ab) {
  if (isGzip(ab)) {
    return await decompress(ab);
  }
  const str = new TextDecoder("utf-8").decode(ab);
  return str;
}
export async function fileToString(file) {
  let stream = file.stream();
  if (file.type.endsWith("gzip")) {
    stream = decompressStream(stream);
  }
  const arrayBuffer = await new Response(stream).arrayBuffer();
  const str = new TextDecoder("utf-8").decode(arrayBuffer);
  return str;
}
export async function decompress(gzippedBuffer) {
  const buffer = await gzipCodec(gzippedBuffer, new DecompressionStream("gzip"));
  const str = new TextDecoder("utf-8").decode(buffer);
  return str;
}
export async function compress(str) {
  const encoded = new TextEncoder().encode(str);
  const buffer = await gzipCodec(encoded, new CompressionStream("gzip"));
  return buffer;
}
async function gzipCodec(buffer, codecStream) {
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(buffer);
      controller.close();
    }
  });
  const codecReadable = readable.pipeThrough(codecStream);
  return await new Response(codecReadable).arrayBuffer();
}
export function decompressStream(stream) {
  const ds = new DecompressionStream("gzip");
  return stream.pipeThrough(ds);
}
export function compressStream(stream) {
  const cs = new CompressionStream("gzip");
  return stream.pipeThrough(cs);
}
//# sourceMappingURL=Gzip.js.map
