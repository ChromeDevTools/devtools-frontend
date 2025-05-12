// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Portions of this code are derived from Stagehand (https://github.com/browserbase/stagehand)
// Copyright (c) 2025 Browserbase. All rights reserved.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file at https://github.com/browserbase/stagehand/blob/main/LICENSE

import type * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';

import type { AccessibilityNode, IFrameAccessibilityNode, TreeResult } from './context.js';
import type { LogLine } from './log.js';

// Parser function for str output
export function formatSimplifiedTree(
  node: AccessibilityNode,
  level = 0,
): string {
  const indent = '  '.repeat(level);
  let result = `${indent}[${node.nodeId}] ${node.role}${
    node.name ? `: ${node.name}` : ''
  }\n`;

  if (node.children?.length) {
    result += node.children
      .map(child => formatSimplifiedTree(child, level + 1))
      .join('');
  }
  return result;
}

/**
 * Helper function to recursively build a subtree from a flat list of nodes.
 */
function buildSubtreeRecursive(nodeId: string, nodeMap: Map<string, AccessibilityNode>): AccessibilityNode | null {
  // Check if nodeId is negative, and skip it if so
  const nodeIdNum = parseInt(nodeId, 10);
  if (isNaN(nodeIdNum) || nodeIdNum < 0) {
    return null; // Skip nodes with negative IDs
  }

  const currentNode = nodeMap.get(nodeId);
  if (!currentNode) {
    return null;
  }

  // Create a copy to avoid modifying the original map data
  const newNode: AccessibilityNode = {
     ...currentNode,
     children: [], // Initialize children array
  };

  if (currentNode.childIds && currentNode.childIds.length > 0) {
    newNode.children = currentNode.childIds
      .map(childId => buildSubtreeRecursive(childId, nodeMap))
      .filter((child): child is AccessibilityNode => child !== null); // Filter out null results if a child isn't found
  }

  // Clear childIds from the copied node as we now use the children array
  delete newNode.childIds;
  delete newNode.parentId; // Parent isn't relevant for the isolated subtree formatting

  return newNode;
}

/**
 * Finds a node by its ID in a flat list, reconstructs its subtree,
 * and returns the formatted string representation using formatSimplifiedTree.
 *
 * @param targetNodeId The ID of the root node of the subtree to format.
 * @param allNodes The flat list of all AccessibilityNode objects (mapped from CDP).
 * @returns The formatted string for the subtree, or null if the target node is not found.
 */
export function getFormattedSubtreeByNodeId(targetNodeId: string, allNodes: AccessibilityNode[]): string | null {
  // 1. Create a map for efficient lookup
  const nodeMap = new Map<string, AccessibilityNode>();
  allNodes.forEach(node => {
    if (node.nodeId) {
       // Store the original node data, including childIds
       nodeMap.set(node.nodeId, node);
    }
  });

  // 2. Check if the target node exists
  if (!nodeMap.has(targetNodeId)) {
    console.warn(`Node with ID ${targetNodeId} not found in the provided list.`);
    return null;
  }

  // 3. Recursively build the subtree structure starting from the target node
  const subtreeRoot = buildSubtreeRecursive(targetNodeId, nodeMap);

  // 4. Format the reconstructed subtree
  if (subtreeRoot) {
    // Start formatting at level 0 for the root of the subtree
    return formatSimplifiedTree(subtreeRoot, 0);
  }

  return null; // Should not happen if targetNodeId exists, but as a fallback
}

/**
 * Helper function to remove or collapse unnecessary structural nodes
 * Handles three cases:
 * 1. Removes generic/none nodes with no children
 * 2. Collapses generic/none nodes with single child
 * 3. Keeps generic/none nodes with multiple children but cleans their subtrees
 *    and attempts to resolve their role to a DOM tag name
 */
