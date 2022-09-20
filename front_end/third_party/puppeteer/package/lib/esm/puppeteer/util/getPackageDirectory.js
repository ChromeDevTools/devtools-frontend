import { existsSync } from 'fs';
import { dirname, join, parse } from 'path';
/**
 * @internal
 */
export const getPackageDirectory = (from) => {
    let found = existsSync(join(from, 'package.json'));
    const root = parse(from).root;
    while (!found) {
        if (from === root) {
            throw new Error('Cannot find package directory');
        }
        from = dirname(from);
        found = existsSync(join(from, 'package.json'));
    }
    return from;
};
//# sourceMappingURL=getPackageDirectory.js.map