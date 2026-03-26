/**
 * GameRules Component
 * Displays game rules with animated icons
 */

"use client";

import React from "react";
import type { LocaleStrings } from "../lib/i18n";

export interface RuleAccent {
    icon: string;
    className: string;
}

export interface GameRulesProps {
    t: LocaleStrings;
    rules: string[];
    ruleAccents: readonly RuleAccent[];
    className?: string;
}

export default function GameRules({
    t,
    rules,
    ruleAccents,
    className = "",
}: GameRulesProps) {
    return (
        <section className={`game-rules ${className}`}>
            <h3 className="glowing-title">{t.rules ?? "Rules"}</h3>
            <ol className="game-rules__list">
                {rules.map((rule, index) => {
                    const accent = ruleAccents[index % ruleAccents.length];
                    return (
                        <li key={index} className={`game-rules__item ${accent?.className ?? ""}`}>
                            {accent?.icon && (
                                <span className="game-rules__icon" aria-hidden="true">
                                    {accent.icon}
                                </span>
                            )}
                            <span className="game-rules__text">{rule}</span>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
