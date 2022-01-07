# Installation
> `npm install --save @types/component-emitter`

# Summary
This package contains type definitions for component-emitter (https://www.npmjs.com/package/component-emitter).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/component-emitter.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/component-emitter/index.d.ts)
````ts
// Type definitions for component-emitter v1.2.1
// Project: https://www.npmjs.com/package/component-emitter
// Definitions by: Peter Snider <https://github.com/psnider>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

// TypeScript Version: 2.2

interface Emitter<Event = string> {
    on(event: Event, listener: Function): Emitter;
    once(event: Event, listener: Function): Emitter;
    off(event?: Event, listener?: Function): Emitter;
    emit(event: Event, ...args: any[]): Emitter;
    listeners(event: Event): Function[];
    hasListeners(event: Event): boolean;
    removeListener(event?: Event, listener?: Function): Emitter;
    removeEventListener(event?: Event, listener?: Function): Emitter;
    removeAllListeners(event?: Event): Emitter;
}

declare const Emitter: {
    (obj?: object): Emitter;
    new (obj?: object): Emitter;
};

export = Emitter;

````

### Additional Details
 * Last updated: Thu, 14 Oct 2021 19:01:31 GMT
 * Dependencies: none
 * Global values: none

# Credits
These definitions were written by [Peter Snider](https://github.com/psnider).
