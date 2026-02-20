import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/docs',
    component: ComponentCreator('/docs', '1b5'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '94a'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'b8a'),
            routes: [
              {
                path: '/docs/api-reference',
                component: ComponentCreator('/docs/api-reference', '756'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/getting-started',
                component: ComponentCreator('/docs/getting-started', '2a1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/guides/best-practices',
                component: ComponentCreator('/docs/guides/best-practices', '907'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/guides/how-it-works',
                component: ComponentCreator('/docs/guides/how-it-works', '689'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/how-we-differ',
                component: ComponentCreator('/docs/how-we-differ', 'e4d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/installation/claude-desktop',
                component: ComponentCreator('/docs/installation/claude-desktop', '432'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/installation/copilot',
                component: ComponentCreator('/docs/installation/copilot', 'daf'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/installation/npm',
                component: ComponentCreator('/docs/installation/npm', 'd57'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/installation/slack',
                component: ComponentCreator('/docs/installation/slack', 'c7a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/installation/vscode',
                component: ComponentCreator('/docs/installation/vscode', '991'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/quick-start',
                component: ComponentCreator('/docs/quick-start', 'b74'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/what-is-fortress',
                component: ComponentCreator('/docs/what-is-fortress', '88b'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
