// One in-flight feed request. Resets supersede old requests; appends never overlap.
export function createHubRequestGate() {
    let active: AbortController | null = null;
    return {
        begin(reset: boolean) {
            if (active && !reset) return null;
            active?.abort();
            const controller = new AbortController();
            active = controller;
            return {
                signal: controller.signal,
                isCurrent: () => active === controller && !controller.signal.aborted,
                finish: () => { if (active === controller) active = null; },
            };
        },
        cancel() { active?.abort(); active = null; },
    };
}

export function appendUniqueHubPosts<T extends { id: number | string }>(previous: T[], incoming: T[]): T[] {
    const seen = new Set(previous.map(post => String(post.id)));
    return [...previous, ...incoming.filter(post => {
        const id = String(post.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    })];
}
