/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as FormatterActions from '../../entrypoints/formatter_worker/FormatterActions.js';

import {formatterWorkerPool} from './FormatterWorkerPool.js';

function locationToPosition(lineEndings: number[], lineNumber: number, columnNumber: number): number {
  const position = lineNumber ? lineEndings[lineNumber - 1] + 1 : 0;
  return position + columnNumber;
}

function positionToLocation(lineEndings: number[], position: number): number[] {
  const lineNumber =
      Platform.ArrayUtilities.upperBound(lineEndings, position - 1, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
  let columnNumber;
  if (!lineNumber) {
    columnNumber = position;
  } else {
    columnNumber = position - lineEndings[lineNumber - 1] - 1;
  }
  return [lineNumber, columnNumber];
}

export interface FormattedContent {
  formattedContent: string;
  formattedMapping: FormatterSourceMapping;
}

export async function format(
    contentType: Common.ResourceType.ResourceType, mimeType: string, content: string,
    indent: string =
        Common.Settings.Settings.instance().moduleSetting('textEditorIndent').get()): Promise<FormattedContent> {
  if (contentType.isDocumentOrScriptOrStyleSheet()) {
    return formatScriptContent(mimeType, content, indent);
  }

  return {formattedContent: content, formattedMapping: new IdentityFormatterSourceMapping()};
}

export async function formatScriptContent(
    mimeType: string, content: string,
    indent: string =
        Common.Settings.Settings.instance().moduleSetting('textEditorIndent').get()): Promise<FormattedContent> {
  const originalContent = content.replace(/\r\n?|[\n\u2028\u2029]/g, '\n').replace(/^\uFEFF/, '');

  const pool = formatterWorkerPool();

  const formatResult = await pool.format(mimeType, originalContent, indent);
  const originalContentLineEndings = Platform.StringUtilities.findLineEndingIndexes(originalContent);
  const formattedContentLineEndings = Platform.StringUtilities.findLineEndingIndexes(formatResult.content);

  const sourceMapping =
      new FormatterSourceMappingImpl(originalContentLineEndings, formattedContentLineEndings, formatResult.mapping);
  return {formattedContent: formatResult.content, formattedMapping: sourceMapping};
}

export interface FormatterSourceMapping {
  originalToFormatted(lineNumber: number, columnNumber?: number): number[];
  formattedToOriginal(lineNumber: number, columnNumber?: number): number[];
}

class IdentityFormatterSourceMapping implements FormatterSourceMapping {
  originalToFormatted(lineNumber: number, columnNumber = 0): number[] {
    return [lineNumber, columnNumber];
  }

  formattedToOriginal(lineNumber: number, columnNumber = 0): number[] {
    return [lineNumber, columnNumber];
  }
}

class FormatterSourceMappingImpl implements FormatterSourceMapping {
  private readonly originalLineEndings: number[];
  private readonly formattedLineEndings: number[];
  private readonly mapping: FormatterActions.FormatMapping;

  constructor(originalLineEndings: number[], formattedLineEndings: number[], mapping: FormatterActions.FormatMapping) {
    this.originalLineEndings = originalLineEndings;
    this.formattedLineEndings = formattedLineEndings;
    this.mapping = mapping;
  }

  originalToFormatted(lineNumber: number, columnNumber?: number): number[] {
    const originalPosition = locationToPosition(this.originalLineEndings, lineNumber, columnNumber || 0);
    const formattedPosition = this.convertPosition(this.mapping.original, this.mapping.formatted, originalPosition);
    return positionToLocation(this.formattedLineEndings, formattedPosition);
  }

  formattedToOriginal(lineNumber: number, columnNumber?: number): number[] {
    const formattedPosition = locationToPosition(this.formattedLineEndings, lineNumber, columnNumber || 0);
    const originalPosition = this.convertPosition(this.mapping.formatted, this.mapping.original, formattedPosition);
    return positionToLocation(this.originalLineEndings, originalPosition);
  }

  private convertPosition(positions1: number[], positions2: number[], position: number): number {
    const index =
        Platform.ArrayUtilities.upperBound(positions1, position, Platform.ArrayUtilities.DEFAULT_COMPARATOR) - 1;
    let convertedPosition: number = positions2[index] + position - positions1[index];
    if (index < positions2.length - 1 && convertedPosition > positions2[index + 1]) {
      convertedPosition = positions2[index + 1];
    }
    return convertedPosition;
  }
}
