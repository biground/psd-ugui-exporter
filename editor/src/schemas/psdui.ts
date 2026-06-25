import type { Rect, SourceLayer } from './source';

export type ExportKind = 'group' | 'image' | 'text' | 'button' | 'list';

export interface ListSettings {
  direction: 'vertical' | 'horizontal';
  cellTemplateNodeId: string | null;
  spacing: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ExportNode {
  id: string;
  name: string;
  exportKind: ExportKind;
  enabled: boolean;
  sourceLayerIds: number[];
  rect: Rect;
  rasterBounds: Rect | null;
  list: ListSettings | null;
  children: ExportNode[];
  mergedFrom?: ExportNode[];
}

export interface PSDUIProject {
  version: 1;
  source: {
    path: string;
    fileName: string;
  };
  document: {
    width: number;
    height: number;
  };
  sourceTree: SourceLayer[];
  exportTree: ExportNode[];
  cache: {
    assetsDir: string;
  };
}
