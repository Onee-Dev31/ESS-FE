import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx-js-style';
import dayjs from 'dayjs';

function parseArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getAssigneeNames(ticket: any): string {
  const directAssignees = parseArray(ticket.assignees_json);
  if (directAssignees.length) {
    return directAssignees
      .map((item) => item.full_name ?? item.assigned_name ?? item.name ?? item.codeempid)
      .filter(Boolean)
      .join(', ');
  }

  return parseArray(ticket.groups_assignees_json)
    .flatMap((group) => parseArray(group.members_json))
    .filter((member) => member.is_assigned === 1 || member.is_assigned === true)
    .map((member) => member.assigned_name ?? member.name ?? member.codeempid)
    .filter(Boolean)
    .join(', ');
}

export function exportTicketLogsToExcel(tickets: any[], fileName: string): void {
  const rows = tickets.map((ticket) => ({
    'Ticket No.': ticket.ticket_number ?? ticket.ticketNumber ?? '-',
    Subject: ticket.subject ?? '-',
    Requester: ticket.requester_name ?? ticket.requesterName ?? '-',
    Department: ticket.deptName ?? ticket.department_name ?? ticket.coscent ?? '-',
    Company: ticket.COMPANY_CODE ?? ticket.company_code ?? '-',
    'Service Type': ticket.name_th ?? ticket.ticket_type_name_th ?? '-',
    Status: ticket.IT_Status ?? ticket.status ?? '-',
    'Assigned To': getAssigneeNames(ticket) || '-',
    Updated: ticket.updated_at
      ? dayjs(ticket.updated_at).format('DD/MM/YYYY HH:mm')
      : ticket.created_at
        ? dayjs(ticket.created_at).format('DD/MM/YYYY HH:mm')
        : '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 35 },
    { wch: 28 },
    { wch: 30 },
    { wch: 16 },
    { wch: 24 },
    { wch: 18 },
    { wch: 35 },
    { wch: 20 },
  ];

  const border = {
    top: { style: 'thin', color: { rgb: 'D1D5DB' } },
    bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
    left: { style: 'thin', color: { rgb: 'D1D5DB' } },
    right: { style: 'thin', color: { rgb: 'D1D5DB' } },
  };
  const range = XLSX.utils.decode_range(worksheet['!ref']!);

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
      if (!cell) continue;
      cell.s = { ...(cell.s ?? {}), border, alignment: { vertical: 'center' } };
    }
  }

  for (let col = range.s.c; col <= range.e.c; col++) {
    const header = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (!header) continue;
    header.s = {
      ...(header.s ?? {}),
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '217346' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border,
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, fileName);
}
