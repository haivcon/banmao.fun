import { lazy, Suspense } from "react";
const AIChatProvider=lazy(()=>import("./AIChatProvider"));
export default function AIChatMount(){if(process.env.AI_CHAT_ENABLED!=="true")return null;return <Suspense fallback={null}><AIChatProvider/></Suspense>;}
