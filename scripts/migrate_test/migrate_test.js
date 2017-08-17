// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const fs = require('fs');
const path = require('path');

const cheerio = require('cheerio');
const mkdirp = require('mkdirp');
const prettier = require('prettier');
const recast = require('recast');
const types = recast.types;
const b = recast.types.builders;

const migrateUtils = require('./migrate_utils');
const utils = require('../utils');

const RUN_TEST_REGEX = /\s*runTest\(\);?\n*/
const DRY_RUN = process.env.DRY_RUN || false;
const FRONT_END_PATH = path.resolve(__dirname, '..', '..', 'front_end');
const LINE_BREAK = '$$SECRET_IDENTIFIER_FOR_LINE_BREAK$$();';

function main() {
  const files = process.argv.slice(2);
  const inputPaths = files.map(p => path.isAbsolute(p) ? p : path.resolve(process.cwd(), p));
  const identifierMap = generateTestHelperMap();

  for (const inputPath of inputPaths) {
    migrateTest(inputPath, identifierMap);
  }
  console.log(`Finished migrating ${inputPaths.length} tests`);
}

main();

function getPrologue(inputExpectationsPath, bodyText) {
  const expectations = fs.readFileSync(inputExpectationsPath, 'utf-8').split('\n');
  const prologueBeginning = bodyText.split('\n')[0];
  for (const line of expectations) {
    if (line.startsWith(prologueBeginning)) {
      return line;
    }
  }
}

function migrateTest(inputPath, identifierMap) {
  console.log('Starting to migrate: ', inputPath);

  const htmlTestFile = fs.readFileSync(inputPath, 'utf-8');
  const $ = cheerio.load(htmlTestFile);

  const inputExpectationsPath = inputPath.replace('.js', '-expected.txt').replace('.html', '-expected.txt');
  const bodyText = $('body').text().trim();
  const prologue = getPrologue(inputExpectationsPath, bodyText);

  const stylesheetPaths = $('link').toArray().filter(l => l.attribs.rel === 'stylesheet').map(l => l.attribs.href);
  const onloadFunctionName = $('body')[0].attribs.onload ? $('body')[0].attribs.onload.slice(0, -2) : '';
  const javascriptFixtures = [];
  const inputCode = $('script:not([src])')
                        .toArray()
                        .map(n => n.children[0].data)
                        .map(code => processScriptCode(code, javascriptFixtures, onloadFunctionName))
                        .filter(x => !!x)
                        .join('\n');
  const helperScripts = [];
  const resourceScripts = [];
  $('script[src]').toArray().map((n) => n.attribs.src).forEach(src => {
    if (src.indexOf('resources/') !== -1) {
      resourceScripts.push(src);
      return;
    }
    const components = src.split('/');
    var filename = components[components.length - 1].split('.')[0];
    helperScripts.push(filename);
  });

  const destResourcePaths = resourceScripts.map(s => path.resolve(path.dirname(inputPath), s));
  const relativeResourcePaths = destResourcePaths.map(p => path.relative(path.dirname(inputPath), p));

  let outputCode;
  try {
    const testHelpers = mapTestHelpers(helperScripts);
    let domFixture = $('body')
                         .html()
                         .trim()
                         // Unescapes apostrophe
                         .replace(/&apos;/g, `'`)
                         // Tries to remove it if it has it's own line
                         .replace(prologue + '\n', '')
                         // Tries to remove it if it's inline
                         .replace(prologue, '')
                         .replace(/<p>\s*<\/p>/, '')
                         .replace(/<div>\s*<\/div>/, '')
                         .trim();
    const docType = htmlTestFile.match(/<!DOCTYPE.*>/) ? htmlTestFile.match(/<!DOCTYPE.*>/)[0] : '';
    if (docType)
      domFixture = docType + (domFixture.length ? '\n' : '') + domFixture;
    outputCode = transformTestScript(
        inputCode, prologue, identifierMap, testHelpers, javascriptFixtures, getPanel(inputPath), domFixture,
        onloadFunctionName, relativeResourcePaths, stylesheetPaths);
    outputCode = prettier.format(outputCode, {tabWidth: 2, printWidth: 120, singleQuote: true});
  } catch (err) {
    console.log('Unable to migrate: ', inputPath);
    console.log('ERROR: ', err);
    process.exit(1);
  }

  console.log(outputCode);
  if (!DRY_RUN) {
    const testsPath = path.resolve(__dirname, 'tests.txt');
    const newToOldTests =
        new Map(fs.readFileSync(testsPath, 'utf-8').split('\n').map(line => line.split(' ').reverse()));
    const originalTestPath = path.resolve(
        __dirname, '..', '..', '..', '..', 'LayoutTests',
        newToOldTests.get(inputPath.slice(inputPath.indexOf('http/'))));

    const srcResourcePaths = resourceScripts.map(s => path.resolve(path.dirname(originalTestPath), s));

    fs.writeFileSync(inputPath, outputCode);
    copyResourceScripts(srcResourcePaths, destResourcePaths, inputPath);
    console.log('Migrated: ', inputPath);
  }
}

