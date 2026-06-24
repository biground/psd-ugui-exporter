const fallbackFontFamily = 'Inter, ui-sans-serif, system-ui, sans-serif';

export function createPreviewFontFamily(fontName: string | null | undefined): string {
  const rawName = fontName?.trim();

  if (rawName === undefined || rawName.length === 0) {
    return fallbackFontFamily;
  }

  const candidates = [rawName, ...createNormalizedFontCandidates(rawName)];
  const uniqueCandidates = [...new Set(candidates)].map((candidate) => JSON.stringify(candidate));

  return `${uniqueCandidates.join(', ')}, ${fallbackFontFamily}`;
}

function createNormalizedFontCandidates(fontName: string): string[] {
  const compactName = fontName.replace(/\s+/g, '');
  const knownFamily = resolveKnownFontFamily(compactName);

  if (knownFamily !== null) {
    return [knownFamily];
  }

  const withoutStyleSuffix = fontName.replace(
    /[-_ ](?:Regular|Medium|Semibold|SemiBold|Bold|Light|Thin|Heavy|Black|Italic|Oblique|Book|Roman|Demi|Demibold)$/i,
    ''
  );

  return withoutStyleSuffix === fontName ? [] : [withoutStyleSuffix];
}

function resolveKnownFontFamily(compactName: string): string | null {
  if (/^Arial(?:MT)?$/i.test(compactName) || /^Arial-(?:Bold|Italic|BoldItalic)MT$/i.test(compactName)) {
    return 'Arial';
  }

  if (/^PingFangSC(?:[-_].+)?$/i.test(compactName)) {
    return 'PingFang SC';
  }

  if (/^MicrosoftYaHei(?:UI)?(?:[-_].+)?$/i.test(compactName)) {
    return 'Microsoft YaHei';
  }

  if (/^NotoSansCJKSC(?:[-_].+)?$/i.test(compactName)) {
    return 'Noto Sans CJK SC';
  }

  if (/^SourceHanSansCN[-_]Heavy$/i.test(compactName)) {
    return 'Source Han Sans CN Heavy';
  }

  if (/^SourceHanSansCN(?:[-_].+)?$/i.test(compactName)) {
    return 'Source Han Sans CN';
  }

  if (/^SourceHanSerifCN(?:[-_].+)?$/i.test(compactName)) {
    return 'Source Han Serif CN';
  }

  if (/^SimHei(?:[-_].+)?$/i.test(compactName)) {
    return 'SimHei';
  }

  if (/^SimSun(?:[-_].+)?$/i.test(compactName)) {
    return 'SimSun';
  }

  if (/^STHeiti(?:[-_].+)?$/i.test(compactName)) {
    return 'STHeiti';
  }

  return null;
}
