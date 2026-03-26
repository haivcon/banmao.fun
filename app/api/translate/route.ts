import { NextRequest, NextResponse } from "next/server";

const LANG_MAP: Record<string, string> = {
    en: "en",
    vi: "vi",
    zh: "zh-CN",
    ko: "ko",
    ru: "ru",
    id: "id",
};

export async function POST(req: NextRequest) {
    try {
        const { texts, lang } = await req.json();
        if (!texts || !Array.isArray(texts) || !lang) {
            return NextResponse.json({ error: "Missing texts or lang" }, { status: 400 });
        }

        if (lang === "en") {
            return NextResponse.json({ translations: texts });
        }

        const targetLang = LANG_MAP[lang] || lang;
        const results: string[] = [];

        // Batch translate using MyMemory API (free, 5000 words/day)
        for (const text of texts) {
            try {
                const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
                const resp = await fetch(url);
                const data = await resp.json();
                if (data.responseStatus === 200 && data.responseData?.translatedText) {
                    results.push(data.responseData.translatedText);
                } else {
                    results.push(text); // fallback to original
                }
            } catch {
                results.push(text);
            }
        }

        return NextResponse.json({ translations: results });
    } catch (err) {
        console.error("[translate] Error:", err);
        return NextResponse.json({ error: "Translation failed" }, { status: 500 });
    }
}
