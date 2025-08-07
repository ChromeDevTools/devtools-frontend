// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../generated/protocol.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {createTarget, stubNoopSettings} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../../testing/MockConnection.js';

import {
  getXPathByResolvedObjectId,
  getXPathByBackendNodeId
} from './utils.js';

describe('xpath-utils', () => {
  beforeEach(() => {
    stubNoopSettings();
  });

  describeWithMockConnection('getXPathByResolvedObjectId', () => {
    let target: SDK.Target.Target;

    beforeEach(() => {
      target = createTarget();
    });

    it('should get XPath for resolved object ID', async () => {
      const mockObjectId = 'mock-object-123' as Protocol.Runtime.RemoteObjectId;
      const expectedXPath = '/html/body/div[1]/button[2]';

      // Mock DOM.describeNode to return backend node ID
      setMockConnectionResponseHandler('DOM.describeNode', () => ({
        node: {
          nodeId: 42,
          nodeName: 'BUTTON',
          backendNodeId: 123 as Protocol.DOM.BackendNodeId
        }
      }));

      // Mock DOM.getDocument for XPath building
      setMockConnectionResponseHandler('DOM.getDocument', () => ({
        root: {
          nodeId: 1,
          nodeName: 'HTML',
          nodeType: 1,
          backendNodeId: 1,
          children: [
            {
              nodeId: 2,
              nodeName: 'BODY',
              nodeType: 1,
              backendNodeId: 2,
              children: [
                {
                  nodeId: 3,
                  nodeName: 'DIV',
                  nodeType: 1,
                  backendNodeId: 3,
                  children: [
                    {
                      nodeId: 4,
                      nodeName: 'BUTTON',
                      nodeType: 1,
                      backendNodeId: 123
                    },
                    {
                      nodeId: 5,
                      nodeName: 'BUTTON',
                      nodeType: 1,
                      backendNodeId: 124
                    }
                  ]
                }
              ]
            }
          ]
        }
      }));

      const result = await getXPathByResolvedObjectId(target, mockObjectId);
      
      assert.isString(result);
      assert.include(result, 'button');
      assert.include(result, 'div');
      assert.include(result, 'body');
      assert.include(result, 'html');
    });

    it('should handle error when object ID is invalid', async () => {
      const invalidObjectId = 'invalid-object-id' as Protocol.Runtime.RemoteObjectId;

      setMockConnectionResponseHandler('DOM.describeNode', () => {
        throw new Error('Invalid object ID');
      });

      const result = await getXPathByResolvedObjectId(target, invalidObjectId);
      
      assert.isNull(result);
    });

    it('should handle missing backend node ID', async () => {
      const mockObjectId = 'mock-object-123' as Protocol.Runtime.RemoteObjectId;

      setMockConnectionResponseHandler('DOM.describeNode', () => ({
        node: {
          nodeId: 42,
          nodeName: 'BUTTON'
          // No backendNodeId
        }
      }));

      const result = await getXPathByResolvedObjectId(target, mockObjectId);
      
      assert.isNull(result);
    });
  });

  describeWithMockConnection('getXPathByBackendNodeId', () => {
    let target: SDK.Target.Target;

    beforeEach(() => {
      target = createTarget();
    });

    it('should get XPath for backend node ID', async () => {
      const backendNodeId = 123 as Protocol.DOM.BackendNodeId;

      // Mock DOM.getDocument with a complex tree structure
      setMockConnectionResponseHandler('DOM.getDocument', () => ({
        root: {
          nodeId: 1,
          nodeName: 'HTML',
          nodeType: 1,
          backendNodeId: 1,
          children: [
            {
              nodeId: 2,
              nodeName: 'HEAD',
              nodeType: 1,
              backendNodeId: 2,
              children: []
            },
            {
              nodeId: 3,
              nodeName: 'BODY',
              nodeType: 1,
              backendNodeId: 3,
              children: [
                {
                  nodeId: 4,
                  nodeName: 'NAV',
                  nodeType: 1,
                  backendNodeId: 4,
                  children: []
                },
                {
                  nodeId: 5,
                  nodeName: 'MAIN',
                  nodeType: 1,
                  backendNodeId: 5,
                  children: [
                    {
                      nodeId: 6,
                      nodeName: 'SECTION',
                      nodeType: 1,
                      backendNodeId: 6,
                      children: [
                        {
                          nodeId: 7,
                          nodeName: 'BUTTON',
                          nodeType: 1,
                          backendNodeId: 123 // Target node
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }));

      const result = await getXPathByBackendNodeId(target, backendNodeId);
      
      assert.isString(result);
      assert.include(result, '/html');
      assert.include(result, '/body');
      assert.include(result, '/main');
      assert.include(result, '/section');
      assert.include(result, '/button');
    });

    it('should handle non-existent backend node ID', async () => {
      const nonExistentBackendNodeId = 999 as Protocol.DOM.BackendNodeId;

      setMockConnectionResponseHandler('DOM.getDocument', () => ({
        root: {
          nodeId: 1,
          nodeName: 'HTML',
          nodeType: 1,
          backendNodeId: 1,
          children: [
            {
              nodeId: 2,
              nodeName: 'BODY',
              nodeType: 1,
              backendNodeId: 2,
              children: []
            }
          ]
        }
      }));

      const result = await getXPathByBackendNodeId(target, nonExistentBackendNodeId);
      
      assert.isNull(result);
    });

    it('should handle multiple nodes with same tag name', async () => {
      const backendNodeId = 125 as Protocol.DOM.BackendNodeId;

      setMockConnectionResponseHandler('DOM.getDocument', () => ({
        root: {
          nodeId: 1,
          nodeName: 'HTML',
          nodeType: 1,
          backendNodeId: 1,
          children: [
            {
              nodeId: 2,
              nodeName: 'BODY',
              nodeType: 1,
              backendNodeId: 2,
              children: [
                {
                  nodeId: 3,
                  nodeName: 'DIV',
                  nodeType: 1,
                  backendNodeId: 123
                },
                {
                  nodeId: 4,
                  nodeName: 'DIV',
                  nodeType: 1,
                  backendNodeId: 124
                },
                {
                  nodeId: 5,
                  nodeName: 'DIV',
                  nodeType: 1,
                  backendNodeId: 125 // Target is the third div
                }
              ]
            }
          ]
        }
      }));

      const result = await getXPathByBackendNodeId(target, backendNodeId);
      
      assert.isString(result);
      assert.include(result, 'div[3]'); // Should be the third div
    });

    it('should handle text and comment nodes', async () => {
      const backendNodeId = 124 as Protocol.DOM.BackendNodeId;

      setMockConnectionResponseHandler('DOM.getDocument', () => ({
        root: {
          nodeId: 1,
          nodeName: 'HTML',
          nodeType: 1,
          backendNodeId: 1,
          children: [
            {
              nodeId: 2,
              nodeName: 'BODY',
              nodeType: 1,
              backendNodeId: 2,
              children: [
                {
                  nodeId: 3,
                  nodeName: '#text',
                  nodeType: 3, // Text node
                  backendNodeId: 123
                },
                {
                  nodeId: 4,
                  nodeName: '#text',
                  nodeType: 3, // Text node
                  backendNodeId: 124 // Target text node
                },
                {
                  nodeId: 5,
                  nodeName: '#comment',
                  nodeType: 8, // Comment node
                  backendNodeId: 125
                }
              ]
            }
          ]
        }
      }));

      const result = await getXPathByBackendNodeId(target, backendNodeId);
      
      assert.isString(result);
      assert.include(result, 'text()[2]'); // Should be the second text node
    });

    it('should handle DOM.getDocument error', async () => {
      const backendNodeId = 123 as Protocol.DOM.BackendNodeId;

      setMockConnectionResponseHandler('DOM.getDocument', () => {
        throw new Error('Failed to get document');
      });

      const result = await getXPathByBackendNodeId(target, backendNodeId);
      
      assert.isNull(result);
    });
  });
});