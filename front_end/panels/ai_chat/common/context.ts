// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';

import type { Page } from './page.js';

export interface AXNode {
  role?: { value: string };
  name?: { value: string };
  description?: { value: string };
  value?: { value: string };
  nodeId: string;
  backendDOMNodeId?: number;
  parentId?: string;
  childIds?: string[];
}

export interface AccessibilityNode {
  role: string;
  name?: string;
  description?: string;
  value?: string;
  children?: AccessibilityNode[];
  childIds?: string[];
  parentId?: string;
  nodeId?: string;
  backendDOMNodeId?: number;
  properties?: Protocol.Accessibility.AXProperty[];
}

// Enhanced interface for iframe node with content tree
export interface IFrameAccessibilityNode extends AccessibilityNode {
  contentTree?: AccessibilityNode[];
  contentSimplified?: string;
}

// Backend ID mappings for DOM nodes
export interface BackendIdMaps {
  tagNameMap: Record<number, string>;
  xpathMap: Record<number, string>;
}

export interface TreeResult {
  tree: AccessibilityNode[];
  simplified: string;
  iframes: IFrameAccessibilityNode[];
  scrollableContainerNodes: Array<{nodeId: string, role: string, backendDOMNodeId?: number, name?: string}>;
  idToUrl?: Record<string, string>;
  xpathMap?: Record<number, string>;
  tagNameMap?: Record<number, string>;
}

export interface EnhancedContext extends SDK.Target.Target {
  setActivePage(page: Page): void;
  getActivePage(): Page | undefined;
  isPageActive(page: Page): boolean;
  executeForActivePageIfAvailable<T>(
    callback: (page: Page) => T,
  ): T | undefined;
}
