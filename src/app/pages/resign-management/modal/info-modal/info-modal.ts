import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ItAssetService } from '../../../../services/it-asset.service';
import { DateUtilityService } from '../../../../services/date-utility.service';

@Component({
  selector: 'app-info-modal',
  imports: [],
  templateUrl: './info-modal.html',
  styleUrl: './info-modal.scss',
})
export class InfoModal implements OnChanges {
  @Input() emp: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();
  dataUtil = inject(DateUtilityService);

  emp_asset: any[] = [];
  userId_asset: string = '';

  loading = true;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['emp'] && changes['emp'].currentValue) {
      this.loading = true;
      console.log('emp changed:', changes['emp'].currentValue);
      this.getItAssetByAduser(this.emp.adUser).subscribe({
        next: (res) => {
          console.log(res)
          this.emp_asset = res.data.rows
          this.userId_asset = res.userId_asset
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error fetching data:', error);
          this.loading = false;
        }
      })
    }
  }

  constructor(
    private itAssetService: ItAssetService,
    private cdr: ChangeDetectorRef,
  ) {
  }

  close() {
    this.closeModal.emit();
  }

  getItAssetByAduser(adUser: string) {
    return this.itAssetService.GetItAssetByAD('SNIPE-IT', adUser)
  }
}
