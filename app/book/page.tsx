"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Booking } from "@/lib/types";

const services = [
  { id: "push-mower", name: "Push Mower", detail: "1 blade", price: 20 },
  { id: "riding-mower", name: "Riding Mower", detail: "2 blades", price: 40 },
  { id: "zero-turn", name: "Zero Turn", detail: "3 blades", price: 60 },
  { id: "bush-hog", name: "Bush Hog", detail: "2 blades", price: 80 },
];
const times = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];
const serviceAreas = ["Covington", "Mandeville", "Madisonville"];

function nextAvailableDates(count = 12) {
  const dates: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (dates.length < count) {
    if (cursor.getDay() === 5 || cursor.getDay() === 6) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(date);
}
function slotId(date: string, time: string) {
  return `${date}_${time.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
}

export default function BookingPage() {
  const dates = useMemo(() => nextAvailableDates(), []);
  const [submitted, setSubmitted] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const selectedService = services.find((service) => service.id === String(form.get("service") || ""));
    if (!selectedService) { setError("Please select a sharpening service."); setSaving(false); return; }

    const date = String(form.get("date") || "");
    const time = String(form.get("time") || "");
    const booking: Booking = {
      id: slotId(date, time), name: String(form.get("name") || "").trim(), phone: String(form.get("phone") || "").trim(),
      email: String(form.get("email") || "").trim(), address: String(form.get("address") || "").trim(), city: String(form.get("city") || "").trim(),
      serviceId: selectedService.id, serviceName: selectedService.name, serviceDetail: selectedService.detail, price: selectedService.price,
      date, time, notes: String(form.get("notes") || "").trim(), status: "Pending", paymentStatus: "Unpaid", paymentMethod: "", createdAt: new Date().toISOString(),
    };
    if (!booking.name || !booking.phone || !booking.address || !booking.city || !booking.date || !booking.time) {
      setError("Please complete every required field."); setSaving(false); return;
    }
    try {
      await setDoc(doc(db, "bookings", booking.id), { ...booking, serverCreatedAt: serverTimestamp() });
      formElement.reset();
      setSubmitted(booking);
    } catch (bookingError) {
      console.error(bookingError);
      setError("That time may already be booked, or the appointment could not be saved. Choose another time or call Russell at 985-295-1163.");
    } finally { setSaving(false); }
  }

  if (submitted) return (
    <main className="booking-shell"><section className="confirmation-card"><div className="confirmation-icon">✓</div><p className="eyebrow">Appointment request received</p>
      <h1>Thank you, {submitted.name}.</h1><p>Russell will contact you to confirm your appointment for <strong>{submitted.serviceName} ({submitted.serviceDetail}) — ${submitted.price}</strong>.</p>
      <dl className="confirmation-details"><div><dt>Date</dt><dd>{submitted.date}</dd></div><div><dt>Time</dt><dd>{submitted.time}</dd></div><div><dt>Location</dt><dd>{submitted.address}<br />{submitted.city}</dd></div></dl>
      <p className="confirmation-note">Need to make a change? Call or text <a href="tel:+19852951163">985-295-1163</a>.</p>
      <div className="hero-actions"><button className="button primary" onClick={() => setSubmitted(null)}>Book another</button><Link className="button secondary" href="/">Back home</Link></div>
    </section></main>
  );

  return (
    <main className="booking-shell">
      <header className="booking-header"><Link className="brand" href="/"><span className="brand-mark">R</span><span>Russell&apos;s Mobile Blade Sharpening</span></Link><a className="button secondary" href="tel:+19852951163">Call Russell</a></header>
      <section className="booking-intro"><p className="eyebrow">Online appointment request</p><h1>Book mobile blade sharpening</h1><p>Friday and Saturday, 8:00 AM–5:00 PM in Covington, Mandeville, and Madisonville.</p></section>
      <form className="booking-form" onSubmit={handleSubmit}>
        <section className="form-card"><div className="form-section-heading"><span>1</span><div><h2>Choose a service</h2><p>Select the equipment you need sharpened.</p></div></div>
          <div className="service-options">{services.map((service) => <label className="service-option" key={service.id}><input required type="radio" name="service" value={service.id} /><span><strong>{service.name}</strong><small>{service.detail}</small></span><b>${service.price}</b></label>)}</div>
        </section>
        <section className="form-card"><div className="form-section-heading"><span>2</span><div><h2>Select a date and time</h2><p>Appointments are available Friday and Saturday.</p></div></div>
          <div className="field-grid"><label><span>Appointment date</span><select name="date" required defaultValue=""><option value="" disabled>Choose a date</option>{dates.map((date) => <option key={dateValue(date)} value={dateValue(date)}>{formatDate(date)}</option>)}</select></label>
          <label><span>Appointment time</span><select name="time" required defaultValue=""><option value="" disabled>Choose a time</option>{times.map((time) => <option key={time}>{time}</option>)}</select></label></div>
        </section>
        <section className="form-card"><div className="form-section-heading"><span>3</span><div><h2>Your information</h2><p>Russell will use this information to confirm your visit.</p></div></div>
          <div className="field-grid"><label><span>Name *</span><input name="name" required /></label><label><span>Phone *</span><input name="phone" type="tel" required /></label><label><span>Email</span><input name="email" type="email" /></label>
          <label><span>City *</span><select name="city" required defaultValue=""><option value="" disabled>Choose your city</option>{serviceAreas.map((area) => <option key={area}>{area}</option>)}</select></label>
          <label className="full-field"><span>Service address *</span><input name="address" required /></label><label className="full-field"><span>Notes</span><textarea name="notes" rows={4} placeholder="Gate code, equipment details, or special instructions" /></label></div>
        </section>
        {error && <p className="form-error" role="alert">{error}</p>}
        <section className="submit-panel"><div><strong>No payment is due online.</strong><p>Pay after service with Cash, Cash App, or Venmo.</p></div><button className="button primary" disabled={saving}>{saving ? "Saving appointment..." : "Request appointment"}</button></section>
      </form>
    </main>
  );
}
