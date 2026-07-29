import { SetMetadata } from '@nestjs/common';

export const SKIP_API_ENVELOPE_KEY = 'skip_api_envelope';

export const SkipApiEnvelope = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(SKIP_API_ENVELOPE_KEY, true);
