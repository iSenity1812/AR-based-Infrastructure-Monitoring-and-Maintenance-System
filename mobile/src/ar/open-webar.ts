import { Linking } from 'react-native';

import { apiConfig } from '../api/config';
import { buildWebArUrl } from './qr';

export async function openWebAr(nodeId?: string, nodeData?: string) {
  const baseUrl = apiConfig.webarUrl.trim();
  const url = nodeId ? buildWebArUrl(baseUrl, nodeId, nodeData) : baseUrl;

  if (!url) {
    throw new Error('WebAR URL is not configured for this build.');
  }

  await Linking.openURL(url);
}
