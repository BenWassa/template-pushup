const STORAGE_KEY = 'pushup_users_v1';
const LOCAL_EVENT = 'pushup-storage';

const safeParse = (value) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.warn('Failed to parse local storage data:', err);
    return {};
  }
};

export const readUsers = () => safeParse(localStorage.getItem(STORAGE_KEY));

export const writeUsers = (users) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to write local storage data:', err);
  }
  window.dispatchEvent(new Event(LOCAL_EVENT));
};

export const subscribeUsers = (handler) => {
  const onStorage = (event) => {
    if (event.key === STORAGE_KEY) handler();
  };
  const onLocal = () => handler();
  window.addEventListener('storage', onStorage);
  window.addEventListener(LOCAL_EVENT, onLocal);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(LOCAL_EVENT, onLocal);
  };
};

export const getUsersList = () => Object.entries(readUsers()).map(([id, data]) => ({ id, ...data }));
