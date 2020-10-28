/**
 * Describes a launcher - a class that is able to create and launch a browser instance.
 * @public
 */
export interface ProductLauncher {
    launch(object: any): any;
    connect(object: any): any;
    executablePath: () => string;
    defaultArgs(object: any): any;
    product: string;
}
/**
 * @internal
 */
export default function Launcher(projectRoot: string, preferredRevision: string, isPuppeteerCore: boolean, product?: string): ProductLauncher;
//# sourceMappingURL=Launcher.d.ts.map