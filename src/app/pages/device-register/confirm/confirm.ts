import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  PasskeyRegistrationService,
  PublicKeyCredentialCreationOptionsJSON,
} from '../../../services/passkey-registration.service';

@Component({
  selector: 'app-device-register-confirm',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm.html',
  styleUrl: './confirm.scss',
})
export class DeviceRegisterConfirmComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private passkeyService = inject(PasskeyRegistrationService);

  qrToken = '';
  maskedToken = signal('');
  loading = signal(false);
  errorMessage = signal('');
  registrationOptions = signal<PublicKeyCredentialCreationOptionsJSON | null>(null);
  credentialJson = signal<Record<string, unknown> | null>(null);
  copiedSection = signal<'options' | 'credential' | null>(null);

  ngOnInit(): void {
    this.qrToken = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.qrToken) {
      this.errorMessage.set('ไม่พบ QR Token กรุณาสแกน QR Code ใหม่อีกครั้ง');
      return;
    }
    this.maskedToken.set(`${this.qrToken.slice(0, 6)}••••${this.qrToken.slice(-4)}`);
  }

  createPasskey(): void {
    if (!this.qrToken || this.loading()) return;
    if (!window.PublicKeyCredential || !navigator.credentials) {
      this.errorMessage.set('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับ Passkey');
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.credentialJson.set(null);
    this.passkeyService
      .getRegistrationOptions(this.qrToken)
      .subscribe({
        next: async (options) => {
          this.registrationOptions.set(options);
          try {
            const credential = (await navigator.credentials.create({
              publicKey: this.toBrowserOptions(options),
            })) as PublicKeyCredential | null;
            if (!credential) throw new Error('ไม่ได้รับ Credential จากอุปกรณ์');
            this.credentialJson.set(this.serializeCredential(credential));
          } catch (error) {
            this.errorMessage.set(error instanceof Error ? error.message : 'ไม่สามารถสร้าง Passkey ได้');
          } finally {
            this.loading.set(false);
          }
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set(error?.error?.message ?? 'ไม่สามารถโหลด Registration Options ได้ กรุณาลองใหม่');
        },
      });
  }

  async copyJson(section: 'options' | 'credential'): Promise<void> {
    const value = section === 'options' ? this.registrationOptions() : this.credentialJson();
    if (!value) return;
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    this.copiedSection.set(section);
    setTimeout(() => this.copiedSection.set(null), 1600);
  }

  formatJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  private toBrowserOptions(options: PublicKeyCredentialCreationOptionsJSON): PublicKeyCredentialCreationOptions {
    return {
      ...options,
      challenge: this.base64UrlToBuffer(options.challenge),
      user: { ...options.user, id: this.base64UrlToBuffer(options.user.id) },
      excludeCredentials: options.excludeCredentials?.map((item) => ({
        ...item,
        id: this.base64UrlToBuffer(item.id),
      })),
    };
  }

  private serializeCredential(credential: PublicKeyCredential): Record<string, unknown> {
    const response = credential.response as AuthenticatorAttestationResponse;
    return {
      id: credential.id,
      rawId: this.bufferToBase64Url(credential.rawId),
      type: credential.type,
      authenticatorAttachment: credential.authenticatorAttachment,
      response: {
        clientDataJSON: this.bufferToBase64Url(response.clientDataJSON),
        attestationObject: this.bufferToBase64Url(response.attestationObject),
        transports: response.getTransports?.() ?? [],
      },
      clientExtensionResults: credential.getClientExtensionResults(),
    };
  }

  private base64UrlToBuffer(value: string): ArrayBuffer {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)).buffer;
  }

  private bufferToBase64Url(value: ArrayBuffer): string {
    let binary = '';
    new Uint8Array(value).forEach((byte) => (binary += String.fromCharCode(byte)));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
}
