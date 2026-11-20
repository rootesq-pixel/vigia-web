/* Vigía · configuración de descargas.
   Cuando exista la release, cambia available a true y revisa las URLs y tamaños.
   Todo lo demás de la web se actualiza solo a partir de este archivo. */
window.VIGIA = {
  version: '1.0.0',
  tag: 'v1.0.0',
  available: false,            // false = botones «Próximamente» deshabilitados
  repo: 'https://github.com/rootesq-pixel/vigia-security',
  downloads: {
    setup: {
      label: 'Instalador',
      version: '1.0.0',
      file: 'Vigia_Setup_1.0.0_x64.exe',
      size: '',
      url: 'https://github.com/rootesq-pixel/vigia-security/releases/download/v1.0.0/Vigia_Setup_1.0.0_x64.exe'
    },
    portable: {
      label: 'Portable',
      version: '1.0.0',
      file: 'Vigia_1.0.0_portable.zip',
      size: '',
      url: 'https://github.com/rootesq-pixel/vigia-security/releases/download/v1.0.0/Vigia_1.0.0_portable.zip'
    }
  }
};
