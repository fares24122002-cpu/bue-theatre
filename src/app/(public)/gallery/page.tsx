import type { Metadata } from "next";
import { GallerySection } from "@/components/public/Sections";

export const metadata: Metadata = { title: "Gallery" };

export default function GalleryPage() {
  return <GallerySection heading="h1" limit={60} />;
}
