import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { LanguageService } from './language.service';

@Component({
  selector: 'app-lang-switcher',
  imports: [MatButtonModule],
  template: `
    <div class="lang-switcher" role="group" aria-label="Language">
      <button
        mat-button
        class="lang-btn"
        [class.active]="langService.currentLang() === 'en'"
        (click)="langService.switch('en')"
      >EN</button>
      <span class="lang-divider" aria-hidden="true">|</span>
      <button
        mat-button
        class="lang-btn"
        [class.active]="langService.currentLang() === 'ar'"
        (click)="langService.switch('ar')"
      >AR</button>
    </div>
  `,
  styles: [`
    .lang-switcher {
      display: flex;
      align-items: center;
      border: 1px solid rgba(26, 60, 110, 0.2);
      border-radius: 20px;
      overflow: hidden;
      padding: 0 4px;
      background: rgba(26, 60, 110, 0.05);
    }
    .lang-btn {
      font-size: 12px;
      font-weight: 600;
      min-width: unset;
      padding: 0 8px;
      height: 28px;
      color: #1A3C6E;
      line-height: 28px;
    }
    .lang-btn.active {
      color: #8B6914;
      font-weight: 700;
    }
    .lang-divider {
      color: rgba(26, 60, 110, 0.3);
      font-size: 12px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangSwitcherComponent {
  protected langService = inject(LanguageService);
}
