import { Suspense } from 'react';
import Client from './client';
import SiteFooter from '@/components/site-footer';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <>
      <Suspense fallback={<div className="p-8">Loading...</div>}>
        <Client />
      </Suspense>
      <SiteFooter />
    </>
  );
}
