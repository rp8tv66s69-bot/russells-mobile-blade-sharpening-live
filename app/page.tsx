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
          <p className="eyebrow">Straightforward pricing</p>
          <h2>Sharpening services</h2>
          <p className="section-lead">Mobile service in Covington, Mandeville, and Madisonville every Friday and Saturday.</p>
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
          <div><p className="eyebrow light">Mobile convenience</p><h2>Stay home. Russell brings the sharpening service to you.</h2></div>
          <div className="check-list"><p>✓ Friday and Saturday appointments</p><p>✓ Covington, Mandeville, and Madisonville</p><p>✓ Appointment confirmation after booking</p><p>✓ Cash, Cash App, or Venmo after service</p></div>
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
