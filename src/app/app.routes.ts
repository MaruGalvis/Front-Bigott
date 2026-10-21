import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth',
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth').then((m) => m.Auth),
  },
  {
    path: '',
    loadComponent: () => import('./shared/layout/app-layout').then((m) => m.AppLayout),
    canActivate: [authGuard],
    children: [
      {
        path: 'sales-target',
        loadComponent: () => import('./features/sales-target/sales-target').then((m) => m.SalesTarget),
      },
      {
        path: 'objetivos-ia',
        loadComponent: () => import('./features/ml-forecast/ml-forecast').then((m) => m.MlForecast),
      },
      {
        path: 'weekly-sales-distribution',
        loadComponent: () =>
          import('./features/weekly-sales-distribution/weekly-sales-distribution').then(
            (m) => m.WeeklySalesDistribution,
          ),
      },
      {
        path: 'monthly-sales-distribution',
        loadComponent: () =>
          import('./features/monthly-sales-distribution/monthly-sales-distribution').then(
            (m) => m.MonthlySalesDistribution,
          ),
      },
      {
        path: 'reporte-mensual',
        loadComponent: () =>
          import('./features/monthly-distribution-report/monthly-distribution-report').then(
            (m) => m.MonthlyDistributionReport,
          ),
      },
      {
        path: 'catalogo',
        loadComponent: () => import('./features/catalog/catalog').then((m) => m.Catalog),
      },
      { path: '', redirectTo: 'sales-target', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'auth' },
];
