import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  template: `
    <nav>
      <a routerLink="/basic" routerLinkActive="on">Basic</a>
      <a routerLink="/dynamic" routerLinkActive="on">Dynamic</a>
      <a routerLink="/two" routerLinkActive="on">Two</a>
      <a routerLink="/rtl" routerLinkActive="on">RTL</a>
      <a routerLink="/edge" routerLinkActive="on">Edge</a>
      <a routerLink="/styled" routerLinkActive="on">Styled</a>
    </nav>
    <main><router-outlet /></main>
  `,
  styles: [
    `
      nav {
        display: flex;
        gap: 12px;
        padding: 12px 16px;
        border-bottom: 1px solid #ccc;
      }
      main {
        padding: 16px;
      }
      .toolbar {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class App {}
