import * as Common from '../../core/common/common.js';
import type { RecorderExtensionEndpoint } from './RecorderExtensionEndpoint.js';
export interface ViewDescriptor {
    id: string;
    title: string;
    pagePath: string;
    onShown: () => void;
    onHidden: () => void;
}
export declare class RecorderPluginManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    static instance(): RecorderPluginManager;
    addPlugin(plugin: RecorderExtensionEndpoint): void;
    removePlugin(plugin: RecorderExtensionEndpoint): void;
    plugins(): RecorderExtensionEndpoint[];
    registerView(descriptor: ViewDescriptor): void;
    views(): ViewDescriptor[];
    getViewDescriptor(id: string): ViewDescriptor | undefined;
    showView(id: string): void;
}
export declare const enum Events {
    PLUGIN_ADDED = "pluginAdded",
    PLUGIN_REMOVED = "pluginRemoved",
    VIEW_REGISTERED = "viewRegistered",
    SHOW_VIEW_REQUESTED = "showViewRequested"
}
export interface EventTypes {
    [Events.PLUGIN_ADDED]: RecorderExtensionEndpoint;
    [Events.PLUGIN_REMOVED]: RecorderExtensionEndpoint;
    [Events.VIEW_REGISTERED]: ViewDescriptor;
    [Events.SHOW_VIEW_REQUESTED]: ViewDescriptor;
}
