'use client';

import { useState } from 'react';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }

      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      setStatus('error');
      setErrorMsg(
        error instanceof Error ? error.message : 'Something went wrong'
      );
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-slate-700 bg-slate-950/50 p-8"
      >
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            placeholder="Your name"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            placeholder="your@email.com"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Message
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={5}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition resize-none"
            placeholder="Tell us how we can help..."
          />
        </div>

        {/* Status Messages */}
        {status === 'success' && (
          <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-100">
              Thanks for reaching out! We&apos;ll get back to you soon.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-100">{errorMsg}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
        >
          {status === 'loading' ? (
            <>
              <div className="w-4 h-4 border-2 border-emerald-200 border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-5 h-5" />
              Send Message
            </>
          )}
        </button>
      </form>
    </div>
  );
}
