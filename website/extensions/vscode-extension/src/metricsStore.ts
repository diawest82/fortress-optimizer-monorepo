import * as vscode from 'vscode';

export type MetricRow = {
  ts: string;
  provider: string;
  model: string;
  tokensBefore: number;
  tokensAfter: number;
  percentSaved: number;
  estCostSavedUSD: number;
  latencyMs: number;
  success: boolean;
};

const KEY = 'stealthOptimizer.metrics.v1';

export class MetricsStore {
  constructor(private storage: vscode.Memento) {}

  async add(row: MetricRow): Promise<void> {
    const rows = await this.getAll();
    rows.push(row);
    const trimmed = rows.slice(-10000);
    await this.storage.update(KEY, trimmed);
  }

  async getAll(): Promise<MetricRow[]> {
    return (this.storage.get<MetricRow[]>(KEY) ?? []);
  }

  async getLast(): Promise<MetricRow | undefined> {
    const rows = await this.getAll();
    return rows.length ? rows[rows.length - 1] : undefined;
  }

  async getSummary(days: number): Promise<{tokensBefore: number; tokensAfter: number; estCostSavedUSD: number; count: number}> {
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
