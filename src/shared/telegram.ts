import { useEffect, useState } from 'react';

/** The part of Telegram.WebApp this app uses. */
export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: { first_name?: string } };
  ready: () => void;
  expand: () => void;
  HapticFeedback?: { notificationOccurred: (type: 'success') => void };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const SCRIPT = 'https://telegram.org/js/telegram-web-app.js';

/**
 * The bot opens the menu with ?via=telegram, and Telegram adds its data to the hash.
 * Moving between pages drops both, but Telegram's script stays loaded.
 */
export const openedFromTelegram = () =>
  Boolean(window.Telegram?.WebApp?.initData) ||
  new URLSearchParams(window.location.search).get('via') === 'telegram' ||
  window.location.hash.includes('tgWebAppData');

let loading: Promise<TelegramWebApp | null> | null = null;

/** Telegram's script, loaded only inside Telegram so the QR menu does not pay for it. */
function loadTelegram(): Promise<TelegramWebApp | null> {
  loading ??= new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => {
      const webApp = window.Telegram?.WebApp;
      // Opened by link in a browser, not by Telegram: there is nothing signed.
      if (!webApp?.initData) return resolve(null);
      webApp.ready();
      webApp.expand();
      resolve(webApp);
    };
    script.onerror = () => resolve(null);
    document.head.append(script);
  });
  return loading;
}

export type TelegramState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'ready'; webApp: TelegramWebApp };

/** Whether this is the Mini App, and Telegram's session once it is known. */
export function useTelegram(): TelegramState {
  const [state, setState] = useState<TelegramState>(() =>
    openedFromTelegram() ? { status: 'loading' } : { status: 'none' },
  );
  useEffect(() => {
    if (state.status !== 'loading') return;
    let stopped = false;
    void loadTelegram().then((webApp) => {
      if (!stopped) {
        setState(webApp ? { status: 'ready', webApp } : { status: 'none' });
      }
    });
    return () => {
      stopped = true;
    };
  }, [state.status]);
  return state;
}
