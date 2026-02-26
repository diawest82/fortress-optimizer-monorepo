'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

// Type for window with gtag property
type WindowWithGtag = typeof window & {
  gtag?: (command: string, action: string, params?: Record<string, unknown>) => void;
};

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('cookie-consent');
  });
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookieConsent>(() => {
    if (typeof window === 'undefined') {
      return { necessary: true, analytics: false, marketing: false, timestamp: 0 };
    }
    const saved = localStorage.getItem('cookie-consent');
    return saved
      ? (JSON.parse(saved) as CookieConsent)
      : { necessary: true, analytics: false, marketing: false, timestamp: 0 };
  });

  const applyCookieConsent = useCallback((consent: CookieConsent) => {
    // Apply analytics cookies if accepted
    if (consent.analytics) {
      // Enable Google Analytics, Mixpanel, etc.
      if (typeof window !== 'undefined') {
        const win = window as WindowWithGtag;
        if (win.gtag) {
          win.gtag('consent', 'update', {
            analytics_storage: 'granted',
          });
        }
      }
    } else {
      if (typeof window !== 'undefined') {
        const win = window as WindowWithGtag;
        if (win.gtag) {
          win.gtag('consent', 'update', {
            analytics_storage: 'denied',
          });
        }
      }
    }

    // Apply marketing cookies if accepted
    if (consent.marketing) {
      if (typeof window !== 'undefined') {
        const win = window as WindowWithGtag;
        if (win.gtag) {
          win.gtag('consent', 'update', {
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
          });
        }
      }
    } else {
      if (typeof window !== 'undefined') {
        const win = window as WindowWithGtag;
        if (win.gtag) {
          win.gtag('consent', 'update', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    // Apply saved consent on mount
    const consent = localStorage.getItem('cookie-consent');
    if (consent) {
      applyCookieConsent(JSON.parse(consent) as CookieConsent);
    }
  }, [applyCookieConsent]);

  const saveConsent = (consent: CookieConsent) => {
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    applyCookieConsent(consent);
    setShowBanner(false);
    setShowPreferences(false);
  };

  const acceptAll = () => {
    const consent: CookieConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    };
    saveConsent(consent);
  };

  const acceptNecessaryOnly = () => {
    const consent: CookieConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    };
    saveConsent(consent);
  };

  const savePreferences = () => {
    saveConsent({ ...preferences, timestamp: Date.now() });
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                We use cookies to enhance your browsing experience, analyze site traffic, and personalize content.
                By clicking &ldquo;Accept All&rdquo;, you consent to our use of cookies.{' '}
                <Link 
                  href="/legal/privacy" 
                  className="underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowPreferences(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Customize
              </button>
              <button
                onClick={acceptNecessaryOnly}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Necessary Only
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Cookie Preferences
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Manage your cookie preferences. You can enable or disable different types of cookies below.
              </p>

              {/* Necessary Cookies */}
              <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Necessary Cookies
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      These cookies are essential for the website to function properly. They enable core functionality
                      such as security, authentication, and session management. These cannot be disabled.
                    </p>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="w-5 h-5 text-indigo-600 bg-gray-100 rounded cursor-not-allowed opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Analytics Cookies
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      These cookies help us understand how visitors interact with our website by collecting and
                      reporting information anonymously. This helps us improve our site performance.
                    </p>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 bg-gray-100 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Marketing Cookies
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      These cookies are used to track visitors across websites to display relevant advertisements
                      and measure the effectiveness of marketing campaigns.
                    </p>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 bg-gray-100 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowPreferences(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePreferences}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
