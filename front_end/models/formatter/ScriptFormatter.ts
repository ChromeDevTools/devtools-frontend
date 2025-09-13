// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
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
        Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get()): Promise<FormattedContent> {
  if (contentType.isDocumentOrScriptOrStyleSheet()) {
    return await formatScriptContent(mimeType, content, indent);
  }

  return {formattedContent: content, formattedMapping: new IdentityFormatterSourceMapping()};
}

export async function formatScriptContent(
    mimeType: string, content: string,
    indent: string =
        Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get()): Promise<FormattedContent> {
  const originalContent = content.replace(/\r\n?|[\n\u2028\u2029]/g, '\n').replace(/^\uFEFF/, '');

  const pool = formatterWorkerPool();

  let formatResult: FormatterActions.FormatResult = {content: originalContent, mapping: {original: [], formatted: []}};
  try {
    formatResult = await pool.format(mimeType, originalContent, indent);
  } catch {
  }
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
