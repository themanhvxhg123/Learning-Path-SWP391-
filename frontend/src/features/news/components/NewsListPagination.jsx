import AppPagination from '@/shared/ui/AppPagination';

export const NEWS_LIST_PAGE_SIZE = 9;

export default function NewsListPagination(props) {
  return <AppPagination {...props} />;
}
