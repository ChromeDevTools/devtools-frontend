// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Host from '../../core/host/host.js';

export type Loggable = Element|Host.InspectorFrontendHostAPI.ContextMenuDescriptor|
                       Host.InspectorFrontendHostAPI.ContextMenuDescriptor[]|Symbol|object;
