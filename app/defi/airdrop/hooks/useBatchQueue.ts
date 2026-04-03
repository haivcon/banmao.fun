// Transaction Queue with IndexedDB — persistent job queue that survives browser crashes
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RecipientEntry, SendResult } from "../components/airdropTypes";

// ===================== IndexedDB Helpers =====================
const DB_NAME = "banmao_airdrop_queue";
const DB_VERSION = 1;
const STORE_NAME = "jobs";

export interface QueueJob {
    id: string;
    batchIndex: number;
    entries: RecipientEntry[];
    status: "pending" | "sending" | "confirmed" | "failed";
    results: SendResult[];
    txHash?: string;
    error?: string;
    createdAt: number;
    updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllJobs(): Promise<QueueJob[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function putJob(job: QueueJob): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(job);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function deleteJob(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function clearAllJobs(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ===================== Hook =====================
export interface BatchQueueState {
    jobs: QueueJob[];
    activeJob: QueueJob | null;
    isProcessing: boolean;
    /** Create jobs from entries, splitting into batches */
    enqueue: (entries: RecipientEntry[], batchSize: number) => Promise<QueueJob[]>;
    /** Update a job's status */
    updateJob: (id: string, updates: Partial<QueueJob>) => Promise<void>;
    /** Mark current job done and move to next */
    completeJob: (id: string, results: SendResult[], txHash?: string) => Promise<void>;
    /** Mark job as failed */
    failJob: (id: string, error: string) => Promise<void>;
    /** Pause processing */
    pause: () => void;
    /** Resume processing */
    resume: () => void;
    /** Clear entire queue */
    clearQueue: () => Promise<void>;
    /** Get aggregated results from all completed jobs */
    getAllResults: () => SendResult[];
    /** Total progress: completed entries / total entries */
    progress: { completed: number; total: number; percent: number };
}

export function useBatchQueue(): BatchQueueState {
    const [jobs, setJobs] = useState<QueueJob[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const pausedRef = useRef(false);

    // Load jobs from IndexedDB on mount
    useEffect(() => {
        getAllJobs().then(setJobs).catch(console.error);
    }, []);

    const refreshJobs = useCallback(async () => {
        const all = await getAllJobs();
        setJobs(all.sort((a, b) => a.batchIndex - b.batchIndex));
    }, []);

    const enqueue = useCallback(async (entries: RecipientEntry[], batchSize: number): Promise<QueueJob[]> => {
        // Clear previous queue
        await clearAllJobs();
        
        const newJobs: QueueJob[] = [];
        const now = Date.now();
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            const job: QueueJob = {
                id: `job_${now}_${i}`,
                batchIndex: Math.floor(i / batchSize),
                entries: batch,
                status: "pending",
                results: [],
                createdAt: now,
                updatedAt: now,
            };
            await putJob(job);
            newJobs.push(job);
        }
        setJobs(newJobs);
        setIsProcessing(true);
        pausedRef.current = false;
        return newJobs;
    }, []);

    const updateJob = useCallback(async (id: string, updates: Partial<QueueJob>) => {
        const all = await getAllJobs();
        const job = all.find(j => j.id === id);
        if (job) {
            const updated = { ...job, ...updates, updatedAt: Date.now() };
            await putJob(updated);
            await refreshJobs();
        }
    }, [refreshJobs]);

    const completeJob = useCallback(async (id: string, results: SendResult[], txHash?: string) => {
        await updateJob(id, { status: "confirmed", results, txHash });
    }, [updateJob]);

    const failJob = useCallback(async (id: string, error: string) => {
        await updateJob(id, { status: "failed", error });
    }, [updateJob]);

    const pause = useCallback(() => {
        pausedRef.current = true;
        setIsProcessing(false);
    }, []);

    const resume = useCallback(() => {
        pausedRef.current = false;
        setIsProcessing(true);
    }, []);

    const clearQueue = useCallback(async () => {
        await clearAllJobs();
        setJobs([]);
        setIsProcessing(false);
    }, []);

    const getAllResults = useCallback((): SendResult[] => {
        return jobs.flatMap(j => j.results);
    }, [jobs]);

    const activeJob = jobs.find(j => j.status === "sending") || jobs.find(j => j.status === "pending") || null;

    const progress = {
        completed: jobs.filter(j => j.status === "confirmed").reduce((s, j) => s + j.entries.length, 0),
        total: jobs.reduce((s, j) => s + j.entries.length, 0),
        percent: jobs.length === 0 ? 0 : Math.round(
            (jobs.filter(j => j.status === "confirmed").reduce((s, j) => s + j.entries.length, 0) /
            jobs.reduce((s, j) => s + j.entries.length, 0)) * 100
        ),
    };

    return {
        jobs,
        activeJob,
        isProcessing,
        enqueue,
        updateJob,
        completeJob,
        failJob,
        pause,
        resume,
        clearQueue,
        getAllResults,
        progress,
    };
}
