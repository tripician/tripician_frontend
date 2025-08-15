import React from 'react';
import IconButton from '@mui/material/IconButton';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';

interface SocialMedias {
    facebook : any
    twitter : any
    instagram : any
}

const SocialMediaButtons : React.FC<SocialMedias> = ({ facebook, twitter, instagram}) => {
return (
<div style={{display:"flex", justifyContent:"center" }}>
  <IconButton
    color="primary"
    aria-label="Facebook"
    onClick={() => window.open(facebook? facebook:"www.facebook.com")}
  >
    <FacebookIcon />
  </IconButton>

  <IconButton
    color="primary"
    aria-label="Twitter"
    onClick={() => window.open(twitter? twitter:"https://www.twitter.com")}
  >
    <TwitterIcon />
  </IconButton>

  <IconButton
    color="primary"
    aria-label="Instagram"
    onClick={() => window.open(instagram? instagram:"https://www.instagram.com")}
  >
    <InstagramIcon />
  </IconButton>
</div>
);
};

export default SocialMediaButtons;