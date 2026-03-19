import DocsSidebar from '@/components/docs-sidebar';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 pt-16">
      <DocsSidebar />
      <main className="lg:pl-64 p-8">
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
