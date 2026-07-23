"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import type { BlockedSlot, Booking, BookingStatus, PaymentStatus } from "@/lib/types";

const statusOptions: BookingStatus[] = ["Pending", "Confirmed", "Completed", "Cancelled"];
const paymentMethods = ["", "Cash", "Cash App", "Venmo"] as const;
const appointmentTimes = ["All day", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];
const filterOptions = ["Today", "Upcoming", "Unpaid", "Completed", "Customers", "All"] as const;
type Filter = (typeof filterOptions)[number];

function servicePrice(jobType: string, serviceId: string, bladeCount: number) {
  if (jobType === "maintenance") {
    return ({ "push-mower": 55, "riding-mower": 85, "zero-turn": 95, tractor: 125 } as Record<string, number>)[serviceId] || 0;
  }
  if (jobType === "blade-changing") {
    return bladeCount * (serviceId === "bush-hog" ? 25 : 10);
  }
  return bladeCount * (serviceId === "bush-hog" ? 40 : 20);
}

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function blockedSlotId(date: string, time: string) {
  return time === "All day"
    ? `${date}_all`
    : `${date}_${time.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
}

function formatDate(value: string) {
  if (!value) return "No date";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function addMonths(value: string, months: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return localDateValue(date);
}

function customerKey(booking: Booking) {
  return booking.phone.replace(/\D/g, "") || booking.email.toLowerCase();
}

function mapsSearchUrl(booking: Booking) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${booking.address}, ${booking.city}, LA`)}`;
}

function partsLookupUrl(booking: Booking, lookupType: "engine" | "equipment") {
  const identifiers = lookupType === "engine"
    ? [
        booking.engineMake,
        booking.engineModel,
        booking.serialNumber,
        booking.filterType,
        "genuine OEM manufacturer engine maintenance parts official parts catalog OEM part numbers oil capacity oil filter air filter fuel filter spark plug parts diagram -aftermarket",
      ]
    : [
        booking.equipmentMake,
        booking.equipmentModel,
        booking.serialNumber,
        booking.serviceName,
        "genuine OEM manufacturer equipment maintenance parts official parts catalog OEM part numbers manual parts diagram -aftermarket",
      ];

  return `https://www.google.com/search?q=${encodeURIComponent(
    identifiers.filter(Boolean).join(" ")
  )}`;
}

function amazonOemPartsUrl(booking: Booking) {
  const identifiers = [
    booking.equipmentMake,
    booking.equipmentModel,
    booking.engineMake,
    booking.engineModel,
    booking.serialNumber,
    "genuine OEM",
  ].filter(Boolean).join(" ");

  return `https://www.amazon.com/s?k=${encodeURIComponent(identifiers)}`;
}