function copyResourceScripts(srcResourcePaths, destResourcePaths, inputPath) {
  destResourcePaths.forEach((p, i) => {
    mkdirp.sync(path.dirname(p));
    if (!utils.isFile(p)) {
      fs.writeFileSync(p, fs.readFileSync(srcResourcePaths[i]));
    } else {
      const originalResource = fs.readFileSync(srcResourcePaths[i]);
      const newResource = fs.readFileSync(p);
      if (originalResource !== newResource) {
        console.log('Discrepancy with resource script', p, 'for file: ', inputPath);
      }
    }
  });
}

function transformTestScript(
    inputCode, prologue, identifierMap, explicitTestHelpers, javascriptFixtures, panel, domFixture, onloadFunctionName,
    relativeResourcePaths, stylesheetPaths) {
  const ast = recast.parse(inputCode);

  /**
   * Wrap everything that's not the magical 'test' function
   * with evaluateInPagePromise
   */
  const nonTestNodes = [];
  for (const [index, node] of ast.program.body.entries()) {
    if (node.type === 'FunctionDeclaration' && node.id.name === 'test') {
      continue;
    }
    if (node.type === 'VariableDeclaration' && node.declarations[0].id.name === 'test') {
      continue;
    }
    nonTestNodes.push(node);
  }
  const nonTestAst = recast.parse('');
  nonTestAst.program.body = nonTestNodes;

  replaceBodyWithFunctionExpression(ast, 'test');
  replaceBodyWithFunctionDeclaration(ast, 'test');


  /**
   * Need to track all of the namespaces used because test helper refactoring
   * requires additional fine-grained dependencies for some tests
   */
  const namespacesUsed = new Set();

  /**
   * Migrate all the call sites from InspectorTest to .*TestRunner
   */
  recast.visit(ast, {
    visitIdentifier: function(path) {
      if (path.parentPath && path.parentPath.value && path.parentPath.value.object &&
          path.parentPath.value.object.name === 'InspectorTest' && path.value.name !== 'InspectorTest') {
        const newParentIdentifier = identifierMap.get(path.value.name);
        if (!newParentIdentifier) {
          throw new Error('Could not find identifier for: ' + path.value.name);
        }
        path.parentPath.value.object.name = newParentIdentifier;
        namespacesUsed.add(newParentIdentifier.split('.')[0]);
      }
      return false;
    }
  });

  /**
   * Migrate all the .bind call sites
   * Example: SourcesTestRunner.waitUntilPaused.bind(InspectorTest, didPause)
   */
  recast.visit(ast, {
    visitCallExpression: function(path) {
      const node = path.value;
      if (node.callee.property && node.callee.property.name === 'bind') {
        const code = recast.prettyPrint(node);
        if (node.arguments[0].name === 'InspectorTest') {
          node.arguments[0].name = node.callee.object.object.name;
        }
      }
      this.traverse(path);
    }
  });


  const allTestHelpers = new Set();

  for (const helper of explicitTestHelpers) {
    allTestHelpers.add(helper);
  }

  for (const namespace of namespacesUsed) {
    if (namespace === 'TestRunner')
      continue;
    const moduleName = namespace.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase();
    allTestHelpers.add(moduleName);
  }

  /**
   * Create test header based on extracted data
   */
  const headerLines = [];
  headerLines.push(createExpressionNode(`TestRunner.addResult(\`${prologue}\\n\`);`));
  headerLines.push(createNewLineNode());
  for (const helper of allTestHelpers) {
    headerLines.push(createAwaitExpressionNode(`await TestRunner.loadModule('${helper}');`));
  }
  if (panel)
    headerLines.push(createAwaitExpressionNode(`await TestRunner.showPanel('${panel}');`));

  if (domFixture) {
    headerLines.push(createAwaitExpressionNode(`await TestRunner.loadHTML(\`
${domFixture.split('\n').map(line => '    ' + line).join('\n')}
\`);`));
  }

  stylesheetPaths.forEach(p => {
    headerLines.push(createAwaitExpressionNode(`await TestRunner.addStylesheetTag('${p}');`));
  });

  relativeResourcePaths.forEach(p => {
    headerLines.push(createAwaitExpressionNode(`await TestRunner.addScriptTag('${p}');`));
  });

  for (const fixture of javascriptFixtures) {
    headerLines.push(fixture);
  }

  const nonTestCode = formatNonTestCode(nonTestAst, onloadFunctionName).trim();

  if (nonTestCode) {
    headerLines.push((createAwaitExpressionNode(`await TestRunner.evaluateInPagePromise(\`
  ${nonTestCode}
\`);`)));
  }

  headerLines.push(createNewLineNode());

  ast.program.body = headerLines.concat(ast.program.body);

  /**
   * Wrap entire body in an async IIFE
   */
  const iife = b.functionExpression(null, [], b.blockStatement(ast.program.body));
  iife.async = true;
  ast.program.body = [b.expressionStatement(b.callExpression(iife, []))];

  return print(ast);
}

