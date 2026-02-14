'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Zap, Code2, Brain } from 'lucide-react';

export default function LiveDemo() {
  const [inputText, setInputText] = useState('Tell me about the history of artificial intelligence and its impact on modern society.');
  const [originalTokens, setOriginalTokens] = useState(0);
  const [optimizedTokens, setOptimizedTokens] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setOriginalTokens(inputText.split(/\s+/).length * 1.3);
  }, [inputText]);

  const handleOptimize = async () => {
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 1500));
    setOptimizedTokens(Math.floor(originalTokens * 0.65));
    setIsProcessing(false);
  };

  const savings = Math.round(((originalTokens - optimizedTokens) / originalTokens) * 100);
  const costSavings = (originalTokens * 0.002 - optimizedTokens * 0.002).toFixed(4);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-12">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6">
            <span className="gradient-text">Reduce AI Token Usage</span>
            <br />
            <span className="text-white">By Up to 35%</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Fortress optimizes every token in your AI prompts. Lower costs, faster responses, same results.
          </p>
        </div>

        {/* Live Demo */}
        <div className="card-dark p-8 mb-12">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Input */}
            <div>
              <label className="block text-sm font-semibold mb-3">Your Prompt</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full h-40 bg-zinc-950 border border-zinc-700 rounded-lg p-4 text-white resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
              />
              <div className="mt-3 flex items-center gap-2 text-zinc-400">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">{Math.round(originalTokens)} tokens</span>
              </div>
            </div>

            {/* Output */}
            <div>
              <label className="block text-sm font-semibold mb-3">Optimized</label>
              <div className="w-full h-40 bg-zinc-950 border border-zinc-700 rounded-lg p-4 overflow-auto">
                {optimizedTokens > 0 ? (
                  <p className="text-green-400 text-sm leading-relaxed">
                    Tell me the history of AI and its societal impact.
                  </p>
                ) : (
                  <p className="text-zinc-500 text-sm">Click "Optimize" to see the result</p>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-zinc-400">
                <Zap className="w-4 h-4 text-green-500" />
                <span className="text-sm">{Math.round(optimizedTokens)} tokens</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-zinc-800">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{savings}%</div>
              <div className="text-sm text-zinc-400 mt-1">Token Reduction</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">${costSavings}</div>
              <div className="text-sm text-zinc-400 mt-1">Cost Saved (per prompt)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">1.5x</div>
              <div className="text-sm text-zinc-400 mt-1">Faster Response</div>
            </div>
          </div>

          {/* Button */}
          <button
            onClick={handleOptimize}
            disabled={isProcessing}
            className="w-full mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 glow"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Optimizing...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Optimize
              </>
            )}
          </button>
        </div>

        {/* Product Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="card-dark p-6">
            <Code2 className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="font-semibold mb-2">npm Package</h3>
            <p className="text-sm text-zinc-400">Integrate in seconds</p>
          </div>
          <div className="card-dark p-6">
            <Brain className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="font-semibold mb-2">GitHub Copilot</h3>
            <p className="text-sm text-zinc-400">Built-in optimization</p>
          </div>
          <div className="card-dark p-6">
            <Zap className="w-8 h-8 text-yellow-400 mb-3" />
            <h3 className="font-semibold mb-2">Slack Bot</h3>
            <p className="text-sm text-zinc-400">Team collaboration</p>
          </div>
          <div className="card-dark p-6">
            <ArrowRight className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="font-semibold mb-2">15+ Platforms</h3>
            <p className="text-sm text-zinc-400">Plus many more...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
