export type AtlasVisibility = 'public' | 'anonymized' | 'hidden';

export interface AtlasPinDot {
  lat: number;
  lng: number;
  city: string;
  count?: number;
}

export interface AtlasPinRecord {
  id: string;
  user_id: string;
  display_name: string;
  city: string;
  region: string;
  country: string;
  lat_approx: number;
  lng_approx: number;
  visit_count: number;
  favorite_bike: string;
  visibility: AtlasVisibility;
  first_seen_at: string;
  last_seen_at: string;
}

export interface AtlasSanitizedPin {
  id: string;
  displayName: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  visitCount: number;
  favoriteBike: string;
  lastSeenAt: string;
  isAnonymized: boolean;
}

export type AtlasClusterFeatureProperties = {
  isCluster: true;
  clusterId: string;
  pointCount: number;
  topCities: string[];
  sampleBikes: string[];
  latestSeenAt: string;
};

export type AtlasPinFeatureProperties = AtlasSanitizedPin & {
  isCluster: false;
};

export interface AtlasGeoFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: AtlasClusterFeatureProperties | AtlasPinFeatureProperties;
}

export interface AtlasPinsApiResponse {
  type: 'FeatureCollection';
  features: AtlasGeoFeature[];
  totalVisiblePins: number;
  uniqueRegions: number;
  recentRiders: AtlasSanitizedPin[];
  boardDots: AtlasPinDot[];
  myPin: AtlasPinRecord | null;
}
