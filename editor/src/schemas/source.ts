export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SourceText {
  value: string;
  fontName?: string | null;
  fontSize?: number | null;
  color?: unknown;
  tracking?: number | null;
  alignment?: unknown;
  runs?: unknown[];
  stroke?: unknown;
}

export interface SourceImage {
  path: string;
  width: number;
  height: number;
}

export interface SourceLayer {
  id: number;
  name: string;
  kind: string;
  visible: boolean;
  opacity: number;
  blendMode: string | null;
  sourceBounds: Rect;
  rasterBounds: Rect;
  image: SourceImage | null;
  text: SourceText | null;
  children: SourceLayer[];
}
