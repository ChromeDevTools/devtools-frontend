// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = {

  readStdIn: function() {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const P = new Promise((resolve) => {
      let buffer = '';
      process.stdin.on('data', (data) => {
        buffer += data;
      });
      process.stdin.on('end', function() {
        resolve(buffer);
      });
    });

    return P;
  },
  parseInput: function*(input) {
    while (input.length > 0) {
      const {content_length, remaining} = getContentLength(input);
      if (content_length < 0) {
        console.error('Didn\'t consume ' + input.length + ' bytes at the end of input');
        break;
      }
      input = consumeHeaders(remaining);
      const payload = input.substring(0, content_length);
      yield JSON.parse(payload);
      input = input.substring(content_length);
    }
  },

  decodeBase64: function*(input) {
    if (input.length % 4 > 0)
      throw 'String has wrong length';
    while (input.length > 0) {
      const [x, y, z] = decodeBase64Piece(input);
      input = input.substr(4);
      yield x;
      if (y >= 0)
        yield y;
      if (z >= 0)
        yield z;
    }

    function decodeBase64Piece(input) {
      const Base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const a = Base.indexOf(input[0]);
      const b = Base.indexOf(input[1]);
      const c = Base.indexOf(input[2]);
      const d = Base.indexOf(input[3]);
      const x = (a << 2) | (b >> 4);
      const y = (0xFF & (b << 4)) | (c >> 2);
      const z = (0xFF & (c << 6)) | d;
      return [x, y, z];
    }
  },

  makeInstance: function(module, {getMemory, getLocal, debug} = {}) {
    const re = /smaller than initial ([0-9]+),/;
    const imports = {
      'env': {
        __sbrk: sbrkDefaultApi.bind(this, 2 << 16),
        __getMemory: getMemory || nopDefaultApi,
        __getLocal: getLocal || nopDefaultApi,
        __debug: debug || nopDefaultApi
      }
    };
    return new WebAssembly.Instance(module, imports);
  },

  toString: function(array, begin) {
    var Res = '';
    while (begin < array.length && array[begin] != 0) {
      Res += String.fromCharCode(array[begin]);
      ++begin;
    }
    return Res;
  },

  dump: function(wasm_memory) {
    for (const i in wasm_memory) {
      if (wasm_memory[i] != 0) {
        if (wasm_memory[i] >= 33 && wasm_memory[i] < 127)
          console.log(i + ': ' + String.fromCharCode(wasm_memory[i]));
        else
          console.log(i + ': 0x' + wasm_memory[i].toString(16));
      }
    }
  }
};

function getContentLength(input) {
  while (input.length > 0) {
    const eol = input.indexOf('\r\n');
    const content_line = eol >= 0 ? input.substring(0, eol) : input;
    input = eol >= 0 ? input.substring(eol + 2) : '';
    if (!content_line.startsWith('Content-Length: '))
      continue;
    const content_length = Number(content_line.trim().substring('Content-Length: '.length));
    return {content_length: content_length, remaining: input};
  }
  return {content_length: -1, remaining: input};
}

function consumeHeaders(input) {
  while (input.length > 0) {
    const eol = input.indexOf('\r\n');
    if (eol < 0)
      return input;
    if (eol == 0)
      return input.substring(2);
    input = input.substring(eol + 2);
  }
  return input;
}

function nopDefaultApi() {
}

function sbrkDefaultApi(memorySize, increment) {
  if (increment === 0)
    return memorySize;
  return -1;
}
