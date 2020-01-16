// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LayersModule from './layers.js';

self.Layers = self.Layers || {};
Layers = Layers || {};

/**
 * @constructor
 */
Layers.LayerTreeModel = LayersModule.LayerTreeModel.LayerTreeModel;

/** @enum {symbol} */
Layers.LayerTreeModel.Events = LayersModule.LayerTreeModel.Events;

/**
 * @constructor
 */
Layers.AgentLayer = LayersModule.LayerTreeModel.AgentLayer;

/**
 * @constructor
 */
Layers.LayersPanel = LayersModule.LayersPanel.LayersPanel;