/**
 * If the <script></script> block doesn't contain a test function
 * assume that it needs to be serialized
 */
function processScriptCode(code, javascriptFixtures, onloadFunctionName) {
  const ast = recast.parse(code);
  const testFunctionExpression =
      ast.program.body.find(n => n.type === 'VariableDeclaration' && n.declarations[0].id.name === 'test');
  const testFunctionDeclaration = ast.program.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'test');
  if (testFunctionExpression || testFunctionDeclaration) {
    return code;
  }
  const formattedCode = formatNonTestCode(ast, onloadFunctionName);

  javascriptFixtures.push(createAwaitExpressionNode(`await TestRunner.evaluateInPagePromise(\`${formattedCode}
\`);`));
  return;
}

function formatNonTestCode(ast, onloadFunctionName) {
  inlineFunctionExpression(ast, onloadFunctionName);
  inlineFunctionDeclaration(ast, onloadFunctionName);
  return recast.print(ast)
      .code.trimRight()
      .split('\n')
      .map(line => '    ' + line)
      .join('\n')
      .replace(RUN_TEST_REGEX, '');
}

/**
 * Unwrap test if it's a function expression
 * var test = function () {...}
 */
function replaceBodyWithFunctionExpression(ast, functionName) {
  const index =
      ast.program.body.findIndex(n => n.type === 'VariableDeclaration' && n.declarations[0].id.name === functionName);
  if (index > -1) {
    const testFunctionNode = ast.program.body[index];
    ast.program.body = testFunctionNode.declarations[0].init.body.body;
  }
}

function inlineFunctionExpression(ast, functionName) {
  const index =
      ast.program.body.findIndex(n => n.type === 'VariableDeclaration' && n.declarations[0].id.name === functionName);
  if (index > -1) {
    const testFunctionNode = ast.program.body[index];
    ast.program.body.splice(index, 1, ...testFunctionNode.declarations[0].init.body.body);
  }
}

/**
 * Unwrap test if it's a function declaration
 * function test () {...}
 */
function replaceBodyWithFunctionDeclaration(ast, functionName) {
  const index = ast.program.body.findIndex(n => n.type === 'FunctionDeclaration' && n.id.name === functionName);
  if (index > -1) {
    const testFunctionNode = ast.program.body[index];
    ast.program.body.splice(index, 1);
    ast.program.body = testFunctionNode.body.body;
  }
}

function inlineFunctionDeclaration(ast, functionName) {
  debugger;
  const index = ast.program.body.findIndex(n => n.type === 'FunctionDeclaration' && n.id.name === functionName);
  if (index > -1) {
    const testFunctionNode = ast.program.body[index];
    ast.program.body.splice(index, 1, ...testFunctionNode.body.body);
  }
}

