import { createRoot } from 'react-dom/client';
import React from 'react';
import { VideoPlayer } from './VideoPlayer';

/**
 * Mounts the premium video player into a target element
 * This allows the HTML-based homepage/enrollment page to use the React player
 */
(window as any).mountPremiumPlayer = (containerId: string, props: any) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const root = createRoot(container);
  root.render(React.createElement(VideoPlayer, props));
  
  return root;
};
