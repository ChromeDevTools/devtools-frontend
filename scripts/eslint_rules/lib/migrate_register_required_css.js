// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const path = require('path');
const fs = require('fs');

function lookForParentClassBodyNode(node) {
  if (!node.parent) {
    /**
     * If there is no parent node, we didn't find the class for the call to registerRequiredCSS.
     * We will catch this null with a try catch and ask the file to be migrated manually.
     **/

    return null;
  }

  if (node.type === 'ClassBody') {
    /**
     * We have found the node that is the body of the class and where we need to add a wasShown method. */
    return node;
  }

  return lookForParentClassBodyNode(node.parent);
}

function lookForWasShownMethod(node) {
  for (const methodDefinition of node.body) {
    if (methodDefinition.key.name === 'wasShown') {
      return methodDefinition;
    }
  }
  /**
   * If we did not find a wasShown method then we can return null and insert it ourselves.
   **/
  return null;
}

function lookForRegisterCSSFilesCall(node, privatePropertyName) {
  for (const expressionStatement of node.body) {
    if (expressionStatement.expression && expressionStatement.expression.callee &&
        expressionStatement.expression.callee.property.name === 'registerCSSFiles') {
      /**
       * Once we find a registerCSSFiles call in wasShown(), we need to check that the objects they are being called on the same. If the call is
       * a `this.registerCSSFiles()` then privatePropertyName is ''. Otherwise, we check that the privatePropertyName is the same as the one we are
       * calling registerCSSFiles() on.
       **/
      if (privatePropertyName === '') {
        // We are looking for a this.registerRequiredCSS here
        if (expressionStatement.expression.callee.object.type === 'ThisExpression') {
          return expressionStatement.expression;
        }
      }

      // This checks for a this._widget.registerRequiredCSS here
      if (expressionStatement.expression.callee.object.type === 'MemberExpression' &&
          expressionStatement.expression.callee.object.property.name === privatePropertyName) {
        return expressionStatement.expression;
      }
    }
  }
  return null;
}

