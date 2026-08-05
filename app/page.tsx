import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import BeforeAfterGallery from "@/components/BeforeAfterGallery";

const services = [
  ["push-mower", "Push Mower", "$10/blade"],
  ["riding-mower", "Riding Mower", "$10/blade"],
  ["zero-turn", "Zero Turn", "$10/blade"],
  ["grooming-mower", "Grooming Mower", "$10/blade"],
  ["bush-hog", "Bush Hog", "$40/blade"],
];

export default function HomePage() {
  return (
    <main>
      <div className="home-header-wrap"><SiteHeader /></div>

      <section className="sunset-hero" aria-label="Russell's Mobile Blade Sharpening">
        <Image
          src="/sunset-blade-hero.png"
          alt="A mower blade held in front of a Louisiana sunset"
          width={1536}
          height={884}
          priority
          className="sunset-hero-image"
        />
        <div className="sunset-hotspots" aria-label="Hero actions">
          <Link className="hero-hotspot hero-hotspot-book" href="/schedule">Book an appointment</Link>
          <a className="hero-hotspot hero-hotspot-call" href="tel:+19852951163">Call or text Russell</a>
        </div>
      </section>

      <section className="mobile-hero-actions page-width">
        <Link className="button orange" href="/schedule">Book an appointment</Link>
        <a className="button black" href="tel:+19852951163">Call 985-295-1163</a>
      </section>

      <section className="section page-width" id="services">
        <div className="section-heading">
          <p className="eyebrow">Veteran Owned · Straightforward pricing</p>
          <h2>Choose a service</h2>
          <p className="section-lead">Tap the service you need to begin booking. Russell provides mobile service throughout Washington, St. Tammany, and Tangipahoa Parishes.</p>
        </div>
        <div className="service-grid">
          {services.map(([id, name, price]) => (
            <Link
              className="service-card service-card-link"
              href={`/schedule?jobType=sharpening&service=${id}`}
              key={id}
              aria-label={`Book ${name} blade sharpening`}
            >
              <div><h3>{name}</h3><p>Choose your number of blades · Tap to book</p></div><strong>{price}</strong>
            </Link>
          ))}
        </div>
        <div className="more-services-heading">
          <h3>More services</h3>
          <p>Prices and important details are shown before you book.</p>
        </div>
        <div className="extra-service-grid">
          <Link className="compact-service-card" href="/schedule?jobType=loose-blade-sharpening">
            <span>Already removed</span>
            <h3>Loose or spare blades</h3>
            <strong>Mower $10 · Bush Hog $20 per blade</strong>
            <p>Blades must be removed from the equipment.</p>
            <b>Book this service →</b>
          </Link>
          <Link className="compact-service-card" href="/schedule?jobType=blade-changing">
            <span>Removal and installation</span>
            <h3>Blade changing</h3>
            <strong>Mower $10 · Bush Hog $25 per blade</strong>
            <p>Supply the blades or pay parts cost plus 15% sourcing and handling ($10 minimum).</p>
            <b>Book this service →</b>
          </Link>
          <Link className="compact-service-card" href="/schedule?jobType=chainsaw-sharpening">
            <span>Based on bar size</span>
            <h3>Chainsaw chains</h3>
            <strong>$15–$30 per chain</strong>
            <p>Add $5 when Russell removes and reinstalls the chain.</p>
            <b>Book this service →</b>
          </Link>
          <Link className="compact-service-card" href="/schedule?jobType=maintenance">
            <span>Labor plus parts</span>
            <h3>Basic Maintenance</h3>
            <strong>Push $35 · Riding/Zero Turn $45 · Tractor $80</strong>
            <p>Oil, applicable filters, and spark plug. Russell-supplied parts include 15% sourcing and handling ($10 minimum).</p>
            <b>Book this service →</b>
          </Link>
        </div>
        <p className="custom-service-caption home-custom-service-caption">
          Need something other than the services listed?{" "}
          <a href="sms:+19852951163">Let me know.</a>
        </p>
      </section>

      <section className="section band">
        <div className="page-width split">
          <div><p className="eyebrow light">Veteran Owned · Mobile convenience</p><h2>Mobile service made simple.</h2></div>
          <div className="check-list"><p>✓ Russell comes to your location</p><p>✓ Friday and Saturday appointments</p><p>✓ Washington, St. Tammany, and Tangipahoa Parishes</p><p>✓ Pay after service with Cash, Cash App, or Venmo</p></div>
        </div>
      </section>

      <BeforeAfterGallery />

      <section className="section page-width contact-card">
        <div><p className="eyebrow">Ready to schedule?</p><h2>Choose a service and time.</h2><p>Russell will contact you to confirm your appointment.</p></div>
        <div className="hero-actions"><Link className="button orange" href="/schedule">Book online</Link><a className="button secondary" href="sms:+19852951163">Text Russell</a></div>
      </section>
      <footer className="footer">Russell&apos;s Mobile Blade Sharpening · <a href="mailto:russellsmobileblade@gmail.com">russellsmobileblade@gmail.com</a> · <a href="tel:+19852951163">985-295-1163</a></footer>
    </main>
  );
}
