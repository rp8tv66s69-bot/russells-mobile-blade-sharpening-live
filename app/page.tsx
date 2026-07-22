import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import BeforeAfterGallery from "@/components/BeforeAfterGallery";

const services = [
  ["Push Mower", "$20/blade"],
  ["Riding Mower", "$20/blade"],
  ["Zero Turn", "$20/blade"],
  ["Bush Hog", "$40/blade"],
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
          <Link className="hero-hotspot hero-hotspot-book" href="/book">Book an appointment</Link>
          <a className="hero-hotspot hero-hotspot-call" href="tel:+19852951163">Call or text Russell</a>
        </div>
      </section>

      <section className="mobile-hero-actions page-width">
        <Link className="button orange" href="/book">Book an appointment</Link>
        <a className="button black" href="tel:+19852951163">Call 985-295-1163</a>
      </section>

      <section className="section page-width" id="services">
        <div className="section-heading">
          <p className="eyebrow">Veteran Owned · Straightforward pricing</p>
          <h2>Sharpening services</h2>
          <p className="section-lead">Mower blades are <strong>$20 per blade</strong>, and Bush Hog blades are <strong>$40 per blade.</strong> Mobile service throughout Washington Parish, St. Tammany Parish, and Tangipahoa Parish every Friday and Saturday.</p>
        </div>
        <div className="service-grid">
          {services.map(([name, price]) => (
            <article className="service-card" key={name}>
              <div><h3>{name}</h3><p>Choose your number of blades</p></div><strong>{price}</strong>
            </article>
          ))}
        </div>
        <article className="blade-change-callout">
          <div>
            <p className="eyebrow">Additional service</p>
            <h3>Blade changing only</h3>
            <p><strong className="customer-supplied-warning">Customer-supplied replacement blades are required.</strong> Russell can remove your old blades and install the replacements. Bush Hog blade changes are $20 per blade.</p>
          </div>
          <strong>$10 mower · $20 Bush Hog</strong>
          <Link className="button orange" href="/book">Book blade changing</Link>
        </article>
        <p className="custom-service-caption home-custom-service-caption">
          Need something other than blade services?{" "}
          <a href="sms:+19852951163">Let me know.</a>
        </p>
      </section>

      <section className="section band">
        <div className="page-width split">
          <div><p className="eyebrow light">Veteran Owned · Mobile convenience</p><h2>Stay home. Russell brings the sharpening service to you.</h2></div>
          <div className="check-list"><p>✓ Veteran owned and operated</p><p>✓ Friday and Saturday appointments</p><p>✓ Washington, St. Tammany, and Tangipahoa Parishes</p><p>✓ Appointment confirmation after booking</p><p>✓ Cash, Cash App, or Venmo after service</p></div>
        </div>
      </section>

      <BeforeAfterGallery />

      <section className="section page-width contact-card">
        <div><p className="eyebrow">Ready for a cleaner cut?</p><h2>Schedule your blades today.</h2><p>Your blades will be sharpened on site and ready for healthier, cleaner-looking grass.</p></div>
        <div className="hero-actions"><Link className="button orange" href="/book">Book online</Link><a className="button secondary" href="sms:+19852951163">Text Russell</a></div>
      </section>
      <footer className="footer">Russell&apos;s Mobile Blade Sharpening · <a href="mailto:russellsmobileblade@gmail.com">russellsmobileblade@gmail.com</a> · <a href="tel:+19852951163">985-295-1163</a></footer>
    </main>
  );
}
