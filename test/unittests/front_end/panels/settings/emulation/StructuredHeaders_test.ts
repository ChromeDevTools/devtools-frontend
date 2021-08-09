// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as EmulationUtils from '../../../../../../front_end/panels/settings/emulation/utils/utils.js';
import StructuredHeaders = EmulationUtils.StructuredHeaders;

function assertItemError(result: StructuredHeaders.Item|StructuredHeaders.Error): void {
  assert.strictEqual(result.kind, StructuredHeaders.ResultKind.ERROR);
}

function assertItemValue(
    result: StructuredHeaders.Item|StructuredHeaders.Error, expectedKind: StructuredHeaders.ResultKind,
    expected: string|number|boolean): void {
  if (result.kind === StructuredHeaders.ResultKind.ERROR) {
    assert.fail('Got error instead of Item containing kind ' + expectedKind);
    return;
  }
  const bareItem = result.value;
  if (bareItem.kind !== expectedKind) {
    assert.fail('Item type is ' + bareItem.kind + ' instead of ' + expectedKind);
    return;
  }

  assert.strictEqual(bareItem.value, expected);
}

function assertItemInteger(result: StructuredHeaders.Item|StructuredHeaders.Error, expected: number): void {
  assertItemValue(result, StructuredHeaders.ResultKind.INTEGER, expected);
}

function assertItemDecimal(result: StructuredHeaders.Item|StructuredHeaders.Error, expected: number): void {
  assertItemValue(result, StructuredHeaders.ResultKind.DECIMAL, expected);
}

function assertItemString(result: StructuredHeaders.Item|StructuredHeaders.Error, expected: string): void {
  assertItemValue(result, StructuredHeaders.ResultKind.STRING, expected);
}

function assertItemToken(result: StructuredHeaders.Item|StructuredHeaders.Error, expected: string): void {
  assertItemValue(result, StructuredHeaders.ResultKind.TOKEN, expected);
}

function assertItemBinary(result: StructuredHeaders.Item|StructuredHeaders.Error, expected: string): void {
  assertItemValue(result, StructuredHeaders.ResultKind.BINARY, expected);
}

function assertItemBoolean(result: StructuredHeaders.Item|StructuredHeaders.Error, expected: boolean): void {
  assertItemValue(result, StructuredHeaders.ResultKind.BOOLEAN, expected);
}

function assertParams(
    result: StructuredHeaders.Parameters, expectParams: [string, StructuredHeaders.BareItem][]): void {
  assert.lengthOf(result.items, expectParams.length);
  for (let i = 0; i < expectParams.length; ++i) {
    assert.strictEqual(result.items[i].name.value, expectParams[i][0]);
    assert.deepStrictEqual(result.items[i].value, expectParams[i][1], 'Param ' + i + ' value mismatch');
  }
}

function assertItemParams(
    result: StructuredHeaders.Item|StructuredHeaders.Error,
    expectParams: [string, StructuredHeaders.BareItem][]): void {
  if (result.kind === StructuredHeaders.ResultKind.ERROR) {
    assert.fail('No params on parse error');
    return;
  }
  assertParams(result.parameters, expectParams);
}

function assertListError(result: StructuredHeaders.List|StructuredHeaders.Error): void {
  assert.strictEqual(result.kind, StructuredHeaders.ResultKind.ERROR);
}

function assertListAndGetItems(result: StructuredHeaders.List|StructuredHeaders.Error): StructuredHeaders.ListMember[] {
  if (result.kind === StructuredHeaders.ResultKind.ERROR) {
    assert.fail('Got error instead of List');
    return [];
  }
  return result.items;
}

function assertListItem(
    item: StructuredHeaders.ListMember, expectValue: StructuredHeaders.BareItem,
    expectParams: [string, StructuredHeaders.BareItem][]): void {
  if (item.kind === StructuredHeaders.ResultKind.INNER_LIST) {
    assert.fail('Unexpected inner list when an item expected');
    return;
  }
  assert.deepStrictEqual(
      item.value, expectValue,
      'List item bare value mismatch, ' + item.value.value + ' vs expected ' + expectValue.value);
  assertItemParams(item, expectParams);
}

function assertInnerListAndGetItems(
    item: StructuredHeaders.ListMember,
    expectParams: [string, StructuredHeaders.BareItem][]): StructuredHeaders.Item[] {
  if (item.kind !== StructuredHeaders.ResultKind.INNER_LIST) {
    assert.fail('Expected inner list, got:' + item.kind);
    return [];
  }
  assertParams(item.parameters, expectParams);
  return item.items;
}

