var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { HTTPResponse } from '../api/HTTPResponse.js';
import { UnsupportedOperation } from '../common/Errors.js';
import { SecurityDetails } from '../common/SecurityDetails.js';
import { invokeAtMostOnceForArguments } from '../util/decorators.js';
/**
 * @internal
 */
let BidiHTTPResponse = (() => {
    let _classSuper = HTTPResponse;
    let _instanceExtraInitializers = [];
    let _remoteAddress_decorators;
    return class BidiHTTPResponse extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _remoteAddress_decorators = [invokeAtMostOnceForArguments];
            __esDecorate(this, null, _remoteAddress_decorators, { kind: "method", name: "remoteAddress", static: false, private: false, access: { has: obj => "remoteAddress" in obj, get: obj => obj.remoteAddress }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static from(data, request, cdpSupported) {
            const response = new BidiHTTPResponse(data, request, cdpSupported);
            response.#initialize();
            return response;
        }
        #data = __runInitializers(this, _instanceExtraInitializers);
        #request;
        #securityDetails;
        #cdpSupported = false;
        constructor(data, request, cdpSupported) {
            super();
            this.#data = data;
            this.#request = request;
            this.#cdpSupported = cdpSupported;
            // @ts-expect-error non-standard property.
            const securityDetails = data['goog:securityDetails'];
            if (cdpSupported && securityDetails) {
                this.#securityDetails = new SecurityDetails(securityDetails);
            }
        }
        #initialize() {
            if (this.#data.fromCache) {
                this.#request
                    .frame()
                    ?.page()
                    .trustedEmitter.emit("requestservedfromcache" /* PageEvent.RequestServedFromCache */, this.#request);
            }
            this.#request.frame()?.page().trustedEmitter.emit("response" /* PageEvent.Response */, this);
        }
        remoteAddress() {
            return {
                ip: '',
                port: -1,
            };
        }
        url() {
            return this.#data.url;
        }
        status() {
            return this.#data.status;
        }
        statusText() {
            return this.#data.statusText;
        }
        headers() {
            const headers = {};
            for (const header of this.#data.headers) {
                // TODO: How to handle Binary Headers
                // https://w3c.github.io/webdriver-bidi/#type-network-Header
                if (header.value.type === 'string') {
                    headers[header.name.toLowerCase()] = header.value.value;
                }
            }
            return headers;
        }
        request() {
            return this.#request;
        }
        fromCache() {
            return this.#data.fromCache;
        }
        timing() {
            throw new UnsupportedOperation();
        }
        frame() {
            return this.#request.frame();
        }
        fromServiceWorker() {
            return false;
        }
        securityDetails() {
            if (!this.#cdpSupported) {
                throw new UnsupportedOperation();
            }
            return this.#securityDetails ?? null;
        }
        buffer() {
            throw new UnsupportedOperation();
        }
    };
})();
export { BidiHTTPResponse };
//# sourceMappingURL=HTTPResponse.js.map