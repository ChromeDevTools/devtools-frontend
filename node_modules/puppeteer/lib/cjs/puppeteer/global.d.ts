/**
 * These global declarations exist so puppeteer can work without the need to use `"dom"`
 * types.
 *
 * To get full type information for these interfaces, add `"types": "dom"`in your
 * `tsconfig.json` file.
 */
declare global {
    interface Document {
    }
    interface Element {
    }
    interface NodeListOf<TNode> {
    }
}
export {};
//# sourceMappingURL=global.d.ts.map