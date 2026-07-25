import * as Root from '../../core/root/root.js';
import type * as Foundation from '../../foundation/foundation.js';
import type { App } from './App.js';
export interface AppProvider {
    createApp(universe: Foundation.Universe.Universe): App;
}
export declare function registerAppProvider(registration: AppProviderRegistration): void;
export declare function getRegisteredAppProviders(): AppProviderRegistration[];
export interface AppProviderRegistration {
    loadAppProvider: () => Promise<AppProvider>;
    condition?: Root.Runtime.Condition;
    order: number;
}
