import { NextResponse } from "next/server";
import { Resend } from "resend";

const FIREBASE_PROJECT_ID = "russell-s-mobile-blade";

type ConfirmationRequest = {
  id?: string;
  name?: string;
  email?: string;
  serviceName?: string;
  serviceDetail?: string;
  price?: number;
  date?: string;
  time?: string;
  address?: string;
  city?: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function appointmentUtc(date: string, time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;

  const approximate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const zoneName = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    timeZoneName: "longOffset",
  }).formatToParts(approximate).find((part) => part.type === "timeZoneName")?.value;
  const offsetMatch = zoneName?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!offsetMatch) return null;
  const offsetMinutes = (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3])) * (offsetMatch[1] === "+" ? 1 : -1);
  return new Date(approximate.getTime() - offsetMinutes * 60_000);
}

async function ownerCanReadBooking(request: Request, bookingId: string) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!token || !bookingId) return false;

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/bookings/${encodeURIComponent(bookingId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  // Firestore applies the project's published security rules to this request.
  // A successful read proves the caller has authenticated owner access.
  return response.ok;
}

export async function POST(request: Request) {
  try {
    const booking = (await request.json()) as ConfirmationRequest;

    if (!booking.id || !(await ownerCanReadBooking(request, booking.id))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 500 }
      );
    }

    if (
      !booking.name ||
      !booking.email ||
      !booking.serviceName ||
      !booking.date ||
      !booking.time
    ) {
      return NextResponse.json(
        { error: "Required appointment information is missing." },
        { status: 400 }
      );
    }

    const safe = {
      name: escapeHtml(booking.name),
      serviceName: escapeHtml(booking.serviceName),
      serviceDetail: escapeHtml(booking.serviceDetail),
      price: escapeHtml(booking.price),
      date: escapeHtml(booking.date),
      time: escapeHtml(booking.time),
      address: escapeHtml(booking.address),
      city: escapeHtml(booking.city),
    };

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "Russell's Mobile Blade Sharpening <bookings@russellsmobileblade.com>",
      to: [booking.email],
      replyTo: "russellsmobileblade@gmail.com",
      subject: "Your blade sharpening appointment is confirmed",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#101713;line-height:1.6">
          <div style="background:#0b4d22;color:#fff;padding:24px;border-radius:14px 14px 0 0">
            <p style="margin:0 0 6px;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:700">Veteran Owned</p>
            <h1 style="margin:0;font-size:28px">Appointment confirmed</h1>
          </div>
          <div style="border:1px solid #d9ded8;border-top:0;padding:26px;border-radius:0 0 14px 14px">
            <p>Hi ${safe.name},</p>
            <p>Your appointment with <strong>Russell's Mobile Blade Sharpening</strong> is confirmed.</p>
            <table style="width:100%;border-collapse:collapse;margin:22px 0">
              <tr><td style="padding:9px 0;color:#667069">Service</td><td style="padding:9px 0;text-align:right;font-weight:700">${safe.serviceName}${safe.serviceDetail ? ` (${safe.serviceDetail})` : ""}</td></tr>
              <tr><td style="padding:9px 0;color:#667069">Price</td><td style="padding:9px 0;text-align:right;font-weight:700">$${safe.price}</td></tr>
              <tr><td style="padding:9px 0;color:#667069">Date</td><td style="padding:9px 0;text-align:right;font-weight:700">${safe.date}</td></tr>
              <tr><td style="padding:9px 0;color:#667069">Time</td><td style="padding:9px 0;text-align:right;font-weight:700">${safe.time}</td></tr>
              <tr><td style="padding:9px 0;color:#667069">Location</td><td style="padding:9px 0;text-align:right;font-weight:700">${safe.address}, ${safe.city}</td></tr>
            </table>
            <p>Please have your mower or blades accessible at the scheduled time.</p>
            <p>Need to make a change? Call or text <a href="tel:+19852951163" style="color:#167331;font-weight:700">985-295-1163</a>.</p>
            <p style="margin-bottom:0">Thank you,<br><strong>Russell</strong></p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Customer confirmation email failed:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    let reminderScheduled = false;
    let reminderReason = "Appointment is too soon or too far away to schedule automatically.";
    const appointment = appointmentUtc(booking.date, booking.time);
    const reminderAt = appointment
      ? new Date(appointment.getTime() - 24 * 60 * 60 * 1000)
      : null;
    const earliest = Date.now() + 5 * 60 * 1000;
    const latest = Date.now() + 29 * 24 * 60 * 60 * 1000;

    if (reminderAt && reminderAt.getTime() > earliest && reminderAt.getTime() < latest) {
      const reminder = await resend.emails.send(
        {
          from: "Russell's Mobile Blade Sharpening <bookings@russellsmobileblade.com>",
          to: [booking.email],
          replyTo: "russellsmobileblade@gmail.com",
          subject: "Reminder: your blade sharpening appointment is tomorrow",
          scheduledAt: reminderAt.toISOString(),
          html: `
            <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#101713;line-height:1.6">
              <div style="background:#0b4d22;color:#fff;padding:24px;border-radius:14px 14px 0 0">
                <p style="margin:0 0 6px;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:700">Veteran Owned</p>
                <h1 style="margin:0;font-size:28px">Appointment reminder</h1>
              </div>
              <div style="border:1px solid #d9ded8;border-top:0;padding:26px;border-radius:0 0 14px 14px">
                <p>Hi ${safe.name},</p>
                <p>This is a reminder that your blade sharpening appointment is tomorrow.</p>
                <p><strong>${safe.serviceName}</strong><br>${safe.date} at ${safe.time}<br>${safe.address}, ${safe.city}</p>
                <p>Please have your mower or blades accessible at the scheduled time.</p>
                <p>Need to make a change? Call or text <a href="tel:+19852951163" style="color:#167331;font-weight:700">985-295-1163</a>.</p>
                <p style="margin-bottom:0">Thank you,<br><strong>Russell</strong></p>
              </div>
            </div>
          `,
        },
        { idempotencyKey: `booking-reminder-${booking.id}-${booking.date}-${booking.time}`.replace(/[^a-zA-Z0-9_-]/g, "-") }
      );

      if (reminder.error) {
        console.error("Appointment reminder could not be scheduled:", reminder.error);
        reminderReason = "The confirmation was sent, but the reminder could not be scheduled.";
      } else {
        reminderScheduled = true;
        reminderReason = `Reminder scheduled for ${reminderAt.toISOString()}.`;
      }
    }

    return NextResponse.json({ success: true, data, reminderScheduled, reminderReason });
  } catch (error) {
    console.error("Unable to send customer confirmation:", error);
    return NextResponse.json(
      { error: "Unable to send customer confirmation." },
      { status: 500 }
    );
  }
}
