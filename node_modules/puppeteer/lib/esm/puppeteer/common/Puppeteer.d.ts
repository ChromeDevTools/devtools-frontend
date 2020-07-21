import { LaunchOptions, ChromeArgOptions, BrowserOptions } from '../node/LaunchOptions.js';
import { ProductLauncher } from '../node/Launcher.js';
import { BrowserFetcher, BrowserFetcherOptions } from '../node/BrowserFetcher.js';
import { PuppeteerErrors } from './Errors.js';
import { ConnectionTransport } from './ConnectionTransport.js';
import { DevicesMap } from './DeviceDescriptors.js';
import { Browser } from './Browser.js';
import { QueryHandler } from './QueryHandler.js';
/**
 * The main Puppeteer class. Provides the {@link Puppeteer.launch | launch}
 * method to launch a browser.
 *
 * When you `require` or `import` the Puppeteer npm package you get back an
 * instance of this class.
 *
 * @remarks
 *
 * @example
 * The following is a typical example of using Puppeteer to drive automation:
 * ```js
 * const puppeteer = require('puppeteer');
 *
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   await page.goto('https://www.google.com');
 *   // other actions...
 *   await browser.close();
 * })();
 * ```
 *
 * Once you have created a `page` you have access to a large API to interact
 * with the page, navigate, or find certain elements in that page.
 * The {@link Page | `page` documentation} lists all the available methods.
 *
 * @public
 */
export declare class Puppeteer {
    private _projectRoot;
    private _isPuppeteerCore;
    private _changedProduct;
    private __productName;
    private _lazyLauncher;
    /**
     * @internal
     */
    _preferredRevision: string;
    /**
     * @internal
     */
    constructor(projectRoot: string, preferredRevision: string, isPuppeteerCore: boolean, productName: string);
    /**
     * Launches puppeteer and launches a browser instance with given arguments
     * and options when specified.
     *
     * @remarks
     *
     * @example
     * You can use `ignoreDefaultArgs` to filter out `--mute-audio` from default arguments:
     * ```js
     * const browser = await puppeteer.launch({
     *   ignoreDefaultArgs: ['--mute-audio']
     * });
     * ```
     *
     * **NOTE** Puppeteer can also be used to control the Chrome browser,
     * but it works best with the version of Chromium it is bundled with.
     * There is no guarantee it will work with any other version.
     * Use `executablePath` option with extreme caution.
     * If Google Chrome (rather than Chromium) is preferred, a {@link https://www.google.com/chrome/browser/canary.html | Chrome Canary} or {@link https://www.chromium.org/getting-involved/dev-channel | Dev Channel} build is suggested.
     * In `puppeteer.launch([options])`, any mention of Chromium also applies to Chrome.
     * See {@link https://www.howtogeek.com/202825/what%E2%80%99s-the-difference-between-chromium-and-chrome/ | this article} for a description of the differences between Chromium and Chrome. {@link https://chromium.googlesource.com/chromium/src/+/lkgr/docs/chromium_browser_vs_google_chrome.md | This article} describes some differences for Linux users.
     *
     * @param options - Set of configurable options to set on the browser.
     * @returns Promise which resolves to browser instance.
     */
    launch(options?: LaunchOptions & ChromeArgOptions & BrowserOptions & {
        product?: string;
        extraPrefsFirefox?: {};
    }): Promise<Browser>;
    /**
     * This method attaches Puppeteer to an existing browser instance.
     *
     * @remarks
     *
     * @param options - Set of configurable options to set on the browser.
     * @returns Promise which resolves to browser instance.
     */
    connect(options: BrowserOptions & {
        browserWSEndpoint?: string;
        browserURL?: string;
        transport?: ConnectionTransport;
        product?: string;
    }): Promise<Browser>;
    /**
     * @internal
     */
    get _productName(): string;
    set _productName(name: string);
    /**
     * @remarks
     *
     * **NOTE** `puppeteer.executablePath()` is affected by the `PUPPETEER_EXECUTABLE_PATH`
     * and `PUPPETEER_CHROMIUM_REVISION` environment variables.
     *
     * @returns A path where Puppeteer expects to find the bundled browser.
     * The browser binary might not be there if the download was skipped with
     * the `PUPPETEER_SKIP_DOWNLOAD` environment variable.
     */
    executablePath(): string;
    /**
     * @internal
     */
    get _launcher(): ProductLauncher;
    /**
     * The name of the browser that is under automation (`"chrome"` or `"firefox"`)
     *
     * @remarks
     * The product is set by the `PUPPETEER_PRODUCT` environment variable or the `product`
     * option in `puppeteer.launch([options])` and defaults to `chrome`.
     * Firefox support is experimental.
     */
    get product(): string;
    /**
     * @remarks
     * A list of devices to be used with `page.emulate(options)`. Actual list of devices can be found in {@link https://github.com/puppeteer/puppeteer/blob/main/src/common/DeviceDescriptors.ts | src/common/DeviceDescriptors.ts}.
     *
     * @example
     *
     * ```js
     * const puppeteer = require('puppeteer');
     * const iPhone = puppeteer.devices['iPhone 6'];
     *
     * (async () => {
     *   const browser = await puppeteer.launch();
     *   const page = await browser.newPage();
     *   await page.emulate(iPhone);
     *   await page.goto('https://www.google.com');
     *   // other actions...
     *   await browser.close();
     * })();
     * ```
     *
     */
    get devices(): DevicesMap;
    /**
     * @remarks
     *
     * Puppeteer methods might throw errors if they are unable to fulfill a request.
     * For example, `page.waitForSelector(selector[, options])` might fail if
     * the selector doesn't match any nodes during the given timeframe.
     *
     * For certain types of errors Puppeteer uses specific error classes.
     * These classes are available via `puppeteer.errors`.
     *
     * @example
     * An example of handling a timeout error:
     * ```js
     * try {
     *   await page.waitForSelector('.foo');
     * } catch (e) {
     *   if (e instanceof puppeteer.errors.TimeoutError) {
     *     // Do something if this is a timeout.
     *   }
     * }
     * ```
     */
    get errors(): PuppeteerErrors;
    /**
     *
     * @param options - Set of configurable options to set on the browser.
     * @returns The default flags that Chromium will be launched with.
     */
    defaultArgs(options?: ChromeArgOptions): string[];
    /**
     * @param options - Set of configurable options to specify the settings
     * of the BrowserFetcher.
     * @returns A new BrowserFetcher instance.
     */
    createBrowserFetcher(options: BrowserFetcherOptions): BrowserFetcher;
    /**
     * @internal
     */
    __experimental_registerCustomQueryHandler(name: string, queryHandler: QueryHandler): void;
    /**
     * @internal
     */
    __experimental_unregisterCustomQueryHandler(name: string): void;
    /**
     * @internal
     */
    __experimental_customQueryHandlers(): Map<string, QueryHandler>;
    /**
     * @internal
     */
    __experimental_clearQueryHandlers(): void;
}
//# sourceMappingURL=Puppeteer.d.ts.map