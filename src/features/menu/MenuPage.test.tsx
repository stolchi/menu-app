import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import '@/shared/i18n';
import uz from '@/shared/i18n/uz.json';
import { useCartStore } from './cart-store';
import { MenuPage } from './MenuPage';

const MENU = {
  cafe: {
    name: 'Demo Kafe',
    slug: 'demo',
    logoUrl: null,
    primaryColor: null,
    orderTypes: ['DINE_IN', 'TAKEAWAY'],
    serviceChargePercent: 0,
    packagingFee: 0,
    deliveryFee: 0,
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
          unit: 'PIECE',
          variants: [],
          isAvailable: true,
        },
        {
          id: 'somsa',
          name: 'Somsa',
          description: null,
          price: 8000,
          imageUrl: null,
          unit: 'PIECE',
          variants: [],
          isAvailable: false,
        },
      ],
    },
    { id: 'c2', name: "Bo'sh", products: [] },
  ],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
}

function show(
  url: string,
  respond?: (path: string, init?: RequestInit) => Response | undefined,
) {
  const posts: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const path = new URL(input).pathname;
      const custom = respond?.(path, init);
      if (custom) return custom;
      if (init?.method === 'POST') {
        posts.push(JSON.parse(String(init.body)));
        return json({ publicToken: 'tok', displayNumber: 'Q-1' }, 201);
      }
      if (path.endsWith('/menu')) return json(MENU);
      if (path.includes('/tables/good')) {
        return json({
          name: 'Stol 3',
          cafeSlug: 'demo',
          cafeName: 'Demo Kafe',
        });
      }
      if (path.includes('/tables/other')) {
        return json({ name: 'Stol 9', cafeSlug: 'boshqa', cafeName: 'Boshqa' });
      }
      return json({ message: 'Not Found' }, 404);
    }),
  );
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/:cafeSlug" element={<MenuPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return posts;
}

const add = (name: string) =>
  screen.findByRole('button', { name: uz.menu.add.replace('{{name}}', name) });
const send = () =>
  userEvent.click(
    screen.getByRole('button', { name: uz.cart.order, hidden: true }),
  );
const openCart = () =>
  userEvent.click(
    screen.getByRole('button', { name: new RegExp(uz.cart.open) }),
  );

