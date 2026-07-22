import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

const services = [
  ["Push Mower", "1 blade", "$20"],
  ["Riding Mower", "2 blades", "$40"],
  ["Zero Turn", "3 blades", "$60"],
  ["Bush Hog", "2 blades", "$80"],
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
          <p className="section-lead">Mobile service throughout Washington Parish, St. Tammany Parish, and Tangipahoa Parish every Friday and Saturday.</p>
        </div>
        <div className="service-grid">
          {services.map(([name, detail, price]) => (
            <article className="service-card" key={name}>
              <div><h3>{name}</h3><p>{detail}</p></div><strong>{price}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="section band">
        <div className="page-width split">
          <div><p className="eyebrow light">Veteran Owned · Mobile convenience</p><h2>Stay home. Russell brings the sharpening service to you.</h2></div>
          <div className="check-list"><p>✓ Veteran owned and operated</p><p>✓ Friday and Saturday appointments</p><p>✓ Washington, St. Tammany, and Tangipahoa Parishes</p><p>✓ Appointment confirmation after booking</p><p>✓ Cash, Cash App, or Venmo after service</p></div>
        </div>
      </section>

      <section className="section page-width" id="gallery">
        <div className="section-heading gallery-heading">
          <div>
            <p className="eyebrow">See the difference</p>
            <h2>Before &amp; after sharpening</h2>
          </div>
          <p className="section-lead">
            A clean, balanced edge helps your mower cut grass instead of
            tearing it. Real customer transformations will be featured here.
          </p>
        </div>

        <div className="comparison-card">
          <figure className="comparison-photo">
            <div className="photo-label before-label">Before</div>
            <Image
              src="/gallery-before-placeholder.svg"
              alt="Placeholder for a dull mower blade before sharpening"
              width={720}
              height={480}
              className="gallery-image"
            />
            <figcaption>Dull, rounded cutting edge</figcaption>
          </figure>

          <div className="comparison-arrow" aria-hidden="true">→</div>

          <figure className="comparison-photo">
            <div className="photo-label after-label">After</div>
            <Image
              src="/gallery-after-placeholder.svg"
              alt="Placeholder for a mower blade after professional sharpening"
              width={720}
              height={480}
              className="gallery-image"
            />
            <figcaption>Sharp, clean and ready for a better cut</figcaption>
          </figure>
        </div>

        <div className="gallery-promise">
          <strong>Every service includes precision sharpening.</strong>
          <span>Your blades are returned ready for a cleaner, healthier-looking lawn.</span>
        </div>
      </section>

      <section className="section page-width contact-card">
        <div><p className="eyebrow">Ready for a cleaner cut?</p><h2>Schedule your blades today.</h2><p>Your blades will be sharpened on site and ready for healthier, cleaner-looking grass.</p></div>
        <div className="hero-actions"><Link className="button orange" href="/book">Book online</Link><a className="button secondary" href="sms:+19852951163">Text Russell</a></div>
      </section>
      <footer className="footer">Russell&apos;s Mobile Blade Sharpening · <a href="mailto:Rtaylorusa@bellsouth.net">Rtaylorusa@bellsouth.net</a> · <a href="tel:+19852951163">985-295-1163</a></footer>
    </main>
  );
}
