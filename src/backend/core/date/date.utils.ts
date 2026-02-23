/** Retorna string YYYY-MM-DD baseada na data local do servidor */
export function todayLocalYmd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
/** Converte uma string YYYY-MM-DD para Date no início do dia em UTC (00:00:00) */
export function startOfDayUtcFromYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

/** Converte uma string YYYY-MM-DD para Date no fim do dia em UTC (23:59:59.999) */
export function endOfDayUtcFromYmd(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.999Z`);
}
