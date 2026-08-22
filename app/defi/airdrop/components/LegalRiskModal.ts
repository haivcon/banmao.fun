// Legal Risk Modal — DOM-based modal for flagged address detection during batch airdrop
// Supports multi-select via checkboxes, single address paste, auto-detect, and Select All
// Returns: single address string, "AUTO", "MULTI:0x...,0x..." (comma-separated), or null

export interface FlagModalLabels {
    title: string;
    desc: string;
    batch: string;
    addresses: string;
    stop: string;
    autoDetect: string;
    remove: string;
    search: string;
    selectAll: string;
    flagSelected: string;
}

export function showLegalRiskModal(
    batchSize: number,
    labels: FlagModalLabels,
    batchAddrs?: string[]
): Promise<string | null> {
    return new Promise((resolve) => {
        document.getElementById("okx-flag-overlay")?.remove();
        const overlay = document.createElement("div");
        overlay.id = "okx-flag-overlay";
        overlay.className = "airdrop-viewport-overlay";
        Object.assign(overlay.style, {
            position: "fixed", inset: "0", zIndex: "999999",
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
        });
        const selectedSet = new Set<string>();
        const addrListHtml = (batchAddrs || []).map((a, i) =>
            `<div class="okx-addr-row" data-addr="${a}" style="display:flex;align-items:center;padding:5px 8px;font-size:12px;font-family:monospace;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:background 0.15s;">
                <input type="checkbox" class="okx-addr-chk" data-addr="${a}" style="margin-right:8px;cursor:pointer;accent-color:#ff4444;width:16px;height:16px;flex-shrink:0;" />
                <span style="color:#666;min-width:28px;">#${i + 1}</span>
                <span style="flex:1;color:#ccc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a}</span>
                <button class="okx-addr-del" data-addr="${a}" style="background:transparent;border:none;cursor:pointer;color:#ff4444;font-size:14px;padding:2px 6px;opacity:0.6;flex-shrink:0;" title="${labels.remove}">🗑️</button>
            </div>`
        ).join("");

        overlay.innerHTML = `
            <div class="airdrop-viewport-dialog" role="dialog" aria-modal="true" style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #ff4444;border-radius:16px;padding:24px;width:min(92vw,540px);box-shadow:0 0 60px rgba(255,68,68,0.4);max-height:85vh;display:flex;flex-direction:column;">
                <div style="font-size:22px;font-weight:700;color:#ff6b6b;margin-bottom:8px;text-align:center;">⚠️ ${labels.title}</div>
                <div style="font-size:12px;color:#ccc;margin-bottom:10px;text-align:center;line-height:1.5;">${labels.desc}</div>
                <div style="font-size:11px;color:#888;margin-bottom:10px;text-align:center;">📦 ${labels.batch}: ${batchSize} ${labels.addresses}</div>
                <input id="okx-flag-input" type="text" placeholder="🔍 ${labels.search || 'Search / Paste 0x...'}" autofocus
                    style="width:100%;padding:12px;background:#0d1117;border:2px solid #ff4444;border-radius:10px;color:#fff;font-size:14px;font-family:monospace;outline:none;margin-bottom:8px;box-sizing:border-box;" />
                <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px 6px;">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#aaa;">
                        <input type="checkbox" id="okx-flag-select-all" style="accent-color:#ff4444;width:16px;height:16px;cursor:pointer;" />
                        ${labels.selectAll || 'Select All'}
                    </label>
                    <span id="okx-flag-counter" style="font-size:12px;color:#ff6b6b;font-weight:600;">0 ${labels.flagSelected || 'selected'}</span>
                </div>
                <div id="okx-addr-list" style="max-height:200px;overflow-y:auto;background:rgba(0,0,0,0.3);border-radius:8px;margin-bottom:12px;border:1px solid rgba(255,255,255,0.08);">
                    ${addrListHtml}
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button id="okx-flag-cancel" style="flex:1;min-width:90px;padding:11px 0;background:#333;border:1px solid #555;border-radius:10px;color:#aaa;font-size:14px;cursor:pointer;font-weight:600;">❌ ${labels.stop}</button>
                    <button id="okx-flag-auto" style="flex:1;min-width:90px;padding:11px 0;background:linear-gradient(135deg,#0f7b6c,#4ecdc4);border:none;border-radius:10px;color:#fff;font-size:14px;cursor:pointer;font-weight:700;">🔍 ${labels.autoDetect}</button>
                    <button id="okx-flag-submit" style="flex:1;min-width:90px;padding:11px 0;background:linear-gradient(135deg,#ff4444,#cc0000);border:none;border-radius:10px;color:#fff;font-size:14px;cursor:pointer;font-weight:700;">🚫 ${labels.remove} (<span id="okx-flag-del-count">0</span>)</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const listEl = document.getElementById("okx-addr-list")!;
        const allRows = listEl.querySelectorAll(".okx-addr-row");
        const updateCounter = () => {
            const counterEl = document.getElementById("okx-flag-counter");
            const delCountEl = document.getElementById("okx-flag-del-count");
            if (counterEl) counterEl.textContent = `${selectedSet.size} ${labels.flagSelected || 'selected'}`;
            if (delCountEl) delCountEl.textContent = String(selectedSet.size);
        };
        const toggleAddr = (addr: string, checked: boolean) => {
            if (checked) selectedSet.add(addr); else selectedSet.delete(addr);
            const row = listEl.querySelector(`.okx-addr-row[data-addr="${addr}"]`) as HTMLElement;
            if (row) row.style.background = checked ? "rgba(255,68,68,0.15)" : "transparent";
            updateCounter();
        };

        setTimeout(() => {
            const inp = document.getElementById("okx-flag-input") as HTMLInputElement;
            inp?.focus();
            inp?.addEventListener("input", () => {
                const q = inp.value.toLowerCase().trim();
                allRows.forEach((row) => {
                    const addr = (row as HTMLElement).dataset.addr || "";
                    (row as HTMLElement).style.display = (!q || addr.includes(q)) ? "flex" : "none";
                });
            });
            inp?.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    const val = inp.value.trim();
                    if (val && /^0x[a-fA-F0-9]{40}$/i.test(val)) {
                        overlay.remove(); resolve(val);
                    }
                }
            });
        }, 100);

        // Checkbox handlers
        listEl.querySelectorAll(".okx-addr-chk").forEach(chk => {
            (chk as HTMLInputElement).onchange = () => {
                const addr = (chk as HTMLElement).dataset.addr || "";
                toggleAddr(addr, (chk as HTMLInputElement).checked);
            };
        });
        // Row click = toggle checkbox
        allRows.forEach(row => {
            (row as HTMLElement).onclick = (e) => {
                if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).classList.contains('okx-addr-del')) return;
                const addr = (row as HTMLElement).dataset.addr || "";
                const chk = row.querySelector('.okx-addr-chk') as HTMLInputElement;
                if (chk) { chk.checked = !chk.checked; toggleAddr(addr, chk.checked); }
            };
        });
        // Select All
        const selectAllEl = document.getElementById("okx-flag-select-all") as HTMLInputElement;
        if (selectAllEl) {
            selectAllEl.onchange = () => {
                const checked = selectAllEl.checked;
                listEl.querySelectorAll(".okx-addr-chk").forEach(chk => {
                    const el = chk as HTMLInputElement;
                    const addr = el.dataset.addr || "";
                    const row = el.closest('.okx-addr-row') as HTMLElement;
                    if (row && row.style.display !== 'none') {
                        el.checked = checked;
                        toggleAddr(addr, checked);
                    }
                });
            };
        }
        // Trash button = quick single-select toggle
        listEl.querySelectorAll(".okx-addr-del").forEach(btn => {
            (btn as HTMLElement).onclick = (e) => {
                e.stopPropagation();
                const addr = (btn as HTMLElement).dataset.addr || "";
                const chk = btn.closest('.okx-addr-row')?.querySelector('.okx-addr-chk') as HTMLInputElement;
                if (chk) { chk.checked = !chk.checked; toggleAddr(addr, chk.checked); }
            };
        });
        document.getElementById("okx-flag-cancel")!.onclick = () => { overlay.remove(); resolve(null); };
        document.getElementById("okx-flag-auto")!.onclick = () => { overlay.remove(); resolve("AUTO"); };
        document.getElementById("okx-flag-submit")!.onclick = () => {
            const inp = document.getElementById("okx-flag-input") as HTMLInputElement;
            if (selectedSet.size > 0) {
                overlay.remove();
                resolve("MULTI:" + Array.from(selectedSet).join(","));
                return;
            }
            overlay.remove(); resolve(inp?.value || null);
        };
    });
}
