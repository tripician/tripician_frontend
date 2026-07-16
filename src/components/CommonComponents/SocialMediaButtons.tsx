import React from 'react';
import IconButton from '@mui/material/IconButton';
import { motion } from 'framer-motion';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import LanguageIcon from '@mui/icons-material/Language';
import { safeExternalUrl } from '../../utils/sanitizeHtml';

interface SocialMedias {
  facebook: any;
  twitter: any;
  instagram: any;
  website: any;
}

/** Opens a user-provided link only when it resolves to a valid http(s) URL. */
const openSocial = (raw: unknown, fallback: string) => {
  const url = safeExternalUrl(raw) || fallback;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const SocialMediaButtons: React.FC<SocialMedias> = ({ facebook, twitter, instagram, website }) => {
  return (
    <motion.div
      style={{ display: 'flex', justifyContent: 'center' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <motion.div whileHover={{ scale: 1.15, rotate: 5 }} whileTap={{ scale: 0.9 }}>
        <IconButton color="primary" aria-label="Facebook" onClick={() => openSocial(facebook, 'https://www.facebook.com')}>
          <FacebookIcon />
        </IconButton>
      </motion.div>

      <motion.div whileHover={{ scale: 1.15, rotate: -5 }} whileTap={{ scale: 0.9 }}>
        <IconButton color="primary" aria-label="Twitter" onClick={() => openSocial(twitter, 'https://www.twitter.com')}>
          <TwitterIcon />
        </IconButton>
      </motion.div>

      <motion.div whileHover={{ scale: 1.15, rotate: 5 }} whileTap={{ scale: 0.9 }}>
        <IconButton color="primary" aria-label="Instagram" onClick={() => openSocial(instagram, 'https://www.instagram.com')}>
          <InstagramIcon />
        </IconButton>
      </motion.div>

      <motion.div whileHover={{ scale: 1.15, rotate: -5 }} whileTap={{ scale: 0.9 }}>
        <IconButton color="primary" aria-label="Website" onClick={() => openSocial(website, 'https://www.google.com')}>
          <LanguageIcon />
        </IconButton>
      </motion.div>
    </motion.div>
  );
};

export default SocialMediaButtons;