function assertSerializeResult(
    result: StructuredHeaders.SerializationResult|StructuredHeaders.Error, expected: string): void {
  if (result.kind === StructuredHeaders.ResultKind.ERROR) {
    assert.fail('Got error instead of serialization result');
    return;
  }
  assert.strictEqual(result.value, expected);
}

function assertSerializeError(result: StructuredHeaders.SerializationResult|StructuredHeaders.Error): void {
  assert.strictEqual(result.kind, StructuredHeaders.ResultKind.ERROR);
}

function makeItem(bareItem: StructuredHeaders.BareItem): StructuredHeaders.Item {
  return {
    kind: StructuredHeaders.ResultKind.ITEM,
    value: bareItem,
    parameters: {kind: StructuredHeaders.ResultKind.PARAMETERS, items: []},
  };
}

function makeParams(params: [string, StructuredHeaders.BareItem][]): StructuredHeaders.Parameters {
  const typedParams: StructuredHeaders.Parameters = {kind: StructuredHeaders.ResultKind.PARAMETERS, items: []};
  for (const param of params) {
    typedParams.items.push({
      kind: StructuredHeaders.ResultKind.PARAMETER,
      name: {kind: StructuredHeaders.ResultKind.PARAM_NAME, value: param[0]},
      value: param[1],
    });
  }
  return typedParams;
}

function makeItemWithParams(
    bareItem: StructuredHeaders.BareItem, params: [string, StructuredHeaders.BareItem][]): StructuredHeaders.Item {
  return {kind: StructuredHeaders.ResultKind.ITEM, value: bareItem, parameters: makeParams(params)};
}

function makeList(items: StructuredHeaders.ListMember[]): StructuredHeaders.List {
  return {kind: StructuredHeaders.ResultKind.LIST, items: items};
}

function makeInnerList(
    items: StructuredHeaders.Item[], params: [string, StructuredHeaders.BareItem][]): StructuredHeaders.InnerList {
  return {kind: StructuredHeaders.ResultKind.INNER_LIST, items: items, parameters: makeParams(params)};
}

