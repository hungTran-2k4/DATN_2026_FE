import { Injectable } from '@angular/core';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

@Injectable({ providedIn: 'root' })
export class AdminExportService {
  /**
   * Xuat du lieu bang duoi dang CSV de admin co the doi soat nhanh tren Excel/Google Sheets.
   */
  exportCsv<T>(fileName: string, rows: T[], columns: CsvColumn<T>[]): void {
    const headers = columns.map((c) => this.escapeCsv(c.header)).join(',');
    const lines = rows.map((row) =>
      columns.map((column) => this.escapeCsv(column.value(row))).join(','),
    );

    const csv = [headers, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  private escapeCsv(
    value: string | number | boolean | null | undefined,
  ): string {
    const raw = value === null || value === undefined ? '' : String(value);
    const escaped = raw.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
