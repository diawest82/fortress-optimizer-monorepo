import { readFileSync } from 'fs';
import { join } from 'path';

export interface LinkEntry {
  id: string;
  source: string;
  selector: string;
  expectedDestination: string;
  pageMarker: string | null;
  priority: 'critical' | 'high' | 'low';
  category: string;
  authRequired: boolean;
  clickType?: 'link' | 'router' | 'mailto';
  knownBug?: string;
}

export interface RouteEntry {
  path: string;
  expectedTitle: string;
  status: number;
  authRequired: boolean;
}

interface SiteContract {
  links: LinkEntry[];
}

interface PagesContract {
  routes: RouteEntry[];
}

const CONTRACTS_DIR = join(__dirname, '..', 'contracts');

export function loadSiteContract(): SiteContract {
  const raw = readFileSync(join(CONTRACTS_DIR, 'site.contract.json'), 'utf-8');
  return JSON.parse(raw);
}

export function loadPagesContract(): PagesContract {
  const raw = readFileSync(join(CONTRACTS_DIR, 'pages.contract.json'), 'utf-8');
  return JSON.parse(raw);
}

export function generateLinkTests(filter?: {
  category?: string;
  priority?: string;
  authRequired?: boolean;
}): LinkEntry[] {
  const contract = loadSiteContract();
  let links = contract.links;

  if (filter?.category) {
    links = links.filter(l => l.category === filter.category);
  }
  if (filter?.priority) {
    links = links.filter(l => l.priority === filter.priority);
  }
  if (filter?.authRequired !== undefined) {
    links = links.filter(l => l.authRequired === filter.authRequired);
  }

  return links;
}

export function generateRouteTests(filter?: {
  authRequired?: boolean;
}): RouteEntry[] {
  const contract = loadPagesContract();
  let routes = contract.routes;

  if (filter?.authRequired !== undefined) {
    routes = routes.filter(r => r.authRequired === filter.authRequired);
  }

  return routes;
}
