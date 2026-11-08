import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import '@/shared/i18n';
import uz from '@/shared/i18n/uz.json';
import { OrderStatusPage } from './OrderStatusPage';

const sockets = vi.hoisted(
  () => [] as { auth: unknown; handlers: Record<string, () => void> }[],
);

vi.mock('socket.io-client', () => ({
  io: (_url: string, { auth }: { auth: unknown }) => {
    const entry = { auth, handlers: {} as Record<string, () => void> };
    sockets.push(entry);
    return {
      on: (event: string, handler: () => void) => {
        entry.handlers[event] = handler;
      },
      disconnect: vi.fn(),
    };
  },
}));

const ORDER = {
  publicToken: 'tok',
  number: 12,
  displayNumber: 'Q-12',
  type: 'DINE_IN',
  total: 90000,
  createdAt: '2026-01-31T10:00:00Z',
  items: [
    {
      name: 'Osh',
      price: 45000,
      unit: 'PIECE',
      quantity: 2,
      weighed: true,
      note: null,
    },
  ],
};

let status = 'ACCEPTED';

function show(type = 'DINE_IN') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const path = new URL(input).pathname;
      if (path.endsWith('/menu')) {
        return new Response(
          JSON.stringify({
            cafe: { name: 'Demo Kafe', primaryColor: null },
            categories: [],
          }),
        );
      }
      if (path.endsWith('/orders/tok')) {
        return new Response(JSON.stringify({ ...ORDER, type, status }));
      }
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
      });
    }),
  );
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, retryDelay: 1 } },
        })
      }
    >
      <MemoryRouter initialEntries={['/demo/order/tok?table=q1']}>
        <Routes>
          <Route
            path="/:cafeSlug/order/:publicToken"
            element={<OrderStatusPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('OrderStatusPage', () => {
  beforeEach(() => {
    status = 'ACCEPTED';
    sockets.length = 0;
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the number, the step, and a way back to the same table', async () => {
    show();
    expect(await screen.findByText('Q-12')).toBeInTheDocument();
    expect(screen.getByText(uz.order.headline.ACCEPTED)).toBeInTheDocument();
    expect(
      screen.getByText(uz.order.steps.accepted).closest('li'),
    ).toHaveAttribute('aria-current', 'step');
    expect(
      screen.getByRole('link', { name: uz.order.backToMenu }),
    ).toHaveAttribute('href', '/demo?table=q1');
  });

  it('follows the order live, with its own token only', async () => {
    show();
    await screen.findByText(uz.order.headline.ACCEPTED);
    await waitFor(() => expect(sockets).toHaveLength(1));
    expect(sockets[0].auth).toEqual({ orderToken: 'tok' });

    status = 'READY';
    await waitFor(() =>
      expect(sockets[0].handlers['order.status_changed']).toBeDefined(),
    );
    sockets[0].handlers['order.status_changed']();
    expect(
      await screen.findByText(uz.order.headline.READY),
    ).toBeInTheDocument();
  });

  it('tells a takeaway customer where to go when ready', async () => {
    status = 'READY';
    show('TAKEAWAY');
    expect(await screen.findByText(uz.order.readyTakeaway)).toBeInTheDocument();
  });

  it('says so when cancelled, and stops listening', async () => {
    status = 'CANCELLED';
    show();
    expect(
      await screen.findByText(uz.order.headline.CANCELLED),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /steps/ })).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sockets).toHaveLength(0);
  });

  it('says so when there is no such order', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 404 })),
    );
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <MemoryRouter initialEntries={['/demo/order/nope']}>
          <Routes>
            <Route
              path="/:cafeSlug/order/:publicToken"
              element={<OrderStatusPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(
      await screen.findByText(uz.order.notFound, undefined, { timeout: 8000 }),
    ).toBeInTheDocument();
  }, 15000);
});
