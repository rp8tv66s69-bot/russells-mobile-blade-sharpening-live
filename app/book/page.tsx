"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { db } from "@/lib/firebase";
import type { BlockedSlot, Booking } from "@/lib/types";

const mowerTypes = [
  { id: "push-mower", name: "Push Mower" },
  { id: "riding-mower", name: "Riding Mower" },
  { id: "zero-turn", name: "Zero Turn" },
  { id: "bush-hog", name: "Bush Hog" },
];

const bladeQuantities = [1, 2, 3, 4, 5, 6];

function pricePerBlade(jobType: string, mowerType: string) {
  if (!jobType) return 0;
  if (jobType === "blade-changing") return mowerType === "bush-hog" ? 20 : 10;
  return mowerType === "bush-hog" ? 40 : 20;
}

const times = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
];

const serviceAreas = [
  "Washington Parish",
  "St. Tammany Parish",
  "Tangipahoa Parish",
];

// Keep the public calendar to the next four weekends so every confirmed
// appointment is within the email provider's reminder scheduling window.
function nextAvailableDates(count = 8) {
  const dates: Date[] = [];
  const cursor = new Date();

  cursor.setHours(0, 0, 0, 0);

  while (dates.length < count) {
    if (cursor.getDay() === 5 || cursor.getDay() === 6) {
      dates.push(new Date(cursor));
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Every appointment slot has exactly one deterministic Firestore document ID.
 * With the project's create-only public Firestore rule, the first write creates
 * the slot and a later write to the same ID is rejected as an unauthorized
 * update. This is atomic and prevents two customers from reserving one slot.
 */
function slotId(date: string, time: string) {
  return `${date}_${time.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
}

function isSlotConflict(error: unknown) {
  if (!(error instanceof FirebaseError)) return false;

  return (
    error.code === "permission-denied" ||
    error.code === "already-exists" ||
    error.code === "firestore/permission-denied" ||
    error.code === "firestore/already-exists"
  );
}

export default function BookingPage() {
  const dates = useMemo(() => nextAvailableDates(), []);
  const [submitted, setSubmitted] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [jobType, setJobType] = useState("");
  const [selectedMowerType, setSelectedMowerType] = useState("");
  const [bladeCount, setBladeCount] = useState(0);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const currentPricePerBlade = pricePerBlade(jobType, selectedMowerType);

  useEffect(() => {
    return onSnapshot(
      collection(db, "blockedSlots"),
      (snapshot) => {
        setBlockedSlots(
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as BlockedSlot))
        );
      },
      (availabilityError) => {
        console.error("Unable to load blocked appointment times:", availabilityError);
      }
    );
  }, []);

  const blockedDates = useMemo(
    () => new Set(blockedSlots.filter((slot) => slot.time === "All day").map((slot) => slot.date)),
    [blockedSlots]
  );

  const blockedTimes = useMemo(
    () => new Set(blockedSlots.filter((slot) => slot.date === selectedDate).map((slot) => slot.time)),
    [blockedSlots, selectedDate]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const selectedService = mowerTypes.find(
      (service) => service.id === String(form.get("service") || "")
    );
    const selectedBladeCount = Number(form.get("bladeCount") || 0);
    const selectedJobType = String(form.get("jobType") || "");

    if (!['sharpening', 'blade-changing'].includes(selectedJobType)) {
      setError("Please select a service.");
      setSaving(false);
      return;
    }

    if (!selectedService) {
      setError("Please select a mower type.");
      setSaving(false);
      return;
    }

    if (!bladeQuantities.includes(selectedBladeCount)) {
      setError("Please select the number of blades.");
      setSaving(false);
      return;
    }

    const date = String(form.get("date") || "");
    const time = String(form.get("time") || "");

    const booking: Booking = {
      id: slotId(date, time),
      name: String(form.get("name") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      email: String(form.get("email") || "").trim(),
      address: String(form.get("address") || "").trim(),
      city: String(form.get("city") || "").trim(),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      serviceDetail: `${selectedJobType === "blade-changing" ? "Blade changing only" : "Blade sharpening"} · ${selectedBladeCount} ${selectedBladeCount === 1 ? "blade" : "blades"}`,
      jobType: selectedJobType,
      bladeCount: selectedBladeCount,
      price: selectedBladeCount * pricePerBlade(selectedJobType, selectedService.id),
      date,
      time,
      notes: String(form.get("notes") || "").trim(),
      status: "Pending",
      paymentStatus: "Unpaid",
      paymentMethod: "",
      createdAt: new Date().toISOString(),
    };

    if (
      !booking.name ||
      !booking.phone ||
      !booking.address ||
      !booking.city ||
      !booking.date ||
      !booking.time
    ) {
      setError("Please complete every required field.");
      setSaving(false);
      return;
    }

    try {
      // Do not use merge here. A fixed document ID plus create-only public
      // Firestore rules makes this reservation an atomic, one-winner write.
      await setDoc(doc(db, "bookings", booking.id), {
        ...booking,
        serverCreatedAt: serverTimestamp(),
      });

      // The booking is already safely reserved. Email failure must not create
      // a duplicate retry, so log it while still showing booking confirmation.
      try {
        const emailResponse = await fetch("/api/booking-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: booking.name,
            phone: booking.phone,
            email: booking.email,
            address: booking.address,
            city: booking.city,
            service: booking.serviceName,
            serviceDetail: booking.serviceDetail,
            price: booking.price,
            date: booking.date,
            time: booking.time,
            notes: booking.notes,
          }),
        });

        if (!emailResponse.ok) {
          const emailError = await emailResponse.text();
          console.error("Booking saved, but notification email failed:", emailError);
        }
      } catch (emailError) {
        console.error("Booking saved, but notification email failed:", emailError);
      }

      formElement.reset();
      setSelectedDate("");
      setSelectedTime("");
      setJobType("");
      setSelectedMowerType("");
      setBladeCount(0);
      setSubmitted(booking);
    } catch (bookingError) {
      console.error("Unable to reserve appointment:", bookingError);

      if (isSlotConflict(bookingError)) {
        setError(
          "Sorry, that appointment time was just booked. Please choose another date or time."
        );
      } else {
        setError(
          "The appointment could not be saved. Please try again or call Russell at 985-295-1163."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <main className="booking-shell">
        <section className="confirmation-card">
          <h1>Thank you, {submitted.name}!</h1>
          <p>Your appointment request has been received.</p>
          <p>
            Russell will contact you to confirm your appointment for{" "}
            <strong>
              {submitted.serviceName} ({submitted.serviceDetail})
            </strong>
            .
          </p>
          <p>
            <strong>Date:</strong> {submitted.date}
            <br />
            <strong>Time:</strong> {submitted.time}
          </p>

          <div className="hero-actions">
            <button
              className="button primary"
              type="button"
              onClick={() => setSubmitted(null)}
            >
              Book another
            </button>

            <Link className="button secondary" href="/">
              Back home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="booking-shell">
      <header className="booking-header">
        <Link className="brand" href="/">
          <span className="brand-mark">R</span>
          <span>Russell&apos;s Mobile Blade Sharpening</span>
        </Link>

        <a className="button secondary" href="tel:+19852951163">
          Call Russell
        </a>
      </header>

      <section className="booking-intro">
        <p className="eyebrow">Veteran Owned · Online appointment request</p>
        <h1>Book mobile blade sharpening</h1>
        <p>
          Friday and Saturday, 8:00 AM–5:00 PM throughout Washington Parish,
          St. Tammany Parish, and Tangipahoa Parish.
        </p>
      </section>

      <form className="booking-form" onSubmit={handleSubmit}>
        <section className="form-card">
          <div className="form-section-heading">
            <span>1</span>
            <div>
              <h2>Choose service, mower type, and blade quantity</h2>
              <p>Sharpening starts at $20 per blade. Blade changing is $10 per mower blade or $20 per Bush Hog blade.</p>
            </div>
          </div>

          <div className="field-grid">
            <label>
              <span>Service *</span>
              <select
                name="jobType"
                required
                value={jobType}
                onChange={(event) => setJobType(event.target.value)}
              >
                <option value="" disabled>Choose a service</option>
                <option value="sharpening">Blade sharpening</option>
                <option value="blade-changing">Blade changing only</option>
              </select>
            </label>

            <label>
              <span>Mower type *</span>
              <select
                name="service"
                required
                value={selectedMowerType}
                onChange={(event) => setSelectedMowerType(event.target.value)}
              >
                <option value="" disabled>Choose mower type</option>
                {mowerTypes.map((mower) => (
                  <option key={mower.id} value={mower.id}>{mower.name}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Number of blades *</span>
              <select
                name="bladeCount"
                required
                value={bladeCount || ""}
                onChange={(event) => setBladeCount(Number(event.target.value))}
              >
                <option value="" disabled>Choose blade quantity</option>
                {bladeQuantities.map((quantity) => (
                  <option key={quantity} value={quantity}>
                    {quantity} {quantity === 1 ? "blade" : "blades"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="price-calculation" aria-live="polite">
            <span>{bladeCount ? `${bladeCount} × $${currentPricePerBlade} per blade` : jobType ? `$${currentPricePerBlade} per blade` : "Select a service to see pricing"}</span>
            <strong>Total: ${bladeCount * currentPricePerBlade}</strong>
          </div>
          <p className="custom-service-caption">
            Need something other than blade services?{" "}
            <a href="sms:+19852951163">Let me know.</a>
          </p>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>2</span>
            <div>
              <h2>Select a date and time</h2>
              <p>
                Appointments are available Friday and Saturday. If a time was
                just reserved, you will be asked to select another slot.
              </p>
            </div>
          </div>

          <div className="field-grid">
            <label>
              <span>Appointment date</span>
              <select
                name="date"
                required
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSelectedTime("");
                }}
              >
                <option value="" disabled>
                  Choose a date
                </option>
                {dates.map((date) => (
                  <option
                    key={dateValue(date)}
                    value={dateValue(date)}
                    disabled={blockedDates.has(dateValue(date))}
                  >
                    {formatDate(date)}{blockedDates.has(dateValue(date)) ? " (Unavailable)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Appointment time</span>
              <select
                name="time"
                required
                value={selectedTime}
                disabled={!selectedDate}
                onChange={(event) => setSelectedTime(event.target.value)}
              >
                <option value="" disabled>
                  Choose a time
                </option>
                {times.map((time) => (
                  <option key={time} value={time} disabled={blockedTimes.has(time)}>
                    {time}{blockedTimes.has(time) ? " (Unavailable)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>3</span>
            <div>
              <h2>Your information</h2>
              <p>Russell will use this information to confirm your visit.</p>
            </div>
          </div>

          <div className="field-grid">
            <label>
              <span>Name *</span>
              <input name="name" autoComplete="name" required />
            </label>

            <label>
              <span>Phone *</span>
              <input name="phone" type="tel" autoComplete="tel" required />
            </label>

            <label>
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" />
            </label>

            <label>
              <span>Parish *</span>
              <select name="city" required defaultValue="">
                <option value="" disabled>
                  Choose your parish
                </option>
                {serviceAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>

            <label className="full-field">
              <span>Service address *</span>
              <input
                name="address"
                autoComplete="street-address"
                required
              />
            </label>

            <label className="full-field">
              <span>Notes</span>
              <textarea
                name="notes"
                rows={4}
                placeholder="Gate code, equipment details, or special instructions"
              />
            </label>
          </div>
        </section>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <section className="submit-panel">
          <div>
            <strong>No payment is due online.</strong>
            <p>Pay after service with Cash, Cash App, or Venmo.</p>
          </div>

          <button className="button primary" type="submit" disabled={saving}>
            {saving ? "Reserving appointment..." : "Request appointment"}
          </button>
        </section>
      </form>
    </main>
  );
}
