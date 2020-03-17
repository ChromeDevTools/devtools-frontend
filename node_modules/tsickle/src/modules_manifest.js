/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("tsickle/src/modules_manifest", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /** A class that maintains the module dependency graph of output JS files. */
    class ModulesManifest {
        constructor() {
            /** Map of googmodule module name to file name */
            this.moduleToFileName = {};
            /** Map of file name to arrays of imported googmodule module names */
            this.referencedModules = {};
        }
        addManifest(other) {
            Object.assign(this.moduleToFileName, other.moduleToFileName);
            Object.assign(this.referencedModules, other.referencedModules);
        }
        addModule(fileName, module) {
            this.moduleToFileName[module] = fileName;
            this.referencedModules[fileName] = [];
        }
        addReferencedModule(fileName, resolvedModule) {
            this.referencedModules[fileName].push(resolvedModule);
        }
        get modules() {
            return Object.keys(this.moduleToFileName);
        }
        getFileNameFromModule(module) {
            return this.moduleToFileName[module];
        }
        get fileNames() {
            return Object.keys(this.referencedModules);
        }
        getReferencedModules(fileName) {
            return this.referencedModules[fileName];
        }
    }
    exports.ModulesManifest = ModulesManifest;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlc19tYW5pZmVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzX21hbmlmZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBTUgsNkVBQTZFO0lBQzdFLE1BQWEsZUFBZTtRQUE1QjtZQUNFLGlEQUFpRDtZQUN6QyxxQkFBZ0IsR0FBb0IsRUFBRSxDQUFDO1lBQy9DLHFFQUFxRTtZQUM3RCxzQkFBaUIsR0FBc0IsRUFBRSxDQUFDO1FBK0JwRCxDQUFDO1FBN0JDLFdBQVcsQ0FBQyxLQUFzQjtZQUNoQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUM3RCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQsU0FBUyxDQUFDLFFBQWdCLEVBQUUsTUFBYztZQUN4QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDeEMsQ0FBQztRQUVELG1CQUFtQixDQUFDLFFBQWdCLEVBQUUsY0FBc0I7WUFDMUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsSUFBSSxPQUFPO1lBQ1QsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFFRCxxQkFBcUIsQ0FBQyxNQUFjO1lBQ2xDLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFFRCxJQUFJLFNBQVM7WUFDWCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVELG9CQUFvQixDQUFDLFFBQWdCO1lBQ25DLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFDLENBQUM7S0FDRjtJQW5DRCwwQ0FtQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZU1hcDxUPiB7XG4gIFtmaWxlTmFtZTogc3RyaW5nXTogVDtcbn1cblxuLyoqIEEgY2xhc3MgdGhhdCBtYWludGFpbnMgdGhlIG1vZHVsZSBkZXBlbmRlbmN5IGdyYXBoIG9mIG91dHB1dCBKUyBmaWxlcy4gKi9cbmV4cG9ydCBjbGFzcyBNb2R1bGVzTWFuaWZlc3Qge1xuICAvKiogTWFwIG9mIGdvb2dtb2R1bGUgbW9kdWxlIG5hbWUgdG8gZmlsZSBuYW1lICovXG4gIHByaXZhdGUgbW9kdWxlVG9GaWxlTmFtZTogRmlsZU1hcDxzdHJpbmc+ID0ge307XG4gIC8qKiBNYXAgb2YgZmlsZSBuYW1lIHRvIGFycmF5cyBvZiBpbXBvcnRlZCBnb29nbW9kdWxlIG1vZHVsZSBuYW1lcyAqL1xuICBwcml2YXRlIHJlZmVyZW5jZWRNb2R1bGVzOiBGaWxlTWFwPHN0cmluZ1tdPiA9IHt9O1xuXG4gIGFkZE1hbmlmZXN0KG90aGVyOiBNb2R1bGVzTWFuaWZlc3QpIHtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMubW9kdWxlVG9GaWxlTmFtZSwgb3RoZXIubW9kdWxlVG9GaWxlTmFtZSk7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLnJlZmVyZW5jZWRNb2R1bGVzLCBvdGhlci5yZWZlcmVuY2VkTW9kdWxlcyk7XG4gIH1cblxuICBhZGRNb2R1bGUoZmlsZU5hbWU6IHN0cmluZywgbW9kdWxlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLm1vZHVsZVRvRmlsZU5hbWVbbW9kdWxlXSA9IGZpbGVOYW1lO1xuICAgIHRoaXMucmVmZXJlbmNlZE1vZHVsZXNbZmlsZU5hbWVdID0gW107XG4gIH1cblxuICBhZGRSZWZlcmVuY2VkTW9kdWxlKGZpbGVOYW1lOiBzdHJpbmcsIHJlc29sdmVkTW9kdWxlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLnJlZmVyZW5jZWRNb2R1bGVzW2ZpbGVOYW1lXS5wdXNoKHJlc29sdmVkTW9kdWxlKTtcbiAgfVxuXG4gIGdldCBtb2R1bGVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5tb2R1bGVUb0ZpbGVOYW1lKTtcbiAgfVxuXG4gIGdldEZpbGVOYW1lRnJvbU1vZHVsZShtb2R1bGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMubW9kdWxlVG9GaWxlTmFtZVttb2R1bGVdO1xuICB9XG5cbiAgZ2V0IGZpbGVOYW1lcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMucmVmZXJlbmNlZE1vZHVsZXMpO1xuICB9XG5cbiAgZ2V0UmVmZXJlbmNlZE1vZHVsZXMoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gdGhpcy5yZWZlcmVuY2VkTW9kdWxlc1tmaWxlTmFtZV07XG4gIH1cbn1cbiJdfQ==