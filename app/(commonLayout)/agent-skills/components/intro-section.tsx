import Link from 'next/link'

const introCards = [
  {
    number: '01',
    title: 'What are Skills?',
    description: 'Reusable biomedical expertise.',
    href: '/guides/what-is-a-skill'
  },
  {
    number: '02',
    title: 'Getting Started',
    description: 'Run skills manually or with agents.',
    href: '/guides/get-started-with-skills'
  },
  {
    number: '03',
    title: 'Create a Skill',
    description: 'Package your research workflow.',
    href: '/guides/build-your-own-skill'
  }
]

export const IntroSection = () => {
  return (
    <section className="bg-[#f6f6f4] py-16">
      <div className="mx-auto max-w-[1264px] px-5 sm:px-8">
        {/* Section numbering stays secondary to the editorial heading. */}
        <div className="flex items-end justify-between gap-8 lg:h-[55px]">
          <h2 className="font-[Georgia,serif] text-[46px] font-normal leading-[1.1] tracking-normal sm:text-[56px]">
            New to Skills?
          </h2>
          <p className="hidden shrink-0 font-mono text-[11px] leading-[1.3] text-[#6B6B66] uppercase sm:block">
            01 / INTRODUCTION
          </p>
        </div>

        {/* Each card preserves the guide route while adopting the reference card treatment. */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-[76px] lg:grid-cols-3 lg:gap-7">
          {introCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group flex min-h-[190px] flex-col justify-between gap-4 border border-[#736761]/20 bg-white/92 p-5 transition-colors hover:border-[#b9b8b1] hover:bg-white"
            >
              <span className="font-mono text-[10px] leading-[1.3] text-[#6B6B66]">
                {card.number}
              </span>
              <h3 className="font-[Georgia,serif] text-[21px] font-normal leading-[1.3]">
                {card.title}
              </h3>
              <p className="text-[13px] leading-[1.3] text-[#6B6B66]">{card.description}</p>
              <span className="font-mono text-[11px] font-bold leading-[1.3] text-[#d08d23] uppercase transition-transform group-hover:translate-x-1">
                READ GUIDE →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
