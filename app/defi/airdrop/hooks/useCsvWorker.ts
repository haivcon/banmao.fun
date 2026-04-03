// CSV Worker hook — wraps the WebWorker for CSV parsing
"use client";

import { useState, useRef, useCallback } from "react";

interface CsvParseResult {
    valid: string[];
    invalid: string[];
    duplicates: string[];
    amounts: Record<string, string>;
    totalLines: number;
}

export interface CsvWorkerState {
    /** Parse CSV text using WebWorker */
    parseCSV: (csvText: string, blacklist: string[], selfAddress?: string) => Promise<CsvParseResult>;
    /** Whether the worker is currently processing */
    isProcessing: boolean;
    /** Progress: 0-100 */
    progress: number;
}

export function useCsvWorker(): CsvWorkerState {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const workerRef = useRef<Worker | null>(null);

    const parseCSV = useCallback((csvText: string, blacklist: string[], selfAddress?: string): Promise<CsvParseResult> => {
        return new Promise((resolve, reject) => {
            setIsProcessing(true);
            setProgress(0);

            // Terminate any existing worker
            workerRef.current?.terminate();

            try {
                // Create worker inline using Blob URL (avoids Next.js worker path issues)
                const workerCode = `
                    self.onmessage = function(e) {
                        const { csvText, blacklist, selfAddress } = e.data;
                        const blacklistSet = new Set(blacklist.map(a => a.toLowerCase()));
                        const selfLower = selfAddress?.toLowerCase();
                        const cleaned = csvText.replace(/^\\uFEFF/, '').replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
                        const lines = cleaned.split('\\n');
                        const valid = [], invalid = [], duplicates = [];
                        const amounts = {};
                        const seen = new Set();
                        let processed = 0;
                        for (const line of lines) {
                            processed++;
                            if (!line.trim()) continue;
                            if (processed % 1000 === 0) {
                                self.postMessage({ type: "progress", processed, total: lines.length });
                            }
                            const parts = line.split(/[,;\\t]+/).map(s => s.trim().replace(/^"|"$/g, ''));
                            const addrPart = parts.find(p => /0x[a-fA-F0-9]{40}/i.test(p));
                            if (addrPart) {
                                const match = addrPart.match(/0x[a-fA-F0-9]{40}/i);
                                if (match) {
                                    const norm = match[0].toLowerCase();
                                    if (selfLower && norm === selfLower) continue;
                                    if (blacklistSet.has(norm)) continue;
                                    if (seen.has(norm)) { duplicates.push(match[0]); continue; }
                                    seen.add(norm);
                                    if (/^0x[a-fA-F0-9]{40}$/.test(match[0])) {
                                        valid.push(match[0]);
                                        const amountPart = parts.find(p => {
                                            if (p === addrPart) return false;
                                            const c = p.replace(/"/g, '').replace(/,/g, '').trim();
                                            return /^\\d+(\\.\\d+)?(e[+-]?\\d+)?$/i.test(c);
                                        });
                                        if (amountPart) amounts[norm] = amountPart.replace(/"/g, '').replace(/,/g, '').trim();
                                    } else { invalid.push(line); }
                                }
                            } else if (line.trim().startsWith("0x")) { invalid.push(line); }
                        }
                        self.postMessage({ type: "result", valid, invalid, duplicates, amounts, totalLines: lines.length });
                    };
                `;
                const blob = new Blob([workerCode], { type: "application/javascript" });
                const worker = new Worker(URL.createObjectURL(blob));
                workerRef.current = worker;

                worker.onmessage = (e) => {
                    if (e.data.type === "progress") {
                        setProgress(Math.round((e.data.processed / e.data.total) * 100));
                    } else if (e.data.type === "result") {
                        setIsProcessing(false);
                        setProgress(100);
                        worker.terminate();
                        workerRef.current = null;
                        resolve(e.data);
                    }
                };

                worker.onerror = (err) => {
                    setIsProcessing(false);
                    worker.terminate();
                    workerRef.current = null;
                    reject(err);
                };

                worker.postMessage({ csvText, blacklist, selfAddress });
            } catch (err) {
                // WebWorker not supported — fallback to synchronous parsing
                setIsProcessing(false);
                reject(err);
            }
        });
    }, []);

    return { parseCSV, isProcessing, progress };
}