async function cleanStructuralNodes(
  node: AccessibilityNode,
  target?: SDK.Target.Target,
  logger?: (logLine: LogLine) => void,
): Promise<AccessibilityNode | null> {
  // 1) Filter out nodes with negative IDs
  if (node.nodeId && parseInt(node.nodeId, 10) < 0) {
    return null;
  }

  // 2) Base case: if no children exist, this is effectively a leaf.
  //    If it's "generic" or "none", we remove it; otherwise, keep it.
  if (!node.children || node.children.length === 0) {
    return node.role === 'generic' || node.role === 'none' ? null : node;
  }

  // 3) Recursively clean children
  const cleanedChildrenPromises = node.children.map(child =>
    cleanStructuralNodes(child, target, logger),
  );
  const resolvedChildren = await Promise.all(cleanedChildrenPromises);
  const cleanedChildren = resolvedChildren.filter(
    (child): child is AccessibilityNode => {
      if (child === null) {
        return false;
      }
      // *** Optimization: Remove ListMarker nodes ***
      if (child.role === 'ListMarker') {
        return false;
      }
      // *** Optimization: Remove empty/short StaticText nodes ***
      if (child.role === 'StaticText') {
        const name = child.name?.trim();
        if (!name || name.length <= 1) {
          return false; // Filter out this node
        }
      }
      return true; // Keep other nodes
    }
  );

  // *** Optimization: Simplify footnote structure ***
  if (node.role === 'superscript' && cleanedChildren.length === 1) {
    const child = cleanedChildren[0];
    // Match link names like "[1]" or "1"
    const footnoteMatch = child.name?.match(/^\[?(\d+)\]?$/);
    if (child.role === 'link' && footnoteMatch) {
      // Return a simplified node using the LINK's ID and backendDOMNodeId
      return {
        role: 'footnote_ref',
        name: child.name, // Use the link's name (e.g., "[1]")
        nodeId: child.nodeId,
        // Include backendDOMNodeId if the link had one
        ...(child.backendDOMNodeId !== undefined && { backendDOMNodeId: child.backendDOMNodeId }),
        children: undefined, // Remove children
      };
    }
  }

  // 4) **Prune** "generic" or "none" nodes first,
  //    before resolving them to their tag names.
  if (node.role === 'generic' || node.role === 'none') {
    if (cleanedChildren.length === 1) {
      // Collapse single-child structural node
      return cleanedChildren[0];
    } if (cleanedChildren.length === 0) {
      // Remove empty structural node
      return null;
    }
    // If we have multiple children, we keep this node as a container.
    // We'll update role below if needed.
  }

  // 5) If we still have a "generic"/"none" node after pruning
  //    (i.e., because it had multiple children), now we try
  //    to resolve and replace its role with the DOM tag name.
  // *** Optimization: Commented out the following block to prevent resolving generic/none to tag names ***
  /*
  if (
    target &&
    logger &&
    node.backendDOMNodeId !== undefined &&
    (node.role === 'generic' || node.role === 'none')
  ) {
    try {
      // Use DOM agent
      const domAgent = target.domAgent();

      const response = await domAgent.invoke_resolveNode({
        backendNodeId: node.backendDOMNodeId as Protocol.DOM.BackendNodeId,
      });

      const objectId = response.object?.objectId;

      if (objectId) {
        try {
          // Get the tagName for the node
          const runtimeAgent = target.runtimeAgent();
          const result = await runtimeAgent.invoke_callFunctionOn({
            objectId: objectId as Protocol.Runtime.RemoteObjectId,
            functionDeclaration: `
              function() {
                return this.tagName ? this.tagName.toLowerCase() : "";
              }
            `,
            returnByValue: true,
          });

          // If we got a tagName, update the node's role
          if (result.result?.value) {
            node.role = result.result.value;
          }
        } catch (tagNameError) {
          logger({
            category: 'observation',
            message: `Could not fetch tagName for node ${node.backendDOMNodeId}`,
            level: 2,
            auxiliary: {
              error: {
                value: tagNameError instanceof Error ? tagNameError.message : String(tagNameError),
                type: 'string',
              },
            },
          });
        }
      }
    } catch (resolveError) {
      logger({
        category: 'observation',
        message: `Could not resolve DOM node ID ${node.backendDOMNodeId}`,
        level: 2,
        auxiliary: {
          error: {
            value: resolveError instanceof Error ? resolveError.message : String(resolveError),
            type: 'string',
          },
        },
      });
    }
  }
  */

  // Optimization: Collapse single StaticText child if its name matches the parent's name
  let finalChildren = cleanedChildren;
  if (node.name && cleanedChildren.length === 1) {
    const child = cleanedChildren[0];
    if (child.role === 'StaticText' && child.name === node.name) {
      finalChildren = []; // Remove the redundant child
    }
  }

  // 6) Return the updated node.
  //    If it has children, update them; otherwise keep it as-is.
  return finalChildren.length > 0
    ? { ...node, children: finalChildren }
    : { ...node, children: undefined }; // Ensure nodes without children don't have an empty array
}

/**
 * Builds a hierarchical tree structure from a flat array of accessibility nodes.
 * The function processes nodes in multiple passes to create a clean, meaningful tree.
 * @param nodes - Flat array of accessibility nodes from the CDP
 * @returns Object containing both the tree structure and a simplified string representation
 */
export async function buildHierarchicalTree(
  nodes: AccessibilityNode[],
  target?: SDK.Target.Target,
  logger?: (logLine: LogLine) => void,
  // Add parameter to receive scrollable IDs
  scrollableBackendIds?: Set<number>,
): Promise<TreeResult> {
  // Map to store processed nodes for quick lookup
  const nodeMap = new Map<string, AccessibilityNode>();
  const iframeList: AccessibilityNode[] = [];
  // List to store identified scrollable container nodes
  const scrollableNodesList: Array<{nodeId: string, backendDOMNodeId?: number, name?: string, role: string}> = [];

  // First pass: Create nodes that are meaningful
  // We only keep nodes that either have a name or children to avoid cluttering the tree
  nodes.forEach(node => {
    // Skip node if its ID is negative (e.g., "-1000002014")
    if (!node.nodeId) { return; }

    const nodeIdValue = parseInt(node.nodeId, 10);
    if (nodeIdValue < 0) {
      return;
    }

    const hasChildren = node.childIds && node.childIds.length > 0;
    const hasValidName = node.name && node.name.trim() !== '';
    const isInteractive =
      node.role !== 'none' &&
      node.role !== 'generic' &&
      node.role !== 'InlineTextBox'; // add other interactive roles here

    // Include nodes that are either named, have children, or are interactive
    if (!hasValidName && !hasChildren && !isInteractive) {
      return;
    }

    // Create a clean node object with only relevant properties
    if (node.nodeId) {
      const cleanNode: AccessibilityNode = {
        role: node.role || '',
        nodeId: node.nodeId,
        ...(hasValidName && { name: node.name }), // Only include name if it exists and isn't empty
        ...(node.description && { description: node.description }),
        ...(node.value && { value: node.value }),
        ...(node.backendDOMNodeId !== undefined && {
          backendDOMNodeId: node.backendDOMNodeId,
        }),
      };
      nodeMap.set(node.nodeId, cleanNode);

      // Check if this node corresponds to a scrollable container
      if (scrollableBackendIds && node.backendDOMNodeId !== undefined && scrollableBackendIds.has(node.backendDOMNodeId)) {
        scrollableNodesList.push({
          nodeId: node.nodeId,
          backendDOMNodeId: node.backendDOMNodeId,
          name: cleanNode.name,
          role: cleanNode.role, // Use the potentially modified role (e.g., 'scrollable, div') if needed later
        });
      }
    }
  });

  // Second pass: Establish parent-child relationships
  // This creates the actual tree structure by connecting nodes based on parentId
  nodes.forEach(node => {
    if (!node.nodeId) { return; }

    // Add iframes to a list and include in the return object
    const isIframe = node.role === 'Iframe';
    if (isIframe) {
      const iframeNode = {
        role: node.role || '',
        nodeId: node.nodeId,
      };
      iframeList.push(iframeNode);
    }
    if (node.parentId && node.nodeId && nodeMap.has(node.nodeId)) {
      const parentNode = nodeMap.get(node.parentId);
      const currentNode = nodeMap.get(node.nodeId);

      if (parentNode && currentNode) {
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(currentNode);
      }
    }
  });

  // Final pass: Build the root-level tree and clean up structural nodes
  const rootNodes = nodes
    .filter(node => !node.parentId && node.nodeId && nodeMap.has(node.nodeId)) // Get root nodes
    .map(node => node.nodeId ? nodeMap.get(node.nodeId) : undefined)
    .filter(Boolean) as AccessibilityNode[];

  const cleanedTreePromises = rootNodes.map(node =>
    cleanStructuralNodes(node, target, logger),
  );
  const finalTree = (await Promise.all(cleanedTreePromises)).filter(
    Boolean,
  ) as AccessibilityNode[];

  // Generate a simplified string representation of the tree
  const simplified = finalTree.map(node => formatSimplifiedTree(node)).join('\n');

  return {
    tree: finalTree,
    simplified,
    iframes: iframeList,
    // Add the collected scrollable nodes to the result
    scrollableContainerNodes: scrollableNodesList,
  };
}

