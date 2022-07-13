// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';

import {CSSLocation, type CSSModel, type Edit} from './CSSModel.js';
import {type CSSStyleSheetHeader} from './CSSStyleSheetHeader.js';

type CSSQueryPayload =
    Protocol.CSS.CSSMedia|Protocol.CSS.CSSContainerQuery|Protocol.CSS.CSSSupports|Protocol.CSS.CSSScope;

export abstract class CSSQuery {
  text = '';
  range?: TextUtils.TextRange.TextRange|null;
  styleSheetId?: Protocol.CSS.StyleSheetId;
  protected cssModel: CSSModel;

  constructor(cssModel: CSSModel) {
    this.cssModel = cssModel;
  }

  protected abstract reinitialize(payload: CSSQueryPayload): void;

  abstract active(): boolean;

  rebase(edit: Edit): void {
    if (this.styleSheetId !== edit.styleSheetId || !this.range) {
      return;
    }
    if (edit.oldRange.equal(this.range)) {
      this.reinitialize(edit.payload as CSSQueryPayload);
    } else {
      this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
    }
  }

  equal(other: CSSQuery): boolean {
    if (!this.styleSheetId || !this.range || !other.range) {
      return false;
    }
    return this.styleSheetId === other.styleSheetId && this.range.equal(other.range);
  }

  lineNumberInSource(): number|undefined {
    if (!this.range) {
      return undefined;
    }
    return this.header()?.lineNumberInSource(this.range.startLine);
  }

  columnNumberInSource(): number|undefined {
    if (!this.range) {
      return undefined;
    }
    return this.header()?.columnNumberInSource(this.range.startLine, this.range.startColumn);
  }

  header(): CSSStyleSheetHeader|null {
    return this.styleSheetId ? this.cssModel.styleSheetHeaderForId(this.styleSheetId) : null;
  }

  rawLocation(): CSSLocation|null {
    const header = this.header();
    if (!header || this.lineNumberInSource() === undefined) {
      return null;
    }
    const lineNumber = Number(this.lineNumberInSource());
    return new CSSLocation(header, lineNumber, this.columnNumberInSource());
  }
}
