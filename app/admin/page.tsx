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
const otherOption = "Other / not listed";
const equipmentMakes = ["Ariens", "Bad Boy", "Bobcat", "Bush Hog", "Craftsman", "Cub Cadet", "Dixie Chopper", "Exmark", "Ferris", "Gravely", "Honda", "Husqvarna", "Hustler", "John Deere", "Kioti", "Kubota", "Mahindra", "Massey Ferguson", "MTD", "Murray", "New Holland", "Poulan Pro", "Ryobi", "Scag", "Snapper", "Spartan", "Toro", "Troy-Bilt", otherOption];
const engineMakes = ["Briggs & Stratton", "Generac", "Honda", "Kawasaki", "Kohler", "Kubota", "Vanguard", "Yamaha", otherOption];
const engineHorsepowerOptions = ["Not sure", ...Array.from({ length: 38 }, (_, index) => `${index + 3} HP`)];
const equipmentModels: Record<string, string[]> = {
  Ariens: ["IKON", "EDGE", "APEX", "RAZOR", "CLASSIC"],
  "Bad Boy": ["MZ Rambler", "MZ Magnum", "ZT Elite", "Avenger", "Rebel"],
  "Bush Hog": ["BH100", "BH200", "BH300", "SQ Series", "Razorback Series"],
  Craftsman: ["M100", "M110", "M210", "T100", "T110", "T210", "Z5200"],
  "Cub Cadet": ["SC Series", "XT1", "XT2", "Ultima ZT1", "Ultima ZT2"],
  "Dixie Chopper": ["Falcon HP", "Falcon HPX", "Zee 2", "Zee 2 HP", "BlackHawk", "BlackHawk HP", "Eagle", "Eagle HP", "Classic", "Xcaliber", "Magnum", "Silver Eagle", "Zee 1", "RZT"],
  Exmark: ["Quest", "Radius", "Lazer Z", "Navigator"],
  Ferris: ["IS 600", "IS 700", "ISX 800", "ISX 2200", "F Series"],
  Gravely: ["ZT X", "ZT XL", "Pro-Turn Z", "Pro-Turn ZX", "Pro-Turn 300"],
  Honda: ["HRN216", "HRX217", "HRC216"],
  Husqvarna: ["YTH Series", "TS Series", "Z200 Series", "Z400 Series", "Xcite"],
  Hustler: ["Dash", "Raptor", "Raptor XD", "FasTrak", "Super Z"],
  "John Deere": ["100 Series", "200 Series", "X300 Series", "X500 Series", "Z300 Series", "Z500 Series", "Z700 Series", "1 Series", "2 Series", "3 Series"],
  Kioti: ["CS Series", "CK Series", "DK Series", "NX Series"],
  Kubota: ["T Series", "GR Series", "Z100 Series", "Z200 Series", "Z400 Series", "BX Series", "B Series", "L Series"],
  Mahindra: ["eMax Series", "Max Series", "1600 Series", "2600 Series"],
  "Massey Ferguson": ["GC1700 Series", "1800E Series", "2800E Series"],
  "New Holland": ["Workmaster Series", "Boomer Series", "PowerStar Series"],
  Ryobi: ["40V HP", "80V HP", "RY48ZTR"],
  Scag: ["Liberty Z", "Freedom Z", "Patriot", "Tiger Cat II", "Cheetah II"],
  Snapper: ["SP Series", "Classic Rear Engine Rider", "360Z", "400Z"],
  Spartan: ["RZ", "RT", "SRT", "KG"],
  Toro: ["Recycler", "Super Recycler", "TimeMaster", "TimeCutter", "Titan", "Z Master"],
  "Troy-Bilt": ["TB110", "TB130", "TB200", "Pony", "Bronco", "Mustang"],
};
const engineModels: Record<string, string[]> = {
  "Briggs & Stratton": ["300E Series", "450E Series", "500E Series", "550E Series", "625EXi Series", "725EXi Series", "Professional Series", "Intek", "EXi Series"],
  Honda: ["GCV160", "GCV170", "GCV190", "GCV200", "GX160", "GX200", "GX270", "GX390"],
  Kawasaki: ["FR541V", "FR600V", "FR651V", "FR691V", "FR730V", "FS481V", "FS541V", "FS600V", "FS651V", "FS691V", "FS730V", "FX Series"],
  Kohler: ["Courage", "Command PRO", "7000 Series", "Confidant", "KT610", "KT620", "KT725", "KT730", "KT735", "KT740", "KT745"],
  Kubota: ["D722", "D902", "D1005", "D1105", "D1305", "V1505"],
  Vanguard: ["Single-Cylinder", "V-Twin", "Small Block V-Twin", "Big Block V-Twin"],
  Yamaha: ["MA190", "MX Series", "MXV Series"],
};
type Filter = (typeof filterOptions)[number];
type PartsLookupDetails = {
  equipmentType?: string;
  equipmentMake?: string;
  equipmentModel?: string;
  engineMake?: string;
  engineModel?: string;
  engineHorsepower?: string;
  serialNumber?: string;
  filterType?: string;
};

