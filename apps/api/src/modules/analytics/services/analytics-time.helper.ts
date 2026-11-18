import { KpiMetric } from '@matabai/shared';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  startDateStr: string; // YYYY-MM-DD
  endDateStr: string;   // YYYY-MM-DD
  previousStartDate: Date;
  previousEndDate: Date;
  previousStartDateStr: string;
  previousEndDateStr: string;
  durationDays: number;
}

export class AnalyticsTimeHelper {
  /**
   * Resolves date range and previous comparison window based on period string or custom dates
   */
  public static resolveDateRange(
    period?: string,
    customStart?: string,
    customEnd?: string,
  ): DateRange {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (customStart && customEnd) {
      startDate = new Date(`${customStart}T00:00:00.000Z`);
      endDate = new Date(`${customEnd}T23:59:59.999Z`);
    } else {
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
          break;
        case '30d':
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)));

    const previousEndDate = new Date(startDate.getTime() - 1);
    const previousStartDate = new Date(previousEndDate.getTime() - durationMs);

    return {
      startDate,
      endDate,
      startDateStr: startDate.toISOString().split('T')[0]!,
      endDateStr: endDate.toISOString().split('T')[0]!,
      previousStartDate,
      previousEndDate,
      previousStartDateStr: previousStartDate.toISOString().split('T')[0]!,
      previousEndDateStr: previousEndDate.toISOString().split('T')[0]!,
      durationDays,
    };
  }

  /**
   * Computes delta metric with percentage change and trend direction
   */
  public static calculateMetric(
    current: number,
    previous?: number | null,
    unit?: string,
    periodLabel?: string,
  ): KpiMetric {
    if (previous === undefined || previous === null) {
      return {
        value: current,
        previousValue: null,
        changePercentage: null,
        trend: 'NEUTRAL',
        unit,
        periodLabel,
      };
    }

    let changePercentage: number | null = null;
    let trend: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';

    if (previous > 0) {
      changePercentage = +(((current - previous) / previous) * 100).toFixed(1);
    } else if (current > 0) {
      changePercentage = 100.0;
    } else {
      changePercentage = 0.0;
    }

    if (current > previous) {
      trend = 'UP';
    } else if (current < previous) {
      trend = 'DOWN';
    }

    return {
      value: current,
      previousValue: previous,
      changePercentage,
      trend,
      unit,
      periodLabel,
    };
  }
}
