// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as FormatterWorker from './formatter_worker.js';

const mapping = new Map<string, string|null>([
  ['varX', 'x'],
  ['varY', 'y'],
  ['varZ', 'z'],
  ['this', 'this_1'],
  ['rename_to_this', 'this'],
  ['rename_to_arguments', 'arguments'],
  ['varQ', null],
]);

function substitute(expression: string): string {
  return FormatterWorker.Substitute.substituteExpression(expression, mapping);
}

describe('Substitute', () => {
  it('Preserves unrelated variable', () => {
    assert.strictEqual(substitute('x'), 'x');
  });

  it('Preserves `import.meta`', () => {
    assert.strictEqual(substitute('import.meta'), 'import.meta');
  });

  it('Substitutes single variable', () => {
    assert.strictEqual(substitute('varY'), 'y');
  });

  it('Substitutes await', () => {
    assert.strictEqual(substitute('await varX'), 'await x');
  });

  it('Substitutes array elements', () => {
    assert.strictEqual(substitute('[0, varY, varZ]'), '[0, y, z]');
    assert.strictEqual(substitute('[0, varY, ...varZ]'), '[0, y, ...z]');
  });

  it('Substitutes binary expressions, assignments, sequences', () => {
    assert.strictEqual(substitute('varX + varY'), 'x + y');
    assert.strictEqual(substitute('varX, varY'), 'x, y');
    assert.strictEqual(substitute('varX = varZ'), 'x = z');
    assert.strictEqual(substitute('varX += varZ'), 'x += z');
  });

  it('Substitutes arrow functions', () => {
    assert.strictEqual(substitute('(a) => a + varX'), '(a) => a + x');
    assert.strictEqual(substitute('(varX) => a + varX'), '(varX) => a + varX');
    // Capture avoiding substitution.
    assert.strictEqual(substitute('(x) => x + varX'), '(x_1) => x_1 + x');
    assert.strictEqual(substitute('(x) => (x) => x + varX'), '(x_2) => (x_1) => x_1 + x');
    assert.strictEqual(substitute('(x) => (x_1) => x + varX'), '(x_2) => (x_1) => x_2 + x');
  });

  it('Substitutes in blocks', () => {
    assert.strictEqual(substitute('{console.log(varY)}'), '{console.log(y)}');
    assert.strictEqual(substitute('{var y; console.log(varY + y)}'), '{var y_1; console.log(y + y_1)}');

    // Technically it would be correct to rename all instances of y to y_1,
    // but let us check we treat the let variables independently.
    assert.strictEqual(
        substitute('var y; {let y; console.log(varY + y)}; y'), 'var y_2; {let y_1; console.log(y + y_1)}; y_2');
    // Var hoisting out of blocks.
    assert.strictEqual(substitute('{var y; console.log(varY + y)}; y'), '{var y_1; console.log(y + y_1)}; y_1');
    assert.strictEqual(
        substitute('{let varY; console.log(varX + varY)}; varY'), '{let varY; console.log(x + varY)}; y');
    assert.strictEqual(
        substitute('{const varY = 1; console.log(varX + varY)}; varY'), '{const varY = 1; console.log(x + varY)}; y');
    assert.strictEqual(
        substitute('{var varY; console.log(varX + varY)}; varY'), '{var varY; console.log(x + varY)}; varY');
  });

  it('Substitutes in member expressions', () => {
    assert.strictEqual(substitute('varY.varX?.varZ'), 'y.varX?.varZ');
  });

  it('Substitutes in conditionals', () => {
    assert.strictEqual(substitute('varX ? varY : varZ'), 'x ? y : z');
    assert.strictEqual(substitute('if (varX) varY; else varZ;'), 'if (x) y; else z;');
  });

  it('Substitutes in loops', () => {
    assert.strictEqual(substitute('do { console.log(varX) } while (varY);'), 'do { console.log(x) } while (y);');
    assert.strictEqual(substitute('for (varX in varY) console.log(varZ);'), 'for (x in y) console.log(z);');
    assert.strictEqual(
        substitute('for (let varX in varY) console.log(varZ + varX);'), 'for (let varX in y) console.log(z + varX);');
    assert.strictEqual(
        substitute('for (let varX of varY) console.log(varZ + varX);'), 'for (let varX of y) console.log(z + varX);');
    assert.strictEqual(
        substitute('for (let x of varY) console.log(x + varX);'), 'for (let x_1 of y) console.log(x_1 + x);');
    assert.strictEqual(
        substitute('for (varX = 1; varX < 100; varX++) console.log(varX);'),
        'for (x = 1; x < 100; x++) console.log(x);');
    assert.strictEqual(
        substitute('for (var varX = 1; varX < 100; varX++) console.log(varX);'),
        'for (var varX = 1; varX < 100; varX++) console.log(varX);');
    assert.strictEqual(substitute('while (varX) { varY; }'), 'while (x) { y; }');
  });

  it('Substitutes in functions', () => {
    assert.strictEqual(substitute('function f(a) { a + varX; }'), 'function f(a) { a + x; }');
    assert.strictEqual(substitute('function f(varX) { a + varX; }'), 'function f(varX) { a + varX; }');
    // Capture avoiding substitution.
    assert.strictEqual(
        substitute('function f(x) { return (x_1) => x + varX; }'), 'function f(x_2) { return (x_1) => x_2 + x; }');
    assert.strictEqual(substitute('function f(...varX) { varX[0] }'), 'function f(...varX) { varX[0] }');
    assert.strictEqual(substitute('function f(...x) { varX[0] }'), 'function f(...x_1) { x[0] }');
    assert.strictEqual(substitute('function f() { this; }; this'), 'function f() { this; }; this_1');
  });

  it('Substitutes in object literals', () => {
    assert.strictEqual(substitute('{ varX: varX }'), '{ varX: x }');
    assert.strictEqual(substitute('({ [varY]: varX })'), '({ [y]: x })');
    assert.strictEqual(substitute('({ ...varX })'), '({ ...x })');
    assert.strictEqual(substitute('({ varX })'), '({ varX: x })');
  });

  it('Substitutes in switch', () => {
    assert.strictEqual(substitute('switch (varX) { case varY: varZ; }'), 'switch (x) { case y: z; }');
    assert.strictEqual(
        substitute('switch (varY) { case varZ: varX; case 2: let x = 1; }'),
        'switch (y) { case z: x; case 2: let x_1 = 1; }');
  });

  it('Substitutes in generators', () => {
    assert.strictEqual(substitute('function* f(x) { yield varX + x; }'), 'function* f(x_1) { yield x + x_1; }');
  });

  it('Substitutes in template literals', () => {
    assert.strictEqual(substitute('`${varX}`'), '`${x}`');
    assert.strictEqual(substitute('varY`${varX} varZ`'), 'y`${x} varZ`');
  });

  it('Substitutes in patterns', () => {
    assert.strictEqual(substitute('[varX, varY] = [varZ, 1]'), '[x, y] = [z, 1]');
    assert.strictEqual(substitute('[varX[varY]] = [3]'), '[x[y]] = [3]');
    assert.strictEqual(substitute('[varX.varY] = [3]'), '[x.varY] = [3]');
    assert.strictEqual(substitute('({varX: varZ} = {varX: 3})'), '({varX: z} = {varX: 3})');
    assert.strictEqual(substitute('[varX = varY] = []'), '[x = y] = []');
    assert.strictEqual(substitute('({varX: varZ.x} = {varX: 3})'), '({varX: z.x} = {varX: 3})');

    assert.strictEqual(substitute('let [varX, varY] = [varZ, 1]; varX'), 'let [varX, varY] = [z, 1]; varX');
    assert.strictEqual(substitute('let [varX = varY] = []'), 'let [varX = y] = []');
    assert.strictEqual(substitute('var {varX: varZ} = {varX: 3}; varZ'), 'var {varX: varZ} = {varX: 3}; varZ');

    // Avoid captures.
    assert.strictEqual(substitute('let [y, x] = [varX, varY]; x'), 'let [y_1, x_1] = [x, y]; x_1');
    assert.strictEqual(substitute('var {varX: x} = {varX}; x'), 'var {varX: x_1} = {varX: x}; x_1');
  });

  it('Does not substitute in strings', () => {
    assert.strictEqual(substitute('\'varX\''), '\'varX\'');
    assert.strictEqual(substitute('\"varX\"'), '\"varX\"');
    assert.strictEqual(substitute('\`varX\`'), '\`varX\`');
  });

  it('Does not substitute in comments', () => {
    assert.strictEqual(substitute('/* varX */'), '/* varX */');
    assert.strictEqual(substitute('// varX'), '// varX');
  });

  it('Throws on to-be-captured "this" and "arguments" bound by a function', () => {
    assert.throws(() => substitute('function f() { return rename_to_this; }'), 'Cannot avoid capture of \'this\'');
    assert.throws(
        () => substitute('function f() { return rename_to_arguments; }'), 'Cannot avoid capture of \'arguments\'');
  });

  it('Throws on parse error', () => {
    assert.throws(() => substitute('('), SyntaxError);
  });

  it('Throws if the renamed variable is unavailable', () => {
    assert.throws(() => substitute('varQ'), Error);
  });

  describe('Binding expressions', () => {
    const exprMapping = new Map<string, string|null>([
      ['memberVar', '_module.x'],
      ['memberVarY', '_module.y'],
      ['nestedMemberVar', 'a.b.c'],
      ['privateFieldVar', 'this.#secret'],
      ['argVar', 'arguments[0]'],
      ['computedMemberVar', 'arr[idx]'],
      ['binaryVar', 'a + 1'],
      ['ternaryVar', 'cond ? a : b'],
      ['objectVar', '{a: 1}'],
      ['numberVar', '42'],
      ['optionalChainVar', 'a?.b'],
      ['callVar', 'getVal(a)'],
      ['iifeVar', '((tmp) => tmp + freeVar)(1)'],
      ['brokenVar', 'a +'],
      ['unbalancedVar', 'a) + (b'],
      ['multiStmtVar', 'a; b'],
    ]);

    function substituteExpr(expression: string, customMap = exprMapping): string {
      return FormatterWorker.Substitute.substituteExpression(expression, customMap);
    }

    it('Substitutes member expressions without outer parentheses', () => {
      assert.strictEqual(substituteExpr('memberVar'), '_module.x');
      assert.strictEqual(substituteExpr('nestedMemberVar'), 'a.b.c');
      assert.strictEqual(substituteExpr('privateFieldVar'), 'this.#secret');
      assert.strictEqual(substituteExpr('argVar'), 'arguments[0]');
      assert.strictEqual(substituteExpr('computedMemberVar'), 'arr[idx]');
      assert.strictEqual(substituteExpr('memberVar.prop'), '_module.x.prop');
      assert.strictEqual(substituteExpr('memberVar()'), '_module.x()');
      assert.strictEqual(substituteExpr('memberVar + 1'), '_module.x + 1');
    });

    it('Preserves L-value assignability for member expressions', () => {
      assert.strictEqual(substituteExpr('memberVar = 5'), '_module.x = 5');
      assert.strictEqual(substituteExpr('memberVar += 1'), '_module.x += 1');
      assert.strictEqual(substituteExpr('memberVar++'), '_module.x++');
      assert.strictEqual(substituteExpr('--privateFieldVar'), '--this.#secret');
      assert.strictEqual(substituteExpr('argVar = 10'), 'arguments[0] = 10');
      assert.strictEqual(substituteExpr('[memberVar] = [1]'), '[_module.x] = [1]');
      assert.strictEqual(substituteExpr('({a: memberVar} = obj)'), '({a: _module.x} = obj)');
      assert.strictEqual(substituteExpr('({memberVar} = obj)'), '({memberVar: _module.x} = obj)');
      assert.strictEqual(substituteExpr('for (memberVar of list) {}'), 'for (_module.x of list) {}');
    });

    it('Parenthesizes non-member expressions to preserve operator precedence', () => {
      assert.strictEqual(substituteExpr('binaryVar * 2'), '(a + 1) * 2');
      assert.strictEqual(substituteExpr('!binaryVar'), '!(a + 1)');
      assert.strictEqual(substituteExpr('ternaryVar ? 1 : 2'), '(cond ? a : b) ? 1 : 2');
      assert.strictEqual(substituteExpr('objectVar.a'), '({a: 1}).a');
      assert.strictEqual(substituteExpr('numberVar.toFixed(2)'), '(42).toFixed(2)');
      assert.strictEqual(substituteExpr('optionalChainVar.c'), '(a?.b).c');
      assert.strictEqual(substituteExpr('new callVar()'), 'new (getVal(a))()');
    });

    it('Expands shorthand object properties with binding expressions', () => {
      assert.strictEqual(substituteExpr('({ memberVar })'), '({ memberVar: _module.x })');
      assert.strictEqual(substituteExpr('({ binaryVar })'), '({ binaryVar: (a + 1) })');
      assert.strictEqual(substituteExpr('({ privateFieldVar })'), '({ privateFieldVar: this.#secret })');
    });

    it('Performs capture-avoiding alpha-renaming for free identifiers in binding expressions', () => {
      assert.strictEqual(substituteExpr('(_module) => _module + memberVar'), '(_module_1) => _module_1 + _module.x');
      assert.strictEqual(substituteExpr('(a, b) => a + b + ternaryVar'), '(a_1, b_1) => a_1 + b_1 + (cond ? a : b)');
      assert.strictEqual(substituteExpr('(arr, idx) => arr[idx] + computedMemberVar'),
                         '(arr_1, idx_1) => arr_1[idx_1] + arr[idx]');
    });

    it('Deduplicates captured binders across multiple uses and multiple mapped variables', () => {
      assert.strictEqual(substituteExpr('(_module) => _module + memberVar + memberVar'),
                         '(_module_1) => _module_1 + _module.x + _module.x');
      assert.strictEqual(substituteExpr('(_module) => _module + memberVar + memberVarY'),
                         '(_module_1) => _module_1 + _module.x + _module.y');
    });

    it('Does not alpha-rename identifiers that are bound locally inside a binding expression', () => {
      // In `((tmp) => tmp + freeVar)(1)`, `tmp` is bound inside the binding expression while `freeVar` is free.
      assert.strictEqual(substituteExpr('(tmp) => tmp + iifeVar'), '(tmp) => tmp + (((tmp) => tmp + freeVar)(1))');
      assert.strictEqual(substituteExpr('(freeVar) => freeVar + iifeVar'),
                         '(freeVar_1) => freeVar_1 + (((tmp) => tmp + freeVar)(1))');
    });

    it('Handles `this` and `arguments` inside binding expressions for arrow functions vs regular functions', () => {
      // Arrow functions do not bind their own `this` or `arguments`.
      assert.strictEqual(substituteExpr('() => privateFieldVar'), '() => this.#secret');
      assert.strictEqual(substituteExpr('() => argVar'), '() => arguments[0]');

      // Regular functions bind `this` and `arguments` as FIXED, so capture cannot be avoided.
      assert.throws(() => substituteExpr('function f() { return privateFieldVar; }'),
                    'Cannot avoid capture of \'this\'');
      assert.throws(() => substituteExpr('function f() { return argVar; }'), 'Cannot avoid capture of \'arguments\'');
    });

    it('Only throws on malformed binding expressions if the mapped variable is referenced', () => {
      // `brokenVar`, `unbalancedVar`, and `multiStmtVar` are in `exprMapping` but not used in `'memberVar + 1'`.
      assert.strictEqual(substituteExpr('memberVar + 1'), '_module.x + 1');

      // Referencing a variable with a malformed binding expression throws SyntaxError.
      assert.throws(() => substituteExpr('brokenVar + 1'), SyntaxError);
      assert.throws(() => substituteExpr('unbalancedVar + 1'), SyntaxError);
      assert.throws(() => substituteExpr('multiStmtVar + 1'), SyntaxError);
    });
  });
});
