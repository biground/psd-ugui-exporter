import type { ExportKind, ListSettings } from './psdui';
import type { Rect } from './source';

export interface UILayoutNode {
  id: string;
  name: string;
  exportKind: ExportKind;
  rect: Rect;
  rasterBounds: Rect | null;
  sourceLayerIds: number[];
  list: ListSettings | null;
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
