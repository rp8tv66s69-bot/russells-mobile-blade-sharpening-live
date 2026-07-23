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
  { id: "tractor", name: "Tractor" },
];

const bladeQuantities = [1, 2, 3, 4, 5, 6];
const maintenanceAvailableDate = "2026-07-31";
const maintenancePrices: Record<string, number> = {
  "push-mower": 45,
  "riding-mower": 75,
  "zero-turn": 85,
  tractor: 115,
};
const otherOption = "Other / not listed";
const equipmentMakes = ["Ariens", "Bad Boy", "Bobcat", "Bush Hog", "Craftsman", "Cub Cadet", "Dixie Chopper", "Exmark", "Ferris", "Gravely", "Honda", "Husqvarna", "Hustler", "John Deere", "Kioti", "Kubota", "Mahindra", "Massey Ferguson", "MTD", "Murray", "New Holland", "Poulan Pro", "Ryobi", "Scag", "Snapper", "Spartan", "Toro", "Troy-Bilt", otherOption];
const engineMakes = ["Briggs & Stratton", "Generac", "Honda", "Kawasaki", "Kohler", "Kubota", "Vanguard", "Yamaha", otherOption];
const equipmentModels: Record<string, string[]> = {
  Ariens: ["IKON", "EDGE", "APEX", "RAZOR", "CLASSIC"],
  "Bad Boy": ["MZ Rambler", "MZ Magnum", "ZT Elite", "Avenger", "Rebel"],
  "Bush Hog": ["BH100", "BH200", "BH300", "SQ Series", "Razorback Series"],
  Craftsman: ["M100", "M110", "M210", "T100", "T110", "T210", "Z5200"],
  "Cub Cadet": ["SC Series", "XT1", "XT2", "Ultima ZT1", "Ultima ZT2"],
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

function pricePerBlade(jobType: string, mowerType: string) {
  if (!jobType) return 0;
  if (jobType === "blade-changing") return mowerType === "bush-hog" ? 25 : 10;
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
  const [bladeSupplier, setBladeSupplier] = useState("");
  const [equipmentMake, setEquipmentMake] = useState("");
  const [equipmentModel, setEquipmentModel] = useState("");
  const [customEquipmentMake, setCustomEquipmentMake] = useState("");
  const [customEquipmentModel, setCustomEquipmentModel] = useState("");
  const [engineMake, setEngineMake] = useState("");
  const [engineModel, setEngineModel] = useState("");
  const [customEngineMake, setCustomEngineMake] = useState("");
  const [customEngineModel, setCustomEngineModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [filterType, setFilterType] = useState("");
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const isMaintenance = jobType === "maintenance";
  const currentPricePerBlade = pricePerBlade(jobType, selectedMowerType);
  const maintenanceLaborPrice = maintenancePrices[selectedMowerType] || 0;
  const equipmentMakeValue = equipmentMake === otherOption ? customEquipmentMake.trim() : equipmentMake;
  const equipmentModelValue = equipmentModel === otherOption ? customEquipmentModel.trim() : equipmentModel;
  const engineMakeValue = engineMake === otherOption ? customEngineMake.trim() : engineMake;
  const engineModelValue = engineModel === otherOption ? customEngineModel.trim() : engineModel;
  const availableEquipmentModels = equipmentMake ? [...(equipmentModels[equipmentMake] || []), otherOption] : [];
  const availableEngineModels = engineMake ? [...(engineModels[engineMake] || []), otherOption] : [];

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
    const selectedBladeSupplier = String(form.get("bladeSupplier") || "");
    const selectedMake = String(form.get("equipmentMake") || "").trim();
    const selectedModel = String(form.get("equipmentModel") || "").trim();
    const selectedEngineMake = String(form.get("engineMake") || "").trim();
    const selectedEngineModel = String(form.get("engineModel") || "").trim();
    const selectedSerialNumber = String(form.get("serialNumber") || "").trim();
    const selectedFilterType = String(form.get("filterType") || "");

    if (!["sharpening", "blade-changing", "maintenance"].includes(selectedJobType)) {
      setError("Please select a service.");
      setSaving(false);
      return;
    }

    if (!selectedService) {
      setError("Please select a mower type.");
      setSaving(false);
      return;
    }

    if (selectedJobType !== "maintenance" && !bladeQuantities.includes(selectedBladeCount)) {
      setError("Please select the number of blades.");
      setSaving(false);
      return;
    }

    if (
      selectedJobType === "blade-changing" &&
      !["Customer supplied", "Russell supplied"].includes(selectedBladeSupplier)
    ) {
      setError("Please choose who will supply the replacement blades.");
      setSaving(false);
      return;
    }

    if (selectedJobType === "maintenance") {
      if (!maintenancePrices[selectedService.id]) {
        setError("Basic Maintenance is available for push mowers, riding mowers, zero turns, and tractors.");
        setSaving(false);
        return;
      }
      if (!selectedMake || !selectedModel || !selectedEngineMake || !selectedEngineModel || !selectedFilterType) {
        setError("Please enter the equipment and engine details, including the filter type.");
        setSaving(false);
        return;
      }
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
      serviceDetail:
        selectedJobType === "maintenance"
          ? `Basic Maintenance · ${selectedMake} ${selectedModel} · parts additional`
          : `${selectedJobType === "blade-changing" ? "Blade changing only" : "Blade sharpening"} · ${selectedBladeCount} ${selectedBladeCount === 1 ? "blade" : "blades"}${selectedJobType === "blade-changing" ? ` · ${selectedBladeSupplier}` : ""}`,
      jobType: selectedJobType,
      bladeCount: selectedJobType === "maintenance" ? 0 : selectedBladeCount,
      bladeSupplier:
        selectedJobType === "blade-changing"
          ? (selectedBladeSupplier as "Customer supplied" | "Russell supplied")
          : "",
      equipmentMake: selectedJobType === "maintenance" ? selectedMake : "",
      equipmentModel: selectedJobType === "maintenance" ? selectedModel : "",
      engineMake: selectedJobType === "maintenance" ? selectedEngineMake : "",
      engineModel: selectedJobType === "maintenance" ? selectedEngineModel : "",
      serialNumber: selectedJobType === "maintenance" ? selectedSerialNumber : "",
      filterType: selectedJobType === "maintenance" ? selectedFilterType : "",
      price:
        selectedJobType === "maintenance"
          ? maintenancePrices[selectedService.id]
          : selectedBladeCount * pricePerBlade(selectedJobType, selectedService.id),
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
            equipmentMake: booking.equipmentMake,
            equipmentModel: booking.equipmentModel,
            engineMake: booking.engineMake,
            engineModel: booking.engineModel,
            serialNumber: booking.serialNumber,
            filterType: booking.filterType,
            bladeSupplier: booking.bladeSupplier,
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
      setBladeSupplier("");
      setEquipmentMake("");
      setEquipmentModel("");
      setCustomEquipmentMake("");
      setCustomEquipmentModel("");
      setEngineMake("");
      setEngineModel("");
      setCustomEngineMake("");
      setCustomEngineModel("");
      setSerialNumber("");
      setFilterType("");
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
          {submitted.bladeSupplier === "Russell supplied" && (
            <p className="parts-arrival-notice">
              Russell will order the correct replacement blades and let you know
              when he can perform the service based on the parts arrival date.
              Your requested date and time are tentative until Russell confirms them.
              Replacement blades are billed at the parts cost plus a 15% sourcing
              and handling charge, with a $10 minimum.
            </p>
          )}
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
        <h1>Book mobile blade or Basic Maintenance service</h1>
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
              <h2>Choose your service and equipment</h2>
              <p>Basic Maintenance appointments begin July 31, 2026. Maintenance prices are labor only; oil, filters, spark plugs, and other parts are additional.</p>
            </div>
          </div>

          <div className="field-grid">
            <label>
              <span>Service *</span>
              <select
                name="jobType"
                required
                value={jobType}
                onChange={(event) => {
                  setJobType(event.target.value);
                  setSelectedMowerType("");
                  setBladeCount(0);
                  setBladeSupplier("");
                }}
              >
                <option value="" disabled>Choose a service</option>
                <option value="sharpening">Blade sharpening</option>
                <option value="blade-changing">Blade changing only</option>
                <option value="maintenance">Basic Maintenance</option>
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
                <option value="" disabled>Choose equipment type</option>
                {mowerTypes.filter((mower) =>
                  isMaintenance ? mower.id !== "bush-hog" : mower.id !== "tractor"
                ).map((mower) => (
                  <option key={mower.id} value={mower.id}>{mower.name}</option>
                ))}
              </select>
            </label>

            {isMaintenance ? (
              <>
                <label>
                  <span>Equipment make *</span>
                  <select required value={equipmentMake} onChange={(event) => { setEquipmentMake(event.target.value); setEquipmentModel(""); setCustomEquipmentMake(""); setCustomEquipmentModel(""); }}>
                    <option value="" disabled>Select equipment make</option>
                    {equipmentMakes.map((make) => <option key={make}>{make}</option>)}
                  </select>
                </label>
                {equipmentMake === otherOption && <label><span>Other equipment make *</span><input required value={customEquipmentMake} onChange={(event) => setCustomEquipmentMake(event.target.value)} placeholder="Enter manufacturer" /></label>}
                <label>
                  <span>Equipment model or series *</span>
                  <select required disabled={!equipmentMake} value={equipmentModel} onChange={(event) => { setEquipmentModel(event.target.value); setCustomEquipmentModel(""); }}>
                    <option value="" disabled>Select model or series</option>
                    {availableEquipmentModels.map((model) => <option key={model}>{model}</option>)}
                  </select>
                </label>
                {equipmentModel === otherOption && <label><span>Exact equipment model *</span><input required value={customEquipmentModel} onChange={(event) => setCustomEquipmentModel(event.target.value)} placeholder="Enter model number" /></label>}
                <label>
                  <span>Engine manufacturer *</span>
                  <select required value={engineMake} onChange={(event) => { setEngineMake(event.target.value); setEngineModel(""); setCustomEngineMake(""); setCustomEngineModel(""); }}>
                    <option value="" disabled>Select engine manufacturer</option>
                    {engineMakes.map((make) => <option key={make}>{make}</option>)}
                  </select>
                </label>
                {engineMake === otherOption && <label><span>Other engine manufacturer *</span><input required value={customEngineMake} onChange={(event) => setCustomEngineMake(event.target.value)} placeholder="Enter manufacturer" /></label>}
                <label>
                  <span>Engine model *</span>
                  <select required disabled={!engineMake} value={engineModel} onChange={(event) => { setEngineModel(event.target.value); setCustomEngineModel(""); }}>
                    <option value="" disabled>Select engine model or series</option>
                    {availableEngineModels.map((model) => <option key={model}>{model}</option>)}
                  </select>
                </label>
                {engineModel === otherOption && <label><span>Exact engine model *</span><input required value={customEngineModel} onChange={(event) => setCustomEngineModel(event.target.value)} placeholder="Shown on the engine label" /></label>}
                <input type="hidden" name="equipmentMake" value={equipmentMakeValue} />
                <input type="hidden" name="equipmentModel" value={equipmentModelValue} />
                <input type="hidden" name="engineMake" value={engineMakeValue} />
                <input type="hidden" name="engineModel" value={engineModelValue} />
                <label>
                  <span>Serial number (recommended)</span>
                  <input name="serialNumber" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} placeholder="Equipment or engine serial number" />
                </label>
                <label>
                  <span>Filter type *</span>
                  <select name="filterType" required value={filterType} onChange={(event) => setFilterType(event.target.value)}>
                    <option value="" disabled>Choose filter type</option>
                    <option value="Standard residential">Standard residential</option>
                    <option value="Commercial canister">Commercial canister</option>
                    <option value="Not sure">Not sure</option>
                  </select>
                </label>
              </>
            ) : (
              <label>
                <span>Number of blades *</span>
                <select name="bladeCount" required value={bladeCount || ""} onChange={(event) => setBladeCount(Number(event.target.value))}>
                  <option value="" disabled>Choose blade quantity</option>
                  {bladeQuantities.map((quantity) => (
                    <option key={quantity} value={quantity}>{quantity} {quantity === 1 ? "blade" : "blades"}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {jobType === "blade-changing" && (
            <fieldset className="blade-supplier-choice">
              <legend>Who will supply the replacement blades? *</legend>
              <div className="blade-supplier-options">
                <label>
                  <input
                    type="radio"
                    name="bladeSupplier"
                    value="Customer supplied"
                    required
                    checked={bladeSupplier === "Customer supplied"}
                    onChange={(event) => setBladeSupplier(event.target.value)}
                  />
                  <span>
                    <strong>Customer supplied</strong>
                    <small>Have the correct replacement blades ready at the appointment.</small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="bladeSupplier"
                    value="Russell supplied"
                    required
                    checked={bladeSupplier === "Russell supplied"}
                    onChange={(event) => setBladeSupplier(event.target.value)}
                  />
                  <span>
                    <strong>Russell supplied</strong>
                    <small>Parts cost plus a 15% sourcing and handling charge ($10 minimum). The service date depends on when the blades arrive.</small>
                  </span>
                </label>
              </div>
              {bladeSupplier === "Russell supplied" && (
                <p className="parts-arrival-notice">
                  Your requested appointment is tentative. Russell will order the
                  correct blades and contact you with the service date after the
                  parts arrival date is known. Replacement blades are billed at
                  the parts cost plus a 15% sourcing and handling charge, with a
                  $10 minimum.
                </p>
              )}
            </fieldset>
          )}

          <div className="price-calculation" aria-live="polite">
            {isMaintenance ? (
              <>
                <span>{selectedMowerType ? "Labor price · parts additional" : "Select equipment to see maintenance pricing"}</span>
                <strong>{selectedMowerType ? `Starting at $${maintenanceLaborPrice}` : "Available July 31"}</strong>
              </>
            ) : (
              <>
                <span>{bladeCount ? `${bladeCount} × $${currentPricePerBlade} per blade` : jobType ? `$${currentPricePerBlade} per blade` : "Select a service to see pricing"}</span>
                <strong>Total: ${bladeCount * currentPricePerBlade}</strong>
              </>
            )}
          </div>
          {isMaintenance ? (
            <p className="custom-service-caption">Russell-supplied parts include a 15% sourcing and handling charge, with a $10 minimum. Customer-supplied compatible parts are not covered by a parts warranty.</p>
          ) : jobType === "blade-changing" ? (
            <div className="blade-changing-booking-summary">
              <strong>Blade changing only</strong>
              <span>Includes removal of the old blades and installation of replacement blades.</span>
              <ul>
                <li>Mower blades: $10 per blade</li>
                <li>Bush Hog blades: $25 per blade</li>
                <li>Russell-supplied blades: parts cost plus a 15% sourcing and handling charge ($10 minimum)</li>
              </ul>
            </div>
          ) : null}
          <p className="custom-service-caption">
            Need something other than the services listed?{" "}
            <a href="sms:+19852951163">Let me know.</a>
          </p>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>2</span>
            <div>
              <h2>Select a date and time</h2>
              <p>
                {bladeSupplier === "Russell supplied"
                  ? "Choose your preferred Friday or Saturday. Russell will confirm the final date after the replacement blades arrive."
                  : "Appointments are available Friday and Saturday. If a time was just reserved, you will be asked to select another slot."}
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
                    disabled={blockedDates.has(dateValue(date)) || (isMaintenance && dateValue(date) < maintenanceAvailableDate)}
                  >
                    {formatDate(date)}
                    {blockedDates.has(dateValue(date))
                      ? " (Unavailable)"
                      : isMaintenance && dateValue(date) < maintenanceAvailableDate
                        ? " (Basic Maintenance begins July 31)"
                        : ""}
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
