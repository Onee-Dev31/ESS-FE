export class formatText {

    static getFormatTextHTML(text: string): string {
        return text.replace(/\r?\n/g, '<br>');
    }
}