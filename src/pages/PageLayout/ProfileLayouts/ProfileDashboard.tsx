import React, { useState } from "react";
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Container,
} from "@mui/material";
// IMPORTANT: Use the default Grid import from @mui/material/Grid (classic API)
import Grid from "@mui/material/Grid";
import { styled } from "@mui/material/styles";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import ProfileLayoutNav from "./ProfileLayoutNav";

// Styled Components
const StyledCard = styled(Card)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  transition: "box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out",
  "&:hover": {
    boxShadow: theme.shadows[8],
    transform: "translateY(-2px)",
  },
}));

// Keep CardMedia default element and pass `image` prop to avoid TS issues
const StyledCardMedia = styled(CardMedia)({
  height: 200,
  transition: "transform 0.3s ease-in-out",
  "&:hover": {
    transform: "scale(1.05)",
  },
});

const EngagementButton = styled(IconButton)(({ theme }) => ({
  padding: theme.spacing(0.5),
  "& .MuiSvgIcon-root": {
    width: 16,
    height: 16,
  },
}));

// Types
interface Post {
  id: number;
  image: string;
  title: string;
  timeAgo: string;
  likes: number;
  comments: number;
}

// Mock Data
const posts: Post[] = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=450&fit=crop",
    title: "Sunrise over the Torres del Paine - what a morning!",
    timeAgo: "2 hours ago",
    likes: 89,
    comments: 23,
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=450&fit=crop",
    title: "Hidden waterfall in Costa Rica's cloud forest",
    timeAgo: "1 day ago",
    likes: 156,
    comments: 34,
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=450&fit=crop",
    title: "Street food adventure in Bangkok's Chinatown",
    timeAgo: "3 days ago",
    likes: 203,
    comments: 67,
  },
];

const tabs = ["Recent Posts", "Blog Articles", "Travel Map", "Statistics"] as const;

// TabPanel
type TabPanelProps = { children: React.ReactNode; value: number; index: number };

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  const isActive = value === index;
  return (
    <div
      role="tabpanel"
      hidden={!isActive}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
    >
      {isActive && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

// PostCard (Grid item)
const PostCard: React.FC<{ post: Post }> = ({ post }) => (
  <Grid>
    <StyledCard>
      {/* CardMedia with image prop keeps types happy when styled */}
      <StyledCardMedia image={post.image} title={post.title} />
      <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Typography
          variant="h6"
          component="h3"
          gutterBottom
          sx={{
            fontSize: "1rem",
            fontWeight: 600,
            lineHeight: 1.3,
            cursor: "pointer",
            "&:hover": { color: "primary.main" },
          }}
        >
          {post.title}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {post.timeAgo}
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: "auto",
          }}
        >
          <Box sx={{ display: "flex", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <EngagementButton
                size="small"
                sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                aria-label="like"
              >
                <Heart size={16} />
              </EngagementButton>
              <Typography variant="body2" color="text.secondary">
                {post.likes}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center" }}>
              <EngagementButton
                size="small"
                sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
                aria-label="comment"
              >
                <MessageCircle size={16} />
              </EngagementButton>
              <Typography variant="body2" color="text.secondary">
                {post.comments}
              </Typography>
            </Box>
          </Box>

          <EngagementButton
            size="small"
            sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
            aria-label="share"
          >
            <Share2 size={16} />
          </EngagementButton>
        </Box>
      </CardContent>
    </StyledCard>
  </Grid>
);

// Main Component
const ProfileDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  // Tabs in page body (optional, if ProfileLayoutNav also has tabs you can sync)
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ bgcolor: "grey.50", minHeight: "100vh" }}>
      {/* Top navigation. Ensure the onChange signature matches your component’s props */}
      <ProfileLayoutNav
        selectedSettingsMenuItem={tabs[activeTab] ?? ""}
        onChange={(value: string | number) => {
          // If your nav passes a label or index, normalize it to an index
          const index =
            typeof value === "number"
              ? value
              : Math.max(0, tabs.findIndex((t) => t === value));
          setActiveTab(index);
        }}
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>        

        {/* Panels */}
        {tabs.map((_, index) => (
          <TabPanel key={index} value={activeTab} index={index}>
            <Grid container spacing={3}>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </Grid>
          </TabPanel>
        ))}
      </Container>
    </Box>
  );
};

export default ProfileDashboard;
