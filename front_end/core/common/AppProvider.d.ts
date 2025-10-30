import * as Root from '../root/root.js';
import type { App } from './App.js';
export interface AppProvider {
    createApp(): App;
}
export declare function registerAppProvider(registration: AppProviderRegistration): void;
export declare function getRegisteredAppProviders(): AppProviderRegistration[];
export interface AppProviderRegistration {
    loadAppProvider: () => Promise<AppProvider>;
    condition?: Root.Runtime.Condition;
    order: number;
}
