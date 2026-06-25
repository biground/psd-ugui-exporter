export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SourceTextAlignment {
  value: number | null;
  name: string;
}

export interface SourceTextBox {
  kind: 'point' | 'paragraph' | 'unknown';
  bounds: Rect;
  width: number;
  height: number;
  wrap: boolean;
  transform?: number[] | null;
  source?: string | null;
}

export interface SourceTextParagraph {
  horizontalAlign: SourceTextAlignment | null;
  verticalAlign?: SourceTextAlignment | null;
  firstLineIndent?: number | null;
  startIndent?: number | null;
  endIndent?: number | null;
  spaceBefore?: number | null;
  spaceAfter?: number | null;
  autoHyphenate?: boolean | null;
  wordSpacing?: number[] | null;
  letterSpacing?: number[] | null;
  glyphSpacing?: number[] | null;
  autoLeading?: number | null;
  leadingType?: number | null;
  everyLineComposer?: boolean | null;
}

export interface SourceTextStroke {
  source?: string | null;
  enabled?: boolean | null;
  size?: number | null;
  position?: string | null;
  opacity?: number | null;
  blendMode?: string | null;
  color?: unknown;
}

export interface SourceText {
  value: string;
  fontName?: string | null;
  fontSize?: number | null;
  color?: unknown;
  tracking?: number | null;
  lineHeight?: number | null;
  alignment?: SourceTextAlignment | null;
  paragraph?: SourceTextParagraph | null;
  box?: SourceTextBox | null;
  runs?: unknown[];
  stroke?: SourceTextStroke | null;
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
