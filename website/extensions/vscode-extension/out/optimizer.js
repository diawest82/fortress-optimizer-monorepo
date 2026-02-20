"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Optimizer = void 0;
class Optimizer {
    constructor() {
        this.SEMANTIC_SIMILARITY_THRESHOLD = 0.85;
    }
    // Detect if text contains code blocks
    containsCode(text) {
        const codePatterns = [
            /function\s+\w+\s*\(/,
            /class\s+\w+/,
            /const\s+\w+\s*=/,
            /let\s+\w+\s*=/,
            /import\s+\{?/,
            /export\s+(default\s+)?(function|class|const)/,
            /=>|async\s+function/,
            /\{\s*\/\//, // Code comment
            /^\s*(def|class|import|from|async def)/m, // Python
            /^\s*(public|private|protected|void|int|string|bool)/m // Java/C#
        ];
        return codePatterns.some(pattern => pattern.test(text));
    }
    // Calculate string similarity (0-1)
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0)
            return 1.0;
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    // Levenshtein distance implementation
    levenshteinDistance(s1, s2) {
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                }
                else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0)
                costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }
    // Get semantic threshold based on optimization level
    getSemanticThreshold(level, customThreshold) {
        if (customThreshold !== undefined)
            return customThreshold;
        switch (level) {
            case 'conservative': return 0.98; // Only remove ~98%+ similar (very strict)
            case 'aggressive': return 0.80; // Remove ~80%+ similar
            case 'balanced':
            default: return 0.90; // Remove ~90%+ similar
        }
    }
    // Remove code comments and boilerplate
    removeCodeBoilerplate(text, provider) {
        let result = text;
        // Remove single-line comments (for most languages)
        result = result.replace(/\/\/.*$/gm, '');
        // Remove hash comments (Python)
        result = result.replace(/#.*$/gm, '');
        // Provider-specific optimizations
        if (provider === 'anthropic') {
            // Claude prefers structure, less aggressive
            return result;
        }
        else if (provider === 'openai' || provider === 'copilot') {
            // GPT-4 is more flexible, can be more aggressive
            // Remove docstrings
            result = result.replace(/["']{3}[\s\S]*?["']{3}/g, '');
            result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        }
        else if (provider === 'claude-desktop') {
            // Claude Desktop uses Anthropic backend - same level of optimization as Copilot
            result = result.replace(/["']{3}[\s\S]*?["']{3}/g, '');
            result = result.replace(/\/\*[\s\S]*?\*\//g, '');
            // Copilot benefits from similar optimizations to GPT-4
            result = result.replace(/["']{3}[\s\S]*?["']{3}/g, '');
            result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        }
        return result;
    }
    optimize(rawPrompt, opts) {
        const tokensBefore = this.estimateTokens(rawPrompt);
        const level = opts.optimizationLevel || 'balanced';
        const provider = opts.provider || 'openai';
        const detectCode = opts.detectCode !== false;
        const threshold = this.getSemanticThreshold(level, opts.semanticThreshold);
        let workingText = rawPrompt;
        const containsCode = detectCode && this.containsCode(rawPrompt);
        // Apply code-aware boilerplate removal if code detected
        if (containsCode) {
            workingText = this.removeCodeBoilerplate(workingText, provider);
        }
        const lines = workingText.split(/\r?\n/);
        const seen = [];
        const kept = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                kept.push(line);
                continue;
            }
            const key = trimmed.toLowerCase();
            // Check for exact duplicate
            if (seen.some(s => s.key === key)) {
                continue;
            }
            // Check for semantic duplicate
            let isSemanticallyDuplicate = false;
            for (const seenItem of seen) {
                const similarity = this.calculateSimilarity(key, seenItem.key);
                if (similarity >= threshold) {
                    isSemanticallyDuplicate = true;
                    break;
                }
            }
            if (isSemanticallyDuplicate) {
                continue;
            }
            seen.push({ key, original: line });
            kept.push(line);
        }
        let optimizedPrompt = kept.join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        const tokensAfter = this.estimateTokens(optimizedPrompt);
        const percentSaved = tokensBefore > 0 ? ((tokensBefore - tokensAfter) / tokensBefore) * 100 : 0;
        const estCostSavedUSD = ((tokensBefore - tokensAfter) / 1000) * opts.costPer1KTokensUSD;
        return {
            tokensBefore,
            tokensAfter,
            percentSaved: Math.max(0, percentSaved),
            estCostSavedUSD: Math.max(0, estCostSavedUSD),
            optimizedPrompt
        };
    }
    noop(rawPrompt, opts) {
        const t = this.estimateTokens(rawPrompt);
        return { tokensBefore: t, tokensAfter: t, percentSaved: 0, estCostSavedUSD: 0, optimizedPrompt: rawPrompt };
    }
    estimateTokens(text) {
        return Math.max(1, Math.ceil(text.length / 4));
    }
}
exports.Optimizer = Optimizer;
//# sourceMappingURL=optimizer.js.map