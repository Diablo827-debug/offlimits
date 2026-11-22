import React from 'react';

// Czy w grze jest model 3D prowadzącej (public/prowadzacy/3d/postac.glb). ?avatar=test – robot testowy.
export const MODEL_URL = '/prowadzacy/3d/postac.glb';
const TEST_URL = '/prowadzacy/3d/test-robot.glb';
let modelUrl = null;
export function checkModel() {
  if (modelUrl !== null) return Promise.resolve(modelUrl);
  const test = /[?&]avatar=test/.test(location.search);
  const url = test ? TEST_URL : MODEL_URL;
  return fetch(url, { method: 'HEAD' })
    .then((r) => { modelUrl = r.ok && !/text\/html/.test(r.headers.get('content-type') || '') ? url : ''; return modelUrl; })
    .catch(() => { modelUrl = ''; return ''; });
}
export function useAvatarModel() {
  const [url, setUrl] = React.useState(modelUrl);
  React.useEffect(() => { checkModel().then(setUrl); }, []);
  return url || '';
}
