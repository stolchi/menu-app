import { useEffect, useEffectEvent } from 'react';
import type { Socket } from 'socket.io-client';
import { API_URL } from '@/shared/api/client';

/**
 * Calls back whenever the order changes. The socket library loads only here, so that
 * browsing the menu does not pay for it.
 */
export function useOrderUpdates(
  orderToken: string,
  enabled: boolean,
  onUpdate: () => void,
) {
  const update = useEffectEvent(onUpdate);

  useEffect(() => {
    if (!enabled) return;
    let socket: Socket | undefined;
    let stopped = false;
    void import('socket.io-client').then(({ io }) => {
      if (stopped) return;
      socket = io(API_URL, { auth: { orderToken } });
      // On connect too: the phone may have been asleep through a change.
      socket.on('connect', () => update());
      socket.on('order.status_changed', () => update());
    });
    return () => {
      stopped = true;
      socket?.disconnect();
    };
  }, [orderToken, enabled]);
}