/**
 * Retrieves the full accessibility tree via CDP and transforms it into a hierarchical structure.
 */
export async function getAccessibilityTree(
  target: SDK.Target.Target,
  logger: (logLine: LogLine) => void,
): Promise<TreeResult> {
  try {
    // Identify which elements are scrollable and get their backendNodeIds
    const scrollableBackendIds = await findScrollableElementIds(target);

    // Fetch the full accessibility tree using SDK's accessibilityAgent
    const accessibilityAgent = target.accessibilityAgent();
    const response = await accessibilityAgent.invoke_getFullAXTree({});
    const { nodes } = response;
    const startTime = Date.now();

    // Transform into hierarchical structure
    // First convert from CDP nodes to AccessibilityNode type which buildHierarchicalTree expects
    const accessibilityNodes = nodes.map(
      (node: Protocol.Accessibility.AXNode): AccessibilityNode => {
        // Map CDP nodes to AccessibilityNode format
        let roleValue =
          node.role && typeof node.role === 'object' && 'value' in node.role
            ? node.role.value
            : '';

        const nameValue =
          node.name && typeof node.name === 'object' && 'value' in node.name
            ? node.name.value
            : undefined;

        const descriptionValue =
          node.description &&
          typeof node.description === 'object' &&
          'value' in node.description
            ? node.description.value
            : undefined;

        const valueValue =
          node.value && typeof node.value === 'object' && 'value' in node.value
            ? node.value.value
            : undefined;

        const backendNodeId =
          typeof node.backendDOMNodeId === 'number'
            ? node.backendDOMNodeId
            : undefined;

        // Optional: Modify role if scrollable. Consider if this is needed or if tracking via ID is enough.
        // if (
        //   backendNodeId !== undefined &&
        //   scrollableBackendIds.has(backendNodeId)
        // ) {
        //   if (roleValue === 'generic' || roleValue === 'none') {
        //     roleValue = 'scrollable';
        //   } else {
        //     roleValue = roleValue ? `scrollable, ${roleValue}` : 'scrollable';
        //   }
        // }

        return {
          role: roleValue,
          name: nameValue,
          description: descriptionValue,
          value: valueValue,
          nodeId: node.nodeId,
          backendDOMNodeId: backendNodeId,
          parentId: node.parentId,
          childIds: node.childIds,
        };
      },
    );

    // Pass scrollableBackendIds to buildHierarchicalTree
    const hierarchicalTree = await buildHierarchicalTree(
      accessibilityNodes,
      target,
      logger,
      scrollableBackendIds, // Pass the set of scrollable IDs
    );

    logger({
      category: 'observation',
      message: `got accessibility tree in ${Date.now() - startTime}ms`,
      level: 1,
    });
    return hierarchicalTree;
  } catch (error) {
    logger({
      category: 'observation',
      message: 'Error getting accessibility tree',
      level: 1,
      auxiliary: {
        error: {
          value: error instanceof Error ? error.message : String(error),
          type: 'string',
        },
        trace: {
          value: error instanceof Error && error.stack ? error.stack : '',
          type: 'string',
        },
      },
    });
    throw error;
  }
}

// This function is wrapped into a string and sent as a CDP command
// It is not meant to be actually executed here
const functionString = `
function getNodePath(el) {
  if (!el || (el.nodeType !== Node.ELEMENT_NODE && el.nodeType !== Node.TEXT_NODE)) {
    console.log("el is not a valid node type");
    return "";
  }

  const parts = [];
  let current = el;

  while (current && (current.nodeType === Node.ELEMENT_NODE || current.nodeType === Node.TEXT_NODE)) {
    let index = 0;
    let hasSameTypeSiblings = false;
    const siblings = current.parentElement
      ? Array.from(current.parentElement.childNodes)
      : [];

    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (
        sibling.nodeType === current.nodeType &&
        sibling.nodeName === current.nodeName
      ) {
        index = index + 1;
        hasSameTypeSiblings = true;
        if (sibling.isSameNode(current)) {
          break;
        }
      }
    }

    if (!current || !current.parentNode) break;
    if (current.nodeName.toLowerCase() === "html"){
      parts.unshift("html");
      break;
    }

    // text nodes are handled differently in XPath
    if (current.nodeName !== "#text") {
      const tagName = current.nodeName.toLowerCase();
      const pathIndex = hasSameTypeSiblings ? \`[\${index}]\` : "";
      parts.unshift(\`\${tagName}\${pathIndex}\`);
    }

    current = current.parentElement;
  }

  return parts.length ? \`/\${parts.join("/")}\` : "";
}`;

