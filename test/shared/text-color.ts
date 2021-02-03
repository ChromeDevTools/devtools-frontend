// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const enum TextColor {
  DIM = 'DIM',
  GREEN = 'GREEN',
  RED = 'RED',
  MAGENTA = 'MAGENTA',
  CYAN = 'CYAN',
}

export function color(msg: string, color: TextColor) {
  if (!process.env['TERM']) {
    return msg;
  }

  const preamble = '\x1b[';
  const postamble = 'm';
  const reset = `${preamble}0${postamble}`;
  let code = 0;
  switch (color) {
    case TextColor.DIM:
      code = 2;
      break;
    case TextColor.GREEN:
      code = 32;
      break;
    case TextColor.RED:
      code = 31;
      break;
    case TextColor.MAGENTA:
      code = 35;
      break;
    case TextColor.CYAN:
      code = 36;
      break;
  }

  return `${preamble}${code}${postamble}${msg}${reset}`;
}
