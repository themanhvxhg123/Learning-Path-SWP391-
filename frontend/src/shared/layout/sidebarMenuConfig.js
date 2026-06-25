import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import NewspaperOutlinedIcon from "@mui/icons-material/NewspaperOutlined";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import { isStudent } from "@/features/auth/utils/authUtils";

export function isAdminAccountsActive(pathname) {
  return pathname === "/admin/accounts" || /^\/admin\/accounts\/\d+/.test(pathname);
}

export function isAdminCategoriesActive(pathname) {
  return pathname === "/admin/categories" || pathname.startsWith("/admin/categories/");
}

export function isAdminLevelsActive(pathname) {
  return pathname === "/admin/levels" || pathname.startsWith("/admin/levels/");
}

export function isAdminNewsActive(pathname) {
  return pathname === "/admin/news" || pathname.startsWith("/admin/news/");
}

export function isStudentNewsActive(pathname) {
  return pathname === "/news" || /^\/news\/\d+/.test(pathname);
}

export function isMentorQuestionBankActive(pathname) {
  return (
    pathname === "/mentor/question-banks" ||
    pathname.startsWith("/mentor/question-banks/") ||
    /^\/mentor\/courses\/\d+\/questions/.test(pathname)
  );
}

export function isMentorCoursesActive(pathname) {
  if (isMentorQuestionBankActive(pathname)) return false;
  return pathname === "/mentor/courses" || pathname.startsWith("/mentor/courses/");
}

export function getStudentMenuItems(user) {
  const student = isStudent(user);
  return [
    {
      id: "home",
      label: "Trang chủ",
      to: "/home",
      Icon: HomeOutlinedIcon,
      disabled: false,
      end: true,
    },
    {
      id: "courses",
      label: "Khóa học",
      to: "/courses",
      Icon: MenuBookOutlinedIcon,
      disabled: !student,
    },
    {
      id: 'news',
      label: 'Tin tức',
      to: '/news',
      Icon: NewspaperOutlinedIcon,
      disabled: !student,
      isActiveMatch: isStudentNewsActive,
    },
  ];
}

export function getMentorMenuItems() {
  return [
    {
      id: "mentor-courses",
      label: "Khóa học của tôi",
      to: "/mentor/courses",
      Icon: MenuBookRoundedIcon,
      disabled: false,
      isActiveMatch: isMentorCoursesActive,
    },
    {
      id: "mentor-question-banks",
      label: "Ngân hàng câu hỏi",
      to: "/mentor/question-banks",
      Icon: QuizOutlinedIcon,
      disabled: false,
      isActiveMatch: isMentorQuestionBankActive,
    },
    {
      id: "mentor-news",
      label: "Tin tức",
      to: "/mentor/news",
      Icon: ArticleRoundedIcon,
      disabled: false,
    },
    {
      id: "mentor-student-progress",
      label: "Tiến độ học viên",
      to: "/mentor/student-progress",
      Icon: InsightsRoundedIcon,
      disabled: false,
    },
  ];
}

export function getAdminMenuItems() {
  return [
    {
      id: "admin-accounts",
      label: "Tài khoản",
      to: "/admin/accounts",
      Icon: ManageAccountsOutlinedIcon,
      disabled: false,
      isActiveMatch: isAdminAccountsActive,
    },
    {
      id: "admin-categories",
      label: "Danh mục",
      to: "/admin/categories",
      Icon: CategoryOutlinedIcon,
      disabled: false,
      isActiveMatch: isAdminCategoriesActive,
    },
    {
      id: "admin-levels",
      label: "Trình độ",
      to: "/admin/levels",
      Icon: LayersOutlinedIcon,
      disabled: false,
      isActiveMatch: isAdminLevelsActive,
    },
    {
      id: "admin-news",
      label: "Tin tức",
      to: "/admin/news",
      Icon: NewspaperOutlinedIcon,
      disabled: false,
      isActiveMatch: isAdminNewsActive,
    },
  ];
}
