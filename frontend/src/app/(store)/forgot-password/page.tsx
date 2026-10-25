import type { Metadata } from "next";

import AuthFlow from "@/components/auth/AuthFlow";

export const metadata: Metadata = {
  title: "Forgot Password",
};

export default function Page() {
  return <AuthFlow mode="forgot" />;
}