function print(ast) {
  const copyrightNotice = `// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

`;

  /**
   * Not using clang-format because certain tests look bad when formatted by it.
   * Recast pretty print is smarter about preserving existing spacing.
   */
  let code = recast.print(ast).code;
  code = code.replace(/(\/\/\#\s*sourceURL=[\w-]+)\.html/, '$1.js');
  code = code.replace(/\s*\$\$SECRET_IDENTIFIER_FOR_LINE_BREAK\$\$\(\);/g, '\n');
  const copyrightedCode = copyrightNotice + code + '\n';
  return copyrightedCode;
}

function getPanel(inputPath) {
  const panelByFolder = {
    'animation': 'elements',
    'audits': 'audits',
    'console': 'console',
    'elements': 'elements',
    'editor': 'sources',
    'layers': 'layers',
    'network': 'network',
    'profiler': 'heap_profiler',
    'resource-tree': 'resources',
    'search': 'sources',
    'security': 'security',
    'service-workers': 'resources',
    'sources': 'sources',
    'timeline': 'timeline',
    'tracing': 'timeline',
  };

  const components = inputPath.slice(inputPath.indexOf('LayoutTests/')).split('/');
  const folder = inputPath.indexOf('LayoutTests/inspector') === -1 ? components[4] : components[2];
  if (folder.endsWith('.html'))
    return;
  const panel = panelByFolder[folder];
  if (!panel) {
    throw new Error('Could not figure out which panel to map folder: ' + folder);
  }
  return panel;
}

function mapTestHelpers(testHelpers) {
  const mappedHelpers = new Set();
  for (const helper of testHelpers) {
    const namespace = migrateUtils.mapTestFilename(helper).namespacePrefix + 'TestRunner';
    const mappedHelper = namespace.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase();
    if (!mappedHelper) {
      throw Error('Could not map helper ' + helper);
    }
    if (mappedHelper !== 'inspector_test_runner') {
      mappedHelpers.add(mappedHelper);
    }
  }
  return Array.from(mappedHelpers);
}

function generateTestHelperMap() {
  const map = new Map();
  for (const folder of fs.readdirSync(FRONT_END_PATH)) {
    if (folder.indexOf('test_runner') === -1) {
      continue;
    }
    const testRunnerModulePath = path.resolve(FRONT_END_PATH, folder);
    if (!utils.isDir(testRunnerModulePath)) {
      continue;
    }
    for (const filename of fs.readdirSync(testRunnerModulePath)) {
      if (filename === 'module.json') {
        continue;
      }
      scrapeTestHelperIdentifiers(path.resolve(testRunnerModulePath, filename));
    }
  }

  // Manual overrides
  map.set('consoleModel', 'ConsoleModel');
  map.set('networkLog', 'NetworkLog');

  return map;

  function scrapeTestHelperIdentifiers(filePath) {
    var content = fs.readFileSync(filePath).toString();
    var lines = content.split('\n');
    for (var line of lines) {
      var line = line.trim();
      if (line.indexOf('TestRunner.') === -1)
        continue;
      var match = line.match(/^\s*(\b\w*TestRunner.[a-z_A-Z0-9]+)\s*(\=[^,}]|[;])/) ||
          line.match(/^(TestRunner.[a-z_A-Z0-9]+)\s*\=$/);
      if (!match)
        continue;
      var name = match[1];
      var components = name.split('.');
      if (components.length !== 2)
        continue;
      map.set(components[1], components[0]);
    }
  }
}

/**
 * Hack to quickly create an AST node
 */
function createExpressionNode(code) {
  return recast.parse(code).program.body[0];
}

/**
 * Hack to quickly create an AST node
 */
function createAwaitExpressionNode(code) {
  code = code.split('\n').map(line => line.trimRight()).join('\n');
  var prettyPrintedCode =
      convertToTwoSpaceIndent(recast.prettyPrint(recast.parse(`(async function(){${code}});`)).code);
  return recast.parse(prettyPrintedCode).program.body[0].expression.body.body[0];
}

function convertToTwoSpaceIndent(code) {
  var lines = code.split('\n').map(line => dedent(line));
  return lines.join('\n');

  function dedent(line) {
    if (line.startsWith('    '))
      return '  ' + dedent(line.slice(4));
    return line;
  }
}

function createNewLineNode() {
  return createExpressionNode(LINE_BREAK);
}