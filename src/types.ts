
export enum SelectionState {
  UNMARKED = 'UNMARKED',
  PICKED = 'PICKED',
  REJECTED = 'REJECTED'
}

export enum GroupStatus {
  COMPLETE = 'COMPLETE',
  JPG_ONLY = 'JPG_ONLY',
  RAW_ONLY = 'RAW_ONLY'
}

export interface ExifData {
  shutterSpeed?: string;
  aperture?: string;
  iso?: string;
  focalLength?: string;
  dateTime?: string;
  model?: string;
  lens?: string;
}

export interface PhotoFile {
  name: string;
  extension: string;
  file: File;
  previewUrl: string;
  size: number;
  path?: string; // File path for Tauri backend
}

export interface PhotoGroup {
  id: string; // Base filename
  jpg?: PhotoFile;
  raw?: PhotoFile;
  status: GroupStatus;
  selection: SelectionState;
  rating: number; // 0 = unrated, 1-5 = star rating
  exif?: ExifData;
}

export type ExportMode = 'RAW' | 'JPG' | 'BOTH';
export type ExportOperation = 'COPY' | 'MOVE';
export type SelectionMode = 'pick_reject' | 'rating';

// Filter types for each selection mode
export type PickRejectFilter = 'ALL' | 'PICKED' | 'REJECTED' | 'UNMARKED' | 'ORPHANS';
export type RatingFilter = 'ALL' | 'RATING_5' | 'RATING_4_PLUS' | 'RATING_3_PLUS' | 'RATING_2_PLUS' | 'RATING_1_PLUS' | 'UNRATED' | 'ORPHANS';
export type AppFilter = PickRejectFilter | RatingFilter;
