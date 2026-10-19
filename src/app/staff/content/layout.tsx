import Link from "next/link";

export default function ContentLayout({ children }: LayoutProps<"/staff/content">) {
  return (
    <>
      <nav className="subnav" aria-label="Public content">
        <Link href="/staff/content">History and text</Link>
        <Link href="/staff/content/team">Team</Link>
        <Link href="/staff/content/shows">Shows</Link>
        <Link href="/staff/content/gallery">Gallery</Link>
      </nav>
      {children}
    </>
  );
}
