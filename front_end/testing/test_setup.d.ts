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
export {};
