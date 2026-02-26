'use client';

import { useState, useRef } from 'react';
import { Send, MessageCircle, X, AlertCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const commonQuestions = [
  'How do I install Fortress Optimizer?',
  'What is the pricing?',
  'How much can I save on tokens?',
  'Do you have a free trial?',
  'Which platforms are supported?',
  'How do I reset my password?',
  'What is the response time?',
  'Can I upgrade my plan?',
];

const botResponses: { [key: string]: string } = {
  install: 'You can install Fortress Optimizer via npm, GitHub Copilot, VS Code, Slack, or Claude Desktop. Visit our installation guides page for step-by-step instructions for each platform.',
  pricing: 'We offer three plans: Starter ($29/mo), Growth ($99/mo), and Enterprise (custom). All plans include real-time token optimization across supported platforms.',
  save: 'Our customers see an average of 20% token reduction, with some seeing up to 25% depending on their use case. Check your dashboard for personalized metrics.',
  trial: 'Yes! You can try Fortress Optimizer free for 14 days with full access to all features. No credit card required.',
  platforms: 'We support npm packages, GitHub Copilot, VS Code extensions, Slack integrations, and Claude Desktop. More platforms coming soon!',
  password: 'Click the "Forgot password" link on the login page. We\'ll send you a reset link via email within minutes.',
  response: 'Our live chat support responds in under 5 minutes during business hours. Email support responds within 24 hours.',
  upgrade: 'You can upgrade your plan anytime from your account settings. Changes take effect immediately with prorated billing.',
  default: 'Great question! Our support team would love to help you with that. Please contact us at support@fortress-optimizer.dev or fill out the contact form below.',
};

export default function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      text: 'Hi there! 👋 I\'m the Fortress Optimizer support bot. I can help you with common questions about installation, pricing, features, and more. What can I help you with today?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messageIdRef = useRef(2);

  const getNextId = (): string => {
    const id = messageIdRef.current.toString();
    messageIdRef.current += 1;
    return id;
  };

  const getBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('install') || lowerMessage.includes('setup')) {
      return botResponses.install;
    }
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('paid')) {
      return botResponses.pricing;
    }
    if (lowerMessage.includes('save') || lowerMessage.includes('reduction') || lowerMessage.includes('cost')) {
      return botResponses.save;
    }
    if (lowerMessage.includes('trial') || lowerMessage.includes('free')) {
      return botResponses.trial;
    }
    if (lowerMessage.includes('platform') || lowerMessage.includes('support')) {
      return botResponses.platforms;
    }
    if (lowerMessage.includes('password') || lowerMessage.includes('reset')) {
      return botResponses.password;
    }
    if (lowerMessage.includes('response') || lowerMessage.includes('fast') || lowerMessage.includes('time')) {
      return botResponses.response;
    }
    if (lowerMessage.includes('upgrade') || lowerMessage.includes('plan')) {
      return botResponses.upgrade;
    }

    return botResponses.default;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const messageText = inputValue;
    const userMessage: ChatMessage = {
      id: getNextId(),
      type: 'user',
      text: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: getNextId(),
        type: 'bot',
        text: getBotResponse(messageText),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
      setIsLoading(false);
    }, 500);
  };

  const handleQuickQuestion = (question: string) => {
    const userMessage: ChatMessage = {
      id: getNextId(),
      type: 'user',
      text: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: getNextId(),
        type: 'bot',
        text: getBotResponse(question),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
      setIsLoading(false);
    }, 500);
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 flex items-center gap-2"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="font-semibold">Chat Support</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-4 rounded-t-2xl flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">Fortress Support</h3>
                <p className="text-xs text-emerald-100">Typically replies instantly</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-emerald-700 p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-100 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-200" />
              </div>
            )}
          </div>

          {/* Quick Questions (first message only) */}
          {messages.length === 1 && (
            <div className="p-4 border-t border-slate-700 space-y-2">
              <p className="text-xs text-slate-400 mb-3">Quick questions:</p>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                {commonQuestions.slice(0, 4).map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickQuestion(question)}
                    className="text-left text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded transition truncate"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-700 p-4 bg-slate-900 rounded-b-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your question..."
                className="flex-1 bg-slate-800 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg p-2 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-slate-950 border-t border-slate-700 rounded-b-2xl text-center">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
              <AlertCircle className="w-3 h-3" />
              For urgent issues: support@fortress-optimizer.dev
            </p>
          </div>
        </div>
      )}
    </>
  );
}
