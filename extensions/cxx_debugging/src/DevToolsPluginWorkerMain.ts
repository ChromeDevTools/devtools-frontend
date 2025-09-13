// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {RPCInterface} from './DevToolsPluginWorker.js';
import {ResourceLoader} from './MEMFSResourceLoader.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
new RPCInterface(globalThis as any, new ResourceLoader());
