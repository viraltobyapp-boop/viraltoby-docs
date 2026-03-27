import React from 'react';
import Layout from '@theme-original/DocItem/Layout';
import type LayoutType from '@theme/DocItem/Layout';
import { useLocation } from '@docusaurus/router';
import ArchitectureGuard from '../../components/ArchitectureGuard';

type Props = React.ComponentProps<typeof LayoutType>;

export default function LayoutWrapper(props: Props): React.JSX.Element {
  const { pathname } = useLocation();

  if (pathname.startsWith('/architecture')) {
    return (
      <ArchitectureGuard>
        <Layout {...props} />
      </ArchitectureGuard>
    );
  }

  return <Layout {...props} />;
}
