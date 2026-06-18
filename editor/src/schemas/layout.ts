import type { ExportKind } from './psdui';
import type { Rect } from './source';

export interface UILayoutNode {
  id: string;
  name: string;
  exportKind: ExportKind;
  rect: Rect;
  children: UILayoutNode[];
}

export interface UILayoutDocument {
  id: string;
  name: string;
  root: UILayoutNode;
}
