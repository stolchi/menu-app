import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { createBrowserRouter } from 'react-router';
import { MenuPage } from '@/features/menu/MenuPage';
import { MessageScreen } from '@/shared/MessageScreen';

// The menu is what must be fast; everything after it can load when needed.
const OrderStatusPage = lazy(() =>
  import('@/features/order/OrderStatusPage').then((m) => ({
    default: m.OrderStatusPage,
  })),
);

function NotFound() {
  const { t } = useTranslation();
  return (
    <MessageScreen title={t('notFound.title')} hint={t('notFound.hint')} />
  );
}

export const router = createBrowserRouter([
  { path: '/:cafeSlug', element: <MenuPage /> },
  {
    path: '/:cafeSlug/order/:publicToken',
    element: (
      <Suspense>
        <OrderStatusPage />
      </Suspense>
    ),
  },
  { path: '*', element: <NotFound /> },
]);
