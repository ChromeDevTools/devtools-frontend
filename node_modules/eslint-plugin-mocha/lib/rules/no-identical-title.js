'use strict';

const astUtil = require('../util/ast');
const { additionalSuiteNames } = require('../util/settings');

function newLayer() {
    return {
        describeTitles: [],
        testTitles: []
    };
}

function handlTestCaseTitles(context, titles, node, title) {
    if (astUtil.isTestCase(node)) {
        if (titles.indexOf(title) !== -1) {
            context.report({
                node,
                message: 'Test title is used multiple times in the same test suite.'
            });
        }
        titles.push(title);
    }
}

function handlTestSuiteTitles(context, titles, node, title) {
    const settings = context.settings;

    if (!astUtil.isDescribe(node, additionalSuiteNames(settings))) {
        return;
    }
    if (titles.indexOf(title) !== -1) {
        context.report({
            node,
            message: 'Test suite title is used multiple times.'
        });
    }
    titles.push(title);
}

function isFirstArgLiteral(node) {
    return node.arguments && node.arguments[0] && node.arguments[0].type === 'Literal';
}

module.exports = function (context) {
    const titleLayers = [ newLayer() ];
    const settings = context.settings;

    return {
        CallExpression(node) {
            const currentLayer = titleLayers[titleLayers.length - 1];

            if (astUtil.isDescribe(node, additionalSuiteNames(settings))) {
                titleLayers.push(newLayer());
            }
            if (!isFirstArgLiteral(node)) {
                return;
            }

            const title = node.arguments[0].value;
            handlTestCaseTitles(context, currentLayer.testTitles, node, title);
            handlTestSuiteTitles(context, currentLayer.describeTitles, node, title);
        },
        'CallExpression:exit'(node) {
            if (astUtil.isDescribe(node, additionalSuiteNames(settings))) {
                titleLayers.pop();
            }
        }
    };
};
