import React from 'react';
import { Outlet } from 'react-router-dom';
import PageShell from './PageShell';

export default function Layout() {
  return (
    <PageShell>
      <Outlet />
    </PageShell>
  );
}
