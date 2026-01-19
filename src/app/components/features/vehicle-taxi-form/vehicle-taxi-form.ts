import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-vehicle-taxi-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-taxi-form.html',
  styleUrl: './vehicle-taxi-form.scss'
})
export class VehicleTaxiFormComponent implements OnInit {
  @Output() onClose = new EventEmitter<void>();
  items: any[] = [];

  ngOnInit() {
    this.generateMockData();
  }

  generateMockData() {
    const mockRows = [
      { date: '01/10/2025', type: 'W', checkIn: '09:14', checkOut: '17:56', desc: 'ถ่ายงานหลังรายการแฉ', dest: 'Bravo Studio', dist: 120, amt: 120, selected: true },
      { date: '02/10/2025', type: 'W', checkIn: '09:16', checkOut: '18:16', desc: 'สแตนด์บายงาน', dest: 'GMM Studio', dist: 120, amt: 120, selected: true },
      { date: '03/10/2025', type: 'W', checkIn: '09:34', checkOut: '18:15', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '04/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '05/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '06/10/2025', type: 'W', checkIn: '09:20', checkOut: '18:10', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '07/10/2025', type: 'W', checkIn: '09:15', checkOut: '18:22', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '08/10/2025', type: 'W', checkIn: '09:26', checkOut: '18:22', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '09/10/2025', type: 'W', checkIn: '09:22', checkOut: '18:13', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '10/10/2025', type: 'W', checkIn: '08:58', checkOut: '18:14', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '11/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '12/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '13/10/2025', type: 'T', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '14/10/2025', type: 'W', checkIn: '09:24', checkOut: '18:39', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '15/10/2025', type: 'W', checkIn: '09:12', checkOut: '17:40', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '16/10/2025', type: 'W', checkIn: '09:17', checkOut: '18:27', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '17/10/2025', type: 'W', checkIn: '11:19', checkOut: '16:59', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '18/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '19/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '20/10/2025', type: 'W', checkIn: '09:19', checkOut: '15:55', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '21/10/2025', type: 'W', checkIn: '09:17', checkOut: '18:36', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '22/10/2025', type: 'W', checkIn: '09:46', checkOut: '18:05', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '23/10/2025', type: 'T', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '24/10/2025', type: 'L', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '25/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '26/10/2025', type: 'H', checkIn: '', checkOut: '', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '27/10/2025', type: 'W', checkIn: '09:31', checkOut: '18:15', desc: 'ทดสอบการเบิก', dest: 'ทดสอบการเบิก', dist: 0, amt: 0, selected: true },
      { date: '28/10/2025', type: 'W', checkIn: '09:52', checkOut: '18:39', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '29/10/2025', type: 'W', checkIn: '09:37', checkOut: '18:13', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '30/10/2025', type: 'W', checkIn: '09:44', checkOut: '18:51', desc: '', dest: '', dist: 0, amt: 0, selected: false },
      { date: '31/10/2025', type: 'W', checkIn: '09:39', checkOut: '18:09', desc: '', dest: '', dist: 0, amt: 0, selected: false }
    ];

    this.items = mockRows.map(row => ({
      selected: row.selected,
      date: row.date,
      type: row.type,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      desc: row.desc,
      destination: row.dest,
      distance: row.dist,
      amount: row.amt
    }));
  }

  getTotalAmount() {
    return this.items
      .filter(i => i.selected)
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }

  save() {
    console.log('Data saved:', this.items.filter(i => i.selected));
    this.onClose.emit();
  }

  cancel() {
    this.onClose.emit();
  }
}