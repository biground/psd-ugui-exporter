import { describe, expect, test } from 'vitest';

import { deriveDefaultProjectSettings } from '../src/app/project-settings';

describe('project settings defaults', () => {
  test('derives project and layout paths next to a POSIX PSD source', () => {
    const settings = deriveDefaultProjectSettings('/work/ui/main-menu.psd');

    expect(settings.projectPath).toBe('/work/ui/main-menu.psdui');
    expect(settings.layoutPath).toBe('/work/ui/ui.layout.json');
  });

  test('derives project and layout paths next to a Windows PSB source', () => {
    const settings = deriveDefaultProjectSettings('C:\\work\\ui\\shop.psb');

    expect(settings.projectPath).toBe('C:\\work\\ui\\shop.psdui');
    expect(settings.layoutPath).toBe('C:\\work\\ui\\ui.layout.json');
  });
});
