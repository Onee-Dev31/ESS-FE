import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';


@Injectable({
    providedIn: 'root',
})
export class ItAssetService {
    private baseUrl = environment.api_url;

    constructor(private _http: HttpClient, private authService: AuthService) { }

    GetItAssetByAD(systemcode: string, username: string) {
        return this._http.get<any>(
            `${this.baseUrl}/it/get-it-asset-by-AD?systemcode=${systemcode}&username=${username}`
        );
    }

    getOneeuserByAd(adUser: string): Observable<any> {
        const headers = new HttpHeaders({
            Authorization: `Bearer ${this.authService.allData()?.accessToken ?? ''}`
        });
        const url = `https://oneeuserapi.oneeclick.co/api/ActiveDirectory/GetUserInfo?samAccountName=${adUser}`
        return this._http.get(url, { headers });
    }
}