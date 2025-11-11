// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import {Directives, html, type LitTemplate, nothing} from '../../../lit/lit.js';

const {ifDefined, repeat} = Directives;
const UIStrings = {
  /**
   * @description Text shown in the console object preview. Shown when the user is inspecting a
   * JavaScript object and there are multiple empty properties on the object (x =
   * 'times'/'multiply').
   * @example {3} PH1
   */
  emptyD: 'empty × {PH1}',
  /**
   * @description Shown when the user is inspecting a JavaScript object in the console and there is
   * an empty property on the object..
   */
  empty: 'empty',
  /**
   * @description Text shown when the user is inspecting a JavaScript object, but of the properties
   * is not immediately available because it is a JavaScript 'getter' function, which means we have
   * to run some code first in order to compute this property.
   */
  thePropertyIsComputedWithAGetter: 'The property is computed with a getter',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/object_ui/RemoteObjectPreviewFormatter.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface PropertyPreviewValue {
  name?: string;
  entry?: Protocol.Runtime.EntryPreview;
  value?: Protocol.Runtime.PropertyPreview;
  placeholder?: string;
}

export class RemoteObjectPreviewFormatter {
  private static objectPropertyComparator(a: Protocol.Runtime.PropertyPreview, b: Protocol.Runtime.PropertyPreview):
      number {
    return sortValue(a) - sortValue(b);

    function sortValue(property: Protocol.Runtime.PropertyPreview): number {
      // TODO(einbinder) expose whether preview properties are actually internal.
      if (property.name === InternalName.PROMISE_STATE) {
        return 1;
      }
      if (property.name === InternalName.PROMISE_RESULT) {
        return 2;
      }
      if (property.name === InternalName.GENERATOR_STATE || property.name === InternalName.PRIMITIVE_VALUE ||
          property.name === InternalName.WEAK_REF_TARGET) {
        return 3;
      }
      if (property.type !== Protocol.Runtime.PropertyPreviewType.Function && !property.name.startsWith('#')) {
        return 4;
      }
      return 5;
    }
  }

  renderObjectPreview(preview: Protocol.Runtime.ObjectPreview): LitTemplate {
    const description = preview.description;
    const subTypesWithoutValuePreview = new Set<Protocol.Runtime.ObjectPreviewSubtype|'internal#entry'|'trustedtype'>([
      Protocol.Runtime.ObjectPreviewSubtype.Arraybuffer,
      Protocol.Runtime.ObjectPreviewSubtype.Dataview,
      Protocol.Runtime.ObjectPreviewSubtype.Error,
      Protocol.Runtime.ObjectPreviewSubtype.Null,
      Protocol.Runtime.ObjectPreviewSubtype.Regexp,
      Protocol.Runtime.ObjectPreviewSubtype.Webassemblymemory,
      'internal#entry',
      'trustedtype',
    ]);
    if (preview.type !== Protocol.Runtime.ObjectPreviewType.Object ||
        (preview.subtype && subTypesWithoutValuePreview.has(preview.subtype))) {
      return this.renderPropertyPreview(preview.type, preview.subtype, undefined, description);
    }
    const isArrayOrTypedArray = preview.subtype === Protocol.Runtime.ObjectPreviewSubtype.Array ||
        preview.subtype === Protocol.Runtime.ObjectPreviewSubtype.Typedarray;
    let objectDescription = '';
    if (description) {
      if (isArrayOrTypedArray) {
        const arrayLength = SDK.RemoteObject.RemoteObject.arrayLength(preview);
        const arrayLengthText = arrayLength > 1 ? ('(' + arrayLength + ')') : '';
        const arrayName = SDK.RemoteObject.RemoteObject.arrayNameFromDescription(description);
        objectDescription = arrayName === 'Array' ? arrayLengthText : (arrayName + arrayLengthText);
      } else {
        const hideDescription = description === 'Object';
        objectDescription = hideDescription ? '' : description;
      }
    }

    const items = Array.from(
        preview.entries         ? this.renderEntries(preview) :
            isArrayOrTypedArray ? this.renderArrayProperties(preview) :
                                  this.renderObjectProperties(preview));

    // clang-format off
    const renderName = (name: string): LitTemplate  => html`<span class=name>${
      /^\s|\s$|^$|\n/.test(name)? '"' + name.replace(/\n/g, '\u21B5') + '"' : name}</span>`;

    const renderPlaceholder = (placeholder: string): LitTemplate =>
          html`<span class=object-value-undefined>${placeholder}</span>`;

    const renderValue = (value: Protocol.Runtime.PropertyPreview): LitTemplate=>
          this.renderPropertyPreview(value.type, value.subtype, value.name, value.value);

    const renderEntry = (entry: Protocol.Runtime.EntryPreview): LitTemplate=> html`${entry.key &&
          html`${this.renderPropertyPreview(entry.key.type, entry.key.subtype, undefined, entry.key.description)} => `}
          ${this.renderPropertyPreview(entry.value.type, entry.value.subtype, undefined, entry.value.description)}`;

    const renderItem = ({name, entry, value, placeholder}: PropertyPreviewValue, index: number): LitTemplate => html`${
        index > 0 ? ', ' : ''}${
        placeholder !== undefined ? renderPlaceholder(placeholder) : nothing}${
        name !== undefined ? renderName(name) : nothing}${
        name !== undefined && value ? ': ' : ''}${
        value ? renderValue(value) : nothing}${
        entry ? renderEntry(entry) : nothing}`;
    // clang-format on

    return html`${
        objectDescription.length > 0 ?
            html`<span class=object-description>${objectDescription + '\xA0'}</span>` :
            nothing}<span class=object-properties-preview>${isArrayOrTypedArray ? '[' : '{'}${
        repeat(items, renderItem)}${preview.overflow ? html`<span>${items.length > 0 ? ',\xA0…' : '…'}</span>` : ''}
    ${isArrayOrTypedArray ? ']' : '}'}</span>`;
  }

  private * renderObjectProperties(preview: Protocol.Runtime.ObjectPreview): Generator<PropertyPreviewValue> {
    const properties = preview.properties.filter(p => p.type !== 'accessor')
                           .sort(RemoteObjectPreviewFormatter.objectPropertyComparator);
    for (let i = 0; i < properties.length; ++i) {
      const property = properties[i];
      const name = property.name;
      // Internal properties are given special formatting, e.g. Promises `<rejected>: 123`.
      if (preview.subtype === Protocol.Runtime.ObjectPreviewSubtype.Promise && name === InternalName.PROMISE_STATE) {
        const promiseResult =
            properties.at(i + 1)?.name === InternalName.PROMISE_RESULT ? properties.at(i + 1) : undefined;
        if (promiseResult) {
          i++;
        }
        yield {name: '<' + property.value + '>', value: property.value !== 'pending' ? promiseResult : undefined};
      } else if (preview.subtype === 'generator' && name === InternalName.GENERATOR_STATE) {
        yield {name: '<' + property.value + '>'};
      } else if (name === InternalName.PRIMITIVE_VALUE) {
        yield {value: property};
      } else if (name === InternalName.WEAK_REF_TARGET) {
        if (property.type === Protocol.Runtime.PropertyPreviewType.Undefined) {
          yield {name: '<cleared>'};
        } else {
          yield {value: property};
        }
      } else {
        yield {name, value: property};
      }
    }
  }

  private * renderArrayProperties(preview: Protocol.Runtime.ObjectPreview): Generator<PropertyPreviewValue> {
    const arrayLength = SDK.RemoteObject.RemoteObject.arrayLength(preview);
    const indexProperties = preview.properties.filter(p => toArrayIndex(p.name) !== -1).sort(arrayEntryComparator);
    const otherProperties = preview.properties.filter(p => toArrayIndex(p.name) === -1)
                                .sort(RemoteObjectPreviewFormatter.objectPropertyComparator);

    function arrayEntryComparator(a: Protocol.Runtime.PropertyPreview, b: Protocol.Runtime.PropertyPreview): number {
      return toArrayIndex(a.name) - toArrayIndex(b.name);
    }

    function toArrayIndex(name: string): number {
      // We need to differentiate between property accesses and array index accesses
      // Therefore, we need to make sure we are always dealing with an i32, in the event
      // that a particular property also exists, but as the literal string. For example
      // for {["1.5"]: true}, we don't want to return `true` if we provide `1.5` as the
      // value, but only want to do that if we provide `"1.5"`.
      const index = Number(name) >>> 0;
      if (String(index) === name && index < arrayLength) {
        return index;
      }
      return -1;
    }

    // Gaps can be shown when all properties are guaranteed to be in the preview.
    const canShowGaps = !preview.overflow;

    const indexedProperties:
        Array<{property: Protocol.Runtime.PropertyPreview, index: number, gap: number, hasGaps: boolean}> = [];
    for (const property of indexProperties) {
      const index = toArrayIndex(property.name);
      const gap = index - (indexedProperties.at(-1)?.index ?? -1) - 1;
      const hasGaps = index !== indexedProperties.length;
      indexedProperties.push({property, index, gap, hasGaps});
    }
    const trailingGap = arrayLength - (indexedProperties.at(-1)?.index ?? -1) - 1;

    // TODO(l10n): Plurals. Tricky because of a bug in the presubmit check for plurals.
    const renderGap = (count: number): {placeholder: string} =>
        ({placeholder: count !== 1 ? i18nString(UIStrings.emptyD, {PH1: count}) : i18nString(UIStrings.empty)});
    for (const {property, gap, hasGaps} of indexedProperties) {
      if (canShowGaps && gap > 0) {
        yield renderGap(gap);
      }
      yield {name: !canShowGaps && hasGaps ? property.name : undefined, value: property};
    }
    if (canShowGaps && trailingGap > 0) {
      yield renderGap(trailingGap);
    }

    for (const property of otherProperties) {
      yield {name: property.name, value: property};
    }
  }

  private * renderEntries(preview: Protocol.Runtime.ObjectPreview): Generator<PropertyPreviewValue> {
    for (const entry of preview.entries ?? []) {
      yield {entry};
    }
  }

  renderPropertyPreview(type: string, subtype?: string, className?: string|null, description?: string): LitTemplate {
    const title = type === 'accessor'   ? i18nString(UIStrings.thePropertyIsComputedWithAGetter) :
        (type === 'object' && !subtype) ? description :
                                          undefined;

    const abbreviateFullQualifiedClassName = (description: string): string => {
      const abbreviatedDescription = description.split('.');
      for (let i = 0; i < abbreviatedDescription.length - 1; ++i) {
        abbreviatedDescription[i] = Platform.StringUtilities.trimMiddle(abbreviatedDescription[i], 3);
      }
      return abbreviatedDescription.length === 1 && abbreviatedDescription[0] === 'Object' ?
          '{…}' :
          abbreviatedDescription.join('.');
    };

    const preview = (): string|LitTemplate|undefined|null => type === 'accessor' ? '(...)' :
        type === 'function'                                                      ? '\u0192' :
        type === 'object' && subtype === 'trustedtype' && className ? renderTrustedType(description ?? '', className) :
        type === 'object' && subtype === 'node' && description      ? renderNodeTitle(description) :
        type === 'string'             ? Platform.StringUtilities.formatAsJSLiteral(description ?? '') :
        type === 'object' && !subtype ? abbreviateFullQualifiedClassName(description ?? '') :
                                        description;

    return html`<span class='object-value-${(subtype || type)}' title=${ifDefined(title)}>${preview()}</span>`;
  }
}

const enum InternalName {
  GENERATOR_STATE = '[[GeneratorState]]',
  PRIMITIVE_VALUE = '[[PrimitiveValue]]',
  PROMISE_STATE = '[[PromiseState]]',
  PROMISE_RESULT = '[[PromiseResult]]',
  WEAK_REF_TARGET = '[[WeakRefTarget]]',
}

export function renderNodeTitle(nodeTitle: string): LitTemplate|null {
  const match = nodeTitle.match(/([^#.]+)(#[^.]+)?(\..*)?/);
  if (!match) {
    return null;
  }
  return html`<span class=webkit-html-tag-name>${match[1]}</span>${
      match[2] && html`<span class=webkit-html-attribute-value>${match[2]}</span>`}${
      match[3] && html`<span class=webkit-html-attribute-name>${match[3]}</span>`}`;
}

export function renderTrustedType(description: string, className: string): LitTemplate {
  return html`${className} <span class=object-value-string>"${description.replace(/\n/g, '\u21B5')}"</span>`;
}
