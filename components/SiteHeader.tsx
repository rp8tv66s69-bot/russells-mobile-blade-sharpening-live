import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark">R</span>
        <span className="brand-copy"><b>Russell&apos;s</b><small>Mobile Blade Sharpening</small></span>
      </Link>
      <nav className="site-nav" aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/#services">Services</Link>
        <a href="tel:+19852951163">Contact</a>
        <Link className="nav-book" href="/book">Book now</Link>
        <Link className="nav-admin" href="/login">Owner</Link>
      </nav>
    </header>
  );
}
