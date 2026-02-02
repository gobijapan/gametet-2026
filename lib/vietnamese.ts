/**
 * Remove Vietnamese diacritics from a string
 * Example: "NGUYỄN" -> "NGUYEN"
 */
export function removeDiacritics(str: string): string {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

/**
 * Compare two strings without diacritics (case-insensitive)
 */
export function compareWithoutDiacritics(str1: string, str2: string): boolean {
    return removeDiacritics(str1.toUpperCase()) === removeDiacritics(str2.toUpperCase());
}
