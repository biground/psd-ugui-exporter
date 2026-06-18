export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SourceText {
  value: string;
  fontFamily: string;
  fontSize: number;
  color: string;
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
  blendMode: string;
  sourceBounds: Rect;
  rasterBounds: Rect;
  image: SourceImage | null;
  text: SourceText | null;
  children: SourceLayer[];
}
