// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openSourceCodeEditorForFile} from '../../e2e/helpers/sources-helpers.js';

describe('Sources Tab', function() {
  it('is highlighting the syntax correctly', async ({devToolsPage, inspectedPage}) => {
    const componentsFormats = new Set();

    await openSourceCodeEditorForFile(
        'syntax-highlighting.wasm', 'wasm/syntax-highlighting.html', devToolsPage, inspectedPage);
    // Wait for at least 1 keyword to show up, at which we know the highlighting has been applied.
    await devToolsPage.waitFor('.token-keyword');

    const expectedVariables = ['$add', '$p0', '$p1', '$p0', '$p1'];

    const variableNames = await Promise.all((await devToolsPage.$$('.token-variable')).map(elements => {
      return elements.evaluate(el => (el as HTMLElement).innerText);
    }));
    const variableColors = await Promise.all((await devToolsPage.$$('.token-variable')).map(elements => {
      return elements.evaluate(el => getComputedStyle(el).color);
    }));
    variableColors.forEach(element => {
      componentsFormats.add(element);
    });

    assert.deepEqual(variableNames, expectedVariables, 'highlighed variables are incorrect');
    assert.strictEqual(componentsFormats.size, 1, 'variables did not yield exactly one format');

    const expectedKeywords =
        ['module', 'func', 'export', 'param', 'param', 'result', 'local.get', 'local.get', 'i32.add'];

    const keywordNames = await Promise.all((await devToolsPage.$$('.token-keyword')).map(elements => {
      return elements.evaluate(el => (el as HTMLElement).innerText);
    }));
    const keywordColors = await Promise.all((await devToolsPage.$$('.token-keyword')).map(elements => {
      return elements.evaluate(el => getComputedStyle(el).color);
    }));
    keywordColors.forEach(element => {
      componentsFormats.add(element);
    });

    assert.deepEqual(keywordNames, expectedKeywords, 'highlighed keywords are incorrect');
    assert.strictEqual(componentsFormats.size, 2, 'variables and keywords did not yield exactly two different formats');

    const expectedComments = ['(;0;)', '(;0;)', '(;1;)'];

    const commentNames = await Promise.all((await devToolsPage.$$('.token-comment')).map(elements => {
      return elements.evaluate(el => (el as HTMLElement).innerText);
    }));
    const commentColors = await Promise.all((await devToolsPage.$$('.token-comment')).map(elements => {
      return elements.evaluate(el => getComputedStyle(el).color);
    }));
    commentColors.forEach(element => {
      componentsFormats.add(element);
    });

    assert.deepEqual(commentNames, expectedComments, 'highlighed comments are incorrect');
    assert.strictEqual(
        componentsFormats.size, 3, 'variables, keywords and comments did not yield exactly three different formats');

    const expectedStrings = ['\"add\"'];

    const stringNames = await Promise.all((await devToolsPage.$$('.token-string')).map(elements => {
      return elements.evaluate(el => (el as HTMLElement).innerText);
    }));
    const stringColors = await Promise.all((await devToolsPage.$$('.token-string')).map(elements => {
      return elements.evaluate(el => getComputedStyle(el).color);
    }));
    stringColors.forEach(element => {
      componentsFormats.add(element);
    });

    assert.deepEqual(stringNames, expectedStrings, 'highlighed strings are incorrect');
    assert.strictEqual(
        componentsFormats.size, 4,
        'variables, keywords, comments and strings did not yield exactly four different formats');
  });
});