export async function getXPathByResolvedObjectId(
  target: SDK.Target.Target,
  resolvedObjectId: string,
): Promise<string> {
  const runtimeAgent = target.runtimeAgent();
  const response = await runtimeAgent.invoke_callFunctionOn({
    objectId: resolvedObjectId as Protocol.Runtime.RemoteObjectId,
    functionDeclaration: `function() {
      ${functionString}
      return getNodePath(this);
    }`,
    returnByValue: true,
  });

  return response.result?.value || '';
}

/**
 * Resolves a DOM BackendNodeId to an XPath string
 * @param target - SDK target instance
 * @param backendNodeId - DOM BackendNodeId to resolve
 * @returns A Promise that resolves to an XPath string or empty string if resolution fails
 */
export async function getXPathByBackendNodeId(
  target: SDK.Target.Target,
  backendNodeId: Protocol.DOM.BackendNodeId,
): Promise<string> {
  try {
    // First resolve the backendNodeId to an object reference
    const domAgent = target.domAgent();
    const response = await domAgent.invoke_resolveNode({
      backendNodeId
    });

    if (!response.object || !response.object.objectId) {
      return '';
    }

    const objectId = response.object.objectId;

    // Then get the XPath using the resolved object
    return await getXPathByResolvedObjectId(target, objectId);
  } catch (error) {
    console.error('Error resolving BackendNodeId to XPath:', error);
    return '';
  }
}

/**
 * Initialize the getScrollableElementXpaths function in the browser
 */
async function initializeScrollableElementsFunction(target: SDK.Target.Target): Promise<void> {
  const runtimeAgent = target.runtimeAgent();
  await runtimeAgent.invoke_evaluate({
    expression: `
      if (!window.getScrollableElementXpaths) {
        window.getScrollableElementXpaths = function() {
          // Get the root <html> element
          const docEl = document.documentElement;
          const scrollableElements = [docEl];
          const allElements = Array.from(document.querySelectorAll('*'));

          const canElementScroll = (element) => {
            const style = window.getComputedStyle(element);
            const hasScrollableStyle =
              style.overflowY === 'auto' ||
              style.overflowY === 'scroll' ||
              style.overflowX === 'auto' ||
              style.overflowX === 'scroll';

            const isScrollable =
              element.scrollHeight > element.clientHeight ||
              element.scrollWidth > element.clientWidth;

            return hasScrollableStyle && isScrollable;
          };

          // Find all scrollable elements
          for (const element of allElements) {
            if (canElementScroll(element)) {
              scrollableElements.push(element);
            }
          }

          // Convert to XPaths
          const xpaths = [];
          for (const element of scrollableElements) {
            const xpath = getXPathForElement(element);
            if (xpath) {
              xpaths.push(xpath);
            }
          }

          return xpaths;
        };

        // Helper function to get XPath for an element
        function getXPathForElement(element) {
          const paths = [];
          let current = element;

          while (current && current.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let hasSiblings = false;

            // Check if the element has siblings with the same tag name
            for (let sibling = current.previousSibling; sibling; sibling = sibling.previousSibling) {
              if (sibling.nodeType === Node.ELEMENT_NODE &&
                  sibling.tagName === current.tagName) {
                index++;
                hasSiblings = true;
              }
            }

            const tagName = current.tagName.toLowerCase();
            const pathIndex = hasSiblings ? \`[\${index + 1}]\` : '';
            paths.unshift(\`\${tagName}\${pathIndex}\`);

            current = current.parentElement;
          }

          return paths.length ? \`/\${paths.join('/')}\` : '';
        }
      }
    `,
    includeCommandLineAPI: false,
    returnByValue: false,
  });
}

/**
 * `findScrollableElementIds` is a function that identifies elements in
 * the browser that are deemed "scrollable". At a high level, it does the
 * following:
 * - Calls the browser-side `window.getScrollableElementXpaths()` function,
 *   which returns a list of XPaths for scrollable containers.
 * - Iterates over the returned list of XPaths, locating each element in the DOM
 *   using CDP
 *     - During each iteration, we call `Runtime.evaluate` to run `document.evaluate(...)`
 *       with each XPath, obtaining a `RemoteObject` reference if it exists.
 *     - Then, for each valid object reference, we call `DOM.describeNode` to retrieve
 *       the element's `backendNodeId`.
 * - Collects all resulting `backendNodeId`s in a Set and returns them.
 *
 * @param target - SDK target instance
 * @returns A Promise that resolves to a Set of unique `backendNodeId`s corresponding
 *          to scrollable elements in the DOM.
 */
export async function findScrollableElementIds(
  target: SDK.Target.Target,
): Promise<Set<number>> {
  // Initialize the function in the page if it doesn't exist
  await initializeScrollableElementsFunction(target);

  // Get the xpaths of the scrollable elements
  // Using evaluate to call the browser function that returns scrollable element xpaths
  const runtimeAgent = target.runtimeAgent();
  const evaluateResult = await runtimeAgent.invoke_evaluate({
    expression: 'window.getScrollableElementXpaths()',
    returnByValue: true
  });

  const xpaths = evaluateResult.result?.value as string[] || [];

  // Log scrollable element XPaths for debugging
  // Instead of console.debug, use a more appropriate logging mechanism
  // that doesn't trigger linter errors
  /* debug: Found scrollable elements:
     ${xpaths.join('\n')} */

  const scrollableBackendIds = new Set<number>();

  try {
    for (const xpath of xpaths) {
      if (!xpath) {continue;}

      // evaluate the XPath in the page
      const evaluateResponse = await runtimeAgent.invoke_evaluate({
        expression: `
          (function() {
            const res = document.evaluate(${JSON.stringify(
              xpath,
            )}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            return res.singleNodeValue;
          })();
        `,
        returnByValue: false,
      });

      const result = evaluateResponse.result;

      // if we have an objectId, call DOM.describeNode to get backendNodeId
      if (result?.objectId) {
        const domAgent = target.domAgent();
        const nodeResponse = await domAgent.invoke_describeNode({
          objectId: result.objectId,
        });

        const node = nodeResponse.node;

        if (node?.backendNodeId) {
          scrollableBackendIds.add(node.backendNodeId);
        }
      }
    }
  } catch (error) {
    console.error('Error finding scrollable element IDs:', error);
  }

  return scrollableBackendIds;
}

