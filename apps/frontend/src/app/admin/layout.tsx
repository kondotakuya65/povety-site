import type { Metadata } from "next";
import AdminShell from "@/components/AdminShell";

export const metadata: Metadata = {
  title: "Admin",
  description: "Prosperax admin console",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
