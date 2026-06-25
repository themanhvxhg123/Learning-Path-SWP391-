import { Box, Divider, Link, Typography, useTheme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import Logo from "@/shared/ui/Logo";

const BG = "#111827";
const TITLE = "#F8FAFC";
const TEXT = "#E5E7EB";
const MUTED = "#94A3B8";
const LINK = "#CBD5E1";
const LINK_HOVER = "#22D3EE";
const BORDER = "rgba(255,255,255,0.08)";

const NAV_LINKS = [
  { label: "Trang chủ", to: "/home" },
  { label: "Khóa học", to: "/courses" },
  { label: "Tin tức", to: "/news" },
];

const SUPPORT_LINKS = [
  { label: "Về chúng tôi", href: "#" },
  { label: "Hỗ trợ", href: "#" },
  { label: "Điều khoản", href: "#" },
  { label: "Chính sách bảo mật", href: "#" },
];

const linkSx = {
  color: LINK,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.5,
  textDecoration: "none",
  transition: "color 0.18s ease",
  display: "inline-block",
  "&:hover": {
    color: LINK_HOVER,
    textDecoration: "none",
  },
};

const disabledLinkSx = {
  color: MUTED,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.5,
  opacity: 0.75,
};

function ColumnTitle({ children }) {
  return (
    <Typography
      component="h3"
      sx={{
        fontSize: 14,
        fontWeight: 700,
        color: TITLE,
        lineHeight: 1.4,
        mb: 1.5,
      }}
    >
      {children}
    </Typography>
  );
}

function FooterLinkList({ items, ariaLabel }) {
  return (
    <Box
      component="nav"
      aria-label={ariaLabel}
      sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}
    >
      {items.map((item) => {
        if (item.to) {
          return (
            <Link key={item.label} component={RouterLink} to={item.to} sx={linkSx}>
              {item.label}
            </Link>
          );
        }
        if (item.href) {
          return (
            <Link key={item.label} href={item.href} sx={linkSx}>
              {item.label}
            </Link>
          );
        }
        return (
          <Typography key={item.label} component="span" sx={disabledLinkSx}>
            {item.label}
            <Typography
              component="span"
              sx={{ ml: 0.75, fontSize: 11, fontWeight: 500, color: MUTED }}
            >
              (Đang cập nhật)
            </Typography>
          </Typography>
        );
      })}
    </Box>
  );
}

export default function Footer({
  brand = "S.T.A.R Learning Path",
  year = new Date().getFullYear(),
}) {
  const theme = useTheme();

  return (
    <Box
      id="app-site-footer"
      component="footer"
      sx={{
        width: "100%",
        position: "relative",
        ml: 0,
        flexShrink: 0,
        bgcolor: BG,
        borderTop: `1px solid ${BORDER}`,
        boxSizing: "border-box",
        zIndex: theme.zIndex.appBar,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1280,
          mx: "auto",
          boxSizing: "border-box",
          pt: { xs: 3, sm: 4, md: 5 },
          pb: { xs: 2.5, sm: 3 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "minmax(0, 1.5fr) repeat(3, minmax(0, 1fr))",
            },
            gap: { xs: 2.5, sm: 3, md: 4 },
          }}
        >
          {/* Brand */}
          <Box sx={{ minWidth: 0, gridColumn: { xs: "1 / -1", sm: "1 / -1", md: "auto" } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
              <Logo height={24} to="/home" />
              <Typography
                sx={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: TEXT,
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                }}
              >
                {brand}
              </Typography>
            </Box>
            <Typography
              sx={{
                color: MUTED,
                fontSize: 13,
                lineHeight: 1.6,
                maxWidth: 360,
                mb: 2,
              }}
            >
              Nền tảng học tiếng Anh theo lộ trình cá nhân hóa, giúp bạn theo dõi tiến độ và học
              tập hiệu quả hơn.
            </Typography>
           
          </Box>

          {/* Navigation */}
          <Box>
            <ColumnTitle>Liên kết</ColumnTitle>
            <FooterLinkList items={NAV_LINKS} ariaLabel="Liên kết điều hướng" />
          </Box>

          {/* Support */}
          <Box>
            <ColumnTitle>Hỗ trợ</ColumnTitle>
            <FooterLinkList items={SUPPORT_LINKS} ariaLabel="Liên kết hỗ trợ" />
          </Box>

          {/* Contact */}
          <Box>
            <ColumnTitle>Liên hệ</ColumnTitle>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <EmailOutlinedIcon sx={{ fontSize: 16, color: MUTED, mt: 0.25, flexShrink: 0 }} />
                <Box>
                  <Typography sx={{ color: MUTED, fontSize: 12, lineHeight: 1.4, mb: 0.25 }}>
                    Email hỗ trợ
                  </Typography>
                  <Typography sx={{ color: LINK, fontSize: 13, lineHeight: 1.5 }}>
                    Đang cập nhật
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <PhoneOutlinedIcon sx={{ fontSize: 16, color: MUTED, mt: 0.25, flexShrink: 0 }} />
                <Box>
                  <Typography sx={{ color: MUTED, fontSize: 12, lineHeight: 1.4, mb: 0.25 }}>
                    Hotline
                  </Typography>
                  <Typography sx={{ color: LINK, fontSize: 13, lineHeight: 1.5 }}>
                    Đang cập nhật
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: { xs: 2.5, sm: 3 }, borderColor: BORDER }} />

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 1,
            pt: 0.5,
          }}
        >
          <Typography sx={{ color: MUTED, fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>
            © {year} {brand}
          </Typography>
          <Typography
            sx={{
              color: MUTED,
              fontSize: 12,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            Made for English learners
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
