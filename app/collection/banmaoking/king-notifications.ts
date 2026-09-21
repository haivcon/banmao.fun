import toast from "react-hot-toast";
import { KING_T, type Lang } from "./i18n";

// One stable ID bounds repeated clipboard feedback to a single notification.
export async function copyKingAddress(address: string, lang: Lang): Promise<void> {
  const t = KING_T[lang];
  try {
    await navigator.clipboard.writeText(address);
    toast.success(t.copied, { id: "king-copy", duration: 3500, toasterId: "king" });
  } catch {
    toast.error(t.copyFailed, { id: "king-copy", duration: 6000, toasterId: "king" });
  }
}
