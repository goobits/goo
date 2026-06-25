/// <reference path="../types/goobitsLogger.d.ts" />

/**
 * Goo Package Logger
 *
 * @internal
 * Centralized logging for the @goobits/goo UI component library.
 *
 * To enable debug logging:
 *   import { setModuleLevel } from '@goobits/logger'
 *   setModuleLevel('goo', 'DEBUG')
 */

import { createLogger } from '@goobits/logger'

/** Main logger for goo components */
export const log = createLogger('goo')

/** Schema/form logger */
export const schemaLog = createLogger('goo:schema')
