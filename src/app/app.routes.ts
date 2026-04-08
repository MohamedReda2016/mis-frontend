import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'select-employer',
    loadComponent: () =>
      import('./employer/select-employer/select-employer').then(m => m.SelectEmployerComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent),
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./employer/employer-overview/employer-overview').then(m => m.EmployerOverviewComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./employer/employer-profile/employer-profile').then(m => m.EmployerProfileComponent),
      },
      {
        path: 'insureds',
        loadComponent: () =>
          import('./insured/manage-insureds/manage-insureds').then(m => m.ManageInsuredsComponent),
      },
      {
        path: 'insureds/register',
        loadComponent: () =>
          import('./insured/register-insured/register-insured').then(m => m.RegisterInsuredComponent),
      },
      {
        path: 'insureds/:insuredId/update-salary',
        loadComponent: () =>
          import('./insured/update-salary/update-salary').then(m => m.UpdateSalaryComponent),
      },
      {
        path: 'insureds/:insuredId',
        loadComponent: () =>
          import('./insured/insured-profile/insured-profile').then(m => m.InsuredProfileComponent),
      },
      {
        path: 'activity',
        loadComponent: () =>
          import('./activity/activity').then(m => m.ActivityComponent),
      },
      {
        path: 'activity/:instanceId',
        loadComponent: () =>
          import('./activity/case-detail/case-detail').then(m => m.CaseDetailComponent),
      },
    ],
  },
];
