import { NextResponse } from "next/server";
import { Resend } from "resend";

type BookingNotification = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  service?: string;
  date?: string;
  time?: string;
  notes?: string;
};

async function sendOwnerText(booking: BookingNotification) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const ownerNumber = process.env.OWNER_PHONE_NUMBER || "+19852951163";

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio SMS is not configured. The booking email was still sent.");
    return { sent: false, reason: "not-configured" };
  }

  const body = [
    "New blade sharpening booking",
    `${booking.name || "Customer"}: ${booking.service || "Service"}`,
    `${booking.date || "Date pending"} at ${booking.time || "Time pending"}`,
    `${booking.city || ""} — ${booking.phone || "No phone"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const form = new URLSearchParams({
    To: ownerNumber,
    From: fromNumber,
    Body: body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio rejected the booking text: ${error}`);
  }

  return { sent: true };
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("RESEND_API_KEY is missing.");

      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const booking = (await req.json()) as BookingNotification;

    const { data, error } = await resend.emails.send({
      from: "Russell's Mobile Blade Sharpening <bookings@russellsmobileblade.com>",
      to: ["Rtaylorusa@bellsouth.net"],
      subject: `New Blade Sharpening Booking - ${booking.name}`,
      html: `
        <h2>New Booking Received</h2>
        <p><strong>Name:</strong> ${booking.name}</p>
        <p><strong>Phone:</strong> ${booking.phone}</p>
        <p><strong>Email:</strong> ${booking.email || "Not provided"}</p>
        <p><strong>Address:</strong> ${booking.address}</p>
        <p><strong>City:</strong> ${booking.city}</p>
        <p><strong>Service:</strong> ${booking.service}</p>
        <p><strong>Date:</strong> ${booking.date}</p>
        <p><strong>Time:</strong> ${booking.time}</p>
        <p><strong>Notes:</strong> ${booking.notes || "None"}</p>
      `,
    });

    if (error) {
      console.error(error);
      return NextResponse.json({ error }, { status: 500 });
    }

    let smsResult: { sent: boolean; reason?: string };

    try {
      smsResult = await sendOwnerText(booking);
    } catch (smsError) {
      // A text failure should never undo a valid booking or its email alert.
      console.error(smsError);
      smsResult = { sent: false, reason: "send-failed" };
    }

    return NextResponse.json({ success: true, data, sms: smsResult });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unable to send booking email." },
      { status: 500 }
    );
  }
}
