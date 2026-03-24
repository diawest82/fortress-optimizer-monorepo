'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import styles from './page.module.css';

export default function ComparePage() {
  const [monthlyTokens, setMonthlyTokens] = useState(10000000);
  
  const costPerToken = 0.00003; // $0.03 per 1K tokens
  const fortressSavings = 0.20; // 20% savings
  
  const currentCost = monthlyTokens * costPerToken;
  const savedCost = currentCost * fortressSavings;
  const newCost = currentCost - savedCost;
  const annualSavings = savedCost * 12;

  return (
    <main className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Why Fortress Wins</h1>
          <p className={styles.heroSubtitle}>
            The Only Token Optimization Platform That Actually Reduces Your Costs
          </p>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>20%</span>
              <span className={styles.statLabel}>Consistent Savings</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>5min</span>
              <span className={styles.statLabel}>Setup Time</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>0</span>
              <span className={styles.statLabel}>Code Changes</span>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className={styles.calculator}>
        <div className={styles.calculatorContent}>
          <h2>Calculate Your Savings</h2>
          <p>See how much you could save with Fortress</p>
          
          <div className={styles.calculatorForm}>
            <div className={styles.inputGroup}>
              <label>Monthly Token Usage</label>
              <input
                type="range"
                min="1000000"
                max="1000000000"
                step="1000000"
                value={monthlyTokens}
                onChange={(e) => setMonthlyTokens(Number(e.target.value))}
                aria-label="Monthly token usage slider"
                className={styles.slider}
              />
              <div className={styles.tokenInput}>
                <input
                  type="number"
                  value={monthlyTokens.toLocaleString()}
                  onChange={(e) => setMonthlyTokens(Number(e.target.value.replace(/,/g, '')))}
                  aria-label="Monthly token usage"
                  className={styles.numberInput}
                />
              </div>
            </div>

            <div className={styles.results}>
              <div className={styles.resultCard}>
                <span className={styles.resultLabel}>Current Cost</span>
                <span className={styles.resultValue}>${currentCost.toFixed(2)}</span>
                <span className={styles.resultPeriod}>per month</span>
              </div>

              <div className={styles.arrow}>→</div>

              <div className={styles.resultCard + ' ' + styles.savingsCard}>
                <span className={styles.resultLabel}>With Fortress</span>
                <span className={styles.resultValue}>${newCost.toFixed(2)}</span>
                <span className={styles.resultPeriod}>per month</span>
              </div>

              <div className={styles.resultCard + ' ' + styles.highlightCard}>
                <span className={styles.resultLabel}>You Save</span>
                <span className={styles.resultValue}>${savedCost.toFixed(2)}</span>
                <span className={styles.resultPeriod}>every month</span>
                <span className={styles.annualSavings}>${annualSavings.toFixed(2)}/year</span>
              </div>
            </div>
          </div>

          <Link href="/auth/signup" className={styles.ctaButton}>
            Start Saving Today
          </Link>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className={styles.comparison}>
        <h2>Feature Comparison</h2>
        <p className={styles.comparisonSubtitle}>
          How Fortress stacks up against other "cost reduction" solutions
        </p>

        <div className={styles.comparisonTable}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '8px',
          }}>
            <thead style={{
              background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
            }}>
              <tr>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontWeight: 700,
                  borderBottom: '2px solid rgba(59, 130, 246, 0.3)',
                  color: '#c7d2fe',
                  fontSize: '0.95rem',
                }}>Feature</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontWeight: 700,
                  borderBottom: '2px solid rgba(59, 130, 246, 0.3)',
                  color: '#c7d2fe',
                  fontSize: '0.95rem',
                }}>Fortress</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontWeight: 700,
                  borderBottom: '2px solid rgba(59, 130, 246, 0.3)',
                  color: '#c7d2fe',
                  fontSize: '0.95rem',
                }}>Response Caching</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontWeight: 700,
                  borderBottom: '2px solid rgba(59, 130, 246, 0.3)',
                  color: '#c7d2fe',
                  fontSize: '0.95rem',
                }}>Prompt Caching</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontWeight: 700,
                  borderBottom: '2px solid rgba(59, 130, 246, 0.3)',
                  color: '#c7d2fe',
                  fontSize: '0.95rem',
                }}>Manual Optimization</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#e0e7ff',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}>Actual Token Reduction</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#34d399',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✓ 20%</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ None</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#fbbf24',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>△ 2-5%</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#fbbf24',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>△ 5-15%</td>
              </tr>
              <tr>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#e0e7ff',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}>Works with Any LLM API</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#34d399',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✓ Yes</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ No</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ Vendor lock-in</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#34d399',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✓ Yes</td>
              </tr>
              <tr>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#e0e7ff',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}>Real-time Optimization</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#34d399',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✓ Auto</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ No</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ Manual</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ Manual</td>
              </tr>
              <tr>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#e0e7ff',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}>Setup Time</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#34d399',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✓ 5 min</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#fbbf24',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>△ 1-2 hrs</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ Days</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ Hours/prompt</td>
              </tr>
              <tr>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#e0e7ff',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}>Code Changes Required</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#34d399',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✓ Zero</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#fbbf24',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>△ Some</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ Migration</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ Extensive</td>
              </tr>
              <tr>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#e0e7ff',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}>Consistency</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#34d399',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✓ 100%</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#fbbf24',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>△ Variable</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#fbbf24',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>△ Basic</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ Manual</td>
              </tr>
              <tr>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#e0e7ff',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}>Vendor Lock-in</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#34d399',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✓ No</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#34d399',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✓ No</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ Yes</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#34d399',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✓ No</td>
              </tr>
              <tr>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#e0e7ff',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}>Consistent Savings</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#34d399',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✓ Yes</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ No</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ No</td>
                <td style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                  color: '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}>✗ No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Why Fortress Section */}
      <section className={styles.whyFortress}>
        <h2>Why Choose Fortress?</h2>
        
        <div className={styles.reasonsGrid}>
          <div className={styles.reason}>
            <div className={styles.reasonIcon}>🎯</div>
            <h3>Semantic Understanding</h3>
            <p>
              We don&apos;t just compress text. Our AI understands the meaning of your prompts 
              and restructures them intelligently while preserving quality.
            </p>
          </div>

          <div className={styles.reason}>
            <div className={styles.reasonIcon}>⚡</div>
            <h3>Instant Integration</h3>
            <p>
              Works with your existing code in seconds. No refactoring, no infrastructure 
              changes, no learning curve. Just immediate savings.
            </p>
          </div>

          <div className={styles.reason}>
            <div className={styles.reasonIcon}>📊</div>
            <h3>Real-time Visibility</h3>
            <p>
              Track every saving in real-time. See token reduction, cost savings, and ROI 
              with detailed dashboards and analytics.
            </p>
          </div>

          <div className={styles.reason}>
            <div className={styles.reasonIcon}>🔗</div>
            <h3>Universal Compatibility</h3>
            <p>
              Works with OpenAI, Anthropic, Google, Meta, and any LLM API. No vendor 
              lock-in, no switching costs.
            </p>
          </div>

          <div className={styles.reason}>
            <div className={styles.reasonIcon}>✅</div>
            <h3>Quality Consistent</h3>
            <p>
              10-20% average token reduction without sacrificing output quality. Techniques include
              semantic deduplication, filler removal, and context compression.
            </p>
          </div>

          <div className={styles.reason}>
            <div className={styles.reasonIcon}>💰</div>
            <h3>No Upfront Cost</h3>
            <p>
              Only pay for what you save. Start free with up to 50K tokens/month. Scale
              as you grow.
            </p>
          </div>
        </div>
      </section>

      {/* Competitors Fail Because... */}
      <section className={styles.whyOthersFail}>
        <h2>Why Other Solutions Fall Short</h2>
        
        <div className={styles.failuresGrid}>
          <div className={styles.failure}>
            <h3>Response Caching (Portkey, GPTCache)</h3>
            <p>
              <strong>The limitation:</strong> Only helps with repeated identical prompts.
              Most real-world usage has unique prompts — caching miss rate is 80%+.
            </p>
            <p className={styles.failureDetail}>
              Result: 5-15% savings on cache hits only
            </p>
          </div>

          <div className={styles.failure}>
            <h3>Prompt Caching (Anthropic, OpenAI)</h3>
            <p>
              <strong>The limitation:</strong> Caches system prompts and prefixes, not user content.
              Saves on repeated system messages but not on the variable parts of prompts.
            </p>
            <p className={styles.failureDetail}>
              Result: 10-50% on system prompt tokens only
            </p>
          </div>

          <div className={styles.failure}>
            <h3>❌ Manual Prompt Engineering</h3>
            <p>
              <strong>The problem:</strong> Inconsistent, time-consuming, and doesn&apos;t scale. 
              Requires constant maintenance and human effort.
            </p>
            <p className={styles.failureDetail}>
              Result: 5-15% savings, high operational cost
            </p>
          </div>

          <div className={styles.failure}>
            <h3>❌ LangChain / LLamaIndex</h3>
            <p>
              <strong>The problem:</strong> These are frameworks, not optimizers. They don&apos;t 
              reduce tokens; they just manage them better.
            </p>
            <p className={styles.failureDetail}>
              Result: 0% token reduction, refactoring required
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className={styles.socialProof}>
        <h2>Built for Developer Teams</h2>
        <p>Early access — join teams already optimizing their AI spend</p>

        <div className={styles.statsRow}>
          <div className={styles.proofStat}>
            <span className={styles.proofNumber}>20%</span>
            <span className={styles.proofLabel}>Avg Token Savings</span>
          </div>
          <div className={styles.proofStat}>
            <span className={styles.proofNumber}>68ms</span>
            <span className={styles.proofLabel}>Optimization Latency</span>
          </div>
          <div className={styles.proofStat}>
            <span className={styles.proofNumber}>12</span>
            <span className={styles.proofLabel}>Integration Platforms</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.ctaBox}>
          <h2>Ready to Save 10-20% on Your LLM Costs?</h2>
          <p>Start optimizing in less than 5 minutes. No credit card required.</p>
          
          <div className={styles.ctaButtons}>
            <Link href="/auth/signup" className={styles.ctaButtonPrimary}>
              Start Free Today
            </Link>
            <Link href="/pricing" className={styles.ctaButtonSecondary}>
              View Pricing
            </Link>
          </div>

          <p className={styles.ctaSmall}>
            ✓ 50K free tokens/month ✓ No credit card required ✓ Cancel anytime
          </p>
        </div>
      </section>
    </main>
  );
}
