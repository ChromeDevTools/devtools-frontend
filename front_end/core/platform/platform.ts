/*
 * Copyright (C) 2019 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as ArrayUtilities from './ArrayUtilities.js';
import * as Brand from './Brand.js';
import * as DateUtilities from './DateUtilities.js';
import * as DevToolsPath from './DevToolsPath.js';
import * as DOMUtilities from './DOMUtilities.js';
import * as KeyboardUtilities from './KeyboardUtilities.js';
import * as MapUtilities from './MapUtilities.js';
import * as MimeType from './MimeType.js';
import * as NumberUtilities from './NumberUtilities.js';
import * as ServerTiming from './ServerTiming.js';
import * as StringUtilities from './StringUtilities.js';
import * as Timing from './Timing.js';
import * as TypedArrayUtilities from './TypedArrayUtilities.js';
import * as TypeScriptUtilities from './TypescriptUtilities.js';
import * as UIString from './UIString.js';
import * as UserVisibleError from './UserVisibleError.js';

/* `assertNotNullOrUndefined` also need to be exposed, as TypeScript does
 * not allow `asserts` functions to be used with qualified access (e.g.
 * `Platform.TypeScriptUtilities.assertNotNullOrUndefined` causes a compile
 * error).
 */
export {assertNever, assertNotNullOrUndefined, assertUnhandled} from './TypescriptUtilities.js';
export {
  ArrayUtilities,
  Brand,
  DateUtilities,
  DevToolsPath,
  DOMUtilities,
  KeyboardUtilities,
  MapUtilities,
  MimeType,
  NumberUtilities,
  ServerTiming,
  StringUtilities,
  Timing,
  TypedArrayUtilities,
  TypeScriptUtilities,
  UIString,
  UserVisibleError,
};
