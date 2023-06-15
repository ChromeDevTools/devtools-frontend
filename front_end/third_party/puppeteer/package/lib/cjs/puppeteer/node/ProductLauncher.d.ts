import { launch } from '@puppeteer/browsers';
import { Browser, BrowserCloseCallback } from '../api/Browser.js';
import { Connection } from '../common/Connection.js';
import { Product } from '../common/Product.js';
import { Viewport } from '../common/PuppeteerViewport.js';
import { BrowserLaunchArgumentOptions, ChromeReleaseChannel, PuppeteerNodeLaunchOptions } from './LaunchOptions.js';
import { PuppeteerNode } from './PuppeteerNode.js';
/**
 * @internal
 */
export type ResolvedLaunchArgs = {
    isTempUserDataDir: boolean;
    userDataDir: string;
    executablePath: string;
    args: string[];
};
/**
 * Describes a launcher - a class that is able to create and launch a browser instance.
 *
 * @public
 */
export declare class ProductLauncher {
    #private;
    /**
     * @internal
     */
    puppeteer: PuppeteerNode;
    /**
     * @internal
     */
    protected actualBrowserRevision?: string;
    /**
     * @internal
     */
    constructor(puppeteer: PuppeteerNode, product: Product);
    get product(): Product;
    launch(options?: PuppeteerNodeLaunchOptions): Promise<Browser>;
    executablePath(channel?: ChromeReleaseChannel): string;
    defaultArgs(object: BrowserLaunchArgumentOptions): string[];
    /**
     * Set only for Firefox, after the launcher resolves the `latest` revision to
     * the actual revision.
     * @internal
     */
    getActualBrowserRevision(): string | undefined;
    /**
     * @internal
     */
    protected computeLaunchArguments(options: PuppeteerNodeLaunchOptions): Promise<ResolvedLaunchArgs>;
    /**
     * @internal
     */
    protected cleanUserDataDir(path: string, opts: {
        isTemp: boolean;
    }): Promise<void>;
    /**
     * @internal
     */
    protected closeBrowser(browserProcess: ReturnType<typeof launch>, connection?: Connection): Promise<void>;
    /**
     * @internal
     */
    protected waitForPageTarget(browser: Browser, timeout: number): Promise<void>;
    /**
     * @internal
     */
    protected createCDPSocketConnection(browserProcess: ReturnType<typeof launch>, opts: {
        timeout: number;
        protocolTimeout: number | undefined;
        slowMo: number;
    }): Promise<Connection>;
    /**
     * @internal
     */
    protected createCDPPipeConnection(browserProcess: ReturnType<typeof launch>, opts: {
        timeout: number;
        protocolTimeout: number | undefined;
        slowMo: number;
    }): Promise<Connection>;
    /**
     * @internal
     */
    protected createBiDiOverCDPBrowser(browserProcess: ReturnType<typeof launch>, connection: Connection, closeCallback: BrowserCloseCallback, opts: {
        timeout: number;
        protocolTimeout: number | undefined;
        slowMo: number;
        defaultViewport: Viewport | null;
        ignoreHTTPSErrors?: boolean;
    }): Promise<Browser>;
    /**
     * @internal
     */
    protected createBiDiBrowser(browserProcess: ReturnType<typeof launch>, closeCallback: BrowserCloseCallback, opts: {
        timeout: number;
        protocolTimeout: number | undefined;
        slowMo: number;
        defaultViewport: Viewport | null;
        ignoreHTTPSErrors?: boolean;
    }): Promise<Browser>;
    /**
     * @internal
     */
    protected getProfilePath(): string;
    /**
     * @internal
     */
    protected resolveExecutablePath(): string;
}
//# sourceMappingURL=ProductLauncher.d.ts.map