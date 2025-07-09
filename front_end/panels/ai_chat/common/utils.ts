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
import { createLogger } from '../core/Logger.js';

const logger = createLogger('utils');

import type { AccessibilityNode, IFrameAccessibilityNode, TreeResult, BackendIdMaps } from './context.js';

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
    logger.warn(`Node with ID ${targetNodeId} not found in the provided list.`);
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
 * Builds backend ID mappings for DOM nodes.
 * Returns tagNameMap (backendNodeId -> tagName) and xpathMap (backendNodeId -> xpath).
 */
async function buildBackendIdMaps(target: SDK.Target.Target): Promise<BackendIdMaps> {
  const domAgent = target.domAgent();
  
  try {
    // Get the full DOM document
    const { root } = await domAgent.invoke_getDocument({
      depth: -1,
      pierce: true
    });

    const tagNameMap: Record<number, string> = {};
    const xpathMap: Record<number, string> = {};

    // Recursively walk the DOM tree, building XPath as we go
    const walkNode = (node: any, path: string): void => {
      if (node.backendNodeId) {
        const tag = String(node.nodeName).toLowerCase();
        tagNameMap[node.backendNodeId] = tag;
        xpathMap[node.backendNodeId] = path;
      }

      if (!node.children?.length) return;
      
      // Count occurrences of each node type/name combination for XPath indexing
      const counters: Record<string, number> = {};

      for (const child of node.children) {
        const name = String(child.nodeName).toLowerCase();
        const counterKey = `${child.nodeType}:${name}`;
        const idx = (counters[counterKey] = (counters[counterKey] ?? 0) + 1);

        // Build XPath segment based on node type
        let seg: string;
        if (child.nodeType === 3) {
          // Text node
          seg = `text()[${idx}]`;
        } else if (child.nodeType === 8) {
          // Comment node
          seg = `comment()[${idx}]`;
        } else {
          // Element node
          seg = `${name}[${idx}]`;
        }

        walkNode(child, `${path}/${seg}`);
      }
    };

    // Start walking from the root
    walkNode(root, '');

    logger.info(`Built backend ID maps: ${Object.keys(tagNameMap).length} tag mappings, ${Object.keys(xpathMap).length} xpath mappings`);
    
    return { tagNameMap, xpathMap };
  } catch (error) {
    logger.error('Error building backend ID maps:', error);
    return { tagNameMap: {}, xpathMap: {} };
  }
}

/**
 * Extracts URL from accessibility node properties if available
 */
function extractUrlFromAXNode(axNode: AccessibilityNode): string | undefined {
  if (!axNode.properties) return undefined;
  
  const urlProp = axNode.properties.find(prop => prop.name === Protocol.Accessibility.AXPropertyName.Url);
  if (urlProp && urlProp.value && urlProp.value.type === 'string' && urlProp.value.value) {
    return String(urlProp.value.value).trim();
  }
  
  return undefined;
}

/**
 * Removes any StaticText children whose combined text equals the parent's name.
 * This is most often used to avoid duplicating a link's accessible name in separate child nodes.
 */
