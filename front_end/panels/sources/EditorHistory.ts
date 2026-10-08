// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import type * as Workspace from '../../models/workspace/workspace.js';

export const MAX_PREVIOUSLY_VIEWED_FILES_COUNT = 30;
export const MAX_SERIALIZABLE_URL_LENGTH = 4096;

export interface SerializedHistoryItem {
  url: string;
  resourceTypeName: string;
  selectionRange?: TextUtils.TextRange.SerializedTextRange;
  scrollLineNumber?: number;
}

export interface HistoryItemKey {
  url: Platform.DevToolsPath.UrlString;
  resourceType: Common.ResourceType.ResourceType;
}

export function historyItemKey(uiSourceCode: Workspace.UISourceCode.UISourceCode): HistoryItemKey {
  return {url: uiSourceCode.url(), resourceType: uiSourceCode.contentType()};
}

export class HistoryItem implements HistoryItemKey {
  url: Platform.DevToolsPath.UrlString;
  resourceType: Common.ResourceType.ResourceType;
  selectionRange: TextUtils.TextRange.TextRange|undefined;
  scrollLineNumber: number|undefined;

  constructor(
      url: Platform.DevToolsPath.UrlString,
      resourceType: Common.ResourceType.ResourceType,
      selectionRange?: TextUtils.TextRange.TextRange,
      scrollLineNumber?: number,
  ) {
    this.url = url;
    this.resourceType = resourceType;
    this.selectionRange = selectionRange;
    this.scrollLineNumber = scrollLineNumber;
  }

  static fromObject(serializedHistoryItem: SerializedHistoryItem): HistoryItem {
    const resourceType = Common.ResourceType.ResourceType.fromName(serializedHistoryItem.resourceTypeName);
    if (resourceType === null) {
      throw new TypeError(`Invalid resource type name "${serializedHistoryItem.resourceTypeName}"`);
    }
    const selectionRange = serializedHistoryItem.selectionRange ?
        TextUtils.TextRange.TextRange.fromObject(serializedHistoryItem.selectionRange) :
        undefined;
    return new HistoryItem(
        serializedHistoryItem.url as Platform.DevToolsPath.UrlString,
        resourceType,
        selectionRange,
        serializedHistoryItem.scrollLineNumber,
    );
  }

  toObject(): SerializedHistoryItem|null {
    if (this.url.length >= MAX_SERIALIZABLE_URL_LENGTH) {
      return null;
    }
    return {
      url: this.url,
      resourceTypeName: this.resourceType.name(),
      selectionRange: this.selectionRange,
      scrollLineNumber: this.scrollLineNumber,
    };
  }
}
