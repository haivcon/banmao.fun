/**
 * Utility to convert numbers to words in multiple languages.
 * Supports: EN, VI, ZH, KO, RU, ID
 */

export type SupportLanguage = "en" | "vi" | "zh" | "ko" | "ru" | "id";

export function numberToWords(num: number, lang: SupportLanguage): string {
    const n = Math.floor(num);
    const decimal = Math.round((num - n) * 100);

    let res = "";
    if (n === 0 && decimal === 0) return lang === "vi" ? "Không" : lang === "zh" ? "零" : "Zero";

    if (n > 0 || decimal === 0) {
        switch (lang) {
            case "vi": res = convertVietnamese(n); break;
            case "en": res = convertEnglish(n); break;
            case "zh": res = convertChinese(n); break;
            case "ko": res = convertKorean(n); break;
            case "ru": res = convertRussian(n); break;
            case "id": res = convertIndonesian(n); break;
            default: res = n.toString();
        }
    }

    if (decimal > 0) {
        const point = {
            vi: " phẩy ",
            en: " point ",
            zh: " 点 ",
            ko: " 점 ",
            ru: " запятая ",
            id: " koma "
        }[lang] || ".";

        let decimalStr = "";
        switch (lang) {
            case "vi": decimalStr = convertVietnamese(decimal); break;
            case "en": decimalStr = convertEnglish(decimal); break;
            case "zh": decimalStr = convertChinese(decimal); break;
            case "ko": decimalStr = convertKorean(decimal); break;
            case "ru": decimalStr = convertRussian(decimal); break;
            case "id": decimalStr = convertIndonesian(decimal); break;
            default: decimalStr = decimal.toString();
        }
        res += point + decimalStr.toLowerCase();
    }

    return res.trim();
}

// --- VIETNAMESE ---
function convertVietnamese(num: number): string {
    const units = ["", "Một", "Hai", "Ba", "Bốn", "Năm", "Sáu", "Bảy", "Tám", "Chín"];
    const scales = ["", "Nghìn", "Triệu", "Tỷ", "Nghìn Tỷ"];

    if (num === 0) return "Không";

    function readThreeDigits(n: number, isLast: boolean): string {
        let res = "";
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (h > 0) {
            res += units[h] + " Trăm ";
        } else if (!isLast) {
            res += "Không Trăm ";
        }

        if (t > 1) {
            res += units[t] + " Mươi ";
            if (u === 1) res += "Mốt";
            else if (u === 5) res += "Lăm";
            else if (u > 0) res += units[u];
        } else if (t === 1) {
            res += "Mười ";
            if (u === 5) res += "Lăm";
            else if (u === 0) res += "";
            else res += units[u];
        } else if (u > 0) {
            if (h > 0 || !isLast) res += "Linh ";
            res += units[u];
        }

        return res.trim();
    }

    let res = "";
    let scaleIdx = 0;
    let temp = num;

    while (temp > 0) {
        const part = temp % 1000;
        if (part > 0) {
            const partStr = readThreeDigits(part, temp < 1000);
            res = partStr + " " + scales[scaleIdx] + " " + res;
        } else if (scaleIdx > 0 && temp >= 1000 && (temp % 1000000 % 1000) === 0) {
            // Check if we need a "Lẻ" or "Không" placeholder for skipped scales in some regions?
            // For now, simpler is safer, but "Lẻ" is handled in readThreeDigits u > 0.
        }
        temp = Math.floor(temp / 1000);
        scaleIdx++;
    }

    return res.trim().replace(/\s+/g, " ");
}

// --- ENGLISH ---
function convertEnglish(num: number): string {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const scales = ["", "Thousand", "Million", "Billion", "Trillion"];

    function helper(n: number): string {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
        if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + helper(n % 100) : "");
        return "";
    }

    let res = "";
    let scaleIdx = 0;
    let temp = num;

    while (temp > 0) {
        if (temp % 1000 !== 0) {
            res = helper(temp % 1000) + " " + scales[scaleIdx] + " " + res;
        }
        temp = Math.floor(temp / 1000);
        scaleIdx++;
    }

    return res.trim();
}

