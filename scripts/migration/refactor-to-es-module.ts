import { parse, print, types } from 'recast';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { IdentifierKind, MemberExpressionKind, ExpressionKind } from 'ast-types/gen/kinds';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const FRONT_END_FOLDER = path.join(__dirname, '..', '..', 'front_end')

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const b = types.builders;

function createReplacementDeclaration(propertyName: IdentifierKind, declaration: any): any {
  if (declaration.type === 'ClassExpression') {
    return b.exportDeclaration(false, b.classDeclaration(propertyName, declaration.body));
  }
  if (declaration.type === 'Literal' || declaration.type.endsWith('Expression')) {
    return b.exportNamedDeclaration(b.variableDeclaration("const", [b.variableDeclarator(propertyName, declaration)]));
  }
  console.error(`Unable to refactor declaration of type "${declaration.type}" named "${propertyName.name}"`);
}

function getTopLevelMemberExpression(expression: MemberExpressionKind): any {
  while (expression.object.type === 'MemberExpression') {
    expression = expression.object;
  }

  return expression;
}

function rewriteSource(source: string, refactoringNamespace: string, refactoringFileName: string) {
  const exportedMembers: IdentifierKind[] = [];
  let needToObjectAssign = false;
  const ast = parse(source);

  ast.program.body = ast.program.body.map((expression: any) => {
    if (expression.type === 'ExpressionStatement') {
      if (expression.expression.type === 'AssignmentExpression') {
        const assignment = expression.expression;
        if (assignment.left.type === 'MemberExpression') {
          const topLevelAssignment = getTopLevelMemberExpression(assignment.left);

          // If there is a nested export, such as `UI.ARIAUtils.Nested.Field`
          if (topLevelAssignment !== assignment.left.object) {
            // Exports itself. E.g. `UI.ARIAUtils = <...>`
            if (assignment.left.object.name === refactoringNamespace && assignment.left.property.name === refactoringFileName) {
              const {declaration} = createReplacementDeclaration(assignment.left.property, assignment.right);
              const declarationStatement = b.exportDefaultDeclaration(declaration.type === 'VariableDeclaration' ? declaration.declarations[0].init : declaration);
              
              declarationStatement.comments = expression.comments;

              if (needToObjectAssign) {
                console.error(`Multiple exports with the same name is invalid!`);
              }

              needToObjectAssign = true;

              return declarationStatement;
            }
            console.error(`Nested field "${assignment.left.property.name}" detected! Requires manual changes.`);
            return expression;
          }
          
          const propertyName = assignment.left.property;
          const {object, property} = topLevelAssignment;

          if (object.type === 'Identifier' && property.type === 'Identifier') {
            const namespace = object.name;
            const fileName = property.name;

            if (namespace === refactoringNamespace && fileName === refactoringFileName) {
              const declaration = createReplacementDeclaration(propertyName, assignment.right);

              if (declaration) {
                exportedMembers.push(propertyName);
                declaration.comments = expression.comments;
                return declaration;
              }
            }
          }
        }
      }
    }

    return expression;
  });

  // self.UI = self.UI || {};
  const legacyNamespaceName = b.memberExpression(b.identifier('self'), b.identifier(refactoringNamespace), false);
  const legacyNamespaceOr = b.logicalExpression("||", legacyNamespaceName, b.objectExpression([]));
  ast.program.body.push(b.expressionStatement.from({expression: b.assignmentExpression('=', legacyNamespaceName, legacyNamespaceOr), comments: [b.commentBlock('Legacy exported object', true, false)]}));
  
  // self.UI.ARIAUtils = {properties};
  const legacyNamespaceExport = b.memberExpression(b.identifier('self'), b.memberExpression(b.identifier(refactoringNamespace), b.identifier(refactoringFileName), false), false);
  let exportedObjectProperties: ExpressionKind = b.objectExpression(exportedMembers.map(prop => b.objectProperty.from({key: prop, value: prop, shorthand: true })));

  // self.UI.ARIAUtils = Object.assign(ARIAUtils, {properties})
  if (needToObjectAssign) {
    exportedObjectProperties = b.callExpression(b.memberExpression(b.identifier('Object'), b.identifier('assign'), false), [b.identifier(refactoringFileName), exportedObjectProperties]);
  }

  ast.program.body.push(b.expressionStatement(b.assignmentExpression('=', legacyNamespaceExport, exportedObjectProperties)));
  
  return print(ast).code;
}

const FOLDER_MAPPING: {[name: string]: string} = require(path.join('..', 'special_case_namespaces.json'));

function computeNamespaceName(folderName: string): string {
  if (folderName in FOLDER_MAPPING) {
    return FOLDER_MAPPING[folderName];
  }
  return capitalizeFirstLetter(folderName);
}

async function main(refactoringNamespace: string, refactoringFileName: string) {
  const pathName = path.join(FRONT_END_FOLDER, refactoringNamespace, `${refactoringFileName}.js`);
  const source = await readFile(pathName, {encoding: 'utf-8'});

  const rewrittenSource = rewriteSource(source, computeNamespaceName(process.argv[2]), refactoringFileName);

  await writeFile(pathName, rewrittenSource);

  // console.log(`Succesfully written source to "${pathName}". Make sure that no other errors are reported before submitting!`);
}

if (!process.argv[2]) {
  console.error(`No arguments specified. Run this script with "<folder-name> <filename>". For example: "common Color"`);
  process.exit(1);
}

main(process.argv[2], process.argv[3]);