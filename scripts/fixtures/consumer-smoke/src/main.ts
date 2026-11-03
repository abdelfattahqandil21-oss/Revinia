import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import './consumer-imports';

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<main>Rivinia packed consumer production build</main>',
})
class AppComponent {}

bootstrapApplication(AppComponent).catch((error: unknown) => console.error(error));
