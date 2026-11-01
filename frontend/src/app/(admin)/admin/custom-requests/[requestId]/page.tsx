import type { Metadata } from "next";
import { AdminCustomRequestDetail } from "@/components/admin/CustomRequestManager";

export const metadata: Metadata = {
  title: "Custom Request Details | Studio Admin",
  robots: { index: false, follow: false },
};

export default async function AdminCustomRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  return <AdminCustomRequestDetail requestId={requestId} />;
}
