import React from 'react';
import IconButton from '@mui/material/IconButton';
import { motion } from 'framer-motion';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import LanguageIcon from "@mui/icons-material/Language";

interface SocialMedias {
    facebook : any
    twitter : any
    instagram : any
    website : any
}

const SocialMediaButtons : React.FC<SocialMedias> = ({ facebook, twitter, instagram, website}) => {
return (
<motion.div style={{display:"flex", justifyContent:"center" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}>
  <motion.div whileHover={{ scale: 1.15, rotate: 5 }} whileTap={{ scale: 0.9 }}>
  <IconButton
    color="primary"
    aria-label="Facebook"
    onClick={() => window.open(facebook? facebook:"www.facebook.com")}
  >
    <FacebookIcon />
  </IconButton>
  </motion.div>

  <motion.div whileHover={{ scale: 1.15, rotate: -5 }} whileTap={{ scale: 0.9 }}>
  <IconButton
    color="primary"
    aria-label="Twitter"
    onClick={() => window.open(twitter? twitter:"https://www.twitter.com")}
  >
    <TwitterIcon />
  </IconButton>
  </motion.div>

  <motion.div whileHover={{ scale: 1.15, rotate: 5 }} whileTap={{ scale: 0.9 }}>
  <IconButton
    color="primary"
    aria-label="Instagram"
    onClick={() => window.open(instagram? instagram:"https://www.instagram.com")}
  >
    <InstagramIcon />
  </IconButton>
  </motion.div>

  <motion.div whileHover={{ scale: 1.15, rotate: -5 }} whileTap={{ scale: 0.9 }}>
  <IconButton
    color="primary"
    aria-label="Website"
    onClick={() => window.open(website || "https://www.google.com", "_blank")}
  >
    <LanguageIcon />
  </IconButton>
  </motion.div>
</motion.div>
);
};

export default SocialMediaButtons;