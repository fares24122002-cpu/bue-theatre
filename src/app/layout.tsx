import type { Metadata } from "next";
// Fonts are bundled from npm, so builds never need to reach Google.
import "@fontsource/bebas-neue/latin-400.css";
import "@fontsource-variable/archivo/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BUE Theatre Team",
    template: "%s · BUE Theatre Team",
  },
  description:
    "The BUE Theatre Team: our story, our team, upcoming shows and free ticket reservations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
