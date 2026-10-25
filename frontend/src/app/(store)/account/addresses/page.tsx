import type { Metadata } from "next";

import AddressBook from "@/components/account/AddressBook";

export const metadata: Metadata = {
  title: "Delivery Addresses",
};

export default function AddressesPage() {
  return <AddressBook />;
}