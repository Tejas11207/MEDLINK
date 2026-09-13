export interface HospitalResponse {
  id: number;
  hospital_id: number;
  hospital_name: string;
  response: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  eta: number;
  rejection_reason?: string;
}

export interface EmergencyCase {
  id: number;
  case_code: string;
  patient_name: string;
  patient_age?: number;
  abha_id?: string;
  transport_mode: 'SELF_TRANSPORT' | 'AMBULANCE';
  condition: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  requirements: string;
  vitals?: string;
  latitude: number;
  longitude: number;
  address?: string;
  ambulance_details?: string;
  status: string;
  responses?: HospitalResponse[];
  selected_hospital?: Hospital;
  selected_hospital_eta?: number;
  created_at: string;
}

export interface Hospital {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capabilities: string;
  verified: boolean;
  available_icu: number;
  trauma_level?: string;
}

export interface RecommendedOption {
  hospital_id: number;
  hospital_name: string;
  hospital_address: string;
  distance_km: number;
  eta: number;
  available_icu: number;
  response: string;
  is_recommended: boolean;
  explanation: string[];
  rejection_reason?: string;
  hospital_capabilities?: string;
  match_score?: number;
}

export interface DecisionEngineResult {
  recommended_hospital: RecommendedOption | null;
  all_options: RecommendedOption[];
  accepted_count: number;
  rejected_count: number;
  pending_count: number;
}

export interface AdminMetrics {
  active_emergencies: number;
  verified_hospitals: number;
  total_hospitals: number;
  cases_today: number;
  avg_response_time_minutes: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'HOSPITAL' | 'ADMIN';
  hospital_id?: number;
  created_at: string;
}
