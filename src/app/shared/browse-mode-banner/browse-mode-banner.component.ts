import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LeadVaultAuthService } from '../../services/lead-vault-auth.service';

/**
 * The signed-out "you are in browse mode" card, lifted from Outreach's
 * cockpit-browse-mode-banner (Network's model): what the page is and a way
 * to sign in. Show it only to signed-out visitors.
 */
@Component( {
  selector: 'lv-browse-mode-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './browse-mode-banner.component.html',
  styleUrl: './browse-mode-banner.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
} )
export class BrowseModeBannerComponent {
  @Input() surfaceLabel = 'this page';
  @Input() statusLabel = 'Browse Mode';
  @Input() signInLabel = 'Sign in';
  @Input() customTitle: string | null = null;
  @Input() customCopy: string | null = null;

  private readonly router = inject( Router );
  private readonly authService = inject( LeadVaultAuthService );

  /** The same hosted 16Ahead sign-in as the header, back to this page after. */
  signIn (): void {
    this.authService.signIn( this.router.url );
  }
}
