import React from 'react';
import { Box, Typography, Button, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import TopBar from '../PageLayout/CommonLayouts/TopBar';
import { fadeInUp, staggerContainer, staggerItem, scaleIn } from '../../utils/animations';

const Community: React.FC = () => {

  return (
      <Box sx={{ width: '100%', minHeight:'100vh', display:'flex', flexDirection:'column', background:(t)=> t.palette.mode==='dark'? '#0f141a':'#f4f7fa' }}>
        <TopBar />
        <Box sx={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', p:3 }}>
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
          >
          <Box sx={(t)=>({
            position:'relative',
            width:'100%',
            maxWidth:680,
            px:{ xs:3, md:6 },
            py:{ xs:5, md:7 },
            textAlign:'center',
            borderRadius:4,
            background: t.palette.mode==='dark'
              ? 'linear-gradient(135deg, #13202b 0%, #1d2d3a 60%, #233647 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f2f6f9 60%, #e6eef5 100%)',
            boxShadow: t.palette.mode==='dark'
              ? '0 4px 18px -2px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.4)'
              : '0 8px 28px -4px rgba(16,43,71,0.15), 0 2px 6px rgba(16,43,71,0.08)'
          })}>
            <Box sx={{
              position:'absolute', inset:0, pointerEvents:'none', borderRadius:4,
              background:(t)=> `radial-gradient(circle at 30% 25%, ${alpha(t.palette.primary.main,0.18)} 0%, transparent 55%),
                                 radial-gradient(circle at 70% 75%, ${alpha(t.palette.secondary.main,0.20)} 0%, transparent 60%)`
            }} />
            <motion.div variants={staggerContainer(0.12, 0.2)} initial="hidden" animate="visible">
              <motion.div variants={staggerItem}>
                <Typography variant='overline' sx={{ letterSpacing:2, fontWeight:700, opacity:.8 }}>FEATURE MODULE</Typography>
              </motion.div>
              <motion.div variants={staggerItem}>
                <Typography variant='h3' fontWeight={800} sx={{ mt:1, mb:2, background:(t)=> `linear-gradient(90deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`, WebkitBackgroundClip:'text', color:'transparent' }}>Community Coming Soon</Typography>
              </motion.div>
              <motion.div variants={staggerItem}>
                <Typography variant='body1' sx={{ maxWidth:520, mx:'auto', opacity:.8, lineHeight:1.55 }}>
                  We are crafting a collaborative space where travelers can share stories, form groups, exchange tips, and build meaningful journey companions.
                  The feature is in active development. Stay tuned – your adventures will have a home here soon.
                </Typography>
              </motion.div>
              <motion.div variants={staggerItem}>
                <Box sx={{ mt:4, display:'flex', flexDirection:{ xs:'column', sm:'row' }, gap:2, justifyContent:'center' }}>
                  <Button variant='contained' disabled sx={{ px:4, py:1.2, borderRadius:3, fontWeight:600 }}>Explore Communities</Button>
                  <Button variant='outlined' onClick={()=> window.location.href='/home'} sx={{ px:4, py:1.2, borderRadius:3, fontWeight:600 }}>Back to Home</Button>
                </Box>
              </motion.div>
              <motion.div variants={staggerItem}>
                <Typography variant='caption' sx={{ display:'block', mt:5, opacity:.55 }}>Alpha placeholder • Access temporarily locked</Typography>
              </motion.div>
            </motion.div>
          </Box>
          </motion.div>
        </Box>
      </Box>
  );
};

export default Community;
