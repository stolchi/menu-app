import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Contact {
  name: string;
  phone: string;
  address: string;
  location: { latitude: number; longitude: number } | null;
  /** Delivered or taken away, as last chosen in the Mini App. */
  remoteType: 'TAKEAWAY' | 'DELIVERY' | null;
}

interface ContactState extends Contact {
  set: (change: Partial<Contact>) => void;
}

/** Who and where, remembered on the phone so a second order is quicker. */
export const useContactStore = create<ContactState>()(
  persist(
    (set) => ({
      name: '',
      phone: '',
      address: '',
      location: null,
      remoteType: null,
      set: (change) => set(change),
    }),
    { name: 'stolchi-contact', version: 1 },
  ),
);

/** 90 123 45 67, 998901234567 and +998 90 123 45 67 are the same number. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const local = /^(?:998)?(\d{9})$/.exec(digits)?.[1];
  return local ? `+998${local}` : value.trim();
}

export const PHONE_PATTERN = /^\+998\d{9}$/;
