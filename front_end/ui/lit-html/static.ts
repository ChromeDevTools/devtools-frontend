// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as I18n from '../../third_party/i18n/i18n.js';
import * as Lit from '../../third_party/lit/lit.js';

export interface Static {
  value: unknown;
  $$static$$: true;
}

type TemplateValues = Static|unknown;
type FlattenedTemplateValues = {
  strings: TemplateStringsArray,
  valueMap: boolean[],
};

export function flattenTemplate(strings: TemplateStringsArray, ...values: TemplateValues[]): FlattenedTemplateValues {
  const valueMap: boolean[] = [];
  const newStrings: string[] = [];

  // Start with an empty buffer and start running over the values.
  let buffer = '';
  for (let v = 0; v < values.length; v++) {
    const possibleStatic = values[v];
    if (isStaticLiteral(possibleStatic)) {
      // If this is a static literal, add the current string plus the
      // static literal's value to the buffer.
      buffer += strings[v] + possibleStatic.value;

      // Filter this value in future invocations.
      valueMap.push(false);
    } else {
      // If we reach a non-static value, push what we have on to
      // the new strings array, and reset the buffer.
      buffer += strings[v];
      newStrings.push(buffer);
      buffer = '';

      // Include this value in future invocations.
      valueMap.push(true);
    }
  }

  // Since the strings length is always the values length + 1, we need
  // to append whatever that final string is to whatever is left in the
  // buffer, and flush both out to the newStrings.
  newStrings.push(buffer + strings[values.length]);
  (newStrings as unknown as {raw: readonly string[]}).raw = [...newStrings];
  return {strings: newStrings as unknown as TemplateStringsArray, valueMap};
}

export function html(strings: TemplateStringsArray, ...values: TemplateValues[]): Lit.TemplateResult {
  const staticValues = values.filter(value => isStaticLiteral(value));
  if (staticValues.length) {
    const key = staticValues.map(v => v.value as string).join(' ');
    return htmlWithStatics(strings, values, key);
  }

  return Lit.html(strings, ...values);
}

export function literal(value: TemplateStringsArray): Static {
  return {
    value: value[0],
    $$static$$: true,
  };
}

function isStaticLiteral(item: TemplateValues|unknown): item is Static {
  return typeof item === 'object' && (item !== null && '$$static$$' in item);
}

// While this is a WeakMap, that doesn't help because TemplateStringsArray are objects in a global registry
// managed by the V8 runtime. They are never garbage collected.
// We use a double-keyed cache in order to support dynamically changing the static literal: for example,
// within a loop that dynamically selects what custom component to render.
const flattenedTemplates = new WeakMap<TemplateStringsArray, Map<string, FlattenedTemplateValues>>();

function htmlWithStatics(
    strings: TemplateStringsArray, values: TemplateValues[], staticValuesKey: string): Lit.TemplateResult {
  // Check to see if we've already converted this before.
  // Cache key is the TemplateStringsArray, which works because the same usage of template string reuses the same array object.
  // See: https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-gettemplateobject
  //      13.2.8.4 GetTemplateObject, step 3.
  let flattened;
  let secondaryMap = flattenedTemplates.get(strings);
  if (!secondaryMap) {
    secondaryMap = new Map();
    flattenedTemplates.set(strings, secondaryMap);
  }

  flattened = secondaryMap.get(staticValuesKey);
  if (!flattened) {
    flattened = flattenTemplate(strings, ...values);
    secondaryMap.set(staticValuesKey, flattened);
  }

  // Pass through to Lit.
  const filteredValues = values.filter((_, index) => flattened.valueMap[index]);
  return Lit.html(flattened.strings, ...filteredValues);
}

/**
 * @param placeholders placeholders must not contain localized strings or other localized templates as that is
 * incompatible with languages using a different sentence structure or ordering (e.g., RTL).
 */
export function i18nTemplate(
    registeredStrings: I18n.LocalizedStringSet.RegisteredFileStrings, stringId: string,
    placeholders: Record<string, Lit.TemplateResult|string>): Lit.TemplateResult {
  const formatter = registeredStrings.getLocalizedStringSetFor(i18n.DevToolsLocale.DevToolsLocale.instance().locale)
                        .getMessageFormatterFor(stringId);
  let result = html``;
  for (const icuElement of formatter.getAst()) {
    if (icuElement.type === /* argumentElement */ 1) {
      const placeholderValue = placeholders[icuElement.value];
      if (placeholderValue) {
        result = html`${result}${placeholderValue}`;
      }
    } else if ('value' in icuElement) {
      result = html`${result}${icuElement.value}`;
    }
  }
  return result;
}