function routeUrl(bookings: Booking[]) {
  const destinations = bookings.slice(0, 9).map((booking) => `${booking.address}, ${booking.city}, LA`);
  if (!destinations.length) return "https://www.google.com/maps";
  const destination = destinations[destinations.length - 1];
  const waypoints = destinations.slice(0, -1).join("|");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}`;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("Today");
  const [search, setSearch] = useState("");
  const [dataError, setDataError] = useState("");
  const [sendingConfirmation, setSendingConfirmation] = useState<string | null>(null);
  const [sendingSeasonalReminder, setSendingSeasonalReminder] = useState<string | null>(null);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [blockDate, setBlockDate] = useState("");
  const [blockTime, setBlockTime] = useState("All day");
  const [blockReason, setBlockReason] = useState("");
  const [savingBlock, setSavingBlock] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (current) => {
    setUser(current);
    setAuthLoading(false);
    if (!current) router.replace("/login");
  }), [router]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, "bookings"), orderBy("date", "asc")),
      (snapshot) => {
        setDataError("");
        setBookings(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Booking)));
      },
      (error) => {
        console.error(error);
        setDataError("Appointments could not be loaded. Check your Firestore rules and internet connection.");
      },
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, "blockedSlots"), orderBy("date", "asc")),
      (snapshot) => setBlockedSlots(
        snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as BlockedSlot))
      ),
      (error) => console.error("Blocked times could not be loaded:", error)
    );
  }, [user]);

  const today = localDateValue();
  const upcoming = bookings.filter((b) => b.date >= today && b.status !== "Cancelled");
  const todayBookings = bookings.filter((b) => b.date === today && b.status !== "Cancelled");
  const completedRevenue = bookings.filter((b) => b.status === "Completed" && b.paymentStatus === "Paid").reduce((sum, b) => sum + Number(b.price || 0), 0);
  const scheduledValue = upcoming.reduce((sum, b) => sum + Number(b.price || 0), 0);
  const unpaidValue = bookings.filter((b) => b.status !== "Cancelled" && b.paymentStatus !== "Paid").reduce((sum, b) => sum + Number(b.price || 0), 0);

  const customerGroups = useMemo(() => {
    const groups = new Map<string, Booking[]>();
    for (const booking of bookings) {
      const key = customerKey(booking);
      groups.set(key, [...(groups.get(key) || []), booking]);
    }
    return [...groups.values()].sort((a, b) => b.length - a.length);
  }, [bookings]);

  const visible = useMemo(() => bookings.filter((b) => {
    const matchesSearch = `${b.name} ${b.phone} ${b.email} ${b.city} ${b.serviceName} ${b.address}`.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "Today") return b.date === today && b.status !== "Cancelled";
    if (filter === "Upcoming") return b.date >= today && b.status !== "Cancelled";
    if (filter === "Unpaid") return b.paymentStatus !== "Paid" && b.status !== "Cancelled";
    if (filter === "Completed") return b.status === "Completed";
    if (filter === "Customers") return false;
    return true;
  }), [bookings, filter, search, today]);

  async function sendConfirmation(booking: Booking) {
    if (!booking.email) {
      window.alert("This customer did not provide an email address.");
      return false;
    }

    if (!user) {
      window.alert("Your owner session has expired. Please sign in again.");
      return false;
    }

    setSendingConfirmation(booking.id);

    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch("/api/booking-confirmation", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: booking.id,
          name: booking.name,
          email: booking.email,
          serviceName: booking.serviceName,
          serviceDetail: booking.serviceDetail,
          price: booking.price,
          date: booking.date,
          time: booking.time,
          address: booking.address,
          city: booking.city,
        }),
      });

      if (!response.ok) {
        const emailError = await response.text();
        console.error("Confirmation email failed:", emailError);
        window.alert("The customer confirmation email could not be sent.");
        return false;
      }

      const result = await response.json();
      window.alert(
        result.reminderScheduled
          ? `Confirmation sent to ${booking.email}. A 24-hour reminder is also scheduled.`
          : `Confirmation sent to ${booking.email}. ${result.reminderReason || "No reminder was scheduled."}`
      );
      return true;
    } catch (error) {
      console.error(error);
      window.alert("The customer confirmation email could not be sent.");
      return false;
    } finally {
      setSendingConfirmation(null);
    }
  }

  async function update(booking: Booking, fields: Partial<Booking>) {
    try {
      await updateDoc(doc(db, "bookings", booking.id), fields);

      const isNewConfirmation =
        fields.status === "Confirmed" && booking.status !== "Confirmed";

      if (isNewConfirmation) {
        await sendConfirmation(booking);
      }
    } catch (error) {
      console.error(error);
      window.alert("That change could not be saved. Please try again.");
    }
  }

  async function updateBladeService(
    booking: Booking,
    jobType: string,
    bladeCount: number,
  ) {
    const normalizedJobType = ["blade-changing", "maintenance"].includes(jobType) ? jobType : "sharpening";
    const normalizedBladeCount = normalizedJobType === "maintenance" ? 0 : Math.max(1, Math.min(6, bladeCount));
    const serviceDetail = normalizedJobType === "maintenance"
      ? `Basic Maintenance · ${booking.equipmentMake || "Make needed"} ${booking.equipmentModel || "Model needed"} · parts additional`
      : `${normalizedJobType === "blade-changing" ? "Blade changing only" : "Blade sharpening"} · ${normalizedBladeCount} ${normalizedBladeCount === 1 ? "blade" : "blades"}`;

    await update(booking, {
      jobType: normalizedJobType,
      bladeCount: normalizedBladeCount,
      serviceDetail,
      price: servicePrice(normalizedJobType, booking.serviceId, normalizedBladeCount),
    });
  }

  async function sendSeasonalReminder(booking: Booking) {
    if (!booking.email) {
      window.alert("This customer did not provide an email address.");
      return;
    }

    if (!user) {
      window.alert("Your owner session has expired. Please sign in again.");
      return;
    }

    setSendingSeasonalReminder(booking.id);
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch("/api/seasonal-reminder", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: booking.id,
          name: booking.name,
          email: booking.email,
          lastServiceDate: booking.date,
          serviceName: booking.serviceName,
        }),
      });

      if (!response.ok) {
        console.error("Seasonal reminder failed:", await response.text());
        window.alert("The seasonal reminder email could not be sent.");
        return;
      }

      await updateDoc(doc(db, "bookings", booking.id), {
        seasonalReminderSentAt: new Date().toISOString(),
      });
      window.alert(`Seasonal reminder sent to ${booking.email}.`);
    } catch (error) {
      console.error(error);
      window.alert("The seasonal reminder email could not be sent.");
    } finally {
      setSendingSeasonalReminder(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this appointment permanently?")) return;
    try {
      await deleteDoc(doc(db, "bookings", id));
    } catch (error) {
      console.error(error);
      window.alert("The appointment could not be deleted.");
    }
  }

  async function addBlockedSlot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!blockDate) return;
    setSavingBlock(true);
    const id = blockedSlotId(blockDate, blockTime);
    try {
      await setDoc(doc(db, "blockedSlots", id), {
        date: blockDate,
        time: blockTime,
        reason: blockReason.trim(),
        createdAt: new Date().toISOString(),
      });
      setBlockReason("");
    } catch (error) {
      console.error(error);
      window.alert("That blocked time could not be saved.");
    } finally {
      setSavingBlock(false);
    }
  }

  async function removeBlockedSlot(id: string) {
    try {
      await deleteDoc(doc(db, "blockedSlots", id));
    } catch (error) {
      console.error(error);
      window.alert("That blocked time could not be reopened.");
    }
  }

  if (authLoading || !user) return <main className="admin-shell"><p>Checking owner access...</p></main>;

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Owner dashboard</p>
          <h1>Business overview</h1>
          <p className="muted">Signed in as {user.email}</p>
        </div>
        <div className="hero-actions">
          <a className="button secondary" href="/book">New booking</a>
          <button className="button dark" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </header>

      <section className="admin-summary">
        <article><span>Today</span><strong>{todayBookings.length}</strong><small>{formatDate(today)}</small></article>
        <article><span>Upcoming value</span><strong>${scheduledValue}</strong><small>{upcoming.length} appointments</small></article>
        <article><span>Paid revenue</span><strong>${completedRevenue}</strong><small>Completed and paid</small></article>
        <article><span>Unpaid value</span><strong>${unpaidValue}</strong><small>Needs collection</small></article>
      </section>

      <section className="dashboard-tools">
        <div>
          <p className="eyebrow">Quick action</p>
          <h2>{todayBookings.length ? `${todayBookings.length} stop${todayBookings.length === 1 ? "" : "s"} today` : "No stops scheduled today"}</h2>
          <p className="muted">Open today&apos;s appointments as a multi-stop route in Google Maps.</p>
        </div>
        <a className={`button primary ${todayBookings.length ? "" : "disabled-link"}`} target="_blank" rel="noreferrer" href={routeUrl(todayBookings)}>Open today&apos;s route</a>
      </section>

      <section className="availability-panel">
        <div className="availability-heading">
          <div>
            <p className="eyebrow">Schedule controls</p>
            <h2>Block unavailable dates or times</h2>
            <p className="muted">Customers will see these openings as unavailable on the booking page.</p>
          </div>
        </div>
        <form className="availability-form" onSubmit={addBlockedSlot}>
          <label>Date<input type="date" min={today} required value={blockDate} onChange={(event) => setBlockDate(event.target.value)} /></label>
          <label>Time<select value={blockTime} onChange={(event) => setBlockTime(event.target.value)}>{appointmentTimes.map((time) => <option key={time}>{time}</option>)}</select></label>
          <label>Reason (optional)<input placeholder="Vacation, weather, personal" value={blockReason} onChange={(event) => setBlockReason(event.target.value)} /></label>
          <button className="button dark" disabled={savingBlock}>{savingBlock ? "Blocking..." : "Block time"}</button>
        </form>
        <div className="blocked-slot-list">
          {blockedSlots.filter((slot) => slot.date >= today).length === 0 && <p className="muted">No future dates or times are blocked.</p>}
          {blockedSlots.filter((slot) => slot.date >= today).map((slot) => <div key={slot.id}><span><strong>{formatDate(slot.date)} · {slot.time}</strong>{slot.reason && <small>{slot.reason}</small>}</span><button className="button secondary small" type="button" onClick={() => removeBlockedSlot(slot.id)}>Reopen</button></div>)}
        </div>
      </section>

      {dataError && <p className="form-error" role="alert">{dataError}</p>}

      <section className="dashboard-controls">
        <div className="filter-tabs">
          {filterOptions.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
        <input className="search-box" aria-label="Search appointments" placeholder="Search customer, phone, city, address, service" value={search} onChange={(e) => setSearch(e.target.value)} />
      </section>

      {filter === "Customers" ? (
        <section className="customer-grid">
          {customerGroups.length === 0 && <article className="empty-state"><h2>No customers yet</h2><p>Customer history will appear after bookings are submitted.</p></article>}
          {customerGroups.map((history) => {
            const completedHistory = history.filter((item) => item.status === "Completed");
            const latest = [...(completedHistory.length ? completedHistory : history)].sort((a, b) => b.date.localeCompare(a.date))[0];
            const paidTotal = history.filter((item) => item.paymentStatus === "Paid").reduce((sum, item) => sum + Number(item.price || 0), 0);
            const reminderDueDate = addMonths(latest.date, 4);
            const reminderDue = latest.status === "Completed" && reminderDueDate <= today;
            const seasonalText = encodeURIComponent(`Hi ${latest.name}, this is Russell's Mobile Blade Sharpening. It may be time to have your mower blades sharpened again. Book online at https://www.russellsmobileblade.com/book or call/text 985-295-1163. Thank you!`);
            return <article className="customer-card" key={customerKey(latest)}>
              <div className="booking-card-heading"><div><p className="eyebrow">{history.length} visit{history.length === 1 ? "" : "s"}</p><h2>{latest.name}</h2><p>{latest.city}</p></div><strong>${paidTotal}</strong></div>
              <div className={`reminder-status ${reminderDue ? "due" : "scheduled"}`}><strong>{reminderDue ? "Seasonal reminder due" : `Next reminder ${formatDate(reminderDueDate)}`}</strong>{latest.seasonalReminderSentAt && <small>Last reminder sent {new Date(latest.seasonalReminderSentAt).toLocaleDateString()}</small>}</div>
              <p><a href={`tel:${latest.phone}`}>{latest.phone}</a>{latest.email && <><br /><a href={`mailto:${latest.email}`}>{latest.email}</a></>}</p>
              <div className="history-list">{history.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((item) => <div key={item.id}><span>{formatDate(item.date)}</span><b>{item.serviceName}</b><small>{item.status} · {item.paymentStatus}</small></div>)}</div>
              <div className="card-actions"><a className="button primary small" href={`tel:${latest.phone}`}>Call</a><a className="button secondary small" href={`sms:${latest.phone}?body=${seasonalText}`}>Seasonal text</a>{latest.email && <button className="button secondary small" type="button" disabled={sendingSeasonalReminder === latest.id} onClick={() => sendSeasonalReminder(latest)}>{sendingSeasonalReminder === latest.id ? "Sending reminder..." : "Seasonal email"}</button>}</div>
            </article>;
          })}
        </section>
      ) : (
        <section className="booking-list">
          {visible.length === 0 && <article className="empty-state"><h2>No matching appointments</h2><p>Choose another filter or submit a new booking.</p></article>}
          {visible.map((booking) => {
            const visits = customerGroups.find((group) => customerKey(group[0]) === customerKey(booking))?.length || 1;
            const onMyWay = encodeURIComponent(`Hi ${booking.name}, this is Russell's Mobile Blade Sharpening. I'm on my way to your ${booking.time} appointment.`);
            const reviewRequest = encodeURIComponent(`Hi ${booking.name}, your blades have been sharpened and are ready to help you get a cleaner, better cut. Thank you for choosing Russell's Mobile Blade Sharpening!`);
            return <article className="booking-card" key={booking.id}>
              <div className="booking-card-heading">
                <div><div className="status-line"><span className={`status-badge status-${booking.status.toLowerCase()}`}>{booking.status}</span><span className={`payment-badge ${booking.paymentStatus === "Paid" ? "paid" : "unpaid"}`}>{booking.paymentStatus}</span></div><p className="eyebrow">{formatDate(booking.date)} · {booking.time}</p><h2>{booking.name}</h2><p>{booking.serviceName} ({booking.serviceDetail}) · {booking.city} · {visits} customer visit{visits === 1 ? "" : "s"}</p></div>
                <strong>${booking.price}</strong>
              </div>
              <div className="booking-card-grid"><div><span>Address</span><p>{booking.address}, {booking.city}</p></div><div><span>Contact</span><p><a href={`tel:${booking.phone}`}>{booking.phone}</a>{booking.email && <><br /><a href={`mailto:${booking.email}`}>{booking.email}</a></>}</p></div><div><span>Notes</span><p>{booking.notes || "None"}</p></div>{booking.jobType === "maintenance" && <div className="full-field"><span>Genuine OEM parts lookup</span><p><strong>Equipment:</strong> {booking.equipmentMake} {booking.equipmentModel}<br /><strong>Engine:</strong> {booking.engineMake} {booking.engineModel}<br /><strong>Filter:</strong> {booking.filterType || "Not specified"}{booking.serialNumber ? <><br /><strong>Serial:</strong> {booking.serialNumber}</> : null}</p><div className="card-actions"><a className="button secondary small" href={partsLookupUrl(booking, "engine")} target="_blank" rel="noreferrer">OEM lookup by engine</a><a className="button secondary small" href={partsLookupUrl(booking, "equipment")} target="_blank" rel="noreferrer">OEM lookup by equipment</a><a className="button secondary small" href={amazonOemPartsUrl(booking)} target="_blank" rel="noreferrer">Search OEM parts on Amazon</a><a className="button secondary small" href="https://www.amazon.com/gp/cart/view.html" target="_blank" rel="noreferrer">Open Amazon cart</a></div><small className="muted">Use the official manufacturer catalog to verify the OEM part number before selecting an Amazon listing and adding it to your cart.</small></div>}</div>
              <div className="management-row"><label>Service<select value={booking.jobType || "sharpening"} onChange={(e) => updateBladeService(booking, e.target.value, booking.bladeCount || 1)}><option value="sharpening">Sharpen blades</option><option value="blade-changing">Change blades</option><option value="maintenance">Basic Maintenance</option></select></label>{booking.jobType !== "maintenance" && <label>Blades<select value={booking.bladeCount || 1} onChange={(e) => updateBladeService(booking, booking.jobType || "sharpening", Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>}<label>Status<select value={booking.status} onChange={(e) => update(booking, { status: e.target.value as BookingStatus })}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label>Payment<select value={booking.paymentStatus} onChange={(e) => update(booking, { paymentStatus: e.target.value as PaymentStatus })}><option>Unpaid</option><option>Paid</option></select></label><label>Method<select value={booking.paymentMethod || ""} onChange={(e) => update(booking, { paymentMethod: e.target.value as Booking["paymentMethod"] })}>{paymentMethods.map((item) => <option key={item} value={item}>{item || "Not selected"}</option>)}</select></label></div>
              <div className="card-actions"><a className="button primary small" href={`tel:${booking.phone}`}>Call</a><a className="button secondary small" href={`sms:${booking.phone}`}>Text</a>{booking.email && <button className="button secondary small" type="button" disabled={sendingConfirmation === booking.id} onClick={() => sendConfirmation(booking)}>{sendingConfirmation === booking.id ? "Sending email..." : "Send confirmation email"}</button>}<a className="button secondary small" href={`sms:${booking.phone}?body=${onMyWay}`}>I&apos;m on my way</a><a className="button secondary small" href={`sms:${booking.phone}?body=${reviewRequest}`}>Review message</a><a className="button secondary small" target="_blank" rel="noreferrer" href={mapsSearchUrl(booking)}>Directions</a><button className="button danger small" onClick={() => remove(booking.id)}>Delete</button></div>
            </article>;
          })}
        </section>
      )}
    </main>
  );
}
