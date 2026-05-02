import type { SystemSnapshot } from './pet_desktop_types';

interface PetDesktopApi {
  getSnapshot(): Promise<SystemSnapshot>;
  onStatusChanged(
    listener: (snapshot: SystemSnapshot) => void
  ): () => void;
}

declare global {
  interface Window {
    petDesktop?: PetDesktopApi;
  }
}

export {};
