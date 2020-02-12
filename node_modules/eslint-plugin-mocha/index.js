'use strict';

module.exports = {
    rules: {
        'no-exclusive-tests': require('./lib/rules/no-exclusive-tests'),
        'no-pending-tests': require('./lib/rules/no-pending-tests'),
        'no-skipped-tests': require('./lib/rules/no-skipped-tests'),
        'handle-done-callback': require('./lib/rules/handle-done-callback'),
        'no-synchronous-tests': require('./lib/rules/no-synchronous-tests'),
        'no-global-tests': require('./lib/rules/no-global-tests'),
        'no-return-and-callback': require('./lib/rules/no-return-and-callback'),
        'no-return-from-async': require('./lib/rules/no-return-from-async'),
        'valid-test-description': require('./lib/rules/valid-test-description'),
        'valid-suite-description': require('./lib/rules/valid-suite-description'),
        'no-mocha-arrows': require('./lib/rules/no-mocha-arrows'),
        'no-hooks': require('./lib/rules/no-hooks'),
        'no-hooks-for-single-case': require('./lib/rules/no-hooks-for-single-case'),
        'no-sibling-hooks': require('./lib/rules/no-sibling-hooks'),
        'no-top-level-hooks': require('./lib/rules/no-top-level-hooks'),
        'no-identical-title': require('./lib/rules/no-identical-title'),
        'max-top-level-suites': require('./lib/rules/max-top-level-suites'),
        'no-nested-tests': require('./lib/rules/no-nested-tests'),
        'no-setup-in-describe': require('./lib/rules/no-setup-in-describe'),
        'prefer-arrow-callback': require('./lib/rules/prefer-arrow-callback'),
        'no-async-describe': require('./lib/rules/no-async-describe')
    },
    configs: {
        recommended: {
            rules: {
                'mocha/handle-done-callback': 'error',
                'mocha/max-top-level-suites': [ 'error', { limit: 1 } ],
                'mocha/no-exclusive-tests': 'warn',
                'mocha/no-global-tests': 'error',
                'mocha/no-hooks': 'off',
                'mocha/no-hooks-for-single-case': 'warn',
                'mocha/no-identical-title': 'error',
                'mocha/no-mocha-arrows': 'error',
                'mocha/no-nested-tests': 'error',
                'mocha/no-pending-tests': 'warn',
                'mocha/no-return-and-callback': 'error',
                'mocha/no-setup-in-describe': 'error',
                'mocha/no-sibling-hooks': 'error',
                'mocha/no-skipped-tests': 'warn',
                'mocha/no-synchronous-tests': 'off',
                'mocha/no-top-level-hooks': 'warn',
                'mocha/prefer-arrow-callback': 'off',
                'mocha/valid-suite-description': 'off',
                'mocha/valid-test-description': 'off',
                'mocha/no-async-describe': 'error'
            }
        }
    }
};
