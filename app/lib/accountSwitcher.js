const STORAGE_KEY = 'saved_accounts';

export function getSavedAccounts() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveAccount(nickname, email, password) {
  const accounts = getSavedAccounts().filter(a => a.email !== email);
  accounts.push({ nickname, email, password });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function removeAccount(email) {
  const accounts = getSavedAccounts().filter(a => a.email !== email);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}