function servicePrice(jobType: string, serviceId: string, bladeCount: number) {
  if (jobType === "maintenance") {
    return ({ "push-mower": 45, "riding-mower": 75, "zero-turn": 85, tractor: 115 } as Record<string, number>)[serviceId] || 0;
  }
  if (jobType === "blade-changing") {
    return bladeCount * (serviceId === "bush-hog" ? 25 : 10);
  }
  if (jobType === "chainsaw-sharpening") {
    return ({ "chainsaw-up-to-16": 15, "chainsaw-18-20": 20, "chainsaw-24-28": 25, "chainsaw-32-36-plus": 30 } as Record<string, number>)[serviceId] || 0;
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

function partsLookupUrl(details: PartsLookupDetails, lookupType: "engine" | "equipment") {
  const identifiers = lookupType === "engine"
    ? [
        details.engineMake,
        details.engineModel,
        details.engineHorsepower,
        details.serialNumber,
        details.filterType,
        "genuine OEM manufacturer engine maintenance parts official parts catalog OEM part numbers oil capacity oil filter air filter fuel filter spark plug parts diagram -aftermarket",
      ]
    : [
        details.equipmentType,
        details.equipmentMake,
        details.equipmentModel,
        details.serialNumber,
        "genuine OEM manufacturer equipment maintenance parts official parts catalog OEM part numbers manual parts diagram -aftermarket",
      ];

  return `https://www.google.com/search?q=${encodeURIComponent(
    identifiers.filter(Boolean).join(" ")
  )}`;
}

function amazonOemPartsUrl(details: PartsLookupDetails) {
  const identifiers = [
    details.equipmentType,
    details.equipmentMake,
    details.equipmentModel,
    details.engineMake,
    details.engineModel,
    details.engineHorsepower,
    details.serialNumber,
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
  const [partsEquipmentType, setPartsEquipmentType] = useState("Push mower");
  const [partsEquipmentMake, setPartsEquipmentMake] = useState("");
  const [partsEquipmentModel, setPartsEquipmentModel] = useState("");
  const [customEquipmentMake, setCustomEquipmentMake] = useState("");
  const [customEquipmentModel, setCustomEquipmentModel] = useState("");
  const [partsEngineMake, setPartsEngineMake] = useState("");
  const [partsEngineModel, setPartsEngineModel] = useState("");
  const [customEngineMake, setCustomEngineMake] = useState("");
  const [customEngineModel, setCustomEngineModel] = useState("");
  const [partsEngineHorsepower, setPartsEngineHorsepower] = useState("");
  const [partsSerialNumber, setPartsSerialNumber] = useState("");
  const [partsFilterType, setPartsFilterType] = useState("Not sure");

  const equipmentMakeValue = partsEquipmentMake === otherOption ? customEquipmentMake.trim() : partsEquipmentMake;
  const equipmentModelValue = partsEquipmentModel === otherOption ? customEquipmentModel.trim() : partsEquipmentModel;
  const engineMakeValue = partsEngineMake === otherOption ? customEngineMake.trim() : partsEngineMake;
  const engineModelValue = partsEngineModel === otherOption ? customEngineModel.trim() : partsEngineModel;
  const availableEquipmentModels = partsEquipmentMake ? [...(equipmentModels[partsEquipmentMake] || []), otherOption] : [];
  const availableEngineModels = partsEngineMake ? [...(engineModels[partsEngineMake] || []), otherOption] : [];

  const ownerPartsLookup: PartsLookupDetails = {
    equipmentType: partsEquipmentType,
    equipmentMake: equipmentMakeValue,
    equipmentModel: equipmentModelValue,
    engineMake: engineMakeValue,
    engineModel: engineModelValue,
    engineHorsepower: partsEngineHorsepower.trim(),
    serialNumber: partsSerialNumber.trim(),
    filterType: partsFilterType,
  };
  const canLookupEquipment = Boolean(equipmentMakeValue && equipmentModelValue);
  const canLookupEngine = Boolean(engineMakeValue && engineModelValue);
  const canSearchAmazon = canLookupEquipment || canLookupEngine;

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
          engineHorsepower: booking.engineHorsepower,
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
    const normalizedJobType = ["blade-changing", "maintenance", "chainsaw-sharpening"].includes(jobType) ? jobType : "sharpening";
    const normalizedBladeCount = ["maintenance", "chainsaw-sharpening"].includes(normalizedJobType) ? 0 : Math.max(1, Math.min(6, bladeCount));
    const serviceDetail = normalizedJobType === "maintenance"
      ? `Basic Maintenance · ${booking.equipmentMake || "Make needed"} ${booking.equipmentModel || "Model needed"} · parts additional`
      : normalizedJobType === "chainsaw-sharpening"
        ? `${booking.barSize || "Bar size needed"} · ${booking.chainPitch || "Pitch needed"} pitch${booking.chainRemoval ? " · chain removal and reinstallation included" : " · chain supplied off the saw"}`
        : `${normalizedJobType === "blade-changing" ? "Blade changing only" : "Blade sharpening"} · ${normalizedBladeCount} ${normalizedBladeCount === 1 ? "blade" : "blades"}`;

    await update(booking, {
      jobType: normalizedJobType,
      bladeCount: normalizedBladeCount,
      serviceDetail,
      price: Math.max(40, servicePrice(normalizedJobType, booking.serviceId, normalizedBladeCount) + (normalizedJobType === "chainsaw-sharpening" && booking.chainRemoval ? 5 : 0)),
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
          <p className="eyebrow">Owner tool</p>
          <h2>Standalone OEM parts lookup</h2>
          <p className="muted">Find manufacturer-recommended parts without creating or opening a customer booking.</p>
        </div>
        <div className="parts-lookup-form">
          <label>Equipment type<select value={partsEquipmentType} onChange={(event) => setPartsEquipmentType(event.target.value)}><option>Push mower</option><option>Riding mower</option><option>Zero turn</option><option>Tractor</option><option>Bush Hog</option><option>Other</option></select></label>
          <label>Equipment make<select value={partsEquipmentMake} onChange={(event) => { setPartsEquipmentMake(event.target.value); setPartsEquipmentModel(""); setCustomEquipmentMake(""); setCustomEquipmentModel(""); }}><option value="">Select make</option>{equipmentMakes.map((make) => <option key={make}>{make}</option>)}</select></label>
          {partsEquipmentMake === otherOption && <label>Other equipment make<input placeholder="Enter manufacturer" value={customEquipmentMake} onChange={(event) => setCustomEquipmentMake(event.target.value)} /></label>}
          <label>Equipment model<select value={partsEquipmentModel} disabled={!partsEquipmentMake} onChange={(event) => { setPartsEquipmentModel(event.target.value); setCustomEquipmentModel(""); }}><option value="">Select model or series</option>{availableEquipmentModels.map((model) => <option key={model}>{model}</option>)}</select></label>
          {partsEquipmentModel === otherOption && <label>Exact equipment model<input placeholder="Enter model number" value={customEquipmentModel} onChange={(event) => setCustomEquipmentModel(event.target.value)} /></label>}
          <label>Engine make<select value={partsEngineMake} onChange={(event) => { setPartsEngineMake(event.target.value); setPartsEngineModel(""); setCustomEngineMake(""); setCustomEngineModel(""); }}><option value="">Select make</option>{engineMakes.map((make) => <option key={make}>{make}</option>)}</select></label>
          {partsEngineMake === otherOption && <label>Other engine make<input placeholder="Enter manufacturer" value={customEngineMake} onChange={(event) => setCustomEngineMake(event.target.value)} /></label>}
          <label>Engine model<select value={partsEngineModel} disabled={!partsEngineMake} onChange={(event) => { setPartsEngineModel(event.target.value); setCustomEngineModel(""); }}><option value="">Select model or series</option>{availableEngineModels.map((model) => <option key={model}>{model}</option>)}</select></label>
          {partsEngineModel === otherOption && <label>Exact engine model<input placeholder="Enter model number" value={customEngineModel} onChange={(event) => setCustomEngineModel(event.target.value)} /></label>}
          <label>Engine horsepower (HP)<select value={partsEngineHorsepower} onChange={(event) => setPartsEngineHorsepower(event.target.value)}><option value="">Select engine horsepower</option>{engineHorsepowerOptions.map((horsepower) => <option key={horsepower} value={horsepower}>{horsepower}</option>)}</select></label>
          <label>Serial number<input placeholder="Optional" value={partsSerialNumber} onChange={(event) => setPartsSerialNumber(event.target.value)} /></label>
          <label>Air filter type<select value={partsFilterType} onChange={(event) => setPartsFilterType(event.target.value)}><option>Not sure</option><option>Standard residential</option><option>Commercial canister</option></select></label>
        </div>
        <div className="card-actions">
          <a className={`button secondary small ${canLookupEngine ? "" : "disabled-link"}`} href={partsLookupUrl(ownerPartsLookup, "engine")} target="_blank" rel="noreferrer" aria-disabled={!canLookupEngine}>OEM lookup by engine</a>
          <a className={`button secondary small ${canLookupEquipment ? "" : "disabled-link"}`} href={partsLookupUrl(ownerPartsLookup, "equipment")} target="_blank" rel="noreferrer" aria-disabled={!canLookupEquipment}>OEM lookup by equipment</a>
          <a className={`button secondary small ${canSearchAmazon ? "" : "disabled-link"}`} href={amazonOemPartsUrl(ownerPartsLookup)} target="_blank" rel="noreferrer" aria-disabled={!canSearchAmazon}>Search OEM parts on Amazon</a>
          <a className="button secondary small" href="https://www.amazon.com/gp/cart/view.html" target="_blank" rel="noreferrer">Open Amazon cart</a>
        </div>
        <p className="parts-lookup-note">Enter both the make and model to enable a lookup. Always verify the OEM part number in the official manufacturer catalog before ordering.</p>
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
              <div className="booking-card-grid"><div><span>Address</span><p>{booking.address}, {booking.city}</p></div><div><span>Contact</span><p><a href={`tel:${booking.phone}`}>{booking.phone}</a>{booking.email && <><br /><a href={`mailto:${booking.email}`}>{booking.email}</a></>}</p></div><div><span>Notes</span><p>{booking.notes || "None"}</p></div>{booking.jobType === "chainsaw-sharpening" && <div><span>Chainsaw</span><p><strong>Bar size:</strong> {booking.barSize || "Not specified"}<br /><strong>Chain pitch:</strong> {booking.chainPitch || "Not specified"}<br /><strong>Chain:</strong> {booking.chainRemoval ? "Remove and reinstall (+$5)" : "Customer supplies chain off saw"}</p></div>}{booking.jobType === "maintenance" && <div className="full-field"><span>Genuine OEM parts lookup</span><p><strong>Equipment:</strong> {booking.equipmentMake} {booking.equipmentModel}<br /><strong>Engine:</strong> {booking.engineMake} {booking.engineModel}{booking.engineHorsepower ? ` · ${booking.engineHorsepower}` : ""}<br /><strong>Air filter:</strong> {booking.filterType || "Not specified"}{booking.serialNumber ? <><br /><strong>Serial:</strong> {booking.serialNumber}</> : null}</p><div className="card-actions"><a className="button secondary small" href={partsLookupUrl({ ...booking, equipmentType: booking.serviceName }, "engine")} target="_blank" rel="noreferrer">OEM lookup by engine</a><a className="button secondary small" href={partsLookupUrl({ ...booking, equipmentType: booking.serviceName }, "equipment")} target="_blank" rel="noreferrer">OEM lookup by equipment</a><a className="button secondary small" href={amazonOemPartsUrl({ ...booking, equipmentType: booking.serviceName })} target="_blank" rel="noreferrer">Search OEM parts on Amazon</a><a className="button secondary small" href="https://www.amazon.com/gp/cart/view.html" target="_blank" rel="noreferrer">Open Amazon cart</a></div><small className="muted">Use the official manufacturer catalog to verify the OEM part number before selecting an Amazon listing and adding it to your cart.</small></div>}</div>
              <div className="management-row"><label>Service<select value={booking.jobType || "sharpening"} onChange={(e) => updateBladeService(booking, e.target.value, booking.bladeCount || 1)}><option value="sharpening">Sharpen blades</option><option value="blade-changing">Change blades</option><option value="chainsaw-sharpening">Chainsaw chain sharpening</option><option value="maintenance">Basic Maintenance</option></select></label>{!["maintenance", "chainsaw-sharpening"].includes(booking.jobType || "") && <label>Blades<select value={booking.bladeCount || 1} onChange={(e) => updateBladeService(booking, booking.jobType || "sharpening", Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>}<label>Status<select value={booking.status} onChange={(e) => update(booking, { status: e.target.value as BookingStatus })}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label>Payment<select value={booking.paymentStatus} onChange={(e) => update(booking, { paymentStatus: e.target.value as PaymentStatus })}><option>Unpaid</option><option>Paid</option></select></label><label>Method<select value={booking.paymentMethod || ""} onChange={(e) => update(booking, { paymentMethod: e.target.value as Booking["paymentMethod"] })}>{paymentMethods.map((item) => <option key={item} value={item}>{item || "Not selected"}</option>)}</select></label></div>
              <div className="card-actions"><a className="button primary small" href={`tel:${booking.phone}`}>Call</a><a className="button secondary small" href={`sms:${booking.phone}`}>Text</a>{booking.email && <button className="button secondary small" type="button" disabled={sendingConfirmation === booking.id} onClick={() => sendConfirmation(booking)}>{sendingConfirmation === booking.id ? "Sending email..." : "Send confirmation email"}</button>}<a className="button secondary small" href={`sms:${booking.phone}?body=${onMyWay}`}>I&apos;m on my way</a><a className="button secondary small" href={`sms:${booking.phone}?body=${reviewRequest}`}>Review message</a><a className="button secondary small" target="_blank" rel="noreferrer" href={mapsSearchUrl(booking)}>Directions</a><button className="button danger small" onClick={() => remove(booking.id)}>Delete</button></div>
            </article>;
          })}
        </section>
      )}
    </main>
  );
}
