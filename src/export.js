// Excel export. SheetJS is loaded only when the button is pressed.
export function replyLabel(g) {
  if (!g.rsvp) return 'Pending';
  return g.rsvp.attending ? 'Attending' : 'Declined';
}

export function exportRows(guests) {
  return guests.map((g) => ({
    Guest: g.name,
    Reply: replyLabel(g),
    Seats: g.rsvp?.attending ? g.rsvp.seats : 0,
    'Seats reserved': g.maxSeats,
    Table: g.table || '',
    Mobile: g.rsvp?.phone || '',
    Message: g.rsvp?.message || '',
    Code: g.code,
  }));
}

export async function exportXlsx(guests, filePrefix = 'guest-list') {
  const XLSX = await import('xlsx');
  const rows = exportRows(guests);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 32 }, { wch: 11 }, { wch: 7 }, { wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 48 }, { wch: 10 }];
  ws['!autofilter'] = { ref: ws['!ref'] };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Guests');
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  XLSX.writeFile(wb, `${filePrefix}-${day}.xlsx`);
}
