import { Card, CardContent, Typography, Box, Divider } from "@mui/material";
import SocialMediaButtons from "../PageLayout/CommonComponents/SocialMediaButtons";

type KV = { label: string; value?: string | number | null };

interface Props {
  rows: KV[];
  title?: string;
}

export default function ProfileDetailsRightCard({ rows, title = "Profile Details" }: Props) {
  return (
    <Card sx={{ borderRadius: 2 , fontFamily: "Roboto"}}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1.5 , fontWeight: "Bold"}}>
          {title}
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        <Box sx={{ display: "grid", rowGap: 1.25 }}>
          {rows
            .filter(r => r.label !== "facebook" && r.label !== "twitter" &&  r.label !== "instagram" &&  r.label !== "website" &&  r.value !== undefined && r.value !== null && String(r.value).trim() !== "")
            .map((r, idx) => (
              <Box key={idx}>
                <Typography variant="caption" color="text.secondary">
                  {r.label}
                </Typography>
                <Typography variant="body2">{r.value as any}</Typography>
              </Box>
            ))}            
        </Box>        
      </CardContent>
      
      <SocialMediaButtons
        facebook = {rows.find(row => row.label === "facebook")?.value}
        twitter = {rows.find(row => row.label === "twitter")?.value}
        instagram = {rows.find(row => row.label === "instagram")?.value}
        website = {rows.find(row => row.label === "website")?.value}
      />
    </Card>
  );
}
