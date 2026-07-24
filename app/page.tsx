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

const maintenanceServices = [
  ["Push Mower", "$45 + parts"],
  ["Riding Mower", "$75 + parts"],
  ["Zero Turn", "$85 + parts"],
  ["Tractor", "From $115 + parts"],
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
          <div className="blade-change-heading">
            <p className="eyebrow">Additional service</p>
            <h3>Blade changing only</h3>
            <p>Old blades are removed and replacement blades are installed at your location.</p>
          </div>
          <div className="blade-change-rates" aria-label="Blade changing prices">
            <div><span>Mower blades</span><strong>$10</strong><small>per blade</small></div>
            <div><span>Bush Hog blades</span><strong>$25</strong><small>per blade</small></div>
          </div>
          <div className="blade-change-details">
            <p><strong>Replacement blade options</strong></p>
            <ul>
              <li>Supply your own compatible replacement blades</li>
              <li>Russell can provide blades at the parts cost plus a 15% sourcing and handling charge ($10 minimum)</li>
            </ul>
          </div>
          <Link className="button orange" href="/book">Book blade changing</Link>
        </article>
        <article className="blade-change-callout">
          <div className="blade-change-heading">
            <p className="eyebrow">Additional sharpening service</p>
            <h3>Chainsaw chain sharpening</h3>
            <p>Pricing is based on the chainsaw bar size. Bring the chain off the saw, or Russell can remove and reinstall it for an additional $5.</p>
          </div>
          <div className="blade-change-rates" aria-label="Chainsaw chain sharpening prices">
            <div><span>Up to 16&quot;</span><strong>$15</strong></div>
            <div><span>18&quot;–20&quot;</span><strong>$20</strong></div>
            <div><span>22&quot;–24&quot;</span><strong>$25</strong></div>
            <div><span>Over 24&quot;</span><strong>$30</strong></div>
          </div>
          <div className="blade-change-details">
            <p><strong>Chain removal and reinstallation</strong></p>
            <ul><li>Add $5 when the chain is still installed on the saw</li></ul>
          </div>
          <Link className="button orange" href="/book">Book chainsaw sharpening</Link>
        </article>
        <p className="custom-service-caption home-custom-service-caption">
          Need something other than the services listed?{" "}
          <a href="sms:+19852951163">Let me know.</a>
        </p>
      </section>

      <section className="section page-width maintenance-section" id="maintenance">
        <div className="section-heading">
          <p className="eyebrow">New service · Available July 31, 2026</p>
          <h2>Basic Maintenance</h2>
          <p className="section-lead">Routine maintenance at your location includes an engine-oil change, applicable oil and air filters, and applicable spark plugs. Prices shown are for labor; oil, filters, spark plugs, and other parts are additional.</p>
        </div>
        <div className="service-grid">
          {maintenanceServices.map(([name, price]) => (
            <article className="service-card maintenance-card" key={name}>
              <div><h3>{name}</h3><p>Oil, filters, and spark plug when applicable</p></div>
              <strong>{price}</strong>
            </article>
          ))}
        </div>
        <div className="maintenance-notice">
          <strong>Appointments begin Friday, July 31, 2026.</strong>
          <p>Russell-supplied parts include a 15% sourcing and handling charge, with a $10 minimum. Customers may provide compatible parts; customer-supplied parts are not covered by a parts warranty.</p>
          <p>Please provide the equipment make and model when booking. Additional repairs require customer approval.</p>
          <Link className="button orange" href="/book">Request Basic Maintenance</Link>
        </div>
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
