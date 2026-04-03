export class formatText {

    static getFormatTextHTML(text: string | null): string {
        if (!text) return '';
        return text.replace(/\r?\n/g, '<br>');
    }

}

// export function formatMoney(value: any): string {
//     if (value === null || value === undefined) return '';

//     // แปลงเป็น string และลบทุกตัวที่ไม่ใช่ตัวเลขหรือจุดทศนิยม
//     let numStr = value.toString().replace(/[^0-9.]/g, '');

//     if (!numStr) return '';

//     // ตรวจสอบว่ามีจุดมากกว่า 1 จุดหรือไม่
//     const parts = numStr.split('.');
//     if (parts.length > 2) {
//         // เอาเฉพาะส่วนแรกและส่วนทศนิยมแรก
//         numStr = parts[0] + '.' + parts[1];
//     }

//     let number = Number(numStr);
//     if (isNaN(number)) return '';

//     // ปัดเศษ 2 ตำแหน่ง
//     let rounded = Math.round(number * 100) / 100;

//     let [integer, decimal] = rounded.toString().split('.');
//     integer = parseInt(integer, 10).toLocaleString('en-US');

//     return decimal ? `${integer}.${decimal.padEnd(2, '')}` : integer;
// }

export function formatMoneyInput(value: string): string {
    if (!value) return '';

    // ลบตัวอักษรที่ไม่ใช่ตัวเลข, จุด และ comma
    let sanitized = value.replace(/[^0-9\.,]/g, '');

    // แยก comma ออกก่อน
    sanitized = sanitized.replace(/,/g, '');

    // ตรวจสอบว่ามีจุดมากกว่า 1 จุด
    const parts = sanitized.split('.');
    if (parts.length > 2) {
        sanitized = parts[0] + '.' + parts[1];
    }

    // แยกจำนวนเต็มกับทศนิยม
    let [integerPart, decimalPart] = sanitized.split('.');

    // ถ้ามีทศนิยม ให้จำกัดแค่ 2 หลัก
    if (decimalPart !== undefined) {
        decimalPart = decimalPart.substring(0, 2);
    }

    // ใส่ comma เฉพาะจำนวนเต็ม
    const formattedInteger = parseInt(integerPart || '0', 10).toLocaleString('en-US');

    return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}