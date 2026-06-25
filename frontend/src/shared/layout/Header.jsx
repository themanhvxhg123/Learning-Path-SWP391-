import { useState, useRef, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  alpha,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "@/shared/ui/Logo";
import AppButton from "@/shared/ui/AppButton";
import SearchBox from "@/shared/ui/SearchBox";
import { toast } from "@/shared/ui/Toast";
import {
  buildCourseListSearchParams,
  parseCourseListParams,
} from "@/features/courses/utils/courseListParams";
import {
  buildMentorCourseListSearchParams,
  parseMentorCourseListParams,
} from "@/features/mentor/utils/mentorCourseListParams";
import { getPrimaryRoleLabel } from "@/features/auth/utils/authUtils";
import { useAuth } from '@/context/AuthContext';
import {
  AVATAR_UPDATED_EVENT,
  getStoredAvatarUrl,
} from '@/features/profile/utils/profileAvatarUtils';
const MENU_CLOSE_DELAY = 200;
const KEYWORD_DEBOUNCE_MS = 300;
const PROJECT_NAME = "S.T.A.R Learning Path";
const PRIMARY = "#0891B2";
const ITEM_TEXT = "#334155";
const MUTED = "#64748B";
const ERROR = "#DC2626";

const USER_MENU_ITEMS = [
  { key: "profile", label: "Hồ sơ cá nhân", icon: PersonOutlineRoundedIcon, path: "/profile" },
];

function getUserInitials(user) {
  const name = user?.fullName || user?.email || "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const menuItemSx = {
  minHeight: 44,
  borderRadius: "12px",
  px: 1.25,
  py: 0.75,
  gap: 1.25,
  color: ITEM_TEXT,
  transition: "background-color 0.18s ease, color 0.18s ease",
  "&:hover": {
    bgcolor: "rgba(8,145,178,0.06)",
    color: PRIMARY,
    "& .user-menu-icon": { color: PRIMARY },
  },
};

const logoutItemSx = {
  ...menuItemSx,
  color: ERROR,
  "& .user-menu-icon": { color: ERROR },
  "&:hover": {
    bgcolor: "rgba(220,38,38,0.08)",
    color: ERROR,
    "& .user-menu-icon": { color: ERROR },
  },
};

export default function Header({
  showUser = true,
  onLogout,
  logoHeight = 36,
  logoTo = "/home",
  profilePath = "/profile",
  showMyCoursesButton = true,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const closeTimer = useRef(null);
  const keywordDebounceRef = useRef(null);
  const userZoneRef = useRef(null);

  const isCoursePage = location.pathname === "/courses";
  const isMyCoursesPage = location.pathname === "/my-courses";
  const isMentorCoursesPage = location.pathname === "/mentor/courses";
  const isMentorQuestionBanksPage = location.pathname === "/mentor/question-banks";
  const isAdminAccountsPage = location.pathname === "/admin/accounts";
  const isAdminCategoriesPage = location.pathname === "/admin/categories";
  const isAdminLevelsPage = location.pathname === "/admin/levels";
  const isAdminNewsPage = location.pathname === "/admin/news";
  const isAdminCatalogPage = isAdminCategoriesPage || isAdminLevelsPage;
  const isMentorListSearchPage =
    isMentorCoursesPage ||
    isMentorQuestionBanksPage ||
    isAdminAccountsPage ||
    isAdminCatalogPage ||
    isAdminNewsPage;
  const isCourseListSearchPage = isCoursePage || isMyCoursesPage || isMentorListSearchPage;
  const [search, setSearch] = useState("");
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const userMenuOpen = Boolean(userMenuAnchor);

  useEffect(() => {
    if (isMentorListSearchPage) {
      setSearch(searchParams.get("q") || "");
    } else if (isCourseListSearchPage) {
      setSearch(searchParams.get("keyword") || "");
    }
  }, [isCourseListSearchPage, isMentorListSearchPage, searchParams]);

  useEffect(
    () => () => {
      if (keywordDebounceRef.current) {
        clearTimeout(keywordDebounceRef.current);
      }
    },
    []
  );

  // 1. LẤY USER VÀ HÀM LOGOUT TỪ KHO RA XÀI
  const { user, logout } = useAuth(); 

  // (Vẫn giữ logic Avatar của ông trong trường hợp ông có update lẻ avatar)
  const [avatarUrl, setAvatarUrl] = useState(() => getStoredAvatarUrl());

  useEffect(() => {
    setAvatarUrl(getStoredAvatarUrl());
  }, [user]);

  useEffect(() => {
    const handleAvatarUpdated = (event) => {
      setAvatarUrl(event.detail?.avatarUrl ?? getStoredAvatarUrl());
    };

    window.addEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdated);
    return () => window.removeEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdated);
  }, []);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openUserMenu = () => {
    clearCloseTimer();
    if (userZoneRef.current) setUserMenuAnchor(userZoneRef.current);
  };

  const scheduleCloseUserMenu = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      setUserMenuAnchor(null);
    }, MENU_CLOSE_DELAY);
  };

  const closeUserMenu = () => {
    clearCloseTimer();
    setUserMenuAnchor(null);
  };

  const handleGoProfile = () => {
    closeUserMenu();
    navigate(profilePath);
  };

  const handleProfileTriggerClick = (event) => {
    event.stopPropagation();
    if (isMobile) {
      toggleUserMenu();
      return;
    }
    handleGoProfile();
  };

  const handleUserZoneKeyDown = (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (isMobile) toggleUserMenu();
    else handleGoProfile();
  };

  const toggleUserMenu = () => {
    if (userMenuOpen) closeUserMenu();
    else openUserMenu();
  };

  // 2. HÀM LOGOUT: GỌI HÀM CỦA NHÀ KHO THAY VÌ TỰ XÓA STORAGE
  const handleLogout = () => {
    closeUserMenu();
    if (onLogout) {
      onLogout();
    } else {
      logout(); // Dùng hàm quét dọn của AuthContext
      toast.info("Đã đăng xuất thành công.");
      navigate("/login", { replace: true });
    }
  };

  const handleMenuNavigate = (item) => {
    if (item.disabled) return;
    if (item.path === "/profile") handleGoProfile();
    else {
      closeUserMenu();
      if (item.path) navigate(item.path);
    }
  };

  const displayName = user?.fullName || "Phúc Nguyễn";
  const displayEmail = user?.email || "";
  const displayRole = getPrimaryRoleLabel(user);

  const applyCourseKeyword = (value) => {
    const current = parseCourseListParams(searchParams);
    const next = buildCourseListSearchParams(
      { ...current, keyword: value.trim(), page: 1 },
      searchParams
    );
    setSearchParams(next, { replace: true });
  };

  const applyMentorCourseKeyword = (value) => {
    const current = parseMentorCourseListParams(searchParams);
    const next = buildMentorCourseListSearchParams(
      { ...current, q: value.trim(), page: 1 },
      searchParams,
    );
    setSearchParams(next, { replace: true });
  };

  const applySearchKeyword = (value) => {
    if (isMentorListSearchPage) applyMentorCourseKeyword(value);
    else applyCourseKeyword(value);
  };

  const handleSearchClear = () => {
    if (keywordDebounceRef.current) {
      clearTimeout(keywordDebounceRef.current);
    }
    setSearch("");
    if (isCourseListSearchPage) {
      applySearchKeyword("");
    }
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearch(value);

    if (!isCourseListSearchPage) return;

    if (keywordDebounceRef.current) {
      clearTimeout(keywordDebounceRef.current);
    }
    keywordDebounceRef.current = setTimeout(() => {
      applySearchKeyword(value);
    }, KEYWORD_DEBOUNCE_MS);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") return;

    if (keywordDebounceRef.current) {
      clearTimeout(keywordDebounceRef.current);
    }

    if (isCourseListSearchPage) {
      applySearchKeyword(search);
      return;
    }

    const trimmed = search.trim();
    if (trimmed) {
      navigate(`/courses?keyword=${encodeURIComponent(trimmed)}`);
    }
  };

  const userZoneHandlers = isMobile
    ? {}
    : {
        onMouseEnter: openUserMenu,
        onMouseLeave: scheduleCloseUserMenu,
      };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "#FFFFFF",
        color: "text.primary",
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        boxShadow: theme.ios18?.shadow?.sm,
      }}
    >
      <Toolbar sx={{ gap: 2, minHeight: { xs: 56, sm: 60 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            flexShrink: 0,
            minWidth: 0,
          }}
        >
          <Logo height={logoHeight} to={logoTo} />
          <Typography
            component="span"
            sx={{
              display: { xs: "none", sm: "block" },
              fontSize: { sm: 14, md: 15 },
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "text.primary",
              whiteSpace: "nowrap",
            }}
          >
            {PROJECT_NAME}
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            px: { xs: 0, sm: 2 },
            minWidth: 0,
          }}
        >
          <SearchBox
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onClear={handleSearchClear}
            showClear={isCourseListSearchPage}
            placeholder={
              isMentorQuestionBanksPage
                ? "Tìm khóa học trong ngân hàng câu hỏi..."
                : isMentorCoursesPage
                  ? "Tìm theo tên khóa học..."
                  : isAdminAccountsPage
                    ? "Tìm theo tên, email hoặc username..."
                    : isAdminCategoriesPage
                      ? "Tìm theo tên danh mục..."
                      : isAdminLevelsPage
                        ? "Tìm theo tên trình độ..."
                        : isAdminNewsPage
                          ? "Tìm theo tiêu đề, danh mục..."
                          : isMyCoursesPage
                          ? "Tìm trong khóa học của tôi..."
                          : isCoursePage
                            ? "Tìm khóa học..."
                            : "Tìm kiếm khóa học, lộ trình..."
            }
            sx={{ width: "100%", maxWidth: 480 }}
          />
        </Box>

        {showUser && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
            {user && showMyCoursesButton && (
              <Tooltip title="Khóa học của tôi">
                <Box
                  component="button"
                  type="button"
                  onClick={() => navigate("/my-courses")}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    py: 1,
                    px: isMobile ? 1 : 1.75,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    bgcolor: "rgba(8,145,178,0.08)",
                    color: "#0891B2",
                    borderRadius: "99px",
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    transition: "background-color 0.2s ease",
                    "&:hover": {
                      bgcolor: "rgba(8,145,178,0.14)",
                    },
                  }}
                >
                  <MenuBookOutlinedIcon sx={{ fontSize: 18 }} />
                  {!isMobile && "Khóa học của tôi"}
                </Box>
              </Tooltip>
            )}

            {user && (
              <IconButton
                aria-label="Thông báo"
                size="medium"
                sx={{
                  color: "text.secondary",
                  borderRadius: theme.ios18?.radius?.xs,
                  "&:hover": {
                    color: "primary.main",
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <NotificationsOutlinedIcon />
              </IconButton>
            )}

            {!user && (
              <AppButton
                onClick={() => navigate("/login")}
                sx={{
                  px: { xs: 2, sm: 2.5 },
                  py: 0.75,
                  fontSize: 13,
                  minWidth: 0,
                  whiteSpace: "nowrap",
                }}
              >
                Đăng nhập
              </AppButton>
            )}

            {user && (
              <Box {...userZoneHandlers} sx={{ position: "relative" }}>
                <Tooltip
                  title={isMobile ? "Menu tài khoản" : ""}
                  disableHoverListener={!isMobile || userMenuOpen}
                  disableFocusListener={!isMobile || userMenuOpen}
                  disableTouchListener={!isMobile}
                  enterDelay={400}
                  leaveDelay={0}
                >
                  <Box
                    ref={userZoneRef}
                    role="button"
                    tabIndex={0}
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                    aria-label={isMobile ? "Menu tài khoản" : "Xem hồ sơ cá nhân"}
                    onKeyDown={handleUserZoneKeyDown}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      py: 0.5,
                      px: 1,
                      borderRadius: theme.ios18?.radius?.xs,
                      transition: `background-color 0.2s ${theme.ios18?.transition}`,
                      "&:hover": {
                        bgcolor: alpha(theme.palette.primary.main, 0.06),
                      },
                    }}
                  >
                    {avatarUrl ? (
                      <Box
                        component="img"
                        src={avatarUrl}
                        alt="avatar"
                        onClick={handleProfileTriggerClick}
                        sx={{
                          width: 32,
                          height: 32,
                          objectFit: "cover",
                          borderRadius: "50%",
                          cursor: "pointer",
                        }}
                      />
                    ) : (
                      <Avatar
                        onClick={handleProfileTriggerClick}
                        sx={{
                          width: 32,
                          height: 32,
                          fontSize: 13,
                          fontWeight: 600,
                          bgcolor: "primary.main",
                          cursor: "pointer",
                        }}
                      >
                        {getUserInitials(user)}
                      </Avatar>
                    )}
                    <Typography
                      variant="body2"
                      onClick={handleProfileTriggerClick}
                      sx={{
                        fontWeight: 600,
                        maxWidth: { xs: 100, sm: 140 },
                        display: { xs: "none", sm: "block" },
                        cursor: "pointer",
                      }}
                      noWrap
                    >
                      {displayName}
                    </Typography>
                  </Box>
                </Tooltip>

                <Menu
                  anchorEl={userMenuAnchor}
                  open={userMenuOpen}
                  onClose={closeUserMenu}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  marginThreshold={12}
                  slotProps={{
                    paper: {
                      onMouseEnter: clearCloseTimer,
                      onMouseLeave: scheduleCloseUserMenu,
                      sx: {
                        width: 240,
                        mt: 0.75,
                        borderRadius: "16px",
                        bgcolor: "rgba(255,255,255,0.92)",
                        backdropFilter: "blur(16px) saturate(140%)",
                        WebkitBackdropFilter: "blur(16px) saturate(140%)",
                        border: "1px solid rgba(8,145,178,0.08)",
                        boxShadow: "0 12px 32px rgba(15,23,42,0.10)",
                        overflow: "hidden",
                      },
                    },
                    list: {
                      sx: { py: 1, px: 1 },
                    },
                  }}
                >
                  <Box
                    sx={{ px: 1.25, py: 1, mb: 0.5, cursor: "pointer" }}
                    onClick={handleGoProfile}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleGoProfile();
                      }
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      {avatarUrl ? (
                        <Box
                          component="img"
                          src={avatarUrl}
                          alt="avatar"
                          sx={{
                            width: 36,
                            height: 36,
                            objectFit: "cover",
                            borderRadius: "50%",
                          }}
                        />
                      ) : (
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            fontSize: 14,
                            fontWeight: 700,
                            bgcolor: PRIMARY,
                          }}
                        >
                          {getUserInitials(user)}
                        </Avatar>
                      )}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#0F172A",
                            lineHeight: 1.3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {displayName}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: MUTED,
                            lineHeight: 1.3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {displayEmail || displayRole}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 0.5, borderColor: "rgba(8,145,178,0.08)" }} />

                  {USER_MENU_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <MenuItem
                        key={item.key}
                        disabled={item.disabled}
                        onClick={() => handleMenuNavigate(item)}
                        sx={{
                          ...menuItemSx,
                          ...(item.disabled && { opacity: 0.45 }),
                        }}
                      >
                        <Icon className="user-menu-icon" sx={{ fontSize: 19, color: MUTED }} />
                        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{item.label}</Typography>
                      </MenuItem>
                    );
                  })}

                  <Divider sx={{ my: 0.75, borderColor: "rgba(8,145,178,0.08)" }} />

                  <MenuItem onClick={handleLogout} sx={logoutItemSx}>
                    <LogoutRoundedIcon className="user-menu-icon" sx={{ fontSize: 19 }} />
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Đăng xuất</Typography>
                  </MenuItem>
                </Menu>
              </Box>
            )}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
