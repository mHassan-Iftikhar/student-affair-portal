'use client';

import Layout from '../../components/Layout/Layout';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
