import { Routes } from '@angular/router';
import { ApiPage } from './pages/api';
import { BasicPage } from './pages/basic';
import { ContentPage } from './pages/content';
import { DynamicPage } from './pages/dynamic';
import { EdgePage } from './pages/edge';
import { RtlPage } from './pages/rtl';
import { SelectPage } from './pages/select';
import { StyledPage } from './pages/styled';
import { TwoPage } from './pages/two';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'basic' },
  { path: 'basic', component: BasicPage },
  { path: 'api', component: ApiPage },
  { path: 'dynamic', component: DynamicPage },
  { path: 'two', component: TwoPage },
  { path: 'rtl', component: RtlPage },
  { path: 'edge', component: EdgePage },
  { path: 'select', component: SelectPage },
  { path: 'styled', component: StyledPage },
  { path: 'content', component: ContentPage },
];
