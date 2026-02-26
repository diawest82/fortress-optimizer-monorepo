import ContactForm from '@/components/contact-form';
import SupportChatbot from '@/components/support-chatbot';
import { Mail, BookOpen, MessageSquare, Clock, MessageCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function Support() {
  return (
    <>
      <SupportChatbot />
      <div className="flex flex-col gap-16">
      {/* Header */}
      <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-purple-950/40 p-12 text-center space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-blue-300 font-semibold">
          💬 Help & Support
        </p>
        <h1 className="text-4xl font-semibold text-white md:text-5xl">
          We&apos;re here to help
        </h1>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Get answers to your questions or reach out to our support team. We
          typically respond within 24 hours.
        </p>
      </section>

      {/* Quick Links */}
      <section className="grid md:grid-cols-4 gap-6">
        <a
          href="/docs"
          className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-6 hover:border-blue-500/60 transition group"
        >
          <BookOpen className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition" />
          <h3 className="font-semibold text-white mb-2">Documentation</h3>
          <p className="text-sm text-blue-200">
            Comprehensive guides and API reference
          </p>
        </a>

        <a
          href="/install"
          className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-6 hover:border-blue-500/60 transition group"
        >
          <MessageSquare className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition" />
          <h3 className="font-semibold text-white mb-2">Installation</h3>
          <p className="text-sm text-blue-200">
            Step-by-step setup for your platform
          </p>
        </a>

        <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-6">
          <Clock className="w-8 h-8 text-blue-400 mb-3" />
          <h3 className="font-semibold text-white mb-2">Response Time</h3>
          <p className="text-sm text-blue-200">
            We respond within 24 hours
          </p>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-6">
          <Mail className="w-8 h-8 text-blue-400 mb-3" />
          <h3 className="font-semibold text-white mb-2">Email</h3>
          <p className="text-sm text-blue-200">
            support@fortress-optimizer.com
          </p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-semibold text-white">Get in Touch</h2>
          <p className="text-slate-300">
            Have a question or need assistance? Fill out the form below.
          </p>
        </div>

        <ContactForm />
      </section>

      {/* FAQ Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-semibold text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-300">
            Find quick answers to common questions
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              q: 'How much can I save with Fortress?',
              a: 'On average, teams save 20% on token costs. The exact amount depends on your prompt patterns and usage frequency. See the dashboard for your specific savings.',
            },
            {
              q: 'Which platforms are supported?',
              a: 'We support npm, GitHub Copilot, VS Code, Slack, and Claude Desktop. More integrations coming soon.',
            },
            {
              q: 'Is my data secure?',
              a: 'Yes. We use end-to-end encryption and do not store your prompts. All optimization happens in real-time without persistence.',
            },
            {
              q: 'Can I use Fortress with my existing tools?',
              a: 'Absolutely. Fortress integrates seamlessly with your current workflow through npm, extensions, and integrations.',
            },
            {
              q: 'What happens if the optimization fails?',
              a: 'If optimization fails for any reason, your original prompt is sent to the LLM unchanged. Zero data loss.',
            },
            {
              q: 'How do I upgrade or downgrade my plan?',
              a: 'You can change your plan anytime in your account settings. Changes take effect at your next billing cycle.',
            },
          ].map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-6"
            >
              <h3 className="font-semibold text-white mb-3">{faq.q}</h3>
              <p className="text-blue-200 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Additional Help */}
      <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-purple-950/40 p-8 text-center space-y-4">
        <h2 className="text-2xl font-semibold text-white">
          Didn&apos;t find what you&apos;re looking for?
        </h2>
        <p className="text-blue-200 max-w-2xl mx-auto">
          Our support team is always ready to help. Send us a message above and
          we&apos;ll get back to you as soon as possible.
        </p>
      </section>
    </div>
    </>
  );
}
