import { createDesktopViewport } from "../../lib/responsive/displayStandard";

export const viewport = createDesktopViewport("#05070d");

export default function CollectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}