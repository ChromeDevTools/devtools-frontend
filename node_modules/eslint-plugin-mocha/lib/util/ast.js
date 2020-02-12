'use strict';

const complement = require('ramda/src/complement');
const both = require('ramda/src/both');
const isNil = require('ramda/src/isNil');
const propEq = require('ramda/src/propEq');
const pathEq = require('ramda/src/pathEq');
const find = require('ramda/src/find');

const isDefined = complement(isNil);
const isCallExpression = both(isDefined, propEq('type', 'CallExpression'));

const describeAliases = [
    'describe', 'xdescribe', 'describe.only', 'describe.skip',
    'context', 'xcontext', 'context.only', 'context.skip',
    'suite', 'xsuite', 'suite.only', 'suite.skip'
];
const hooks = [
    'before', 'after', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll',
    'setup', 'teardown', 'suiteSetup', 'suiteTeardown'
];
const suiteConfig = [ 'timeout', 'slow', 'retries' ];
const testCaseNames = [
    'it', 'it.only', 'it.skip', 'xit',
    'test', 'test.only', 'test.skip',
    'specify', 'specify.only', 'specify.skip', 'xspecify'
];

function getPropertyName(property) {
    return property.name || property.value;
}

function getNodeName(node) {
    if (node.type === 'MemberExpression') {
        return `${getNodeName(node.object) }.${ getPropertyName(node.property)}`;
    }
    return node.name;
}

function isDescribe(node, additionalSuiteNames = []) {
    return isCallExpression(node) &&
      describeAliases.concat(additionalSuiteNames).indexOf(getNodeName(node.callee)) > -1;
}

function isHookIdentifier(node) {
    return node &&
      node.type === 'Identifier' &&
      hooks.indexOf(node.name) !== -1;
}

function isHookCall(node) {
    return isCallExpression(node) && isHookIdentifier(node.callee);
}

function isTestCase(node) {
    return isCallExpression(node) && testCaseNames.indexOf(getNodeName(node.callee)) > -1;
}

function isSuiteConfigExpression(node) {
    if (node.type !== 'MemberExpression') {
        return false;
    }

    const usingThis = node.object.type === 'ThisExpression';

    if (usingThis || isTestCase(node.object)) {
        return suiteConfig.includes(getPropertyName(node.property));
    }

    return false;
}

function isSuiteConfigCall(node) {
    return isCallExpression(node) && isSuiteConfigExpression(node.callee);
}

function findReference(scope, node) {
    const hasSameRangeAsNode = pathEq([ 'identifier', 'range' ], node.range);

    return find(hasSameRangeAsNode, scope.references);
}

function isShadowed(scope, identifier) {
    const reference = findReference(scope, identifier);

    return reference && reference.resolved && reference.resolved.defs.length > 0;
}

function isCallToShadowedReference(node, scope) {
    const identifier = node.callee.type === 'MemberExpression' ? node.callee.object : node.callee;

    return isShadowed(scope, identifier);
}

function isMochaFunctionCall(node, scope) {
    if (isCallToShadowedReference(node, scope)) {
        return false;
    }

    return isTestCase(node) || isDescribe(node) || isHookCall(node);
}

function isStringLiteral(node) {
    return node && node.type === 'Literal' && typeof node.value === 'string';
}

function hasParentMochaFunctionCall(functionExpression) {
    return isTestCase(functionExpression.parent) || isHookCall(functionExpression.parent);
}

function isExplicitUndefined(node) {
    return node && node.type === 'Identifier' && node.name === 'undefined';
}

function isReturnOfUndefined(node) {
    const argument = node.argument;
    const isImplicitUndefined = argument === null;

    return isImplicitUndefined || isExplicitUndefined(argument);
}

const findReturnStatement = find(propEq('type', 'ReturnStatement'));

module.exports = {
    isDescribe,
    isHookIdentifier,
    isTestCase,
    getPropertyName,
    getNodeName,
    isMochaFunctionCall,
    isHookCall,
    isSuiteConfigCall,
    isStringLiteral,
    hasParentMochaFunctionCall,
    findReturnStatement,
    isReturnOfUndefined
};