function removeRedundantStaticTextChildren(
  parent: AccessibilityNode,
  children: AccessibilityNode[],
): AccessibilityNode[] {
  if (!parent.name) {
    return children;
  }

  const parentName = parent.name.replace(/\s+/g, ' ').trim();

  // Gather all StaticText children and combine their text
  const staticTextChildren = children.filter(
    child => child.role === 'StaticText' && child.name,
  );
  const combinedChildText = staticTextChildren
    .map(child => child.name!.replace(/\s+/g, ' ').trim())
    .join('');

  // If the combined text exactly matches the parent's name, remove those child nodes
  if (combinedChildText === parentName) {
    return children.filter(child => child.role !== 'StaticText');
  }

  return children;
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
  tagNameMap?: Record<number, string>,
  target?: SDK.Target.Target,
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
    cleanStructuralNodes(child, tagNameMap, target),
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

  // 5) If we still have a "generic"/"none" node after pruning,
  //    replace the role with the DOM tag name if we have tagNameMap.
  if (
    (node.role === 'generic' || node.role === 'none') &&
    node.backendDOMNodeId !== undefined &&
    tagNameMap
  ) {
    const tagName = tagNameMap[node.backendDOMNodeId];
    if (tagName) {
      node.role = tagName;
    }
  }

  // Remove redundant StaticText children using the new function
  const finalChildren = removeRedundantStaticTextChildren(node, cleanedChildren);

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
  // Add parameter to receive scrollable IDs
  scrollableBackendIds?: Set<number>,
): Promise<TreeResult> {
  // Build backend ID mappings if we have a target
  let tagNameMap: Record<number, string> = {};
  let xpathMap: Record<number, string> = {};
  if (target) {
    const backendMaps = await buildBackendIdMaps(target);
    tagNameMap = backendMaps.tagNameMap;
    xpathMap = backendMaps.xpathMap;
  }
  // Map to store processed nodes for quick lookup
  const nodeMap = new Map<string, AccessibilityNode>();
  const iframeList: AccessibilityNode[] = [];
  // List to store identified scrollable container nodes
  const scrollableNodesList: Array<{nodeId: string, role: string, backendDOMNodeId?: number, name?: string}> = [];
  // Map to store nodeId -> URL for nodes that have URLs
  const idToUrl: Record<string, string> = {};

  // First pass: Create nodes that are meaningful
  // We only keep nodes that either have a name or children to avoid cluttering the tree
  let totalNodes = 0;
  let filteredOutNodes = 0;
  
  nodes.forEach(node => {
    totalNodes++;
    
    // Skip node if its ID is negative (e.g., "-1000002014")
    if (!node.nodeId) { 
      filteredOutNodes++;
      return; 
    }

    const nodeIdValue = parseInt(node.nodeId, 10);
    if (nodeIdValue < 0) {
      filteredOutNodes++;
      return;
    }

    // Extract URL if available
    const url = extractUrlFromAXNode(node);
    if (url) {
      idToUrl[node.nodeId] = url;
    }

    const hasChildren = node.childIds && node.childIds.length > 0;
    const hasValidName = node.name && node.name.trim() !== '';
    const isInteractive =
      node.role !== 'none' &&
      node.role !== 'generic' &&
      node.role !== 'InlineTextBox'; // add other interactive roles here

    // Include nodes that are either named, have children, or are interactive
    if (!hasValidName && !hasChildren && !isInteractive) {
      filteredOutNodes++;
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
        backendDOMNodeId: node.backendDOMNodeId,
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

  // Log filtering statistics  
  logger.info(`Node filtering: ${totalNodes} total → ${totalNodes - filteredOutNodes} kept (${filteredOutNodes} filtered out)`);

  // Final pass: Build the root-level tree and clean up structural nodes
  const rootNodes = nodes
    .filter(node => !node.parentId && node.nodeId && nodeMap.has(node.nodeId)) // Get root nodes
    .map(node => node.nodeId ? nodeMap.get(node.nodeId) : undefined)
    .filter(Boolean) as AccessibilityNode[];

  const cleanedTreePromises = rootNodes.map(node =>
    cleanStructuralNodes(node, tagNameMap, target),
  );
  const finalTree = (await Promise.all(cleanedTreePromises)).filter(
    Boolean,
  ) as AccessibilityNode[];

  // Fetch iframe content before generating simplified tree
  const accessibilityAgent = target?.accessibilityAgent();
  const iframesWithContent: IFrameAccessibilityNode[] = [];
  
  if (accessibilityAgent && iframeList.length > 0) {
    const iframeContentPromises = iframeList.map(async (iframe): Promise<IFrameAccessibilityNode> => {
      try {
        const domAgent = target!.domAgent();
        if (!iframe.backendDOMNodeId) {
          return iframe as IFrameAccessibilityNode;
        }
        const domNodeResponse = await domAgent.invoke_describeNode({
          backendNodeId: iframe.backendDOMNodeId as Protocol.DOM.BackendNodeId
        });
        if (!domNodeResponse.node?.frameId) {
          return iframe as IFrameAccessibilityNode;
        }
        const iframeResponse = await accessibilityAgent.invoke_getFullAXTree({
          frameId: domNodeResponse.node.frameId
        });
        if (!iframeResponse.nodes || iframeResponse.nodes.length === 0) {
          return iframe as IFrameAccessibilityNode;
        }
        
        // Convert iframe nodes to AccessibilityNode format with prefixed nodeIds
        const iframePrefix = `iframe_${iframe.nodeId}_`;
        const iframeAccessibilityNodes = iframeResponse.nodes.map((iframeNode: any): AccessibilityNode => {
          const roleValue = iframeNode.role && typeof iframeNode.role === 'object' && 'value' in iframeNode.role ? iframeNode.role.value : '';
          const nameValue = iframeNode.name && typeof iframeNode.name === 'object' && 'value' in iframeNode.name ? iframeNode.name.value : undefined;
          const descriptionValue = iframeNode.description && typeof iframeNode.description === 'object' && 'value' in iframeNode.description ? iframeNode.description.value : undefined;
          const valueValue = iframeNode.value && typeof iframeNode.value === 'object' && 'value' in iframeNode.value ? iframeNode.value.value : undefined;
          const backendNodeId = typeof iframeNode.backendDOMNodeId === 'number' ? iframeNode.backendDOMNodeId : undefined;
          return {
            role: roleValue,
            name: nameValue,
            description: descriptionValue,
            value: valueValue,
            nodeId: `${iframePrefix}${iframeNode.nodeId}`,
            backendDOMNodeId: backendNodeId,
            parentId: iframeNode.parentId ? `${iframePrefix}${iframeNode.parentId}` : undefined,
            childIds: iframeNode.childIds?.map((childId: string) => `${iframePrefix}${childId}`),
          };
        });
        
        // Build iframe tree structure
        const iframeTree = await buildHierarchicalTree(iframeAccessibilityNodes, target, scrollableBackendIds);
        
        return {
          ...iframe,
          contentTree: iframeTree.tree,
          contentSimplified: iframeTree.simplified
        } as IFrameAccessibilityNode;
      } catch (error) {
        logger.warn(`Error processing iframe content: ${String(error)}`);
        return iframe as IFrameAccessibilityNode;
      }
    });
    
    const resolvedIframes = await Promise.all(iframeContentPromises);
    iframesWithContent.push(...resolvedIframes);
  } else {
    iframesWithContent.push(...iframeList.map(iframe => iframe as IFrameAccessibilityNode));
  }

  // Generate a simplified string representation of the tree including iframe content
  let simplified = finalTree.map(node => formatSimplifiedTree(node)).join('\n');
  
  // Append iframe content to the simplified tree representation
  if (iframesWithContent.length > 0) {
    simplified += '\n\n--- IFRAME CONTENT ---\n';
    iframesWithContent.forEach((iframe, index) => {
      if (iframe.contentSimplified) {
        simplified += `\nIframe ${index + 1} (nodeId: ${iframe.nodeId}) content:\n`;
        simplified += iframe.contentSimplified;
      }
    });
  }

  return {
    tree: finalTree,
    simplified,
    iframes: iframesWithContent,
    // Add the collected scrollable nodes to the result
    scrollableContainerNodes: scrollableNodesList,
    // Add the new mappings
    idToUrl,
    xpathMap,
    tagNameMap,
  };
}

/**
 * Retrieves the full accessibility tree via CDP and transforms it into a hierarchical structure.
 */
export async function getAccessibilityTree(
  target: SDK.Target.Target,
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
        const roleValue =
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
          properties: node.properties,
        };
      },
    );

    // Pass scrollableBackendIds to buildHierarchicalTree
    const hierarchicalTree = await buildHierarchicalTree(
      accessibilityNodes,
      target,
      scrollableBackendIds, // Pass the set of scrollable IDs
    );

    logger.info(`got accessibility tree in ${Date.now() - startTime}ms`);
    return hierarchicalTree;
  } catch (error) {
    logger.error('Error getting accessibility tree', error);
    throw error;
  }
}

