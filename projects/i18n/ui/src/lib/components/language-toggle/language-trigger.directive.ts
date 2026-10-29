import { Directive } from '@angular/core';
import type { LanguageLike } from '../../models/language-view';

export interface RiviniaLanguageTriggerContext {
  $implicit: LanguageLike;
  busy: boolean;
}

/**
 * Marks the `<ng-template>` rendered inside the button in place of the default
 * name span. The toggle captures it with `contentChild(..., { read: TemplateRef })`
 * and renders it through `ViewContainerRef`, so the template is created only when
 * the button is — and never on the server beyond the same pass.
 */
@Directive({ selector: '[rvLanguageTrigger]' })
export class RiviniaLanguageTrigger {}
