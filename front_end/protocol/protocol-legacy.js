// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ProtocolModule from './protocol.js';

self.Protocol = self.Protocol || {};
Protocol = Protocol || {};

Protocol.DevToolsStubErrorCode = ProtocolModule.InspectorBackend.DevToolsStubErrorCode;

Protocol.SessionRouter = ProtocolModule.InspectorBackend.SessionRouter;

/** @constructor */
Protocol.InspectorBackend = ProtocolModule.InspectorBackend.InspectorBackend;

/** @interface */
Protocol.Connection = ProtocolModule.InspectorBackend.Connection;

/** @type {!ProtocolModule.InspectorBackend.InspectorBackend} */
Protocol.inspectorBackend = ProtocolModule.inspectorBackend;

Protocol.test = ProtocolModule.InspectorBackend.test;

/** @constructor */
Protocol.TargetBase = ProtocolModule.InspectorBackend.TargetBase;

/** @typedef {string} */
Protocol.Error = ProtocolModule.InspectorBackend.ProtocolError;

/** @constructor */
Protocol.NodeURL = ProtocolModule.NodeURL.NodeURL;

/**
 * Takes error and result.
 * @typedef {function(?Object, ?Object)}
 */
Protocol._Callback;
