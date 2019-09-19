import { EmitOutput } from "../compiler/emit-output";
import { File } from "../shared/file";
import { BundleCallback } from "./bundle-callback";
import { BundleItem } from "./bundle-item";
export interface Queued {
    callback: BundleCallback;
    emitOutput: EmitOutput;
    file: File;
    item?: BundleItem;
}
