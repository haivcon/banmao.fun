"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectMenuOption = {
    label: string;
    value: string;
    description?: string;
};

interface Props {
    label?: string;
    value: string;
    options: SelectMenuOption[];
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
}

export default function SelectMenu({ label, value, options, onChange, disabled, className = "" }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);
    const selected = useMemo(() => options.find(option => option.value === value) || options[0], [options, value]);

    useEffect(() => {
        const close = (event: MouseEvent) => {
            if (!ref.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    return (
        <div ref={ref} className={`wc-select-menu ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${className}`}>
            <button type="button" className="wc-select-trigger" disabled={disabled} onClick={() => setOpen(current => !current)}>
                {label && <span className="wc-select-label">{label}</span>}
                <span className="wc-select-value">{selected?.label || "Select"}</span>
                <ChevronDown size={15} strokeWidth={2.5} />
            </button>
            {open && !disabled && (
                <div className="wc-select-popover">
                    {options.map(option => (
                        <button
                            type="button"
                            key={option.value}
                            className={option.value === value ? "active" : ""}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                        >
                            <span>
                                <strong>{option.label}</strong>
                                {option.description && <small>{option.description}</small>}
                            </span>
                            {option.value === value && <Check size={15} strokeWidth={2.6} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
