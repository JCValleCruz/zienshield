// Utility functions for formatting data

export const formatOSInfo = (os: string | { name?: string; platform?: string; version?: string; build?: string; major?: string; minor?: string; uname?: string; } | null | undefined): string => {
  if (!os) return 'Sistema desconocido';
  
  if (typeof os === 'string') {
    return os || 'Sistema desconocido';
  }
  
  // If os is an object, format it properly
  if (typeof os === 'object') {
    const name = os.name || os.platform || 'Sistema desconocido';
    const version = os.version || '';
    return `${name} ${version}`.trim();
  }
  
  return 'Sistema desconocido';
};