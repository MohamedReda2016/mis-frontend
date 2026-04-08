import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);

  readonly currentLang = signal<string>(localStorage.getItem('lang') ?? 'en');

  init(): void {
    this.applyLang(this.currentLang());
  }

  switch(lang: string): void {
    this.currentLang.set(lang);
    localStorage.setItem('lang', lang);
    this.applyLang(lang);
  }

  private applyLang(lang: string): void {
    this.translate.use(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
}
