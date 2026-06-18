import type { ExportKind, ExportNode, ListSettings } from '../schemas/psdui';
import type { SourceLayer } from '../schemas/source';
import { unionRects } from './rect';

interface CreateExportNodeFromSourcesOptions {
  id: string;
  name: string;
  exportKind: ExportKind;
  sourceLayers: SourceLayer[];
}

function createDefaultListSettings(): ListSettings {
  return {
    direction: 'vertical',
    cellTemplateNodeId: null,
    spacing: 0,
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  };
}

export function createExportNodeFromSources({
  id,
  name,
  exportKind,
  sourceLayers
}: CreateExportNodeFromSourcesOptions): ExportNode {
  const imageLayers = sourceLayers.filter((layer) => layer.image !== null);

  return {
    id,
    name,
    exportKind,
    enabled: true,
    sourceLayerIds: sourceLayers.map((layer) => layer.id),
    rect: unionRects(sourceLayers.map((layer) => layer.sourceBounds)),
    rasterBounds:
      imageLayers.length > 0 ? unionRects(imageLayers.map((layer) => layer.rasterBounds)) : null,
    list: exportKind === 'list' ? createDefaultListSettings() : null,
    children: []
  };
}
