import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';
import ErrorPageLayout from './ErrorPageLayout';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ConstructionIcon from '@mui/icons-material/Construction';
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { useNavigate } from 'react-router-dom';
import { staggerContainer, staggerItem, popIn } from '../../utils/animations';

interface BaseProps { title: string; subtitle: string; icon: React.ReactNode; actionLabel?: string; onAction?: ()=>void; }

const ErrorShell: React.FC<BaseProps> = ({ title, subtitle, icon, actionLabel='Go Home', onAction }) => {
  const navigate = useNavigate();
  return (
    <ErrorPageLayout>
      <motion.div
        variants={staggerContainer(0.15, 0.1)}
        initial="hidden"
        animate="visible"
        style={{ textAlign: 'center', maxWidth: 520 }}
      >
        <motion.div variants={popIn}>
          <Box sx={{ mb:2, display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</Box>
        </motion.div>
        <motion.div variants={staggerItem}>
          <Typography variant='h3' fontWeight={700} gutterBottom>{title}</Typography>
        </motion.div>
        <motion.div variants={staggerItem}>
          <Typography variant='body1' sx={{ opacity:.7, mb:3 }}>{subtitle}</Typography>
        </motion.div>
        <motion.div variants={staggerItem}>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Button variant='contained' onClick={()=> onAction? onAction(): navigate('/') } sx={{ borderRadius:2, textTransform:'none', px:3 }}>{actionLabel}</Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </ErrorPageLayout>
  );
};

export const NotFound404: React.FC = () => (
  <ErrorShell
    title='404 - Not Found'
    subtitle="We couldn't find the page you were looking for. It may have been moved or removed."
    icon={<TravelExploreIcon sx={{ fontSize:96, color:'primary.main' }} />}
  />
);

export const InternalError500: React.FC = () => (
  <ErrorShell
    title='500 - Server Error'
    subtitle='Something broke on our side. The team has been notified. Please try again later.'
    icon={<ReportGmailerrorredIcon sx={{ fontSize:96, color:'error.main' }} />}
  />
);

export const UnauthorizedAccess: React.FC = () => (
  <ErrorShell
    title='Unauthorized'
    subtitle='You do not have permission to view this resource. Please sign in with proper access.'
    icon={<LockOutlinedIcon sx={{ fontSize:96, color:'warning.main' }} />}
    actionLabel='Sign In'
    onAction={()=> window.location.href='/signin'}
  />
);

export const UnderConstruction: React.FC = () => (
  <ErrorShell
    title='Page Under Construction'
    subtitle='We are working hard to finish this page. Check back soon for updates!'
    icon={<ConstructionIcon sx={{ fontSize:96, color:'info.main' }} />}
  />
);

export const SomethingWentWrong: React.FC = () => (
  <ErrorShell
    title='Oops - Something Went Wrong'
    subtitle='An unexpected problem occurred. You can refresh the page or return home.'
    icon={<SentimentDissatisfiedIcon sx={{ fontSize:96, color:'secondary.main' }} />}
  />
);

// Generic router-driven component that picks which error to render via prop/code
export const DynamicErrorPage: React.FC<{ code?: string }> = ({ code }) => {
  switch(code){
    case '404': return <NotFound404 />;
    case '401': return <UnauthorizedAccess />;
    case '500': return <InternalError500 />;
    case 'under-construction': return <UnderConstruction />;
    default: return <SomethingWentWrong />;
  }
};

export default DynamicErrorPage;
