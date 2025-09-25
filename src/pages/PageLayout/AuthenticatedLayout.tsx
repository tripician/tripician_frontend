import React from 'react';
import { Outlet } from 'react-router-dom';
import NavigationPannel from './CommonLayouts/NavigationPanel';

// Wraps all authenticated pages so NavigationPannel doesn't remount per route
const AuthenticatedLayout: React.FC = () => {
  return (
    <NavigationPannel>
      <Outlet />
    </NavigationPannel>
  );
};

export default AuthenticatedLayout;