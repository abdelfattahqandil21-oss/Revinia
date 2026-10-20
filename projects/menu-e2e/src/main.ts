import { APP_ID, Component } from '@angular/core';
import { RiviniaSelectComponent } from '@rivinia/select/ui';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

@Component({
  selector: 'select-root-a',
  imports: [RiviniaSelectComponent],
  template: '<rv-select label="First application label" />',
})
class SelectRootA {}

@Component({
  selector: 'select-root-b',
  imports: [RiviniaSelectComponent],
  template: '<rv-select label="Second application label" />',
})
class SelectRootB {}

if (location.pathname === '/select-multi-root') {
  document.body.innerHTML = '<select-root-a></select-root-a><select-root-b></select-root-b>';
  bootstrapApplication(SelectRootA, {
    providers: [{ provide: APP_ID, useValue: 'select-a' }],
  }).catch((err) => console.error(err));
  bootstrapApplication(SelectRootB, {
    providers: [{ provide: APP_ID, useValue: 'select-b' }],
  }).catch((err) => console.error(err));
} else {
  bootstrapApplication(App, appConfig).catch((err) => console.error(err));
}
