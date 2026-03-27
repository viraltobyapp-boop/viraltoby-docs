import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'ViralToby Docs',
  tagline: 'Autonomous content creation, powered by AI',
  favicon: 'img/vt-logo.png',

  future: {
    v4: true,
  },

  url: 'https://docs.viraltoby.com',
  baseUrl: '/',

  organizationName: 'viraltobyapp-boop',
  projectName: 'viraltoby-docs',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/vt-logo.png',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'ViralToby',
      logo: {
        alt: 'ViralToby Logo',
        src: 'img/vt-logo.png',
      },
      items: [
        {
          href: 'https://viraltoby.com',
          label: 'Back to App',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Guides',
          items: [
            { label: 'Getting Started', to: '/guides/overview' },
            { label: 'Connecting Platforms', to: '/guides/connecting-platforms' },
            { label: 'Using Toby', to: '/guides/using-toby' },
          ],
        },
        {
          title: 'Resources',
          items: [
            { label: 'FAQ', href: 'https://viraltoby.com/faq' },
            { label: 'Contact', href: 'https://viraltoby.com/contact' },
          ],
        },
        {
          title: 'Links',
          items: [
            { label: 'ViralToby App', href: 'https://viraltoby.com' },
            { label: 'GitHub', href: 'https://github.com/viraltobyapp-boop' },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} ViralToby. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'python', 'json', 'typescript', 'sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
