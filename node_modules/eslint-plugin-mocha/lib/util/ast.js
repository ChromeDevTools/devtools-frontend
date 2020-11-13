'use strict';

const complement = require('ramda/src/complement');
const both = require('ramda/src/both');
const isNil = require('ramda/src/isNil');
const propEq = require('ramda/src/propEq');
const pathEq = require('ramda/src/pathEq');
const find = require('ramda/src/find');
const { getTestCaseNames, getSuiteNames } = require('./names');
const { getAddtionalNames } = require('./settings');

const isDefined = complement(isNil);
const isCallExpression = both(isDefined, propEq('type', 'CallExpression'));

const hooks = [
    'before', 'after', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll',
    'setup', 'teardown', 'suiteSetup', 'suiteTeardown'
];
const suiteConfig = [ 'timeout', 'slow', 'retries' ];

const findReturnStatement = find(propEq('type', 'ReturnStatement'));

function getPropertyName(property) {
    return property.name || property.value;
}

function getNodeName(node) {
    if (node.type === 'MemberExpression') {
        return `${getNodeName(node.object) }.${ getPropertyName(node.property)}`;
    }
    return node.name;
}

function isHookIdentifier(node) {
    return node &&
      node.type === 'Identifier' &&
      hooks.includes(node.name);
}

function isHookCall(node) {
    return isCallExpression(node) && isHookIdentifier(node.callee);
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

function isFunctionCallWithName(node, names) {
    return isCallExpression(node) && names.includes(getNodeName(node.callee));
}

function createAstUtils(settings) {
    const additionalCustomNames = getAddtionalNames(settings);

    function isDescribe(node, options = {}) {
        const { modifiers = [ 'skip', 'only' ], modifiersOnly = false } = options;
        const describeAliases = getSuiteNames({ modifiersOnly, modifiers, additionalCustomNames });

        return isFunctionCallWithName(node, describeAliases);
    }

    function isTestCase(node, options = {}) {
        const { modifiers = [ 'skip', 'only' ], modifiersOnly = false } = options;
        const testCaseNames = getTestCaseNames({ modifiersOnly, modifiers, additionalCustomNames });

        return isFunctionCallWithName(node, testCaseNames);
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

    function isMochaFunctionCall(node, scope) {
        if (isCallToShadowedReference(node, scope)) {
            return false;
        }

        return isTestCase(node) || isDescribe(node) || isHookCall(node);
    }

    function hasParentMochaFunctionCall(functionExpression, options) {
        return isTestCase(functionExpression.parent, options) || isHookCall(functionExpression.parent);
    }

    function isExplicitUndefined(node) {
        return node && node.type === 'Identifier' && node.name === 'undefined';
    }

    function isReturnOfUndefined(node) {
        const argument = node.argument;
        const isImplicitUndefined = argument === null;

        return isImplicitUndefined || isExplicitUndefined(argument);
    }

    return {
        isDescribe,
        isHookIdentifier,
        isTestCase,
        getPropertyName,
        getNodeName,
        isMochaFunctionCall,
        isHookCall,
        isSuiteConfigCall,
        hasParentMochaFunctionCall,
        findReturnStatement,
        isReturnOfUndefined
    };
}

module.exports = createAstUtils;
