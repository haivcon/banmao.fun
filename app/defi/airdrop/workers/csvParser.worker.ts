// CSV Parser WebWorker — parses large CSV files off-main-thread
// Receives: { csvText: string, blacklist: string[], selfAddress?: string }
// Returns: { valid, invalid, duplicates, amounts, totalLines }

self.onmessage = function(e: MessageEvent) {
    const { csvText, blacklist = [], selfAddress } = e.data;
    const blacklistSet = new Set(blacklist.map((a: string) => a.toLowerCase()));
    const selfLower = selfAddress?.toLowerCase();

    const cleaned = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleaned.split('\n');
    const valid: string[] = [];
    const invalid: string[] = [];
    const duplicates: string[] = [];
    const amounts: Record<string, string> = {};
    const seen = new Set<string>();
    let processed = 0;

    for (const line of lines) {
        processed++;
        if (!line.trim()) continue;

        // Report progress every 1000 lines
        if (processed % 1000 === 0) {
            self.postMessage({ type: "progress", processed, total: lines.length });
        }

        const parts = line.split(/[,;\t]+/).map((s: string) => s.trim().replace(/^"|"$/g, ''));
        const addrPart = parts.find((p: string) => /0x[a-fA-F0-9]{40}/i.test(p));

        if (addrPart) {
            const match = addrPart.match(/0x[a-fA-F0-9]{40}/i);
            if (match) {
                const norm = match[0].toLowerCase();
                // Skip self
                if (selfLower && norm === selfLower) continue;
                // Skip blacklisted
                if (blacklistSet.has(norm)) continue;
                // Skip duplicates
                if (seen.has(norm)) { duplicates.push(match[0]); continue; }
                seen.add(norm);

                // Basic address validation (check hex format, skip checksum in worker)
                if (/^0x[a-fA-F0-9]{40}$/.test(match[0])) {
                    valid.push(match[0]);
                    // Find amount
                    const amountPart = parts.find((p: string) => {
                        if (p === addrPart) return false;
                        const c = p.replace(/"/g, '').replace(/,/g, '').trim();
                        return /^\d+(\.\d+)?(e[+-]?\d+)?$/i.test(c);
                    });
                    if (amountPart) {
                        amounts[norm] = amountPart.replace(/"/g, '').replace(/,/g, '').trim();
                    }
                } else {
                    invalid.push(line);
                }
            }
        } else if (line.trim().startsWith("0x")) {
            invalid.push(line);
        }
    }

    self.postMessage({
        type: "result",
        valid,
        invalid,
        duplicates,
        amounts,
        totalLines: lines.length,
    });
};
