// src/lib/dateUtils.ts

/**
 * Converte uma data do formato ISO Date "YYYY-MM-DD" para um objeto Date seguro (ao meio dia UTC),
 * evitando o famigerado bug de timezone em que subtrair fuso horário faz a data cair um dia antes.
 */
export function parseDateSafe(dataStr: string | null | undefined): Date | null {
  if (!dataStr) return null;
  // Se for apenas uma data (ex: '2026-09-26')
  if (dataStr.length === 10) {
    return new Date(`${dataStr}T12:00:00`);
  }
  return new Date(dataStr);
}

/**
 * Formata a data (DD/MM/YYYY) de forma segura a partir da string de banco (YYYY-MM-DD).
 */
export function formatDateBR(dataStr: string | null | undefined): string {
  const d = parseDateSafe(dataStr);
  if (!d) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
