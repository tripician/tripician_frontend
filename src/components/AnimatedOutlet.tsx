import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';
import { pageVariants, pageTransition } from '../utils/animations';

/**
 * AnimatedOutlet
 * Wraps the current route's outlet content in a Framer Motion AnimatePresence
 * so pages fade/slide smoothly when navigating between routes.
 */
const AnimatedOutlet: React.FC = () => {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        style={{ width: '100%', minHeight: '100%' }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedOutlet;
