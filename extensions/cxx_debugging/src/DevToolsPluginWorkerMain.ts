// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {RPCInterface} from './DevToolsPluginWorker.js';
import {ResourceLoader} from './MEMFSResourceLoader.js';

new RPCInterface(globalThis as any, new ResourceLoader());
