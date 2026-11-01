import type { Metadata } from "next";
import AdminSupport from "@/components/admin/AdminSupport";

export const metadata: Metadata = { title: "Support Conversation | Admin", description: "Private customer support conversation", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return <AdminSupport conversationId={conversationId} />;
}
