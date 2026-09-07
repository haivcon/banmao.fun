import "server-only";
import { createDraftStore } from "./transactions";

// Shared by the prepare and simulate routes within this server process.
export const draftStore = createDraftStore();
