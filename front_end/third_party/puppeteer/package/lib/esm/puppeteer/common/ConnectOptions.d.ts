import type { IsPageTargetCallback, TargetFilterCallback } from '../api/Browser.js';
import type { ConnectionTransport } from './ConnectionTransport.js';
import type { Viewport } from './Viewport.js';
/**
 * Generic browser options that can be passed when launching any browser or when
 * connecting to an existing browser instance.
 * @public
 */
export interface BrowserConnectOptions {
    /**
     * Whether to ignore HTTPS errors during navigation.
     * @defaultValue `false`
     */
    ignoreHTTPSErrors?: boolean;
    /**
     * Sets the viewport for each page.
     */
    defaultViewport?: Viewport | null;
    /**
     * Slows down Puppeteer operations by the specified amount of milliseconds to
     * aid debugging.
     */
    slowMo?: number;
    /**
     * Callback to decide if Puppeteer should connect to a given target or not.
     */
    targetFilter?: TargetFilterCallback;
    /**
     * @internal
     */
    _isPageTarget?: IsPageTargetCallback;
    /**
     * @defaultValue 'cdp'
     * @internal
     */
    protocol?: 'cdp' | 'webDriverBiDi';
    /**
     * Timeout setting for individual protocol (CDP) calls.
     *
     * @defaultValue `180_000`
     */
    protocolTimeout?: number;
}
/**
 * @public
 */
export interface ConnectOptions extends BrowserConnectOptions {
    browserWSEndpoint?: string;
    browserURL?: string;
    transport?: ConnectionTransport;
    /**
     * Headers to use for the web socket connection.
     * @remarks
     * Only works in the Node.js environment.
     */
    headers?: Record<string, string>;
}
//# sourceMappingURL=ConnectOptions.d.ts.map