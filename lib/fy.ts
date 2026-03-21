export function getCurrentFY(today = new Date()) {
  const year = today.getFullYear();
  const fyStartYear = today.getMonth() >= 3 ? year : year - 1;
  const yy = String(fyStartYear).slice(-2);
  const nextYy = String(fyStartYear + 1).slice(-2);
  return `${yy}-${nextYy}`;
}
