export async function forceDownloadFile(url: string, fileName: string): Promise<void> {
  // if (!isBrowserViewable(fileName)) {
  //   directDownload(url, fileName);
  //   return;
  // }

  try {
    await blobDownload(url, fileName);
  } catch (error) {
    console.warn('Blob download failed, falling back to direct download:', error);
    directDownload(url, fileName);
  }
}

function isBrowserViewable(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt'].includes(ext);
}

async function blobDownload(url: string, fileName: string): Promise<void> {
  console.log('url : ', url);
  const response = await fetch(toSameOriginFileUrl(url), { credentials: 'omit' });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = fileName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

function toSameOriginFileUrl(url: string): string {
  try {
    const fileUrl = new URL(url);

    if (fileUrl.hostname === '10.31.1.85' && fileUrl.pathname.startsWith('/uploads/')) {
      console.log('fileUrl : ', fileUrl);
      return `${fileUrl.pathname}${fileUrl.search}`;
    }
  } catch {
    return url;
  }

  return url;
}

function directDownload(url: string, fileName: string): void {
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.target = '_blank';
  link.rel = 'noopener';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
