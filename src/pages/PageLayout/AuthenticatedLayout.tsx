import React from 'react';
import NavigationPannel from './CommonLayouts/NavigationPanel';
import AnimatedOutlet from '../../components/AnimatedOutlet';

// Wraps all authenticated pages so NavigationPannel doesn't remount per route
const AuthenticatedLayout: React.FC = () => {
  return (
    <NavigationPannel>
      <AnimatedOutlet />
    </NavigationPannel>
  );
};

export default AuthenticatedLayout;