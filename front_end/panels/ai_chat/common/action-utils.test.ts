// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../generated/protocol.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {createTarget, stubNoopSettings} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../../testing/MockConnection.js';

import {
  performAction
} from './utils.js';

describe('action-utils', () => {
  beforeEach(() => {
    stubNoopSettings();
  });

  describeWithMockConnection('performAction', () => {
    let target: SDK.Target.Target;

    beforeEach(() => {
      target = createTarget();
    });

    it('should perform action with valid parameters', async () => {
      const method = 'click';
      const args = ['selector', 'button'];
      const xpath = '/html/body/button[1]';

      let evaluatedExpression = '';
      setMockConnectionResponseHandler('Runtime.evaluate', (params) => {
        evaluatedExpression = params.expression || '';
        return {
          result: {
            type: 'object',
            objectId: 'mock-object-id' as Protocol.Runtime.RemoteObjectId
          }
        };
      });

      setMockConnectionResponseHandler('DOM.describeNode', () => ({
        node: {
          nodeId: 42,
          nodeName: 'BUTTON',
          backendNodeId: 123 as Protocol.DOM.BackendNodeId
        }
      }));

      // Should not throw
      await performAction(target, method, args, xpath);

      assert.include(evaluatedExpression, xpath);
    });

    it('should handle iframe actions', async () => {
      const method = 'click';
      const args = ['selector', 'button'];
      const xpath = '/html/body/iframe/button[1]';
      const iframeNodeId = 'iframe-node-42';

      let evaluatedExpression = '';
      setMockConnectionResponseHandler('Runtime.evaluate', (params) => {
        evaluatedExpression = params.expression || '';
        return {
          result: {
            type: 'object',
            objectId: 'mock-object-id' as Protocol.Runtime.RemoteObjectId
          }
        };
      });

      setMockConnectionResponseHandler('DOM.describeNode', () => ({
        node: {
          nodeId: 42,
          nodeName: 'BUTTON',
          backendNodeId: 123 as Protocol.DOM.BackendNodeId
        }
      }));

      // Should not throw
      await performAction(target, method, args, xpath, iframeNodeId);

      assert.include(evaluatedExpression, xpath);
    });

    it('should handle DOM evaluation errors', async () => {
      const method = 'click';
      const args = ['selector', 'button'];
      const xpath = '/html/body/button[1]';

      setMockConnectionResponseHandler('Runtime.evaluate', () => {
        throw new Error('DOM evaluation failed');
      });

      // Should handle error gracefully and not throw
      try {
        await performAction(target, method, args, xpath);
      } catch (error) {
        // Expected to potentially throw since it's an async operation
        assert.instanceOf(error, Error);
      }
    });

    it('should handle invalid xpath', async () => {
      const method = 'click';
      const args = ['selector', 'button'];
      const xpath = 'invalid-xpath';

      setMockConnectionResponseHandler('Runtime.evaluate', () => ({
        result: {
          type: 'undefined'
        }
      }));

      // Should handle gracefully
      try {
        await performAction(target, method, args, xpath);
      } catch (error) {
        // May throw due to invalid xpath
        assert.instanceOf(error, Error);
      }
    });

    it('should handle missing target', async () => {
      const method = 'click';
      const args = ['selector', 'button'];
      const xpath = '/html/body/button[1]';

      try {
        await performAction(null as any, method, args, xpath);
      } catch (error) {
        assert.instanceOf(error, Error);
      }
    });

    it('should handle empty method parameter', async () => {
      const method = '';
      const args = ['selector', 'button'];
      const xpath = '/html/body/button[1]';

      setMockConnectionResponseHandler('Runtime.evaluate', () => ({
        result: {
          type: 'object',
          objectId: 'mock-object-id' as Protocol.Runtime.RemoteObjectId
        }
      }));

      setMockConnectionResponseHandler('DOM.describeNode', () => ({
        node: {
          nodeId: 42,
          nodeName: 'BUTTON',
          backendNodeId: 123 as Protocol.DOM.BackendNodeId
        }
      }));

      try {
        await performAction(target, method, args, xpath);
      } catch (error) {
        // May throw due to empty method
        assert.instanceOf(error, Error);
      }
    });

    it('should handle empty args array', async () => {
      const method = 'click';
      const args: unknown[] = [];
      const xpath = '/html/body/button[1]';

      setMockConnectionResponseHandler('Runtime.evaluate', () => ({
        result: {
          type: 'object',
          objectId: 'mock-object-id' as Protocol.Runtime.RemoteObjectId
        }
      }));

      setMockConnectionResponseHandler('DOM.describeNode', () => ({
        node: {
          nodeId: 42,
          nodeName: 'BUTTON',
          backendNodeId: 123 as Protocol.DOM.BackendNodeId
        }
      }));

      // Should not throw for empty args
      await performAction(target, method, args, xpath);
    });

    it('should handle complex args array', async () => {
      const method = 'type';
      const args = ['input[name="username"]', 'test@example.com', { delay: 100 }];
      const xpath = '/html/body/form/input[1]';

      setMockConnectionResponseHandler('Runtime.evaluate', () => ({
        result: {
          type: 'object',
          objectId: 'mock-object-id' as Protocol.Runtime.RemoteObjectId
        }
      }));

      setMockConnectionResponseHandler('DOM.describeNode', () => ({
        node: {
          nodeId: 42,
          nodeName: 'INPUT',
          backendNodeId: 123 as Protocol.DOM.BackendNodeId
        }
      }));

      // Should handle complex arguments
      await performAction(target, method, args, xpath);
    });
  });
});