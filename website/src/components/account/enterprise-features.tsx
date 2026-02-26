'use client';

import { Shield, Users, Clock, Settings, Zap, CheckCircle } from 'lucide-react';

interface EnterpriseFeature {
  icon: React.ReactNode;
  title: string;
  description: string;
  available: boolean;
}

export default function EnterpriseFeatures() {
  const features: EnterpriseFeature[] = [
    {
      icon: <Clock className="w-6 h-6" />,
      title: '24/7 Priority Support',
      description: 'Dedicated support team available round-the-clock with 1-hour response guarantee',
      available: true,
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Dedicated Account Manager',
      description: 'Personal account manager to help with implementation, optimization, and growth',
      available: true,
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'SLA Guarantee',
      description: 'Service Level Agreement with uptime guarantee and performance commitments',
      available: true,
    },
    {
      icon: <Settings className="w-6 h-6" />,
      title: 'Custom Integrations',
      description: 'Build custom integrations tailored to your specific workflows and tools',
      available: true,
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'On-Premise Deployment',
      description: 'Deploy Fortress on your own infrastructure with full control over data residency',
      available: true,
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Advanced Security',
      description: 'SOC 2 compliance, SSO/SAML, custom audit logging, and data encryption options',
      available: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 to-pink-950/40 p-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold text-white mb-3">Enterprise Solution</h2>
          <p className="text-slate-300 mb-6">
            Fortress Enterprise is designed for large organizations with advanced requirements. Get dedicated support, custom integrations, and full control over your deployment.
          </p>
          <button className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition">
            Contact Sales Team
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 hover:border-slate-600 transition"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400">
                {feature.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  {feature.available && (
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-1">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-8">
        <div className="max-w-2xl">
          <h3 className="text-2xl font-bold text-white mb-2">Custom Pricing</h3>
          <p className="text-slate-400 mb-6">
            Enterprise pricing is based on your organization's size, usage patterns, and requirements. We offer flexible annual contracts with volume discounts.
          </p>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[
              { label: 'Company Size', value: '1,000+ employees' },
              { label: 'Support Level', value: '24/7 with SLA' },
              { label: 'Deployment', value: 'On-premise ready' },
              { label: 'Contract', value: 'Annual agreement' },
            ].map((item, idx) => (
              <div key={idx}>
                <p className="text-sm text-slate-400 mb-1">{item.label}</p>
                <p className="text-lg font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
          <button className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition">
            Request Custom Quote
          </button>
        </div>
      </div>

      {/* Implementation Timeline */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Implementation Timeline</h3>
        <div className="space-y-4">
          {[
            { phase: 'Discovery', days: '2-3 days', desc: 'Assessment of requirements and current setup' },
            { phase: 'Planning', days: '5-7 days', desc: 'Custom integration architecture and roadmap' },
            { phase: 'Implementation', days: '2-4 weeks', desc: 'Setup, configuration, and testing' },
            { phase: 'Training', days: '3-5 days', desc: 'Team training and documentation' },
            { phase: 'Go-Live', days: '1-2 days', desc: 'Production deployment and monitoring' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-4 pb-4 border-b border-slate-700/50 last:border-0 last:pb-0">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-semibold text-sm">
                  {idx + 1}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-white">{item.phase}</p>
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                    {item.days}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Support */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Enterprise Support Benefits</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              title: 'Dedicated Slack Channel',
              desc: 'Direct communication with your account team and technical support',
            },
            {
              title: 'Quarterly Business Reviews',
              desc: 'Strategic planning sessions to maximize your ROI',
            },
            {
              title: 'Performance Monitoring',
              desc: 'Proactive monitoring and optimization recommendations',
            },
            {
              title: 'Priority Feature Access',
              desc: 'Early access to new features and beta programs',
            },
            {
              title: 'Custom Reporting',
              desc: 'Tailored dashboards and reports for your needs',
            },
            {
              title: 'Security Audits',
              desc: 'Regular security reviews and compliance assistance',
            },
          ].map((benefit, idx) => (
            <div key={idx} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <h4 className="font-semibold text-white mb-1">{benefit.title}</h4>
              <p className="text-sm text-slate-400">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact CTA */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Ready to Scale?</h3>
        <p className="text-emerald-100 mb-6 max-w-2xl mx-auto">
          Our sales team will work with you to understand your needs and create a custom solution tailored to your organization.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href="mailto:sales@fortress-optimizer.com" className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition">
            Schedule Demo
          </a>
          <a href="tel:+1-855-FORTRESS" className="px-6 py-3 border border-emerald-600 text-emerald-300 rounded-lg font-semibold hover:bg-emerald-500/10 transition">
            Call Sales: 1-855-FORTRESS
          </a>
        </div>
      </div>
    </div>
  );
}
