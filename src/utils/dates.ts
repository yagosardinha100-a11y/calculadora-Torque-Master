import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isValid,
  isWeekend,
  parse,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ISODate } from '@/types'

export const ISO_DATE_FORMAT = 'yyyy-MM-dd'

/** Converte um `Date` para string ISO `yyyy-MM-dd` (fuso local). */
export function toISODate(date: Date): ISODate {
  return format(date, ISO_DATE_FORMAT)
}

/** Converte uma string ISO `yyyy-MM-dd` para `Date` no fuso local. */
export function fromISODate(iso: ISODate): Date {
  return parse(iso, ISO_DATE_FORMAT, new Date())
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  return isValid(fromISODate(iso))
}

export function todayISO(): ISODate {
  return toISODate(startOfDay(new Date()))
}

export function addDaysISO(iso: ISODate, amount: number): ISODate {
  return toISODate(addDays(fromISODate(iso), amount))
}

/** Diferença em dias de calendário entre duas datas ISO (`a - b`). */
export function diffDaysISO(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(fromISODate(a), fromISODate(b))
}

/** Compara datas ISO. Strings `yyyy-MM-dd` são ordenáveis lexicograficamente. */
export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function isWithinISO(date: ISODate, start: ISODate, end: ISODate): boolean {
  return date >= start && date <= end
}

export interface DayInfo {
  iso: ISODate
  date: Date
  dayOfMonth: number
  weekdayLetter: string
  isWeekend: boolean
  isToday: boolean
}

const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const

/** Gera os dias de um mês com metadados prontos para o cabeçalho da grade. */
export function getMonthDays(monthAnchor: Date): DayInfo[] {
  const today = new Date()
  return eachDayOfInterval({
    start: startOfMonth(monthAnchor),
    end: endOfMonth(monthAnchor),
  }).map((date) => ({
    iso: toISODate(date),
    date,
    dayOfMonth: date.getDate(),
    weekdayLetter: WEEKDAY_LETTERS[date.getDay()] ?? '',
    isWeekend: isWeekend(date),
    isToday: isSameDay(date, today),
  }))
}

export function shiftMonth(monthAnchor: Date, amount: number): Date {
  return startOfMonth(addMonths(monthAnchor, amount))
}

/** Título do mês, ex.: "Julho 2026". */
export function formatMonthTitle(monthAnchor: Date): string {
  const raw = format(monthAnchor, 'MMMM yyyy', { locale: ptBR })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

/** Data curta em pt-BR, ex.: "24/07/2026". */
export function formatShortDate(iso: ISODate): string {
  return format(fromISODate(iso), 'dd/MM/yyyy')
}

/** Data por extenso em pt-BR, ex.: "sexta-feira, 24 de julho de 2026". */
export function formatLongDate(iso: ISODate): string {
  return format(fromISODate(iso), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

/** Intervalo curto, ex.: "12/08 – 14/08/2026". */
export function formatDateRange(start: ISODate, end: ISODate): string {
  if (start === end) return formatShortDate(start)
  const startFmt = format(fromISODate(start), 'dd/MM')
  return `${startFmt} – ${formatShortDate(end)}`
}
