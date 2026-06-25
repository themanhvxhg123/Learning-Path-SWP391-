import { useState, useEffect, useMemo, useRef } from "react";
import {
  Avatar,
  Box,
  Breadcrumbs,
  Chip,
  InputBase,
  Link as MuiLink,
  Typography,
  alpha,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";

import AppButton from "@/shared/ui/AppButton";
import { toast } from "@/shared/ui/Toast";
import ChangePasswordDialog from "@/features/auth/components/ChangePasswordDialog";
import { underlineFieldSx as valueUnderlineSx } from "@/shared/ui/UnderlineFieldPopup";
import ProfileImageCropDialog from "@/shared/ProfileImageCropDialog";
import { fetchUserProfile, uploadUserAvatar } from "@/features/profile/services/profileService";
import {
  getStoredAvatarUrl,
  persistUserAvatar,
} from "@/features/profile/utils/profileAvatarUtils";

import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import DevicesOutlinedIcon from "@mui/icons-material/DevicesOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";


/* ─── Constants ─────────────────────────────────────────────────────────── */
const PRIMARY = "#0891B2";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const SUCCESS = "#16A34A";
const ACCENT = "#EA580C";
const DIVIDER = "rgba(8,145,178,0.08)";
const INITIAL_PROFILE = {
  name: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  role: "Học viên",
  joinedAt: "",
  currentLevel: "",
  goals: [],
  stats: {
    learning: 0,
    completed: 0,
    saved: 0,
    averageProgress: 0,
  },
};


/* ─── Small inline helpers ───────────────────────────────────────────────── */

/** Section card wrapper */
function SectionCard({ children, sx = {} }) {
  return (
    <Box
      sx={{
        bgcolor: "#fff",
        borderRadius: "16px",
        border: `1px solid ${DIVIDER}`,
        p: { xs: 2.5, md: 3 },
        mb: 2.5,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Section heading row */
function SectionHead({ title, icon: Icon, iconColor = PRIMARY, action }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        {Icon && <Icon sx={{ fontSize: 18, color: iconColor }} />}
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
          {title}
        </Typography>
      </Box>
      {action}
    </Box>
  );
}

const LEVEL_OPTIONS = ["Mới bắt đầu", "Cơ bản", "Trung cấp", "Nâng cao"];

function formatDateDisplay(value) {
  if (!value) return "—";
  if (value.includes("/")) return value;
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

/** Label/value info field — read or inline edit */
function InfoRow({
  icon: Icon,
  iconColor = MUTED,
  label,
  value,
  editing = false,
  name,
  onChange,
  inputType = "text",
  selectOptions = LEVEL_OPTIONS,
  readOnly = false,
  placeholder,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.25,
        py: 1.4,
      }}
    >
      <Icon sx={{ fontSize: 16, color: iconColor, flexShrink: 0, mt: 0.25 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 11, color: MUTED, fontWeight: 500, mb: 0.4, lineHeight: 1.2 }}>
          {label}
        </Typography>
        {editing && !readOnly ? (
          inputType === "select" ? (
            <InputBase
              name={name}
              value={value}
              onChange={onChange}
              fullWidth
              component="select"
              sx={{
                ...valueUnderlineSx,
                fontSize: 13.5,
                fontWeight: 600,
                color: TEXT,
                lineHeight: 1.4,
                "& select": {
                  p: 0,
                  font: "inherit",
                  color: "inherit",
                  background: "transparent",
                },
              }}
            >
              {selectOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </InputBase>
          ) : inputType === "date" ? (
            <InputBase
              name={name}
              value={value}
              onChange={onChange}
              type="date"
              fullWidth
              sx={{
                ...valueUnderlineSx,
                fontSize: 13.5,
                fontWeight: 600,
                color: TEXT,
                lineHeight: 1.4,
                "& .MuiInputBase-input": {
                  p: 0,
                  height: "auto",
                },
                "& input[type='date']::-webkit-calendar-picker-indicator": {
                  opacity: 0.55,
                  cursor: "pointer",
                },
              }}
            />
          ) : (
            <InputBase
              name={name}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              fullWidth
              sx={{
                ...valueUnderlineSx,
                fontSize: 13.5,
                fontWeight: 600,
                color: TEXT,
                lineHeight: 1.4,
                "& .MuiInputBase-input": {
                  p: 0,
                  height: "auto",
                },
                "& .MuiInputBase-input::placeholder": {
                  color: MUTED,
                  opacity: 0.7,
                },
              }}
            />
          )
        ) : (
          <Box sx={valueUnderlineSx}>
            <Typography
              sx={{
                fontSize: 13.5,
                color: readOnly && editing ? MUTED : TEXT,
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              {inputType === "date" ? formatDateDisplay(value) : value || "—"}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/** Learning stat row */
function StatRow({ icon: Icon, iconColor, label, value, last = false, children }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        py: 1.25,
        borderBottom: last ? "none" : `1px solid ${DIVIDER}`,
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: "10px",
          bgcolor: alpha(iconColor, 0.1),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 17, color: iconColor }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 500, lineHeight: 1.2 }}>
          {label}
        </Typography>
        {children ?? (
          <Typography sx={{ fontSize: 15, color: TEXT, fontWeight: 700, lineHeight: 1.4 }}>
            {value}
          </Typography>
        )}
      </Box>
    </Box>
  );
}


// ── Safe State Initialization Helpers ──
const getInitialUser = () => {
  try {
    const userRaw = localStorage.getItem("user");
    return userRaw ? JSON.parse(userRaw) : null;
  } catch (e) {
    return null;
  }
};

const getInitialAvatar = () => getStoredAvatarUrl();

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const location = useLocation();
  const isAdminShell = location.pathname.startsWith('/admin');
  const breadcrumbHome = isAdminShell
    ? { to: '/admin/accounts', label: 'Quản trị' }
    : { to: '/home', label: 'Trang chủ' };

  const currentUser = useMemo(() => getInitialUser(), []);

  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [editMode, setEditMode] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(getInitialAvatar);
  const [formData, setFormData] = useState({
    name: INITIAL_PROFILE.name,
    phone: INITIAL_PROFILE.phone,
    dateOfBirth: INITIAL_PROFILE.dateOfBirth,
    currentLevel: INITIAL_PROFILE.currentLevel,
  });

  useEffect(() => {
    // Safely parse inside the effect to avoid any dependency array tracking issues
    const cUser = getInitialUser();
    if (!cUser?.userId) return;

    const fetchProfile = async () => {
      try {
        const data = await fetchUserProfile();
        const p = data?.profile;
        if (data?.success && p) {
          if (p.avatarUrl) {
            const resolvedAvatar = persistUserAvatar(p.avatarUrl);
            setAvatarUrl(resolvedAvatar);
          }

          setProfile(prev => ({
            ...prev,
            name: data.profile.name || "",
            email: data.profile.email || "",
            phone: data.profile.phone || "",
            dateOfBirth: data.profile.dateOfBirth?.split("T")[0] || "",
            currentLevel: data.profile.currentLevel || "",
            joinedAt: data.profile.joinedAt ? new Date(data.profile.joinedAt).toLocaleDateString("vi-VN", { timeZone: "UTC" }) : "",
            stats: data.profile.stats || prev.stats,

            rawLearningGoal: data.profile.learningGoal || "",
            rawCategories: data.profile.categories || [],

            goals: [
              ...(data.profile.learningGoal ? [`Mục tiêu: ${data.profile.learningGoal}`] : []),
              ...(data.profile.categories ? data.profile.categories.map(c => c.displayName) : [])
            ],
          }));

          setFormData(prevForm => ({
            ...prevForm,
            name: p.name || prevForm.name,
            phone: p.phone || prevForm.phone,
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : prevForm.dateOfBirth,
          }));
        }
      } catch (err) {
        console.error("Lỗi khi tải hồ sơ:", err);
      }
    };
    fetchProfile();
  }, []);

  const initials = (profile?.name || "Người dùng")
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  const handleFormChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!currentUser?.userId) return;

    try {
      const response = await fetch("http://localhost:5000/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.userId
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth
        })
      });

      const data = await response.json();
      if (data.success) {
        setProfile((prev) => ({ ...prev, ...formData }));
        setEditMode(false);

        // Optional: Update session storage to reflect new name in Navbar
        const updatedUser = { ...currentUser, fullName: formData.name };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        // Force a small storage event to update Header if they listen to it, 
        // though normally context is better.
        window.dispatchEvent(new Event("storage"));
      } else {
        alert("Cập nhật thất bại: " + data.message);
      }
    } catch (err) {
      console.error("Lỗi cập nhật hồ sơ:", err);
      alert("Đã xảy ra lỗi khi cập nhật hồ sơ.");
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile.name,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth,
      currentLevel: profile.currentLevel,
    });
    setEditMode(false);
  };

  // ==========================================
  // LOGIC XỬ LÝ ẢNH ĐẠI DIỆN
  // ==========================================
  const fileInputRef = useRef(null);
  const [tempImageSrc, setTempImageSrc] = useState(null);
  const handleAvatarClick = () => {
    setCropperOpen(true);
  };

  /**
   * HAm: handleAvatarSelected
   * TAc dng: B_t file t th input vA chuyn thAnh URL tm ` `a vAo khung c_t
   */
  const handleAvatarSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh hợp lệ.');
      return;
    }

    setTempImageSrc(URL.createObjectURL(file));
    setCropperOpen(true);
  };

  const mergeAvatarWithFrame = (faceBase64, frameUrl) => {
    return new Promise((resolve, reject) => {
      const FRAME_SIZE = 500;
      const FACE_SIZE = 380;
      const FACE_X = (FRAME_SIZE - FACE_SIZE) / 2;
      const FACE_Y = (FRAME_SIZE - FACE_SIZE) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = FRAME_SIZE;
      canvas.height = FRAME_SIZE;
      const ctx = canvas.getContext('2d');
      const faceImg = new Image();
      faceImg.crossOrigin = 'Anonymous';
      faceImg.src = faceBase64;

      faceImg.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(
          FACE_X + FACE_SIZE / 2,
          FACE_Y + FACE_SIZE / 2,
          FACE_SIZE / 2,
          0,
          Math.PI * 2,
        );
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(faceImg, FACE_X, FACE_Y, FACE_SIZE, FACE_SIZE);
        ctx.restore();

        const frameImg = new Image();
        frameImg.crossOrigin = 'Anonymous';
        frameImg.src = frameUrl;
        frameImg.onload = () => {
          ctx.drawImage(frameImg, 0, 0, FRAME_SIZE, FRAME_SIZE);
          resolve(canvas.toDataURL('image/png'));
        };
        frameImg.onerror = () => reject('Lỗi tải Khung');
      };
      faceImg.onerror = () => reject('Lỗi tải Mặt');
    });
  };

  const handleAvatarUpload = async ({ faceBase64, frameUrl }) => {
    if (!currentUser?.userId) {
      toast.error('Vui lòng đăng nhập lại để cập nhật ảnh đại diện.');
      return;
    }

    try {
      localStorage.setItem('rawAvatar', faceBase64);
      localStorage.setItem('rawFrame', frameUrl || '');

      const mergedBase64 = frameUrl ? await mergeAvatarWithFrame(faceBase64, frameUrl) : faceBase64;
      const res = await fetch(mergedBase64);
      const blob = await res.blob();
      const data = await uploadUserAvatar(blob);

      if (!data.success) {
        toast.error(data.message ?? 'Không thể cập nhật ảnh đại diện');
        return;
      }

      const finalUrl = persistUserAvatar(data.avatarUrl);
      setAvatarUrl(finalUrl);
      setProfile((prev) => ({ ...prev, avatarUrl: finalUrl }));
      toast.success('Đã cập nhật ảnh đại diện');

      setCropperOpen(false);
      if (tempImageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(tempImageSrc);
      }
      setTempImageSrc(null);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Tải ảnh thất bại');
    }
  };

  // ==========================================
  // STATE: CẬP NHẬT MỤC TIÊU VÀ LĨNH VỰC
  // ==========================================
  const [openGoals, setOpenGoals] = useState(false);
  const [allCats, setAllCats] = useState([]);
  const [goalInput, setGoalInput] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  // ==========================================
  // HÀM: MỞ POPUP VÀ TẢI DANH MỤC TỪ API
  // Tác dụng: Lấy list categories và gán dữ liệu cũ vào Form
  // ==========================================
  const handleOpenPopup = async () => {
    // Lấy danh sách Categories từ API
    const res = await fetch("http://localhost:5000/api/categories");
    const data = await res.json();
    setAllCats(data.data);
    // Đổ dữ liệu cũ vào form
    setGoalInput(profile.rawLearningGoal || "");
    setSelectedCats(profile.rawCategories ? profile.rawCategories.map(c => c.categoryId) : []);
    setOpenGoals(true);
  };
  // ==========================================
  // HÀM: LƯU MỤC TIÊU VÀ ĐÓNG POPUP
  // Tác dụng: Đẩy dữ liệu xuống Backend và tự động F5
  // ==========================================
  const saveGoals = async () => {
    await fetch("http://localhost:5000/api/users/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-user-id": currentUser.userId },
      body: JSON.stringify({ learningGoal: goalInput, categoryIds: selectedCats })
    });
    window.location.reload(); // Lưu xong thì tự F5 trang cho mới
  };


  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      {/* ── Breadcrumb ── */}
      <Breadcrumbs
        separator="/"
        sx={{ mb: 2.5, "& .MuiBreadcrumbs-separator": { color: MUTED, mx: 0.5 } }}
      >
        <MuiLink
          component={Link}
          to={breadcrumbHome.to}
          underline="none"
          sx={{
            fontSize: 13,
            color: MUTED,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 0.4,
            "&:hover": { color: PRIMARY },
          }}
        >
          <HomeOutlinedIcon sx={{ fontSize: 14 }} />
          {breadcrumbHome.label}
        </MuiLink>
        <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
          Hồ sơ cá nhân
        </Typography>
      </Breadcrumbs>

      {/* ── Profile Header ── */}
      <Box
        sx={{
          bgcolor: alpha(PRIMARY, 0.02),
          border: `1px solid ${DIVIDER}`,
          borderRadius: "20px",
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: { xs: 2, md: 3 },
        }}
      >
        {/* Avatar */}
        <Tooltip title="Đổi ảnh đại diện" placement="bottom">
          <Box
            onClick={handleAvatarClick}
            sx={{
              position: "relative",
              width: { xs: 72, md: 88 },
              height: { xs: 72, md: 88 },
              flexShrink: 0,
              cursor: "pointer",
              borderRadius: "50%",
              overflow: "hidden",
              "&:hover .avatar-cam-overlay": { opacity: 1 },
            }}
          >
            {avatarUrl ? (
              <Box
                component="img"
                src={avatarUrl}
                alt="avatar"
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            ) : (
              <Avatar
                sx={{
                  width: "100%",
                  height: "100%",
                  bgcolor: PRIMARY,
                  fontSize: { xs: 26, md: 32 },
                  fontWeight: 700,
                  boxShadow: `0 4px 16px ${alpha(PRIMARY, 0.28)}`,
                  letterSpacing: 1,
                }}
              >
                {initials}
              </Avatar>
            )}
            {/* Camera hover overlay */}
            <Box
              className="avatar-cam-overlay"
              sx={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                bgcolor: "rgba(8,145,178,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0,
                transition: "opacity 0.2s",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M12 15.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4zm7-12H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V6.2A3 3 0 0 0 19 3.2z" />
              </svg>
            </Box>
          </Box>
        </Tooltip>

        {/* Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Typography
              sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 700, color: TEXT, lineHeight: 1.2 }}
            >
              {profile.name}
            </Typography>
            <Chip
              label={profile.role}
              size="small"
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: alpha(PRIMARY, 0.1),
                color: PRIMARY,
                borderRadius: "99px",
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 13.5, color: MUTED, mb: 0.75 }}>
            {profile.email}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: MUTED }} />
            <Typography sx={{ fontSize: 12, color: MUTED }}>
              Tham gia từ {profile.joinedAt}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── 2-column layout ── */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: 3,
          alignItems: "flex-start",
        }}
      >
        {/* ── Left column ── */}
        <Box sx={{ flex: "1 1 65%", minWidth: 0, width: "100%" }}>
          {/* Thông tin cá nhân */}
          <SectionCard>
            <SectionHead
              title="Thông tin cá nhân"
              icon={PersonRoundedIcon}
              iconColor="#2563EB"
              action={
                editMode ? (
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    <AppButton
                      size="small"
                      variant="contained"
                      startIcon={<CheckRoundedIcon />}
                      onClick={handleSave}
                      sx={{ fontSize: 12, height: 28, px: 1.25, minWidth: "auto" }}
                    >
                      Lưu
                    </AppButton>
                    <AppButton
                      size="small"
                      variant="outlined"
                      onClick={handleCancel}
                      sx={{ fontSize: 12, height: 28, px: 1.25, minWidth: "auto" }}
                    >
                      Hủy
                    </AppButton>
                  </Box>
                ) : (
                  <AppButton
                    size="small"
                    variant="text"
                    onClick={() => setEditMode(true)}
                    sx={{ fontSize: 12, px: 1, minWidth: "auto", height: 28 }}
                  >
                    Chỉnh sửa
                  </AppButton>
                )
              }
            />

            <Box>
              <InfoRow
                icon={PersonRoundedIcon}
                iconColor="#2563EB"
                label="Họ và tên"
                value={editMode ? formData.name : profile.name}
                editing={editMode}
                name="name"
                onChange={handleFormChange}
              />
              <InfoRow
                icon={EmailOutlinedIcon}
                iconColor={PRIMARY}
                label="Email"
                value={profile.email}
                editing={editMode}
                readOnly
              />
              <InfoRow
                icon={PhoneOutlinedIcon}
                iconColor="#16A34A"
                label="Số điện thoại"
                value={editMode ? formData.phone : profile.phone}
                editing={editMode}
                name="phone"
                onChange={handleFormChange}
              />
              <InfoRow
                icon={CakeOutlinedIcon}
                iconColor={ACCENT}
                label="Ngày sinh"
                value={editMode ? formData.dateOfBirth : profile.dateOfBirth}
                editing={editMode}
                name="dateOfBirth"
                onChange={handleFormChange}
                inputType="date"
              />
            </Box>
          </SectionCard>

          {/* Mục tiêu học tập */}
          <SectionCard>
            <SectionHead
              title="Mục tiêu học tập"
              icon={RocketLaunchIcon}
              iconColor={ACCENT}
              action={
                <AppButton
                  size="small"
                  variant="text"
                  onClick={handleOpenPopup}
                  sx={{ fontSize: 12, px: 1, minWidth: "auto", height: 28 }}
                >
                  Cập nhật
                </AppButton>
              }
            />
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.875 }}>
              {profile?.goals?.map((goal) => (
                <Chip
                  key={goal}
                  icon={<AutoAwesomeIcon sx={{ fontSize: "14px !important", color: `${ACCENT} !important` }} />}
                  label={goal}
                  size="small"
                  sx={{
                    height: 28,
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: "99px",
                    bgcolor: alpha(ACCENT, 0.06),
                    border: `1px solid ${alpha(ACCENT, 0.18)}`,
                    color: TEXT,
                  }}
                />
              ))}
              <Chip
                label="+ Thêm mục tiêu"
                onClick={handleOpenPopup}
                size="small"
                sx={{
                  height: 28,
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: "99px",
                  bgcolor: "transparent",
                  border: `1px dashed ${alpha(MUTED, 0.4)}`,
                  color: MUTED,
                  cursor: "pointer",
                  "&:hover": { borderColor: PRIMARY, color: PRIMARY },
                  transition: "border-color 0.2s, color 0.2s",

                }}
              />
            </Box>
          </SectionCard>
        </Box>

        {/* ── Right column ── */}
        <Box sx={{ flex: "0 0 35%", width: "100%", maxWidth: { lg: 420 } }}>
          <Box sx={{ position: { lg: "sticky" }, top: 84 }}>

            {/* Tổng quan học tập */}
            <SectionCard>
              <SectionHead
                title="Tổng quan học tập"
                icon={MenuBookOutlinedIcon}
                iconColor={PRIMARY}
              />
              <StatRow
                icon={MenuBookOutlinedIcon}
                iconColor={PRIMARY}
                label="Khóa đang học"
                value={`${profile?.stats?.learning || 0} khóa`}
              />
              <StatRow
                icon={CheckCircleRoundedIcon}
                iconColor={SUCCESS}
                label="Khóa hoàn thành"
                value={`${profile?.stats?.completed || 0} khóa`}
                last
              />
            </SectionCard>

            {/* Cài đặt tài khoản */}
            <SectionCard>
              <SectionHead
                title="Cài đặt tài khoản"
                icon={LockOutlinedIcon}
                iconColor={MUTED}
              />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  py: 0.75,
                }}
              >
                <LockOutlinedIcon sx={{ fontSize: 17, color: MUTED }} />
                <Typography sx={{ flex: 1, fontSize: 13, color: TEXT, fontWeight: 600 }}>
                  Đổi mật khẩu
                </Typography>
                <AppButton
                  size="small"
                  variant="outlined"
                  onClick={() => setPasswordDialogOpen(true)}
                  sx={{ fontSize: 11, height: 28, px: 1.5, minWidth: "auto" }}
                >
                  Thay đổi
                </AppButton>
              </Box>
            </SectionCard>


          </Box>
        </Box>
      </Box>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />
      {/* ── Thẻ ẩn nhận File ── */}
      <input
        type="file"
        accept="image/*"
        hidden
        ref={fileInputRef}
        onChange={handleAvatarSelected}
      />
      {/* 🚀 Popup cắt ảnh chuẩn form Mentor 🚀 */}
      <ProfileImageCropDialog
        open={cropperOpen}
        imageSrc={tempImageSrc || localStorage.getItem('rawAvatar') || ''}
        initialFrame={localStorage.getItem('rawFrame') || ''}
        onClose={() => {
          setCropperOpen(false);
          if (tempImageSrc?.startsWith('blob:')) {
            URL.revokeObjectURL(tempImageSrc);
          }
          setTempImageSrc(null);
        }}
        onSave={handleAvatarUpload}
      />
      <Dialog open={openGoals} onClose={() => setOpenGoals(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: TEXT }}>
          Cập nhật Mục tiêu & Lĩnh vực
        </DialogTitle>

        <DialogContent dividers>
          <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1, color: TEXT }}>
            Mục tiêu học tập
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Ví dụ: Lấy bằng giỏi, Tìm việc làm..."
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1, color: TEXT }}>
            Lĩnh vực quan tâm
          </Typography>
          <FormGroup sx={{ flexDirection: 'row', gap: 1 }}>
            {allCats.map((cat) => (
              <FormControlLabel
                key={cat.categoryId}
                control={
                  <Checkbox
                    size="small"
                    checked={selectedCats.includes(cat.categoryId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCats([...selectedCats, cat.categoryId]); // Thêm vào mảng
                      } else {
                        setSelectedCats(selectedCats.filter(id => id !== cat.categoryId)); // Rút khỏi mảng
                      }
                    }}
                  />
                }
                label={<Typography sx={{ fontSize: 14 }}>{cat.displayName}</Typography>}
                sx={{ width: '45%', m: 0 }}
              />
            ))}
          </FormGroup>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <AppButton variant="outlined" onClick={() => setOpenGoals(false)}>Hủy</AppButton>
          <AppButton variant="contained" onClick={saveGoals}>Lưu</AppButton>
        </DialogActions>
      </Dialog>
    </Box>

  );
}
