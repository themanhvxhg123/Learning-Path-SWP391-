import { useState } from 'react';
import {
  Box,
  Collapse,
  IconButton,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { useNavigate } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import {
  getMaterialReviewDetailSummary,
  countMaterialsInPath,
  REVIEW_OUTLINE_TYPE_LABELS,
} from '@/features/mentor/utils/mentorCourseReviewUtils';
import { CREATE_CARD_SX, MUTED, TEXT } from './mentorCourseCreateStyles';
import MentorCardSectionTitle from './MentorCardSectionTitle';
import {
  CHAPTER_THEME,
  LESSON_THEME,
  MATERIAL_TYPE_THEME,
} from './mentorCourseContentStyles';

function MaterialOutlineRow({ material }) {
  const [expanded, setExpanded] = useState(false);
  const typeLabel = REVIEW_OUTLINE_TYPE_LABELS[material.MaterialType] ?? 'Học liệu';
  const title = String(material.Title ?? '').trim() || typeLabel;
  const detail = getMaterialReviewDetailSummary(material);
  const theme = MATERIAL_TYPE_THEME[material.MaterialType] ?? MATERIAL_TYPE_THEME.VIDEO;

  return (
    <Box
      sx={{
        borderRadius: '10px',
        border: `1px solid ${theme.border}`,
        bgcolor: theme.soft,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.65,
        }}
      >
        {detail && (
          <IconButton size="small" onClick={() => setExpanded((prev) => !prev)} sx={{ p: 0.25 }}>
            {expanded ? (
              <ExpandLessRoundedIcon sx={{ fontSize: 16, color: theme.color }} />
            ) : (
              <ExpandMoreRoundedIcon sx={{ fontSize: 16, color: theme.color }} />
            )}
          </IconButton>
        )}
        <Typography
          sx={{
            flex: 1,
            fontSize: 12.5,
            fontWeight: 600,
            color: TEXT,
            lineHeight: 1.45,
            minWidth: 0,
          }}
        >
          <Box component="span" sx={{ color: theme.color }}>
            {typeLabel}:
          </Box>{' '}
          {title}
        </Typography>
      </Box>
      {detail && (
        <Collapse in={expanded}>
          <Box sx={{ px: 1.25, pb: 0.85, pt: 0.1 }}>
            <Typography
              sx={{
                fontSize: 11.5,
                color: MUTED,
                lineHeight: 1.5,
                wordBreak: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {detail}
            </Typography>
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

function ChapterOutline({ path, pathIndex, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const nodes = path.nodes ?? [];
  const chapterTitle = path.PathName || `Chương ${pathIndex + 1}`;
  const materialCount = countMaterialsInPath(path);

  return (
    <Box
      sx={{
        borderRadius: '14px',
        border: '1px solid rgba(15,23,42,0.08)',
        overflow: 'hidden',
        bgcolor: 'rgba(15,23,42,0.02)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.25,
          py: 1,
          bgcolor: CHAPTER_THEME.bg,
          borderBottom: expanded ? `1px solid ${CHAPTER_THEME.border}` : 'none',
        }}
      >
        <IconButton size="small" onClick={() => setExpanded((prev) => !prev)} sx={{ p: 0.4 }}>
          {expanded ? (
            <ExpandLessRoundedIcon sx={{ fontSize: 20, color: CHAPTER_THEME.color }} />
          ) : (
            <ExpandMoreRoundedIcon sx={{ fontSize: 20, color: CHAPTER_THEME.color }} />
          )}
        </IconButton>
        <MenuBookRoundedIcon sx={{ fontSize: 18, color: CHAPTER_THEME.color }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1.4 }}>
            Chương {pathIndex + 1}: {chapterTitle}
          </Typography>
          <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.15 }}>
            {nodes.length} bài học · {materialCount} học liệu
          </Typography>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ px: 1.5, py: 1.25 }}>
          {path.Description && (
            <Typography sx={{ fontSize: 13, color: MUTED, mb: 1.25, lineHeight: 1.55 }}>
              {path.Description}
            </Typography>
          )}

          {nodes.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: MUTED }}>Chương này chưa có bài học</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {nodes.map((node, nodeIndex) => {
                const materials = node.materials ?? [];
                const lessonTitle = node.NodeName || `Bài ${nodeIndex + 1}`;

                return (
                  <Box
                    key={node.tempId}
                    sx={{
                      pl: 1.25,
                      py: 0.75,
                      borderLeft: `2px solid ${LESSON_THEME.border}`,
                      bgcolor: 'rgba(99,102,241,0.03)',
                      borderRadius: '0 10px 10px 0',
                    }}
                  >
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: TEXT, mb: 0.65 }}>
                      Bài {nodeIndex + 1}: {lessonTitle}
                    </Typography>
                    {materials.length === 0 ? (
                      <Typography sx={{ fontSize: 12.5, color: MUTED, fontStyle: 'italic' }}>
                        Chưa có học liệu
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.55 }}>
                        {materials.map((material) => (
                          <MaterialOutlineRow key={material.tempId} material={material} />
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

export default function MentorCourseContentReview({ paths = [] }) {
  const navigate = useNavigate();

  return (
    <Box sx={CREATE_CARD_SX}>
      <MentorCardSectionTitle
        title="Nội dung khóa học"
        action={
          <AppButton
            variant="outlined"
            startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/mentor/courses/create/content')}
            sx={{
              height: 34,
              borderRadius: '999px',
              fontSize: 12,
              fontWeight: 600,
              px: 1.5,
              flexShrink: 0,
            }}
          >
            Chỉnh sửa nội dung
          </AppButton>
        }
      />

      {paths.length === 0 ? (
        <Typography sx={{ fontSize: 14, color: MUTED }}>Chưa có chương nào.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {paths.map((path, pathIndex) => (
            <ChapterOutline
              key={path.tempId}
              path={path}
              pathIndex={pathIndex}
              defaultExpanded={pathIndex === 0}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
