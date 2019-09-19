"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Benchmark = /** @class */ (function () {
    function Benchmark() {
        this.start = process.hrtime();
    }
    Benchmark.prototype.elapsed = function () {
        var end = process.hrtime(this.start);
        return Math.round((end[0] * 1000) + (end[1] / 1000000));
    };
    return Benchmark;
}());
exports.Benchmark = Benchmark;
//# sourceMappingURL=benchmark.js.map