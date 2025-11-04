import type { Chrome } from '../../extension-api/ExtensionAPI.js';
import * as Host from '../core/host/host.js';
import type * as Extensions from '../models/extensions/extensions.js';
interface ExtensionContext {
    chrome: Partial<Chrome.DevTools.Chrome>;
    extensionDescriptor: Extensions.ExtensionAPI.ExtensionDescriptor;
}
export declare function getExtensionOrigin(): string;
export declare function describeWithDevtoolsExtension(title: string, extension: Partial<Host.InspectorFrontendHostAPI.ExtensionDescriptor>, fn: (this: Mocha.Suite, context: ExtensionContext) => void): Mocha.Suite;
export declare namespace describeWithDevtoolsExtension {
    var only: (title: string, extension: Partial<Host.InspectorFrontendHostAPI.ExtensionDescriptor>, fn: (this: Mocha.Suite, context: ExtensionContext) => void) => Mocha.Suite;
}
export {};
