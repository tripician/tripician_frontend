export type OperatorStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface OperatorProfile {
  companyName: string;
  website: string | null;
  contactEmail: string | null;
  status: OperatorStatus;
  reviewNote: string | null;
  appliedAt: string;
  approvedAt: string | null;
}

export interface OperatorApplication {
  companyName: string;
  website?: string;
  contactEmail?: string;
  registrationNumber?: string;
}

export type LeadStatus = 'new' | 'contacted' | 'closed';

export interface OperatorLead {
  id: string;
  tripId: string;
  tripName: string;
  travellerName: string;
  travellerEmail: string;
  destination: string | null;
  travelStartDate: string | null;
  partySize: number;
  message: string | null;
  status: LeadStatus;
  createdAt: string;
}

/** Where the traveller goes next. Tripician does not take the payment. */
export interface OperatorLeadResult {
  companyName: string;
  website: string | null;
  contactEmail: string | null;
}
