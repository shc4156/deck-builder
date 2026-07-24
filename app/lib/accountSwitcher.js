// lib/accountSwitcher.js

// 1. 저장된 계정 목록 가져오기
export function getSavedAccounts() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('saved_accounts');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

// 2. 계정 추가/갱신 (여러 계정 누적)
export function saveAccount(newAccount) {
  if (typeof window === 'undefined' || !newAccount?.email) return;

  const currentList = getSavedAccounts();
  const filteredList = currentList.filter(
    (acc) => acc.email !== newAccount.email
  );

  const updatedList = [
    {
      email: newAccount.email,
      password: newAccount.password,
      nickname: typeof newAccount.nickname === 'string' ? newAccount.nickname : '계정'
    },
    ...filteredList
  ];

  localStorage.setItem('saved_accounts', JSON.stringify(updatedList));
}

// 3. 계정 삭제
export function removeAccount(email) {
  if (typeof window === 'undefined') return;
  const currentList = getSavedAccounts();
  const updatedList = currentList.filter((acc) => acc.email !== email);
  localStorage.setItem('saved_accounts', JSON.stringify(updatedList));
}