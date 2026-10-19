import type { Metadata } from "next";
import { HistorySection } from "@/components/public/Sections";

export const metadata: Metadata = { title: "Our story" };

export default function HistoryPage() {
  return <HistorySection heading="h1" />;
}
