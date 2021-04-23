// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as FormatterWorker from '../../../../../front_end/entrypoints/formatter_worker/formatter_worker.js';

describe('FormattedContentBuilder', () => {
  it('can add a token successfully', () => {
    const formattedContentBuilder = new FormatterWorker.FormattedContentBuilder.FormattedContentBuilder('  ');
    formattedContentBuilder.addToken('Test Script', 0);
    assert.strictEqual(formattedContentBuilder.content(), 'Test Script');
  });

  it('returns the previous enforceSpaceBetweenWords value', () => {
    const formattedContentBuilder = new FormatterWorker.FormattedContentBuilder.FormattedContentBuilder('  ');
    formattedContentBuilder.setEnforceSpaceBetweenWords(false);
    const result = formattedContentBuilder.setEnforceSpaceBetweenWords(true);
    assert.strictEqual(result, false);
  });

  it('should squash new lines by default', () => {
    const builder = new FormatterWorker.FormattedContentBuilder.FormattedContentBuilder('  ');
    builder.addToken('Token 1', 0);
    builder.addNewLine();
    builder.addNewLine();
    builder.addToken('Token 2', 0);

    assert.strictEqual(builder.content(), 'Token 1\nToken 2');
  });

  it('should respect the noSquash parameter', () => {
    const builder = new FormatterWorker.FormattedContentBuilder.FormattedContentBuilder('  ');
    builder.addToken('Token 1', 0);
    builder.addNewLine();
    builder.addNewLine(true);
    builder.addToken('Token 2', 0);

    assert.strictEqual(builder.content(), 'Token 1\n\nToken 2');
  });

  it('should avoid leading newlines', () => {
    const builder = new FormatterWorker.FormattedContentBuilder.FormattedContentBuilder('  ');
    builder.addNewLine();
    builder.addToken('Token', 0);

    assert.strictEqual(builder.content(), 'Token');
  });

  it('not add more than one newline at the end', () => {
    const builder = new FormatterWorker.FormattedContentBuilder.FormattedContentBuilder('  ');
    builder.addToken('Token', 0);
    builder.addNewLine();
    builder.addNewLine(true);

    assert.strictEqual(builder.content(), 'Token\n');
  });

  it('should not collapse hard spaces', () => {
    const builder = new FormatterWorker.FormattedContentBuilder.FormattedContentBuilder('  ');
    builder.addToken('Token 1', 0);
    builder.addHardSpace();
    builder.addHardSpace();
    builder.addHardSpace();
    builder.addToken('Token 2', 0);

    assert.strictEqual(builder.content(), 'Token 1   Token 2', 'expected three spaces between the tokens');
  });

  it('should collapse soft spaces', () => {
    const builder = new FormatterWorker.FormattedContentBuilder.FormattedContentBuilder('  ');
    builder.addToken('Token 1', 0);
    builder.addSoftSpace();
    builder.addSoftSpace();
    builder.addSoftSpace();
    builder.addToken('Token 2', 0);

    assert.strictEqual(builder.content(), 'Token 1 Token 2', 'expected a single space between the tokens');
  });

  it('should ignore a soft space after a hard space', () => {
    const builder = new FormatterWorker.FormattedContentBuilder.FormattedContentBuilder('  ');
    builder.addToken('Token 1', 0);
    builder.addHardSpace();
    builder.addSoftSpace();
    builder.addToken('Token 2', 0);

    assert.strictEqual(builder.content(), 'Token 1 Token 2', 'expected a single space between the tokens');
  });

  it('should ignore a soft space before a hard space', () => {
    const builder = new FormatterWorker.FormattedContentBuilder.FormattedContentBuilder('  ');
    builder.addToken('Token 1', 0);
    builder.addSoftSpace();
    builder.addHardSpace();
    builder.addToken('Token 2', 0);

    assert.strictEqual(builder.content(), 'Token 1 Token 2', 'expected a single space between the tokens');
  });

  it('should handle the nesting level correctly', () => {
    const builder = new FormatterWorker.FormattedContentBuilder.FormattedContentBuilder('  ');
    builder.addToken('Token 1', 0);
    builder.addNewLine();
    builder.increaseNestingLevel();
    builder.addToken('Token 2', 0);
    builder.addNewLine();
    builder.increaseNestingLevel();
    builder.addToken('Token 3', 0);
    builder.addNewLine();
    builder.decreaseNestingLevel();
    builder.addToken('Token 4', 0);
    builder.addNewLine();
    builder.decreaseNestingLevel();
    builder.addToken('Token 5', 0);
    builder.addNewLine();
    builder.decreaseNestingLevel();
    builder.addToken('Token 6', 0);

    assert.strictEqual(builder.content(), 'Token 1\n  Token 2\n    Token 3\n  Token 4\nToken 5\nToken 6');
  });

  it('should allow mapping from unformatted source positions to formatted ones', () => {
    const builder = new FormatterWorker.FormattedContentBuilder.FormattedContentBuilder('  ');
    builder.addToken('#main', 0);
    builder.addSoftSpace();
    builder.addToken('{', 5);
    builder.addNewLine();
    builder.increaseNestingLevel();
    builder.addToken('color', 6);
    builder.addToken(':', 11);
    builder.addSoftSpace();
    builder.addToken('red', 13);
    builder.addToken(';', 16);
    builder.addNewLine();
    builder.decreaseNestingLevel();
    builder.addToken('}', 17);
    builder.addNewLine();

    const {original, formatted} = builder.mapping;
    assert.deepEqual(original, [0, 5, 6, 17]);
    assert.deepEqual(formatted, [0, 6, 10, 22]);
    assert.strictEqual(builder.content(), '#main {\n  color: red;\n}\n');
  });

  it('should not cache the identation for more than 20 nesting levels', () => {
    let x = 0;
    const builder = new FormatterWorker.FormattedContentBuilder.FormattedContentBuilder({
      toString() {
        return x++;
      },
    } as unknown as string);
    for (let i = 0; i < 20; i++) {
      builder.increaseNestingLevel();
    }

    builder.addToken('Token 1', 0);
    builder.addNewLine();
    builder.addToken('Token 2', 0);

    assert.strictEqual(builder.content(), 'Token 1\n012345678910111213141516171819Token 2');

    builder.addNewLine();
    builder.addToken('Token 3', 0);

    assert.strictEqual(
        builder.content(), 'Token 1\n012345678910111213141516171819Token 2\n012345678910111213141516171819Token 3');

    builder.increaseNestingLevel();

    builder.addNewLine();
    builder.addToken('Token 4', 0);

    assert.strictEqual(
        builder.content(),
        'Token 1\n012345678910111213141516171819Token 2\n012345678910111213141516171819Token 3\n202122232425262728293031323334353637383940Token 4');
  });
});
