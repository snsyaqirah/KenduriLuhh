export type Mode = 'katering' | 'rewang';
export type Language = 'ms' | 'en';

export interface AuditEntry {
  action: string;
  key_outputs?: Record<string, string | number | string[] | boolean | null>;
  status: 'SUCCESS' | 'APPROVED' | 'REJECTED' | 'ERROR';
}

export interface AgentMessage {
  agent: string;
  content: string;
  timestamp: string;
  audit?: AuditEntry;
}

export interface SSEEvent {
  type: 'agent_message' | 'done' | 'error';
  agent?: string;
  content?: string;
  timestamp?: string;
  total_messages?: number;
  token_count?: number;
  message?: string;
  audit?: AuditEntry;
}

export interface ChatStartResponse {
  session_id: string;
  mode: Mode;
  message: string;
}

export interface HistorySession {
  id: string;
  savedAt: string;
  mode: Mode;
  language: Language;
  request: {
    pax: number;
    budget_myr: number;
    event_type: string;
    event_location: string;
    event_date: string;
  };
  result: {
    quotation: number | null;
    totalCost: number | null;
    isApproved: boolean;
    menuItems: string[];
    wasteReductionPct: number | null;
  };
  messages: AgentMessage[];
}

// Must exactly match backend CateringRequest model
export interface CateringRequest {
  mode: Mode;
  language: Language;
  event_type: string;
  pax: number;
  budget_myr: number;
  event_date: string;           // YYYY-MM-DD
  event_location: string;
  menu_preferences?: string[];
  dietary_notes?: string;
  special_requests?: string;
  profit_margin_percent?: number;
  coordinator_name?: string;
}
