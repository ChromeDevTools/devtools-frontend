// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Helper functions for working with UserAgentMetadata protocol objects, in
// particular their plain string representation.

import type * as UI from '../../../../ui/legacy/legacy.js';
import type * as Protocol from '../../../../generated/protocol.js';

import {
  parseList,
  ResultKind,
  serializeItem,
  serializeList,
  type Item,
  type List,
  type Parameters,
  type ParamName,
  type String as SHString,
} from './StructuredHeaders.js';

/* Returned string is for error, either parseErrorString or structErrorString.
 */
export function parseBrandsList(stringForm: string, parseErrorString: string, structErrorString: string):
    Protocol.Emulation.UserAgentBrandVersion[]|string {
  const brandList: Protocol.Emulation.UserAgentBrandVersion[] = [];
  const parseResult = parseList(stringForm);
  if (parseResult.kind === ResultKind.ERROR) {
    return parseErrorString;
  }
  for (const listItem of parseResult.items) {
    if (listItem.kind !== ResultKind.ITEM) {
      return structErrorString;
    }
    const bareItem = listItem.value;
    if (bareItem.kind !== ResultKind.STRING) {
      return structErrorString;
    }
    if (listItem.parameters.items.length !== 1) {
      return structErrorString;
    }
    const param = listItem.parameters.items[0];
    if (param.name.value !== 'v') {
      return structErrorString;
    }
    const paramValue = param.value;
    if (paramValue.kind !== ResultKind.STRING) {
      return structErrorString;
    }

    brandList.push({brand: bareItem.value, version: paramValue.value});
  }

  return brandList;
}

export function serializeBrandsList(brands: Protocol.Emulation.UserAgentBrandVersion[]): string {
  const shList: List = {kind: ResultKind.LIST, items: []};
  const vParamName: ParamName = {kind: ResultKind.PARAM_NAME, value: 'v'};
  for (const brand of brands) {
    const nameString: SHString = {kind: ResultKind.STRING, value: brand.brand};
    const verString: SHString = {kind: ResultKind.STRING, value: brand.version};
    const verParams: Parameters = {
      kind: ResultKind.PARAMETERS,
      items: [{kind: ResultKind.PARAMETER, name: vParamName, value: verString}],
    };

    const shItem: Item = {kind: ResultKind.ITEM, value: nameString, parameters: verParams};
    shList.items.push(shItem);
  }

  const serializeResult = serializeList(shList);
  return serializeResult.kind === ResultKind.ERROR ? '' : serializeResult.value;
}

/*
 * This checks whether the value provided is representable as a structured headers string,
 * which is the validity requirement for the fields in UserAgentMetadata that are not the brand list
 * or mobile bool.
 *
 * errorMessage will be passed through on failure.
 */
export function validateAsStructuredHeadersString(value: string, errorString: string): UI.ListWidget.ValidatorResult {
  const parsedResult = serializeItem({
    kind: ResultKind.ITEM,
    value: {kind: ResultKind.STRING, value: value},
    parameters: {kind: ResultKind.PARAMETERS, items: []},
  });
  if (parsedResult.kind === ResultKind.ERROR) {
    return {valid: false, errorMessage: errorString};
  }
  return {valid: true, errorMessage: undefined};
}
