import type { Chrome } from '../../extension-api/ExtensionAPI.js';
import * as Host from '../core/host/host.js';
import type * as Extensions from '../models/extensions/extensions.js';
import { MockDebuggerBackend } from './MockScopeChain.js';
export interface ExtensionContext {
    chrome: Partial<Chrome.DevTools.Chrome>;
    extensionDescriptor: Extensions.ExtensionAPI.ExtensionDescriptor;
    backend?: Partial<MockDebuggerBackend>;
}
export declare function getExtensionOrigin(): string;
export declare function setupDevtoolsExtensionHooks(extension?: Partial<Host.InspectorFrontendHostAPI.ExtensionDescriptor>): ExtensionContext;
