export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  createdAt?: string;
};

export type Contact = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  relationship?: string | null;
  alertsEnabled?: boolean;
};

export type Journey = {
  id: string;
  status: "draft" | "active" | "completed" | "cancelled" | string;
  sosActive: boolean;
  shareToken: string;
  startAddress: string;
  startLat: number;
  startLng: number;
  destAddress: string;
  destLat: number;
  destLng: number;
  vehicleNumber: string;
  driverName: string;
  rideProvider?: string | null;
  rideId?: string | null;
  estimatedDurationMin: number;
  etaMinutes?: number | null;
  etaSource?: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
  offRoute: boolean;
  hadRouteDeviation?: boolean;
  plannedRoute: number[][];
  routeDistanceMeters?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  user?: { id: string; name: string; phone?: string | null };
  userName?: string;
  contacts: Contact[];
  sosEvents?: SosEvent[];
};

export type SosEvent = {
  id: string;
  lat: number;
  lng: number;
  triggeredAt: string;
  cancelledAt?: string | null;
  status: string;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  payload: { shareToken?: string; journeyId?: string } | null;
  readAt: string | null;
  createdAt: string;
};

export type Stats = {
  total: number;
  completed: number;
  sosCount: number;
  kmTravelled: number;
  deviationCount: number;
  active: Journey | null;
};
