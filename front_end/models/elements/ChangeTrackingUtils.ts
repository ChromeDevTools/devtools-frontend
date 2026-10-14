// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as CommentManager from '../comment_manager/comment_manager.js';

/**
 * Maximum number of characters of page or author controlled data (tag names, attribute names
 * and values, text node values, HTML, CSS property names/values, and selectors) that a change
 * description embeds.
 */
export const MAX_VALUE_LENGTH = 100;

/** Shortens page or author controlled data so that both its start and end stay recognizable. */
export function trimValue(value: string): string {
  return Platform.StringUtilities.trimMiddle(value.trim(), MAX_VALUE_LENGTH);
}

export function buildAnchor(
    vePath: string,
    node: SDK.DOMModel.DOMNode|null,
    textSignature?: string,
    ): CommentManager.CommentManager.CommentAnchorSignature {
  return {
    vePath,
    ...(textSignature ? {textSignature} : {}),
    ...(node ? {
      node: {
        backendNodeId: node.backendNodeId(),
        targetId: node.domModel().target().id(),
      },
    } :
               {}),
  };
}
