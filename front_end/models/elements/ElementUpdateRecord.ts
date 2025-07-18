// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008 Matt Lilek <webkit@mattlilek.com>
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type * as SDK from '../../core/sdk/sdk.js';

export class ElementUpdateRecord {
  private modifiedAttributes?: Set<string>;
  private removedAttributes?: Set<string>;
  private hasChangedChildrenInternal?: boolean;
  private hasRemovedChildrenInternal?: boolean;
  private charDataModifiedInternal?: boolean;

  attributeModified(attrName: string): void {
    if (this.removedAttributes?.has(attrName)) {
      this.removedAttributes.delete(attrName);
    }
    if (!this.modifiedAttributes) {
      this.modifiedAttributes = (new Set());
    }
    this.modifiedAttributes.add(attrName);
  }

  attributeRemoved(attrName: string): void {
    if (this.modifiedAttributes?.has(attrName)) {
      this.modifiedAttributes.delete(attrName);
    }
    if (!this.removedAttributes) {
      this.removedAttributes = (new Set());
    }
    this.removedAttributes.add(attrName);
  }

  nodeInserted(_node: SDK.DOMModel.DOMNode): void {
    this.hasChangedChildrenInternal = true;
  }

  nodeRemoved(_node: SDK.DOMModel.DOMNode): void {
    this.hasChangedChildrenInternal = true;
    this.hasRemovedChildrenInternal = true;
  }

  charDataModified(): void {
    this.charDataModifiedInternal = true;
  }

  childrenModified(): void {
    this.hasChangedChildrenInternal = true;
  }

  isAttributeModified(attributeName: string): boolean {
    return this.modifiedAttributes?.has(attributeName) ?? false;
  }

  hasRemovedAttributes(): boolean {
    return this.removedAttributes !== null && this.removedAttributes !== undefined &&
        Boolean(this.removedAttributes.size);
  }

  isCharDataModified(): boolean {
    return Boolean(this.charDataModifiedInternal);
  }

  hasChangedChildren(): boolean {
    return Boolean(this.hasChangedChildrenInternal);
  }

  hasRemovedChildren(): boolean {
    return Boolean(this.hasRemovedChildrenInternal);
  }
}
