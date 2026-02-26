import { Suspense } from 'react';
import EmailAdminClient from './client';

export const dynamic = 'force-dynamic';

export default function EmailAdminPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <EmailAdminClient />
    </Suspense>
  );
}
