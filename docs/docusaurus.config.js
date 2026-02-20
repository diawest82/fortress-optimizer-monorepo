// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Fortress Token Optimizer',
  tagline: 'Save 20% on LLM API costs with intelligent token optimization',
  favicon: 'img/favicon.ico',
  url: 'https://docs.fortress-optimizer.com',
  baseUrl: '/',
  organizationName: 'fortress-optimizer',
  projectName: 'docs',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/diawest82/fortress-optimizer-monorepo/tree/main/docs',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/diawest82/fortress-optimizer-monorepo/tree/main/docs',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/fortress-og.png',
      navbar: {
        title: 'Fortress',
        logo: {
          alt: 'Fortress Logo',
          src: 'img/logo.svg',
          width: 32,
          height: 32,
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Docs',
          },
          { to: '/blog', label: 'Blog', position: 'left' },
          {
            href: 'https://www.fortress-optimizer.com',
            label: 'Website',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/getting-started',
              },
              {
                label: 'Installation',
                to: '/docs/installation/npm',
              },
              {
                label: 'API Reference',
                to: '/docs/api-reference',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Twitter',
                href: 'https://twitter.com/fortressopt',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Website',
                href: 'https://www.fortress-optimizer.com',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Fortress. Built with Docusaurus.`,
      },
    }),
};

module.exports = config;
