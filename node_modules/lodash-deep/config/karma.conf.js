var _ = require('lodash');

module.exports = function(karmaConfig){
    var config = {

        // base path, that will be used to resolve files and exclude
        basePath: '../',


        // frameworks to use
        frameworks: ['jasmine'],


        // list of files / patterns to load in the browser
        files: [
            'bower_components/lodash/dist/lodash.min.js',
            'lodash-deep.min.js',
            'test/**/*.js'
        ],

        // test results reporter to use
        // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
        reporters: ['progress'],


        // web server port
        port: 9876,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: karmaConfig.LOG_WARN,


        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera (has to be installed with `npm install karma-opera-launcher`)
        // - Safari (only Mac; has to be installed with `npm install karma-safari-launcher`)
        // - PhantomJS
        // - IE (only Windows; has to be installed with `npm install karma-ie-launcher`)
        browsers: ['Chrome'],


        // If browser does not capture in given timeout [ms], kill it
        captureTimeout: 60000,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,


        // if true, it capture browsers, run tests and exit
        singleRun: true
    };

    if(process.env.TRAVIS){
        var customLaunchers = {
            'SL_Chrome': {
                base: 'SauceLabs',
                browserName: 'chrome',
                version: '34'
            },
            'SL_Firefox': {
                base: 'SauceLabs',
                browserName: 'firefox',
                version: '26'
            },
            'SL_Safari': {
                base: 'SauceLabs',
                browserName: 'safari',
                platform: 'OS X 10.9',
                version: '7'
            },
            'SL_IE_9': {
                base: 'SauceLabs',
                browserName: 'internet explorer',
                platform: 'Windows 7',
                version: '9'
            },
            'SL_IE_10': {
                base: 'SauceLabs',
                browserName: 'internet explorer',
                platform: 'Windows 7',
                version: '10'
            },
            'SL_IE_11': {
                base: 'SauceLabs',
                browserName: 'internet explorer',
                platform: 'Windows 8.1',
                version: '11'
            }
        };

        _.extend(config, {
            reporters: ['progress', 'saucelabs'],
            sauceLabs: {
                testName: 'lodash-deep',
                recordScreenshots: false
            },
            captureTimeout: 300000,
            customLaunchers: customLaunchers,
            browsers: Object.keys(customLaunchers)
        });
    }

    karmaConfig.set(config);
};
