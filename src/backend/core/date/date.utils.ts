/** Retorna string YYYY-MM-DD do "hoje" no timezone IANA informado */
export function todayYmd(timezone: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // en-CA já formata como YYYY-MM-DD
  return parts;
}
/** Converte uma string YYYY-MM-DD para Date no início do dia em UTC (00:00:00) */
export function startOfDayUtcFromYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

/** Converte uma string YYYY-MM-DD para Date no fim do dia em UTC (23:59:59.999) */
export function endOfDayUtcFromYmd(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.999Z`);
}

/**
 * Converte data local (YYYY-MM-DD) + hora local (HH:MM) + timezone IANA
 * para um Date em UTC.
 *
 * Ex: localToUtc("2025-03-15", "09:00", "America/Sao_Paulo")
 *     → Date representando 2025-03-15T12:00:00Z (UTC-3 nessa data)
 */
export function localToUtc(date: string, time: string, timezone: string): Date {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const [hour, minute] = time.split(":").map(Number) as [number, number];

  // Cria um Date tentativo assumindo UTC
  const tentative = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  // Descobre qual é a hora local nesse timezone para esse instante UTC
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(tentative);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

  const localAtTentative = new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")),
  );

  // Offset = localAtTentative - tentative (quanto o local está adiantado/atrasado)
  const offsetMs = localAtTentative.getTime() - tentative.getTime();

  // O UTC correto é: tentative - offset
  return new Date(tentative.getTime() - offsetMs);
}