describe('StructuredHeaders', () => {
  describe('Parsing', () => {
    it('Parses integers', () => {
      assertItemInteger(StructuredHeaders.parseItem('23'), 23);
      assertItemInteger(StructuredHeaders.parseItem('023'), 23);
      assertItemInteger(StructuredHeaders.parseItem('-100'), -100);
      assertItemInteger(StructuredHeaders.parseItem('-0'), 0);
      assertItemInteger(StructuredHeaders.parseItem('-999999999999999'), -999999999999999);
      assertItemInteger(StructuredHeaders.parseItem('999999999999999'), 999999999999999);
      assertItemError(StructuredHeaders.parseItem('1999999999999999'));
      assertItemError(StructuredHeaders.parseItem('-1999999999999999'));
      assertItemError(StructuredHeaders.parseItem('-'));
      assertItemError(StructuredHeaders.parseItem('--1'));
    });
    it('Parses decimals', () => {
      assertItemDecimal(StructuredHeaders.parseItem('23.4'), 23.4);
      assertItemDecimal(StructuredHeaders.parseItem('023.4'), 23.4);
      assertItemDecimal(StructuredHeaders.parseItem('-100.3'), -100.3);
      assertItemDecimal(StructuredHeaders.parseItem('-100.32'), -100.32);
      assertItemDecimal(StructuredHeaders.parseItem('100.325'), 100.325);
      assertItemDecimal(StructuredHeaders.parseItem('-0.0'), -0);
      assertItemDecimal(StructuredHeaders.parseItem('-999999999999.999'), -999999999999.999);
      assertItemDecimal(StructuredHeaders.parseItem('999999999999.999'), 999999999999.999);
      assertItemError(StructuredHeaders.parseItem('.'));
      assertItemError(StructuredHeaders.parseItem('1.'));
      assertItemError(StructuredHeaders.parseItem('1.0000'));
      assertItemError(StructuredHeaders.parseItem('--1.0'));
      assertItemError(StructuredHeaders.parseItem('1999999999999.9'));
    });
    it('Parses strings', () => {
      assertItemString(StructuredHeaders.parseItem('"abcd"'), 'abcd');
      assertItemString(StructuredHeaders.parseItem('"a\\"\\\\"'), 'a"\\');
      assertItemError(StructuredHeaders.parseItem('"\\n"'));
      assertItemError(StructuredHeaders.parseItem('"\\"'));
      assertItemError(StructuredHeaders.parseItem('"foo'));
      assertItemError(StructuredHeaders.parseItem('"'));
    });
    it('Parses tokens', () => {
      assertItemToken(StructuredHeaders.parseItem('abcd'), 'abcd');
      assertItemToken(StructuredHeaders.parseItem('*'), '*');
      assertItemToken(StructuredHeaders.parseItem('*z/foo:bar'), '*z/foo:bar');
      assertItemError(StructuredHeaders.parseItem('/far'));
    });
    it('Parses binary', () => {
      assertItemBinary(StructuredHeaders.parseItem(':aBcd+/ef0=:'), 'aBcd+/ef0=');
      assertItemError(StructuredHeaders.parseItem(':foo'));
      assertItemError(StructuredHeaders.parseItem(':'));
    });
    it('Parses booleans', () => {
      assertItemBoolean(StructuredHeaders.parseItem('?0'), false);
      assertItemBoolean(StructuredHeaders.parseItem('?1'), true);
      assertItemError(StructuredHeaders.parseItem('?01'));
      assertItemError(StructuredHeaders.parseItem('?2'));
      assertItemError(StructuredHeaders.parseItem('?'));
    });
    it('Parses parameters', () => {
      const r1 = StructuredHeaders.parseItem('token; a=1; b=?0');
      assertItemToken(r1, 'token');
      assertItemParams(r1, [
        ['a', {kind: StructuredHeaders.ResultKind.INTEGER, value: 1}],
        ['b', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: false}],
      ]);

      const r2 = StructuredHeaders.parseItem('token; a; b=?0');
      assertItemToken(r2, 'token');
      assertItemParams(r2, [
        ['a', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}],
        ['b', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: false}],
      ]);

      const r3 = StructuredHeaders.parseItem('token; *a123-456.789_0*');
      assertItemToken(r3, 'token');
      assertItemParams(r3, [
        ['*a123-456.789_0*', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}],
      ]);

      assertItemError(StructuredHeaders.parseItem('token; A=1'));
      assertItemError(StructuredHeaders.parseItem('token; aA=1'));
      assertItemError(StructuredHeaders.parseItem('token ;a=1'));
      assertItemError(StructuredHeaders.parseItem('token; a=1;'));
    });
    it('Handles duplicate parameter names per spec', () => {
      const r = StructuredHeaders.parseItem('toooken; a=1; b=?0; a=2; c=4.2; b=?1; a=4; b="hi"');
      assertItemToken(r, 'toooken');
      assertItemParams(r, [
        ['c', {kind: StructuredHeaders.ResultKind.DECIMAL, value: 4.2}],
        ['a', {kind: StructuredHeaders.ResultKind.INTEGER, value: 4}],
        ['b', {kind: StructuredHeaders.ResultKind.STRING, value: 'hi'}],
      ]);
    });
    it('Parses lists', () => {
      const items = assertListAndGetItems(StructuredHeaders.parseList('a, \t"b", ?0;d;e=42'));
      assert.lengthOf(items, 3);
      assertListItem(items[0], {kind: StructuredHeaders.ResultKind.TOKEN, value: 'a'}, []);
      assertListItem(items[1], {kind: StructuredHeaders.ResultKind.STRING, value: 'b'}, []);
      assertListItem(items[2], {kind: StructuredHeaders.ResultKind.BOOLEAN, value: false}, [
        ['d', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}],
        ['e', {kind: StructuredHeaders.ResultKind.INTEGER, value: 42}],
      ]);
    });
    it('Parses empty list', () => {
      // Grammar seems to reject it, but the algorithm (which is normative) seems OK
      // with it, and 0-length lists are OK per the data model.
      const items = assertListAndGetItems(StructuredHeaders.parseList(''));
      assert.lengthOf(items, 0);
    });
    it('Parses inner lists', () => {
      const items = assertListAndGetItems(StructuredHeaders.parseList('a, ("b" "c"), (d e)'));
      assert.lengthOf(items, 3);
      assertListItem(items[0], {kind: StructuredHeaders.ResultKind.TOKEN, value: 'a'}, []);
      const itemsL1 = assertInnerListAndGetItems(items[1], []);
      assert.lengthOf(itemsL1, 2);
      assertListItem(itemsL1[0], {kind: StructuredHeaders.ResultKind.STRING, value: 'b'}, []);
      assertListItem(itemsL1[1], {kind: StructuredHeaders.ResultKind.STRING, value: 'c'}, []);
      const itemsL2 = assertInnerListAndGetItems(items[2], []);
      assert.lengthOf(itemsL2, 2);
      assertListItem(itemsL2[0], {kind: StructuredHeaders.ResultKind.TOKEN, value: 'd'}, []);
      assertListItem(itemsL2[1], {kind: StructuredHeaders.ResultKind.TOKEN, value: 'e'}, []);
    });
    it('Parses empty inner lists', () => {
      // Empty inner lists are OK.
      const items = assertListAndGetItems(StructuredHeaders.parseList(' (  )  '));
      assert.lengthOf(items, 1);
      const itemsL0 = assertInnerListAndGetItems(items[0], []);
      assert.lengthOf(itemsL0, 0);
    });
    it('Parses inner list params', () => {
      // Example from spec, with inner list params and item params.
      const items = assertListAndGetItems(StructuredHeaders.parseList('("foo"; a=1;b=2);lvl=5, ("bar" "baz");lvl=1'));
      assert.lengthOf(items, 2);
      const itemsL0 =
          assertInnerListAndGetItems(items[0], [['lvl', {kind: StructuredHeaders.ResultKind.INTEGER, value: 5}]]);
      assert.lengthOf(itemsL0, 1);
      assertListItem(itemsL0[0], {kind: StructuredHeaders.ResultKind.STRING, value: 'foo'}, [
        ['a', {kind: StructuredHeaders.ResultKind.INTEGER, value: 1}],
        ['b', {kind: StructuredHeaders.ResultKind.INTEGER, value: 2}],
      ]);
      const itemsL1 =
          assertInnerListAndGetItems(items[1], [['lvl', {kind: StructuredHeaders.ResultKind.INTEGER, value: 1}]]);
      assert.lengthOf(itemsL1, 2);
      assertListItem(itemsL1[0], {kind: StructuredHeaders.ResultKind.STRING, value: 'bar'}, []);
      assertListItem(itemsL1[1], {kind: StructuredHeaders.ResultKind.STRING, value: 'baz'}, []);
    });
    it('Detects various list syntax errors', () => {
      assertListError(StructuredHeaders.parseList('a,'));
      assertListError(StructuredHeaders.parseList('a b'));
      assertListError(StructuredHeaders.parseList('(a,'));
      assertListError(StructuredHeaders.parseList('(a,b'));
    });
  });
  describe('Serialization', () => {
    it('Serializes integers', () => {
      assertSerializeResult(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.INTEGER, value: -45})), '-45');
      assertSerializeResult(
          StructuredHeaders.serializeItem(
              makeItem({kind: StructuredHeaders.ResultKind.INTEGER, value: 999999999999999})),
          '999999999999999');
      assertSerializeResult(
          StructuredHeaders.serializeItem(
              makeItem({kind: StructuredHeaders.ResultKind.INTEGER, value: -999999999999999})),
          '-999999999999999');

      assertSerializeError(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.INTEGER, value: 3.14})));
      assertSerializeError(StructuredHeaders.serializeItem(
          makeItem({kind: StructuredHeaders.ResultKind.INTEGER, value: -1000000000000000})));
      assertSerializeError(StructuredHeaders.serializeItem(
          makeItem({kind: StructuredHeaders.ResultKind.INTEGER, value: 1000000000000000})));
    });
    it('Serializes strings', () => {
      assertSerializeResult(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.STRING, value: 'str'})),
          '"str"');
      assertSerializeResult(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.STRING, value: 'str"\\'})),
          '"str\\"\\\\"');
      assertSerializeResult(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.STRING, value: ''})), '""');

      // Only printable ASCII....
      assertSerializeError(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.STRING, value: '\u2124'})));
      assertSerializeError(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.STRING, value: '\u007f'})));
      assertSerializeError(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.STRING, value: '\u001f'})));
    });
    it('Serializes tokens', () => {
      assertSerializeResult(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.TOKEN, value: 'tok'})), 'tok');
      assertSerializeResult(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.TOKEN, value: '*foo:bar/baz'})),
          '*foo:bar/baz');

      assertSerializeError(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.TOKEN, value: '/foo'})));
      assertSerializeError(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.TOKEN, value: '*,'})));
      assertSerializeError(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.TOKEN, value: ''})));
    });
    it('Serializes booleans', () => {
      assertSerializeResult(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.BOOLEAN, value: true})), '?1');
      assertSerializeResult(
          StructuredHeaders.serializeItem(makeItem({kind: StructuredHeaders.ResultKind.BOOLEAN, value: false})), '?0');
    });
    it('Serializes parameters', () => {
      assertSerializeResult(
          StructuredHeaders.serializeItem(makeItemWithParams(
              {kind: StructuredHeaders.ResultKind.BOOLEAN, value: true},
              [
                ['arg1', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}],
                ['arg2', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: false}],
              ])),
          '?1;arg1;arg2=?0');
      assertSerializeResult(
          StructuredHeaders.serializeItem(makeItemWithParams(
              {kind: StructuredHeaders.ResultKind.BOOLEAN, value: true},
              [
                ['*1', {kind: StructuredHeaders.ResultKind.TOKEN, value: 'Yes'}],
                ['*2', {kind: StructuredHeaders.ResultKind.INTEGER, value: 1}],
              ])),
          '?1;*1=Yes;*2=1');

      assertSerializeError(StructuredHeaders.serializeItem(makeItemWithParams(
          {kind: StructuredHeaders.ResultKind.BOOLEAN, value: true},
          [['Arg1', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}]])));
      assertSerializeError(StructuredHeaders.serializeItem(makeItemWithParams(
          {kind: StructuredHeaders.ResultKind.BOOLEAN, value: true},
          [['*Arg1', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}]])));
    });
  });
  it('Serializes lists', () => {
    assertSerializeResult(StructuredHeaders.serializeList(makeList([])), '');
    assertSerializeResult(
        StructuredHeaders.serializeList(makeList([
          makeItem({kind: StructuredHeaders.ResultKind.BOOLEAN, value: false}),
          makeItem({kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}),
        ])),
        '?0, ?1');
    assertSerializeResult(
        StructuredHeaders.serializeList(makeList([
          makeItemWithParams(
              {kind: StructuredHeaders.ResultKind.STRING, value: 'hi'},
              [
                ['arg1', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}],
                ['arg2', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: false}],
              ]),
          makeItem({kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}),
        ])),
        '"hi";arg1;arg2=?0, ?1');

    assertSerializeResult(
        StructuredHeaders.serializeList(
            makeList([makeItem({kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}), makeInnerList([], [])])),
        '?1, ()');

    assertSerializeResult(
        StructuredHeaders.serializeList(makeList([
          makeItem({kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}),
          makeInnerList(
              [
                makeItem({kind: StructuredHeaders.ResultKind.INTEGER, value: 1}),
                makeItem({kind: StructuredHeaders.ResultKind.INTEGER, value: 2}),
              ],
              []),
          makeInnerList(
              [
                makeItem({kind: StructuredHeaders.ResultKind.INTEGER, value: 3}),
                makeItemWithParams(
                    {kind: StructuredHeaders.ResultKind.INTEGER, value: 4},
                    [['p1', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}]]),
              ],
              [['o1', {kind: StructuredHeaders.ResultKind.STRING, value: 'val'}]]),
        ])),
        '?1, (1 2), (3 4;p1);o1="val"');

    assertSerializeError(StructuredHeaders.serializeList(makeList([
      makeItem({kind: StructuredHeaders.ResultKind.STRING, value: '\u0000'}),
      makeItem({kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}),
    ])));

    assertSerializeError(StructuredHeaders.serializeList(makeList([
      makeItemWithParams(
          {kind: StructuredHeaders.ResultKind.STRING, value: 'hi'},
          [
            ['Arg1', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}],
            ['arg2', {kind: StructuredHeaders.ResultKind.BOOLEAN, value: false}],
          ]),
      makeItem({kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}),
    ])));

    assertSerializeError(StructuredHeaders.serializeList(makeList([
      makeItem({kind: StructuredHeaders.ResultKind.BOOLEAN, value: true}),
      makeInnerList(
          [
            makeItem({kind: StructuredHeaders.ResultKind.INTEGER, value: 1.34}),
            makeItem({kind: StructuredHeaders.ResultKind.INTEGER, value: 2}),
          ],
          []),
    ])));

    assertSerializeError(StructuredHeaders.serializeList(
        makeList([makeInnerList([], [['+o1', {kind: StructuredHeaders.ResultKind.STRING, value: 'val'}]])])));
  });
});
