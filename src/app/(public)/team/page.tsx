import type { Metadata } from "next";
import { TeamSection } from "@/components/public/Sections";

export const metadata: Metadata = { title: "Meet the team" };

export default function TeamPage() {
  return <TeamSection heading="h1" />;
}
