// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as ProtocolNamespace from './protocol.js';

// Ambient modules are not allowed to both export and declare variables.
// Since the protocol definitions are declared as a namespace and exported
// as such, they can't also augment the global scope in the same file.
// Therefore, we have to perform the global scope augmentation in a separate
// file. The global scope augmentation is only necessary for all files that
// are still using the `Protocol` global. Once all files properly import the
// Protocol definitions via `import type * as`, we can remove the global
// scope augmentation here and remove it from `ts_library.py as well.
// TODO(crbug.com/1208357): remove this file
declare global {
  var Protocol: typeof ProtocolNamespace;
}
