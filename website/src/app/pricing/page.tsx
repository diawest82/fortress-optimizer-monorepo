import { Suspense } from "react";
import PricingClient from "./client";

export const dynamic = 'force-dynamic';

export default function Pricing() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PricingClient />
    </Suspense>
  );
}
