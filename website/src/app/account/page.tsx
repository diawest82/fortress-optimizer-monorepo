import { Suspense } from "react";
import AccountContent from "@/components/account-content";

// Mark this route as dynamic to skip prerendering
export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center">
          <p className="text-white">Loading...</p>
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