// --- CHINESE (Myriad System) ---
function convertChinese(num: number): string {
    const units = "零一二三四五六七八九";
    const positions = ["", "十", "百", "千"];
    const scales = ["", "万", "亿", "兆"];

    function readSection(n: number): string {
        let res = "";
        let zero = false;
        for (let i = 0; i < 4; i++) {
            const digit = Math.floor(n / Math.pow(10, 3 - i)) % 10;
            if (digit === 0) {
                if (res !== "") zero = true;
            } else {
                if (zero) {
                    res += units[0];
                    zero = false;
                }
                res += units[digit] + positions[3 - i];
            }
        }
        // Special case for 10-19: "一十" -> "十"
        if (res.startsWith("一十")) res = res.substring(1);
        return res;
    }

    let res = "";
    let scaleIdx = 0;
    let temp = num;

    while (temp > 0) {
        const part = temp % 10000;
        if (part > 0) {
            const section = readSection(part);
            res = section + scales[scaleIdx] + res;
        }
        temp = Math.floor(temp / 10000);
        scaleIdx++;
    }

    return res || "零";
}

// --- KOREAN (Myriad System) ---
function convertKorean(num: number): string {
    const units = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
    const positions = ["", "십", "백", "천"];
    const scales = ["", "만", "억", "조"];

    function readSection(n: number): string {
        let res = "";
        for (let i = 0; i < 4; i++) {
            const digit = Math.floor(n / Math.pow(10, i)) % 10;
            if (digit > 0) {
                const char = (digit === 1 && i > 0) ? "" : units[digit];
                res = char + positions[i] + res;
            }
        }
        return res;
    }

    let res = "";
    let scaleIdx = 0;
    let temp = num;

    while (temp > 0) {
        const part = temp % 10000;
        if (part > 0) {
            res = readSection(part) + scales[scaleIdx] + " " + res;
        }
        temp = Math.floor(temp / 10000);
        scaleIdx++;
    }

    return res.trim() || "영";
}

// --- RUSSIAN ---
function convertRussian(num: number): string {
    const ones = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
    const onesFem = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
    const teens = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
    const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
    const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

    const scales = [
        ["", "", ""],
        ["тысяча", "тысячи", "тысяч"],
        ["миллион", "миллиона", "миллионов"],
        ["миллиард", "миллиарда", "миллиардов"]
    ];

    function getPlural(n: number, forms: string[]): string {
        const n10 = n % 10;
        const n100 = n % 100;
        if (n10 === 1 && n100 !== 11) return forms[0];
        if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
        return forms[2];
    }

    function readThree(n: number, isFem: boolean): string {
        let res = "";
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (h > 0) res += hundreds[h] + " ";
        if (t === 1) {
            res += teens[u] + " ";
        } else {
            if (t > 1) res += tens[t] + " ";
            if (u > 0) res += (isFem ? onesFem[u] : ones[u]) + " ";
        }
        return res;
    }

    let res = "";
    let scaleIdx = 0;
    let temp = num;

    while (temp > 0) {
        const part = temp % 1000;
        if (part > 0) {
            const isFem = scaleIdx === 1; // "тысяча" is feminine
            res = readThree(part, isFem) + getPlural(part, scales[scaleIdx]) + " " + res;
        }
        temp = Math.floor(temp / 1000);
        scaleIdx++;
    }

    return res.trim();
}

// --- INDONESIAN ---
function convertIndonesian(num: number): string {
    const units = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan"];
    const scales = ["", "Ribu", "Juta", "Milyar", "Triliun"];

    function helper(n: number, idx: number): string {
        if (n === 0) return "";
        if (n === 1 && idx === 1) return "Seribu"; // Special case for 1000: "Satu Ribu" -> "Seribu"

        let res = "";
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (h > 0) {
            res += (h === 1 ? "Seratus" : units[h] + " Ratus") + " ";
        }

        if (t === 1) {
            if (u === 0) res += "Sepuluh ";
            else if (u === 1) res += "Sebelas ";
            else res += units[u] + " Belas ";
        } else {
            if (t > 1) res += units[t] + " Puluh ";
            if (u > 0) res += units[u] + " ";
        }

        return res.trim();
    }

    let res = "";
    let scaleIdx = 0;
    let temp = num;

    while (temp > 0) {
        const part = temp % 1000;
        if (part > 0) {
            const partStr = helper(part, scaleIdx);
            res = partStr + (scaleIdx > 0 && !(part === 1 && scaleIdx === 1) ? " " + scales[scaleIdx] : "") + " " + res;
        }
        temp = Math.floor(temp / 1000);
        scaleIdx++;
    }

    return res.trim();
}
