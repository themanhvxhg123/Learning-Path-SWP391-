const API_BASE = 'http://localhost:5000/api';

export const getFeaturedCourses = async () => {
  const response = await fetch(`${API_BASE}/courses/featured`);
  const data = await response.json();
  return data;
};
