import { Injectable, inject } from '@angular/core';
import type { Row, Cell, Column as ExcelColumn } from 'exceljs';
import { DialogService } from './dialog';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private dialog = inject(DialogService);

  async exportToPDF(elementId: string, filename: string = 'export'): Promise<void> {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        console.error(`Element with ID "${elementId}" not found`);
        return;
      }

      // Dynamic import
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  async exportToExcel<T>(
    data: T[],
    columns: { header: string; key: string; width?: number }[],
    filename: string = 'export'
  ): Promise<void> {
    try {
      const ExcelJS = await import('exceljs');
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');

      worksheet.columns = columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || 15
      }));

      worksheet.getRow(1).font = { bold: true, size: 12 };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0071E3' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 25;

      data.forEach(item => {
        worksheet.addRow(item as any); // Cast as any for exceljs addRow
      });

      worksheet.eachRow((row: Row) => {
        row.eachCell((cell: Cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      saveAs(blob, `${filename}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  printElement(elementId: string): void {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        console.error(`Element with ID "${elementId}" not found`);
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error('Failed to open print window');
        return;
      }

      const styles = Array.from(document.styleSheets)
        .map(styleSheet => {
          try {
            return Array.from(styleSheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch (e) {
            return '';
          }
        })
        .join('\n');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print</title>
            <style>
              ${styles}
              @media print {
                body { margin: 0; padding: 20px; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            ${element.outerHTML}
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (error) {
      console.error('Error printing:', error);
      throw error;
    }
  }

  async exportTableToExcel(tableId: string, filename: string = 'export'): Promise<void> {
    try {
      const table = document.getElementById(tableId) as HTMLTableElement;
      if (!table) {
        console.error(`Table with ID "${tableId}" not found`);
        return;
      }

      // Dynamic import
      const ExcelJS = await import('exceljs');
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');
      // ... rest of code uses ExcelJS and saveAs

      const headerRow = table.querySelector('thead tr');
      if (headerRow) {
        const headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent?.trim() || '');
        worksheet.addRow(headers);

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0071E3' }
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 25;
      }

      const dataRows = table.querySelectorAll('tbody tr');
      dataRows.forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() || '');
        worksheet.addRow(cells);
      });

      worksheet.columns.forEach((column: Partial<ExcelColumn>) => {
        column.width = 15;
      });

      worksheet.eachRow((row: Row) => {
        row.eachCell((cell: Cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      saveAs(blob, `${filename}.xlsx`);
    } catch (error) {
      console.error('Error exporting table to Excel:', error);
      throw error;
    }
  }
}
