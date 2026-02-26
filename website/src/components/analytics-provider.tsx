'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    posthog?: {
      init?: (apiKey: string, config: Record<string, unknown>) => void;
      capture: (event: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, properties?: Record<string, unknown>) => void;
      reset?: () => void;
      opt_in_capturing?: () => void;
      opt_out_capturing?: () => void;
    };
    fbq?: (action: string, event: string, params?: Record<string, unknown>) => void;
    gtag?: (command: string, target: string, params?: Record<string, unknown>) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check consent
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) return;

    const { analytics, marketing } = JSON.parse(consent);

    // Initialize PostHog if analytics consent given
    if (analytics && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      const script = document.createElement('script');
      script.innerHTML = `
        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
        posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}', {
          api_host: '${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'}',
          loaded: function(posthog) {
            if (${!analytics}) {
              posthog.opt_out_capturing();
            }
          }
        })
      `;
      document.head.appendChild(script);
    }

    // Initialize Meta Pixel if marketing consent given
    if (marketing && process.env.NEXT_PUBLIC_META_PIXEL_ID) {
      const script = document.createElement('script');
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);

      const noscript = document.createElement('noscript');
      noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_META_PIXEL_ID}&ev=PageView&noscript=1"/>`;
      document.body.appendChild(noscript);
    }

    // Initialize Google Analytics if analytics consent given
    if (analytics && process.env.NEXT_PUBLIC_GA_ID) {
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`;
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
          page_path: window.location.pathname,
        });
      `;
      document.head.appendChild(script2);
    }
  }, []);

  // Track page views
  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) return;

    const { analytics } = JSON.parse(consent);
    if (!analytics) return;

    const url = pathname + searchParams.toString();

    // PostHog page view
    if (window.posthog) {
      window.posthog.capture('$pageview', { path: url });
    }

    // Meta Pixel page view
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }

    // Google Analytics page view
    if (window.gtag && process.env.NEXT_PUBLIC_GA_ID) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
        page_path: url,
      });
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
