import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarNav, NavItem } from './components/sidebar-nav/sidebar-nav';
import { ToastContainer } from '../ui/toast/toast-container';
import { ConfirmDialog } from '../ui/confirm/confirm-dialog';
import { ConfirmService } from '../ui/confirm/confirm.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, SidebarNav, ToastContainer, ConfirmDialog],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly confirmService = inject(ConfirmService);

  readonly user = this.authService.user;
  readonly currentYear = new Date().getFullYear();

  readonly mobileNavOpen = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Carga de Objetivos', path: '/sales-target', icon: 'pi-upload', exact: false },
    { label: 'Proyección de Objetivos', path: '/objetivos-ia', icon: 'pi-sparkles', exact: false },
    { label: 'Distribución Semanal', path: '/weekly-sales-distribution', icon: 'pi-table', exact: false },
    { label: 'Distribución Mensual', path: '/monthly-sales-distribution', icon: 'pi-calendar', exact: false },
    { label: 'Reporte Mensual', path: '/reporte-mensual', icon: 'pi-file-excel', exact: false },
    { label: 'Catálogo', path: '/catalogo', icon: 'pi-sitemap', exact: false },
  ];

  async logout(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Cerrar sesión',
      message: '¿Seguro que quieres cerrar tu sesión? Vas a tener que iniciar sesión de nuevo para volver a entrar.',
      confirmLabel: 'Cerrar sesión',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    this.authService.logout();
    this.router.navigate(['/auth']);
  }
}
