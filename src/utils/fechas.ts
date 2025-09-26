export const toISODate = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD

export const addDays = (base: Date | string, days: number) => {
  const dt = new Date(base);
  dt.setHours(12, 0, 0, 0); // evitar TZ edge cases
  dt.setDate(dt.getDate() + days);
  return dt;
};

export const subDays = (base: Date | string, days: number) => addDays(base, -days);

export const isWithinNextNDays = (d: Date | string, n: number) => {
  if (!d) return false;
  const target = new Date(d);
  const today = new Date(); today.setHours(0,0,0,0);
  const limit = addDays(today, n);
  return target >= today && target <= limit;
};
