"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsStore = void 0;
const KEY = 'stealthOptimizer.metrics.v1';
class MetricsStore {
    constructor(storage) {
        this.storage = storage;
    }
    async add(row) {
        const rows = await this.getAll();
        rows.push(row);
        const trimmed = rows.slice(-10000);
        await this.storage.update(KEY, trimmed);
    }
    async getAll() {
        return (this.storage.get(KEY) ?? []);
    }
    async getLast() {
        const rows = await this.getAll();
        return rows.length ? rows[rows.length - 1] : undefined;
    }
    async getSummary(days) {
        const rows = await this.getAll();
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        let tb = 0, ta = 0, cs = 0, c = 0;
        for (const r of rows) {
            const t = Date.parse(r.ts);
            if (!isNaN(t) && t >= cutoff) {
                tb += r.tokensBefore;
                ta += r.tokensAfter;
                cs += r.estCostSavedUSD;
                c += 1;
            }
        }
        return { tokensBefore: tb, tokensAfter: ta, estCostSavedUSD: cs, count: c };
    }
}
exports.MetricsStore = MetricsStore;
//# sourceMappingURL=metricsStore.js.map