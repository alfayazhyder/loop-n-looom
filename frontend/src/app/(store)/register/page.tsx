import type { Metadata } from "next";

import AuthFlow from "@/components/auth/AuthFlow";

export const metadata: Metadata = {
  title: "Create Account",
};

export default function Page() {
  return <AuthFlow mode="register" />;
}