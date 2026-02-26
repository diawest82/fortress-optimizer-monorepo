'use client';

import { useState } from 'react';

interface Recommendation {
  name: string;
  description: string;
  fit: 'high' | 'medium' | 'low';
  icon: string;
}

const platformRecommendations: Record<string, Record<string, Recommendation>> = {
  ide_solo: {
    npm: { name: 'npm Package', description: 'Direct Node.js integration', fit: 'high', icon: '📦' },
    vscode: { name: 'VS Code Extension', description: 'Works in your editor', fit: 'high', icon: '⚙️' },
    copilot: { name: 'GitHub Copilot', description: 'Optimize Copilot suggestions', fit: 'medium', icon: '🤖' }
  },
  terminal_solo: {
    npm: { name: 'npm Package', description: 'CLI integration', fit: 'high', icon: '📦' },
    neovim: { name: 'Neovim Plugin', description: 'vim/neovim integration', fit: 'high', icon: '✨' },
    copilot: { name: 'GitHub Copilot CLI', description: 'Terminal-based optimization', fit: 'medium', icon: '🤖' }
  },
  cloud_solo: {
    npm: { name: 'npm Package', description: 'Cloud environment compatible', fit: 'high', icon: '📦' },
    claude: { name: 'Claude Desktop', description: 'Cloud-based optimization', fit: 'high', icon: '🚀' }
  },
  ide_team: {
    slack: { name: 'Slack Bot', description: 'Team collaboration', fit: 'high', icon: '💬' },
    vscode: { name: 'VS Code Extension', description: 'Team IDE integration', fit: 'high', icon: '⚙️' },
    jetbrains: { name: 'JetBrains IDE', description: 'Enterprise IDE support', fit: 'high', icon: '🎯' }
  },
  terminal_team: {
    slack: { name: 'Slack Bot', description: 'Team notifications & stats', fit: 'high', icon: '💬' },
    make: { name: 'Make/Zapier', description: 'Workflow automation', fit: 'high', icon: '⚡' }
  },
  ide_enterprise: {
    jetbrains: { name: 'JetBrains IDE', description: 'Enterprise deployment', fit: 'high', icon: '🎯' },
    vscode: { name: 'VS Code Enhanced', description: 'Enterprise features', fit: 'high', icon: '⚙️' },
    enterprise: { name: 'Enterprise Plan', description: 'Custom deployment & support', fit: 'high', icon: '🏢' }
  }
};

export function CompatibilityChecker() {
  const [answers, setAnswers] = useState({
    location: '',
    languages: [] as string[],
    teamSize: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const getRecommendations = (): Recommendation[] => {
    const key = `${answers.location}_${answers.teamSize}`.toLowerCase().replace(/\s+/g, '_');
    return Object.values(platformRecommendations[key] || {});
  };

  const recommendations = getRecommendations();
  const isComplete = answers.location && answers.teamSize;

  const handleSubmit = async () => {
    setSubmitted(true);

    // Track usage
    await fetch('/api/tools/track-compatibility-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codeLocation: answers.location,
        languages: answers.languages,
        teamSize: answers.teamSize,
        recommendedPlatforms: recommendations.map(r => r.name)
      })
    }).catch(() => {});
  };

  return (
    <div>
      {!submitted ? (
        <div className="space-y-8">
          {/* Question 1 */}
          <div>
            <p className="text-lg font-semibold mb-4">Where do you primarily write code?</p>
            <div className="space-y-3">
              {[
                { id: 'ide', label: '📝 IDE (VS Code, JetBrains, etc.)' },
                { id: 'terminal', label: '💻 Terminal/Command line' },
                { id: 'cloud', label: '☁️ Cloud IDE (GitHub Codespaces, etc.)' }
              ].map(option => (
                <label key={option.id} className="flex items-center gap-3 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer transition">
                  <input
                    type="radio"
                    name="location"
                    value={option.id}
                    checked={answers.location === option.id}
                    onChange={(e) => setAnswers({ ...answers, location: e.target.value })}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-base">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Question 2 */}
          <div>
            <p className="text-lg font-semibold mb-4">Programming languages (select all that apply)</p>
            <div className="space-y-3">
              {[
                { id: 'js', label: '🟨 JavaScript/TypeScript' },
                { id: 'python', label: '🐍 Python' },
                { id: 'go', label: '🔵 Go' },
                { id: 'java', label: '☕ Java' }
              ].map(lang => (
                <label key={lang.id} className="flex items-center gap-3 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={answers.languages.includes(lang.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAnswers({ ...answers, languages: [...answers.languages, lang.id] });
                      } else {
                        setAnswers({ ...answers, languages: answers.languages.filter(l => l !== lang.id) });
                      }
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-base">{lang.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Question 3 */}
          <div>
            <p className="text-lg font-semibold mb-4">Team size</p>
            <div className="space-y-3">
              {[
                { id: 'solo', label: '🧑 Just me' },
                { id: 'team', label: '👥 2-20 developers' },
                { id: 'enterprise', label: '🏢 20+ developers' }
              ].map(option => (
                <label key={option.id} className="flex items-center gap-3 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer transition">
                  <input
                    type="radio"
                    name="teamSize"
                    value={option.id}
                    checked={answers.teamSize === option.id}
                    onChange={(e) => setAnswers({ ...answers, teamSize: e.target.value })}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-base">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!isComplete}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
          >
            See My Recommendations
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Recommended Platforms For You</h2>
            <p className="text-zinc-400">Based on your setup and preferences</p>
          </div>

          {recommendations.length > 0 ? (
            <>
              <div className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-lg p-6 border border-zinc-700 hover:border-blue-500 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{rec.icon}</span>
                          <div>
                            <h3 className="font-semibold text-lg">{rec.name}</h3>
                            <p className="text-sm text-zinc-400">{rec.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`px-4 py-2 rounded font-semibold text-sm ${
                            rec.fit === 'high'
                              ? 'bg-green-600 text-white'
                              : rec.fit === 'medium'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-zinc-600 text-white'
                          }`}
                        >
                          {rec.fit === 'high' && '⭐ Perfect'}
                          {rec.fit === 'medium' && '✓ Good'}
                          {rec.fit === 'low' && 'Limited'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-6 mt-8">
                <h3 className="font-semibold text-lg mb-2">Ready to get started?</h3>
                <p className="text-zinc-300 mb-4">
                  Sign up free and connect your recommended platforms in minutes.
                </p>
                <a
                  href="/auth/signup"
                  className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
                >
                  Get Started Now
                </a>
              </div>

              <button
                onClick={() => {
                  setSubmitted(false);
                  setAnswers({ location: '', languages: [], teamSize: '' });
                }}
                className="w-full text-zinc-400 hover:text-zinc-300 py-2"
              >
                ← Recalculate
              </button>
            </>
          ) : (
            <div className="text-center">
              <p className="text-zinc-400 mb-4">No specific recommendations found for your configuration.</p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setAnswers({ location: '', languages: [], teamSize: '' });
                }}
                className="text-blue-400 hover:text-blue-300"
              >
                ← Try different options
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
