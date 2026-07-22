import { NextResponse } from "next/server";
import { Resend } from "resend";

const FIREBASE_PROJECT_ID = "russell-s-mobile-blade";

type SeasonalReminderRequest = {
  id?: string;
  name?: string;
  email?: string;
  lastServiceDate?: string;
  serviceName?: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

  return response.ok;
}

export async function POST(request: Request) {
  try {
    const customer = (await request.json()) as SeasonalReminderRequest;

    if (!customer.id || !(await ownerCanReadBooking(request, customer.id))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!customer.name || !customer.email) {
      return NextResponse.json(
        { error: "Customer name and email are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 500 }
      );
    }

    const safeName = escapeHtml(customer.name);
    const safeDate = escapeHtml(customer.lastServiceDate || "your last visit");
    const safeService = escapeHtml(customer.serviceName || "blade sharpening");
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: "Russell's Mobile Blade Sharpening <bookings@russellsmobileblade.com>",
      to: [customer.email],
      replyTo: "russellsmobileblade@gmail.com",
      subject: "Ready for another clean cut?",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#101713;line-height:1.6">
          <div style="background:#0b4d22;color:#fff;padding:24px;border-radius:14px 14px 0 0">
            <p style="margin:0 0 6px;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:700">Veteran Owned</p>
            <h1 style="margin:0;font-size:28px">Keep your mower cutting clean</h1>
          </div>
          <div style="border:1px solid #d9ded8;border-top:0;padding:26px;border-radius:0 0 14px 14px">
            <p>Hi ${safeName},</p>
            <p>It may be time to have your mower blades sharpened again. Sharp blades give grass a cleaner cut and help your lawn look its best.</p>
            <p>Your last recorded service was <strong>${safeService}</strong> on <strong>${safeDate}</strong>.</p>
            <p><a href="https://www.russellsmobileblade.com/book" style="display:inline-block;background:#167331;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:10px">Book your next sharpening</a></p>
            <p>You can also call or text <a href="tel:+19852951163" style="color:#167331;font-weight:700">985-295-1163</a>.</p>
            <p style="margin-bottom:0">Thank you,<br><strong>Russell</strong><br>Russell's Mobile Blade Sharpening</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Seasonal reminder email failed:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Unable to send seasonal reminder:", error);
    return NextResponse.json(
      { error: "Unable to send seasonal reminder." },
      { status: 500 }
    );
  }
}
