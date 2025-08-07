// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../generated/protocol.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {createTarget, stubNoopSettings} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../../testing/MockConnection.js';

import {
  getVisibleAccessibilityTree
} from './utils.js';
import type {AccessibilityNode} from './context.js';

describe('accessibility-utils', () => {
  beforeEach(() => {
    stubNoopSettings();
  });

  describeWithMockConnection('getVisibleAccessibilityTree', () => {
    let target: SDK.Target.Target;

    beforeEach(() => {
      target = createTarget();
    });

    it('should get visible accessibility tree with viewport elements', async () => {
      const mockAccessibilityNodes: Protocol.Accessibility.AXNode[] = [
        {
          nodeId: '1' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'WebArea' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Test Page' },
          parentId: undefined,
          childIds: ['2', '3'] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 1 as Protocol.DOM.BackendNodeId
        },
        {
          nodeId: '2' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'button' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Visible Button' },
          parentId: '1' as Protocol.Accessibility.AXNodeId,
          childIds: [] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 2 as Protocol.DOM.BackendNodeId
        },
        {
          nodeId: '3' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'button' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Hidden Button' },
          parentId: '1' as Protocol.Accessibility.AXNodeId,
          childIds: [] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 3 as Protocol.DOM.BackendNodeId
        }
      ];

      // Mock accessibility tree
      setMockConnectionResponseHandler('Accessibility.getFullAXTree', () => ({
        nodes: mockAccessibilityNodes
      }));

      // Mock DOM document
      setMockConnectionResponseHandler('DOM.getDocument', () => ({
        root: {
          nodeId: 1,
          nodeName: 'HTML',
          nodeType: 1,
          backendNodeId: 1,
          children: [
            {
              nodeId: 2,
              nodeName: 'BUTTON',
              nodeType: 1,
              backendNodeId: 2,
              children: []
            },
            {
              nodeId: 3,
              nodeName: 'BUTTON',
              nodeType: 1,
              backendNodeId: 3,
              children: []
            }
          ]
        }
      }));

      // Mock scrollable elements function initialization
      setMockConnectionResponseHandler('Runtime.evaluate', (params) => {
        if (params.expression?.includes('window.getScrollableElementXpaths')) {
          return {
            result: {
              type: 'object',
              value: []
            }
          };
        }
        if (params.expression?.includes('findElementsInViewport')) {
          // Mock returning only the first button as visible
          return {
            result: {
              type: 'object',
              value: [2] // Only backendNodeId 2 is in viewport
            }
          };
        }
        return {
          result: { type: 'undefined' }
        };
      });

      const result = await getVisibleAccessibilityTree(target);

      assert.isNotNull(result);
      assert.property(result, 'tree');
      assert.property(result, 'simplified');
      assert.property(result, 'scrollableContainerNodes');
      
      assert.isArray(result.tree);
      assert.isString(result.simplified);
      assert.isArray(result.scrollableContainerNodes);

      // Should have filtered tree with only visible elements
      assert.isAbove(result.tree.length, 0);
      assert.include(result.simplified, 'Visible Button');
    });

    it('should handle empty viewport elements', async () => {
      const mockAccessibilityNodes: Protocol.Accessibility.AXNode[] = [
        {
          nodeId: '1' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'WebArea' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Empty Page' },
          parentId: undefined,
          childIds: [] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 1 as Protocol.DOM.BackendNodeId
        }
      ];

      setMockConnectionResponseHandler('Accessibility.getFullAXTree', () => ({
        nodes: mockAccessibilityNodes
      }));

      setMockConnectionResponseHandler('DOM.getDocument', () => ({
        root: {
          nodeId: 1,
          nodeName: 'HTML',
          nodeType: 1,
          backendNodeId: 1,
          children: []
        }
      }));

      setMockConnectionResponseHandler('Runtime.evaluate', (params) => {
        if (params.expression?.includes('findElementsInViewport')) {
          return {
            result: {
              type: 'object',
              value: [] // No elements in viewport
            }
          };
        }
        return {
          result: { type: 'undefined' }
        };
      });

      const result = await getVisibleAccessibilityTree(target);

      assert.isNotNull(result);
      assert.isArray(result.tree);
      assert.isString(result.simplified);
      assert.isArray(result.scrollableContainerNodes);
    });

    it('should handle viewport detection errors gracefully', async () => {
      const mockAccessibilityNodes: Protocol.Accessibility.AXNode[] = [
        {
          nodeId: '1' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'WebArea' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Test Page' },
          parentId: undefined,
          childIds: ['2'] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 1 as Protocol.DOM.BackendNodeId
        },
        {
          nodeId: '2' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'button' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Button' },
          parentId: '1' as Protocol.Accessibility.AXNodeId,
          childIds: [] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 2 as Protocol.DOM.BackendNodeId
        }
      ];

      setMockConnectionResponseHandler('Accessibility.getFullAXTree', () => ({
        nodes: mockAccessibilityNodes
      }));

      setMockConnectionResponseHandler('DOM.getDocument', () => ({
        root: {
          nodeId: 1,
          nodeName: 'HTML',
          nodeType: 1,
          backendNodeId: 1,
          children: []
        }
      }));

      setMockConnectionResponseHandler('Runtime.evaluate', (params) => {
        if (params.expression?.includes('findElementsInViewport')) {
          throw new Error('Viewport detection failed');
        }
        return {
          result: { type: 'undefined' }
        };
      });

      const result = await getVisibleAccessibilityTree(target);

      // Should still return a result even if viewport detection fails
      assert.isNotNull(result);
      assert.property(result, 'tree');
      assert.property(result, 'simplified');
      assert.property(result, 'scrollableContainerNodes');
    });

    it('should filter tree based on visible elements', async () => {
      const mockAccessibilityNodes: Protocol.Accessibility.AXNode[] = [
        {
          nodeId: '1' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'WebArea' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Page' },
          parentId: undefined,
          childIds: ['2', '3', '4'] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 1 as Protocol.DOM.BackendNodeId
        },
        {
          nodeId: '2' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'button' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Button 1' },
          parentId: '1' as Protocol.Accessibility.AXNodeId,
          childIds: [] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 2 as Protocol.DOM.BackendNodeId
        },
        {
          nodeId: '3' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'button' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Button 2' },
          parentId: '1' as Protocol.Accessibility.AXNodeId,
          childIds: [] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 3 as Protocol.DOM.BackendNodeId
        },
        {
          nodeId: '4' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'button' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Button 3' },
          parentId: '1' as Protocol.Accessibility.AXNodeId,
          childIds: [] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 4 as Protocol.DOM.BackendNodeId
        }
      ];

      setMockConnectionResponseHandler('Accessibility.getFullAXTree', () => ({
        nodes: mockAccessibilityNodes
      }));

      setMockConnectionResponseHandler('DOM.getDocument', () => ({
        root: {
          nodeId: 1,
          nodeName: 'HTML',
          nodeType: 1,
          backendNodeId: 1,
          children: []
        }
      }));

      setMockConnectionResponseHandler('Runtime.evaluate', (params) => {
        if (params.expression?.includes('findElementsInViewport')) {
          // Only buttons 1 and 3 are visible
          return {
            result: {
              type: 'object',
              value: [2, 4] // backendNodeIds 2 and 4
            }
          };
        }
        return {
          result: { type: 'undefined' }
        };
      });

      const result = await getVisibleAccessibilityTree(target);

      assert.isNotNull(result);
      
      // Should include visible buttons
      assert.include(result.simplified, 'Button 1');
      assert.include(result.simplified, 'Button 3');
      
      // Should exclude hidden button
      assert.notInclude(result.simplified, 'Button 2');
    });

    it('should handle complex nested structures with visibility filtering', async () => {
      const mockAccessibilityNodes: Protocol.Accessibility.AXNode[] = [
        {
          nodeId: '1' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'WebArea' },
          parentId: undefined,
          childIds: ['2'] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 1 as Protocol.DOM.BackendNodeId
        },
        {
          nodeId: '2' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'main' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Main Content' },
          parentId: '1' as Protocol.Accessibility.AXNodeId,
          childIds: ['3', '4'] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 2 as Protocol.DOM.BackendNodeId
        },
        {
          nodeId: '3' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'section' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Visible Section' },
          parentId: '2' as Protocol.Accessibility.AXNodeId,
          childIds: ['5'] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 3 as Protocol.DOM.BackendNodeId
        },
        {
          nodeId: '4' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'section' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Hidden Section' },
          parentId: '2' as Protocol.Accessibility.AXNodeId,
          childIds: ['6'] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 4 as Protocol.DOM.BackendNodeId
        },
        {
          nodeId: '5' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'button' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Visible Button' },
          parentId: '3' as Protocol.Accessibility.AXNodeId,
          childIds: [] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 5 as Protocol.DOM.BackendNodeId
        },
        {
          nodeId: '6' as Protocol.Accessibility.AXNodeId,
          ignored: false,
          role: { type: Protocol.Accessibility.AXValueType.Role, value: 'button' },
          name: { type: Protocol.Accessibility.AXValueType.ComputedString, value: 'Hidden Button' },
          parentId: '4' as Protocol.Accessibility.AXNodeId,
          childIds: [] as Protocol.Accessibility.AXNodeId[],
          backendDOMNodeId: 6 as Protocol.DOM.BackendNodeId
        }
      ];

      setMockConnectionResponseHandler('Accessibility.getFullAXTree', () => ({
        nodes: mockAccessibilityNodes
      }));

      setMockConnectionResponseHandler('DOM.getDocument', () => ({
        root: {
          nodeId: 1,
          nodeName: 'HTML',
          nodeType: 1,
          backendNodeId: 1,
          children: []
        }
      }));

      setMockConnectionResponseHandler('Runtime.evaluate', (params) => {
        if (params.expression?.includes('findElementsInViewport')) {
          // Only the visible section and button are in viewport
          return {
            result: {
              type: 'object',
              value: [3, 5] // backendNodeIds for visible section and button
            }
          };
        }
        return {
          result: { type: 'undefined' }
        };
      });

      const result = await getVisibleAccessibilityTree(target);

      assert.isNotNull(result);
      
      // Should include visible content
      assert.include(result.simplified, 'Main Content');
      assert.include(result.simplified, 'Visible Section');
      assert.include(result.simplified, 'Visible Button');
      
      // Should exclude hidden content
      assert.notInclude(result.simplified, 'Hidden Section');
      assert.notInclude(result.simplified, 'Hidden Button');
      
      // Check that the tree structure preserves hierarchy
      assert.isAbove(result.tree.length, 0);
      const mainElement = result.tree.find(node => node.role === 'main');
      assert.exists(mainElement);
      assert.exists(mainElement?.children);
      assert.isAbove(mainElement!.children!.length, 0);
    });
  });
});