const processSteps = [
  {
    number: '01',
    title: 'DISCOVER',
    description: 'Explore skills for your research task.'
  },
  {
    number: '02',
    title: 'CONNECT',
    description: 'Access structured skill files.'
  },
  {
    number: '03',
    title: 'OPERATE',
    description: 'Turn questions into scientific results.'
  }
]

export const ProcessSection = () => {
  return (
    <section className="bg-[#f6f6f4] py-16">
      <div className="mx-auto max-w-[1264px] px-5 sm:px-8">
        {/* The process label aligns with the right edge on larger screens. */}
        <div className="flex items-end justify-between gap-8 lg:h-[86px]">
          <div>
            <h2 className="font-[Georgia,serif] text-[42px] font-normal leading-[1.3] tracking-normal sm:text-[48px]">
              Accelerate Discovery
            </h2>
            <p className="mt-2 text-[16px] leading-[1.3] text-[#6B6B66]">
              From questions to evidence, executed by humans or AI agents.
            </p>
          </div>
          <p className="hidden shrink-0 font-mono text-[11px] leading-[1.3] text-[#6B6B66] uppercase sm:block">
            04 / PROCESS
          </p>
        </div>

        {/* Circles and the shared rule describe one continuous three-step path. */}
        <div className="relative mt-[60px] lg:h-[220px]">
          <div
            aria-hidden="true"
            className="absolute top-[31px] right-[16.666%] left-[16.666%] hidden border-t border-[#6B6B66] lg:block"
          />
          <div className="grid gap-12 lg:grid-cols-3 lg:gap-0">
            {processSteps.map((step, index) => (
              <div key={step.number} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 flex size-[62px] items-center justify-center rounded-full border border-[#6B6B66] bg-[#f6f6f4]">
                  <span className="font-mono text-[11px] leading-[1.3] text-[#6B6B66]">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-[14px] text-[14px] font-semibold leading-[1.3] text-[#111]">
                  {step.title}
                </h3>
                <p className="mt-[14px] max-w-[310px] text-[13px] leading-[1.3] text-[#6B6B66]">
                  {step.description}
                </p>
                {index < processSteps.length - 1 ? (
                  <div
                    aria-hidden="true"
                    className="mt-6 h-8 border-l border-[#6B6B66] lg:hidden"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
