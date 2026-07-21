import { NextResponse } from "next/server";
import { Resend } from "resend";

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
    const booking = await req.json();

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

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unable to send booking email." },
      { status: 500 }
    );
  }
}