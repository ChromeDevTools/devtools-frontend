// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';

import * as ProtocolClient from './protocol_client.js';

describe('TargetBase', () => {
  describe('dispatch', () => {
    it('logs a protocol error for unknown domains', () => {
      const connection = new MockCDPConnection();
      const target = new ProtocolClient.InspectorBackend.TargetBase(null, 'session ID', connection);
      const reportStub = sinon.stub(ProtocolClient.InspectorBackend.InspectorBackend, 'reportProtocolError');

      const message: ProtocolClient.InspectorBackend.EventMessage = {
        sessionId: 'session ID',
        method: 'WrongDomain.somethingStrange' as ProtocolClient.InspectorBackend.QualifiedName,
      };
      target.dispatch(message);

      sinon.assert.calledOnceWithExactly(
          reportStub,
          'Protocol Error: the message WrongDomain.somethingStrange is for non-existing domain \'WrongDomain\'',
          message);
    });

    it('logs a protocol error for unknown methods', () => {
      const connection = new MockCDPConnection();
      const target = new ProtocolClient.InspectorBackend.TargetBase(null, 'session ID', connection);
      target.registerRuntimeDispatcher({} as ProtocolProxyApi.RuntimeDispatcher);
      const reportStub = sinon.stub(ProtocolClient.InspectorBackend.InspectorBackend, 'reportProtocolWarning');

      const message: ProtocolClient.InspectorBackend.EventMessage = {
        sessionId: 'session ID',
        method: 'Runtime.somethingStrange' as ProtocolClient.InspectorBackend.QualifiedName,
      };
      target.dispatch(message);

      sinon.assert.calledOnceWithExactly(
          reportStub, 'Protocol Warning: Attempted to dispatch an unspecified event \'Runtime.somethingStrange\'',
          message);
    });
  });
});
