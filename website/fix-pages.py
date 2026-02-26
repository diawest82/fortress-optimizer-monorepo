#!/usr/bin/env python3
import os
import glob

# Find all page.tsx files
pages = glob.glob('src/app/**/page.tsx', recursive=True)

for page_path in pages:
    with open(page_path, 'r') as f:
        content = f.read()
    
    # Check if it starts with 'use client'
    if not content.strip().startswith("'use client'"):
        continue
    
    # Get directory
    page_dir = os.path.dirname(page_path)
    client_file = os.path.join(page_dir, 'client.tsx')
    
    # Check if client.tsx already exists
    if os.path.exists(client_file):
        print(f"SKIP (has client.tsx): {page_path}")
        # Just update page.tsx with server wrapper
        with open(page_path, 'w') as f:
            f.write("""import { Suspense } from 'react';
import Client from './client';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <Client />
    </Suspense>
  );
}
""")
    else:
        print(f"FIX: {page_path}")
        # Remove 'use client' and export const dynamic lines
        lines = content.split('\n')
        filtered = [line for line in lines if line.strip() not in ["'use client';", "export const dynamic = 'force-dynamic';"]]
        client_content = '\n'.join(filtered).lstrip('\n')
        
        # Write client.tsx
        with open(client_file, 'w') as f:
            f.write("'use client';\n\n" + client_content)
        
        # Write new page.tsx
        with open(page_path, 'w') as f:
            f.write("""import { Suspense } from 'react';
import Client from './client';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <Client />
    </Suspense>
  );
}
""")

print("\n✅ All pages fixed!")
