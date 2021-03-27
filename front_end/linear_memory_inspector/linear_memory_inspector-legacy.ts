// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck

import * as LinearMemoryInspectorModule from './linear_memory_inspector.js';

self.LinearMemoryInspector = self.LinearMemoryInspector || {};
LinearMemoryInspector = LinearMemoryInspector || {};

LinearMemoryInspector.LinearMemoryInspectorPane =
    LinearMemoryInspectorModule.LinearMemoryInspectorPane.LinearMemoryInspectorPaneImpl;

/** @constructor */
LinearMemoryInspector.LinearMemoryInspectorPane.Wrapper = LinearMemoryInspectorModule.LinearMemoryInspectorPane.Wrapper;
