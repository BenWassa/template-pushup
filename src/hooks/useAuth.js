import { useState } from 'react';

export const APP_ID = 'pushup-local';

export const useAuth = () => {
  const [user] = useState({ uid: 'local-user' });

  return { user, loading: false, db: null, appId: APP_ID, error: null };
};
