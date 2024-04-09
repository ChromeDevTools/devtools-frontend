// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FormatterWorker from './formatter_worker.js';

function formatJSON(text: string): string {
  return FormatterWorker.FormatterWorker.format('application/json', text, '  ').content;
}

describe('JSONFormatter', () => {
  it('formats simple json objects correctly', () => {
    const formattedCode = formatJSON('{"people":[{"firstName":"Joe","lastName":"Jackson","age":28}]}');
    const expectedCode = `{
  "people": [
    {
      "firstName": "Joe",
      "lastName": "Jackson",
      "age": 28
    }
  ]
}`;
    assert.strictEqual(formattedCode, expectedCode);
  });
  it('formats arrays correctly', () => {
    const formattedCode = formatJSON('{"people":["Joe", "Jane", "Jack"]}');
    const expectedCode = `{
  "people": [
    "Joe",
    "Jane",
    "Jack"
  ]
}`;
    assert.strictEqual(formattedCode, expectedCode);
  });
  it('formats nested json objects correctly', () => {
    const formattedCode = formatJSON('{"people":[{"firstName":"Joe","siblings":{"sister": "Jane"}}]}');
    const expectedCode = `{
  "people": [
    {
      "firstName": "Joe",
      "siblings": {
        "sister": "Jane"
      }
    }
  ]
}`;
    assert.strictEqual(formattedCode, expectedCode);
  });
  it('does NOT create a new line break on empty objects or arrays', () => {
    const formattedCode = formatJSON('{"employees":[{"emptyObj":{}},[]]}');
    const expectedCode = `{
  "employees": [
    {
      "emptyObj": {}
    },
    []
  ]
}`;
    assert.strictEqual(formattedCode, expectedCode);
  });
  it('formats nesting levels correctly on more complex json files', () => {
    const formattedCode = formatJSON(
        '{"ddd":0,"ind":2,"ty":3,"nm":"Null 2","parent":1,"sr":1,"ks":{"o":{"a":0,"k":0,"ix":11},"p":{"a":0,"k":[634,587.5,0],"ix":2},"s":{"a":1,"k":[{"i":{"x":[0.638,0.638,0.616],"y":[1,1,1]},"o":{"x":[0.811,0.811,0.153],"y":[0,0,0]},"n":["0p638_1_0p811_0","0p638_1_0p811_0","0p616_1_0p153_0"],"t":30,"s":[0,0,100],"e":[103,103,100]},{"t":46.0000018736184}],"ix":6}},"ao":0,"ip":0,"op":9890.00040282796,"st":0,"bm":0}');
    const expectedCode = `{
  "ddd": 0,
  "ind": 2,
  "ty": 3,
  "nm": "Null 2",
  "parent": 1,
  "sr": 1,
  "ks": {
    "o": {
      "a": 0,
      "k": 0,
      "ix": 11
    },
    "p": {
      "a": 0,
      "k": [
        634,
        587.5,
        0
      ],
      "ix": 2
    },
    "s": {
      "a": 1,
      "k": [
        {
          "i": {
            "x": [
              0.638,
              0.638,
              0.616
            ],
            "y": [
              1,
              1,
              1
            ]
          },
          "o": {
            "x": [
              0.811,
              0.811,
              0.153
            ],
            "y": [
              0,
              0,
              0
            ]
          },
          "n": [
            "0p638_1_0p811_0",
            "0p638_1_0p811_0",
            "0p616_1_0p153_0"
          ],
          "t": 30,
          "s": [
            0,
            0,
            100
          ],
          "e": [
            103,
            103,
            100
          ]
        },
        {
          "t": 46.0000018736184
        }
      ],
      "ix": 6
    }
  },
  "ao": 0,
  "ip": 0,
  "op": 9890.00040282796,
  "st": 0,
  "bm": 0
}`;
    assert.strictEqual(formattedCode, expectedCode);
  });
});
