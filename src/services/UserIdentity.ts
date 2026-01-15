export type UserIdentity = {
  userId: string;
  isAnonymous: boolean;
};

export interface UserIdentityProvider {
  getIdentity(): Promise<UserIdentity>;
}

export class LocalUserIdentity implements UserIdentityProvider {
  async getIdentity(): Promise<UserIdentity> {
    return { userId: 'local-anon', isAnonymous: true };
  }
}