describe('MenuPage', () => {
  beforeEach(() => useCartStore.setState({ carts: {} }));
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the cafe and its table, without empty categories', async () => {
    show('/demo?table=good');
    expect(
      await screen.findByRole('heading', { name: 'Demo Kafe' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Stol 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Taomlar' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: "Bo'sh" })).toBeNull();
  });

  it('greys out a product that ran out', async () => {
    show('/demo');
    await screen.findByText('Somsa');
    expect(screen.getByText(uz.menu.soldOut)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: uz.menu.add.replace('{{name}}', 'Somsa'),
      }),
    ).toBeNull();
  });

  it('orders for the scanned table, then opens the status page', async () => {
    const posts = show('/demo?table=good');
    await screen.findByText('Stol 3');
    await userEvent.click(await add('Osh'));
    await userEvent.click(
      screen.getByRole('button', {
        name: uz.menu.increase.replace('{{name}}', 'Osh'),
      }),
    );
    await openCart();
    await userEvent.type(
      screen.getByRole('textbox', { hidden: true }),
      ' tez ',
    );
    await send();

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toEqual({
      type: 'DINE_IN',
      qrToken: 'good',
      note: 'tez',
      items: [{ productId: 'osh', quantity: 2 }],
    });
    expect(await screen.findByTestId('where')).toHaveTextContent(
      '/demo/order/tok?table=good',
    );
    expect(useCartStore.getState().carts.demo).toMatchObject({
      lines: {},
      lastOrderToken: 'tok',
    });
  });

  it('orders for takeaway without a table', async () => {
    const posts = show('/demo');
    await userEvent.click(await add('Osh'));
    await openCart();
    await send();
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toEqual({
      type: 'TAKEAWAY',
      items: [{ productId: 'osh', quantity: 1 }],
    });
  });

  it.each(['bad', 'other'])(
    'does not trust a table code that fails: %s',
    async (code) => {
      const posts = show(`/demo?table=${code}`);
      expect(await screen.findByText(uz.menu.badTable)).toBeInTheDocument();
      await userEvent.click(await add('Osh'));
      await openCart();
      await send();
      await waitFor(() => expect(posts).toHaveLength(1));
      expect(posts[0]).toMatchObject({ type: 'TAKEAWAY' });
      expect(posts[0]).not.toHaveProperty('qrToken');
    },
  );

  const withCafe = (extra: object) => (path: string) =>
    path.endsWith('/menu')
      ? json({ ...MENU, cafe: { ...MENU.cafe, ...extra } })
      : undefined;

  it('adds the service charge at the table', async () => {
    show('/demo?table=good', withCafe({ serviceChargePercent: 10 }));
    await screen.findByText('Stol 3');
    await userEvent.click(await add('Osh'));
    await openCart();
    expect(
      screen.getByText(uz.amounts.service.replace('{{percent}}', '10')),
    ).toBeInTheDocument();
    expect(screen.getAllByText("49 500 so'm").length).toBeGreaterThan(0);
  });

  it('only shows the menu where the cafe takes no order', async () => {
    const posts = show('/demo', withCafe({ orderTypes: ['DINE_IN'] }));
    expect(await screen.findByText(uz.menu.viewOnly)).toBeInTheDocument();
    await userEvent.click(await add('Osh'));
    await openCart();
    expect(
      screen.getByRole('button', { name: uz.cart.order, hidden: true }),
    ).toBeDisabled();
    expect(posts).toHaveLength(0);
  });

  it('orders a size and a guessed weight', async () => {
    const menu = {
      ...MENU,
      categories: [
        {
          id: 'c1',
          name: 'Taomlar',
          products: [
            {
              id: 'pitsa',
              name: 'Pitsa',
              description: null,
              price: 60000,
              imageUrl: null,
              isAvailable: true,
              unit: 'PIECE',
              variants: [
                { id: 'v1', name: 'Katta', price: 90000 },
                { id: 'v2', name: "O'rta", price: 60000 },
              ],
            },
            {
              id: 'baliq',
              name: 'Baliq',
              description: null,
              price: 120000,
              imageUrl: null,
              isAvailable: true,
              unit: 'KG',
              variants: [],
            },
          ],
        },
      ],
    };
    const posts = show('/demo', (path) =>
      path.endsWith('/menu') ? json(menu) : undefined,
    );
    await userEvent.click(
      await screen.findByRole('button', {
        name: uz.menu.chooseSize.replace('{{name}}', 'Pitsa'),
      }),
    );
    await userEvent.click(
      screen.getByRole('button', {
        name: uz.menu.add.replace('{{name}}', 'Pitsa (Katta)'),
        hidden: true,
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: uz.menu.done, hidden: true }),
    );

    await userEvent.click(await add('Baliq'));
    expect(screen.getAllByText('1 kg').length).toBeGreaterThan(0);
    await userEvent.click(
      screen.getByRole('button', {
        name: uz.menu.increase.replace('{{name}}', 'Baliq'),
      }),
    );
    expect(screen.getAllByText('1,5 kg').length).toBeGreaterThan(0);

    await openCart();
    expect(screen.getAllByText("270 000 so'm").length).toBeGreaterThan(0);
    expect(screen.getByText(uz.cart.weightNote)).toBeInTheDocument();
    await send();
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toMatchObject({
      type: 'TAKEAWAY',
      items: [
        { productId: 'pitsa', variantId: 'v1', quantity: 1 },
        { productId: 'baliq', quantity: 1500 },
      ],
    });
  });

  it('keeps the cart when ordering fails, and says why', async () => {
    show('/demo', (_path, init) =>
      init?.method === 'POST'
        ? json({ message: '"Osh" is not available' }, 409)
        : undefined,
    );
    await userEvent.click(await add('Osh'));
    await openCart();
    await send();
    expect(
      await screen.findByRole('alert', { hidden: true }),
    ).toHaveTextContent(uz.common.errors.unavailable);
    expect(useCartStore.getState().carts.demo.lines).toEqual({ osh: 1 });
  });

  it('will not order what has run out since it was added', async () => {
    useCartStore.setState({
      carts: { demo: { lines: { somsa: 1 }, note: '', lastOrderToken: null } },
    });
    const posts = show('/demo');
    await screen.findAllByText('Somsa');
    await openCart();
    expect(
      screen.getByRole('button', { name: uz.cart.order, hidden: true }),
    ).toBeDisabled();
    expect(posts).toEqual([]);
  });

  it('says so when there is no such cafe', async () => {
    show('/nope', (path) =>
      path.endsWith('/menu') ? json({ message: 'Not Found' }, 404) : undefined,
    );
    expect(await screen.findByText(uz.notFound.title)).toBeInTheDocument();
  });

  it('leads back to an order still in progress', async () => {
    useCartStore.setState({
      carts: { demo: { lines: {}, note: '', lastOrderToken: 'tok' } },
    });
    show('/demo', (path) =>
      path.endsWith('/orders/tok')
        ? json({ displayNumber: 'Q-7', status: 'COOKING' })
        : undefined,
    );
    const link = await screen.findByRole('link', { name: /Q-7/ });
    expect(link).toHaveAttribute('href', '/demo/order/tok');
  });
});