function updateGRDFile(cssFilePath) {
  if (process.env.ESLINT_SKIP_GRD_UPDATE) {
    return;
  }

  const contents = fs.readFileSync('config/gni/devtools_grd_files.gni', 'utf-8').split('\n').map(c => c.trim());
  const newGRDFileEntry = JSON.stringify(`front_end/${cssFilePath}.js`) + ',';
  if (contents.includes(newGRDFileEntry)) {
    return;
  }

  const index = contents.findIndex(line => line.includes('.css.js'));
  contents.splice(index, 0, newGRDFileEntry);
  const finalContents = contents.join('\n');
  fs.writeFileSync('config/gni/devtools_grd_files.gni', finalContents, 'utf-8');
}

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Checks wasShown() method definitions call super.wasShown();',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      ExpressionStatement(node) {
        if (node.expression.type === 'CallExpression' && node.expression.callee.object &&
            (node.expression.callee.object.type === 'ThisExpression' ||
             node.expression.callee.object.type === 'MemberExpression') &&
            node.expression.callee.property.name === 'registerRequiredCSS') {
          /* Construct 'import componentStyles form './componentStyles.css.js'' statement */
          const filenameWithExtension = node.expression.arguments[0].value;
          const filename = path.basename(filenameWithExtension, '.css');
          const newFileName = filename + 'Styles';

          const importDir = 'front_end/' + path.dirname(filenameWithExtension);
          const fileDir = path.dirname(context.getFilename());
          const relativeImport = path.relative(fileDir, importDir).replace(/\\/g, '/');
          const importStatement = relativeImport === '' ?
              `import ${newFileName} from \'./${filename}.css.js\';\n` :
              `import ${newFileName} from \'${relativeImport}/${filename}.css.js\';\n`;

          const programNode = context.getAncestors()[0];
          const containsImport = context.getSourceCode().getText().includes(importStatement);

          /* Some calls are this._widget.registerRequiredCSS() so we need to store the private property that the function is called on. */
          const privateProperty = node.expression.callee.object.type === 'MemberExpression';
          const privatePropertyName = privateProperty ? node.expression.callee.object.property.name : '';

          try {
            const classBodyNode = lookForParentClassBodyNode(node);

            const registerCSSFilesText =
                `\n    this.${privateProperty ? privatePropertyName + '.' : ''}registerCSSFiles([${newFileName}]);`;

            const wasShownFunction = lookForWasShownMethod(classBodyNode);
            if (wasShownFunction) {
              const registerCSSFilesCall =
                  lookForRegisterCSSFilesCall(wasShownFunction.value.body, privatePropertyName);
              if (registerCSSFilesCall) {
                /*
                 * If a wasShown() method exists and there is already a call to registerCSSFiles on the
                 * appropriate property or object then we add a new argument to the call.
                 */

                const firstArg = registerCSSFilesCall.arguments[0].elements[0];

                if (containsImport) {
                  // File is already imported so does not need another import statement or to be added to devtools_grd_files
                  context.report({
                    node,
                    message: 'Import CSS file instead of using registerRequiredCSS and edit wasShown method',
                    fix(fixer) {
                      return [fixer.insertTextBefore(firstArg, newFileName + ', '), fixer.remove(node)];
                    }
                  });

                  return;
                }

                context.report({
                  node,
                  message: 'Import CSS file instead of using registerRequiredCSS and edit wasShown method',
                  fix(fixer) {
                    return [
                      fixer.insertTextBefore(programNode, importStatement),
                      fixer.insertTextBefore(firstArg, newFileName + ', '), fixer.remove(node)
                    ];
                  }
                });

                updateGRDFile(filenameWithExtension);
                return;
              }

              /* If a wasShown() method exists then it adds the registerCSSFiles() to the second line. */
              if (containsImport) {
                // File is already imported so does not need another import statement or to be added to devtools_grd_files
                context.report({
                  node,
                  message: 'Import CSS file instead of using registerRequiredCSS and edit wasShown method',
                  fix(fixer) {
                    return [
                      fixer.insertTextAfter(wasShownFunction.value.body.body[0], registerCSSFilesText),
                      fixer.remove(node)
                    ];
                  }
                });

                return;
              }

              context.report({
                node,
                message: 'Import CSS file instead of using registerRequiredCSS and edit wasShown method',
                fix(fixer) {
                  return [
                    fixer.insertTextBefore(programNode, importStatement),
                    fixer.insertTextAfter(wasShownFunction.value.body.body[0], registerCSSFilesText), fixer.remove(node)
                  ];
                }
              });

              updateGRDFile(filenameWithExtension);
              return;
            }

            /* wasShown method does not exist and has to be added as the last method in the class. */
            const lastMethodDeclarationNode = classBodyNode.body[classBodyNode.body.length - 1];
            const wasShownText = `\n  wasShown(): void {
    super.wasShown();${registerCSSFilesText}\n  }`;

            if (containsImport) {
              context.report({
                node,
                message: 'Import CSS file instead of using registerRequiredCSS and add wasShown method',
                fix(fixer) {
                  return [fixer.insertTextAfter(lastMethodDeclarationNode, wasShownText), fixer.remove(node)];
                }
              });

              return;
            }

            context.report({
              node,
              message: 'Import CSS file instead of using registerRequiredCSS and add wasShown method',
              fix(fixer) {
                return [
                  fixer.insertTextBefore(programNode, importStatement),
                  fixer.insertTextAfter(lastMethodDeclarationNode, wasShownText), fixer.remove(node)
                ];
              }
            });

            updateGRDFile(filenameWithExtension);
          } catch (error) {
            /* Any errors will be expected to be migrated manually. */
            context.report({
              node,
              message: `Please manually migrate ${
                  filenameWithExtension} as it has edge cases not covered by this script. Got error: ${error.message}.`,
            });
          }
        }
      }
    };
  }
};
