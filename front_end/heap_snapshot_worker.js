// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// Release build has Runtime.js bundled.

// FIXME(http://crbug.com/1007254)
const __import = path => {
  const relativePath = new URL(path, self.location.href);
  return eval(`import('${relativePath}')`);
};

if (!self.Runtime)
  self.importScripts('Runtime.js');
__import('./common/common.js').then(_ => Runtime.startWorker('heap_snapshot_worker'));
