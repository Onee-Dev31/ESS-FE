import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';


@Injectable({
    providedIn: 'root',
})
export class ItAssetService {
    private baseUrl = environment.api_url;

    constructor(private _http: HttpClient) { }

    GetItAssetByAD(systemcode: string, username: string) {
        return this._http.get<any>(
            `${this.baseUrl}/it/get-it-asset-by-AD?systemcode=${systemcode}&username=${username}}`
        );
    }
}