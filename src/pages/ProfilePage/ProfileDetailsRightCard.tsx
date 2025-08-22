import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Divider, 
  Chip, 
  Avatar 
} from "@mui/material";
import { Person, Email, Phone, Public, Cake, Wc } from "@mui/icons-material";
import SocialMediaButtons from "../../components/CommonComponents/SocialMediaButtons";

type KV = { label: string; value?: string | number | null };

interface Props {
  rows: KV[];
  title?: string;
}

const getFieldIcon = (label: string) => {
  const iconProps = { sx: { fontSize: 18, color: "white" } };
  switch (label.toLowerCase()) {
    case "email": return <Email {...iconProps} />;
    case "phone": return <Phone {...iconProps} />;
    case "country": return <Public {...iconProps} />;
    case "date of birth": return <Cake {...iconProps} />;
    case "gender": return <Wc {...iconProps} />;
    case "full name": return <Person {...iconProps} />;
    default: return null;
  }
};

const getFieldColor = (label: string) => {
  switch (label.toLowerCase()) {
    case "email": return "#3b82f6"; // blue
    case "phone": return "#10b981"; // green
    case "country": return "#8b5cf6"; // purple
    case "date of birth": return "#f59e0b"; // amber
    case "gender": return "#ec4899"; // pink
    case "full name": return "#1f2937"; // gray-800
    default: return "#374151"; // gray-700
  }
};

const formatFieldValue = (label: string, value: string | number) => {
  switch (label.toLowerCase()) {
    case "email":
      return String(value).toLowerCase();
    case "phone":
      const phoneStr = String(value);
      if (phoneStr.match(/^\+?\d+$/)) {
        return phoneStr.replace(
          /(\+?\d{1,3})(\d{3})(\d{3})(\d{4})/,
          "$1 ($2) $3-$4"
        );
      }
      return phoneStr;
    case "gender":
      return (
        String(value).charAt(0).toUpperCase() +
        String(value).slice(1).toLowerCase()
      );
    case "country":
      return String(value).toUpperCase();
    default:
      return String(value);
  }
};

export default function ProfileDetailsRightCard({
  rows,
  title = "Profile Details",
}: Props) {
  const socialMediaFields = ["facebook", "twitter", "instagram", "website"];
  const filteredRows = rows.filter(
    (r) =>
      !socialMediaFields.includes(r.label.toLowerCase()) &&
      r.value !== undefined &&
      r.value !== null &&
      String(r.value).trim() !== ""
  );

  const socialMediaData = {
    facebook: rows.find((row) => row.label.toLowerCase() === "facebook")
      ?.value as string,
    twitter: rows.find((row) => row.label.toLowerCase() === "twitter")
      ?.value as string,
    instagram: rows.find((row) => row.label.toLowerCase() === "instagram")
      ?.value as string,
    website: rows.find((row) => row.label.toLowerCase() === "website")
      ?.value as string,
  };

  const hasSocialMedia = Object.values(socialMediaData).some(
    (value) => value && String(value).trim() !== ""
  );

  return (
    <Card
      sx={{
        height: "100%",
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        background: "linear-gradient(to bottom, #ffffff, #f9fafb)",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: "8px",
            backgroundColor: "#f3f4f6",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#111827",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Person sx={{ fontSize: 20, color: "#3b82f6" }} />
            {title}
          </Typography>
        </Box>

        {/* Profile Fields */}
        {filteredRows.length > 0 ? (
          <Box sx={{ display: "grid", gap: 2 }}>
            {filteredRows.map((row, idx) => {
              const icon = getFieldIcon(row.label);
              const formattedValue = formatFieldValue(row.label, row.value!);
              const fieldColor = getFieldColor(row.label);

              return (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 1.5,
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: fieldColor,
                      width: 28,
                      height: 28,
                      fontSize: "0.75rem",
                    }}
                  >
                    {icon}
                  </Avatar>

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#6b7280",
                        fontWeight: 500,
                        fontSize: "0.7rem",
                        textTransform: "uppercase",
                      }}
                    >
                      {row.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: fieldColor,
                        fontWeight:
                          row.label.toLowerCase() === "full name" ? 600 : 500,
                        fontSize: "0.9rem",
                      }}
                    >
                      {formattedValue}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
            <Person sx={{ fontSize: 42, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2" sx={{ fontStyle: "italic" }}>
              No profile details available
            </Typography>
          </Box>
        )}

        {/* Social Media Section */}
        {hasSocialMedia && (
          <Box
            sx={{
              mt: 4,
              pt: 3,
              borderTop: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              p: 2,
            }}
          >
            <SocialMediaButtons
              facebook={socialMediaData.facebook}
              twitter={socialMediaData.twitter}
              instagram={socialMediaData.instagram}
              website={socialMediaData.website}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
