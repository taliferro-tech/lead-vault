import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { MatchStore } from './match-store.service';
import { LeadVaultViewerService } from '../../services/lead-vault-viewer.service';
import { BrowseModeBannerComponent } from '../../shared/browse-mode-banner/browse-mode-banner.component';

type StepId = 'company' | 'criteria' | 'results';

const STEP_LABELS: Record<StepId, string> = { company: 'Company', criteria: 'Criteria', results: 'Results' };

/** What each step does, for the signed-out browse-mode card. */
const BROWSE_COPY: Record<StepId, string> = {
  company: 'You’re not signed in. Here you name the company you’re matching for and its website, then pick what a good partner looks like, and Lead Vault finds the businesses that fit. You can try it as you are; sign in with 16Ahead to see every match, get the AI’s best pick and export them.',
  criteria: 'You’re not signed in. Here you pick what matters (industry, location, size and more) and Lead Vault counts the businesses that match as you go. You can try it as you are; sign in with 16Ahead to see every match, get the AI’s best pick and export them.',
  results: 'You’re not signed in, so you see the first page of matches. Sign in with 16Ahead to see every match, get the AI’s best pick and export them.',
};

/**
 * Frame for the match flow: the stepper (Company › Criteria › Results on the
 * match path, Criteria › Results on the criteria path), the Form/Guided
 * toggle on the criteria step, and the active step below.
 */
@Component( {
  selector: 'lv-match-shell',
  standalone: true,
  imports: [ RouterOutlet, RouterLink, BrowseModeBannerComponent ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './match.css',
  // Global so the step components share it; every class is prefixed lvm-.
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="lvm">
      <header class="lvm-bar">
        <a class="lvm-back" [routerLink]="backLink()" aria-label="Back">
          <svg class="lv-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
        </a>

        <nav class="lvm-stepper" aria-label="Match steps">
          @for ( step of steps(); track step.id ) {
            @if ( step.state === 'done' ) {
              <a class="lvm-step" data-state="done" [routerLink]="step.link">
                <span class="lvm-step__dot"><svg class="lv-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>
                {{ step.label }}
              </a>
            } @else {
              <span class="lvm-step" [attr.data-state]="step.state" [attr.aria-current]="step.state === 'active' ? 'step' : null">
                <span class="lvm-step__dot">{{ step.number }}</span>
                {{ step.label }}
              </span>
            }
          }
        </nav>
        <p class="lvm-bar__phone"><b>{{ activeLabel() }}</b> <span>{{ activeNumber() }} of {{ steps().length }}</span></p>

        @if ( activeStep() === 'criteria' ) {
          <div class="lvm-toggle" role="radiogroup" aria-label="Criteria layout">
            <button type="button" role="radio" [class.is-on]="store.view() === 'form'" [attr.aria-checked]="store.view() === 'form'" (click)="store.view.set( 'form' )">Form</button>
            <button type="button" role="radio" [class.is-on]="store.view() === 'guided'" [attr.aria-checked]="store.view() === 'guided'" (click)="store.view.set( 'guided' )">Guided</button>
          </div>
        }
      </header>

      @if ( signedOut() ) {
        <div class="lvm-browse" data-cy="match-browse-mode">
          <lv-browse-mode-banner surfaceLabel="Lead Vault Match" [customCopy]="browseCopy()" />
        </div>
      }

      <router-outlet />
    </div>
  `,
} )
export class MatchShellComponent {
  protected readonly store = inject( MatchStore );
  private readonly router = inject( Router );
  private readonly viewer = toSignal( inject( LeadVaultViewerService ).viewer$ );

  /** Only once we know they're signed out, so signed-in people never see it flash. */
  protected readonly signedOut = computed( () => this.viewer()?.status === 'signed-out' );

  constructor () {
    this.store.startLiveCount();
  }

  private readonly url = toSignal( this.router.events.pipe(
    filter( ( event ) => event instanceof NavigationEnd ),
    map( () => this.router.url ),
    startWith( this.router.url ),
  ), { initialValue: this.router.url } );

  protected readonly activeStep = computed<StepId>( () => {
    const path = this.url().split( '?' )[ 0 ];
    if ( path.endsWith( '/company' ) ) return 'company';
    if ( path.endsWith( '/results' ) ) return 'results';
    return 'criteria';
  } );

  private readonly stepIds = computed<StepId[]>( () =>
    this.store.path() === 'match' ? [ 'company', 'criteria', 'results' ] : [ 'criteria', 'results' ] );

  protected readonly steps = computed( () => {
    const ids = this.stepIds();
    const activeIndex = ids.indexOf( this.activeStep() );
    return ids.map( ( id, index ) => ( {
      id,
      label: STEP_LABELS[ id ],
      number: index + 1,
      link: `/match/${ id }`,
      state: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'todo',
    } ) );
  } );

  protected readonly browseCopy = computed( () => BROWSE_COPY[ this.activeStep() ] );

  protected readonly activeLabel = computed( () => STEP_LABELS[ this.activeStep() ] );
  protected readonly activeNumber = computed( () => this.stepIds().indexOf( this.activeStep() ) + 1 );

  protected readonly backLink = computed( () => {
    const ids = this.stepIds();
    const index = ids.indexOf( this.activeStep() );
    return index > 0 ? `/match/${ ids[ index - 1 ] }` : '/';
  } );
}
