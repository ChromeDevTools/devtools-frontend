import type * as Foundation from '../../foundation/foundation.js';
import { VBox } from './Widget.js';
export declare class RootView extends VBox {
    #private;
    private window?;
    constructor(universe: Foundation.Universe.Universe);
    attachToDocument(document: Document): void;
    onDetach(): void;
    doResize(): void;
}
