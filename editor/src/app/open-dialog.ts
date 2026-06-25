export interface OpenDialogFilter {
  name: string;
  extensions: string[];
}

export interface OpenPsdDialogOptions {
  title: string;
  multiple: false;
  defaultPath: string;
  filters: OpenDialogFilter[];
}

export function createOpenPsdDialogOptions(documentsPath: string): OpenPsdDialogOptions {
  return {
    title: 'Open PSD/PSB',
    multiple: false,
    defaultPath: documentsPath,
    filters: [
      {
        name: 'Photoshop documents',
        extensions: ['psd', 'psb']
      }
    ]
  };
}

export function createOpenProjectDialogOptions(documentsPath: string): OpenPsdDialogOptions {
  return {
    title: 'Open PSDUI Project',
    multiple: false,
    defaultPath: documentsPath,
    filters: [
      {
        name: 'PSDUI projects',
        extensions: ['psdui']
      }
    ]
  };
}
