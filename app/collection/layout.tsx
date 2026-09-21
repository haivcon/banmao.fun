import { createDesktopViewport } from "../../lib/responsive/displayStandard";
import CollectionPreferences from "./CollectionPreferences";


export const viewport = createDesktopViewport("#05070d");

export default function CollectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <><CollectionPreferences />{children}</>;
}