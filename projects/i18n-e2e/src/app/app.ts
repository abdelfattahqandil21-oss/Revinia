import { Component, afterNextRender } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * The shell: one `<router-outlet>` and the hydration marker. The pages under
 * `home/` and `toggle/` own the content, so the i18n proof and the `/ui` proof
 * are separate documents instead of one long page.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor() {
    // Test observability only: `afterNextRender` never runs on the server, so
    // this attribute means "the browser has rendered and is interactive".
    // The SSR smoke test waits for it instead of sleeping, which is the
    // difference between proving hydration and proving a timer.
    afterNextRender(() => {
      document.documentElement.dataset['hydrated'] = 'true';
    });
  }
}
