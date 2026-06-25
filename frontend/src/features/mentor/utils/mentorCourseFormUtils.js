import { isValidThumbnailValue, validateThumbnailDataUrl } from './mentorCourseImageUtils';

//Max char user can input in course's description
export const MENTOR_COURSE_DESCRIPTION_MAX = 250;
export const MENTOR_COURSE_NAME_MAX = 250;


// FORM INITTIAL
export const MENTOR_COURSE_FORM_INITIAL = {
  CourseName: '',
  Description: '',
  CategoryId: '',
  LevelId: '',
  Thumbnail: '',
  IsPublished: false,
};

export function isMentorCourseFormDirty(form) {
  return (
    String(form.CourseName ?? '').trim() !== '' ||
    String(form.Description ?? '').trim() !== '' ||
    form.CategoryId !== '' ||
    form.LevelId !== '' ||
    String(form.Thumbnail ?? '').trim() !== ''
  );
}

// VALID mentor course's form when create new course
export function validateMentorCourseForm(form, options = {}) {
  const {
    skipCategoryLevel = false,
    skipThumbnail = false,
  } = options;
  const errors = {};

  const courseName = String(form.CourseName ?? '').trim();
  const description = String(form.Description ?? '').trim();
  const thumbnail = String(form.Thumbnail ?? '').trim();

  // Course's Name 
  //(Not empty and have at least 3 chars, max: is setting 250 <depend on type of course name in database (nvarchar250)>)
  if (!courseName) {
    errors.CourseName = 'Tên khóa học không được để trống';
  } else if (courseName.length < 3) {
    errors.CourseName = 'Tên khóa học phải nhiều hơn 3 ký tự';
  } else if (courseName.length > 250) {
    errors.CourseName = 'Tên khóa học không được vượt quá 250 ký tự';
  }

  // Course's Description
  if (!description) {
    errors.Description = '(Description)-Mô tả khóa học không được để trống.';
  } else if (description.length > MENTOR_COURSE_DESCRIPTION_MAX) {
    // must be < 250 chars
    errors.Description = `(Description)-Mô tả khóa học không được vượt quá ${MENTOR_COURSE_DESCRIPTION_MAX} ký tự.`;
  } else if (description.length < 3) {
    errors.Description = '(Description)-Mô tả khóa học không được nhỏ hơn 3 ký tự'
  }

  // Danh mục
  if (!skipCategoryLevel && (form.CategoryId === '' || form.CategoryId === null || form.CategoryId === undefined)) {
    errors.CategoryId = 'Vui lòng chọn danh mục cho khóa học của bạn';
  }

  // Level
  if (!skipCategoryLevel && (form.LevelId === '' || form.LevelId === null || form.LevelId === undefined)) {
    errors.LevelId = 'Vui lòng chọn Level cho khóa học của bạn';
  }

  // Thumbnail
  if (!skipThumbnail) {
    if (!thumbnail) {
      errors.Thumbnail = 'Vui lòng tải lên ảnh khóa học của bạn.';
    } else {
      const thumbnailError = validateThumbnailDataUrl(thumbnail);
      if (thumbnailError) {
        errors.Thumbnail = thumbnailError;
      } else if (!isValidThumbnailValue(thumbnail)) {
        errors.Thumbnail = 'Ảnh không hợp lệ.';
      }
    }
  }

  return errors;
}

export function buildCreateCourseStep1Payload(form, instructorId) {
  const thumbnail = String(form.Thumbnail ?? '').trim();
  const description = String(form.Description ?? '').trim();

  return {
    CourseName: String(form.CourseName ?? '').trim(),
    Description: description || null,
    Thumbnail: thumbnail || null,
    CategoryId: form.CategoryId ? Number(form.CategoryId) : null,
    LevelId: form.LevelId ? Number(form.LevelId) : null,
    InstructorId: instructorId,
    IsPublished: Boolean(form.IsPublished),
  };
}

/** @deprecated Use buildCreateCourseStep1Payload for create flow */
export function buildCreateCoursePayload(form, instructorId) {
  return {
    ...buildCreateCourseStep1Payload(form, instructorId),
    TotalLessons: 0,
    Rating: 0,
  };
}
