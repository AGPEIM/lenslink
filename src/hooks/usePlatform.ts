import { useState, useEffect } from 'react';
import { platform } from '@tauri-apps/plugin-os';

export function usePlatform() {
  const [currentPlatform, setCurrentPlatform] = useState<string>('');
  const [isMacOS, setIsMacOS] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  const [isLinux, setIsLinux] = useState(false);

  useEffect(() => {
    const p = platform();
    setCurrentPlatform(p);
    setIsMacOS(p === 'macos');
    setIsWindows(p === 'windows');
    setIsLinux(p === 'linux');
  }, []);

  return { platform: currentPlatform, isMacOS, isWindows, isLinux };
}
