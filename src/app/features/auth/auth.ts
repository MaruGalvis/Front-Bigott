import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

type AuthTab = 'login' | 'register';

const PASSWORD_PATTERN = /(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/;

const SLIDE_DURATION_MS = 7000;

interface Slide {
  src: string;
  headline: string;
  caption: string;
  href: string;
}

// Headlines and captions are Spanish translations of BAT's own published
// hero-carousel copy from bat.com — not invented marketing claims.
const SLIDES: Slide[] = [
  {
    src: '/images/carousel/hp-our-purpose.jpg',
    headline: 'A Better Tomorrow™: Nuestro propósito',
    caption: 'Estamos comprometidos con construir un mundo sin humo y crear A Better Tomorrow™',
    href: 'https://www.bat.com/who-we-are',
  },
  {
    src: '/images/carousel/hp-strategy-and-action.jpg',
    headline: 'A Better Tomorrow™ a través de estrategia y acción',
    caption: 'Buscamos desplegar nuestro portafolio multicategoría para incentivar activamente a los fumadores de todo el mundo a migrar hacia productos sin humo – en nicotina y más allá',
    href: 'https://www.bat.com/strategy-and-purpose',
  },
  {
    src: '/images/carousel/hp-science-and-research.jpg',
    headline: 'A Better Tomorrow™ a través de ciencia e investigación',
    caption: 'La ciencia y la investigación están acelerando nuestra misión de reducción del daño del tabaco',
    href: 'https://www.bat.com/science-and-research',
  },
  {
    src: '/images/carousel/hp-brands-and-innovation.jpg',
    headline: 'A Better Tomorrow™ a través de marcas e innovación',
    caption: 'Nuestro portafolio de potentes marcas de productos sin humo impulsará el progreso hacia un mundo sin humo',
    href: 'https://www.bat.com/brands-and-innovation',
  },
  {
    src: '/images/carousel/hp-sustainability.jpg',
    headline: 'A Better Tomorrow™ a través de sostenibilidad',
    caption: 'Migrando activamente a los consumidores de los cigarrillos hacia alternativas sin humo, integrando la sostenibilidad en toda nuestra organización',
    href: 'https://www.bat.com/sustainability-and-esg',
  },
];

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class Auth {
  private readonly fb = new FormBuilder();
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  currentYear = new Date().getFullYear();

  slides = SLIDES;
  activeSlide = signal(0);

  activeTab = signal<AuthTab>('login');
  showLoginPassword = signal(false);
  showRegisterPassword = signal(false);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [false],
  });

  registerForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)]],
  });

  constructor() {
    const timer = setInterval(() => {
      this.activeSlide.update((i) => (i + 1) % this.slides.length);
    }, SLIDE_DURATION_MS);

    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  goToSlide(index: number) {
    this.activeSlide.set(index);
  }

  setTab(tab: AuthTab) {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    this.errorMessage.set(null);
    this.loading.set(true);

    this.authService.login({ email, password }).subscribe({
      next: () => this.router.navigate(['/sales-target']),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'No se pudo iniciar sesión');
      },
    });
  }

  onRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.registerForm.getRawValue();
    this.errorMessage.set(null);
    this.loading.set(true);

    this.authService.register({ name, email, password }).subscribe({
      next: () => this.router.navigate(['/sales-target']),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message ?? 'No se pudo completar el registro');
      },
    });
  }
}
