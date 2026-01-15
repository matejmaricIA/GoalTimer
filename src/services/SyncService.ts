export interface SyncService {
  sync(): Promise<void>;
}

export class NoopSyncService implements SyncService {
  async sync(): Promise<void> {
    return;
  }
}
