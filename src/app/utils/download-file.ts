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

// async function blobDownload(url: string, fileName: string): Promise<void> {
//   console.log('url : ', url);
//   const response = await fetch(toSameOriginFileUrl(url), { credentials: 'omit' });
//   const response2 = await fetch(url);

//   if (!response.ok) {
//     throw new Error(`Download failed: ${response.status}`);
//   }

//   console.log('response > ', response);
//   console.log(response.headers.get('content-type'));
//   console.log('response2 > ', response);
//   console.log(response2.headers.get('content-type'));

//   const blob = await response.blob();
//   const blob2 = await response2.blob();
//   const objectUrl = URL.createObjectURL(blob);
//   const objectUrl2 = URL.createObjectURL(blob2);
//   const link = document.createElement('a');

//   link.href = objectUrl;
//   link.download = fileName;
//   link.style.display = 'none';

//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
//   URL.revokeObjectURL(objectUrl);
// }

async function blobDownload(url: string, fileName: string): Promise<void> {
  const sameOriginUrl = toSameOriginFileUrl(url);

  console.log('original url => ', url);
  console.log('same origin => ', sameOriginUrl);

  // TEST 1
  try {
    console.log('===== TEST 1 : same origin =====');

    const response1 = await fetch(sameOriginUrl, {
      credentials: 'omit',
    });

    console.log('response1 => ', response1);
    console.log('content-type => ', response1.headers.get('content-type'));

    const blob1 = await response1.blob();

    console.log('blob1.type => ', blob1.type);
    console.log('blob1.size => ', blob1.size);

    downloadBlob(blob1, `same-origin-${fileName}`);
  } catch (error) {
    console.error('TEST 1 FAILED', error);
  }

  // TEST 2
  try {
    console.log('===== TEST 2 : direct url =====');

    const response2 = await fetch(url);

    console.log('response2 => ', response2);
    console.log('content-type => ', response2.headers.get('content-type'));

    const blob2 = await response2.blob();

    console.log('blob2.type => ', blob2.type);
    console.log('blob2.size => ', blob2.size);

    downloadBlob(blob2, `direct-${fileName}`);
  } catch (error) {
    console.error('TEST 2 FAILED', error);
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;

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
