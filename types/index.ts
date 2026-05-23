import type { RegionId, CategoryId } from '../constants/regions';

export type UserRole = 'consumer' | 'venue_owner';
export type VenueOwnerStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  role: UserRole;
  /** venue_owner 전용: 관리자 승인 상태 (consumer는 undefined) */
  status?: VenueOwnerStatus;
  preferred_regions: RegionId[];
  preferred_categories: CategoryId[];
  created_at: string;
}

export interface Venue {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  region: RegionId;
  categories: CategoryId[];
  address: string;
  address_detail: string | null;
  lat: number | null;
  lng: number | null;
  entrance_fee_weekday: number | null;
  entrance_fee_weekend: number | null;
  music_genres: string[];
  dress_code: string | null;
  age_restriction: number | null;
  open_days: string[];
  open_time: string | null;
  close_time: string | null;
  instagram_handle: string | null;
  instagram_connected: boolean;
  website_url: string | null;
  phone: string | null;
  capacity: number | null;
  description: string | null;
  description_en: string | null;
  cover_image_url: string | null;
  images: string[];
  is_active: boolean;
  is_verified: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueEvent {
  id: string;
  venue_id: string;
  venue?: Venue;
  title: string;
  title_en: string | null;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  lineup: string[];
  poster_image_url: string | null;
  entrance_fee: number | null;
  ticket_url: string | null;
  is_published: boolean;
  created_at: string;
}

export interface Reservation {
  id: string;
  venue_id: string;
  venue?: Venue;
  user_id: string;
  reservation_date: string;       // "YYYY-MM-DD" (달력 날짜)
  visit_time?: string | null;     // "HH:00" — 없으면 영업일 기준 reservation_date 그대로
  party_size: number;
  contact_name: string;
  contact_phone: string;
  special_requests: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  venue_id: string;
  venue?: Venue;
  created_at: string;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  VenueDetail: { venueId: string };
  EventDetail: { eventId: string };
  Reservation: { venueId: string };
  VenueSearch: { regionId?: RegionId; categoryId?: CategoryId };
  MyReservations: undefined;        // 소비자: 내 예약 내역
  VenueReservations: undefined;     // 사업주: 전체 예약 관리
};

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Signup: { role: UserRole };
};

export type ConsumerTabParamList = {
  Home: undefined;
  Events: undefined;
  Favorites: undefined;
  Profile: undefined;
};

export type VenueTabParamList = {
  Dashboard: undefined;
  MyVenue: undefined;
  EventManage: undefined;
  VenueProfile: undefined;
};
