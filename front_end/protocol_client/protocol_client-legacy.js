// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ProtocolClient from './protocol_client.js';

self.Protocol = self.Protocol || {};
Protocol = Protocol || {};

Protocol.DevToolsStubErrorCode = ProtocolClient.InspectorBackend.DevToolsStubErrorCode;

Protocol.SessionRouter = ProtocolClient.InspectorBackend.SessionRouter;

/** @constructor */
Protocol.InspectorBackend = ProtocolClient.InspectorBackend.InspectorBackend;

Protocol.InspectorBackend.ProtocolError = ProtocolClient.InspectorBackend.ProtocolError;

/** @interface */
Protocol.Connection = ProtocolClient.InspectorBackend.Connection;

/** @type {!ProtocolClient.InspectorBackend.InspectorBackend} */
Protocol.inspectorBackend = ProtocolClient.inspectorBackend;

Protocol.test = ProtocolClient.InspectorBackend.test;

/** @constructor */
Protocol.TargetBase = ProtocolClient.InspectorBackend.TargetBase;

/** @constructor */
Protocol.NodeURL = ProtocolClient.NodeURL.NodeURL;
