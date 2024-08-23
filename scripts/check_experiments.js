// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const fs = require('fs');
const path = require('path');

const SRC_PATH = path.resolve(__dirname, '..');
const NODE_MODULES_PATH = path.resolve(SRC_PATH, 'node_modules');
const espree = require(path.resolve(NODE_MODULES_PATH, '@typescript-eslint', 'parser'));
const parseOptions = {
  ecmaVersion: 11,
  sourceType: 'module',
  range: true,
};

/**
 * Determines if a node is a class declaration.
 * If className is provided, node must also match class name.
 */
function isClassNameDeclaration(node, className) {
  const isClassDeclaration = node.type === 'ExportNamedDeclaration' && node.declaration.type === 'ClassDeclaration';
  if (className) {
    return isClassDeclaration && node.declaration.id.name === className;
  }
  return isClassDeclaration;
}

/**
 * Determines if a node is an typescript enum declaration.
 * If enumName is provided, node must also match enum name.
 */
function isEnumDeclaration(node, enumName) {
  const isEnumDeclaration = node.type === 'ExportNamedDeclaration' && node.declaration.type === 'TSEnumDeclaration';
  if (enumName) {
    return isEnumDeclaration && node.declaration.id.name === enumName;
  }
  return isEnumDeclaration;
}

/**
 * Finds a function declaration node inside a class declaration node
 */
function findFunctionInClass(classNode, functionName) {
  for (const node of classNode.declaration.body.body) {
    if (node.key.name === functionName) {
      return node;
    }
  }
  return null;
}

/**
 * Determines if AST Node is a call to register a DevtoolsExperiment
 */
function isExperimentRegistrationCall(node) {
  return node.expression && node.expression.type === 'CallExpression' &&
      node.expression.callee.property.name === 'register';
}

/**
 * Extract the enum Root.Runtime.ExperimentName to a map
 */
function getExperimentNameEnum(mainImplFile) {
  const mainAST = espree.parse(mainImplFile, parseOptions);

  let experimentNameEnum;
  for (const node of mainAST.body) {
    if (isEnumDeclaration(node, 'ExperimentName')) {
      experimentNameEnum = node;
      break;
    }
  }

  const map = new Map();
  if (!experimentNameEnum) {
    return map;
  }
  for (const member of experimentNameEnum.declaration.members) {
    map.set(member.id.name, member.initializer.value);
  }
  return map;
}

/**
 * Determine if node is of the form Root.Runtime.ExperimentName.NAME, and if so
 * return NAME as string.
 */
function isExperimentNameReference(node) {
  if (node.type !== 'MemberExpression') {
    return false;
  }
  if (node.object.type !== 'MemberExpression' || node.object.property?.name !== 'ExperimentName') {
    return false;
  }
  if (node.object.object.type !== 'MemberExpression' || node.object.object.property?.name !== 'Runtime') {
    return false;
  }
  if (node.object.object.object.type !== 'Identifier' || node.object.object.object.name !== 'Root') {
    return false;
  }
  return node.property.name;
}

/**
 * Gets list of experiments registered in MainImpl.js.
 */
function getMainImplExperimentList(mainImplFile, experimentNames) {
  const mainAST = espree.parse(mainImplFile, parseOptions);

  // Find MainImpl Class node
  let mainImplClassNode;
  for (const node of mainAST.body) {
    if (isClassNameDeclaration(node, 'MainImpl')) {
      mainImplClassNode = node;
      break;
    }
  }
  if (!mainImplClassNode) {
    return null;
  }

  // Find function in MainImpl Class
  const initializeExperimentNode = findFunctionInClass(mainImplClassNode, 'initializeExperiments');
  if (!initializeExperimentNode) {
    return null;
  }

  // Get list of experiments
  const experiments = [];
  for (const statement of initializeExperimentNode.value.body.body) {
    if (isExperimentRegistrationCall(statement)) {
      // Experiment name is first argument of registration call
      const experimentNameArg = statement.expression.arguments[0];
      // The experiment name can either be a literal, e.g. 'fooExperiment'..
      if (experimentNameArg.type === 'Literal') {
        experiments.push(experimentNameArg.value);
      } else {
        // .. or a member of Root.Runtime.ExperimentName.
        const experimentName = isExperimentNameReference(experimentNameArg);
        if (experimentName) {
          const translatedName = experimentNames.get(experimentName);
          if (!translatedName) {
            console.log('Failed to resolve Root.Runtime.ExperimentName.${experimentName} to a string');
            process.exit(1);
          }
          experiments.push(translatedName);
        } else {
          console.log('Unexpected argument to Root.Runtime.experiments.register: ', experimentNameArg);
          process.exit(1);
        }
      }
    }
  }
  return experiments.length ? experiments : null;
}

