import Image from "next/image";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Language } from "./locals";

const LANGUAGES = [
    { code: "en", name: "English" },
    { code: "vi", name: "Tiếng Việt" },
    { code: "zh", name: "简体中文" },
    { code: "ko", name: "한국어" },
    { code: "ru", name: "Русский" },
    { code: "id", name: "Bahasa Indonesia" },
] as const satisfies ReadonlyArray<{ code: Language; name: string }>;

export function Web2DLanguageMenu({ language, label, onChange }: {
    language: Language;
    label: string;
    onChange: (language: Language) => void;
}) {
    const [open, setOpen] = useState(false);
    const wrapper = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const options = useRef<Array<HTMLButtonElement | null>>([]);
    const menuId = useId();
    const current = Math.max(0, LANGUAGES.findIndex(({ code }) => code === language));

    useEffect(() => {
        if (!open) return;
        options.current[current]?.focus();

        function closeOutside(event: PointerEvent) {
            if (event.target instanceof Node && !wrapper.current?.contains(event.target)) setOpen(false);
        }

        document.addEventListener("pointerdown", closeOutside);
        return () => document.removeEventListener("pointerdown", closeOutside);
    }, [current, open]);

    function closeAndFocus() {
        setOpen(false);
        trigger.current?.focus();
    }

    function handleOptionKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
        const last = LANGUAGES.length - 1;
        let target = index;

        switch (event.key) {
            case "ArrowDown": target = (index + 1) % LANGUAGES.length; break;
            case "ArrowUp": target = (index + last) % LANGUAGES.length; break;
            case "Home": target = 0; break;
            case "End": target = last; break;
            default: return;
        }

        event.preventDefault();
        options.current[target]?.focus();
    }

    return (
        <div
            className="web2d-locale"
            ref={wrapper}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
            }}
            onKeyDown={(event) => {
                if (open && event.key === "Escape") {
                    event.preventDefault();
                    closeAndFocus();
                }
            }}
        >
            <button
                type="button"
                className="web2d-topbar__control web2d-locale__trigger"
                ref={trigger}
                aria-label={`${label} · ${LANGUAGES[current].name}`}
                aria-expanded={open}
                aria-haspopup="menu"
                aria-controls={open ? menuId : undefined}
                onClick={() => setOpen(!open)}
                onKeyDown={(event) => {
                    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
            >
                <Image src={`/flags/${language}.png`} alt="" width={20} height={20} />
                <span>{language.toUpperCase()}</span>
                <ChevronDown aria-hidden="true" />
            </button>

            {open && (
                <div className="web2d-locale__panel">
                    <div className="web2d-locale__heading" id={`${menuId}-title`}>
                        <Globe2 aria-hidden="true" />
                        <span>{label}</span>
                    </div>
                    <div className="web2d-locale__options" id={menuId} role="menu" aria-labelledby={`${menuId}-title`}>
                        {LANGUAGES.map(({ code, name }, index) => (
                            <button
                                type="button"
                                role="menuitemradio"
                                key={code}
                                className="web2d-locale__option"
                                aria-checked={code === language}
                                lang={code}
                                tabIndex={-1}
                                ref={(element) => { options.current[index] = element; }}
                                onKeyDown={(event) => handleOptionKey(event, index)}
                                onClick={() => {
                                    onChange(code);
                                    closeAndFocus();
                                }}
                            >
                                <Image src={`/flags/${code}.png`} alt="" width={27} height={27} />
                                <span>{name}</span>
                                {code === language && <Check className="web2d-locale__check" aria-hidden="true" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
