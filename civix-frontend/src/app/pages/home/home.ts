import { Component } from '@angular/core';
import { HeroSection } from '../../components/hero-section/hero-section';
import { HowItWorks } from '../../components/how-it-works/how-it-works';
import { ProblemShowcase } from '../../components/problem-showcase/problem-showcase';
import { IssuePreview } from '../../components/issue-preview/issue-preview';
import { WhySection } from '../../components/why-section/why-section';
import { CtaSection } from '../../components/cta-section/cta-section';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-home',
  imports: [
    HeroSection,
    HowItWorks,
    ProblemShowcase,
    IssuePreview,
    WhySection,
    CtaSection,
    Footer
  ],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {}
