import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  guidesSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'guides/overview',
        'guides/setting-up-brands',
        'guides/connecting-platforms',
      ],
    },
    {
      type: 'category',
      label: 'Content',
      collapsed: false,
      items: [
        'guides/content-dna',
        'guides/creating-content',
        'guides/pipeline-approval',
      ],
    },
    {
      type: 'category',
      label: 'Automation & Insights',
      collapsed: false,
      items: [
        'guides/using-toby',
        'guides/analytics',
        'guides/billing',
        'guides/support',
      ],
    },
  ],
  architectureSidebar: [
    {
      type: 'category',
      label: 'System',
      collapsed: false,
      items: [
        'architecture/system-overview',
        'architecture/api-reference',
        'architecture/database-schema',
      ],
    },
    {
      type: 'category',
      label: 'AI & Content',
      collapsed: false,
      items: [
        'architecture/toby-agent-system',
        'architecture/content-pipeline',
        'architecture/media-rendering',
      ],
    },
    {
      type: 'category',
      label: 'Platform & Billing',
      collapsed: false,
      items: [
        'architecture/platform-publishing',
        'architecture/oauth-flows',
        'architecture/billing-system',
        'architecture/analytics-system',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      collapsed: false,
      items: [
        'architecture/local-development',
        'architecture/deployment',
        'architecture/admin-system',
      ],
    },
  ],
};

export default sidebars;
