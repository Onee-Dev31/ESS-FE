import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ItAssetService } from '../../../../services/it-asset.service';
import { DateUtilityService } from '../../../../services/date-utility.service';
import { catchError, forkJoin, of } from 'rxjs';

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

  onee_user: any;

  loading = true;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['emp'] && changes['emp'].currentValue) {
      this.loading = true;

      forkJoin({
        asset: this.getItAssetByAduser(this.emp.adUser).pipe(
          catchError(err => {
            console.error('asset error', err);
            return of(null);
          })
        ),
        onee: this.getOneeuserByAduser(this.emp.adUser).pipe(
          catchError(err => {
            console.error('onee error', err);
            return of(null);
          })
        )
      }).subscribe({
        next: (res) => {
          console.log("res", res)
          // API 1
          this.emp_asset = res.asset.data.rows;
          this.userId_asset = res.asset.userId_asset;

          // API 2
          this.onee_user = res.onee;

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error fetching data:', error);
          this.loading = false;
        }
      });
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

  getOneeuserByAduser(adUser: string) {
    return this.itAssetService.getOneeuserByAd(adUser)
  }
}
