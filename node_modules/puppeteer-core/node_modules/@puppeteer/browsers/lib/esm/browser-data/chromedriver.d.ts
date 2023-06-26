import { BrowserPlatform, ChromeReleaseChannel } from './types.js';
export declare function resolveDownloadUrl(platform: BrowserPlatform, buildId: string, baseUrl?: string): string;
export declare function resolveDownloadPath(platform: BrowserPlatform, buildId: string): string[];
export declare function relativeExecutablePath(platform: BrowserPlatform, _buildId: string): string;
export declare function resolveBuildId(channel: ChromeReleaseChannel): Promise<string>;
//# sourceMappingURL=chromedriver.d.ts.map