import { Suspense } from 'react';
import TeamSignUpClient from './client';

export default function TeamSignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" /></div>}>
      <TeamSignUpClient />
    </Suspense>
  );
}
