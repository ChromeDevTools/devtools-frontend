import '../third_party/chromium/ahem/ahem.js';
declare global {
    namespace Mocha {
        interface Suite {
            hasOnly?: () => boolean;
        }
        interface Test {
            hasExclusiveTests?: boolean;
        }
    }
}
