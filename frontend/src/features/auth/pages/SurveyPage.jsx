import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategoriesApi, getLevelsApi, saveOnboardingApi } from '@/features/auth/services/authService';
import { getPostLoginPath } from '@/features/auth/utils/authUtils';
import Logo from '@/shared/ui/Logo';
import { toast } from '@/shared/ui/Toast';
import '@/shared/styles/SurveyPage.css';

export default function SurveyPage() {
  const navigate = useNavigate();

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user')) || {}; }
    catch { return {}; }
  })();

  const [categories, setCategories] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loadState, setLoadState] = useState('loading');

  const [step, setStep] = useState(1);
  // SỬA: Chuyển thành mảng thay vì 1 giá trị
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [goal, setGoal] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoadState('loading');
    try {
      const [catRes, levRes] = await Promise.all([getCategoriesApi(), getLevelsApi()]);
      if (catRes.ok && levRes.ok) {
        setCategories(catRes.data.data || []);
        setLevels(levRes.data.data || []);
        setLoadState('ready');
      } else {
        setLoadState('error');
        toast.error('Không thể tải dữ liệu khảo sát.');
      }
    } catch {
      setLoadState('error');
      toast.error('Không thể kết nối server.');
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCategoryClick = (id) => {
    if (selectedCategories.includes(id)) {
      // Đã chọn rồi thì ấn lại sẽ Bỏ chọn
      setSelectedCategories(selectedCategories.filter(catId => catId !== id));
    } else {
      // Chưa chọn thì kiểm tra xem đã quá 3 cái chưa
      if (selectedCategories.length < 3) {
        setSelectedCategories([...selectedCategories, id]);
      } else {
        toast.error('Bạn chỉ được chọn tối đa 3 lĩnh vực!');
      }
    }
  };

  const handleSubmit = async () => {
    // Check lại mảng rỗng
    if (selectedCategories.length === 0 || !selectedLevel || !goal.trim() || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await saveOnboardingApi(user.userId, selectedCategories, selectedLevel, goal.trim());
      if (result.ok) {
        const updatedUser = { ...user, isFirstLogin: false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('user_goal', goal.trim());
        toast.success(result.data.message || 'Đã lưu thông tin thành công!');
        navigate(getPostLoginPath(updatedUser, { isFirstLogin: false }));
      } else {
        toast.error(result.data?.message || 'Lưu khảo sát thất bại.');
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    } catch {
      toast.error('Lỗi kết nối. Vui lòng thử lại.');
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (loadState === 'loading') return <div className="survey-page"><p style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>Đang tải...</p></div>;
  if (loadState === 'error') return <div className="survey-page"><p style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>Lỗi dữ liệu.</p></div>;

  return (
    <div className="survey-page">
      <div className="survey-container">

        <div className="survey-header">
          <div className="survey-logo"><Logo height={44} link={false} className="survey-logo-img" /></div>
          <h1 className="survey-title">
            {step === 1 && 'Bạn quan tâm đến lĩnh vực nào nhất?'}
            {step === 2 && 'Trình độ hiện tại của bạn?'}
            {step === 3 && 'Mục tiêu học tập của bạn là gì?'}
          </h1>
          <p className="survey-subtitle">
            {step === 1 ? 'Bước 1/3. Chọn từ 1 đến 3 lĩnh vực.' : `Bước ${step}/3. Cùng thiết kế lộ trình cho bạn nhé.`}
          </p>
        </div>

        <div className="survey-content">

          {step === 1 && (
            <div className="survey-grid">
              {categories.map(cat => (
                <div
                  key={cat.categoryId}
                  // CSS đổi màu nếu nằm trong mảng đã chọn
                  className={`tag-card ${selectedCategories.includes(cat.categoryId) ? 'tag-card--selected' : ''}`}
                  onClick={() => handleCategoryClick(cat.categoryId)}
                >
                  <span className="tag-card__name">{cat.displayName}</span>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="survey-grid">
              {levels.map(lvl => (
                <div key={lvl.levelId} className={`tag-card ${selectedLevel === lvl.levelId ? 'tag-card--selected' : ''}`} onClick={() => setSelectedLevel(lvl.levelId)}>
                  <span className="tag-card__name">{lvl.displayName}</span>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
              <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="VD: Lấy vợ Tây, Kiếm 100 củ/tháng..."
                style={{ width: '100%', padding: '16px', fontSize: '18px', borderRadius: '12px', border: '2px solid #a78bfa', background: '#f8fafc', color: '#334155', outline: 'none' }}
              />
            </div>
          )}
        </div>

        <div className="survey-action" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
          {step > 1 && (
            <button className="survey-btn-submit" style={{ background: '#3f3c55', width: 'auto', padding: '14px 30px' }} onClick={() => setStep(step - 1)}>Quay lại</button>
          )}

          {step < 3 ? (
            <button
              className="survey-btn-submit" style={{ width: 'auto', padding: '14px 40px' }}
              // Disable nút Tiếp tục nếu chưa chọn cái nào ở Bước 1
              disabled={(step === 1 && selectedCategories.length === 0) || (step === 2 && !selectedLevel)}
              onClick={() => setStep(step + 1)}
            >
              Tiếp tục
            </button>
          ) : (
            <button
              className="survey-btn-submit" style={{ width: 'auto', padding: '14px 40px' }}
              disabled={!goal.trim() || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Đang lưu...' : 'Hoàn thành'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}