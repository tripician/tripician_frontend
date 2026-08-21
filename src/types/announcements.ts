/** Mirrors `TripAnnouncementDto`. Body is plain text, never markup. */
export interface TripAnnouncement {
  id: string;
  tripId: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  authorUserId: number;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
}
