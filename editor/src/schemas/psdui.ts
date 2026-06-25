import type { Rect, SourceLayer } from './source';

export const exportKinds = ['image', 'text', 'button', 'list', 'VGLayout', 'HGLayout', 'Item'] as const;

export type ExportKind = typeof exportKinds[number];

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

export interface Scale9Settings {
  enabled: boolean;
  mode: 'sliced';
  unit: 'pixel';
  relativeTo: 'asset';
  border: {
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
  scale9?: Scale9Settings | null;
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
