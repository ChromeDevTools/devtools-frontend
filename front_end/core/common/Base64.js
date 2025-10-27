"use strict";
export const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export const BASE64_CODES = new Uint8Array(123);
for (let index = 0; index < BASE64_CHARS.length; ++index) {
  BASE64_CODES[BASE64_CHARS.charCodeAt(index)] = index;
}
export function decode(input) {
  let bytesLength = input.length * 3 / 4 >>> 0;
  if (input.charCodeAt(input.length - 2) === 61) {
    bytesLength -= 2;
  } else if (input.charCodeAt(input.length - 1) === 61) {
    bytesLength -= 1;
  }
  const bytes = new Uint8Array(bytesLength);
  for (let index = 0, offset = 0; index < input.length; index += 4) {
    const a = BASE64_CODES[input.charCodeAt(index + 0)];
    const b = BASE64_CODES[input.charCodeAt(index + 1)];
    const c = BASE64_CODES[input.charCodeAt(index + 2)];
    const d = BASE64_CODES[input.charCodeAt(index + 3)];
    bytes[offset++] = a << 2 | b >> 4;
    bytes[offset++] = (b & 15) << 4 | c >> 2;
    bytes[offset++] = (c & 3) << 6 | d & 63;
  }
  return bytes;
}
export function encode(input) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("failed to convert to base64"));
    reader.onload = () => {
      const blobAsUrl = reader.result;
      const [, base64] = blobAsUrl.split(",", 2);
      resolve(base64);
    };
    reader.readAsDataURL(new Blob([input]));
  });
}
//# sourceMappingURL=Base64.js.map
