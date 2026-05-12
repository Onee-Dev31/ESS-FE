export const FALLBACK_AVATAR = 'assets/images/user.png';

export function onImgError(event: Event): void {
  const img = event.target as HTMLImageElement;
  if (!img.src.includes(FALLBACK_AVATAR)) {
    img.src = FALLBACK_AVATAR;
  }
}
