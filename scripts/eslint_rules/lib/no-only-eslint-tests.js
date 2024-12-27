// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Usage of only: true in ESLint tests',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {noOnlyInESLintTest: 'You cannot use only: true in an ESLint test.'},
    schema: []  // no options
  },
  create: function(context) {
    function checkForOnlyInTestCases(testCaseObjects) {
      for (const testCase of testCaseObjects) {
        if (!testCase || !testCase.properties) {
          continue;
        }

        const onlyKeyProp = testCase.properties.find(prop => {
          return prop.key.name === 'only';
        });
        if (onlyKeyProp) {
          context.report({
            node: onlyKeyProp,
            messageId: 'noOnlyInESLintTest',
            fix(fixer) {
              const sourceCode = context.getSourceCode();
              let nextNode = sourceCode.getTokenAfter(onlyKeyProp);

              // To delete the property, the trailing comma, and then the
              // resulting new line, we find the next node after the comma and
              // delete up to that. That ensures that when we remove the
              // property we also remove the emtpy line.
              if (nextNode?.value === ',') {
                nextNode = sourceCode.getTokenAfter(nextNode);
              }

              return [
                fixer.removeRange([onlyKeyProp.range[0], nextNode.range[0]]),
              ];
            }
          });
        }
      }
    }

    return {
      // match ruleTester.run('foo', rule, {...})
      'CallExpression[callee.object.name=\'ruleTester\'][callee.property.name=\'run\']'(node) {
        // first argument = string name
        // second argument = rule itself
        // third argument = the object containing the test cases - what we want!
        const tests = node.arguments[2];
        if (!tests || !tests.properties) {
          return;
        }

        for (const testProperty of tests.properties) {
          // Iterate over the "valid" and "invalid" rules
          // Here .value = the array of test cases, and .elements gets us each
          // object (individual test case) within that array.
          checkForOnlyInTestCases(testProperty.value.elements);
        }
      }
    };
  }
};
