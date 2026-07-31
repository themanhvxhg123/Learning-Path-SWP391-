import { useCallback, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { ContentFieldLabel } from './MentorContentSectionHeading';
import MentorTextMaterialEditor from './MentorTextMaterialEditor';
import {
  READING_SOURCE_COMPOSE,
  READING_SOURCE_UPLOAD,
} from '@/features/mentor/utils/mentorTestContentUtils';

const READING_PASSAGE_ID = 'reading-passage';

export default function MentorTestReadingSourceEditor({
  section,
  errors = {},
  disabled = false,
  questionBankMode = false,
  onChange,
  onRegisterControls,
}) {
  const composeFlushRef = useRef(null);

  useEffect(() => {
    if (questionBankMode) return;

    const hasUploadArtifacts =
      section.ReadingSourceType === READING_SOURCE_UPLOAD ||
      Boolean(section.FileName || section.MaterialUrl || section.File);

    if (!hasUploadArtifacts) return;

    onChange({
      ReadingSourceType: READING_SOURCE_COMPOSE,
      File: null,
      FileName: null,
      FileSize: null,
      MaterialUrl: '',
    });
  }, [
    questionBankMode,
    section.tempId,
    section.ReadingSourceType,
    section.FileName,
    section.MaterialUrl,
    section.File,
    onChange,
  ]);

  useEffect(() => {
    if (!onRegisterControls) return undefined;
    onRegisterControls({
      flush: () => composeFlushRef.current?.(),
      isBusy: () => false,
    });
    return () => onRegisterControls(null);
  }, [onRegisterControls]);

  const handleRegisterComposeFlush = useCallback((flush) => {
    composeFlushRef.current = flush;
    return () => {
      if (composeFlushRef.current === flush) composeFlushRef.current = null;
    };
  }, []);

  const contentError = errors.Description;
  const materialUrl = String(section.MaterialUrl ?? section.SourceUrl ?? '').trim();
  const hasRemoteReadingUrl = Boolean(materialUrl);
  const hasLocalContent = Boolean(String(section.Description ?? '').trim());
  const passageKey = section.tempId ?? section.SectionId ?? READING_PASSAGE_ID;

  return (
    <Box sx={{ mb: 1.5 }}>
      <ContentFieldLabel sx={{ mb: 0.75, fontSize: 12, fontWeight: 700, color: '#64748B' }}>
        Bài đọc
      </ContentFieldLabel>

      <MentorTextMaterialEditor
        material={{
          tempId: passageKey,
          Content: section.Description ?? '',
          MaterialUrl: materialUrl,
        }}
        errors={{ Content: contentError }}
        disabled={disabled}
        compact
        previewOnly={questionBankMode}
        defaultShowPreview={questionBankMode && hasRemoteReadingUrl}
        previewOnRemoteLoad={questionBankMode && hasRemoteReadingUrl && !hasLocalContent}
        onRegisterFlush={handleRegisterComposeFlush}
        onChange={(_, patch) =>
          onChange({
            ReadingSourceType: READING_SOURCE_COMPOSE,
            Description: patch.Content ?? '',
          })
        }
      />
    </Box>
  );
}
