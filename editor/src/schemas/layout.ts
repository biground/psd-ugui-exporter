import type { ExportKind, ListSettings, Scale9Settings } from './psdui';
import type { Rect, SourceText } from './source';

export interface UILayoutNode {
  id: string;
  name: string;
  exportKind: ExportKind;
  rect: Rect;
  rasterBounds: Rect | null;
  sourceLayerIds: number[];
  text: SourceText | null;
  list: ListSettings | null;
  scale9: Scale9Settings | null;
  children: UILayoutNode[];
}

export interface UILayoutDocument {
  version: 1;
  document: {
    width: number;
    height: number;
  };
  nodes: UILayoutNode[];
}
