export type ModusType = 'gamified' | 'executive' | 'hr' | 'meta'

export class UniversalTransformer {
  constructor() {}

  transformEntity(entity: unknown, targetModus: ModusType) {
    // Simple pass-through transformer
    // Just return the entity with modus context
    if (typeof entity !== 'object' || entity === null) {
      return entity
    }

    return {
      ...(entity as Record<string, unknown>),
      modus: targetModus,
    }
  }
}
