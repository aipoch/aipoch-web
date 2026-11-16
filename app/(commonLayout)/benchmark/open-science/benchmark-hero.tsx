import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function BenchmarkHero() {
  return (
    <section className="benchmark-hero">
      <div className="hero-backdrop" aria-hidden="true">
        {/* biome-ignore lint/performance/noImgElement: Scale the shared artwork edge to edge, preserving its original proportions. */}
        <img src="/figma/audit/75fa7.png" width={1672} height={941} alt="" />
        <div />
      </div>
      <div className="hero-content">
        <h1>Open-Science Benchmarks</h1>
        <p className="tag">
          Explore AIPOCH Open-Science’s results across scientific benchmarks, with evaluation
          methods, configurations, and supporting evidence.
        </p>
        <div className="byline">
          <b>AIPOCH Research</b>
          <br />
          AIPOCH · Updated November 2026
        </div>
        <details className="notice">
          <summary>
            <strong>How to read these results · 13 November 2026</strong>
            <span>
              {
                ' Every AIPOCH score on this page comes from our own local evaluation runs; none has been submitted to an official leaderboard yet.'
              }
            </span>
            <span className="notice-more">More</span>
          </summary>
          <p>
            {
              'The order of rows in each chart follows the listed scores and is not an official placement. LitQA2, LitQA2-FullText, CORE-Bench-Hard and Terminal-Bench-Science use the same questions as the published records. Our PaperFinding and ScholarQA-CS2 runs use validation splits while most published records use test splits, so those gaps are indicative, and our DiscoveryBench run uses a validation subset and a different judge, so it is not compared. On ASI-Bench and the paper-scale research tasks our primary comparison is other harnesses run locally with the same model on the same tasks.'
            }
          </p>
        </details>
        <div className="hero-cta">
          <Button asChild className="hero-button">
            <Link href="/open-science/download">Download</Link>
          </Button>
          <Button asChild variant="outline" className="hero-button">
            <a
              href="https://github.com/aipoch/open-science"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </Button>
          <Button asChild variant="outline" className="hero-button">
            <a href="#method">Evaluation details</a>
          </Button>
        </div>
      </div>
    </section>
  )
}