// This function is wrapped into a string and sent as a CDP command
// It is not meant to be actually executed here
const functionString = `
function getNodePath(el) {
  if (!el || (el.nodeType !== Node.ELEMENT_NODE && el.nodeType !== Node.TEXT_NODE)) {
    logger.info("el is not a valid node type");
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
    logger.error('Error resolving BackendNodeId to XPath:', error);
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
    logger.error('Error finding scrollable element IDs:', error);
  }

  return scrollableBackendIds;
}

export async function performAction(
  target: SDK.Target.Target,
  method: string,
  args: unknown[],
  xpath: string,
  iframeNodeId?: string,
): Promise<void> {
  const runtimeAgent = target.runtimeAgent();
  const domAgent = target.domAgent();
  let objectId: Protocol.Runtime.RemoteObjectId;
  
  // Handle iframe-specific elements
  if (iframeNodeId) {
    logger.info(`Performing action in iframe ${iframeNodeId} for element ${xpath}`);
    
    // Get the accessibility tree to find the iframe
    const accessibilityAgent = target.accessibilityAgent();
    const response = await accessibilityAgent.invoke_getFullAXTree({});
    const { nodes } = response;
    
    // Find the iframe node
    const iframeNode = nodes.find(node => node.nodeId === iframeNodeId);
    if (!iframeNode || !iframeNode.backendDOMNodeId) {
      throw new Error(`Could not find iframe with nodeId ${iframeNodeId}`);
    }
    
    // Resolve the iframe element
    const resolveResponse = await domAgent.invoke_resolveNode({
      backendNodeId: iframeNode.backendDOMNodeId as Protocol.DOM.BackendNodeId
    });
    
    if (!resolveResponse.object?.objectId) {
      throw new Error(`Could not resolve iframe node ${iframeNodeId}`);
    }
    
    // For iframe elements, xpath contains the element nodeId
    // We need to find the element within the iframe's accessibility tree
    const elementNodeId = xpath;
    
    // Get the iframe's accessibility tree
    const domNodeResponse = await domAgent.invoke_describeNode({
      backendNodeId: iframeNode.backendDOMNodeId as Protocol.DOM.BackendNodeId
    });
    
    if (!domNodeResponse.node?.frameId) {
      throw new Error(`Could not get frameId for iframe ${iframeNodeId}`);
    }
    
    const iframeAccessibilityResponse = await accessibilityAgent.invoke_getFullAXTree({
      frameId: domNodeResponse.node.frameId
    });
    
    // Find the element node in the iframe's accessibility tree
    const elementNode = iframeAccessibilityResponse.nodes.find(node => node.nodeId === elementNodeId);
    if (!elementNode || !elementNode.backendDOMNodeId) {
      throw new Error(`Could not find element with nodeId ${elementNodeId} in iframe ${iframeNodeId}`);
    }
    
    // Resolve the element node within the iframe context
    const elementResolveResponse = await domAgent.invoke_resolveNode({
      backendNodeId: elementNode.backendDOMNodeId as Protocol.DOM.BackendNodeId
    });
    
    if (!elementResolveResponse.object?.objectId) {
      throw new Error(`Could not resolve element node ${elementNodeId} in iframe ${iframeNodeId}`);
    }
    
    objectId = elementResolveResponse.object.objectId as Protocol.Runtime.RemoteObjectId;
  } else {
    // First locate element by XPath in main document
    let evaluateResult = await runtimeAgent.invoke_evaluate({
      expression: `
        (function() {
          const result = document.evaluate("${xpath}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          return result.singleNodeValue;
        })()
      `,
      returnByValue: false
    });

    if (!evaluateResult.result?.objectId) {
      throw new Error(`Could not find element with xpath ${xpath} in main document`);
    }
    
    objectId = evaluateResult.result.objectId as Protocol.Runtime.RemoteObjectId;
  }
  
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
        logger.warn(`Direct click failed, falling back to mouse events: ${e}`);

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
    } else if (method === 'selectOption') {
      const optionValue = String(args[0] || '');
      
      // Select option from dropdown
      await runtimeAgent.invoke_callFunctionOn({
        objectId,
        functionDeclaration: `
          function(value) {
            if (this.tagName.toLowerCase() === 'select') {
              // Try to find option by value first
              let optionFound = false;
              for (let i = 0; i < this.options.length; i++) {
                const option = this.options[i];
                if (option.value === value || option.text === value || option.textContent === value) {
                  this.selectedIndex = i;
                  optionFound = true;
                  break;
                }
              }
              
              // If not found by exact match, try partial match
              if (!optionFound) {
                for (let i = 0; i < this.options.length; i++) {
                  const option = this.options[i];
                  if (option.text.toLowerCase().includes(value.toLowerCase()) || 
                      option.textContent.toLowerCase().includes(value.toLowerCase())) {
                    this.selectedIndex = i;
                    optionFound = true;
                    break;
                  }
                }
              }
              
              if (optionFound) {
                this.dispatchEvent(new Event('change', { bubbles: true }));
                this.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
              }
              return false;
            }
            return false;
          }
        `,
        arguments: [{ value: optionValue }],
        returnByValue: true
      });
    } else if (method === 'check') {
      // Check checkbox or radio button
      await runtimeAgent.invoke_callFunctionOn({
        objectId,
        functionDeclaration: `
          function() {
            if (this.type === 'checkbox' || this.type === 'radio') {
              if (!this.checked) {
                this.checked = true;
                this.dispatchEvent(new Event('change', { bubbles: true }));
                this.dispatchEvent(new Event('input', { bubbles: true }));
              }
              return true;
            }
            return false;
          }
        `,
        returnByValue: true
      });
    } else if (method === 'uncheck') {
      // Uncheck checkbox
      await runtimeAgent.invoke_callFunctionOn({
        objectId,
        functionDeclaration: `
          function() {
            if (this.type === 'checkbox') {
              if (this.checked) {
                this.checked = false;
                this.dispatchEvent(new Event('change', { bubbles: true }));
                this.dispatchEvent(new Event('input', { bubbles: true }));
              }
              return true;
            }
            return false;
          }
        `,
        returnByValue: true
      });
    } else if (method === 'setChecked') {
      const shouldCheck = Boolean(args[0]);
      
      // Set checkbox state
      await runtimeAgent.invoke_callFunctionOn({
        objectId,
        functionDeclaration: `
          function(checked) {
            if (this.type === 'checkbox' || this.type === 'radio') {
              if (this.checked !== checked) {
                this.checked = checked;
                this.dispatchEvent(new Event('change', { bubbles: true }));
                this.dispatchEvent(new Event('input', { bubbles: true }));
              }
              return true;
            }
            return false;
          }
        `,
        arguments: [{ value: shouldCheck }],
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
): Promise<TreeResult> {
  const startTime = Date.now();
  // Use console.log for debug message
  logger.info('Starting getVisibleAccessibilityTree...');
  try {
    // Build backend ID mappings for this target
    const backendMaps = await buildBackendIdMaps(target);
    const tagNameMap = backendMaps.tagNameMap;
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
          const roleValue = node.role && typeof node.role === 'object' && 'value' in node.role ? node.role.value : '';
          const nameValue = node.name && typeof node.name === 'object' && 'value' in node.name ? node.name.value : undefined;
          const descriptionValue = node.description && typeof node.description === 'object' && 'value' in node.description ? node.description.value : undefined;
          const valueValue = node.value && typeof node.value === 'object' && 'value' in node.value ? node.value.value : undefined;
          const backendNodeId = typeof node.backendDOMNodeId === 'number' ? node.backendDOMNodeId : undefined;
          const childIds = node.childIds;
          return {
            role: roleValue, name: nameValue, description: descriptionValue, value: valueValue,
            nodeId: node.nodeId, backendDOMNodeId: backendNodeId, parentId: node.parentId, childIds,
          };
        }
      );
      const fullTreeResult = await buildHierarchicalTree(fullAccessibilityNodes); // Use existing builder
      // Use console.log for debug message
      logger.info('Full Accessibility Tree (Simplified):\n', fullTreeResult.simplified);
    } catch (fullTreeError) {
        logger.warn('Error generating full tree debug log', fullTreeError);
    }
    // --- END DEBUG LOG ---

    // 2. Identify which elements are in the viewport
    const visibleBackendIds = await findElementsInViewport(target);
    // Use console.log for debug message
    logger.info('Found ${visibleBackendIds.size} visible backendNodeIds:', Array.from(visibleBackendIds));

    // If we couldn't find any visible elements, return empty
    if (visibleBackendIds.size === 0) {
      // Use module logger for observation message
      logger.info('Could not identify any elements in the viewport.');
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
    logger.info('Found ${relevantNodeIds.size} relevant nodeIds (visible + ancestors):', Array.from(relevantNodeIds));

    // 5. Filter the original CDP nodes and convert to AccessibilityNode format
    const relevantAccessibilityNodes = allCdpNodes
      .filter(node => relevantNodeIds.has(node.nodeId))
      .map((node: Protocol.Accessibility.AXNode): AccessibilityNode => {
         // Map CDP nodes to AccessibilityNode format (same as in getAccessibilityTree)
         const roleValue =
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
           childIds,
         };
      });

    // Check if we found any relevant nodes
    if (relevantAccessibilityNodes.length === 0) {
       logger.info('No relevant nodes (visible or ancestors) found.');
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
           if (!parent.children) {parent.children = [];}
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
       cleanStructuralNodes(node, tagNameMap, target)
    );
    const finalTree = (await Promise.all(cleanedRootPromises)).filter(Boolean) as AccessibilityNode[];

    // 9. Format Output
    // Explicitly use formatSimplifiedTree to create the string representation
    let simplified = finalTree.map(node => formatSimplifiedTree(node)).join('\n');
    // Use console.log for debug message
    logger.info('Final Visible Tree (Simplified):\n', simplified);

    // Find ALL iframe nodes (not just visible ones) - important for sites like ANA Airlines
    // where critical booking content may be in off-screen iframes
    
    // Convert all CDP nodes to AccessibilityNode format first (same as the existing conversion logic)
    const allAccessibilityNodes = allCdpNodes.map((node: Protocol.Accessibility.AXNode): AccessibilityNode => {
      const roleValue = node.role && typeof node.role === 'object' && 'value' in node.role
        ? node.role.value
        : '';
      const nameValue = node.name && typeof node.name === 'object' && 'value' in node.name
        ? node.name.value
        : undefined;
      const descriptionValue = node.description && typeof node.description === 'object' && 'value' in node.description
        ? node.description.value
        : undefined;
      const valueValue = node.value && typeof node.value === 'object' && 'value' in node.value
        ? node.value.value
        : undefined;
      const backendNodeId = typeof node.backendDOMNodeId === 'number'
        ? node.backendDOMNodeId
        : undefined;

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
    });
    
    // Now find ALL iframes from the converted nodes (matches existing logic)
    const iframeNodes = allAccessibilityNodes.filter(node => node.role === 'Iframe');
    
    // Debug: Log iframe discovery and sample roles
    const sampleRoles = allAccessibilityNodes
      .map(node => node.role)
      .filter((role, index, arr) => arr.indexOf(role) === index) // unique roles
      .slice(0, 20); // limit output
    logger.info(`Sample roles found: ${JSON.stringify(sampleRoles)}`);

    // Log iframe discovery for debugging
    const visibleIframeCount = relevantAccessibilityNodes.filter(node => node.role === 'Iframe').length;
    logger.info(`Found ${iframeNodes.length} total iframes (${visibleIframeCount} were visible in viewport)`);

    // Fetch iframe content for all discovered iframes
    // Gets full accessibility tree for each iframe (not filtered by viewport)
    const iframesWithContent = await Promise.all(
      iframeNodes.map(async (node): Promise<AccessibilityNode | IFrameAccessibilityNode> => {
        // Process iframe content using full accessibility tree for comprehensive extraction
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
            const roleValue =
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
          logger.warn(`Error processing iframe content: ${String(error)}`);
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
        .filter(Boolean) as Array<{nodeId: string, role: string, backendDOMNodeId?: number, name?: string}>;

    logger.info(`Got viewport accessibility tree. Initial nodes: ${allCdpNodes.length}, Visible backendIds: ${visibleBackendIds.size}, Relevant nodes (visible + ancestors): ${relevantNodeIds.size}, Final tree roots: ${finalTree.length}, Total iframes: ${iframeNodes.length}, Time: ${Date.now() - startTime}ms`);

    // Append iframe content to the simplified tree representation
    if (iframesWithContent.length > 0) {
      simplified += '\n\n--- IFRAME CONTENT ---\n';
      iframesWithContent.forEach((iframe, index) => {
        const iframeWithContent = iframe as IFrameAccessibilityNode;
        if (iframeWithContent.contentSimplified) {
          simplified += `\nIframe ${index + 1} (nodeId: ${iframe.nodeId}) content:\n`;
          simplified += iframeWithContent.contentSimplified;
        }
      });
    }

    // Return the tree result with the simplified property explicitly set
    return {
      tree: finalTree,
      simplified,
      iframes: iframesWithContent,
      scrollableContainerNodes: relevantScrollableNodes
    };
  } catch (error) {
    logger.error('Error getting viewport accessibility tree', error);
    logger.debug(`getVisibleAccessibilityTree failed after ${Date.now() - startTime}ms`);
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
        functionDeclaration: 'function() { return this.length; }',
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
            functionDeclaration: 'function(index) { return this[index]; }',
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
    logger.error('Error finding visible elements:', error);
  }

  return visibleNodeIds;
}