export async function performAction(
  target: SDK.Target.Target,
  method: string,
  args: unknown[],
  xpath: string,
): Promise<void> {
  // First locate element by XPath
  const runtimeAgent = target.runtimeAgent();
  const evaluateResult = await runtimeAgent.invoke_evaluate({
    expression: `
      (function() {
        const result = document.evaluate("${xpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return result.singleNodeValue;
      })()
    `,
    returnByValue: false
  });

  if (!evaluateResult.result?.objectId) {
    throw new Error(`Could not find element with xpath ${xpath}`);
  }

  const objectId = evaluateResult.result.objectId as Protocol.Runtime.RemoteObjectId;
  const domAgent = target.domAgent();
  const inputAgent = target.inputAgent();

  try {
    if (method === 'click') {
      // Use evaluate to scroll and click in one operation
      try {
        await runtimeAgent.invoke_callFunctionOn({
          objectId,
          functionDeclaration: `
            function() {
              // First scroll into view
              if ('scrollIntoView' in this) {
                this.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center'
                });
              }
              
              // Wait for scrolling to complete by monitoring element position
              return new Promise(resolve => {
                // Store initial position
                const initialRect = this.getBoundingClientRect();
                let lastTop = initialRect.top;
                let lastLeft = initialRect.left;
                let positionStableCount = 0;
                const maxWaitTime = 1000; // Maximum wait time in ms
                const startTime = Date.now();
                
                // Check position periodically
                const checkPosition = () => {
                  const currentRect = this.getBoundingClientRect();
                  const currentTop = currentRect.top;
                  const currentLeft = currentRect.left;
                  
                  // If position hasn't changed significantly
                  if (Math.abs(currentTop - lastTop) < 1 && Math.abs(currentLeft - lastLeft) < 1) {
                    positionStableCount++;
                    
                    // Position stable for 3 consecutive checks or max wait time reached
                    if (positionStableCount >= 3 || (Date.now() - startTime > maxWaitTime)) {
                      // Then click the element
                      this.click();
                      resolve(true);
                      return;
                    }
                  } else {
                    // Position is still changing, reset counter
                    positionStableCount = 0;
                  }
                  
                  // Update last position
                  lastTop = currentTop;
                  lastLeft = currentLeft;
                  
                  // Check again in 50ms
                  setTimeout(checkPosition, 50);
                };
                
                // Start checking
                setTimeout(checkPosition, 50);
              });
            }
          `,
          returnByValue: true,
          awaitPromise: true
        });
      } catch (e) {
        // If direct click fails, fall back to previous implementation
        console.warn(`Direct click failed, falling back to mouse events: ${e}`);
        
        // Get element coordinates
        const nodeResponse = await domAgent.invoke_describeNode({ objectId });
        if (!nodeResponse.node.backendNodeId) {
          throw new Error('Could not get backend node ID for element');
        }

        const boxModel = await domAgent.invoke_getBoxModel({
          backendNodeId: nodeResponse.node.backendNodeId as Protocol.DOM.BackendNodeId
        });

        if (!boxModel.model) {
          throw new Error('Could not get box model for element');
        }

        // Calculate center point
        const contentQuad = boxModel.model.content;
        const x = (contentQuad[0] + contentQuad[2] + contentQuad[4] + contentQuad[6]) / 4;
        const y = (contentQuad[1] + contentQuad[3] + contentQuad[5] + contentQuad[7]) / 4;

        // Perform click sequence
        await inputAgent.invoke_dispatchMouseEvent({
          type: Protocol.Input.DispatchMouseEventRequestType.MousePressed,
          x,
          y,
          button: Protocol.Input.MouseButton.Left,
          clickCount: 1
        });

        await inputAgent.invoke_dispatchMouseEvent({
          type: Protocol.Input.DispatchMouseEventRequestType.MouseReleased,
          x,
          y,
          button: Protocol.Input.MouseButton.Left,
          clickCount: 1
        });
      }
    } else if (method === 'hover') {
      // Get element coordinates
      const nodeResponse = await domAgent.invoke_describeNode({ objectId });
      if (!nodeResponse.node.backendNodeId) {
        throw new Error('Could not get backend node ID for element');
      }

      const boxModel = await domAgent.invoke_getBoxModel({
        backendNodeId: nodeResponse.node.backendNodeId as Protocol.DOM.BackendNodeId
      });

      if (!boxModel.model) {
        throw new Error('Could not get box model for element');
      }

      // Calculate center point
      const contentQuad = boxModel.model.content;
      const x = (contentQuad[0] + contentQuad[2] + contentQuad[4] + contentQuad[6]) / 4;
      const y = (contentQuad[1] + contentQuad[3] + contentQuad[5] + contentQuad[7]) / 4;

      // Perform hover
      await inputAgent.invoke_dispatchMouseEvent({
        type: Protocol.Input.DispatchMouseEventRequestType.MouseMoved,
        x,
        y
      });
    } else if (method === 'fill' || method === 'type') {
      const text = String(args[0] || '');

      // First focus the element
      await runtimeAgent.invoke_callFunctionOn({
        objectId,
        functionDeclaration: `
          function() {
            this.focus();
            if (this.value !== undefined) {
              this.value = "";
            }
            return true;
          }
        `,
        returnByValue: true
      });

      // Type each character
      for (const char of text) {
        await inputAgent.invoke_dispatchKeyEvent({
          type: Protocol.Input.DispatchKeyEventRequestType.KeyDown,
          text: char
        });

        await inputAgent.invoke_dispatchKeyEvent({
          type: Protocol.Input.DispatchKeyEventRequestType.KeyUp
        });
      }

      // Set the value and dispatch events
      await runtimeAgent.invoke_callFunctionOn({
        objectId,
        functionDeclaration: `
          function(value) {
            if (this instanceof HTMLInputElement || this instanceof HTMLTextAreaElement) {
              this.value = value;
              this.dispatchEvent(new Event('input', { bubbles: true }));
              this.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return true;
          }
        `,
        arguments: [{ value: text }],
        returnByValue: true
      });
    } else if (method === 'press') {
      const key = String(args[0] || '');

      // Press the key
      await inputAgent.invoke_dispatchKeyEvent({
        type: Protocol.Input.DispatchKeyEventRequestType.KeyDown,
        key
      });

      await inputAgent.invoke_dispatchKeyEvent({
        type: Protocol.Input.DispatchKeyEventRequestType.KeyUp,
        key
      });
    } else if (method === 'scrollIntoView') {
      // Scroll element into view
      await runtimeAgent.invoke_callFunctionOn({
        objectId,
        functionDeclaration: `
          function() {
            if ('scrollIntoView' in this) {
              this.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
            }
            return true;
          }
        `,
        returnByValue: true
      });
    } else {
      throw new Error(`Method ${method} not supported`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Gets the accessibility tree for only visible elements in the viewport
 */
export async function getVisibleAccessibilityTree(
  target: SDK.Target.Target,
  // Keep logger parameter for non-debug logs, but use console.log for debug
  logger: (logLine: LogLine) => void,
): Promise<TreeResult> {
  const startTime = Date.now();
  // Use console.log for debug message
  console.log('[DEBUG] Starting getVisibleAccessibilityTree...'); 
  try {
    // 1. Get the full accessibility tree data first
    const accessibilityAgent = target.accessibilityAgent();
    const fullTreeResponse = await accessibilityAgent.invoke_getFullAXTree({});
    const allCdpNodes = fullTreeResponse.nodes;

    if (!allCdpNodes || allCdpNodes.length === 0) {
      throw new Error('Full accessibility tree is empty.');
    }

    // --- DEBUG LOG: Full Tree --- 
    try {
      const fullAccessibilityNodes = allCdpNodes.map(
        (node: Protocol.Accessibility.AXNode): AccessibilityNode => {
          let roleValue = node.role && typeof node.role === 'object' && 'value' in node.role ? node.role.value : '';
          const nameValue = node.name && typeof node.name === 'object' && 'value' in node.name ? node.name.value : undefined;
          const descriptionValue = node.description && typeof node.description === 'object' && 'value' in node.description ? node.description.value : undefined;
          const valueValue = node.value && typeof node.value === 'object' && 'value' in node.value ? node.value.value : undefined;
          const backendNodeId = typeof node.backendDOMNodeId === 'number' ? node.backendDOMNodeId : undefined;
          const childIds = node.childIds;
          return {
            role: roleValue, name: nameValue, description: descriptionValue, value: valueValue,
            nodeId: node.nodeId, backendDOMNodeId: backendNodeId, parentId: node.parentId, childIds: childIds,
          };
        }
      );
      const fullTreeResult = await buildHierarchicalTree(fullAccessibilityNodes); // Use existing builder
      // Use console.log for debug message
      console.log('[DEBUG] Full Accessibility Tree (Simplified):\n', fullTreeResult.simplified);
    } catch (fullTreeError) {
        // Keep using logger for actual errors/warnings
        logger({
            category: 'observation', // Change category? maybe 'warning' or keep 'observation'
            message: 'Error generating full tree debug log', 
            level: 2,  
            auxiliary: { error: { value: fullTreeError instanceof Error ? fullTreeError.message : String(fullTreeError), type: 'string'}}
        });
    }
    // --- END DEBUG LOG ---

    // 2. Identify which elements are in the viewport
    const visibleBackendIds = await findElementsInViewport(target);
    // Use console.log for debug message
    console.log(`[DEBUG] Found ${visibleBackendIds.size} visible backendNodeIds:`, Array.from(visibleBackendIds));

    // If we couldn't find any visible elements, return empty
    if (visibleBackendIds.size === 0) {
      // Keep using logger for observation message
      logger({ category: 'observation', message: 'Could not identify any elements in the viewport.', level: 1});
      return { tree: [], simplified: '', iframes: [], scrollableContainerNodes: [] };
    }

    // 3. Build a map of the *full* tree for ancestor lookup
    const fullNodeMap = new Map<string, Protocol.Accessibility.AXNode>();
    allCdpNodes.forEach(node => fullNodeMap.set(node.nodeId, node));

    // 4. Determine the set of relevant node IDs (visible nodes + their ancestors)
    const relevantNodeIds = new Set<string>();
    const nodesToProcess: Protocol.Accessibility.AXNode[] = [];

    // Start with nodes that are directly visible
    allCdpNodes.forEach(node => {
      if (node.backendDOMNodeId !== undefined && visibleBackendIds.has(node.backendDOMNodeId)) {
        if (!relevantNodeIds.has(node.nodeId)) {
          relevantNodeIds.add(node.nodeId);
          nodesToProcess.push(node);
        }
      }
    });

    // Recursively add ancestors
    let currentNode: Protocol.Accessibility.AXNode | undefined;
    while ((currentNode = nodesToProcess.pop())) {
      if (currentNode.parentId) {
        const parentNode = fullNodeMap.get(currentNode.parentId);
        if (parentNode && !relevantNodeIds.has(parentNode.nodeId)) {
          relevantNodeIds.add(parentNode.nodeId);
          nodesToProcess.push(parentNode);
        }
      }
    }
    // Use console.log for debug message
    console.log(`[DEBUG] Found ${relevantNodeIds.size} relevant nodeIds (visible + ancestors):`, Array.from(relevantNodeIds));
    
    // 5. Filter the original CDP nodes and convert to AccessibilityNode format
    const relevantAccessibilityNodes = allCdpNodes
      .filter(node => relevantNodeIds.has(node.nodeId))
      .map((node: Protocol.Accessibility.AXNode): AccessibilityNode => {
         // Map CDP nodes to AccessibilityNode format (same as in getAccessibilityTree)
         let roleValue =
           node.role && typeof node.role === 'object' && 'value' in node.role
             ? node.role.value
             : '';

         const nameValue =
           node.name && typeof node.name === 'object' && 'value' in node.name
             ? node.name.value
             : undefined;

         const descriptionValue =
           node.description &&
           typeof node.description === 'object' &&
           'value' in node.description
             ? node.description.value
             : undefined;

         const valueValue =
           node.value && typeof node.value === 'object' && 'value' in node.value
             ? node.value.value
             : undefined;

         const backendNodeId =
           typeof node.backendDOMNodeId === 'number'
             ? node.backendDOMNodeId
             : undefined;

         // Keep original childIds for potential linking later
         const childIds = node.childIds;

         return {
           role: roleValue,
           name: nameValue,
           description: descriptionValue,
           value: valueValue,
           nodeId: node.nodeId,
           backendDOMNodeId: backendNodeId,
           parentId: node.parentId,
           // Store original childIds, filter them later during tree build
           childIds: childIds,
         };
      });

    // Check if we found any relevant nodes
    if (relevantAccessibilityNodes.length === 0) {
       logger({ category: 'observation', message: 'No relevant nodes (visible or ancestors) found.', level: 1});
       return { tree: [], simplified: '', iframes: [], scrollableContainerNodes: [] };
    }

    // Get scrollable elements (might need adjustment based on relevant nodes)
    const scrollableBackendIds = await findScrollableElementIds(target);

    // 6. Build the hierarchical tree using only relevant nodes
    // Create a map for the relevant nodes
    const relevantNodeMap = new Map<string, AccessibilityNode>();
    relevantAccessibilityNodes.forEach(node => {
       if (node.nodeId) {
         // Initialize with empty children, link below
         relevantNodeMap.set(node.nodeId, { ...node, children: [] });
       }
    });

    // Link children to parents *only if both are relevant*
    relevantAccessibilityNodes.forEach(node => {
       if (node.parentId && relevantNodeMap.has(node.parentId) && node.nodeId) {
         const parent = relevantNodeMap.get(node.parentId);
         const child = relevantNodeMap.get(node.nodeId);
         // Ensure childIds are also filtered to only include relevant children
         if (parent && child) {
           if (!parent.children) parent.children = [];
           // Check if child already added (safety)
           if (!parent.children.some(c => c.nodeId === child.nodeId)) {
              parent.children.push(child);
           }
         }
       }
    });

     // Filter childIds arrays on nodes in the map (optional, but cleaner)
     relevantNodeMap.forEach(node => {
        if (node.childIds) {
           node.childIds = node.childIds.filter(id => relevantNodeIds.has(id));
        }
     });

    // 7. Identify Root Nodes among relevant nodes
    const rootNodes = relevantAccessibilityNodes
      .filter(node => !node.parentId || !relevantNodeIds.has(node.parentId)) // Root if no parent OR parent isn't relevant
      .map(node => node.nodeId ? relevantNodeMap.get(node.nodeId) : undefined) // Get the node from the map (with children links)
      .filter((node): node is AccessibilityNode => node !== undefined);


    // 8. Clean the tree starting from the relevant roots
    const cleanedRootPromises = rootNodes.map(node =>
       cleanStructuralNodes(node, target, logger) // Keep logger for cleanStructuralNodes internal logs
    );
    const finalTree = (await Promise.all(cleanedRootPromises)).filter(Boolean) as AccessibilityNode[];


    // 9. Format Output
    // Explicitly use formatSimplifiedTree to create the string representation
    const simplified = finalTree.map(node => formatSimplifiedTree(node)).join('\n');
    // Use console.log for debug message
    console.log('[DEBUG] Final Visible Tree (Simplified):\n', simplified);

    // Find iframe nodes *among relevant nodes*
    const iframeNodes = relevantAccessibilityNodes.filter(node => node.role === 'Iframe');

    // Fetch iframe content if available (consider if iframe content should also be filtered by visibility?)
    // Current logic fetches full AX tree for the iframe
    const iframesWithContent = await Promise.all(
      iframeNodes.map(async (node): Promise<AccessibilityNode | IFrameAccessibilityNode> => {
        // ... (iframe content fetching logic remains largely the same) ...
        // We might want to adapt the iframe fetching to also consider visibility within the iframe
        // For now, keep the existing full-iframe-tree logic for simplicity
        try {
          const domAgent = target.domAgent();
          if (!node.backendDOMNodeId) {
            return node;
          }
          const domNodeResponse = await domAgent.invoke_describeNode({
            backendNodeId: node.backendDOMNodeId as Protocol.DOM.BackendNodeId
          });
          if (!domNodeResponse.node?.frameId) {
            return node; // No frameId found
          }
          const iframeResponse = await accessibilityAgent.invoke_getFullAXTree({
            frameId: domNodeResponse.node.frameId
          });
          if (!iframeResponse.nodes || iframeResponse.nodes.length === 0) {
            return node; // No accessibility data found for iframe
          }
          const iframeAccessibilityNodes = iframeResponse.nodes.map((iframeNode: Protocol.Accessibility.AXNode): AccessibilityNode => {
             // Mapping logic... (same as before)
            let roleValue =
              iframeNode.role && typeof iframeNode.role === 'object' && 'value' in iframeNode.role
                ? iframeNode.role.value
                : '';
            const nameValue =
              iframeNode.name && typeof iframeNode.name === 'object' && 'value' in iframeNode.name
                ? iframeNode.name.value
                : undefined;
            const descriptionValue =
              iframeNode.description &&
              typeof iframeNode.description === 'object' &&
              'value' in iframeNode.description
                ? iframeNode.description.value
                : undefined;
            const valueValue =
              iframeNode.value && typeof iframeNode.value === 'object' && 'value' in iframeNode.value
                ? iframeNode.value.value
                : undefined;
            const backendNodeId =
              typeof iframeNode.backendDOMNodeId === 'number'
                ? iframeNode.backendDOMNodeId
                : undefined;
            return {
              role: roleValue,
              name: nameValue,
              description: descriptionValue,
              value: valueValue,
              nodeId: iframeNode.nodeId,
              backendDOMNodeId: backendNodeId,
              parentId: iframeNode.parentId,
              childIds: iframeNode.childIds,
            };
          });
          const iframeTree = await buildHierarchicalTree(iframeAccessibilityNodes); // Consider if iframe needs target/logger/scrollableIds?
          return {
            ...node,
            contentTree: iframeTree.tree,
            contentSimplified: iframeTree.simplified
          } as IFrameAccessibilityNode;
        } catch (error) {
          logger({
            category: 'observation',
            message: `Error processing iframe content: ${String(error)}`,
            level: 2,
          });
          return node;
        }
      })
    );

    // Filter scrollable nodes to only include relevant ones
    const relevantScrollableNodes = Array.from(scrollableBackendIds)
        .map(id => {
            // Find the corresponding node in our relevant set
            const node = relevantAccessibilityNodes.find(n => n.backendDOMNodeId === id);
            return node ? {
              nodeId: node.nodeId || '',
              backendDOMNodeId: id,
              name: node.name,
              role: node.role
            } : null;
        })
        .filter(Boolean) as Array<{nodeId: string, backendDOMNodeId?: number, name?: string, role: string}>;


    logger({
      category: 'observation',
      message: `Got viewport accessibility tree. Initial nodes: ${allCdpNodes.length}, Visible backendIds: ${visibleBackendIds.size}, Relevant nodes (visible + ancestors): ${relevantNodeIds.size}, Final tree roots: ${finalTree.length}, Time: ${Date.now() - startTime}ms`,
      level: 1,
    });

    // Return the tree result with the simplified property explicitly set
    return {
      tree: finalTree,
      simplified,
      iframes: iframesWithContent,
      scrollableContainerNodes: relevantScrollableNodes
    };
  } catch (error) {
    logger({
      category: 'observation',
      message: 'Error getting viewport accessibility tree',
      level: 1,
      auxiliary: {
        error: {
          value: error instanceof Error ? error.message : String(error),
          type: 'string',
        },
        trace: {
          value: error instanceof Error && error.stack ? error.stack : '',
          type: 'string',
        },
      },
    });
    logger({ category: 'debug', message: `getVisibleAccessibilityTree failed after ${Date.now() - startTime}ms`, level: 2 }); // Set level explicitly
    throw error;
  }
}

/**
 * Identifies elements that are currently visible in the viewport
 */
async function findElementsInViewport(
  target: SDK.Target.Target
): Promise<Set<number>> {
  const visibleNodeIds = new Set<number>();
  
  try {
    // Inject and run the viewport detection code
    const runtimeAgent = target.runtimeAgent();
    const result = await runtimeAgent.invoke_evaluate({
      expression: `
        (function() {
          // Get viewport dimensions
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Find elements that are in the viewport
          const elements = [];
          
          function isElementVisible(el) {
            if (!el || !el.getBoundingClientRect) return false;
            
            // Get element position
            const rect = el.getBoundingClientRect();
            
            // Check if element has size
            if (rect.width === 0 || rect.height === 0) return false;
            
            // Check if element is in viewport
            const isInViewport = (
              rect.top < viewportHeight &&
              rect.bottom > 0 &&
              rect.left < viewportWidth &&
              rect.right > 0
            );
            
            if (!isInViewport) return false;
            
            // Check if element is visible
            const style = window.getComputedStyle(el);
            return !(
              style.display === 'none' ||
              style.visibility === 'hidden' ||
              parseFloat(style.opacity) === 0
            );
          }
          
          // Get all elements
          document.querySelectorAll('*').forEach(el => {
            if (isElementVisible(el)) {
              elements.push(el);
            }
          });
          
          return elements;
        })()
      `,
      returnByValue: false
    });
    
    // If we got a valid result, process each element
    if (result.result && result.result.objectId) {
      const domAgent = target.domAgent();
      
      // Get array length
      const lengthResult = await runtimeAgent.invoke_callFunctionOn({
        objectId: result.result.objectId,
        functionDeclaration: `function() { return this.length; }`,
        returnByValue: true
      });
      
      const length = lengthResult.result?.value || 0;
      
      // Process elements in batches to avoid overwhelming CDP
      const batchSize = 20;
      for (let i = 0; i < length; i += batchSize) {
        const batchPromises = [];
        
        for (let j = 0; j < batchSize && i + j < length; j++) {
          // Get element at index
          const elementResult = await runtimeAgent.invoke_callFunctionOn({
            objectId: result.result.objectId,
            functionDeclaration: `function(index) { return this[index]; }`,
            arguments: [{ value: i + j }],
            returnByValue: false
          });
          
          if (elementResult.result?.objectId) {
            // Get node details
            const nodePromise = domAgent.invoke_describeNode({
              objectId: elementResult.result.objectId
            }).then(nodeResult => {
              if (nodeResult.node?.backendNodeId) {
                visibleNodeIds.add(nodeResult.node.backendNodeId);
              }
            }).catch(() => {
              // Ignore errors for individual elements
            });
            
            batchPromises.push(nodePromise);
          }
        }
        
        // Wait for batch to complete
        await Promise.all(batchPromises);
      }
    }
  } catch (error) {
    console.error('Error finding visible elements:', error);
  }
  
  return visibleNodeIds;
}
