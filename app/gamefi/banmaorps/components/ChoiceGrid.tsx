/**
 * ChoiceGrid Component
 * Grid of Rock/Paper/Scissors choice cards
 */

"use client";

import React from "react";
import ChoiceCard from "./ChoiceCard";
import type { LocaleStrings } from "../lib/i18n";
import type { Choice } from "../lib/types";

export interface ChoiceOption {
    k: Choice;
    label: string;
    img: string;
}

export interface ChoiceGridProps {
    choices: readonly ChoiceOption[];
    selectedChoice: Choice;
    onSelect: (choice: Choice) => void;
    title?: string;
    t: LocaleStrings;
    className?: string;
}

export default function ChoiceGrid({
    choices,
    selectedChoice,
    onSelect,
    title,
    t,
    className = "",
}: ChoiceGridProps) {
    return (
        <section className={`rps-wrap ${className}`}>
            {title && <h3 className="glowing-title">{title}</h3>}
            <div className="rps-grid">
                {choices.map((c) => (
                    <ChoiceCard
                        key={c.k}
                        label={c.label}
                        src={c.img}
                        selected={selectedChoice === c.k}
                        onClick={() => onSelect(c.k)}
                    />
                ))}
            </div>
        </section>
    );
}
