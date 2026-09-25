import { createSharingMetadata } from "../../lib/sharing/metadata";

export const metadata = createSharingMetadata("/collection");
import { redirect } from "next/navigation";
import CollectionLanding from "./CollectionLanding";
import { legacyCollectionPath } from "./collectionRoutes";

export default async function CollectionPage({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
        if (Array.isArray(value)) value.forEach(item => query.append(key, item));
        else if (value !== undefined) query.set(key, value);
    }
    const destination = legacyCollectionPath(query);
    if (destination) redirect(destination);
    return <CollectionLanding />;
}