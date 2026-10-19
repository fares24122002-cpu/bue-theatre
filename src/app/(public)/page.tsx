import { Suspense } from "react";
import {
  GallerySection,
  HistorySection,
  ShowsSection,
  TaglineBand,
  TeamSection,
} from "@/components/public/Sections";

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <HistorySection heading="h1" />
      </Suspense>
      <Suspense fallback={null}>
        <TeamSection />
      </Suspense>
      <Suspense fallback={null}>
        <ShowsSection />
      </Suspense>
      <Suspense fallback={null}>
        <GallerySection />
      </Suspense>
      <Suspense fallback={null}>
        <TaglineBand />
      </Suspense>
    </>
  );
}
