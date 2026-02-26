import { Suspense } from 'react';
import NotificationsClient from './client';

export const dynamic = 'force-dynamic';

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <NotificationsClient />
    </Suspense>
  );
}
