// Intentional violations for tests:
//  - layer-boundary: domain importing infrastructure
//  - domain-must-not-use-frameworks: domain importing the express package
import express from 'express';

import { Db } from '../infrastructure/Db';

export class Tainted {
  readonly app = express;
  readonly db = new Db();
}
