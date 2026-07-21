"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import type { Booking, BookingStatus, PaymentStatus } from "@/lib/types";

const statusOptions: BookingStatus[] = ["Pending", "Confirmed", "Completed", "Cancelled"];
const paymentMethods = ["", "Cash", "Cash App", "Venmo"] as const;
const filterOptions = ["Today", "Upcoming", "Unpaid", "Completed", "Customers", "All"] as const;
type Filter = (typeof filterOptions)[number];

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  if (!value) return "No date";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function customerKey(booking: Booking) {
  return booking.phone.replace(/\D/g, "") || booking.email.toLowerCase();
}

function mapsSearchUrl(booking: Booking) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${booking.address}, ${booking.city}, LA`)}`;
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

  async function update(id: string, fields: Partial<Booking>) {
    try {
      await updateDoc(doc(db, "bookings", id), fields);
    } catch (error) {
      console.error(error);
      window.alert("That change could not be saved. Please try again.");
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
            const latest = [...history].sort((a, b) => b.date.localeCompare(a.date))[0];
            const paidTotal = history.filter((item) => item.paymentStatus === "Paid").reduce((sum, item) => sum + Number(item.price || 0), 0);
            return <article className="customer-card" key={customerKey(latest)}>
              <div className="booking-card-heading"><div><p className="eyebrow">{history.length} visit{history.length === 1 ? "" : "s"}</p><h2>{latest.name}</h2><p>{latest.city}</p></div><strong>${paidTotal}</strong></div>
              <p><a href={`tel:${latest.phone}`}>{latest.phone}</a>{latest.email && <><br /><a href={`mailto:${latest.email}`}>{latest.email}</a></>}</p>
              <div className="history-list">{history.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((item) => <div key={item.id}><span>{formatDate(item.date)}</span><b>{item.serviceName}</b><small>{item.status} · {item.paymentStatus}</small></div>)}</div>
              <div className="card-actions"><a className="button primary small" href={`tel:${latest.phone}`}>Call</a><a className="button secondary small" href={`sms:${latest.phone}`}>Text</a></div>
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
              <div className="booking-card-grid"><div><span>Address</span><p>{booking.address}, {booking.city}</p></div><div><span>Contact</span><p><a href={`tel:${booking.phone}`}>{booking.phone}</a>{booking.email && <><br /><a href={`mailto:${booking.email}`}>{booking.email}</a></>}</p></div><div><span>Notes</span><p>{booking.notes || "None"}</p></div></div>
              <div className="management-row"><label>Status<select value={booking.status} onChange={(e) => update(booking.id, { status: e.target.value as BookingStatus })}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label>Payment<select value={booking.paymentStatus} onChange={(e) => update(booking.id, { paymentStatus: e.target.value as PaymentStatus })}><option>Unpaid</option><option>Paid</option></select></label><label>Method<select value={booking.paymentMethod || ""} onChange={(e) => update(booking.id, { paymentMethod: e.target.value as Booking["paymentMethod"] })}>{paymentMethods.map((item) => <option key={item} value={item}>{item || "Not selected"}</option>)}</select></label></div>
              <div className="card-actions"><a className="button primary small" href={`tel:${booking.phone}`}>Call</a><a className="button secondary small" href={`sms:${booking.phone}`}>Text</a><a className="button secondary small" href={`sms:${booking.phone}?body=${onMyWay}`}>I&apos;m on my way</a><a className="button secondary small" href={`sms:${booking.phone}?body=${reviewRequest}`}>Review message</a><a className="button secondary small" target="_blank" rel="noreferrer" href={mapsSearchUrl(booking)}>Directions</a><button className="button danger small" onClick={() => remove(booking.id)}>Delete</button></div>
            </article>;
          })}
        </section>
      )}
    </main>
  );
}
