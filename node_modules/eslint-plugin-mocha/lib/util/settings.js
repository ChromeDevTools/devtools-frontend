/* eslint-env node*/

'use strict';

function settingFor(propertyName) {
    return function (settings) {
        const value = settings[`mocha/${ propertyName}`];
        const mochaSettings = settings.mocha || {};

        return value || mochaSettings[propertyName] || [];
    };
}

module.exports = {
    getAdditionalTestFunctions: settingFor('additionalTestFunctions'),
    additionalSuiteNames: settingFor('additionalSuiteNames'),
    getAdditionalXFunctions: settingFor('additionalXFunctions')
};
