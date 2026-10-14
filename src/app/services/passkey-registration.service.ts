import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SKIP_AUTH } from '../interceptors/auth.interceptor';
import { environment } from '../../environments/environment';

export interface PublicKeyCredentialCreationOptionsJSON {
  challenge: string;
  rp: PublicKeyCredentialRpEntity;
  user: Omit<PublicKeyCredentialUserEntity, 'id'> & { id: string };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  excludeCredentials?: Array<Omit<PublicKeyCredentialDescriptor, 'id'> & { id: string }>;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  extensions?: AuthenticationExtensionsClientInputs;
}

@Injectable({ providedIn: 'root' })
export class PasskeyRegistrationService {
  private http = inject(HttpClient);
  private readonly baseUrl =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? environment.passkey_api_url
      : '/api';

  getRegistrationOptions(qrToken: string) {
    return this.http.post<PublicKeyCredentialCreationOptionsJSON>(
      `${this.baseUrl}/passkeys/register/options`,
      { qrToken },
      { context: new HttpContext().set(SKIP_AUTH, true) },
    );
  }
}
