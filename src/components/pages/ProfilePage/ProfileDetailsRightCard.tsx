import { Card, CardContent, Typography, Box, Divider } from "@mui/material";

type KV = { label: string; value?: string | number | null };

interface Props {
  rows: KV[];
  title?: string;
}

export default function ProfileDetailsRightCard({ rows, title = "Profile Details" }: Props) {
  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        <Box sx={{ display: "grid", rowGap: 1.25 }}>
          {rows
            .filter(r => r.value !== undefined && r.value !== null && String(r.value).trim() !== "")
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
    </Card>
  );
}
