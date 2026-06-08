// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {GetStylesTool} from './GetStyles.js';
import {type BaseTool, ToolName} from './Tool.js';

/**
 * Plain object registry containing concrete instantiated tools.
 * Keep this type concrete (no type-erasure) to preserve exact tool types.
 */
export const TOOLS = {
  [ToolName.GET_STYLES]: new GetStylesTool(),
};

/**
 * Registry class for registering and querying AI Assistance Tools.
 */
export class ToolRegistry {
  /**
   * Retrieves a tool by its literal name with 100% type safety.
   *
   * @template K - A key from the `TOOLS` registry.
   * @returns The concrete class type of the requested tool.
   */
  static get<K extends keyof typeof TOOLS>(name: K): typeof TOOLS[K];
  /**
   * Fallback retrieval signature for general or runtime string lookups.
   */
  static get(name: string): BaseTool|undefined;
  static get(name: string): BaseTool|undefined {
    return Object.prototype.hasOwnProperty.call(TOOLS, name) ? TOOLS[name as keyof typeof TOOLS] : undefined;
  }
}
