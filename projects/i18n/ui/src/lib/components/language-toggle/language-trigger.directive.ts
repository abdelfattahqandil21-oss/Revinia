import { Directive } from '@angular/core';
import type { LanguageLike } from '../../models/language-view';

export interface RiviniaLanguageTriggerContext {
  $implicit: LanguageLike;
  busy: boolean;
}

/** Scaffold only: marks the consumer's `<ng-template>`. Rendering lands with the component. */
@Directive({ selector: '[rvLanguageTrigger]' })
export class RiviniaLanguageTrigger {}