/**
 * Determines if AST Node is the DevtoolsExperiments Enum declaration
 */
function isExperimentEnumDeclaration(node) {
  return node.type === 'ExportNamedDeclaration' && node?.declaration?.id?.name === 'DevtoolsExperiments';
}

/**
 * Gets list of experiments registered in UserMetrics.ts
 */
function getUserMetricExperimentList(userMetricsFile) {
  const userMetricsAST = espree.parse(userMetricsFile, {ecmaVersion: 11, sourceType: 'module', range: true});
  for (const node of userMetricsAST.body) {
    if (isExperimentEnumDeclaration(node)) {
      return node.declaration.members.filter(member => member.id.type === 'Literal').map(member => member.id.value);
    }
  }
  return null;
}

/**
 * Compares list of experiments, fires error if an experiment is registered without telemetry entry.
 */
function compareExperimentLists(mainImplList, userMetricsList) {
  // Ensure both lists are valid
  let errorFound = false;
  if (!mainImplList) {
    console.log(
        'Changes to Devtools Experiment registration have prevented this check from finding registered experiments.');
    console.log('Please update scripts/check_experiments.js to account for the new experiment registration.');
    errorFound = true;
  }
  if (!userMetricsList) {
    console.log(
        'Changes to Devtools Experiment UserMetrics enum have prevented this check from finding experiments registered for telemetry.');
    console.log('Please update scripts/check_experiments.js to account for the new experiment telemetry format.');
    errorFound = true;
  }
  if (errorFound) {
    process.exit(1);
  }

  // Ensure both lists match
  const missingTelemetry = mainImplList.filter(experiment => !userMetricsList.includes(experiment));
  const staleTelemetry = userMetricsList.filter(experiment => !mainImplList.includes(experiment));
  if (missingTelemetry.length) {
    console.log('Devtools Experiments have been added without corresponding histogram update!');
    console.log(missingTelemetry.join('\n'));
    console.log(
        'Please ensure that the DevtoolsExperiments enum in UserMetrics.ts is updated with the new experiment.');
    console.log(
        'Please ensure that a corresponding CL is opened against chromium.src/tools/metrics/histograms/metadata/dev/enums.xml to update the DevtoolsExperiments enum');
    errorFound = true;
  }
  if (staleTelemetry.length) {
    console.log('Devtools Experiments that are no longer registered are still listed in the telemetry enum!');
    console.log(staleTelemetry.join('\n'));
    console.log(
        'Please ensure that the DevtoolsExperiments enum in UserMetrics.ts is updated to remove these stale experiments.');
    errorFound = true;
  }
  if (errorFound) {
    process.exit(1);
  }
  console.log('DevTools Experiment Telemetry checker passed.');
}

function main() {
  const mainImplPath = path.resolve(__dirname, '..', 'front_end', 'entrypoints', 'main', 'MainImpl.ts');
  const mainImplFile = fs.readFileSync(mainImplPath, 'utf-8');

  const userMetricsPath = path.resolve(__dirname, '..', 'front_end', 'core', 'host', 'UserMetrics.ts');
  const userMetricsFile = fs.readFileSync(userMetricsPath, 'utf-8');

  const runtimePath = path.resolve(__dirname, '..', 'front_end', 'core', 'root', 'Runtime.ts');
  const runtimeFile = fs.readFileSync(runtimePath, 'utf-8');
  const experimentNames = getExperimentNameEnum(runtimeFile);

  compareExperimentLists(
      getMainImplExperimentList(mainImplFile, experimentNames), getUserMetricExperimentList(userMetricsFile));
}

main();
