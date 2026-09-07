// * passes everything inside crypto library as crypto object

import * as crypto from 'crypto';

export function tokenRandomizer(): string {
  return crypto.randomBytes(10).toString('hex');
}