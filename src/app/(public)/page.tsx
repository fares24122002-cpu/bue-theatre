import { Suspense } from "react";
import {
  GallerySection,
  HistorySection,
  ShowsSection,
  TaglineBand,
  TeamSection,
} from "@/components/public/Sections";

/** The whole public site on one page: history, team, shows, gallery. */
export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <HistorySection />
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
