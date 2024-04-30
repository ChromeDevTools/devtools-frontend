// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CacheStorageTestRunner from './CacheStorageTestRunner.js';
import * as IndexedDBTestRunner from './IndexedDBTestRunner.js';
import * as ResourcesTestRunner from './ResourcesTestRunner.js';
import * as ResourceTreeTestRunner from './ResourceTreeTestRunner.js';
import * as ServiceWorkersTestRunner from './ServiceWorkersTestRunner.js';
import * as StorageTestRunner from './StorageTestRunner.js';

export const ApplicationTestRunner = {
  ...CacheStorageTestRunner,
  ...IndexedDBTestRunner,
  ...ResourcesTestRunner,
  ...ResourceTreeTestRunner,
  ...ServiceWorkersTestRunner,
  ...StorageTestRunner,
};
