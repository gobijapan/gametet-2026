// Lấy danh sách Admin
export const getAdminList = (): string[] => {
  return (process.env.NEXT_PUBLIC_ADMIN_MSNV || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
};

// Lấy danh sách MC
export const getMCList = (): string[] => {
  return (process.env.NEXT_PUBLIC_MC_MSNV || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
};

// Kiểm tra xem MSNV có phải Admin không
export const isAdmin = (msnv: string): boolean => {
  return getAdminList().includes(msnv);
};

// Kiểm tra xem MSNV có phải MC không
export const isMC = (msnv: string): boolean => {
  return getMCList().includes(msnv);
};

// Lấy role từ MSNV
export const getRoleFromMSNV = (msnv: string): 'admin' | 'mc' | 'player' => {
  if (isAdmin(msnv)) return 'admin';
  if (isMC(msnv)) return 'mc';
  return 'player';
};