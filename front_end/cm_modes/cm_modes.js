// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// TODO(crbug.com/1029037): lazily load these files again after the
// race-condition with CodeMirror is fixed
import '../third_party/codemirror/package/mode/clike/clike.js';
import '../third_party/codemirror/package/mode/coffeescript/coffeescript.js';
import '../third_party/codemirror/package/mode/php/php.js';
import '../third_party/codemirror/package/mode/python/python.js';
import '../third_party/codemirror/package/mode/shell/shell.js';
import '../third_party/codemirror/package/mode/livescript/livescript.js';
import '../third_party/codemirror/package/mode/markdown/markdown.js';
import '../third_party/codemirror/package/mode/clojure/clojure.js';
import '../third_party/codemirror/package/mode/jsx/jsx.js';

import * as DefaultCodeMirrorMimeMode from './DefaultCodeMirrorMimeMode.js';

export {
  DefaultCodeMirrorMimeMode,
};
