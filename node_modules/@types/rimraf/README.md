# Installation
> `npm install --save @types/rimraf`

# Summary
This package contains type definitions for rimraf (https://github.com/isaacs/rimraf).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/rimraf.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/rimraf/index.d.ts)
````ts
// Type definitions for rimraf 3.0
// Project: https://github.com/isaacs/rimraf
// Definitions by: Carlos Ballesteros Velasco <https://github.com/soywiz>
//                 e-cloud <https://github.com/e-cloud>
//                 Ruben Schmidmeister <https://github.com/bash>
//                 Oganexon <https://github.com/oganexon>
//                 Piotr Błażejewicz <https://github.com/peterblazejewicz>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />

import glob = require('glob');
import fs = require('fs');

declare function rimraf(path: string, options: rimraf.Options, callback: (error: Error | null | undefined) => void): void;
declare function rimraf(path: string, callback: (error: Error | null | undefined) => void): void;
declare namespace rimraf {
    /**
     * It can remove stuff synchronously, too.
     * But that's not so good. Use the async API.
     * It's better.
     */
    function sync(path: string, options?: Options): void;

    /**
     * see {@link https://github.com/isaacs/rimraf/blob/79b933fb362b2c51bedfa448be848e1d7ed32d7e/README.md#options}
     */
    interface Options {
        maxBusyTries?: number | undefined;
        emfileWait?: number | undefined;
        /** @default false */
        disableGlob?: boolean | undefined;
        glob?: glob.IOptions | false | undefined;

        unlink?: typeof fs.unlink | undefined;
        chmod?: typeof fs.chmod | undefined;
        stat?: typeof fs.stat | undefined;
        lstat?: typeof fs.lstat | undefined;
        rmdir?: typeof fs.rmdir | undefined;
        readdir?: typeof fs.readdir | undefined;
        unlinkSync?: typeof fs.unlinkSync | undefined;
        chmodSync?: typeof fs.chmodSync | undefined;
        statSync?: typeof fs.statSync | undefined;
        lstatSync?: typeof fs.lstatSync | undefined;
        rmdirSync?: typeof fs.rmdirSync | undefined;
        readdirSync?: typeof fs.readdirSync | undefined;
    }
}
export = rimraf;

````

### Additional Details
 * Last updated: Wed, 18 Aug 2021 21:01:23 GMT
 * Dependencies: [@types/glob](https://npmjs.com/package/@types/glob), [@types/node](https://npmjs.com/package/@types/node)
 * Global values: none

# Credits
These definitions were written by [Carlos Ballesteros Velasco](https://github.com/soywiz), [e-cloud](https://github.com/e-cloud), [Ruben Schmidmeister](https://github.com/bash), [Oganexon](https://github.com/oganexon), and [Piotr Błażejewicz](https://github.com/peterblazejewicz).
