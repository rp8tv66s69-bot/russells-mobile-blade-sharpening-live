export type BookingStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";
export type PaymentStatus = "Unpaid" | "Paid";

export type Booking = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  serviceId: string;
  serviceName: string;
  serviceDetail: string;
  jobType?: string;
  bladeCount?: number;
  price: number;
  date: string;
  time: string;
  notes: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "" | "Cash" | "Cash App" | "Venmo";
  createdAt: string;
  seasonalReminderSentAt?: string;
};

export type BlockedSlot = {
  id: string;
  date: string;
  time: string;
  reason: string;
  createdAt: string;
  group?: "all-day";
};

export type GalleryPhoto = {
  id: string;
  beforeImage: string;
  afterImage: string;
  caption: string;
  createdAt: string;
};
