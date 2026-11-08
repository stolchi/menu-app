import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import '@/shared/i18n';
import uz from '@/shared/i18n/uz.json';
import { useCartStore } from './cart-store';
import { useContactStore } from './contact-store';
import { MenuPage } from './MenuPage';

vi.mock('@/shared/telegram', () => ({
  useTelegram: () => ({
    status: 'ready',
    webApp: {
      initData: 'signed-by-telegram',
      initDataUnsafe: { user: { first_name: 'Aziz' } },
    },
  }),
}));

const MENU = {
  cafe: {
    name: 'Demo Kafe',
    slug: 'demo',
    logoUrl: null,
    primaryColor: null,
    orderTypes: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'],
    serviceChargePercent: 10,
    packagingFee: 2000,
    deliveryFee: 15000,
  },
  categories: [
    {
      id: 'c1',
      name: 'Taomlar',
      products: [
        {
          id: 'osh',
          name: 'Osh',
          description: null,
          price: 45000,
          imageUrl: null,
          isAvailable: true,
          unit: 'PIECE',
          variants: [],
        },
      ],
    },
  ],
};

function show() {
  const posts: { path: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const path = new URL(input).pathname;
      if (init?.method === 'POST') {
        posts.push({ path, body: JSON.parse(String(init.body)) });
        return new Response(
          JSON.stringify({ publicToken: 'tok', displayNumber: 'D-1' }),
          { status: 201 },
        );
      }
      return new Response(JSON.stringify(MENU));
    }),
  );
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={['/demo?via=telegram']}>
        <Routes>
          <Route path="/:cafeSlug" element={<MenuPage />} />
          <Route path="*" element={<p>status page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return posts;
}

const send = () =>
  userEvent.click(
    screen.getByRole('button', { name: uz.cart.order, hidden: true }),
  );

describe('ordering from Telegram', () => {
  beforeEach(() => {
    useCartStore.setState({ carts: {} });
    useContactStore.setState({
      name: '',
      phone: '',
      address: '',
      location: null,
      remoteType: null,
    });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('delivers, with a phone and an address, signed by the bot', async () => {
    const posts = show();
    expect(await screen.findByText(uz.telegram.heading)).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', {
        name: uz.menu.add.replace('{{name}}', 'Osh'),
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Savat/ }));
    expect(
      screen.getByRole('radio', {
        name: uz.telegram.type.DELIVERY,
        hidden: true,
      }),
    ).toBeChecked();
    // Delivery and packaging, no service charge: 45 000 + 2 000 + 15 000.
    expect(screen.getAllByText("62 000 so'm").length).toBeGreaterThan(0);

    await send();
    expect(posts).toHaveLength(0);
    expect(screen.getByText(uz.telegram.phoneInvalid)).toBeInTheDocument();
    expect(screen.getByText(uz.telegram.addressRequired)).toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText(uz.telegram.phone),
      '90 111 22 33',
    );
    await userEvent.type(
      screen.getByLabelText(uz.telegram.address),
      'Chilonzor 9',
    );
    await send();
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toEqual({
      path: '/api/v1/public/cafes/demo/telegram-orders',
      body: {
        initData: 'signed-by-telegram',
        type: 'DELIVERY',
        customerPhone: '+998901112233',
        customerName: 'Aziz',
        address: 'Chilonzor 9',
        items: [{ productId: 'osh', quantity: 1 }],
      },
    });
    expect(useContactStore.getState().address).toBe('Chilonzor 9');
    // The pill on the menu adds the same delivery fee as the cart.
    expect(screen.queryAllByText("47 000 so'm")).toHaveLength(0);
  });

  it('takes away without an address', async () => {
    const posts = show();
    await userEvent.click(
      await screen.findByRole('button', {
        name: uz.menu.add.replace('{{name}}', 'Osh'),
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Savat/ }));
    await userEvent.click(
      screen.getByRole('radio', {
        name: uz.telegram.type.TAKEAWAY,
        hidden: true,
      }),
    );
    expect(screen.queryByLabelText(uz.telegram.address)).toBeNull();
    await userEvent.type(
      screen.getByLabelText(uz.telegram.phone),
      '+998901112233',
    );
    await send();
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].body).toMatchObject({ type: 'TAKEAWAY' });
    expect(posts[0].body).not.toHaveProperty('address');
  });
});
