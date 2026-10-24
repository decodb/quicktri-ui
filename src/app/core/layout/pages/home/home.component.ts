import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

type Tone = 'mint' | 'pink' | 'yellow';

interface NavLink { id: string; label: string; }
interface Step { number: string; title: string; text: string; tone: Tone; }
interface Feature { icon: string; title: string; text: string; tone: Tone; }
interface Player { rank: number; name: string; score: number; }

// Hero demo: one "question" loops every ROUND_MS, and the player locks in an
// answer at ANSWER_AT of the way through, to show faster answer = more points.
const ROUND_MS = 10_000;
const TICK_MS = 100;
const BASE_POINTS = 100;
const ANSWER_AT = 0.3;

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  year = new Date().getFullYear();

  // ---- Navigation -------------------------------------------------------
  menuOpen = signal(false);
  scrolled = signal(false);

  navLinks: NavLink[] = [
    { id: 'how', label: 'How it works' },
    { id: 'features', label: 'Features' },
    { id: 'podium', label: 'Leaderboard' },
  ];

  // ---- Content ----------------------------------------------------------
  heroFacts = [
    'Email reminder 15 minutes before kickoff',
    'Join late and still start at question 1',
    'The top 3 of every quiz are saved for good',
  ];

  steps: Step[] = [
    {
      number: '1',
      title: 'Get the invite',
      text: 'Admins schedule a quiz with a start and end time. Every registered player gets an email, plus a reminder 15 minutes before it begins.',
      tone: 'mint',
    },
    {
      number: '2',
      title: 'Jump in',
      text: 'Open the quiz any time before it closes. Running late? You still start from question 1, but the finish line is the same for everyone.',
      tone: 'pink',
    },
    {
      number: '3',
      title: 'Race the clock',
      text: 'Correct answers earn more of the base points the faster you give them. Climb the live leaderboard until time is up.',
      tone: 'yellow',
    },
  ];

  features: Feature[] = [
    {
      icon: 'flash-outline',
      title: 'Speed-based scoring',
      text: 'Every question has base points. The quicker you answer correctly, the more of them you keep.',
      tone: 'mint',
    },
    {
      icon: 'stats-chart-outline',
      title: 'Live leaderboard',
      text: 'Watch the ranks shift in real time as other players lock in their answers.',
      tone: 'pink',
    },
    {
      icon: 'notifications-outline',
      title: 'Never miss a start',
      text: 'Email alerts when a quiz is scheduled, and again 15 minutes before it begins.',
      tone: 'yellow',
    },
    {
      icon: 'enter-outline',
      title: 'Join late, start fresh',
      text: 'Arrive after kickoff and you still begin at question 1. Only the end time is fixed.',
      tone: 'mint',
    },
    {
      icon: 'trophy-outline',
      title: 'Top 3 hall of fame',
      text: 'The three best scores of every quiz are saved permanently.',
      tone: 'pink',
    },
    {
      icon: 'library-outline',
      title: 'Categories and difficulty',
      text: 'Multiple choice and true or false questions, picked by the admin by category and difficulty.',
      tone: 'yellow',
    },
  ];

  scoringPoints = [
    'Each question carries a base point value',
    'Faster correct answers keep more of those points',
    'The three highest scores of every quiz are stored for good',
  ];

  // Names and scores are illustrative only
  leaderboard: Player[] = [
    { rank: 1, name: 'Boitumelo', score: 940 },
    { rank: 2, name: 'Deco', score: 870 },
    { rank: 3, name: 'Neo', score: 810 },
  ];

  // podium display order: 2nd, 1st, 3rd
  podium: Player[] = [this.leaderboard[1], this.leaderboard[0], this.leaderboard[2]];

  // ---- Hero demo state --------------------------------------------------
  demoOptions = ['Venus', 'Mars', 'Jupiter', 'Mercury'];
  correctOption = 'Mars';

  progress = signal(0); // 0 -> 1 over one round
  answered = computed(() => this.progress() >= ANSWER_AT);
  barWidth = computed(() => (1 - this.progress()) * 100);
  secondsLeft = computed(() => Math.max(1, Math.ceil((1 - this.progress()) * (ROUND_MS / 1000))));
  points = computed(() => {
    // once answered, the score freezes at the moment the player locked in
    const at = this.answered() ? ANSWER_AT : this.progress();
    return Math.round(BASE_POINTS * (1 - at));
  });

  private timerId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (typeof window === 'undefined') return; // server-side rendering

    if (this.prefersReducedMotion()) {
      this.progress.set(0.5); // static, already answered
      return;
    }

    this.timerId = setInterval(() => {
      const next = this.progress() + TICK_MS / ROUND_MS;
      this.progress.set(next >= 1 ? 0 : next);
    }, TICK_MS);
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  // ---- Navigation behaviour --------------------------------------------
  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  goTo(event: Event, id: string): void {
    event.preventDefault();
    this.closeMenu();

    document.getElementById(id)?.scrollIntoView({
      behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}