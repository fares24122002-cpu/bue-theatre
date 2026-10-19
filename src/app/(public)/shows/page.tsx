import type { Metadata } from "next";
import { ShowsSection } from "@/components/public/Sections";

export const metadata: Metadata = { title: "Shows" };

export default function ShowsPage() {
  return <ShowsSection heading="h1" showPast />;
}
