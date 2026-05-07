import * as UI from '../../ui/legacy/legacy.js';
export declare class SimpleApp implements UI.App.App {
    presentUI(document: Document): void;
}
export declare class SimpleAppProvider implements UI.AppProvider.AppProvider {
    static instance(opts?: {
        forceNew: boolean | null;
    }): SimpleAppProvider;
    createApp(): UI.App.App;
}
